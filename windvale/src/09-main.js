/* =====================  renderer, lights, post, controls, UI, loop  ===================== */
const DEFAULT_VIEW = { pos: V3(4.5, 5.2, 47), target: V3(-0.4, 5.6, -4), fov: 42 };
/* on portrait screens aim a little left so the bakery and the tower stay in frame */
const PORTRAIT_VIEW = { pos: V3(0.6, 6.4, 39), target: V3(-5.6, 7.2, -6) };
const isPortrait = () => innerWidth / innerHeight < 1;
const defaultTarget = () => (isPortrait() ? PORTRAIT_VIEW.target.clone() : DEFAULT_VIEW.target.clone());
const defaultPos = () => (isPortrait() ? PORTRAIT_VIEW.pos.clone() : DEFAULT_VIEW.pos.clone());
const UPDATERS = [];   // per-frame callbacks (t, dt)

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uGrain: { value: 0.012 } },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uGrain; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      // split toning: cool, slightly violet shadows; warm cream highlights
      c += vec3(-0.012, 0.0, 0.022) * (1.0 - smoothstep(0.0, 0.55, l));
      c += vec3(0.028, 0.012, -0.022) * smoothstep(0.45, 1.0, l);
      // gentle filmic matte (lifted blacks, soft shoulder)
      c = mix(vec3(0.035, 0.035, 0.05), vec3(1.0), c);
      // soft saturation balance
      c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.04);
      // vignette
      vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y * 0.75;
      c *= mix(1.0, 0.8, smoothstep(0.32, 0.95, length(q)));
      // fine paper grain
      c += (h(vUv * uRes + fract(uTime) * 17.0) - 0.5) * uGrain;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

async function main() {
  const canvasEl = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance', stencil: false });
  const maxPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.75 : 2);
  let pixelRatio = Math.min(maxPR, LOW ? 1.25 : 1.5);
  renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.00068);
  const camera = new THREE.PerspectiveCamera(DEFAULT_VIEW.fov, innerWidth / innerHeight, 0.35, 14000);
  camera.layers.enable(1);
  // the post-processing target exists early so shaders can be compiled for it while the town is still being built
  const size = new THREE.Vector2(); renderer.getDrawingBufferSize(size);
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: +(PARAMS.get('msaa') ?? (LOW ? 2 : 4)) });
  const precompile = () => { renderer.setRenderTarget(rt); const p = renderer.compileAsync(scene, camera); renderer.setRenderTarget(null); return p; };

  await stage(5, '正在铺石板路……');
  await buildTextures();
  buildMaterials(); mark('materials');

  // image-based ambient light from the painted sky
  {
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMaterial()));
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(400, 32), new THREE.MeshBasicMaterial({ color: C('#7c875a') }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.y = -4; envScene.add(gnd);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(envScene, 0.03).texture; pm.dispose();
    scene.environmentIntensity = 0.55;
  }
  mark('environment light');

  // sun
  const sun = new THREE.DirectionalLight(0xffe4bd, 3.6);
  const sunTarget = V3(-4, 0, -6);
  sun.position.copy(SUN_DIR).multiplyScalar(160).add(sunTarget); sun.target.position.copy(sunTarget);
  sun.castShadow = true;
  const sm = +PARAMS.get('sm') || (!LOW && (maxPR > 1.4 || innerWidth > 1200) ? 4096 : 2048);
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -66, right: 66, top: 62, bottom: -62, near: 40, far: 330 });
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(C('#cfe0f0'), C('#8b8259'), 0.22));

  await stage(42, '正在堆起山坡与河岸……');
  scene.add(buildSky());
  scene.add(buildClouds()); mark('sky+clouds');
  scene.add(buildTerrain()); mark('terrain');
  const B = new Batch();
  ribbon(B, [[3.5, 80], [2.2, 52], [0.6, 30], [-1.0, 12], [-1.6, -6], [-1.0, -22], [-2.6, -40], [-7.5, -58], [-16, -76]], 6.4, 'cobble');
  buildQuay(B); mark('streets+quay');
  await stage(55, '正在砌墙与盖瓦……');
  buildTown(B); mark('town');
  await stage(66, '正在种下花草……');
  buildIvy(B); mark('ivy');
  const hero = makeTree(B, V3(-10.8, terrainH(-10.8, 35), 35), { seed: 3, crownY: 11.6, crownR: 6.6, crownRY: 3.4, trunkH: 6.4, trunkR: 0.6, lean: [1.8, -1.2], limbs: 4, depth: 3, fill: 18, cards: 16, card: 1.9, clumpR: 1.85, spread: 1.0, up: 0.12, leafCol: '#9fc46c', phase: 0.3 });
  makeTree(B, V3(5.8, 0, -23.6), { seed: 11, scale: 0.5, crownY: 5.4, crownR: 3.4, crownRY: 2.4, trunkH: 2.6, trunkR: 0.34, limbs: 3, depth: 2, fill: 8, cards: 13, card: 1.9, leafCol: '#93b964' });
  makeTree(B, V3(-31, terrainH(-31, 30), 30), { seed: 21, scale: 0.9, crownY: 8, crownR: 5.5, limbs: 3, depth: 2, fill: 10, cards: 13, card: 1.9, leafCol: '#8fb862' });
  makeCypress(B, V3(-17.5, 0, -15.5), 9.5, 1.3, 5); makeCypress(B, V3(-18.5, 0, -8.8), 7.5, 1.1, 6); makeCypress(B, V3(-21, 0, -35), 8.5, 1.2, 7);
  seed(1234);
  for (const [x, z] of [[-34, -60], [-16, -100], [6, -94], [-50, -44], [-30, -84], [-56, -20], [-48, 14], [-38, 44], [2, -106], [-62, -70]]) { const y = terrainH(x, z); makeTree(B, V3(x, y, z), { seed: Math.abs(x * 7 + z), scale: R(0.7, 1.0), crownY: 8, crownR: 5, limbs: 3, depth: 2, fill: 8, cards: 12, card: 2.0, leafCol: pick(['#8fb862', '#9cc06a', '#86ae5a']) }); }
  mark('trees'); scene.add(B.build(MAT)); mark('merge town');
  precompile(); // start compiling while the rest is generated
  populatePlants(); mark('populate plants');
  await stage(76, '正在让山坡长出森林……');
  scene.add(buildForest(scene)); mark('forest');
  const FB = new Batch(); buildCastle(FB); buildViaduct(FB);
  rocks(FB, riverAt(FALL_Z).cx + riverAt(FALL_Z).w + 2, FALL_Z + 10, 6, 7, 2.6); rocks(FB, riverAt(FALL_Z).cx + riverAt(FALL_Z).w + 14, FALL_Z + 6, 5, 6, 3);
  rocks(FB, riverAt(VIADUCT_Z).cx - riverAt(VIADUCT_Z).w - 6, VIADUCT_Z + 12, 6, 10, 3);
  buildWaterfall(scene, FB); mark('castle+viaduct+falls');
  scene.add(FB.build(MAT, { cast: false }));
  buildPlantMeshes(scene); mark('plant meshes');
  await stage(86, '正在唤醒小镇……');
  buildLife(scene);
  scene.add(buildBalusters());
  scene.add(buildWater()); mark('life+water');

  if (typeof window.__extraBuild === 'function') await window.__extraBuild(scene);
  await stage(96, '等风来……');
  setRipples();

  if (STILL) await CHARACTERS.ready; // screenshots & film wait for the girl and the cat; live pages show them as soon as they are sculpted
  await stage(98, '等风来……');
  await precompile(); mark('compile shaders');
  // post-processing (phones skip bloom)
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  if (!LOW) composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.14, 0.55, 0.92));
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);

  // camera + controls
  camera.position.copy(defaultPos());
  const controls = new OrbitControls(camera, canvasEl);
  controls.target.copy(defaultTarget());
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 3, maxDistance: 190, maxPolarAngle: Math.PI * 0.495, screenSpacePanning: true, rotateSpeed: 0.55, zoomSpeed: 0.8, panSpeed: 0.7 });
  if (PARAMS.get('cam')) { const v = PARAMS.get('cam').split(',').map(Number); camera.position.set(v[0], v[1], v[2]); controls.target.set(v[3], v[4], v[5]); }
  controls.update();

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    // narrow / portrait screens: widen the vertical FOV so the town still fits across
    camera.fov = camera.aspect < 1.5 ? Math.min(78, DEFAULT_VIEW.fov * Math.pow(1.5 / camera.aspect, 0.72)) : DEFAULT_VIEW.fov;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false);
    renderer.getDrawingBufferSize(size); composer.setPixelRatio(1); composer.setSize(size.x, size.y);
    grade.uniforms.uRes.value.set(size.x, size.y);
    REFL.rt.setSize(Math.round(size.x * REFL.scale), Math.round(size.y * REFL.scale));
  }
  addEventListener('resize', resize); resize();

  // keep camera above ground / water and the target inside the valley
  function constrain() {
    const t = controls.target; t.x = clamp(t.x, -120, 160); t.z = clamp(t.z, -420, 140); t.y = clamp(t.y, -1, 60);
    const g = Math.max(terrainH(camera.position.x, camera.position.z), WATER_Y) + 1.0;
    if (camera.position.y < g) camera.position.y = g;
  }

  setupUI({ camera, controls, renderer });

  // adaptive resolution
  let acc = 0, frames = 0, lastAdj = 0;
  const clock = new THREE.Clock(); let t = STILL ? 18 : 0; let nFrames = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!STILL) t += dt;
    U.time.value = t; WATER.material.uniforms.uTime.value = t; grade.uniforms.uTime.value = t; if (FALLS.mat) FALLS.mat.uniforms.uTime.value = t;
    renderer.info.reset();
    for (const u of UPDATERS) u(t, dt, camera);
    TOUR.update(dt, camera, controls);
    controls.update(); constrain();
    updateClouds(t, camera);
    renderReflection(renderer, scene, camera);
    composer.render();
    // adapt pixel ratio to keep things smooth
    acc += dt; frames++;
    if (acc > 2.5 && !STILL) {
      const ms = acc / frames * 1000; acc = 0; frames = 0;
      if (t - lastAdj > 4) {
        if (ms > 30 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio - 0.2); resize(); lastAdj = t; }
        else if (ms < 15 && pixelRatio < maxPR) { pixelRatio = Math.min(maxPR, pixelRatio + 0.15); resize(); lastAdj = t; }
      }
    }
    nFrames++;
    if (!(STILL && nFrames > 3)) requestAnimationFrame(frame);
  }
  if (DEBUG) window.__scene = scene;
  /* offline film rendering (used to export the tour video): render one frame at an exact time and return it as JPEG */
  if (PARAMS.has('film')) {
    grade.uniforms.uGrain.value = 0; controls.enableDamping = false;
    const out = document.createElement('canvas'); const o2 = out.getContext('2d');
    window.__renderFrame = (o) => {
      t = o.t; U.time.value = t; WATER.material.uniforms.uTime.value = t; grade.uniforms.uTime.value = t; if (FALLS.mat) FALLS.mat.uniforms.uTime.value = t;
      for (const u of UPDATERS) u(t, o.dt, camera);
      camera.position.set(...o.pos); controls.target.set(...o.tgt); camera.lookAt(controls.target); camera.updateMatrixWorld();
      updateClouds(t, camera); renderReflection(renderer, scene, camera); composer.render();
      const cv = renderer.domElement; out.width = cv.width; out.height = cv.height; o2.drawImage(cv, 0, 0);
      if (o.overlay) o.overlay(o2, out.width, out.height);
      for (const tx of o.texts || []) {
        if (tx.a <= 0.001) continue;
        if (tx.shade) { const g = o2.createRadialGradient(out.width / 2, out.height * tx.y, 0, out.width / 2, out.height * tx.y, out.width * 0.42);
          g.addColorStop(0, `rgba(36,26,16,${0.34 * tx.a})`); g.addColorStop(1, 'rgba(36,26,16,0)'); o2.fillStyle = g; o2.fillRect(0, 0, out.width, out.height); continue; }
        o2.save(); o2.globalAlpha = tx.a; o2.font = tx.font; o2.fillStyle = tx.color || '#fffaf0'; o2.textAlign = 'center'; o2.textBaseline = 'middle';
        o2.letterSpacing = tx.ls || '0px'; o2.shadowColor = 'rgba(40,28,16,0.55)'; o2.shadowBlur = tx.blur ?? 18; o2.fillText(tx.text, out.width * tx.x, out.height * tx.y); o2.restore();
      }
      return out.toDataURL('image/jpeg', 0.93);
    };
  }
  window.__setView = (p, tg) => { TOUR.stop(); camera.position.set(...p); controls.target.set(...tg); controls.update(); frame(); frame(); };
  window.__info = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, pr: pixelRatio });
  // warm up two frames before revealing
  mark('setup'); frame(); mark('first frame');
  await nextFrame(); await nextFrame();
  await stage(100, '');
  if (STILL) document.getElementById('loader').style.transition = 'none';
  document.getElementById('loader').classList.add('done');
  window.__ready = true;
}

/* ---------------- slow cinematic tour ---------------- */
const TOUR = {
  on: false, t: 0, shots: [
    { pos: [4.5, 5.2, 47], tgt: [-0.4, 5.6, -4], dur: 0 },
    { pos: [-2.6, 2.3, 31], tgt: [-11, 3.2, 16.5], dur: 11 },      // bakery window & awning
    { pos: [10.5, 1.9, 24], tgt: [17, 0.9, 15.4], dur: 12 },       // the girl and her cat by the water
    { pos: [24, 4.2, 4], tgt: [6, 6.5, -14], dur: 12 },             // across the water to the green-glass house
    { pos: [3, 9.5, 2], tgt: [-9.5, 15, -12.3], dur: 12 },          // up toward the round tower
    { pos: [22, 9, -24], tgt: [40, 14, -150], dur: 11 },            // out over the river
    { pos: [34, 12, -118], tgt: [74, 16, -200], dur: 13 },          // viaduct and waterfall
    { pos: [4.5, 5.2, 47], tgt: [-0.4, 5.6, -4], dur: 14 },
  ],
  start(camera, controls) {
    this.on = true; this.t = 0; this.i = 0;
    this.from = { pos: camera.position.clone(), tgt: controls.target.clone() };
    this.shots[0].pos = [camera.position.x, camera.position.y, camera.position.z];
    this.shots[0].tgt = [controls.target.x, controls.target.y, controls.target.z];
  },
  stop() { this.on = false; },
  update(dt, camera, controls) {
    if (!this.on) return;
    this.t += dt; const s = this.shots; let i = this.i + 1;
    if (i >= s.length) { this.on = false; document.getElementById('btn-tour')?.classList.remove('on'); return; }
    const k = clamp(this.t / s[i].dur, 0, 1); const e = k * k * k * (k * (k * 6 - 15) + 10);
    const a = s[i - 1], b = s[i];
    camera.position.set(lerp(a.pos[0], b.pos[0], e), lerp(a.pos[1], b.pos[1], e), lerp(a.pos[2], b.pos[2], e));
    controls.target.set(lerp(a.tgt[0], b.tgt[0], e), lerp(a.tgt[1], b.tgt[1], e), lerp(a.tgt[2], b.tgt[2], e));
    if (k >= 1) { this.i++; this.t = 0; }
  },
};

/* ---------------- UI ---------------- */
function setupUI({ camera, controls }) {
  const $ = (id) => document.getElementById(id);
  let tween = null;
  const resetView = () => {
    TOUR.stop(); $('btn-tour').classList.remove('on');
    const p0 = camera.position.clone(), t0 = controls.target.clone(), tgt = defaultTarget(), pos = defaultPos(); const start = performance.now();
    tween = () => { const k = clamp((performance.now() - start) / 1800, 0, 1); const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(p0, pos, e); controls.target.lerpVectors(t0, tgt, e); if (k >= 1) tween = null; };
  };
  UPDATERS.push(() => { if (tween) tween(); });
  const toggleTour = () => { if (TOUR.on) { TOUR.stop(); $('btn-tour').classList.remove('on'); } else { tween = null; TOUR.start(camera, controls); $('btn-tour').classList.add('on'); } };
  const toggleUI = () => document.body.classList.toggle('ui-hidden');
  const toggleFull = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.(); };
  $('btn-reset').onclick = resetView; $('btn-tour').onclick = toggleTour; $('btn-hide').onclick = toggleUI; $('btn-show').onclick = toggleUI; $('btn-full').onclick = toggleFull;
  controls.addEventListener('start', () => { if (TOUR.on) { TOUR.stop(); $('btn-tour').classList.remove('on'); } tween = null; });
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'r') resetView(); else if (k === 't') toggleTour(); else if (k === 'h') toggleUI(); else if (k === 'f') toggleFull();
  });
  if (PARAMS.has('clean')) document.body.classList.add('ui-hidden');
}

main().catch((err) => {
  console.error(err);
  const el = document.getElementById('loaderr'); el.hidden = false;
  el.textContent = '场景加载失败：' + (err && err.message ? err.message : err) + '。请使用支持 WebGL2 的现代浏览器（Chrome / Edge / Safari / Firefox 最新版）打开。';
});
