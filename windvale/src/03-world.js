/* =====================  world layout: terrain, river, streets, quay  ===================== */
const WATER_Y = -1.6;
const CASTLE = { x: -200, z: -560 };
const VIADUCT_Z = -240;
const FALL_Z = VIADUCT_Z + 44;
const RIPPLES = [];          // {x, z, r, s} local ripple sources for the water shader

/* river centreline / half width, sampled by z (Catmull-Rom through control points) */
const RIVER_PTS = [ // z, cx, halfWidth
  [-2600, 300, 40], [-1400, 160, 32], [-800, 95, 26], [-520, 66, 21], [-380, 56, 19], [-300, 52, 18], [-230, 49, 20],
  [-160, 46, 24], [-100, 44, 28], [-60, 43, 31], [-20, 42.6, 32.3], [20, 43.4, 32.8], [60, 45, 34], [120, 48, 36], [400, 60, 40], [2600, 120, 60],
];
function riverAt(z) {
  const P = RIVER_PTS; let i = 0;
  while (i < P.length - 2 && z > P[i + 1][0]) i++;
  const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
  const t = clamp((z - p1[0]) / (p2[0] - p1[0]), 0, 1);
  const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return { cx: cr(p0[1], p1[1], p2[1], p3[1]), w: cr(p0[2], p1[2], p2[2], p3[2]) };
}
const quayX = (z) => { const r = riverAt(z); return r.cx - r.w; };
const QUAY_Z0 = -78, QUAY_Z1 = 74;
const isQuay = (z) => z > QUAY_Z0 && z < QUAY_Z1;

function townMask(x, z) { return (1 - smooth(70, 120, z)) * smooth(-125, -78, z) * smooth(-130, -88, x); }
function townLevel(x, z) { return smooth(-34, -84, z) * 6.5 + smooth(-40, -92, x) * 5 + smooth(-40, -84, z) * smooth(-10, -40, x) * 3; }

function terrainH(x, z) {
  const { cx, w } = riverAt(z);
  const sd = Math.abs(x - cx) - w;
  const left = x < cx;
  const d = Math.max(0, sd);
  const n1 = fbm(x * 0.006 + 11, z * 0.006, 4), n2 = ridged(x * 0.004, z * 0.004 + 7, 5);
  const gorge = Math.exp(-(((z - VIADUCT_Z) / 75) ** 2));
  const up = smooth(-90, -520, z);
  const L = lerp(lerp(left ? 125 : 150, 175, up), 52, gorge);
  const Hm = lerp(lerp(left ? 46 : 38, 115, up), 74, gorge);
  let land = 0.45 + Hm * (1 - Math.exp(-d / L)) * (0.76 + 0.48 * n1);
  land += (n2 - 0.45) * 28 * smooth(30, 220, d);
  land += (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 1.6 * smooth(4, 30, d);
  const r = Math.hypot(x - 40, z + 260);
  land += smooth(900, 2100, r) * (90 + 400 * ridged(x * 0.0011 + 3, z * 0.0011, 5));
  land += 78 * Math.exp(-(((x - CASTLE.x) ** 2 + (z - CASTLE.z) ** 2) / (2 * 52 * 52)));
  if (!left) land += 6 * Math.exp(-(((z - FALL_Z) / 16) ** 2)) * smooth(4.0, 16.0, sd) * (1 - smooth(25, 80, sd));
  const tm = townMask(x, z);
  if (tm > 0 && left) land = lerp(land, townLevel(x, z), tm);
  if (sd < 0) return WATER_Y - 0.7 - 2.8 * smooth(0, 16, -sd);
  const bw = lerp(10, 22, smooth(-60, -200, z));
  if (!(left && isQuay(z)) && sd < bw) land = lerp(WATER_Y - 0.55, land, smooth(0, bw, sd) ** 1.4);
  return land;
}

/* ---------------- terrain mesh: polar grid, dense near town, sparse far away ---------------- */
function buildTerrain() {
  const CXo = 6, CZo = -14, rings = LOW ? 250 : 360, segs = LOW ? 320 : 460, r0 = 1.2, rMax = 5200;
  const k = Math.pow(rMax / r0, 1 / rings);
  const nV = (rings + 1) * segs + 1;
  const pos = new Float32Array(nV * 3), col = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
  const idx = [];
  const pal = {
    meadow: C('#93ad4c'), lush: C('#6c9437'), dry: C('#b7b16a'), dirt: C('#a08a64'), rock: C('#8e877b'), rockW: C('#a49377'),
    forest: C('#4f6c34'), wet: C('#6d6b4b'), bed: C('#59604a'), town: C('#a49d78'),
  };
  const tmp = new THREE.Color();
  const put = (i, x, z) => {
    const y = terrainH(x, z);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; uv[i * 2] = x / 6; uv[i * 2 + 1] = z / 6;
  };
  const paint = (i, x, y, z, ny) => {
    const slope = Math.sqrt(Math.max(0, 1 / (ny * ny) - 1));
    const n = fbm(x * 0.03, z * 0.03, 3), m = fbm(x * 0.008 + 5, z * 0.008, 3);
    tmp.copy(pal.meadow).lerp(pal.lush, smooth(0.35, 0.65, n)).lerp(pal.dry, smooth(0.6, 0.8, m) * 0.6);
    const tm = townMask(x, z) * (x < riverAt(z).cx ? 1 : 0);
    tmp.lerp(pal.town, tm * smooth(0.45, 0.62, fbm(x * 0.12, z * 0.12, 3)) * 0.55);
    if (y > 12) tmp.lerp(pal.forest, smooth(12, 40, y) * 0.7);
    tmp.lerp(pal.dirt, smooth(0.55, 0.9, slope) * 0.6);
    tmp.lerp(fbm(x * 0.02, z * 0.02, 2) > 0.5 ? pal.rock : pal.rockW, smooth(0.8, 1.4, slope));
    if (y < WATER_Y + 0.6) tmp.lerp(pal.wet, smooth(WATER_Y + 0.6, WATER_Y - 0.1, y));
    if (y < WATER_Y - 0.3) tmp.copy(pal.bed);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  };
  put(0, CXo, CZo);
  for (let r = 0; r <= rings; r++) {
    const rad = r0 * Math.pow(k, r);
    for (let s = 0; s < segs; s++) { const a = s / segs * TAU; put(1 + r * segs + s, CXo + Math.cos(a) * rad, CZo + Math.sin(a) * rad); }
  }
  for (let s = 0; s < segs; s++) idx.push(0, 1 + (s + 1) % segs, 1 + s);
  for (let r = 0; r < rings; r++) for (let s = 0; s < segs; s++) {
    const a = 1 + r * segs + s, b = 1 + r * segs + (s + 1) % segs, c = a + segs, d = b + segs;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const nrm = g.attributes.normal;
  for (let i = 0; i < nV; i++) paint(i, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], Math.max(0.05, nrm.getY(i)));
  const mesh = new THREE.Mesh(g, MAT.ground); mesh.receiveShadow = true; mesh.name = 'terrain';
  return mesh;
}

/* ---------------- streets (cobble ribbons that follow their curve) ---------------- */
const STREETS = [];
function ribbon(B, pts, width, key, { crown = 0.05, lift = 0.04, segLen = 0.8, edgeJit = 0.25, flat = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => V3(p[0], 0, p[1])), false, 'centripetal');
  const n = Math.max(4, Math.ceil(curve.getLength() / segLen));
  const across = 6; const P = new THREE.Vector3(), Tn = new THREE.Vector3();
  const pos = [], uv = [], idx = [];
  let len = 0, prev = curve.getPointAt(0);
  for (let i = 0; i <= n; i++) {
    const t = i / n; curve.getPointAt(t, P); curve.getTangentAt(t, Tn); len += P.distanceTo(prev); prev.copy(P);
    const nx = -Tn.z, nz = Tn.x; const wj = width / 2 + (fbm(len * 0.15, 3.3, 2) - 0.5) * edgeJit * 2;
    for (let j = 0; j <= across; j++) {
      const s = j / across * 2 - 1; const x = P.x + nx * s * wj, z = P.z + nz * s * wj;
      const y = (flat !== null ? flat : terrainH(x, z)) + lift + crown * (1 - s * s);
      pos.push(x, y, z); uv.push(s * wj, len);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < across; j++) { const a = i * (across + 1) + j, b = a + across + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  B.add(key, g, 0xffffff);
  STREETS.push({ curve, width });
  return curve;
}
/* distance from a point to the nearest street edge (negative = on the street) */
function streetDist(x, z) {
  let best = 1e9;
  for (const s of STREETS) {
    if (!s.samples) { s.samples = s.curve.getSpacedPoints(Math.ceil(s.curve.getLength() / 0.7)); }
    for (const p of s.samples) { const d = Math.hypot(p.x - x, p.z - z) - s.width / 2; if (d < best) best = d; }
  }
  return best;
}

/* ---------------- instanced balusters ---------------- */
const BALUSTERS = [];
function balusterGeo() {
  const pr = [[0.0, 0], [0.075, 0], [0.075, 0.05], [0.05, 0.07], [0.058, 0.16], [0.085, 0.3], [0.07, 0.4], [0.042, 0.47], [0.04, 0.52], [0.062, 0.55], [0.062, 0.6], [0.0, 0.6]];
  return new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r, y)), 10);
}
/* balustrade along a polyline at height y0 (top of plinth at y0+0.12) */
function balustrade(B, pts, y0 = 0, { gapEvery = 3.2 } = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    const segs = Math.max(1, Math.round(L / gapEvery));
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs; const sl = L / segs;
      const ax = lerp(x0, x1, t0), az = lerp(z0, z1, t0), bx = lerp(x0, x1, t1), bz = lerp(z0, z1, t1);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2; const tone = jitter('#e9dcc2', 0.01, 0.04, 0.05);
      B.add('trim', boxM(0.34, 0.14, sl), tone, T(mx, y0 + 0.07, mz, ang));
      B.add('trim', boxM(0.3, 0.12, sl), tone, T(mx, y0 + 0.86, mz, ang));
      B.add('trim', boxM(0.36, 0.05, sl + 0.02), tone, T(mx, y0 + 0.94, mz, ang));
      const nb = Math.floor((sl - 0.5) / 0.26);
      for (let b = 0; b < nb; b++) { const t = (b + 1) / (nb + 1); BALUSTERS.push([lerp(ax, bx, t), y0 + 0.14, lerp(az, bz, t), ang]); }
    }
    for (let s = 0; s <= segs; s++) { const t = s / segs; const px = lerp(x0, x1, t), pz = lerp(z0, z1, t); const tone = jitter('#e6d8bd', 0.01, 0.04, 0.05);
      if (s === 0 && i > 0) continue;
      B.add('trim', boxM(0.42, 1.0, 0.42), tone, T(px, y0 + 0.5, pz, ang));
      B.add('trim', boxM(0.5, 0.07, 0.5), tone, T(px, y0 + 1.03, pz, ang));
    }
  }
}
function buildBalusters() {
  const geo = balusterGeo(); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  const m = new THREE.InstancedMesh(geo, MAT.trim, BALUSTERS.length);
  const col = new THREE.Color();
  BALUSTERS.forEach(([x, y, z, a], i) => { m.setMatrixAt(i, T(x, y, z, a)); m.setColorAt(i, col.copy(jitter('#ebdfc6', 0.01, 0.03, 0.04))); });
  m.castShadow = m.receiveShadow = true; m.name = 'balusters';
  return m;
}

/* ---------------- quay wall + terrace + dock ---------------- */
const TERRACE = { x0: 3.4, x1: 17.2, z0: 3.0, z1: 27.0, seatZ0: 14.0, seatZ1: 17.0 };
const DOCK = { z0: -6.2, z1: -3.6, len: 15 };

function wallStrip(B, pts, yBot, yTop, key = 'stone', outward = 1) {
  // vertical stone wall along polyline pts [[x,z],...], face normal to the right of travel * outward
  const pos = [], uv = [], col = [], idx = [];
  const levels = [yBot, WATER_Y - 0.25, WATER_Y + 0.35, WATER_Y + 0.9, yTop];
  const lc = [C('#4c5a3e'), C('#5f6450'), C('#8c8672'), C('#c9c0ad'), C('#ffffff')];
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let l = 0; l < levels.length; l++) {
      pos.push(pts[i][0], levels[l], pts[i][1]); uv.push(len, levels[l]); col.push(lc[l].r, lc[l].g, lc[l].b);
    }
  }
  const nl = levels.length;
  for (let i = 0; i < pts.length - 1; i++) for (let l = 0; l < nl - 1; l++) {
    const a = i * nl + l, b = a + 1, c = a + nl, d = c + 1;
    if (outward > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  B.add(key, g);
}

function buildQuay(B) {
  // quay line, with the terrace protrusion carved out
  const north = [], south = [];
  for (let z = QUAY_Z1; z >= TERRACE.z1; z -= 1.5) north.push([quayX(z), z]);
  north.push([quayX(TERRACE.z1), TERRACE.z1]);
  for (let z = TERRACE.z0; z >= QUAY_Z0; z -= 1.5) south.push([quayX(z), z]);
  wallStrip(B, north, WATER_Y - 3, 0.02, 'stone', 1);
  wallStrip(B, south, WATER_Y - 3, 0.02, 'stone', 1);
  // terrace walls (face outward to the river)
  const t = TERRACE;
  wallStrip(B, [[quayX(t.z1), t.z1], [t.x1, t.z1]], WATER_Y - 3, 0.02, 'stone', 1);
  wallStrip(B, [[t.x1, t.z1], [t.x1, t.z0]], WATER_Y - 3, 0.02, 'stone', 1);
  wallStrip(B, [[t.x1, t.z0], [quayX(t.z0), t.z0]], WATER_Y - 3, 0.02, 'stone', 1);
  // coping stones on quay top
  const cope = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, z1 - z0); const a = Math.atan2(x1 - x0, z1 - z0); const nx = (z1 - z0) / L, nz = -(x1 - x0) / L;
    B.add('trim', boxM(0.7, 0.2, L + 0.02), jitter('#d9ccb0', 0.01, 0.03, 0.05), T((x0 + x1) / 2 - nx * 0.25, -0.06, (z0 + z1) / 2 - nz * 0.25, a)); } };
  cope(north); cope(south);
  // terrace floor (flagstones), covers the street-side strip and the protrusion
  const fl = new THREE.PlaneGeometry(t.x1 - t.x0, t.z1 - t.z0); fl.rotateX(-Math.PI / 2);
  const uvA = fl.attributes.uv; const pA = fl.attributes.position;
  for (let i = 0; i < uvA.count; i++) uvA.setXY(i, pA.getX(i) + (t.x0 + t.x1) / 2, -(pA.getZ(i) + (t.z0 + t.z1) / 2));
  B.add('flag', fl, 0xffffff, T((t.x0 + t.x1) / 2, 0.045, (t.z0 + t.z1) / 2));
  // terrace edge coping
  B.add('trim', boxM(0.5, 0.16, t.z1 - t.z0 + 0.4), C('#ddd0b4'), T(t.x1 - 0.2, -0.03, (t.z0 + t.z1) / 2));
  B.add('trim', boxM(t.x1 - quayX(t.z1) + 0.2, 0.16, 0.5), C('#ddd0b4'), T((t.x1 + quayX(t.z1)) / 2, -0.03, t.z1 - 0.2));
  B.add('trim', boxM(t.x1 - quayX(t.z0) + 0.2, 0.16, 0.5), C('#ddd0b4'), T((t.x1 + quayX(t.z0)) / 2, -0.03, t.z0 + 0.2));
  // balustrades — terrace front has a low solid parapet where the girl sits
  const ex = t.x1 - 0.25;
  balustrade(B, [[quayX(t.z1) + 0.3, t.z1 - 0.25], [ex, t.z1 - 0.25], [ex, t.seatZ1]], 0.05);
  balustrade(B, [[ex, t.seatZ0], [ex, t.z0 + 0.25], [quayX(t.z0) + 0.3, t.z0 + 0.25]], 0.05);
  // low parapet (seat)
  const pz = (t.seatZ0 + t.seatZ1) / 2, pl = t.seatZ1 - t.seatZ0;
  B.add('stone', boxM(0.44, 0.42, pl), C('#e3d6bd'), T(ex, 0.26, pz));
  B.add('trim', boxM(0.56, 0.08, pl + 0.06), C('#eadfc8'), T(ex, 0.5, pz));
  // promenade balustrade north of the terrace (toward the viewer)
  const prom = []; for (let z = t.z1 + 0.6; z <= 66; z += 3.2) prom.push([quayX(z) - 0.3, z]);
  balustrade(B, prom, 0.02);
  // short balustrade between terrace and the dock stairs
  balustrade(B, [[quayX(t.z0 - 0.6) - 0.3, t.z0 - 0.6], [quayX(1.6) - 0.3, 1.6]], 0.02);
  buildDock(B);
}

function buildDock(B) {
  const d = DOCK, xq = quayX((d.z0 + d.z1) / 2), deckY = WATER_Y + 0.5;
  // stone stairs descending along the quay face from z=1.2 (top) to the dock
  const steps = 7, rise = (0.02 - deckY) / steps, run = 0.36;
  for (let s = 0; s < steps; s++) {
    const y = 0.02 - (s + 1) * rise; const z = 1.0 - s * run;
    B.add('trim', boxM(1.5, 0.16, run + 0.04), jitter('#d6c9ad', 0.01, 0.03, 0.06), T(xq + 0.75, y - 0.08 + rise * 0.0, z - run / 2));
    B.add('stone', boxM(1.5, y - (WATER_Y - 1.5), run), C('#cfc5b0'), T(xq + 0.75, (y + WATER_Y - 1.5) / 2 - 0.08, z - run / 2));
  }
  B.add('stone', boxM(0.3, 0.9, steps * run), C('#d8cdb6'), T(xq + 1.55, deckY + 0.6, 1.0 - steps * run / 2));
  // deck boards
  const z0 = d.z0, z1 = d.z1, x0 = xq, x1 = xq + d.len;
  for (let x = x0; x < x1; x += 0.2) {
    B.add('wood', boxM(0.18, 0.06, z1 - z0 + R(-0.04, 0.12)), jitter('#9b7f5e', 0.02, 0.08, 0.1), T(x + 0.1, deckY + R(-0.01, 0.01), (z0 + z1) / 2 + R(-0.05, 0.05), R(-0.01, 0.01)));
  }
  // joists and posts
  for (const z of [z0 + 0.12, z1 - 0.12]) {
    B.add('wood', boxM(x1 - x0, 0.16, 0.14), C('#6f5a43'), T((x0 + x1) / 2, deckY - 0.11, z));
    for (let x = x0 + 1.6; x <= x1 + 0.01; x += 2.4) {
      const top = deckY + (x > x1 - 1 ? 0.7 : R(0.08, 0.5));
      B.add('wood', cylM(0.11, 0.13, top - (WATER_Y - 2.5), 8), jitter('#5e4b38', 0.02, 0.05, 0.08), T(x, (top + WATER_Y - 2.5) / 2, z + (z < (z0 + z1) / 2 ? -0.12 : 0.12)));
      RIPPLES.push({ x, z: z + (z < (z0 + z1) / 2 ? -0.12 : 0.12), r: 0.14, s: 0.6 });
    }
  }
  // iron mooring rings / bollards
  for (const x of [x0 + 5, x0 + 10]) B.add('metal', cylM(0.09, 0.11, 0.35, 10), 0xffffff, T(x, deckY + 0.2, z1 - 0.25));
}
