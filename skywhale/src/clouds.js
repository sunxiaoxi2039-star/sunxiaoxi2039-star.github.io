// SKY WHALE — painted clouds. Every cloud is a set of puffs (3D particles) drawn as
// camera-facing imposters with gouache-style cel shading: warm lit tops, cool bellies,
// cauliflower edges, soft shadow edges, silver linings, sphere depth for correct overlap with
// the whale, and soft contact where vapour hugs the hull. A particle simulation treats the
// whale as a moving solid: domes, bow waves, rolling collars, tearing, sheets sliding off the
// hull, strands, and slow healing.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, TAU, rng, fbm2, vnoise2 } = SW;
  const { SCENE_UNIFORMS, OUTS } = SW.SHADER_SCENE;

  const PUFF_VS = `
  in vec2 aCorner; in vec4 aA; in vec4 aB; in vec4 aC; in vec4 aD;
  ${SCENE_UNIFORMS}
  uniform vec3 uCamRight; uniform vec3 uCamUp;
  uniform vec3 uCloudFog; uniform float uCloudFogDen; uniform float uCloudFogStart;
  uniform vec3 uFlashPos; uniform float uFlashI; uniform float uFlashR;
  out vec2 vQ; out vec4 vL; out vec4 vD; out vec4 vM; out vec4 vX;
  void main(){
    vec3 c = aA.xyz; float r = aA.w;
    float st = aB.w;
    vec3 fwd = normalize(c - uCamPos);
    vec3 ax = aB.xyz;
    vec3 axp = ax - fwd*dot(ax, fwd);
    vec3 rt = uCamRight, up = uCamUp;
    if (abs(st - 1.0) > 0.001 && length(axp) > 1e-4) { rt = normalize(axp); up = cross(rt, fwd); }
    float sx = r*st, sy = st > 1.0 ? r/sqrt(st) : r;
    vec3 p = c + rt*aCorner.x*sx*1.08 + up*aCorner.y*sy*1.08;
    gl_Position = uViewProj*vec4(p, 1.0);
    vQ = aCorner*1.08;
    // per-puff lighting coefficients: n.L = a*qx + b*qy + c*nz (local), m = massN.L
    vec3 back = -fwd;
    vL = vec4(dot(rt, uLightDir), dot(up, uLightDir), dot(back, uLightDir), dot(aC.xyz, uLightDir));
    vD = aD;                       // ao, alpha, seed, softness
    // rim direction (screen-space light dir in the quad frame), mass blend, stretch
    vec2 lr = vec2(dot(rt, uLightDir), dot(up, uLightDir));
    float ll = length(lr);
    vM = vec4(ll > 1e-4 ? lr/ll : vec2(0.0), aC.w, max(st, 1.0));
    float dist = length(c - uCamPos);
    float fog = 1.0 - exp(-max(0.0, dist - uCloudFogStart)*uCloudFogDen);
    float vd = dot(c - uCamPos, -vec3(uView[0][2], uView[1][2], uView[2][2]));
    float fl = 0.0;
    if (uFlashI > 0.0) { vec3 tb = uFlashPos - c; float fd = length(tb); fl = exp(-fd/uFlashR)*uFlashI*(0.55 + 0.45*dot(aC.xyz, tb/max(fd,1e-3))); }
    vX = vec4(fog, vd, r, fl);
  }`;

  const PUFF_FS = `
  ${SCENE_UNIFORMS}
  uniform vec3 uCLit; uniform vec3 uCMid; uniform vec3 uCShad; uniform vec3 uCDeep; uniform vec3 uCRim;
  uniform vec4 uBands;       // t1 (lit), t2 (mid), edge softness, deep threshold
  uniform vec4 uEdge;        // lit edge softness, shadow edge softness, rim amount, lobe shadow
  uniform vec3 uCloudFog;
  uniform sampler2D uCharDepth; uniform sampler2D uCharMin; uniform float uUseChar; uniform int uMode; uniform float uCharScale;
  uniform vec3 uFlashC; uniform float uSat; uniform sampler2D uShape; uniform float uAoK;
  in vec2 vQ; in vec4 vL; in vec4 vD; in vec4 vM; in vec4 vX;
  ${OUTS}
  void main(){
    float seed = vD.z;
    float vi = floor(fract(seed*0.618)*16.0);
    float ang = seed*2.399; float ca = cos(ang), sa = sin(ang);
    vec2 qr = vec2(ca*vQ.x - sa*vQ.y, sa*vQ.x + ca*vQ.y);
    vec2 suv = (vec2(mod(vi,4.0), floor(vi/4.0)) + (qr*0.4 + 0.5)*0.96 + 0.02)*0.25;
    vec4 sh = texture(uShape, suv);
    float re = sh.r*1.4;
    if (re > 1.0) discard;
    float nz = sqrt(max(0.0, 1.0 - re*re));
    float rq = max(length(vQ), 1e-4);
    vec2 nxy = vQ*(re/rq);
    float dl = vL.x*nxy.x + vL.y*nxy.y + vL.z*nz;
    float d = mix(dl, vL.w, vM.z);
    float ao = vD.x;
    float lv = (d*0.5 + 0.5)*mix(1.0 - 0.55*uAoK, 1.0, ao) + (ao - 0.5)*0.12*uAoK + (sh.b - 0.5)*0.07;
    float es = uBands.z;
    float s1 = smoothstep(uBands.y - es, uBands.y + es, lv);
    float s2 = smoothstep(uBands.x - es, uBands.x + es, lv);
    vec3 col = mix(uCShad, uCMid, s1);
    col = mix(col, uCLit, s2);
    col = mix(uCDeep, col, smoothstep(uBands.w - es, uBands.w + es, lv));
    col *= (1.0 - uEdge.w*smoothstep(-0.15, -0.95, vQ.y)*(1.0 - s2*0.5)) * (1.0 + (sh.g - 0.5)*0.06);
    // silver lining on the sun side of the rim
    float rimM = smoothstep(0.72, 0.97, re) * smoothstep(0.2, 0.8, dot(vQ/rq, vM.xy)) * uEdge.z;
    col = mix(col, uCRim, rimM);
    col = mix(col, uFlashC, clamp(vX.w, 0.0, 1.0));
    if (uSat != 1.0) { float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, uSat); }
    float soft = mix(uEdge.y, uEdge.x, s2) + vD.w + (vM.w - 1.0)*0.12;
    // edge softness is a fraction of the puff, but never wider than ~5 px (big near puffs stay crisp)
    float fw = max(fwidth(re), 1e-5);
    soft = clamp(soft, fw*1.2, max(fw*1.2, fw*(4.0 + vD.w*40.0)));
    float a = (1.0 - smoothstep(1.0 - soft, 1.0, re)) * vD.y;
    if (uUseChar > 0.5) {
      float vd = vX.y - vX.z*nz*0.85/sqrt(vM.w);
      float cd = texelFetch(uCharDepth, ivec2(gl_FragCoord.xy*uCharScale), 0).r;
      float cdm = texelFetch(uCharMin, ivec2(gl_FragCoord.xy), 0).r;
      bool front = cdm < 1e8 && vd < cdm;
      if (uMode == 1 && front) discard;
      if (uMode == 2 && !front) discard;          // (front pass restores vapour over the whale's dilated footprint only)
      if (front && cd < 1e8) a *= smoothstep(0.0, vX.z*0.22, cd - vd);
    }
    col = mix(col, uCloudFog, vX.x);
    if (a < 0.003) discard;
    oColor = vec4(col*a, a);
    oAux = vec4(0.0, 0.0, 0.0, a);
  }`;

  const cnt0 = (p) => p.length === 0;
  function CloudRenderer(G) {
    const gl = G.gl;
    const prog = G.program('puff', PUFF_VS, PUFF_FS);
    const inst = G.instanced(prog, [{ name: 'aA', size: 4 }, { name: 'aB', size: 4 }, { name: 'aC', size: 4 }, { name: 'aD', size: 4 }]);
    // bake 16 puff shapes (cauliflower edges) into a half-float atlas
    const SZ = 128, AT = SZ * 4, data = new Float32Array(AT * AT * 4);
    for (let v = 0; v < 16; v++) {
      const ox = (v % 4) * SZ, oy = Math.floor(v / 4) * SZ, sd = v * 13.7 + 3;
      for (let j = 0; j < SZ; j++) for (let i = 0; i < SZ; i++) {
        const u = ((i + 0.5) / SZ - 0.02) / 0.96, w = ((j + 0.5) / SZ - 0.02) / 0.96;
        const qx = (u * 2 - 1) * 1.25, qy = (w * 2 - 1) * 1.25;
        const rq = Math.hypot(qx, qy) || 1e-4, dx = qx / rq, dy = qy / rq;
        const e = 1 - 0.14 * vnoise2(dx * 2.3 + sd, dy * 2.3 + sd * 0.7, 11) - 0.075 * vnoise2(dx * 5.1 + sd, dy * 5.1, 12) - 0.035 * vnoise2(dx * 11 + sd, dy * 11, 13);
        const k = ((oy + j) * AT + ox + i) * 4;
        data[k] = Math.min(rq / e, 1.39) / 1.4;
        data[k + 1] = 0.5 * vnoise2(qx * 3 + sd, qy * 3, 14) + 0.5 * vnoise2(qx * 7 + sd, qy * 7, 15);
        data[k + 2] = vnoise2(qx * 1.7 + sd, qy * 1.7, 16);
        data[k + 3] = 1;
      }
    }
    const shapeTex = G.texture({ w: AT, h: AT, data, format: 'rgba16f' });
    const CR = { prog, shapeTex };
    let buf = new Float32Array(16 * 4096);
    // puffs: array of {p,r,ax,st,mn,mk,ao,al,seed,soft}
    CR.draw = function (puffs, cam, scene, look, opts) {
      opts = opts || {};
      const n = puffs.length;
      if (!n || cnt0(puffs)) return;
      // back-to-front by view depth (use far edge so big puffs sort sensibly)
      const f = cam.fwd, cp = cam.pos;
      const order = new Array(n);
      for (let i = 0; i < n; i++) { const q = puffs[i].p; order[i] = [(q[0] - cp[0]) * f[0] + (q[1] - cp[1]) * f[1] + (q[2] - cp[2]) * f[2] + (opts.sortBias || 0) * puffs[i].r, i]; }
      order.sort((a, b) => b[0] - a[0]);
      if (buf.length < n * 16) buf = new Float32Array(n * 16 * 2);
      let k = 0, cnt = 0;
      const bb = opts.bbox; // screen rect of characters for the front pass [x0,y0,x1,y1] (top-left origin) and max depth
      for (const [dep, i] of order) {
        const q = puffs[i];
        if (dep < -q.r * 2 || q.al <= 0.002) continue;
        if (opts.mode === 2) {
          if (!bb || dep - q.r * 1.2 > bb[4]) continue;
          const sp = cam.project(q.p), rp = q.r * 1.1 * Math.max(1, q.st || 1) * cam.pxPerRad / Math.max(1, dep);
          if (sp[0] + rp < bb[0] || sp[0] - rp > bb[2] || sp[1] + rp < bb[1] || sp[1] - rp > bb[3]) continue;
        }
        const ax = q.ax || [1, 0, 0], mn = q.mn || [0, 1, 0];
        buf[k++] = q.p[0]; buf[k++] = q.p[1]; buf[k++] = q.p[2]; buf[k++] = q.r;
        buf[k++] = ax[0]; buf[k++] = ax[1]; buf[k++] = ax[2]; buf[k++] = q.st || 1;
        buf[k++] = mn[0]; buf[k++] = mn[1]; buf[k++] = mn[2]; buf[k++] = q.mk === undefined ? 0.5 : q.mk;
        buf[k++] = q.ao === undefined ? 1 : q.ao; buf[k++] = q.al === undefined ? 1 : q.al; buf[k++] = q.seed || 0; buf[k++] = q.soft || 0;
        cnt++;
      }
      inst.setData(buf.subarray(0, k), cnt);
      prog.use(scene).set({
        uCamRight: cam.right, uCamUp: cam.upv, uCharScale: opts.charScale || 1,
        uCLit: look.lit, uCMid: look.mid, uCShad: look.shad, uCDeep: look.deep || look.shad, uCRim: look.rim || look.lit,
        uBands: look.bands || [0.62, 0.42, 0.05, 0.18], uEdge: look.edge || [0.05, 0.22, 0.0, 0.08],
        uCloudFog: look.fog || [0.8, 0.85, 0.9], uCloudFogDen: look.fogDen || 0, uCloudFogStart: look.fogStart || 0,
        uCharDepth: opts.charDepth || G.noiseTex, uCharMin: opts.charMin || opts.charDepth || G.noiseTex, uUseChar: opts.charDepth ? 1 : 0, uMode: opts.mode || 0,
        uFlashPos: look.flashPos || [0, 0, 0], uFlashI: look.flashI || 0, uFlashR: look.flashR || 100, uFlashC: look.flashC || [1, 1, 1],
        uSat: look.sat === undefined ? 1 : look.sat, uShape: shapeTex, uAoK: look.aoK === undefined ? 1 : look.aoK,
      });
      G.blend('premult');
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      inst.draw();
      gl.depthMask(true); gl.enable(gl.DEPTH_TEST); G.blend(null);
    };
    return CR;
  }

  // ------------------------------------------------------------------ generators
  // Height of a cloud-sea surface at (x,z): rolling domes of varied scale
  function seaHeight(x, z, o) {
    const s = o.scale || 260;
    const a = fbm2(x / s, z / s, 4, o.seed || 1);
    const b = fbm2(x / (s * 0.35) + 11, z / (s * 0.35) - 7, 3, (o.seed || 1) + 9);
    return o.y + (a - 0.5) * (o.amp || 40) + Math.pow(b, 2.2) * (o.amp2 || 26);
  }
  // Cloud sea built from cumulus heads of varied size (core + cauliflower lobes + top detail) on
  // rolling swells. LOD rings around a focus; far rings flatten into horizontal strata; the
  // breakout region gets hidden interior layers that the simulation exposes when torn open.
  function sea(o) {
    const puffs = [];
    const F = o.focus, s0 = o.spacing || 12, R0 = o.detailR || 300, Rmax = o.radius || 6000;
    const seed = o.seed || 7;
    let level = 0, rIn = 0;
    while (rIn < Rmax) {
      const sp = s0 * Math.pow(2, level) * 2.3;   // head spacing
      const rOut = level === 0 ? R0 : rIn * 2;
      const n = Math.ceil(rOut / sp) + 1;
      for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
        const hh = (k) => SW.hash3(i * 7 + level * 1000 + k * 101, j * 13 - k * 37, seed);
        const x = F[0] + (i + 0.5 + (hh(1) - 0.5) * 0.9) * sp, z = F[2] + (j + 0.5 + (hh(2) - 0.5) * 0.9) * sp;
        const dx = x - F[0], dz = z - F[2], dist = Math.hypot(dx, dz);
        if (dist < rIn || dist >= rOut || dist > Rmax) continue;
        const ys = seaHeight(x, z, o);
        // head size: mostly modest, a few big ones (power law)
        const big = Math.pow(hh(3), 2.6);
        const Rh = sp * (0.62 + 0.85 * big + 0.18 * hh(4));
        const flat = level === 0 ? 1 : clamp(1.12 - 0.16 * level, 0.42, 1);
        const top = clamp((ys - (o.y - (o.amp || 40) * 0.5)) / ((o.amp || 40) + (o.amp2 || 26)), 0, 1);
        const core = [x, ys + Rh * (0.15 + 0.35 * big) - Rh * 0.55, z];
        const aoBase = clamp(0.5 + top * 0.45 + big * 0.15, 0.35, 1);
        const sd = hh(5) * 100;
        const add = (p, r, ao, mk, extra) => puffs.push(Object.assign({ p, r, mn: v3.norm(v3.lerp(v3.norm(v3.sub(p, [core[0], core[1] - Rh * 0.6, core[2]])), [0, 1, 0], 0.35)), mk, ao, al: 1, seed: sd + puffs.length * 0.731, soft: 0, rest: p.slice(), layer: 0, lvl: level, st: flat, ax: [0, 1, 0] }, extra || {}));
        add(core, Rh, aoBase * 0.92, 0.65);
        const nl = Math.round((level === 0 ? 3 + Math.floor(hh(6) * 4) : level < 3 ? 2 : 0) * (o.lobes === undefined ? 1 : o.lobes));
        for (let k = 0; k < nl; k++) {
          const a = hh(10 + k) * Math.PI * 2, el = 0.35 + 0.5 * hh(20 + k);
          const rl = Rh * (0.42 + 0.25 * hh(30 + k));
          const dir = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)];
          add(v3.madd(core, dir, Rh * 0.72), rl, Math.min(1, aoBase + 0.12 + 0.1 * dir[1]), 0.55);
        }
        if (level === 0 && o.detail !== false) for (let k = 0; k < 2; k++) {
          const a = hh(40 + k) * Math.PI * 2;
          const dir = [Math.cos(a) * 0.5, 0.85, Math.sin(a) * 0.5];
          add(v3.madd(core, dir, Rh * 0.95), Rh * (0.22 + 0.12 * hh(50 + k)), Math.min(1, aoBase + 0.2), 0.45);
        }
        // hidden interior layers below the surface in the breakout region
        if (o.deepFn ? o.deepFn(x, z) : dist < (o.deepR || 0)) {
          for (let L = 1; L < (o.layers || 3); L++) {
            const yy = ys - Rh * 0.55 - L * sp * 0.55;
            for (let k = 0; k < 2; k++) {
              const xx = x + (hh(60 + L * 3 + k) - 0.5) * sp * 0.8, zz = z + (hh(70 + L * 3 + k) - 0.5) * sp * 0.8;
              add([xx, yy, zz], sp * 0.62, clamp(0.42 - 0.12 * L, 0.08, 1), 0.3, { layer: L, hidden: true });
            }
          }
        }
      }
      rIn = rOut; level++;
    }
    return puffs;
  }
  // Towering cumulus: union of bubbles, puffs on bubble surfaces above a flat base.
  function cumulus(o) {
    const r = rng(o.seed || 3);
    const C = o.center, W = o.width, H = o.height;
    const baseY = C[1];
    const bubbles = [];
    // main body and towers
    bubbles.push({ c: [C[0], baseY + H * 0.28, C[2]], r: W * 0.42 });
    const nt = o.towers || 5;
    for (let i = 0; i < nt; i++) {
      const a = r() * TAU, d = r() * W * 0.28;
      const hh = H * (0.35 + 0.55 * r());
      bubbles.push({ c: [C[0] + Math.cos(a) * d, baseY + hh, C[2] + Math.sin(a) * d * (o.depthK || 0.7)], r: W * (0.16 + 0.14 * r()) * (1 - hh / H * 0.35) });
    }
    if (o.extra) o.extra.forEach((b) => bubbles.push(b));
    const puffs = [];
    const pr = o.puff || W * 0.07;
    for (const b of bubbles) {
      const area = 4 * Math.PI * b.r * b.r;
      const n = Math.min(900, Math.ceil(area / (pr * pr * 2.2)));
      for (let i = 0; i < n; i++) {
        // fibonacci sphere
        const y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996 + r() * 0.3;
        const dir = [Math.cos(th) * rr, y, Math.sin(th) * rr];
        let p = v3.madd(b.c, dir, b.r * (0.82 + 0.1 * r()));
        if (p[1] < baseY + pr * 0.2) { if (y < -0.2) continue; p[1] = baseY + pr * 0.4; }
        // skip points buried inside other bubbles (interior)
        let buried = false;
        for (const o2 of bubbles) if (o2 !== b && v3.dist(p, o2.c) < o2.r * 0.86) { buried = true; break; }
        if (buried) continue;
        const rad = pr * (0.7 + 0.7 * r()) * (b.r / (W * 0.3)) ** 0.25;
        const hgt = (p[1] - baseY) / H;
        puffs.push({ p, r: rad, mn: v3.norm(v3.lerp(dir, [0, 1, 0], 0.15)), mk: o.mk === undefined ? 0.6 : o.mk, ao: clamp(0.35 + hgt * 0.8, 0.25, 1), al: 1, seed: r() * 100, soft: 0, rest: p.slice() });
      }
      // a few large interior fillers so tears reveal shadowed insides
      for (let i = 0; i < (o.fill === false ? 0 : 6); i++) {
        const p = v3.add(b.c, [(r() - 0.5) * b.r, (r() - 0.5) * b.r * 0.8, (r() - 0.5) * b.r]);
        if (p[1] < baseY + pr) continue;
        puffs.push({ p, r: b.r * 0.55, mn: [0, 1, 0], mk: 0.3, ao: 0.25, al: 1, seed: r() * 100, soft: 0.05, rest: p.slice() });
      }
    }
    return puffs;
  }
  // flat wispy band (stratus/fractus), elongated puffs
  function wisps(o) {
    const r = rng(o.seed || 5);
    const puffs = [];
    for (let i = 0; i < o.count; i++) {
      const p = [o.center[0] + (r() - 0.5) * o.size[0], o.center[1] + (r() - 0.5) * o.size[1], o.center[2] + (r() - 0.5) * o.size[2]];
      const rad = o.r * (0.6 + 0.8 * r());
      puffs.push({ p, r: rad, ax: o.axis || [1, 0, 0], st: o.stretch * (0.7 + 0.6 * r()), mn: [0, 1, 0], mk: 0.7, ao: o.ao || 0.8, al: o.alpha || 0.8, seed: r() * 100, soft: o.soft || 0.25, rest: p.slice() });
    }
    return puffs;
  }

  // ------------------------------------------------------------------ simulation
  // Whale bodies as moving solids. `bodies(t)` returns [{pose}] ; puffs with .rest are dynamic.
  function CloudSim(puffs, o) {
    const S = { puffs, t: o.t0 || 0, dt: o.dt || 1 / 192 };
    for (const q of puffs) { q.v = [0, 0, 0]; q.r0 = q.r; q.al0 = q.al; q.ao0 = q.ao; q.st = q.st || 1; q.contact = 0; q.age = 0; if (q.hidden) { q.al = 0; q.expose = 0; } }
    const k = Object.assign({ spring: 0.06, springY: 0.10, drag: 0.9, push: 1.0, flow: 1.0, swirl: 0.35, friction: 0.55, lift: 1.0, heal: 1.0, stretchK: 0.08, noise: 0.6 }, o.k || {});
    // body capsules from a pose: centres and radii along the spine (coarse)
    function capsules(pose) {
      const out = [];
      const d = pose.d, L = d.L;
      for (let i = 0; i <= 26; i++) {
        const s = i / 26;
        const fr = SW.WHALE.frameAt(pose, s);
        const top = d.prof.top(s), bot = d.prof.bot(s), wid = d.prof.wid(s);
        const cap = SW.WHALE.capf(s);
        const ry = (top - bot) / 2 * L * cap, rz = wid * L * cap;
        const cy = (top + bot) / 2 * L * cap;
        out.push({ c: v3.madd(fr.C, fr.U, cy), r: Math.max(0.5, (ry + rz) / 2 * 1.02), U: fr.U, T: fr.T, s });
      }
      return out;
    }
    S.capsules = capsules;
    let prevCaps = null;
    S.step = function (bodies) {
      const dt = S.dt, t = S.t;
      const caps = bodies.map((b) => capsules(b));
      // body velocities by finite difference against previous step
      const vel = caps.map((cs, bi) => cs.map((c, i) => (prevCaps && prevCaps[bi] ? v3.scale(v3.sub(c.c, prevCaps[bi][i].c), 1 / dt) : [0, 0, 0])));
      for (const q of puffs) {
        if (!q.rest) continue;
        const p = q.p, v = q.v;
        if (q.hidden) {
          // exposure latch: once the whale comes close, interior vapour stays drawn (fades in)
          let near = 1e9;
          for (const cs of caps) for (let i = 0; i < cs.length; i += 2) { const dd = v3.dist(cs[i].c, p) - cs[i].r; if (dd < near) near = dd; }
          if (near < 70) q.expose = Math.min(1, (q.expose || 0) + dt * 2.0);
          if (!q.expose) { q.al = 0; continue; }
        }
        let ax = 0, ay = 0, az = 0;
        // restoring (buoyancy keeps the layer at its altitude; slow healing)
        ax += (q.rest[0] - p[0]) * k.spring * k.heal; az += (q.rest[2] - p[2]) * k.spring * k.heal;
        ay += (q.rest[1] - p[1]) * k.springY * k.heal;
        // drag
        const dr = Math.exp(-k.drag * dt);
        v[0] = v[0] * dr + ax * dt; v[1] = v[1] * dr + ay * dt; v[2] = v[2] * dr + az * dt;
        // living turbulence (slow curl-ish)
        if (k.noise) {
          const nx = vnoise2(p[0] * 0.01 + t * 0.05, p[2] * 0.01, 3) - 0.5, nz = vnoise2(p[2] * 0.01 - t * 0.05, p[0] * 0.01, 4) - 0.5;
          v[0] += nx * k.noise * dt; v[2] += nz * k.noise * dt;
        }
        let contact = 0;
        for (let bi = 0; bi < caps.length; bi++) {
          const cs = caps[bi], vs = vel[bi];
          // quick reject
          const mid = cs[11];
          if (v3.dist(mid.c, p) > pose_len(cs) * 0.75 + 60) continue;
          for (let i = 0; i < cs.length; i++) {
            const c = cs[i];
            const dx = p[0] - c.c[0], dy = p[1] - c.c[1], dz = p[2] - c.c[2];
            const dist = Math.hypot(dx, dy, dz) || 1e-3;
            const R = c.r + q.r0 * 0.35;
            const bv = vs[i];
            // potential flow around a moving sphere: displaced vapour flows around the body
            if (dist < R * 3.2 && k.flow) {
              const rr = R / dist, f = 0.5 * rr * rr * rr * k.flow;
              const nx = dx / dist, ny = dy / dist, nz = dz / dist;
              const ud = bv[0] * nx + bv[1] * ny + bv[2] * nz;
              const fx = f * (3 * ud * nx - bv[0]), fy = f * (3 * ud * ny - bv[1]), fz = f * (3 * ud * nz - bv[2]);
              // blend velocity toward the flow (vapour has little inertia)
              const blend = clamp(dt * 6 * smoothstep(R * 3.2, R * 1.1, dist), 0, 1);
              v[0] += (fx + bv[0] * 0.0 - v[0]) * blend * 0.5; v[1] += (fy - v[1]) * blend * 0.5; v[2] += (fz - v[2]) * blend * 0.5;
              // rolling collar: swirl around the body axis in the wake region
              if (k.swirl && dist < R * 2.0) {
                const T = c.T; const along = dx * T[0] + dy * T[1] + dz * T[2];
                const rx = dx - T[0] * along, ry = dy - T[1] * along, rz = dz - T[2] * along;
                const sw = k.swirl * smoothstep(R * 2.0, R, dist) * v3.len(bv) * 0.08;
                const cx = T[1] * rz - T[2] * ry, cy = T[2] * rx - T[0] * rz, cz = T[0] * ry - T[1] * rx;
                const cl = Math.hypot(cx, cy, cz) || 1;
                v[0] += cx / cl * sw * dt * 8; v[1] += cy / cl * sw * dt * 8; v[2] += cz / cl * sw * dt * 8;
              }
            }
            // no penetration: push to the surface, carry with friction
            if (dist < R) {
              const nx = dx / dist, ny = dy / dist, nz = dz / dist;
              p[0] = c.c[0] + nx * R; p[1] = c.c[1] + ny * R; p[2] = c.c[2] + nz * R;
              const vn = (v[0] - bv[0]) * nx + (v[1] - bv[1]) * ny + (v[2] - bv[2]) * nz;
              if (vn < 0) { v[0] -= vn * nx; v[1] -= vn * ny; v[2] -= vn * nz; }
              // tangential friction toward body velocity
              v[0] += (bv[0] - v[0]) * k.friction * dt * 4; v[1] += (bv[1] - v[1]) * k.friction * dt * 4; v[2] += (bv[2] - v[2]) * k.friction * dt * 4;
              contact = 1;
            }
          }
        }
        // vapour has little momentum: cap speed and how far it can be flung from its rest place
        const spd = Math.hypot(v[0], v[1], v[2]), vmax = k.vmax || 24;
        if (spd > vmax) { v[0] *= vmax / spd; v[1] *= vmax / spd; v[2] *= vmax / spd; }
        p[0] += v[0] * dt; p[1] += v[1] * dt; p[2] += v[2] * dt;
        const lift = p[1] - q.rest[1], lmax = k.liftMax || 70;
        if (lift > lmax) { p[1] = q.rest[1] + lmax; if (v[1] > 0) v[1] = 0; }
        // appearance: stretch along velocity (strands), thin, brighten when lifted
        const sp = Math.hypot(v[0], v[1], v[2]);
        const disp = v3.dist(p, q.rest);
        const stT = 1 + clamp(sp * k.stretchK, 0, 2.2);
        q.st = lerp(q.st, stT, clamp(dt * 3, 0, 1));
        if (sp > 0.5) q.ax = [v[0] / sp, v[1] / sp, v[2] / sp];
        q.r = q.r0 * (1 - 0.25 * clamp((q.st - 1) / 2, 0, 1));
        // lifted vapour is lit; torn-open interiors stay shadowed
        q.ao = lerp(q.ao0, Math.max(q.ao0, 0.95), clamp((p[1] - q.rest[1]) / (q.r0 * 3), 0, 1));
        q.contact = lerp(q.contact, contact, clamp(dt * 4, 0, 1));
        // fray: strongly displaced, fast puffs thin out
        const fray = clamp((disp - q.r0 * 2.5) / (q.r0 * 6), 0, 1) * clamp(sp / 12, 0, 1);
        q.al = q.al0 * (1 - 0.55 * fray) * (q.hidden ? q.expose : 1) * (1 - 0.85 * smoothstep(lmax * 0.45, lmax, lift));
        q.soft = 0.04 + 0.25 * clamp((q.st - 1) / 2, 0, 1) + 0.1 * fray;
      }
      prevCaps = caps;
      S.t += dt;
    };
    function pose_len(cs) { return v3.dist(cs[0].c, cs[cs.length - 1].c); }
    // advance to time t, with bodies(t) callback returning array of poses
    S.advance = function (t, bodies) {
      while (S.t < t - 1e-9) S.step(bodies(S.t));
    };
    return S;
  }

  SW.CloudRenderer = CloudRenderer;
  SW.CloudGen = { sea, cumulus, wisps, seaHeight };
  SW.CloudSim = CloudSim;
})(window.SW = window.SW || {});
