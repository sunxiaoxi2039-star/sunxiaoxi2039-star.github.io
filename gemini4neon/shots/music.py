#!/usr/bin/env python3
"""128 BPM soundtrack for the ten-shot shader reel. Structure mirrors SHOTS in reel.html."""
import sys, wave
import numpy as np
from scipy import signal

SR = 48000
BPM = 128; B = 60 / BPM
SHOT_BEATS = [8, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8]
starts = np.cumsum([0] + SHOT_BEATS)            # in beats
DROP, NOVA, BOOM, OUTRO, END = 8, starts[9], starts[9] + 4, starts[10], starts[11]
N = int(END * B * SR) + SR // 2
L = np.zeros(N); R = np.zeros(N); VERB_L = np.zeros(N); VERB_R = np.zeros(N)
rng = np.random.default_rng(7)


def at(beat): return int(beat * B * SR)
def secs(n): return np.arange(int(n * SR)) / SR
def lp(x, fc, o=2): b, a = signal.butter(o, min(fc, SR / 2 - 200) / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def hp(x, fc, o=2): b, a = signal.butter(o, fc / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, lo, hi, o=2): b, a = signal.butter(o, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def noise(d): return rng.standard_normal(int(d * SR))


def sweep(x, fc):
    out = np.zeros_like(x); z = 0.
    for i in range(0, len(x), 256):
        a = np.exp(-2 * np.pi * min(fc[i], 18000) / SR); seg, _ = signal.lfilter([1 - a], [1, -a], x[i:i + 256], zi=[z * a]); out[i:i + 256] = seg; z = seg[-1]
    return out


def put(sig, beat, pan=0., g=1., verb=0.):
    i0 = at(beat) if beat >= 0 else 0
    n = min(len(sig), N - i0)
    if n <= 0: return
    a = (pan + 1) * np.pi / 4; l, r = np.cos(a) * g, np.sin(a) * g
    L[i0:i0 + n] += sig[:n] * l; R[i0:i0 + n] += sig[:n] * r
    if verb: VERB_L[i0:i0 + n] += sig[:n] * l * verb; VERB_R[i0:i0 + n] += sig[:n] * r * verb


def saw(f, d):
    ph = np.cumsum(np.broadcast_to(f, (int(d * SR),)) / SR); return 2 * (ph % 1) - 1


def mtof(m): return 440 * 2 ** ((m - 69) / 12)


# ---------------- instruments
def kick(g=1.):
    t = secs(.45); f = 48 + 110 * np.exp(-t * 32)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    c = hp(noise(.004), 3000) * np.linspace(1, 0, int(.004 * SR))
    s[:len(c)] += c * .5
    return np.tanh(s * 1.6) * g


def clap():
    d = .25; t = secs(d); s = np.zeros(len(t))
    for k, off in enumerate((0, .011, .022)):
        i = int(off * SR); m = len(t) - i
        s[i:] += bp(noise(d), 900, 2600)[:m] * np.exp(-t[:m] * (60 if k < 2 else 16))
    return s * .55


def hat(open_=False):
    d = .22 if open_ else .05; t = secs(d)
    return hp(noise(d), 7000) * np.exp(-t * (14 if open_ else 70)) * (.22 if open_ else .16)


def pluck(m, d=.18, bright=3500):
    t = secs(d); f = mtof(m)
    s = saw(f, d) * .6 + np.sign(np.sin(2 * np.pi * f * 1.005 * t)) * .25
    fc = 500 + bright * np.exp(-t * 18)
    out = np.zeros_like(s); z = 0.
    for i in range(0, len(s), 256):
        a = np.exp(-2 * np.pi * fc[i] / SR); seg, zi = signal.lfilter([1 - a], [1, -a], s[i:i + 256], zi=[z * a]); out[i:i + 256] = seg; z = seg[-1]
    return out * np.exp(-t * 9) * .22


def bassnote(m, d):
    t = secs(d); f = mtof(m)
    s = saw(f, d) + .5 * np.sin(2 * np.pi * f / 2 * t)
    return sweep(s, 380 + 900 * np.exp(-t * 20)) * np.minimum(1, t / .004) * np.exp(-t * 3) * .5


def padchord(ms, d, fc=1600, g=.08):
    t = secs(d); s = np.zeros(len(t))
    for m in ms:
        for det in (-.12, .1):
            s += saw(mtof(m) * (1 + det / 100), d)
    env = np.minimum(1, t / .25) * np.minimum(1, (d - t) / .4)
    return lp(s, fc) * env * g / len(ms)


def boom(d=1.2, f0=60, g=1.):
    t = secs(d); f = 28 + f0 * np.exp(-t * 5)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.8)
    s += lp(noise(d), 1200) * np.exp(-t * 7) * .5
    return np.tanh(s * 1.4) * g


def whoosh(d=.5):
    t = secs(d); fc = 300 * (40 ** (t / d))
    x = noise(d); out = np.zeros_like(x); z = 0.
    for i in range(0, len(x), 256):
        a = np.exp(-2 * np.pi * min(fc[i], 18000) / SR); seg, zi = signal.lfilter([1 - a], [1, -a], x[i:i + 256], zi=[z * a]); out[i:i + 256] = seg; z = seg[-1]
    return out * (t / d) ** 2.5 * .35


# ---------------- harmony (A minor) — chords per bar during the main section
CH = {'Am': [57, 60, 64], 'F': [53, 57, 60], 'C': [48, 52, 55, 60], 'G': [55, 59, 62], 'E': [52, 56, 59], 'Dm': [50, 53, 57]}
ROOT = {'Am': 33, 'F': 29, 'C': 36, 'G': 31, 'E': 28, 'Dm': 26}
prog = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'E', 'Am', 'F', 'Dm', 'E']   # 12 bars = beats 8..56

# ---------------- intro (beats 0..8)
put(padchord([45, 52, 57, 59, 64], 8 * B + .5, fc=900, g=.11), 0, verb=.5)
t = secs(8 * B); sub = np.sin(2 * np.pi * 55 * t) * (t / t[-1]) ** 2 * .25; put(sub, 0)
for b in (0, 4): put(kick(.55), b)
put(whoosh(8 * B) * .6, 0, pan=-.2); put(whoosh(8 * B) * .6, 0, pan=.2)
for k in range(16):                                    # accelerating snare roll into the drop
    b = 4 + k * .25
    put(clap() * (.15 + .6 * k / 15), b, pan=(-.2 if k % 2 else .2), verb=.2)
t = secs(1.6); shim = sum(np.sin(2 * np.pi * f * t) for f in (1760, 2217.5, 2637)) * np.exp(-t * 2) * .03
put(shim, .9, pan=-.4, verb=.8); put(shim, 1.05, pan=.4, verb=.8)

# ---------------- main (beats 8..56)
for bar, name in enumerate(prog):
    b0 = DROP + bar * 4
    put(padchord(CH[name], 4 * B, fc=1400, g=.07), b0, verb=.4)
    for s in range(8):                                 # bass 8ths, octave bounce
        m = ROOT[name] + (12 if s % 2 else 0)
        put(bassnote(m, B / 2), b0 + s * .5, g=.9)
    tones = CH[name] + [n + 12 for n in CH[name]]
    for s in range(16):                                # 16th arp, pattern up-down
        idx = [0, 1, 2, 3, 2, 1, 3, 4, 0, 2, 4, 5, 4, 2, 1, 3][s] % len(tones)
        bright = 1800 + 3500 * (bar % 4) / 3
        put(pluck(tones[idx] + 12, d=.2, bright=bright), b0 + s * .25, pan=(.35 if s % 2 else -.35), verb=.35)
for b in range(DROP, NOVA):                            # drums
    put(kick(), b)
    if (b - DROP) % 2 == 1: put(clap(), b, verb=.25)
    for s in range(4):
        put(hat(open_=(s == 2)), b + s * .25, pan=.25 if s % 2 else -.15, g=1.0 if s % 2 else .7)
# cut impacts on every shot change
for k in range(2, 10):
    cb = starts[k - 1] if k - 1 > 0 else None
for cb in starts[1:10]:
    put(whoosh(.45), cb - .45 / B, pan=0.)
    put(boom(1.0, 70, .55), cb)
# build into the supernova shot
for k in range(16):
    put(clap() * (.2 + .7 * k / 15), NOVA - 4 + k * .25, pan=(-.25 if k % 2 else .25), verb=.2)

# ---------------- supernova (beats 56..64)
d = 4 * B; t = secs(d)
drone = sweep(saw(55 * (1 + .5 * (t / d) ** 3), d) + saw(55.4 * (1 + .5 * (t / d) ** 3), d), 300 + 2500 * (t / d) ** 3) * (.15 + .5 * (t / d) ** 2) * .5
put(drone, NOVA, verb=.3)
put(hp(noise(d), 2000) * (t / d) ** 3 * .25, NOVA, pan=-.3); put(hp(noise(d), 2000) * (t / d) ** 3 * .25, NOVA, pan=.3)
for k, b in enumerate((NOVA, NOVA + 1.5, NOVA + 2.5, NOVA + 3.0, NOVA + 3.25, NOVA + 3.5, NOVA + 3.75)):
    put(kick(.5 + .07 * k), b)
put(boom(3.5, 90, 1.25), BOOM)                          # the explosion
t = secs(3.0); crash = hp(noise(3.0), 3500) * np.exp(-t * 1.6) * .35
put(crash, BOOM, pan=-.4, verb=.6); put(hp(noise(3.0), 3500) * np.exp(-t * 1.6) * .35, BOOM, pan=.4, verb=.6)
put(padchord([45, 52, 57, 60, 64, 69], 4 * B + .3, fc=2600, g=.13), BOOM, verb=.6)
put(kick(1.), BOOM + 2); put(clap(), BOOM + 2, verb=.5)

# ---------------- outro (beats 64..72): resolve to A major, bells
put(padchord([45, 52, 57, 61, 64, 69], 8 * B + .5, fc=2200, g=.2), OUTRO, verb=.7)
put(boom(2.0, 50, .7), OUTRO)
for k, m in enumerate([81, 76, 73, 69, 76, 81, 85]):
    t = secs(2.0); f = mtof(m)
    bell = (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3)) * np.exp(-t * 1.8) * .09
    put(bell, OUTRO + .5 + k * 1.0, pan=(-.4 if k % 2 else .4), verb=.9)

# ---------------- sidechain (pump pad/bass/arp against the kick) is approximated by ducking the whole
# musical bed slightly after each kick in the main section, then reverb, then master
duck = np.ones(N)
for b in range(DROP, NOVA):
    i = at(b); tt = np.arange(min(int(.3 * SR), N - i)) / SR
    duck[i:i + len(tt)] = np.minimum(duck[i:i + len(tt)], 1 - .35 * np.exp(-tt * 12))
L *= duck; R *= duck
ir_t = np.arange(int(2.2 * SR)) / SR
for src, dst, seed in ((VERB_L, L, 1), (VERB_R, R, 2)):
    ir = np.random.default_rng(seed).standard_normal(len(ir_t)) * np.exp(-ir_t * 2.6); ir = lp(ir, 6000); ir /= np.sqrt((ir ** 2).sum())
    dst += signal.fftconvolve(src, ir)[:N] * .5
end = int(END * B * SR); fade = np.ones(N); fl = int(1.2 * SR); fade[end - fl:end] = np.linspace(1, 0, fl) ** 1.5; fade[end:] = 0
out = np.stack([L, R], 1) * fade[:, None]
out = hp(out.T, 25).T
out = np.tanh(out * 1.3) / np.tanh(1.3)
out *= .9 / np.abs(out).max()
out = out[:end]
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print('wrote', sys.argv[1], f'{len(out) / SR:.2f}s', 'rms', float(np.sqrt((out ** 2).mean())))
