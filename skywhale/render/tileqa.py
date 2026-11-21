#!/usr/bin/env python3
"""Localized pop detector: compares every 64 px tile (at 1080p) with its own local temporal motion
level, so small pops that a whole-frame average hides (a sail, a puff, a sea dash) are flagged.
usage: python3 tileqa.py FRAMES_DIR START END   -> (frame, tiles, peak diff, [tile x,y ...])"""
import sys, os, numpy as np
from PIL import Image
d, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
T = 16; ims = []; idx = []
for i in range(a, b):
    p = os.path.join(d, f'frame_{i:05d}.png')
    if not os.path.exists(p): continue
    im = np.asarray(Image.open(p).convert('L').resize((480, 272), Image.BILINEAR), dtype=np.float32) / 255.0
    ims.append(im); idx.append(i)
ims = np.stack(ims)
df = np.abs(np.diff(ims, axis=0))                      # (n-1, H, W): diff between idx[k] and idx[k+1]
tiles = df.reshape(df.shape[0], 272 // T, T, 480 // T, T).mean(axis=(2, 4))
n = tiles.shape[0]; out = []
for k in range(2, n - 2):
    lo, hi = max(0, k - 12), min(n, k + 13)
    med = np.median(tiles[lo:hi], axis=0) + 2e-3
    r = tiles[k] / med
    nxt = tiles[k + 1] / med
    m = (r > 6) & (tiles[k] > 0.03) & (nxt < 3)
    if m.any():
        ys, xs = np.nonzero(m)
        out.append((idx[k + 1], int(m.sum()), round(float(tiles[k][m].max()), 3), [(int(x) * T * 4, int(y) * T * 4) for y, x in zip(ys[:3], xs[:3])]))
print(len(out), 'frames with localized spikes'); [print(o) for o in out[:40]]
