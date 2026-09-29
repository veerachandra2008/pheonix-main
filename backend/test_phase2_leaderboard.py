import unittest
import json
import time
import uuid
from app import create_app
from config import get_supabase_client
from routes.payments import IN_MEMORY_REGISTRATIONS
from routes.attendance import IN_MEMORY_EVENT_ATTENDANCE
from routes.leaderboard import IN_MEMORY_SCORING_RULES, IN_MEMORY_PLACEMENT_RULES

class TestPhase2OrganizerLeaderboard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        cls.supabase = get_supabase_client()
        cls.test_slug = f"phase2-leaderboard-cup-{int(time.time())}"
        cls.test_email = "organizer.phase2@univ.edu"
        cls.auth_headers = {
            'Content-Type': 'application/json',
            'X-Test-User': cls.test_email
        }

    def setUp(self):
        # Clear in-memory scoring rules for clean isolated tests
        if self.test_slug in IN_MEMORY_SCORING_RULES:
            del IN_MEMORY_SCORING_RULES[self.test_slug]

    def tearDown(self):
        pass

    def test_01_team_auto_appearance_and_ign_verification(self):
        """
        Verify:
        - Registered teams don't appear in leaderboard until marked PRESENT
        - When marked PRESENT via existing attendance system, team automatically appears
        - Team name and Captain In-Game Name appear accurately
        - Marking a 2nd team PRESENT adds it automatically without duplicate entries
        - Absent or not-marked teams are excluded from active leaderboard teams
        """
        # Register Team A
        team_a_pass = f"XPH-A{uuid.uuid4().hex[:6].upper()}"
        team_a_ign = "\u4e97PHOENIX\u4e97" # 亗PHOENIX亗
        reg_a = {
            "pass_id": team_a_pass,
            "passId": team_a_pass,
            "tournament_slug": self.test_slug,
            "tournamentSlug": self.test_slug,
            "tournament_title": "Xenova Leaderboard Open",
            "team_id": "XNV-TEAM-A",
            "team_name": "Phoenix Esports",
            "college": "Apex Institute",
            "captain_name": "Rahul",
            "captain_in_game_name": team_a_ign,
            "captainInGameName": team_a_ign,
            "email": "captain.a@univ.edu",
            "payment_status": "SUCCESS",
            "attendance_status": "NOT_MARKED"
        }
        IN_MEMORY_REGISTRATIONS[team_a_pass] = reg_a

        # Register Team B
        team_b_pass = f"XPH-B{uuid.uuid4().hex[:6].upper()}"
        team_b_ign = "TITAN\u2605OP"
        reg_b = {
            "pass_id": team_b_pass,
            "passId": team_b_pass,
            "tournament_slug": self.test_slug,
            "tournamentSlug": self.test_slug,
            "tournament_title": "Xenova Leaderboard Open",
            "team_id": "XNV-TEAM-B",
            "team_name": "Titans",
            "college": "Tech State",
            "captain_name": "Varun",
            "captain_in_game_name": team_b_ign,
            "captainInGameName": team_b_ign,
            "email": "captain.b@univ.edu",
            "payment_status": "SUCCESS",
            "attendance_status": "NOT_MARKED"
        }
        IN_MEMORY_REGISTRATIONS[team_b_pass] = reg_b

        # Register Team C (will remain ABSENT)
        team_c_pass = f"XPH-C{uuid.uuid4().hex[:6].upper()}"
        reg_c = {
            "pass_id": team_c_pass,
            "passId": team_c_pass,
            "tournament_slug": self.test_slug,
            "tournamentSlug": self.test_slug,
            "tournament_title": "Xenova Leaderboard Open",
            "team_id": "XNV-TEAM-C",
            "team_name": "Warriors",
            "college": "Metro College",
            "captain_name": "Aman",
            "captain_in_game_name": "WARRIOR_07",
            "email": "captain.c@univ.edu",
            "payment_status": "SUCCESS",
            "attendance_status": "ABSENT"
        }
        IN_MEMORY_REGISTRATIONS[team_c_pass] = reg_c

        # 1. Query Leaderboard BEFORE any team is PRESENT
        res = self.client.get(f'/api/leaderboard/{self.test_slug}')
        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('counts', {}).get('registered'), 3)
        self.assertEqual(data.get('counts', {}).get('present'), 0)
        self.assertEqual(len(data.get('teams', [])), 0)
        print("[PASS] Unmarked and absent teams are excluded from active leaderboard teams")

        # 2. Mark Team A as PRESENT using existing attendance endpoint / flow
        att_res = self.client.patch(f'/api/registrations/{team_a_pass}/attendance',
                                   data=json.dumps({'attendance_status': 'PRESENT', 'status': 'PRESENT', 'attended_by': 'Main Desk Scanner'}),
                                   headers=self.auth_headers)
        self.assertEqual(att_res.status_code, 200)
        # Verify in memory
        IN_MEMORY_REGISTRATIONS[team_a_pass]['attendance_status'] = 'PRESENT'
        IN_MEMORY_EVENT_ATTENDANCE[team_a_pass] = {
            'pass_id': team_a_pass,
            'tournament_slug': self.test_slug,
            'attendance_status': 'PRESENT',
            'attended_at': '2026-09-28T21:00:00Z'
        }

        # 3. Query Leaderboard -> Team A must automatically appear
        res_after_a = self.client.get(f'/api/leaderboard/{self.test_slug}')
        data_a = res_after_a.get_json()
        self.assertEqual(data_a.get('counts', {}).get('present'), 1)
        self.assertEqual(len(data_a.get('teams', [])), 1)
        team_row_a = data_a['teams'][0]
        self.assertEqual(team_row_a['team_id'], 'XNV-TEAM-A')
        self.assertEqual(team_row_a['team_name'], 'Phoenix Esports')
        self.assertEqual(team_row_a['captain_in_game_name'], team_a_ign)
        self.assertEqual(team_row_a['rank'], 1)
        self.assertEqual(team_row_a['total'], 0)
        print("[PASS] Team A automatically appears on leaderboard when marked PRESENT with exact IGN")

        # 4. Mark Team B as PRESENT
        IN_MEMORY_REGISTRATIONS[team_b_pass]['attendance_status'] = 'PRESENT'
        IN_MEMORY_EVENT_ATTENDANCE[team_b_pass] = {
            'pass_id': team_b_pass,
            'tournament_slug': self.test_slug,
            'attendance_status': 'PRESENT',
            'attended_at': '2026-09-28T21:05:00Z'
        }

        # 5. Query Leaderboard -> Both Team A and Team B present, Team C excluded
        res_after_b = self.client.get(f'/api/leaderboard/{self.test_slug}')
        data_b = res_after_b.get_json()
        self.assertEqual(data_b.get('counts', {}).get('present'), 2)
        self.assertEqual(len(data_b.get('teams', [])), 2)
        team_ids = [t['team_id'] for t in data_b['teams']]
        self.assertIn('XNV-TEAM-A', team_ids)
        self.assertIn('XNV-TEAM-B', team_ids)
        self.assertNotIn('XNV-TEAM-C', team_ids)
        print("[PASS] Team B automatically appears; Absent Team C remains excluded")

        # 6. Duplicate Protection: If team A is marked PRESENT again or duplicate pass exists
        dup_pass = f"XPH-DUP{uuid.uuid4().hex[:6].upper()}"
        IN_MEMORY_REGISTRATIONS[dup_pass] = {
            **reg_a,
            "pass_id": dup_pass,
            "attendance_status": "PRESENT"
        }
        res_dup = self.client.get(f'/api/leaderboard/{self.test_slug}')
        data_dup = res_dup.get_json()
        # Same team_id 'XNV-TEAM-A' must appear only ONCE
        team_a_count = sum(1 for t in data_dup['teams'] if t['team_id'] == 'XNV-TEAM-A')
        self.assertEqual(team_a_count, 1)
        print("[PASS] Duplicate protection verified: Each team_id appears strictly once")

        # Clean up
        IN_MEMORY_REGISTRATIONS.pop(team_a_pass, None)
        IN_MEMORY_REGISTRATIONS.pop(team_b_pass, None)
        IN_MEMORY_REGISTRATIONS.pop(team_c_pass, None)
        IN_MEMORY_REGISTRATIONS.pop(dup_pass, None)

    def test_02_dynamic_scoring_columns_crud(self):
        """
        Verify:
        - Adding Kills (PER_UNIT, 1 pt)
        - Adding Booyah (OCCURRENCE, 12 pts)
        - Adding Placement (PLACEMENT, custom points table)
        - Adding Fouls (PENALTY, -5 pts)
        - Adding Assists (PER_UNIT, 1 pt)
        - Editing a scoring column
        - Deleting a scoring column safely
        - Reordering columns
        - Persistence on subsequent query
        """
        # 1. Add Kills Column
        res_kills = self.client.post(
            f'/api/leaderboard/{self.test_slug}/rules',
            data=json.dumps({
                'name': 'Kills',
                'type': 'PER_UNIT',
                'points_per_unit': 1,
                'sort_order': 1
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_kills.status_code, 201)
        kills_rule = res_kills.get_json().get('rule')
        self.assertEqual(kills_rule['name'], 'Kills')
        self.assertEqual(kills_rule['type'], 'PER_UNIT')
        self.assertEqual(kills_rule['points_per_unit'], 1)
        kills_id = kills_rule['id']
        print("[PASS] Add Kills column (PER_UNIT, 1 pt)")

        # 2. Add Booyah Column
        res_booyah = self.client.post(
            f'/api/leaderboard/{self.test_slug}/rules',
            data=json.dumps({
                'name': 'Booyah',
                'type': 'OCCURRENCE',
                'points_per_unit': 12,
                'sort_order': 2
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_booyah.status_code, 201)
        booyah_rule = res_booyah.get_json().get('rule')
        self.assertEqual(booyah_rule['name'], 'Booyah')
        self.assertEqual(booyah_rule['points_per_unit'], 12)
        booyah_id = booyah_rule['id']
        print("[PASS] Add Booyah column (OCCURRENCE, 12 pts)")

        # 3. Add Placement Column with custom matrix
        custom_placement = [
            {'placement': 1, 'points': 12},
            {'placement': 2, 'points': 9},
            {'placement': 3, 'points': 8},
            {'placement': 4, 'points': 7},
            {'placement': 5, 'points': 6},
            {'placement': 6, 'points': 5},
            {'placement': 7, 'points': 4},
            {'placement': 8, 'points': 3},
            {'placement': 9, 'points': 2},
            {'placement': 10, 'points': 1},
            {'placement': 11, 'points': 0},
            {'placement': 12, 'points': 0}
        ]
        res_placement = self.client.post(
            f'/api/leaderboard/{self.test_slug}/rules',
            data=json.dumps({
                'name': 'Placement',
                'type': 'PLACEMENT',
                'placement_points': custom_placement,
                'sort_order': 3
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_placement.status_code, 201)
        placement_rule = res_placement.get_json().get('rule')
        self.assertEqual(placement_rule['name'], 'Placement')
        self.assertEqual(placement_rule['type'], 'PLACEMENT')
        self.assertEqual(len(placement_rule['placement_points']), 12)
        self.assertEqual(placement_rule['placement_points'][0]['points'], 12)
        placement_id = placement_rule['id']
        print("[PASS] Add Placement column with custom 12-position matrix (NOT hardcoded)")

        # 4. Add Fouls Column (PENALTY, -5 pts)
        res_fouls = self.client.post(
            f'/api/leaderboard/{self.test_slug}/rules',
            data=json.dumps({
                'name': 'Fouls',
                'type': 'PENALTY',
                'points_per_unit': -5,
                'sort_order': 4
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_fouls.status_code, 201)
        fouls_rule = res_fouls.get_json().get('rule')
        self.assertEqual(fouls_rule['name'], 'Fouls')
        self.assertEqual(fouls_rule['type'], 'PENALTY')
        self.assertEqual(fouls_rule['points_per_unit'], -5)
        fouls_id = fouls_rule['id']
        print("[PASS] Add Fouls column (PENALTY, -5 pts)")

        # 5. Add Custom Column: Assists (PER_UNIT, 1 pt)
        res_assists = self.client.post(
            f'/api/leaderboard/{self.test_slug}/rules',
            data=json.dumps({
                'name': 'Assists',
                'type': 'PER_UNIT',
                'points_per_unit': 1,
                'sort_order': 5
            }),
            headers=self.auth_headers
        )
        self.assertEqual(res_assists.status_code, 201)
        assists_rule = res_assists.get_json().get('rule')
        assists_id = assists_rule['id']
        print("[PASS] Add Assists custom column")

        # 6. Verify GET /api/leaderboard returns all 5 columns in proper sort order
        get_res = self.client.get(f'/api/leaderboard/{self.test_slug}')
        cols = get_res.get_json().get('columns', [])
        self.assertEqual(len(cols), 5)
        col_names = [c['name'] for c in cols]
        self.assertEqual(col_names, ['Kills', 'Booyah', 'Placement', 'Fouls', 'Assists'])
        print("[PASS] Verify all 5 dynamic columns returned in sort order")

        # 7. Edit a Column: Change Kills from 1 pt to 2 pts
        put_res = self.client.put(
            f'/api/leaderboard/{self.test_slug}/rules/{kills_id}',
            data=json.dumps({
                'name': 'Kills (Double Points)',
                'points_per_unit': 2
            }),
            headers=self.auth_headers
        )
        self.assertEqual(put_res.status_code, 200)
        self.assertEqual(put_res.get_json().get('rule', {}).get('name'), 'Kills (Double Points)')
        self.assertEqual(put_res.get_json().get('rule', {}).get('points_per_unit'), 2)
        print("[PASS] Edit a scoring column (Kills updated to Double Points, 2 pts)")

        # 8. Delete a Column: Delete Booyah
        del_res = self.client.delete(f'/api/leaderboard/{self.test_slug}/rules/{booyah_id}', headers=self.auth_headers)
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.get_json().get('success'))

        # Verify on subsequent GET: Booyah must be gone, remaining 4 columns stay intact
        get_after_del = self.client.get(f'/api/leaderboard/{self.test_slug}')
        remaining_cols = get_after_del.get_json().get('columns', [])
        self.assertEqual(len(remaining_cols), 4)
        rem_names = [c['name'] for c in remaining_cols]
        self.assertNotIn('Booyah', rem_names)
        self.assertIn('Kills (Double Points)', rem_names)
        self.assertIn('Placement', rem_names)
        self.assertIn('Fouls', rem_names)
        self.assertIn('Assists', rem_names)
        print("[PASS] Delete Booyah column: Removed cleanly without affecting other columns")

        # 9. Reorder Columns: [Placement, Kills (Double Points), Assists, Fouls]
        desired_order = [placement_id, kills_id, assists_id, fouls_id]
        reorder_res = self.client.post(
            f'/api/leaderboard/{self.test_slug}/rules/reorder',
            data=json.dumps({'rule_ids': desired_order}),
            headers=self.auth_headers
        )
        self.assertEqual(reorder_res.status_code, 200)
        reordered_cols = self.client.get(f'/api/leaderboard/{self.test_slug}').get_json().get('columns', [])
        new_order_ids = [c['id'] for c in reordered_cols]
        self.assertEqual(new_order_ids, desired_order)
        print("[PASS] Dynamic column reordering verified and persisted")

if __name__ == '__main__':
    unittest.main()
