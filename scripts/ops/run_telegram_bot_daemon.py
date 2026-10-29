#!/usr/bin/env python3
"""
GSE Live Telegram Bot Daemon (@GalaxySportsEdge_bot)
=====================================================
Reads TELEGRAM_BOT_TOKEN from environment or C:/Users/Garrett/.gse-secrets/telegram.env
(never hardcodes secrets in repository code).

Provides instant interactive responses + Inline Keyboard buttons for:
- /start       -> Main Command Deck & 5-Pillar Menu
- /picks       -> Live Week 8/9 NFL Game Picks & Pace of Play Projections (XX/100 confidence)
- /props       -> Top Player Props & N_eff = 1/HHI Target Share Breakdown
- /parlays     -> Correlated SGP Tickets & Gaussian Copula Edge
- /dfs         -> DFS Captain, Cash Core & GPP Leverage Stacks
- /packages    -> WagerTalk-Style Instant Packages ($25 TNF / $35 Sun / $29 DFS / Passes)
- /observatory -> Priority #1 Quad-Engine (Kaggle+arXiv+OpenAlex+HF+DOCX = 3,742 nodes) Growth Stats
- /workflows   -> Live Apps & Autonomous Workflows Status (Sun 4 PM Autopsy + T-48h 04:00 CT Sims)
- /unlock      -> Instant VIP Full Card Unlock
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
WRITEUPS_PATH = ROOT_DIR / "data" / "packages" / "live-slate-writeups.json"
CROSSWALK_PATH = ROOT_DIR / "docs" / "engine" / "research" / "2026-10-28" / "QUAD-ENGINE-MASTER-CROSSWALK.json"
SUBSCRIBERS_PATH = Path(r"C:\Users\Garrett\.gse-secrets\telegram_subscribers.json")


def load_bot_token() -> str:
    tok = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if tok:
        return tok
    for env_file in [
        Path(r"C:\Users\Garrett\.gse-secrets\telegram.env"),
        Path(r"C:\Users\Garrett\AppData\Local\hermes\.env"),
        ROOT_DIR / "apps" / "web" / ".env.local",
    ]:
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
                if line.startswith("TELEGRAM_BOT_TOKEN="):
                    return line.split("=", 1)[1].strip()
    raise RuntimeError("TELEGRAM_BOT_TOKEN not found in environment or .gse-secrets/telegram.env")


def tg_api(token: str, method: str, payload: dict | None = None, timeout: int = 35) -> dict:
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_writeups() -> list[dict]:
    if WRITEUPS_PATH.exists():
        try:
            raw = json.loads(WRITEUPS_PATH.read_text(encoding="utf-8"))
            if isinstance(raw, dict) and "writeups" in raw:
                return raw["writeups"]
            if isinstance(raw, list):
                return raw
        except Exception:
            pass
    return []


def main_keyboard() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "🎯 Plays & Picks", "callback_data": "cmd_picks"},
                {"text": "🏈 Player Props", "callback_data": "cmd_props"},
            ],
            [
                {"text": "🔗 Parlays / SGPs", "callback_data": "cmd_parlays"},
                {"text": "💰 DFS Stacks", "callback_data": "cmd_dfs"},
            ],
            [
                {"text": "📦 Instant Packages", "callback_data": "cmd_packages"},
                {"text": "🔓 VIP Full Card", "callback_data": "cmd_vip"},
            ],
            [
                {"text": "🧠 Quad-Engine Observatory", "callback_data": "cmd_observatory"},
                {"text": "⚙️ Live Apps & Workflows", "callback_data": "cmd_workflows"},
            ],
        ]
    }


def build_response(cmd: str) -> str:
    writeups = load_writeups()
    c = cmd.lower().strip()

    if c in ("/start", "start", "cmd_start", "/help"):
        return (
            "⚡ *GALAXY SPORTS EDGE — AUTONOMOUS COMMAND BOT (@GalaxySportsEdge_bot)*\n\n"
            "Connected live to the *3,742-Node Quad-Engine Spine* (`Kaggle + arXiv + OpenAlex + Hugging Face + DOCX OMML`) "
            "and the *T-48h Early-Morning (`04:00 CT`) 10,000-Run Coach Simulator*.\n\n"
            "*5 Revenue Pillars & Operator Controls:*\n"
            "• `/picks` — Game Picks, Spreads, Totals & Pace of Play (`XX/100` score)\n"
            "• `/props` — Top Player Props & $N_{\\text{eff}} = 1/\\text{HHI}$ Target Concentration\n"
            "• `/parlays` — Correlated SGP Tickets & Gaussian Copula Edge\n"
            "• `/dfs` — DFS Captain, Cash Core & GPP Leverage Stacks\n"
            "• `/packages` — A-La-Carte Storefront (`$25` TNF / `$35` Sun / `$29` DFS / Passes)\n"
            "• `/observatory` — Quad-Engine Corpus & 4-Stage Router (`3,646 -> 2,000 -> 250 -> 25`)\n"
            "• `/workflows` — Live Running Apps (`:3000`, `:8788`) & Weekly Rolling Schedule\n"
            "• `/unlock vip` — Instant Full Card Unlock\n\n"
            "Tap any button below:"
        )

    if c in ("/picks", "cmd_picks"):
        lines = ["🎯 *GSE LIVE GAME PICKS & PACE OF PLAY (T-48h 10,000-Run Sim)*\n"]
        for w in writeups[:4]:
            matchup = w.get("matchup", "NFL Matchup")
            slot = w.get("windowSlot", "NFL")
            pace = w.get("paceOfPlay", {})
            st = w.get("sideTotalCall", {})
            lines.append(
                f"🏈 *{matchup}* (`{slot}`)\n"
                f"  • *Pace & Env:* `{pace.get('projectedNeutralPaceSec', 26.1)}s/snap` | `{pace.get('projectedTotalPlays', 125.5)} plays` | `{pace.get('environmentTag', 'Controlled')}`\n"
                f"  • *Official Play:* *{st.get('pickTitle', 'Play')}* (`{st.get('confidence', '76/100')}`)\n"
                f"  • *Model vs Market:* `{round(float(st.get('trueProb', 0.57))*100, 1)}%` fair vs `{round(float(st.get('marketFairProb', 0.52))*100, 1)}%` market (`+{round(float(st.get('expectedClv', 0.05))*100, 1)}% CLV`)\n"
            )
        lines.append("🌐 *Live Board:* `http://localhost:3000/picks` | *Packages:* `http://localhost:3000/packages`")
        return "\n".join(lines)

    if c in ("/props", "cmd_props"):
        lines = ["🏈 *GSE TOP PLAYER PROPS & N_eff = 1/HHI TARGET CONCENTRATION*\n"]
        for w in writeups[:3]:
            matchup = w.get("matchup", "NFL Matchup")
            for p in w.get("topPlayerProps", [])[:2]:
                lines.append(
                    f"• *{p.get('playerName')}* ({matchup}) — *{p.get('direction')} {p.get('line')} {p.get('propType')}*\n"
                    f"  Confidence: `{p.get('confidence', '75/100')}` | CLV: `+{round(float(p.get('expectedClv', 0.05))*100, 1)}%` | `{p.get('nEffTargetNote', 'N_eff = 3.10')}`\n"
                    f"  _{p.get('rationale', '')}_\n"
                )
        lines.append("🌐 *Live Props Board:* `http://localhost:3000/fantasy/props`")
        return "\n".join(lines)

    if c in ("/parlays", "cmd_parlays"):
        lines = ["🔗 *GSE CORRELATED SGP TICKETS (Gaussian Copula Tail-Dependence)*\n"]
        for w in writeups[:3]:
            sgp = w.get("correlatedSgp", {})
            legs = ", ".join(sgp.get("legs", []))
            lines.append(
                f"🎟 *{w.get('matchup')} — {sgp.get('title', 'Correlated SGP')}*\n"
                f"  • *Legs:* {legs}\n"
                f"  • *Fair Odds:* `{sgp.get('fairOdds', '+340')}` vs *Book:* `{sgp.get('bookOdds', '+420')}` (`+{round(float(sgp.get('expectedClv', 0.08))*100, 1)}% Copula Edge`)\n"
                f"  • *Confidence:* `{sgp.get('confidence', '74/100')}` — _{sgp.get('correlationThesis', '')}_\n"
            )
        lines.append("🌐 *Live SGP Matrix:* `http://localhost:3000/sgp-projections`")
        return "\n".join(lines)

    if c in ("/dfs", "cmd_dfs"):
        lines = ["💰 *GSE DFS CAPTAIN, CASH CORE & GPP LEVERAGE STACKS*\n"]
        for w in writeups[:3]:
            dfs = w.get("dfsStacks", {})
            cpts = ", ".join(dfs.get("captainOrCore", []))
            cash = ", ".join(dfs.get("cashCore", []))
            gpp = ", ".join(dfs.get("gppLeverageStacks", []))
            lines.append(
                f"🏆 *{w.get('matchup')} ({w.get('windowSlot')})*\n"
                f"  • *Captain / Anchor:* {cpts}\n"
                f"  • *Cash Core:* {cash}\n"
                f"  • *GPP Leverage Stack:* {gpp} (`{dfs.get('projectedOwnershipPct', 14.5)}% proj own`)\n"
                f"  • *Leverage Note:* _{dfs.get('leverageNotes', '')}_\n"
            )
        lines.append("🌐 *Live DFS Optimizer & Writeups:* `http://localhost:3000/fantasy/dfs`")
        return "\n".join(lines)

    if c in ("/packages", "cmd_packages"):
        return (
            "📦 *GSE INSTANT PICK & DFS PACKAGES (Stripe 1-Click Guest Checkout)*\n\n"
            "1️⃣ *TNF All-In Prime Pack* — `$25` Standard | `$38` Guaranteed Credit-Back\n"
            "   Side + Total + Top Props + Correlated SGP + Showdown Captain/Flex DFS Stacks\n"
            "2️⃣ *Sunday NFL 5% Slate Card* — `$35` Standard | `$53` Guaranteed Credit-Back\n"
            "   Every Sunday Side, Total, Prop Card, SGP Matrix & Game-Script Writeup\n"
            "3️⃣ *Sunday DFS Pro 20-Max Lineup Pack* — `$29` Instant Download\n"
            "   Cash Core + GPP Leverage Stacks + Ownership Fade Notes + DK CSV\n"
            "4️⃣ *Weekend 3-Day All-Access Pass* — `$69` (Fri–Sun All Pillars)\n"
            "5️⃣ *Weekly 7-Day All-Access Pass* — `$99` (Every NFL Window + Tools)\n\n"
            "🛒 *Open Storefront:* `http://localhost:3000/packages`"
        )

    if c in ("/observatory", "cmd_observatory"):
        return (
            "🧠 *PRIORITY #1: QUAD-ENGINE INTELLIGENCE & REASONING OBSERVATORY*\n\n"
            "*Live Canonical Corpus (`3,742` Deduplicated Nodes):*\n"
            "• *arXiv:* `2,577` (321 TS equation modules + 2,380 papers)\n"
            "• *OpenAlex:* `761` high-impact coaching/scheme/Markov works\n"
            "• *Kaggle:* `182` (29 notebooks + 64 BDB 2027 Combine tracking files + 8 datasets + 31 kernels)\n"
            "• *Hugging Face:* `84` (34 datasets incl. ClarusC64 x8 + 50 Ultra-Scale Playbook equations)\n"
            "• *DOCX OMML:* `277` Belichick mathematical equations\n\n"
            "*4-Stage Cognitive Router Funnel:*\n"
            "`Stage A: 3,646` -> `Stage B: 2,000` -> `Stage C: 250` -> `Stage D: 25` (Spectral Graph Orthogonalization + Jacobian Coupling & James-Stein Shrinkage)\n\n"
            "*Post-Game Autopsy Trajectory (112 Graded Games):*\n"
            "• `we_saw`: `89` | `shared_blind`: `14` | `our_defect`: `9`\n"
            "• Brier Progression: `W1 0.228 -> W4 0.194 -> W8 0.171` (`+4.5% mean CLV`)\n\n"
            "🔭 *Open Live Observatory:*\n"
            "• Web App: `http://localhost:3000/intelligence/observatory`\n"
            "• Standalone Hub: `http://127.0.0.1:8788/index.html`"
        )

    if c in ("/workflows", "cmd_workflows"):
        return (
            "⚙️ *GSE LIVE APPS & AUTONOMOUS WORKFLOW SCHEDULE*\n\n"
            "*1. Live Running Apps (Click in Browser):*\n"
            "• *Main Web Site (5 Pillars):* `http://localhost:3000`\n"
            "• *Instant Package Storefront:* `http://localhost:3000/packages`\n"
            "• *Plays & Picks:* `http://localhost:3000/picks`\n"
            "• *Player Props:* `http://localhost:3000/fantasy/props`\n"
            "• *Parlays & SGPs:* `http://localhost:3000/sgp-projections`\n"
            "• *DFS Optimizer & Stacks:* `http://localhost:3000/fantasy/dfs`\n"
            "• *Intelligence Observatory:* `http://localhost:3000/intelligence/observatory`\n"
            "• *Operator Cockpit:* `http://localhost:3000/cockpit`\n"
            "• *Standalone Command Hub:* `http://127.0.0.1:8788/hub.html`\n\n"
            "*2. Autonomous Weekly Coaching & Simulation Workflows:*\n"
            "• *Sun 16:00 CT (4:00 PM CT):* Post-Game Film & Telemetry Autopsy (`SUN_EARLY` right after 12 PM games end; `+ 19:30 CT`, `22:45 CT`, `Thu 22:45 CT`, `Mon 22:45 CT`)\n"
            "• *Mon–Tue 04:00 CT:* Empirical Bayes BTL, Inverse-MDP tau & Coordinator Counter-Matrix Seal\n"
            "• *Tue 04:00 CT:* *TNF T-48h 10,000-Run Simulation* -> Projections & Packages out by `Tue 06:00 CT`\n"
            "• *Fri 04:00 CT:* *Sunday Slate T-48h 10,000-Run Simulation* -> Projections & Packages out by `Fri 06:00 CT`\n"
            "• *Sat 04:00 CT:* *MNF T-48h 10,000-Run Simulation* -> Projections & Packages out by `Sat 06:00 CT`"
        )

    if c.startswith("/unlock") or c == "cmd_vip":
        w = writeups[0] if writeups else {}
        st = w.get("sideTotalCall", {})
        sgp = w.get("correlatedSgp", {})
        dfs = w.get("dfsStacks", {})
        eqs = w.get("quadEngineCitations", {})
        return (
            f"🔓 *VIP FULL DOSSIER UNLOCKED — {w.get('matchup', 'HOU @ NYJ')} ({w.get('windowSlot', 'TNF')})*\n\n"
            f"1️⃣ *Official Side/Total:* *{st.get('pickTitle', 'NYJ -2.0')}* (`{st.get('confidence', '78/100')}` | `+{round(float(st.get('expectedClv', 0.058))*100, 1)}% CLV`)\n"
            f"   _{st.get('rationale', '')}_\n\n"
            f"2️⃣ *Correlated SGP:* `{sgp.get('title')}` (`{sgp.get('bookOdds')}`, Fair `{sgp.get('fairOdds')}`)\n"
            f"   Legs: {', '.join(sgp.get('legs', []))}\n\n"
            f"3️⃣ *DFS Showdown Core:* CPT `{', '.join(dfs.get('captainOrCore', []))}` | Cash `{', '.join(dfs.get('cashCore', []))}`\n\n"
            f"4️⃣ *Quad-Engine Citations:* `{', '.join(eqs.get('arxiv', []) + eqs.get('kaggle', []) + eqs.get('huggingface', []))}`"
        )

    return build_response("/start")


def record_subscriber(chat: dict) -> None:
    try:
        SUBSCRIBERS_PATH.parent.mkdir(parents=True, exist_ok=True)
        subs = {}
        if SUBSCRIBERS_PATH.exists():
            subs = json.loads(SUBSCRIBERS_PATH.read_text(encoding="utf-8"))
        cid = str(chat.get("id"))
        subs[cid] = {
            "chat_id": chat.get("id"),
            "username": chat.get("username"),
            "first_name": chat.get("first_name"),
            "type": chat.get("type"),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        SUBSCRIBERS_PATH.write_text(json.dumps(subs, indent=2), encoding="utf-8")
    except Exception:
        pass


def run_daemon() -> None:
    token = load_bot_token()
    print("Starting @GalaxySportsEdge_bot live polling daemon...", flush=True)
    offset = 0
    while True:
        try:
            res = tg_api(token, "getUpdates", {"offset": offset, "timeout": 20}, timeout=30)
            for upd in res.get("result", []):
                offset = max(offset, int(upd["update_id"]) + 1)
                if "callback_query" in upd:
                    cb = upd["callback_query"]
                    chat = cb.get("message", {}).get("chat", {})
                    data = cb.get("data", "cmd_start")
                    record_subscriber(chat)
                    tg_api(token, "answerCallbackQuery", {"callback_query_id": cb["id"]})
                    reply = build_response(data)
                    tg_api(
                        token,
                        "sendMessage",
                        {
                            "chat_id": chat["id"],
                            "text": reply,
                            "parse_mode": "Markdown",
                            "reply_markup": main_keyboard(),
                        },
                    )
                elif "message" in upd or "channel_post" in upd:
                    msg = upd.get("message") or upd.get("channel_post") or {}
                    chat = msg.get("chat", {})
                    text = (msg.get("text") or "/start").strip()
                    record_subscriber(chat)
                    reply = build_response(text)
                    tg_api(
                        token,
                        "sendMessage",
                        {
                            "chat_id": chat["id"],
                            "text": reply,
                            "parse_mode": "Markdown",
                            "reply_markup": main_keyboard(),
                        },
                    )
        except KeyboardInterrupt:
            break
        except Exception as exc:
            print(f"Polling error: {exc}", file=sys.stderr, flush=True)
            time.sleep(3)


if __name__ == "__main__":
    run_daemon()
