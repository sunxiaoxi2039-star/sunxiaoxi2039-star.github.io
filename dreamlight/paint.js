/* 小芽与风的种子 · paint.js
 * Painterly toolkit for the procedural renderer: seeded noise, gouache paper
 * textures, cel-shaded cumulus clouds, foliage, brick, windows, power lines,
 * wet ground and light. Everything is deterministic (seeded) so the web
 * player and the MP4 renderer produce identical frames.
 */
(function () {
  'use strict';
  const W = 1280, H = 720, M = 96, TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const P = { W, H, M, TAU, clamp, lerp, smooth };

  // ---------- seeded randomness & value noise ----------
  P.rng = (seed) => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  P.hash = (n) => { n = (Math.imul(n | 0, 374761393) + 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  P.seedOf = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const LAT = new Float32Array(4096); { const r = P.rng(97); for (let i = 0; i < 4096; i++) LAT[i] = r(); }
  const lat = (x, y) => LAT[(Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) & 4095];
  const wrap = (v, p) => ((v % p) + p) % p;
  function vnoise(x, y, px, py) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    let ix = x0, iy = y0, ix1 = x0 + 1, iy1 = y0 + 1;
    if (px) { ix = wrap(ix, px); ix1 = wrap(ix1, px); }
    if (py) { iy = wrap(iy, py); iy1 = wrap(iy1, py); }
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = lat(ix, iy), b = lat(ix1, iy), c = lat(ix, iy1), d = lat(ix1, iy1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  P.noise = (x, y) => vnoise(x, y);
  P.pfbm = (x, y, px, o = 4) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f + i * 17, y * f - i * 9, px * f, 0); n += a; a *= 0.5; f *= 2; } return s / n; };
  P.fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= 0.5; f *= 2.03; } return s / n; };

  // ---------- colour ----------
  P.rgb = (c) => { if (Array.isArray(c)) return c; const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  P.mix = (a, b, t) => { a = P.rgb(a); b = P.rgb(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
  P.css = (c, a = 1) => { if (typeof c === 'string' && (a === 1 || c[0] !== '#')) return c; c = P.rgb(c); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
  P.ramp = (cols, t) => { t = clamp(t, 0, 1) * (cols.length - 1); const i = Math.min(cols.length - 2, Math.floor(t)); return P.mix(cols[i], cols[i + 1], t - i); };
  P.vary = (c, r, amt) => { c = P.rgb(c); const k = 1 + (r() - 0.5) * 2 * amt, h = (r() - 0.5) * amt * 30; return [clamp(c[0] * k + h, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k - h * 0.6, 0, 255)]; };

  // ---------- canvas helpers ----------
  P.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  P.layer = () => { const c = P.canvas(W + 2 * M, H + 2 * M), x = c.getContext('2d'); x.translate(M, M); return { c, x }; };
  const stops = (g, cols) => { cols.forEach((c, i) => { if (Array.isArray(c) && c.length === 2) g.addColorStop(c[0], P.css(c[1])); else g.addColorStop(cols.length > 1 ? i / (cols.length - 1) : 0, P.css(c)); }); return g; };
  P.vg = (ctx, y0, y1, cols) => stops(ctx.createLinearGradient(0, y0, 0, y1), cols);
  P.lg = (ctx, x0, y0, x1, y1, cols) => stops(ctx.createLinearGradient(x0, y0, x1, y1), cols);
  P.rg = (ctx, x, y, r0, r1, cols) => stops(ctx.createRadialGradient(x, y, r0, x, y, r1), cols);
  P.paint = (ctx, f) => { ctx.fillStyle = (typeof f === 'string' || f instanceof CanvasGradient || f instanceof CanvasPattern) ? f : P.css(f); ctx.fill(); };
  P.circle = (ctx, x, y, r, f) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); P.paint(ctx, f); };
  P.ell = (ctx, x, y, rx, ry, f, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); P.paint(ctx, f); };
  P.box = (ctx, x, y, w, h, f) => { ctx.beginPath(); ctx.rect(x, y, w, h); P.paint(ctx, f); };
  P.rbox = (ctx, x, y, w, h, r, f) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); P.paint(ctx, f); };
  P.poly = (ctx, pts, close = true) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); };
  P.stroke = (ctx, col, w = 1) => { ctx.strokeStyle = P.css(col); ctx.lineWidth = w; ctx.stroke(); };
  P.line = (ctx, pts, col, w = 1) => { P.poly(ctx, pts, false); P.stroke(ctx, col, w); };
  P.blob = (ctx, cx, cy, rx, ry, seed, amp = 0.14, n = 64) => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU, k = 1 + (P.noise(Math.cos(a) * 1.7 + seed * 3.1, Math.sin(a) * 1.7 - seed * 1.7) - 0.5) * 2 * amp;
      const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  // soft-edged mark: blurred copy of a filled path (used for washes, stains, glows)
  P.soft = (ctx, blur, fn) => { ctx.save(); ctx.filter = `blur(${blur}px)`; fn(ctx); ctx.restore(); };

  // ---------- gouache / paper textures (tileable grey maps for soft-light) ----------
  const TILE = 256; let TEX = null;
  function tile(fn) {
    const c = P.canvas(TILE, TILE), x = c.getContext('2d'), im = x.createImageData(TILE, TILE), d = im.data;
    for (let j = 0; j < TILE; j++) for (let i = 0; i < TILE; i++) { const v = clamp(fn(i, j), 0, 1) * 255, k = (j * TILE + i) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
    x.putImageData(im, 0, 0); return c;
  }
  P.textures = () => {
    if (TEX) return TEX; const r = P.rng(5), pn = vnoise;
    TEX = {
      paper: tile((i, j) => 0.5 + (pn(i / 16, j / 16, 16, 16) - 0.5) * 0.3 + (pn(i / 4, j / 4, 64, 64) - 0.5) * 0.3 + (r() - 0.5) * 0.18),
      hs: tile((i, j) => 0.5 + (pn(i / 32, j / 4, 8, 64) - 0.5) * 0.7 + (pn(i / 8, j / 2, 32, 128) - 0.5) * 0.3 + (r() - 0.5) * 0.06),
      vs: tile((i, j) => 0.5 + (pn(i / 4, j / 32, 64, 8) - 0.5) * 0.7 + (pn(i / 2, j / 8, 128, 32) - 0.5) * 0.3 + (r() - 0.5) * 0.06),
      blot: tile((i, j) => 0.5 + (pn(i / 32, j / 32, 8, 8) - 0.5) * 0.85 + (pn(i / 8, j / 8, 32, 32) - 0.5) * 0.35 + (pn(i / 2, j / 2, 128, 128) - 0.5) * 0.14),
    };
    return TEX;
  };
  P.tex = (ctx, name, a, mode = 'soft-light', rect = null, scale = 1) => {
    const pat = ctx.createPattern(P.textures()[name], 'repeat');
    if (scale !== 1 && pat.setTransform) pat.setTransform(new DOMMatrix().scale(scale));
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = mode; ctx.fillStyle = pat;
    if (rect) ctx.fillRect(rect[0], rect[1], rect[2], rect[3]); else ctx.fill();
    ctx.restore();
  };

  // ---------- sky, sun, moon, stars ----------
  P.SKY = {
    day: ['#2766c2', '#3f84d4', '#7db3e6', '#d3e9f4'],
    morning: ['#4a8ad4', '#82b6e5', '#c5e0f0', '#f3f4ea'],
    gold: ['#3d77c0', '#83aed8', '#eed4ad', '#ffe7c2'],
    sunset: ['#34478e', '#7a639e', '#e88f77', '#ffd39b'],
    dusk: ['#1b2250', '#423d73', '#97658a', '#e39a86'],
    dawn: ['#5878c0', '#a1a1ce', '#efbeb8', '#ffe4c8'],
    rain: ['#46536a', '#5f6d84', '#8290a2', '#a7b0bb'],
    night: ['#0a1130', '#132156', '#21356b', '#3a4f84'],
    grey: ['#676a71', '#82858b', '#9ea1a6', '#b9bbbe'],
  };
  P.sky = (ctx, name, horizon = H) => {
    ctx.fillStyle = P.vg(ctx, -M, horizon, P.SKY[name] || name); ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    P.tex(ctx, 'blot', 0.16, 'soft-light', [-M, -M, W + 2 * M, H + 2 * M], 3.5); P.tex(ctx, 'hs', 0.08, 'soft-light', [-M, -M, W + 2 * M, H + 2 * M], 3);
  };
  P.glow = (ctx, x, y, r, col, a = 1, mode = 'lighter') => {
    ctx.save(); ctx.globalCompositeOperation = mode; const c = P.rgb(col);
    ctx.fillStyle = P.rg(ctx, x, y, 0, r, [[0, P.css(c, 0.55 * a)], [0.3, P.css(c, 0.22 * a)], [1, P.css(c, 0)]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  };
  P.moon = (ctx, x, y, r) => {
    P.glow(ctx, x, y, r * 7, '#b9c8ff', 0.45, 'screen'); P.glow(ctx, x, y, r * 2.6, '#fff4d2', 0.55, 'screen');
    ctx.fillStyle = P.rg(ctx, x - r * 0.35, y - r * 0.35, r * 0.1, r * 1.05, ['#fffef4', '#f4e7bd']); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    [[0.3, -0.2, 0.26], [-0.28, 0.22, 0.2], [0.12, 0.42, 0.13], [-0.1, -0.38, 0.1]].forEach(([dx, dy, rr]) => P.circle(ctx, x + dx * r, y + dy * r, rr * r, 'rgba(196,178,140,0.2)'));
  };
  P.stars = (ctx, seed, n, yMax, t = 0) => {
    const r = P.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * (W + 2 * M) - M, y = r() * yMax - M * 0.5, s = r(), tw = 0.6 + 0.4 * Math.sin(t * (0.8 + s * 2) + i * 1.7);
      ctx.fillStyle = `rgba(255,250,232,${(0.2 + s * 0.65) * tw})`; ctx.fillRect(x, y, 0.8 + s * 1.5, 0.8 + s * 1.5);
      if (s > 0.95) { ctx.fillStyle = `rgba(255,250,232,${0.35 * tw})`; ctx.fillRect(x - 4, y + 0.5, 9, 0.8); ctx.fillRect(x + 0.5, y - 4, 0.8, 9); }
    }
  };
  P.rays = (ctx, x, y, ang, len, n, spread, col, a, seed) => {
    const r = P.rng(seed); ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const a0 = ang + (r() - 0.5) * spread, w = 0.015 + r() * 0.045;
      const x1 = x + Math.cos(a0 - w) * len, y1 = y + Math.sin(a0 - w) * len, x2 = x + Math.cos(a0 + w) * len, y2 = y + Math.sin(a0 + w) * len;
      ctx.fillStyle = P.lg(ctx, x, y, (x1 + x2) / 2, (y1 + y2) / 2, [[0, P.css(col, a * (0.4 + r() * 0.6))], [1, P.css(col, 0)]]);
      P.poly(ctx, [[x, y], [x1, y1], [x2, y2]]); ctx.fill();
    }
    ctx.restore();
  };

  // ---------- cel-shaded cumulus (union-of-spheres height field) ----------
  P.CLOUD = {
    day: { cols: ['#8493bb', '#a9b5d3', '#d7dded', '#f5f6f8', '#ffffff'], L: [-0.42, -0.72, 0.55] },
    morning: { cols: ['#8f9cc0', '#b3bfd9', '#dfe5f0', '#f7f8f9', '#ffffff'], L: [-0.42, -0.72, 0.55] },
    gold: { cols: ['#97879f', '#c4a5a1', '#ecd2b5', '#fff0da', '#fffaf0'], L: [-0.55, -0.6, 0.55] },
    sunset: { cols: ['#6a5a8a', '#a87896', '#e69a85', '#ffc993', '#fff0cf'], L: [-0.65, -0.3, 0.6] },
    dusk: { cols: ['#3d3b66', '#5e5885', '#917ea0', '#d3a2a8', '#f6d1c0'], L: [-0.65, -0.3, 0.55] },
    dawn: { cols: ['#8783b4', '#b3a5c8', '#e7c3c8', '#ffe0d2', '#fff6ee'], L: [-0.65, -0.15, 0.6] },
    rain: { cols: ['#56606f', '#6b7584', '#87909e', '#a3abb6', '#bec4cc'], L: [-0.3, -0.8, 0.5] },
    night: { cols: ['#18213f', '#26315a', '#3b4872', '#64739e', '#a2b0d2'], L: [0.5, -0.6, 0.6] },
    grey: { cols: ['#6b6e75', '#80838a', '#999ca2', '#b5b7bb', '#cfd0d2'], L: [-0.3, -0.8, 0.5] },
  };
  function whale(C, w, h, r, base) {
    // body: big rounded head on the left, tapering along a gentle arc to the tail
    const n = 18;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), x = w * (0.17 + 0.58 * t), th = h * (0.24 * Math.pow(1 - t, 0.7) + 0.04), y = base - th * 0.9 - h * 0.12 * t * t;
      C.push([x, y, th, 0]);
      if (t < 0.7 && r() < 0.8) C.push([x + (r() - 0.5) * w * 0.02, y - th * 0.55, th * (0.45 + r() * 0.2), th * 0.3]);
    }
    // tail stalk curving up (dense, so it reads as one shape), then two broad flukes
    for (let i = 0; i < 12; i++) { const t = i / 11; C.push([w * (0.74 + 0.1 * t), base - h * (0.16 + 0.2 * t * t), h * (0.075 - 0.025 * t), 0]); }
    C.push([w * 0.8, base - h * 0.43, h * 0.085, 0], [w * 0.86, base - h * 0.4, h * 0.08, 0], [w * 0.92, base - h * 0.44, h * 0.085, 0], [w * 0.96, base - h * 0.5, h * 0.06, 0], [w * 0.75, base - h * 0.49, h * 0.06, 0]);
    // flipper
    C.push([w * 0.3, base - h * 0.05, h * 0.06, h * 0.1], [w * 0.34, base - h * 0.01, h * 0.045, h * 0.1]);
  }
  function boxBlur(src, w, h, rad) {
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length), k = 1 / (2 * rad + 1);
    for (let y = 0; y < h; y++) { const row = y * w; let acc = 0; for (let x = -rad; x <= rad; x++) acc += src[row + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { tmp[row + x] = acc * k; acc += src[row + Math.min(w - 1, x + rad + 1)] - src[row + Math.max(0, x - rad)]; } }
    for (let x = 0; x < w; x++) { let acc = 0; for (let y = -rad; y <= rad; y++) acc += tmp[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = acc * k; acc += tmp[Math.min(h - 1, y + rad + 1) * w + x] - tmp[Math.max(0, y - rad) * w + x]; } }
    return out;
  }
  P.cumulus = (seed, w, h, pal, o = {}) => {
    w = Math.round(w); h = Math.round(h);
    const r = P.rng(seed), C = [], base = h * (o.base ?? 0.84);
    if (o.whale) whale(C, w, h, r, base);
    else {
      // envelope: a main tower plus side bumps, tapered at both ends
      const bumps = [[o.peakX ?? 0.32 + r() * 0.36, o.peak ?? 1, o.peakW ?? 0.2 + r() * 0.08]];
      const nb = o.bumps ?? 2 + ((r() * 3) | 0);
      for (let i = 0; i < nb; i++) bumps.push([0.12 + r() * 0.76, (o.side ?? 0.55) * (0.4 + r() * 0.6), 0.07 + r() * 0.1]);
      const g = (fx) => { let v = 0; for (const [bx, bh, bw] of bumps) v = Math.max(v, bh * Math.exp(-((fx - bx) ** 2) / (2 * bw * bw))); return v * smooth(0, 0.14, fx) * smooth(1, 0.86, fx); };
      const r0 = h * (o.r0 ?? 0.13), topY = (fx) => base - r0 * 0.9 - (base - r0 * 0.9 - h * 0.04 - r0) * g(fx) * (o.height ?? 1);
      // rows of puffs that follow the envelope; lower rows sit in front so lobes overlap
      for (let k = 0; k < 9; k++) {
        let any = false;
        for (let x = w * 0.05 + r() * r0 * 0.5; x < w * 0.95;) {
          const fx = x / w, gg = g(fx), rr = r0 * (0.55 + 0.8 * gg) * (0.75 + r() * 0.5) * (1 - k * 0.05);
          const y = topY(fx) + rr * 0.95 + k * r0 * (1.25 + r() * 0.25);
          if (y + rr * 0.15 < base && y - rr > 1 && x - rr > 0 && x + rr < w) { C.push([x, y, rr, k * r0 * 0.28 + (r() - 0.5) * rr * 0.25]); any = true; }
          x += rr * (0.62 + r() * 0.4);
        }
        if (!any && k > 1) break;
      }
      // small cauliflower detail on the upper rims
      const det = o.detail ?? 26, n0 = C.length;
      for (let k = 0; k < det; k++) {
        const p = C[(r() * n0) | 0], a = -Math.PI * (0.12 + r() * 0.76), rr = p[2] * (0.22 + r() * 0.2);
        const x = p[0] + Math.cos(a) * p[2] * 0.88, y = p[1] + Math.sin(a) * p[2] * 0.88;
        if (y - rr < 1 || x - rr < 1 || x + rr > w - 1 || y > base - 2) continue;
        C.push([x, y, rr, p[3] + rr * 0.35]);
      }
    }
    const N = w * h, HB = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
    let top = h;
    for (const [cx, cy, cr, cz] of C) {
      top = Math.min(top, cy - cr);
      const x0 = Math.max(0, Math.floor(cx - cr)), x1 = Math.min(w - 1, Math.ceil(cx + cr)), y0 = Math.max(0, Math.floor(cy - cr)), y1 = Math.min(h - 1, Math.ceil(cy + cr)), r2 = cr * cr;
      for (let y = y0; y <= y1; y++) {
        const dy = y - cy, dy2 = dy * dy; let i = y * w + x0;
        for (let x = x0; x <= x1; x++, i++) {
          const dx = x - cx, d2 = dx * dx + dy2; if (d2 >= r2) continue;
          const z = Math.sqrt(r2 - d2), zz = z + cz;
          if (zz > HB[i]) { HB[i] = zz; NX[i] = dx / cr; NY[i] = dy / cr; NZ[i] = z / cr; }
        }
      }
    }
    // soften the union-of-spheres into painted lobes: blur the height map, take its normals
    const HM = new Float32Array(N); for (let i = 0; i < N; i++) HM[i] = HB[i] > -1e8 ? HB[i] : 0;
    const rad = Math.max(2, Math.round(h * (o.r0 ?? 0.13) * (o.softR ?? 0.3))), HS = boxBlur(boxBlur(HM, w, h, rad), w, h, rad), soft = o.soft ?? 0.72;
    const pl = P.CLOUD[pal] || P.CLOUD.day, Lr = o.light || pl.L, Ll = Math.hypot(Lr[0], Lr[1], Lr[2]), L = [Lr[0] / Ll, Lr[1] / Ll, Lr[2] / Ll];
    const cols = pl.cols.map(P.rgb), nc = cols.length - 1;
    const cv = P.canvas(w, h), c2 = cv.getContext('2d'), im = c2.createImageData(w, h), D = im.data;
    const span = Math.max(1, base - top), cel = o.cel ?? 0.55, bd = o.bottomDark ?? 0.42, alpha = o.alpha ?? 1, lift = o.lift ?? 0;
    for (let y = 1; y < h - 1; y++) {
      const v = (y - top) / span;
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x; if (HB[i] < -1e8) continue;
        let gx = -(HS[i + 1] - HS[i - 1]) * 0.5, gy = -(HS[i + w] - HS[i - w]) * 0.5, gl = Math.hypot(gx, gy, 1);
        let nx = lerp(NX[i], gx / gl, soft), ny = lerp(NY[i], gy / gl, soft), nz = lerp(NZ[i], 1 / gl, soft); gl = Math.hypot(nx, ny, nz); nx /= gl; ny /= gl; nz /= gl;
        const lam = nx * L[0] + ny * L[1] + nz * L[2];
        let t = 0.5 + lift + lam * 0.6 - v * bd + (vnoise(x * 0.03, y * 0.03) - 0.5) * 0.08;
        t = lerp(t, Math.round(t * 4) / 4, cel); t = clamp(t, 0, 1) * nc;
        const ci = Math.min(nc - 1, Math.floor(t)), f = t - ci, ca = cols[ci], cb = cols[ci + 1];
        const bcut = base + (vnoise(x * 0.025, 7.3) - 0.5) * h * 0.05, a = y > bcut - 5 ? clamp((bcut - y) / 5, 0, 1) : 1;
        const k = i * 4; D[k] = ca[0] + (cb[0] - ca[0]) * f; D[k + 1] = ca[1] + (cb[1] - ca[1]) * f; D[k + 2] = ca[2] + (cb[2] - ca[2]) * f; D[k + 3] = 255 * a * alpha;
      }
    }
    c2.putImageData(im, 0, 0);
    const out = P.canvas(w, h), ox = out.getContext('2d'); ox.filter = 'blur(0.7px)'; ox.drawImage(cv, 0, 0); ox.filter = 'none';
    return out;
  };

  // ---------- landforms ----------
  P.ridge = (ctx, y, amp, scale, cols, seed, o = {}) => {
    ctx.beginPath(); ctx.moveTo(-M, H + M);
    for (let x = -M; x <= W + M; x += 5) ctx.lineTo(x, y - amp * P.fbm(x / scale + seed * 13.1, seed * 3.7, 4));
    ctx.lineTo(W + M, H + M); ctx.closePath();
    ctx.fillStyle = Array.isArray(cols) ? P.vg(ctx, y - amp, y + (o.depth || 160), cols) : cols; ctx.fill();
    if (o.tex !== false) P.tex(ctx, 'blot', o.texA ?? 0.3, 'soft-light', null, 2);
  };

  // ---------- foliage ----------
  P.GREENS = {
    day: ['#1a3526', '#2a5333', '#447f3a', '#7db14a', '#c2dc74'],
    morning: ['#1d3a2a', '#2f5d37', '#4b8a40', '#86bb54', '#cfe38a'],
    gold: ['#2b3320', '#495326', '#768535', '#b2ac49', '#eed47a'],
    sunset: ['#2a2130', '#45383e', '#6a5846', '#a37951', '#df9f65'],
    dusk: ['#1c1a2c', '#2c2b3f', '#424559', '#62696b', '#8c8d7a'],
    dawn: ['#263939', '#3a594b', '#5a7f5f', '#8fac78', '#d1d199'],
    night: ['#07101b', '#0e2027', '#163032', '#20443d', '#335f4f'],
    rain: ['#15231e', '#21362e', '#324e3e', '#4d6d54', '#77916d'],
    spring: ['#203f29', '#346936', '#579f43', '#96cb5b', '#d5ea8b'],
    grey: ['#2b2e30', '#3d4144', '#565b5d', '#747979', '#989c99'],
  };
  P.greens = (pal) => (P.GREENS[pal] || pal).map(P.rgb);
  P.leafBlob = (ctx, x, y, r, col, rnd, edge = 1) => {
    ctx.fillStyle = P.css(col); ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill();
    const n = Math.max(6, Math.round(r * 0.9 * edge));
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = r * (0.62 + rnd() * 0.32), lr = r * (0.15 + rnd() * 0.14);
      const lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d;
      ctx.moveTo(lx + lr, ly); ctx.ellipse(lx, ly, lr, lr * 0.62, a + Math.PI / 2 + (rnd() - 0.5), 0, TAU);
    }
    ctx.fill();
  };
  P.crown = (ctx, cx, cy, rx, ry, pal, seed, o = {}) => {
    const rnd = P.rng(seed), G = P.greens(pal), lx = o.lx ?? -0.3, ly = o.ly ?? -0.4;
    const n = o.n ?? Math.round((rx * ry) / 650) + 7, cl = [];
    for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()); cl.push([cx + Math.cos(a) * rx * d * 0.8, cy + Math.sin(a) * ry * d * 0.8, (rx + ry) * (0.15 + rnd() * 0.11)]); }
    cl.sort((a, b) => a[1] - b[1]);
    for (const [x, y, r] of cl) P.leafBlob(ctx, x, y + r * 0.15, r * 1.06, G[0], rnd);
    for (const [x, y, r] of cl) {
      P.leafBlob(ctx, x, y, r, G[1], rnd);
      P.leafBlob(ctx, x + lx * r * 0.45, y + ly * r * 0.45, r * 0.7, G[2], rnd);
      P.leafBlob(ctx, x + lx * r * 0.8, y + ly * r * 0.8, r * 0.38, G[3], rnd, 0.8);
      ctx.fillStyle = P.css(G[4], 0.85); ctx.beginPath();
      for (let k = 0; k < r * 0.45; k++) {
        const a = Math.atan2(ly, lx) + (rnd() - 0.5) * 1.6, d = r * (0.5 + rnd() * 0.45), s = 1.2 + rnd() * r * 0.07;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; ctx.moveTo(px + s, py); ctx.ellipse(px, py, s, s * 0.55, rnd() * 3, 0, TAU);
      }
      ctx.fill();
    }
  };
  P.trunk = (ctx, x, gy, h, w, col, seed, o = {}) => {
    const r = P.rng(seed), c = P.rgb(col || '#5a4637'), lean = o.lean || 0;
    ctx.fillStyle = P.lg(ctx, x - w, 0, x + w, 0, [P.mix(c, '#ffffff', 0.18), c, P.mix(c, '#000000', 0.38)]);
    ctx.beginPath(); ctx.moveTo(x - w, gy); ctx.bezierCurveTo(x - w * 0.75, gy - h * 0.4, x - w * 0.5 + lean * 0.5, gy - h * 0.7, x - w * 0.35 + lean, gy - h);
    ctx.lineTo(x + w * 0.35 + lean, gy - h); ctx.bezierCurveTo(x + w * 0.5 + lean * 0.5, gy - h * 0.7, x + w * 0.75, gy - h * 0.4, x + w, gy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = P.css(P.mix(c, '#000000', 0.25)); ctx.lineCap = 'round';
    for (let i = 0; i < (o.branches ?? 5); i++) {
      const by = gy - h * (0.5 + r() * 0.45), dir = r() < 0.5 ? -1 : 1, bl = h * (0.18 + r() * 0.22), bx = x + lean * ((gy - by) / h);
      ctx.lineWidth = w * (0.3 + r() * 0.2); ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + dir * bl * 0.5, by - bl * 0.25, bx + dir * bl, by - bl * (0.35 + r() * 0.4)); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30,20,15,0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < w * 0.8; i++) { const xx = x + (r() - 0.5) * w * 1.4, y0 = gy - r() * h * 0.8; ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx + (r() - 0.5) * 2, y0 - 6 - r() * 16); ctx.stroke(); }
  };
  P.tree = (ctx, x, gy, h, pal, seed, o = {}) => {
    P.trunk(ctx, x, gy, h * 0.72, h * (o.trunkW || 0.04), o.bark, seed, o);
    P.crown(ctx, x + (o.lean || 0), gy - h * (o.crownY || 0.66), h * 0.42 * (o.wide || 1), h * 0.33 * (o.tall || 1), pal, seed + 1, o);
  };
  P.grass = (ctx, x0, x1, y0, y1, pal, seed, o = {}) => {
    const r = P.rng(seed), G = P.greens(pal);
    if (o.base !== false) { ctx.fillStyle = P.vg(ctx, y0, y1, [G[2], G[1]]); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); P.tex(ctx, 'blot', 0.35, 'soft-light', [x0, y0, x1 - x0, y1 - y0], 1.5); }
    const n = Math.round(((x1 - x0) * (y1 - y0)) / (o.sparse || 45)), B = [[], [], [], [], []];
    for (let i = 0; i < n; i++) {
      const yy = y0 + Math.pow(r(), 0.8) * (y1 - y0), k = (yy - y0) / Math.max(1, y1 - y0);
      const ci = clamp(Math.floor(r() * 3 + (1 - k) * 1.8 + (r() < 0.12 ? 1 : 0)), 0, 4);
      B[ci].push([x0 + r() * (x1 - x0), yy, (3 + r() * 9) * (0.45 + k * 1.1) * (o.len || 1), (r() - 0.5) * 7]);
    }
    ctx.lineCap = 'round';
    B.forEach((b, ci) => { ctx.strokeStyle = P.css(G[ci]); ctx.lineWidth = o.lw || 1.4; ctx.beginPath(); for (const [x, y, l, le] of b) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + le * 0.3, y - l * 0.6, x + le, y - l); } ctx.stroke(); });
  };
  P.flowers = (ctx, x0, x1, y0, y1, n, cols, seed, size = 3) => {
    const r = P.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), s = size * (0.6 + r() * 0.8) * (0.6 + (y - y0) / Math.max(1, y1 - y0)), c = cols[(r() * cols.length) | 0];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; P.ell(ctx, x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.5, s * 0.6, s * 0.4, c, a); }
      P.circle(ctx, x, y, s * 0.35, '#f2c230');
    }
  };

  // ---------- buildings ----------
  P.bricks = (ctx, x, y, w, h, base, seed, o = {}) => {
    const r = P.rng(seed), bw = o.bw || 22, bh = o.bh || 9, b = P.rgb(base);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = P.css(P.mix(b, o.mortar || '#e4d2bf', 0.4)); ctx.fillRect(x, y, w, h);
    for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
      const off = row % 2 ? bw / 2 : 0;
      for (let xx = x - off; xx < x + w; xx += bw) {
        const c = P.vary(b, r, 0.11), k = r() < 0.07 ? 0.78 : r() < 0.06 ? 1.12 : 1;
        ctx.fillStyle = P.css([c[0] * k, c[1] * k, c[2] * k]); ctx.fillRect(xx + 0.8, yy + 0.8, bw - 1.6, bh - 1.6);
      }
    }
    // plaster patches & weathering wash so the bricks read as painted, not tiled
    for (let i = 0; i < (o.patches ?? Math.round((w * h) / 9000)); i++) {
      P.blob(ctx, x + r() * w, y + r() * h, 16 + r() * 60, 8 + r() * 26, r() * 100, 0.45, 24);
      ctx.fillStyle = P.css(P.mix(b, o.plaster || '#d9c3ad', 0.5), 0.12 + r() * 0.18); ctx.fill();
    }
    P.tex(ctx, 'blot', o.wash ?? 0.5, 'soft-light', [x, y, w, h], 2);
    ctx.restore();
  };
  P.stains = (ctx, x, y, w, h, seed, col = 'rgba(40,24,20,0.16)', n = 8) => {
    const r = P.rng(seed); ctx.fillStyle = col;
    for (let i = 0; i < n; i++) { const sx = x + r() * w, sw = 3 + r() * 14, sh = h * (0.3 + r() * 0.7); ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + sw, y); ctx.lineTo(sx + sw * 0.6, y + sh); ctx.lineTo(sx + sw * 0.4, y + sh * 0.9); ctx.closePath(); ctx.fill(); }
  };
  // window with frame, glass (sky reflection / lit / dark), curtain, optional iron grille
  P.window = (ctx, x, y, w, h, o = {}) => {
    const r = P.rng(o.seed || 7), mode = o.mode || 'sky';
    P.box(ctx, x - 3, y - 3, w + 6, h + 6, o.recess || 'rgba(52,34,28,0.55)');
    const g = mode === 'lit' ? ['#ffe4a4', '#ffbe63'] : mode === 'dark' ? ['#1d2646', '#2c3a62'] : mode === 'dim' ? ['#4a5468', '#2d3446'] : (o.glass || ['#a8cce6', '#5d86a9']);
    P.box(ctx, x, y, w, h, P.vg(ctx, y, y + h, g));
    if (o.curtain) {
      const cc = P.rgb(o.curtain), cw = w * (0.32 + r() * 0.15);
      for (const side of o.both ? [0, 1] : [r() < 0.5 ? 0 : 1]) {
        const cx = side ? x + w - cw : x; ctx.fillStyle = P.lg(ctx, cx, 0, cx + cw, 0, [P.mix(cc, '#000', 0.15), cc, P.mix(cc, '#fff', 0.2), cc]); ctx.fillRect(cx, y, cw, h);
        ctx.strokeStyle = P.css(P.mix(cc, '#000', 0.3), 0.5); ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cx + (cw * k) / 4, y); ctx.lineTo(cx + (cw * k) / 4 + (r() - 0.5) * 3, y + h); ctx.stroke(); }
      }
    }
    if (mode === 'sky') { ctx.fillStyle = 'rgba(255,255,255,0.28)'; P.poly(ctx, [[x + w * 0.1, y + h], [x + w * 0.42, y], [x + w * 0.58, y], [x + w * 0.26, y + h]]); ctx.fill(); }
    if (mode === 'lit' && o.glow !== false) P.glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 1.2, '#ffc46a', 0.35);
    ctx.strokeStyle = o.frame || '#e8e1cd'; ctx.lineWidth = Math.max(1.5, w * 0.05); ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h * 0.33); ctx.lineTo(x + w, y + h * 0.33); ctx.stroke();
    P.box(ctx, x - 5, y + h + 1, w + 10, Math.max(3, h * 0.07), o.sill || '#d6cbb6');
    if (o.grille) {
      const d = Math.min(12, w * 0.16); ctx.strokeStyle = o.grilleCol || '#2f4239'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x - d, y - 5, w + 2 * d, h + 10); ctx.beginPath();
      for (let i = 1; i < 7; i++) { const xx = x - d + ((w + 2 * d) * i) / 7; ctx.moveTo(xx, y - 5); ctx.lineTo(xx, y + h + 5); }
      ctx.moveTo(x - d, y + h * 0.5); ctx.lineTo(x + w + d, y + h * 0.5); ctx.stroke();
      if (o.plants) { const G = P.greens(o.green || 'day'); for (let i = 0; i < 3; i++) { const px = x - d * 0.5 + r() * (w + d), py = y + h + 3; P.box(ctx, px - 6, py - 7, 12, 8, '#b4552f'); P.leafBlob(ctx, px, py - 13, 9, G[2], r); P.leafBlob(ctx, px - 2, py - 15, 5, G[3], r); if (r() < 0.4) P.circle(ctx, px + 3, py - 14, 2.4, '#e24a32'); } }
    }
  };
  P.acUnit = (ctx, x, y, w, h, dark) => {
    P.rbox(ctx, x, y, w, h, 2, P.vg(ctx, y, y + h, dark ? ['#4b505c', '#353944'] : ['#eeece5', '#c9c6bc']));
    P.circle(ctx, x + w * 0.62, y + h * 0.5, h * 0.36, dark ? '#2b2f38' : '#9d9a92');
    ctx.strokeStyle = dark ? '#555b67' : '#bdbab1'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + w * 0.62 - h * 0.36, y + h * (0.3 + i * 0.13)); ctx.lineTo(x + w * 0.62 + h * 0.36, y + h * (0.3 + i * 0.13)); ctx.stroke(); }
    P.line(ctx, [[x + w * 0.1, y + h], [x + w * 0.1, y + h + 14], [x - 6, y + h + 26]], 'rgba(60,60,60,0.6)', 1.2);
  };
  P.pot = (ctx, x, gy, w, h, col, pal, seed, o = {}) => {
    const r = P.rng(seed), G = P.greens(pal);
    if (o.box) P.rbox(ctx, x - w / 2, gy - h, w, h, 2, P.vg(ctx, gy - h, gy, ['#f4f2ec', '#cfcac0']));
    else { ctx.fillStyle = P.lg(ctx, x - w / 2, 0, x + w / 2, 0, [P.mix(col, '#fff', 0.15), col, P.mix(col, '#000', 0.3)]); P.poly(ctx, [[x - w / 2, gy - h], [x + w / 2, gy - h], [x + w * 0.38, gy], [x - w * 0.38, gy]]); ctx.fill(); P.box(ctx, x - w / 2 - 2, gy - h - 3, w + 4, 4, P.mix(col, '#fff', 0.1)); }
    const fh = o.fh ?? h * 1.4;
    for (let i = 0; i < (o.leaves ?? 5); i++) P.leafBlob(ctx, x + (r() - 0.5) * w * 0.9, gy - h - r() * fh, w * (0.18 + r() * 0.16), G[1 + ((r() * 2) | 0)], r);
    for (let i = 0; i < 4; i++) P.leafBlob(ctx, x + (r() - 0.6) * w * 0.7, gy - h - fh * (0.3 + r() * 0.7), w * 0.12, G[3], r, 0.7);
    if (o.fruit) for (let i = 0; i < o.fruit; i++) { const fx = x + (r() - 0.5) * w * 0.8, fy = gy - h - r() * fh * 0.8; P.circle(ctx, fx, fy, w * 0.07 + 2, '#d8362a'); P.circle(ctx, fx - 1, fy - 1.5, w * 0.025 + 0.6, 'rgba(255,220,200,0.8)'); }
    if (o.flowers) P.flowers(ctx, x - w * 0.4, x + w * 0.4, gy - h - fh, gy - h - fh * 0.3, o.flowers, ['#f6f2ea', '#f2a9b6', '#f6d24a'], seed + 3, 2.6);
  };
  P.sunflower = (ctx, x, gy, h, t = 0, pal = 'day') => {
    const sw = Math.sin(t * 1.1 + x) * 3, G = P.greens(pal), tx = x + sw, ty = gy - h;
    ctx.strokeStyle = P.css(G[2]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x - 4, gy - h * 0.5, tx, ty); ctx.stroke();
    for (const k of [0.35, 0.6]) { const ly = gy - h * k, d = k < 0.5 ? -1 : 1; P.ell(ctx, x + d * 13, ly, 14, 6, G[2], d * 0.5); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; P.ell(ctx, tx + Math.cos(a) * 15, ty + Math.sin(a) * 15, 10, 4.2, i % 2 ? '#f2b81c' : '#f8cd36', a); }
    P.circle(ctx, tx, ty, 10, '#6a3e1f'); P.circle(ctx, tx - 2, ty - 2, 4, 'rgba(160,100,50,0.6)');
  };

  // ---------- street furniture ----------
  P.wires = (ctx, pts, o = {}) => {
    const n = o.n || 3, gap = o.gap || 7;
    ctx.strokeStyle = P.css(o.color || 'rgba(34,36,44,0.8)'); ctx.lineWidth = o.width || 1.2;
    for (let k = 0; k < n; k++) {
      ctx.beginPath();
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], sag = (o.sag || 30) + k * 5, ay = a[1] + k * gap, by = b[1] + k * gap;
        ctx.moveTo(a[0], ay); ctx.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(ay, by) + sag, b[0], by);
      }
      ctx.stroke();
    }
  };
  P.pole = (ctx, x, gy, h, o = {}) => {
    const w = o.w || 10, top = gy - h, dark = o.dark;
    ctx.fillStyle = P.lg(ctx, x - w / 2, 0, x + w / 2, 0, dark ? ['#3a3d47', '#4e525d', '#2a2c34'] : ['#8d8b85', '#bab6ac', '#6c6a66']); ctx.fillRect(x - w / 2, top, w, h);
    P.box(ctx, x - 42, top + 16, 84, 5, dark ? '#25272e' : '#4c4a46'); P.box(ctx, x - 30, top + 40, 60, 4, dark ? '#25272e' : '#4c4a46');
    for (const dx of [-36, -16, 16, 36]) P.rbox(ctx, x + dx - 2.5, top + 8, 5, 9, 2, dark ? '#6d7280' : '#e7e3d8');
    if (o.box) { P.rbox(ctx, x - 16, top + 60, 32, 40, 3, dark ? '#3c414d' : '#9a978e'); }
  };
  P.streetLamp = (ctx, x, gy, h, lit, o = {}) => {
    ctx.fillStyle = o.dark ? '#262a34' : '#4a4d55'; ctx.fillRect(x - 3, gy - h, 6, h);
    ctx.lineWidth = 5; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(x, gy - h + 4); ctx.quadraticCurveTo(x, gy - h - 26, x + 34, gy - h - 22); ctx.stroke();
    P.rbox(ctx, x + 22, gy - h - 26, 30, 9, 3, o.dark ? '#262a34' : '#4a4d55');
    if (lit) { P.glow(ctx, x + 37, gy - h - 14, 120, '#ffd38a', 0.75); P.ell(ctx, x + 37, gy - h - 16, 12, 3.5, '#fff6d6'); }
  };
  P.lantern = (ctx, x, y, s, t = 0, lit = true) => {
    const sw = Math.sin(t * 1.3 + x * 0.01) * 3;
    ctx.save(); ctx.translate(x + sw, y);
    if (lit) P.glow(ctx, 0, 0, 95 * s, '#ff7a4a', 0.65);
    ctx.fillStyle = P.rg(ctx, -6 * s, -8 * s, 2 * s, 32 * s, ['#ffcf8a', '#ef5a35', '#a8261c']); ctx.beginPath(); ctx.ellipse(0, 0, 24 * s, 29 * s, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,30,20,0.55)'; ctx.lineWidth = 1.2 * s; for (const k of [-0.55, 0, 0.55]) { ctx.beginPath(); ctx.ellipse(0, 0, 24 * s * Math.abs(Math.cos(k * 1.4)) + 0.1, 29 * s, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
    P.rbox(ctx, -12 * s, -33 * s, 24 * s, 6 * s, 2 * s, '#5b2e17'); P.rbox(ctx, -12 * s, 27 * s, 24 * s, 6 * s, 2 * s, '#5b2e17');
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 1.4 * s; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 2.5 * s, 33 * s); ctx.lineTo(i * 3 * s, 52 * s); ctx.stroke(); }
    ctx.restore();
  };

  // ---------- wet ground ----------
  P.streak = (ctx, x, y, len, w, col, a = 0.5, seed = 1) => {
    const r = P.rng(seed); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < len; k += 2.5) {
      const t = k / len, ww = w * (1 - t * 0.4) * (0.5 + r() * 0.9);
      ctx.fillStyle = P.css(col, a * Math.pow(1 - t, 1.4) * (0.4 + r() * 0.6)); ctx.fillRect(x - ww / 2 + (r() - 0.5) * w * 0.7, y + k, ww, 1.8);
    }
    ctx.restore();
  };
  P.ripple = (ctx, x, y, r, a, col = '255,255,255') => { ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.32, 0, 0, TAU); ctx.stroke(); };

  // ---------- distant city ----------
  P.cityFar = (ctx, baseY, seed, o = {}) => {
    const r = P.rng(seed), col = P.rgb(o.color || '#8fa3b8'); let x = -M;
    while (x < W + M) {
      const bw = (o.minW ?? 30) + r() * (o.varW ?? 80), bh = (o.minH ?? 40) + r() * (o.varH ?? 140), c = P.vary(col, r, 0.06);
      ctx.fillStyle = P.css(c); ctx.fillRect(x, baseY - bh, bw, bh + H);
      ctx.fillStyle = 'rgba(10,10,40,0.12)'; ctx.fillRect(x + bw * 0.68, baseY - bh, bw * 0.32, bh + H);
      ctx.fillStyle = P.css(P.mix(c, '#ffffff', 0.12)); ctx.fillRect(x, baseY - bh, bw, 2);
      if (r() < 0.3) { const tx = x + bw * (0.2 + r() * 0.5); P.box(ctx, tx, baseY - bh - 9, 10, 9, P.mix(c, '#000', 0.12)); }
      if (r() < 0.25) P.line(ctx, [[x + bw * 0.7, baseY - bh], [x + bw * 0.7, baseY - bh - 18 - r() * 18]], P.mix(c, '#000', 0.2), 1);
      if (o.win) {
        const ws = o.winSize || 3;
        for (let wy = baseY - bh + 7; wy < baseY - 4; wy += ws * 2.6) for (let wx = x + 4; wx < x + bw - 5; wx += ws * 2.2) {
          const lit = r() < o.win; if (!lit && !o.dimWin) continue;
          ctx.fillStyle = lit ? (o.winCol || 'rgba(255,214,140,0.9)') : o.dimWin; ctx.fillRect(wx, wy, ws, ws * 1.3);
        }
      }
      x += bw + r() * 3;
    }
    if (o.haze) { const hh = o.hazeH || 120; ctx.fillStyle = P.vg(ctx, baseY - hh, baseY + 30, [P.css(o.haze, 0), P.css(o.haze, o.hazeA ?? 0.6)]); ctx.fillRect(-M, baseY - hh, W + 2 * M, hh + 30 + H); }
  };

  window.P = P;
})();
