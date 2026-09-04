import os
from dotenv import load_dotenv

# Load environment variables from backend/.env, root .env, and root .env.local
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_backend_dir)

# Load environment variables from backend/.env (with override=True to guarantee freshest keys)
backend_env_path = os.path.join(_backend_dir, '.env')
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path, override=True)
load_dotenv(os.path.join(_root_dir, '.env.local'), override=False)
load_dotenv(os.path.join(_root_dir, '.env'), override=False)
load_dotenv()

class Config:
    @classmethod
    def reload_env(cls):
        if os.path.exists(backend_env_path):
            load_dotenv(backend_env_path, override=True)

    @property
    def PORT(self):
        return int(os.getenv('PORT', 5000))

    @property
    def ENV(self):
        return os.getenv('FLASK_ENV', 'development')

    @property
    def SUPABASE_URL(self):
        return (os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL') or 'https://icgqikmzhtynpatntglw.supabase.co').strip()

    @property
    def SUPABASE_KEY(self):
        return (
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            or os.getenv('SUPABASE_KEY')
            or os.getenv('SUPABASE_ANON_KEY')
            or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
            or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZ3Fpa216aHR5bnBhdG50Z2x3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3MTA2MSwiZXhwIjoyMTAxNzQ3MDYxfQ._D0eCpjbdsr7GlZhy2cFgwZqX5oWp1bVAi-5MmEQd9w'
        ).strip()

    @property
    def SUPABASE_SERVICE_ROLE_KEY(self):
        return (
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            or os.getenv('SUPABASE_KEY')
            or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZ3Fpa216aHR5bnBhdG50Z2x3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3MTA2MSwiZXhwIjoyMTAxNzQ3MDYxfQ._D0eCpjbdsr7GlZhy2cFgwZqX5oWp1bVAi-5MmEQd9w'
        ).strip()

    @property
    def SUPABASE_ANON_KEY(self):
        return (
            os.getenv('SUPABASE_ANON_KEY')
            or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
            or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZ3Fpa216aHR5bnBhdG50Z2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzEwNjEsImV4cCI6MjEwMTc0NzA2MX0.pRIjjUIrPt2n7XMJ5RjCSKxjZeyUcZEKoN8Vgvkt0GY'
        ).strip()

    @property
    def RAZORPAY_KEY_ID(self):
        return os.getenv('RAZORPAY_KEY_ID', '').strip().strip('"\'')

    @property
    def RAZORPAY_KEY_SECRET(self):
        return os.getenv('RAZORPAY_KEY_SECRET', '').strip().strip('"\'')

    @property
    def RAZORPAY_WEBHOOK_SECRET(self):
        return os.getenv('RAZORPAY_WEBHOOK_SECRET', '').strip().strip('"\'')

Config = Config()

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Persistent Connection Pool for High-Speed Database Queries
_HTTP_SESSION = requests.Session()
_retry_strategy = Retry(
    total=1,
    backoff_factor=0.05,
    status_forcelist=[502, 503, 504],
)
_adapter = HTTPAdapter(pool_connections=30, pool_maxsize=30, max_retries=_retry_strategy)
_HTTP_SESSION.mount("https://", _adapter)
_HTTP_SESSION.mount("http://", _adapter)

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
        self.timeout = 5.0

    def select(self, columns="*"):
        self.params["select"] = columns
        return self

    def eq(self, column, value):
        self.params[column] = f"eq.{value}"
        return self

    def neq(self, column, value):
        self.params[column] = f"neq.{value}"
        return self

    def gt(self, column, value):
        self.params[column] = f"gt.{value}"
        return self

    def gte(self, column, value):
        self.params[column] = f"gte.{value}"
        return self

    def lt(self, column, value):
        self.params[column] = f"lt.{value}"
        return self

    def lte(self, column, value):
        self.params[column] = f"lte.{value}"
        return self

    def like(self, column, pattern):
        self.params[column] = f"like.{pattern}"
        return self

    def ilike(self, column, pattern):
        self.params[column] = f"ilike.{pattern}"
        return self

    def is_(self, column, value):
        self.params[column] = f"is.{value}"
        return self

    def or_(self, filters):
        self.params["or"] = f"({filters})"
        return self

    def order(self, column, desc=False):
        self.params["order"] = f"{column}.desc" if desc else f"{column}.asc"
        return self

    def limit(self, count):
        self.params["limit"] = str(count)
        return self

    def single(self):
        return self

    def maybeSingle(self):
        return self

    def execute(self):
        r = _HTTP_SESSION.get(self.url, headers=self.headers, params=self.params, timeout=self.timeout)
        if not r.ok:
            raise Exception(f"PostgREST query error ({r.status_code}): {r.text}")
        try:
            return SupabaseResponse(r.json())
        except Exception:
            return SupabaseResponse([])

    def insert(self, data):
        class InsertExecutor:
            def __init__(self, url, headers, payload, timeout):
                self.url = url
                self.headers = headers
                self.payload = payload
                self.timeout = timeout
            def execute(self):
                r = _HTTP_SESSION.post(self.url, headers=self.headers, json=self.payload, timeout=self.timeout)
                if not r.ok:
                    raise Exception(f"PostgREST insert error ({r.status_code}): {r.text}")
                try:
                    return SupabaseResponse(r.json())
                except Exception:
                    return SupabaseResponse([self.payload] if isinstance(self.payload, dict) else self.payload)
        return InsertExecutor(self.url, self.headers, data, self.timeout)

    def update(self, data):
        class UpdateExecutor:
            def __init__(self, url, headers, params, payload, timeout):
                self.url = url
                self.headers = headers
                self.params = params
                self.payload = payload
                self.timeout = timeout
            def eq(self, column, value):
                self.params[column] = f"eq.{value}"
                return self
            def neq(self, column, value):
                self.params[column] = f"neq.{value}"
                return self
            def execute(self):
                r = _HTTP_SESSION.patch(self.url, headers=self.headers, params=self.params, json=self.payload, timeout=self.timeout)
                if not r.ok:
                    raise Exception(f"PostgREST update error ({r.status_code}): {r.text}")
                try:
                    return SupabaseResponse(r.json())
                except Exception:
                    return SupabaseResponse([self.payload])
        return UpdateExecutor(self.url, self.headers, dict(self.params), data, self.timeout)

    def delete(self):
        class DeleteExecutor:
            def __init__(self, url, headers, params, timeout):
                self.url = url
                self.headers = headers
                self.params = params
                self.timeout = timeout
            def eq(self, column, value):
                self.params[column] = f"eq.{value}"
                return self
            def neq(self, column, value):
                self.params[column] = f"neq.{value}"
                return self
            def execute(self):
                r = _HTTP_SESSION.delete(self.url, headers=self.headers, params=self.params, timeout=self.timeout)
                if not r.ok:
                    raise Exception(f"PostgREST delete error ({r.status_code}): {r.text}")
                try:
                    return SupabaseResponse(r.json())
                except Exception:
                    return SupabaseResponse([])
        return DeleteExecutor(self.url, self.headers, dict(self.params), self.timeout)

class SupabaseRestClient:
    def __init__(self, url, key):
        self.url = url
        self.key = key
    def table(self, name):
        return SupabaseQueryBuilder(self.url, self.key, name)

# Global Client Singleton for Connection Reuse
_CACHED_SUPABASE_CLIENT = None

def get_supabase_client():
    global _CACHED_SUPABASE_CLIENT
    if _CACHED_SUPABASE_CLIENT is not None:
        return _CACHED_SUPABASE_CLIENT

    if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY are missing in backend/.env file.")
    
    try:
      
        # pyrefly: ignore [missing-import]
        from supabase import create_client
        _CACHED_SUPABASE_CLIENT = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
    except Exception:
        _CACHED_SUPABASE_CLIENT = SupabaseRestClient(Config.SUPABASE_URL, Config.SUPABASE_KEY)

    return _CACHED_SUPABASE_CLIENT

class _RazorpayNativeOrder:
    def __init__(self, auth):
        self.auth = auth

    def create(self, data):
        url = "https://api.razorpay.com/v1/orders"
        resp = requests.post(url, json=data, auth=self.auth, timeout=15)
        res_json = resp.json()
        if not resp.ok or 'error' in res_json:
            err_msg = res_json.get('error', {}).get('description') or res_json.get('message') or resp.text
            raise Exception(f"Razorpay API Error ({resp.status_code}): {err_msg}")
        return res_json

    def fetch(self, order_id):
        url = f"https://api.razorpay.com/v1/orders/{order_id}"
        resp = requests.get(url, auth=self.auth, timeout=15)
        res_json = resp.json()
        if not resp.ok or 'error' in res_json:
            err_msg = res_json.get('error', {}).get('description') or res_json.get('message') or resp.text
            raise Exception(f"Razorpay API Error ({resp.status_code}): {err_msg}")
        return res_json

class _RazorpayNativePayment:
    def __init__(self, auth):
        self.auth = auth

    def fetch(self, payment_id):
        url = f"https://api.razorpay.com/v1/payments/{payment_id}"
        resp = requests.get(url, auth=self.auth, timeout=15)
        res_json = resp.json()
        if not resp.ok or 'error' in res_json:
            err_msg = res_json.get('error', {}).get('description') or res_json.get('message') or resp.text
            raise Exception(f"Razorpay API Error ({resp.status_code}): {err_msg}")
        return res_json

class RazorpayNativeClient:
    """Lightweight zero-dependency Razorpay Client supporting Python 3.12+ / 3.14+"""
    def __init__(self, auth):
        self.auth = auth
        self.order = _RazorpayNativeOrder(auth)
        self.payment = _RazorpayNativePayment(auth)

# Initialize Razorpay client helper safely
def get_razorpay_client():
    Config.reload_env()
    key_id = Config.RAZORPAY_KEY_ID
    key_secret = Config.RAZORPAY_KEY_SECRET
    if not key_id or not key_secret:
        raise ValueError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are missing in backend/.env file.")
    try:
        import razorpay
        return razorpay.Client(auth=(key_id, key_secret))
    except Exception as err:
        # Fallback to direct REST client if razorpay SDK has pkg_resources / setuptools issues
        return RazorpayNativeClient(auth=(key_id, key_secret))
