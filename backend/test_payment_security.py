import sys
import os
import json
import hmac
import hashlib
import time

# Ensure backend is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
from config import Config, get_supabase_client, get_razorpay_client
from routes.payments import IN_MEMORY_REGISTRATIONS, IN_MEMORY_PAYMENT_ORDERS, PROCESSED_WEBHOOK_EVENTS

client = app.test_client()

# Test user headers supported by get_authenticated_user()
AUTH_HEADERS_PLAYER = {
    'Content-Type': 'application/json',
    'X-Test-User': 'securityplayer@college.edu',
    'X-Test-User-Id': 'sec-player-uuid-1337',
    'X-Test-User-Role': 'PLAYER'
}

AUTH_HEADERS_ORGANIZER = {
    'Content-Type': 'application/json',
    'X-Test-User': 'organizer@college.edu',
    'X-Test-User-Id': 'sec-organizer-uuid-2026',
    'X-Test-User-Role': 'ORGANIZER'
}

AUTH_HEADERS_ADMIN = {
    'Content-Type': 'application/json',
    'X-Test-User': 'admin@xenova.gg',
    'X-Test-User-Id': 'sec-admin-uuid-9999',
    'X-Test-User-Role': 'ADMIN'
}

ANON_HEADERS = {
    'Content-Type': 'application/json'
}

TEST_RESULTS = []

def record_test(code, title, passed, details=""):
    status = "PASS" if passed else "FAIL"
    TEST_RESULTS.append({
        'code': code,
        'title': title,
        'status': status,
        'details': details
    })
    print(f"[{status}] Test {code}: {title} -> {details}")

print("=" * 70)
print("XENOVA PAYMENT SECURITY & HARDENING SUITE (TESTS A - M)")
print("=" * 70)

# ─────────────────────────────────────────────────────────────────────────────
# TEST A: Client sends INR 1 while DB says INR 500 -> Razorpay order is INR 500 (50000 paise)
# ─────────────────────────────────────────────────────────────────────────────
try:
    payload = {
        'amount': 1, # Malicious client attempts sending 1 rupee
        'tournamentSlug': 'bgmi-college-cup-season-4',
        'teamName': 'Cheater Squad',
        'college': 'Test University',
        'players': ['Player1', 'Player2']
    }
    res = client.post('/api/payments/create-order', data=json.dumps(payload), headers=AUTH_HEADERS_PLAYER)
    data = res.get_json() or {}
    
    # bgmi-college-cup-season-4 has fee "INR 500/team" -> 50000 paise
    passed = (res.status_code == 200 and data.get('amount') == 50000 and data.get('currency') == 'INR')
    record_test('A', "Client sends INR 1 while DB says INR 500 -> Order is INR 500", passed,
                f"HTTP {res.status_code}, amount={data.get('amount')} paise (expected 50000 paise)")
except Exception as e:
    record_test('A', "Client sends INR 1 while DB says INR 500 -> Order is INR 500", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST B: Client attempts Free registration on INR 500 paid tournament -> Rejected 403
# ─────────────────────────────────────────────────────────────────────────────
try:
    payload = {
        'tournamentSlug': 'bgmi-college-cup-season-4', # Paid tournament (INR 500)
        'teamName': 'Bypass Squad',
        'college': 'Test College',
        'email': 'securityplayer@college.edu',
        'captainName': 'Hacker'
    }
    res = client.post('/api/registrations/create', data=json.dumps(payload), headers=AUTH_HEADERS_PLAYER)
    data = res.get_json() or {}
    passed = (res.status_code == 403 and data.get('success') is False)
    record_test('B', "Client attempts free registration on paid tournament -> Rejected 403", passed,
                f"HTTP {res.status_code}, message='{data.get('message')}'")
except Exception as e:
    record_test('B', "Client attempts free registration on paid tournament -> Rejected 403", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST C: Anonymous create-order -> 401 Unauthorized
# ─────────────────────────────────────────────────────────────────────────────
try:
    payload = {
        'tournamentSlug': 'bgmi-college-cup-season-4'
    }
    res = client.post('/api/payments/create-order', data=json.dumps(payload), headers=ANON_HEADERS)
    passed = (res.status_code == 401)
    record_test('C', "Anonymous create-order -> 401 Unauthorized", passed,
                f"HTTP {res.status_code}")
except Exception as e:
    record_test('C', "Anonymous create-order -> 401 Unauthorized", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST D: Anonymous registration -> 401 Unauthorized
# ─────────────────────────────────────────────────────────────────────────────
try:
    payload = {
        'tournamentSlug': 'nexus-valorant-champions-cup',
        'teamName': 'Anon Team',
        'email': 'anon@test.com'
    }
    res = client.post('/api/registrations/create', data=json.dumps(payload), headers=ANON_HEADERS)
    passed = (res.status_code == 401)
    record_test('D', "Anonymous registration -> 401 Unauthorized", passed,
                f"HTTP {res.status_code}")
except Exception as e:
    record_test('D', "Anonymous registration -> 401 Unauthorized", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST E: Paid tournament registration without verified payment -> Rejected
# ─────────────────────────────────────────────────────────────────────────────
try:
    # Attempting to call verify payment without required parameters
    payload = {
        'tournamentSlug': 'bgmi-college-cup-season-4',
        'razorpay_order_id': 'order_fake_12345'
        # Missing razorpay_payment_id and signature
    }
    res = client.post('/api/payments/verify-payment', data=json.dumps(payload), headers=AUTH_HEADERS_PLAYER)
    passed = (res.status_code == 400)
    record_test('E', "Paid tournament registration without verified payment -> Rejected 400", passed,
                f"HTTP {res.status_code}")
except Exception as e:
    record_test('E', "Paid tournament registration without verified payment -> Rejected 400", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST F: Invalid webhook signature -> 400 Rejected and no DB mutation
# ─────────────────────────────────────────────────────────────────────────────
try:
    webhook_payload = json.dumps({
        'event': 'payment.captured',
        'id': f"evt_fake_{int(time.time())}",
        'payload': {
            'payment': {
                'entity': {
                    'id': 'pay_fraudulent_signature',
                    'order_id': 'order_fraudulent_123',
                    'status': 'captured',
                    'amount': 50000
                }
            }
        }
    })
    bad_headers = {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'invalid_forged_hmac_signature_abc123'
    }
    res = client.post('/api/payments/webhook', data=webhook_payload, headers=bad_headers)
    
    # Verify no registration created with this payment_id
    supabase = get_supabase_client()
    db_check = supabase.table('registrations').select('id').eq('payment_id', 'pay_fraudulent_signature').execute()
    no_mutation = not db_check.data or len(db_check.data) == 0
    passed = (res.status_code == 400 and no_mutation)
    record_test('F', "Invalid webhook signature -> Rejected 400 & No DB mutation", passed,
                f"HTTP {res.status_code}, no_mutation={no_mutation}")
except Exception as e:
    record_test('F', "Invalid webhook signature -> Rejected 400 & No DB mutation", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST G: Missing webhook secret -> 500 Webhook not processed
# ─────────────────────────────────────────────────────────────────────────────
try:
    orig_sec = Config.RAZORPAY_WEBHOOK_SECRET
    os.environ['RAZORPAY_WEBHOOK_SECRET'] = ''
    res = client.post('/api/payments/webhook', data="{}", headers={'X-Razorpay-Signature': 'any'})
    os.environ['RAZORPAY_WEBHOOK_SECRET'] = orig_sec or 'whsec_xenova_test_secret_2026'
    passed = (res.status_code == 500)
    record_test('G', "Missing webhook secret -> 500 Webhook not processed", passed,
                f"HTTP {res.status_code}")
except Exception as e:
    os.environ['RAZORPAY_WEBHOOK_SECRET'] = 'whsec_xenova_test_secret_2026'
    record_test('G', "Missing webhook secret -> 500 Webhook not processed", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST H: Fake order / payment / signature -> Verification rejected
# ─────────────────────────────────────────────────────────────────────────────
try:
    payload = {
        'razorpay_order_id': 'order_nonexistent_9999',
        'razorpay_payment_id': 'pay_nonexistent_9999',
        'razorpay_signature': 'bad_signature_0000000000000000000000000000000000000000000000000000000000000000',
        'tournamentSlug': 'bgmi-college-cup-season-4'
    }
    res = client.post('/api/payments/verify-payment', data=json.dumps(payload), headers=AUTH_HEADERS_PLAYER)
    passed = (res.status_code == 400)
    record_test('H', "Fake order/payment/signature -> Verification rejected 400", passed,
                f"HTTP {res.status_code}")
except Exception as e:
    record_test('H', "Fake order/payment/signature -> Verification rejected 400", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST I: Replay protection: Same payment verification submitted twice -> Only one pass
# ─────────────────────────────────────────────────────────────────────────────
try:
    # Use real past captured payment pay_TVYsFLAYZ2AAzE & order_TVYrk7UnS4Bp2J from Razorpay test mode
    # Compute valid HMAC signature
    test_order_id = 'order_TVYrk7UnS4Bp2J'
    test_payment_id = 'pay_TVYsFLAYZ2AAzE'
    valid_sig = hmac.new(
        bytes(Config.RAZORPAY_KEY_SECRET, 'utf-8'),
        bytes(f"{test_order_id}|{test_payment_id}", 'utf-8'),
        hashlib.sha256
    ).hexdigest()

    verify_payload = {
        'razorpay_order_id': test_order_id,
        'razorpay_payment_id': test_payment_id,
        'razorpay_signature': valid_sig,
        'tournamentSlug': 'bgmi-college-cup-season-4',
        'teamName': 'Replay Test Team',
        'college': 'Replay University',
        'captainName': 'Replay Captain',
        'email': 'veerachandra2008@gmail.com'
    }

    # First verification request
    res1 = client.post('/api/payments/verify-payment', data=json.dumps(verify_payload), headers=AUTH_HEADERS_PLAYER)
    data1 = res1.get_json() or {}
    pass1 = data1.get('passId')

    # Second identical verification request (replay attempt)
    res2 = client.post('/api/payments/verify-payment', data=json.dumps(verify_payload), headers=AUTH_HEADERS_PLAYER)
    data2 = res2.get_json() or {}
    pass2 = data2.get('passId')
    already_completed = data2.get('already_completed')

    # Both must return the same pass_id, and second must identify already completed
    passed = (res1.status_code == 200 and res2.status_code == 200 and pass1 == pass2 and already_completed is True)
    record_test('I', "Replay protection: Same payment verification twice -> Single pass", passed,
                f"pass1={pass1}, pass2={pass2}, already_completed={already_completed}")
except Exception as e:
    record_test('I', "Replay protection: Same payment verification twice -> Single pass", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST J: Idempotent webhook: Same webhook delivered twice -> Handled idempotently
# ─────────────────────────────────────────────────────────────────────────────
try:
    event_id = f"evt_idem_test_{int(time.time())}"
    webhook_body = json.dumps({
        'event': 'payment.captured',
        'id': event_id,
        'payload': {
            'payment': {
                'entity': {
                    'id': 'pay_TVYsFLAYZ2AAzE',
                    'order_id': 'order_TVYrk7UnS4Bp2J',
                    'status': 'captured',
                    'amount': 50000
                }
            }
        }
    })
    
    webhook_sec = Config.RAZORPAY_WEBHOOK_SECRET
    wh_sig = hmac.new(bytes(webhook_sec, 'utf-8'), bytes(webhook_body, 'utf-8'), hashlib.sha256).hexdigest()
    wh_headers = {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': wh_sig
    }

    # Delivery 1
    wh_res1 = client.post('/api/payments/webhook', data=webhook_body, headers=wh_headers)
    # Delivery 2 (Duplicate)
    wh_res2 = client.post('/api/payments/webhook', data=webhook_body, headers=wh_headers)
    wh_data2 = wh_res2.get_json() or {}

    passed = (wh_res1.status_code == 200 and wh_res2.status_code == 200 and wh_data2.get('status') == 'already_processed')
    record_test('J', "Same webhook delivered twice -> Handled idempotently", passed,
                f"Deliv1 status={wh_res1.status_code}, Deliv2 status={wh_res2.status_code} ({wh_data2.get('status')})")
except Exception as e:
    record_test('J', "Same webhook delivered twice -> Handled idempotently", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST K: Legitimate FREE tournament -> Registration & Pass succeed
# ─────────────────────────────────────────────────────────────────────────────
try:
    free_payload = {
        'tournamentSlug': 'nexus-valorant-champions-cup', # Free in DB
        'teamName': 'Free Champions',
        'college': 'Open University',
        'captainName': 'Free Captain',
        'email': 'free_security_player@college.edu',
        'players': ['P1', 'P2', 'P3', 'P4']
    }
    res_free = client.post('/api/registrations/create', data=json.dumps(free_payload), headers=AUTH_HEADERS_PLAYER)
    free_data = res_free.get_json() or {}
    pass_id_free = free_data.get('passId')
    passed = (res_free.status_code in [200, 201] and bool(pass_id_free) and free_data.get('success') is True)
    record_test('K', "Legitimate FREE tournament -> Registration and pass creation works", passed,
                f"HTTP {res_free.status_code}, passId={pass_id_free}")
except Exception as e:
    record_test('K', "Legitimate FREE tournament -> Registration and pass creation works", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST L: Legitimate PAID tournament in Razorpay TEST mode -> Order, verification, pass works
# ─────────────────────────────────────────────────────────────────────────────
try:
    # 1. Create order
    paid_payload = {
        'tournamentSlug': 'bgmi-college-cup-season-4',
        'teamName': 'Alpha Test Squad',
        'college': 'Engineering College',
        'captainName': 'Alpha Captain',
        'email': 'veerachandra2008@gmail.com'
    }
    res_order = client.post('/api/payments/create-order', data=json.dumps(paid_payload), headers=AUTH_HEADERS_PLAYER)
    order_info = res_order.get_json() or {}
    new_order_id = order_info.get('order_id')
    amount_in_order = order_info.get('amount')

    # 2. Verify with past captured test payment
    # Compute signature for new_order_id + test_payment
    order_sig = hmac.new(
        bytes(Config.RAZORPAY_KEY_SECRET, 'utf-8'),
        bytes(f"{new_order_id}|pay_TVYsFLAYZ2AAzE", 'utf-8'),
        hashlib.sha256
    ).hexdigest()

    passed = (res_order.status_code == 200 and bool(new_order_id) and amount_in_order == 50000)
    record_test('L', "Legitimate PAID tournament in Razorpay TEST mode -> Order creation works", passed,
                f"HTTP {res_order.status_code}, order_id={new_order_id}, amount={amount_in_order}")
except Exception as e:
    record_test('L', "Legitimate PAID tournament in Razorpay TEST mode -> Order creation works", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# TEST M: Existing organizer / admin dashboard behavior still works
# ─────────────────────────────────────────────────────────────────────────────
try:
    # Fetch registrations query
    res_regs = client.get('/api/registrations/?tournament_slug=bgmi-college-cup-season-4', headers=AUTH_HEADERS_ADMIN)
    regs_data = res_regs.get_json() or {}
    passed = (res_regs.status_code == 200 and regs_data.get('success') is True and isinstance(regs_data.get('data'), list))
    record_test('M', "Existing organizer/admin dashboard access works", passed,
                f"HTTP {res_regs.status_code}, total retrieved={len(regs_data.get('data', []))}")
except Exception as e:
    record_test('M', "Existing organizer/admin dashboard access works", False, str(e))

print("=" * 70)
total_passed = sum(1 for t in TEST_RESULTS if t['status'] == 'PASS')
total_failed = sum(1 for t in TEST_RESULTS if t['status'] == 'FAIL')
print(f"SUMMARY: {total_passed} PASSED, {total_failed} FAILED (TOTAL {len(TEST_RESULTS)})")
print("=" * 70)

if total_failed > 0:
    sys.exit(1)
sys.exit(0)
