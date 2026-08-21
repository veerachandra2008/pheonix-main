import time
from concurrent.futures import ThreadPoolExecutor
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
    (Parallelized with ThreadPoolExecutor for ultra-fast response)
    """
    try:
        supabase = get_supabase_client()

        def fetch_organizer_apps():
            try:
                res = supabase.table('organizer_applications').select('*').execute()
                return res.data if (res.data and isinstance(res.data, list)) else []
            except Exception:
                return []

        def fetch_teams():
            try:
                res = supabase.table('teams').select('*').execute()
                return res.data if (res.data and len(res.data) > 0) else list(IN_MEMORY_TEAMS)
            except Exception:
                return list(IN_MEMORY_TEAMS)

        def fetch_colleges():
            try:
                res = supabase.table('colleges').select('*').execute()
                return res.data if (res.data and len(res.data) > 0) else list(IN_MEMORY_COLLEGES)
            except Exception:
                return list(IN_MEMORY_COLLEGES)

        def fetch_tournaments():
            try:
                res = supabase.table('tournaments').select('*').execute()
                return res.data if (res.data and len(res.data) > 0) else list(IN_MEMORY_TOURNAMENTS)
            except Exception:
                return list(IN_MEMORY_TOURNAMENTS)

        # Run all 4 queries concurrently in parallel threads
        with ThreadPoolExecutor(max_workers=4) as executor:
            f_orgs = executor.submit(fetch_organizer_apps)
            f_teams = executor.submit(fetch_teams)
            f_colleges = executor.submit(fetch_colleges)
            f_tourns = executor.submit(fetch_tournaments)

            supabase_organizer_apps = f_orgs.result()
            team_apps = f_teams.result()
            college_apps = f_colleges.result()
            tournament_apps = f_tourns.result()

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
            t_data = app.get('tournament') or app.get('tournament_data') or None
            if not t_data and app.get('details'):
                try:
                    import json
                    if str(app['details']).startswith('{'):
                        t_data = json.loads(app['details'])
                except Exception:
                    pass

            organizer_apps.append({
                'id': app.get('id') or f"app_org_{hash(app.get('email', '')) % 1000000}",
                'hostName': app.get('hostName') or app.get('host_name') or 'Organizer Candidate',
                'host_name': app.get('host_name') or app.get('hostName'),
                'college': app.get('college') or 'Independent Campus',
                'email': app.get('email', '').strip().lower(),
                'phone': app.get('phone') or app.get('organizerPhone') or app.get('organizer_phone') or '',
                'discordServer': app.get('discordServer') or app.get('discord_server') or app.get('discord') or '',
                'preferredGame': app.get('preferredGame') or app.get('preferred_game') or 'Valorant',
                'preferred_game': app.get('preferred_game') or app.get('preferredGame'),
                'experience': app.get('experience') or 'Intermediate',
                'details': app.get('details') or 'Esports event organizer application.',
                'tournament': t_data,
                'tournament_data': t_data,
                'status': raw_status,
                'verification_status': raw_status,
                'appliedAt': app.get('applied_at') or app.get('appliedAt') or app.get('created_at') or app.get('updated_at') or 'Recently'
            })

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
    """Submit or update an organizer application and proposed tournament"""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or data.get('captainEmail') or data.get('organizerEmail') or '').strip().lower()
        host_name = (data.get('hostName') or data.get('host_name') or data.get('organization') or data.get('name') or data.get('organizerName') or '').strip()
        college = (data.get('college') or data.get('institution') or data.get('location') or 'Independent Campus').strip()
        preferred_game = data.get('preferredGame') or data.get('preferred_game') or data.get('game') or 'Valorant'
        phone = (data.get('phone') or data.get('organizerPhone') or data.get('organizer_phone') or '').strip()
        discord_server = (data.get('discordServer') or data.get('discord_server') or data.get('discord') or '').strip()
        experience = data.get('experience') or 'Collegiate Tournament Host'
        details = data.get('details') or data.get('description') or ''
        tournament_info = data.get('tournament') or data.get('tournament_data') or None

        if not email:
            return jsonify({'success': False, 'message': 'Email address is required.'}), 400

        if not host_name:
            host_name = f"{email.split('@')[0].capitalize()} Esports Society"

        new_app = {
            'id': f"app_org_{int(time.time() * 1000)}",
            'hostName': host_name,
            'host_name': host_name,
            'college': college,
            'email': email,
            'phone': phone,
            'organizerPhone': phone,
            'discordServer': discord_server,
            'discord_server': discord_server,
            'preferredGame': preferred_game,
            'preferred_game': preferred_game,
            'experience': experience,
            'details': details,
            'tournament': tournament_info,
            'tournament_data': tournament_info,
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

        # Upsert in Supabase organizer_applications table with resilient schemas
        try:
            supabase = get_supabase_client()
            payload_candidates = [
                {
                    'host_name': host_name,
                    'email': email,
                    'college': college,
                    'phone': phone,
                    'discord_server': discord_server,
                    'preferred_game': preferred_game,
                    'experience': experience,
                    'details': details,
                    'tournament_data': tournament_info,
                    'status': 'PENDING'
                },
                {
                    'host_name': host_name,
                    'email': email,
                    'college': college,
                    'phone': phone,
                    'discord_server': discord_server,
                    'preferred_game': preferred_game,
                    'experience': experience,
                    'details': details,
                    'status': 'PENDING'
                },
                {
                    'host_name': host_name,
                    'email': email,
                    'college': college,
                    'preferred_game': preferred_game,
                    'experience': experience,
                    'details': details,
                    'status': 'PENDING'
                },
                {
                    'host_name': host_name,
                    'email': email,
                    'college': college,
                    'preferred_game': preferred_game,
                    'experience': experience,
                    'details': details
                }
            ]

            for payload in payload_candidates:
                try:
                    check_res = supabase.table('organizer_applications').select('*').eq('email', email).execute()
                    if check_res.data and len(check_res.data) > 0:
                        supabase.table('organizer_applications').update(payload).eq('email', email).execute()
                        break
                    else:
                        supabase.table('organizer_applications').insert(payload).execute()
                        break
                except Exception as insert_err:
                    continue
        except Exception as sb_err:
            print(f"Supabase organizer_applications upsert warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': 'Organizer application and tournament proposal submitted successfully!',
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
    - Update application status to 'APPROVED' / 'approved' in organizer_applications table
    - Update user's role to 'ORGANIZER' in users table
    - Auto-publish/launch proposed tournament for this organizer across Supabase and in-memory
    - Send notification
    """
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        action = data.get('action', '').strip().lower() # 'approve' or 'reject'

        if not email or action not in ['approve', 'reject']:
            return jsonify({'success': False, 'message': 'Valid email and action (approve/reject) are required.'}), 400

        target_status = 'approved' if action == 'approve' else 'rejected'
        target_status_upper = 'APPROVED' if action == 'approve' else 'REJECTED'
        target_status_lower = 'approved' if action == 'approve' else 'rejected'
        target_role = 'ORGANIZER' if action == 'approve' else 'PLAYER'

        # 1. Update In-Memory Organizer Apps
        app_tournament = None
        applicant_host_name = ''
        for app in IN_MEMORY_ORGANIZER_APPS:
            if app.get('email', '').lower() == email:
                app['status'] = target_status_lower
                app['verification_status'] = target_status_lower
                app_tournament = app.get('tournament') or app.get('tournament_data')
                applicant_host_name = app.get('host_name') or app.get('hostName') or ''

        # 2. Update In-Memory Users Role
        if email in IN_MEMORY_USERS:
            if IN_MEMORY_USERS[email].get('role') != 'ADMIN':
                IN_MEMORY_USERS[email]['role'] = target_role

        # 3. If Approved, auto-activate proposed tournament if present
        if action == 'approve':
            # If not in memory, try retrieving from Supabase
            if not app_tournament:
                try:
                    supabase = get_supabase_client()
                    sb_app = supabase.table('organizer_applications').select('*').eq('email', email).execute()
                    if sb_app.data and len(sb_app.data) > 0:
                        row = sb_app.data[0]
                        applicant_host_name = applicant_host_name or row.get('host_name') or ''
                        app_tournament = row.get('tournament') or row.get('tournament_data')
                        if not app_tournament and row.get('details'):
                            try:
                                import json
                                if str(row['details']).startswith('{'):
                                    app_tournament = json.loads(row['details'])
                            except Exception:
                                pass
                except Exception as sb_err:
                    print(f"Notice fetching app tournament from Supabase: {sb_err}")

            if app_tournament and isinstance(app_tournament, dict):
                try:
                    import re
                    from routes.tournaments import IN_MEMORY_TOURNAMENTS, sanitize_tournament_payload

                    raw_slug = app_tournament.get('slug') or app_tournament.get('title', '').lower().replace(' ', '-')
                    t_slug = re.sub(r'[^a-z0-9]+', '-', raw_slug.lower()).strip('-')
                    if not t_slug:
                        t_slug = f"tournament-{int(time.time())}"

                    app_tournament['slug'] = t_slug
                    app_tournament['title'] = app_tournament.get('title') or 'Collegiate Esports Championship'
                    app_tournament['host'] = app_tournament.get('host') or applicant_host_name or 'Verified Organizer'
                    app_tournament['organizer_email'] = email
                    app_tournament['createdBy'] = email
                    app_tournament['status'] = 'Upcoming'
                    app_tournament['status_color'] = '#38BDF8'
                    app_tournament['game'] = app_tournament.get('game') or 'Valorant'
                    app_tournament['image'] = app_tournament.get('image') or f"/{app_tournament['game'].lower().replace(' ', '')}.jpg"
                    app_tournament['prize'] = app_tournament.get('prize') or '₹50,000'
                    app_tournament['fee'] = app_tournament.get('fee') or 'Free'
                    app_tournament['format'] = app_tournament.get('format') or '5v5 Double Elimination'
                    app_tournament['region'] = app_tournament.get('region') or app_tournament.get('location') or 'Pan India'
                    app_tournament['date'] = app_tournament.get('date') or time.strftime('%d %b')
                    app_tournament['filled'] = 0
                    if not app_tournament.get('teams'):
                        max_t = app_tournament.get('maxTeams', '64')
                        app_tournament['teams'] = f"0/{max_t}"

                    # 1. Update in-memory tournament list
                    existing_t_idx = None
                    for idx, t in enumerate(IN_MEMORY_TOURNAMENTS):
                        if t.get('slug') == t_slug:
                            existing_t_idx = idx
                            break
                    if existing_t_idx is not None:
                        IN_MEMORY_TOURNAMENTS[existing_t_idx] = app_tournament
                    else:
                        IN_MEMORY_TOURNAMENTS.insert(0, app_tournament)

                    # 2. Insert / Update in Supabase tournaments table
                    supabase = get_supabase_client()
                    clean_t = sanitize_tournament_payload(app_tournament)
                    try:
                        chk = supabase.table('tournaments').select('*').eq('slug', t_slug).execute()
                        if chk.data and len(chk.data) > 0:
                            supabase.table('tournaments').update(clean_t).eq('slug', t_slug).execute()
                        else:
                            supabase.table('tournaments').insert(clean_t).execute()
                    except Exception:
                        try:
                            # Fallback without organizer_email if schema cache does not have it
                            fallback_t = {k: v for k, v in clean_t.items() if k != 'organizer_email'}
                            chk = supabase.table('tournaments').select('*').eq('slug', t_slug).execute()
                            if chk.data and len(chk.data) > 0:
                                supabase.table('tournaments').update(fallback_t).eq('slug', t_slug).execute()
                            else:
                                supabase.table('tournaments').insert(fallback_t).execute()
                        except Exception as up_err:
                            print(f"Supabase insert tournament notice: {up_err}")
                except Exception as t_err:
                    print(f"Auto-activate tournament on organizer approval warning: {t_err}")

        # 4. Update Supabase organizer_applications and users table
        try:
            supabase = get_supabase_client()
            try:
                supabase.table('organizer_applications').update({'status': target_status_upper}).eq('email', email).execute()
            except Exception:
                try:
                    supabase.table('organizer_applications').update({'status': target_status_lower}).eq('email', email).execute()
                except Exception as e:
                    print(f"Supabase organizer status update notice: {e}")

            # Update user role in users table
            try:
                supabase.table('users').update({'role': target_role}).eq('email', email).execute()
            except Exception:
                try:
                    supabase.table('users').update({'role': target_role.lower()}).eq('email', email).execute()
                except Exception:
                    pass
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


@applications_bp.route('/organizer/<path:email>', methods=['DELETE'])
@applications_bp.route('/organizer', methods=['DELETE'])
def delete_organizer_application(email=None):
    """Delete an organizer application completely from Supabase and memory"""
    try:
        data = request.get_json(silent=True) or {}
        target_email = (email or data.get('email') or '').strip().lower()
        if not target_email:
            return jsonify({'success': False, 'message': 'Email is required.'}), 400

        global IN_MEMORY_ORGANIZER_APPS
        IN_MEMORY_ORGANIZER_APPS = [a for a in IN_MEMORY_ORGANIZER_APPS if (a.get('email') or '').strip().lower() != target_email]

        try:
            supabase = get_supabase_client()
            supabase.table('organizer_applications').delete().eq('email', target_email).execute()
            # Demote in users table
            supabase.table('users').update({'role': 'PLAYER'}).eq('email', target_email).execute()
        except Exception as sb_err:
            print(f"Supabase delete organizer application notice: {sb_err}")

        return jsonify({'success': True, 'message': f'Organizer application for {target_email} deleted.'}), 200
    except Exception as e:
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
