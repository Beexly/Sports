# Creator Intel Pipeline

Whole-account creator reverse-engineering, per the Artem/JeV reel Garrett flagged
(2026-09-25): pull every reel from a creator, transcribe, label topic/hook/
structure/CTA per sentence, chart patterns against engagement.

## How it runs

```
.venv/bin/python pipeline/run.py --creator USERNAME [--limit N] [--skip-steps download,transcribe,label]
```

1. **fetch** — `instagram-cli posts` (via galaxysportsnetwork) → reel URLs, likes, comments, captions
2. **download** — `yt-dlp` audio-only DASH track (all Whisper needs; ~10x smaller than video)
3. **transcribe** — local `faster-whisper` base model (`models/faster-whisper-base/`), CPU int8
4. **label** — text LLM via Garrett's AI/ML API key (reads `~/workspace/jev-ultrafast/.env`;
   curl-based to dodge the sandbox httpx/proxy bug) → topic, hook_type, hook_text,
   structure, cta, per-sentence hook/setup/payoff/pitch tags
5. **chart** — `work/<creator>/index.html` dashboard: hook pattern counts, avg likes per
   hook, clickable reel archive with sentence-level tag view

Outputs are resumable: existing audio/transcripts/labels are skipped on rerun.

## Sandbox quirks baked in

- `yt-dlp` needs `--no-check-certificate` here (proxy MITMs the cert chain)
- `faster-whisper` needs proxy env for model download, but the model is already
  vendored in `models/` — transcription itself is fully local
- text-model HTTP goes through `curl`, not Python httpx (URL parsing bug under proxy)

## Reference

- Artem's reel: https://instagram.com/p/Ddov4NYPVdb/ (~8s screen demo; real content is
  the caption + on-screen dashboard: 178/447 scripts classified, $0.0680 Jev cost,
  hook categories Curiosity/Recognition/Result)
- Jev use-case playbook: `~/workspace/jev-ultrafast/docs/jev-use-case-playbook.md`
