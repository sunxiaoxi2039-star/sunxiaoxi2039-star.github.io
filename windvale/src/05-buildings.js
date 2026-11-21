/* =====================  the buildings of Windvale  ===================== */
function rod(B, key, a, b, r, col = 0xffffff, seg = 6) {
  const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length();
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize()), V3(1, 1, 1));
  B.add(key, cylM(r, r, len, seg), col, m);
}
const faceM = (w, d, f) => ({ front: T(0, 0, d / 2), back: T(0, 0, -d / 2, Math.PI), left: T(-w / 2, 0, 0, -Math.PI / 2), right: T(w / 2, 0, 0, Math.PI / 2) })[f];
function ivyOn(B, m, x0, x1, y0, y1, density = 1) { ANCHORS.ivy.push({ m: worldOf(B, m), x0, x1, y0, y1, density }); }

function dormer(B, roofH, x, zFront, w = 1.5, h = 1.7, o = {}) {
  const yb = roofH(x, zFront) - 0.15; const dd = 2.2;
  B.push(T(x, yb, zFront));
  B.add(o.wallKey ?? 'plaster', wallGeo(w, h, 0.14, [{ x: 0, y: 0.35, w: w * 0.5, h: h * 0.62 }], w * 0.5), o.wallCol ?? PAL.cream, T(0, 0, 0));
  addWindow(B, { x: 0, y: 0.35, w: w * 0.5, h: h * 0.62 }, { inset: 0.07, sill: false, panes: [2, 2], frame: PAL.frame });
  for (const s of [-1, 1]) B.add(o.wallKey ?? 'plaster', boxM(0.12, h, dd), o.wallCol ?? PAL.cream, T(s * (w / 2 - 0.06), h / 2, -dd / 2));
  B.push(T(0, 0, -dd / 2 + 0.25, Math.PI / 2));
  gableRoof(B, { L: dd + 0.5, half: w / 2 + 0.28, eaveY: h - 0.1, ridgeY: h + w * 0.5 + 0.12, key: o.key ?? 'roof', col: o.col ?? PAL.terracotta, sag: 0.04, rsag: 0.01, ohE: 0.28, t: 0.1 });
  B.pop(); B.pop();
}

/* half-timber framing on a face (outer face z=0) */
function timbers(B, len, y0, y1, floors, wins, gable = 0, col = PAL.timber) {
  const tb = 0.15, dz = 0.03;
  const hb = (y, xa = -len / 2, xb = len / 2) => B.add('wood', boxM(xb - xa, tb, 0.07), jitter(col, 0.01, 0.04, 0.04), T((xa + xb) / 2, y, dz));
  const vb = (x, ya, yb) => B.add('wood', boxM(tb, yb - ya, 0.07), jitter(col, 0.01, 0.04, 0.04), T(x, (ya + yb) / 2, dz));
  const db = (xa, ya, xb, yb) => { const L = Math.hypot(xb - xa, yb - ya); B.add('wood', boxM(L, tb * 0.85, 0.06), jitter(col, 0.01, 0.04, 0.04), T((xa + xb) / 2, (ya + yb) / 2, dz + 0.005, 0, 0, Math.atan2(yb - ya, xb - xa))); };
  const levels = [y0, ...floors, y1];
  levels.forEach((y, i) => hb(i === 0 ? y + tb / 2 : i === levels.length - 1 ? y - tb / 2 : y));
  for (let f = 0; f < levels.length - 1; f++) {
    const ya = levels[f], yb = levels[f + 1];
    const ws = wins.filter((w) => w.y >= ya && w.y < yb).sort((a, b) => a.x - b.x);
    const xs = [-len / 2 + tb / 2];
    for (const w of ws) xs.push(w.x - w.w / 2 - 0.12, w.x + w.w / 2 + 0.12);
    xs.push(len / 2 - tb / 2);
    xs.forEach((x) => vb(x, ya, yb));
    for (const w of ws) { hb(w.y - 0.1, w.x - w.w / 2 - 0.12, w.x + w.w / 2 + 0.12); hb(w.y + w.h + 0.1, w.x - w.w / 2 - 0.12, w.x + w.w / 2 + 0.12); }
    for (let i = 0; i < xs.length - 1; i++) {
      const xa = xs[i], xb = xs[i + 1]; if (xb - xa < 0.5) continue;
      const inWin = ws.some((w) => w.x > xa && w.x < xb); if (inWin) continue;
      if (xb - xa > 1.6) { const xm = (xa + xb) / 2; vb(xm, ya, yb); db(xa, ya, xm, yb); db(xb, ya, xm, yb); }
      else if ((i + f) % 2) db(xa, ya, xb, yb); else db(xa, yb, xb, ya);
    }
  }
  if (gable > 0) {
    const yTop = y1 + gable;
    db(-len / 2, y1, 0, yTop); db(len / 2, y1, 0, yTop);
    vb(0, y1, yTop - 0.3);
    const yc = y1 + gable * 0.45; const half = len / 2 * (1 - 0.45);
    hb(yc, -half, half);
    db(-half * 0.55, y1, 0, yc); db(half * 0.55, y1, 0, yc);
  }
}

/* ---------------- 1. bakery ---------------- */
function buildBakery(B) {
  const w = 9.0, d = 7.6, baseH = 4.1, H = 9.4;
  B.push(T(-11.9, 0, 15.6, 0.42));
  const stG = { shutter: PAL.shGreen, box: 'geranium', lintel: 'stone' };
  const front = [
    { type: 'hole', x: -1.5, y: 0.78, w: 3.5, h: 2.1 },
    { type: 'door', x: 1.85, y: 0.02, w: 1.15, h: 2.7, arch: true, st: { col: '#355c4c', fan: true } },
    { type: 'win', x: 3.72, y: 1.05, w: 0.62, h: 1.35, st: { frame: '#2f5646', panes: [1, 3], lintel: 'stone' } },
    { type: 'win', x: -2.9, y: 4.75, w: 1.0, h: 1.55, st: stG }, { type: 'win', x: 0, y: 4.75, w: 1.0, h: 1.55, st: stG }, { type: 'win', x: 2.9, y: 4.75, w: 1.0, h: 1.55, st: stG },
    { type: 'win', x: -2.9, y: 7.4, w: 0.95, h: 1.35, st: { ...stG, box: 'mixed' } }, { type: 'win', x: 0, y: 7.4, w: 0.95, h: 1.55, st: { shutter: PAL.shGreen, lintel: 'stone', sill: false } },
    { type: 'win', x: 2.9, y: 7.4, w: 0.95, h: 1.35, st: { ...stG, box: 'mixed' } },
  ];
  const left = [
    { type: 'win', x: 1.4, y: 1.1, w: 0.75, h: 1.25, st: { frame: '#2f5646', panes: [2, 2], lintel: 'stone' } },
    { type: 'win', x: -1.5, y: 4.8, w: 0.9, h: 1.4, st: { shutter: PAL.shGreen, box: 'trail' } }, { type: 'win', x: 1.5, y: 4.8, w: 0.9, h: 1.4, st: { shutter: PAL.shGreen } },
    { type: 'win', x: 0, y: 7.4, w: 0.85, h: 1.3, st: { shutter: PAL.shGreen } },
    { type: 'win', x: 0, y: 10.0, w: 0.62, h: 0.95, arch: true, st: { sill: true, panes: [2, 2], lintel: 'arch' } },
  ];
  const right = [{ type: 'win', x: -1.4, y: 4.8, w: 0.9, h: 1.4, st: { shutter: PAL.shGreen } }, { type: 'win', x: 1.2, y: 7.4, w: 0.85, h: 1.3, st: {} }];
  const back = [{ type: 'door', x: -2.5, y: 0.02, w: 1.0, h: 2.2, st: { col: PAL.doorRed } }, ...row(3, w - 1, 4.8, 0.95, 1.4, {})];
  const roofH = house(B, { w, d, H, base: { h: baseH, key: 'stone', col: '#ead9ba' }, wallKey: 'plaster', wallCol: '#f6e6c4', ridge: 'x', rise: 4.4,
    roof: { key: 'roof', col: '#c65a39', sag: 0.17, rsag: 0.1, ohE: 0.6, ohG: 0.45 }, faces: { front, left, right, back }, quoins: true, string: [6.95] });
  dormer(B, roofH, -1.45, d / 2 - 0.55, 1.55, 1.75, { col: '#c65a39' });
  chimney(B, 2.9, -1.3, roofH(2.9, -1.3) - 0.6, roofH(0, 0) + 1.3, { smoke: 1.0, col: '#d9c3a2' });
  chimney(B, -3.6, 0.6, roofH(-3.6, 0.6) - 0.6, roofH(0, 0) + 0.6, { smoke: 0, pot2: false, w: 0.55, d: 0.5 });

  /* --- shopfront (front face frame) --- */
  B.push(faceM(w, d, 'front'));
  const sx = -1.5, sw = 3.5, sy = 0.78, sh = 2.1, frameC = '#2c5545';
  // pilasters + fascia
  for (const px of [sx - sw / 2 - 0.2, sx + sw / 2 + 0.2, 1.85 + 0.82]) B.add('wood', boxM(0.24, 3.05, 0.12), frameC, T(px, 1.52, 0.05));
  B.add('wood', boxM(6.85, 0.16, 0.18), frameC, T(-0.45, 3.12, 0.07));
  const fas = new THREE.PlaneGeometry(6.6, 0.5); B.add('fascia', fas, 0xffffff, T(-0.45, 3.5, 0.13));
  B.add('wood', boxM(6.85, 0.1, 0.2), frameC, T(-0.45, 3.8, 0.08)); B.add('wood', boxM(6.85, 0.1, 0.16), frameC, T(-0.45, 3.2, 0.08));
  // window frame & mullions
  const fz = -0.1;
  B.add('wood', boxM(sw, 0.1, 0.12), frameC, T(sx, sy + 0.05, fz)); B.add('wood', boxM(sw, 0.1, 0.12), frameC, T(sx, sy + sh - 0.05, fz));
  B.add('wood', boxM(sw, 0.07, 0.1), frameC, T(sx, sy + 1.55, fz));
  for (let i = 0; i <= 4; i++) B.add('wood', boxM(i % 4 ? 0.06 : 0.1, sh, 0.11), frameC, T(sx - sw / 2 + sw * i / 4 + (i === 0 ? 0.05 : i === 4 ? -0.05 : 0), sy + sh / 2, fz));
  for (let i = 1; i < 8; i++) B.add('wood', boxM(0.035, 0.5, 0.06), frameC, T(sx - sw / 2 + sw * i / 8, sy + 1.82, fz));
  B.add('glassClear', new THREE.PlaneGeometry(sw, sh), 0xffffff, T(sx, sy + sh / 2, fz - 0.02));
  B.add('trim', boxM(sw + 0.3, 0.09, 0.32), PAL.stoneWarm, T(sx, sy - 0.04, 0.05));
  // interior room behind the shop window (unlit warm colours)
  const ix0 = sx - 2.1, ix1 = sx + 2.1, iz0 = -0.42, iz1 = -3.4, ih = 3.4;
  const wallC = C('#b58e62'), floorC = C('#6a4a33'), ceilC = C('#8d6a48');
  const pl = (wd, ht, m, c) => B.add('interior', new THREE.PlaneGeometry(wd, ht), c, m);
  pl(ix1 - ix0, ih, T((ix0 + ix1) / 2, ih / 2, iz1), wallC);
  pl(iz0 - iz1, ih, T(ix0, ih / 2, (iz0 + iz1) / 2, Math.PI / 2), C('#a07a52'));
  pl(iz0 - iz1, ih, T(ix1, ih / 2, (iz0 + iz1) / 2, -Math.PI / 2), C('#a07a52'));
  pl(ix1 - ix0, iz0 - iz1, T((ix0 + ix1) / 2, 0.02, (iz0 + iz1) / 2, 0, -Math.PI / 2), floorC);
  pl(ix1 - ix0, iz0 - iz1, T((ix0 + ix1) / 2, ih, (iz0 + iz1) / 2, 0, Math.PI / 2), ceilC);
  const breadCols = ['#d9a05a', '#c98a45', '#b87538', '#e2b46e', '#a8642f'];
  for (const [y, n] of [[0.95, 9], [1.55, 8], [2.15, 7]]) {
    B.add('interior', boxM(ix1 - ix0 - 0.2, 0.05, 0.45), C('#7b5639'), T((ix0 + ix1) / 2, y, iz1 + 0.25));
    for (let i = 0; i < n; i++) { const bx = ix0 + 0.35 + i * (ix1 - ix0 - 0.7) / (n - 1);
      if (R() < 0.5) B.add('interior', new THREE.SphereGeometry(0.15, 10, 6), C(pick(breadCols)), T(bx, y + 0.1, iz1 + 0.25 + R(-0.05, 0.05), R(0, 3), 0, 0, 1, 0.62, 1));
      else B.add('interior', new THREE.CapsuleGeometry(0.06, 0.34, 4, 8), C(pick(breadCols)), T(bx, y + 0.08, iz1 + 0.25, R(-0.4, 0.4), 0, Math.PI / 2)); }
  }
  B.add('interior', boxM(2.6, 0.95, 0.6), C('#7a5236'), T(sx + 0.2, 0.47, -1.9));
  B.add('interior', boxM(2.7, 0.06, 0.7), C('#d8c7a8'), T(sx + 0.2, 0.97, -1.9));
  for (let i = 0; i < 6; i++) B.add('interior', new THREE.TorusGeometry(0.08, 0.04, 6, 10, Math.PI * 1.2), C(pick(breadCols)), T(sx - 0.8 + i * 0.36, 1.03, -1.9 + R(-0.15, 0.15), R(0, 3), Math.PI / 2));
  B.add('interior', new THREE.SphereGeometry(0.16, 12, 8), C('#ffe9b8'), T(sx, 2.75, -1.7));
  B.add('interior', cylM(0.01, 0.01, 0.6, 4), C('#2a2520'), T(sx, 3.1, -1.7));
  // display counter just behind the glass
  B.add('wood', boxM(sw - 0.2, 0.06, 0.4), '#8a603f', T(sx, sy + 0.1, -0.35));
  for (let i = 0; i < 7; i++) B.add('bread', new THREE.SphereGeometry(0.11, 10, 6), pick(breadCols), T(sx - 1.4 + i * 0.47, sy + 0.18, -0.33, R(0, 3), 0, 0, 1.2, 0.55, 1));

  // awning: sagging striped fabric with a scalloped valance
  const ax0 = sx - sw / 2 - 0.35, ax1 = 1.85 + 0.85, ay = 3.02, proj = 1.6, drop = 0.62;
  const awY = (u, v) => ay - v * drop - 0.13 * Math.sin(Math.PI * v) * (0.75 + 0.25 * Math.cos(u * TAU * 3)) - 0.012 * Math.sin(u * 70) * v;
  const aw = surfaceGeo(48, 12, (u, v, p) => p.set(lerp(ax0, ax1, u), awY(u, v), 0.04 + v * proj), (u, v) => [u, v * 0.8]);
  B.add('awning', aw, 0xffffff);
  const nSc = 14;
  const val = surfaceGeo(nSc * 8, 2, (u, v, p) => { const s = Math.abs(Math.sin(Math.PI * u * nSc)); p.set(lerp(ax0, ax1, u), awY(u, 1) - v * (0.17 + 0.11 * s), 0.04 + proj + 0.01 * Math.sin(u * 90)); }, (u, v) => [u, 0.85 + v * 0.1]);
  B.add('awning', val, 0xffffff);
  for (const s of [ax0 + 0.15, ax1 - 0.15]) rod(B, 'metal', V3(s, 2.05, 0.05), V3(s, awY(0.5, 1) + 0.02, 0.04 + proj - 0.05), 0.022);
  B.add('metal', cylM(0.025, 0.025, ax1 - ax0, 6), 0xffffff, T((ax0 + ax1) / 2, awY(0.5, 1) + 0.02, 0.04 + proj - 0.02, 0, 0, Math.PI / 2));

  wallLantern(B, 2.85, 2.65, 0.02);

  // bench with bread baskets in front of the window
  B.add('wood', boxM(2.6, 0.06, 0.5), '#8b6345', T(sx, 0.52, 0.55));
  for (const lx of [-1.15, 1.15]) for (const lz of [0.36, 0.74]) B.add('wood', boxM(0.06, 0.5, 0.06), '#7a5539', T(sx + lx, 0.25, lz));
  const basket = (x, z, r, h) => B.add('wicker', new THREE.LatheGeometry([[0, 0], [r * 0.8, 0], [r, h * 0.8], [r * 1.05, h], [r * 0.98, h], [r * 0.92, h * 0.4], [0, h * 0.35]].map(([a, b]) => new THREE.Vector2(a, b)), 16), 0xffffff, T(x, 0.55, z));
  basket(sx - 0.85, 0.58, 0.22, 0.32);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; B.add('bread', new THREE.CapsuleGeometry(0.035, 0.6, 4, 8), pick(breadCols), T(sx - 0.85 + Math.cos(a) * 0.08, 0.95, 0.58 + Math.sin(a) * 0.08, a, Math.cos(a) * 0.18, Math.sin(a) * 0.18)); }
  basket(sx, 0.55, 0.3, 0.14);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; B.add('bread', new THREE.SphereGeometry(0.11, 12, 8), pick(breadCols), T(sx + Math.cos(a) * 0.14, 0.7, 0.55 + Math.sin(a) * 0.12, R(0, 3), 0, 0, 1, 0.62, 1)); }
  basket(sx + 0.85, 0.56, 0.24, 0.16);
  for (let i = 0; i < 6; i++) B.add('bread', new THREE.TorusGeometry(0.07, 0.035, 6, 10, Math.PI * 1.25), pick(['#d49a52', '#c98a45', '#e0aa62']), T(sx + 0.85 + R(-0.12, 0.12), 0.72, 0.56 + R(-0.1, 0.1), R(0, 6), Math.PI / 2));
  // chalkboard A-frame
  B.push(T(3.05, 0, 1.15, -0.5));
  for (const s of [-1, 1]) { B.add('wood', boxM(0.62, 0.95, 0.04), '#6b4a33', T(0, 0.5, s * 0.16, 0, s * 0.17)); }
  B.add('chalk', new THREE.PlaneGeometry(0.5, 0.72), 0xffffff, T(0, 0.55, 0.19, 0, 0.17));
  B.pop();
  // pots by the door, lavender trough, lantern
  pot(B, 1.0, 0.0, 0.45, 0.26, 0.42, 'geranium'); pot(B, 2.72, 0.0, 0.45, 0.24, 0.4, 'boxwood');
  B.add('stone', boxM(0.9, 0.3, 0.35), '#d9cbb0', T(3.72, 0.15, 0.3));
  ANCHORS.beds.push({ m: worldOf(B, T(3.72, 0.3, 0.3)), w: 0.8, d: 0.25, kind: 'lavender', n: 10 });
  // climbing roses around the door, ivy at the left corner
  ivyOn(B, T(0, 0, 0.04), 2.55, 2.75, 0.2, 3.0, 0.6);
  B.pop();
  ivyOn(B, T(-w / 2, 0, 0, -Math.PI / 2).multiply(T(0, 0, 0.04)), 1.6, 3.7, 0.0, 7.5, 1.3);
  ANCHORS.roses = worldOf(B, faceM(w, d, 'front'));
  // hanging sign on a wrought-iron bracket from the right-hand wall (the sign itself swings: life module)
  const bz = d / 2 - 0.65;
  rod(B, 'metal', V3(w / 2, 4.0, bz), V3(w / 2 + 1.35, 4.0, bz), 0.026);
  rod(B, 'metal', V3(w / 2, 3.35, bz), V3(w / 2 + 0.85, 4.0, bz), 0.018);
  B.add('metal', new THREE.TorusGeometry(0.17, 0.014, 5, 16, Math.PI * 1.5), 0xffffff, T(w / 2 + 0.38, 3.8, bz));
  ANCHORS.sign = worldOf(B, T(w / 2 + 0.85, 3.98, bz));
  B.pop();
}

/* ---------------- 2. half-timbered house with a jetty ---------------- */
function buildHouseA(B) {
  const w = 7.0, d = 8.2;
  B.push(T(-11.1, 0, 4.3, 1.40));
  house(B, { w, d, H: 3.1, wallKey: 'stone', wallCol: '#e0d0b2', ridge: 'z', noRoof: true, plinth: false,
    faces: { front: [{ type: 'door', x: -1.6, y: 0.02, w: 1.1, h: 2.3, arch: true, st: { col: '#7a4a33' } }, { type: 'win', x: 1.5, y: 0.95, w: 1.1, h: 1.3, st: { shutter: PAL.shRed, lintel: 'stone' } }],
      left: [{ type: 'win', x: 1.4, y: 1.0, w: 0.9, h: 1.2, st: { lintel: 'stone' } }, { type: 'win', x: -1.8, y: 1.0, w: 0.9, h: 1.2, st: { lintel: 'stone' } }], right: [], back: [] } });
  B.add('wood', boxM(w + 0.45, 0.2, d + 0.55), PAL.timber, T(0, 3.08, 0.22));
  for (const x of [-2.6, -0.9, 0.9, 2.6]) B.add('wood', boxM(0.16, 0.45, 0.5), PAL.timber, T(x, 2.84, d / 2 + 0.05, 0, 0.5));
  B.push(T(0, 0, 0.22));
  const W = w + 0.3, D = d + 0.45;
  const fw = [{ x: -1.8, y: 3.75, w: 0.95, h: 1.3 }, { x: 1.8, y: 3.75, w: 0.95, h: 1.3 }, { x: -1.8, y: 6.4, w: 0.9, h: 1.2 }, { x: 1.8, y: 6.4, w: 0.9, h: 1.2 }, { x: 0, y: 9.3, w: 0.8, h: 1.0 }, { x: 0, y: 11.0, w: 0.42, h: 0.55 }];
  const lw = [{ x: -2.2, y: 3.75, w: 0.95, h: 1.3 }, { x: 1.6, y: 3.75, w: 0.95, h: 1.3 }, { x: -2.2, y: 6.4, w: 0.9, h: 1.2 }, { x: 1.6, y: 6.4, w: 0.9, h: 1.2 }];
  const st = { frame: '#efe6d2', panes: [2, 3], box: 'geranium', boxCol: '#6e4a32', sillCol: '#cdbb9a' };
  const roofH = house(B, { w: W, d: D, H: 8.6, y0: 3.15, wallKey: 'plaster', wallCol: '#f6efdf', ridge: 'z', rise: 5.4, plinth: false,
    roof: { key: 'roof', col: '#a24c34', sag: 0.13, rsag: 0.06, ohE: 0.45, ohG: 0.6, barge: '#4e3627' },
    faces: { front: fw.map((o, i) => ({ type: 'win', ...o, st: i < 4 ? st : { frame: '#efe6d2', panes: [2, 2], sill: false } })), left: lw.map((o) => ({ type: 'win', ...o, st })), right: [], back: [] } });
  B.push(faceM(W, D, 'front')); timbers(B, W, 3.15, 8.6, [5.85], fw, 5.4 * 0.98); B.pop();
  B.push(faceM(W, D, 'left')); timbers(B, D - 0.76, 3.15, 8.6, [5.85], lw); B.pop();
  chimney(B, 1.6, -2.6, roofH(1.6, -2.6) - 0.5, 8.6 + 5.4 + 0.8, { col: '#c9b597', smoke: 0.6 });
  B.pop(); B.pop();
}

/* ---------------- 3. yellow house with slate roof ---------------- */
function buildHouseS(B) {
  const w = 7.0, d = 8.0; B.push(T(-11.4, 0, -4.7, Math.PI / 2));
  const sR = { shutter: PAL.shRed, box: 'mixed' };
  const roofH = house(B, { w, d, H: 6.7, wallKey: 'plaster', wallCol: '#f2dc9e', ridge: 'x', rise: 3.7, quoins: '#e9dcc2', string: [3.35],
    roof: { key: 'slate', col: PAL.slate, sag: 0.1, rsag: 0.05, ohE: 0.5, ohG: 0.35 },
    faces: { front: [{ type: 'door', x: 2.3, y: 0.02, w: 1.05, h: 2.35, st: { col: PAL.doorBlue, fan: true } }, { type: 'win', x: -0.9, y: 0.75, w: 2.2, h: 1.85, st: { panes: [4, 2], frame: '#f3efe6', lintel: 'stone' } },
      ...row(3, w - 0.8, 3.95, 0.95, 1.45, sR)], left: [{ type: 'win', x: 0.8, y: 3.95, w: 0.9, h: 1.4, st: sR }], right: [], back: row(2, w, 3.95, 0.9, 1.4, {}) } });
  dormer(B, roofH, 0, d / 2 - 0.5, 1.5, 1.6, { key: 'slate', col: PAL.slate });
  chimney(B, -2.4, -1.0, roofH(-2.4, -1.0) - 0.5, roofH(0, 0) + 1.0, { col: '#cdbda3' });
  B.push(faceM(w, d, 'front'));
  // flower stall under the window: tiered wooden steps with pots
  for (let i = 0; i < 3; i++) B.add('wood', boxM(2.2, 0.05, 0.3), '#8f6a4a', T(-0.9, 0.25 + i * 0.25, 0.75 - i * 0.28));
  for (const lx of [-1.95, 0.15]) B.add('wood', boxM(0.05, 0.75, 0.9), '#7c5a3e', T(lx, 0.37, 0.48));
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) pot(B, -1.65 + k * 0.5, 0.28 + i * 0.25, 0.75 - i * 0.28, 0.11, 0.16, pick(['geranium', 'daisy', 'lavender', 'hydrangea']));
  wallLantern(B, 1.55, 2.6, 0.02);
  B.pop();
  B.pop();
}

/* ---------------- 4. round tower ---------------- */
function buildTower(B) {
  const R = 3.1, H = 15.6; B.push(T(-9.9, 0, -12.3));
  const stoneC = C('#e2d3b5');
  B.add('stone', cylM(R + 0.04, R + 0.42, 1.8, 44), C('#d8c8aa'), T(0, 0.1, 0));
  B.add('stone', cylM(R, R, H - 0.8, 44), stoneC, T(0, 0.8 + (H - 0.8) / 2, 0));
  for (const y of [5.4, 10.6]) B.add('trim', cylM(R + 0.09, R + 0.09, 0.18, 44), C('#e6dac2'), T(0, y, 0));
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; B.add('trim', boxM(0.22, 0.5, 0.34), C('#ddd0b6'), T(Math.sin(a) * (R + 0.12), H - 0.25, Math.cos(a) * (R + 0.12), a)); }
  B.add('trim', cylM(R + 0.36, R + 0.36, 0.14, 44), C('#e8dcc4'), T(0, H + 0.05, 0));
  B.add('plaster', cylM(R + 0.3, R + 0.3, 2.1, 44), C('#f4e7cc'), T(0, H + 1.12, 0));
  B.add('trim', cylM(R + 0.4, R + 0.4, 0.16, 44), C('#e8dcc4'), T(0, H + 2.2, 0));
  coneRoof(B, { R: R + 1.05, y0: H + 2.25, H: 7.4, key: 'slate', col: '#6b8399', flare: 1.55 });
  ANCHORS.vane = V3(0, H + 2.25 + 7.4 + 1.25, 0).applyMatrix4(B.top);
  // tower windows: inserts facing radially outward
  const insert = (a, y, w, h, R0, big = false) => {
    B.push(T(Math.sin(a) * R0, 0, Math.cos(a) * R0, a));
    const fc = C('#e7dbc3');
    B.add('trim', boxM(0.16, h + 0.1, 0.3), fc, T(-w / 2 - 0.08, y + h / 2, 0.05)); B.add('trim', boxM(0.16, h + 0.1, 0.3), fc, T(w / 2 + 0.08, y + h / 2, 0.05));
    B.add('trim', boxM(w + 0.4, 0.12, 0.38), fc, T(0, y - 0.05, 0.08));
    B.add('trim', archRingGeo(w / 2, w / 2 + 0.17, 0.3, 10), fc, T(0, y + h, 0.2));
    B.add('glass', new THREE.PlaneGeometry(w, h + w / 2), '#ffffff', T(0, y + (h + w / 2) / 2, 0.075));
    B.add('wood', boxM(0.035, h + w / 2, 0.04), PAL.frame, T(0, y + (h + w / 2) / 2, 0.09));
    if (big) {
      B.add('trim', boxM(w + 0.9, 0.12, 0.85), C('#ddd0b6'), T(0, y - 0.12, 0.4));
      for (const s of [-1, 1]) B.add('trim', boxM(0.16, 0.42, 0.62), C('#d6c8ac'), T(s * (w / 2 + 0.2), y - 0.42, 0.3));
      for (let i = 0; i <= 10; i++) { const x = -(w + 0.8) / 2 + i * (w + 0.8) / 10; B.add('metal', cylM(0.014, 0.014, 0.85, 4), 0xffffff, T(x, y + 0.36, 0.8)); }
      B.add('metal', boxM(w + 0.85, 0.035, 0.035), 0xffffff, T(0, y + 0.8, 0.8));
      for (const s of [-1, 1]) B.add('metal', boxM(0.035, 0.035, 0.7), 0xffffff, T(s * (w + 0.82) / 2, y + 0.8, 0.45));
      ANCHORS.flowerBoxes.push({ m: worldOf(B, T(0, y + 0.82, 0.74)), w: w + 0.6, d: 0.14, kind: 'trail' });
    }
    B.pop();
  };
  const toStreet = Math.PI / 2;
  [[toStreet - 0.55, 2.6], [toStreet + 0.35, 4.3], [toStreet + 1.3, 6.6], [toStreet - 0.9, 7.9], [toStreet - 0.15, 9.3], [toStreet + 0.9, 12.0]].forEach(([a, y]) => insert(a, y, 0.42, 0.95, R - 0.04));
  insert(toStreet + 0.08, 11.6, 0.95, 1.45, R - 0.04, true);
  for (let i = 0; i < 6; i++) insert(toStreet + (i - 2.5) * 0.85, H + 0.55, 0.36, 0.62, R + 0.26);
  // portal
  B.push(T(Math.sin(toStreet) * (R - 0.1), 0, Math.cos(toStreet) * (R - 0.1), toStreet));
  for (const sx of [-1, 1]) B.add('stone', boxM(0.42, 2.3, 0.7), C('#e7d9bd'), T(sx * 0.84, 1.1, 0.35));
  B.add('trim', archRingGeo(0.63, 1.05, 0.7, 14), C('#efe4cc'), T(0, 2.25, 0.7));
  B.add('stone', boxM(2.1, 0.5, 0.7), C('#e7d9bd'), T(0, 3.35, 0.35));
  B.add('wood', boxM(1.26, 2.25, 0.08), '#6a4630', T(0, 1.12, 0.18));
  B.add('wood', new THREE.CircleGeometry(0.63, 14, 0, Math.PI), '#6a4630', T(0, 2.25, 0.18));
  for (let i = 0; i < 6; i++) B.add('wood', boxM(0.02, 2.7, 0.02), '#4e3424', T(-0.5 + i * 0.2, 1.35, 0.23));
  B.add('metal', new THREE.TorusGeometry(0.07, 0.012, 5, 12), 0xffffff, T(0.35, 1.15, 0.25));
  B.add('trim', boxM(1.9, 0.16, 0.9), PAL.stoneGray, T(0, 0.04, 0.75));
  B.pop();
  for (const da of [0.75, 1.15, 1.55]) ivyOn(B, T(Math.sin(toStreet + da) * (R + 0.03), 0, Math.cos(toStreet + da) * (R + 0.03), toStreet + da), -0.6, 0.6, 0, 7.5 - da * 2.5, 1.2);
  
  // the tower's lower annex toward the house behind
  B.push(T(-3.2, 0, -1.8, Math.PI / 2));
  house(B, { w: 4.6, d: 4.4, H: 5.0, wallKey: 'plaster', wallCol: '#efdcc2', ridge: 'x', rise: 2.0, roof: { key: 'roof', col: PAL.brown, sag: 0.06 },
    faces: { front: [{ type: 'win', x: 0, y: 2.6, w: 0.8, h: 1.2, st: { shutter: PAL.shTeal } }] } });
  B.pop();
  B.pop();
}

/* ---------------- 5. houses before the arch ---------------- */
function buildHouseT1(B) {
  const w = 7.0, d = 9.0; B.push(T(-11.0, 0, -20.6, Math.PI / 2));
  const st = { shutter: PAL.shBlue, box: 'geranium' };
  const roofH = house(B, { w, d, H: 9.0, wallKey: 'plaster', wallCol: '#f0cdb0', ridge: 'z', rise: 4.6, quoins: true, string: [3.2, 6.1],
    roof: { key: 'roof', col: PAL.orange, sag: 0.14, rsag: 0.07, ohE: 0.5, ohG: 0.5 },
    faces: { front: [{ type: 'door', x: -1.6, y: 0.02, w: 1.1, h: 2.4, arch: true, st: { col: PAL.doorBlue } }, { type: 'win', x: 1.5, y: 0.9, w: 1.0, h: 1.5, st: { shutter: PAL.shBlue } },
      ...row(2, w, 3.8, 1.0, 1.55, st), ...row(2, w, 6.7, 0.95, 1.4, { shutter: PAL.shBlue }), { type: 'win', x: 0, y: 9.6, w: 0.7, h: 1.0, arch: true, st: { lintel: 'arch' } }],
      left: row(2, d - 0.8, 3.8, 0.95, 1.4, st), right: row(2, d - 0.8, 3.8, 0.95, 1.4, {}) } });
  chimney(B, -1.2, -1.8, roofH(-1.2, -1.8) - 0.5, roofH(0, 0) + 0.9, { smoke: 0.45, col: '#d1bda0' });
  B.push(faceM(w, d, 'front'));
  // little balcony on floor 2
  B.add('trim', boxM(1.6, 0.12, 0.6), PAL.stoneWarm, T(0, 6.62, 0.3));
  for (let i = 0; i <= 7; i++) B.add('metal', cylM(0.012, 0.012, 0.8, 4), 0xffffff, T(-0.75 + i * 1.5 / 7, 7.08, 0.56));
  B.add('metal', boxM(1.55, 0.03, 0.03), 0xffffff, T(0, 7.48, 0.56));
  B.pop();
  B.pop();
}
function buildHouseT2(B) {
  const w = 7.4, d = 9.6; B.push(T(-10.6, 0, -28.0, Math.PI / 2));
  const st = { shutter: PAL.shTeal, box: 'mixed' };
  const roofH = house(B, { w, d, H: 8.0, wallKey: 'plaster', wallCol: '#d9e2e3', ridge: 'x', rise: 3.9, string: [3.1],
    roof: { key: 'roof', col: PAL.terracotta, sag: 0.12, rsag: 0.06, ohE: 0.55, ohG: 0.3 },
    faces: { front: [{ type: 'door', x: 1.8, y: 0.02, w: 1.05, h: 2.3, st: { col: PAL.doorRed, fan: true } }, { type: 'win', x: -1.4, y: 0.85, w: 1.2, h: 1.5, st: { shutter: PAL.shTeal, lintel: 'stone' } },
      ...row(3, w - 0.6, 3.75, 0.9, 1.45, st), ...row(3, w - 0.6, 6.15, 0.85, 1.25, { shutter: PAL.shTeal })], left: row(2, d - 1, 3.75, 0.9, 1.4, st) } });
  dormer(B, roofH, 1.4, d / 2 - 0.5, 1.4, 1.5, { col: PAL.terracotta, wallCol: '#d9e2e3' });
  chimney(B, -2.2, 0.8, roofH(-2.2, 0.8) - 0.5, roofH(0, 0) + 1.1, { smoke: 0.5, col: '#d7c5a8' });
  B.pop();
}

/* ---------------- 6. stone arch spanning the street, with a little room above ---------------- */
function buildArch(B) {
  B.push(T(-1.7, 0, -30.0));
  const W = 8.2, Hh = 7.2, D = 3.0, r = 2.8, spring = 3.2;
  const s = new THREE.Shape(); s.moveTo(-W / 2, -0.8); s.lineTo(-r, -0.8); s.lineTo(-r, spring); s.absarc(0, spring, r, Math.PI, 0, true); s.lineTo(r, -0.8); s.lineTo(W / 2, -0.8); s.lineTo(W / 2, Hh); s.lineTo(-W / 2, Hh); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -D);
  B.add('stone', g, C('#e2d4b8'));
  for (const z of [0.07, -D - 0.07]) {
    B.add('trim', archRingGeo(r, r + 0.5, 0.14, 20), C('#ece1c9'), T(0, spring, z + 0.07));
    B.add('trim', boxM(0.5, 0.75, 0.2), C('#efe5cf'), T(0, spring + r + 0.25, z + 0.04));
    for (const sx of [-1, 1]) B.add('trim', boxM(0.7, 0.2, 0.2), C('#e6dac2'), T(sx * (r + 0.25), spring, z + 0.03));
  }
  B.add('trim', boxM(W + 0.2, 0.18, D + 0.3), C('#e6dac2'), T(0, Hh, -D / 2));
  B.push(T(0, 0, -D / 2));
  const wins = [{ type: 'win', x: -1.9, y: 7.75, w: 0.9, h: 1.25, st: { shutter: PAL.shGreen, box: 'trail' } }, { type: 'win', x: 1.9, y: 7.75, w: 0.9, h: 1.25, st: { shutter: PAL.shGreen, box: 'geranium' } }];
  house(B, { w: W, d: D, H: 9.9, y0: Hh + 0.05, wallKey: 'plaster', wallCol: '#f3dcbc', ridge: 'x', rise: 1.6, plinth: false,
    roof: { key: 'roof', col: PAL.red, sag: 0.06, rsag: 0.03, ohE: 0.45, ohG: 0.2 }, faces: { front: wins, back: wins.map((o) => ({ ...o, st: { shutter: PAL.shGreen } })) } });
  B.pop();
  // lantern hanging in the arch
  B.add('metal', cylM(0.012, 0.012, 0.9, 4), 0xffffff, T(0, spring + r - 0.45, -D / 2));
  B.add('glass', cylM(0.12, 0.09, 0.32, 6, true), '#fff3d0', T(0, spring + r - 1.05, -D / 2));
  B.add('metal', new THREE.ConeGeometry(0.17, 0.16, 6), 0xffffff, T(0, spring + r - 0.82, -D / 2));
  ivyOn(B, T(0, 0, 0.08), -W / 2 + 0.1, -r - 0.05, 0, 5.5, 1.2);
  B.pop();
}

/* ---------------- 7. the green-glass house by the river ---------------- */
function buildGreenHouse(B) {
  const w = 6.9, d = 9.0, H = 9.0; B.push(T(6.6, 0, -13.2));
  const gst = (o = {}) => ({ frame: '#f2f2ea', tint: '#97d4a4', panes: [2, 4], lintel: 'stone', ...o });
  const front = [
    { type: 'door', x: -1.6, y: 0.02, w: 1.15, h: 2.5, st: { col: '#2f6a50', fan: true } },
    { type: 'win', x: 1.75, y: 0.85, w: 1.3, h: 1.65, st: gst({ box: 'mixed' }) },
    { type: 'win', x: 1.75, y: 3.4, w: 1.35, h: 2.3, st: gst({ sill: false, panes: [2, 5] }) },
    { type: 'win', x: 1.75, y: 6.55, w: 1.1, h: 1.55, st: gst({ box: 'trail' }) },
    { type: 'win', x: 0, y: 9.6, w: 0.9, h: 1.3, arch: true, st: gst({ lintel: 'arch', panes: [2, 3] }) },
  ];
  const side = [...row(3, d - 0.8, 0.9, 1.0, 1.5, gst({ shutter: PAL.shGreen })), ...row(3, d - 0.8, 3.75, 1.0, 1.55, gst({ shutter: PAL.shGreen, box: 'geranium' })), ...row(3, d - 0.8, 6.55, 0.95, 1.4, gst({ shutter: PAL.shGreen }))];
  const roofH = house(B, { w, d, H, wallKey: 'plaster', wallCol: '#f3d6c2', ridge: 'z', rise: 4.8, quoins: '#efe5d4', string: [3.15, 6.1],
    roof: { key: 'slate', col: '#6a7c8e', sag: 0.22, rsag: 0.1, ohE: 0.5, ohG: 0.55, barge: '#e9e3d6' }, faces: { front, right: side, left: side.slice(3), back: row(3, w, 3.75, 0.95, 1.4, gst()) } });
  chimney(B, 1.6, -2.2, roofH(1.6, -2.2) - 0.5, roofH(0, 0) + 0.8, { smoke: 0.35, col: '#d9cbb6' });
  B.push(faceM(w, d, 'front'));
  // two-storey oriel window with green glass
  const ox = -1.6, oy0 = 3.25, oy1 = 8.35;
  const trap = (grow, y, h, key, col) => { const s = new THREE.Shape(); s.moveTo(-1.25 - grow, 0); s.lineTo(1.25 + grow, 0); s.lineTo(0.82 + grow, -0.9 - grow); s.lineTo(-0.82 - grow, -0.9 - grow); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); B.add(key, g, col, T(ox, y, 0)); };
  trap(0.08, oy0 - 0.16, 0.18, 'trim', '#eee6d6'); trap(0.06, 5.86, 0.12, 'trim', '#eee6d6'); trap(0.1, oy1, 0.16, 'trim', '#eee6d6');
  // corbel under the oriel
  for (let i = 0; i < 2; i++) trap(-0.18 - i * 0.22, oy0 - 0.42 - i * 0.26, 0.28, 'stone', '#e5d8bf');
  const faces = [{ c: [0, 0.9], a: 0, wd: 1.64 }, { c: [-1.035, 0.45], a: Math.atan2(-0.9, 0.43), wd: 0.995 }, { c: [1.035, 0.45], a: Math.atan2(0.9, 0.43), wd: 0.995 }];
  for (const f of faces) {
    B.push(T(ox + f.c[0], 0, f.c[1], f.a));
    for (const [y0, y1] of [[oy0, 5.86], [5.98, oy1]]) {
      B.add('wood', boxM(f.wd, 0.75, 0.06), '#e9efe2', T(0, y0 + 0.38, -0.03));
      for (let k = 0; k < 2; k++) B.add('wood', boxM(f.wd * 0.38, 0.45, 0.03), '#dfe8d8', T((k - 0.5) * f.wd * 0.46, y0 + 0.38, 0.01));
      const gy0 = y0 + 0.78, gy1 = y1 - 0.04;
      B.add('glass', new THREE.PlaneGeometry(f.wd - 0.06, gy1 - gy0), '#8fd0a0', T(0, (gy0 + gy1) / 2, -0.04));
      const nc = f.wd > 1.2 ? 3 : 2;
      for (let i = 0; i <= nc; i++) B.add('wood', boxM(0.05, gy1 - gy0, 0.06), '#f2f2ea', T(-f.wd / 2 + f.wd * i / nc, (gy0 + gy1) / 2, -0.01));
      for (let j = 0; j <= 4; j++) B.add('wood', boxM(f.wd, 0.035, 0.05), '#f2f2ea', T(0, gy0 + (gy1 - gy0) * j / 4, -0.01));
    }
    B.pop();
  }
  // copper cap on the oriel
  B.add('slate', new THREE.SphereGeometry(1, 20, 10, 0, Math.PI, 0, Math.PI / 2), '#79a596', T(ox, oy1 + 0.14, 0, 0, 0, 0, 1.35, 0.75, 1.0));
  B.add('metal', cylM(0.02, 0.04, 0.5, 6), 0xffffff, T(ox, oy1 + 1.05, 0.0));
  // balcony in front of the tall french window
  const bx = 1.75, by = 3.25;
  B.add('trim', boxM(2.4, 0.14, 1.0), '#ece3d2', T(bx, by, 0.5));
  for (const s of [-1, 1]) B.add('stone', boxM(0.22, 0.5, 0.75), '#e2d6bf', T(bx + s * 0.85, by - 0.3, 0.37, 0, 0.35));
  const ry0 = by + 0.08, rh = 0.95;
  for (let i = 0; i <= 14; i++) B.add('metal', cylM(0.012, 0.012, rh, 4), 0xffffff, T(bx - 1.15 + i * 2.3 / 14, ry0 + rh / 2, 0.96));
  for (const s of [-1, 1]) for (let i = 0; i <= 5; i++) B.add('metal', cylM(0.012, 0.012, rh, 4), 0xffffff, T(bx + s * 1.15, ry0 + rh / 2, 0.06 + i * 0.18));
  B.add('metal', boxM(2.34, 0.04, 0.04), 0xffffff, T(bx, ry0 + rh, 0.96)); B.add('metal', boxM(2.34, 0.03, 0.03), 0xffffff, T(bx, ry0 + 0.1, 0.96));
  for (const s of [-1, 1]) B.add('metal', boxM(0.04, 0.04, 0.95), 0xffffff, T(bx + s * 1.15, ry0 + rh, 0.5));
  for (let i = 0; i < 5; i++) B.add('metal', new THREE.TorusGeometry(0.1, 0.008, 4, 12), 0xffffff, T(bx - 0.9 + i * 0.45, ry0 + 0.55, 0.96));
  ANCHORS.flowerBoxes.push({ m: worldOf(B, T(bx, ry0 + rh + 0.02, 1.02)), w: 2.1, d: 0.16, kind: 'trail' });
  pot(B, bx - 0.8, by + 0.07, 0.55, 0.16, 0.26, 'geranium'); pot(B, bx + 0.85, by + 0.07, 0.45, 0.2, 0.32, 'hydrangea');
  wallLantern(B, -0.65, 2.4, 0.02);
  pot(B, -2.6, 0.0, 0.5, 0.3, 0.5, 'hydrangea'); pot(B, -0.6, 0.0, 0.45, 0.22, 0.36, 'geranium');
  B.pop();
  // river-side balcony (seen from the water)
  B.push(faceM(w, d, 'right'));
  B.add('trim', boxM(3.4, 0.14, 0.9), '#ece3d2', T(0, 3.3, 0.45));
  for (let i = 0; i <= 18; i++) B.add('metal', cylM(0.012, 0.012, 0.9, 4), 0xffffff, T(-1.65 + i * 3.3 / 18, 3.83, 0.86));
  B.add('metal', boxM(3.34, 0.04, 0.04), 0xffffff, T(0, 4.28, 0.86));
  ANCHORS.flowerBoxes.push({ m: worldOf(B, T(0, 4.3, 0.92)), w: 3.0, d: 0.16, kind: 'trail' });
  B.pop();
  ivyOn(B, faceM(w, d, 'front').multiply(T(0, 0, 0.04)), 2.6, 3.42, 0, 6.0, 1.0);
  B.pop();
}

/* ---------------- 8. cottage beside the arch ---------------- */
function buildCottageD(B) {
  const w = 7.4, d = 6.6; B.push(T(6.0, 0, -33.0));
  const st = { shutter: PAL.shBlue, box: 'geranium' };
  const roofH = house(B, { w, d, H: 6.1, wallKey: 'plaster', wallCol: PAL.white, ridge: 'x', rise: 3.3, string: [3.0],
    roof: { key: 'roof', col: PAL.orange, sag: 0.15, rsag: 0.08, ohE: 0.55, ohG: 0.4 },
    faces: { front: [{ type: 'door', x: -2.3, y: 0.02, w: 1.05, h: 2.25, st: { col: PAL.doorGreen } }, { type: 'win', x: 0.3, y: 0.85, w: 1.0, h: 1.35, st: { shutter: PAL.shBlue } }, { type: 'win', x: 2.5, y: 0.85, w: 1.0, h: 1.35, st: { shutter: PAL.shBlue, box: 'mixed' } },
      ...row(3, w - 0.6, 3.55, 0.9, 1.35, st)], right: row(2, d - 1, 3.55, 0.85, 1.3, st), left: [] } });
  dormer(B, roofH, 1.2, d / 2 - 0.5, 1.4, 1.5, { col: PAL.orange });
  chimney(B, -2.3, -0.6, roofH(-2.3, -0.6) - 0.5, roofH(0, 0) + 1.0, { smoke: 0.7, col: '#e2d3bb' });
  B.push(faceM(w, d, 'front')); bench(B, 0.3, 0.45, 0, 0); pot(B, -1.6, 0, 0.4, 0.22, 0.36, 'daisy'); B.pop();
  ivyOn(B, faceM(w, d, 'front').multiply(T(0, 0, 0.04)), -3.7, -2.95, 0, 5.4, 0.9);
  B.pop();
}

/* ---------------- 9. houses further up the street and on the hillside ---------------- */
const WALLS = [PAL.cream, PAL.white, PAL.peach, PAL.pink, PAL.butter, PAL.ochre, PAL.sage, PAL.blue, '#efd9b0', '#f2e2d0'];
const ROOFS = [['roof', PAL.terracotta], ['roof', PAL.red], ['roof', PAL.orange], ['roof', PAL.brown], ['slate', PAL.slate], ['roof', '#bd6644'], ['slate', '#6f8091']];
const SHUTS = [PAL.shGreen, PAL.shBlue, PAL.shTeal, PAL.shRed, PAL.shOlive, null, null];
function genHouse(B, x, z, ry, o = {}) {
  const w = o.w ?? R(5.6, 8), d = o.d ?? R(5.6, 7.6), floors = o.floors ?? RI(2, 3);
  const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].map(([a, b]) => { const c = Math.cos(ry), s = Math.sin(ry); return terrainH(x + a * c + b * s, z - a * s + b * c); });
  const y = Math.max(...corners), y0 = Math.min(...corners) - y - 0.7;
  const fh = R(2.7, 3.0), H = floors * fh + 0.2;
  const sh = o.shutter !== undefined ? o.shutter : pick(SHUTS); const detail = o.detail ?? 1;
  const st = () => ({ shutter: detail > 0.5 ? sh : null, box: detail > 0.5 && R() < 0.45 ? pick(['geranium', 'mixed', 'trail']) : null, panes: [2, 3] });
  const nW = Math.max(2, Math.round(w / 2.4));
  const front = [{ type: 'door', x: R(-w / 4, w / 4), y: 0.02, w: 1.05, h: 2.3, arch: R() < 0.4, st: { col: pick([PAL.doorGreen, PAL.doorBlue, PAL.doorRed, '#6b4a33']) } }];
  for (let f = 1; f < floors; f++) front.push(...row(nW, w - 0.6, f * fh + 0.75, 0.9, 1.35, st()));
  const groundWin = row(nW, w - 0.6, 0.85, 0.9, 1.3, st()).filter((p) => Math.abs(p.x - front[0].x) > 1.2);
  front.push(...groundWin);
  const side = []; for (let f = 1; f < floors; f++) side.push(...row(Math.max(1, Math.round(d / 2.8)), d - 1, f * fh + 0.75, 0.85, 1.3, st()));
  const ridge = o.ridge ?? (R() < 0.5 ? 'x' : 'z'); const [rk, rc] = o.roof ?? pick(ROOFS);
  B.push(T(x, y, z, ry));
  const roofH = house(B, { w, d, H, y0, wallKey: 'plaster', wallCol: o.wall ?? pick(WALLS), ridge, rise: (ridge === 'x' ? d : w) * R(0.42, 0.62), quoins: detail > 0.5 && R() < 0.4,
    string: R() < 0.5 ? [fh + 0.05] : null, roof: { key: rk, col: rc, sag: R(0.06, 0.18), rsag: R(0.02, 0.09), ohE: R(0.4, 0.6), ohG: R(0.3, 0.5) },
    faces: { front, left: side, right: side, back: detail > 0.5 ? side : [] } });
  if (R() < 0.75) { const cx = R(-w / 3, w / 3), cz = R(-d / 4, d / 4); chimney(B, cx, cz, roofH(cx, cz) - 0.5, roofH(0, 0) + R(0.5, 1.2), { col: pick(['#d7c4a6', '#cdbb9f', '#e0cfb4']), smoke: o.smoke ?? 0, pot2: R() < 0.5 }); }
  if (ridge === 'x' && R() < 0.5 && detail > 0.5) dormer(B, roofH, R(-w / 5, w / 5), d / 2 - 0.5, 1.3, 1.4, { key: rk, col: rc });
  if (detail > 0.5 && R() < 0.5) ivyOn(B, faceM(w, d, 'front').multiply(T(0, 0, 0.04)), w / 2 - R(0.6, 1.6), w / 2 - 0.05, 0, H * R(0.5, 0.9), 0.9);
  B.pop();
  return { y, H };
}

function buildTown(B) {
  buildBakery(B); buildHouseA(B); buildHouseS(B); buildTower(B); buildHouseT1(B); buildHouseT2(B); buildArch(B); buildGreenHouse(B); buildCottageD(B);
  seed(404);
  // street beyond the arch
  genHouse(B, -10.5, -41.5, Math.PI / 2 - 0.1, { w: 7, d: 8.5, floors: 3, wall: PAL.ochre, roof: ['roof', PAL.red], ridge: 'z', smoke: 0.4 });
  genHouse(B, 6.2, -44.5, -0.12, { w: 7.2, d: 7, floors: 3, wall: PAL.pink, roof: ['slate', PAL.slate], ridge: 'x' });
  genHouse(B, 5.6, -56.5, -0.2, { w: 6.4, d: 7.5, floors: 3, wall: PAL.cream, roof: ['roof', PAL.terracotta], ridge: 'z' });
  genHouse(B, -13.5, -55, 0.4, { w: 7.5, d: 7, floors: 2, wall: PAL.sage, roof: ['roof', PAL.orange] });
  genHouse(B, 0.5, -70, -0.35, { w: 7.6, d: 6.8, floors: 3, wall: PAL.butter, roof: ['roof', PAL.brown], ridge: 'x', smoke: 0.5 });
  genHouse(B, -22, -46, 0.25, { w: 6.5, d: 6.5, floors: 2, wall: PAL.white, roof: ['roof', PAL.red] });
  genHouse(B, -25, -64, 0.5, { floors: 2 });
  genHouse(B, -8.5, -82, 0.15, { floors: 2, smoke: 0.3 });
  genHouse(B, 7.5, -80, -0.3, { floors: 3 });
  genHouse(B, -30, -32, 0.9, { floors: 2, wall: PAL.peach });
  genHouse(B, -26, -14, 1.3, { floors: 2, wall: PAL.blue, roof: ['roof', PAL.orange] });
  genHouse(B, -27, 6, 1.55, { floors: 2 });
  genHouse(B, -24, 22, 1.2, { floors: 2, wall: PAL.butter });
  genHouse(B, -36, -50, 0.6, { floors: 2, detail: 0.4 });
  genHouse(B, -40, -72, 0.3, { floors: 2, detail: 0.4 });
  genHouse(B, -20, -92, 0.2, { floors: 2, detail: 0.4, smoke: 0.3 });
  genHouse(B, -2, -98, 0.1, { floors: 2, detail: 0.4 });
  genHouse(B, -46, -30, 1.1, { floors: 2, detail: 0.4 });
  genHouse(B, -44, 2, 1.4, { floors: 2, detail: 0.4 });
  genHouse(B, 6.4, -68.5, -0.25, { w: 6, d: 6.5, floors: 3, wall: PAL.peach, roof: ['roof', PAL.terracotta], ridge: 'x' });
  // far bank: a few farmhouses and a small chapel
  for (const [x, z, ry] of [[92, -10, -0.6], [104, -44, -0.3], [118, 8, -0.9], [97, -86, -0.2], [128, -30, -0.5], [88, 38, -0.8], [112, -120, -0.1]]) genHouse(B, x, z, ry, { floors: 2, detail: 0.3 });
  buildChapel(B, 108, -66);
  gardenWall(B, [[-3.9, 52], [-4.1, 40], [-4.6, 30], [-5.2, 24.5]]);
  ANCHORS.beds.push({ m: T(-5.0, 0, 37), w: 1.4, d: 26, kind: 'mixed', n: 90 }, { m: T(-6.2, 0, 30, 0.08), w: 2.0, d: 9, kind: 'hydrangea', n: 24 });
  // the strip between street and promenade: beds, a bench, a little fountain
  bench(B, 8.4, 40, -Math.PI / 2 - 0.15);
  ANCHORS.beds.push({ m: T(4.6, 0, 38, 0.05), w: 1.0, d: 9, kind: 'lavender', n: 26 }, { m: T(7.6, 0, 33, 0), w: 2.4, d: 3, kind: 'mixed', n: 22 });
  buildFountain(B, 7.4, 46.5);
  // terrace & street furniture
  const t = TERRACE;
  for (const z of [5.2, 20.5]) lampPost(B, t.x1 - 0.7, z);
  lampPost(B, -4.6, -2.5);
  bench(B, t.x1 - 1.8, 7.0, -Math.PI / 2); bench(B, t.x1 - 1.8, 10.6, -Math.PI / 2);
  for (const [x, z, ry, kind] of [[t.x0 + 1.6, 6.5, 0, 'hydrangea'], [t.x0 + 1.6, 16.5, 0, 'mixed'], [9.4, t.z1 - 1.0, Math.PI / 2, 'geranium'], [13.0, t.z1 - 1.0, Math.PI / 2, 'daisy']]) { B.add('stone', boxM(1.0, 0.5, 1.6), '#dfd2b8', T(x, 0.25, z, ry)); ANCHORS.beds.push({ m: T(x, 0.5, z, ry), w: 0.85, d: 1.45, kind, n: 15 }); }
}

function buildFountain(B, x, z) {
  B.push(T(x, 0, z));
  const pr = [[0, 0], [1.35, 0], [1.4, 0.08], [1.42, 0.5], [1.55, 0.56], [1.55, 0.66], [1.3, 0.66], [1.25, 0.2], [0, 0.2]];
  B.add('stone', lathe(pr, 28), C('#ddd0b6'));
  B.add('stone', cylM(0.22, 0.3, 1.2, 12), C('#e4d8c0'), T(0, 0.8, 0));
  B.add('trim', lathe([[0, 0], [0.62, 0], [0.66, 0.06], [0.58, 0.22], [0.12, 0.26], [0, 0.26]], 20), C('#e9dec8'), T(0, 1.38, 0));
  B.add('trim', new THREE.SphereGeometry(0.13, 12, 8), C('#e9dec8'), T(0, 1.75, 0));
  B.pop();
  ANCHORS.fountain = V3(x, 0, z);
}

/* low dry-stone garden wall with a gap, bordering the street in the foreground */
function gardenWall(B, pts, h = 0.65) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]; const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    const n = Math.ceil(L / 0.38);
    for (let k = 0; k < n; k++) for (let row = 0; row < 3; row++) {
      const t = (k + (row % 2) * 0.5 + 0.5) / n; if (t > 1) continue;
      const x = lerp(x0, x1, t), z = lerp(z0, z1, t); const y = terrainH(x, z);
      const g = new THREE.IcosahedronGeometry(0.5, 0); const sc = [R(0.36, 0.5), R(0.2, 0.26), R(0.26, 0.34)];
      B.add('stone', scaleUV(g, 0.5), jitter('#d8ccb2', 0.02, 0.06, 0.08), T(x + R(-0.04, 0.04), y + 0.1 + row * h / 3, z + R(-0.04, 0.04), a + R(-0.3, 0.3), R(-0.2, 0.2), R(-0.2, 0.2), sc[0], sc[1], sc[2]));
    }
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; const x = lerp(x0, x1, t), z = lerp(z0, z1, t); B.add('trim', boxM(0.44, 0.1, 0.42), jitter('#e2d7c0', 0.01, 0.04, 0.06), T(x, terrainH(x, z) + h + 0.08, z, a + R(-0.08, 0.08), R(-0.05, 0.05))); }
  }
}

function buildChapel(B, x, z) {
  const y = terrainH(x, z); B.push(T(x, y, z, -0.4));
  house(B, { w: 6, d: 10, H: 5.5, y0: -1.5, wallKey: 'plaster', wallCol: PAL.white, ridge: 'z', rise: 3.6, roof: { key: 'roof', col: PAL.red, sag: 0.08 },
    faces: { front: [{ type: 'door', x: 0, y: 0, w: 1.3, h: 2.6, arch: true, st: { col: '#6b4a33' } }, { type: 'win', x: 0, y: 3.6, w: 0.8, h: 1.2, arch: true, st: {} }], left: row(3, 9, 2.0, 0.7, 1.8, {}).map((o) => ({ ...o, arch: true })), right: row(3, 9, 2.0, 0.7, 1.8, {}).map((o) => ({ ...o, arch: true })) } });
  B.push(T(0, 0, 3.4));
  B.add('plaster', boxM(2.6, 11, 2.6), C(PAL.white), T(0, 5.5 - 1.5 + 1.5, 0));
  B.add('roof', new THREE.ConeGeometry(2.1, 4.2, 4), C(PAL.red), T(0, 12.6, 0, Math.PI / 4));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; B.add('interior', boxM(0.7, 1.2, 0.05), C('#2c2622'), T(Math.sin(a) * 1.32, 8.9, Math.cos(a) * 1.32, a)); }
  B.pop(); B.pop();
}
