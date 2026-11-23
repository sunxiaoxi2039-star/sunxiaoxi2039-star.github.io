/* 小芽与风的种子 · swatch.js — two of the three test swatches of "wind over a grassy hill".
 *   B: a gouache background. The grass is not drawn blade by blade: it is massed into clumps of
 *      flat colour (shadow blue-green, mid yellow-green, a lit top), and only along lit edges are a
 *      few blades picked out. The wind shows as light and dark waves rolling through the masses.
 *   C: the same background, with Xiaoya drawn as a cel character (clean line, one hard shadow,
 *      no brush texture), standing knee-deep in the grass.
 * Also builds the painted sky that the 3D swatch (A) uses as its backdrop.
 */
(function () {
  'use strict';
  const W = 1280, H = 720, TAU = Math.PI * 2, { clamp } = P;
  const css = P.css, rgb = P.rgb, mix = (a, b, t) => P.mix(a, b, clamp(t, 0, 1));

  // ------------------------------------------------------------------ the wind: gusts roll left → right
  const GUST = 210;
  function gust(x, y, t) {
    const k = (x - t * GUST) / 190 + P.noise(x / 340, y / 120) * 2.4 + y / 230;
    return Math.max(0, Math.sin(k)) ** 2;
  }
  const wind = (x, y, t) => 0.25 + 0.1 * Math.sin(t * 1.4 + x / 380) + gust(x, y, t) * 0.55 + (P.noise(x / 70 + t * 0.9, y / 60) - 0.5) * 0.12;

  // ------------------------------------------------------------------ painted once: sky, clouds, distance
  const crest = (x) => 452 - 46 * Math.exp(-((x - 820) ** 2) / (2 * 380 * 380)) + 16 * (P.noise(x / 230, 4.1) - 0.5) + (x < 260 ? (260 - x) * 0.12 : 0);
  let SKY = null;
  function buildSky() {
    const sky = P.canvas(W, H), s = sky.getContext('2d'), r = P.rng(5);
    // gouache sky: a smooth wash, deep at the top and pale toward the hills, gently mottled
    s.fillStyle = P.vg(s, 0, 470, ['#2a7bd2', '#3f8fdc', '#6aaee6', '#a9d4ee', '#cfe7f1']); s.fillRect(0, 0, W, H);
    for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * 440, rr = 40 + r() * 120; s.fillStyle = P.rg(s, x, y, 0, rr, [[0, `rgba(${r() < 0.5 ? '255,255,255' : '20,80,170'},0.035)`], [1, 'rgba(0,0,0,0)']]); s.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    const clouds = [
      { img: P.cumulus(31, 700, 400, 'day', { peak: 0.62 }), x: 520, y: 20, vx: 3 },
      { img: P.cumulus(32, 330, 180, 'day', { peak: 0.4 }), x: 40, y: 120, vx: 4 },
      { img: P.cumulus(33, 260, 130, 'day', { peak: 0.5 }), x: 1080, y: 170, vx: 5 },
    ];
    // distance: a blue range, then a nearer green ridge with woods, all softened by the air
    const far = P.canvas(W, H), f = far.getContext('2d'), RF = P.rng(9);
    const ridge = (yb, amp, sc, seed, top, bot) => { f.beginPath(); f.moveTo(0, H); for (let x = 0; x <= W; x += 4) f.lineTo(x, yb - amp * P.fbm(x / sc + seed, seed, 4)); f.lineTo(W, H); f.closePath(); f.fillStyle = P.vg(f, yb - amp, yb + 60, [top, bot]); f.fill(); };
    ridge(440, 70, 260, 3, '#8fb2d6', '#a9c9de');
    ridge(452, 40, 160, 7, '#76a88f', '#94c2a0');
    for (let x = 20; x < W; x += 60 + RF() * 90) { const y = 452 - 40 * P.fbm(x / 160 + 7, 7, 4) + 6; P.crown(f, x, y, 26 + RF() * 30, 16 + RF() * 10, ['#4d7d6e', '#5f9178', '#79aa84', '#9cc596', '#c7dfb0'], 70 + x, { n: 6 }); }
    f.fillStyle = P.vg(f, 380, 470, ['rgba(200,226,240,0)', 'rgba(200,226,240,0.5)']); f.fillRect(0, 360, W, 120);
    SKY = { sky, clouds, far };
  }

  // ------------------------------------------------------------------ the meadow as painted masses
  // colours: shadow (cool), mid, lit, and the pale "silver" the grass shows when a gust flattens it
  const DARK = rgb('#2f6a52'), DEEP = rgb('#24503f'), MID = rgb('#5f9f45'), LIT = rgb('#9fcc55'), TOP = rgb('#d3e88a'), SILVER = rgb('#e4f0b4');
  let CLUMPS = null;
  function buildClumps() {
    const r = P.rng(2024), out = [];
    // rows from the crest down to the bottom edge; clumps grow and space out as they come near
    for (let y = 0; ; ) {
      const yy = 402 + y; if (yy > H + 60) break;
      const near = clamp((yy - 430) / 290, 0, 1), size = 7 + near * near * 70, step = size * 0.55;
      for (let x = -60 + r() * step; x < W + 60; x += step * (0.7 + r() * 0.6)) {
        const cy = yy + (r() - 0.5) * step * 0.6; if (cy < crest(x) + 3) continue;
        const n = 4 + ((r() * 4) | 0), tips = [];
        for (let k = 0; k < n; k++) tips.push({ f: (k + 0.5) / n + (r() - 0.5) * 0.12, h: 0.55 + r() * 0.6, w: 0.08 + r() * 0.08, ph: r() * TAU });
        out.push({ x, y: cy, s: size * (0.75 + r() * 0.5), near, tips, tone: r(), fl: r() < 0.05 + near * 0.04 ? ((r() * 2) | 0) + 1 : 0, seed: (r() * 1e6) | 0 });
      }
      y += Math.max(3, (7 + near * near * 70) * 0.32);
    }
    out.sort((a, b) => a.y - b.y); CLUMPS = out;
  }
  // a clump's outline: pointed leaf tips leaning with the wind, a flat-ish base
  function clumpPath(ctx, c, lean, sx = 1, sy = 1, ox = 0, oy = 0) {
    const s = c.s, wd = s * 1.1, x0 = c.x - wd / 2;
    ctx.beginPath(); ctx.moveTo(x0 + ox, c.y + oy + s * 0.12);
    let px = x0, py = c.y;
    for (const tp of c.tips) {
      const bx = x0 + tp.f * wd, th = s * tp.h * sy, l = lean + Math.sin(tp.ph) * 0.12, tx = bx + Math.sin(l) * th * sx, ty = c.y - Math.cos(l) * th;
      const vx = bx - tp.w * wd * 0.9, vy = c.y - th * 0.28;                        // the valley between blades
      ctx.quadraticCurveTo((px + vx) / 2 + ox, Math.min(py, vy) + oy, vx + ox, vy + oy);
      ctx.quadraticCurveTo(vx + (tx - vx) * 0.35 + ox, vy - th * 0.45 + oy, tx + ox, ty + oy);   // up one side of a blade to its point
      const ex = bx + tp.w * wd * 0.9, ey = c.y - th * 0.3;
      ctx.quadraticCurveTo(ex + (tx - ex) * 0.2 + ox, ey - th * 0.35 + oy, ex + ox, ey + oy); // and down the other
      px = ex; py = ey;
    }
    ctx.quadraticCurveTo(x0 + wd + ox, c.y + oy, x0 + wd + ox, c.y + s * 0.12 + oy); ctx.closePath();
  }
  function drawClump(ctx, c, t) {
    const wv = wind(c.x, c.y, t), g = gust(c.x, c.y, t), lean = 0.12 + wv * 0.95;
    // wave of light: in a gust the mass turns pale; between gusts it sinks into its shadow colour
    const light = clamp(0.45 + c.tone * 0.25 + g * 0.55 - c.near * 0.2, 0, 1);
    const base = mix(mix(DEEP, DARK, 0.4 + c.tone * 0.6), MID, light * 0.6 - 0.1), mid = mix(MID, LIT, light), top = mix(LIT, mix(TOP, SILVER, g), light);
    // body in shadow colour, the lit mass nudged up-left, a lighter top on the lit tips
    ctx.fillStyle = css(base); clumpPath(ctx, c, lean); ctx.fill();
    ctx.fillStyle = css(mid); clumpPath(ctx, c, lean, 0.88, 0.86, -c.s * 0.1, -c.s * 0.04); ctx.fill();
    if (light > 0.35) { ctx.fillStyle = css(top, clamp((light - 0.35) * 1.6, 0, 1)); clumpPath(ctx, c, lean + 0.05, 0.7, 0.75, -c.s * 0.2, -c.s * 0.16); ctx.fill(); }
    // picked-out blades: a few thin strokes along lit edges, more of them where the gust is
    if (c.s > 9) {
      const r = P.rng(c.seed), nb = 1 + ((r() * 2) | 0) + (g > 0.4 ? 2 : 0);
      for (let k = 0; k < nb; k++) {
        const tp = c.tips[(r() * c.tips.length) | 0], bx = c.x - c.s * 0.55 + tp.f * c.s * 1.1 - c.s * 0.1, th = c.s * tp.h * (0.95 + r() * 0.35), l = lean + 0.1 + r() * 0.15;
        const pts = WIND.quad([bx, c.y - th * 0.15], [bx + Math.sin(l * 0.4) * th * 0.5, c.y - th * 0.6], [bx + Math.sin(l) * th, c.y - Math.cos(l) * th], 8);
        WIND.flick(ctx, pts, Math.max(1, c.s * 0.045), css(mix(TOP, SILVER, g), 0.85), (q) => (1 - q) ** 0.8 * Math.min(1, q * 5 + 0.3));
      }
    }
    if (c.fl) { const r = P.rng(c.seed + 3), n = 1 + ((r() * 3) | 0); for (let k = 0; k < n; k++) { const fx = c.x + (r() - 0.6) * c.s * 0.8 + Math.sin(lean) * c.s * 0.5, fy = c.y - c.s * (0.45 + r() * 0.4), rr = 1 + c.s * 0.035; ctx.fillStyle = c.fl === 1 ? '#fbfbf2' : '#f6dc58'; ctx.beginPath(); ctx.ellipse(fx, fy, rr * 1.4, rr, -0.3, 0, TAU); ctx.fill(); } }
  }

  // ------------------------------------------------------------------ one frame
  function render(ctx, t, o = {}) {
    if (!SKY) buildSky(); if (!CLUMPS) buildClumps();
    const tt = Math.floor(t * 12) / 12;                                            // on twos
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(SKY.sky, 0, 0);
    for (const c of SKY.clouds) ctx.drawImage(c.img, c.x + tt * c.vx, c.y);
    ctx.drawImage(SKY.far, 0, 0);
    // the meadow's underpaint: one dark-to-mid mass the clumps sit in
    ctx.beginPath(); ctx.moveTo(-10, H + 10); for (let x = -10; x <= W + 10; x += 6) ctx.lineTo(x, crest(x) + 4); ctx.lineTo(W + 10, H + 10); ctx.closePath();
    ctx.fillStyle = P.vg(ctx, 440, H, ['#7fb04c', '#4f8c46', '#2f6a4e']); ctx.fill();
    const girl = o.girl ? { x: 700, y: 628, u: 3.1 } : null;
    let gDone = !girl;
    for (const c of CLUMPS) {
      if (!gDone && c.y > girl.y - 2) { WIND.drawGirl(ctx, girl.x, girl.y, girl.u, tt, Math.floor(t * 12), 'cel'); gDone = true; }
      drawClump(ctx, c, tt);
    }
    if (!gDone) WIND.drawGirl(ctx, girl.x, girl.y, girl.u, tt, Math.floor(t * 12), 'cel');
    // a cloud's shadow sliding over the slope
    const cs = ((tt * 55) % (W + 1100)) - 600;
    P.soft(ctx, 18, (c) => { c.fillStyle = 'rgba(25,55,80,0.28)'; c.beginPath(); c.ellipse(cs, 640, 420, 70, -0.06, 0, TAU); c.fill(); });
    // dandelion seeds and a few petals carried along
    const r = P.rng(11);
    for (let i = 0; i < 26; i++) {
      const sp = 150 + r() * 140, x = ((r() * (W + 200) + tt * sp) % (W + 200)) - 100, y = 160 + r() * 420 + Math.sin(tt * 2 + i) * 18, k = 0.7 + r() * 1.1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(tt * 3 + i) * 0.6 + 0.5); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let j = 0; j < 9; j++) { const a = -Math.PI * (0.1 + (0.8 * j) / 8); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 6 * k, Math.sin(a) * 5 * k); } ctx.moveTo(0, 0); ctx.lineTo(0, 8 * k); ctx.stroke(); ctx.restore();
    }
    // finish: a faint warmth from the upper left and the grain of the paper
    ctx.fillStyle = P.rg(ctx, 140, -80, 0, 1100, [[0, 'rgba(255,238,200,0.16)'], [1, 'rgba(255,238,200,0)']]); ctx.fillRect(0, 0, W, H);
    P.tex(ctx, 'paper', 0.2, 'soft-light', [0, 0, W, H]);
    ctx.restore();
  }

  // the painted backdrop for the 3D swatch: sky, clouds and distance only
  function backdrop(t = 0, farDy = 0) { if (!SKY) buildSky(); const c = P.canvas(W, H), x = c.getContext('2d'); x.drawImage(SKY.sky, 0, 0); for (const cl of SKY.clouds) x.drawImage(cl.img, cl.x + t * cl.vx, cl.y + farDy * 0.5); x.drawImage(SKY.far, 0, farDy); return c; }

  window.SWATCH = { W, H, renderB: (ctx, t) => render(ctx, t), renderC: (ctx, t) => render(ctx, t, { girl: true }), backdrop, crest };
})();
