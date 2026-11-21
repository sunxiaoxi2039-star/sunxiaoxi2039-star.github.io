// SKY WHALE — IV. DUSK: THE CALLING (17.6 s). 4A: low over a calm sea, the whale breathes, blows,
// calls, and holds still (the "ma"). Hard cut on the silence to 4B: an extreme lonely wide, same
// sky, same sun at the same height; the whale, tiny, swims across the sun road. No answer.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, hex, smoothKeys, keyed } = SW;

  const SUN = SW.dirFromAzEl(24, 4.0);
  const SKY = {
    zen: hex('#8f7aa3'), up: hex('#c78aa0'), hor: hex('#f2b27a'), below: hex('#e9a57c'), stops: [0.30, 0.1, 0.2, 0.85],
    sunDir: SUN, sunCol: hex('#fff3d0'), glowCol: hex('#ffc48a'), sun: [0.011, 0.38, 0.55, 1],
    hazeCol: hex('#f5bb82'), hazeAmt: 0.7, hazeW: 0.035,
    bandA: [0.035, 0.018, 0.40, 9], bandB: [0.10, 0.04, 0.30, 6], bandC: [0.22, 0.06, 0.18, 4],
    bandLit: hex('#ffcf98'), bandShade: hex('#a2819f'), bandAmt: 0.85, brush: 0.03,
  };
  const SEA = { near: hex('#5a4f78'), far: hex('#d49884'), skyHor: hex('#f2b27a'), skyUp: hex('#c78aa0'), glint: hex('#fff2c8'), stroke: hex('#8a77a0'), shadow: hex('#6f5f86'), sunDir: SUN, reflTint: hex('#b8a3c2'), reflAmt: 0.85, roadW: 0.055 };
  const LIGHT = {
    sunDir: v3.norm([SUN[0], SUN[1] + 0.10, SUN[2]]), key: hex('#ffd9b6'), shade: hex('#8b7fb0'), rimCol: hex('#ffd59c'), rimAmt: 1.0,
    ink: hex('#2c2232'), bounce: hex('#d7a5b8'), bounceAmt: 0.7, fogCol: hex('#e8b08c'), fogDen: 1 / 9000, fogStart: 200,
  };
  const PLUME_LOOK = { lit: hex('#ffe6cc'), mid: hex('#f2c9bd'), shad: hex('#b49dc0'), deep: hex('#9a86b0'), rim: hex('#fff0d8'), bands: [0.58, 0.42, 0.06, 0.2], edge: [0.3, 0.45, 0.4, 0.0], fog: hex('#e8b08c'), fogDen: 1 / 9000, fogStart: 200 };
  const GRADE = { bloom: 0.42, diffuse: 0.32, wrap: 0.34, grain: 0.017, density: 0.12, vignette: 0.16, thresh: 0.72 };

  // ------------------------------------------------------------------ 4A
  SW.SHOTS['4A'] = {
    init(F, S) {
      S.sea = F.cache._sea || (F.cache._sea = SW.SeaRenderer(F.G));
      S.path = SW.Path3([[-300, 18, -172], [-100, 18, -170], [100, 18, -168], [300, 18, -166]]);
      const call0 = 5.6, call1 = 8.6;
      S.whale = new SW.Whale('old', {
        path: S.path, speed: [[0, 1.4], [8.6, 0.7], [10.5, 0.6]], d0: 300 + 46, period: 9.0, waveAmp: 0.022, surge: 0.04, phase: 0.4,
        ampKeys: [[0, 1], [5.4, 1], [6.2, 0.55], [8.6, 0.35], [10.4, 0.25]],
        headLift: (t) => keyed([[0, 0], [2.1, 0], [2.6, 0.03], [3.3, 0.0], [5.4, 0.0], [6.5, 0.17], [8.6, 0.19], [9.4, 0.12], [10.5, 0.10]], t, SW.ease.sine),
        eye: (t) => keyed([[0, 0.75], [5.4, 0.8], [6.4, 1.55], [8.6, 1.5], [10.5, 1.15]], t, SW.ease.sine),
        finKeys: [[0, 0.75], [2.2, 1.0], [3.4, 0.6], [5.6, 0.75], [6.6, 1.05], [8.6, 0.95], [10.5, 0.85]],
        wind: [0.6, 0, 0.2],
      });
      S.camPos = smoothKeys([[0, [-4, 6.5, 6]], [10.42, [-2, 6.8, -4]]]);
      S.camTgt = smoothKeys([[0, [6, 12, -170]], [10.42, [8, 12.5, -170]]]);
    },
    frame(F, S, tl, t, frame) {
      const cam = SW.Camera({ pos: S.camPos(tl), target: S.camTgt(tl), fov: 34, near: 1, far: 40000 });
      const w = S.whale;
      const plume = SW.plume(w, tl, { t0: 3.4, dur: 1.4, n: 70, life: 4.6, up: 15, fwd: 1.5, alpha: 0.22, grow: 2.2, r0: 0.9, spread: 1.6, wind: [1.4, 0.4, 0] });
      F.stage(frame, {
        time: tl, cam, light: LIGHT, sky: SKY,
        whales: [{ whale: w, t: tl, glowScale: 1.3 }],
        reflect: { y: 0 },
        bg: (c, l, refl) => S.sea.draw(c, SEA, t, refl),
        clouds: [{ puffs: plume, look: PLUME_LOOK }],
        grade: GRADE,
      });
    },
  };

  // ------------------------------------------------------------------ 4B
  SW.SHOTS['4B'] = {
    init(F, S) {
      S.sea = F.cache._sea || (F.cache._sea = SW.SeaRenderer(F.G));
      const roadPt = v3.scale([SUN[0], 0, SUN[2]], 3600 / Math.hypot(SUN[0], SUN[2]));
      const h = v3.norm([0.98, 0, 0.2]);
      const C = [roadPt[0], 18, roadPt[2]];
      S.path = SW.Path3([v3.madd(C, h, -600), v3.madd(C, h, -200), v3.madd(C, h, 200), v3.madd(C, h, 600)]);
      // swims, not slides: strong strokes and visible surge
      S.whale = new SW.Whale('old', { path: S.path, speed: [[0, 13]], d0: 600 - 150 + 54, period: 5.2, waveAmp: 0.07, surge: 0.22, phase: 1.3, eye: () => 1.0, wind: [0.6, 0, 0.2] });
      S.cam = SW.Camera({ pos: [0, 6, 0], target: v3.add([0, 6, 0], SW.dirFromAzEl(21.5, -2.2)), fov: 30, near: 1, far: 60000 });
    },
    frame(F, S, tl, t, frame) {
      F.stage(frame, {
        time: tl, cam: S.cam, light: LIGHT, sky: SKY,
        whales: [{ whale: S.whale, t: tl, shadow: false, glowScale: 2.2, glowAmt: 1.4, light: { key: hex('#8a6a80'), shade: hex('#6a5a88'), fogDen: 1 / 60000, rimAmt: 1.0 } }],
        reflect: { y: 0 },
        bg: (c, l, refl) => S.sea.draw(c, SEA, t, refl),
        grade: GRADE,
      });
    },
  };
})(window.SW = window.SW || {});
