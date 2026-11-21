# SKY WHALE - score notes

The score is `score.py`; this page explains it.  All times below are the
values produced from the current `timeline.json`; in the code every one of
them is expressed relative to a cue, a cut or a movement boundary.

**Key:** D major.  **Motif:** D - A - B (do - sol - la in D major
pentatonic): a rising fifth, then a step up to the sixth.  The sixth is the
whale - open, a little wistful.

**Orchestra (sampled only):** VSCO 2 CE violins I/II, violas, celli
(sustain, tremolo, pizzicato), solo contrabass (sustain, tremolo), flute,
clarinet, bassoon, F horn, timpani, bass drum, suspended cymbal,
glockenspiel; Salamander grand piano.  No harp, no synth, no generated tone.

**Texture:** three or four independent lines at a time (doublings such as
horn + violins in octaves, or flute + piano, count as one line).

## Tempo maps

| movement | map |
| --- | --- |
| I Dawn | senza misura: hit points on cues (`dawn_swell`, `dawn_snout_break`, `dawn_brow`, `dawn_eye_sun`, `dawn_garden`, `dawn_fins_open`, `dawn_breath`, `dawn_breach_peak`, `dawn_wake_song_2`) |
| II Morning | 4/4, anchored to movement start (beat 0), cut 2B (beat 8) and cut 2C (beat 14), movement III (beat 20): 64.0 - 65.5 - 60.0 bpm (a ritardando into the cloud) |
| III Storm | free time; hit points on groans (left free), lightning 1-3, storm_burst, rainbow |
| IV Dusk | two piano notes relative to the movement start |
| V Night | the piano's opening phrase runs on a small map anchored to `night_begin` + 0.7 s and the 5B cut (76.5 bpm); the pod section is on cues |

`build_audio.py` prints the tempo maps on every build.

## I Dawn: The Breakout (0 - 21 s)

* 0 - 3.8 s: digital silence.
* 3.8 s: violins I, a single high **A5**, fading in from nothing (CC11 niente), pp.
* `dawn_swell` (5.5): celli enter on **D3**, niente, and *only move on
  picture*: **A3** as the snout tears through (9.0), **B3** as the brow
  emerges (10.6) - the motif hinted low and slow.  The muffled first waking
  song (7.4) sits over the held D.  Basses take the low D (9.0).
* `dawn_eye_sun` (11.6): the high A passes to violins II as the brass eye
  catches the sun.  `dawn_garden` (12.2): violas F#4, celli settle on the
  open fifth D3/A3; everything starts to grow.
* The bloom: horn in octaves (D3/D4) with violins I two octaves above
  (D5) as the fins open (13.05), **A** on the breath (14.05), **B** on
  `dawn_breach_peak` (14.8) - mf -> f, over D major with the A5 on top
  (B5/A5 shimmer, F#4, D3/A3, D2).  Then it settles open (D / E / A: a
  Dadd9) under the clear second waking song (16.6).
* 19.2 s: the flute floats down B5 - A5 - F#5 - E5 into the morning.

## II Morning: The Crossing (21 - 40 s)

* Melody: flute (mp), with the piano doubling an octave above:
  D5 - A5 - B5 (held) ... A5 F#5 E5 - the motif opened into a lyrical
  phrase; the held B carries over the distant contented hum (24.6) instead
  of competing with it.  Celli pizzicato walk on the beat (D A F# A | G D A
  E); violas + violins II and basses hold I - IV - V.
* Fin close-up (28.5 - 34): the pulse and melody stop.  Strings hold
  G/B/D then D/F#/A and *breathe with the fin*: a small swell into each
  downstroke (29.6, 32.3), back to pp before each creak (30.7, 33.3);
  nothing is attacked on a creak.
* Cloud bank (34 - 40): a last D - A - B in the flute around the short
  breath (34.9); from `bank_enter` (35.8) the piano blurs (pedal held,
  B5 E6 A5 D6 F#5 falling away), the strings dissolve, and the storm
  gathers underneath (celli then basses tremolo on D, from nothing).

## III Storm: The Squall (40 - 58 s)

* Restrained throughout (pp - mf).  Basses tremolo D2, celli arco state
  the motif darkened, **D - A - Bb**, placed between the effort groans.
* Into the storm cloud (44.0): violins tremolo A5, violas tremolo D4.
* Lightning: soft timpani D2 + bass drum (45.6); a double stroke (48.4,
  48.53) for the double flicker; timpani D2+A2 with bass drum at mf for the
  biggest strike (50.7).  Each flash lifts the tremolo a little.
* Violas repeat the minor motif higher (D4 - A4 on the double flicker -
  Bb4 on the biggest strike) and hold the **Bb** as the storm climbs; a
  suspended-cymbal swell peaks on the burst.
* `storm_burst` (53.2): the Bb lifts to **B** - the motif turns major -
  inside a bright open D chord (D2, D3/A3, B4, E5/F#5, horn F#4).
* `rainbow` (54.6): flute + violins I in unison, **D5 - A5 - B5**, a single
  glockenspiel B6 glint on the arrival; the relieved exhale (55.6) sits on
  the held B; the chord fades by the cut to dusk.

## IV Dusk: The Calling (58 - 75.6 s)

* The piano offers **D4** (58.4) ... **A4** (59.7) - and stops.  The B never
  comes.  The music bus is gated to exact zero 1 s before the call.
* The call (63.6 - 66.6) is solo.  From 67.9 s the whole mix is digital
  zero across the hard cut (68.42); shot 4B holds only one extremely
  faint, 2 km-distant breath.  No answer comes.

## V Night: The Answer (75.6 - 100.1 s)

* Very soft: violins I D6 and violins II A5 from nothing; the piano
  remembers the motif (D5, A5, B5 ... F#5, E5).
* Under the Old Whale's song (82.3 - 86.0) only the violins' high A
  remains, ducked far down.  Two piano notes (A4, B4) after the song,
  then a hush for the distant eyes (87.8).
* Each pod whale is answered by a fragment of the motif in "its"
  instrument, and the texture accumulates:
  * Drover (89.6, deep): celli + basses D ... A, low and warm.
  * Pip (91.2, small, quick): pizzicato violins D - A - B in a blink.
  * Elder (91.8, very old, slow): bassoon, slow and low, D falling to B
    (the harmony turns to B minor).
  * Mend (93.2, gentle): clarinet, a soft F# - A sigh.
  * Swift (94.6, fast, bright): flute, D - A - B at speed.
* The Old Whale joins (95.8): horn (in octaves) and violins I return the
  motif warmly over G add9 (IV) - its answering hum is tuned to D and
  merges with the horn's D - and the **B lands on `together` (97.6) over D
  major**, then settles to A.  The final chord (D2, D3/A3, F#4, E5, D5 in
  the clarinet, piano low D/A and high D) holds and dies away; the last
  sample is zero at 100.104 s.
