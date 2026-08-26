import time
import datetime
from flask import Blueprint, request, jsonify
from config import get_supabase_client
from routes.payments import IN_MEMORY_REGISTRATIONS

attendance_bp = Blueprint('attendance', __name__)

# In-Memory Fallback Store for Event Attendance Records (keyed by pass_id)
IN_MEMORY_EVENT_ATTENDANCE = {}

def get_current_iso_timestamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

@attendance_bp.route('', methods=['GET'])
@attendance_bp.route('/', methods=['GET'])
def get_tournament_attendance():
    """
    Retrieve attendance records from the dedicated 'event_attendance' table,
    linked with registrations data.
    Query params:
      - tournament_slug: Tournament identifier (optional)
      - status: 'PRESENT' | 'ABSENT' | 'NOT_MARKED' (optional)
    """
    try:
        tournament_slug = request.args.get('tournament_slug') or request.args.get('tournamentSlug')
        status_filter = request.args.get('status')

        # 1. Fetch registrations for linking
        registrations_map = {}
        supabase_regs = []
        try:
            supabase = get_supabase_client()
            res = supabase.table('registrations').select('*').execute()
            supabase_regs = res.data or []
        except Exception as e:
            print(f"Supabase registrations fetch warning: {e}")

        # Combine Supabase registrations with in-memory registrations
        for r in (supabase_regs + list(IN_MEMORY_REGISTRATIONS.values())):
            pid = r.get('pass_id') or r.get('passId')
            if pid:
                registrations_map[pid] = {
                    'pass_id': pid,
                    'tournament_slug': r.get('tournament_slug') or r.get('tournamentSlug'),
                    'tournament_title': r.get('tournament_title') or r.get('tournamentTitle'),
                    'team_name': r.get('team_name') or r.get('teamName', 'Team'),
                    'captain_name': r.get('captain_name') or r.get('captainName', 'Captain'),
                    'college': r.get('college', 'University'),
                    'email': r.get('email', ''),
                    'payment_status': r.get('payment_status') or r.get('paymentStatus', 'SUCCESS'),
                    'registered_at': r.get('registered_at') or r.get('registeredAt', '')
                }

        # 2. Fetch from dedicated 'event_attendance' Supabase table
        supabase_attendance = []
        try:
            supabase = get_supabase_client()
            att_res = supabase.table('event_attendance').select('*').execute()
            supabase_attendance = att_res.data or []
        except Exception as e:
            print(f"Supabase event_attendance fetch warning: {e}")

        # Combine attendance records
        attendance_map = {}
        for att in (supabase_attendance + list(IN_MEMORY_EVENT_ATTENDANCE.values())):
            pid = att.get('pass_id') or att.get('passId')
            if pid:
                attendance_map[pid] = {
                    'id': att.get('id') or f"att_{pid}",
                    'pass_id': pid,
                    'passId': pid,
                    'tournament_slug': att.get('tournament_slug') or att.get('tournamentSlug'),
                    'team_name': att.get('team_name') or att.get('teamName'),
                    'captain_name': att.get('captain_name') or att.get('captainName'),
                    'college': att.get('college'),
                    'email': att.get('email'),
                    'attendance_status': (att.get('attendance_status') or att.get('attendanceStatus') or 'NOT_MARKED').upper(),
                    'attendanceStatus': (att.get('attendance_status') or att.get('attendanceStatus') or 'NOT_MARKED').upper(),
                    'attended_at': att.get('attended_at') or att.get('attendedAt'),
                    'attendedAt': att.get('attended_at') or att.get('attendedAt'),
                    'attended_by': att.get('attended_by') or att.get('attendedBy'),
                    'attendedBy': att.get('attended_by') or att.get('attendedBy'),
                    'notes': att.get('notes', ''),
                    'created_at': att.get('created_at'),
                    'updated_at': att.get('updated_at')
                }

        # 3. Join / Link Registrations with Attendance Records
        combined_records = []
        for pid, reg in registrations_map.items():
            # Match tournament_slug if filtered
            if tournament_slug:
                reg_slug = (reg.get('tournament_slug') or '').strip().lower()
                if reg_slug != tournament_slug.strip().lower():
                    continue

            # Check if attendance record exists, else auto-default to NOT_MARKED
            att = attendance_map.get(pid)
            if att:
                status = att.get('attendance_status', 'NOT_MARKED')
                attended_at = att.get('attended_at')
                attended_by = att.get('attended_by')
                notes = att.get('notes', '')
            else:
                status = 'NOT_MARKED'
                attended_at = None
                attended_by = None
                notes = ''

            record = {
                'id': f"att_{pid}",
                'pass_id': pid,
                'passId': pid,
                'tournament_slug': reg.get('tournament_slug'),
                'tournamentSlug': reg.get('tournament_slug'),
                'tournament_title': reg.get('tournament_title'),
                'tournamentTitle': reg.get('tournament_title'),
                'team_name': reg.get('team_name'),
                'teamName': reg.get('team_name'),
                'captain_name': reg.get('captain_name'),
                'captainName': reg.get('captain_name'),
                'college': reg.get('college'),
                'email': reg.get('email'),
                'payment_status': reg.get('payment_status'),
                'paymentStatus': reg.get('payment_status'),
                'attendance_status': status,
                'attendanceStatus': status,
                'attended_at': attended_at,
                'attendedAt': attended_at,
                'attended_by': attended_by,
                'attendedBy': attended_by,
                'notes': notes,
                'players': reg.get('players', []),
                'registered_at': reg.get('registered_at')
            }
            combined_records.append(record)

        # 3.5 Query tournament_rosters to attach 4 players
        try:
            supabase = get_supabase_client()
            r_query = supabase.table('tournament_rosters').select('*')
            if tournament_slug:
                r_query = r_query.eq('tournament_slug', tournament_slug.strip().lower())
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
                for rec in combined_records:
                    p_id = rec.get('pass_id')
                    if p_id in roster_map:
                        rec['players'] = roster_map[p_id]
        except Exception as rost_err:
            print(f"Notice fetching tournament_rosters for attendance join: {rost_err}")

        # 4. Optional status filtering
        if status_filter:
            clean_status = status_filter.strip().upper()
            combined_records = [r for r in combined_records if r.get('attendance_status') == clean_status]

        # Calculate statistics
        total = len(combined_records)
        present_count = len([r for r in combined_records if r.get('attendance_status') == 'PRESENT'])
        absent_count = len([r for r in combined_records if r.get('attendance_status') == 'ABSENT'])
        not_marked_count = len([r for r in combined_records if r.get('attendance_status') == 'NOT_MARKED'])
        rate = round((present_count / total * 100), 1) if total > 0 else 0.0

        return jsonify({
            'success': True,
            'data': combined_records,
            'statistics': {
                'total_registered': total,
                'present': present_count,
                'absent': absent_count,
                'not_marked': not_marked_count,
                'attendance_rate_percent': rate
            }
        }), 200

    except Exception as e:
        print(f"Error fetching attendance: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@attendance_bp.route('/<pass_id>', methods=['GET'])
def get_attendance_by_pass_id(pass_id):
    """Fetch attendance detail for a single pass_id from event_attendance table"""
    try:
        # Check in memory first
        if pass_id in IN_MEMORY_EVENT_ATTENDANCE:
            return jsonify({'success': True, 'data': IN_MEMORY_EVENT_ATTENDANCE[pass_id]}), 200

        # Query Supabase event_attendance table
        try:
            supabase = get_supabase_client()
            res = supabase.table('event_attendance').select('*').eq('pass_id', pass_id).execute()
            if res.data and len(res.data) > 0:
                return jsonify({'success': True, 'data': res.data[0]}), 200
        except Exception as e:
            print(f"Supabase event_attendance lookup error: {e}")

        # If not yet explicitly created in attendance table, check registrations table
        if pass_id in IN_MEMORY_REGISTRATIONS:
            reg = IN_MEMORY_REGISTRATIONS[pass_id]
            fallback_att = {
                'pass_id': pass_id,
                'tournament_slug': reg.get('tournament_slug'),
                'team_name': reg.get('team_name'),
                'captain_name': reg.get('captain_name'),
                'college': reg.get('college'),
                'email': reg.get('email'),
                'attendance_status': 'NOT_MARKED',
                'attended_at': None,
                'attended_by': None
            }
            return jsonify({'success': True, 'data': fallback_att}), 200

        return jsonify({'success': False, 'message': f"No attendance record for Pass ID: {pass_id}"}), 404

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@attendance_bp.route('/<pass_id>', methods=['PATCH', 'POST'])
def update_single_attendance(pass_id):
    """
    Update or Upsert attendance status in dedicated 'event_attendance' table.
    Payload:
      {
        "attendance_status": "PRESENT" | "ABSENT" | "NOT_MARKED",
        "attended_by": "Organizer Name",
        "attended_at": "ISO string (optional)",
        "notes": "remarks (optional)"
      }
    """
    try:
        data = request.get_json(silent=True) or {}
        new_status = (data.get('attendance_status') or data.get('attendanceStatus') or '').strip().upper()
        attended_by = data.get('attended_by') or data.get('attendedBy') or 'Organizer'
        attended_at = data.get('attended_at') or data.get('attendedAt')
        notes = data.get('notes', '')

        if new_status not in ['PRESENT', 'ABSENT', 'NOT_MARKED']:
            return jsonify({
                'success': False,
                'message': f"Invalid attendance status '{new_status}'. Must be PRESENT, ABSENT, or NOT_MARKED."
            }), 400

        now_iso = get_current_iso_timestamp()
        if not attended_at and new_status in ['PRESENT', 'ABSENT']:
            attended_at = now_iso
        elif new_status == 'NOT_MARKED':
            attended_at = None
            attended_by = None

        # Look up linked registration details
        tournament_slug = data.get('tournament_slug') or data.get('tournamentSlug') or ''
        team_name = data.get('team_name') or data.get('teamName') or ''
        captain_name = data.get('captain_name') or data.get('captainName') or ''
        college = data.get('college', '')
        email = data.get('email', '')

        # 1. Check in-memory registrations
        if pass_id in IN_MEMORY_REGISTRATIONS:
            reg = IN_MEMORY_REGISTRATIONS[pass_id]
            tournament_slug = tournament_slug or reg.get('tournament_slug') or reg.get('tournamentSlug') or ''
            team_name = team_name or reg.get('team_name') or reg.get('teamName') or ''
            captain_name = captain_name or reg.get('captain_name') or reg.get('captainName') or ''
            college = college or reg.get('college') or ''
            email = email or reg.get('email') or ''

        # 2. Check Supabase registrations table if details missing
        try:
            supabase = get_supabase_client()
            sb_reg = supabase.table('registrations').select('*').eq('pass_id', pass_id).execute()
            if sb_reg.data and len(sb_reg.data) > 0:
                r = sb_reg.data[0]
                tournament_slug = tournament_slug or r.get('tournament_slug') or ''
                team_name = team_name or r.get('team_name') or ''
                captain_name = captain_name or r.get('captain_name') or ''
                college = college or r.get('college') or ''
                email = email or r.get('email') or ''
        except Exception as e:
            print(f"Supabase lookup notice for pass {pass_id}: {e}")

        # Fallbacks to satisfy NOT NULL constraints
        team_name = team_name or 'Squad'
        captain_name = captain_name or 'Captain'
        tournament_slug = tournament_slug or 'tournament'

        attendance_record = {
            'pass_id': pass_id,
            'passId': pass_id,
            'tournament_slug': tournament_slug,
            'tournamentSlug': tournament_slug,
            'team_name': team_name,
            'teamName': team_name,
            'captain_name': captain_name,
            'captainName': captain_name,
            'college': college,
            'email': email,
            'attendance_status': new_status,
            'attendanceStatus': new_status,
            'attended_at': attended_at,
            'attendedAt': attended_at,
            'attended_by': attended_by,
            'attendedBy': attended_by,
            'notes': notes,
            'updated_at': now_iso
        }

        # Update in-memory event attendance store
        IN_MEMORY_EVENT_ATTENDANCE[pass_id] = attendance_record

        # Update linked in-memory registrations as well
        if pass_id in IN_MEMORY_REGISTRATIONS:
            IN_MEMORY_REGISTRATIONS[pass_id]['attendance_status'] = new_status
            IN_MEMORY_REGISTRATIONS[pass_id]['attendanceStatus'] = new_status
            IN_MEMORY_REGISTRATIONS[pass_id]['attended_at'] = attended_at
            IN_MEMORY_REGISTRATIONS[pass_id]['attended_by'] = attended_by

        # 3. Upsert into Supabase 'event_attendance' table
        try:
            supabase = get_supabase_client()
            
            # Ensure foreign key exists in registrations table
            try:
                reg_check = supabase.table('registrations').select('pass_id').eq('pass_id', pass_id).execute()
                if not reg_check.data or len(reg_check.data) == 0:
                    supabase.table('registrations').insert({
                        'pass_id': pass_id,
                        'tournament_slug': tournament_slug,
                        'team_name': team_name,
                        'captain_name': captain_name,
                        'college': college,
                        'email': email,
                        'attendance_status': new_status,
                        'payment_status': 'SUCCESS'
                    }).execute()
            except Exception as reg_err:
                print(f"Registration existence verification notice: {reg_err}")

            db_payload = {
                'pass_id': pass_id,
                'tournament_slug': tournament_slug,
                'team_name': team_name,
                'captain_name': captain_name,
                'college': college,
                'email': email,
                'attendance_status': new_status,
                'attended_at': attended_at,
                'attended_by': attended_by,
                'notes': notes,
                'updated_at': now_iso
            }
            existing_att = supabase.table('event_attendance').select('id').eq('pass_id', pass_id).execute()
            if existing_att.data and len(existing_att.data) > 0:
                supabase.table('event_attendance').update(db_payload).eq('pass_id', pass_id).execute()
            else:
                supabase.table('event_attendance').insert(db_payload).execute()
            print(f"✅ Supabase event_attendance saved successfully for {pass_id} -> {new_status}")

            # Also update registrations table for sync
            try:
                supabase.table('registrations').update({
                    'attendance_status': new_status,
                    'attended_at': attended_at,
                    'attended_by': attended_by
                }).eq('pass_id', pass_id).execute()
                print(f"✅ Supabase registrations synchronized for {pass_id} -> {new_status}")
            except Exception as reg_up_err:
                print(f"ℹ️ registrations table update note: {reg_up_err}")
        except Exception as sb_err:
            print(f"❌ Supabase event_attendance error: {sb_err}")

        return jsonify({
            'success': True,
            'message': f"Attendance updated to {new_status} in event_attendance table",
            'data': attendance_record
        }), 200

    except Exception as e:
        print(f"Error updating attendance in database: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@attendance_bp.route('/mark-all-absent', methods=['POST'])
def batch_mark_all_absent():
    """
    Batch update all remaining 'NOT_MARKED' registrations for a tournament to 'ABSENT'
    in the dedicated 'event_attendance' table.
    """
    try:
        data = request.get_json(silent=True) or {}
        tournament_slug = (data.get('tournament_slug') or data.get('tournamentSlug') or '').strip().lower()
        attended_by = data.get('attended_by') or data.get('attendedBy') or 'Organizer'

        if not tournament_slug:
            return jsonify({'success': False, 'message': 'tournament_slug is required'}), 400

        now_iso = get_current_iso_timestamp()
        updated_count = 0

        # 1. Update in-memory stores
        for pid, reg in list(IN_MEMORY_REGISTRATIONS.items()):
            r_slug = (reg.get('tournament_slug') or reg.get('tournamentSlug') or '').strip().lower()
            if r_slug == tournament_slug:
                current_att = IN_MEMORY_EVENT_ATTENDANCE.get(pid, {}).get('attendance_status') or reg.get('attendance_status', 'NOT_MARKED')
                if current_att == 'NOT_MARKED':
                    IN_MEMORY_EVENT_ATTENDANCE[pid] = {
                        'pass_id': pid,
                        'passId': pid,
                        'tournament_slug': tournament_slug,
                        'team_name': reg.get('team_name', 'Team'),
                        'captain_name': reg.get('captain_name', 'Captain'),
                        'college': reg.get('college', ''),
                        'email': reg.get('email', ''),
                        'attendance_status': 'ABSENT',
                        'attendanceStatus': 'ABSENT',
                        'attended_at': now_iso,
                        'attendedAt': now_iso,
                        'attended_by': attended_by,
                        'attendedBy': attended_by,
                        'updated_at': now_iso
                    }
                    reg['attendance_status'] = 'ABSENT'
                    reg['attendanceStatus'] = 'ABSENT'
                    reg['attended_at'] = now_iso
                    reg['attended_by'] = attended_by
                    updated_count += 1

        # 2. Update Supabase 'event_attendance' and 'registrations' tables
        try:
            supabase = get_supabase_client()
            # Update existing event_attendance records where NOT_MARKED
            att_res = supabase.table('event_attendance').update({
                'attendance_status': 'ABSENT',
                'attended_at': now_iso,
                'attended_by': attended_by,
                'updated_at': now_iso
            }).eq('tournament_slug', tournament_slug).eq('attendance_status', 'NOT_MARKED').execute()
            
            if att_res.data:
                updated_count = max(updated_count, len(att_res.data))

            # Also update registrations table
            supabase.table('registrations').update({
                'attendance_status': 'ABSENT',
                'attended_at': now_iso,
                'attended_by': attended_by
            }).eq('tournament_slug', tournament_slug).eq('attendance_status', 'NOT_MARKED').execute()
        except Exception as sb_err:
            print(f"Supabase batch absent update warning: {sb_err}")

        return jsonify({
            'success': True,
            'message': f"{updated_count} remaining registrations marked as Absent in database.",
            'updated_count': updated_count,
            'tournament_slug': tournament_slug
        }), 200

    except Exception as e:
        print(f"Error in batch mark-all-absent: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
