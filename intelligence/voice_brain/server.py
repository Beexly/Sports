#!/usr/bin/env python3
"""Sovereign Conversational Terminal & Voice Bridge for Galaxy Sports Edge.

Enables Garrett to speak directly to the engine without repetitive context-setting,
cost bleed, or third-party web UI fragmentation.

Usage:
  python -m intelligence.voice_brain.server
  python -m intelligence.voice_brain.server "Give me the consensus edge on tonight's slate"
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from intelligence.voice_brain.memory import BrainMemory
from intelligence.voice_brain.router import ModelRouter

SYSTEM_PROMPT = """You are the Sovereign Brain of Galaxy Sports Edge (GSE) and Beexly.
You are Garrett Baxley's personal AI reasoning partner, co-strategist, and system engine.

CORE IMMUTABLE REALITY:
1. BUDGET: Garrett has a $20/mo Claude subscription. Wasteful token spending is forbidden. You operate efficiently using free/expanded Google AI limits (Gemini 2.5 Flash/Pro), Colab GPU units, Neon serverless infrastructure, and local execution.
2. DOCTRINES:
   - DIRECT-TO-MIND: Nothing stays local-only. Results land on the remote branch or agent bus.
   - REASONING DOCTRINE: The closing line is the sharpest number on earth. We do not pretend a simplistic equation beats it. Edge lives in: (1) Situations models miss (1-3 pts/spot), (2) Timing before the market move (1-2% CLV), (3) SGP correlation mispricing, (4) Pass discipline. Output = market base + hyper-intelligent reasoning overlay.
   - WIRE-FIRST: research -> wire -> weight -> calibrate -> test -> polish.
3. CONVERSATIONAL IDENTITY:
   - You speak directly, concisely, and with elite technical depth.
   - You know Garrett's entire system: the 8 rating systems (Colley, Massey, SRS, PageRank, Keener, Glicko-2, TrueSkill, Plackett-Luce), Conformal Prediction, Kelly covariance, Navier-Stokes trajectory mechanics, and the fleet (Motif, Orca, Hermes).
   - When Garrett speaks to you, you immediately understand without him repeating himself.
"""


class SovereignBrainServer:
    def __init__(self, session_id: str = "garrett_master_session"):
        self.session_id = session_id
        self.memory = BrainMemory()
        self.router = ModelRouter()

    def process_input(self, user_text: str) -> str:
        text = user_text.strip()
        if not text:
            return ""

        # Check for direct engine commands
        if text.startswith("/status"):
            facts = self.memory.get_all_facts()
            return f"Brain Status: Operational\nKnown Facts in Memory: {len(facts)}\nSession: {self.session_id}"
        elif text.startswith("/facts"):
            facts = self.memory.get_all_facts()
            lines = [f"- **[{f['domain']}] {f['key']}**: {f['value']}" for f in facts]
            return "\n".join(lines)
        elif text.startswith("/teach "):
            # e.g. /teach key: value
            parts = text[7:].split(":", 1)
            if len(parts) == 2:
                k, v = parts[0].strip(), parts[1].strip()
                self.memory.upsert_fact(k, v, domain="user_taught", source="garrett_direct")
                return f"Learned and locked into permanent memory: [{k}] -> {v}"
            return "Usage: /teach key: value"

        # Search relevant memory facts for context augmentation
        matched_facts = self.memory.search_facts(text, limit=4)
        context_block = ""
        if matched_facts:
            context_block = "\nRELEVANT RECALLED CONTEXT:\n" + "\n".join(
                f"- {f['key']}: {f['value']}" for f in matched_facts
            )

        history = self.memory.get_recent_history(self.session_id, limit=6)
        system_instruction = f"{SYSTEM_PROMPT}\n{context_block}"

        t0 = time.time()
        reply, provider, cost = self.router.route_query(
            prompt=text,
            system_instruction=system_instruction,
            conversation_history=history,
        )
        latency_ms = int((time.time() - t0) * 1000)

        # Record turns into SQLite memory
        self.memory.record_turn(self.session_id, "user", text)
        self.memory.record_turn(
            self.session_id,
            "assistant",
            reply,
            model_used=provider,
            cost_cents=cost,
            latency_ms=latency_ms,
        )

        return reply

    def run_interactive(self, voice: bool = False) -> None:
        print("=" * 70)
        print("GSE SOVEREIGN BRAIN v5.3.0 — DIRECT CONVERSATION INTERFACE")
        print("Persistent Memory: ACTIVE | Zero-Token-Waste Router: ACTIVE")
        print(f"Voice Output (JARVIS): {'ENABLED' if voice else 'DISABLED (pass --voice / -v to enable)'}")
        print("Commands: /status, /facts, /teach <key>: <value>, /exit")
        print("=" * 70)

        if voice:
            from intelligence.voice_brain.voice_interface import speak
            speak("Sovereign brain online. Standing by.")

        while True:
            try:
                user_msg = input("\nGarrett > ")
            except (KeyboardInterrupt, EOFError):
                print("\nBrain standing by.")
                break

            if user_msg.strip().lower() in ["/exit", "exit", "quit", "q"]:
                if voice:
                    from intelligence.voice_brain.voice_interface import speak
                    speak("Session saved. Exiting.")
                print("Session saved. Exiting.")
                break

            if not user_msg.strip():
                continue

            response = self.process_input(user_msg)
            print(f"\nBrain > {response}")
            if voice:
                from intelligence.voice_brain.voice_interface import speak
                speak(response)


def main() -> None:
    parser = argparse.ArgumentParser(description="GSE Sovereign Conversational Brain")
    parser.add_argument("query", nargs="*", help="Optional single query to run")
    parser.add_argument("--voice", "-v", action="store_true", help="Speak responses aloud with JARVIS voice")
    args = parser.parse_args()

    server = SovereignBrainServer()
    if args.query:
        query_str = " ".join(args.query)
        result = server.process_input(query_str)
        print(result)
        if args.voice:
            from intelligence.voice_brain.voice_interface import speak
            speak(result)
    else:
        server.run_interactive(voice=args.voice)


if __name__ == "__main__":
    main()
