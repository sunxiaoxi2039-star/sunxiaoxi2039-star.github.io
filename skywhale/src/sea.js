// SKY WHALE — painted sea (Movement IV): calm dusk water with world-fixed painted wave strokes,
// a glitter road of crisp horizontal dashes under the low sun, the sky's reflection, and a
// true planar reflection of the whale broken by ripples.
(function (SW) {
  'use strict';
  const { v3, m4 } = SW;

  // Mirror a camera in the plane y = y0 (view * reflect). Winding flips: render with CW front faces.
  SW.reflectCamera = function (cam, y0) {
    y0 = y0 || 0;
    const R = m4.ident(); R[5] = -1; R[13] = 2 * y0;
    const c = Object.assign({}, cam);
    c.view = m4.mul(cam.view, R);
    c.viewProj = m4.mul(cam.proj, c.view);
    c.invViewProj = m4.invert(c.viewProj);
    c.pos = [cam.pos[0], 2 * y0 - cam.pos[1], cam.pos[2]];
    c.fwd = [cam.fwd[0], -cam.fwd[1], cam.fwd[2]];
    c.right = cam.right.slice();
    c.upv = [cam.upv[0], -cam.upv[1], cam.upv[2]];
    c.mirrored = true;
    c.project = function (p) { return cam.project([p[0], 2 * y0 - p[1], p[2]]); };
    c.depth = (p) => cam.depth([p[0], 2 * y0 - p[1], p[2]]);
    c.pxPerM = (p) => cam.pxPerM([p[0], 2 * y0 - p[1], p[2]]);
    return c;
  };

  const SEA_VS = `
  in vec2 aCorner;
  uniform mat4 uViewProj; uniform vec3 uCamPos; uniform float uSize; uniform float uY;
  out vec3 vPos;
  void main(){ vec3 p = vec3(uCamPos.x + aCorner.x*uSize, uY, uCamPos.z + aCorner.y*uSize); vPos = p; gl_Position = uViewProj*vec4(p,1.0); }`;
  const SEA_FS = `
  uniform vec3 uCamPos; uniform vec3 uSunDir; uniform float uTime; uniform vec2 uAcross;
  uniform vec3 uNear; uniform vec3 uFar; uniform vec3 uSkyHor; uniform vec3 uSkyUp; uniform vec3 uGlint; uniform vec3 uStroke; uniform vec3 uShadow;
  uniform sampler2D uRefl; uniform float uReflAmt; uniform vec3 uReflTint; uniform vec2 uRes; uniform float uGlitter; uniform float uRoadW;
  in vec3 vPos;
  layout(location=0) out vec4 o; layout(location=1) out vec4 oA;
  void main(){
    vec3 V = vPos - uCamPos; float d = length(V); V /= d;
    // camera-aligned water coordinates: u across the view, v along it
    vec2 xz = vPos.xz;
    float u = dot(xz, uAcross), v = dot(xz, vec2(-uAcross.y, uAcross.x));
    // long slow swells + small ripples (normals); animation is smooth, every frame
    float t = uTime;
    float sw = sin(v*0.045 + t*0.6)*0.6 + sin(v*0.083 - u*0.01 + t*0.9)*0.4;
    vec2 rp = vec2(u*0.05, v*0.9) + vec2(0.0, t*0.35);
    float rip = (vnoise(rp) - 0.5 + (vnoise(rp*2.1 + 7.0) - 0.5)*0.6) * smoothstep(0.0, 1.0, 1.0 - exp(-d/60.0));
    vec3 n = normalize(vec3(0.0, 1.0, 0.0) + vec3(0.0, 0.0, 0.0) + vec3(uAcross.x, 0.0, uAcross.y)*0.0 + vec3(-uAcross.y, 0.0, uAcross.x)*(sw*0.025 + rip*0.10));
    vec3 R = reflect(V, n);
    // reflected sky
    float el = max(R.y, 0.0);
    vec3 sky = mix(uSkyHor, uSkyUp, smoothstep(0.0, 0.5, el));
    float fres = 0.25 + 0.75*pow(1.0 - max(-V.y, 0.0), 4.0);
    vec3 water = mix(uNear, uFar, smoothstep(0.0, 1.0, 1.0 - exp(-d/2500.0)));
    vec3 c = mix(water, sky, fres*0.75);
    // painted wave strokes, fixed in the world (thin horizontal lines that crowd toward the horizon)
    float band = vnoise(vec2(u*0.004, v*0.06) + 3.0);
    float stroke = smoothstep(0.70, 0.74, vnoise(vec2(u*0.006, v*0.10) + vec2(t*0.02, 0.0))) * smoothstep(0.45, 0.8, band);
    c = mix(c, uStroke, stroke*0.22*exp(-d/2000.0));
    c = mix(c, uShadow, smoothstep(0.55, 0.75, vnoise(vec2(u*0.003, v*0.02) + 11.0))*0.18);
    // glitter road: crisp dashes where ripples reflect the sun
    float s = dot(R, normalize(uSunDir));
    float road = exp(-pow(acos(clamp(dot(normalize(vec2(V.x, V.z)), normalize(uSunDir.xz)), -1.0, 1.0))/uRoadW, 2.0));
    float dash = vnoise(vec2(u*0.08, v*1.6) + vec2(0.0, t*0.6));
    float g = smoothstep(0.985, 0.998, s) + road*smoothstep(0.80 - 0.25*road, 0.84 - 0.25*road, dash)*0.9;
    c = mix(c, uGlint, clamp(g*uGlitter, 0.0, 1.0));
    // whale reflection (planar), broken by ripples into horizontal streaks
    vec2 suv = gl_FragCoord.xy/uRes;
    vec2 off = vec2(rip*0.004, sw*0.002 + rip*0.008) * (300.0/(d+300.0));
    vec4 rf = texture(uRefl, suv + off);
    float br = smoothstep(0.25, 0.45, vnoise(vec2(u*0.02, v*0.5) + vec2(0.0, t*0.25)));
    c = mix(c, rf.rgb/max(rf.a,1e-3)*uReflTint, clamp(rf.a, 0.0, 1.0)*uReflAmt*(0.65 + 0.35*br));
    o = vec4(c, 1.0); oA = vec4(0.0);
  }`;

  function SeaRenderer(G) {
    const prog = G.program('sea', SEA_VS, SEA_FS);
    const quad = G.instanced(prog, [{ name: 'aDummy', size: 4 }]);
    quad.setData(new Float32Array([0, 0, 0, 0]), 1);
    return {
      draw(cam, k, t, refl) {
        const gl = G.gl;
        const f = [cam.fwd[0], cam.fwd[2]], fl = Math.hypot(f[0], f[1]) || 1;
        prog.use({
          uViewProj: cam.viewProj, uCamPos: cam.pos, uSize: 40000, uY: k.y || 0, uSunDir: k.sunDir, uTime: t, uAcross: [f[1] / fl, -f[0] / fl],
          uNear: k.near, uFar: k.far, uSkyHor: k.skyHor, uSkyUp: k.skyUp, uGlint: k.glint, uStroke: k.stroke, uShadow: k.shadow,
          uRefl: refl || G.noiseTex, uReflAmt: refl ? (k.reflAmt === undefined ? 0.8 : k.reflAmt) : 0, uReflTint: k.reflTint || [0.75, 0.7, 0.8], uRes: [G.W, G.H],
          uGlitter: k.glitter === undefined ? 1 : k.glitter, uRoadW: k.roadW || 0.06,
        });
        gl.disable(gl.DEPTH_TEST);
        quad.draw();
        gl.enable(gl.DEPTH_TEST);
      },
    };
  }
  SW.SeaRenderer = SeaRenderer;
})(window.SW = window.SW || {});
