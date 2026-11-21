#!/usr/bin/env python3
"""Procedural soundtrack for N-01, synced to timeline.json. Writes a 48 kHz stereo WAV."""
import json, sys, wave
from pathlib import Path
import numpy as np
from scipy import signal

TL = json.loads((Path(__file__).parent / "timeline.json").read_text())
SR = 48000
DUR = TL["duration"]
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(42)
L = np.zeros(N); R = np.zeros(N)


def idx(sec):
    return max(0, min(N, int(sec * SR)))


def place(sig, at, pan=0.0, gain=1.0):
    """Add mono sig at time `at` with equal-power pan (-1..1)."""
    i0 = idx(at); n = min(len(sig), N - i0)
    if n <= 0:
        return
    a = (pan + 1) * np.pi / 4
    L[i0:i0 + n] += sig[:n] * np.cos(a) * gain
    R[i0:i0 + n] += sig[:n] * np.sin(a) * gain


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), "low"); return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high"); return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band"); return signal.lfilter(b, a, x)


def sweep_lp(x, fc_curve, block=512):
    """Time-varying lowpass: one-pole per block with state carried over."""
    y = np.empty_like(x); z = 0.0
    for i in range(0, len(x), block):
        fc = fc_curve[min(i, len(fc_curve) - 1)]
        a = np.exp(-2 * np.pi * fc / SR)
        seg, zi = signal.lfilter([1 - a], [1, -a], x[i:i + block], zi=[z * a])
        y[i:i + block] = seg; z = seg[-1] if len(seg) else z
    return y


def env_curve(points):
    xs, ys = zip(*points); return np.interp(t, xs, ys)


def saw(freq_curve):
    ph = np.cumsum(freq_curve / SR); return 2 * (ph % 1.0) - 1


def sine(freq, dur, phase=0.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = np.broadcast_to(freq, (n,)) if np.ndim(freq) else np.full(n, freq)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def decay(dur, k):
    n = int(dur * SR); return np.exp(-np.arange(n) / SR * k)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def brown(dur):
    x = np.cumsum(noise(dur)); x = hp(x, 20); return x / (np.abs(x).max() + 1e-9)


# ---------- 1. drone pad (chord changes follow the story) ----------
D2, F2, A2, Bb1, C3, D3, F3, A3, Bb2, Fs3, C4, E3 = 73.42, 87.31, 110.0, 58.27, 130.81, 146.83, 174.61, 220.0, 116.54, 185.0, 261.63, 164.81
chords = [  # (start, freqs)
    (0.0, [D2, A2, D3, F3, A3]),
    (TL["powerup"][0], [Bb1, F2, Bb2, D3, F3]),
    (TL["liftoff"], [F2, C3, F3, A3, C4]),
    (TL["title"], [D2, A2, D3, Fs3, A3]),
]
pad_l = np.zeros(N); pad_r = np.zeros(N)
for ci, (start, freqs) in enumerate(chords):
    end = chords[ci + 1][0] if ci + 1 < len(chords) else DUR
    i0, i1 = idx(start - 0.15), idx(end + 0.6)
    seg_t = t[i0:i1]
    fade = np.clip((seg_t - (start - 0.15)) / 0.3, 0, 1) * np.clip((end + 0.6 - seg_t) / 0.6, 0, 1)
    for k, f in enumerate(freqs):
        for det, side in ((-0.18, 0), (0.21, 1)):
            s = saw(np.full(len(seg_t), f * (1 + det / 100 * (k + 1))))
            (pad_l if side == 0 else pad_r)[i0:i1] += s * fade / len(freqs)
pad_amp = env_curve([(0, 0), (2.5, 0.18), (TL["powerup"][0], 0.28), (TL["shockwave"], 0.42), (TL["crouch"][0], 0.14),
                     (TL["liftoff"] - 0.05, 0.16), (TL["liftoff"] + 0.4, 0.5), (TL["title"], 0.42), (TL["title"] + 0.8, 0.6), (DUR - 0.7, 0.45), (DUR, 0)])
pad_fc = env_curve([(0, 300), (TL["powerup"][0], 600), (TL["shockwave"], 1800), (TL["crouch"][0], 500), (TL["liftoff"], 700),
                    (TL["liftoff"] + 0.6, 2600), (TL["title"], 1500), (TL["title"] + 1.2, 3200), (DUR, 1200)])
L += sweep_lp(pad_l, pad_fc) * pad_amp * 0.55
R += sweep_lp(pad_r, pad_fc) * pad_amp * 0.55
# sub pulse under the pad
sub = np.sin(2 * np.pi * np.cumsum(np.interp(t, [c[0] for c in chords], [c[1][0] / 2 for c in chords])) / SR)
sub_amp = env_curve([(0, 0), (3, 0.08), (TL["powerup"][1], 0.16), (TL["crouch"][0], 0.05), (TL["liftoff"], 0.2), (DUR - 0.7, 0.18), (DUR, 0)])
L += sub * sub_amp; R += sub * sub_amp

# ---------- 2. blueprint: heartbeat + scanner ----------
for k in np.arange(0.45, TL["blueprint"][1] + 0.1, 0.72):
    f = 58 * np.exp(-np.arange(int(0.3 * SR)) / SR * 6) + 38
    place(np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(0.3, 14) * 0.55, k)
sc_n = int((TL["blueprint"][1] - 0.2) * SR); sc_t = np.arange(sc_n) / SR
scan = np.sin(2 * np.pi * np.cumsum(500 * np.exp(sc_t / sc_t[-1] * np.log(5))) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * sc_t))
scan *= np.clip(sc_t / 0.6, 0, 1) * np.clip((sc_t[-1] - sc_t) / 0.4, 0, 1) * 0.05
place(scan, 0.3, pan=-0.3); place(np.roll(scan, 900), 0.3, pan=0.3)


# ---------- 3. assembly: servo whir + lock clank per part ----------
def clank(seed):
    r = np.random.default_rng(seed); f0 = 150 + r.random() * 140; n = int(0.9 * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    for ratio, amp, dk in ((1, 1, 7), (2.76, 0.6, 10), (5.40, 0.4, 14), (8.93, 0.25, 20), (13.3, 0.15, 30)):
        s += amp * np.sin(2 * np.pi * f0 * ratio * tt + r.random() * 6) * np.exp(-tt * dk)
    click = np.zeros(n); m = int(0.012 * SR); click[:m] = r.standard_normal(m) * np.linspace(1, 0, m)
    thump = np.sin(2 * np.pi * (70 * np.exp(-tt * 8) + 40) * tt) * np.exp(-tt * 12)
    return 0.32 * s + 0.6 * hp(click, 1500) + 0.7 * thump


for i, p in enumerate(TL["parts"]):
    pan = -0.55 if p["name"].endswith("L") else 0.55 if p["name"].endswith("R") else 0.0
    d = p["dur"]; n = int(d * SR); tt = np.arange(n) / SR
    f = 260 + 520 * (tt / d) ** 1.4
    whir = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * (tt / d) ** 1.5 * 0.05
    whoosh = bp(noise(d), 400, 3000) * np.sin(np.pi * tt / d) ** 2 * 0.06
    place(whir + whoosh, p["t0"], pan=pan)
    place(clank(100 + i), p["t0"] + d, pan=pan, gain=0.9)
    place(lp(noise(0.35), 3000) * decay(0.35, 18) * 0.12, p["t0"] + d, pan=-pan)  # spark sizzle

# ---------- 4. power-up riser, flicker ticks, visor chime, shockwave ----------
p0, p1 = TL["powerup"]; d = TL["shockwave"] - p0; n = int(d * SR); tt = np.arange(n) / SR
fr = 55 * np.exp(tt / d * np.log(16))
riser = (saw(fr) * 0.5 + np.sin(2 * np.pi * np.cumsum(fr * 2) / SR) * 0.5) * (tt / d) ** 2
riser = lp(riser, 3500) * 0.18 + hp(noise(d), 2500) * (tt / d) ** 3 * 0.06
place(riser, p0)
for k in np.arange(p0, p1 - 0.2, 0.09):
    if rng.random() < 0.55:
        place(hp(noise(0.02), 3000) * decay(0.02, 150) * 0.12, k + rng.random() * 0.05, pan=rng.uniform(-0.8, 0.8))
chime = sum(a * np.sin(2 * np.pi * f * np.arange(int(1.6 * SR)) / SR) for f, a in ((1318.5, 0.5), (1975.5, 0.35), (2637.0, 0.25))) * decay(1.6, 3.2) * 0.09
place(chime, TL["visor"], pan=-0.2); place(chime * 0.5, TL["visor"] + 0.18, pan=0.4); place(chime * 0.25, TL["visor"] + 0.36, pan=-0.4)
n = int(2.2 * SR); tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * np.cumsum(30 + 30 * np.exp(-tt * 3)) / SR) * np.exp(-tt * 2.2) * 0.9 + lp(noise(2.2), 900) * np.exp(-tt * 3.5) * 0.35
place(boom, TL["shockwave"])

# ---------- 5. hatch, alarm, ignition, countdown ----------
h0, h1 = TL["hatch"]; d = h1 - h0
place(lp(brown(d), 160) * np.sin(np.pi * np.arange(int(d * SR)) / (d * SR)) * 0.35, h0)
place(clank(999) * 1.2, h1, pan=0.0)
for k, ts in enumerate(np.arange(h0, TL["liftoff"] - 0.3, 0.5)):
    f = 880 if k % 2 == 0 else 660
    beep = np.sin(2 * np.pi * f * np.arange(int(0.22 * SR)) / SR) * np.clip(np.arange(int(0.22 * SR)) / 200, 0, 1) * decay(0.22, 6) * 0.045
    place(beep, ts, pan=(-0.5 if k % 2 else 0.5))
ig = TL["ignition"]; d = TL["liftoff"] - ig; n = int(d * SR); tt = np.arange(n) / SR
hiss = hp(noise(d), 1800) * (tt / d) ** 1.2 * 0.12
rumble = lp(brown(d), 220) * (0.2 + 0.8 * tt / d) * 0.55
place(hiss + rumble, ig, pan=-0.1); place(hp(noise(d), 1800) * (tt / d) ** 1.2 * 0.12 + rumble * 0.9, ig, pan=0.1)
for k in range(3):
    place(np.sin(2 * np.pi * 1200 * np.arange(int(0.07 * SR)) / SR) * decay(0.07, 40) * 0.12, TL["liftoff"] - 1.5 + k * 0.5)

# ---------- 6. liftoff: boom + roar (closer → farther after the cut) ----------
lo = TL["liftoff"]; n = int(3.0 * SR); tt = np.arange(n) / SR
place(np.sin(2 * np.pi * np.cumsum(26 + 60 * np.exp(-tt * 4)) / SR) * np.exp(-tt * 1.4) * 1.0, lo)
place(lp(noise(3.0), 2500) * np.exp(-tt * 4) * 0.5, lo, pan=-0.2); place(lp(noise(3.0), 2500) * np.exp(-tt * 4) * 0.5, lo, pan=0.2)
d = DUR - lo; roar_t = np.arange(int(d * SR)) / SR
roar_amp = np.interp(roar_t + lo, [lo, lo + 0.3, TL["cut"] - 0.05, TL["cut"] + 0.1, TL["title"], DUR], [0.2, 1.0, 0.8, 0.3, 0.12, 0.0])
roar_fc = np.interp(roar_t + lo, [lo, lo + 0.5, TL["cut"], TL["cut"] + 0.1, DUR], [600, 1400, 1100, 380, 250])
for pan, s in ((-0.35, 1), (0.35, 2)):
    raw = brown(d) * 0.7 + noise(d) * 0.08
    crackle = (np.random.default_rng(s).random(len(raw)) < 0.002) * np.random.default_rng(s + 5).standard_normal(len(raw)) * 1.5
    place(sweep_lp(raw + crackle, roar_fc) * roar_amp * 0.9, lo, pan=pan)

# ---------- 7. cut whoosh + title hit ----------
cu = TL["cut"]; n = int(0.9 * SR); tt = np.arange(n) / SR
place(sweep_lp(noise(0.9), np.linspace(6000, 400, n)) * np.sin(np.pi * tt / 0.9) ** 2 * 0.35, cu - 0.35)
ti = TL["title"]; d = DUR - ti; n = int(d * SR); tt = np.arange(n) / SR
braam = sum(saw(np.full(n, f * (1 + dt))) for f in (36.71, 73.42, 110.0, 146.83) for dt in (-0.003, 0.004))
braam = sweep_lp(braam, 180 + 2400 * (1 - np.exp(-tt * 1.6)) * np.exp(-tt * 0.25)) * np.exp(-tt * 0.55) * 0.16
place(braam, ti, pan=-0.15); place(braam, ti + 0.012, pan=0.15)
shimmer = sum(np.sin(2 * np.pi * f * tt + k) for k, f in enumerate((1174.7, 1480.0, 1760.0, 2349.3))) * np.clip(tt / 1.2, 0, 1) * np.exp(-tt * 0.6) * 0.012
place(shimmer * (1 + 0.5 * np.sin(2 * np.pi * 5 * tt)), ti + 0.3, pan=-0.5); place(shimmer * (1 + 0.5 * np.cos(2 * np.pi * 5 * tt)), ti + 0.3, pan=0.5)

# ---------- master: reverb, fade, limiter ----------
ir_n = int(1.8 * SR); ir_t = np.arange(ir_n) / SR
for ch, seed in ((L, 7), (R, 8)):
    ir = np.random.default_rng(seed).standard_normal(ir_n) * np.exp(-ir_t * 3.2); ir = lp(ir, 5000); ir /= np.sqrt((ir ** 2).sum())
    wet = signal.fftconvolve(ch, ir)[:N]
    ch += wet * 0.32
fade = np.clip(t / 0.4, 0, 1) * np.clip((DUR - t) / (DUR - TL["fadeout"][0]), 0, 1) ** 1.5
out = np.stack([L, R], 1) * fade[:, None]
out = hp(out.T, 25).T
out = np.tanh(out * 1.6) / np.tanh(1.6)
out *= 0.89 / np.abs(out).max()
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1], f"{DUR}s peak={np.abs(out).max():.2f} rms={np.sqrt((out**2).mean()):.3f}")
