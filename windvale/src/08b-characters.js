/* =====================  the girl & her cat, drawn rather than assembled  ===================== *
 * Each body is sculpted as one signed-distance field (soft clay-like blends between parts),
 * meshed with surface nets, then cel-shaded (flat colour + one crisp shadow tone) with an ink
 * outline and a hand-painted face. Original designs, in the spirit of hand-drawn animation.   */

/* ---------- SDF primitives (plain numbers for speed) ---------- */
function sdEll(x, y, z, cx, cy, cz, rx, ry, rz) {
  const X = (x - cx) / rx, Y = (y - cy) / ry, Z = (z - cz) / rz;
  const k0 = Math.sqrt(X * X + Y * Y + Z * Z), k1 = Math.sqrt(X * X / (rx * rx) + Y * Y / (ry * ry) + Z * Z / (rz * rz));
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
}
function sdCap(x, y, z, ax, ay, az, bx, by, bz, r1, r2) {
  const ux = bx - ax, uy = by - ay, uz = bz - az, px = x - ax, py = y - ay, pz = z - az;
  const t = clamp((px * ux + py * uy + pz * uz) / (ux * ux + uy * uy + uz * uz), 0, 1);
  const dx = px - ux * t, dy = py - uy * t, dz = pz - uz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * t);
}
const sminK = (a, b, k) => { if (k <= 0) return a < b ? a : b; const h = Math.max(k - Math.abs(a - b), 0) / k; return (a < b ? a : b) - h * h * k * 0.25; };
const ELL = (c, r) => ({ f: (x, y, z) => sdEll(x, y, z, c[0], c[1], c[2], r[0], r[1], r[2]), c, R: Math.max(...r) });
const CAP = (a, b, r1, r2 = r1) => ({ f: (x, y, z) => sdCap(x, y, z, a[0], a[1], a[2], b[0], b[1], b[2], r1, r2), c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], R: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2 + Math.max(r1, r2) });

/* a sculpt = groups of primitives; each group has its own colour, blend radius and optional local frame (Matrix4) */
function makeField(groups, kGlobal = 0.006) {
  for (const g of groups) {
    g.inv = g.frame ? g.frame.clone().invert().elements : null; g.k = g.k ?? 0.02;
    const pts = g.prims.map((p) => p.c); const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length, cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
    g.bc = [cx, cy, cz]; g.bR = Math.max(...g.prims.map((p) => Math.hypot(p.c[0] - cx, p.c[1] - cy, p.c[2] - cz) + p.R)) + g.k;
  }
  const evalGroup = (g, x, y, z) => {
    let lx = x, ly = y, lz = z;
    if (g.inv) { const e = g.inv; lx = e[0] * x + e[4] * y + e[8] * z + e[12]; ly = e[1] * x + e[5] * y + e[9] * z + e[13]; lz = e[2] * x + e[6] * y + e[10] * z + e[14]; }
    const gx = lx - g.bc[0], gy = ly - g.bc[1], gz = lz - g.bc[2]; const bd = Math.sqrt(gx * gx + gy * gy + gz * gz) - g.bR;
    if (bd > 0.03) return bd;
    let d = 1e9;
    const P = g.prims; for (let q = 0; q < P.length; q++) { const p = P[q], c = p.c; const dx = lx - c[0], dy = ly - c[1], dz = lz - c[2]; const sd = Math.sqrt(dx * dx + dy * dy + dz * dz) - p.R; d = sminK(d, sd > d + g.k ? sd : p.f(lx, ly, lz), g.k); }
    if (g.cut) for (const c of g.cut) d = -sminK(-d, c.f(lx, ly, lz), 0.012);
    return d;
  };
  const f = (x, y, z) => { let d = 1e9; for (let q = 0; q < groups.length; q++) d = sminK(d, evalGroup(groups[q], x, y, z), kGlobal); return d; };
  const region = (x, y, z) => { let best = 1e9, bi = 0; groups.forEach((g, i) => { const d = evalGroup(g, x, y, z) - (g.bias ?? 0); if (d < best) { best = d; bi = i; } }); return bi; };
  return { f, region, groups, evalGroup };
}

/* surface nets: smooth closed mesh from an SDF on a regular grid */
async function surfaceNets(F, lo, hi, h, colorOf, windOf) {
  // time-sliced: yields to the browser every few ms so the page stays responsive while sculpting
  let tY = performance.now(); const breathe = async () => { if (!STILL && performance.now() - tY > 10) { await nextFrame(); tY = performance.now(); } };
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const V = new Float32Array(nx * ny * nz); const id = (i, j, k) => i + nx * (j + ny * k);
  // coarse pass (every S-th sample); fine samples far from the surface are interpolated, only the thin band near it is exact
  const S = 4, H = S * h, cx = Math.ceil((nx - 1) / S) + 1, cy = Math.ceil((ny - 1) / S) + 1, cz = Math.ceil((nz - 1) / S) + 1;
  const Cv = new Float32Array(cx * cy * cz); const cidx = (i, j, k) => i + cx * (j + cy * k);
  for (let k = 0; k < cz; k++) { for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) Cv[cidx(i, j, k)] = F.f(lo[0] + i * H, lo[1] + j * H, lo[2] + k * H); await breathe(); }
  const far = 1.9 * H;
  for (let k = 0; k < nz; k++) { const kc = Math.min(cz - 2, (k / S) | 0), fk = k / S - kc;
    for (let j = 0; j < ny; j++) { const jc = Math.min(cy - 2, (j / S) | 0), fj = j / S - jc;
      for (let i = 0; i < nx; i++) { const ic = Math.min(cx - 2, (i / S) | 0), fi = i / S - ic;
        const c000 = Cv[cidx(ic, jc, kc)], c100 = Cv[cidx(ic + 1, jc, kc)], c010 = Cv[cidx(ic, jc + 1, kc)], c110 = Cv[cidx(ic + 1, jc + 1, kc)];
        const c001 = Cv[cidx(ic, jc, kc + 1)], c101 = Cv[cidx(ic + 1, jc, kc + 1)], c011 = Cv[cidx(ic, jc + 1, kc + 1)], c111 = Cv[cidx(ic + 1, jc + 1, kc + 1)];
        if (Math.min(Math.abs(c000), Math.abs(c100), Math.abs(c010), Math.abs(c110), Math.abs(c001), Math.abs(c101), Math.abs(c011), Math.abs(c111)) > far &&
            (c000 > 0) === (c111 > 0) && (c000 > 0) === (c100 > 0) && (c000 > 0) === (c011 > 0)) {
          const a0 = c000 + (c100 - c000) * fi, a1 = c010 + (c110 - c010) * fi, b0 = c001 + (c101 - c001) * fi, b1 = c011 + (c111 - c011) * fi;
          V[id(i, j, k)] = (a0 + (a1 - a0) * fj) * (1 - fk) + (b0 + (b1 - b0) * fj) * fk;
        } else V[id(i, j, k)] = F.f(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
      } }
    await breathe(); }
  const cell = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1); const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [], vc = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = V[id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; cv[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      const va = cv[a], vb = cv[b]; if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; n++;
    }
    cell[cid(i, j, k)] = pos.length / 3; vc.push(i, j, k, sx / n, sy / n, sz / n);
    pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  mark('  nets: sample'); const idx = [];
  const quad = (a, b, c, d, outward) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const P = (q) => [pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]]; const pa = P(a), pb = P(b), pc = P(c), pd = P(d);
    const u = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]], v = [pd[0] - pb[0], pd[1] - pb[1], pd[2] - pb[2]];
    const nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (nn[0] * outward[0] + nn[1] * outward[1] + nn[2] * outward[2] >= 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const v0 = V[id(i, j, k)], v1 = V[id(i + 1, j, k)]; if ((v0 < 0) === (v1 < 0)) continue;
    quad(cell[cid(i, j - 1, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i, j - 1, k)], [v0 < 0 ? 1 : -1, 0, 0]); }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const v0 = V[id(i, j, k)], v1 = V[id(i, j + 1, k)]; if ((v0 < 0) === (v1 < 0)) continue;
    quad(cell[cid(i - 1, j, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)], [0, v0 < 0 ? 1 : -1, 0]); }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const v0 = V[id(i, j, k)], v1 = V[id(i, j, k + 1)]; if ((v0 < 0) === (v1 < 0)) continue;
    quad(cell[cid(i - 1, j - 1, k)], cell[cid(i, j - 1, k)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)], [0, 0, v0 < 0 ? 1 : -1]); }
  mark('  nets: faces');
  // normals from the field gradient, colours by region, sway weights
  const nv = pos.length / 3, nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), wind = new Float32Array(nv);
  for (let q = 0; q < nv; q++) {
    const x = pos[q * 3], y = pos[q * 3 + 1], z = pos[q * 3 + 2];
    // gradient: central differences on the grid, trilinearly blended across the cell (smooth, no extra field evaluations)
    const ci = vc[q * 6], cj = vc[q * 6 + 1], ck = vc[q * 6 + 2], fx = vc[q * 6 + 3], fy = vc[q * 6 + 4], fz = vc[q * 6 + 5];
    let gx = 0, gy = 0, gz = 0;
    for (let c = 0; c < 8; c++) {
      const di = c & 1, dj = (c >> 1) & 1, dk = (c >> 2) & 1; const w = (di ? fx : 1 - fx) * (dj ? fy : 1 - fy) * (dk ? fz : 1 - fz);
      const I = Math.min(nx - 2, Math.max(1, ci + di)), J = Math.min(ny - 2, Math.max(1, cj + dj)), K = Math.min(nz - 2, Math.max(1, ck + dk));
      gx += w * (V[id(I + 1, J, K)] - V[id(I - 1, J, K)]); gy += w * (V[id(I, J + 1, K)] - V[id(I, J - 1, K)]); gz += w * (V[id(I, J, K + 1)] - V[id(I, J, K - 1)]);
    }
    const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1; nor.set([gx / l, gy / l, gz / l], q * 3);
    const r = F.region(x, y, z); const c = colorOf(r, x, y, z); col.set([c.r, c.g, c.b], q * 3); wind[q] = windOf ? windOf(r, x, y, z) : 0;
  }
  mark('  nets: normals+regions ' + nv);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aWind', new THREE.BufferAttribute(wind, 1)); g.setIndex(idx);
  return g;
}

/* ---------- cel shading + ink outline ---------- */
function celMat({ wind = 0, fill = 0.55, rim = '#fff0d2', rimK = 0.3 } = {}) {
  const grad = new THREE.DataTexture(new Uint8Array([34, 34, 34, 178, 255, 255]), 6, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time; sh.uniforms.uFill = { value: C('#b4c3d8').multiplyScalar(fill) }; sh.uniforms.uRim = { value: C(rim).multiplyScalar(rimK) };
    sh.vertexShader = 'uniform float uTime;\nattribute float aWind;\n' + GLSL_WIND + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>\n${wind ? `transformed += windAt((modelMatrix * vec4(position, 1.0)).xyz, uTime) * aWind * ${wind.toFixed(3)};` : ''}`);
    sh.fragmentShader = 'uniform vec3 uFill;\nuniform vec3 uRim;\n' + sh.fragmentShader
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.indirectDiffuse += diffuseColor.rgb * uFill;')
      .replace('#include <opaque_fragment>', 'outgoingLight += uRim * smoothstep(0.55, 0.85, 1.0 - saturate(dot(normal, normalize(vViewPosition))));\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'cel' + wind + fill + rimK;
  return m;
}
function inkMat(color = '#3b2a20', wind = 0, px = 0.0016) {
  const m = new THREE.MeshBasicMaterial({ color: C(color), side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time;
    sh.vertexShader = 'uniform float uTime;\nattribute float aWind;\n' + GLSL_WIND + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       { vec4 mv0 = modelViewMatrix * vec4(position, 1.0); transformed += normal * clamp(-mv0.z * ${px.toFixed(5)}, 0.0028, 0.03); }
       ${wind ? `transformed += windAt((modelMatrix * vec4(position, 1.0)).xyz, uTime) * aWind * ${wind.toFixed(3)};` : ''}`);
  };
  m.customProgramCacheKey = () => 'ink' + wind + px;
  return m;
}
function inked(geo, mat, ink) { const g = new THREE.Group(); const a = new THREE.Mesh(geo, mat); a.castShadow = true; a.receiveShadow = true; const b = new THREE.Mesh(geo, ink); g.add(a, b); return g; }

/* face card bent onto the head surface; drawn features on transparent canvas */
function faceCard(F, group, w, hgt, cx, cy, draw, res = 256, frame = null) {
  const S = canvas(res, Math.round(res * hgt / w)); draw(S.ctx, S.cv.width, S.cv.height);
  const tex = toTex(S.cv, { repeat: false }); tex.anisotropy = 4;
  const g = new THREE.PlaneGeometry(w, hgt, 16, 8); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + cx, y = p.getY(i) + cy; let zl = 0.0, zh = 0.2;
    const fe = frame ? frame.elements : null;
    for (let it = 0; it < 22; it++) { const zm = (zl + zh) / 2; let X = x, Y = y, Z = zm; if (fe) { X = fe[0] * x + fe[4] * y + fe[8] * zm + fe[12]; Y = fe[1] * x + fe[5] * y + fe[9] * zm + fe[13]; Z = fe[2] * x + fe[6] * y + fe[10] * zm + fe[14]; }
      if (F.evalGroup(group, X, Y, Z) < 0) zl = zm; else zh = zm; }
    p.setXYZ(i, x, y, zl + 0.0012);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.03 }));
}

/* ---------------- the girl ---------------- */
async function buildGirl(scene) {
  const COL = { skin: C('#f7d8c4'), hair: C('#5e3b2a'), dress: C('#6d93cf'), white: C('#f8f4ec'), shoe: C('#7c3f2c'), ribbon: C('#f2c14e') };
  // head frame: turned a little to her left (toward the waterfall), chin slightly up
  const HS = 1.13; // head scale (anime proportions)
  const headM = new THREE.Matrix4().compose(V3(0, 0.745, 0.014), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0.3, 0.03, 'YXZ')), V3(HS, HS, HS));
  const strands = []; // back & side hair clumps (head-local)
  for (const deg of [70, 88, 106, 124, 142, 160, 180, -160, -142, -124, -106, -88, -70]) {
    const a = deg * Math.PI / 180, s = Math.sin(a), c = Math.cos(a); const len = 0.16 + 0.025 * Math.cos(a * 3);
    strands.push(CAP([s * 0.07, 0.04, c * 0.07 - 0.012], [s * 0.118, -len, c * 0.112 - 0.022], 0.034, 0.011));
  }
  for (const deg of [-38, -19, 0, 18, 36]) { const a = deg * Math.PI / 180; strands.push(CAP([Math.sin(a) * 0.06, 0.098, Math.cos(a) * 0.066 + 0.004], [Math.sin(a) * 0.082, 0.022 + Math.abs(deg) * 0.0004, Math.cos(a) * 0.1 + 0.006], 0.024, 0.007)); }
  for (const sx of [-1, 1]) strands.push(CAP([sx * 0.088, 0.03, 0.03], [sx * 0.1, -0.1, 0.045], 0.022, 0.008));
  const arm = (sx) => [CAP([sx * 0.15, 0.49, -0.005], [sx * 0.176, 0.3, -0.06], 0.039, 0.032), CAP([sx * 0.176, 0.3, -0.06], [sx * 0.198, 0.09, -0.098], 0.032, 0.027), ELL([sx * 0.2, 0.052, -0.11], [0.031, 0.022, 0.048])];
  const groups = [
    { name: 'skin', color: COL.skin, k: 0.022, prims: [CAP([0, 0.55, -0.005], [0, 0.635, 0.004], 0.034, 0.031), ...arm(1), ...arm(-1),
      ...[-1, 1].flatMap((sx) => [CAP([sx * 0.082, 0.04, 0.38], [sx * 0.084, -0.22, 0.405], 0.045, 0.031)])] },
    { name: 'face', color: COL.skin, k: 0.03, frame: headM, prims: [ELL([0, 0, 0], [0.093, 0.099, 0.094]), ELL([0, -0.044, 0.028], [0.07, 0.06, 0.066]), ELL([0.09, -0.006, -0.006], [0.015, 0.026, 0.013]), ELL([-0.09, -0.006, -0.006], [0.015, 0.026, 0.013])] },
    { name: 'hair', color: COL.hair, k: 0.016, frame: headM, bias: 0.004, prims: [ELL([0, 0.02, -0.014], [0.103, 0.104, 0.103]), ELL([0, -0.035, -0.04], [0.104, 0.1, 0.084]), ...strands],
      cut: [ELL([0, -0.05, 0.085], [0.083, 0.085, 0.07])] },
    { name: 'dress', color: COL.dress, k: 0.03, prims: [
      CAP([0, 0.13, -0.02], [0, 0.29, 0.0], 0.112, 0.08), CAP([0, 0.29, 0.0], [0, 0.45, 0.005], 0.08, 0.1), CAP([-0.12, 0.49, -0.005], [0.12, 0.49, -0.005], 0.052),
      ELL([0, 0.1, 0.17], [0.195, 0.075, 0.245]), ELL([0, 0.055, -0.05], [0.205, 0.06, 0.16]),
      ...[-1, 1].map((sx) => CAP([sx * 0.08, 0.09, 0.02], [sx * 0.085, 0.085, 0.35], 0.07, 0.055)),
      ELL([0, 0.035, 0.405], [0.19, 0.075, 0.03])] },
    { name: 'white', color: COL.white, k: 0.01, bias: 0.006, prims: [ELL([0, 0.545, -0.012], [0.135, 0.022, 0.105]), ...[-1, 1].flatMap((sx) => [ELL([sx * 0.155, 0.47, -0.01], [0.046, 0.052, 0.046]), CAP([sx * 0.084, -0.21, 0.405], [sx * 0.084, -0.27, 0.41], 0.033)])] },
    { name: 'shoe', color: COL.shoe, k: 0.012, prims: [-1, 1].map((sx) => CAP([sx * 0.084, -0.3, 0.408], [sx * 0.086, -0.315, 0.47], 0.034, 0.03)) },
    { name: 'ribbon', color: COL.ribbon, k: 0.006, frame: headM, bias: 0.006, prims: [ELL([-0.098, 0.068, -0.032], [0.011, 0.012, 0.012]), CAP([-0.1, 0.068, -0.032], [-0.104, 0.088, 0.0], 0.008, 0.015), CAP([-0.1, 0.068, -0.032], [-0.104, 0.088, -0.066], 0.008, 0.015), CAP([-0.1, 0.064, -0.028], [-0.104, 0.03, -0.014], 0.006, 0.004), CAP([-0.1, 0.064, -0.036], [-0.104, 0.032, -0.052], 0.006, 0.004)] },
  ];
  const F = makeField(groups, 0.005);
  const hInv = headM.clone().invert().elements; const SHINE = C('#9a6a4a');
  const colorOf = (r, x, y, z) => {
    if (groups[r].name !== 'hair') return groups[r].color;
    const ly = (hInv[1] * x + hInv[5] * y + hInv[9] * z + hInv[13]), lx = hInv[0] * x + hInv[4] * y + hInv[8] * z + hInv[12];
    const band = 0.05 + 0.007 * Math.sin(lx * 120); return Math.abs(ly - band) < 0.013 ? SHINE : groups[r].color;
  };
  const geo = await surfaceNets(F, [-0.29, -0.36, -0.27], [0.29, 0.92, 0.53], LOW ? 0.0125 : 0.0108, colorOf,
    (r, x, y, z) => groups[r].name === 'hair' ? smooth(0.72, 0.6, y) * 0.9 + 0.05 : groups[r].name === 'ribbon' ? 0.3 : (groups[r].name === 'dress' && z > 0.37 && y < 0.07) ? 0.35 : 0);
  const root = new THREE.Group(); root.name = 'girl';
  root.add(inked(geo, celMat({ wind: 0.035, rimK: 0.14 }), inkMat('#3b2a20', 0.035)));
  // painted face: brows, eyes, little mouth, blush
  const fi = groups.findIndex((g) => g.name === 'face');
  const face = faceCard(F, groups[fi], 0.15, 0.11, 0, -0.02, (c, W, H) => {
    const X = (m) => W / 2 + m / 0.15 * W, Y = (m) => H / 2 - (m + 0.02) / 0.11 * H;
    for (const sx of [-1, 1]) {
      const ex = X(sx * 0.033), ey = Y(-0.006);
      c.fillStyle = '#fbf6ef'; c.beginPath(); c.ellipse(ex, ey + 3, 13, 17, 0, 0, TAU); c.fill();
      const g = c.createLinearGradient(0, ey - 14, 0, ey + 20); g.addColorStop(0, '#24140e'); g.addColorStop(0.55, '#5a3522'); g.addColorStop(1, '#a8743e'); c.fillStyle = g; c.beginPath(); c.ellipse(ex + sx * 1, ey + 4, 10, 15, 0, 0, TAU); c.fill();
      c.fillStyle = '#1a0e09'; c.beginPath(); c.ellipse(ex + sx * 1, ey + 3, 4.5, 7, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex - sx * 3, ey - 3, 4.2, 5, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(ex + sx * 4.5, ey + 10, 2, 0, TAU); c.fill();
      c.strokeStyle = '#24150f'; c.lineWidth = 4.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - sx * 14, ey - 9); c.quadraticCurveTo(ex, ey - 21, ex + sx * 16, ey - 12); c.lineTo(ex + sx * 19, ey - 8); c.stroke();
      c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - sx * 10, ey + 21); c.quadraticCurveTo(ex, ey + 24, ex + sx * 10, ey + 20); c.stroke();
      c.lineWidth = 2.4; c.beginPath(); c.moveTo(ex - sx * 12, ey - 31); c.quadraticCurveTo(ex, ey - 37, ex + sx * 12, ey - 32); c.stroke();
      const bl = c.createRadialGradient(X(sx * 0.052), Y(-0.034), 1, X(sx * 0.052), Y(-0.034), 17); bl.addColorStop(0, 'rgba(240,135,125,0.6)'); bl.addColorStop(1, 'rgba(240,140,130,0)'); c.fillStyle = bl; c.fillRect(0, 0, W, H);
    }
    c.strokeStyle = '#a0584a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(X(-0.008), Y(-0.05)); c.quadraticCurveTo(X(0), Y(-0.053), X(0.008), Y(-0.05)); c.stroke();
    c.strokeStyle = 'rgba(160,100,80,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(0.002), Y(-0.022)); c.lineTo(X(0.004), Y(-0.03)); c.stroke();
  }, 256, headM);
  face.matrixAutoUpdate = false; face.matrix.copy(headM); root.add(face);
  root.position.set(TERRACE.x1 - 0.32, 0.545, (TERRACE.seatZ0 + TERRACE.seatZ1) / 2 - 0.45); root.rotation.y = Math.PI / 2;
  scene.add(root);
  return root;
}

/* ---------------- the black cat ---------------- */
async function buildCat(scene, girl) {
  const FUR = C('#27252f'), INNER = C('#5a3a44');
  const body = makeField([{ name: 'fur', color: FUR, k: 0.03, prims: [
    ELL([0, 0.075, -0.03], [0.083, 0.078, 0.1]), CAP([0, 0.09, -0.02], [0, 0.215, 0.04], 0.074, 0.048), ELL([0, 0.17, 0.045], [0.055, 0.075, 0.05]),
    ...[-1, 1].flatMap((sx) => [ELL([sx * 0.058, 0.058, -0.03], [0.034, 0.058, 0.075]), CAP([sx * 0.03, 0.15, 0.06], [sx * 0.032, 0.018, 0.08], 0.019, 0.015),
      ELL([sx * 0.032, 0.012, 0.094], [0.021, 0.014, 0.029]), ELL([sx * 0.068, 0.012, 0.04], [0.02, 0.013, 0.036])])] }]);
  const bodyGeo = await surfaceNets(body, [-0.14, -0.012, -0.16], [0.14, 0.3, 0.14], 0.0075, () => FUR);
  const headF = makeField([
    { name: 'fur', color: FUR, k: 0.022, prims: [ELL([0, 0.03, 0], [0.058, 0.05, 0.052]), ELL([0.03, 0.008, 0.018], [0.034, 0.029, 0.034]), ELL([-0.03, 0.008, 0.018], [0.034, 0.029, 0.034]),
      ELL([0, 0.0, 0.046], [0.024, 0.017, 0.019]), CAP([0.034, 0.062, -0.004], [0.052, 0.118, -0.012], 0.022, 0.003), CAP([-0.034, 0.062, -0.004], [-0.052, 0.118, -0.012], 0.022, 0.003)] },
    { name: 'inner', color: INNER, k: 0.004, bias: 0.004, prims: [CAP([0.034, 0.068, 0.006], [0.049, 0.108, -0.002], 0.012, 0.002), CAP([-0.034, 0.068, 0.006], [-0.049, 0.108, -0.002], 0.012, 0.002)] },
  ], 0.002);
  const headGeo = await surfaceNets(headF, [-0.085, -0.04, -0.07], [0.085, 0.13, 0.08], 0.0055, (r) => (r ? INNER : FUR));
  const mat = celMat({ fill: 0.75, rim: '#c9d8ff', rimK: 0.55 }), ink = inkMat('#100e14', 0, 0.0014);
  const root = new THREE.Group(); root.name = 'cat';
  root.add(inked(bodyGeo, mat, ink));
  const neck = new THREE.Group(); neck.position.set(0, 0.255, 0.045); root.add(neck);
  const head = new THREE.Group(); neck.add(head); head.add(inked(headGeo, mat, ink));
  const eyes = faceCard(headF, headF.groups[0], 0.09, 0.05, 0, 0.022, (c, W, H) => {
    const X = (m) => W / 2 + m / 0.09 * W, Y = (m) => H / 2 - (m - 0.022) / 0.05 * H;
    for (const sx of [-1, 1]) {
      const ex = X(sx * 0.022), ey = Y(0.03);
      c.fillStyle = '#0d0b10'; c.beginPath(); c.ellipse(ex, ey, 17, 15, sx * 0.15, 0, TAU); c.fill();
      const g = c.createRadialGradient(ex, ey - 4, 2, ex, ey, 14); g.addColorStop(0, '#ffe28a'); g.addColorStop(1, '#d4a12e'); c.fillStyle = g; c.beginPath(); c.ellipse(ex, ey, 14, 12, sx * 0.15, 0, TAU); c.fill();
      c.fillStyle = '#121014'; c.beginPath(); c.ellipse(ex, ey, 3, 10, 0, 0, TAU); c.fill();
      c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(ex - 4, ey - 5, 2.6, 0, TAU); c.fill();
    }
    c.fillStyle = '#8a5560'; c.beginPath(); c.moveTo(X(-0.006), Y(0.004)); c.lineTo(X(0.006), Y(0.004)); c.lineTo(X(0), Y(-0.002)); c.fill();
  }, 192);
  head.add(eyes);
  const ears = []; // ear twitch: rotate whole head slightly instead (ears are part of the sculpt)
  // tail: chain of cel-shaded joints with ink
  const segGeo = new THREE.CapsuleGeometry(0.016, 0.034, 3, 8); segGeo.rotateX(Math.PI / 2); segGeo.translate(0, 0, -0.022);
  const segCol = new Float32Array(segGeo.attributes.position.count * 3); for (let i = 0; i < segCol.length; i += 3) segCol.set([FUR.r, FUR.g, FUR.b], i);
  segGeo.setAttribute('color', new THREE.BufferAttribute(segCol, 3)); segGeo.setAttribute('aWind', new THREE.BufferAttribute(new Float32Array(segGeo.attributes.position.count), 1));
  let parent = new THREE.Group(); parent.position.set(0, 0.025, -0.13); root.add(parent); const joints = [];
  for (let i = 0; i < 10; i++) { const j = new THREE.Group(); if (i > 0) j.position.set(0, 0, -0.042); j.add(inked(segGeo, mat, ink)); j.scale.setScalar(1 - i * 0.035); parent.add(j); joints.push(j); parent = j; }
  root.position.copy(girl.position).add(V3(0, 0, 0.44)); root.rotation.y = Math.PI / 2 - 0.35;
  scene.add(root);
  let nextFlick = 4, flickT = -10, nextLook = 6, lookFrom = [0, 0], lookTo = [0, 0], lookT = 0;
  UPDATERS.push((t) => {
    if (t > nextFlick) { flickT = t; nextFlick = t + R(4.5, 9); }
    const fk = t - flickT; const flick = fk < 1.4 ? Math.sin(fk * 9) * Math.exp(-fk * 2.2) : 0;
    joints.forEach((j, i) => { const k = i / joints.length;
      j.rotation.y = (i === 0 ? 0.9 : 0.2) + (0.12 * Math.sin(t * 0.7 - i * 0.35) + flick * 0.55 * k) * (0.3 + k);
      j.rotation.x = i >= 6 ? 0.1 + 0.04 * Math.sin(t * 0.9 - i * 0.4) : 0; });
    if (t > nextLook) { lookFrom = [head.rotation.y, head.rotation.x]; lookTo = R() < 0.45 ? [R(0.5, 0.95), R(-0.15, 0.05)] : R() < 0.5 ? [R(-0.2, 0.2), R(-0.35, -0.2)] : [R(-0.15, 0.15), 0]; lookT = t; nextLook = t + R(5, 11); }
    const e = smooth(0, 1.2, t - lookT); head.rotation.y = lerp(lookFrom[0], lookTo[0], e); head.rotation.x = lerp(lookFrom[1], lookTo[1], e);
    head.rotation.z = Math.max(0, Math.sin(t * 0.83) - 0.97) * 1.2;
  });
  return root;
}
