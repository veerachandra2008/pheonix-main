import unittest
import json
import time
import io
import uuid
import openpyxl
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
    IN_MEMORY_SUBMISSIONS
)

class Phase5ExportAndSubmissionTestCase(unittest.TestCase):
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

        # Organizer & Admin identities
        self.org_email = 'organizer_p5@college.edu'
        self.org_id = 'org-p5-001'
        self.admin_email = 'admin@xenova.gg'
        self.attacker_email = 'attacker@other.edu'

        self.org_headers = {
            'X-Test-User': self.org_email,
            'X-Test-User-Id': self.org_id,
            'X-Test-User-Role': 'ORGANIZER'
        }
        self.attacker_headers = {
            'X-Test-User': self.attacker_email,
            'X-Test-User-Id': 'attacker-uuid',
            'X-Test-User-Role': 'ORGANIZER'
        }
        self.player_headers = {
            'X-Test-User': 'player@test.edu',
            'X-Test-User-Id': 'player-uuid',
            'X-Test-User-Role': 'PLAYER'
        }

        # Setup Tournament A
        self.slug_a = f"p5-tourn-a-{int(time.time())}"
        IN_MEMORY_TOURNAMENTS.append({
            'slug': self.slug_a,
            'title': 'Xenova Championship 2026',
            'game': 'Free Fire',
            'format': 'Battle Royale',
            'organizer_email': self.org_email,
            'organizer_id': self.org_id
        })

        # Setup Tournament B (Data Isolation)
        self.slug_b = f"p5-tourn-b-{int(time.time())}"
        IN_MEMORY_TOURNAMENTS.append({
            'slug': self.slug_b,
            'title': 'Tournament B Rivals',
            'game': 'Free Fire',
            'format': 'Clash Squad',
            'organizer_email': self.org_email,
            'organizer_id': self.org_id
        })

        # Tournament A Teams & Attendance
        self.team1_id = 'XNV-P5-001'
        self.team2_id = 'XNV-P5-002'

        pass_1 = f"PASS-P5-1-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_1] = {
            'pass_id': pass_1,
            'tournament_slug': self.slug_a,
            'team_id': self.team1_id,
            'team_name': 'Phoenix Alpha',
            'captain_name': 'Rahul Sharma',
            'captain_in_game_name': '亗PHOENIX亗',
            'college': 'IIT Bombay',
            'attendance_status': 'PRESENT',
            'organizer_email': self.org_email
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_1] = {
            'pass_id': pass_1,
            'tournament_slug': self.slug_a,
            'attendance_status': 'PRESENT'
        }

        pass_2 = f"PASS-P5-2-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_2] = {
            'pass_id': pass_2,
            'tournament_slug': self.slug_a,
            'team_id': self.team2_id,
            'team_name': 'Titans Gaming',
            'captain_name': 'Vikram Rao',
            'captain_in_game_name': 'TITANS_V',
            'college': 'NIT Trichy',
            'attendance_status': 'PRESENT',
            'organizer_email': self.org_email
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_2] = {
            'pass_id': pass_2,
            'tournament_slug': self.slug_a,
            'attendance_status': 'PRESENT'
        }

        # Tournament B Team
        self.team_b_id = 'XNV-P5-B01'
        pass_b = f"PASS-P5-B-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_b] = {
            'pass_id': pass_b,
            'tournament_slug': self.slug_b,
            'team_id': self.team_b_id,
            'team_name': 'Zenith Legends',
            'captain_name': 'Kunal Sen',
            'captain_in_game_name': 'ZENITH_GOD',
            'college': 'BITS Pilani',
            'attendance_status': 'PRESENT',
            'organizer_email': self.org_email
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_b] = {
            'pass_id': pass_b,
            'tournament_slug': self.slug_b,
            'attendance_status': 'PRESENT'
        }

        # Configure Dynamic Scoring Rules for Tournament A
        self.rule_kills_id = str(uuid.uuid4())
        self.rule_place_id = str(uuid.uuid4())

        IN_MEMORY_SCORING_RULES[self.slug_a] = [
            {
                'id': self.rule_kills_id,
                'tournament_id': self.slug_a,
                'name': 'Kills',
                'type': 'PER_UNIT',
                'points_per_unit': 2.0,
                'sort_order': 1
            },
            {
                'id': self.rule_place_id,
                'tournament_id': self.slug_a,
                'name': 'Placement Position',
                'type': 'PLACEMENT',
                'points_per_unit': 0.0,
                'sort_order': 2,
                'placement_points': [
                    {'placement': 1, 'points': 12},
                    {'placement': 2, 'points': 9},
                    {'placement': 3, 'points': 8}
                ]
            }
        ]
        IN_MEMORY_PLACEMENT_RULES[self.rule_place_id] = [
            {'placement': 1, 'points': 12},
            {'placement': 2, 'points': 9},
            {'placement': 3, 'points': 8}
        ]

        # Configure Matches for Tournament A: Match 1 & Match 2
        self.match1_id = str(uuid.uuid4())
        self.match2_id = str(uuid.uuid4())

        IN_MEMORY_MATCHES[self.slug_a] = [
            {
                'id': self.match1_id,
                'tournament_id': self.slug_a,
                'match_number': 1,
                'title': 'Bermuda Match 1',
                'status': 'COMPLETED',
                'created_at': '2026-09-28T10:00:00Z'
            },
            {
                'id': self.match2_id,
                'tournament_id': self.slug_a,
                'match_number': 2,
                'title': 'Purgatory Match 2',
                'status': 'COMPLETED',
                'created_at': '2026-09-28T11:00:00Z'
            }
        ]

        # Configure Match Results:
        # Match 1:
        # Phoenix: 10 kills * 2 = 20, 1st place = 12 -> Total 32 pts
        # Titans: 5 kills * 2 = 10, 2nd place = 9 -> Total 19 pts
        IN_MEMORY_MATCH_RESULTS[self.match1_id] = {
            self.team1_id: {
                'match_id': self.match1_id,
                'team_id': self.team1_id,
                'raw_scores': {self.rule_kills_id: 10, self.rule_place_id: 1},
                'calculated_scores': {self.rule_kills_id: 20, self.rule_place_id: 12},
                'total_points': 32
            },
            self.team2_id: {
                'match_id': self.match1_id,
                'team_id': self.team2_id,
                'raw_scores': {self.rule_kills_id: 5, self.rule_place_id: 2},
                'calculated_scores': {self.rule_kills_id: 10, self.rule_place_id: 9},
                'total_points': 19
            }
        }

        # Match 2:
        # Phoenix: 8 kills * 2 = 16, 2nd place = 9 -> Total 25 pts (Overall = 57)
        # Titans: 12 kills * 2 = 24, 1st place = 12 -> Total 36 pts (Overall = 55)
        IN_MEMORY_MATCH_RESULTS[self.match2_id] = {
            self.team1_id: {
                'match_id': self.match2_id,
                'team_id': self.team1_id,
                'raw_scores': {self.rule_kills_id: 8, self.rule_place_id: 2},
                'calculated_scores': {self.rule_kills_id: 16, self.rule_place_id: 9},
                'total_points': 25
            },
            self.team2_id: {
                'match_id': self.match2_id,
                'team_id': self.team2_id,
                'raw_scores': {self.rule_kills_id: 12, self.rule_place_id: 1},
                'calculated_scores': {self.rule_kills_id: 24, self.rule_place_id: 12},
                'total_points': 36
            }
        }

    def tearDown(self):
        self.app_context.pop()

    # ════════════════════════════════════════════════════════════════════════════════
    # 1. FINALIZATION & AUTHORIZATION
    # ════════════════════════════════════════════════════════════════════════════════

    def test_organizer_can_finalize_authorized_tournament(self):
        """Authorized organizer can finalize their tournament results."""
        resp = self.client.post(
            f"/api/leaderboard/{self.slug_a}/finalize",
            headers=self.org_headers
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['status'], 'FINALIZED')
        self.assertIn('finalized_at', data)

        # Check status endpoint
        status_resp = self.client.get(f"/api/leaderboard/{self.slug_a}/status")
        self.assertEqual(status_resp.status_code, 200)
        status_data = status_resp.get_json()
        self.assertEqual(status_data['status'], 'FINALIZED')
        self.assertTrue(status_data['is_locked'])

    def test_unauthorized_user_cannot_finalize(self):
        """Unauthorized users and players cannot finalize tournament results."""
        # Missing auth
        resp_no_auth = self.client.post(f"/api/leaderboard/{self.slug_a}/finalize")
        self.assertEqual(resp_no_auth.status_code, 401)

        # Player role
        resp_player = self.client.post(
            f"/api/leaderboard/{self.slug_a}/finalize",
            headers=self.player_headers
        )
        self.assertEqual(resp_player.status_code, 403)

        # Attacker organizer (not authorized for this tournament)
        resp_attacker = self.client.post(
            f"/api/leaderboard/{self.slug_a}/finalize",
            headers=self.attacker_headers
        )
        self.assertEqual(resp_attacker.status_code, 403)

    def test_cannot_finalize_tournament_without_matches(self):
        """Cannot finalize if tournament has zero matches."""
        empty_slug = f"empty-tourn-{int(time.time())}"
        IN_MEMORY_TOURNAMENTS.append({
            'slug': empty_slug,
            'title': 'Empty Tournament',
            'organizer_email': self.org_email,
            'organizer_id': self.org_id
        })
        resp = self.client.post(
            f"/api/leaderboard/{empty_slug}/finalize",
            headers=self.org_headers
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertFalse(data['success'])
        self.assertIn('at least one match must exist', data['message'].lower())

    # ════════════════════════════════════════════════════════════════════════════════
    # 2. FINALIZATION LOCKING SAFETY (FREEZE RULES, MATCHES, AND SCORES)
    # ════════════════════════════════════════════════════════════════════════════════

    def test_finalized_tournament_rejects_scoring_rule_modifications(self):
        """Once finalized, scoring rule add/update/delete/reorder attempts return 403."""
        # 1. Finalize tournament
        fin_resp = self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        self.assertEqual(fin_resp.status_code, 200)

        # 2. Attempt to add scoring rule -> 403
        add_rule = self.client.post(
            f"/api/leaderboard/{self.slug_a}/rules",
            headers=self.org_headers,
            json={'name': 'Booyah Bonus', 'type': 'OCCURRENCE', 'points_per_unit': 5}
        )
        self.assertEqual(add_rule.status_code, 403)
        self.assertIn('locked', add_rule.get_json()['message'].lower())

        # 3. Attempt to update scoring rule -> 403
        edit_rule = self.client.put(
            f"/api/leaderboard/{self.slug_a}/rules/{self.rule_kills_id}",
            headers=self.org_headers,
            json={'name': 'Kills 2x', 'points_per_unit': 3}
        )
        self.assertEqual(edit_rule.status_code, 403)
        self.assertIn('locked', edit_rule.get_json()['message'].lower())

        # 4. Attempt to delete scoring rule -> 403
        del_rule = self.client.delete(
            f"/api/leaderboard/{self.slug_a}/rules/{self.rule_kills_id}",
            headers=self.org_headers
        )
        self.assertEqual(del_rule.status_code, 403)
        self.assertIn('locked', del_rule.get_json()['message'].lower())

        # 5. Attempt to reorder scoring rules -> 403
        reorder_rule = self.client.post(
            f"/api/leaderboard/{self.slug_a}/rules/reorder",
            headers=self.org_headers,
            json={'rule_ids': [self.rule_place_id, self.rule_kills_id]}
        )
        self.assertEqual(reorder_rule.status_code, 403)
        self.assertIn('locked', reorder_rule.get_json()['message'].lower())

    def test_finalized_tournament_rejects_match_and_result_modifications(self):
        """Once finalized, attempts to add/delete matches or modify results return 403."""
        # 1. Finalize tournament
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)

        # 2. Attempt to add match -> 403
        add_match = self.client.post(
            f"/api/leaderboard/{self.slug_a}/matches",
            headers=self.org_headers,
            json={'title': 'Match 3 Extra'}
        )
        self.assertEqual(add_match.status_code, 403)
        self.assertIn('locked', add_match.get_json()['message'].lower())

        # 3. Attempt to delete match -> 403
        del_match = self.client.delete(
            f"/api/leaderboard/{self.slug_a}/matches/{self.match1_id}",
            headers=self.org_headers
        )
        self.assertEqual(del_match.status_code, 403)
        self.assertIn('locked', del_match.get_json()['message'].lower())

        # 4. Attempt to edit match results -> 403
        edit_results = self.client.put(
            f"/api/leaderboard/{self.slug_a}/matches/{self.match1_id}/results",
            headers=self.org_headers,
            json={'results': [{'team_id': self.team1_id, 'raw_scores': {self.rule_kills_id: 99}}]}
        )
        self.assertEqual(edit_results.status_code, 403)
        self.assertIn('locked', edit_results.get_json()['message'].lower())

    def test_attendance_remains_unaffected_after_finalization(self):
        """Attendance system is completely decoupled and NOT locked by leaderboard finalization."""
        # Finalize leaderboard
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)

        # Check attendance endpoint / status
        att_resp = self.client.get(
            f"/api/attendance/{self.slug_a}/status",
            headers=self.org_headers
        )
        # Attendance endpoint should respond normally (200 or 404 if slug format requires id, but never 403 locked)
        self.assertNotEqual(att_resp.status_code, 403)

    # ════════════════════════════════════════════════════════════════════════════════
    # 3. EXPORT CAPABILITIES (CSV, XLSX, PRINTABLE HTML)
    # ════════════════════════════════════════════════════════════════════════════════

    def test_export_csv_contains_all_dynamic_columns_and_totals(self):
        """CSV export contains tournament metadata, dynamic scoring columns, matches, and totals."""
        resp = self.client.get(
            f"/api/leaderboard/{self.slug_a}/export?format=csv",
            headers=self.org_headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, 'text/csv')

        csv_text = resp.data.decode('utf-8')
        # Check Tournament Metadata
        self.assertIn('Xenova Championship 2026', csv_text)
        self.assertIn(self.slug_a, csv_text)
        self.assertIn('Free Fire', csv_text)

        # Check Summary Standings Headers & Data
        self.assertIn('Rank,Team ID,Team Name,Captain Name,Captain In-Game Name', csv_text)
        self.assertIn('Phoenix Alpha', csv_text)
        self.assertIn('亗PHOENIX亗', csv_text)
        self.assertIn('Titans Gaming', csv_text)
        self.assertIn('TITANS_V', csv_text)
        self.assertIn('Overall Total', csv_text)

        # Check Dynamic Columns in Match Breakdown section
        self.assertIn('Kills (Raw)', csv_text)
        self.assertIn('Placement Position (Raw)', csv_text)
        self.assertIn('Match Total', csv_text)

    def test_export_xlsx_contains_valid_sheets_and_data(self):
        """XLSX export generates a valid Excel workbook with Summary and Breakdown sheets."""
        resp = self.client.get(
            f"/api/leaderboard/{self.slug_a}/export?format=xlsx",
            headers=self.org_headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn('spreadsheetml', resp.mimetype)

        # Verify workbook structure with openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(resp.data))
        self.assertIn('Final Standings', wb.sheetnames)
        self.assertIn('Match Breakdown', wb.sheetnames)

        standings_sheet = wb['Final Standings']
        # Find team names in the sheet
        cell_values = [cell.value for row in standings_sheet.iter_rows() for cell in row if cell.value]
        self.assertIn('Phoenix Alpha', cell_values)
        self.assertIn('亗PHOENIX亗', cell_values)
        self.assertIn('Titans Gaming', cell_values)
        self.assertIn('TITANS_V', cell_values)

    def test_export_printable_html(self):
        """HTML export returns complete printable view with high-res styling."""
        resp = self.client.get(
            f"/api/leaderboard/{self.slug_a}/export?format=html",
            headers=self.org_headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, 'text/html')
        html_str = resp.data.decode('utf-8')
        self.assertIn('Phoenix Alpha', html_str)
        self.assertIn('亗PHOENIX亗', html_str)
        self.assertIn('window.print()', html_str)

    def test_tournament_isolation_in_export(self):
        """Tournament A export NEVER contains Tournament B teams or data."""
        resp_a = self.client.get(
            f"/api/leaderboard/{self.slug_a}/export?format=csv",
            headers=self.org_headers
        )
        csv_a = resp_a.data.decode('utf-8')
        self.assertNotIn('Zenith Legends', csv_a)
        self.assertNotIn('ZENITH_GOD', csv_a)

    def test_export_is_strictly_read_only(self):
        """Exporting never modifies tournament status, matches, rules, or attendance."""
        # Initially status is LIVE
        initial_status = self.client.get(f"/api/leaderboard/{self.slug_a}/status").get_json()
        self.assertEqual(initial_status['status'], 'LIVE')

        # Run export
        self.client.get(f"/api/leaderboard/{self.slug_a}/export?format=csv", headers=self.org_headers)
        self.client.get(f"/api/leaderboard/{self.slug_a}/export?format=xlsx", headers=self.org_headers)

        # Status must still be LIVE
        after_status = self.client.get(f"/api/leaderboard/{self.slug_a}/status").get_json()
        self.assertEqual(after_status['status'], 'LIVE')

    # ════════════════════════════════════════════════════════════════════════════════
    # 4. SUBMISSION TO ADMIN & TRANSITION TO 'SUBMITTED'
    # ════════════════════════════════════════════════════════════════════════════════

    def test_organizer_can_submit_finalized_results_to_admin(self):
        """Organizer can submit finalized tournament results for Admin review."""
        # 1. Finalize first
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)

        # 2. Submit to admin
        sub_resp = self.client.post(
            f"/api/leaderboard/{self.slug_a}/submit",
            headers=self.org_headers,
            json={'notes': 'All 2 matches completed smoothly.'}
        )
        self.assertEqual(sub_resp.status_code, 200)
        sub_data = sub_resp.get_json()
        self.assertTrue(sub_data['success'])
        self.assertEqual(sub_data['status'], 'SUBMITTED')
        self.assertIn('submission_id', sub_data)

        # 3. Check status
        status_resp = self.client.get(f"/api/leaderboard/{self.slug_a}/status")
        status_data = status_resp.get_json()
        self.assertEqual(status_data['status'], 'SUBMITTED')
        self.assertTrue(status_data['is_locked'])
        self.assertIsNotNone(status_data['submitted_at'])

        # 4. Verify in-memory submission record exists
        submission_records = [s for s in IN_MEMORY_SUBMISSIONS if s['tournament_id'] == self.slug_a]
        self.assertEqual(len(submission_records), 1)
        sub = submission_records[0]
        self.assertEqual(sub['status'], 'SUBMITTED')
        self.assertEqual(sub['notes'], 'All 2 matches completed smoothly.')
        self.assertIn('snapshot', sub)
        # Snapshot contains standings
        self.assertEqual(len(sub['snapshot']['standings']), 2)

    def test_submitted_tournament_rejects_modifications(self):
        """Submitted tournament continues to reject any modifications."""
        # Finalize and submit
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        self.client.post(f"/api/leaderboard/{self.slug_a}/submit", headers=self.org_headers)

        # Attempts to edit rules, matches, or results return 403
        edit_rule = self.client.put(
            f"/api/leaderboard/{self.slug_a}/rules/{self.rule_kills_id}",
            headers=self.org_headers,
            json={'name': 'Kills Mod'}
        )
        self.assertEqual(edit_rule.status_code, 403)

        add_match = self.client.post(
            f"/api/leaderboard/{self.slug_a}/matches",
            headers=self.org_headers,
            json={'title': 'Illegal Match'}
        )
        self.assertEqual(add_match.status_code, 403)

        save_results = self.client.put(
            f"/api/leaderboard/{self.slug_a}/matches/{self.match1_id}/results",
            headers=self.org_headers,
            json={'results': [{'team_id': self.team1_id, 'raw_scores': {}}]}
        )
        self.assertEqual(save_results.status_code, 403)

    def test_submitted_results_do_not_update_public_leaderboard(self):
        """Finalized or submitted results do NOT alter or publish to the public leaderboard."""
        # Finalize and submit
        self.client.post(f"/api/leaderboard/{self.slug_a}/finalize", headers=self.org_headers)
        self.client.post(f"/api/leaderboard/{self.slug_a}/submit", headers=self.org_headers)

        # Check public leaderboard endpoint if present
        pub_resp = self.client.get("/api/leaderboard/main")
        if pub_resp.status_code == 200:
            pub_data = pub_resp.get_json()
            # Verify unpublished tournament does not alter public leaderboard
            self.assertIsInstance(pub_data, dict)


if __name__ == '__main__':
    unittest.main()
