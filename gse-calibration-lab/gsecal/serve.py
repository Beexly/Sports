"""
Launch policy — deployability without leaking unpublished numbers.

THE PROBLEM

Hugging Face Spaces (and any container host, Akamai/LKE included) bind 0.0.0.0
and are PUBLIC BY DEFAULT. This tool displays calibration figures that have not
cleared the PROVEN gate. Publishing those is precisely what AGENTS.md law 3
protects against: "These gates are the honesty boundary; opening one publishes
an unearned claim." A Space serving this app with no auth is that failure, and
it would happen silently — no error, no warning, just a public URL.

THE POLICY, enforced here rather than documented and hoped for:

  loopback bind      -> auth optional (the operator is the only reachable client)
  ANY other bind     -> auth REQUIRED, or the process refuses to start
  public tunnelling  -> never, under any configuration

There is deliberately NO escape hatch. No --i-know-what-im-doing flag, no
env var that disables the check. An escape hatch is the thing that gets used at
2am, and the whole value of this tool is that its numbers are trustworthy
BECAUSE the boundary is not negotiable.

This module is pure and dependency-free, so the policy is unit-tested without
gradio installed and cannot drift from what app.py actually does.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

__all__ = [
    "LaunchConfig",
    "LOOPBACK_HOSTS",
    "is_loopback",
    "detect_managed_host",
    "resolve_launch_config",
    "PublicWithoutAuthError",
]

LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost", "::1", "0:0:0:0:0:0:0:1"})

# Env vars set by common managed hosts. Presence means "this process is or will
# be reachable from outside the box", regardless of the host string passed in.
MANAGED_HOST_ENV = {
    "SPACE_ID": "Hugging Face Spaces",
    "SPACE_HOST": "Hugging Face Spaces",
    "K_SERVICE": "Knative / Cloud Run",
    "KUBERNETES_SERVICE_HOST": "Kubernetes (e.g. Akamai LKE)",
}


class PublicWithoutAuthError(RuntimeError):
    """Raised instead of serving unpublished calibration numbers to the world."""


@dataclass(frozen=True, slots=True)
class LaunchConfig:
    server_name: str
    server_port: int
    auth: tuple[str, str] | None
    share: bool
    is_public: bool
    managed_host: str | None

    @property
    def posture(self) -> str:
        if not self.is_public:
            return "loopback — reachable only from this machine"
        return f"public bind ({self.server_name}) — password protected"


def is_loopback(host: str | None) -> bool:
    return (host or "").strip().lower() in LOOPBACK_HOSTS


def detect_managed_host(env: dict | None = None) -> str | None:
    """Name the managed platform if one is detected, else None."""
    env = os.environ if env is None else env
    for key, label in MANAGED_HOST_ENV.items():
        if env.get(key):
            return label
    return None


def resolve_launch_config(
    *,
    host: str | None = None,
    port: int = 7861,
    env: dict | None = None,
) -> LaunchConfig:
    """Decide how to bind, or refuse.

    Credentials come from GSECAL_AUTH_USER / GSECAL_AUTH_PASS. They are read
    from the environment and never written, logged, or defaulted — there is no
    built-in username or password to discover (AGENTS.md law 4: no secrets in
    code).

    Raises PublicWithoutAuthError when the process would be reachable from
    outside the machine without a password.
    """
    env = os.environ if env is None else env
    managed = detect_managed_host(env)

    # On a managed host the platform decides the bind; assume public even if the
    # caller asked for loopback, because being wrong in that direction publishes.
    if host is None:
        host = "0.0.0.0" if managed else "127.0.0.1"

    public = bool(managed) or not is_loopback(host)

    user = (env.get("GSECAL_AUTH_USER") or "").strip()
    password = env.get("GSECAL_AUTH_PASS") or ""
    auth = (user, password) if user and password else None

    if public and auth is None:
        where = f" ({managed})" if managed else ""
        raise PublicWithoutAuthError(
            f"Refusing to serve on {host}{where} without authentication.\n"
            "\n"
            "This app displays calibration figures that have NOT cleared the "
            "PROVEN gate. Serving them publicly would publish an unearned "
            "claim (AGENTS.md law 3).\n"
            "\n"
            "Set both GSECAL_AUTH_USER and GSECAL_AUTH_PASS, or bind loopback "
            "with --host 127.0.0.1.\n"
            "\n"
            "If this is a Hugging Face Space: set them as Space SECRETS (not "
            "variables), and set the Space visibility to PRIVATE. Auth alone "
            "makes the page password-gated; it does not make the Space private."
        )

    return LaunchConfig(
        server_name=host,
        server_port=port,
        auth=auth,
        share=False,  # never, in any configuration
        is_public=public,
        managed_host=managed,
    )
