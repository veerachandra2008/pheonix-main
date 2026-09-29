import unittest
import json
import time
import uuid
from app import create_app
from config import get_supabase_client
from routes.payments import IN_MEMORY_REGISTRATIONS
from routes.attendance import IN_MEMORY_EVENT_ATTENDANCE
from routes.leaderboard import (
    IN_MEMORY_SCORING_RULES,
    IN_MEMORY_PLACEMENT_RULES,
    IN_MEMORY_MATCHES,
    IN_MEMORY_MATCH_RESULTS
)

class TestPhase3MatchesAndAutomaticScoring(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        cls.supabase = get_supabase_client()
        cls.slug_a = f"phase3-tourn-a-{int(time.time())}"
        cls.slug_b = f"phase3-tourn-b-{int(time.time())}"
        cls.auth_headers = {'Content-Type': 'application/json'}

    def setUp(self):
        # Clear test tournament states
        for slug in [self.slug_a, self.slug_b]:
            IN_MEMORY_SCORING_RULES.pop(slug, None)
            IN_MEMORY_MATCHES.pop(slug, None)

    def test_01_tournament_specific_independent_scoring(self):
        """
        Verify every tournament has its OWN independent scoring rules.
        Example: Tournament A Booyah = 10 pts, Tournament B Booyah = 12 pts.
        Changing Tournament A must NEVER affect Tournament B.
        """
        # 1. Configure Tournament A Booyah = 10 pts
        res_a = self.client.post(
            f'/api/leaderboard/{self.slug_a}/rules',
            data=json.dumps({
                'name': 'Booyah',
                'type': 'OCCURRENCE',
                'points_per_unit': 10
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_a.status_code, 201)
        rule_a_id = res_a.get_json()['rule']['id']

        # 2. Configure Tournament B Booyah = 12 pts
        res_b = self.client.post(
            f'/api/leaderboard/{self.slug_b}/rules',
            data=json.dumps({
                'name': 'Booyah',
                'type': 'OCCURRENCE',
                'points_per_unit': 12
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_b.status_code, 201)
        rule_b_id = res_b.get_json()['rule']['id']

        # 3. Verify values are independent
        rules_a = self.client.get(f'/api/leaderboard/{self.slug_a}').get_json()['columns']
        rules_b = self.client.get(f'/api/leaderboard/{self.slug_b}').get_json()['columns']
        self.assertEqual(rules_a[0]['points_per_unit'], 10)
        self.assertEqual(rules_b[0]['points_per_unit'], 12)

        # 4. Update Tournament A to 15 pts, Tournament B must stay 12 pts
        self.client.put(
            f'/api/leaderboard/{self.slug_a}/rules/{rule_a_id}',
            data=json.dumps({'points_per_unit': 15}),
            headers=self.auth_headers
        )
        rules_a_updated = self.client.get(f'/api/leaderboard/{self.slug_a}').get_json()['columns']
        rules_b_check = self.client.get(f'/api/leaderboard/{self.slug_b}').get_json()['columns']
        self.assertEqual(rules_a_updated[0]['points_per_unit'], 15)
        self.assertEqual(rules_b_check[0]['points_per_unit'], 12)
        print("[PASS] Tournament-specific independent scoring rules verified")

    def test_02_matches_creation_and_present_team_entry(self):
        """
        Verify:
        - Organizer can add Match 1, Match 2
        - ONLY teams marked PRESENT can appear for result entry
        - Teams marked ABSENT/NOT_MARKED are rejected
        - All 4 scoring types calculate accurately on server
        - Placement mapping works
        - Raw values are preserved
        """
        # Set up 4 scoring rules for Tournament A:
        # Kills (PER_UNIT, 1), Booyah (OCCURRENCE, 12), Fouls (PENALTY, -5), Placement (PLACEMENT, custom map)
        r_kills = self.client.post(
            f'/api/leaderboard/{self.slug_a}/rules',
            data=json.dumps({'name': 'Kills', 'type': 'PER_UNIT', 'points_per_unit': 1, 'sort_order': 1}),
            headers=self.auth_headers
        ).get_json()['rule']['id']

        r_booyah = self.client.post(
            f'/api/leaderboard/{self.slug_a}/rules',
            data=json.dumps({'name': 'Booyah', 'type': 'OCCURRENCE', 'points_per_unit': 12, 'sort_order': 2}),
            headers=self.auth_headers
        ).get_json()['rule']['id']

        r_placement = self.client.post(
            f'/api/leaderboard/{self.slug_a}/rules',
            data=json.dumps({
                'name': 'Placement',
                'type': 'PLACEMENT',
                'sort_order': 3,
                'placement_points': [
                    {'placement': 1, 'points': 12},
                    {'placement': 2, 'points': 9},
                    {'placement': 3, 'points': 8},
                    {'placement': 4, 'points': 7},
                ]
            }),
            headers=self.auth_headers
        ).get_json()['rule']['id']

        r_fouls = self.client.post(
            f'/api/leaderboard/{self.slug_a}/rules',
            data=json.dumps({'name': 'Fouls', 'type': 'PENALTY', 'points_per_unit': -5, 'sort_order': 4}),
            headers=self.auth_headers
        ).get_json()['rule']['id']

        # Register Team Phoenix (PRESENT)
        pass_phoenix = f"XPH-PHX-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_phoenix] = {
            'pass_id': pass_phoenix,
            'tournament_slug': self.slug_a,
            'team_id': 'XNV-017',
            'team_name': 'Phoenix',
            'captain_name': 'Rahul',
            'captain_in_game_name': '\u4e97PHOENIX\u4e97',
            'attendance_status': 'PRESENT'
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_phoenix] = {
            'pass_id': pass_phoenix,
            'tournament_slug': self.slug_a,
            'attendance_status': 'PRESENT'
        }

        # Register Team Titans (PRESENT)
        pass_titans = f"XPH-TTN-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_titans] = {
            'pass_id': pass_titans,
            'tournament_slug': self.slug_a,
            'team_id': 'XNV-018',
            'team_name': 'Titans',
            'captain_name': 'Varun',
            'captain_in_game_name': 'TITAN OP',
            'attendance_status': 'PRESENT'
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_titans] = {
            'pass_id': pass_titans,
            'tournament_slug': self.slug_a,
            'attendance_status': 'PRESENT'
        }

        # Register Team Warriors (ABSENT)
        pass_warriors = f"XPH-WAR-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_warriors] = {
            'pass_id': pass_warriors,
            'tournament_slug': self.slug_a,
            'team_id': 'XNV-019',
            'team_name': 'Warriors',
            'captain_name': 'Aman',
            'captain_in_game_name': 'WARRIOR 7',
            'attendance_status': 'ABSENT'
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_warriors] = {
            'pass_id': pass_warriors,
            'tournament_slug': self.slug_a,
            'attendance_status': 'ABSENT'
        }

        # 1. Add Match 1
        res_m1 = self.client.post(
            f'/api/leaderboard/{self.slug_a}/matches',
            data=json.dumps({'title': 'Match 1'}),
            headers=self.auth_headers
        )
        self.assertEqual(res_m1.status_code, 201)
        match_1_id = res_m1.get_json()['match']['id']
        print("[PASS] Add Match 1 successfully")

        # 2. Add Match 2
        res_m2 = self.client.post(
            f'/api/leaderboard/{self.slug_a}/matches',
            data=json.dumps({'title': 'Match 2'}),
            headers=self.auth_headers
        )
        self.assertEqual(res_m2.status_code, 201)
        match_2_id = res_m2.get_json()['match']['id']
        print("[PASS] Add Match 2 successfully (multiple matches supported)")

        # 3. Get Match 1 details: Verify ONLY PRESENT teams appear for result entry
        m1_details = self.client.get(f'/api/leaderboard/{self.slug_a}/matches/{match_1_id}').get_json()
        present_tids = [t['team_id'] for t in m1_details['teams']]
        self.assertIn('XNV-017', present_tids)
        self.assertIn('XNV-018', present_tids)
        self.assertNotIn('XNV-019', present_tids)  # Absent team Warriors must NOT appear
        print("[PASS] Only PRESENT teams appear for match result entry; ABSENT teams excluded")

        # 4. Attempt to submit score for ABSENT team Warriors -> MUST BE REJECTED with 400
        res_reject = self.client.put(
            f'/api/leaderboard/{self.slug_a}/matches/{match_1_id}/results',
            data=json.dumps({
                'results': [
                    {'team_id': 'XNV-019', 'raw_scores': {r_kills: 5}}
                ]
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_reject.status_code, 400)
        self.assertFalse(res_reject.get_json()['success'])
        print("[PASS] Submitting results for ABSENT team rejected with 400")

        # 5. Enter results for Phoenix: Kills 7, Booyah 1, Placement 1, Fouls 0
        # Expected calculation:
        # Kills: 7 * 1 = 7
        # Booyah: 1 * 12 = 12
        # Placement: 1st in placement map = 12
        # Fouls: 0 * -5 = 0
        # Total = 7 + 12 + 12 + 0 = 31
        res_save = self.client.put(
            f'/api/leaderboard/{self.slug_a}/matches/{match_1_id}/results',
            data=json.dumps({
                'results': [
                    {
                        'team_id': 'XNV-017',
                        'raw_scores': {
                            r_kills: 7,
                            r_booyah: 1,
                            r_placement: 1,
                            r_fouls: 0
                        }
                    },
                    {
                        'team_id': 'XNV-018',
                        'raw_scores': {
                            r_kills: 4,
                            r_booyah: 0,
                            r_placement: 2,
                            r_fouls: 1  # 1 foul * -5 = -5
                        }
                    }
                ]
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_save.status_code, 200)
        saved_rows = res_save.get_json()['results']
        
        # Verify Phoenix (XNV-017)
        phx_result = next(r for r in saved_rows if r['team_id'] == 'XNV-017')
        self.assertEqual(phx_result['raw_scores'][r_kills], 7.0)
        self.assertEqual(phx_result['raw_scores'][r_booyah], 1.0)
        self.assertEqual(phx_result['raw_scores'][r_placement], 1.0)
        self.assertEqual(phx_result['raw_scores'][r_fouls], 0.0)
        self.assertEqual(phx_result['calculated_scores'][r_kills], 7.0)
        self.assertEqual(phx_result['calculated_scores'][r_booyah], 12.0)
        self.assertEqual(phx_result['calculated_scores'][r_placement], 12.0)
        self.assertEqual(phx_result['calculated_scores'][r_fouls], 0.0)
        self.assertEqual(phx_result['total_points'], 31.0)
        print("[PASS] Exact calculation match: Phoenix Total = 31 (7 + 12 + 12 + 0)")

        # Verify Titans (XNV-018)
        # Kills 4 (4*1=4), Booyah 0 (0), Placement 2 (9), Fouls 1 (-5)
        # Total = 4 + 0 + 9 - 5 = 8
        ttn_result = next(r for r in saved_rows if r['team_id'] == 'XNV-018')
        self.assertEqual(ttn_result['calculated_scores'][r_kills], 4.0)
        self.assertEqual(ttn_result['calculated_scores'][r_booyah], 0.0)
        self.assertEqual(ttn_result['calculated_scores'][r_placement], 9.0)
        self.assertEqual(ttn_result['calculated_scores'][r_fouls], -5.0)
        self.assertEqual(ttn_result['total_points'], 8.0)
        print("[PASS] Penalty reduction & 2nd place placement calculation: Titans Total = 8 (4 + 0 + 9 - 5)")

        # 6. Edit previously entered raw values: Kills 7 -> 9
        res_edit_raw = self.client.put(
            f'/api/leaderboard/{self.slug_a}/matches/{match_1_id}/results',
            data=json.dumps({
                'results': [
                    {
                        'team_id': 'XNV-017',
                        'raw_scores': {
                            r_kills: 9,
                            r_booyah: 1,
                            r_placement: 1,
                            r_fouls: 0
                        }
                    }
                ]
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_edit_raw.status_code, 200)
        phx_edited = next(r for r in res_edit_raw.get_json()['results'] if r['team_id'] == 'XNV-017')
        self.assertEqual(phx_edited['raw_scores'][r_kills], 9.0)
        self.assertEqual(phx_edited['total_points'], 33.0)  # 9 + 12 + 12 = 33
        print("[PASS] Editing raw values automatically recalculates points: Kills 7->9 => Total 31->33")

        # 7. Edit Scoring Rule: Change Kills from 1 pt to 3 pts
        # Must recalculate affected results from the stored RAW values (9 * 3 = 27)
        # New Total = 27 + 12 + 12 = 51!
        self.client.put(
            f'/api/leaderboard/{self.slug_a}/rules/{r_kills}',
            data=json.dumps({'points_per_unit': 3}),
            headers=self.auth_headers
        )
        m1_after_rule_change = self.client.get(f'/api/leaderboard/{self.slug_a}/matches/{match_1_id}').get_json()
        phx_recalc = next(t for t in m1_after_rule_change['teams'] if t['team_id'] == 'XNV-017')
        self.assertEqual(phx_recalc['raw_scores'][r_kills], 9.0)  # Raw value strictly preserved
        self.assertEqual(phx_recalc['calculated_scores'][r_kills], 27.0)  # 9 * 3 = 27
        self.assertEqual(phx_recalc['total_points'], 51.0)  # 27 + 12 + 12 = 51
        print("[PASS] Rule update recalculates all stored raw values: 9 kills @ 3 pts => Total 51")

        # 8. Separate Matches Isolation: Match 2 has independent scores
        res_m2_save = self.client.put(
            f'/api/leaderboard/{self.slug_a}/matches/{match_2_id}/results',
            data=json.dumps({
                'results': [
                    {
                        'team_id': 'XNV-017',
                        'raw_scores': {
                            r_kills: 2,
                            r_booyah: 0,
                            r_placement: 3,  # 3rd -> 8 pts
                            r_fouls: 0
                        }
                    }
                ]
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_m2_save.status_code, 200)
        # Match 2 Total = 2 * 3 (kills) + 8 (3rd place) = 14
        phx_m2 = next(r for r in res_m2_save.get_json()['results'] if r['team_id'] == 'XNV-017')
        self.assertEqual(phx_m2['total_points'], 14.0)

        # Match 1 must remain 51.0
        m1_check = self.client.get(f'/api/leaderboard/{self.slug_a}/matches/{match_1_id}').get_json()
        phx_m1_check = next(t for t in m1_check['teams'] if t['team_id'] == 'XNV-017')
        self.assertEqual(phx_m1_check['total_points'], 51.0)
        print("[PASS] Multiple matches remain completely independent")

        # Clean up
        IN_MEMORY_REGISTRATIONS.pop(pass_phoenix, None)
        IN_MEMORY_REGISTRATIONS.pop(pass_titans, None)
        IN_MEMORY_REGISTRATIONS.pop(pass_warriors, None)

if __name__ == '__main__':
    unittest.main()
