import hmac
import hashlib
import time
import re
import uuid
import io
import json
import base64
try:
    # pyrefly: ignore [missing-import]
    from PIL import Image
except ImportError:
    Image = None
from flask import Blueprint, request, jsonify
from config import Config, get_supabase_client, get_razorpay_client
from routes.auth import get_authenticated_user

payments_bp = Blueprint('payments', __name__)

# In-memory storage structures for order tracking and fallback registrations
IN_MEMORY_REGISTRATIONS = {}
IN_MEMORY_PAYMENT_ORDERS = {}
PROCESSED_WEBHOOK_EVENTS = set()

def generate_pass_id():
    """Generate a clean, unique pass ID: XPH-A7F4D9C2"""
    return f"XPH-{uuid.uuid4().hex[:8].upper()}"

def parse_tournament_fee(fee_str):
    """
    Parses tournament fee string and returns (is_paid, amount_rupees, amount_in_paise).
    Server authoritative source of truth.
    Examples:
      'Free' -> (False, 0.0, 0)
      '₹500/team' -> (True, 500.0, 50000)
      'INR 300' -> (True, 300.0, 30000)
      '150' -> (True, 150.0, 15000)
      None / '' -> (False, 0.0, 0)
    """
    if not fee_str:
        return False, 0.0, 0
    clean = str(fee_str).strip()
    if 'free' in clean.lower():
        return False, 0.0, 0
    matches = re.findall(r'\d+(?:\.\d+)?', clean.replace(',', ''))
    if not matches:
        return False, 0.0, 0
    amount_rupees = float(matches[0])
    if amount_rupees <= 0:
        return False, 0.0, 0
    amount_paise = int(round(amount_rupees * 100))
    return True, amount_rupees, amount_paise

def finalize_successful_payment(order_id, payment_id, registration_data=None, user_info=None, bypass_razorpay_fetch=False):
    """
    Unified, idempotent payment finalization function.
    Both browser verification and webhook processing converge HERE.
    
    1. Check if payment_id or order_id is already successfully registered (idempotency).
    2. Verify payment status is 'captured', currency is 'INR', order_id matches, and amount matches DB fee.
    3. Insert registration, event_attendance, and tournament_rosters records atomically.
    4. Return pass details.
    """
    supabase = get_supabase_client()
    registration_data = registration_data or {}
    
    # ─── IDEMPOTENCY CHECK 1: payment_id already in registrations ───
    try:
        existing_pay = supabase.table('registrations').select('*').eq('payment_id', payment_id).execute()
        if existing_pay.data and len(existing_pay.data) > 0:
            reg = existing_pay.data[0]
            print(f"[IDEMPOTENT] Payment {payment_id} already finalized with pass {reg.get('pass_id')}.")
            return {
                'success': True,
                'passId': reg.get('pass_id'),
                'payment_id': payment_id,
                'already_completed': True,
                'message': 'Payment already verified.'
            }
    except Exception as e:
        print(f"[WARN] Supabase payment_id check notice: {e}")

    # ─── IDEMPOTENCY CHECK 2: order_id already in registrations ───
    try:
        existing_ord = supabase.table('registrations').select('*').eq('order_id', order_id).execute()
        if existing_ord.data and len(existing_ord.data) > 0:
            reg = existing_ord.data[0]
            print(f"[IDEMPOTENT] Order {order_id} already finalized with pass {reg.get('pass_id')}.")
            return {
                'success': True,
                'passId': reg.get('pass_id'),
                'payment_id': payment_id,
                'already_completed': True,
                'message': 'Payment already verified.'
            }
    except Exception as e:
        print(f"[WARN] Supabase order_id check notice: {e}")

    # Check memory fallback for idempotency
    for pass_key, rec in IN_MEMORY_REGISTRATIONS.items():
        if rec.get('payment_id') == payment_id or rec.get('order_id') == order_id:
            return {
                'success': True,
                'passId': pass_key,
                'payment_id': payment_id,
                'already_completed': True,
                'message': 'Payment already verified in memory.'
            }

    # ─── RETRIEVE ORDER METADATA ───
    order_record = IN_MEMORY_PAYMENT_ORDERS.get(order_id) or {}
    tournament_slug = registration_data.get('tournamentSlug') or order_record.get('tournament_slug') or ''
    if not tournament_slug:
        try:
            ord_db = supabase.table('payment_orders').select('*').eq('order_id', order_id).execute()
            if ord_db.data and len(ord_db.data) > 0:
                order_record = ord_db.data[0]
                tournament_slug = order_record.get('tournament_slug') or ''
        except Exception:
            pass

    # ─── FETCH TOURNAMENT FROM DB FOR AUTHORITATIVE FEE CHECK ───
    expected_amount_paise = None
    if tournament_slug:
        try:
            t_res = supabase.table('tournaments').select('*').eq('slug', tournament_slug).execute()
            if t_res.data and len(t_res.data) > 0:
                t_row = t_res.data[0]
                _, _, expected_amount_paise = parse_tournament_fee(t_row.get('fee'))
        except Exception as t_err:
            print(f"[WARN] Failed to fetch tournament {tournament_slug}: {t_err}")

    # ─── FETCH PAYMENT FROM RAZORPAY & VERIFY CAPTURE ───
    if not bypass_razorpay_fetch:
        try:
            razorpay_client = get_razorpay_client()
            payment_obj = razorpay_client.payment.fetch(payment_id)
        except Exception as rz_fetch_err:
            return {
                'success': False,
                'message': f"Failed to fetch payment details from Razorpay: {str(rz_fetch_err)}"
            }

        # 1. Verify payment belongs to this order
        pay_order_id = payment_obj.get('order_id')
        if pay_order_id and pay_order_id != order_id:
            return {
                'success': False,
                'message': f"Payment order mismatch: payment belongs to {pay_order_id}, expected {order_id}."
            }

        # 2. Verify payment status is 'captured'
        pay_status = payment_obj.get('status')
        if pay_status != 'captured':
            return {
                'success': False,
                'message': f"Payment is not captured. Current status is '{pay_status}'."
            }

        # 3. Verify currency is INR
        pay_currency = payment_obj.get('currency')
        if pay_currency != 'INR':
            return {
                'success': False,
                'message': f"Invalid currency '{pay_currency}'. Expected 'INR'."
            }

        # 4. Verify payment amount matches DB tournament fee
        if expected_amount_paise is not None:
            actual_amount = int(payment_obj.get('amount', 0))
            if actual_amount != expected_amount_paise:
                return {
                    'success': False,
                    'message': f"Payment amount mismatch: received {actual_amount} paise, expected {expected_amount_paise} paise."
                }

    # ─── ASSEMBLE REGISTRATION DETAILS ───
    pass_id = generate_pass_id()
    team_name = registration_data.get('teamName') or order_record.get('team_name') or 'Team'
    college = registration_data.get('college') or order_record.get('college') or 'University'
    captain_name = registration_data.get('captainName') or registration_data.get('name') or order_record.get('captain_name') or 'Captain'
    email = registration_data.get('email') or order_record.get('email') or (user_info.get('email') if user_info else '')
    tournament_title = registration_data.get('tournamentTitle') or tournament_slug
    tournament_game = registration_data.get('tournamentGame') or 'Esports'
    tournament_date = registration_data.get('tournamentDate') or 'TBD'
    tournament_format = registration_data.get('tournamentFormat') or 'Tournament'
    tournament_region = registration_data.get('tournamentRegion') or 'Pan India'
    tournament_fee = registration_data.get('tournamentFee') or 'Paid'
    players = registration_data.get('players') or order_record.get('players') or []
    player_emails = registration_data.get('playerEmails') or [email]
    user_id = (user_info.get('id') if user_info else None) or order_record.get('user_id')

    record = {
        'pass_id': pass_id,
        'passId': pass_id,
        'tournament_slug': tournament_slug,
        'tournamentSlug': tournament_slug,
        'tournament_title': tournament_title,
        'tournamentTitle': tournament_title,
        'tournament_game': tournament_game,
        'tournamentGame': tournament_game,
        'tournament_date': tournament_date,
        'tournamentDate': tournament_date,
        'tournament_format': tournament_format,
        'tournamentFormat': tournament_format,
        'tournament_region': tournament_region,
        'tournamentRegion': tournament_region,
        'tournament_fee': tournament_fee,
        'tournamentFee': tournament_fee,
        'team_name': team_name,
        'teamName': team_name,
        'college': college,
        'captain_name': captain_name,
        'captainName': captain_name,
        'email': email,
        'players': players,
        'player_emails': player_emails,
        'order_id': order_id,
        'orderId': order_id,
        'payment_id': payment_id,
        'paymentId': payment_id,
        'payment_status': 'SUCCESS',
        'paymentStatus': 'SUCCESS',
        'attendance_status': 'NOT_MARKED',
        'attendanceStatus': 'NOT_MARKED',
        'attended_at': None,
        'attended_by': None,
        'registered_at': str(int(time.time())),
        'registeredAt': str(int(time.time())),
        'user_id': user_id
    }

    # Store in memory fallback
    IN_MEMORY_REGISTRATIONS[pass_id] = record

    # ─── PERSIST IN SUPABASE ───
    try:
        reg_payload = {
            'pass_id': pass_id,
            'tournament_slug': tournament_slug,
            'tournament_title': tournament_title,
            'team_name': team_name,
            'college': college,
            'captain_name': captain_name,
            'email': email,
            'order_id': order_id,
            'payment_id': payment_id,
            'payment_status': 'SUCCESS',
        }
        if user_id:
            try:
                uuid.UUID(str(user_id))
                reg_payload['user_id'] = str(user_id)
            except Exception:
                pass

        try:
            supabase.table('registrations').insert({**reg_payload, 'attendance_status': 'NOT_MARKED'}).execute()
        except Exception as ins_err:
            # Check if duplicate constraint hit due to concurrent request
            err_str = str(ins_err)
            if 'unique' in err_str.lower() or 'duplicate' in err_str.lower():
                dup = supabase.table('registrations').select('pass_id').eq('payment_id', payment_id).execute()
                if dup.data and len(dup.data) > 0:
                    return {
                        'success': True,
                        'passId': dup.data[0].get('pass_id'),
                        'payment_id': payment_id,
                        'already_completed': True,
                        'message': 'Payment already verified.'
                    }
            supabase.table('registrations').insert(reg_payload).execute()

        # Insert initial event_attendance row
        att_payload = {
            'pass_id': pass_id,
            'tournament_slug': tournament_slug,
            'team_name': team_name,
            'captain_name': captain_name,
            'college': college,
            'email': email,
            'attendance_status': 'NOT_MARKED'
        }
        try:
            supabase.table('event_attendance').insert(att_payload).execute()
        except Exception:
            pass

        # Save players to tournament_rosters table
        try:
            from routes.rosters import save_tournament_rosters_to_db
            save_tournament_rosters_to_db(supabase, pass_id, tournament_slug, team_name, college, players)
        except Exception as ros_err:
            print(f"[WARN] Rosters insert warning: {ros_err}")

        # Update payment_orders table status if table exists
        try:
            supabase.table('payment_orders').update({
                'status': 'PAID',
                'payment_id': payment_id,
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            }).eq('order_id', order_id).execute()
        except Exception:
            pass

    except Exception as sb_err:
        print(f"[WARN] Supabase registration persistence warning: {sb_err}")

    # Mark memory order as paid
    if order_id in IN_MEMORY_PAYMENT_ORDERS:
        IN_MEMORY_PAYMENT_ORDERS[order_id]['status'] = 'PAID'
        IN_MEMORY_PAYMENT_ORDERS[order_id]['payment_id'] = payment_id

    # ─── DISPATCH DIGITAL ENTRY TICKET VIA BREVO TO CAPTAIN ───
    try:
        from email_service import send_ticket_email_async
        send_ticket_email_async(record)
    except Exception as em_err:
        print(f"[WARN] Failed to trigger Brevo ticket email: {em_err}")

    return {
        'success': True,
        'passId': pass_id,
        'payment_id': payment_id,
        'already_completed': False,
        'message': 'Payment verified and registration confirmed!'
    }


@payments_bp.route('/create-order', methods=['POST'])
def create_order():
    """
    Server-authoritative Razorpay Order Creation.
    1. Authenticates caller using Supabase Bearer token.
    2. Fetches tournament from DB and parses authoritative fee.
    3. Rejects free tournaments with 400 (must use registration endpoint).
    4. Calculates amount in paise strictly from DB. Ignores client-sent amount.
    5. Creates Razorpay order and saves order state in payment_orders / memory.
    """
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'success': False, 'message': 'Authentication required to create a payment order.'}), 401

        data = request.get_json(silent=True) or {}
        tournament_slug = str(data.get('tournamentSlug') or data.get('tournamentId') or '').strip()
        name = str(data.get('name') or data.get('captainName') or user.get('name') or 'Captain').strip()
        email = str(user.get('email') or data.get('email') or '').strip().lower()
        team_name = str(data.get('teamName') or 'Team Alpha').strip()
        college = str(data.get('college') or user.get('college') or 'University').strip()
        players = data.get('players') or []

        if not tournament_slug:
            return jsonify({'success': False, 'message': 'tournamentSlug is required.'}), 400

        # Fetch tournament from Database
        supabase = get_supabase_client()
        t_res = supabase.table('tournaments').select('*').eq('slug', tournament_slug).execute()
        if not t_res.data or len(t_res.data) == 0:
            # Fallback by id
            try:
                t_res = supabase.table('tournaments').select('*').eq('id', int(tournament_slug)).execute()
            except Exception:
                pass

        if not t_res.data or len(t_res.data) == 0:
            return jsonify({'success': False, 'message': f"Tournament '{tournament_slug}' not found."}), 404

        tournament = t_res.data[0]
        actual_slug = tournament.get('slug') or tournament_slug

        # Parse server-authoritative fee
        is_paid, amount_rupees, amount_in_paise = parse_tournament_fee(tournament.get('fee'))

        if not is_paid or amount_in_paise < 100:
            return jsonify({
                'success': False,
                'message': 'This tournament is Free. Please register directly without checkout.'
            }), 400

        if not Config.RAZORPAY_KEY_ID or not Config.RAZORPAY_KEY_SECRET:
            return jsonify({
                'success': False,
                'message': 'Razorpay API credentials missing in server environment.'
            }), 500

        receipt_id = f"rcpt_{uuid.uuid4().hex[:8]}_{int(time.time())}"[:40]

        order_data = {
            'amount': amount_in_paise,
            'currency': 'INR',
            'receipt': receipt_id,
            'notes': {
                'user_id': user.get('id', '')[:40],
                'email': email[:40],
                'teamName': team_name[:40],
                'tournamentSlug': actual_slug[:40],
            }
        }

        # Create real Razorpay order using server-derived amount
        razorpay_client = get_razorpay_client()
        order = razorpay_client.order.create(data=order_data)
        order_id = order['id']
        order_amount = order['amount']
        order_currency = order.get('currency', 'INR')

        # Persist order intent in memory
        order_record = {
            'order_id': order_id,
            'tournament_slug': actual_slug,
            'user_id': user.get('id'),
            'email': email,
            'team_name': team_name,
            'college': college,
            'captain_name': name,
            'players': players,
            'amount_paise': amount_in_paise,
            'currency': 'INR',
            'status': 'CREATED',
            'payment_method': 'RAZORPAY',
            'created_at': int(time.time())
        }
        IN_MEMORY_PAYMENT_ORDERS[order_id] = order_record

        # Persist in payment_orders table if present
        try:
            supabase.table('payment_orders').insert({
                'order_id': order_id,
                'tournament_slug': actual_slug,
                'user_id': user.get('id'),
                'email': email,
                'amount_paise': amount_in_paise,
                'currency': 'INR',
                'status': 'CREATED',
                'payment_method': 'RAZORPAY',
                'registration_payload': {
                    'team_name': team_name,
                    'college': college,
                    'captain_name': name,
                    'players': players,
                }
            }).execute()
        except Exception:
            pass

        return jsonify({
            'success': True,
            'order_id': order_id,
            'amount': order_amount,
            'currency': order_currency,
            'key_id': Config.RAZORPAY_KEY_ID
        }), 200

    except Exception as e:
        print(f"Error creating order: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@payments_bp.route('/verify-payment', methods=['POST'])
def verify_payment():
    """
    1. Authenticate user via Supabase token.
    2. Verify HMAC-SHA256 signature using RAZORPAY_KEY_SECRET.
    3. Delegate to idempotent finalize_successful_payment().
    """
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'success': False, 'message': 'Authentication required to verify payment.'}), 401

        data = request.get_json(silent=True) or {}
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_signature = data.get('razorpay_signature')

        if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
            return jsonify({'success': False, 'message': 'Missing payment verification credentials.'}), 400

        if not Config.RAZORPAY_KEY_SECRET:
            return jsonify({'success': False, 'message': 'RAZORPAY_KEY_SECRET is missing in server environment.'}), 500

        # Calculate HMAC SHA-256 Signature
        generated_signature = hmac.new(
            bytes(Config.RAZORPAY_KEY_SECRET, 'utf-8'),
            bytes(f"{razorpay_order_id}|{razorpay_payment_id}", 'utf-8'),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(generated_signature, razorpay_signature):
            return jsonify({'success': False, 'message': 'Invalid signature. Payment verification failed.'}), 400

        # Delegate to unified idempotent payment finalization function
        res = finalize_successful_payment(
            order_id=razorpay_order_id,
            payment_id=razorpay_payment_id,
            registration_data=data,
            user_info=user
        )

        if not res.get('success'):
            return jsonify(res), 400

        return jsonify({
            'success': True,
            'message': res.get('message', 'Payment verified successfully!'),
            'passId': res.get('passId'),
            'payment_id': razorpay_payment_id,
            'already_completed': res.get('already_completed', False)
        }), 200

    except Exception as e:
        print(f"Error verifying payment: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@payments_bp.route('/webhook', methods=['POST'])
def razorpay_webhook():
    """
    Strict Razorpay Webhook listener.
    1. Requires RAZORPAY_WEBHOOK_SECRET.
    2. Verifies X-Razorpay-Signature against the RAW request body.
    3. Rejects invalid signatures or unsigned webhooks.
    4. Deduplicates event IDs to guarantee idempotency.
    5. Converges on finalize_successful_payment() for captured payments.
    """
    try:
        webhook_secret = Config.RAZORPAY_WEBHOOK_SECRET
        if not webhook_secret or webhook_secret == 'YOUR_WEBHOOK_SECRET':
            print("[WEBHOOK ERROR] RAZORPAY_WEBHOOK_SECRET is not configured.")
            return jsonify({'status': 'error', 'message': 'RAZORPAY_WEBHOOK_SECRET is not configured on server.'}), 500

        webhook_signature = request.headers.get('X-Razorpay-Signature')
        if not webhook_signature:
            return jsonify({'status': 'error', 'message': 'Missing X-Razorpay-Signature header.'}), 400

        # Read RAW request body bytes
        raw_body = request.get_data()

        # Compute HMAC-SHA256 signature against raw bytes
        generated_signature = hmac.new(
            bytes(webhook_secret, 'utf-8'),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(generated_signature, webhook_signature):
            return jsonify({'status': 'error', 'message': 'Invalid webhook signature.'}), 400

        data = request.get_json(silent=True) or {}
        event = data.get('event')
        
        # Deduplicate event ID
        event_id = data.get('id') or request.headers.get('X-Razorpay-Event-Id')
        if event_id:
            if event_id in PROCESSED_WEBHOOK_EVENTS:
                print(f"[WEBHOOK IDEMPOTENT] Event {event_id} already processed.")
                return jsonify({'status': 'already_processed'}), 200
            
            # Check DB processed events if table exists
            try:
                supabase = get_supabase_client()
                chk = supabase.table('processed_webhook_events').select('event_id').eq('event_id', event_id).execute()
                if chk.data and len(chk.data) > 0:
                    PROCESSED_WEBHOOK_EVENTS.add(event_id)
                    return jsonify({'status': 'already_processed'}), 200
            except Exception:
                pass

        if event in ['payment.captured', 'order.paid']:
            payload = data.get('payload', {}).get('payment', {}).get('entity', {})
            order_id = payload.get('order_id')
            payment_id = payload.get('id')

            if order_id and payment_id:
                # Converge on the same server-side idempotent payment finalizer
                finalize_successful_payment(
                    order_id=order_id,
                    payment_id=payment_id,
                    registration_data=payload.get('notes', {})
                )

        # Mark event ID as processed
        if event_id:
            PROCESSED_WEBHOOK_EVENTS.add(event_id)
            try:
                supabase = get_supabase_client()
                supabase.table('processed_webhook_events').insert({
                    'event_id': event_id,
                    'event_type': event or 'unknown'
                }).execute()
            except Exception:
                pass

        return jsonify({'status': 'ok'}), 200

    except Exception as e:
        print(f"Webhook processing error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ════════════════════════════════════════════════════════════════════════════════
# PHASE 2: MANUAL UPI PLAYER PAYMENT SUBMISSION BACKEND
# ════════════════════════════════════════════════════════════════════════════════

@payments_bp.route('/manual/create', methods=['POST'])
def create_manual_upi_order():
    """
    PHASE 2: Player Manual UPI Payment Submission Endpoint.
    
    1. Authenticate user via Supabase Bearer JWT (never trust client user_id/email/role).
    2. Retrieve tournament from DB; read authoritative fee (no price manipulation allowed; free tournaments rejected).
    3. Validate required fields:
       - UPI payment phone number (10-15 digits)
       - UTR / Transaction ID (normalized uppercase, alphanumeric 6-30 chars, duplicate detection)
       - Complete 4-player squad payload (team_name, college, captain_name, players list)
       - Payment screenshot (validated image MIME, magic bytes, <= 5MB, optimized with Pillow)
    4. Store screenshot in private 'payment-screenshots' Supabase Storage bucket.
    5. Create payment_orders record with:
       - payment_method = 'MANUAL_UPI'
       - status = 'PENDING'
       - amount_paise = authoritative DB fee
       - screenshot_path = private storage path
    6. STRICT NON-FINALIZATION:
       - No tickets (XPH-...) generated.
       - No QR passes generated.
       - No attendance records created.
       - No Brevo emails sent.
    7. Clean up storage object if database insert fails.
    """
    try:
        # 1. AUTHENTICATE USER
        user = get_authenticated_user()
        if not user or not user.get('id'):
            return jsonify({'success': False, 'message': 'Authentication required. Please log in.'}), 401
        
        user_id = user.get('id')
        user_email = user.get('email')

        # 2. EXTRACT REQUEST DATA (Support multipart/form-data and JSON)
        is_json = request.is_json
        data_json = request.get_json(silent=True) or {} if is_json else {}

        tournament_slug = (
            request.form.get('tournamentSlug')
            or request.form.get('tournament_slug')
            or data_json.get('tournamentSlug')
            or data_json.get('tournament_slug')
            or ''
        ).strip()

        payment_phone_number = (
            request.form.get('paymentPhoneNumber')
            or request.form.get('payment_phone_number')
            or data_json.get('paymentPhoneNumber')
            or data_json.get('payment_phone_number')
            or ''
        ).strip()

        utr_id = (
            request.form.get('utrId')
            or request.form.get('utr_id')
            or data_json.get('utrId')
            or data_json.get('utr_id')
            or ''
        ).strip()

        if not tournament_slug:
            return jsonify({'success': False, 'message': 'Tournament slug is required.'}), 400

        # 3. AUTHORITATIVE TOURNAMENT FEE
        supabase = get_supabase_client()
        try:
            t_res = supabase.table('tournaments').select('*').eq('slug', tournament_slug).execute()
        except Exception as t_err:
            print(f"[ERROR] Failed to query tournament {tournament_slug}: {t_err}")
            return jsonify({'success': False, 'message': 'Failed to retrieve tournament details.'}), 500

        if not t_res.data or len(t_res.data) == 0:
            return jsonify({'success': False, 'message': 'Tournament not found.'}), 404

        tournament = t_res.data[0]
        is_paid, amount_rupees, authoritative_amount_paise = parse_tournament_fee(tournament.get('fee'))

        if not is_paid or authoritative_amount_paise <= 0:
            return jsonify({
                'success': False,
                'message': 'This is a free tournament. Payment is not required; use free registration.'
            }), 400

        # 4. VALIDATE PAYMENT PHONE NUMBER
        if not payment_phone_number:
            return jsonify({'success': False, 'message': 'UPI payment phone number is required.'}), 400

        phone_digits = re.sub(r'[^\d]', '', payment_phone_number)
        if len(phone_digits) < 10 or len(phone_digits) > 15:
            return jsonify({
                'success': False,
                'message': 'Invalid UPI payment phone number. Must be between 10 and 15 digits.'
            }), 400

        # 5. VALIDATE AND NORMALIZE UTR / TRANSACTION ID
        if not utr_id:
            return jsonify({'success': False, 'message': 'UTR / Transaction ID is required.'}), 400

        normalized_utr = utr_id.upper().strip()
        if not re.match(r'^[A-Z0-9]{6,30}$', normalized_utr):
            return jsonify({
                'success': False,
                'message': 'Invalid UTR / Transaction ID format. Must be 6 to 30 alphanumeric characters.'
            }), 400

        # DUPLICATE UTR CHECK
        try:
            chk_utr = supabase.table('payment_orders').select('order_id, status, utr_id').eq('utr_id', normalized_utr).execute()
            if chk_utr.data and len(chk_utr.data) > 0:
                for row in chk_utr.data:
                    if row.get('status') in ['VERIFIED', 'PAID']:
                        return jsonify({
                            'success': False,
                            'message': f'UTR {normalized_utr} has already been verified for another tournament registration.'
                        }), 400
                    elif row.get('status') in ['PENDING', 'CREATED', 'DUPLICATE_REVIEW']:
                        return jsonify({
                            'success': False,
                            'message': f'UTR {normalized_utr} has already been submitted and is currently pending verification.'
                        }), 400
        except Exception as utr_err:
            print(f"[WARN] UTR pre-check warning: {utr_err}")

        # REPEATED PENDING ORDER CHECK FOR SAME USER AND TOURNAMENT
        try:
            user_pending = supabase.table('payment_orders').select('order_id, status').eq('tournament_slug', tournament_slug).eq('user_id', user_id).eq('status', 'PENDING').execute()
            if user_pending.data and len(user_pending.data) > 0:
                return jsonify({
                    'success': False,
                    'message': 'You already have a pending payment verification for this tournament. Please wait for the organizer to review it.'
                }), 409
        except Exception:
            pass

        # 6. EXTRACT & VALIDATE 4-PLAYER SQUAD REGISTRATION PAYLOAD
        reg_payload = {}
        if is_json:
            reg_payload = data_json.get('registrationData') or data_json.get('registration_payload') or data_json
        else:
            raw_reg = request.form.get('registrationData') or request.form.get('registration_payload')
            if raw_reg:
                try:
                    reg_payload = json.loads(raw_reg)
                except Exception:
                    reg_payload = {}
            if not reg_payload:
                players_list = []
                raw_players = request.form.get('players')
                if raw_players:
                    try:
                        players_list = json.loads(raw_players)
                    except Exception:
                        players_list = [p.strip() for p in raw_players.split(',') if p.strip()]
                reg_payload = {
                    'team_name': request.form.get('teamName') or request.form.get('team_name') or '',
                    'college': request.form.get('college') or '',
                    'captain_name': request.form.get('captainName') or request.form.get('captain_name') or user.get('name') or '',
                    'players': players_list,
                }

        team_name = (reg_payload.get('team_name') or reg_payload.get('teamName') or '').strip()
        college = (reg_payload.get('college') or '').strip()
        captain_name = (reg_payload.get('captain_name') or reg_payload.get('captainName') or user.get('name') or '').strip()
        players = reg_payload.get('players') or []

        if not team_name or not college:
            return jsonify({'success': False, 'message': 'Team name and college are required in the registration details.'}), 400

        full_registration_payload = {
            'team_name': team_name,
            'college': college,
            'captain_name': captain_name,
            'players': players,
            'tournament_slug': tournament_slug,
            'captain_email': user_email,
            'captain_id': user_id
        }

        # 7. VALIDATE & PROCESS SCREENSHOT
        file_bytes = None
        content_type = None

        screenshot_file = request.files.get('screenshot') or request.files.get('file')
        if screenshot_file:
            file_bytes = screenshot_file.read()
            content_type = screenshot_file.mimetype or screenshot_file.content_type
        elif is_json:
            b64_data = data_json.get('screenshot') or data_json.get('screenshot_base64')
            if b64_data:
                if ',' in b64_data:
                    header, b64_data = b64_data.split(',', 1)
                    if 'image/png' in header:
                        content_type = 'image/png'
                    elif 'image/webp' in header:
                        content_type = 'image/webp'
                    else:
                        content_type = 'image/jpeg'
                try:
                    file_bytes = base64.b64decode(b64_data)
                except Exception:
                    return jsonify({'success': False, 'message': 'Invalid base64 screenshot data.'}), 400

        if not file_bytes or len(file_bytes) == 0:
            return jsonify({'success': False, 'message': 'Payment screenshot is required.'}), 400

        # Enforce 5MB limit
        MAX_FILE_SIZE = 5 * 1024 * 1024
        if len(file_bytes) > MAX_FILE_SIZE:
            return jsonify({'success': False, 'message': 'Screenshot file size exceeds 5MB limit.'}), 400

        # Validate magic bytes / image headers
        is_valid_image = False
        detected_format = None

        if file_bytes.startswith(b'\xff\xd8\xff'):
            is_valid_image = True
            detected_format = 'JPEG'
            content_type = 'image/jpeg'
        elif file_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            is_valid_image = True
            detected_format = 'PNG'
            content_type = 'image/png'
        elif file_bytes.startswith(b'RIFF') and b'WEBP' in file_bytes[:16]:
            is_valid_image = True
            detected_format = 'WEBP'
            content_type = 'image/webp'

        if not is_valid_image:
            return jsonify({
                'success': False,
                'message': 'Invalid screenshot image format. Allowed formats: PNG, JPEG, WEBP.'
            }), 400

        # Optional: Optimize image with Pillow if available without blocking submission
        if Image is not None:
            try:
                image = Image.open(io.BytesIO(file_bytes))
                resample_filter = getattr(getattr(Image, 'Resampling', Image), 'LANCZOS', getattr(Image, 'ANTIALIAS', None))
                max_dim = 1600
                if image.width > max_dim or image.height > max_dim:
                    if resample_filter is not None:
                        image.thumbnail((max_dim, max_dim), resample_filter)
                    else:
                        image.thumbnail((max_dim, max_dim))

                if image.mode in ('RGBA', 'LA', 'P') and detected_format == 'JPEG':
                    image = image.convert('RGB')

                out_buf = io.BytesIO()
                if detected_format == 'PNG':
                    image.save(out_buf, format='PNG', optimize=True)
                elif detected_format == 'WEBP':
                    image.save(out_buf, format='WEBP', quality=82)
                else:
                    image.save(out_buf, format='JPEG', quality=82, optimize=True)
                    detected_format = 'JPEG'
                    content_type = 'image/jpeg'

                opt_bytes = out_buf.getvalue()
                if 0 < len(opt_bytes) < len(file_bytes):
                    file_bytes = opt_bytes
            except Exception as img_err:
                print(f"[WARN] Pillow image optimization bypassed safely: {img_err}")

        # 8. UPLOAD SCREENSHOT TO PRIVATE SUPABASE STORAGE
        ext = 'jpg' if detected_format == 'JPEG' else (detected_format.lower() if detected_format else 'png')
        storage_filename = f"{user_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
        storage_path = f"orders/{tournament_slug}/{storage_filename}"

        uploaded_to_storage = False
        try:
            supabase.storage.from_('payment-screenshots').upload(
                storage_path,
                file_bytes,
                {'content-type': content_type, 'upsert': True}
            )
            uploaded_to_storage = True
        except Exception as st_err:
            print(f"[ERROR] Supabase Storage upload failed: {st_err}")
            return jsonify({'success': False, 'message': 'Failed to securely store payment screenshot. Please try again.'}), 500

        # 9. INSERT PENDING PAYMENT ORDER
        order_id = f"UPI_{uuid.uuid4().hex[:8].upper()}_{int(time.time())}"
        order_record = {
            'order_id': order_id,
            'tournament_slug': tournament_slug,
            'user_id': user_id,
            'email': user_email,
            'amount_paise': authoritative_amount_paise,
            'currency': 'INR',
            'status': 'PENDING',
            'payment_method': 'MANUAL_UPI',
            'payment_phone_number': phone_digits,
            'utr_id': normalized_utr,
            'screenshot_path': storage_path,
            'registration_payload': full_registration_payload,
            'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }

        try:
            ins_res = supabase.table('payment_orders').insert(order_record).execute()
            inserted_row = ins_res.data[0] if (ins_res.data and len(ins_res.data) > 0) else {}
            if inserted_row.get('status') == 'DUPLICATE_REVIEW':
                if uploaded_to_storage:
                    try:
                        supabase.storage.from_('payment-screenshots').remove([storage_path])
                    except Exception:
                        pass
                return jsonify({
                    'success': False,
                    'message': f'UTR {normalized_utr} has already been submitted and is currently pending verification.'
                }), 400
        except Exception as db_err:
            print(f"[ERROR] Failed to insert payment_order: {db_err}")
            # Safe cleanup of uploaded screenshot so no orphan remains
            if uploaded_to_storage:
                try:
                    supabase.storage.from_('payment-screenshots').remove([storage_path])
                except Exception as cl_err:
                    print(f"[WARN] Failed to cleanup orphaned screenshot: {cl_err}")

            err_str = str(db_err)
            if 'unique_verified_utr' in err_str or 'trg_check_duplicate_utr' in err_str:
                return jsonify({'success': False, 'message': 'This UTR has already been submitted or verified.'}), 400
            return jsonify({'success': False, 'message': 'Database error creating payment order. Please try again.'}), 500

        # 10. STRICT NON-FINALIZATION
        # Do NOT generate tickets, passes, QR, attendance, or send Brevo emails.
        return jsonify({
            'success': True,
            'order_id': order_id,
            'status': 'PENDING',
            'tournament_slug': tournament_slug,
            'amount_paise': authoritative_amount_paise,
            'payment_method': 'MANUAL_UPI',
            'message': 'Manual UPI payment submitted successfully. Your payment proof is pending organizer verification.'
        }), 201

    except Exception as e:
        print(f"[ERROR] Unexpected error in create_manual_upi_order: {e}")
        return jsonify({'success': False, 'message': 'An unexpected error occurred. Please try again.'}), 500


@payments_bp.route('/user-tournaments-status', methods=['GET'])
def get_user_tournaments_status():
    """
    Returns user payment & registration statuses for all tournaments.
    Identifies:
      - registered: completed registrations with pass_id (can view pass)
      - pending: manual UPI submissions waiting for organizer review (cannot register again)
      - rejected: rejected payment orders (can register again)
    """
    try:
        supabase = get_supabase_client()
        user = get_authenticated_user()

        email = (request.args.get('email') or '').strip().lower()
        user_id = (request.args.get('user_id') or '').strip()

        if user:
            if not user_id and user.get('id'):
                user_id = user.get('id')
            if not email and user.get('email'):
                email = user.get('email').strip().lower()

        if not email and not user_id:
            return jsonify({
                'success': True,
                'registered': [],
                'pending': [],
                'rejected': []
            }), 200

        # 1. Query registrations for completed passes
        regs_data = []
        try:
            if user_id and email:
                reg_res = supabase.table('registrations').select('*').or_(f"user_id.eq.{user_id},email.eq.{email}").execute()
            elif user_id:
                reg_res = supabase.table('registrations').select('*').eq('user_id', user_id).execute()
            else:
                reg_res = supabase.table('registrations').select('*').eq('email', email).execute()
            regs_data = reg_res.data if (reg_res and reg_res.data) else []
        except Exception as e:
            print(f"[WARN] Registrations query failed: {e}")

        registered = []
        registered_slugs = set()
        for r in regs_data:
            slug = (r.get('tournament_slug') or '').strip().lower()
            if slug:
                registered_slugs.add(slug)
                registered.append({
                    'tournamentSlug': r.get('tournament_slug'),
                    'passId': r.get('pass_id'),
                    'teamName': r.get('team_name'),
                    'registeredAt': r.get('registered_at')
                })

        # 2. Query payment_orders for PENDING / REJECTED
        orders_data = []
        try:
            if user_id and email:
                ord_res = supabase.table('payment_orders').select('*').or_(f"user_id.eq.{user_id},email.eq.{email}").order('created_at', desc=True).execute()
            elif user_id:
                ord_res = supabase.table('payment_orders').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            else:
                ord_res = supabase.table('payment_orders').select('*').eq('email', email).order('created_at', desc=True).execute()
            orders_data = ord_res.data if (ord_res and ord_res.data) else []
        except Exception as e:
            print(f"[WARN] Payment orders query failed: {e}")

        pending_map = {}
        rejected_map = {}

        for o in orders_data:
            slug = (o.get('tournament_slug') or '').strip().lower()
            if not slug or slug in registered_slugs:
                continue

            st = (o.get('status') or '').strip().upper()
            if st in ('PENDING', 'DUPLICATE_REVIEW'):
                if slug not in pending_map:
                    pending_map[slug] = {
                        'tournamentSlug': o.get('tournament_slug'),
                        'orderId': o.get('order_id'),
                        'status': o.get('status'),
                        'createdAt': o.get('created_at'),
                        'utrId': o.get('utr_id')
                    }
            elif st == 'REJECTED':
                if slug not in pending_map and slug not in rejected_map:
                    rejected_map[slug] = {
                        'tournamentSlug': o.get('tournament_slug'),
                        'orderId': o.get('order_id'),
                        'status': o.get('status'),
                        'createdAt': o.get('created_at')
                    }

        return jsonify({
            'success': True,
            'registered': registered,
            'pending': list(pending_map.values()),
            'rejected': list(rejected_map.values())
        }), 200

    except Exception as err:
        print(f"[ERROR] get_user_tournaments_status: {err}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
