/* 小芽与风的种子 · chars.js
 * Characters as hand-authored drawings, entirely in code. Every part is a
 * curve drawing (SVG path syntax) painted with flat cel colours, shaded with
 * hand-placed shadow shapes, and outlined by an "ink" renderer that varies
 * line weight, tapers open strokes and adds a slight hand wobble. Arms are
 * generated as bending sleeves with elbow creases and drawn hands.
 * Each figure is 100 units tall; ctx is scaled so units map to pixels.
 */
(function () {
  'use strict';
  const TAU = Math.PI * 2, clamp = P.clamp, lerp = P.lerp;
  const K = {};
  const LIGHT = [-0.55, -0.83];

  // ------------------------------------------------------------ curve toolkit
  const P2 = new Map(), SMP = new Map(), INK = new Map(), XF = new Map();
  const p2d = (d) => { let p = P2.get(d); if (!p) { p = new Path2D(d); P2.set(d, p); } return p; };
  function parse(d) {
    const tk = d.match(/[MLCQZ]|-?\d*\.?\d+/gi), out = []; let i = 0, cmd = 'M';
    while (i < tk.length) {
      if (/^[MLCQZ]$/i.test(tk[i])) { cmd = tk[i].toUpperCase(); i++; if (cmd === 'Z') { out.push(['Z']); continue; } }
      const n = cmd === 'C' ? 6 : cmd === 'Q' ? 4 : 2; out.push([cmd, ...tk.slice(i, i + n).map(Number)]); i += n; if (cmd === 'M') cmd = 'L';
    }
    return out;
  }
  const r2 = (v) => Math.round(v * 100) / 100;
  function xform(d, fx) { return parse(d).map(([c, ...a]) => { if (c === 'Z') return 'Z'; const o = []; for (let i = 0; i < a.length; i += 2) { const q = fx(a[i], a[i + 1]); o.push(r2(q[0]), r2(q[1])); } return c + ' ' + o.join(' '); }).join(' '); }
  const memo = (k, f) => { let r = XF.get(k); if (r === undefined) { r = f(); XF.set(k, r); } return r; };
  const mx = (d) => memo('m' + d, () => xform(d, (x, y) => [-x, y]));
  const sc = (d, cx, cy, k) => memo(`s${cx},${cy},${k}` + d, () => xform(d, (x, y) => [cx + (x - cx) * k, cy + (y - cy) * k]));
  const tr = (d, dx, dy) => memo(`t${dx},${dy}` + d, () => xform(d, (x, y) => [x + dx, y + dy]));
  function samples(d, step = 0.42) {
    let s = SMP.get(d); if (s) return s; s = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0;
    const seg = (x1, y1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x, y1 - y) / step)); for (let k = 1; k <= n; k++) cur.push([x + ((x1 - x) * k) / n, y + ((y1 - y) * k) / n]); x = x1; y = y1; };
    for (const [c, ...a] of parse(d)) {
      if (c === 'M') { cur = [[a[0], a[1]]]; cur.closed = false; s.push(cur); x = sx = a[0]; y = sy = a[1]; }
      else if (c === 'L') seg(a[0], a[1]);
      else if (c === 'C') { const L = Math.hypot(a[0] - x, a[1] - y) + Math.hypot(a[2] - a[0], a[3] - a[1]) + Math.hypot(a[4] - a[2], a[5] - a[3]), n = Math.max(2, Math.ceil(L / step)); for (let k = 1; k <= n; k++) { const t = k / n, m = 1 - t; cur.push([m * m * m * x + 3 * m * m * t * a[0] + 3 * m * t * t * a[2] + t * t * t * a[4], m * m * m * y + 3 * m * m * t * a[1] + 3 * m * t * t * a[3] + t * t * t * a[5]]); } x = a[4]; y = a[5]; }
      else if (c === 'Q') { const L = Math.hypot(a[0] - x, a[1] - y) + Math.hypot(a[2] - a[0], a[3] - a[1]), n = Math.max(2, Math.ceil(L / step)); for (let k = 1; k <= n; k++) { const t = k / n, m = 1 - t; cur.push([m * m * x + 2 * m * t * a[0] + t * t * a[2], m * m * y + 2 * m * t * a[1] + t * t * a[3]]); } x = a[2]; y = a[3]; }
      else if (c === 'Z') { if (Math.hypot(sx - x, sy - y) > 0.01) seg(sx, sy); cur.closed = true; }
    }
    SMP.set(d, s); return s;
  }
  // variable-width ink around a polyline: pressure noise, tapered ends, slight wobble
  function inkPoly(pts, w, closed, seed, taper) {
    const n = pts.length; if (n < 2) return null; const A = [], B = [];
    for (let i = 0; i < n; i++) {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const t = i / (n - 1);
      let k = closed ? 1 : taper ? Math.min(1, Math.pow(Math.sin(Math.PI * t), 0.55) * 1.25) : Math.min(1, 0.4 + Math.min(t, 1 - t) * 9);
      k *= 0.7 + 0.6 * P.noise(i * 0.12 + seed * 7.3, seed * 1.9);
      const hw = Math.max(0.001, (w * k) / 2), wob = (P.noise(i * 0.05 + seed * 3.1, 7.7) - 0.5) * w * 0.5, px = pts[i][0] - dy * wob, py = pts[i][1] + dx * wob;
      A.push([px - dy * hw, py + dx * hw]); B.push([px + dy * hw, py - dx * hw]);
    }
    const p = new Path2D(); p.moveTo(A[0][0], A[0][1]); for (let i = 1; i < n; i++) p.lineTo(A[i][0], A[i][1]);
    if (closed) { p.closePath(); p.moveTo(B[0][0], B[0][1]); for (let i = 1; i < n; i++) p.lineTo(B[i][0], B[i][1]); p.closePath(); }
    else { for (let i = n - 1; i >= 0; i--) p.lineTo(B[i][0], B[i][1]); p.closePath(); }
    return p;
  }
  let LW = 0.6;
  function inkD(ctx, d, w, col, taper = false) {
    const key = d + '|' + w.toFixed(3) + (taper ? 't' : ''); let polys = INK.get(key);
    if (!polys) { const sd = P.seedOf(d) % 997; polys = samples(d).map((sp, i) => ({ p: inkPoly(sp, w, sp.closed, sd + i * 13, taper), c: sp.closed })).filter((q) => q.p); INK.set(key, polys); }
    ctx.fillStyle = col; for (const q of polys) ctx.fill(q.p, q.c ? 'evenodd' : 'nonzero');
  }
  const lineOf = (fill) => P.css(P.mix(fill, '#22130b', 0.72));
  // a cel-painted part: flat fill, clipped shadow and light shapes, inked outline
  function part(ctx, d, fill, o = {}) {
    const p = p2d(d); ctx.fillStyle = fill; ctx.fill(p);
    const extra = (o.sh || []).concat(o.hi || []);
    if (extra.length) { ctx.save(); ctx.clip(p); for (const [sd, sc] of extra) { ctx.fillStyle = sc; ctx.fill(p2d(sd)); } ctx.restore(); }
    if (o.line !== false) inkD(ctx, d, o.w ?? LW, o.lc || lineOf(fill));
  }
  const strokeD = (ctx, d, w, col) => inkD(ctx, d, w, col, true);
  const blush = (ctx, x, y, r, a = 0.42) => { ctx.fillStyle = P.rg(ctx, x, y, 0, r, [[0, `rgba(242,128,116,${a})`], [1, 'rgba(242,128,116,0)']]); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const blinkAt = (t, s) => ((t + s * 1.37) % 4.3) < 0.13, blink = blinkAt;
  const E = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); };
  const footShadow = (ctx, rx, ry, a = 0.24) => { ctx.fillStyle = `rgba(30,22,46,${a})`; ctx.beginPath(); ctx.ellipse(0, 0.4, rx, ry, 0, 0, TAU); ctx.fill(); };
  const setLW = (u, s, k = 1) => { LW = (clamp(1.05 + 0.5 * s, 0.85, 2.1) * k) / u; };
  function joints(S, sx, a1, a2, L1, L2) { const q1 = -sx * a1, E = [S[0] - Math.sin(q1) * L1, S[1] + Math.cos(q1) * L1], q2 = q1 - sx * a2; return [E, [E[0] - Math.sin(q2) * L2, E[1] + Math.cos(q2) * L2]]; }

  // ------------------------------------------------- bending sleeve + hand
  function sleeve(ctx, S, E, Wr, ws, col, colS, o = {}) {
    const qx = 2 * E[0] - (S[0] + Wr[0]) / 2, qy = 2 * E[1] - (S[1] + Wr[1]) / 2, N = 28, C = [], Nr = [], Wd = [];
    for (let i = 0; i <= N; i++) { const t = i / N, m = 1 - t; C.push([m * m * S[0] + 2 * m * t * qx + t * t * Wr[0], m * m * S[1] + 2 * m * t * qy + t * t * Wr[1]]); }
    for (let i = 0; i <= N; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(N, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const t = i / N; Nr.push([-dy, dx]); Wd.push((t < 0.5 ? lerp(ws[0], ws[1], t * 2) : lerp(ws[1], ws[2], (t - 0.5) * 2)) / 2 * (1 + 0.04 * Math.sin(t * 9 + S[0])));
    }
    const dir = [C[N][0] - C[N - 4][0], C[N][1] - C[N - 4][1]], dl = Math.hypot(dir[0], dir[1]) || 1, ang = Math.atan2(-dir[0], dir[1]);
    if (o.hand) { ctx.save(); ctx.translate(Wr[0] - (dir[0] / dl) * ws[2] * 0.18, Wr[1] - (dir[1] / dl) * ws[2] * 0.18); ctx.rotate(ang); if (o.mirror) ctx.scale(-1, 1); if (o.hs) ctx.scale(o.hs, o.hs); o.hand(ctx); ctx.restore(); }
    const Lp = C.map((c, i) => [c[0] - Nr[i][0] * Wd[i], c[1] - Nr[i][1] * Wd[i]]), Rp = C.map((c, i) => [c[0] + Nr[i][0] * Wd[i], c[1] + Nr[i][1] * Wd[i]]);
    const d0 = [C[1][0] - C[0][0], C[1][1] - C[0][1]], aR = Math.atan2(Nr[0][1], Nr[0][0]);
    let dA = Math.atan2(-d0[1], -d0[0]) - aR; while (dA > Math.PI) dA -= TAU; while (dA < -Math.PI) dA += TAU; const sg = dA >= 0 ? 1 : -1;
    const poly = Lp.concat(Rp.slice().reverse()); for (let k = 1; k < 12; k++) { const a = aR + (sg * Math.PI * k) / 12; poly.push([C[0][0] + Math.cos(a) * Wd[0], C[0][1] + Math.sin(a) * Wd[0]]); }
    const path = new Path2D(); poly.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]))); path.closePath();
    ctx.fillStyle = col; ctx.fill(path);
    const h = N >> 1, ss = Nr[h][0] * LIGHT[0] + Nr[h][1] * LIGHT[1] < 0 ? 1 : -1;
    const sh = new Path2D();
    for (let i = 0; i <= N; i++) { const q = [C[i][0] + Nr[i][0] * Wd[i] * ss * 1.1, C[i][1] + Nr[i][1] * Wd[i] * ss * 1.1]; i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1]); }
    for (let i = N; i >= 0; i--) { const k = -0.05 + 0.32 * Math.sin((i / N) * Math.PI); sh.lineTo(C[i][0] - Nr[i][0] * Wd[i] * ss * k, C[i][1] - Nr[i][1] * Wd[i] * ss * k); }
    sh.closePath(); ctx.save(); ctx.clip(path); ctx.fillStyle = colS; ctx.fill(sh); ctx.restore();
    const lc = lineOf(col), seed = (Math.abs(S[0] * 13 + S[1] * 7) | 0) % 97;
    const ip = inkPoly(poly, LW, true, seed, false); ctx.fillStyle = lc; ctx.fill(ip, 'evenodd');
    // elbow creases on the inside of the bend, and the cuff seam
    const M = [(S[0] + Wr[0]) / 2 - E[0], (S[1] + Wr[1]) / 2 - E[1]], ins = Nr[h][0] * M[0] + Nr[h][1] * M[1] > 0 ? 1 : -1, bent = Math.hypot(M[0], M[1]) > 0.6;
    for (const [t, k] of bent ? [[0.42, 0.55], [0.5, 0.7], [0.58, 0.5]] : [[0.5, 0.4]]) {
      const i = Math.round(t * N), base = C[i], nn = Nr[i], w = Wd[i], pts = [];
      for (let j = 0; j <= 6; j++) { const f = j / 6, along = (f - 0.5) * 1.2; pts.push([base[0] + nn[0] * w * ins * (1 - f * k) + (C[Math.min(N, i + 1)][0] - C[i][0]) * along, base[1] + nn[1] * w * ins * (1 - f * k) + (C[Math.min(N, i + 1)][1] - C[i][1]) * along]); }
      const cp = inkPoly(pts, LW * 0.7, false, seed + i, true); ctx.fillStyle = lc; ctx.fill(cp);
    }
    const ci = Math.round(0.86 * N), cpts = []; for (let j = 0; j <= 8; j++) { const f = j / 8 - 0.5; cpts.push([C[ci][0] + Nr[ci][0] * Wd[ci] * f * 2 * 0.92 + (dir[0] / dl) * 0.5 * (1 - 4 * f * f), C[ci][1] + Nr[ci][1] * Wd[ci] * f * 2 * 0.92 + (dir[1] / dl) * 0.5 * (1 - 4 * f * f)]); }
    const cp = inkPoly(cpts, LW * 0.75, false, seed + 5, true); ctx.fillStyle = lc; ctx.fill(cp);
  }
  const HAND = {
    relax: 'M -2.0 -0.6 C -2.6 0.8 -2.9 3.0 -2.5 4.6 C -2.1 5.9 -0.9 6.5 0.2 6.4 C 1.4 6.3 2.4 5.5 2.6 4.3 C 2.8 2.9 2.6 1.0 2.0 -0.6 Z',
    relaxSh: 'M 0.6 -1 C 1.6 1 1.8 3.6 1 6.6 L 3.4 6.6 L 3.4 -1 Z',
    thumb: 'M 1.5 0.6 C 2.9 0.9 3.7 2.2 3.3 3.4 C 3.0 4.2 2.2 4.2 1.8 3.5 C 1.6 2.8 1.5 1.7 1.5 0.6 Z',
    fingers: 'M -1.0 3.9 L -1.1 5.9 M 0.3 4.1 L 0.3 6.2 M 1.5 3.8 L 1.6 5.6',
    fist: 'M -2.3 -0.4 C -3.0 1.2 -3.1 3.6 -2.5 5.0 C -1.7 6.3 1.7 6.3 2.5 5.0 C 3.1 3.6 3.0 1.2 2.3 -0.4 Z',
    knuckle: 'M -1.9 4.3 C -1.0 5.0 1.0 5.0 1.9 4.3 M -0.6 4.8 L -0.7 5.8 M 0.7 4.8 L 0.7 5.8',
    open: 'M -2.0 -0.4 C -2.3 1.2 -2.6 2.6 -3.4 4.0 C -3.9 4.9 -3.0 5.5 -2.5 4.8 L -1.9 3.9 C -2.1 5.4 -1.9 6.8 -1.3 7.0 C -0.7 7.2 -0.5 6.4 -0.5 5.4 L -0.3 4.4 C -0.1 6.0 0.3 7.2 0.9 7.2 C 1.5 7.2 1.5 6.2 1.3 5.0 L 1.3 4.2 C 1.7 5.4 2.3 6.2 2.9 6.0 C 3.3 5.8 3.1 5.0 2.7 4.0 C 2.5 3.0 2.5 1.4 2.1 -0.4 Z',
    adult: 'M -1.6 -0.4 C -2.1 1.4 -2.3 4.0 -1.9 6.0 C -1.5 7.6 -0.4 8.4 0.6 8.2 C 1.6 8.0 2.2 7.0 2.2 5.6 C 2.2 3.6 2.0 1.4 1.6 -0.4 Z',
    adultSh: 'M 0.4 -1 C 1.2 2 1.4 5 0.8 8.6 L 3 8.6 L 3 -1 Z',
    adultThumb: 'M 1.2 0.8 C 2.4 1.2 3.0 2.6 2.6 4.0 C 2.3 4.8 1.6 4.6 1.4 3.8 C 1.3 2.8 1.2 1.8 1.2 0.8 Z',
    adultFingers: 'M -0.8 5.4 L -0.9 7.8 M 0.6 5.6 L 0.6 8.0 M 1.6 5.2 L 1.7 7.2',
  };
  function handFn(kind, skin, skinS, item) {
    return (ctx) => {
      const w = LW * 0.85, lc = lineOf(skin);
      if (kind === 'open') { part(ctx, HAND.open, skin, { w, lc, sh: [[HAND.relaxSh, skinS]] }); part(ctx, 'M 1.6 0.4 C 3.0 0.4 4.2 1.4 4.0 2.6 C 3.8 3.4 2.8 3.2 2.2 2.6 C 1.9 2.0 1.7 1.2 1.6 0.4 Z', skin, { w, lc }); }
      else if (kind === 'fist') { part(ctx, HAND.fist, skin, { w, lc, sh: [[HAND.relaxSh, skinS]] }); strokeD(ctx, HAND.knuckle, w * 0.7, lc); part(ctx, HAND.thumb, skin, { w, lc }); }
      else if (kind === 'adult') { part(ctx, HAND.adult, skin, { w, lc, sh: [[HAND.adultSh, skinS]] }); strokeD(ctx, HAND.adultFingers, w * 0.6, lc); part(ctx, HAND.adultThumb, skin, { w, lc }); }
      else { part(ctx, HAND.relax, skin, { w, lc, sh: [[HAND.relaxSh, skinS]] }); strokeD(ctx, HAND.fingers, w * 0.6, lc); part(ctx, HAND.thumb, skin, { w, lc }); }
      if (item) item(ctx);
    };
  }

  // =====================================================================
  // 小芽 Xiaoya — 5 years old: black bob, yellow raincoat, red rubber boots
  // =====================================================================
  const GIRL = { skin: '#fbe2cd', skinS: '#eeb999', hair: '#2a2224', hairS: '#16110f', hairH: '#5a4f60', coat: '#f0c04a', coatS: '#cf923a', coatL: '#fbe192', boot: '#c8392e', bootS: '#8e2822', bootL: '#e2684f', sole: '#4e2620', toggle: '#8a5a33', leg: '#fbe2cd', legS: '#eeb999' };
  const PJ = { coat: '#a9cbe8', coatS: '#7da2c9', coatL: '#d8eaf8', boot: '#f2a8b5', bootS: '#cf7f8c', bootL: '#fbd0d8', sole: '#a85868', toggle: '#ffffff' };
  const G = {
    hairBack: 'M -12.2 -71.6 C -13.6 -75 -14.4 -79.6 -14.2 -84.4 C -14 -91.6 -10.4 -97.8 -3.8 -99.4 C 1.4 -100.6 7.6 -99.2 11.2 -95.2 C 14 -92 14.8 -87.4 14.6 -83.6 C 14.4 -79.2 13.8 -75 12.4 -71.6 C 11.6 -70.6 10.6 -70.9 9.8 -71.6 C 9.2 -70.9 8.4 -70.9 7.8 -71.8 L -7.8 -71.8 C -8.4 -70.9 -9.2 -70.9 -9.8 -71.6 C -10.6 -70.9 -11.6 -70.6 -12.2 -71.6 Z',
    hairBackSh: 'M 4 -100.4 C 10.6 -98.6 14.8 -92.6 14.8 -84 C 14.8 -79 14 -75 12.6 -71.2 L 17 -71 L 17 -101 Z',
    face: 'M -10.4 -87.5 C -11.4 -84.6 -11.9 -80.6 -11 -77.4 C -10.1 -74.4 -7.4 -72.2 -3.8 -71.4 C -1.4 -70.9 1.4 -70.9 3.8 -71.4 C 7.4 -72.2 10.1 -74.4 11 -77.4 C 11.9 -80.6 11.4 -84.6 10.4 -87.5 Z',
    faceSh: 'M 9.2 -87.6 C 11 -83.6 11.2 -78.6 9.8 -75.2 C 8.8 -73 7 -71.8 5.2 -71.2 C 8 -73.6 9.4 -77 9.4 -80.6 C 9.4 -83 9.2 -85.4 8.6 -87.6 Z',
    lock: 'M -11.6 -86.2 C -12.8 -82 -12.9 -77 -12.2 -72.6 C -12 -71.4 -11.6 -70.6 -11.2 -71.4 C -10.9 -70.4 -10.4 -70.6 -10.2 -71.4 C -9.9 -70.8 -9.4 -70.9 -9.2 -71.8 C -9.7 -76 -9.9 -80.6 -9.5 -84.8 Z',
    lockSh: 'M -10.6 -86 C -11.2 -80 -10.8 -75 -9.6 -71 L -8.6 -71 L -8.6 -86 Z',
    bangs: 'M -11.6 -84.2 C -11.8 -91.4 -7.6 -96.6 -0.6 -96.8 C 6.6 -97 11.6 -92 11.8 -84.4 C 11.2 -84 10.6 -83.8 10 -84.2 C 9.4 -83.4 8.6 -83.3 8 -83.8 L 7.6 -85.1 C 6.8 -84 5.6 -83.6 4.6 -83.9 C 4 -83.4 3 -83.3 2.4 -83.8 L 2.1 -85 C 1.2 -84 0 -83.7 -1 -84 C -1.8 -83.4 -2.8 -83.4 -3.4 -84 L -3.8 -85 C -4.6 -84 -5.8 -83.6 -6.8 -83.9 C -7.6 -83.4 -8.6 -83.4 -9.2 -84 L -9.6 -85 C -10.2 -84.2 -10.9 -84 -11.6 -84.2 Z',
    bangsSh: 'M 3.6 -96.8 C 8.6 -95.6 11.6 -91.4 11.8 -84.4 L 13 -84 L 13 -98 Z',
    sheen: 'M -9.4 -90.8 C -8.6 -92.6 -7.2 -93.8 -5.6 -94.6 C -6.6 -93.4 -7.6 -92.2 -8.4 -90.8 C -8.8 -90.2 -9.2 -90.2 -9.4 -90.8 Z M -4.6 -95 C -3.4 -95.6 -2.2 -95.8 -0.8 -95.8 C -2 -95.4 -3 -95 -4 -94.4 C -4.4 -94.2 -4.8 -94.6 -4.6 -95 Z M 1 -95.8 C 2.2 -95.8 3.4 -95.6 4.4 -95.2 C 3.2 -95.2 2.2 -95.2 1.2 -95.4 Z',
    strands: 'M -1.2 -96.2 C -2.4 -92.6 -3.2 -89 -3.6 -85.6 M 3.2 -95.8 C 4.2 -92.4 4.8 -89 5 -85.8 M -6.2 -94 C -7.6 -91 -8.2 -88 -8.4 -85.4 M 8.2 -93.4 C 9.4 -90.6 10 -88 10.2 -85.6 M -13.2 -86 C -13.6 -81 -13.4 -76 -12.6 -72.6 M 13.4 -86 C 13.8 -81 13.6 -76 12.8 -72.8 M -11 -80 C -11.2 -77 -11 -74.6 -10.6 -72.4 M 11.2 -80 C 11.4 -77 11.2 -74.6 10.8 -72.4',
    eyeW: 'M -7.0 -79.7 C -6.4 -81.6 -2.8 -81.9 -2.0 -80.0 C -2.2 -78.0 -3.6 -77.0 -4.6 -77.0 C -5.8 -77.0 -6.8 -78.0 -7.0 -79.7 Z',
    lid: 'M -7.5 -79.4 C -6.7 -82.0 -2.8 -82.4 -1.8 -80.1',
    flick: 'M -7.3 -79.6 C -7.7 -79.3 -8.0 -79.0 -8.3 -78.7',
    lower: 'M -6.3 -78.0 C -5.8 -77.4 -5.2 -77.1 -4.5 -77.0',
    closed: 'M -7.0 -79.2 C -6.0 -78.0 -3.2 -78.0 -2.0 -79.2',
    joy: 'M -6.8 -78.6 C -5.8 -80.6 -3.2 -80.6 -2.2 -78.6',
    browFirm: 'M -7.4 -85.6 C -5.8 -85.2 -4.2 -84.6 -2.6 -83.8',
    browSad: 'M -7.0 -84.0 C -5.6 -84.6 -4.2 -85.2 -2.8 -85.8',
    nose: 'M 0.1 -76.3 C 0.6 -75.8 0.8 -75.3 0.4 -74.9',
    smile: 'M -1.7 -73.5 C -0.7 -72.6 0.8 -72.6 1.8 -73.6',
    open: 'M -2.0 -73.7 C -1.7 -71.2 1.7 -71.2 2.0 -73.7 C 0.8 -73.2 -0.8 -73.2 -2.0 -73.7 Z',
    tongue: 'M -1.1 -72.0 C -0.6 -71.4 0.6 -71.4 1.1 -72.0 C 0.4 -72.5 -0.4 -72.5 -1.1 -72.0 Z',
    oh: 'M -0.8 -73.0 C -0.8 -71.6 0.8 -71.6 0.8 -73.0 C 0.8 -74.2 -0.8 -74.2 -0.8 -73.0 Z',
    firm: 'M -1.8 -73.0 C -0.6 -73.4 0.6 -73.4 1.8 -73.0',
    sad: 'M -1.6 -72.5 C -0.6 -73.5 0.6 -73.5 1.6 -72.5',
    tear: 'M -6.2 -77.2 C -6.6 -76.2 -6.8 -75.4 -6.4 -75.0 C -6.0 -74.7 -5.6 -75.2 -5.8 -76.0 C -5.9 -76.4 -6.0 -76.8 -6.2 -77.2 Z',
    hairB: 'M -13.6 -72 C -14.8 -77 -15 -84 -14.4 -88 C -13.4 -95.6 -7.4 -100 0 -100 C 7.4 -100 13.4 -95.6 14.4 -88 C 15 -84 14.8 -77 13.6 -72 C 12.8 -70.8 11.8 -71.2 11.2 -72 C 10.4 -70.8 9.2 -70.8 8.6 -71.8 C 7.6 -70.6 6.2 -70.6 5.4 -71.6 C 4.2 -70.4 2.6 -70.4 1.6 -71.4 C 0.4 -70.2 -1.2 -70.2 -2.2 -71.4 C -3.2 -70.4 -4.8 -70.4 -5.8 -71.6 C -6.6 -70.6 -8 -70.6 -8.8 -71.8 C -9.6 -70.8 -10.8 -70.8 -11.4 -72 C -12 -71.2 -13 -71.2 -13.6 -72 Z',
    hairBSh: 'M 2 -100 C 9 -99 14 -94 14.6 -86 C 15 -80 14.4 -75 13.6 -71.6 L 18 -71 L 18 -101 Z',
    sheenB: 'M -10.6 -90 C -8.6 -95.6 -3.4 -98.4 2.4 -98 C -2.4 -97 -6.6 -94.6 -9 -90.2 C -9.6 -89.2 -10.4 -89.2 -10.6 -90 Z',
    strandsB: 'M -6 -98 C -8.6 -92 -9.6 -84 -9.4 -73.4 M -1.4 -99.6 C -2.4 -92 -2.6 -83 -2.2 -72.4 M 4.4 -99 C 5.8 -92 6.4 -83 6.2 -72.8 M 9.6 -96 C 11.4 -90 12 -82 11.6 -73.2',
  };
  const GB = {
    bootL: 'M -9.5 -14.4 C -9.3 -10.6 -9.1 -7.6 -9.3 -5.2 C -10.5 -3.8 -11 -1.8 -10.4 -0.3 C -9.6 0.9 -2.6 0.9 -1.6 -0.3 C -0.9 -1.6 -1.2 -3.8 -2.2 -5.2 C -2.4 -7.6 -2.2 -10.6 -1.9 -14.4 Z',
    bootLSh: 'M -4.8 -14.6 C -4.6 -10 -4.4 -6.4 -4.6 -4.4 C -4.4 -2.2 -4.6 -0.6 -5.2 1.2 L 0.4 1.2 L 0.4 -14.6 Z',
    bootRSh: 'M 6.8 -14.6 C 7 -10 7.2 -6.4 7 -4.4 C 7.2 -2.2 7 -0.6 6.4 1.2 L 11.6 1.2 L 11.6 -14.6 Z',
    bootHi: 'M -8.1 -12.4 C -8.1 -9.8 -8 -7.4 -8.2 -5.6 C -7.6 -7.4 -7.4 -9.8 -7.4 -12.4 Z M -9.2 -2.6 C -8.4 -3.4 -7 -3.6 -6 -3.4 C -7 -3.0 -8.2 -2.6 -9.2 -2.6 Z',
    rimL: 'M -10.1 -14.4 C -9.8 -12.8 -1.9 -12.8 -1.4 -14.4 C -1.7 -16 -9.8 -16 -10.1 -14.4 Z',
    soleL: 'M -10.6 -0.9 C -10.4 0.6 -9.2 1.2 -6 1.2 C -3 1.2 -1.6 0.6 -1.3 -0.9 C -4 -0.2 -8 -0.2 -10.6 -0.9 Z',
    legL: 'M -8 -23.4 C -8.3 -20 -8.2 -16.8 -7.8 -13.8 L -3.4 -13.8 C -3 -16.6 -2.8 -19.8 -3 -23.4 Z',
    legLSh: 'M -5.2 -23.6 C -5 -20 -4.9 -17 -4.7 -13.6 L -2 -13.6 L -2 -23.6 Z',
    legRSh: 'M 6.2 -23.6 C 6.4 -20 6.5 -17 6.6 -13.6 L 9 -13.6 L 9 -23.6 Z',
    coat: 'M -5.6 -67.6 C -9 -67.2 -12 -65.8 -13.2 -63.2 C -14.2 -58.4 -15 -52.6 -16.4 -45.4 C -18 -37.6 -20 -29.6 -21.6 -23.8 C -18.8 -21.8 -15.4 -22.6 -12.6 -21.6 C -9.6 -20.6 -6.4 -21.8 -3.4 -21.2 C -0.4 -20.6 2.6 -21.8 5.6 -21.2 C 8.8 -20.6 12 -21.8 14.6 -21.4 C 17.2 -21 19.6 -22.4 21.6 -23.8 C 20 -29.6 18 -37.6 16.4 -45.4 C 15 -52.6 14.2 -58.4 13.2 -63.2 C 12 -65.8 9 -67.2 5.6 -67.6 C 2 -66.6 -2 -66.6 -5.6 -67.6 Z',
    coatSh: 'M 6.6 -66.6 C 10.6 -62 12.2 -55 12 -47 C 11.8 -39 10.6 -31 9.6 -21 L 24 -21 L 24 -68 Z M -13.6 -21.6 C -13.2 -25.4 -12.6 -28.2 -11.8 -30.8 C -11.8 -27.8 -11.8 -24.6 -11.4 -21.4 Z M -4.2 -21.2 C -4 -23.8 -3.6 -25.6 -3.2 -27.2 C -3 -25 -2.8 -23 -2.6 -21 Z M -12.6 -64.8 C -6 -61.8 6 -61.8 12.6 -64.8 L 12.8 -62.6 C 6 -59.8 -6 -59.8 -12.8 -62.6 Z',
    coatHi: 'M -14.2 -60 C -15.2 -52 -17 -40 -20 -25 L -18.4 -25 C -15.8 -40 -14.4 -52 -13.2 -60 Z',
    placket: 'M 0.2 -66.6 C 0.4 -52 0.6 -36 0.8 -21.2',
    flapEdge: 'M 2.2 -66.2 C 2.5 -52 2.7 -36 2.9 -21.4',
    folds: 'M -11.2 -58.4 C -10.2 -56.2 -9 -55 -7.6 -54.2 M 11.2 -58.4 C 10.2 -56.2 9 -55 7.6 -54.2 M -12.6 -21.8 C -12.4 -25.6 -11.8 -28.4 -11.2 -31 M -3.4 -21.4 C -3.4 -24 -3.2 -26 -3 -27.6 M 5.6 -21.4 C 5.8 -24.6 6 -27 6.4 -29.4 M 14.6 -21.6 C 14.2 -25 13.6 -27.6 13 -30',
    pocketL: 'M -14.8 -37.4 C -12.2 -36.6 -8.8 -36.6 -6.2 -37.6 L -6.5 -34.8 C -8.9 -34 -12.3 -34 -14.4 -34.8 Z',
    pocketSh: 'M -15 -35.8 C -12 -35 -9 -35 -6 -36 L -6 -34 L -15 -34 Z',
    toggle: 'M -0.4 -0.9 C -1.5 -0.9 -1.5 0.9 -0.4 0.9 L 3.4 0.9 C 4.5 0.9 4.5 -0.9 3.4 -0.9 Z',
    cord: 'M -0.2 0 C -1.4 -0.6 -2.6 -0.5 -3.4 0.3',
    hood: 'M -12.9 -65.4 C -14.4 -70.6 -9.6 -74 0 -73.8 C 9.6 -74 14.4 -70.6 12.9 -65.4 C 8.6 -63.4 -8.6 -63.4 -12.9 -65.4 Z',
    hoodSh: 'M -10.8 -70.4 C -6 -73.2 6 -73.2 10.8 -70.4 C 6 -71.8 -6 -71.8 -10.8 -70.4 Z M 6 -73.6 C 10 -73 13.4 -70.4 12.9 -65.4 L 15 -65 L 15 -75 Z',
    neck: 'M -3.3 -72.8 C -3.3 -70.6 -3.5 -69 -3.7 -67.6 L 3.7 -67.6 C 3.5 -69 3.3 -70.6 3.3 -72.8 Z',
    hoodB: 'M -10.6 -66.2 C -12.6 -60.2 -11.6 -52.6 -6.6 -49.4 C -3.6 -47.6 3.6 -47.6 6.6 -49.4 C 11.6 -52.6 12.6 -60.2 10.6 -66.2 C 6 -64.6 -6 -64.6 -10.6 -66.2 Z',
    hoodBSh: 'M 3 -66 C 8 -62 9.6 -56 7.2 -50.4 L 14 -50 L 14 -67 Z',
    hoodBFolds: 'M -6.4 -63.6 C -5.2 -58.4 -3.6 -54.4 -1.6 -51.6 M 6.2 -63.6 C 5 -58.4 3.6 -54.6 1.8 -51.8 M -2 -64.4 C -1.2 -60.4 -0.6 -57.4 0.2 -55',
    seamB: 'M 0.2 -49 C 0.4 -40 0.6 -30 0.8 -21.2',
    // crouching
    cBootL: 'M -14.2 -0.4 C -14.8 -3.2 -13.9 -6.8 -12 -8.2 L -6.4 -8.2 C -5.1 -6.6 -4.9 -3.2 -5.7 -0.4 C -8.1 0.6 -12.1 0.6 -14.2 -0.4 Z',
    cBootLSh: 'M -9.2 -8.4 C -8.4 -5 -8.6 -2.4 -9.2 0.8 L -4 0.8 L -4 -8.4 Z',
    cBootRSh: 'M 9.6 -8.4 C 10.2 -5 10.2 -2.4 9.8 0.8 L 15 0.8 L 15 -8.4 Z',
    cGap: 'M -7 -8.6 C -3 -10.6 3 -10.6 7 -8.6 L 6 -2.4 C 2 -1.4 -2 -1.4 -6 -2.4 Z',
    cCoat: 'M -5.4 -46.6 C -9 -46.2 -12 -44.8 -13.4 -42 C -15.6 -36 -19.6 -28 -22.4 -20 C -23.8 -15.6 -23.6 -10 -21.6 -6.4 C -18.4 -4.2 -14 -5 -10.6 -6 C -7.6 -7 -4.8 -8.6 -2.2 -9.2 C -0.8 -9.4 0.8 -9.4 2.2 -9.2 C 4.8 -8.6 7.6 -7 10.6 -6 C 14 -5 18.4 -4.2 21.6 -6.4 C 23.6 -10 23.8 -15.6 22.4 -20 C 19.6 -28 15.6 -36 13.4 -42 C 12 -44.8 9 -46.2 5.4 -46.6 C 2 -45.6 -2 -45.6 -5.4 -46.6 Z',
    cCoatSh: 'M 5.6 -45.6 C 10 -40 13 -30 14.6 -20 C 15.6 -13 15.4 -8.6 14 -5.4 L 25 -5 L 25 -47 Z M -12.6 -44 C -6 -41.4 6 -41.4 12.6 -44 L 12.8 -42 C 6 -39.4 -6 -39.4 -12.8 -42 Z',
    cCoatHi: 'M -14.2 -40 C -17 -33 -20.6 -24 -21.8 -16 L -20.2 -16 C -18.6 -24 -15.6 -33 -13 -40 Z',
    cFolds: 'M -20.6 -16.4 C -18.4 -20.6 -13.4 -21.8 -10 -19.6 M 20.6 -16.4 C 18.4 -20.6 13.4 -21.8 10 -19.6 M -6.6 -38 C -6.2 -32 -5.4 -26 -4 -20.6 M 6.6 -38 C 6.2 -32 5.4 -26 4 -20.6 M 0.2 -45.6 C 0.4 -36 0.4 -24 0.2 -10',
    // sitting, hugging knees
    sCoat: 'M -5.2 -45.4 C -8.8 -45 -11.8 -43.6 -13.2 -41 C -15 -34 -17.8 -24 -19.8 -14 C -21 -8 -21.4 -3.4 -20.6 -1.6 C -14 -0.6 -8 -0.8 -6.6 -1.2 L 6.6 -1.2 C 8 -0.8 14 -0.6 20.6 -1.6 C 21.4 -3.4 21 -8 19.8 -14 C 17.8 -24 15 -34 13.2 -41 C 11.8 -43.6 8.8 -45 5.2 -45.4 C 2 -44.4 -2 -44.4 -5.2 -45.4 Z',
    sCoatSh: 'M 5 -44.6 C 10 -38 13.6 -26 15.4 -14 C 16.2 -8 16.2 -4 15.6 -1 L 23 -1 L 23 -46 Z',
    sShinL: 'M -7.6 -27.4 C -7.8 -18 -7.6 -10 -7.2 -4.6 L -2 -4.6 C -1.6 -10 -1.4 -18 -1.6 -27.4 Z',
    sShinSh: 'M -4.4 -28 C -4.4 -18 -4.2 -10 -4 -4 L -1 -4 L -1 -28 Z',
    sKneeL: 'M -7.9 -27.4 C -7.9 -31.8 -1.3 -31.8 -1.3 -27.4 C -1.3 -25.4 -7.9 -25.4 -7.9 -27.4 Z',
    sBootL: 'M -8.9 -6.4 C -9.3 -3.6 -9.1 -1 -7.7 0.4 L -1.3 0.4 C -0.5 -1 -0.7 -3.6 -1.1 -6.4 Z',
  };

  function girlEyes(ctx, t, expr, seed) {
    const closed = blinkAt(t, seed) && expr !== 'sad' && expr !== 'joy';
    for (const m of [0, 1]) {
      const D = (d) => { const e = sc(d, -4.5, -79.5, 0.88); return m ? mx(e) : e; };
      if (expr === 'joy') { strokeD(ctx, D(G.joy), 0.9, '#2a1812'); continue; }
      if (closed) { strokeD(ctx, D(G.closed), 0.85, '#2a1812'); continue; }
      const ew = p2d(D(G.eyeW)); ctx.fillStyle = '#fffaf3'; ctx.fill(ew);
      ctx.save(); ctx.clip(ew);
      const ex = m ? 4.3 : -4.3, ey = -79.3 + (expr === 'sad' ? 0.6 : 0) + (expr === 'o' ? 0.25 : 0);
      ctx.fillStyle = P.lg(ctx, 0, ey - 2.2, 0, ey + 2.2, ['#1c120e', '#352218', '#6c4430']); ctx.beginPath(); ctx.ellipse(ex, ey, 1.5, 1.98, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(70,40,30,0.28)'; ctx.fillRect(ex - 4, -82.5, 8, 1.6);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex + 0.5, ey - 0.75, 0.55, 0.6, 0, 0, TAU); ctx.fill();
      ctx.restore();
      strokeD(ctx, D(G.lid), 0.9, '#21130d'); strokeD(ctx, D(G.flick), 0.4, '#21130d');
      if (expr === 'sad') part(ctx, D(G.tear), 'rgba(205,232,255,0.9)', { w: 0.18, lc: 'rgba(120,160,200,0.8)' });
    }
    if (expr === 'firm' || expr === 'sad') for (const m of [0, 1]) strokeD(ctx, m ? mx(expr === 'firm' ? G.browFirm : G.browSad) : expr === 'firm' ? G.browFirm : G.browSad, 0.62, '#2a1812');
  }
  function girlHead(ctx, t, p, back, expr, seed) {
    if (back) {
      part(ctx, G.hairB, p.hair, { sh: [[G.hairBSh, p.hairS]], hi: [[G.sheenB, P.css(p.hairH, 0.85)]] });
      strokeD(ctx, G.strandsB, LW * 0.6, P.css(p.hairH, 0.9)); return;
    }
    part(ctx, G.hairBack, p.hair, { sh: [[G.hairBackSh, p.hairS]] });
    part(ctx, G.face, p.skin, { sh: [[G.faceSh, p.skinS], [tr(G.bangs, 0, 1.5), p.skinS]] });
    blush(ctx, -7.1, -75.8, 2.9); blush(ctx, 7.1, -75.8, 2.9);
    girlEyes(ctx, t, expr, seed);
    strokeD(ctx, G.nose, 0.36, '#c4826e');
    if (expr === 'open' || expr === 'joy') { part(ctx, G.open, '#8c3830', { w: 0.32, lc: '#5a2018' }); part(ctx, G.tongue, '#e4877c', { line: false }); }
    else if (expr === 'o') part(ctx, G.oh, '#8c3830', { w: 0.3, lc: '#5a2018' });
    else strokeD(ctx, expr === 'firm' ? G.firm : expr === 'sad' ? G.sad : G.smile, 0.5, '#7e3a30');
    part(ctx, G.lock, p.hair, { sh: [[G.lockSh, p.hairS]] }); part(ctx, mx(G.lock), p.hair, { sh: [[mx(G.lockSh), p.hairS]] });
    part(ctx, G.bangs, p.hair, { sh: [[G.bangsSh, p.hairS]], hi: [[G.sheen, P.css(p.hairH, 0.9)]] });
    strokeD(ctx, G.strands, LW * 0.55, P.css(p.hairH, 0.85));
    if (expr === 'firm' || expr === 'sad') for (const m of [0, 1]) strokeD(ctx, m ? mx(expr === 'firm' ? G.browFirm : G.browSad) : expr === 'firm' ? G.browFirm : G.browSad, 0.62, '#4a3a3a');
  }
  function crayon(col) { return (ctx) => { ctx.save(); ctx.translate(0.4, 4.4); ctx.rotate(0.5); part(ctx, 'M -0.9 -1 L 0.9 -1 L 0.9 6 L 0 7.6 L -0.9 6 Z', col, { w: 0.25 }); ctx.fillStyle = '#f5f0e0'; ctx.fillRect(-0.9, 1.4, 1.8, 2.4); ctx.restore(); }; }
  function childDrawing(ctx) {
    ctx.save(); ctx.translate(0, -45); ctx.rotate(-0.05);
    part(ctx, 'M -11.4 -8.6 L 11.2 -8.8 L 11.4 7.6 L -11.2 7.8 Z', '#fbf8ef', { w: LW * 0.8 });
    ctx.fillStyle = '#f2b81c'; ctx.beginPath(); ctx.arc(6.6, -4.6, 2.3, 0, TAU); ctx.fill();
    strokeD(ctx, 'M -10 4.6 C -4 2.6 4 2.8 10 5', 0.8, '#4caf50');
    part(ctx, 'M -8.4 4 L -8.4 -0.6 L -5.2 -4 L -2 -0.6 L -2 4 Z', '#e3402d', { w: 0.3, lc: '#a02a1e' });
    strokeD(ctx, 'M 1.6 -1 L 1.6 2.6 M 3.9 -1.6 L 3.9 2.6 M 6.2 -0.6 L 6.2 2.6', 0.5, '#3f6ec4');
    for (const [fx, fy] of [[1.6, -1.6], [3.9, -2.4], [6.2, -1.2]]) { ctx.fillStyle = '#3f6ec4'; ctx.beginPath(); ctx.arc(fx, fy, 0.75, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function girlArms(ctx, t, p, pose, back, list) {
    const S = [[-12.3, -62.4], [12.3, -62.4]];
    for (const [sx, a1, a2, kind, item] of list) {
      const s0 = S[sx > 0 ? 1 : 0], [E, Wr] = joints(s0, sx, a1, a2, 11.8, 10.6);
      sleeve(ctx, s0, E, Wr, [5.4, 4.7, 5.6], p.coat, p.coatS, { hand: handFn(kind, p.skin, p.skinS, item), mirror: sx > 0 });
    }
  }
  function girlStand(ctx, t, p, pose, o, expr) {
    const back = !!o.back, bob = Math.sin(t * 2.2 + (o.seed || 0)) * 0.3;
    footShadow(ctx, 15, 2.6);
    for (const m of [0, 1]) {
      const D = (d) => (m ? mx(d) : d);
      part(ctx, D(GB.legL), p.leg, { sh: [[m ? GB.legRSh : GB.legLSh, p.legS]] });
      part(ctx, D(GB.soleL), p.sole, { line: false });
      part(ctx, D(GB.bootL), p.boot, { sh: [[m ? GB.bootRSh : GB.bootLSh, p.bootS]], hi: [[m ? tr(GB.bootHi, 11.4, 0) : GB.bootHi, 'rgba(255,255,255,0.5)']] });
      part(ctx, D(GB.rimL), p.bootL, { sh: [[m ? 'M 6.4 -16 L 11 -16 L 11 -12 L 6.4 -12 Z' : 'M -4.4 -16 L 0 -16 L 0 -12 L -4.4 -12 Z', p.boot]] });
    }
    ctx.save(); ctx.translate(0, bob);
    if (!back) { part(ctx, GB.hood, p.coat, { sh: [[GB.hoodSh, p.coatS]] }); part(ctx, GB.neck, p.skinS, { w: LW * 0.7 }); }
    part(ctx, GB.coat, p.coat, { sh: [[GB.coatSh, p.coatS]], hi: [[GB.coatHi, p.coatL]] });
    if (o.outfit === 'pajama') { ctx.save(); ctx.clip(p2d(GB.coat)); ctx.fillStyle = 'rgba(255,255,255,0.82)'; for (let yy = -64, r = 0; yy < -20; yy += 4.6, r++) for (let xx = -22 + (r % 2) * 2.3; xx < 22; xx += 4.6) { ctx.beginPath(); ctx.arc(xx, yy, 0.62, 0, TAU); ctx.fill(); } ctx.restore(); }
    strokeD(ctx, GB.folds, LW * 0.62, lineOf(p.coat));
    if (!back) {
      strokeD(ctx, GB.placket, LW * 0.85, lineOf(p.coat)); strokeD(ctx, GB.flapEdge, LW * 0.5, P.css(p.coatS));
      for (const y of [-58, -49, -40]) { ctx.save(); ctx.translate(1.2, y); part(ctx, GB.toggle, p.toggle, { w: LW * 0.7 }); strokeD(ctx, GB.cord, LW * 0.55, '#5a3a20'); ctx.restore(); }
      part(ctx, GB.pocketL, p.coat, { w: LW * 0.8, sh: [[GB.pocketSh, p.coatS]] }); part(ctx, mx(GB.pocketL), p.coat, { w: LW * 0.8, sh: [[mx(GB.pocketSh), p.coatS]] });
    } else { part(ctx, GB.hoodB, p.coat, { sh: [[GB.hoodBSh, p.coatS]] }); strokeD(ctx, GB.hoodBFolds, LW * 0.6, lineOf(p.coat)); strokeD(ctx, GB.seamB, LW * 0.6, lineOf(p.coat)); }
    const osc = Math.sin(t * 7) * 0.32, list = [];
    if (pose === 'arms') list.push([-1, 2.5 + Math.sin(t * 3) * 0.06, -0.35, 'open'], [1, 2.5 + Math.sin(t * 3 + 1) * 0.06, -0.35, 'open']);
    else if (pose === 'wave') { if (o.both) list.push([-1, 2.55 - osc, -0.45 + osc * 0.5, 'open'], [1, 2.55 + osc, -0.45 - osc * 0.5, 'open']); else list.push([-1, 0.2, -0.12, 'relax'], [1, 2.6 + osc, -0.5 - osc * 0.6, 'open']); }
    else if (pose === 'fist') list.push([-1, 0.1, -0.05, 'fist'], [1, 0.1, -0.05, 'fist']);
    else if (pose === 'draw') list.push([-1, 0.22, -0.15, 'relax'], [1, 1.55 + Math.sin(t * 3.2) * 0.35, 0.25, 'fist', crayon('#e3402d')]);
    else if (pose === 'hold') list.push([-1, 0.12, -1.2, 'relax'], [1, 0.12, -1.2, 'relax']);
    else list.push([-1, 0.2, -0.12, 'relax'], [1, 0.2, -0.12, 'relax']);
    if (pose === 'hold') { girlArms(ctx, t, p, pose, back, list); childDrawing(ctx); for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 10.6, -46.5); ctx.rotate(sx * -0.3); if (sx > 0) ctx.scale(-1, 1); handFn('relax', p.skin, p.skinS)(ctx); ctx.restore(); } }
    else girlArms(ctx, t, p, pose, back, list);
    girlHead(ctx, t, p, back, expr, o.seed || 0);
    ctx.restore();
  }
  function girlLow(ctx, t, p, pose, o, expr) {
    const sit = pose === 'sit';
    footShadow(ctx, 22, 3);
    if (sit) {
      part(ctx, GB.sCoat, p.coat, { sh: [[GB.sCoatSh, p.coatS]] });
      for (const m of [0, 1]) { const D = (d) => (m ? mx(d) : d); part(ctx, D(GB.sBootL), p.boot, { sh: [[D('M -4.6 -7 L 0 -7 L 0 1 L -4.6 1 Z'), p.bootS]] }); part(ctx, D(GB.sShinL), p.leg, { sh: [[m ? 'M 5 -28 C 5 -18 5.2 -10 5.4 -4 L 9 -4 L 9 -28 Z' : GB.sShinSh, p.legS]] }); part(ctx, D(GB.sKneeL), p.leg, { sh: [[m ? 'M 5.6 -32 L 9 -32 L 9 -25 L 5.6 -25 Z' : 'M -3.4 -32 L 0 -32 L 0 -25 L -3.4 -25 Z', p.legS]] }); }
      sleeve(ctx, [-12.2, -41], [-12.6, -27], [-0.6, -19.6], [5.2, 4.6, 5.4], p.coat, p.coatS, { hand: handFn('relax', p.skin, p.skinS) });
      sleeve(ctx, [12.2, -41], [12.6, -27.6], [0.8, -21.4], [5.2, 4.6, 5.4], p.coat, p.coatS, { hand: handFn('relax', p.skin, p.skinS), mirror: true });
    } else {
      part(ctx, GB.cGap, '#4a3428', { line: false });
      for (const m of [0, 1]) { const D = (d) => (m ? mx(d) : d); part(ctx, D(GB.cBootL), p.boot, { sh: [[m ? GB.cBootRSh : GB.cBootLSh, p.bootS]] }); }
      part(ctx, GB.cCoat, p.coat, { sh: [[GB.cCoatSh, p.coatS]], hi: [[GB.cCoatHi, p.coatL]] });
      strokeD(ctx, GB.cFolds, LW * 0.6, lineOf(p.coat));
      for (const y of [-38, -30]) { ctx.save(); ctx.translate(1, y); part(ctx, GB.toggle, p.toggle, { w: LW * 0.7 }); ctx.restore(); }
      if (pose === 'ride') { for (const [sx, a1] of [[-1, 2.45], [1, 2.45]]) { const s0 = [sx * 12.4, -41.6], [E, Wr] = joints(s0, sx, a1 + Math.sin(t * 3 + sx) * 0.06, -0.35, 11.8, 10.6); sleeve(ctx, s0, E, Wr, [5.4, 4.7, 5.6], p.coat, p.coatS, { hand: handFn('open', p.skin, p.skinS), mirror: sx > 0 }); } }
      else for (const sx of [-1, 1]) sleeve(ctx, [sx * 12.4, -41.8], [sx * 17.2, -31.4], [sx * 11.6, -22.8], [5.2, 4.6, 5.4], p.coat, p.coatS, { hand: handFn('relax', p.skin, p.skinS), mirror: sx > 0 });
    }
    ctx.save(); ctx.translate(0, sit ? 30 : 21); if (sit) { ctx.translate(0, -72); ctx.rotate(0.05); ctx.translate(0, 72); }
    part(ctx, GB.hood, p.coat, { sh: [[GB.hoodSh, p.coatS]] }); part(ctx, GB.neck, p.skinS, { w: LW * 0.7 });
    girlHead(ctx, t, p, !!o.back, expr, o.seed || 0);
    ctx.restore();
  }
  K.girl = (ctx, t, x, y, s, o = {}) => {
    const u = 2.5 * s, pose = o.pose || 'stand', p = Object.assign({}, GIRL, o.outfit === 'pajama' ? PJ : null);
    const expr = o.face || { arms: 'open', ride: 'open', wave: 'open', fist: 'firm', draw: 'firm', crouch: 'o', sit: 'sad', hold: 'smile' }[pose] || 'smile';
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u); setLW(u, s);
    if (pose === 'crouch' || pose === 'sit' || pose === 'ride') girlLow(ctx, t, p, pose, o, expr); else girlStand(ctx, t, p, pose, o, expr);
    ctx.restore();
  };

  // =====================================================================
  // 妈妈 Mom — beige trench coat, ponytail, office lanyard, tired kind eyes
  // =====================================================================
  const MOM = { skin: '#f8dcc6', skinS: '#e4b394', hair: '#2b211e', hairS: '#171110', hairH: '#5e4e46', coat: '#d9c39c', coatS: '#ae9470', coatL: '#efe2c4', pants: '#3b3e4a', pantsS: '#25272f', shoe: '#2a2326', shirt: '#f6f3ec', strap: '#3f6ea8' };
  const MH = {
    neck: 'M -1.9 -86.4 C -1.9 -84.6 -2.1 -83.2 -2.3 -82 L 2.3 -82 C 2.1 -83.2 1.9 -84.6 1.9 -86.4 Z',
    face: 'M -5.4 -98.4 C -5.9 -95 -6 -92 -5.6 -89.6 C -5.2 -88 -4.7 -87.4 -4.2 -86.8 C -3 -85.3 -1.6 -84.7 0 -84.7 C 1.6 -84.7 3 -85.3 4.2 -86.8 C 4.7 -87.4 5.2 -88 5.6 -89.6 C 6 -92 5.9 -95 5.4 -98.4 Z',
    faceSh: 'M 3.8 -95.4 C 5.4 -92.4 5.2 -89 3.8 -87 C 3 -85.9 2 -85.2 1 -84.9 C 3 -86.6 4 -89.4 4 -92.2 C 4 -93.4 3.9 -94.4 3.8 -95.4 Z',
    ear: 'M -5.5 -93.6 C -6.8 -94 -7.2 -92.2 -6.8 -91 C -6.4 -90 -5.8 -90.2 -5.4 -90.8 Z',
    hair: 'M -6.4 -90 C -7.6 -95 -6.6 -99.8 -3 -101 C -0.2 -101.8 3.4 -101.4 5.6 -99.4 C 7.2 -97.8 7.6 -94.6 6.8 -90.4 C 6.2 -92.6 5.6 -94 4.8 -95 C 2.4 -96.6 -2.2 -96.8 -4.6 -95.2 C -5.6 -94 -6.2 -92.2 -6.4 -90 Z',
    hairSh: 'M 2 -101.4 C 5.6 -100.6 7.6 -97 7 -91 L 9 -90 L 9 -102 Z',
    tail: 'M 4.8 -98.8 C 8.6 -98.6 10.2 -95.6 9.8 -91.6 C 9.6 -88.4 8.8 -85.4 7.6 -83.2 C 7.2 -85.2 7.4 -88.2 6.8 -90.6 C 6.4 -92.6 5.6 -93.8 4.6 -94.6 Z',
    bangs: 'M -6.3 -91 C -6.8 -96.4 -3.4 -99.6 1.2 -99.4 C 4.4 -99.2 6.6 -97.4 6.8 -94 C 5.6 -95.6 3.6 -96.4 1.6 -96.2 C -0.8 -95.8 -2.8 -94.6 -4.2 -93 C -5 -92.2 -5.7 -91.6 -6.3 -91 Z',
    sheen: 'M -4.6 -97.6 C -2.6 -99.2 0.4 -99.6 3 -99 C 0.6 -98.8 -1.8 -98.2 -3.8 -97 C -4.4 -96.6 -4.9 -97 -4.6 -97.6 Z',
    strands: 'M -1.6 -100 C -3.4 -97.6 -4.6 -95.4 -5.4 -92.6 M 2.4 -99.6 C 1 -98.2 -0.4 -97 -1.6 -95.8 M 5.6 -98.6 C 6.6 -96.6 7 -94 6.8 -91.6',
    eyeW: 'M -3.9 -91.6 C -3.4 -92.7 -1.6 -92.9 -1.0 -91.8 C -1.4 -90.8 -2.2 -90.4 -2.6 -90.4 C -3.2 -90.5 -3.7 -90.9 -3.9 -91.6 Z',
    lid: 'M -4.2 -91.5 C -3.4 -93.0 -1.6 -93.2 -0.8 -91.9',
    flick: 'M -4.1 -91.6 C -4.4 -91.3 -4.6 -91.1 -4.9 -91.0',
    bags: 'M -3.6 -90.0 C -3.0 -89.5 -2.1 -89.4 -1.4 -89.7',
    brow: 'M -4.2 -94.0 C -3.3 -94.7 -2.0 -94.7 -1.1 -94.2',
    browUp: 'M -4.2 -93.6 C -3.3 -94.0 -2.0 -94.6 -1.1 -95.0',
    closed: 'M -3.9 -91.4 C -3.2 -90.6 -1.7 -90.6 -1.0 -91.4',
    joy: 'M -3.9 -91.0 C -3.2 -92.0 -1.7 -92.0 -1.0 -91.0',
    nose: 'M 0.25 -90.6 C 0.6 -89.6 0.65 -89.0 0.15 -88.7',
    mouth: 'M -1.1 -87.1 C -0.4 -86.6 0.4 -86.6 1.1 -87.1',
    mouthTense: 'M -1.1 -86.9 C -0.4 -87.1 0.4 -87.1 1.1 -86.9',
    mouthSad: 'M -1.1 -86.6 C -0.4 -87.2 0.4 -87.2 1.1 -86.6',
    mouthJoy: 'M -1.3 -87.2 C -0.5 -86.2 0.5 -86.2 1.3 -87.2',
    tear: 'M -3.0 -89.8 C -3.3 -89.0 -3.4 -88.4 -3.1 -88.1 C -2.8 -87.9 -2.5 -88.3 -2.6 -88.9 C -2.7 -89.2 -2.8 -89.5 -3.0 -89.8 Z',
    hairB: 'M -6.6 -86.8 C -7.6 -91 -7.6 -96.4 -5.2 -99.6 C -3.2 -101.8 3.2 -101.8 5.2 -99.6 C 7.6 -96.4 7.6 -91 6.6 -86.8 C 4.4 -85.8 -4.4 -85.8 -6.6 -86.8 Z',
    hairBSh: 'M 2 -101.6 C 6 -100.6 7.8 -96 7 -87 L 9 -87 L 9 -102 Z',
    tailB: 'M -1.6 -97.6 C 1.2 -97.8 2.4 -94.6 2.0 -90.4 C 1.8 -87.2 1.0 -84.4 0 -82.4 C -0.8 -84.4 -1.8 -87.2 -2.0 -90.4 C -2.3 -93.4 -2.4 -96.2 -1.6 -97.6 Z',
  };
  const MB = {
    shoeL: 'M -6.4 -2.6 C -7.2 -1.4 -7 0.2 -5.6 0.6 C -4 1 -1.8 0.8 -1.3 -0.2 C -1 -1 -1.2 -2 -1.6 -2.6 Z',
    legL: 'M -6.4 -38.4 C -6.6 -27 -6.4 -14 -6 -2.2 L -1.8 -2.2 C -1.4 -14 -1.2 -27 -1 -38.4 Z',
    legLSh: 'M -3.4 -38.6 C -3.4 -27 -3.4 -14 -3.6 -2 L -1 -2 L -1 -38.6 Z',
    legRSh: 'M 4.4 -38.6 C 4.6 -27 4.8 -14 4.8 -2 L 7 -2 L 7 -38.6 Z',
    coat: 'M -4.4 -82.6 C -8 -82.2 -10.4 -81 -11 -78.4 C -10.8 -72 -9.6 -66 -8.8 -61.2 C -10 -54 -11.6 -44 -12.8 -35.6 C -8.8 -34.2 -4.2 -35.2 -0.2 -34.4 C 4.2 -35.2 8.8 -34.2 12.8 -35.6 C 11.6 -44 10 -54 8.8 -61.2 C 9.6 -66 10.8 -72 11 -78.4 C 10.4 -81 8 -82.2 4.4 -82.6 C 1.6 -81.6 -1.6 -81.6 -4.4 -82.6 Z',
    coatSh: 'M 4.6 -82 C 7.6 -76 8 -68 6.8 -61 C 7.8 -53 8.6 -44 9.4 -34 L 14 -34 L 14 -83 Z',
    coatHi: 'M -10.2 -77 C -9.6 -71 -8.8 -66 -8.2 -61.4 L -7.2 -61.6 C -7.8 -66 -8.6 -71 -9 -77 Z',
    shirt: 'M -3.6 -82.2 C -2.6 -78 -1.2 -74.6 0 -72.8 C 1.2 -74.6 2.6 -78 3.6 -82.2 C 1.2 -81.4 -1.2 -81.4 -3.6 -82.2 Z',
    lapelL: 'M -4.4 -82.6 C -6.4 -79.4 -6.8 -74.6 -5.6 -69.6 L -2.6 -70.8 C -1.6 -72.4 -0.8 -73.4 0 -72.8 C -1.4 -74.8 -2.8 -78.4 -3.6 -82.2 Z',
    belt: 'M -9 -62.4 C -3 -61 3 -61 9 -62.4 L 8.9 -59.6 C 3 -58.4 -3 -58.4 -8.9 -59.6 Z',
    buckle: 'M -1.7 -62.1 L 1.7 -62.1 L 1.7 -58.9 L -1.7 -58.9 Z',
    folds: 'M -2.4 -58.6 C -3 -52 -3.6 -44 -4 -35.6 M 3.6 -58.6 C 4.4 -52 5 -44 5.6 -35.4 M -6.8 -57.6 C -8.2 -50 -9.6 -42 -10.6 -36.2 M -7.6 -74 C -7 -71 -6 -69 -5 -67.6',
    lanyard: 'M -2.6 -81.6 C -1.6 -77.6 -0.8 -73.6 -0.2 -70.6 M 2.6 -81.6 C 1.6 -77.6 0.8 -73.6 0.2 -70.6',
    card: 'M -2.2 -70.8 L 2.2 -70.8 L 2.2 -64.6 L -2.2 -64.6 Z',
    seamB: 'M 0 -79 C 0 -72 0.1 -66 0.2 -62 M 0.2 -58.6 C 0.4 -52 0.6 -44 0.8 -35',
    kneeKL: 'M -10.4 -1 C -10.6 -5.4 -2.4 -5.4 -2.4 -1 C -4 0.4 -8.8 0.4 -10.4 -1 Z',
    shinR: 'M 3.8 -15.6 C 3.6 -10 3.8 -5 4.2 -2.4 L 8.6 -2.4 C 9 -5 9.2 -10 8.8 -15.6 Z',
    kneeR: 'M 3.2 -15.2 C 3.2 -20.4 9.6 -20.4 9.6 -15.2 C 8 -13.6 4.8 -13.6 3.2 -15.2 Z',
    shoeR: 'M 3.6 -2.8 C 3 -1.2 3.4 0.4 5 0.7 C 6.8 1 9.2 0.8 9.6 -0.2 C 9.8 -1.2 9.4 -2.2 9 -2.8 Z',
    cryCoat: 'M -3.6 -54.8 C -7.4 -54.4 -9.8 -53 -10.6 -50.4 C -11.6 -44 -13.6 -34 -14.6 -24 C -15 -18 -14.6 -13.6 -13.4 -12 C -9 -10.6 -4.6 -12.4 -2.4 -14 L 2.4 -14 C 4.6 -12.4 9 -10.6 13.4 -12 C 14.6 -13.6 15 -18 14.6 -24 C 13.6 -34 11.6 -44 10.6 -50.4 C 9.8 -53 7.4 -54.4 3.6 -54.8 C 1.2 -54 -1.2 -54 -3.6 -54.8 Z',
    cryCoatSh: 'M 3.4 -54.6 C 8 -48 10.6 -36 11 -24 C 11.2 -18 11 -14 10.4 -11 L 16 -11 L 16 -55 Z',
    cryShin: 'M -7.2 -24 C -7.4 -16 -7.2 -8 -6.8 -2.2 L -2.6 -2.2 C -2.2 -8 -2 -16 -2.2 -24 Z',
    cryKnee: 'M -7.8 -23.6 C -7.8 -28.4 -1.6 -28.4 -1.6 -23.6 C -2.6 -21.4 -6.8 -21.4 -7.8 -23.6 Z',
  };
  function momHead(ctx, t, p, back, expr) {
    part(ctx, MH.neck, p.skinS, { w: LW * 0.7 });
    if (back) { part(ctx, MH.hairB, p.hair, { sh: [[MH.hairBSh, p.hairS]], hi: [['M -5 -96 C -3.6 -99.4 1 -100.6 4 -99.6 C 1 -99 -2.4 -98 -4 -95.6 Z', P.css(p.hairH, 0.85)]] }); part(ctx, MH.tailB, p.hair, { sh: [['M 0.4 -98 C 2 -94 1.6 -88 0 -82 L 3 -82 L 3 -98 Z', p.hairS]] }); part(ctx, 'M -1.6 -97.6 C -0.6 -98.6 1.0 -98.6 1.8 -97.4 C 1.0 -96.6 -0.8 -96.6 -1.6 -97.6 Z', '#c8463a', { w: LW * 0.6 }); return; }
    part(ctx, MH.tail, p.hair, { sh: [['M 7 -99 C 10 -96 10 -90 8 -83 L 11 -83 L 11 -99 Z', p.hairS]] });
    part(ctx, MH.ear, p.skin, { w: LW * 0.7 }); part(ctx, mx(MH.ear), p.skinS, { w: LW * 0.7 });
    part(ctx, MH.face, p.skin, { sh: [[MH.faceSh, p.skinS], [tr(MH.bangs, 0.3, 1.0), p.skinS]] });
    blush(ctx, -3.6, -89.6, 1.5, 0.3); blush(ctx, 3.6, -89.6, 1.5, 0.3);
    const closed = blinkAt(t, 3.3) || expr === 'cry';
    for (const m of [0, 1]) {
      const D = (d) => (m ? mx(d) : d);
      if (expr === 'joy') { strokeD(ctx, D(MH.joy), 0.42, '#2a1812'); continue; }
      if (closed) { strokeD(ctx, D(MH.closed), 0.42, '#2a1812'); continue; }
      const ew = p2d(D(MH.eyeW)); ctx.fillStyle = '#fbf6ef'; ctx.fill(ew); ctx.save(); ctx.clip(ew);
      const ex = m ? 2.4 : -2.4; ctx.fillStyle = P.lg(ctx, 0, -92.6, 0, -90.4, ['#1c120e', '#4a3022']); ctx.beginPath(); ctx.ellipse(ex, -91.5, 0.72, 0.95, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 0.25, -91.85, 0.24, 0, TAU); ctx.fill(); ctx.restore();
      strokeD(ctx, D(MH.lid), 0.48, '#21130d'); strokeD(ctx, D(MH.flick), 0.3, '#21130d'); strokeD(ctx, D(MH.bags), 0.22, 'rgba(130,90,110,0.7)');
    }
    for (const m of [0, 1]) strokeD(ctx, m ? mx(expr === 'tense' || expr === 'sad' || expr === 'cry' ? MH.browUp : MH.brow) : expr === 'tense' || expr === 'sad' || expr === 'cry' ? MH.browUp : MH.brow, 0.32, '#3a2a22');
    strokeD(ctx, MH.nose, 0.26, '#c08572');
    strokeD(ctx, expr === 'tense' ? MH.mouthTense : expr === 'sad' || expr === 'cry' ? MH.mouthSad : expr === 'joy' ? MH.mouthJoy : MH.mouth, 0.34, '#9a4a40');
    if (expr === 'cry' || expr === 'joy') for (const m of [0, 1]) part(ctx, m ? mx(MH.tear) : MH.tear, 'rgba(205,232,255,0.9)', { w: 0.1, lc: 'rgba(120,160,200,0.8)' });
    part(ctx, MH.hair, p.hair, { sh: [[MH.hairSh, p.hairS]] });
    part(ctx, MH.bangs, p.hair, { hi: [[MH.sheen, P.css(p.hairH, 0.9)]] });
    strokeD(ctx, MH.strands, LW * 0.5, P.css(p.hairH, 0.9));
  }
  function momCoat(ctx, p, back) {
    part(ctx, MB.coat, p.coat, { sh: [[MB.coatSh, p.coatS], [MB.belt, p.coatS]], hi: [[MB.coatHi, p.coatL]] });
    strokeD(ctx, MB.folds, LW * 0.6, lineOf(p.coat));
    inkD(ctx, MB.belt, LW * 0.7, lineOf(p.coat));
    if (back) { strokeD(ctx, MB.seamB, LW * 0.6, lineOf(p.coat)); return; }
    part(ctx, MB.shirt, p.shirt, { w: LW * 0.7 });
    part(ctx, MB.lapelL, p.coatL, { w: LW * 0.8, sh: [['M -5.6 -69.6 L -2.6 -70.8 L -3.4 -73 Z', p.coatS]] }); part(ctx, mx(MB.lapelL), p.coat, { w: LW * 0.8 });
    for (const [bx, by] of [[-3.6, -66.6], [3.6, -66.6], [-3.6, -54], [3.6, -54], [-3.6, -46.6], [3.6, -46.6]]) { ctx.fillStyle = '#6e5a40'; ctx.beginPath(); ctx.arc(bx, by, 0.55, 0, TAU); ctx.fill(); }
    part(ctx, MB.buckle, p.coatS, { w: LW * 0.6 });
    strokeD(ctx, MB.lanyard, 0.6, p.strap);
    part(ctx, MB.card, '#ffffff', { w: LW * 0.6, hi: [['M -2.2 -70.8 L 2.2 -70.8 L 2.2 -69.2 L -2.2 -69.2 Z', p.strap]] });
  }
  const momSleeve = (ctx, p, S, E, Wr, o = {}) => sleeve(ctx, S, E, Wr, [4.5, 3.9, 4.3], p.coat, p.coatS, Object.assign({ hand: handFn('adult', p.skin, p.skinS, o.item) }, o));
  K.mom = (ctx, t, x, y, s, o = {}) => {
    const u = 4.3 * s, p = MOM, pose = o.pose || 'stand', back = !!o.back;
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u); setLW(u, s, 0.9);
    footShadow(ctx, 13, 2.2);
    const S = [[-10.2, -78.4], [10.2, -78.4]];
    if (pose === 'cry') {
      const sob = Math.abs(Math.sin(t * 3.4)) * 0.45;
      for (const m of [0, 1]) { const D = (d) => (m ? mx(d) : d); part(ctx, D(tr(MB.shoeL, 0.4, 0)), p.shoe); part(ctx, D(MB.cryShin), p.pants, { sh: [[D('M -4.4 -24 L -2 -24 L -2 -2 L -4.4 -2 Z'), p.pantsS]] }); }
      ctx.save(); ctx.translate(0, sob);
      part(ctx, MB.cryCoat, p.coat, { sh: [[MB.cryCoatSh, p.coatS]] });
      for (const m of [0, 1]) { const D = (d) => (m ? mx(d) : d); part(ctx, D(MB.cryKnee), p.pants, { sh: [[D('M -4 -29 L -1 -29 L -1 -21 L -4 -21 Z'), p.pantsS]] }); }
      ctx.save(); ctx.translate(0, 36.5); ctx.translate(0, -88); ctx.rotate(0.06); ctx.translate(0, 88); momHead(ctx, t, p, false, 'cry'); ctx.restore();
      momSleeve(ctx, p, [-10, -50.2], [-6.2, -27.6], [-2.6, -48.6], { mirror: false });
      momSleeve(ctx, p, [10, -50.2], [6.2, -27.6], [2.6, -48.6], { mirror: true });
      ctx.restore();
    } else if (pose === 'kneel' || pose === 'hug') {
      part(ctx, MB.kneeKL, p.pants, { sh: [['M -6 -6 L -2 -6 L -2 1 L -6 1 Z', p.pantsS]] });
      part(ctx, MB.shoeR, p.shoe); part(ctx, MB.shinR, p.pants, { sh: [['M 6.4 -16 L 9.2 -16 L 9.2 -2 L 6.4 -2 Z', p.pantsS]] }); part(ctx, MB.kneeR, p.pants, { sh: [['M 6.8 -21 L 10 -21 L 10 -13 L 6.8 -13 Z', p.pantsS]] });
      ctx.save(); ctx.translate(0, 24);
      momCoat(ctx, p, false);
      if (pose === 'kneel') {
        const [E1, W1] = joints(S[1], 1, -0.62, -0.5, 13.4, 11.6); momSleeve(ctx, p, S[1], E1, W1, { mirror: true });
        momHead(ctx, t, p, false, o.face || 'sad');
        const [E0, W0] = joints(S[0], -1, 0.95, 0.35, 13.4, 11.6); momSleeve(ctx, p, S[0], E0, W0, {});
      } else momHead(ctx, t, p, false, o.face || 'joy');
      ctx.restore();
    } else {
      const bob = Math.sin(t * 1.8 + 1) * 0.2;
      for (const m of [0, 1]) { const D = (d) => (m ? mx(d) : d); part(ctx, D(MB.legL), p.pants, { sh: [[m ? MB.legRSh : MB.legLSh, p.pantsS]] }); part(ctx, D(MB.shoeL), p.shoe); }
      ctx.save(); ctx.translate(0, bob);
      momCoat(ctx, p, back);
      if (pose === 'phone') {
        const [E0, W0] = joints(S[0], -1, 0.14, -0.1, 13.6, 12.2); momSleeve(ctx, p, S[0], E0, W0, {});
        momHead(ctx, t, p, false, 'tense');
        const E1 = [13.4, -70.2], W1 = [8.6, -85.4];
        momSleeve(ctx, p, S[1], E1, W1, { mirror: true, item: (c) => { c.save(); c.translate(-0.6, 3.4); part(c, 'M -1.7 -3.6 L 1.7 -3.6 L 1.7 3.6 L -1.7 3.6 Z', '#24262c', { w: 0.25 }); c.restore(); } });
      } else {
        for (const [i, sx] of [[0, -1], [1, 1]]) { const [E, Wr] = joints(S[i], sx, 0.12, -0.08, 13.6, 12.2); momSleeve(ctx, p, S[i], E, Wr, { mirror: sx > 0 }); }
        momHead(ctx, t, p, back, o.face || 'smile');
      }
      ctx.restore();
    }
    ctx.restore();
  };
  K.momFront = (ctx, t, x, y, s, o = {}) => {
    if (o.pose !== 'hug') return;
    const u = 4.3 * s, p = MOM; ctx.save(); ctx.translate(x, y); ctx.scale(u, u); setLW(u, s, 0.9); ctx.translate(0, 24);
    momSleeve(ctx, p, [-10.2, -78.4], [-11.6, -64], [-3, -55], {});
    momSleeve(ctx, p, [10.2, -78.4], [11.6, -64], [3, -56.4], { mirror: true });
    ctx.restore();
  };

  // =====================================================================
  // 外婆 Grandma — silver bun, round glasses, indigo jacket, floral apron
  // =====================================================================
  const GMA = { skin: '#f2d6be', skinS: '#d9ad8f', hair: '#e1e3e8', hairS: '#b2b7c4', jacket: '#3e5288', jacketS: '#2b3864', jacketL: '#5b70a8', apron: '#efe2c9', apronS: '#d4c09f', pants: '#3a3940', pantsS: '#26252b', shoe: '#2a2628', gown: '#bcd2e8', gownS: '#90aacd' };
  const GM = {
    shoeL: 'M -7.4 -2.8 C -8.2 -1.4 -7.8 0.3 -6.2 0.6 C -4.6 0.9 -2.4 0.8 -1.8 -0.2 C -1.5 -1 -1.8 -2.2 -2.2 -2.8 Z',
    legL: 'M -8.4 -32 C -8.6 -22 -8.2 -11 -7.6 -2.4 L -2.2 -2.4 C -1.8 -11 -1.4 -22 -1.2 -32 Z',
    legLSh: 'M -4.4 -32 C -4.4 -22 -4.4 -11 -4.6 -2 L -1 -2 L -1 -32 Z',
    legRSh: 'M 5.2 -32 C 5.4 -22 5.6 -11 5.6 -2 L 9 -2 L 9 -32 Z',
    jacket: 'M -4.6 -76.4 C -9.2 -76 -12.2 -74.4 -12.8 -71 C -13.2 -64 -13.6 -54 -14.2 -46 C -14.6 -42 -14.6 -38.6 -14.2 -35.8 C -9.6 -34.4 -4.6 -35 0 -34.6 C 4.6 -35 9.6 -34.4 14.2 -35.8 C 14.6 -38.6 14.6 -42 14.2 -46 C 13.6 -54 13.2 -64 12.8 -71 C 12.2 -74.4 9.2 -76 4.6 -76.4 C 1.6 -75.6 -1.6 -75.6 -4.6 -76.4 Z',
    jacketSh: 'M 6 -76 C 9.6 -70 10.6 -60 10.4 -50 C 10.4 -44 10.6 -40 11 -35 L 16 -35 L 16 -77 Z',
    jacketHi: 'M -12.2 -70 C -12.6 -62 -13 -52 -13.4 -44 L -12.2 -44 C -11.8 -52 -11.4 -62 -11 -70 Z',
    collar: 'M -4.9 -76.4 C -4.7 -78.8 4.7 -78.8 4.9 -76.4 C 4.7 -75.2 -4.7 -75.2 -4.9 -76.4 Z',
    opening: 'M 1.8 -76 C 5 -74.6 8.4 -72 10.6 -68.4 C 10.8 -60 11 -50 11.2 -36',
    apron: 'M -8.6 -66.6 L 8.6 -66.6 C 10.6 -56 11.4 -44 11.8 -28.6 C 4.6 -27.2 -4.6 -27.2 -11.8 -28.6 C -11.4 -44 -10.6 -56 -8.6 -66.6 Z',
    apronSh: 'M 5.4 -66.6 C 7.6 -56 8.6 -44 8.8 -28 L 13 -28 L 13 -67 Z',
    straps: 'M -6.4 -66.4 C -5.8 -70 -4.6 -73 -3.2 -75.4 M 6.4 -66.4 C 5.8 -70 4.6 -73 3.2 -75.4',
    apronFolds: 'M -4 -60 C -4.6 -50 -5.4 -40 -6 -29 M 3 -58 C 3.4 -48 4 -38 4.4 -28.4',
    neck: 'M -2.6 -79.8 C -2.6 -78.4 -2.8 -77.4 -3 -76.6 L 3 -76.6 C 2.8 -77.4 2.6 -78.4 2.6 -79.8 Z',
    face: 'M -7.2 -92.6 C -7.8 -88.6 -7.6 -85 -7.2 -83 C -6.7 -81.2 -6.1 -80.2 -5.4 -79.4 C -3.8 -77.6 -1.8 -77 0 -77 C 1.8 -77 3.8 -77.6 5.4 -79.4 C 6.1 -80.2 6.7 -81.2 7.2 -83 C 7.6 -85 7.8 -88.6 7.2 -92.6 Z',
    faceSh: 'M 5.4 -89 C 7.2 -85.6 7 -82 5.4 -79.6 C 4.4 -78.4 3 -77.6 1.6 -77.2 C 4 -79.2 5.4 -82.4 5.6 -85.6 C 5.6 -86.8 5.5 -88 5.4 -89 Z',
    ear: 'M -7 -87.4 C -8.6 -87.8 -9 -85.4 -8.4 -84 C -7.8 -82.8 -7 -83.2 -6.8 -84 Z',
    hair: 'M -7.8 -85.4 C -8.8 -91.6 -6.4 -96.2 -1.4 -96.8 C 3.6 -97.2 7.6 -94.6 8.2 -89.6 C 8.4 -88 8.2 -86.6 7.8 -85.4 C 7 -88.2 5.4 -90 3.4 -90.8 C 1.4 -91.6 -1.4 -91.6 -3.6 -90.8 C -5.6 -90 -7 -88.2 -7.8 -85.4 Z',
    hairSh: 'M 3 -97 C 6.6 -96 8.4 -93 8.2 -88.6 L 10 -88 L 10 -98 Z',
    hairLines: 'M -1 -96.4 C -3.4 -94.6 -4.8 -92.6 -5.6 -90.4 M 1.4 -96.6 C 0.6 -94.6 0.2 -93 0 -91.6 M 4 -96 C 5.4 -94.4 6.2 -92.6 6.6 -90.6',
    bun: 'M -2.6 -96.2 C -3.4 -100.2 0.2 -102.2 3 -101 C 5.4 -99.8 5.2 -96.6 3 -95.6 C 1.2 -94.8 -1.6 -94.8 -2.6 -96.2 Z',
    eyeSmile: 'M -4.4 -85.0 C -3.6 -86.0 -2.2 -86.0 -1.4 -85.0',
    eyeSleep: 'M -4.4 -85.6 C -3.6 -84.8 -2.2 -84.8 -1.4 -85.6',
    crow: 'M -5.0 -85.6 C -5.6 -86.0 -6.0 -86.4 -6.4 -86.8 M -5.0 -85.0 C -5.6 -85.0 -6.0 -84.8 -6.4 -84.6',
    brow: 'M -4.8 -88.4 C -3.8 -89.0 -2.4 -89.0 -1.4 -88.6',
    glass: 'M -5.2 -85.4 C -5.2 -88.3 -0.8 -88.3 -0.8 -85.4 C -0.8 -82.6 -5.2 -82.6 -5.2 -85.4 Z',
    bridge: 'M -0.8 -85.9 C -0.3 -86.4 0.3 -86.4 0.8 -85.9',
    nose: 'M 0.2 -84.4 C 0.8 -83.2 0.9 -82.4 0.1 -82',
    mouth: 'M -1.8 -80.4 C -0.6 -79.6 0.6 -79.6 1.8 -80.4',
    smileLines: 'M -3.4 -82.6 C -3.8 -81.6 -3.6 -80.6 -3 -79.8 M 3.4 -82.6 C 3.8 -81.6 3.6 -80.6 3 -79.8',
    kneeK: 'M -11 -1 C -11.2 -5.6 -2.6 -5.6 -2.6 -1 C -4.4 0.4 -9.2 0.4 -11 -1 Z',
    shinR: 'M 3 -16 C 2.8 -10 3 -5 3.4 -2.4 L 8.6 -2.4 C 9 -5 9.2 -10 8.8 -16 Z',
    kneeR: 'M 2.4 -15.4 C 2.4 -20.8 9.4 -20.8 9.4 -15.4 C 7.8 -13.8 4 -13.8 2.4 -15.4 Z',
  };
  function gmaHead(ctx, t, p, expr) {
    part(ctx, GM.neck, p.skinS, { w: LW * 0.7 });
    part(ctx, GM.bun, p.hair, { sh: [['M 1 -102 L 6 -102 L 6 -95 L 1 -95 Z', p.hairS]] });
    part(ctx, GM.ear, p.skin, { w: LW * 0.7 }); part(ctx, mx(GM.ear), p.skinS, { w: LW * 0.7 });
    part(ctx, GM.face, p.skin, { sh: [[GM.faceSh, p.skinS], [tr(GM.hair, 0, 1.2), p.skinS]] });
    blush(ctx, -4.6, -82.4, 1.8, 0.3); blush(ctx, 4.6, -82.4, 1.8, 0.3);
    for (const m of [0, 1]) { const D = (d) => (m ? mx(d) : d); strokeD(ctx, D(expr === 'sleep' ? GM.eyeSleep : GM.eyeSmile), 0.5, '#2e1c14'); strokeD(ctx, D(GM.crow), 0.24, 'rgba(150,100,80,0.75)'); strokeD(ctx, D(GM.brow), 0.3, '#9a9aa6'); }
    strokeD(ctx, GM.nose, 0.3, '#b47c66'); strokeD(ctx, GM.mouth, 0.42, '#8a4a3a'); strokeD(ctx, GM.smileLines, 0.26, 'rgba(160,110,90,0.7)');
    for (const m of [0, 1]) { const g = m ? mx(GM.glass) : GM.glass; ctx.fillStyle = 'rgba(220,235,245,0.18)'; ctx.fill(p2d(g)); inkD(ctx, g, 0.32, '#8a6a3a'); }
    strokeD(ctx, GM.bridge, 0.3, '#8a6a3a');
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 3 - 0.8, -86.4, 0.6, 0.3, -0.5, 0, TAU); ctx.fill(); }
    part(ctx, GM.hair, p.hair, { sh: [[GM.hairSh, p.hairS]] });
    strokeD(ctx, GM.hairLines, LW * 0.5, '#9aa0b0');
  }
  function gmaUpper(ctx, t, p, o, arms) {
    part(ctx, GM.jacket, p.jacket, { sh: [[GM.jacketSh, p.jacketS]], hi: [[GM.jacketHi, p.jacketL]] });
    strokeD(ctx, GM.opening, LW * 0.7, lineOf(p.jacket));
    for (const [bx, by] of [[4.4, -74.8], [8.2, -71.6], [10.8, -62], [10.9, -52]]) { strokeD(ctx, `M ${bx - 1.6} ${by} L ${bx + 1.2} ${by}`, 0.5, '#efe6d2'); ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.arc(bx + 1.5, by, 0.6, 0, TAU); ctx.fill(); }
    part(ctx, GM.apron, p.apron, { sh: [[GM.apronSh, p.apronS]] });
    ctx.save(); ctx.clip(p2d(GM.apron)); for (let i = 0; i < 30; i++) { const fx = -11 + P.hash(i + 3) * 22, fy = -64 + P.hash(i + 9) * 35; ctx.fillStyle = i % 3 ? '#d26f78' : '#e39c4a'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(fx + Math.cos(k * 1.57) * 0.7, fy + Math.sin(k * 1.57) * 0.7, 0.55, 0, TAU); ctx.fill(); } ctx.fillStyle = '#7aa05a'; ctx.beginPath(); ctx.ellipse(fx + 1.2, fy + 0.8, 0.7, 0.35, 0.6, 0, TAU); ctx.fill(); } ctx.restore();
    strokeD(ctx, GM.apronFolds, LW * 0.55, lineOf(p.apron)); strokeD(ctx, GM.straps, LW * 0.8, lineOf(p.apron));
    part(ctx, GM.collar, p.jacket, { w: LW * 0.8 });
    arms();
    ctx.save(); ctx.translate(-1.2, 1.6); gmaHead(ctx, t, p, o.face || (o.asleep ? 'sleep' : 'smile')); ctx.restore();
  }
  const gmaSleeve = (ctx, p, S, E, Wr, o = {}) => sleeve(ctx, S, E, Wr, [6, 5.2, 5.6], p.jacket, p.jacketS, Object.assign({ hand: handFn('adult', p.skin, p.skinS, o.item), hs: 0.95 }, o));
  K.grandma = (ctx, t, x, y, s, o = {}) => {
    const u = 3.4 * s, p = GMA, pose = o.pose || 'stand';
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u); setLW(u, s, 0.95);
    const S = [[-12.4, -71.6], [12.4, -71.6]];
    if (pose === 'bed') {
      inkD(ctx, 'M -36 -20 L -36 -2 M 36 -20 L 36 -2', LW * 1.6, '#8e9aa4');
      for (const lx of [-36, 36]) { ctx.fillStyle = '#4a4f55'; ctx.beginPath(); ctx.arc(lx, -1.6, 1.8, 0, TAU); ctx.fill(); }
      part(ctx, 'M -41 -24 L 41 -24 C 41.8 -24 42 -23 41.6 -21 L -41.6 -21 C -42 -23 -41.8 -24 -41 -24 Z', '#dfe5e8');
      part(ctx, 'M -43 -52 C -43 -54 -38 -54 -38 -52 L -38 -20 L -43 -20 Z', '#e9edf0', { sh: [['M -40.6 -54 L -38 -54 L -38 -20 L -40.6 -20 Z', '#c9d2d8']] });
      part(ctx, 'M 38 -37 C 38 -39 42.6 -39 42.6 -37 L 42.6 -20 L 38 -20 Z', '#e9edf0');
      part(ctx, 'M -38 -30 C -38 -32 -36 -32.6 -34 -32.6 L 36 -32.6 C 37.6 -32.6 38 -31.6 38 -30 L 38 -24 L -38 -24 Z', '#f6f7f6', { sh: [['M -38 -27 L 38 -27 L 38 -24 L -38 -24 Z', '#dfe5e6']] });
      part(ctx, 'M -40 -36 C -40.6 -41 -33 -43 -26 -41.6 C -20.6 -40.6 -20 -36 -22.6 -33.6 C -27 -31.6 -37 -31.6 -40 -36 Z', '#fbfbf8', { sh: [['M -38 -34 C -32 -32 -26 -32.4 -22 -34 L -22 -31 L -40 -31 Z', '#dde3e6']] });
      ctx.save(); ctx.translate(-23, 63.6); ctx.scale(1.3, 1.3); ctx.rotate(o.asleep ? -0.07 : 0);
      const gown = 'M -9 -79 C -12 -76.6 -12.6 -72 -12.6 -66 L -12 -61 L 12 -61 L 12.6 -66 C 12.6 -72 12 -76.6 9 -79 C 4 -77.6 -4 -77.6 -9 -79 Z';
      part(ctx, gown, p.gown, { sh: [['M 4 -80 C 8 -74 9 -68 8.6 -60 L 14 -60 L 14 -80 Z', p.gownS]] });
      ctx.save(); ctx.clip(p2d(gown)); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.55; for (let xx = -12; xx < 13; xx += 2.4) { ctx.beginPath(); ctx.moveTo(xx, -80); ctx.lineTo(xx, -60); ctx.stroke(); } ctx.restore();
      ctx.save(); ctx.translate(0, 6); gmaHead(ctx, t, p, o.asleep ? 'sleep' : 'smile'); ctx.restore();
      ctx.restore();
      part(ctx, 'M -37 -27 C -24 -32 -10 -31 0 -30.6 C 14 -33.6 28 -32 39 -29 L 39.6 -19 C 0 -15.6 -20 -16 -37 -19 Z', '#e4ecf3', { sh: [['M -40 -24 C -10 -21 20 -21 42 -23 L 42 -15 L -40 -15 Z', '#c4d2e0']] });
      strokeD(ctx, 'M -6 -30 C -3 -25 -4 -21 -5 -18 M 8 -30.6 C 11 -26 10 -22 9 -18.4 M 22 -30.6 C 24 -26 23.4 -22 22.6 -18.6', LW * 0.6, '#8aa0b8');
      if (o.prop === 'dandelion') {
        ctx.strokeStyle = '#6a9a4a'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-9.2, -36); ctx.quadraticCurveTo(-8.4, -50, -8.6, -64); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-8.6, -66, 4.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 0.22; ctx.beginPath(); for (let i = 0; i < 30; i++) { const a = (i / 30) * TAU + t * 0.05; ctx.moveTo(-8.6, -66); ctx.lineTo(-8.6 + Math.cos(a) * 4.4, -66 + Math.sin(a) * 4.4); } ctx.stroke();
        sleeve(ctx, [-12.4, -40.6], [-12.6, -34], [-9.6, -38.2], [5.2, 4.6, 5.0], p.gown, p.gownS, { hand: handFn('fist', p.skin, p.skinS), mirror: true });
      } else part(ctx, 'M -14.6 -30.6 C -14.6 -33.6 -9.6 -33.6 -9.6 -30.6 C -9.6 -28.8 -14.6 -28.8 -14.6 -30.6 Z', p.skin, { w: LW * 0.8 });
      ctx.restore(); return;
    }
    footShadow(ctx, 15, 2.6);
    const kneel = pose === 'kneel';
    if (!kneel) for (const m of [0, 1]) { const D = (d) => (m ? mx(d) : d); part(ctx, D(GM.legL), p.pants, { sh: [[m ? GM.legRSh : GM.legLSh, p.pantsS]] }); part(ctx, D(GM.shoeL), p.shoe); }
    else { part(ctx, GM.kneeK, p.pants, { sh: [['M -6.6 -6 L -2 -6 L -2 1 L -6.6 1 Z', p.pantsS]] }); part(ctx, tr(GM.shoeL, 10, 0), p.shoe); part(ctx, GM.shinR, p.pants, { sh: [['M 6 -16 L 9.4 -16 L 9.4 -2 L 6 -2 Z', p.pantsS]] }); part(ctx, GM.kneeR, p.pants, { sh: [['M 6.4 -21 L 10 -21 L 10 -13 L 6.4 -13 Z', p.pantsS]] }); }
    if (pose === 'cane') { strokeD(ctx, 'M 22.6 -45.6 L 24.4 0.2', 1.1, '#5a3c26'); strokeD(ctx, 'M 22.6 -45.6 C 22.4 -48.4 19.4 -48.6 18.8 -46.4', 1.1, '#5a3c26'); }
    ctx.save(); ctx.translate(0, kneel ? 21 : 0); ctx.transform(1, 0, kneel ? 0 : 0.05, 1, 0, 0);
    gmaUpper(ctx, t, p, o, () => {
      if (kneel) { for (const [i, sx, a1] of [[0, -1, 0.95], [1, 1, -0.85]]) { const [E, Wr] = joints(S[i], sx, a1, 0.05, 12.2, 11.4); gmaSleeve(ctx, p, S[i], E, Wr, { mirror: sx > 0 }); } }
      else if (o.prop === 'can') {
        const [E0, W0] = joints(S[0], -1, 0.12, -0.1, 12.6, 11.6); gmaSleeve(ctx, p, S[0], E0, W0, {});
        const tilt = 0.25 + Math.sin(t * 1.4) * 0.08;
        ctx.save(); ctx.translate(24.6, -47.4); ctx.rotate(tilt);
        part(ctx, 'M -4.2 -6.2 C -4.2 -7 4.6 -7 4.6 -6.2 L 5 6 C 5 7 -4.6 7 -4.6 6 Z', '#9fb7c4', { sh: [['M 1.6 -8 L 6 -8 L 6 8 L 1.6 8 Z', '#7a92a0']] });
        part(ctx, 'M 4.6 2 L 15.6 -6.4 C 16.4 -6.8 17 -5.8 16.4 -5.2 L 5 4.6 Z', '#9fb7c4');
        inkD(ctx, 'M -3.2 -6.4 C -3.6 -11.6 4.2 -11.6 3.8 -6.4', LW, '#4a5a64');
        ctx.fillStyle = 'rgba(200,230,255,0.85)'; for (let i = 0; i < 7; i++) { const ph = (t * 1.6 + i / 7) % 1; ctx.beginPath(); ctx.ellipse(17 + ph * 5 + i * 0.3, -5 + ph * ph * 30, 0.45, 0.9, 0, 0, TAU); ctx.fill(); }
        ctx.restore();
        const [E1, W1] = joints(S[1], 1, 0.42, -0.05, 12.2, 11.2); gmaSleeve(ctx, p, S[1], E1, W1, { mirror: true });
      } else for (const [i, sx, a1] of [[0, -1, 0.12], [1, 1, pose === 'cane' ? 0.4 : 0.12]]) { const [E, Wr] = joints(S[i], sx, a1, -0.08, 12.6, 11.6); gmaSleeve(ctx, p, S[i], E, Wr, { mirror: sx > 0 }); }
    });
    ctx.restore(); ctx.restore();
  };

  // =====================================================================
  // 司机叔叔 the driver — bust inside the excavator cab
  // =====================================================================
  const DR = {
    torso: 'M -36 4 C -35 -12 -30 -22 -15 -28.6 C -6 -30.6 6 -30.6 15 -28.6 C 30 -22 35 -12 36 4 Z',
    torsoSh: 'M 10 -30 C 22 -26 32 -16 34 4 L 40 4 L 40 -31 Z',
    vest: 'M -22 4 C -22 -8 -21 -18 -19 -24.6 C -14 -27.4 -9 -28.8 -6 -29 L 0 -17.6 L 6 -29 C 9 -28.8 14 -27.4 19 -24.6 C 21 -18 22 -8 22 4 Z',
    vestSh: 'M 8 -29 C 14 -24 17 -14 17.6 4 L 24 4 L 24 -30 Z',
    stripes: 'M -21.8 -11.4 C -8 -9.6 8 -9.6 21.8 -11.4 L 21.9 -8.8 C 8 -7 -8 -7 -21.9 -8.8 Z M -22 -4.4 C -8 -2.6 8 -2.6 22 -4.4 L 22 -1.8 C 8 0 -8 0 -22 -1.8 Z',
    collar: 'M -6 -29 C -3.6 -26 -1.6 -22 0 -17.6 C 1.6 -22 3.6 -26 6 -29 C 3 -30.6 -3 -30.6 -6 -29 Z',
    neck: 'M -4.4 -37.6 C -4.4 -34 -4.8 -31.6 -5.4 -29.4 L 5.4 -29.4 C 4.8 -31.6 4.4 -34 4.4 -37.6 Z',
    face: 'M -8.2 -50 C -8.8 -45.6 -8.2 -41.6 -6.4 -39.2 C -4.6 -37 -2.4 -36 0 -36 C 2.4 -36 4.6 -37 6.4 -39.2 C 8.2 -41.6 8.8 -45.6 8.2 -50 Z',
    faceSh: 'M 6.4 -50 C 8.2 -46 8 -41.6 6.2 -39 C 5 -37.6 3.6 -36.6 2 -36.2 C 4.8 -38.6 6.4 -42.6 6.6 -46.4 C 6.6 -47.8 6.5 -49 6.4 -50 Z',
    stubble: 'M -6.6 -42 C -5.4 -38.4 -2.6 -36.4 0 -36.4 C 2.6 -36.4 5.4 -38.4 6.6 -42 C 4 -40 -4 -40 -6.6 -42 Z',
    ear: 'M -8.2 -47 C -10 -47.4 -10.6 -44.6 -9.8 -43 C -9.2 -41.8 -8.4 -42.2 -8 -43 Z',
    hat: 'M -9.6 -49.2 C -10.2 -55.6 -6.4 -60.4 0 -60.6 C 6.4 -60.4 10.2 -55.6 9.6 -49.2 Z',
    hatSh: 'M 3 -60.4 C 7.6 -59.4 10.2 -55 9.6 -49.2 L 12 -49 L 12 -61 Z',
    hatHi: 'M -6.6 -55.8 C -5.4 -58.2 -3.2 -59.4 -1 -59.6 C -3.2 -58.6 -4.8 -57.4 -5.8 -55.6 Z',
    brim: 'M -12.4 -49.8 C -6 -51.4 6 -51.4 12.4 -49.8 C 12.6 -48.6 12 -48 11.2 -48 C 6 -49 -6 -49 -11.2 -48 C -12 -48 -12.6 -48.6 -12.4 -49.8 Z',
    eyes: 'M -5 -45.4 C -4.2 -46.4 -2.6 -46.4 -1.8 -45.4 M 1.8 -45.4 C 2.6 -46.4 4.2 -46.4 5 -45.4',
    bags: 'M -4.8 -44.2 C -4 -43.6 -2.8 -43.6 -2 -44 M 2 -44 C 2.8 -43.6 4 -43.6 4.8 -44.2',
    brows: 'M -5.6 -47.6 C -4.4 -48 -3 -48.6 -1.8 -49 M 1.8 -49 C 3 -48.6 4.4 -48 5.6 -47.6',
    nose: 'M 0.3 -44.6 C 0.9 -42.8 1.1 -41.6 0.1 -41.2',
    mouth: 'M -2.2 -39.4 C -0.8 -38.6 0.8 -38.6 2.2 -39.4',
  };
  K.driver = (ctx, t, x, y, s) => {
    const u = 4 * s; ctx.save(); ctx.translate(x, y); ctx.scale(u, u); setLW(u, s, 1.1);
    part(ctx, DR.torso, '#7b838e', { sh: [[DR.torsoSh, '#5c636e']] });
    part(ctx, DR.vest, '#ee7a2c', { sh: [[DR.vestSh, '#c85d1c'], [DR.stripes, '#e8eef0']] });
    part(ctx, DR.collar, '#8b939e', { w: LW * 0.8 });
    part(ctx, DR.neck, '#d9ae8a', { w: LW * 0.8 });
    part(ctx, DR.ear, '#e8c09c', { w: LW * 0.8 }); part(ctx, mx(DR.ear), '#d5a985', { w: LW * 0.8 });
    part(ctx, DR.face, '#ecc6a3', { sh: [[DR.faceSh, '#d5a985'], [DR.stubble, 'rgba(110,90,90,0.22)']] });
    ctx.fillStyle = 'rgba(70,60,60,0.4)'; for (let i = 0; i < 60; i++) { const a = Math.PI * (0.12 + P.hash(i) * 0.76), d = 6.4 + P.hash(i + 50) * 2.2; ctx.fillRect(Math.cos(a) * d * 0.95, -46 + Math.sin(a) * d * 1.05, 0.3, 0.3); }
    strokeD(ctx, DR.eyes, 0.55, '#2a1a14'); strokeD(ctx, DR.bags, 0.3, 'rgba(120,80,70,0.6)'); strokeD(ctx, DR.brows, 0.5, '#3a2a22'); strokeD(ctx, DR.nose, 0.4, '#b58a6c'); strokeD(ctx, DR.mouth, 0.5, '#7a3e32');
    part(ctx, DR.hat, '#f1c21e', { sh: [[DR.hatSh, '#cc9a10']], hi: [[DR.hatHi, 'rgba(255,255,255,0.6)']] });
    strokeD(ctx, 'M 0 -60.4 C 0.2 -57 0.2 -53 0 -50.4', LW * 0.7, '#a8800c');
    part(ctx, DR.brim, '#e0ae14');
    ctx.save(); ctx.translate(-27, -40); ctx.rotate(-0.14);
    part(ctx, 'M -6 -8 L 6 -8 L 6 7 L -6 7 Z', '#fbf6ea', { w: LW * 0.8, hi: [['M -5 -7 L 5 -7 L 5 3 L -5 3 Z', '#9cc9e6']] });
    ctx.fillStyle = '#f3d6bd'; ctx.beginPath(); ctx.arc(0, -3.6, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a211d'; ctx.beginPath(); ctx.arc(-1.8, -4.4, 0.8, 0, TAU); ctx.arc(1.8, -4.4, 0.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ef8fb0'; ctx.beginPath(); ctx.moveTo(-2, 2.4); ctx.lineTo(2, 2.4); ctx.lineTo(1.1, -1.8); ctx.lineTo(-1.1, -1.8); ctx.closePath(); ctx.fill();
    ctx.translate(0, 9); ctx.rotate(Math.PI); handFn('adult', '#ecc6a3', '#d5a985')(ctx);
    ctx.restore();
    ctx.restore();
  };

  // ================================================ 絮絮 Xuxu (dandelion spirit)
  K.xuxu = (ctx, t, x, y, r, o = {}) => {
    const a = o.alpha ?? 1; if (a <= 0.01) return;
    y += Math.sin(t * 1.7 + x * 0.013) * r * 0.1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.fillStyle = P.rg(ctx, 0, 0, r * 0.3, r * 2.3, [[0, 'rgba(255,250,228,0.5)'], [1, 'rgba(255,250,228,0)']]); ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, TAU); ctx.fill();
    ctx.fillStyle = P.rg(ctx, -r * 0.25, -r * 0.3, r * 0.1, r * 1.0, [[0, 'rgba(255,255,255,1)'], [0.62, 'rgba(242,246,252,0.97)'], [0.82, 'rgba(214,224,240,0.6)'], [1, 'rgba(196,208,230,0)']]); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = P.rg(ctx, r * 0.35, r * 0.4, r * 0.1, r * 0.9, [[0, 'rgba(170,186,216,0.35)'], [1, 'rgba(170,186,216,0)']]); ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, TAU); ctx.fill();
    const n = Math.round(clamp(r * 2.6, 70, 560)), rot = t * 0.04; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + P.hash(i * 7 + 3) * 0.2 + rot, len = r * (0.8 + P.hash(i * 13 + 5) * 0.26), ca = Math.cos(ang), sa = Math.sin(ang);
      const sh = 0.5 - (ca * -0.6 + sa * -0.8) * 0.5, a0 = r > 120 ? 0.55 : 0.9;
      ctx.strokeStyle = sh > 0.62 ? `rgba(182,196,224,${a0})` : `rgba(255,255,255,${a0})`; ctx.lineWidth = Math.max(0.6, r * 0.009);
      ctx.beginPath(); ctx.moveTo(ca * r * 0.5, sa * r * 0.5); ctx.lineTo(ca * len, sa * len); ctx.stroke();
      const tx = ca * len, ty = sa * len, pl = r * 0.06; ctx.lineWidth = Math.max(0.4, r * 0.005); ctx.beginPath();
      for (let k = -2; k <= 2; k++) { const b = ang + k * 0.33; ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(b) * pl, ty + Math.sin(b) * pl); }
      ctx.stroke();
    }
    // inner fluff: short soft strokes that make the ball read as down, not spikes
    ctx.lineWidth = Math.max(1, r * 0.02);
    for (let i = 0; i < n * 0.6; i++) { const ang = P.hash(i + 900) * TAU, d0 = r * (0.3 + P.hash(i + 901) * 0.45), l = r * (0.12 + P.hash(i + 902) * 0.18); ctx.strokeStyle = `rgba(255,255,255,${0.25 + P.hash(i + 903) * 0.3})`; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * d0, Math.sin(ang) * d0); ctx.lineTo(Math.cos(ang) * (d0 + l), Math.sin(ang) * (d0 + l)); ctx.stroke(); }
    const cl = blink(t, 2.3);
    for (const sx of [-1, 1]) {
      const ex = sx * r * 0.23, ey = r * 0.06;
      if (cl) { ctx.strokeStyle = '#1b1414'; ctx.lineWidth = Math.max(1, r * 0.035); ctx.beginPath(); ctx.arc(ex, ey - r * 0.02, r * 0.07, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
      else { P.circle(ctx, ex, ey, r * 0.085, '#16100f'); P.circle(ctx, ex + r * 0.03, ey - r * 0.03, r * 0.03, '#ffffff'); }
      P.ell(ctx, ex + sx * r * 0.07, ey + r * 0.14, r * 0.08, r * 0.045, 'rgba(255,160,160,0.35)');
    }
    ctx.save(); ctx.translate(r * 0.04, -r * 0.86); ctx.rotate(Math.sin(t * 2.1) * 0.18);
    ctx.strokeStyle = '#4f8f3a'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.02, -r * 0.12, r * 0.05, -r * 0.2); ctx.stroke();
    P.ell(ctx, r * 0.15, -r * 0.24, r * 0.15, r * 0.065, '#6cc04f', -0.5);
    ctx.strokeStyle = '#3d7d2c'; ctx.lineWidth = Math.max(0.6, r * 0.012); ctx.beginPath(); ctx.moveTo(r * 0.03, -r * 0.18); ctx.lineTo(r * 0.27, -r * 0.31); ctx.stroke();
    ctx.restore();
    ctx.restore();
  };
  K.xuxuBig = (ctx, t, x, y, s, o = {}) => {
    const r = 230 * s, a = o.dissolve ? clamp(1 - (o.p || 0) * 1.25, 0, 1) : 1, bob = Math.sin(t * 1.7 + x * 0.013) * r * 0.1;
    K.xuxu(ctx, t, x, y, r, { alpha: a });
    if (o.rider) {
      K.girl(ctx, t, x - r * 0.04, y + bob - r * 0.46, (r * 0.8) / 250, { pose: 'ride', seed: 3 });
      ctx.save(); ctx.translate(x, y + bob); ctx.lineCap = 'round';
      for (let i = 0; i < 90; i++) { const ang = -Math.PI * (0.2 + 0.6 * (i / 90)) + Math.sin(i * 3.1) * 0.05, l0 = r * 0.3, l1 = r * (0.8 + P.hash(i + 3) * 0.28); ctx.strokeStyle = `rgba(255,255,255,${0.55 + P.hash(i) * 0.4})`; ctx.lineWidth = Math.max(0.8, r * 0.011); ctx.beginPath(); ctx.moveTo(Math.cos(ang) * l0, Math.sin(ang) * l0 * 0.55); ctx.lineTo(Math.cos(ang) * l1, Math.sin(ang) * l1 * 0.5); ctx.stroke(); }
      ctx.restore();
    }
  };

  // ================================================ 灰先生 Mister Grey (fog)
  let fogSprite = null;
  function makeFog() {
    const w = 440, h = 800, c = P.canvas(w, h), x = c.getContext('2d'), r = P.rng(31);
    for (let i = 0; i < 190; i++) {
      const k = r(), yy = h - 10 - k * h * 0.74, spread = (1 - k) * 130 + 60, xx = w / 2 + (r() - 0.5) * spread * 1.3, rr = 34 + r() * 64 * (1 - k * 0.45);
      x.fillStyle = P.rg(x, xx, yy, 0, rr, [[0, `rgba(${84 + (r() * 30) | 0},${88 + (r() * 30) | 0},${98 + (r() * 30) | 0},0.42)`], [1, 'rgba(100,104,112,0)']]); x.beginPath(); x.arc(xx, yy, rr, 0, TAU); x.fill();
    }
    const hy = h * 0.2;
    x.fillStyle = 'rgba(66,68,78,0.88)'; x.beginPath(); x.roundRect(w / 2 - 56, hy - 128, 112, 128, 14); x.fill(); x.beginPath(); x.ellipse(w / 2, hy, 112, 17, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(36,36,44,0.6)'; x.fillRect(w / 2 - 56, hy - 34, 112, 15);
    for (let i = 0; i < 40; i++) { const xx = w / 2 + (r() - 0.5) * 240, yy = hy + (r() - 0.6) * 60, rr = 16 + r() * 26; x.fillStyle = P.rg(x, xx, yy, 0, rr, [[0, 'rgba(130,134,142,0.18)'], [1, 'rgba(130,134,142,0)']]); x.beginPath(); x.arc(xx, yy, rr, 0, TAU); x.fill(); }
    for (const sx of [-1, 1]) { x.fillStyle = P.rg(x, w / 2 + sx * 32, hy + 66, 0, 15, [[0, 'rgba(228,232,240,0.6)'], [1, 'rgba(228,232,240,0)']]); x.beginPath(); x.arc(w / 2 + sx * 32, hy + 66, 15, 0, TAU); x.fill(); }
    return c;
  }
  K.fogman = (ctx, t, x, y, s) => {
    fogSprite = fogSprite || makeFog(); const h = 380 * s, w = (h * fogSprite.width) / fogSprite.height;
    ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, Math.sin(t * 0.6) * 0.05, 1, 0, 0); ctx.globalAlpha = 0.95; ctx.drawImage(fogSprite, -w / 2, -h, w, h); ctx.restore();
  };
  // ------------------------------------------------- 铁犀牛 the Iron Rhino
  const RH = {
    track: 'M -58 -27 L 44 -27 C 52 -27 58 -21 58 -13.5 C 58 -6 52 0 44 0 L -58 0 C -66 0 -72 -6 -72 -13.5 C -72 -21 -66 -27 -58 -27 Z',
    trackHi: 'M -58 -27 L 44 -27 C 50 -27 54 -24.4 56 -21.6 L -70 -21.6 C -68 -24.4 -64 -27 -58 -27 Z',
    body: 'M -76 -30 L -76 -58 C -76 -63.6 -72 -67 -67 -67 L 30 -67 C 37 -67 41 -63 42.6 -56 L 47 -30 Z',
    bodySh: 'M -78 -46 C -40 -44 10 -44 50 -46 L 50 -28 L -78 -28 Z',
    bodyHi: 'M -74 -64 C -40 -66 0 -66 36 -65 L 36 -62.6 C 0 -63.6 -40 -63.6 -74 -61.6 Z',
    rust: 'M -62 -60 C -63 -56 -62 -50 -60 -47 C -59 -51 -59.6 -56 -62 -60 Z M -30 -58 C -31.6 -54 -31 -48 -28.6 -45 C -28 -49 -28.4 -54 -30 -58 Z M 6 -61 C 4.8 -57 5.4 -52 7.4 -48.6 C 8 -52 7.6 -57 6 -61 Z M 30 -58 C 29 -54 29.6 -50 31.4 -47 C 32 -50 31.6 -55 30 -58 Z M -46 -40 C -48 -36 -47 -33 -45 -31 C -44 -34 -44.4 -37 -46 -40 Z',
    grille: 'M -70 -60 L -70 -40 M -66 -60 L -66 -40 M -62 -60 L -62 -40 M -58 -60 L -58 -40 M -76 -46 C -40 -44 10 -44 47 -46',
    cab: 'M -6 -67 L -6 -103 C -6 -108 -3 -111 2 -111 L 27 -111 C 32 -111 35 -108 35 -100 L 35 -67 Z',
    cabSh: 'M 24 -112 L 24 -66 L 37 -66 L 37 -112 Z',
    glass: 'M -1 -105 L 28 -105 C 29.2 -105 30 -104.2 30 -103 L 30 -80 L -1 -80 Z',
    glassHi: 'M 3 -80 L 13 -105 L 18 -105 L 8 -80 Z',
    boom: 'M 0 -6 C 30 -12 58 -8 60 -4.4 L 60 5 C 30 -1 0 6 0 6 Z',
    stick: 'M -4 -4 L 34 -4 C 36 -4 37 -3 37 0 C 37 3 36 4 34 4 L -4 4 C -6 4 -7 3 -7 0 C -7 -3 -6 -4 -4 -4 Z',
    bucket: 'M -4 -6 C 14 -10 18 -2 18 4 L 2 9 C -5 4 -5 -2 -4 -6 Z',
    lamp: 'M -5.4 0 C -5.4 -7.2 5.4 -7.2 5.4 0 C 5.4 7.2 -5.4 7.2 -5.4 0 Z',
    lens: 'M -3.9 0 C -3.9 -5.2 3.9 -5.2 3.9 0 C 3.9 5.2 -3.9 5.2 -3.9 0 Z',
  };
  K.rhino = (ctx, t, x, y, s, o = {}) => {
    const u = 3 * s, sad = !!o.sad, night = !!o.night, rum = sad ? 0 : Math.sin(t * 23) * 0.25;
    ctx.save(); ctx.translate(x, y + rum * u); ctx.scale(u, u); setLW(u, s, 1.2);
    footShadow(ctx, 80, 6, 0.3);
    const Y = '#e2ae2c', YS = '#b8851f', YL = '#f6d46e';
    part(ctx, RH.track, '#3a3a40', { hi: [[RH.trackHi, '#55555c']] });
    ctx.fillStyle = '#25252a'; for (let i = -66; i < 54; i += 5.6) { ctx.fillRect(i, -27, 1.6, 3.4); ctx.fillRect(i, -3.4, 1.6, 3.4); }
    for (let i = -57; i <= 46; i += 17) { part(ctx, `M ${i - 7.2} -13.5 C ${i - 7.2} -23 ${i + 7.2} -23 ${i + 7.2} -13.5 C ${i + 7.2} -4 ${i - 7.2} -4 ${i - 7.2} -13.5 Z`, '#5c5c64', { w: LW * 0.8, sh: [[`M ${i + 1} -22 L ${i + 8} -22 L ${i + 8} -4 L ${i + 1} -4 Z`, '#46464d']] }); ctx.fillStyle = '#2b2b30'; ctx.beginPath(); ctx.arc(i, -13.5, 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(105,78,50,0.55)'; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.ellipse(-66 + P.hash(i) * 120, -2.5 - P.hash(i + 9) * 6, 2 + P.hash(i + 3) * 3.4, 1.2 + P.hash(i + 4) * 1.6, 0, 0, TAU); ctx.fill(); }
    part(ctx, RH.body, Y, { sh: [[RH.bodySh, YS], [RH.rust, 'rgba(140,66,24,0.42)']], hi: [[RH.bodyHi, YL]] });
    strokeD(ctx, RH.grille, LW * 0.6, '#7a5a1a');
    ctx.fillStyle = '#8a6a1a'; for (let i = -70; i < 40; i += 9) { ctx.beginPath(); ctx.arc(i, -63.4, 0.75, 0, TAU); ctx.arc(i + 0.01, -33.4, 0.75, 0, TAU); ctx.fill(); }
    part(ctx, RH.cab, Y, { sh: [[RH.cabSh, YS], ['M -6 -70 L 35 -70 L 35 -67 L -6 -67 Z', YS]] });
    part(ctx, RH.glass, night ? '#2a3a58' : '#a9c8d8', { w: LW * 0.8, sh: night ? [['M -1 -100 L 30 -100 L 30 -84 L -1 -84 Z', 'rgba(255,196,120,0.55)']] : [], hi: [[RH.glassHi, 'rgba(255,255,255,0.35)']] });
    const lift = sad ? 0.55 : Math.sin(t * 0.9) * 0.12;
    ctx.save(); ctx.translate(33, -62); ctx.rotate(-0.85 + lift);
    part(ctx, RH.boom, Y, { sh: [['M 0 1.4 C 30 -2.6 58 -0.6 61 1.4 L 61 6 L 0 6 Z', YS]], hi: [['M 0 -6 C 30 -12 58 -8 60 -4.4 L 60 -3 C 30 -6.4 0 -3.6 0 -3.6 Z', YL]] });
    strokeD(ctx, 'M 6 -2 L 22 -4 M 30 -4.6 L 46 -4', LW * 0.5, '#7a5a1a');
    ctx.translate(58, 0); ctx.rotate(1.75 - lift * 0.6);
    part(ctx, RH.stick, Y, { sh: [['M -7 0.8 L 37 0.8 L 37 5 L -7 5 Z', YS]] });
    ctx.translate(34, 0);
    part(ctx, RH.bucket, '#6a6a70', { sh: [['M 5 0 L 22 0 L 22 12 L 5 12 Z', '#4b4b50']] });
    ctx.fillStyle = '#d8d8dc'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(4 + i * 3.6, 8.4 - i * 1.4); ctx.lineTo(6 + i * 3.6, 11.8 - i * 1.4); ctx.lineTo(7.6 + i * 3.6, 7.4 - i * 1.4); ctx.fill(); }
    ctx.restore();
    for (const [ex, ey] of [[37.4, -52], [37.4, -40]]) {
      if (!sad && night) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = P.lg(ctx, ex, ey, ex + 160, ey, [[0, 'rgba(255,240,180,0.35)'], [1, 'rgba(255,240,180,0)']]); ctx.beginPath(); ctx.moveTo(ex, ey - 3); ctx.lineTo(ex + 170, ey - 40); ctx.lineTo(ex + 170, ey + 40); ctx.lineTo(ex, ey + 3); ctx.closePath(); ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.translate(ex, ey); part(ctx, RH.lamp, '#2c2c30'); part(ctx, RH.lens, sad ? '#b8984a' : '#fff4c4', { line: false, sh: [['M -4 1.6 L 4 1.6 L 4 5 L -4 5 Z', sad ? '#9a7a34' : '#f2e2a0']] });
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(1.4, -1.4, 1.1, 1.1, 0, 0, TAU); ctx.fill(); ctx.restore();
      if (!sad) P.glow(ctx, ex + 1, ey, 22, '#fff1b0', night ? 0.9 : 0.45);
      if (sad) { const d = (t * 0.55 + ey * 0.01) % 1; part(ctx, `M ${ex - 0.6} ${ey + 4} L ${ex + 0.8} ${ey + 4} L ${ex + 0.8} ${ey + 4 + d * 15} C ${ex + 2} ${ey + 6 + d * 15} ${ex - 1.8} ${ey + 6 + d * 15} ${ex - 0.6} ${ey + 4 + d * 15} Z`, '#9b4a1e', { w: LW * 0.5 }); }
    }
    ctx.restore();
  };

  // ------------------------------------------------- neighbours waving
  K.person = (ctx, t, x, y, h, col, o = {}) => {
    const u = h / 100, sc = P.css(P.mix(col, '#1a1020', 0.3));
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u); setLW(u, 0.6, 1.2);
    footShadow(ctx, 12, 2.2, 0.2);
    for (const m of [0, 1]) { const D = (d) => (m ? mx(d) : d); part(ctx, D('M -7 -44 C -7.2 -30 -7 -14 -6.4 -2.4 L -1.6 -2.4 C -1.2 -14 -1 -30 -0.8 -44 Z'), '#3d3f48'); part(ctx, D('M -7.2 -2.8 C -8 -1.2 -7.4 0.6 -5.4 0.6 L -1.4 0.6 C -0.8 0 -1 -1.8 -1.6 -2.8 Z'), '#2a2628'); }
    part(ctx, 'M -9.6 -80 C -12 -66 -12.4 -54 -12 -40 L 12 -40 C 12.4 -54 12 -66 9.6 -80 C 4 -82.6 -4 -82.6 -9.6 -80 Z', col, { sh: [['M 4 -82 C 8 -70 8.6 -56 8 -40 L 14 -40 L 14 -82 Z', sc]] });
    const wa = o.wave ? 2.6 + Math.sin(t * 6 + x) * 0.35 : 0.14;
    for (const [sx, a] of [[-1, 0.14], [1, wa]]) { const S = [sx * 9.6, -76], [E, Wr] = joints(S, sx, a, -0.2, 14, 13); sleeve(ctx, S, E, Wr, [5.6, 5, 5], col, sc, { hand: handFn('adult', '#f1d0b4', '#d9b090'), mirror: sx > 0 }); }
    part(ctx, 'M -6.4 -92 C -6.8 -86 -4.6 -81.4 0 -81.4 C 4.6 -81.4 6.8 -86 6.4 -92 Z', '#f1d0b4', { sh: [['M 3.6 -92 C 5.6 -88 4.6 -83.4 1 -81.6 L 7 -81 L 7 -92 Z', '#d9b090']] });
    part(ctx, 'M -7 -89 C -8 -96.6 -3.6 -100.6 0.6 -100.4 C 5 -100.2 8.2 -96.4 7 -89 C 5.6 -92.4 3 -94 0 -94 C -3 -94 -5.6 -92.4 -7 -89 Z', o.hair || '#2a2420');
    ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.arc(-2.4, -88, 0.7, 0, TAU); ctx.arc(2.4, -88, 0.7, 0, TAU); ctx.fill();
    strokeD(ctx, 'M -1.4 -84.6 C -0.4 -84 0.6 -84 1.4 -84.6', 0.5, '#8a4a3a');
    ctx.restore();
  };
  K.pigeon = (ctx, t, x, y, s, seed = 0) => {
    const peck = Math.max(0, Math.sin(t * 2.5 + seed * 2)) > 0.92 ? 2.5 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    E(ctx, 0, -7, 9, 6); ctx.fillStyle = '#8f98a6'; ctx.fill(); E(ctx, 2, -7.5, 6, 3.5, -0.2); ctx.fillStyle = '#727b8a'; ctx.fill();
    E(ctx, 8, -12 + peck, 3.6, 3.4); ctx.fillStyle = '#8f98a6'; ctx.fill(); E(ctx, 6.5, -10.5 + peck, 2.2, 2); ctx.fillStyle = '#6aa38a'; ctx.fill();
    ctx.fillStyle = '#e0a03a'; ctx.beginPath(); ctx.moveTo(11.4, -12 + peck); ctx.lineTo(14, -11 + peck); ctx.lineTo(11.4, -10.4 + peck); ctx.fill();
    P.circle(ctx, 9, -12.8 + peck, 0.8, '#1a1a1a'); ctx.fillStyle = '#5a6270'; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-14, -6); ctx.lineTo(-8, -4.5); ctx.fill();
    ctx.strokeStyle = '#d07a6a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1, -1.5); ctx.lineTo(-1.5, 1); ctx.moveTo(2, -1.5); ctx.lineTo(2.5, 1); ctx.stroke();
    ctx.restore();
  };

  window.K = K;
})();
