import os
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from config import Config, get_supabase_client

rosters_bp = Blueprint('rosters', __name__)

# In-memory storage for rosters fallback
IN_MEMORY_ROSTERS = {}


def save_tournament_rosters_to_db(supabase, pass_id, tournament_slug, team_name, college, players):
    """
    Helper to store exactly 4 players into the dedicated 'tournament_rosters' table
    """
    if not pass_id or not tournament_slug:
        return []

    if not players or not isinstance(players, list) or len(players) == 0:
        return []

    saved_records = []
    clean_tournament_slug = tournament_slug.strip().lower()

    for idx, p in enumerate(players[:4]):
        slot = int(p.get('slot') or (idx + 1))
        player_name = (p.get('name') or p.get('playerName') or f"Player {slot}").strip()
        in_game_tag = (p.get('inGameTag') or p.get('in_game_tag') or p.get('ign') or f"TAG_{slot}").strip()
        email = (p.get('email') or p.get('playerEmail') or '').strip().lower()
        phone = (p.get('phone') or '').strip()
        is_captain = bool(p.get('isCaptain') or p.get('is_captain') or slot == 1)

        roster_record = {
            'pass_id': pass_id,
            'tournament_slug': clean_tournament_slug,
            'team_name': team_name,
            'slot': slot,
            'player_name': player_name,
            'in_game_tag': in_game_tag,
            'email': email,
            'phone': phone,
            'college': college,
            'is_captain': is_captain
        }
        saved_records.append(roster_record)

        # 1. Update in-memory
        if pass_id not in IN_MEMORY_ROSTERS:
            IN_MEMORY_ROSTERS[pass_id] = []
        # Replace or append slot
        IN_MEMORY_ROSTERS[pass_id] = [r for r in IN_MEMORY_ROSTERS[pass_id] if r.get('slot') != slot]
        IN_MEMORY_ROSTERS[pass_id].append(roster_record)

        # 2. Update Supabase
        if supabase:
            try:
                existing = supabase.table('tournament_rosters').select('id').eq('pass_id', pass_id).eq('slot', slot).execute()
                if existing.data and len(existing.data) > 0:
                    supabase.table('tournament_rosters').update(roster_record).eq('id', existing.data[0]['id']).execute()
                else:
                    supabase.table('tournament_rosters').insert(roster_record).execute()
            except Exception as e:
                print(f"Notice saving player slot {slot} to tournament_rosters: {e}")

    return saved_records


@rosters_bp.route('', methods=['GET'])
@rosters_bp.route('/', methods=['GET'])
def get_rosters():
    """
    Get 4-player rosters grouped by tournaments or filtered by tournament_slug or organizer_email
    Query Params:
      - tournament_slug: string (optional)
      - pass_id: string (optional)
      - organizer_email: string (optional)
    """
    try:
        tournament_slug = request.args.get('tournament_slug', '').strip().lower()
        pass_id = request.args.get('pass_id', '').strip()
        organizer_email = request.args.get('organizer_email', '').strip().lower()

        allowed_slugs = set()
        if organizer_email and organizer_email != 'admin@xenova.gg':
            try:
                supabase = get_supabase_client()
                t_res = supabase.table('tournaments').select('*').execute()
                if t_res.data:
                    for t in t_res.data:
                        c_by = (t.get('createdBy') or t.get('organizer_email') or t.get('contact_email') or '').strip().lower()
                        hst = (t.get('host') or '').strip().lower()
                        if c_by == organizer_email or organizer_email in hst:
                            s = (t.get('slug') or '').strip().lower()
                            if s:
                                allowed_slugs.add(s)
            except Exception as t_err:
                print(f"Notice fetching organizer tournaments: {t_err}")

            try:
                from routes.tournaments import IN_MEMORY_TOURNAMENTS
                for t in IN_MEMORY_TOURNAMENTS:
                    c_by = (t.get('createdBy') or t.get('organizer_email') or t.get('contact_email') or '').strip().lower()
                    hst = (t.get('host') or '').strip().lower()
                    if c_by == organizer_email or organizer_email in hst:
                        s = (t.get('slug') or '').strip().lower()
                        if s:
                            allowed_slugs.add(s)
            except Exception:
                pass

        db_rosters = []
        try:
            supabase = get_supabase_client()
            query = supabase.table('tournament_rosters').select('*')
            if tournament_slug:
                query = query.eq('tournament_slug', tournament_slug)
            if pass_id:
                query = query.eq('pass_id', pass_id)
            res = query.order('pass_id').order('slot').execute()
            if res.data and len(res.data) > 0:
                db_rosters = res.data
        except Exception as e:
            print(f"Supabase tournament_rosters query notice: {e}")

        # Fallback to in-memory if DB empty
        if not db_rosters:
            for pid, plist in IN_MEMORY_ROSTERS.items():
                if pass_id and pid != pass_id:
                    continue
                for p in plist:
                    p_slug = (p.get('tournament_slug') or '').strip().lower()
                    if tournament_slug and p_slug != tournament_slug:
                        continue
                    db_rosters.append(p)

        # Also pull from registrations JSON if tournament_rosters not populated yet
        if not db_rosters:
            try:
                supabase = get_supabase_client()
                reg_query = supabase.table('registrations').select('*')
                if tournament_slug:
                    reg_query = reg_query.eq('tournament_slug', tournament_slug)
                if pass_id:
                    reg_query = reg_query.eq('pass_id', pass_id)
                reg_res = reg_query.execute()
                if reg_res.data:
                    for reg in reg_res.data:
                        reg_pass = reg.get('pass_id')
                        reg_slug = reg.get('tournament_slug')
                        reg_team = reg.get('team_name')
                        reg_college = reg.get('college')
                        players_json = reg.get('players') or []
                        if isinstance(players_json, list) and len(players_json) > 0:
                            for idx, p in enumerate(players_json[:4]):
                                slot = int(p.get('slot') or (idx + 1))
                                db_rosters.append({
                                    'pass_id': reg_pass,
                                    'tournament_slug': reg_slug,
                                    'team_name': reg_team,
                                    'slot': slot,
                                    'player_name': p.get('name') or f"Player {slot}",
                                    'in_game_tag': p.get('inGameTag') or p.get('in_game_tag') or f"IGN_{slot}",
                                    'email': p.get('email') or reg.get('email'),
                                    'college': reg_college,
                                    'is_captain': slot == 1
                                })
            except Exception as e:
                print(f"Fallback registrations roster extraction notice: {e}")

        # Filter by organizer_email if requested
        if organizer_email and organizer_email != 'admin@xenova.gg':
            db_rosters = [r for r in db_rosters if (r.get('tournament_slug') or '').strip().lower() in allowed_slugs]

        # Group by team / pass_id
        teams_map = {}
        for row in db_rosters:
            pid = row.get('pass_id')
            if pid not in teams_map:
                teams_map[pid] = {
                    'pass_id': pid,
                    'tournament_slug': row.get('tournament_slug'),
                    'team_name': row.get('team_name'),
                    'college': row.get('college'),
                    'players': []
                }
            teams_map[pid]['players'].append(row)

        # Sort each team's players by slot (1..4)
        for pid in teams_map:
            teams_map[pid]['players'].sort(key=lambda x: int(x.get('slot', 1)))

        return jsonify({
            'success': True,
            'count': len(db_rosters),
            'teams_count': len(teams_map),
            'data': db_rosters,
            'teams': list(teams_map.values()),
            'tournament_slug': tournament_slug or 'all'
        }), 200

    except Exception as e:
        print(f"Error fetching rosters: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@rosters_bp.route('/by-tournament/<tournament_slug>', methods=['GET'])
def get_rosters_by_tournament(tournament_slug):
    """Get all 4-player rosters for a specific tournament"""
    request.args = {'tournament_slug': tournament_slug}
    return get_rosters()


@rosters_bp.route('/by-pass/<pass_id>', methods=['GET'])
def get_roster_by_pass(pass_id):
    """Get the 4 players for a single pass_id"""
    request.args = {'pass_id': pass_id}
    return get_rosters()
