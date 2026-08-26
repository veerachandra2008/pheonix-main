import hashlib
from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, request, jsonify
from config import get_supabase_client
from cache import api_cache

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
    Fetch all registered users strictly from Supabase users table with caching.
    """
    try:
        cached = api_cache.get('users:all')
        if cached is not None:
            return jsonify({'success': True, 'data': cached, 'total': len(cached), 'cached': True}), 200

        raw_users = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('users').select('*').order('created_at', desc=True).execute()
            if res.data is not None:
                raw_users = res.data
        except Exception as sb_err:
            print(f"Supabase users fetch warning: {sb_err}")

        # If Supabase returned rows, map them
        formatted_users = []
        seen_emails = set()
        for u in raw_users:
            em = (u.get('email') or '').strip().lower()
            if em and em not in seen_emails:
                seen_emails.add(em)
                formatted_users.append({
                    'id': str(u.get('id', '')),
                    'name': u.get('name', 'Athlete'),
                    'email': em,
                    'college': u.get('college', 'University Campus'),
                    'role': (u.get('role') or 'PLAYER').lower(),
                    'bio': u.get('bio', ''),
                    'tag': u.get('tag') or f"{u.get('name', 'Gamer').upper().replace(' ', '')}#1337",
                    'avatar': u.get('avatar_url') or '/valorant.jpg',
                    'avatar_url': u.get('avatar_url') or '/valorant.jpg',
                    'rank': u.get('rank', 1),
                    'win_rate': u.get('win_rate', 0.0),
                    'trophies': u.get('trophies', 0),
                    'created_at': u.get('created_at')
                })

        api_cache.set('users:all', formatted_users, ttl_seconds=30)
        return jsonify({'success': True, 'data': formatted_users, 'total': len(formatted_users)}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/profile', methods=['GET', 'OPTIONS'])
@auth_bp.route('/user/<path:email>', methods=['GET', 'OPTIONS'])
def get_user_profile(email=None):
    """
    Fetch single user profile directly from Supabase users table with sub-millisecond caching.
    """
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    try:
        target_email = (email or request.args.get('email') or '').strip().lower()
        if not target_email:
            return jsonify({'success': False, 'message': 'Email query parameter is required.'}), 400

        cache_key = f"profile:{target_email}"
        cached = api_cache.get(cache_key)
        if cached is not None:
            return jsonify({'success': True, 'data': cached, 'cached': True}), 200

        user = None
        try:
            supabase = get_supabase_client()
            res = supabase.table('users').select('*').eq('email', target_email).execute()
            if res.data and len(res.data) > 0:
                user = res.data[0]
        except Exception as sb_err:
            print(f"Supabase profile fetch notice: {sb_err}")

        if not user and target_email in IN_MEMORY_USERS:
            user = IN_MEMORY_USERS[target_email]

        if not user:
            user = {
                'name': target_email.split('@')[0].capitalize(),
                'email': target_email,
                'college': 'General Campus',
                'role': 'PLAYER',
                'avatar_url': '/valorant.jpg',
                'tag': f"{target_email.split('@')[0].upper()}#1337"
            }

        profile_data = {
            'id': user.get('id'),
            'name': user.get('name'),
            'email': user.get('email'),
            'college': user.get('college'),
            'team': user.get('team', ''),
            'tag': user.get('tag') or f"{user.get('name', 'Gamer').upper().replace(' ', '')}#1337",
            'bio': user.get('bio', ''),
            'role': (user.get('role') or 'PLAYER').lower(),
            'avatar': user.get('avatar_url') or user.get('avatar') or '/valorant.jpg',
            'avatar_url': user.get('avatar_url') or user.get('avatar') or '/valorant.jpg',
            'rank': user.get('rank', 1),
            'win_rate': user.get('win_rate', 0.0),
            'trophies': user.get('trophies', 0)
        }

        api_cache.set(cache_key, profile_data, ttl_seconds=30)
        return jsonify({'success': True, 'data': profile_data}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/profile', methods=['PUT', 'PATCH', 'POST', 'OPTIONS'])
def update_user_profile():
    """
    Update user profile & avatar directly in Supabase users table.
    """
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        if not email:
            return jsonify({'success': False, 'message': 'Email is required.'}), 400

        name = (data.get('name') or '').strip()
        tag = (data.get('tag') or '').strip()
        college = (data.get('college') or '').strip()
        team = (data.get('team') or '').strip()
        bio = (data.get('bio') or '').strip()
        avatar = data.get('avatar') or data.get('avatar_url') or data.get('avatarUrl') or ''

        update_fields = {}
        if name: update_fields['name'] = name
        if tag: update_fields['tag'] = tag
        if college: update_fields['college'] = college
        if team is not None: update_fields['team'] = team
        if bio is not None: update_fields['bio'] = bio
        if avatar: update_fields['avatar_url'] = avatar

        # Strict column filter for Supabase users table
        VALID_USER_COLUMNS = {'name', 'college', 'bio', 'avatar_url', 'rank', 'win_rate', 'trophies', 'role'}
        db_payload = {k: v for k, v in update_fields.items() if k in VALID_USER_COLUMNS}

        # Update in Supabase users table
        try:
            supabase = get_supabase_client()
            existing = supabase.table('users').select('id').eq('email', email).execute()
            if existing.data and len(existing.data) > 0:
                supabase.table('users').update(db_payload).eq('email', email).execute()
            else:
                new_payload = {
                    'email': email,
                    'name': name or email.split('@')[0].capitalize(),
                    'college': college or 'General Campus',
                    'role': (data.get('role') or 'PLAYER').upper(),
                    'avatar_url': avatar or '/valorant.jpg',
                    **db_payload
                }
                supabase.table('users').insert(new_payload).execute()
        except Exception as sb_err:
            print(f"Supabase update profile error: {sb_err}")

        # Invalidate caches
        api_cache.delete(f"profile:{email}")
        api_cache.delete('users:all')

        # Update memory store
        if email not in IN_MEMORY_USERS:
            IN_MEMORY_USERS[email] = {'email': email}
        IN_MEMORY_USERS[email].update(update_fields)

        return jsonify({
            'success': True,
            'message': 'Profile updated successfully in database!',
            'data': {
                'name': name,
                'email': email,
                'college': college,
                'team': team,
                'tag': tag,
                'bio': bio,
                'avatar': avatar or '/valorant.jpg',
                'avatar_url': avatar or '/valorant.jpg'
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# Follow Store
FOLLOW_STORE = {}

@auth_bp.route('/follow', methods=['POST', 'OPTIONS'])
def toggle_follow():
    """
    Toggle follow/unfollow for an athlete in Supabase user_follows table.
    """
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    try:
        data = request.get_json() or {}
        follower_email = (data.get('follower_email') or data.get('followerEmail') or '').strip().lower()
        target_email = (data.get('target_email') or data.get('targetEmail') or '').strip().lower()

        if not follower_email or not target_email:
            return jsonify({'success': False, 'message': 'follower_email and target_email are required.'}), 400

        if follower_email == target_email:
            return jsonify({'success': False, 'message': 'Cannot follow yourself.'}), 400

        print(f"[FOLLOW DEBUG] follower_email='{follower_email}', target_email='{target_email}'")

        is_following = False
        try:
            supabase = get_supabase_client()
            existing = supabase.table('user_follows').select('id').eq('follower_email', follower_email).eq('target_email', target_email).execute()
            if existing.data and len(existing.data) > 0:
                del_res = supabase.table('user_follows').delete().eq('follower_email', follower_email).eq('target_email', target_email).execute()
                print(f"[FOLLOW DEBUG] Deleted follow: {del_res.data}")
                is_following = False
                msg = f"Unfollowed {target_email}"
            else:
                ins_res = supabase.table('user_follows').insert({'follower_email': follower_email, 'target_email': target_email}).execute()
                print(f"[FOLLOW DEBUG] Inserted follow: {ins_res.data}")
                is_following = True
                msg = f"Now following {target_email}"
        except Exception as sb_err:
            print(f"[FOLLOW ERROR] Supabase user_follows operation failed: {sb_err}")
            if follower_email not in FOLLOW_STORE:
                FOLLOW_STORE[follower_email] = set()
            if target_email in FOLLOW_STORE[follower_email]:
                FOLLOW_STORE[follower_email].remove(target_email)
                is_following = False
                msg = f"Unfollowed {target_email}"
            else:
                FOLLOW_STORE[follower_email].add(target_email)
                is_following = True
                msg = f"Now following {target_email}"

        return jsonify({
            'success': True,
            'is_following': is_following,
            'isFollowing': is_following,
            'message': msg
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/following/<path:email>', methods=['GET', 'OPTIONS'])
@auth_bp.route('/following', methods=['GET', 'OPTIONS'])
def get_following(email=None):
    """
    Get list of followed athlete emails from Supabase user_follows table.
    """
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    try:
        target_email = (email or request.args.get('email') or '').strip().lower()
        followed = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('user_follows').select('target_email').eq('follower_email', target_email).execute()
            if res.data:
                followed = [r['target_email'] for r in res.data if r.get('target_email')]
        except Exception:
            followed = list(FOLLOW_STORE.get(target_email, set()))

        return jsonify({'success': True, 'following': followed, 'count': len(followed)}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


