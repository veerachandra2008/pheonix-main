import hashlib
from flask import Blueprint, request, jsonify
from config import get_supabase_client

auth_bp = Blueprint('auth', __name__)

IN_MEMORY_USERS = {
    'admin@xenova.gg': {
        'id': 1,
        'name': 'Xenova Admin',
        'email': 'admin@xenova.gg',
        'college': 'Xenova HQ',
        'role': 'ADMIN',
        'avatar_url': '/valorant.jpg',
        'tag': 'ADMIN#1337'
    }
}

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user and store profile in Supabase database & in-memory fallback.
    Default role is always 'PLAYER'.
    """
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        college = data.get('college', '').strip()

        if not email or not password or not name:
            return jsonify({'success': False, 'message': 'Name, email, and password are required.'}), 400

        # Check memory store
        if email in IN_MEMORY_USERS:
            return jsonify({
                'success': False,
                'already_registered': True,
                'message': 'Account already exists for this email! Please sign in.'
            }), 400

        user_payload = {
            'id': len(IN_MEMORY_USERS) + 1,
            'name': name,
            'email': email,
            'college': college or 'General Campus',
            'role': 'PLAYER',
            'bio': f"Registered player from {college or 'Collegiate Esports'}",
            'rank': 1,
            'win_rate': 0.0,
            'trophies': 0,
            'avatar_url': '/valorant.jpg'
        }

        IN_MEMORY_USERS[email] = user_payload

        # Try inserting into Supabase
        try:
            supabase = get_supabase_client()
            existing = supabase.table('users').select('*').eq('email', email).execute()
            if existing.data and len(existing.data) > 0:
                return jsonify({
                    'success': False,
                    'already_registered': True,
                    'message': 'Account already exists for this email! Please sign in.'
                }), 400
            res = supabase.table('users').insert(user_payload).execute()
            if res.data:
                user_payload = res.data[0]
        except Exception as sb_err:
            print(f"Supabase user insert warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': 'Registration successful! You are registered as PLAYER. You can now sign in.',
            'user': user_payload
        }), 201

    except Exception as e:
        print(f"Registration Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Sign in user. Queries Supabase or in-memory fallback.
    """
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

        user = None

        # 1. Try Supabase
        try:
            supabase = get_supabase_client()
            res = supabase.table('users').select('*').eq('email', email).execute()
            if res.data and len(res.data) > 0:
                user = res.data[0]
        except Exception as sb_err:
            print(f"Supabase login lookup warning: {sb_err}")

        # 2. Check in-memory store if not found in Supabase
        if not user and email in IN_MEMORY_USERS:
            user = IN_MEMORY_USERS[email]

        if not user:
            return jsonify({
                'success': False,
                'requires_registration': True,
                'message': 'No account found with this email! You must register first before signing in.'
            }), 404

        active_role = user.get('role', 'PLAYER').upper()

        return jsonify({
            'success': True,
            'message': 'Signed in successfully!',
            'user': {
                'id': user.get('id'),
                'name': user.get('name'),
                'email': user.get('email'),
                'college': user.get('college'),
                'role': active_role.lower(),  # 'player', 'organizer', or 'admin'
                'avatar': user.get('avatar_url') or '/valorant.jpg',
                'tag': f"{user.get('name', 'Gamer').upper().replace(' ', '')}#1337"
            }
        }), 200

    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/update-role', methods=['POST'])
def update_role():
    """
    Update a user's role in Supabase & memory store.
    """
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        new_role = data.get('role', '').strip().upper() # 'ORGANIZER' or 'PLAYER'

        if not email or not new_role:
            return jsonify({'success': False, 'message': 'Email and role are required.'}), 400

        if email in IN_MEMORY_USERS:
            current_role = IN_MEMORY_USERS[email].get('role', '').upper()
            if current_role != 'ADMIN':
                IN_MEMORY_USERS[email]['role'] = new_role

        try:
            supabase = get_supabase_client()
            existing = supabase.table('users').select('role').eq('email', email).execute()
            if existing.data and len(existing.data) > 0:
                current_role = existing.data[0].get('role', '').upper()
                if current_role == 'ADMIN':
                    return jsonify({'success': True, 'message': 'User is ADMIN, role unchanged.'}), 200

            res = supabase.table('users').update({'role': new_role}).eq('email', email).execute()
        except Exception as sb_err:
            print(f"Supabase update-role warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': f"User role updated to {new_role}.",
        }), 200

    except Exception as e:
        print(f"Update Role Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/organizers', methods=['GET'])
def get_organizers():
    """
    Fetch all users with role 'ORGANIZER' or 'ADMIN' from Supabase and memory store.
    """
    try:
        organizers = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('users').select('*').in_('role', ['ORGANIZER', 'ADMIN', 'organizer', 'admin']).execute()
            if res.data and len(res.data) > 0:
                organizers = res.data
        except Exception as sb_err:
            print(f"Supabase organizers fetch warning: {sb_err}")

        # Merge with in-memory users
        seen_emails = {u.get('email', '').lower() for u in organizers if u.get('email')}
        for email, user in IN_MEMORY_USERS.items():
            if user.get('role', '').upper() in ['ORGANIZER', 'ADMIN'] and email.lower() not in seen_emails:
                organizers.append(user)
                seen_emails.add(email.lower())

        return jsonify({'success': True, 'data': organizers}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    """
    Fetch all registered users from Supabase and memory store.
    """
    try:
        users = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('users').select('*').execute()
            if res.data and len(res.data) > 0:
                users = res.data
        except Exception as sb_err:
            print(f"Supabase users fetch warning: {sb_err}")

        # Merge with memory store
        seen_emails = {u.get('email', '').lower() for u in users if u.get('email')}
        for email, user in IN_MEMORY_USERS.items():
            if email.lower() not in seen_emails:
                users.append(user)
                seen_emails.add(email.lower())

        return jsonify({'success': True, 'data': users, 'total': len(users)}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


