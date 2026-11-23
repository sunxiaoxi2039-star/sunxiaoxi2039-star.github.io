/* 小芽与风的种子 · kv.js — the key visual.
 * A single 1920×1080 painting pushed as far as code-painting goes here:
 * light-marched cumulonimbus, a meadow grown stroke by stroke in perspective,
 * a camphor tree with dappled shade, a valley town in summer haze.
 * Drawn in the 1280×720 logical space of paint.js, at 1.5× device pixels.
 */
(function () {
  'use strict';
  const { W, H, M, TAU, clamp, lerp, smooth } = P;
  const S = 1.5, DW = W * S, DH = H * S;
  const sm = (a, b, x) => smooth(a, b, x);

  // ---------- volumetric-looking cumulus: density field + 2D light march ----------
  function paintCloud(w, h, blobs, o = {}) {
    const D = new Float32Array(w * h), N = new Float32Array(w * h), f0 = o.freq || 1 / 110, amp = o.amp ?? 0.55, baseY = o.baseY ?? h, sd = o.seed || 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let b = -9, sum = 0;
      for (const [cx, cy, rx, ry] of blobs) { const q = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry); if (q > b) b = q; if (q > 0) sum += q; }
      if (b < -0.75) { D[y * w + x] = -1; continue; }
      // domain-warped billow noise: rounded bumps with sharp creases (cauliflower)
      const wx = x + (P.noise(x * f0 * 0.5 + sd, y * f0 * 0.5) - 0.5) * 60, wy = y + (P.noise(x * f0 * 0.5 + 40, y * f0 * 0.5 + sd) - 0.5) * 60;
      let n = 0, a = 0.5, f = f0;
      for (let k = 0; k < 5; k++) { n += a * Math.abs(2 * P.noise(wx * f + k * 31.7 + sd, wy * f + k * 17.3) - 1); a *= 0.5; f *= 2.15; }
      let d = b + sum * 0.12 + (n - 0.3) * amp;
      if (y > baseY) d -= ((y - baseY) / (o.baseSoft || 26)) * (0.6 + 0.8 * P.noise(x * 0.01, 3.3 + sd));
      D[y * w + x] = d; N[y * w + x] = n;
    }
    const cv = P.canvas(w, h), c = cv.getContext('2d'), im = c.createImageData(w, h), px = im.data;
    const cols = (o.cols || ['#7388bd', '#9aaed8', '#c6d3ec', '#edf2f9', '#fffdf6']).map(P.rgb), nc = cols.length - 1;
    const lx = -0.5, ly = -0.866, step = o.step || 9, k = o.k ?? 0.3, g = o.grad || 4, nz = o.nz ?? 0.11;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, d = D[i]; if (d <= 0) continue;
      // lobe shading from the density gradient (each billow gets a lit side and a blue underside)
      const x0 = Math.max(0, x - g), x1 = Math.min(w - 1, x + g), y0 = Math.max(0, y - g), y1 = Math.min(h - 1, y + g);
      const gx = D[y * w + x1] - D[y * w + x0], gy = D[y1 * w + x] - D[y0 * w + x], nl = Math.hypot(gx, gy, nz);
      const ndl = (gx * 0.46 + gy * 0.8 + nz * 0.38) / nl;        // = normal · light, normal = (-gx,-gy,nz), light up-left
      // large-scale self shadow: march toward the sun through the density
      let s = 0;
      for (let j = 1; j <= 7; j++) { const sx = Math.round(x + lx * step * j * (1 + j * 0.15)), sy = Math.round(y + ly * step * j * (1 + j * 0.15)); if (sx < 0 || sy < 0 || sx >= w) break; const dd = D[sy * w + sx]; if (dd > 0) s += Math.min(dd, 0.8); }
      const T = Math.exp(-s * k);
      let v = (0.5 + 0.5 * ndl) * (0.3 + 0.7 * T) + 0.13 + (N[i] - 0.3) * 0.12 - sm(baseY - h * 0.3, baseY, y) * 0.2;
      v = lerp(v, Math.round(v * 5) / 5, 0.4);       // a little poster-colour flatness
      v = clamp(v, 0, 1) * nc; const ci = Math.min(nc - 1, v | 0), fr = v - ci, A = cols[ci], B = cols[ci + 1];
      const al = sm(0, o.edge || 0.07, d), q = i * 4;
      px[q] = A[0] + (B[0] - A[0]) * fr; px[q + 1] = A[1] + (B[1] - A[1]) * fr; px[q + 2] = A[2] + (B[2] - A[2]) * fr; px[q + 3] = 255 * al * (o.alpha ?? 1);
    }
    c.putImageData(im, 0, 0);
    const out = P.canvas(w, h), oc = out.getContext('2d'); oc.filter = 'blur(0.8px)'; oc.drawImage(cv, 0, 0); return out;
  }

  const hillY = (x) => 462 + 0.00016 * (x - 820) * (x - 820) + (P.noise(x / 180, 5.5) - 0.5) * 14;
  const GR = ['#17503a', '#256f3e', '#3f9443', '#74bd4d', '#b4dc62', '#e6f08e'].map(P.rgb);
  const TREE = ['#12382f', '#1f5a3c', '#35803f', '#6bb048', '#c2df74'];
  const TREE_BACK = ['#173f3c', '#215848', '#2f7450', '#4f9458', '#86b874'];

  function house(x, cx, by, w, h, roof, r) {
    const wall = P.vary('#f1ead9', r, 0.04);
    P.box(x, cx - w / 2, by - h, w, h, P.css(wall)); P.box(x, cx + w * 0.18, by - h, w * 0.32, h, 'rgba(70,80,130,0.22)');
    x.fillStyle = P.css(roof); P.poly(x, [[cx - w / 2 - 2, by - h], [cx - w * 0.28, by - h - w * 0.34], [cx + w * 0.28, by - h - w * 0.34], [cx + w / 2 + 2, by - h]]); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.22)'; P.poly(x, [[cx - w / 2 - 2, by - h], [cx - w * 0.28, by - h - w * 0.34], [cx - w * 0.05, by - h - w * 0.34], [cx - w * 0.2, by - h]]); x.fill();
    x.fillStyle = 'rgba(50,70,110,0.75)'; for (let i = 0; i < 2; i++) x.fillRect(cx - w * 0.32 + i * w * 0.34, by - h * 0.7, w * 0.16, h * 0.3);
  }
  function seedHead(x, cx, cy, r, a = 1) {
    x.fillStyle = `rgba(255,255,255,${0.35 * a})`; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    x.strokeStyle = `rgba(255,255,255,${0.9 * a})`; x.lineWidth = Math.max(0.4, r * 0.05); x.beginPath();
    for (let k = 0; k < 26; k++) { const an = (k / 26) * TAU; x.moveTo(cx, cy); x.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); }
    x.stroke(); P.circle(x, cx, cy, r * 0.16, `rgba(170,150,110,${a})`);
  }
  function flySeed(x, cx, cy, r, rot, a) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.strokeStyle = `rgba(255,255,255,${a})`; x.lineWidth = Math.max(0.5, r * 0.08); x.beginPath();
    for (let k = 0; k < 9; k++) { const an = -Math.PI * (0.1 + (0.8 * k) / 8); x.moveTo(0, 0); x.lineTo(Math.cos(an) * r, Math.sin(an) * r * 0.85); }
    x.moveTo(0, 0); x.lineTo(0, r * 1.5); x.stroke(); P.circle(x, 0, r * 1.55, Math.max(0.7, r * 0.13), `rgba(150,120,80,${a})`); x.restore();
  }

  function render(t = 1.2) {
    const cv = P.canvas(DW, DH), x = cv.getContext('2d'); x.scale(S, S);
    const r = P.rng(20261114);

    // ---- sky ----
    P.sky(x, ['#1c58b8', '#2f76d0', '#62a6e2', '#a9d6ee', '#e3f1f0'], 440);
    x.fillStyle = P.rg(x, 60, -40, 0, 700, [[0, 'rgba(255,250,225,0.5)'], [1, 'rgba(255,250,225,0)']]); x.fillRect(0, 0, W, H);

    // ---- clouds (device resolution) ----
    const far = paintCloud(DW, 260, [[220, 190, 150, 46], [470, 200, 110, 34], [820, 196, 170, 44], [1530, 200, 190, 46], [1800, 206, 120, 34], [1130, 210, 90, 26]], { baseY: 214, baseSoft: 12, freq: 1 / 55, amp: 0.5, step: 5, seed: 3, cols: ['#93a9d6', '#b3c6e6', '#d6e2f2', '#f3f6fa', '#ffffff'], alpha: 0.9 });
    x.drawImage(far, 0, 250, W, 260 / S);
    const big = paintCloud(DW, 700, [
      [1260, 560, 540, 150], [1040, 480, 270, 170], [1430, 490, 300, 180], [850, 560, 190, 95], [1690, 575, 210, 95],
      [1230, 370, 300, 200], [1170, 240, 235, 170], [1320, 200, 190, 140], [1215, 118, 150, 96], [1420, 330, 170, 130], [1010, 350, 150, 110],
    ], { baseY: 628, baseSoft: 30, freq: 1 / 120, amp: 0.6, step: 10, seed: 11 });
    x.drawImage(big, 0, 0, W, 700 / S);
    const small = paintCloud(700, 300, [[330, 190, 230, 70], [240, 140, 120, 70], [420, 130, 130, 76]], { baseY: 214, baseSoft: 16, freq: 1 / 70, amp: 0.55, step: 6, seed: 21 });
    x.drawImage(small, 930, 20, 700 / S, 300 / S);

    // ---- far mountains, mid hills, valley ----
    P.ridge(x, 432, 90, 300, ['#6f98cf', '#9fc0e2'], 3.3, { depth: 60, texA: 0.25 });
    P.ridge(x, 446, 62, 190, ['#5f93b4', '#8fbcc4'], 7.1, { depth: 50, texA: 0.25 });
    P.ridge(x, 452, 34, 120, ['#4f9279', '#86bf85'], 9.4, { depth: 40, texA: 0.3 });
    for (let i = 0; i < 520; i++) { const px = r() * W, py = 452 - 34 * P.fbm(px / 120 + 9.4 * 13.1, 9.4 * 3.7, 4) + r() * 26; P.circle(x, px, py, 1.5 + r() * 3.2, P.css(P.ramp(['#2f7460', '#4f9670', '#7ab980'], r()), 0.9)); }
    x.fillStyle = P.vg(x, 440, 500, ['#9ccf86', '#7fc06a']); x.fillRect(0, 446, W, 80);
    const fields = ['#a9d67a', '#cfe38a', '#8fc96c', '#e3e59a', '#7dbb62'];
    for (let i = 0; i < 26; i++) { const fx = r() * W, fy = 450 + r() * 34, fw = 40 + r() * 90, fh = 4 + (fy - 448) * 0.22; x.fillStyle = P.css(P.vary(fields[i % 5], r, 0.05), 0.85); P.poly(x, [[fx, fy], [fx + fw, fy - 2 + r() * 4], [fx + fw + 14, fy + fh], [fx + 10, fy + fh + 1]]); x.fill(); }
    x.strokeStyle = 'rgba(245,240,215,0.85)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(1290, 492); x.bezierCurveTo(1180, 470, 1090, 476, 1010, 462); x.bezierCurveTo(960, 454, 930, 452, 900, 450); x.stroke();
    x.fillStyle = 'rgba(190,225,245,0.9)'; x.beginPath(); x.moveTo(880, 455); x.bezierCurveTo(940, 458, 980, 449, 1060, 453); x.bezierCurveTo(1000, 456, 950, 462, 880, 459); x.fill();
    for (let row = 0; row < 4; row++) for (let i = 0; i < 60; i++) { const px = r() * 700, py = 452 + row * 9 + r() * 3; if (r() < 0.55) P.circle(x, px, py, 1.6 + row * 0.7 + r() * 1.6, P.css(P.ramp(['#3f8a62', '#5fa86a', '#8fc87c'], r()), 0.9)); }
    for (let i = 0; i < 7; i++) house(x, 470 + r() * 150, 458 + r() * 14, 9 + r() * 6, 6 + r() * 3, r() < 0.5 ? '#c8563a' : '#4f7396', r);
    // town: roofs among trees, the old brick building, a water tower, poles
    const town = []; for (let i = 0; i < 26; i++) town.push([905 + r() * 350, 454 + r() * 26, 13 + r() * 12]);
    town.sort((a, b) => a[1] - b[1]);
    town.forEach(([hx, hy, hw], i) => {
      if (i === 12) { P.bricks(x, 1088, hy - 46, 34, 46, '#b55a42', 5, { bw: 5, bh: 2.4, patches: 0, wash: 0.3 }); P.box(x, 1110, hy - 46, 12, 46, 'rgba(60,40,90,0.25)'); x.fillStyle = 'rgba(210,230,245,0.9)'; for (let a = 0; a < 5; a++) for (let b = 0; b < 3; b++) x.fillRect(1092 + b * 9, hy - 42 + a * 8.4, 4.5, 4); P.box(x, 1086, hy - 48, 38, 3, '#7d3d30'); }
      house(x, hx, hy, hw, hw * 0.62, r() < 0.55 ? P.vary('#c8563a', r, 0.08) : P.vary('#4f7396', r, 0.08), r);
      if (r() < 0.8) { const tx = hx + (r() - 0.5) * 30, ty = hy + 2; P.leafBlob(x, tx, ty - 7, 7 + r() * 5, P.ramp(['#2a6b48', '#3f8a4c'], r()), r); P.leafBlob(x, tx - 2, ty - 10, 4, '#7ab85a', r, 0.6); }
    });
    for (let i = 0; i < 7; i++) { const px = 1262 - i * 44, py = 488 - i * 4.4, ph = 34 - i * 2.6; x.strokeStyle = 'rgba(52,48,56,0.85)'; x.lineWidth = 1.6 - i * 0.12; x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - ph); x.moveTo(px - 5, py - ph + 3); x.lineTo(px + 5, py - ph + 3); x.stroke(); if (i < 6) { x.lineWidth = 0.6; x.beginPath(); x.moveTo(px, py - ph + 3); x.quadraticCurveTo(px - 22, py - ph + 9, px - 44, py - 4.4 - (ph - 2.6) + 3); x.stroke(); } }
    // summer haze over the valley
    x.fillStyle = P.vg(x, 380, 500, ['rgba(200,228,245,0)', 'rgba(205,232,240,0.42)', 'rgba(205,232,240,0)']); x.fillRect(0, 380, W, 120);

    // ---- the meadow hill ----
    x.beginPath(); x.moveTo(-10, H + 10); for (let px = -10; px <= W + 10; px += 6) x.lineTo(px, hillY(px)); x.lineTo(W + 10, H + 10); x.closePath();
    x.fillStyle = P.vg(x, 455, H, ['#a8d862', '#74bd4d', '#3f9443', '#256f3e']); x.fill();
    x.save(); x.clip();
    for (let i = 0; i < 40; i++) { const px = r() * W, py = 470 + Math.pow(r(), 1.3) * 250, k = (py - 440) / 280; P.soft(x, 14, (c) => { P.blob(c, px, py, (60 + r() * 160) * (0.4 + k), (10 + r() * 22) * (0.4 + k), r() * 50, 0.25, 30); c.fillStyle = r() < 0.55 ? 'rgba(214,236,120,0.33)' : 'rgba(20,80,70,0.22)'; c.fill(); }); }
    // cloud shadow drifting over the far slope, tree shade on the left
    P.soft(x, 22, (c) => { P.blob(c, 1120, 520, 240, 22, 4, 0.2, 30); c.fillStyle = 'rgba(20,70,90,0.22)'; c.fill(); });
    P.soft(x, 16, (c) => { P.blob(c, 300, 590, 330, 62, 8, 0.18, 40); c.fillStyle = 'rgba(8,48,52,0.5)'; c.fill(); });
    x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 46; i++) { const px = 40 + r() * 520, py = 545 + r() * 95; P.soft(x, 3, (c) => { P.ell(c, px, py, 5 + r() * 14, 2 + r() * 4, 'rgba(190,220,90,0.2)', -0.1); }); } x.globalCompositeOperation = 'source-over';
    x.restore();
    // footpath worn through the grass, from the lower right up to the crest
    P.soft(x, 2.5, (c) => { c.beginPath(); c.moveTo(1010, H + 10); c.bezierCurveTo(960, 640, 900, 560, 835, 500); c.bezierCurveTo(820, 486, 808, 476, 800, 468); c.lineTo(812, 468); c.bezierCurveTo(850, 492, 990, 560, 1150, H + 10); c.closePath(); c.fillStyle = 'rgba(226,214,160,0.7)'; c.fill(); });

    // grass blades, grown back to front; flowers mixed in
    const girlX = 770, girlY = hillY(770) + 6, blades = [];
    for (let i = 0; i < 21000; i++) { const px = -20 + r() * (W + 40), z = Math.pow(r(), 0.85), hy = hillY(px), py = hy + (H + 30 - hy) * Math.pow(z, 1.55); blades.push([py, px, z, r(), r(), r()]); }
    for (let i = 0; i < 900; i++) { const px = r() * W, z = Math.pow(r(), 0.8), hy = hillY(px), py = hy + 2 + (H + 20 - hy) * Math.pow(z, 1.55); blades.push([py, px, z, r(), r(), -1 - ((r() * 3) | 0)]); }
    blades.sort((a, b) => a[0] - b[0]);
    const onPath = (px, py) => { const t0 = (py - 468) / (H - 468); if (t0 < 0) return false; const cxp = 800 + 250 * Math.pow(t0, 1.3), wp = 6 + 70 * t0; return Math.abs(px - cxp) < wp * 0.5; };
    const drawBlades = (from, to) => {
      x.lineCap = 'round';
      for (let i = from; i < to; i++) {
        const [py, px, z, a, b, kind] = blades[i], k = 0.1 + Math.pow(z, 1.25) * 1.35;
        const wind = (P.noise(px / 150 + 2.2, py / 60) - 0.25) * 1.3, shade = px < 640 && py > 535 && py < 660 ? sm(640, 380, px) * 0.3 : 0;
        if (kind < 0) {
          if (onPath(px, py)) continue;
          const h = (9 + a * 16) * k, fx = px + wind * h * 0.35, fy = py - h;
          x.strokeStyle = 'rgba(70,130,60,0.9)'; x.lineWidth = Math.max(0.5, k * 1.1); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + wind * h * 0.1, py - h * 0.6, fx, fy); x.stroke();
          const s = Math.max(0.9, 3.4 * k);
          if (kind === -1) { for (let p = 0; p < 7; p++) { const an = (p / 7) * TAU; P.ell(x, fx + Math.cos(an) * s, fy + Math.sin(an) * s * 0.7, s * 0.8, s * 0.42, '#ffffff', an); } P.circle(x, fx, fy, s * 0.5, '#f4c531'); }
          else if (kind === -2) { for (let p = 0; p < 12; p++) { const an = (p / 12) * TAU; P.ell(x, fx + Math.cos(an) * s * 0.9, fy + Math.sin(an) * s * 0.65, s * 0.8, s * 0.3, p % 2 ? '#f5c21f' : '#fbd94a', an); } P.circle(x, fx, fy, s * 0.45, '#e8a515'); }
          else seedHead(x, fx, fy - s, s * 1.5, 1);
          continue;
        }
        if (onPath(px, py) && kind > 0.12) continue;
        const L = P.fbm(px / 240, py / 90, 3), tone = clamp(0.2 + L * 0.62 + (a - 0.5) * 0.34 + (1 - z) * 0.2 - shade, 0, 1);
        const len = (7 + b * 20) * k * (0.7 + L * 0.6), tipx = px + wind * len * 0.55 + (kind - 0.5) * len * 0.35;
        x.strokeStyle = P.css(P.ramp(GR, tone)); x.lineWidth = 0.5 + k * 1.5; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (tipx - px) * 0.25, py - len * 0.65, tipx, py - len); x.stroke();
        if (a > 0.72 && !shade) { x.strokeStyle = P.css(P.ramp(GR, Math.min(1, tone + 0.3)), 0.9); x.lineWidth = 0.4 + k * 0.8; x.beginPath(); x.moveTo(px + (tipx - px) * 0.5, py - len * 0.62); x.lineTo(tipx, py - len); x.stroke(); }
      }
    };
    let split = blades.findIndex((q) => q[0] > girlY + 1); if (split < 0) split = blades.length;
    let splitTree = blades.findIndex((q) => q[0] > 540); if (splitTree < 0) splitTree = 0;
    drawBlades(0, Math.min(split, splitTree));

    // ---- the camphor tree ----
    const tx = 236, ty = 548;
    P.crown(x, tx + 70, 215, 250, 150, TREE_BACK, 31, { n: 46 });
    x.save(); x.lineCap = 'round';
    const bark = '#4d3a30', barkL = '#7a6050';
    x.fillStyle = P.lg(x, tx - 46, 0, tx + 46, 0, [barkL, '#5a4538', '#2f2420']);
    x.beginPath(); x.moveTo(tx - 52, ty + 6); x.bezierCurveTo(tx - 34, ty - 60, tx - 30, ty - 150, tx - 40, ty - 250); x.lineTo(tx + 34, ty - 260); x.bezierCurveTo(tx + 24, ty - 150, tx + 30, ty - 60, tx + 58, ty + 8); x.bezierCurveTo(tx + 30, ty - 2, tx + 10, ty + 10, tx - 8, ty + 2); x.bezierCurveTo(tx - 24, ty + 8, tx - 40, ty, tx - 52, ty + 6); x.fill();
    for (const [bx, by, ex, ey, w0] of [[tx - 20, ty - 230, tx - 190, ty - 330, 26], [tx + 16, ty - 240, tx + 210, ty - 350, 24], [tx, ty - 250, tx + 40, ty - 420, 22], [tx + 20, ty - 190, tx + 250, ty - 240, 15], [tx - 24, ty - 200, tx - 230, ty - 230, 13]]) { x.strokeStyle = bark; x.lineWidth = w0; x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo((bx + ex) / 2, by - 30, ex, ey); x.stroke(); x.strokeStyle = barkL; x.lineWidth = w0 * 0.28; x.beginPath(); x.moveTo(bx - 2, by - w0 * 0.3); x.quadraticCurveTo((bx + ex) / 2 - 2, by - 30 - w0 * 0.3, ex, ey - w0 * 0.2); x.stroke(); }
    for (let i = 0; i < 70; i++) { const yy = ty - r() * 240, xx = tx + (r() - 0.5) * 70; x.strokeStyle = r() < 0.5 ? 'rgba(24,16,14,0.35)' : 'rgba(150,120,96,0.3)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(xx, yy); x.quadraticCurveTo(xx + (r() - 0.5) * 6, yy - 14, xx + (r() - 0.5) * 5, yy - 22 - r() * 26); x.stroke(); }
    x.fillStyle = 'rgba(10,30,34,0.35)'; x.beginPath(); x.moveTo(tx + 4, ty + 4); x.bezierCurveTo(tx + 14, ty - 100, tx + 10, ty - 190, tx + 4, ty - 258); x.lineTo(tx + 34, ty - 260); x.bezierCurveTo(tx + 24, ty - 150, tx + 30, ty - 60, tx + 58, ty + 8); x.closePath(); x.fill();
    x.restore();
    P.crown(x, tx - 120, 250, 190, 120, TREE, 32, { n: 30 });
    P.crown(x, tx + 30, 130, 300, 150, TREE, 33, { n: 60 });
    P.crown(x, tx + 250, 262, 150, 86, TREE, 34, { n: 22 });
    // loose leaves at the rim and a few sky-holes of light
    for (let i = 0; i < 260; i++) { const an = r() * TAU, d = 0.86 + r() * 0.26, lx2 = tx + 40 + Math.cos(an) * 330 * d, ly2 = 170 + Math.sin(an) * 190 * d; if (ly2 > 380) continue; P.ell(x, lx2, ly2, 3 + r() * 5, 1.6 + r() * 2.4, P.css(P.ramp(TREE, r() * 0.8)), r() * 3); }
    for (let i = 0; i < 220; i++) { const px = tx - 250 + r() * 560, py = 20 + r() * 300; P.ell(x, px, py, 2 + r() * 4.5, 1.2 + r() * 2, P.css(P.ramp(['#8fcf58', '#d8ee88', '#f4f8b8'], r()), 0.9), r() * 3); }

    drawBlades(Math.min(split, splitTree), split);

    // ---- 小芽 and 絮絮 on the crest ----
    x.save(); x.translate(girlX, girlY); x.translate(8, 4); x.transform(1, 0, -1.4, 0.12, 0, 0); x.globalAlpha = 0.32; x.fillStyle = '#0c3a3c'; x.beginPath(); x.ellipse(0, -34, 30, 44, 0, 0, TAU); x.fill(); x.restore();
    K.girl(x, t, girlX, girlY, 0.78, { pose: 'arms', seed: 2 });
    P.soft(x, 10, (c) => { P.circle(c, girlX + 122, girlY - 226, 46, 'rgba(96,120,190,0.3)'); });
    K.xuxu(x, t, girlX + 118, girlY - 232, 36);
    drawBlades(split, blades.length);

    // ---- drifting seeds, sun rays, out-of-focus foreground ----
    for (let i = 0; i < 70; i++) { const u = r(), px = 420 + u * 900 + (r() - 0.5) * 160, py = 560 - u * 470 + (r() - 0.5) * 240 + Math.sin(u * 9) * 30, s = 2.2 + r() * 5.5; x.save(); x.translate(1.2, 1.6); flySeed(x, px, py, s, 0.5, 0); x.restore(); x.shadowColor = 'rgba(60,80,140,0.55)'; x.shadowBlur = 3; flySeed(x, px, py, s, 0.5 + (r() - 0.5) * 0.9, 0.7 + r() * 0.3); x.shadowBlur = 0; }
    P.rays(x, -80, -160, 0.62, 1500, 8, 0.5, '#fff6d4', 0.11, 4);
    x.save(); x.filter = 'blur(5px)';
    for (let i = 0; i < 12; i++) { const u = r(), px = u < 0.5 ? u * 2 * 300 - 30 : W - (u - 0.5) * 2 * 330 + 30, hh = 70 + r() * 170, lean = (r() - 0.3) * 120, wd = 10 + r() * 16; x.fillStyle = P.css(P.ramp(['#0f3d30', '#1d5a38', '#3a8a40'], r())); x.beginPath(); x.moveTo(px - wd, H + 20); x.quadraticCurveTo(px + lean * 0.3, H - hh * 0.6, px + lean, H - hh); x.quadraticCurveTo(px + lean * 0.5 + wd, H - hh * 0.5, px + wd, H + 20); x.fill(); }
    for (const [px, py, rr] of [[90, 640, 30], [1190, 610, 36], [1010, 690, 24]]) { x.strokeStyle = '#2f6a3a'; x.lineWidth = 5; x.beginPath(); x.moveTo(px - 8, H + 20); x.quadraticCurveTo(px - 10, py + 60, px, py); x.stroke(); seedHead(x, px, py, rr, 0.95); }
    for (let i = 0; i < 5; i++) flySeed(x, 200 + r() * 900, 380 + r() * 300, 16 + r() * 10, r() * 2, 0.6);
    x.restore();

    // ---- finish: bloom, warm light, paper grain, vignette ----
    x.setTransform(1, 0, 0, 1, 0, 0);
    const bl = P.canvas(DW / 4, DH / 4), bx2 = bl.getContext('2d'); bx2.filter = 'brightness(1.05) contrast(1.8) blur(6px)'; bx2.drawImage(cv, 0, 0, DW / 4, DH / 4);
    x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = 0.2; x.drawImage(bl, 0, 0, DW, DH); x.restore();
    x.fillStyle = P.rg(x, 150, 0, 0, 1500, [[0, 'rgba(255,238,190,0.2)'], [1, 'rgba(255,238,190,0)']]); x.fillRect(0, 0, DW, DH);
    P.tex(x, 'paper', 0.3, 'soft-light', [0, 0, DW, DH], 1.5); P.tex(x, 'blot', 0.12, 'soft-light', [0, 0, DW, DH], 4);
    x.fillStyle = P.rg(x, DW / 2, DH * 0.46, DW * 0.34, DW * 0.78, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(18,24,40,0.3)']]); x.fillRect(0, 0, DW, DH);
    return cv;
  }

  window.KV = { render, paintCloud };
})();
