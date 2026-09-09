"""
Launch policy tests.

This module is the only thing standing between an unpublished calibration
figure and a public URL, so the matrix is covered exhaustively rather than
sampled. Every case that could plausibly reach the internet is asserted to
raise.
"""

from __future__ import annotations

import unittest

from gsecal.serve import (
    LOOPBACK_HOSTS,
    PublicWithoutAuthError,
    detect_managed_host,
    is_loopback,
    resolve_launch_config,
)

AUTH = {"GSECAL_AUTH_USER": "operator", "GSECAL_AUTH_PASS": "secret"}


class TestLoopbackDetection(unittest.TestCase):
    def test_known_loopback_hosts(self) -> None:
        for host in LOOPBACK_HOSTS:
            self.assertTrue(is_loopback(host), host)

    def test_case_and_whitespace_insensitive(self) -> None:
        self.assertTrue(is_loopback("  LocalHost "))

    def test_public_hosts_are_not_loopback(self) -> None:
        for host in ("0.0.0.0", "192.168.1.5", "10.0.0.1", "example.com", "", None):
            self.assertFalse(is_loopback(host), host)


class TestManagedHostDetection(unittest.TestCase):
    def test_detects_each_platform(self) -> None:
        cases = {
            "SPACE_ID": "Hugging Face Spaces",
            "SPACE_HOST": "Hugging Face Spaces",
            "K_SERVICE": "Knative / Cloud Run",
            "KUBERNETES_SERVICE_HOST": "Kubernetes (e.g. Akamai LKE)",
        }
        for key, label in cases.items():
            self.assertEqual(detect_managed_host({key: "set"}), label, key)

    def test_no_managed_host_by_default(self) -> None:
        self.assertIsNone(detect_managed_host({}))

    def test_empty_value_does_not_count(self) -> None:
        self.assertIsNone(detect_managed_host({"SPACE_ID": ""}))


class TestPolicyRefusals(unittest.TestCase):
    """Everything here MUST raise. A pass that should have raised is a leak."""

    def test_explicit_public_bind_without_auth(self) -> None:
        for host in ("0.0.0.0", "192.168.1.5", "example.com"):
            with self.subTest(host=host), self.assertRaises(PublicWithoutAuthError):
                resolve_launch_config(host=host, env={})

    def test_managed_host_without_auth(self) -> None:
        for key in ("SPACE_ID", "K_SERVICE", "KUBERNETES_SERVICE_HOST"):
            with self.subTest(key=key), self.assertRaises(PublicWithoutAuthError):
                resolve_launch_config(env={key: "set"})

    def test_managed_host_cannot_be_talked_down_to_loopback(self) -> None:
        """A Space asking for 127.0.0.1 is still public — the platform decides."""
        with self.assertRaises(PublicWithoutAuthError):
            resolve_launch_config(host="127.0.0.1", env={"SPACE_ID": "x"})

    def test_partial_credentials_are_not_credentials(self) -> None:
        for env in (
            {"GSECAL_AUTH_USER": "u"},
            {"GSECAL_AUTH_PASS": "p"},
            {"GSECAL_AUTH_USER": "", "GSECAL_AUTH_PASS": "p"},
            {"GSECAL_AUTH_USER": "u", "GSECAL_AUTH_PASS": ""},
            {"GSECAL_AUTH_USER": "   ", "GSECAL_AUTH_PASS": "p"},
        ):
            with self.subTest(env=env), self.assertRaises(PublicWithoutAuthError):
                resolve_launch_config(host="0.0.0.0", env=env)

    def test_refusal_explains_the_fix_and_the_spaces_trap(self) -> None:
        with self.assertRaises(PublicWithoutAuthError) as ctx:
            resolve_launch_config(env={"SPACE_ID": "x"})
        message = str(ctx.exception)
        self.assertIn("GSECAL_AUTH_USER", message)
        self.assertIn("PRIVATE", message)
        self.assertIn("law 3", message)


class TestPolicyAllows(unittest.TestCase):
    def test_loopback_without_auth(self) -> None:
        config = resolve_launch_config(env={})
        self.assertEqual(config.server_name, "127.0.0.1")
        self.assertFalse(config.is_public)
        self.assertIsNone(config.auth)

    def test_loopback_with_auth_keeps_the_auth(self) -> None:
        self.assertEqual(resolve_launch_config(env=dict(AUTH)).auth, ("operator", "secret"))

    def test_public_with_auth(self) -> None:
        config = resolve_launch_config(host="0.0.0.0", env=dict(AUTH))
        self.assertTrue(config.is_public)
        self.assertEqual(config.auth, ("operator", "secret"))

    def test_managed_host_with_auth_binds_all_interfaces(self) -> None:
        config = resolve_launch_config(env={**AUTH, "SPACE_ID": "x"})
        self.assertEqual(config.server_name, "0.0.0.0")
        self.assertEqual(config.managed_host, "Hugging Face Spaces")

    def test_port_is_honoured(self) -> None:
        self.assertEqual(resolve_launch_config(port=1234, env={}).server_port, 1234)


class TestShareIsAlwaysOff(unittest.TestCase):
    """No configuration, on any platform, may enable public tunnelling."""

    def test_share_false_in_every_reachable_configuration(self) -> None:
        configs = [
            resolve_launch_config(env={}),
            resolve_launch_config(env=dict(AUTH)),
            resolve_launch_config(host="0.0.0.0", env=dict(AUTH)),
            resolve_launch_config(env={**AUTH, "SPACE_ID": "x"}),
            resolve_launch_config(env={**AUTH, "KUBERNETES_SERVICE_HOST": "x"}),
        ]
        for config in configs:
            self.assertFalse(config.share)

    def test_gradio_share_env_cannot_turn_it_on(self) -> None:
        config = resolve_launch_config(env={**AUTH, "GRADIO_SHARE": "True"})
        self.assertFalse(config.share)


class TestNoCredentialsInCode(unittest.TestCase):
    def test_no_default_username_or_password_exists(self) -> None:
        """There must be no built-in credential to discover (law 4)."""
        self.assertIsNone(resolve_launch_config(env={}).auth)
        import inspect

        import gsecal.serve as serve

        source = inspect.getsource(serve)
        for forbidden in ("password =", 'password="', "admin", "gsecal123"):
            self.assertNotIn(f'"{forbidden}"', source)


if __name__ == "__main__":
    unittest.main()
