# SKY WHALE - soundtrack pipeline

Score, whale voices, air accents, mix and master for the 100-second film,
built from code and real recordings only.

```
python3 skywhale/audio/build_audio.py
```

That one command fetches/builds every asset pinned in `assets.json`
(only what is missing), renders the score through sfizz, builds and places
the voices, mixes, masters and verifies.  Running time: about
1-2 minutes once the assets are present (first run: ~10 minutes to clone
and build sfizz and fetch ~3.8 GB of samples and recordings).  `--no-fetch` skips the asset
step.

Outputs go to `$SKYWHALE_AUDIO_BUILD` (default `/workspace/_build/audio`),
never into the repository:

| file | what |
| --- | --- |
| `skywhale_mix.wav` | final mix, 48 kHz / 24-bit / stereo, exactly 4,805,000 samples (= 4805 frames / 48 fps) |
| `stems/skywhale_music.wav`, `stems/skywhale_voices.wav`, `stems/skywhale_air.wav` | stems at mix gain (they sum to the mix within dither) |
| `mix_spectrogram.png` | full-mix spectrogram with cues and cuts marked |
| `verify_report.json` | loudness, true peak, length, silence checks, cue-onset table, provenance audit |
| `work/` | per-part MIDI and renders, `skywhale_score.mid` (all parts), `events.json` (every placed sound) |

## Requirements

* Python 3.11+ with `pip install -r skywhale/audio/requirements.txt`
* git, git with partial-clone support, cmake, a C++17 compiler, ffmpeg
* network access to github.com, raw.githubusercontent.com,
  media.githubusercontent.com and storage.googleapis.com (all assets of
  the delivered mix come from these)

## Sync: timeline.json is the source of truth

Everything that depends on picture is read from `skywhale/timeline.json`
(read-only here): total length, shot boundaries and whale distances, cue
times, cue distances and `inCloud` flags.  Move a cue and re-run:

* voices / breaths / creaks / air accents are placed so that the onset of
  the *processed* sound (after distance filtering, cloud muffling and
  reverb) lands on the cue, sample-accurately;
* the score's hit points are written relative to cues, and the metric
  passages run on tempo maps anchored to cues and cuts (`lib/tempo.py`),
  so the music stretches with the picture;
* sound perspective is re-processed at every cut (`mix.py: _place_event`).

## Layout

| file | role |
| --- | --- |
| `build_audio.py` | one-command build |
| `fetch_assets.py`, `assets.json` | pinned downloads (git commits, URLs, hashes), sfizz build |
| `patches/sfizz_render_float32.patch` | sfizz_render writes 32-bit float WAV instead of 16-bit |
| `score.py` | the score, as code (see `docs/SCORE.md`) |
| `voices.py` | whale voices, breaths, creaks, air accents (sound design) |
| `spotting.py` | which sound plays on which cue, level, ducking, pan |
| `mix.py` | placement, perspective, music bus, ducking, gating, loudness, 24-bit output |
| `verify.py` | measurements and report |
| `lib/` | timeline + tempo maps, SMF writer, SFZ wrapper generator, instrument registry, sfizz rendering, DSP, acoustic space, humpback unit extraction, recordings |
| `CREDITS.md` | every recording and sample library, with licence |

## How the music is made

`score.py` writes note events with exact times, pitches and dynamics.  Each
part is exported as its own MIDI file (1 tick = 1 sample) and rendered by
`sfizz_render` (built from source, sfizz 1.2.3) through:

* VSCO 2 CE (SFZ branch) strings, woodwinds, horn, timpani and
  percussion.  `lib/sfzgen.py` generates calibrated wrappers around VSCO's
  own SFZ mappings: per-sample levels are equalised (K-weighted), dynamic
  layers of sustained articulations are crossfaded on CC1 (a real timbral
  crescendo between the recorded pp and ff samples) with a dB-linear CC1
  loudness curve, CC11 is expression (niente swells, hairpins), and
  samples are loaded to RAM (`hint_ram_based=1`).
* the Salamander Grand Piano, unmodified (included from a one-line wrapper
  that loads it to RAM), with sustain pedal (CC64).

Articulations used: sustain with vibrato, tremolo, pizzicato (strings),
sustain (woodwinds, horn), timpani hits, bass drum, suspended-cymbal swell,
glockenspiel.  VSCO 2 CE has no sul ponticello, so the storm uses
tremolo.  The parts are panned to an orchestral seating and share one
hall (a convolution with the IR recorded in a 30th Street Station
hall, decay shortened to ~2.3 s): the music holds one steady, near
perspective and is ducked around the whale.

## How the voices are made

See the docstring of `voices.py`.  In short: humpback song units recorded
by the National Park Service hydrophone in Glacier Bay are cut from the
archive (an automatic unit catalogue picks clean, tonal units), cleaned
with a spectral gate, re-pitched (tape varispeed) and stretched (phase
vocoder), tuned to the D major pentatonic where they sit under the music,
and layered with (a) real VSCO horn / trombone / tuba sustain samples
rendered by sfizz and bent along the whale's own pitch contour (the
"valves" of a creature that is also a ship), (b) steam: recorded
compressed-air bursts and a firework fountain's sizzle, and (c) creaking
timber: real wood-on-wood friction (a wooden guiro scraped slowly, slowed
further on tape) with a bass-drum-head rub for the load.  Breaths (exhale
and inhale variants) are compressed-air "steam" + rushing air + a soft
horn "vent".  The Elder's cracked voice is a granular re-arrangement of
its own grains.

The Work With Sounds museum recordings (steam locomotive, steam iron,
smithy bellows, creaking floors; CC BY 4.0, Wikimedia Commons) were the
first choice for steam / lungs / timber, but Wikimedia answered HTTP 429
to this build machine for the whole session, so the delivered mix uses
the GitHub-hosted set above.  They are listed in `assets.json`
(`optional_wikimedia`, `fetch_assets.py --wws`) and `lib/recordings.py`
can switch to them (`SOURCE_SET = "wws"`); the levels would need a
re-check by ear.

Perspective (`lib/space.py`): the cue's `dist` (or the shot's
`whaleDistance`) sets level (-4.5 dB per doubling of distance, 0 dB at
40 m), an air-absorption low-pass (15 kHz at 25 m ... 1.7 kHz at 2 km),
the wet/dry ratio of the recorded hall + outdoor IR (far = wetter), a
growing pre-delay and the stereo width (full at 25 m, ~0.3 at 2 km).  In
cloud (`inCloud` flags and the shots' `inCloud` windows, with the
transitions described by the cues: snout break, bank_enter -> 38.2, storm
burst) adds a muffling low-pass and diffusion.  An event that crosses a
cut is re-processed with the next shot's distance from the cut on; at a
movement boundary (change of scene) its tail is cut with the picture.

## Verification

`verify.py` (run by the build) measures the written file, not the
intentions: format and exact sample count; integrated loudness with
pyloudnorm and ffmpeg `ebur128`; true peak with 4x oversampling (own and
ffmpeg); exact-zero windows (0-3.5 s, 67.9-70.6 s, the whole dusk gate);
the level of shot 4B; for every placed sound, the onset of the processed
sound vs its cue and a cross-correlation of the event against its stem
(lag must be 0); a sample run-out / range check of every note of the
score; a provenance list of every audio file the pipeline read; a scan of
the code for oscillator-style generators; and the spectrogram.

Reproducibility: rebuilds are identical except for ~0.03 % of samples that
differ by 1 LSB at 24 bit (float summation order inside sfizz).

## Silence

The opening is exact digital zero until the first violin note fades in
(3.8 s).  The music bus is gated to zero before the dusk call; the voices
are gated to exact zero from 67.9 s across the hard cut until the single
faint 2 km breath in shot 4B (cut + 4.2 s).  Dither is applied only where
there is signal, so gated regions stay exact zeros.  The last ~0.75 s fade
so the final sample is zero.
