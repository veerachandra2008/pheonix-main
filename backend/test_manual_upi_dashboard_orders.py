import sys
import os
import uuid
import time

sys.path.insert(0, os.path.dirname(__file__))

from app import app
from config import get_supabase_client
from routes.payments import IN_MEMORY_PAYMENT_ORDERS
from routes.tournaments import IN_MEMORY_TOURNAMENTS

client = app.test_client()

# Authentication headers
HEADERS_UNAUTH = {'Content-Type': 'application/json'}

HEADERS_PLAYER = {
    'Content-Type': 'application/json',
    'X-Test-User': 'player_alpha@college.edu',
    'X-Test-User-Id': 'usr-player-p5-1',
    'X-Test-User-Role': 'PLAYER'
}

HEADERS_ORG_A = {
    'Content-Type': 'application/json',
    'X-Test-User': 'org_alpha_p5@college.edu',
    'X-Test-User-Id': 'usr-org-alpha-p5',
    'X-Test-User-Role': 'ORGANIZER'
}

HEADERS_ORG_B = {
    'Content-Type': 'application/json',
    'X-Test-User': 'org_bravo_p5@college.edu',
    'X-Test-User-Id': 'usr-org-bravo-p5',
    'X-Test-User-Role': 'ORGANIZER'
}

HEADERS_ADMIN = {
    'Content-Type': 'application/json',
    'X-Test-User': 'admin@xenova.gg',
    'X-Test-User-Id': 'usr-admin-p5',
    'X-Test-User-Role': 'ADMIN'
}

# Tournaments
TOURN_A = {
    'slug': 'tourn-p5-alpha',
    'title': 'Tournament Alpha Phase 5',
    'host': 'Org Alpha P5',
    'organizer_email': 'org_alpha_p5@college.edu',
    'organizer_name': 'Org Alpha P5',
    'fee': '₹400/team',
    'game': 'BGMI',
    'status': 'Registering',
}

TOURN_B = {
    'slug': 'tourn-p5-bravo',
    'title': 'Tournament Bravo Phase 5',
    'host': 'Org Bravo P5',
    'organizer_email': 'org_bravo_p5@college.edu',
    'organizer_name': 'Org Bravo P5',
    'fee': '₹300/team',
    'game': 'Valorant',
    'status': 'Registering',
}

for t in [TOURN_A, TOURN_B]:
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
    for t in [TOURN_A, TOURN_B]:
        sb.table('tournaments').upsert(t, on_conflict='slug').execute()
except Exception:
    pass

TEST_RESULTS = []

def record_test(code, title, passed, details=""):
    status = "PASS" if passed else "FAIL"
    TEST_RESULTS.append({'code': code, 'title': title, 'status': status, 'details': details})
    print(f"[{status}] Test {code:02d}: {title} -> {details}")

# Create test orders
reg_4_players = {
    'team_name': 'Phoenix Alpha Squad',
    'college': 'Esports Technical University',
    'captain_name': 'Commander Alpha',
    'captain_email': 'captain.alpha@college.edu',
    'captain_phone': '9876543210',
    'players': [
        {'slot': 1, 'name': 'Commander Alpha', 'in_game_tag': 'ALPHA#1', 'email': 'captain.alpha@college.edu', 'phone': '9876543210', 'is_captain': True},
        {'slot': 2, 'name': 'Sniper Bravo', 'in_game_tag': 'BRAVO#2', 'email': 'bravo@college.edu'},
        {'slot': 3, 'name': 'Assault Charlie', 'in_game_tag': 'CHARLIE#3', 'email': 'charlie@college.edu'},
        {'slot': 4, 'name': 'Support Delta', 'in_game_tag': 'DELTA#4', 'email': 'delta@college.edu'}
    ]
}

def seed_order(order_id, slug, status='PENDING', method='MANUAL_UPI', utr=None, reg=None):
    if utr is None:
        utr = f"UTR_P5_{order_id.replace('-', '_')}"
    if reg is None:
        reg = reg_4_players
    
    order = {
        'order_id': order_id,
        'payment_id': order_id,
        'tournament_slug': slug,
        'amount_paise': 40000,
        'currency': 'INR',
        'status': status,
        'payment_method': method,
        'payment_phone_number': '9876543210',
        'utr_id': utr,
        'screenshot_path': f'orders/{slug}/{order_id}.png',
        'registration_payload': reg,
        'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    IN_MEMORY_PAYMENT_ORDERS[order_id] = order
    try:
        sb = get_supabase_client()
        sb.table('payment_orders').upsert(order, on_conflict='order_id').execute()
    except Exception:
        pass
    return order

# Seed specific test orders
ord_a_pending = seed_order('UPI_P5_A_PENDING', 'tourn-p5-alpha', status='PENDING')
ord_a_verified = seed_order('UPI_P5_A_VERIFIED', 'tourn-p5-alpha', status='VERIFIED')
ord_a_rejected = seed_order('UPI_P5_A_REJECTED', 'tourn-p5-alpha', status='REJECTED')
ord_a_dup = seed_order('UPI_P5_A_DUP', 'tourn-p5-alpha', status='DUPLICATE_REVIEW')
ord_a_rzp = seed_order('RZP_P5_A_PENDING', 'tourn-p5-alpha', status='PENDING', method='RAZORPAY')

ord_b_pending = seed_order('UPI_P5_B_PENDING', 'tourn-p5-bravo', status='PENDING')

print("=" * 80)
print("PHASE 5: ORGANIZER DASHBOARD MANUAL UPI ORDERS API SUITE")
print("=" * 80)

# Test 01: Unauthenticated -> 401
res_01 = client.get('/api/payments/manual/orders', headers=HEADERS_UNAUTH)
record_test(1, "Unauthenticated request rejected with 401",
            res_01.status_code == 401, f"status={res_01.status_code}")

# Test 02: PLAYER role -> 403
res_02 = client.get('/api/payments/manual/orders', headers=HEADERS_PLAYER)
record_test(2, "PLAYER role forbidden with 403",
            res_02.status_code == 403, f"status={res_02.status_code}")

# Test 03: Organizer A gets only their tournament's pending orders
res_03 = client.get('/api/payments/manual/orders', headers=HEADERS_ORG_A)
data_03 = res_03.get_json() or {}
orders_03 = data_03.get('orders', [])
all_a = all(o.get('tournament_slug') == 'tourn-p5-alpha' for o in orders_03)
has_a_pending = any(o.get('order_id') == 'UPI_P5_A_PENDING' for o in orders_03)
record_test(3, "Organizer A gets their tournament pending orders",
            res_03.status_code == 200 and all_a and has_a_pending,
            f"count={len(orders_03)}, all_tournament_alpha={all_a}")

# Test 04: Organizer A cannot see Organizer B's orders
has_b = any(o.get('order_id') == 'UPI_P5_B_PENDING' for o in orders_03)
record_test(4, "Organizer A cannot see Organizer B's orders",
            not has_b, f"has_b_order={has_b}")

# Test 05: Non-manual UPI orders (Razorpay) are excluded
has_rzp = any(o.get('payment_method') != 'MANUAL_UPI' for o in orders_03)
record_test(5, "Non-Manual UPI orders excluded",
            not has_rzp, f"has_non_manual={has_rzp}")

# Test 06: Status filtering ?status=VERIFIED
res_06 = client.get('/api/payments/manual/orders?status=VERIFIED', headers=HEADERS_ORG_A)
data_06 = res_06.get_json() or {}
orders_06 = data_06.get('orders', [])
all_verified = all(o.get('status') == 'VERIFIED' for o in orders_06)
has_a_verified = any(o.get('order_id') == 'UPI_P5_A_VERIFIED' for o in orders_06)
record_test(6, "Status filter ?status=VERIFIED works",
            res_06.status_code == 200 and all_verified and has_a_verified,
            f"count={len(orders_06)}, all_verified={all_verified}")

# Test 07: Status filtering ?status=REJECTED
res_07 = client.get('/api/payments/manual/orders?status=REJECTED', headers=HEADERS_ORG_A)
data_07 = res_07.get_json() or {}
orders_07 = data_07.get('orders', [])
all_rejected = all(o.get('status') == 'REJECTED' for o in orders_07)
has_a_rejected = any(o.get('order_id') == 'UPI_P5_A_REJECTED' for o in orders_07)
record_test(7, "Status filter ?status=REJECTED works",
            res_07.status_code == 200 and all_rejected and has_a_rejected,
            f"count={len(orders_07)}, all_rejected={all_rejected}")

# Test 08: Status filtering ?status=DUPLICATE_REVIEW
res_08 = client.get('/api/payments/manual/orders?status=DUPLICATE_REVIEW', headers=HEADERS_ORG_A)
data_08 = res_08.get_json() or {}
orders_08 = data_08.get('orders', [])
all_dup = all(o.get('status') == 'DUPLICATE_REVIEW' for o in orders_08)
has_a_dup = any(o.get('order_id') == 'UPI_P5_A_DUP' for o in orders_08)
record_test(8, "Status filter ?status=DUPLICATE_REVIEW works",
            res_08.status_code == 200 and all_dup and has_a_dup,
            f"count={len(orders_08)}, all_dup={all_dup}")

# Test 09: Status filtering ?status=ALL returns all statuses for the organizer
res_09 = client.get('/api/payments/manual/orders?status=ALL', headers=HEADERS_ORG_A)
data_09 = res_09.get_json() or {}
orders_09 = data_09.get('orders', [])
statuses = set(o.get('status') for o in orders_09)
record_test(9, "Status filter ?status=ALL returns all statuses",
            res_09.status_code == 200 and {'PENDING', 'VERIFIED', 'REJECTED', 'DUPLICATE_REVIEW'}.issubset(statuses),
            f"count={len(orders_09)}, statuses={statuses}")

# Test 10: ADMIN can see orders from ALL tournaments (Alpha and Bravo)
res_10 = client.get('/api/payments/manual/orders?status=ALL', headers=HEADERS_ADMIN)
data_10 = res_10.get_json() or {}
orders_10 = data_10.get('orders', [])
admin_order_ids = set(o.get('order_id') for o in orders_10)
record_test(10, "ADMIN can see orders across ALL tournaments",
            res_10.status_code == 200 and 'UPI_P5_A_PENDING' in admin_order_ids and 'UPI_P5_B_PENDING' in admin_order_ids,
            f"has_A={'UPI_P5_A_PENDING' in admin_order_ids}, has_B={'UPI_P5_B_PENDING' in admin_order_ids}")

# Test 11: registration_payload contains complete 4-player squad
res_11 = client.get('/api/payments/manual/orders?status=PENDING', headers=HEADERS_ORG_A)
data_11 = res_11.get_json() or {}
target_order = next((o for o in data_11.get('orders', []) if o.get('order_id') == 'UPI_P5_A_PENDING'), None)
payload = target_order.get('registration_payload') if target_order else {}
players = payload.get('players', []) if isinstance(payload, dict) else []
record_test(11, "registration_payload contains complete 4-player squad",
            len(players) == 4 and target_order.get('amount_paise') == 40000,
            f"players_count={len(players)}, amount_paise={target_order.get('amount_paise') if target_order else None}")

# Test 12: Counts summary dictionary returned in response
counts = data_03.get('counts', {})
record_test(12, "Counts summary returned in API response",
            'PENDING' in counts and 'ALL' in counts and counts.get('PENDING', 0) >= 1,
            f"counts={counts}")

print("=" * 80)
passed_count = sum(1 for r in TEST_RESULTS if r['status'] == 'PASS')
total_count = len(TEST_RESULTS)
print(f"SUMMARY: {passed_count} PASSED, {total_count - passed_count} FAILED (TOTAL {total_count})")
print("=" * 80)

if passed_count != total_count:
    sys.exit(1)
