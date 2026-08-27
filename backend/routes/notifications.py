from flask import Blueprint, request, jsonify
from config import get_supabase_client
from datetime import datetime, timedelta, timezone
import time

notifications_bp = Blueprint('notifications', __name__)

IN_MEMORY_NOTIFICATIONS = []

@notifications_bp.route('/', methods=['GET'])
def get_notifications():
    """Fetch notifications strictly from Supabase within last 7 days & auto-purge older ones"""
    user_email = request.args.get('email', '').strip().lower()
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    try:
        supabase = get_supabase_client()
        
        # 1. Automatically delete notifications older than 7 days
        try:
            supabase.table('notifications').delete().lt('created_at', seven_days_ago).execute()
        except Exception as purge_err:
            print(f"7-day auto-purge warning: {purge_err}")

        # 2. Query notifications created within the last 7 days
        query = supabase.table('notifications').select('*').gte('created_at', seven_days_ago).order('created_at', desc=True)
        if user_email:
            res = query.execute()
            if res.data is not None:
                filtered = [
                    n for n in res.data 
                    if not n.get('user_email') or (n.get('user_email') or '').lower() == user_email
                ]
                return jsonify({'success': True, 'data': filtered}), 200
        else:
            res = query.execute()
            if res.data is not None:
                return jsonify({'success': True, 'data': res.data}), 200
    except Exception as e:
        print(f"Supabase error fetching notifications: {e}")
    
    return jsonify({'success': True, 'data': IN_MEMORY_NOTIFICATIONS}), 200

@notifications_bp.route('/', methods=['POST'])
def create_notification():
    """Create a new notification in Supabase and memory fallback"""
    data = request.get_json() or {}
    if not data.get('id'):
        data['id'] = f"notif_{int(time.time() * 1000)}"
    if 'read' not in data:
        data['read'] = False
    if 'time' not in data:
        data['time'] = 'Just now'
    
    IN_MEMORY_NOTIFICATIONS.insert(0, data)
    
    try:
        supabase = get_supabase_client()
        res = supabase.table('notifications').insert(data).execute()
        return jsonify({'success': True, 'data': res.data}), 201
    except Exception as e:
        print(f"Supabase insert warning for notification: {e}")
        return jsonify({'success': True, 'data': [data], 'fallback': True}), 201

@notifications_bp.route('/mark-read', methods=['POST'])
def mark_all_read():
    """Mark all notifications as read in Supabase"""
    user_email = request.args.get('email', '').strip().lower()
    for n in IN_MEMORY_NOTIFICATIONS:
        n['read'] = True
    
    try:
        supabase = get_supabase_client()
        if user_email:
            supabase.table('notifications').update({'read': True}).or_(f'user_email.is.null,user_email.eq.{user_email}').execute()
        else:
            supabase.table('notifications').update({'read': True}).neq('id', '').execute()
    except Exception as e:
        print(f"Supabase mark-read warning: {e}")
        
    return jsonify({'success': True, 'data': IN_MEMORY_NOTIFICATIONS}), 200

@notifications_bp.route('/<notif_id>', methods=['PATCH', 'PUT'])
def toggle_notification_read(notif_id):
    """Toggle or update single notification status in Supabase"""
    data = request.get_json() or {}
    read_val = data.get('read', True)
    try:
        supabase = get_supabase_client()
        supabase.table('notifications').update({'read': read_val}).eq('id', notif_id).execute()
        return jsonify({'success': True, 'id': notif_id, 'read': read_val}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@notifications_bp.route('/<notif_id>', methods=['DELETE'])
def delete_notification(notif_id):
    """Delete a single notification from Supabase"""
    try:
        supabase = get_supabase_client()
        supabase.table('notifications').delete().eq('id', notif_id).execute()
        return jsonify({'success': True, 'id': notif_id}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
