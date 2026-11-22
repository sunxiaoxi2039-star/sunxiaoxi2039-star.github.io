// 2D hand-drawn characters for Windvale: an ink + cel-colour drawing engine, a 3D pose skeleton
// used as the artist's construction layer, and the girl and her cat drawn on top of it.
// Everything is drawn with Canvas 2D from curves placed by hand; the 3D skeleton only places
// joints so the drawing stays consistent when the camera moves.
// Units: 1 = the girl's head height. y points down on the canvas.
const G2D = (() => {
  // ============================== ink engine ==============================
  const INK = { line: '#2e211c', paper: '#f7f2e8', mode: 'color', light: [-0.045, -0.03], minW: 0 };
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
    const { tin = 0.18, tout = 0.25, min = 0.2, wob = 0.07, seed = 7, closed = false, color = INK.line } = o;
    w = Math.max(w, INK.minW);
    const P = spline(pts, closed); if (closed) P.push(P[0]);
    const n = P.length; if (n < 2) return;
    const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = L[n - 1] || 1, r = rnd(seed * 9973 + 1), ph = r() * 6.28, fr = 2 + r() * 3;
    const lf = [], rt = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const t = L[i] / tot;
      let k = closed ? 1 : Math.min(min + (1 - min) * smooth(0, tin, t), min + (1 - min) * smooth(1, 1 - tout, t));
      k *= 1 + wob * Math.sin(t * fr * 6.28 + ph);
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
      if (INK.mode === 'paper') { path(ctx, P); ctx.fillStyle = INK.paper; ctx.fill(); }
      else if (shade || hi) {
        const lx = INK.light[0] * sk * (hi ? -1 : 1), ly = INK.light[1] * sk * (hi ? -1 : 1);
        path(ctx, P); ctx.fillStyle = shade || hi; ctx.fill();
        ctx.save(); ctx.clip(); ctx.translate(lx, ly); path(ctx, P); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
      } else { path(ctx, P); ctx.fillStyle = fill; ctx.fill(); }
    }
    if (line) stroke(ctx, pts, w, { closed: true, seed, color });
    return P;
  }
  // a cast shadow: the occluder's silhouette, offset, painted only inside the receiver
  function cast(ctx, occ, recv, off, color) {
    if (INK.mode === 'paper') return;
    ctx.save(); path(ctx, spline(recv, true)); ctx.clip(); ctx.translate(off[0], off[1]); path(ctx, spline(occ, true)); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }
  // cloth fold: a soft shadow wedge with a thin line in it
  function fold(ctx, pts, w, shadeCol, o = {}) {
    if (INK.mode !== 'paper' && shadeCol) stroke(ctx, pts, w * 4.5, { tin: 0.35, tout: 0.45, min: 0.05, wob: 0.2, color: shadeCol, seed: o.seed || 5 });
    stroke(ctx, pts, w, { tin: 0.4, tout: 0.3, ...o });
  }
  function ellipse(ctx, cx, cy, rx, ry, rot, color) { ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(1e-4, rx), Math.max(1e-4, ry), rot, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function blush(ctx, cx, cy, rx, ry, a = 0.55) {
    if (INK.mode === 'paper') return;
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
  const W0 = 0.017;
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
      ellipse(ctx, ic[0], ic[1], w * 0.3, h * 0.5, 0, INK.mode === 'paper' ? INK.line : COL.iris);
      if (INK.mode !== 'paper') { ellipse(ctx, ic[0], ic[1] + h * 0.04, w * 0.17, h * 0.3, 0, COL.pupil); }
      const hl = H([[cx + gaze * w - w * 0.1, cy - h * 0.14]])[0]; ellipse(ctx, hl[0], hl[1], w * 0.085, w * 0.085, 0, '#fff');
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

  // ============================== the girl's head, 3/4 view ==============================
  // Layers sit at different depths and slide past each other when she turns her head (yaw),
  // the way a 2D animation rig fakes rotation. Hair tips sway; the eyes blink and look around.
  const FACE34 = [[-0.36, -0.16], [-0.39, -0.02], [-0.385, 0.12], [-0.355, 0.26], [-0.29, 0.38], [-0.19, 0.46], [-0.09, 0.485], [0.04, 0.455], [0.17, 0.37], [0.26, 0.23], [0.31, 0.04], [0.31, -0.25], [0.1, -0.42], [-0.22, -0.38]];
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
    shape(ctx, face, { fill: COL.skin, shade: COL.skinS, sk: 0.7, w: W });
    // ---- everything on the face is clipped to it and slides with the turn ----
    ctx.save(); path(ctx, spline(face, true)); ctx.clip();
    const F = (p, cx, cy) => H(DS(p, 1, cx, cy));
    // shadow of the fringe on the forehead
    if (INK.mode !== 'paper') { path(ctx, spline(H(DS([[-0.42, -0.5], [0.3, -0.5], [0.26, 0.0], [0.15, 0.05], [0.05, 0.075], [-0.05, 0.08], [-0.16, 0.07], [-0.3, 0.075], [-0.42, 0.06]])), true)); ctx.fillStyle = COL.skinS; ctx.fill(); }
    blush(ctx, ...F([[0.07, 0.275]])[0].slice(0, 2), 0.085, 0.045); blush(ctx, ...F([[-0.29, 0.275]])[0].slice(0, 2), 0.04, 0.04, 0.45);
    const open = 1 - blink;
    eye(ctx, (p) => F(p, 0.02, 0.125), 0.02, 0.125, 0.2 * (1 - 0.15 * S), 0.13, { open, gaze, dir: 1, lid: 0.024 });
    eye(ctx, (p) => F(p, -0.265, 0.125), -0.265 - 0.02 * S, 0.125, 0.115 * (1 + 0.55 * S), 0.12, { open, gaze, dir: -1, lid: 0.021 });
    stroke(ctx, F([[-0.03, 0.0], [0.03, -0.012], [0.09, -0.004]]), 0.008, { tin: 0.3, tout: 0.5 });
    stroke(ctx, F([[-0.315, 0.008], [-0.285, -0.004], [-0.255, -0.002]]), 0.007, { tin: 0.3, tout: 0.5 });
    stroke(ctx, F([[-0.268, 0.24], [-0.255, 0.262], [-0.24, 0.266]], -0.255, 0.255), 0.009, { tin: 0.3, tout: 0.4 });
    stroke(ctx, F([[-0.215, 0.35], [-0.18, 0.358], [-0.145, 0.352]]), 0.01, { tin: 0.3, tout: 0.4 });
    ctx.restore();
    // shadow under the jaw is drawn by the neck; ear hidden by hair
    // ---- crown + near-side lock (front hair). The forehead edge rides on the face (parallax). ----
    const capD = (p) => p.map(([x, y, c]) => [x + (y > -0.3 && x < 0.24 ? sd(x, y) : 0) * S, y, c]);
    shape(ctx, H(capD(SW([
      [-0.4, 0.0], [-0.44, -0.2], [-0.38, -0.4], [-0.2, -0.55], [0.05, -0.61], [0.3, -0.56], [0.47, -0.42], [0.56, -0.2], [0.56, 0.05], [0.5, 0.25], [0.4, 0.5, 1],
      [0.33, 0.3], [0.27, 0.12], [0.22, -0.04], [0.15, -0.14], [0.0, -0.17], [-0.15, -0.16], [-0.3, -0.12], [-0.38, -0.1],
    ], 0.3))), { fill: COL.hair, shade: COL.hairS, sk: 1.2, w: W });
    // fringe locks, outer ones first; chunky, few, tips leaning to her front
    const lock = (root, tip, w, bend, seed, k = 0.12) => {
      const dx = tip[0] - root[0], dy = tip[1] - root[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      const m = (q, side) => [root[0] + dx * q + nx * side * w + bend * nx * 0.5, root[1] + dy * q + ny * side * w + bend * ny * 0.5];
      const pts = SW([[root[0] - nx * w * 0.5, root[1] - ny * w * 0.5], m(0.35, -0.55), m(0.75, -0.32), [tip[0], tip[1], 1], m(0.72, 0.38), m(0.35, 0.55), [root[0] + nx * w * 0.5, root[1] + ny * w * 0.5]], k);
      const P = H(DS(pts));
      shape(ctx, P, { fill: COL.hair, shade: COL.hairS, sk: 0.6, line: false });
      stroke(ctx, P, 0.012, { tin: 0.05, tout: 0.05, min: 0.6, seed });
    };
    lock([0.17, -0.26], [0.145, 0.03], 0.1, 0.02, 61);
    lock([-0.33, -0.26], [-0.375, 0.05], 0.1, -0.02, 62);
    lock([0.05, -0.3], [-0.025, 0.05], 0.15, 0.035, 63);
    lock([-0.2, -0.29], [-0.29, 0.035], 0.14, 0.03, 64);
    lock([-0.075, -0.31], [-0.165, 0.025], 0.13, 0.03, 65);
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
  function headBack(ctx, at, o = {}) {
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
  const TB = 2.44;
  function girlBack(ctx, t = 0, o = {}, th = TB) {
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

  function catBack(ctx, at, o = {}) {
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

  return { INK, COL, LEDGE, pose, camera, spline, stroke, shape, cast, fold, ellipse, blush, xf, path, limbOutline, arm, hand, sleeve, shin, shoe, eye, head34, headBack, headSide, girl07, girlSide, girlBack, cat07, catSide, catBack, TS, skinner, ledge, TH07, TB, W0 };
})();

/* =====================  the girl & her cat in the 3D town  ===================== *
 * They are 2D drawings (G2D above), redrawn every frame into small canvases and shown on
 * camera-facing cards. Three key drawings (front 3/4, profile, back 3/4, mirrored for the other
 * side) are bent toward the real camera angle with the 3D skeleton, so turning the camera turns
 * them. Her legs are a separate card at their true depth so the parapet hides them correctly.
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
  const G = G2D; G.INK.mode = 'color';
  const body = new Card(scene, [-1.7, 1.7, -3.15, 0.5], 0.45, 0);
  const legs = new Card(scene, [-1.3, 1.3, -1.0, 1.05], 0.05, 0);
  const cat = new Card(scene, [-0.7, 0.7, -1.65, 0.22], 0.2, 1);
  const LEGS_AT = [0, -0.45, 1.25];               // shins' centre, her local drawing frame (head units)
  const CAT_AT = [-1.6, 0, 0.1];                  // the cat sits on her right, toward the town
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
  const looks = sched(150, 3, 7, () => { const r = rng(); const yaw = li++ % 2 === 0 ? 0 : r < 0.55 ? -0.42 : r < 0.8 ? 0.34 : -0.22; return { yaw, gaze: (rng() - 0.5) * 0.08 }; });
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
    const ll = Math.hypot(vs.x, vs.y) || 1; G.INK.light = [(mirror ? -vs.x : vs.x) / ll * 0.045, -vs.y / ll * 0.045];
    G.INK.minW = 0.9 / s;
    const light = 1.05 + 0.25 * Math.max(0, vs.z);   // a touch brighter when the sun is behind the camera
    for (const c of [body, legs, cat]) c.mat.uniforms.uLight.value.setScalar(light);
    // idle animation
    const o = {
      swing: 1, sway: 0.028 * Math.sin(t * 1.7) + 0.012 * Math.sin(t * 3.3 + 1) + 0.01 * Math.sin(t * 0.37),
      blink: Math.min(1, pulse(blinks, t, 0.17) * 1.3), yaw: follow(looks, t, 'yaw'), gaze: follow(looks, t - 0.25, 'gaze', 0.4),
    };
    if (th < 0) { o.yaw = -o.yaw; o.gaze = -o.gaze; }   // mirrored drawing: her left/right swap on paper
    const which = ath < 1.135 ? 'f' : ath < 2.005 ? 's' : 'b';
    const cam = G.camera(ath, ph);
    // body (legs drawn on their own card)
    let c = body.begin(s, GIRL_AT, mirror);
    if (which === 'f') G.girl07(c, t, { ...o, legs: false }, ath); else if (which === 's') G.girlSide(c, t, { ...o, legs: false }, ath); else G.girlBack(c, t, o, ath);
    body.end();
    // legs: shins + shoes, drawn relative to the legs' anchor so they sit at their true depth
    const la = cam.p2(LEGS_AT);
    c = legs.begin(s, legsWorld, mirror); c.translate(-la[0], -la[1]);
    if (which !== 'b') { const J = G.pose(t, o); const camA = G.camera(ath, ph);
      // skirt silhouette for the shadow it casts on the shins (rough: lap ellipse around the knees)
      const kn = camA.p2(J.kneeL), kr = camA.p2(J.kneeR);
      const lap = [[kn[0] - 0.25, kn[1] - 0.2], [kr[0] - 0.25, kr[1] - 0.2], [kr[0] + 0.2, kr[1] + 0.12], [kn[0] + 0.2, kn[1] + 0.14]];
      G.shin(c, camA, J, 'R', lap); G.shoe(c, camA, J, 'R'); G.shin(c, camA, J, 'L', lap); G.shoe(c, camA, J, 'L'); }
    legs.end();
    // the cat: its own yaw in its own spot
    tmp.subVectors(camera.position, catWorld);
    const cth = Math.atan2(tmp.dot(LEFT), tmp.dot(FWD)), cmir = cth < 0, ca = Math.abs(cth);
    const co = { t, yaw: follow(catLooks, t, 'yaw', 0.5), blink: Math.min(1, pulse(catBlinks, t, 0.2) * 1.3), tail: pulse(flicks, t, 0.8), ear: pulse(twitches, t, 0.25) };
    const cw = ca < 1.135 ? 'f' : ca < 2.005 ? 's' : 'b', ckey = cw === 'f' ? 0.7 : cw === 's' ? Math.PI / 2 : 2.44;
    if (cmir) co.yaw = -co.yaw;
    co.yaw += (ckey - ca) * 0.6;
    c = cat.begin(s, catWorld, cmir);
    if (cw === 'f') G.cat07(c, [0, 0], co); else if (cw === 's') G.catSide(c, [0, 0], co); else G.catBack(c, [0, 0], co);
    cat.end();
  });
}
