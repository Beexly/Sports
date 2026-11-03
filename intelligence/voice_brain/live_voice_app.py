"""Live voice-in / voice-out app over the GSE brain.

Endpoints (all bound to 127.0.0.1 by default — this app is not intended for a
public interface):
  GET  /health         provider status: TTS, STT, router keys, artifact presence
  GET  /digest         spoken morning/evening digest as text (and optional audio)
  POST /ask            JSON {"question": "..."} -> routed answer, optionally spoken
  POST /voice          multipart audio upload -> transcript -> answer -> spoken

Design rules
  * Nothing is fabricated: if STT or TTS is unconfigured the response says so and
    still returns the text answer.
  * The router call is injectable (`create_app(router=...)`) so tests never touch
    the network.
  * `/ask` refuses empty questions with 400 rather than returning filler.
"""

from __future__ import annotations

import base64
import os
import tempfile
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .morning_digest import build_digest
from .voice_interface import (
    ask_and_speak,
    fish_audio_available,
    sapi_available,
    speak,
    stt_available,
    transcribe_audio_bytes,
)

ROOT = Path(__file__).resolve().parents[2]


class AskRequest(BaseModel):
    question: str
    speak_reply: bool = False
    system_instruction: str = ""


def _provider_status() -> dict:
    return {
        "tts": {
            "fish_audio": fish_audio_available(),
            "fish_audio_model": os.environ.get("FISH_AUDIO_TTS_MODEL", "s2.1-pro-free"),
            "sapi": sapi_available(),
        },
        "stt": {
            "configured": stt_available(),
            "base_url": os.environ.get("GSE_STT_BASE_URL", "https://api.openai.com/v1"),
            "model": os.environ.get("GSE_STT_MODEL", "whisper-1"),
        },
        "router": {
            "openrouter": bool(os.environ.get("OPENROUTER_API_KEY")),
            "gemini": bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")),
        },
    }


def create_app(router: Any = None) -> FastAPI:
    """Build the FastAPI app. `router` is injected for tests."""
    app = FastAPI(title="GSE Live Voice Brain", version="1.0.0")

    @app.get("/health")
    def health() -> dict:
        return {
            "ok": True,
            "service": "gse_live_voice_app",
            "providers": _provider_status(),
            "artifacts": {
                "ledger": (ROOT / "data" / "engine" / "new_engine_official_ledger_2026.json").exists(),
                "team_priors": (ROOT / "data" / "engine" / "team_priors_weeks_1_to_8_trained.json").exists(),
            },
        }

    @app.get("/digest")
    def digest(evening: bool = False, speak_reply: bool = False) -> dict:
        d = build_digest(evening=evening)
        if speak_reply:
            d["voice"] = {"spoken": bool(speak(d["text"])), "chars": len(d["text"])}
        return d

    @app.post("/ask")
    def ask(req: AskRequest) -> JSONResponse:
        if not req.question.strip():
            raise HTTPException(status_code=400, detail="question must not be empty")
        result = ask_and_speak(
            req.question,
            system_instruction=req.system_instruction,
            speak_reply=req.speak_reply,
            router=router,
        )
        if not result.get("ok"):
            return JSONResponse(status_code=502, content=result)
        return JSONResponse(content=result)

    @app.post("/voice")
    async def voice(
        audio: UploadFile = File(...),
        speak_reply: bool = Form(False),
        system_instruction: str = Form(""),
    ) -> JSONResponse:
        raw = await audio.read()
        if not raw:
            raise HTTPException(status_code=400, detail="empty audio upload")
        stt = transcribe_audio_bytes(raw, filename=audio.filename or "audio.wav")
        if not stt.get("ok"):
            return JSONResponse(
                status_code=422,
                content={
                    "ok": False,
                    "stage": "transcription",
                    "transcript": None,
                    "provider": stt.get("provider"),
                    "error": stt.get("error"),
                    "hint": "set GSE_STT_API_KEY (or OPENAI_API_KEY) or install faster-whisper",
                },
            )
        answer = ask_and_speak(
            stt["transcript"],
            system_instruction=system_instruction,
            speak_reply=speak_reply,
            router=router,
        )
        answer["stage"] = "answered"
        answer["transcript"] = stt["transcript"]
        answer["stt_provider"] = stt.get("provider")
        return JSONResponse(content=answer)

    return app


app = create_app()


def main(argv: Optional[list[str]] = None) -> int:
    import argparse

    import uvicorn

    ap = argparse.ArgumentParser(description="GSE live voice brain (localhost only)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8077)
    ap.add_argument("--reload", action="store_true")
    args = ap.parse_args(argv)

    uvicorn.run("intelligence.voice_brain.live_voice_app:app", host=args.host, port=args.port,
                reload=args.reload, log_level="info")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
