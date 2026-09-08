from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from config import get_supabase_client
from cache import api_cache
from routes.payments import IN_MEMORY_REGISTRATIONS

tournaments_bp = Blueprint('tournaments', __name__)

MOCK_TOURNAMENTS = [
    {
        "slug": "nexus-valorant-champions-cup",
        "title": "Nexus Valorant Champions Cup",
        "host": "Xenova",
        "image": "/valorant.jpg",
        "game": "Valorant",
        "status": "Live",
        "status_color": "#FF3B30",
        "prize": "₹50,000",
        "date": "18 May",
        "region": "Pan India",
        "format": "Double Elimination",
        "teams": "64/64",
        "filled": 100,
        "fee": "Free",
    },
    {
        "slug": "bgmi-college-cup-season-4",
        "title": "BGMI College Cup Season 4",
        "host": "Xenova",
        "image": "/bgmi.jpg",
        "game": "BGMI",
        "status": "Registering",
        "status_color": "#22C55E",
        "prize": "₹2,50,000",
        "date": "2 Jun",
        "region": "South Zone",
        "format": "Squad BR",
        "teams": "78/128",
        "filled": 61,
        "fee": "₹500/team",
    },
    {
        "slug": "cs2-campus-clash",
        "title": "CS2 Campus Clash",
        "host": "Xenova",
        "image": "/cs2.jpg",
        "game": "CS2",
        "status": "Upcoming",
        "status_color": "#38BDF8",
        "prize": "₹1,80,000",
        "date": "15 Jun",
        "region": "North Zone",
        "format": "Single Elim",
        "teams": "32/64",
        "filled": 50,
        "fee": "₹300/team",
    },
    {
        "slug": "free-fire-bharat-league",
        "title": "Free Fire Bharat League",
        "host": "Xenova",
        "image": "/freefire.jpg",
        "game": "Free Fire",
        "status": "Registering",
        "status_color": "#22C55E",
        "prize": "₹3,20,000",
        "date": "28 May",
        "region": "Pan India",
        "format": "Squad BR",
        "teams": "152/200",
        "filled": 76,
        "fee": "Free",
    },
    {
        "slug": "fc-collegiate-open",
        "title": "FC Collegiate Open",
        "host": "Xenova",
        "image": "/fc.jpg",
        "game": "FC / FIFA",
        "status": "Live",
        "status_color": "#FF3B30",
        "prize": "₹75,000",
        "date": "15 May",
        "region": "West Zone",
        "format": "1v1 Knockout",
        "teams": "96/128",
        "filled": 75,
        "fee": "₹150",
    }
]

IN_MEMORY_TOURNAMENTS = list(MOCK_TOURNAMENTS)

def compute_registration_closed(target):
    """
    Server-side dynamic registration closing check.
    Accepts either a tournament dict OR a registration_deadline value (str/datetime/None).
    Rules:
    - If deadline is None/missing: is_registration_closed = False
    - If current server UTC time >= registration_deadline: is_registration_closed = True
    - Otherwise: is_registration_closed = False
    Does NOT permanently overwrite database status.
    """
    if target is None:
        return False
    if isinstance(target, dict):
        deadline_val = target.get('registration_deadline')
    else:
        deadline_val = target

    if not deadline_val:
        return False

    try:
        if isinstance(deadline_val, datetime):
            deadline_dt = deadline_val
        else:
            clean_str = str(deadline_val).strip()
            if not clean_str:
                return False
            clean_str = clean_str.replace('Z', '+00:00')
            deadline_dt = datetime.fromisoformat(clean_str)
        if deadline_dt.tzinfo is None:
            deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) >= deadline_dt
    except Exception as err:
        print(f"[WARN] Error parsing registration_deadline '{deadline_val}': {err}")
        return False

def enrich_tournament_response(tournament):
    """Adds is_registration_closed and normalized registration_deadline to tournament dict without mutating DB."""
    if not tournament or not isinstance(tournament, dict):
        return tournament
    tournament['registration_deadline'] = tournament.get('registration_deadline') or None
    tournament['is_registration_closed'] = compute_registration_closed(tournament)
    return tournament

@tournaments_bp.route('', methods=['GET'])
@tournaments_bp.route('/', methods=['GET'])
def get_tournaments():
    """Fetch all tournaments with dynamic is_registration_closed evaluation"""
    cached = api_cache.get('tournaments:all')
    if cached is not None:
        enriched = [enrich_tournament_response(t) for t in cached]
        return jsonify({'success': True, 'data': enriched, 'cached': True}), 200

    try:
        supabase = get_supabase_client()
        res = supabase.table('tournaments').select('*').execute()
        if res.data is not None:
            api_cache.set('tournaments:all', res.data, ttl_seconds=20)
            enriched = [enrich_tournament_response(t) for t in res.data]
            return jsonify({'success': True, 'data': enriched}), 200
    except Exception as e:
        print(f"Supabase error fetching tournaments: {e}")
    
    enriched = [enrich_tournament_response(t) for t in IN_MEMORY_TOURNAMENTS]
    return jsonify({'success': True, 'data': enriched, 'fallback': True}), 200

@tournaments_bp.route('/<slug>', methods=['GET'])
def get_tournament_by_slug(slug):
    """Fetch a single tournament by slug with server-calculated is_registration_closed"""
    clean_slug = str(slug or '').strip().lower()
    if not clean_slug:
        return jsonify({'success': False, 'message': 'Tournament slug is required.'}), 400

    try:
        supabase = get_supabase_client()
        res = supabase.table('tournaments').select('*').ilike('slug', clean_slug).execute()
        if res.data and len(res.data) > 0:
            return jsonify({'success': True, 'data': enrich_tournament_response(res.data[0])}), 200
    except Exception as e:
        print(f"Supabase error fetching tournament {slug}: {e}")

    for t in IN_MEMORY_TOURNAMENTS:
        if (t.get('slug') or '').strip().lower() == clean_slug:
            return jsonify({'success': True, 'data': enrich_tournament_response(t), 'fallback': True}), 200

    return jsonify({'success': False, 'message': f"Tournament '{slug}' not found."}), 404

VALID_TOURNAMENT_COLUMNS = {
    'slug', 'title', 'host', 'image', 'game', 'status', 'status_color',
    'prize', 'date', 'region', 'format', 'teams', 'filled', 'fee', 'organizer_email',
    'description', 'rules', 'schedule', 'map_pool', 'contact_email', 'discord_url',
    'organizer_name', 'organizer_phone', 'organizer_college', 'contact_phone',
    'college', 'prize_1st', 'prize_2nd', 'prize_3rd', 'registration_deadline'
}

def sanitize_tournament_payload(data):
    sanitized = {}
    for k, v in data.items():
        if k == 'statusColor':
            sanitized['status_color'] = v
        elif k == 'organizerEmail' or k == 'createdBy':
            sanitized['organizer_email'] = v
        elif k in ('registration_deadline', 'registrationDeadline'):
            if v is None or v == '' or str(v).lower() in ('null', 'none'):
                sanitized['registration_deadline'] = None
            else:
                sanitized['registration_deadline'] = str(v).strip()
        elif k in VALID_TOURNAMENT_COLUMNS:
            sanitized[k] = v
    return sanitized

@tournaments_bp.route('/', methods=['POST'])
def create_tournament():
    """Create a new tournament in Supabase & memory fallback with organizer tracking"""
    api_cache.clear_prefix('tournaments')
    data = request.get_json() or {}
    slug = data.get('slug') or data.get('title', '').lower().replace(' ', '-')
    data['slug'] = slug
    
    organizer_email = (data.get('organizer_email') or data.get('createdBy') or data.get('email') or '').strip().lower()
    host = (data.get('host') or data.get('hostName') or data.get('host_name') or 'Verified Organizer').strip()
    data['host'] = host
    data['organizer_email'] = organizer_email
    data['createdBy'] = organizer_email
    
    clean_data = sanitize_tournament_payload(data)
    
    # Save in memory
    IN_MEMORY_TOURNAMENTS.insert(0, {**data, **clean_data})
    
    try:
        supabase = get_supabase_client()
        # Try inserting with organizer_email column
        try:
            res = supabase.table('tournaments').insert(clean_data).execute()
            saved = res.data[0] if res.data and len(res.data) > 0 else clean_data
            return jsonify({'success': True, 'data': enrich_tournament_response(saved)}), 201
        except Exception:
            # Fallback without organizer_email if schema cache does not have the column yet
            fallback_clean = {k: v for k, v in clean_data.items() if k != 'organizer_email'}
            res = supabase.table('tournaments').insert(fallback_clean).execute()
            saved = res.data[0] if res.data and len(res.data) > 0 else fallback_clean
            return jsonify({'success': True, 'data': enrich_tournament_response(saved)}), 201
    except Exception as e:
        print(f"Supabase insert warning for tournament: {e}")
        return jsonify({'success': True, 'data': [enrich_tournament_response(clean_data)], 'fallback': True}), 201

@tournaments_bp.route('/<slug>', methods=['PATCH', 'PUT'])
def update_tournament(slug):
    """Update tournament details or status with upsert into Supabase and memory with organizer authorization"""
    api_cache.clear_prefix('tournaments')

    # Authorize caller
    from routes.auth import get_authenticated_user
    from routes.payments import is_user_authorized_for_tournament, load_tournament_for_payment

    user = get_authenticated_user()
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    existing_t = load_tournament_for_payment(slug)
    if existing_t:
        if not is_user_authorized_for_tournament(user, existing_t):
            return jsonify({
                'success': False,
                'message': 'You are not authorized to update this tournament.'
            }), 403
    else:
        role = (user.get('role') or 'PLAYER').strip().upper()
        if role not in ('ORGANIZER', 'ADMIN'):
            return jsonify({
                'success': False,
                'message': 'Organizer or Admin permissions required.'
            }), 403

    data = request.get_json() or {}
    clean_data = sanitize_tournament_payload(data)
    
    # Update in memory
    found_mem = False
    for t in IN_MEMORY_TOURNAMENTS:
        if t.get('slug') == slug:
            t.update(clean_data)
            found_mem = True
            break
    if not found_mem:
        IN_MEMORY_TOURNAMENTS.insert(0, {'slug': slug, **clean_data})
            
    saved_row = {'slug': slug, **clean_data}
    try:
        supabase = get_supabase_client()
        existing = supabase.table('tournaments').select('id').eq('slug', slug).execute()
        if existing.data and len(existing.data) > 0:
            res = supabase.table('tournaments').update(clean_data).eq('slug', slug).execute()
            if res.data and len(res.data) > 0:
                saved_row = res.data[0]
        else:
            insert_data = {'slug': slug, **clean_data}
            res = supabase.table('tournaments').insert(insert_data).execute()
            if res.data and len(res.data) > 0:
                saved_row = res.data[0]
        return jsonify({'success': True, 'data': enrich_tournament_response(saved_row)}), 200
    except Exception as e:
        print(f"Supabase update tournament warning: {e}")
        return jsonify({'success': True, 'data': [enrich_tournament_response(clean_data)], 'fallback': True}), 200

@tournaments_bp.route('/<slug>', methods=['DELETE'])
def delete_tournament(slug):
    """Delete a tournament from Supabase and memory"""
    api_cache.clear_prefix('tournaments')
    global IN_MEMORY_TOURNAMENTS
    IN_MEMORY_TOURNAMENTS = [t for t in IN_MEMORY_TOURNAMENTS if t.get('slug') != slug]
    
    try:
        supabase = get_supabase_client()
        supabase.table('tournaments').delete().eq('slug', slug).execute()
        return jsonify({'success': True, 'message': 'Tournament deleted from database'}), 200
    except Exception as e:
        print(f"Supabase delete tournament warning: {e}")
        return jsonify({'success': True, 'message': 'Tournament removed from memory'}), 200


@tournaments_bp.route('/register', methods=['POST'])
def register_tournament():
    """Save tournament registration with server-authoritative deadline enforcement"""
    data = request.get_json() or {}
    slug = (data.get('tournamentSlug') or data.get('tournament_slug') or '').strip()

    # Authoritative registration deadline enforcement
    from routes.payments import load_tournament_for_payment
    tournament = load_tournament_for_payment(slug)
    if tournament and compute_registration_closed(tournament):
        return jsonify({
            'success': False,
            'error': 'Registrations for this tournament are now closed.',
            'message': 'Registrations for this tournament are now closed.'
        }), 400
    pass_id = data.get('passId') or data.get('pass_id') or f"XPH-{hash(str(data)) % 100000000:08X}"
    
    record = {
        'pass_id': pass_id,
        'passId': pass_id,
        'tournament_slug': data.get('tournamentSlug'),
        'tournamentSlug': data.get('tournamentSlug'),
        'tournament_title': data.get('tournamentTitle'),
        'tournamentTitle': data.get('tournamentTitle'),
        'team_id': str(data.get('teamId', '')),
        'team_name': data.get('teamName'),
        'teamName': data.get('teamName'),
        'college': data.get('college'),
        'captain_name': data.get('captainName'),
        'captainName': data.get('captainName'),
        'email': data.get('email'),
        'registered_at': str(data.get('registeredAt', '')),
        'registeredAt': str(data.get('registeredAt', ''))
    }
    
    # Store in memory
    IN_MEMORY_REGISTRATIONS[pass_id] = record
    
    try:
        supabase = get_supabase_client()
        payload = {
            'tournament_slug': data.get('tournamentSlug') or 'tournament',
            'tournament_title': data.get('tournamentTitle') or 'Tournament',
            'team_id': str(data.get('teamId', '')),
            'team_name': data.get('teamName') or 'Team',
            'college': data.get('college') or '',
            'captain_name': data.get('captainName') or 'Captain',
            'email': data.get('email') or '',
            'pass_id': pass_id,
            'registered_at': str(data.get('registeredAt', '')),
        }
        try:
            res = supabase.table('registrations').insert({**payload, 'attendance_status': 'NOT_MARKED'}).execute()
        except Exception:
            res = supabase.table('registrations').insert(payload).execute()

        # Also insert initial event_attendance row
        try:
            att_payload = {
                'pass_id': pass_id,
                'tournament_slug': data.get('tournamentSlug') or 'tournament',
                'team_name': data.get('teamName') or 'Team',
                'captain_name': data.get('captainName') or 'Captain',
                'college': data.get('college') or '',
                'email': data.get('email') or '',
                'attendance_status': 'NOT_MARKED'
            }
            existing_att = supabase.table('event_attendance').select('id').eq('pass_id', pass_id).execute()
            if existing_att.data and len(existing_att.data) > 0:
                supabase.table('event_attendance').update(att_payload).eq('pass_id', pass_id).execute()
            else:
                supabase.table('event_attendance').insert(att_payload).execute()

            # Save 4 players to tournament_rosters table
            from routes.rosters import save_tournament_rosters_to_db
            players = data.get('players', [])
            save_tournament_rosters_to_db(supabase, pass_id, data.get('tournamentSlug') or 'tournament', data.get('teamName') or 'Team', data.get('college') or '', players)
        except Exception as att_err:
            print(f"event_attendance / tournament_rosters initial insert notice: {att_err}")

        return jsonify({'success': True, 'data': res.data, 'passId': pass_id}), 201
    except Exception as e:
        print(f"Supabase warning registering tournament: {e}")
        return jsonify({'success': True, 'data': [record], 'passId': pass_id, 'fallback': True}), 201

