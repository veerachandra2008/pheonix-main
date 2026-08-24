import hashlib
from concurrent.futures import ThreadPoolExecutor
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
@auth_bp.route('/users/role', methods=['POST', 'PATCH', 'PUT'])
def update_user_role():
    """
    Explicitly update a user's role in Supabase users table and memory store.
    If demoted to 'PLAYER', cleans up any organizer application record as well.
    """
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        role = (data.get('role') or 'PLAYER').strip().upper()

        if not email:
            return jsonify({'success': False, 'message': 'Email is required.'}), 400

        # Update in-memory user
        if email in IN_MEMORY_USERS:
            current_role = IN_MEMORY_USERS[email].get('role', '').upper()
            if current_role == 'ADMIN':
                return jsonify({'success': True, 'message': 'User is ADMIN, role unchanged.'}), 200
            IN_MEMORY_USERS[email]['role'] = role

        # Update in Supabase users table
        try:
            supabase = get_supabase_client()
            existing = supabase.table('users').select('role').eq('email', email).execute()
            if existing.data and len(existing.data) > 0:
                current_role = (existing.data[0].get('role') or '').upper()
                if current_role == 'ADMIN':
                    return jsonify({'success': True, 'message': 'User is ADMIN, role unchanged.'}), 200

            try:
                supabase.table('users').update({'role': role}).eq('email', email).execute()
            except Exception:
                try:
                    supabase.table('users').update({'role': role.lower()}).eq('email', email).execute()
                except Exception:
                    pass

            if role in ['PLAYER', 'player']:
                try:
                    supabase.table('organizer_applications').delete().eq('email', email).execute()
                except Exception:
                    try:
                        supabase.table('organizer_applications').update({'status': 'REJECTED'}).eq('email', email).execute()
                    except Exception:
                        pass
        except Exception as sb_err:
            print(f"Supabase update-role notice: {sb_err}")

        return jsonify({'success': True, 'message': f"Role for {email} updated to {role}."}), 200
    except Exception as e:
        print(f"Error updating user role: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500



@auth_bp.route('/organizers', methods=['GET'])
def get_organizers():
    """
    Fetch all approved organizers directly from Supabase organizer_applications table.
    STRICTLY returns ONLY approved organizers (status == 'APPROVED').
    """
    try:
        organizers = []
        seen_emails = set()
        supabase_connected = False

        try:
            supabase = get_supabase_client()
            res = supabase.table('organizer_applications').select('*').execute()
            apps_data = res.data if res.data is not None else []
            supabase_connected = True

            for app in apps_data:
                status = (app.get('status') or '').strip().upper()
                email = (app.get('email') or '').strip().lower()
                # STRICTLY APPROVED ONLY
                if (status == 'APPROVED' or status == 'approved') and email and email not in seen_emails:
                    organizers.append({
                        'id': app.get('id'),
                        'email': email,
                        'name': app.get('host_name') or app.get('name') or email.split('@')[0].capitalize(),
                        'host_name': app.get('host_name') or app.get('name'),
                        'college': app.get('college') or 'Independent Campus',
                        'role': 'ORGANIZER',
                        'preferred_game': app.get('preferred_game') or 'Valorant',
                        'experience': app.get('experience') or 'Intermediate',
                        'details': app.get('details') or '',
                        'status': 'approved',
                        'applied_at': app.get('applied_at'),
                        'tag': f"HOST#{abs(hash(email)) % 9000 + 1000}"
                    })
                    seen_emails.add(email)
        except Exception as sb_err:
            print(f"Supabase organizers fetch warning: {sb_err}")

        # If Supabase was connected and returned data, trust Supabase as single source of truth
        if supabase_connected:
            return jsonify({'success': True, 'data': organizers}), 200

        # Fallback only if Supabase was completely unreachable
        from routes.applications import IN_MEMORY_ORGANIZER_APPS
        for app in IN_MEMORY_ORGANIZER_APPS:
            status = (app.get('status') or '').strip().upper()
            email = (app.get('email') or '').strip().lower()
            if status == 'APPROVED' and email and email not in seen_emails:
                organizers.append({
                    'id': app.get('id'),
                    'email': email,
                    'name': app.get('host_name') or app.get('hostName') or email.split('@')[0].capitalize(),
                    'college': app.get('college') or 'Independent Campus',
                    'role': 'ORGANIZER',
                    'status': 'approved',
                    'preferred_game': app.get('preferred_game') or 'Valorant',
                    'tag': f"HOST#{abs(hash(email)) % 9000 + 1000}"
                })
                seen_emails.add(email)

        return jsonify({'success': True, 'data': organizers, 'fallback': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/organizers/<path:email>', methods=['DELETE'])
@auth_bp.route('/organizers', methods=['DELETE'])
def delete_organizer(email=None):
    """
    Revoke organizer privileges / delete organizer.
    Demotes user to 'PLAYER' and removes/rejects application in Supabase and memory.
    """
    try:
        data = request.get_json(silent=True) or {}
        target_email = (email or data.get('email') or '').strip().lower()
        if not target_email:
            return jsonify({'success': False, 'message': 'Organizer email is required.'}), 400

        # 1. Update in-memory user role
        if target_email in IN_MEMORY_USERS:
            if IN_MEMORY_USERS[target_email].get('role') != 'ADMIN':
                IN_MEMORY_USERS[target_email]['role'] = 'PLAYER'

        # 2. Update in-memory organizer applications
        from routes.applications import IN_MEMORY_ORGANIZER_APPS
        for app in IN_MEMORY_ORGANIZER_APPS:
            if (app.get('email') or '').strip().lower() == target_email:
                app['status'] = 'rejected'
                app['verification_status'] = 'rejected'

        # 3. Update / delete in Supabase
        try:
            supabase = get_supabase_client()
            # Demote in users table
            try:
                supabase.table('users').update({'role': 'PLAYER'}).eq('email', target_email).execute()
            except Exception:
                try:
                    supabase.table('users').update({'role': 'player'}).eq('email', target_email).execute()
                except Exception:
                    pass

            # Delete or mark rejected in organizer_applications
            try:
                supabase.table('organizer_applications').delete().eq('email', target_email).execute()
            except Exception:
                try:
                    supabase.table('organizer_applications').update({'status': 'REJECTED'}).eq('email', target_email).execute()
                except Exception:
                    pass
        except Exception as sb_err:
            print(f"Supabase delete organizer notice: {sb_err}")

        return jsonify({
            'success': True,
            'message': f"Organizer privileges revoked for {target_email}."
        }), 200
    except Exception as e:
        print(f"Delete Organizer Error: {e}")
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


