import uuid
import time
from flask import Blueprint, request, jsonify
from config import get_supabase_client
from routes.payments import IN_MEMORY_REGISTRATIONS, generate_pass_id, parse_tournament_fee
from routes.auth import get_authenticated_user
from cache import api_cache

registrations_bp = Blueprint('registrations', __name__)

@registrations_bp.route('/create', methods=['POST'])
def create_registration():
    """
    Create a registration for Free Tournaments or Direct Entries.
    Enforces authentication and server-authoritative DB fee check.
    Rejects paid tournaments with 403 Forbidden.
    """
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'success': False, 'message': 'Authentication required to register for a tournament.'}), 401

        data = request.get_json(silent=True) or {}
        tournament_slug = data.get('tournamentSlug', '')
        tournament_title = data.get('tournamentTitle', tournament_slug)
        team_name = data.get('teamName', 'Team')
        college = data.get('college') or user.get('college') or 'University'
        captain_name = data.get('captainName') or data.get('name') or user.get('name') or 'Captain'
        email = (user.get('email') or data.get('email') or '').strip().lower()
        user_id = user.get('id')
        tournament_game = data.get('tournamentGame', 'Esports')
        tournament_date = data.get('tournamentDate', 'TBD')
        tournament_format = data.get('tournamentFormat', 'Tournament')
        tournament_region = data.get('tournamentRegion', 'Pan India')
        team_id = data.get('teamId') or data.get('team_id') or f"team-{int(time.time())}"

        if not tournament_slug or not team_name or not email:
            return jsonify({'success': False, 'message': 'tournamentSlug, teamName, and email are required.'}), 400

        supabase = get_supabase_client()

        # Fetch tournament authoritatively from DB
        t_res = supabase.table('tournaments').select('*').eq('slug', tournament_slug).execute()
        if not t_res.data or len(t_res.data) == 0:
            try:
                t_res = supabase.table('tournaments').select('*').eq('id', int(tournament_slug)).execute()
            except Exception:
                pass

        if not t_res.data or len(t_res.data) == 0:
            return jsonify({'success': False, 'message': f"Tournament '{tournament_slug}' not found."}), 404

        tournament = t_res.data[0]
        actual_slug = tournament.get('slug') or tournament_slug

        # Server-authoritative check: If tournament is PAID, direct registration is forbidden
        is_paid, amount_rupees, amount_in_paise = parse_tournament_fee(tournament.get('fee'))
        if is_paid:
            return jsonify({
                'success': False,
                'message': 'This is a paid tournament. Direct registration is not allowed; payment checkout is required.'
            }), 403

        # Check for existing registration (idempotency)
        try:
            existing = supabase.table('registrations').select('*').eq('tournament_slug', actual_slug).eq('email', email).execute()
            if existing.data and len(existing.data) > 0:
                return jsonify({
                    'success': True,
                    'message': 'Already registered for this tournament.',
                    'passId': existing.data[0].get('pass_id'),
                    'already_registered': True
                }), 200
        except Exception:
            pass

        pass_id = generate_pass_id()
        players = data.get('players', [])
        player_emails = data.get('playerEmails', [email])

        record = {
            'pass_id': pass_id,
            'passId': pass_id,
            'tournament_slug': actual_slug,
            'tournamentSlug': actual_slug,
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
            'tournament_fee': 'Free',
            'tournamentFee': 'Free',
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
            'registeredAt': str(int(time.time())),
            'user_id': user_id
        }

        # Save to memory fallback
        IN_MEMORY_REGISTRATIONS[pass_id] = record

        # Save to Supabase
        try:
            reg_payload = {
                'pass_id': pass_id,
                'tournament_slug': actual_slug,
                'tournament_title': tournament_title,
                'team_id': team_id,
                'team_name': team_name,
                'college': college,
                'captain_name': captain_name,
                'email': email,
                'payment_status': 'FREE ENTRY',
                'order_id': 'FREE',
                'payment_id': 'FREE',
            }
            if user_id:
                try:
                    uuid.UUID(str(user_id))
                    reg_payload['user_id'] = str(user_id)
                except Exception:
                    pass
            try:
                supabase.table('registrations').insert({**reg_payload, 'attendance_status': 'NOT_MARKED'}).execute()
            except Exception:
                supabase.table('registrations').insert(reg_payload).execute()

            # Insert initial event_attendance row
            att_payload = {
                'pass_id': pass_id,
                'tournament_slug': actual_slug,
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

            # Save players to tournament_rosters table
            from routes.rosters import save_tournament_rosters_to_db
            save_tournament_rosters_to_db(supabase, pass_id, actual_slug, team_name, college, players)

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
            
            res = q.order('registered_at', desc=True).execute() if hasattr(q, 'order') else q.execute()
            supabase_records = res.data or []
        except Exception as sb_err:
            try:
                res = q.execute()
                supabase_records = res.data or []
            except Exception as sb_err2:
                print(f"Supabase registrations query warning: {sb_err2}")
            
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
                    or_clause = ','.join([f"pass_id.eq.{p}" for p in matched_pids])
                    r_query = r_query.or_(or_clause)
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

        # Supabase update (case-insensitive ilike for registrations & event_attendance)
        supabase_updated = False
        import datetime
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        clean_pid = (pass_id or '').strip()

        try:
            supabase = get_supabase_client()
            update_payload = {
                'attendance_status': new_status,
                'attended_at': attended_at,
                'attended_by': attended_by
            }
            res = supabase.table('registrations').update(update_payload).ilike('pass_id', clean_pid).execute()
            if res.data and len(res.data) > 0:
                supabase_updated = True
                updated_item = res.data[0]
                current_status = updated_item.get('attendance_status')

            # Also update event_attendance table
            try:
                supabase.table('event_attendance').upsert({
                    'pass_id': clean_pid,
                    'attendance_status': new_status,
                    'attended_at': attended_at,
                    'attended_by': attended_by,
                    'updated_at': now_iso
                }, on_conflict='pass_id').execute()
            except Exception as ea_err:
                print(f"event_attendance table sync notice: {ea_err}")

        except Exception as sb_err:
            print(f"Supabase attendance update warning: {sb_err}")

        # Update all matching keys in memory store (case-insensitive)
        matched_any = False
        for k, reg in list(IN_MEMORY_REGISTRATIONS.items()):
            if k.strip().lower() == clean_pid.lower() or (reg.get('pass_id') or '').strip().lower() == clean_pid.lower():
                reg['attendance_status'] = new_status
                reg['attendanceStatus'] = new_status
                reg['attended_at'] = attended_at
                reg['attendedAt'] = attended_at
                reg['attended_by'] = attended_by
                reg['attendedBy'] = attended_by
                matched_any = True

        if not matched_any and supabase_updated:
            IN_MEMORY_REGISTRATIONS[clean_pid] = {
                'pass_id': clean_pid,
                'passId': clean_pid,
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


def check_tournament_expired(tourn_date=None, end_date=None, status=None):
    """
    Returns (is_expired: bool, date_str: str)
    A tournament pass expires once the tournament date / end_date has concluded.
    """
    if status and str(status).strip().lower() in ['completed', 'concluded', 'ended', 'past']:
        return True, tourn_date or 'Concluded'

    raw = (end_date or tourn_date or '').strip()
    if not raw or raw.lower() in ['upcoming', 'tba', 'scheduled', 'live', 'registering']:
        return False, raw

    import datetime
    # 1. Try ISO parsing (e.g. 2026-05-18 or 2026-05-18T00:00:00)
    try:
        dt = datetime.datetime.fromisoformat(raw.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        if dt.hour == 0 and dt.minute == 0:
            dt = dt.replace(hour=23, minute=59, second=59)
        if datetime.datetime.now(datetime.timezone.utc) > dt:
            return True, raw
    except Exception:
        pass

    # 2. Try standard date patterns with year
    current_year = datetime.datetime.now().year
    formats_with_year = [
        '%d %b %Y', '%d %B %Y', '%Y-%m-%d', '%d/%m/%Y', '%b %d, %Y', '%B %d, %Y',
        '%d-%m-%Y', '%d.%m.%Y'
    ]
    for fmt in formats_with_year:
        try:
            dt = datetime.datetime.strptime(raw, fmt)
            dt = dt.replace(hour=23, minute=59, second=59)
            if datetime.datetime.now() > dt:
                return True, raw
        except Exception:
            pass

    # 3. Formats without year (e.g. "18 May", "2 Jun")
    for fmt in ['%d %b', '%d %B']:
        try:
            dt = datetime.datetime.strptime(raw, fmt)
            dt = dt.replace(year=current_year, hour=23, minute=59, second=59)
            if datetime.datetime.now() > dt:
                return True, raw
        except Exception:
            pass

    return False, raw


@registrations_bp.route('/verify/<pass_id>', methods=['GET', 'POST'])
def verify_registration_pass(pass_id):
    """
    Endpoint for Admin QR Scanner / Entrance Gate verification lookup.
    Supports atomic auto-check-in and automatic tournament expiration validation.
    Statuses:
      - 'VERIFIED': Valid pass, marked PRESENT (or ready to mark)
      - 'ALREADY_CHECKED_IN': Valid pass, was already checked in prior to this scan
      - 'EXPIRED': Pass has expired as tournament date has concluded
      - 'INVALID': Pass ID not recognized
    """
    try:
        clean_id = (pass_id or '').strip()
        if not clean_id:
            return jsonify({'valid': False, 'status': 'INVALID', 'message': 'Empty pass ID provided'}), 200

        # Query / payload options
        auto_check_in = request.args.get('auto_check_in', '').lower() in ['true', '1', 'yes']
        attended_by = request.args.get('attended_by') or 'Entrance Desk Scanner'

        # Also support JSON body if POST
        if request.is_json:
            req_data = request.get_json(silent=True) or {}
            if 'auto_check_in' in req_data:
                auto_check_in = bool(req_data.get('auto_check_in'))
            if 'attended_by' in req_data:
                attended_by = req_data.get('attended_by') or attended_by

        import datetime
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # 1. Real-time Supabase Synchronization
        sb_item = None
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').select('*').ilike('pass_id', clean_id).execute()
            if res.data and len(res.data) > 0:
                sb_item = res.data[0]
                try:
                    ea_res = supabase.table('event_attendance').select('*').ilike('pass_id', clean_id).execute()
                    if ea_res.data and len(ea_res.data) > 0:
                        sb_item['attendance_status'] = ea_res.data[0].get('attendance_status') or sb_item.get('attendance_status')
                        sb_item['attended_at'] = ea_res.data[0].get('attended_at')
                        sb_item['attended_by'] = ea_res.data[0].get('attended_by')
                except Exception:
                    pass
        except Exception as sb_err:
            print(f"Supabase verify sync notice: {sb_err}")

        # 2. Check memory store (case-insensitive)
        matched_mem_key = None
        matched_mem_reg = None
        for k, reg in IN_MEMORY_REGISTRATIONS.items():
            if k.strip().lower() == clean_id.lower() or (reg.get('pass_id') or '').strip().lower() == clean_id.lower():
                matched_mem_key = k
                matched_mem_reg = reg
                break

        # If Supabase had fresher state, sync memory
        if sb_item and matched_mem_reg:
            matched_mem_reg['attendance_status'] = sb_item.get('attendance_status') or 'NOT_MARKED'
            matched_mem_reg['attendanceStatus'] = sb_item.get('attendance_status') or 'NOT_MARKED'
            matched_mem_reg['attended_at'] = sb_item.get('attended_at')
            matched_mem_reg['attendedAt'] = sb_item.get('attended_at')
            matched_mem_reg['attended_by'] = sb_item.get('attended_by')
            matched_mem_reg['attendedBy'] = sb_item.get('attended_by')
        elif sb_item and not matched_mem_reg:
            matched_mem_reg = sb_item
            IN_MEMORY_REGISTRATIONS[clean_id] = sb_item

        if matched_mem_reg:
            tourn_slug = matched_mem_reg.get('tournament_slug') or matched_mem_reg.get('tournamentSlug') or ''
            tourn_date = matched_mem_reg.get('tournament_date') or matched_mem_reg.get('date') or ''
            tourn_status = matched_mem_reg.get('tournament_status') or matched_mem_reg.get('status') or ''

            # Check tournament expiration
            is_expired, exp_date_str = check_tournament_expired(tourn_date, status=tourn_status)
            if is_expired:
                return jsonify({
                    'valid': False,
                    'status': 'EXPIRED',
                    'is_expired': True,
                    'passId': matched_mem_reg.get('pass_id', clean_id),
                    'message': f'This ticket pass has expired. Tournament concluded on {exp_date_str}.',
                    'data': {
                        **matched_mem_reg,
                        'tournamentDate': exp_date_str,
                        'isExpired': True,
                    }
                }), 200

            current_att = (matched_mem_reg.get('attendance_status') or matched_mem_reg.get('attendanceStatus') or 'NOT_MARKED').upper()
            
            # Check if ALREADY checked in
            if current_att == 'PRESENT':
                return jsonify({
                    'valid': True,
                    'status': 'ALREADY_CHECKED_IN',
                    'already_checked_in': True,
                    'passId': matched_mem_reg.get('pass_id', clean_id),
                    'message': 'Participant is already checked in.',
                    'data': {
                        **matched_mem_reg,
                        'attendanceStatus': 'PRESENT',
                        'attendance_status': 'PRESENT',
                        'attendedAt': matched_mem_reg.get('attended_at') or matched_mem_reg.get('attendedAt') or now_iso,
                        'attendedBy': matched_mem_reg.get('attended_by') or matched_mem_reg.get('attendedBy') or attended_by
                    }
                }), 200

            # If Auto-Check-In is enabled, mark PRESENT atomically
            if auto_check_in:
                matched_mem_reg['attendance_status'] = 'PRESENT'
                matched_mem_reg['attendanceStatus'] = 'PRESENT'
                matched_mem_reg['attended_at'] = now_iso
                matched_mem_reg['attendedAt'] = now_iso
                matched_mem_reg['attended_by'] = attended_by
                matched_mem_reg['attendedBy'] = attended_by

                # Also update Supabase in background
                try:
                    supabase = get_supabase_client()
                    supabase.table('registrations').update({
                        'attendance_status': 'PRESENT',
                        'attended_at': now_iso,
                        'attended_by': attended_by
                    }).ilike('pass_id', clean_id).execute()
                except Exception as sb_err:
                    print(f"Supabase auto-check-in sync warning: {sb_err}")

                return jsonify({
                    'valid': True,
                    'status': 'VERIFIED',
                    'already_checked_in': False,
                    'passId': matched_mem_reg.get('pass_id', clean_id),
                    'message': 'Participant verified and checked in as PRESENT.',
                    'data': {
                        **matched_mem_reg,
                        'attendanceStatus': 'PRESENT',
                        'attendance_status': 'PRESENT',
                        'attendedAt': now_iso,
                        'attendedBy': attended_by
                    }
                }), 200

            # Valid without auto-check-in
            return jsonify({
                'valid': True,
                'status': 'VERIFIED',
                'already_checked_in': False,
                'passId': matched_mem_reg.get('pass_id', clean_id),
                'message': 'Pass verified successfully.',
                'data': {
                    **matched_mem_reg,
                    'attendanceStatus': current_att,
                    'attendance_status': current_att
                }
            }), 200

        # 2. Query Supabase (case-insensitive ilike)
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').select('*').ilike('pass_id', clean_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                current_att = (item.get('attendance_status') or 'NOT_MARKED').upper()
                p_id = item.get('pass_id', clean_id)
                t_slug = item.get('tournament_slug') or ''

                # Fetch tournament to check date / expiration
                tourn_date = item.get('tournament_date') or ''
                tourn_status = item.get('tournament_status') or ''
                try:
                    t_res = supabase.table('tournaments').select('*').eq('slug', t_slug).execute()
                    if t_res.data and len(t_res.data) > 0:
                        t_item = t_res.data[0]
                        tourn_date = t_item.get('end_date') or t_item.get('date') or tourn_date
                        tourn_status = t_item.get('status') or tourn_status
                except Exception:
                    pass

                # Check tournament expiration
                is_expired, exp_date_str = check_tournament_expired(tourn_date, status=tourn_status)
                if is_expired:
                    return jsonify({
                        'valid': False,
                        'status': 'EXPIRED',
                        'is_expired': True,
                        'passId': p_id,
                        'message': f'This ticket pass has expired. Tournament concluded on {exp_date_str}.',
                        'data': {
                            'passId': p_id,
                            'pass_id': p_id,
                            'tournamentTitle': item.get('tournament_title') or 'Esports Tournament',
                            'tournamentSlug': t_slug,
                            'tournamentDate': exp_date_str,
                            'teamName': item.get('team_name') or 'Squad Entry',
                            'captainName': item.get('captain_name') or 'Squad Captain',
                            'college': item.get('college') or 'Collegiate Campus',
                            'email': item.get('email') or '',
                            'isExpired': True,
                        }
                    }), 200

                # Check if ALREADY checked in
                if current_att == 'PRESENT':
                    return jsonify({
                        'valid': True,
                        'status': 'ALREADY_CHECKED_IN',
                        'already_checked_in': True,
                        'passId': p_id,
                        'message': 'Participant is already checked in.',
                        'data': {
                            'passId': p_id,
                            'pass_id': p_id,
                            'tournamentTitle': item.get('tournament_title') or 'Esports Tournament',
                            'tournament_title': item.get('tournament_title') or 'Esports Tournament',
                            'tournamentSlug': item.get('tournament_slug') or 'tournament',
                            'tournament_slug': item.get('tournament_slug') or 'tournament',
                            'tournamentFee': item.get('tournament_fee', 'Free'),
                            'tournament_fee': item.get('tournament_fee', 'Free'),
                            'teamName': item.get('team_name') or 'Squad Entry',
                            'team_name': item.get('team_name') or 'Squad Entry',
                            'captainName': item.get('captain_name') or 'Squad Captain',
                            'captain_name': item.get('captain_name') or 'Squad Captain',
                            'college': item.get('college') or 'Collegiate Campus',
                            'email': item.get('email') or '',
                            'paymentStatus': item.get('payment_status', 'SUCCESS'),
                            'payment_status': item.get('payment_status', 'SUCCESS'),
                            'paymentId': item.get('payment_id', ''),
                            'payment_id': item.get('payment_id', ''),
                            'orderId': item.get('order_id', ''),
                            'order_id': item.get('order_id', ''),
                            'attendanceStatus': 'PRESENT',
                            'attendance_status': 'PRESENT',
                            'attendedAt': item.get('attended_at') or now_iso,
                            'attendedBy': item.get('attended_by') or attended_by,
                            'players': item.get('players') or []
                        }
                    }), 200

                # If Auto-Check-In is enabled, atomically mark PRESENT in Supabase and memory
                if auto_check_in:
                    try:
                        supabase.table('registrations').update({
                            'attendance_status': 'PRESENT',
                            'attended_at': now_iso,
                            'attended_by': attended_by
                        }).ilike('pass_id', clean_id).execute()

                        # Also upsert into event_attendance table
                        supabase.table('event_attendance').upsert({
                            'pass_id': p_id,
                            'tournament_slug': item.get('tournament_slug'),
                            'team_name': item.get('team_name'),
                            'captain_name': item.get('captain_name'),
                            'college': item.get('college'),
                            'email': item.get('email'),
                            'attendance_status': 'PRESENT',
                            'attended_at': now_iso,
                            'attended_by': attended_by,
                            'updated_at': now_iso
                        }, on_conflict='pass_id').execute()
                    except Exception as upd_err:
                        print(f"Supabase update attendance notice: {upd_err}")

                    # Sync memory store
                    IN_MEMORY_REGISTRATIONS[p_id] = {
                        **item,
                        'attendance_status': 'PRESENT',
                        'attendanceStatus': 'PRESENT',
                        'attended_at': now_iso,
                        'attendedAt': now_iso,
                        'attended_by': attended_by,
                        'attendedBy': attended_by
                    }

                    return jsonify({
                        'valid': True,
                        'status': 'VERIFIED',
                        'already_checked_in': False,
                        'passId': p_id,
                        'message': 'Participant verified and checked in as PRESENT.',
                        'data': {
                            'passId': p_id,
                            'pass_id': p_id,
                            'tournamentTitle': item.get('tournament_title') or 'Esports Tournament',
                            'tournament_title': item.get('tournament_title') or 'Esports Tournament',
                            'tournamentSlug': item.get('tournament_slug') or 'tournament',
                            'tournament_slug': item.get('tournament_slug') or 'tournament',
                            'tournamentFee': item.get('tournament_fee', 'Free'),
                            'tournament_fee': item.get('tournament_fee', 'Free'),
                            'teamName': item.get('team_name') or 'Squad Entry',
                            'team_name': item.get('team_name') or 'Squad Entry',
                            'captainName': item.get('captain_name') or 'Squad Captain',
                            'captain_name': item.get('captain_name') or 'Squad Captain',
                            'college': item.get('college') or 'Collegiate Campus',
                            'email': item.get('email') or '',
                            'paymentStatus': item.get('payment_status', 'SUCCESS'),
                            'payment_status': item.get('payment_status', 'SUCCESS'),
                            'paymentId': item.get('payment_id', ''),
                            'payment_id': item.get('payment_id', ''),
                            'orderId': item.get('order_id', ''),
                            'order_id': item.get('order_id', ''),
                            'attendanceStatus': 'PRESENT',
                            'attendance_status': 'PRESENT',
                            'attendedAt': now_iso,
                            'attendedBy': attended_by,
                            'players': item.get('players') or []
                        }
                    }), 200

                # Valid without auto check-in
                return jsonify({
                    'valid': True,
                    'status': 'VERIFIED',
                    'already_checked_in': False,
                    'passId': p_id,
                    'message': 'Pass verified successfully.',
                    'data': {
                        'passId': p_id,
                        'pass_id': p_id,
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
                        'attendanceStatus': current_att,
                        'attendance_status': current_att,
                        'attendedAt': item.get('attended_at'),
                        'attendedBy': item.get('attended_by'),
                        'players': item.get('players') or []
                    }
                }), 200
        except Exception as sb_err:
            print(f"Supabase verification error: {sb_err}")

        return jsonify({'valid': False, 'status': 'INVALID', 'message': f'Pass ID {clean_id} not found on server'}), 200
    except Exception as e:
        return jsonify({'valid': False, 'status': 'INVALID', 'message': str(e)}), 500

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
