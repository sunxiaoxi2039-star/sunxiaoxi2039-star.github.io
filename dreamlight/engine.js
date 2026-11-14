/* 小芽与风的种子 · Dreamlight engine
 * Composites the painted layers from scenes.js with parallax camera moves,
 * draws the characters (chars.js) lit to match each scene, adds painterly
 * weather / light effects, film finishing, titles and subtitles, and a small
 * procedural score. Everything is a pure function of (shot, time), so the web
 * player and the frame-by-frame MP4 renderer (tools/render.cjs) match exactly.
 * No image assets are used: every pixel is drawn by code.
 */
(function () {
  'use strict';
  const { W, H, M, clamp, lerp } = P;
  const TAU = Math.PI * 2;
  const FONT = '"Noto Serif SC","Songti SC","STSong","WenQuanYi Zen Hei",serif';
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const hash = P.hash;

  // ---------- painted scenes, cached per shot (small LRU) ----------
  const cache = new Map(), CACHE_MAX = 6;
  function scene(shot) {
    let s = cache.get(shot.id);
    if (s) { cache.delete(shot.id); cache.set(shot.id, s); return s; }
    s = S.build(shot); cache.set(shot.id, s);
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return s;
  }

  const sceneCanvas = P.canvas(W, H), sctx = sceneCanvas.getContext('2d');
  const charCanvas = P.canvas(W, H), cctx = charCanvas.getContext('2d');
  const bloomCanvas = P.canvas(W / 4, H / 4), blx = bloomCanvas.getContext('2d');

  function camOf(shot, p) { const c = shot.cam || [1, 1.05, 0, 0], e = ease(p); return { z: lerp(c[0], c[1], e), px: c[2] * e * W, py: c[3] * e * H }; }
  function setCam(ctx, c, d, sh) { const z = 1 + (c.z - 1) * d; ctx.setTransform(z, 0, 0, z, W / 2 - (W / 2) * z + c.px * d + sh[0], H / 2 - (H / 2) * z + c.py * d + sh[1]); }

  function drawChar(ctx, t, c, p, shot, i) {
    const x = c.x * W, y = c.y * H, s = c.s || 1, o = Object.assign({ seed: i + 1, p, night: shot.variant === 'night' }, c);
    switch (c.k) {
      case 'girl': K.girl(ctx, t, x, y, s, o); break;
      case 'xuxu': K.xuxu(ctx, t, x, y, 60 * s); break;
      case 'xuxubig': K.xuxuBig(ctx, t, x, y, s, o); break;
      case 'grandma': K.grandma(ctx, t, x, y, s, o); break;
      case 'mom': K.mom(ctx, t, x, y, s, o); break;
      case 'fogman': K.fogman(ctx, t, x, y, s); break;
      case 'rhino': K.rhino(ctx, t, x, y, s, o); break;
      case 'driver': K.driver(ctx, t, x, y, s); break;
    }
  }
  function drawLayer(sc, name, cam, t, sh) {
    const L = sc.layers[name], A = sc.anim[name]; if (!L && !A) return;
    setCam(sctx, cam, sc.depth[name], sh);
    if (sc.breathe && sc.breathe.layer === name) { const k = Math.sin(t * 1.25) * sc.breathe.amp; sctx.translate(W / 2, sc.breathe.oy); sctx.scale(1 + k * 0.4, 1 + k); sctx.translate(-W / 2, -sc.breathe.oy); }
    if (L) sctx.drawImage(L.c, -M, -M);
    if (A) A(sctx, t);
  }

  function renderShot(out, shot, t) {
    const p = clamp(t / shot.dur, 0, 1), sc = scene(shot), cam = camOf(shot, p), fx = shot.fx || [];
    let sh = [0, 0];
    if (fx.includes('shake')) sh = [Math.sin(t * 43) * 6 * (1 - p), Math.cos(t * 37) * 5 * (1 - p)];
    else if (fx.includes('shake-soft')) sh = [Math.sin(t * 31) * 1.6, Math.cos(t * 27) * 1.2];
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over'; sctx.filter = 'none';
    sctx.fillStyle = '#000'; sctx.fillRect(0, 0, W, H);
    {
      if (sc.sky) { setCam(sctx, cam, 0.1, sh); sc.sky(sctx, t); }
      for (const cl of sc.clouds) { setCam(sctx, cam, cl.d, sh); sctx.globalAlpha = cl.a; sctx.drawImage(cl.img, cl.x + cl.vx * t, cl.y); sctx.globalAlpha = 1; }
      drawLayer(sc, 'back', cam, t, sh);
      drawLayer(sc, 'mid', cam, t, sh);
      const chars = shot.chars || [];
      if (chars.length) {
        cctx.setTransform(1, 0, 0, 1, 0, 0); cctx.clearRect(0, 0, W, H); setCam(cctx, cam, 1, sh);
        chars.forEach((c, i) => drawChar(cctx, t, c, p, shot, i));
        chars.forEach((c) => { if (c.k === 'mom') K.momFront(cctx, t, c.x * W, c.y * H, c.s || 1, c); });
        if (sc.tint) { cctx.setTransform(1, 0, 0, 1, 0, 0); cctx.globalCompositeOperation = 'source-atop'; cctx.fillStyle = P.css(sc.tint[0], sc.tint[1]); cctx.fillRect(0, 0, W, H); cctx.globalCompositeOperation = 'source-over'; }
        sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.drawImage(charCanvas, 0, 0);
      }
      drawLayer(sc, 'front', cam, t, sh);
    }
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = shot.gray ? lerp(shot.gray[0], shot.gray[1], ease(clamp((p - 0.1) / 0.7, 0, 1))) : 0;
    out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.globalCompositeOperation = 'source-over';
    out.filter = g > 0.01 ? `grayscale(${g}) brightness(${1 - g * 0.1}) contrast(${1 - g * 0.12})` : 'none';
    out.drawImage(sceneCanvas, 0, 0); out.filter = 'none';
    fx.forEach((f) => FX[f] && FX[f](out, t, p));
    finish(out, g);
    if (shot.title) drawTitle(out, shot, t);
  }

  // ---------- film finishing: soft bloom, gouache paper grain, vignette ----------
  function finish(out, g) {
    blx.setTransform(1, 0, 0, 1, 0, 0); blx.clearRect(0, 0, W / 4, H / 4);
    blx.filter = 'brightness(1.05) contrast(1.9) blur(5px)'; blx.drawImage(out.canvas, 0, 0, W / 4, H / 4); blx.filter = 'none';
    out.save(); out.globalCompositeOperation = 'screen'; out.globalAlpha = 0.2 * (1 - g * 0.5); out.drawImage(bloomCanvas, 0, 0, W, H); out.restore();
    P.tex(out, 'paper', 0.28, 'soft-light', [0, 0, W, H]);
    out.fillStyle = P.rg(out, W / 2, H * 0.48, W * 0.3, W * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(26,14,6,0.36)']]); out.fillRect(0, 0, W, H);
  }

  // ---------- weather & light (screen space, time-driven, stateless) ----------
  let fogTex = null;
  function fogTexture() {
    if (fogTex) return fogTex;
    const w = 480, h = 270, c = P.canvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
    for (let j = 0; j < h; j++) {
      const fade = P.smooth(0, 0.28, j / h) * P.smooth(1, 0.72, j / h);
      for (let i = 0; i < w; i++) { const v = P.pfbm((i / w) * 6, j / 52, 6, 4), a = P.smooth(0.38, 0.75, v) * fade, k = (j * w + i) * 4; d[k] = 152; d[k + 1] = 155; d[k + 2] = 162; d[k + 3] = a * 255; }
    }
    x.putImageData(im, 0, 0); fogTex = c; return c;
  }
  function seed(ctx, x, y, r, a) {
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * a})`; ctx.lineWidth = Math.max(0.6, r * 0.09); ctx.beginPath();
    for (let k = 0; k < 9; k++) { const an = -Math.PI * (0.1 + (0.8 * k) / 8); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r * 0.85); }
    ctx.moveTo(x, y); ctx.lineTo(x, y + r * 1.5); ctx.stroke();
    P.circle(ctx, x, y + r * 1.55, Math.max(0.8, r * 0.14), `rgba(150,120,80,${a})`);
  }
  const FX = {
    rain(ctx, t, p, n = 300, a = 0.42) {
      ctx.lineCap = 'round';
      for (const [L, k, w, aa] of [[n, 1, 1.1, a * 0.7], [n * 0.25, 1.9, 1.8, a]]) {
        ctx.strokeStyle = `rgba(214,226,240,${aa})`; ctx.lineWidth = w; ctx.beginPath();
        for (let i = 0; i < L; i++) { const sp = (850 + hash(i) * 450) * k, x = hash(i + 1) * (W + 200) - 100, y = ((hash(i + 2) * (H + 80) + t * sp) % (H + 80)) - 40, len = 16 * k + hash(i + 3) * 10; ctx.moveTo(x, y); ctx.lineTo(x - len * 0.22, y + len); }
        ctx.stroke();
      }
    },
    'rain-light'(ctx, t, p) { FX.rain(ctx, t, p, 120, 0.3); },
    seeds(ctx, t, p, n = 30) {
      for (let i = 0; i < n; i++) {
        const sp = 16 + hash(i) * 28, depth = hash(i + 77), r = 4 + depth * 9, x = ((hash(i + 5) * W + t * sp * 1.6 + Math.sin(t * 0.7 + i) * 34) % (W + 120)) - 60, y = (((hash(i + 9) * H - t * sp) % H) + H) % H;
        if (depth > 0.85) { ctx.save(); ctx.filter = 'blur(2px)'; seed(ctx, x, y, r * 2.2, 0.5); ctx.restore(); } else seed(ctx, x, y, r, 0.9);
      }
    },
    'seeds-many'(ctx, t, p) { FX.seeds(ctx, t, p, 110); },
    glow(ctx, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const x = hash(i) * W + Math.sin(t * 0.5 + i) * 30, y = hash(i + 50) * H + Math.cos(t * 0.4 + i) * 20, r = 6 + hash(i + 2) * 14, a = 0.2 + 0.2 * Math.sin(t * 2 + i); ctx.fillStyle = P.rg(ctx, x, y, 0, r, [[0, `rgba(255,240,200,${a})`], [1, 'rgba(255,240,200,0)']]); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } ctx.restore(); },
    fireflies(ctx, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 30; i++) { const x = hash(i) * W + Math.sin(t * 0.6 + i * 2) * 40, y = H * 0.4 + hash(i + 7) * H * 0.55 + Math.cos(t * 0.8 + i) * 25, a = Math.max(0, Math.sin(t * 1.7 + i * 1.3)); ctx.fillStyle = P.rg(ctx, x, y, 0, 15, [[0, `rgba(220,255,140,${a * 0.85})`], [1, 'rgba(220,255,140,0)']]); ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill(); } ctx.restore(); },
    'dust-gold'(ctx, t) { for (let i = 0; i < 80; i++) { const x = (hash(i) * W + t * 6) % W, y = hash(i + 3) * H + Math.sin(t * 0.5 + i) * 20, a = 0.25 + 0.25 * Math.sin(t + i); P.circle(ctx, x, y, 1 + hash(i + 1) * 1.8, `rgba(255,236,180,${a})`); } },
    dust(ctx, t) { for (let i = 0; i < 18; i++) { const x = ((hash(i) * W + t * 25 * (hash(i + 1) + 0.3)) % (W + 300)) - 150, y = H * 0.66 + hash(i + 2) * H * 0.3, r = 80 + hash(i + 3) * 120; ctx.fillStyle = P.rg(ctx, x, y, 0, r, [[0, 'rgba(180,160,130,0.32)'], [1, 'rgba(180,160,130,0)']]); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } },
    fog(ctx, t, p, a = 0.85) {
      const f = fogTexture(); ctx.save(); ctx.globalAlpha = a;
      for (const [k, sp, y0] of [[2.8, 14, -120], [2.0, 26, 170], [1.5, 40, 380]]) { const w = f.width * k, h = f.height * k, ox = -((t * sp) % w); for (let x = ox; x < W; x += w - 1) ctx.drawImage(f, x, y0, w, h); }
      ctx.fillStyle = 'rgba(150,153,160,0.18)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    },
    'fog-light'(ctx, t, p) { FX.fog(ctx, t, p, 0.4); },
    petals(ctx, t) { for (let i = 0; i < 46; i++) { const x = ((hash(i) * W + t * 40 + Math.sin(t + i) * 40) % (W + 40)) - 20, y = (hash(i + 4) * H + t * (30 + hash(i) * 30)) % H; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.scale(1, 0.55 + 0.45 * Math.sin(t * 3 + i)); P.ell(ctx, 0, 0, 6, 3.6, i % 3 ? '#f7c6d4' : '#fbe2ea'); ctx.restore(); } },
    wind(ctx, t) { ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 10; i++) { const y = hash(i) * H, x = ((t * 600 + hash(i + 1) * W * 2) % (W * 2)) - W * 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 80, y - 20, x + 160, y + 20, x + 260, y); ctx.stroke(); } },
    burst(ctx, t, p) {
      const k = clamp(p * 1.6, 0, 1); ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = P.rg(ctx, W * 0.45, H * 0.55, 10, 60 + k * W, [[0, `rgba(255,214,120,${0.4 * (1 - k * 0.6)})`], [1, 'rgba(255,214,120,0)']]); ctx.fillRect(0, 0, W, H); ctx.restore();
      for (let i = 0; i < 46; i++) { const a = hash(i) * TAU, d = k * (200 + hash(i + 1) * 520); P.circle(ctx, W * 0.45 + Math.cos(a) * d, H * 0.55 + Math.sin(a) * d * 0.6, 3 + hash(i + 2) * 6, ['#e3402d', '#f6c42b', '#4caf50', '#3f8fd6', '#ef8fb0'][i % 5]); }
    },
  };

  // ---------- titles & subtitles ----------
  function drawTitle(ctx, shot, t) {
    const a = clamp(t / 1.0, 0, 1) * clamp((shot.dur - t) / 0.8, 0, 1), y = H / 2 - 30;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7a5a3a'; ctx.font = `500 30px ${FONT}`; ctx.fillText(shot.title, W / 2, y - 64);
    ctx.fillStyle = '#3d2c1e'; ctx.font = `700 74px ${FONT}`; ctx.shadowColor = 'rgba(250,244,230,0.9)'; ctx.shadowBlur = 18; ctx.fillText(shot.subtitle || '', W / 2, y + 10); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(122,90,58,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 150 * a, y + 76); ctx.lineTo(W / 2 + 150 * a, y + 76); ctx.stroke();
    if (shot.title !== '完') { ctx.fillStyle = '#7a5a3a'; ctx.font = `400 21px ${FONT}`; ctx.fillText('小芽与风的种子', W / 2, y + 108); }
    ctx.restore();
  }
  const SPEAKER = { '小芽': '#ffd34d', '絮絮': '#ffffff', '妈妈': '#f5c9a6', '外婆': '#b8c8ff', '老楼': '#ffb38a', '灰先生': '#c4c7cd', '铁犀牛': '#f2c14e', '司机叔叔': '#ff9a5a', '旁白': '#e9e2d0', '小芽 / 外婆': '#ffe6a0' };
  const NOBREAK = '，。！？、…」』）—';
  function wrap(ctx, s, maxW) { const out = []; let cur = ''; for (const ch of s) { if (ctx.measureText(cur + ch).width > maxW && cur && !NOBREAK.includes(ch)) { out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cur); return out; }
  function drawSubtitle(ctx, shot, t) {
    if (!shot.line) return;
    const reveal = clamp((t - 0.5) * 14, 0, shot.line.length); if (reveal <= 0) return;
    const out = clamp((shot.dur - t) / 0.4, 0, 1);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = out; ctx.font = `500 33px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const lines = wrap(ctx, shot.line, 1060); let left = Math.floor(reveal);
    const baseY = H - 48 - (lines.length - 1) * 46;
    ctx.fillStyle = P.vg(ctx, H - 230, H, [[0, 'rgba(10,8,6,0)'], [1, 'rgba(10,8,6,0.6)']]); ctx.fillRect(0, H - 230, W, 230);
    if (shot.who) { ctx.font = `600 21px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = SPEAKER[shot.who] || '#fff'; ctx.fillText(shot.who === '旁白' ? '— 旁白 —' : shot.who, W / 2, baseY - 46); ctx.textAlign = 'left'; }
    ctx.font = `500 33px ${FONT}`; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 8; ctx.fillStyle = '#fffaf0';
    lines.forEach((l, i) => { if (left <= 0) return; const part = [...l].slice(0, left).join(''); left -= [...l].length; ctx.fillText(part, W / 2 - ctx.measureText(l).width / 2, baseY + i * 46); });
    ctx.restore();
  }

  // ---------- episode timeline with cross-fades ----------
  const XF = 0.8;
  const bufA = P.canvas(W, H), actx = bufA.getContext('2d'), bufB = P.canvas(W, H), bctx = bufB.getContext('2d');
  const epDuration = (ep) => ep.shots.reduce((a, s) => a + s.dur, 0);
  function locate(ep, T) { let acc = 0; for (let i = 0; i < ep.shots.length; i++) { const d = ep.shots[i].dur; if (T < acc + d || i === ep.shots.length - 1) return { i, t: T - acc, start: acc }; acc += d; } }
  function renderEpisode(ctx, ep, T) {
    T = clamp(T, 0, epDuration(ep) - 1e-3);
    const { i, t } = locate(ep, T), shot = ep.shots[i];
    renderShot(actx, shot, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    if (i > 0 && t < XF) { const prev = ep.shots[i - 1]; renderShot(bctx, prev, prev.dur + t); ctx.drawImage(bufB, 0, 0); ctx.globalAlpha = ease(t / XF); ctx.drawImage(bufA, 0, 0); ctx.globalAlpha = 1; }
    else ctx.drawImage(bufA, 0, 0);
    if (i === 0 && t < 0.6) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.6})`; ctx.fillRect(0, 0, W, H); }
    const end = epDuration(ep) - T; if (end < 0.8) { ctx.fillStyle = `rgba(0,0,0,${1 - end / 0.8})`; ctx.fillRect(0, 0, W, H); }
    drawSubtitle(ctx, shot, t);
    return { i, t };
  }
  function prepare(shot) { scene(shot); }

  // ---------- procedural score (WebAudio, works live and offline) ----------
  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const WARM = [[60, 64, 67, 72, 76], [57, 60, 64, 69, 72], [53, 57, 60, 65, 69], [55, 59, 62, 67, 71]]; // C Am F G
  const SAD = [[57, 60, 64, 69], [53, 57, 60, 65], [52, 55, 59, 64], [57, 60, 64, 69]];               // Am F Em Am
  function scheduleScore(ac, dest, ep, from, startAt) {
    const master = ac.createGain(); master.gain.value = 0.55; master.connect(dest);
    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = hash(i) * 2 - 1;
    let acc = 0; const nodes = [];
    ep.shots.forEach((shot, si) => {
      const s0 = acc, s1 = acc + shot.dur; acc = s1; if (s1 <= from) return;
      const fx = shot.fx || [], sad = (shot.gray && Math.max(...shot.gray) > 0.45 && shot.gray[1] > 0.3) || fx.includes('fog');
      const prog = sad ? SAD : WARM, step = sad ? 0.6 : 0.42;
      for (let tt = s0; tt < s1; tt += step) {
        if (tt < from) continue; const chord = prog[Math.floor((tt - s0) / 2) % 4];
        const idx = Math.floor(hash(Math.floor(tt * 10) + si * 999) * chord.length); if (hash(Math.floor(tt * 7) + 5) < 0.18) continue;
        const when = startAt + (tt - from), o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = NOTE(chord[idx] + 12); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.13, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, when + 1.6);
        o.connect(g); g.connect(master); o.start(when); o.stop(when + 1.7); nodes.push(o);
        if ((tt - s0) % 2 < step) { const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'triangle'; b.frequency.value = NOTE(chord[0] - 12); bg.gain.setValueAtTime(0, when); bg.gain.linearRampToValueAtTime(0.08, when + 0.2); bg.gain.exponentialRampToValueAtTime(0.001, when + 2.2); b.connect(bg); bg.connect(master); b.start(when); b.stop(when + 2.3); nodes.push(b); }
      }
      if (fx.includes('rain') || fx.includes('rain-light') || fx.includes('fog') || fx.includes('wind')) {
        const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = ac.createBiquadFilter(); f.type = fx.includes('fog') ? 'lowpass' : 'bandpass'; f.frequency.value = fx.includes('fog') ? 400 : 2500; const g = ac.createGain();
        const a = Math.max(s0, from), when = startAt + (a - from), dur = s1 - a, vol = fx.includes('rain') ? 0.12 : 0.06;
        g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + 0.5); g.gain.setValueAtTime(vol, when + Math.max(0.5, dur - 0.5)); g.gain.linearRampToValueAtTime(0, when + dur);
        src.connect(f); f.connect(g); g.connect(master); src.start(when); src.stop(when + dur); nodes.push(src);
      }
    });
    return { stop() { nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } }); master.disconnect(); } };
  }
  async function renderEpisodeAudioWav(ep) {
    const sr = 44100, dur = epDuration(ep) + 1, oac = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
    scheduleScore(oac, oac.destination, ep, 0, 0); const buf = await oac.startRendering();
    const n = buf.length, out = new DataView(new ArrayBuffer(44 + n * 4)), ws = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    ws(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, n * 4, true);
    const L = buf.getChannelData(0), R = buf.getChannelData(1); for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, clamp(L[i], -1, 1) * 32767, true); out.setInt16(46 + i * 4, clamp(R[i], -1, 1) * 32767, true); }
    let bin = ''; const bytes = new Uint8Array(out.buffer); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin);
  }

  window.DL = { W, H, renderEpisode, renderShot, epDuration, locate, prepare, scheduleScore, renderEpisodeAudioWav };
})();
