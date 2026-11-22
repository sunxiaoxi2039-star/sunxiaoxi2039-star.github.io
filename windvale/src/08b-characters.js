// 2D hand-drawn characters for Windvale: an ink + cel-colour drawing engine, a 3D pose skeleton
// used as the artist's construction layer, and the girl and her cat drawn on top of it.
// Everything is drawn with Canvas 2D from curves placed by hand; the 3D skeleton only places
// joints so the drawing stays consistent when the camera moves.
// Units: 1 = the girl's head height. y points down on the canvas.
const G2D = (() => {
  // ============================== ink engine ==============================
  const INK = { line: '#2e211c', paper: '#f7f2e8', mode: 'color', light: [-0.045, -0.03], minW: 0, partK: 1, noLines: false };
  const rnd = (s) => () => ((s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function spline(pts, closed = false, step = 0.012) {
    const n = pts.length, out = [];
    if (n < 2) return pts.slice();
    const get = (i) => closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p1 = get(i), p2 = get(i + 1);               // a point with a truthy 3rd value is a sharp corner
      const p0 = p1[2] ? p1 : get(i - 1), p3 = p2[2] ? p2 : get(i + 2);
      const segs = Math.max(3, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let s = 0; s < segs; s++) {
        const t = s / segs, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, e) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - e) * t2 + (-a + 3 * b - 3 * c + e) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function path(ctx, P) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }

  // tapered, slightly pressure-varying ink line (a dip pen, not a marker)
  function stroke(ctx, pts, w = 0.012, o = {}) {
    const { tin = 0.18, tout = 0.25, min = 0.2, wob = 0.07, seed = 7, closed = false, color = INK.line, lost = 0 } = o;
    if (INK.noLines) return;
    w = Math.max(w, INK.minW);
    const ll = Math.hypot(INK.light[0], INK.light[1]) || 1, sdx = -INK.light[0] / ll, sdy = -INK.light[1] / ll;   // toward the shadow side
    const P = spline(pts, closed); if (closed) P.push(P[0]);
    const n = P.length; if (n < 2) return;
    const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = L[n - 1] || 1, r = rnd(seed * 9973 + 1), ph = r() * 6.28, fr = 2 + r() * 3;
    let area = 0; if (lost) for (let i = 0; i < n - 1; i++) area += P[i][0] * P[i + 1][1] - P[i + 1][0] * P[i][1];
    const os = area > 0 ? -1 : 1;
    const lf = [], rt = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const t = L[i] / tot;
      let k = closed ? 1 : Math.min(min + (1 - min) * smooth(0, tin, t), min + (1 - min) * smooth(1, 1 - tout, t));
      k *= 1 + wob * Math.sin(t * fr * 6.28 + ph);
      if (lost) { const d = (-ty * sdx + tx * sdy) * os; k *= (1 - lost) + lost * Math.max(0, Math.min(1, 0.45 + 0.9 * d)); }
      const hw = w * k * 0.5;
      lf.push([P[i][0] - ty * hw, P[i][1] + tx * hw]); rt.push([P[i][0] + ty * hw, P[i][1] - tx * hw]);
    }
    ctx.beginPath(); ctx.moveTo(lf[0][0], lf[0][1]);
    for (const p of lf) ctx.lineTo(p[0], p[1]);
    for (let i = rt.length - 1; i >= 0; i--) ctx.lineTo(rt[i][0], rt[i][1]);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }

  // closed shape: flat cel colour + one shadow tone on the side away from the light, then the ink line.
  // shade: shadow colour. hi: a lit rim colour (for the black cat). sk: how far the shadow reaches.
  function shape(ctx, pts, o = {}) {
    const { fill, shade, hi, sk = 1, w = 0.016, line = true, seed = 3, color } = o;
    const P = spline(pts, true);
    if (fill) {
      if (INK.noLines) { path(ctx, P); ctx.fillStyle = '#000'; ctx.fill(); return P; }   // mask pass: silhouette only
      if (INK.mode === 'paper') { path(ctx, P); ctx.fillStyle = INK.paper; ctx.fill(); }
      else if (shade || hi) {
        const lx = INK.light[0] * sk * (hi ? -1 : 1), ly = INK.light[1] * sk * (hi ? -1 : 1);
        path(ctx, P); ctx.fillStyle = shade || hi; ctx.fill();
        ctx.save(); ctx.clip(); ctx.translate(lx, ly); path(ctx, P); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
      } else { path(ctx, P); ctx.fillStyle = fill; ctx.fill(); }
    }
    if (line) stroke(ctx, pts, w * INK.partK, { closed: true, seed, color, lost: 0.7 });
    return P;
  }

  // ---- the outer contour: render the figure's fills to a mask, follow its edge, ink it as one line ----
  const _masks = new Map();
  function silhouette(ctx, draw, w = 0.02, o = {}) {
    const cv = ctx.canvas, T = ctx.getTransform();
    const ds = o.ds || 2, W = Math.ceil(cv.width / ds), H = Math.ceil(cv.height / ds);
    const mk = W + 'x' + H; let mc = _masks.get(mk);
    if (!mc) { if (_masks.size > 8) _masks.clear(); mc = document.createElement('canvas'); mc.width = W; mc.height = H; _masks.set(mk, mc); }
    const m = mc.getContext('2d', { willReadFrequently: true });
    m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, W, H);
    m.setTransform(T.a / ds, T.b / ds, T.c / ds, T.d / ds, T.e / ds, T.f / ds);
    const nl = INK.noLines; INK.noLines = true; INK._cel = false; draw(m); INK.noLines = nl;
    if (INK._cel) return;   // drawings in the cel style ink their own contours; no traced outer line
    const a = m.getImageData(0, 0, W, H).data, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 110;
    const seen = new Uint8Array(W * H), inv = T.inverse();
    for (let y0 = 0; y0 < H; y0++) for (let x0 = 0; x0 < W; x0++) {
      if (!on(x0, y0) || seen[y0 * W + x0]) continue;
      // flood-fill the island so it is traced once
      const st = [y0 * W + x0]; seen[y0 * W + x0] = 1; let cnt = 0;
      while (st.length) { const k = st.pop(), x = k % W, y = (k / W) | 0; cnt++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (on(X, Y) && !seen[Y * W + X]) { seen[Y * W + X] = 1; st.push(Y * W + X); } } }
      if (cnt < 40) continue;
      // Moore-neighbour edge following from the island's first (top-left) pixel
      const D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
      let x = x0, y = y0, dir = 6; const chain = [];
      for (let it = 0; it < 200000; it++) {
        chain.push([x, y]);
        let found = false;
        for (let k = 0; k < 8; k++) { const d = (dir + 6 + k) % 8, X = x + D[d][0], Y = y + D[d][1]; if (on(X, Y)) { x = X; y = Y; dir = d; found = true; break; } }
        if (!found || (x === x0 && y === y0 && chain.length > 2)) break;
      }
      if (chain.length < 12) continue;
      const step = 3, pts = [];
      for (let i = 0; i < chain.length; i += step) { const [px, py] = chain[i]; const X = (px + 0.5) * ds, Y = (py + 0.5) * ds; pts.push([inv.a * X + inv.c * Y + inv.e, inv.b * X + inv.d * Y + inv.f]); }
      const n = pts.length, sm = pts.map((_, i) => { let x = 0, y = 0; for (let k = -1; k <= 1; k++) { const q = pts[(i + k + n) % n]; x += q[0]; y += q[1]; } return [x / 3, y / 3]; });   // soften pixel steps
      stroke(ctx, sm, w, { closed: true, lost: o.lost ?? 0.55, seed: 91, wob: 0.1, color: o.color });
    }
  }

  // a cast shadow: the occluder's silhouette, offset, painted only inside the receiver
  function cast(ctx, occ, recv, off, color) {
    if (INK.mode === 'paper' || INK.noLines) return;
    ctx.save(); path(ctx, spline(recv, true)); ctx.clip(); ctx.translate(off[0], off[1]); path(ctx, spline(occ, true)); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }
  // cloth fold: a soft shadow wedge with a thin line in it
  function fold(ctx, pts, w, shadeCol, o = {}) {
    if (INK.mode !== 'paper' && shadeCol) stroke(ctx, pts, w * 4.5, { tin: 0.35, tout: 0.45, min: 0.05, wob: 0.2, color: shadeCol, seed: o.seed || 5 });
    stroke(ctx, pts, w, { tin: 0.4, tout: 0.3, ...o });
  }
  function ellipse(ctx, cx, cy, rx, ry, rot, color) { ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(1e-4, rx), Math.max(1e-4, ry), rot, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function blush(ctx, cx, cy, rx, ry, a = 0.55) {
    if (INK.mode === 'paper' || INK.noLines) return;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(244,128,118,${a})`); g.addColorStop(1, 'rgba(244,128,118,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.2832); ctx.fill(); ctx.restore();
  }
  function xf(pts, { x = 0, y = 0, s = 1, sx = s, sy = s, r = 0 } = {}) {
    const c = Math.cos(r), sn = Math.sin(r);
    return pts.map(([a, b, k]) => [x + (a * sx) * c - (b * sy) * sn, y + (a * sx) * sn + (b * sy) * c, k]);
  }

  const COL = {
    skin: '#fde5d1', skinS: '#f0bfa2', hair: '#6b3f2b', hairS: '#4b291c', dress: '#7c9fd4', dressS: '#5b7bb5',
    collar: '#fbf8f1', collarS: '#d3d9e4', sock: '#fbf8f1', sockS: '#d3d9e4', shoe: '#5e3426', shoeS: '#3f2219',
    ribbon: '#f2c14a', ribbonS: '#d1972a', iris: '#4b2b1b', pupil: '#1b100b',
    cat: '#29252f', catHi: '#4d4a63', catLine: '#121015', catEye: '#eab63e', catEyeS: '#c48a1f',
    stone: '#d9ccb5', stoneTop: '#e8dcc6', stoneLine: '#8c8173',
  };

  // ============================== pose + camera ==============================
  const LEDGE = { front: 0.62, back: -0.95, drop: 2.4 };
  function pose(t = 0, o = {}) {
    const sw = o.swing ?? 1;
    const a1 = Math.sin(t * 1.1) * 0.16 * sw, a2 = Math.sin(t * 1.1 + 2.2) * 0.14 * sw;
    const shin = (k, ang, len = 1.08) => [k[0] + 0.02 * Math.sign(k[0]), k[1] - Math.cos(ang) * len, k[2] + Math.sin(ang) * len];
    const kL = [0.29, 0.2, 1.2], kR = [-0.27, 0.2, 1.22];
    const aL = shin(kL, 0.05 + a1), aR = shin(kR, 0.28 + a2);
    const toe = (a, ang) => [a[0] + 0.01 * Math.sign(a[0]), a[1] - 0.06 + Math.sin(ang) * 0.05, a[2] + 0.3];
    return {
      pelvis: [0, 0.25, 0], hipL: [0.29, 0.22, 0.05], hipR: [-0.29, 0.22, 0.05],
      kneeL: kL, kneeR: kR, ankleL: aL, ankleR: aR, toeL: toe(aL, 0.05 + a1), toeR: toe(aR, 0.28 + a2),
      waist: [0, 0.95, -0.03], chest: [0, 1.32, 0.0], neck: [0, 1.72, 0.0], head: [0, 2.4, 0.06],
      shL: [0.47, 1.6, -0.03], shR: [-0.47, 1.6, -0.03], elL: [0.66, 0.78, -0.2], elR: [-0.66, 0.78, -0.2],
      wrL: [0.74, 0.12, 0.08], wrR: [-0.74, 0.12, 0.08], finL: [0.76, 0.03, 0.42], finR: [-0.76, 0.03, 0.42],
    };
  }
  function camera(th, ph = 0.18) {
    const s = Math.sin(th), c = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph);
    const R = [c, 0, -s], U = [-s * sp, cp, -c * sp], F = [s * cp, sp, c * cp];
    const P = (p) => [p[0] * R[0] + p[1] * R[1] + p[2] * R[2], -(p[0] * U[0] + p[1] * U[1] + p[2] * U[2]), p[0] * F[0] + p[1] * F[1] + p[2] * F[2]];
    return { th, ph, P, p2: (p) => { const q = P(p); return [q[0], q[1]]; } };
  }
  const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };

  function limbOutline(chain, radii) {
    const P = [], R = [], segL = []; let tot = 0;
    for (let i = 0; i < chain.length - 1; i++) { const l = Math.hypot(chain[i + 1][0] - chain[i][0], chain[i + 1][1] - chain[i][1]); segL.push(l); tot += l; }
    const N = 24;
    for (let k = 0; k <= N; k++) {
      let d = (k / N) * tot, i = 0; while (i < segL.length - 1 && d > segL[i]) { d -= segL[i]; i++; }
      const f = segL[i] ? Math.min(1, d / segL[i]) : 0, a = chain[i], b = chain[i + 1];
      P.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      const t = k / N; let r = radii[0][1];
      for (let j = 0; j < radii.length - 1; j++) if (t >= radii[j][0] && t <= radii[j + 1][0]) { const u = (t - radii[j][0]) / (radii[j + 1][0] - radii[j][0]); r = radii[j][1] + (radii[j + 1][1] - radii[j][1]) * (u * u * (3 - 2 * u)); }
      R.push(r);
    }
    const L = [], Rt = [];
    for (let k = 0; k <= N; k++) {
      const a = P[Math.max(0, k - 1)], b = P[Math.min(N, k + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      L.push([P[k][0] - ty * R[k], P[k][1] + tx * R[k]]); Rt.push([P[k][0] + ty * R[k], P[k][1] - tx * R[k]]);
    }
    const pick = (A) => A.filter((_, i) => i % 3 === 0 || i === A.length - 1);
    const end = P[N], dx = P[N][0] - P[N - 1][0], dy = P[N][1] - P[N - 1][1], dl = Math.hypot(dx, dy) || 1;
    return [...pick(L), [end[0] + dx / dl * R[N] * 0.8, end[1] + dy / dl * R[N] * 0.8], ...pick(Rt).reverse()];
  }
  function hull(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const thin = (H, d = 0.035) => { const out = []; for (const p of H) if (!out.length || Math.hypot(p[0] - out[out.length - 1][0], p[1] - out[out.length - 1][1]) > d) out.push(p); return out; };
  function blob(cam, o, f, s, u, samples) { const pts = []; for (const [a, b, c] of samples) pts.push(cam.p2(v3.add(o, v3.add(v3.mul(f, a), v3.add(v3.mul(s, b), v3.mul(u, c)))))); return thin(hull(pts)); }


  // ============================== 2D skinning ==============================
  // A key drawing is made for one camera yaw. For nearby yaws its points are re-anchored to the
  // projected skeleton joints (inverse-distance weights), so the drawing turns with the body.
  const JN = ['pelvis', 'hipL', 'hipR', 'kneeL', 'kneeR', 'waist', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR'];
  function skinner(keyTh, th, J0, J) {
    const kc = camera(keyTh), cc = camera(th);
    const K = JN.map((n) => kc.p2(J0[n])), C = JN.map((n) => cc.p2(J[n]));
    if (Math.abs(keyTh - th) < 1e-5) return (pts) => pts;
    return (pts) => pts.map(([x, y, c]) => {
      let sx = 0, sy = 0, sw = 0;
      for (let j = 0; j < K.length; j++) { const dx = x - K[j][0], dy = y - K[j][1], d2 = dx * dx + dy * dy + 0.015, w = 1 / (d2 * d2); sx += w * (C[j][0] + dx); sy += w * (C[j][1] + dy); sw += w; }
      return [sx / sw, sy / sw, c];
    });
  }

  // ============================== limbs (any camera angle) ==============================
  const W0 = 0.013;
  function arm(ctx, cam, J, side) {
    const pts = limbOutline([cam.p2(J['sh' + side]), cam.p2(J['el' + side]), cam.p2(J['wr' + side])], [[0, 0.08], [0.22, 0.075], [0.47, 0.057], [0.6, 0.063], [1, 0.045]]);
    shape(ctx, pts, { fill: COL.skin, shade: COL.skinS, sk: 0.8, w: W0 * 0.8, seed: side === 'L' ? 11 : 12 });
    return pts;
  }
  function hand(ctx, cam, J, side) {
    const w = J['wr' + side], f = J['fin' + side];
    const fwd = v3.norm(v3.sub(f, w)), up = [0, 1, 0], sd = v3.norm(v3.cross(fwd, up)), L = Math.hypot(...v3.sub(f, w));
    const S = [];
    for (const t of [0, 0.15, 0.55, 0.85, 1]) { const wd = t < 0.1 ? 0.045 : t < 0.6 ? 0.066 : t < 0.9 ? 0.062 : 0.045; for (const k of [-1, 1]) for (const h of [-0.015, 0.03]) S.push([t * L, k * wd, h + (t > 0.7 ? -0.01 : 0)]); }
    S.push([0.35 * L, (side === 'L' ? -1 : 1) * 0.1, 0.0]);
    shape(ctx, blob(cam, w, fwd, sd, up, S), { fill: COL.skin, shade: COL.skinS, sk: 0.5, w: W0 * 0.7, seed: 21 });
    for (const k of [-0.025, 0.012, 0.045]) {
      const a = cam.p2(v3.add(w, v3.add(v3.mul(fwd, 0.72 * L), v3.add(v3.mul(sd, k), v3.mul(up, 0.03))))), b = cam.p2(v3.add(w, v3.add(v3.mul(fwd, 0.95 * L), v3.add(v3.mul(sd, k * 1.05), v3.mul(up, 0.02)))));
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.02) stroke(ctx, [a, b], 0.005, { tin: 0.4, tout: 0.3 });
    }
  }
  function sleeve(ctx, cam, J, side) {
    const s = J['sh' + side], e = J['el' + side];
    const ax = v3.norm(v3.sub(e, s)), out = v3.norm([Math.sign(s[0]), 0.25, 0]), sd = v3.norm(v3.cross(ax, out)), o2 = v3.norm(v3.cross(sd, ax)), L = Math.hypot(...v3.sub(e, s));
    const S = [];
    for (const t of [-0.06, 0.05, 0.16, 0.27, 0.32]) { const r = t < 0 ? 0.07 : t < 0.32 ? 0.1 + 0.018 * Math.sin(t * 9) : 0.085; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; S.push([t * L, Math.cos(a) * r, Math.sin(a) * r]); } }
    shape(ctx, blob(cam, s, ax, sd, o2, S), { fill: COL.dress, shade: COL.dressS, sk: 0.9, w: W0 * 0.85, seed: 31 });
    const c0 = cam.P(v3.add(s, v3.mul(ax, 0.29 * L)))[2], cuff = [];
    for (let i = 0; i < 13; i++) { const a = (i / 12) * 6.283; const p = cam.P(v3.add(s, v3.add(v3.mul(ax, 0.29 * L), v3.add(v3.mul(sd, Math.cos(a) * 0.088), v3.mul(o2, Math.sin(a) * 0.088))))); if (p[2] > c0 - 0.02) cuff.push([p[0], p[1]]); }
    if (cuff.length > 2) stroke(ctx, cuff, 0.006, { tin: 0.3, tout: 0.3 });
  }
  function shin(ctx, cam, J, side, skirt) {
    const pk = cam.p2(J['knee' + side]), pa = cam.p2(J['ankle' + side]);
    const leg = limbOutline([pk, pa], [[0, 0.098], [0.28, 0.114], [0.78, 0.066], [1, 0.056]]);
    shape(ctx, leg, { fill: COL.skin, shade: COL.skinS, sk: 0.8, w: W0 * 0.8, seed: side === 'L' ? 41 : 42 });
    if (skirt) cast(ctx, skirt, leg, [0.02, 0.09], COL.skinS);
    const ps = [pk[0] + (pa[0] - pk[0]) * 0.8, pk[1] + (pa[1] - pk[1]) * 0.8];
    shape(ctx, limbOutline([ps, pa, [pa[0] + (pa[0] - pk[0]) * 0.06, pa[1] + (pa[1] - pk[1]) * 0.06]], [[0, 0.07], [1, 0.062]]), { fill: COL.sock, shade: COL.sockS, sk: 0.6, w: W0 * 0.7, seed: 43 });
  }
  function shoe(ctx, cam, J, side) {
    const a = J['ankle' + side], t = J['toe' + side];
    const fwd = v3.norm(v3.sub(t, a)), sd = v3.norm(v3.cross(fwd, [0, 1, 0])), up = v3.norm(v3.cross(sd, fwd)), L = Math.hypot(...v3.sub(t, a)) + 0.06;
    const S = [];
    for (const [x, w, h0, h1] of [[-0.07, 0.05, -0.08, 0.02], [0.0, 0.058, -0.09, 0.04], [0.45, 0.064, -0.09, 0.0], [0.8, 0.062, -0.09, -0.02], [0.97, 0.045, -0.085, -0.04], [1.02, 0.02, -0.07, -0.05]]) for (const k of [-1, -0.6, 0.6, 1]) for (const h of [h0, h1]) S.push([x * L, k * w, h]);
    shape(ctx, blob(cam, a, fwd, sd, up, S), { fill: COL.shoe, shade: COL.shoeS, sk: 0.6, w: W0 * 0.9, seed: 51 });
    const st = []; for (let i = 0; i < 7; i++) { const q = -1.4 + 2.8 * i / 6; st.push(cam.p2(v3.add(a, v3.add(v3.mul(fwd, 0.28 * L), v3.add(v3.mul(sd, Math.sin(q) * 0.068), v3.mul(up, Math.cos(q) * 0.03 - 0.005)))))); }
    stroke(ctx, st, 0.011, { tin: 0.2, tout: 0.2, color: INK.mode === 'paper' ? INK.line : '#2f1912' });
  }

  // ============================== eyes (blink + gaze) ==============================
  // An eye in head-local coords: centre (cx,cy), width w, height h. open: 1 open .. 0 shut.
  // gaze: iris shift as a fraction of the width. dir: +1 when the outer corner is on the right.
  function eye(ctx, H, cx, cy, w, h, o) {
    if (INK.noLines) return;
    const { open = 1, gaze = 0, dir = 1, lid = 0.022 } = o;
    const N = 9, up = [], lo = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = (u - 0.5) * w, e = 1 - Math.pow(2 * u - 1, 2);
      const tilt = dir * (u - 0.5) * -0.012;                    // outer corner a touch higher
      const yl = h * 0.42 * Math.pow(e, 0.9) + tilt, yu = -h * 0.58 * Math.pow(e, 0.75) + tilt;
      lo.push([cx + x, cy + yl]); up.push([cx + x, cy + yl + (yu - yl) * open]);
    }
    const opening = H([...up, ...lo.slice().reverse()]);
    if (open > 0.06) {
      ctx.save(); path(ctx, opening); ctx.clip();
      if (INK.mode !== 'paper') { path(ctx, opening); ctx.fillStyle = '#ffffff'; ctx.fill(); }
      const ic = H([[cx + gaze * w, cy + h * 0.06]])[0];
      ellipse(ctx, ic[0], ic[1], w * 0.4, h * 0.47, 0, INK.mode === 'paper' ? INK.line : COL.iris);
      if (INK.mode !== 'paper') { ellipse(ctx, ic[0], ic[1] + h * 0.03, w * 0.23, h * 0.29, 0, COL.pupil); }
      const hl = H([[cx + gaze * w - w * 0.13, cy - h * 0.17]])[0]; ellipse(ctx, hl[0], hl[1], w * 0.11, w * 0.11, 0, '#fff');
      // upper lid casts a little shadow on the eye white
      if (INK.mode !== 'paper') { ctx.translate(0, h * 0.12); path(ctx, H([...up, ...up.slice().reverse().map(([x, y]) => [x, y - h])])); ctx.fillStyle = 'rgba(120,90,110,0.25)'; ctx.fill(); }
      ctx.restore();
    }
    // upper lid: the boldest line on the face, with a short flick at the outer corner
    stroke(ctx, H(up), lid, { tin: 0.12, tout: 0.15, min: 0.35, wob: 0.05, seed: 71 });
    const oc = dir > 0 ? up[N] : up[0], oc2 = dir > 0 ? up[N - 1] : up[1];
    stroke(ctx, H([oc2, oc, [oc[0] + dir * w * 0.12, oc[1] - h * 0.12]]), lid * 0.55, { tin: 0.05, tout: 0.7 });
    if (open > 0.3) stroke(ctx, H([lo[3], lo[5], lo[6]]), lid * 0.3, { tin: 0.4, tout: 0.4 });
  }


  // ============================== cel engine: paint under, ink on top ==============================
  // The newer drawings are made the way a cel is: colour areas are painted flat with no outline of
  // their own, and the ink is a separate layer of open, tapered strokes that start and stop where a
  // form tucks behind another. Shadows are shapes drawn on purpose, not shifted copies of the fill.
  const LW = 0.0074;                                  // the animator's pencil, in head heights
  // a closed contour remembered together with where each control point landed, so that any stretch
  // of the same edge can be inked later and sits exactly on the paint
  function contour(pts, step = 0.01) {
    const n = pts.length, P = [], I = [];
    for (let i = 0; i < n; i++) {
      const g = (k) => pts[((k % n) + n) % n];
      const p1 = g(i), p2 = g(i + 1), p0 = p1[2] ? p1 : g(i - 1), p3 = p2[2] ? p2 : g(i + 2);
      const segs = Math.max(3, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      I.push(P.length);
      for (let s = 0; s < segs; s++) {
        const t = s / segs, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, e) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - e) * t2 + (-a + 3 * b - 3 * c + e) * t3);
        P.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    I.push(P.length);
    return { P, I, n };
  }
  // the samples of contour C from control point a to control point b (fractions allowed, b may wrap past n)
  function run(C, a, b) {
    const N = C.P.length;
    const at = (k) => { const i = Math.floor(k), f = k - i, j = ((i % C.n) + C.n) % C.n; return Math.round(C.I[j] + (C.I[j + 1] - C.I[j]) * f) % N; };
    const s = at(a), e = at(b); let cnt = (((e - s) % N) + N) % N; if (cnt === 0 && b > a) cnt = N;
    const out = []; for (let i = 0; i <= cnt; i++) out.push(C.P[(s + i) % N]);
    return out;
  }
  const tone = (col) => INK.noLines ? '#000' : INK.mode === 'paper' ? INK.paper : col;
  function paint(ctx, P, col) { if (INK.noLines) INK._cel = true; path(ctx, P); ctx.fillStyle = tone(col); ctx.fill(); }
  // a designed shadow (or any second tone): the shape `pts`, kept inside the painted area `clip`
  function shadow(ctx, clip, pts, col, closedSpline = true) {
    if (INK.noLines || INK.mode === 'paper') return;
    ctx.save(); path(ctx, clip); ctx.clip(); path(ctx, closedSpline ? spline(pts, true) : pts); ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  // one pencil stroke through already-sampled points. Pressure rises in, eases out, and breathes a little.
  function ribbon(ctx, P, w = LW, o = {}) {
    if (INK.noLines) return;
    const { tin = 0.22, tout = 0.3, min = 0.12, wob = 0.1, seed = 7, color = INK.line, press } = o;
    w = Math.max(w, INK.minW);
    const n = P.length; if (n < 2) return;
    const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = L[n - 1] || 1, r = rnd(seed * 9973 + 1), ph = r() * 6.28, fr = 1.2 + r() * 2.2;
    // tapers are measured in length, so a short stroke is all taper and a long one keeps its body
    const lin = Math.min(tot * 0.5, Math.max(tin * tot, 0) ), lout = Math.min(tot * 0.5, tout * tot);
    const lf = [], rt = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const d = L[i], t = d / tot;
      let k = Math.min(lin > 0 ? min + (1 - min) * smooth(0, lin, d) : 1, lout > 0 ? min + (1 - min) * smooth(0, lout, tot - d) : 1);
      k *= 1 + wob * Math.sin(t * fr * 6.28 + ph);
      if (press) k *= press(t);
      const hw = w * k * 0.5;
      lf.push([P[i][0] - ty * hw, P[i][1] + tx * hw]); rt.push([P[i][0] + ty * hw, P[i][1] - tx * hw]);
    }
    ctx.beginPath(); ctx.moveTo(lf[0][0], lf[0][1]);
    for (const p of lf) ctx.lineTo(p[0], p[1]);
    for (let i = rt.length - 1; i >= 0; i--) ctx.lineTo(rt[i][0], rt[i][1]);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  const line = (ctx, pts, w, o) => ribbon(ctx, spline(pts, false, 0.008), w, o);   // a free stroke through control points
  const ink = (ctx, C, a, b, w, o) => ribbon(ctx, run(C, a, b), w, o);             // a stretch of a painted edge
  const lerpPts = (A, B, k) => A.map((p, i) => [p[0] + (B[i][0] - p[0]) * k, p[1] + (B[i][1] - p[1]) * k, p[2]]);
  const litLeft = () => INK.light[0] <= 0;            // which of the two designed shadow sets to use

  // ============================== traced key drawing (numbers only) ==============================
  // Control points placed over the reference drawing: front view, 1 = head height, origin = seat.
  // Head parts are relative to the head anchor, the kitten to the spot it sits on. A third value marks a sharp corner.
  const TR = {
    hair: [[0.66,0.3,1],[0.641,0.244],[0.62,0.2],[0.592,0.16,1],[0.587,0.168],[0.6,0.26],[0.6,0.3],[0.592,0.364],[0.582,0.404],[0.568,0.44],[0.55,0.472],[0.532,0.488,1],[0.538,0.444],[0.536,0.408],[0.528,0.38,1],[0.511,0.428],[0.473,0.496],[0.44,0.53],[0.408,0.553],[0.396,0.556,1],[0.417,0.495],[0.412,0.484,1],[0.376,0.528],[0.352,0.55],[0.312,0.574],[0.284,0.584,1],[0.304,0.54,1],[0.292,0.544],[0.248,0.582],[0.212,0.6,1],[0.209,0.585],[0.2,0.584],[0.168,0.602],[0.149,0.606],[0.14,0.624,1],[0.14,0.568,1],[0.19,0.542],[0.244,0.5],[0.275,0.47],[0.295,0.446],[0.328,0.368,1],[0.33,0.373],[0.348,0.378],[0.378,0.364],[0.417,0.324],[0.45,0.268],[0.465,0.192],[0.453,0.149],[0.442,0.138],[0.42,0.132,1],[0.397,0.164],[0.368,0.236,1],[0.364,0.228],[0.382,0.136],[0.38,0.116],[0.387,0.096],[0.385,0.076],[0.388,0.06,1],[0.367,0.04],[0.311,-0.086],[0.296,-0.104,1],[0.291,-0.096],[0.3,-0.056],[0.3,-0.016],[0.296,-0.004,1],[0.156,-0.196,1],[0.151,-0.194],[0.15,-0.188],[0.164,-0.112],[0.164,-0.028],[0.16,-0.012,1],[0.172,-0.008],[0.212,-0.008,1],[0.148,0.004,1],[0.143,0.002],[0.139,-0.01],[0.052,-0.096,1],[0.051,-0.084],[0.063,-0.064],[0.064,-0.052,1],[0.044,-0.064],[-0.019,-0.132],[-0.051,-0.18],[-0.079,-0.236],[-0.089,-0.268],[-0.096,-0.276,1],[-0.108,-0.2],[-0.108,-0.136],[-0.088,-0.016,1],[-0.1,-0.022],[-0.134,-0.06],[-0.151,-0.088],[-0.174,-0.14],[-0.192,-0.212],[-0.196,-0.304],[-0.2,-0.316,1],[-0.258,-0.244],[-0.291,-0.18],[-0.322,-0.084],[-0.336,0.016,1],[-0.354,-0.02],[-0.372,-0.092,1],[-0.379,-0.084],[-0.388,-0.04],[-0.389,0.032],[-0.378,0.092],[-0.346,0.226],[-0.352,0.228,1],[-0.381,0.158],[-0.4,0.144],[-0.416,0.14,1],[-0.431,0.16],[-0.44,0.196],[-0.434,0.252],[-0.419,0.288],[-0.376,0.352],[-0.34,0.374],[-0.304,0.38,1],[-0.291,0.42],[-0.26,0.47],[-0.186,0.533],[-0.124,0.57],[-0.119,0.58],[-0.12,0.608,1],[-0.148,0.601],[-0.168,0.602],[-0.192,0.593],[-0.228,0.568,1],[-0.228,0.591],[-0.232,0.595],[-0.24,0.594],[-0.274,0.572],[-0.306,0.538],[-0.32,0.54,1],[-0.306,0.573],[-0.312,0.58,1],[-0.359,0.548],[-0.392,0.508],[-0.412,0.468,1],[-0.416,0.48],[-0.416,0.528],[-0.408,0.556,1],[-0.415,0.559],[-0.436,0.549],[-0.473,0.516],[-0.501,0.472],[-0.52,0.408,1],[-0.53,0.412],[-0.542,0.456],[-0.54,0.52,1],[-0.556,0.508],[-0.575,0.48],[-0.597,0.424],[-0.604,0.388],[-0.604,0.296],[-0.6,0.276],[-0.604,0.264,1],[-0.643,0.332],[-0.662,0.38],[-0.672,0.428,1],[-0.688,0.356],[-0.684,0.3],[-0.666,0.228],[-0.595,0.076],[-0.592,-0.012],[-0.57,-0.096],[-0.572,-0.108,1],[-0.624,-0.04],[-0.651,0.016],[-0.66,0.048,1],[-0.664,0.036],[-0.664,-0.02],[-0.654,-0.072],[-0.631,-0.132],[-0.582,-0.216],[-0.528,-0.28,1],[-0.54,-0.283],[-0.58,-0.276],[-0.644,-0.28,1],[-0.564,-0.317],[-0.516,-0.346],[-0.45,-0.398],[-0.376,-0.472],[-0.284,-0.542],[-0.232,-0.571],[-0.144,-0.606],[-0.044,-0.628],[0.048,-0.632],[0.148,-0.614],[0.216,-0.582],[0.26,-0.574],[0.288,-0.563],[0.36,-0.522],[0.424,-0.464],[0.458,-0.42],[0.507,-0.332],[0.526,-0.284],[0.55,-0.204],[0.59,-0.004],[0.642,0.128],[0.657,0.18],[0.664,0.216],[0.664,0.288]],
    hairIn: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    jaw: [[-0.392,-0.004],[-0.384,0.068],[-0.342,0.244],[-0.314,0.364],[-0.283,0.44],[-0.26,0.472],[-0.224,0.508],[-0.14,0.563],[-0.048,0.606],[0.016,0.616],[0.052,0.61],[0.128,0.579],[0.216,0.526],[0.232,0.512],[0.266,0.468],[0.301,0.404],[0.319,0.336],[0.338,0.288],[0.342,0.252],[0.369,0.212],[0.384,0.112],[0.382,0.052]],
    earL: [[-0.412,0.136,1],[-0.396,0.142],[-0.382,0.156],[-0.336,0.248],[-0.308,0.376,1],[-0.336,0.378],[-0.36,0.366],[-0.398,0.328],[-0.423,0.284],[-0.44,0.224],[-0.44,0.184],[-0.433,0.156]],
    earLine: [[[-0.388,0.332],[-0.364,0.356]]],
    clip: [[0.436,-0.296,1],[0.452,-0.294],[0.463,-0.28],[0.472,-0.252],[0.472,-0.224],[0.457,-0.172],[0.434,-0.128],[0.42,-0.114],[0.404,-0.112,1],[0.388,-0.128],[0.372,-0.184],[0.393,-0.232],[0.426,-0.288]],
    neck: [[0.152,-1.824,1],[0.148,-1.752],[0.153,-1.74],[0.188,-1.711],[0.24,-1.688,1],[0.234,-1.648],[0.227,-1.632],[0.2,-1.592],[0.168,-1.566],[0.1,-1.534],[0.016,-1.52],[-0.06,-1.534],[-0.112,-1.557],[-0.14,-1.575],[-0.156,-1.588],[-0.191,-1.636],[-0.2,-1.664],[-0.2,-1.692,1],[-0.144,-1.717],[-0.121,-1.736],[-0.112,-1.768],[-0.112,-1.812],[-0.108,-1.824,1],[-0.016,-1.79],[0.012,-1.786],[0.06,-1.794],[0.136,-1.826]],
    shirtL: [[-0.364,-0.984,1],[-0.444,-0.998],[-0.496,-1.014],[-0.636,-1.079],[-0.684,-1.098],[-0.716,-1.104,1],[-0.713,-1.132],[-0.69,-1.204],[-0.635,-1.34],[-0.61,-1.376],[-0.594,-1.448],[-0.551,-1.56],[-0.522,-1.608],[-0.48,-1.65],[-0.432,-1.674],[-0.376,-1.682],[-0.358,-1.664],[-0.334,-1.544],[-0.292,-1.348],[-0.327,-1.156],[-0.344,-1.112],[-0.348,-1.052]],
    shirtC: [[-0.192,-1.712,1],[-0.19,-1.7],[-0.198,-1.684],[-0.194,-1.66],[-0.168,-1.612],[-0.14,-1.584],[-0.1,-1.556],[-0.04,-1.534],[-0.008,-1.528],[0.028,-1.524],[0.088,-1.534],[0.168,-1.574],[0.228,-1.638],[0.244,-1.64],[0.26,-1.632,1],[0.253,-1.588],[0.241,-1.564],[0.243,-1.544],[0.217,-1.42],[0.209,-1.388],[0.196,-1.368,1],[0.044,-1.36],[-0.156,-1.368,1],[-0.166,-1.384],[-0.19,-1.504],[-0.228,-1.7,1],[-0.212,-1.71]],
    shirtR: [[0.696,-1.088,1],[0.684,-1.082],[0.668,-1.085],[0.652,-1.081],[0.488,-1.01],[0.448,-0.999],[0.376,-0.988,1],[0.363,-1.004],[0.356,-1.072],[0.362,-1.12],[0.372,-1.144,1],[0.347,-1.172],[0.328,-1.34],[0.343,-1.384],[0.369,-1.5],[0.398,-1.652],[0.396,-1.672,1],[0.42,-1.68],[0.452,-1.674],[0.504,-1.65],[0.546,-1.608],[0.569,-1.568],[0.597,-1.484],[0.616,-1.364],[0.638,-1.332],[0.681,-1.196],[0.7,-1.112]],
    pina: [[-0.236,-1.716,1],[-0.223,-1.696],[-0.202,-1.616],[-0.202,-1.596],[-0.163,-1.396],[-0.152,-1.38],[-0.136,-1.372],[-0.004,-1.364],[0.188,-1.372,1],[0.205,-1.396],[0.221,-1.464],[0.264,-1.68],[0.264,-1.712,1],[0.288,-1.716],[0.4,-1.692,1],[0.399,-1.596],[0.39,-1.576],[0.392,-1.556],[0.379,-1.524],[0.332,-1.336],[0.36,-1.108],[0.368,-0.992],[0.382,-0.964],[0.388,-0.932],[0.385,-0.876],[0.352,-0.768,1],[0.378,-0.74],[0.407,-0.684],[0.438,-0.544],[0.45,-0.516],[0.453,-0.488],[0.515,-0.38],[0.554,-0.272],[0.564,-0.224],[0.563,-0.204],[0.584,-0.112],[0.588,-0.036],[0.602,0.004],[0.609,0.044],[0.616,0.056],[0.652,0.088],[0.681,0.132],[0.694,0.172],[0.696,0.208,1],[0.676,0.222],[0.636,0.228],[0.612,0.228],[0.588,0.22],[0.56,0.224],[0.512,0.208],[0.488,0.192],[0.466,0.168],[0.433,0.116],[0.39,0.036],[0.348,-0.012],[0.3,-0.043],[0.24,-0.06],[0.204,-0.06],[0.144,-0.043],[0.104,-0.022],[0.048,0.03],[0.024,0.042],[0.0,0.048],[-0.036,0.039],[-0.12,-0.026],[-0.164,-0.046],[-0.196,-0.052],[-0.264,-0.046],[-0.308,-0.027],[-0.344,-0.004],[-0.39,0.044],[-0.454,0.144],[-0.484,0.184],[-0.516,0.214],[-0.54,0.228],[-0.588,0.236],[-0.62,0.23],[-0.724,0.186],[-0.756,0.18],[-0.792,0.184,1],[-0.799,0.172],[-0.8,0.16],[-0.79,0.136],[-0.76,0.1],[-0.708,0.066],[-0.69,0.048],[-0.682,0.032],[-0.669,-0.024],[-0.642,-0.052],[-0.625,-0.16],[-0.586,-0.288],[-0.551,-0.372],[-0.495,-0.472],[-0.451,-0.6],[-0.428,-0.708],[-0.408,-0.74],[-0.372,-0.776,1],[-0.394,-0.848],[-0.399,-0.912],[-0.387,-0.964],[-0.362,-0.996],[-0.342,-1.116],[-0.298,-1.34],[-0.317,-1.436],[-0.327,-1.456],[-0.326,-1.48],[-0.339,-1.544],[-0.358,-1.612],[-0.368,-1.692,1],[-0.352,-1.7]],
    armL: [[-0.576,-1.024,1],[-0.528,-0.984],[-0.42,-0.937],[-0.396,-0.92,1],[-0.42,-0.776],[-0.432,-0.672],[-0.458,-0.564],[-0.505,-0.44],[-0.535,-0.388],[-0.574,-0.304],[-0.606,-0.208],[-0.634,-0.104],[-0.661,-0.032],[-0.682,0.0],[-0.689,0.04],[-0.698,0.064],[-0.752,0.099],[-0.768,0.104],[-0.856,0.104],[-0.904,0.116],[-0.94,0.116],[-0.964,0.1,1],[-0.963,0.076],[-0.976,0.06,1],[-1.004,0.065],[-1.056,0.095],[-1.084,0.104],[-1.116,0.103],[-1.152,0.088,1],[-1.151,0.076],[-1.144,0.064],[-1.048,-0.017],[-0.992,-0.03],[-0.948,-0.05],[-0.812,-0.066],[-0.796,-0.076],[-0.787,-0.088],[-0.766,-0.148],[-0.743,-0.24],[-0.721,-0.36],[-0.702,-0.48],[-0.677,-0.628],[-0.658,-0.692],[-0.606,-0.82],[-0.599,-0.848]],
    armR: [[0.572,-0.988,1],[0.576,-0.976],[0.584,-0.836],[0.59,-0.804],[0.625,-0.7],[0.644,-0.604],[0.656,-0.472],[0.664,-0.308],[0.684,-0.172],[0.702,-0.092],[0.716,-0.078],[0.732,-0.07],[0.844,-0.054],[0.884,-0.031],[0.936,-0.017],[1.004,0.052],[1.022,0.076],[1.024,0.092,1],[1.012,0.099],[0.976,0.108],[0.944,0.1],[0.888,0.067],[0.856,0.06,1],[0.843,0.076],[0.84,0.1,1],[0.824,0.114],[0.8,0.116],[0.736,0.1],[0.664,0.097],[0.648,0.09],[0.607,0.052],[0.6,0.016],[0.601,-0.004],[0.584,-0.048],[0.58,-0.108],[0.546,-0.28],[0.515,-0.364],[0.458,-0.472],[0.423,-0.588],[0.408,-0.676],[0.404,-0.776],[0.388,-0.892],[0.388,-0.924,1],[0.428,-0.946],[0.512,-0.97],[0.544,-0.973]],
    legL: [[-0.272,-0.046],[-0.16,-0.048],[-0.108,-0.026],[-0.084,-0.008],[-0.056,0.024],[-0.036,0.104],[-0.036,0.188],[-0.064,0.328],[-0.068,0.368],[-0.072,0.552],[-0.08,0.648],[-0.098,0.768],[-0.136,0.996],[-0.148,1.116],[-0.148,1.244],[-0.132,1.324],[-0.136,1.408],[-0.116,1.512],[-0.105,1.6],[-0.072,1.716],[-0.076,1.764],[-0.072,1.816],[-0.078,1.844],[-0.092,1.866],[-0.12,1.875],[-0.144,1.864,1],[-0.172,1.879],[-0.204,1.871],[-0.224,1.871],[-0.244,1.858],[-0.268,1.854],[-0.292,1.838],[-0.316,1.83],[-0.332,1.808],[-0.338,1.772],[-0.354,1.736],[-0.36,1.708],[-0.36,1.616],[-0.356,1.596],[-0.36,1.524],[-0.349,1.46],[-0.336,1.432],[-0.352,1.372],[-0.352,1.336],[-0.34,1.276],[-0.34,1.228],[-0.364,1.068],[-0.39,0.948],[-0.42,0.804],[-0.436,0.68],[-0.432,0.524],[-0.42,0.44],[-0.388,0.28],[-0.388,0.228],[-0.4,0.176],[-0.4,0.14],[-0.393,0.096],[-0.375,0.048],[-0.334,-0.012],[-0.308,-0.031]],
    legR: [[0.136,-0.046],[0.3,-0.046],[0.315,-0.038],[0.348,-0.004],[0.378,0.048],[0.384,0.084],[0.384,0.12],[0.364,0.268],[0.396,0.5],[0.396,0.64],[0.373,0.796],[0.346,0.916],[0.303,1.088],[0.276,1.24],[0.28,1.376],[0.268,1.424],[0.268,1.444],[0.28,1.508],[0.292,1.692],[0.27,1.8],[0.256,1.823],[0.232,1.832],[0.204,1.858],[0.184,1.86],[0.16,1.872],[0.144,1.87],[0.116,1.876],[0.088,1.867],[0.056,1.876],[0.032,1.864],[0.018,1.844],[0.012,1.816],[0.016,1.78],[0.008,1.736],[0.018,1.676],[0.044,1.58],[0.052,1.496],[0.07,1.408],[0.066,1.348],[0.088,1.24],[0.092,1.096],[0.08,0.932],[0.064,0.812],[0.048,0.688],[0.044,0.628],[0.045,0.508],[0.048,0.336],[0.024,0.188],[0.024,0.116],[0.038,0.048],[0.049,0.024],[0.068,0.0],[0.092,-0.02]],
    pinaL: [[[0.24,-0.396],[0.284,-0.4],[0.348,-0.388]],[[-0.512,0.204],[-0.484,0.176]],[[-0.312,-0.592],[-0.288,-0.652]],[[-0.132,-0.552],[-0.116,-0.636]],[[0.092,-0.02],[0.052,0.02]],[[-0.408,-0.732],[-0.376,-0.764],[-0.356,-0.768]],[[0.344,-0.024],[0.384,0.016]],[[0.096,-0.704],[0.096,-0.668],[0.1,-0.656],[0.1,-0.628],[0.096,-0.62]],[[-0.616,0.084],[-0.628,0.032]],[[-0.012,-0.32],[0.024,-0.32]],[[-0.64,-0.028],[-0.632,0.024]],[[0.072,-0.74],[0.084,-0.672]],[[-0.064,-0.332],[-0.104,-0.352]],[[-0.36,-0.392],[-0.332,-0.396],[-0.264,-0.396]],[[-0.1,-0.696],[-0.112,-0.648]]],
    pinaT: [[[0.316,-1.7,1],[0.318,-1.689],[0.303,-1.661],[0.268,-1.648,1],[0.264,-1.66],[0.268,-1.692,1],[0.296,-1.702]],[[-0.352,-0.976,1],[-0.325,-0.828],[-0.292,-0.76,1],[-0.322,-0.755],[-0.352,-0.704],[-0.356,-0.68],[-0.413,-0.576],[-0.47,-0.48],[-0.48,-0.472,1],[-0.487,-0.48],[-0.486,-0.492],[-0.447,-0.6],[-0.427,-0.7],[-0.404,-0.74],[-0.364,-0.772,1],[-0.389,-0.84],[-0.395,-0.912],[-0.384,-0.96],[-0.364,-0.978]],[[0.356,-0.98,1],[0.382,-0.94],[0.384,-0.892],[0.344,-0.768,1],[0.374,-0.74],[0.406,-0.676],[0.427,-0.576],[0.426,-0.556],[0.448,-0.504,1],[0.433,-0.505],[0.411,-0.532],[0.353,-0.64],[0.344,-0.672],[0.329,-0.7],[0.292,-0.752],[0.272,-0.764,1],[0.296,-0.796],[0.31,-0.828],[0.349,-0.972]],[[0.268,-0.756,1],[0.292,-0.751],[0.314,-0.728],[0.33,-0.7],[0.328,-0.688,1],[0.317,-0.693],[0.269,-0.742]],[[0.224,-0.752,1],[0.236,-0.75],[0.245,-0.74],[0.266,-0.692],[0.264,-0.668,1],[0.254,-0.673],[0.237,-0.704],[0.221,-0.74]],[[0.276,-0.44,1],[0.268,-0.432],[0.172,-0.391],[0.076,-0.338],[0.044,-0.326],[0.012,-0.324,1],[0.036,-0.362],[0.092,-0.393],[0.22,-0.442],[0.264,-0.448]],[[-0.288,-0.4,1],[-0.364,-0.39],[-0.44,-0.36,1],[-0.443,-0.372],[-0.424,-0.4],[-0.388,-0.418],[-0.332,-0.42],[-0.296,-0.411]],[[0.42,-0.364,1],[0.408,-0.361],[0.364,-0.382],[0.308,-0.397],[0.3,-0.404,1],[0.308,-0.411],[0.344,-0.416],[0.376,-0.411],[0.41,-0.392]],[[0.52,-0.324,1],[0.531,-0.319],[0.536,-0.308],[0.524,-0.28,1],[0.557,-0.24],[0.558,-0.204],[0.574,-0.144],[0.584,-0.076],[0.577,0.016],[0.548,0.104,1],[0.528,0.092],[0.513,0.068],[0.496,0.016],[0.497,0.004],[0.504,-0.004,1],[0.515,0.001],[0.548,0.036,1],[0.564,-0.04],[0.564,-0.084],[0.547,-0.16],[0.504,-0.26],[0.513,-0.316]],[[0.108,-0.28,1],[0.103,-0.268],[0.027,-0.19],[0.004,-0.18],[-0.028,-0.182],[-0.039,-0.189],[-0.07,-0.224],[-0.088,-0.26,1],[-0.076,-0.262],[-0.028,-0.243],[0.008,-0.24],[0.036,-0.249],[0.092,-0.28]],[[-0.664,-0.02,1],[-0.648,-0.014],[-0.64,-0.004],[-0.618,0.068],[-0.62,0.088,1],[-0.631,0.086],[-0.652,0.063],[-0.68,0.056,1],[-0.682,0.044]],[[0.584,-0.008,1],[0.597,0.004],[0.604,0.06,1],[0.572,0.068,1],[0.568,0.048]],[[-0.624,0.0,1],[-0.614,0.008],[-0.596,0.052,1],[-0.579,0.029],[-0.548,0.008,1],[-0.546,0.04],[-0.554,0.056],[-0.572,0.079],[-0.604,0.092,1],[-0.616,0.076],[-0.629,0.032],[-0.632,0.012]]],
    neckT: [[[-0.1,-1.816,1],[-0.077,-1.807],[-0.072,-1.788,1],[-0.04,-1.791],[0.02,-1.775],[0.136,-1.816,1],[0.144,-1.792],[0.148,-1.716],[0.156,-1.696,1],[0.184,-1.702],[0.212,-1.697],[0.228,-1.68],[0.232,-1.656,1],[0.204,-1.644],[0.16,-1.651],[0.128,-1.668],[0.104,-1.7,1],[0.048,-1.68],[0.032,-1.682],[-0.004,-1.7],[-0.096,-1.772],[-0.104,-1.788]]],
    neckL: [[[-0.056,-1.596],[-0.164,-1.616],[-0.18,-1.628]],[[0.084,-1.592],[0.14,-1.608],[0.196,-1.616],[0.216,-1.624]]],
    shirtLL: [[[-0.348,-1.128],[-0.348,-1.192],[-0.352,-1.216]],[[-0.36,-1.376],[-0.356,-1.348],[-0.356,-1.288],[-0.352,-1.276],[-0.352,-1.224]],[[-0.436,-1.468],[-0.432,-1.428],[-0.412,-1.348],[-0.397,-1.304],[-0.364,-1.228]]],
    shirtCL: [[[0.18,-1.576],[0.212,-1.608]],[[-0.048,-1.484],[-0.076,-1.492]],[[-0.172,-1.608],[-0.14,-1.576]]],
    shirtRL: [[[0.392,-1.384],[0.372,-1.236]],[[0.464,-1.464],[0.452,-1.4],[0.429,-1.328],[0.413,-1.288],[0.384,-1.232]],[[0.364,-1.16],[0.364,-1.188],[0.372,-1.216]],[[0.508,-1.64],[0.536,-1.612]]],
    armLL: [[[-0.824,0.024],[-0.864,0.04],[-0.904,0.048],[-0.936,0.06]],[[-1.12,0.052],[-1.088,0.02]],[[-0.968,-0.004],[-1.016,0.004],[-1.04,0.016]]],
    armRL: [[[1.004,0.06],[0.964,0.02]],[[0.844,-0.012],[0.872,0.0],[0.908,0.008]],[[0.844,0.056],[0.824,0.06],[0.752,0.037],[0.736,0.028]]],
    legLL: [[[-0.248,1.78],[-0.252,1.788],[-0.252,1.812],[-0.244,1.844]],[[-0.092,-0.008],[-0.064,0.02]],[[-0.156,1.764],[-0.152,1.772],[-0.152,1.852]],[[-0.204,1.776],[-0.204,1.836],[-0.2,1.856]],[[-0.292,1.772],[-0.292,1.812],[-0.284,1.832]]],
    legRL: [[[0.232,1.772],[0.232,1.816]],[[0.092,1.76],[0.092,1.808],[0.096,1.82],[0.092,1.852]],[[0.144,1.784],[0.148,1.808],[0.144,1.848],[0.132,1.868]],[[0.192,1.78],[0.189,1.784],[0.192,1.824],[0.184,1.844]]],
    cat: [[0.196,-0.884,1],[0.209,-0.864],[0.212,-0.828,1],[0.206,-0.868],[0.2,-0.88,1],[0.172,-0.856],[0.15,-0.828],[0.112,-0.756,1],[0.142,-0.735],[0.17,-0.687],[0.176,-0.685],[0.19,-0.689],[0.192,-0.684,1],[0.178,-0.66],[0.183,-0.588],[0.179,-0.572],[0.151,-0.53],[0.112,-0.5,1],[0.121,-0.466],[0.13,-0.452],[0.14,-0.424],[0.154,-0.37],[0.155,-0.348],[0.162,-0.334],[0.171,-0.28],[0.202,-0.228],[0.216,-0.172],[0.21,-0.118],[0.191,-0.067],[0.17,-0.04],[0.16,0.004,1],[0.155,0.001],[0.152,-0.016],[0.136,-0.036,1],[0.096,-0.036,1],[0.096,-0.046],[0.103,-0.052],[0.108,-0.092,1],[0.096,-0.093],[0.076,-0.083],[0.064,-0.082],[0.044,-0.086],[0.02,-0.1,1],[0.02,-0.089],[0.016,-0.1,1],[0.012,-0.088],[0.016,-0.036],[0.008,-0.024,1],[0.0,-0.056],[0.004,-0.084],[0.0,-0.1,1],[-0.044,-0.083],[-0.084,-0.096,1],[-0.089,-0.085],[-0.08,-0.032,1],[-0.1,-0.036],[-0.116,-0.028],[-0.124,-0.012],[-0.12,0.008,1],[-0.101,0.006],[-0.096,-0.016,1],[-0.088,0.016,1],[-0.112,0.016],[-0.144,0.009],[-0.161,-0.005],[-0.168,-0.024,1],[-0.18,-0.019],[-0.212,-0.023],[-0.248,-0.04,1],[-0.253,-0.046],[-0.249,-0.056],[-0.252,-0.064],[-0.288,-0.104],[-0.308,-0.116,1],[-0.305,-0.13],[-0.318,-0.154],[-0.336,-0.18],[-0.352,-0.193],[-0.4,-0.203],[-0.424,-0.194],[-0.458,-0.171],[-0.476,-0.168,1],[-0.475,-0.172],[-0.487,-0.179],[-0.496,-0.192,1],[-0.495,-0.202],[-0.481,-0.23],[-0.457,-0.255],[-0.408,-0.276],[-0.38,-0.279],[-0.352,-0.274],[-0.319,-0.259],[-0.276,-0.222],[-0.257,-0.196],[-0.23,-0.142],[-0.212,-0.124,1],[-0.207,-0.191],[-0.182,-0.252],[-0.165,-0.268],[-0.117,-0.448],[-0.088,-0.496,1],[-0.048,-0.484,1],[-0.06,-0.476],[-0.07,-0.452],[-0.067,-0.432],[-0.072,-0.4],[-0.041,-0.332],[-0.018,-0.296],[-0.01,-0.272],[-0.008,-0.252],[-0.012,-0.216],[-0.004,-0.2],[-0.004,-0.172],[0.004,-0.14,1],[0.019,-0.156],[0.024,-0.216],[0.03,-0.236],[0.028,-0.26],[0.034,-0.288],[0.055,-0.334],[0.064,-0.34],[0.091,-0.404],[0.089,-0.448],[0.08,-0.488,1],[0.12,-0.512,1],[0.108,-0.544],[0.096,-0.56],[0.042,-0.6],[0.012,-0.664,1],[-0.029,-0.592],[-0.076,-0.56],[-0.088,-0.544],[-0.1,-0.512,1],[-0.138,-0.53],[-0.172,-0.578],[-0.196,-0.58,1],[-0.172,-0.582],[-0.164,-0.596],[-0.167,-0.638],[-0.161,-0.652],[-0.177,-0.685],[-0.176,-0.696,1],[-0.164,-0.682],[-0.154,-0.684],[-0.13,-0.726],[-0.11,-0.75],[-0.1,-0.756,1],[-0.109,-0.784],[-0.134,-0.828],[-0.156,-0.856],[-0.18,-0.876,1],[-0.16,-0.872],[-0.12,-0.848],[-0.104,-0.828],[-0.056,-0.784,1],[-0.044,-0.783],[-0.012,-0.792],[0.024,-0.792],[0.036,-0.786],[0.068,-0.786],[0.084,-0.795],[0.096,-0.812],[0.136,-0.848]],
    catW: [[0.012,-0.656,1],[0.024,-0.648],[0.048,-0.6],[0.094,-0.564],[0.12,-0.512,1],[0.084,-0.476,1],[0.091,-0.448],[0.092,-0.412],[0.083,-0.38],[0.069,-0.344],[0.041,-0.296],[0.03,-0.26],[0.02,-0.249],[0.004,-0.244,1],[-0.01,-0.256],[-0.02,-0.296],[-0.051,-0.348],[-0.071,-0.404],[-0.07,-0.452],[-0.06,-0.476,1],[-0.1,-0.512,1],[-0.075,-0.564],[-0.028,-0.6],[-0.001,-0.648]],
    catWL: [[[-0.016,-0.604],[-0.04,-0.58]],[[0.06,-0.58],[0.036,-0.604]]],
    catPawL: [[-0.004,-0.096,1],[0.008,-0.02],[0.004,0.016,1],[-0.008,0.022],[-0.04,0.028],[-0.08,0.022],[-0.092,0.016,1],[-0.096,-0.008],[-0.082,-0.04],[-0.088,-0.088,1],[-0.044,-0.087]],
    catPawR: [[0.02,-0.104,1],[0.052,-0.087],[0.076,-0.086],[0.096,-0.092,1],[0.104,-0.076],[0.1,-0.052],[0.108,-0.012],[0.104,0.016,1],[0.092,0.023],[0.056,0.028],[0.028,0.023],[0.014,0.012],[0.008,-0.012]],
    catEarL: [[-0.184,-0.88,1],[-0.168,-0.874],[-0.147,-0.852],[-0.118,-0.812],[-0.101,-0.776],[-0.107,-0.752],[-0.146,-0.688],[-0.164,-0.676,1],[-0.176,-0.688],[-0.186,-0.712],[-0.2,-0.792],[-0.196,-0.852]],
    catEarR: [[0.204,-0.88,1],[0.21,-0.868],[0.216,-0.832],[0.212,-0.768],[0.195,-0.696],[0.184,-0.681],[0.172,-0.676,1],[0.154,-0.708],[0.122,-0.748],[0.116,-0.772],[0.142,-0.824],[0.172,-0.864],[0.188,-0.878]],
  };

  // ============================== palette of the traced design ==============================
  const PAL = {
    line: '#2b1d16', skin: '#f6c293', skinS: '#dda77a', hair: '#30201a', hairLine: '#261812', hairHi: '#47322a',
    shirt: '#f5dab4', shirtS: '#dcc09a', navy: '#474e5e', navyS: '#353b47', navyLine: '#20232b', button: '#9a8c7e', buttonS: '#6d6a67',
    clip: '#e2a02e', clipS: '#b87a1c', blush: '#f5a37e', eyeW: '#f3dcc2', iris: '#2a1c14', under: '#25211f',
    cat: '#37332f', catLine: '#191614', catW: '#efdcbf', catEar: '#ab7567', catNose: '#d98f7c', catHi: '#56504a',
  };
  // the seated pose behind the traced drawing (same frame as pose(): x = her left, y up, z forward)
  function poseFront(t = 0, o = {}) {
    const sw = o.swing ?? 1;
    const a1 = Math.sin(t * 1.1) * 0.16 * sw, a2 = Math.sin(t * 1.1 + 2.2) * 0.14 * sw;
    const shin = (k, ang, len = 1.4) => [k[0], k[1] - Math.cos(ang) * len, k[2] + Math.sin(ang) * len];
    const kL = [0.2, 0.2, 1.25], kR = [-0.2, 0.2, 1.25], aL = shin(kL, a1), aR = shin(kR, a2);
    return {
      pelvis: [0, 0.25, 0], hipL: [0.3, 0.22, 0.05], hipR: [-0.3, 0.22, 0.05], kneeL: kL, kneeR: kR, ankleL: aL, ankleR: aR,
      toeL: [aL[0], aL[1] - 0.3, aL[2] + 0.12], toeR: [aR[0], aR[1] - 0.3, aR[2] + 0.12], swingL: a1, swingR: a2,
      waist: [0, 0.95, -0.03], chest: [0, 1.32, 0], neck: [0, 1.71, 0], head: [0, 2.44, 0.06],
      shL: [0.57, 1.6, -0.03], shR: [-0.57, 1.6, -0.03], elL: [0.66, 0.8, -0.1], elR: [-0.66, 0.8, -0.1],
      wrL: [0.87, 0.1, 0.3], wrR: [-0.87, 0.1, 0.3], finL: [1.09, 0.03, 0.5], finR: [-1.09, 0.03, 0.5],
    };
  }
  const JF0 = poseFront(0, { swing: 0 });
  function skinF(keyTh, th, J) {            // like skinner(), for the traced pose
    if (Math.abs(keyTh - th) < 1e-5) return (pts) => pts;
    const kc = camera(keyTh), cc = camera(th), K = JN.map((n) => kc.p2(JF0[n])), C = JN.map((n) => cc.p2(J[n]));
    return (pts) => pts.map(([x, y, c]) => { let sx = 0, sy = 0, sw = 0; for (let j = 0; j < K.length; j++) { const dx = x - K[j][0], dy = y - K[j][1], d2 = dx * dx + dy * dy + 0.015, w = 1 / (d2 * d2); sx += w * (C[j][0] + dx); sy += w * (C[j][1] + dy); sw += w; } return [sx / sw, sy / sw, c]; });
  }

  // ---- inking a painted area the way it is done by hand: a fresh stroke from corner to corner ----
  // Long smooth edges are cut into two or three strokes that overlap a little where the pencil was
  // lifted. `hide(i)` says which control points lie under something else and get no line.
  function inkEdges(ctx, C, pts, w = LW, o = {}) {
    if (INK.noLines) return;
    const n = pts.length, hide = o.hide || (() => false), maxRun = o.maxRun || 11, seed0 = o.seed || 1;
    let cuts = []; for (let i = 0; i < n; i++) if (pts[i][2] || (hide(i) !== hide((i + n - 1) % n))) cuts.push(i);
    if (!cuts.length) cuts = [0];
    for (let c = 0; c < cuts.length; c++) {
      const a = cuts[c]; let b = cuts[(c + 1) % cuts.length]; if (b <= a) b += n;
      if (hide(a % n) && hide((a + 1) % n)) continue;
      if (hide((a + 1) % n) || (b - a === 1 && hide(b % n) && hide(a % n))) continue;
      const parts = Math.max(1, Math.ceil((b - a) / maxRun)), len = (b - a) / parts;
      for (let k = 0; k < parts; k++) {
        const s = a + k * len - (k ? 0.35 : 0), e = a + (k + 1) * len + (k < parts - 1 ? 0.35 : 0);
        ink(ctx, C, s, e, w, { tin: 0.12, tout: 0.16, min: o.min ?? 0.4, wob: 0.1, seed: seed0 * 31 + c * 7 + k, color: o.color });
      }
    }
  }
  // one painted area: flat colour, its designed second tone(s), its line
  function cel(ctx, pts, col, o = {}) {
    const C = contour(pts, 0.006);
    paint(ctx, C.P, col);
    if (o.tones) for (const tn of o.tones) shadow(ctx, C.P, tn, o.toneCol);
    if (o.ink !== false) inkEdges(ctx, C, pts, o.w || LW, o);
    return C;
  }
  const strokes = (ctx, Ls, M, w, o) => { for (let i = 0; i < Ls.length; i++) line(ctx, M(Ls[i]), w, { tin: 0.3, tout: 0.4, seed: 5 + i, ...o }); };
  const oval = (cx, cy, rx, ry, n = 20, rot = 0) => { const a = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const q = i / n * 6.2832, x = Math.cos(q) * rx, y = Math.sin(q) * ry; a.push([cx + x * c - y * s, cy + x * s + y * c]); } return a; };
  const fillPts = (ctx, P, col) => { if (INK.noLines) return; path(ctx, P); ctx.fillStyle = INK.mode === 'paper' && col !== '#fff' ? INK.line : col; ctx.fill(); };

  // ============================== her head, front key ==============================
  const HO = [0.008, -2.4];                      // head anchor in the key drawing
  const U = 1 / 250;                             // the eye was measured in reference pixels
  const EYEF = {
    lid: [[-19.6, -1.2], [-18.4, -8.3], [-11.2, -15.7], [-0.9, -18.6], [9.1, -15.7], [14.6, -8.6], [16.0, -2.5]],
    shut: [[-19.0, 3.0], [-15.0, 6.2], [-8.0, 8.6], [-0.5, 9.4], [7.0, 8.4], [12.5, 6.0], [15.6, 3.2]],
    white: [[-16.6, 6.0], [-11.0, 13.2], [-1.0, 16.0], [8.6, 13.4], [13.6, 6.0]],
    crease: [[-9.9, -23.3], [0.6, -24.6], [13.1, -19.7]], brow: [[-31.3, -26.9], [-16.9, -33.6], [-0.9, -36.3], [16.1, -34.3]],
  };
  function eyeFront(ctx, M, cx, cy, flip, o) {
    if (INK.noLines) return;
    const { open = 1, gaze = 0 } = o, lc = PAL.line;
    const P = (a) => M(a.map(([x, y]) => [cx + flip * x * U, cy + y * U]));
    const lidPts = EYEF.lid.map((p, i) => [p[0] + (EYEF.shut[i][0] - p[0]) * (1 - open), p[1] + (EYEF.shut[i][1] - p[1]) * (1 - open)]);
    const up = spline(P(lidPts), false, 0.003), lo = spline(P([lidPts[0], ...EYEF.white, lidPts[lidPts.length - 1]]), false, 0.003);
    if (open > 0.12) {
      const opening = [...up, ...lo.slice().reverse()];
      ctx.save(); path(ctx, opening); ctx.clip();
      if (INK.mode !== 'paper') fillPts(ctx, opening, PAL.eyeW);
      const gx = gaze * 30;
      fillPts(ctx, M(oval(cx + (gx) * U, cy, 10.6 * U, 15.0 * U, 24)), PAL.iris);
      fillPts(ctx, M(oval(cx + (gx + 4.9) * U, cy - 3.3 * U, 2.5 * U, 3.7 * U, 12)), '#fff');
      ctx.restore();
    }
    ribbon(ctx, up, 0.0185, { tin: 0.16, tout: 0.2, min: 0.25, wob: 0.03, seed: 71, color: lc, press: (t) => 0.82 + 0.25 * Math.sin(Math.PI * t) });
    if (open > 0.5) {
      line(ctx, P([[-4.6, 15.9], [0.3, 16.3], [5.2, 15.8]]), 0.0065, { tin: 0.3, tout: 0.3, color: lc });
      line(ctx, P(EYEF.crease), 0.0055, { tin: 0.3, tout: 0.45, color: lc });
    }
    line(ctx, P(EYEF.brow.map(([x, y]) => [x, y + (1 - open) * 1.5])), 0.0105, { tin: 0.3, tout: 0.3, min: 0.2, color: lc, seed: 9 });
  }
  function headFront(ctx, at, o = {}) {
    const { roll = 0, blink = 0, sway = 0, gaze = 0 } = o;
    const yaw = Math.max(-0.55, Math.min(0.55, o.yaw || 0)), SL = 0.17 * Math.sin(yaw);
    const H = (p) => xf(p, { x: at[0], y: at[1], r: roll });
    const lc = PAL.line;
    const tipW = (y) => Math.max(0, y - 0.05);                                    // hair below the ears swings most
    const SWY = (p) => [p[0] + sway * 2.4 * tipW(p[1]) + sway * 0.25, p[1] + Math.abs(sway) * 0.3 * tipW(p[1]), p[2]];
    const fr = (y) => 0.8 * smooth(0.2, 0.03, y);                                       // how much an inner hair point belongs to the fringe
    // --- the hair behind everything: the outer silhouette only ---
    const hair = TR.hair, inn = TR.hairIn;
    paint(ctx, spline(H(hair.map(SWY)), true, 0.008), PAL.hair);
    paint(ctx, H(oval(0.0, 0.1, 0.5, 0.5, 30)), PAL.hair);
    // --- ears (the right one is the left one mirrored) ---
    const ear = (m) => { const pts = H(TR.earL.map(([x, y, c]) => [m * (x - 0.012) + 0.012, y, c])); if (m < 0) pts.reverse(); const C = cel(ctx, pts, PAL.skin, { color: lc, seed: 12, hide: (i) => { const k = m < 0 ? TR.earL.length - 1 - i : i; return TR.earL[k][0] > -0.34; } });
      line(ctx, H([[-0.368, 0.2], [-0.345, 0.235], [-0.352, 0.285], [-0.338, 0.32]].map(([x, y]) => [m * (x - 0.012) + 0.012, y])), 0.006, { tin: 0.3, tout: 0.3, color: lc }); return C; };
    ear(1); ear(-1);
    // --- face: the jaw as traced, mirrored for the other side, closed over the top under the hair ---
    const jaw = TR.jaw, nJ = jaw.length, chin = Math.floor(nJ / 2), chinSlide = (y) => SL * 0.3 * smooth(0.25, 0.6, y);
    const faceK = [...jaw.map(([x, y]) => [x + chinSlide(y), y]), [0.36, -0.2], [0.14, -0.38], [-0.12, -0.38], [-0.35, -0.2]];
    const fC = contour(H(faceK), 0.006);
    paint(ctx, fC.P, PAL.skin);
    ctx.save(); path(ctx, fC.P); ctx.clip();
    const M = (p) => H(p.map(([x, y, c]) => [x + SL * (1 - 0.6 * x * x / 0.16), y, c]));
    if (!INK.noLines && INK.mode !== 'paper') { fillPts(ctx, M(oval(-0.223, 0.273, 0.052, 0.03, 18)), PAL.blush); fillPts(ctx, M(oval(0.247, 0.269, 0.052, 0.03, 18)), PAL.blush); }
    const open = 1 - blink;
    eyeFront(ctx, M, -0.188, 0.145, 1, { open, gaze });
    eyeFront(ctx, M, 0.207, 0.145, -1, { open, gaze: -gaze });
    line(ctx, M([[-0.018, 0.172], [-0.012, 0.2], [-0.016, 0.232]]), 0.0065, { tin: 0.25, tout: 0.35, color: lc });         // nose
    line(ctx, M([[-0.024, 0.262], [-0.016, 0.276], [-0.008, 0.284]]), 0.0065, { tin: 0.3, tout: 0.4, color: lc });
    line(ctx, M([[0.024, 0.275], [0.03, 0.279]]), 0.007, { tin: 0.4, tout: 0.4, color: lc });
    line(ctx, M([[-0.046, 0.438], [0.004, 0.43], [0.062, 0.436]]), 0.0075, { tin: 0.25, tout: 0.3, color: lc });           // mouth
    line(ctx, M([[-0.002, 0.486], [0.022, 0.486]]), 0.006, { tin: 0.4, tout: 0.4, color: lc });
    ctx.restore();
    ink(ctx, fC, 0, chin + 0.7, LW, { tin: 0.1, tout: 0.2, color: lc, seed: 3 });                // left cheek to the chin
    ink(ctx, fC, chin - 0.7, nJ - 1, LW, { tin: 0.25, tout: 0.1, color: lc, seed: 4 });          // chin, picked up again, to the right cheek
    // --- the hair in front: the whole traced mass; its face-side edge rides with the head turn ---
    const top = hair.map((p, i) => { const q = SWY(p); return inn[i] ? [q[0] + SL * fr(p[1]) * (1 - 0.55 * sway * 0), q[1], p[2]] : q; });
    const hp = H(top), hC = contour(hp, 0.005);
    paint(ctx, hC.P, PAL.hair);
    inkEdges(ctx, hC, hp, LW * 0.8, { color: PAL.hairLine, maxRun: 9, min: 0.35, seed: 2 });
    // --- the yellow clip ---
    const cC = cel(ctx, H(TR.clip.map(SWY)), PAL.clip, { color: '#5a3a12', w: LW * 0.8, seed: 8 });
    if (!INK.noLines) { fillPts(ctx, H(oval(0.414, -0.21, 0.011, 0.03, 14, 0.42)), INK.mode === 'paper' ? INK.paper : PAL.hair); }
    return fC;
  }

  // ============================== the girl, front key (camera yaw 0), traced ==============================
  const FRONT_TURN = 0.5;                       // how far the front key can be bent toward the camera before it is held
  function legsFront(ctx, t = 0, o = {}, th = 0) {
    th = Math.max(-FRONT_TURN, Math.min(FRONT_TURN, th));
    const J = poseFront(t, o), K = skinF(0, th, J), lc = PAL.line, ky = 0.1;
    cel(ctx, K([[-0.36, 0.03], [0.0, 0.06], [0.375, 0.03], [0.38, 0.16], [0.2, 0.2], [-0.2, 0.2], [-0.362, 0.16]].map((p) => [p[0], p[1], 1])), PAL.under, { ink: false });
    for (const [key, a, cx] of [['legL', J.swingR, -0.19], ['legR', J.swingL, 0.21]]) {
      // a little swing from the knee: seen from the front the shin shortens or lengthens and the foot drifts
      const sw = (p) => { const d = Math.max(0, p[1] - ky), k = d / 1.7; return [cx + (p[0] - cx) * (1 + 0.1 * a * k) + 0.02 * a * k, ky + Math.min(0, p[1] - ky) + d * (1 + 0.3 * a), p[2]]; };
      const pts = K(TR[key].map(sw));
      cel(ctx, pts, PAL.skin, { color: lc, seed: key === 'legL' ? 41 : 42, maxRun: 9, hide: (i) => TR[key][i][1] < 0.02 });
      strokes(ctx, TR[key + 'L'], (l) => K(l.map(sw)), 0.006, { color: lc });
    }
  }
  function girlFront(ctx, t = 0, o = {}, th = 0) {
    const th0 = th; th = Math.max(-FRONT_TURN, Math.min(FRONT_TURN, th));
    const J = poseFront(t, o), K = skinF(0, th, J), lc = PAL.line;
    const br = 0.004 * Math.sin(t * 1.3);                                            // breathing: the chest lifts a hair
    const B = (p) => K(p.map(([x, y, c]) => [x, y - br * smooth(-0.6, -1.5, y), c]));
    if (o.legs !== false) legsFront(ctx, t, o, th);
    for (const a of ['armL', 'armR']) { const top = Math.min(...TR[a].map((p) => p[1])); cel(ctx, B(TR[a].map((p) => p[1] < top + 0.05 ? [p[0], p[1] - 0.05, p[2]] : p)), PAL.skin, { color: lc, seed: a === 'armL' ? 11 : 13, maxRun: 9 }); strokes(ctx, TR[a + 'L'], B, 0.006, { color: lc }); }
    cel(ctx, B(TR.neck), PAL.skin, { color: lc, tones: TR.neckT.map(B), toneCol: PAL.skinS, seed: 14 });
    strokes(ctx, TR.neckL, B, 0.006, { color: lc });
    for (const s of ['shirtL', 'shirtR', 'shirtC']) { const bot = Math.max(...TR[s].map((p) => p[1])); cel(ctx, B(s === 'shirtC' ? TR[s].map((p) => p[1] > bot - 0.03 ? [p[0], p[1] + 0.03, p[2]] : p) : TR[s]), PAL.shirt, { color: lc, seed: 15 + s.length + (s === 'shirtR' ? 3 : 0) }); strokes(ctx, TR[s + 'L'], B, 0.0065, { color: lc }); }
    line(ctx, B([[-0.215, -1.56], [-0.12, -1.515], [0.0, -1.5], [0.12, -1.515], [0.2, -1.555]]), 0.006, { tin: 0.3, tout: 0.3, color: lc });   // neckband of the T-shirt
    const pC = cel(ctx, B(TR.pina), PAL.navy, { color: PAL.navyLine, tones: TR.pinaT.map(B), toneCol: PAL.navyS, seed: 17, maxRun: 9, w: LW * 1.05 });
    strokes(ctx, TR.pinaL, B, 0.007, { color: PAL.navyLine });
    line(ctx, B([[-0.3, -0.757], [-0.15, -0.75], [0.0, -0.748], [0.15, -0.752], [0.275, -0.76]]), 0.0075, { tin: 0.15, tout: 0.2, color: PAL.navyLine, seed: 3 });   // waist seam
    line(ctx, B([[-0.29, -1.367], [-0.15, -1.375], [0.17, -1.375], [0.325, -1.367]]), 0.007, { tin: 0.15, tout: 0.2, color: PAL.navyLine, seed: 4 });               // top of the bib
    for (const bx of [-0.222, 0.248]) {
      const c = B([[bx, -1.285]])[0];
      if (!INK.noLines) { fillPts(ctx, oval(c[0], c[1], 0.04, 0.04, 22), PAL.button); if (INK.mode !== 'paper') fillPts(ctx, oval(c[0] + 0.004, c[1] + 0.004, 0.03, 0.03, 18), PAL.buttonS); if (INK.mode !== 'paper') fillPts(ctx, oval(c[0] - 0.002, c[1] - 0.003, 0.028, 0.028, 18), PAL.button); }
      ribbon(ctx, [...oval(c[0], c[1], 0.04, 0.04, 26), [c[0] + 0.04, c[1]]], 0.007, { tin: 0.05, tout: 0.05, color: PAL.navyLine, wob: 0.15 });
      line(ctx, [[c[0] - 0.05, c[1] - 0.02], [c[0] - 0.057, c[1] + 0.02], [c[0] - 0.03, c[1] + 0.052], [c[0] + 0.01, c[1] + 0.06]], 0.006, { color: PAL.navyLine, tin: 0.3, tout: 0.5 });
    }
    head: {
      const at = K([HO])[0];
      headFront(ctx, at, { ...o, yaw: (o.yaw || 0) - th0 * 0.5 });
    }
  }

  // ============================== the tuxedo kitten, front key, traced ==============================
  function catFront(ctx, at, o = {}) {
    const { t = 0, tail = 0, yaw = 0, blink = 0, ear = 0 } = o;
    const C = (p) => xf(p, { x: at[0], y: at[1] });
    const SL = 0.1 * Math.sin(Math.max(-0.6, Math.min(0.6, yaw))), lc = PAL.catLine;
    const tw = (x, y) => (y > -0.42 ? Math.max(0, Math.min(1, (-0.2 - x) / 0.22)) : 0);          // how far along the tail a point is
    const body = TR.cat.map(([x, y, c]) => { const k = tw(x, y), e = y < -0.74 ? Math.min(1, (-0.74 - y) / 0.1) : 0;
      return [x + k * k * (0.03 * Math.sin(t * 2.1) + 0.02 * tail) + e * ear * 0.022 * Math.sign(x) + (y < -0.5 && y > -0.74 ? SL * 0.15 : 0), y - k * k * (0.07 * tail + 0.015 * Math.sin(t * 1.3)) - e * ear * 0.012, c]; });
    const bp = C(body), bC = contour(bp, 0.005);
    paint(ctx, bC.P, PAL.cat);
    const F = (p) => C(p.map(([x, y, c]) => [x + SL * smooth(-0.42, -0.56, y), y, c]));          // the face slides a little when it looks round
    for (const k of ['catEarL', 'catEarR']) { const s = k === 'catEarL' ? -1 : 1; cel(ctx, C(TR[k].map(([x, y, c]) => [x + ear * 0.02 * s, y - ear * 0.012, c])), PAL.catEar, { ink: false }); }
    const wC = cel(ctx, F(TR.catW), PAL.catW, { ink: false });
    cel(ctx, C(TR.catPawL), PAL.catW, { color: lc, w: LW * 0.8, seed: 3 }); cel(ctx, C(TR.catPawR), PAL.catW, { color: lc, w: LW * 0.8, seed: 4 });
    for (const x of [-0.074, -0.04, 0.052, 0.086]) line(ctx, C([[x, -0.045], [x + 0.002, -0.008]]), 0.005, { color: lc, tin: 0.3, tout: 0.3 });
    inkEdges(ctx, bC, bp, LW, { color: lc, maxRun: 9, seed: 6 });
    // inner drawing: the legs and haunches, a shade lighter than the coat so they read on black
    const hi = INK.mode === 'paper' ? INK.line : PAL.catHi;
    line(ctx, C([[-0.085, -0.5], [-0.11, -0.3], [-0.095, -0.1]]), 0.006, { color: hi, tin: 0.4, tout: 0.3 }); line(ctx, C([[0.1, -0.5], [0.125, -0.3], [0.105, -0.1]]), 0.006, { color: hi, tin: 0.4, tout: 0.3 });
    line(ctx, C([[-0.16, -0.3], [-0.2, -0.17], [-0.17, -0.05]]), 0.006, { color: hi, tin: 0.4, tout: 0.4 }); line(ctx, C([[0.17, -0.3], [0.215, -0.17], [0.19, -0.05]]), 0.006, { color: hi, tin: 0.4, tout: 0.4 });
    if (INK.noLines) return;
    // face
    for (const [ex, s] of [[-0.07, 1], [0.102, -1]]) {
      const ey = -0.63, op = 1 - blink;
      const E = (p) => F(p.map(([x, y]) => [ex + x, ey + y]));
      if (op > 0.15) {
        const ring = E(oval(0, 0, 0.042, 0.047 * op, 22));
        fillPts(ctx, ring, INK.mode === 'paper' ? INK.paper : PAL.catW);
        ctx.save(); path(ctx, ring); ctx.clip(); fillPts(ctx, E(oval(0.003 * s, 0.003, 0.023, 0.037, 18)), '#17110d'); ctx.restore();
        fillPts(ctx, E(oval(0.008, -0.014 * op, 0.006, 0.007, 10)), '#fff');
        ribbon(ctx, [...ring, ring[0]], 0.0065, { tin: 0.05, tout: 0.05, color: lc });
      } else line(ctx, E([[-0.04, 0], [0, 0.012], [0.04, 0]]), 0.008, { color: INK.mode === 'paper' ? INK.line : PAL.catHi, tin: 0.2, tout: 0.2 });
    }
    fillPts(ctx, spline(F([[-0.004, -0.582, 1], [0.03, -0.582, 1], [0.013, -0.562, 1]]), true), PAL.catNose);
    line(ctx, F([[-0.004, -0.582], [0.03, -0.582], [0.013, -0.562], [-0.004, -0.582]].map((p) => [p[0], p[1], 1])), 0.0045, { color: lc, tin: 0.1, tout: 0.1 });
    line(ctx, F([[0.013, -0.562], [0.013, -0.535]]), 0.005, { color: lc, tin: 0.2, tout: 0.2 });
    line(ctx, F([[-0.008, -0.522], [0.003, -0.532], [0.013, -0.535], [0.023, -0.532], [0.034, -0.522]]), 0.005, { color: lc, tin: 0.3, tout: 0.3 });
    const wc = INK.mode === 'paper' ? INK.line : '#2a2420';
    for (const [a, b, c2] of [[[-0.09, -0.585], [-0.17, -0.6], [-0.245, -0.59]], [[-0.1, -0.56], [-0.17, -0.545], [-0.23, -0.52]], [[-0.095, -0.535], [-0.15, -0.51], [-0.21, -0.475]]])
      for (const m of [1, -1]) line(ctx, F([a, b, c2].map(([x, y]) => [m * (x - 0.013) + 0.013, y])), 0.004, { color: wc, tin: 0.1, tout: 0.7 });
  }
  // ============================== the girl's head, 3/4 view ==============================
  // Layers sit at different depths and slide past each other when she turns her head (yaw),
  // the way a 2D animation rig fakes rotation. Hair tips sway; the eyes blink and look around.
  // proportions measured from a hand-drawn reference frame: round face, full cheeks, soft small chin, longer lower face
  const FACE34 = [[-0.36, -0.18], [-0.395, -0.04], [-0.4, 0.1], [-0.385, 0.24], [-0.335, 0.37], [-0.25, 0.46], [-0.13, 0.505], [0.0, 0.49], [0.13, 0.42], [0.24, 0.29], [0.305, 0.1], [0.31, -0.22], [0.1, -0.42], [-0.22, -0.38]];
  function head34(ctx, at, o = {}) {
    const { yaw = 0, roll = -0.05, blink = 0, sway = 0, gaze = 0 } = o;
    const S = Math.sin(yaw);
    const H = (p) => xf(p, { x: at[0], y: at[1], r: roll });
    const D = (p, d) => p.map(([x, y, c]) => [x + d * S, y, c]);                                // parallax by depth
    const sd = (x, y) => Math.sqrt(Math.max(0, 0.25 - x * x - y * y));                            // depth on a head-sized sphere
    const DS = (p, k = 1, cx, cy) => p.map(([x, y, c]) => [x + k * sd(cx ?? x, cy ?? y) * S, y, c]);  // slide along the sphere
    const SW = (p, k) => p.map(([x, y, c]) => [x + sway * k * Math.max(0, y + 0.25), y + Math.abs(sway) * k * 0.15 * Math.max(0, y + 0.25), c]);
    const W = W0 * 1.05;
    // back hair (behind the head)
    shape(ctx, H(D(SW([[-0.2, 0.1], [-0.3, -0.4], [0.05, -0.6], [0.45, -0.45], [0.58, -0.12], [0.585, 0.16], [0.54, 0.36], [0.44, 0.52, 1], [0.36, 0.4], [0.28, 0.31], [0.14, 0.27], [0.0, 0.25]], 0.5), -0.25)), { fill: COL.hair, shade: COL.hairS, sk: 1.3, w: W });
    // bow at the back of the half-up tie: behind the crown, peeking out
    const bowD = -0.45;
    shape(ctx, H(D(SW([[0.48, -0.36], [0.58, -0.47], [0.65, -0.41], [0.61, -0.33], [0.52, -0.32, 1]], 0.2), bowD)), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.4, w: W * 0.75 });
    shape(ctx, H(D(SW([[0.5, -0.31], [0.6, -0.24], [0.61, -0.15, 1], [0.54, -0.17], [0.48, -0.25, 1]], 0.3), bowD)), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.4, w: W * 0.75 });
    // face
    const face = H(FACE34.map(([x, y, c]) => [x - (x < -0.2 ? 0.1 * Math.max(0, S) * smooth(-0.2, -0.36, x) : 0) + (x > 0.2 ? -0.04 * Math.max(0, -S) : 0), y, c]));
    shape(ctx, face, { fill: COL.skin, w: W });                                            // faces stay flat-lit
    // ---- everything on the face is clipped to it and slides with the turn ----
    ctx.save(); path(ctx, spline(face, true)); ctx.clip();
    const F = (p, cx, cy) => H(DS(p, 1, cx, cy));
    // shadow of the fringe on the forehead
    if (INK.mode !== 'paper') { path(ctx, spline(H(DS([[-0.42, -0.5], [0.3, -0.5], [0.26, -0.02], [0.15, 0.0], [0.05, 0.01], [-0.05, 0.015], [-0.16, 0.0], [-0.3, 0.015], [-0.42, 0.0]])), true)); ctx.fillStyle = COL.skinS; ctx.fill(); }
    blush(ctx, ...F([[0.085, 0.235]])[0].slice(0, 2), 0.082, 0.036, 0.62); blush(ctx, ...F([[-0.3, 0.235]])[0].slice(0, 2), 0.036, 0.03, 0.5);
    const open = 1 - blink;
    // tall oval eyes near the middle of the face, almost all iris
    eye(ctx, (p) => F(p, 0.03, 0.09), 0.03, 0.09, 0.145 * (1 - 0.15 * S), 0.19, { open, gaze, dir: 1, lid: 0.02 });
    eye(ctx, (p) => F(p, -0.228, 0.09), -0.228 - 0.02 * S, 0.09, 0.092 * (1 + 0.55 * S), 0.18, { open, gaze, dir: -1, lid: 0.018 });
    stroke(ctx, F([[-0.02, -0.03], [0.04, -0.045], [0.09, -0.036]]), 0.008, { tin: 0.3, tout: 0.5 });
    stroke(ctx, F([[-0.29, -0.026], [-0.262, -0.036], [-0.238, -0.034]]), 0.007, { tin: 0.3, tout: 0.5 });
    stroke(ctx, F([[-0.262, 0.268], [-0.248, 0.28]], -0.255, 0.27), 0.008, { tin: 0.3, tout: 0.4 });
    stroke(ctx, F([[-0.2, 0.392], [-0.172, 0.398], [-0.148, 0.394]]), 0.009, { tin: 0.3, tout: 0.4 });
    ctx.restore();
    // shadow under the jaw is drawn by the neck; ear hidden by hair
    // ---- crown + near-side lock (front hair). The forehead edge rides on the face (parallax). ----
    const capD = (p) => p.map(([x, y, c]) => [x + (y > -0.3 && x < 0.24 ? sd(x, y) : 0) * S, y, c]);
    shape(ctx, H(capD(SW([
      [-0.4, 0.0], [-0.44, -0.2], [-0.38, -0.4], [-0.2, -0.55], [0.05, -0.61], [0.3, -0.56], [0.47, -0.42], [0.56, -0.2], [0.56, 0.05], [0.5, 0.25], [0.4, 0.5, 1],
      [0.33, 0.3], [0.27, 0.12], [0.22, -0.04], [0.19, -0.12], [0.12, -0.19], [0.0, -0.22], [-0.15, -0.21], [-0.3, -0.17], [-0.38, -0.13],
    ], 0.3))), { fill: COL.hair, shade: COL.hairS, sk: 1.2, w: W });
    // fringe locks, outer ones first; chunky, few, tips leaning to her front
    const lock = (root, tip, w, bend, seed, k = 0.12) => {
      const dx = tip[0] - root[0], dy = tip[1] - root[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      const m = (q, side) => [root[0] + dx * q + nx * side * w + bend * nx * 0.5, root[1] + dy * q + ny * side * w + bend * ny * 0.5];
      const pts = SW([[root[0] - nx * w * 0.5, root[1] - ny * w * 0.5], m(0.35, -0.55), m(0.75, -0.32), [tip[0], tip[1], 1], m(0.72, 0.38), m(0.35, 0.55), [root[0] + nx * w * 0.5, root[1] + ny * w * 0.5]], k);
      const P = H(DS(pts));
      shape(ctx, P, { fill: COL.hair, shade: COL.hairS, sk: 0.6, line: false });
      stroke(ctx, P, 0.0095, { tin: 0.05, tout: 0.05, min: 0.55, seed, lost: 0.5, closed: false });
    };
    lock([0.17, -0.31], [0.152, -0.035], 0.1, 0.02, 61);
    lock([-0.33, -0.3], [-0.372, -0.02], 0.1, -0.02, 62);
    lock([0.05, -0.36], [-0.02, -0.045], 0.15, 0.035, 63);
    lock([-0.2, -0.35], [-0.29, -0.04], 0.14, 0.03, 64);
    lock([-0.075, -0.36], [-0.165, -0.065], 0.13, 0.03, 65);
    // crown flow + the gathered half-up band
    for (const s of [[[0.05, -0.6], [-0.1, -0.5], [-0.2, -0.4]], [[0.12, -0.6], [0.26, -0.5], [0.33, -0.38]], [[0.46, -0.08], [0.48, 0.1], [0.45, 0.28]]])
      stroke(ctx, H(D(SW(s, 0.3), 0.1)), 0.007, { tin: 0.25, tout: 0.5 });
    stroke(ctx, H(D([[0.2, -0.2], [0.33, -0.3], [0.47, -0.35]], 0.0)), 0.008, { tin: 0.3, tout: 0.2 });
    // far-side lock, slim, falling in front of the cheek
    shape(ctx, H(D(SW([[-0.37, -0.12], [-0.42, 0.02], [-0.435, 0.18], [-0.41, 0.33], [-0.36, 0.45, 1], [-0.355, 0.3], [-0.34, 0.14], [-0.335, 0.0]], 0.55), -0.1)), { fill: COL.hair, shade: COL.hairS, sk: 0.5, w: W * 0.9 });
    // bow knot in front of the band
    shape(ctx, H(D([[0.47, -0.37], [0.53, -0.38], [0.54, -0.3], [0.48, -0.29]], bowD * 0.6)), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.3, w: W * 0.65 });
    return face;
  }

  // ============================== the girl, front 3/4 key (camera yaw 0.7) ==============================
  const TH07 = 0.7, J0 = pose(0);
  function girl07(ctx, t = 0, o = {}, th = TH07) {
    const cam = camera(th), J = pose(t, o), K = skinner(TH07, th, J0, J);
    const dress = K([
      [-0.14, -1.67], [-0.31, -1.66], [-0.39, -1.57], [-0.35, -1.36], [-0.31, -1.15], [-0.25, -0.95], [-0.28, -0.74],
      [-0.45, -0.5], [-0.72, -0.33], [-0.98, -0.24], [-1.12, -0.12], [-1.15, 0.02, 1], [-1.03, 0.07], [-0.88, 0.04], [-0.78, 0.1],
      [-0.66, 0.13], [-0.52, 0.17, 1], [-0.32, 0.17], [-0.05, 0.13], [0.22, 0.1], [0.45, 0.04, 1],
      [0.46, -0.3], [0.31, -0.9], [0.36, -1.22], [0.41, -1.5], [0.14, -1.69],
    ]);
    if (o.legs !== false) { arm(ctx, cam, J, 'R'); hand(ctx, cam, J, 'R'); }
    sleeve(ctx, cam, J, 'R');
    if (o.legs !== false) { shin(ctx, cam, J, 'R', dress); shoe(ctx, cam, J, 'R'); shin(ctx, cam, J, 'L', dress); shoe(ctx, cam, J, 'L'); }
    const kh = camera(TH07).p2(J0.head), headAt = K([[kh[0] - 0.01, kh[1] + 0.05]])[0];
    const neck = K([[-0.17, -1.95], [-0.15, -1.66], [0.17, -1.64], [0.15, -1.98]]);
    shape(ctx, neck, { fill: COL.skin, shade: COL.skinS, sk: 0.6, w: W0 * 0.8 });
    cast(ctx, xf(FACE34, { x: headAt[0], y: headAt[1], r: -0.05 }), neck, [0.0, 0.07], COL.skinS);
    shape(ctx, dress, { fill: COL.dress, shade: COL.dressS, sk: 1.6, w: W0 });
    const dS = COL.dressS;
    fold(ctx, K([[-0.25, -0.93], [-0.05, -0.86], [0.15, -0.86], [0.31, -0.9]]), 0.007, null, { tin: 0.2, tout: 0.2 });
    fold(ctx, K([[-0.12, -0.6], [-0.4, -0.3], [-0.68, -0.08], [-0.8, 0.06]]), 0.009, dS, { tin: 0.45, tout: 0.25 });
    fold(ctx, K([[-0.05, -0.82], [-0.25, -0.55], [-0.5, -0.36]]), 0.007, dS);
    fold(ctx, K([[0.18, -0.78], [0.2, -0.4], [0.12, -0.05], [0.08, 0.1]]), 0.008, dS);
    fold(ctx, K([[0.34, -0.5], [0.36, -0.12], [0.33, 0.05]]), 0.007, dS);
    fold(ctx, K([[-0.98, -0.18], [-1.03, -0.02], [-1.0, 0.05]]), 0.007, dS);
    fold(ctx, K([[-0.55, 0.02], [-0.6, 0.13]]), 0.007, dS);
    for (const [x, y] of K([[-0.19, -1.43], [-0.17, -1.25], [-0.15, -1.07]])) ellipse(ctx, x, y, 0.014, 0.014, 0, INK.mode === 'paper' ? INK.line : '#f4f0e6');
    const colL = K([[-0.12, -1.66], [-0.24, -1.68], [-0.35, -1.63], [-0.36, -1.56], [-0.26, -1.52], [-0.14, -1.57, 1]]);
    const colR = K([[-0.12, -1.66], [-0.0, -1.71], [0.17, -1.7], [0.29, -1.64], [0.27, -1.55], [0.08, -1.54], [-0.1, -1.57, 1]]);
    cast(ctx, colR, dress, [0.01, 0.04], dS); cast(ctx, colL, dress, [0.01, 0.04], dS);
    shape(ctx, colL, { fill: COL.collar, shade: COL.collarS, sk: 0.5, w: W0 * 0.6 });
    shape(ctx, colR, { fill: COL.collar, shade: COL.collarS, sk: 0.5, w: W0 * 0.6 });
    const P = cam.p2;
    cast(ctx, limbOutline([P(J.shL), P(J.elL), P(J.wrL)], [[0, 0.072], [1, 0.04]]), dress, [0.05, 0.02], dS);
    arm(ctx, cam, J, 'L'); hand(ctx, cam, J, 'L'); sleeve(ctx, cam, J, 'L');
    head34(ctx, headAt, { ...o, yaw: (o.yaw || 0) + (TH07 - th) });
  }

  // ============================== the girl, back 3/4 key (camera yaw 2.44) ==============================
  // back of the head: she looks away; a sliver of cheek shows ("lost profile") and grows as we come round
  function headBackOld(ctx, at, o = {}) {
    const { yaw = 0, roll = 0.04, sway = 0 } = o;
    const S = Math.sin(yaw);
    const H = (p) => xf(p, { x: at[0], y: at[1], r: roll });
    const SW = (p, k) => p.map(([x, y, c]) => [x + sway * k * Math.max(0, y + 0.25), y, c]);
    const W = W0 * 1.05;
    shape(ctx, H([[-0.17, 0.25], [-0.17, 0.62], [0.17, 0.64], [0.18, 0.25]]), { fill: COL.skin, shade: COL.skinS, sk: 0.5, w: W * 0.8 });
    const ch = Math.max(0, S) * 0.12;                         // cheek grows when she turns toward us
    shape(ctx, H([[-0.3, -0.08], [-0.355 - ch, 0.03], [-0.37 - ch, 0.16], [-0.34 - ch * 0.8, 0.29], [-0.28 - ch * 0.5, 0.38], [-0.2, 0.42], [-0.12, 0.38], [-0.12, 0.0]]), { fill: COL.skin, shade: COL.skinS, sk: 0.4, w: W * 0.9 });
    if (S > -0.1) stroke(ctx, H([[-0.355 - ch, 0.085], [-0.39 - ch * 1.3, 0.07]]), 0.011, { tin: 0.1, tout: 0.6 });
    if (ch > 0.03 && INK.mode !== 'paper') blush(ctx, ...H([[-0.33 - ch * 0.6, 0.25]])[0].slice(0, 2), 0.04, 0.03, 0.4);
    const hair = H(SW([
      [-0.34, -0.12], [-0.43, -0.3], [-0.31, -0.5], [-0.05, -0.61], [0.25, -0.56], [0.45, -0.39], [0.53, -0.13], [0.5, 0.14], [0.43, 0.36], [0.37, 0.5, 1],
      [0.22, 0.53], [0.06, 0.545], [-0.08, 0.52], [-0.19, 0.47, 1], [-0.24, 0.3], [-0.3, 0.12], [-0.33, 0.0],
    ].map(([x, y, c]) => [x + (x < -0.25 ? -ch * 0.3 : 0), y, c]), 0.5));
    shape(ctx, hair, { fill: COL.hair, shade: COL.hairS, sk: 1.3, w: W });
    const D = (p, d) => p.map(([x, y, c]) => [x + d * S, y, c]);
    for (const s2 of [[[-0.33, -0.42], [-0.15, -0.31], [0.02, -0.24]], [[0.05, -0.58], [0.07, -0.42], [0.08, -0.29]], [[0.44, -0.33], [0.3, -0.27], [0.17, -0.23]]])
      stroke(ctx, H(D(s2, -0.3)), 0.007, { tin: 0.25, tout: 0.45 });
    for (const s2 of [[[-0.2, -0.03], [-0.17, 0.18], [-0.14, 0.36]], [[0.03, -0.06], [0.05, 0.2], [0.06, 0.4]], [[0.28, -0.06], [0.31, 0.2], [0.31, 0.41]], [[0.47, -0.06], [0.48, 0.16], [0.45, 0.32]]])
      stroke(ctx, H(SW(D(s2, -0.25), 0.5)), 0.007, { tin: 0.25, tout: 0.45 });
    const B = (p, k = 0.15) => H(SW(D(p, -0.4), k));
    shape(ctx, B([[0.06, -0.21], [0.0, -0.13, 1], [0.05, 0.02], [0.02, 0.14, 1], [0.1, 0.1], [0.12, -0.04], [0.11, -0.2]], 0.6), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.4, w: W * 0.7 });
    shape(ctx, B([[0.06, -0.24], [-0.06, -0.33], [-0.15, -0.28], [-0.13, -0.17], [-0.02, -0.18, 1]]), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.4, w: W * 0.75 });
    shape(ctx, B([[0.12, -0.24], [0.24, -0.34], [0.32, -0.27], [0.29, -0.16], [0.17, -0.18, 1]]), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.4, w: W * 0.75 });
    shape(ctx, B([[0.04, -0.27], [0.13, -0.28], [0.14, -0.17], [0.05, -0.16]]), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.3, w: W * 0.65 });
    stroke(ctx, B([[-0.08, -0.27], [-0.03, -0.23]]), 0.005); stroke(ctx, B([[0.24, -0.28], [0.19, -0.23]]), 0.005);
  }
  const TB_OLD = 2.44;
  function girlBackOld(ctx, t = 0, o = {}, th = TB) {
    const cam = camera(th), J = pose(t, o), K = skinner(TB, th, J0, J);
    arm(ctx, cam, J, 'R'); sleeve(ctx, cam, J, 'R');
    const dress = K([
      [-0.16, -1.68], [-0.33, -1.6], [-0.39, -1.42], [-0.33, -1.15], [-0.27, -0.94], [-0.34, -0.66], [-0.5, -0.47], [-0.74, -0.43], [-0.96, -0.46], [-1.1, -0.38, 1],
      [-1.04, -0.25], [-0.9, -0.17], [-0.7, -0.06], [-0.42, 0.04], [-0.1, 0.08], [0.2, 0.06], [0.42, -0.02, 1], [0.44, -0.36], [0.33, -0.93],
      [0.37, -1.2], [0.42, -1.5], [0.36, -1.62], [0.16, -1.7],
    ]);
    shape(ctx, dress, { fill: COL.dress, shade: COL.dressS, sk: 1.6, w: W0 });
    const dS = COL.dressS;
    fold(ctx, K([[0.02, -1.66], [0.03, -1.3], [0.03, -0.98]]), 0.006, null, { tin: 0.2, tout: 0.2 });
    for (const f2 of [[[-0.2, -0.75], [-0.3, -0.35], [-0.42, 0.0]], [[0.0, -0.72], [-0.02, -0.3], [-0.06, 0.04]], [[0.22, -0.74], [0.27, -0.35], [0.3, 0.0]], [[-0.58, -0.4], [-0.68, -0.18], [-0.72, -0.08]]])
      fold(ctx, K(f2), 0.008, dS, { tin: 0.45, tout: 0.3 });
    fold(ctx, K([[-0.62, -0.47], [-0.58, -0.52], [-0.5, -0.5]]), 0.007, dS);
    // sash with a bow at the back
    const sash = K([[-0.27, -1.0], [0.02, -0.96], [0.33, -1.0], [0.33, -0.88], [0.02, -0.84], [-0.27, -0.88]]);
    shape(ctx, sash, { fill: COL.dress, shade: COL.dressS, sk: 0.5, w: W0 * 0.6 });
    const bw = (p) => K(p);
    for (const b2 of [[[0.0, -0.93], [-0.16, -1.04], [-0.24, -0.97], [-0.2, -0.86], [-0.03, -0.88, 1]], [[0.06, -0.93], [0.22, -1.04], [0.3, -0.97], [0.26, -0.86], [0.09, -0.88, 1]], [[-0.03, -0.88], [-0.1, -0.6], [-0.03, -0.62, 1], [0.0, -0.7], [0.03, -0.9]], [[0.06, -0.88], [0.15, -0.62], [0.08, -0.6, 1], [0.04, -0.7], [0.03, -0.9]], [[-0.03, -0.97], [0.08, -0.97], [0.08, -0.86], [-0.03, -0.86]]])
      shape(ctx, bw(b2), { fill: COL.dress, shade: COL.dressS, sk: 0.35, w: W0 * 0.65 });
    const col = K([[-0.3, -1.6], [-0.16, -1.7], [0.12, -1.71], [0.3, -1.63], [0.29, -1.55], [0.02, -1.58], [-0.27, -1.53]]);
    cast(ctx, col, dress, [0.0, 0.035], dS);
    shape(ctx, col, { fill: COL.collar, shade: COL.collarS, sk: 0.5, w: W0 * 0.6 });
    const P = cam.p2;
    cast(ctx, limbOutline([P(J.shL), P(J.elL), P(J.wrL)], [[0, 0.072], [1, 0.04]]), dress, [0.05, 0.02], dS);
    arm(ctx, cam, J, 'L'); hand(ctx, cam, J, 'L'); sleeve(ctx, cam, J, 'L');
    const kh = camera(TB).p2(J0.head), headAt = K([[kh[0], kh[1] + 0.06]])[0];
    headBack(ctx, headAt, { ...o, yaw: (o.yaw || 0) + (TB - th) * 0.8 });
  }

  // ============================== the black cat, 3/4 key ==============================
  function cat07(ctx, at, o = {}) {
    const { t = 0, tail = 0, yaw = 0, blink = 0, ear = 0 } = o;
    const C = (p) => xf(p, { x: at[0], y: at[1] });
    const W = W0 * 0.95, cl = { fill: COL.cat, hi: COL.catHi, color: COL.catLine };
    const line = INK.mode === 'paper' ? INK.line : COL.catLine;
    shape(ctx, C([[-0.27, 0.0], [-0.27, -0.22], [-0.3, -0.46], [-0.27, -0.66], [-0.2, -0.8], [-0.02, -0.82], [0.1, -0.66], [0.23, -0.44], [0.33, -0.2], [0.35, -0.04], [0.3, 0.02, 1]]), { ...cl, sk: 0.9, w: W });
    stroke(ctx, C([[0.04, -0.4], [0.17, -0.24], [0.22, -0.08], [0.2, 0.0]]), 0.011, { tin: 0.35, tout: 0.3, color: INK.mode === 'paper' ? INK.line : COL.catHi });
    stroke(ctx, C([[-0.15, -0.42], [-0.15, -0.2], [-0.14, -0.02]]), 0.008, { tin: 0.5, tout: 0.2, color: INK.mode === 'paper' ? INK.line : COL.catHi });
    // the little white chest tuft
    shape(ctx, C([[-0.29, -0.62], [-0.24, -0.6], [-0.22, -0.53], [-0.255, -0.47, 1], [-0.28, -0.53]]), { fill: '#f1ede6', w: 0.004, color: line });
    shape(ctx, C([[-0.34, 0.01], [-0.33, -0.04], [-0.25, -0.05], [-0.21, -0.01], [-0.24, 0.02]]), { ...cl, sk: 0.4, w: W * 0.8 });
    shape(ctx, C([[-0.21, 0.01], [-0.2, -0.04], [-0.12, -0.05], [-0.08, -0.01], [-0.11, 0.02]]), { ...cl, sk: 0.4, w: W * 0.8 });
    // tail round the paws; the tip lifts and flicks
    const tip = [-0.4 + 0.035 * Math.sin(t * 2.1), -0.05 - 0.06 * tail - 0.02 * Math.sin(t * 1.3)];
    const c = [[0.3, -0.03], [0.26, 0.06], [0.08, 0.1], [-0.14, 0.09], [-0.3, 0.06 - 0.02 * tail], tip];
    const L = [], R = []; for (let i = 0; i < c.length; i++) { const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const w = (0.1 - 0.06 * i / (c.length - 1)) / 2; L.push([c[i][0] - ty * w, c[i][1] + tx * w]); R.push([c[i][0] + ty * w, c[i][1] - tx * w]); }
    shape(ctx, C([...L, [tip[0] - 0.035, tip[1] - 0.01, 1], ...R.reverse()]), { ...cl, sk: 0.5, w: W * 0.85 });
    // head (scaled up round the neck), features slide with the turn
    const S = Math.sin(yaw);
    const HS = (p, d = 0) => p.map(([x, y, k]) => [-0.12 + (x + d * S + 0.12) * 1.18, -0.8 + (y + 0.8) * 1.12, k]);
    const earT = (p, k) => p.map(([x, y, c2]) => [x + ear * k * 0.03, y + ear * k * 0.02, c2]);
    const head = C(HS([[-0.33, -0.98], [-0.31, -1.08], ...earT([[-0.335, -1.31, 1]], 1), [-0.2, -1.16, 1], [-0.12, -1.185], [-0.04, -1.16, 1], ...earT([[0.04, -1.33, 1]], -0.6), [0.085, -1.05], [0.075, -0.93], [0.02, -0.84], [-0.12, -0.8], [-0.25, -0.825], [-0.34, -0.885], [-0.365, -0.94]].map(([x, y, k]) => [x + (x < -0.25 && y > -1.05 ? 0.25 * S : 0), y, k])));
    shape(ctx, head, { ...cl, sk: 0.8, w: W });
    if (INK.mode !== 'paper') { stroke(ctx, C(HS(earT([[-0.3, -1.1], [-0.315, -1.24]], 1))), 0.02, { color: '#5b4450', tin: 0.2 }); stroke(ctx, C(HS(earT([[0.0, -1.14], [0.03, -1.26]], -0.6))), 0.02, { color: '#5b4450', tin: 0.2 }); }
    ctx.save(); path(ctx, spline(head, true)); ctx.clip();
    const ceye = (cx, cy, rx, ry, tilt) => {
      const op = 1 - blink;
      const E = (p) => C(HS(xf(p, { x: cx, y: cy, r: tilt }), 0.3));
      const pts = [[-rx, 0.004, 1], [-rx * 0.3, -ry * op], [rx * 0.5, -ry * 0.9 * op], [rx, -0.004, 1], [rx * 0.3, ry * 0.85], [-rx * 0.5, ry * 0.75]];
      if (op > 0.1) {
        shape(ctx, E(pts), { fill: COL.catEye, shade: COL.catEyeS, sk: 0.25, w: 0.005, color: line });
        const p = E([[0.004, 0.0]])[0]; ellipse(ctx, p[0], p[1], 0.011, ry * 0.85 * op, tilt, INK.mode === 'paper' ? INK.line : '#140f0a');
        if (INK.mode !== 'paper') { const q = E([[-rx * 0.3, -ry * 0.35]])[0]; ellipse(ctx, q[0], q[1], 0.008, 0.008, 0, '#fff'); }
      }
      stroke(ctx, E([[-rx * 1.1, 0.008], [-rx * 0.3, -ry * 1.05 * op + ry * 0.75 * (1 - op)], [rx * 0.6, -ry * 0.92 * op + ry * 0.6 * (1 - op)], [rx * 1.2, -0.01]]), 0.012, { tin: 0.25, tout: 0.25, min: 0.35, color: INK.mode === 'paper' ? INK.line : '#0a080c' });
    };
    ceye(-0.13, -0.975, 0.062, 0.04, -0.18); ceye(-0.285, -0.975, 0.04, 0.034, -0.12);
    ctx.restore();
    shape(ctx, C(HS([[-0.36, -0.928], [-0.335, -0.93], [-0.345, -0.912]], 0.35)), { fill: INK.mode === 'paper' ? INK.line : '#6b4a55', w: 0.004, color: line });
    stroke(ctx, C(HS([[-0.345, -0.91], [-0.338, -0.888], [-0.31, -0.882]], 0.35)), 0.005, { color: line });
    const wc = INK.mode === 'paper' ? '#9b9086' : '#9a97a8';
    for (const [a, b] of [[[-0.3, -0.9], [-0.06, -0.94]], [[-0.3, -0.89], [-0.07, -0.87]], [[-0.36, -0.9], [-0.5, -0.93]], [[-0.36, -0.89], [-0.49, -0.86]]]) stroke(ctx, C(HS([a, b], 0.3)), 0.004, { color: wc, tin: 0.1, tout: 0.6 });
  }

  // ============================== the girl, side key (camera yaw pi/2): her profile ==============================
  function headSide(ctx, at, o = {}) {
    const { yaw = 0, roll = 0.0, blink = 0, sway = 0, gaze = 0 } = o;
    const S = Math.sin(yaw);
    const H = (p) => xf(p, { x: at[0], y: at[1], r: roll });
    const SW = (p, k) => p.map(([x, y, c]) => [x + sway * k * Math.max(0, y + 0.25), y, c]);
    const D = (p, d) => p.map(([x, y, c]) => [x + d * S, y, c]);
    const W = W0 * 1.05;
    // bow behind the head
    const B = (p) => H(SW(D(p, -0.25), 0.25));
    shape(ctx, B([[0.47, -0.36], [0.56, -0.5], [0.66, -0.47], [0.65, -0.36], [0.53, -0.31, 1]]), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.4, w: W * 0.75 });
    shape(ctx, B([[0.5, -0.3], [0.63, -0.25], [0.66, -0.13, 1], [0.57, -0.15], [0.48, -0.24, 1]]), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.4, w: W * 0.75 });
    // face in profile: forehead, small nose, lips, chin, jaw
    const face = H([[-0.3, -0.32], [-0.38, -0.18], [-0.405, -0.03], [-0.39, 0.06], [-0.415, 0.13], [-0.45, 0.19, 1], [-0.41, 0.225], [-0.405, 0.27], [-0.39, 0.305], [-0.4, 0.335], [-0.37, 0.4], [-0.32, 0.45], [-0.22, 0.48], [-0.05, 0.4], [0.08, 0.25], [0.12, 0.0], [0.05, -0.3]]);
    shape(ctx, face, { fill: COL.skin, shade: COL.skinS, sk: 0.6, w: W });
    ctx.save(); path(ctx, spline(face, true)); ctx.clip();
    const F = (p, d = 0.3) => H(D(p, d));
    if (INK.mode !== 'paper') { path(ctx, spline(F([[-0.5, -0.5], [0.2, -0.5], [0.1, 0.02], [-0.2, 0.06], [-0.3, 0.06], [-0.42, 0.04], [-0.5, 0.04]], 0.1), true)); ctx.fillStyle = COL.skinS; ctx.fill(); }
    blush(ctx, ...F([[-0.27, 0.27]])[0].slice(0, 2), 0.075, 0.045);
    eye(ctx, (p) => F(p), -0.3 + 0.08 * Math.max(0, S), 0.12, 0.085 + 0.08 * Math.max(0, S), 0.125, { open: 1 - blink, gaze: -0.18 + gaze, dir: -1, lid: 0.022 });
    stroke(ctx, F([[-0.34, -0.005], [-0.31, -0.015], [-0.27, -0.008]]), 0.008, { tin: 0.3, tout: 0.5 });
    stroke(ctx, F([[-0.395, 0.308], [-0.37, 0.31], [-0.35, 0.305]], 0.15), 0.008, { tin: 0.2, tout: 0.6 });
    ctx.restore();
    // hair: a bob seen from the side, fringe over the brow, side hair covering the ear
    shape(ctx, H(SW([
      [0.0, -0.61], [0.3, -0.55], [0.5, -0.36], [0.575, -0.05], [0.54, 0.24], [0.45, 0.43], [0.35, 0.55, 1], [0.22, 0.46], [0.1, 0.52, 1], [0.01, 0.4],
      [-0.06, 0.48, 1], [-0.1, 0.3], [-0.15, 0.12], [-0.2, 0.0], [-0.26, -0.06], [-0.3, -0.02], [-0.355, 0.035, 1], [-0.375, -0.03], [-0.435, 0.01, 1], [-0.465, -0.12], [-0.45, -0.3], [-0.38, -0.47], [-0.2, -0.58],
    ], 0.45)), { fill: COL.hair, shade: COL.hairS, sk: 1.2, w: W });
    for (const s2 of [[[-0.05, -0.58], [-0.25, -0.42], [-0.36, -0.2]], [[0.15, -0.57], [0.36, -0.38], [0.47, -0.1]], [[0.0, 0.0], [0.02, 0.2], [0.05, 0.38]], [[0.3, -0.05], [0.34, 0.2], [0.33, 0.42]]])
      stroke(ctx, H(SW(s2, 0.4)), 0.007, { tin: 0.25, tout: 0.45 });
    stroke(ctx, H([[-0.18, -0.36], [0.15, -0.39], [0.47, -0.36]]), 0.008, { tin: 0.3, tout: 0.2 });
    shape(ctx, H(D([[0.46, -0.38], [0.53, -0.39], [0.54, -0.3], [0.47, -0.29]], -0.15)), { fill: COL.ribbon, shade: COL.ribbonS, sk: 0.3, w: W * 0.65 });
  }
  const TS = Math.PI / 2;
  function girlSide(ctx, t = 0, o = {}, th = TS) {
    const cam = camera(th), J = pose(t, o), K = skinner(TS, th, J0, J);
    const dress = K([
      [-0.12, -1.69], [-0.18, -1.46], [-0.16, -1.2], [-0.12, -0.95], [-0.16, -0.7], [-0.36, -0.44], [-0.7, -0.37], [-1.05, -0.35], [-1.26, -0.31], [-1.34, -0.18], [-1.34, -0.03, 1],
      [-1.15, 0.01], [-0.9, 0.03], [-0.62, 0.02], [-0.3, 0.025], [0.02, 0.02], [0.32, 0.0, 1], [0.34, -0.26], [0.2, -0.95], [0.22, -1.25], [0.2, -1.55], [0.1, -1.7],
    ]);
    shin(ctx, cam, J, 'R', dress); shoe(ctx, cam, J, 'R');
    shin(ctx, cam, J, 'L', dress); shoe(ctx, cam, J, 'L');
    const kh = camera(TS).p2(J0.head), headAt = K([[kh[0] - 0.01, kh[1] + 0.05]])[0];
    const neck = K([[-0.13, -1.96], [-0.12, -1.66], [0.1, -1.66], [0.1, -1.99]]);
    shape(ctx, neck, { fill: COL.skin, shade: COL.skinS, sk: 0.5, w: W0 * 0.8 });
    cast(ctx, xf([[-0.3, 0.3], [-0.2, 0.5], [0.05, 0.42], [0.1, 0.2]], { x: headAt[0], y: headAt[1] }), neck, [0.02, 0.05], COL.skinS);
    shape(ctx, dress, { fill: COL.dress, shade: COL.dressS, sk: 1.5, w: W0 });
    const dS = COL.dressS;
    fold(ctx, K([[-0.12, -0.94], [0.04, -0.93], [0.2, -0.95]]), 0.007, null, { tin: 0.2, tout: 0.2 });
    for (const f2 of [[[-0.06, -0.85], [-0.3, -0.52], [-0.62, -0.32]], [[0.1, -0.8], [0.0, -0.45], [-0.4, -0.12]], [[0.18, -0.75], [0.26, -0.3], [0.28, -0.02]], [[-1.0, -0.3], [-1.12, -0.12], [-1.18, 0.0]], [[-0.7, -0.2], [-0.82, 0.0]]])
      fold(ctx, K(f2), 0.008, dS, { tin: 0.45, tout: 0.3 });
    for (const [x, y] of K([[-0.16, -1.42], [-0.155, -1.22]])) ellipse(ctx, x, y, 0.012, 0.014, 0, INK.mode === 'paper' ? INK.line : '#f4f0e6');
    // sash bow peeking out at her back
    for (const b2 of [[[0.2, -0.96], [0.33, -1.06], [0.4, -0.99], [0.36, -0.88], [0.22, -0.9, 1]], [[0.22, -0.9], [0.32, -0.64], [0.26, -0.62, 1], [0.21, -0.72]]])
      shape(ctx, K(b2), { fill: COL.dress, shade: COL.dressS, sk: 0.35, w: W0 * 0.65 });
    const col = K([[-0.12, -1.7], [-0.21, -1.64], [-0.19, -1.55], [-0.06, -1.56], [0.07, -1.62], [0.12, -1.7]]);
    cast(ctx, col, dress, [0.0, 0.035], dS);
    shape(ctx, col, { fill: COL.collar, shade: COL.collarS, sk: 0.5, w: W0 * 0.6 });
    const P = cam.p2;
    cast(ctx, limbOutline([P(J.shL), P(J.elL), P(J.wrL)], [[0, 0.072], [1, 0.04]]), dress, [0.05, 0.02], dS);
    arm(ctx, cam, J, 'L'); hand(ctx, cam, J, 'L'); sleeve(ctx, cam, J, 'L');
    headSide(ctx, headAt, { ...o, yaw: (o.yaw || 0) + (TS - th) });
  }

  function catSide(ctx, at, o = {}) {
    const { t = 0, tail = 0, yaw = 0, blink = 0, ear = 0 } = o;
    const C = (p) => xf(p, { x: at[0], y: at[1] });
    const W = W0 * 0.95, cl = { fill: COL.cat, hi: COL.catHi, color: COL.catLine };
    const S = Math.sin(yaw), lc = INK.mode === 'paper' ? INK.line : COL.catHi, line = INK.mode === 'paper' ? INK.line : COL.catLine;
    shape(ctx, C([[-0.2, 0.0], [-0.2, -0.25], [-0.24, -0.5], [-0.2, -0.7], [-0.02, -0.78], [0.12, -0.6], [0.28, -0.35], [0.38, -0.12], [0.33, 0.02, 1]]), { ...cl, sk: 0.9, w: W });
    stroke(ctx, C([[0.08, -0.4], [0.25, -0.25], [0.28, -0.02]]), 0.011, { tin: 0.35, tout: 0.3, color: lc });
    stroke(ctx, C([[-0.1, -0.45], [-0.1, -0.2], [-0.09, -0.02]]), 0.008, { tin: 0.5, tout: 0.2, color: lc });
    shape(ctx, C([[-0.27, -0.6], [-0.22, -0.58], [-0.2, -0.5], [-0.235, -0.45, 1], [-0.25, -0.52]]), { fill: '#f1ede6', w: 0.004, color: line });
    shape(ctx, C([[-0.28, 0.01], [-0.27, -0.04], [-0.17, -0.05], [-0.12, -0.01], [-0.15, 0.02]]), { ...cl, sk: 0.4, w: W * 0.8 });
    const tip = [-0.36 + 0.035 * Math.sin(t * 2.1), -0.06 - 0.06 * tail - 0.02 * Math.sin(t * 1.3)];
    const c = [[0.32, -0.02], [0.25, 0.06], [0.05, 0.085], [-0.15, 0.07], [-0.3, 0.02 - 0.02 * tail], tip];
    const L = [], R = []; for (let i = 0; i < c.length; i++) { const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const w = (0.1 - 0.06 * i / (c.length - 1)) / 2; L.push([c[i][0] - ty * w, c[i][1] + tx * w]); R.push([c[i][0] + ty * w, c[i][1] - tx * w]); }
    shape(ctx, C([...L, [tip[0] - 0.035, tip[1] - 0.01, 1], ...R.reverse()]), { ...cl, sk: 0.5, w: W * 0.85 });
    const HS = (p, d = 0) => p.map(([x, y, k]) => [-0.06 + (x + d * S + 0.06) * 1.15, -0.8 + (y + 0.8) * 1.12, k]);
    // far ear first, then the head in profile
    shape(ctx, C(HS([[-0.02, -1.1], [0.03 - ear * 0.02, -1.3, 1], [0.08, -1.06]], -0.15)), { ...cl, sk: 0.3, w: W * 0.8 });
    const head = C(HS([[-0.12, -0.76], [-0.25, -0.8], [-0.33, -0.86], [-0.37, -0.915, 1], [-0.33, -0.98], [-0.28, -1.04], [-0.2, -1.1], [-0.12 - ear * 0.02, -1.12], [-0.07 - ear * 0.03, -1.34, 1], [0.02, -1.1], [0.08, -1.0], [0.06, -0.86], [0.0, -0.78]]));
    shape(ctx, head, { ...cl, sk: 0.8, w: W });
    if (INK.mode !== 'paper') stroke(ctx, C(HS([[-0.09, -1.13], [-0.075 - ear * 0.03, -1.26]])), 0.018, { color: '#5b4450', tin: 0.2 });
    ctx.save(); path(ctx, spline(head, true)); ctx.clip();
    const op = 1 - blink, E = (p) => C(HS(xf(p, { x: -0.22, y: -0.975, r: -0.15 }), 0.25));
    if (op > 0.1) {
      shape(ctx, E([[-0.05, 0.004, 1], [-0.015, -0.032 * op], [0.03, -0.028 * op], [0.045, 0.0, 1], [0.01, 0.028], [-0.03, 0.022]]), { fill: COL.catEye, shade: COL.catEyeS, sk: 0.2, w: 0.005, color: line });
      const p = E([[-0.018, 0.0]])[0]; ellipse(ctx, p[0], p[1], 0.008, 0.026 * op, -0.15, INK.mode === 'paper' ? INK.line : '#140f0a');
    }
    stroke(ctx, E([[-0.055, 0.006], [-0.015, -0.036 * op + 0.02 * (1 - op)], [0.05, -0.004]]), 0.011, { tin: 0.25, tout: 0.25, min: 0.35, color: INK.mode === 'paper' ? INK.line : '#0a080c' });
    ctx.restore();
    const wc = INK.mode === 'paper' ? '#9b9086' : '#9a97a8';
    for (const [a, b] of [[[-0.31, -0.89], [-0.52, -0.92]], [[-0.31, -0.88], [-0.5, -0.85]], [[-0.3, -0.89], [-0.08, -0.92]]]) stroke(ctx, C(HS([a, b])), 0.004, { color: wc, tin: 0.1, tout: 0.6 });
  }

  function catBackOld(ctx, at, o = {}) {
    const { t = 0, yaw = 0, ear = 0 } = o;
    const C = (p) => xf(p, { x: at[0], y: at[1] });
    const W = W0 * 0.95, cl = { fill: COL.cat, hi: COL.catHi, color: COL.catLine };
    const S = Math.sin(yaw);
    shape(ctx, C([[-0.3, 0.0], [-0.34, -0.24], [-0.31, -0.5], [-0.21, -0.71], [-0.05, -0.8], [0.11, -0.72], [0.23, -0.5], [0.31, -0.24], [0.31, 0.01, 1]]), { ...cl, sk: 0.9, w: W });
    const lc = INK.mode === 'paper' ? INK.line : COL.catHi;
    stroke(ctx, C([[-0.03, -0.74], [-0.01, -0.5], [0.02, -0.28]]), 0.007, { tin: 0.3, tout: 0.6, color: lc });
    stroke(ctx, C([[-0.16, -0.38], [-0.24, -0.2], [-0.23, -0.02]]), 0.01, { tin: 0.4, tout: 0.3, color: lc });
    stroke(ctx, C([[0.14, -0.38], [0.22, -0.2], [0.22, -0.02]]), 0.01, { tin: 0.4, tout: 0.3, color: lc });
    const tip = [0.33 + 0.025 * Math.sin(t * 2.1), -0.14 - 0.035 * Math.sin(t * 1.3)];
    const c = [[-0.05, 0.02], [0.14, 0.07], [0.3, 0.05], [0.38, -0.04], tip];
    const L = [], R = []; for (let i = 0; i < c.length; i++) { const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const w = (0.1 - 0.06 * i / (c.length - 1)) / 2; L.push([c[i][0] - ty * w, c[i][1] + tx * w]); R.push([c[i][0] + ty * w, c[i][1] - tx * w]); }
    shape(ctx, C([...L, [tip[0] + 0.01, tip[1] - 0.03, 1], ...R.reverse()]), { ...cl, sk: 0.5, w: W * 0.85 });
    const HS = (p) => p.map(([x, y, k]) => [-0.04 + (x + 0.04) * 1.12, -0.8 + (y + 0.8) * 1.1, k]);
    const wc = INK.mode === 'paper' ? '#9b9086' : '#9a97a8';
    for (const [a, b] of [[[-0.22, -0.93], [-0.37, -0.96]], [[-0.22, -0.91], [-0.36, -0.89]]]) stroke(ctx, C(HS([[a[0] - 0.08 * Math.max(0, S), a[1]], [b[0] - 0.1 * Math.max(0, S), b[1]]])), 0.004, { color: wc, tin: 0.1, tout: 0.6 });
    const e1 = ear * 0.03;
    shape(ctx, C(HS([[-0.2 - 0.05 * Math.max(0, S), -0.85], [-0.245 - 0.06 * Math.max(0, S), -0.97], [-0.235, -1.07], [-0.28 - e1, -1.29, 1], [-0.16, -1.165, 1], [-0.04, -1.2], [0.08, -1.17, 1], [0.2 + e1 * 0.5, -1.31, 1], [0.205, -1.06], [0.18, -0.92], [0.08, -0.84], [-0.06, -0.82]])), { ...cl, sk: 0.8, w: W });
    if (INK.mode !== 'paper') { stroke(ctx, C(HS([[-0.22, -1.1], [-0.25 - e1, -1.22]])), 0.012, { color: COL.catHi, tin: 0.3 }); stroke(ctx, C(HS([[0.12, -1.12], [0.18, -1.24]])), 0.012, { color: COL.catHi, tin: 0.3 }); }
  }

  function ledge(ctx, cam, x0 = -2.4, x1 = 2.6) {
    const P = cam.p2, { front: f, back: b, drop: d } = LEDGE, lc = COL.stoneLine;
    shape(ctx, [[...P([x0, 0, f]), 1], [...P([x1, 0, f]), 1], [...P([x1, -d, f]), 1], [...P([x0, -d, f]), 1]], { fill: COL.stone, w: 0.01, color: lc });
    shape(ctx, [[...P([x0, 0, f]), 1], [...P([x1, 0, f]), 1], [...P([x1, 0, b]), 1], [...P([x0, 0, b]), 1]], { fill: COL.stoneTop, w: 0.01, color: lc });
    stroke(ctx, [P([x0, -0.16, f]), P([x1, -0.16, f])], 0.007, { color: lc, wob: 0.3 });
    stroke(ctx, [P([x0, -1.1, f]), P([x1, -1.1, f])], 0.006, { color: lc, wob: 0.3 });
    for (let x = x0 + 0.5; x < x1; x += 1.05) stroke(ctx, [P([x, -0.18, f]), P([x + 0.01, -1.08, f])], 0.006, { color: lc });
    for (let x = x0 + 1.0; x < x1; x += 1.05) stroke(ctx, [P([x, -1.12, f]), P([x, -2.0, f])], 0.006, { color: lc });
  }

  // ============================== the same girl from behind (camera yaw 2.44, behind her left) ==============================
  // Not traced - there is no picture of her back - but drawn to agree with the traced front: the hair
  // silhouette is the front one seen from the other side, the pinafore straps cross on the T-shirt
  // and button to the waistband, the skirt spreads on the stone, her legs are over the far edge.
  const TB = 2.44, HOB = [-0.04, -2.4];
  function headBack(ctx, at, o = {}) {
    const { roll = 0, sway = 0 } = o, yaw = Math.max(-0.5, Math.min(0.5, o.yaw || 0)), S = Math.sin(yaw);
    const H = (p) => xf(p, { x: at[0], y: at[1], r: roll });
    const tipW = (y) => Math.max(0, y - 0.05);
    const SWY = (p) => [p[0] + sway * 2.4 * tipW(p[1]) + sway * 0.25, p[1] + Math.abs(sway) * 0.3 * tipW(p[1]), p[2]];
    const lc = PAL.line, hair = TR.hair;
    // a sliver of cheek beyond the hair when she turns our way
    if (S > 0.05) { const c = S * 0.2; cel(ctx, H([[-0.4, 0.05], [-0.5 - c, 0.16], [-0.52 - c, 0.3], [-0.47 - c * 0.7, 0.43], [-0.36, 0.5], [-0.3, 0.3]]), PAL.skin, { color: lc, seed: 5, hide: (i) => i === 0 || i >= 4 }); }
    // the silhouette: the traced outer edge of the bob, mirrored, closed along the nape with loose ends
    const outer = []; for (let i = 124; i <= 202; i++) outer.push(hair[i]); for (let i = 0; i <= 32; i++) outer.push(hair[i]);
    const nape = [[0.1, 0.63, 1], [0.065, 0.57, 1], [0.02, 0.6], [-0.03, 0.645, 1], [-0.06, 0.575, 1], [-0.12, 0.63, 1], [-0.14, 0.59, 1]];
    const pts = H([...outer.map(([x, y, c]) => [-x, y, c]).reverse(), ...nape].map(SWY));
    const C = contour(pts, 0.005);
    paint(ctx, C.P, PAL.hair);
    inkEdges(ctx, C, pts, LW * 0.8, { color: PAL.hairLine, maxRun: 9, min: 0.35, seed: 2 });
    // her left ear, seen from behind, showing through the hair as it does in front
    const ex = -0.37 - S * 0.06;
    cel(ctx, H([[ex + 0.03, 0.16], [ex - 0.02, 0.15], [ex - 0.055, 0.2], [ex - 0.06, 0.28], [ex - 0.03, 0.36], [ex + 0.02, 0.385], [ex + 0.035, 0.3]]), PAL.skin, { color: lc, w: LW * 0.9, seed: 7, hide: (i) => i === 0 || i === 6 });
    line(ctx, H([[ex + 0.005, 0.2], [ex - 0.02, 0.26], [ex - 0.005, 0.33]]), 0.0055, { color: lc, tin: 0.3, tout: 0.4 });
    // locks falling over it
    cel(ctx, H([[ex + 0.1, 0.0], [ex + 0.02, 0.1], [ex - 0.005, 0.24, 1], [ex + 0.04, 0.2], [ex + 0.07, 0.42, 1], [ex + 0.13, 0.25], [ex + 0.2, 0.1]].map(SWY)), PAL.hair, { ink: false });
    // a few strands, a shade lighter, to turn the form
    const hs = (p, w = 0.8) => line(ctx, H(p.map(SWY)), LW * w, { tin: 0.3, tout: 0.55, color: INK.mode === 'paper' ? INK.line : PAL.hairHi });
    hs([[0.05, -0.52], [0.16, -0.25], [0.2, 0.05], [0.17, 0.35]]); hs([[-0.1, -0.5], [-0.2, -0.2], [-0.22, 0.1], [-0.17, 0.4]]); hs([[0.3, -0.38], [0.44, -0.1], [0.48, 0.2]], 0.7); hs([[-0.3, -0.42], [-0.43, -0.15], [-0.46, 0.12]], 0.7); hs([[0.0, 0.1], [0.01, 0.35], [-0.01, 0.52]], 0.6);
    // the clip on her left temple, seen edge-on
    const cx = -0.5 - S * 0.05;
    cel(ctx, H([[cx, -0.27], [cx + 0.03, -0.25], [cx + 0.015, -0.17], [cx - 0.015, -0.1], [cx - 0.04, -0.12], [cx - 0.03, -0.2]].map(SWY)), PAL.clip, { color: '#5a3a12', w: LW * 0.8, seed: 8 });
  }
  function girlBack(ctx, t = 0, o = {}, th = TB) {
    const th0 = th; th = Math.max(TB - 0.34, Math.min(TB + 0.3, th));   // the back key bends this far, then is held
    const J = poseFront(t, o), K0 = skinF(TB, th, J), lc = PAL.line, nl = PAL.navyLine;
    const br = 0.004 * Math.sin(t * 1.3), K = (p) => K0(p.map(([x, y, c]) => [x, y - br * smooth(-0.6, -1.5, y), c]));
    const L = (p, w = 0.0065, oo) => line(ctx, K(p), w, { tin: 0.3, tout: 0.4, color: lc, ...oo });
    // far arm and its sleeve, behind the body
    cel(ctx, K([[0.44, -1.25], [0.64, -1.25], [0.668, -1.02], [0.665, -0.84], [0.625, -0.6], [0.575, -0.36], [0.585, -0.24], [0.6, -0.17], [0.5, -0.15], [0.42, -0.21], [0.455, -0.42], [0.5, -0.63], [0.5, -0.85], [0.45, -1.05]]), PAL.skin, { color: lc, seed: 21, hide: (i) => i < 1 || i > 12 });
    cel(ctx, K([[0.3, -1.72], [0.49, -1.69], [0.62, -1.58], [0.7, -1.38], [0.705, -1.2, 1], [0.56, -1.17], [0.41, -1.16, 1], [0.39, -1.4]]), PAL.shirt, { color: lc, seed: 22, hide: (i) => i === 7 || i === 0 });
    L([[0.6, -1.5], [0.63, -1.38], [0.62, -1.24]], 0.006);
    // her left knee beyond the hem
    cel(ctx, K([[-0.9, -0.5], [-1.0, -0.49], [-1.07, -0.43], [-1.085, -0.33], [-1.05, -0.24], [-0.93, -0.25]]), PAL.skin, { color: lc, seed: 23, hide: (i) => i === 0 || i === 5 });
    // neck
    cel(ctx, K([[-0.12, -1.9], [0.11, -1.92], [0.12, -1.66], [-0.13, -1.63]]), PAL.skin, { ink: false, tones: [K([[-0.2, -1.95], [0.2, -1.95], [0.2, -1.78], [0.0, -1.74], [-0.2, -1.76]])], toneCol: PAL.skinS });
    // T-shirt back
    const sh = K([[-0.14, -1.655], [-0.3, -1.61], [-0.43, -1.52], [-0.4, -1.25], [-0.33, -0.95, 1], [0.0, -0.9], [0.35, -0.97, 1], [0.41, -1.25], [0.46, -1.55], [0.32, -1.71], [0.13, -1.705], [0.0, -1.665]]);
    cel(ctx, sh, PAL.shirt, { color: lc, seed: 24, hide: (i) => i >= 4 && i <= 6, tones: [K([[0.22, -1.75], [0.5, -1.6], [0.45, -0.9], [0.27, -0.9], [0.33, -1.25], [0.3, -1.5]])], toneCol: PAL.shirtS });
    L([[-0.13, -1.63], [-0.02, -1.6], [0.1, -1.66]], 0.006);
    // skirt, spread on the stone and over her left thigh
    const skirt = K([[-0.33, -0.93], [-0.4, -0.72], [-0.56, -0.57], [-0.76, -0.5], [-0.93, -0.5], [-1.02, -0.45, 1], [-1.04, -0.34], [-0.99, -0.25, 1], [-0.85, -0.2], [-0.74, -0.12], [-0.6, -0.1], [-0.48, -0.02], [-0.3, 0.02], [-0.12, 0.07], [0.08, 0.05], [0.26, 0.07], [0.42, 0.0], [0.5, -0.1, 1], [0.49, -0.3], [0.43, -0.62], [0.36, -0.95]]);
    cel(ctx, skirt, PAL.navy, { color: nl, seed: 25, w: LW * 1.05, hide: (i) => i === 0 || i === 20,
      tones: [K([[0.3, -1.0], [0.6, -0.9], [0.6, 0.2], [0.3, 0.1], [0.36, -0.2], [0.3, -0.6]]), K([[-0.42, -0.7], [-0.55, -0.45], [-0.8, -0.3], [-1.0, -0.22], [-0.7, -0.05], [-0.5, -0.2], [-0.4, -0.45]]), K([[-0.12, -0.9], [-0.1, -0.5], [-0.16, -0.15], [-0.06, -0.3], [-0.04, -0.7]]), K([[0.14, -0.9], [0.18, -0.5], [0.16, -0.1], [0.24, -0.45], [0.21, -0.75]])], toneCol: PAL.navyS });
    const F = (p, w = 0.007) => line(ctx, K(p), w, { tin: 0.25, tout: 0.5, color: nl });
    F([[-0.2, -0.88], [-0.25, -0.6], [-0.33, -0.3], [-0.36, -0.08]]); F([[-0.03, -0.87], [-0.04, -0.55], [-0.08, -0.2]]); F([[0.13, -0.88], [0.17, -0.55], [0.17, -0.2]]); F([[0.27, -0.9], [0.34, -0.6], [0.38, -0.3]], 0.006);
    F([[-0.45, -0.68], [-0.62, -0.5], [-0.82, -0.44]], 0.006); F([[-0.6, -0.1], [-0.66, -0.2], [-0.78, -0.28]], 0.006); F([[-0.3, 0.02], [-0.27, -0.06]], 0.006); F([[0.08, 0.05], [0.1, -0.04]], 0.006);
    // straps crossing on the back, then the waistband over their ends
    const strapA = K([[-0.33, -1.6], [-0.21, -1.635], [-0.02, -1.38], [0.16, -1.15], [0.27, -0.98], [0.15, -0.95], [0.04, -1.12], [-0.14, -1.35]]);
    const strapB = K([[0.2, -1.71], [0.33, -1.7], [0.16, -1.42], [-0.02, -1.17], [-0.13, -0.95], [-0.25, -0.96], [-0.15, -1.2], [0.03, -1.45]]);
    cel(ctx, strapB, PAL.navy, { color: nl, seed: 26, hide: (i) => i === 4 || i === 5 });
    cel(ctx, strapA, PAL.navy, { color: nl, seed: 27, hide: (i) => i === 4 || i === 5, tones: [K([[-0.1, -1.42], [0.05, -1.5], [0.12, -1.3], [0.0, -1.2]])], toneCol: PAL.navyS });
    const band = K([[-0.335, -0.99, 1], [-0.15, -1.005], [0.05, -1.015], [0.2, -1.03], [0.365, -1.05, 1], [0.37, -0.94, 1], [0.2, -0.91], [0.03, -0.895], [-0.15, -0.885], [-0.33, -0.87, 1]]);
    cel(ctx, band, PAL.navy, { color: nl, seed: 28 });
    for (const [bx, by] of [[-0.19, -0.94], [0.21, -0.975]]) { const c = K([[bx, by]])[0]; if (!INK.noLines) { fillPts(ctx, oval(c[0], c[1], 0.036, 0.036, 20), PAL.button); ribbon(ctx, [...oval(c[0], c[1], 0.036, 0.036, 24), [c[0] + 0.036, c[1]]], 0.0065, { tin: 0.05, tout: 0.05, color: nl }); } }
    // near arm in front of the skirt, hand flat on the ledge
    const armPts = K([[-0.6, -1.12], [-0.6, -0.92], [-0.585, -0.74], [-0.63, -0.52], [-0.76, -0.28], [-0.88, -0.11], [-0.98, -0.045], [-1.09, -0.02], [-1.185, 0.01], [-1.2, 0.04, 1], [-1.13, 0.065], [-1.03, 0.075], [-0.93, 0.06], [-0.84, 0.03], [-0.74, -0.12], [-0.6, -0.34], [-0.46, -0.56], [-0.4, -0.72], [-0.34, -0.9], [-0.3, -1.1]]);
    cel(ctx, armPts, PAL.skin, { color: lc, seed: 29, maxRun: 7, hide: (i) => i === 0 || i === 19, tones: [K([[-0.3, -1.1], [-0.36, -0.8], [-0.44, -0.6], [-0.62, -0.3], [-0.5, -0.3], [-0.3, -0.6], [-0.2, -1.1]])], toneCol: PAL.skinS });
    L([[-1.19, 0.035], [-1.12, 0.03], [-1.06, 0.035]], 0.0055); L([[-1.15, 0.052], [-1.08, 0.048], [-1.02, 0.052]], 0.0055); L([[-0.585, -0.74], [-0.56, -0.7], [-0.52, -0.69]], 0.0055);
    // near sleeve
    const sl = K([[-0.25, -1.64], [-0.4, -1.59], [-0.53, -1.49], [-0.61, -1.31], [-0.635, -1.12, 1], [-0.47, -1.05], [-0.28, -1.07, 1], [-0.27, -1.3], [-0.23, -1.5]]);
    cel(ctx, sl, PAL.shirt, { color: lc, seed: 30, hide: (i) => i === 8 || i === 0 });
    L([[-0.5, -1.45], [-0.54, -1.3], [-0.53, -1.14]], 0.006); L([[-0.33, -1.35], [-0.32, -1.2], [-0.33, -1.1]], 0.006);
    headBack(ctx, K0([HOB])[0], { ...o, yaw: (o.yaw || 0) + (TB - th0) * 0.5 });
  }
  function catBack(ctx, at, o = {}) {
    const { t = 0, yaw = 0, ear = 0, tail = 0 } = o, S = Math.sin(Math.max(-0.6, Math.min(0.6, yaw)));
    const C = (p) => xf(p, { x: at[0], y: at[1] }), lc = PAL.catLine, hi = INK.mode === 'paper' ? INK.line : PAL.catHi;
    const wc = INK.mode === 'paper' ? INK.line : '#2a2420';
    for (const m of [-1, 1]) for (const [a, b] of [[[0.17, -0.57], [0.3, -0.6]], [[0.17, -0.55], [0.29, -0.53]]]) line(ctx, C([[m * a[0] - S * 0.05, a[1]], [m * b[0] - S * 0.08, b[1]]]), 0.004, { color: wc, tin: 0.1, tout: 0.7 });
    // tail, lying out to one side with the tip lifted
    const tipx = 0.43 + 0.03 * Math.sin(t * 2.1) + 0.02 * tail, tipy = -0.2 - 0.07 * tail - 0.015 * Math.sin(t * 1.3);
    const c = [[0.1, -0.02], [0.26, 0.012], [0.4, -0.025], [0.465, -0.11], [tipx, tipy]];
    const sp = spline(c, false, 0.01), Lf = [], Rt = [];
    sp.forEach((p, i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const w = (0.07 - 0.03 * i / sp.length) / 2 * (i > sp.length - 4 ? 0.75 : 1); Lf.push([p[0] - ty * w, p[1] + tx * w]); Rt.push([p[0] + ty * w, p[1] - tx * w]); });
    const tp = C([...Lf, ...Rt.reverse()]); paint(ctx, tp, PAL.cat); ribbon(ctx, [...tp.slice(4), tp[0]], LW, { color: lc, tin: 0.05, tout: 0.05, min: 0.6 });
    const e = ear * 0.02;
    const body = C([[-0.2, 0.0], [-0.235, -0.14], [-0.21, -0.31], [-0.15, -0.46], [-0.185, -0.52], [-0.21 - S * 0.03, -0.62], [-0.195, -0.72], [-0.205, -0.79], [-0.2 - e, -0.9, 1], [-0.1, -0.815], [0.0, -0.8], [0.08, -0.815], [0.175 + e, -0.905, 1], [0.195, -0.79], [0.2, -0.68], [0.19, -0.56], [0.165, -0.5], [0.13, -0.45], [0.2, -0.31], [0.235, -0.14], [0.2, 0.0], [0.05, 0.03], [-0.1, 0.03]]);
    cel(ctx, body, PAL.cat, { color: lc, seed: 6, maxRun: 8 });
    if (S > 0.1) cel(ctx, C([[-0.2, -0.6], [-0.2 - S * 0.07, -0.57], [-0.19 - S * 0.06, -0.5], [-0.15, -0.5]]), PAL.catW, { ink: false });
    line(ctx, C([[-0.14, -0.45], [-0.05, -0.42], [0.04, -0.43], [0.12, -0.45]]), 0.006, { color: hi, tin: 0.3, tout: 0.3 });
    line(ctx, C([[-0.01, -0.4], [0.0, -0.25], [0.0, -0.1]]), 0.0055, { color: hi, tin: 0.2, tout: 0.6 });
    line(ctx, C([[-0.13, -0.3], [-0.18, -0.16], [-0.16, -0.04]]), 0.006, { color: hi, tin: 0.4, tout: 0.4 }); line(ctx, C([[0.13, -0.3], [0.18, -0.16], [0.16, -0.04]]), 0.006, { color: hi, tin: 0.4, tout: 0.4 });
    line(ctx, C([[-0.17, -0.8], [-0.175 - e, -0.86]]), 0.006, { color: hi, tin: 0.3, tout: 0.3 }); line(ctx, C([[0.15, -0.8], [0.16 + e, -0.86]]), 0.006, { color: hi, tin: 0.3, tout: 0.3 });
  }

  // one call for any camera yaw (signed, radians; 0 = in front of her, positive = toward her left):
  // the traced front key up to a quarter turn, the back key beyond. No mirroring is needed or wanted.
  function girlAny(ctx, t, o = {}, th = 0) { if (Math.abs(th) < Math.PI / 2) girlFront(ctx, t, o, th); else if (th > 0) girlBack(ctx, t, o, th); else { ctx.save(); ctx.scale(-1, 1); girlBack(ctx, t, { ...o, sway: -(o.sway || 0), yaw: -(o.yaw || 0) }, -th); ctx.restore(); } }
  function catAny(ctx, at, o = {}, th = 0) { if (Math.abs(th) < Math.PI / 2) catFront(ctx, at, o); else catBack(ctx, at, o); }

  return { silhouette, INK, COL, PAL, LEDGE, pose, poseFront, camera, spline, stroke, shape, cast, fold, ellipse, blush, xf, path, limbOutline, arm, hand, sleeve, shin, shoe, eye, head34, headBack, headSide, headFront, girl07, girlSide, girlBack, girlFront, legsFront, cat07, catSide, catBack, catFront, girlAny, catAny, TB, TS, skinner, ledge, TH07, W0, contour, run, paint, shadow, ribbon, line, ink, cel };
})();

/* =====================  the girl & her cat in the 3D town  ===================== *
 * They are 2D drawings (G2D above), redrawn every frame into small canvases and shown on
 * camera-facing cards. The front view is traced from the user's own reference drawing (curves
 * only, no image data) and the back view is drawn to match it; both bend toward the real camera
 * angle with the 3D skeleton. Her legs are a separate card at their true depth so the parapet hides them correctly.
 * Shading follows the town's sun; fog and a soft contact shadow sit them in the scene.          */
const HU = 0.25;                                   // one head height in metres
const GIRL_AT = V3(17.23 - 0.62 * HU, 0.54, 15.05); // centre of her hips on the parapet top
const FWD = V3(1, 0, 0), LEFT = V3(0, 0, -1);      // she faces the river (+x); her left is -z

function spriteMaterial(bias) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null }, uAnchor: { value: V3() }, uRect: { value: new THREE.Vector4() }, uBias: { value: bias }, uLight: { value: new THREE.Color(1, 1, 1) } }]),
    vertexShader: /* glsl */`
      uniform vec3 uAnchor; uniform vec4 uRect; uniform float uBias; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = viewMatrix * vec4(uAnchor, 1.0);
        mvPosition.xy += vec2(mix(uRect.x, uRect.y, uv.x), mix(uRect.z, uRect.w, uv.y));
        gl_Position = projectionMatrix * mvPosition;
        vec4 pb = projectionMatrix * vec4(mvPosition.xy, mvPosition.z + uBias, 1.0);   // depth as if a little nearer
        gl_Position.z = pb.z / pb.w * gl_Position.w;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform vec3 uLight; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        vec4 tx = texture2D(map, vUv);
        if (tx.a < 0.03) discard;
        gl_FragColor = vec4(tx.rgb * uLight, tx.a);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  return m;
}

class Card {
  // a canvas-backed camera-facing card. bounds: drawing-space box in head units [x0, x1, y0, y1] (y down)
  constructor(scene, bounds, bias, order = 0) {
    this.b = bounds; this.cv = document.createElement('canvas'); this.ctx = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.mat = spriteMaterial(bias); this.mat.uniforms.map.value = this.tex;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3 + order;
    scene.add(this.mesh); this.s = 0;
  }
  // start a redraw at s px per head unit; returns the ctx with drawing-space transform, origin = anchor
  begin(s, anchor, mirror) {
    const [x0, x1, y0, y1] = this.b;
    if (Math.abs(s - this.s) > 0.01) { this.s = s; this.cv.width = Math.ceil((x1 - x0) * s); this.cv.height = Math.ceil((y1 - y0) * s); this.tex.dispose(); }
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height);
    // mirrored drawings: flip around the anchor
    const mx = mirror ? -1 : 1, ox = mirror ? x1 * s : -x0 * s;
    c.setTransform(s * mx, 0, 0, s, ox, -y0 * s);
    this.mat.uniforms.uAnchor.value.copy(anchor);
    const W = this.cv.width / s, H = this.cv.height / s, L = mirror ? -x1 : x0;
    this.mat.uniforms.uRect.value.set(L * HU, (L + W) * HU, -(y0 + H) * HU, -y0 * HU);   // view-plane rect in metres
    return c;
  }
  end() { this.tex.needsUpdate = true; }
}

function buildCharacters(scene) {
  const G = G2D; G.INK.mode = 'color'; G.INK.partK = 0.62;   // inner lines lighter than the outer contour
  const body = new Card(scene, [-1.7, 1.7, -3.15, 0.5], 0.45, 0);
  const legs = new Card(scene, [-1.4, 1.4, -1.1, 1.75], 0.05, 0);
  const cat = new Card(scene, [-0.7, 0.7, -1.65, 0.22], 0.2, 1);
  const LEGS_AT = [0, -0.45, 1.25];               // shins' centre, her local drawing frame (head units)
  const CAT_AT = [1.7, 0, 0.1];                   // the kitten sits on her left, as in the reference drawing
  const toWorld = (p) => GIRL_AT.clone().addScaledVector(LEFT, p[0] * HU).addScaledVector(V3(0, 1, 0), p[1] * HU).addScaledVector(FWD, p[2] * HU);
  const legsWorld = toWorld(LEGS_AT), catWorld = toWorld(CAT_AT);
  // contact shadows on the parapet
  const sc = document.createElement('canvas'); sc.width = sc.height = 64; const sg = sc.getContext('2d');
  const gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
  const stex = new THREE.CanvasTexture(sc);
  const blob = (w, d, at, op) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: stex, color: '#3a2c22', transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.copy(at).add(V3(0, 0.004, 0)); scene.add(m); return m; };
  const sx = -SUN_DIR.x / Math.max(0.3, SUN_DIR.y) * 0.12, sz = -SUN_DIR.z / Math.max(0.3, SUN_DIR.y) * 0.12;
  blob(0.62, 0.5, GIRL_AT.clone().add(V3(0.02 + sx, 0, sz)), 0.42); blob(0.3, 0.24, catWorld.clone().add(V3(sx * 0.6, 0, sz * 0.6)), 0.38);

  // ---- deterministic idle behaviour (so the film export is repeatable) ----
  const rng = (() => { let s = 1234567; return () => ((s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9 | 0) >>> 0) / 4294967296; })();
  const sched = (n, gap0, gap1, f) => { const a = []; let t = rng() * gap0; for (let i = 0; i < n; i++) { a.push({ t, ...f() }); t += gap0 + rng() * (gap1 - gap0); } return a; };
  const blinks = sched(400, 2.2, 5.5, () => ({})), catBlinks = sched(300, 3, 8, () => ({}));
  let li = 0;   // she mostly watches the river, and every so often looks at the cat or back toward the town
  const looks = sched(150, 3, 7, () => { const r = rng(); const yaw = li++ % 2 === 0 ? 0 : r < 0.55 ? 0.42 : r < 0.8 ? -0.34 : 0.22; return { yaw, gaze: (rng() - 0.5) * 0.08 }; });
  const catLooks = sched(150, 5, 11, () => { const r = rng(); return { yaw: r < 0.4 ? -0.4 : r < 0.6 ? 0.3 : 0 }; });
  const flicks = sched(200, 4, 10, () => ({})), twitches = sched(200, 5, 12, () => ({}));
  const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const pulse = (list, t, d) => { let v = 0; for (const e of list) { if (e.t > t) break; const u = (t - e.t) / d; if (u < 1) v = Math.max(v, Math.sin(u * Math.PI)); } return v; };
  const follow = (list, t, key, dur = 0.9) => { let prev = 0, cur = 0, t0 = -1e9; for (const e of list) { if (e.t > t) break; prev = cur; cur = e[key]; t0 = e.t; } return prev + (cur - prev) * ease((t - t0) / dur); };

  const tmp = V3(), vs = V3();
  let lastDraw = -1, lastKey = '';
  UPDATERS.push((t, dt, camera) => {
    // camera yaw/elevation in her frame (drawing-left = +z)
    tmp.subVectors(camera.position, GIRL_AT);
    const th = Math.atan2(tmp.dot(LEFT), tmp.dot(FWD)), hd = Math.hypot(tmp.x, tmp.z), ph = Math.max(-0.05, Math.min(0.75, Math.atan2(tmp.y, hd)));
    const dist = tmp.length();
    const vis = dist < 140;
    body.mesh.visible = legs.mesh.visible = cat.mesh.visible = vis;
    if (!vis) return;
    // pixels per head unit on screen -> canvas resolution (stepped so canvases are not reallocated every frame)
    const ppu = HU * (innerHeight * Math.min(2, devicePixelRatio)) / (2 * dist * Math.tan(camera.fov * Math.PI / 360));
    const s = Math.max(18, Math.min(LOW ? 120 : 210, Math.pow(1.25, Math.round(Math.log(ppu * 1.3) / Math.log(1.25)))));
    const key = th.toFixed(3) + ph.toFixed(3) + s;
    const every = s < 40 ? 1 / 12 : LOW ? 1 / 20 : 1 / 30;            // far away: fewer redraws
    if (!PARAMS.has('film') && t - lastDraw < every && key === lastKey) return;
    lastDraw = t; lastKey = key;
    const mirror = th < 0, ath = Math.abs(th);
    // light: the sun's direction as seen on screen, in drawing space (y down)
    vs.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);
    const ll = Math.hypot(vs.x, vs.y) || 1; G.INK.light = [(th < -Math.PI / 2 ? -vs.x : vs.x) / ll * 0.045, -vs.y / ll * 0.045];   // the back key is mirrored inside girlAny
    G.INK.minW = 0.9 / s;
    const light = 1.05 + 0.25 * Math.max(0, vs.z);   // a touch brighter when the sun is behind the camera
    for (const c of [body, legs, cat]) c.mat.uniforms.uLight.value.setScalar(light);
    // idle animation
    const o = {
      swing: 1, sway: 0.028 * Math.sin(t * 1.7) + 0.012 * Math.sin(t * 3.3 + 1) + 0.01 * Math.sin(t * 0.37),
      blink: Math.min(1, pulse(blinks, t, 0.17) * 1.3), yaw: follow(looks, t, 'yaw'), gaze: follow(looks, t - 0.25, 'gaze', 0.4),
    };
    // body (legs drawn on their own card)
    // the drawing handles both sides itself (the design is asymmetric), so this card is never mirrored
    let c = body.begin(s, GIRL_AT, false);
    G.girlAny(c, t, { ...o, legs: false }, th);
    body.end();
    // legs: traced bare legs, drawn relative to the legs' anchor so they sit at their true depth;
    // from behind, the parapet hides them, so nothing is drawn
    const la = G.camera(th, ph).p2(LEGS_AT);
    c = legs.begin(s, legsWorld, false); c.translate(-la[0], -la[1]);
    if (Math.abs(th) < Math.PI / 2) G.legsFront(c, t, o, th);
    legs.end();
    // the cat: its own yaw in its own spot
    tmp.subVectors(camera.position, catWorld);
    const cth = Math.atan2(tmp.dot(LEFT), tmp.dot(FWD)), cmir = cth < 0, ca = Math.abs(cth);
    const co = { t, yaw: follow(catLooks, t, 'yaw', 0.5), blink: Math.min(1, pulse(catBlinks, t, 0.2) * 1.3), tail: pulse(flicks, t, 0.8), ear: pulse(twitches, t, 0.25) };
    if (cmir) co.yaw = -co.yaw;
    c = cat.begin(s, catWorld, cmir);
    G.catAny(c, [0, 0], co, ca);
    cat.end();
  });
}
