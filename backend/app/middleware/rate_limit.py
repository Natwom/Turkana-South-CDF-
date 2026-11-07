import threading
import time
from collections import deque
from typing import Deque, Dict, Tuple

from fastapi import HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..core.config import settings

# Global request limiter (per client IP). Use a Redis URI in RATE_LIMIT_STORAGE_URI
# when running several workers so counters are shared.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    storage_uri=settings.RATE_LIMIT_STORAGE_URI,
)


def client_ip(request: Request) -> str:
    """Real client IP. Behind nginx run uvicorn with
    --proxy-headers --forwarded-allow-ips=<proxy ip> so this is the true address."""
    return get_remote_address(request)


class LockoutTracker:
    """Counts failures per key inside a sliding window and locks the key out
    for `lock_seconds` once `max_failures` is reached.

    In-memory and per-process. For multi-worker deployments back this with Redis."""

    def __init__(self, max_failures: int, window_seconds: int, lock_seconds: int):
        self.max_failures = max_failures
        self.window = window_seconds
        self.lock = lock_seconds
        self._fails: Dict[str, Deque[float]] = {}
        self._locked: Dict[str, float] = {}
        self._mu = threading.Lock()

    def locked_for(self, key: str) -> int:
        now = time.monotonic()
        with self._mu:
            until = self._locked.get(key)
            if until is None:
                return 0
            if until > now:
                return int(until - now) + 1
            del self._locked[key]
            return 0

    def fail(self, key: str) -> None:
        now = time.monotonic()
        with self._mu:
            dq = self._fails.setdefault(key, deque())
            cutoff = now - self.window
            while dq and dq[0] < cutoff:
                dq.popleft()
            dq.append(now)
            if len(dq) >= self.max_failures:
                self._locked[key] = now + self.lock
                dq.clear()
            if len(self._fails) > 20000:
                self._prune(now)

    def reset(self, key: str) -> None:
        with self._mu:
            self._fails.pop(key, None)
            self._locked.pop(key, None)

    def _prune(self, now: float) -> None:
        cutoff = now - self.window
        for k in [k for k, dq in self._fails.items() if not dq or dq[-1] < cutoff]:
            del self._fails[k]
        for k in [k for k, t in self._locked.items() if t <= now]:
            del self._locked[k]


# ---- Admin login ----
login_by_ip_user = LockoutTracker(max_failures=5, window_seconds=900, lock_seconds=900)
login_by_user = LockoutTracker(max_failures=30, window_seconds=3600, lock_seconds=3600)
login_by_ip = LockoutTracker(max_failures=20, window_seconds=900, lock_seconds=1800)

# ---- Public application credentials (application number + access code) ----
access_by_ip_app = LockoutTracker(max_failures=5, window_seconds=900, lock_seconds=1800)
access_by_app = LockoutTracker(max_failures=30, window_seconds=3600, lock_seconds=3600)
access_by_ip = LockoutTracker(max_failures=15, window_seconds=900, lock_seconds=1800)

Pair = Tuple[LockoutTracker, str]


def ensure_not_locked(*pairs: Pair) -> None:
    worst = max((t.locked_for(k) for t, k in pairs), default=0)
    if worst:
        raise HTTPException(429, "Too many failed attempts. Please try again later.",
                            headers={"Retry-After": str(worst)})


def register_failures(*pairs: Pair) -> None:
    for t, k in pairs:
        t.fail(k)