"""Spotting: which voice / air accent plays on which cue.

Times, distances and in-cloud flags come from timeline.json (cue `t`,
`dist`, `inCloud`; shot `inCloud` windows).  `level` is the event's own
level relative to its distance-derived level; `duck` is how far the music
steps back (dB) while the event sounds.  Stems: 'voices' or 'air'.
"""

# (cue id, builder, builder kwargs, stem, level dB, duck dB, pan)
EVENTS = [
    # ---- I Dawn
    ("dawn_wake_song_1", "wake_song", dict(variant=1), "voices", -4.0, 5.0, -0.05),
    ("dawn_snout_break", "air", dict(kind="cloudbreak", seed=1.0), "air", -4.0, 0.0, 0.05),
    ("dawn_fins_open", "creak", dict(length=1.1, strength=1.4, seed=2.0), "voices", -3.0, 1.5, 0.15),
    ("dawn_breath", "breath", dict(kind="exhale", length=1.7, strength=1.2, seed=0.0), "voices", -1.0, 2.0, 0.0),
    ("dawn_wake_song_2", "wake_song", dict(variant=2), "voices", -1.0, 6.0, 0.05),
    # ---- II Morning
    ("morning_hum", "morning_hum", dict(), "voices", 0.5, 4.0, 0.1),
    ("fin_down_1", "air", dict(kind="fin", seed=3.0), "air", -14.0, 0.0, -0.3),
    ("fin_creak_1", "creak", dict(length=0.9, strength=1.0, seed=4.0), "voices", -11.0, 2.0, -0.25),
    ("fin_down_2", "air", dict(kind="fin", seed=5.0), "air", -14.0, 0.0, -0.3),
    ("fin_creak_2", "creak", dict(length=1.0, strength=1.1, seed=6.0), "voices", -11.0, 2.0, -0.25),
    ("bank_breath", "breath", dict(kind="exhale", length=0.9, strength=0.8, seed=1.3), "voices", -4.0, 1.5, 0.1),
    # ---- III Storm
    ("storm_groan_1", "groan", dict(intensity=1), "voices", -8.0, 4.0, 0.0),
    ("storm_groan_2", "groan", dict(intensity=2), "voices", -9.0, 4.0, -0.05),
    ("storm_groan_3", "groan", dict(intensity=2, rising=True), "voices", -8.0, 4.0, 0.05),
    ("storm_burst", "air", dict(kind="burst", seed=7.0), "air", -6.0, 0.0, 0.0),
    ("relief_breath", "breath", dict(kind="exhale", length=2.3, strength=1.0, seed=2.6), "voices", -1.0, 3.0, 0.0),
    # ---- IV Dusk
    ("dusk_inhale", "breath", dict(kind="inhale", length=1.0, seed=3.9), "voices", 0.0, 2.0, 0.0),
    ("dusk_blow", "breath", dict(kind="exhale", length=1.7, strength=0.7, seed=5.2), "voices", -1.0, 2.0, 0.0),
    ("dusk_call", "dusk_call", dict(), "voices", 3.5, 0.0, 0.0),
    # 4B: the lonely wide.  No answer: only the whale's own breath, 2 km away.
    (("4B", 4.2), "breath", dict(kind="exhale", length=1.8, strength=0.6, seed=6.5), "voices", -13.0, 0.0, 0.2),
    # ---- V Night
    ("night_begin", "breath", dict(kind="exhale", length=1.8, strength=0.7, seed=7.7), "voices", 0.0, 2.0, -0.2),
    ("night_song", "night_song", dict(), "voices", -4.0, 8.0, 0.0),
    ("pod_drover", "air", dict(kind="cloudbreak", seed=8.0), "air", -5.0, 0.0, -0.35),
    ("pod_drover", "pod_voice", dict(who="drover"), "voices", 2.0, 3.0, -0.35),
    ("pod_pip", "pod_voice", dict(who="pip"), "voices", -1.0, 2.0, 0.4),
    ("pod_elder", "pod_voice", dict(who="elder"), "voices", 3.0, 3.0, -0.55),
    ("pod_mend", "pod_voice", dict(who="mend"), "voices", 0.0, 2.0, 0.25),
    ("pod_swift", "air", dict(kind="leap", seed=9.0), "air", -8.0, 0.0, 0.55),
    ("pod_swift", "pod_voice", dict(who="swift"), "voices", -1.0, 2.0, 0.55),
    ("old_whale_joins", "answer_hum", dict(), "voices", 0.0, 2.0, 0.0),
]
