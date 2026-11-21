// SKY WHALE — III. STORM: THE SQUALL (18.0 s): 3A into the storm, 3B labouring through it with
// lightning, 3C bursting out of the storm top into sunlight under a rainbow.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, hex, smoothKeys, rng } = SW;

  const STORM_LOOK = {
    lit: hex('#9aa4b8'), mid: hex('#7b869c'), shad: hex('#58627a'), deep: hex('#3e465c'), rim: hex('#c3cbd8'),
    bands: [0.60, 0.42, 0.06, 0.2], edge: [0.04, 0.10, 0.15, 0.14], fog: hex('#5d687c'), fogDen: 1 / 1500, fogStart: 100,
    flashC: hex('#eef2ff'), flashR: 260,
  };
  const STORM_SKY = {
    zen: hex('#3a4458'), up: hex('#56627a'), hor: hex('#76829a'), below: hex('#4a5468'), stops: [0.5, 0.1, 0.3, 0.9],
    sunDir: [0, 1, 0], sun: [0.01, 0.4, 0.0, 0], hazeCol: hex('#6f7b90'), hazeAmt: 0.5, hazeW: 0.12, bandAmt: 0, brush: 0.04,
  };
  const STORM_LIGHT = {
    sunDir: SW.dirFromAzEl(-20, 55), key: hex('#a9b3c4'), shade: hex('#6a7591'), rimCol: hex('#c8d0e0'), rimAmt: 0.35,
    ink: hex('#1b1f28'), bounce: hex('#8b95a8'), bounceAmt: 0.2, fogCol: hex('#5d687c'), fogDen: 1 / 3200, fogStart: 60, flashCol: [1, 1, 1],
  };

  // ------------------------------------------------------------------ rain & lightning helpers
  function rain(F, t, o) {
    const segs = [];
    const W = F.G.W, H = F.G.H;
    const layers = [{ n: 260, len: 26, w: 1.0, a: 0.16, sp: 1500 }, { n: 200, len: 48, w: 1.4, a: 0.22, sp: 2300 }, { n: 90, len: 90, w: 2.0, a: 0.28, sp: 3400 }];
    const ang = o.angle || 0.28, dx = Math.sin(ang), dy = Math.cos(ang);
    const amt = o.amount === undefined ? 1 : o.amount;
    layers.forEach((L, li) => {
      const n = Math.round(L.n * amt);
      for (let i = 0; i < n; i++) {
        const h1 = SW.hash3(i, li, 3), h2 = SW.hash3(i, li, 7), h3 = SW.hash3(i, li, 11);
        const travel = (H + L.len * 2 + 300) / dy;
        const ph = (h2 * travel + t * L.sp * (0.85 + 0.3 * h3)) % travel;
        const y = -L.len - 150 + ph * dy, x = h1 * (W + 400) - 200 + ph * dx + (o.panX || 0) * (0.3 + li * 0.35);
        const c = o.col || [0.82, 0.87, 0.95];
        segs.push({ x0: x, y0: y, x1: x + dx * L.len, y1: y + dy * L.len, w0: L.w * 0.6, w1: L.w, col: c, a0: 0, a1: L.a * (0.6 + 0.4 * h3) * (o.alpha || 1) });
      }
    });
    F.FX.strokes(segs);
  }
  // jagged bolt in world space (deterministic per seed)
  function boltPath(top, bottom, seed) {
    const r = rng(seed);
    let pts = [top, bottom];
    for (let it = 0; it < 6; it++) {
      const np = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const m = v3.lerp(a, b, 0.5), len = v3.dist(a, b);
        np.push(a, [m[0] + (r() - 0.5) * len * 0.45, m[1] + (r() - 0.5) * len * 0.1, m[2] + (r() - 0.5) * len * 0.3]);
      }
      np.push(pts[pts.length - 1]); pts = np;
    }
    // a couple of branches
    const branches = [];
    for (let k = 0; k < 3; k++) {
      const i0 = Math.floor((0.2 + r() * 0.5) * pts.length), a = pts[i0];
      const b = v3.add(a, [(r() - 0.5) * 120, -60 - r() * 80, (r() - 0.5) * 40]);
      branches.push(boltPath.sub(a, b, r));
    }
    return { pts, branches };
  }
  boltPath.sub = (a, b, r) => { let pts = [a, b]; for (let it = 0; it < 4; it++) { const np = []; for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], m = v3.lerp(p, q, 0.5), L = v3.dist(p, q); np.push(p, [m[0] + (r() - 0.5) * L * 0.5, m[1] + (r() - 0.5) * L * 0.1, m[2] + (r() - 0.5) * L * 0.3]); } np.push(pts[pts.length - 1]); pts = np; } return pts; };
  function drawBolt(F, cam, bolt, amt) {
    const segs = [];
    const add = (pts, w) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = cam.project(pts[i]), b = cam.project(pts[i + 1]);
        if (a[2] < 1 || b[2] < 1) continue;
        segs.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1], w0: w * 7, w1: w * 7, col: [0.6, 0.7, 1.0], a0: 0.10 * amt, a1: 0.10 * amt });
        segs.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1], w0: w * 2.4, w1: w * 2.4, col: [0.85, 0.9, 1.0], a0: 0.35 * amt, a1: 0.35 * amt });
        segs.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1], w0: w, w1: w, col: [1, 1, 1], a0: amt, a1: amt });
      }
    };
    add(bolt.pts, 2.2);
    bolt.branches.forEach((b) => add(b, 1.2));
    F.FX.strokes(segs, 'add');
  }
  // flash envelope: strike at t0 = bright, gap, bright, decay (frame-exact flicker)
  function flashAt(t, strikes) {
    let I = 0;
    for (const s of strikes) {
      const d = t - s.t;
      if (d < -0.01 || d > 0.6) continue;
      const pulses = s.double ? [[0, 1], [0.065, 0.45], [0.13, 0.95], [0.22, 0.4]] : [[0, 1], [0.06, 0.35], [0.11, 0.8]];
      for (const [o, a] of pulses) { const e = d - o; if (e >= -0.005) I = Math.max(I, a * Math.exp(-Math.max(0, e) / 0.045)); }
      I = Math.max(I, 0.25 * Math.exp(-Math.max(0, d) / 0.25));
    }
    return clamp(I, 0, 1) * (strikes.amt || 1);
  }

  // ------------------------------------------------------------------ storm cloud field around a path
  function stormField(path, o) {
    const puffs = [];
    const r = rng(o.seed || 5);
    for (let i = 0; i < o.n; i++) {
      const d = r() * path.length;
      const p = path.at(d);
      // keep the corridor between camera (+side) and whale clear: masses behind, above and below
      const roll = r();
      let side = -(o.clear + r() * o.spread), up = (r() - 0.5) * o.vspread;
      if (roll < 0.25) { side = (r() - 0.7) * o.spread * 0.5; up = (r() < 0.5 ? -1 : 1) * (o.vclear * 1.3 + r() * o.vspread); }
      const tg = path.tangent(d);
      const n = v3.norm(v3.cross(tg, [0, 1, 0]));
      const c = v3.add(v3.madd(p, n, side), [0, up + (o.yoff || 0), 0]);
      const W = o.w0 + r() * o.w1;
      puffs.push(...SW.CloudGen.cumulus({ center: c, width: W, height: W * (0.5 + r() * 0.6), towers: 4, seed: 300 + i + (o.seed || 0), fill: true, puff: W * 0.11, mk: 0.6 }));
    }
    return puffs;
  }

  // ------------------------------------------------------------------ 3A
  SW.SHOTS['3A'] = {
    init(F, S) {
      S.path = SW.Path3([[-500, 0, 60], [-200, -5, 20], [100, -12, -20], [400, -20, -70], [700, -26, -120]]);
      S.whale = new SW.Whale('old', { path: S.path, speed: [[0, 14], [4, 11]], d0: 430, period: 5.0, waveAmp: 0.07, phase: 0.3, eye: () => 0.75 });
      S.clouds = stormField(S.path, { n: 30, clear: 110, spread: 520, vspread: 200, vclear: 150, w0: 160, w1: 280, seed: 12, sideSign: -1 });
      // the looming storm wall ahead
      S.clouds.push(...SW.CloudGen.cumulus({ center: [650, -260, -380], width: 900, height: 900, towers: 8, seed: 71, puff: 60, mk: 0.6 }));
      const wm = (t) => S.whale.pose(t, 40).C[18];
      S.camPos = smoothKeys([[0, v3.add(wm(0), [-120, 30, 330])], [4, v3.add(wm(4), [-160, 24, 300])]]);
      S.camTgt = smoothKeys([[0, v3.add(wm(0), [70, -4, -20])], [4, v3.add(wm(4), [110, -10, -40])]]);
    },
    frame(F, S, tl, t, frame) {
      const cam = SW.Camera({ pos: S.camPos(tl), target: S.camTgt(tl), fov: 40, near: 1, far: 20000 });
      // light dies: from overcast grey-cream to slate over the shot
      const k = smoothstep(0, 3.5, tl);
      const look = Object.assign({}, STORM_LOOK, {
        lit: SW.mixc(hex('#e7e5df'), STORM_LOOK.lit, k), mid: SW.mixc(hex('#c9cbd0'), STORM_LOOK.mid, k), shad: SW.mixc(hex('#9ea6b8'), STORM_LOOK.shad, k), deep: SW.mixc(hex('#7c86a0'), STORM_LOOK.deep, k),
        fog: SW.mixc(hex('#b9c0cc'), STORM_LOOK.fog, k), fogDen: lerp(1 / 3000, 1 / 1500, k),
      });
      const sky = Object.assign({}, STORM_SKY, { zen: SW.mixc(hex('#7a8aa4'), STORM_SKY.zen, k), up: SW.mixc(hex('#a3adbf'), STORM_SKY.up, k), hor: SW.mixc(hex('#c9ced6'), STORM_SKY.hor, k), hazeCol: SW.mixc(hex('#c4c9d2'), STORM_SKY.hazeCol, k) });
      const light = Object.assign({}, STORM_LIGHT, { key: SW.mixc(hex('#e8e8e4'), STORM_LIGHT.key, k), shade: SW.mixc(hex('#9aa5c4'), STORM_LIGHT.shade, k), fogCol: look.fog, fogDen: lerp(1 / 6000, 1 / 3200, k) });
      F.stage(frame, {
        time: tl, cam, light, sky,
        whales: [{ whale: S.whale, t: tl }],
        clouds: [{ puffs: S.clouds, look }],
        fx: () => rain(F, t, { amount: smoothstep(1.0, 2.2, tl), alpha: 0.9 }),
        grade: { bloom: 0.15, diffuse: 0.12, wrap: 0.18, grain: 0.02, density: 0.18, vignette: 0.22, thresh: 0.85, sat: lerp(0.95, 0.8, k) },
      });
    },
  };

  // ------------------------------------------------------------------ 3B
  SW.SHOTS['3B'] = {
    init(F, S) {
      S.path = SW.Path3([[-400, 0, 0], [-100, -6, -10], [200, -10, -10], [500, -12, 0], [800, -10, 10]]);
      S.whale = new SW.Whale('old', { path: S.path, speed: [[0, 9.5]], d0: 300, period: 4.4, waveAmp: 0.085, surge: 0.18, phase: 0.6, eye: (t) => 0.8 + 0.2 * Math.sin(t * 1.3),
        headLift: (t) => -0.05 + 0.03 * Math.sin(t * 0.9), finKeys: [[0, 1.1]] });
      S.clouds = stormField(S.path, { n: 40, clear: 90, spread: 460, vspread: 220, vclear: 120, w0: 140, w1: 240, seed: 31, sideSign: -1 });
      // foreground wisps sliding past (between camera and whale)
      S.near = [];
      const r = rng(99);
      for (let i = 0; i < 12; i++) S.near.push({ p: [-260 + i * 75 + r() * 30, (r() < 0.5 ? -60 : 50) + r() * 30, 70 + r() * 40], r: 12 + r() * 12, ax: [1, 0, 0], st: 2.4 + r() * 1.5, mn: [0, 1, 0], mk: 0.6, ao: 0.6, al: 0.55, seed: r() * 100, soft: 0.35 });
      // bolts placed in the background masses
      S.strikes = [{ t: 1.6 }, { t: 4.4, double: true }, { t: 6.7 }];
      S.bolts = S.strikes.map((s, i) => {
        const wp = S.whale.pose(s.t, 40).C[18];
        const off = [[260, 0, -420], [-80, 0, -520], [140, 0, -360]][i];
        const top = v3.add(wp, [off[0], 260, off[2]]), bot = v3.add(wp, [off[0] + 60, -320, off[2] - 30]);
        return Object.assign(boltPath(top, bot, 500 + i), { pos: v3.add(wp, [off[0] + 20, 40, off[2]]) });
      });
    },
    frame(F, S, tl, t, frame) {
      const w = S.whale;
      const wm = w.path.at(w.headDist(tl) - 0.45 * w.d.L);
      // handheld-ish drift: slow, heavy (no jitter)
      const sway = [Math.sin(tl * 0.7) * 4, Math.sin(tl * 0.53 + 1) * 3, 0];
      const cam = SW.Camera({ pos: v3.add(v3.add(wm, [-40, 12, 175]), sway), target: v3.add(wm, [18, 2, 0]), fov: 42, near: 1, far: 20000, roll: 0.02 * Math.sin(tl * 0.4) });
      // which strike is active
      let I = 0, bi = -1;
      S.strikes.forEach((s, i) => { const v = flashAt(tl, [s]); if (v > I) { I = v; bi = i; } });
      const bolt = bi >= 0 ? S.bolts[bi] : null;
      const look = Object.assign({}, STORM_LOOK, bolt ? { flashPos: bolt.pos, flashI: I * 1.1, flashR: 300 } : {});
      const light = Object.assign({}, STORM_LIGHT, bolt ? { flash: [bolt.pos[0], bolt.pos[1], bolt.pos[2], I] } : {});
      const near = S.near.map((q) => Object.assign({}, q, { p: [q.p[0] + tl * 9, q.p[1], q.p[2]] }));
      F.stage(frame, {
        time: tl, cam, light, sky: STORM_SKY,
        whales: [{ whale: w, t: tl }],
        bg: (c) => { if (bolt && I > 0.3 && tl - S.strikes[bi].t < 0.25) drawBolt(F, c, bolt, I); },
        clouds: [{ puffs: S.clouds, look }, { puffs: near, look: Object.assign({}, look, { fogDen: 1 / 4000 }) }],
        fx: () => rain(F, t, { amount: 1, alpha: 1 + I * 0.8, panX: -tl * 40 }),
        grade: { bloom: 0.25 + I * 0.3, diffuse: 0.15, wrap: 0.18, grain: 0.022, density: 0.2, vignette: 0.24, thresh: 0.8, sat: 0.78, exposure: 1 + I * 0.15 },
      });
    },
  };

  // ------------------------------------------------------------------ 3C
  SW.SHOTS['3C'] = {
    init(F, S) {
      S.sun = SW.dirFromAzEl(150, 14);    // behind-right, low: side-lit deck, the bow stands ahead-left
      const B = [0, 0, -260];
      const h = v3.norm([0.9, 0, -0.43]);
      const P = (k, y) => v3.add(v3.madd(B, h, k), [0, y, 0]);
      S.path = SW.Path3([P(-300, -300), P(-180, -170), P(-60, -55), P(0, 0), P(70, 60), P(170, 112), P(300, 140), P(480, 150), P(700, 154)]);
      const opts = { path: S.path, speed: [[0, 22], [2.5, 20], [6.5, 14]], period: 4.6, waveAmp: 0.075, surge: 0.15, phase: 0.2, eye: (t) => 0.7 + 0.3 * smoothstep(1.5, 3.0, t), finKeys: [[0, 0.5], [1.6, 0.5], [2.8, 1.1], [6.5, 1.0]], pennantK: (t) => smoothstep(1.4, 2.8, t) };
      const probe = new SW.Whale('old', Object.assign({}, opts, { d0: 0 }));
      opts.d0 = SW.nearestArc(S.path, P(0, 0)) - probe.headDist(1.7);
      S.whale = new SW.Whale('old', opts);
      S.seaOpts = { focus: [B[0] + 40, 0, B[2]], y: -14, amp: 40, amp2: 26, scale: 220, spacing: 6.0, detailR: 170, deepR: 120, layers: 3, radius: 9000, seed: 44 };
      S.mkSim = () => {
        const puffs = SW.CloudGen.sea(S.seaOpts);
        puffs.forEach((q) => { if (q.lvl > 0) delete q.rest; });
        S.puffs = puffs;
        S.sim = SW.CloudSim(puffs.filter((q) => q.rest), { t0: 0, dt: 1 / 144, k: { spring: 0.04, springY: 0.05, drag: 0.9, flow: 1.3, swirl: 0.8, friction: 0.6, stretchK: 0.10, noise: 0.5 } });
      };
      S.mkSim();
      const wm = (t) => S.whale.pose(t, 40).C[16];
      S.camPos = smoothKeys([[0, [B[0] - 40, 58, B[2] + 200]], [1.7, [B[0] - 36, 62, B[2] + 190]], [3.5, v3.add(wm(3.5), [-60, 22, 205])], [6.5, v3.add(wm(6.5), [-80, 18, 225])]]);
      S.camTgt = smoothKeys([[0, [B[0] - 10, 6, B[2]]], [1.7, [B[0] + 0, 22, B[2]]], [3.5, v3.add(wm(3.5), [-25, 6, 0])], [6.5, v3.add(wm(6.5), [-45, 14, 0])]]);
    },
    frame(F, S, tl, t, frame) {
      if (S.sim.t > tl + 1e-6) S.mkSim();
      const w = S.whale;
      S.sim.advance(tl, (tt) => [w.pose(tt, 48)]);
      const cam = SW.Camera({ pos: S.camPos(tl), target: S.camTgt(tl), fov: 40, near: 1, far: 30000 });
      const sun = S.sun;
      const out = smoothstep(1.2, 2.4, tl);      // relief: light floods in as the whale clears the top
      const sky = {
        zen: hex('#4d7fc0'), up: hex('#8fb6df'), hor: hex('#e6e1e6'), below: hex('#c8c2d2'), stops: [0.5, 0.1, 0.3, 0.8],
        sunDir: sun, sunCol: hex('#fffbe8'), glowCol: hex('#fff0d8'), sun: [0.012, 0.4, 0.2, 1], hazeCol: hex('#ece6ea'), hazeAmt: 0.5, hazeW: 0.07,
        bandA: [0.18, 0.06, 0.25, 5], bandLit: hex('#ffffff'), bandShade: hex('#c9cde0'), bandAmt: 0.6,
        rainbow: [0.42 * smoothstep(2.4, 4.4, tl), 0.733, 0.03, -0.02], rbDir: v3.scale(sun, -1), brush: 0.03,
      };
      const look = {
        lit: hex('#fff0da'), mid: hex('#eac6cf'), shad: hex('#9888bd'), deep: hex('#564a80'), rim: hex('#ffffff'),
        bands: [0.60, 0.46, 0.035, 0.26], edge: [0.02, 0.07, 0.35, 0.14], fog: hex('#ddd3e2'), fogDen: 1 / 9000, fogStart: 400,
      };
      const light = { sunDir: sun, key: SW.mixc(hex('#aeb7c8'), hex('#fff6e8'), out), shade: SW.mixc(hex('#6a7591'), hex('#a7a4d2'), out), rimCol: hex('#fffbe8'), rimAmt: 0.8,
        ink: hex('#22232c'), bounce: hex('#efe3f2'), bounceAmt: 0.6, fogCol: hex('#e2dbe6'), fogDen: 1 / 5000, fogStart: 100 };
      F.stage(frame, {
        time: tl, cam, light, sky,
        whales: [{ whale: w, t: tl }],
        clouds: [{ puffs: S.puffs, look }],
        fx: () => { if (tl < 1.6) rain(F, t, { amount: 1 - smoothstep(0.6, 1.6, tl), alpha: 0.8 }); },
        grade: { bloom: 0.38, diffuse: 0.3, wrap: 0.3, grain: 0.017, density: 0.12, vignette: 0.12, thresh: 0.75, exposure: lerp(0.8, 1.0, out) },
      });
    },
  };
  SW.STORM = { rain, flashAt, boltPath, drawBolt };
})(window.SW = window.SW || {});
