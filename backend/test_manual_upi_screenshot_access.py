import sys
import os
import time
import json
import uuid

# Set test environment flags
os.environ['TEST_MODE'] = 'true'
os.environ['MOCK_STORAGE'] = 'true'
os.environ['APP_ENV'] = 'testing'

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

# Test tournaments
TOURNAMENT_A = {
    'slug': 'tourn-alpha-phase4c',
    'title': 'Tournament Alpha Phase 4C',
    'host': 'Organizer Alpha',
    'organizer_email': 'organizer_alpha@college.edu',
    'organizer_name': 'Organizer Alpha',
    'fee': '₹500/team',
    'game': 'BGMI',
    'status': 'Registering',
}

TOURNAMENT_B = {
    'slug': 'tourn-bravo-phase4c',
    'title': 'Tournament Bravo Phase 4C',
    'host': 'Organizer Bravo',
    'organizer_email': 'organizer_bravo@college.edu',
    'organizer_name': 'Organizer Bravo',
    'fee': '₹300/team',
    'game': 'Valorant',
    'status': 'Registering',
}

for t in [TOURNAMENT_A, TOURNAMENT_B]:
    matched = False
    for existing in IN_MEMORY_TOURNAMENTS:
        if existing.get('slug') == t['slug']:
            existing.update(t)
            matched = True
            break
    if not matched:
        IN_MEMORY_TOURNAMENTS.append(t)

try:
    sb = get_supabase_client()
    for t in [TOURNAMENT_A, TOURNAMENT_B]:
        try:
            sb.table('tournaments').insert(t).execute()
        except Exception:
            pass
except Exception:
    pass

TEST_RESULTS = []

def record_test(num, title, passed, details=""):
    status = "PASS" if passed else "FAIL"
    TEST_RESULTS.append({
        'num': num,
        'title': title,
        'status': status,
        'details': details
    })
    print(f"[{status}] Test {num:02d}: {title} -> {details}")

print("=" * 80)
print("PHASE 4C: MANUAL UPI SECURE SCREENSHOT ACCESS BACKEND SUITE")
print("=" * 80)

# Create test orders
PAYMENT_ID_A = f"UPI_4C_A_{uuid.uuid4().hex[:6].upper()}"
PAYMENT_ORDER_A = {
    'order_id': PAYMENT_ID_A,
    'payment_id': PAYMENT_ID_A,
    'tournament_slug': 'tourn-alpha-phase4c',
    'user_id': 'usr-player-1001',
    'email': 'player_test@college.edu',
    'amount_paise': 50000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4C{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-alpha-phase4c/proof_alpha_01.png',
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

# Order with missing screenshot
PAYMENT_ID_NO_SS = f"UPI_4C_NOSS_{uuid.uuid4().hex[:6].upper()}"
PAYMENT_ORDER_NO_SS = {
    'order_id': PAYMENT_ID_NO_SS,
    'payment_id': PAYMENT_ID_NO_SS,
    'tournament_slug': 'tourn-alpha-phase4c',
    'user_id': 'usr-player-1001',
    'email': 'player_test@college.edu',
    'amount_paise': 50000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4C{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': None,
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

# Order with empty string screenshot
PAYMENT_ID_EMPTY_SS = f"UPI_4C_EMPSS_{uuid.uuid4().hex[:6].upper()}"
PAYMENT_ORDER_EMPTY_SS = {
    'order_id': PAYMENT_ID_EMPTY_SS,
    'payment_id': PAYMENT_ID_EMPTY_SS,
    'tournament_slug': 'tourn-alpha-phase4c',
    'user_id': 'usr-player-1001',
    'email': 'player_test@college.edu',
    'amount_paise': 50000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4C{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': '   ',
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

# Razorpay order (non-manual)
PAYMENT_ID_RAZORPAY = f"order_rzp_{uuid.uuid4().hex[:8]}"
PAYMENT_ORDER_RAZORPAY = {
    'order_id': PAYMENT_ID_RAZORPAY,
    'payment_id': f"pay_rzp_{uuid.uuid4().hex[:8]}",
    'tournament_slug': 'tourn-alpha-phase4c',
    'user_id': 'usr-player-1001',
    'email': 'player_test@college.edu',
    'amount_paise': 50000,
    'currency': 'INR',
    'status': 'PAID',
    'payment_method': 'RAZORPAY',
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

# Order for Tournament B
PAYMENT_ID_B = f"UPI_4C_B_{uuid.uuid4().hex[:6].upper()}"
PAYMENT_ORDER_B = {
    'order_id': PAYMENT_ID_B,
    'payment_id': PAYMENT_ID_B,
    'tournament_slug': 'tourn-bravo-phase4c',
    'user_id': 'usr-player-1001',
    'email': 'player_test@college.edu',
    'amount_paise': 30000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4C{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-bravo-phase4c/proof_bravo_01.png',
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

# Register all orders in memory
for o in [PAYMENT_ORDER_A, PAYMENT_ORDER_NO_SS, PAYMENT_ORDER_EMPTY_SS, PAYMENT_ORDER_RAZORPAY, PAYMENT_ORDER_B]:
    IN_MEMORY_PAYMENT_ORDERS[o['order_id']] = o

try:
    sb = get_supabase_client()
    for o in [PAYMENT_ORDER_A, PAYMENT_ORDER_NO_SS, PAYMENT_ORDER_EMPTY_SS, PAYMENT_ORDER_RAZORPAY, PAYMENT_ORDER_B]:
        try:
            sb.table('payment_orders').insert(o).execute()
        except Exception:
            pass
except Exception:
    pass

# ==============================================================================
# TEST 1: Unauthenticated request -> 401
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_A}/screenshot", headers=HEADERS_UNAUTH)
passed = res.status_code == 401 and res.json.get('success') is False
record_test(1, "Unauthenticated request rejected with 401", passed, f"status={res.status_code}, msg={res.json.get('message')}")

# ==============================================================================
# TEST 2: Unauthorized player request -> 403
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_A}/screenshot", headers=HEADERS_PLAYER)
passed = res.status_code == 403 and res.json.get('success') is False
record_test(2, "Unauthorized player request rejected with 403", passed, f"status={res.status_code}, msg={res.json.get('message')}")

# ==============================================================================
# TEST 3: Authorized organizer -> 200 with signed URL
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_A}/screenshot", headers=HEADERS_ORG_A)
data = res.json or {}
signed_url = data.get('signedUrl', '')
passed = (res.status_code == 200 and 
          data.get('success') is True and 
          bool(signed_url) and 
          'token=' in signed_url)
record_test(3, "Authorized organizer gets 200 with signed URL", passed, f"status={res.status_code}, signedUrl={signed_url[:55]}...")

# ==============================================================================
# TEST 4: Authorized admin -> 200 with signed URL
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_A}/screenshot", headers=HEADERS_ADMIN)
data = res.json or {}
signed_url = data.get('signedUrl', '')
passed = (res.status_code == 200 and 
          data.get('success') is True and 
          bool(signed_url) and 
          'token=' in signed_url)
record_test(4, "Authorized admin gets 200 with signed URL", passed, f"status={res.status_code}, signedUrl={signed_url[:55]}...")

# ==============================================================================
# TEST 5: Organizer for another tournament -> 403
# ==============================================================================
# Organizer B attempts to view screenshot for Tournament A
res = client.get(f"/api/payments/manual/{PAYMENT_ID_A}/screenshot", headers=HEADERS_ORG_B)
passed = res.status_code == 403 and res.json.get('success') is False
record_test(5, "Organizer for another tournament rejected with 403", passed, f"status={res.status_code}, msg={res.json.get('message')}")

# ==============================================================================
# TEST 6: Nonexistent payment -> 404
# ==============================================================================
res = client.get("/api/payments/manual/NONEXISTENT_ORDER_99999/screenshot", headers=HEADERS_ORG_A)
passed = res.status_code == 404 and res.json.get('success') is False
record_test(6, "Nonexistent payment order returns 404", passed, f"status={res.status_code}, msg={res.json.get('message')}")

# ==============================================================================
# TEST 7: Payment with missing screenshot (None) -> 404
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_NO_SS}/screenshot", headers=HEADERS_ORG_A)
passed = res.status_code == 404 and res.json.get('success') is False
record_test(7, "Payment with None screenshot_path returns 404", passed, f"status={res.status_code}, msg={res.json.get('message')}")

# ==============================================================================
# TEST 8: Payment with empty string screenshot -> 404
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_EMPTY_SS}/screenshot", headers=HEADERS_ORG_A)
passed = res.status_code == 404 and res.json.get('success') is False
record_test(8, "Payment with empty string screenshot_path returns 404", passed, f"status={res.status_code}, msg={res.json.get('message')}")

# ==============================================================================
# TEST 9: Non-Manual UPI payment (Razorpay) -> 400
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_RAZORPAY}/screenshot", headers=HEADERS_ORG_A)
passed = res.status_code == 400 and res.json.get('success') is False
record_test(9, "Non-Manual UPI payment rejected with 400", passed, f"status={res.status_code}, msg={res.json.get('message')}")

# ==============================================================================
# TEST 10: Signed URL is short-lived (~300s expiration)
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_A}/screenshot", headers=HEADERS_ORG_A)
data = res.json or {}
expires_in = data.get('expiresIn')
passed = res.status_code == 200 and expires_in == 300
record_test(10, "Signed URL is short-lived (expiresIn = 300 seconds)", passed, f"expiresIn={expires_in}")

# ==============================================================================
# TEST 11: Raw internal storage path is NOT exposed in response
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_A}/screenshot", headers=HEADERS_ORG_A)
data = res.json or {}
has_raw_path = 'screenshot_path' in data or 'raw_path' in data
passed = res.status_code == 200 and not has_raw_path and 'signedUrl' in data
record_test(11, "Raw internal storage path not exposed in response", passed, f"keys={list(data.keys())}")

# ==============================================================================
# TEST 12: Admin can access Tournament B payment screenshot
# ==============================================================================
res = client.get(f"/api/payments/manual/{PAYMENT_ID_B}/screenshot", headers=HEADERS_ADMIN)
data = res.json or {}
passed = res.status_code == 200 and bool(data.get('signedUrl'))
record_test(12, "Admin can access Tournament B payment screenshot", passed, f"status={res.status_code}")

print("=" * 80)
total_tests = len(TEST_RESULTS)
passed_tests = sum(1 for t in TEST_RESULTS if t['status'] == 'PASS')
failed_tests = total_tests - passed_tests
print(f"SUMMARY: {passed_tests} PASSED, {failed_tests} FAILED (TOTAL {total_tests})")
print("=" * 80)

if failed_tests > 0:
    sys.exit(1)
sys.exit(0)
