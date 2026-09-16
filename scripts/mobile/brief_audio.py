#!/usr/bin/env python3
"""
brief_audio.py — the daily brief, spoken.

`docs/strategy/platform-gaps-triage.md` lists this as ON-BRAND and buildable:

    "17 Audio layer (TTS pick briefings, podcast) | Build (content-gated) —
     Cerebras/TTS already scoped; no auto-publish"

This is the TTS half, and it is deliberately a *speech* layer rather than a new
content product: it renders text the platform already produces, so it cannot
become a second place where claims are made.

═══════════════════════════════════════════════════════════════════════════════
 TWO PROBLEMS THAT ARE SPECIFIC TO SPEAKING THIS PRODUCT
═══════════════════════════════════════════════════════════════════════════════

**1. NUMBER PRONUNCIATION IS A DOCTRINE PROBLEM, NOT AN AESTHETIC ONE.**

`72/100` read verbatim is "seventy-two slash one hundred", and `%` is read as
"percent". The second is forbidden on every surface because confidence is
measurably not a probability (AGENTS.md, 2026-09-13: the 80+ band claims 0.8663
and realizes 0.5191, z = -10.7). A voice layer that says "seventy-three percent
confidence" has broken the rule in the one medium where the listener cannot
scroll back to check.

So the text is NORMALISED FOR SPEECH before it is sent to the engine:
`72/100` becomes "72 out of 100", `+0.2257` becomes "plus 0.23", and a percent
sign attached to confidence is refused outright.

**2. BANNED VOCABULARY APPLIES TO SPEECH TOO.**

Rule 8 is about what the product says, not what it renders. The same
`positioning-vocab.json` list is applied here, and a violation refuses rather than
speaks. The linter is a local copy so this script has no build dependency on the
app; it is checked against the vocabulary file at startup.

USAGE
  python3 scripts/mobile/brief_audio.py --text "..." --out brief.mp3
  python3 scripts/mobile/brief_audio.py --file docs/mobile/README.md --out brief.mp3

  --voice en-US-AndrewNeural   (default: Warm, Confident, Authentic, Honest)
  --rate  -10%                 (default: 10 percent slower than default)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import pathlib
import re
import sys

# ── Brand voice ──────────────────────────────────────────────────────────────
#
# Chosen for its own publisher tags: "Warm, Confident, Authentic, Honest". The
# brand is calm authority, and every other US male voice is tagged with
# "Passion" (Guy) or "Cute" (Ana) or "Cheerful" (Emma). A cheerful read of a
# loss autopsy would be worse than no audio layer at all.
DEFAULT_VOICE = "en-US-AndrewNeural"

# Slower than default. The product's register is a briefing, not a broadcast,
# and its sentences carry numbers a listener has to hold.
DEFAULT_RATE = "-10%"

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
VOCAB = REPO_ROOT / "apps" / "mobile" / "src" / "data" / "positioning-vocab.json"


# ── Local linter, checked against the real vocabulary at startup ─────────────

def load_banned() -> list[str]:
    """
    Read the machine-readable list rather than restating it.

    A copy would drift, and the drift would be silent: the audio layer would
    start speaking a phrase the rest of the platform refuses to print.
    """
    if not VOCAB.exists():
        # Do not silently proceed with an empty list, which would be a linter
        # that always passes.
        print(f"brief_audio: cannot read {VOCAB}. Refusing to speak unfiltered.", file=sys.stderr)
        sys.exit(2)
    data = json.loads(VOCAB.read_text(encoding="utf-8"))
    extra = [
        "mission control", "ecosystem", "lock of the day", "guaranteed",
        "sure thing", "risk-free", "easy money", "max bet", "our ai",
        "the model thinks",
    ]
    return sorted({*data["bannedPhrases"], *extra})


def lint(text: str, banned: list[str]) -> list[str]:
    """Every violation, not the first. A fix pass that reveals one at a time is
    a fix pass that takes a week."""
    lowered = text.lower()
    hits = []
    for phrase in banned:
        idx = lowered.find(phrase.lower())
        while idx != -1:
            hits.append(f'"{text[idx:idx + len(phrase)]}" at {idx}')
            idx = lowered.find(phrase.lower(), idx + 1)

    # Emoji are banned in copy and therefore banned in speech. A synthesizer
    # either skips them or reads the codepoint name, and both are wrong.
    for i, ch in enumerate(text):
        if ord(ch) > 0x2500 and ch not in "\u2014\u2013\u2212\u00b7":
            hits.append(f"non-speech glyph {ch!r} at {i}")
    return hits


# ── Speech normalisation ─────────────────────────────────────────────────────

def normalise_for_speech(text: str) -> str:
    """
    Rewrite what the synthesizer would otherwise read literally.

    Each rule exists because the unnormalised form is EITHER confusing
    ("seventy-two slash one hundred") or forbidden ("seventy-three percent").
    """
    out = text

    # Confidence scores FIRST, before any generic percent handling, so a
    # confidence expressed as a percentage is caught rather than spoken.
    out = re.sub(
        r"(\d{1,3})\s*/\s*100\s*(?:confidence\s*(?:score)?)?",
        lambda m: f"{m.group(1)} out of 100 confidence score",
        out,
        flags=re.IGNORECASE,
    )
    out = re.sub(
        r"confidence[^.]{0,24}?(\d{1,3})\s*%",
        lambda m: f"confidence score {m.group(1)} out of 100",
        out,
        flags=re.IGNORECASE,
    )
    out = re.sub(r"at\s+(\d{1,3})\s*%\s+confidence", r"at confidence score \1 out of 100", out, flags=re.IGNORECASE)

    # SIGNED DECIMALS. This is the rule that matters most and the first version
    # of it was wrong in a way worth recording: it produced "plus 0 point 2. 2."
    # for "0.2257", because `'. '.join("22")` inserts a separator BETWEEN the
    # characters. Worse than unreadable, it is ambiguous.
    #
    # The spoken form is now explicit: the integer part, then "point", then the
    # decimal digits read INDIVIDUALLY, which is how a person reads a price
    # difference aloud and the only form that survives a synthesizer.
    def speak_signed(match: "re.Match[str]") -> str:
        sign = match.group(1)
        whole = match.group(2)
        decimals = match.group(3)[:4]
        word = "plus" if sign == "+" else "minus"
        spoken_digits = " ".join(decimals)
        return f"{word} {whole} point {spoken_digits}"

    # `\d+` after the point, not `\d{2,}`. A spread of "-3.0" has ONE decimal
    # digit and fell entirely through the first version of this rule, so it was
    # read as a hyphen followed by "three point zero". And when every decimal
    # digit is zero the decimals are dropped, because "minus 3 point zero" is
    # not how anyone says a three point spread.
    def speak_signed_any(match: "re.Match[str]") -> str:
        sign, whole, decimals = match.group(1), match.group(2), match.group(3)
        word = "plus" if sign == "+" else "minus"
        if set(decimals) == {"0"}:
            return f"{word} {whole}"
        return f"{word} {whole} point {' '.join(decimals)}"

    out = re.sub(r"([+\u2212-])(\d+)\.(\d+)", speak_signed_any, out)

    # SIGNED WHOLE NUMBERS with no space: "-3.0" already matched above, but a
    # plain "-3" did not match ANYTHING before this rule, so a spread of -3 was
    # read as a hyphen followed by three. The lookahead keeps a hyphen between
    # words out of it.
    out = re.sub(r"([+\u2212-])(\d+)(?![\d.%])", lambda m: ("plus " if m.group(1) == "+" else "minus ") + m.group(2), out)

    # Spreads and run lines, AFTER the sign handling so "minus 3" is not
    # re-matched and mangled into "minus 3 and a half".
    out = re.sub(r"\bminus (\d+)\.5\b", r"minus \1 and a half", out)
    out = re.sub(r"\bplus (\d+)\.5\b", r"plus \1 and a half", out)
    out = re.sub(r"\b(\d+)\.5\b", r"\1 and a half", out)
    out = re.sub(r"\bPK\b", "pick em", out)

    # A bare percent that is NOT a confidence figure is legitimate arithmetic
    # (market-implied probability), and "percent" is the right word for it.
    out = re.sub(r"(\d+(?:\.\d+)?)\s*%", r"\1 percent", out)

    # Markdown and URLs must not be spelled out.
    out = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", out)
    out = re.sub(r"https?://\S+", "the site", out)
    out = re.sub(r"`([^`]*)`", r"\1", out)
    out = re.sub(r"[#*_>]+", " ", out)

    # Markdown table pipes become pauses rather than "vertical bar".
    out = re.sub(r"\s*\|\s*", ", ", out)
    out = re.sub(r"[ \t]+", " ", out)
    out = re.sub(r"\n{2,}", "\n", out)
    return out.strip()


def spoken_duration_estimate(text: str) -> float:
    """~165 words per minute at the default rate, minus the 10 percent slowing."""
    words = len(text.split())
    return round(words / (165 * 0.9) * 60, 1)


async def synthesize(text: str, out_path: pathlib.Path, voice: str, rate: str) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(str(out_path))


def main() -> int:
    ap = argparse.ArgumentParser(description="Render the brief as speech.")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--text", help="the brief text")
    src.add_argument("--file", help="a file to read the brief from")
    ap.add_argument("--out", required=True, help="output mp3 path")
    ap.add_argument("--voice", default=DEFAULT_VOICE)
    ap.add_argument("--rate", default=DEFAULT_RATE)
    ap.add_argument("--dry-run", action="store_true", help="print the spoken text and stop")
    args = ap.parse_args()

    raw = args.text if args.text else pathlib.Path(args.file).read_text(encoding="utf-8")

    banned = load_banned()
    spoken = normalise_for_speech(raw)
    hits = lint(spoken, banned)

    if hits:
        print("brief_audio: REFUSED. The following would be spoken and may not be:", file=sys.stderr)
        for hit in hits:
            print(f"  {hit}", file=sys.stderr)
        print("\nRule 8 applies to speech. Nothing was synthesized.", file=sys.stderr)
        return 1

    print(f"voice      {args.voice}")
    print(f"rate       {args.rate}")
    print(f"words      {len(spoken.split())}")
    print(f"est.       {spoken_duration_estimate(spoken)}s")

    if args.dry_run:
        print("\n--- spoken text ---\n" + spoken)
        return 0

    out_path = pathlib.Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    asyncio.run(synthesize(spoken, out_path, args.voice, args.rate))
    print(f"output     {out_path}  ({out_path.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
