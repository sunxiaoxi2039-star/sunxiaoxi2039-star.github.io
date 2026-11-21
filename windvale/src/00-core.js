import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ *
 *  风眠镇 Windvale — everything below is generated from code:
 *  geometry, textures, shaders. No external models or images.
 * ------------------------------------------------------------------ */

const PARAMS = new URLSearchParams(location.search);
const STILL = PARAMS.has('still');            // freeze time (for screenshots)
const DEBUG = PARAMS.get('debug') || '';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (hex) => new THREE.Color(hex);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

/* ---------- seeded random ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(20261121);
const R = (a = 0, b = 1) => a + (b - a) * rand();
const RI = (a, b) => Math.floor(R(a, b + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const seed = (s) => { rand = mulberry32(s); };

/* ---------- value noise (JS, used for terrain + textures) ---------- */
const PERM = new Uint8Array(512);
(() => { const r = mulberry32(7); const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
const hash2 = (x, y) => PERM[(PERM[x & 255] + y) & 255] / 255;
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, oct = 5, lac = 2.0, gain = 0.5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= gain; f *= lac; }
  return s / n;
}
function ridged(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(vnoise(x * f + i * 31.7, y * f + i * 11.3) * 2 - 1); s += a * v * v; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
/* tileable value noise for textures: lattice wraps every `p` cells */
function tnoise(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const w = (i) => ((i % p) + p) % p;
  const a = hash2(w(xi), w(yi)), b = hash2(w(xi + 1), w(yi)), c = hash2(w(xi), w(yi + 1)), d = hash2(w(xi + 1), w(yi + 1));
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function tfbm(x, y, p, oct = 4) { // x,y in [0,p)
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * tnoise(x * f + i * 13, y * f + i * 7, p * f); n += a; a *= 0.5; f *= 2; }
  return s / n;
}

/* ---------- geometry helpers (metric UVs: 1 uv unit == 1 metre) ---------- */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function T(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}
function boxM(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
  return g;
}
function cylM(rt, rb, h, seg = 16, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  const uv = g.attributes.uv; const circ = Math.PI * (rt + rb);
  const sideCount = (seg + 1) * 2;
  for (let i = 0; i < uv.count; i++) {
    if (i < sideCount) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
    else uv.setXY(i, (uv.getX(i) - 0.5) * 2 * Math.max(rt, rb), (uv.getY(i) - 0.5) * 2 * Math.max(rt, rb));
  }
  return g;
}
function scaleUV(g, su, sv = su) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }

/* tapered tube along a curve; radius(t) */
function taperTube(curve, segs, radial, radius, uvLen = 1) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], uv = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  let len = 0, prev = curve.getPointAt(0);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; curve.getPointAt(t, P); len += P.distanceTo(prev); prev = P.clone();
    const r = radius(t);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * TAU, s = Math.sin(a), c = -Math.cos(a);
      N.set(0, 0, 0).addScaledVector(frames.normals[i], c).addScaledVector(frames.binormals[i], s).normalize();
      pos.push(P.x + r * N.x, P.y + r * N.y, P.z + r * N.z); nor.push(N.x, N.y, N.z);
      uv.push(j / radial * r * TAU, len / uvLen);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); return g;
}

/* parametric surface P(u,v) -> geometry, with optional thickness (solid slab) */
function surfaceGeo(nu, nv, fn, uvfn) {
  const pos = [], uv = [], idx = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    fn(i / nu, j / nv, p); pos.push(p.x, p.y, p.z);
    const t = uvfn ? uvfn(i / nu, j / nv) : [i / nu, j / nv]; uv.push(t[0], t[1]);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

/* ---------- Batch: collects parts per material, merges into few draw calls ---------- */
class Batch {
  constructor() { this.parts = new Map(); this.stack = [new THREE.Matrix4()]; }
  get top() { return this.stack[this.stack.length - 1]; }
  push(m) { this.stack.push(this.top.clone().multiply(m)); return this; }
  pop() { this.stack.pop(); return this; }
  add(key, geo, color, m) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'aWind'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.aWind) g.setAttribute('aWind', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    if (!g.attributes.color) {
      const c = color === undefined ? WHITE : (color.isColor ? color : C(color));
      const arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
    }
    const M = m ? this.top.clone().multiply(m) : this.top;
    g.applyMatrix4(M);
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g);
    return g;
  }
  build(mats, opts = {}) {
    const group = new THREE.Group();
    for (const [key, list] of this.parts) {
      const mat = mats[key]; if (!mat) { console.warn('no material', key); continue; }
      const geo = mergeGeometries(list, false); list.length = 0;
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = opts.cast !== undefined ? opts.cast : !(mat.userData.noCast);
      mesh.receiveShadow = opts.receive !== undefined ? opts.receive : true;
      mesh.name = key; group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}
const WHITE = new THREE.Color(1, 1, 1);
/* palette colour with slight random jitter in HSL */
function jitter(hex, h = 0.02, s = 0.06, l = 0.06) {
  const c = C(hex); const hsl = {}; c.getHSL(hsl);
  return new THREE.Color().setHSL((hsl.h + R(-h, h) + 1) % 1, clamp(hsl.s + R(-s, s), 0, 1), clamp(hsl.l + R(-l, l), 0, 1));
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const loadFill = document.getElementById('loadfill');
const loadMsg = document.getElementById('loadmsg');
async function stage(pct, msg) { loadFill.style.width = pct + '%'; if (msg) loadMsg.textContent = msg; await nextFrame(); }

/* ---------- shared GLSL snippets ---------- */
const GLSL_NOISE = /* glsl */`
float wv_hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float wv_noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(wv_hash(i),wv_hash(i+vec2(1,0)),u.x), mix(wv_hash(i+vec2(0,1)),wv_hash(i+vec2(1,1)),u.x), u.y); }
float wv_fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*wv_noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5;} return s; }
`;
