import sys
import os
import time
import json
import uuid

# Ensure backend is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
from routes.payments import IN_MEMORY_PAYMENT_ORDERS
from routes.tournaments import IN_MEMORY_TOURNAMENTS
from config import get_supabase_client

client = app.test_client()

# Authentication Headers for testing roles
HEADERS_UNAUTH = {'Content-Type': 'application/json'}

HEADERS_PLAYER = {
    'Content-Type': 'application/json',
    'X-Test-User': 'player_test@college.edu',
    'X-Test-User-Id': 'usr-player-1001',
    'X-Test-User-Role': 'PLAYER'
}

HEADERS_ORG_A = {
    'Content-Type': 'application/json',
    'X-Test-User': 'organizer_alpha@college.edu',
    'X-Test-User-Id': 'usr-org-alpha-2001',
    'X-Test-User-Role': 'ORGANIZER'
}

HEADERS_ORG_B = {
    'Content-Type': 'application/json',
    'X-Test-User': 'organizer_bravo@college.edu',
    'X-Test-User-Id': 'usr-org-bravo-2002',
    'X-Test-User-Role': 'ORGANIZER'
}

HEADERS_ADMIN = {
    'Content-Type': 'application/json',
    'X-Test-User': 'admin@xenova.gg',
    'X-Test-User-Id': 'usr-admin-9999',
    'X-Test-User-Role': 'ADMIN'
}

# Register test tournaments in memory and database
TOURNAMENT_A = {
    'slug': 'tourn-alpha-phase4a',
    'title': 'Tournament Alpha Phase 4A',
    'host': 'Organizer Alpha',
    'organizer_email': 'organizer_alpha@college.edu',
    'organizer_name': 'Organizer Alpha',
    'fee': '₹500/team',
    'game': 'BGMI',
    'status': 'Registering',
}

TOURNAMENT_B = {
    'slug': 'tourn-bravo-phase4a',
    'title': 'Tournament Bravo Phase 4A',
    'host': 'Organizer Bravo',
    'organizer_email': 'organizer_bravo@college.edu',
    'organizer_name': 'Organizer Bravo',
    'fee': '₹300/team',
    'game': 'Valorant',
    'status': 'Registering',
}

# Register in memory tournaments list
for t in [TOURNAMENT_A, TOURNAMENT_B]:
    matched = False
    for existing in IN_MEMORY_TOURNAMENTS:
        if existing.get('slug') == t['slug']:
            existing.update(t)
            matched = True
            break
    if not matched:
        IN_MEMORY_TOURNAMENTS.append(t)

# Attempt to sync to Supabase if accessible
try:
    sb = get_supabase_client()
    for t in [TOURNAMENT_A, TOURNAMENT_B]:
        sb.table('tournaments').upsert(t, on_conflict='slug').execute()
except Exception as e:
    print(f"[TEST SETUP] Supabase tournament seed notice: {e}")

TEST_RESULTS = []

def record_test(code, title, passed, details=""):
    status = "PASS" if passed else "FAIL"
    TEST_RESULTS.append({
        'code': code,
        'title': title,
        'status': status,
        'details': details
    })
    print(f"[{status}] Test {code:02d}: {title} -> {details}")

def make_test_order(order_id, tournament_slug, status='PENDING', amount_paise=50000,
                    method='MANUAL_UPI', utr_id='UTR123456789',
                    screenshot='orders/test/shot.png', reg_payload=None):
    if reg_payload is None:
        reg_payload = {
            'team_name': 'Alpha Team',
            'college': 'Esports University',
            'captain_name': 'Captain Alpha',
            'captain_email': 'captain@college.edu',
            'players': [{'name': 'Player 1'}, {'name': 'Player 2'}, {'name': 'Player 3'}, {'name': 'Player 4'}],
            'tournament_slug': tournament_slug
        }

    order = {
        'order_id': order_id,
        'payment_id': order_id,
        'tournament_slug': tournament_slug,
        'amount_paise': amount_paise,
        'currency': 'INR',
        'status': status,
        'payment_method': method,
        'payment_phone_number': '9876543210',
        'utr_id': utr_id,
        'screenshot_path': screenshot,
        'registration_payload': reg_payload,
        'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }

    # Save to in-memory store
    IN_MEMORY_PAYMENT_ORDERS[order_id] = dict(order)

    # Attempt save to Supabase
    try:
        sb = get_supabase_client()
        sb.table('payment_orders').upsert(order, on_conflict='order_id').execute()
    except Exception as e:
        pass

    return order

print("=" * 75)
print("PHASE 4A: MANUAL UPI ORGANIZER VERIFICATION SUITE (TESTS 1 - 22)")
print("=" * 75)

# --------------------------------------------------------------------------
# Test 01: Unauthenticated verify -> 401
# --------------------------------------------------------------------------
oid_01 = f"UPI_T01_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_01, 'tourn-alpha-phase4a')
res_01 = client.post(f'/api/payments/manual/{oid_01}/verify', headers=HEADERS_UNAUTH)
record_test(1, "Unauthenticated verify rejected", res_01.status_code == 401, f"HTTP {res_01.status_code}")

# --------------------------------------------------------------------------
# Test 02: PLAYER verify -> 403
# --------------------------------------------------------------------------
res_02 = client.post(f'/api/payments/manual/{oid_01}/verify', headers=HEADERS_PLAYER)
record_test(2, "PLAYER verify forbidden", res_02.status_code == 403, f"HTTP {res_02.status_code}")

# --------------------------------------------------------------------------
# Test 03: Unauthenticated reject -> 401
# --------------------------------------------------------------------------
oid_03 = f"UPI_T03_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_03, 'tourn-alpha-phase4a')
res_03 = client.post(f'/api/payments/manual/{oid_03}/reject', headers=HEADERS_UNAUTH, json={'reason': 'Invalid screenshot'})
record_test(3, "Unauthenticated reject rejected", res_03.status_code == 401, f"HTTP {res_03.status_code}")

# --------------------------------------------------------------------------
# Test 04: PLAYER reject -> 403
# --------------------------------------------------------------------------
res_04 = client.post(f'/api/payments/manual/{oid_03}/reject', headers=HEADERS_PLAYER, json={'reason': 'Invalid screenshot'})
record_test(4, "PLAYER reject forbidden", res_04.status_code == 403, f"HTTP {res_04.status_code}")

# --------------------------------------------------------------------------
# Test 05: Organizer can verify own tournament -> 200 VERIFIED
# --------------------------------------------------------------------------
oid_05 = f"UPI_T05_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_05, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000)
res_05 = client.post(f'/api/payments/manual/{oid_05}/verify', headers=HEADERS_ORG_A)
data_05 = res_05.get_json() or {}
record_test(5, "Organizer can verify own tournament",
            res_05.status_code == 200 and data_05.get('status') == 'VERIFIED',
            f"HTTP {res_05.status_code}, status={data_05.get('status')}")

# --------------------------------------------------------------------------
# Test 06: Organizer cannot verify another organizer's tournament -> 403
# --------------------------------------------------------------------------
oid_06 = f"UPI_T06_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_06, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000)
res_06 = client.post(f'/api/payments/manual/{oid_06}/verify', headers=HEADERS_ORG_B)
record_test(6, "Organizer cannot verify another organizer's tournament",
            res_06.status_code == 403, f"HTTP {res_06.status_code}")

# --------------------------------------------------------------------------
# Test 07: ADMIN can verify any tournament -> 200
# --------------------------------------------------------------------------
oid_07 = f"UPI_T07_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_07, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000)
res_07 = client.post(f'/api/payments/manual/{oid_07}/verify', headers=HEADERS_ADMIN)
data_07 = res_07.get_json() or {}
record_test(7, "ADMIN can verify any tournament",
            res_07.status_code == 200 and data_07.get('status') == 'VERIFIED',
            f"HTTP {res_07.status_code}, status={data_07.get('status')}")

# --------------------------------------------------------------------------
# Test 08: Organizer can reject own tournament -> 200 REJECTED
# --------------------------------------------------------------------------
oid_08 = f"UPI_T08_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_08, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000)
res_08 = client.post(f'/api/payments/manual/{oid_08}/reject', headers=HEADERS_ORG_A, json={'reason': 'UTR does not match payment proof.'})
data_08 = res_08.get_json() or {}
record_test(8, "Organizer can reject own tournament",
            res_08.status_code == 200 and data_08.get('status') == 'REJECTED',
            f"HTTP {res_08.status_code}, status={data_08.get('status')}")

# --------------------------------------------------------------------------
# Test 09: Organizer cannot reject another organizer's tournament -> 403
# --------------------------------------------------------------------------
oid_09 = f"UPI_T09_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_09, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000)
res_09 = client.post(f'/api/payments/manual/{oid_09}/reject', headers=HEADERS_ORG_B, json={'reason': 'Fraudulent screenshot.'})
record_test(9, "Organizer cannot reject another organizer's tournament",
            res_09.status_code == 403, f"HTTP {res_09.status_code}")

# --------------------------------------------------------------------------
# Test 10: Razorpay cannot use Manual UPI endpoints -> 400
# --------------------------------------------------------------------------
oid_10 = f"order_RZP_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_10, 'tourn-alpha-phase4a', status='PENDING', method='RAZORPAY')
res_10 = client.post(f'/api/payments/manual/{oid_10}/verify', headers=HEADERS_ORG_A)
record_test(10, "Razorpay cannot use Manual UPI endpoints",
            res_10.status_code == 400, f"HTTP {res_10.status_code}")

# --------------------------------------------------------------------------
# Test 11: Only MANUAL_UPI accepted -> 400
# --------------------------------------------------------------------------
oid_11 = f"UPI_T11_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_11, 'tourn-alpha-phase4a', status='PENDING', method='CRYPTO')
res_11 = client.post(f'/api/payments/manual/{oid_11}/verify', headers=HEADERS_ORG_A)
record_test(11, "Only MANUAL_UPI accepted",
            res_11.status_code == 400, f"HTTP {res_11.status_code}")

# --------------------------------------------------------------------------
# Test 12: Only PENDING can be verified (DUPLICATE_REVIEW -> 409, other -> 400)
# --------------------------------------------------------------------------
oid_12a = f"UPI_T12A_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_12a, 'tourn-alpha-phase4a', status='DUPLICATE_REVIEW', amount_paise=50000)
res_12a = client.post(f'/api/payments/manual/{oid_12a}/verify', headers=HEADERS_ORG_A)

oid_12b = f"UPI_T12B_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_12b, 'tourn-alpha-phase4a', status='CREATED', amount_paise=50000)
res_12b = client.post(f'/api/payments/manual/{oid_12b}/verify', headers=HEADERS_ORG_A)

t12_pass = (res_12a.status_code == 409 and res_12b.status_code == 400)
record_test(12, "Only PENDING can be verified (DUPLICATE_REVIEW blocked)",
            t12_pass, f"DUPLICATE_REVIEW HTTP {res_12a.status_code}, CREATED HTTP {res_12b.status_code}")

# --------------------------------------------------------------------------
# Test 13: Only PENDING can be rejected (DUPLICATE_REVIEW -> 409, other -> 400)
# --------------------------------------------------------------------------
oid_13a = f"UPI_T13A_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_13a, 'tourn-alpha-phase4a', status='DUPLICATE_REVIEW', amount_paise=50000)
res_13a = client.post(f'/api/payments/manual/{oid_13a}/reject', headers=HEADERS_ORG_A, json={'reason': 'Duplicate issue'})

oid_13b = f"UPI_T13B_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_13b, 'tourn-alpha-phase4a', status='CREATED', amount_paise=50000)
res_13b = client.post(f'/api/payments/manual/{oid_13b}/reject', headers=HEADERS_ORG_A, json={'reason': 'Not pending'})

t13_pass = (res_13a.status_code == 409 and res_13b.status_code == 400)
record_test(13, "Only PENDING can be rejected (DUPLICATE_REVIEW blocked)",
            t13_pass, f"DUPLICATE_REVIEW HTTP {res_13a.status_code}, CREATED HTTP {res_13b.status_code}")

# --------------------------------------------------------------------------
# Test 14: DB amount rechecked (Mismatched amount blocks verify -> 400)
# --------------------------------------------------------------------------
oid_14 = f"UPI_T14_{uuid.uuid4().hex[:6].upper()}"
# DB fee is 50000 paise (₹500), but stored amount is manipulated to 100 paise
make_test_order(oid_14, 'tourn-alpha-phase4a', status='PENDING', amount_paise=100)
res_14 = client.post(f'/api/payments/manual/{oid_14}/verify', headers=HEADERS_ORG_A)
record_test(14, "DB amount rechecked (Mismatched amount blocks verify)",
            res_14.status_code == 400, f"HTTP {res_14.status_code}")

# --------------------------------------------------------------------------
# Test 15: Missing UTR blocks verification -> 400
# --------------------------------------------------------------------------
oid_15 = f"UPI_T15_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_15, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000, utr_id='')
res_15 = client.post(f'/api/payments/manual/{oid_15}/verify', headers=HEADERS_ORG_A)
record_test(15, "Missing UTR blocks verification",
            res_15.status_code == 400, f"HTTP {res_15.status_code}")

# --------------------------------------------------------------------------
# Test 16: Missing screenshot blocks verification -> 400
# --------------------------------------------------------------------------
oid_16 = f"UPI_T16_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_16, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000, screenshot='')
res_16 = client.post(f'/api/payments/manual/{oid_16}/verify', headers=HEADERS_ORG_A)
record_test(16, "Missing screenshot blocks verification",
            res_16.status_code == 400, f"HTTP {res_16.status_code}")

# --------------------------------------------------------------------------
# Test 17: Missing registration payload blocks verification -> 400
# --------------------------------------------------------------------------
oid_17 = f"UPI_T17_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_17, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000, reg_payload={})
res_17 = client.post(f'/api/payments/manual/{oid_17}/verify', headers=HEADERS_ORG_A)
record_test(17, "Missing registration payload blocks verification",
            res_17.status_code == 400, f"HTTP {res_17.status_code}")

# --------------------------------------------------------------------------
# Test 18: Rejection reason required -> 400
# --------------------------------------------------------------------------
oid_18 = f"UPI_T18_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_18, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000)
res_18 = client.post(f'/api/payments/manual/{oid_18}/reject', headers=HEADERS_ORG_A, json={'reason': '   '})
record_test(18, "Rejection reason required",
            res_18.status_code == 400, f"HTTP {res_18.status_code}")

# --------------------------------------------------------------------------
# Test 19: Verified cannot be rejected -> 409
# --------------------------------------------------------------------------
oid_19 = f"UPI_T19_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_19, 'tourn-alpha-phase4a', status='VERIFIED', amount_paise=50000)
res_19 = client.post(f'/api/payments/manual/{oid_19}/reject', headers=HEADERS_ORG_A, json={'reason': 'Cannot reject already verified'})
record_test(19, "Verified cannot be rejected",
            res_19.status_code == 409, f"HTTP {res_19.status_code}")

# --------------------------------------------------------------------------
# Test 20: Rejected cannot be verified -> 409
# --------------------------------------------------------------------------
oid_20 = f"UPI_T20_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_20, 'tourn-alpha-phase4a', status='REJECTED', amount_paise=50000)
res_20 = client.post(f'/api/payments/manual/{oid_20}/verify', headers=HEADERS_ORG_A)
record_test(20, "Rejected cannot be verified",
            res_20.status_code == 409, f"HTTP {res_20.status_code}")

# --------------------------------------------------------------------------
# Test 21: Repeated verify is safe (idempotent 200)
# --------------------------------------------------------------------------
oid_21 = f"UPI_T21_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_21, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000)
# First verify
res_21a = client.post(f'/api/payments/manual/{oid_21}/verify', headers=HEADERS_ORG_A)
# Second verify (repeated)
res_21b = client.post(f'/api/payments/manual/{oid_21}/verify', headers=HEADERS_ORG_A)
data_21b = res_21b.get_json() or {}
t21_pass = (res_21a.status_code == 200 and res_21b.status_code == 200 and data_21b.get('already_verified') is True)
record_test(21, "Repeated verify is safe (idempotent)",
            t21_pass, f"First: HTTP {res_21a.status_code}, Repeated: HTTP {res_21b.status_code}, already_verified={data_21b.get('already_verified')}")

# --------------------------------------------------------------------------
# Test 22: Repeated reject is safe (idempotent 200)
# --------------------------------------------------------------------------
oid_22 = f"UPI_T22_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_22, 'tourn-alpha-phase4a', status='PENDING', amount_paise=50000)
# First reject
res_22a = client.post(f'/api/payments/manual/{oid_22}/reject', headers=HEADERS_ORG_A, json={'reason': 'Incorrect UTR'})
# Second reject (repeated)
res_22b = client.post(f'/api/payments/manual/{oid_22}/reject', headers=HEADERS_ORG_A, json={'reason': 'Incorrect UTR again'})
data_22b = res_22b.get_json() or {}
t22_pass = (res_22a.status_code == 200 and res_22b.status_code == 200 and data_22b.get('already_rejected') is True)
record_test(22, "Repeated reject is safe (idempotent)",
            t22_pass, f"First: HTTP {res_22a.status_code}, Repeated: HTTP {res_22b.status_code}, already_rejected={data_22b.get('already_rejected')}")

print("=" * 75)
passed_count = sum(1 for r in TEST_RESULTS if r['status'] == 'PASS')
total_count = len(TEST_RESULTS)
print(f"SUMMARY: {passed_count} PASSED, {total_count - passed_count} FAILED (TOTAL {total_count})")
print("=" * 75)

if passed_count != total_count:
    sys.exit(1)
