#!/usr/bin/env python3
"""SKY WHALE soundtrack: one command rebuilds everything.

    python3 skywhale/audio/build_audio.py            # fetch (if needed), render, mix, master, verify
    python3 skywhale/audio/build_audio.py --no-fetch  # skip the asset check

Outputs (in $SKYWHALE_AUDIO_BUILD, default /workspace/_build/audio):
    skywhale_mix.wav                 48 kHz / 24-bit / stereo, exactly totalFrames/fps long
    stems/skywhale_{music,voices,air}.wav
    mix_spectrogram.png, verify_report.json, work/ (MIDI, part renders, event log)
"""
import os
import subprocess
import sys

sys.dont_write_bytecode = True  # keep the repo free of __pycache__
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def main():
    t0 = time.time()
    if "--no-fetch" not in sys.argv:
        print("== 1/6 assets")
        subprocess.run([sys.executable, os.path.join(HERE, "fetch_assets.py")], check=True)
    from lib import instruments, paths, render
    from lib.timeline import Timeline
    import score
    import mix
    import verify

    tl = Timeline(paths.TIMELINE)
    print(f"== timeline: {tl.total_frames} frames @ {tl.fps} fps = {tl.duration:.6f} s, {len(tl.cues)} cues")

    print("== 2/6 instruments (calibrated VSCO 2 CE wrappers)")
    instruments.build_all()

    print("== 3/6 score")
    S = score.build(tl)
    for m in S.tempo_maps:
        for line in m.describe():
            print("  " + line)
    for line in S.notes_doc:
        print("  " + line)
    os.makedirs(paths.WORK, exist_ok=True)
    export_full_score(S, os.path.join(paths.WORK, "skywhale_score.mid"))

    print("== 4/6 render parts through sfizz_render")
    wavs = render.render_all(S)

    print("== 5/6 voices, air, music bus, mix, master")
    mix.run(S, wavs, tl)

    from lib import recordings
    if recordings.MISSING:
        print("!! DEV BUILD: these recordings were missing and contributed silence:", sorted(recordings.MISSING))
    print("== 6/6 verify")
    rep = verify.run(tl)
    if recordings.MISSING:
        import json
        rep["DEV_BUILD_missing_recordings"] = sorted(recordings.MISSING)
        with open(paths.REPORT, "w") as f:
            json.dump(rep, f, indent=1, default=float)
        sys.exit(2)
    print(f"done in {time.time() - t0:.0f} s -> {paths.MIX}")


def export_full_score(S, path):
    """All parts in one format-1 MIDI file (1 tick = 1 sample at 48 kHz),
    for inspection in a DAW / notation program."""
    import struct
    from lib import smf
    tracks = []
    for name, p in S.parts.items():
        t = smf.MidiTrack()
        for a, b, k, v in p.resolved_notes():
            t.note(a, b, k, v)
        evs = sorted(t.events, key=lambda e: (e[0], e[1]))
        body = bytearray()
        nm = name.encode()
        body += smf._vlq(0) + bytes([0xFF, 0x03, len(nm)]) + nm
        last = 0
        for tick, _, data in evs:
            body += smf._vlq(tick - last) + data
            last = tick
        body += smf._vlq(0) + bytes([0xFF, 0x2F, 0x00])
        tracks.append(body)
    tempo = bytearray(smf._vlq(0) + bytes([0xFF, 0x51, 0x03]) + smf.TEMPO_US.to_bytes(3, "big") + smf._vlq(0) + bytes([0xFF, 0x2F, 0x00]))
    with open(path, "wb") as f:
        f.write(b"MThd" + struct.pack(">IHHH", 6, 1, len(tracks) + 1, smf.PPQ))
        for tr in [tempo] + tracks:
            f.write(b"MTrk" + struct.pack(">I", len(tr)) + bytes(tr))


if __name__ == "__main__":
    main()
