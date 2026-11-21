# SKY WHALE

A 100-second, hand-drawn-style 2D anime short film, drawn and animated entirely in code for the
web. One day, dawn to night: an ancient sky-whale that is also an airship breaks out of a sea of
cloud at first light, crosses a valley, labours through a storm, calls out across the sea at dusk,
and is finally answered by its pod under the moon.

Every frame is rendered deterministically to a canvas (WebGL2) by the code in this folder. There
are no images, footage, traced photographs or AI-generated assets: the whale, the garden on its
back, every cloud, the sky, the valley, the sea, the moon and the rain are all drawn by code.

- `film.html`: the film renderer (opens in a browser; `?frame=N` shows a frame, `?play` plays).
- `scenes/`: self-contained scene pages, one per movement plus the full film. Every script and
  the timeline are inlined, so each file works on its own (built by `render/build.js`).
- `timeline.json`: the single source of truth for shots and cues (48 fps, 4805 frames). The
  renderer and the sound pipeline both read it.
- `src/`: the engine and the five movements (see below).
- `render/`: the frame pipeline (headless Chromium, PNG per frame), the encoder, and dev tools.
- `audio/`: the score and sound pipeline (sampled instruments through sfizz, real humpback
  recordings; see `audio/README.md`).
- `docs/`: model sheet and style frames.

## How it is drawn

The look is traditional cel animation over painted backgrounds; 3D maths is only scaffolding.

- **The Old Whale** (`src/whale.js`, `src/whale-render.js`) is an analytic body: humpback-like
  side, top and width profiles swept along a spine that follows its own swim path, so the tail
  goes where the head has been. Everything on the hull is computed per pixel from stable body
  coordinates (station along the spine, girth around it), so line work never boils: riveted
  strakes and butt joints with shingle shadows, rust blooms and rust streaks below rivets, paint
  chips, patches, the cream keel planking, the moss garden edge with hanging drips, the brass
  porthole eye, the blowhole vents, the bolted rostrum, the mouth line. Silhouette ink is drawn
  inside the edge with a constant pixel width (estimated from the screen-space derivative of the
  view angle) and pressure that varies along the body; it is heavier on the shadow side. Cel
  shading is a hard terminator with a hand-drawn wobble, a tinted kage, a second shadow on the
  underside, a hard reflected-light band, a cel rim inside the ink on light-facing edges, and
  cast shadows (fins, garden, mast) from a shadow map.
- **Junk-sail fins**: fans of wooden spars with scalloped cream sailcloth and red stripes,
  opening and closing with the stroke, with spar follow-through and backlit translucency.
- **The garden** (`src/garden.js`): moss, sod, shrubs, flowers and grass are painted once into
  a sprite atlas with normal maps, so their cel light follows each scene's sun or moon. The
  wind-bent pine, the mast, the yard and the rigging are inked tubes; the pennants are cloth
  ribbons whose waves lag the whale's velocity history (overlapping action).
- **Clouds** (`src/clouds.js`): every cloud is a set of puffs drawn as imposters with
  gouache-style banding (warm lit tops, cool bellies, deep pockets), cauliflower edges from a baked
  distance-field atlas, silver linings and aerial perspective. Cloud seas are built from
  cumulus heads of varied size, flattening into strata toward the horizon. A particle
  simulation treats each whale as a moving solid: potential flow around the body, no
  penetration, friction, rolling swirl, stretching into strands, fraying, latched exposure of the
  shadowed interior, and slow healing. `SW.Drape` adds the choreographed sheets of vapour that
  ride the back and pour off the flanks as each part of the body breaks the surface. Vapour in
  front of a whale is split per pixel against the whale's depth, so nothing on the whale's back
  can show through cloud that is in front of it.
- **Backgrounds**: a painted sky dome evaluated in world-direction space (brush marks fixed in
  the world; sun, moon, stars, stratus bands, rainbow), the valley painted once with Canvas 2D
  (patchwork fields, hedgerows, woods, river, villages, cloud shadows), and a dusk sea with
  world-fixed wave strokes, a glitter road of crisp dashes, and a true planar reflection.
- **Finishing** (`src/pipeline.js`): characters are rendered with 4x MSAA into their own layer;
  clouds at half resolution with a sharp Catmull-Rom upsample; then light wrap from the
  background, light-side diffusion, eye glow, a density grade, and film grain that changes on a
  24 Hz cycle. Motion runs on every frame at 48 fps.

## Rendering the film

Requirements: Node 18+, the `playwright` package with Chromium, `ffmpeg`.

```bash
cd skywhale/render
node render.js --out ../../../_build/frames --workers 2          # all 4805 frames -> PNG (resumable)
node render.js --out /tmp/preview --step 4 --w 960 --h 540         # quick preview
python3 qa.py ../../../_build/frames                               # missing / blank / stuck frames, pops
python3 tileqa.py ../../../_build/frames                            # small local pops, tile by tile
./encode.sh ../../../_build/frames ../../../_build/audio/skywhale_mix.wav skywhale.mp4
node build.js                                                       # rebuild scenes/*.html
```

Rendering uses headless Chromium with SwiftShader (CPU WebGL2), which makes the output identical
from run to run. Each worker renders a contiguous chunk in order, so the cloud simulations advance
incrementally; any frame can also be rendered on its own, because every simulation re-runs from
the start of its shot.

## Model sheet

`docs/model-sheet.jpg` shows the Old Whale and the pod (Drover, Pip, Elder, Mend, Swift); every
whale comes from the same generator with its own proportions, palette, fins, garden and wear
(`SW.WHALE.DESIGNS` in `src/whale.js`).
