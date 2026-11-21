"""Render score parts through sfizz_render (one MIDI + one SFZ per part)."""
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from . import dsp, instruments, paths


def render_part(part, log=print):
    os.makedirs(paths.MIDI_DIR, exist_ok=True)
    os.makedirs(paths.PARTS_DIR, exist_ok=True)
    mid = os.path.join(paths.MIDI_DIR, part.name + ".mid")
    wav = os.path.join(paths.PARTS_DIR, part.name + ".wav")
    part.to_midi(mid)
    sfz = instruments.render_sfz(part.instrument)
    cmd = [paths.SFIZZ_RENDER, "--sfz", sfz, "--midi", mid, "--wav", wav,
           "-s", "48000", "-q", "3", "-p", "256", "-b", "256"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"sfizz_render failed for {part.name}: {r.stderr[-2000:]}")
    return wav


def render_all(score, log=print, jobs=1):
    # Sequential on purpose: concurrent sfizz_render processes starved the
    # sfizz background file loader and dropped notes (seen on this machine).
    parts = [p for p in score.parts.values() if p.notes]
    with ThreadPoolExecutor(max_workers=jobs) as ex:
        wavs = list(ex.map(render_part, parts))
    for p, w in zip(parts, wavs):
        log(f"  rendered {p.name:9s} ({p.instrument}, {len(p.notes)} notes) -> {os.path.basename(w)}")
    return dict(zip([p.name for p in parts], wavs))


def load_part(wav, n):
    x = dsp.load(wav)
    return dsp.pad_to(x, n)
