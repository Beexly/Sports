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
import queue
import threading
import time
from typing import Callable, List, Optional, Tuple

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


def speak(text: str, rate: int = 1, voice_index: Optional[int] = None) -> None:
    """
    Speak text aloud using Windows native SAPI SpVoice. BLOCKING: returns when the
    utterance finishes. Signature and behaviour are unchanged from the original,
    apart from the optional voice selection.

    A TTS failure is reported to stderr and swallowed: a machine that cannot speak
    must never take down the caller.
    """
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
    ``--no-audio`` run behaves: identical call sites, no COM.
    """

    def __init__(
        self,
        enabled: bool = True,
        rate: int = 1,
        voice_index: Optional[int] = None,
        cooldown: float = 60.0,
        log_prefix: str = "[Voice]",
    ) -> None:
        self.enabled = bool(enabled) and sapi_available()
        self.rate = rate
        self.voice_index = voice_index
        self.cooldown = cooldown
        self.log_prefix = log_prefix
        self.spoken_count = 0
        self.suppressed_count = 0
        self._q: "queue.Queue[Optional[str]]" = queue.Queue()
        self._seen: dict = {}
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="sapi-speaker", daemon=True)
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
            try:
                speaker = _com_voice()
                speaker.Rate = self.rate
                if self.voice_index is not None:
                    voices = speaker.GetVoices()
                    if 0 <= self.voice_index < voices.Count:
                        speaker.Voice = voices.Item(self.voice_index)
                speaker.Speak(item)
                self.spoken_count += 1
                print(f"{self.log_prefix} spoke: {item[:90]}", flush=True)
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
    parser.add_argument("--speak", "-s", action="store_true", help="Speak the response aloud via Windows SAPI")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive voice conversation loop")
    parser.add_argument("--list-voices", action="store_true", help="List installed SAPI voices and exit")
    parser.add_argument("--say", help="Speak this text directly (no brain round trip) and exit")
    args = parser.parse_args()

    if args.list_voices:
        voices = list_voices()
        if not voices:
            print("No SAPI voices available.")
            return 1
        for idx, desc in voices:
            print(f"  [{idx}] {desc}")
        return 0

    if args.say:
        print(f"SAPI available: {sapi_available()}")
        speak(args.say)
        return 0

    # Import router
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from router import query_brain
    from memory import recall_relevant

    if args.interactive:
        print("=== Sovereign Brain Voice Interface ===")
        print("Type your message (or 'exit' to quit). Responses will be spoken aloud.")
        print("-" * 50)
        speak("Sovereign brain online. Standing by.")
        while True:
            try:
                user_input = input("\nYou > ").strip()
                if not user_input:
                    continue
                if user_input.lower() in ("exit", "quit", "q"):
                    speak("Shutting down voice interface.")
                    print("Exiting.")
                    break
                
                print("\nBrain is thinking...")
                response = query_brain(user_input)
                print(f"\nBrain >\n{response}\n")
                if args.speak or True:  # Default to voice in interactive mode
                    speak(response)
            except (KeyboardInterrupt, EOFError):
                print("\nInterrupted.")
                break
    elif args.query:
        query_str = " ".join(args.query)
        response = query_brain(query_str)
        print(response)
        if args.speak:
            speak(response)
    else:
        parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
