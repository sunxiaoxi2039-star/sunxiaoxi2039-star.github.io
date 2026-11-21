// SKY WHALE — frame pipeline: MSAA scene target (+ character mask), character depth prepass,
// shadow map, and the finishing chain (light wrap, light-side diffusion, glow, grade, grain).
(function (SW) {
  'use strict';
  const { v3, m4, clamp } = SW;

  const BLUR_FS = `
  in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; uniform float uRad;
  layout(location=0) out vec4 o;
  void main(){
    vec4 s = vec4(0.0); float wsum = 0.0;
    for (int i=-8;i<=8;i++){
      float x = float(i)/8.0; float w = exp(-x*x*2.5);
      s += texture(uTex, vUv + uDir*x*uRad)*w; wsum += w;
    }
    o = s/wsum;
  }`;
  // prepare quarter-res inputs: rgb*(1-mask), (1-mask), mask, emissive
  const PREP_FS = `
  in vec2 vUv; uniform sampler2D uCol; uniform sampler2D uAux; uniform float uThresh;
  layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
  void main(){
    vec3 c = vec3(0.0); vec4 a = vec4(0.0);
    vec2 ts = 1.0/vec2(textureSize(uCol,0));
    for (int i=0;i<2;i++) for (int j=0;j<2;j++){ vec2 o = (vec2(i,j)-0.5)*ts*1.5; c += texture(uCol, vUv+o).rgb; a += texture(uAux, vUv+o); }
    c *= 0.25; a *= 0.25;
    float m = clamp(a.r, 0.0, 1.0);
    oA = vec4(c*(1.0-m), 1.0-m);                 // background-only premultiplied (for light wrap)
    float l = luma(c);
    oB = vec4(max(c - uThresh, 0.0) * smoothstep(uThresh, uThresh+0.25, l), m) ; // bright pass + mask
    oB.rgb += vec3(1.0,0.72,0.35)*a.g*1.4;      // emissive (eye) feeds the glow
  }`;
  const FINAL_FS = `
  in vec2 vUv;
  uniform sampler2D uCol; uniform sampler2D uAux; uniform sampler2D uBg; uniform sampler2D uGlow; uniform sampler2D uGlow2;
  uniform float uWrap; uniform float uBloom; uniform float uDiffuse; uniform float uGrain; uniform float uFrame2;
  uniform vec3 uLift; uniform vec3 uGain; uniform float uGamma; uniform float uSat; uniform float uDensity; uniform float uVignette;
  uniform vec3 uTint; uniform float uFade; uniform vec3 uFadeCol; uniform float uExposure;
  layout(location=0) out vec4 o;
  void main(){
    vec3 c = texture(uCol, vUv).rgb;
    vec4 aux = texture(uAux, vUv);
    float m = clamp(aux.r, 0.0, 1.0);
    // light wrap: background light bleeding over the inside of the silhouette
    vec4 bg = texture(uBg, vUv);
    vec3 bgc = bg.rgb/max(bg.a, 1e-3);
    float mb = texture(uGlow, vUv).a;            // blurred mask (narrow)
    float wrap = m * clamp((1.0 - mb)*1.6, 0.0, 1.0) * smoothstep(0.02, 0.2, bg.a);
    c = c + (1.0 - c) * bgc * wrap * uWrap;       // screen
    // light-side diffusion and bloom
    vec3 g1 = texture(uGlow, vUv).rgb, g2 = texture(uGlow2, vUv).rgb;
    vec3 glow = g1*0.6 + g2*0.8;
    c = c + (1.0 - c)*glow*uBloom;
    vec3 soft = texture(uGlow2, vUv).rgb;
    c = mix(c, max(c, c*0.6 + (g1+g2)*0.9), uDiffuse*smoothstep(0.35, 0.95, luma(c)));
    // exposure / grade (density rather than brightening)
    c *= uExposure;
    c = c*uTint;
    c = uLift + (uGain - uLift)*c;
    c = pow(max(c, 0.0), vec3(uGamma));
    float l = luma(c);
    c = mix(vec3(l), c, uSat);
    c = c - uDensity*c*(1.0-c)*0.6;              // denser midtones, highlights preserved
    // vignette
    vec2 q = vUv - 0.5; q.x *= 1.777;
    c *= 1.0 - uVignette*smoothstep(0.35, 1.05, length(q));
    c = mix(c, uFadeCol, uFade);
    // film grain, new pattern every 2 frames (24 Hz)
    vec2 gp = gl_FragCoord.xy + vec2(uFrame2*37.0, uFrame2*91.0);
    float gn = (h21(gp) + h21(gp*0.5+13.0)*0.6 - 0.8);
    float gl = 0.6 + 0.8*(1.0 - abs(l - 0.5)*2.0);
    c += gn * uGrain * gl;
    o = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`;

  function Pipeline(G) {
    const gl = G.gl, W = G.W, H = G.H;
    const P = { G, W, H };
    P.main = G.fbo({ w: W, h: H, colors: ['rgba16f', 'rgba16f'], depth: true });
    P.res = P.main;
    P.charMS = G.fbo({ w: W, h: H, colors: ['rgba8', 'rgba8'], depth: true, samples: 4 });
    P.charRes = G.fbo({ w: W, h: H, colors: ['rgba8', 'rgba8'] });
    P.refl = G.fbo({ w: W, h: H, colors: ['rgba8'] });
    P.resolveReflection = function () {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, P.charMS.fb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, P.refl.fb);
      gl.readBuffer(gl.COLOR_ATTACHMENT0); gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    };
    P.cloudScale = SW.CLOUD_SCALE || 0.5;
    P.cloud = G.fbo({ w: Math.round(W * P.cloudScale), h: Math.round(H * P.cloudScale), colors: ['rgba16f'] });
    P.charMin = G.fbo({ w: Math.round(W * P.cloudScale), h: Math.round(H * P.cloudScale), colors: ['r32f'], filter: 'nearest' });
    P.pre = G.fbo({ w: W, h: H, colors: ['r32f'], depth: true, filter: 'nearest' });
    P.shadow = G.fbo({ w: 2048, h: 2048, colors: [], depth: 'tex' });
    const qw = Math.round(W / 4), qh = Math.round(H / 4);
    P.q1 = G.fbo({ w: qw, h: qh, colors: ['rgba16f', 'rgba16f'] });
    P.qa = G.fbo({ w: qw, h: qh, colors: ['rgba16f'] });
    P.qb = G.fbo({ w: qw, h: qh, colors: ['rgba16f'] });
    P.qc = G.fbo({ w: qw, h: qh, colors: ['rgba16f'] });
    P.qd = G.fbo({ w: qw, h: qh, colors: ['rgba16f'] });
    P.qe = G.fbo({ w: qw, h: qh, colors: ['rgba16f'] });
    const progs = {
      blur: G.program('blur', G.FS_VS, BLUR_FS),
      prep: G.program('prep', G.FS_VS, PREP_FS),
      final: G.program('final', G.FS_VS, FINAL_FS),
      dmin: G.program('depthmin', G.FS_VS, `
        in vec2 vUv; uniform sampler2D uD; uniform float uS; uniform int uR;
        layout(location=0) out vec4 o;
        void main(){
          ivec2 c = ivec2(gl_FragCoord.xy*uS); ivec2 sz = textureSize(uD, 0) - 1;
          float m = 1e9;
          for (int j=-6;j<=7;j++) for (int i=-6;i<=7;i++){
            if (abs(i) > uR + 1 || abs(j) > uR + 1) continue;
            m = min(m, texelFetch(uD, clamp(c + ivec2(i,j), ivec2(0), sz), 0).r);
          }
          o = vec4(m);
        }`),
      up: G.program('upsample', G.FS_VS, `
        in vec2 vUv; uniform sampler2D uT; uniform float uAux;
        layout(location=0) out vec4 o; layout(location=1) out vec4 oA;
        vec4 cr(vec2 uv, vec2 ts){
          vec2 sp = uv*ts; vec2 t1 = floor(sp - 0.5) + 0.5; vec2 f = sp - t1;
          vec2 w0 = f*(-0.5 + f*(1.0 - 0.5*f)), w1 = 1.0 + f*f*(-2.5 + 1.5*f), w2 = f*(0.5 + f*(2.0 - 1.5*f)), w3 = f*f*(-0.5 + 0.5*f);
          vec2 w12 = w1 + w2, t12 = (t1 + w2/w12)/ts, t0 = (t1 - 1.0)/ts, t3 = (t1 + 2.0)/ts;
          vec4 r = texture(uT, vec2(t0.x,t0.y))*w0.x*w0.y + texture(uT, vec2(t12.x,t0.y))*w12.x*w0.y + texture(uT, vec2(t3.x,t0.y))*w3.x*w0.y
                 + texture(uT, vec2(t0.x,t12.y))*w0.x*w12.y + texture(uT, vec2(t12.x,t12.y))*w12.x*w12.y + texture(uT, vec2(t3.x,t12.y))*w3.x*w12.y
                 + texture(uT, vec2(t0.x,t3.y))*w0.x*w3.y + texture(uT, vec2(t12.x,t3.y))*w12.x*w3.y + texture(uT, vec2(t3.x,t3.y))*w3.x*w3.y;
          return r;
        }
        void main(){
          vec4 c = cr(vUv, vec2(textureSize(uT, 0)));
          c.a = clamp(c.a, 0.0, 1.0); c.rgb = clamp(c.rgb, vec3(0.0), vec3(c.a*1.2 + 0.001));
          if (c.a < 0.002) discard;
          o = c; oA = vec4(0.0, 0.0, 0.0, c.a*uAux);
        }`),
      comp: G.program('comp', G.FS_VS, `
        in vec2 vUv; uniform sampler2D uC; uniform sampler2D uA; uniform vec4 uRect;
        layout(location=0) out vec4 o; layout(location=1) out vec4 oA;
        void main(){
          vec2 px = gl_FragCoord.xy;
          if (px.x < uRect.x || px.y < uRect.y || px.x > uRect.z || px.y > uRect.w) discard;
          vec4 c = texelFetch(uC, ivec2(px), 0); vec4 a = texelFetch(uA, ivec2(px), 0);
          if (c.a <= 0.0) discard;
          o = c; oA = vec4(a.r, a.g, 0.0, c.a);
        }`),
    };
    P.progs = progs;

    // Shared scene uniforms for a camera + light rig
    P.sceneUniforms = function (cam, light, pass) {
      const L = v3.norm(light.sunDir);
      const lv = [cam.view[0] * L[0] + cam.view[4] * L[1] + cam.view[8] * L[2], cam.view[1] * L[0] + cam.view[5] * L[1] + cam.view[9] * L[2]];
      const ll = Math.hypot(lv[0], lv[1]) || 1;
      return {
        uViewProj: cam.viewProj, uView: cam.view, uCamPos: cam.pos,
        uLightDir: L, uLightScr: [lv[0] / ll, lv[1] / ll],
        uKey: light.key || [1, 1, 1], uShade: light.shade || [0.6, 0.65, 0.85],
        uRimCol: light.rimCol || [1, 0.95, 0.85], uRimAmt: light.rimAmt === undefined ? 1 : light.rimAmt,
        uInk: light.ink || [0.14, 0.12, 0.13], uBounce: light.bounce || [1.15, 1.05, 0.95], uBounceAmt: light.bounceAmt === undefined ? 0.6 : light.bounceAmt,
        uFogCol: light.fogCol || [0.8, 0.85, 0.95], uFogDen: light.fogDen || 0.0, uFogStart: light.fogStart || 0,
        uFlash: light.flash || [0, 0, 0, 0], uFlashCol: light.flashCol || [1, 1, 1],
        uPass: pass || 0, uShadowOn: light.shadowOn && pass !== 1 ? 1 : 0, uShadow: pass === 1 ? G.noiseTex : P.shadow.depthTex, uLightVP: light.lightVP || m4.ident(), uShadowBias: light.shadowBias || 0.0015,
        uNear: cam.near, uFar: cam.far, uFocal: cam.proj ? cam.proj[5] : 1, uEyeTint: light.eyeTint || [1.15, 1.0, 0.85],
        inkW: light.inkW, rimW: light.rimW,
      };
    };
    // Fit an orthographic light camera around a sphere (centre, radius)
    P.lightCam = function (light, center, radius) {
      const L = v3.norm(light.sunDir);
      const eye = v3.madd(center, L, radius * 2);
      const up = Math.abs(L[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
      const view = m4.lookAt(eye, center, up);
      const proj = m4.ortho(-radius, radius, -radius, radius, radius * 0.5, radius * 3.5);
      const vp = m4.mul(proj, view);
      return { pos: eye, view, viewProj: vp, near: radius * 0.5, far: radius * 3.5, pxPerM: () => 2048 / (2 * radius), right: [view[0], view[4], view[8]], fwd: v3.scale(L, -1) };
    };

    P.beginShadow = function () {
      G.bind(P.shadow);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
      G.blend(null);
    };
    P.beginPre = function () {
      G.bind(P.pre);
      gl.clearColor(1e9, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
      G.blend(null);
    };
    P.beginMain = function () {
      G.bind(P.main);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    };
    P.resolve = function () { };
    // dilated (min) character depth at cloud resolution: in-front vapour safely overlaps the AA edge
    P.makeCharMin = function () {
      G.bind(P.charMin); gl.disable(gl.DEPTH_TEST); G.blend(null);
      progs.dmin.use({ uD: P.pre.colors[0], uS: 1 / P.cloudScale, uR: Math.round(2 / P.cloudScale) + 1 });
      G.fullscreen();
      gl.enable(gl.DEPTH_TEST);
    };
    P.beginCloud = function () {
      G.bind(P.cloud); gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    };
    P.compositeCloud = function (aux) {
      G.bind(P.main); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.disable(gl.DEPTH_TEST); G.blend('premult');
      progs.up.use({ uT: P.cloud.colors[0], uAux: aux ? 1 : 0 });
      G.fullscreen();
      G.blend(null); gl.enable(gl.DEPTH_TEST);
    };
    // characters: MSAA pass on a transparent target, resolved only inside their screen rectangle
    P.beginChar = function () {
      G.bind(P.charMS);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    };
    P.compositeChar = function (rect) {
      // rect in pixels [x0,y0,x1,y1] (GL origin bottom-left)
      const r = rect.map((v, i) => Math.max(0, Math.min(i % 2 ? H : W, Math.round(v))));
      if (r[2] <= r[0] || r[3] <= r[1]) return;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, P.charMS.fb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, P.charRes.fb);
      for (let i = 0; i < 2; i++) {
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + i);
        gl.drawBuffers(i === 0 ? [gl.COLOR_ATTACHMENT0, gl.NONE] : [gl.NONE, gl.COLOR_ATTACHMENT1]);
        gl.blitFramebuffer(r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3], gl.COLOR_BUFFER_BIT, gl.NEAREST);
      }
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      G.bind(P.main);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.disable(gl.DEPTH_TEST);
      G.blend('premult');
      progs.comp.use({ uC: P.charRes.colors[0], uA: P.charRes.colors[1], uRect: [r[0], r[1], r[2], r[3]] });
      G.fullscreen();
      G.blend(null);
      gl.enable(gl.DEPTH_TEST);
    };

    function blur(src, dst, dx, dy, rad) {
      G.bind(dst);
      progs.blur.use({ uTex: src.colors[0], uDir: [dx / src.w, dy / src.h], uRad: rad });
      G.fullscreen();
    }
    // Finishing. grade = {wrap,bloom,diffuse,grain,lift,gain,gamma,sat,density,vignette,tint,fade,fadeCol,exposure,thresh}
    P.finish = function (frame, grade) {
      grade = grade || {};
      gl.disable(gl.DEPTH_TEST); G.blend(null);
      // quarter-res prep (MRT): bg-only premult, bright pass + mask
      G.bind(P.q1);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      progs.prep.use({ uCol: P.res.colors[0], uAux: P.res.colors[1], uThresh: grade.thresh === undefined ? 0.72 : grade.thresh });
      G.fullscreen();
      // light-wrap background blur (qa), glow small (qc), glow large (qe; alpha = blurred mask)
      const q1a = { colors: [P.q1.colors[0]], w: P.q1.w, h: P.q1.h };
      const q1b = { colors: [P.q1.colors[1]], w: P.q1.w, h: P.q1.h };
      blur(q1a, P.qb, 1, 0, 6); blur(P.qb, P.qa, 0, 1, 6);
      blur(q1b, P.qb, 1, 0, 4); blur(P.qb, P.qc, 0, 1, 4);
      blur(P.qc, P.qd, 1, 0, 16); blur(P.qd, P.qe, 0, 1, 16);
      // final
      G.bind(null);
      progs.final.use({
        uCol: P.res.colors[0], uAux: P.res.colors[1], uBg: P.qa.colors[0], uGlow: P.qc.colors[0], uGlow2: P.qe.colors[0],
        uWrap: grade.wrap === undefined ? 0.28 : grade.wrap, uBloom: grade.bloom === undefined ? 0.35 : grade.bloom,
        uDiffuse: grade.diffuse === undefined ? 0.25 : grade.diffuse, uGrain: grade.grain === undefined ? 0.018 : grade.grain,
        uFrame2: Math.floor(frame / 2) % 997,
        uLift: grade.lift || [0, 0, 0], uGain: grade.gain || [1, 1, 1], uGamma: grade.gamma || 1, uSat: grade.sat === undefined ? 1 : grade.sat,
        uDensity: grade.density === undefined ? 0.15 : grade.density, uVignette: grade.vignette === undefined ? 0.12 : grade.vignette,
        uTint: grade.tint || [1, 1, 1], uFade: grade.fade || 0, uFadeCol: grade.fadeCol || [0, 0, 0], uExposure: grade.exposure || 1,
      });
      G.fullscreen();
    };
    return P;
  }
  SW.Pipeline = Pipeline;
})(window.SW = window.SW || {});
