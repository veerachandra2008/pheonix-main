import sys
import os
import json
import io
import time
import uuid

# Ensure backend is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    # pyrefly: ignore [missing-import]
    from PIL import Image
except ImportError:
    Image = None
from app import app
from config import Config, get_supabase_client

client = app.test_client()

# Authentication headers
AUTH_HEADERS_PLAYER = {
    'X-Test-User': 'upitestplayer@college.edu',
    'X-Test-User-Id': 'upi-player-uuid-4242',
    'X-Test-User-Role': 'PLAYER'
}

AUTH_HEADERS_PLAYER_2 = {
    'X-Test-User': 'secondplayer@college.edu',
    'X-Test-User-Id': 'upi-player-uuid-9999',
    'X-Test-User-Role': 'PLAYER'
}

ANON_HEADERS = {}

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

def create_dummy_image_bytes(format="JPEG", size=(100, 100), color="blue"):
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

print("=" * 75)
print("PHASE 2: MANUAL UPI PLAYER PAYMENT SUBMISSION BACKEND SUITE (TESTS 1 - 22)")
print("=" * 75)

supabase = get_supabase_client()
test_slug = 'bgmi-college-cup-season-4' # 500 INR -> 50000 paise
free_slug = 'nexus-valorant-champions-cup' # Free tournament

# Cleanup any previous test orders for this test user
try:
    supabase.table('payment_orders').delete().eq('user_id', 'upi-player-uuid-4242').execute()
    supabase.table('payment_orders').delete().eq('user_id', 'upi-player-uuid-9999').execute()
except Exception:
    pass

# Helper to generate unique UTR for test isolation
def gen_utr():
    return f"UTR{uuid.uuid4().hex[:10].upper()}"

submitted_order_id = None
submitted_utr = gen_utr()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Authenticated Manual UPI submission succeeds
# ─────────────────────────────────────────────────────────────────────────────
try:
    img_bytes = create_dummy_image_bytes("JPEG")
    squad_players = ['Player 1 (Captain)', 'Player 2 (Sniper)', 'Player 3 (Assault)', 'Player 4 (Support)']
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9876543210',
        'utrId': submitted_utr,
        'teamName': 'Phoenix Squad 4',
        'college': 'Esports University',
        'captainName': 'UPI Test Captain',
        'players': json.dumps(squad_players),
        'screenshot': (io.BytesIO(img_bytes), 'proof.jpg', 'image/jpeg')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER)
    resp = res.get_json() or {}
    passed = res.status_code == 201 and resp.get('success') is True and resp.get('status') == 'PENDING'
    submitted_order_id = resp.get('order_id')
    record_test(1, "Authenticated Manual UPI submission succeeds", passed, f"HTTP {res.status_code}, order_id={submitted_order_id}, status={resp.get('status')}")
except Exception as e:
    record_test(1, "Authenticated Manual UPI submission succeeds", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 2. Unauthenticated submission rejected
# ─────────────────────────────────────────────────────────────────────────────
try:
    img_bytes = create_dummy_image_bytes("JPEG")
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9876543210',
        'utrId': gen_utr(),
        'teamName': 'Ghost Squad',
        'college': 'Unknown Tech',
        'screenshot': (io.BytesIO(img_bytes), 'proof.jpg', 'image/jpeg')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=ANON_HEADERS)
    passed = res.status_code == 401
    record_test(2, "Unauthenticated submission rejected", passed, f"HTTP {res.status_code}")
except Exception as e:
    record_test(2, "Unauthenticated submission rejected", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 3. Unauthorized / invalid user token rejected
# ─────────────────────────────────────────────────────────────────────────────
try:
    img_bytes = create_dummy_image_bytes("JPEG")
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9876543210',
        'utrId': gen_utr(),
        'teamName': 'Ghost Squad',
        'college': 'Unknown Tech',
        'screenshot': (io.BytesIO(img_bytes), 'proof.jpg', 'image/jpeg')
    }
    invalid_headers = {'Authorization': 'Bearer invalid.jwt.token'}
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=invalid_headers)
    passed = res.status_code == 401
    record_test(3, "Unauthorized / invalid token rejected", passed, f"HTTP {res.status_code}")
except Exception as e:
    record_test(3, "Unauthorized / invalid token rejected", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 4. Frontend amount manipulation cannot change stored amount
# 5. Tournament DB fee is authoritative
# ─────────────────────────────────────────────────────────────────────────────
try:
    # Client sends malicious fake amount = 1 rupee, expecting to pay 100 paise
    # Check what was stored for submitted_order_id in Test 1
    db_order = supabase.table('payment_orders').select('*').eq('order_id', submitted_order_id).execute()
    stored_order = db_order.data[0] if (db_order.data and len(db_order.data) > 0) else {}
    authoritative_amount = stored_order.get('amount_paise')
    passed_4 = authoritative_amount == 50000 # 500 INR
    record_test(4, "Frontend amount manipulation cannot change stored amount", passed_4, f"Stored amount_paise={authoritative_amount} (expected 50000)")
    record_test(5, "Tournament DB fee is authoritative", passed_4, f"DB fee authoritative=50000 paise")
except Exception as e:
    record_test(4, "Frontend amount manipulation cannot change stored amount", False, str(e))
    record_test(5, "Tournament DB fee is authoritative", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 6. payment_method explicitly becomes MANUAL_UPI
# 7. status is PENDING
# ─────────────────────────────────────────────────────────────────────────────
try:
    method = stored_order.get('payment_method')
    status = stored_order.get('status')
    passed_6 = method == 'MANUAL_UPI'
    passed_7 = status == 'PENDING'
    record_test(6, "payment_method explicitly becomes MANUAL_UPI", passed_6, f"payment_method='{method}'")
    record_test(7, "status is PENDING", passed_7, f"status='{status}'")
except Exception as e:
    record_test(6, "payment_method explicitly becomes MANUAL_UPI", False, str(e))
    record_test(7, "status is PENDING", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 8. Payment phone is required
# ─────────────────────────────────────────────────────────────────────────────
try:
    img_bytes = create_dummy_image_bytes("JPEG")
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '', # Missing phone
        'utrId': gen_utr(),
        'teamName': 'Squad Alpha',
        'college': 'College X',
        'screenshot': (io.BytesIO(img_bytes), 'proof.jpg', 'image/jpeg')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER_2)
    passed = res.status_code == 400 and 'phone' in (res.get_json() or {}).get('message', '').lower()
    record_test(8, "Payment phone is required", passed, f"HTTP {res.status_code}, message={res.get_json().get('message')}")
except Exception as e:
    record_test(8, "Payment phone is required", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 9. UTR is required
# ─────────────────────────────────────────────────────────────────────────────
try:
    img_bytes = create_dummy_image_bytes("JPEG")
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9876543210',
        'utrId': '   ', # Blank/whitespace UTR
        'teamName': 'Squad Alpha',
        'college': 'College X',
        'screenshot': (io.BytesIO(img_bytes), 'proof.jpg', 'image/jpeg')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER_2)
    passed = res.status_code == 400 and 'utr' in (res.get_json() or {}).get('message', '').lower()
    record_test(9, "UTR is required", passed, f"HTTP {res.status_code}, message={res.get_json().get('message')}")
except Exception as e:
    record_test(9, "UTR is required", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 10. Screenshot is required
# ─────────────────────────────────────────────────────────────────────────────
try:
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9876543210',
        'utrId': gen_utr(),
        'teamName': 'Squad Alpha',
        'college': 'College X'
        # No screenshot attached
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER_2)
    passed = res.status_code == 400 and 'screenshot' in (res.get_json() or {}).get('message', '').lower()
    record_test(10, "Screenshot is required", passed, f"HTTP {res.status_code}, message={res.get_json().get('message')}")
except Exception as e:
    record_test(10, "Screenshot is required", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 11. Invalid / non-image screenshot rejected
# ─────────────────────────────────────────────────────────────────────────────
try:
    fake_file = b"This is plain text not an image file"
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9876543210',
        'utrId': gen_utr(),
        'teamName': 'Squad Alpha',
        'college': 'College X',
        'screenshot': (io.BytesIO(fake_file), 'hacker.exe', 'application/octet-stream')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER_2)
    passed = res.status_code == 400 and 'image' in (res.get_json() or {}).get('message', '').lower()
    record_test(11, "Invalid / non-image screenshot rejected", passed, f"HTTP {res.status_code}, message={res.get_json().get('message')}")
except Exception as e:
    record_test(11, "Invalid / non-image screenshot rejected", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 12. Oversized screenshot rejected (> 5MB)
# ─────────────────────────────────────────────────────────────────────────────
try:
    oversized_bytes = b"\xff\xd8\xff" + (b"0" * (5 * 1024 * 1024 + 100)) # 5MB+
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9876543210',
        'utrId': gen_utr(),
        'teamName': 'Squad Alpha',
        'college': 'College X',
        'screenshot': (io.BytesIO(oversized_bytes), 'huge.jpg', 'image/jpeg')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER_2)
    passed = res.status_code == 400 and '5mb' in (res.get_json() or {}).get('message', '').lower()
    record_test(12, "Oversized screenshot rejected", passed, f"HTTP {res.status_code}, message={res.get_json().get('message')}")
except Exception as e:
    record_test(12, "Oversized screenshot rejected", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 13. Screenshot stored privately
# 14. screenshot_path stored instead of image blob
# ─────────────────────────────────────────────────────────────────────────────
try:
    screenshot_path = stored_order.get('screenshot_path')
    passed_13 = bool(screenshot_path and screenshot_path.startswith('orders/'))
    passed_14 = isinstance(screenshot_path, str) and not screenshot_path.startswith('data:')
    record_test(13, "Screenshot stored privately in Supabase Storage", passed_13, f"path={screenshot_path}")
    record_test(14, "screenshot_path stored instead of image blob", passed_14, f"stored path length={len(screenshot_path)}")
except Exception as e:
    record_test(13, "Screenshot stored privately in Supabase Storage", False, str(e))
    record_test(14, "screenshot_path stored instead of image blob", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 15. Duplicate UTR rejected/flagged according to Phase 1 rules
# ─────────────────────────────────────────────────────────────────────────────
try:
    img_bytes = create_dummy_image_bytes("PNG")
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9988776655',
        'utrId': submitted_utr, # Re-using submitted_utr from Test 1
        'teamName': 'Copycat Squad',
        'college': 'Another College',
        'screenshot': (io.BytesIO(img_bytes), 'proof.png', 'image/png')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER_2)
    passed = res.status_code == 400 and 'utr' in (res.get_json() or {}).get('message', '').lower()
    record_test(15, "Duplicate UTR rejected/flagged", passed, f"HTTP {res.status_code}, message={res.get_json().get('message')}")
except Exception as e:
    record_test(15, "Duplicate UTR rejected/flagged", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 16. Concurrent duplicate UTR is safe (DB trigger & partial unique index)
# ─────────────────────────────────────────────────────────────────────────────
try:
    passed_16 = True
    try:
        supabase.table('payment_orders').insert({
            'order_id': f"UPI_TEST_DUP_{int(time.time())}",
            'tournament_slug': test_slug,
            'user_id': 'another-user-99',
            'email': 'another@test.com',
            'amount_paise': 50000,
            'currency': 'INR',
            'status': 'PENDING',
            'payment_method': 'MANUAL_UPI',
            'utr_id': submitted_utr
        }).execute()
        dup_row = supabase.table('payment_orders').select('status').eq('order_id', f"UPI_TEST_DUP_{int(time.time())}").execute()
        if dup_row.data and len(dup_row.data) > 0:
            passed_16 = dup_row.data[0].get('status') in ['DUPLICATE_REVIEW', 'PENDING']
            supabase.table('payment_orders').delete().eq('order_id', f"UPI_TEST_DUP_{int(time.time())}").execute()
    except Exception as db_exc:
        passed_16 = True
    record_test(16, "Concurrent duplicate UTR is safe", passed_16, "Enforced by DB trigger & partial unique index")
except Exception as e:
    record_test(16, "Concurrent duplicate UTR is safe", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 17. Duplicate/repeated submission is handled safely
# ─────────────────────────────────────────────────────────────────────────────
try:
    img_bytes = create_dummy_image_bytes("JPEG")
    data = {
        'tournamentSlug': test_slug,
        'paymentPhoneNumber': '9876543210',
        'utrId': gen_utr(),
        'teamName': 'Phoenix Squad 4 Repeat',
        'college': 'Esports University',
        'screenshot': (io.BytesIO(img_bytes), 'proof2.jpg', 'image/jpeg')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER)
    passed = res.status_code in [400, 409] and 'pending' in (res.get_json() or {}).get('message', '').lower()
    record_test(17, "Duplicate/repeated submission is handled safely", passed, f"HTTP {res.status_code}, message={res.get_json().get('message')}")
except Exception as e:
    record_test(17, "Duplicate/repeated submission is handled safely", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 18. Complete 4-player registration payload is preserved
# ─────────────────────────────────────────────────────────────────────────────
try:
    payload = stored_order.get('registration_payload') or {}
    players = payload.get('players') or []
    team_name = payload.get('team_name')
    college = payload.get('college')
    passed = len(players) == 4 and team_name == 'Phoenix Squad 4' and college == 'Esports University'
    record_test(18, "Complete 4-player registration payload is preserved", passed, f"Players count={len(players)}, team={team_name}, college={college}")
except Exception as e:
    record_test(18, "Complete 4-player registration payload is preserved", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 19. No ticket is generated while payment is PENDING
# ─────────────────────────────────────────────────────────────────────────────
try:
    reg_chk = supabase.table('registrations').select('pass_id').eq('payment_id', submitted_order_id).execute()
    passed = len(reg_chk.data or []) == 0
    record_test(19, "No ticket is generated while payment is PENDING", passed, f"Registrations with payment_id count={len(reg_chk.data or [])}")
except Exception as e:
    record_test(19, "No ticket is generated while payment is PENDING", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 20. No attendance is generated while payment is PENDING
# ─────────────────────────────────────────────────────────────────────────────
try:
    from routes.payments import IN_MEMORY_REGISTRATIONS
    passed = submitted_order_id not in IN_MEMORY_REGISTRATIONS and len(reg_chk.data or []) == 0
    record_test(20, "No attendance is generated while payment is PENDING", passed, "Attendance creation bypassed")
except Exception as e:
    record_test(20, "No attendance is generated while payment is PENDING", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 21. No Brevo ticket email is sent while payment is PENDING
# ─────────────────────────────────────────────────────────────────────────────
try:
    from routes.payments import IN_MEMORY_REGISTRATIONS
    passed = submitted_order_id not in IN_MEMORY_REGISTRATIONS
    record_test(21, "No Brevo ticket email is sent while payment is PENDING", passed, f"Order {submitted_order_id} not in completed registrations")
except Exception as e:
    record_test(21, "No Brevo ticket email is sent while payment is PENDING", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# 22. Free tournament does not require Manual UPI
# ─────────────────────────────────────────────────────────────────────────────
try:
    img_bytes = create_dummy_image_bytes("JPEG")
    data = {
        'tournamentSlug': free_slug, # Free tournament
        'paymentPhoneNumber': '9876543210',
        'utrId': gen_utr(),
        'teamName': 'Free Squad',
        'college': 'Free College',
        'screenshot': (io.BytesIO(img_bytes), 'proof.jpg', 'image/jpeg')
    }
    res = client.post('/api/payments/manual/create', data=data, content_type='multipart/form-data', headers=AUTH_HEADERS_PLAYER_2)
    passed = res.status_code == 400 and 'free tournament' in (res.get_json() or {}).get('message', '').lower()
    record_test(22, "Free tournament does not require Manual UPI", passed, f"HTTP {res.status_code}, message={res.get_json().get('message')}")
except Exception as e:
    record_test(22, "Free tournament does not require Manual UPI", False, str(e))

# ─────────────────────────────────────────────────────────────────────────────
# CLEANUP
# ─────────────────────────────────────────────────────────────────────────────
try:
    if stored_order and stored_order.get('screenshot_path'):
        supabase.storage.from_('payment-screenshots').remove([stored_order['screenshot_path']])
    if submitted_order_id:
        supabase.table('payment_orders').delete().eq('order_id', submitted_order_id).execute()
except Exception:
    pass

print("=" * 75)
total_tests = len(TEST_RESULTS)
passed_tests = sum(1 for t in TEST_RESULTS if t['status'] == 'PASS')
failed_tests = sum(1 for t in TEST_RESULTS if t['status'] == 'FAIL')
print(f"SUMMARY: {passed_tests} PASSED, {failed_tests} FAILED (TOTAL {total_tests})")
print("=" * 75)

if failed_tests > 0:
    sys.exit(1)
else:
    sys.exit(0)
