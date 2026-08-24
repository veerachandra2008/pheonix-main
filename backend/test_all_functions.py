"""
Complete End-to-End Test Suite for Phoenix Esports Platform
Tests all functions, endpoints, validations, fallback stores, and business logic.
"""

import unittest
import json
import hmac
import hashlib
import time
from app import create_app
from config import Config
from routes.auth import IN_MEMORY_USERS
from routes.tournaments import IN_MEMORY_TOURNAMENTS
from routes.teams import IN_MEMORY_TEAMS
from routes.colleges import IN_MEMORY_COLLEGES
from routes.payments import IN_MEMORY_REGISTRATIONS
from routes.applications import IN_MEMORY_ORGANIZER_APPS
from routes.notifications import IN_MEMORY_NOTIFICATIONS

class TestPhoenixEsportsBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def setUp(self):
        # Fresh test email per test case to avoid state pollution
        self.test_email = f"testplayer_{int(time.time() * 1000)}@college.edu"
        self.org_email = f"testorg_{int(time.time() * 1000)}@esports.org"

    # ==========================================
    # 1. HEALTH & SYSTEM CHECK
    # ==========================================
    def test_01_health_check(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertIn('service', data)

    # ==========================================
    # 2. AUTHENTICATION & USER MANAGEMENT
    # ==========================================
    def test_02_register_user_success(self):
        payload = {
            'name': 'Rohan Sharma',
            'email': self.test_email,
            'password': 'SecurePassword123!',
            'college': 'IIT Bombay'
        }
        res = self.client.post('/api/auth/register', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('user', {}).get('role'), 'PLAYER')

    def test_03_register_user_missing_fields(self):
        res = self.client.post('/api/auth/register', json={'email': 'incomplete@test.com'})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get('success'))

    def test_04_register_duplicate_user(self):
        email = f"dup_{int(time.time()*1000)}@test.com"
        payload = {'name': 'Player One', 'email': email, 'password': 'pass', 'college': 'NIT'}
        # First registration
        self.client.post('/api/auth/register', json=payload)
        # Duplicate registration
        res2 = self.client.post('/api/auth/register', json=payload)
        self.assertEqual(res2.status_code, 400)
        data2 = res2.get_json()
        self.assertTrue(data2.get('already_registered'))

    def test_05_login_success(self):
        # First register
        email = f"login_{int(time.time()*1000)}@test.com"
        self.client.post('/api/auth/register', json={
            'name': 'Gamer Pro',
            'email': email,
            'password': 'mypassword',
            'college': 'BITS Pilani'
        })
        # Login
        res = self.client.post('/api/auth/login', json={'email': email, 'password': 'mypassword'})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data['user']['email'], email)
        self.assertEqual(data['user']['role'], 'player')

    def test_06_login_admin(self):
        res = self.client.post('/api/auth/login', json={'email': 'admin@xenova.gg', 'password': 'admin'})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data['user']['role'], 'admin')

    def test_07_login_non_existent_user(self):
        res = self.client.post('/api/auth/login', json={'email': 'ghost_user_999@test.com', 'password': '123'})
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertTrue(data.get('requires_registration'))

    def test_08_update_user_role(self):
        email = f"roleuser_{int(time.time()*1000)}@test.com"
        self.client.post('/api/auth/register', json={'name': 'User Role', 'email': email, 'password': '123'})
        
        # Promote to ORGANIZER
        res = self.client.post('/api/auth/update-role', json={'email': email, 'role': 'ORGANIZER'})
        self.assertEqual(res.status_code, 200)
        
        # Demote back to PLAYER
        res2 = self.client.post('/api/auth/users/role', json={'email': email, 'role': 'PLAYER'})
        self.assertEqual(res2.status_code, 200)

    def test_09_admin_role_protected(self):
        # Attempt to demote admin
        res = self.client.post('/api/auth/update-role', json={'email': 'admin@xenova.gg', 'role': 'PLAYER'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(IN_MEMORY_USERS['admin@xenova.gg']['role'], 'ADMIN')

    def test_10_get_all_users(self):
        res = self.client.get('/api/auth/users')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIsInstance(data.get('data'), list)

    def test_11_get_organizers_and_delete(self):
        res = self.client.get('/api/auth/organizers')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))

        # Delete / Revoke organizer endpoint
        del_res = self.client.delete('/api/auth/organizers/non_existent_org@test.com')
        self.assertEqual(del_res.status_code, 200)

    # ==========================================
    # 3. TOURNAMENTS MANAGEMENT
    # ==========================================
    def test_12_get_tournaments(self):
        res = self.client.get('/api/tournaments')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertTrue(len(data.get('data')) > 0)

    def test_13_create_update_delete_tournament(self):
        slug = f"test-tournament-{int(time.time())}"
        payload = {
            'slug': slug,
            'title': 'Test Tournament 2026',
            'host': 'Test Host',
            'game': 'Valorant',
            'prize': '₹20,000',
            'fee': 'Free',
            'format': 'Single Elimination',
            'region': 'Pan India',
            'date': '30 May',
            'status': 'Upcoming',
            'status_color': '#38BDF8',
            'teams': '0/32',
            'filled': 0,
            'organizer_email': self.org_email
        }
        # Create
        res_create = self.client.post('/api/tournaments', json=payload)
        self.assertEqual(res_create.status_code, 201)

        # Update
        res_patch = self.client.patch(f'/api/tournaments/{slug}', json={'prize': '₹25,000', 'status': 'Live'})
        self.assertEqual(res_patch.status_code, 200)

        # Delete
        res_del = self.client.delete(f'/api/tournaments/{slug}')
        self.assertEqual(res_del.status_code, 200)

    def test_14_tournament_direct_register(self):
        payload = {
            'tournamentSlug': 'bgmi-college-cup-season-4',
            'tournamentTitle': 'BGMI College Cup Season 4',
            'teamName': 'Titans Squad',
            'college': 'Apex Institute',
            'captainName': 'Captain Rex',
            'email': self.test_email,
            'registeredAt': str(int(time.time()))
        }
        res = self.client.post('/api/tournaments/register', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertTrue(data.get('passId').startswith('XPH-'))

    # ==========================================
    # 4. TEAMS MANAGEMENT
    # ==========================================
    def test_15_get_teams(self):
        res = self.client.get('/api/teams')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertTrue(len(data.get('data')) > 0)

    def test_16_create_update_delete_team(self):
        slug = f"team-hyper-{int(time.time())}"
        payload = {
            'slug': slug,
            'name': 'Team Hyper',
            'college': 'MIT Manipal',
            'game': 'Valorant',
            'rank': 3,
            'win_rate': 85,
            'streak': 'W5',
            'captain': 'Hyper Captain',
            'trophies': 4,
            'members': 5,
            'verified': True,
            'verification_status': 'approved'
        }
        # Create
        res_create = self.client.post('/api/teams', json=payload)
        self.assertEqual(res_create.status_code, 201)

        # Update
        res_update = self.client.patch(f'/api/teams/{slug}', json={'trophies': 5, 'rank': 2})
        self.assertEqual(res_update.status_code, 200)

        # Delete
        res_del = self.client.delete(f'/api/teams/{slug}')
        self.assertEqual(res_del.status_code, 200)

    # ==========================================
    # 5. COLLEGES MANAGEMENT
    # ==========================================
    def test_17_get_colleges(self):
        res = self.client.get('/api/colleges')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertTrue(len(data.get('data')) > 0)

    def test_18_create_update_delete_college(self):
        slug = f"test-college-{int(time.time())}"
        payload = {
            'slug': slug,
            'name': 'Test College of Engineering',
            'location': 'Hyderabad, Telangana',
            'state': 'Telangana',
            'type': 'Engineering',
            'national_rank': 10,
            'state_rank': 3,
            'players': 120,
            'teams': 6,
            'trophies': 5,
            'wins': 4,
            'verified': True,
            'verification_status': 'approved'
        }
        # Create
        res_create = self.client.post('/api/colleges', json=payload)
        self.assertEqual(res_create.status_code, 201)

        # Update
        res_update = self.client.patch(f'/api/colleges/{slug}', json={'players': 150})
        self.assertEqual(res_update.status_code, 200)

        # Delete
        res_del = self.client.delete(f'/api/colleges/{slug}')
        self.assertEqual(res_del.status_code, 200)

    # ==========================================
    # 6. REGISTRATIONS & PASS IDS
    # ==========================================
    def test_19_create_and_verify_free_registration(self):
        payload = {
            'tournamentSlug': 'nexus-valorant-champions-cup',
            'tournamentTitle': 'Nexus Valorant Champions Cup',
            'teamName': 'Viper Squad',
            'college': 'IIT Delhi',
            'captainName': 'Aarav Viper',
            'email': self.test_email,
            'tournamentGame': 'Valorant',
            'tournamentFee': 'Free'
        }
        # Create
        res_create = self.client.post('/api/registrations/create', json=payload)
        self.assertEqual(res_create.status_code, 201)
        data = res_create.get_json()
        self.assertTrue(data.get('success'))
        pass_id = data.get('passId')
        self.assertTrue(pass_id.startswith('XPH-'))

        # Fetch by pass_id
        res_fetch = self.client.get(f'/api/registrations/{pass_id}')
        self.assertEqual(res_fetch.status_code, 200)
        fetch_data = res_fetch.get_json()
        self.assertTrue(fetch_data.get('success'))
        self.assertEqual(fetch_data['data']['passId'], pass_id)

        # Verify pass for QR Scanner
        res_verify = self.client.get(f'/api/registrations/verify/{pass_id}')
        self.assertEqual(res_verify.status_code, 200)
        verify_data = res_verify.get_json()
        self.assertTrue(verify_data.get('valid'))
        self.assertEqual(verify_data.get('status'), 'VERIFIED')

        # Filter registrations by email
        res_list = self.client.get(f'/api/registrations?email={self.test_email}')
        self.assertEqual(res_list.status_code, 200)
        list_data = res_list.get_json()
        self.assertTrue(len(list_data.get('data')) >= 1)

        # Delete registration
        res_del = self.client.delete(f'/api/registrations/{pass_id}')
        self.assertEqual(res_del.status_code, 200)

    def test_20_registration_invalid_pass(self):
        res = self.client.get('/api/registrations/verify/XPH-INVALID999')
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data.get('valid'))

    # ==========================================
    # 7. PAYMENTS & RAZORPAY VERIFICATION
    # ==========================================
    def test_21_payment_create_order_validation(self):
        # Missing email
        res1 = self.client.post('/api/payments/create-order', json={'amount': 500})
        self.assertEqual(res1.status_code, 400)

        # Missing amount
        res2 = self.client.post('/api/payments/create-order', json={'email': 'test@test.com'})
        self.assertEqual(res2.status_code, 400)

        # Amount less than ₹1
        res3 = self.client.post('/api/payments/create-order', json={'amount': 0.5, 'email': 'test@test.com'})
        self.assertEqual(res3.status_code, 400)

    def test_22_payment_verification_hmac(self):
        order_id = "order_test_123456"
        payment_id = "pay_test_987654"
        
        # Calculate valid HMAC SHA-256 with actual Config.RAZORPAY_KEY_SECRET
        secret = Config.RAZORPAY_KEY_SECRET
        if secret:
            msg = f"{order_id}|{payment_id}"
            valid_sig = hmac.new(bytes(secret, 'utf-8'), bytes(msg, 'utf-8'), hashlib.sha256).hexdigest()
            
            payload = {
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': valid_sig,
                'tournamentSlug': 'bgmi-college-cup-season-4',
                'tournamentTitle': 'BGMI College Cup Season 4',
                'teamName': 'Alpha Champs',
                'college': 'RVCE',
                'captainName': 'Captain Alpha',
                'email': self.test_email,
                'tournamentFee': '₹500'
            }
            res = self.client.post('/api/payments/verify-payment', json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data.get('success'))
            self.assertTrue(data.get('passId').startswith('XPH-'))

        # Test invalid signature
        invalid_payload = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': 'invalid_signature_hash'
        }
        res_invalid = self.client.post('/api/payments/verify-payment', json=invalid_payload)
        self.assertEqual(res_invalid.status_code, 400)

    def test_23_payment_webhook(self):
        # Webhook listener simulation
        event_payload = {
            'event': 'payment.captured',
            'payload': {
                'payment': {
                    'entity': {
                        'id': 'pay_webhook_test_123',
                        'order_id': 'order_webhook_test_456',
                        'status': 'captured'
                    }
                }
            }
        }
        res = self.client.post('/api/payments/webhook', json=event_payload)
        self.assertEqual(res.status_code, 200)

    # ==========================================
    # 8. APPLICATIONS WORKFLOW
    # ==========================================
    def test_24_applications_lifecycle(self):
        # 1. Fetch all applications
        res_all = self.client.get('/api/applications')
        self.assertEqual(res_all.status_code, 200)
        data_all = res_all.get_json()
        self.assertTrue(data_all.get('success'))
        self.assertIn('stats', data_all['data'])

        # 2. Register a user first
        applicant_email = f"orgapplicant_{int(time.time()*1000)}@college.edu"
        self.client.post('/api/auth/register', json={
            'name': 'Host Candidate',
            'email': applicant_email,
            'password': 'password123',
            'college': 'SRM University'
        })

        # 3. Submit organizer application + proposed tournament
        org_app_payload = {
            'email': applicant_email,
            'hostName': 'SRM Esports Club',
            'college': 'SRM University',
            'preferredGame': 'Valorant',
            'phone': '+91 9876543210',
            'discordServer': 'https://discord.gg/srmesports',
            'experience': 'Hosted 3 Inter-College LAN Tournaments',
            'details': 'Annual Inter-Collegiate Clash',
            'tournament': {
                'title': 'SRM Valorant Clash 2026',
                'game': 'Valorant',
                'prize': '₹30,000',
                'fee': 'Free',
                'maxTeams': 32
            }
        }
        res_submit = self.client.post('/api/applications/organizer', json=org_app_payload)
        self.assertEqual(res_submit.status_code, 201)

        # 4. Admin Approves Organizer
        action_payload = {'email': applicant_email, 'action': 'approve'}
        res_action = self.client.post('/api/applications/organizer/action', json=action_payload)
        self.assertEqual(res_action.status_code, 200)
        action_data = res_action.get_json()
        self.assertEqual(action_data.get('role'), 'ORGANIZER')
        self.assertEqual(action_data.get('status'), 'approved')

        # 5. Team approval action
        team_action_res = self.client.post('/api/applications/team/action', json={'name': 'Team Phoenix', 'action': 'approve'})
        self.assertEqual(team_action_res.status_code, 200)

        # 6. College approval action
        college_action_res = self.client.post('/api/applications/college/action', json={'slug': 'nexus-institute-of-technology', 'action': 'approve'})
        self.assertEqual(college_action_res.status_code, 200)

        # 7. Tournament approval action
        tourn_action_res = self.client.post('/api/applications/tournament/action', json={'slug': 'bgmi-college-cup-season-4', 'action': 'approve'})
        self.assertEqual(tourn_action_res.status_code, 200)

        # 8. Delete organizer application
        del_org_app = self.client.delete(f'/api/applications/organizer/{applicant_email}')
        self.assertEqual(del_org_app.status_code, 200)

    # ==========================================
    # 9. NOTIFICATIONS MANAGEMENT
    # ==========================================
    def test_25_notifications_lifecycle(self):
        # 1. Fetch notifications
        res_get = self.client.get('/api/notifications')
        self.assertEqual(res_get.status_code, 200)
        data = res_get.get_json()
        self.assertTrue(data.get('success'))
        self.assertTrue(len(data.get('data')) > 0)

        # 2. Create notification
        notif_payload = {
            'title': 'Test Match Scheduled',
            'message': 'Your match vs Team Wolves is scheduled for 8:00 PM.',
            'type': 'tournament'
        }
        res_create = self.client.post('/api/notifications', json=notif_payload)
        self.assertEqual(res_create.status_code, 201)

        # 3. Mark all as read
        res_read = self.client.post('/api/notifications/mark-read')
        self.assertEqual(res_read.status_code, 200)
        read_data = res_read.get_json()
        self.assertTrue(read_data.get('success'))
        for n in read_data.get('data'):
            self.assertTrue(n.get('read'))

if __name__ == '__main__':
    suite = unittest.TestLoader().loadTestsFromTestCase(TestPhoenixEsportsBackend)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    print("\n" + "="*50)
    print(f"Total Tests Run: {result.testsRun}")
    print(f"Errors: {len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print("="*50)
    if result.wasSuccessful():
        print("🎉 ALL BACKEND FUNCTIONS & ENDPOINTS PASSED SUCCESSFULLY!")
    else:
        print("❌ SOME TESTS FAILED!")
