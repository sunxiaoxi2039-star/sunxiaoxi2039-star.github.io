// SKY WHALE — whale renderer: body (cel-shaded hull with per-pixel plates, rivets, rust, keel,
// moss, eye, vents, ink), junk-sail fins, fluke, tubes (spars, mast, rigging, trunk).
// Everything is evaluated from stable body coordinates, so nothing boils between frames.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, TAU, hex } = SW;

  // ---------------------------------------------------------------- shared shader chunks
  const SCENE_UNIFORMS = `
  uniform mat4 uViewProj; uniform mat4 uView; uniform mat4 uLightVP;
  uniform vec3 uCamPos; uniform vec3 uLightDir; uniform vec2 uLightScr;
  uniform vec3 uKey; uniform vec3 uShade; uniform vec3 uRimCol; uniform float uRimAmt; uniform float uRimW;
  uniform vec3 uInk; uniform float uInkW; uniform vec3 uBounce; uniform float uBounceAmt;
  uniform vec3 uFogCol; uniform float uFogDen; uniform float uFogStart;
  uniform vec4 uFlash; uniform vec3 uFlashCol;
  uniform int uPass; uniform float uShadowOn; uniform sampler2D uShadow; uniform float uShadowBias;
  uniform float uNear; uniform float uFar; uniform float uEmissive;
  uniform vec3 uEyeTint; uniform float uFocal;
  `;
  const SCENE_FUNCS = `
  float shadowAt(vec3 p, vec3 n){
    if (uShadowOn < 0.5) return 1.0;
    vec4 lp = uLightVP * vec4(p + n*0.35, 1.0);
    vec3 c = lp.xyz/lp.w*0.5+0.5;
    if (c.x<0.0||c.x>1.0||c.y<0.0||c.y>1.0||c.z>1.0) return 1.0;
    vec2 ts = 0.6/vec2(textureSize(uShadow,0));
    float sum = 0.0;
    sum += (c.z - uShadowBias > texture(uShadow, c.xy + vec2(-ts.x,-ts.y)).r) ? 0.0 : 1.0;
    sum += (c.z - uShadowBias > texture(uShadow, c.xy + vec2( ts.x,-ts.y)).r) ? 0.0 : 1.0;
    sum += (c.z - uShadowBias > texture(uShadow, c.xy + vec2(-ts.x, ts.y)).r) ? 0.0 : 1.0;
    sum += (c.z - uShadowBias > texture(uShadow, c.xy + vec2( ts.x, ts.y)).r) ? 0.0 : 1.0;
    return sum*0.25;
  }
  vec3 applyFog(vec3 col, vec3 p){
    float dist = length(uCamPos - p);
    float f = 1.0 - exp(-max(0.0, dist - uFogStart) * uFogDen);
    return mix(col, uFogCol, f);
  }
  float fogAmt(vec3 p){ float dist = length(uCamPos - p); return 1.0 - exp(-max(0.0, dist - uFogStart) * uFogDen); }
  float linDepth(vec3 p){ return dot(p - uCamPos, -vec3(uView[0][2], uView[1][2], uView[2][2])); }
  `;
  const OUTS = `layout(location=0) out vec4 oColor; layout(location=1) out vec4 oAux;\n`;

  // ---------------------------------------------------------------- body
  const BODY_VS = `
  in vec3 aPos; in vec3 aNrm; in vec4 aUV; in float aHalfP;
  ${SCENE_UNIFORMS}
  out vec3 vPos; out vec3 vNrm; out vec4 vUV; out float vHalfP;
  void main(){ vPos=aPos; vNrm=aNrm; vUV=aUV; vHalfP=aHalfP; gl_Position = uViewProj*vec4(aPos,1.0); }`;

  const BODY_FS = `
  ${SCENE_UNIFORMS}
  uniform float uL; uniform float uSeed; uniform float uRustAmt; uniform float uPatchAmt; uniform float uChipAmt; uniform float uAge;
  uniform vec3 uHull[6]; uniform vec3 uKeel; uniform vec3 uKeelLine; uniform vec3 uStrake;
  uniform vec3 uMoss; uniform vec3 uMossDark; uniform vec3 uMossLight;
  uniform vec3 uRust[3]; uniform vec3 uChip; uniform vec3 uPrimer; uniform vec3 uPatch[5];
  uniform vec3 uBrass; uniform vec3 uBrassDark; uniform vec3 uBrassLight;
  uniform vec3 uEye; uniform vec3 uEyeCore; uniform float uEyeGlow; uniform vec3 uInkInner;
  uniform float uMossOn;
  in vec3 vPos; in vec3 vNrm; in vec4 vUV; in float vHalfP;
  ${OUTS}
  ${SCENE_FUNCS}
  float hsh(vec2 p){ return h21(p + uSeed*13.7); }
  float etaKeel(float s){
    float a = mix(0.47, 0.40, smoothstep(0.0, 0.2, s));
    a = mix(a, 0.34, smoothstep(0.2, 0.45, s));
    a = mix(a, 0.21, smoothstep(0.45, 0.75, s));
    return mix(a, 0.12, smoothstep(0.75, 1.0, s));
  }
  float etaMouth(float s){ return 0.53 - 0.13*pow(clamp(s/0.205,0.0,1.0),0.85) + 0.035*smoothstep(0.17,0.205,s); }
  float etaMoss(float s){
    float k = smoothstep(0.125, 0.175, s) * (1.0 - smoothstep(0.60, 0.655, s));
    float b = mix(0.93, 0.71, smoothstep(0.14, 0.30, s));
    b = mix(b, 0.75, smoothstep(0.42, 0.58, s));
    return mix(1.3, b, k);
  }
  // pixel-distance line: coverage of a line of width w px at metric distance d with metres-per-pixel m
  float lineCov(float d, float m, float w){ float px = d/max(m,1e-5); return 1.0 - smoothstep(w*0.5-0.5, w*0.5+0.5, px); }

  void main(){
    float s = vUV.x, phi = vUV.y, sig = vUV.z, hm = vUV.w;
    float halfP = max(vHalfP, 1e-3);
    float eta = clamp(hm/halfP, 0.0, 1.0);
    float side = cos(phi) >= 0.0 ? 1.0 : -1.0;
    vec3 N = normalize(vNrm);
    if (uPass == 1) { oColor = vec4(1.0); oAux = vec4(0.0); return; }
    if (uPass == 2) { oColor = vec4(linDepth(vPos), 1.0, 0.0, 1.0); oAux = vec4(0.0); return; }
    vec3 V = normalize(uCamPos - vPos);
    float mS = max(fwidth(sig), 1e-4);   // metres per pixel along body
    float mH = max(fwidth(hm), 1e-4);    // metres per pixel around body
    float wIn = max(0.75, uInkW*0.40);   // interior line weight (px)
    float L = uL;

    // ---------------- regions
    float ek = etaKeel(s);
    vec3 base = uHull[0];
    float emissive = 0.0;
    float inkLine = 0.0;        // dark ink lines (interior)
    float colLine = 0.0; vec3 colLineC = vec3(0.0);
    float isMoss = 0.0, isKeel = 0.0;
    float noLight = 0.0;

    // plates (strakes from keel boundary to dorsal centre, staggered butts)
    float nStr = 6.0;
    float u = (eta - ek)/(1.0 - ek)*nStr;
    float strake = floor(u); float fu = fract(u);
    float strakeH = (1.0 - ek)*halfP/nStr;
    float plateLen = 7.6;
    float bo = sig/plateLen + strake*0.37 + (side > 0.0 ? 0.0 : 0.5);
    float butt = floor(bo); float fb = fract(bo);
    vec2 pid = vec2(strake*7.0 + side*3.0, butt);
    float r0 = hsh(pid), r1 = hsh(pid + 17.0), r2 = hsh(pid + 41.0), r3 = hsh(pid + 77.0);
    int ci = int(floor(r0*5.999));
    vec3 hull = uHull[0];
    for (int k=0;k<6;k++) if (k==ci) hull = uHull[k];
    hull *= 0.96 + 0.08*r1;
    // gentle painted variation inside a plate (big soft value shifts, kept flat-ish)
    float pv = vnoise(vec2(sig, hm)*0.18 + pid*3.1);
    hull *= 0.97 + 0.05*pv;
    // patches
    bool isPatch = r2 < 0.012*uPatchAmt && strake >= 0.0 && s > 0.1 && s < 0.9;
    if (isPatch) { int pi = int(floor(r3*4.999)); for (int k=0;k<5;k++) if (k==pi) hull = uPatch[k]; hull *= 0.95+0.1*r1; }
    base = hull;

    float dStr = min(fu, 1.0-fu)*strakeH;          // metres to nearest strake seam
    float dButt = min(fb, 1.0-fb)*plateLen;          // metres to nearest butt
    float lodStr = smoothstep(4.0, 9.0, strakeH/mH);
    float lodButt = smoothstep(4.0, 9.0, plateLen/mS);
    float lodRiv = smoothstep(0.35, 0.9, 0.12/min(mS,mH));
    float dEdge = min(min(fu*strakeH, (1.0-fu)*strakeH), min(fb*plateLen, (1.0-fb)*plateLen));

    // rust blooms (hard-edged two-tone), more near seams and low on the body
    float rn = fbm(vec2(sig, hm)*0.23 + pid*1.7 + uSeed, 4);
    float seamBias = exp(-dEdge/0.7)*0.16;
    float rustPlate = r1*r1*uRustAmt;
    float thr = 0.82 - rustPlate*0.16 - seamBias*uRustAmt*0.8 - (1.0-eta)*0.04*uRustAmt;
    float rust = aastep(thr, rn) * step(0.05, uRustAmt);
    float rustDeep = aastep(thr + 0.07, rn);
    vec3 rustC = mix(uRust[0], uRust[2], vnoise(vec2(sig,hm)*0.6+3.0));
    rustC = mix(rustC, uRust[1], rustDeep);
    // rust streaks hanging from the rivet row above
    float colw = 0.95;
    float cx = (fract(sig/colw) - 0.5)*colw;
    float colId = floor(sig/colw);
    float ydown = (1.0-fu)*strakeH + 0.32;       // metres below the next rivet row up
    float sh = h21(vec2(colId, strake+1.0) + uSeed*5.1);
    float slen = 0.8 + 2.6*h21(vec2(colId*1.3, strake) + 9.0);
    float sw = 0.10*(1.0 - clamp(ydown/slen, 0.0, 1.0)) * (0.6+0.6*vnoise(vec2(colId, ydown*2.0)));
    float streak = (sh < 0.10*uRustAmt) ? (1.0 - smoothstep(sw-mS, sw+mS, abs(cx))) * step(0.3, ydown) : 0.0;
    // chips: paint flaked off near plate edges
    float cn = vnoise(vec2(sig, hm)*1.9 + pid*5.3);
    float chip = aastep(0.935 - 0.09*exp(-dEdge/0.3)*uChipAmt, cn) * step(0.01, uChipAmt);
    vec3 chipC = mix(uChip, uPrimer, step(0.5, vnoise(vec2(sig,hm)*0.9+11.0)));

    base = mix(base, rustC, rust*0.92);
    base = mix(base, mix(uRust[0], uRust[1], 0.3), streak*0.85);
    base = mix(base, chipC, chip*0.9);

    // shingle overlap shadow under each strake seam, and under butts (aft side)
    float shingle = (1.0 - smoothstep(0.18, 0.18 + 1.5*mH, (1.0-fu)*strakeH)) * lodStr;
    float buttSh = (1.0 - smoothstep(0.14, 0.14 + 1.5*mS, fb*plateLen)) * lodButt;
    base *= 1.0 - 0.13*max(shingle, buttSh);
    // seams (thin dark lines)
    float seam = max(lineCov(dStr, mH, wIn)*lodStr, lineCov(dButt, mS, wIn)*lodButt);
    // rivets: row just above each strake seam and aft of each butt
    float rv = 0.0, rvHi = 0.0;
    {
      float rx = (fract(sig/0.95) - 0.5)*0.95, ry = fu*strakeH - 0.30;
      float d1 = length(vec2(rx, ry));
      float rx2 = fb*plateLen - 0.30, ry2 = (fract(fu*strakeH/0.85) - 0.5)*0.85;
      float d2 = length(vec2(rx2, ry2));
      float d = min(d1, d2);
      float R = 0.12;
      rv = 1.0 - smoothstep(R - mS*0.7, R + mS*0.7, d);
      vec2 o = d1 < d2 ? vec2(rx, ry) : vec2(rx2, ry2);
      rvHi = rv * smoothstep(0.0, 0.06, o.y) * step(d, R*0.75);
      if (isPatch) { // inset rivet border on patches
        float ins = abs(dEdge - 0.42);
        float along = (fract((fb*plateLen + fu*strakeH)/0.7) - 0.5)*0.7;
        float d3 = length(vec2(ins, along));
        rv = max(rv, 1.0 - smoothstep(R - mS*0.7, R + mS*0.7, d3));
      }
      rv *= lodRiv; rvHi *= lodRiv;
    }

    // ---------------- keel / throat pleats (cream planking)
    float dk = (eta - ek)*halfP;  // metres from keel boundary (negative inside keel)
    if (dk < 0.0) {
      isKeel = 1.0;
      float pl = hm/1.05; float fpl = fract(pl); float plank = floor(pl);
      vec3 kc = uKeel * (0.97 + 0.05*h21(vec2(plank, floor(sig/5.3 + plank*0.41))));
      float plankLine = lineCov(min(fpl,1.0-fpl)*1.05, mH, wIn*0.9) * smoothstep(3.0, 7.0, 1.05/mH);
      float bb = sig/5.3 + plank*0.41; float dbb = min(fract(bb),1.0-fract(bb))*5.3;
      float plankButt = lineCov(dbb, mS, wIn*0.7) * smoothstep(3.0,7.0,5.3/mS);
      float rib = lineCov(min(fract(sig/2.4),1.0-fract(sig/2.4))*2.4, mS, wIn*0.6) * smoothstep(3.0,7.0,2.4/mS) * smoothstep(0.06,0.1,s);
      kc = mix(kc, uKeelLine, max(plankLine, max(plankButt*0.8, rib*0.45)));
      // faint weathering
      kc *= 0.97 + 0.04*vnoise(vec2(sig,hm)*0.3);
      base = kc; seam = 0.0; rv = 0.0; rvHi = 0.0;
    }
    // rub strake (wooden band) along keel boundary
    float rubD = abs(dk);
    if (rubD < 0.40) {
      vec3 wood = uStrake * (0.92 + 0.12*vnoise(vec2(sig*0.7, hm*6.0)));
      base = wood; seam = 0.0; rv = 0.0; rvHi = 0.0; isKeel = 0.0;
    }
    inkLine = max(inkLine, lineCov(abs(rubD - 0.40), min(mH, mS*4.0), wIn*1.1));

    // ---------------- head details: tubercle bolts, blowhole vents, mouth, eye
    if (s < 0.16 && eta > 0.70) {
      float gx = sig/1.7, gy = (halfP - hm)/1.6;
      float row = floor(gy);
      vec2 cell = vec2(fract(gx + row*0.5) - 0.5, fract(gy) - 0.5) * vec2(1.7, 1.6);
      float keep = step(0.35, h21(vec2(floor(gx + row*0.5), row) + 3.3)) * (1.0 - smoothstep(0.12, 0.16, s)) * smoothstep(0.02, 0.04, s);
      float bd = length(cell);
      float R = 0.36;
      float bolt = (1.0 - smoothstep(R - mS*0.8, R + mS*0.8, bd)) * keep * smoothstep(0.3, 0.8, R/min(mS,mH));
      vec3 bc = mix(uBrassDark, uBrass, 0.35);
      base = mix(base, bc, bolt);
      rvHi = max(rvHi, bolt * step(bd, R*0.7) * smoothstep(0.02, 0.12, cell.y));
      inkLine = max(inkLine, bolt * (1.0 - smoothstep(0.0, 1.2, (R - bd)/mS)) * 0.8);
    }
    // blowhole vents (two brass rings either side of the dorsal line)
    {
      float vs = 0.118*L;
      vec2 o = vec2(sig - vs, (halfP - hm) - 1.05);
      float d = length(o);
      float ring = smoothstep(0.62, 0.62 + mS, d) * (1.0 - smoothstep(0.95, 0.95 + mS, d));
      float hole = 1.0 - smoothstep(0.62 - mS, 0.62, d);
      base = mix(base, uBrass, ring);
      base = mix(base, uInk*1.4, hole);
      inkLine = max(inkLine, lineCov(abs(d-0.95), mS, wIn) + lineCov(abs(d-0.62), mS, wIn*0.8));
      rvHi = max(rvHi, ring * smoothstep(0.1, 0.5, o.y) * 0.8);
      if (d < 1.0) { seam = 0.0; rv = 0.0; }
    }
    // mouth (gape line) with lower-lip accent
    if (s < 0.215) {
      float em = etaMouth(s);
      float dm = (eta - em)*halfP;
      float taper = smoothstep(0.0, 0.015, s) * (1.0 - smoothstep(0.19, 0.212, s)*0.75);
      inkLine = max(inkLine, lineCov(abs(dm), mH, wIn*2.3*taper + 0.4) * step(0.002, s));
      // shadowy lip just under the gape
      base *= 1.0 - 0.10*(1.0 - smoothstep(0.0, 0.7, -dm))*step(dm, 0.0)*step(s,0.205);
    }
    // eye: brass porthole with amber glass and bolts
    float eyeMask = 0.0;
    {
      vec2 o = vec2(sig - 0.222*L, hm - 0.495*halfP);
      float d = length(o);
      float es = pow(L/108.0, 0.55); float Rg = 1.30*es, Rr = 1.92*es;
      if (d < Rr + 0.2) { seam = 0.0; rv = 0.0; rvHi = 0.0; rust = 0.0; streak = 0.0; }
      float ring = 1.0 - smoothstep(Rr - mS*0.6, Rr + mS*0.6, d);
      float glass = 1.0 - smoothstep(Rg - mS*0.6, Rg + mS*0.6, d);
      vec2 dir = o/max(d,1e-4);
      // brass ring with bevel and bolts
      vec3 brass = mix(uBrass, uBrassDark, smoothstep(0.2, 1.0, -dir.y*0.7 + dir.x*0.3) * 0.6);
      float ang = atan(o.y, o.x);
      float bolt = 1.0 - smoothstep(0.13*es - mS*0.6, 0.13*es + mS*0.6, length(vec2((fract(ang/6.2831853*10.0)-0.5)*6.2831853/10.0*1.62*es, d - 1.62*es)));
      brass = mix(brass, uBrassDark, bolt*0.85);
      base = mix(base, brass, ring);
      // glass: warm glow from within, painted highlight crescent
      float g = clamp(1.0 - d/Rg, 0.0, 1.0);
      vec3 glassC = mix(uEye*0.55, mix(uEye, uEyeCore, smoothstep(0.35, 0.95, g)), 0.35 + 0.65*uEyeGlow);
      glassC = mix(glassC*0.6, glassC, smoothstep(0.0, 0.25, g));
      o /= es; d /= es; vec2 hc = o - vec2(-0.38, 0.42);
      float hi = (1.0 - smoothstep(0.42 - mS, 0.42 + mS, length(hc*vec2(1.0,1.5)))) * (1.0 - smoothstep(0.1, 0.1+mS, -length(o - vec2(-0.2,0.25)) + 0.55));
      float hi2 = 1.0 - smoothstep(0.13 - mS, 0.13 + mS, length(o - vec2(0.45, -0.5)));
      glassC = mix(glassC, vec3(1.0, 0.98, 0.9), max(hi*0.85, hi2*0.6));
      eyeMask = glass;
      base = mix(base, glassC, glass);
      emissive = glass * uEyeGlow;
      inkLine = max(inkLine, lineCov(abs(d*es - Rr), mS, wIn*1.6) + lineCov(abs(d*es - Rg), mS, wIn*1.2) + lineCov(abs(d*es - 1.48*es), mS, wIn*0.6)*0.6);
      rvHi = max(rvHi, ring*(1.0-glass)*smoothstep(0.3, 0.9, dir.y*0.8 - dir.x*0.4)*0.9);
    }

    // ---------------- moss garden
    if (uMossOn > 0.5) {
      float em = etaMoss(s);
      float n = fbm(vec2(sig, hm)*0.11 + uSeed, 4);
      float edge = em + (n - 0.5)*0.16;
      // hanging drips of moss
      float cw = 2.6; float cidx = floor(sig/cw); float dx = (fract(sig/cw) - 0.5)*cw;
      float dh = h21(vec2(cidx, side*7.0) + uSeed);
      float dlen = dh < 0.45 ? (0.05 + 0.16*h21(vec2(cidx*3.1, side))) : 0.0;
      float dw = 0.55*(0.5 + 0.5*h21(vec2(cidx, 3.0)));
      float tongue = dlen * pow(max(0.0, 1.0 - abs(dx)/dw), 0.6);
      float edge2 = edge - tongue;
      float mossT = aastepw(edge2, eta, 1.0);
      if (mossT > 0.0) {
        float mn = fbm(vec2(sig, hm)*0.35 + 7.0, 3);
        vec3 mc = mix(uMossDark, uMoss, aastep(0.42, mn));
        mc = mix(mc, uMossLight, aastep(0.70, mn + 0.25*(eta-edge)) * 0.85);
        // tiny flowers
        vec2 fc = vec2(sig, hm)*1.3; vec2 fi = floor(fc), ff = fract(fc) - 0.5;
        float fh = h21(fi + 31.0);
        float fl = (fh < 0.10 ? 1.0 : 0.0) * (1.0 - smoothstep(0.12, 0.12 + mS*1.3, length(ff)));
        vec3 fcol = fh < 0.03 ? vec3(0.98,0.94,0.85) : (fh < 0.06 ? vec3(0.98,0.82,0.35) : vec3(0.92,0.58,0.62));
        mc = mix(mc, fcol, fl * smoothstep(0.5, 1.0, 0.12/mS));
        base = mix(base, mc, mossT);
        isMoss = mossT;
        seam *= 1.0 - mossT; rv *= 1.0 - mossT; rvHi *= 1.0 - mossT; streak *= 1.0 - mossT;
        // dark moss edge line
        inkLine = max(inkLine, (1.0 - smoothstep(0.0, 1.0, abs(eta - edge2)*halfP/mH - 0.4)) * 0.55);
      }
    }

    // ---------------- lighting (cel: lit / kage), cast shadow, bounce
    float ndl = dot(N, uLightDir);
    float wob = (vnoise(vec2(sig*0.045, hm*0.06) + uSeed) - 0.5)*0.10;
    float lit = aastep(0.0 + wob, ndl);
    float castS = shadowAt(vPos, N);
    lit *= aastep(0.5, castS);
    vec3 kage = uKey*uShade;
    // second shadow (deeper) at the very underside
    float deep = (1.0 - lit) * aastep(0.62, -dot(N, vec3(0.0,1.0,0.0)) - wob) * 0.12;
    vec3 col = base * mix(kage, uKey, lit) * (1.0 - deep);
    // reflected (bounce) light on the underside, hard edged
    float bounceM = (1.0 - lit) * aastep(0.55, -N.y + wob*0.5) * uBounceAmt;
    col = mix(col, col*uBounce, bounceM);

    // interior line colours: rivets/seams darker than plate, highlights brighter
    vec3 seamC = base*0.42*mix(kage, uKey, lit);
    col = mix(col, seamC, seam*0.8);
    col = mix(col, base*0.45*mix(kage,uKey,lit), rv);
    col = mix(col, base*1.25*uKey, rvHi*lit*0.75);

    // ---------------- rim light (inside the ink, on light-facing edges)
    float ndv = dot(N, V);
    float fw = max(fwidth(ndv), 1e-5);
    float dpx = 0.5*max(ndv, 0.0)/fw;       // ~pixels from silhouette
    vec3 Nv = (uView*vec4(N,0.0)).xyz;
    vec2 n2 = normalize(Nv.xy + 1e-6);
    float facing = dot(n2, uLightScr);
    float rimM = (1.0 - smoothstep(uInkW + uRimW - 0.5, uInkW + uRimW + 0.5, dpx)) * aastep(0.2, facing) * step(-0.45, ndl) * uRimAmt;
    col = mix(col, max(base*uKey*1.3, uRimCol), rimM);

    // lightning: hard white rim + lit silhouette facing the bolt
    if (uFlash.w > 0.0) {
      vec3 fd = normalize(uFlash.xyz - vPos);
      float fl = dot(N, fd);
      vec3 fdv = (uView*vec4(fd,0.0)).xyz;
      float ff = dot(n2, normalize(fdv.xy + 1e-6));
      float flit = aastep(0.25, fl) * uFlash.w;
      col = mix(col, base*uFlashCol*0.9, flit*0.55);
      float frim = (1.0 - smoothstep(uInkW + 8.0, uInkW + 9.0, dpx)) * aastep(0.0, ff) * uFlash.w;
      col = mix(col, uFlashCol, frim);
    }

    // ---------------- ink
    float press = 0.85 + 0.32*vnoise(vec2(s*11.0 + side*5.0, 0.5) + uSeed);
    press *= mix(1.22, 0.82, lit);
    press *= mix(0.5, 1.0, smoothstep(0.0, 0.05, s)) * mix(1.0, 0.75, smoothstep(0.93, 1.0, s));
    float W = uInkW*press;
    float sil = 1.0 - smoothstep(W - 0.6, W + 0.6, dpx);
    vec3 inkC = mix(uInk, uInkInner*mix(kage,uKey,lit), 0.25);
    col = mix(col, inkC*mix(0.85,1.0,lit), clamp(inkLine, 0.0, 1.0)*0.9);
    col = mix(col, uInk, sil);

    // emissive eye stays bright regardless of key; keep it inside the ink
    col = mix(col, mix(col, base*uEyeTint, 0.85), emissive*(1.0-sil));

    col = applyFog(col, vPos);
    oColor = vec4(col, 1.0);
    oAux = vec4(1.0, emissive*(1.0-fogAmt(vPos)), 0.0, 1.0);
  }`;

  // ---------------------------------------------------------------- generic lit surfaces (sails, fluke)
  const SURF_VS = `
  in vec3 aPos; in vec3 aNrm; in vec4 aUV;
  ${SCENE_UNIFORMS}
  out vec3 vPos; out vec3 vNrm; out vec4 vUV;
  void main(){ vPos=aPos; vNrm=aNrm; vUV=aUV; gl_Position = uViewProj*vec4(aPos,1.0); }`;

  // Sail panel: vUV = (r along spar 0..1, f across panel 0..1, panel index, spar length metres)
  const SAIL_FS = `
  ${SCENE_UNIFORMS}
  uniform vec3 uSail; uniform vec3 uSailBack; uniform vec3 uStripe; uniform vec3 uSpar; uniform float uScallop; uniform float uSeed;
  in vec3 vPos; in vec3 vNrm; in vec4 vUV;
  ${OUTS}
  ${SCENE_FUNCS}
  void main(){
    float r = vUV.x, f = vUV.y, pidx = vUV.z, len = vUV.w;
    float redge = 1.0 - uScallop*sin(3.14159*f) - 0.012*sin(f*3.14159*3.0);
    float dEdge = (redge - r);
    float mR = max(fwidth(r), 1e-5);
    float a = clamp(dEdge/mR + 0.5, 0.0, 1.0);
    if (uPass != 0) { if (a < 0.5) discard; oColor = vec4(linDepth(vPos),1.0,0.0,1.0); oAux = vec4(0.0); return; }
    if (a <= 0.0) discard;
    vec3 N = normalize(vNrm);
    vec3 V = normalize(uCamPos - vPos);
    bool front = dot(N, V) >= 0.0;
    if (!front) N = -N;
    float ndl = dot(N, uLightDir);
    vec3 base = front ? uSail : uSailBack;
    // cloth: subtle panel seams and weathering
    float mF = max(fwidth(f), 1e-5);
    float seamF = 1.0 - smoothstep(0.3, 1.0, min(abs(f-0.333), abs(f-0.667))/mF);
    base *= 1.0 - 0.06*seamF;
    base *= 0.96 + 0.06*vnoise(vec2(r*len*0.4, (f+pidx)*3.0) + uSeed);
    // painted red stripes (concentric bands)
    float st = max(aastep(0.585, r)*(1.0-aastep(0.665, r)), aastep(0.775, r)*(1.0-aastep(0.815, r)));
    base = mix(base, uStripe, st*0.95);
    // the cloth bellies, so as a fin turns the light-shade line sweeps across it (a flat panel would
    // flip its whole tone in one frame)
    float ndlS = ndl + 0.16*(f - 0.5) + 0.10*(r - 0.5) + 0.05*(vnoise(vec2(r*2.3, f*2.1 + pidx) + uSeed) - 0.5);
    float lit = aastep(0.0, ndlS);
    lit *= aastep(0.5, shadowAt(vPos, N));
    vec3 col = base*mix(uKey*uShade, uKey, lit);
    // translucency: light from behind the cloth glows through it
    float back = clamp(-ndl, 0.0, 1.0);
    col = mix(col, base*uKey*vec3(1.0,0.86,0.66)*0.95, smoothstep(0.05, 0.35, back)*0.55);
    // lightning
    if (uFlash.w > 0.0) { float fl = abs(dot(N, normalize(uFlash.xyz - vPos))); col = mix(col, uFlashCol*base, aastep(0.2, fl)*uFlash.w*0.6); }
    // ink on scalloped trailing edge
    float W = max(0.8, uInkW*0.85);
    float ink = 1.0 - smoothstep(W-0.5, W+0.5, dEdge/mR);
    col = mix(col, uInk, ink);
    col = applyFog(col, vPos);
    oColor = vec4(col, a);
    oAux = vec4(a, 0.0, 0.0, a);
  }`;

  // Fluke: vUV = (x metres aft of root, z metres span, halfspan, root depth flag)
  const FLUKE_FS = `
  ${SCENE_UNIFORMS}
  uniform float uL; uniform float uSeed; uniform vec3 uHull[6]; uniform vec3 uUnder; uniform vec3 uMark; uniform vec3 uRust[3];
  in vec3 vPos; in vec3 vNrm; in vec4 vUV;
  ${OUTS}
  ${SCENE_FUNCS}
  float xLE(float a, float zt){ return zt*(0.10*a + 0.56*pow(a, 2.1)); }
  float xTE(float a, float zt){
    float x = zt*(0.69 + 0.12*sin(3.14159*a)*(1.0-a)*1.6 - 0.05*a);
    x -= zt*0.22*exp(-pow(a/0.075, 2.0));                       // median notch
    x += zt*0.018*sin(a*46.0)*smoothstep(0.12,0.3,a)*(1.0-smoothstep(0.8,0.97,a)); // serrations
    return x;
  }
  void main(){
    float x = vUV.x, z = vUV.y, zt = vUV.z;
    float a = abs(z)/zt;
    float le = xLE(a, zt), te = xTE(min(a,1.0), zt);
    float d1 = x - le, d2 = te - x, d3 = (1.0 - a)*zt;
    float p1 = d1/max(fwidth(d1),1e-5), p2 = d2/max(fwidth(d2),1e-5), p3 = d3/max(fwidth(d3),1e-5);
    float dpx = min(min(p1, p2), p3);
    float al = clamp(dpx + 0.5, 0.0, 1.0);
    if (uPass != 0) { if (al < 0.5) discard; oColor = vec4(linDepth(vPos),1.0,0.0,1.0); oAux = vec4(0.0); return; }
    if (al <= 0.0) discard;
    vec3 N = normalize(vNrm);
    vec3 V = normalize(uCamPos - vPos);
    bool top = dot(N, V) >= 0.0;
    if (!top) N = -N;
    vec3 base;
    float mx = max(fwidth(x),1e-4), mz = max(fwidth(z),1e-4);
    float wIn = max(0.75, uInkW*0.4);
    if (top) {
      // plated upper fluke: spanwise strakes, rivets
      float row = floor(abs(z)/3.2); float bx = floor(x/3.0 + row*0.5);
      float r0 = h21(vec2(row, bx) + uSeed);
      base = uHull[int(floor(r0*5.999))];
      float d = min(min(fract(abs(z)/3.2),1.0-fract(abs(z)/3.2))*3.2/mz, min(fract(x/3.0+row*0.5),1.0-fract(x/3.0+row*0.5))*3.0/mx);
      base *= 1.0 - 0.45*(1.0 - smoothstep(wIn*0.5-0.5, wIn*0.5+0.5, d))*smoothstep(4.0, 9.0, 3.0/max(mx,mz));
      float rn = fbm(vec2(x,z)*0.3 + uSeed, 3);
      base = mix(base, uRust[0], aastep(0.70, rn)*0.9);
    } else {
      // pale underside with dark markings (each whale's fluke print)
      base = uUnder;
      float m = fbm(vec2(x*0.18, z*0.12) + uSeed*3.0, 4) + 0.35*smoothstep(0.35, 1.0, x/te) + 0.25*smoothstep(0.6,1.0,a);
      base = mix(base, uMark, aastep(0.78, m));
    }
    float ndl = dot(N, uLightDir);
    float lit = aastep(0.0, ndl) * aastep(0.5, shadowAt(vPos, N));
    vec3 col = base*mix(uKey*uShade, uKey, lit);
    if (uFlash.w > 0.0) { float fl = dot(N, normalize(uFlash.xyz - vPos)); col = mix(col, uFlashCol*base, aastep(0.2, fl)*uFlash.w*0.6); }
    float W = uInkW*mix(1.15, 0.85, lit);
    float ink = 1.0 - smoothstep(W-0.6, W+0.6, dpx);
    // root blends into the peduncle: no ink there
    ink *= smoothstep(0.02*zt, 0.12*zt, x) + smoothstep(0.08, 0.16, a);
    col = mix(col, uInk, clamp(ink,0.0,1.0));
    col = applyFog(col, vPos);
    oColor = vec4(col, al);
    oAux = vec4(al, 0.0, 0.0, al);
  }`;

  // ---------------------------------------------------------------- tubes (camera-facing)
  // aT = (across -1..1, along metres, radius px, matId), aL = (side.L, view.L, 0,0), aC = colour
  const TUBE_VS = `
  in vec3 aPos; in vec4 aT; in vec4 aL; in vec3 aC;
  ${SCENE_UNIFORMS}
  out vec3 vPos; out vec4 vT; out vec4 vL; out vec3 vC;
  void main(){ vPos=aPos; vT=aT; vL=aL; vC=aC; gl_Position = uViewProj*vec4(aPos,1.0); }`;
  const TUBE_FS = `
  ${SCENE_UNIFORMS}
  in vec3 vPos; in vec4 vT; in vec4 vL; in vec3 vC;
  ${OUTS}
  ${SCENE_FUNCS}
  void main(){
    float a = vT.x, rpx = vT.z;
    if (uPass != 0) { oColor = vec4(linDepth(vPos),1.0,0.0,1.0); oAux = vec4(0.0); return; }
    float ca = sqrt(max(0.0, 1.0 - a*a));
    float ndl = a*vL.x + ca*vL.y;
    float lit = aastep(0.05, ndl) * aastep(0.5, shadowAt(vPos, vec3(0.0)));
    vec3 base = vC;
    float mat = vT.w;
    if (mat > 0.5 && mat < 1.5) { // wood with grain + lashings
      base *= 0.92 + 0.12*vnoise(vec2(vT.y*0.8, a*3.0));
    } else if (mat > 1.5 && mat < 2.5) { // bark
      float g = vnoise(vec2(vT.y*1.6, a*2.0)); base *= 0.85 + 0.25*g;
    }
    vec3 col = base*mix(uKey*uShade, uKey, lit);
    if (uFlash.w > 0.0) col = mix(col, uFlashCol*base, uFlash.w*0.5*aastep(0.0, a));
    // ink edges (constant pixel width), thin tubes become solid ink lines
    float W = max(0.7, uInkW*0.62);
    float edgePx = (1.0 - abs(a))*rpx;
    float ink = 1.0 - smoothstep(W - 0.5, W + 0.5, edgePx);
    col = mix(col, uInk, ink);
    // rim on light-facing edge
    float rimM = (1.0 - smoothstep(W + uRimW*0.6 - 0.5, W + uRimW*0.6 + 0.5, edgePx)) * aastep(0.2, a*sign(vL.x+1e-4)) * uRimAmt * (1.0-ink);
    col = mix(col, max(base*uKey*1.3, uRimCol), rimM*0.8);
    float cov = clamp(rpx*2.0/1.2, 0.25, 1.0);
    col = applyFog(col, vPos);
    oColor = vec4(col, cov);
    oAux = vec4(cov, 0.0, 0.0, cov);
  }`;

  // ---------------------------------------------------------------- eye glow (additive halo)
  const GLOW_VS = `
  in vec2 aCorner; in vec4 aP; in vec4 aC;
  ${SCENE_UNIFORMS}
  out vec2 vQ; out vec4 vC;
  void main(){
    vec4 c = uViewProj*vec4(aP.xyz,1.0);
    vec4 pull = uViewProj*vec4(aP.xyz + normalize(uCamPos - aP.xyz)*aP.w*0.6, 1.0);
    float px = aP.w * uFocal / c.w;
    gl_Position = vec4(c.xy + aCorner*vec2(px*${(1080 / 1920).toFixed(6)}, px), pull.z/pull.w*c.w, c.w);
    vQ = aCorner; vC = aC;
  }`;
  const GLOW_FS = `
  ${SCENE_UNIFORMS}
  in vec2 vQ; in vec4 vC;
  ${OUTS}
  void main(){
    float r = length(vQ);
    float g = exp(-r*r*5.0)*0.75 + exp(-r*r*28.0)*0.6;
    g *= 1.0 - smoothstep(0.85, 1.0, r);
    oColor = vec4(vC.rgb*g*vC.a, 0.0);
    oAux = vec4(0.0, g*vC.a*0.5, 0.0, 0.0);
  }`;

  // ---------------------------------------------------------------- renderer
  function WhaleRenderer(G) {
    const gl = G.gl;
    const progs = {
      body: G.program('body', BODY_VS, BODY_FS),
      sail: G.program('sail', SURF_VS, SAIL_FS),
      fluke: G.program('fluke', SURF_VS, FLUKE_FS),
      tube: G.program('tube', TUBE_VS, TUBE_FS),
      glow: G.program('glow', GLOW_VS, GLOW_FS),
    };
    const meshes = {
      body: G.mesh(progs.body, [{ name: 'aPos', size: 3 }, { name: 'aNrm', size: 3 }, { name: 'aUV', size: 4 }, { name: 'aHalfP', size: 1 }]),
      sail: G.mesh(progs.sail, [{ name: 'aPos', size: 3 }, { name: 'aNrm', size: 3 }, { name: 'aUV', size: 4 }]),
      fluke: G.mesh(progs.fluke, [{ name: 'aPos', size: 3 }, { name: 'aNrm', size: 3 }, { name: 'aUV', size: 4 }]),
      tube: G.mesh(progs.tube, [{ name: 'aPos', size: 3 }, { name: 'aT', size: 4 }, { name: 'aL', size: 4 }, { name: 'aC', size: 3 }]),
    };
    meshes.glow = G.instanced(progs.glow, [{ name: 'aP', size: 4 }, { name: 'aC', size: 4 }]);
    const R = { G, progs, meshes };

    // ---------- body mesh
    const NR = 112;
    const TAILCAP = [1.004, 1.010, 1.016, 1.021, 1.025];
    let bodyIdx = null, bodyIdxNS = 0;
    function buildBody(pose) {
      const d = pose.d, L = d.L;
      // stations: pose stations + tail cap
      const S = Array.from(pose.S).concat(TAILCAP);
      const NS = S.length;
      const frames = [];
      for (let i = 0; i < NS; i++) {
        if (i < pose.NS) frames.push({ C: pose.C[i], T: pose.T[i], U: pose.U[i], R: pose.R[i] });
        else { const f = frames[pose.NS - 1]; frames.push({ C: v3.madd(f.C, f.T, -(S[i] - 1) * L), T: f.T, U: f.U, R: f.R }); }
      }
      const P = new Float32Array(NS * (NR + 1) * 3);
      const UVd = new Float32Array(NS * (NR + 1) * 4);
      const HP = new Float32Array(NS);
      const tmp = [0, 0];
      for (let i = 0; i < NS; i++) {
        const s = S[i];
        const sc = s > 1 ? Math.sqrt(Math.max(0, 1 - Math.pow((s - 1) / 0.025, 2))) : 1;
        const f = frames[i];
        // perimeter arc (from keel centre phi=-pi/2 going up the right side)
        let arc = 0, prev = null;
        const arcs = new Float32Array(NR + 1);
        for (let j = 0; j <= NR; j++) {
          const phi = -Math.PI / 2 + TAU * j / NR;
          SW.WHALE.sectionPoint(d, Math.min(s, 1), phi, tmp);
          const x = tmp[0] * sc, y = tmp[1] * sc + (s > 1 ? 0 : 0);
          const k = (i * (NR + 1) + j) * 3;
          P[k] = f.C[0] + f.R[0] * x + f.U[0] * y;
          P[k + 1] = f.C[1] + f.R[1] * x + f.U[1] * y;
          P[k + 2] = f.C[2] + f.R[2] * x + f.U[2] * y;
          if (prev) arc += Math.hypot(x - prev[0], y - prev[1]);
          arcs[j] = arc; prev = [x, y];
        }
        const half = arc / 2 || 1e-3;
        HP[i] = half;
        for (let j = 0; j <= NR; j++) {
          const phi = -Math.PI / 2 + TAU * j / NR;
          const k = (i * (NR + 1) + j) * 4;
          const hm = arcs[j] <= half ? arcs[j] : arc - arcs[j];
          UVd[k] = Math.min(s, 1.0); UVd[k + 1] = phi; UVd[k + 2] = Math.min(s, 1) * L; UVd[k + 3] = hm;
        }
      }
      // normals by finite differences
      const out = new Float32Array(NS * (NR + 1) * 11);
      const at = (i, j) => { j = ((j % NR) + NR) % NR; const k = (i * (NR + 1) + j) * 3; return [P[k], P[k + 1], P[k + 2]]; };
      for (let i = 0; i < NS; i++) {
        for (let j = 0; j <= NR; j++) {
          let n;
          if (i === 0) n = frames[0].T;
          else if (i === NS - 1) n = v3.scale(frames[NS - 1].T, -1);
          else {
            const dphi = v3.sub(at(i, j + 1), at(i, j - 1));
            const ds = v3.sub(at(i + 1, j), at(i - 1, j));
            n = v3.cross(dphi, ds);
            const l = v3.len(n);
            if (l < 1e-9) n = i < NS / 2 ? frames[i].T : v3.scale(frames[i].T, -1); else n = v3.scale(n, 1 / l);
          }
          const k = (i * (NR + 1) + j), o = k * 11;
          out[o] = P[k * 3]; out[o + 1] = P[k * 3 + 1]; out[o + 2] = P[k * 3 + 2];
          out[o + 3] = n[0]; out[o + 4] = n[1]; out[o + 5] = n[2];
          out[o + 6] = UVd[k * 4]; out[o + 7] = UVd[k * 4 + 1]; out[o + 8] = UVd[k * 4 + 2]; out[o + 9] = UVd[k * 4 + 3];
          out[o + 10] = HP[i];
        }
      }
      // smooth the nose-ring normals into the tip normal (avoids a pinch)
      if (!bodyIdx || bodyIdxNS !== NS) {
        const idx = new Uint32Array((NS - 1) * NR * 6);
        let q = 0;
        for (let i = 0; i < NS - 1; i++) for (let j = 0; j < NR; j++) {
          const a = i * (NR + 1) + j, b = a + 1, c = a + (NR + 1), e = c + 1;
          idx[q++] = a; idx[q++] = b; idx[q++] = c;
          idx[q++] = b; idx[q++] = e; idx[q++] = c;
        }
        bodyIdx = idx; bodyIdxNS = NS;
        meshes.body.setData(out, idx);
      } else meshes.body.setData(out, null), meshes.body.icount = bodyIdx.length;
      return out;
    }

    // ---------- fins (junk sails)
    function finGeometry(pose, side, t, cam, tubes) {
      const w = pose.whale, d = pose.d, L = d.L;
      const sRoot = 0.255;
      const phiRoot = side > 0 ? -0.50 : Math.PI + 0.50;
      const root = SW.WHALE.surf(pose, sRoot, phiRoot, -0.6);
      const fr = root.fr;
      const T = fr.T, U = fr.U, Rr = v3.scale(fr.R, side);
      // stroke: synchronized with the swim cycle, plus keyed opening
      const ph = w.finPeriod ? TAU * (t / w.finPeriod) + (w.finPhase || 0) : TAU * w.swimPhase(t) + w.phase + (w.finPhase || 0);
      const strokeAmp = 0.30 * w.finStroke;
      const elev = strokeAmp * Math.sin(ph + 0.6);                      // radians (positive = up)
      const elevV = strokeAmp * Math.cos(ph + 0.6);                      // derivative proxy
      const sweep = 0.48 + 0.10 * Math.sin(ph + 1.9);
      const openK = (w.finKeys ? SW.keyed(w.finKeys, t) : 1) * d.finOpen;
      const breath = 0.5 + 0.5 * Math.sin(ph - 0.4);
      const spread = (0.30 + 0.85 * openK * (0.78 + 0.22 * breath));   // radians, total fan spread
      // fin plane, built explicitly in the body frame: droop down-outward, sweep back, fan toward the tail
      const droop = 0.62 - elev;                       // elev > 0 lifts the fin
      const out0 = v3.norm(v3.sub(v3.scale(Rr, Math.cos(droop)), v3.scale(U, Math.sin(droop))));
      const out = v3.norm(v3.sub(v3.scale(out0, Math.cos(sweep)), v3.scale(T, Math.sin(sweep))));
      const mT = v3.scale(T, -1);
      let back = v3.norm(v3.sub(mT, v3.scale(out, v3.dot(mT, out))));
      let nrm = v3.norm(v3.cross(out, back));
      // twist along stroke (feathering)
      const twist = 0.22 * Math.cos(ph + 0.6);
      back = v3.rot(back, out, twist); nrm = v3.rot(nrm, out, twist);
      const nSp = d.finSpars;
      const spars = [];
      const fs = d.finScale;
      for (let i = 0; i < nSp; i++) {
        const k = i / (nSp - 1);
        const ang = 0.10 + k * spread;
        const dir = v3.norm(v3.add(v3.scale(out, Math.cos(ang)), v3.scale(back, Math.sin(ang))));
        const len = L * fs * (0.255 - 0.115 * Math.pow(k, 1.15));
        // spar bends: follow-through against stroke velocity, plus a gentle backward curve
        const bend = -0.10 * elevV * (0.6 + 0.6 * k) - 0.03;
        const curveBack = 0.05 + 0.03 * k;
        const pts = [];
        const NSEG = 14;
        for (let j = 0; j <= NSEG; j++) {
          const r = j / NSEG;
          let p = v3.madd(root.p, dir, r * len);
          p = v3.madd(p, nrm, bend * r * r * len * side);
          p = v3.madd(p, back, curveBack * r * r * len);
          pts.push(p);
        }
        spars.push({ pts, len, k });
      }
      // panels
      const NR_ = 14, NF = 6;
      const verts = [];
      for (let i = 0; i < nSp - 1; i++) {
        const A = spars[i], B = spars[i + 1];
        for (let j = 0; j < NR_; j++) for (let q = 0; q < NF; q++) {
          const quad = [[j, q], [j + 1, q], [j, q + 1], [j + 1, q], [j + 1, q + 1], [j, q + 1]];
          for (const [jj, qq] of quad) {
            const r = jj / NR_, f = qq / NF;
            const pa = A.pts[Math.round(r * 14)], pb = B.pts[Math.round(r * 14)];
            let p = v3.lerp(pa, pb, f);
            // cloth billow
            // the belly reverses through flat over a few frames as the stroke turns (no one-frame snap)
            const bil = -0.012 * L * fs * Math.sin(Math.PI * f) * Math.sin(Math.PI * r) * (0.5 * elevV / Math.hypot(elevV, 0.1) + 0.8 * elevV);
            p = v3.madd(p, nrm, bil * side);
            const len = lerp(A.len, B.len, f);
            verts.push(p[0], p[1], p[2], nrm[0] * side, nrm[1] * side, nrm[2] * side, r, f, i, len);
          }
        }
      }
      // spars as tubes
      const pal = d.pal;
      for (const sp of spars) {
        const radii = sp.pts.map((_, j) => (sp.k === 0 ? 0.62 : 0.42) * (1 - 0.55 * j / 14) * (L / 108) * fs);
        // the cloth is laced to the spar's centre line, so the spar shows on both faces of the sail
        tubes.push({ pts: sp.pts, radii, color: hex(pal.spar), mat: 1, pull: 1.6 });
      }
      return new Float32Array(verts);
    }

    // ---------- fluke
    function flukeGeometry(pose, t, cam) {
      const w = pose.whale, d = pose.d, L = d.L;
      const i = pose.NS - 1;
      const C = pose.C[i], T = pose.T[i], U = pose.U[i], Rt = pose.R[i];
      const ph = TAU * w.swimPhase(t) + w.phase;
      // fluke pitch leads the heave by ~90 deg (angle of attack), plus body slope
      const pitch = 0.42 * Math.cos(ph - TAU / 1.15) * Math.min(1, w.ampAt(t) / Math.max(1e-6, w.waveAmp));
      let Tf = v3.rot(T, Rt, pitch), Uf = v3.rot(U, Rt, pitch), RtF = Rt;
      // animator's cheat: roll the fluke toward the camera so it never reads as a needle. One-sided
      // (always favours the surface on the camera's side of the body), so it stays continuous.
      if (cam && !cam.mirrored) {
        const V = v3.norm(v3.sub(cam.pos, C));
        // a shot whose camera sits level with the body pins the favoured face (else it would flip)
        const s0 = w.flukeSide || (v3.dot(U, V) >= 0 ? 1 : -1);
        const k = v3.dot(Uf, V) * s0, minK = Math.sin(26 * Math.PI / 180);
        if (k < minK) {
          const want = Math.asin(minK) - Math.asin(clamp(k, -1, 1));
          const dir = v3.dot(v3.cross(Tf, Uf), V) * s0 >= 0 ? 1 : -1;
          Uf = v3.rot(Uf, Tf, want * dir); RtF = v3.rot(Rt, Tf, want * dir);
        }
      }
      const zt = 0.155 * L * d.flukeScale;
      const xmax = 0.78 * zt;
      const NX = 18, NZ = 30;
      const verts = [];
      const vel = -Math.sin(ph - TAU / 1.15);
      const P = (x, z) => {
        const Rt = RtF;
        const a = Math.abs(z) / zt;
        // spanwise flex (tips lag) and chordwise flex
        const flex = (0.10 * a * a + 0.04 * Math.pow(x / xmax, 2)) * zt * vel * 0.6;
        const back = -x;
        return [C[0] + Tf[0] * back + Rt[0] * z + Uf[0] * flex, C[1] + Tf[1] * back + Rt[1] * z + Uf[1] * flex, C[2] + Tf[2] * back + Rt[2] * z + Uf[2] * flex];
      };
      for (let a = 0; a < NX; a++) for (let b = 0; b < NZ; b++) {
        const quad = [[a, b], [a + 1, b], [a, b + 1], [a + 1, b], [a + 1, b + 1], [a, b + 1]];
        for (const [aa, bb] of quad) {
          const x = -0.5 + (aa / NX) * (xmax + 0.5);
          const z = (bb / NZ * 2 - 1) * zt * 1.02;
          const p = P(x, z);
          // normal from finite differences
          const e = 0.3;
          const dx = v3.sub(P(x + e, z), P(x - e, z)), dz = v3.sub(P(x, z + e), P(x, z - e));
          const n = v3.norm(v3.cross(dz, dx));
          const nn = v3.dot(n, Uf) < 0 ? v3.scale(n, -1) : n;
          verts.push(p[0], p[1], p[2], nn[0], nn[1], nn[2], x, z, zt, 0);
        }
      }
      return new Float32Array(verts);
    }

    // ---------- tubes
    function buildTubes(tubes, cam, lightDir) {
      const verts = [];
      for (const tb of tubes) {
        const pts = tb.pts, n = pts.length;
        let along = 0;
        for (let k = 0; k < n; k++) {
          const p = pts[k];
          const tg = v3.norm(v3.sub(pts[Math.min(n - 1, k + 1)], pts[Math.max(0, k - 1)]));
          const vd = v3.norm(v3.sub(p, cam.pos));
          let side = v3.cross(tg, vd); const sl = v3.len(side);
          side = sl < 1e-6 ? cam.right : v3.scale(side, 1 / sl);
          const ppm = cam.pxPerM(p);
          let r = tb.radii[k];
          const rpx0 = r * ppm;
          const minPx = tb.minPx || 0.55;
          if (rpx0 < minPx) r = minPx / ppm;
          const rpx = r * ppm;
          const sL = v3.dot(side, lightDir), vL = v3.dot(v3.scale(vd, -1), lightDir);
          if (k > 0) along += v3.dist(p, pts[k - 1]);
          const c = tb.color;
          // optional depth pull toward the eye (along the view ray, so the screen position is unchanged)
          const q = tb.pull ? v3.madd(p, vd, -tb.pull * r) : p;
          const vA = [q[0] + side[0] * r, q[1] + side[1] * r, q[2] + side[2] * r, 1, along, rpx, tb.mat || 0, sL, vL, 0, 0, c[0], c[1], c[2]];
          const vB = [q[0] - side[0] * r, q[1] - side[1] * r, q[2] - side[2] * r, -1, along, rpx, tb.mat || 0, sL, vL, 0, 0, c[0], c[1], c[2]];
          if (k > 0) { verts.push(...tb._pa, ...tb._pb, ...vA, ...tb._pb, ...vB, ...vA); }
          tb._pa = vA; tb._pb = vB;
        }
      }
      return new Float32Array(verts);
    }

    // ---------- uniforms for a whale's design
    function designUniforms(d) {
      const p = d.pal;
      const flat = (arr) => { const o = []; arr.forEach((h) => o.push(...hex(h))); return new Float32Array(o); };
      return {
        uL: d.L, uSeed: d.seed * 0.137, uRustAmt: d.rust, uPatchAmt: d.patches, uChipAmt: d.chips, uAge: d.age,
        uHull: flat(p.hull), uKeel: hex(p.keel), uKeelLine: hex(p.keelLine), uStrake: hex(p.strake),
        uMoss: hex(p.moss), uMossDark: hex(p.mossDark), uMossLight: hex(p.mossLight),
        uRust: flat(p.rust), uChip: hex(p.chip), uPrimer: hex(p.primer), uPatch: flat(p.patch.concat(p.patch).slice(0, 5)),
        uBrass: hex(p.brass), uBrassDark: hex(p.brassDark), uBrassLight: hex(p.brassLight),
        uEye: hex(d.eyeColor || p.eye), uEyeCore: hex(p.eyeCore), uInkInner: hex(p.inkInner),
        uSail: hex(p.sail), uSailBack: hex(p.sailBack), uStripe: hex(p.stripe), uSpar: hex(p.spar),
        uUnder: hex(p.flukeUnder), uMark: hex(p.flukeMark), uMossOn: 1,
      };
    }

    // Draw one whale. scene = shared uniforms object; extra = {tubes:[], parts}
    R.draw = function (whale, t, cam, scene, opts) {
      opts = opts || {};
      if (opts.glowOnly) return R.glow(whale, t, cam, scene, opts);
      const pose = opts.pose || whale.pose(t);
      const d = pose.d;
      const du = designUniforms(d);
      const eyeGlow = whale.eye ? whale.eye(t) : 1;
      const lightDir = scene.uLightDir;
      // automatic ink weight from projected size, unless the shot overrides it
      const mid = pose.C[Math.floor(pose.NS * 0.4)];
      const lenPx = d.L * cam.pxPerM(mid);
      const inkW = scene.inkW !== undefined ? scene.inkW : clamp(0.95 + 0.0024 * lenPx, 0.95, 3.4);
      const rimW = scene.rimW !== undefined ? scene.rimW : clamp(1.2 + 0.0035 * lenPx, 1.0, 4.5);
      const common = Object.assign({}, scene, { uInkW: inkW, uRimW: rimW, uEyeGlow: eyeGlow });
      // body
      if (!opts.skipBody) {
        buildBody(pose);
        progs.body.use(common).set(du).set({ uEyeTint: scene.uEyeTint || [1.15, 1.0, 0.85] });
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(cam.mirrored ? gl.CW : gl.CCW);
        meshes.body.draw();
        gl.disable(gl.CULL_FACE); gl.frontFace(gl.CCW);
      }
      // fins + spars + extra tubes
      const tubes = (opts.tubes || []).slice();
      const fins = [];
      for (const side of [1, -1]) fins.push(finGeometry(pose, side, t, cam, tubes));
      const sailData = new Float32Array(fins[0].length + fins[1].length);
      sailData.set(fins[0], 0); sailData.set(fins[1], fins[0].length);
      meshes.sail.setData(sailData);
      progs.sail.use(common).set(du).set({ uScallop: 0.07 });
      if (opts.a2c) G.blend('alpha');
      meshes.sail.draw();
      // fluke
      meshes.fluke.setData(flukeGeometry(pose, t, cam));
      progs.fluke.use(common).set(du);
      meshes.fluke.draw();
      if (opts.a2c) G.blend(null);
      // garden (sprites, pine, mast, rigging, pennants)
      let gdata = null;
      if (opts.garden) { gdata = opts.garden.build(pose, t, opts.tubeCam || cam); tubes.push(...gdata.tubes); }
      // tubes (spars, mast, rigging...)
      if (opts.extraTubes) tubes.push(...opts.extraTubes(pose));
      const tv = buildTubes(tubes, opts.tubeCam || cam, lightDir);
      if (tv.length) {
        meshes.tube.setData(tv);
        progs.tube.use(common);
        if (opts.a2c) G.blend('alpha');
        meshes.tube.draw();
        if (opts.a2c) G.blend(null);
      }
      if (gdata) {
        opts.garden.drawRibbons(gdata, common, d.pal);
        opts.garden.drawSprites(gdata, common, opts.a2c);
      }
      return { pose, inkW, lenPx };
    };
    R.glow = function (whale, t, cam, scene, opts) {
      const pose = opts.pose || whale.pose(t);
      const d = pose.d;
      const eyeGlow = whale.eye ? whale.eye(t) : 1;
      const common = Object.assign({}, scene);
      // eye glow halos (only in the colour pass), fade when the eye turns away
      if (eyeGlow > 0.01) {
        const gd = [];
        const ec = hex(d.eyeColor || d.pal.eye);
        for (const sd of [1, -1]) {
          const halfP = 0; // eye sits at eta ~0.5 => phi ~ 0 / pi
          const e = SW.WHALE.surf(pose, 0.222, sd > 0 ? -0.02 : Math.PI + 0.02, 0.3);
          const facing = v3.dot(e.n, v3.norm(v3.sub(cam.pos, e.p)));
          const k = smoothstep(-0.05, 0.35, facing);
          if (k <= 0) continue;
          const fog = scene.uFogDen ? Math.exp(-Math.max(0, v3.dist(cam.pos, e.p) - (scene.uFogStart || 0)) * scene.uFogDen) : 1;
          const sz = 9.0 * (d.L / 108) * (0.7 + 0.5 * eyeGlow) * (opts.glowScale || 1);
          gd.push(e.p[0], e.p[1], e.p[2], sz, ec[0], ec[1] * 0.92, ec[2] * 0.8, k * eyeGlow * 0.55 * fog * (scene.glowAmt || 1));
        }
        if (gd.length) {
          meshes.glow.setData(new Float32Array(gd), gd.length / 8);
          progs.glow.use(common);
          G.blend('add'); gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
          meshes.glow.draw();
          gl.depthMask(true); gl.enable(gl.DEPTH_TEST); G.blend(null);
        }
      }
    };
    R.designUniforms = designUniforms; //
    R.buildTubes = buildTubes;
    return R;
  }

  SW.WhaleRenderer = WhaleRenderer;
  SW.SHADER_SCENE = { SCENE_UNIFORMS, SCENE_FUNCS, OUTS };
})(window.SW = window.SW || {});
