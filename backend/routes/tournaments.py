from flask import Blueprint, request, jsonify
from config import get_supabase_client
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
    },
    {
        "slug": "apex-rivalry-iit-vs-nit",
        "title": "Apex Rivalry: IIT vs NIT",
        "host": "Xenova",
        "image": "/apex.jpg",
        "game": "Apex Legends",
        "status": "Upcoming",
        "status_color": "#38BDF8",
        "prize": "₹1,20,000",
        "date": "2 Jul",
        "region": "Pan India",
        "format": "Trios Best of 5",
        "teams": "24/32",
        "filled": 75,
        "fee": "Free",
    }
]

IN_MEMORY_TOURNAMENTS = list(MOCK_TOURNAMENTS)

@tournaments_bp.route('/', methods=['GET'])
def get_tournaments():
    """Fetch all tournaments from Supabase (falls back to memory store if error, auto-seeds if empty)"""
    try:
        supabase = get_supabase_client()
        res = supabase.table('tournaments').select('*').execute()
        if res.data and len(res.data) > 0:
            return jsonify({'success': True, 'data': res.data}), 200
        elif res.data is not None and len(res.data) == 0:
            # Auto-seed default tournaments into Supabase
            try:
                for t in MOCK_TOURNAMENTS:
                    supabase.table('tournaments').insert(t).execute()
                res2 = supabase.table('tournaments').select('*').execute()
                if res2.data:
                    return jsonify({'success': True, 'data': res2.data}), 200
            except Exception as seed_err:
                print(f"Auto-seed warning: {seed_err}")
    except Exception as e:
        print(f"Supabase error fetching tournaments: {e}")
    
    return jsonify({'success': True, 'data': IN_MEMORY_TOURNAMENTS, 'fallback': True}), 200

VALID_TOURNAMENT_COLUMNS = {
    'slug', 'title', 'host', 'image', 'game', 'status', 'status_color',
    'prize', 'date', 'region', 'format', 'teams', 'filled', 'fee'
}

def sanitize_tournament_payload(data):
    sanitized = {}
    for k, v in data.items():
        if k == 'statusColor':
            sanitized['status_color'] = v
        elif k in VALID_TOURNAMENT_COLUMNS:
            sanitized[k] = v
    return sanitized

@tournaments_bp.route('/', methods=['POST'])
def create_tournament():
    """Create a new tournament in Supabase & memory fallback"""
    data = request.get_json() or {}
    slug = data.get('slug') or data.get('title', '').lower().replace(' ', '-')
    data['slug'] = slug
    
    clean_data = sanitize_tournament_payload(data)
    
    # Save in memory
    IN_MEMORY_TOURNAMENTS.insert(0, {**data, **clean_data})
    
    try:
        supabase = get_supabase_client()
        res = supabase.table('tournaments').insert(clean_data).execute()
        return jsonify({'success': True, 'data': res.data}), 201
    except Exception as e:
        print(f"Supabase insert warning for tournament: {e}")
        return jsonify({'success': True, 'data': [clean_data], 'fallback': True}), 201

@tournaments_bp.route('/<slug>', methods=['PATCH', 'PUT'])
def update_tournament(slug):
    """Update tournament details or status"""
    data = request.get_json() or {}
    clean_data = sanitize_tournament_payload(data)
    
    # Update in memory
    for t in IN_MEMORY_TOURNAMENTS:
        if t.get('slug') == slug:
            t.update(data)
            
    try:
        supabase = get_supabase_client()
        res = supabase.table('tournaments').update(clean_data).eq('slug', slug).execute()
        return jsonify({'success': True, 'data': res.data}), 200
    except Exception as e:
        print(f"Supabase update tournament warning: {e}")
        return jsonify({'success': True, 'data': [clean_data], 'fallback': True}), 200

@tournaments_bp.route('/<slug>', methods=['DELETE'])
def delete_tournament(slug):
    """Delete a tournament from Supabase and memory"""
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
    """Save tournament registration into Supabase database & in-memory fallback"""
    data = request.get_json() or {}
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
            'tournament_slug': data.get('tournamentSlug'),
            'tournament_title': data.get('tournamentTitle'),
            'team_id': str(data.get('teamId', '')),
            'team_name': data.get('teamName'),
            'college': data.get('college'),
            'captain_name': data.get('captainName'),
            'email': data.get('email'),
            'pass_id': pass_id,
            'registered_at': str(data.get('registeredAt', '')),
        }
        res = supabase.table('registrations').insert(payload).execute()
        return jsonify({'success': True, 'data': res.data, 'passId': pass_id}), 201
    except Exception as e:
        print(f"Supabase warning registering tournament: {e}")
        return jsonify({'success': True, 'data': [record], 'passId': pass_id, 'fallback': True}), 201

