import uuid
import time
from flask import Blueprint, request, jsonify
from config import get_supabase_client
from routes.payments import IN_MEMORY_REGISTRATIONS, generate_pass_id

registrations_bp = Blueprint('registrations', __name__)

@registrations_bp.route('/create', methods=['POST'])
def create_registration():
    """
    Create a registration for Free Tournaments or Direct Entries.
    Generates a unique pass_id and saves to DB.
    """
    try:
        data = request.get_json() or {}
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
        tournament_fee = data.get('tournamentFee', 'Free')

        if not tournament_slug or not team_name or not email:
            return jsonify({'success': False, 'message': 'tournamentSlug, teamName, and email are required.'}), 400

        pass_id = generate_pass_id()

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
            'payment_status': 'FREE ENTRY',
            'paymentStatus': 'FREE ENTRY',
            'order_id': 'FREE',
            'payment_id': 'FREE',
            'registered_at': str(int(time.time())),
            'registeredAt': str(int(time.time()))
        }

        # Save to memory fallback
        IN_MEMORY_REGISTRATIONS[pass_id] = record

        # Save to Supabase
        try:
            supabase = get_supabase_client()
            supabase.table('registrations').insert({
                'pass_id': pass_id,
                'tournament_slug': tournament_slug,
                'tournament_title': tournament_title,
                'team_name': team_name,
                'college': college,
                'captain_name': captain_name,
                'email': email,
                'payment_status': 'FREE ENTRY'
            }).execute()
        except Exception as sb_err:
            print(f"Supabase free registration insert warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': 'Registration created successfully!',
            'passId': pass_id,
            'data': record
        }), 201

    except Exception as e:
        print(f"Error creating registration: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@registrations_bp.route('/', methods=['GET'])
def get_all_registrations():
    """Fetch all registrations with case-insensitive email filtering"""
    try:
        email = request.args.get('email')
        supabase_records = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').select('*').execute()
            supabase_records = res.data or []
        except Exception as sb_err:
            print(f"Supabase all registrations warning: {sb_err}")
            
        memory_records = list(IN_MEMORY_REGISTRATIONS.values())
        
        combined_dict = {}
        for r in (supabase_records + memory_records):
            pid = r.get('pass_id') or r.get('passId')
            if not pid:
                continue
            normalized = {
                'id': r.get('id') or pid,
                'pass_id': pid,
                'passId': pid,
                'tournament_slug': r.get('tournament_slug') or r.get('tournamentSlug'),
                'tournamentSlug': r.get('tournament_slug') or r.get('tournamentSlug'),
                'tournament_title': r.get('tournament_title') or r.get('tournamentTitle'),
                'tournamentTitle': r.get('tournament_title') or r.get('tournamentTitle'),
                'team_id': r.get('team_id') or r.get('teamId'),
                'teamId': r.get('team_id') or r.get('teamId'),
                'team_name': r.get('team_name') or r.get('teamName'),
                'teamName': r.get('team_name') or r.get('teamName'),
                'college': r.get('college'),
                'captain_name': r.get('captain_name') or r.get('captainName'),
                'captainName': r.get('captain_name') or r.get('captainName'),
                'email': (r.get('email') or '').strip().lower(),
                'payment_status': r.get('payment_status') or r.get('paymentStatus', 'SUCCESS'),
                'paymentStatus': r.get('payment_status') or r.get('paymentStatus', 'SUCCESS'),
                'order_id': r.get('order_id') or r.get('orderId', ''),
                'payment_id': r.get('payment_id') or r.get('paymentId', ''),
                'registered_at': r.get('registered_at') or r.get('registeredAt', ''),
                'registeredAt': r.get('registered_at') or r.get('registeredAt', ''),
            }
            combined_dict[pid] = normalized

        all_records = list(combined_dict.values())
        if email:
            clean_email = email.strip().lower()
            all_records = [r for r in all_records if r.get('email') == clean_email]

        return jsonify({'success': True, 'data': all_records}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@registrations_bp.route('/<pass_id>', methods=['GET'])
def get_registration_by_pass_id(pass_id):
    """
    Fetch verified registration details by pass_id from Supabase or Memory fallback.
    """
    try:
        # Check in-memory store first
        if pass_id in IN_MEMORY_REGISTRATIONS:
            item = IN_MEMORY_REGISTRATIONS[pass_id]
            return jsonify({
                'success': True,
                'data': {
                    'passId': item.get('pass_id') or item.get('passId'),
                    'pass_id': item.get('pass_id') or item.get('passId'),
                    'tournamentSlug': item.get('tournament_slug') or item.get('tournamentSlug'),
                    'tournament_slug': item.get('tournament_slug') or item.get('tournamentSlug'),
                    'tournamentTitle': item.get('tournament_title') or item.get('tournamentTitle'),
                    'teamName': item.get('team_name') or item.get('teamName'),
                    'college': item.get('college'),
                    'captainName': item.get('captain_name') or item.get('captainName'),
                    'email': item.get('email'),
                    'paymentStatus': item.get('payment_status', 'SUCCESS'),
                    'registeredAt': item.get('registered_at', '')
                }
            }), 200

        # Query Supabase registrations
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').select('*').eq('pass_id', pass_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                record = {
                    'passId': item.get('pass_id'),
                    'pass_id': item.get('pass_id'),
                    'tournamentSlug': item.get('tournament_slug'),
                    'tournament_slug': item.get('tournament_slug'),
                    'tournamentTitle': item.get('tournament_title'),
                    'teamName': item.get('team_name'),
                    'college': item.get('college'),
                    'captainName': item.get('captain_name'),
                    'email': item.get('email'),
                    'orderId': item.get('order_id', ''),
                    'paymentId': item.get('payment_id', ''),
                    'paymentStatus': item.get('payment_status', 'SUCCESS'),
                    'tournamentGame': item.get('tournament_game', 'Esports'),
                    'tournamentDate': item.get('tournament_date', 'Scheduled'),
                    'tournamentFormat': item.get('tournament_format', 'Tournament'),
                    'tournamentRegion': item.get('tournament_region', 'Pan India'),
                    'tournamentFee': item.get('tournament_fee', 'Paid'),
                    'registeredAt': item.get('registered_at', '')
                }
                return jsonify({'success': True, 'data': record}), 200
        except Exception as sb_err:
            print(f"Supabase fetch error: {sb_err}")

        return jsonify({'success': False, 'message': f"No registration found for Pass ID: {pass_id}"}), 404

    except Exception as e:
        print(f"Error fetching registration: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@registrations_bp.route('/verify/<pass_id>', methods=['GET'])
def verify_registration_pass(pass_id):
    """
    Endpoint for Admin QR Scanner / Public verification lookup.
    """
    try:
        # Check memory store
        if pass_id in IN_MEMORY_REGISTRATIONS:
            reg = IN_MEMORY_REGISTRATIONS[pass_id]
            return jsonify({
                'valid': True,
                'status': 'VERIFIED',
                'passId': pass_id,
                'data': reg
            }), 200

        # Query Supabase
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').select('*').eq('pass_id', pass_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                return jsonify({
                    'valid': True,
                    'status': 'VERIFIED',
                    'passId': pass_id,
                    'data': {
                        'passId': item.get('pass_id'),
                        'tournamentTitle': item.get('tournament_title'),
                        'teamName': item.get('team_name'),
                        'captainName': item.get('captain_name'),
                        'college': item.get('college'),
                        'email': item.get('email'),
                        'paymentStatus': item.get('payment_status', 'SUCCESS'),
                        'paymentId': item.get('payment_id', '')
                    }
                }), 200
        except Exception as sb_err:
            print(f"Supabase verification error: {sb_err}")

        return jsonify({'valid': False, 'status': 'INVALID_PASS', 'message': 'Pass ID not found or unverified'}), 404
    except Exception as e:
        return jsonify({'valid': False, 'message': str(e)}), 500

@registrations_bp.route('/<pass_id>', methods=['DELETE'])
def delete_registration(pass_id):
    """Delete a tournament registration from Supabase and memory"""
    global IN_MEMORY_REGISTRATIONS
    if pass_id in IN_MEMORY_REGISTRATIONS:
        del IN_MEMORY_REGISTRATIONS[pass_id]
        
    try:
        supabase = get_supabase_client()
        supabase.table('registrations').delete().eq('pass_id', pass_id).execute()
        return jsonify({'success': True, 'message': f'Registration {pass_id} deleted successfully.'}), 200
    except Exception as e:
        print(f"Supabase delete registration warning: {e}")
        return jsonify({'success': True, 'message': f'Registration {pass_id} removed from memory.'}), 200
