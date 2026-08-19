from flask import Blueprint, request, jsonify
from config import get_supabase_client
import time

notifications_bp = Blueprint('notifications', __name__)

MOCK_NOTIFICATIONS = [
    {
        'id': 'n1',
        'title': 'Tournament Registration Confirmed',
        'message': 'Your squad Titans is locked in for VALORANT Collegiate League Season 4.',
        'time': '10 mins ago',
        'read': False,
        'type': 'tournament',
    },
    {
        'id': 'n2',
        'title': 'Squad Roster Update',
        'message': 'Nisha "Blaze" Menon updated team captain handle for Team Phoenix.',
        'time': '1 hour ago',
        'read': False,
        'type': 'team',
    },
    {
        'id': 'n3',
        'title': 'Anti-Cheat Client Update',
        'message': 'Xenova Anti-Cheat v4.2 client is required for tomorrow match lobbies.',
        'time': '3 hours ago',
        'read': True,
        'type': 'system',
    },
]

IN_MEMORY_NOTIFICATIONS = list(MOCK_NOTIFICATIONS)

@notifications_bp.route('/', methods=['GET'])
def get_notifications():
    """Fetch all notifications from Supabase with memory fallback"""
    try:
        supabase = get_supabase_client()
        res = supabase.table('notifications').select('*').order('created_at', desc=True).execute()
        if res.data and len(res.data) > 0:
            return jsonify({'success': True, 'data': res.data}), 200
    except Exception as e:
        print(f"Supabase error fetching notifications: {e}")
    
    return jsonify({'success': True, 'data': IN_MEMORY_NOTIFICATIONS, 'fallback': True}), 200

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
    """Mark all notifications as read"""
    for n in IN_MEMORY_NOTIFICATIONS:
        n['read'] = True
    
    try:
        supabase = get_supabase_client()
        supabase.table('notifications').update({'read': True}).neq('id', '').execute()
    except Exception as e:
        print(f"Supabase mark-read warning: {e}")
        
    return jsonify({'success': True, 'data': IN_MEMORY_NOTIFICATIONS}), 200
