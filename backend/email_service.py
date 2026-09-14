"""
XENOVA Esports Platform - Brevo Transactional Email Service
Dispatches digital tournament entry tickets and passes to registered captain emails
using the Brevo REST API (https://api.brevo.com/v3/smtp/email).
"""

import os
import time
import html
import threading
import requests
from config import Config, get_supabase_client

BREVO_API_ENDPOINT = "https://api.brevo.com/v3/smtp/email"
APP_BASE_URL = "https://pheonix-main.vercel.app"


def _escape(val: any) -> str:
    """Safely escape HTML entities"""
    if val is None:
        return ""
    return html.escape(str(val))


def generate_ticket_html(data: dict) -> str:
    """
    Renders a responsive, cyberpunk/dark-esports themed HTML tournament entry pass.
    Compatible with Gmail, Outlook, Apple Mail, and mobile clients.
    """
    pass_id = _escape(data.get('pass_id') or data.get('passId') or 'XPH-PASS')
    tournament_slug = _escape(data.get('tournament_slug') or data.get('tournamentSlug') or 'tournament')
    tournament_title = _escape(data.get('tournament_title') or data.get('tournamentTitle') or 'Esports Championship')
    tournament_game = _escape(data.get('tournament_game') or data.get('tournamentGame') or 'Esports')
    tournament_date = _escape(data.get('tournament_date') or data.get('tournamentDate') or 'TBD')
    tournament_format = _escape(data.get('tournament_format') or data.get('tournamentFormat') or 'Tournament')
    tournament_region = _escape(data.get('tournament_region') or data.get('tournamentRegion') or 'Pan India')
    tournament_fee = _escape(data.get('tournament_fee') or data.get('tournamentFee') or 'Free')
    team_name = _escape(data.get('team_name') or data.get('teamName') or 'Alpha Squad')
    college = _escape(data.get('college') or 'University')
    captain_name = _escape(data.get('captain_name') or data.get('captainName') or 'Captain')
    email = _escape(data.get('email') or '')
    payment_status = _escape(data.get('payment_status') or data.get('paymentStatus') or 'CONFIRMED')
    order_id = _escape(data.get('order_id') or data.get('orderId') or 'N/A')
    payment_id = _escape(data.get('payment_id') or data.get('paymentId') or 'N/A')
    players = data.get('players') or []

    pass_url = f"{APP_BASE_URL}/registration/{tournament_slug}/pass?passId={pass_id}"

    # Build Roster Table Rows
    roster_rows_html = ""
    if players and isinstance(players, list):
        for idx, p in enumerate(players):
            p_name = _escape(p.get('name') or p.get('player_name') or f"Player {idx + 1}")
            p_tag = _escape(p.get('inGameTag') or p.get('in_game_tag') or p.get('gameId') or 'N/A')
            is_capt = p.get('isCaptain') or p.get('is_captain') or (idx == 0)
            role_label = "Captain" if is_capt else "Starter"
            badge_color = "#10b981" if is_capt else "#6366f1"
            bg_row = "#131b2e" if idx % 2 == 0 else "#0f172a"

            roster_rows_html += f"""
            <tr style="background-color: {bg_row}; border-bottom: 1px solid #1e293b;">
              <td style="padding: 10px 14px; font-size: 13px; color: #94a3b8; font-family: monospace;">#{idx + 1}</td>
              <td style="padding: 10px 14px; font-size: 14px; font-weight: 600; color: #f8fafc;">{p_name}</td>
              <td style="padding: 10px 14px; font-size: 13px; color: #38bdf8; font-family: monospace;">{p_tag}</td>
              <td style="padding: 10px 14px; text-align: right;">
                <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; color: {badge_color}; background-color: rgba(99, 102, 241, 0.12); border-radius: 9999px; border: 1px solid {badge_color}; text-transform: uppercase;">
                  {role_label}
                </span>
              </td>
            </tr>
            """

    roster_section_html = ""
    if roster_rows_html:
        roster_section_html = f"""
        <!-- SQUAD ROSTER SECTION -->
        <div style="margin-top: 24px; background: #0b1120; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;">
          <div style="padding: 14px 18px; background: linear-gradient(90deg, #111827 0%, #1e1b4b 100%); border-bottom: 1px solid #1e293b;">
            <p style="margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #818cf8;">
              AUTHENTICATED SQUAD ROSTER
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #0d1527; border-bottom: 1px solid #1e293b;">
                <th style="padding: 8px 14px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">#</th>
                <th style="padding: 8px 14px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Player</th>
                <th style="padding: 8px 14px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Game Tag</th>
                <th style="padding: 8px 14px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; text-align: right;">Role</th>
              </tr>
            </thead>
            <tbody>
              {roster_rows_html}
            </tbody>
          </table>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Tournament Entry Pass - XENOVA</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
    
    <!-- HEADER BRANDING -->
    <div style="text-align: center; padding: 24px 0 16px 0;">
      <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); margin-bottom: 12px;">
        <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #a5b4fc;">
          OFFICIAL TOURNAMENT ENTRY PASS
        </span>
      </div>
      <h1 style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -0.03em; color: #ffffff; text-transform: uppercase;">
        XENOVA <span style="color: #6366f1;">ESPORTS</span>
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">
        Collegiate Esports League & Tournament Arena
      </p>
    </div>

    <!-- MAIN PASS CONTAINER -->
    <div style="background: linear-gradient(180deg, #0f172a 0%, #0b1120 100%); border: 1px solid #334155; border-radius: 18px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.65);">
      
      <!-- TOP BANNER -->
      <div style="background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%); padding: 3px 0;"></div>

      <div style="padding: 28px 24px;">
        
        <!-- STATUS BADGE & PASS ID -->
        <div style="background: #090e1a; border: 1px solid #1e293b; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 9999px; margin-bottom: 10px;">
            <span style="font-size: 12px; font-weight: 800; color: #34d399; letter-spacing: 0.05em; text-transform: uppercase;">
              ✓ {payment_status} • ENTRY CONFIRMED
            </span>
          </div>
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b;">
            DIGITAL PASS ID
          </p>
          <div style="font-size: 28px; font-weight: 900; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; color: #38bdf8; letter-spacing: 0.08em;">
            {pass_id}
          </div>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
            Present this Pass ID or QR code at tournament check-in.
          </p>
        </div>

        <!-- TOURNAMENT SUMMARY -->
        <div style="border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
            {tournament_title}
          </h2>
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #818cf8;">
            Game: <span style="color: #f1f5f9;">{tournament_game}</span> • Format: <span style="color: #f1f5f9;">{tournament_format}</span>
          </p>
        </div>

        <!-- KEY DETAILS GRID -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 50%;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Team Name</p>
              <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 700; color: #f8fafc;">{team_name}</p>
            </td>
            <td style="padding: 8px 0; vertical-align: top; width: 50%;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">College / University</p>
              <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 600; color: #cbd5e1;">{college}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0 8px 0; vertical-align: top;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Captain</p>
              <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 600; color: #f8fafc;">{captain_name}</p>
            </td>
            <td style="padding: 12px 0 8px 0; vertical-align: top;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Match Date</p>
              <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 600; color: #f8fafc;">{tournament_date}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0 8px 0; vertical-align: top;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Entry Fee</p>
              <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 700; color: #34d399;">{tournament_fee}</p>
            </td>
            <td style="padding: 12px 0 8px 0; vertical-align: top;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Region</p>
              <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 600; color: #f8fafc;">{tournament_region}</p>
            </td>
          </tr>
        </table>

        {roster_section_html}

        <!-- CALL TO ACTION BUTTON -->
        <div style="text-align: center; margin: 32px 0 16px 0;">
          <a href="{pass_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 15px; font-weight: 800; letter-spacing: 0.03em; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.5); text-transform: uppercase;">
            View Digital Pass & QR Code &rarr;
          </a>
        </div>

        <p style="text-align: center; margin: 0 0 24px 0; font-size: 12px; color: #64748b;">
          Direct Link: <a href="{pass_url}" style="color: #818cf8; text-decoration: underline;">{pass_url}</a>
        </p>

        <!-- IMPORTANT GUIDELINES -->
        <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #fbbf24; letter-spacing: 0.05em;">
            ⚡ Mandatory Match-Day Check-in Protocol
          </p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #94a3b8; line-height: 1.6;">
            <li>Team Captain must present this Pass ID (or digital QR) at the check-in desk/lobby.</li>
            <li>All players must verify with valid collegiate student credentials.</li>
            <li>Be in the match lobby at least 15 minutes before the bracket commencement.</li>
            <li>Any roster substitutions must be reported to the tournament administrator prior to match kickoff.</li>
          </ul>
        </div>

        <!-- PAYMENT REFERENCE DETAILS -->
        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px dashed #1e293b; font-size: 11px; color: #64748b; font-family: monospace;">
          <span>Order ID: {order_id}</span> • <span>Payment ID: {payment_id}</span>
        </div>

      </div>
    </div>

    <!-- FOOTER -->
    <div style="text-align: center; padding: 24px 0; font-size: 12px; color: #64748b;">
      <p style="margin: 0 0 6px 0;">
        You are receiving this official ticket because you registered as Team Captain on XENOVA.
      </p>
      <p style="margin: 0; color: #475569;">
        &copy; {time.strftime('%Y')} XENOVA Esports Platform. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
"""


def send_ticket_email(payload: dict) -> dict:
    """
    Sends the tournament entry pass email via Brevo REST API.
    Guaranteed safe execution: captures all exceptions and returns a status dict.
    """
    try:
        api_key = Config.BREVO_API_KEY
        if not api_key:
            print("[Brevo Email] Warning: BREVO_API_KEY is not configured.")
            return {"success": False, "error": "BREVO_API_KEY missing"}

        recipient_email = (payload.get('email') or '').strip()
        captain_name = (payload.get('captain_name') or payload.get('captainName') or 'Captain').strip()
        pass_id = (payload.get('pass_id') or payload.get('passId') or '').strip()
        tournament_title = (payload.get('tournament_title') or payload.get('tournamentTitle') or 'Esports Tournament').strip()

        if not recipient_email or not pass_id:
            print(f"[Brevo Email] Missing recipient email ({recipient_email}) or pass_id ({pass_id}).")
            return {"success": False, "error": "Recipient email or passId missing"}

        # If players roster isn't present in payload, fetch from tournament_rosters table
        players = payload.get('players')
        if not players:
            try:
                supabase = get_supabase_client()
                roster_res = supabase.table('tournament_rosters').select('*').eq('pass_id', pass_id).order('slot').execute()
                if roster_res.data:
                    players = [
                        {
                            'name': r.get('player_name'),
                            'inGameTag': r.get('in_game_tag'),
                            'isCaptain': r.get('is_captain'),
                            'slot': r.get('slot')
                        }
                        for r in roster_res.data
                    ]
                    payload['players'] = players
            except Exception as r_err:
                print(f"[Brevo Email] Roster query notice: {r_err}")

        # Render HTML
        html_content = generate_ticket_html(payload)

        sender_email = Config.BREVO_SENDER_EMAIL or "veerachandra2008@gmail.com"
        sender_name = Config.BREVO_SENDER_NAME or "XENOVA Esports"

        brevo_payload = {
            "sender": {
                "name": sender_name,
                "email": sender_email
            },
            "to": [
                {
                    "email": recipient_email,
                    "name": captain_name
                }
            ],
            "subject": f"🎮 Tournament Entry Pass Confirmed: {tournament_title} [{pass_id}]",
            "htmlContent": html_content
        }

        headers = {
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        print(f"[Brevo Email] Dispatching ticket for pass {pass_id} to {recipient_email}...")
        resp = requests.post(BREVO_API_ENDPOINT, headers=headers, json=brevo_payload, timeout=12)

        if resp.status_code in [200, 201, 202]:
            resp_data = resp.json() if resp.text else {}
            msg_id = resp_data.get('messageId', 'unknown')
            print(f"[Brevo Email] SUCCESS! Ticket pass {pass_id} dispatched to {recipient_email} (messageId: {msg_id})")
            return {"success": True, "messageId": msg_id, "status_code": resp.status_code}
        else:
            err_msg = resp.text
            print(f"[Brevo Email] HTTP Error {resp.status_code}: {err_msg}")
            return {"success": False, "status_code": resp.status_code, "error": err_msg}

    except Exception as exc:
        print(f"[Brevo Email] Exception while sending ticket email: {exc}")
        return {"success": False, "error": str(exc)}


def send_ticket_email_async(payload: dict) -> threading.Thread:
    """
    Dispatches the ticket email in a background daemon thread.
    Zero-latency impact on payment verification or registration endpoints.
    """
    payload_copy = dict(payload)
    thread = threading.Thread(target=send_ticket_email, args=(payload_copy,), daemon=True)
    thread.start()
    return thread
