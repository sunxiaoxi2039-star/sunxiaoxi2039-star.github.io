#!/usr/bin/env python3
"""Measure the rendered soundtrack against the director's spec and write
verify_report.json + mix_spectrogram.png.

Checks: format / exact length, integrated loudness (pyloudnorm and ffmpeg
ebur128), true peak (4x oversampling, own + ffmpeg), sample peak,
exact-zero silence windows, 4B level, event onsets vs cues (+-1 frame),
voice count of the score, and a provenance audit (every audio file the
pipeline read, and a scan of the code for oscillator-style generators).
"""
import json
import os
import re
import subprocess
import sys

sys.dont_write_bytecode = True  # keep the repo free of __pycache__

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from lib import dsp, paths  # noqa: E402
from lib.timeline import Timeline  # noqa: E402


def ffmpeg_ebur128(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-filter_complex",
                        "ebur128=peak=true:framelog=quiet", "-f", "null", "-"], capture_output=True, text=True)
    txt = r.stderr
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", txt)
    tp = re.findall(r"Peak:\s+(-?[\d.]+|-inf) dBFS", txt)
    lra = re.findall(r"LRA:\s+(-?[\d.]+) LU", txt)
    return dict(integrated=float(I[-1]) if I else None, true_peak=float(tp[-1]) if tp and tp[-1] != "-inf" else None,
                lra=float(lra[-1]) if lra else None)


def zero_check(x, t0, t1, sr):
    a, b = int(np.floor(t0 * sr)), int(np.ceil(t1 * sr))
    seg = x[a:b]
    nz = np.nonzero(np.any(seg != 0, axis=1))[0]
    return dict(window=[t0, t1], all_zero=bool(len(nz) == 0), nonzero_samples=int(len(nz)),
                first_nonzero=(float((a + nz[0]) / sr) if len(nz) else None))


def onset_in(x, t_cue, sr, search=0.35, rel_db=-30.0):
    """Onset of the energy rise nearest the cue in a stem: first point in
    [cue-search, cue+search] where the 5 ms envelope exceeds rel_db below
    the local maximum (cue..cue+1.5 s), measured relative to the level just
    before (so tails of earlier events don't count)."""
    a = int((t_cue - search) * sr)
    b = int((t_cue + 1.5) * sr)
    e = dsp.short_env(x[a:b], 0.005)
    pre = e[:int(0.15 * sr)].max() if a > 0 else 0.0
    peak = e.max()
    thr = max(peak * 10 ** (rel_db / 20.0), pre * 2.0)
    idx = np.where(e > thr)[0]
    return (a + idx[0]) / sr if len(idx) else None


def spectrogram_png(x, sr, tl, out):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from scipy import signal
    m = x.mean(axis=1)
    f, t, S = signal.spectrogram(m, sr, nperseg=4096, noverlap=3072)
    L = 10 * np.log10(S + 1e-20)
    fig, axs = plt.subplots(2, 1, figsize=(26, 10), gridspec_kw={"height_ratios": [3, 1]}, sharex=True)
    keep = f <= 12000
    axs[0].pcolormesh(t, f[keep], L[keep], vmin=L.max() - 95, vmax=L.max(), shading="auto", cmap="magma")
    axs[0].set_yscale("symlog", linthresh=500)
    axs[0].set_ylim(30, 12000)
    axs[0].set_ylabel("Hz")
    axs[0].set_title("SKY WHALE - full mix spectrogram (cues in cyan, cuts in white)")
    env = dsp.db(dsp.short_env(m, 0.05) + 1e-12)
    axs[1].plot(np.arange(len(m))[::240] / sr, env[::240], lw=0.6)
    axs[1].set_ylim(-110, -10)
    axs[1].set_ylabel("dBFS (50 ms)")
    for c in tl.cues.values():
        for ax in axs:
            ax.axvline(c["t"], color="c", lw=0.4, alpha=0.6)
        axs[0].text(c["t"], 11000, c["id"], rotation=90, fontsize=6, color="c", va="top")
    for ct in tl.cut_times():
        for ax in axs:
            ax.axvline(ct, color="w" if ax is axs[0] else "k", lw=0.8, ls="--", alpha=0.7)
    axs[1].set_xticks(np.arange(0, 101, 2))
    axs[1].grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(out, dpi=60)


def code_audit():
    """Scan the pipeline source for oscillator / tone-generator patterns."""
    hits = []
    pat = re.compile(r"(sin|cos)\(\s*2\s*\*\s*(np\.)?pi\s*\*|signal\.(chirp|sawtooth|square|gausspulse|sweep_poly)\(|"
                     r"random\.(normal|uniform|standard_normal)\(|\bwhite_noise\(|\boscillat\w*\(")
    for root, _, files in os.walk(HERE):
        for fn in files:
            if fn.endswith(".py") and fn != "verify.py":
                src = open(os.path.join(root, fn)).read()
                for i, line in enumerate(src.split("\n"), 1):
                    if pat.search(line):
                        hits.append(f"{fn}:{i}: {line.strip()}")
    return hits


def score_checks(tl):
    """Every sustained note fits inside its sample (no sample run-out) and
    lies in the instrument's range; texture (parts sounding at once)."""
    import score
    from lib import instruments
    S = score.build(tl)
    cache = json.load(open(os.path.join(paths.CACHE_DIR, "sample_levels.json")))
    issues = []
    for name, p in S.parts.items():
        if p.instrument == "piano":
            continue
        sfz = open(instruments.render_sfz(p.instrument)).read()
        dp = re.search(r"^default_path=(.*)$", sfz, re.M).group(1)
        regs = []
        for blk in sfz.split("<region>")[1:]:
            def g(k):
                m = re.search(rf"^{k}=(\S+)", blk, re.M)
                return m.group(1) if m else None
            smp = re.search(r"^sample=(.*)$", blk, re.M).group(1)
            regs.append((int(g("lokey")), int(g("hikey")), int(g("pitch_keycenter") or g("lokey")), os.path.join(dp, smp)))
        for a, b, k, v in p.resolved_notes():
            durs = [cache[path][1] * 2 ** ((kc - k) / 12.0) for lo, hi, kc, path in regs if lo <= k <= hi and path in cache]
            if not durs:
                issues.append(f"{name}: key {k} at {a:.2f}s outside instrument range")
            elif p.kind == "sustain" and min(durs) < (b - a) + 0.3:
                issues.append(f"{name}: key {k} at {a:.2f}s held {b - a:.2f}s > sample {min(durs):.2f}s")
    # every note actually sounds in its render (catches dropped / cut notes)
    dropped = []
    for name, p in S.parts.items():
        wav = os.path.join(paths.PARTS_DIR, name + ".wav")
        if not os.path.exists(wav) or not p.notes:
            continue
        x = dsp.mono(dsp.load(wav))
        e = dsp.short_env(x, 0.05)
        lv = []
        for a, b, k, v in p.resolved_notes():
            seg = e[int(a * 48000):int(b * 48000) + 2400]
            lv.append(float(dsp.db(seg.max() + 1e-12)) if len(seg) else -999.0)
        med = float(np.median(lv))
        for (a, b, k, v), l in zip(p.resolved_notes(), lv):
            if l < med - 30:
                dropped.append(f"{name}: key {k} at {a:.2f}s peaks {l:.0f} dB vs part median {med:.0f} dB")
    ts = np.arange(0, tl.duration, 0.05)
    counts = [sum(1 for p in S.parts.values() if any(x <= t < y for x, y, _, _ in p.resolved_notes())) for t in ts]
    return dict(sample_runout_or_range_issues=issues, notes_not_sounding=dropped, max_parts_sounding=int(max(counts)),
                seconds_with_more_than_5_parts=float(0.05 * sum(c > 5 for c in counts)),
                tempo_maps=[line for m in S.tempo_maps for line in m.describe()])


def run(tl=None, log=print):
    tl = tl or Timeline()
    rep = {}
    x, sr = sf.read(paths.MIX, dtype="float64", always_2d=True)
    info = sf.info(paths.MIX)
    n_expected = tl.total_frames * sr // tl.fps
    rep["format"] = dict(samplerate=sr, channels=info.channels, subtype=info.subtype, frames=len(x),
                         expected_frames=int(n_expected), exact_length=bool(len(x) == n_expected),
                         duration_s=len(x) / sr)
    import pyloudnorm as pyln
    rep["loudness"] = dict(integrated_lufs_pyloudnorm=float(pyln.Meter(sr).integrated_loudness(x)),
                           true_peak_dbtp_4x=float(dsp.true_peak_db(x, sr, 4)),
                           sample_peak_dbfs=float(dsp.db(np.abs(x).max())),
                           ffmpeg_ebur128=ffmpeg_ebur128(paths.MIX))
    ev = json.load(open(os.path.join(paths.WORK, "events.json")))
    g = ev["gates"]
    rep["silence"] = dict(opening=zero_check(x, 0.0, 3.0, sr), opening_to_3_5=zero_check(x, 0.0, 3.5, sr),
                          dusk_67_9_to_70_6=zero_check(x, 67.9, 70.6, sr),
                          dusk_gate_window=zero_check(x, g["dusk_silence"][0], g["dusk_silence"][1], sr),
                          last_sample_zero=bool(np.all(x[-1] == 0)))
    first = np.nonzero(np.any(x != 0, axis=1))[0]
    rep["silence"]["first_nonzero_s"] = float(first[0] / sr) if len(first) else None
    s4b = tl.shot("4B")
    seg = x[int(s4b["start"] * sr):int(s4b["end"] * sr)]
    rep["shot_4B"] = dict(peak_dbfs=float(dsp.db(np.abs(seg).max() + 1e-30)),
                          max_50ms_rms_dbfs=float(dsp.db(dsp.short_env(seg, 0.05).max() + 1e-30)),
                          note="only one extremely faint distant breath (2 km); the rest is digital silence")
    # stems
    stems = {}
    for name in ("music", "voices", "air"):
        p = os.path.join(paths.STEMS_DIR, f"skywhale_{name}.wav")
        s, _ = sf.read(p, dtype="float64", always_2d=True)
        stems[name] = s
        rep.setdefault("stems", {})[name] = dict(path=p, frames=len(s), peak_dbfs=float(dsp.db(np.abs(s).max() + 1e-30)),
                                                 dusk_zero=zero_check(s, 67.9, 70.6, sr)["all_zero"])
    rep["stems"]["sum_vs_mix_max_diff_db"] = float(dsp.db(np.abs(sum(stems.values()) - x).max() + 1e-30))
    # event onsets
    fr = 1.0 / tl.fps
    rows = []
    for e in ev["events"]:
        stem = stems[e["stem"]]
        t_stem = onset_in(stem, e["t_cue"], sr)
        rows.append(dict(cue=e["cue"], builder=e["builder"], stem=e["stem"], cue_t=e["t_cue"],
                         onset_isolated=e["t_onset"], err_ms_isolated=1000 * (e["t_onset"] - e["t_cue"]),
                         onset_in_stem=t_stem, err_ms_stem=(1000 * (t_stem - e["t_cue"]) if t_stem else None),
                         within_1_frame=bool(abs(e["t_onset"] - e["t_cue"]) <= fr),
                         dist_m=e["dist"], cloud=e["cloud_at_onset"]))
    # alignment of every placed event inside its stem (cross-correlation):
    # lag 0 means the sound sits exactly where it was placed
    for r_, e in zip(rows, ev["events"]):
        y, _ = sf.read(e["file"], dtype="float64", always_2d=True)
        on = int(round((e["t_onset"]) * sr)) - e["start"]
        a = e["start"] + on
        L = min(len(y) - on, int(1.0 * sr))
        ref = y[on:on + L].mean(axis=1)
        stem = stems[e["stem"]].mean(axis=1)
        best, lag_best = -1, None
        w = int(0.05 * sr)
        seg = stem[a - w:a + L + w]
        from scipy.signal import correlate
        cc = correlate(seg, ref, mode="valid", method="fft")
        lag_best = int(np.argmax(cc)) - w
        r_["xcorr_lag_samples"] = lag_best
        r_["xcorr_lag_ms"] = 1000.0 * lag_best / sr
    rep["events"] = rows
    rep["events_xcorr_all_zero_lag"] = all(abs(r_["xcorr_lag_samples"]) <= 1 for r_ in rows)
    files = ev.get("audio_files_read", [])
    cats = {}
    for f_ in files:
        k = ("recordings (downloads/)" if "/downloads/" in f_ else
             "sfizz renders of VSCO 2 CE / Salamander (work/)" if "/work/" in f_ else
             "VSCO 2 CE samples (direct)" if "/vsco2ce/" in f_ else "other")
        cats.setdefault(k, []).append(f_)
    rep["provenance_audio_files_read"] = cats
    rep["events_all_within_1_frame"] = all(r["within_1_frame"] for r in rows)
    rep["code_audit_oscillator_patterns"] = code_audit()
    rep["score"] = score_checks(tl)
    os.makedirs(os.path.dirname(paths.REPORT), exist_ok=True)
    with open(paths.REPORT, "w") as f:
        json.dump(rep, f, indent=1, default=float)
    spectrogram_png(x, sr, tl, paths.SPECTROGRAM)
    L = rep["loudness"]
    log(f"  length {len(x)} frames ({'exact' if rep['format']['exact_length'] else 'WRONG'}), "
        f"{info.subtype}, {sr} Hz, {info.channels} ch")
    log(f"  integrated {L['integrated_lufs_pyloudnorm']:.2f} LUFS (ffmpeg {L['ffmpeg_ebur128']['integrated']}), "
        f"true peak {L['true_peak_dbtp_4x']:.2f} dBTP (ffmpeg {L['ffmpeg_ebur128']['true_peak']}), "
        f"sample peak {L['sample_peak_dbfs']:.2f} dBFS")
    S = rep["silence"]
    log(f"  zeros 0-3.5 s: {S['opening_to_3_5']['all_zero']}  67.9-70.6 s: {S['dusk_67_9_to_70_6']['all_zero']}  "
        f"first sound {S['first_nonzero_s']:.3f} s  last sample zero: {S['last_sample_zero']}")
    log(f"  4B peak {rep['shot_4B']['peak_dbfs']:.1f} dBFS; events within +-1 frame: {rep['events_all_within_1_frame']}; "
        f"stem xcorr lag 0 for all: {rep['events_xcorr_all_zero_lag']}")
    log(f"  audio files read: " + ", ".join(f"{k}: {len(v)}" for k, v in cats.items()))
    if rep["code_audit_oscillator_patterns"]:
        log("  code audit hits: " + "; ".join(rep["code_audit_oscillator_patterns"]))
    return rep


if __name__ == "__main__":
    run()
