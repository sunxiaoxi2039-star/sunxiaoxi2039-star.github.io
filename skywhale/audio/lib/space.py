"""Acoustic space and sound perspective.

Reverbs are convolutions with impulse responses recorded in real spaces
(balloon pops / firecrackers from the GitHub user meta-meta's
ImpulseResponses collection): the 30th Street Station hall
for the music and the diffuse distance tail, and an outdoor recording in
Silver Bay woods whose late terrain echoes give far sounds their open,
landscape-scale space.

place() puts a dry event at a distance:
  near  = louder, full bandwidth, wide, mostly dry
  far   = quieter, darker (air-absorption low-pass), narrower, more wet
  in cloud = additionally muffled (low-pass) and more diffuse
"""
import functools
import os

import numpy as np

from . import dsp, paths

IR_DIR = os.path.join(paths.DOWNLOADS, "ir_metameta")
IR_FILES = {
    "station": "2018-11-28-30th-St-Station.wav",
    "woods": "2021-05-01--Silver-Bay-Woods.wav",
}


@functools.lru_cache(maxsize=None)
def ir_raw(name):
    x = dsp.load(os.path.join(IR_DIR, IR_FILES[name]))
    x = dsp.to_stereo(x[:, :2] if x.ndim == 2 else x)
    pk = int(np.argmax(np.abs(x).max(axis=1)))
    return x[pk:]


def _strip_direct(ir, t_cut=0.004, t_fade=0.006):
    """Remove the direct sound so the IR is a pure reverb send."""
    y = ir.copy()
    a, b = int(t_cut * dsp.SR), int((t_cut + t_fade) * dsp.SR)
    y[:a] = 0
    w = dsp.raised_cos(b - a)
    y[a:b] *= w[:, None]
    return y


def _shorten(ir, rt_target, rt_orig):
    """Re-shape the decay of a recorded IR to a shorter RT60 by applying
    an exponential envelope (60 dB per RT)."""
    t = np.arange(len(ir)) / dsp.SR
    k = 6.91 * (1.0 / rt_target - 1.0 / rt_orig)  # ln(1000) = 6.91
    return ir * np.exp(-k * t)[:, None]


@functools.lru_cache(maxsize=None)
def ir_hall():
    """Music reverb: the station hall, decay shortened to ~2.3 s."""
    ir = _strip_direct(ir_raw("station"))
    ir = _shorten(ir, 2.3, 3.7)
    ir = dsp.highpass(ir, 160, order=2)
    ir = dsp.lowpass(ir, 7500, order=2)
    n = int(3.2 * dsp.SR)
    ir = _tail_fade(dsp.pad_to(ir, n), 0.4)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def _tail_fade(ir, t):
    n = int(t * dsp.SR)
    w = np.ones(len(ir))
    w[-n:] = dsp.raised_cos(n)[::-1]
    return ir * w[:, None]


@functools.lru_cache(maxsize=None)
def ir_sky():
    """Distance reverb for voices/air: diffuse station tail (darker, ~3 s)
    plus the outdoor woods IR's late terrain echoes."""
    hall = _strip_direct(ir_raw("station"))
    hall = _shorten(hall, 3.0, 3.7)
    hall = dsp.lowpass(hall, 5000, order=2)
    woods = _strip_direct(ir_raw("woods"), t_cut=0.01)
    woods = dsp.highpass(woods, 120, order=2)
    n = int(3.6 * dsp.SR)
    hall = dsp.pad_to(hall, n)
    woods = dsp.pad_to(woods, n)
    hall /= np.sqrt(np.sum(hall ** 2))
    woods /= np.sqrt(np.sum(woods ** 2))
    ir = 0.8 * hall + 0.6 * woods
    ir = _tail_fade(ir, 0.5)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


# ------------------------------------------------------------ perspective
REF_DIST = 40.0


def persp(dist):
    """Perspective parameters for a distance in metres."""
    d = max(5.0, float(dist))
    gain_db = -15.0 * np.log10(d / REF_DIST)                 # -4.5 dB per doubling
    lp = float(np.clip(15000.0 * (d / 25.0) ** -0.5, 1500.0, 16000.0))  # air absorption
    wet_db = float(np.clip(-16.0 + 11.0 * np.log10(d / 25.0), -18.0, 2.0))
    width = float(np.clip(1.0 - 0.38 * np.log10(d / 25.0), 0.22, 1.0))
    predelay = float(np.clip(0.008 + 0.012 * np.log10(d / 25.0), 0.005, 0.04))
    return dict(dist=d, gain_db=gain_db, lp=lp, wet_db=wet_db, width=width, predelay=predelay)


def place(dry, dist, cloud=0.0, pan=0.0, extra_gain_db=0.0, reverb=True, tail=3.6):
    """Render a dry (mono or stereo) event at a distance.  `cloud` is either
    a float (0..1 in-cloud amount) or an array per output sample.
    Returns stereo, length len(dry) + tail."""
    p = persp(dist)
    x = dsp.to_stereo(dry) if dry.ndim == 2 else dry
    n = len(x) + int(tail * dsp.SR)
    x = dsp.pad_to(x, n)
    direct = dsp.lowpass(x, p["lp"], order=2)
    direct = dsp.shelf(direct, 4000.0, -2.0 * np.log2(max(1.0, p["dist"] / 40.0)), kind="high")
    direct = dsp.to_stereo(direct)
    if reverb:
        send = dsp.lowpass(x, min(p["lp"], 9000.0), order=2)
        wet = dsp.convolve(dsp.mono(dsp.to_stereo(send)), ir_sky())[:n]
        pd = int(p["predelay"] * dsp.SR)
        wet = np.concatenate([np.zeros((pd, 2)), wet[:n - pd]])
        # equal-energy balance of direct/wet, then overall distance gain
        wg = dsp.undb(p["wet_db"])
        out = direct / np.sqrt(1 + wg ** 2) + wet * wg / np.sqrt(1 + wg ** 2)
    else:
        out = direct
    out = dsp.width(out, p["width"])
    out = dsp.pan(out, pan)
    if np.ndim(cloud) or cloud > 0:
        m = np.asarray(cloud, float)
        if m.ndim:
            m = dsp.pad_to(m, n) if len(m) < n else m[:n]
            m = m[:, None]
        muff = dsp.lowpass(out, 650.0, order=2)
        muff = dsp.lowpass(muff, 1800.0, order=1)
        mwet = dsp.convolve(dsp.mono(muff), ir_sky())[:n] * 0.35
        muff = muff * dsp.undb(-1.5) + mwet
        out = (1 - m) * out + m * muff * dsp.undb(-2.5)
    return out * dsp.undb(p["gain_db"] + extra_gain_db)
