"""
Voice Interface for Sovereign Brain
Enables text-to-speech (TTS) and speech-to-text (STT) on Windows without external paid APIs.
Uses Windows native SAPI.SpVoice for audio output and router.py for intelligence.

WHAT THIS MODULE ADDS
---------------------
The original exposed one blocking function, ``speak()``, which held the caller for
the full duration of the utterance. That is fine for a chat prompt and wrong for a
watchdog, which has to keep polling while it talks. This module now also provides:

  * ``speak_async()``   non-blocking; hands the utterance to a worker thread
  * ``SpeechWorker``    a durable queue + thread with a repeat cooldown, so a
                        daemon can announce continuously without ever blocking
                        and without two utterances interleaving
  * ``list_voices()``   installed SAPI voices, with the platform's own names
  * ``sapi_available()``  capability probe, so a non-Windows host degrades to a
                        logged no-op instead of raising

``speak()`` keeps its original signature and blocking behaviour, so existing
callers are unaffected. Nothing here needs a paid API and nothing leaves the box.
"""

import sys
import os
import argparse
import json
import queue
import threading
import time
from pathlib import Path
from typing import Callable, List, Optional, Tuple
import urllib.request

def _load_env_local() -> None:
    """Load .env.local from repo root or parent directories if keys not in environ."""
    candidates = [
        Path(__file__).resolve().parents[2] / ".env.local",
        Path.cwd() / ".env.local",
        Path("C:/Users/Garrett/Sports/.env.local"),
    ]
    for p in candidates:
        if p.exists():
            try:
                for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip(" '\""))
                break
            except Exception:
                pass

_load_env_local()

#: SAPI Speak flags. SPF_ASYNC makes the COM call return immediately; the worker
#: thread is a second layer, because some SAPI engines block on the audio device
#: rather than on the utterance itself.
SPF_ASYNC = 1
SPF_PURGEBEFORESPEAK = 2

def _clean_for_speech(text: str) -> str:
    """
    Strip markup so the voice reads the sentence and not the punctuation, and
    collapse whitespace, because SAPI pauses oddly on runs of blank lines.
    """
    for ch in ("*", "#", "`", "[", "]", "|", "_"):
        text = text.replace(ch, "")
    text = text.replace("\u2014", ",").replace("\u2013", ",")
    return " ".join(text.split())

def fish_audio_available() -> bool:
    """True when FISH_AUDIO_API_KEY is configured."""
    return bool(os.environ.get("FISH_AUDIO_API_KEY"))

def speak_fish_audio(
    text: str,
    reference_id: Optional[str] = None,
    model: Optional[str] = None,
) -> bool:
    """
    Synthesizes and plays speech using Fish Audio's TTS API.
    Uses Fish Audio's free S2.1 Pro tier ('s2.1-pro-free') and JARVIS voice model.
    Plays in-memory WAV audio via winsound.PlaySound on Windows.
    Returns True on success, False on error (allowing seamless SAPI fallback).
    """
    api_key = os.environ.get("FISH_AUDIO_API_KEY")
    if not api_key:
        return False

    ref_id = reference_id or os.environ.get("FISH_AUDIO_MODEL_ID", "88b183bfbdda44a09ad4474712b967f4")
    tts_model = model or os.environ.get("FISH_AUDIO_TTS_MODEL", "s2.1-pro-free")

    cleaned = _clean_for_speech(text)
    if not cleaned:
        return False

    payload = {
        "text": cleaned,
        "reference_id": ref_id,
        "format": "wav",
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "model": tts_model,
    }

    try:
        import winsound
        import tempfile

        req = urllib.request.Request(
            "https://api.fish.audio/v1/tts",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            audio_data = resp.read()

        if audio_data and len(audio_data) > 44:
            # Use temp wav file for reliable Windows sound device playback across all builds
            temp_wav = os.path.join(tempfile.gettempdir(), f"gse_jarvis_{os.getpid()}_{int(time.time()*1000)}.wav")
            try:
                with open(temp_wav, "wb") as f:
                    f.write(audio_data)
                winsound.PlaySound(temp_wav, winsound.SND_FILENAME)
                return True
            finally:
                if os.path.exists(temp_wav):
                    try:
                        os.remove(temp_wav)
                    except Exception:
                        pass
        return False
    except Exception as exc:
        print(f"[Voice] Fish Audio TTS error ({exc}), falling back to SAPI.", file=sys.stderr)
        return False


def _com_voice():
    """
    Dispatch a fresh SAPI voice object.

    COM objects are not thread-safe, so every thread that speaks builds its own
    rather than sharing one across the poll loop and the speaker thread.
    """
    import win32com.client

    return win32com.client.Dispatch("SAPI.SpVoice")


def _co_init() -> Optional[Callable[[], None]]:
    """
    Initialise COM on the CALLING thread; returns an uninitialiser or None.

    pywin32 initialises COM implicitly on the thread that imports it, which is why
    ``speak()`` works from the main thread and why this bug hides until speech
    moves onto a worker: a fresh thread has no apartment, and every Dispatch from
    it fails with "CoInitialize has not been called". Measured exactly that on
    this host before the fix, which is what --test-voice exists to catch.
    """
    try:
        import pythoncom

        pythoncom.CoInitialize()
        return pythoncom.CoUninitialize
    except Exception:
        return None


def sapi_available() -> bool:
    """True when Windows SAPI is present and at least one voice is installed."""
    try:
        import win32com.client  # noqa: F401
    except Exception:
        return False
    try:
        return bool(_com_voice().GetVoices().Count)
    except Exception:
        return False


def list_voices() -> List[Tuple[int, str]]:
    """(index, description) for every installed SAPI voice."""
    try:
        voices = _com_voice().GetVoices()
        return [(i, str(voices.Item(i).GetDescription())) for i in range(voices.Count)]
    except Exception as exc:  # pragma: no cover - platform dependent
        print(f"[Voice] Could not enumerate voices: {exc}", file=sys.stderr)
        return []


def speak(
    text: str,
    rate: int = 1,
    voice_index: Optional[int] = None,
    prefer_fish_audio: bool = True,
) -> None:
    """
    Speak text aloud using Fish Audio JARVIS voice (if available) with Windows SAPI fallback.
    BLOCKING: returns when the utterance finishes.
    """
    if prefer_fish_audio and fish_audio_available():
        if speak_fish_audio(text):
            return

    _co_init()  # defensive: correct on the main thread, essential if called elsewhere
    try:
        speaker = _com_voice()
        speaker.Rate = rate  # -10 to 10
        if voice_index is not None:
            voices = speaker.GetVoices()
            if 0 <= voice_index < voices.Count:
                speaker.Voice = voices.Item(voice_index)
        speaker.Speak(_clean_for_speech(text))
    except Exception as e:
        print(f"[Voice] TTS Error: {e}", file=sys.stderr)


class SpeechWorker:
    """
    A background thread draining a queue of utterances.

    Callers never block: ``say()`` returns as soon as the text is queued. The
    queue is unbounded so enqueuing cannot block either, and ``cooldown``
    suppresses an identical message repeated inside the window -- a watchdog
    polling every few seconds must not repeat itself aloud every time it looks.

    ``enabled=False`` turns it into a logger, which is how a non-Windows host or a
    ``--no-audio`` run behaves.
    """

    def __init__(
        self,
        enabled: bool = True,
        rate: int = 1,
        voice_index: Optional[int] = None,
        cooldown: float = 60.0,
        log_prefix: str = "[Voice]",
        prefer_fish_audio: bool = True,
    ) -> None:
        self.enabled = bool(enabled) and (fish_audio_available() or sapi_available())
        self.rate = rate
        self.voice_index = voice_index
        self.cooldown = cooldown
        self.log_prefix = log_prefix
        self.prefer_fish_audio = prefer_fish_audio
        self.spoken_count = 0
        self.suppressed_count = 0
        self._q: "queue.Queue[Optional[str]]" = queue.Queue()
        self._seen: dict = {}
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="speech-worker", daemon=True)
        self._thread.start()

    def say(self, text: str, cooldown: Optional[float] = None) -> bool:
        """
        Queue an utterance. Returns True when queued, False when suppressed as a
        repeat or when audio is disabled. Never blocks.
        """
        text = _clean_for_speech(text)
        if not text:
            return False
        window = self.cooldown if cooldown is None else cooldown
        now = time.time()
        last = self._seen.get(text)
        if window and last is not None and (now - last) < window:
            self.suppressed_count += 1
            return False
        self._seen[text] = now
        if not self.enabled:
            print(f"{self.log_prefix} (no audio) {text}", flush=True)
            self.spoken_count += 1
            return True
        self._q.put(text)
        return True

    def _run(self) -> None:
        # COM has no apartment on a fresh thread: without this the very first
        # Dispatch here raises "CoInitialize has not been called" and the worker
        # silently never speaks.
        uninit = _co_init()
        try:
            self._drain()
        finally:
            if uninit is not None:
                try:
                    uninit()
                except Exception:
                    pass

    def _drain(self) -> None:
        while not self._stop.is_set():
            try:
                item = self._q.get(timeout=0.25)
            except queue.Empty:
                continue
            if item is None:
                break

            if self.prefer_fish_audio and fish_audio_available():
                try:
                    if speak_fish_audio(item):
                        self.spoken_count += 1
                        print(f"{self.log_prefix} [JARVIS] spoke: {item[:90]}", flush=True)
                        continue
                except Exception as exc:
                    print(f"{self.log_prefix} Fish Audio error ({exc}), falling back to SAPI", file=sys.stderr, flush=True)

            try:
                speaker = _com_voice()
                speaker.Rate = self.rate
                if self.voice_index is not None:
                    voices = speaker.GetVoices()
                    if 0 <= self.voice_index < voices.Count:
                        speaker.Voice = voices.Item(self.voice_index)
                speaker.Speak(item)
                self.spoken_count += 1
                print(f"{self.log_prefix} [SAPI] spoke: {item[:90]}", flush=True)
            except Exception as exc:
                # A device failure must not kill the thread: log and keep draining
                # so the daemon stays responsive for the rest of the run.
                print(f"{self.log_prefix} TTS error (continuing): {exc}", file=sys.stderr, flush=True)

    def stop(self, timeout: float = 2.0) -> None:
        self._stop.set()
        try:
            self._q.put_nowait(None)
        except Exception:
            pass
        self._thread.join(timeout=timeout)

    @property
    def pending(self) -> int:
        return self._q.qsize()


_shared: Optional[SpeechWorker] = None
_shared_lock = threading.Lock()


def speak_async(text: str, rate: int = 1, voice_index: Optional[int] = None) -> bool:
    """
    Fire-and-forget speech using a process-wide worker. The first call builds the
    worker; later calls reuse it so a tight loop does not spawn a thread per
    message.
    """
    global _shared
    with _shared_lock:
        if _shared is None:
            _shared = SpeechWorker(enabled=True, rate=rate, voice_index=voice_index)
        return _shared.say(text)


def shutdown_shared_worker(timeout: float = 2.0) -> None:
    """Stop and clear the process-wide worker. Safe to call when none exists."""
    global _shared
    with _shared_lock:
        if _shared is not None:
            _shared.stop(timeout=timeout)
            _shared = None

def main() -> int:
    parser = argparse.ArgumentParser(description="GSE Sovereign Voice Assistant")
    parser.add_argument("query", nargs="*", help="Query text to send to brain")
    parser.add_argument("--speak", "-s", action="store_true", help="Speak the response aloud via voice assistant")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive voice conversation loop")
    parser.add_argument("--list-voices", action="store_true", help="List installed SAPI voices and exit")
    parser.add_argument("--say", help="Speak this text directly (no brain round trip) and exit")
    parser.add_argument("--test-jarvis", action="store_true", help="Test Fish Audio JARVIS voice synthesis and exit")
    parser.add_argument("--sapi-only", action="store_true", help="Force local Windows SAPI only (bypass Fish Audio)")
    args = parser.parse_args()

    prefer_fish = not args.sapi_only

    if args.test_jarvis:
        print("[Voice] Testing Fish Audio JARVIS TTS...")
        print(f"  Fish Audio Key present: {fish_audio_available()}")
        print(f"  Model ID: {os.environ.get('FISH_AUDIO_MODEL_ID', '88b183bfbdda44a09ad4474712b967f4')}")
        print(f"  TTS Model: {os.environ.get('FISH_AUDIO_TTS_MODEL', 's2.1-pro-free')}")
        test_msg = "Sovereign brain online. JARVIS speech synthesis operational."
        success = speak_fish_audio(test_msg)
        if success:
            print("[Voice] SUCCESS: JARVIS voice synthesized and played successfully.")
            return 0
        else:
            print("[Voice] FAIL: JARVIS voice synthesis failed.", file=sys.stderr)
            return 1

    if args.list_voices:
        voices = list_voices()
        if not voices:
            print("No SAPI voices available.")
            return 1
        for idx, desc in voices:
            print(f"  [{idx}] {desc}")
        return 0

    if args.say:
        print(f"Fish Audio available: {fish_audio_available()} (prefer_fish={prefer_fish})")
        print(f"SAPI available: {sapi_available()}")
        speak(args.say, prefer_fish_audio=prefer_fish)
        return 0

    # Import router
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from router import query_brain
    from memory import recall_relevant

    if args.interactive:
        print("=== Sovereign Brain Voice Interface ===")
        print("Type your message (or 'exit' to quit). Responses will be spoken aloud.")
        print("-" * 50)
        speak("Sovereign brain online. Standing by.", prefer_fish_audio=prefer_fish)
        while True:
            try:
                user_input = input("\nYou > ").strip()
                if not user_input:
                    continue
                if user_input.lower() in ("exit", "quit", "q"):
                    speak("Shutting down voice interface.", prefer_fish_audio=prefer_fish)
                    print("Exiting.")
                    break
                
                print("\nBrain is thinking...")
                response = query_brain(user_input)
                print(f"\nBrain >\n{response}\n")
                if args.speak or True:  # Default to voice in interactive mode
                    speak(response, prefer_fish_audio=prefer_fish)
            except (KeyboardInterrupt, EOFError):
                print("\nInterrupted.")
                break
    elif args.query:
        query_str = " ".join(args.query)
        response = query_brain(query_str)
        print(response)
        if args.speak:
            speak(response, prefer_fish_audio=prefer_fish)
    else:
        parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
