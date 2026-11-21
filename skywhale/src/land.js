// SKY WHALE — painted valley landscape (Movement II). The whole valley is painted once with
// Canvas 2D gouache-style strokes (fields, hedgerows, woods, a winding river, roads, villages,
// cloud shadows), then laid on a ground plane with aerial perspective.
(function (SW) {
  'use strict';
  const { clamp, lerp, smoothstep, rng, fbm2, vnoise2, TAU, hex } = SW;

  function paintLand(o) {
    const N = o.size || 4096, M = o.metres || 4200;   // texture px, metres covered
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d');
    const r = rng(o.seed || 77);
    const ppm = N / M;
    // terrain height (0..1): valley along a winding axis, hills on both sides
    const riverX = (v) => 0.5 + 0.13 * Math.sin(v * 5.2 + 0.7) + 0.06 * Math.sin(v * 13.1 + 2.0) + 0.02 * Math.sin(v * 31 + 1);
    const height = (u, v) => {
      const d = Math.abs(u - riverX(v));
      const valley = smoothstep(0.08, 0.42, d);
      return clamp(valley * 0.75 + (fbm2(u * 6, v * 6, 5, 3) - 0.5) * 0.45 * (0.3 + valley), 0, 1);
    };
    // 1. base: hillshaded greens painted at low res then upscaled (soft gouache wash)
    const B = 512, bc = document.createElement('canvas'); bc.width = bc.height = B;
    const bx = bc.getContext('2d'), im = bx.createImageData(B, B);
    const L = [-0.55, 0.62, 0.55];
    for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) {
      const u = i / B, v = j / B, e = 1 / B;
      const h = height(u, v);
      const gx = (height(u + e, v) - height(u - e, v)) / (2 * e), gy = (height(u, v + e) - height(u, v - e)) / (2 * e);
      const n = [-gx * 0.12, 1, -gy * 0.12], nl = Math.hypot(n[0], n[1], n[2]);
      const sh = clamp((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl, 0, 1);
      const low = hex('#9dbb6a'), mid = hex('#6f9a52'), hi = hex('#4d7a45'), top = hex('#7d8f5e');
      let col = h < 0.35 ? SW.mixc(low, mid, h / 0.35) : h < 0.7 ? SW.mixc(mid, hi, (h - 0.35) / 0.35) : SW.mixc(hi, top, (h - 0.7) / 0.3);
      const k = 0.72 + 0.45 * sh + (vnoise2(u * 40, v * 40, 9) - 0.5) * 0.08;
      const p = (j * B + i) * 4;
      im.data[p] = clamp(col[0] * k, 0, 1) * 255; im.data[p + 1] = clamp(col[1] * k, 0, 1) * 255; im.data[p + 2] = clamp(col[2] * k, 0, 1) * 255; im.data[p + 3] = 255;
    }
    bx.putImageData(im, 0, 0);
    x.imageSmoothingQuality = 'high';
    x.drawImage(bc, 0, 0, N, N);
    // 2. patchwork fields: recursive subdivision aligned with the valley, tiling the floor
    const fieldCols = ['#c9c46d', '#b3c66c', '#d6c07a', '#9fbd62', '#8db15c', '#cbb26b', '#a9b95e', '#bfa86a', '#dccd88', '#84aa58', '#b6a36c', '#9ab86a'];
    const ang = -0.28, ca = Math.cos(ang), sa = Math.sin(ang);
    const toTex = (px, py) => [N / 2 + ca * px - sa * py, N / 2 + sa * px + ca * py];
    const leaves = [];
    const subdiv = (x0, y0, w, h, depth) => {
      const area = w * h;
      if (depth > 1 && (area < 9000 + r() * 16000 || (depth > 4 && r() < 0.18))) { leaves.push([x0, y0, w, h]); return; }
      if (w > h * (0.75 + r() * 0.5)) { const k = w * (0.32 + r() * 0.36); subdiv(x0, y0, k, h, depth + 1); subdiv(x0 + k, y0, w - k, h, depth + 1); }
      else { const k = h * (0.32 + r() * 0.36); subdiv(x0, y0, w, k, depth + 1); subdiv(x0, y0 + k, w, h - k, depth + 1); }
    };
    subdiv(-N * 0.75, -N * 0.75, N * 1.5, N * 1.5, 0);
    const hedges = [];
    x.save();
    for (const [x0, y0, w, h] of leaves) {
      const c = toTex(x0 + w / 2, y0 + h / 2);
      if (c[0] < -50 || c[1] < -50 || c[0] > N + 50 || c[1] > N + 50) continue;
      const hh = height(c[0] / N, c[1] / N);
      if (hh > 0.40 + (r() - 0.5) * 0.08) continue;
      const j = () => (r() - 0.5) * 6;
      const corners = [[x0 + j(), y0 + j()], [x0 + w + j(), y0 + j()], [x0 + w + j(), y0 + h + j()], [x0 + j(), y0 + h + j()]].map((p) => toTex(p[0], p[1]));
      const path = new Path2D(); corners.forEach((p, k) => (k ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]))); path.closePath();
      x.globalAlpha = 0.95; x.fillStyle = r.pick(fieldCols); x.fill(path);
      x.save(); x.clip(path);
      // crop rows in the field's own direction
      x.globalAlpha = 0.14; x.strokeStyle = r() < 0.5 ? '#5f7432' : '#f4e8b0'; x.lineWidth = 1.6;
      const along = r() < 0.5, step = 5 + r() * 5;
      for (let k = 0; k < (along ? w : h); k += step) {
        const a1 = along ? toTex(x0 + k, y0) : toTex(x0, y0 + k), a2 = along ? toTex(x0 + k, y0 + h) : toTex(x0 + w, y0 + k);
        x.beginPath(); x.moveTo(a1[0], a1[1]); x.lineTo(a2[0], a2[1]); x.stroke();
      }
      // soft wash variation (radial, no edges)
      for (let k = 0; k < 4; k++) {
        const p = toTex(x0 + r() * w, y0 + r() * h), rr = 20 + r() * 50;
        const g = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr);
        const tone = r() < 0.5 ? '255,250,225' : '45,70,35';
        g.addColorStop(0, `rgba(${tone},0.16)`); g.addColorStop(1, `rgba(${tone},0)`);
        x.globalAlpha = 1; x.fillStyle = g; x.fillRect(p[0] - rr, p[1] - rr, rr * 2, rr * 2);
      }
      x.restore();
      x.globalAlpha = 0.55; x.strokeStyle = '#4e6e3a'; x.lineWidth = 2.2; x.stroke(path);
      for (let k = 0; k < 4; k++) if (r() < 0.45) hedges.push([corners[k], corners[(k + 1) % 4]]);
    }
    // hedgerows: clumps of trees along some field boundaries
    x.globalAlpha = 1;
    for (const [a, b] of hedges) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let t = r() * 0.1;
      while (t < 1) {
        const n = 2 + Math.floor(r() * 5);
        for (let q = 0; q < n && t < 1; q++) {
          const px = lerp(a[0], b[0], t) + (r() - 0.5) * 3, py = lerp(a[1], b[1], t) + (r() - 0.5) * 3, s = 3.2 + r() * 3.2;
          x.fillStyle = 'rgba(30,50,32,0.55)'; x.beginPath(); x.arc(px + s * 0.5, py + s * 0.5, s, 0, TAU); x.fill();
          x.fillStyle = r() < 0.5 ? '#2f5531' : '#3a6136'; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill();
          x.fillStyle = r() < 0.5 ? '#6a9450' : '#7aa25a'; x.beginPath(); x.arc(px - s * 0.3, py - s * 0.35, s * 0.5, 0, TAU); x.fill();
          t += (s * 1.3) / len;
        }
        t += (20 + r() * 60) / len;
      }
    }
    x.restore();
    // 3. woods on the slopes: dense crowns, dark undersides, lit tops
    for (let k = 0; k < 26000; k++) {
      const u = r(), v = r(); const h = height(u, v);
      if (h < 0.46 + (vnoise2(u * 30, v * 30, 4) - 0.5) * 0.2) continue;
      const px = u * N, py = v * N, s = 5 + r() * 7;
      x.fillStyle = r() < 0.5 ? '#2c4f36' : '#355b3a'; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill();
      x.fillStyle = r() < 0.5 ? '#5d8a52' : '#6f9a58'; x.beginPath(); x.arc(px - s * 0.35, py - s * 0.35, s * 0.5, 0, TAU); x.fill();
    }
    // 4. river: winding ribbon, banks, sandbars, sky reflection
    const rv = []; for (let k = 0; k <= 400; k++) { const v = k / 400 * 1.1 - 0.05; rv.push([riverX(v) * N, v * N]); }
    const ribbon = (w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); rv.forEach((p, k) => (k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke(); };
    ribbon(50, '#4f7a46'); ribbon(40, '#d9cf9a'); ribbon(32, '#8fb3c4'); ribbon(18, '#b9d3d9');
    x.globalAlpha = 0.5; ribbon(6, '#eef3ea'); x.globalAlpha = 1;
    // 5. roads: pale ochre lines meandering across the valley
    x.strokeStyle = '#d8c48c'; x.lineWidth = 5; x.globalAlpha = 0.9;
    for (let k = 0; k < 5; k++) {
      x.beginPath(); let px = r() * N, py = 0; x.moveTo(px, py);
      for (let q = 0; q < 40; q++) { px += (vnoise2(q * 0.3, k * 7, 21) - 0.5) * 220; py += N / 40; x.lineTo(px, py); }
      x.stroke();
    }
    x.globalAlpha = 1;
    // 6. villages: clusters of tiny roofs near the river
    for (let k = 0; k < 7; k++) {
      const v = 0.1 + r() * 0.8, side = r() < 0.5 ? -1 : 1;
      const cx = (riverX(v) + side * (0.03 + r() * 0.04)) * N, cy = v * N;
      for (let q = 0; q < 26; q++) {
        const px = cx + (r() - 0.5) * 110, py = cy + (r() - 0.5) * 110, w = 7 + r() * 7, h = 5 + r() * 4, a = r() * 3;
        x.save(); x.translate(px, py); x.rotate(a);
        x.fillStyle = 'rgba(40,50,40,0.35)'; x.fillRect(-w / 2 + 2, -h / 2 + 2, w, h);
        x.fillStyle = r.pick(['#c0573f', '#b2493a', '#d06f4b', '#8f5b47', '#e6dccb']); x.fillRect(-w / 2, -h / 2, w, h);
        x.fillStyle = 'rgba(255,240,220,0.35)'; x.fillRect(-w / 2, -h / 2, w, h / 2);
        x.restore();
      }
    }
    // 7. cloud shadows (soft violet washes)
    for (let k = 0; k < 9; k++) {
      const px = r() * N, py = r() * N, s = 120 + r() * 220;
      const g = x.createRadialGradient(px, py, s * 0.2, px, py, s);
      g.addColorStop(0, 'rgba(70,80,130,0.28)'); g.addColorStop(0.7, 'rgba(70,80,130,0.18)'); g.addColorStop(1, 'rgba(70,80,130,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(px, py, s * 1.4, s, r() * 3, 0, TAU); x.fill();
    }
    // 8. gouache texture: fine dry-brush flecks
    x.globalAlpha = 0.045;
    for (let k = 0; k < 60000; k++) { x.fillStyle = r() < 0.5 ? '#ffffff' : '#20301c'; x.fillRect(r() * N, r() * N, 1 + r() * 3, 1 + r() * 2); }
    x.globalAlpha = 1;
    return { canvas: c, metres: M, height, riverX };
  }

  const GROUND_VS = `
  in vec2 aCorner;
  uniform mat4 uViewProj; uniform vec3 uCenter; uniform float uSize;
  out vec3 vPos; out vec2 vUv;
  void main(){ vec3 p = uCenter + vec3(aCorner.x*uSize*3.0, 0.0, aCorner.y*uSize*3.0); vPos = p; vUv = aCorner*3.0*0.5+0.5; gl_Position = uViewProj*vec4(p,1.0); }`;
  const GROUND_FS = `
  uniform sampler2D uTex; uniform vec3 uCamPos; uniform vec3 uFog; uniform float uFogDen; uniform vec3 uTint; uniform vec3 uFar;
  uniform vec4 uShadows[12]; uniform float uShadowAmt; uniform vec3 uShadowCol;
  in vec3 vPos; in vec2 vUv;
  layout(location=0) out vec4 o; layout(location=1) out vec4 oA;
  void main(){
    vec3 c = texture(uTex, vUv).rgb * uTint;
    // cloud shadows on the land (soft painted washes, positioned by the sun)
    float sh = 0.0;
    for (int i = 0; i < 12; i++) { vec4 s = uShadows[i]; if (s.z <= 0.0) continue; vec2 d = (vPos.xz - s.xy)/s.z; d.y *= s.w; float q = dot(d,d); sh = max(sh, 1.0 - smoothstep(0.55, 1.0, q + 0.15*vnoise(vPos.xz*0.02))); }
    c = mix(c, c*uShadowCol, sh*uShadowAmt);
    float d = length(vPos - uCamPos);
    float f = 1.0 - exp(-d*uFogDen);
    c = mix(c, uFog, f);
    // fade to the distant colour beyond the painted area
    float e = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5));
    c = mix(c, uFar, smoothstep(0.45, 1.2, e));
    o = vec4(c, 1.0); oA = vec4(0.0);
  }`;
  function Ground(G, land) {
    const prog = G.program('ground', GROUND_VS, GROUND_FS);
    const tex = G.texture({ canvas: land.canvas, mips: true, wrap: 'mirror' });
    const quad = G.instanced(prog, [{ name: 'aDummy', size: 4 }]);
    quad.setData(new Float32Array([0, 0, 0, 0]), 1);
    return {
      draw(cam, o) {
        const gl = G.gl;
        const shd = new Float32Array(48); (o.shadows || []).slice(0, 12).forEach((q, i) => shd.set(q, i * 4));
        prog.use({ uViewProj: cam.viewProj, uCenter: o.center, uSize: land.metres, uTex: tex, uCamPos: cam.pos, uFog: o.fog, uFogDen: o.fogDen, uTint: o.tint || [1, 1, 1], uFar: o.far || o.fog,
          uShadows: shd, uShadowAmt: o.shadowAmt === undefined ? 0.45 : o.shadowAmt, uShadowCol: o.shadowCol || [0.55, 0.62, 0.85] });
        gl.disable(gl.DEPTH_TEST);
        quad.draw();
        gl.enable(gl.DEPTH_TEST);
      },
    };
  }
  SW.paintLand = paintLand;
  SW.Ground = Ground;
})(window.SW = window.SW || {});
