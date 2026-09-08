"""
test_registration_deadline.py
=============================================================================
PRODUCTION-SAFE REGISTRATION CLOSING DEADLINE TEST SUITE

CRITICAL PRODUCTION DATABASE RULE ENFORCEMENT:
- This test suite runs 100% against mock objects and in-memory test structures.
- Absolutely NO inserts, updates, deletes, truncations, or seeding are performed
  on production Supabase.
- All database queries and storage operations are intercepted and mocked.
=============================================================================
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import json

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
from cache import api_cache
from routes.tournaments import (
    compute_registration_closed,
    enrich_tournament_response,
    IN_MEMORY_TOURNAMENTS
)
from routes.payments import (
    is_user_authorized_for_tournament,
    IN_MEMORY_PAYMENT_ORDERS,
    IN_MEMORY_REGISTRATIONS
)

class MockTable:
    def __init__(self, data=None):
        self._data = data if data is not None else []

    def select(self, *args, **kwargs):
        return self

    def update(self, *args, **kwargs):
        return self

    def insert(self, *args, **kwargs):
        return self

    def delete(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def ilike(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def or_(self, *args, **kwargs):
        return self

    def maybeSingle(self, *args, **kwargs):
        return self

    def execute(self):
        res = MagicMock()
        res.data = self._data
        return res

class MockSupabaseClient:
    def __init__(self, table_map=None):
        self.table_map = table_map or {}

    def table(self, name):
        return self.table_map.get(name, MockTable([]))

class TestRegistrationClosingDeadline(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        self.app.testing = True

        # Clear cache & test stores
        api_cache.clear()
        IN_MEMORY_TOURNAMENTS.clear()
        IN_MEMORY_PAYMENT_ORDERS.clear()
        IN_MEMORY_REGISTRATIONS.clear()

    # =========================================================================
    # SECTION 1: CORE DEADLINE CALCULATION & UTC LOGIC
    # =========================================================================

    def test_deadline_null_or_empty(self):
        """NULL or empty string deadlines must result in is_registration_closed = False"""
        self.assertFalse(compute_registration_closed(None))
        self.assertFalse(compute_registration_closed(""))
        self.assertFalse(compute_registration_closed("   "))
        self.assertFalse(compute_registration_closed("invalid-date-format"))
        self.assertFalse(compute_registration_closed({'registration_deadline': None}))
        self.assertFalse(compute_registration_closed({}))

    def test_deadline_future_utc(self):
        """Future UTC deadlines must result in is_registration_closed = False"""
        now = datetime.now(timezone.utc)
        future_dt = now + timedelta(hours=2)
        future_iso = future_dt.isoformat()
        self.assertFalse(compute_registration_closed(future_iso))
        self.assertFalse(compute_registration_closed("2099-12-31T23:59:59Z"))
        self.assertFalse(compute_registration_closed({'registration_deadline': future_iso}))

    def test_deadline_past_utc(self):
        """Past UTC deadlines must result in is_registration_closed = True"""
        now = datetime.now(timezone.utc)
        past_dt = now - timedelta(minutes=5)
        past_iso = past_dt.isoformat()
        self.assertTrue(compute_registration_closed(past_iso))
        self.assertTrue(compute_registration_closed("2020-01-01T00:00:00Z"))
        self.assertTrue(compute_registration_closed({'registration_deadline': past_iso}))

    def test_exact_deadline_boundary(self):
        """
        Exact second boundary tests:
        - 1 second before deadline -> OPEN (False)
        - exact second of deadline -> CLOSED (True)
        - 1 second after deadline  -> CLOSED (True)
        """
        now = datetime.now(timezone.utc)
        # Target deadline 1 second in future -> not closed yet
        self.assertFalse(compute_registration_closed(now + timedelta(seconds=1)))
        # Target deadline equal to current second -> closed
        self.assertTrue(compute_registration_closed(now))
        # Target deadline 1 second in past -> closed
        self.assertTrue(compute_registration_closed(now - timedelta(seconds=1)))

    def test_timezone_conversion(self):
        """Deadlines with non-UTC time offsets (+05:30 IST, -05:00 EST) are converted correctly to UTC for comparison"""
        now = datetime.now(timezone.utc)

        # Future time represented in IST (+05:30)
        future_ist = (now + timedelta(hours=2)).astimezone(timezone(timedelta(hours=5, minutes=30))).isoformat()
        self.assertFalse(compute_registration_closed(future_ist))

        # Past time represented in IST (+05:30)
        past_ist = (now - timedelta(hours=2)).astimezone(timezone(timedelta(hours=5, minutes=30))).isoformat()
        self.assertTrue(compute_registration_closed(past_ist))

        # Future time represented in EST (-05:00)
        future_est = (now + timedelta(hours=2)).astimezone(timezone(timedelta(hours=-5))).isoformat()
        self.assertFalse(compute_registration_closed(future_est))

        # Past time represented in EST (-05:00)
        past_est = (now - timedelta(hours=2)).astimezone(timezone(timedelta(hours=-5))).isoformat()
        self.assertTrue(compute_registration_closed(past_est))

    # =========================================================================
    # SECTION 2: ENRICHMENT & API CONTRACT
    # =========================================================================

    def test_enrich_tournament_response(self):
        """Enrichment adds both is_registration_closed and registration_deadline"""
        # Case A: No deadline
        t1 = {'title': 'Apex Open', 'slug': 'apex-open'}
        res1 = enrich_tournament_response(t1)
        self.assertIn('is_registration_closed', res1)
        self.assertFalse(res1['is_registration_closed'])
        self.assertIsNone(res1['registration_deadline'])

        # Case B: Expired deadline
        t2 = {'title': 'Past Open', 'slug': 'past-open', 'registration_deadline': '2020-01-01T00:00:00Z'}
        res2 = enrich_tournament_response(t2)
        self.assertTrue(res2['is_registration_closed'])
        self.assertEqual(res2['registration_deadline'], '2020-01-01T00:00:00Z')

        # Case C: Future deadline
        future_iso = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        t3 = {'title': 'Future Open', 'slug': 'future-open', 'registration_deadline': future_iso}
        res3 = enrich_tournament_response(t3)
        self.assertFalse(res3['is_registration_closed'])

    @patch('routes.tournaments.get_supabase_client')
    def test_get_tournaments_api_contract(self, mock_sb):
        """GET /api/tournaments returns is_registration_closed and registration_deadline"""
        mock_data = [
            {'id': 1, 'slug': 'open-tourney', 'title': 'Open Tourney', 'registration_deadline': None},
            {'id': 2, 'slug': 'closed-tourney', 'title': 'Closed Tourney', 'registration_deadline': '2020-01-01T00:00:00Z'}
        ]
        mock_sb.return_value = MockSupabaseClient({'tournaments': MockTable(mock_data)})

        res = self.client.get('/api/tournaments/')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        tournaments = data['data']
        self.assertEqual(len(tournaments), 2)

        open_t = next(t for t in tournaments if t['slug'] == 'open-tourney')
        self.assertFalse(open_t['is_registration_closed'])
        self.assertIsNone(open_t['registration_deadline'])

        closed_t = next(t for t in tournaments if t['slug'] == 'closed-tourney')
        self.assertTrue(closed_t['is_registration_closed'])
        self.assertEqual(closed_t['registration_deadline'], '2020-01-01T00:00:00Z')

    @patch('routes.tournaments.get_supabase_client')
    def test_get_tournament_by_slug_api_contract(self, mock_sb):
        """GET /api/tournaments/<slug> returns enriched deadline fields"""
        mock_item = {
            'id': 101,
            'slug': 'major-valorant',
            'title': 'Major Valorant',
            'registration_deadline': '2020-01-01T00:00:00Z'
        }
        mock_sb.return_value = MockSupabaseClient({'tournaments': MockTable([mock_item])})

        res = self.client.get('/api/tournaments/major-valorant')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertTrue(data['data']['is_registration_closed'])
        self.assertEqual(data['data']['registration_deadline'], '2020-01-01T00:00:00Z')

    # =========================================================================
    # SECTION 3: ORGANIZER AUTHORIZATION & DEADLINE UPDATES
    # =========================================================================

    def test_authorization_logic(self):
        """Verify strict organizer & admin authorization for tournament updates"""
        tournament = {
            'slug': 'test-slug',
            'organizer_id': 'org-uuid-1',
            'organizer_email': 'organizer1@xenova.gg'
        }

        # Anonymous -> False
        self.assertFalse(is_user_authorized_for_tournament(None, tournament))

        # Admin -> True
        admin = {'id': 'admin-uuid', 'role': 'ADMIN', 'email': 'admin@xenova.gg'}
        self.assertTrue(is_user_authorized_for_tournament(admin, tournament))

        # Right Organizer by ID -> True
        organizer = {'id': 'org-uuid-1', 'role': 'ORGANIZER', 'email': 'other@xenova.gg'}
        self.assertTrue(is_user_authorized_for_tournament(organizer, tournament))

        # Right Organizer by Email -> True
        organizer_by_email = {'id': 'diff-id', 'role': 'ORGANIZER', 'email': 'organizer1@xenova.gg'}
        self.assertTrue(is_user_authorized_for_tournament(organizer_by_email, tournament))

        # Wrong Organizer -> False
        wrong_org = {'id': 'wrong-id', 'role': 'ORGANIZER', 'email': 'stranger@xenova.gg'}
        self.assertFalse(is_user_authorized_for_tournament(wrong_org, tournament))

        # Player role -> False
        player = {'id': 'org-uuid-1', 'role': 'PLAYER', 'email': 'organizer1@xenova.gg'}
        self.assertFalse(is_user_authorized_for_tournament(player, tournament))

    @patch('routes.payments.get_supabase_client')
    @patch('routes.tournaments.get_supabase_client')
    def test_organizer_can_set_update_and_clear_deadline(self, mock_t_sb, mock_p_sb):
        """Authorized organizer can set, update, and clear (NULL) registration_deadline"""
        tournament = {
            'slug': 'auth-tourney',
            'organizer_id': 'org-123',
            'organizer_email': 'org@test.edu',
            'registration_deadline': None
        }

        mock_sb_client = MockSupabaseClient({'tournaments': MockTable([tournament])})
        mock_t_sb.return_value = mock_sb_client
        mock_p_sb.return_value = mock_sb_client

        org_headers = {
            'Content-Type': 'application/json',
            'X-Test-User': 'org@test.edu',
            'X-Test-User-Id': 'org-123',
            'X-Test-User-Role': 'ORGANIZER'
        }

        # 1. Set Deadline
        deadline_str = "2026-10-15T18:00:00Z"
        res = self.client.patch('/api/tournaments/auth-tourney',
                                json={'registration_deadline': deadline_str},
                                headers=org_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])

        # 2. Clear Deadline (NULL)
        res_clear = self.client.patch('/api/tournaments/auth-tourney',
                                      json={'registration_deadline': None},
                                      headers=org_headers)
        self.assertEqual(res_clear.status_code, 200)
        data_clear = res_clear.get_json()
        self.assertTrue(data_clear['success'])

    @patch('routes.payments.get_supabase_client')
    @patch('routes.tournaments.get_supabase_client')
    def test_unauthorized_user_cannot_update_deadline(self, mock_t_sb, mock_p_sb):
        """Unauthorized users cannot update registration_deadline (returns 401 or 403)"""
        tournament = {
            'slug': 'protected-tourney',
            'organizer_id': 'real-org-id',
            'organizer_email': 'realorg@test.edu'
        }
        mock_sb_client = MockSupabaseClient({'tournaments': MockTable([tournament])})
        mock_t_sb.return_value = mock_sb_client
        mock_p_sb.return_value = mock_sb_client

        # Unauthenticated (no headers) -> 401
        res_anon = self.client.patch('/api/tournaments/protected-tourney',
                                     json={'registration_deadline': '2026-12-01T00:00:00Z'})
        self.assertEqual(res_anon.status_code, 401)

        # Other Organizer -> 403
        wrong_headers = {
            'Content-Type': 'application/json',
            'X-Test-User': 'attacker@test.edu',
            'X-Test-User-Id': 'attacker-id',
            'X-Test-User-Role': 'ORGANIZER'
        }
        res_wrong = self.client.patch('/api/tournaments/protected-tourney',
                                      json={'registration_deadline': '2026-12-01T00:00:00Z'},
                                      headers=wrong_headers)
        self.assertEqual(res_wrong.status_code, 403)

    # =========================================================================
    # SECTION 4: NORMAL REGISTRATION ENFORCEMENT
    # =========================================================================

    @patch('routes.payments.get_supabase_client')
    @patch('routes.tournaments.get_supabase_client')
    def test_normal_registration_blocked_after_deadline(self, mock_t_sb, mock_p_sb):
        """POST /api/tournaments/register rejects after deadline with exact HTTP 400 response"""
        closed_tourney = {
            'slug': 'deadline-passed',
            'registration_deadline': '2020-01-01T00:00:00Z'
        }
        mock_sb_client = MockSupabaseClient({'tournaments': MockTable([closed_tourney])})
        mock_t_sb.return_value = mock_sb_client
        mock_p_sb.return_value = mock_sb_client

        player_headers = {
            'Content-Type': 'application/json',
            'X-Test-User': 'player@test.edu',
            'X-Test-User-Id': 'p-1',
            'X-Test-User-Role': 'PLAYER'
        }

        payload = {
            'tournament_slug': 'deadline-passed',
            'team_name': 'Late Squad',
            'captain_name': 'Late Captain'
        }
        res = self.client.post('/api/tournaments/register', json=payload, headers=player_headers)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error'], 'Registrations for this tournament are now closed.')
        self.assertEqual(data['message'], 'Registrations for this tournament are now closed.')

    @patch('routes.registrations.get_supabase_client')
    def test_free_registration_create_blocked_after_deadline(self, mock_sb):
        """POST /api/registrations/create rejects after deadline with exact HTTP 400 response"""
        closed_tourney = {
            'slug': 'free-closed',
            'fee': 'Free',
            'registration_deadline': '2020-01-01T00:00:00Z'
        }
        mock_sb.return_value = MockSupabaseClient({'tournaments': MockTable([closed_tourney])})

        player_headers = {
            'Content-Type': 'application/json',
            'X-Test-User': 'player@test.edu',
            'X-Test-User-Id': 'p-1',
            'X-Test-User-Role': 'PLAYER'
        }

        payload = {
            'tournamentSlug': 'free-closed',
            'teamName': 'Late Squad',
            'email': 'player@test.edu',
            'captainName': 'Late Captain'
        }
        res = self.client.post('/api/registrations/create', json=payload, headers=player_headers)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error'], 'Registrations for this tournament are now closed.')
        self.assertEqual(data['message'], 'Registrations for this tournament are now closed.')

    # =========================================================================
    # SECTION 5: MANUAL UPI ENFORCEMENT
    # =========================================================================

    @patch('routes.payments.get_supabase_client')
    def test_manual_upi_blocked_after_deadline(self, mock_sb):
        """
        POST /api/payments/manual/create must reject with HTTP 400 after deadline.
        Must NOT create payment orders, tickets, or upload screenshots.
        """
        closed_tourney = {
            'slug': 'manual-closed',
            'fee': '₹100',
            'registration_deadline': '2020-01-01T00:00:00Z'
        }
        mock_sb.return_value = MockSupabaseClient({'tournaments': MockTable([closed_tourney])})

        player_headers = {
            'X-Test-User': 'player@test.edu',
            'X-Test-User-Id': 'p-1',
            'X-Test-User-Role': 'PLAYER'
        }

        # Submit multipart form
        form_data = {
            'tournamentSlug': 'manual-closed',
            'tournamentTitle': 'Manual Closed Tourney',
            'teamName': 'Alpha Team',
            'captainName': 'Captain',
            'captainEmail': 'player@test.edu',
            'captainPhone': '9876543210',
            'utrId': '123456789012',
            'players': json.dumps([
                {'slot': 1, 'name': 'Captain', 'email': 'player@test.edu', 'isCaptain': True},
                {'slot': 2, 'name': 'P2', 'email': 'p2@test.edu', 'isCaptain': False},
                {'slot': 3, 'name': 'P3', 'email': 'p3@test.edu', 'isCaptain': False},
                {'slot': 4, 'name': 'P4', 'email': 'p4@test.edu', 'isCaptain': False},
            ])
        }

        res = self.client.post('/api/payments/manual/create',
                               data=form_data,
                               headers=player_headers,
                               content_type='multipart/form-data')

        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error'], 'Registrations for this tournament are now closed.')
        self.assertEqual(data['message'], 'Registrations for this tournament are now closed.')

        # Verify no payment orders created in-memory
        self.assertEqual(len(IN_MEMORY_PAYMENT_ORDERS), 0)
        # Verify no registrations created in-memory
        self.assertEqual(len(IN_MEMORY_REGISTRATIONS), 0)

    # =========================================================================
    # SECTION 6: RAZORPAY ENFORCEMENT
    # =========================================================================

    @patch('routes.payments.get_supabase_client')
    def test_razorpay_create_order_blocked_after_deadline(self, mock_sb):
        """POST /api/payments/create-order must reject with HTTP 400 after deadline"""
        closed_tourney = {
            'slug': 'razorpay-closed',
            'fee': '₹200',
            'registration_deadline': '2020-01-01T00:00:00Z'
        }
        mock_sb.return_value = MockSupabaseClient({'tournaments': MockTable([closed_tourney])})

        player_headers = {
            'Content-Type': 'application/json',
            'X-Test-User': 'player@test.edu',
            'X-Test-User-Id': 'p-1',
            'X-Test-User-Role': 'PLAYER'
        }

        payload = {
            'tournamentSlug': 'razorpay-closed',
            'name': 'Captain',
            'email': 'player@test.edu'
        }
        res = self.client.post('/api/payments/create-order', json=payload, headers=player_headers)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error'], 'Registrations for this tournament are now closed.')
        self.assertEqual(data['message'], 'Registrations for this tournament are now closed.')

    # =========================================================================
    # SECTION 7: REGRESSION PROTECTION (EXISTING FLOWS AFTER DEADLINE)
    # =========================================================================

    @patch('routes.payments.get_supabase_client')
    def test_existing_manual_upi_organizer_actions_allowed_after_deadline(self, mock_sb):
        """
        Organizer can STILL accept or reject an existing pending Manual UPI order
        even after the tournament registration deadline has passed.
        Deadline controls NEW orders/registrations only.
        """
        existing_order = {
            'order_id': 'mord_existing_pending',
            'payment_id': 'mord_existing_pending',
            'tournament_slug': 'manual-closed',
            'status': 'PENDING',
            'payment_method': 'MANUAL_UPI',
            'amount': 100,
            'utr_id': '123456789012',
            'screenshot_url': 'https://mock.storage/screenshot.png',
            'organizer_email': 'org@test.edu',
            'registration_payload': {
                'tournamentSlug': 'manual-closed',
                'teamName': 'Alpha Team',
                'captainName': 'Captain',
                'email': 'player@test.edu',
                'players': [
                    {'slot': 1, 'name': 'Captain', 'email': 'player@test.edu', 'isCaptain': True},
                    {'slot': 2, 'name': 'P2', 'email': 'p2@test.edu', 'isCaptain': False},
                    {'slot': 3, 'name': 'P3', 'email': 'p3@test.edu', 'isCaptain': False},
                    {'slot': 4, 'name': 'P4', 'email': 'p4@test.edu', 'isCaptain': False},
                ]
            }
        }
        closed_tourney = {
            'slug': 'manual-closed',
            'fee': '₹100',
            'organizer_email': 'org@test.edu',
            'registration_deadline': '2020-01-01T00:00:00Z'
        }

        # Store order in memory
        IN_MEMORY_PAYMENT_ORDERS['mord_existing_pending'] = existing_order
        mock_sb.return_value = MockSupabaseClient({
            'tournaments': MockTable([closed_tourney]),
            'payment_orders': MockTable([existing_order]),
            'registrations': MockTable([]),
            'tournament_rosters': MockTable([]),
            'event_attendance': MockTable([])
        })

        org_headers = {
            'Content-Type': 'application/json',
            'X-Test-User': 'org@test.edu',
            'X-Test-User-Id': 'org-123',
            'X-Test-User-Role': 'ORGANIZER'
        }

        # Organizer rejects the existing order -> should succeed (200), not blocked by deadline
        res_reject = self.client.post('/api/payments/manual/mord_existing_pending/reject',
                                      json={'reason': 'Invalid UTR'},
                                      headers=org_headers)
        self.assertEqual(res_reject.status_code, 200)
        data_rej = res_reject.get_json()
        self.assertTrue(data_rej['success'])

if __name__ == '__main__':
    unittest.main(verbosity=2)
