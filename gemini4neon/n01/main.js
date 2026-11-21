// N-01 霓 — an original mech: blueprint scan → part-by-part assembly → power-up → ignition → launch.
// Deterministic: everything is a pure function of time t, so frames can be rendered one by one.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TL = await (await fetch('./timeline.json')).json();
const W = 1920, H = 1080;
const CYAN = new THREE.Color(0.25, 0.92, 1.0), MAGENTA = new THREE.Color(1.0, 0.22, 0.86);

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const easeOutCubic = k => 1 - Math.pow(1 - k, 3);
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBack = k => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const noise1 = (t, s) => Math.sin(t * 1.7 + s) * 0.5 + Math.sin(t * 3.1 + s * 2.3) * 0.3 + Math.sin(t * 7.3 + s * 5.1) * 0.2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer / scene ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020308);
scene.fog = new THREE.FogExp2(0x04050b, 0.022);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 3000);

// ---------- materials ----------
const M = {
  white: new THREE.MeshStandardMaterial({ color: 0xc4cad6, metalness: 0.5, roughness: 0.34 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x23272f, metalness: 0.85, roughness: 0.32 }),
  indigo: new THREE.MeshStandardMaterial({ color: 0x2d3196, metalness: 0.6, roughness: 0.28 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.95, roughness: 0.22 }),
};
const strips = []; // {mat, y, color, part}
function stripMat(color, y, part) {
  const mat = new THREE.MeshBasicMaterial({ color: color.clone(), toneMapped: true });
  strips.push({ mat, y, color: color.clone(), part });
  return mat;
}

// ---------- mech construction ----------
// Every group has a world-rest origin; meshes are given in world-rest coordinates.
const mechRoot = new THREE.Group(); scene.add(mechRoot);
function G(name, origin, parent) {
  const g = new THREE.Group(); g.name = name; g.userData.origin = origin.clone();
  g.position.copy(origin).sub(parent.userData.origin || V(0, 0, 0)); parent.add(g); return g;
}
mechRoot.userData.origin = V(0, 0, 0);
const body = G('body', V(0, 0, 0), mechRoot);
const joints = {};
for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
  joints['hip' + k] = G('hip' + k, V(s * 0.55, 3.22, 0), body);
  joints['knee' + k] = G('knee' + k, V(s * 0.55, 1.87, 0), joints['hip' + k]);
  joints['ankle' + k] = G('ankle' + k, V(s * 0.55, 0.42, 0), joints['knee' + k]);
}
const upper = G('upper', V(0, 3.75, 0), body);

const parts = {};
function part(name, parent, lockPoint, offset, spin) {
  const g = new THREE.Group(); g.name = name; g.userData.origin = parent.userData.origin.clone();
  parent.add(g);
  const mats = { white: M.white.clone(), dark: M.dark.clone(), indigo: M.indigo.clone(), steel: M.steel.clone() };
  const p = { name, group: g, mats, lockPoint, offset, spin, meshes: [] };
  parts[name] = p; return p;
}
function rbox(w, h, d, r = 0.06) { return new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.2, h / 2.2, d / 2.2)); }
function taper(geom, top, bottom = 1, topZ = top, bottomZ = bottom) {
  geom.computeBoundingBox(); const bb = geom.boundingBox; const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y);
    pos.setX(i, pos.getX(i) * lerp(bottom, top, k)); pos.setZ(i, pos.getZ(i) * lerp(bottomZ, topZ, k));
  }
  geom.computeVertexNormals(); return geom;
}
function add(p, geom, matKey, pos, rot = [0, 0, 0], opts = {}) {
  const mat = typeof matKey === 'string' ? p.mats[matKey] : matKey;
  const m = new THREE.Mesh(geom, mat);
  m.position.copy(pos).sub(p.group.userData.origin); m.rotation.set(...rot);
  m.castShadow = opts.shadow !== false; m.receiveShadow = true;
  p.group.add(m); p.meshes.push(m); return m;
}
function strip(p, size, pos, color, rot = [0, 0, 0]) {
  return add(p, new THREE.BoxGeometry(...size), stripMat(color, pos.y, p.name), pos, rot, { shadow: false });
}
const sphere = r => new THREE.SphereGeometry(r, 24, 16);
const cyl = (rt, rb, h, n = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, n, 1, open);

for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
  // foot
  let p = part('foot' + k, joints['ankle' + k], V(s * 0.55, 0.42, 0), V(s * 5.0, 0.0, 1.5), V(0, s * 1.2, 0));
  add(p, rbox(0.72, 0.36, 1.32, 0.08), 'white', V(s * 0.55, 0.2, 0.16));
  add(p, rbox(0.62, 0.24, 0.42, 0.07), 'indigo', V(s * 0.55, 0.14, 0.86), [0.18, 0, 0]);
  add(p, rbox(0.5, 0.22, 0.32, 0.05), 'dark', V(s * 0.55, 0.16, -0.55));
  add(p, sphere(0.21), 'dark', V(s * 0.55, 0.44, 0));
  add(p, cyl(0.1, 0.15, 0.08), 'steel', V(s * 0.55, 0.01, -0.18));
  strip(p, [0.07, 0.03, 0.85], V(s * 0.55, 0.39, 0.2), CYAN);
  strip(p, [0.03, 0.05, 0.5], V(s * 0.92, 0.2, 0.25), MAGENTA);
  // shin
  p = part('shin' + k, joints['knee' + k], V(s * 0.55, 1.87, 0), V(0, 6.5, 0), V(0, s * 2.5, 0));
  add(p, taper(new THREE.BoxGeometry(0.64, 1.3, 0.7, 1, 4, 1), 1.15, 0.85), 'dark', V(s * 0.55, 1.18, 0));
  add(p, taper(rbox(0.56, 1.15, 0.2, 0.06), 1.1, 0.8), 'white', V(s * 0.55, 1.2, 0.4), [-0.08, 0, 0]);
  add(p, rbox(0.2, 0.9, 0.55, 0.06), 'indigo', V(s * 0.9, 1.15, -0.02));
  add(p, rbox(0.4, 0.7, 0.24, 0.05), 'white', V(s * 0.55, 1.1, -0.42));
  add(p, sphere(0.27), 'dark', V(s * 0.55, 1.87, 0));
  add(p, rbox(0.52, 0.46, 0.26, 0.08), 'white', V(s * 0.55, 1.95, 0.32), [-0.25, 0, 0]);
  strip(p, [0.04, 0.8, 0.04], V(s * 0.55 - 0.2, 1.2, 0.52), CYAN, [-0.08, 0, 0]);
  strip(p, [0.04, 0.8, 0.04], V(s * 0.55 + 0.2, 1.2, 0.52), CYAN, [-0.08, 0, 0]);
  strip(p, [0.04, 0.5, 0.04], V(s * 1.01, 1.15, 0.12), MAGENTA);
  // thigh
  p = part('thigh' + k, joints['hip' + k], V(s * 0.55, 3.22, 0), V(s * 2.5, 2.5, -4.5), V(1.2, 0, s * 0.8));
  add(p, cyl(0.24, 0.22, 1.3), 'dark', V(s * 0.55, 2.55, 0));
  add(p, rbox(0.64, 1.0, 0.72, 0.1), 'white', V(s * 0.55, 2.6, 0.02));
  add(p, rbox(0.14, 0.82, 0.54, 0.05), 'indigo', V(s * 0.9, 2.6, 0));
  add(p, rbox(0.44, 0.3, 0.2, 0.05), 'dark', V(s * 0.55, 2.95, 0.38));
  strip(p, [0.04, 0.6, 0.04], V(s * 0.98, 2.6, 0.18), MAGENTA);
}
// pelvis
let P = part('pelvis', body, V(0, 3.35, 0), V(0, 7.0, 0), V(0, 1.6, 0));
add(P, rbox(1.3, 0.55, 0.8, 0.1), 'dark', V(0, 3.42, 0));
add(P, taper(rbox(0.5, 0.52, 0.26, 0.06), 1.0, 0.6), 'white', V(0, 3.25, 0.43));
for (const s of [-1, 1]) {
  add(P, rbox(0.18, 0.78, 0.78, 0.06), 'white', V(s * 0.92, 3.22, 0), [0, 0, s * 0.16]);
  add(P, sphere(0.25), 'dark', V(s * 0.55, 3.22, 0));
  add(P, rbox(0.46, 0.6, 0.18, 0.05), 'indigo', V(s * 0.42, 3.2, -0.45), [0.12, 0, 0]);
}
strip(P, [1.15, 0.04, 0.04], V(0, 3.62, 0.41), CYAN);
// torso
P = part('torso', upper, V(0, 3.9, 0), V(0, 9.0, 0), V(0, -1.2, 0));
add(P, cyl(0.46, 0.42, 0.42), 'dark', V(0, 3.9, 0));
for (let i = 0; i < 3; i++) add(P, rbox(0.84 - i * 0.04, 0.17, 0.22, 0.04), 'dark', V(0, 3.98 + i * 0.2, 0.42));
add(P, taper(rbox(1.95, 1.2, 1.15, 0.14), 1.0, 0.72, 1.0, 0.85), 'white', V(0, 4.72, 0));
for (const s of [-1, 1]) {
  add(P, rbox(0.86, 0.52, 0.24, 0.07), 'indigo', V(s * 0.5, 4.95, 0.56), [0.1, -s * 0.2, 0]);
  strip(P, [0.04, 0.55, 0.04], V(s * 0.98, 4.65, 0.3), MAGENTA);
  strip(P, [0.5, 0.04, 0.04], V(s * 0.5, 4.66, 0.66), CYAN, [0, -s * 0.2, 0]);
}
add(P, rbox(1.05, 0.26, 0.84, 0.08), 'dark', V(0, 5.35, 0));
const reactorRing = add(P, new THREE.TorusGeometry(0.2, 0.05, 16, 48), stripMat(CYAN, 4.62, 'torso'), V(0, 4.62, 0.62), [0, 0, 0], { shadow: false });
const reactorCore = add(P, sphere(0.13), stripMat(new THREE.Color(0.75, 0.97, 1.0), 4.62, 'torso'), V(0, 4.62, 0.6), [0, 0, 0], { shadow: false });
// backpack
P = part('backpack', upper, V(0, 4.6, -0.6), V(0, 1.5, -6.0), V(-1.0, 0, 0));
add(P, rbox(1.3, 1.25, 0.6, 0.1), 'dark', V(0, 4.72, -0.78));
const nozzles = [];
for (const s of [-1, 1]) {
  add(P, cyl(0.17, 0.27, 0.46), 'steel', V(s * 0.38, 3.95, -0.88));
  nozzles.push(V(s * 0.38, 3.72, -0.88));
  add(P, rbox(0.12, 1.45, 0.52, 0.05), 'white', V(s * 0.8, 5.22, -0.95), [0.15, 0, s * -0.38]);
  strip(P, [0.03, 1.2, 0.03], V(s * 0.88, 5.25, -0.68), CYAN, [0.15, 0, s * -0.38]);
  add(P, cyl(0.12, 0.12, 0.5), 'indigo', V(s * 0.38, 5.42, -0.82));
}
strip(P, [0.8, 0.05, 0.05], V(0, 4.45, -1.09), MAGENTA);
// shoulders + arms
for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
  P = part('shoulder' + k, upper, V(s * 1.15, 4.95, 0), V(s * 6.0, 1.5, 0.5), V(0, 0, s * 2.0));
  add(P, sphere(0.29), 'dark', V(s * 1.15, 4.95, 0));
  add(P, rbox(0.88, 0.72, 1.04, 0.14), 'white', V(s * 1.48, 5.12, 0), [0, 0, s * -0.26]);
  add(P, rbox(0.72, 0.13, 0.88, 0.05), 'indigo', V(s * 1.5, 5.52, 0), [0, 0, s * -0.26]);
  strip(P, [0.04, 0.04, 0.95], V(s * 1.86, 4.95, 0), CYAN);
  strip(P, [0.04, 0.3, 0.04], V(s * 1.72, 5.2, 0.53), MAGENTA, [0, 0, s * -0.26]);
  P = part('arm' + k, upper, V(s * 1.4, 4.5, 0), V(s * 5.0, -1.0, 2.5), V(0.8, 0, s * 1.4));
  add(P, cyl(0.2, 0.2, 0.9), 'dark', V(s * 1.4, 4.38, 0));
  add(P, sphere(0.23), 'dark', V(s * 1.4, 3.86, 0));
  add(P, taper(rbox(0.52, 1.02, 0.58, 0.1), 1.0, 0.82), 'white', V(s * 1.42, 3.3, 0.06));
  add(P, rbox(0.16, 0.7, 0.4, 0.05), 'indigo', V(s * 1.72, 3.32, 0.06));
  add(P, rbox(0.38, 0.38, 0.42, 0.07), 'dark', V(s * 1.42, 2.62, 0.08));
  for (let f = 0; f < 3; f++) add(P, rbox(0.09, 0.26, 0.1, 0.03), 'steel', V(s * 1.42 + (f - 1) * 0.11, 2.36, 0.2));
  strip(P, [0.04, 0.62, 0.04], V(s * 1.81, 3.32, 0.06), MAGENTA);
  strip(P, [0.3, 0.04, 0.04], V(s * 1.42, 3.62, 0.37), CYAN);
}
// head
P = part('head', upper, V(0, 5.5, 0), V(0, 5.0, 1.5), V(0, Math.PI * 2, 0));
add(P, cyl(0.17, 0.2, 0.26), 'dark', V(0, 5.52, 0));
add(P, taper(rbox(0.64, 0.56, 0.68, 0.14), 0.86, 1.0, 0.9, 1.0), 'white', V(0, 5.84, 0.02));
add(P, rbox(0.44, 0.2, 0.12, 0.04), 'dark', V(0, 5.66, 0.33));
const visor = strip(P, [0.5, 0.075, 0.05], V(0, 5.87, 0.37), CYAN);
add(P, rbox(0.06, 0.3, 0.58, 0.03), 'indigo', V(0, 6.18, -0.08), [-0.55, 0, 0]);
strip(P, [0.025, 0.025, 0.5], V(0, 6.3, -0.06), MAGENTA, [-0.55, 0, 0]);
for (const s of [-1, 1]) {
  add(P, cyl(0.1, 0.1, 0.12), 'dark', V(s * 0.34, 5.82, 0), [0, 0, Math.PI / 2]);
  strip(P, [0.02, 0.16, 0.16], V(s * 0.41, 5.82, 0), CYAN);
}
const visorStrip = strips.find(s => s.mat === visor.material);

// assign timing
const partList = TL.parts.map(d => Object.assign(parts[d.name], d));
for (const p of partList) p.lock = p.t0 + p.dur;
const strip_parts = strips.map(s => parts[s.part]);

// ---------- blueprint ghost (edges in world-rest space) ----------
scene.updateMatrixWorld(true);
const ghost = new THREE.Group(); scene.add(ghost);
const clipPlane = new THREE.Plane(V(0, -1, 0), 0);
for (const p of partList) {
  p.ghostMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.2, 0.85, 1.0).multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: [clipPlane], fog: false });
  for (const m of p.meshes) {
    m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, sz = bb.getSize(new THREE.Vector3()), ct = bb.getCenter(new THREE.Vector3());
    const isRound = m.geometry.type === 'SphereGeometry' || m.geometry.type === 'TorusGeometry';
    const eg = isRound ? new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(Math.max(sz.x, sz.y) / 2, 0)) : new THREE.EdgesGeometry(new THREE.BoxGeometry(sz.x, sz.y, sz.z));
    eg.translate(ct.x, ct.y, ct.z);
    const ls = new THREE.LineSegments(eg, p.ghostMat);
    ls.applyMatrix4(m.matrixWorld); ghost.add(ls);
  }
}
for (const p of partList) { p.lockWorld = p.lockPoint.clone(); p.restWorldPos = new THREE.Vector3(); }

// ---------- environment ----------
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0a0c11, metalness: 0.7, roughness: 0.26 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const gridMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uPower: { value: 0 }, uWave: { value: -1 }, uScan: { value: 0 } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `varying vec3 vW; uniform float uPower,uWave,uScan;
    float line(float x,float w){ float d=abs(fract(x)-.5); return smoothstep(.5-w,.5,d); }
    void main(){ vec2 p=vW.xz/2.; float g=max(line(p.x,.025),line(p.y,.025)); float r=length(vW.xz);
      float fade=exp(-r*.035); vec3 c=vec3(.15,.75,1.)*g*fade*(.18+uPower*.8);
      float wave=uWave>0.? exp(-pow((r-uWave)*1.2,2.))*1.5*(1.-uWave/40.) : 0.;
      c+=vec3(.4,.9,1.)*wave*(.3+g*2.);
      float scan=uScan*exp(-pow((r-uScan*14.)*0.9,2.))*0.5; c+=vec3(.2,.8,1.)*scan*g*3.;
      gl_FragColor=vec4(c,1.); }`,
});
const grid = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), gridMat); grid.rotation.x = -Math.PI / 2; grid.position.y = 0.01; scene.add(grid);

const padRings = [];
for (const [r0, r1, c] of [[3.0, 3.12, CYAN], [4.4, 4.48, MAGENTA], [5.6, 5.64, CYAN]]) {
  const mat = new THREE.MeshBasicMaterial({ color: c.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 128), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; scene.add(m); padRings.push({ m, mat, c: c.clone() });
}
const padBars = [];
for (let i = 0; i < 16; i++) {
  const a = i / 16 * Math.PI * 2;
  const mat = new THREE.MeshBasicMaterial({ color: CYAN.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.0), mat); m.rotation.x = -Math.PI / 2; m.rotation.z = -a;
  m.position.set(Math.sin(a) * 3.8, 0.021, Math.cos(a) * 3.8); scene.add(m); padBars.push({ mat, a });
}
const shockMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.95, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const shock = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 160), shockMat); shock.rotation.x = -Math.PI / 2; shock.position.y = 0.05; scene.add(shock);

// hangar shell, pillars with light strips, roof hatch
const shellMat = new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.6, roughness: 0.6, side: THREE.DoubleSide });
const HX = 17, HY = 24, HZ0 = -50, HZ1 = 30;
function wall(w, h, pos, ry) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shellMat); m.position.copy(pos); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; }
wall(HZ1 - HZ0, HY, V(-HX, HY / 2, (HZ0 + HZ1) / 2), Math.PI / 2);
wall(HZ1 - HZ0, HY, V(HX, HY / 2, (HZ0 + HZ1) / 2), Math.PI / 2);
wall(HX * 2, HY, V(0, HY / 2, HZ0), 0);
wall(HX * 2, HY, V(0, HY / 2, HZ1), 0);
for (const [z0, z1] of [[HZ0, -15], [15, HZ1]]) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(HX * 2, 0.6, z1 - z0), shellMat); r.position.set(0, HY, (z0 + z1) / 2); scene.add(r);
}
const hatches = [-1, 1].map(s => { const h = new THREE.Mesh(new THREE.BoxGeometry(HX, 0.6, 30), shellMat); h.position.set(s * HX / 2, HY, 0); scene.add(h); return { h, s }; });
const hatchStrips = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 30), new THREE.MeshBasicMaterial({ color: MAGENTA.clone() })); scene.add(m); return { m, s }; });
const pillars = [];
for (let z = HZ0 + 4; z < HZ1; z += 7) for (const s of [-1, 1]) {
  const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, HY, 1.4), M.dark); pl.position.set(s * (HX - 1.0), HY / 2, z); pl.castShadow = false; pl.receiveShadow = true; scene.add(pl);
  const c = ((z / 7) | 0) % 2 ? CYAN : MAGENTA;
  const mat = new THREE.MeshBasicMaterial({ color: c.clone() });
  const ls = new THREE.Mesh(new THREE.BoxGeometry(0.12, HY - 4, 0.12), mat); ls.position.set(s * (HX - 1.75), HY / 2, z); scene.add(ls);
  pillars.push({ mat, z, c: c.clone() });
}
// light beams from ceiling
const beamMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uI: { value: 0 } },
  vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY=uv.y; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying float vY; varying vec3 vN; varying vec3 vV; uniform float uI; void main(){ float f=pow(abs(dot(vN,vV)),1.5); gl_FragColor=vec4(vec3(.55,.8,1.)*uI*f*pow(vY,1.6)*.12,1.); }`,
});
for (const [x, z, rx, rz] of [[-7, -6, 0.25, -0.35], [7, -6, 0.25, 0.35], [-6, 8, -0.3, -0.3], [6, 8, -0.3, 0.3]]) {
  const b = new THREE.Mesh(cyl(0.6, 4.2, 22, 32, true), beamMat); b.position.set(x * 0.55, 12.5, z * 0.55); b.rotation.set(rx, 0, rz); scene.add(b);
}
// sky dome + stars + moon + city (seen after the roof opens and in the exterior shot)
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, fog: false, depthWrite: false,
  vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec3 vD; void main(){ float h=clamp(vD.y,0.,1.); vec3 c=mix(vec3(.05,.03,.12),vec3(.004,.006,.02),pow(h,.45)); c+=vec3(.2,.05,.25)*exp(-h*14.)*.6; gl_FragColor=vec4(c,1.); }`,
}));
scene.add(sky);
{
  const r = rng(7), n = 3000, pos = new Float32Array(n * 3), sz = new Float32Array(n), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05, rr = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * rr * 1400, y * 1400, Math.sin(a) * rr * 1400], i * 3); sz[i] = 1 + Math.pow(r(), 6) * 6; ph[i] = r() * 100;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('size', new THREE.BufferAttribute(sz, 1)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  var starMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uT: { value: 0 } },
    vertexShader: `attribute float size; attribute float ph; uniform float uT; varying float vA; void main(){ vA=.6+.4*sin(uT*3.+ph); gl_PointSize=size; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vec3(.85,.9,1.)*vA*smoothstep(.5,0.,d)*1.4,1.); }` });
  scene.add(new THREE.Points(g, starMat));
  const moon = new THREE.Mesh(sphere(38), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.92, 1.0), fog: false })); moon.position.set(-900, 620, -500); scene.add(moon);
}
function windowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const r = rng(11);
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 32; j++) for (let i = 0; i < 16; i++) if (r() < 0.35) {
    x.fillStyle = r() < 0.7 ? `rgba(255,${190 + r() * 50 | 0},${120 + r() * 60 | 0},${0.5 + r() * 0.5})` : `rgba(120,220,255,${0.5 + r() * 0.5})`;
    x.fillRect(i * 16 + 4, j * 8 + 2, 8, 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
{
  const r = rng(23), n = 1100;
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b0d13, metalness: 0.5, roughness: 0.7, emissive: 0xffffff, emissiveMap: windowTexture(), emissiveIntensity: 1.4 });
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n); const m4 = new THREE.Matrix4(); let k = 0;
  while (k < n) {
    const a = r() * Math.PI * 2, d = 42 + Math.pow(r(), 0.7) * 420; const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const w = 6 + r() * 14, h = 6 + Math.pow(r(), 2.2) * 70, dd = 6 + r() * 14;
    m4.compose(V(x, h / 2, z), new THREE.Quaternion(), V(w, h, dd)); city.setMatrixAt(k++, m4);
  }
  scene.add(city);
}
// exterior light pillar over the opened hatch
const pillarLightMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0 } },
  vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY=uv.y; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying float vY; varying vec3 vN; varying vec3 vV; uniform float uI; void main(){ float f=pow(abs(dot(vN,vV)),2.); gl_FragColor=vec4(vec3(.35,.85,1.)*uI*f*pow(1.-vY,2.)*.5,1.); }` });
const lightPillar = new THREE.Mesh(cyl(7, 6, 160, 48, true), pillarLightMat); lightPillar.position.set(0, HY + 80, 0); scene.add(lightPillar);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x3a4a7a, 0x05060a, 0.6); scene.add(hemi);
const key = new THREE.SpotLight(0xdfe8ff, 0, 60, 0.55, 0.6, 1.2); key.position.set(9, 19, 11); key.target.position.set(0, 3, 0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.camera.near = 5; key.shadow.camera.far = 60; scene.add(key, key.target);
const work = new THREE.SpotLight(0xffc98a, 0, 40, 0.7, 0.8, 1.2); work.position.set(-8, 14, 6); work.target.position.set(0, 2, 0); scene.add(work, work.target);
const rimC = new THREE.PointLight(CYAN, 0, 30, 1.6); rimC.position.set(-6, 6, -6); scene.add(rimC);
const rimM = new THREE.PointLight(MAGENTA, 0, 30, 1.6); rimM.position.set(6, 5, -5); scene.add(rimM);
const coreLight = new THREE.PointLight(CYAN, 0, 8, 2); scene.add(coreLight);
const thrustLight = new THREE.PointLight(new THREE.Color(0.6, 0.85, 1.0), 0, 40, 1.4); scene.add(thrustLight);
const holoLight = new THREE.PointLight(CYAN, 0, 14, 1.5); holoLight.position.set(0, 3, 2); scene.add(holoLight);

// ---------- thrusters ----------
const flameMat = (core) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  uniforms: { uT: { value: 0 }, uI: { value: 0 }, uCore: { value: core } },
  vertexShader: `varying float vA; varying vec3 vN; varying vec3 vV; varying float vAng; void main(){ vA=1.-uv.y; vAng=uv.x; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying float vA; varying vec3 vN; varying vec3 vV; varying float vAng; uniform float uT,uI,uCore;
    void main(){ float edge=pow(abs(dot(vN,vV)),1.2); float fl=.75+.25*sin(uT*90.+vA*30.+vAng*40.)*sin(uT*47.+vA*12.);
      float diam=.6+.4*pow(abs(sin(vA*18.-uT*40.)),6.);
      float a=pow(1.-vA,mix(1.6,.8,uCore))*edge*fl*diam;
      vec3 c=mix(vec3(1.,1.,1.),mix(vec3(.3,.85,1.),vec3(.7,.35,1.),smoothstep(.3,1.,vA)),smoothstep(0.,.45+uCore*.3,vA));
      gl_FragColor=vec4(c*a*uI*(uCore>.5?2.2:1.2),1.); }`,
});
const flames = [];
function addFlame(parent, localPos, radius, len) {
  for (const core of [0, 1]) {
    const geo = cyl(radius * (core ? 0.55 : 1.0), radius * (core ? 0.15 : 0.35), 1, 32, true); geo.translate(0, -0.5, 0);
    const m = new THREE.Mesh(geo, flameMat(core)); m.position.copy(localPos); parent.add(m); flames.push({ m, len: len * (core ? 0.6 : 1) });
  }
}
for (const n of nozzles) addFlame(parts.backpack.group, n.clone().sub(parts.backpack.group.userData.origin), 0.24, 3.2);
for (const k of ['L', 'R']) addFlame(parts['foot' + k].group, V(0, -0.4, -0.18), 0.14, 1.2);

// ---------- particles ----------
function softSprite() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
const sprite = softSprite();
// sparks (streaks) per lock event
const SPK = 70, sparkR = rng(3), sparks = [];
for (const p of partList) for (let i = 0; i < SPK; i++) {
  const th = sparkR() * Math.PI * 2, ph = sparkR() * Math.PI * 0.55, sp = 2.5 + sparkR() * 6;
  sparks.push({ t0: p.lock, o: p.lockWorld, v: V(Math.cos(th) * Math.sin(ph) * sp, Math.cos(ph) * sp * 0.9 + 1, Math.sin(th) * Math.sin(ph) * sp), life: 0.35 + sparkR() * 0.5 });
}
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparks.length * 6), 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sparks.length * 6), 3));
scene.add(new THREE.LineSegments(sparkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
// smoke / dust
const SM = 750, smR = rng(5), smoke = [];
for (let i = 0; i < SM; i++) { const a = smR() * Math.PI * 2; smoke.push({ t0: TL.ignition + 0.2 + smR() * 4.6, a, sp: 3 + smR() * 6, up: 0.4 + smR() * 1.6, s0: 0.8 + smR() * 1.5, life: 2.2 + smR() * 2.2, j: smR() }); }
const smokeGeo = new THREE.BufferGeometry();
smokeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SM * 3), 3));
smokeGeo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(SM), 1));
smokeGeo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(SM), 1));
const smokeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uMap: { value: sprite }, uGlow: { value: 0 } },
  vertexShader: `attribute float size; attribute float alpha; varying float vA; varying float vH; void main(){ vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.); vH=position.y; gl_PointSize=min(size*900./-mv.z, 260.); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D uMap; uniform float uGlow; varying float vA; varying float vH; void main(){ vec4 s=texture2D(uMap,gl_PointCoord); vec3 c=mix(vec3(.16,.17,.2),vec3(.45,.7,1.),uGlow*exp(-vH*.5)*.5); gl_FragColor=vec4(c,s.a*vA*.3); }` });
const smokePts = new THREE.Points(smokeGeo, smokeMat); smokePts.frustumCulled = false; scene.add(smokePts);
// exhaust ribbons (trail)
const TRN = 120, trails = [];
for (let i = 0; i < 2; i++) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRN * 2 * 3), 3));
  const uv = new Float32Array(TRN * 2 * 2); for (let k = 0; k < TRN; k++) { uv.set([k / (TRN - 1), 0, k / (TRN - 1), 1], k * 4); } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const idx = []; for (let k = 0; k < TRN - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uI: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uI; void main(){ float a=pow(1.-vUv.x,2.2)*smoothstep(0.,.5,vUv.y)*smoothstep(1.,.5,vUv.y); vec3 c=mix(vec3(1.,1.,1.),mix(vec3(.3,.85,1.),vec3(.8,.3,1.),vUv.x),smoothstep(0.,.12,vUv.x)); gl_FragColor=vec4(c*a*uI*1.8,1.); }` });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m); trails.push({ g, mat });
}

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.45, 1.15); composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uFade: { value: 1 }, uFlash: { value: 0 }, uAb: { value: 0.0012 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT,uFade,uFlash,uAb; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 d=vUv-.5; float r=dot(d,d);
      vec3 c; c.r=texture2D(tDiffuse,vUv+d*uAb*3.).r; c.g=texture2D(tDiffuse,vUv).g; c.b=texture2D(tDiffuse,vUv-d*uAb*3.).b;
      c*=1.-r*1.05; c+=(h(vUv*vec2(1920.,1080.)+fract(uT*7.)*100.)-.5)*.035;
      c+=vec3(.85,.95,1.)*uFlash; c*=1.-uFade; gl_FragColor=vec4(c,1.); }`,
}); composer.addPass(grade);
composer.addPass(new OutputPass());

// ---------- animation ----------
const crouchA = t => sstep(TL.crouch[0], TL.crouch[1], t) * (1 - sstep(TL.liftoff - 0.05, TL.liftoff + 0.35, t)) * 0.5;
function mechPos(t) {
  const tl = Math.max(0, t - TL.liftoff);
  const y = 2.6 * tl * tl + 1.0 * tl;
  const d = Math.max(0, tl - 3.0);
  return V(0.7 * d * d, y, -1.4 * d * d);
}
const hudTL = document.getElementById('hudTL'), hudSub = document.getElementById('hudSub'), barFill = document.getElementById('barFill');
const lockMsg = document.getElementById('lockMsg'), hudBR = document.getElementById('hudBR'), title = document.getElementById('title');
const camTarget = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

function cameraAt(t) {
  const shakeAmt = sstep(TL.ignition, TL.ignition + 1.2, t) * 0.05 + (t > TL.liftoff ? Math.exp(-(t - TL.liftoff) * 0.9) * 0.22 : 0);
  let pos, tgt, fov = 38;
  if (t < 3.2) { const k = easeInOut(clamp(t / 3.2)); pos = V(lerp(7.8, 5.6, k), lerp(2.0, 2.8, k), lerp(13.0, 10.2, k)); tgt = V(0, lerp(2.6, 3.1, k), 0); }
  else if (t < 7.0) { const k = easeInOut((t - 3.2) / 3.8); const a = lerp(0.65, -0.55, k), r = lerp(7.6, 7.0, k); pos = V(Math.sin(a) * r, lerp(1.4, 2.6, k), Math.cos(a) * r); tgt = V(0, lerp(1.5, 2.9, k), 0); }
  else if (t < 11.4) { const k = easeInOut((t - 7.0) / 4.4); const a = lerp(-0.55, -2.35, Math.min(1, k * 1.6)) * (1 - sstep(0.55, 1, k)) + lerp(-2.35, 0.55, sstep(0.55, 1, k)) * sstep(0.55, 1, k); const r = lerp(7.0, 9.2, k); pos = V(Math.sin(a) * r, lerp(2.6, 5.0, k), Math.cos(a) * r); tgt = V(0, lerp(2.9, 4.5, k), 0); }
  else if (t < 13.9) { const k = easeInOut((t - 11.4) / 2.5); pos = V(lerp(5.0, 0.35, k), lerp(5.0, 5.95, k), lerp(8.3, 2.7, k)); tgt = V(0, lerp(4.5, 5.84, k), lerp(0, 0.3, k)); fov = lerp(36, 30, k); }
  else if (t < 14.8) { const k = easeInOut((t - 13.9) / 0.9); pos = V(lerp(0.35, 0.4, k), lerp(5.95, 1.25, k), lerp(2.7, 13.6, k)); tgt = V(0, lerp(5.84, 3.5, k), lerp(0.3, 0, k)); fov = lerp(30, 42, k); }
  else if (t < TL.liftoff) { const k = (t - 14.8) / (TL.liftoff - 14.8); pos = V(lerp(0.4, 1.6, k), lerp(1.25, 0.95, k), lerp(13.6, 12.2, k)); tgt = V(0, lerp(3.5, 3.1, k), 0); fov = 42; }
  else if (t < TL.cut) { const k = (t - TL.liftoff) / (TL.cut - TL.liftoff); pos = V(1.6, 0.95, 12.2); const mp = mechPos(t); tgt = V(mp.x * 0.5, Math.min(mp.y * 0.92 + 3.1, 40), mp.z * 0.5); fov = lerp(42, 62, easeInOut(k)); }
  else { const k = (t - TL.cut) / (TL.duration - TL.cut); pos = V(lerp(36, 31, k), lerp(27, 33, k), lerp(50, 45, k)); const mp = mechPos(t); const near = V(mp.x, mp.y + 3, mp.z); const far = V(18, 120, -60);
    tgt = near.lerp(far, sstep(0.35, 1.0, k) * 0.6); fov = lerp(44, 50, k); }
  if (shakeAmt > 0) pos.add(V(noise1(t * 9, 1.3), noise1(t * 11, 4.1), noise1(t * 8, 7.7)).multiplyScalar(shakeAmt));
  return { pos, tgt, fov };
}

function renderAt(t) {
  // camera
  const c = cameraAt(t); camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.tgt);
  const ext = t >= TL.cut;
  scene.fog.density = ext ? 0.0045 : lerp(0.022, 0.012, sstep(TL.hatch[0], TL.cut, t));

  // mech placement: crouch + flight
  const a = crouchA(t), drop = (1.35 + 1.45) * (1 - Math.cos(a));
  const mp = mechPos(t); mechRoot.position.copy(mp);
  mechRoot.rotation.x = -0.22 * sstep(TL.liftoff + 2.5, TL.liftoff + 5.0, t);
  body.position.y = -drop;
  for (const k of ['L', 'R']) { joints['hip' + k].rotation.x = -a; joints['knee' + k].rotation.x = 2 * a; joints['ankle' + k].rotation.x = -a; }
  upper.rotation.x = a * 0.25 + 0.04 * Math.sin(t * 1.3) * sstep(TL.powerup[1], TL.powerup[1] + 1, t) * (1 - sstep(TL.crouch[0], TL.crouch[1], t));

  // parts fly in
  let locked = 0, current = null;
  for (const p of partList) {
    const k = clamp((t - p.t0) / p.dur);
    p.group.visible = t >= p.t0;
    const e = easeOutBack(k), er = easeOutCubic(k);
    p.group.position.copy(p.offset).multiplyScalar(1 - e);
    p.group.rotation.set(p.spin.x * (1 - er), p.spin.y * (1 - er), p.spin.z * (1 - er));
    const since = t - p.lock; const flash = since >= 0 ? Math.exp(-since * 7) : (k > 0 ? 0.15 * k : 0);
    for (const key of ['white', 'dark', 'indigo', 'steel']) { p.mats[key].emissive.setRGB(0.5, 0.9, 1.0); p.mats[key].emissiveIntensity = flash * 0.9; }
    p.ghostMat.opacity = (since >= 0 ? Math.max(0, 1 - since * 2.5) : 1) * sstep(TL.blueprint[0], TL.blueprint[0] + 1.2, t) * (0.55 + 0.25 * Math.sin(t * 23 + p.t0 * 7) * (t < TL.blueprint[1] ? 1 : 0.3));
    if (since >= 0) locked++; if (k > 0 && k < 1) current = p;
    if (since >= 0 && since < 0.9) current = { label: p.label + ' — LOCKED', locked: true, since };
  }
  clipPlane.constant = lerp(0, 7.0, easeInOut(clamp((t - TL.blueprint[0]) / 2.2)));
  holoLight.intensity = 3 * sstep(TL.blueprint[0], 1.2, t) * (1 - sstep(9, 11.5, t));

  // power-up strips
  const pw0 = TL.powerup[0], pw1 = TL.powerup[1];
  for (const s of strips) {
    const p = parts[s.part]; const since = t - p.lock;
    const on = sstep(pw0 + s.y / 6.4 * (pw1 - pw0 - 0.6), pw0 + s.y / 6.4 * (pw1 - pw0 - 0.6) + 0.3, t);
    const flick = on > 0 && on < 1 ? (Math.sin(t * 120 + s.y * 40) > 0 ? 1 : 0.25) : 1;
    let I = (t >= p.t0 ? 0.25 : 0) + (since >= 0 ? Math.exp(-since * 5) * 3 : 0) + on * 2.4 * flick;
    if (s === visorStrip) I = (t >= p.t0 ? 0.2 : 0) + sstep(TL.visor, TL.visor + 0.12, t) * (2.0 + 1.6 * Math.exp(-(t - TL.visor) * 4));
    s.mat.color.copy(s.color).multiplyScalar(I);
  }
  const corePulse = sstep(pw0, pw0 + 1.2, t) * (1 + 0.35 * Math.sin(t * 9)) + (t > TL.ignition ? 0.8 : 0);
  reactorCore.material.color.setRGB(0.75, 0.97, 1.0).multiplyScalar(0.3 + corePulse * 2.4);
  reactorRing.material.color.copy(CYAN).multiplyScalar(0.3 + corePulse * 2.0);
  reactorCore.updateWorldMatrix(true, false); coreLight.position.setFromMatrixPosition(reactorCore.matrixWorld); coreLight.intensity = corePulse * 1.5;

  // lights
  const assemblyLight = sstep(2.6, 4.0, t);
  work.intensity = 70 * assemblyLight * (1 - sstep(pw0, pw0 + 1, t) * 0.6);
  key.intensity = 25 * assemblyLight + 60 * sstep(pw0 + 0.4, pw1 - 0.2, t);
  rimC.intensity = 8 + 45 * sstep(pw0, pw1, t); rimM.intensity = 6 + 40 * sstep(pw0 + 0.3, pw1, t);
  hemi.intensity = 0.25 + 0.35 * sstep(pw0, pw1, t) + (ext ? 0.6 : 0);
  gridMat.uniforms.uPower.value = 0.3 * sstep(0.2, 1.5, t) + 0.7 * sstep(pw0, pw1, t);
  gridMat.uniforms.uScan.value = t < 3.2 ? sstep(0.2, 0.8, t) * (1 - sstep(2.6, 3.2, t)) : 0;
  gridMat.uniforms.uScan.value = t < 3.2 ? clamp(t / 2.6) : 0;
  const sw = t - TL.shockwave; gridMat.uniforms.uWave.value = sw > 0 && sw < 2.5 ? sw * 16 : -1;
  shock.scale.setScalar(Math.max(0.01, sw > 0 ? 3 + sw * 22 : 0.01)); shockMat.opacity = sw > 0 ? Math.max(0, 1 - sw / 1.4) : 0; shockMat.color.setRGB(0.5, 0.95, 1.0).multiplyScalar(2.5);
  for (const r of padRings) { r.mat.color.copy(r.c).multiplyScalar(0.25 + 2.2 * sstep(pw0, pw1, t) + (t > TL.ignition ? 1.0 + 0.6 * Math.sin(t * 30) : 0)); }
  for (const b of padBars) { const ph = (b.a / (Math.PI * 2)); const on = sstep(pw0 + ph * 1.2, pw0 + ph * 1.2 + 0.15, t); const chase = t > TL.ignition ? 0.5 + 0.5 * Math.sin(t * 14 - b.a * 2) : 1; b.mat.color.copy(CYAN).multiplyScalar(0.15 + on * 2.2 * chase); }
  for (const p of pillars) { const on = sstep(pw0 + (HZ1 - p.z) / 80 * 1.8, pw0 + (HZ1 - p.z) / 80 * 1.8 + 0.12, t); p.mat.color.copy(p.c).multiplyScalar(0.05 + on * 1.3); }
  beamMat.uniforms.uI.value = 0.3 * assemblyLight + 0.35 * sstep(pw0, pw1, t);
  const hk = easeInOut(clamp((t - TL.hatch[0]) / (TL.hatch[1] - TL.hatch[0])));
  for (const h of hatches) h.h.position.x = h.s * (HX / 2 + hk * (HX + 1));
  for (const h of hatchStrips) { h.m.position.set(h.s * (hk * (HX + 1) + 0.1), HY - 0.35, 0); h.m.material.color.copy(MAGENTA).multiplyScalar(t > TL.hatch[0] && t < TL.hatch[1] + 1 ? 3 * (0.5 + 0.5 * Math.sign(Math.sin(t * 12))) : 0.3); }
  pillarLightMat.uniforms.uI.value = ext ? 0.16 : 0.05 * hk;
  starMat.uniforms.uT.value = t;

  // thrusters
  const ign = sstep(TL.ignition, TL.ignition + 0.25, t), boost = sstep(TL.liftoff - 0.3, TL.liftoff + 0.4, t);
  for (const f of flames) {
    f.m.visible = ign > 0; f.m.material.uniforms.uT.value = t; f.m.material.uniforms.uI.value = ign * (0.7 + 0.5 * boost);
    f.m.scale.set(1 + boost * 0.35, f.len * (0.35 + 0.65 * ign + 1.3 * boost) * (1 + 0.06 * Math.sin(t * 70)), 1 + boost * 0.35);
  }
  parts.backpack.group.localToWorld(tmp.copy(nozzles[0]).sub(parts.backpack.group.userData.origin));
  thrustLight.position.copy(tmp).add(V(0.38, -2.2, -0.4)); thrustLight.intensity = ign * (10 + 18 * boost) * (0.85 + 0.15 * Math.sin(t * 60));
  smokeMat.uniforms.uGlow.value = ign * (0.6 + 0.4 * boost);

  // sparks
  const sp = sparkGeo.attributes.position.array, sc = sparkGeo.attributes.color.array;
  sparks.forEach((s, i) => {
    const age = t - s.t0; const alive = age > 0 && age < s.life;
    if (!alive) { sp.fill(0, i * 6, i * 6 + 6); sc.fill(0, i * 6, i * 6 + 6); return; }
    const g = -9.8, px = s.o.x + s.v.x * age, py = Math.max(0.02, s.o.y + s.v.y * age + 0.5 * g * age * age), pz = s.o.z + s.v.z * age;
    const vy = s.v.y + g * age, dt = 0.035;
    sp.set([px, py, pz, px - s.v.x * dt, py - vy * dt, pz - s.v.z * dt], i * 6);
    const k = 1 - age / s.life, I = k * k * 4;
    sc.set([1.0 * I, 0.75 * I, 0.45 * I, 0.6 * I, 0.25 * I, 0.1 * I], i * 6);
  });
  sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;

  // smoke
  const smp = smokeGeo.attributes.position.array, sms = smokeGeo.attributes.size.array, sma = smokeGeo.attributes.alpha.array;
  smoke.forEach((s, i) => {
    const age = t - s.t0; if (age < 0 || age > s.life) { sma[i] = 0; smp.set([0, -50, 0], i * 3); return; }
    const kd = 1.4, r = 0.6 + s.sp * (1 - Math.exp(-kd * age)) / kd;
    smp.set([Math.cos(s.a) * r, 0.25 + s.up * age * (0.6 + s.j), Math.sin(s.a) * r], i * 3);
    sms[i] = s.s0 + age * 1.6; sma[i] = Math.min(1, age * 4) * (1 - age / s.life);
  });
  smokeGeo.attributes.position.needsUpdate = true; smokeGeo.attributes.size.needsUpdate = true; smokeGeo.attributes.alpha.needsUpdate = true;

  // exhaust trails: sample past nozzle positions (mech only translates + slight pitch, so use mechPos history)
  const trailOn = t > TL.liftoff - 0.1;
  trails.forEach((tr, i) => {
    tr.mat.uniforms.uI.value = trailOn ? (ext ? 0.7 : 0.35) : 0;
    const arr = tr.g.attributes.position.array; const nz = nozzles[i];
    const span = ext ? 3.2 : 1.6;
    for (let k = 0; k < TRN; k++) {
      const tk = Math.max(TL.liftoff - 0.1, t - (k / (TRN - 1)) * span);
      const base = mechPos(tk); const pt = V(base.x + nz.x, base.y + nz.y - 0.3 - (t - tk) * 4, base.z + nz.z);
      const dir = V(0, 1, 0); tmp2.copy(camera.position).sub(pt).normalize(); const side = dir.clone().cross(tmp2).normalize();
      const w = (ext ? 0.45 : 0.18) + (t - tk) * (ext ? 1.1 : 0.6);
      arr.set([pt.x - side.x * w, pt.y - side.y * w, pt.z - side.z * w, pt.x + side.x * w, pt.y + side.y * w, pt.z + side.z * w], k * 6);
    }
    tr.g.attributes.position.needsUpdate = true;
  });

  // post + overlays
  grade.uniforms.uT.value = t;
  let fade = 1 - sstep(0.0, 0.9, t);
  fade = Math.max(fade, sstep(TL.fadeout[0], TL.fadeout[1], t));
  grade.uniforms.uFade.value = fade;
  const lf = t - TL.liftoff, cf = t - TL.cut, sf = t - TL.shockwave;
  grade.uniforms.uFlash.value = (lf > 0 ? Math.exp(-lf * 10) * 0.45 : 0) + (cf > 0 ? Math.exp(-cf * 14) * 0.6 : 0) + (sf > 0 ? Math.exp(-sf * 10) * 0.25 : 0);
  grade.uniforms.uAb.value = 0.0012 + (lf > 0 ? Math.exp(-lf * 2) * 0.004 : 0);
  bloom.strength = (0.85 + 0.3 * sstep(pw0, pw1, t)) * (1 - 0.5 * sstep(12.2, 12.9, t) * (1 - sstep(13.95, 14.4, t))) + (lf > 0 ? 0.3 * Math.exp(-lf * 1.5) : 0);

  // HUD
  const hudOn = sstep(0.6, 1.2, t) * (1 - sstep(TL.title - 0.6, TL.title, t));
  hudTL.style.opacity = hudOn; hudBR.style.opacity = hudOn;
  let sub;
  if (t < TL.parts[0].t0) sub = 'BLUEPRINT SCAN ' + String(Math.round(clamp(t / 3) * 100)).padStart(3, '0') + '%';
  else if (t < pw0) sub = `MODULES ${String(locked).padStart(2, '0')} / ${partList.length}`;
  else if (t < TL.ignition) sub = 'REACTOR ONLINE ' + String(Math.round(sstep(pw0, pw1 + 0.4, t) * 100)).padStart(3, '0') + '%';
  else if (t < TL.liftoff) sub = 'IGNITION — HOLD';
  else sub = 'LAUNCH';
  hudSub.textContent = sub;
  barFill.style.width = (t < pw0 ? locked / partList.length : t < TL.ignition ? sstep(pw0, pw1 + 0.4, t) : 1) * 100 + '%';
  if (current && current.locked) { lockMsg.textContent = current.label; lockMsg.style.opacity = 1 - sstep(0.5, 0.9, current.since); }
  else if (current) { lockMsg.textContent = current.label + ' ▸ DOCKING'; lockMsg.style.opacity = 0.75; }
  else if (t > TL.ignition && t < TL.liftoff) { lockMsg.textContent = 'T-' + Math.max(0, TL.liftoff - t).toFixed(2); lockMsg.style.opacity = 1; }
  else lockMsg.style.opacity = 0;
  if (t > TL.liftoff) { const alt = Math.round(mp.y * 1.0); hudBR.innerHTML = `ALT ${String(alt).padStart(4, '0')} M<br>V/S ${String(Math.round(5.2 * (t - TL.liftoff) + 1)).padStart(3, '0')} M/S<br>THRUST ${Math.round(100 + 12 * boost)}%`; }
  else if (t > pw0) hudBR.innerHTML = `CORE ${(sstep(pw0, pw1, t) * 2.4).toFixed(2)} GW<br>SERVO SYNC OK<br>PAD 01 // HANGAR 7`;
  else hudBR.innerHTML = `PAD 01 // HANGAR 7<br>${new Date(Date.UTC(2026, 10, 20, 23, 41, Math.floor(t))).toISOString().slice(11, 19)} UTC`;
  title.style.opacity = sstep(TL.title, TL.title + 1.0, t);
  title.style.transform = `translateY(${(1 - easeOutCubic(clamp((t - TL.title) / 1.4))) * 30}px)`;
  title.style.letterSpacing = '0';

  composer.render();
}

window.renderAt = renderAt;
window.TL = TL;
window.ready = true;
const q = new URLSearchParams(location.search);
if (q.has('t')) renderAt(parseFloat(q.get('t')));
else if (!q.has('capture')) {
  // live playback: loops silently; the sound button restarts from 0 with the soundtrack as the clock
  const audio = document.getElementById('snd'), btn = document.getElementById('soundBtn');
  let t0 = performance.now();
  if (btn && audio) btn.onclick = () => { audio.loop = true; audio.currentTime = 0; audio.play(); t0 = performance.now(); btn.remove(); };
  const loop = () => { const t = audio && !audio.paused ? audio.currentTime % TL.duration : ((performance.now() - t0) / 1000) % TL.duration; renderAt(t); requestAnimationFrame(loop); };
  loop();
}
