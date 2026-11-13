/* 小芽与风的种子 · Dreamlight engine
 * Everything here is a pure function of (shot, time) so the same code drives
 * the live player and the frame-by-frame MP4 renderer (tools/render.mjs).
 * When a GPT-generated plate exists in assets/ it replaces the procedural
 * background; camera moves, effects, titles and subtitles are always code.
 */
(function () {
  const W = 1280, H = 720;
  const TAU = Math.PI * 2;
  const FONT = '"Noto Serif SC","Songti SC","STSong","WenQuanYi Zen Hei",serif';

  // ---------- helpers ----------
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function hash(n) { // deterministic 0..1
    n = (n | 0) * 374761393 + 668265263; n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function strSeed(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function vgrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function rgrad(ctx, x, y, r, inner, outer) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, inner); g.addColorStop(1, outer); return g; }
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry, fill, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
  function rrect(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function poly(ctx, pts, fill, stroke, lw) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }

  // ---------- scenery primitives ----------
  function sky(ctx, stops) { ctx.fillStyle = vgrad(ctx, 0, H, stops); ctx.fillRect(0, 0, W, H); }

  function cloud(ctx, x, y, s, t, light, shade) {
    // cumulus: stacked puffs, lit from the top-left
    const R = rng(strSeed('c' + Math.round(x) + Math.round(y)));
    const puffs = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI;
      puffs.push([Math.cos(a) * 120 * s * (0.8 + R() * 0.4), -Math.sin(a) * 70 * s * (0.6 + R() * 0.8), (40 + R() * 45) * s]);
    }
    puffs.push([0, -90 * s, 70 * s], [-50 * s, -60 * s, 55 * s], [60 * s, -70 * s, 60 * s]);
    const drift = Math.sin(t * 0.05 + x) * 6;
    ctx.save(); ctx.translate(x + drift, y);
    puffs.forEach(([px, py, r]) => circle(ctx, px + 6 * s, py + 10 * s, r, shade));
    puffs.forEach(([px, py, r]) => { ctx.fillStyle = rgrad(ctx, px - r * 0.4, py - r * 0.5, r * 1.3, light, shade); ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); });
    ctx.fillStyle = shade; ctx.fillRect(-150 * s, -2, 300 * s, 14 * s);
    ctx.restore();
  }

  function clouds(ctx, t, seed, n, light, shade, yMin = 60, yMax = 300, sMin = 0.5, sMax = 1.2) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) cloud(ctx, R() * W * 1.2 - W * 0.1 + t * (2 + R() * 3), yMin + R() * (yMax - yMin), sMin + R() * (sMax - sMin), t, light, shade);
  }

  function hills(ctx, baseY, amp, color, seed, freq = 1) {
    const R = rng(seed); const ph = R() * 10;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, baseY - amp * (0.5 + 0.5 * Math.sin(x / 210 * freq + ph)) - amp * 0.35 * Math.sin(x / 77 * freq + ph * 2));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }

  function skyline(ctx, baseY, color, seed, opt = {}) {
    const R = rng(seed); let x = -20;
    while (x < W + 20) {
      const w = 40 + R() * 90, h = (opt.minH || 60) + R() * (opt.varH || 160);
      ctx.fillStyle = color; ctx.fillRect(x, baseY - h, w, h + 400);
      if (opt.windows) {
        for (let wy = baseY - h + 10; wy < baseY - 8; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 13)
          if (R() < opt.windows) { ctx.fillStyle = opt.winColor || 'rgba(255,214,140,0.85)'; ctx.fillRect(wx, wy, 6, 8); }
      }
      x += w + R() * 6;
    }
  }

  function bricks(ctx, x, y, w, h, base, mortar) {
    ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = mortar; ctx.lineWidth = 1;
    for (let yy = y, row = 0; yy < y + h; yy += 12, row++) {
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      for (let xx = x + (row % 2) * 14; xx < x + w; xx += 28) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 12); ctx.stroke(); }
    }
  }

  function oldBuilding(ctx, t, cx, baseY, opts = {}) {
    const bw = opts.w || 560, floors = 5, fh = 92, bh = floors * fh + 40;
    const x0 = cx - bw / 2, y0 = baseY - bh;
    const night = opts.night;
    bricks(ctx, x0, y0, bw, bh, night ? '#4a2b2b' : '#b8604a', night ? 'rgba(0,0,0,0.25)' : 'rgba(90,40,30,0.25)');
    rrect(ctx, x0 - 12, y0 - 14, bw + 24, 20, 3, night ? '#2d1d1d' : '#7d3d30');
    const R = rng(77);
    for (let f = 0; f < floors; f++) {
      const fy = y0 + 30 + f * fh;
      for (let c = 0; c < 4; c++) {
        const wx = x0 + 30 + c * (bw - 60) / 4, ww = (bw - 60) / 4 - 26;
        const isEye = opts.face && f === 1 && (c === 1 || c === 2);
        const lit = night ? R() < 0.35 : false;
        let open = 1;
        if (isEye) { const blink = (t % 4.2) < 0.18 ? 0.1 : 1; open = opts.sleepy ? 0.45 * blink : blink; }
        rrect(ctx, wx, fy, ww, 50, 3, '#e8dcc0');
        ctx.fillStyle = lit ? '#ffcf7a' : (night ? '#1c2233' : '#4f6f7f');
        ctx.fillRect(wx + 4, fy + 4 + 42 * (1 - open) / 2, ww - 8, 42 * open);
        if (isEye && open > 0.3) { circle(ctx, wx + ww / 2, fy + 25, 9 * open, '#1a1410'); circle(ctx, wx + ww / 2 + 3, fy + 21, 3, '#fff'); }
        if (isEye && opts.smile) { ctx.strokeStyle = '#3b2216'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx + ww / 2, fy + 18, 14, 0.2, Math.PI - 0.2); ctx.stroke(); }
        // balcony
        if (f > 0 && !isEye) {
          rrect(ctx, wx - 6, fy + 52, ww + 12, 24, 2, night ? '#24413a' : '#4e8a6a');
          for (let p = 0; p < 3; p++) if (R() < 0.6) { circle(ctx, wx + 8 + p * (ww / 3), fy + 50, 8, night ? '#1f3a26' : '#3f8a3a'); if (R() < 0.4) circle(ctx, wx + 8 + p * (ww / 3), fy + 46, 3, '#e64a3a'); }
        }
        // laundry
        if (!night && f === 3 && c === 0) {
          ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx - 6, fy + 54); ctx.lineTo(wx + ww + 120, fy + 54); ctx.stroke();
          ['#fff', '#8fb8de', '#f2b5a8', '#fff'].forEach((col, i) => { const sw = Math.sin(t * 1.5 + i) * 3; poly(ctx, [[wx + i * 34, fy + 54], [wx + i * 34 + 24, fy + 54], [wx + i * 34 + 24 + sw, fy + 84], [wx + i * 34 + sw, fy + 84]], col); });
        }
      }
    }
    // door / mouth
    const breathe = 1 + Math.sin(t * 1.2) * (opts.face ? 0.04 : 0);
    rrect(ctx, cx - 40, baseY - 80 * breathe, 80, 80 * breathe, [40, 40, 0, 0], night ? '#140d0d' : '#3a2620');
    if (opts.chai) chai(ctx, x0 + bw - 110, y0 + bh * 0.55, 70, 1);
  }

  function chai(ctx, x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#d61f1f'; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#d61f1f'; ctx.font = `bold ${r * 1.3}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('拆', x, y + r * 0.05);
    for (let i = 0; i < 5; i++) { const dx = x - r * 0.6 + i * r * 0.3, len = r * (0.3 + hash(i + 3) * 0.8); ctx.fillRect(dx, y + r * 0.9, r * 0.06, len); circle(ctx, dx + r * 0.03, y + r * 0.9 + len, r * 0.06, '#d61f1f'); }
    ctx.restore();
  }

  function lamp(ctx, x, y, h, color, t) {
    ctx.fillStyle = '#2a2d36'; ctx.fillRect(x - 3, y - h, 6, h);
    ctx.fillStyle = rgrad(ctx, x, y - h, 90, color, 'rgba(0,0,0,0)'); ctx.beginPath(); ctx.arc(x, y - h, 90, 0, TAU); ctx.fill();
    circle(ctx, x, y - h, 9, '#fff3c9');
  }
  function lantern(ctx, x, y, s, t) {
    const sw = Math.sin(t * 1.3 + x) * 4;
    ctx.save(); ctx.translate(x + sw, y);
    ctx.fillStyle = rgrad(ctx, 0, 0, 80 * s, 'rgba(255,90,60,0.55)', 'rgba(255,90,60,0)'); ctx.beginPath(); ctx.arc(0, 0, 80 * s, 0, TAU); ctx.fill();
    ellipse(ctx, 0, 0, 22 * s, 28 * s, '#e43b2a'); ellipse(ctx, -6 * s, -6 * s, 8 * s, 12 * s, 'rgba(255,220,150,0.6)');
    ctx.fillStyle = '#6b3b1c'; ctx.fillRect(-12 * s, -32 * s, 24 * s, 6 * s); ctx.fillRect(-12 * s, 26 * s, 24 * s, 6 * s);
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(-2 * s, 32 * s, 4 * s, 16 * s);
    ctx.restore();
  }
  function beetle(ctx, x, y, s, t, color) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 0.8 + x) * 2 * s);
    ellipse(ctx, 0, 0, 110 * s, 55 * s, color);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(0, -55 * s); ctx.lineTo(0, 30 * s); ctx.stroke();
    ellipse(ctx, -30 * s, -25 * s, 40 * s, 14 * s, 'rgba(255,255,255,0.18)', -0.3);
    const lid = 0.35 + 0.15 * Math.sin(t * 0.7 + x); // sleepy headlight eyes
    [-1, 1].forEach((d) => { circle(ctx, 95 * s, d * 18 * s, 13 * s, '#fff2b0'); ctx.fillStyle = color; ctx.fillRect(80 * s, d * 18 * s - 14 * s, 30 * s, 28 * s * lid); });
    ctx.fillStyle = '#1b1b1b'; for (let i = -1; i <= 1; i++) { ctx.fillRect(i * 50 * s - 4 * s, 48 * s, 8 * s, 18 * s); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `${16 * s}px ${FONT}`; ctx.fillText('z', x + 70 * s, y - 70 * s - (t * 8 % 20));
  }
  function jelly(ctx, x, y, s, t, color) {
    const p = Math.sin(t * 2 + x) * 0.08;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = rgrad(ctx, 0, 0, 120 * s, color.replace('1)', '0.35)'), 'rgba(0,0,0,0)'); ctx.beginPath(); ctx.arc(0, 0, 120 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 70 * s * (1 + p), 45 * s * (1 - p), 0, Math.PI, TAU); ctx.fillStyle = color; ctx.fill();
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 20 * s, 0, 10 * s, 0, Math.PI); ctx.fillStyle = color; ctx.fill(); }
    ctx.strokeStyle = color; ctx.lineWidth = 2 * s;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 22 * s, 8 * s); for (let k = 1; k <= 6; k++) ctx.lineTo(i * 22 * s + Math.sin(t * 3 + k + i) * 6 * s, 8 * s + k * 16 * s); ctx.stroke(); }
    ctx.fillStyle = '#5b4636'; ctx.fillRect(-1.5 * s, -45 * s, 3 * s, 100 * s);
    ctx.restore();
  }
  function plant(ctx, x, y, s, R, fruit) {
    rrect(ctx, x - 28 * s, y - 30 * s, 56 * s, 34 * s, 6 * s, '#eae3d2'); ctx.fillStyle = '#3f6f9e'; ctx.fillRect(x - 28 * s, y - 30 * s, 56 * s, 5 * s);
    for (let i = 0; i < 7; i++) ellipse(ctx, x + (R() - 0.5) * 50 * s, y - 40 * s - R() * 50 * s, 18 * s, 12 * s, ['#3e8b3a', '#5aa846', '#2f6e33'][i % 3], R() * 3);
    if (fruit) for (let i = 0; i < 3; i++) circle(ctx, x + (R() - 0.5) * 40 * s, y - 40 * s - R() * 30 * s, 8 * s, '#e3402d');
  }
  function sunflower(ctx, x, y, h, t) {
    const sw = Math.sin(t + x) * 4;
    ctx.strokeStyle = '#3f7d34'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - h / 2, x + sw, y - h); ctx.stroke();
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ellipse(ctx, x + sw + Math.cos(a) * 20, y - h + Math.sin(a) * 20, 14, 6, '#f6c21c', a); }
    circle(ctx, x + sw, y - h, 14, '#6b3f1d');
  }

  // ---------- characters ----------
  function blinkAt(t, off) { return ((t + off) % 3.7) < 0.13; }

  function drawGirl(ctx, t, x, y, s, o = {}) {
    const u = 23 * s; const pose = o.pose || 'stand';
    const bob = Math.sin(t * 2.2) * 0.4 * u * (pose === 'stand' ? 1 : 0.4);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 3 * u, 0.6 * u, 0, 0, TAU); ctx.fill();
    const low = pose === 'crouch' || pose === 'sit';
    const bodyTop = low ? -4.6 * u : -6.6 * u + bob, bodyBot = low ? -0.6 * u : -1.3 * u;
    const headY = low ? -6.1 * u : -8.3 * u + bob;
    // boots
    if (!low) { rrect(ctx, -1.5 * u, -1.5 * u, 1.2 * u, 1.5 * u, 0.3 * u, '#d93a2f'); rrect(ctx, 0.3 * u, -1.5 * u, 1.2 * u, 1.5 * u, 0.3 * u, '#d93a2f'); }
    else { rrect(ctx, -2.4 * u, -1 * u, 1.6 * u, 1 * u, 0.4 * u, '#d93a2f'); rrect(ctx, 0.8 * u, -1 * u, 1.6 * u, 1 * u, 0.4 * u, '#d93a2f'); }
    // arms (behind / sleeves)
    const arm = (side, ang, len = 3.2) => {
      ctx.save(); ctx.translate(side * 1.2 * u, bodyTop + 0.8 * u); ctx.rotate(ang);
      rrect(ctx, -0.5 * u, 0, 1.0 * u, len * u, 0.5 * u, '#f0b419'); circle(ctx, 0, len * u, 0.5 * u, '#ffe1c8');
      ctx.restore();
    };
    let la = 0.25, ra = -0.25;
    if (pose === 'arms') { la = 2.0; ra = -2.0; }
    if (pose === 'fist') { la = 0.15; ra = -0.15; }
    if (pose === 'wave') { la = 0.3; ra = -2.6 + Math.sin(t * 7) * 0.35; if (o.back) la = 2.6 - Math.sin(t * 7) * 0.35; }
    if (pose === 'draw') { la = 0.3; ra = -1.9 + Math.sin(t * 3) * 0.5; }
    if (low) { la = 0.9; ra = -0.9; }
    arm(-1, la); arm(1, ra);
    // raincoat
    poly(ctx, [[-1.3 * u, bodyTop], [1.3 * u, bodyTop], [2.2 * u, bodyBot], [-2.2 * u, bodyBot]], '#f6c42b', '#c98f12', 0.15 * u);
    if (!o.back) { ctx.fillStyle = '#c98f12'; for (let i = 0; i < 3; i++) circle(ctx, 0, bodyTop + (0.8 + i * 1.2) * u, 0.18 * u, '#c98f12'); }
    // head
    ctx.save(); ctx.translate(0, headY);
    if (o.back) {
      ellipse(ctx, 0, 0.2 * u, 2.2 * u, 2.0 * u, '#f6c42b');   // hood
      ellipse(ctx, 0, -0.1 * u, 1.9 * u, 1.85 * u, '#2a211d');
    } else {
      ellipse(ctx, 0, 0.2 * u, 2.05 * u, 1.95 * u, '#2a211d');   // hair back
      ellipse(ctx, 0, 0.3 * u, 1.65 * u, 1.6 * u, '#ffe1c8');    // face
      ctx.beginPath(); ctx.moveTo(-1.95 * u, 0.6 * u); ctx.quadraticCurveTo(-2 * u, -2 * u, 0, -1.9 * u); ctx.quadraticCurveTo(2 * u, -2 * u, 1.95 * u, 0.6 * u);
      ctx.lineTo(1.5 * u, 0.7 * u); ctx.lineTo(1.4 * u, -0.45 * u); ctx.lineTo(-1.4 * u, -0.45 * u); ctx.lineTo(-1.5 * u, 0.7 * u); ctx.closePath(); ctx.fillStyle = '#2a211d'; ctx.fill(); // bob + bangs
      if (blinkAt(t, x)) { ctx.strokeStyle = '#2a211d'; ctx.lineWidth = 0.15 * u; [-0.6, 0.6].forEach(d => { ctx.beginPath(); ctx.moveTo(d * u - 0.25 * u, 0.4 * u); ctx.lineTo(d * u + 0.25 * u, 0.4 * u); ctx.stroke(); }); }
      else [-0.6, 0.6].forEach(d => { ellipse(ctx, d * u, 0.35 * u, 0.22 * u, 0.3 * u, '#231a16'); circle(ctx, d * u + 0.08 * u, 0.25 * u, 0.08 * u, '#fff'); });
      ellipse(ctx, -1.0 * u, 0.95 * u, 0.35 * u, 0.2 * u, 'rgba(240,120,120,0.45)'); ellipse(ctx, 1.0 * u, 0.95 * u, 0.35 * u, 0.2 * u, 'rgba(240,120,120,0.45)');
      ctx.strokeStyle = '#9a4b3a'; ctx.lineWidth = 0.1 * u; ctx.beginPath();
      if (pose === 'fist' || pose === 'arms') { ctx.moveTo(-0.3 * u, 1.25 * u); ctx.lineTo(0.3 * u, 1.25 * u); } else ctx.arc(0, 1.05 * u, 0.3 * u, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.restore();
    if (pose === 'draw') { // crayon light trail
      const hx = 1.2 * u + Math.sin(-1.9 + Math.sin(t * 3) * 0.5 + Math.PI / 2) * 0; // approx hand pos
      ctx.lineCap = 'round';
      ['#e3402d', '#f6c42b', '#4caf50'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 0.35 * u; ctx.beginPath(); for (let k = 0; k < 30; k++) { const kx = hx + 2 * u + k * 0.35 * u, ky = bodyTop - 2 * u - i * 0.7 * u + Math.sin(k * 0.4 + t * 4 + i) * u; k ? ctx.lineTo(kx, ky) : ctx.moveTo(kx, ky); } ctx.stroke(); });
    }
    ctx.restore();
  }

  function drawXuxu(ctx, t, x, y, r, o = {}) {
    const fl = Math.sin(t * 1.8 + x) * r * 0.12; y += fl;
    const alpha = o.alpha == null ? 1 : o.alpha;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    ctx.fillStyle = rgrad(ctx, 0, 0, r * 2.2, 'rgba(255,248,220,0.55)', 'rgba(255,248,220,0)'); ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = rgrad(ctx, -r * 0.3, -r * 0.3, r * 1.1, '#ffffff', '#e9eef0'); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1, r * 0.025);
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU + t * 0.15, l = r * (1.05 + hash(i) * 0.35); ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke(); circle(ctx, Math.cos(a) * l, Math.sin(a) * l, r * 0.03, 'rgba(255,255,255,0.9)'); }
    // leaf
    ctx.save(); ctx.translate(0, -r * 0.95); ctx.rotate(Math.sin(t * 2) * 0.25); ellipse(ctx, r * 0.18, -r * 0.18, r * 0.28, r * 0.12, '#5cbf4a', -0.6); ctx.restore();
    // eyes
    if (blinkAt(t, 1.3)) { ctx.strokeStyle = '#111'; ctx.lineWidth = r * 0.05; [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(d * r * 0.3 - r * 0.08, 0); ctx.lineTo(d * r * 0.3 + r * 0.08, 0); ctx.stroke(); }); }
    else [-1, 1].forEach(d => { circle(ctx, d * r * 0.3, 0, r * 0.1, '#111'); circle(ctx, d * r * 0.3 + r * 0.035, -r * 0.035, r * 0.035, '#fff'); });
    ctx.restore();
  }

  function drawGrandma(ctx, t, x, y, s, o = {}) {
    const u = 34 * s; ctx.save(); ctx.translate(x, y);
    if (o.pose === 'bed') {
      rrect(ctx, -6 * u, -3.2 * u, 12 * u, 3.2 * u, 0.4 * u, '#eef1f2'); rrect(ctx, -6 * u, -3.2 * u, 12 * u, 0.5 * u, 0.2 * u, '#c9d6dc');
      ctx.translate(-3 * u, -3.2 * u); ellipse(ctx, 0, -0.6 * u, 2 * u, 1 * u, '#fff');
      poly(ctx, [[-1.3 * u, 0], [1.3 * u, 0], [1 * u, -3 * u], [-1 * u, -3 * u]], '#3c4f86');
      ctx.translate(0, -4 * u);
    } else {
      const k = o.pose === 'kneel' ? 0.7 : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 3 * u, 0.5 * u, 0, 0, TAU); ctx.fill();
      rrect(ctx, -1.2 * u, -1 * u, 1 * u, 1 * u, 0.2 * u, '#2a2a2a'); rrect(ctx, 0.2 * u, -1 * u, 1 * u, 1 * u, 0.2 * u, '#2a2a2a');
      poly(ctx, [[-1.6 * u, -7 * u * k], [1.6 * u, -7 * u * k], [2 * u, -1 * u], [-2 * u, -1 * u]], '#3c4f86', '#26335a', 0.1 * u);
      poly(ctx, [[-1 * u, -5.8 * u * k], [1 * u, -5.8 * u * k], [1.3 * u, -1.6 * u], [-1.3 * u, -1.6 * u]], '#e9d6c0');
      for (let i = 0; i < 8; i++) circle(ctx, (hash(i) - 0.5) * 2 * u, -1.8 * u - hash(i + 9) * 3.6 * u * k, 0.18 * u, '#d97a6a');
      ctx.translate(0, -8.4 * u * k);
    }
    ellipse(ctx, 0, 0, 1.4 * u, 1.5 * u, '#f3d6bd');
    ellipse(ctx, 0, -0.9 * u, 1.5 * u, 0.9 * u, '#d9dbe0'); circle(ctx, 0, -1.9 * u, 0.6 * u, '#d9dbe0');
    ctx.strokeStyle = '#6d5a48'; ctx.lineWidth = 0.08 * u; [-0.5, 0.5].forEach(d => { ctx.beginPath(); ctx.arc(d * u, 0.1 * u, 0.35 * u, 0, TAU); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-0.15 * u, 0.1 * u); ctx.lineTo(0.15 * u, 0.1 * u); ctx.stroke();
    [-0.5, 0.5].forEach(d => { ctx.beginPath(); ctx.arc(d * u, 0.15 * u, 0.15 * u, Math.PI + 0.3, -0.3); ctx.stroke(); });
    ctx.strokeStyle = '#a0584a'; ctx.beginPath(); ctx.arc(0, 0.6 * u, 0.35 * u, 0.3, Math.PI - 0.3); ctx.stroke();
    ellipse(ctx, -0.9 * u, 0.6 * u, 0.25 * u, 0.15 * u, 'rgba(230,120,110,0.4)'); ellipse(ctx, 0.9 * u, 0.6 * u, 0.25 * u, 0.15 * u, 'rgba(230,120,110,0.4)');
    ctx.restore();
  }

  function drawMom(ctx, t, x, y, s, o = {}) {
    const u = 40 * s; ctx.save(); ctx.translate(x, y);
    const pose = o.pose;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 3 * u, 0.5 * u, 0, 0, TAU); ctx.fill();
    if (pose === 'cry' || pose === 'hug') {
      rrect(ctx, -2.4 * u, -2.2 * u, 4.8 * u, 2.2 * u, 0.6 * u, '#3b3f4a'); // legs folded
      poly(ctx, [[-1.6 * u, -6 * u], [1.6 * u, -6 * u], [2.2 * u, -1.8 * u], [-2.2 * u, -1.8 * u]], '#d8c4a0', '#a8916b', 0.1 * u);
      ctx.translate(0, pose === 'cry' ? -6.6 * u : -7.2 * u);
      ellipse(ctx, 0, 0, 1.25 * u, 1.4 * u, '#2a211d');
      if (pose === 'cry') { ellipse(ctx, -0.6 * u, 0.6 * u, 0.7 * u, 0.5 * u, '#f6dcc6'); ellipse(ctx, 0.6 * u, 0.6 * u, 0.7 * u, 0.5 * u, '#f6dcc6'); }
      else { ellipse(ctx, 0, 0.3 * u, 1.0 * u, 1.15 * u, '#f6dcc6'); ctx.strokeStyle = '#2a211d'; ctx.lineWidth = 0.1 * u; [-0.4, 0.4].forEach(d => { ctx.beginPath(); ctx.arc(d * u, 0.3 * u, 0.2 * u, Math.PI + 0.4, -0.4); ctx.stroke(); }); ctx.beginPath(); ctx.arc(0, 0.75 * u, 0.25 * u, 0.3, Math.PI - 0.3); ctx.stroke(); }
      ctx.restore(); return;
    }
    rrect(ctx, -1.1 * u, -3 * u, 0.9 * u, 3 * u, 0.2 * u, '#3b3f4a'); rrect(ctx, 0.2 * u, -3 * u, 0.9 * u, 3 * u, 0.2 * u, '#3b3f4a');
    poly(ctx, [[-1.4 * u, -8.4 * u], [1.4 * u, -8.4 * u], [2.1 * u, -2.6 * u], [-2.1 * u, -2.6 * u]], '#d8c4a0', '#a8916b', 0.1 * u);
    ctx.strokeStyle = '#3a6ea5'; ctx.lineWidth = 0.12 * u; ctx.beginPath(); ctx.moveTo(-0.5 * u, -8.3 * u); ctx.lineTo(0, -6.5 * u); ctx.lineTo(0.5 * u, -8.3 * u); ctx.stroke();
    rrect(ctx, -0.3 * u, -6.6 * u, 0.6 * u, 0.8 * u, 0.1 * u, '#fff');
    ctx.translate(0, -9.6 * u);
    if (o.back) { ellipse(ctx, 0, 0, 1.2 * u, 1.35 * u, '#2a211d'); ellipse(ctx, 0.3 * u, 1.2 * u, 0.35 * u, 0.9 * u, '#2a211d'); ctx.restore(); return; }
    ellipse(ctx, 0.9 * u, 0.2 * u, 0.4 * u, 1.0 * u, '#2a211d'); // ponytail
    ellipse(ctx, 0, 0, 1.15 * u, 1.35 * u, '#f6dcc6');
    ctx.beginPath(); ctx.ellipse(0, -0.35 * u, 1.25 * u, 1.05 * u, 0, Math.PI, TAU); ctx.fillStyle = '#2a211d'; ctx.fill();
    [-0.42, 0.42].forEach(d => { ellipse(ctx, d * u, 0.15 * u, 0.13 * u, 0.17 * u, '#231a16'); ellipse(ctx, d * u, 0.42 * u, 0.22 * u, 0.06 * u, 'rgba(120,90,110,0.35)'); });
    ctx.strokeStyle = '#9a4b3a'; ctx.lineWidth = 0.08 * u; ctx.beginPath();
    if (pose === 'phone') { ctx.moveTo(-0.3 * u, 0.85 * u); ctx.lineTo(0.3 * u, 0.75 * u); ctx.stroke(); rrect(ctx, -1.6 * u, -0.3 * u, 0.45 * u, 0.9 * u, 0.08 * u, '#222'); }
    else { ctx.arc(0, 0.7 * u, 0.28 * u, 0.3, Math.PI - 0.3); ctx.stroke(); }
    ctx.restore();
  }

  function drawFogman(ctx, t, x, y, s) {
    const u = 22 * s; ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 26; i++) { const k = i / 26, wob = Math.sin(t * 0.8 + i) * u * 0.5; const r = u * (1.6 + (1 - k) * 1.2 + hash(i) * 0.8); ctx.fillStyle = rgrad(ctx, wob, -k * 11 * u, r, 'rgba(105,108,115,0.7)', 'rgba(105,108,115,0)'); ctx.beginPath(); ctx.arc(wob, -k * 11 * u, r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(70,72,78,0.85)'; ctx.fillRect(-1.6 * u, -14.6 * u, 3.2 * u, 3 * u); ctx.fillRect(-2.6 * u, -11.8 * u, 5.2 * u, 0.5 * u);
    [-0.6, 0.6].forEach(d => circle(ctx, d * u, -10 * u, 0.22 * u, 'rgba(230,230,235,0.5)'));
    ctx.restore();
  }

  function drawRhino(ctx, t, x, y, s, o = {}) {
    const u = 30 * s; const rum = Math.sin(t * 20) * 0.6 * s * (o.sad ? 0 : 1);
    ctx.save(); ctx.translate(x, y + rum);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 8 * u, u, 0, 0, TAU); ctx.fill();
    rrect(ctx, -7 * u, -2.2 * u, 14 * u, 2.2 * u, u, '#2b2b2e');
    for (let i = -6; i <= 6; i += 1.5) circle(ctx, i * u, -1.1 * u, 0.55 * u, '#4a4a4f');
    rrect(ctx, -6 * u, -6.2 * u, 11 * u, 4.2 * u, 0.6 * u, '#e8b520');
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(120,70,20,0.5)'; ctx.lineWidth = 0.15 * u; ctx.beginPath(); ctx.moveTo(-5 * u + i * 2.2 * u, -6 * u); ctx.lineTo(-4.6 * u + i * 2.2 * u, -2.2 * u); ctx.stroke(); }
    for (let i = 0; i < 9; i++) circle(ctx, -5 * u + hash(i) * 10 * u, -5.6 * u + hash(i + 4) * 3 * u, 0.3 * u, 'rgba(150,70,30,0.45)');
    rrect(ctx, -4.5 * u, -10 * u, 4.2 * u, 3.9 * u, 0.4 * u, '#d9a218'); rrect(ctx, -4 * u, -9.5 * u, 3.2 * u, 2.4 * u, 0.3 * u, 'rgba(160,200,220,0.7)');
    // horn arm
    const lift = o.sad ? 0.5 : Math.sin(t * 0.9) * 0.15;
    ctx.save(); ctx.translate(4.5 * u, -5.5 * u); ctx.rotate(-0.6 + lift);
    rrect(ctx, 0, -0.7 * u, 6.5 * u, 1.4 * u, 0.4 * u, '#e8b520');
    ctx.translate(6.5 * u, 0); ctx.rotate(1.4); rrect(ctx, 0, -0.5 * u, 4 * u, 1 * u, 0.3 * u, '#d9a218');
    poly(ctx, [[3.6 * u, -1.2 * u], [5.6 * u, 0], [3.6 * u, 1.4 * u]], '#555');
    ctx.restore();
    // headlight eyes + beams
    [[3.6, -4.6], [5.2, -4.6]].forEach(([ex, ey]) => {
      if (!o.sad) { ctx.fillStyle = 'rgba(255,240,170,0.18)'; poly(ctx, [[ex * u, ey * u], [ex * u + 18 * u, ey * u - 4 * u], [ex * u + 18 * u, ey * u + 6 * u]], 'rgba(255,240,170,0.14)'); }
      circle(ctx, ex * u, ey * u, 0.85 * u, '#fff6c8'); circle(ctx, ex * u, ey * u, 0.45 * u, o.sad ? '#c9a24b' : '#fffbe6');
      if (o.sad) { const d = (t * 0.6) % 1; ctx.fillStyle = '#9b4a1e'; ctx.fillRect(ex * u - 0.12 * u, ey * u + 0.8 * u, 0.24 * u, d * 3 * u); circle(ctx, ex * u, ey * u + 0.8 * u + d * 3 * u, 0.25 * u, '#9b4a1e'); }
    });
    ctx.restore();
  }

  function drawDriver(ctx, t, x, y, s) {
    const u = 40 * s; ctx.save(); ctx.translate(x, y);
    poly(ctx, [[-3.5 * u, 0], [3.5 * u, 0], [2.4 * u, -4 * u], [-2.4 * u, -4 * u]], '#e8742a');
    ctx.fillStyle = '#d9e0e3'; ctx.fillRect(-2.6 * u, -2.2 * u, 5.2 * u, 0.35 * u);
    ctx.translate(0, -5.6 * u);
    ellipse(ctx, 0, 0, 1.3 * u, 1.55 * u, '#e8c3a2');
    ctx.beginPath(); ctx.ellipse(0, -0.6 * u, 1.55 * u, 1.2 * u, 0, Math.PI, TAU); ctx.fillStyle = '#f2c21c'; ctx.fill(); ctx.fillStyle = '#d9a90f'; ctx.fillRect(-1.9 * u, -0.7 * u, 3.8 * u, 0.3 * u);
    ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 0.1 * u; [-0.45, 0.45].forEach(d => { ctx.beginPath(); ctx.arc(d * u, 0.2 * u, 0.2 * u, Math.PI + 0.4, -0.4); ctx.stroke(); });
    ctx.beginPath(); ctx.arc(0, 0.8 * u, 0.35 * u, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = 'rgba(80,60,50,0.35)'; ctx.fillRect(-0.9 * u, 1.0 * u, 1.8 * u, 0.25 * u);
    ctx.restore();
    // photo held up
    ctx.save(); ctx.translate(x - 4.2 * u, y - 4.5 * u); ctx.rotate(-0.12);
    rrect(ctx, 0, 0, 2.2 * u, 2.8 * u, 0.1 * u, '#fbf6ea'); rrect(ctx, 0.2 * u, 0.2 * u, 1.8 * u, 1.9 * u, 0, '#9cc9e6');
    drawGirlTiny(ctx, 1.1 * u, 2.05 * u, u * 0.07);
    ctx.restore();
  }
  function drawGirlTiny(ctx, x, y, k) { // a different little girl (driver's daughter): pink dress, pigtails
    circle(ctx, x, y - 12 * k, 4 * k, '#f3d6bd'); circle(ctx, x - 4 * k, y - 14 * k, 2 * k, '#2a211d'); circle(ctx, x + 4 * k, y - 14 * k, 2 * k, '#2a211d');
    poly(ctx, [[x - 3 * k, y - 8 * k], [x + 3 * k, y - 8 * k], [x + 5 * k, y], [x - 5 * k, y]], '#ef8fb0');
  }

  function drawChar(ctx, t, c, p) {
    const x = c.x * W, y = c.y * H, s = c.s || 1;
    switch (c.k) {
      case 'girl': drawGirl(ctx, t, x, y, s, c); break;
      case 'xuxu': drawXuxu(ctx, t, x, y, 60 * s); break;
      case 'xuxubig': {
        const r = 230 * s; const a = c.dissolve ? clamp(1 - p * 1.2, 0, 1) : 1;
        drawXuxu(ctx, t, x, y, r, { alpha: a });
        if (c.rider) drawGirl(ctx, t, x - r * 0.05, y - r * 0.55 + Math.sin(t * 1.8 + x) * r * 0.12, r / 300, { pose: 'arms' });
        break;
      }
      case 'grandma': drawGrandma(ctx, t, x, y, s, c); break;
      case 'mom': drawMom(ctx, t, x, y, s, c); break;
      case 'fogman': drawFogman(ctx, t, x, y, s); break;
      case 'rhino': drawRhino(ctx, t, x, y, s, c); break;
      case 'driver': drawDriver(ctx, t, x, y, s); break;
    }
  }

  // ---------- backgrounds ----------
  function wetStreet(ctx, t, horizon, tint) {
    ctx.fillStyle = vgrad(ctx, horizon, H, tint); ctx.fillRect(0, horizon, W, H - horizon);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    for (let i = -10; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 20, horizon); ctx.lineTo(W / 2 + i * 160, H); ctx.stroke(); }
  }
  function reflections(ctx, horizon, color) {
    for (let i = 0; i < 18; i++) { const x = hash(i) * W, w = 4 + hash(i + 40) * 10; ctx.fillStyle = vgrad(ctx, horizon, H, [color, 'rgba(0,0,0,0)']); ctx.fillRect(x, horizon + 10, w, 200 + hash(i + 7) * 120); }
  }
  function shopFronts(ctx, t, horizon, night) {
    const R = rng(11);
    for (let side = 0; side < 2; side++) for (let i = 0; i < 4; i++) {
      const w = 170 + R() * 60, x = side ? W - (i + 1) * 200 + 20 : i * 200 - 20, h = 260 + R() * 160;
      ctx.fillStyle = night ? '#2b2f3e' : ['#8a8f9c', '#9c8f86', '#7f8a8c'][i % 3]; ctx.fillRect(x, horizon - h, w, h);
      ctx.fillStyle = night ? '#ffc977' : 'rgba(255,214,150,0.9)'; ctx.fillRect(x + 16, horizon - 90, w - 32, 70);
      ctx.fillStyle = ['#2f6e8a', '#a8443a', '#3f7a52', '#7a5aa8'][(i + side) % 4]; ctx.fillRect(x + 6, horizon - 112, w - 12, 18);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { ctx.fillStyle = R() < (night ? 0.55 : 0.25) ? '#ffd68a' : 'rgba(40,50,70,0.7)'; ctx.fillRect(x + 20 + c * (w - 40) / 3, horizon - h + 24 + r * 40, 26, 24); }
    }
  }
  function gate(ctx, cx, horizon) {
    ctx.fillStyle = '#d9cbb3'; ctx.fillRect(cx - 170, horizon - 210, 30, 210); ctx.fillRect(cx + 140, horizon - 210, 30, 210);
    ctx.strokeStyle = '#d9cbb3'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(cx, horizon - 200, 155, Math.PI, TAU); ctx.stroke();
    ['#e85a4f', '#f6c42b', '#4caf50', '#3f8fd6', '#a25ad1'].forEach((c, i) => circle(ctx, cx - 100 + i * 50, horizon - 320 + Math.abs(i - 2) * 14, 13, c));
    ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 3; for (let i = -130; i <= 130; i += 18) { ctx.beginPath(); ctx.moveTo(cx + i, horizon - 120); ctx.lineTo(cx + i, horizon); ctx.stroke(); }
    ctx.fillRect(cx - 140, horizon - 120, 280, 4);
  }
  function interiorWall(ctx, c1, c2, floorY, floorC) { ctx.fillStyle = vgrad(ctx, 0, floorY, [c1, c2]); ctx.fillRect(0, 0, W, floorY); ctx.fillStyle = floorC; ctx.fillRect(0, floorY, W, H - floorY); }
  function windowFrame(ctx, x, y, w, h, inner) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); inner(); ctx.restore();
    ctx.strokeStyle = '#efe7d8'; ctx.lineWidth = 14; ctx.strokeRect(x, y, w, h); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
  }
  function moonStars(ctx, t, mx, my) {
    for (let i = 0; i < 90; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)); circle(ctx, hash(i) * W, hash(i + 99) * H * 0.55, 1 + hash(i + 3) * 1.4, `rgba(255,255,240,${tw * 0.8})`); }
    ctx.fillStyle = rgrad(ctx, mx, my, 160, 'rgba(255,250,220,0.35)', 'rgba(255,250,220,0)'); ctx.beginPath(); ctx.arc(mx, my, 160, 0, TAU); ctx.fill();
    circle(ctx, mx, my, 38, '#fbf4d6');
  }

  const SKIES = {
    day: ['#5ea6e6', '#9fd0f2', '#e6f3f8'],
    rain: ['#596779', '#8592a1', '#a7b0b8'],
    dusk: ['#3a3f6e', '#a56b8a', '#f1a77a'],
    sunset: ['#4b5fa8', '#f08a5d', '#ffd59a'],
    night: ['#0e1430', '#1f2c55', '#3b4a74'],
    dawn: ['#6d8fd1', '#f6b8a8', '#fde6c4'],
    gold: ['#79a9db', '#f3c98b', '#fff0cf'],
    grey: ['#6c6f75', '#8b8e93', '#a3a5a8'],
  };

  const BG = {
    title(ctx, t, shot) {
      ctx.fillStyle = vgrad(ctx, 0, H, ['#f6efdf', '#efe3c8']); ctx.fillRect(0, 0, W, H);
      const R = rng(strSeed(shot.id));
      for (let i = 0; i < 2200; i++) { ctx.fillStyle = `rgba(120,90,50,${R() * 0.05})`; ctx.fillRect(R() * W, R() * H, 2, 2); }
      ctx.strokeStyle = 'rgba(120,150,110,0.35)'; ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) { const x = 140 + i * 125; ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + 20, H - 120, x + Math.sin(t + i) * 10, H - 160 - R() * 80); ctx.stroke(); }
    },
    'street-rain'(ctx, t, shot) {
      const hz = 470; sky(ctx, SKIES.rain); shopFronts(ctx, t, hz, true);
      wetStreet(ctx, t, hz, ['#4b5463', '#2a2f39']); reflections(ctx, hz, 'rgba(255,200,120,0.35)');
      gate(ctx, 560, hz); lamp(ctx, 980, hz + 20, 300, 'rgba(255,210,140,0.5)', t);
    },
    puddle(ctx, t) {
      sky(ctx, ['#7b8591', '#5e6670', '#4a5059']);
      ctx.fillStyle = '#5a5f66'; ctx.fillRect(0, 300, W, H);
      ctx.save(); ctx.beginPath(); ctx.ellipse(760, 560, 420, 140, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = vgrad(ctx, 420, 700, SKIES.day); ctx.fillRect(300, 400, 900, 320);
      cloud(ctx, 700, 590, 0.9, t, '#ffffff', '#c9dcea'); cloud(ctx, 980, 540, 0.5, t, '#ffffff', '#c9dcea');
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const ph = (t * 0.6 + i * 0.2) % 1; ctx.beginPath(); ctx.ellipse(600 + hash(i) * 300, 540 + hash(i + 5) * 60, 10 + ph * 80, (10 + ph * 80) * 0.33, 0, 0, TAU); ctx.globalAlpha = 1 - ph; ctx.stroke(); ctx.globalAlpha = 1; }
    },
    'puddle-sky'(ctx, t) {
      sky(ctx, SKIES.day); clouds(ctx, t, 5, 6, '#ffffff', '#c6d8e8', 120, 600, 0.7, 1.4);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const ph = (t * 0.25 + i * 0.25) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(W * 0.55, H * 0.5, ph * 700, ph * 330, 0, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgrad(ctx, W / 2, H / 2, W * 0.75, 'rgba(0,0,0,0)', 'rgba(50,60,70,0.85)'); ctx.fillRect(0, 0, W, H);
    },
    'street-dream'(ctx, t, shot) {
      const hz = 470; sky(ctx, SKIES.dusk);
      if (shot.variant === 'jelly') clouds(ctx, t, 8, 3, '#ffd9c9', '#b28aa3', 80, 200, 0.6, 1.0);
      shopFronts(ctx, t, hz, true); wetStreet(ctx, t, hz, ['#4a3d55', '#1f1d2c']); reflections(ctx, hz, 'rgba(255,110,80,0.35)');
      if (shot.variant === 'jelly') {
        const cols = ['rgba(240,110,120,1)', 'rgba(110,180,240,1)', 'rgba(250,210,90,1)', 'rgba(150,220,150,1)', 'rgba(200,140,230,1)'];
        for (let i = 0; i < 9; i++) { const yy = 520 - ((t * (14 + hash(i) * 10) + hash(i + 3) * 500) % 560); jelly(ctx, 80 + i * 140 + Math.sin(t + i) * 20, yy, 0.55 + hash(i + 1) * 0.4, t, cols[i % 5]); }
      } else {
        [180, 560, 940, 1180].forEach((x, i) => { ctx.fillStyle = '#262331'; ctx.fillRect(x - 3, hz - 280, 6, 300); lantern(ctx, x, hz - 290, 1.1, t); });
        beetle(ctx, 320, 590, 0.9, t, '#3a6e5a'); beetle(ctx, 880, 620, 1.05, t, '#7a3b4a');
      }
    },
    'night-walk'(ctx, t, shot) {
      sky(ctx, SKIES.night); moonStars(ctx, t, 1020, 120);
      if (shot.variant === 'balcony') {
        skyline(ctx, 560, '#141a33', 3, { windows: 0.35, minH: 80, varH: 220 });
        ctx.fillStyle = '#1d3a32'; ctx.fillRect(0, 600, W, 120);
        ctx.strokeStyle = '#2f5a4c'; ctx.lineWidth = 8; for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 600); ctx.lineTo(x, 720); ctx.stroke(); }
        ctx.fillRect(0, 590, W, 14); plant(ctx, 120, 600, 1.4, rng(4), true); plant(ctx, 1150, 600, 1.2, rng(9), false);
        return;
      }
      const hz = 480; skyline(ctx, hz, '#1a2140', 21, { windows: 0.3, minH: 120, varH: 200 });
      wetStreet(ctx, t, hz, ['#232a44', '#10131f']); reflections(ctx, hz, 'rgba(255,214,140,0.25)');
      [200, 640, 1080].forEach((x) => lamp(ctx, x, hz + 30, 320, 'rgba(255,214,140,0.45)', t));
    },
    'old-building'(ctx, t, shot) {
      const v = shot.variant;
      sky(ctx, v === 'night' ? SKIES.night : v === 'farewell' ? SKIES.gold : SKIES.day);
      if (v === 'night') moonStars(ctx, t, 220, 110); else clouds(ctx, t, 31, 4, '#ffffff', v === 'farewell' ? '#e8c39a' : '#c6d8e8', 80, 260, 0.7, 1.3);
      hills(ctx, 600, 60, v === 'night' ? '#1b2a33' : '#7fb06a', 4);
      skyline(ctx, 640, v === 'night' ? '#1e2638' : '#a7b6c4', 8, { minH: 40, varH: 120, windows: v === 'night' ? 0.3 : 0 });
      if (v === 'face') { ctx.save(); ctx.translate(W / 2, 680); ctx.scale(1.5, 1.5); oldBuilding(ctx, t, 0, 0, { face: true }); ctx.restore(); }
      else oldBuilding(ctx, t, W / 2, 680, { night: v === 'night', face: v === 'night' || v === 'farewell', sleepy: v === 'night', smile: v === 'farewell', chai: v === 'farewell' });
      ctx.fillStyle = v === 'night' ? '#141a20' : '#8d8a7e'; ctx.fillRect(0, 676, W, 50);
      if (v !== 'night' && v !== 'face') { for (let i = 0; i < 6; i++) { const px = (hash(i) * W + t * 30 * (hash(i + 2) + 0.5)) % W; drawBird(ctx, px, 120 + hash(i + 8) * 120, t + i); } }
    },
    rooftop(ctx, t, shot) {
      const v = shot.variant; const k = { sunset: SKIES.sunset, dusk: SKIES.dusk, dawn: SKIES.dawn }[v] || SKIES.day;
      sky(ctx, k); clouds(ctx, t, 41, 4, v ? '#ffe6cf' : '#ffffff', v ? '#c98d8d' : '#c6d8e8', 60, 260, 0.6, 1.2);
      skyline(ctx, 600, v === 'dusk' ? '#3b3555' : v ? '#8b6f7d' : '#9fb3c2', 12, { minH: 30, varH: 140, windows: v === 'dusk' ? 0.25 : 0 });
      ctx.fillStyle = '#b6a48d'; ctx.fillRect(0, 600, W, 120); ctx.fillStyle = '#9c8a74'; ctx.fillRect(0, 600, W, 16);
      const R = rng(55);
      [90, 230, 980, 1130].forEach((x, i) => plant(ctx, x, 660, 1.3, R, i % 2 === 0));
      sunflower(ctx, 1060, 640, 200, t); sunflower(ctx, 160, 640, 170, t + 1);
    },
    'wall-chai'(ctx, t) {
      bricks(ctx, 0, 0, W, H, '#a5503e', 'rgba(70,30,20,0.35)');
      const R = rng(9); for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(30,10,5,${R() * 0.15})`; ctx.fillRect(R() * W, R() * H, R() * 120, R() * 40); }
      const pulse = 1 + Math.sin(t * 2.4) * 0.02; chai(ctx, W * 0.6, H * 0.4, 190 * pulse, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, H - 90, W, 90);
    },
    'city-fog'(ctx, t, shot) {
      sky(ctx, shot.variant === 'deep' ? SKIES.grey : ['#7aa3c9', '#c5d6e0', '#e8e6e0']);
      skyline(ctx, 500, '#6d7c8c', 61, { minH: 120, varH: 260, windows: 0.2, winColor: 'rgba(255,220,160,0.6)' });
      shopFronts(ctx, t, 520, false);
      ctx.fillStyle = vgrad(ctx, 520, H, ['#6b6e74', '#45484e']); ctx.fillRect(0, 520, W, 200);
      if (shot.variant === 'burst') { ['#e3402d', '#f6c42b', '#4caf50', '#3f8fd6'].forEach((c, i) => { for (let k = 0; k < 4; k++) circle(ctx, 200 + i * 260 + k * 30, 540 + Math.sin(k + i) * 40, 16, c); }); }
    },
    kitchen(ctx, t) {
      interiorWall(ctx, '#c9b79a', '#b39d7e', 520, '#7d6248');
      windowFrame(ctx, 860, 90, 320, 240, () => { ctx.fillStyle = vgrad(ctx, 90, 330, SKIES.night); ctx.fillRect(860, 90, 320, 240); skyline(ctx, 330, '#121833', 4, { windows: 0.35, minH: 30, varH: 120 }); });
      ctx.fillStyle = rgrad(ctx, 640, 120, 420, 'rgba(255,214,150,0.45)', 'rgba(0,0,0,0)'); ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(640, 0); ctx.lineTo(640, 90); ctx.stroke(); poly(ctx, [[600, 90], [680, 90], [700, 125], [580, 125]], '#2f5f4f'); circle(ctx, 640, 128, 10, '#fff2c0');
      rrect(ctx, 380, 520, 520, 26, 4, '#8a5a36'); ctx.fillStyle = '#6e4529'; ctx.fillRect(400, 546, 16, 170); ctx.fillRect(864, 546, 16, 170);
      ['#fff', '#f2f2f2', '#e9f0f6'].forEach((c, i) => { ctx.save(); ctx.translate(560 + i * 60, 508); ctx.rotate(-0.1 + i * 0.12); ctx.fillStyle = c; ctx.fillRect(-40, -6, 80, 10); ctx.restore(); });
    },
    bedroom(ctx, t) {
      interiorWall(ctx, '#a9b8c9', '#8d9db0', 540, '#6e5a48');
      windowFrame(ctx, 760, 100, 300, 260, () => { ctx.fillStyle = vgrad(ctx, 100, 360, SKIES.night); ctx.fillRect(760, 100, 300, 260); circle(ctx, 960, 170, 30, '#fbf4d6'); });
      rrect(ctx, 80, 430, 460, 120, 12, '#e7e2f1'); rrect(ctx, 80, 400, 120, 60, 20, '#fff');
      circle(ctx, 1120, 520, 40, '#c98a5a'); circle(ctx, 1095, 480, 18, '#c98a5a'); circle(ctx, 1145, 480, 18, '#c98a5a');
      for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(560 + i * 34, 640); ctx.rotate(hash(i) * 2); rrect(ctx, -22, -5, 44, 10, 3, ['#e3402d', '#f6c42b', '#4caf50', '#3f8fd6', '#a25ad1', '#ef8fb0', '#8b5a2b'][i]); ctx.restore(); }
    },
    construction(ctx, t, shot) {
      const night = shot.variant === 'night';
      sky(ctx, night ? SKIES.night : ['#a7b4bd', '#cfd4cf', '#e6dccb']);
      if (night) moonStars(ctx, t, 200, 100); else clouds(ctx, t, 71, 3, '#f2efe8', '#c1c3c0', 60, 180, 0.6, 1.0);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * 0.62, H); ctx.clip();
      oldBuilding(ctx, t, 420, 600, { night, chai: true, w: 520 }); ctx.restore();
      poly(ctx, [[W * 0.62, 600], [W * 0.62, 230], [W * 0.66, 300], [W * 0.64, 360], [W * 0.7, 420], [W * 0.68, 600]], night ? '#3d2626' : '#a5503e');
      for (let i = 0; i < 20; i++) ellipse(ctx, 700 + hash(i) * 400, 600 - hash(i + 4) * 40, 30 + hash(i + 2) * 40, 14, night ? '#2a2525' : '#8a7c6c');
      ctx.fillStyle = night ? '#202634' : '#9a8f80'; ctx.fillRect(0, 596, W, 130);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = night ? '#1f3d6b' : '#3a6fb0'; ctx.fillRect(i * 130, 560, 124, 100); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(i * 130, 568, 124, 6); }
    },
    'sky-ride'(ctx, t, shot) {
      sky(ctx, shot.variant === 'dawn' ? SKIES.dawn : SKIES.sunset);
      clouds(ctx, t * 4, 81, 5, '#ffe9d6', '#d79a95', 80, 420, 0.8, 1.6);
      ctx.fillStyle = vgrad(ctx, 480, H, ['#46405f', '#1d1b2c']); ctx.fillRect(0, 480, W, 240);
      for (let r = 0; r < 14; r++) { const yy = 490 + Math.pow(r / 14, 1.6) * 230; const sp = 6 + r * 2.5; for (let i = 0; i < 70; i++) { const xx = ((i * 37.3 + r * 11) % 1.0) * 0 + ((hash(i * 31 + r) * W * 1.4 - t * sp * 6) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2; if (hash(i + r * 100) < 0.6) ctx.fillStyle = `rgba(255,${190 + hash(i) * 50 | 0},120,${0.4 + r / 30})`, ctx.fillRect(xx, yy, 2 + r * 0.4, 2 + r * 0.3); } }
    },
    hospital(ctx, t, shot) {
      const morning = shot.variant === 'morning';
      interiorWall(ctx, morning ? '#eef3f1' : '#3a4a5c', morning ? '#d9e4e1' : '#2a3646', 600, morning ? '#c9d2cf' : '#232c38');
      windowFrame(ctx, 120, 80, 420, 360, () => { ctx.fillStyle = vgrad(ctx, 80, 440, morning ? SKIES.day : SKIES.night); ctx.fillRect(120, 80, 420, 360); if (morning) cloud(ctx, 330, 260, 0.6, t, '#fff', '#cfe0ea'); else { skyline(ctx, 440, '#141a33', 9, { windows: 0.3, minH: 40, varH: 160 }); circle(ctx, 450, 160, 26, '#fbf4d6'); } });
      if (morning) { ctx.fillStyle = 'rgba(255,240,200,0.25)'; poly(ctx, [[120, 80], [540, 80], [900, 720], [300, 720]], 'rgba(255,240,200,0.18)'); }
      ctx.fillStyle = '#b8c2c8'; ctx.fillRect(1050, 120, 6, 380); rrect(ctx, 1020, 140, 60, 90, 10, 'rgba(220,240,250,0.8)');
      rrect(ctx, 880, 220, 110, 80, 4, '#fff'); ctx.fillStyle = '#f6c42b'; circle(ctx, 920, 260, 18, '#f6c42b'); ctx.fillStyle = '#4caf50'; ctx.fillRect(900, 280, 70, 10);
      rrect(ctx, 600, 470, 50, 60, 8, '#d7cfc0'); ctx.strokeStyle = '#4b8a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(625, 470); ctx.lineTo(625, 410); ctx.stroke(); circle(ctx, 625, 400, 14, morning ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)');
    },
    cab(ctx, t) {
      sky(ctx, ['#151b2a', '#232a3c', '#2f3546']);
      skyline(ctx, 420, '#0f1422', 5, { windows: 0.2, minH: 60, varH: 200 });
      for (let i = 0; i < 70; i++) { const yy = (hash(i) * H + t * 120 * (0.5 + hash(i + 1))) % H; ctx.strokeStyle = 'rgba(200,215,235,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hash(i + 7) * W, yy); ctx.lineTo(hash(i + 7) * W - 2, yy + 14); ctx.stroke(); }
      ctx.fillStyle = '#242424'; ctx.fillRect(0, 0, W, 40); ctx.fillRect(0, 0, 60, H); ctx.fillRect(W - 60, 0, 60, H);
      ctx.fillStyle = vgrad(ctx, 540, H, ['#3a3530', '#1c1a18']); ctx.fillRect(0, 540, W, 180);
      ctx.fillStyle = rgrad(ctx, 640, 600, 500, 'rgba(255,190,110,0.35)', 'rgba(0,0,0,0)'); ctx.fillRect(0, 0, W, H);
      circle(ctx, 1000, 600, 60, '#111'); circle(ctx, 1000, 600, 46, '#2a2a2a');
    },
    stairwell(ctx, t, shot) {
      interiorWall(ctx, '#7f978c', '#5f7a70', H, '#000');
      ctx.fillStyle = '#c9cec9'; ctx.fillRect(0, 380, W, 20);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#8d918d' : '#a3a8a3'; ctx.fillRect(0, 400 + i * 28, W, 28); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 400 + i * 28, W, 4); }
      ctx.strokeStyle = '#3f4a46'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 360); ctx.lineTo(W, 300); ctx.stroke();
      for (let x = 40; x < W; x += 90) { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, 360 - x * 0.047); ctx.lineTo(x, 400); ctx.stroke(); }
      rrect(ctx, 1060, 80, 140, 56, 6, '#1f7a3e'); ctx.fillStyle = '#d8ffe4'; ctx.font = `bold 26px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('出口 EXIT', 1130, 118);
      ctx.fillStyle = rgrad(ctx, 640, 0, 600, 'rgba(230,255,240,0.25)', 'rgba(0,0,0,0)'); ctx.fillRect(0, 0, W, H);
    },
    spring(ctx, t) {
      sky(ctx, SKIES.day); clouds(ctx, t, 91, 4, '#fff', '#cfe0ea', 60, 220, 0.6, 1.2);
      hills(ctx, 560, 60, '#9cc98a', 2);
      const bx = 640, by = 600; rrect(ctx, bx - 260, by - 420, 520, 420, 4, '#f3ede2');
      for (let f = 0; f < 6; f++) for (let c = 0; c < 5; c++) { rrect(ctx, bx - 230 + c * 96, by - 400 + f * 64, 70, 40, 3, '#9cc4dc'); rrect(ctx, bx - 236 + c * 96, by - 360 + f * 64, 82, 10, 2, '#f6c42b'); }
      ctx.fillStyle = '#7fbf5a'; ctx.fillRect(0, 600, W, 120);
      [140, 1140].forEach((x) => { ctx.fillStyle = '#6b4a34'; ctx.fillRect(x - 10, 400, 20, 220); for (let i = 0; i < 26; i++) circle(ctx, x + (hash(i + x) - 0.5) * 220, 380 + (hash(i * 3 + x) - 0.5) * 160, 30, i % 3 ? '#f7c6d4' : '#fbe2ea'); });
      const R = rng(3); for (let i = 0; i < 60; i++) circle(ctx, R() * W, 610 + R() * 100, 4, ['#f6c42b', '#fff', '#ef8fb0'][i % 3]);
    },
    'crack-flower'(ctx, t) {
      ctx.fillStyle = vgrad(ctx, 0, H, ['#c9c4bb', '#a9a49a']); ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, i * 170 + 40); ctx.lineTo(W, i * 170 + 10); ctx.stroke(); }
      ctx.strokeStyle = '#4c463e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(560, H); ctx.lineTo(650, 560); ctx.lineTo(620, 470); ctx.lineTo(720, 330); ctx.lineTo(700, 200); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.ellipse(980, 560, 220, 70, 0, 0, TAU); ctx.clip(); ctx.fillStyle = vgrad(ctx, 490, 630, SKIES.day); ctx.fillRect(760, 490, 440, 140); cloud(ctx, 1000, 590, 0.45, t, '#fff', '#cfe0ea'); ctx.restore();
      const sw = Math.sin(t * 1.4) * 6;
      ctx.strokeStyle = '#4b8a3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(640, 520); ctx.quadraticCurveTo(650, 430, 660 + sw, 360); ctx.stroke();
      [-1, 1].forEach(d => ellipse(ctx, 640 + d * 40, 510, 50, 12, '#5aa846', d * 0.5));
      for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; ellipse(ctx, 660 + sw + Math.cos(a) * 30, 360 + Math.sin(a) * 30, 22, 8, '#f6c21c', a); }
      circle(ctx, 660 + sw, 360, 18, '#e8a812');
      drawXuxu(ctx, t, 720 + sw, 330, 14);
    },
  };
  function drawBird(ctx, x, y, t) { ctx.strokeStyle = '#3b3b3b'; ctx.lineWidth = 2.5; const f = Math.sin(t * 8) * 6; ctx.beginPath(); ctx.moveTo(x - 12, y - f); ctx.quadraticCurveTo(x - 6, y - 6, x, y); ctx.quadraticCurveTo(x + 6, y - 6, x + 12, y - f); ctx.stroke(); }

  // ---------- effects (stateless, time-driven) ----------
  const FX = {
    rain(ctx, t, p, n = 260, a = 0.45) {
      ctx.strokeStyle = `rgba(210,225,240,${a})`; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < n; i++) { const sp = 900 + hash(i) * 500, x = hash(i + 1) * (W + 200) - 100, y = ((hash(i + 2) * H + t * sp) % (H + 60)) - 30; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22); }
      ctx.stroke();
    },
    'rain-light'(ctx, t, p) { FX.rain(ctx, t, p, 110, 0.3); },
    seeds(ctx, t, p, n = 34) {
      for (let i = 0; i < n; i++) {
        const sp = 18 + hash(i) * 30, x = ((hash(i + 5) * W + t * sp * 1.4 + Math.sin(t * 0.7 + i) * 30) % (W + 80)) - 40, y = ((hash(i + 9) * H - t * sp) % H + H) % H, r = 4 + hash(i + 3) * 5;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI - Math.PI; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + r * 1.6); ctx.stroke(); circle(ctx, x, y + r * 1.6, 1.4, '#9b7b4a');
      }
    },
    'seeds-many'(ctx, t, p) { FX.seeds(ctx, t, p, 120); },
    glow(ctx, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const x = hash(i) * W + Math.sin(t * 0.5 + i) * 30, y = hash(i + 50) * H + Math.cos(t * 0.4 + i) * 20, r = 6 + hash(i + 2) * 14, a = 0.2 + 0.2 * Math.sin(t * 2 + i); ctx.fillStyle = rgrad(ctx, x, y, r, `rgba(255,240,200,${a})`, 'rgba(255,240,200,0)'); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } ctx.restore(); },
    fireflies(ctx, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 30; i++) { const x = hash(i) * W + Math.sin(t * 0.6 + i * 2) * 40, y = H * 0.4 + hash(i + 7) * H * 0.55 + Math.cos(t * 0.8 + i) * 25, a = Math.max(0, Math.sin(t * 1.7 + i * 1.3)); ctx.fillStyle = rgrad(ctx, x, y, 14, `rgba(220,255,140,${a * 0.8})`, 'rgba(220,255,140,0)'); ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill(); } ctx.restore(); },
    'dust-gold'(ctx, t) { for (let i = 0; i < 70; i++) { const x = (hash(i) * W + t * 6) % W, y = (hash(i + 3) * H + Math.sin(t * 0.5 + i) * 20), a = 0.25 + 0.25 * Math.sin(t + i); circle(ctx, x, y, 1.2 + hash(i + 1) * 1.8, `rgba(255,235,180,${a})`); } },
    dust(ctx, t) { for (let i = 0; i < 18; i++) { const x = (hash(i) * W + t * 25 * (hash(i + 1) + 0.3)) % (W + 300) - 150, y = H * 0.65 + hash(i + 2) * H * 0.3, r = 80 + hash(i + 3) * 120; ctx.fillStyle = rgrad(ctx, x, y, r, 'rgba(170,150,120,0.35)', 'rgba(170,150,120,0)'); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } },
    fog(ctx, t, p, a = 0.42) { for (let i = 0; i < 22; i++) { const x = ((hash(i) * W - t * 18 * (0.5 + hash(i + 1))) % (W + 600) + W + 600) % (W + 600) - 300, y = hash(i + 2) * H, r = 180 + hash(i + 3) * 220; ctx.fillStyle = rgrad(ctx, x, y, r, `rgba(140,142,148,${a})`, 'rgba(140,142,148,0)'); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } },
    'fog-light'(ctx, t, p) { FX.fog(ctx, t, p, 0.22); },
    petals(ctx, t) { for (let i = 0; i < 40; i++) { const x = ((hash(i) * W + t * 40 + Math.sin(t + i) * 40) % (W + 40)) - 20, y = (hash(i + 4) * H + t * (30 + hash(i) * 30)) % H; ellipse(ctx, x, y, 6, 3.5, i % 2 ? '#f7c6d4' : '#fbe2ea', t * 2 + i); } },
    wind(ctx, t) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { const y = hash(i) * H, x = ((t * 600 + hash(i + 1) * W * 2) % (W * 2)) - W * 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 80, y - 20, x + 160, y + 20, x + 260, y); ctx.stroke(); } },
    burst(ctx, t, p) { const k = clamp(p * 1.6, 0, 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgrad(ctx, W * 0.45, H * 0.55, 50 + k * W, `rgba(255,220,120,${0.35 * (1 - k * 0.6)})`, 'rgba(255,220,120,0)'); ctx.fillRect(0, 0, W, H); ctx.restore(); for (let i = 0; i < 40; i++) { const a = hash(i) * TAU, d = k * (200 + hash(i + 1) * 500); circle(ctx, W * 0.45 + Math.cos(a) * d, H * 0.55 + Math.sin(a) * d * 0.6, 4 + hash(i + 2) * 6, ['#e3402d', '#f6c42b', '#4caf50', '#3f8fd6', '#ef8fb0'][i % 5]); } },
  };

  // ---------- frame composition ----------
  const sceneCanvas = document.createElement('canvas'); sceneCanvas.width = W; sceneCanvas.height = H;
  const sctx = sceneCanvas.getContext('2d');
  const plates = {}; // id -> HTMLImageElement (GPT plates)

  function renderShot(ctx, shot, t) {
    const p = clamp(t / shot.dur, 0, 1); const e = ease(p);
    const cam = shot.cam || [1, 1.04, 0, 0];
    const z = lerp(cam[0], cam[1], e); const px = cam[2] * e * W, py = cam[3] * e * H;
    let sx = 0, sy = 0;
    const fx = shot.fx || [];
    if (fx.includes('shake')) { sx = Math.sin(t * 43) * 6 * (1 - p); sy = Math.cos(t * 37) * 5 * (1 - p); }
    if (fx.includes('shake-soft')) { sx = Math.sin(t * 31) * 1.6; sy = Math.cos(t * 27) * 1.2; }
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, W, H);
    sctx.setTransform(z, 0, 0, z, W / 2 - (W / 2) * z + px + sx, H / 2 - (H / 2) * z + py + sy);
    const img = plates[shot.id];
    if (img) {
      const s = Math.max(W / img.width, H / img.height); const iw = img.width * s, ih = img.height * s;
      sctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
    } else {
      (BG[shot.bg] || BG.title)(sctx, t, shot);
      (shot.chars || []).forEach((c) => drawChar(sctx, t, c, p));
    }
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = shot.gray ? lerp(shot.gray[0], shot.gray[1], ease(clamp((p - 0.1) / 0.7, 0, 1))) : 0;
    ctx.filter = g > 0.01 ? `grayscale(${g}) brightness(${1 - g * 0.12})` : 'none';
    ctx.drawImage(sceneCanvas, 0, 0); ctx.filter = 'none';
    fx.forEach((f) => FX[f] && FX[f](ctx, t, p));
    // vignette
    ctx.fillStyle = rgrad(ctx, W / 2, H / 2, W * 0.72, 'rgba(0,0,0,0)', 'rgba(20,10,0,0.38)'); ctx.fillRect(0, 0, W, H);
    if (shot.title) drawTitle(ctx, shot, t, p);
  }

  function drawTitle(ctx, shot, t, p) {
    const a = clamp(t / 1.0, 0, 1) * clamp((shot.dur - t) / 0.8, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7a5a3a'; ctx.font = `500 34px ${FONT}`; ctx.fillText(shot.title, W / 2, H / 2 - 70);
    ctx.fillStyle = '#3d2c1e'; ctx.font = `700 76px ${FONT}`; ctx.fillText(shot.subtitle || '', W / 2, H / 2 + 10);
    ctx.strokeStyle = 'rgba(122,90,58,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 160 * a, H / 2 + 80); ctx.lineTo(W / 2 + 160 * a, H / 2 + 80); ctx.stroke();
    ctx.fillStyle = '#7a5a3a'; ctx.font = `400 22px ${FONT}`; ctx.fillText('小芽与风的种子', W / 2, H / 2 + 115);
    ctx.restore();
  }

  const SPEAKER_COLORS = { '小芽': '#ffd34d', '絮絮': '#ffffff', '妈妈': '#f5c9a6', '外婆': '#b8c8ff', '老楼': '#ffb38a', '灰先生': '#b4b7bd', '铁犀牛': '#f2c14e', '司机叔叔': '#ff9a5a', '旁白': '#e9e2d0' };
  function wrap(ctx, text, maxW) { const lines = []; let cur = ''; for (const ch of text) { if (ctx.measureText(cur + ch).width > maxW && cur && !'，。！？、…」』）—'.includes(ch)) { lines.push(cur); cur = ch; } else cur += ch; } if (cur) lines.push(cur); return lines; }
  function drawSubtitle(ctx, shot, t) {
    if (!shot.line) return;
    const reveal = clamp((t - 0.5) * 14, 0, shot.line.length); if (reveal <= 0) return;
    const out = clamp((shot.dur - t) / 0.4, 0, 1);
    const txt = shot.line.slice(0, Math.floor(reveal));
    ctx.save(); ctx.globalAlpha = out; ctx.font = `500 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const lines = wrap(ctx, shot.line, 1040); const shown = wrap(ctx, txt, 1040);
    const baseY = H - 46 - (lines.length - 1) * 46;
    ctx.fillStyle = vgrad(ctx, H - 220, H, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']); ctx.fillRect(0, H - 220, W, 220);
    if (shot.who) { ctx.font = `600 22px ${FONT}`; ctx.fillStyle = SPEAKER_COLORS[shot.who] || '#fff'; ctx.fillText(shot.who === '旁白' ? '— 旁白 —' : shot.who, W / 2, baseY - 46); }
    ctx.font = `500 34px ${FONT}`; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.fillStyle = '#fffaf0';
    shown.forEach((l, i) => ctx.fillText(l, W / 2 - (ctx.measureText(lines[i] || l).width - ctx.measureText(l).width) / 2, baseY + i * 46));
    ctx.restore();
  }

  // ---------- episode timeline ----------
  const XF = 0.8; // crossfade seconds
  const bufA = document.createElement('canvas'); bufA.width = W; bufA.height = H; const actx = bufA.getContext('2d');
  const bufB = document.createElement('canvas'); bufB.width = W; bufB.height = H; const bctx = bufB.getContext('2d');
  function epDuration(ep) { return ep.shots.reduce((a, s) => a + s.dur, 0); }
  function locate(ep, T) { let acc = 0; for (let i = 0; i < ep.shots.length; i++) { const d = ep.shots[i].dur; if (T < acc + d || i === ep.shots.length - 1) return { i, t: T - acc, start: acc }; acc += d; } }
  function renderEpisode(ctx, ep, T) {
    T = clamp(T, 0, epDuration(ep) - 1e-3);
    const { i, t } = locate(ep, T); const shot = ep.shots[i];
    renderShot(actx, shot, t);
    if (i > 0 && t < XF) {
      const prev = ep.shots[i - 1]; renderShot(bctx, prev, prev.dur + t);
      ctx.globalAlpha = 1; ctx.drawImage(bufB, 0, 0); ctx.globalAlpha = ease(t / XF); ctx.drawImage(bufA, 0, 0); ctx.globalAlpha = 1;
    } else ctx.drawImage(bufA, 0, 0);
    if (i === 0 && t < 0.6) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.6})`; ctx.fillRect(0, 0, W, H); }
    const end = epDuration(ep) - T; if (end < 0.8) { ctx.fillStyle = `rgba(0,0,0,${1 - end / 0.8})`; ctx.fillRect(0, 0, W, H); }
    drawSubtitle(ctx, shot, t);
    return { i, t };
  }

  // ---------- GPT plates ----------
  function loadPlates(base = 'assets/') {
    return fetch(base + 'manifest.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((m) => {
      const ids = Object.keys(m.plates || {});
      return Promise.all(ids.map((id) => new Promise((res) => { const im = new Image(); im.onload = () => { plates[id] = im; res(); }; im.onerror = res; im.src = base + m.plates[id]; }))).then(() => ids.filter((id) => plates[id]).length);
    });
  }

  // ---------- procedural score (WebAudio, works live and offline) ----------
  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const WARM = [[60, 64, 67, 72, 76], [57, 60, 64, 69, 72], [53, 57, 60, 65, 69], [55, 59, 62, 67, 71]]; // C Am F G
  const SAD = [[57, 60, 64, 69], [53, 57, 60, 65], [52, 55, 59, 64], [57, 60, 64, 69]];               // Am F Em Am
  function scheduleScore(ac, dest, ep, from, startAt) {
    const master = ac.createGain(); master.gain.value = 0.55; master.connect(dest);
    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = hash(i) * 2 - 1;
    let acc = 0; const nodes = [];
    ep.shots.forEach((shot, si) => {
      const s0 = acc, s1 = acc + shot.dur; acc = s1; if (s1 <= from) return;
      const fx = shot.fx || []; const sad = (shot.gray && Math.max(...shot.gray) > 0.45 && shot.gray[1] > 0.3) || fx.includes('fog');
      const prog = sad ? SAD : WARM; const step = sad ? 0.6 : 0.42;
      for (let tt = s0; tt < s1; tt += step) {
        if (tt < from) continue; const k = Math.floor((tt - s0) / 2) % 4; const chord = prog[k];
        const idx = Math.floor(hash(Math.floor(tt * 10) + si * 999) * chord.length); if (hash(Math.floor(tt * 7) + 5) < 0.18) continue;
        const when = startAt + (tt - from); const o = ac.createOscillator(); const g = ac.createGain();
        o.type = 'sine'; o.frequency.value = NOTE(chord[idx] + 12); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.13, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, when + 1.6);
        o.connect(g); g.connect(master); o.start(when); o.stop(when + 1.7); nodes.push(o);
        if ((tt - s0) % 2 < step) { const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'triangle'; b.frequency.value = NOTE(chord[0] - 12); bg.gain.setValueAtTime(0, when); bg.gain.linearRampToValueAtTime(0.08, when + 0.2); bg.gain.exponentialRampToValueAtTime(0.001, when + 2.2); b.connect(bg); bg.connect(master); b.start(when); b.stop(when + 2.3); nodes.push(b); }
      }
      if (fx.includes('rain') || fx.includes('rain-light') || fx.includes('fog') || fx.includes('wind')) {
        const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = ac.createBiquadFilter(); f.type = fx.includes('fog') ? 'lowpass' : 'bandpass'; f.frequency.value = fx.includes('fog') ? 400 : 2500; const g = ac.createGain();
        const a = Math.max(s0, from), when = startAt + (a - from), dur = s1 - a; const vol = fx.includes('rain') ? 0.12 : 0.06;
        g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + 0.5); g.gain.setValueAtTime(vol, when + Math.max(0.5, dur - 0.5)); g.gain.linearRampToValueAtTime(0, when + dur);
        src.connect(f); f.connect(g); g.connect(master); src.start(when); src.stop(when + dur); nodes.push(src);
      }
    });
    return { stop() { nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); master.disconnect(); } };
  }
  async function renderEpisodeAudioWav(ep) {
    const sr = 44100, dur = epDuration(ep) + 1; const oac = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
    scheduleScore(oac, oac.destination, ep, 0, 0); const buf = await oac.startRendering();
    const n = buf.length, out = new DataView(new ArrayBuffer(44 + n * 4)); const ws = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    ws(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, n * 4, true);
    const L = buf.getChannelData(0), R = buf.getChannelData(1); for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, clamp(L[i], -1, 1) * 32767, true); out.setInt16(46 + i * 4, clamp(R[i], -1, 1) * 32767, true); }
    let bin = ''; const bytes = new Uint8Array(out.buffer); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin);
  }

  window.DL = { W, H, renderEpisode, epDuration, locate, loadPlates, plates, scheduleScore, renderEpisodeAudioWav };
})();
