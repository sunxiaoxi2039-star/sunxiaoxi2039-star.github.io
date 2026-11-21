#!/usr/bin/env python3
"""Temporal QA over rendered frames: flags pops/flicker (spikes in frame-to-frame change that are not
cuts or lightning), stuck frames, and broken (empty / uniform) frames.
usage: python3 qa.py FRAMES_DIR [timeline.json]"""
import json, sys, os
import numpy as np
from PIL import Image

frames_dir = sys.argv[1]
tl = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'timeline.json')))
cuts = {s['startFrame'] for s in tl['shots']}
flash = []
for c in tl['cues']:
    if c['id'].startswith('lightning'):
        f = round(c['t'] * tl['fps']); flash.extend(range(f - 2, f + 30))
flash = set(flash)
n = tl['totalFrames']
prev = None
diffs = np.zeros(n); stats = []
for i in range(n):
    p = os.path.join(frames_dir, f'frame_{i:05d}.png')
    if not os.path.exists(p):
        stats.append(None); prev = None; continue
    im = np.asarray(Image.open(p).convert('RGB').resize((240, 135), Image.BILINEAR), dtype=np.float32) / 255.0
    stats.append((float(im.mean()), float(im.std())))
    if prev is not None: diffs[i] = float(np.abs(im - prev).mean())
    prev = im
report = {'missing': [i for i, s in enumerate(stats) if s is None], 'broken': [], 'pops': [], 'stuck': []}
for i, s in enumerate(stats):
    if s and (s[1] < 0.01 and i > 60):
        report['broken'].append(i)
for i in range(2, n - 2):
    if i in cuts or i in flash or stats[i] is None: continue
    win = diffs[max(1, i - 12):i + 13]
    med = float(np.median(win)) + 1e-4
    # a pop: a spike well above the local motion level that does not persist
    if diffs[i] > 4.0 * med and diffs[i] > 0.012 and diffs[i + 1] < 2.0 * med:
        report['pops'].append({'frame': i, 'diff': round(diffs[i], 4), 'local': round(med, 4)})
    if diffs[i] == 0.0 and i not in cuts:
        report['stuck'].append(i)
report['meanDiffByShot'] = {s['id']: round(float(diffs[s['startFrame'] + 1:s['endFrame']].mean()), 5) for s in tl['shots']}
print(json.dumps({k: (v if not isinstance(v, list) or len(v) < 40 else v[:40] + ['...']) for k, v in report.items()}, indent=1))
