/* 小芽与风的种子 · wind.js — a scene painted stroke by stroke.
 * No shape is filled flat: the sky is laid in with broad wet strokes, clouds are built from round
 * brush dabs, every blade of grass is a single flick of the brush bent by the wind, and the girl is
 * drawn with a pencil line (pressure, taper, a second searching pass) and coloured with strokes
 * that follow her form. The wind is one field that bends the grass, combs light waves across the
 * meadow, streams her hair and lifts the hem of her coat. Drawn "on twos" (12 drawings a second)
 * with the pencil line re-drawn each time, the way a hand-drawn line boils.
 */
(function () {
  'use strict';
  const W = 1280, H = 720, TAU = Math.PI * 2;
  const { clamp, lerp, smooth } = P;
  const rgb = (c) => (typeof c === 'string' && c.startsWith('rgb') ? c.match(/[\d.]+/g).slice(0, 3).map(Number) : P.rgb(c)), css = P.css;
  const mixc = (a, b, t) => P.mix(a, b, clamp(t, 0, 1));

  // ------------------------------------------------------------------ brush engine
  function bez(p0, p1, p2, p3, n = 12) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, m = 1 - t; o.push([m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0], m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
  function quad(p0, p1, p2, n) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, m = 1 - t; o.push([m * m * p0[0] + 2 * m * t * p1[0] + t * t * p2[0], m * m * p0[1] + 2 * m * t * p1[1] + t * t * p2[1]]); } return o; }
  // a path given as a list of cubic segments [[p0,p1,p2,p3], ...] → points
  function chain(segs, n = 10) { const o = []; segs.forEach((s, i) => { const q = bez(s[0], s[1], s[2], s[3], n); o.push(...(i ? q.slice(1) : q)); }); return o; }
  function normals(pts) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }); }
  // a tapered filled stroke: width(t) along the path — one flick of a loaded brush
  function flick(ctx, pts, w, col, prof = (t) => Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05))) {
    if (!pts || pts.length < 2) return; const N = normals(pts), L = [], R = []; const n = pts.length - 1;
    for (let i = 0; i <= n; i++) { const hw = (w * prof(i / n)) / 2; L.push([pts[i][0] + N[i][0] * hw, pts[i][1] + N[i][1] * hw]); R.push([pts[i][0] - N[i][0] * hw, pts[i][1] - N[i][1] * hw]); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i <= n; i++) ctx.lineTo(L[i][0], L[i][1]); for (let i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill();
  }
  // a bristle brush: several hairs, each its own thin line with its own load of paint (dry-brush streaks)
  function bristle(ctx, pts, w, col, o = {}) {
    const r = P.rng(o.seed || 1), N = normals(pts), n = pts.length - 1, nb = o.hairs || Math.max(3, Math.round(w * 0.9)), base = rgb(col);
    ctx.lineCap = 'round';
    for (let b = 0; b < nb; b++) {
      const off = b / Math.max(1, nb - 1) - 0.5 + (r() - 0.5) * 0.2, a = (o.alpha ?? 0.8) * (0.35 + r() * 0.65), s0 = Math.floor(r() * (o.dry ?? 0.2) * n), s1 = n - Math.floor(r() * (o.dry ?? 0.2) * n);
      ctx.strokeStyle = css(P.vary(base, r, o.cv ?? 0.05), a); ctx.lineWidth = Math.max(0.5, (w / nb) * (1.3 + r() * 0.8)); ctx.beginPath();
      for (let i = s0; i <= s1; i++) { const t = i / n, prof = o.prof ? o.prof(t) : Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)) ** 0.5, d = off * w * prof; const x = pts[i][0] + N[i][0] * d, y = pts[i][1] + N[i][1] * d; i === s0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  // a pencil line: pressure varies along it, ends taper, and a lighter second pass searches beside it
  function PENCIL(ctx, pts, w, seed, col = '#3a2619', o = {}) {
    const r = P.rng(seed), n = pts.length - 1, jit = (o.jitter ?? 0.35) * w;
    const prof = (t) => (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.06 + 0.02))) * (0.75 + 0.5 * P.noise(t * 6 + seed, seed * 0.37));
    const wob = pts.map((p, i) => [p[0] + (P.noise(i * 0.2 + seed, 1.3) - 0.5) * jit, p[1] + (P.noise(i * 0.2 + seed, 7.9) - 0.5) * jit]);
    flick(ctx, wob, w, css(col, o.alpha ?? 0.92), prof);
    if (o.second !== false && n > 6) { const a = Math.floor(n * (0.05 + r() * 0.2)), b = Math.ceil(n * (0.75 + r() * 0.2)); const N = normals(pts), d = (r() - 0.5) * w * 1.6; const seg = pts.slice(a, b + 1).map((p, i) => [p[0] + N[a + i][0] * d + (r() - 0.5) * w * 0.3, p[1] + N[a + i][1] * d + (r() - 0.5) * w * 0.3]); flick(ctx, seg, w * 0.55, css(col, (o.alpha ?? 0.92) * 0.4)); }
  }
  // colour a shape with strokes, not a flat fill: a base wash, then strokes in one direction; shade and light by strokes too
  function BRUSHFILL(ctx, pts, o) {
    const r = P.rng(o.seed || 3); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    ctx.save(); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
    ctx.fillStyle = css(o.base); ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    const ang = o.angle ?? 1.2, dx = Math.cos(ang), dy = Math.sin(ang), span = Math.hypot(x1 - x0, y1 - y0), sw = o.sw ?? 5, L = o.len ?? span * 0.4;
    const shadeAt = o.shade || (() => 0);
    const count = Math.round(((x1 - x0) * (y1 - y0)) / (sw * sw * 0.9)) * (o.density ?? 1);
    for (let i = 0; i < count; i++) {
      const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0), s = shadeAt(cx, cy), c = s > 0.5 ? mixc(o.shadeCol, o.deep || o.shadeCol, (s - 0.5) * 2) : mixc(o.base, o.shadeCol, s * 2);
      const l = L * (0.5 + r() * 0.7), cur = (r() - 0.5) * l * 0.25;
      const a = [cx - dx * l / 2, cy - dy * l / 2], b = [cx + dx * l / 2, cy + dy * l / 2];
      bristle(ctx, quad(a, [(a[0] + b[0]) / 2 - dy * cur, (a[1] + b[1]) / 2 + dx * cur], b, 6), sw * (0.7 + r() * 0.6), css(P.vary(c, r, 0.04)), { alpha: 0.55, hairs: 3, seed: (o.seed || 3) + i, dry: 0.15 });
    }
    if (o.light) { const lightAt = o.lightAt || (() => 0); for (let i = 0; i < count * 0.35; i++) { const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0); if (lightAt(cx, cy) < r()) continue; const l = L * (0.3 + r() * 0.5); bristle(ctx, quad([cx - dx * l / 2, cy - dy * l / 2], [cx, cy - 1], [cx + dx * l / 2, cy + dy * l / 2], 5), sw * 0.8, o.light, { alpha: 0.6, hairs: 3, seed: i * 7 + 5 }); } }
    ctx.restore();
  }

  // cel paint: one flat colour and one hard-edged shadow that follows the contour (the shape, nudged toward the light, keeps the base colour)
  function celFill(ctx, pts, o) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const path = (dx, dy) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + dx, p[1] + dy) : ctx.moveTo(p[0] + dx, p[1] + dy))); ctx.closePath(); };
    ctx.save(); path(0, 0); ctx.clip();
    ctx.fillStyle = css(o.shadeCol); ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    const k = o.cel ?? 0.3, bw = x1 - x0, bh = y1 - y0, dx = -Math.min(bw * k, 14 + bw * 0.12), dy = -Math.min(bh * 0.08, 8);
    ctx.fillStyle = css(o.base); path(dx, dy); ctx.fill();
    ctx.restore();
  }
  function inkLine(ctx, pts, w, seed, col = '#3a2619', o = {}) {
    flick(ctx, pts, w * 0.72, css(col, Math.min(1, (o.alpha ?? 0.95) + 0.05)), (t) => 0.55 + 0.45 * Math.min(1, t * 6, (1 - t) * 6));
  }

  // ------------------------------------------------------------------ the wind
  const GUST_SPEED = 230;   // px / s, left to right
  function wind(x, y, t) {
    const k = (x - t * GUST_SPEED) / 170 + P.noise(x / 300, y / 140) * 2.2 + y / 260;
    const gust = Math.max(0, Math.sin(k)) ** 2;                                     // waves of stronger air rolling across
    return 0.28 + 0.12 * Math.sin(t * 1.3 + x / 400) + gust * 0.62 + (P.noise(x / 60 + t * 0.8, y / 50) - 0.5) * 0.18;
  }

  // ------------------------------------------------------------------ static paintings (built once)
  let STATIC = null;
  const crest = (x) => 520 - 70 * Math.exp(-((x - 760) ** 2) / (2 * 420 * 420)) + 30 * (P.noise(x / 260, 2.2) - 0.5) + (x < 200 ? (200 - x) * 0.18 : 0);
  function buildStatic() {
    const sky = P.canvas(W, H), s = sky.getContext('2d'), r = P.rng(1117);
    // sky: a wet wash laid in with long horizontal strokes, deep blue to pale at the horizon
    const top = rgb('#2f7fd3'), mid = rgb('#5aa3e2'), low = rgb('#c3e3f1');
    for (let y = -20; y < H; y += 3) { const t = y / 520, c = t < 0.55 ? mixc(top, mid, t / 0.55) : mixc(mid, low, (t - 0.55) / 0.45); s.fillStyle = css(c); s.fillRect(0, y, W, 3.2); }
    for (let i = 0; i < 1400; i++) { const y = r() * 560, t = y / 520, c = t < 0.55 ? mixc(top, mid, t / 0.55) : mixc(mid, low, (t - 0.55) / 0.45), x = r() * W - 100, l = 120 + r() * 320; bristle(s, quad([x, y], [x + l / 2, y + (r() - 0.5) * 8], [x + l, y + (r() - 0.5) * 6], 10), 7 + r() * 10, css(P.vary(c, r, 0.035)), { alpha: 0.35, hairs: 5, seed: i, dry: 0.3 }); }
    // clouds: built from round brush dabs; lit from the upper left, blue-violet underneath
    const cloud = (cx, by, wd, ht, seed) => {
      const R = P.rng(seed), blobs = [];
      for (let L = 0; L < 4; L++) { const n = 5 - L, rr = ht * (0.28 - L * 0.04), sp = wd * (0.42 - L * 0.1); for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); blobs.push([cx + (t - 0.5) * 2 * sp + (R() - 0.5) * rr * 0.6 - L * wd * 0.04, by - rr * 0.7 - L * ht * 0.2, rr * (1.1 + R() * 0.4)]); } }
      const dens = (x, y) => { let m = -9; for (const [bx, b2, rr] of blobs) m = Math.max(m, 1 - Math.hypot(x - bx, (y - b2) * 1.15) / rr); return m + (P.fbm(x / 34 + seed, y / 34, 3) - 0.5) * 0.5 - (y > by ? (y - by) / 14 : 0); };
      const cols = [rgb('#7d8dc0'), rgb('#a3b2d9'), rgb('#cfd9ee'), rgb('#f3f6fb'), rgb('#ffffff')];
      const pts = [];
      for (let y = by - ht * 1.15; y < by + 10; y += 3.2) for (let x = cx - wd * 0.75; x < cx + wd * 0.75; x += 3.2) { const d = dens(x, y); if (d > 0) pts.push([x, y, d]); }
      pts.sort(() => R() - 0.5);
      for (const [x, y, d] of pts) {
        // light: how much cloud lies between this point and the sun (up-left), and how high in the heap it sits
        let occ = 0; for (let j = 1; j <= 6; j++) if (dens(x - j * 9, y - j * 13) > 0) occ++;
        const low2 = clamp((y - (by - ht * 0.45)) / (ht * 0.5), 0, 1), v = clamp(1 - occ * 0.13 - low2 * 0.5 + (R() - 0.5) * 0.12, 0, 1);
        const c = P.ramp(cols, v), rad = 2.5 + R() * 3.5 + d * 3, ang = -0.5 + (R() - 0.5) * 0.8;
        s.fillStyle = css(P.vary(c, R, 0.02), 0.6 + R() * 0.4); s.beginPath(); s.ellipse(x + (R() - 0.5) * 3, y + (R() - 0.5) * 3, rad * 1.6, rad * 0.8, ang, 0, TAU); s.fill();
      }
      // a few bright dry strokes along the sunlit rims
      for (let i = 0; i < 160; i++) { const x = cx - wd * 0.7 + R() * wd * 1.4, y = by - ht * 1.1 + R() * ht; if (dens(x, y) <= 0 || dens(x - 10, y - 14) > 0) continue; bristle(s, quad([x - 10, y + 4], [x, y - 3], [x + 12, y + 2], 6), 6, '#ffffff', { alpha: 0.8, hairs: 3, seed: i + seed }); }
    };
    cloud(860, 330, 520, 300, 3); cloud(210, 250, 260, 120, 4); cloud(1170, 210, 200, 90, 5); cloud(470, 380, 240, 70, 6);
    // the far country beyond the crest: blue ranges, then green hills dabbed with woods, all in the air's haze
    const land = P.canvas(W, H), l = land.getContext('2d');
    const ridge = (yb, amp, sc, seed, c1, c2, dab) => { const R = P.rng(seed); for (let x = -20; x < W + 20; x += 3) { const yt = yb - amp * P.fbm(x / sc + seed, seed, 4); for (let y = yt; y < yb + 120; y += 5) { const k = (y - yt) / 120; l.fillStyle = css(P.vary(mixc(c1, c2, k), R, 0.03), 0.9); l.fillRect(x, y, 4, 6); } if (dab) for (let i = 0; i < 2; i++) { const yy = yt + R() * 30; l.fillStyle = css(P.vary(dab, R, 0.08), 0.85); l.beginPath(); l.arc(x, yy, 2.5 + R() * 3, 0, TAU); l.fill(); } } };
    ridge(470, 70, 220, 11, rgb('#9db8d9'), rgb('#b9d3e4'));
    ridge(495, 45, 150, 12, rgb('#7fae9c'), rgb('#a8cfa8'), rgb('#4f8a6e'));
    ridge(512, 26, 90, 13, rgb('#6aa86a'), rgb('#94c784'), rgb('#3f7f52'));
    l.fillStyle = P.vg(l, 400, 520, ['rgba(205,230,240,0)', 'rgba(205,230,240,0.45)']); l.fillRect(0, 380, W, 160);
    // the meadow's ground, laid in under the grass with broad strokes following the slope
    const ground = P.canvas(W, H), g = ground.getContext('2d'), RG = P.rng(31);
    g.beginPath(); g.moveTo(-10, H + 10); for (let x = -10; x <= W + 10; x += 5) g.lineTo(x, crest(x)); g.lineTo(W + 10, H + 10); g.closePath(); g.save(); g.clip();
    for (let y = 400; y < H + 20; y += 3) { const t = clamp((y - 440) / 280, 0, 1); g.fillStyle = css(mixc(rgb('#8ccb52'), rgb('#3d8c3c'), t)); g.fillRect(0, y, W, 3.2); }
    for (let i = 0; i < 1600; i++) { const x = RG() * W, y = 430 + RG() * 300, t = clamp((y - 440) / 280, 0, 1), c = mixc(rgb('#a3d65c'), rgb('#2f7a38'), t + (RG() - 0.5) * 0.3), len = 40 + RG() * 90; bristle(g, quad([x, y], [x + len * 0.5, y - 6], [x + len, y - 3], 8), 6 + RG() * 8, css(c), { alpha: 0.4, hairs: 4, seed: i }); }
    g.restore();
    STATIC = { sky, land, ground };
  }

  // ------------------------------------------------------------------ the meadow, blade by blade
  let BLADES = null;
  function buildBlades() {
    const r = P.rng(99), out = [];
    for (let i = 0; i < 26000; i++) {
      const x = -40 + r() * (W + 80), y0 = crest(x), z = Math.pow(r(), 0.75), y = y0 + 4 + z * (H + 60 - y0);
      const near = clamp((y - 470) / 260, 0, 1);
      out.push({ x, y, len: (8 + r() * 16) * (0.6 + near * 3.2), w: (1.4 + r() * 1.6) * (0.6 + near * 2.4), tone: r(), lean: (r() - 0.5) * 0.3, flower: r() < 0.011 ? ((r() * 3) | 0) + 1 : 0, ph: r() * TAU });
    }
    out.sort((a, b) => a.y - b.y); BLADES = out;
  }
  const GRASS = ['#24632f', '#2f7a36', '#45923d', '#62a845', '#86c04e', '#b1d866'].map(rgb), SILVER = rgb('#dcefa8');
  function drawBlade(ctx, b, t) {
    const wv = wind(b.x, b.y, t), ang = clamp(b.lean + wv * 1.15 + Math.sin(t * 5 + b.ph) * 0.05 * wv, -0.4, 1.35);
    const tip = [b.x + Math.sin(ang) * b.len, b.y - Math.cos(ang) * b.len], mid = [b.x + Math.sin(ang * 0.35) * b.len * 0.55, b.y - Math.cos(ang * 0.35) * b.len * 0.55];
    const pts = quad([b.x, b.y], mid, tip, 6);
    const near = clamp((b.y - 470) / 260, 0, 1), sheen = clamp((wv - 0.52) * 2.4, 0, 1);
    let c = P.ramp(GRASS, clamp(0.35 + b.tone * 0.6 - near * 0.35, 0, 1));
    c = mixc(c, SILVER, sheen * (0.45 + b.tone * 0.4));                              // bent hard, the blades show their pale side
    flick(ctx, pts, b.w, css(c), (s) => (1 - s) ** 0.9 * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, s * 3))));
    if (b.flower) { const fc = ['#ffffff', '#f7d94a', '#f4b6c2'][b.flower - 1], rr = 1.2 + near * 3.2; for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + t; ctx.fillStyle = fc; ctx.beginPath(); ctx.ellipse(tip[0] + Math.cos(a) * rr, tip[1] + Math.sin(a) * rr * 0.7, rr * 0.8, rr * 0.45, a, 0, TAU); ctx.fill(); } ctx.fillStyle = '#e9a51c'; ctx.beginPath(); ctx.arc(tip[0], tip[1], rr * 0.45, 0, TAU); ctx.fill(); }
  }

  // ------------------------------------------------------------------ the girl, drawn
  // profile facing left into the wind; units: 100 tall, feet at 0; u px per unit
  function drawGirl(ctx, gx, gy, u, t, boil, style) {
    const cel = style === 'cel', brushFill = cel ? celFill : BRUSHFILL, pencil = cel ? inkLine : PENCIL;
    const w = wind(gx, gy - 150, t), sway = Math.sin(t * 2.1) * 0.6 + w * 1.2, pen = 1.7, ink = '#3b2418';
    const T = (x, y) => [gx + x * u, gy + y * u];
    const TP = (pts) => pts.map(([x, y]) => T(x, y));
    const seed = (k) => k * 131 + boil * 7;
    ctx.save();
    // shadow on the grass, stretched away from the sun
    ctx.fillStyle = 'rgba(30,70,50,0.35)'; ctx.beginPath(); ctx.ellipse(gx + 30, gy + 2, 60, 9, 0, 0, TAU); ctx.fill();
    ctx.translate(gx, gy); ctx.rotate(-(0.05 + w * 0.07)); ctx.translate(-gx, -gy);
    // --- far leg + boot, near leg + boot
    const boot = (dx, dark) => {
      const b = TP(chain([[[dx - 4, -15], [dx - 4.3, -10], [dx - 4.5, -6], [dx - 5.5, -4]], [[dx - 5.5, -4], [dx - 9.5, -3.2], [dx - 10, 0], [dx - 6.5, 0.3]], [[dx - 6.5, 0.3], [dx - 2, 0.4], [dx + 1.5, 0.4], [dx + 2.6, -0.5]], [[dx + 2.6, -0.5], [dx + 3.4, -3], [dx + 2.4, -9], [dx + 2.2, -15]], [[dx + 2.2, -15], [dx, -15.6], [dx - 2, -15.6], [dx - 4, -15]]], 6));
      brushFill(ctx, b, { base: rgb(dark ? '#a8302a' : '#cf3b2f'), shadeCol: rgb('#8a2420'), deep: rgb('#5e1a18'), angle: 1.5, sw: 3, len: 30, seed: 40 + dx, shade: (x) => clamp((x - T(dx - 1, 0)[0]) / (u * 4), 0, 1), light: '#f08070', lightAt: (x, y) => (x < T(dx - 2, 0)[0] && y < T(0, -6)[1] ? 0.7 : 0) });
      pencil(ctx, b, pen * 1.05, seed(dx + 3), ink);
    };
    const leg = (dx) => { const lg = TP(chain([[[dx - 3, -25], [dx - 3.2, -21], [dx - 3.4, -18], [dx - 3.3, -14.6]], [[dx - 3.3, -14.6], [dx - 1, -14.4], [dx + 0.6, -14.4], [dx + 1.6, -14.6]], [[dx + 1.6, -14.6], [dx + 1.8, -18], [dx + 1.7, -21], [dx + 1.6, -25]]], 5)); brushFill(ctx, lg, { base: rgb('#f7d7bf'), shadeCol: rgb('#e2ad8f'), angle: 1.55, sw: 3, len: 20, seed: 60 + dx, shade: (x) => clamp((x - T(dx, 0)[0]) / (u * 2), 0, 1) }); pencil(ctx, lg, pen * 0.9, seed(dx + 9), ink); };
    leg(4.5); boot(4.5, true); leg(-1.5); boot(-1.5, false);
    // --- the coat: an A-line raincoat pushed back by the wind, its hem lifting and rippling
    const hemBack = [16 + w * 13 + Math.sin(t * 6) * 1.6, -26 + w * 7], ripple = (k) => Math.sin(t * 7 + k * 1.7) * (0.8 + w * 1.6);
    const coat = TP([
      ...chain([[[-4.8, -67.5], [-8.5, -62], [-11, -49], [-13.4, -36]], [[-13.4, -36], [-14.2, -31], [-15, -26], [-15.6, -22.4 + ripple(0) * 0.3]]], 10),
      ...chain([[[-15.6, -22.4 + ripple(0) * 0.3], [-8, -21 + ripple(1)], [0, -23.4 + ripple(2)], [6, -22.5 + ripple(3)]], [[6, -22.5 + ripple(3)], [10, -21.6 + ripple(4)], [13, -24 + ripple(5)], hemBack]], 10).slice(1),
      ...chain([[hemBack, [hemBack[0] - 5, hemBack[1] - 9], [10.6 + w * 3, -44], [8, -58]], [[8, -58], [7, -64], [3, -68.6], [-4.8, -67.5]]], 10).slice(1),
    ]);
    brushFill(ctx, coat, {
      base: rgb('#f2c23f'), shadeCol: rgb('#d69033'), deep: rgb('#b46a2c'), angle: 1.42 + w * 0.25, sw: 4.2, len: 70, seed: 7, density: 1.1,
      shade: (x, y) => clamp((x - T(1, 0)[0]) / (u * 9) + (y - T(0, -40)[1]) / (u * 40) * 0.3, 0, 1),
      light: '#ffe596', lightAt: (x, y) => (x < T(-7, 0)[0] ? 0.8 : 0),
    });
    // folds the wind pulls into the cloth, then the outline
    for (let k = 0; k < 4; k++) { const fx = -6 + k * 5 + w * k * 1.2; pencil(ctx, TP(bez([fx - 1, -24.5 + ripple(k) * 0.6], [fx + 1, -32], [fx + 2 + w * 2, -40], [fx + 3 + w * 3, -47 + k * 2])), pen * 0.75, seed(30 + k), '#8a5a24', { alpha: 0.7, second: false }); }
    pencil(ctx, coat, pen * 1.15, seed(1), ink);
    // toggles down the front edge
    for (const ty of [-58, -49, -40]) { const [x, y] = T(-11.2 + (ty + 58) * -0.12, ty); ctx.fillStyle = '#8a5a33'; ctx.beginPath(); ctx.ellipse(x + 6, y, 5, 2, -0.15, 0, TAU); ctx.fill(); pencil(ctx, [[x + 1, y], [x + 11, y - 1]], 1, seed(ty), ink, { second: false, alpha: 0.6 }); }
    // the hood, bunched at the back of the neck, flapping
    const hd = TP(chain([[[1, -68], [3, -73], [9 + w * 3, -72.5 + Math.sin(t * 8) * 0.8], [11 + w * 4, -67]], [[11 + w * 4, -67], [12 + w * 3, -62.5], [7, -61], [4, -63]], [[4, -63], [2, -64.5], [0.5, -66], [1, -68]]], 8));
    brushFill(ctx, hd, { base: rgb('#eab53b'), shadeCol: rgb('#c4802f'), angle: 0.4, sw: 3.5, len: 30, seed: 9, shade: (x, y) => clamp((y - T(0, -70)[1]) / (u * 8), 0, 1) });
    pencil(ctx, hd, pen, seed(5), ink);
    // the near arm, swinging back a little against the wind
    const sh = [1.5, -62], el = [4 + sway * 0.8, -48], wr = [2.6 + sway * 1.2, -37];
    const armL = TP(chain([[[sh[0] - 3.4, sh[1]], [el[0] - 4.6, el[1] - 4], [el[0] - 4.2, el[1] + 2], [wr[0] - 3.2, wr[1]]], [[wr[0] - 3.2, wr[1]], [wr[0] - 1, wr[1] + 0.8], [wr[0] + 1.5, wr[1] + 0.8], [wr[0] + 3.4, wr[1]]], [[wr[0] + 3.4, wr[1]], [el[0] + 4, el[1] + 2], [el[0] + 4.4, el[1] - 4], [sh[0] + 3.6, sh[1] - 1]], [[sh[0] + 3.6, sh[1] - 1], [sh[0] + 2, sh[1] - 3.6], [sh[0] - 2, sh[1] - 3.6], [sh[0] - 3.4, sh[1]]]], 8));
    const hand = TP(chain([[[wr[0] - 2.6, wr[1] - 0.4], [wr[0] - 3.4, wr[1] + 2.4], [wr[0] - 2.6, wr[1] + 5.4], [wr[0] - 0.4, wr[1] + 5.8]], [[wr[0] - 0.4, wr[1] + 5.8], [wr[0] + 2, wr[1] + 6], [wr[0] + 3.2, wr[1] + 3], [wr[0] + 2.6, wr[1] - 0.4]]], 6));
    brushFill(ctx, hand, { base: rgb('#f8dac4'), shadeCol: rgb('#e6b092'), angle: 1.4, sw: 2.6, len: 14, seed: 11, shade: (x) => clamp((x - T(wr[0], 0)[0]) / (u * 3), 0, 1) }); pencil(ctx, hand, pen * 0.85, seed(13), ink);
    brushFill(ctx, armL, { base: rgb('#f0bd3c'), shadeCol: rgb('#cf8a31'), angle: 1.35, sw: 3.6, len: 40, seed: 12, shade: (x) => clamp((x - T(el[0] - 1, 0)[0]) / (u * 4), 0, 1), light: '#ffe596', lightAt: (x) => (x < T(el[0] - 2.6, 0)[0] ? 0.8 : 0) });
    pencil(ctx, armL, pen, seed(12), ink);
    pencil(ctx, TP(bez([el[0] - 3, el[1] + 1], [el[0] - 1, el[1] - 0.5], [el[0] + 1, el[1] - 0.2], [el[0] + 3, el[1] - 1.2])), pen * 0.7, seed(14), '#8a5a24', { second: false, alpha: 0.7 });
    pencil(ctx, TP(bez([wr[0] - 3.3, wr[1] - 2.2], [wr[0] - 1, wr[1] - 1.4], [wr[0] + 1.4, wr[1] - 1.4], [wr[0] + 3.4, wr[1] - 2.4])), pen * 0.7, seed(15), '#8a5a24', { second: false, alpha: 0.6 });
    // --- the head, in profile: the neck, the face, the ear the wind uncovers
    ctx.save(); ctx.translate(...[0, 2.6 * u]); ctx.translate(...T(-4, -70)); ctx.rotate(-0.08 - w * 0.04); ctx.translate(...T(-4, -70).map((v) => -v));
    const neck = TP([[-3.4, -73], [-3, -68.6], [1.4, -68.4], [1.8, -73]]); brushFill(ctx, neck, { base: rgb('#e9b99a'), shadeCol: rgb('#c98d70'), angle: 1.5, sw: 2.5, len: 10, seed: 21, shade: (x, y) => clamp(1 - (y - T(0, -73)[1]) / (u * 4), 0, 1) });
    const face = TP(chain([[[-5, -96], [-9.4, -93.6], [-11.3, -89.4], [-11.5, -85.6]], [[-11.5, -85.6], [-11.7, -83.6], [-12.6, -82.2], [-13.5, -80.9]], [[-13.5, -80.9], [-13.9, -80.2], [-13.3, -79.5], [-12.4, -79.4]], [[-12.4, -79.4], [-12.9, -78], [-12.7, -76.8], [-12, -75.9]], [[-12, -75.9], [-11.6, -75.2], [-11.6, -74.4], [-11.3, -73.7]], [[-11.3, -73.7], [-10.8, -71.8], [-8.8, -70.6], [-6.4, -70.5]], [[-6.4, -70.5], [-3, -70.4], [0.5, -71.8], [3, -74.5]], [[3, -74.5], [5, -80], [5, -88], [3, -95]], [[3, -95], [0, -97], [-3, -97], [-5, -96]]], 8));
    brushFill(ctx, face, { base: rgb('#fbe0cb'), shadeCol: rgb('#f0bfa0'), angle: 1.6, sw: 2.6, len: 18, seed: 22, density: 0.8, shade: (x, y) => clamp((x - T(-5, 0)[0]) / (u * 8), 0, 1) * 0.7 });
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; P.glow(ctx, ...T(-8.3, -76.6), u * 3.2, '#f49488', 0.55, 'multiply'); ctx.restore();
    ctx.fillStyle = 'rgba(244,140,128,0.35)'; ctx.beginPath(); ctx.ellipse(...T(-8.2, -76.8), u * 2.6, u * 1.5, 0, 0, TAU); ctx.fill();
    pencil(ctx, face.slice(0, Math.floor(face.length * 0.62)), pen * 0.95, seed(23), ink);
    const ear = TP(chain([[[0.4, -82.5], [-1.2, -83.4], [-1.6, -79.4], [0.6, -78.8]], [[0.6, -78.8], [2, -78.6], [2.2, -82.2], [0.4, -82.5]]], 6));
    brushFill(ctx, ear, { base: rgb('#f6cdb2'), shadeCol: rgb('#e4a98a'), angle: 1.5, sw: 2, len: 8, seed: 24 }); pencil(ctx, ear, pen * 0.8, seed(24), ink, { second: false });
    // the eye: dark, a lid line with lashes, one highlight; a small brow; a nose and a mouth by pencil only
    const blink = ((t + 0.7) % 3.6) < 0.12;
    if (blink) pencil(ctx, TP(bez([-10, -82.4], [-9.2, -81.6], [-8, -81.5], [-7.2, -82.1])), pen * 1.2, seed(25), '#2a1810', { second: false });
    else {
      const [ex, ey] = T(-8.7, -82.2); ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.ellipse(ex, ey, u * 1.05, u * 1.55, -0.12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5c3626'; ctx.beginPath(); ctx.ellipse(ex - u * 0.1, ey + u * 0.7, u * 0.7, u * 0.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex - u * 0.35, ey - u * 0.55, u * 0.38, 0, TAU); ctx.fill();
      pencil(ctx, TP(bez([-10.3, -83.2], [-9.4, -84.2], [-7.8, -84.2], [-6.8, -83.2])), pen * 1.5, seed(26), '#22140d', { second: false });
      pencil(ctx, TP(bez([-10.2, -83.3], [-10.8, -83.1], [-11.1, -82.7], [-11.3, -82.2])), pen * 0.9, seed(27), '#22140d', { second: false });
    }
    pencil(ctx, TP(bez([-10.4, -86.6], [-9.4, -87.4], [-8, -87.5], [-6.8, -87])), pen * 0.8, seed(28), '#2a1c18', { second: false, alpha: 0.75 });
    pencil(ctx, TP(bez([-12.2, -75.1], [-11.7, -74.7], [-11.1, -74.7], [-10.5, -75])), pen * 0.8, seed(29), '#8a3d30', { second: false });
    // --- the hair: a black bob streaming back; every lock drawn as its own stroke
    const flow = (k, s) => Math.sin(t * 9 - s * 4 + k * 0.9) * (0.6 + w * 1.4) * s;
    const reach = 21 + w * 13, tw = (k) => Math.sin(t * 8.5 + k * 1.3) * (0.8 + w * 1.8);
    const tipA = [reach + tw(1), -93 + w * 1.5 + tw(2) * 0.6], tipB = [reach - 3 + tw(3), -86 + tw(4) * 0.7], tipC = [reach - 8 + tw(5), -79 + tw(6) * 0.6];
    const back = TP(chain([
      [[-9.6, -90], [-8.4, -97.5], [-1, -101.5], [6, -100]],
      [[6, -100], [12, -99], [reach * 0.75, -97 + tw(0) * 0.3], tipA],
      [tipA, [reach - 6, -91.5], [reach - 8, -90], [reach - 9, -89.5]],
      [[reach - 9, -89.5], [reach - 6, -88.5], [reach - 4, -87], tipB],
      [tipB, [reach - 9, -84.5], [reach - 12, -83.5], [reach - 13, -83]],
      [[reach - 13, -83], [reach - 11, -81.5], [reach - 9.5, -80], tipC],
      [tipC, [reach - 15, -77.5], [8, -76], [3.5, -76.5]],
      [[3.5, -76.5], [3, -81], [1.6, -85.6], [-1, -88]],
      [[-1, -88], [-4, -89], [-7.4, -88.8], [-9.6, -90]]], 10));
    brushFill(ctx, back, { base: rgb('#2b2226'), shadeCol: rgb('#1b1416'), angle: -0.12 + w * 0.06, sw: 3.2, len: 70, seed: 31, shade: (x, y) => clamp((y - T(0, -94)[1]) / (u * 14), 0, 1), light: '#6f6a86', lightAt: (x, y) => (y < T(0, -96)[1] ? 0.9 : 0) });
    pencil(ctx, back, pen * 1.1, seed(31), '#160e10');
    // locks: each one a brush stroke from the crown, combed back and streaming off the tips
    const RL = P.rng(77 + boil);
    for (let k = 0; k < 34; k++) {
      const s0 = k / 33, root = [-7 + s0 * 13, -98.5 - Math.sin(s0 * Math.PI) * 1.8 + s0 * 7 + RL()], dest = [tipA, tipB, tipC][Math.min(2, Math.floor(s0 * 3))];
      const tip = [dest[0] - RL() * 4 + (RL() < 0.25 ? 3 + RL() * 4 : 0), dest[1] + (RL() - 0.5) * 2.5];
      const c1 = [root[0] + (tip[0] - root[0]) * 0.33, root[1] - 1.5 + tw(k) * 0.2], c2 = [root[0] + (tip[0] - root[0]) * 0.7, (root[1] + tip[1]) / 2 + tw(k + 2) * 0.4];
      const hi = k % 4 === 0, col = hi ? '#5d5672' : k % 3 ? '#231b1f' : '#3a3240';
      flick(ctx, TP(bez(root, c1, c2, tip, 14)), u * (hi ? 0.45 : 0.7 + RL() * 0.6), css(col, hi ? 0.75 : 0.9), (q) => (1 - q) ** 0.8 * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, q * 3))));
    }
    // stray hairs the wind pulls loose beyond the tips
    for (let k = 0; k < 7; k++) { const d = [tipA, tipB, tipC][k % 3], a0 = [d[0] - 6, d[1] + (RL() - 0.5) * 2], a1 = [d[0] + 3 + RL() * 5 + w * 3, d[1] + (RL() - 0.5) * 3 + tw(k) * 0.5]; pencil(ctx, TP(quad(a0, [(a0[0] + a1[0]) / 2, a0[1] - 1 + tw(k + 1) * 0.4], a1, 8)), 0.9, seed(60 + k), '#2b2226', { second: false, alpha: 0.75, jitter: 0.2 }); }
    // the fringe, lifted off the forehead by the wind
    const fr = TP(chain([[[-4.8, -97.6], [-9, -96.4], [-11.6, -93], [-12.2, -89.6 - w * 1.2]], [[-12.2, -89.6 - w * 1.2], [-10.6, -90.4], [-9.4, -90.6], [-8.6, -89.8]], [[-8.6, -89.8], [-7.4, -91.4], [-5.2, -92], [-3.6, -91]], [[-3.6, -91], [-2, -94], [0, -96], [-4.8, -97.6]]], 8));
    brushFill(ctx, fr, { base: rgb('#2b2226'), shadeCol: rgb('#1b1416'), angle: 2.6, sw: 2.6, len: 18, seed: 33 }); pencil(ctx, fr, pen, seed(33), '#160e10');
    for (let k = 0; k < 5; k++) { const a = T(-5 - k * 1.4, -96.5 + k * 1.2), b = T(-9 - k * 0.9 - w, -91 + k * 0.3 - w * 1.6 + Math.sin(t * 10 + k) * 0.6); pencil(ctx, [a, [(a[0] + b[0]) / 2 - 3, (a[1] + b[1]) / 2 - 2], b], 1.2, seed(40 + k), '#463d4a', { second: false, alpha: 0.8 }); }
    ctx.restore();
    ctx.restore();
  }

  // ------------------------------------------------------------------ air: wind lines, seeds, petals
  function drawAir(ctx, t) {
    const r = P.rng(5);
    for (let i = 0; i < 9; i++) { const y = 140 + r() * 380, sp = 260 + r() * 180, len = 160 + r() * 220, x = ((r() * (W + 800) + t * sp) % (W + 800)) - 400, wav = r() * TAU; const pts = []; for (let k = 0; k <= 16; k++) { const s = k / 16; pts.push([x + s * len, y + Math.sin(s * 3 + wav + t * 2) * 10 - s * 6]); } flick(ctx, pts, 2.2, 'rgba(255,255,255,0.55)', (s) => Math.sin(Math.PI * s) ** 1.5); }
    for (let i = 0; i < 70; i++) {
      const sp = 140 + r() * 160, x = ((r() * (W + 200) + t * sp) % (W + 200)) - 100, y = 120 + r() * 520 + Math.sin(t * 2 + i) * 22 - (x / W) * 60, k = 0.6 + r() * 1.4, rot = Math.sin(t * 3 + i) * 0.8 + 0.5;
      if (i % 3) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let j = 0; j < 9; j++) { const a = -Math.PI * (0.1 + (0.8 * j) / 8); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 6 * k, Math.sin(a) * 5 * k); } ctx.moveTo(0, 0); ctx.lineTo(0, 8 * k); ctx.stroke(); ctx.fillStyle = '#9b7a4a'; ctx.beginPath(); ctx.arc(0, 8 * k, 1, 0, TAU); ctx.fill(); ctx.restore(); }
      else { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 4 + i); ctx.scale(1, 0.45 + 0.4 * Math.sin(t * 6 + i)); ctx.fillStyle = r() < 0.5 ? '#ffffff' : '#f6d64a'; ctx.beginPath(); ctx.ellipse(0, 0, 3.6 * k, 2 * k, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    }
  }

  // ------------------------------------------------------------------ one frame
  function render(ctx, t) {
    if (!STATIC) buildStatic(); if (!BLADES) buildBlades();
    const tt = Math.floor(t * 12) / 12, boil = Math.floor(t * 12);                         // on twos: a new drawing every 1/12 s
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(STATIC.sky, 0, 0);
    ctx.drawImage(STATIC.land, 0, 0);
    ctx.drawImage(STATIC.ground, 0, 0);
    // a cloud's shadow drifting over the meadow
    const cs = ((tt * 40) % (W + 900)) - 500; P.soft(ctx, 30, (c) => { c.fillStyle = 'rgba(20,60,70,0.22)'; c.beginPath(); c.ellipse(cs, 600, 380, 60, -0.08, 0, TAU); c.fill(); });
    const gx = 760, gy = crest(760) + 30, u = 2.9;
    let i = 0; for (; i < BLADES.length && BLADES[i].y < gy - 6; i++) drawBlade(ctx, BLADES[i], tt);
    drawGirl(ctx, gx, gy, u, tt, boil);
    for (; i < BLADES.length; i++) drawBlade(ctx, BLADES[i], tt);
    drawAir(ctx, tt);
    // finish: warm light from the upper left, paper grain, a soft vignette
    ctx.fillStyle = P.rg(ctx, 120, -60, 0, 1100, [[0, 'rgba(255,240,200,0.18)'], [1, 'rgba(255,240,200,0)']]); ctx.fillRect(0, 0, W, H);
    P.tex(ctx, 'paper', 0.26, 'soft-light', [0, 0, W, H]);
    ctx.fillStyle = P.rg(ctx, W / 2, H * 0.45, W * 0.35, W * 0.8, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20,30,40,0.28)']]); ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  window.WIND = { render, W, H, drawGirl, flick, bez, quad, chain };
})();
