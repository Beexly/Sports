# Sovereign Voice Watchdog Daemon — spec and verification

Artifacts
* `intelligence/voice_brain/watchdog_daemon.py` (the daemon)
* `intelligence/voice_brain/voice_interface.py` (expanded speech layer)
* Bucket: `docs/engine/research/2026-10-11/` (the machine)

---

## 1. Headline

The daemon runs, speaks through native Windows SAPI, and never blocks the poll
loop while it talks. `--test-voice` caught a **real threading defect** on the
first run, which is the single most useful thing that happened in this build.

```
python intelligence/voice_brain/watchdog_daemon.py --test-voice
→ exit 0
[watchdog]   sapi       : True
[watchdog]   voice [0]  : Microsoft Hazel Desktop - English (Great Britain)
[watchdog]   voice [1]  : Microsoft Zira Desktop - English (United States)
[watchdog]   queued     : True
[watchdog]   return time: 0.0 ms (must be ~0; speech continues on the worker)
[watchdog:test] spoke: Sovereign voice watchdog online...
[watchdog]   spoken     : 1
[watchdog] OK: native SAPI voice alert path verified, non-blocking
```

---

## 2. The defect --test-voice caught

First run, before the fix:

```
[watchdog:test] TTS error (continuing): (-2147221008, 'CoInitialize has not been called.', None, None)
[watchdog]   queued     : True
[watchdog]   spoken     : 0
[watchdog] FAIL: the utterance was never spoken by the worker
```

**COM has no apartment on a fresh thread.** pywin32 initialises COM implicitly on
the thread that imports it, which is why the original `speak()` always worked from
a CLI main thread — and why this bug is invisible until speech moves onto a worker
thread, which is exactly what a non-blocking daemon requires. Every `Dispatch` from
the worker failed, and the failure was swallowed by the existing error handling, so
the daemon would have run indefinitely looking healthy while **never making a
sound**.

The fix is `_co_init()` — `pythoncom.CoInitialize()` on the speaking thread with a
paired `CoUninitialize` in a `finally`.

**Why the test caught it.** The check asserts `spoken_count > 0`, i.e. that the
utterance actually reached SAPI, not merely that it was queued. Had it asserted the
queue succeeded, it would have passed on the broken build. A non-blocking test that
only proves the call returned fast proves nothing about whether audio happened.

---

## 3. Non-blocking design

Two layers, deliberately:

1. **A worker thread** (`SpeechWorker`) drains an unbounded queue. `say()` returns
   as soon as the text is enqueued — measured **0.0 ms** for the enqueue call while
   the utterance takes seconds to speak.
2. **A repeat cooldown** (default 120 s). A watchdog polling every 30 s must not
   repeat itself aloud every cycle; verified in run A below, where 4 poll cycles
   produced exactly 1 announcement.

`--no-audio` turns the same worker into a logger, so a headless or non-Windows host
exercises identical call sites with no COM. `sapi_available()` gates speech
capability and degrades to logging rather than raising.

---

## 4. The four watchers

| Watcher | Source | Trigger |
|---|---|---|
| `git` | `git status --porcelain`, `rev-parse --short HEAD` | changed-file count moved; new commit on the branch |
| `tests` | `--test-cmd` exit code, or the recorded state file | non-zero exit / recorded failure |
| `edge` | `outbox/props_ev_board_latest.json` | grade-worthy row: `>70` confidence or `>10%` EV |
| `games` | ESPN public scoreboard (keyless) | `status.type.state == "post"` |
| `bus` | `C:/Users/Garrett/orca/agent-bus/agent-bus/sports/msg` | new peer message after daemon start |

Every watcher is individually wrapped: a raising watcher logs and the loop
continues. Verified in run C, where a non-existent test command produced a clean
message and exit 0 rather than a traceback.

### Two honest limitations, stated not hidden

**The tests watcher needs a source.** There is no universal test-result file in
this repo, so the daemon does not pretend to detect failures out of nothing. With
no `--test-cmd` and no recorded state it prints
`tests watcher has NO SOURCE ... it will stay silent` at startup and stays quiet.

**The `games` watcher announces only transitions it witnesses.** On its first poll
every already-final game would look like news, so the first pass records them as
seen without speaking. Finals that happened before the daemon started are not
announced — deliberate, because "12 games went final earlier today" is not an alert.

### The edge watcher refuses to announce artifacts

Mission 4 measured that the props board reports **19 of 21 rows at positive EV**
and that **0 of 21 survive the book's own distributional basis** — they are tier C.
A watcher that woke the house for every `ev_pct > 10` row would be reporting a
modelling artifact as news. So the edge watcher requires tier **A or B** by
default, and `--include-unverified` is the explicit opt-in to hear raw threshold
hits. On today's data it is correctly silent and says so once at startup:

```
[watchdog] edge watcher requires tier A or B. Today's props board is all tier C
(0 of 21 edges survive the book's own basis), so it will announce nothing.
Use --include-unverified to hear raw threshold hits.
```

---

## 5. Verification log

**A — edge watcher fires and dedupes** (`--duration 8 --interval 3 --no-audio --include-unverified`):

```
[watchdog] EVENT: New edge. Geno Smith UNDER rush yards, 42.4 percent EV, tier C.
cycle 1 | events 1 | spoken 1
cycle 2 | events 1 | spoken 1
cycle 3 | events 1 | spoken 1
cycle 4 | events 1 | spoken 1
```

Fired exactly once across four polls, and the tier-C label is carried into the
announcement so the artifact is visible in the audio itself.

**B — test-failure detection** (`--test-cmd "python -c 'sys.exit(1)'"`):

```
[watchdog] EVENT: Tests are failing. exit 1
cycle 1 | events 1 | spoken 1 | git=on tests=on edge=on bus=on games=on
```

**C — bad command does not crash:**

```
[watchdog] EVENT: Tests are failing. exit 1 | operable program or batch file.
cycle 1 | events 1 | spoken 1
C_EXIT=0
```

**D — clean startup** (`--once --no-audio`):

```
[watchdog] starting: interval=30.0s watchers=['git', 'tests', 'edge', 'bus', 'games']
[watchdog] tests watcher has NO SOURCE (pass --test-cmd or --record-test-result); it will stay silent
[watchdog] cycle 1 | events 0 | spoken 0 queued 0 | git=on tests=no-source edge=on bus=on games=on
```

**E — voice enumeration:** `voice_interface.py --list-voices` → `[0] Microsoft Hazel
Desktop - English (Great Britain)`, `[1] Microsoft Zira Desktop - English (United
States)`. Exit 0.

No paid API, no network dependency for speech, and nothing leaves the machine.

---

## 6. CLI

```
--announce-edge          announce high-confidence picks / >10% EV (tier A/B required)
--announce-bus           announce new peer-agent bus messages
--interval <seconds>     seconds between poll cycles (default 30)
--test-voice             verify the SAPI path end to end and exit
--duration <seconds>     stop after N seconds (default: until interrupted)
--once                   single cycle and exit
--no-audio               log events instead of speaking (still non-blocking)
--rate / --voice         SAPI speech rate and voice index
--cooldown <seconds>     repeat-suppression window (default 120)
--test-cmd <command>     non-zero exit counts as a test failure
--include-unverified     announce threshold edges that fail the tier gate
--record-test-result     persist a --test-cmd result for the tests watcher
```

Calling the daemon with neither `--announce-edge` nor `--announce-bus` enables
both rather than starting a daemon that can never speak, and says so.

---

## 7. Known limits

* Speech is fire-and-forget; there is no confirmation that a human heard it, only
  that SAPI accepted the utterance.
* `--test-cmd` runs a full test suite in-process per cycle if you point it at one;
  use `--record-test-result` from a cron instead for anything expensive.
* The bus watcher keys on filename and mtime, so a message rewritten in place under
  the same name after the daemon started will be announced once, not twice.
* The `PLAYER_GAME`-style joins and thresholds here are constants, not config; the
  thresholds (`70` / `10%`) are the mission's and are not tuned.

---

## 8. Update 2026-10-12 — the tests watcher now has a source

Section 5's test D recorded `tests watcher has NO SOURCE` — true when written, and
no longer true. A baseline is now recorded on this machine, established with the
daemon's own flag run **from the repo root** (the watcher's poll uses the repo root
as its cwd, so a command that assumes a different directory silently collects
nothing):

```
python intelligence/voice_brain/watchdog_daemon.py --record-test-result \
    --test-cmd "C:/Users/Garrett/AppData/Local/Programs/Python/Python313/python.exe \
                -m pytest intelligence/physics/test_cylindrical_solver.py -o pythonpath=. -q"

[watchdog] recorded test result: passing
.hermes/last_test_result.json -> {"failed": false, "summary": "passing"}
```

The watcher was then proved able to see a failure, not merely a pass, by recording
a deliberate one and restoring the true state:

```
--test-cmd "<python> -c \"import sys; sys.exit(1)\""  -> {"failed": true,  "summary": "Tests are failing. exit 1"}
--test-cmd "<the physics suite>"                      -> {"failed": false, "summary": "passing"}
```

### Two things this caught

**A false failure, from my own first attempt.** The first recording ran the suite
from `intelligence/` with `pythonpath=.`, which cannot resolve
`intelligence.physics.*` — a collection error, recorded as `FAILED`. The watcher was
working correctly; the *command* was wrong. This is the failure mode worth naming:
a recorded state file is only as honest as the command that produced it, and a
false `"failed": true` sitting in it teaches the operator to ignore the daemon.
Re-recorded from the repo root, and the deliberate-failure test above exists so the
negative path is exercised rather than assumed.

**The state file is deliberately untracked.** `.hermes/last_test_result.json` is
runtime state, not source: it goes stale the moment any test run finishes, and a
committed `"failed": true` would make *another* machine's daemon announce a failure
that is not happening there. Each machine establishes its own baseline. Without a
state file the first poll records and stays silent — no news, not invented news.
(A scoped `.hermes/.gitignore` was attempted and blocked by the repo's protected-file
guard; the file is simply left unstaged instead, which is why it appears in
`git status` on a working checkout.)
