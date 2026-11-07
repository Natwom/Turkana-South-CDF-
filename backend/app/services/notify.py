import json
import logging
import threading
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Optional

from ..core.config import settings

logger = logging.getLogger("notify")

_EAT = timezone(timedelta(hours=3))
_last_sent: dict = {}
_mu = threading.Lock()


def _throttled(key: str, seconds: int) -> bool:
    """True if an email with this key was sent less than `seconds` ago."""
    now = time.monotonic()
    with _mu:
        last = _last_sent.get(key)
        if last is not None and now - last < seconds:
            return True
        _last_sent[key] = now
        if len(_last_sent) > 2000:
            for k in [k for k, t in _last_sent.items() if now - t > 3600]:
                del _last_sent[k]
        return False


def _post(subject: str, text: str) -> None:
    try:
        payload = {
            "from": settings.ALERT_EMAIL_FROM,
            "to": [e.strip() for e in settings.ALERT_EMAIL_TO.split(",") if e.strip()],
            "subject": subject,
            "text": text,
        }
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}",
                     "Content-Type": "application/json",
                     "User-Agent": "tsb-bursary/1.0"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10).read()
    except Exception:
        logger.exception("Alert email could not be sent")


def send_alert(subject: str, text: str, throttle_key: Optional[str] = None,
               throttle_seconds: int = 0) -> None:
    """Fire-and-forget: sends in a background thread so login is never slowed down.
    Does nothing if email alerts are not configured."""
    if not (settings.RESEND_API_KEY and settings.ALERT_EMAIL_TO):
        return
    if throttle_key and _throttled(throttle_key, throttle_seconds):
        return
    threading.Thread(target=_post, args=(subject, text), daemon=True).start()


def _now() -> str:
    return datetime.now(_EAT).strftime("%d %b %Y, %H:%M:%S EAT")


def login_success(username: str, role: str, ip: str, user_agent: str) -> None:
    if not settings.ALERT_ON_SUCCESS:
        return
    send_alert(
        "Bursary admin login",
        f"An admin signed in.\n\nUser: {username}\nRole: {role}\nIP: {ip}\n"
        f"Time: {_now()}\nDevice: {user_agent}\n\n"
        "If this was not you, reset that password immediately.",
    )


def login_failed(username: Optional[str], ip: str, user_agent: str) -> None:
    who = username if username else "(unknown username)"
    send_alert(
        "Failed bursary admin login",
        f"A login attempt failed.\n\nAccount: {who}\nIP: {ip}\nTime: {_now()}\n"
        f"Device: {user_agent}\n\nFurther failures in the next 15 minutes are not emailed.",
        throttle_key="login-failed", throttle_seconds=900,
    )


def login_locked(username: Optional[str], ip: str) -> None:
    who = username if username else "(unknown username)"
    send_alert(
        "Bursary admin login LOCKED OUT",
        f"Too many wrong passwords. Login is locked for 15 minutes.\n\n"
        f"Account: {who}\nIP: {ip}\nTime: {_now()}\n\nPossible password-guessing attack.",
        throttle_key=f"login-locked:{ip}", throttle_seconds=3600,
    )