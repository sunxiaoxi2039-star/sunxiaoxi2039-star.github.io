// SKY WHALE — V. NIGHT: THE ANSWER (24.5 s). 5A locked-off moonlit wide, the Old Whale alone;
// 5B close, it sings under the moon; 5C warm eyes along the distant cloud band, the pod rises one
// by one (Drover, Pip and Elder, Mend, Swift leaping clear), the Old Whale swims into them, the
// camera pulls back a little, and the family swims toward the moon.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, hex, smoothKeys, keyed } = SW;

  const MOON_AZ = -12;
  const MOON = SW.dirFromAzEl(MOON_AZ, 12.5);
  const SKY = {
    zen: hex('#0b1030'), up: hex('#1c2356'), hor: hex('#4b4a82'), below: hex('#2f3266'), stops: [0.38, 0.1, 0.25, 0.8],
    sunDir: MOON, sunCol: hex('#ffffff'), glowCol: hex('#6f73b8'), sun: [0.0, 0.5, 0.35, 0],
    hazeCol: hex('#5a5990'), hazeAmt: 0.65, hazeW: 0.05,
    bandA: [0.07, 0.035, 0.30, 7], bandB: [0.17, 0.05, 0.22, 5], bandLit: hex('#b8b4e2'), bandShade: hex('#3d4278'), bandAmt: 0.7,
    stars: 1.0, moonDir: MOON, moon: [0.034, 0.18, 0.40, 1], moonCol: hex('#f4f6ff'), brush: 0.035,
  };
  const LOOK = {
    lit: hex('#9c98cd'), mid: hex('#6e6dab'), shad: hex('#40457f'), deep: hex('#353a72'), rim: hex('#dcdaff'),
    bands: [0.62, 0.45, 0.035, 0.16], edge: [0.025, 0.07, 0.6, 0.06], fog: hex('#5a5990'), fogDen: 1 / 1500, fogStart: 250, aoK: 0.45,
  };
  const LIGHT = {
    sunDir: v3.norm([MOON[0], MOON[1] + 0.25, MOON[2]]), key: hex('#a9b0e2'), shade: hex('#5d62a0'), rimCol: hex('#dfe3ff'), rimAmt: 1.0,
    ink: hex('#121226'), bounce: hex('#8b88c4'), bounceAmt: 0.6, fogCol: hex('#5a5990'), fogDen: 1 / 5000, fogStart: 150, eyeTint: [1.35, 1.1, 0.85],
  };
  const GRADE = { bloom: 0.42, diffuse: 0.25, wrap: 0.3, grain: 0.02, density: 0.1, vignette: 0.22, thresh: 0.72 };

  function seaFor(F, key, opts) {
    if (!F.cache[key]) F.cache[key] = SW.CloudGen.sea(opts);
    return F.cache[key];
  }

  // ------------------------------------------------------------------ 5A
  SW.SHOTS['5A'] = {
    init(F, S) {
      S.puffs = SW.CloudGen.sea({ focus: [0, 0, -400], y: -20, amp: 26, amp2: 16, scale: 240, spacing: 9, detailR: 300, deepR: 0, radius: 12000, seed: 61, lobes: 0.6, detail: false });
      S.path = SW.Path3([[-500, 60, -270], [-200, 62, -262], [100, 64, -256], [400, 66, -252]]);
      S.whale = new SW.Whale('old', { path: S.path, speed: [[0, 18]], d0: 440, period: 5.6, waveAmp: 0.065, phase: 0.2, flukeSide: 1, eye: () => 1.0 });
      S.cam = SW.Camera({ pos: [-10, 66, 0], target: [20, 86, -400], fov: 38, near: 2, far: 40000 });
    },
    frame(F, S, tl, t, frame) {
      F.stage(frame, {
        time: t, cam: S.cam, light: LIGHT, sky: SKY,
        whales: [{ whale: S.whale, t: tl, glowScale: 1.6, shadow: false }],
        clouds: [{ puffs: S.puffs, look: LOOK }],
        grade: GRADE,
      });
    },
  };

  // ------------------------------------------------------------------ 5B
  SW.SHOTS['5B'] = {
    init(F, S) {
      S.puffs = SW.CloudGen.sea({ focus: [0, 0, -200], y: -12, amp: 26, amp2: 16, scale: 240, spacing: 9, detailR: 260, deepR: 0, radius: 12000, seed: 62, lobes: 0.6, detail: false });
      const h = v3.norm([Math.cos(MOON_AZ * Math.PI / 180), 0, Math.sin(MOON_AZ * Math.PI / 180) - 0.15]);
      S.path = SW.Path3([v3.add(v3.scale(h, -300), [0, 34, -160]), v3.add(v3.scale(h, -100), [0, 35, -160]), v3.add(v3.scale(h, 100), [0, 36, -160]), v3.add(v3.scale(h, 300), [0, 37, -160])]);
      S.whale = new SW.Whale('old', {
        path: S.path, speed: [[0, 7], [5.5, 6]], d0: 300, period: 7.0, waveAmp: 0.04, phase: 1.0, flukeSide: -1,
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
      const pos = v3.add(v3.madd(head, SW.dirFromAzEl(MOON_AZ - 7, 4), -86), [0, -4, 0]);
      const tgt = v3.add(v3.add(head, v3.scale(tg, -14)), [0, 10, 0]);
      const cam = SW.Camera({ pos, target: tgt, fov: 36, near: 1, far: 40000 });
      F.stage(frame, {
        time: t, cam, light: LIGHT, sky: SKY,
        whales: [{ whale: w, t: tl, glowScale: 1.2, shadow: false }],   // (soft moonlight; swaying pine pads made cast shadows blink)
        clouds: [{ puffs: S.puffs, look: LOOK }],
        grade: GRADE,
      });
    },
  };

  // ------------------------------------------------------------------ 5C
  SW.SHOTS['5C'] = {
    init(F, S) {
      const D = (k) => SW.WHALE.DESIGNS[k];
      // camera looks 30 deg left of the moon; the family swims across the frame toward the moon (upper right)
      const camAzD = MOON_AZ - 30, travAzD = camAzD + 70;
      const ca = camAzD * Math.PI / 180, ta = travAzD * Math.PI / 180;
      const dir = [Math.sin(ca), 0, -Math.cos(ca)];
      const H = [Math.sin(ta), 0, -Math.cos(ta)];
      const mdir = v3.scale(dir, -1), hd = v3.dot(mdir, H);
      const LAT = v3.norm(v3.sub(mdir, v3.scale(H, hd)));     // lateral, toward the camera
      const at = (lat, along, y) => [LAT[0] * lat + H[0] * along, y, LAT[2] * lat + H[2] * along];
      S.H = H; S.LAT = LAT; S.at = at;
      // formation at the end of the shot (lateral, along): the Old Whale nearest the camera, family around
      const pod = [
        { key: 'drover', lat: -110, along: 175, t: 2.5, speed: 11 },
        { key: 'pip', lat: 30, along: 150, t: 4.1, speed: 11 },
        { key: 'elder', lat: -280, along: 40, t: 4.7, speed: 10 },
        { key: 'mend', lat: -70, along: -175, t: 6.1, speed: 10, flukeSide: -1 },
        { key: 'swift', lat: -190, along: 330, t: 7.5, speed: 12, leap: true },
      ];
      S.whales = [];
      for (const p of pod) {
        const d = D(p.key), L = d.L;
        const top = 24 + L * 0.14;
        // snout-break point so that, after rising and swimming, the head ends near its formation place
        const dist = p.speed * (13 - p.t) + (p.leap ? 60 : 25);
        const B = at(p.lat, p.along - dist, 0);
        const P = (k, y) => v3.add(v3.madd(B, H, k), [0, y, 0]);
        const pts = p.leap
          ? [P(-260, -220), P(-150, -120), P(-50, -24), P(0, 10), P(60, 80), P(130, 112), P(200, 92), P(270, 50), P(350, top + 6), P(500, top + 6), P(900, top + 6)]
          : [P(-160, -150), P(-80, -70), P(-25, -18), P(0, 6), P(30, top - 4), P(75, top + 3), P(150, top + 6), P(400, top + 6), P(900, top + 6)];
        const path = SW.Path3(pts);
        const sp = p.leap ? [[0, 22], [p.t + 2.0, 19], [p.t + 4, p.speed], [13, p.speed]] : [[0, 16], [p.t + 1.5, 15], [p.t + 4.0, p.speed + 1], [13, p.speed]];
        const opts = { path, speed: sp, period: d.swimPeriod, phase: p.lat * 0.01, flukeSide: p.flukeSide || 0, eye: (t) => 0.4 + 0.8 * smoothstep(p.t - 1.6, p.t + 0.6, t),
          finKeys: [[0, 0.3], [p.t + 0.8, 0.3], [p.t + 2.2, 1.0]], pennantK: (t) => smoothstep(p.t + 0.8, p.t + 2.4, t), mastRaise: (t) => SW.ease.inOut5((t - p.t - 0.6) / 1.8) };
        const probe = new SW.Whale(p.key, Object.assign({}, opts, { d0: 0 }));
        opts.d0 = SW.nearestArc(path, P(0, 6)) - probe.headDist(p.t);
        const w = new SW.Whale(p.key, opts);
        w.rise = p; w.B = B;
        S.whales.push(w);
      }
      // the Old Whale swims in along the near lane and joins them
      const oldPath = SW.Path3([at(70, -420, 46), at(68, -200, 46), at(66, 0, 46), at(64, 200, 46), at(62, 500, 46)]);
      S.old = new SW.Whale('old', { path: oldPath, speed: [[0, 16], [8.7, 15], [11, 12], [13, 11]], d0: SW.nearestArc(oldPath, at(72, -200, 46)) + 0, period: 5.8, phase: 0.5,
        eye: (t) => keyed([[0, 1.0], [0.7, 1.2], [3, 1.4], [8.7, 1.6], [13, 1.45]], t, SW.ease.sine) });
      const rises = S.whales.map((w) => w.B);
      const F0 = at(-30, 40, 0);
      S.seaOpts = { focus: [F0[0], 0, F0[2]], y: -14, amp: 24, amp2: 14, scale: 240, spacing: 6.5, detailR: 420, layers: 3, radius: 12000, seed: 63, lobes: 0.7,
        deepFn: (x, z) => rises.some((b) => Math.hypot(x - b[0], z - b[2]) < 75) };
      S.mkSim = () => {
        const puffs = SW.CloudGen.sea(S.seaOpts);
        puffs.forEach((q) => { if (q.lvl > 0) delete q.rest; });
        S.puffs = puffs;
        S.sim = SW.CloudSim(puffs.filter((q) => q.rest), { t0: 0, dt: 1 / 120, k: { spring: 0.05, springY: 0.06, drag: 1.1, flow: 1.0, swirl: 0.5, friction: 0.5, stretchK: 0.07, noise: 0.4 } });
      };
      S.mkSim();
      S.drapes = S.whales.map((w, i) => SW.Drape(w, { surfY: (x, z) => SW.CloudGen.seaHeight(x, z, S.seaOpts) + 12, t0: Math.max(0, w.rise.t - 3), t1: Math.min(13, w.rise.t + 9), s0: 0.03, s1: 0.8, ds: 0.035, perStation: 6, slide: 1.6, life: 2.6, r: 5.0, seed: 30 + i }));
      // camera at ~45 degrees to the travel line, on the Old Whale's side; slow, short pull back
      const G0 = at(-60, -90, 50), G1 = at(-70, 40, 56);
      S.camPos = smoothKeys([[0, v3.add(v3.madd(G0, dir, -420), [0, 30, 0])], [5, v3.add(v3.madd(G0, dir, -424), [0, 31, 0])], [10, v3.add(v3.madd(G1, dir, -450), [0, 38, 0])], [13, v3.add(v3.madd(G1, dir, -462), [0, 41, 0])]]);
      S.camTgt = smoothKeys([[0, v3.add(G0, [0, 16, 0])], [5, v3.add(G0, [0, 18, 0])], [10, v3.add(G1, [0, 24, 0])], [13, v3.add(G1, [0, 26, 0])]]);
      S.fov = smoothKeys([[0, 44], [13, 46]]);
    },
    frame(F, S, tl, t, frame) {
      if (S.sim.t > tl + 1e-6) S.mkSim();
      const all = S.whales;
      S.sim.advance(tl, (tt) => all.filter((w) => tt > w.rise.t - 5 && tt < w.rise.t + 7).map((w) => w.pose(tt, 40)));
      const cam = SW.Camera({ pos: S.camPos(tl), target: S.camTgt(tl), fov: S.fov(tl), near: 2, far: 40000 });
      const whales = [{ whale: S.old, t: tl, glowScale: 1.4, shadow: false }].concat(all.map((w) => ({ whale: w, t: tl, shadow: false, glowScale: 1.6, glowAmt: 1.2 })));
      F.stage(frame, {
        time: t, cam, light: LIGHT, sky: SKY,
        whales,
        clouds: [{ puffs: S.puffs.concat(...S.drapes.map((dr, i) => dr(tl, all[i].pose(tl)))), look: LOOK }],
        mid: (c) => {
          // warm points of light along the distant cloud band before each rise (eyes under thin vapour)
          for (const w of all) {
            const a = smoothstep(0.7 + (w.rise.t - 2.5) * 0.25, 1.6 + (w.rise.t - 2.5) * 0.25, tl) * (1 - smoothstep(w.rise.t - 0.3, w.rise.t + 0.8, tl));
            if (a <= 0.01) continue;
            const ep = v3.add(w.B, [0, 14, 0]);
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
