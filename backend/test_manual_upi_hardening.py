import sys
import os
import time
import json
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

# Set test environment flags
os.environ['TEST_MODE'] = 'true'
os.environ['MOCK_STORAGE'] = 'true'
os.environ['APP_ENV'] = 'testing'

# Ensure backend is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
from routes.payments import IN_MEMORY_PAYMENT_ORDERS, IN_MEMORY_REGISTRATIONS
from routes.tournaments import IN_MEMORY_TOURNAMENTS
from routes.rosters import IN_MEMORY_ROSTERS
from config import get_supabase_client

client = app.test_client()

# Authentication Headers for testing roles
HEADERS_UNAUTH = {'Content-Type': 'application/json'}

HEADERS_PLAYER = {
    'Content-Type': 'application/json',
    'X-Test-User': 'player_hardened@college.edu',
    'X-Test-User-Id': 'usr-player-4d',
    'X-Test-User-Role': 'PLAYER'
}

HEADERS_ORG = {
    'Content-Type': 'application/json',
    'X-Test-User': 'organizer_hardened@college.edu',
    'X-Test-User-Id': 'usr-org-4d',
    'X-Test-User-Role': 'ORGANIZER'
}

HEADERS_ORG_OTHER = {
    'Content-Type': 'application/json',
    'X-Test-User': 'other_org@college.edu',
    'X-Test-User-Id': 'usr-org-other-4d',
    'X-Test-User-Role': 'ORGANIZER'
}

HEADERS_ADMIN = {
    'Content-Type': 'application/json',
    'X-Test-User': 'admin@xenova.gg',
    'X-Test-User-Id': 'usr-admin-4d',
    'X-Test-User-Role': 'ADMIN'
}

# Test tournament
TOURNAMENT_HARDENED = {
    'slug': 'tourn-hardened-4d',
    'title': 'Tournament Hardened Phase 4D',
    'host': 'Organizer Hardened',
    'organizer_email': 'organizer_hardened@college.edu',
    'organizer_name': 'Organizer Hardened',
    'fee': '₹400/team',
    'game': 'Valorant',
    'status': 'Registering',
}

matched = False
for existing in IN_MEMORY_TOURNAMENTS:
    if existing.get('slug') == TOURNAMENT_HARDENED['slug']:
        existing.update(TOURNAMENT_HARDENED)
        matched = True
        break
if not matched:
    IN_MEMORY_TOURNAMENTS.append(TOURNAMENT_HARDENED)

try:
    sb = get_supabase_client()
    try:
        sb.table('tournaments').insert(TOURNAMENT_HARDENED).execute()
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
print("PHASE 4D: MANUAL UPI FINAL HARDENING SUITE (TESTS 1 - 20)")
print("=" * 80)

def make_valid_squad_payload(captain_email="cap4d@college.edu"):
    return {
        'team_name': 'Hardened Squad 4D',
        'college': 'Hardening Institute of Tech',
        'captain_email': captain_email,
        'players': [
            {'name': 'Cap 4D', 'email': captain_email, 'phone': '9876543210', 'role': 'Captain'},
            {'name': 'Player Two', 'email': 'p2_4d@college.edu', 'phone': '9876543211', 'role': 'Assault'},
            {'name': 'Player Three', 'email': 'p3_4d@college.edu', 'phone': '9876543212', 'role': 'Support'},
            {'name': 'Player Four', 'email': 'p4_4d@college.edu', 'phone': '9876543213', 'role': 'Sniper'}
        ]
    }

# ==============================================================================
# TEST 1: PROCESSING Recovery with existing registration -> 200, already_verified
# ==============================================================================
order_id_1 = f"UPI_4D_REC1_{uuid.uuid4().hex[:6].upper()}"
pass_id_1 = f"XPH-4D-REC1-{uuid.uuid4().hex[:4].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_1] = {
    'order_id': order_id_1,
    'payment_id': order_id_1,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PROCESSING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/p1.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}
# Simulate that registration was already created before server crashed
IN_MEMORY_REGISTRATIONS[pass_id_1] = {
    'pass_id': pass_id_1,
    'order_id': order_id_1,
    'payment_id': order_id_1,
    'tournament_slug': 'tourn-hardened-4d',
    'team_name': 'Hardened Squad 4D'
}

res = client.post(f"/api/payments/manual/{order_id_1}/verify", headers=HEADERS_ORG)
data = res.json or {}
passed = (res.status_code == 200 and 
          data.get('success') is True and 
          data.get('already_verified') is True and 
          data.get('passId') == pass_id_1 and 
          IN_MEMORY_PAYMENT_ORDERS[order_id_1]['status'] == 'VERIFIED')
record_test(1, "PROCESSING recovery with existing registration succeeds", passed, f"status={res.status_code}, passId={data.get('passId')}")

# ==============================================================================
# TEST 2: PROCESSING Recovery without registration (crash before finalization) -> Finalizes cleanly
# ==============================================================================
order_id_2 = f"UPI_4D_REC2_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_2] = {
    'order_id': order_id_2,
    'payment_id': order_id_2,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PROCESSING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/p2.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

res = client.post(f"/api/payments/manual/{order_id_2}/verify", headers=HEADERS_ORG)
data = res.json or {}
new_pass_id = data.get('passId')
passed = (res.status_code == 200 and 
          data.get('success') is True and 
          bool(new_pass_id) and 
          IN_MEMORY_PAYMENT_ORDERS[order_id_2]['status'] == 'VERIFIED' and 
          new_pass_id in IN_MEMORY_REGISTRATIONS)
record_test(2, "PROCESSING recovery without registration finalizes cleanly", passed, f"status={res.status_code}, newPassId={new_pass_id}")

# ==============================================================================
# TEST 3: Concurrent ACCEPT requests -> exactly ONE finalization, zero duplicate registrations
# ==============================================================================
order_id_3 = f"UPI_4D_CONC_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_3] = {
    'order_id': order_id_3,
    'payment_id': order_id_3,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/p3.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

concurrent_results = []
def execute_verify():
    with app.test_client() as c:
        r = c.post(f"/api/payments/manual/{order_id_3}/verify", headers=HEADERS_ORG)
        concurrent_results.append((r.status_code, (r.json or {}).get('passId')))

t1 = threading.Thread(target=execute_verify)
t2 = threading.Thread(target=execute_verify)
t1.start()
t2.start()
t1.join()
t2.join()

# Count registrations matching this order_id
regs_for_order = [r for k, r in IN_MEMORY_REGISTRATIONS.items() if r.get('order_id') == order_id_3]
statuses = [r[0] for r in concurrent_results]
pass_ids = set([r[1] for r in concurrent_results if r[1]])

passed = (len(statuses) == 2 and 
          all(s == 200 for s in statuses) and 
          len(pass_ids) == 1 and 
          len(regs_for_order) == 1)
record_test(3, "Concurrent ACCEPT requests yield exactly ONE finalization", passed, f"statuses={statuses}, uniquePasses={len(pass_ids)}, regsCount={len(regs_for_order)}")

# ==============================================================================
# TEST 4: Repeated ACCEPT is idempotent -> 200, already_verified
# ==============================================================================
res = client.post(f"/api/payments/manual/{order_id_3}/verify", headers=HEADERS_ORG)
data = res.json or {}
passed = (res.status_code == 200 and 
          data.get('already_verified') is True and 
          data.get('status') == 'VERIFIED')
record_test(4, "Repeated ACCEPT is idempotent", passed, f"status={res.status_code}, already_verified={data.get('already_verified')}")

# ==============================================================================
# TEST 5: ACCEPT vs REJECT race condition
# ==============================================================================
order_id_race = f"UPI_4D_RACE_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_race] = {
    'order_id': order_id_race,
    'payment_id': order_id_race,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/prace.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

race_results = []
def call_accept():
    with app.test_client() as c:
        r = c.post(f"/api/payments/manual/{order_id_race}/verify", headers=HEADERS_ORG)
        race_results.append(('ACCEPT', r.status_code))

def call_reject():
    with app.test_client() as c:
        r = c.post(f"/api/payments/manual/{order_id_race}/reject", headers=HEADERS_ORG, json={'reason': 'Suspected fraud'})
        race_results.append(('REJECT', r.status_code))

ta = threading.Thread(target=call_accept)
tr = threading.Thread(target=call_reject)
ta.start()
tr.start()
ta.join()
tr.join()

# Exactly one operation must succeed with 200, the other must receive 409 Conflict
status_codes = set([res[1] for res in race_results])
final_status = IN_MEMORY_PAYMENT_ORDERS[order_id_race]['status']
passed = (200 in status_codes and 409 in status_codes and final_status in ('VERIFIED', 'REJECTED'))
record_test(5, "ACCEPT vs REJECT race safely resolves (one 200, other 409)", passed, f"results={race_results}, finalStatus={final_status}")

# ==============================================================================
# TEST 6: VERIFIED cannot be rejected -> 409
# ==============================================================================
res = client.post(f"/api/payments/manual/{order_id_3}/reject", headers=HEADERS_ORG, json={'reason': 'Invalid payment'})
passed = res.status_code == 409 and (res.json or {}).get('status') == 'VERIFIED'
record_test(6, "VERIFIED order cannot be rejected (HTTP 409)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 7: REJECTED cannot be verified -> 409
# ==============================================================================
order_id_rej = f"UPI_4D_REJ_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_rej] = {
    'order_id': order_id_rej,
    'payment_id': order_id_rej,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'REJECTED',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/prej.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

res = client.post(f"/api/payments/manual/{order_id_rej}/verify", headers=HEADERS_ORG)
passed = res.status_code == 409 and (res.json or {}).get('status') == 'REJECTED'
record_test(7, "REJECTED order cannot be verified (HTTP 409)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 8: Repeated REJECT is idempotent -> 200, already_rejected
# ==============================================================================
res = client.post(f"/api/payments/manual/{order_id_rej}/reject", headers=HEADERS_ORG, json={'reason': 'Duplicate rejection'})
data = res.json or {}
passed = res.status_code == 200 and data.get('already_rejected') is True
record_test(8, "Repeated REJECT is idempotent (HTTP 200)", passed, f"status={res.status_code}, already_rejected={data.get('already_rejected')}")

# ==============================================================================
# TEST 9: DUPLICATE_REVIEW cannot be verified -> 409
# ==============================================================================
order_id_dup = f"UPI_4D_DUP_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_dup] = {
    'order_id': order_id_dup,
    'payment_id': order_id_dup,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'DUPLICATE_REVIEW',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/pdup.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}

res = client.post(f"/api/payments/manual/{order_id_dup}/verify", headers=HEADERS_ORG)
passed = res.status_code == 409 and (res.json or {}).get('status') == 'DUPLICATE_REVIEW'
record_test(9, "DUPLICATE_REVIEW order cannot be verified (HTTP 409)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 10: DUPLICATE_REVIEW cannot be rejected -> 409
# ==============================================================================
res = client.post(f"/api/payments/manual/{order_id_dup}/reject", headers=HEADERS_ORG, json={'reason': 'Reject duplicate'})
passed = res.status_code == 409 and (res.json or {}).get('status') == 'DUPLICATE_REVIEW'
record_test(10, "DUPLICATE_REVIEW order cannot be rejected (HTTP 409)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 11: Duplicate UTR - Second payment with same UTR cannot be VERIFIED -> 409
# ==============================================================================
shared_utr = f"UTRSHARED{uuid.uuid4().hex[:6].upper()}"
# Order A is verified
order_id_utr_a = f"UPI_4D_UTRA_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_utr_a] = {
    'order_id': order_id_utr_a,
    'payment_id': order_id_utr_a,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': shared_utr,
    'screenshot_path': 'orders/tourn-hardened-4d/pa.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}
res_a = client.post(f"/api/payments/manual/{order_id_utr_a}/verify", headers=HEADERS_ORG)
assert res_a.status_code == 200, "Order A verify failed"

# Order B has the same UTR and attempts verification
order_id_utr_b = f"UPI_4D_UTRB_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_utr_b] = {
    'order_id': order_id_utr_b,
    'payment_id': order_id_utr_b,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'different_player@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': shared_utr,
    'screenshot_path': 'orders/tourn-hardened-4d/pb.png',
    'registration_payload': make_valid_squad_payload(captain_email="diff@college.edu"),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}
res_b = client.post(f"/api/payments/manual/{order_id_utr_b}/verify", headers=HEADERS_ORG)
passed = res_b.status_code == 409 and 'already been verified' in (res_b.json or {}).get('message', '')
record_test(11, "Second payment with identical UTR blocked with 409", passed, f"status={res_b.status_code}, msg={(res_b.json or {}).get('message')}")

# ==============================================================================
# TEST 12: Price Security - Altered payment amount rejected -> 400
# ==============================================================================
order_id_fee_hack = f"UPI_4D_FEE_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_fee_hack] = {
    'order_id': order_id_fee_hack,
    'payment_id': order_id_fee_hack,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 100,  # 1 Rupee instead of authoritative 40000 paise (₹400)
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/pfee.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}
res = client.post(f"/api/payments/manual/{order_id_fee_hack}/verify", headers=HEADERS_ORG)
passed = res.status_code == 400 and 'does not match authoritative' in (res.json or {}).get('message', '')
record_test(12, "Price security: tampered payment amount blocked with 400", passed, f"status={res.status_code}, msg={(res.json or {}).get('message')}")

# ==============================================================================
# TEST 13: 4-Player Roster complete preservation
# ==============================================================================
order_id_roster = f"UPI_4D_ROS_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_roster] = {
    'order_id': order_id_roster,
    'payment_id': order_id_roster,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/pros.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}
res = client.post(f"/api/payments/manual/{order_id_roster}/verify", headers=HEADERS_ORG)
pass_id_ros = (res.json or {}).get('passId')
mem_players = IN_MEMORY_ROSTERS.get(pass_id_ros, [])
passed = (res.status_code == 200 and 
          len(mem_players) == 4 and 
          mem_players[0]['is_captain'] is True and 
          all(not p['is_captain'] for p in mem_players[1:]))
record_test(13, "4-Player roster complete preservation on verify", passed, f"status={res.status_code}, playersCount={len(mem_players)}")

# ==============================================================================
# TEST 14: Razorpay order cannot use manual verify -> 400
# ==============================================================================
order_id_rzp = f"order_rzp_{uuid.uuid4().hex[:8]}"
IN_MEMORY_PAYMENT_ORDERS[order_id_rzp] = {
    'order_id': order_id_rzp,
    'payment_id': f"pay_rzp_{uuid.uuid4().hex[:8]}",
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'RAZORPAY',
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}
res = client.post(f"/api/payments/manual/{order_id_rzp}/verify", headers=HEADERS_ORG)
passed = res.status_code == 400 and 'Only Manual UPI' in (res.json or {}).get('message', '')
record_test(14, "Razorpay payment rejected by manual verify (HTTP 400)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 15: Razorpay order cannot use manual reject -> 400
# ==============================================================================
res = client.post(f"/api/payments/manual/{order_id_rzp}/reject", headers=HEADERS_ORG, json={'reason': 'Test'})
passed = res.status_code == 400 and 'Only Manual UPI' in (res.json or {}).get('message', '')
record_test(15, "Razorpay payment rejected by manual reject (HTTP 400)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 16: Unauthorized organizer for tournament rejected -> 403
# ==============================================================================
res = client.post(f"/api/payments/manual/{order_id_3}/verify", headers=HEADERS_ORG_OTHER)
passed = res.status_code == 403
record_test(16, "Unauthorized organizer cannot verify payment (HTTP 403)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 17: Unauthorized player cannot verify -> 403
# ==============================================================================
res = client.post(f"/api/payments/manual/{order_id_3}/verify", headers=HEADERS_PLAYER)
passed = res.status_code == 403
record_test(17, "PLAYER role cannot verify payment (HTTP 403)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 18: Unauthenticated verify rejected -> 401
# ==============================================================================
res = client.post(f"/api/payments/manual/{order_id_3}/verify", headers=HEADERS_UNAUTH)
passed = res.status_code == 401
record_test(18, "Unauthenticated verify rejected (HTTP 401)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 19: ADMIN can verify any tournament payment
# ==============================================================================
order_id_admin = f"UPI_4D_ADM_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_admin] = {
    'order_id': order_id_admin,
    'payment_id': order_id_admin,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': 'orders/tourn-hardened-4d/padm.png',
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}
res = client.post(f"/api/payments/manual/{order_id_admin}/verify", headers=HEADERS_ADMIN)
passed = res.status_code == 200 and (res.json or {}).get('status') == 'VERIFIED'
record_test(19, "ADMIN can verify tournament payment (HTTP 200)", passed, f"status={res.status_code}")

# ==============================================================================
# TEST 20: Missing UTR or Screenshot blocks verification -> 400
# ==============================================================================
order_id_noss = f"UPI_4D_NOSS_{uuid.uuid4().hex[:6].upper()}"
IN_MEMORY_PAYMENT_ORDERS[order_id_noss] = {
    'order_id': order_id_noss,
    'payment_id': order_id_noss,
    'tournament_slug': 'tourn-hardened-4d',
    'user_id': 'usr-player-4d',
    'email': 'cap4d@college.edu',
    'amount_paise': 40000,
    'currency': 'INR',
    'status': 'PENDING',
    'payment_method': 'MANUAL_UPI',
    'payment_phone_number': '9876543210',
    'utr_id': f"UTR4D{uuid.uuid4().hex[:8].upper()}",
    'screenshot_path': None,
    'registration_payload': make_valid_squad_payload(),
    'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
}
res = client.post(f"/api/payments/manual/{order_id_noss}/verify", headers=HEADERS_ORG)
passed = res.status_code == 400 and 'payment screenshot' in (res.json or {}).get('message', '')
record_test(20, "Missing payment screenshot rejected with 400", passed, f"status={res.status_code}")

print("=" * 80)
total_tests = len(TEST_RESULTS)
passed_tests = sum(1 for t in TEST_RESULTS if t['status'] == 'PASS')
failed_tests = total_tests - passed_tests
print(f"SUMMARY: {passed_tests} PASSED, {failed_tests} FAILED (TOTAL {total_tests})")
print("=" * 80)

if failed_tests > 0:
    sys.exit(1)
sys.exit(0)
