// SKY WHALE — II. MORNING: THE CROSSING (19.0 s, three shots).
// 2A high wide over the patchwork valley; 2B close on the great fin; 2C the cloud bank swallows the whale.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, hex, smoothKeys } = SW;

  const SUN = SW.dirFromAzEl(-125, 38);
  const SKY = {
    zen: hex('#3f7cc4'), up: hex('#86b4e2'), hor: hex('#dde9ee'), below: hex('#c9d8dc'), stops: [0.5, 0.1, 0.3, 0.8],
    sunDir: SUN, sunCol: hex('#fffbea'), glowCol: hex('#fff1cf'), sun: [0.012, 0.3, 0.25, 1],
    hazeCol: hex('#e8eee9'), hazeAmt: 0.6, hazeW: 0.06,
    bandA: [0.12, 0.05, 0.30, 6], bandB: [0.30, 0.07, 0.20, 4], bandLit: hex('#ffffff'), bandShade: hex('#c7d4e6'), bandAmt: 0.7, brush: 0.025,
  };
  const LIGHT = {
    sunDir: SUN, key: hex('#fff8ee'), shade: hex('#9fb0d8'), rimCol: hex('#fffbe8'), rimAmt: 0.9,
    ink: hex('#232a30'), bounce: hex('#e9eecf').map((x) => x * 1.15), bounceAmt: 0.55, fogCol: hex('#cbdbe6'), fogDen: 1 / 9000, fogStart: 200,
  };
  const LOOK = {
    lit: hex('#fffaf0'), mid: hex('#eef0f2'), shad: hex('#b3bfd6'), deep: hex('#8e9bbb'), rim: hex('#ffffff'),
    bands: [0.58, 0.40, 0.035, 0.18], edge: [0.02, 0.06, 0.25, 0.10], fog: hex('#d3e0ea'), fogDen: 1 / 6000, fogStart: 300,
  };
  const GRADE = { bloom: 0.25, diffuse: 0.22, wrap: 0.3, grain: 0.016, density: 0.14, vignette: 0.12, thresh: 0.78 };

  function land(F) {
    if (!F.cache._land) { F.cache._land = SW.paintLand({ size: 4096, metres: 4200, seed: 77 }); F.cache._ground = SW.Ground(F.G, F.cache._land); }
    return F.cache._ground;
  }

  // ---------------------------------------------------------------- 2A
  SW.SHOTS['2A'] = {
    init(F, S) {
      S.ground = land(F);
      S.path = SW.Path3([[-700, 1000, 120], [-350, 1004, 60], [0, 1010, -10], [350, 1016, -90], [700, 1020, -180]]);
      S.whale = new SW.Whale('old', { path: S.path, speed: [[0, 12]], d0: 330, period: 6.0, phase: 0.8, wind: [0, 0, 0], eye: () => 0.9 });
      S.clouds = [];
      S.shadows = [];
      const r = SW.rng(901);
      for (let i = 0; i < 9; i++) {
        const c = [(r() - 0.5) * 1500, 450 + r() * 200, -300 + (r() - 0.5) * 1200];
        const k = c[1] / SUN[1];
        S.shadows.push([c[0] - SUN[0] * k, c[2] - SUN[2] * k, 70 + r() * 50, 1.0]);
        S.clouds.push(...SW.CloudGen.cumulus({ center: c, width: 110 + r() * 120, height: 45 + r() * 35, towers: 4, seed: 40 + i, fill: false, puff: 16, depthK: 0.9 }));
      }
      const wm = (t) => S.whale.pose(t, 40).C[18];
      S.camPos = smoothKeys([[0, v3.add(wm(0), [120, 470, 470])], [7.5, v3.add(wm(7.5), [80, 466, 455])]]);
      S.camTgt = smoothKeys([[0, v3.add(wm(0), [60, -80, -40])], [7.5, v3.add(wm(7.5), [10, -80, -50])]]);
    },
    frame(F, S, tl, t, frame) {
      const cam = SW.Camera({ pos: S.camPos(tl), target: S.camTgt(tl), fov: 33, near: 5, far: 20000 });
      F.stage(frame, {
        time: tl, cam, light: Object.assign({}, LIGHT, { fogDen: 1 / 14000 }), sky: SKY,
        whales: [{ whale: S.whale, t: tl }],
        bg: (c) => S.ground.draw(c, { center: [0, 0, -300], fog: hex('#bfd2df'), fogDen: 1 / 5200, far: hex('#bfd2df'), shadows: S.shadows }),
        clouds: [{ puffs: S.clouds, look: Object.assign({}, LOOK, { fog: hex('#c4d5df'), fogDen: 1 / 2600, fogStart: 0, edge: [0.03, 0.08, 0.2, 0.06] }) }],
        grade: GRADE,
      });
    },
  };

  // ---------------------------------------------------------------- 2B
  SW.SHOTS['2B'] = {
    init(F, S) {
      S.ground = land(F);
      S.path = SW.Path3([[-600, 1000, 0], [-200, 1003, -10], [200, 1006, -30], [600, 1008, -60]]);
      // fin strokes timed to the sound cues: downstrokes at 1.1 s and 3.8 s (shot time)
      S.whale = new SW.Whale('old', { path: S.path, speed: [[0, 12]], d0: 420, period: 6.0, phase: 2.0, finPeriod: 2.7, finPhase: -0.02, wind: [0, 0, 0], eye: () => 0.9 });
    },
    frame(F, S, tl, t, frame) {
      const w = S.whale;
      // camera rides alongside the fin (tracking with the whale's mean motion, not its wobble)
      const ref = w.path.at(w.headDist(tl) - 0.26 * w.d.L);
      const tg = w.path.tangent(w.headDist(tl) - 0.26 * w.d.L);
      const side = v3.norm(v3.cross(tg, [0, 1, 0]));
      const pos = v3.add(v3.add(v3.madd(ref, side, -80), [0, 6, 0]), v3.scale(tg, -30));
      const tgt = v3.add(v3.add(v3.madd(ref, side, -14), [0, -18, 0]), v3.scale(tg, -8));
      tgt[0] += -6 * Math.sin(tl * 0.5);
      const cam = SW.Camera({ pos, target: tgt, fov: 38, near: 1, far: 20000 });
      F.stage(frame, {
        time: tl, cam, light: Object.assign({}, LIGHT, { sunDir: SW.dirFromAzEl(-150, 42) }), sky: SKY,
        whales: [{ whale: w, t: tl }],
        bg: (c) => S.ground.draw(c, { center: [0, 0, -300], fog: hex('#c9d9e3'), fogDen: 1 / 3800, far: hex('#c9d9e3') }),
        grade: GRADE,
      });
    },
  };

  // ---------------------------------------------------------------- 2C
  SW.SHOTS['2C'] = {
    init(F, S) {
      S.ground = land(F);
      const h = v3.norm([0.86, 0, -0.5]);
      const O = [0, 1000, 0];
      S.path = SW.Path3([v3.madd(O, h, -500), v3.madd(O, h, -200), v3.madd(O, h, 100), v3.add(v3.madd(O, h, 400), [0, 12, 0]), v3.add(v3.madd(O, h, 800), [0, 30, 0])]);
      S.whale = new SW.Whale('old', { path: S.path, speed: [[0, 15], [2.5, 17], [6, 19]], d0: 500, period: 5.4, phase: 1.0, wind: [0, 0, 0], eye: () => 0.85,
        finKeys: [[0, 1.0], [2.0, 0.6], [6, 0.4]] });
      const head18 = S.whale.pose(1.8, 40).C[0];
      S.head18 = head18;
      // the bank: main tower beyond, a lobe on the near side that the whale passes behind
      const fc = v3.madd(head18, h, 30);
      S.bank = SW.CloudGen.cumulus({ center: [fc[0] + 170, 820, fc[2] - 120], width: 560, height: 560, towers: 7, seed: 77, puff: 26, depthK: 0.6, mk: 0.55,
        extra: [{ c: [fc[0] + 40, 985, fc[2] + 70], r: 95 }, { c: [fc[0] + 10, 1060, fc[2] - 10], r: 85 }, { c: [fc[0] + 90, 940, fc[2] + 140], r: 90 }, { c: [fc[0] + 120, 1010, fc[2] + 40], r: 110 }] });
      S.simPuffs = S.bank.filter((q) => v3.dist(q.p, fc) < 190);
      const mkSim = () => SW.CloudSim(S.simPuffs, { t0: 0, dt: 1 / 144, k: { spring: 0.08, springY: 0.08, drag: 1.0, flow: 0.8, swirl: 0.6, friction: 0.5, stretchK: 0.08, noise: 0.4 } });
      S.sim = mkSim();
      S.mk = () => { S.simPuffs.forEach((q) => { q.p = q.rest.slice(); }); S.sim = mkSim(); };
      S.lower = [];
      const r = SW.rng(55);
      for (let i = 0; i < 10; i++) S.lower.push(...SW.CloudGen.cumulus({ center: [(r() - 0.5) * 1800, 620 + r() * 80, -300 - r() * 1000], width: 140 + r() * 160, height: 60 + r() * 50, towers: 3, seed: 90 + i, fill: false, puff: 18 }));
      const p0 = S.whale.pose(0, 40).C[16];
      S.camPos = smoothKeys([[0, v3.add(p0, [-150, 30, 230])], [6, v3.add(p0, [-95, 32, 200])]]);
      S.camTgt = smoothKeys([[0, v3.add(p0, [60, 6, -20])], [6, v3.add(p0, [120, 10, -60])]]);
    },
    frame(F, S, tl, t, frame) {
      if (S.sim.t > tl + 1e-6) S.mk();
      const w = S.whale;
      S.sim.advance(tl, (tt) => [w.pose(tt, 48)]);
      const cam = SW.Camera({ pos: S.camPos(tl), target: S.camTgt(tl), fov: 40, near: 1, far: 20000 });
      const sun = SW.dirFromAzEl(-40, 42);
      F.stage(frame, {
        time: tl, cam, light: Object.assign({}, LIGHT, { sunDir: sun }), sky: Object.assign({}, SKY, { sunDir: sun }),
        whales: [{ whale: w, t: tl }],
        bg: (c) => S.ground.draw(c, { center: [0, 0, -600], fog: hex('#c9d9e3'), fogDen: 1 / 3000, far: hex('#c9d9e3') }),
        clouds: [{ puffs: S.lower, look: Object.assign({}, LOOK, { fogDen: 1 / 3000 }) }, { puffs: S.bank, look: Object.assign({}, LOOK, { lit: hex('#fff7e6'), mid: hex('#f1ece4'), edge: [0.02, 0.06, 0.2, 0.12] }) }],
        grade: GRADE,
      });
    },
  };
})(window.SW = window.SW || {});
