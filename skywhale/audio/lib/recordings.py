"""Mechanical and air recordings (steam, lungs, creaking timber, moving
air) and helpers that pull material out of them.

All material is real recordings fetched by fetch_assets.py (assets.json,
CREDITS.md).  Selection inside a recording is deterministic (an `offset`
picks the piece).

SOURCE_SET selects the recordings:
  "github"  (used for the delivered mix) - everything fetchable from GitHub:
            * steam  : an air wrench (compressed-air bursts) and a firework
                       fountain's sizzle, recorded by meta-meta
                       (ImpulseResponses collection)
            * air    : firework launches / their rushing tails (meta-meta)
            * timber : VSCO 2 CE wooden guiro and ratchet (stick-slip
                       friction of wood) slowed on tape into creaking spars,
                       and a bass-drum-head rub for the groaning load
  "wws"     Work With Sounds museum recordings on Wikimedia Commons (steam
            locomotive steam release, steam iron, smithy bellows, creaking
            gallery floors, wind-turbine blades).  Preferred material, but
            Wikimedia rate-limited this build machine, so it is not used for
            the delivered mix; switch here once fetch_assets.py has them.
"""
import functools
import os

import numpy as np

from . import dsp, paths

SOURCE_SET = "github"

MM = os.path.join(paths.DOWNLOADS, "metameta_fx")
VS = paths.VSCO_DIR
COMMONS = os.path.join(paths.DOWNLOADS, "commons")

FILES = {
    # github set
    "airwrench": os.path.join(MM, "2019-04-9-IDS-center-airwrench.wav"),
    "sizzle": os.path.join(MM, "2019-07-04--Firework-sizzle.wav"),
    "pshoow": os.path.join(MM, "22-pshoow.wav"),
    "psha": os.path.join(MM, "09-psha-ah-vooh.wav"),
    "pshah": os.path.join(MM, "20-pshah-ah-ah-ah-ah-ah-ah.wav"),
    "guiro": os.path.join(VS, "VSCO 1 Percussion", "varWood", "guiro_superlong.wav"),
    "guiro_b": os.path.join(VS, "VSCO 1 Percussion", "varWood", "guiro_long.wav"),
    "ratchet": os.path.join(VS, "VSCO 1 Percussion", "varWood", "ratchet1.wav"),
    "drum_rub": os.path.join(VS, "Percussion", "bassdrum_rub3_v1.wav"),
    "drum_rub_b": os.path.join(VS, "Percussion", "bassdrum_rub1_v1.wav"),
    # wws set
    "steam_release": os.path.join(COMMONS, "WWS_SteamlocomotiveS06-018Steamrelease.ogg"),
    "steam_iron": os.path.join(COMMONS, "WWS_SteamIron.ogg"),
    "bellows": os.path.join(COMMONS, "WWS_Smithyblacksmithbellows1.ogg"),
    "creak_floor": os.path.join(COMMONS, "WWS_Creakingfloors.ogg"),
    "air_turbine": os.path.join(COMMONS, "WWS_WindTurbine.ogg"),
}

MISSING = set()


def available(key):
    return os.path.exists(FILES[key])


@functools.lru_cache(maxsize=None)
def load(key):
    if not available(key) and os.environ.get("SKYWHALE_ALLOW_MISSING") == "1":
        # development only: a missing recording contributes silence (never a
        # synthetic substitute); build_audio.py flags such a build
        MISSING.add(key)
        return np.zeros(dsp.SR * 4)
    x = dsp.load(FILES[key], mono=True)
    return dsp.highpass(x, 30.0, order=2)


def _norm(y):
    return y / (np.abs(y).max() + 1e-12)


@functools.lru_cache(maxsize=None)
def active(key, rel_db=-30.0, min_len=0.05):
    """Concatenation of the active stretches of a recording."""
    x = load(key)
    e = dsp.short_env(x, 0.02)
    if e.max() <= 0:
        return np.zeros(0)
    on = e > e.max() * 10 ** (rel_db / 20.0)
    from scipy.ndimage import binary_opening
    on = binary_opening(on, structure=np.ones(int(min_len * dsp.SR)))
    return x[on]


def take(key, n, offset=0.0, rel_db=-30.0):
    a = active(key, rel_db)
    if len(a) == 0:
        return np.zeros(n)
    if len(a) < n + 64:
        # stretch short material on tape rather than looping it audibly
        a = dsp.varispeed(a, max(0.35, len(a) / (n + 64)))
        a = dsp.pad_to(a, n + 64)
    s = int(offset * dsp.SR * 0.37) % max(1, len(a) - n)
    return _norm(a[s:s + n].copy())


def _from(x, start_s, n):
    y = x[int(start_s * dsp.SR):]
    if len(y) < n + 64:
        y = dsp.varispeed(y, len(y) / (n + 64))
    return dsp.pad_to(y, n)


# ----------------------------------------------------------------- steam

def steam(kind, n, offset=0.0):
    """'release': a full-bodied blast of pressurised air; 'hiss': a thinner
    sizzle.  github set: air wrench / firework fountain sizzle."""
    if SOURCE_SET == "wws":
        if kind == "release":
            return take("steam_release", n, offset, rel_db=-14.0)
        return take("steam_iron", n, offset, rel_db=-18.0)
    if kind == "release":
        y = take("airwrench", n, offset, rel_db=-24.0)
        y = dsp.lowpass(y, 7000, order=4)
        y = dsp.peaking(y, 4318.0, -10.0, q=6.0)      # tame the tool's whine
    else:
        y = _from(load("sizzle"), 1.25 + (offset % 0.6), n)   # the sizzle after the crackles
        y = dsp.peaking(y, 4060.0, -8.0, q=6.0)
    return _norm(y)


# ----------------------------------------------------------------- lungs

def bellows(kind, n, offset=0.0):
    """Air pushed out ('push') or drawn in ('pull', the same material
    reversed in time: a swell of air)."""
    if SOURCE_SET == "wws":
        y = take("bellows", n, offset, rel_db=-20.0)
    else:
        key = ("psha", "pshah", "pshoow")[int(abs(offset) * 3) % 3]
        y = _from(load(key), 0.18, n)                # skip the launch pop: keep the rushing air
        y = dsp.lowpass(y, 9000, order=2)
    if kind == "pull":
        y = y[::-1]
    return _norm(y)


# ----------------------------------------------------------------- timber

def creak(n, strength=1.0, offset=0.0):
    """Creaking timber under load: real wood-on-wood friction (a slowly
    scraped wooden guiro / a wooden ratchet) lowered on tape so the
    stick-slip clicks become the slow creak of massive spars, with a slight
    glide in the creak's pitch, plus a bass-drum-head rub for the groan of
    the load."""
    if SOURCE_SET == "wws":
        r = 2 ** (-(4.0 + 4.0 * (strength - 1.0)) / 12.0)
        raw = take("creak_floor", int(n * r) + 64, offset * 1.7, rel_db=-20.0)
        return _norm(dsp.highpass(dsp.pad_to(dsp.varispeed(raw, r), n), 60, order=2))
    # native stick-slip click rates of the recordings (measured): the guiro
    # scraped very slowly ~103 Hz, the long guiro scrape ~21 Hz
    key, native = (("guiro", 103.0), ("guiro_b", 20.6))[int(abs(offset)) % 2]
    x = load(key)
    target = 26.0 + 8.0 * (2.0 - strength)            # heavier spar -> slower creak
    base = target / native
    t = np.linspace(0, 1, n)
    glide = 1.0 + 0.3 * np.sin(np.pi * t) * (1 if int(offset * 3) % 2 else -1)
    rate = base * glide                                # the creak's pitch bends as the load moves
    need = int(np.sum(rate)) + 64
    src = x[int(np.argmax(np.abs(x) > np.abs(x).max() * 0.05)):]
    while len(src) < need:
        src = np.concatenate([src, src[::-1]])       # scrape back and forth
    s0 = int(offset * 1931) % max(1, len(src) - need)
    y = dsp.pad_to(dsp.varispeed(src[s0:s0 + need], rate), n)
    y = dsp.bandpass(y, 180, 2600, order=2)
    y = dsp.peaking(y, 650.0, 6.0, q=1.4)            # wooden body resonance
    env = np.sin(np.pi * np.clip(t * 1.15, 0, 1)) ** 0.7  # tension builds, then lets go
    rub = _from(load("drum_rub" if int(offset) % 2 else "drum_rub_b"), 0.8, int(n * 0.7) + 64)
    rub = dsp.lowpass(dsp.pad_to(dsp.varispeed(rub, 0.7), n), 1200, order=2)
    y = _norm(y) * env + 0.25 * _norm(rub) * env
    return _norm(dsp.highpass(y, 60, order=2))


# ----------------------------------------------------------------- air

def air(n, offset=0.0):
    """Moving air for whooshes: the rushing tails of firework launches
    (github set) / wind-turbine blades (wws set)."""
    if SOURCE_SET == "wws":
        return take("air_turbine", n, offset, rel_db=-20.0)
    key = ("pshoow", "psha", "pshah")[int(abs(offset)) % 3]
    y = _from(load(key), 0.12, n)
    return _norm(dsp.peaking(y, 4000.0, -8.0, q=5.0))


# ----------------------------------------------------------------- crack

def crack(y, grain=0.06, seed=7):
    """'Cracked' old voice: granular re-arrangement of the signal's own
    grains (small backward jumps, stutters and drop-outs).  Deterministic."""
    rng = np.random.default_rng(seed)
    g = int(grain * dsp.SR)
    hop = g // 2
    w = np.hanning(g)
    out = np.zeros(len(y) + g)
    pos = 0
    k = 0
    while pos < len(y) - g:
        src = pos
        r = rng.random()
        if r < 0.2:
            src = max(0, pos - int(rng.integers(1, 4)) * hop)   # stutter back
        amp = 0.2 if r > 0.88 else 1.0                         # crack/drop
        out[k:k + g] += y[src:src + g] * w * amp
        pos += hop
        k += hop
    return out[:len(y)]
