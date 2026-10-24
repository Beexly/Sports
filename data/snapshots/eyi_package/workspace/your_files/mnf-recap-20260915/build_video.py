#!/usr/bin/env python3
"""Galaxy Sports Edge - MNF Kelce recap video builder (1080x1920, 30fps).
Kelce-win ONLY. Original motion graphics only. No em dashes anywhere on screen.
"""
import math, subprocess, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
OUT_DIR = "/home/hatch/workspace/your_files/mnf-recap-20260915"
AUDIO_DIR = f"{OUT_DIR}/audio_v2"
AUDIO = f"{AUDIO_DIR}/vo_final.mp3"
MP4 = f"{OUT_DIR}/mnf-recap.mp4"

def probe_dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())

DURS = [probe_dur(f"{AUDIO_DIR}/c{i}.mp3") for i in range(1, 6)]
CHUNKS = []
s = 0.0
for d_ in DURS:
    CHUNKS.append((s, s + d_))
    s += d_
TAIL = 0.7
TOTAL = CHUNKS[-1][1] + TAIL
print("chunk durations:", DURS, "total:", TOTAL, flush=True)

# palette
BG = (4, 6, 16)
BLUE = (0, 212, 255)
PURPLE = (168, 85, 247)
GREEN = (46, 255, 150)
WHITE = (245, 247, 255)
MUTED = (150, 170, 210)
GOLD = (255, 200, 80)

def font(name, size):
    paths = [
        f"/usr/share/fonts/truetype/noto/{name}",
        f"/usr/share/fonts/truetype/dejavu/{name}",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()

F_BLACK = lambda s: font("NotoSans-Black.ttf", s)
F_BOLD = lambda s: font("NotoSans-Bold.ttf", s)
F_REG = lambda s: font("NotoSans-Regular.ttf", s)

# ---------------- background: nebula + drifting stars ----------------
def make_nebula():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img, "RGBA")
    def glow(cx, cy, r, color, alpha):
        for i in range(6):
            rr = int(r * (1 - i / 7))
            a = int(alpha * (1 - i / 6) / 6)
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=color + (a,))
    glow(200, 420, 700, (10, 60, 140), 90)
    glow(950, 1500, 800, (90, 30, 150), 90)
    glow(700, 950, 500, (0, 90, 110), 50)
    vig = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * 0.35, -H * 0.25, W * 1.35, H * 1.25], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(220))
    black = Image.new("RGB", (W, H), (0, 0, 0))
    img = Image.composite(img, black, vig)
    return img

def make_stars(n, bright):
    rng = np.random.default_rng(n * 7919 + 13)
    layer = np.zeros((H, W), dtype=np.float32)
    xs = rng.integers(0, W, n)
    ys = rng.integers(0, H, n)
    layer[ys, xs] = rng.uniform(0.35, 1.0, n) * bright
    layer = np.stack([layer] * 3, axis=-1)
    tint = np.array([0.75, 0.85, 1.0], dtype=np.float32)
    return (layer * tint)

NEBULA = np.asarray(make_nebula()).astype(np.float32)
STARS_FAR = make_stars(220, 0.55)
STARS_NEAR = make_stars(90, 1.0)

def background(t):
    bg = NEBULA.copy()
    sf = int((t * 6) % H)
    sn = int((t * 16) % H)
    bg += np.roll(STARS_FAR, sf, axis=0) * 255
    bg += np.roll(STARS_NEAR, sn, axis=0) * 255
    return np.clip(bg, 0, 255).astype(np.uint8)

# ---------------- card factory ----------------
def ease_out_back(p):
    c1, c3 = 1.70158, 2.70158
    return 1 + (c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2)

def draw_check(d, cx, cy, r, color, width=16):
    d.line([cx - r * 0.7, cy, cx - r * 0.15, cy + r * 0.55], fill=color, width=width, joint="curve")
    d.line([cx - r * 0.15, cy + r * 0.55, cx + r * 0.8, cy - r * 0.6], fill=color, width=width, joint="curve")

def make_stat_card(name, big, sub, accent, mark):
    """mark: 'check' | None. Returns RGBA image 920x560."""
    cw, chh = 920, 560
    card = Image.new("RGBA", (cw, chh), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    for i in range(3):
        d.rounded_rectangle([8 + i * 3, 8 + i * 3, cw - 8 - i * 3, chh - 8 - i * 3],
                            radius=44, outline=accent + (60 - i * 18,), width=6)
    d.rounded_rectangle([14, 14, cw - 14, chh - 14], radius=40, fill=(8, 12, 26, 232))
    d.rounded_rectangle([14, 14, cw - 14, chh - 14], radius=40, outline=accent + (255,), width=5)
    cx = cw // 2
    d.text((cx, 96), name, font=F_BOLD(56), fill=MUTED + (255,), anchor="mm")
    d.text((cx, 268), big, font=F_BLACK(170), fill=WHITE + (255,), anchor="mm",
           stroke_width=3, stroke_fill=(0, 0, 0, 255))
    d.text((cx, 462), sub, font=F_BOLD(50), fill=accent + (255,), anchor="mm")
    if mark == "check":
        draw_check(d, cw - 108, 102, 46, GREEN + (255,), width=20)
    return card

def stamp_cashed():
    img = Image.new("RGBA", (620, 170), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([6, 6, 614, 164], radius=26, outline=GOLD + (255,), width=8)
    d.text((310, 85), "CASHED", font=F_BLACK(84), fill=GOLD + (255,), anchor="mm")
    return img.rotate(-8, expand=True, resample=Image.BICUBIC)

def slam(frame, card_img, cx, cy, t0, t, extra=None):
    lt = t - t0
    if lt < 0:
        return
    if lt < 0.45:
        s = 0.5 + 0.5 * ease_out_back(lt / 0.45)
        alpha = min(1.0, lt / 0.18)
    else:
        s, alpha = 1.0, 1.0
    nw, nh = int(card_img.width * s), int(card_img.height * s)
    if nw < 2 or nh < 2:
        return
    c = card_img.resize((nw, nh), Image.LANCZOS)
    if alpha < 1.0:
        a = c.getchannel("A").point(lambda v: int(v * alpha))
        c.putalpha(a)
    ox, oy = 0, 0
    if 0.45 <= lt < 0.75:  # impact shake
        ts = lt - 0.45
        ox = int(11 * math.exp(-9 * ts) * math.sin(46 * ts))
        oy = int(7 * math.exp(-9 * ts) * math.cos(38 * ts))
    frame.alpha_composite(c, (int(cx - nw / 2 + ox), int(cy - nh / 2 + oy)))
    if extra == "ring" and 0 < lt < 0.6:
        p = lt / 0.6
        r = int(120 + 420 * p)
        a = int(160 * (1 - p))
        d = ImageDraw.Draw(frame, "RGBA")
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=BLUE + (a,), width=10)

CARD_SCORE = make_stat_card("MONDAY NIGHT FINAL", "31 - 10", "CHIEFS  •  BRONCOS", BLUE, None)
CARD_CALL = make_stat_card("THE CALL", "38.5+", "KELCE RECEIVING YARDS", BLUE, None)
CARD_KELCE = make_stat_card("TRAVIS KELCE", "71", "YARDS. LINE WAS 38.5.", GREEN, "check")
STAMP = stamp_cashed()

def make_deal():
    img = Image.new("RGBA", (940, 440), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((470, 120), "PICKS GO UP", font=F_BLACK(92), fill=WHITE + (255,), anchor="mm",
           stroke_width=3, stroke_fill=(0, 0, 0, 255))
    d.text((470, 210), "BEFORE KICKOFF.", font=F_BLACK(92), fill=WHITE + (255,), anchor="mm",
           stroke_width=3, stroke_fill=(0, 0, 0, 255))
    d.text((470, 340), "RESULTS GET POSTED AFTER.", font=F_BLACK(58), fill=BLUE + (255,), anchor="mm",
           stroke_width=3, stroke_fill=(0, 0, 0, 255))
    return img

DEAL = make_deal()

# end card
LOGO = Image.open("/home/hatch/workspace/vendor/autonomous-revenue-engine/brand/gse-logo-mark-2026-09-10.jpg").convert("RGB")
LOGO = LOGO.resize((460, 460), Image.LANCZOS)
_mask = Image.new("L", (460, 460), 0)
ImageDraw.Draw(_mask).rounded_rectangle([0, 0, 460, 460], radius=110, fill=255)
LOGO.putalpha(_mask)

def draw_endcard(frame, t):
    lt = t - CHUNKS[4][0]
    a = min(1.0, max(0.0, lt / 0.8))
    if a <= 0:
        return
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.ellipse([W // 2 - 300, 560 - 300, W // 2 + 300, 560 + 300], outline=BLUE + (110,), width=6)
    ov.alpha_composite(LOGO, (W // 2 - 230, 560 - 230))
    d.text((W // 2, 1120), "GALAXY SPORTS EDGE", font=F_BLACK(66), fill=WHITE + (255,), anchor="mm")
    d.text((W // 2, 1200), "Every pick public. Every result posted.",
           font=F_REG(44), fill=MUTED + (255,), anchor="mm")
    if a < 1.0:
        al = ov.getchannel("A").point(lambda v: int(v * a))
        ov.putalpha(al)
    frame.alpha_composite(ov)

# ---------------- captions ----------------
PHRASES = [
    [("Monday night.", 0.00), ("Chiefs, thirty-one. Broncos, ten.", 0.30)],
    [("The call:", 0.00), ("Travis Kelce over thirty-eight", 0.28), ("and a half receiving yards.", 0.60)],
    [("The result: seventy-one.", 0.00), ("Nearly double.", 0.55)],
    [("Picks go up before kickoff.", 0.00), ("Results get posted after.", 0.40), ("That is the whole operation.", 0.66)],
    [("Galaxy Sports Edge.", 0.00), ("Back tomorrow.", 0.45)],
]

def wrap(text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if fnt.getlength(t) <= max_w:
            cur = t
        else:
            lines.append(cur); cur = w_
    lines.append(cur)
    return lines

def draw_caption(frame, ci, t):
    s, e = CHUNKS[ci]
    frac = (t - s) / (e - s)
    phrases = PHRASES[ci]
    idx = 0
    for i, (_, f0) in enumerate(phrases):
        if frac >= f0:
            idx = i
    text, f0 = phrases[idx]
    f1 = phrases[idx + 1][1] if idx + 1 < len(phrases) else 1.0
    pop = min(1.0, (frac - f0) / max(0.001, (f1 - f0) * 0.25 + 0.02))
    sc = 0.88 + 0.12 * min(1.0, pop * 1.4)
    fnt = F_BOLD(58)
    lines = wrap(text, fnt, W - 140)
    lh = 78
    total_h = lh * len(lines)
    y0 = 1560 - total_h / 2
    tmp = Image.new("RGBA", (W, 420), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    for i, ln in enumerate(lines):
        d.text((W / 2, 40 + i * lh), ln, font=fnt, fill=WHITE + (255,), anchor="mm",
               stroke_width=4, stroke_fill=(2, 3, 10, 255))
    nw, nh = int(W * sc), int(420 * sc)
    tmp = tmp.resize((nw, nh), Image.LANCZOS)
    frame.alpha_composite(tmp, ((W - nw) // 2, int(y0 - (nh - 420) / 2)))

def render_frame(t):
    frame = Image.fromarray(background(t), "RGB").convert("RGBA")
    d = ImageDraw.Draw(frame)
    d.text((W / 2, 96), "GALAXY SPORTS EDGE", font=F_BOLD(34), fill=(150, 170, 210, 150), anchor="mm")
    c0, c1 = CHUNKS[0][0], CHUNKS[0][1]
    if c0 <= t < c1:
        slam(frame, CARD_SCORE, W / 2, 780, c0 + 0.3, t, extra="ring")
        draw_caption(frame, 0, t)
    elif CHUNKS[1][0] <= t < CHUNKS[1][1]:
        slam(frame, CARD_CALL, W / 2, 780, CHUNKS[1][0] + 0.3, t, extra="ring")
        draw_caption(frame, 1, t)
    elif CHUNKS[2][0] <= t < CHUNKS[2][1]:
        slam(frame, CARD_KELCE, W / 2, 760, CHUNKS[2][0] + 0.3, t, extra="ring")
        lt = t - (CHUNKS[2][0] + 0.3)
        if lt > 2.2:
            s = 0.5 + 0.5 * ease_out_back(min(1.0, (lt - 2.2) / 0.4))
            st = STAMP.resize((int(STAMP.width * s), int(STAMP.height * s)), Image.LANCZOS)
            frame.alpha_composite(st, (W // 2 - st.width // 2, 1220))
        draw_caption(frame, 2, t)
    elif CHUNKS[3][0] <= t < CHUNKS[3][1]:
        slam(frame, DEAL, W / 2, 800, CHUNKS[3][0] + 0.3, t)
        draw_caption(frame, 3, t)
    else:
        draw_endcard(frame, t)
        draw_caption(frame, 4, t)
    return frame.convert("RGB")

def concat_audio():
    lst = f"{AUDIO_DIR}/concat.txt"
    with open(lst, "w") as f:
        for i in range(1, 6):
            f.write(f"file 'c{i}.mp3'\n")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
                    "-i", lst, "-c", "copy", AUDIO], check=True, cwd=AUDIO_DIR)

def main():
    concat_audio()
    n = int(TOTAL * FPS)
    print(f"rendering {n} frames", flush=True)
    cmd = ["ffmpeg", "-y", "-v", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", AUDIO,
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
           "-c:a", "aac", "-b:a", "160k", "-shortest", MP4]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(n):
        t = i / FPS
        frame = render_frame(t)
        p.stdin.write(frame.tobytes())
        if i % 150 == 0:
            print(f"  frame {i}/{n}", flush=True)
    p.stdin.close()
    p.wait()
    print("done", MP4, flush=True)

if __name__ == "__main__":
    main()
