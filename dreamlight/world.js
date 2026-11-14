/* 小芽与风的种子 · world.js — the painted 3D world (three.js, WebGL2).
 *
 * Near things are real geometry (the hill, grass blades, flowers, trees, the village, the girl);
 * far things are painted once into a backdrop (mountains, heaped clouds). Everything is flat
 * colour in few tones: each thing has a lit colour and a shade colour with a short step between
 * them. People are cel: flat tones and an inked line, left crisp; the rest of the frame is rounded
 * into brush strokes by a small Kuwahara pass.
 *
 * The approach follows the write-up of Patch's "Painted valley" (patch.gg/blendi/painted-valley);
 * all code and art here is this project's own.
 */
import * as THREE from './vendor/three.module.min.js';

const P = window.P;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = (h) => new THREE.Color(h);
THREE.ColorManagement.enabled = false;

// ------------------------------------------------------------------ the land
const VALLEY = [130, -330];
export function heightAt(x, z) {
  const d = Math.hypot(x - VALLEY[0], z - VALLEY[1]);
  let h = 46 * Math.exp(-((x + 10) * (x + 10) + (z - 45) * (z - 45)) / (2 * 85 * 85));                       // the hill the story stands on
  h += 7 * (P.fbm(x / 150 + 3.1, z / 150 - 1.7, 3) - 0.5) * sm(110, 330, d);           // slow rolls, flat on the valley floor
  h += 150 * sm(400, 1150, d) * (0.4 + 1.0 * P.fbm(x / 330 + 9.2, z / 330 + 4.4, 4)); // the valley's rim
  return h;
}
const SUN = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
const PAL = {
  meadow: '#78c64a', meadowLight: '#9ad857', meadowDeep: '#5db148',
  zenith: '#2f86d6', midSky: '#4fa2e2', horizon: '#a9d8f0', haze: '#b4dcee',
};

// ------------------------------------------------------------------ shared GLSL
const COMMON = /* glsl */`
  uniform vec3 uSun; uniform vec3 uHaze; uniform float uHazeK; uniform float uTime;
  uniform vec4 uShadows[8]; uniform vec4 uWalker;
  float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  vec3 hazed(vec3 c, vec3 wp){ float d = distance(wp, cameraPosition); return mix(c, uHaze, (1.0 - exp(-d * uHazeK)) * 0.92); }
  // painted shade on the ground: tree shadows (round, wobbling edge) and the walker's (a clean-edged shape)
  float shadeAt(vec3 wp){
    float s = 0.0;
    for (int i = 0; i < 8; i++) { vec4 q = uShadows[i]; if (q.z <= 0.0) continue; vec2 d = (wp.xz - q.xy) / vec2(q.z, q.w);
      float r = length(d) + (noise3(vec3(wp.xz * 0.6, 3.0)) - 0.5) * 0.3; s = max(s, 1.0 - smoothstep(0.96, 1.0, r)); }
    vec2 dw = (wp.xz - uWalker.xy) / vec2(uWalker.z, uWalker.w); s = max(s, (1.0 - smoothstep(0.94, 1.0, length(dw))) * step(0.001, uWalker.z));
    return s;
  }
`;
const WORLD_VERT = /* glsl */`
  varying vec3 vW; varying vec3 vN; varying vec2 vUv;
  void main(){
    vec4 wp = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      wp = instanceMatrix * wp; n = mat3(instanceMatrix) * n;
    #endif
    wp = modelMatrix * wp; vW = wp.xyz; vN = normalize(mat3(modelMatrix) * n); vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

function makeUniforms(extra) {
  return Object.assign({
    uSun: SHARED.uSun, uHaze: SHARED.uHaze, uHazeK: SHARED.uHazeK, uTime: SHARED.uTime, uShadows: SHARED.uShadows, uWalker: SHARED.uWalker,
  }, extra);
}
const SHARED = {
  uSun: { value: SUN }, uHaze: { value: hex(PAL.haze) }, uHazeK: { value: 0.00048 }, uTime: { value: 0 },
  uShadows: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uWalker: { value: new THREE.Vector4(0, 0, 0, 0) },
};
// flat two-tone paint for solid things (walls, roofs, trunks, conifers)
function toon(lit, shade, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: makeUniforms({ uLit: { value: hex(lit) }, uShade: { value: hex(shade) }, uEdge: { value: o.edge ?? 0.12 }, uWobble: { value: o.wobble ?? 0 }, uMask: { value: o.mask ?? 1 }, uWin: { value: o.windows ? 1 : 0 } }),
    vertexShader: WORLD_VERT, side: o.side ?? THREE.FrontSide,
    fragmentShader: COMMON + /* glsl */`
      uniform vec3 uLit, uShade; uniform float uEdge, uWobble, uMask, uWin; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      void main(){ float l = dot(normalize(vN), uSun) + (noise3(vW * 1.7) - 0.5) * uWobble;
        vec3 c = mix(uShade, uLit, smoothstep(uEdge - 0.015, uEdge + 0.015, l));
        if (uWin > 0.5 && abs(vN.y) < 0.5) { vec2 g = fract(vUv * vec2(3.0, 2.0)), q = abs(g - vec2(0.5, 0.52)); if (q.x < 0.17 && q.y < 0.2 && vUv.y > 0.08) c = mix(vec3(0.33, 0.42, 0.6), vec3(0.24, 0.3, 0.48), step(0.5, g.y)); c = mix(c, c * vec3(0.9, 0.88, 0.94), smoothstep(0.86, 1.0, vUv.y) * 0.6); }
        gl_FragColor = vec4(hazed(c, vW), uMask); }`,
  });
}

// ------------------------------------------------------------------ painted textures (2D canvas)
function groundMap() {
  const S = 2048, cv = P.canvas(S, S), x = cv.getContext('2d'), r = P.rng(77), at = (wx, wz) => [wx + S / 2, wz + S / 2];
  x.fillStyle = PAL.meadow; x.fillRect(0, 0, S, S);
  // the meadow is one slow green: a few broad, soft changes of tone and nothing finer
  x.filter = 'blur(26px)';
  for (let i = 0; i < 260; i++) { const px = r() * S, py = r() * S; x.fillStyle = r() < 0.55 ? 'rgba(160,222,92,0.5)' : 'rgba(84,170,70,0.45)'; x.beginPath(); x.ellipse(px, py, 40 + r() * 120, 18 + r() * 50, r() * 3, 0, TAU); x.fill(); }
  x.filter = 'none';
  // the valley floor: fields, hedges, a road and a river, painted once
  const [vx, vz] = at(VALLEY[0], VALLEY[1]);
  x.save(); x.translate(vx, vz); x.rotate(-0.25);
  const cols = ['#a9d96a', '#dbe07e', '#8dc85c', '#c6d873', '#74b955', '#e6dc8e', '#9fd26a'];
  for (let gy = -150; gy < 150; gy += 34 + r() * 22) for (let gx = -290; gx < 290;) { const w = 40 + r() * 70, h2 = 30 + r() * 26; if (Math.hypot(gx / 300, gy / 160) < 1) { x.fillStyle = cols[(r() * cols.length) | 0]; x.beginPath(); x.moveTo(gx + r() * 4, gy + r() * 4); x.lineTo(gx + w - 3, gy + r() * 5); x.lineTo(gx + w - 3 + r() * 4, gy + h2); x.lineTo(gx + r() * 5, gy + h2 - r() * 4); x.closePath(); x.fill(); x.strokeStyle = 'rgba(52,120,74,0.85)'; x.lineWidth = 2.2; x.stroke(); } gx += w; }
  x.restore();
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = '#8fcbe6'; x.lineWidth = 15; x.beginPath(); x.moveTo(...at(-500, -470)); x.bezierCurveTo(...at(-200, -400), ...at(-40, -500), ...at(140, -440)); x.bezierCurveTo(...at(300, -390), ...at(420, -470), ...at(700, -400)); x.stroke();
  x.strokeStyle = '#c9ecf6'; x.lineWidth = 4; x.stroke();
  x.strokeStyle = '#ece2b6'; x.lineWidth = 5; x.beginPath(); x.moveTo(...at(4, -6)); x.bezierCurveTo(...at(30, -80), ...at(60, -150), ...at(110, -220)); x.bezierCurveTo(...at(130, -236), ...at(150, -244), ...at(178, -246)); x.stroke();
  x.lineWidth = 6; x.beginPath(); x.moveTo(...at(178, -246)); x.bezierCurveTo(...at(300, -270), ...at(430, -260), ...at(640, -300)); x.stroke();
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// far things are painted once: three ranks of mountains and the cloud heaps, on a strip of sky
const BACK = { el0: -5, el1: 58 };
function backdropMap(q = 1) {
  const W = Math.round(8192 * q), H = Math.round(W * (BACK.el1 - BACK.el0) / 360), ppd = W / 360;
  const cv = P.canvas(W, H), x = cv.getContext('2d'), im = x.createImageData(W, H), px = im.data;
  const yOf = (el) => H - (el - BACK.el0) * ppd, xOf = (az) => ((0.75 - az / 360) % 1 + 1) % 1 * W;   // az: degrees right of "ahead" (-z)
  const put = (i, c, a = 255) => { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = a; };
  const rgb = (h) => P.rgb(h);
  // ---- clouds: heaps of blobs, lit by a march toward the sun, then cut into flat tones
  const heaps = [
    // [azimuth, base elevation, width°, height°, seed]
    [-16, 10, 30, 17, 1], [24, 12.5, 25, 14, 2], [-60, 9, 30, 18, 3], [62, 10, 30, 18, 4], [-105, 11, 30, 16, 5], [110, 10, 34, 18, 6], [-150, 12, 30, 16, 7], [160, 10, 30, 16, 8],
    [4, 6.6, 15, 3.6, 9], [-40, 6.2, 18, 4, 10], [45, 7, 14, 3.4, 11], [-82, 6.5, 14, 4, 12], [92, 6.2, 16, 4, 13],
  ];
  const TON = { white: rgb('#ffffff'), light: rgb('#eef2f9'), shade: rgb('#b3c0de'), deep: rgb('#9aabd3'), under: rgb('#a9b4d2') };
  for (const [az, el, wd, ht, seed] of heaps) {
    const R = P.rng(seed * 991), raw = [], Wn = wd * ppd, Hn = ht * ppd, tall = ht > 8, levels = tall ? 4 : 1;
    for (let L = 0; L < levels; L++) { const cnt = Math.max(1, Math.round((tall ? 4.6 : 5) - L * 1.2)), rr = Hn * (tall ? 0.27 - L * 0.035 : 0.5), spread = Math.max(0, Wn * (0.5 - L * 0.14) - rr), lean = (R() - 0.5) * Wn * 0.1 * L;
      for (let i = 0; i < cnt; i++) { const t = cnt === 1 ? 0.5 : i / (cnt - 1); raw.push([lean + (t - 0.5) * 2 * spread + (R() - 0.5) * rr * 0.5, -(rr * 0.72 + L * Hn * 0.2 + R() * Hn * 0.04), rr * (1.25 + R() * 0.35), rr * (0.95 + R() * 0.2)]); } }
    let minX = 1e9, maxX = -1e9, minY = 1e9; for (const [bx, by, rx, ry] of raw) { minX = Math.min(minX, bx - rx * 1.5); maxX = Math.max(maxX, bx + rx * 1.5); minY = Math.min(minY, by - ry * 1.5); }
    const padB = Math.round(Hn * 0.12), cw = Math.ceil(maxX - minX), ch = Math.ceil(-minY) + padB, baseY = ch - padB, x0 = Math.round(xOf(az) + minX), y0 = Math.round(yOf(el)) - baseY;
    const blobs = raw.map(([bx, by, rx, ry]) => [bx - minX, by + baseY, rx, ry]);
    const D = new Float32Array(cw * ch), Ds = new Float32Array(cw * ch), f0 = 1 / (ch * 0.2);
    for (let yy = 0; yy < ch; yy++) for (let xx = 0; xx < cw; xx++) {
      let b = -9, sum = 0; for (const [cx, cy, rx, ry] of blobs) { const d = 1 - Math.hypot((xx - cx) / rx, (yy - cy) / ry); if (d > b) b = d; if (d > 0) sum += d; }
      if (b < -0.6) { D[yy * cw + xx] = -1; Ds[yy * cw + xx] = -1; continue; }
      let nz = 0, a = 0.5, f = f0, lowN = 0; for (let k = 0; k < 5; k++) { const v = a * Math.abs(2 * P.noise(xx * f + k * 31.7 + seed * 9, yy * f + k * 17.3) - 1); nz += v; if (k < 2) lowN += v; a *= 0.5; f *= 2.2; }
      const cut = yy - (baseY + (P.noise(xx * f0 * 0.6 + seed, 2.2) - 0.5) * ch * 0.07), under = cut > 0 ? cut / (ch * 0.035) : 0;
      D[yy * cw + xx] = b + sum * 0.1 + (nz - 0.3) * 0.5 - under; Ds[yy * cw + xx] = b + sum * 0.1 + (lowN - 0.22) * 0.4 - under;
    }
    const st = Math.max(2, ch / 60), lx = 0.5, ly = -0.866, g = Math.max(2, Math.round(ch / 90));   // the strip is seen from inside: its +x is the view's left, where the sun is
    for (let yy = 0; yy < ch; yy++) for (let xx = 0; xx < cw; xx++) {
      const d = D[yy * cw + xx]; if (d <= 0.02) continue;
      let s = 0; for (let j = 1; j <= 7; j++) { const sx = Math.round(xx + lx * st * j * (1 + j * 0.2)), sy = Math.round(yy + ly * st * j * (1 + j * 0.2)); if (sx >= cw || sy < 0) break; const dd = Ds[sy * cw + sx]; if (dd > 0) s += Math.min(dd, 0.8); }
      const gx = Ds[yy * cw + Math.min(cw - 1, xx + g)] - Ds[yy * cw + Math.max(0, xx - g)], gy = Ds[Math.min(ch - 1, yy + g) * cw + xx] - Ds[Math.max(0, yy - g) * cw + xx];
      const ndl = (-gx * 0.42 + gy * 0.9) / Math.hypot(gx, gy, 0.05), T = Math.exp(-s * 0.3);
      const v = ndl * (0.3 + 0.7 * T) + (d < 0.12 && gy > 0 ? 0.25 : 0), low = (yy - baseY * 0.7) / (baseY * 0.3);
      const c = v > 0.3 ? TON.white : v > 0.22 ? TON.light : low > 0.86 ? TON.under : v > -0.3 ? TON.shade : TON.deep;
      const wx = ((x0 + xx) % W + W) % W, wy = y0 + yy; if (wy < 0 || wy >= H) continue;
      put((wy * W + wx) * 4, c);
    }
  }
  // ---- mountains: far to near, each a height line with lit and shaded faces
  const ranks = [
    { amp: 9.5, base: 1.6, f: 1 / 38, seed: 5, lit: rgb('#d3e0ee'), shade: rgb('#94aed6'), snow: 6.4, facet: 2.2 },
    { amp: 6.2, base: 0.9, f: 1 / 26, seed: 15, lit: rgb('#a6d2b8'), shade: rgb('#82b9b4'), facet: 1.4 },
    { amp: 3.6, base: 0.4, f: 1 / 17, seed: 25, lit: rgb('#93d083'), shade: rgb('#66b092'), facet: 1.0 },
  ];
  const yTop = Math.max(0, Math.floor(yOf(13))), snowL = rgb('#ffffff'), snowS = rgb('#cddaf0'), rockL = rgb('#b7bccb'), rockS = rgb('#8e98b6'), air = rgb(PAL.haze), land = rgb('#8fd07c');
  for (const rk of ranks) {
    const hOf = (c) => { const azd = (c / W) * 360; let n = 0, a = 0.5, f = rk.f; for (let k = 0; k < 5; k++) { n += a * (k < 1 ? P.noise(azd * f + rk.seed, k * 7.7) : 1 - Math.abs(2 * P.noise(azd * f + rk.seed, k * 7.7) - 1)); a *= 0.5; f *= 2.1; }
      const massif = rk.snow ? Math.exp(-Math.pow((((azd - 236 + 540) % 360) - 180) / 11, 2)) * 7.5 * (0.6 + 0.4 * (1 - Math.abs(2 * P.noise(azd * 0.5, 9.1) - 1))) : 0; return rk.base + rk.amp * Math.pow(n, 1.5) + massif; };
    for (let c = 0; c < W; c++) {
      const h = hOf(c), g2 = Math.round(14 * q), dh = (hOf(c + g2) - hOf(c - g2)) / (2 * g2 / ppd), top = Math.floor(yOf(h));
      for (let yy = Math.max(yTop, top); yy < H; yy++) {
        const el = BACK.el0 + (H - yy) / ppd, dep = h - el;
        const u1 = c / ppd, v1 = yy / ppd, fac = P.noise(u1 * 0.9 * rk.facet + v1 * 1.1, v1 * 0.7 + rk.seed) - 0.5 + (P.noise(u1 * 3.1 + v1 * 2.2, v1 * 2.6) - 0.5) * 0.35;
        const lit = -dh * 1.1 + fac * 2.6 > 0;
        let col = lit ? rk.lit : rk.shade;
        if (rk.snow) { const sl = el - rk.snow + (P.noise(c / ppd * 1.7, yy / ppd * 2.3) - 0.5) * 2.6; if (sl > 0) col = lit ? snowL : snowS; else if (el > rk.snow - 2.6) col = lit ? rockL : rockS; }
        const hz = clamp(1 - el / (rk.amp * 0.9 + rk.base), 0, 1) * (rk.snow ? 0.55 : 0.3);
        const i = (yy * W + c) * 4; px[i] = col[0] + (air[0] - col[0]) * hz; px[i + 1] = col[1] + (air[1] - col[1]) * hz; px[i + 2] = col[2] + (air[2] - col[2]) * hz; px[i + 3] = 255;
        if (el < 0.1) put(i, land);
      }
    }
  }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

// ------------------------------------------------------------------ the pieces
function buildSky(scene, q) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7000, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uZen: { value: hex(PAL.zenith) }, uMid: { value: hex(PAL.midSky) }, uHor: { value: hex(PAL.horizon) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uZen, uMid, uHor; varying vec3 vD; void main(){ float e = normalize(vD).y; vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.22, e)); c = mix(c, uZen, smoothstep(0.2, 0.75, e)); gl_FragColor = vec4(c, 1.0); }',
  }));
  dome.renderOrder = -3; scene.add(dome);
  const th0 = THREE.MathUtils.degToRad(90 - BACK.el1), thL = THREE.MathUtils.degToRad(BACK.el1 - BACK.el0);
  const back = new THREE.Mesh(new THREE.SphereGeometry(6000, 128, 32, 0, TAU, th0, thL), new THREE.MeshBasicMaterial({ map: backdropMap(q), side: THREE.BackSide, transparent: true, depthWrite: false, fog: false }));
  back.renderOrder = -2; scene.add(back);
  return { dome, back };
}

function buildLand(scene, map) {
  const S = 2400, N = 280, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: makeUniforms({ uMap: { value: map } }), vertexShader: WORLD_VERT,
    fragmentShader: COMMON + /* glsl */`
      uniform sampler2D uMap; varying vec3 vW; varying vec3 vN;
      void main(){ vec3 base = texture2D(uMap, vW.xz / 2048.0 + 0.5).rgb;
        float l = dot(normalize(vN), uSun);
        vec3 c = mix(base * vec3(0.70, 0.86, 0.92), base, smoothstep(0.50, 0.60, l + (noise3(vW * 0.05) - 0.5) * 0.12));
        // far woods on the valley's rim: one dark green, laid on where the land is high
        float wood = smoothstep(0.47, 0.5, noise3(vec3(vW.xz * 0.006, 1.0)) * 0.7 + smoothstep(60.0, 130.0, vW.y) * 0.5) * step(700.0, distance(vW.xz, vec2(130.0, -330.0)));
        c = mix(c, mix(vec3(0.20, 0.44, 0.36), vec3(0.28, 0.56, 0.40), smoothstep(0.5, 0.6, l)), wood);
        c = mix(c, c * vec3(0.58, 0.80, 0.86), shadeAt(vW));
        gl_FragColor = vec4(hazed(c, vW), 1.0); }`,
  });
  const mesh = new THREE.Mesh(g, mat); scene.add(mesh); return mesh;
}

function buildGrass(scene, map, count) {
  // one blade: a tapering ribbon of three quads and a tip, bent in the vertex shader
  const pos = [], idx = [], rows = [[1, 0], [0.86, 0.3], [0.62, 0.62], [0.34, 0.86]];
  rows.forEach(([w, y]) => pos.push(-w, y, 0, w, y, 0)); pos.push(0, 1, 0);
  for (let i = 0; i < 3; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); idx.push(6, 7, 8);
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const off = new Float32Array(count * 3), par = new Float32Array(count * 4), r = P.rng(4242);
  for (let i = 0; i < count; i++) {
    const a = r() * TAU, d = 0.12 + Math.pow(r(), 1.9) * 80, x = Math.cos(a) * d, z = Math.sin(a) * d;
    off[i * 3] = x; off[i * 3 + 1] = heightAt(x, z); off[i * 3 + 2] = z;
    par[i * 4] = r() * TAU; par[i * 4 + 1] = (0.17 + r() * 0.2) * (1 + d * 0.02); par[i * 4 + 2] = r(); par[i * 4 + 3] = (0.015 + r() * 0.012) * (1 + d * 0.045);
  }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aPar', new THREE.InstancedBufferAttribute(par, 4));
  g.instanceCount = count; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 20, 0), 200);
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: makeUniforms({ uMap: { value: map } }),
    vertexShader: COMMON + /* glsl */`
      attribute vec3 aOff; attribute vec4 aPar; varying vec3 vW; varying float vT; varying float vR; varying vec3 vRoot;
      void main(){ float t = position.y, h = aPar.y, c = cos(aPar.x), s = sin(aPar.x);
        float wind = sin(uTime * 1.6 + aOff.x * 0.35 + aOff.z * 0.22) * 0.5 + sin(uTime * 0.7 + aOff.x * 0.08) * 0.5;
        float lean = (0.18 + aPar.z * 0.3 + wind * 0.16) * t * t * h;
        vec3 l = vec3(position.x * aPar.w, t * h, lean);
        vec3 wp = aOff + vec3(l.x * c + l.z * s, l.y, -l.x * s + l.z * c);
        wp.x += (0.10 + wind * 0.07) * t * t * h;                      // the whole meadow leans one way
        vW = wp; vT = t; vR = aPar.z; vRoot = aOff; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: COMMON + /* glsl */`
      uniform sampler2D uMap; varying vec3 vW; varying float vT; varying float vR; varying vec3 vRoot;
      void main(){ vec3 base = texture2D(uMap, vRoot.xz / 2048.0 + 0.5).rgb;
        vec3 lo = base * vec3(0.74, 0.90, 0.80), hi = base * vec3(1.16, 1.10, 0.92) + vec3(0.05, 0.05, 0.0);
        vec3 c = mix(lo, hi, smoothstep(0.1, 0.95, vT) * (0.55 + vR * 0.6));
        if (vR > 0.965) c = mix(c, vec3(0.86, 0.84, 0.52), smoothstep(0.3, 0.9, vT));        // a few straws gone to seed
        c = mix(c, c * vec3(0.56, 0.80, 0.84), shadeAt(vRoot));
        gl_FragColor = vec4(hazed(c, vW), 1.0); }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m); return m;
}

function buildFlowers(scene, count) {
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], 3)); g.setIndex([0, 2, 1, 0, 3, 2]);
  const off = new Float32Array(count * 4), col = new Float32Array(count * 3), r = P.rng(909); let n = 0;
  const kinds = [[0.98, 0.95, 0.66], [0.98, 0.95, 0.66], [1, 1, 0.96], [0.99, 0.84, 0.28], [0.97, 0.72, 0.78]];
  while (n < count) {
    const a = r() * TAU, d = 1.5 + Math.pow(r(), 1.4) * 74, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (P.fbm(x / 7 + 5, z / 7 - 3, 2) < 0.53) continue;                                    // flowers come in drifts
    const k = kinds[(r() * kinds.length) | 0]; off.set([x, heightAt(x, z) + (0.54 + r() * 0.14) * (1 + d * 0.02), z, (0.032 + r() * 0.03) * (1 + d * 0.04)], n * 4); col.set(k, n * 3); n++;
  }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4)); g.setAttribute('aCol', new THREE.InstancedBufferAttribute(col, 3)); g.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: makeUniforms({}),
    vertexShader: COMMON + /* glsl */`attribute vec4 aOff; attribute vec3 aCol; varying vec2 vP; varying vec3 vC; varying vec3 vW;
      void main(){ vP = position.xz; vC = aCol; float sway = sin(uTime * 1.6 + aOff.x * 0.35 + aOff.z * 0.22) * 0.04;
        vec2 toCam = normalize(cameraPosition.xz - aOff.xz);
        vec3 wp = aOff.xyz + vec3(position.x * aOff.w + sway, -dot(position.xz, toCam) * aOff.w * 0.55, position.z * aOff.w); vW = wp; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: COMMON + /* glsl */`varying vec2 vP; varying vec3 vC; varying vec3 vW;
      void main(){ float d = length(vP); if (d > 1.0) discard; vec3 c = mix(vC * vec3(0.98, 0.86, 0.5), vC, step(0.24, d));
        c = mix(c, c * vec3(0.66, 0.8, 0.9), shadeAt(vW)); gl_FragColor = vec4(hazed(c, vW), 1.0); }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m); return m;
}

// leaf masses: lumpy spheres painted in three flat greens, the boundary broken into leaf-sized clumps
function foliage(lit, mid, shade) {
  return new THREE.ShaderMaterial({
    uniforms: makeUniforms({ uLit: { value: hex(lit) }, uMid: { value: hex(mid) }, uShade: { value: hex(shade) } }),
    vertexShader: COMMON + /* glsl */`varying vec3 vW; varying vec3 vN;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vec3 n = normalize(mat3(modelMatrix) * normal);
        float s = length(mat3(modelMatrix) * vec3(0.577));
        wp.xyz += n * (noise3(wp.xyz * (2.2 / s)) - 0.4) * 0.34 * s + n * (noise3(wp.xyz * (7.0 / s)) - 0.5) * 0.08 * s;
        wp.x += sin(uTime * 1.3 + wp.y * 0.4 + wp.z * 0.2) * 0.03 * s;
        vW = wp.xyz; vN = n; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + /* glsl */`uniform vec3 uLit, uMid, uShade; varying vec3 vW; varying vec3 vN;
      void main(){ vec3 n = normalize(vN); float l = dot(n, uSun) * 0.6 + n.y * 0.55 + (noise3(vW * 2.4) - 0.5) * 0.7 + (noise3(vW * 0.7) - 0.5) * 0.35;
        vec3 c = l > 0.62 ? uLit : l > 0.12 ? uMid : uShade; gl_FragColor = vec4(hazed(c, vW), 1.0); }`,
  });
}
function addTree(scene, mats, x, z, s, seed, shadows) {
  const r = P.rng(seed), y = heightAt(x, z), grp = new THREE.Group(); grp.position.set(x, y, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.3 * s, 2.6 * s, 8), mats.bark); trunk.position.y = 1.2 * s; grp.add(trunk);
  const ico = new THREE.IcosahedronGeometry(1, 5), n = 6 + ((r() * 4) | 0);
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = (i === 0 ? 0 : 0.7 + r() * 1.1) * s, b = new THREE.Mesh(ico, mats.leaf); const rr = (1.25 + r() * 0.75) * s * (i === 0 ? 1.25 : 1); b.scale.set(rr * 1.1, rr * 0.86, rr * 1.1); b.position.set(Math.cos(a) * d, (2.9 + r() * 1.5 + (i === 0 ? 0.9 : 0)) * s, Math.sin(a) * d); grp.add(b); }
  scene.add(grp);
  if (shadows) shadows.push([x - SUN.x * 3.4 * s, z - SUN.z * 3.4 * s, 3.3 * s, 2.5 * s]);
  return grp;
}
function buildWoods(scene, count) {
  const g = new THREE.ConeGeometry(1, 1, 7, 1); g.translate(0, 0.5, 0);
  const m = new THREE.InstancedMesh(g, toon('#34815a', '#1c5346', { edge: 0.3, wobble: 0.6 }), count), r = P.rng(31), M = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 60) {
    const x = (r() - 0.5) * 1500 + VALLEY[0], z = (r() - 0.5) * 1300 + VALLEY[1], d = Math.hypot(x - VALLEY[0], z - VALLEY[1]), dh = Math.hypot(x, z);
    if (d < 215 || d > 700 || dh < 150) continue;
    if (P.fbm(x / 210 + 2, z / 210 + 8, 3) + sm(260, 430, d) * 0.3 < 0.62) continue;         // woods stand in bands on the slopes
    const h = 13 + r() * 10; v.set(x, heightAt(x, z) - 0.5, z); sc.set(h * 0.24, h, h * 0.24); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU); M.compose(v, q, sc); m.setMatrixAt(n++, M);
  }
  m.count = n; m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; scene.add(m); return m;
}
function buildVillage(scene) {
  const grp = new THREE.Group(), r = P.rng(55);
  const wall = toon('#fbf2df', '#bcc0da', { edge: 0.18, windows: true }), wallB = toon('#f3e2c4', '#b3b1cf', { edge: 0.18, windows: true });
  const roofs = [toon('#ee8a4a', '#b9603f', { edge: 0.2 }), toon('#e2704a', '#a9503f', { edge: 0.2 }), toon('#f2a45a', '#c0744a', { edge: 0.2 })];
  const roofGeo = (w, d, h) => { const g = new THREE.BufferGeometry(), a = w / 2 + 0.5, b = d / 2 + 0.4; g.setAttribute('position', new THREE.Float32BufferAttribute([-a, 0, b, a, 0, b, a, h, 0, -a, 0, b, a, h, 0, -a, h, 0, a, 0, -b, -a, 0, -b, -a, h, 0, a, 0, -b, -a, h, 0, a, h, 0, -a, 0, -b, -a, 0, b, -a, h, 0, a, 0, b, a, 0, -b, a, h, 0], 3)); g.computeVertexNormals(); return g; };
  const house = (x, z, w, d, h, rot, ri) => { const y = heightAt(x, z), hg = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), r() < 0.7 ? wall : wallB); body.position.y = h / 2; hg.add(body); const rf = new THREE.Mesh(roofGeo(w, d, d * 0.42), roofs[ri % 3]); rf.position.y = h; hg.add(rf); hg.position.set(x, y - 0.3, z); hg.rotation.y = rot; grp.add(hg); };
  const C = [178, -246];
  for (let i = 0; i < 22; i++) { const a = r() * TAU, d = 8 + Math.sqrt(r()) * 62; house(C[0] + Math.cos(a) * d * 1.5, C[1] + Math.sin(a) * d * 0.8, 9 + r() * 7, 7 + r() * 4, 5 + r() * 4, (r() - 0.5) * 0.9, i); }
  // the church: a tall white tower with a red spire
  const ty = heightAt(C[0] + 8, C[1] - 6), tower = new THREE.Mesh(new THREE.BoxGeometry(6, 22, 6), wall); tower.position.set(C[0] + 8, ty + 11, C[1] - 6); grp.add(tower);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(4.6, 9, 4), roofs[1]); spire.position.set(C[0] + 8, ty + 26.5, C[1] - 6); spire.rotation.y = Math.PI / 4; grp.add(spire);
  const nave = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 18), wall); nave.position.set(C[0] + 8, ty + 4.5, C[1] + 6); grp.add(nave);
  const nr = new THREE.Mesh(roofGeo(18, 9, 4.5), roofs[0]); nr.rotation.y = Math.PI / 2; nr.position.set(C[0] + 8, ty + 9, C[1] + 6); grp.add(nr);
  scene.add(grp); return grp;
}

// ------------------------------------------------------------------ people are cel
function cel(lit, shade, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: SHARED.uSun, uLit: { value: hex(lit) }, uShade: { value: hex(shade) }, uEdge: { value: o.edge ?? 0.08 } }, side: o.side ?? THREE.FrontSide,
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uSun, uLit, uShade; uniform float uEdge; varying vec3 vN; void main(){ float l = dot(normalize(vN), uSun); gl_FragColor = vec4(mix(uShade, uLit, smoothstep(uEdge - 0.01, uEdge + 0.01, l)), 0.0); }',
  });
}
const INK = new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { uW: { value: 0.0016 } },
  vertexShader: 'uniform float uW; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); mv.xyz += n * uW * max(1.0, -mv.z) ; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'void main(){ gl_FragColor = vec4(0.20, 0.12, 0.09, 0.0); }',
});
function inked(geo, mat, parent, o = {}) {
  const m = new THREE.Mesh(geo, mat); if (o.p) m.position.set(...o.p); if (o.r) m.rotation.set(...o.r); if (o.s) m.scale.set(...o.s);
  if (o.ink !== false) { const k = new THREE.Mesh(geo, INK); m.add(k); }
  parent.add(m); return m;
}
function buildGirl() {
  const g = new THREE.Group();
  const M = {
    coat: cel('#f4c63e', '#d8952f'), coatIn: cel('#d8952f', '#b87826', { side: THREE.DoubleSide }), skin: cel('#fde2cc', '#f3c3a4', { edge: 0.5 }), hair: cel('#3a3034', '#211a1c', { edge: 0.3 }),
    boot: cel('#d2402f', '#9a2a24'), eye: cel('#2a1c18', '#2a1c18'), mouth: cel('#b4524a', '#b4524a'), blush: cel('#f7b6a6', '#f0a898'), toggle: cel('#8a5a33', '#6a4224'),
  };
  // boots and legs
  for (const sx of [-1, 1]) {
    inked(new THREE.CylinderGeometry(0.058, 0.064, 0.2, 14), M.boot, g, { p: [sx * 0.075, 0.1, 0] });
    inked(new THREE.SphereGeometry(0.066, 14, 10), M.boot, g, { p: [sx * 0.075, 0.04, -0.045], s: [1, 0.62, 1.5] });
    inked(new THREE.CylinderGeometry(0.036, 0.04, 0.2, 10), M.skin, g, { p: [sx * 0.075, 0.28, 0] });
  }
  // the raincoat: an A-line bell with a wavering hem
  const prof = [[0.236, 0.30], [0.226, 0.36], [0.2, 0.47], [0.17, 0.58], [0.14, 0.68], [0.114, 0.755], [0.092, 0.795], [0.055, 0.815]].map(([r, y]) => new THREE.Vector2(r, y));
  const coatG = new THREE.LatheGeometry(prof, 40); { const p = coatG.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + Math.sin(a * 7) * 0.035 * sm(0.62, 0.3, y); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * 0.9); } coatG.computeVertexNormals(); }
  inked(coatG, M.coat, g);
  const hemG = new THREE.CircleGeometry(0.225, 24); hemG.rotateX(Math.PI / 2); { const hem = new THREE.Mesh(hemG, M.coatIn); hem.position.set(0, 0.305, 0); g.add(hem); }
  // hood, lying on the shoulders
  inked(new THREE.SphereGeometry(0.115, 18, 12), M.coat, g, { p: [0, 0.80, 0.075], s: [1.15, 0.62, 0.95] });
  // toggles down the front
  for (const y of [0.7, 0.6, 0.5]) inked(new THREE.CapsuleGeometry(0.011, 0.034, 3, 8), M.toggle, g, { p: [0.012, y, -(0.118 + (0.7 - y) * 0.25)], r: [0, 0, Math.PI / 2], ink: false });
  // head, face
  const head = new THREE.Group(); head.position.set(0, 0.94, 0); head.scale.setScalar(1.08); g.add(head);
  inked(new THREE.SphereGeometry(0.128, 28, 20), M.skin, head, { s: [1, 0.95, 0.98] });
  for (const sx of [-1, 1]) {
    inked(new THREE.SphereGeometry(0.017, 12, 10), M.eye, head, { p: [sx * 0.047, -0.008, -0.117], s: [0.9, 1.25, 0.4], ink: false });
    inked(new THREE.SphereGeometry(0.026, 10, 8), M.blush, head, { p: [sx * 0.074, -0.045, -0.098], s: [1, 0.55, 0.3], ink: false });
  }
  inked(new THREE.SphereGeometry(0.015, 10, 8), M.mouth, head, { p: [0, -0.058, -0.113], s: [1.3, 0.75, 0.4], ink: false });
  // hair: a bob — a cap over the crown, back and sides, and a fringe across the brow
  inked(new THREE.SphereGeometry(0.143, 28, 18, 0, TAU, 0, Math.PI * 0.36), M.hair, head, { p: [0, 0.004, 0.012], s: [1.03, 1, 1.03] });
  const side = new THREE.SphereGeometry(0.146, 24, 14, Math.PI * 1.74, Math.PI * 1.52, Math.PI * 0.28, Math.PI * 0.44);
  inked(side, M.hair, head, { p: [0, 0.0, 0.014], s: [1.03, 1.12, 1.03] });
  inked(new THREE.SphereGeometry(0.137, 20, 8, Math.PI * 1.2, Math.PI * 0.6, Math.PI * 0.2, Math.PI * 0.17), M.hair, head, { p: [0, 0.014, 0.004] });
  // arms: sleeves from the shoulder, small hands
  g.userData.arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.122, 0.752, 0); g.add(sh);
    inked(new THREE.CapsuleGeometry(0.046, 0.2, 4, 12), M.coat, sh, { p: [0, -0.115, 0] });
    inked(new THREE.SphereGeometry(0.036, 12, 10), M.skin, sh, { p: [0, -0.268, 0] });
    sh.rotation.z = sx * 0.42; g.userData.arms.push(sh);
  }
  g.userData.head = head;
  return g;
}

// ------------------------------------------------------------------ the frame: scene → paint finish
const POST_FRAG = /* glsl */`
  uniform sampler2D tMap; uniform vec2 uPx; uniform float uPaint; varying vec2 vUv;
  void main(){
    vec4 c0 = texture2D(tMap, vUv);
    const int R = 3; vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0), s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
    for (int j = 0; j <= R; j++) for (int i = 0; i <= R; i++) {
      vec2 o = vec2(float(i), float(j)) * uPx; vec3 c;
      c = texture2D(tMap, vUv + o * vec2(-1.0, -1.0)).rgb; m0 += c; s0 += c * c;
      c = texture2D(tMap, vUv + o * vec2( 1.0, -1.0)).rgb; m1 += c; s1 += c * c;
      c = texture2D(tMap, vUv + o * vec2(-1.0,  1.0)).rgb; m2 += c; s2 += c * c;
      c = texture2D(tMap, vUv + o * vec2( 1.0,  1.0)).rgb; m3 += c; s3 += c * c;
    }
    float n = float((R + 1) * (R + 1)); m0 /= n; m1 /= n; m2 /= n; m3 /= n;
    float v0 = dot(abs(s0 / n - m0 * m0), vec3(1.0)), v1 = dot(abs(s1 / n - m1 * m1), vec3(1.0)), v2 = dot(abs(s2 / n - m2 * m2), vec3(1.0)), v3 = dot(abs(s3 / n - m3 * m3), vec3(1.0));
    vec3 k = m0; float v = v0; if (v1 < v) { v = v1; k = m1; } if (v2 < v) { v = v2; k = m2; } if (v3 < v) { v = v3; k = m3; }
    vec3 c = mix(c0.rgb, k, c0.a * uPaint);
    vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.16;
    gl_FragColor = vec4(c, 1.0);
  }`;

export function createWorld(canvas, o = {}) {
  const q = o.quality ?? 1, w = o.width || 1280, h = o.height || 720;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 9000);
  const map = groundMap(), shadows = [];
  buildSky(scene, q); buildLand(scene, map);
  const grass = buildGrass(scene, map, Math.round(260000 * q)); buildFlowers(scene, Math.round(26000 * q));
  const mats = { leaf: foliage('#7cc452', '#43964a', '#246a4c'), bark: toon('#8a6a4e', '#57423a', { edge: 0.1 }) };
  // the big tree of the hill, and trees standing about the slope below
  addTree(scene, mats, -22, -40, 2.7, 1, shadows);
  for (const [x, z, s] of [[-22, -96, 1.9], [-9, -108, 2.3], [3, -93, 1.6], [-70, -64, 1.9], [-82, -56, 1.4], [126, -118, 2.0], [140, -108, 1.5], [-40, -160, 1.7], [30, -170, 1.8]]) addTree(scene, mats, x, z, s, (x * 7 + z) | 0, shadows);
  shadows.slice(0, 8).forEach((s, i) => SHARED.uShadows.value[i].set(...s));
  buildWoods(scene, Math.round(9000 * Math.max(q, 0.7))); buildVillage(scene);
  const girl = buildGirl(); scene.add(girl);
  const placeGirl = (x, z, yaw) => { girl.position.set(x, heightAt(x, z), z); girl.rotation.y = yaw; SHARED.uWalker.value.set(x - SUN.x * 0.42, z - SUN.z * 0.42, 0.5, 0.26); };
  placeGirl(0, 0, 0);
  // the finish
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, format: THREE.RGBAFormat });
  const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ depthTest: false, uniforms: { tMap: { value: rt.texture }, uPx: { value: new THREE.Vector2(1 / w, 1 / h) }, uPaint: { value: o.paint ?? 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: POST_FRAG }));
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); postScene.add(post);
  function render(t = 0) {
    SHARED.uTime.value = t;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  return { THREE, renderer, scene, camera, girl, placeGirl, render, heightAt, SUN, setPaint: (v) => { post.material.uniforms.uPaint.value = v; } };
}
