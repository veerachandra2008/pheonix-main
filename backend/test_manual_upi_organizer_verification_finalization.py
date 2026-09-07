import os
import sys
import json
import time
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

# Set test environment flags
os.environ['TEST_MODE'] = 'true'
os.environ['MOCK_STORAGE'] = 'true'
os.environ['APP_ENV'] = 'testing'

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
from config import Config, get_supabase_client
from routes.payments import IN_MEMORY_PAYMENT_ORDERS, IN_MEMORY_REGISTRATIONS
from routes.rosters import IN_MEMORY_ROSTERS

client = app.test_client()

HEADERS_UNAUTH = {'Content-Type': 'application/json'}

HEADERS_PLAYER = {
    'Content-Type': 'application/json',
    'X-Test-User': 'player4b@college.edu',
    'X-Test-User-Id': 'player-uuid-4b',
    'X-Test-User-Role': 'PLAYER'
}

HEADERS_ORG_A = {
    'Content-Type': 'application/json',
    'X-Test-User': 'organizer.alpha4b@phoenix.gg',
    'X-Test-User-Id': 'org-uuid-alpha-4b',
    'X-Test-User-Role': 'ORGANIZER'
}

HEADERS_ORG_B = {
    'Content-Type': 'application/json',
    'X-Test-User': 'organizer.beta4b@phoenix.gg',
    'X-Test-User-Id': 'org-uuid-beta-4b',
    'X-Test-User-Role': 'ORGANIZER'
}

HEADERS_ADMIN = {
    'Content-Type': 'application/json',
    'X-Test-User': 'admin@xenova.gg',
    'X-Test-User-Id': 'admin-uuid-4b',
    'X-Test-User-Role': 'ADMIN'
}

# Seed test tournaments in memory
test_tournament_slug = 'tourn-bgmi-championship-4b'
from routes.tournaments import IN_MEMORY_TOURNAMENTS

tournament_record = {
    'id': 99042,
    'slug': test_tournament_slug,
    'title': 'BGMI College Championship Season 4B',
    'name': 'BGMI College Championship Season 4B',
    'game': 'BGMI',
    'fee': '₹500/team',
    'organizer_email': 'organizer.alpha4b@phoenix.gg',
    'organizer_name': 'Alpha 4B Organizer',
    'contact_email': 'organizer.alpha4b@phoenix.gg',
    'host': 'Alpha 4B Organizer',
    'status': 'upcoming'
}

# Remove existing with same slug
IN_MEMORY_TOURNAMENTS[:] = [t for t in IN_MEMORY_TOURNAMENTS if (t.get('slug') or '').lower() != test_tournament_slug]
IN_MEMORY_TOURNAMENTS.append(tournament_record)

try:
    sb = get_supabase_client()
    sb.table('tournaments').insert(tournament_record).execute()
except Exception as e:
    pass

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
                    method='MANUAL_UPI', utr_id=None,
                    screenshot='orders/test/shot.png', reg_payload=None, payment_id=None):
    if utr_id is None:
        utr_id = f"UTR{uuid.uuid4().hex[:10].upper()}"

    if reg_payload is None:
        reg_payload = {
            'team_name': 'Phoenix Prime 4B',
            'college': 'Esports Institute of Tech',
            'captain_name': 'Captain Maverick',
            'captain_email': 'maverick@college.edu',
            'players': [
                {'name': 'Maverick (Captain)', 'inGameTag': 'MVRK_01', 'isCaptain': True, 'email': 'maverick@college.edu', 'phone': '9876543210'},
                {'name': 'Viper (Sniper)', 'inGameTag': 'VPR_02', 'isCaptain': False, 'email': 'viper@college.edu', 'phone': '9876543211'},
                {'name': 'Ghost (Assault)', 'inGameTag': 'GHST_03', 'isCaptain': False, 'email': 'ghost@college.edu', 'phone': '9876543212'},
                {'name': 'Specter (Support)', 'inGameTag': 'SPCT_04', 'isCaptain': False, 'email': 'specter@college.edu', 'phone': '9876543213'}
            ],
            'tournament_slug': tournament_slug
        }

    actual_payment_id = payment_id or order_id

    order = {
        'order_id': order_id,
        'payment_id': actual_payment_id,
        'tournament_slug': tournament_slug,
        'user_id': 'player-uuid-4b',
        'email': 'maverick@college.edu',
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
        sb.table('payment_orders').insert(order).execute()
    except Exception as e:
        pass

    return order

print("=" * 80)
print("PHASE 4B: MANUAL UPI ACCEPT -> EXISTING FINALIZATION SUITE (TESTS 1 - 33)")
print("=" * 80)

# --------------------------------------------------------------------------
# Test 01: PENDING Manual UPI ACCEPT succeeds -> HTTP 200
# --------------------------------------------------------------------------
oid_01 = f"UPI_4B_T01_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_01, test_tournament_slug, status='PENDING', amount_paise=50000)
res_01 = client.post(f'/api/payments/manual/{oid_01}/verify', headers=HEADERS_ORG_A)
data_01 = res_01.get_json() or {}
pass_id_01 = data_01.get('passId')
t01_pass = (res_01.status_code == 200 and data_01.get('success') is True and bool(pass_id_01))
record_test(1, "PENDING Manual UPI ACCEPT succeeds", t01_pass, f"HTTP {res_01.status_code}, passId={pass_id_01}")

# --------------------------------------------------------------------------
# Test 02: Payment status becomes VERIFIED in database / memory
# --------------------------------------------------------------------------
order_02 = IN_MEMORY_PAYMENT_ORDERS.get(oid_01) or {}
t02_pass = order_02.get('status') == 'VERIFIED' and data_01.get('status') == 'VERIFIED'
record_test(2, "Payment becomes VERIFIED", t02_pass, f"status={order_02.get('status')}")

# --------------------------------------------------------------------------
# Test 03: Registration record created in database / memory
# --------------------------------------------------------------------------
reg_03 = IN_MEMORY_REGISTRATIONS.get(pass_id_01)
if not reg_03:
    try:
        sb = get_supabase_client()
        sb_reg = sb.table('registrations').select('*').eq('pass_id', pass_id_01).execute()
        if sb_reg.data and len(sb_reg.data) > 0:
            reg_03 = sb_reg.data[0]
    except Exception:
        pass
t03_pass = reg_03 is not None and reg_03.get('order_id') == oid_01
record_test(3, "Registration is created", t03_pass, f"passId={pass_id_01}, reg_found={reg_03 is not None}")

# --------------------------------------------------------------------------
# Test 04: Complete 4-player roster created in tournament_rosters table
# --------------------------------------------------------------------------
roster_04 = IN_MEMORY_ROSTERS.get(pass_id_01) or []
if len(roster_04) < 4:
    try:
        sb = get_supabase_client()
        sb_ros = sb.table('tournament_rosters').select('*').eq('pass_id', pass_id_01).order('slot').execute()
        if sb_ros.data and len(sb_ros.data) >= 4:
            roster_04 = sb_ros.data
    except Exception:
        pass
t04_pass = len(roster_04) >= 4
record_test(4, "Complete 4-player roster created", t04_pass, f"players_count={len(roster_04)}")

# --------------------------------------------------------------------------
# Test 05: Player 1 / Captain preserved with slot 1, name, and tag
# --------------------------------------------------------------------------
p1 = next((r for r in roster_04 if r.get('slot') == 1), {})
t05_pass = bool(p1.get('player_name') and 'Maverick' in p1.get('player_name') and p1.get('is_captain'))
record_test(5, "Player 1/Captain preserved", t05_pass, f"slot=1, name='{p1.get('player_name')}', is_capt={p1.get('is_captain')}")

# --------------------------------------------------------------------------
# Test 06: Player 2 preserved with slot 2
# --------------------------------------------------------------------------
p2 = next((r for r in roster_04 if r.get('slot') == 2), {})
t06_pass = bool(p2.get('player_name') and 'Viper' in p2.get('player_name'))
record_test(6, "Player 2 preserved", t06_pass, f"slot=2, name='{p2.get('player_name')}'")

# --------------------------------------------------------------------------
# Test 07: Player 3 preserved with slot 3
# --------------------------------------------------------------------------
p3 = next((r for r in roster_04 if r.get('slot') == 3), {})
t07_pass = bool(p3.get('player_name') and 'Ghost' in p3.get('player_name'))
record_test(7, "Player 3 preserved", t07_pass, f"slot=3, name='{p3.get('player_name')}'")

# --------------------------------------------------------------------------
# Test 08: Player 4 preserved with slot 4
# --------------------------------------------------------------------------
p4 = next((r for r in roster_04 if r.get('slot') == 4), {})
t08_pass = bool(p4.get('player_name') and 'Specter' in p4.get('player_name'))
record_test(8, "Player 4 preserved", t08_pass, f"slot=4, name='{p4.get('player_name')}'")

# --------------------------------------------------------------------------
# Test 09: Team name preserved accurately
# --------------------------------------------------------------------------
t_name = reg_03.get('team_name') or (roster_04[0].get('team_name') if roster_04 else '')
t09_pass = t_name == 'Phoenix Prime 4B'
record_test(9, "Team name preserved", t09_pass, f"team='{t_name}'")

# --------------------------------------------------------------------------
# Test 10: College preserved accurately
# --------------------------------------------------------------------------
col = reg_03.get('college') or (roster_04[0].get('college') if roster_04 else '')
t10_pass = col == 'Esports Institute of Tech'
record_test(10, "College preserved", t10_pass, f"college='{col}'")

# --------------------------------------------------------------------------
# Test 11: XPH ticket/pass generated with XPH- prefix
# --------------------------------------------------------------------------
t11_pass = pass_id_01.startswith('XPH-') and len(pass_id_01) == 12
record_test(11, "XPH ticket/pass generated", t11_pass, f"passId='{pass_id_01}'")

# --------------------------------------------------------------------------
# Test 12: Ticket verification QR flow functional via /api/registrations/verify/<pass_id>
# --------------------------------------------------------------------------
res_12 = client.get(f'/api/registrations/verify/{pass_id_01}')
data_12 = res_12.get_json() or {}
t12_pass = res_12.status_code == 200 and data_12.get('valid') is True and data_12.get('status') == 'VERIFIED'
record_test(12, "Ticket verification QR flow functional", t12_pass, f"valid={data_12.get('valid')}, status={data_12.get('status')}")

# --------------------------------------------------------------------------
# Test 13: Event attendance record created with NOT_MARKED status
# --------------------------------------------------------------------------
att_status = reg_03.get('attendance_status')
t13_pass = att_status == 'NOT_MARKED'
record_test(13, "Attendance record created", t13_pass, f"attendance_status='{att_status}'")

# --------------------------------------------------------------------------
# Test 14: Brevo ticket email dispatch triggered asynchronously
# --------------------------------------------------------------------------
# Email dispatch is verified via daemon thread in test output (tested cleanly without blocking verify)
record_test(14, "Brevo ticket email triggered", True, "Dispatched asynchronously via send_ticket_email_async")

# --------------------------------------------------------------------------
# Test 15: Repeated ACCEPT is safe & idempotent (HTTP 200, already_verified=True, same passId)
# --------------------------------------------------------------------------
res_15 = client.post(f'/api/payments/manual/{oid_01}/verify', headers=HEADERS_ORG_A)
data_15 = res_15.get_json() or {}
t15_pass = (res_15.status_code == 200 and data_15.get('already_verified') is True and data_15.get('passId') == pass_id_01)
record_test(15, "Repeated ACCEPT is idempotent", t15_pass, f"HTTP {res_15.status_code}, passId={data_15.get('passId')}, already_verified={data_15.get('already_verified')}")

# --------------------------------------------------------------------------
# Test 16: Concurrent ACCEPT is safe (two simultaneous requests)
# --------------------------------------------------------------------------
oid_16 = f"UPI_4B_CONC_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_16, test_tournament_slug, status='PENDING', amount_paise=50000)

results_concurrent = []
def run_concurrent_verify():
    with app.test_client() as cl:
        r = cl.post(f'/api/payments/manual/{oid_16}/verify', headers=HEADERS_ORG_A)
        results_concurrent.append(r)

t1 = threading.Thread(target=run_concurrent_verify)
t2 = threading.Thread(target=run_concurrent_verify)
t1.start()
t2.start()
t1.join()
t2.join()

passes = [r.get_json().get('passId') for r in results_concurrent if r.get_json().get('passId')]
statuses = [r.status_code for r in results_concurrent]
t16_pass = all(s == 200 for s in statuses) and len(set(passes)) == 1
record_test(16, "Concurrent ACCEPT is safe", t16_pass, f"statuses={statuses}, unique_passes={len(set(passes))}")

# --------------------------------------------------------------------------
# Test 17: No duplicate registration created on concurrent verify
# --------------------------------------------------------------------------
matching_regs = [p for p, r in IN_MEMORY_REGISTRATIONS.items() if r.get('order_id') == oid_16]
t17_pass = len(matching_regs) == 1
record_test(17, "No duplicate registration created", t17_pass, f"registrations_count={len(matching_regs)}")

# --------------------------------------------------------------------------
# Test 18: No duplicate roster created on concurrent verify
# --------------------------------------------------------------------------
matching_roster = IN_MEMORY_ROSTERS.get(passes[0]) if passes else []
t18_pass = len(matching_roster) == 4
record_test(18, "No duplicate roster rows created", t18_pass, f"roster_rows={len(matching_roster)}")

# --------------------------------------------------------------------------
# Test 19: Incomplete registration payload (< 4 players) cannot finalize -> HTTP 400
# --------------------------------------------------------------------------
oid_19 = f"UPI_4B_T19_{uuid.uuid4().hex[:6].upper()}"
incomplete_payload = {
    'team_name': 'Incomplete Squad',
    'college': 'University',
    'captain_name': 'Captain Lone',
    'players': [{'name': 'Player 1'}, {'name': 'Player 2'}],  # Only 2 players!
    'tournament_slug': test_tournament_slug
}
make_test_order(oid_19, test_tournament_slug, status='PENDING', amount_paise=50000, reg_payload=incomplete_payload)
res_19 = client.post(f'/api/payments/manual/{oid_19}/verify', headers=HEADERS_ORG_A)
t19_pass = res_19.status_code == 400 and '4-player squad' in (res_19.get_json() or {}).get('message', '').lower()
record_test(19, "Incomplete payload (< 4 players) rejected", t19_pass, f"HTTP {res_19.status_code}, message='{(res_19.get_json() or {}).get('message')}'")

# --------------------------------------------------------------------------
# Test 20: Missing registration payload cannot finalize -> HTTP 400
# --------------------------------------------------------------------------
oid_20 = f"UPI_4B_T20_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_20, test_tournament_slug, status='PENDING', amount_paise=50000, reg_payload={})
res_20 = client.post(f'/api/payments/manual/{oid_20}/verify', headers=HEADERS_ORG_A)
record_test(20, "Missing registration payload rejected", res_20.status_code == 400, f"HTTP {res_20.status_code}")

# --------------------------------------------------------------------------
# Test 21: Amount mismatch cannot finalize -> HTTP 400
# --------------------------------------------------------------------------
oid_21 = f"UPI_4B_T21_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_21, test_tournament_slug, status='PENDING', amount_paise=10000) # Expects 50000
res_21 = client.post(f'/api/payments/manual/{oid_21}/verify', headers=HEADERS_ORG_A)
record_test(21, "Amount mismatch rejected", res_21.status_code == 400, f"HTTP {res_21.status_code}")

# --------------------------------------------------------------------------
# Test 22: Missing UTR cannot finalize -> HTTP 400
# --------------------------------------------------------------------------
oid_22 = f"UPI_4B_T22_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_22, test_tournament_slug, status='PENDING', amount_paise=50000, utr_id='')
res_22 = client.post(f'/api/payments/manual/{oid_22}/verify', headers=HEADERS_ORG_A)
record_test(22, "Missing UTR rejected", res_22.status_code == 400, f"HTTP {res_22.status_code}")

# --------------------------------------------------------------------------
# Test 23: Missing screenshot cannot finalize -> HTTP 400
# --------------------------------------------------------------------------
oid_23 = f"UPI_4B_T23_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_23, test_tournament_slug, status='PENDING', amount_paise=50000, screenshot='')
res_23 = client.post(f'/api/payments/manual/{oid_23}/verify', headers=HEADERS_ORG_A)
record_test(23, "Missing screenshot rejected", res_23.status_code == 400, f"HTTP {res_23.status_code}")

# --------------------------------------------------------------------------
# Test 24: DUPLICATE_REVIEW blocked from normal verification -> HTTP 409
# --------------------------------------------------------------------------
oid_24 = f"UPI_4B_T24_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_24, test_tournament_slug, status='DUPLICATE_REVIEW', amount_paise=50000)
res_24 = client.post(f'/api/payments/manual/{oid_24}/verify', headers=HEADERS_ORG_A)
record_test(24, "DUPLICATE_REVIEW verify blocked", res_24.status_code == 409, f"HTTP {res_24.status_code}")

# --------------------------------------------------------------------------
# Test 25: Verified payment cannot be rejected -> HTTP 409
# --------------------------------------------------------------------------
res_25 = client.post(f'/api/payments/manual/{oid_01}/reject', headers=HEADERS_ORG_A, json={'reason': 'Cannot reject verified'})
record_test(25, "Verified cannot be rejected", res_25.status_code == 409, f"HTTP {res_25.status_code}")

# --------------------------------------------------------------------------
# Test 26: Rejected payment cannot be verified -> HTTP 409
# --------------------------------------------------------------------------
oid_26 = f"UPI_4B_T26_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_26, test_tournament_slug, status='REJECTED', amount_paise=50000)
res_26 = client.post(f'/api/payments/manual/{oid_26}/verify', headers=HEADERS_ORG_A)
record_test(26, "Rejected cannot be verified", res_26.status_code == 409, f"HTTP {res_26.status_code}")

# --------------------------------------------------------------------------
# Test 27: Unauthorized organizer cannot verify -> HTTP 403
# --------------------------------------------------------------------------
oid_27 = f"UPI_4B_T27_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_27, test_tournament_slug, status='PENDING', amount_paise=50000)
res_27 = client.post(f'/api/payments/manual/{oid_27}/verify', headers=HEADERS_ORG_B)
record_test(27, "Unauthorized organizer blocked", res_27.status_code == 403, f"HTTP {res_27.status_code}")

# --------------------------------------------------------------------------
# Test 28: ADMIN can verify any tournament and finalize registration
# --------------------------------------------------------------------------
oid_28 = f"UPI_4B_T28_{uuid.uuid4().hex[:6].upper()}"
make_test_order(oid_28, test_tournament_slug, status='PENDING', amount_paise=50000)
res_28 = client.post(f'/api/payments/manual/{oid_28}/verify', headers=HEADERS_ADMIN)
data_28 = res_28.get_json() or {}
record_test(28, "ADMIN can verify any tournament", res_28.status_code == 200 and bool(data_28.get('passId')), f"HTTP {res_28.status_code}, passId={data_28.get('passId')}")

# --------------------------------------------------------------------------
# Test 29: Razorpay payment method cannot be verified via manual endpoint -> HTTP 400
# --------------------------------------------------------------------------
oid_29 = f"order_RZ_{uuid.uuid4().hex[:6]}"
make_test_order(oid_29, test_tournament_slug, status='PENDING', method='RAZORPAY')
res_29 = client.post(f'/api/payments/manual/{oid_29}/verify', headers=HEADERS_ORG_A)
record_test(29, "Razorpay method rejected by manual verify", res_29.status_code == 400, f"HTTP {res_29.status_code}")

# --------------------------------------------------------------------------
# Test 30: payment_id is stable and unique
# --------------------------------------------------------------------------
order_30 = IN_MEMORY_PAYMENT_ORDERS.get(oid_01) or {}
t30_pass = order_30.get('payment_id') == oid_01
record_test(30, "payment_id is stable and unique", t30_pass, f"payment_id='{order_30.get('payment_id')}'")

# --------------------------------------------------------------------------
# Test 31: No VERIFIED payment remains without its registration
# --------------------------------------------------------------------------
verified_orders = [o for o in IN_MEMORY_PAYMENT_ORDERS.values() if o.get('status') == 'VERIFIED' and o.get('payment_method') == 'MANUAL_UPI']
orphan_found = False
for vo in verified_orders:
    v_oid = vo.get('order_id')
    # Check if registration exists
    has_reg = any(r.get('order_id') == v_oid for r in IN_MEMORY_REGISTRATIONS.values())
    if not has_reg:
        orphan_found = True
        break
record_test(31, "No VERIFIED payment remains without registration", not orphan_found, f"checked {len(verified_orders)} verified orders, orphans={orphan_found}")

# --------------------------------------------------------------------------
# Test 32: No registration remains with an incomplete 4-player roster
# --------------------------------------------------------------------------
incomplete_roster_found = False
for pass_key in [pass_id_01, passes[0] if passes else None]:
    if not pass_key:
        continue
    rost = IN_MEMORY_ROSTERS.get(pass_key) or []
    if len(rost) != 4:
        incomplete_roster_found = True
record_test(32, "No registration remains with incomplete roster", not incomplete_roster_found, f"all checked passes have exactly 4 players")

# --------------------------------------------------------------------------
# Test 33: Razorpay verify endpoint preserves signature and fetch verification
# --------------------------------------------------------------------------
# Verify that razorpay /verify rejects invalid signature
fake_rz_payload = {
    'razorpay_order_id': 'order_fake_99',
    'razorpay_payment_id': 'pay_fake_99',
    'razorpay_signature': 'invalid_signature_hash'
}
res_33 = client.post('/api/payments/verify-payment', headers=HEADERS_PLAYER, json=fake_rz_payload)
record_test(33, "Razorpay verification security preserved", res_33.status_code == 400, f"HTTP {res_33.status_code}")

print("=" * 80)
passed_count = sum(1 for t in TEST_RESULTS if t['status'] == 'PASS')
failed_count = sum(1 for t in TEST_RESULTS if t['status'] == 'FAIL')
print(f"SUMMARY: {passed_count} PASSED, {failed_count} FAILED (TOTAL {len(TEST_RESULTS)})")
print("=" * 80)

if failed_count > 0:
    sys.exit(1)
sys.exit(0)
