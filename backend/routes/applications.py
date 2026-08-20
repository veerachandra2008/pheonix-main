import time
from flask import Blueprint, request, jsonify
from config import get_supabase_client
from routes.auth import IN_MEMORY_USERS
from routes.colleges import IN_MEMORY_COLLEGES
from routes.teams import IN_MEMORY_TEAMS
from routes.tournaments import IN_MEMORY_TOURNAMENTS
from routes.notifications import IN_MEMORY_NOTIFICATIONS

applications_bp = Blueprint('applications', __name__)

# In-memory fallback storage for applications (strictly empty by default)
IN_MEMORY_ORGANIZER_APPS = []

@applications_bp.route('/', methods=['GET'])
def get_all_applications():
    """
    Fetch all pending, approved, and rejected applications across:
    1. Organizers
    2. Teams
    3. Colleges
    4. Tournaments
    """
    try:
        # 1. Organizer Applications from Database and Memory
        supabase_organizer_apps = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('organizer_applications').select('*').execute()
            if res.data and isinstance(res.data, list):
                supabase_organizer_apps = res.data
        except Exception as e:
            print(f"Supabase organizer_applications fetch notice: {e}")

        # Combine memory and Supabase by email
        merged_apps_map = {}
        for app in IN_MEMORY_ORGANIZER_APPS:
            email_key = (app.get('email') or '').strip().lower()
            if email_key:
                merged_apps_map[email_key] = dict(app)

        for app in supabase_organizer_apps:
            email_key = (app.get('email') or '').strip().lower()
            if email_key:
                if email_key in merged_apps_map:
                    merged_apps_map[email_key].update(app)
                else:
                    merged_apps_map[email_key] = dict(app)

        raw_organizer_apps = list(merged_apps_map.values())

        # Normalize and map fields for frontend compatibility
        organizer_apps = []
        for app in raw_organizer_apps:
            raw_status = (app.get('status') or app.get('verification_status') or 'pending').lower()
            organizer_apps.append({
                'id': app.get('id') or f"app_org_{hash(app.get('email', '')) % 1000000}",
                'hostName': app.get('hostName') or app.get('host_name') or 'Organizer Candidate',
                'host_name': app.get('host_name') or app.get('hostName'),
                'college': app.get('college') or 'Independent Campus',
                'email': app.get('email', '').strip().lower(),
                'preferredGame': app.get('preferredGame') or app.get('preferred_game') or 'Valorant',
                'preferred_game': app.get('preferred_game') or app.get('preferredGame'),
                'experience': app.get('experience') or 'Intermediate',
                'details': app.get('details') or 'Esports event organizer application.',
                'status': raw_status,
                'verification_status': raw_status,
                'appliedAt': app.get('appliedAt') or app.get('created_at') or app.get('updated_at') or 'Recently'
            })

        # 2. Team Applications
        team_apps = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('teams').select('*').execute()
            if res.data and len(res.data) > 0:
                team_apps = res.data
            else:
                team_apps = list(IN_MEMORY_TEAMS)
        except Exception:
            team_apps = list(IN_MEMORY_TEAMS)

        # 3. College Applications
        college_apps = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('colleges').select('*').execute()
            if res.data and len(res.data) > 0:
                college_apps = res.data
            else:
                college_apps = list(IN_MEMORY_COLLEGES)
        except Exception:
            college_apps = list(IN_MEMORY_COLLEGES)

        # 4. Tournament Applications
        tournament_apps = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('tournaments').select('*').execute()
            if res.data and len(res.data) > 0:
                tournament_apps = res.data
            else:
                tournament_apps = list(IN_MEMORY_TOURNAMENTS)
        except Exception:
            tournament_apps = list(IN_MEMORY_TOURNAMENTS)

        def is_pending(st):
            if not st: return False
            return str(st).strip().lower() == 'pending'

        # Stats summary
        pending_organizers = len([a for a in organizer_apps if is_pending(a.get('status'))])
        pending_teams = len([t for t in team_apps if is_pending(t.get('verification_status')) or is_pending(t.get('verificationStatus'))])
        pending_colleges = len([c for c in college_apps if is_pending(c.get('verification_status')) or is_pending(c.get('verificationStatus'))])
        pending_tournaments = len([t for t in tournament_apps if is_pending(t.get('status'))])

        return jsonify({
            'success': True,
            'data': {
                'organizers': organizer_apps,
                'teams': team_apps,
                'colleges': college_apps,
                'tournaments': tournament_apps,
                'stats': {
                    'pending_organizers': pending_organizers,
                    'pending_teams': pending_teams,
                    'pending_colleges': pending_colleges,
                    'pending_tournaments': pending_tournaments,
                    'total_pending': pending_organizers + pending_teams + pending_colleges + pending_tournaments
                }
            }
        }), 200
    except Exception as e:
        print(f"Error fetching applications: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@applications_bp.route('/organizer', methods=['POST'])
def submit_organizer_application():
    """Submit or update an organizer application"""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or data.get('captainEmail') or '').strip().lower()
        host_name = (data.get('hostName') or data.get('host_name') or data.get('organization') or data.get('name') or '').strip()
        college = (data.get('college') or data.get('institution') or 'Independent Campus').strip()
        preferred_game = data.get('preferredGame') or data.get('preferred_game') or 'Valorant'
        experience = data.get('experience') or 'Intermediate'
        details = data.get('details') or ''

        if not email:
            return jsonify({'success': False, 'message': 'Email address is required.'}), 400

        if not host_name:
            host_name = f"{email.split('@')[0].capitalize()} Gaming Society"

        new_app = {
            'id': f"app_org_{int(time.time() * 1000)}",
            'hostName': host_name,
            'host_name': host_name,
            'college': college,
            'email': email,
            'preferredGame': preferred_game,
            'preferred_game': preferred_game,
            'experience': experience,
            'details': details,
            'status': 'pending',
            'verification_status': 'pending',
            'appliedAt': time.strftime('%Y-%m-%d %H:%M'),
            'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        }

        # Update in memory store (replace if existing email found)
        existing_idx = None
        for idx, app in enumerate(IN_MEMORY_ORGANIZER_APPS):
            if app.get('email', '').lower() == email:
                existing_idx = idx
                break

        if existing_idx is not None:
            IN_MEMORY_ORGANIZER_APPS[existing_idx] = new_app
        else:
            IN_MEMORY_ORGANIZER_APPS.insert(0, new_app)

        # Upsert in Supabase organizer_applications table
        try:
            supabase = get_supabase_client()
            clean_db_payload = {
                'host_name': host_name,
                'college': college,
                'email': email,
                'preferred_game': preferred_game,
                'experience': experience,
                'details': details,
                'status': 'pending',
                'verification_status': 'pending'
            }
            try:
                supabase.table('organizer_applications').insert(clean_db_payload).execute()
            except Exception:
                try:
                    supabase.table('organizer_applications').update(clean_db_payload).eq('email', email).execute()
                except Exception:
                    pass
        except Exception as sb_err:
            print(f"Supabase organizer_applications upsert warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': 'Organizer application submitted successfully!',
            'data': new_app
        }), 201
    except Exception as e:
        print(f"Error submitting organizer application: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@applications_bp.route('/organizer/action', methods=['POST'])
def handle_organizer_application_action():
    """
    Approve or Reject an Organizer Application.
    If Approved:
    - Update application status to 'approved'
    - Update user's role to 'ORGANIZER' in users table
    - Send notification
    """
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        action = data.get('action', '').strip().lower() # 'approve' or 'reject'

        if not email or action not in ['approve', 'reject']:
            return jsonify({'success': False, 'message': 'Valid email and action (approve/reject) are required.'}), 400

        target_status = 'approved' if action == 'approve' else 'rejected'
        target_role = 'ORGANIZER' if action == 'approve' else 'PLAYER'

        # 1. Update In-Memory Organizer Apps
        for app in IN_MEMORY_ORGANIZER_APPS:
            if app.get('email', '').lower() == email:
                app['status'] = target_status
                app['verification_status'] = target_status

        # 2. Update In-Memory Users Role
        if email in IN_MEMORY_USERS:
            if IN_MEMORY_USERS[email].get('role') != 'ADMIN':
                IN_MEMORY_USERS[email]['role'] = target_role

        # 3. Update Supabase
        try:
            supabase = get_supabase_client()
            # Try updating with uppercase and lowercase enum values for verification_status_type
            status_variants = [
                {'status': target_status.upper()},
                {'verification_status': target_status.upper()},
                {'status': target_status.upper(), 'verification_status': target_status.upper()},
                {'status': target_status.lower()},
                {'verification_status': target_status.lower()},
                {'status': target_status.lower(), 'verification_status': target_status.lower()},
            ]
            
            for variant in status_variants:
                try:
                    supabase.table('organizer_applications').update(variant).eq('email', email).execute()
                    break
                except Exception:
                    continue

            # Update user role in users table
            try:
                supabase.table('users').update({'role': target_role}).eq('email', email).execute()
            except Exception as u_err:
                print(f"Supabase user role update notice: {u_err}")
        except Exception as sb_err:
            print(f"Supabase organizer action update warning: {sb_err}")

        # 4. Create Notification
        notif_msg = (
            'Congratulations! Your application to become an official Xenova Organizer has been approved.'
            if action == 'approve'
            else 'Your application for organizer status was reviewed and not approved at this time.'
        )
        notif_payload = {
            'id': f"notif_{int(time.time() * 1000)}",
            'title': f"Organizer Application {action.capitalize()}d",
            'message': notif_msg,
            'time': 'Just now',
            'read': False,
            'type': 'system'
        }
        IN_MEMORY_NOTIFICATIONS.insert(0, notif_payload)
        try:
            supabase = get_supabase_client()
            supabase.table('notifications').insert(notif_payload).execute()
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': f"Application {action}d successfully. User role updated to {target_role}.",
            'status': target_status,
            'role': target_role
        }), 200

    except Exception as e:
        print(f"Error handling organizer application action: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@applications_bp.route('/team/action', methods=['POST'])
def handle_team_action():
    """Approve or Reject a Team registration"""
    try:
        data = request.get_json() or {}
        slug = data.get('slug', '').strip()
        name = data.get('name', '').strip()
        action = data.get('action', '').strip().lower() # 'approve' or 'reject'

        if not action or (not slug and not name):
            return jsonify({'success': False, 'message': 'Slug/Name and action are required.'}), 400

        target_status = 'approved' if action == 'approve' else 'rejected'
        is_verified = (action == 'approve')

        # Update in-memory
        for t in IN_MEMORY_TEAMS:
            if (slug and t.get('slug') == slug) or (name and t.get('name', '').lower() == name.lower()):
                t['verification_status'] = target_status
                t['verificationStatus'] = target_status
                t['verified'] = is_verified

        # Update Supabase
        try:
            supabase = get_supabase_client()
            q = supabase.table('teams').update({
                'verification_status': target_status,
                'verified': is_verified
            })
            if slug:
                q = q.eq('slug', slug)
            else:
                q = q.eq('name', name)
            q.execute()
        except Exception as sb_err:
            print(f"Supabase team update warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': f"Team {action}d successfully.",
            'status': target_status
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@applications_bp.route('/college/action', methods=['POST'])
def handle_college_action():
    """Approve or Reject a College submission"""
    try:
        data = request.get_json() or {}
        slug = data.get('slug', '').strip()
        name = data.get('name', '').strip()
        action = data.get('action', '').strip().lower() # 'approve' or 'reject'

        if not action or (not slug and not name):
            return jsonify({'success': False, 'message': 'Slug/Name and action are required.'}), 400

        target_status = 'approved' if action == 'approve' else 'rejected'
        is_verified = (action == 'approve')

        # Update in-memory
        for c in IN_MEMORY_COLLEGES:
            if (slug and c.get('slug') == slug) or (name and c.get('name', '').lower() == name.lower()):
                c['verification_status'] = target_status
                c['verificationStatus'] = target_status
                c['verified'] = is_verified

        # Update Supabase
        try:
            supabase = get_supabase_client()
            q = supabase.table('colleges').update({
                'verification_status': target_status,
                'verified': is_verified
            })
            if slug:
                q = q.eq('slug', slug)
            else:
                q = q.eq('name', name)
            q.execute()
        except Exception as sb_err:
            print(f"Supabase college update warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': f"College {action}d successfully.",
            'status': target_status
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@applications_bp.route('/tournament/action', methods=['POST'])
def handle_tournament_action():
    """Approve or Reject a Tournament creation request"""
    try:
        data = request.get_json() or {}
        slug = data.get('slug', '').strip()
        action = data.get('action', '').strip().lower() # 'approve' or 'reject'

        if not slug or not action:
            return jsonify({'success': False, 'message': 'Slug and action are required.'}), 400

        new_status = 'Live' if action == 'approve' else 'Rejected'
        new_color = '#FF3B30' if action == 'approve' else '#EF4444'

        # Update in-memory
        for t in IN_MEMORY_TOURNAMENTS:
            if t.get('slug') == slug:
                t['status'] = new_status
                t['status_color'] = new_color

        # Update Supabase
        try:
            supabase = get_supabase_client()
            supabase.table('tournaments').update({
                'status': new_status,
                'status_color': new_color
            }).eq('slug', slug).execute()
        except Exception as sb_err:
            print(f"Supabase tournament action warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': f"Tournament {action}d successfully.",
            'status': new_status
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
