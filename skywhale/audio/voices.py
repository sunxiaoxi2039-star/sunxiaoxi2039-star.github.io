"""SKY WHALE - whale voices.

Each voice is built from REAL recordings only:
  * humpback song units recorded by the U.S. National Park Service
    hydrophone in Glacier Bay (public domain), cleaned and re-pitched /
    stretched (lib/whale.py),
  * a brass layer: real VSCO 2 CE horn / trombone / tuba sustain samples
    rendered by sfizz and bent along the whale's own pitch contour
    (lib/brass.py) - the 'brass valves' of a creature that is also a ship,
  * steam and lungs: recorded compressed-air bursts (an air wrench), a
    firework fountain's sizzle and the rushing air of firework launches
    (lib/recordings.py),
  * creaking timber: real wood-on-wood friction (VSCO 2 CE wooden guiro /
    ratchet) slowed on tape into the creak of massive spars, with a
    bass-drum-head rub for the groan of the load.

Nothing here generates a tone: every sample comes from a recording and is
only cut, filtered, re-pitched, stretched, layered, enveloped and
convolved.

Every builder returns (mono_signal_48k, onset_index): onset_index is the
sample that must land on the cue (the start of the voice's attack).
"""
import numpy as np

from lib import brass, dsp, whale
from lib import recordings as rec

SR = dsp.SR

# --------------------------------------------------------------------------
# humpback units: (file, t0, t1) - chosen from an automatic unit catalogue
# of the NPS recordings (see docs) by shape.
NPS_A = "11_13_2020_03_48_13"
NPS_B = "11_13_2020_03_53_13"
NPS_D = "11_13_2020_04_03_13"
NPS_E = "11_13_2020_04_13_13"
NPS_G = "11_13_2020_04_23_13"
GLBA = "librosa"

UNITS = {
    "low_moan":      (GLBA, 8.742, 10.391),    # ~300 Hz, rich harmonics
    "rising_call":   (GLBA, 31.463, 32.578),   # upsweep ~280 -> 1000 Hz
    "arch":          (NPS_D, 108.693, 109.83),  # 470 -> 700 -> 340 Hz
    "moan_rich":     (GLBA, 1.08, 2.775),       # ~300 Hz, many harmonics
    "upsweep_a":     (GLBA, 37.291, 38.394),    # 200 -> 900 Hz
    "arch_b":        (NPS_B, 72.458, 73.561),   # arched ~450 Hz
    "curve_up":      (NPS_B, 97.477, 98.383),
    "moan_fall":     (GLBA, 15.081, 17.043),    # 880 -> 260 Hz fall, low moan
    "upsweep_b":     (NPS_E, 78.913, 79.679),
    "steady":        (NPS_B, 12.783, 14.071),   # steady ~750-860 Hz
    "cry":           (GLBA, 24.961, 26.773),    # ~990 Hz held cry
    "upsweep_c":     (GLBA, 47.88, 48.843),     # 200 -> 950 Hz
    "fall_quick":    (NPS_D, 85.124, 85.833),
    "cry_fall":      (GLBA, 18.68, 20.399),     # 1230 -> 970 Hz
    "gentle":        (NPS_G, 187.35, 188.453),  # soft arch ~600 Hz
    "bright_rise":   (NPS_D, 79.052, 79.714),   # low + rising high partial
    "hum_low":       (NPS_A, 153.948, 154.947), # steady ~340 Hz
    "squeak":        (NPS_E, 40.565, 41.192),   # high ~2.7 kHz
    "bright_rise_b": (NPS_D, 73.828, 74.443),
    "hum_rich":      (NPS_B, 83.743, 84.973),   # steady ~340 Hz, rich
    "chirp_hi":      (NPS_E, 52.198, 52.849),
}


def unit_path(src):
    return whale.librosa_glba() if src == GLBA else whale.nps(src)


def get_unit(name, **kw):
    src, t0, t1 = UNITS[name]
    return whale.unit(unit_path(src), t0, t1, **kw)


# --------------------------------------------------------------------------
# helpers

def onset_of(y, rel_db=-30.0, win=0.005):
    e = dsp.short_env(y, win)
    thr = e.max() * 10 ** (rel_db / 20.0)
    return int(np.argmax(e > thr))


def trim_to_onset(y, pre=0.02):
    """Cut leading silence so the attack starts `pre` s after index 0."""
    on = onset_of(y)
    a = max(0, on - int(pre * SR))
    y = y[a:].copy()
    y = dsp.fade(y, fin=min(pre, 0.01), fout=0.06)
    return y, on - a


def contour(y, fmin=60, fmax=3200, smooth=7):
    """Smooth dominant-partial contour of y (Hz per output sample) and the
    frame envelope used to weight it."""
    t, f, lv = whale.f0_track(y, fmin=fmin, fmax=fmax)
    good = lv > lv.max() - 24
    if good.sum() < 3:
        good = lv > lv.max() - 40
    # hold the last valid value through gaps (no glides across silences)
    idx = np.where(good)[0]
    pos = np.searchsorted(idx, np.arange(len(f)), side="right") - 1
    f = f[idx[np.clip(pos, 0, len(idx) - 1)]]
    from scipy.ndimage import median_filter, uniform_filter1d
    f = median_filter(f, smooth)
    # octave-jump repair against the running median
    med = median_filter(f, 31)
    ratio = f / med
    f = np.where(ratio > 1.7, f / 2, np.where(ratio < 0.59, f * 2, f))
    f = uniform_filter1d(f, 5)
    tt = np.arange(len(y)) / SR
    return np.interp(tt, t, f)


def tuned_shift(y, target_pcs, fmin=60, fmax=3200):
    """Semitone shift that puts the unit's median pitch on the nearest
    pitch class in target_pcs (0=C ... 11=B)."""
    c = contour(y, fmin, fmax)
    e = dsp.short_env(y, 0.02)
    w = e > e.max() * 0.3
    f_med = float(np.median(c[w])) if w.any() else float(np.median(c))
    m = 69 + 12 * np.log2(f_med / 440.0)
    best = min((abs((m - (pc + 12 * k))), (pc + 12 * k) - m) for pc in target_pcs for k in range(-2, 12))
    return best[1]


def transform(y, semis=0.0, stretch=1.0):
    """Tape varispeed by `semis` (changes duration by 2^(-semis/12)) then a
    phase-vocoder stretch so the final length is len*stretch."""
    r = 2 ** (semis / 12.0)
    z = dsp.varispeed(y, r) if abs(semis) > 1e-3 else y
    target = stretch * len(y)
    pv = target / len(z)
    if abs(pv - 1) > 0.02:
        z = dsp.time_stretch(z, pv, n_fft=4096, hop=256)
    return z


def env_follow(y, attack=0.01, release=0.12):
    e = np.abs(dsp.mono(y))
    out = np.zeros_like(e)
    a = np.exp(-1.0 / (attack * SR))
    r = np.exp(-1.0 / (release * SR))
    acc = 0.0
    # vectorised one-pole follower on a decimated signal for speed
    dec = 48
    ed = e[: len(e) // dec * dec].reshape(-1, dec).max(axis=1)
    od = np.zeros_like(ed)
    ad, rd = a ** dec, r ** dec
    for i, v in enumerate(ed):
        acc = (ad if v > acc else rd) * acc + (1 - (ad if v > acc else rd)) * v
        od[i] = acc
    out[: len(od) * dec] = np.repeat(od, dec)
    return out / (out.max() + 1e-12)


def brass_layer(y, instrument, octave=0, cc1=55, gain_db=-15.0, lp=None):
    """A real brass sample bent along y's contour (optionally octaves
    below) and shaped by y's envelope."""
    c = contour(y) * 2 ** octave
    lo, hi = brass.key_range(instrument)
    fmin_i, fmax_i = 440 * 2 ** ((lo - 69) / 12), 440 * 2 ** ((hi - 69) / 12)
    while np.median(c) > fmax_i:
        c = c / 2
    while np.median(c) < fmin_i:
        c = c * 2
    b = brass.follow(instrument, c, cc1=cc1)
    # the brass only speaks while the whale does: a gated, slightly
    # expanded copy of the whale's own envelope
    e = env_follow(y, 0.02, 0.08)
    g = np.clip((dsp.db(e + 1e-9) + 30.0) / 30.0, 0.0, 1.0) ** 1.5
    b = b * e * g
    if lp:
        b = dsp.lowpass(b, lp, order=2)
    b = b / (np.abs(b).max() + 1e-12)
    return b * dsp.undb(gain_db)


def steam_layer(n, env, kind="hiss", gain_db=-20.0, bp=(900, 7000), seed_t=0.0):
    """Steam noise (real recording) shaped by an envelope."""
    s = rec.steam(kind, n, offset=seed_t)
    s = dsp.bandpass(s, bp[0], bp[1], order=2)
    s = s / (np.abs(s).max() + 1e-12)
    return s * dsp.pad_to(env, n) * dsp.undb(gain_db)


def normalize(y, peak_db=-1.0):
    return dsp.normalize_peak(y, peak_db)


def mix(*layers):
    n = max(len(l) for l in layers)
    out = np.zeros(n)
    for l in layers:
        out[:len(l)] += l
    return out


def concat(parts, xfade=0.06):
    """Join (signal, gap_seconds_after) pieces with short crossfades."""
    out = np.zeros(0)
    for sig, gap in parts:
        if len(out) == 0:
            out = sig.copy()
        else:
            nx = int(xfade * SR)
            if gap >= 0:
                out = np.concatenate([out, np.zeros(int(gap * SR)), sig])
            else:
                ov = min(int(-gap * SR), len(out), len(sig))
                head = out[:-ov] if ov else out
                lap = out[len(out) - ov:] + sig[:ov]
                out = np.concatenate([head, lap, sig[ov:]])
    return out


# --------------------------------------------------------------------------
# VOICES (pitch classes used for tuning: D major pentatonic D E F# A B)
PENTA = [2, 4, 6, 9, 11]
D_A = [2, 9]


def wake_song(variant=1):
    """Waking song: a two-unit phrase, deep and slow; brass in the horn."""
    if variant == 1:
        a = get_unit("arch")
        a = normalize(transform(a, tuned_shift(a, PENTA) - 12, 1.15))
        b = get_unit("arch_b", lp=2400)
        b = normalize(transform(b, tuned_shift(b, PENTA) - 12, 1.2))
        a = mix(a, brass_layer(a, "hn_sus", octave=0, cc1=50, gain_db=-14))
        b = mix(b, brass_layer(b, "hn_sus", octave=0, cc1=50, gain_db=-14))
        w = concat([(a, -0.15), (b, 0)])
    else:
        a = get_unit("upsweep_c")
        a = normalize(transform(a, tuned_shift(a, PENTA) - 10, 1.25))
        b = get_unit("cry")
        b = normalize(transform(b, tuned_shift(b, PENTA) - 12, 1.05))
        a = mix(a, brass_layer(a, "hn_sus", octave=-1, cc1=55, gain_db=-15))
        b = mix(b, brass_layer(b, "hn_sus", octave=-1, cc1=55, gain_db=-17))
        w = concat([(a, -0.1), (b, 0)])
    w = normalize(w)
    env = env_follow(w, 0.02, 0.25)
    st = steam_layer(len(w), env, "hiss", gain_db=-26, bp=(1500, 8000), seed_t=3.0 * variant)
    y = normalize(mix(w, st))
    return trim_to_onset(y)


def morning_hum():
    """Contented hum: steady low unit an octave+ down, stretched, tuned to A."""
    a = get_unit("hum_rich")
    a = transform(a, tuned_shift(a, [9]) - 12, 1.9)
    a = dsp.lowpass(a, 3000, order=2)
    br = brass_layer(a, "tbn_sus", octave=-1, cc1=45, gain_db=-12)
    y = normalize(mix(normalize(a), br))
    y = dsp.fade(y, 0.25, 0.5)
    return trim_to_onset(y)


def groan(intensity=1, rising=False):
    """Storm effort groan: low moan pushed down, strained brass underneath,
    timber creaking under load."""
    src = "moan_rich" if intensity == 1 else "low_moan"
    a = get_unit(src)
    semis = -9 if intensity == 1 else -11
    a = transform(a, semis, 1.15)
    if rising:   # bend the last half upward (labouring, rising)
        n = len(a)
        bend = np.concatenate([np.zeros(n // 2), np.linspace(0, 5, n - n // 2)])
        a = dsp.varispeed(a, 2 ** (bend / 12.0))
    a = normalize(a)
    br = brass_layer(a, "tuba_sus", octave=0, cc1=70, gain_db=-11)
    env = env_follow(a, 0.03, 0.3)
    cr = rec.creak(len(a), strength=1.0 + 0.3 * intensity, offset=2.0 * intensity) * env * dsp.undb(-12)
    st = steam_layer(len(a), env, "hiss", gain_db=-24, bp=(700, 5000), seed_t=7 + intensity)
    y = normalize(mix(a, br, cr, st))
    return trim_to_onset(y)


def dusk_call():
    """THE CALL: long, lonely, rising (~3 s).  A real humpback upsweep,
    slowed a little on tape and stretched to three seconds, with a horn
    rising underneath and steam on the breath of it."""
    a = get_unit("rising_call", post=0.3)
    a = transform(a, -7.0, 2.55)
    # let it keep growing: lift the later part of the rise so the swell
    # peaks around 2.2 s (the head lifts, the eye brightens)
    t = np.arange(len(a)) / SR
    a = a * dsp.undb(np.interp(t, [0.0, 0.6, 2.2, 3.0, 4.0], [-5.0, -3.0, 3.0, 2.0, 0.0]))
    a = normalize(a)
    br = brass_layer(a, "hn_sus", octave=-1, cc1=50, gain_db=-13, lp=3500)
    env = env_follow(a, 0.05, 0.3)
    st = steam_layer(len(a), env, "hiss", gain_db=-28, bp=(1200, 7000), seed_t=11.0)
    y = normalize(mix(a, br, st))
    return trim_to_onset(y)


def night_song():
    """The Old Whale's song under the moon (~3.7 s): arch - falling cry -
    deep moan; old (lower), close and rich."""
    a = get_unit("arch")
    a = transform(a, tuned_shift(a, PENTA) - 7, 0.85)
    b = get_unit("cry_fall")
    b = transform(b, tuned_shift(b, PENTA) - 12, 0.75)
    c = get_unit("moan_rich")
    c = transform(c, tuned_shift(c, D_A) - 5, 0.72)
    a, b, c = normalize(a), normalize(b), normalize(c)
    a = mix(a, brass_layer(a, "hn_sus", octave=0, cc1=55, gain_db=-15))
    b = mix(b, brass_layer(b, "hn_sus", octave=-1, cc1=55, gain_db=-16))
    c = mix(c, brass_layer(c, "tbn_sus", octave=0, cc1=55, gain_db=-14))
    w = normalize(concat([(a, -0.12), (b, -0.1), (c, 0)]))
    env = env_follow(w, 0.02, 0.25)
    st = steam_layer(len(w), env, "hiss", gain_db=-27, bp=(1500, 8000), seed_t=21.0)
    y = normalize(mix(w, st))
    return trim_to_onset(y)


def answer_hum():
    """The Old Whale's answering hum as it joins the pod: tuned to D so it
    merges with the horn's D."""
    a = get_unit("hum_low")
    a = transform(a, tuned_shift(a, [2]) - 12, 2.0)
    br = brass_layer(a, "hn_sus", octave=0, cc1=50, gain_db=-12)
    y = normalize(mix(normalize(a), br))
    y = dsp.fade(y, 0.15, 0.6)
    return trim_to_onset(y)


def pod_voice(who):
    if who == "drover":      # large, deep, heavy
        a = get_unit("low_moan")
        a = transform(a, tuned_shift(a, [2]) - 12, 0.9)
        a = normalize(dsp.lowpass(a, 2500, order=2))
        br = brass_layer(a, "tuba_sus", octave=0, cc1=60, gain_db=-10)
        y = mix(a, br)
    elif who == "pip":       # small, young, higher, quick: two quick chirps
        a = get_unit("upsweep_b", lp=3000)
        s1 = tuned_shift(a, PENTA) + 5
        s2 = s1 + 2
        a1 = normalize(transform(a, s1, 2 ** (-s1 / 12.0)))   # tape only: quick and light
        a2 = normalize(transform(a, s2, 2 ** (-s2 / 12.0)))
        a1 = mix(a1, brass_layer(a1, "hn_sus", octave=-1, cc1=40, gain_db=-18))
        a2 = mix(a2, brass_layer(a2, "hn_sus", octave=-1, cc1=40, gain_db=-18))
        y = normalize(concat([(a1, 0.05), (a2 * 0.85, 0)]))
    elif who == "elder":     # very old, slow, cracked, deepest
        a = get_unit("moan_fall")
        a = transform(a, -14, 1.0)
        a = normalize(a)
        a = rec.crack(a)     # granular re-arrangement of its own grains: a cracked voice
        br = brass_layer(a, "tuba_sus", octave=0, cc1=55, gain_db=-11)
        cr = rec.creak(len(a), strength=0.8, offset=13.0) * env_follow(a) * dsp.undb(-16)
        y = mix(a, br, cr)
    elif who == "mend":      # gentle, soft
        a = get_unit("gentle")
        a = transform(a, tuned_shift(a, PENTA) - 7, 1.25)
        a = normalize(dsp.lowpass(a, 2200, order=2))
        y = mix(a, brass_layer(a, "hn_sus", octave=0, cc1=35, gain_db=-15))
        y = dsp.fade(y, 0.12, 0.3)
    elif who == "swift":     # lean, fast, bright
        a = get_unit("upsweep_a", lp=4000)
        sh = tuned_shift(a, PENTA) + 7
        a = transform(a, sh, 2 ** (-sh / 12.0))                # tape only: fast and bright
        a = normalize(dsp.shelf(a, 2500, 4.0, kind="high"))
        y = mix(a, brass_layer(a, "hn_sus", octave=-1, cc1=60, gain_db=-18))
    else:
        raise KeyError(who)
    return trim_to_onset(normalize(y))


# ---------------------------------------------------------------- breaths

def breath(kind="exhale", length=1.6, strength=1.0, seed=0.0):
    """Breath through brass vents and steaming lungs.
    exhale: steam release burst + bellows push + a horn 'vent' sigh.
    inhale: bellows intake (air drawn in) + a soft valve opening."""
    n = int(length * SR)
    if kind == "exhale":
        s = rec.steam("release", n, offset=seed)
        s = dsp.bandpass(s, 250, 9000, order=2)
        bl = rec.bellows("push", n, offset=seed)
        t = np.arange(n) / SR
        env = np.minimum(1.0, t / 0.06) * np.exp(-t / (0.35 * length))
        y = normalize(s) * env + normalize(bl) * env * dsp.undb(-6)
        vent = brass.tone("hn_sus", 50, length + 0.3, cc1=20, vel=40)[:n]
        vent = dsp.bandpass(dsp.pad_to(vent, n), 150, 1200, order=2)
        y = normalize(y) + normalize(vent) * env * dsp.undb(-18 + 4 * (strength - 1))
        y = dsp.fade(y, 0.0, 0.25 * length)
    else:
        bl = rec.bellows("pull", n, offset=seed)
        s = rec.steam("hiss", n, offset=seed + 1.0)
        t = np.arange(n) / SR
        env = (t / length) ** 1.5 * np.minimum(1.0, (length - t) / 0.08)
        y = normalize(dsp.highpass(bl, 200, order=2)) * env + normalize(dsp.bandpass(s, 2000, 9000)) * env * dsp.undb(-10)
    y = normalize(dsp.highpass(y, 90, order=2))
    return trim_to_onset(y, pre=0.005)


# ---------------------------------------------------------------- timber

def creak(length=0.9, strength=1.0, seed=0.0):
    """Spars creaking: a real creaking-timber recording segment."""
    n = int(length * SR)
    y = rec.creak(n, strength=strength, offset=seed)
    y = dsp.fade(y, 0.01, 0.15)
    return trim_to_onset(normalize(y), pre=0.005)


# ---------------------------------------------------------------- air accents

def air(kind="fin", seed=0.0):
    """Extremely subtle air accents cut from real moving-air recordings.
    fin: a fin's downstroke; cloudbreak: far cloud tearing open;
    burst: bursting out of the storm top; leap: Swift leaping clear."""
    spec = {
        #            length, rise, band (Hz),      rate start->end (doppler-ish)
        "fin":        (0.75, 0.10, (250, 2600),   (1.04, 0.94)),
        "cloudbreak": (1.10, 0.14, (120, 3200),   (1.00, 0.92)),
        "burst":      (1.50, 0.18, (120, 6000),   (1.06, 0.95)),
        "leap":       (0.70, 0.08, (400, 5000),   (1.08, 0.97)),
    }[kind]
    length, rise, band, (r0, r1) = spec
    n = int(length * SR)
    raw = rec.air(int(n * 1.1) + 64, offset=seed)
    rate = np.linspace(r0, r1, n)
    y = dsp.pad_to(dsp.varispeed(raw, rate), n)
    y = dsp.bandpass(y, band[0], band[1], order=2)
    t = np.arange(n) / SR
    env = np.where(t < rise, np.sin(0.5 * np.pi * t / rise) ** 2,
                   np.exp(-(t - rise) / (0.32 * (length - rise))))
    y = normalize(y * env)
    return trim_to_onset(y, pre=0.005)
