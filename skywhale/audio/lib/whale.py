"""Humpback recordings: unit extraction and hydrophone-noise reduction.

Source material is real humpback song recorded by the U.S. National Park
Service hydrophone at Bartlett Cove, Glacier Bay (public domain).  Units
are cut from the 5-minute archive files by time, cleaned with a spectral
gate whose noise profile is measured on the same file, high-passed to
remove flow noise and resampled to 48 kHz.
"""
import functools
import os

import numpy as np
from scipy import signal

from . import dsp, paths

NATIVE_SR = 22050


@functools.lru_cache(maxsize=32)
def load_native(path):
    import soundfile as sf
    dsp.LOADED.add(os.path.abspath(path))
    x, sr = sf.read(path, always_2d=True)
    x = x.mean(axis=1)
    if sr != NATIVE_SR:
        x = dsp.resample(x, sr, NATIVE_SR)
    return x


N_FFT = 1024
HOP = 256


def _stft(x):
    f, t, Z = signal.stft(x, NATIVE_SR, nperseg=N_FFT, noverlap=N_FFT - HOP, boundary="even")
    return f, t, Z


@functools.lru_cache(maxsize=32)
def noise_profile(path):
    """Per-bin mean noise power, estimated from the 25th percentile of the
    frame powers over the whole file (song units are sparse in time; for
    exponentially distributed noise power p25 = 0.2877 * mean)."""
    x = load_native(path)
    f, t, Z = _stft(x)
    P = np.abs(Z) ** 2
    return np.percentile(P, 25, axis=1) / 0.2877


def denoise(x, noise, over=2.0, floor_db=-36.0, smooth_t=3, smooth_f=2):
    f, t, Z = _stft(x)
    P = np.abs(Z) ** 2
    g = 1.0 - over * noise[:, None] / np.maximum(P, 1e-20)
    g = np.clip(g, 10 ** (floor_db / 20.0), 1.0)
    # smooth the gain mask to avoid musical noise
    from scipy.ndimage import uniform_filter
    g = uniform_filter(g, size=(2 * smooth_f + 1, 2 * smooth_t + 1), mode="nearest")
    _, y = signal.istft(Z * g, NATIVE_SR, nperseg=N_FFT, noverlap=N_FFT - HOP, boundary=True)
    return y[:len(x)]


def unit(path, t0, t1, pre=0.12, post=0.35, hp=70.0, lp=None, over=2.0, floor_db=-36.0):
    """Cut [t0-pre, t1+post] from a recording, denoise, band-limit and
    return mono 48 kHz with raised-cosine fades."""
    x = load_native(path)
    a = max(0, int((t0 - pre) * NATIVE_SR))
    b = min(len(x), int((t1 + post) * NATIVE_SR))
    # denoise with context so the STFT edges are clean
    ca, cb = max(0, a - NATIVE_SR // 2), min(len(x), b + NATIVE_SR // 2)
    y = denoise(x[ca:cb], noise_profile(path), over=over, floor_db=floor_db)[a - ca:b - ca]
    y = dsp.resample(y, NATIVE_SR, dsp.SR)
    y = dsp.highpass(y, hp, order=4, zero_phase=True)
    if lp:
        y = dsp.lowpass(y, lp, order=4, zero_phase=True)
    y = dsp.fade(y, min(pre, 0.06), min(post, 0.25))
    return y / (np.abs(y).max() + 1e-12)


def nps(name):
    return os.path.join(paths.DOWNLOADS, "nps_glba_2020", name + ".aif")


def librosa_glba():
    return os.path.join(paths.DOWNLOADS, "librosa", "glacier-bay-humpback.hq.ogg")


def f0_track(y, sr=dsp.SR, fmin=80, fmax=2000, hop=0.01):
    """Dominant-partial track (strongest spectral peak per frame) - used to
    tune units to the score and to bend the brass layer along the same
    contour.  Returns (times, freqs, levels_db)."""
    n = 4096
    h = int(hop * sr)
    f, t, S = signal.spectrogram(y, sr, nperseg=n, noverlap=n - h)
    band = (f >= fmin) & (f <= fmax)
    Sb = S[band]
    k = Sb.argmax(axis=0)
    fr = f[band][k]
    lv = 10 * np.log10(Sb.max(axis=0) + 1e-20)
    return t, fr, lv
