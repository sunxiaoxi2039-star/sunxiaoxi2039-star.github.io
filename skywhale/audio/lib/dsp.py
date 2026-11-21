"""Signal processing helpers (processing of recorded material only: there is
no oscillator / tone generator anywhere in this pipeline)."""
import subprocess

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000


# ---------------------------------------------------------------- I/O
LOADED = set()  # provenance: every audio file read by the pipeline


def load(path, sr=SR, mono=False):
    """Read any recording (wav/flac/ogg/oga/opus) as float64 at `sr`."""
    import os as _os
    LOADED.add(_os.path.abspath(path))
    try:
        x, fs = sf.read(path, always_2d=True, dtype="float64")
    except Exception:
        # fall back to ffmpeg for containers libsndfile cannot read
        p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-acodec", "pcm_f32le",
                            "-ar", str(sr), "-"], capture_output=True, check=True)
        probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
                                "stream=channels", "-of", "csv=p=0", path], capture_output=True, text=True)
        ch = int(probe.stdout.strip().split(",")[0])
        x = np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64).reshape(-1, ch)
        fs = sr
    if fs != sr:
        x = resample(x, fs, sr)
    if mono:
        x = x.mean(axis=1)
    return x


def write(path, x, sr=SR, subtype="FLOAT"):
    sf.write(path, x, sr, subtype=subtype)


def resample(x, sr_from, sr_to):
    if sr_from == sr_to:
        return x
    from math import gcd
    g = gcd(int(sr_from), int(sr_to))
    return signal.resample_poly(x, int(sr_to) // g, int(sr_from) // g, axis=0)


# ---------------------------------------------------------------- utils
def db(x):
    return 20 * np.log10(np.maximum(np.abs(x), 1e-20))


def undb(d):
    return 10 ** (np.asarray(d) / 20.0)


def to_stereo(x):
    if x.ndim == 1:
        return np.stack([x, x], axis=1)
    if x.shape[1] == 1:
        return np.repeat(x, 2, axis=1)
    return x


def mono(x):
    return x if x.ndim == 1 else x.mean(axis=1)


def seg(x, t0, t1, sr=SR):
    return x[int(round(t0 * sr)):int(round(t1 * sr))].copy()


def pad_to(x, n):
    if len(x) >= n:
        return x[:n]
    pad = np.zeros((n - len(x),) + x.shape[1:])
    return np.concatenate([x, pad], axis=0)


def raised_cos(n):
    return 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, max(n, 1)))


def fade(x, fin=0.0, fout=0.0, sr=SR):
    y = x.copy()
    ni, no = int(fin * sr), int(fout * sr)
    if ni > 0:
        w = raised_cos(ni)
        y[:ni] *= w if y.ndim == 1 else w[:, None]
    if no > 0:
        w = raised_cos(no)[::-1]
        y[-no:] *= w if y.ndim == 1 else w[:, None]
    return y


def env_curve(times, values, n, sr=SR, kind="linear"):
    """Piecewise curve sampled at n samples. times in s, values in any unit."""
    t = np.arange(n) / sr
    if kind == "cos":
        out = np.empty(n)
        times = list(times); values = list(values)
        out[:] = values[0]
        for (t0, v0), (t1, v1) in zip(zip(times, values), zip(times[1:], values[1:])):
            m = (t >= t0) & (t < t1)
            u = (t[m] - t0) / max(1e-9, t1 - t0)
            out[m] = v0 + (v1 - v0) * (0.5 - 0.5 * np.cos(np.pi * u))
        out[t >= times[-1]] = values[-1]
        return out
    return np.interp(t, times, values)


def apply_gain(x, g):
    return x * (g[:, None] if (x.ndim == 2 and np.ndim(g) == 1) else g)


def normalize_peak(x, peak_db=-1.0):
    return x * undb(peak_db) / (np.abs(x).max() + 1e-20)


def rms_db(x):
    return float(db(np.sqrt(np.mean(np.square(x))) + 1e-20))


# ---------------------------------------------------------------- filters
def _sos_apply(sos, x):
    return signal.sosfiltfilt(sos, x, axis=0) if False else signal.sosfilt(sos, x, axis=0)


def lowpass(x, fc, order=2, sr=SR, zero_phase=False):
    fc = min(fc, 0.45 * sr)
    sos = signal.butter(order, fc, btype="low", fs=sr, output="sos")
    return signal.sosfiltfilt(sos, x, axis=0) if zero_phase else signal.sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2, sr=SR, zero_phase=False):
    sos = signal.butter(order, fc, btype="high", fs=sr, output="sos")
    return signal.sosfiltfilt(sos, x, axis=0) if zero_phase else signal.sosfilt(sos, x, axis=0)


def bandpass(x, f1, f2, order=2, sr=SR, zero_phase=False):
    sos = signal.butter(order, [f1, min(f2, 0.45 * sr)], btype="band", fs=sr, output="sos")
    return signal.sosfiltfilt(sos, x, axis=0) if zero_phase else signal.sosfilt(sos, x, axis=0)


def _biquad(b, a):
    b = np.asarray(b, float) / a[0]
    a = np.asarray(a, float) / a[0]
    return np.concatenate([b, a])[None, :]


def shelf(x, fc, gain_db, kind="high", q=0.707, sr=SR):
    """RBJ shelving filter."""
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * np.pi * fc / sr
    alpha = np.sin(w0) / (2 * q)
    cw = np.cos(w0)
    if kind == "high":
        b0 = A * ((A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha)
        b1 = -2 * A * ((A - 1) + (A + 1) * cw)
        b2 = A * ((A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha)
        a0 = (A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha
        a1 = 2 * ((A - 1) - (A + 1) * cw)
        a2 = (A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha
    else:
        b0 = A * ((A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha)
        b1 = 2 * A * ((A - 1) - (A + 1) * cw)
        b2 = A * ((A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha)
        a0 = (A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha
        a1 = -2 * ((A - 1) + (A + 1) * cw)
        a2 = (A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha
    return signal.sosfilt(_biquad([b0, b1, b2], [a0, a1, a2]), x, axis=0)


def peaking(x, fc, gain_db, q=1.0, sr=SR):
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * np.pi * fc / sr
    alpha = np.sin(w0) / (2 * q)
    cw = np.cos(w0)
    b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
    a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    return signal.sosfilt(_biquad(b, a), x, axis=0)


def dc_block(x):
    return highpass(x, 20.0, order=2)


# ---------------------------------------------------------------- time/pitch
def _sinc_interp(x, pos, taps=16):
    """Windowed-sinc read of mono x at fractional positions pos."""
    n = len(x)
    i0 = np.floor(pos).astype(np.int64)
    frac = pos - i0
    out = np.zeros(len(pos))
    half = taps // 2
    xp = np.concatenate([np.zeros(half + 1), x, np.zeros(half + 2)])
    for k in range(-half + 1, half + 1):
        d = k - frac
        w = np.sinc(d) * (0.5 + 0.5 * np.cos(np.pi * d / (half + 1)))
        out += w * xp[i0 + k + half + 1]
    return out


def varispeed(x, rate, sr=SR):
    """Tape-style playback at a (possibly time-varying) rate.  `rate` is a
    float or an array of per-output-sample rates.  rate 0.5 = an octave
    lower and twice as long.  Anti-aliased by low-passing when rate > 1."""
    x2 = np.atleast_2d(x.T).T if x.ndim == 1 else x
    if np.isscalar(rate):
        n_out = int(len(x2) / rate)
        pos = np.arange(n_out) * rate
        rmax = rate
    else:
        rate = np.asarray(rate, float)
        pos = np.concatenate([[0.0], np.cumsum(rate[:-1])])
        keep = pos < len(x2) - 1
        pos = pos[keep]
        rmax = rate.max()
    src = x2
    if rmax > 1.0:
        src = lowpass(x2, 0.45 * sr / rmax, order=8, zero_phase=True)
    out = np.stack([_sinc_interp(src[:, c], pos) for c in range(src.shape[1])], axis=1)
    return out[:, 0] if x.ndim == 1 else out


def rate_for_curve(curve_semitones):
    return 2.0 ** (np.asarray(curve_semitones) / 12.0)


def stft(x, n_fft=4096, hop=512):
    win = np.hanning(n_fft)
    pad = np.concatenate([np.zeros(n_fft // 2), x, np.zeros(n_fft)])
    frames = 1 + (len(pad) - n_fft) // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(frames)[:, None]
    return np.fft.rfft(pad[idx] * win, axis=1), win


def time_stretch(x, factor, n_fft=4096, hop=512):
    """Phase-vocoder time stretch with identity phase locking.
    factor > 1 = longer.  Mono or stereo (channels processed with shared
    phase advance from the mid channel to keep the image stable)."""
    x2 = np.atleast_2d(x.T).T if x.ndim == 1 else x
    mid = x2.mean(axis=1)
    S, win = stft(mid, n_fft, hop)
    Ss = [stft(x2[:, c], n_fft, hop)[0] for c in range(x2.shape[1])]
    n_frames = S.shape[0]
    hop_out = hop * factor
    t_steps = np.arange(0, n_frames - 1, 1.0 / factor)
    omega = 2 * np.pi * hop * np.arange(n_fft // 2 + 1) / n_fft
    out_len = int(len(t_steps) * hop + n_fft)
    outs = [np.zeros(out_len) for _ in Ss]
    norm = np.zeros(out_len)
    phase = np.angle(S[0])
    for k, t in enumerate(t_steps):
        i = int(t); a = t - i
        m0, m1 = np.abs(S[i]), np.abs(S[i + 1])
        mag = (1 - a) * m0 + a * m1
        dphi = np.angle(S[i + 1]) - np.angle(S[i]) - omega
        dphi = dphi - 2 * np.pi * np.round(dphi / (2 * np.pi))
        # identity phase locking around spectral peaks
        pk = signal.argrelmax(mag, order=2)[0]
        ph = phase.copy()
        if len(pk):
            bins = np.arange(len(mag))
            near = pk[np.clip(np.searchsorted((pk[:-1] + pk[1:]) / 2, bins), 0, len(pk) - 1)]
            ph = phase[near] + (np.angle(S[i])[bins] - np.angle(S[i])[near])
        for c, Sc in enumerate(Ss):
            cm = (1 - a) * np.abs(Sc[i]) + a * np.abs(Sc[i + 1])
            # keep each channel's relative phase to the mid
            rel = np.angle(Sc[i]) - np.angle(S[i])
            frame = np.fft.irfft(cm * np.exp(1j * (ph + rel)), n_fft) * win
            s = k * hop
            outs[c][s:s + n_fft] += frame
        norm[k * hop:k * hop + n_fft] += win ** 2
        phase = phase + omega + dphi
    norm = np.maximum(norm, 1e-3)
    y = np.stack([o / norm for o in outs], axis=1)[n_fft // 2:]
    y = y[:int(len(x2) * factor)]
    return y[:, 0] if x.ndim == 1 else y


def pitch_shift(x, semitones, n_fft=4096, hop=512):
    """Duration-preserving pitch shift = time stretch + varispeed."""
    r = 2 ** (semitones / 12.0)
    y = time_stretch(x, r, n_fft, hop)
    return varispeed(y, r)


# ---------------------------------------------------------------- space
def convolve(x, ir):
    """Stereo convolution. x: (n,) or (n,2); ir: (m,2)."""
    xs = to_stereo(x)
    out = np.stack([signal.oaconvolve(xs[:, c], ir[:, c]) for c in range(2)], axis=1)
    return out


def width(x, w):
    """Mid/side width: 1 = unchanged, 0 = mono."""
    xs = to_stereo(x)
    m = 0.5 * (xs[:, 0] + xs[:, 1])
    s = 0.5 * (xs[:, 0] - xs[:, 1]) * w
    return np.stack([m + s, m - s], axis=1)


def pan(x, p):
    """Constant-power pan of a stereo/mono signal; p in [-1, 1]."""
    xs = to_stereo(x)
    a = (p + 1) * np.pi / 4
    gl, gr = np.cos(a) * np.sqrt(2), np.sin(a) * np.sqrt(2)
    return np.stack([xs[:, 0] * gl, xs[:, 1] * gr], axis=1)


# ---------------------------------------------------------------- metering
def lufs(x, sr=SR):
    import pyloudnorm as pyln
    return pyln.Meter(sr).integrated_loudness(to_stereo(x))


def true_peak_db(x, sr=SR, os_factor=4):
    y = signal.resample_poly(to_stereo(x), os_factor, 1, axis=0)
    return float(db(np.abs(y).max()))


def short_env(x, win_s=0.01, sr=SR):
    m = np.abs(mono(x))
    w = max(1, int(win_s * sr))
    k = np.ones(w) / w
    return np.sqrt(np.convolve(m ** 2, k, mode="same"))
