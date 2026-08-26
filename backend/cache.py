import time
import threading
from functools import wraps

class FastTTLCache:
    """
    High-Performance, Thread-Safe In-Memory Cache with Automatic TTL Expiration.
    Allows 100+ concurrent users to read data in <2ms without hitting the database repeatedly.
    """
    def __init__(self, default_ttl_seconds=20):
        self.default_ttl = default_ttl_seconds
        self._cache = {}
        self._lock = threading.Lock()

    def get(self, key):
        with self._lock:
            if key in self._cache:
                val, expires_at = self._cache[key]
                if time.time() < expires_at:
                    return val
                else:
                    del self._cache[key]
            return None

    def set(self, key, value, ttl_seconds=None):
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        with self._lock:
            self._cache[key] = (value, time.time() + ttl)

    def delete(self, key):
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear_prefix(self, prefix):
        with self._lock:
            keys_to_del = [k for k in self._cache if str(k).startswith(prefix)]
            for k in keys_to_del:
                del self._cache[k]

    def clear(self):
        with self._lock:
            self._cache.clear()

# Global shared instance
api_cache = FastTTLCache(default_ttl_seconds=15)
