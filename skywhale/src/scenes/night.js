// SKY WHALE — V. NIGHT: THE ANSWER (24.5 s). 5A locked-off moonlit wide, the Old Whale alone;
// 5B close, it sings under the moon; 5C warm eyes along the distant cloud band, the pod rises one
// by one (Drover, Pip and Elder, Mend, Swift leaping clear), the Old Whale swims into them, the
// camera pulls back a little, and the family swims toward the moon.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, hex, smoothKeys, keyed } = SW;

  const MOON = SW.dirFromAzEl(16, 12.5);
  const SKY = {
    zen: hex('#0b1030'), up: hex('#1c2356'), hor: hex('#4b4a82'), below: hex('#2f3266'), stops: [0.38, 0.1, 0.25, 0.8],
    sunDir: MOON, sunCol: hex('#ffffff'), glowCol: hex('#6f73b8'), sun: [0.0, 0.5, 0.35, 0],
    hazeCol: hex('#55558a'), hazeAmt: 0.6, hazeW: 0.05,
    bandA: [0.07, 0.035, 0.30, 7], bandB: [0.17, 0.05, 0.22, 5], bandLit: hex('#b8b4e2'), bandShade: hex('#3d4278'), bandAmt: 0.7,
    stars: 1.0, moonDir: MOON, moon: [0.034, 0.22, 0.45, 1], moonCol: hex('#fffbea'), brush: 0.035,
  };
  const LOOK = {
    lit: hex('#9c98cd'), mid: hex('#6e6dab'), shad: hex('#40457f'), deep: hex('#353a72'), rim: hex('#dcdaff'),
    bands: [0.62, 0.45, 0.035, 0.16], edge: [0.025, 0.07, 0.6, 0.06], fog: hex('#45467c'), fogDen: 1 / 1300, fogStart: 250, aoK: 0.45,
  };
  const LIGHT = {
    sunDir: v3.norm([MOON[0], MOON[1] + 0.25, MOON[2]]), key: hex('#a9b0e2'), shade: hex('#5d62a0'), rimCol: hex('#dfe3ff'), rimAmt: 1.0,
    ink: hex('#121226'), bounce: hex('#8b88c4'), bounceAmt: 0.6, fogCol: hex('#4a4b82'), fogDen: 1 / 5000, fogStart: 150, eyeTint: [1.35, 1.1, 0.85],
  };
  const GRADE = { bloom: 0.42, diffuse: 0.25, wrap: 0.3, grain: 0.02, density: 0.1, vignette: 0.22, thresh: 0.72 };

  function seaFor(F, key, opts) {
    if (!F.cache[key]) F.cache[key] = SW.CloudGen.sea(opts);
    return F.cache[key];
  }

  // ------------------------------------------------------------------ 5A
  SW.SHOTS['5A'] = {
    init(F, S) {
      S.puffs = SW.CloudGen.sea({ focus: [0, 0, -400], y: -20, amp: 26, amp2: 16, scale: 240, spacing: 9, detailR: 300, deepR: 0, radius: 12000, seed: 61 });
      S.path = SW.Path3([[-500, 60, -270], [-200, 62, -262], [100, 64, -256], [400, 66, -252]]);
      S.whale = new SW.Whale('old', { path: S.path, speed: [[0, 18]], d0: 440, period: 5.6, waveAmp: 0.065, phase: 0.2, eye: () => 1.0 });
      S.cam = SW.Camera({ pos: [-10, 66, 0], target: [20, 86, -400], fov: 38, near: 2, far: 40000 });
    },
    frame(F, S, tl, t, frame) {
      F.stage(frame, {
        time: t, cam: S.cam, light: LIGHT, sky: SKY,
        whales: [{ whale: S.whale, t: tl, glowScale: 1.6 }],
        clouds: [{ puffs: S.puffs, look: LOOK }],
        grade: GRADE,
      });
    },
  };

  // ------------------------------------------------------------------ 5B
  SW.SHOTS['5B'] = {
    init(F, S) {
      S.puffs = SW.CloudGen.sea({ focus: [0, 0, -200], y: -12, amp: 26, amp2: 16, scale: 240, spacing: 9, detailR: 260, deepR: 0, radius: 12000, seed: 62 });
      const h = v3.norm([1, 0, -0.15]);
      S.path = SW.Path3([v3.add(v3.scale(h, -300), [0, 34, -160]), v3.add(v3.scale(h, -100), [0, 35, -160]), v3.add(v3.scale(h, 100), [0, 36, -160]), v3.add(v3.scale(h, 300), [0, 37, -160])]);
      S.whale = new SW.Whale('old', {
        path: S.path, speed: [[0, 7], [5.5, 6]], d0: 300, period: 7.0, waveAmp: 0.04, phase: 1.0,
        headLift: (t) => keyed([[0, 0], [0.5, 0.02], [1.6, 0.17], [4.2, 0.2], [5.5, 0.12]], t, SW.ease.sine),
        eye: (t) => keyed([[0, 1.0], [0.7, 1.1], [1.8, 1.7], [4.4, 1.6], [5.5, 1.3]], t, SW.ease.sine),
        finKeys: [[0, 0.8], [1.5, 1.1], [5.5, 1.0]],
      });
    },
    frame(F, S, tl, t, frame) {
      const w = S.whale;
      // low, beside the head, looking up so the moon sits behind it
      const head = w.path.at(w.headDist(tl) - 0.12 * w.d.L);
      const tg = w.path.tangent(w.headDist(tl));
      const side = v3.norm(v3.cross(tg, [0, 1, 0]));
      const pos = v3.add(v3.madd(head, MOON, -86), [0, -6, 0]);
      const tgt = v3.add(v3.add(head, v3.scale(tg, -14)), [0, 10, 0]);
      const cam = SW.Camera({ pos, target: tgt, fov: 36, near: 1, far: 40000 });
      F.stage(frame, {
        time: t, cam, light: LIGHT, sky: SKY,
        whales: [{ whale: w, t: tl, glowScale: 1.2 }],
        clouds: [{ puffs: S.puffs, look: LOOK }],
        grade: GRADE,
      });
    },
  };

  // ------------------------------------------------------------------ 5C
  SW.SHOTS['5C'] = {
    init(F, S) {
      const D = (k) => SW.WHALE.DESIGNS[k];
      // pod rise points (snout-break times are the sound cues, shot-local)
      const pod = [
        { key: 'drover', x: -135, z: -110, t: 2.5, speed: 8 },
        { key: 'pip', x: 75, z: -55, t: 4.1, speed: 8.5 },
        { key: 'elder', x: -245, z: -170, t: 4.7, speed: 7.5 },
        { key: 'mend', x: 165, z: -140, t: 6.1, speed: 8 },
        { key: 'swift', x: 25, z: -215, t: 7.5, speed: 9, leap: true },
      ];
      S.whales = [];
      for (const p of pod) {
        const d = D(p.key), L = d.L;
        const B = [p.x, 0, p.z];
        const h = v3.norm([-p.x * 0.0012, 0, -1]);
        const P = (k, y) => v3.add(v3.madd(B, h, k), [0, y, 0]);
        const top = 24 + L * 0.14;
        const pts = p.leap
          ? [P(-260, -220), P(-150, -120), P(-50, -24), P(0, 10), P(60, 80), P(130, 112), P(200, 92), P(270, 50), P(350, top + 6), P(500, top + 6), P(800, top + 6)]
          : [P(-160, -150), P(-80, -70), P(-25, -18), P(0, 6), P(30, top - 4), P(75, top + 3), P(150, top + 6), P(400, top + 6), P(800, top + 6)];
        const path = SW.Path3(pts);
        const sp = p.leap ? [[0, 22], [p.t + 2.0, 19], [p.t + 4, 11], [13, 9]] : [[0, 16], [p.t + 1.5, 15], [p.t + 4.0, 12], [13, 11]];
        const opts = { path, speed: sp, period: d.swimPeriod, phase: p.x * 0.01, eye: (t) => 0.4 + 0.8 * smoothstep(p.t - 1.6, p.t + 0.6, t),
          finKeys: [[0, 0.3], [p.t + 0.8, 0.3], [p.t + 2.2, 1.0]], pennantK: (t) => smoothstep(p.t + 0.8, p.t + 2.4, t) };
        const probe = new SW.Whale(p.key, Object.assign({}, opts, { d0: 0 }));
        opts.d0 = SW.nearestArc(path, P(0, 6)) - probe.headDist(p.t);
        const w = new SW.Whale(p.key, opts);
        w.rise = p; w.B = B;
        S.whales.push(w);
      }
      // the Old Whale swims in from behind, into the pod
      S.old = new SW.Whale('old', { path: SW.Path3([[-25, 46, 500], [-25, 46, 300], [-22, 46, 100], [-15, 46, -100], [-5, 46, -300], [5, 46, -600]]), speed: [[0, 18], [8.7, 16], [11, 12], [13, 11]], d0: 500, period: 5.8, phase: 0.5,
        eye: (t) => keyed([[0, 1.0], [0.7, 1.2], [3, 1.4], [8.7, 1.6], [13, 1.4]], t, SW.ease.sine) });
      // cloud sea: deep (tearable) layers only near the rise points
      const rises = S.whales.map((w) => w.B);
      S.seaOpts = { focus: [-30, 0, -120], y: -14, amp: 24, amp2: 14, scale: 240, spacing: 6.5, detailR: 380, layers: 3, radius: 12000, seed: 63,
        deepFn: (x, z) => rises.some((b) => Math.hypot(x - b[0], z - b[2]) < 75) };
      S.mkSim = () => {
        const puffs = SW.CloudGen.sea(S.seaOpts);
        puffs.forEach((q) => { if (q.lvl > 0) delete q.rest; });
        S.puffs = puffs;
        S.sim = SW.CloudSim(puffs.filter((q) => q.rest), { t0: 0, dt: 1 / 120, k: { spring: 0.05, springY: 0.06, drag: 1.1, flow: 1.0, swirl: 0.5, friction: 0.5, stretchK: 0.07, noise: 0.4 } });
      };
      S.mkSim();
      S.camPos = smoothKeys([[0, [-245, 70, 20]], [3, [-247, 71, 22]], [8, [-268, 80, 36]], [11, [-285, 88, 48]], [13, [-288, 90, 50]]]);
      S.camTgt = smoothKeys([[0, [-20, 34, -130]], [8, [-20, 44, -160]], [13, [-25, 52, -200]]]);
      S.fov = smoothKeys([[0, 40], [13, 44]]);
    },
    frame(F, S, tl, t, frame) {
      if (S.sim.t > tl + 1e-6) S.mkSim();
      const all = S.whales;
      S.sim.advance(tl, (tt) => all.filter((w) => tt > w.rise.t - 5 && tt < w.rise.t + 7).map((w) => w.pose(tt, 40)));
      const cam = SW.Camera({ pos: S.camPos(tl), target: S.camTgt(tl), fov: S.fov(tl), near: 2, far: 40000 });
      const whales = [{ whale: S.old, t: tl, glowScale: 1.4 }].concat(all.map((w) => ({ whale: w, t: tl, shadow: false, glowScale: 1.6, glowAmt: 1.2 })));
      F.stage(frame, {
        time: t, cam, light: LIGHT, sky: SKY,
        whales,
        clouds: [{ puffs: S.puffs, look: LOOK }],
        fx: (c) => {
          // warm points of light along the distant cloud band before each rise (eyes under thin vapour)
          for (const w of all) {
            const a = smoothstep(0.7 + (w.rise.t - 2.5) * 0.25, 1.6 + (w.rise.t - 2.5) * 0.25, tl) * (1 - smoothstep(w.rise.t - 0.3, w.rise.t + 0.8, tl));
            if (a <= 0.01) continue;
            const ep = v3.add(w.B, [0, 14, -8]);
            const sp = c.project(ep);
            if (sp[2] < 1) continue;
            const flick = 0.85 + 0.15 * Math.sin(tl * 2.3 + w.B[0]);
            F.FX.glint(sp[0], sp[1], 10 + 6 * a, a * 0.55 * flick, [1, 0.72, 0.38], 0.0);
          }
        },
        grade: GRADE,
      });
    },
  };
})(window.SW = window.SW || {});
