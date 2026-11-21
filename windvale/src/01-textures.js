/* =====================  procedural textures (canvas)  ===================== */
function canvas(w, h = w) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return { cv, ctx: cv.getContext('2d', { willReadFrequently: true }) }; }
function toTex(cv, { srgb = true, repeat = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso; t.needsUpdate = true; return t;
}
function tnoiseXY(x, y, px, py) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = fade(xf), v = fade(yf);
  const wx = (i) => ((i % px) + px) % px, wy = (i) => ((i % py) + py) % py;
  const a = hash2(wx(xi), wy(yi)), b = hash2(wx(xi + 1), wy(yi)), c = hash2(wx(xi), wy(yi + 1)), d = hash2(wx(xi + 1), wy(yi + 1));
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
/* per-pixel pass: fn(x, y, out[4]) writes rgba 0..255 */
function pixelPass(ctx, w, h, fn, keep = false) {
  const img = keep ? ctx.getImageData(0, 0, w, h) : ctx.createImageData(w, h); const d = img.data; const o = [0, 0, 0, 255];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; o[0] = d[i]; o[1] = d[i + 1]; o[2] = d[i + 2]; o[3] = keep ? d[i + 3] : 255;
    fn(x, y, o); d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = o[3];
  }
  ctx.putImageData(img, 0, 0);
}
/* draw something that wraps around a tile of size S */
function wrapDraw(S, x, y, w, h, fn) {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
    if (x + ox + w < 0 || x + ox - w > S || y + oy + h < 0 || y + oy - h > S) continue;
    fn(x + ox, y + oy);
  }
}
function rgb(r, g, b, a = 1) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }

const TEX = {};

function texPlaster() {
  const S = 512; const { cv, ctx } = canvas(S); const b = canvas(S);
  pixelPass(ctx, S, S, (x, y, o) => {
    const u = x / S, v = y / S;
    const n1 = tfbm(u * 6, v * 6, 6, 5);
    const n2 = tnoise(u * 96, v * 96, 96);
    const stain = smooth(0.56, 0.78, tfbm(u * 3 + 5, v * 3 + 2, 3, 4));
    const streak = Math.pow(tnoiseXY(u * 70, v * 3, 70, 3), 3) * smooth(0.3, 0.7, tfbm(u * 4, v * 2 + 9, 4, 3));
    let l = 0.95 + (n1 - 0.5) * 0.16 + (n2 - 0.5) * 0.05 - streak * 0.10;
    const r = 244 * l - stain * 18, g = 238 * l - stain * 22, bl = 226 * l - stain * 34;
    o[0] = r; o[1] = g; o[2] = bl;
  });
  // fine cracks
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(90,75,60,0.14)';
  for (let k = 0; k < 3; k++) { let x = R(0, S), y = R(0, S); ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 14; s++) { x += R(-6, 6); y += R(2, 9); ctx.lineTo(x, y); } ctx.stroke(); }
  // bump
  b.ctx.drawImage(cv, 0, 0);
  pixelPass(b.ctx, S, S, (x, y, o) => { const l = (o[0] + o[1] + o[2]) / 3; const g = 128 + (l - 225) * 1.2 + (tnoise(x / S * 128, y / S * 128, 128) - 0.5) * 40; o[0] = o[1] = o[2] = g; }, true);
  TEX.plaster = toTex(cv); TEX.plasterBump = toTex(b.cv, { srgb: false });
}

function texStone() {
  const S = 512; const { cv, ctx } = canvas(S); const b = canvas(S);
  ctx.fillStyle = rgb(186, 176, 158); ctx.fillRect(0, 0, S, S);
  b.ctx.fillStyle = '#2a2a2a'; b.ctx.fillRect(0, 0, S, S);
  const rows = []; let y = 0; while (y < S) { const h = R(30, 58); rows.push([y, h]); y += h; }
  const sc = S / y; rows.forEach((r) => { r[0] *= sc; r[1] *= sc; });
  for (const [ry, rh] of rows) {
    let x = R(0, 60); const x0 = x;
    while (x < x0 + S) {
      const w = R(rh * 1.0, rh * 2.6); const g = R(2.5, 4.5);
      const tone = R(); let col;
      if (tone < 0.55) col = [R(214, 232), R(202, 218), R(178, 194)];
      else if (tone < 0.8) col = [R(222, 238), R(196, 210), R(160, 176)];
      else col = [R(198, 212), R(194, 206), R(186, 198)];
      const sx = x + g, sy = ry + g, sw = w - g * 2, sh = rh - g * 2;
      wrapDraw(S, sx, sy, sw, sh, (px, py) => {
        const path = new Path2D(); const j = () => R(-2.5, 2.5); const rr = Math.min(sw, sh) * 0.28;
        path.moveTo(px + rr + j(), py + j()); path.lineTo(px + sw - rr + j(), py + j());
        path.quadraticCurveTo(px + sw + j(), py + j(), px + sw + j(), py + rr + j());
        path.lineTo(px + sw + j(), py + sh - rr + j()); path.quadraticCurveTo(px + sw + j(), py + sh + j(), px + sw - rr + j(), py + sh + j());
        path.lineTo(px + rr + j(), py + sh + j()); path.quadraticCurveTo(px + j(), py + sh + j(), px + j(), py + sh - rr + j());
        path.lineTo(px + j(), py + rr + j()); path.quadraticCurveTo(px + j(), py + j(), px + rr + j(), py + j());
        ctx.fillStyle = rgb(...col); ctx.fill(path);
        const gr = ctx.createLinearGradient(px, py, px + sw * 0.3, py + sh);
        gr.addColorStop(0, 'rgba(255,250,235,0.14)'); gr.addColorStop(1, 'rgba(60,45,30,0.12)');
        ctx.fillStyle = gr; ctx.fill(path);
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(90,72,54,0.16)'; ctx.stroke(path);
        b.ctx.fillStyle = `rgb(${R(170, 220) | 0},${0},${0})`; b.ctx.filter = 'blur(2px)'; b.ctx.fill(path); b.ctx.filter = 'none';
      });
      x += w;
    }
  }
  pixelPass(ctx, S, S, (x, y, o) => {
    const u = x / S, v = y / S; const n = tfbm(u * 32, v * 32, 32, 3) - 0.5; const big = tfbm(u * 4, v * 4, 4, 3) - 0.5;
    const lich = smooth(0.74, 0.8, tnoise(u * 40 + 3, v * 40, 40));
    o[0] = o[0] * (1 + n * 0.16 + big * 0.08) + lich * 10; o[1] = o[1] * (1 + n * 0.16 + big * 0.07) + lich * 14; o[2] = o[2] * (1 + n * 0.17 + big * 0.06) + lich * 2;
  }, true);
  pixelPass(b.ctx, S, S, (x, y, o) => { const n = tnoise(x / S * 64, y / S * 64, 64); const g = o[0] * 0.85 + n * 40; o[0] = o[1] = o[2] = g; }, true);
  TEX.stone = toTex(cv); TEX.stoneBump = toTex(b.cv, { srgb: false });
}

function texTrim() {
  const S = 256; const { cv, ctx } = canvas(S);
  pixelPass(ctx, S, S, (x, y, o) => { const u = x / S, v = y / S; const n = tfbm(u * 8, v * 8, 8, 4), f = tnoise(u * 64, v * 64, 64);
    const l = 0.9 + (n - 0.5) * 0.2 + (f - 0.5) * 0.08; o[0] = 236 * l; o[1] = 226 * l; o[2] = 206 * l; });
  TEX.trim = toTex(cv);
}

/* clay roof tiles: texture covers 2m x 2m, 8 courses (0.25 m each), 10 tiles per course */
const ROOF_TEX_M = 2.0, ROOF_ROWS = 8;
function texRoof() {
  const S = 512, rows = ROOF_ROWS, rh = S / rows, cols = 10, tw = S / cols;
  const { cv, ctx } = canvas(S); const b = canvas(S);
  ctx.fillStyle = rgb(70, 50, 40); ctx.fillRect(0, 0, S, S); b.ctx.fillStyle = '#000'; b.ctx.fillRect(0, 0, S, S);
  for (let r = rows - 1; r >= -1; r--) {
    const y0 = r * rh; const off = (r & 1) ? tw / 2 : 0;
    for (let c = -1; c <= cols; c++) {
      const x0 = c * tw + off + R(-1.5, 1.5);
      const t = R(); const base = t < 0.6 ? [R(222, 240), R(205, 222), R(190, 205)] : t < 0.85 ? [R(200, 218), R(180, 196), R(168, 182)] : [R(236, 248), R(212, 226), R(184, 198)];
      const draw = (c2, isB) => {
        const path = new Path2D(); const w = tw - 2.2, h = rh * 1.18, x = x0 + 1.1, y = y0 + R(-1, 1);
        path.moveTo(x, y); path.lineTo(x + w, y); path.lineTo(x + w, y + h - w * 0.45);
        path.quadraticCurveTo(x + w, y + h, x + w / 2, y + h); path.quadraticCurveTo(x, y + h, x, y + h - w * 0.45); path.closePath();
        if (!isB) {
          c2.save(); c2.translate(0, 4); c2.filter = 'blur(3px)'; c2.fillStyle = 'rgba(30,18,10,0.55)'; c2.fill(path); c2.restore();
          c2.fillStyle = rgb(...base); c2.fill(path);
          const g = c2.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(40,25,15,0.35)'); g.addColorStop(0.35, 'rgba(0,0,0,0)'); g.addColorStop(0.92, 'rgba(255,245,230,0.12)'); g.addColorStop(1, 'rgba(60,35,20,0.25)');
          c2.fillStyle = g; c2.fill(path);
          const g2 = c2.createLinearGradient(x, 0, x + w, 0); g2.addColorStop(0, 'rgba(0,0,0,0.12)'); g2.addColorStop(0.4, 'rgba(255,255,255,0.06)'); g2.addColorStop(1, 'rgba(0,0,0,0.16)');
          c2.fillStyle = g2; c2.fill(path);
        } else {
          c2.save(); c2.translate(0, 4); c2.filter = 'blur(3px)'; c2.fillStyle = '#000'; c2.fill(path); c2.restore();
          const g = c2.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#303030'); g.addColorStop(1, '#e0e0e0'); c2.fillStyle = g; c2.fill(path);
        }
      };
      wrapDraw(S, x0, y0, tw, rh * 1.3, (px, py) => { ctx.save(); ctx.translate(px - x0, py - y0); draw(ctx, false); ctx.restore(); b.ctx.save(); b.ctx.translate(px - x0, py - y0); draw(b.ctx, true); b.ctx.restore(); });
    }
  }
  pixelPass(ctx, S, S, (x, y, o) => { const u = x / S, v = y / S; const n = tnoise(u * 80, v * 80, 80) - 0.5, m = tfbm(u * 5, v * 5, 5, 4);
    const moss = smooth(0.62, 0.72, m) * 0.6;
    o[0] = lerp(o[0] * (1 + n * 0.18), 150, moss); o[1] = lerp(o[1] * (1 + n * 0.18), 165, moss); o[2] = lerp(o[2] * (1 + n * 0.2), 95, moss); }, true);
  TEX.roof = toTex(cv); TEX.roofBump = toTex(b.cv, { srgb: false });
}

function texSlate() {
  const S = 512, rows = ROOF_ROWS, rh = S / rows, cols = 12, tw = S / cols;
  const { cv, ctx } = canvas(S); const b = canvas(S);
  ctx.fillStyle = rgb(50, 52, 58); ctx.fillRect(0, 0, S, S); b.ctx.fillStyle = '#000'; b.ctx.fillRect(0, 0, S, S);
  for (let r = rows - 1; r >= -1; r--) {
    const y0 = r * rh, off = (r & 1) ? tw / 2 : 0;
    for (let c = -1; c <= cols; c++) {
      const x0 = c * tw + off; const l = R(0.8, 1.05);
      wrapDraw(S, x0, y0, tw, rh * 1.2, (px, py) => {
        const w = tw - 2, h = rh * 1.12, x = px + 1, y = py;
        ctx.fillStyle = 'rgba(15,15,25,0.6)'; ctx.fillRect(x, y + 3, w, h);
        ctx.fillStyle = rgb(220 * l, 222 * l, 228 * l); ctx.beginPath(); ctx.roundRect(x, y, w, h, [0, 0, 5, 5]); ctx.fill();
        const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(0.4, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,255,255,0.08)'); ctx.fillStyle = g; ctx.fill();
        const gb = b.ctx.createLinearGradient(0, y, 0, y + h); gb.addColorStop(0, '#202020'); gb.addColorStop(1, '#d0d0d0'); b.ctx.fillStyle = gb; b.ctx.fillRect(x, y, w, h);
      });
    }
  }
  pixelPass(ctx, S, S, (x, y, o) => { const n = tnoise(x / S * 90, y / S * 90, 90) - 0.5; const lich = smooth(0.8, 0.86, tnoise(x / S * 30, y / S * 30, 30));
    o[0] = o[0] * (1 + n * 0.15) + lich * 40; o[1] = o[1] * (1 + n * 0.15) + lich * 42; o[2] = o[2] * (1 + n * 0.15) + lich * 10; }, true);
  TEX.slate = toTex(cv); TEX.slateBump = toTex(b.cv, { srgb: false });
}

/* painted wood planks (neutral, tinted per part) — covers 1.2 m */
function texWood() {
  const S = 256; const { cv, ctx } = canvas(S); const planks = 8;
  pixelPass(ctx, S, S, (x, y, o) => {
    const u = x / S, v = y / S; const p = Math.floor(u * planks); const pu = u * planks - p;
    const grain = tnoiseXY(u * 64 + p * 7.3, v * 4, 64, 4); const fine = tnoiseXY(u * 128, v * 16, 128, 16);
    const gap = smooth(0.0, 0.05, pu) * smooth(1.0, 0.95, pu);
    const pl = 0.9 + hash2(p, 3) * 0.12;
    const l = pl * (0.9 + grain * 0.14 + fine * 0.05) * (0.45 + 0.55 * gap);
    o[0] = 232 * l; o[1] = 226 * l; o[2] = 214 * l;
  });
  TEX.wood = toTex(cv);
}

/* cobblestone street: 1024 px covers 3.2 m.  Voronoi setts with dirt & moss in the joints */
const COBBLE_M = 3.2;
function texCobble() {
  const S = 1024, nx = 17, ny = 21; const cw = S / nx, ch = S / ny;
  const pts = []; const cols = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const rowOff = (j & 1) ? 0.5 : 0;
    pts.push([(i + rowOff + R(-0.28, 0.28)) * cw, (j + 0.5 + R(-0.22, 0.22)) * ch]);
    const t = R(); let c;
    if (t < 0.45) c = [R(176, 196), R(162, 176), R(138, 152)];
    else if (t < 0.7) c = [R(192, 210), R(168, 182), R(132, 146)];
    else if (t < 0.88) c = [R(160, 174), R(142, 154), R(122, 134)];
    else c = [R(166, 176), R(150, 160), R(140, 150)];
    cols.push([...c, R(0.85, 1.15)]);
  }
  const { cv, ctx } = canvas(S); const b = canvas(S);
  const img = ctx.createImageData(S, S), bi = b.ctx.createImageData(S, S); const d = img.data, bd = bi.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
    let d1 = 1e9, d2 = 1e9, id = 0;
    for (let oj = -2; oj <= 2; oj++) for (let oi = -2; oi <= 2; oi++) {
      const ii = ((ci + oi) % nx + nx) % nx, jj = ((cj + oj) % ny + ny) % ny;
      const p = pts[jj * nx + ii];
      let px = p[0] + Math.floor((ci + oi) / nx) * S, py = p[1] + Math.floor((cj + oj) / ny) * S;
      // aspect: setts slightly elongated across the street
      const dx = (x - px) * 0.85, dy = (y - py) * 1.0; const dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < d1) { d2 = d1; d1 = dd; id = jj * nx + ii; } else if (dd < d2) d2 = dd;
    }
    const edge = d2 - d1; const u = x / S, v = y / S;
    const gapW = 3.2 + tnoise(u * 20, v * 20, 20) * 3.0;
    const stoneMask = smooth(gapW, gapW + 2.5, edge);
    const dome = Math.sqrt(clamp((edge - gapW) / 18, 0, 1));
    const c = cols[id]; const n = tnoise(u * 160, v * 160, 160) - 0.5, n2 = tfbm(u * 12, v * 12, 12, 3) - 0.5;
    const sh = (0.78 + dome * 0.28) * c[3] * (1 + n * 0.16 + n2 * 0.1);
    const moss = smooth(0.5, 0.68, tfbm(u * 6 + 1.3, v * 6, 6, 4));
    let gr = 82 + n * 30, gg = 70 + n * 26, gb = 56 + n * 20;
    gr = lerp(gr, 86, moss); gg = lerp(gg, 104, moss); gb = lerp(gb, 46, moss);
    // a little moss creeping onto stone edges
    const edgeMoss = moss * (1 - smooth(gapW, gapW + 6, edge)) * 0.7;
    let sr = c[0] * sh, sg = c[1] * sh, sb = c[2] * sh;
    sr = lerp(sr, 120, edgeMoss); sg = lerp(sg, 130, edgeMoss); sb = lerp(sb, 70, edgeMoss);
    const i4 = (y * S + x) * 4;
    d[i4] = lerp(gr, sr, stoneMask); d[i4 + 1] = lerp(gg, sg, stoneMask); d[i4 + 2] = lerp(gb, sb, stoneMask); d[i4 + 3] = 255;
    const h = stoneMask * (100 + dome * 140) + n * 20;
    bd[i4] = bd[i4 + 1] = bd[i4 + 2] = h; bd[i4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); b.ctx.putImageData(bi, 0, 0);
  TEX.cobble = toTex(cv, { aniso: 16 }); TEX.cobbleBump = toTex(b.cv, { srgb: false, aniso: 16 });
}

/* flagstones for the riverside terrace: covers 4 m */
const FLAG_M = 4.0;
function texFlag() {
  const S = 512; const { cv, ctx } = canvas(S); const b = canvas(S);
  ctx.fillStyle = rgb(110, 100, 80); ctx.fillRect(0, 0, S, S); b.ctx.fillStyle = '#202020'; b.ctx.fillRect(0, 0, S, S);
  const rows = []; let y = 0; while (y < S) { const h = R(56, 96); rows.push([y, h]); y += h; } const sc = S / y; rows.forEach((r) => { r[0] *= sc; r[1] *= sc; });
  for (const [ry, rh] of rows) { let x = R(0, 80); const x0 = x;
    while (x < x0 + S) { const w = R(60, 150); const l = R(0.86, 1.06); const warm = R(-8, 8);
      wrapDraw(S, x + 2, ry + 2, w - 4, rh - 4, (px, py) => {
        ctx.fillStyle = rgb(200 * l + warm, 186 * l, 160 * l - warm); ctx.beginPath(); ctx.roundRect(px, py, w - 4, rh - 4, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(70,55,40,0.25)'; ctx.lineWidth = 2; ctx.stroke();
        b.ctx.fillStyle = rgb(200, 200, 200); b.ctx.filter = 'blur(1.5px)'; b.ctx.beginPath(); b.ctx.roundRect(px, py, w - 4, rh - 4, 4); b.ctx.fill(); b.ctx.filter = 'none';
      }); x += w; } }
  pixelPass(ctx, S, S, (x, y, o) => { const u = x / S, v = y / S; const n = tnoise(u * 100, v * 100, 100) - 0.5, m = tfbm(u * 8, v * 8, 8, 4) - 0.5;
    const isGap = o[0] < 140; const moss = isGap ? smooth(0.45, 0.6, tfbm(u * 10 + 4, v * 10, 10, 3)) : 0;
    o[0] = lerp(o[0] * (1 + n * 0.12 + m * 0.14), 92, moss); o[1] = lerp(o[1] * (1 + n * 0.12 + m * 0.12), 112, moss); o[2] = lerp(o[2] * (1 + n * 0.12 + m * 0.1), 52, moss); }, true);
  pixelPass(b.ctx, S, S, (x, y, o) => { const n = tnoise(x / S * 128, y / S * 128, 128); o[0] = o[1] = o[2] = o[0] * 0.8 + n * 50; }, true);
  TEX.flag = toTex(cv, { aniso: 16 }); TEX.flagBump = toTex(b.cv, { srgb: false });
}

/* ground detail: covers 6 m, near-neutral so vertex colours carry the hue */
function texGround() {
  const S = 512; const { cv, ctx } = canvas(S);
  pixelPass(ctx, S, S, (x, y, o) => { const u = x / S, v = y / S;
    const a = tfbm(u * 8, v * 8, 8, 4), f = tnoise(u * 128, v * 128, 128), g = tnoise(u * 48, v * 48, 48);
    const l = 0.82 + (a - 0.5) * 0.28 + (f - 0.5) * 0.16 + (g - 0.5) * 0.12;
    const warm = (tfbm(u * 4 + 7, v * 4, 4, 3) - 0.5) * 30;
    o[0] = 225 * l + warm; o[1] = 230 * l; o[2] = 210 * l - warm * 0.5; });
  // brush dabs
  for (let i = 0; i < 2600; i++) { const x = R(0, S), y = R(0, S), l = R(0.75, 1.15);
    ctx.fillStyle = rgb(220 * l, 232 * l, 200 * l, 0.25); ctx.save(); ctx.translate(x, y); ctx.rotate(R(-0.5, 0.5)); ctx.fillRect(-1, -4, 2, 8); ctx.restore(); }
  TEX.ground = toTex(cv, { aniso: 16 });
}

function texBark() {
  const W = 256, H = 512; const { cv, ctx } = canvas(W, H);
  pixelPass(ctx, W, H, (x, y, o) => { const u = x / W, v = y / H;
    const fis = tnoiseXY(u * 18, v * 3, 18, 3), fis2 = tnoiseXY(u * 40, v * 6, 40, 6), n = tnoise(u * 64, v * 128, 64);
    const crack = smooth(0.38, 0.22, fis * 0.7 + fis2 * 0.3);
    const moss = smooth(0.55, 0.75, tnoiseXY(u * 6, v * 4, 6, 4));
    const l = (0.85 + n * 0.25) * (1 - crack * 0.55);
    o[0] = lerp(150, 118, moss) * l; o[1] = lerp(132, 128, moss) * l; o[2] = lerp(112, 82, moss) * l; });
  TEX.bark = toTex(cv);
}

/* alpha leaf cluster: used as foliage cards */
function leafCluster({ size = 256, count = 120, len = [14, 24], wid = [6, 11], shape = 'leaf', spread = 0.46, cols, seedN = 1 } = {}) {
  const { cv, ctx } = canvas(size); const old = rand; seed(seedN);
  const leaves = [];
  for (let i = 0; i < count; i++) {
    const a = R(0, TAU), r = Math.pow(R(), 0.6) * size * spread;
    leaves.push({ x: size / 2 + Math.cos(a) * r, y: size / 2 + Math.sin(a) * r * 0.92, rot: a + R(-0.9, 0.9) + Math.PI / 2, l: R(...len), w: R(...wid), depth: r / (size * spread) + R(-0.3, 0.3) });
  }
  leaves.sort((a, b) => b.depth - a.depth);
  for (const L of leaves) {
    ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rot);
    const c = cols ? pick(cols) : [R(150, 205), R(190, 230), R(110, 150)];
    const sh = 0.72 + (1 - clamp(L.depth, 0, 1)) * 0.0 + R(0, 0.35);
    ctx.fillStyle = rgb(c[0] * sh, c[1] * sh, c[2] * sh);
    ctx.beginPath();
    if (shape === 'ivy') {
      const s = L.l * 0.5; ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.5, -s * 0.6, s * 0.9, -s * 0.3); ctx.quadraticCurveTo(s * 0.55, 0, s * 0.8, s * 0.45);
      ctx.quadraticCurveTo(s * 0.2, s * 0.35, 0, s * 0.8); ctx.quadraticCurveTo(-s * 0.2, s * 0.35, -s * 0.8, s * 0.45); ctx.quadraticCurveTo(-s * 0.55, 0, -s * 0.9, -s * 0.3);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.6, 0, -s);
    } else if (shape === 'blade') {
      ctx.moveTo(-L.w * 0.5, L.l * 0.5); ctx.quadraticCurveTo(0, -L.l * 0.2, R(-3, 3), -L.l * 0.5); ctx.quadraticCurveTo(0, -L.l * 0.2, L.w * 0.5, L.l * 0.5);
    } else {
      ctx.moveTo(0, -L.l * 0.5); ctx.quadraticCurveTo(L.w * 0.62, -L.l * 0.1, 0, L.l * 0.5); ctx.quadraticCurveTo(-L.w * 0.62, -L.l * 0.1, 0, -L.l * 0.5);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,230,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -L.l * 0.4); ctx.lineTo(0, L.l * 0.4); ctx.stroke();
    ctx.restore();
  }
  rand = old;
  return cv;
}
/* leaf card for big trees: a soft solid core so canopies read as masses, leafy silhouette at the edges */
function leafMass(seedN) {
  const S = 512; const { cv, ctx } = canvas(S); const old = rand; seed(seedN);
  ctx.fillStyle = rgb(122, 164, 92);
  for (let i = 0; i < 9; i++) { const a = R(0, TAU), r = R(0, S * 0.14); ctx.beginPath(); ctx.arc(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, R(S * 0.12, S * 0.2), 0, TAU); ctx.fill(); }
  const leaves = [];
  for (let i = 0; i < 190; i++) { const a = R(0, TAU), r = Math.pow(R(), 0.55) * S * 0.43; leaves.push({ x: S / 2 + Math.cos(a) * r, y: S / 2 + Math.sin(a) * r, rot: a + Math.PI / 2 + R(-0.8, 0.8), l: R(40, 66), w: R(18, 28), d: r }); }
  leaves.sort((a, b) => b.d - a.d);
  for (const L of leaves) {
    ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rot);
    const sh = R(0.78, 1.12); const c = pick([[176, 212, 118], [154, 196, 104], [194, 220, 130], [138, 180, 98], [206, 226, 150]]);
    ctx.fillStyle = rgb(c[0] * sh, c[1] * sh, c[2] * sh);
    ctx.beginPath(); ctx.moveTo(0, -L.l * 0.5); ctx.quadraticCurveTo(L.w * 0.65, -L.l * 0.1, 0, L.l * 0.5); ctx.quadraticCurveTo(-L.w * 0.65, -L.l * 0.1, 0, -L.l * 0.5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,225,0.16)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -L.l * 0.42); ctx.lineTo(0, L.l * 0.42); ctx.stroke();
    ctx.restore();
  }
  rand = old; return cv;
}

function texFoliage() {
  TEX.leaves = toTex(leafMass(3));
  TEX.leavesDark = toTex(leafCluster({ size: 256, count: 160, len: [10, 18], wid: [4, 8], spread: 0.46, seedN: 5,
    cols: [[120, 160, 110], [100, 140, 96], [140, 172, 118]] }));
  TEX.ivy = toTex(leafCluster({ size: 256, count: 46, len: [26, 44], wid: [10, 14], shape: 'ivy', spread: 0.4, seedN: 9,
    cols: [[150, 190, 110], [120, 166, 92], [170, 204, 120], [104, 150, 86]] }));
  // grass blades: tall tuft anchored at bottom
  const S = 256; const { cv, ctx } = canvas(S);
  for (let i = 0; i < 70; i++) {
    const bx = S / 2 + R(-70, 70), h = R(100, 240), lean = R(-60, 60), w = R(4, 9); const l = R(0.7, 1.15);
    const g = ctx.createLinearGradient(0, S, 0, S - h); g.addColorStop(0, rgb(90 * l, 120 * l, 60 * l)); g.addColorStop(1, rgb(200 * l, 225 * l, 140 * l));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - w / 2, S); ctx.quadraticCurveTo(bx + lean * 0.3, S - h * 0.6, bx + lean, S - h);
    ctx.quadraticCurveTo(bx + lean * 0.3 + w * 0.3, S - h * 0.6, bx + w / 2, S); ctx.fill();
  }
  TEX.grass = toTex(cv, { repeat: false });
}

function texAwning() {
  const W = 512, H = 256; const { cv, ctx } = canvas(W, H); const sw = W / 14;
  for (let i = 0; i < 14; i++) { ctx.fillStyle = (i & 1) ? rgb(244, 232, 206) : rgb(178, 52, 40); ctx.fillRect(i * sw, 0, sw + 1, H); }
  pixelPass(ctx, W, H, (x, y, o) => { const w = ((x & 1) ^ (y & 1)) ? 0.96 : 1.02; const n = tnoise(x / W * 32, y / H * 16, 32) - 0.5;
    o[0] *= w * (1 + n * 0.08); o[1] *= w * (1 + n * 0.08); o[2] *= w * (1 + n * 0.08); }, true);
  TEX.awning = toTex(cv); TEX.awning.wrapT = THREE.ClampToEdgeWrapping;
}

function texGlass() {
  const W = 256, H = 256; const { cv, ctx } = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(46, 42, 40)); g.addColorStop(1, rgb(70, 58, 48)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // warm back wall / furniture hints
  ctx.fillStyle = 'rgba(150,110,70,0.35)'; ctx.fillRect(W * 0.3, H * 0.62, W * 0.4, H * 0.38);
  ctx.fillStyle = 'rgba(200,170,120,0.18)'; ctx.fillRect(W * 0.38, H * 0.18, W * 0.22, H * 0.24);
  // lace curtains
  for (const side of [0, 1]) {
    const x0 = side ? W * 0.68 : 0, x1 = side ? W : W * 0.32;
    for (let x = x0; x < x1; x++) { const f = 0.5 + 0.5 * Math.sin(x * 0.45); ctx.fillStyle = `rgba(250,244,230,${0.55 + f * 0.3})`; ctx.fillRect(x, 0, 1, H); }
  }
  ctx.fillStyle = 'rgba(250,244,230,0.85)'; for (let x = 0; x < W; x += 2) { const h = 26 + 8 * Math.sin(x * 0.3); ctx.fillRect(x, 0, 2, h); }
  TEX.glass = toTex(cv, { repeat: false });
}

function texSign() {
  const W = 512, H = 320; const { cv, ctx } = canvas(W, H);
  ctx.fillStyle = rgb(58, 44, 32); ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W / 2 - 4, H / 2 - 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgb(240, 226, 190); ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W / 2 - 18, H / 2 - 18, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgb(176, 64, 44); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W / 2 - 32, H / 2 - 32, 0, 0, TAU); ctx.stroke();
  // bread icon: round loaf + baguette
  ctx.save(); ctx.translate(W / 2, H * 0.36);
  ctx.fillStyle = rgb(196, 128, 60); ctx.beginPath(); ctx.ellipse(-36, 6, 46, 30, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgb(240, 200, 140); ctx.lineWidth = 4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-56 + i * 18, -8); ctx.lineTo(-40 + i * 18, 18); ctx.stroke(); }
  ctx.rotate(-0.35); ctx.fillStyle = rgb(210, 150, 74); ctx.beginPath(); ctx.ellipse(40, 10, 70, 15, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-5 + i * 26, 4); ctx.lineTo(10 + i * 26, 16); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = rgb(70, 50, 36); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'italic 600 50px Georgia, "Times New Roman", serif'; ctx.fillText('Boulangerie', W / 2, H * 0.66);
  ctx.font = '600 22px "Noto Serif SC","Songti SC",serif'; ctx.fillStyle = rgb(176, 64, 44); ctx.fillText('风 眠 面 包 房', W / 2, H * 0.82);
  TEX.sign = toTex(cv, { repeat: false });
}

function texFascia() {
  const W = 1024, H = 128; const { cv, ctx } = canvas(W, H);
  ctx.fillStyle = rgb(44, 78, 62); ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = rgb(206, 170, 96); ctx.lineWidth = 4; ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.fillStyle = rgb(226, 190, 110); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 66px Georgia, "Times New Roman", serif'; ctx.fillText('B O U L A N G E R I E', W / 2, H / 2 + 4);
  pixelPass(ctx, W, H, (x, y, o) => { const n = tnoise(x / 14, y / 14, 999) - 0.5; o[0] *= 1 + n * 0.12; o[1] *= 1 + n * 0.12; o[2] *= 1 + n * 0.12; }, true);
  TEX.fascia = toTex(cv, { repeat: false });
}

function texChalk() {
  const W = 256, H = 360; const { cv, ctx } = canvas(W, H);
  ctx.fillStyle = rgb(44, 54, 48); ctx.fillRect(0, 0, W, H);
  pixelPass(ctx, W, H, (x, y, o) => { const n = tnoise(x / 10, y / 10, 999) - 0.5; o[0] += n * 16; o[1] += n * 16; o[2] += n * 16; }, true);
  ctx.fillStyle = 'rgba(240,236,220,0.92)'; ctx.textAlign = 'center';
  ctx.font = '600 34px "Noto Serif SC","Songti SC",serif'; ctx.fillText('今日出炉', W / 2, 62);
  ctx.font = 'italic 22px Georgia, serif'; ctx.fillText('~ pain frais ~', W / 2, 98);
  ctx.textAlign = 'left'; ctx.font = '22px "Noto Serif SC","Songti SC",serif';
  ['长棍面包', '黄油可颂', '乡村圆包', '苹果挞'].forEach((t, i) => { ctx.fillText(t, 26, 150 + i * 44); ctx.fillText('·', 196, 150 + i * 44); });
  ctx.strokeStyle = 'rgba(240,236,220,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, 116); ctx.lineTo(216, 116); ctx.stroke();
  ctx.fillStyle = 'rgba(232,150,140,0.9)'; ctx.beginPath(); ctx.arc(W / 2, 330, 10, 0, TAU); ctx.fill();
  TEX.chalk = toTex(cv, { repeat: false });
}

/* painterly cumulus: lit from the right (sun side), cool shaded bellies */
function cloudTex(seedN, W = 512, H = 256) {
  const { cv, ctx } = canvas(W, H); const old = rand; seed(seedN);
  const base = H * 0.8; const puffs = [];
  const n = RI(10, 15);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); const hump = Math.pow(Math.sin(t * Math.PI), 0.8);
    const r = (H * 0.12 + hump * H * 0.2) * R(0.8, 1.15); const x = W * (0.1 + 0.8 * t) + R(-12, 12);
    puffs.push({ x, y: base - r * R(0.55, 0.85), r });
    if (hump > 0.4) puffs.push({ x: x + R(-24, 24), y: base - r * 1.25 - hump * H * 0.1, r: r * R(0.6, 0.85) });
    if (hump > 0.75 && R() < 0.6) puffs.push({ x: x + R(-16, 16), y: base - r * 1.9 - hump * H * 0.12, r: r * R(0.45, 0.6) });
  }
  // shadowed body
  ctx.filter = 'blur(1px)';
  for (const p of puffs) { const g = ctx.createRadialGradient(p.x, p.y + p.r * 0.2, p.r * 0.2, p.x, p.y, p.r);
    g.addColorStop(0, 'rgba(206,214,230,1)'); g.addColorStop(0.85, 'rgba(190,201,222,1)'); g.addColorStop(1, 'rgba(190,201,222,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
  // sunlit caps (light from the upper left)
  for (const p of puffs) { const g = ctx.createRadialGradient(p.x - p.r * 0.32, p.y - p.r * 0.45, p.r * 0.05, p.x - p.r * 0.1, p.y - p.r * 0.2, p.r * 0.95);
    g.addColorStop(0, 'rgba(255,253,247,1)'); g.addColorStop(0.6, 'rgba(250,248,244,0.92)'); g.addColorStop(1, 'rgba(240,242,246,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x - p.r * 0.1, p.y - p.r * 0.2, p.r * 0.88, 0, TAU); ctx.fill(); }
  ctx.filter = 'none';
  // soft flat base
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(0, base - 14, 0, base + 10); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g; ctx.fillRect(0, base - 14, W, H);
  ctx.globalCompositeOperation = 'source-over';
  rand = old;
  return toTex(cv, { repeat: false });
}

function texPuff() {
  const S = 128; const { cv, ctx } = canvas(S);
  pixelPass(ctx, S, S, (x, y, o) => { const dx = x / S - 0.5, dy = y / S - 0.5; const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const n = tfbm(x / S * 6, y / S * 6, 6, 4); const a = clamp(1 - r * (0.85 + n * 0.5), 0, 1);
    o[0] = 255; o[1] = 255; o[2] = 255; o[3] = 255 * a * a; });
  TEX.puff = toTex(cv, { repeat: false });
}

function texWing() {
  const S = 128; const { cv, ctx } = canvas(S);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(4, 64); ctx.bezierCurveTo(20, 4, 110, -6, 120, 40); ctx.bezierCurveTo(124, 60, 90, 66, 70, 66);
  ctx.bezierCurveTo(100, 80, 100, 120, 70, 122); ctx.bezierCurveTo(40, 124, 14, 90, 4, 64); ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,30,0.85)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = 'rgba(60,40,30,0.8)'; ctx.beginPath(); ctx.arc(92, 32, 7, 0, TAU); ctx.fill();
  TEX.wing = toTex(cv, { repeat: false });
}

function texRock() {
  // faceted rock: large Voronoi plates with dark cracks, soft strata and lichen
  const S = 512, n = 7; const { cv, ctx } = canvas(S); const pts = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + R(0.1, 0.9)) * S / n, (j + R(0.1, 0.9)) * S / n, R(0.82, 1.12)]);
  const img = ctx.createImageData(S, S); const d = img.data; const cw = S / n;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const ci = Math.floor(x / cw), cj = Math.floor(y / cw); let d1 = 1e9, d2 = 1e9, id = 0;
    for (let oj = -1; oj <= 1; oj++) for (let oi = -1; oi <= 1; oi++) {
      const ii = ((ci + oi) % n + n) % n, jj = ((cj + oj) % n + n) % n; const p = pts[jj * n + ii];
      const px = p[0] + Math.floor((ci + oi) / n) * S, py = p[1] + Math.floor((cj + oj) / n) * S; const dd = Math.hypot(x - px, (y - py) * 1.4);
      if (dd < d1) { d2 = d1; d1 = dd; id = jj * n + ii; } else if (dd < d2) d2 = dd;
    }
    const u = x / S, v = y / S; const e = d2 - d1;
    const crack = 1 - smooth(1.5, 6, e) * 0.55 - smooth(6, 0, e) * 0.0;
    const nn = tfbm(u * 12, v * 12, 12, 4), fine = tnoise(u * 90, v * 90, 90);
    const strata = 0.94 + 0.06 * Math.sin(v * TAU * 9 + nn * 4);
    const shade = (0.72 + 0.34 * nn + 0.08 * (fine - 0.5)) * strata * pts[id][2] * (1 - smooth(4, 0, e) * 0.45);
    const lich = smooth(0.62, 0.76, tfbm(u * 5 + 2, v * 5, 5, 3));
    const i4 = (y * S + x) * 4;
    d[i4] = lerp(196, 170, lich) * shade; d[i4 + 1] = lerp(186, 182, lich) * shade; d[i4 + 2] = lerp(168, 128, lich) * shade; d[i4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  TEX.rock = toTex(cv);
}

function texWicker() {
  const S = 128; const { cv, ctx } = canvas(S);
  pixelPass(ctx, S, S, (x, y, o) => { const a = Math.sin(x / S * TAU * 12) * 0.5 + 0.5, b = Math.sin(y / S * TAU * 10 + ((Math.floor(x / S * 12) & 1) ? Math.PI : 0)) * 0.5 + 0.5;
    const l = 0.6 + 0.4 * (a * 0.5 + b * 0.5); o[0] = 214 * l; o[1] = 170 * l; o[2] = 110 * l; });
  TEX.wicker = toTex(cv);
}

function texCheck() {
  const S = 128; const { cv, ctx } = canvas(S); ctx.fillStyle = rgb(246, 240, 228); ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(190,60,50,0.55)'; for (let i = 0; i < S; i += 32) { ctx.fillRect(i, 0, 14, S); ctx.fillRect(0, i, S, 14); }
  TEX.check = toTex(cv);
  const s2 = canvas(S); s2.ctx.fillStyle = rgb(246, 240, 228); s2.ctx.fillRect(0, 0, S, S); s2.ctx.fillStyle = rgb(80, 120, 170);
  for (let i = 0; i < S; i += 24) s2.ctx.fillRect(0, i, S, 8);
  TEX.stripe = toTex(s2.cv);
}

async function buildTextures() {
  texPlaster(); texStone(); texTrim(); await stage(12, '正在调和灰泥与石色……');
  texRoof(); texSlate(); texWood(); await stage(20, '正在烧制屋瓦……');
  texCobble(); texFlag(); await stage(30, '正在铺石板路……');
  texGround(); texBark(); texFoliage(); texAwning(); texGlass(); texSign(); texChalk(); texFascia(); texPuff(); texWing(); texRock(); texWicker(); texCheck();
  TEX.clouds = [cloudTex(11), cloudTex(23), cloudTex(37), cloudTex(41, 512, 200)];
  await stage(38, '正在缝遮阳棚……');
}
