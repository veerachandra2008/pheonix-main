import sys
import os
import unittest
import json

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from config import get_supabase_client

class TestPhase1CaptainFreeFireUsername(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.supabase = get_supabase_client()
        cls.test_slug = "xenova-test-phase1"
        try:
            cls.supabase.table('tournaments').delete().eq('slug', cls.test_slug).execute()
        except Exception:
            pass

        try:
            cls.supabase.table('tournaments').insert({
                'slug': cls.test_slug,
                'title': 'Xenova Free Fire Open Cup',
                'fee': 'Free',
                'game': 'Free Fire',
                'format': '4v4 Squad Match',
                'region': 'Pan India',
                'date': '2026-10-15',
                'prize': 'Verified'
            }).execute()
        except Exception as e:
            print("Notice setting up test tournament:", e)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.supabase.table('tournaments').delete().eq('slug', cls.test_slug).execute()
        except Exception:
            pass

    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        self.test_email = "rahul.phase1@univ.edu"
        self.auth_headers = {
            'Content-Type': 'application/json',
            'X-Test-User': self.test_email,
            'X-Test-User-Id': 'test-rahul-uuid-1',
            'X-Test-User-Role': 'PLAYER'
        }
        # Clear existing test registrations for this user/tournament
        try:
            self.supabase.table('registrations').delete().eq('tournament_slug', self.test_slug).eq('email', self.test_email).execute()
        except Exception:
            pass

    def test_01_missing_captain_freefire_username_rejected(self):
        """Test registration without Captain Free Fire Username is rejected with 400"""
        payload = {
            "tournamentSlug": self.test_slug,
            "tournamentTitle": "Xenova Free Fire Open Cup",
            "teamName": "Phoenix Squad",
            "college": "Tech University",
            "captainName": "Rahul Sharma",
            "email": self.test_email,
            "captainPhone": "+919876543210",
            # captain_freefire_username intentionally omitted!
            "players": [
                {"slot": 1, "name": "Rahul Sharma", "dept": "CSE", "email": self.test_email},
                {"slot": 2, "name": "Aman", "dept": "CSE", "email": "aman1@univ.edu"},
                {"slot": 3, "name": "Karan", "dept": "ECE", "email": "karan1@univ.edu"},
                {"slot": 4, "name": "Rohan", "dept": "IT", "email": "rohan1@univ.edu"}
            ]
        }
        res = self.client.post('/api/registrations/create',
                               data=json.dumps(payload),
                               headers=self.auth_headers)
        data = res.get_json()
        self.assertEqual(res.status_code, 400)
        self.assertFalse(data.get('success'))
        self.assertIn("Captain's In-Game Name is required", data.get('message', ''))
        print("[PASS] Missing Captain In-Game Name rejected with 400")

    def test_02_numeric_uid_rejected(self):
        """Test numeric Free Fire UID (e.g., 3555212345) is rejected with 400"""
        payload = {
            "tournamentSlug": self.test_slug,
            "teamName": "Phoenix Squad",
            "college": "Tech University",
            "captainName": "Rahul Sharma",
            "email": self.test_email,
            "captain_in_game_name": "3555212345",  # Numeric UID!
            "players": [
                {"slot": 1, "name": "Rahul", "dept": "CSE", "email": self.test_email},
                {"slot": 2, "name": "Aman", "dept": "CSE", "email": "aman2@univ.edu"},
                {"slot": 3, "name": "Karan", "dept": "ECE", "email": "karan2@univ.edu"},
                {"slot": 4, "name": "Rohan", "dept": "IT", "email": "rohan2@univ.edu"}
            ]
        }
        res = self.client.post('/api/registrations/create',
                               data=json.dumps(payload),
                               headers=self.auth_headers)
        data = res.get_json()
        self.assertEqual(res.status_code, 400)
        self.assertFalse(data.get('success'))
        self.assertIn("numeric UID", data.get('message', ''))
        print("[PASS] Numeric Free Fire UID '3555212345' rejected with 400")

    def test_03_length_validation(self):
        """Test sensible length validation (2 to 30 characters)"""
        # 1 character
        payload = {
            "tournamentSlug": self.test_slug,
            "teamName": "Phoenix Squad",
            "college": "Tech University",
            "captainName": "Rahul Sharma",
            "email": self.test_email,
            "captain_freefire_username": "A",
            "players": [
                {"slot": 1, "name": "Rahul", "dept": "CSE", "email": self.test_email},
                {"slot": 2, "name": "Aman", "dept": "CSE", "email": "aman3@univ.edu"},
                {"slot": 3, "name": "Karan", "dept": "ECE", "email": "karan3@univ.edu"},
                {"slot": 4, "name": "Rohan", "dept": "IT", "email": "rohan3@univ.edu"}
            ]
        }
        res = self.client.post('/api/registrations/create',
                               data=json.dumps(payload),
                               headers=self.auth_headers)
        data = res.get_json()
        self.assertEqual(res.status_code, 400)
        self.assertIn("between 2 and 30 characters", data.get('message', ''))

        # > 30 characters
        payload['captain_freefire_username'] = "A" * 35
        res = self.client.post('/api/registrations/create',
                               data=json.dumps(payload),
                               headers=self.auth_headers)
        data = res.get_json()
        self.assertEqual(res.status_code, 400)
        self.assertIn("between 2 and 30 characters", data.get('message', ''))
        print("[PASS] Length boundaries (< 2 chars and > 30 chars) rejected with 400")

    def test_04_unicode_preservation_and_organizer_visibility(self):
        """Test registration with exact Unicode username (亗PHOENIX亗), persistence, and retrieval"""
        raw_input = "  \u4e97PHOENIX\u4e97  "
        expected_ff_username = "\u4e97PHOENIX\u4e97"
        payload = {
            "tournamentSlug": self.test_slug,
            "tournamentTitle": "Xenova Free Fire Open Cup",
            "teamName": "Phoenix",
            "college": "Apex Institute",
            "captainName": "Rahul",
            "email": self.test_email,
            "captainPhone": "+919876543210",
            "captain_freefire_username": raw_input,
            "players": [
                {"slot": 1, "name": "Rahul", "dept": "CSE", "email": self.test_email},
                {"slot": 2, "name": "Teammate 2", "dept": "CSE", "email": "tm2@univ.edu"},
                {"slot": 3, "name": "Teammate 3", "dept": "ECE", "email": "tm3@univ.edu"},
                {"slot": 4, "name": "Teammate 4", "dept": "IT", "email": "tm4@univ.edu"}
            ]
        }
        res = self.client.post('/api/registrations/create',
                               data=json.dumps(payload),
                               headers=self.auth_headers)
        data = res.get_json()
        self.assertIn(res.status_code, [200, 201])
        self.assertTrue(data.get('success'))
        pass_id = data.get('passId')
        self.assertTrue(pass_id)

        # 1. Verify GET /api/registrations/<pass_id> returns preserved Unicode In-Game Name
        res_get = self.client.get(f'/api/registrations/{pass_id}')
        get_data = res_get.get_json()
        self.assertEqual(res_get.status_code, 200)
        self.assertTrue(get_data.get('success'))
        record = get_data.get('data')
        self.assertEqual(record.get('captain_in_game_name'), expected_ff_username)
        self.assertEqual(record.get('captainInGameName'), expected_ff_username)
        self.assertEqual(record.get('captain_freefire_username'), expected_ff_username)
        self.assertEqual(record.get('captainFreeFireUsername'), expected_ff_username)
        # Verify case sensitivity is preserved (not lowercased)
        self.assertNotEqual(record.get('captain_in_game_name'), "\u4e97phoenix\u4e97")
        print("[PASS] Unicode Captain In-Game Name preserved and returned on pass query")

        # 2. Verify editing/updating captain Free Fire username before tournament
        updated_username = "\u4e97PHOENIX_ELITE\u4e97"
        patch_res = self.client.patch(f'/api/registrations/{pass_id}',
                                      data=json.dumps({'captain_freefire_username': f"  {updated_username}  "}),
                                      headers=self.auth_headers)
        patch_data = patch_res.get_json()
        self.assertEqual(patch_res.status_code, 200)
        self.assertTrue(patch_data.get('success'))
        self.assertEqual(patch_data.get('captain_freefire_username'), updated_username)

        # Verify on subsequent GET
        res_get_updated = self.client.get(f'/api/registrations/{pass_id}')
        self.assertEqual(res_get_updated.get_json().get('data').get('captain_freefire_username'), updated_username)
        print("[PASS] Editing captain Free Fire username before tournament verified")

        # 3. Verify Organizer Rosters endpoint returns captain_freefire_username
        rosters_res = self.client.get('/api/rosters')
        rosters_data = rosters_res.get_json()
        self.assertEqual(rosters_res.status_code, 200)
        teams = rosters_data.get('teams', [])
        found_team = next((t for t in teams if t.get('pass_id') == pass_id), None)
        if found_team:
            self.assertEqual(found_team.get('captain_freefire_username'), updated_username)
            print("[PASS] Organizer rosters view displays Captain Free Fire Username")

        # 4. Verify registrations list returns captain_freefire_username
        regs_res = self.client.get('/api/registrations')
        regs_data = regs_res.get_json()
        self.assertEqual(regs_res.status_code, 200)
        found_reg = next((r for r in regs_data.get('data', []) if (r.get('pass_id') or r.get('passId')) == pass_id), None)
        if found_reg:
            self.assertEqual(found_reg.get('captain_freefire_username'), updated_username)
            print("[PASS] Organizer registrations list displays Captain Free Fire Username")

        # Clean up created test registration
        try:
            self.supabase.table('registrations').delete().eq('pass_id', pass_id).execute()
            self.supabase.table('tournament_rosters').delete().eq('pass_id', pass_id).execute()
            self.supabase.table('event_attendance').delete().eq('pass_id', pass_id).execute()
        except Exception:
            pass

if __name__ == '__main__':
    unittest.main()
