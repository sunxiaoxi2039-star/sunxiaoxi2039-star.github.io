// SKY WHALE — painted sky dome. Evaluated per pixel from the world view direction, so every
// brush mark is fixed in the world and nothing slides or stutters when the camera moves.
(function (SW) {
  'use strict';
  const { v3 } = SW;
  const SKY_FS = `
  in vec2 vUv;
  uniform mat4 uInvVP; uniform vec3 uCamPos;
  uniform vec3 uZen; uniform vec3 uUp; uniform vec3 uHor; uniform vec3 uBelow; uniform vec4 uStops; // elev of up, horizon softness, below, curve
  uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uGlowCol; uniform vec4 uSun; // radius(rad), glow size, glow amt, disc amt
  uniform vec3 uHazeCol; uniform float uHazeAmt; uniform float uHazeW;
  uniform vec4 uBandA; uniform vec4 uBandB; uniform vec4 uBandC;  // elev centre, half-thickness, coverage, scale
  uniform vec3 uBandLit; uniform vec3 uBandShade; uniform float uBandAmt;
  uniform float uStars; uniform vec3 uMoonDir; uniform vec4 uMoon; uniform vec3 uMoonCol; // radius, halo size, halo amt, on
  uniform vec4 uRainbow; uniform vec3 uRbDir; // amount, radius(rad), width, start
  uniform float uBrush; uniform float uTime2;
  layout(location=0) out vec4 o; layout(location=1) out vec4 oAux;
  vec3 rayDir(vec2 uv){
    vec4 a = uInvVP*vec4(uv*2.0-1.0, -1.0, 1.0), b = uInvVP*vec4(uv*2.0-1.0, 1.0, 1.0);
    return normalize(b.xyz/b.w - a.xyz/a.w);
  }
  float band(vec3 d, vec4 B, float az, float el){
    if (B.z <= 0.0) return 0.0;
    float env = 1.0 - smoothstep(B.y*0.5, B.y, abs(el - B.x));
    float n = fbm(vec2(az*B.w, el*B.w*6.0) + B.x*31.0, 5);
    float streak = fbm(vec2(az*B.w*0.35, el*B.w*16.0) + 7.0, 3);
    float v = n*0.75 + streak*0.35;
    return smoothstep(1.0 - B.z, 1.0 - B.z + 0.10, v) * env;
  }
  void main(){
    vec3 d = rayDir(vUv);
    float el = asin(clamp(d.y, -1.0, 1.0));
    float az = atan(d.x, -d.z);
    // gradient stops (painted, slightly uneven)
    float wob = (fbm(vec2(az*1.3, el*3.0)+3.0, 3) - 0.5)*0.05;
    float e = el + wob;
    vec3 c;
    if (e > 0.0) {
      float t1 = smoothstep(0.0, uStops.x, e);
      c = mix(uHor, uUp, pow(t1, uStops.w));
      c = mix(c, uZen, smoothstep(uStops.x, 1.4, e));
    } else {
      c = mix(uHor, uBelow, smoothstep(0.0, uStops.z, -e));
    }
    // sun glow
    float cs = dot(d, normalize(uSunDir));
    float ang = acos(clamp(cs, -1.0, 1.0));
    c += uGlowCol * uSun.z * (exp(-ang/uSun.y) * 0.7 + exp(-ang/(uSun.y*0.25)) * 0.5);
    // horizon haze band (warmer toward the sun)
    float hz = exp(-abs(el)/uHazeW) * uHazeAmt;
    c = mix(c, uHazeCol + uGlowCol*0.25*exp(-ang/0.6)*uSun.z, clamp(hz, 0.0, 1.0));
    // painted stratus bands
    float b = max(max(band(d, uBandA, az, el), band(d, uBandB, az, el)), band(d, uBandC, az, el)) * uBandAmt;
    if (b > 0.0) {
      float sunSide = pow(clamp(cs*0.5+0.5, 0.0, 1.0), 3.0);
      float under = fbm(vec2(az*9.0, el*60.0)+1.0, 3);
      vec3 bc = mix(uBandShade, uBandLit, clamp(sunSide*1.2 + (under-0.5)*0.4, 0.0, 1.0));
      // lit lower edge near the sun (gold underside at dawn/dusk)
      bc = mix(bc, uGlowCol*1.1 + bc*0.5, exp(-ang/0.5)*0.6*uSun.z);
      c = mix(c, bc, b);
    }
    // rainbow (soft, painted bands)
    if (uRainbow.x > 0.0) {
      float ra = acos(clamp(dot(d, normalize(uRbDir)), -1.0, 1.0));
      float x = (ra - uRainbow.y)/uRainbow.z; // -1..1 across the bow
      float on = (1.0 - smoothstep(0.8, 1.2, abs(x))) * smoothstep(uRainbow.w - 0.05, uRainbow.w + 0.1, el);
      // soft painted bands: red outside, violet inside, washed into the sky
      vec3 rb = vec3(smoothstep(-0.1, 0.8, x), exp(-pow((x-0.05)/0.5,2.0)), smoothstep(0.1,-0.8,x));
      rb = mix(rb, vec3(dot(rb, vec3(0.333))), 0.35);
      float edge = 1.0 - smoothstep(0.55, 1.15, abs(x));
      c = mix(c, c*0.92 + rb*0.32 + 0.04, edge * smoothstep(uRainbow.w - 0.05, uRainbow.w + 0.1, el) * uRainbow.x);
      c = mix(c, c*0.96, (1.0 - smoothstep(1.0, 2.6, -x)) * step(x, -1.0) * uRainbow.x * 0.6); // brighter inside the bow (Alexander's band contrast)
    }
    // stars
    if (uStars > 0.0 && el > 0.0) {
      vec2 sp = vec2(az, el)*vec2(260.0, 260.0);
      vec2 cell = floor(sp); vec2 f = fract(sp) - 0.5;
      float h = h21(cell + 3.0);
      if (h > 0.955) {
        vec2 off = vec2(h21(cell+7.0), h21(cell+11.0)) - 0.5;
        float dd = length(f - off*0.6);
        float tw = 0.75 + 0.25*sin(uTime2*0.9 + h*60.0);
        float sz = 0.06 + 0.12*h21(cell+13.0);
        float s = (1.0 - smoothstep(sz*0.4, sz, dd)) * tw * smoothstep(0.02, 0.25, el);
        c += vec3(0.95, 0.92, 1.0) * s * uStars * (0.5 + 0.5*h21(cell+17.0));
      }
    }
    // moon
    if (uMoon.w > 0.0) {
      float ma = acos(clamp(dot(d, normalize(uMoonDir)), -1.0, 1.0));
      c += uMoonCol * uMoon.z * (exp(-ma/uMoon.y)*0.6 + exp(-ma/(uMoon.y*0.3))*0.4);
      if (ma < uMoon.x*1.05) {
        vec3 md = normalize(uMoonDir);
        vec3 mr = normalize(cross(md, vec3(0.0,1.0,0.0))); vec3 mu = cross(mr, md);
        vec2 q = vec2(dot(d - md, mr), dot(d - md, mu))/uMoon.x;
        float disc = 1.0 - smoothstep(0.96, 1.0, length(q));
        float maria = fbm(q*2.2 + 5.0, 4);
        vec3 mc = mix(vec3(1.0, 0.97, 0.88), vec3(0.80, 0.80, 0.86), smoothstep(0.5, 0.68, maria)*0.8);
        mc *= 0.95 + 0.05*(1.0 - length(q));
        c = mix(c, mc*uMoonCol, disc);
      }
    }
    // sun disc
    if (uSun.w > 0.0) c = mix(c, uSunCol, (1.0 - smoothstep(uSun.x*0.92, uSun.x, ang))*uSun.w);
    // brush texture fixed to the dome
    c *= 1.0 + (fbm(vec2(az*60.0, el*220.0), 3) - 0.5)*uBrush + (vnoise(vec2(az*400.0, el*90.0)) - 0.5)*uBrush*0.4;
    o = vec4(c, 1.0); oAux = vec4(0.0);
  }`;

  function SkyRenderer(G) {
    const prog = G.program('sky', G.FS_VS, SKY_FS);
    const S = {};
    S.draw = function (cam, k, t) {
      const gl = G.gl;
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      const z4 = [0, 0, 0, 0];
      prog.use({
        uInvVP: cam.invViewProj, uCamPos: cam.pos,
        uZen: k.zen, uUp: k.up, uHor: k.hor, uBelow: k.below || k.hor, uStops: k.stops || [0.45, 0.1, 0.2, 0.8],
        uSunDir: k.sunDir, uSunCol: k.sunCol || [1, 1, 0.9], uGlowCol: k.glowCol || [1, 0.8, 0.5], uSun: k.sun || [0.012, 0.35, 0.5, 1],
        uHazeCol: k.hazeCol || k.hor, uHazeAmt: k.hazeAmt || 0, uHazeW: k.hazeW || 0.08,
        uBandA: k.bandA || z4, uBandB: k.bandB || z4, uBandC: k.bandC || z4,
        uBandLit: k.bandLit || [1, 0.9, 0.8], uBandShade: k.bandShade || [0.7, 0.7, 0.8], uBandAmt: k.bandAmt === undefined ? 1 : k.bandAmt,
        uStars: k.stars || 0, uMoonDir: k.moonDir || [0, 1, 0], uMoon: k.moon || z4, uMoonCol: k.moonCol || [1, 1, 1],
        uRainbow: k.rainbow || z4, uRbDir: k.rbDir || [0, 0, 1], uBrush: k.brush === undefined ? 0.035 : k.brush, uTime2: Math.floor((t || 0) * 24) / 24,
      });
      G.fullscreen();
      gl.depthMask(true);
    };
    return S;
  }
  SW.SkyRenderer = SkyRenderer;
})(window.SW = window.SW || {});
