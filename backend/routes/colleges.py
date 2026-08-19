from flask import Blueprint, request, jsonify
from config import get_supabase_client

colleges_bp = Blueprint('colleges', __name__)

MOCK_COLLEGES = [
    {
        'slug': 'nexus-institute-of-technology',
        'name': 'Nexus Institute of Technology',
        'location': 'Bengaluru, Karnataka',
        'state': 'Karnataka',
        'type': 'Engineering',
        'national_rank': 1,
        'state_rank': 1,
        'players': 428,
        'teams': 18,
        'teams_count': 18,
        'trophies': 34,
        'wins': 21,
        'verified': True,
        'verification_status': 'approved',
        'accent': '#6366f1',
        'website': 'nexus.edu',
    },
    {
        'slug': 'arcadia-college',
        'name': 'Arcadia College',
        'location': 'Mumbai, Maharashtra',
        'state': 'Maharashtra',
        'type': 'University',
        'national_rank': 2,
        'state_rank': 1,
        'players': 392,
        'teams': 16,
        'teams_count': 16,
        'trophies': 31,
        'wins': 19,
        'verified': True,
        'verification_status': 'approved',
        'accent': '#f43f5e',
        'website': 'arcadia.ac.in',
    },
    {
        'slug': 'metro-school-of-design',
        'name': 'Metro School of Design',
        'location': 'New Delhi, Delhi',
        'state': 'Delhi',
        'type': 'Design',
        'national_rank': 5,
        'state_rank': 2,
        'players': 244,
        'teams': 11,
        'teams_count': 11,
        'trophies': 16,
        'wins': 12,
        'verified': True,
        'verification_status': 'approved',
        'accent': '#22d3ee',
        'website': 'metrodesign.edu',
    },
    {
        'slug': 'eastern-commerce-university',
        'name': 'Eastern Commerce University',
        'location': 'Chennai, Tamil Nadu',
        'state': 'Tamil Nadu',
        'type': 'Commerce',
        'national_rank': 8,
        'state_rank': 3,
        'players': 210,
        'teams': 9,
        'teams_count': 9,
        'trophies': 12,
        'wins': 10,
        'verified': True,
        'verification_status': 'approved',
        'accent': '#10b981',
        'website': 'easterncommerce.com',
    },
    {
        'slug': 'westbridge-engineering-college',
        'name': 'Westbridge Engineering College',
        'location': 'Hyderabad, Telangana',
        'state': 'Telangana',
        'type': 'Engineering',
        'national_rank': 4,
        'state_rank': 1,
        'players': 318,
        'teams': 14,
        'teams_count': 14,
        'trophies': 22,
        'wins': 17,
        'verified': True,
        'verification_status': 'approved',
        'accent': '#fbbf24',
        'website': 'westbridge.edu',
    },
    {
        'slug': 'national-sports-academy',
        'name': 'National Sports Academy',
        'location': 'Pune, Maharashtra',
        'state': 'Maharashtra',
        'type': 'Sports',
        'national_rank': 6,
        'state_rank': 2,
        'players': 276,
        'teams': 12,
        'teams_count': 12,
        'trophies': 18,
        'wins': 14,
        'verified': True,
        'verification_status': 'approved',
        'accent': '#a855f7',
        'website': 'nsa.edu.in',
    },
    {
        'slug': 'malla-reddy-university',
        'name': 'Malla Reddy University',
        'location': 'Hyderabad, Telangana',
        'state': 'Telangana',
        'type': 'University',
        'national_rank': 7,
        'state_rank': 2,
        'players': 264,
        'teams': 10,
        'teams_count': 10,
        'trophies': 15,
        'wins': 11,
        'verified': True,
        'verification_status': 'approved',
        'accent': '#ef4444',
        'website': 'mallareddyuniversity.ac.in',
    },
]

IN_MEMORY_COLLEGES = list(MOCK_COLLEGES)

@colleges_bp.route('/', methods=['GET'])
def get_colleges():
    """Fetch all colleges from Supabase with memory fallback"""
    try:
        supabase = get_supabase_client()
        res = supabase.table('colleges').select('*').execute()
        if res.data and len(res.data) > 0:
            return jsonify({'success': True, 'data': res.data}), 200
    except Exception as e:
        print(f"Supabase error fetching colleges: {e}")
    
    return jsonify({'success': True, 'data': IN_MEMORY_COLLEGES, 'fallback': True}), 200

@colleges_bp.route('/', methods=['POST'])
def create_college():
    """Create a new college in Supabase and memory fallback"""
    data = request.get_json() or {}
    slug = data.get('slug') or data.get('name', '').lower().replace(' ', '-')
    data['slug'] = slug
    
    # Store in memory
    IN_MEMORY_COLLEGES.insert(0, data)
    
    try:
        supabase = get_supabase_client()
        res = supabase.table('colleges').insert(data).execute()
        return jsonify({'success': True, 'data': res.data}), 201
    except Exception as e:
        print(f"Supabase insert warning for college: {e}")
        return jsonify({'success': True, 'data': [data], 'fallback': True}), 201

@colleges_bp.route('/seed', methods=['POST'])
def seed_colleges():
    """Seed default colleges into Supabase table"""
    try:
        supabase = get_supabase_client()
        existing_res = supabase.table('colleges').select('slug').execute()
        existing_slugs = {item['slug'] for item in (existing_res.data or []) if 'slug' in item}
        
        to_insert = [c for c in MOCK_COLLEGES if c['slug'] not in existing_slugs]
        inserted = []
        if to_insert:
            res = supabase.table('colleges').insert(to_insert).execute()
            inserted = res.data or []
        return jsonify({'success': True, 'inserted': len(inserted), 'total': len(MOCK_COLLEGES)}), 200
    except Exception as e:
        print(f"Supabase colleges seeding error: {e}")
        return jsonify({
            'success': False,
            'message': f"Supabase colleges seeding failed: {str(e)}. Please check SUPABASE_KEY or run SQL seed script.",
            'error': str(e)
        }), 400
