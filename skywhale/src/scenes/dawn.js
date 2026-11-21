// SKY WHALE — I. DAWN: THE BREAKOUT (shot 1A, 21.0 s, one continuous crane take).
// A vast cloud sea at first light; it swells, domes and tears as the Old Whale rises through
// it snout-first; the fins open, pennants unfurl, the eye catches the sun, it breathes, and
// breaches into the golden sky while the crane rises with it and pulls back.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, hex, keyed, smoothKeys } = SW;

  const SUN = SW.dirFromAzEl(46, 5.0);
  const LOOK = {
    lit: hex('#ffe2b4'), mid: hex('#efbaa6'), shad: hex('#a39ccb'), deep: hex('#77739f'), rim: hex('#fff1cc'),
    bands: [0.57, 0.42, 0.035, 0.22], edge: [0.025, 0.08, 0.6, 0.12],
    fog: hex('#efcfb8'), fogDen: 1 / 2600, fogStart: 160, sat: 1.0,
  };
  const SKY = {
    zen: hex('#34508f'), up: hex('#8f93c6'), hor: hex('#f9d79b'), below: hex('#e8c4b2'), stops: [0.42, 0.1, 0.25, 0.75],
    sunDir: SUN, sunCol: hex('#fff6dc'), glowCol: hex('#ffbe78'), sun: [0.012, 0.42, 0.55, 1],
    hazeCol: hex('#f3cfae'), hazeAmt: 0.55, hazeW: 0.05,
    bandA: [0.09, 0.05, 0.42, 7], bandB: [0.20, 0.06, 0.30, 5], bandC: [0.34, 0.08, 0.22, 4],
    bandLit: hex('#ffd2a0'), bandShade: hex('#a89bc4'), bandAmt: 0.9, brush: 0.03,
  };
  const LIGHT = {
    sunDir: v3.norm([SUN[0], SUN[1] + 0.16, SUN[2]]), key: hex('#ffebd2'), shade: hex('#a9a9db'), rimCol: hex('#ffd98f'), rimAmt: 1.0,
    ink: hex('#2a2230'), bounce: hex('#f3c59a').map((x) => x * 1.25), bounceAmt: 0.8, fogCol: hex('#e9c9b6'), fogDen: 1 / 6000, fogStart: 250,
  };

  SW.SHOTS['1A'] = {
    init(F, S) {
      const B = [-40, 0, -300];
      const h = v3.norm([0.97, 0, -0.26]);
      const P = (k, y) => v3.add(v3.madd(B, h, k), [0, y, 0]);
      S.path = SW.Path3([P(-430, -260), P(-280, -168), P(-140, -84), P(0, 2), P(110, 46), P(230, 68), P(360, 78), P(500, 82), P(700, 84), P(980, 85)]);
      const arcB = SW.nearestArc(S.path, P(0, 2));
      const opts = {
        path: S.path, speed: [[0, 9], [8, 9.5], [11.5, 13], [15, 14], [21, 13]], period: 6.2, waveAmp: 0.06,
        ampKeys: [[0, 0.8], [9, 1.15], [15, 1.1], [21, 0.95]],
        finKeys: [[0, 0.25], [13.0, 0.25], [14.6, 1.0], [21, 0.95]],
        pennantK: (t) => smoothstep(12.6, 14.6, t),
        eye: (t) => 0.35 + 0.65 * smoothstep(11.2, 12.4, t),
        wind: [2, 0, 0],
      };
      const probe = new SW.Whale('old', Object.assign({}, opts, { d0: 0 }));
      opts.d0 = arcB - probe.headDist(9.0) + 6;
      opts.mastRaise = (t) => SW.ease.inOut5((t - 11.6) / 2.2);
      S.whale = new SW.Whale('old', opts);
      // cloud sea: detailed and three layers deep around the breakout, LOD out to the horizon
      S.seaOpts = { focus: [B[0] + 60, 0, B[2]], y: -16, amp: 24, amp2: 16, scale: 240, spacing: 5.0, detailR: 170, deepR: 130, layers: 3, radius: 12000, seed: 21 };
      S.mkSim = () => {
        const puffs = SW.CloudGen.sea(S.seaOpts);
        // only the near region is simulated; far puffs are static scenery
        const dyn = puffs.filter((q) => q.lvl === 0);
        puffs.forEach((q) => { if (q.lvl > 0) delete q.rest; });
        S.puffs = puffs;
        S.sim = SW.CloudSim(dyn, { t0: 0, dt: 1 / 144, k: { spring: 0.05, springY: 0.07, drag: 1.1, flow: 1.0, swirl: 0.5, friction: 0.5, stretchK: 0.07, noise: 0.5 } });
      };
      S.mkSim();
      // camera crane (continuous)
      const wh = (t) => S.whale.pose(t, 40).C[0], wm = (t) => S.whale.pose(t, 40).C[16];
      S.camPos = smoothKeys([[0, [10, 40, 40]], [5.5, [11, 40, 30]], [9.0, [14, 42, 0]], [11.5, v3.add(wh(11.5), [20, 30, 255])], [14.0, v3.add(wh(14), [10, 28, 220])], [17.0, v3.add(wm(17), [-10, 20, 212])], [21.0, v3.add(wm(21), [-30, 10, 168])]]);
      S.camTgt = smoothKeys([[0, [30, 20, -600]], [5.5, [15, 12, -600]], [9.0, v3.add(B, [5, -2, 0])], [11.5, v3.add(wh(11.5), [-5, -6, 0])], [14.0, v3.add(wh(14), [-16, -6, 0])], [17.0, v3.add(wm(17), [10, 2, 0])], [21.0, v3.add(wm(21), [12, 4, 0])]]);
      S.fov = smoothKeys([[0, 34], [9, 33], [12, 30], [16, 34], [21, 40]]);
      S.seaH = (x, z) => SW.CloudGen.seaHeight(x, z, S.seaOpts) + 18;
      // vapour sheets riding the back and pouring off the flanks as each station breaks out
      S.drape = SW.Drape(S.whale, { surfY: (x, z) => SW.CloudGen.seaHeight(x, z, S.seaOpts) + 10, t0: 4, t1: 21, s0: 0.03, s1: 0.78, ds: 0.03, perStation: 8, slide: 1.9, life: 2.8, r: 6.0, seed: 5 });
      // when the brass eye clears the cloud surface (deterministic, computed once)
      S.eyeOut = 1e9;
      for (let t = 6; t < 18; t += 1 / 48) { const e = SW.WHALE.surf(S.whale.pose(t, 40), 0.222, -0.02, 0.4).p; if (e[1] > S.seaH(e[0], e[2])) { S.eyeOut = t; break; } }
    },
    frame(F, S, tl, t, frame) {
      if (S.sim.t > tl + 1e-6) S.mkSim();
      const whale = S.whale;
      S.sim.advance(tl, (tt) => [whale.pose(tt, 48)]);
      const cam = SW.Camera({ pos: S.camPos(tl), target: S.camTgt(tl), fov: S.fov(tl), near: 2, far: 30000 });
      const plume = SW.plume(whale, tl, { t0: 14.2, dur: 1.5, n: 40, life: 4.2, up: 18, fwd: 3, alpha: 0.55, grow: 2.8, r0: 1.4, wind: [-3, 0, 0] });
      const puffs = S.puffs.concat(S.drape(tl, whale.pose(tl)));
      F.stage(frame, {
        time: tl, cam, light: LIGHT, sky: SKY,
        whales: [{ whale, t: tl }],
        clouds: [
          { puffs, look: LOOK },
          { puffs: plume, look: Object.assign({}, LOOK, { lit: hex('#fff2dc'), mid: hex('#f6d6c4'), shad: hex('#c9b9d6'), deep: hex('#b0a6c8'), edge: [0.25, 0.4, 0.3, 0.0] }) },
        ],
        fx: (cam2) => {
          // the brass eye catches the sun
          const pose = whale.pose(tl, 60);
          const e = SW.WHALE.surf(pose, 0.222, -0.02, 0.4).p;
          const te = S.eyeOut;
          const g = smoothstep(te, te + 0.3, tl) * (1 - smoothstep(te + 0.45, te + 1.4, tl));
          if (g > 0.01) {
            const sp = cam2.project(e);
            F.FX.glint(sp[0], sp[1], 70 * g + 10, g * 0.9, [1, 0.93, 0.75], 0.3 + tl * 0.4);
          }
        },
        grade: { bloom: 0.42, diffuse: 0.3, wrap: 0.32, grain: 0.016, density: 0.12, vignette: 0.14, tint: [1.0, 0.99, 0.97], thresh: 0.7, fade: 1 - smoothstep(0.0, 1.2, tl), fadeCol: [0, 0, 0] },
      });
    },
  };
})(window.SW = window.SW || {});
