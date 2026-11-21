// SKY WHALE — effects: vapour plumes from the blowhole, rain, lightning, eye glints.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, TAU, rng } = SW;

  // Blowhole plume: deterministic particles born at the vent; they inherit the whale's motion,
  // rise, spread and fade. Returns puffs for the cloud renderer.
  function plume(whale, t, o) {
    const out = [];
    const t0 = o.t0, dur = o.dur || 1.4, n = o.n || 46, life = o.life || 4.0;
    for (let i = 0; i < n; i++) {
      const tb = t0 + (i / n) * dur;
      const age = t - tb;
      if (age < 0 || age > life) continue;
      const pose = whale.pose(tb, 60);
      const L = pose.d.L;
      for (const sd of [1, -1]) {
        const vent = SW.WHALE.surf(pose, 0.118, Math.PI / 2 - sd * 0.06, 0.5).p;
        const fr = SW.WHALE.frameAt(pose, 0.118);
        const vw = whale.velocity(tb);
        const r = rng(i * 31 + (sd > 0 ? 7 : 13) + (o.seed || 0));
        const k = 1.6, k2 = 1.1;
        const strength = (o.strength || 1) * (1 - 0.6 * (i / n));
        const upv = v3.add(v3.scale(fr.U, (o.up || 16) * strength * (0.75 + 0.5 * r())), v3.scale(fr.T, (o.fwd || 4) * strength));
        const spread = v3.add(v3.scale(fr.R, sd * (2.2 + r() * 1.5) * (o.spread || 1) * (0.4 + 0.6 * r())), v3.scale(fr.T, (r() - 0.5) * 2.5));
        let p = v3.add(vent, v3.scale(vw, (1 - Math.exp(-k * age)) / k));
        p = v3.add(p, v3.scale(upv, (1 - Math.exp(-k2 * age)) / k2));
        p = v3.add(p, v3.scale(spread, age * 0.8));
        p = v3.add(p, v3.scale(o.wind || [0, 0, 0], age));
        p[1] -= 0.25 * age * age; // heavy, condensing breath settles a little
        const rad = (o.r0 || 1.2) * (L / 108) + (o.grow || 2.6) * Math.pow(age, 0.8) * (L / 108);
        const fadeIn = smoothstep(0, 0.25, age), fadeOut = 1 - smoothstep(life * 0.35, life, age);
        out.push({ p, r: rad, mn: [0, 1, 0], mk: 0.55, ao: 0.95, al: (o.alpha || 0.55) * fadeIn * fadeOut, seed: i * 1.37 + sd, soft: (o.soft === undefined ? 0.35 : o.soft) + 0.25 * age / life, st: 1 + 0.4 * (1 - Math.exp(-age)), ax: v3.norm(v3.add(upv, v3.scale(vw, -0.2))) });
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ drape: vapour sheets sliding off the hull
  // As each body station crosses the cloud surface (snout first), puffs ride on its back, slide
  // down the flanks toward the tail, detach, stretch into strands and fray away. Deterministic.
  function Drape(whale, o) {
    const L = whale.d.L, d = whale.d;
    const surfY = o.surfY;             // function(x,z) -> cloud-top height
    const T0 = o.t0 || 0, T1 = o.t1 || 30;
    const r = rng(o.seed || 1);
    const items = [];
    const stations = [];
    for (let s = o.s0 || 0.04; s <= (o.s1 || 0.8); s += o.ds || 0.035) stations.push(s);
    // crossing time per station: when the top of the section rises through the surface
    const cross = stations.map((s) => {
      const topOff = d.prof.top(s) * L * SW.WHALE.capf(s);
      let prev = null;
      for (let t = T0; t < T1; t += 1 / 24) {
        const p = whale.path.at(whale.headDist(t) - s * L);
        const above = p[1] + topOff - surfY(p[0], p[2]);
        if (above > -(o.early || 2)) {
          if (prev === null) return t;
          return t;
        }
        prev = t;
      }
      return null;
    });
    stations.forEach((s, k) => {
      const tc = cross[k];
      if (tc === null) return;
      const n = o.perStation || 7;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const phi0 = Math.PI / 2 + side * (0.08 + 0.75 * r() * r());
        items.push({
          s, tc: tc + r() * 0.25, side, phi0, ds: 0.02 + 0.05 * r(),
          slide: (o.slide || 1.8) * (0.7 + 0.6 * r()), sweep: 1.0 + 0.6 * r(),
          life: (o.life || 2.6) * (0.7 + 0.6 * r()), r: (o.r || 5.5) * (L / 108) * (0.55 + 0.7 * r()),
          seed: r() * 100, fall: 2 + 4 * r(), out: 2 + 5 * r(),
        });
      }
    });
    const cache = new Map();
    function detach(it) {
      if (cache.has(it)) return cache.get(it);
      const td = it.tc + it.slide;
      const pose = whale.pose(td, 48);
      const phi = it.phi0 + it.side * it.sweep;
      const sf = SW.WHALE.surf(pose, Math.min(0.98, it.s + it.ds), phi, it.r * 0.25);
      const v = whale.velocity(td);
      const res = { p: sf.p, n: sf.n, v };
      cache.set(it, res);
      return res;
    }
    return function (t, pose) {
      const out = [];
      for (const it of items) {
        if (t < it.tc - 0.15) continue;
        const a = t - it.tc;
        if (a > it.slide + it.life) continue;
        let p, st = 1, ax = [1, 0, 0], al = (o.alpha || 0.95) * smoothstep(-0.15, 0.25, a), rad = it.r, soft = 0.05;
        if (a < it.slide) {
          const u = Math.max(0, a / it.slide);          // (a < 0 during the fade-in lead)
          const phi = it.phi0 + it.side * it.sweep * Math.pow(u, 1.6);
          const sf = SW.WHALE.surf(pose, Math.min(0.98, it.s + it.ds * u), phi, rad * 0.25);
          p = sf.p;
          ax = sf.fr.T; st = 1 + 0.6 * u;
        } else {
          const D = detach(it), e = a - it.slide;
          const k = 1.2;
          const drift = v3.scale(D.v, (1 - Math.exp(-k * e)) / k * 0.55);
          p = v3.add(D.p, drift);
          p = v3.madd(p, D.n, it.out * (1 - Math.exp(-1.5 * e)));
          p[1] -= it.fall * e * e * 0.5;
          const rel = v3.sub(v3.scale(D.v, Math.exp(-k * e) * 0.55), D.v);
          const rl = v3.len(rel) || 1;
          ax = v3.scale(rel, 1 / rl);
          st = 1.6 + 1.6 * (1 - Math.exp(-1.2 * e));
          rad = it.r * (1 - 0.35 * Math.min(1, e / it.life));
          al *= 1 - smoothstep(it.life * 0.3, it.life, e);
          soft = 0.08 + 0.3 * Math.min(1, e / it.life);
        }
        out.push({ p, r: rad, ax, st, mn: [0, 1, 0], mk: 0.6, ao: 0.92, al, seed: it.seed, soft });
      }
      return out;
    };
  }
  SW.Drape = Drape;

  // ------------------------------------------------------------------ 2D overlay effects (rain, bolt, glints)
  const LINE_VS = `
  in vec2 aPos; in vec4 aCol;
  out vec4 vCol;
  void main(){ vCol = aCol; gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const LINE_FS = `
  in vec4 vCol; layout(location=0) out vec4 o; layout(location=1) out vec4 oA;
  void main(){ o = vec4(vCol.rgb*vCol.a, vCol.a); oA = vec4(0.0); }`;

  function FX(G) {
    const gl = G.gl;
    const prog = G.program('fxline', LINE_VS, LINE_FS);
    const mesh = G.mesh(prog, [{ name: 'aPos', size: 2 }, { name: 'aCol', size: 4 }]);
    const X = {};
    const toClip = (x, y) => [x / G.W * 2 - 1, 1 - y / G.H * 2];
    // tapered screen-space strokes: segs = [{x0,y0,x1,y1,w0,w1,col:[r,g,b],a0,a1}]
    X.strokes = function (segs, mode) {
      const v = [];
      for (const s of segs) {
        const dx = s.x1 - s.x0, dy = s.y1 - s.y0, l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l;
        const a = toClip(s.x0 + nx * s.w0 / 2, s.y0 + ny * s.w0 / 2), b = toClip(s.x0 - nx * s.w0 / 2, s.y0 - ny * s.w0 / 2);
        const c = toClip(s.x1 + nx * s.w1 / 2, s.y1 + ny * s.w1 / 2), d = toClip(s.x1 - nx * s.w1 / 2, s.y1 - ny * s.w1 / 2);
        const ca = [s.col[0], s.col[1], s.col[2], s.a0], cb = [s.col[0], s.col[1], s.col[2], s.a1];
        v.push(...a, ...ca, ...b, ...ca, ...c, ...cb, ...b, ...ca, ...d, ...cb, ...c, ...cb);
      }
      if (!v.length) return;
      mesh.setData(new Float32Array(v));
      prog.use();
      gl.disable(gl.DEPTH_TEST);
      G.blend(mode === 'add' ? 'add' : 'premult');
      mesh.draw();
      G.blend(null); gl.enable(gl.DEPTH_TEST);
    };
    // Anime glint: four-point star with a soft core, drawn additively.
    X.glint = function (x, y, size, amt, col, rot) {
      col = col || [1, 0.95, 0.8];
      rot = rot || 0;
      const segs = [];
      for (let k = 0; k < 4; k++) {
        const a = rot + k * Math.PI / 2, len = size * (k % 2 ? 0.6 : 1);
        segs.push({ x0: x, y0: y, x1: x + Math.cos(a) * len, y1: y + Math.sin(a) * len, w0: size * 0.09, w1: 0.5, col, a0: amt, a1: 0 });
      }
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; segs.push({ x0: x, y0: y, x1: x + Math.cos(a) * size * 0.22, y1: y + Math.sin(a) * size * 0.22, w0: size * 0.16, w1: size * 0.05, col, a0: amt * 0.8, a1: 0 }); }
      X.strokes(segs, 'add');
    };
    return X;
  }
  SW.FX = FX;
  SW.plume = plume;
})(window.SW = window.SW || {});
