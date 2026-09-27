import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches

BG = "#08090C"; FG = "#EDE8E0"; ORANGE = "#FF4D2E"; DIM = "#3a3d44"

labels = ["W1","W2","W3","W4","W5","W6","W7","BYE","W9","W10","W11","W12","W13","W14","W15","W16","W17","W18","W1'26"]
tds = [1,2,2,3,3,1,5,None,4,4,2,3,2,3,2,3,2,4,0]

fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
fig.subplots_adjust(left=0.07, right=0.96, top=0.72, bottom=0.14)

xs = list(range(len(labels)))
for x, t in zip(xs, tds):
    if t is None:
        ax.text(x, 0.3, "BYE", ha="center", va="bottom", color=DIM, fontsize=9)
        continue
    if t == 0:
        rect = patches.Rectangle((x-0.32, 0.05), 0.64, 0.6, linewidth=2.5, edgecolor=ORANGE, facecolor="none")
        ax.add_patch(rect)
        ax.text(x, 0.35, "0", ha="center", va="center", color=ORANGE, fontsize=16, weight="bold")
    else:
        ax.bar(x, t, width=0.64, color=ORANGE, edgecolor="none")

ax.set_xlim(-0.8, len(labels)-0.2)
ax.set_ylim(0, 5.8)
ax.set_xticks([x for x, t in zip(xs, tds) if t is not None])
ax.set_xticklabels([l for l, t in zip(labels, tds) if t is not None], color="#8a8d94", fontsize=9)
ax.set_yticks([1,2,3,4,5]); ax.set_yticklabels(["1","2","3","4","5"], color="#8a8d94", fontsize=10)
ax.set_ylabel("Pass TDs", color="#8a8d94", fontsize=11)
for spine in ax.spines.values(): spine.set_visible(False)
ax.tick_params(left=False, bottom=False)
ax.yaxis.grid(True, color="#1c1e24", linewidth=0.8)
ax.set_axisbelow(True)

fig.text(0.06, 0.94, "THE OUTLIER, NOT THE NORM", color=FG, fontsize=26, weight="bold", va="top", ha="left")
fig.text(0.06, 0.86, "Stafford threw a TD in all 17 games last season (15 with 2+).\nLast week was his first blank. Over 1.5 is betting that was the glitch.",
         color="#b9bcc2", fontsize=13, va="top", ha="left", linespacing=1.5)
fig.text(0.96, 0.02, "GALAXY SPORTS EDGE", color=DIM, fontsize=10, weight="bold", va="bottom", ha="right")

out = "/home/hatch/workspace/your_files/stafford-outlier-2026-09-21.png"
plt.savefig(out, facecolor=BG)
print("saved", out)
