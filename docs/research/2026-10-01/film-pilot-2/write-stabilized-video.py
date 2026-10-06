#!/usr/bin/env python3
"""Write stabilized video: warp each frame by H_ref_curr so the camera is still."""
import json, sys
import cv2
import numpy as np

STAB = sys.argv[1]
VIDEO = sys.argv[2]
OUT = sys.argv[3]

frames = {}
with open(STAB) as f:
    for line in f:
        r = json.loads(line)
        frames[r["frameIndex"]] = r

cap = cv2.VideoCapture(VIDEO)
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
FPS = cap.get(cv2.CAP_PROP_FPS)
fourcc = cv2.VideoWriter_fourcc(*"mp4v")
out = cv2.VideoWriter(OUT, fourcc, FPS, (W, H))

# stabilize.py sampled at 5fps; map each video frame to nearest sampled frame's H
sampled = sorted(frames.values(), key=lambda r: r["t"])
fi = 0
n = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break
    t = fi / FPS
    # nearest sampled frame <= t
    ref = sampled[0]
    for r in sampled:
        if r["t"] <= t + 1e-9:
            ref = r
        else:
            break
    Hmat = np.array(ref["H"], dtype=np.float64).reshape(3, 3)
    warped = cv2.warpPerspective(frame, Hmat, (W, H),
                                 borderMode=cv2.BORDER_REPLICATE)
    out.write(warped)
    fi += 1
    n += 1
cap.release()
out.release()
print(f"wrote {n} stabilized frames -> {OUT}")
