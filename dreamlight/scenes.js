/* 小芽与风的种子 · scenes.js
 * One builder per setting. A builder paints static layers once (back / mid /
 * front, cached per shot) and registers light per-frame animation; the engine
 * composites them with parallax so camera moves have depth.
 */
(function () {
  'use strict';
  const { W, H, M, TAU, clamp } = P;
  const FONT = '"Noto Serif SC","Songti SC","WenQuanYi Zen Hei",serif';
  const FULL = [-M, -M, W + 2 * M, H + 2 * M];
  const epOf = (shot) => +String(shot.id).charAt(1) || 1;
  const TINT = { morning: ['#fff1d0', 0.05], gold: ['#ffae62', 0.12], sunset: ['#ff8c5a', 0.15], dusk: ['#57468c', 0.24], dawn: ['#ffb09a', 0.1], night: ['#1f2a58', 0.36], rain: ['#34415f', 0.22], grey: ['#7a7d86', 0.12], lamp: ['#ff9a4a', 0.1], hospital: ['#2a3a68', 0.28], dusty: ['#c9a77a', 0.1] };
  const B = {};

  class Scene {
    constructor(shot) { this.shot = shot; this.seed = P.seedOf(shot.id); this.layers = {}; this.anim = {}; this.clouds = []; this.depth = { back: 0.3, mid: 0.7, front: 1.25 }; this.sky = null; this.tint = null; this.breathe = null; }
    paint(name, fn) { if (!this.layers[name]) this.layers[name] = P.layer(); fn(this.layers[name].x); }
    cloud(seed, w, h, pal, x, y, o = {}) { this.clouds.push({ img: P.cumulus(seed, w, h, pal, o), x, y, w, h, vx: o.vx ?? 4, d: o.d ?? 0.2, a: o.alpha ?? 1 }); }
  }

  // ---------------------------------------------------------------- helpers
  function text(x, str, cx, cy, size, col, weight = 700) { x.fillStyle = col; x.font = `${weight} ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(str, cx, cy); }
  function vtext(x, str, cx, cy, size, col) { [...str].forEach((ch, i) => text(x, ch, cx, cy + (i - (str.length - 1) / 2) * size * 1.08, size, col)); }
  function ripples(x, t, x0, y0, w, h, seed, n = 24, col = '255,255,255', a = 0.45) {
    for (let i = 0; i < n; i++) {
      const ph = (t * (0.7 + P.hash(seed + i) * 0.6) + P.hash(seed + i * 3)) % 1, ry = y0 + P.hash(seed + i * 11) * h;
      P.ripple(x, x0 + P.hash(seed + i * 7) * w, ry, 2 + ph * 15 * (0.5 + (ry - y0) / Math.max(1, h)), (1 - ph) * a, col);
    }
  }
  function wetRoad(x, gy, mood, o = {}) {
    const night = mood === 'night', dusk = mood === 'dusk', sw = o.sidewalk ?? 46;
    x.fillStyle = P.vg(x, gy, gy + sw, night ? ['#2a3046', '#1f2436'] : dusk ? ['#5a4d66', '#43394f'] : ['#7d8590', '#646b76']); x.fillRect(-M, gy, W + 2 * M, sw);
    x.strokeStyle = 'rgba(20,20,30,0.22)'; x.lineWidth = 1;
    for (let i = -M; i < W + M; i += 38) { x.beginPath(); x.moveTo(i, gy); x.lineTo(i - 10, gy + sw); x.stroke(); }
    P.box(x, -M, gy + sw, W + 2 * M, 5, night ? '#3b4258' : dusk ? '#7a6a83' : '#a6abb2');
    x.fillStyle = P.vg(x, gy + sw + 5, H + M, night ? ['#1b2033', '#0e111c'] : dusk ? ['#3b3249', '#1e1a29'] : ['#525a67', '#2f343e']); x.fillRect(-M, gy + sw + 5, W + 2 * M, H);
    x.fillStyle = P.vg(x, gy + sw + 5, H, [night ? 'rgba(90,110,170,0.18)' : dusk ? 'rgba(220,150,170,0.2)' : 'rgba(190,205,225,0.22)', 'rgba(0,0,0,0)']); x.fillRect(-M, gy + sw + 5, W + 2 * M, H);
    P.tex(x, 'hs', 0.35, 'soft-light', [-M, gy, W + 2 * M, H], 1.5);
    for (let i = -M; i < W + M; i += 170) P.box(x, i, gy + sw + 50, 80, 4, 'rgba(230,230,220,0.3)');
  }
  function shopFront(x, x0, gy, w, h, o, seed) {
    const r = P.rng(seed), dark = ['night', 'rain', 'dusk'].includes(o.mood), wallC = o.wall || (dark ? '#8a8786' : '#d8cdb9');
    P.box(x, x0, gy - h, w, h, P.vg(x, gy - h, gy, [wallC, P.mix(wallC, '#000000', 0.22)]));
    P.tex(x, 'vs', 0.35, 'soft-light', [x0, gy - h, w, h]);
    P.box(x, x0 - 4, gy - h - 6, w + 8, 8, P.mix(wallC, '#000000', 0.3));
    for (let i = 0; i < 2; i++) P.window(x, x0 + 22 + (i * (w - 44)) / 2 + 8, gy - h + 22, (w - 44) / 2 - 16, 50, { mode: dark ? (r() < 0.55 ? 'lit' : 'dim') : 'sky', grille: r() < 0.6, plants: r() < 0.5, green: o.mood === 'rain' ? 'rain' : 'day', seed: seed + i, curtain: r() < 0.5 ? '#e7d6a6' : null, sill: dark ? '#77736e' : '#d6cbb6', frame: dark ? '#b8b2a2' : '#e8e1cd', glow: false });
    const sy = gy - 152; P.rbox(x, x0 + 10, sy, w - 20, 34, 3, o.sign || '#a83a2c'); text(x, o.text || '', x0 + w / 2, sy + 18, 21, '#fbf3df');
    const ay = sy + 38, n = 9;
    for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? '#f1ece2' : o.awning || '#4f8a6a'; P.poly(x, [[x0 + (i * w) / n, ay], [x0 + ((i + 1) * w) / n, ay], [x0 + ((i + 1) * w) / n + 6, ay + 24], [x0 + (i * w) / n + 6, ay + 24]]); x.fill(); x.beginPath(); x.arc(x0 + ((i + 0.5) * w) / n + 6, ay + 24, w / n / 2, 0, Math.PI); x.fill(); }
    const oy = ay + 30, oh = gy - oy;
    P.box(x, x0 + 14, oy, w - 28, oh, P.vg(x, oy, gy, o.lit ? ['#ffd894', '#e2a159'] : ['#57504a', '#2f2a27']));
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) { const bx = x0 + 22 + i * ((w - 44) / 9), by = oy + 14 + row * 24; P.box(x, bx, by, (w - 44) / 9 - 3, 16, P.vary(['#c84a3a', '#3f7fbf', '#e8b83a', '#5aa05a', '#e8e0d0'][(r() * 5) | 0], r, 0.1)); }
    P.box(x, x0 + 14, oy, w - 28, oh * 0.24, P.vg(x, oy, oy + oh * 0.24, ['#a3a8ad', '#7d8389']));
    x.strokeStyle = 'rgba(60,64,70,0.5)'; x.lineWidth = 1; for (let yy = oy + 4; yy < oy + oh * 0.24; yy += 4) { x.beginPath(); x.moveTo(x0 + 14, yy); x.lineTo(x0 + w - 14, yy); x.stroke(); }
    if (o.lit) P.glow(x, x0 + w / 2, gy - oh * 0.35, w * 0.8, '#ffc070', dark ? 0.45 : 0.2);
    for (let i = 0; i < 3; i++) P.rbox(x, x0 + 20 + i * 30, gy - 22, 26, 22, 2, ['#3f6fa8', '#c8463a', '#e6a23a'][i]);
  }
  function apartment(x, x0, y0, w, h, mood, seed, o = {}) {
    const r = P.rng(seed), dark = ['night', 'rain', 'dusk'].includes(mood), c = o.color || (dark ? '#8f8c86' : '#e0d4be');
    P.box(x, x0, y0, w, h + H, P.vg(x, y0, y0 + h, [c, P.mix(c, '#000000', 0.2)])); P.tex(x, 'vs', 0.3, 'soft-light', [x0, y0, w, h]);
    const fh = o.fh || 50, cols = Math.max(3, Math.round(w / 74));
    for (let fy = y0 + 16; fy < y0 + h - 30; fy += fh) for (let i = 0; i < cols; i++) {
      const ww = (w - 24) / cols - 18, wx = x0 + 16 + (i * (w - 24)) / cols;
      P.window(x, wx, fy, ww, fh * 0.56, { mode: dark ? (r() < (o.lit ?? 0.35) ? 'lit' : 'dim') : 'sky', grille: r() < 0.4, seed: seed + i * 31 + fy, glow: false, frame: dark ? '#a8a294' : '#efe9da', sill: dark ? '#77736b' : '#d9cfbb', curtain: r() < 0.3 ? '#e9d7a6' : null });
      if (r() < 0.18) P.acUnit(x, wx + ww + 4, fy + 8, 16, 12, dark);
    }
    P.box(x, x0 - 4, y0 - 6, w + 8, 8, P.mix(c, '#000000', 0.28));
    P.stains(x, x0, y0 + 10, w, h, seed, dark ? 'rgba(0,0,0,0.12)' : 'rgba(80,60,40,0.1)', 10);
  }
  function dandelions(x, seed, y0, y1, n, flower) {
    const r = P.rng(seed);
    for (let i = 0; i < n; i++) {
      const px = r() * W, py = y0 + 25 + r() * (y1 - y0 - 25), h = 40 + r() * 70, hx = px + (r() - 0.5) * 14, hy = py - h;
      x.strokeStyle = '#5f8a46'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 4, py - h / 2, hx, hy); x.stroke();
      if (r() < 0.6) { P.circle(x, hx, hy, 11, 'rgba(255,255,255,0.4)'); x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 0.7; x.beginPath(); for (let k = 0; k < 22; k++) { const a = (k / 22) * TAU; x.moveTo(hx, hy); x.lineTo(hx + Math.cos(a) * 11, hy + Math.sin(a) * 11); } x.stroke(); }
      else { for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; P.ell(x, hx + Math.cos(a) * 6, hy + Math.sin(a) * 6, 5, 2, flower, a); } P.circle(x, hx, hy, 4, '#e8a812'); }
    }
  }
  function laundry(x, t, x0, y0, x1, y1, seed, cols, sag = 14) {
    x.strokeStyle = 'rgba(60,60,60,0.7)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); x.stroke();
    const n = cols.length;
    for (let i = 0; i < n; i++) {
      const f = (i + 0.7) / (n + 0.4), lx = x0 + (x1 - x0) * f, ly = y0 + (y1 - y0) * f + sag * 4 * f * (1 - f) * 0.5, sw = Math.sin(t * 1.8 + i * 1.3 + seed) * 4, w = 22 + P.hash(seed + i) * 14, h = 28 + P.hash(seed + i * 5) * 22;
      x.fillStyle = cols[i]; P.poly(x, [[lx - w / 2, ly], [lx + w / 2, ly], [lx + w / 2 + sw, ly + h], [lx - w / 2 + sw * 0.8, ly + h * 0.96]]); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.12)'; P.poly(x, [[lx + w * 0.15, ly], [lx + w / 2, ly], [lx + w / 2 + sw, ly + h], [lx + w * 0.15 + sw, ly + h]]); x.fill();
      P.box(x, lx - 2, ly - 3, 4, 6, '#d8c070');
    }
  }
  function chai(x, cx, cy, r, a = 1) {
    x.save(); x.globalAlpha = a; x.strokeStyle = '#d0201c'; x.lineWidth = r * 0.12; x.lineCap = 'round';
    x.beginPath(); for (let i = 0; i <= 40; i++) { const an = (i / 40) * TAU, rr = r * (1 + (P.noise(i * 0.5, 3) - 0.5) * 0.06); i ? x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr) : x.moveTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } x.stroke();
    text(x, '拆', cx, cy + r * 0.05, r * 1.25, '#d0201c', 900);
    x.fillStyle = '#d0201c';
    for (let i = 0; i < 6; i++) { const dx = cx - r * 0.7 + i * r * 0.28, len = r * (0.25 + P.hash(i + 3) * 0.9); x.fillRect(dx, cy + r * 0.85, r * 0.05, len); P.circle(x, dx + r * 0.025, cy + r * 0.85 + len, r * 0.055, '#d0201c'); }
    x.fillStyle = 'rgba(208,32,28,0.15)'; for (let i = 0; i < 40; i++) { const an = P.hash(i) * TAU, d = r * (1.05 + P.hash(i + 7) * 0.3); P.circle(x, cx + Math.cos(an) * d, cy + Math.sin(an) * d, 1 + P.hash(i + 2) * 2, 'rgba(208,32,28,0.25)'); }
    x.restore();
  }

  // ------------------------------------------------- the old brick building
  const BLD = (cx, gy, k) => { const bw = 560 * k, fh = 92 * k, bh = 5 * fh + 34 * k; return { bw, fh, bh, x0: cx - bw / 2, y0: gy - bh, bayW: bw / 4 }; };
  function oldBuilding(x, cx, gy, k, mood, o = {}) {
    const night = mood === 'night', r = P.rng(41), { bw, fh, bh, x0, y0, bayW } = BLD(cx, gy, k);
    const bc = { day: '#b2563f', gold: '#c0613f', night: '#4d2e35', dusk: '#7a4642', dusty: '#a85a45' }[mood] || '#b2563f';
    const G = night ? 'night' : mood === 'gold' ? 'gold' : 'day';
    const sw = 54 * k;
    x.save(); P.poly(x, [[x0 + bw, y0], [x0 + bw + sw, y0 + 18 * k], [x0 + bw + sw, gy], [x0 + bw, gy]]); x.clip();
    P.bricks(x, x0 + bw, y0, sw, bh, P.mix(bc, '#20102a', 0.42), 43, { bw: 16 * k, bh: 8 * k, patches: 2 }); x.restore();
    P.bricks(x, x0, y0, bw, bh, bc, 42, { bw: 21 * k, bh: 8.5 * k });
    x.fillStyle = P.lg(x, x0, 0, x0 + bw, 0, night ? ['rgba(70,90,170,0.2)', 'rgba(10,10,40,0.35)'] : ['rgba(255,236,200,0.2)', 'rgba(255,236,200,0)', 'rgba(40,16,40,0.2)']); x.fillRect(x0, y0, bw, bh);
    for (let f = 1; f < 5; f++) P.box(x, x0, y0 + 34 * k + f * fh - 6 * k, bw, 5 * k, night ? 'rgba(90,80,100,0.5)' : 'rgba(228,214,192,0.6)');
    // rooftop: parapet, water tank, antenna, potted vegetables
    const tx = x0 + bw * 0.12;
    for (const lx of [tx, tx + 56 * k]) P.box(x, lx, y0 - 46 * k, 4 * k, 44 * k, night ? '#2a2a30' : '#5b5853');
    P.rbox(x, tx - 10 * k, y0 - 94 * k, 80 * k, 52 * k, 9 * k, P.lg(x, tx - 10 * k, 0, tx + 70 * k, 0, night ? ['#4b5163', '#2b2f3c'] : ['#ece8de', '#b5b0a4']));
    P.line(x, [[x0 + bw * 0.8, y0 - 4 * k], [x0 + bw * 0.8, y0 - 74 * k]], night ? '#1d1d22' : '#4d4a46', 2.2 * k);
    P.line(x, [[x0 + bw * 0.8 - 18 * k, y0 - 60 * k], [x0 + bw * 0.8 + 18 * k, y0 - 60 * k]], night ? '#1d1d22' : '#4d4a46', 1.6 * k);
    if (!o.empty) for (let i = 0; i < 6; i++) P.pot(x, x0 + bw * (0.34 + i * 0.065), y0 - 6 * k, 20 * k, 12 * k, '#b4552f', G, 300 + i, { leaves: 4, fh: 18 * k, fruit: i % 2 ? 2 : 0 });
    P.box(x, x0 - 8 * k, y0 - 8 * k, bw + 16 * k, 14 * k, night ? '#2e2228' : '#8a4535'); P.box(x, x0 - 8 * k, y0 + 6 * k, bw + 16 * k, 3 * k, 'rgba(0,0,0,0.25)');
    for (let f = 0; f < 5; f++) {
      const fy = y0 + 34 * k + f * fh;
      for (let c = 0; c < 4; c++) {
        const bx = x0 + c * bayW;
        if (f === 4 && (c === 1 || c === 2)) continue;
        const eye = o.face && f === 1 && (c === 1 || c === 2), balcony = !eye && (c === 1 || c === 2) && f < 4, lit = night && r() < 0.42;
        if (eye) {
          const wx = bx + bayW * 0.17, wy = fy + fh * 0.12, ww = bayW * 0.66, wh = fh * 0.64;
          P.box(x, wx - 4, wy - 4, ww + 8, wh + 8, 'rgba(52,34,28,0.6)'); P.box(x, wx, wy, ww, wh, P.vg(x, wy, wy + wh, night ? ['#2a3558', '#1a2240'] : ['#f4f1e6', '#dcd6c4']));
          P.box(x, wx - 6, wy + wh + 2, ww + 12, 6 * k, night ? '#6f6a73' : '#d6cbb6');
        } else if (balcony) {
          const px = bx + bayW * 0.1, pw = bayW * 0.8, py = fy + fh * 0.06, ph = fh * 0.74;
          P.box(x, px, py, pw, ph, night ? (lit ? P.vg(x, py, py + ph, ['#ffd690', '#e09a50']) : '#151a2a') : P.vg(x, py, py + ph, ['#3e3532', '#5a4e48']));
          if (!night || lit) { P.window(x, px + pw * 0.12, py + ph * 0.1, pw * 0.34, ph * 0.62, { mode: lit ? 'lit' : 'sky', seed: f * 7 + c, glow: false, frame: '#d7d0bd' }); P.window(x, px + pw * 0.54, py + ph * 0.1, pw * 0.34, ph * 0.62, { mode: lit ? 'lit' : 'sky', seed: f * 7 + c + 1, glow: lit, frame: '#d7d0bd', curtain: '#e9d7a6' }); }
          const sy = fy + fh * 0.62; P.box(x, px - 8 * k, sy + fh * 0.22, pw + 16 * k, 7 * k, night ? '#5e5862' : '#d8cbb3');
          x.strokeStyle = night ? '#2b4a44' : '#3f7d62'; x.lineWidth = 2.2 * k; x.strokeRect(px - 6 * k, sy, pw + 12 * k, fh * 0.22);
          x.lineWidth = 1.4 * k; x.beginPath(); for (let i = 1; i < 12; i++) { const lx = px - 6 * k + ((pw + 12 * k) * i) / 12; x.moveTo(lx, sy); x.lineTo(lx, sy + fh * 0.22); } x.stroke();
          if (!o.empty) for (let i = 0; i < 3; i++) P.pot(x, px + pw * (0.12 + i * 0.36), sy - 1, 16 * k, 10 * k, ['#b4552f', '#e9e4d6', '#5d86a9'][i], G, f * 31 + c * 7 + i, { leaves: 4, fh: 14 * k, flowers: i === 1 ? 3 : 0, fruit: i === 0 ? 2 : 0 });
        } else {
          P.window(x, bx + bayW * 0.25, fy + fh * 0.16, bayW * 0.5, fh * 0.56, { mode: lit ? 'lit' : night ? 'dark' : 'sky', grille: r() < 0.6, plants: !o.empty && r() < 0.55, green: G, curtain: r() < 0.5 ? ['#e9d7a6', '#c9dfc0', '#f1c2b4'][(r() * 3) | 0] : null, seed: f * 9 + c, glow: lit, frame: night ? '#9d978e' : '#e8e1cd' });
          if (!o.empty && r() < 0.4) P.acUnit(x, bx + bayW * (c === 0 ? 0.02 : 0.8), fy + fh * 0.32, 24 * k, 18 * k, night);
        }
        P.stains(x, bx + bayW * 0.22, fy + fh * 0.78, bayW * 0.56, fh * 0.45, f * 13 + c, night ? 'rgba(0,0,0,0.2)' : 'rgba(50,24,20,0.12)', 4);
      }
    }
    const dy = gy - fh * 0.84;
    P.box(x, cx - 50 * k, dy - 8 * k, 100 * k, 8 * k, night ? '#4a3c3c' : '#d8cbb3');
    P.box(x, cx - 44 * k, dy, 88 * k, gy - dy, night ? '#0c080b' : P.vg(x, dy, gy, ['#2c1d1a', '#4a3a33']));
    if (!night) P.glow(x, cx, gy - 10 * k, 50 * k, '#ffcf8a', 0.15);
    P.rbox(x, cx - 22 * k, dy - 30 * k, 44 * k, 18 * k, 2 * k, '#2f5d8a'); text(x, '3号楼', cx, dy - 21 * k, 11 * k, '#f1f1ea');
    P.box(x, x0 + bw - 12 * k, y0, 6 * k, bh, night ? '#26262c' : '#6f6a62');
    P.box(x, x0, gy - 16 * k, bw + sw, 16 * k, night ? '#2a2328' : '#7d6a5c');
    if (o.chai) chai(x, x0 + bw * 0.88, y0 + bh * 0.66, 54 * k);
  }
  function buildingEyes(x, t, cx, gy, k, mode) {
    const { fh, x0, y0, bayW } = BLD(cx, gy, k), fy = y0 + 34 * k + fh;
    for (const c of [1, 2]) {
      const wx = x0 + c * bayW + bayW * 0.17, wy = fy + fh * 0.12, ww = bayW * 0.66, wh = fh * 0.64;
      x.save(); x.beginPath(); x.rect(wx, wy, ww, wh); x.clip();
      const look = Math.sin(t * 0.45) * ww * 0.08 - ww * 0.04, pr = wh * 0.32;
      P.circle(x, wx + ww / 2 + look, wy + wh * 0.56, pr, mode === 'night' ? '#120d14' : '#2a1b16');
      P.circle(x, wx + ww / 2 + look, wy + wh * 0.56, pr * 0.55, mode === 'night' ? '#3b3050' : '#5a3424');
      P.circle(x, wx + ww / 2 + look + pr * 0.38, wy + wh * 0.56 - pr * 0.38, pr * 0.28, '#ffffff');
      let lid = mode === 'night' ? 0.5 + Math.sin(t * 0.7) * 0.07 : 0.1;
      if (((t + 1.3) % 4.6) < 0.2) lid = 1;
      if (mode === 'smile') lid = 1;
      x.fillStyle = mode === 'night' ? '#55465e' : '#eadfc0'; x.fillRect(wx, wy, ww, wh * lid);
      x.strokeStyle = 'rgba(120,100,80,0.35)'; x.lineWidth = 1; for (let yy = wy + 6; yy < wy + wh * lid; yy += 6) { x.beginPath(); x.moveTo(wx, yy); x.lineTo(wx + ww, yy); x.stroke(); }
      x.strokeStyle = '#3b2417'; x.lineWidth = 3 * k; x.lineCap = 'round';
      if (mode === 'smile') { x.beginPath(); x.arc(wx + ww / 2, wy + wh * 0.42, ww * 0.24, Math.PI * 0.15, Math.PI * 0.85); x.stroke(); }
      else { x.beginPath(); x.moveTo(wx, wy + wh * lid); x.lineTo(wx + ww, wy + wh * lid); x.stroke(); }
      x.restore();
      x.strokeStyle = mode === 'night' ? '#9d978e' : '#efe7d2'; x.lineWidth = Math.max(2, ww * 0.05); x.strokeRect(wx, wy, ww, wh);
    }
  }
  function ground(x, gy, cols, o = {}) {
    x.fillStyle = P.vg(x, gy, H + M, cols); x.fillRect(-M, gy, W + 2 * M, H + M - gy + M);
    P.tex(x, 'blot', o.tex ?? 0.45, 'soft-light', [-M, gy, W + 2 * M, H], 1.5);
    if (o.cracks) { x.strokeStyle = 'rgba(30,20,20,0.18)'; x.lineWidth = 1; const r = P.rng(o.cracks); for (let i = 0; i < 9; i++) { let px = r() * W, py = gy + 10 + r() * (H - gy); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 40; py += r() * 10; x.lineTo(px, py); } x.stroke(); } }
  }

  // ---------------------------------------------------------- title cards
  const TP = {
    1: { sky: ['#8ea3be', '#c6d1dd'], cloud: 'rain', green: 'rain', flower: '#f2d24a' },
    2: { sky: ['#5f9be0', '#c4e0f3'], cloud: 'day', green: 'day', flower: '#f6c21c' },
    3: { sky: ['#999da6', '#d3d5d8'], cloud: 'grey', green: 'grey', flower: '#e9e4d6' },
    4: { sky: ['#6b5d97', '#e7aa9c'], cloud: 'dusk', green: 'dusk', flower: '#f2c46a' },
    5: { sky: ['#87b2e5', '#f7d9c8'], cloud: 'dawn', green: 'spring', flower: '#f6d24a' },
  };
  B.title = (b, shot) => {
    const n = clamp(epOf(shot) + (shot.title === '下一集' ? 1 : 0), 1, 5), tp = TP[n], sd = b.seed;
    b.depth = { back: 0.5, mid: 0.8, front: 1.2 };
    b.paint('back', (x) => {
      x.fillStyle = '#f4ecd9'; x.fillRect(...FULL);
      const wash = () => P.blob(x, W / 2, -60, W * 0.86, 440, n * 3.3, 0.09, 120);
      x.save(); wash(); x.clip();
      x.fillStyle = P.vg(x, -M, 390, [tp.sky[0], tp.sky[1], 'rgba(244,236,217,0)']); x.fillRect(...FULL);
      x.drawImage(P.cumulus(sd + 1, 440, 260, tp.cloud, { peak: 0.75 }), 60, 30);
      x.drawImage(P.cumulus(sd + 2, 320, 180, tp.cloud, { peak: 0.5 }), 920, 100);
      P.tex(x, 'blot', 0.55, 'soft-light', FULL, 2);
      x.restore();
      x.save(); wash(); x.strokeStyle = P.css(tp.sky[0], 0.3); x.lineWidth = 3; x.filter = 'blur(2px)'; x.stroke(); x.restore();
      x.fillStyle = P.vg(x, 585, 660, ['rgba(0,0,0,0)', P.css(P.greens(tp.green)[2], 0.9)]); x.fillRect(-M, 585, W + 2 * M, H);
      P.grass(x, -M, W + M, 620, H + M, tp.green, sd, { sparse: 24, len: 1.5, base: false });
      dandelions(x, sd, 600, H, 16, tp.flower);
      P.tex(x, 'paper', 0.65, 'soft-light', FULL);
      x.fillStyle = P.rg(x, W / 2, H / 2, 40, 430, [[0, 'rgba(250,245,232,0.8)'], [1, 'rgba(250,245,232,0)']]); x.fillRect(...FULL);
    });
  };

  // ----------------------------------------------------- the rainy street
  function street(b, mood, o = {}) {
    const sd = 101, gy = 600, dusk = mood === 'dusk';
    b.paint('back', (x) => {
      P.cityFar(x, 430, sd, { color: dusk ? '#5b5277' : '#74839a', minH: 120, varH: 210, win: dusk ? 0.35 : 0.2, haze: dusk ? '#9a7b9a' : '#95a1b1', hazeA: 0.65, hazeH: 240 });
      P.wires(x, [[-M, 150], [430, 178], [950, 160], [W + M, 190]], { n: 4, sag: 26, color: 'rgba(34,36,48,0.75)' });
    });
    b.paint('mid', (x) => {
      apartment(x, -70, 170, 300, 460, mood, sd + 2, { lit: dusk ? 0.55 : 0.35 });
      apartment(x, 760, 210, 330, 420, mood, sd + 3, { lit: dusk ? 0.55 : 0.35, color: dusk ? '#9a8f96' : '#a7a49c' });
      shopFront(x, -100, gy, 250, 228, { awning: '#4f8a6a', sign: '#2f5d7a', text: '杂货铺', lit: true, mood }, sd + 4);
      shopFront(x, 148, gy, 216, 206, { awning: '#b0473a', sign: '#a83a2c', text: '包子', lit: true, mood }, sd + 5);
      kindergarten(x, 372, gy, 480, mood, sd + 6);
      P.tree(x, 1078, gy + 8, 480, dusk ? 'dusk' : 'rain', sd + 7, { wide: 1.12 });
      if (!o.lanterns) P.streetLamp(x, 925, gy + 6, 300, true);
      P.pole(x, 1232, gy + 10, 490, { dark: dusk });
      wetRoad(x, gy, mood);
      const L = o.lanterns ? '#ff7a4a' : '#ffd38a';
      for (const [lx, c, a] of [[25, '#ffcf88', 0.45], [255, '#ffc27a', 0.45], [612, '#fff0c0', 0.3], [962, L, 0.55]]) P.streak(x, lx, gy + 52, 150, 40, c, a, lx);
    });
    b.anim.mid = (x, t) => ripples(x, t, -40, 655, W + 80, 65, 7, 22);
  }
  function kindergarten(x, x0, gy, w, mood, seed) {
    const r = P.rng(seed), dark = ['rain', 'dusk', 'night'].includes(mood), gx = x0 + w / 2;
    const bx = x0 + 34, bw = w - 68, by = gy - 262;
    P.box(x, bx, by, bw, 262, P.vg(x, by, gy, dark ? ['#c9a06a', '#9a784e'] : ['#f2c779', '#d9a95a'])); P.tex(x, 'vs', 0.3, 'soft-light', [bx, by, bw, 262]);
    P.box(x, bx - 10, by - 12, bw + 20, 14, dark ? '#6d5149' : '#c0644a');
    for (let i = 0; i < 5; i++) P.window(x, bx + 18 + (i * (bw - 36)) / 5, by + 26, (bw - 36) / 5 - 16, 64, { mode: dark ? 'lit' : 'sky', curtain: ['#f2a7b5', '#a9d18e', '#9cc4e8', '#f6d24a', '#f2a7b5'][i], both: true, seed: seed + i, glow: false, frame: '#ffffff' });
    const wy = gy - 122;
    P.box(x, x0, wy, w, 122, P.vg(x, wy, gy, dark ? ['#d2c8b5', '#a99f90'] : ['#f3ecdc', '#ddd3c0'])); P.tex(x, 'blot', 0.3, 'soft-light', [x0, wy, w, 122]);
    P.box(x, x0 - 4, wy - 9, w + 8, 10, dark ? '#8f6f5f' : '#c2674c');
    x.save(); x.beginPath(); x.rect(x0, wy, w, 122); x.clip(); x.globalAlpha = dark ? 0.62 : 0.85;
    ['#e8514a', '#f39a3c', '#f6d04d', '#6cc06a', '#4d9be0', '#8a6bd1'].forEach((c, i) => { x.strokeStyle = c; x.lineWidth = 6; x.beginPath(); x.arc(x0 + 70, wy + 118, 64 - i * 6, Math.PI, TAU); x.stroke(); });
    P.circle(x, x0 + w - 60, wy + 40, 18, '#f6c33a'); x.strokeStyle = '#f6c33a'; x.lineWidth = 3; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; x.beginPath(); x.moveTo(x0 + w - 60 + Math.cos(a) * 24, wy + 40 + Math.sin(a) * 24); x.lineTo(x0 + w - 60 + Math.cos(a) * 32, wy + 40 + Math.sin(a) * 32); x.stroke(); }
    for (let i = 0; i < 9; i++) { const fx = x0 + 150 + i * 22 + (i > 3 ? 160 : 0), fy = wy + 100; x.strokeStyle = '#4c9a4a'; x.lineWidth = 2; x.beginPath(); x.moveTo(fx, wy + 122); x.lineTo(fx, fy); x.stroke(); P.circle(x, fx, fy, 6, ['#ef6a7a', '#f6c33a', '#8a6bd1'][i % 3]); P.circle(x, fx, fy, 2.5, '#fff6d0'); }
    x.restore();
    for (const sx of [-1, 1]) { P.box(x, gx + sx * 112 - 15, gy - 176, 30, 176, dark ? '#d6cbb7' : '#f1e9d8'); P.box(x, gx + sx * 112 - 15, gy - 176, 8, 176, 'rgba(0,0,0,0.06)'); P.box(x, gx + sx * 112 - 19, gy - 184, 38, 10, dark ? '#8f6f5f' : '#c2674c'); }
    P.box(x, gx - 97, gy - 124, 194, 124, dark ? '#4c4a4e' : '#c9c1b0');
    x.strokeStyle = '#2f6b4f'; x.lineWidth = 3; x.beginPath(); for (let i = -92; i <= 92; i += 11) { x.moveTo(gx + i, gy - 104); x.lineTo(gx + i, gy - 2); } x.stroke();
    x.lineWidth = 4; x.beginPath(); x.moveTo(gx - 97, gy - 104); x.lineTo(gx + 97, gy - 104); x.moveTo(gx - 97, gy - 40); x.lineTo(gx + 97, gy - 40); x.stroke();
    const ey = gy - 196;
    x.fillStyle = dark ? '#3e4a5a' : '#5d6f86'; P.poly(x, [[gx - 160, ey + 16], [gx + 160, ey + 16], [gx + 134, ey - 18], [gx - 134, ey - 18]]); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1.5; for (let i = -150; i <= 150; i += 12) { x.beginPath(); x.moveTo(gx + i, ey + 16); x.lineTo(gx + i * 0.84, ey - 18); x.stroke(); }
    P.box(x, gx - 162, ey + 14, 324, 6, dark ? '#2c3542' : '#43536a');
    P.rbox(x, gx - 92, ey + 26, 184, 34, 5, '#fbf6ea'); text(x, '向日葵幼儿园', gx + 12, ey + 44, 22, '#c8382c');
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; P.ell(x, gx - 72 + Math.cos(a) * 8, ey + 43 + Math.sin(a) * 8, 6, 2.5, '#f2b81c', a); } P.circle(x, gx - 72, ey + 43, 4.5, '#7a4a1f');
  }
  B['street-rain'] = (b) => {
    b.tint = TINT.rain; b.sky = (x) => P.sky(x, 'rain', 470);
    b.cloud(b.seed + 1, 1000, 340, 'rain', -140, -60, { peak: 0.35, side: 0.4, r0: 0.17, vx: 5, d: 0.15 });
    b.cloud(b.seed + 2, 820, 280, 'rain', 600, -10, { peak: 0.3, side: 0.35, r0: 0.18, vx: 4, d: 0.15 });
    street(b, 'rain');
  };
  B['street-dream'] = (b, shot) => {
    const jelly = shot.variant === 'jelly';
    b.tint = TINT.dusk; b.sky = (x, t) => { P.sky(x, 'dusk', 470); P.stars(x, 4, 70, 230, t); };
    b.cloud(b.seed + 1, 760, 360, 'dusk', -80, 10, { vx: 5 }); b.cloud(b.seed + 2, 520, 260, 'dusk', 760, 40, { peak: 0.6, vx: 4 });
    street(b, 'dusk', { lanterns: true });
    const poles = [[330, 610], [880, 612], [1160, 640]];
    b.paint('mid', (x) => { for (const [px, py] of poles) { P.box(x, px - 4, py - 300, 8, 300, '#262331'); P.box(x, px - 4, py - 300, 60, 6, '#262331'); } });
    const base = b.anim.mid;
    b.anim.mid = (x, t) => {
      base(x, t);
      for (const [px, py] of poles) { P.lantern(x, px + 50, py - 260, 1.1, t); P.streak(x, px + 50, 662, 70, 26, '#ff7a4a', 0.35, px); }
      if (!jelly) for (const [bx, by, s, c] of [[700, 628, 0.9, '#3e6e58'], [1080, 600, 0.72, '#7a3b4a']]) beetle(x, t, bx, by, s, c);
    };
    if (jelly) b.anim.front = (x, t) => {
      const cols = ['#f07080', '#78b8f0', '#f8d060', '#98dc98', '#c890e8', '#f0a0c8'];
      for (let i = 0; i < 12; i++) { const sp = 16 + P.hash(i) * 14, yy = 760 - ((t * sp + P.hash(i + 3) * 760) % 900), xx = 60 + ((i * 113) % 1180) + Math.sin(t * 0.6 + i) * 24; jellyUmbrella(x, t, xx, yy, 0.55 + P.hash(i + 1) * 0.5, cols[i % 6]); }
    };
  };
  function beetle(x, t, bx, by, s, c) {
    const br = Math.sin(t * 0.8 + bx) * 2 * s; x.save(); x.translate(bx, by + br); x.scale(s, s);
    P.ell(x, 0, 52, 130, 14, 'rgba(10,8,20,0.35)');
    for (const lx of [-70, -25, 25, 70]) { x.strokeStyle = '#1a1820'; x.lineWidth = 6; x.beginPath(); x.moveTo(lx, 20); x.lineTo(lx * 1.2, 52); x.stroke(); }
    x.fillStyle = P.lg(x, 0, -60, 0, 40, [P.mix(c, '#ffffff', 0.25), c, P.mix(c, '#000000', 0.45)]); x.beginPath(); x.ellipse(0, 0, 118, 58, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-6, -58); x.quadraticCurveTo(-2, -10, -10, 50); x.stroke(); x.stroke();
    P.ell(x, -40, -30, 46, 14, 'rgba(255,255,255,0.22)', -0.25);
    P.ell(x, 108, 6, 30, 26, P.mix(c, '#000000', 0.3));
    const lid = 0.45 + 0.15 * Math.sin(t * 0.6 + bx);
    for (const ey of [-6, 16]) { P.circle(x, 126, ey, 10, '#fff2b0'); P.glow(x, 126, ey, 40, '#ffe9a0', 0.5); x.fillStyle = P.css(P.mix(c, '#000000', 0.3)); x.fillRect(114, ey - 11, 24, 22 * lid); }
    x.strokeStyle = '#1a1820'; x.lineWidth = 2; for (const d of [-1, 1]) { x.beginPath(); x.moveTo(132, d * 10); x.quadraticCurveTo(160, d * 30, 170, d * 26 - 10); x.stroke(); }
    const z = (t * 0.5) % 1; text(x, 'z', 150 + z * 30, -60 - z * 40, 18 + z * 10, `rgba(255,255,255,${1 - z})`, 400);
    x.restore();
  }
  function jellyUmbrella(x, t, cx, cy, s, c) {
    const p = Math.sin(t * 2.2 + cx * 0.01) * 0.08; x.save(); x.translate(cx, cy); x.scale(s, s);
    P.glow(x, 0, 0, 120, c, 0.35);
    x.fillStyle = P.lg(x, 0, -50, 0, 10, [P.mix(c, '#ffffff', 0.4), c]); x.beginPath(); x.ellipse(0, 0, 72 * (1 + p), 48 * (1 - p), 0, Math.PI, TAU); x.closePath(); x.fill();
    for (let i = -3; i <= 3; i++) { x.beginPath(); x.arc(i * 20.5, 0, 10.5, 0, Math.PI); x.fillStyle = P.css(P.mix(c, '#000000', 0.12)); x.fill(); }
    x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(0, -46); x.quadraticCurveTo(i * 22, -30, i * 30, 0); x.stroke(); }
    x.strokeStyle = P.css(P.mix(c, '#ffffff', 0.3), 0.85); x.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * 22, 8); for (let k = 1; k <= 6; k++) x.lineTo(i * 22 + Math.sin(t * 3 + k + i) * 7, 8 + k * 17); x.stroke(); }
    x.strokeStyle = '#5b4636'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -48); x.lineTo(0, 60); x.arc(-8, 60, 8, 0, Math.PI); x.stroke();
    x.restore();
  }

  // ------------------------------------------------- puddle & puddle-sky
  B.puddle = (b) => {
    const sd = b.seed; b.tint = TINT.rain; b.depth = { back: 0.25, mid: 0.85, front: 1.2 };
    b.paint('back', (x) => {
      const tmp = P.layer(), tx = tmp.x;
      P.sky(tx, 'rain', 250); P.cityFar(tx, 260, sd, { color: '#6f7d92', minH: 140, varH: 220, win: 0.3, haze: '#8e9aab', hazeA: 0.6 });
      shopFront(tx, 40, 260, 280, 250, { awning: '#4f8a6a', sign: '#2f5d7a', text: '杂货铺', lit: true, mood: 'rain' }, 3);
      shopFront(tx, 880, 260, 320, 260, { awning: '#b0473a', sign: '#a83a2c', text: '包子', lit: true, mood: 'rain' }, 4);
      P.box(tx, -M, 260, W + 2 * M, 60, '#5b6370');
      for (let i = 0; i < 26; i++) P.circle(tx, P.hash(i) * W, 120 + P.hash(i + 9) * 230, 8 + P.hash(i + 4) * 20, `rgba(255,${200 + ((P.hash(i + 2) * 40) | 0)},140,${0.25 + P.hash(i + 5) * 0.3})`);
      x.filter = 'blur(6px)'; x.drawImage(tmp.c, -M, -M); x.filter = 'none';
    });
    b.paint('mid', (x) => {
      x.fillStyle = P.vg(x, 262, H + M, ['#6a727e', '#454a54', '#2c3038']); x.fillRect(-M, 262, W + 2 * M, H);
      P.tex(x, 'blot', 0.55, 'soft-light', [-M, 262, W + 2 * M, H], 1.2);
      const r = P.rng(sd); for (let i = 0; i < 1000; i++) { const yy = 270 + r() * 470, s = 0.6 + ((yy - 270) / 470) * 2.4; P.circle(x, r() * W, yy, s * (0.4 + r() * 0.6), `rgba(${r() < 0.5 ? '200,205,215' : '20,22,30'},${0.12 + r() * 0.2})`); }
      x.save(); P.blob(x, 770, 565, 450, 138, 3, 0.11); x.clip();
      x.fillStyle = P.vg(x, 427, 703, ['#d7ebf5', '#8fc0e9', '#4a8ad6', '#2c6bc4']); x.fillRect(300, 400, 980, 330);
      x.save(); x.translate(0, 1130); x.scale(1, -1); x.drawImage(P.cumulus(sd + 5, 560, 330, 'day', { whale: true }), 470, 470, 560, 330); x.drawImage(P.cumulus(sd + 6, 300, 180, 'day', { peak: 0.6 }), 980, 520); x.restore();
      x.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 6; i++) x.fillRect(330, 440 + i * 46, 900, 2);
      x.restore();
      P.blob(x, 770, 565, 450, 138, 3, 0.11); x.strokeStyle = 'rgba(24,26,32,0.55)'; x.lineWidth = 5; x.stroke(); x.strokeStyle = 'rgba(230,240,255,0.35)'; x.lineWidth = 1.5; x.stroke();
    });
    b.anim.mid = (x, t) => { x.save(); P.blob(x, 770, 565, 450, 138, 3, 0.11); x.clip(); ripples(x, t, 360, 450, 800, 230, 13, 16, '255,255,255', 0.6); x.restore(); ripples(x, t, -40, 380, W + 80, 340, 29, 18, '200,210,230', 0.3); };
  };
  B['puddle-sky'] = (b) => {
    b.sky = (x) => { P.sky(x, 'day', 720); };
    b.depth = { back: 0.3, mid: 0.7, front: 1.1 };
    b.cloud(b.seed + 1, 1000, 520, 'day', 160, 40, { whale: true, d: 0.25, vx: 7 });
    b.cloud(b.seed + 2, 560, 340, 'day', -140, 330, { peak: 0.8, d: 0.35, vx: 5 });
    b.cloud(b.seed + 3, 620, 380, 'day', 880, 330, { peak: 0.9, d: 0.35, vx: 6 });
    b.cloud(b.seed + 4, 300, 160, 'day', 980, 40, { peak: 0.5, d: 0.15, vx: 3 });
    b.paint('front', (x) => {
      P.rays(x, 120, -120, 1.05, 1300, 9, 0.9, '#fffbe6', 0.35, 7);
      x.fillStyle = P.rg(x, W / 2, H / 2, W * 0.32, W * 0.78, [[0, 'rgba(20,50,70,0)'], [0.7, 'rgba(20,50,70,0.35)'], [1, 'rgba(10,30,45,0.9)']]); x.fillRect(...FULL);
    });
    b.anim.front = (x, t) => {
      x.save(); x.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) { const ph = (t * 0.22 + i * 0.25) % 1; x.strokeStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; x.lineWidth = 3 * (1 - ph) + 0.5; x.beginPath(); x.ellipse(W * 0.55, H * 0.48, ph * 720, ph * 330, 0, 0, TAU); x.stroke(); }
      for (let i = 0; i < 40; i++) { const xx = P.hash(i) * W, yy = P.hash(i + 40) * H, tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1); P.glow(x, xx, yy, 10 + P.hash(i + 3) * 10, '#ffffff', 0.8 * tw, 'screen'); P.circle(x, xx, yy, 1.4, `rgba(255,255,255,${0.9 * tw})`); }
      x.restore();
    };
  };

  // ------------------------------------------------- night walk / balcony
  const VP = [640, 432], FOC = 520, CAMH = 1.25;
  const proj = (X, Y, Z) => [VP[0] + (X * FOC) / Z, VP[1] + ((CAMH - Y) * FOC) / Z];
  function quad(x, a, b, c, d, fill) { P.poly(x, [a, b, c, d]); P.paint(x, fill); }
  function perspStreet(x, mood, seed) {
    const night = mood === 'night', r = P.rng(seed), Z0 = 2.2, Z1 = 70;
    quad(x, proj(-4.2, 0, Z0), proj(4.2, 0, Z0), proj(4.2, 0, Z1), proj(-4.2, 0, Z1), P.vg(x, VP[1], H, night ? ['#2a3352', '#141a2c', '#0b0e18'] : ['#9aa1a8', '#6c737c', '#4c535c']));
    for (const s of [-1, 1]) quad(x, proj(s * 4.2, 0.12, Z0), proj(s * 6.5, 0.12, Z0), proj(s * 6.5, 0.12, Z1), proj(s * 4.2, 0.12, Z1), night ? '#2c3146' : '#a7a8a4');
    for (let z = 4; z < Z1; z += 7) { const a = proj(-0.08, 0, z), b2 = proj(0.08, 0, z + 2.8); P.poly(x, [a, [b2[0], a[1]], b2, [a[0], b2[1]]]); x.fillStyle = night ? 'rgba(220,220,200,0.25)' : 'rgba(250,250,240,0.6)'; x.fill(); }
    // facades, back to front
    const blocks = [];
    for (const s of [-1, 1]) { let z = Z1; while (z > Z0) { const len = 5 + r() * 7, hgt = 5 + r() * 8; blocks.push([s, Math.max(Z0, z - len), z, hgt, r()]); z -= len + 0.3; } }
    blocks.sort((a, b) => b[2] - a[2]);
    for (const [s, za, zb, hgt, v] of blocks) {
      const X = s * 6.5, base = night ? P.mix('#3a3550', '#25304e', v) : P.mix('#d7c9b2', '#b9b4a8', v);
      quad(x, proj(X, 0, za), proj(X, hgt, za), proj(X, hgt, zb), proj(X, 0, zb), P.css(base));
      quad(x, proj(X, hgt, za), proj(X + s * 0.6, hgt + 0.4, za), proj(X + s * 0.6, hgt + 0.4, zb), proj(X, hgt, zb), night ? '#1c1a28' : '#7a5a4a');
      for (let fy = 1; fy < hgt - 1; fy += 2.6) for (let fz = za + 0.6; fz < zb - 1.2; fz += 2.2) {
        const lit = night ? r() < 0.45 : false;
        quad(x, proj(X, fy, fz), proj(X, fy + 1.3, fz), proj(X, fy + 1.3, fz + 1.1), proj(X, fy, fz + 1.1), lit ? '#ffcf7a' : night ? '#1a2036' : '#6f8ea8');
      }
      if (za < 20 && r() < 0.7) { const [sx, sy] = proj(X - s * 0.4, 3.4, za + 1); const sc = FOC / (za + 1) / 52; P.rbox(x, sx - 9 * sc, sy - 30 * sc, 18 * sc, 60 * sc, 2 * sc, ['#b03a2e', '#2f5d7a', '#3f7d4f'][(r() * 3) | 0]); vtext(x, ['面馆', '理发', '药店', '茶'][(r() * 4) | 0], sx, sy, 12 * sc, '#fbf3df'); if (night) P.glow(x, sx, sy, 60 * sc, '#ff9a6a', 0.4); }
    }
    for (const s of [-1, 1]) for (let z = 4; z < Z1; z += 9) { const a = proj(s * 5.2, 0, z), b2 = proj(s * 5.2, 7.5, z); x.strokeStyle = night ? '#141826' : '#5d5a55'; x.lineWidth = Math.max(1, 70 / z); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b2[0], b2[1]); x.stroke(); }
    x.strokeStyle = night ? 'rgba(10,12,22,0.8)' : 'rgba(40,40,50,0.6)'; x.lineWidth = 1;
    for (const s of [-1, 1]) for (const h of [7.2, 6.8]) { x.beginPath(); for (let z = 4; z < Z1; z += 9) { const a = proj(s * 5.2, h, z), b2 = proj(s * 5.2, h, z + 9); if (z === 4) x.moveTo(a[0], a[1]); x.quadraticCurveTo((a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2 + 60 / z, b2[0], b2[1]); } x.stroke(); }
  }
  B['night-walk'] = (b, shot) => {
    const sd = b.seed;
    b.tint = TINT.night;
    if (shot.variant === 'balcony') {
      b.sky = (x, t) => { P.sky(x, 'night', 560); P.stars(x, 11, 180, 380, t); P.moon(x, 980, 120, 36); };
      b.cloud(sd + 1, 600, 220, 'night', 200, 90, { peak: 0.5, d: 0.15, vx: 3 });
      b.paint('back', (x) => { P.cityFar(x, 560, sd, { color: '#1d2547', minH: 60, varH: 200, win: 0.4, winSize: 2.5 }); P.cityFar(x, 600, sd + 3, { color: '#141a35', minH: 40, varH: 120, win: 0.45, winSize: 3 }); });
      b.paint('mid', (x) => {
        x.fillStyle = P.vg(x, 590, H + M, ['#2a3a3a', '#141c22']); x.fillRect(-M, 590, W + 2 * M, H);
        x.strokeStyle = '#2f5a4c'; x.lineWidth = 7; x.beginPath(); for (let px = -M; px < W + M; px += 54) { x.moveTo(px, 600); x.lineTo(px, 700); } x.stroke();
        P.box(x, -M, 588, W + 2 * M, 14, '#3d6a5a'); P.box(x, -M, 600, W + 2 * M, 3, 'rgba(0,0,0,0.3)');
        for (const [px, i] of [[90, 0], [210, 1], [1090, 2], [1200, 3]]) P.pot(x, px, 590, 62, 34, '#e9e4d6', 'night', sd + i, { box: true, leaves: 7, fh: 60, fruit: i % 2 ? 3 : 0 });
        P.glow(x, -40, 380, 380, '#ffb86a', 0.35);
      });
      b.anim.mid = (x, t) => laundry(x, t, -60, 470, 420, 455, 3, ['#d8d0c0', '#9ab8d8', '#e8b8b0'], 16);
      return;
    }
    b.sky = (x, t) => { P.sky(x, 'night', 440); P.stars(x, 12, 160, 330, t); P.moon(x, 1010, 110, 34); };
    b.cloud(sd + 1, 700, 240, 'night', 120, 60, { peak: 0.5, d: 0.15, vx: 3 }); b.cloud(sd + 2, 460, 180, 'night', 760, 160, { peak: 0.4, d: 0.15, vx: 2 });
    b.paint('mid', (x) => {
      perspStreet(x, 'night', sd);
      for (const s of [-1, 1]) for (const z of [5, 12, 20, 30, 45]) { const [lx, ly] = proj(s * 4.5, 4.4, z), [gx, gy] = proj(s * 4.5, 0, z), sc = FOC / z / 60; x.strokeStyle = '#11141f'; x.lineWidth = Math.max(1, 6 * sc); x.beginPath(); x.moveTo(gx, gy); x.lineTo(lx, ly); x.stroke(); P.glow(x, lx, ly, 120 * sc, '#ffd58a', 0.9); P.circle(x, lx, ly, 5 * sc, '#fff4d0'); P.streak(x, lx - s * 30 * sc, gy + 4, 220 * sc, 40 * sc, '#ffc070', 0.45, z * 7 + s); }
    });
    b.anim.mid = (x, t) => ripples(x, t, 200, 560, 880, 160, 5, 14, '255,220,160', 0.3);
  };

  // ------------------------------------------------- the old building
  B['old-building'] = (b, shot) => {
    const v = shot.variant || 'day', night = v === 'night', gold = v === 'farewell', face = v === 'face', sd = 505;
    const mood = night ? 'night' : gold ? 'gold' : 'day', k = face ? 1.42 : 1, cx = 640, gy = face ? 778 : 650;
    b.tint = TINT[mood] || null;
    b.sky = (x, t) => { P.sky(x, mood, 640); if (night) { P.stars(x, 21, 200, 420, t); P.moon(x, 1080, 104, 32); } };
    if (night) { b.cloud(sd + 1, 620, 240, 'night', 60, 70, { peak: 0.5, vx: 2 }); }
    else {
      b.cloud(sd + 2, 860, 600, gold ? 'gold' : 'day', 520, -90, { d: 0.18, vx: 4 });
      b.cloud(sd + 3, 460, 280, gold ? 'gold' : 'day', -80, 120, { peak: 0.6, vx: 5 });
      b.cloud(sd + 4, 300, 160, gold ? 'gold' : 'day', 1060, 250, { peak: 0.5, vx: 3, d: 0.12 });
    }
    b.paint('back', (x) => {
      P.ridge(x, 560, 70, 340, night ? ['#1b2440', '#2b3a5c'] : gold ? ['#b9a7a5', '#d9c3b0'] : ['#7f9fbf', '#a9c2d6'], 3);
      P.cityFar(x, 640, sd, { color: night ? '#1c2440' : gold ? '#c8b4a6' : '#a9b8c6', minH: 60, varH: 150, win: night ? 0.35 : 0, haze: night ? '#28335a' : gold ? '#efd9bd' : '#cddfeb', hazeA: 0.55 });
    });
    b.paint('mid', (x) => {
      if (!face) { P.wires(x, [[-M, 120], [380, 150], [900, 110], [W + M, 140]], { n: 3, sag: 22, color: night ? 'rgba(10,12,24,0.8)' : 'rgba(40,40,50,0.7)' }); }
      oldBuilding(x, cx, gy, k, mood, { face: true, chai: gold, empty: gold });
      if (!face) {
        ground(x, gy - 4, night ? ['#232a36', '#151a22'] : gold ? ['#c9b49a', '#9f8a72'] : ['#b9b0a0', '#8e8676'], { cracks: 4 });
        P.tree(x, 150, gy + 30, 560, night ? 'night' : gold ? 'gold' : 'day', 77, { wide: 1.15 });
        P.tree(x, 1180, gy + 40, 470, night ? 'night' : gold ? 'gold' : 'day', 78, { wide: 1 });
        if (!gold) { const bx = 960, by = gy + 40; x.strokeStyle = night ? '#1b1d26' : '#2f3a4a'; x.lineWidth = 3; for (const wx of [-30, 30]) { x.beginPath(); x.arc(bx + wx, by - 16, 16, 0, TAU); x.stroke(); } x.beginPath(); x.moveTo(bx - 30, by - 16); x.lineTo(bx - 4, by - 40); x.lineTo(bx + 22, by - 40); x.lineTo(bx + 30, by - 16); x.moveTo(bx - 4, by - 40); x.lineTo(bx, by - 16); x.lineTo(bx + 22, by - 40); x.stroke(); P.rbox(x, bx - 12, by - 46, 18, 5, 2, night ? '#1b1d26' : '#7a3a2a'); }
        for (const [px, i] of [[420, 0], [470, 1], [820, 2]]) P.pot(x, px, gy + 10, 34, 22, '#b4552f', night ? 'night' : gold ? 'gold' : 'day', 90 + i, { leaves: 6, fh: 36, flowers: gold ? 0 : 3 });
      }
    });
    const eyeMode = night ? 'night' : gold ? 'smile' : 'day';
    b.anim.mid = (x, t) => {
      buildingEyes(x, t, cx, gy, k, eyeMode);
      if (!night && !gold) { const { x0, y0, fh, bayW } = BLD(cx, gy, k); laundry(x, t, x0 + bayW * 1.05, y0 + 34 * k + fh * 3.08, x0 + bayW * 2.95, y0 + 34 * k + fh * 3.08, 5, ['#ffffff', '#f2b8a8', '#9fc4e6', '#f6e3a0', '#ffffff'], 10 * k); }
    };
    if (face) b.breathe = { layer: 'mid', amp: 0.007, oy: gy };
    if (gold) b.anim.front = (x, t) => { const people = [[180, 700, 150, '#6a8fb8'], [260, 708, 130, '#c86a5a'], [1010, 704, 140, '#8a7aa8'], [1100, 712, 160, '#d0a040'], [1190, 700, 120, '#5a9a6a']]; people.forEach(([px, py, h, c], i) => K.person(x, t + i, px, py, h, c, { wave: i % 2 === 0 })); };
    if (night) b.anim.front = null;
  };

  // ------------------------------------------------- rooftop garden
  B.rooftop = (b, shot) => {
    const v = shot.variant || 'day', mood = v, sd = 606, G = { day: 'day', sunset: 'sunset', dusk: 'dusk', dawn: 'dawn' }[v];
    b.tint = TINT[mood] || null;
    b.sky = (x, t) => {
      P.sky(x, mood, 600);
      if (v === 'sunset') P.glow(x, 160, 540, 520, '#ffd08a', 0.75, 'screen');
      if (v === 'dawn') P.glow(x, 1120, 560, 520, '#ffe0b8', 0.7, 'screen');
      if (v === 'dusk') { P.stars(x, 8, 70, 240, t); P.glow(x, 200, 600, 420, '#f0a080', 0.4, 'screen'); }
    };
    const cp = { day: 'day', sunset: 'sunset', dusk: 'dusk', dawn: 'dawn' }[v];
    b.cloud(sd + 1, 820, 520, cp, 420, -80, { vx: 4 }); b.cloud(sd + 2, 440, 260, cp, -100, 140, { peak: 0.6, vx: 5 }); b.cloud(sd + 3, 280, 150, cp, 1000, 230, { peak: 0.5, vx: 3, d: 0.12 });
    b.paint('back', (x) => {
      const far = { day: '#9fb3c4', sunset: '#a77e8c', dusk: '#433f66', dawn: '#b6a6c2' }[v], haze = { day: '#d4e5ef', sunset: '#f4b892', dusk: '#7d6488', dawn: '#f6d2c6' }[v];
      P.ridge(x, 520, 60, 300, [P.mix(far, '#000', 0.05), far], 5, { texA: 0.2 });
      P.cityFar(x, 560, sd, { color: far, minH: 30, varH: 120, win: v === 'dusk' ? 0.4 : 0, haze, hazeA: 0.5, hazeH: 90 });
      P.cityFar(x, 600, sd + 5, { color: P.mix(far, '#000000', 0.18), minH: 20, varH: 90, win: v === 'dusk' ? 0.45 : 0, winSize: 3.5 });
    });
    b.paint('mid', (x) => {
      const wallC = { day: '#cdbba3', sunset: '#c49a86', dusk: '#6e6278', dawn: '#d6bfb4' }[v];
      P.box(x, -M, 548, W + 2 * M, 56, P.vg(x, 548, 604, [wallC, P.mix(wallC, '#000000', 0.18)])); P.tex(x, 'blot', 0.45, 'soft-light', [-M, 548, W + 2 * M, 56]);
      P.box(x, -M, 542, W + 2 * M, 9, P.mix(wallC, '#ffffff', 0.15));
      x.strokeStyle = v === 'dusk' ? '#2f4a44' : '#3f7d62'; x.lineWidth = 3; x.beginPath(); x.moveTo(-M, 506); x.lineTo(W + M, 506); for (let px = -M; px < W + M; px += 40) { x.moveTo(px, 506); x.lineTo(px, 542); } x.stroke();
      const fl = { day: ['#bfb3a1', '#958a7a'], sunset: ['#c79f8c', '#94705f'], dusk: ['#5c5268', '#3b3445'], dawn: ['#d8c2b6', '#a99086'] }[v];
      ground(x, 604, fl, { cracks: 9 });
      P.rbox(x, 990, 360, 170, 120, 14, P.lg(x, 990, 0, 1160, 0, v === 'dusk' ? ['#5d5a70', '#3a3848'] : ['#eeebe4', '#b9b4a8'])); for (const lx of [1005, 1140]) P.box(x, lx, 480, 8, 70, v === 'dusk' ? '#2e2c38' : '#6d6a64');
      P.line(x, [[1030, 360], [1030, 330], [1110, 330], [1110, 360]], v === 'dusk' ? '#2e2c38' : '#6d6a64', 3);
      for (const [px, py, w, h, col, i] of [[80, 650, 120, 54, '#f4f2ec', 0], [210, 640, 96, 44, '#e9e4d6', 1], [-20, 700, 150, 60, '#f4f2ec', 2], [1080, 650, 120, 54, '#f4f2ec', 3], [1200, 690, 110, 50, '#e9e4d6', 4], [960, 700, 90, 40, '#5d86a9', 5]]) P.pot(x, px, py, w, h, col, G, sd + i * 7, { box: col !== '#5d86a9', leaves: 9, fh: h * 1.8, fruit: i % 2 ? 0 : 4, flowers: i === 1 ? 4 : 0 });
      P.ell(x, 330, 690, 70, 18, v === 'dusk' ? '#7a8aa0' : '#e9eef2'); P.ell(x, 330, 686, 60, 12, v === 'dusk' ? '#3f5868' : '#7fb0c8');
      for (const bx of [60, 160, 1060, 1160]) { x.strokeStyle = '#a88a52'; x.lineWidth = 3; x.beginPath(); x.moveTo(bx, 640); x.lineTo(bx + 10, 470); x.stroke(); }
      x.strokeStyle = '#a88a52'; x.lineWidth = 2; x.beginPath(); x.moveTo(50, 520); x.lineTo(180, 515); x.moveTo(1050, 515); x.lineTo(1180, 520); x.stroke();
      const Gc = P.greens(G); for (const [bx, i] of [[110, 0], [1110, 1]]) { const r = P.rng(sd + 40 + i); for (let k = 0; k < 18; k++) P.leafBlob(x, bx + (r() - 0.5) * 120, 480 + r() * 150, 10 + r() * 10, Gc[1 + ((r() * 3) | 0)], r); for (let k = 0; k < 9; k++) P.circle(x, bx + (r() - 0.5) * 110, 500 + r() * 130, 7 + r() * 3, '#d8362a'); }
    });
    b.anim.mid = (x, t) => {
      P.sunflower(x, 1000, 640, 230, t, G); P.sunflower(x, 260, 650, 200, t + 1, G); P.sunflower(x, 300, 655, 170, t + 2, G);
      laundry(x, t, 560, 440, 900, 450, 7, ['#ffffff', '#f2b8a8', '#9fc4e6', '#f6e3a0'], 18);
      x.strokeStyle = v === 'dusk' ? '#2e2c38' : '#6d6a64'; x.lineWidth = 3; x.beginPath(); x.moveTo(560, 440); x.lineTo(560, 548); x.moveTo(900, 450); x.lineTo(900, 548); x.stroke();
      [[420, 542, 0.9], [470, 542, 0.85], [760, 542, 0.95]].forEach(([px, py, s], i) => K.pigeon(x, t, px, py, s * 1.3, i));
    };
  };

  B['wall-chai'] = (b) => {
    b.tint = ['#ff9a6a', 0.08]; b.depth = { back: 0.6, mid: 0.85, front: 1.2 };
    b.paint('back', (x) => {
      P.bricks(x, -M, -M, W + 2 * M, H + 2 * M, '#a9503d', 61, { bw: 46, bh: 18, patches: 18, wash: 0.6 });
      P.stains(x, -M, -M, W + 2 * M, H, 9, 'rgba(40,20,15,0.16)', 22);
      P.window(x, 40, 30, 190, 210, { grille: true, plants: true, curtain: '#e9d7a6', seed: 4 });
      x.strokeStyle = 'rgba(40,20,15,0.6)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(330, -M); x.lineTo(360, 120); x.lineTo(340, 220); x.lineTo(390, 330); x.lineTo(370, 410); x.stroke();
      x.fillStyle = P.lg(x, 0, 0, W, 0, ['rgba(255,190,120,0.22)', 'rgba(0,0,0,0)', 'rgba(40,10,30,0.3)']); x.fillRect(...FULL);
      P.box(x, -M, 600, W + 2 * M, 140, P.vg(x, 600, H, ['#6a5a50', '#3e342e']));
    });
    b.anim.back = (x, t) => { const pu = 1 + Math.sin(t * 2.2) * 0.025; chai(x, 790, 300, 190 * pu, 1); P.glow(x, 790, 300, 300, '#ff3a2a', 0.08 + 0.05 * Math.sin(t * 2.2), 'source-over'); };
  };

  // ------------------------------------------------- fog city
  B['city-fog'] = (b, shot) => {
    const v = shot.variant, sd = 707;
    b.tint = v === 'deep' ? TINT.grey : null;
    b.sky = (x) => P.sky(x, v === 'deep' ? 'grey' : 'day', 440);
    b.cloud(sd + 1, 760, 460, v === 'deep' ? 'grey' : 'day', 300, -60, { vx: 4 }); b.cloud(sd + 2, 420, 240, v === 'deep' ? 'grey' : 'day', -60, 80, { peak: 0.6 });
    b.paint('mid', (x) => {
      perspStreet(x, 'day', sd);
      for (const s of [-1, 1]) for (const z of [4.5, 9, 15, 24]) { const [tx, ty] = proj(s * 4.8, 0, z), sc = FOC / z / 100; P.tree(x, tx, ty, 520 * sc, 'day', sd + z * 10 + s, { wide: 0.9 }); }
      for (const s of [-1, 1]) { const [bx, by] = proj(s * 5.6, 3.6, 7), sc = FOC / 7 / 60; P.rbox(x, bx - 26 * sc, by - 12 * sc, 52 * sc, 22 * sc, 3 * sc, s < 0 ? '#c8463a' : '#2f6a9a'); text(x, s < 0 ? '水果' : '书店', bx, by - 1 * sc, 13 * sc, '#fff6e0'); }
      for (let i = 0; i < 9; i++) { const z = 3 + i * 0.55, a = proj(-3.6, 0, z), b2 = proj(3.6, 0, z + 0.3); P.poly(x, [a, [b2[0], a[1]], b2, [a[0], b2[1]]]); x.fillStyle = 'rgba(240,240,232,0.75)'; x.fill(); }
    });
    if (v === 'burst') b.anim.mid = (x, t) => {
      const k = clamp((t - 1.5) / 4, 0, 1); if (k <= 0) return;
      x.save(); x.lineCap = 'round'; const r = P.rng(5);
      for (let i = 0; i < 26; i++) { const ox = r() * W, oy = 380 + r() * 300, len = 120 + r() * 200, c = ['#e3402d', '#f6c42b', '#4caf50', '#3f8fd6', '#ef8fb0'][i % 5], kk = clamp(k * 1.6 - (i / 26) * 0.6, 0, 1); if (kk <= 0) continue; x.strokeStyle = c; x.lineWidth = 7 + r() * 6; x.globalAlpha = 0.85; x.beginPath(); x.moveTo(ox, oy); for (let s = 0; s <= 12 * kk; s++) x.lineTo(ox + (s / 12) * len, oy + Math.sin(s * 0.9 + i) * 14); x.stroke(); }
      for (let i = 0; i < 9; i++) { const kk = clamp(k * 1.5 - i * 0.07, 0, 1); if (kk <= 0) continue; const fx = 120 + i * 130, fy = 520 + Math.sin(i * 2) * 60, s = kk * (24 + (i % 3) * 8); x.globalAlpha = 1; for (let p = 0; p < 6; p++) { const a = (p / 6) * TAU; P.ell(x, fx + Math.cos(a) * s * 0.7, fy + Math.sin(a) * s * 0.7, s * 0.55, s * 0.32, ['#ef6a7a', '#f6c33a', '#9a7bd8'][i % 3], a); } P.circle(x, fx, fy, s * 0.35, i % 2 ? '#e3402d' : '#fff2b0'); }
      x.restore();
    };
  };

  // ------------------------------------------------- interiors
  function tiles(x, y0, y1, c1, c2, size = 60) { for (let yy = y0, row = 0; yy < y1; yy += size * 0.45, row++) for (let xx = -M - (row % 2) * size * 0.5; xx < W + M; xx += size) { P.box(x, xx, yy, size - 2, size * 0.45 - 2, (row + Math.round(xx / size)) % 2 ? c1 : c2); } P.tex(x, 'blot', 0.35, 'soft-light', [-M, y0, W + 2 * M, y1 - y0]); }
  B.kitchen = (b) => {
    b.tint = TINT.lamp; b.depth = { back: 0.5, mid: 0.8, front: 1.2 };
    b.paint('back', (x) => {
      P.box(x, ...FULL, P.vg(x, -M, 560, ['#d8c8a6', '#c2ae8a'])); P.tex(x, 'vs', 0.35, 'soft-light', FULL);
      for (let yy = 380; yy < 560; yy += 34) for (let xx = -M; xx < W + M; xx += 34) P.box(x, xx, yy, 32, 32, (xx / 34 + yy / 34) % 2 ? '#eef0ea' : '#e2e6df');
      P.window(x, 840, 70, 330, 250, { mode: 'dark', seed: 3, frame: '#efe9da', curtain: '#e9c2a8' });
      x.save(); x.beginPath(); x.rect(840, 70, 330, 250); x.clip(); P.cityFar(x, 320, 44, { color: '#16203d', minH: 30, varH: 160, win: 0.4, winSize: 3 }); P.moon(x, 1100, 120, 18); x.restore();
      x.strokeStyle = '#efe9da'; x.lineWidth = 12; x.strokeRect(840, 70, 330, 250);
      P.rbox(x, 60, 80, 170, 230, 6, '#f1eee6'); P.rbox(x, 60, 80, 170, 6, 3, '#d9d4c7');
      P.box(x, 80, 120, 46, 38, '#fbf8ef'); P.circle(x, 112, 132, 6, '#f2b81c'); P.box(x, 150, 180, 52, 44, '#fbf8ef'); x.strokeStyle = '#4caf50'; x.lineWidth = 2; x.beginPath(); x.moveTo(154, 214); x.lineTo(198, 210); x.stroke();
      P.rbox(x, 580, 110, 120, 150, 4, '#fbf8ef'); text(x, '十一月', 640, 132, 16, '#c8382c'); x.strokeStyle = 'rgba(80,80,80,0.4)'; x.lineWidth = 1; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(590, 150 + i * 22); x.lineTo(690, 150 + i * 22); x.stroke(); }
      tiles(x, 560, H + M, '#8a6e52', '#7b604a', 70);
    });
    b.paint('mid', (x) => {
      x.fillStyle = P.lg(x, 340, 0, 940, 0, ['#9a6038', '#b5774a', '#8a5432']); x.fillRect(340, 520, 600, 28); P.box(x, 360, 548, 18, 180, '#6e4529'); P.box(x, 900, 548, 18, 180, '#6e4529');
      ['#ffffff', '#f2f2f2', '#e9f0f6', '#fdf6e6'].forEach((c, i) => { x.save(); x.translate(560 + i * 62, 512); x.rotate(-0.12 + i * 0.1); P.box(x, -44, -6, 88, 10, c); x.fillStyle = 'rgba(80,80,90,0.5)'; for (let l = 0; l < 3; l++) x.fillRect(-36, -4 + l * 2.5, 60, 1); x.restore(); });
      P.rbox(x, 420, 470, 30, 50, 6, '#3d8a6a'); P.rbox(x, 416, 462, 38, 12, 4, '#2f6e54'); P.rbox(x, 480, 492, 34, 30, 4, '#f1eee6'); P.box(x, 480, 496, 34, 6, '#c8382c');
    });
    b.anim.back = (x, t) => { const sw = Math.sin(t * 0.8) * 2; x.strokeStyle = '#333'; x.lineWidth = 2; x.beginPath(); x.moveTo(640, -M); x.lineTo(640 + sw, 70); x.stroke(); x.fillStyle = '#2f5f4f'; P.poly(x, [[598 + sw, 70], [682 + sw, 70], [706 + sw, 108], [574 + sw, 108]]); x.fill(); P.glow(x, 640 + sw, 120, 520, '#ffcf8a', 0.55); P.circle(x, 640 + sw, 110, 10, '#fff2c0'); };
  };
  B.bedroom = (b) => {
    b.tint = ['#3a4a7a', 0.26]; b.depth = { back: 0.5, mid: 0.8, front: 1.2 };
    b.paint('back', (x) => {
      P.box(x, ...FULL, P.vg(x, -M, 560, ['#8fa0bb', '#73839f']));
      x.fillStyle = 'rgba(255,255,255,0.12)'; for (let yy = -M; yy < 560; yy += 46) for (let xx = -M + ((yy / 46) % 2) * 23; xx < W + M; xx += 46) P.ell(x, xx, yy, 5, 8, 'rgba(255,255,255,0.12)');
      P.window(x, 760, 90, 300, 260, { mode: 'dark', seed: 5, frame: '#cfd6e2' }); x.save(); x.beginPath(); x.rect(760, 90, 300, 260); x.clip(); P.stars(x, 2, 40, 300); P.moon(x, 980, 170, 26); x.restore(); x.strokeStyle = '#cfd6e2'; x.lineWidth = 12; x.strokeRect(760, 90, 300, 260);
      x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(160,190,255,0.16)'; P.poly(x, [[760, 90], [1060, 90], [860, 700], [380, 700]]); x.fill(); x.restore();
      for (const [px, py, c] of [[200, 140, '#f2b81c'], [330, 170, '#e3402d'], [440, 130, '#4caf50']]) { x.save(); x.translate(px, py); x.rotate((P.hash(px) - 0.5) * 0.2); P.box(x, -40, -30, 80, 60, '#f6f3ea'); P.circle(x, 0, -4, 14, c); x.strokeStyle = '#3f6ec4'; x.lineWidth = 2; x.beginPath(); x.moveTo(-30, 20); x.lineTo(30, 18); x.stroke(); x.restore(); }
      P.box(x, -M, 560, W + 2 * M, H, P.vg(x, 560, H, ['#6f5c4c', '#4f4036'])); P.tex(x, 'hs', 0.4, 'soft-light', [-M, 560, W + 2 * M, H]);
      P.rbox(x, 1120, 160, 140, 520, 4, '#8a6a52'); P.circle(x, 1140, 420, 6, '#d8c070');
    });
    b.paint('mid', (x) => {
      P.rbox(x, 20, 440, 520, 150, 14, '#e8dff0'); P.rbox(x, 20, 430, 160, 70, 24, '#ffffff');
      x.fillStyle = 'rgba(240,160,180,0.5)'; for (let i = 0; i < 30; i++) P.circle(x, 200 + P.hash(i) * 320, 470 + P.hash(i + 3) * 100, 6, 'rgba(240,150,170,0.5)');
      P.circle(x, 1060, 610, 46, '#c98a5a'); P.circle(x, 1030, 566, 20, '#c98a5a'); P.circle(x, 1090, 566, 20, '#c98a5a'); P.circle(x, 1060, 620, 22, '#e6b48a'); P.circle(x, 1048, 600, 4, '#2a1a14'); P.circle(x, 1072, 600, 4, '#2a1a14');
      ['#e3402d', '#f6c42b', '#4caf50', '#3f8fd6', '#a25ad1', '#ef8fb0', '#8b5a2b'].forEach((c, i) => { x.save(); x.translate(560 + i * 40, 670 + Math.sin(i) * 10); x.rotate(P.hash(i) * 2); P.rbox(x, -24, -5, 48, 10, 3, c); x.restore(); });
    });
  };
  B.hospital = (b, shot) => {
    const morning = shot.variant === 'morning';
    b.tint = morning ? TINT.morning : TINT.hospital; b.depth = { back: 0.5, mid: 0.8, front: 1.2 };
    b.paint('back', (x) => {
      P.box(x, ...FULL, P.vg(x, -M, 420, morning ? ['#f4f1e8', '#e7e3d6'] : ['#46546c', '#3a465c']));
      P.box(x, -M, 420, W + 2 * M, 190, P.vg(x, 420, 610, morning ? ['#a8cdb8', '#8fbba4'] : ['#2f4a4a', '#253b3c'])); P.box(x, -M, 416, W + 2 * M, 6, morning ? '#7fa892' : '#22383a');
      P.tex(x, 'blot', 0.3, 'soft-light', FULL);
      x.fillStyle = P.vg(x, 70, 430, morning ? P.SKY.morning : P.SKY.night); x.fillRect(90, 70, 470, 360);
      x.save(); x.beginPath(); x.rect(90, 70, 470, 360); x.clip();
      if (morning) { x.drawImage(P.cumulus(9, 360, 220, 'morning', { peak: 0.7 }), 160, 120); P.crown(x, 200, 470, 220, 130, 'morning', 4); P.crown(x, 470, 500, 200, 120, 'morning', 5); }
      else { P.stars(x, 6, 60, 400); P.moon(x, 470, 150, 24); P.cityFar(x, 430, 31, { color: '#121a36', minH: 40, varH: 170, win: 0.4, winSize: 3 }); }
      x.restore();
      x.strokeStyle = '#eef0ec'; x.lineWidth = 14; x.strokeRect(90, 70, 470, 360); x.lineWidth = 8; x.beginPath(); x.moveTo(325, 70); x.lineTo(325, 430); x.stroke();
      P.box(x, 70, 430, 510, 14, '#e2e4de');
      x.save(); x.translate(860, 200); x.rotate(0.04); P.box(x, -60, -45, 120, 90, '#fbf8ef'); P.circle(x, 30, -18, 14, '#f2b81c'); x.fillStyle = '#e3402d'; x.fillRect(-48, -6, 40, 30); P.poly(x, [[-54, -6], [-28, -30], [-2, -6]]); x.fill(); x.strokeStyle = '#4caf50'; x.lineWidth = 3; x.beginPath(); x.moveTo(-56, 34); x.lineTo(56, 30); x.stroke(); text(x, '外婆', 22, 18, 14, '#3f6ec4'); x.restore();
      P.box(x, 840, 150, 10, 4, 'rgba(255,255,255,0.6)'); P.box(x, 870, 150, 10, 4, 'rgba(255,255,255,0.6)');
      P.box(x, -M, 610, W + 2 * M, H, P.vg(x, 610, H, morning ? ['#d6d9d2', '#bcc0b8'] : ['#2a3240', '#1d232e'])); P.tex(x, 'hs', 0.3, 'soft-light', [-M, 610, W + 2 * M, H]);
      x.strokeStyle = '#b8c2c8'; x.lineWidth = 6; x.beginPath(); x.moveTo(1060, 640); x.lineTo(1060, 140); x.moveTo(1030, 140); x.lineTo(1090, 140); x.stroke();
      P.rbox(x, 1038, 150, 44, 70, 10, 'rgba(220,240,250,0.85)');
      P.rbox(x, 1120, 420, 130, 200, 6, morning ? '#e9e6dc' : '#4a5468'); P.rbox(x, 1140, 380, 30, 46, 6, '#3d8a6a'); P.circle(x, 1210, 404, 16, '#e3802a'); P.circle(x, 1190, 410, 14, '#d8362a');
      P.rbox(x, 600, 470, 50, 60, 8, '#d7cfc0'); x.strokeStyle = '#4b8a3a'; x.lineWidth = 3; x.beginPath(); x.moveTo(625, 470); x.lineTo(628, 404); x.stroke(); P.circle(x, 628, 396, 14, 'rgba(255,255,255,0.9)');
      if (morning) { P.rays(x, 100, 60, 0.5, 1300, 7, 0.45, '#fff3d0', 0.35, 3); }
      else { P.glow(x, 1180, 360, 260, '#ffc070', 0.5); P.rbox(x, 1160, 340, 40, 30, 10, '#ffe6b0'); }
    });
    b.anim.back = (x, t) => { const d = (t * 0.9) % 1; P.circle(x, 1060, 228 + d * 60, 3, `rgba(200,230,255,${1 - d})`); if (morning) { const sw = Math.sin(t * 0.9) * 10; x.fillStyle = 'rgba(255,255,255,0.75)'; P.poly(x, [[560, 60], [610, 60], [600 + sw, 440], [552 + sw * 0.6, 440]]); x.fill(); } };
  };
  B.cab = (b) => {
    b.tint = ['#ff9a4a', 0.12]; b.depth = { back: 0.3, mid: 0.85, front: 1.2 };
    b.paint('back', (x) => {
      const tmp = P.layer(), tx = tmp.x; P.sky(tx, 'night', 520); P.cityFar(tx, 520, 77, { color: '#141a30', minH: 80, varH: 240, win: 0.3 });
      oldBuilding(tx, 380, 600, 0.8, 'night', { empty: true });
      for (let i = 0; i < 14; i++) P.glow(tx, P.hash(i) * W, 300 + P.hash(i + 4) * 300, 40 + P.hash(i + 2) * 40, i % 3 ? '#ffd38a' : '#ff8a5a', 0.6);
      x.filter = 'blur(4px)'; x.drawImage(tmp.c, -M, -M); x.filter = 'none';
    });
    b.anim.back = (x, t) => { for (let i = 0; i < 60; i++) { const yy = (P.hash(i) * H + t * 140 * (0.5 + P.hash(i + 1))) % H, xx = P.hash(i + 7) * W; x.strokeStyle = 'rgba(200,215,235,0.35)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx - 3, yy + 16); x.stroke(); } for (let i = 0; i < 40; i++) { const xx = P.hash(i + 90) * W, yy = P.hash(i + 30) * H * 0.75; P.circle(x, xx, yy, 3 + P.hash(i) * 4, 'rgba(210,225,245,0.35)'); P.circle(x, xx - 1, yy - 1, 1.2, 'rgba(255,255,255,0.6)'); } };
    b.paint('mid', (x) => {
      x.fillStyle = '#1e1c1c'; x.fillRect(-M, -M, W + 2 * M, 50 + M); x.fillRect(-M, -M, 70 + M, H + 2 * M); x.fillRect(W - 70, -M, 70 + M, H + 2 * M);
      x.fillStyle = P.vg(x, 540, H, ['#3a3530', '#1c1a18']); x.fillRect(-M, 540, W + 2 * M, H);
      P.rbox(x, 140, 560, 230, 70, 10, '#2a2826'); for (let i = 0; i < 3; i++) { P.circle(x, 190 + i * 64, 594, 22, '#141414'); P.circle(x, 190 + i * 64, 594, 18, i === 1 ? '#3a5a3a' : '#2a3a4a'); x.strokeStyle = '#ffd38a'; x.lineWidth = 2; x.beginPath(); x.moveTo(190 + i * 64, 594); x.lineTo(190 + i * 64 + 12, 584); x.stroke(); }
      for (const lx of [900, 980]) { x.strokeStyle = '#151515'; x.lineWidth = 10; x.beginPath(); x.moveTo(lx, H + 20); x.lineTo(lx + 20, 560); x.stroke(); P.circle(x, lx + 20, 556, 16, '#c8382c'); }
      P.glow(x, 640, 560, 520, '#ffb070', 0.45);
    });
  };
  B.stairwell = (b, shot) => {
    b.tint = ['#9fc8b4', 0.12]; b.depth = { back: 0.5, mid: 0.8, front: 1.2 };
    b.paint('back', (x) => {
      P.box(x, ...FULL, P.vg(x, -M, H, ['#d9ddd2', '#c3c9bd']));
      x.fillStyle = '#6f9a84'; P.poly(x, [[-M, 470], [W + M, 300], [W + M, H + M], [-M, H + M]]); x.fill();
      P.box(x, -M, 0, W + 2 * M, 0, '#000');
      P.window(x, 860, 40, 200, 180, { mode: 'dark', seed: 2, frame: '#e9ece6' }); x.save(); x.beginPath(); x.rect(860, 40, 200, 180); x.clip(); x.fillStyle = P.vg(x, 40, 220, ['#1a2550', '#4a4f7a']); x.fillRect(860, 40, 200, 180); P.stars(x, 3, 20, 200); x.restore(); x.strokeStyle = '#e9ece6'; x.lineWidth = 10; x.strokeRect(860, 40, 200, 180);
      for (let i = 0; i < 13; i++) { const sx = -M + i * 112, sy = 700 - i * 30; P.box(x, sx, sy, 140, H + M, P.vg(x, sy, sy + 30, ['#c6c9c2', '#9ea29b'])); P.box(x, sx, sy, 140, 5, '#e2e4de'); P.box(x, sx, sy + 5, 140, 3, 'rgba(0,0,0,0.2)'); }
      x.strokeStyle = '#3f4a46'; x.lineWidth = 7; x.beginPath(); x.moveTo(-M, 560); x.lineTo(W + M, 160); x.stroke();
      x.lineWidth = 3; for (let px = 0; px < W + M; px += 80) { const py = 560 - ((px + M) * 400) / (W + 2 * M); x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + 92); x.stroke(); }
      P.rbox(x, 140, 60, 200, 64, 6, '#1f7a3e'); text(x, '安全出口', 240, 92, 30, '#d8ffe4'); P.glow(x, 240, 92, 200, '#6aff9a', 0.35);
      P.rbox(x, 560, 20, 260, 18, 4, '#f4f6f2'); P.glow(x, 690, 30, 360, '#e8fff4', 0.45);
      P.tex(x, 'blot', 0.35, 'soft-light', FULL);
    });
  };

  // ------------------------------------------------- construction site
  B.construction = (b, shot) => {
    const night = shot.variant === 'night', sd = 808;
    b.tint = night ? TINT.night : TINT.dusty;
    b.sky = (x, t) => { P.sky(x, night ? 'night' : ['#9fb0c0', '#c3c8c4', '#dcd2be', '#e8dcc4'], 600); if (night) { P.stars(x, 9, 120, 320, t); P.moon(x, 180, 96, 30); } };
    if (!night) { b.cloud(sd + 1, 700, 360, 'grey', 600, -30, { peak: 0.6, vx: 4 }); b.cloud(sd + 2, 380, 200, 'grey', -40, 90, { peak: 0.5 }); }
    b.paint('back', (x) => {
      P.cityFar(x, 560, sd, { color: night ? '#1a2240' : '#a8aeb0', minH: 80, varH: 200, win: night ? 0.3 : 0, haze: night ? '#28335a' : '#d9d0bc', hazeA: 0.6 });
      for (const [cx2, h] of [[900, 360], [1180, 300]]) { x.strokeStyle = night ? '#2a2f48' : '#8a8a86'; x.lineWidth = 6; x.beginPath(); x.moveTo(cx2, 560); x.lineTo(cx2, 560 - h); x.moveTo(cx2 - 160, 560 - h + 10); x.lineTo(cx2 + 90, 560 - h + 10); x.stroke(); x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx2 + 60, 560 - h + 10); x.lineTo(cx2 + 60, 560 - h + 90); x.stroke(); if (night) P.circle(x, cx2, 560 - h - 4, 4, '#ff4a3a'); }
    });
    b.paint('mid', (x) => {
      const mood = night ? 'night' : 'dusty', cut = [[-M, -M], [610, -M], [600, 120], [640, 190], [610, 260], [660, 330], [630, 420], [690, 610], [-M, 610]];
      x.save(); P.poly(x, cut); x.clip(); oldBuilding(x, 420, 610, 0.95, mood, { chai: true, empty: true }); x.restore();
      const r = P.rng(sd);
      for (let f = 0; f < 5; f++) { const fy = 610 - 4 * 87 - 32 + f * 87, ex = 600 + (f % 2) * 30; P.box(x, ex, fy + 20, 70 + r() * 40, 10, night ? '#4a4a52' : '#b8b0a2'); P.box(x, ex + 6, fy + 30, 60, 50, ['#e8b8c0', '#b8d8b0', '#e8d8a0', '#a8c8e8', '#e0c0a0'][f]); x.strokeStyle = 'rgba(120,90,70,0.4)'; x.lineWidth = 1; for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(ex + 10 + k * 9, fy + 30); x.lineTo(ex + 10 + k * 9, fy + 80); x.stroke(); } x.strokeStyle = night ? '#6a6a72' : '#5a5048'; x.lineWidth = 1.5; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(ex + 60 + r() * 30, fy + 22); x.lineTo(ex + 80 + r() * 50, fy + 10 + r() * 20); x.stroke(); } }
      for (let i = 0; i < 40; i++) { const rx = 560 + r() * 520, ry = 610 - Math.pow(r(), 2) * 150 * (1 - Math.abs(rx - 760) / 520); P.ell(x, rx, ry, 18 + r() * 34, 10 + r() * 16, P.vary(night ? '#3a3236' : '#9a7a66', r, 0.15), r()); }
      ground(x, 600, night ? ['#2a2a32', '#18181e'] : ['#a99a84', '#7d6e5c'], { cracks: 3 });
      x.strokeStyle = 'rgba(40,30,20,0.25)'; x.lineWidth = 10; for (const ty of [650, 690]) { x.beginPath(); x.moveTo(-M, ty); x.quadraticCurveTo(640, ty - 20, W + M, ty + 10); x.stroke(); }
      for (let i = 0; i < 11; i++) { const fx = -60 + i * 132; P.box(x, fx, 512, 128, 92, night ? '#1f3d6b' : '#3a6fb0'); P.box(x, fx, 520, 128, 6, 'rgba(255,255,255,0.18)'); P.box(x, fx, 590, 128, 6, 'rgba(255,255,255,0.18)'); x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 2; x.beginPath(); x.moveTo(fx, 512); x.lineTo(fx, 604); x.stroke(); }
      if (!night) { P.rbox(x, 1040, 470, 80, 140, 4, '#8a6a4a'); P.box(x, 1078, 476, 3, 130, '#5a4030'); P.rbox(x, 1130, 560, 60, 50, 4, '#c8b8a0'); P.rbox(x, 960, 560, 70, 46, 18, '#e8d8b8'); P.box(x, 1150, 520, 6, 40, '#6a4a3a'); P.box(x, 1180, 520, 6, 40, '#6a4a3a'); P.box(x, 1146, 518, 44, 6, '#6a4a3a'); }
      else { x.strokeStyle = '#1a1d2a'; x.lineWidth = 6; x.beginPath(); x.moveTo(1130, 610); x.lineTo(1130, 200); x.stroke(); P.rbox(x, 1100, 186, 60, 30, 4, '#2a2d3a'); x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = P.vg(x, 200, 700, ['rgba(255,240,200,0.35)', 'rgba(255,240,200,0)']); P.poly(x, [[1105, 210], [1155, 210], [1300, 720], [700, 720]]); x.fill(); x.restore(); P.glow(x, 1130, 200, 120, '#fff0c8', 0.9); }
    });
  };

  // ------------------------------------------------- flying over the city
  function cityAbove(x, hy, mood, seed) {
    const r = P.rng(seed), dawn = mood === 'dawn', vx = W * 0.56, D = H + M - hy;
    P.ridge(x, hy + 4, 26, 260, dawn ? ['#8f7fa8', '#b39ab8'] : ['#7a5a7a', '#a87a8a'], 12, { depth: 30, texA: 0.15 });
    x.fillStyle = P.vg(x, hy, H + M, dawn ? ['#b49ab4', '#5d5a7e', '#2e3150'] : ['#a97890', '#40355a', '#1b1830']); x.fillRect(-M, hy, W + 2 * M, H + M);
    const Y = (z) => hy + D * Math.pow(z, 1.8), X = (u, z) => vx + (u - 0.5) * W * 3.2 * Math.pow(z, 1.8) / Math.max(0.02, Math.pow(z, 0.9));
    // river, winding toward the horizon, mirroring the sky
    x.fillStyle = dawn ? 'rgba(248,206,196,0.7)' : 'rgba(255,170,130,0.62)'; x.beginPath();
    for (let i = 0; i <= 40; i++) { const z = i / 40, u = 0.32 + Math.sin(z * 5) * 0.08; const [px, py] = [X(u, z), Y(z)]; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    for (let i = 40; i >= 0; i--) { const z = i / 40, u = 0.32 + Math.sin(z * 5) * 0.08 + 0.02 + z * 0.01; x.lineTo(X(u, z), Y(z)); }
    x.closePath(); x.fill();
    // blocks: rooftops with lit windows, finer toward the horizon
    for (let k = 0; k < 900; k++) {
      const z = Math.pow(r(), 0.7), u = r(), px = X(u, z), py = Y(z), s = 2 + z * 26;
      if (px < -M || px > W + M || Math.abs(u - (0.33 + Math.sin(z * 5) * 0.08)) < 0.025) continue;
      const c = P.vary(dawn ? '#6a6688' : '#4a3f62', r, 0.2);
      P.box(x, px - s, py - s * 0.6, s * 1.6, s * 0.7, P.css(c)); P.box(x, px - s, py - s * 0.6, s * 1.6, Math.max(1, s * 0.1), P.css(P.mix(c, dawn ? '#ffd8c8' : '#ffb488', 0.4)));
      for (let i = 0; i < 1 + z * 4; i++) if (r() < 0.75) P.box(x, px - s + r() * s * 1.5, py - s * 0.45 + r() * s * 0.4, 1 + z * 1.6, 1 + z * 1.6, r() < 0.85 ? '#ffd27a' : '#fff4e0');
    }
    // avenues of street lights converging on the vanishing point
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const u = 0.08 + i * 0.11; x.strokeStyle = `rgba(255,180,100,${0.25 + (i % 2) * 0.15})`; x.lineWidth = 1.5; x.beginPath(); for (let z = 0.02; z <= 1.0; z += 0.02) { const px = X(u, z), py = Y(z); z <= 0.021 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke(); }
    for (let j = 1; j < 12; j++) { const z = j / 12, py = Y(z); x.strokeStyle = `rgba(255,190,110,${0.12 + z * 0.3})`; x.lineWidth = 1 + z * 2; x.beginPath(); x.moveTo(-M, py); x.lineTo(W + M, py); x.stroke(); }
    x.restore();
    x.fillStyle = P.vg(x, hy - 20, hy + 120, [dawn ? 'rgba(255,224,206,0.85)' : 'rgba(255,186,140,0.8)', 'rgba(0,0,0,0)']); x.fillRect(-M, hy - 20, W + 2 * M, 140);
  }
  B['sky-ride'] = (b, shot) => {
    const dawn = shot.variant === 'dawn', mood = dawn ? 'dawn' : 'sunset', sd = 909;
    b.tint = TINT[mood]; b.depth = { back: 0.25, mid: 0.6, front: 1.3 };
    b.sky = (x) => { P.sky(x, mood, 470); P.glow(x, 1060, 470, 560, dawn ? '#ffe6c8' : '#ffd090', 0.8, 'screen'); P.circle(x, 1060, 470, 34, dawn ? '#fff6e0' : '#fff0c0'); };
    b.cloud(sd + 1, 900, 480, mood, 600, -120, { d: 0.12, vx: -10 });
    b.cloud(sd + 2, 500, 280, mood, -60, 120, { peak: 0.6, d: 0.2, vx: -22 });
    b.cloud(sd + 3, 360, 180, mood, 1100, 260, { peak: 0.5, d: 0.3, vx: -36 });
    b.paint('back', (x) => cityAbove(x, 470, mood, sd));
    b.anim.front = (x, t) => { for (let i = 0; i < 3; i++) { const xx = W + 300 - ((t * 260 + i * 700) % (W + 900)), yy = 560 + i * 60; x.globalAlpha = 0.7; x.drawImage(cloudPuff(mood, i), xx, yy, 520, 220); x.globalAlpha = 1; } };
  };
  const puffCache = {};
  function cloudPuff(mood, i) { const key = mood + i; return puffCache[key] || (puffCache[key] = P.cumulus(990 + i, 520, 220, mood, { peak: 0.4, side: 0.5, alpha: 0.85 })); }

  // ------------------------------------------------- next spring
  B.spring = (b) => {
    const sd = 1010; b.tint = ['#fff4dc', 0.05];
    b.sky = (x) => P.sky(x, 'day', 560);
    b.cloud(sd + 1, 760, 460, 'day', 520, -70, { vx: 4 }); b.cloud(sd + 2, 380, 220, 'day', -40, 110, { peak: 0.6 });
    b.paint('back', (x) => { P.ridge(x, 520, 70, 320, ['#88a8c6', '#b4cde0'], 3); P.cityFar(x, 560, sd, { color: '#c4cfd8', minH: 40, varH: 120, haze: '#e1ecf2', hazeA: 0.5 }); });
    b.paint('mid', (x) => {
      const bx = 640, by = 600, bw = 560;
      P.box(x, bx - bw / 2, by - 440, bw, 440, P.lg(x, bx - bw / 2, 0, bx + bw / 2, 0, ['#fbf6ea', '#f1e8d6', '#ddd2bc'])); P.tex(x, 'vs', 0.3, 'soft-light', [bx - bw / 2, by - 440, bw, 440]);
      for (let f = 0; f < 6; f++) for (let c = 0; c < 5; c++) { const wx = bx - bw / 2 + 26 + c * 104, wy = by - 420 + f * 68; P.window(x, wx, wy, 76, 40, { seed: f * 5 + c, frame: '#ffffff', curtain: (f + c) % 3 === 0 ? '#f2c2b4' : null }); P.box(x, wx - 8, wy + 44, 92, 9, '#f2c94c'); x.strokeStyle = '#d9a12a'; x.lineWidth = 2; x.strokeRect(wx - 8, wy + 44, 92, 9); if ((f * 5 + c) % 4 === 1) P.pot(x, wx + 20, wy + 44, 20, 12, '#b4552f', 'spring', f * 9 + c, { leaves: 4, fh: 18, fruit: 2 }); }
      P.box(x, bx - bw / 2 - 10, by - 450, bw + 20, 14, '#c8b89c');
      P.grass(x, -M, W + M, 580, H + M, 'spring', sd, { sparse: 30 });
      P.flowers(x, -M, W + M, 600, H, 120, ['#ffffff', '#f6d24a', '#f2a9b6', '#c9b6f0'], sd, 4);
      x.fillStyle = P.vg(x, 600, H, ['#e8dcc4', '#cdbd9e']); P.poly(x, [[560, 600], [720, 600], [900, H + M], [380, H + M]]); x.fill();
      for (const [tx, s] of [[150, 1], [1130, 0.95]]) { P.trunk(x, tx, 640, 300 * s, 16, '#6b4a34', tx); const r = P.rng(tx); for (let i = 0; i < 70; i++) { const a = r() * TAU, d = Math.sqrt(r()); P.leafBlob(x, tx + Math.cos(a) * 190 * s * d, 340 + Math.sin(a) * 120 * s * d, 18 + r() * 14, ['#f7c6d4', '#fbe2ea', '#f2aac0', '#ffffff'][(r() * 4) | 0], r); } }
      for (let i = 0; i < 4; i++) { const bx2 = 300 + i * 60; P.box(x, bx2, 640, 50, 20, '#8a6a4a'); for (let k = 0; k < 4; k++) P.leafBlob(x, bx2 + 8 + k * 11, 632, 7, '#5aa046', P.rng(i * 9 + k)); }
    });
  };
  B['crack-flower'] = (b) => {
    const sd = 1111; b.tint = ['#fff2d6', 0.05]; b.depth = { back: 0.6, mid: 0.85, front: 1.2 };
    b.paint('back', (x) => {
      P.box(x, ...FULL, P.vg(x, -M, H, ['#cfc9bf', '#b4ada2']));
      const r = P.rng(sd); for (let yy = -M; yy < H + M; yy += 170) for (let xx = -M + ((yy / 170) % 2) * 120; xx < W + M; xx += 240) { P.box(x, xx + 3, yy + 3, 234, 164, P.css(P.vary('#c9c3b8', r, 0.04))); }
      P.tex(x, 'blot', 0.6, 'soft-light', FULL, 1.5);
      for (let i = 0; i < 500; i++) P.circle(x, r() * W, r() * H, 0.6 + r() * 1.6, `rgba(${r() < 0.5 ? '90,84,76' : '240,236,228'},0.35)`);
      x.strokeStyle = '#4c463e'; x.lineWidth = 4; x.beginPath(); x.moveTo(560, H + M); x.lineTo(640, 560); x.lineTo(612, 470); x.lineTo(700, 330); x.lineTo(684, 220); x.lineTo(720, -M); x.stroke();
      for (let i = 0; i < 12; i++) P.leafBlob(x, 600 + P.hash(i) * 80, 520 + P.hash(i + 3) * 60, 6 + P.hash(i + 5) * 6, ['#4c8a3a', '#6aa846'][i % 2], P.rng(i));
      x.save(); P.blob(x, 1000, 570, 230, 72, 2, 0.12); x.clip(); x.fillStyle = P.vg(x, 498, 642, ['#cfe6f3', '#7fb2e2', '#3f7fd0']); x.fillRect(760, 490, 480, 160); x.save(); x.translate(0, 1140); x.scale(1, -1); x.globalAlpha = 0.8; x.drawImage(P.cumulus(sd + 3, 260, 150, 'day', { whale: true }), 900, 500); x.restore(); x.restore();
      P.blob(x, 1000, 570, 230, 72, 2, 0.12); x.strokeStyle = 'rgba(60,56,50,0.4)'; x.lineWidth = 3; x.stroke();
      P.rays(x, -100, -120, 0.75, 1400, 6, 0.5, '#fff4d8', 0.3, 5);
    });
    b.anim.mid = (x, t) => {
      const sw = Math.sin(t * 1.4) * 6;
      x.strokeStyle = '#4b8a3a'; x.lineWidth = 6; x.beginPath(); x.moveTo(650, 540); x.quadraticCurveTo(660, 450, 668 + sw, 380); x.stroke();
      for (const d of [-1, 1]) P.ell(x, 650 + d * 42, 532, 54, 13, '#5aa846', d * 0.45);
      for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; P.ell(x, 668 + sw + Math.cos(a) * 32, 380 + Math.sin(a) * 32, 23, 8, i % 2 ? '#f6c21c' : '#f8d23a', a); }
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + 0.2; P.ell(x, 668 + sw + Math.cos(a) * 18, 380 + Math.sin(a) * 18, 12, 5, '#f2b81c', a); }
      P.circle(x, 668 + sw, 380, 13, '#e8a812');
      K.xuxu(x, t, 735 + sw, 350, 15);
      x.save(); P.blob(x, 1000, 570, 230, 72, 2, 0.12); x.clip(); ripples(x, t, 800, 520, 400, 110, 3, 5, '255,255,255', 0.4); x.restore();
    };
  };

  window.S = { build: (shot) => { const b = new Scene(shot); (B[shot.bg] || B.title)(b, shot); if (shot.bg !== 'title') for (const L of Object.values(b.layers)) P.handmade(L.c); return b; }, TINT };
})();
