/* =====================  trees, flowers, grass, ivy, forests, distant landmarks  ===================== */

/* ---------- card trees: tapered branch tubes + leaf-cluster cards with volumetric normals ---------- */
function makeTree(B, base, o = {}) {
  const old = rand; seed(o.seed ?? 1);
  const s = o.scale ?? 1;
  const crown = { c: base.clone().add(V3(o.lean?.[0] ?? 0, (o.crownY ?? 9) * s, o.lean?.[1] ?? 0)), r: (o.crownR ?? 6) * s, ry: (o.crownRY ?? 3.8) * s };
  const clumps = [];
  const branch = (p0, dir, len, rad, depth) => {
    const pts = [p0.clone()]; let d = dir.clone(); let p = p0.clone();
    for (let k = 0; k < 3; k++) {
      d.add(V3(R(-0.25, 0.25), R(-0.08, 0.2) + (o.up ?? 0.08), R(-0.25, 0.25))).normalize();
      p = p.clone().addScaledVector(d, len / 3); pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const r1 = rad * (depth >= (o.depth ?? 3) ? 0.35 : 0.62);
    const flare = depth === 0 ? (t) => (t < 0.12 ? lerp(rad * 1.7, rad, smooth(0, 0.12, t)) : lerp(rad, r1, t)) : (t) => lerp(rad, r1, t);
    const g = taperTube(curve, depth === 0 ? 14 : 8, depth < 2 ? 10 : 6, flare, 1.0);
    B.add('bark', g, o.barkCol ?? '#c9bfae');
    if (depth >= (o.depth ?? 3)) { clumps.push({ c: p.clone(), r: (o.clumpR ?? 1.6) * s * R(0.8, 1.2) }); return; }
    const n = depth === 0 ? (o.limbs ?? 3) : RI(2, 3);
    for (let i = 0; i < n; i++) {
      const t = depth === 0 ? R(0.82, 1.0) : R(0.45, 1.0);
      const sp = curve.getPointAt(t); const td = curve.getTangentAt(t);
      const ang = (i / n) * TAU + R(-0.5, 0.5) + (o.phase ?? 0);
      const out = V3(Math.cos(ang), 0, Math.sin(ang));
      const spread = depth === 0 ? (o.spread ?? 0.95) : R(0.45, 0.85);
      const nd = td.clone().multiplyScalar(1 - spread * 0.6).addScaledVector(out, spread).add(V3(0, depth === 0 ? 0.35 : 0.2, 0)).normalize();
      // keep the crown inside its envelope
      const toC = crown.c.clone().sub(sp); toC.y *= 0.3; if (toC.length() > crown.r * 0.7) nd.addScaledVector(toC.normalize(), 0.5).normalize();
      branch(sp, nd, len * R(0.6, 0.78), r1 * R(0.75, 0.95), depth + 1);
      if (depth > 0 && R() < 0.5) clumps.push({ c: sp.clone().addScaledVector(nd, 0.6), r: (o.clumpR ?? 1.6) * s * R(0.6, 0.9) });
    }
  };
  const trunkDir = V3(o.lean?.[0] ?? 0, (o.trunkH ?? 4.2) * s, o.lean?.[1] ?? 0).normalize();
  branch(base.clone().add(V3(0, -0.3, 0)), trunkDir, (o.trunkH ?? 4.2) * s + 0.3, (o.trunkR ?? 0.5) * s, 0);
  // extra clumps to fill the envelope
  for (let i = 0; i < (o.fill ?? 10); i++) { const a = R(0, TAU), rr = Math.sqrt(R()) * crown.r * 0.85; clumps.push({ c: crown.c.clone().add(V3(Math.cos(a) * rr, R(-0.6, 0.7) * crown.ry, Math.sin(a) * rr)), r: (o.clumpR ?? 1.6) * s * R(0.9, 1.3) }); }
  // leaf cards
  const pos = [], nor = [], uv = [], col = [], wind = [];
  const tint = C(o.leafCol ?? '#9cbf6a'); const tmp = new THREE.Color();
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  for (const cl of clumps) {
    const n = Math.round((o.cards ?? 22) * (cl.r / ((o.clumpR ?? 1.6) * s)));
    const lc = tmp.copy(tint).offsetHSL(R(-0.025, 0.025), R(-0.06, 0.06), R(-0.05, 0.05)).clone();
    for (let k = 0; k < n; k++) {
      const dirv = V3(R(-1, 1), R(-0.7, 1), R(-1, 1)).normalize();
      const cp = cl.c.clone().addScaledVector(dirv, cl.r * Math.cbrt(R(0.15, 1)));
      const size = (o.card ?? 1.35) * s * R(0.75, 1.2);
      e.set(R(0, TAU), R(0, TAU), R(0, TAU)); q.setFromEuler(e);
      const toCrown = cp.clone().sub(crown.c); toCrown.y /= (crown.ry / crown.r);
      const outward = clamp(toCrown.length() / crown.r, 0, 1.2);
      const ao = clamp(0.5 + 0.55 * smooth(0.15, 1.0, outward) + 0.15 * clamp((cp.y - crown.c.y) / crown.ry, -1, 1), 0.35, 1.1);
      for (const [cx, cy] of corners) {
        const v = V3(cx * size, cy * size, 0).applyQuaternion(q).add(cp);
        const nrm = v.clone().sub(cl.c).normalize().multiplyScalar(0.55).add(v.clone().sub(crown.c).normalize().multiplyScalar(0.6)).add(V3(0, 0.25, 0)).normalize();
        pos.push(v.x, v.y, v.z); nor.push(nrm.x, nrm.y, nrm.z); uv.push(cx + 0.5, cy + 0.5);
        col.push(lc.r * ao, lc.g * ao, lc.b * ao);
        wind.push(clamp((v.y - base.y) / (crown.c.y - base.y + crown.ry), 0.1, 1.2) * (0.5 + 0.5 * outward));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aWind', new THREE.Float32BufferAttribute(wind, 1));
  B.add('leaves', g);
  rand = old;
  return crown;
}

/* columnar cypress-like tree */
function makeCypress(B, base, h, r, sd) {
  const old = rand; seed(sd);
  B.add('bark', cylM(0.12, 0.2, 2.2, 6), '#8f7c66', T(base.x, base.y + 0.8, base.z));
  const pos = [], nor = [], uv = [], col = [], wind = []; const c0 = C('#6f9658');
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let k = 0; k < 160; k++) {
    const t = Math.pow(R(), 0.8); const y = base.y + 1.2 + t * h; const rr = r * Math.sin(Math.PI * Math.min(1, (1 - t) * 0.9 + 0.12)) * R(0.4, 1);
    const a = R(0, TAU); const cp = V3(base.x + Math.cos(a) * rr, y, base.z + Math.sin(a) * rr);
    e.set(R(0, TAU), R(0, TAU), R(0, TAU)); q.setFromEuler(e); const size = R(0.8, 1.2);
    const ao = 0.6 + 0.4 * (rr / r);
    for (const [cx, cy] of corners) {
      const v = V3(cx * size, cy * size, 0).applyQuaternion(q).add(cp);
      const nrm = V3(v.x - base.x, 0.3, v.z - base.z).normalize();
      pos.push(v.x, v.y, v.z); nor.push(nrm.x, nrm.y, nrm.z); uv.push(cx + 0.5, cy + 0.5); col.push(c0.r * ao, c0.g * ao, c0.b * ao); wind.push(t * 0.6);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aWind', new THREE.Float32BufferAttribute(wind, 1));
  B.add('leaves', g); rand = old;
}

/* ---------- instanced forest (two LOD levels) ---------- */
function blobTreeGeo(detail, lumps, sd) {
  const old = rand; seed(sd); const parts = [];
  for (let i = 0; i < lumps; i++) {
    const g = new THREE.IcosahedronGeometry(1, detail); const r = i === 0 ? 1 : R(0.55, 0.8);
    const off = i === 0 ? V3(0, 0, 0) : V3(R(-0.6, 0.6), R(-0.2, 0.5), R(-0.6, 0.6));
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const v = V3(p.getX(k), p.getY(k), p.getZ(k)); const n = 1 + 0.12 * Math.sin(v.x * 5 + i) * Math.sin(v.y * 4) * Math.sin(v.z * 6);
      v.multiplyScalar(r * n).add(off); v.y *= 0.9; p.setXYZ(k, v.x, v.y, v.z); }
    parts.push(g.toNonIndexed());
  }
  const g = mergeGeometries(parts);
  // volumetric normals + baked occlusion toward the bottom
  const p = g.attributes.position; const nor = new Float32Array(p.count * 3); const col = new Float32Array(p.count * 3);
  for (let k = 0; k < p.count; k++) { const v = V3(p.getX(k), p.getY(k) - 0.1, p.getZ(k)).normalize(); nor.set([v.x, v.y, v.z], k * 3);
    const ao = clamp(0.62 + 0.45 * (p.getY(k) + 0.5), 0.45, 1.05); col.set([ao, ao, ao], k * 3); }
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.translate(0, 1, 0); rand = old; return g;
}
/* leafy forest tree: dark core + leaf-mass cards with volumetric normals (two material groups) */
function cardTreeGeo(sd) {
  const old = rand; seed(sd);
  const core = blobTreeGeo(0, 1, sd + 1); core.scale(0.85, 0.85, 0.85); { const c = core.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * 0.55, c.getY(i) * 0.55, c.getZ(i) * 0.55); }
  core.deleteAttribute('uv'); core.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(core.attributes.position.count * 2), 2));
  const pos = [], nor = [], uv = [], col = [];
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let k = 0; k < 11; k++) {
    const d = V3(R(-1, 1), R(-0.5, 1), R(-1, 1)).normalize(); const cp = d.clone().multiplyScalar(R(0.5, 0.9)).add(V3(0, 1, 0));
    e.set(R(0, TAU), R(0, TAU), R(0, TAU)); q.setFromEuler(e); const size = R(1.1, 1.5);
    for (const [cx, cy] of corners) { const v = V3(cx * size, cy * size, 0).applyQuaternion(q).add(cp); const n = v.clone().sub(V3(0, 0.9, 0)).normalize();
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y + 0.15, n.z); uv.push(cx + 0.5, cy + 0.5); const ao = clamp(0.65 + 0.4 * (v.y - 0.6), 0.5, 1.05); col.push(ao, ao, ao); }
  }
  const cards = new THREE.BufferGeometry(); cards.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cards.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  cards.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); cards.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); cards.normalizeNormals();
  rand = old;
  return mergeGeometries([core, cards], true);
}

function coniferGeo(detail) {
  const parts = [];
  for (let i = 0; i < 4; i++) { const g = new THREE.ConeGeometry(1 - i * 0.2, 1.2, detail ? 9 : 6, 1, true); g.translate(0, 0.5 + i * 0.62, 0); parts.push(g.toNonIndexed()); }
  const g = mergeGeometries(parts); const p = g.attributes.position; const nor = new Float32Array(p.count * 3); const col = new Float32Array(p.count * 3);
  for (let k = 0; k < p.count; k++) { const v = V3(p.getX(k), 0.45, p.getZ(k)).normalize(); nor.set([v.x, v.y, v.z], k * 3); const ao = 0.6 + 0.16 * p.getY(k); col.set([ao, ao, ao], k * 3); }
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.scale(1, 1.3, 1); return g;
}
function buildForest(scene) {
  const mat = patchMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { vary: 0.16, foliage: [0.45, 0.25] });
  const near = [], far = [], con = [];
  const old = rand; seed(77);
  const palette = [C('#5f8c3e'), C('#6f9a48'), C('#4f7a36'), C('#7ea64f'), C('#486f34'), C('#86ad55'), C('#3f6530')];
  const conPal = [C('#4f7a4a'), C('#5b8752'), C('#466c45')];
  const tryPlace = (x, z) => {
    const r = riverAt(z); const sd = Math.abs(x - r.cx) - r.w; if (sd < 4) return;
    const left = x < r.cx;
    if (left && x > -64 && x < 14 && z > -104 && z < 64) return; // the town itself
    if (left && x > -90 && z > -60 && z < 70 && R() < 0.85) return;
    if (Math.hypot(x - CASTLE.x, z - CASTLE.z) < 55) return;
    if (Math.abs(z - VIADUCT_Z) < 9 && sd < 60) return;
    const y = terrainH(x, z);
    const e = 1.5; const slope = Math.hypot(terrainH(x + e, z) - terrainH(x - e, z), terrainH(x, z + e) - terrainH(x, z - e)) / (2 * e);
    if (slope > 1.1) return;
    const dens = fbm(x * 0.012 + 3, z * 0.012, 3); const groves = smooth(0.42, 0.62, dens);
    if (R() > groves * (sd < 25 ? 0.5 : 1)) return;
    const dist = Math.hypot(x - 0, z + 20);
    const isCon = y > 45 && R() < smooth(45, 140, y) * 0.75;
    const sc = R(0.55, 1.0);
    const item = { x, y: y - 0.4, z, s: sc, h: R(0.9, 1.25), col: (isCon ? pick(conPal) : pick(palette)).clone().offsetHSL(R(-0.02, 0.02), R(-0.05, 0.05), R(-0.05, 0.05)) };
    if (isCon) con.push(item); else (dist < 380 ? near : far).push(item);
  };
  for (let i = 0; i < 30000 * DENS; i++) { const a = R(0, TAU), rr = 40 + Math.pow(R(), 1.6) * 1500; tryPlace(Math.cos(a) * rr + 20, Math.sin(a) * rr - 160); }
  for (let i = 0; i < 9000 * DENS; i++) tryPlace(R(-160, 280), R(-460, 140));
  for (let i = 0; i < 5000 * DENS; i++) { const z = R(-300, 120); const x = riverAt(z).cx + riverAt(z).w + R(30, 220); tryPlace(x, z); }
  rand = old;
  // split each tree type into angular sectors so whole sectors are frustum-culled
  const mk = (geo, list, scaleBase, mats = mat) => {
    const grp = new THREE.Group(); const bins = Array.from({ length: 10 }, () => []);
    for (const t of list) bins[Math.floor(((Math.atan2(t.z + 40, t.x - 10) + Math.PI) / TAU) * 10) % 10].push(t);
    const M = new THREE.Matrix4();
    for (const b of bins) {
      if (!b.length) continue;
      const m = new THREE.InstancedMesh(geo, mats, b.length);
      b.forEach((t, i) => { const s = scaleBase * t.s; M.compose(V3(t.x, t.y, t.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, R(0, TAU), 0)), V3(s, s * t.h, s)); m.setMatrixAt(i, M); m.setColorAt(i, t.col); });
      m.computeBoundingSphere(); m.castShadow = false; m.receiveShadow = true; grp.add(m);
    }
    return grp;
  };
  console.log('forest', near.length, far.length, con.length, 'plants', FL.heads.length, FL.balls.length, FL.bushes.length, FL.grass.length);
  const g = new THREE.Group(); g.name = 'forest';
  const farM = mk(cardTreeGeo(13), far, 3.4, [mat, MAT.leaves]); farM.traverse((o) => o.layers.set(1));
  g.add(mk(cardTreeGeo(7), near, 3.3, [mat, MAT.leaves]), farM, mk(coniferGeo(1), con, 3.0));
  return g;
}

/* ---------- instanced flowers, bushes, grass ---------- */
function petalGeo(nPet = 5, cup = 0.25) {
  const pos = [], col = [], idx = []; const center = C('#f1c74a');
  pos.push(0, 0.05, 0); col.push(center.r, center.g, center.b);
  const ring = nPet * 2;
  for (let i = 0; i < ring; i++) {
    const a = i / ring * TAU; const pet = Math.pow(Math.abs(Math.cos(a * nPet / 2)), 0.6); const r = 0.25 + 0.75 * pet;
    pos.push(Math.cos(a) * r, cup * r * r, Math.sin(a) * r); col.push(1, 1, 1);
  }
  for (let i = 0; i < ring; i++) {
    const a = i / ring * TAU; const r = 0.22; pos.push(Math.cos(a) * r, 0.04, Math.sin(a) * r); col.push(center.r, center.g, center.b);
  }
  for (let i = 0; i < ring; i++) { idx.push(1 + ring + i, 1 + i, 1 + (i + 1) % ring); idx.push(1 + ring + i, 1 + (i + 1) % ring, 1 + ring + (i + 1) % ring); idx.push(0, 1 + ring + i, 1 + ring + (i + 1) % ring); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals(); const n = g.attributes.normal; for (let i = 0; i < n.count; i++) { n.setXYZ(i, n.getX(i) * 0.3, 1, n.getZ(i) * 0.3); } g.normalizeNormals();
  return g;
}
function crossQuadGeo(n = 3, w = 1, h = 1) {
  const parts = []; for (let i = 0; i < n; i++) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.rotateY(i / n * Math.PI); parts.push(g); }
  const g = mergeGeometries(parts); const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
  const col = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
function bushGeo() {
  const parts = []; const old = rand; seed(31);
  for (let i = 0; i < 9; i++) { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(R(-1.2, 1.2)); g.rotateY(R(0, TAU)); g.translate(R(-0.3, 0.3), R(0.25, 0.65), R(-0.3, 0.3)); parts.push(g); }
  rand = old;
  const g = mergeGeometries(parts); const p = g.attributes.position; const nn = g.attributes.normal; const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i) - 0.25, p.getZ(i)).normalize(); nn.setXYZ(i, v.x, v.y + 0.3, v.z); const ao = 0.55 + 0.6 * p.getY(i); col.set([ao, ao, ao], i * 3); }
  g.normalizeNormals(); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
const FLOWER_COLS = {
  geranium: ['#d9363e', '#e2474a', '#c92f3a', '#f0586a'], pink: ['#ef8fb0', '#f4a6c2', '#e07aa0'], white: ['#fbf8f0', '#f4f1e6'], yellow: ['#f6cf4a', '#f2b93a'],
  lavender: ['#9a86d0', '#8a74c4', '#a996dc'], hydrangea: ['#8aa6e2', '#a59ae0', '#e8a6c8', '#9fb7ea'], orange: ['#f09040', '#ea7a3a'], petunia: ['#c45aa8', '#e070b8', '#f1f0f6', '#7f61c8'],
};
const FL = { heads: [], balls: [], spikes: [], bushes: [], grass: [] };
function addClump(p, kind, size = 1, dense = 1) {
  const s = size;
  const bushC = kind === 'boxwood' ? C('#5d7f3c') : kind === 'lavender' ? C('#8aa07a') : C('#79a052');
  FL.bushes.push({ p: p.clone(), s: 0.45 * s * R(0.8, 1.2), c: bushC.clone().offsetHSL(R(-0.02, 0.02), 0, R(-0.06, 0.06)) });
  if (kind === 'boxwood') { FL.bushes.push({ p: p.clone().add(V3(0, 0.12 * s, 0)), s: 0.5 * s, c: C('#5a7c3a') }); return; }
  if (kind === 'geranium' || kind === 'hydrangea') FL.bushes.push({ p: p.clone().add(V3(R(-0.1, 0.1), 0.08 * s, R(-0.1, 0.1))), s: 0.42 * s * R(0.8, 1.1), c: C('#6f9a48').offsetHSL(0, 0, R(-0.05, 0.03)) });
  const n = Math.round((kind === 'hydrangea' ? R(2, 4) : kind === 'geranium' ? R(3, 6) : R(5, 9)) * dense * s);
  for (let i = 0; i < n; i++) {
    const a = R(0, TAU), r = Math.sqrt(R()) * 0.3 * s; const q = p.clone().add(V3(Math.cos(a) * r, R(0.25, 0.55) * s, Math.sin(a) * r));
    if (kind === 'lavender') FL.spikes.push({ p: q.add(V3(0, 0.05, 0)), s: R(0.8, 1.2) * s, c: C(pick(FLOWER_COLS.lavender)), tilt: [R(-0.3, 0.3), R(-0.3, 0.3)] });
    else if (kind === 'hydrangea') FL.balls.push({ p: q, s: R(0.075, 0.11) * s, c: C(pick(FLOWER_COLS.hydrangea)) });
    else if (kind === 'geranium') { FL.balls.push({ p: q, s: R(0.055, 0.08) * s, c: C(pick(FLOWER_COLS.geranium)) }); }
    else {
      const pal = kind === 'daisy' ? FLOWER_COLS.white : kind === 'mixed' ? pick([FLOWER_COLS.pink, FLOWER_COLS.white, FLOWER_COLS.yellow, FLOWER_COLS.geranium, FLOWER_COLS.petunia]) : kind === 'trail' ? FLOWER_COLS.petunia : FLOWER_COLS.pink;
      FL.heads.push({ p: q, s: R(0.045, 0.075) * s, c: C(pick(pal)), up: R(0.6, 1) });
    }
  }
}
function trailing(p, dir, len, col) {
  // cascading strand of leaves + small flowers hanging from a box
  for (let k = 0; k < 6; k++) { const t = k / 5; const q = p.clone().add(V3(dir.x * 0.08 * t, -len * t, dir.z * 0.08 * t));
    FL.bushes.push({ p: q.clone().add(V3(0, -0.15, 0)), s: R(0.16, 0.22), c: C('#6f9a4a').offsetHSL(0, 0, R(-0.05, 0.05)) });
    if (R() < 0.7) FL.heads.push({ p: q.add(V3(R(-0.05, 0.05), 0, R(-0.05, 0.05))), s: R(0.04, 0.06), c: C(pick(col)), up: R(-0.2, 0.6) }); }
}
function grassAt(x, y, z, s = 1, c) { FL.grass.push({ p: V3(x, y, z), s: s * R(0.7, 1.3), c: c ?? C('#9bbb5a').offsetHSL(R(-0.03, 0.03), R(-0.08, 0.05), R(-0.08, 0.06)) }); }

function populatePlants() {
  const old = rand; seed(909);
  // window boxes
  for (const fb of ANCHORS.flowerBoxes) {
    const n = Math.max(3, Math.round(fb.w / 0.22));
    for (let i = 0; i < n; i++) {
      const lp = V3(-fb.w / 2 + (i + 0.5) * fb.w / n + R(-0.04, 0.04), 0.05, R(-0.04, 0.04)).applyMatrix4(fb.m);
      const kind = fb.kind === 'mixed' ? pick(['geranium', 'pink', 'mixed', 'daisy']) : fb.kind === 'trail' ? pick(['trail', 'mixed', 'geranium']) : fb.kind;
      addClump(lp, kind, 0.7);
      if ((fb.kind === 'trail' || R() < 0.25) && R() < 0.6) { const out = V3(0, 0, 1).transformDirection(fb.m); trailing(lp.clone().addScaledVector(out, 0.14), out, R(0.35, 0.8), FLOWER_COLS.petunia); }
    }
  }
  for (const pt of ANCHORS.pots) { const k = pt.kind; addClump(pt.p, k, pt.r * 3.2, 1.2); if (k !== 'boxwood') addClump(pt.p.clone().add(V3(R(-0.05, 0.05), 0.04, R(-0.05, 0.05))), k, pt.r * 2.6, 1); }
  for (const bd of ANCHORS.beds) for (let i = 0; i < bd.n; i++) { const lp = V3(R(-bd.w / 2, bd.w / 2), 0.02, R(-bd.d / 2, bd.d / 2)).applyMatrix4(bd.m); const k = bd.kind === 'mixed' ? pick(['pink', 'daisy', 'geranium', 'lavender', 'mixed']) : bd.kind; addClump(lp, k, R(0.7, 1.0)); }
  // garden around the hero tree & along the left foreground
  const gardens = [[-16, 26, 9, 'mixed'], [-4.8, 36, 4, 'daisy'], [-15.5, 8.5, 3.5, 'hydrangea'], [-8.2, 27.5, 4, 'pink'], [-18, 34, 6, 'daisy'], [7, -24, 4, 'mixed'], [3.4, -21, 3, 'lavender'], [-5.4, -16, 2.5, 'hydrangea'], [-5.2, -36, 2.5, 'geranium']];
  for (const [gx, gz, rad, kind] of gardens) for (let i = 0; i < rad * 9; i++) {
    const a = R(0, TAU), r = Math.sqrt(R()) * rad; const x = gx + Math.cos(a) * r, z = gz + Math.sin(a) * r; if (streetDist(x, z) < 0.3) continue;
    addClump(V3(x, terrainH(x, z), z), kind === 'mixed' ? pick(['pink', 'daisy', 'yellow', 'lavender', 'geranium']) : kind, R(0.8, 1.3), 0.8);
  }
  // meadow wildflowers + grass tufts
  for (let i = 0; i < 9000 * DENS; i++) {
    const x = R(-60, 12), z = R(-90, 70); const y = terrainH(x, z); if (y < -0.5) continue;
    if (x > TERRACE.x0 - 0.3 && z > TERRACE.z0 - 0.3 && z < TERRACE.z1 + 0.3) continue;
    const sdist = streetDist(x, z); if (sdist < -0.1) continue;
    const nearEdge = sdist < 0.9;
    const open = fbm(x * 0.2, z * 0.2, 2);
    if (nearEdge || open > 0.55 || R() < 0.15) grassAt(x, y, z, nearEdge ? 0.7 : 1.0);
    if (!nearEdge && R() < 0.05) FL.heads.push({ p: V3(x, y + R(0.15, 0.4), z), s: R(0.03, 0.05), c: C(pick([...FLOWER_COLS.white, ...FLOWER_COLS.yellow, '#c8a4e0'])), up: 1 });
  }
  // along the quay top / terrace edges
  for (let z = -70; z < 70; z += 0.5) { const x = quayX(z) - R(0.6, 1.4); if (z > TERRACE.z0 && z < TERRACE.z1) continue; if (R() < 0.6) grassAt(x, 0.02, z, 0.6); }
  // far bank meadow
  for (let i = 0; i < 2500 * DENS; i++) { const z = R(-120, 70); const x = riverAt(z).cx + riverAt(z).w + R(3, 40); const y = terrainH(x, z); grassAt(x, y, z, 1.3); if (R() < 0.08) FL.heads.push({ p: V3(x, y + 0.3, z), s: 0.06, c: C(pick([...FLOWER_COLS.white, ...FLOWER_COLS.yellow])), up: 1 }); }
  rand = old;
}
function buildPlantMeshes(scene) {
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = V3();
  const inst = (geo, mat, list, f) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { f(it, M); m.setMatrixAt(i, M); m.setColorAt(i, it.c); });
    m.castShadow = false; m.receiveShadow = true; m.layers.set(1); m.frustumCulled = false; scene.add(m); return m;
  };
  inst(petalGeo(5, 0.3), MAT.flower, FL.heads, (it, M) => { E.set(R(-0.5, 0.5) * (1.2 - it.up), R(0, TAU), R(-0.5, 0.5) * (1.2 - it.up)); Q.setFromEuler(E); M.compose(it.p, Q, S.set(it.s, it.s, it.s)); });
  const ball = new THREE.IcosahedronGeometry(1, 1); { const p = ball.attributes.position; for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)); v.multiplyScalar(1 + 0.12 * Math.sin(v.x * 9) * Math.sin(v.y * 8) * Math.sin(v.z * 7)); p.setXYZ(i, v.x, v.y, v.z); } ball.computeVertexNormals(); ball.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3).fill(1), 3)); }
  inst(ball, MAT.flower, FL.balls, (it, M) => { Q.setFromEuler(E.set(0, R(0, TAU), 0)); M.compose(it.p, Q, S.set(it.s, it.s * 0.85, it.s)); });
  const spike = new THREE.ConeGeometry(0.028, 0.22, 4); spike.translate(0, 0.11, 0); spike.setAttribute('color', new THREE.BufferAttribute(new Float32Array(spike.attributes.position.count * 3).fill(1), 3));
  inst(spike, MAT.flower, FL.spikes, (it, M) => { Q.setFromEuler(E.set(it.tilt[0], 0, it.tilt[1])); M.compose(it.p, Q, S.set(it.s, it.s, it.s)); });
  inst(bushGeo(), MAT.bush, FL.bushes, (it, M) => { Q.setFromEuler(E.set(0, R(0, TAU), 0)); M.compose(it.p, Q, S.set(it.s, it.s * 0.9, it.s)); });
  inst(crossQuadGeo(3, 0.55, 0.42), MAT.grass, FL.grass, (it, M) => { Q.setFromEuler(E.set(R(-0.15, 0.15), R(0, TAU), R(-0.15, 0.15))); M.compose(it.p, Q, S.set(it.s, it.s * R(0.7, 1.2), it.s)); });
}

/* ---------- ivy (leaf cards hugging walls) ---------- */
function buildIvy(B) {
  const old = rand; seed(515);
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const pos = [], nor = [], uv = [], col = [], wind = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(); const base = C('#8fb860');
  const addCard = (m, x, y, z, size, c) => {
    e.set(R(-0.6, 0.6), R(-0.6, 0.6), R(0, TAU)); q.setFromEuler(e);
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    for (const [cx, cy] of corners) {
      const v = V3(cx * size, cy * size, 0).applyQuaternion(q).add(V3(x, y, z)).applyMatrix4(m);
      const n = V3(R(-0.2, 0.2), R(-0.1, 0.3), 1).applyMatrix3(nm).normalize();
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); uv.push(cx + 0.5, cy + 0.5); col.push(c.r, c.g, c.b); wind.push(0.25 + y * 0.03);
    }
  };
  for (const a of ANCHORS.ivy) {
    const W = a.x1 - a.x0, H = a.y1 - a.y0; const strands = Math.max(1, Math.round(W * 1.6 * a.density));
    for (let s = 0; s < strands; s++) {
      let x = R(a.x0, a.x1), y = a.y0; const top = a.y0 + H * R(0.55, 1.0);
      while (y < top) {
        const dens = 1 - 0.55 * (y - a.y0) / H;
        for (let k = 0; k < 3; k++) if (R() < dens) addCard(a.m, clamp(x + R(-0.25, 0.25), a.x0 - 0.2, a.x1 + 0.2), y + R(-0.1, 0.1), R(0.04, 0.16), R(0.3, 0.5), base.clone().offsetHSL(R(-0.03, 0.03), R(-0.05, 0.05), R(-0.1, 0.06)).multiplyScalar(0.7 + 0.3 * R()));
        y += R(0.15, 0.3); x += R(-0.2, 0.2); x = clamp(x, a.x0, a.x1);
      }
    }
  }
  // climbing roses around the bakery door
  if (ANCHORS.roses) {
    for (let i = 0; i < 70; i++) { const t = R(); const ang = t * Math.PI; const x = 1.85 + Math.cos(ang) * 0.85 * (t < 0.15 || t > 0.85 ? 1 : 1), y = t < 0.15 ? R(0.3, 2.1) : t > 0.85 ? R(0.3, 2.1) : 2.15 + Math.sin(ang) * 0.75;
      const xx = t < 0.15 ? 1.85 + 0.82 : t > 0.85 ? 1.85 - 0.82 : x;
      addCard(ANCHORS.roses, xx + R(-0.1, 0.1), y, R(0.06, 0.2), R(0.25, 0.4), C('#7ea456').offsetHSL(0, 0, R(-0.08, 0.04)));
      if (R() < 0.55) { const p = V3(xx + R(-0.12, 0.12), y + R(-0.08, 0.08), R(0.15, 0.25)).applyMatrix4(ANCHORS.roses); FL.heads.push({ p, s: R(0.05, 0.075), c: C(pick(['#f4a6c2', '#ef8fb0', '#fbe3ec', '#e07aa0'])), up: 0.3 }); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aWind', new THREE.Float32BufferAttribute(wind, 1));
  B.add('ivy', g); rand = old;
}

/* ---------- distant landmarks: castle, viaduct, waterfall, rocks ---------- */
function buildCastle(B) {
  const cy = terrainH(CASTLE.x, CASTLE.z);
  B.push(T(CASTLE.x, cy - 1, CASTLE.z, 0.5));
  const wallC = C('#e9dfcb'), slate = '#5f7891';
  // curtain wall ring
  const ring = [[-26, -16], [4, -22], [28, -10], [30, 14], [6, 22], [-22, 16], [-32, 0]];
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length]; const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    B.add('stone', boxM(1.6, 12, L), wallC, T((x0 + x1) / 2, 2, (z0 + z1) / 2, a));
    for (let k = 0; k < L / 1.6; k++) { const t = (k + 0.5) / (L / 1.6); B.add('stone', boxM(1.7, 0.9, 0.8), wallC, T(lerp(x0, x1, t), 8.4, lerp(z0, z1, t), a)); }
    // round towers at the corners
    const th = R(16, 22), tr = R(2.6, 3.3);
    B.add('stone', cylM(tr, tr + 0.3, th + 4, 16), wallC, T(x0, th / 2 - 2, z0));
    B.push(T(x0, 0, z0)); coneRoof(B, { R: tr + 0.6, y0: th, H: tr * 2.4, key: 'slate', col: i % 3 === 0 ? PAL.red : slate, flare: 1.4 }); B.pop();
    for (let k = 0; k < 3; k++) { const aa = R(0, TAU); B.add('interior', boxM(0.5, 1.1, 0.1), C('#3a332c'), T(x0 + Math.sin(aa) * tr, th * R(0.4, 0.85), z0 + Math.cos(aa) * tr, aa)); }
  }
  // keep
  B.add('stone', boxM(9, 30, 9), wallC, T(-4, 13, 0));
  B.add('stone', boxM(10, 1.2, 10), wallC, T(-4, 28.5, 0));
  B.add('slate', new THREE.ConeGeometry(7.2, 11, 4), C(slate), T(-4, 34.5, 0, Math.PI / 4));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; B.add('stone', cylM(1.2, 1.2, 5, 10), wallC, T(-4 + Math.sin(a + 0.78) * 6.2, 30, Math.cos(a + 0.78) * 6.2)); B.push(T(-4 + Math.sin(a + 0.78) * 6.2, 0, Math.cos(a + 0.78) * 6.2)); coneRoof(B, { R: 1.6, y0: 32.5, H: 4.2, key: 'slate', col: slate }); B.pop(); }
  for (let y = 8; y < 26; y += 5) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; B.add('interior', boxM(0.8, 1.6, 0.1), C('#3a332c'), T(-4 + Math.sin(a) * 4.55, y, Math.cos(a) * 4.55, a)); }
  // palace hall with red roof
  B.push(T(12, 0, 4, 0.1));
  house(B, { w: 16, d: 8, H: 13, y0: -3, wallKey: 'plaster', wallCol: '#f2e8d4', ridge: 'x', rise: 6, plinth: false, roof: { key: 'roof', col: PAL.red, sag: 0.1 },
    faces: { front: row(5, 15, 5, 1.0, 2.0, {}).concat(row(5, 15, 9, 1.0, 1.8, {})), back: row(5, 15, 5, 1.0, 2.0, {}) } });
  B.pop();
  // chapel spire
  B.add('plaster', boxM(3, 24, 3), C('#f1e7d2'), T(14, 10, -10));
  B.add('slate', new THREE.ConeGeometry(2.4, 12, 8), C(slate), T(14, 28, -10));
  B.pop();
}

function buildViaduct(B) {
  const z0 = VIADUCT_Z, D = 7; const r = riverAt(z0);
  const Yd = 30;
  let xL = r.cx - r.w, xR = r.cx + r.w;
  while (terrainH(xL, z0) < Yd - 1 && xL > r.cx - 200) xL -= 1;
  while (terrainH(xR, z0) < Yd - 1 && xR < r.cx + 200) xR += 1;
  xL -= 6; xR += 6;
  const span = xR - xL; const n = Math.max(5, Math.round(span / 13)); const bay = span / n; const pier = 2.4; const rad = (bay - pier) / 2; const spring = Yd - 3.2 - rad;
  const s = new THREE.Shape();
  const g0 = (x) => Math.min(terrainH(x, z0 - D / 2), terrainH(x, z0 + D / 2), terrainH(x, z0)) - 3;
  s.moveTo(xL, Yd); s.lineTo(xR, Yd); s.lineTo(xR, g0(xR));
  for (let i = n - 1; i >= 0; i--) {
    const xa = xL + i * bay + pier / 2, xb = xL + (i + 1) * bay - pier / 2; const xc = (xa + xb) / 2;
    const gb = g0(xb), ga = g0(xa);
    if (i === n - 1) s.lineTo(xb + pier / 2, g0(xb + pier / 2));
    s.lineTo(xb, gb);
    if (gb < spring) { s.lineTo(xb, spring); s.absarc(xc, spring, rad, 0, Math.PI, false); s.lineTo(xa, ga); }
    else s.lineTo(xa, ga);
    s.lineTo(xa - pier / 2, g0(xa - pier / 2));
  }
  s.lineTo(xL, g0(xL)); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 16 }); geo.translate(0, 0, z0 - D / 2);
  // weathering: darker & greener toward the base
  const p = geo.attributes.position; const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = smooth(WATER_Y, Yd, y); const c = C('#7f806b').lerp(C('#efe4cd'), 0.35 + 0.65 * k); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  B.add('stone', geo);
  for (let i = 0; i < n; i++) {
    const xc = xL + (i + 0.5) * bay;
    for (const zz of [z0 + D / 2 + 0.12, z0 - D / 2]) B.add('trim', archRingGeo(rad, rad + 0.7, 0.12, 16), C('#e8dcc2'), T(xc, spring, zz));
    // cutwaters on piers standing in the river
    const xp = xL + i * bay; if (i > 0 && Math.abs(xp - r.cx) < r.w) for (const sgn of [-1, 1]) B.add('stone', new THREE.ConeGeometry(pier * 0.75, 7, 4), C('#a59c84'), T(xp, WATER_Y + 1.5, z0 + sgn * (D / 2 + 0.6), Math.PI / 4, 0, 0, 1, 1, 0.8));
    if (i > 0 && Math.abs(xp - r.cx) < r.w) RIPPLES.push({ x: xp, z: z0 + D / 2 + 1.2, r: 1.6, s: 1.2 });
  }
  B.add('trim', boxM(span, 0.6, D + 0.6), C('#ece1c8'), T((xL + xR) / 2, Yd - 0.2, z0));
  for (const sz of [-1, 1]) { B.add('stone', boxM(span, 1.1, 0.5), C('#e6dbc2'), T((xL + xR) / 2, Yd + 0.55, z0 + sz * (D / 2 - 0.25))); }
  for (let x = xL + 0.5; x < xR; x += 0.9) B.add('wood', boxM(0.25, 0.12, 2.6), '#5d4a3a', T(x, Yd + 0.12, z0));
  for (const dz of [-0.6, 0.6]) B.add('metal', boxM(span, 0.12, 0.08), 0xffffff, T((xL + xR) / 2, Yd + 0.24, z0 + dz));
  ANCHORS.viaduct = { xL, xR, Yd, z: z0 };
}

const rc0 = new THREE.Raycaster();
/* waterfall: a rock crag on the right bank whose face looks down-river toward the town; streak-shader ribbons fall over it */
const FALLS = { meshes: [], mat: null };
function buildWaterfall(scene, B) {
  const z0 = FALL_Z; const r = riverAt(z0);
  const P = V3(r.cx + r.w + 10, 6, z0);
  // crag: displaced ellipsoid with stepped ledges, merging back into the hillside
  const g = new THREE.IcosahedronGeometry(1, 6); const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const v = V3(pa.getX(i), pa.getY(i), pa.getZ(i));
    const n = fbm(v.x * 2.6 + 5, v.z * 2.6 + v.y * 2.1, 5) - 0.5, n2 = fbm(v.x * 7 + 1, v.y * 7 + v.z * 5, 3) - 0.5;
    let y = v.y; const st = Math.floor(y * 7); const f = y * 7 - st; y = (st + smooth(0.25, 0.75, f)) / 7 * 0.55 + y * 0.45;
    v.y = y; v.multiplyScalar(1 + n * 0.42 + n2 * 0.08);
    if (v.y > 0.6) v.y = 0.6 + (v.y - 0.6) * 0.35;
    pa.setXYZ(i, v.x * 18, v.y * 26, v.z * 12);
  }
  g.computeVertexNormals();
  const crag = new THREE.Mesh(g, MAT.cliff); crag.position.copy(P); crag.updateMatrixWorld();
  const cc = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) { const y = pa.getY(i) + P.y; const k = smooth(WATER_Y, 8, y); const c = C('#6f7a55').lerp(C('#a7b67a'), 0.4 + 0.6 * k); cc.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  B.add('cliff', g, undefined, T(P.x, P.y, P.z));
  for (let i = 0; i < 26; i++) { const a = R(-1.2, 1.8), rr = R(0.3, 0.85); const x = P.x + Math.cos(a) * 18 * rr, z = P.z + Math.sin(a) * 12 * rr; rc0.set(V3(x, 80, z), V3(0, -1, 0)); const h = rc0.intersectObject(crag)[0]; if (h && h.face.normal.y > 0.55) FL.bushes.push({ p: h.point, s: R(0.8, 1.6), c: C('#5e8a40').offsetHSL(0, 0, R(-0.06, 0.05)) }); }
  // trace the front face with rays so the water hugs the rock
  const rc = new THREE.Raycaster(); const frontAt = (x, y) => { rc.set(V3(x, y, P.z + 40), V3(0, 0, -1)); const h = rc.intersectObject(crag)[0]; return h ? h.point.z : null; };
  let topY = P.y + 22; while (topY > P.y && frontAt(P.x - 1, topY) === null) topY -= 0.5;
  FALLS.mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: /* glsl */`varying vec2 vUv;
      #include <common>
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`uniform float uTime; varying vec2 vUv;
      #include <common>
      #include <fog_pars_fragment>
      ${GLSL_NOISE}
      void main(){
        float x = vUv.x, y = vUv.y;
        float s1 = wv_noise(vec2(x * 22.0, y * 4.0 - uTime * 2.2));
        float s2 = wv_noise(vec2(x * 55.0 + 3.0, y * 8.0 - uTime * 3.1));
        float edge = smoothstep(0.0, 0.2, x) * smoothstep(1.0, 0.8, x);
        float streak = smoothstep(0.2, 0.9, s1 * 0.65 + s2 * 0.45);
        float a = edge * (0.5 + 0.5 * streak) * smoothstep(0.0, 0.03, y);
        vec3 col = mix(vec3(0.66, 0.8, 0.84), vec3(1.0, 1.0, 0.98), streak * 0.65 + y * 0.35);
        gl_FragColor = vec4(col * 1.2, a);
        #include <fog_fragment>
      }`,
  });
  const ribbon = (xOff, width, gap = 0.7) => {
    const pts = []; const N = 36;
    for (let i = 0; i <= N; i++) { const t = i / N; const y = lerp(topY + 0.3, WATER_Y + 0.05, t); const fz = frontAt(P.x + xOff, y); const lip = Math.max(0, 1 - t * 6) * 1.6;
      pts.push(V3(P.x + xOff, y, (fz ?? P.z + 4) + gap + lip)); }
    for (let i = 1; i <= N; i++) if (pts[i].z < pts[i - 1].z - 0.0 && i > 3) pts[i].z = Math.max(pts[i].z, pts[i - 1].z - 0.9);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) for (const sd of [-1, 1]) { pos.push(pts[i].x + sd * width / 2, pts[i].y, pts[i].z); uv.push(sd < 0 ? 0 : 1, i / N); }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, FALLS.mat); m.renderOrder = 2; scene.add(m); FALLS.meshes.push(m);
    return pts[N];
  };
  const foot = ribbon(-1.5, 6.5); ribbon(-1.8, 3.0, 0.9); ribbon(3.6, 1.6); ribbon(-6.2, 1.2); ribbon(5.6, 0.8); ribbon(-8.4, 0.7);
  RIPPLES.push({ x: foot.x, z: foot.z + 1.5, r: 5.5, s: 3 });
  ANCHORS.fallBase = V3(foot.x, WATER_Y + 0.6, foot.z + 1.2);
  ANCHORS.crag = P;
}
function rocks(B, cx, cz, n, spread, sz) {
  const old = rand; seed(Math.round(cx * 13 + cz));
  for (let i = 0; i < n; i++) {
    const x = cx + R(-spread, spread), z = cz + R(-spread, spread) * 0.6; const y = terrainH(x, z);
    const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const v = V3(p.getX(k), p.getY(k), p.getZ(k)); v.multiplyScalar(1 + 0.25 * (vnoise(v.x * 2 + i, v.z * 2) - 0.5)); p.setXYZ(k, v.x, v.y, v.z); }
    g.computeVertexNormals(); const s = sz * R(0.6, 1.4);
    B.add('rock', scaleUV(g, 3), C('#d9cfbd').offsetHSL(0, 0, R(-0.08, 0.05)), T(x, y + s * 0.2, z, R(0, TAU), R(-0.3, 0.3), 0, s * R(1, 1.8), s * R(0.6, 1.2), s));
  }
  rand = old;
}
