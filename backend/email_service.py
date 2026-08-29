import os
import json
import threading
import requests
from config import Config

def send_ticket_email_edge_function(payload: dict) -> dict:
    """
    Calls the Supabase Edge Function 'send-ticket-email' with the ticket/registration payload.
    Safe, non-blocking invocation that never crashes the calling flow.
    """
    try:
        supabase_url = Config.SUPABASE_URL.rstrip('/')
        supabase_key = Config.SUPABASE_KEY or Config.SUPABASE_ANON_KEY
        function_url = f"{supabase_url}/functions/v1/send-ticket-email"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {supabase_key}"
        }

        # Normalize passId in payload
        pass_id = payload.get('passId') or payload.get('pass_id')
        print(f"[send-ticket-email] Calling Edge Function at {function_url} for pass: {pass_id} (email: {payload.get('email')})")

        resp = requests.post(function_url, headers=headers, json=payload, timeout=10)
        try:
            data = resp.json()
        except Exception:
            data = {"text": resp.text}

        print(f"[send-ticket-email] Edge Function responded ({resp.status_code}): {data}")
        return {
            "success": resp.ok,
            "status_code": resp.status_code,
            "data": data
        }
    except Exception as e:
        print(f"[send-ticket-email] Edge Function call warning: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def trigger_ticket_email_async(payload: dict):
    """
    Trigger ticket email in a background daemon thread so payment/registration
    API responses return instantly with zero latency delay to the player.
    """
    thread = threading.Thread(target=send_ticket_email_edge_function, args=(payload,), daemon=True)
    thread.start()
    return thread
