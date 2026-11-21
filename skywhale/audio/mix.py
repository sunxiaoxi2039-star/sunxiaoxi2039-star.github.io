"""SKY WHALE - render, place, mix and master.

music : score parts (sfizz renders) -> orchestral placement -> hall IR
        -> ducked around the whale voices -> one steady near perspective
voices: whale voices / breaths / creaks placed at cue times with per-shot
        perspective (distance, in-cloud), re-processed at every cut
air   : subtle air accents, placed the same way
Then: silence gating (exact zeros), loudness normalisation to -32 LUFS,
true-peak check, 24-bit output with dither only where there is signal.
"""
import json
import os

import numpy as np

import spotting
import voices as V
from lib import dsp, paths, render, space
from lib.timeline import Timeline

SR = dsp.SR

# Balance between the music bus and the diegetic sound (before the final
# loudness normalisation): relative trims in dB.
MUSIC_TRIM_DB = 8.0
VOICE_TRIM_DB = -7.0


# ------------------------------------------------------------------ helpers

def cloud_curve(tl):
    """In-cloud amount (0..1) for diegetic sound across the film, from the
    shots' inCloud windows and the cues that describe the transitions."""
    pts = [(0.0, 1.0)]
    # 1A: under the cloud sea until the snout breaks, clear of it by the
    # end of the shot's in-cloud window
    w1a = tl.shot("1A")["inCloud"]
    pts += [(tl.t("dawn_snout_break"), 1.0), (w1a[1], 0.0)]
    # 2C: 'sound muffles progressively from bank_enter until 38.2'
    w2c = tl.shot("2C")["inCloud"]
    pts += [(tl.t("bank_enter"), 0.0), (w2c[0] + 1.2, 1.0), (w2c[1], 1.0)]
    # 3A is open (below the storm), 3B inside, 3C inside until the burst
    w3b = tl.shot("3B")["inCloud"]
    pts += [(tl.shot("3A")["start"] + 1e-4, 0.0), (w3b[0] - 1e-4, 0.0), (w3b[0], 1.0), (w3b[1], 1.0)]
    w3c = tl.shot("3C")["inCloud"]
    pts += [(w3c[1], 1.0), (w3c[1] + 0.15, 0.0), (tl.duration, 0.0)]
    tt, vv = zip(*pts)
    assert all(b >= a for a, b in zip(tt, tt[1:])), "cloud curve points out of order"
    return lambda t: np.interp(t, tt, vv)


def event_time(tl, ref):
    if isinstance(ref, tuple):        # (shot id, offset)
        return tl.shot(ref[0])["start"] + ref[1]
    return tl.t(ref)


def event_dist(tl, ref, t):
    if not isinstance(ref, tuple) and "dist" in tl.cue(ref):
        return float(tl.cue(ref)["dist"])
    return tl.shot_distance(t)


BUILDERS = {
    "wake_song": V.wake_song, "air": V.air, "creak": V.creak, "breath": V.breath,
    "morning_hum": V.morning_hum, "groan": V.groan, "dusk_call": V.dusk_call,
    "night_song": V.night_song, "pod_voice": V.pod_voice, "answer_hum": V.answer_hum,
}


def body_end(y, rel_db=-24.0):
    e = dsp.short_env(y, 0.02)
    idx = np.where(e > e.max() * 10 ** (rel_db / 20.0))[0]
    return int(idx[-1]) if len(idx) else len(y)


# ------------------------------------------------------------------ voices

def build_events(tl, log=print):
    cloud = cloud_curve(tl)
    cuts = tl.cut_times()
    events = []
    os.makedirs(paths.EVENTS_DIR, exist_ok=True)
    for i, (ref, builder, kw, stem, level, duck, pan) in enumerate(spotting.EVENTS):
        t_cue = event_time(tl, ref)
        dist = event_dist(tl, ref, t_cue)
        dry, onset = BUILDERS[builder](**kw)
        forced = (not isinstance(ref, tuple)) and tl.cue(ref).get("inCloud", False)
        n_out = len(dry) + int(3.6 * SR)
        # place, measure the onset of the PROCESSED event (what the audience
        # hears: after distance filtering / cloud / reverb) and re-place so
        # that onset sits exactly on the cue
        start = int(round(t_cue * SR)) - onset
        for _ in range(3):
            out, c_arr = _place_event(tl, cloud, cuts, dry, start, n_out, t_cue, dist, forced, builder, kw, pan, level)
            on_proc = V.onset_of(out)
            err = start + on_proc - int(round(t_cue * SR))
            if err == 0:
                break
            start -= err
        ev = dict(idx=i, cue=ref if not isinstance(ref, tuple) else f"{ref[0]}+{ref[1]}", builder=builder,
                  kw=kw, stem=stem, t_cue=t_cue, dist=dist, start=start, onset_dry=onset,
                  onset_processed=on_proc, t_onset=(start + on_proc) / SR, duck=duck,
                  body_end=(start + body_end(out)) / SR, cloud_at_onset=float(c_arr[min(on_proc, len(c_arr) - 1)]),
                  segments=1 + sum(1 for c in cuts if start / SR < c < (start + n_out) / SR))
        ev["audio"] = out
        events.append(ev)
        log(f"  voice {ev['cue']:18s} {builder:11s} t={t_cue:7.3f}s onset={ev['t_onset']:7.3f}s "
            f"({1000 * (ev['t_onset'] - t_cue):+5.1f} ms) dist={dist:6.0f} m cloud={ev['cloud_at_onset']:.2f} "
            f"{'cuts:' + str(ev['segments'] - 1) if ev['segments'] > 1 else ''}")
    return events


def _place_event(tl, cloud, cuts, dry, start, n_out, t_cue, dist, forced, builder, kw, pan, level):
    t_abs = (start + np.arange(n_out)) / SR
    if builder == "air" and kw.get("kind") == "cloudbreak" and t_cue < 20:
        c_arr = np.full(n_out, 0.45)                # the cloud surface itself tearing
    elif forced:
        shot = tl.shot_at(t_cue)
        c_arr = np.where(t_abs < shot["end"], 1.0, cloud(t_abs))
    else:
        c_arr = cloud(t_abs)
    # perspective per shot segment (re-processed at every cut)
    seg_bounds = [start / SR] + [c for c in cuts if start / SR < c < (start + n_out) / SR] + [(start + n_out) / SR]
    out = np.zeros((n_out, 2))
    for k, (a, b) in enumerate(zip(seg_bounds, seg_bounds[1:])):
        d = dist if k == 0 else tl.shot_distance(a + 1e-3)
        placed = space.place(dry, d, cloud=c_arr, pan=pan, extra_gain_db=level + VOICE_TRIM_DB)
        placed = dsp.pad_to(placed, n_out)
        ia, ib = int(round(a * SR)) - start, int(round(b * SR)) - start
        ia, ib = max(0, ia), min(n_out, ib)
        xf = int(0.004 * SR)
        w = np.zeros(n_out)
        w[ia:ib] = 1.0
        if k > 0:
            w[max(0, ia - xf):ia + xf] = np.linspace(0, 1, len(w[max(0, ia - xf):ia + xf]))
        if ib < n_out and k < len(seg_bounds) - 2:
            w[max(0, ib - xf):ib + xf] = np.linspace(1, 0, len(w[max(0, ib - xf):ib + xf]))
        out += placed * w[:, None]
    # a movement boundary is a change of scene: the tail of a sound that
    # belongs to the previous scene is cut with the picture (60 ms fade)
    for sc in [m["start"] for m in tl.movements[1:]]:
        i = int(round(sc * SR)) - start
        if 0 < i < n_out:
            nf = int(0.06 * SR)
            fade = np.ones(n_out)
            fade[i:i + nf] = dsp.raised_cos(min(nf, n_out - i))[::-1][:len(fade[i:i + nf])]
            fade[i + nf:] = 0.0
            out *= fade[:, None]
    return out, c_arr


def stem_from_events(events, stem, n):
    out = np.zeros((n, 2))
    for ev in events:
        if ev["stem"] != stem:
            continue
        a = ev["start"]
        y = ev["audio"]
        lo, hi = max(0, a), min(n, a + len(y))
        if hi > lo:
            out[lo:hi] += y[lo - a:hi - a]
    return out


# ------------------------------------------------------------------ music

def music_bus(score, wavs, n, log=print):
    dry = np.zeros((n, 2))
    for name, w in wavs.items():
        p = score.parts[name]
        x = render.load_part(w, n)
        x = dsp.width(x, p.width)
        x = dsp.pan(x, p.pan)
        dry += x * dsp.undb(p.gain_db)
    wet = dsp.convolve(dry, space.ir_hall())[:n]
    pre = int(0.018 * SR)
    wet = np.concatenate([np.zeros((pre, 2)), wet[:n - pre]])
    music = dry + wet * dsp.undb(-9.0)
    music = dsp.highpass(music, 28.0, order=2)
    return music * dsp.undb(MUSIC_TRIM_DB)


def duck_curve(events, n):
    t = np.arange(n) / SR
    g = np.zeros(n)  # dB reduction (negative)
    for ev in events:
        if ev["duck"] <= 0:
            continue
        a = ev["t_onset"] - 0.15
        b = max(ev["body_end"], ev["t_onset"] + 0.3)
        r = 0.9
        env = np.zeros(n)
        m = (t >= a) & (t < a + 0.15)
        env[m] = (t[m] - a) / 0.15
        env[(t >= a + 0.15) & (t < b)] = 1.0
        m = (t >= b) & (t < b + r)
        env[m] = 1.0 - (t[m] - b) / r
        g = np.minimum(g, -ev["duck"] * env)
    return dsp.undb(g)


# ------------------------------------------------------------------ gating

def gate_mask(n, zero_spans, fade_spans):
    """zero_spans: [(t0, t1)] exact zeros.  fade_spans: [(t0, t1, dir)]
    raised-cosine fade-outs (dir=-1) ending at t1 / fade-ins (dir=+1)."""
    m = np.ones(n)
    for t0, t1, d in fade_spans:
        a, b = int(round(t0 * SR)), int(round(t1 * SR))
        w = dsp.raised_cos(b - a)
        m[a:b] *= w if d > 0 else w[::-1]
    for t0, t1 in zero_spans:
        a, b = max(0, int(np.floor(t0 * SR))), min(n, int(np.ceil(t1 * SR)))
        m[a:b] = 0.0
    return m


def quantize24(x, seed=1234):
    """TPDF dither at 24-bit, applied only where the signal is active, so
    silent regions stay exact zeros."""
    rng = np.random.default_rng(seed)
    q = 2.0 ** -23
    active = dsp.short_env(x, 0.02) > 2.0 ** -21
    d = (rng.random(x.shape) - rng.random(x.shape)) * q
    y = x + d * active[:, None]
    yi = np.clip(np.round(y / q), -2 ** 23, 2 ** 23 - 1)
    yi[x == 0.0] = 0
    return yi * q


def true_peak_limit(x, ceiling_db, sr=SR):
    """Gentle look-ahead peak limiter on 4x-oversampled peak estimates
    (only engages if needed)."""
    from scipy import signal as sg
    up = sg.resample_poly(x, 4, 1, axis=0)
    pk = np.abs(up).max(axis=1).reshape(-1, 4).max(axis=1)[:len(x)]
    ceil = dsp.undb(ceiling_db)
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-12))
    if need.min() >= 1.0:
        return x, 0.0
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    look = int(0.005 * sr)
    g = minimum_filter1d(need, 2 * look + 1)
    g = uniform_filter1d(g, look)
    g = np.minimum(g, minimum_filter1d(need, 3))
    return x * g[:, None], float(dsp.db(g.min()))


# ------------------------------------------------------------------ main

def run(score, wavs, tl, target_lufs=-32.0, tp_ceiling=-3.0, log=print):
    n = tl.total_frames * SR // tl.fps
    assert n == int(round(tl.duration * SR))
    events = build_events(tl, log)
    voices = stem_from_events(events, "voices", n)
    air = stem_from_events(events, "air", n)
    music = music_bus(score, wavs, n, log)
    music *= duck_curve(events, n)[:, None]

    # ---- silences (exact zeros) -----------------------------------------
    t_ma = tl.t("dusk_ma")
    t_cut = tl.t("dusk_hard_cut")
    t_sil0 = 67.9 if abs(t_ma - 66.6) < 1e-6 else t_ma + 1.3     # 'true digital silence from 67.9'
    faint = [e for e in events if e["cue"].startswith("4B")]
    t_sil1 = (faint[0]["start"] / SR) if faint else t_cut + 2.6
    t_sil1 = max(t_sil1, t_cut + 2.2)                             # at least to 70.6
    t_call = tl.t("dusk_call")
    t_music_off = t_call - 1.0
    t_night = tl.movement("V")["start"]
    end = tl.duration
    common_zero = [(0.0, 3.6), (t_sil0, t_sil1)]
    common_fade = [(end - 0.75, end, -1)]
    m_music = gate_mask(n, common_zero + [(t_music_off, t_night - 0.05)],
                        common_fade + [(t_music_off - 1.0, t_music_off, -1)])
    m_voice = gate_mask(n, common_zero, common_fade + [(t_sil0 - 0.7, t_sil0, -1)])
    music *= m_music[:, None]
    voices *= m_voice[:, None]
    air *= m_voice[:, None]
    gates = dict(start_silence=[0.0, 3.6], dusk_silence=[t_sil0, t_sil1], music_off=[t_music_off, t_night],
                 end_fade=[end - 0.75, end])

    # ---- loudness ---------------------------------------------------------
    mixd = music + voices + air
    lufs0 = dsp.lufs(mixd)
    g = dsp.undb(target_lufs - lufs0)
    total_gain = g
    mixd, music, voices, air = mixd * g, music * g, voices * g, air * g
    tp = dsp.true_peak_db(mixd)
    lim_gr = 0.0
    if tp > tp_ceiling - 0.3:
        limited, lim_gr = true_peak_limit(mixd, tp_ceiling - 0.4)
        ratio = np.divide(limited, mixd, out=np.ones_like(mixd), where=np.abs(mixd) > 0)
        mixd = limited
        music, voices, air = music * ratio, voices * ratio, air * ratio
        lufs1 = dsp.lufs(mixd)
        g2 = dsp.undb(target_lufs - lufs1)
        mixd, music, voices, air = mixd * g2, music * g2, voices * g2, air * g2
        total_gain = g * g2
    log(f"  loudness before gain {lufs0:.2f} LUFS -> gain {target_lufs - lufs0:+.2f} dB; limiter GR {lim_gr:.2f} dB")

    # ---- write ---------------------------------------------------------------
    os.makedirs(paths.STEMS_DIR, exist_ok=True)
    out = {}
    for name, sig in [("music", music), ("voices", voices), ("air", air)]:
        q = quantize24(sig, seed={"music": 11, "voices": 12, "air": 13}[name])
        dsp.write(os.path.join(paths.STEMS_DIR, f"skywhale_{name}.wav"), q, subtype="PCM_24")
        out[name] = q
    mq = quantize24(mixd, seed=7)
    dsp.write(paths.MIX, mq, subtype="PCM_24")
    # event log (and each placed event at final gain) for verification
    meta = []
    for ev in events:
        e = {k: v for k, v in ev.items() if k != "audio"}
        e["file"] = os.path.join(paths.EVENTS_DIR, f"{ev['idx']:02d}_{ev['cue'].replace('+', '_')}_{ev['builder']}.wav")
        dsp.write(e["file"], (ev["audio"] * total_gain).astype(np.float32))
        meta.append(e)
    with open(os.path.join(paths.WORK, "events.json"), "w") as f:
        json.dump(dict(events=meta, gates=gates, master_gain_db=float(dsp.db(total_gain)), limiter_gr_db=lim_gr,
                       audio_files_read=sorted(dsp.LOADED)), f, indent=1, default=float)
    return dict(events=meta, gates=gates)
