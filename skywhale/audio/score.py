"""SKY WHALE - original score, written as code.

Every note has an exact time, pitch and dynamic.  Times are derived from
timeline.json: hit points are written relative to cues (film-scoring
"sync points") and the metric passages (Morning, Night) run on tempo maps
whose anchors are cues and cuts, so moving a cue in timeline.json
re-times the music.

Motif: D - A - B  (do - sol - la in D major pentatonic: a rising fifth and
a step up to the sixth).  It is the whale's character:

  I   Dawn     hinted low and slow in the celli as the cloud swells, then
               stated by horn + violins in octaves, blooming on the breach.
  II  Morning  the lyrical melody (flute, piano an octave above) opens on it.
  III Storm    coloured minor, D - A - Bb, in celli then violas; the Bb
               lifts to B at the burst, and the rainbow brings it back in
               the major (flute + violins, a glockenspiel glint).
  IV  Dusk     withdrawn: the piano offers D ... A, and the B never comes.
  V   Night    the piano remembers it softly; each pod whale is answered
               by a fragment of it; horn + violins return it warmly and the
               B finally lands on the D major chord ("together").

Orchestra: VSCO 2 CE strings, woodwinds, horn and percussion, Salamander
grand piano.  Texture is kept to three or four independent lines.
"""
from lib.scorelib import Score, P
from lib.tempo import TempoMap

# max safe sustain per sample family (s): longer holds are re-bowed
MAXLEN = {"vln_sus": 7.0, "vla_sus": 7.0, "vc_sus": 6.0, "cb_sus": 6.0, "vln_trem": 6.5,
          "vla_trem": 6.5, "vc_trem": 6.0, "cb_trem": 5.5, "hn_sus": 3.8, "fl_sus": 4.2,
          "cl_sus": 4.2, "bn_sus": 5.0, "ob_sus": 5.5, "svln": 9.0}


def sustain(part, t, dur, pitch, vel=64, overlap=0.0):
    """Hold a note for `dur` seconds, re-articulating (bow change / new
    breath) under the sound when the samples would run out."""
    mx = MAXLEN.get(part.instrument, 30.0)
    while dur > mx:
        part.note(t, mx, pitch, vel)
        t += mx - overlap
        dur -= mx - overlap
    part.note(t, dur, pitch, vel)


def build(tl):
    S = Score()
    c = tl.t  # cue time lookup

    # ---------------------------------------------------------------- parts
    # pan: -1 left .. +1 right (orchestral seating); width: stereo spread
    vln1 = S.part("vln1", "vln_sus", pan=-0.45, gain_db=0.0)
    vln2 = S.part("vln2", "vln_sus", pan=-0.18, gain_db=-1.0)
    vla = S.part("vla", "vla_sus", pan=0.18, gain_db=-0.5)
    vc = S.part("vc", "vc_sus", pan=0.38, gain_db=0.0)
    cb = S.part("cb", "cb_sus", pan=0.52, gain_db=-1.0)
    vln_tr = S.part("vln_trem", "vln_trem", pan=-0.35, gain_db=-3.0)
    vla_tr = S.part("vla_trem", "vla_trem", pan=0.18, gain_db=-3.0)
    vc_tr = S.part("vc_trem", "vc_trem", pan=0.38, gain_db=-2.0)
    cb_tr = S.part("cb_trem", "cb_trem", pan=0.52, gain_db=-2.0)
    vc_pz = S.part("vc_pizz", "vc_pizz", pan=0.38, gain_db=-3.0, kind="perc")
    vln_pz = S.part("vln_pizz", "vln_pizz", pan=-0.40, gain_db=-4.0, kind="perc")
    fl = S.part("fl", "fl_sus", pan=-0.08, gain_db=-2.0)
    cl = S.part("cl", "cl_sus", pan=0.06, gain_db=-3.0)
    bn = S.part("bn", "bn_sus", pan=0.14, gain_db=-2.0)
    hn = S.part("hn", "hn_sus", pan=-0.25, gain_db=-1.0)
    timp = S.part("timp", "timp", pan=0.10, gain_db=-3.0, kind="perc", width=0.5)
    perc = S.part("perc", "perc", pan=0.0, gain_db=-6.0, kind="perc", width=0.6)
    glock = S.part("glock", "glock", pan=0.30, gain_db=-12.0, kind="perc", width=0.4)
    pno = S.part("pno", "piano", pan=0.0, gain_db=2.0, kind="piano", width=0.75)

    # ================================================================ I DAWN
    # Free time, hit points on cues.  Silence to 3.8 s (opening hold).
    t_emerge = min(3.8, c("dawn_swell") - 1.2)
    S.doc(f"I Dawn: senza misura; first sound {t_emerge:.2f}s; bloom on dawn_breach_peak {c('dawn_breach_peak'):.2f}s")
    swell, snout, brow, eye = c("dawn_swell"), c("dawn_snout_break"), c("dawn_brow"), c("dawn_eye_sun")
    garden, fins, breath, peak = c("dawn_garden"), c("dawn_fins_open"), c("dawn_breath"), c("dawn_breach_peak")
    song2, mv2 = c("dawn_wake_song_2"), tl.movement("II")["start"]

    # 1. a single high A in the violins, from nothing (the first light)
    vln1.dyn_at(0, "pp")
    vln1.niente_in(t_emerge, t_emerge + 2.6)
    sustain(vln1, t_emerge, eye + 0.45 - t_emerge, "A5")
    vln1.expr(eye - 0.3, 127, eye + 0.45, 0)          # hands the A to vln2

    # 2. the motif hinted low and slow in the celli as the cloud swells
    vc.dyn_at(0, "pp")
    vc.niente_in(swell, swell + 1.6)
    vc.note(swell, snout - swell + 0.25, "D3", 40)    # holds under the muffled waking song
    vc.note(snout, brow - snout + 0.25, "A3", 40)     # moves only on picture (snout tears through)
    vc.note(brow, garden - brow + 0.2, "B3", 40)      # brow emerges: the sixth
    vc.hairpin(snout, "pp", brow, "p")
    # basses take the open fifth below
    cb.dyn_at(0, "pp")
    cb.niente_in(snout, snout + 1.2)
    sustain(cb, snout, peak + 1.8 - snout, "D2")

    # 3. the light passes to the second violins as the brass eye catches the sun
    vln2.dyn_at(0, "pp")
    vln2.niente_in(eye - 0.25, eye + 0.6)
    sustain(vln2, eye - 0.25, song2 + 2.9 - (eye - 0.25), "A5")
    vln2.hairpin(garden, "pp", peak, "mf")
    vln2.hairpin(peak + 0.4, "mf", song2 - 0.1, "pp")
    vln2.niente_out(song2 + 1.9, song2 + 2.9)

    # 4. garden and pennants: the violas open the harmony; celli settle on D/A
    vla.dyn_at(0, "p")
    vla.niente_in(garden, garden + 0.8)
    vla.note(garden, peak + 1.65 - garden, "F#4", 60)
    vla.note(peak + 1.5, song2 + 3.2 - (peak + 1.5), "E4", 50)  # Dadd9, settling open
    vla.hairpin(garden, "p", peak, "mf")
    vla.hairpin(peak + 0.3, "mf", song2 - 0.2, "pp")
    vla.niente_out(song2 + 2.2, song2 + 3.2)
    vc.chord(garden, peak + 1.7 - garden, ["D3", "A3"], 50)
    vc.note(peak + 1.6, mv2 + 0.6 - (peak + 1.6), "D3", 40)
    vc.hairpin(garden, "p", peak, "f")
    vc.hairpin(peak + 0.3, "f", song2 - 0.2, "pp")
    vc.niente_out(mv2 - 0.6, mv2 + 0.6)
    cb.hairpin(garden, "pp", peak, "mf")
    cb.hairpin(peak + 0.3, "mf", peak + 1.6, "pp")
    cb.niente_out(peak + 1.0, peak + 1.8)

    # 5. the motif stated fully: horn (in octaves) + first violins two
    #    octaves up; D as the fins open, A on the breath, B blooms on the breach
    t_d = fins - 0.35
    t_a = breath - 0.15
    hn.dyn_at(0, "mp")
    hn.chord(t_d, t_a - t_d + 0.08, ["D3", "D4"], 70)
    hn.chord(t_a, peak - t_a + 0.08, ["A3", "A4"], 80)
    hn.chord(peak, 1.75, ["B3", "B4"], 90)
    hn.hairpin(t_d, "mp", peak, "f")
    hn.hairpin(peak + 0.25, "f", peak + 1.75, "p")
    vln1.hold(1, t_d - 0.01, "mp")
    vln1.expr(t_d - 0.02, 127, t_d, 127)
    vln1.note(t_d, t_a - t_d + 0.1, "D5", 70)
    vln1.note(t_a, peak - t_a + 0.1, "A5", 80)
    vln1.note(peak, 1.9, "B5", 90)
    vln1.hairpin(t_d, "mp", peak, "f")
    vln1.hairpin(peak + 0.3, "f", peak + 1.9, "pp")
    vln1.niente_out(peak + 1.3, peak + 1.9)

    # 6. after the waking song: the flute soars down into the morning
    fl.dyn_at(0, "p")
    f0 = max(song2 + 2.5, mv2 - 1.85)
    fl.note(f0, 0.55, "B5", 40)
    fl.note(f0 + 0.5, 0.5, "A5", 38)
    fl.note(f0 + 0.95, 0.5, "F#5", 36)
    fl.note(f0 + 1.4, mv2 - (f0 + 1.4) + 0.1, "E5", 34)
    fl.hairpin(f0, "p", mv2, "pp")

    # ================================================================ II MORNING
    # 4/4, tempo map anchored to the movement start and the two cuts.
    s2b, s2c = tl.shot("2B")["start"], tl.shot("2C")["start"]
    mv3 = tl.movement("III")["start"]
    M = TempoMap("II Morning", [(0, mv2), (8, s2b), (14, s2c), (20, mv3)])
    S.tempo_maps.append(M)
    b = M.time

    # melody: flute, piano an octave above (Hisaishi doubling)
    mel = [(0, 1, "D5", 52), (1, 1, "A5", 54), (2, 2.5, "B5", 58),     # the motif, open
           (4.5, 0.5, "A5", 50), (5, 1, "F#5", 50), (6, 2.1, "E5", 46)]  # answer, left open
    fl.hold(1, b(0), "mp")
    for beat, dur, pitch, v in mel:
        t0, t1 = b(beat), b(beat + dur)
        fl.note(t0, t1 - t0 + 0.06, pitch, v)
        pno.note(t0, min(t1 - t0, 2.2), P(pitch) + 12, v - 10)
    fl.hairpin(b(2), "mp", b(3), "mf")         # bloom on the held B
    fl.hairpin(b(3.2), "mf", b(4.4), "mp")     # breathe back under the hum
    fl.hairpin(b(6), "mp", b(8), "pp")
    pno.pedal(b(0) - 0.05, b(1.95)); pno.pedal(b(2), b(4.45)); pno.pedal(b(4.5), b(5.95)); pno.pedal(b(6), b(8.6))

    # gentle walking pulse: celli pizzicato on the beat
    walk = ["D3", "A3", "F#3", "A3", "G3", "D3", "A2", "E3"]
    for i, pitch in enumerate(walk):
        vc_pz.note(b(i), 0.4, pitch, 44 if i % 2 == 0 else 36)
    # harmony: violas + second violins, basses below (I - IV - V)
    for (b0, b1, v2p, vap, cbp) in [(0, 4, "A4", "F#4", "D2"), (4, 6, "B4", "G4", "G2"), (6, 8.3, "A4", "E4", "A2")]:
        vln2.note(b(b0), b(b1) - b(b0) + 0.08, v2p, 40)
        vla.note(b(b0), b(b1) - b(b0) + 0.08, vap, 40)
        cb.note(b(b0), b(b1) - b(b0) + 0.08, cbp, 40)
    for p_ in (vln2, vla, cb):
        p_.hold(1, b(0) - 0.05, "pp")
        p_.expr(b(0) - 0.06, 0, b(0) + 0.8, 127)
    cb.hold(1, b(0), "pp")

    # fin close-up (2B): thin to sustained strings that breathe with the fin;
    # nothing new is attacked on the creaks.
    fd1, fc1, fd2, fc2 = c("fin_down_1"), c("fin_creak_1"), c("fin_down_2"), c("fin_creak_2")
    vln2.note(b(8.2), fd2 - b(8.2) + 0.1, "B4", 36); vla.note(b(8.2), fd2 - b(8.2) + 0.1, "D4", 36)
    cb.note(b(8.2), fd2 - b(8.2) + 0.1, "G2", 36)
    vln2.note(fd2, s2c + 0.3 - fd2, "A4", 36); vla.note(fd2, s2c + 0.3 - fd2, "F#4", 36)
    cb.note(fd2, s2c + 0.3 - fd2, "D2", 36)
    for p_ in (vln2, vla):
        p_.hairpin(b(8), "pp", fd1 - 0.05, "mp"); p_.hairpin(fd1 + 0.1, "mp", fc1 - 0.2, "pp")
        p_.hairpin(fd2 - 0.9, "pp", fd2 - 0.05, "mp"); p_.hairpin(fd2 + 0.1, "mp", fc2 - 0.2, "pp")
    cb.hairpin(b(8), "pp", fd1, "p"); cb.hairpin(fd1 + 0.1, "p", fc1, "pp")

    # cloud bank (2C): a last breath of the motif in the flute, then the
    # piano blurs (pedal held) and the strings dissolve into the cloud.
    bb, be = c("bank_breath"), c("bank_enter")
    fl.hold(1, s2c - 0.05, "pp")
    fl.note(s2c, 0.45, "D5", 34); fl.note(s2c + 0.42, bb - (s2c + 0.42) + 0.6, "A5", 34)
    fl.note(bb + 0.55, be - bb + 0.1, "B5", 32)
    fl.hairpin(bb + 0.55, "pp", be + 0.6, "ppp")
    vln2.note(s2c + 0.25, mv3 - s2c - 0.75, "E5", 30); vla.note(s2c + 0.25, mv3 - s2c - 0.75, "A4", 30)
    for p_ in (vln2, vla):
        p_.hairpin(s2c + 0.2, "pp", be, "pp")
        p_.niente_out(be + 0.4, mv3 - 0.55)
    blur = [(be + 0.05, "B5"), (be + 0.8, "E6"), (be + 1.5, "A5"), (be + 2.3, "D6"), (be + 3.1, "F#5")]
    for i, (t0, pitch) in enumerate(blur):
        pno.note(t0, 2.5, pitch, 30 - 3 * i)
    pno.pedal(be - 0.05, mv3 - 0.3)

    # the storm gathers underneath: low tremolo from nothing
    vc_tr.dyn_at(0, "pp"); cb_tr.dyn_at(0, "pp")
    vc_tr.niente_in(b(18), b(19.6))
    vc_tr.note(b(18), min(6.0, mv3 + 4.0 - b(18)), "D3", 40)
    vc_tr.niente_out(mv3 + 3.0, mv3 + 4.0)
    cb_tr.niente_in(b(19), mv3 + 0.6)
    sustain(cb_tr, b(19), c("storm_burst") - b(19) + 0.15, "D2", 40)

    # ================================================================ III STORM
    g1, l1, g2, l2, g3, l3 = (c(x) for x in ("storm_groan_1", "lightning_1", "storm_groan_2",
                                             "lightning_2", "storm_groan_3", "lightning_3"))
    burst, rainbow, relief = c("storm_burst"), c("rainbow"), c("relief_breath")
    mv4 = tl.movement("IV")["start"]
    S.doc(f"III Storm: hit points lightning {l1:.2f}/{l2:.2f}/{l3:.2f}s, release on storm_burst {burst:.2f}s")

    # the motif in minor, celli (arco), placed between the groans
    vc.hold(1, mv3, "p")
    vc.niente_in(mv3 + 0.4, mv3 + 1.0)
    vc.note(mv3 + 0.4, g1 - 1.0 - (mv3 + 0.4) + 0.1, "D3", 50)
    vc.note(g1 - 1.0, 2.25, "A3", 52)              # holds through the first groan
    vc.note(g1 + 1.2, 2.2, "Bb3", 54)              # Bb: the motif darkened
    vc.hairpin(g1 + 1.2, "p", g1 + 2.2, "mp"); vc.hairpin(g1 + 2.3, "mp", g1 + 3.4, "pp")
    vc.niente_out(g1 + 3.0, g1 + 3.4)
    vc_tr.hairpin(mv3, "pp", mv3 + 2, "p")
    cb_tr.hairpin(mv3, "pp", l1, "p")

    # into the storm cloud: violins tremolo high, restrained
    tc = tl.shot("3B")["start"]
    vln_tr.dyn_at(0, "pp")
    vln_tr.niente_in(tc - 0.3, tc + 1.2)
    sustain(vln_tr, tc - 0.3, burst - (tc - 0.3) + 0.1, "A5", 40)
    vla_tr.dyn_at(0, "pp")
    vla_tr.niente_in(tc, tc + 1.5)
    sustain(vla_tr, tc, l3 - tc + 0.2, "D4", 40)
    vla_tr.niente_out(l3 - 0.6, l3 + 0.2)
    for lt in (l1, l2, l3):   # each flash lifts the tremolo a little
        vln_tr.hairpin(lt - 0.05, "p", lt + 0.9, "pp")

    # lightning: timpani + bass drum, soft (orchestral, never loud)
    timp.note(l1, 2.0, "D2", 58); perc.note(l1, 1.5, 36, 34)
    timp.note(l2, 1.0, "D2", 46); timp.note(l2 + 0.13, 2.0, "D2", 40)       # double flicker
    timp.note(l3, 2.5, "D2", 80); timp.note(l3, 2.5, "A2", 60); perc.note(l3, 2.0, 36, 66)

    # second minor statement, violas (higher, more tense) between groans 2 and 3
    vla.hold(1, g2, "p")
    vla.expr(g2 + 0.9, 0, g2 + 1.3, 127)
    vla.note(g2 + 1.0, l2 - (g2 + 1.0) + 0.1, "D4", 50)
    vla.note(l2, l3 - l2 + 0.1, "A4", 54)          # with the double flicker, held through groan 3
    vla.note(l3, burst - l3 + 0.1, "Bb4", 58)       # Bb on the biggest flash, held: the tension
    vla.hairpin(l2, "p", l3, "p")
    vla.hairpin(l3 + 0.2, "p", burst - 0.05, "mf")
    vln_tr.hairpin(l3 + 0.9, "pp", burst - 0.05, "mf")
    cb_tr.hairpin(l3, "p", burst - 0.05, "mf")
    perc.note(burst - 1.25, 1.6, 47, 70)        # suspended cymbal swell (short) peaking on the burst

    # release: a bright open D chord as the whale bursts out
    vla.note(burst, rainbow - burst + 0.2, "B4", 70)              # Bb -> B: the motif turns major
    vla.note(rainbow + 0.1, mv4 - rainbow - 0.4, "A4", 50)
    vla.hairpin(burst + 0.2, "mf", rainbow, "mp"); vla.hairpin(rainbow, "mp", mv4 - 0.3, "pp")
    vc.hold(1, burst - 0.02, "mf")
    vc.expr(burst - 0.03, 127, burst, 127)
    vc.chord(burst, mv4 - burst - 0.3, ["D3", "A3"], 70)
    vc.hairpin(burst + 0.2, "mf", mv4 - 0.3, "pp")
    cb.hold(1, burst - 0.02, "mf"); cb.expr(burst - 0.03, 127, burst, 127)
    cb.note(burst, mv4 - burst - 0.2, "D2", 70)
    cb.hairpin(burst + 0.2, "mf", mv4 - 0.3, "pp")
    vln2.hold(1, burst - 0.02, "mf"); vln2.expr(burst - 0.03, 127, burst, 127)
    vln2.chord(burst, mv4 - burst - 0.3, ["E5", "F#5"], 70)        # add9 shimmer
    vln2.hairpin(burst + 0.2, "mf", rainbow, "mp"); vln2.hairpin(rainbow, "mp", mv4 - 0.3, "pp")
    hn.hold(1, burst - 0.02, "mp")
    hn.note(burst, 2.0, "F#4", 70)
    hn.hairpin(burst + 0.3, "mp", burst + 2.0, "pp")

    # the rainbow: the motif in the major, flute + violins in octaves, a glint
    fl.hold(1, rainbow - 0.05, "mp")
    vln1.hold(1, rainbow - 0.05, "p"); vln1.expr(rainbow - 0.06, 127, rainbow - 0.05, 127)
    for (dt, dur, pitch) in [(0.0, 0.5, "D5"), (0.45, 0.5, "A5"), (0.9, 2.6, "B5")]:
        fl.note(rainbow + dt, dur, pitch, 60)       # flute and violins in unison
        vln1.note(rainbow + dt, dur, pitch, 60)
    fl.hairpin(rainbow + 0.9, "mp", rainbow + 3.4, "pp")
    vln1.hairpin(rainbow + 0.9, "p", rainbow + 3.4, "pp")
    glock.note(rainbow + 0.9, 3.0, "B6", 34)

    # ================================================================ IV DUSK
    # withdrawn to nothing: the piano offers D ... A, and stops.  No B.
    dusk_in = c("dusk_inhale")
    pd = mv4 + 0.4
    pno.note(pd, 2.4, "D4", 46)
    pno.note(pd + 1.3, 1.6, "A4", 42)
    pno.pedal(pd - 0.05, min(pd + 2.9, dusk_in + 0.3))
    S.doc(f"IV Dusk: last music note {pd + 1.3:.2f}s; music bus gated to zero before dusk_call {c('dusk_call'):.2f}s")

    # ================================================================ V NIGHT
    mv5 = tl.movement("V")["start"]
    nb, song = c("night_begin"), c("night_song")
    eyes, drover, pip, elder = c("pod_eyes"), c("pod_drover"), c("pod_pip"), c("pod_elder")
    mend, swift, joins, together = c("pod_mend"), c("pod_swift"), c("old_whale_joins"), c("together")
    end = tl.duration
    s5b = tl.shot("5B")["start"]

    # very soft: high strings, and the piano remembers the motif
    vln1.hold(1, mv5, "pp"); vln1.niente_in(mv5 + 0.2, mv5 + 2.6)
    sustain(vln1, mv5 + 0.2, s5b - mv5 + 0.1, "D6", 30)
    vln1.niente_out(s5b - 1.2, s5b + 0.3)
    vln2.hold(1, mv5, "pp"); vln2.niente_in(mv5 + 1.0, mv5 + 3.0)
    sustain(vln2, mv5 + 1.0, song + 4.6 - (mv5 + 1.0), "A5", 30)   # a halo, ducked under the song
    vln2.niente_out(song + 3.4, song + 4.6)
    N = TempoMap("V Night (piano)", [(0, nb + 0.7), (6, s5b - 0.2)])
    S.tempo_maps.append(N)
    for beat, pitch, v in [(0, "D5", 44), (1, "A5", 44), (2.2, "B5", 48), (4, "F#5", 40), (5, "E5", 38)]:
        pno.note(N.time(beat), 2.2, pitch, v)
    pno.pedal(N.time(0) - 0.05, N.time(2.1)); pno.pedal(N.time(2.2), N.time(3.9)); pno.pedal(N.time(4), s5b + 0.6)
    # after the song: two soft piano notes, then the hush for the eyes
    pno.note(song + 4.0, 1.8, "A4", 40); pno.note(song + 4.7, 1.5, "B4", 38)
    pno.pedal(song + 3.95, eyes - 0.2)

    # the pod rises; each whale is answered by a fragment of the motif
    # Drover (deep, heavy) -> celli + basses: D ... A, low and warm
    vc.hold(1, drover, "p"); cb.hold(1, drover, "p")
    vc.niente_in(drover + 0.6, drover + 1.4); cb.niente_in(drover + 0.6, drover + 1.4)
    vc.note(drover + 0.6, 0.75, "D3", 50)
    vc.chord(drover + 1.3, mend + 0.45 - (drover + 1.3), ["D3", "A3"], 50)
    cb.note(drover + 0.6, mend + 0.45 - (drover + 0.6), "D2", 50)
    # Pip (small, young, quick) -> pizzicato violins, D-A-B in a blink
    for i, pitch in enumerate(["D5", "A5", "B5"]):
        vln_pz.note(pip + 0.5 + 0.12 * i, 0.5, pitch, 58 + 4 * i)
    # Elder (very old, slow) -> bassoon, slow and low, D falling to B
    bn.hold(1, elder, "p"); bn.niente_in(elder + 1.2, elder + 1.9)
    bn.note(elder + 1.2, mend + 0.55 - (elder + 1.2), "D3", 50)
    bn.note(mend + 0.5, joins - mend - 0.3, "B2", 46)
    bn.hairpin(mend + 0.5, "p", joins - 0.4, "pp")
    # harmony moves to B minor under Elder/Mend
    vc.chord(mend + 0.4, joins - mend - 0.3, ["B2", "F#3"], 46)
    cb.note(mend + 0.4, joins - mend - 0.3, "B1", 46)
    vla.hold(1, mend, "pp"); vla.niente_in(mend + 0.4, mend + 1.2)
    vla.note(mend + 0.4, joins - mend - 0.3, "D4", 40)
    # Mend (gentle) -> clarinet, a soft two-note sigh F# - A
    cl.hold(1, mend, "p"); cl.niente_in(mend + 0.9, mend + 1.3)
    cl.note(mend + 0.9, 0.7, "F#4", 44)
    cl.note(mend + 1.55, joins - (mend + 1.55) + 0.3, "A4", 44)
    cl.hairpin(mend + 1.55, "p", joins + 0.3, "pp")
    # Swift (lean, fast, bright) -> flute, the motif at speed
    fl.hold(1, swift, "mp")
    for i, pitch in enumerate(["D5", "A5", "B5"]):
        fl.note(swift + 0.5 + 0.11 * i, 0.16 if i < 2 else 0.6, pitch, 60)
    # the Old Whale joins: horn + first violins return the motif warmly over IV,
    # the B lands on "together" over D major, then settles to A.
    t_d, t_a = joins + 0.05, joins + 0.05 + 0.48 * (together - joins)
    hn.hold(1, joins, "p")
    hn.expr(joins - 0.01, 127, joins, 127)
    hn.chord(t_d, t_a - t_d + 0.06, ["D3", "D4"], 60)
    hn.chord(t_a, together - t_a + 0.06, ["A3", "A4"], 66)
    hn.chord(together, 1.3, ["B3", "B4"], 72)
    hn.chord(together + 1.25, end - together - 1.6, ["A3", "A4"], 54)
    hn.hairpin(t_d, "p", together, "mf"); hn.hairpin(together + 0.2, "mf", end - 0.4, "pp")
    vln1.hold(1, joins - 0.02, "p"); vln1.expr(joins - 0.03, 127, joins, 127)
    vln1.note(t_d, t_a - t_d + 0.08, "D5", 60)
    vln1.note(t_a, together - t_a + 0.08, "A5", 64)
    vln1.note(together, 1.35, "B5", 70)
    vln1.note(together + 1.25, end - together - 1.5, "A5", 52)
    vln1.hairpin(t_d, "p", together, "mf"); vln1.hairpin(together + 0.2, "mf", end - 0.3, "pp")
    # IV (G add9) under the return, then home
    vc.hold(1, joins - 0.02, "p")
    vc.chord(joins, together - joins + 0.08, ["G2", "D3"], 50)
    cb.note(joins, together - joins + 0.08, "G1", 50)
    vla.note(joins, together - joins + 0.08, "B3", 44)
    vln2.hold(1, joins, "pp"); vln2.niente_in(joins, joins + 0.8)
    vln2.note(joins, together - joins + 0.08, "A4", 40)          # the 9th over G
    for p_ in (vc, cb, vla, vln2):
        p_.hairpin(joins + 0.2, "p", together, "mp")
    # together: D major, the motif's B on top; hold and let it die away
    tail = end - together
    vc.chord(together, tail - 0.75, ["D3", "A3"], 56)
    cb.note(together, tail - 0.75, "D2", 56)
    vla.note(together, tail - 0.75, "F#4", 50)
    vln2.note(together, tail - 0.75, "E5", 46)                   # add9
    cl.hold(1, together - 0.1, "p"); cl.niente_in(together - 0.1, together + 0.4)
    cl.note(together, tail - 0.85, "D5", 40)
    for p_ in (vc, cb, vla, vln2, cl):
        p_.hairpin(together + 0.3, "mp", end - 0.5, "pp")
        p_.niente_out(end - 1.4, end - 0.6)
    pno.note(together, tail, "D2", 34); pno.note(together, tail, "A2", 30)
    pno.note(together + 0.05, tail, "D6", 30)
    pno.pedal(together - 0.05, end + 0.5)

    return S
