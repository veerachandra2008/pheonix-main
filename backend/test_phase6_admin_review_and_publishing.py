import unittest
import json
import time
import uuid
from app import app
from routes.payments import IN_MEMORY_REGISTRATIONS
from routes.attendance import IN_MEMORY_EVENT_ATTENDANCE
from routes.tournaments import IN_MEMORY_TOURNAMENTS
from routes.leaderboard import (
    IN_MEMORY_SCORING_RULES,
    IN_MEMORY_PLACEMENT_RULES,
    IN_MEMORY_MATCHES,
    IN_MEMORY_MATCH_RESULTS,
    IN_MEMORY_TOURNAMENT_STATUS,
    IN_MEMORY_SUBMISSIONS,
    IN_MEMORY_AUDIT_LOGS
)

class Phase6AdminReviewAndPublishingTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

        # Clean all in-memory stores for isolated testing
        IN_MEMORY_SCORING_RULES.clear()
        IN_MEMORY_PLACEMENT_RULES.clear()
        IN_MEMORY_MATCHES.clear()
        IN_MEMORY_MATCH_RESULTS.clear()
        IN_MEMORY_TOURNAMENT_STATUS.clear()
        IN_MEMORY_SUBMISSIONS.clear()
        IN_MEMORY_AUDIT_LOGS.clear()

        # Organizer & Admin identities
        self.org_email = 'organizer_p6@college.edu'
        self.org_id = 'org-p6-001'
        self.admin_email = 'admin@xenova.gg'
        self.attacker_email = 'attacker@other.edu'

        self.org_headers = {
            'X-Test-User': self.org_email,
            'X-Test-User-Id': self.org_id,
            'X-Test-User-Role': 'ORGANIZER'
        }
        self.admin_headers = {
            'X-Test-User': self.admin_email,
            'X-Test-User-Id': 'admin-001',
            'X-Test-User-Role': 'ADMIN'
        }
        self.player_headers = {
            'X-Test-User': 'player@test.edu',
            'X-Test-User-Id': 'player-uuid',
            'X-Test-User-Role': 'PLAYER'
        }
        self.attacker_headers = {
            'X-Test-User': self.attacker_email,
            'X-Test-User-Id': 'attacker-uuid',
            'X-Test-User-Role': 'ORGANIZER'
        }

        # Setup Tournament A
        self.slug_a = f"p6-tourn-a-{int(time.time())}"
        IN_MEMORY_TOURNAMENTS.append({
            'slug': self.slug_a,
            'title': 'Xenova Pro Invitational 2026',
            'game': 'Free Fire',
            'format': 'Battle Royale',
            'organizer_email': self.org_email,
            'organizer_id': self.org_id
        })

        # Setup Tournament B (Data Isolation)
        self.slug_b = f"p6-tourn-b-{int(time.time())}"
        IN_MEMORY_TOURNAMENTS.append({
            'slug': self.slug_b,
            'title': 'Xenova College Cup 2026',
            'game': 'Free Fire',
            'format': 'Battle Royale',
            'organizer_email': self.attacker_email,
            'organizer_id': 'attacker-uuid'
        })

        # Register Teams for Tournament A
        self.team1_id = 'p6-team-1'
        self.team2_id = 'p6-team-2'
        IN_MEMORY_REGISTRATIONS['reg-p6-1'] = {
            'team_id': self.team1_id,
            'team_name': 'Phoenix Force',
            'tournament_slug': self.slug_a,
            'captain_name': 'Aryan Sharma',
            'captain_in_game_name': '亗PHOENIX亗',
            'college': 'IIT Bombay',
            'status': 'confirmed'
        }
        IN_MEMORY_REGISTRATIONS['reg-p6-2'] = {
            'team_id': self.team2_id,
            'team_name': 'Titan Esports',
            'tournament_slug': self.slug_a,
            'captain_name': 'Vikram Seth',
            'captain_in_game_name': '⚡TITAN⚡',
            'college': 'BITS Pilani',
            'status': 'confirmed'
        }

        # Register Attendance (Both Present)
        IN_MEMORY_EVENT_ATTENDANCE[(self.slug_a, self.team1_id)] = {'status': 'PRESENT', 'team_id': self.team1_id}
        IN_MEMORY_EVENT_ATTENDANCE[(self.slug_a, self.team2_id)] = {'status': 'PRESENT', 'team_id': self.team2_id}

        # Setup Scoring Rules for Tournament A
        rule1_id = str(uuid.uuid4())
        IN_MEMORY_SCORING_RULES[self.slug_a] = [
            {'id': rule1_id, 'tournament_slug': self.slug_a, 'name': 'Kills', 'type': 'PER_UNIT', 'points_per_unit': 1, 'sort_order': 0}
        ]

        # Setup Match 1 for Tournament A
        self.m1_id = str(uuid.uuid4())
        IN_MEMORY_MATCHES[self.slug_a] = [
            {'id': self.m1_id, 'tournament_slug': self.slug_a, 'match_number': 1, 'title': 'Match 1'}
        ]
        IN_MEMORY_MATCH_RESULTS[self.m1_id] = {
            self.team1_id: {'team_id': self.team1_id, 'raw_scores': {rule1_id: 10}},
            self.team2_id: {'team_id': self.team2_id, 'raw_scores': {rule1_id: 5}}
        }

    def tearDown(self):
        self.app_context.pop()

    def test_01_admin_list_submissions_security(self):
        """Verify only Admin can access Admin submissions list endpoint."""
        # 1. Finalize and submit Tournament A as organizer
        fin_res = self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        self.assertEqual(fin_res.status_code, 200)

        sub_res = self.client.post(
            f"/api/leaderboard/{self.slug_a}/submit",
            headers=self.org_headers,
            data=json.dumps({'notes': 'Ready for review'}),
            content_type='application/json'
        )
        self.assertEqual(sub_res.status_code, 200)
        sub_id = sub_res.json['submission_id']

        # 2. Player cannot access admin submissions
        player_res = self.client.get('/api/admin/tournament-submissions', headers=self.player_headers)
        self.assertEqual(player_res.status_code, 403)

        # 3. Organizer cannot access admin submissions
        org_res = self.client.get('/api/admin/tournament-submissions', headers=self.org_headers)
        self.assertEqual(org_res.status_code, 403)

        # 4. Unauthenticated cannot access admin submissions
        unauth_res = self.client.get('/api/admin/tournament-submissions')
        self.assertEqual(unauth_res.status_code, 401)

        # 5. Admin can access and see Tournament A
        admin_res = self.client.get('/api/admin/tournament-submissions', headers=self.admin_headers)
        self.assertEqual(admin_res.status_code, 200)
        self.assertTrue(admin_res.json['success'])
        subs = admin_res.json['submissions']
        self.assertGreaterEqual(len(subs), 1)

        found = next((s for s in subs if s['tournament_id'] == self.slug_a), None)
        self.assertIsNotNone(found)
        self.assertEqual(found['tournament_name'], 'Xenova Pro Invitational 2026')
        self.assertEqual(found['game'], 'Free Fire')
        self.assertEqual(found['organizer'], self.org_email)
        self.assertEqual(found['num_teams'], 2)
        self.assertEqual(found['num_matches'], 1)
        self.assertEqual(found['status'], 'SUBMITTED')

    def test_02_admin_submission_detail_inspection(self):
        """Admin can inspect frozen snapshot details without editing permissions."""
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        sub_res = self.client.post(f"/api/leaderboard/{self.slug_a}/submit", headers=self.org_headers)
        sub_id = sub_res.json['submission_id']

        detail_res = self.client.get(f"/api/admin/tournament-submissions/{sub_id}", headers=self.admin_headers)
        self.assertEqual(detail_res.status_code, 200)
        data = detail_res.json
        self.assertTrue(data['success'])

        snapshot = data['frozen_snapshot']
        standings = snapshot['standings']
        self.assertEqual(len(standings), 2)
        # Phoenix Force: Rank 1, 10 pts
        self.assertEqual(standings[0]['team_name'], 'Phoenix Force')
        self.assertEqual(standings[0]['captain_in_game_name'], '亗PHOENIX亗')
        self.assertEqual(standings[0]['overall_total'], 10)

        # Titan Esports: Rank 2, 5 pts
        self.assertEqual(standings[1]['team_name'], 'Titan Esports')
        self.assertEqual(standings[1]['captain_in_game_name'], '⚡TITAN⚡')
        self.assertEqual(standings[1]['overall_total'], 5)

    def test_03_request_changes_flow(self):
        """Admin requests changes with mandatory reason; status becomes CHANGES_REQUESTED."""
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        sub_res = self.client.post(f"/api/leaderboard/{self.slug_a}/submit", headers=self.org_headers)
        sub_id = sub_res.json['submission_id']

        # 1. Non-admin cannot request changes
        org_req = self.client.post(
            f"/api/admin/tournament-submissions/{sub_id}/request-changes",
            headers=self.org_headers,
            data=json.dumps({'reason': 'Try change'}),
            content_type='application/json'
        )
        self.assertEqual(org_req.status_code, 403)

        # 2. Admin without reason -> 400
        no_reason = self.client.post(
            f"/api/admin/tournament-submissions/{sub_id}/request-changes",
            headers=self.admin_headers,
            data=json.dumps({'reason': '   '}),
            content_type='application/json'
        )
        self.assertEqual(no_reason.status_code, 400)

        # 3. Admin with valid reason -> 200
        req_res = self.client.post(
            f"/api/admin/tournament-submissions/{sub_id}/request-changes",
            headers=self.admin_headers,
            data=json.dumps({'reason': 'Match 1 score for Phoenix needs verification.'}),
            content_type='application/json'
        )
        self.assertEqual(req_res.status_code, 200)
        self.assertEqual(req_res.json['status'], 'CHANGES_REQUESTED')

        # 4. Check tournament status
        status_res = self.client.get(f"/api/leaderboard/{self.slug_a}/status", headers=self.org_headers)
        self.assertEqual(status_res.json['status'], 'CHANGES_REQUESTED')
        self.assertFalse(status_res.json['is_locked'])
        self.assertEqual(status_res.json['change_request_reason'], 'Match 1 score for Phoenix needs verification.')

        # 5. Check audit trail
        audit_res = self.client.get(f"/api/leaderboard/{self.slug_a}/audit", headers=self.org_headers)
        self.assertEqual(audit_res.status_code, 200)
        trail = audit_res.json['audit_trail']
        actions = [a['action'] for a in trail]
        self.assertIn('CHANGES_REQUESTED', actions)

    def test_04_changes_requested_enables_editing_and_resubmission(self):
        """Organizer can edit scores when CHANGES_REQUESTED, re-finalize, and resubmit."""
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        sub_res = self.client.post(f"/api/leaderboard/{self.slug_a}/submit", headers=self.org_headers)
        sub_id = sub_res.json['submission_id']

        # Admin requests changes
        self.client.post(
            f"/api/admin/tournament-submissions/{sub_id}/request-changes",
            headers=self.admin_headers,
            data=json.dumps({'reason': 'Correct Titan kills'}),
            content_type='application/json'
        )

        rule_id = IN_MEMORY_SCORING_RULES[self.slug_a][0]['id']

        # Organizer edits scores: Titan kills 5 -> 15 (takes 1st place!)
        edit_res = self.client.post(
            f"/api/leaderboard/{self.slug_a}/matches/{self.m1_id}/results",
            headers=self.org_headers,
            data=json.dumps({
                'results': [
                    {'team_id': self.team1_id, 'raw_scores': {rule_id: 10}},
                    {'team_id': self.team2_id, 'raw_scores': {rule_id: 15}}
                ]
            }),
            content_type='application/json'
        )
        self.assertEqual(edit_res.status_code, 200)

        # Verify standings recalculated: Titan is now #1 with 15 pts
        standings_res = self.client.get(f"/api/leaderboard/{self.slug_a}/standings")
        self.assertEqual(standings_res.json['standings'][0]['team_name'], 'Titan Esports')
        self.assertEqual(standings_res.json['standings'][0]['overall_total'], 15)

        # Organizer finalizes again
        fin_again = self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        self.assertEqual(fin_again.status_code, 200)
        self.assertEqual(fin_again.json['status'], 'FINALIZED')

        # Organizer resubmits to Admin
        resub_res = self.client.post(
            f"/api/leaderboard/{self.slug_a}/submit",
            headers=self.org_headers,
            data=json.dumps({'notes': 'Corrected Titan kills to 15'}),
            content_type='application/json'
        )
        self.assertEqual(resub_res.status_code, 200)
        self.assertEqual(resub_res.json['status'], 'SUBMITTED')

        # Verify audit trail has RESUBMITTED
        audit_res = self.client.get(f"/api/leaderboard/{self.slug_a}/audit", headers=self.org_headers)
        actions = [a['action'] for a in audit_res.json['audit_trail']]
        self.assertIn('RESUBMITTED', actions)

    def test_05_admin_approval_and_publishing_safety(self):
        """Test strict transition lifecycle: SUBMITTED -> APPROVED -> PUBLISHED."""
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        sub_res = self.client.post(f"/api/leaderboard/{self.slug_a}/submit", headers=self.org_headers)
        sub_id = sub_res.json['submission_id']

        # 1. Publishing directly from SUBMITTED must be rejected with 400
        premature_pub = self.client.post(f"/api/admin/tournament-submissions/{sub_id}/publish", headers=self.admin_headers)
        self.assertEqual(premature_pub.status_code, 400)
        self.assertIn('APPROVED', premature_pub.json['message'])

        # 2. Organizer cannot approve
        org_app = self.client.post(f"/api/admin/tournament-submissions/{sub_id}/approve", headers=self.org_headers)
        self.assertEqual(org_app.status_code, 403)

        # 3. Admin approves results
        app_res = self.client.post(f"/api/admin/tournament-submissions/{sub_id}/approve", headers=self.admin_headers)
        self.assertEqual(app_res.status_code, 200)
        self.assertEqual(app_res.json['status'], 'APPROVED')

        # 4. APPROVED results must NOT yet be published publicly
        pub_list_1 = self.client.get('/api/leaderboard/published')
        self.assertEqual(pub_list_1.status_code, 200)
        tourns_1 = [t['tournament_slug'] for t in pub_list_1.json['published_tournaments']]
        self.assertNotIn(self.slug_a, tourns_1)

        # 5. Organizer cannot publish
        org_pub = self.client.post(f"/api/admin/tournament-submissions/{sub_id}/publish", headers=self.org_headers)
        self.assertEqual(org_pub.status_code, 403)

        # 6. Admin publishes approved submission
        pub_res = self.client.post(f"/api/admin/tournament-submissions/{sub_id}/publish", headers=self.admin_headers)
        self.assertEqual(pub_res.status_code, 200)
        self.assertEqual(pub_res.json['status'], 'PUBLISHED')

        # 7. PUBLISHED results now appear publicly!
        pub_list_2 = self.client.get('/api/leaderboard/published')
        self.assertEqual(pub_list_2.status_code, 200)
        tourns_2 = [t['tournament_slug'] for t in pub_list_2.json['published_tournaments']]
        self.assertIn(self.slug_a, tourns_2)

        # 8. Check public tournament endpoint
        pub_detail = self.client.get(f"/api/leaderboard/{self.slug_a}/published")
        self.assertEqual(pub_detail.status_code, 200)
        self.assertEqual(pub_detail.json['title'], 'Xenova Pro Invitational 2026')
        standings = pub_detail.json['standings']
        self.assertEqual(standings[0]['team_name'], 'Phoenix Force')
        self.assertEqual(standings[0]['captain_in_game_name'], '亗PHOENIX亗')

        # Ensure no private admin review info is leaked publicly
        self.assertNotIn('change_request_reason', pub_detail.json)
        self.assertNotIn('audit_history', pub_detail.json)

    def test_06_tournament_isolation(self):
        """Publishing Tournament A does NOT publish Tournament B."""
        # Tournament A is finalized, submitted, approved, published
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        sub_a = self.client.post(f"/api/leaderboard/{self.slug_a}/submit", headers=self.org_headers).json['submission_id']
        self.client.post(f"/api/admin/tournament-submissions/{sub_a}/approve", headers=self.admin_headers)
        self.client.post(f"/api/admin/tournament-submissions/{sub_a}/publish", headers=self.admin_headers)

        # Tournament B is only submitted by Tournament B organizer
        # Setup team and match for Tournament B
        rule_b_id = str(uuid.uuid4())
        IN_MEMORY_SCORING_RULES[self.slug_b] = [{'id': rule_b_id, 'tournament_slug': self.slug_b, 'name': 'Kills', 'type': 'PER_UNIT', 'points_per_unit': 2}]
        m_b_id = str(uuid.uuid4())
        IN_MEMORY_MATCHES[self.slug_b] = [{'id': m_b_id, 'tournament_slug': self.slug_b, 'match_number': 1, 'title': 'Match 1'}]
        IN_MEMORY_REGISTRATIONS['reg-b-1'] = {
            'team_id': 'team-b-1',
            'team_name': 'Shadow Squad',
            'tournament_slug': self.slug_b,
            'captain_name': 'Rahul B',
            'captain_in_game_name': '亗SHADOW亗',
            'status': 'confirmed'
        }
        IN_MEMORY_EVENT_ATTENDANCE[(self.slug_b, 'team-b-1')] = {'status': 'PRESENT', 'team_id': 'team-b-1'}
        IN_MEMORY_MATCH_RESULTS[m_b_id] = {'team-b-1': {'team_id': 'team-b-1', 'raw_scores': {rule_b_id: 8}}}

        self.client.post(f"/api/leaderboard/{self.slug_b}/finalize", headers=self.attacker_headers)
        self.client.post(f"/api/leaderboard/{self.slug_b}/submit", headers=self.attacker_headers)

        # Check public published list: Contains Tournament A, does NOT contain Tournament B
        pub_res = self.client.get('/api/leaderboard/published')
        published_slugs = [t['tournament_slug'] for t in pub_res.json['published_tournaments']]
        self.assertIn(self.slug_a, published_slugs)
        self.assertNotIn(self.slug_b, published_slugs)

        # Calling published endpoint on Tournament B returns 404
        pub_b = self.client.get(f"/api/leaderboard/{self.slug_b}/published")
        self.assertEqual(pub_b.status_code, 404)

    def test_07_editing_blocked_after_approval_and_publishing(self):
        """Organizer cannot edit scores or scoring rules once APPROVED or PUBLISHED."""
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        sub_a = self.client.post(f"/api/leaderboard/{self.slug_a}/submit", headers=self.org_headers).json['submission_id']
        self.client.post(f"/api/admin/tournament-submissions/{sub_a}/approve", headers=self.admin_headers)

        rule_id = IN_MEMORY_SCORING_RULES[self.slug_a][0]['id']

        # Attempt to edit score while APPROVED -> rejected
        edit_score = self.client.post(
            f"/api/leaderboard/{self.slug_a}/matches/{self.m1_id}/results",
            headers=self.org_headers,
            data=json.dumps({'results': [{'team_id': self.team1_id, 'raw_scores': {rule_id: 99}}]}),
            content_type='application/json'
        )
        self.assertEqual(edit_score.status_code, 400)
        self.assertIn('locked', edit_score.json['message'].lower())

        # Now Admin publishes
        self.client.post(f"/api/admin/tournament-submissions/{sub_a}/publish", headers=self.admin_headers)

        # Attempt to edit score while PUBLISHED -> rejected
        edit_score_pub = self.client.post(
            f"/api/leaderboard/{self.slug_a}/matches/{self.m1_id}/results",
            headers=self.org_headers,
            data=json.dumps({'results': [{'team_id': self.team1_id, 'raw_scores': {rule_id: 99}}]}),
            content_type='application/json'
        )
        self.assertEqual(edit_score_pub.status_code, 400)
        self.assertIn('locked', edit_score_pub.json['message'].lower())


if __name__ == '__main__':
    unittest.main()
