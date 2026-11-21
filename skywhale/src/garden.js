// SKY WHALE — the hanging garden: painted foliage sprites (moss, sod, shrubs, flowers, grass,
// pine pads) with normal maps so the cel light follows the scene; the wind-bent pine; mast,
// yard, rigging; long faded pennants with travelling waves and follow-through.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, TAU, hex, rng } = SW;
  const CELL = 256, COLS = 8, ATLAS = CELL * COLS;

  // ------------------------------------------------------------------ sprite painting
  function makeSphereNormal(size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), im = x.createImageData(size, size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const u = (i + 0.5) / size * 2 - 1, v = (j + 0.5) / size * 2 - 1;
      const r2 = u * u + v * v, k = (j * size + i) * 4;
      if (r2 > 1) { im.data[k + 3] = 0; continue; }
      // dome normal biased upward (foliage is lit mostly from above)
      im.data[k] = Math.round((u * 0.5 + 0.5) * 255);
      im.data[k + 1] = Math.round((-v * 0.5 + 0.5) * 255);
      im.data[k + 2] = 0; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c;
  }

  function paintAtlas() {
    const C = document.createElement('canvas'); C.width = C.height = ATLAS;
    const N = document.createElement('canvas'); N.width = N.height = ATLAS;
    const I = document.createElement('canvas'); I.width = I.height = ATLAS;
    const cx = C.getContext('2d'), nx = N.getContext('2d'), ix = I.getContext('2d');
    nx.fillStyle = 'rgb(128,128,0)'; nx.fillRect(0, 0, ATLAS, ATLAS);
    const sph = makeSphereNormal(128);
    const cells = {};
    let cellIdx = 0;
    function cell(name) {
      const i = cellIdx++, ox = (i % COLS) * CELL, oy = Math.floor(i / COLS) * CELL;
      (cells[name] = cells[name] || []).push([ox / ATLAS, oy / ATLAS, CELL / ATLAS, CELL / ATLAS]);
      return { ox, oy };
    }
    // leafy (scalloped) ellipse path
    function leafy(b) {
      const p = new Path2D();
      const n = b.bumps || Math.max(7, Math.round((b.rx + b.ry) / 9));
      const r = rng(Math.round(b.x * 13 + b.y * 7 + b.rx * 3));
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + (b.rot || 0);
        const k = 1 - 0.10 * r();
        pts.push([b.x + Math.cos(a) * b.rx * k, b.y + Math.sin(a) * b.ry * k]);
      }
      // bulge between points (scallops)
      p.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
      for (let i = 0; i < n; i++) {
        const q = pts[i], q2 = pts[(i + 1) % n];
        const mx = (q[0] + q2[0]) / 2, my = (q[1] + q2[1]) / 2;
        const ox = (q[0] - b.x) * 0.16, oy = (q[1] - b.y) * 0.16;
        p.quadraticCurveTo(q[0] + ox, q[1] + oy, mx, my);
      }
      p.closePath();
      return p;
    }
    // union-outlined blob cluster: blobs = [{x,y,rx,ry,col}]
    function cluster(o, blobs, inkW) {
      const clip = (ctx) => { ctx.beginPath(); ctx.rect(2, 2, CELL - 4, CELL - 4); ctx.clip(); };
      // keep every blob inside the cell
      for (const b of blobs) {
        const m = inkW + 4;
        b.rx = Math.min(b.rx, b.x - m, CELL - m - b.x); b.ry = Math.min(b.ry, b.y - m, CELL - m - b.y);
        b.rx = Math.max(b.rx, 4); b.ry = Math.max(b.ry, 3);
        b.path = leafy(b);
      }
      ix.save(); ix.translate(o.ox, o.oy); clip(ix);
      ix.strokeStyle = '#fff'; ix.lineJoin = 'round';
      for (const b of blobs) { ix.lineWidth = inkW; ix.stroke(b.path); }
      ix.globalCompositeOperation = 'destination-out';
      for (const b of blobs) ix.fill(b.path);
      ix.globalCompositeOperation = 'source-over';
      ix.restore();
      cx.save(); cx.translate(o.ox, o.oy); clip(cx); nx.save(); nx.translate(o.ox, o.oy); clip(nx);
      for (const b of blobs) {
        cx.fillStyle = b.col; cx.fill(b.path);
        nx.save(); nx.clip(b.path); nx.translate(b.x, b.y); nx.drawImage(sph, -b.rx * 1.12, -b.ry * 1.12, b.rx * 2.24, b.ry * 2.24); nx.restore();
      }
      cx.restore(); nx.restore();
    }
    // texture dabs (colour only), clipped to existing alpha
    function dabs(o, r, n, area, cols, size) {
      cx.save(); cx.translate(o.ox, o.oy);
      cx.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < n; i++) {
        const x = area[0] + r() * area[2], y = area[1] + r() * area[3];
        cx.fillStyle = r.pick(cols);
        cx.beginPath(); cx.ellipse(x, y, size * (0.5 + r()), size * (0.3 + 0.5 * r()), r() * 3, 0, TAU); cx.fill();
      }
      cx.restore();
    }
    const R = rng(4242);
    const greens = { moss: ['#6e9a3c', '#7aa646', '#628f36'], mossHi: ['#a9c862', '#b8d46e', '#94bb55'], mossLo: ['#4a752c', '#3f6a28'],
      shrub: ['#4f7f3a', '#5a8a3e', '#46733a'], shrubHi: ['#86b25a', '#9bc265'], shrubLo: ['#355f2e', '#2f552c'],
      pine: ['#2f5a46', '#355f49', '#2a5241'], pineHi: ['#5c8c5c', '#6e9a62'], pineLo: ['#1f4436', '#22493a'] };
    const INK = 48 / 255;
    // --- moss mounds
    for (let v = 0; v < 8; v++) {
      const o = cell('moss'); const r = rng(100 + v);
      const blobs = []; const n = 3 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const x = 128 + (r() - 0.5) * 110, rx = 30 + r() * 34, ry = rx * (0.55 + r() * 0.25);
        blobs.push({ x, y: 240 - ry + (r() - 0.5) * 10, rx, ry, col: r.pick(greens.moss) });
      }
      cluster(o, blobs, 3.5);
      dabs(o, r, 70, [20, 120, 216, 130], greens.mossHi, 7);
      dabs(o, r, 50, [20, 170, 216, 90], greens.mossLo, 6);
    }
    // --- shrubs
    for (let v = 0; v < 8; v++) {
      const o = cell('shrub'); const r = rng(200 + v);
      const blobs = []; const n = 6 + Math.floor(r() * 6);
      const H = 140 + r() * 80;
      for (let i = 0; i < n; i++) {
        const t = i / n; const rx = 26 + r() * 26;
        blobs.push({ x: 128 + (r() - 0.5) * 100 * (1 - t * 0.5), y: 244 - rx * 0.6 - t * H * 0.75, rx, ry: rx * (0.72 + r() * 0.2), col: r.pick(greens.shrub) });
      }
      // a couple of branch stubs under the foliage
      cx.save(); cx.translate(o.ox, o.oy); cx.strokeStyle = '#4b3424'; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(128, 250); cx.lineTo(120 + r() * 20, 190); cx.stroke(); cx.restore();
      cluster(o, blobs, 3.5);
      dabs(o, r, 80, [20, 250 - H, 216, H], greens.shrubHi, 8);
      dabs(o, r, 50, [20, 250 - H * 0.5, 216, H * 0.5], greens.shrubLo, 7);
    }
    // --- flower clumps
    const flowerCols = [['#fbf3dc', '#ffffff'], ['#f6d25a', '#ffe58a'], ['#e98d9a', '#f4b3bd'], ['#b9a2e0', '#d6c6f2'], ['#f39a5a', '#fcbf87'], ['#fbf3dc', '#f6d25a']];
    for (let v = 0; v < 6; v++) {
      const o = cell('flower'); const r = rng(300 + v);
      const blobs = [];
      for (let i = 0; i < 4; i++) { const rx = 30 + r() * 26; blobs.push({ x: 128 + (r() - 0.5) * 110, y: 240 - rx * 0.5, rx, ry: rx * 0.55, col: r.pick(greens.moss) }); }
      cluster(o, blobs, 3.5);
      dabs(o, r, 40, [30, 190, 196, 60], greens.mossHi, 6);
      cx.save(); cx.translate(o.ox, o.oy);
      for (let i = 0; i < 26; i++) {
        const x = 50 + r() * 156, y = 175 + r() * 50, s = 5 + r() * 5;
        cx.fillStyle = flowerCols[v][0]; cx.beginPath(); cx.arc(x, y, s, 0, TAU); cx.fill();
        cx.fillStyle = flowerCols[v][1]; cx.beginPath(); cx.arc(x - s * 0.3, y - s * 0.3, s * 0.45, 0, TAU); cx.fill();
        cx.fillStyle = '#d9a03a'; cx.beginPath(); cx.arc(x, y, s * 0.28, 0, TAU); cx.fill();
      }
      cx.restore();
    }
    // --- grass tufts
    for (let v = 0; v < 6; v++) {
      const o = cell('grass'); const r = rng(400 + v);
      const blades = 14 + Math.floor(r() * 10);
      const bl = [];
      for (let i = 0; i < blades; i++) bl.push({ bx: 128 + (r() - 0.5) * 120, h: 80 + r() * 110, lean: (r() - 0.35) * 70, w: 7 + r() * 6, col: r.pick(['#7fa443', '#93b54e', '#6b9238', '#a8c45e']) });
      for (const pass of [0, 1]) {
        const ctx = pass === 0 ? ix : cx;
        ctx.save(); ctx.translate(o.ox, o.oy);
        for (const q of bl) {
          ctx.fillStyle = pass === 0 ? '#fff' : q.col;
          const grow = pass === 0 ? 3 : 0;
          ctx.beginPath(); ctx.moveTo(q.bx - q.w / 2 - grow, 252); ctx.quadraticCurveTo(q.bx + q.lean * 0.3, 252 - q.h * 0.6, q.bx + q.lean, 252 - q.h - grow); ctx.quadraticCurveTo(q.bx + q.lean * 0.3 + q.w * 0.2, 252 - q.h * 0.55, q.bx + q.w / 2 + grow, 252); ctx.fill();
        }
        ctx.restore();
      }
      // ink only around the outer edge: knock out the blade interiors
      ix.save(); ix.translate(o.ox, o.oy); ix.globalCompositeOperation = 'destination-out';
      for (const q of bl) { ix.beginPath(); ix.moveTo(q.bx - q.w / 2 + 1, 252); ix.quadraticCurveTo(q.bx + q.lean * 0.3, 252 - q.h * 0.6, q.bx + q.lean, 252 - q.h + 2); ix.quadraticCurveTo(q.bx + q.lean * 0.3 + q.w * 0.2, 252 - q.h * 0.55, q.bx + q.w / 2 - 1, 252); ix.fill(); }
      ix.restore();
      // normals: flat-ish upward
      nx.save(); nx.translate(o.ox, o.oy); nx.fillStyle = 'rgb(140,200,0)'; nx.fillRect(10, 40, 236, 216); nx.restore();
    }
    // --- pine foliage pads (flat cloud-pruned layers: scalloped top, flat dark underside)
    for (let v = 0; v < 10; v++) {
      const o = cell('pad'); const r = rng(500 + v);
      const blobs = []; const n = 6 + Math.floor(r() * 3);
      const W = 150 + r() * 40;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1); const rx = 24 + r() * 16;
        blobs.push({ x: 128 - W / 2 + t * W + (r() - 0.5) * 10, y: 132 - Math.sin(Math.PI * t) * 22 + (r() - 0.5) * 8, rx, ry: rx * 0.58, col: r.pick(greens.pine), bumps: 9 });
      }
      blobs.push({ x: 128, y: 146, rx: W * 0.52, ry: 18, col: r.pick(greens.pineLo), bumps: 14 });
      cluster(o, blobs, 3.5);
      dabs(o, r, 60, [128 - W / 2, 98, W, 30], greens.pineHi, 6);
      cx.save(); cx.translate(o.ox, o.oy); cx.globalCompositeOperation = 'source-atop'; cx.strokeStyle = '#7aa87a'; cx.lineWidth = 2;
      for (let i = 0; i < 50; i++) { const x = 128 - W / 2 + r() * W, y = 100 + r() * 30; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + (r() - 0.5) * 8, y - 5 - r() * 5); cx.stroke(); }
      cx.restore();
    }
    // --- sod clumps (earth with grass cap)
    for (let v = 0; v < 6; v++) {
      const o = cell('sod'); const r = rng(600 + v);
      const blobs = [];
      for (let i = 0; i < 3; i++) { const rx = 40 + r() * 30; blobs.push({ x: 128 + (r() - 0.5) * 80, y: 230 - rx * 0.4, rx, ry: rx * 0.45, col: r.pick(['#7a5a3a', '#6c4e33', '#86643f']) }); }
      for (let i = 0; i < 4; i++) { const rx = 30 + r() * 28; blobs.push({ x: 128 + (r() - 0.5) * 100, y: 205 - rx * 0.45, rx, ry: rx * 0.5, col: r.pick(greens.moss) }); }
      cluster(o, blobs, 3.5);
      dabs(o, r, 50, [20, 160, 216, 50], greens.mossHi, 6);
    }
    // --- sapling (Pip's tiny tree)
    {
      const o = cell('sapling'); const r = rng(700);
      cx.save(); cx.translate(o.ox, o.oy); ix.save(); ix.translate(o.ox, o.oy);
      ix.strokeStyle = '#fff'; ix.lineWidth = 12; ix.beginPath(); ix.moveTo(128, 255); ix.quadraticCurveTo(120, 160, 140, 90); ix.stroke();
      cx.strokeStyle = '#5b3d28'; cx.lineWidth = 7; cx.beginPath(); cx.moveTo(128, 255); cx.quadraticCurveTo(120, 160, 140, 90); cx.stroke();
      cx.restore(); ix.restore();
      const blobs = [];
      for (let i = 0; i < 7; i++) { const rx = 22 + r() * 18; blobs.push({ x: 138 + (r() - 0.5) * 90, y: 80 + (r() - 0.5) * 50, rx, ry: rx * 0.7, col: r.pick(greens.shrub) }); }
      cluster(o, blobs, 3.5);
      dabs(o, r, 50, [60, 30, 140, 90], greens.shrubHi, 6);
    }

    // combine into textures: colour (premultiplied-safe RGBA) and normal/ink map
    const cd = cx.getImageData(0, 0, ATLAS, ATLAS), nd = nx.getImageData(0, 0, ATLAS, ATLAS), id = ix.getImageData(0, 0, ATLAS, ATLAS);
    const outN = new Uint8Array(ATLAS * ATLAS * 4), outC = new Uint8Array(ATLAS * ATLAS * 4);
    for (let k = 0; k < ATLAS * ATLAS; k++) {
      const ink = id.data[k * 4 + 3];
      const a = Math.max(cd.data[k * 4 + 3], ink);
      outC[k * 4] = cd.data[k * 4]; outC[k * 4 + 1] = cd.data[k * 4 + 1]; outC[k * 4 + 2] = cd.data[k * 4 + 2]; outC[k * 4 + 3] = a;
      outN[k * 4] = nd.data[k * 4]; outN[k * 4 + 1] = nd.data[k * 4 + 1]; outN[k * 4 + 2] = ink; outN[k * 4 + 3] = a;
    }
    // dilate colour into transparent texels to avoid dark fringes under filtering
    for (let pass = 0; pass < 2; pass++) for (let y = 1; y < ATLAS - 1; y++) for (let x = 1; x < ATLAS - 1; x++) {
      const k = y * ATLAS + x; if (outC[k * 4 + 3] > 0) continue;
      for (const o of [1, -1, ATLAS, -ATLAS]) { const q = k + o; if (outC[q * 4 + 3] > 0 || (pass && (outC[q * 4] || outC[q * 4 + 1]))) { outC[k * 4] = outC[q * 4]; outC[k * 4 + 1] = outC[q * 4 + 1]; outC[k * 4 + 2] = outC[q * 4 + 2]; break; } }
    }
    return { outC, outN, cells };
  }

  // ------------------------------------------------------------------ shaders
  const { SCENE_UNIFORMS, SCENE_FUNCS, OUTS } = SW.SHADER_SCENE;
  // instance: aP (anchor xyz, size m), aUp (up dir xyz, depth pull m), aR (atlas rect), aM (flipX, lean rad, squash, tint)
  const SPR_VS = `
  in vec2 aCorner; in vec4 aP; in vec4 aUp; in vec4 aR; in vec4 aM;
  ${SCENE_UNIFORMS}
  uniform vec2 uRes;
  out vec2 vUv; out vec3 vPos; out float vTint; out vec2 vRot; out float vFlip;
  void main(){
    vec3 P = aP.xyz; float size = aP.w;
    vec4 c0 = uViewProj*vec4(P,1.0);
    vec4 c1 = uViewProj*vec4(P + aUp.xyz*size, 1.0);
    vec2 s0 = c0.xy/c0.w*uRes*0.5, s1 = c1.xy/c1.w*uRes*0.5;
    vec2 up = s1 - s0; float ul = length(up);
    vec2 camUp = vec2(0.0, 1.0);
    vec2 dir = ul > 1e-3 ? up/ul : camUp;
    // keep sprites mostly upright on screen even when the normal points at the camera
    float pxSize = size * (uRes.y*0.5) * uFocal / c0.w;
    float k = clamp(ul/(pxSize+1e-3)*1.4, 0.0, 1.0);
    dir = normalize(mix(camUp, dir, k));
    float a = aM.y; dir = vec2(dir.x*cos(a) - dir.y*sin(a), dir.x*sin(a) + dir.y*cos(a));
    vec2 rt = vec2(dir.y, -dir.x);
    float sq = mix(1.0, aM.z, 1.0 - k);
    vec2 off = rt*aCorner.x*pxSize*0.5 + dir*(aCorner.y*0.5+0.5)*pxSize*sq;
    vec4 pull = uViewProj*vec4(P + normalize(uCamPos - P)*aUp.w, 1.0);
    gl_Position = vec4((s0 + off)/(uRes*0.5)*c0.w, pull.z/pull.w*c0.w, c0.w);
    vec2 uv = vec2(aCorner.x*0.5+0.5, 1.0 - (aCorner.y*0.5+0.5));
    if (aM.x > 0.5) uv.x = 1.0 - uv.x;
    vUv = aR.xy + uv*aR.zw;
    vPos = P + aUp.xyz*size*0.5;
    vTint = aM.w; vRot = dir; vFlip = aM.x;
  }`;
  const SPR_FS = `
  ${SCENE_UNIFORMS}
  uniform sampler2D uAtlasC; uniform sampler2D uAtlasN;
  in vec2 vUv; in vec3 vPos; in float vTint; in vec2 vRot; in float vFlip;
  ${OUTS}
  ${SCENE_FUNCS}
  void main(){
    vec4 c = texture(uAtlasC, vUv);
    vec4 n = texture(uAtlasN, vUv);
    float a = smoothstep(0.35, 0.65, c.a);
    if (uPass != 0) { if (c.a < 0.5) discard; oColor = vec4(linDepth(vPos),1.0,0.0,1.0); oAux = vec4(0.0); return; }
    if (a <= 0.01) discard;
    vec2 nn = n.rg*2.0 - 1.0;
    if (vFlip > 0.5) nn.x = -nn.x;
    // rotate sprite-space normal into screen space
    vec2 rt = vec2(vRot.y, -vRot.x);
    vec2 ns = rt*nn.x + vRot*nn.y;
    float nz = sqrt(max(0.0, 1.0 - dot(nn,nn)));
    float ndl = dot(ns, uLightScr)*0.85 + nz*0.25 + 0.12;
    float lit = aastep(0.05, ndl + (vnoise(vUv*900.0)-0.5)*0.1) * aastep(0.5, shadowAt(vPos, vec3(0.0,1.0,0.0)));
    vec3 base = c.rgb * vTint;
    vec3 col = base*mix(uKey*uShade, uKey, lit);
    // rim on light-facing foliage edges
    float edge = smoothstep(0.3, 0.9, length(nn));
    col = mix(col, max(base*uKey*1.35, uRimCol*0.9), edge*aastep(0.55, dot(ns, uLightScr))*uRimAmt*0.6*lit);
    if (uFlash.w > 0.0) col = mix(col, base*uFlashCol, uFlash.w*0.5*aastep(0.2, dot(ns, normalize(uLightScr))));
    float ink = n.b;
    col = mix(col, mix(uInk, vec3(0.12,0.22,0.14)*uKey, 0.55), ink*0.9);
    col = applyFog(col, vPos);
    oColor = vec4(col, a);
    oAux = vec4(a, 0.0, 0.0, a);
  }`;
  // pennant ribbons: aUV = (u along 0..1, v across -1..1, length m, colour index)
  const RIB_VS = `
  in vec3 aPos; in vec3 aNrm; in vec4 aUV;
  ${SCENE_UNIFORMS}
  out vec3 vPos; out vec3 vNrm; out vec4 vUV;
  void main(){ vPos=aPos; vNrm=aNrm; vUV=aUV; gl_Position = uViewProj*vec4(aPos,1.0); }`;
  const RIB_FS = `
  ${SCENE_UNIFORMS}
  uniform vec3 uPenn[3];
  in vec3 vPos; in vec3 vNrm; in vec4 vUV;
  ${OUTS}
  ${SCENE_FUNCS}
  void main(){
    float u = vUV.x, v = vUV.y;
    // swallow-tail cut at the end
    float fork = (u - 0.88)/0.12;
    float dfork = abs(v) - fork*0.75;
    if (u > 0.88 && dfork < 0.0) discard;
    if (uPass != 0) { oColor = vec4(linDepth(vPos),1.0,0.0,1.0); oAux = vec4(0.0); return; }
    vec3 N = normalize(vNrm); vec3 V = normalize(uCamPos - vPos);
    if (dot(N,V) < 0.0) N = -N;
    int ci = int(vUV.w + 0.5);
    vec3 base = uPenn[0]; if (ci == 1) base = uPenn[1]; if (ci == 2) base = uPenn[2];
    // faded: a pale band and sun-bleached tail
    base = mix(base, vec3(0.93,0.88,0.78), 0.25*aastep(0.45, abs(v))*(1.0-aastep(0.75,abs(v))) + 0.25*smoothstep(0.3, 1.0, u));
    base *= 0.95 + 0.08*vnoise(vec2(u*vUV.z*0.8, v*2.0));
    float ndl = dot(N, uLightDir);
    float lit = aastep(0.0, ndl);
    vec3 col = base*mix(uKey*uShade, uKey, lit);
    col = mix(col, base*uKey*vec3(1.0,0.9,0.75), smoothstep(0.1,0.4,-ndl)*0.45); // translucent
    if (uFlash.w > 0.0) col = mix(col, uFlashCol*base, uFlash.w*0.5);
    float mv = max(fwidth(v), 1e-4), mu = max(fwidth(u), 1e-5);
    float W = max(0.7, uInkW*0.55);
    float ePx = min((1.0 - abs(v))/mv, (u > 0.88 ? dfork/mv : 1e3));
    ePx = min(ePx, u/mu);
    float ink = 1.0 - smoothstep(W-0.5, W+0.5, ePx);
    col = mix(col, uInk, ink);
    col = applyFog(col, vPos);
    oColor = vec4(col, 1.0); oAux = vec4(1.0, 0.0, 0.0, 1.0);
  }`;

  // ------------------------------------------------------------------ layout per design
  function layout(d) {
    const r = rng(d.seed * 977 + 5);
    const g = d.garden;
    const items = [];
    const etaMoss = (s) => {
      const k = smoothstep(0.125, 0.175, s) * (1 - smoothstep(0.60, 0.655, s));
      let b = lerp(0.93, 0.71, smoothstep(0.14, 0.30, s)); b = lerp(b, 0.75, smoothstep(0.42, 0.58, s));
      return lerp(1.3, b, k);
    };
    const n = Math.round(150 * g.density);
    for (let i = 0; i < n; i++) {
      const s = 0.16 + r() * 0.46;
      const em = etaMoss(s);
      if (em > 1) continue;
      // bias toward the crest so the dorsal silhouette is bumpy with growth
      const eta = 1 - Math.pow(r(), 1.6) * (1 - em - 0.03);
      const side = r() < 0.5 ? 1 : -1;
      const roll = r();
      let type = roll < 0.40 ? 'moss' : roll < 0.48 ? 'shrub' : roll < 0.70 ? 'grass' : roll < 0.87 ? 'flower' : 'sod';
      // shrubs gather near the pine; elsewhere they become moss
      if (type === 'shrub' && Math.abs(s - (g.pineS || 0.43)) > 0.11 && r() < 0.7) type = 'moss';
      if (type === 'shrub' && r() > g.shrubs) type = 'moss';
      if (type === 'flower' && r() > g.flowers) type = 'grass';
      const size = (type === 'shrub' ? 3.6 + r() * 3.0 : type === 'moss' ? 2.0 + r() * 2.4 : type === 'sod' ? 2.4 + r() * 1.6 : 1.6 + r() * 1.4) * (d.L / 108);
      items.push({ type, s, eta, side, size, v: Math.floor(r() * 16), flip: r() < 0.5 ? 1 : 0, lean: (r() - 0.5) * 0.25, tint: 0.92 + r() * 0.14 });
    }
    if (g.sapling) items.push({ type: 'sapling', s: 0.40, eta: 1, side: 1, size: 7 * (d.L / 46) * 0.6, v: 0, flip: 0, lean: -0.1, tint: 1 });
    return items;
  }

  // ------------------------------------------------------------------ renderer
  function Garden(G) {
    const gl = G.gl;
    const atlas = paintAtlas();
    const texC = G.texture({ w: ATLAS, h: ATLAS, data: atlas.outC, mips: true });
    const texN = G.texture({ w: ATLAS, h: ATLAS, data: atlas.outN, mips: true });
    const progS = G.program('sprite', SPR_VS, SPR_FS);
    const progR = G.program('ribbon', RIB_VS, RIB_FS);
    const inst = G.instanced(progS, [{ name: 'aP', size: 4 }, { name: 'aUp', size: 4 }, { name: 'aR', size: 4 }, { name: 'aM', size: 4 }]);
    const ribMesh = G.mesh(progR, [{ name: 'aPos', size: 3 }, { name: 'aNrm', size: 3 }, { name: 'aUV', size: 4 }]);
    const layouts = new Map();
    const GR = { cells: atlas.cells };

    function rect(type, v) { const arr = atlas.cells[type]; return arr[v % arr.length]; }

    // sway of a point at body station s: lagged response to the body wave (overlapping action)
    function sway(w, t, s, lag) {
      const ph = TAU * w.swimPhase(t - lag) + w.phase - TAU * s / 1.15;
      return Math.sin(ph - 1.2) * Math.min(1, w.ampAt(t) / Math.max(1e-6, w.waveAmp));
    }

    // Build all garden geometry for a posed whale. Returns {sprites Float32Array, tubes[], ribbons Float32Array}
    GR.build = function (pose, t, cam) {
      const w = pose.whale, d = pose.d, L = d.L, g = d.garden;
      if (!layouts.has(d)) layouts.set(d, layout(d));
      const items = layouts.get(d);
      const spr = [];
      const sc = L / 108;
      const push = (P, up, size, pull, rc, flip, lean, squash, tint) => spr.push(P[0], P[1], P[2], size, up[0], up[1], up[2], pull, rc[0], rc[1], rc[2], rc[3], flip, lean, squash, tint);
      for (const it of items) {
        const phi = it.side > 0 ? Math.asin(clamp(it.eta * 2 - 1, -1, 1)) * 0 + (Math.PI / 2) * it.eta - 0 : 0;
        // map eta (0 keel .. 1 crest) to an angle on the right/left side
        const ang = -Math.PI / 2 + Math.PI * it.eta;
        const ph = it.side > 0 ? ang : Math.PI - ang;
        const sf = SW.WHALE.surf(pose, it.s, ph, -0.25 * it.size);
        // foliage bends with the wind and the body's motion
        const sw = sway(w, t, it.s, 0.25) * 0.06;
        const up = v3.norm(v3.add(v3.lerp(sf.n, sf.fr.U, 0.55), v3.scale(sf.fr.T, -0.12 + sw)));
        push(sf.p, up, it.size, it.size * 0.35, rect(it.type, it.v), it.flip, it.lean, 0.75, it.tint);
      }
      const tubes = [], ribbons = [];
      const pal = d.pal;
      // ---------------- pine tree
      if (g.pine > 0) {
        const s0 = g.pineS || 0.43;
        const base = SW.WHALE.surf(pose, s0, Math.PI / 2, -0.6 * sc);
        const fr = base.fr;
        const H = 17 * g.pine * sc;
        const pts = [], radii = [];
        const sw1 = sway(w, t, s0, 0.35), sw2 = sway(w, t, s0, 0.7);
        const gust = (SW.vnoise2(t * 0.35, 3.1, 7) - 0.5) * 2;
        const NSEG = 14;
        // classic wind-bent pine: rises, bends hard to leeward, crown lifts again
        const trunkAt = (u) => {
          const aft = (0.12 * u + 0.36 * u * u) * H + (0.035 * sw1 * u * u + 0.03 * sw2 * u * u * u + 0.02 * gust * u * u) * H;
          const up = u * H * (1 - 0.12 * u);
          const sideways = 0.07 * Math.sin(u * 3.3) * H + 0.035 * Math.sin(u * 11.0 + 1.0) * H;
          return v3.madd(v3.madd(v3.madd(base.p, fr.U, up), fr.T, -aft), fr.R, sideways);
        };
        for (let k = 0; k <= NSEG; k++) { const u = k / NSEG; pts.push(trunkAt(u)); radii.push(lerp(1.15, 0.30, Math.pow(u, 0.8)) * sc * g.pine); }
        tubes.push({ pts, radii, color: hex('#5a3e2c'), mat: 2 });
        // branches stream leeward (aft) and to either side; cloud-pruned pads at their ends
        const br = [[0.42, 1, 0.62, 1.05], [0.56, -1, 0.52, 1.0], [0.70, 1, 0.40, 0.9], [0.83, -1, 0.28, 0.8], [1.0, 0, 0.0, 1.0]];
        br.forEach(([u, sd, len, padS], bi) => {
          const p0 = trunkAt(u);
          const lagSw = sway(w, t, s0, 0.5 + 0.15 * bi) * 0.06 + 0.035 * gust;
          const dir = v3.norm(v3.add(v3.add(v3.scale(fr.T, -1.0 - lagSw), v3.scale(fr.R, sd * 0.28)), v3.scale(fr.U, -0.10)));
          const L1 = len * H;
          const pm = v3.madd(v3.madd(p0, dir, L1 * 0.5), fr.U, -0.04 * L1);
          const p1 = v3.madd(v3.madd(p0, dir, L1), fr.U, 0.06 * L1);
          if (len > 0) tubes.push({ pts: [p0, pm, p1], radii: [0.36 * sc * g.pine, 0.24 * sc * g.pine, 0.15 * sc * g.pine], color: hex('#5a3e2c'), mat: 2 });
          const padSize = padS * 10.5 * sc * g.pine;
          push(v3.madd(p1, fr.U, -padSize * 0.52), fr.U, padSize, padSize * 0.25, rect('pad', bi * 3 + (d.seed % 3)), bi % 2, sd * 0.05 + lagSw * 0.6, 0.6, 1.0);
          
        });
      }
      // ---------------- mast, yard, rigging, pennants
      if (g.mast) {
        const sm = 0.30;
        const base = SW.WHALE.surf(pose, sm, Math.PI / 2, -0.8 * sc);
        const fr = base.fr;
        const H = 18 * sc * (g.mastTall || 1);
        const sw1 = sway(w, t, sm, 0.2);
        const raise = w.mastRaise ? w.mastRaise(t) : 1;
        const mdir = v3.norm(v3.rot(fr.U, fr.R, (1 - raise) * 1.38));
        const top = v3.madd(v3.madd(base.p, mdir, H), fr.T, -H * (0.06 + 0.01 * sw1) * raise);
        const mastPts = [base.p, v3.lerp(base.p, top, 0.5), top];
        tubes.push({ pts: mastPts, radii: [0.55 * sc, 0.45 * sc, 0.32 * sc], color: hex('#7a5638'), mat: 1 });
        const yc = v3.lerp(base.p, top, 0.78);
        const yw = 6.5 * sc * (g.mastTall || 1);
        const ya = v3.madd(yc, fr.R, yw), yb = v3.madd(yc, fr.R, -yw);
        tubes.push({ pts: [ya, yc, yb], radii: [0.22 * sc, 0.3 * sc, 0.22 * sc], color: hex('#7a5638'), mat: 1 });
        // rigging (sagging lines)
        const rope = (a, b, sag) => { const ps = []; for (let k = 0; k <= 8; k++) { const u = k / 8; const p = v3.lerp(a, b, u); p[1] -= sag * 4 * u * (1 - u); ps.push(p); } tubes.push({ pts: ps, radii: ps.map(() => 0.07 * sc), color: hex('#3b2e26'), mat: 0, minPx: 0.45 }); };
        const fore = SW.WHALE.surf(pose, 0.085, Math.PI / 2, 0).p;
        const aft = SW.WHALE.surf(pose, 0.55, Math.PI / 2, 0).p;
        rope(top, fore, 0.6 * sc); rope(top, aft, 0.5 * sc);
        for (const sd of [1, -1]) {
          const sp = SW.WHALE.surf(pose, 0.33, sd > 0 ? 0.55 : Math.PI - 0.55, 0).p;
          rope(sd > 0 ? ya : yb, sp, 0.3 * sc);
          rope(top, SW.WHALE.surf(pose, 0.27, sd > 0 ? 0.75 : Math.PI - 0.75, 0).p, 0.25 * sc);
        }
        // pennants stream with the relative wind; follow-through via velocity history
        const np = g.pennants || 0;
        const specs = [[top, 26, 1.7, 0], [top, 19, 1.3, 1], [ya, 13, 1.0, 2], [yb, 12, 1.0, 1]].slice(0, np + (np >= 3 ? 1 : 0));
        specs.forEach(([anchor, len0, wid0, ci], pi) => {
          const pk = w.pennantK ? w.pennantK(t) : 1; if (pk <= 0.01) return;
          const len = len0 * sc * pk, wid = wid0 * sc * (0.55 + 0.45 * pk);
          const NSEG = 36;
          const prev = [];
          for (let k = 0; k <= NSEG; k++) {
            const u = k / NSEG;
            const tl = t - u * 0.9;
            const vel = w.velocity(tl);
            const rel = v3.sub(w.wind || [0, 0, 0], vel);
            const sp = v3.len(rel);
            let dir = sp > 0.3 ? v3.scale(rel, 1 / sp) : [0, -1, 0];
            // droop when slow
            const droopK = clamp(1.6 / (sp + 0.5), 0, 1);
            dir = v3.norm(v3.add(dir, [0, -0.25 - droopK, 0]));
            const lat = v3.norm(v3.cross(dir, [0, 1, 0]));
            const ver = v3.norm(v3.cross(lat, dir));
            const ph = TAU * (u * 1.6 - t * (0.55 + 0.08 * pi)) + pi * 1.7;
            const amp = (0.10 + 0.22 * u) * u * len * (0.6 + 0.4 * clamp(sp / 8, 0, 1.5));
            const base = k === 0 ? anchor : v3.madd(prev[k - 1].p, dir, len / NSEG);
            const p = v3.add(base, v3.add(v3.scale(lat, 0), v3.scale(ver, 0)));
            prev.push({ p, dir, lat, ver, wav: [Math.sin(ph) * amp, Math.sin(ph * 0.7 + 1.3) * amp * 0.45], tw: Math.sin(ph + 0.8) * 0.5 });
          }
          // apply waves and build strip (width axis mostly vertical, twisting)
          const rows = prev.map((q, k) => {
            const u = k / NSEG;
            const p = v3.add(q.p, v3.add(v3.scale(q.lat, q.wav[0]), v3.scale(q.ver, q.wav[1])));
            const wa = v3.norm(v3.add(v3.scale(q.ver, Math.cos(q.tw)), v3.scale(q.lat, Math.sin(q.tw))));
            const hw = wid * (1 - 0.55 * u) * 0.5;
            return { a: v3.madd(p, wa, hw), b: v3.madd(p, wa, -hw), n: v3.norm(v3.cross(q.dir, wa)), u };
          });
          for (let k = 0; k < rows.length - 1; k++) {
            const A = rows[k], B = rows[k + 1];
            const quad = [[A.a, A, 1], [B.a, B, 1], [A.b, A, -1], [B.a, B, 1], [B.b, B, -1], [A.b, A, -1]];
            for (const [p, R0, vv] of quad) ribbons.push(p[0], p[1], p[2], R0.n[0], R0.n[1], R0.n[2], R0.u, vv, len, ci % 3);
          }
        });
      }
      return { sprites: new Float32Array(spr), tubes, ribbons: new Float32Array(ribbons) };
    };

    GR.drawSprites = function (data, scene, a2c) {
      if (!data.sprites.length) return;
      inst.setData(data.sprites, data.sprites.length / 16);
      progS.use(scene).set({ uAtlasC: texC, uAtlasN: texN, uRes: [G.W, G.H] });
      if (a2c) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
      inst.draw();
      if (a2c) gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    };
    GR.drawRibbons = function (data, scene, pal) {
      if (!data.ribbons.length) return;
      ribMesh.setData(data.ribbons);
      const cols = []; (pal.pennants.concat(pal.pennants, pal.pennants)).slice(0, 3).forEach((h) => cols.push(...hex(h)));
      progR.use(scene).set({ uPenn: new Float32Array(cols) });
      ribMesh.draw();
    };
    return GR;
  }
  SW.Garden = Garden;
})(window.SW = window.SW || {});
