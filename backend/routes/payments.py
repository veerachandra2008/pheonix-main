import hmac
import hashlib
import time
import uuid
from flask import Blueprint, request, jsonify
from config import Config, get_supabase_client, get_razorpay_client

payments_bp = Blueprint('payments', __name__)

# Fallback in-memory storage for registrations if Supabase table is unavailable
IN_MEMORY_REGISTRATIONS = {}

def generate_pass_id():
    """Generate a clean, unique pass ID: XPH-A7F4D9C2"""
    return f"XPH-{uuid.uuid4().hex[:8].upper()}"

@payments_bp.route('/create-order', methods=['POST'])
def create_order():
    """
    1. Create Razorpay Order securely using real Test/Live credentials
    2. Save initial PENDING registration to Supabase
    """
    try:
        data = request.get_json() or {}
        amount = data.get('amount')
        name = data.get('name') or data.get('captainName')
        email = data.get('email')
        team_name = data.get('teamName')
        tournament_slug = data.get('tournamentSlug') or data.get('tournamentId')

        if amount is None or not name or not email or not team_name:
            return jsonify({'success': False, 'message': 'Amount, name, email, and teamName are required.'}), 400

        # Convert amount to float safely
        try:
            amount_val = float(amount)
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid amount value.'}), 400

        # Razorpay amount is in paise (1 INR = 100 paise)
        amount_in_paise = int(round(amount_val * 100))

        if amount_in_paise <= 0:
            return jsonify({'success': False, 'message': 'Payment amount must be greater than 0 for paid checkout.'}), 400

        if not Config.RAZORPAY_KEY_ID or not Config.RAZORPAY_KEY_SECRET:
            return jsonify({
                'success': False,
                'message': 'Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing on the backend.'
            }), 500

        receipt_id = f"rcpt_{uuid.uuid4().hex[:8]}_{int(time.time())}"[:40]

        order_data = {
            'amount': amount_in_paise,
            'currency': 'INR',
            'receipt': receipt_id,
            'notes': {
                'name': name,
                'email': email,
                'teamName': team_name,
                'tournamentSlug': tournament_slug or '',
            }
        }

        # Safely create real Razorpay Order
        try:
            razorpay_client = get_razorpay_client()
            order = razorpay_client.order.create(data=order_data)
            order_id = order['id']
            order_amount = order['amount']
            order_currency = order.get('currency', 'INR')
        except Exception as rz_err:
            print(f"Razorpay Order Error: {rz_err}")
            return jsonify({
                'success': False,
                'message': f"Razorpay Order Creation Failed: {str(rz_err)}"
            }), 400

        # Save record to Supabase as PENDING if Supabase is reachable
        try:
            supabase = get_supabase_client()
            registration_payload = {
                'tournament_slug': tournament_slug,
                'captain_name': name,
                'captain_email': email,
                'team_name': team_name,
                'amount': amount_val,
                'payment_status': 'PENDING',
                'order_id': order_id
            }
            supabase.table('tournament_registrations').insert(registration_payload).execute()
        except Exception as sb_err:
            print(f"Supabase Warning (Pending Order): {sb_err}")

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
    1. Verify Razorpay HMAC-SHA256 signature
    2. Save verified registration in Supabase with unique pass_id
    3. Return pass_id for database-driven frontend redirect
    """
    try:
        data = request.get_json() or {}
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

        # Generate unique Pass ID
        pass_id = generate_pass_id()

        # Registration details payload
        tournament_slug = data.get('tournamentSlug', '')
        tournament_title = data.get('tournamentTitle', tournament_slug)
        team_name = data.get('teamName', 'Team')
        college = data.get('college', 'University')
        captain_name = data.get('captainName') or data.get('name', 'Captain')
        email = data.get('email', '')
        tournament_game = data.get('tournamentGame', 'Esports')
        tournament_date = data.get('tournamentDate', 'TBD')
        tournament_format = data.get('tournamentFormat', 'Tournament')
        tournament_region = data.get('tournamentRegion', 'Pan India')
        tournament_fee = data.get('tournamentFee', 'Paid')

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
            'order_id': razorpay_order_id,
            'orderId': razorpay_order_id,
            'payment_id': razorpay_payment_id,
            'paymentId': razorpay_payment_id,
            'payment_status': 'SUCCESS',
            'paymentStatus': 'SUCCESS',
            'registered_at': str(int(time.time())),
            'registeredAt': str(int(time.time()))
        }

        # Store in-memory fallback
        IN_MEMORY_REGISTRATIONS[pass_id] = record

        # Save/Update in Supabase
        try:
            supabase = get_supabase_client()
            # Update tournament_registrations status
            supabase.table('tournament_registrations').update({
                'payment_status': 'SUCCESS',
                'payment_id': razorpay_payment_id,
                'signature': razorpay_signature,
                'pass_id': pass_id
            }).eq('order_id', razorpay_order_id).execute()

            # Insert into main registrations table
            supabase.table('registrations').insert({
                'pass_id': pass_id,
                'tournament_slug': tournament_slug,
                'tournament_title': tournament_title,
                'team_name': team_name,
                'college': college,
                'captain_name': captain_name,
                'email': email,
                'order_id': razorpay_order_id,
                'payment_id': razorpay_payment_id,
                'payment_status': 'SUCCESS'
            }).execute()
        except Exception as sb_err:
            print(f"Supabase registration insert warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': 'Payment verified successfully!',
            'passId': pass_id,
            'payment_id': razorpay_payment_id
        }), 200

    except Exception as e:
        print(f"Error verifying payment: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@payments_bp.route('/webhook', methods=['POST'])
def razorpay_webhook():
    """
    Razorpay Webhook listener to handle payment.captured & order.paid events asynchronously.
    """
    try:
        webhook_signature = request.headers.get('X-Razorpay-Signature')
        raw_body = request.get_data(as_text=True)

        webhook_secret = Config.RAZORPAY_WEBHOOK_SECRET
        if webhook_secret and webhook_signature:
            generated_signature = hmac.new(
                bytes(webhook_secret, 'utf-8'),
                bytes(raw_body, 'utf-8'),
                hashlib.sha256
            ).hexdigest()

            if generated_signature != webhook_signature:
                return jsonify({'status': 'error', 'message': 'Invalid webhook signature'}), 400

        data = request.get_json() or {}
        event = data.get('event')

        if event in ['payment.captured', 'order.paid']:
            payload = data.get('payload', {}).get('payment', {}).get('entity', {})
            order_id = payload.get('order_id')
            payment_id = payload.get('id')

            if order_id:
                try:
                    supabase = get_supabase_client()
                    supabase.table('tournament_registrations').update({
                        'payment_status': 'SUCCESS',
                        'payment_id': payment_id
                    }).eq('order_id', order_id).execute()
                except Exception as sb_err:
                    print(f"Webhook Supabase update warning: {sb_err}")

        return jsonify({'status': 'ok'}), 200
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
