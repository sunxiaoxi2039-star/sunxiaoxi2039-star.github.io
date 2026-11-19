/* 小芽与风的种子 · swatchA.js — test swatch A: the grassy hill in real 3D (three.js).
 * The slope is geometry; about 220 000 blades are instanced and bent on the GPU by the same kind of
 * travelling gusts as swatches B and C, so the meadow shows waves of pale grass rolling over it.
 * The blades grow in clumps so they read as masses. Sky, clouds and distance are the painted
 * backdrop shared with B and C. A final pass rounds the pixels into strokes (Kuwahara), adds paper
 * grain and a slight darkening at colour edges, so the 3D render reads as gouache.
 */
import * as THREE from './vendor/three.module.min.js';

const P = window.P, TAU = Math.PI * 2;
// the hill: rising away from the camera to a crest about 30 m out, then falling away
export function heightAt(x, z) {
  const d = -z;
  return 1.7 * Math.exp(-((d - 30) ** 2) / (2 * 16 * 16)) - 0.012 * x * x * 0.05 + 0.5 * Math.sin(x * 0.06) * Math.exp(-((d - 30) ** 2) / 600) + (d > 30 ? -(d - 30) * 0.08 : 0);
}
const GUSTS = /* glsl */`
  uniform float uTime;
  float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y); }
  // travelling gusts, left to right across the view
  float gust(vec2 p){ float k = (p.x - uTime * 6.5) / 2.6 + noise2(p * 0.09) * 2.6 - p.y * 0.12; float s = max(0.0, sin(k)); return s * s; }
`;

export function createSwatchA(canvas, o = {}) {
  const w = o.width || 1280, h = o.height || 720;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(46, w / h, 0.05, 2000);
  camera.position.set(0, heightAt(0, 2) + 1.55, 2); camera.lookAt(0, 3.4, -40);
  const uTime = { value: 0 };
  // painted backdrop behind everything
  const bdCanvas = SWATCH.backdrop(0, -48), bd = new THREE.CanvasTexture(bdCanvas); bd.colorSpace = THREE.NoColorSpace; scene.background = bd;

  // ground: a mid green that darkens toward the camera, lit by the same gusts so gaps between blades agree
  const S = 140, g = new THREE.PlaneGeometry(S, 80, 220, 140); g.rotateX(-Math.PI / 2); g.translate(0, 0, -30);
  const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, heightAt(pa.getX(i), pa.getZ(i)));
  g.computeVertexNormals();
  const groundMat = new THREE.ShaderMaterial({
    uniforms: { uTime },
    vertexShader: 'varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: GUSTS + /* glsl */`varying vec3 vW;
      void main(){ float d = clamp(-vW.z / 32.0, 0.0, 1.0); vec3 c = mix(vec3(0.17, 0.39, 0.30), vec3(0.44, 0.66, 0.30), d);
        c = mix(c, vec3(0.62, 0.78, 0.40), gust(vW.xz) * 0.35); gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(g, groundMat));

  // grass: tapering ribbons, instanced, grown in clumps
  const pos = [], idx = [], rows = [[1, 0], [0.82, 0.3], [0.55, 0.62], [0.28, 0.86]];
  rows.forEach(([bw, y]) => pos.push(-bw, y, 0, bw, y, 0)); pos.push(0, 1, 0);
  for (let i = 0; i < 3; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); idx.push(6, 7, 8);
  const gg = new THREE.InstancedBufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx);
  const N = o.count || 220000, off = new Float32Array(N * 3), par = new Float32Array(N * 4), r = P.rng(77);
  let cx = 0, cz = 0, left = 0;
  for (let i = 0; i < N; i++) {
    if (left-- <= 0) { const d = Math.pow(r(), 1.6) * 46; cx = (r() - 0.5) * (14 + d * 2.6); cz = 1 - d; left = 10 + ((r() * 30) | 0); }
    const sp = 0.25 + (1 - cz) * 0.035, x = cx + (r() - 0.5) * sp * 2, z = cz + (r() - 0.5) * sp * 2;
    off[i * 3] = x; off[i * 3 + 1] = heightAt(x, z); off[i * 3 + 2] = z;
    par[i * 4] = (r() - 0.5) * 1.2; par[i * 4 + 1] = 0.32 + r() * 0.4; par[i * 4 + 2] = r(); par[i * 4 + 3] = (0.022 + r() * 0.02) * (1 + Math.max(0, -z) * 0.04);
  }
  gg.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); gg.setAttribute('aPar', new THREE.InstancedBufferAttribute(par, 4)); gg.instanceCount = N;
  const grassMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: { uTime },
    vertexShader: GUSTS + /* glsl */`
      attribute vec3 aOff; attribute vec4 aPar; varying float vT; varying float vR; varying float vG; varying float vD;
      void main(){ float t = position.y, hh = aPar.y, c = cos(aPar.x), s = sin(aPar.x);
        float gs = gust(aOff.xz), flut = sin(uTime * 9.0 + aOff.x * 3.0 + aOff.z * 2.0) * 0.05;
        float bend = 0.25 + gs * 0.85 + flut;                                    // radians the blade is pushed downwind (+x)
        float ang = bend * t;                                                     // more bent toward the tip
        vec3 l = vec3(position.x * aPar.w, 0.0, 0.0);
        vec3 wp = aOff + vec3(l.x * c, 0.0, -l.x * s);
        wp.x += sin(ang) * t * hh; wp.y += cos(ang) * t * hh * (1.0 - gs * 0.2);
        vT = t; vR = aPar.z; vG = gs; vD = clamp(-aOff.z / 34.0, 0.0, 1.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: /* glsl */`
      varying float vT; varying float vR; varying float vG; varying float vD;
      void main(){
        vec3 dark = vec3(0.14, 0.35, 0.29), mid = vec3(0.37, 0.62, 0.27), lit = vec3(0.62, 0.80, 0.33), silver = vec3(0.86, 0.93, 0.66);
        vec3 c = mix(dark, mid, smoothstep(0.05, 0.7, vT));
        c *= 0.82 + 0.18 * vG;                                                   // between gusts the grass stands up and shows its shadowed side
        c = mix(c, lit, smoothstep(0.45, 1.0, vT) * (0.4 + vR * 0.6));
        c = mix(c, silver, vG * smoothstep(0.25, 1.0, vT) * 0.9);              // flattened by a gust, the blades show their pale side
        c = mix(c, vec3(0.72, 0.84, 0.86), vD * vD * 0.35);                       // air
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const grass = new THREE.Mesh(gg, grassMat); grass.frustumCulled = false; scene.add(grass);

  // finish: Kuwahara into strokes, paper grain, darker where colours meet
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
  const grain = new THREE.CanvasTexture((() => { const c = P.canvas(512, 512), x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 512); P.tex(x, 'paper', 1, 'source-over', [0, 0, 512, 512]); return c; })());
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthTest: false, uniforms: { tMap: { value: rt.texture }, tGrain: { value: grain }, uPx: { value: new THREE.Vector2(1 / w, 1 / h) }, uAsp: { value: new THREE.Vector2(w / 512, h / 512) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tMap, tGrain; uniform vec2 uPx, uAsp; varying vec2 vUv;
      void main(){
        const int R = 4; vec3 m[4]; vec3 s[4]; for (int q = 0; q < 4; q++) { m[q] = vec3(0.0); s[q] = vec3(0.0); }
        for (int j = 0; j <= R; j++) for (int i = 0; i <= R; i++) { vec2 o = vec2(float(i), float(j)) * uPx; vec3 c;
          c = texture2D(tMap, vUv + o * vec2(-1.0, -1.0)).rgb; m[0] += c; s[0] += c * c;
          c = texture2D(tMap, vUv + o * vec2( 1.0, -1.0)).rgb; m[1] += c; s[1] += c * c;
          c = texture2D(tMap, vUv + o * vec2(-1.0,  1.0)).rgb; m[2] += c; s[2] += c * c;
          c = texture2D(tMap, vUv + o * vec2( 1.0,  1.0)).rgb; m[3] += c; s[3] += c * c; }
        float n = float((R + 1) * (R + 1)); vec3 k = vec3(0.0); float best = 1e9;
        for (int q = 0; q < 4; q++) { vec3 mm = m[q] / n; float v = dot(abs(s[q] / n - mm * mm), vec3(1.0)); if (v < best) { best = v; k = mm; } }
        float edge = clamp(sqrt(best) * 2.2, 0.0, 1.0); vec3 c = k * (1.0 - edge * 0.18);
        float gr = texture2D(tGrain, vUv * uAsp).r - 0.5; c += gr * 0.09;
        vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.22;
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); postScene.add(post);
  let lastBd = 0;
  function render(t) {
    uTime.value = t;
    if (Math.abs(t - lastBd) > 0.25) { lastBd = t; const c = SWATCH.backdrop(t, -48); bdCanvas.getContext('2d').drawImage(c, 0, 0); bd.needsUpdate = true; }   // let the clouds drift
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  return { render, renderer, camera };
}
