#!/usr/bin/env python3
"""Localized pop detector. Compares every 64 px tile (at 1080p) with that tile's own local
motion level over time, so it flags small pops that a whole-frame average hides (a sail, a
puff, a sea dash). Frames are streamed, so the whole film fits in memory. Cuts and lightning
windows from the timeline are skipped.
usage: python3 tileqa.py FRAMES_DIR [START END] [timeline.json]
output: one line per flagged frame: (frame, tiles flagged, peak tile diff, [tile x,y ...])"""
import json, os, sys
import numpy as np
from PIL import Image

d = sys.argv[1]
a = int(sys.argv[2]) if len(sys.argv) > 3 else 0
tl = json.load(open(sys.argv[4] if len(sys.argv) > 4 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'timeline.json')))
b = int(sys.argv[3]) if len(sys.argv) > 3 else tl['totalFrames']
cuts = {s['startFrame'] for s in tl['shots']}
flash = set()
for c in tl['cues']:
    if c['id'].startswith('lightning'):
        f = round(c['t'] * tl['fps']); flash.update(range(f - 2, f + 30))

T = 16
tiles, idx, prev = [], [], None
for i in range(a, b):
    p = os.path.join(d, f'frame_{i:05d}.png')
    if not os.path.exists(p):
        prev = None; continue
    im = np.asarray(Image.open(p).convert('L').resize((480, 272), Image.BILINEAR), dtype=np.float32) / 255.0
    if prev is not None:
        df = np.abs(im - prev).reshape(272 // T, T, 480 // T, T).mean(axis=(1, 3))
        tiles.append(df); idx.append(i)          # change from frame i-1 to frame i
    prev = im
out = []
if tiles:
    tiles = np.stack(tiles); n = len(idx)
    for k in range(2, n - 2):
        f = idx[k]
        if f in cuts or f in flash or idx[k + 1] != f + 1:
            continue
        lo, hi = max(0, k - 12), min(n, k + 13)
        med = np.median(tiles[lo:hi], axis=0) + 2e-3
        m = (tiles[k] / med > 6) & (tiles[k] > 0.03) & (tiles[k + 1] / med < 3)
        if m.any():
            ys, xs = np.nonzero(m)
            out.append((f, int(m.sum()), round(float(tiles[k][m].max()), 3), [(int(x) * T * 4, int(y) * T * 4) for y, x in zip(ys[:3], xs[:3])]))
print(len(out), 'frames with localized spikes')
for o in out:
    print(o)
