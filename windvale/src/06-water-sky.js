/* =====================  sky dome, clouds, river shader (GLSL) with planar reflection  ===================== */
const SKY = {
  zenith: C('#4a8bd0'), mid: C('#93bfe6'), horizon: C('#e4e7e0'), low: C('#d4dcdc'), glow: C('#ffd9a0'),
};
const FOG_COLOR = C('#d3dfe4');

function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: U.sunDir, uZen: { value: SKY.zenith }, uMid: { value: SKY.mid }, uHor: { value: SKY.horizon }, uLow: { value: SKY.low }, uGlow: { value: SKY.glow } },
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uZen, uMid, uHor, uLow, uGlow; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.22, h));
        col = mix(col, uZen, smoothstep(0.18, 0.85, h));
        float s = max(dot(d, uSun), 0.0);
        col += uGlow * (pow(s, 5.0) * 0.32 + pow(s, 48.0) * 0.5) * smoothstep(-0.1, 0.2, h + 0.1);
        col += vec3(1.0, 0.96, 0.85) * smoothstep(0.9993, 0.9997, s) * 6.0;
        col = mix(col, uLow, smoothstep(0.0, -0.08, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}
function buildSky() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), skyMaterial());
  sky.frustumCulled = false; sky.renderOrder = -10; sky.name = 'sky';
  sky.onBeforeRender = (r, s, cam) => { sky.position.copy(cam.position); sky.updateMatrixWorld(); };
  return sky;
}

/* painterly cumulus: camera-facing sprites far away, drifting very slowly */
const CLOUDS = [];
function buildClouds() {
  const g = new THREE.Group(); g.name = 'clouds';
  const spots = [
    [-0.55, 0.13, 2600, 900], [-0.18, 0.2, 3000, 1150], [0.12, 0.11, 2800, 760], [0.42, 0.17, 3100, 1000], [0.7, 0.09, 2500, 700],
    [-0.9, 0.08, 2700, 620], [1.05, 0.14, 2900, 820], [-0.35, 0.33, 3300, 900], [0.3, 0.36, 3400, 700], [2.2, 0.12, 2800, 900], [-2.0, 0.1, 2800, 800], [3.0, 0.15, 3000, 900],
    [-0.05, 0.055, 4200, 900], [0.28, 0.05, 4400, 1100], [0.58, 0.06, 4300, 800], [-0.42, 0.06, 4300, 1000], [-0.7, 0.045, 4500, 900], [0.9, 0.05, 4400, 900],
  ];
  spots.forEach(([az, el, dist, size], i) => {
    const mat = new THREE.SpriteMaterial({ map: TEX.clouds[i % TEX.clouds.length], fog: false, depthWrite: false, transparent: true, opacity: 0.95, color: C('#ffffff') });
    const s = new THREE.Sprite(mat);
    const a = az - Math.PI / 2 - 0.12; // azimuth relative to the default view (looking toward -z)
    s.position.set(Math.cos(a) * dist, Math.sin(el) * dist, Math.sin(a) * dist);
    s.scale.set(size, size * 0.5, 1); s.renderOrder = -9;
    s.userData = { a, dist, el, speed: R(0.0008, 0.0016) * (i % 2 ? 1 : 0.7) };
    CLOUDS.push(s); g.add(s);
  });
  return g;
}
function updateClouds(t, cam) {
  for (const s of CLOUDS) {
    const a = s.userData.a + t * s.userData.speed * 0.05;
    s.position.set(cam.position.x + Math.cos(a) * s.userData.dist, Math.sin(s.userData.el) * s.userData.dist, cam.position.z + Math.sin(a) * s.userData.dist);
  }
}

/* ---------------- river ---------------- */
const REFL = { rt: null, cam: new THREE.PerspectiveCamera(), texMat: new THREE.Matrix4(), scale: 0.45 };
const MAX_RIPPLES = 40;
const SHORE_BOX = { x0: -40, z0: -560, sx: 200, sz: 680 };
let WATER = null;

function bakeShore() {
  const W = 256, H = 768; const data = new Uint8Array(W * H * 4);
  const t = TERRACE, d = DOCK;
  const rectDist = (x, z, x0, x1, z0, z1) => { const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1); return Math.hypot(dx, dz); };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = SHORE_BOX.x0 + (i + 0.5) / W * SHORE_BOX.sx, z = SHORE_BOX.z0 + (j + 0.5) / H * SHORE_BOX.sz;
    const r = riverAt(z); const sd = Math.abs(x - r.cx) - r.w; const natural = !(x < r.cx && isQuay(z));
    let dist = Math.max(0, -sd) + (natural ? 2.6 : 0);
    if (z > t.z0 - 30 && z < t.z1 + 30) dist = Math.min(dist, rectDist(x, z, quayX(z) - 1, t.x1, t.z0, t.z1));
    dist = Math.min(dist, rectDist(x, z, quayX(z) - 1, quayX(z) + d.len, d.z0, d.z1) + 1.2);
    const k = (j * W + i) * 4; data[k] = clamp(dist / 24 * 255, 0, 255); data[k + 1] = data[k + 2] = 0; data[k + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return tex;
}

function buildWater() {
  REFL.rt = new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, samples: 0 });
  const ripples = []; for (let i = 0; i < MAX_RIPPLES; i++) ripples.push(new THREE.Vector4(0, 0, 0, 0));
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, tRefl: { value: REFL.rt.texture }, textureMatrix: { value: REFL.texMat }, tShore: { value: null },
      uShoreBox: { value: new THREE.Vector4(SHORE_BOX.x0, SHORE_BOX.z0, SHORE_BOX.sx, SHORE_BOX.sz) },
      uSunDir: { value: SUN_DIR }, uSunCol: { value: C('#fff1d8').multiplyScalar(3.2) },
      uDeep: { value: C('#1f5c66') }, uShallow: { value: C('#4f8f82') }, uSky: { value: C('#9cc3df') },
      uRipples: { value: ripples }, uRippleCount: { value: 0 },
    }]),
    vertexShader: /* glsl */`
      uniform mat4 textureMatrix; varying vec4 vRefl; varying vec3 vWPos;
      #include <common>
      #include <fog_pars_vertex>
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0); vWPos = wp.xyz; vRefl = textureMatrix * wp;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform sampler2D tRefl, tShore; uniform vec4 uShoreBox;
      uniform vec3 uSunDir, uSunCol, uDeep, uShallow, uSky;
      uniform vec4 uRipples[${MAX_RIPPLES}]; uniform int uRippleCount;
      varying vec4 vRefl; varying vec3 vWPos;
      #include <common>
      #include <fog_pars_fragment>
      ${GLSL_NOISE}
      float waveH(vec2 p, float fine){
        float t = uTime; float h = 0.0;
        h += wv_noise(vec2(p.x * 0.42, (p.y - t * 0.55) * 0.2)) * 0.5;
        h += wv_noise(mat2(0.8, -0.6, 0.6, 0.8) * p * 1.05 + vec2(0.0, -t * 0.72)) * 0.26;
        h += wv_noise(mat2(0.6, 0.8, -0.8, 0.6) * p * 2.7 + vec2(t * 0.16, -t * 0.95)) * 0.12 * fine;
        h += wv_noise(p * vec2(6.0, 4.5) + vec2(-t * 0.25, -t * 1.25)) * 0.05 * fine;
        h += wv_noise(p * 14.0 + vec2(t * 0.35, -t * 1.6)) * 0.022 * fine * fine;
        return h;
      }
      void main(){
        vec3 toCam = cameraPosition - vWPos; float dist = length(toCam); vec3 V = toCam / dist;
        vec2 p = vWPos.xz;
        vec2 suv = (p - uShoreBox.xy) / uShoreBox.zw;
        float shore = (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) ? texture2D(tShore, suv).r * 24.0 : 24.0;
        float fine = 1.0 - smoothstep(30.0, 260.0, dist);
        float e = 0.05 + dist * 0.0025;
        float h0 = waveH(p, fine), hx = waveH(p + vec2(e, 0.0), fine), hz = waveH(p + vec2(0.0, e), fine);
        float str = 0.32 * mix(0.55, 1.0, smoothstep(0.0, 4.0, shore));
        vec2 grad = vec2(hx - h0, hz - h0) / e * str;
        // local ripples (posts, boats, waterfall) and downstream wakes
        float ringFoam = 0.0, wake = 0.0;
        for (int i = 0; i < ${MAX_RIPPLES}; i++) {
          if (i >= uRippleCount) break;
          vec4 r = uRipples[i]; vec2 d = p - r.xy; float L = length(d);
          float reach = r.z + 3.0 + r.w * 5.0;
          if (L > reach) continue;
          float env = exp(-max(L - r.z, 0.0) * (1.6 / (0.6 + r.w))) * smoothstep(r.z * 0.7, r.z, L);
          float ph = L * 6.5 - uTime * 2.4 + float(i) * 1.7;
          grad += d / max(L, 1e-3) * cos(ph) * 0.22 * env * min(r.w, 1.2);
          ringFoam += smoothstep(0.75, 1.0, sin(ph)) * env * 0.35 * min(r.w, 1.0) + exp(-max(L - r.z, 0.0) * 3.0) * smoothstep(r.z * 0.7, r.z, L) * 0.35;
          if (r.w > 2.0) ringFoam += exp(-L / (r.z * 0.9)) * 1.4;
          float down = d.y;
          if (down > 0.0 && r.w <= 2.0) { float wk = exp(-d.x * d.x / (0.04 + down * 0.05)) * exp(-down * 0.35);
            wake += wk; grad.x += sin(down * 7.0 - uTime * 3.5) * wk * 0.12; }
        }
        vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
        // reflection (planar, distorted by the waves)
        vec4 rc = vRefl; rc.xy += N.xz * 0.045 * rc.w * (1.0 - smoothstep(60.0, 600.0, dist) * 0.6);
        vec3 refl = texture2DProj(tRefl, rc).rgb;
        // water body
        float depthF = smoothstep(0.2, 10.0, shore);
        float NL = max(dot(N, uSunDir), 0.0);
        vec3 body = mix(uShallow, uDeep, depthF) * (0.45 + 0.55 * NL) + uSky * 0.05;
        float NV = max(dot(N, V), 0.0);
        float fres = 0.03 + 0.97 * pow(1.0 - NV, 5.0);
        fres = clamp(fres * 1.25 + 0.12, 0.0, 0.96);
        vec3 col = mix(body, refl * 0.96, fres);
        // sun
        vec3 H = normalize(uSunDir + V); float NH = max(dot(N, H), 0.0);
        col += uSunCol * (pow(NH, 900.0) * 5.0 + pow(NH, 90.0) * 0.06);
        float sk = wv_noise(p * 6.0 + vec2(0.0, -uTime * 0.9)) * wv_noise(p * 8.7 + vec2(uTime * 0.5, -uTime * 0.35));
        col += uSunCol * smoothstep(0.62, 0.86, sk) * 0.22 * (1.0 - smoothstep(20.0, 200.0, dist)) * (0.4 + 0.6 * fres);
        // shore lapping + foam
        float fn = wv_fbm(p * 1.4 + vec2(0.0, -uTime * 0.35));
        float lap = sin(shore * 4.5 - uTime * 1.5 + fn * 5.0) * 0.5 + 0.5;
        float foam = smoothstep(0.9, 0.0, shore) * (0.35 + 0.65 * fn) + smoothstep(0.75, 1.0, lap) * smoothstep(2.6, 0.3, shore) * 0.45;
        foam += ringFoam * (0.4 + 0.6 * fn) + wake * 0.25 * fn;
        col = mix(col, vec3(0.86, 0.9, 0.88) * (0.55 + 0.45 * NL) + uSky * 0.1, clamp(foam, 0.0, 1.0) * 0.6);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
  // UniformsUtils.merge clones values: re-link the shared objects
  Object.assign(mat.uniforms, { tShore: { value: bakeShore() }, tRefl: { value: REFL.rt.texture }, textureMatrix: { value: REFL.texMat }, uSunDir: { value: SUN_DIR } });
  const geo = new THREE.PlaneGeometry(1, 1, 1, 1); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  // cover the whole river: a long strip following the valley
  mesh.scale.set(560, 1, 3800); mesh.position.set(110, WATER_Y, -1500);
  mesh.name = 'water'; mesh.receiveShadow = false; mesh.frustumCulled = false;
  WATER = mesh;
  return mesh;
}
function setRipples() {
  const arr = WATER.material.uniforms.uRipples.value; const n = Math.min(MAX_RIPPLES, RIPPLES.length);
  for (let i = 0; i < n; i++) { const r = RIPPLES[i]; arr[i].set(r.x, r.z, r.r, r.s); }
  WATER.material.uniforms.uRippleCount.value = n;
}

const _rp = { n: V3(0, 1, 0), pos: V3(), cw: V3(), rot: new THREE.Matrix4(), look: V3(), view: V3(), target: V3(), plane: new THREE.Plane(), clip: new THREE.Vector4(), q: new THREE.Vector4() };
function renderReflection(renderer, scene, camera) {
  const p = _rp; const vc = REFL.cam;
  p.pos.set(0, WATER_Y, 0); p.cw.setFromMatrixPosition(camera.matrixWorld);
  p.view.subVectors(p.pos, p.cw); p.view.set(p.cw.x, 2 * WATER_Y - p.cw.y, p.cw.z);
  p.rot.extractRotation(camera.matrixWorld); p.look.set(0, 0, -1).applyMatrix4(p.rot).add(p.cw);
  p.target.set(p.look.x, 2 * WATER_Y - p.look.y, p.look.z);
  vc.position.copy(p.view); vc.up.set(0, 1, 0).applyMatrix4(p.rot); vc.up.reflect(p.n);
  vc.lookAt(p.target); vc.far = camera.far; vc.near = camera.near; vc.fov = camera.fov; vc.aspect = camera.aspect;
  vc.updateMatrixWorld(); vc.projectionMatrix.copy(camera.projectionMatrix);
  REFL.texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  REFL.texMat.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
  // oblique near plane = water plane
  p.plane.setFromNormalAndCoplanarPoint(p.n, p.pos).applyMatrix4(vc.matrixWorldInverse);
  p.clip.set(p.plane.normal.x, p.plane.normal.y, p.plane.normal.z, p.plane.constant);
  const pm = vc.projectionMatrix.elements;
  p.q.set((Math.sign(p.clip.x) + pm[8]) / pm[0], (Math.sign(p.clip.y) + pm[9]) / pm[5], -1, (1 + pm[10]) / pm[14]);
  p.clip.multiplyScalar(2 / p.clip.dot(p.q));
  pm[2] = p.clip.x; pm[6] = p.clip.y; pm[10] = p.clip.z + 1.0 - 0.003; pm[14] = p.clip.w;
  vc.layers.set(0);
  WATER.visible = false;
  const auto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(REFL.rt); renderer.clear(); renderer.render(scene, vc); renderer.setRenderTarget(null);
  renderer.shadowMap.autoUpdate = auto; WATER.visible = true;
}
