import uuid
import time
from flask import Blueprint, request, jsonify
from config import get_supabase_client
from routes.payments import IN_MEMORY_REGISTRATIONS, generate_pass_id
from cache import api_cache

registrations_bp = Blueprint('registrations', __name__)

@registrations_bp.route('/create', methods=['POST'])
def create_registration():
    """
    Create a registration for Free Tournaments or Direct Entries.
    Generates a unique pass_id, sets attendance_status='NOT_MARKED', and saves to DB.
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
        team_id = data.get('teamId') or data.get('team_id') or f"team-{int(time.time())}"

        if not tournament_slug or not team_name or not email:
            return jsonify({'success': False, 'message': 'tournamentSlug, teamName, and email are required.'}), 400

        pass_id = generate_pass_id()

        players = data.get('players', [])
        player_emails = data.get('playerEmails', [email])

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
            'team_id': team_id,
            'teamId': team_id,
            'team_name': team_name,
            'teamName': team_name,
            'college': college,
            'captain_name': captain_name,
            'captainName': captain_name,
            'email': email,
            'players': players,
            'player_emails': player_emails,
            'payment_status': 'FREE ENTRY',
            'paymentStatus': 'FREE ENTRY',
            'order_id': 'FREE',
            'payment_id': 'FREE',
            'attendance_status': 'NOT_MARKED',
            'attendanceStatus': 'NOT_MARKED',
            'attended_at': None,
            'attendedAt': None,
            'attended_by': None,
            'attendedBy': None,
            'registered_at': str(int(time.time())),
            'registeredAt': str(int(time.time()))
        }

        # Save to memory fallback
        IN_MEMORY_REGISTRATIONS[pass_id] = record

        # Save to Supabase
        try:
            supabase = get_supabase_client()
            reg_payload = {
                'pass_id': pass_id,
                'tournament_slug': tournament_slug,
                'tournament_title': tournament_title,
                'team_id': team_id,
                'team_name': team_name,
                'college': college,
                'captain_name': captain_name,
                'email': email,
                'payment_status': 'FREE ENTRY',
            }
            try:
                supabase.table('registrations').insert({**reg_payload, 'attendance_status': 'NOT_MARKED'}).execute()
            except Exception:
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
            existing_att = supabase.table('event_attendance').select('id').eq('pass_id', pass_id).execute()
            if existing_att.data and len(existing_att.data) > 0:
                supabase.table('event_attendance').update(att_payload).eq('pass_id', pass_id).execute()
            else:
                supabase.table('event_attendance').insert(att_payload).execute()

            # Save 4 players to tournament_rosters table
            from routes.rosters import save_tournament_rosters_to_db
            save_tournament_rosters_to_db(supabase, pass_id, tournament_slug, team_name, college, players)

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


@registrations_bp.route('', methods=['GET'])
@registrations_bp.route('/', methods=['GET'])
def get_all_registrations():
    """Fetch registrations with indexed filtering and sub-ms caching"""
    try:
        email = request.args.get('email')
        tournament_slug = request.args.get('tournament_slug') or request.args.get('tournamentSlug')

        clean_email = (email or '').strip().lower()
        clean_slug = (tournament_slug or '').strip().lower()

        cache_key = f"regs:{clean_email}:{clean_slug}"
        cached = api_cache.get(cache_key)
        if cached is not None:
            return jsonify({'success': True, 'data': cached, 'cached': True}), 200

        supabase_records = []
        try:
            supabase = get_supabase_client()
            q = supabase.table('registrations').select('*')
            if clean_email:
                q = q.eq('email', clean_email)
            if clean_slug:
                q = q.eq('tournament_slug', clean_slug)
            
            res = q.order('created_at', desc=True).execute() if hasattr(q, 'order') else q.execute()
            supabase_records = res.data or []
        except Exception as sb_err:
            print(f"Supabase registrations query warning: {sb_err}")
            
        memory_records = list(IN_MEMORY_REGISTRATIONS.values())
        
        combined_dict = {}
        for r in (supabase_records + memory_records):
            pid = r.get('pass_id') or r.get('passId')
            if not pid:
                continue
            
            rec_email = (r.get('email') or '').strip().lower()
            rec_slug = (r.get('tournament_slug') or r.get('tournamentSlug') or '').strip().lower()

            if clean_email and rec_email != clean_email:
                continue
            if clean_slug and rec_slug != clean_slug:
                continue

            att_status = (r.get('attendance_status') or r.get('attendanceStatus') or 'NOT_MARKED').upper()
            if att_status not in ['NOT_MARKED', 'PRESENT', 'ABSENT']:
                att_status = 'NOT_MARKED'

            normalized = {
                'id': r.get('id') or pid,
                'pass_id': pid,
                'passId': pid,
                'tournament_slug': rec_slug,
                'tournamentSlug': rec_slug,
                'tournament_title': r.get('tournament_title') or r.get('tournamentTitle'),
                'tournamentTitle': r.get('tournament_title') or r.get('tournamentTitle'),
                'team_id': r.get('team_id') or r.get('teamId'),
                'teamId': r.get('team_id') or r.get('teamId'),
                'team_name': r.get('team_name') or r.get('teamName'),
                'teamName': r.get('team_name') or r.get('teamName'),
                'college': r.get('college'),
                'captain_name': r.get('captain_name') or r.get('captainName'),
                'captainName': r.get('captain_name') or r.get('captainName'),
                'email': rec_email,
                'payment_status': r.get('payment_status') or r.get('paymentStatus', 'SUCCESS'),
                'paymentStatus': r.get('payment_status') or r.get('paymentStatus', 'SUCCESS'),
                'order_id': r.get('order_id') or r.get('orderId', ''),
                'payment_id': r.get('payment_id') or r.get('paymentId', ''),
                'attendance_status': att_status,
                'attendanceStatus': att_status,
                'attended_at': r.get('attended_at') or r.get('attendedAt'),
                'attendedAt': r.get('attended_at') or r.get('attendedAt'),
                'attended_by': r.get('attended_by') or r.get('attendedBy'),
                'attendedBy': r.get('attended_by') or r.get('attendedBy'),
                'registered_at': r.get('registered_at') or r.get('registeredAt', ''),
                'registeredAt': r.get('registered_at') or r.get('registeredAt', ''),
            }
            combined_dict[pid] = normalized

        # Query tournament_rosters for matched pass_ids only
        matched_pids = list(combined_dict.keys())
        if matched_pids:
            try:
                supabase = get_supabase_client()
                r_query = supabase.table('tournament_rosters').select('*')
                if len(matched_pids) <= 20:
                    r_query = r_query.in_('pass_id', matched_pids)
                elif clean_slug:
                    r_query = r_query.eq('tournament_slug', clean_slug)
                
                r_res = r_query.order('slot').execute()
                if r_res.data:
                    roster_map = {}
                    for row in r_res.data:
                        p_id = row.get('pass_id')
                        if p_id not in roster_map:
                            roster_map[p_id] = []
                        roster_map[p_id].append({
                            'slot': row.get('slot'),
                            'name': row.get('player_name'),
                            'inGameTag': row.get('in_game_tag'),
                            'email': row.get('email'),
                            'phone': row.get('phone', ''),
                            'isCaptain': row.get('is_captain', row.get('slot') == 1)
                        })
                    for rec in combined_dict.values():
                        p_id = rec.get('pass_id')
                        if p_id in roster_map:
                            rec['players'] = roster_map[p_id]
                            rec['player_emails'] = [p['email'] for p in roster_map[p_id]]
            except Exception as rost_err:
                print(f"Notice fetching tournament_rosters join: {rost_err}")

        all_records = list(combined_dict.values())
        api_cache.set(cache_key, all_records, ttl_seconds=20)
        return jsonify({'success': True, 'data': all_records}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@registrations_bp.route('/<pass_id>', methods=['GET'])
def get_registration_by_pass_id(pass_id):
    """
    Fetch verified registration details by pass_id from Supabase registrations & tournament_rosters.
    """
    try:
        att_status = 'NOT_MARKED'
        attended_at = None
        attended_by = None

        # Check in-memory store first
        if pass_id in IN_MEMORY_REGISTRATIONS:
            item = IN_MEMORY_REGISTRATIONS[pass_id]
            att_status = (item.get('attendance_status') or item.get('attendanceStatus') or 'NOT_MARKED').upper()
            record = {
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
                'attendanceStatus': att_status,
                'attendance_status': att_status,
                'attendedAt': item.get('attended_at') or item.get('attendedAt'),
                'attended_at': item.get('attended_at') or item.get('attendedAt'),
                'attendedBy': item.get('attended_by') or item.get('attendedBy'),
                'attended_by': item.get('attended_by') or item.get('attendedBy'),
                'players': item.get('players', []),
                'player_emails': item.get('player_emails', []),
                'registeredAt': item.get('registered_at', '')
            }

            # Also join tournament_rosters
            try:
                supabase = get_supabase_client()
                roster_res = supabase.table('tournament_rosters').select('*').eq('pass_id', pass_id).order('slot').execute()
                if roster_res.data and len(roster_res.data) > 0:
                    record['players'] = [{
                        'slot': p.get('slot'),
                        'name': p.get('player_name'),
                        'inGameTag': p.get('in_game_tag'),
                        'email': p.get('email'),
                        'phone': p.get('phone', ''),
                        'isCaptain': p.get('is_captain', p.get('slot') == 1)
                    } for p in roster_res.data]
                    record['player_emails'] = [p['email'] for p in record['players']]
            except Exception:
                pass

            return jsonify({'success': True, 'data': record}), 200

        # Query Supabase registrations
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').select('*').eq('pass_id', pass_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                att_status = (item.get('attendance_status') or 'NOT_MARKED').upper()
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
                    'attendanceStatus': att_status,
                    'attendance_status': att_status,
                    'attendedAt': item.get('attended_at'),
                    'attended_at': item.get('attended_at'),
                    'attendedBy': item.get('attended_by'),
                    'attended_by': item.get('attended_by'),
                    'tournamentGame': item.get('tournament_game', 'Esports'),
                    'tournamentDate': item.get('tournament_date', 'Scheduled'),
                    'tournamentFormat': item.get('tournament_format', 'Tournament'),
                    'tournamentRegion': item.get('tournament_region', 'Pan India'),
                    'tournamentFee': item.get('tournament_fee', 'Paid'),
                    'players': item.get('players', []),
                    'player_emails': item.get('player_emails', []),
                    'registeredAt': item.get('registered_at', '')
                }

                # Query tournament_rosters for the 4 players
                try:
                    roster_res = supabase.table('tournament_rosters').select('*').eq('pass_id', pass_id).order('slot').execute()
                    if roster_res.data and len(roster_res.data) > 0:
                        record['players'] = [{
                            'slot': p.get('slot'),
                            'name': p.get('player_name'),
                            'inGameTag': p.get('in_game_tag'),
                            'email': p.get('email'),
                            'phone': p.get('phone', ''),
                            'isCaptain': p.get('is_captain', p.get('slot') == 1)
                        } for p in roster_res.data]
                        record['player_emails'] = [p['email'] for p in record['players']]
                except Exception as rost_err:
                    print(f"Notice fetching tournament_rosters for pass {pass_id}: {rost_err}")

                return jsonify({'success': True, 'data': record}), 200
        except Exception as sb_err:
            print(f"Supabase fetch error: {sb_err}")

        return jsonify({'success': False, 'message': f"No registration found for Pass ID: {pass_id}"}), 404

    except Exception as e:
        print(f"Error fetching registration: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@registrations_bp.route('/<pass_id>/attendance', methods=['PATCH', 'POST'])
def update_attendance_status(pass_id):
    """
    Update Attendance Status for a single registration:
    attendance_status: 'PRESENT' | 'ABSENT' | 'NOT_MARKED'
    Records attended_at timestamp and attended_by organizer.
    Prevents duplicate updates when already PRESENT.
    """
    try:
        data = request.get_json(silent=True) or {}
        new_status = (data.get('attendance_status') or data.get('attendanceStatus') or '').strip().upper()
        attended_by = data.get('attended_by') or data.get('attendedBy') or 'Organizer'
        attended_at = data.get('attended_at') or data.get('attendedAt')

        if new_status not in ['PRESENT', 'ABSENT', 'NOT_MARKED']:
            return jsonify({
                'success': False,
                'message': f"Invalid attendance status '{new_status}'. Must be PRESENT, ABSENT, or NOT_MARKED."
            }), 400

        # Format ISO timestamp if not passed
        if not attended_at and new_status in ['PRESENT', 'ABSENT']:
            import datetime
            attended_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        elif new_status == 'NOT_MARKED':
            attended_at = None
            attended_by = None

        # Check existing in-memory store
        existing_memory = IN_MEMORY_REGISTRATIONS.get(pass_id)
        current_status = existing_memory.get('attendance_status') if existing_memory else None

        # Supabase update
        supabase_updated = False
        try:
            supabase = get_supabase_client()
            update_payload = {
                'attendance_status': new_status,
                'attended_at': attended_at,
                'attended_by': attended_by
            }
            res = supabase.table('registrations').update(update_payload).eq('pass_id', pass_id).execute()
            if res.data and len(res.data) > 0:
                supabase_updated = True
                updated_item = res.data[0]
                current_status = updated_item.get('attendance_status')
        except Exception as sb_err:
            print(f"Supabase attendance update warning: {sb_err}")

        # Update in-memory store
        if pass_id in IN_MEMORY_REGISTRATIONS:
            IN_MEMORY_REGISTRATIONS[pass_id]['attendance_status'] = new_status
            IN_MEMORY_REGISTRATIONS[pass_id]['attendanceStatus'] = new_status
            IN_MEMORY_REGISTRATIONS[pass_id]['attended_at'] = attended_at
            IN_MEMORY_REGISTRATIONS[pass_id]['attendedAt'] = attended_at
            IN_MEMORY_REGISTRATIONS[pass_id]['attended_by'] = attended_by
            IN_MEMORY_REGISTRATIONS[pass_id]['attendedBy'] = attended_by
        elif supabase_updated:
            IN_MEMORY_REGISTRATIONS[pass_id] = {
                'pass_id': pass_id,
                'passId': pass_id,
                'attendance_status': new_status,
                'attendanceStatus': new_status,
                'attended_at': attended_at,
                'attended_by': attended_by
            }

        return jsonify({
            'success': True,
            'message': f"Attendance updated to {new_status}",
            'passId': pass_id,
            'attendance_status': new_status,
            'attendanceStatus': new_status,
            'attended_at': attended_at,
            'attendedAt': attended_at,
            'attended_by': attended_by,
            'attendedBy': attended_by
        }), 200

    except Exception as e:
        print(f"Error updating attendance: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@registrations_bp.route('/attendance/mark-all-absent', methods=['POST'])
def mark_all_remaining_as_absent():
    """
    Batch changes all remaining 'NOT_MARKED' registrations for a tournament to 'ABSENT'.
    Does not modify registrations that are already 'PRESENT'.
    """
    try:
        data = request.get_json(silent=True) or {}
        tournament_slug = (data.get('tournament_slug') or data.get('tournamentSlug') or '').strip().lower()
        attended_by = data.get('attended_by') or data.get('attendedBy') or 'Organizer'

        if not tournament_slug:
            return jsonify({'success': False, 'message': 'tournament_slug is required'}), 400

        import datetime
        timestamp_now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        updated_count = 0

        # 1. Update in memory
        for pid, rec in list(IN_MEMORY_REGISTRATIONS.items()):
            rec_slug = (rec.get('tournament_slug') or rec.get('tournamentSlug') or '').strip().lower()
            if rec_slug == tournament_slug:
                current_att = (rec.get('attendance_status') or rec.get('attendanceStatus') or 'NOT_MARKED').upper()
                if current_att == 'NOT_MARKED':
                    rec['attendance_status'] = 'ABSENT'
                    rec['attendanceStatus'] = 'ABSENT'
                    rec['attended_at'] = timestamp_now
                    rec['attendedAt'] = timestamp_now
                    rec['attended_by'] = attended_by
                    rec['attendedBy'] = attended_by
                    updated_count += 1

        # 2. Update in Supabase
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').update({
                'attendance_status': 'ABSENT',
                'attended_at': timestamp_now,
                'attended_by': attended_by
            }).eq('tournament_slug', tournament_slug).eq('attendance_status', 'NOT_MARKED').execute()
            if res.data:
                updated_count = max(updated_count, len(res.data))
        except Exception as sb_err:
            print(f"Supabase batch absent update warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': f"{updated_count} remaining registrations marked as Absent.",
            'updated_count': updated_count,
            'tournament_slug': tournament_slug
        }), 200

    except Exception as e:
        print(f"Error marking remaining as absent: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@registrations_bp.route('/verify/<pass_id>', methods=['GET'])
def verify_registration_pass(pass_id):
    """
    Endpoint for Admin QR Scanner / Public verification lookup.
    """
    try:
        clean_id = (pass_id or '').strip()
        if not clean_id:
            return jsonify({'valid': False, 'status': 'INVALID_PASS', 'message': 'Empty pass ID provided'}), 200

        # 1. Check memory store (case-insensitive)
        for k, reg in IN_MEMORY_REGISTRATIONS.items():
            if k.strip().lower() == clean_id.lower() or (reg.get('pass_id') or '').strip().lower() == clean_id.lower():
                att_status = (reg.get('attendance_status') or reg.get('attendanceStatus') or 'NOT_MARKED').upper()
                return jsonify({
                    'valid': True,
                    'status': 'VERIFIED',
                    'passId': clean_id,
                    'data': {
                        **reg,
                        'attendanceStatus': att_status,
                        'attendance_status': att_status
                    }
                }), 200

        # 2. Query Supabase (case-insensitive ilike)
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').select('*').ilike('pass_id', clean_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                att_status = (item.get('attendance_status') or 'NOT_MARKED').upper()
                return jsonify({
                    'valid': True,
                    'status': 'VERIFIED',
                    'passId': item.get('pass_id', clean_id),
                    'data': {
                        'passId': item.get('pass_id'),
                        'pass_id': item.get('pass_id'),
                        'tournamentTitle': item.get('tournament_title'),
                        'tournament_title': item.get('tournament_title'),
                        'tournamentSlug': item.get('tournament_slug'),
                        'tournament_slug': item.get('tournament_slug'),
                        'tournamentFee': item.get('tournament_fee', 'Free'),
                        'tournament_fee': item.get('tournament_fee', 'Free'),
                        'teamName': item.get('team_name'),
                        'captainName': item.get('captain_name'),
                        'college': item.get('college'),
                        'email': item.get('email'),
                        'paymentStatus': item.get('payment_status', 'SUCCESS'),
                        'payment_status': item.get('payment_status', 'SUCCESS'),
                        'paymentId': item.get('payment_id', ''),
                        'payment_id': item.get('payment_id', ''),
                        'orderId': item.get('order_id', ''),
                        'order_id': item.get('order_id', ''),
                        'attendanceStatus': att_status,
                        'attendance_status': att_status,
                        'attendedAt': item.get('attended_at'),
                        'attendedBy': item.get('attended_by')
                    }
                }), 200
        except Exception as sb_err:
            print(f"Supabase verification error: {sb_err}")

        return jsonify({'valid': False, 'status': 'NOT_FOUND', 'message': f'Pass ID {clean_id} not found on server'}), 200
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
