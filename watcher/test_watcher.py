"""Tests for the watcher relay auth — no network, no GUI, no capture hardware.

Run: python -m unittest test_watcher -v   (from this directory)
"""

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).parent))

import watcher as w


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


def make_cfg(**overrides):
    base = dict(
        space_url="https://example.hf.space",
        space_token="space-secret-123",
        ingest_url="https://app.example/api/ops/watch-ingest",
        ingest_secret="cron-secret-456",
    )
    base.update(overrides)
    return w.WatcherConfig(**base)


def relay(cfg):
    """Run process_and_relay against a fake session; return its post calls."""
    session = MagicMock()
    session.post.side_effect = [
        FakeResponse({"game_id": "g1", "n_detections": 3}),
        FakeResponse({"ok": True}),
    ]
    out = w.process_and_relay(cfg, b"fake-jpeg", "g1", 0.0, 1.0, False, session)
    assert out == {"game_id": "g1", "n_detections": 3}
    return session.post.call_args_list


class TestRelayAuth(unittest.TestCase):
    def test_space_post_carries_space_bearer_token(self):
        calls = relay(make_cfg())
        space_call = calls[0]
        self.assertEqual(
            space_call.args[0], "https://example.hf.space/process-frame"
        )
        self.assertEqual(
            space_call.kwargs["headers"],
            {"Authorization": "Bearer space-secret-123"},
        )

    def test_space_token_is_not_the_ingest_secret(self):
        # The two secrets are independent: the Space token must not leak the
        # Vercel CRON_SECRET and vice versa.
        calls = relay(make_cfg())
        space_headers = calls[0].kwargs["headers"]["Authorization"]
        ingest_headers = calls[1].kwargs["headers"]["Authorization"]
        self.assertNotEqual(space_headers, ingest_headers)
        self.assertNotIn("cron-secret-456", space_headers)

    def test_ingest_post_still_carries_ingest_secret(self):
        calls = relay(make_cfg())
        ingest_call = calls[1]
        self.assertEqual(
            ingest_call.args[0], "https://app.example/api/ops/watch-ingest"
        )
        self.assertEqual(
            ingest_call.kwargs["headers"],
            {"Authorization": "Bearer cron-secret-456"},
        )

    def test_config_example_documents_space_token(self):
        data = json.loads(
            (Path(__file__).parent / "config.example.json").read_text()
        )
        self.assertIn("space_token", data)
        # Placeholder, never a real secret.
        self.assertTrue(data["space_token"].startswith("REPLACE-WITH"))

    def test_watcher_config_requires_space_token(self):
        with self.assertRaises(TypeError):
            w.WatcherConfig(
                space_url="https://example.hf.space",
                ingest_url="https://app.example/api/ops/watch-ingest",
                ingest_secret="cron-secret-456",
            )


if __name__ == "__main__":
    unittest.main()
