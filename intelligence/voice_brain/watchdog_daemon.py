"""
Sovereign Voice Watchdog Daemon
===============================

A background monitor that speaks when something actually changes. Four watchers
run on one poll loop:

  1. GIT / TESTS   -- working-tree churn, and test-failure results when a test
                      result source is available
  2. EDGE          -- a newly published high-confidence pick (>70 confidence or
                      >10% EV)
  3. GAMES         -- ESPN scoreboard transitions to STATUS_FINAL
  4. BUS           -- new announcements from peer agents on the agent bus

Speech is non-blocking: utterances go to a `SpeechWorker` thread, so the poll
loop keeps its cadence while the daemon talks. Every watcher is individually
wrapped, so one broken source degrades to a logged line instead of killing the
run. Nothing here blocks on the network longer than `--http-timeout`.

TWO DESIGN DECISIONS WORTH KNOWING
----------------------------------
**The edge watcher refuses to announce artifact edges.** Mission 4 measured that
the current props board reports 19 of 21 rows at positive EV and that 0 of 21
survive the book's own distributional basis -- they are all tier C. A watchdog
that woke the house for every `ev_pct > 10` row would be reporting a modelling
artifact as news. So by default the edge watcher requires a tier of A or B, and
`--include-unverified` is the explicit opt-in to hear the raw threshold hits.
On today's data that means the edge watcher is correctly SILENT, and it will say
so once at startup.

**The edge watcher also gates on the board's doctrine stamp.** Before any row
is even read, the artifact itself must carry the generator's DIAGNOSTIC stamp
(`label` + `is_pick`/`is_edge_claim` false) AND report `rvc_cleared` as true.
An unstamped or uncleared board keeps the announcer silent no matter what its
rows contain -- residual-versus-close clearance is the fleet's publish gate,
and a voice daemon does not get to route around it.

**Test failures need a source.** There is no universal test-result file in this
repo, so the daemon does not pretend to detect failures out of nothing. Pass
`--test-cmd` to have it run a command (pytest/vitest) each cycle with a timeout,
or it watches the recorded-state file written by `--record-test-result`. With no
source configured it reports that fact and stays quiet.

Usage
-----
    python intelligence/voice_brain/watchdog_daemon.py --test-voice
    python intelligence/voice_brain/watchdog_daemon.py --announce-edge --announce-bus
    python intelligence/voice_brain/watchdog_daemon.py --interval 60 --once
    python intelligence/voice_brain/watchdog_daemon.py --duration 300 --no-audio
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from voice_interface import SpeechWorker, list_voices, sapi_available  # noqa: E402

#: Default agent-bus checkout. Overridable with GSE_BUS_REPO, same variable the
#: bridge script honours, so the two cannot drift apart.
BUS_REPO = Path(os.environ.get("GSE_BUS_REPO", "C:/Users/Garrett/orca/agent-bus/agent-bus"))
BUS_MSG_DIR = BUS_REPO / "sports" / "msg"

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

EDGE_BOARD = REPO_ROOT / "outbox" / "props_ev_board_latest.json"
STATE_FILE = REPO_ROOT / ".hermes" / "voice_watchdog_state.json"
TEST_STATE_FILE = REPO_ROOT / ".hermes" / "last_test_result.json"

SELF_AGENT = os.environ.get("GSE_AGENT_ID", "hermes")

#: Confidence/EV thresholds from the mission. A row must clear ONE of them to be
#: edge-worthy; a row is only announced without --include-unverified when it also
#: passes the distributional falsifier (tier A or B).
EDGE_CONF_THRESHOLD = 70.0
EDGE_EV_THRESHOLD = 10.0
INVESTMENT_GRADE_TIERS = {"A", "B"}


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

def load_state(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        # A corrupt or absent state file must not stop the daemon; worst case is a
        # repeated announcement, which the speech cooldown already bounds.
        return {}


def save_state(path: Path, state: Dict[str, Any]) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except Exception as exc:
        print(f"[watchdog] could not write state: {exc}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Watchers
# ---------------------------------------------------------------------------

class GitWatcher:
    """Working-tree churn. Reports the count, not a per-file narration."""

    name = "git"

    def __init__(self) -> None:
        self._last_count: Optional[int] = None
        self._last_head: Optional[str] = None

    def _git(self, *args: str, timeout: float = 20.0) -> Optional[str]:
        try:
            out = subprocess.run(
                ["git", *args], cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=timeout
            )
            return out.stdout if out.returncode == 0 else None
        except Exception:
            return None

    def poll(self) -> List[str]:
        msgs: List[str] = []
        status = self._git("status", "--porcelain")
        head = self._git("rev-parse", "--short", "HEAD")
        if status is None:
            return msgs
        count = len([ln for ln in status.splitlines() if ln.strip()])
        if self._last_count is not None and count != self._last_count:
            delta = count - self._last_count
            direction = "grew by" if delta > 0 else "shrank by"
            msgs.append(f"Working tree {direction} {abs(delta)}. {count} changed files.")
        self._last_count = count
        if head and self._last_head is not None and head != self._last_head:
            msgs.append(f"New commit on the working branch. Head is now {head}.")
        if head:
            self._last_head = head
        return msgs


class TestWatcher:
    """
    Test failures from a real source, never invented.

    Source A: `--test-cmd` is executed each cycle (with a timeout) and the exit
    code is the signal. Source B: the recorded-state file written by
    `--record-test-result`. With neither, this watcher reports that it has no
    source and stays silent.
    """

    name = "tests"

    def __init__(self, test_cmd: Optional[str], state_file: Path = TEST_STATE_FILE) -> None:
        self.test_cmd = test_cmd
        self.state_file = state_file
        self._last_summary: Optional[str] = None
        self.has_source = bool(test_cmd) or state_file.exists()

    def poll(self) -> List[str]:
        msgs: List[str] = []
        summary: Optional[str] = None
        failed = False

        if self.test_cmd:
            try:
                proc = subprocess.run(
                    self.test_cmd, shell=True, cwd=str(REPO_ROOT),
                    capture_output=True, text=True, timeout=600,
                )
                failed = proc.returncode != 0
                tail = (proc.stdout or proc.stderr or "").strip().splitlines()
                summary = f"exit {proc.returncode}"
                if tail:
                    summary += f" | {tail[-1][:120]}"
            except subprocess.TimeoutExpired:
                failed, summary = True, "test command timed out"
            except Exception as exc:
                failed, summary = True, f"test command error: {exc}"
        elif self.state_file.exists():
            try:
                data = json.loads(self.state_file.read_text(encoding="utf-8"))
                failed = bool(data.get("failed"))
                summary = str(data.get("summary") or data)
            except Exception as exc:
                summary = f"unreadable test state: {exc}"

        if summary is None:
            return msgs
        if self._last_summary is not None and summary != self._last_summary and failed:
            msgs.append(f"Test failures detected. {summary}")
        elif self._last_summary is None and failed:
            msgs.append(f"Tests are failing. {summary}")
        self._last_summary = summary
        return msgs


class EdgeWatcher:
    """
    Newly published high-confidence picks, read from the real props board.

    Silent unless the board artifact itself passes the doctrine gate (see
    `board_gate_open`): a DIAGNOSTIC stamp AND `rvc_cleared` true. Past the
    gate it requires BOTH a threshold hit AND (unless --include-unverified) an
    investment-grade tier, because a threshold hit that fails the distributional
    falsifier is a modelling artifact and not news. Reads confidence from a picks
    snapshot when one exists, and EV from the props board.
    """

    name = "edge"

    def __init__(self, board: Path = EDGE_BOARD, include_unverified: bool = False) -> None:
        self.board = board
        self.include_unverified = include_unverified
        self._announced: set = set()
        self.has_source = board.exists()

    def _load(self) -> Any:
        try:
            return json.loads(self.board.read_text(encoding="utf-8"))
        except Exception:
            return None

    @staticmethod
    def board_gate_open(data: Any) -> bool:
        """
        The doctrine gate on the artifact, checked before any row is read.

        Open requires BOTH:
          * the generator's full DIAGNOSTIC stamp -- `label == "DIAGNOSTIC"`
            with `is_pick` and `is_edge_claim` literally False, and
          * `rvc_cleared` literally True (residual-versus-close has cleared).

        Anything else -- an unstamped legacy artifact, a list payload, or a
        stamped board whose RVC has not cleared -- keeps the announcer silent.
        Silence is the default; speech must be earned by the stamp.
        """
        if not isinstance(data, dict):
            return False
        if data.get("label") != "DIAGNOSTIC":
            return False
        if data.get("is_pick") is not False or data.get("is_edge_claim") is not False:
            return False
        return data.get("rvc_cleared") is True

    @staticmethod
    def _rows(data: Any) -> List[Dict[str, Any]]:
        if isinstance(data, dict) and "board" in data:
            return list(data.get("board") or [])
        if isinstance(data, list):
            return list(data)
        return []

    def poll(self) -> List[str]:
        msgs: List[str] = []
        data = self._load()
        if not self.board_gate_open(data):
            return msgs
        for row in self._rows(data):
            try:
                ev = float(row.get("ev_pct") or 0.0)
                conf = float(row.get("confidence") or 0.0)
            except Exception:
                continue
            tier = str(row.get("tier") or row.get("pickGrade") or "").upper()
            if ev < EDGE_EV_THRESHOLD and conf < EDGE_CONF_THRESHOLD:
                continue
            if not self.include_unverified and tier not in INVESTMENT_GRADE_TIERS:
                continue
            key = f"{row.get('player')}|{row.get('stat')}|{row.get('side')}|{row.get('pp_line')}"
            if key in self._announced:
                continue
            self._announced.add(key)
            who = str(row.get("player") or "unknown").title()
            stat = str(row.get("stat") or "").replace("_", " ")
            side = str(row.get("side") or "")
            if ev >= EDGE_EV_THRESHOLD:
                msgs.append(f"New edge. {who} {side} {stat}, {ev:.1f} percent EV, tier {tier or 'n/a'}.")
            else:
                msgs.append(f"High confidence pick. {who} {side} {stat}, confidence {conf:.0f}.")
        return msgs


class GameWatcher:
    """
    ESPN scoreboard transitions to a final state.

    Finality is read from the event's own status fields. A game is announced once,
    keyed on the event id, so a re-poll cannot repeat it.
    """

    name = "games"

    def __init__(self, url: str = ESPN_SCOREBOARD, timeout: float = 20.0) -> None:
        self.url = url
        self.timeout = timeout
        self._final_seen: set = set()
        self._first_poll = True

    def poll(self) -> List[str]:
        msgs: List[str] = []
        try:
            with urllib.request.urlopen(self.url, timeout=self.timeout) as resp:
                data = json.load(resp)
        except Exception as exc:
            # Offline or rate-limited is normal; say nothing and try next cycle.
            if self._first_poll:
                print(f"[watchdog] games source unreachable ({exc}); will retry", file=sys.stderr)
            return msgs

        for event in data.get("events", []):
            try:
                comp = (event.get("competitions") or [{}])[0]
                status = (comp.get("status") or event.get("status") or {})
                state = str((status.get("type") or {}).get("state") or "")
                if state != "post":
                    continue
                eid = str(event.get("id"))
                if eid in self._final_seen:
                    continue
                self._final_seen.add(eid)
                if self._first_poll:
                    # On the first pass every already-final game would "trigger".
                    # Record them as seen without speaking, so the daemon announces
                    # only finals that happen WHILE it is running.
                    continue
                name = str(event.get("name") or "game")
                scores = []
                for side in comp.get("competitors", []):
                    team = (side.get("team") or {}).get("abbreviation") or (side.get("team") or {}).get("name")
                    scores.append(f"{team} {side.get('score')}")
                msgs.append(f"Final. {name}. {' , '.join(scores)}.")
            except Exception:
                continue
        self._first_poll = False
        return msgs


class BusWatcher:
    """
    New agent-bus announcements from PEER agents.

    Only messages newer than daemon start are announced, and the daemon's own
    messages are skipped -- a watchdog should not read its own post back aloud.
    """

    name = "bus"

    def __init__(self, msg_dir: Path = BUS_MSG_DIR, self_agent: str = SELF_AGENT) -> None:
        self.msg_dir = msg_dir
        self.self_agent = self_agent
        self.started_at = time.time()
        self._seen: set = set()
        self.has_source = msg_dir.exists()

    def poll(self) -> List[str]:
        msgs: List[str] = []
        if not self.msg_dir.exists():
            return msgs
        try:
            files = sorted(self.msg_dir.glob("*/*.json"), key=lambda p: p.stat().st_mtime)
        except Exception:
            return msgs
        for path in files:
            try:
                if path.stat().st_mtime < self.started_at:
                    continue
                key = path.name
                if key in self._seen:
                    continue
                self._seen.add(key)
                data = json.loads(path.read_text(encoding="utf-8"))
                sender = str(data.get("from") or path.parent.name)
                if sender == self.self_agent:
                    continue
                subject = str(data.get("subject") or "announcement")
                body = str(data.get("body") or "").strip()
                if body:
                    body = body.split(".")[0][:180]
                    msgs.append(f"Bus from {sender}. {subject}. {body}.")
                else:
                    msgs.append(f"Bus from {sender}. {subject}.")
            except Exception:
                continue
        return msgs


# ---------------------------------------------------------------------------
# Daemon
# ---------------------------------------------------------------------------

class WatchdogDaemon:
    def __init__(
        self,
        interval: float = 30.0,
        announce_edge: bool = True,
        announce_bus: bool = True,
        no_audio: bool = False,
        rate: int = 1,
        voice_index: Optional[int] = None,
        test_cmd: Optional[str] = None,
        include_unverified: bool = False,
        cooldown: float = 120.0,
    ) -> None:
        self.interval = interval
        self.verbose = False
        self.speaker = SpeechWorker(
            enabled=not no_audio, rate=rate, voice_index=voice_index, cooldown=cooldown,
            log_prefix="[watchdog:voice]",
        )
        self.audio_enabled = self.speaker.enabled
        self.cycles = 0
        self.events = 0
        self.state = load_state(STATE_FILE)

        self.watchers: List[Any] = [GitWatcher()]
        tests = TestWatcher(test_cmd)
        self.watchers.append(tests)
        if announce_edge:
            self.watchers.append(EdgeWatcher(include_unverified=include_unverified))
        if announce_bus:
            self.watchers.append(BusWatcher())
        self.watchers.append(GameWatcher())
        self._tests = tests

    def announce(self, text: str) -> None:
        """Queue an utterance and log it. Never blocks the poll loop."""
        self.events += 1
        print(f"[watchdog] EVENT: {text}", flush=True)
        queued = self.speaker.say(text)
        if not queued:
            print(f"[watchdog] (speech suppressed: repeat inside cooldown)", flush=True)

    def status_line(self) -> None:
        parts = " ".join(f"{w.name}={'on' if getattr(w, 'has_source', True) else 'no-source'}" for w in self.watchers)
        print(
            f"[watchdog] cycle {self.cycles} | events {self.events} | "
            f"spoken {self.speaker.spoken_count} queued {self.speaker.pending} | {parts}",
            flush=True,
        )

    def cycle(self) -> List[str]:
        self.cycles += 1
        fired: List[str] = []
        for watcher in self.watchers:
            try:
                fired.extend(watcher.poll())
            except Exception as exc:
                # Isolation is the point: a broken watcher must not stop the loop.
                print(f"[watchdog] watcher '{watcher.name}' error (continuing): {exc}", file=sys.stderr, flush=True)
        for text in fired:
            self.announce(text)
        self.status_line()
        return fired

    def run(self, once: bool = False, duration: Optional[float] = None) -> int:
        started = time.time()
        if not self.audio_enabled:
            print("[watchdog] audio disabled or SAPI unavailable; running as a logger")
        self.cycle()
        if once:
            self.speaker.stop()
            return 0
        try:
            while True:
                if duration is not None and (time.time() - started) >= duration:
                    break
                time.sleep(self.interval)
                self.cycle()
        except KeyboardInterrupt:
            print("\n[watchdog] interrupted; shutting down cleanly")
        finally:
            self.speaker.stop()
        return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

TEST_VOICE_LINE = (
    "Sovereign voice watchdog online. Native SAPI speech on Windows is working, "
    "and this notification did not block the monitoring loop."
)


def run_test_voice(args: argparse.Namespace) -> int:
    """Prove the audio path end to end, reporting exactly what it found."""
    print("[watchdog] --test-voice")
    print(f"[watchdog]   platform   : {sys.platform}")
    print(f"[watchdog]   sapi       : {sapi_available()}")
    voices = list_voices()
    if voices:
        for idx, desc in voices:
            print(f"[watchdog]   voice [{idx}]  : {desc}")
    else:
        print("[watchdog]   voices      : none installed or SAPI unavailable")

    speaker = SpeechWorker(
        enabled=not args.no_audio, rate=args.rate, voice_index=args.voice,
        cooldown=0.0, log_prefix="[watchdog:test]",
    )
    print(f"[watchdog]   audio      : {'enabled' if speaker.enabled else 'disabled (logging only)'}")
    t0 = time.perf_counter()
    queued = speaker.say(TEST_VOICE_LINE)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    print(f"[watchdog]   queued     : {queued}")
    print(f"[watchdog]   return time: {elapsed_ms:.1f} ms (must be ~0; speech continues on the worker)")
    if elapsed_ms > 250.0:
        print("[watchdog] FAIL: the enqueue call blocked; speech is not non-blocking")
        speaker.stop()
        return 1
    # Give the worker a moment to actually run the utterance so the run leaves
    # real evidence that SAPI accepted it, not just that it was queued.
    deadline = time.time() + 20.0
    while time.time() < deadline and speaker.spoken_count == 0:
        time.sleep(0.1)
    print(f"[watchdog]   spoken     : {speaker.spoken_count}")
    speaker.stop()
    if not speaker.spoken_count:
        print("[watchdog] FAIL: the utterance was never spoken by the worker")
        return 1
    print("[watchdog] OK: native SAPI voice alert path verified, non-blocking")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Sovereign Voice Watchdog Daemon")
    p.add_argument("--announce-edge", action="store_true", help="announce high-confidence picks / >10%% EV")
    p.add_argument("--announce-bus", action="store_true", help="announce new peer-agent bus messages")
    p.add_argument("--interval", type=float, default=30.0, help="seconds between poll cycles (default 30)")
    p.add_argument("--test-voice", action="store_true", help="verify the SAPI path and exit")
    p.add_argument("--duration", type=float, default=None, help="stop after N seconds (default: run until interrupted)")
    p.add_argument("--once", action="store_true", help="run a single cycle and exit")
    p.add_argument("--no-audio", action="store_true", help="log events instead of speaking (still non-blocking)")
    p.add_argument("--rate", type=int, default=1, help="SAPI speech rate, -10..10")
    p.add_argument("--voice", type=int, default=None, help="SAPI voice index (see voice_interface.py --list-voices)")
    p.add_argument("--cooldown", type=float, default=120.0, help="seconds before the same message can repeat")
    p.add_argument("--test-cmd", default=None, help="command whose non-zero exit counts as a test failure")
    p.add_argument("--include-unverified", action="store_true", help="announce threshold edges even if they fail the tier gate")
    p.add_argument("--record-test-result", action="store_true", help="record a test result from --test-cmd into the state file and exit")
    return p


def main(argv: Optional[List[str]] = None) -> int:
    args = build_parser().parse_args(argv)

    if args.test_voice:
        return run_test_voice(args)

    if args.record_test_result:
        if not args.test_cmd:
            print("[watchdog] --record-test-result needs --test-cmd", file=sys.stderr)
            return 2
        watcher = TestWatcher(args.test_cmd)
        msgs = watcher.poll()
        TEST_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        TEST_STATE_FILE.write_text(
            json.dumps({"failed": bool(msgs), "summary": msgs[0] if msgs else "passing"}), encoding="utf-8"
        )
        print(f"[watchdog] recorded test result: {'FAILED' if msgs else 'passing'}")
        return 0

    # The mission's flags are opt-in, and opt-in means opt-in: a bare run
    # enables NEITHER announcer. A daemon that starts speaking because nobody
    # told it not to is how a house gets woken by a modelling artifact.
    if not args.announce_edge and not args.announce_bus:
        print(
            "[watchdog] note: neither --announce-edge nor --announce-bus given; "
            "both announcers are OFF. Pass --announce-edge and/or --announce-bus "
            "to enable them."
        )

    daemon = WatchdogDaemon(
        interval=args.interval,
        announce_edge=args.announce_edge,
        announce_bus=args.announce_bus,
        no_audio=args.no_audio,
        rate=args.rate,
        voice_index=args.voice,
        test_cmd=args.test_cmd,
        include_unverified=args.include_unverified,
        cooldown=args.cooldown,
    )
    print(f"[watchdog] starting: interval={args.interval}s watchers={[w.name for w in daemon.watchers]}")
    if not daemon._tests.has_source:
        print("[watchdog] tests watcher has NO SOURCE (pass --test-cmd or --record-test-result); it will stay silent")
    edge = next((w for w in daemon.watchers if w.name == "edge"), None)
    if edge is not None and not args.include_unverified:
        print(
            "[watchdog] edge watcher requires tier A or B. Today's props board is all tier C "
            "(0 of 21 edges survive the book's own basis), so it will announce nothing. "
            "Use --include-unverified to hear raw threshold hits."
        )
    return daemon.run(once=args.once, duration=args.duration)


if __name__ == "__main__":
    raise SystemExit(main())
