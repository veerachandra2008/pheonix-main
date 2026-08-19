from flask import Blueprint, request, jsonify
from config import get_supabase_client

teams_bp = Blueprint('teams', __name__)

MOCK_TEAMS = [
    {
        'slug': 'team-titans',
        'name': 'Team Titans',
        'college': 'Nexus Institute of Technology',
        'game': 'Valorant',
        'rank': 2,
        'win_rate': 86,
        'streak': 'W7',
        'captain': 'Aarav "Viper" Rao',
        'trophies': 9,
        'members': 6,
        'recent_wins': 5,
        'form': ['W', 'W', 'W', 'L', 'W'],
        'active_score': 98,
        'joined': 2026,
        'accent': '#6366f1',
        'verified': True,
        'verification_status': 'approved'
    },
    {
        'slug': 'team-phoenix',
        'name': 'Team Phoenix',
        'college': 'Arcadia College',
        'game': 'BGMI',
        'rank': 1,
        'win_rate': 91,
        'streak': 'W11',
        'captain': 'Nisha "Blaze" Menon',
        'trophies': 12,
        'members': 5,
        'recent_wins': 7,
        'form': ['W', 'W', 'W', 'W', 'W'],
        'active_score': 96,
        'joined': 2025,
        'accent': '#f43f5e',
        'verified': True,
        'verification_status': 'approved'
    },
    {
        'slug': 'team-wolves',
        'name': 'Team Wolves',
        'college': 'Metro School of Design',
        'game': 'Valorant',
        'rank': 5,
        'win_rate': 73,
        'streak': 'L1',
        'captain': 'Kabir "Ghost" Singh',
        'trophies': 5,
        'members': 6,
        'recent_wins': 3,
        'form': ['W', 'L', 'W', 'W', 'L'],
        'active_score': 88,
        'joined': 2024,
        'accent': '#22d3ee',
        'verified': True,
        'verification_status': 'approved'
    },
    {
        'slug': 'team-alpha',
        'name': 'Team Alpha',
        'college': 'Eastern Commerce University',
        'game': 'Free Fire',
        'rank': 8,
        'win_rate': 68,
        'streak': 'W2',
        'captain': 'Ishan "Ace" Verma',
        'trophies': 4,
        'members': 4,
        'recent_wins': 2,
        'form': ['L', 'W', 'L', 'W', 'W'],
        'active_score': 77,
        'joined': 2026,
        'accent': '#10b981',
        'verified': True,
        'verification_status': 'approved'
    },
    {
        'slug': 'cyber-hawks',
        'name': 'Cyber Hawks',
        'college': 'Westbridge Engineering College',
        'game': 'CS2',
        'rank': 4,
        'win_rate': 79,
        'streak': 'W4',
        'captain': 'Rehan "Scope" Khan',
        'trophies': 7,
        'members': 5,
        'recent_wins': 4,
        'form': ['W', 'W', 'L', 'W', 'W'],
        'active_score': 91,
        'joined': 2025,
        'accent': '#fbbf24',
        'verified': True,
        'verification_status': 'approved'
    },
    {
        'slug': 'royal-strikers',
        'name': 'Royal Strikers',
        'college': 'National Sports Academy',
        'game': 'FC24',
        'rank': 6,
        'win_rate': 75,
        'streak': 'W3',
        'captain': 'Dev "Prime" Kapoor',
        'trophies': 6,
        'members': 3,
        'recent_wins': 4,
        'form': ['W', 'L', 'W', 'W', 'W'],
        'active_score': 84,
        'joined': 2024,
        'accent': '#a855f7',
        'verified': True,
        'verification_status': 'approved'
    },
]

IN_MEMORY_TEAMS = list(MOCK_TEAMS)

@teams_bp.route('/', methods=['GET'])
def get_teams():
    """Fetch all teams from Supabase with memory fallback"""
    try:
        supabase = get_supabase_client()
        res = supabase.table('teams').select('*').execute()
        if res.data and len(res.data) > 0:
            return jsonify({'success': True, 'data': res.data}), 200
    except Exception as e:
        print(f"Supabase error fetching teams: {e}")
    
    return jsonify({'success': True, 'data': IN_MEMORY_TEAMS, 'fallback': True}), 200

@teams_bp.route('/', methods=['POST'])
def create_team():
    """Create a new team in Supabase and memory fallback"""
    data = request.get_json() or {}
    slug = data.get('slug') or data.get('name', '').lower().replace(' ', '-')
    data['slug'] = slug
    
    # Store in memory
    IN_MEMORY_TEAMS.insert(0, data)
    
    try:
        supabase = get_supabase_client()
        res = supabase.table('teams').insert(data).execute()
        return jsonify({'success': True, 'data': res.data}), 201
    except Exception as e:
        print(f"Supabase insert warning for team: {e}")
        return jsonify({'success': True, 'data': [data], 'fallback': True}), 201

@teams_bp.route('/seed', methods=['POST'])
def seed_teams():
    """Seed default teams into Supabase table"""
    try:
        supabase = get_supabase_client()
        existing_res = supabase.table('teams').select('slug').execute()
        existing_slugs = {item['slug'] for item in (existing_res.data or []) if 'slug' in item}
        
        to_insert = [t for t in MOCK_TEAMS if t['slug'] not in existing_slugs]
        inserted = []
        if to_insert:
            res = supabase.table('teams').insert(to_insert).execute()
            inserted = res.data or []
        return jsonify({'success': True, 'inserted': len(inserted), 'total': len(MOCK_TEAMS)}), 200
    except Exception as e:
        print(f"Supabase teams seeding error: {e}")
        return jsonify({
            'success': False,
            'message': f"Supabase teams seeding failed: {str(e)}. Please check SUPABASE_KEY or run SQL seed script.",
            'error': str(e)
        }), 400
