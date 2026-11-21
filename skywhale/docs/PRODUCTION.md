# SKY WHALE: production notes

How the film was made, in the order it was made, and what each review found.

## 1. Design first: the model sheet

The Old Whale was locked before any shot was staged (`docs/model-sheet.jpg`, rendered by
`dev.html` → `SWAPI.modelSheet`). Key decisions:

- **Silhouette:** a humpback's big head, deep throat and long fluke, chunkier than an airship.
  The body is about 1/4 as tall as it is long, so it reads as a whale before it reads as a
  machine.
- **Creature and vessel grown together:** riveted strakes run nose to tail like a ship's
  plating; the cream throat pleats are planking; the tubercles on the rostrum are bolt heads;
  the eye is a brass porthole whose glow carries the emotion; the blowholes are brass vents.
- **Garden:** a moss bed with drips down the flanks, sod clumps, shrubs gathered near the pine,
  flowers, grass, one wind-bent cloud-pruned pine, a mast with a yard, rigging and three long
  faded pennants.
- **Fins:** fan-shaped junk sails with wooden spars, cream cloth, two red stripes and a scalloped
  trailing edge. They open on the downstroke and close on the recovery, like breath.
- **The pod:** every whale comes from the same generator with its own proportions, palette,
  fins, garden and wear. Drover is large, deep blue, with tall sails and a tall mast. Pip is
  small with a big head and eye. Elder is grey-green with heavy rust and the biggest pine.
  Mend is covered in patches. Swift is lean, with a long fluke and white stripes.

## 2. Style frames, then motion tests

Each movement was first developed as a handful of stills, then as half-second contact sheets
(motion tests), then as a 1-fps preview of the whole film for continuity
(`render.js --step 48 --w 960 --h 540`).

## 3. Reviews and what they changed

The renders were reviewed shot by shot, and an independent "fresh eyes" review was run over a
set of full-resolution stills. The main findings and fixes:

| Finding | Fix |
| --- | --- |
| A white ghost outline of a hidden whale drawn through clouds | Two causes: ringing from the bicubic upsample of the in-front vapour pass, and stale texels read right after MSAA resolves (a SwiftShader/ANGLE hazard). The in-front pass now uses bilinear upsampling with colour clamped to alpha, and every resolve is followed by a 1-px sync. |
| The upright whale missing at dusk; only its reflection drawn | Same stale-read hazard. The reflection now has its own MSAA target. |
| No cast shadows at all | The shadow pass sampled its own depth target (a feedback loop, so every draw was rejected). Fixed. |
| Checkerboard dither on the fluke and sails | They now use blending instead of alpha-to-coverage. |
| The fluke read as a needle from the side | An animator's cheat: the fluke rolls toward the camera (one-sided, so it stays continuous), and the tail stalk is thicker. |
| Lightning didn't register | Bolts in 3D behind the whale, cloud interiors flashing over a wide radius, a hard white rim on the whale, sky and grade flaring for a few frames. |
| Finale: whales seen nose-on as "teardrops", overlapping, moon cropped | Restaged: the family swims across the frame toward a moon in the upper right, spread in depth, with the Old Whale nearest. |
| Sun disc darker than its glow; moon like a cookie | The sun disc is always brighter than its surround; the moon is cooler white with soft maria. |
| The tiny dusk whale bleached grey | Darker key and no atmospheric haze on the whale, so it reads as a crisp silhouette on the sun road. |
| Cloud sea "popcorn" | Built from cumulus heads of varied size with hierarchy, strata toward the horizon, cloud fog matched to the horizon haze, calmer lobes at night. Still the area with the most room to improve. |
| Sea ripples and glitter dashes popping at dusk (frame-to-frame QA) | Float precision on the 80 km sea quad. Each sea pixel now reconstructs its exact ray-plane hit. |
| The fin cloth snapping to the other side of its spars in one frame at each turn of the stroke; spars vanishing behind the cloth (frame-to-frame QA) | The cloth belly reversed with a sign flip; it now passes through flat over a few frames. The cloth is laced to each spar's centre line, so the spars are drawn on both faces of the sail. |
| Patches of cloud changing shade for a frame (frame-to-frame QA) | Two overlapping puffs swapped draw order as the camera panned. Each keyed shot now sorts its vapour along one fixed axis (its mean view direction), so camera moves never reorder puffs. |
| A huge puff filling a corner of the frame for one frame (frame-to-frame QA) | A puff passing the lens: its imposter spanned the eye until its centre crossed the near plane. Puffs that span the eye now thin away as they approach. |

## 4. Frame-by-frame QA

Every rendered frame goes through `render/qa.py`. It flags missing or blank frames, stuck frames,
and pops: frame-to-frame changes far above the local motion level that do not persist. It skips
cuts and lightning. A second, tile-based pass compares every 64 px tile with its own local motion
level. That pass catches small, local pops that the whole-frame average hides, such as the fin
cloth, the sea dashes and the puff swaps above. Each flagged frame was inspected as a crop next to
its neighbours before the cause was fixed.

## 5. Known limitations

- The cloud seas are the weakest part against a theatrical Ghibli standard: the puff
  structure is still visible at close range, and the breakout reads as a solid pushing
  through layered heads more than as a single sculpted mass.
- The camera grammar is in place (one crane take, locked-off wides, a hard cut, a pull-back),
  but some framings (the 2A aerial and the 3C burst) are wider and higher than ideal.
- Rendering is CPU-only in this environment (SwiftShader), which limited how many full-rate
  iterations each shot could get.
