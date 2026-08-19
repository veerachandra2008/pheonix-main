import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    PORT = int(os.getenv('PORT', 5000))
    ENV = os.getenv('FLASK_ENV', 'development')
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL', '')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY', '') # Service role key or anon key
    
    # Razorpay Configuration
    RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
    RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
    RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')

import requests

class SupabaseResponse:
    def __init__(self, data):
        self.data = data

class SupabaseQueryBuilder:
    def __init__(self, base_url, key, table_name):
        self.url = f"{base_url.rstrip('/')}/rest/v1/{table_name}"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        self.params = {}

    def select(self, columns="*"):
        self.params["select"] = columns
        return self

    def eq(self, column, value):
        self.params[column] = f"eq.{value}"
        return self

    def neq(self, column, value):
        self.params[column] = f"neq.{value}"
        return self

    def order(self, column, desc=False):
        self.params["order"] = f"{column}.desc" if desc else f"{column}.asc"
        return self

    def execute(self):
        r = requests.get(self.url, headers=self.headers, params=self.params)
        if not r.ok:
            raise Exception(f"PostgREST query error ({r.status_code}): {r.text}")
        try:
            return SupabaseResponse(r.json())
        except Exception:
            return SupabaseResponse([])

    def insert(self, data):
        class InsertExecutor:
            def __init__(self, url, headers, payload):
                self.url = url
                self.headers = headers
                self.payload = payload
            def execute(self):
                r = requests.post(self.url, headers=self.headers, json=self.payload)
                if not r.ok:
                    raise Exception(f"PostgREST insert error ({r.status_code}): {r.text}")
                try:
                    return SupabaseResponse(r.json())
                except Exception:
                    return SupabaseResponse([self.payload] if isinstance(self.payload, dict) else self.payload)
        return InsertExecutor(self.url, self.headers, data)

    def update(self, data):
        class UpdateExecutor:
            def __init__(self, url, headers, params, payload):
                self.url = url
                self.headers = headers
                self.params = params
                self.payload = payload
            def eq(self, column, value):
                self.params[column] = f"eq.{value}"
                return self
            def neq(self, column, value):
                self.params[column] = f"neq.{value}"
                return self
            def execute(self):
                r = requests.patch(self.url, headers=self.headers, params=self.params, json=self.payload)
                if not r.ok:
                    raise Exception(f"PostgREST update error ({r.status_code}): {r.text}")
                try:
                    return SupabaseResponse(r.json())
                except Exception:
                    return SupabaseResponse([self.payload])
        return UpdateExecutor(self.url, self.headers, dict(self.params), data)

class SupabaseRestClient:
    def __init__(self, url, key):
        self.url = url
        self.key = key
    def table(self, name):
        return SupabaseQueryBuilder(self.url, self.key, name)

# Initialize Supabase client helper safely
def get_supabase_client():
    if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY are missing in backend/.env file.")
    try:
        # pyrefly: ignore [missing-import]
        from supabase import create_client
        return create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
    except Exception:
        # Fallback to direct requests PostgREST client if httpx proxy or package mismatch occurs
        return SupabaseRestClient(Config.SUPABASE_URL, Config.SUPABASE_KEY)

# Initialize Razorpay client helper safely
def get_razorpay_client():
    if not Config.RAZORPAY_KEY_ID or not Config.RAZORPAY_KEY_SECRET:
        raise ValueError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are missing in backend/.env file.")
    try:
        # pyrefly: ignore [missing-import]
        import razorpay
        return razorpay.Client(auth=(Config.RAZORPAY_KEY_ID, Config.RAZORPAY_KEY_SECRET))
    except ImportError:
        raise ImportError("Python package 'razorpay' is missing. Run: pip install razorpay")
