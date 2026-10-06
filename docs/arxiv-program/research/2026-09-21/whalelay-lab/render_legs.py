import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

BG = "#08090C"; FG = "#EDE8E0"; ORANGE = "#FF4D2E"; DIM = "#3a3d44"; GREEN = "#3ddc84"
EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

# (emoji, label, games, hits)
legs = [
    ("\U0001F512", "T. Johnson O0.5 rec", 15, 14),
    ("\U0001F525", "Stafford O1.5 pass TDs", 17, 15),
    ("\U0001F512", "Adams 4+ rec", 14, 12),
    ("\U0001F40F", "Rams -5.5", 17, 10),
    ("\u23F1\uFE0F", "Rams 1Q ML", 17, 8),
    ("\U0001F9B5", "Mevis 2+ FGs", 9, 4),
    ("\U0001F64F", "Corum O0.5 rec", 17, 7),
    ("\U0001F3B2", "Likely 30+ yds*", 12, 3),
]
legs = sorted(legs, key=lambda x: x[3] / x[2], reverse=True)
names = [l[1] for l in legs]
emojis = [l[0] for l in legs]
rates = [l[3] / l[2] * 100 for l in legs]

fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
fig.subplots_adjust(left=0.26, right=0.94, top=0.74, bottom=0.16)

ys = list(range(len(names)))[::-1]
colors = [GREEN if r >= 80 else ORANGE if r >= 50 else "#c9a227" for r in rates]

ax.barh(ys, rates, height=0.55, color=colors, edgecolor="none")
for y, (e, nm, n, h), r in zip(ys, legs, rates):
    ax.text(r + 1.5, y, f"{r:.0f}%  ({h}/{n})", va="center", ha="left", color="#b9bcc2", fontsize=11)

ax.set_yticks(ys); ax.set_yticklabels(names, color=FG, fontsize=12)
ax.set_xlim(0, 122); ax.set_xlabel("2025 hit rate", color="#8a8d94", fontsize=11)
ax.set_xticks([0, 25, 50, 75, 100]); ax.set_xticklabels(["0%","25%","50%","75%","100%"], color="#8a8d94")
for spine in ax.spines.values(): spine.set_visible(False)
ax.tick_params(left=False, bottom=False)
ax.xaxis.grid(True, color="#1c1e24", linewidth=0.8); ax.set_axisbelow(True)

title = fig.text(0.06, 0.94, "WHALELAY LEG CHECK", color=FG, fontsize=26, weight="bold", va="top", ha="left")
fig.text(0.06, 0.875, "#MNF", color=ORANGE, fontsize=14, weight="bold", va="top", ha="left")
fig.text(0.06, 0.80, "How often each leg hit last season. Naive all-8 (if independent): 0.9% — about 1 in 112.\nReality is better: the legs are correlated (blowout script), but the books price that in.",
         color="#b9bcc2", fontsize=12, va="top", ha="left", linespacing=1.5)
fig.text(0.06, 0.04, "*Likely was on BAL last year; now a Giant — went 8/78 in Week 1. Mevis: 9-game sample.", color=DIM, fontsize=10, va="bottom", ha="left")
fig.text(0.94, 0.04, "GALAXY SPORTS EDGE", color=DIM, fontsize=10, weight="bold", va="bottom", ha="right")

fig.canvas.draw()
W, H = fig.canvas.get_width_height()

# collect label + title geometry in display coords (origin bottom-left)
label_boxes = [(t.get_window_extent(), e) for t, e in zip(ax.get_yticklabels(), emojis)]
title_box = title.get_window_extent()

out = "/home/hatch/workspace/your_files/whalelay-leg-odds-2026-09-21.png"
plt.savefig(out, facecolor=BG)
plt.close(fig)

# PIL overlay: emoji PNGs pasted at label positions
img = Image.open(out).convert("RGBA")
EMOJI_DIR = "/home/hatch/workspace/gse-lab/whalelay/emoji"
order = ["lock", "fire", "lock", "ram", "stopwatch", "leg", "pray", "die"]  # matches sorted legs
min_x0 = min(box.x0 for box, _ in label_boxes)
for (box, _), ename in zip(label_boxes, order):
    em = Image.open(f"{EMOJI_DIR}/{ename}.png").convert("RGBA")
    h = 26
    em = em.resize((int(em.width * h / em.height), h), Image.LANCZOS)
    cx_display = (box.y0 + box.y1) / 2
    y_img = int(H - cx_display - h / 2)
    img.alpha_composite(em, (int(min_x0 - em.width - 12), y_img))
# whale after title
wh = Image.open(f"{EMOJI_DIR}/whale.png").convert("RGBA")
wh_h = 36
wh = wh.resize((int(wh.width * wh_h / wh.height), wh_h), Image.LANCZOS)
img.alpha_composite(wh, (int(title_box.x1 + 12), int(H - (title_box.y0 + title_box.y1) / 2 - wh_h / 2)))
img.convert("RGB").save(out)
print("saved", out)
