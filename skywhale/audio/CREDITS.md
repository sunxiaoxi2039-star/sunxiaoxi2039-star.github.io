# SKY WHALE soundtrack - credits and licences

Every sound in the soundtrack comes from the recordings and sampled
instruments below (processed: cut, filtered, re-pitched, stretched,
layered, enveloped, convolved).  No synthesiser, oscillator, generated
tone or AI-generated audio is used.  Exact URLs, commits and hashes are in
`assets.json`.

## Sampled instruments (score)

| what | author | source | licence |
| --- | --- | --- | --- |
| VS Chamber Orchestra 2: Community Edition (VSCO 2 CE), SFZ branch: violin / viola / cello sections (sustain, tremolo, pizzicato), solo contrabass (sustain, tremolo), flute, clarinet, bassoon, F horn, timpani, bass drum, suspended cymbal, glockenspiel; F horn, tuba and tenor trombone also form the brass layer of the whale voices | Versilian Studios - recorded by Sam Gossner & Simon Dalzell, sample cutting by Elan Hickler / Soundemote | https://github.com/sgossner/VSCO-2-CE (branch `SFZ`, commit 6dd651d5) | CC0 1.0 |
| Salamander Grand Piano V3 (Yamaha C5), SFZ remap | Alexander Holm (samples); SFZ reconstruction by kinwie / sfzinstruments | https://github.com/sfzinstruments/SalamanderGrandPiano (commit 3382bf94) | CC BY 3.0 |

Renderer: sfizz 1.2.3 (`sfizz_render`, built from source; patched to write
32-bit float WAV) - https://github.com/sfztools/sfizz - BSD 2-Clause.

## Whale recordings (humpback, *Megaptera novaeangliae*)

| what | author | source | licence |
| --- | --- | --- | --- |
| Glacier Bay hydrophone, Bartlett Cove, 13 Nov 2020, files `11_13_2020_03_48_13`, `03_53_13`, `04_03_13`, `04_13_13`, `04_23_13` (.aif, 5 min each): humpback song units | U.S. National Park Service, Glacier Bay National Park & Preserve (hydrophone data via NOAA NCEI Passive Acoustic Data Archive) | `gs://noaa-passive-bioacoustic/nps/audio/glacier_bay/bartlettcove/glacierbay_bartlettcove_2020/audio/` (https://storage.googleapis.com/noaa-passive-bioacoustic/...) | Public domain (U.S. Government work) |
| "Glacier Bay" 60-second humpback whale song, 2020 | Recorded by NPS - Chris Gabriele (distributed with librosa example data) | https://github.com/librosa/data/blob/5285c94e33c74bbe97501f5c9fa95e5e2ce55d48/audio/glacier-bay-humpback.hq.ogg ; original page https://www.nps.gov/glba/learn/nature/soundclips.htm | Public domain (U.S. NPS) |

## Steam, lungs, air and timber recordings

| file | what it is used for | author | source | licence |
| --- | --- | --- | --- | --- |
| `2019-04-9-IDS-center-airwrench.wav` - an air wrench (compressed-air bursts) in the IDS Center atrium | "steam" blasts in the exhales, brass-vent breaths | meta-meta | https://github.com/meta-meta/ImpulseResponses (commit f0e0cc8b) | free use in films incl. commercial, no attribution required; raw files may not be redistributed as a collection |
| `2019-07-04--Firework-sizzle.wav` - a firework fountain's sizzle | the steam hiss inside the calls, songs and groans | meta-meta | same | same |
| `2020-07-04-fireworks/09-psha-ah-vooh.wav`, `20-pshah-ah-ah-ah-ah-ah-ah.wav`, `22-pshoow.wav` - firework launches (rushing air) | the air accents (fin downstrokes, cloud breaks, storm burst, Swift's leap) and the air of the breaths | meta-meta | same | same |
| VSCO 2 CE `VSCO 1 Percussion/varWood/guiro_superlong.wav`, `guiro_long.wav` - a wooden guiro scraped slowly | creaking timber (stick-slip friction of wood, slowed on tape) | Versilian Studios | VSCO 2 CE (above) | CC0 1.0 |
| VSCO 2 CE `Percussion/bassdrum_rub1_v1.wav`, `bassdrum_rub3_v1.wav` - a bass-drum head rubbed | the groaning load under the creaks | Versilian Studios | VSCO 2 CE (above) | CC0 1.0 |

### Not used in the delivered mix (first choice, could not be downloaded)

Work With Sounds museum recordings on Wikimedia Commons (CC BY 4.0):
`WWS SteamlocomotiveS06-018Steamrelease.ogg` (Technical Museum of
Slovenia), `WWS SteamIron.ogg` (Werstas), `WWS Smithyblacksmithbellows1.ogg`
and `WWS Woodenwagon.ogg` (Museum of Municipal Engineering),
`WWS Creakingfloors.ogg` (Torsten Nilsson), `WWS WindTurbine.ogg` (Werstas),
`WWS Bloweroftheforge.ogg` (La Fonderie).  upload.wikimedia.org answered
HTTP 429 (rate limit) to the build machine for the whole session.  They are
pinned in `assets.json` -> `optional_wikimedia` for a later switch
(`lib/recordings.py: SOURCE_SET = "wws"`).  If they are used, credit:
*"Sound recordings by Work With Sounds (CC BY 4.0)"* with the partner names
above.

## Impulse responses (reverb)

| file | author | source | licence |
| --- | --- | --- | --- |
| 2018-11-28-30th-St-Station.wav (hall; music reverb and distance tail) | meta-meta (ImpulseResponses collection) | https://github.com/meta-meta/ImpulseResponses (commit f0e0cc8b) | Free use in films incl. commercial, no attribution required; the raw IR files may not be redistributed as a collection (we only fetch them) |
| 2021-05-01--Silver-Bay-Woods.wav (outdoor terrain echoes for distance) | meta-meta | same | same |

## Required attributions (summary)

* Salamander Grand Piano - Alexander Holm - CC BY 3.0
* Humpback song - U.S. National Park Service, Glacier Bay National Park & Preserve (public domain; credit appreciated)
* VSCO 2 CE - Versilian Studios (CC0; credit appreciated)
