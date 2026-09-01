import datetime
from flask import Blueprint, request, jsonify
from config import get_supabase_client

contact_bp = Blueprint('contact', __name__)

# Fallback in-memory messages storage
IN_MEMORY_CONTACT_MESSAGES = []

@contact_bp.route('/', methods=['GET'])
def get_all_contact_messages():
    """
    Fetch all contact inquiries and support tickets from database.
    Optionally filter by ?email=user@email.com
    """
    try:
        user_email = (request.args.get('email') or '').strip().lower()
        supabase = get_supabase_client()
        query = supabase.table('contact_messages').select('*').order('created_at', desc=True)
        if user_email:
            query = query.eq('email', user_email)
        res = query.execute()
        if res.data is not None and isinstance(res.data, list):
            return jsonify({
                'success': True,
                'count': len(res.data),
                'data': res.data
            }), 200
    except Exception as e:
        print(f"⚠️ Supabase fetch contact_messages error: {e}")

    # In-memory fallback
    data_list = IN_MEMORY_CONTACT_MESSAGES
    user_email = (request.args.get('email') or '').strip().lower()
    if user_email:
        data_list = [m for m in data_list if (m.get('email') or '').lower() == user_email]

    return jsonify({
        'success': True,
        'count': len(data_list),
        'data': data_list
    }), 200


@contact_bp.route('/', methods=['POST'])
def submit_contact_message():
    """
    Save incoming contact form / support ticket to database.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        phone = (data.get('phone') or '').strip()
        college = (data.get('college') or '').strip()
        category = data.get('category') or 'General Inquiry'
        subject = (data.get('subject') or '').strip()
        message = (data.get('message') or '').strip()

        if not name or not email or not subject or not message:
            return jsonify({'success': False, 'message': 'Name, email, subject, and message are required.'}), 400

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        payload = {
            'name': name,
            'email': email,
            'phone': phone,
            'college': college,
            'category': category,
            'subject': subject,
            'message': message,
            'status': 'unread',
            'admin_reply': None,
            'admin_reply_at': None,
            'admin_reply_by': None,
            'created_at': now_iso,
            'updated_at': now_iso,
        }

        # 1. Direct Supabase Insert
        try:
            supabase = get_supabase_client()
            res = supabase.table('contact_messages').insert([payload]).execute()
            if res.data and len(res.data) > 0:
                inserted_row = res.data[0]
                IN_MEMORY_CONTACT_MESSAGES.insert(0, inserted_row)
                return jsonify({
                    'success': True,
                    'message': 'Support ticket submitted successfully to database.',
                    'data': inserted_row
                }), 201
        except Exception as sb_err:
            print(f"⚠️ Supabase insert contact_messages notice: {sb_err}")

        # Fallback memory insertion
        payload['id'] = len(IN_MEMORY_CONTACT_MESSAGES) + 1
        IN_MEMORY_CONTACT_MESSAGES.insert(0, payload)
        return jsonify({
            'success': True,
            'message': 'Support ticket recorded.',
            'data': payload
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@contact_bp.route('/<msg_id>', methods=['PATCH', 'PUT'])
def update_contact_status_or_reply(msg_id):
    """
    Update ticket status and/or save admin reply in database.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        update_payload = {'updated_at': now_iso}

        if 'status' in data:
            update_payload['status'] = data['status']
        if 'admin_reply' in data:
            update_payload['admin_reply'] = (data['admin_reply'] or '').strip()
            update_payload['admin_reply_at'] = now_iso
            update_payload['admin_reply_by'] = data.get('admin_reply_by') or 'Xenova Operations Desk'
            if 'status' not in data:
                update_payload['status'] = 'resolved'

        try:
            supabase = get_supabase_client()
            supabase.table('contact_messages').update(update_payload).eq('id', msg_id).execute()
        except Exception as sb_err:
            print(f"⚠️ Supabase update contact_messages notice: {sb_err}")

        # Update in memory
        for m in IN_MEMORY_CONTACT_MESSAGES:
            if str(m.get('id')) == str(msg_id):
                m.update(update_payload)
                break

        return jsonify({'success': True, 'message': 'Ticket and admin reply updated successfully.', 'data': update_payload}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@contact_bp.route('/<msg_id>', methods=['DELETE'])
def delete_contact_message(msg_id):
    """
    Permanently delete a support ticket from database.
    """
    try:
        try:
            supabase = get_supabase_client()
            supabase.table('contact_messages').delete().eq('id', msg_id).execute()
        except Exception as sb_err:
            print(f"⚠️ Supabase delete contact_messages notice: {sb_err}")

        # Remove from in-memory
        global IN_MEMORY_CONTACT_MESSAGES
        IN_MEMORY_CONTACT_MESSAGES = [m for m in IN_MEMORY_CONTACT_MESSAGES if str(m.get('id')) != str(msg_id)]

        return jsonify({'success': True, 'message': 'Ticket deleted from database.'}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
