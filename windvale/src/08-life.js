/* =====================  life: the girl & her cat, boats, birds, butterflies, smoke, laundry  ===================== */

/* GPU billboard particles (smoke, waterfall mist): one draw call per system */
function particles({ emitters, perEmitter = 18, life = 8, rise = 6, spread = 1.2, s0 = 0.4, s1 = 3, color = '#ece7df', opacity = 0.3, wind = [1.0, 0, -0.3], layer = 0 }) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
  const n = emitters.length * perEmitter; const em = new Float32Array(n * 3), sd = new Float32Array(n), rt = new Float32Array(n);
  emitters.forEach((e, i) => { for (let k = 0; k < perEmitter; k++) { const j = i * perEmitter + k; em.set([e.p.x, e.p.y, e.p.z], j * 3); sd[j] = k / perEmitter + R(0, 0.5 / perEmitter); rt[j] = e.rate ?? 1; } });
  g.setAttribute('aEmit', new THREE.InstancedBufferAttribute(em, 3)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 1)); g.setAttribute('aRate', new THREE.InstancedBufferAttribute(rt, 1));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uMap: { value: null }, uCol: { value: C(color) }, uOp: { value: opacity },
      uLife: { value: life }, uRise: { value: rise }, uSpread: { value: spread }, uS0: { value: s0 }, uS1: { value: s1 }, uWind: { value: V3(...wind) }, uSun: { value: SUN_DIR } }]),
    vertexShader: /* glsl */`
      attribute vec3 aEmit; attribute float aSeed; attribute float aRate;
      uniform float uTime, uLife, uRise, uSpread, uS0, uS1; uniform vec3 uWind;
      varying float vA; varying vec2 vUv; varying float vRot;
      #include <common>
      #include <fog_pars_vertex>
      void main(){
        float age = fract(uTime / uLife + aSeed);
        float ph = aSeed * 43.0;
        vec3 p = aEmit + vec3(0.0, uRise * pow(age, 0.85), 0.0) + uWind * age * age * uLife * 0.5
               + vec3(sin(ph + uTime * 0.37), 0.0, cos(ph * 1.3 + uTime * 0.29)) * uSpread * age;
        float size = mix(uS0, uS1, pow(age, 0.7));
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        float r = ph + age * 1.5; mat2 rot = mat2(cos(r), -sin(r), sin(r), cos(r));
        mvPosition.xy += rot * position.xy * size;
        gl_Position = projectionMatrix * mvPosition;
        vA = smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.45, 1.0, age)) * aRate; vUv = uv;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uCol; uniform float uOp; varying float vA; varying vec2 vUv;
      #include <common>
      #include <fog_pars_fragment>
      void main(){ float a = texture2D(uMap, vUv).a * vA * uOp; if (a < 0.003) discard; gl_FragColor = vec4(uCol * (0.85 + 0.25 * vUv.y), a);
        #include <fog_fragment>
      }`,
  });
  mat.uniforms.uMap.value = TEX.puff; mat.uniforms.uSun.value = SUN_DIR;
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 3; m.layers.set(layer);
  UPDATERS.push((t) => { mat.uniforms.uTime.value = t; });
  return m;
}

function lathe(pts, seg = 16, phiStart = 0, phiLen = TAU) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen); }
/* the girl and her cat (2D drawings on camera-facing cards) live in 08b-characters.js */
const CHARACTERS = { ready: null };

/* ---------------- boats ---------------- */
function hullGeo(L, Bm, D, inner = false) {
  return surfaceGeo(28, 16, (u, v, p) => {
    const s = u * 2 - 1; const hb = Bm / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), u > 0.5 ? 2.2 : 3.2)), 0.55);
    const top = D * 0.45 + 0.16 * s * s; const dep = D * 0.55 * (1 - 0.35 * s * s);
    const ph = (v - 0.5) * Math.PI; const k = inner ? 0.9 : 1;
    p.set(hb * Math.sin(ph) * k, top - (top + dep) * Math.pow(1 - Math.pow(Math.abs(Math.sin(ph)), 2.4), 0.8) * (inner ? 0.92 : 1) + (inner ? 0.02 : 0), s * L / 2 * (inner ? 0.96 : 1));
  }, (u, v) => [u * L, v * 2]);
}
const BOATS = [];
function buildBoat(scene, x, z, ry, col, o = {}) {
  const L = o.L ?? 4.2, Bm = o.B ?? 1.45, D = o.D ?? 0.6;
  const b = new Batch();
  const outer = hullGeo(L, Bm, D); const p = outer.attributes.position; const cols = new Float32Array(p.count * 3);
  const c1 = C(col), stripe = C(o.stripe ?? '#f4efe4'), bottom = C('#7a3a30');
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const c = y > D * 0.32 ? stripe : y < -0.08 ? bottom : c1; cols.set([c.r, c.g, c.b], i * 3); }
  outer.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  outer.setIndex(Array.from(outer.index.array).reverse()); outer.computeVertexNormals();
  b.add('wood', outer);
  const inn = hullGeo(L, Bm, D, true); b.add('wood', inn, '#a8835d');
  for (const zz of [-0.7, 0.35, 1.15]) b.add('wood', boxM(Bm * 0.82, 0.05, 0.24), '#9b7552', T(0, D * 0.12, zz));
  // gunwale rim
  const gun = []; for (let i = 0; i <= 24; i++) { const s = i / 24 * 2 - 1; const hb = Bm / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), s > 0 ? 2.2 : 3.2)), 0.55); gun.push(V3(hb, D * 0.45 + 0.16 * s * s, s * L / 2)); }
  for (const sx of [-1, 1]) b.add('wood', taperTube(new THREE.CatmullRomCurve3(gun.map((v) => V3(v.x * sx, v.y, v.z))), 30, 5, () => 0.03), '#6b4d36');
  // oars
  for (const sx of [-1, 1]) { b.add('wood', cylM(0.022, 0.022, 2.6, 6), '#b48e63', T(sx * 0.3, D * 0.2, 0.1, 0, Math.PI / 2 - 0.05, sx * 0.05)); b.add('wood', boxM(0.13, 0.02, 0.5), '#b48e63', T(sx * 0.33, D * 0.18, 1.3, 0, -0.05)); }
  if (o.sail) {
    b.add('wood', cylM(0.04, 0.05, 4.2, 8), '#d6c3a0', T(0, 2.0, 0.8));
    const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, 0.85, 0, 4.0, 0.82, 0, 0.55, -1.4], 3)); sail.computeVertexNormals();
    b.add('cloth', sail, '#f7f1e4'); const s2 = sail.clone(); s2.setIndex([0, 2, 1]); s2.computeVertexNormals(); b.add('cloth', s2, '#f7f1e4');
    b.add('wood', cylM(0.03, 0.03, 2.3, 6), '#a08060', T(0, 0.55, -0.27, 0, Math.PI / 2));
  }
  const g = b.build(MAT); const grp = new THREE.Group(); grp.add(g); grp.position.set(x, WATER_Y - 0.06, z); grp.rotation.y = ry; scene.add(grp);
  const ph = R(0, TAU);
  BOATS.push({ grp, ph, base: grp.position.y, ry });
  for (const k of [-0.42, 0.42]) RIPPLES.push({ x: x + Math.sin(ry) * L * k, z: z + Math.cos(ry) * L * k, r: Bm * 0.5, s: 0.9 });
  return grp;
}
function animateBoats(t) {
  for (const b of BOATS) {
    b.grp.position.y = b.base + 0.025 * Math.sin(t * 1.1 + b.ph) + 0.01 * Math.sin(t * 2.3 + b.ph * 2);
    b.grp.rotation.z = 0.025 * Math.sin(t * 0.9 + b.ph * 1.3); b.grp.rotation.x = 0.014 * Math.sin(t * 1.27 + b.ph * 0.7);
    b.grp.rotation.y = b.ry + 0.02 * Math.sin(t * 0.21 + b.ph);
  }
}

/* ---------------- butterflies ---------------- */
function buildButterflies(scene) {
  const N = 9; const wingG = new THREE.PlaneGeometry(0.09, 0.075); wingG.translate(0.045, 0, 0);
  const wm = new THREE.MeshStandardMaterial({ map: TEX.wing, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const L = new THREE.InstancedMesh(wingG, wm, N), Rr = new THREE.InstancedMesh(wingG, wm, N);
  const cols = ['#fbf6e6', '#f6dc6a', '#f3b35a', '#fbfbf7', '#e7e1ff', '#f6dc6a', '#fbf6e6', '#f3b35a', '#fde9a8'];
  for (let i = 0; i < N; i++) { L.setColorAt(i, C(cols[i])); Rr.setColorAt(i, C(cols[i])); }
  const spots = [[-9.5, 1.2, 22], [-13, 1.0, 24], [-6.5, 1.1, 19.5], [5.0, 1.2, 11], [5.2, 1.0, 17], [-16, 1.0, 27], [6.5, 1.3, -23], [-7.5, 1.2, 28.5], [4.8, 1.2, 24.5]];
  const bf = spots.map((s, i) => ({ c: V3(...s), ph: R(0, TAU), a: R(0.25, 0.45), b: R(0.3, 0.5), r: R(1.2, 2.4), flap: R(15, 19) }));
  for (const m of [L, Rr]) { m.frustumCulled = false; m.layers.set(1); scene.add(m); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Qw = new THREE.Quaternion(), P = V3(), P2 = V3(), S = V3(1, 1, 1);
  UPDATERS.push((t) => {
    bf.forEach((b, i) => {
      const tt = t + b.ph * 3; const pos = (q) => P2.set(b.c.x + Math.sin(q * b.a + b.ph) * b.r + Math.sin(q * 1.7) * 0.25, b.c.y + 0.35 * Math.sin(q * b.b * 2.1) + 0.12 * Math.sin(q * 5.3), b.c.z + Math.cos(q * b.a * 1.3 + b.ph) * b.r * 0.7);
      P.copy(pos(tt)); const nx = pos(tt + 0.05).clone().sub(P); const yaw = Math.atan2(nx.x, nx.z);
      const glide = Math.sin(tt * 0.6) > 0.7; const flap = glide ? 0.35 + 0.1 * Math.sin(tt * 4) : 0.15 + 1.1 * (0.5 + 0.5 * Math.sin(tt * b.flap));
      Q.setFromEuler(new THREE.Euler(0.35, yaw, 0, 'YXZ'));
      Qw.setFromEuler(new THREE.Euler(0, Math.PI / 2, flap, 'YXZ')); M.compose(P, Q.clone().multiply(Qw), S); L.setMatrixAt(i, M);
      Qw.setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI - flap, 'YXZ')); M.compose(P, Q.clone().multiply(Qw), S); Rr.setMatrixAt(i, M);
    });
    L.instanceMatrix.needsUpdate = true; Rr.instanceMatrix.needsUpdate = true;
  });
}

/* ---------------- gulls over the river ---------------- */
function buildBirds(scene) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.7, side: THREE.DoubleSide });
  const tipM = new THREE.MeshStandardMaterial({ color: 0x4a4b52, roughness: 0.7, side: THREE.DoubleSide });
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0.06); wingShape.lineTo(0.42, 0.1); wingShape.lineTo(0.75, -0.02); wingShape.lineTo(0.4, -0.08); wingShape.lineTo(0, -0.07);
  const wingG = new THREE.ShapeGeometry(wingShape); wingG.rotateX(-Math.PI / 2);
  const birds = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.32, 4, 8), mat); body.rotation.x = Math.PI / 2; g.add(body);
    const headM = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat); headM.position.set(0, 0.03, 0.24); g.add(headM);
    const wl = new THREE.Group(), wr = new THREE.Group();
    const a = new THREE.Mesh(wingG, mat); a.position.x = 0.04; wl.add(a); const tip = new THREE.Mesh(new THREE.CircleGeometry(0.07, 5), tipM); tip.rotation.x = -Math.PI / 2; tip.position.set(0.68, 0.002, -0.01); wl.add(tip);
    const b2 = a.clone(); b2.scale.x = -1; b2.position.x = -0.04; wr.add(b2); const tip2 = tip.clone(); tip2.position.x = -0.68; wr.add(tip2);
    g.add(wl, wr); g.scale.setScalar(i < 4 ? 1.15 : 0.9); scene.add(g);
    birds.push({ g, wl, wr, c: V3(R(25, 70), R(11, 22), R(-90, 10)), r: R(25, 55), sp: R(0.09, 0.14) * (i % 2 ? 1 : -1), ph: R(0, TAU), flapPh: R(0, 10) });
  }
  UPDATERS.push((t) => {
    for (const b of birds) {
      const a = t * b.sp + b.ph; const x = b.c.x + Math.cos(a) * b.r, z = b.c.z + Math.sin(a) * b.r * 0.6, y = b.c.y + 2.5 * Math.sin(a * 2.3);
      const dx = -Math.sin(a) * b.r * Math.sign(b.sp), dz = Math.cos(a) * b.r * 0.6 * Math.sign(b.sp);
      b.g.position.set(x, y, z); b.g.rotation.set(0, Math.atan2(dx, dz), -0.35 * Math.sign(b.sp), 'YXZ');
      const cyc = (t + b.flapPh) % 7; const flapping = cyc < 2.2;
      const ang = flapping ? 0.55 * Math.sin(t * 7.5 + b.flapPh) : 0.08 + 0.04 * Math.sin(t * 1.3 + b.flapPh);
      b.wl.rotation.z = ang; b.wr.rotation.z = -ang;
    }
  });
}

/* ---------------- laundry across the street ---------------- */
function buildLaundry(scene) {
  const a = V3(-6.45, 6.35, -18.2), b = V3(3.2, 5.9, -16.9);
  const sag = (t) => a.clone().lerp(b, t).add(V3(0, -0.45 * Math.sin(Math.PI * t), 0));
  const rope = new Batch();
  rope.add('plain', taperTube(new THREE.CatmullRomCurve3(Array.from({ length: 21 }, (_, i) => sag(i / 20))), 40, 4, () => 0.008), '#d9d2c2');
  for (const p of [a, b]) rope.add('metal', new THREE.TorusGeometry(0.05, 0.01, 4, 10), 0xffffff, T(p.x, p.y, p.z));
  const items = [
    { t: 0.12, w: 0.7, h: 0.55, c: '#f3c0c8', tex: null }, { t: 0.24, w: 1.25, h: 1.1, c: '#fbf8f0', tex: null }, { t: 0.38, w: 0.75, h: 0.8, c: '#ffffff', tex: 'check' },
    { t: 0.5, w: 0.62, h: 0.75, c: '#7fa6cf', tex: null }, { t: 0.63, w: 1.1, h: 0.9, c: '#ffffff', tex: 'stripe' }, { t: 0.76, w: 0.55, h: 0.7, c: '#f4dc8a', tex: null }, { t: 0.86, w: 0.25, h: 0.35, c: '#b94b40', tex: null }, { t: 0.91, w: 0.25, h: 0.35, c: '#b94b40', tex: null },
  ];
  const matPlain = patchMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }), { vary: 0.03, wind: 'attr', windAmp: 0.32 });
  const matCheck = patchMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide, map: TEX.check }), { vary: 0.03, wind: 'attr', windAmp: 0.32 });
  const matStripe = patchMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide, map: TEX.stripe }), { vary: 0.03, wind: 'attr', windAmp: 0.32 });
  const cb = new Batch(); const dir = b.clone().sub(a).normalize(); const ang = Math.atan2(-dir.z, dir.x);
  for (const it of items) {
    const top = sag(it.t);
    const g = surfaceGeo(6, 8, (u, v, p) => p.set((u - 0.5) * it.w, -v * it.h, 0.03 * Math.sin(u * 9 + it.t * 20) * v), (u, v) => [u, 1 - v]);
    const w = new Float32Array(g.attributes.position.count); for (let i = 0; i < w.length; i++) { const v = Math.floor(i / 7) / 8; w[i] = v * v * 0.9 + v * 0.1; }
    g.setAttribute('aWind', new THREE.BufferAttribute(w, 1));
    cb.add(it.tex ?? 'plain', g, it.c, T(top.x, top.y - 0.01, top.z, ang));
    for (const s of [-1, 1]) rope.add('wood', boxM(0.025, 0.08, 0.03), '#cdb48e', T(top.x + Math.cos(ang) * s * it.w * 0.4, top.y, top.z - Math.sin(ang) * s * it.w * 0.4, ang));
  }
  scene.add(rope.build(MAT));
  const cloth = cb.build({ plain: matPlain, check: matCheck, stripe: matStripe }); cloth.traverse((o) => { if (o.isMesh) o.layers.set(1); }); scene.add(cloth);
}

/* ---------------- swinging bakery sign & weathervane ---------------- */
function buildSignAndVane(scene) {
  if (ANCHORS.sign) {
    const pivot = new THREE.Group(); pivot.matrixAutoUpdate = false; pivot.matrix.copy(ANCHORS.sign);
    const swing = new THREE.Group(); pivot.add(swing);
    const sm = new THREE.MeshStandardMaterial({ map: TEX.sign, roughness: 0.65, transparent: false, alphaTest: 0.5 });
    TEX.sign.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.PlaneGeometry(1.0, 0.625);
    const f = new THREE.Mesh(plate, sm); f.position.set(0, -0.52, 0.012); swing.add(f);
    const bk = new THREE.Mesh(plate, sm); bk.rotation.y = Math.PI; bk.position.set(0, -0.52, -0.012); swing.add(bk);
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.022, 28), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.7 }));
    edge.scale.set(0.5, 1, 0.31); edge.rotation.x = Math.PI / 2; edge.position.set(0, -0.52, 0); swing.add(edge);
    for (const sx of [-0.3, 0.3]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 4), MAT.metal); ch.position.set(sx, -0.1, 0); swing.add(ch); }
    swing.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(pivot);
    UPDATERS.push((t) => { swing.rotation.x = 0.06 * Math.sin(t * 0.9) + 0.025 * Math.sin(t * 2.3 + 1); });
  }
  if (ANCHORS.vane) {
    const v = new THREE.Group(); v.position.copy(ANCHORS.vane);
    const s = new THREE.Shape(); // rooster silhouette
    s.moveTo(-0.28, 0); s.lineTo(0.1, 0); s.quadraticCurveTo(0.26, 0.02, 0.3, 0.18); s.lineTo(0.36, 0.2); s.lineTo(0.3, 0.26); s.quadraticCurveTo(0.24, 0.36, 0.18, 0.28);
    s.quadraticCurveTo(0.12, 0.12, -0.02, 0.14); s.quadraticCurveTo(-0.2, 0.36, -0.34, 0.3); s.quadraticCurveTo(-0.26, 0.16, -0.28, 0);
    const rg = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }); rg.translate(0, 0.08, -0.01);
    const vm = new THREE.Mesh(rg, MAT.metal); v.add(vm);
    const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 5), MAT.metal); arrow.rotation.z = Math.PI / 2; v.add(arrow);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), MAT.metal); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.48; v.add(tip);
    v.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(v);
    UPDATERS.push((t) => { v.rotation.y = 2.4 + 0.25 * Math.sin(t * 0.21) + 0.08 * Math.sin(t * 0.77); });
  }
}

function buildFountainWater(scene) {
  if (!ANCHORS.fountain) return;
  const f = ANCHORS.fountain;
  const w = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshStandardMaterial({ color: 0x5f9a96, roughness: 0.04, metalness: 0.2, envMapIntensity: 1.6 }));
  w.rotation.x = -Math.PI / 2; w.position.set(f.x, 0.58, f.z); scene.add(w);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + 0.4; const pts = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; const r = 0.1 + t * 0.55; pts.push(V3(f.x + Math.cos(a) * r, 1.72 + 0.18 * Math.sin(Math.PI * t * 0.6) - t * t * 0.38, f.z + Math.sin(a) * r)); }
    const m = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 16, 5, (t) => 0.025 + 0.01 * t), FALLS.mat); m.renderOrder = 2; scene.add(m);
    const drop = []; for (let k = 0; k <= 6; k++) { const t = k / 6; drop.push(V3(f.x + Math.cos(a) * (0.66 + t * 0.12), 1.34 - t * 0.74, f.z + Math.sin(a) * (0.66 + t * 0.12))); }
    const m2 = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(drop), 8, 5, () => 0.03), FALLS.mat); m2.renderOrder = 2; scene.add(m2);
  }
}

function buildLife(scene) {
  buildFountainWater(scene);
  buildCharacters(scene); mark('life: girl & cat');
  CHARACTERS.ready = Promise.resolve();
  const xq = quayX(-5);
  buildBoat(scene, xq + 5.2, DOCK.z0 - 1.25, Math.PI / 2 + 0.06, '#3f6f9a');
  buildBoat(scene, xq + 10.2, DOCK.z1 + 1.2, Math.PI / 2 - 0.05, '#b8523d', { stripe: '#f1e6cf' });
  buildBoat(scene, xq + 14.8, DOCK.z0 - 1.6, Math.PI / 2 + 0.25, '#4f8a68', { L: 3.6, B: 1.3 });
  buildBoat(scene, 36, -42, 0.5, '#e9e2d2', { L: 4.8, B: 1.6, D: 0.65, sail: true, stripe: '#3f6f9a' });
  UPDATERS.push(animateBoats);
  buildButterflies(scene); buildBirds(scene); buildLaundry(scene); buildSignAndVane(scene);
  const smokeE = ANCHORS.smoke.filter((s) => s.rate > 0);
  if (smokeE.length) scene.add(particles({ emitters: smokeE, perEmitter: 18, life: 11, rise: 8, spread: 1.4, s0: 0.5, s1: 3.6, color: '#efe9df', opacity: 0.28, wind: [0.9, 0, -0.55] }));
  if (ANCHORS.fallBase) scene.add(particles({ emitters: [{ p: ANCHORS.fallBase, rate: 1 }, { p: ANCHORS.fallBase.clone().add(V3(-2, 0, 3)), rate: 0.8 }, { p: ANCHORS.fallBase.clone().add(V3(-1, 0, -3)), rate: 0.8 }], perEmitter: 22, life: 5, rise: 5, spread: 5, s0: 2, s1: 9, color: '#f4f8f8', opacity: 0.32, wind: [-0.8, 0, 0.3] }));
}
