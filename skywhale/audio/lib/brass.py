"""Brass 'valve' layer for the whale voices: real VSCO 2 CE horn / tuba /
trombone sustain samples rendered through sfizz_render, then bent along a
whale's own pitch contour (tape-style varispeed) so the brass sings with
the creature - the ship-like half of its voice."""
import hashlib
import os
import subprocess

import numpy as np

from . import dsp, instruments, paths
from .smf import MidiTrack

CACHE = os.path.join(paths.WORK, "brass")


def tone(instrument, key, dur, cc1=60, vel=80):
    """Render one sustained note (seconds) -> mono 48 kHz."""
    os.makedirs(CACHE, exist_ok=True)
    tag = hashlib.md5(f"{instrument}-{key}-{dur:.3f}-{cc1}-{vel}".encode()).hexdigest()[:12]
    wav = os.path.join(CACHE, f"{instrument}_{key}_{tag}.wav")
    if not os.path.exists(wav):
        mid = wav[:-4] + ".mid"
        m = MidiTrack()
        m.cc(0.0, 1, cc1)
        m.cc(0.0, 11, 127)
        m.note(0.05, 0.05 + dur, key, vel)
        m.write(mid)
        subprocess.run([paths.SFIZZ_RENDER, "--sfz", instruments.render_sfz(instrument), "--midi", mid,
                        "--wav", wav, "-s", "48000", "-q", "3", "-p", "64"], check=True, capture_output=True)
    x = dsp.mono(dsp.load(wav))
    on = int(np.argmax(np.abs(x) > np.abs(x).max() * 0.01))
    return x[on:]


def follow(instrument, contour_hz, cc1=60, center_key=None):
    """Brass line following a pitch contour.  contour_hz: per-sample target
    frequency (48 kHz) for the whole output duration."""
    contour_hz = np.asarray(contour_hz, float)
    n = len(contour_hz)
    f_med = float(np.median(contour_hz))
    if center_key is None:
        center_key = int(round(69 + 12 * np.log2(f_med / 440.0)))
    f_note = 440.0 * 2 ** ((center_key - 69) / 12.0)
    rate = contour_hz / f_note
    need = float(np.sum(rate)) / dsp.SR + 0.4
    x = tone(instrument, center_key, need, cc1=cc1)
    if len(x) < np.sum(rate) + 64:
        x = dsp.pad_to(x, int(np.sum(rate)) + 64)
    y = dsp.varispeed(x, rate)
    return dsp.pad_to(y, n)


def key_range(instrument):
    import re
    s = open(instruments.render_sfz(instrument)).read()
    lo = min(int(v) for v in re.findall(r"^lokey=(\d+)", s, re.M))
    hi = max(int(v) for v in re.findall(r"^hikey=(\d+)", s, re.M))
    return lo, hi
