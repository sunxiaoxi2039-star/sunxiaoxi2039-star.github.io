/* =====================  architecture kit  ===================== *
 * Local convention for a facade: outer face at z = 0, the wall body at z < 0,
 * x across the facade, y up from the ground line.                          */

const ANCHORS = { flowerBoxes: [], pots: [], ivy: [], smoke: [], beds: [], lamps: [] };
const PAL = {
  cream: '#f3e7cd', white: '#f6f0e3', peach: '#f0d2b6', pink: '#eecac0', butter: '#f2dea6', ochre: '#e6bd80', sage: '#d3dbbd', blue: '#cfdbe0',
  terracotta: '#c8683f', red: '#b44e35', orange: '#d68048', brown: '#9c5d3e', slate: '#7c8a99', slateDark: '#64707e', copper: '#76a394',
  stoneWarm: '#e4d6bb', stoneGray: '#d2cbbd', timber: '#5c4130', frame: '#f4f0e6',
  shGreen: '#5f8d6c', shBlue: '#5c82a0', shTeal: '#4f8c8c', shRed: '#9e4c3d', shOlive: '#7d8a4e', doorGreen: '#3f6b54', doorBlue: '#3f6184', doorRed: '#8a3d2f',
};
const worldOf = (B, m) => B.top.clone().multiply(m);

function wallGeo(w, h, t, holes = [], gable = 0, x0 = -w / 2) {
  const s = new THREE.Shape();
  s.moveTo(x0, 0); s.lineTo(x0 + w, 0); s.lineTo(x0 + w, h);
  if (gable > 0) s.lineTo(x0 + w / 2, h + gable);
  s.lineTo(x0, h); s.closePath();
  for (const o of holes) {
    const p = new THREE.Path(); const xa = o.x - o.w / 2, xb = o.x + o.w / 2, ya = o.y, yb = o.y + o.h;
    if (o.arch) { const r = o.w / 2, yc = yb - r; p.moveTo(xa, ya); p.lineTo(xb, ya); p.lineTo(xb, yc); p.absarc(o.x, yc, r, 0, Math.PI, false); p.lineTo(xa, ya); }
    else { p.moveTo(xa, ya); p.lineTo(xb, ya); p.lineTo(xb, yb); p.lineTo(xa, yb); p.lineTo(xa, ya); }
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 12 });
  g.translate(0, 0, -t); return g;
}
/* half annulus (arch ring) in the XY plane, extruded toward -z */
function archRingGeo(r0, r1, depth, seg = 14) {
  const s = new THREE.Shape(); s.moveTo(r1, 0); s.absarc(0, 0, r1, 0, Math.PI, false); s.lineTo(-r0, 0); s.absarc(0, 0, r0, Math.PI, 0, true); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: seg }); g.translate(0, 0, -depth); return g;
}

/* ---------- windows ---------- */
function addShutterLeaf(B, lw, lh, col, m) {
  B.push(m); const c2 = C(col).multiplyScalar(0.86);
  B.add('wood', boxM(lw, lh, 0.03), col, T(lw / 2, lh / 2, -0.015));
  B.add('wood', boxM(0.06, lh, 0.05), col, T(0.03, lh / 2, 0.0));
  B.add('wood', boxM(0.06, lh, 0.05), col, T(lw - 0.03, lh / 2, 0.0));
  B.add('wood', boxM(lw, 0.07, 0.05), col, T(lw / 2, 0.035, 0)); B.add('wood', boxM(lw, 0.07, 0.05), col, T(lw / 2, lh - 0.035, 0));
  B.add('wood', boxM(lw, 0.06, 0.05), col, T(lw / 2, lh * 0.5, 0));
  const n = Math.floor((lh - 0.2) / 0.075);
  for (let i = 0; i < n; i++) { const y = 0.1 + i * 0.075; if (Math.abs(y - lh * 0.5) < 0.06) continue; B.add('wood', boxM(lw - 0.1, 0.055, 0.01), c2, T(lw / 2, y, 0.012, 0, -0.55)); }
  B.pop();
}
/* o: {x, y, w, h, arch}; st: {frame, shutter, box, sill, lintel, panes:[c,r], tint, inset, open} */
function addWindow(B, o, st = {}) {
  const { x, y, w, h } = o; const inset = st.inset ?? 0.16, fc = st.frame ?? PAL.frame, ft = 0.065, fd = 0.07;
  const top = o.arch ? y + h - w / 2 : y + h;
  B.add('wood', boxM(w, ft, fd), fc, T(x, y + ft / 2, -inset));
  B.add('wood', boxM(ft, top - y, fd), fc, T(x - w / 2 + ft / 2, (y + top) / 2, -inset));
  B.add('wood', boxM(ft, top - y, fd), fc, T(x + w / 2 - ft / 2, (y + top) / 2, -inset));
  if (o.arch) B.add('wood', archRingGeo(w / 2 - ft, w / 2, fd, 10), fc, T(x, top, -inset + fd / 2));
  else B.add('wood', boxM(w, ft, fd), fc, T(x, y + h - ft / 2, -inset));
  const [pc, pr] = st.panes ?? [2, 3];
  for (let i = 1; i < pc; i++) B.add('wood', boxM(0.04, (o.arch ? top : y + h) - y, 0.04), fc, T(x - w / 2 + w * i / pc, (y + (o.arch ? top : y + h)) / 2, -inset - 0.005));
  const ph = (o.arch ? top - y : h);
  for (let j = 1; j < pr; j++) B.add('wood', boxM(w, 0.035, 0.035), fc, T(x, y + ph * j / pr, -inset - 0.005));
  const gl = new THREE.PlaneGeometry(w - 0.02, h - 0.02);
  B.add('glass', gl, st.tint ?? '#ffffff', T(x, y + h / 2, -inset - 0.03));
  if (st.sill !== false) B.add('trim', boxM(w + 0.2, 0.075, 0.28), st.sillCol ?? PAL.stoneWarm, T(x, y - 0.035, 0.05));
  if (st.lintel === 'stone') B.add('trim', boxM(w + 0.32, 0.2, 0.07), st.sillCol ?? PAL.stoneWarm, T(x, y + h + 0.1, 0.02));
  if (st.lintel === 'arch' && o.arch) { B.add('trim', archRingGeo(w / 2, w / 2 + 0.16, 0.07, 12), st.sillCol ?? PAL.stoneWarm, T(x, top, 0.05)); B.add('trim', boxM(0.16, 0.24, 0.1), st.sillCol ?? PAL.stoneWarm, T(x, top + w / 2 + 0.05, 0.04)); }
  if (st.shutter) {
    const lw = w / 2 + 0.02, lh = (o.arch ? top - y : h) + 0.02; const ang = st.open ?? R(2.55, 2.85);
    addShutterLeaf(B, lw, lh, st.shutter, T(x - w / 2 - 0.02, y - 0.01, 0.035, -ang));
    addShutterLeaf(B, lw, lh, st.shutter, T(x + w / 2 + 0.02, y - 0.01, 0.035, Math.PI + (st.open2 ?? R(2.5, 2.85))));
  }
  if (st.box) {
    const bw = w + 0.12; const m = T(x, y - 0.17, 0.2);
    B.add('wood', boxM(bw, 0.22, 0.24), st.boxCol ?? '#8a5a3c', m);
    for (const s of [-1, 1]) B.add('metal', boxM(0.03, 0.2, 0.26), 0xffffff, T(x + s * (bw / 2 - 0.15), y - 0.25, 0.14));
    ANCHORS.flowerBoxes.push({ m: worldOf(B, T(x, y - 0.06, 0.2)), w: bw - 0.06, d: 0.2, kind: st.box });
  }
}

/* ---------- doors ---------- */
function addDoor(B, o, st = {}) {
  const { x, y, w, h } = o; const inset = st.inset ?? 0.22, col = st.col ?? PAL.doorGreen;
  const top = o.arch ? y + h - w / 2 : y + h;
  const leafH = (st.fan ? top - 0.42 : (o.arch ? y + h : top)) - y;
  // leaf with raised panels
  B.add('wood', boxM(w - 0.02, leafH, 0.06), col, T(x, y + leafH / 2, -inset));
  const pw = (w - 0.3) / 2;
  for (const s of [-1, 1]) for (const [py, ph] of [[0.25, leafH * 0.38], [0.35 + leafH * 0.38, leafH * 0.42]]) {
    if (py + ph > leafH - 0.12) continue;
    B.add('wood', boxM(pw, ph, 0.03), C(col).multiplyScalar(0.9), T(x + s * (pw / 2 + 0.05), y + py + ph / 2, -inset + 0.04));
  }
  if (o.arch && !st.fan) B.add('wood', new THREE.CircleGeometry(w / 2 - 0.01, 16, 0, Math.PI), col, T(x, top, -inset + 0.03));
  if (st.fan) {
    B.add('wood', boxM(w, 0.08, 0.1), PAL.frame, T(x, y + leafH + 0.04, -inset));
    const gl = o.arch ? new THREE.CircleGeometry(w / 2, 16, 0, Math.PI) : new THREE.PlaneGeometry(w, top - (y + leafH + 0.08));
    if (o.arch) { B.add('glass', gl, '#ffffff', T(x, top, -inset - 0.02)); B.add('glass', new THREE.PlaneGeometry(w, top - y - leafH - 0.08), '#fff', T(x, (top + y + leafH + 0.08) / 2, -inset - 0.02)); }
    else B.add('glass', gl, '#ffffff', T(x, (top + y + leafH + 0.08) / 2, -inset - 0.02));
    for (let i = 1; i < 4; i++) { const a = i / 4 * Math.PI; if (o.arch) B.add('wood', boxM(0.03, w / 2, 0.03), PAL.frame, T(x + Math.cos(a) * w / 4, top + Math.sin(a) * w / 4, -inset - 0.01, 0, 0, a - Math.PI / 2)); }
  }
  B.add('metal', new THREE.SphereGeometry(0.035, 8, 6), 0xffffff, T(x + w / 2 - 0.16, y + 1.0, -inset + 0.06));
  B.add('metal', boxM(0.04, 0.16, 0.02), 0xffffff, T(x + w / 2 - 0.16, y + 1.0, -inset + 0.035));
  // threshold step
  B.add('trim', boxM(w + 0.5, 0.16, 0.55), st.stepCol ?? PAL.stoneGray, T(x, y + 0.03, 0.18));
}

/* ---------- curved tiled roof with real thickness ---------- */
/* ridge along local x; slopes fall toward +z and -z.
 * o: {L (ridge length incl gable overhang), half (eave half-span incl overhang), eaveY, ridgeY, key, col, sag, rsag, t, barge} */
const COURSE = ROOF_TEX_M / ROOF_ROWS;
function roofSlab(B, o, side) {
  const L = o.L, half = o.half, t = o.t ?? 0.16, sag = o.sag ?? 0.12, rsag = o.rsag ?? 0.06, step = o.step ?? 0.03;
  const yAt = (u, v) => lerp(o.eaveY, o.ridgeY, v) - sag * Math.sin(Math.PI * v) * (1 - 0.3 * v) - rsag * Math.sin(Math.PI * u) * (0.35 + 0.65 * v) + (o.wob ?? 0.02) * Math.sin(u * 17.0 + v * 3) * Math.sin(Math.PI * u);
  const slopeLen = Math.hypot(half, o.ridgeY - o.eaveY);
  const K = Math.max(2, Math.round(slopeLen / COURSE));
  const vs = []; for (let k = 0; k < K; k++) { vs.push([k / K, 1]); vs.push([(k + 0.5) / K, 0.5]); vs.push([(k + 1) / K - 0.0035, 0.0]); } vs.push([1, 0]);
  const nu = Math.max(4, Math.ceil(L / 0.45));
  const pos = [], uv = [], idx = []; const P = new THREE.Vector3();
  for (let j = 0; j < vs.length; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, [v, f] = vs[j];
    const y = yAt(u, v), z = side * half * (1 - v), x = -L / 2 + u * L;
    pos.push(x, y + step * f, z + side * step * f * 0.4); uv.push(x, v * slopeLen + 0.04);
  }
  for (let j = 0; j < vs.length - 1; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (side > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g = g.toNonIndexed(); g.computeVertexNormals();
  B.add(o.key, g, o.col);
  // underside (soffit) and edges
  const und = surfaceGeo(nu, 6, (u, v, p) => p.set(-L / 2 + u * L, yAt(u, v) - t, side * half * (1 - v)), (u, v) => [u * L, v * slopeLen]);
  if (side > 0) { const ix = und.index.array; for (let i = 0; i < ix.length; i += 3) { const tmp = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = tmp; } und.computeVertexNormals(); }
  else { und.computeVertexNormals(); }
  B.add('wood', und, o.soffit ?? '#6b5240');
  // gable barge boards (both ends) and eave fascia
  const bc = o.barge ?? '#5e4736';
  for (const u of [0, 1]) {
    const strip = surfaceGeo(1, 8, (a, v, p) => p.set(-L / 2 + u * L + (u ? 0.025 : -0.025), yAt(u, v) - t - 0.05 + a * (t + 0.14), side * half * (1 - v)), (a, v) => [a * 0.3, v * slopeLen]);
    strip.computeVertexNormals(); B.add('wood', strip, bc);
    const flip = strip.clone(); const ix = flip.index.array; for (let i = 0; i < ix.length; i += 3) { const tmp = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = tmp; }
    flip.computeVertexNormals(); B.add('wood', flip, bc);
  }
  B.add('wood', boxM(L, t + 0.06, 0.05), bc, T(0, yAt(0.5, 0) - t / 2 + 0.01, side * (half + 0.02)));
  // rafter tails under the eave
  const ang = Math.atan2(o.ridgeY - o.eaveY, half);
  for (let x = -L / 2 + 0.4; x < L / 2 - 0.3; x += 0.6) B.add('wood', boxM(0.08, 0.11, (o.ohE ?? 0.5) + 0.3), '#5a4334', T(x, yAt(0.5, 0.06) - t - 0.06, side * (half - ((o.ohE ?? 0.5) + 0.3) / 2), 0, side * ang));
  return { yAt, slopeLen };
}
function gableRoof(B, o) {
  const a = roofSlab(B, o, 1); roofSlab(B, o, -1);
  // ridge cap: short half-round tiles following the ridge sag
  const n = Math.round(o.L / 0.42);
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const y = a.yAt(u, 1) + 0.02;
    B.add(o.key, cylM(0.13, 0.13, 0.44, 8, false), C(o.col).multiplyScalar(0.92), T(-o.L / 2 + u * o.L, y, 0, 0, 0, Math.PI / 2)); }
  const H = (x, z) => { const u = clamp((x + o.L / 2) / o.L, 0, 1), v = clamp(1 - Math.abs(z) / o.half, 0, 1); return a.yAt(u, v); };
  return H;
}

/* conical tower roof with a flared (concave) profile */
function coneRoof(B, o) {
  // o: {R (eave radius), y0 (eave y), H (height), key, col, flare}
  const prof = (v) => ({ r: o.R * Math.pow(1 - v, o.flare ?? 1.45), y: o.y0 + o.H * v });
  const slant = Math.hypot(o.R, o.H);
  const K = Math.max(3, Math.round(slant / COURSE));
  const vs = []; for (let k = 0; k < K; k++) { vs.push([k / K, 1]); vs.push([(k + 0.5) / K, 0.5]); vs.push([(k + 1) / K - 0.003, 0]); }
  const nu = 40; const pos = [], uv = [], idx = [];
  for (let j = 0; j < vs.length; j++) for (let i = 0; i <= nu; i++) {
    const [v, f] = vs[j]; const a = i / nu * TAU; const p = prof(v); const r = p.r + 0.035 * f;
    pos.push(Math.cos(a) * r, p.y + 0.01 * f, Math.sin(a) * r); uv.push(i / nu * TAU * o.R * 0.85, v * slant);
  }
  for (let j = 0; j < vs.length - 1; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, d, b, a, c, d); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g = g.toNonIndexed(); g.computeVertexNormals(); B.add(o.key, g, o.col);
  // soffit ring + fascia
  const und = new THREE.RingGeometry(o.R * 0.7, o.R, 40, 1); und.rotateX(Math.PI / 2); B.add('wood', und, '#6b5240', T(0, o.y0 - 0.02, 0));
  B.add('wood', cylM(o.R + 0.02, o.R + 0.02, 0.16, 40, true), '#5e4736', T(0, o.y0 - 0.06, 0));
  // finial
  B.add('metal', cylM(0.03, 0.06, 1.3, 8), 0xffffff, T(0, o.y0 + o.H + 0.5, 0));
  B.add('metal', new THREE.SphereGeometry(0.11, 10, 8), 0xffffff, T(0, o.y0 + o.H + 0.35, 0));
}

function chimney(B, x, z, yBase, yTop, o = {}) {
  const w = o.w ?? 0.7, d = o.d ?? 0.6;
  B.add(o.key ?? 'stone', boxM(w, yTop - yBase, d), o.col ?? '#d8c7ab', T(x, (yTop + yBase) / 2, z));
  B.add('trim', boxM(w + 0.16, 0.12, d + 0.16), '#d9d0c0', T(x, yTop + 0.06, z));
  B.add('plain', cylM(0.12, 0.14, 0.4, 10), '#b76a45', T(x - w * 0.18, yTop + 0.32, z));
  if (o.pot2 !== false) B.add('plain', cylM(0.1, 0.12, 0.3, 10), '#a85f40', T(x + w * 0.2, yTop + 0.27, z));
  if (o.smoke) ANCHORS.smoke.push({ p: V3(x - w * 0.18, yTop + 0.55, z).applyMatrix4(B.top), rate: o.smoke });
}

/* corner quoins (alternating long/short dressed stones) */
function quoins(B, x, z, y0, y1, dirA, dirB, col = PAL.stoneWarm) {
  // dirA, dirB: unit vectors (in xz) along the two faces meeting at the corner (pointing away from the corner)
  let y = y0, k = 0;
  while (y < y1 - 0.2) {
    const h = 0.3, la = k % 2 ? 0.28 : 0.5, lb = k % 2 ? 0.5 : 0.28;
    const c = jitter(col, 0.01, 0.03, 0.04);
    B.add('trim', boxM(la, h - 0.03, 0.05), c, T(x + dirA[0] * la / 2, y + h / 2, z + dirA[1] * la / 2, Math.atan2(dirA[0], dirA[1]) - Math.PI / 2));
    B.add('trim', boxM(lb, h - 0.03, 0.05), c, T(x + dirB[0] * lb / 2, y + h / 2, z + dirB[1] * lb / 2, Math.atan2(dirB[0], dirB[1]) - Math.PI / 2));
    y += h; k++;
  }
}

/* ---------- generic house ----------
 * o: { w, d, base:{h,key,col}|null, H (eave height), wallKey, wallCol, ridge:'x'|'z', rise, roof:{key,col,ohE,ohG,sag,rsag},
 *      faces:{front:[...], back:[...], left:[...], right:[...]}, quoins, string, t }
 * openings: {type:'win'|'door', x, y, w, h, arch, st}
 */
function house(B, o) {
  const w = o.w, d = o.d, t = o.t ?? 0.38, H = o.H, rise = o.rise ?? (o.ridge === 'z' ? w : d) * 0.55;
  const faces = o.faces ?? {};
  const gableOn = (face) => (o.ridge === 'z' ? (face === 'front' || face === 'back') : (face === 'left' || face === 'right'));
  const faceDefs = {
    front: { m: T(0, 0, d / 2), len: w }, back: { m: T(0, 0, -d / 2, Math.PI), len: w },
    left: { m: T(-w / 2, 0, 0, -Math.PI / 2), len: d - 2 * t }, right: { m: T(w / 2, 0, 0, Math.PI / 2), len: d - 2 * t },
  };
  for (const [name, f] of Object.entries(faceDefs)) {
    B.push(f.m);
    const ops = faces[name] ?? [];
    const baseH = o.base ? o.base.h : 0;
    const gab = gableOn(name) ? rise * (f.len / (o.ridge === 'z' ? w : d)) : 0;
    if (o.base) {
      const holes = ops.filter((p) => p.y < baseH - 0.05).map((p) => ({ x: p.x, y: p.y, w: p.w, h: Math.min(p.h, baseH - p.y - 0.01), arch: p.arch && p.y + p.h <= baseH }));
      B.add(o.base.key, wallGeo(f.len, baseH + 0.8, t, holes.map((h) => ({ ...h, y: h.y + 0.8 }))), o.base.col, T(0, -0.8, 0));
      const up = ops.filter((p) => p.y >= baseH - 0.05).map((p) => ({ ...p, y: p.y - baseH }));
      B.add(o.wallKey, wallGeo(f.len, H - baseH, t, up, gab), o.wallCol, T(0, baseH, 0));
      B.add('trim', boxM(f.len + 0.02, 0.14, 0.08), PAL.stoneWarm, T(0, baseH, 0.03));
    } else {
      const y0 = o.y0 ?? -0.8;
      B.add(o.wallKey, wallGeo(f.len, H - y0, t, ops.map((p) => ({ ...p, y: p.y - y0 })), gab), o.wallCol, T(0, y0, 0));
      if (o.plinth !== false && y0 < 0.2) B.add('stone', boxM(f.len + 0.02, 0.55, 0.06), PAL.stoneGray, T(0, 0.12, 0.02));
    }
    if (o.string) for (const sy of o.string) B.add('trim', boxM(f.len + 0.02, 0.1, 0.06), PAL.stoneWarm, T(0, sy, 0.025));
    // cornice under the eaves (not on gable faces)
    if (!gableOn(name) && !o.noRoof) { B.add('trim', boxM(f.len + 0.1, 0.16, 0.14), PAL.stoneWarm, T(0, H - 0.08, 0.05)); B.add('trim', boxM(f.len + 0.16, 0.08, 0.22), PAL.stoneWarm, T(0, H + 0.0, 0.08)); }
    for (const p of ops) {
      if (p.type === 'door') addDoor(B, p, p.st);
      else if (p.type === 'win') addWindow(B, p, p.st);
    }
    B.pop();
  }
  if (o.quoins) {
    const qc = o.quoins === true ? PAL.stoneWarm : o.quoins;
    quoins(B, w / 2 + 0.02, d / 2 + 0.02, o.base ? o.base.h : 0.3, H, [-1, 0], [0, -1], qc);
    quoins(B, -w / 2 - 0.02, d / 2 + 0.02, o.base ? o.base.h : 0.3, H, [1, 0], [0, -1], qc);
    quoins(B, w / 2 + 0.02, -d / 2 - 0.02, o.base ? o.base.h : 0.3, H, [-1, 0], [0, 1], qc);
    quoins(B, -w / 2 - 0.02, -d / 2 - 0.02, o.base ? o.base.h : 0.3, H, [1, 0], [0, 1], qc);
  }
  if (o.noRoof) return null;
  // roof
  const r = o.roof; const ohE = r.ohE ?? 0.55, ohG = r.ohG ?? 0.4;
  let roofH;
  if (o.ridge === 'z') {
    B.push(T(0, 0, 0, Math.PI / 2));
    const slope = rise / (w / 2);
    roofH = gableRoof(B, { L: d + 2 * ohG, half: w / 2 + ohE, eaveY: H + 0.06 - ohE * slope, ridgeY: H + rise + 0.18, key: r.key, col: r.col, sag: r.sag, rsag: r.rsag, ohE, barge: r.barge });
    B.pop();
    const f = roofH; roofH = (x, z) => f(-z, x);
  } else {
    const slope = rise / (d / 2);
    roofH = gableRoof(B, { L: w + 2 * ohG, half: d / 2 + ohE, eaveY: H + 0.06 - ohE * slope, ridgeY: H + rise + 0.18, key: r.key, col: r.col, sag: r.sag, rsag: r.rsag, ohE, barge: r.barge });
  }
  // attic floor plate to keep the inside dark & closed
  B.add('wood', boxM(w - 0.1, 0.1, d - 0.1), '#4a3a2e', T(0, H - 0.05, 0));
  return roofH;
}

/* window-row helper: n windows centred across a facade of length len */
function row(n, len, y, w, h, st, extra = {}) {
  const out = []; const gap = len / n;
  for (let i = 0; i < n; i++) out.push({ type: 'win', x: -len / 2 + gap * (i + 0.5), y, w, h, st, ...extra });
  return out;
}

/* ---------- small props ---------- */
function lampPost(B, x, z, y = 0, h = 3.6) {
  B.add('metal', cylM(0.12, 0.16, 0.5, 10), 0xffffff, T(x, y + 0.25, z));
  B.add('metal', cylM(0.05, 0.07, h, 8), 0xffffff, T(x, y + h / 2 + 0.3, z));
  B.add('metal', cylM(0.16, 0.1, 0.08, 8), 0xffffff, T(x, y + h + 0.32, z));
  B.add('glass', cylM(0.13, 0.1, 0.38, 6, true), '#fff6dd', T(x, y + h + 0.55, z));
  B.add('metal', new THREE.ConeGeometry(0.2, 0.22, 6), 0xffffff, T(x, y + h + 0.85, z));
  B.add('metal', new THREE.SphereGeometry(0.04, 6, 4), 0xffffff, T(x, y + h + 1.0, z));
}
function wallLantern(B, x, y, z) {
  B.add('metal', boxM(0.04, 0.04, 0.34), 0xffffff, T(x, y + 0.25, z + 0.17));
  B.add('metal', cylM(0.11, 0.08, 0.05, 6), 0xffffff, T(x, y + 0.03, z + 0.34));
  B.add('glass', cylM(0.09, 0.07, 0.26, 6, true), '#fff3d0', T(x, y - 0.12, z + 0.34));
  B.add('metal', new THREE.ConeGeometry(0.14, 0.14, 6), 0xffffff, T(x, y + 0.12, z + 0.34));
}
function bench(B, x, z, ry, y = 0) {
  B.push(T(x, y, z, ry));
  for (let i = 0; i < 4; i++) B.add('wood', boxM(1.7, 0.04, 0.1), jitter('#8a6446', 0.02, 0.06, 0.06), T(0, 0.45, -0.17 + i * 0.12));
  for (let i = 0; i < 3; i++) B.add('wood', boxM(1.7, 0.09, 0.03), jitter('#8a6446', 0.02, 0.06, 0.06), T(0, 0.62 + i * 0.13, -0.26, 0, -0.12));
  for (const s of [-1, 1]) { B.add('metal', boxM(0.05, 0.45, 0.45), 0xffffff, T(s * 0.72, 0.22, 0)); B.add('metal', boxM(0.05, 0.42, 0.05), 0xffffff, T(s * 0.72, 0.68, -0.27, 0, -0.12)); }
  B.pop();
}
function pot(B, x, y, z, r = 0.24, h = 0.36, kind = 'geranium') {
  const pr = [[0, 0], [r * 0.72, 0], [r * 0.82, h * 0.1], [r, h * 0.85], [r * 1.08, h * 0.88], [r * 1.08, h], [r * 0.95, h], [r * 0.9, h * 0.92], [0, h * 0.92]];
  B.add('plain', new THREE.LatheGeometry(pr.map(([a, b]) => new THREE.Vector2(a, b)), 14), jitter('#bf6d48', 0.02, 0.08, 0.06), T(x, y, z));
  ANCHORS.pots.push({ p: V3(x, y + h * 0.9, z).applyMatrix4(B.top), r: r * 0.95, kind });
}
