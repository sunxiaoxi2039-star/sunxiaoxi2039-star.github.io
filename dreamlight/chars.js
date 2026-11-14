/* 小芽与风的种子 · chars.js
 * Characters drawn as hand-inked, two-tone cel-shaded figures. Each drawer
 * works in its own unit space (ctx is scaled), so outlines stay thin and even
 * at any size. Origin is the point between the feet.
 */
(function () {
  'use strict';
  const TAU = Math.PI * 2, clamp = P.clamp;
  const INK = '#3b2417';
  const K = {};

  const ink = (ctx, u, k = 1) => { ctx.strokeStyle = INK; ctx.lineWidth = clamp(0.5 * u * k, 0.7, 3.2) / u; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };
  const fi = (ctx, u, fill, k = 1) => { ctx.fillStyle = fill; ctx.fill(); ink(ctx, u, k); ctx.stroke(); };
  const shade = (ctx, shape, region, col) => { ctx.save(); shape(); ctx.clip(); region(); ctx.fillStyle = col; ctx.fill(); ctx.restore(); };
  const R = (ctx, x, y, w, h) => { ctx.beginPath(); ctx.rect(x, y, w, h); };
  const E = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); };
  const blink = (t, s) => ((t + s * 1.37) % 4.3) < 0.13;
  const groundShadow = (ctx, rx, ry, a = 0.26) => { ctx.fillStyle = `rgba(28,22,48,${a})`; E(ctx, 0, 0, rx, ry); ctx.fill(); };

  // capsule limb along +y (0..L); shaded on the side away from the upper-left light
  function limb(ctx, u, L, w, col, colS, rot) {
    const shape = () => { ctx.beginPath(); ctx.roundRect(-w / 2, -w / 2, w, L + w / 2, w / 2); };
    shape(); ctx.fillStyle = col; ctx.fill();
    const side = Math.cos(rot) >= 0 ? 1 : -1;
    shade(ctx, shape, () => R(ctx, side > 0 ? w * 0.08 : -w, -w, w * 0.92, L + 2 * w), colS);
    shape(); ink(ctx, u); ctx.stroke();
  }
  function hand(ctx, u, y, r, skin) { E(ctx, 0, y, r * 0.95, r * 1.1); fi(ctx, u, skin, 0.8); }
  // sx: -1 viewer-left, +1 viewer-right. a1/a2: radians outward from hanging straight down (negative = inward)
  function arm(ctx, u, sx, sh, a1, a2, L1, L2, w, col, colS, skin, o = {}) {
    ctx.save(); ctx.translate(sh[0], sh[1]);
    const r1 = -sx * a1; ctx.rotate(r1);
    const fore = () => {
      ctx.save(); ctx.translate(0, L1); const r2 = -sx * a2; ctx.rotate(r2);
      hand(ctx, u, L2 + w * 0.42, w * 0.5, skin); limb(ctx, u, L2, w * 0.9, col, colS, r1 + r2);
      if (o.item) o.item(ctx, L2 + w * 0.42); ctx.restore();
    };
    if (L2 > 0) { if (o.foreFront) { limb(ctx, u, L1, w, col, colS, r1); fore(); } else { fore(); limb(ctx, u, L1, w, col, colS, r1); } }
    else { hand(ctx, u, L1 + w * 0.42, w * 0.5, skin); limb(ctx, u, L1, w, col, colS, r1); if (o.item) o.item(ctx, L1 + w * 0.42); }
    ctx.restore();
  }

  // =====================================================================
  // 小芽 Xiaoya — 5 years old, black bob, yellow raincoat, red boots
  // =====================================================================
  const GIRL = { skin: '#fce4d0', skinS: '#efc0a2', hair: '#211a1c', hairH: '#4d536f', coat: '#f5c53a', coatS: '#d6981f', coatL: '#ffe58e', boot: '#cd3a2e', bootS: '#9b2620', bootL: '#e8634f', leg: '#fce4d0', btn: '#8a5a2b' };
  const PJ = { coat: '#a8cbe9', coatS: '#7ea4cb', coatL: '#d8eaf8', boot: '#f3aab7', bootS: '#d3838f', bootL: '#fcd2d9', btn: '#ffffff' };

  function girlFace(ctx, u, t, expr, seed) {
    const ey = -78.2, closed = blink(t, seed) && expr !== 'sad';
    for (const sx of [-1, 1]) {
      const ex = sx * 4.3, dy = expr === 'sad' ? 0.6 : expr === 'o' ? 0.3 : 0;
      if (closed || expr === 'joy') {
        ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.8; ctx.beginPath();
        if (expr === 'joy') ctx.arc(ex, ey + 1, 2, Math.PI * 1.15, Math.PI * 1.85); else ctx.arc(ex, ey - 1, 2, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke(); continue;
      }
      E(ctx, ex, ey + dy, 1.75, 2.35); ctx.fillStyle = '#2b1b15'; ctx.fill();
      E(ctx, ex, ey + 0.95 + dy, 1.15, 0.85); ctx.fillStyle = '#6a3c28'; ctx.fill();
      E(ctx, ex + 0.55, ey - 0.85 + dy, 0.62, 0.62); ctx.fillStyle = '#ffffff'; ctx.fill();
      E(ctx, ex - 0.5, ey + 1.0 + dy, 0.26, 0.26); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
      ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.85; ctx.beginPath(); ctx.arc(ex, ey + 0.5, 2.6, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      if (expr === 'sad') { ctx.fillStyle = 'rgba(200,230,255,0.75)'; E(ctx, ex - sx * 0.6, ey + 2.6, 0.5, 0.7); ctx.fill(); }
    }
    if (expr === 'firm' || expr === 'sad') {
      ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.6; const k = expr === 'firm' ? 1 : -1;
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 6.4, -82.3 - k * 0.7); ctx.lineTo(sx * 2.4, -82.3 + k * 0.6); ctx.stroke(); }
    }
    ctx.strokeStyle = '#d29a86'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0.2, -75.7); ctx.lineTo(0.8, -75.1); ctx.stroke();
    ctx.strokeStyle = '#7d3a2e'; ctx.lineWidth = 0.6;
    if (expr === 'open' || expr === 'joy') { E(ctx, 0, -72.4, 1.9, 1.5); ctx.fillStyle = '#8c3a2f'; ctx.fill(); E(ctx, 0, -71.7, 1.1, 0.55); ctx.fillStyle = '#e98a80'; ctx.fill(); }
    else if (expr === 'o') { E(ctx, 0, -72.4, 0.85, 1.0); ctx.fillStyle = '#8c3a2f'; ctx.fill(); }
    else if (expr === 'firm') { ctx.beginPath(); ctx.moveTo(-1.7, -72.2); ctx.quadraticCurveTo(0, -72.8, 1.7, -72.2); ctx.stroke(); }
    else if (expr === 'sad') { ctx.beginPath(); ctx.arc(0, -70.9, 1.6, Math.PI * 1.22, Math.PI * 1.78); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(0, -74.1, 1.9, Math.PI * 0.22, Math.PI * 0.78); ctx.stroke(); }
    for (const sx of [-1, 1]) {
      E(ctx, sx * 6.8, -75, 2.3, 1.2); ctx.fillStyle = 'rgba(240,126,116,0.4)'; ctx.fill();
      ctx.strokeStyle = 'rgba(210,96,86,0.5)'; ctx.lineWidth = 0.32;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(sx * 6.8 + k * 1.1 - 0.4, -74.4); ctx.lineTo(sx * 6.8 + k * 1.1 + 0.4, -75.6); ctx.stroke(); }
    }
  }

  function girlHead(ctx, u, t, p, back, expr, seed) {
    const hairBack = () => { ctx.beginPath(); ctx.moveTo(-13.8, -70.2); ctx.bezierCurveTo(-16.4, -88, -11.8, -97.6, 0, -97.6); ctx.bezierCurveTo(11.8, -97.6, 16.4, -88, 13.8, -70.2); ctx.lineTo(12.3, -71); ctx.lineTo(11, -69.5); ctx.lineTo(-11, -69.5); ctx.lineTo(-12.3, -71); ctx.closePath(); };
    hairBack(); ctx.fillStyle = p.hair; ctx.fill();
    if (back) {
      shade(ctx, hairBack, () => E(ctx, -3.5, -90.5, 8.5, 2.6, -0.25), P.css(p.hairH, 0.75));
      hairBack(); ink(ctx, u); ctx.stroke();
      ctx.strokeStyle = 'rgba(86,92,118,0.7)'; ctx.lineWidth = 0.4;
      for (const xx of [-8, -4, 0, 4, 8]) { ctx.beginPath(); ctx.moveTo(xx * 0.7, -92); ctx.quadraticCurveTo(xx * 1.1, -80, xx * 1.05, -70.4); ctx.stroke(); }
      return;
    }
    hairBack(); ink(ctx, u); ctx.stroke();
    const face = () => E(ctx, 0, -79.4, 10.3, 11.2);
    face(); ctx.fillStyle = p.skin; ctx.fill();
    shade(ctx, face, () => E(ctx, 9.6, -77, 5.2, 13), p.skinS);
    shade(ctx, face, () => R(ctx, -12, -86.5, 24, 4.6), 'rgba(222,150,128,0.38)');
    face(); ink(ctx, u); ctx.stroke();
    girlFace(ctx, u, t, expr, seed);
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sx * 11.9, -84); ctx.quadraticCurveTo(sx * 13.7, -77, sx * 12.7, -70.3); ctx.lineTo(sx * 11.3, -71.3); ctx.lineTo(sx * 10.3, -70.1); ctx.quadraticCurveTo(sx * 10.9, -77, sx * 9.8, -82.6); ctx.closePath(); fi(ctx, u, p.hair);
    }
    const bangs = () => {
      ctx.beginPath(); ctx.moveTo(-11.9, -82.6); ctx.bezierCurveTo(-11.7, -95.8, 11.7, -95.8, 11.9, -82.6);
      for (const [x, y] of [[9.7, -83.3], [8.2, -84.7], [6.5, -82.9], [4.5, -84.5], [2.5, -82.6], [0.3, -84.3], [-1.9, -82.7], [-4, -84.5], [-6, -82.9], [-7.9, -84.6], [-9.8, -83.2]]) ctx.lineTo(x, y);
      ctx.closePath();
    };
    bangs(); ctx.fillStyle = p.hair; ctx.fill();
    shade(ctx, bangs, () => E(ctx, -1.5, -91.3, 8.6, 1.9, -0.06), P.css(p.hairH, 0.9));
    bangs(); ink(ctx, u); ctx.stroke();
    ctx.strokeStyle = 'rgba(78,84,110,0.75)'; ctx.lineWidth = 0.35;
    for (const xx of [-6.5, -2, 2.6, 7]) { ctx.beginPath(); ctx.moveTo(xx * 0.6, -93); ctx.quadraticCurveTo(xx * 0.9, -88, xx, -84.4); ctx.stroke(); }
  }

  function crayon(ctx, y, col) { ctx.save(); ctx.translate(0, y); ctx.rotate(0.35); ctx.beginPath(); ctx.roundRect(-0.9, -1, 1.8, 7.5, 0.5); ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = '#f5f0e0'; ctx.fillRect(-0.9, 1.6, 1.8, 2.6); ctx.restore(); }
  function childDrawing(ctx, u) {
    ctx.save(); ctx.translate(0, -45); ctx.rotate(-0.05);
    ctx.beginPath(); ctx.rect(-11, -8.5, 22, 16); fi(ctx, u, '#fbf8ef', 0.7);
    E(ctx, 6.5, -4.5, 2.3, 2.3); ctx.fillStyle = '#f2b81c'; ctx.fill();
    ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-10, 4.5); ctx.quadraticCurveTo(0, 2.5, 10, 5); ctx.stroke();
    ctx.fillStyle = '#e3402d'; ctx.fillRect(-8, -1, 6, 5); ctx.beginPath(); ctx.moveTo(-9, -1); ctx.lineTo(-5, -4.6); ctx.lineTo(-1, -1); ctx.fill();
    ctx.strokeStyle = '#3f6ec4'; ctx.lineWidth = 0.5;
    for (const [fx, fh] of [[1.6, 1], [4, 1.35], [6.4, 0.85]]) { ctx.beginPath(); ctx.arc(fx, 1 - fh * 2, 0.8, 0, TAU); ctx.moveTo(fx, 1.8 - fh * 2); ctx.lineTo(fx, 4); ctx.stroke(); }
    ctx.restore();
  }

  function girlStand(ctx, u, t, p, pose, o, expr) {
    const back = !!o.back, bob = Math.sin(t * 2.2 + (o.seed || 0)) * 0.35;
    for (const sx of [-1, 1]) {
      const cx = sx * 5.6;
      R(ctx, cx - 2.2, -24, 4.4, 12); fi(ctx, u, p.leg, 0.8);
      const boot = () => { ctx.beginPath(); ctx.moveTo(cx - 4.4, -14.5); ctx.lineTo(cx + 4.4, -14.5); ctx.quadraticCurveTo(cx + 4.9, -5, cx + 5.3, -1.3); ctx.quadraticCurveTo(cx + 5.1, 0.5, cx + 2.6, 0.5); ctx.lineTo(cx - 2.6, 0.5); ctx.quadraticCurveTo(cx - 5.1, 0.5, cx - 5.3, -1.3); ctx.quadraticCurveTo(cx - 4.9, -5, cx - 4.4, -14.5); ctx.closePath(); };
      boot(); ctx.fillStyle = p.boot; ctx.fill();
      shade(ctx, boot, () => R(ctx, cx + 1.4, -16, 6, 18), p.bootS);
      shade(ctx, boot, () => R(ctx, cx - 6, -14.6, 12, 2.2), p.bootL);
      if (o.outfit !== 'pajama') shade(ctx, boot, () => R(ctx, cx - 3.1, -11.5, 0.9, 7), 'rgba(255,255,255,0.5)');
      boot(); ink(ctx, u); ctx.stroke();
    }
    ctx.save(); ctx.translate(0, bob);
    const coat = () => { ctx.beginPath(); ctx.moveTo(-6, -66); ctx.quadraticCurveTo(-11.6, -66, -13.2, -61); ctx.lineTo(-16.4, -45); ctx.quadraticCurveTo(-20.6, -31, -22.6, -21.6); ctx.quadraticCurveTo(-11, -19.2, 0, -19.9); ctx.quadraticCurveTo(11, -19.2, 22.6, -21.6); ctx.quadraticCurveTo(20.6, -31, 16.4, -45); ctx.lineTo(13.2, -61); ctx.quadraticCurveTo(11.6, -66, 6, -66); ctx.closePath(); };
    coat(); ctx.fillStyle = p.coat; ctx.fill();
    shade(ctx, coat, () => { ctx.beginPath(); ctx.moveTo(7.5, -67); ctx.quadraticCurveTo(14, -45, 8.5, -18); ctx.lineTo(26, -18); ctx.lineTo(26, -67); ctx.closePath(); }, p.coatS);
    shade(ctx, coat, () => { ctx.beginPath(); ctx.moveTo(-13.6, -60); ctx.quadraticCurveTo(-16.8, -40, -19.6, -23); ctx.lineTo(-16.6, -23); ctx.quadraticCurveTo(-13.4, -42, -10.8, -60); ctx.closePath(); }, p.coatL);
    if (o.outfit === 'pajama') { ctx.save(); coat(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let yy = -62, row = 0; yy < -20; yy += 5, row++) for (let xx = -22 + (row % 2 ? 2.5 : 0); xx < 22; xx += 5) { E(ctx, xx, yy, 0.7, 0.7); ctx.fill(); } ctx.restore(); }
    coat(); ink(ctx, u); ctx.stroke();
    ctx.strokeStyle = P.css(p.coatS); ctx.lineWidth = 0.45;
    for (const xx of [-14, -6, 9, 16]) { ctx.beginPath(); ctx.moveTo(xx, -21); ctx.quadraticCurveTo(xx + 1, -26, xx + 0.4, -30); ctx.stroke(); }
    if (!back) {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(0, -63.5); ctx.lineTo(0.3, -20.2); ctx.stroke();
      for (const ty of [-57, -47.5, -38]) { ctx.beginPath(); ctx.roundRect(-1.7, ty - 0.75, 3.4, 1.5, 0.7); fi(ctx, u, p.btn, 0.6); }
      ctx.strokeStyle = P.css(p.coatS); ctx.lineWidth = 0.55;
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 6, -33.5); ctx.quadraticCurveTo(sx * 10.5, -32.5, sx * 14.5, -34.5); ctx.stroke(); }
      const hood = () => { ctx.beginPath(); ctx.moveTo(-12, -63); ctx.quadraticCurveTo(-14, -71.5, 0, -72); ctx.quadraticCurveTo(14, -71.5, 12, -63); ctx.quadraticCurveTo(0, -60.5, -12, -63); ctx.closePath(); };
      hood(); ctx.fillStyle = p.coat; ctx.fill(); shade(ctx, hood, () => R(ctx, -14, -66, 28, 5), p.coatS); hood(); ink(ctx, u); ctx.stroke();
    } else {
      ctx.strokeStyle = P.css(p.coatS); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, -20.5); ctx.stroke();
      const hood = () => { ctx.beginPath(); ctx.moveTo(-11, -64.5); ctx.quadraticCurveTo(-13, -52, 0, -49.5); ctx.quadraticCurveTo(13, -52, 11, -64.5); ctx.quadraticCurveTo(0, -67, -11, -64.5); ctx.closePath(); };
      hood(); ctx.fillStyle = p.coat; ctx.fill(); shade(ctx, hood, () => R(ctx, 2, -66, 14, 18), p.coatS); shade(ctx, hood, () => E(ctx, 0, -60, 7, 4), P.css(p.coatS, 0.6)); hood(); ink(ctx, u); ctx.stroke();
    }
    let la = 0.16, ra = 0.16; const ro = {}, lo = {};
    if (pose === 'arms') { la = 2.45 + Math.sin(t * 3) * 0.06; ra = 2.45 + Math.sin(t * 3 + 1) * 0.06; }
    if (pose === 'fist') { la = 0.06; ra = 0.06; }
    if (pose === 'wave') { if (back) la = 2.55 + Math.sin(t * 7) * 0.32; else ra = 2.55 + Math.sin(t * 7) * 0.32; if (o.both) { la = 2.5 + Math.sin(t * 7 + 1.5) * 0.3; ra = 2.5 + Math.sin(t * 7) * 0.3; } }
    if (pose === 'draw') { ra = 1.85 + Math.sin(t * 3.2) * 0.35; ro.item = (c, hy) => crayon(c, hy, '#e3402d'); }
    if (pose === 'hold') { la = -0.3; ra = -0.3; }
    const AL = pose === 'hold' ? 17 : 21;
    arm(ctx, u, -1, [-12.2, -60.5], la, 0, AL, 0, 7, p.coat, p.coatS, p.skin, lo);
    arm(ctx, u, 1, [12.2, -60.5], ra, 0, AL, 0, 7, p.coat, p.coatS, p.skin, ro);
    if (pose === 'hold') { childDrawing(ctx, u); for (const sx of [-1, 1]) { E(ctx, sx * 10.6, -44, 2.6, 3); fi(ctx, u, p.skin, 0.8); } }
    girlHead(ctx, u, t, p, back, expr, o.seed || 0);
    ctx.restore();
  }

  function girlLow(ctx, u, t, p, pose, o, expr) {
    const sit = pose === 'sit';
    for (const sx of [-1, 1]) { const be = () => E(ctx, sx * 9.4, -2.6, 5.6, 3.3); be(); ctx.fillStyle = p.boot; ctx.fill(); shade(ctx, be, () => R(ctx, sx * 9.4, -7, 7, 8), p.bootS); be(); ink(ctx, u); ctx.stroke(); }
    const body = () => { ctx.beginPath(); ctx.moveTo(-12.4, -44); ctx.quadraticCurveTo(-23.5, -35, -22, -5.5); ctx.quadraticCurveTo(-11, -1.4, 0, -2.6); ctx.quadraticCurveTo(11, -1.4, 22, -5.5); ctx.quadraticCurveTo(23.5, -35, 12.4, -44); ctx.quadraticCurveTo(0, -47, -12.4, -44); ctx.closePath(); };
    body(); ctx.fillStyle = p.coat; ctx.fill();
    shade(ctx, body, () => { ctx.beginPath(); ctx.moveTo(6, -46); ctx.quadraticCurveTo(15, -25, 10, 0); ctx.lineTo(26, 0); ctx.lineTo(26, -46); ctx.closePath(); }, p.coatS);
    shade(ctx, body, () => E(ctx, -17.5, -24, 2.4, 14, 0.15), p.coatL);
    body(); ink(ctx, u); ctx.stroke();
    ctx.strokeStyle = P.css(p.coatS); ctx.lineWidth = 0.5;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 9, -26, 6.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    const ang = sit ? 1.12 : 0.95;
    arm(ctx, u, -1, [-11.6, -41], -ang, 0, 14, 0, 7, p.coat, p.coatS, p.skin);
    arm(ctx, u, 1, [11.6, -41], -ang, 0, 14, 0, 7, p.coat, p.coatS, p.skin);
    ctx.save(); ctx.translate(0, sit ? 27 : 23);
    const hood = () => { ctx.beginPath(); ctx.moveTo(-12, -63); ctx.quadraticCurveTo(-14, -71.5, 0, -72); ctx.quadraticCurveTo(14, -71.5, 12, -63); ctx.quadraticCurveTo(0, -60.5, -12, -63); ctx.closePath(); };
    hood(); fi(ctx, u, p.coat);
    girlHead(ctx, u, t, p, !!o.back, expr, o.seed || 0);
    ctx.restore();
  }

  K.girl = (ctx, t, x, y, s, o = {}) => {
    const u = 2.5 * s, pose = o.pose || 'stand', p = Object.assign({}, GIRL, o.outfit === 'pajama' ? PJ : null);
    const expr = o.face || { arms: 'open', wave: 'open', fist: 'firm', draw: 'firm', crouch: 'o', sit: 'sad', hold: 'smile' }[pose] || 'smile';
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
    groundShadow(ctx, 24, 4);
    if (pose === 'crouch' || pose === 'sit') girlLow(ctx, u, t, p, pose, o, expr); else girlStand(ctx, u, t, p, pose, o, expr);
    ctx.restore();
  };

  // =====================================================================
  // 妈妈 Mom — beige trench coat, ponytail, office lanyard
  // =====================================================================
  const MOM = { skin: '#f8dcc6', skinS: '#e6b697', hair: '#2a1f1c', hairH: '#5a4a40', coat: '#dcc69f', coatS: '#b59b73', coatL: '#efe1c3', pants: '#3b3e4a', pantsS: '#2b2d36', shoe: '#2a2326', shirt: '#f5f2ea', strap: '#3f6ea8' };

  function momHead(ctx, u, t, p, back, expr) {
    R(ctx, -2.1, -86.5, 4.2, 6.5); fi(ctx, u, p.skin, 0.7); shade(ctx, () => R(ctx, -2.1, -86.5, 4.2, 6.5), () => R(ctx, -2.1, -86.5, 4.2, 2.4), p.skinS);
    const tail = () => { ctx.beginPath(); ctx.moveTo(4.6, -97.5); ctx.quadraticCurveTo(10.8, -95.5, 9.8, -86); ctx.quadraticCurveTo(9.2, -80, 7.4, -78.2); ctx.quadraticCurveTo(7.8, -86, 4.2, -92.5); ctx.closePath(); };
    tail(); fi(ctx, u, p.hair);
    const hb = () => { ctx.beginPath(); ctx.moveTo(-6.9, -86.8); ctx.bezierCurveTo(-8.4, -96.5, -6.5, -102, 0, -102); ctx.bezierCurveTo(6.5, -102, 8.4, -96.5, 6.9, -86.8); ctx.quadraticCurveTo(0, -84.5, -6.9, -86.8); ctx.closePath(); };
    hb(); ctx.fillStyle = p.hair; ctx.fill();
    if (back) { shade(ctx, hb, () => E(ctx, -2, -98, 4.6, 1.8, -0.2), P.css(p.hairH, 0.8)); hb(); ink(ctx, u, 0.8); ctx.stroke(); E(ctx, 4.8, -96.5, 1.1, 1.4); fi(ctx, u, '#c8463a', 0.6); return; }
    hb(); ink(ctx, u, 0.8); ctx.stroke();
    const face = () => { ctx.beginPath(); ctx.moveTo(-5.9, -94); ctx.bezierCurveTo(-6, -100.4, 6, -100.4, 5.9, -94); ctx.bezierCurveTo(5.9, -88.6, 3.1, -85.2, 0, -85.2); ctx.bezierCurveTo(-3.1, -85.2, -5.9, -88.6, -5.9, -94); ctx.closePath(); };
    face(); ctx.fillStyle = p.skin; ctx.fill(); shade(ctx, face, () => E(ctx, 5.6, -92, 3, 8), p.skinS); face(); ink(ctx, u, 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6.5, -90.5); ctx.bezierCurveTo(-7.2, -100.8, 4.2, -102.8, 6.7, -95.2); ctx.quadraticCurveTo(3, -97.8, -0.6, -96.6); ctx.quadraticCurveTo(-3.8, -95.4, -6.5, -90.5); ctx.closePath(); fi(ctx, u, p.hair, 0.8);
    const ey = -93.1, closed = blink(t, 3.3);
    for (const sx of [-1, 1]) {
      const ex = sx * 2.5;
      if (closed || expr === 'joy' || expr === 'cry') { ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.42; ctx.beginPath(); if (expr === 'joy') ctx.arc(ex, ey + 0.5, 1, Math.PI * 1.15, Math.PI * 1.85); else ctx.arc(ex, ey - 0.4, 1, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); continue; }
      E(ctx, ex, ey, 0.72, 0.95); ctx.fillStyle = '#2b1b15'; ctx.fill(); E(ctx, ex + 0.25, ey - 0.35, 0.25, 0.25); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.42; ctx.beginPath(); ctx.arc(ex, ey + 0.3, 1.25, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex + sx * 1.15, ey - 0.5); ctx.lineTo(ex + sx * 1.65, ey - 0.95); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,80,120,0.4)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(ex, ey + 0.7, 1.1, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    }
    ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 0.35; const bk = expr === 'tense' ? 0.6 : (expr === 'sad' || expr === 'cry') ? -0.6 : 0;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 3.7, -95.7 + bk * 0.2); ctx.quadraticCurveTo(sx * 2.5, -96.4, sx * 1.2, -95.8 + bk * 0.6); ctx.stroke(); }
    ctx.strokeStyle = '#c98f78'; ctx.lineWidth = 0.32; ctx.beginPath(); ctx.moveTo(0.2, -91.6); ctx.lineTo(0.6, -90.4); ctx.lineTo(0.1, -90.2); ctx.stroke();
    ctx.strokeStyle = '#8a4237'; ctx.lineWidth = 0.38; ctx.beginPath();
    if (expr === 'tense') { ctx.moveTo(-1.1, -88.2); ctx.lineTo(1.1, -88.4); } else if (expr === 'sad' || expr === 'cry') { ctx.arc(0, -87.4, 1, Math.PI * 1.25, Math.PI * 1.75); } else if (expr === 'joy') { ctx.arc(0, -88.9, 1.25, Math.PI * 0.18, Math.PI * 0.82); } else { ctx.arc(0, -89, 1.1, Math.PI * 0.25, Math.PI * 0.75); }
    ctx.stroke();
    if (expr === 'cry' || expr === 'joy') { ctx.fillStyle = 'rgba(200,228,255,0.85)'; for (const sx of [-1, 1]) { E(ctx, sx * 3, -90.6, 0.4, 0.75); ctx.fill(); } }
    for (const sx of [-1, 1]) { E(ctx, sx * 3.6, -90.4, 1.2, 0.6); ctx.fillStyle = 'rgba(236,140,130,0.3)'; ctx.fill(); }
  }
  function momCoat(ctx, u, p, back) {
    const coat = () => { ctx.beginPath(); ctx.moveTo(-4, -82); ctx.quadraticCurveTo(-9.6, -81.6, -10.7, -78); ctx.lineTo(-9.2, -61); ctx.quadraticCurveTo(-12.6, -48, -13, -35.5); ctx.quadraticCurveTo(0, -34, 13, -35.5); ctx.quadraticCurveTo(12.6, -48, 9.2, -61); ctx.lineTo(10.7, -78); ctx.quadraticCurveTo(9.6, -81.6, 4, -82); ctx.closePath(); };
    coat(); ctx.fillStyle = p.coat; ctx.fill();
    shade(ctx, coat, () => { ctx.beginPath(); ctx.moveTo(4, -83); ctx.quadraticCurveTo(8, -60, 5, -34); ctx.lineTo(15, -34); ctx.lineTo(15, -83); ctx.closePath(); }, p.coatS);
    shade(ctx, coat, () => R(ctx, -14, -62.4, 28, 2.8), P.css(p.coatS));
    coat(); ink(ctx, u); ctx.stroke();
    if (back) { ctx.strokeStyle = P.css(p.coatS); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(0, -36); ctx.stroke(); return; }
    ctx.beginPath(); ctx.moveTo(-3.6, -81.6); ctx.lineTo(0, -71); ctx.lineTo(3.6, -81.6); ctx.closePath(); fi(ctx, u, p.shirt, 0.7);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(-3.6, -81.6); ctx.lineTo(-6.2, -66); ctx.lineTo(-1.2, -69); ctx.moveTo(3.6, -81.6); ctx.lineTo(6.2, -66); ctx.lineTo(1.2, -69); ctx.stroke();
    for (const by of [-66, -56, -48]) for (const sx of [-1, 1]) { E(ctx, sx * 3.4, by, 0.55, 0.55); ctx.fillStyle = '#7a6448'; ctx.fill(); }
    ctx.beginPath(); ctx.rect(-1.5, -62.6, 3, 3); ink(ctx, u, 0.6); ctx.stroke();
    ctx.strokeStyle = p.strap; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-2.4, -81.5); ctx.lineTo(-0.3, -70.5); ctx.moveTo(2.4, -81.5); ctx.lineTo(0.3, -70.5); ctx.stroke();
    ctx.beginPath(); ctx.rect(-2.2, -70.5, 4.4, 5.6); fi(ctx, u, '#ffffff', 0.6); R(ctx, -2.2, -70.5, 4.4, 1.4); ctx.fillStyle = p.strap; ctx.fill();
  }
  function momLegs(ctx, u, p) {
    for (const sx of [-1, 1]) {
      const leg = () => R(ctx, sx * 3.4 - 2.2, -40, 4.4, 38.5);
      leg(); ctx.fillStyle = p.pants; ctx.fill(); shade(ctx, leg, () => R(ctx, sx * 3.4 + 0.6, -41, 3, 40), p.pantsS); leg(); ink(ctx, u); ctx.stroke();
      E(ctx, sx * 3.8, -1.2, 3.2, 1.5); fi(ctx, u, p.shoe);
    }
  }
  K.mom = (ctx, t, x, y, s, o = {}) => {
    const u = 4.3 * s, p = MOM, pose = o.pose || 'stand', back = !!o.back;
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u); groundShadow(ctx, 15, 2.4);
    if (pose === 'cry') {
      const sob = Math.abs(Math.sin(t * 3.4)) * 0.5;
      for (const sx of [-1, 1]) { E(ctx, sx * 5, -1.2, 3.2, 1.5); fi(ctx, u, p.shoe); R(ctx, sx * 5 - 2.1, -22, 4.2, 20.5); fi(ctx, u, p.pants); E(ctx, sx * 5, -24, 4.6, 4); fi(ctx, u, p.pants); }
      ctx.save(); ctx.translate(0, sob);
      const body = () => { ctx.beginPath(); ctx.moveTo(-10, -52); ctx.quadraticCurveTo(-15, -38, -14, -15); ctx.quadraticCurveTo(0, -12, 14, -15); ctx.quadraticCurveTo(15, -38, 10, -52); ctx.quadraticCurveTo(0, -56, -10, -52); ctx.closePath(); };
      body(); ctx.fillStyle = p.coat; ctx.fill(); shade(ctx, body, () => R(ctx, 4, -58, 14, 50), p.coatS); body(); ink(ctx, u); ctx.stroke();
      ctx.save(); ctx.translate(0, 38); momHead(ctx, u, t, p, false, 'cry'); ctx.restore();
      arm(ctx, u, -1, [-9.5, -50], 0.1, -2.75, 13, 13, 6, p.coat, p.coatS, p.skin, { foreFront: true });
      arm(ctx, u, 1, [9.5, -50], 0.1, -2.75, 13, 13, 6, p.coat, p.coatS, p.skin, { foreFront: true });
      ctx.restore();
    } else if (pose === 'kneel' || pose === 'hug') {
      E(ctx, -6.5, -1.6, 5, 2.2); fi(ctx, u, p.pants); R(ctx, -12, -4, 9, 3.6); fi(ctx, u, p.pants);
      R(ctx, 3.4, -18, 4.6, 16.6); fi(ctx, u, p.pants); E(ctx, 6, -1.2, 3.3, 1.5); fi(ctx, u, p.shoe); E(ctx, 4.8, -19.5, 5.5, 4.2); fi(ctx, u, p.pants);
      ctx.save(); ctx.translate(0, 24);
      momCoat(ctx, u, p, false);
      if (pose === 'kneel') {
        arm(ctx, u, 1, [9.9, -77.5], -0.75, 0, 27, 0, 5.6, p.coat, p.coatS, p.skin);
        momHead(ctx, u, t, p, false, o.face || 'sad');
        arm(ctx, u, -1, [-9.9, -77.5], 1.05, 0, 27, 0, 5.6, p.coat, p.coatS, p.skin);
      } else momHead(ctx, u, t, p, false, o.face || 'joy');
      ctx.restore();
    } else {
      const bob = Math.sin(t * 1.8 + 1) * 0.2;
      momLegs(ctx, u, p);
      ctx.save(); ctx.translate(0, bob);
      momCoat(ctx, u, p, back);
      if (pose === 'phone') {
        arm(ctx, u, -1, [-9.9, -77.5], 0.14, 0, 29, 0, 5.6, p.coat, p.coatS, p.skin);
        momHead(ctx, u, t, p, false, 'tense');
        arm(ctx, u, 1, [9.9, -77.5], 0.5, -3.25, 10, 18, 5.6, p.coat, p.coatS, p.skin, { foreFront: true, item: (c, hy) => { c.beginPath(); c.roundRect(-1.7, hy - 4, 3.4, 6.5, 0.7); c.fillStyle = '#23252b'; c.fill(); } });
      } else {
        arm(ctx, u, -1, [-9.9, -77.5], 0.12, 0, 29, 0, 5.6, p.coat, p.coatS, p.skin);
        arm(ctx, u, 1, [9.9, -77.5], 0.12, 0, 29, 0, 5.6, p.coat, p.coatS, p.skin);
        momHead(ctx, u, t, p, back, o.face || 'smile');
      }
      ctx.restore();
    }
    ctx.restore();
  };
  // second pass for poses whose arms wrap in front of another character
  K.momFront = (ctx, t, x, y, s, o = {}) => {
    if (o.pose !== 'hug') return;
    const u = 4.3 * s, p = MOM;
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u); ctx.translate(0, 24);
    arm(ctx, u, -1, [-9.9, -77.5], -0.32, -0.5, 14, 11, 5.6, p.coat, p.coatS, p.skin);
    arm(ctx, u, 1, [9.9, -77.5], -0.32, -0.5, 14, 11, 5.6, p.coat, p.coatS, p.skin);
    ctx.restore();
  };

  // =====================================================================
  // 外婆 Grandma — silver bun, round glasses, indigo jacket, floral apron
  // =====================================================================
  const GMA = { skin: '#f3d7bf', skinS: '#dbb092', hair: '#e2e4e9', hairS: '#b3b8c6', jacket: '#3f5389', jacketS: '#2c3a66', jacketL: '#5a70a8', apron: '#efe3cb', apronS: '#d6c3a2', pants: '#3a3940', shoe: '#2a2628', gown: '#bcd2e8', gownS: '#93add0' };
  function gmaHead(ctx, u, t, p, expr) {
    R(ctx, -2.4, -81, 4.8, 6.5); fi(ctx, u, p.skin, 0.7);
    E(ctx, 1.6, -97.3, 4.6, 3.8); fi(ctx, u, p.hair);
    E(ctx, 1.6, -97.3, 4.6, 1); ctx.fillStyle = 'rgba(150,155,170,0.4)'; ctx.fill();
    const head = () => E(ctx, 0, -86, 7.7, 8.4);
    head(); ctx.fillStyle = p.skin; ctx.fill(); shade(ctx, head, () => E(ctx, 6.6, -84, 3.5, 9), p.skinS); head(); ink(ctx, u, 0.85); ctx.stroke();
    const hair = () => { ctx.beginPath(); ctx.moveTo(-7.9, -84.5); ctx.bezierCurveTo(-9.3, -96, 9.3, -96, 7.9, -84.5); ctx.quadraticCurveTo(6.8, -88.6, 3.5, -90.2); ctx.quadraticCurveTo(0, -91.2, -3.6, -90.2); ctx.quadraticCurveTo(-6.9, -88.8, -7.9, -84.5); ctx.closePath(); };
    hair(); ctx.fillStyle = p.hair; ctx.fill(); shade(ctx, hair, () => R(ctx, 2.5, -97, 8, 14), p.hairS); hair(); ink(ctx, u, 0.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(140,146,164,0.8)'; ctx.lineWidth = 0.3;
    for (const k of [-4, -1.5, 1.5, 4]) { ctx.beginPath(); ctx.moveTo(k * 0.4, -94.2); ctx.quadraticCurveTo(k * 0.9, -92, k * 1.6, -89.6); ctx.stroke(); }
    for (const sx of [-1, 1]) {
      ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 0.45; ctx.beginPath();
      if (expr === 'sleep') ctx.arc(sx * 2.9, -86.5, 1.2, Math.PI * 0.15, Math.PI * 0.85); else ctx.arc(sx * 2.9, -85.3, 1.25, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,110,90,0.6)'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(sx * 4.7, -86); ctx.lineTo(sx * 5.7, -86.7); ctx.moveTo(sx * 4.7, -85.3); ctx.lineTo(sx * 5.6, -84.9); ctx.stroke();
    }
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.35;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 2.9, -85.6, 2.1, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-0.8, -85.8); ctx.quadraticCurveTo(0, -86.4, 0.8, -85.8); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (const sx of [-1, 1]) { E(ctx, sx * 2.9 - 0.7, -86.5, 0.55, 0.3, -0.5); ctx.fill(); }
    ctx.strokeStyle = '#c69078'; ctx.lineWidth = 0.32; ctx.beginPath(); ctx.moveTo(0.2, -84); ctx.quadraticCurveTo(0.9, -82.6, 0, -82.3); ctx.stroke();
    ctx.strokeStyle = '#8a4a3a'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.arc(0, -81.6, 1.6, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(170,110,90,0.5)'; ctx.lineWidth = 0.26;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 2.6, -83.2); ctx.quadraticCurveTo(sx * 3.6, -81.6, sx * 3, -80.2); ctx.stroke(); }
    for (const sx of [-1, 1]) { E(ctx, sx * 4.3, -82.6, 1.4, 0.75); ctx.fillStyle = 'rgba(232,130,120,0.3)'; ctx.fill(); }
  }
  function dandelionClock(ctx, x, y, r, t) {
    ctx.strokeStyle = '#6a9a4a'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(x, y + r * 6); ctx.quadraticCurveTo(x + r * 0.6, y + r * 3, x, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(x, y, r * 1.05, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = r * 0.05;
    for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU + t * 0.05; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
    ctx.fillStyle = '#a58a5a'; ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, TAU); ctx.fill();
  }
  K.grandma = (ctx, t, x, y, s, o = {}) => {
    const u = 3.4 * s, p = GMA, pose = o.pose || 'stand';
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
    if (pose === 'bed') {
      // hospital bed in side view, head end on the left
      ctx.strokeStyle = '#9aa6ae'; ctx.lineWidth = 1.4;
      for (const lx of [-36, 36]) { ctx.beginPath(); ctx.moveTo(lx, -20); ctx.lineTo(lx, -2); ctx.stroke(); E(ctx, lx, -1.5, 1.8, 1.8); ctx.fillStyle = '#4a4f55'; ctx.fill(); }
      ctx.beginPath(); ctx.roundRect(-40, -24, 80, 5, 1.5); fi(ctx, u, '#dfe5e8');
      ctx.beginPath(); ctx.roundRect(-42, -52, 5, 33, 2); fi(ctx, u, '#e9edf0'); ctx.beginPath(); ctx.roundRect(38, -38, 4.5, 19, 2); fi(ctx, u, '#e9edf0');
      ctx.beginPath(); ctx.roundRect(-38, -31, 76, 8, 3); fi(ctx, u, '#f6f7f6');
      E(ctx, -30, -36, 9.5, 5.5, -0.35); fi(ctx, u, '#fbfbf8'); shade(ctx, () => E(ctx, -30, -36, 9.5, 5.5, -0.35), () => E(ctx, -26, -32, 9, 3), '#dde3e6');
      ctx.save(); ctx.translate(-23, 64); ctx.scale(1.3, 1.3); ctx.rotate(o.asleep ? -0.08 : 0);
      const gown = () => { ctx.beginPath(); ctx.moveTo(-9, -79); ctx.quadraticCurveTo(-12, -76, -12.5, -66); ctx.lineTo(-12, -62); ctx.lineTo(12, -62); ctx.lineTo(12.5, -66); ctx.quadraticCurveTo(12, -76, 9, -79); ctx.closePath(); };
      gown(); ctx.fillStyle = p.gown; ctx.fill(); shade(ctx, gown, () => R(ctx, 4, -80, 10, 20), p.gownS);
      ctx.save(); gown(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.6; for (let xx = -12; xx < 13; xx += 2.4) { ctx.beginPath(); ctx.moveTo(xx, -80); ctx.lineTo(xx, -60); ctx.stroke(); } ctx.restore();
      gown(); ink(ctx, u); ctx.stroke();
      gmaHead(ctx, u, t, p, o.asleep ? 'sleep' : 'smile');
      ctx.restore();
      const blanket = () => { ctx.beginPath(); ctx.moveTo(-36, -27); ctx.quadraticCurveTo(-24, -31, -10, -30); ctx.quadraticCurveTo(14, -33, 38, -29); ctx.lineTo(39, -19); ctx.quadraticCurveTo(0, -16, -36, -19); ctx.closePath(); };
      blanket(); ctx.fillStyle = '#e4ecf3'; ctx.fill(); shade(ctx, blanket, () => R(ctx, -40, -24, 82, 8), '#c3d1df'); blanket(); ink(ctx, u); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,140,160,0.6)'; ctx.lineWidth = 0.4; for (const fx of [-6, 8, 22]) { ctx.beginPath(); ctx.moveTo(fx, -30); ctx.quadraticCurveTo(fx + 3, -25, fx + 1, -19); ctx.stroke(); }
      if (o.prop === 'dandelion') {
        dandelionClock(ctx, -9, -66, 4.6, t);
        arm(ctx, u, 1, [-12.5, -40], 2.7, 0, 9, 0, 5.6, p.gown, p.gownS, p.skin);
      } else { E(ctx, -12, -30.5, 3, 2.2); fi(ctx, u, p.skin, 0.8); }
      ctx.restore(); return;
    }
    groundShadow(ctx, 17, 3);
    const kneel = pose === 'kneel', lean = 2;
    if (!kneel) for (const sx of [-1, 1]) { R(ctx, sx * 4 - 2.8, -31, 5.6, 29.5); fi(ctx, u, p.pants); E(ctx, sx * 4.3, -1.3, 3.6, 1.6); fi(ctx, u, p.shoe); }
    else { E(ctx, -5, -2, 5.5, 2.4); fi(ctx, u, p.pants); R(ctx, -13, -4.6, 9, 3.8); fi(ctx, u, p.pants); R(ctx, 3, -16, 5.4, 14.5); fi(ctx, u, p.pants); E(ctx, 5.8, -1.3, 3.6, 1.6); fi(ctx, u, p.shoe); E(ctx, 4.2, -16.5, 6, 4.4); fi(ctx, u, p.pants); }
    ctx.save(); ctx.translate(0, kneel ? 22 : 0);
    if (pose === 'cane') { ctx.strokeStyle = '#6b4a2f'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(22.8, -49); ctx.lineTo(24.5, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(20.8, -49, 2, Math.PI, TAU); ctx.stroke(); }
    const jacket = () => { ctx.beginPath(); ctx.moveTo(-5 + lean, -76); ctx.quadraticCurveTo(-11.5 + lean, -75, -12.5 + lean * 0.8, -70); ctx.lineTo(-14, -36); ctx.quadraticCurveTo(0, -33.5, 14, -36); ctx.lineTo(12.5 + lean * 0.8, -70); ctx.quadraticCurveTo(11.5 + lean, -75, 5 + lean, -76); ctx.closePath(); };
    jacket(); ctx.fillStyle = p.jacket; ctx.fill(); shade(ctx, jacket, () => R(ctx, 5, -80, 12, 50), p.jacketS); shade(ctx, jacket, () => R(ctx, -15, -72, 3, 36), p.jacketL); jacket(); ink(ctx, u); ctx.stroke();
    const apron = () => { ctx.beginPath(); ctx.moveTo(-8 + lean * 0.6, -66); ctx.lineTo(8 + lean * 0.6, -66); ctx.quadraticCurveTo(11, -48, 11.5, -29); ctx.quadraticCurveTo(0, -27, -11.5, -29); ctx.quadraticCurveTo(-11, -48, -8 + lean * 0.6, -66); ctx.closePath(); };
    apron(); ctx.fillStyle = p.apron; ctx.fill(); shade(ctx, apron, () => R(ctx, 5, -70, 10, 45), p.apronS);
    ctx.save(); apron(); ctx.clip();
    for (let i = 0; i < 26; i++) { const fx = -11 + P.hash(i + 3) * 22, fy = -64 + P.hash(i + 9) * 34; ctx.fillStyle = i % 3 ? '#d9707a' : '#e9a04a'; for (let k = 0; k < 4; k++) { E(ctx, fx + Math.cos(k * 1.57) * 0.7, fy + Math.sin(k * 1.57) * 0.7, 0.55, 0.55); ctx.fill(); } }
    ctx.restore(); apron(); ink(ctx, u); ctx.stroke();
    ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 0.6;
    for (const by of [-73, -70]) { ctx.beginPath(); ctx.moveTo(lean + 1, by); ctx.lineTo(lean + 4, by); ctx.stroke(); E(ctx, lean + 4.4, by, 0.6, 0.6); ctx.fillStyle = '#f2ead8'; ctx.fill(); }
    if (kneel) {
      arm(ctx, u, -1, [-11.5 + lean, -71], 0.95, 0, 23, 0, 5.8, p.jacket, p.jacketS, p.skin);
      arm(ctx, u, 1, [11.5 + lean, -71], -0.85, 0, 23, 0, 5.8, p.jacket, p.jacketS, p.skin);
    } else if (o.prop === 'can') {
      arm(ctx, u, -1, [-11.5 + lean, -71], 0.12, 0, 24, 0, 5.8, p.jacket, p.jacketS, p.skin);
      ctx.save(); ctx.translate(24.5, -47); const tilt = 0.25 + Math.sin(t * 1.4) * 0.08; ctx.rotate(tilt);
      ctx.beginPath(); ctx.roundRect(-4, -6, 11, 12, 2); fi(ctx, u, '#9fb7c4'); shade(ctx, () => { ctx.beginPath(); ctx.roundRect(-4, -6, 11, 12, 2); }, () => R(ctx, 3, -7, 6, 14), '#7d95a3');
      ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(16, -6); ctx.lineTo(17, -4.6); ctx.lineTo(7, 5); ctx.closePath(); fi(ctx, u, '#9fb7c4');
      ctx.beginPath(); ctx.arc(1.5, -6, 4, Math.PI, TAU); ink(ctx, u); ctx.stroke();
      ctx.fillStyle = 'rgba(200,230,255,0.85)'; for (let i = 0; i < 6; i++) { const ph = (t * 1.6 + i / 6) % 1; E(ctx, 17 + ph * 6 + i * 0.4, -4 + ph * ph * 30, 0.5, 0.9); ctx.fill(); }
      ctx.restore();
      arm(ctx, u, 1, [11.5 + lean, -71], 0.42, 0, 23, 0, 5.8, p.jacket, p.jacketS, p.skin);
    } else {
      arm(ctx, u, -1, [-11.5 + lean, -71], 0.12, 0, 24, 0, 5.8, p.jacket, p.jacketS, p.skin);
      arm(ctx, u, 1, [11.5 + lean, -71], pose === 'cane' ? 0.4 : 0.12, 0, 24, 0, 5.8, p.jacket, p.jacketS, p.skin);
    }
    ctx.save(); ctx.translate(lean * 1.2, 0); gmaHead(ctx, u, t, p, o.face || 'smile'); ctx.restore();
    ctx.restore(); ctx.restore();
  };

  // =====================================================================
  // 司机叔叔 the driver — bust inside the cab
  // =====================================================================
  K.driver = (ctx, t, x, y, s) => {
    const u = 4 * s; ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
    const torso = () => { ctx.beginPath(); ctx.moveTo(-36, 4); ctx.quadraticCurveTo(-34, -23, -14, -29); ctx.lineTo(14, -29); ctx.quadraticCurveTo(34, -23, 36, 4); ctx.closePath(); };
    torso(); ctx.fillStyle = '#7b838e'; ctx.fill(); shade(ctx, torso, () => R(ctx, 12, -30, 26, 36), '#5f6670'); torso(); ink(ctx, u); ctx.stroke();
    const vest = () => { ctx.beginPath(); ctx.moveTo(-22, 4); ctx.lineTo(-20, -24); ctx.lineTo(-7, -29); ctx.lineTo(0, -17); ctx.lineTo(7, -29); ctx.lineTo(20, -24); ctx.lineTo(22, 4); ctx.closePath(); };
    vest(); ctx.fillStyle = '#ef7a2a'; ctx.fill(); shade(ctx, vest, () => R(ctx, 6, -30, 20, 36), '#c95e1c'); shade(ctx, vest, () => R(ctx, -24, -11, 48, 2.6), '#e6ecee'); shade(ctx, vest, () => R(ctx, -24, -4, 48, 2.6), '#e6ecee'); vest(); ink(ctx, u); ctx.stroke();
    R(ctx, -4, -37, 8, 9); fi(ctx, u, '#e6be99', 0.8);
    const face = () => E(ctx, 0, -46.5, 8.6, 10.2);
    for (const sx of [-1, 1]) { E(ctx, sx * 8.6, -46, 1.6, 2.6); fi(ctx, u, '#e6be99', 0.8); }
    face(); ctx.fillStyle = '#ecc6a3'; ctx.fill(); shade(ctx, face, () => E(ctx, 7.5, -45, 4, 11), '#d5a985'); face(); ink(ctx, u); ctx.stroke();
    ctx.fillStyle = 'rgba(70,60,60,0.35)'; for (let i = 0; i < 46; i++) { const a = Math.PI * (0.12 + P.hash(i) * 0.76), d = 7 + P.hash(i + 50) * 2.4; ctx.fillRect(Math.cos(a) * d * 0.95, -46.5 + Math.sin(a) * d * 1.05, 0.35, 0.35); }
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.5;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 3.4, -47, 1.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx * 5, -50.6); ctx.quadraticCurveTo(sx * 3.4, -51.4, sx * 1.6, -50.2); ctx.stroke(); ctx.strokeStyle = 'rgba(120,80,70,0.45)'; ctx.beginPath(); ctx.arc(sx * 3.4, -45.6, 1.4, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); ctx.strokeStyle = '#2a1a14'; }
    ctx.strokeStyle = '#b98a6c'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(0.3, -45.5); ctx.lineTo(1, -43); ctx.lineTo(-0.2, -42.7); ctx.stroke();
    ctx.strokeStyle = '#7a3e32'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(0, -41.5, 2.2, Math.PI * 0.25, Math.PI * 0.75); ctx.stroke();
    const hat = () => { ctx.beginPath(); ctx.moveTo(-9.8, -51); ctx.bezierCurveTo(-10, -63, 10, -63, 9.8, -51); ctx.closePath(); };
    hat(); ctx.fillStyle = '#f2c21c'; ctx.fill(); shade(ctx, hat, () => R(ctx, 3, -64, 10, 14), '#cf9c10'); shade(ctx, hat, () => E(ctx, -4, -59, 3, 1.4, -0.4), 'rgba(255,255,255,0.6)'); hat(); ink(ctx, u); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-12.5, -52.2, 25, 2.6, 1.2); fi(ctx, u, '#e0ae14');
    ctx.save(); ctx.translate(-27, -40); ctx.rotate(-0.14);
    ctx.beginPath(); ctx.rect(-6, -8, 12, 15); fi(ctx, u, '#fbf6ea', 0.7); R(ctx, -5, -7, 10, 10); ctx.fillStyle = '#9cc9e6'; ctx.fill();
    E(ctx, 0, -3.6, 1.6, 1.6); ctx.fillStyle = '#f3d6bd'; ctx.fill(); E(ctx, -1.8, -4.4, 0.8, 0.8); ctx.fillStyle = '#2a211d'; ctx.fill(); E(ctx, 1.8, -4.4, 0.8, 0.8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, 2.4); ctx.lineTo(2, 2.4); ctx.lineTo(1.1, -1.8); ctx.lineTo(-1.1, -1.8); ctx.closePath(); ctx.fillStyle = '#ef8fb0'; ctx.fill();
    E(ctx, 0, 7.5, 3.4, 2.6); fi(ctx, u, '#ecc6a3', 0.8);
    ctx.restore();
    ctx.restore();
  };

  // =====================================================================
  // 絮絮 Xuxu — a dandelion-fluff wind spirit
  // =====================================================================
  K.xuxu = (ctx, t, x, y, r, o = {}) => {
    const a = o.alpha ?? 1; if (a <= 0.01) return;
    y += Math.sin(t * 1.7 + x * 0.013) * r * 0.1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.fillStyle = P.rg(ctx, 0, 0, r * 0.3, r * 2.3, [[0, 'rgba(255,250,228,0.5)'], [1, 'rgba(255,250,228,0)']]); ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, TAU); ctx.fill();
    ctx.fillStyle = P.rg(ctx, -r * 0.25, -r * 0.3, r * 0.1, r * 1.0, [[0, 'rgba(255,255,255,1)'], [0.62, 'rgba(242,246,252,0.97)'], [0.82, 'rgba(214,224,240,0.6)'], [1, 'rgba(196,208,230,0)']]); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = P.rg(ctx, r * 0.35, r * 0.4, r * 0.1, r * 0.9, [[0, 'rgba(170,186,216,0.35)'], [1, 'rgba(170,186,216,0)']]); ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, TAU); ctx.fill();
    const n = Math.round(clamp(r * 2.6, 70, 560)), rot = t * 0.04; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + P.hash(i * 7 + 3) * 0.2 + rot, len = r * (0.8 + P.hash(i * 13 + 5) * 0.26), ca = Math.cos(ang), sa = Math.sin(ang);
      const sh = 0.5 - (ca * -0.6 + sa * -0.8) * 0.5, a0 = r > 120 ? 0.55 : 0.9;
      ctx.strokeStyle = sh > 0.62 ? `rgba(182,196,224,${a0})` : `rgba(255,255,255,${a0})`; ctx.lineWidth = Math.max(0.6, r * 0.009);
      ctx.beginPath(); ctx.moveTo(ca * r * 0.5, sa * r * 0.5); ctx.lineTo(ca * len, sa * len); ctx.stroke();
      const tx = ca * len, ty = sa * len, pl = r * 0.06; ctx.lineWidth = Math.max(0.4, r * 0.005); ctx.beginPath();
      for (let k = -2; k <= 2; k++) { const b = ang + k * 0.33; ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(b) * pl, ty + Math.sin(b) * pl); }
      ctx.stroke();
    }
    // inner fluff: short soft strokes that make the ball read as down, not spikes
    ctx.lineWidth = Math.max(1, r * 0.02);
    for (let i = 0; i < n * 0.6; i++) { const ang = P.hash(i + 900) * TAU, d0 = r * (0.3 + P.hash(i + 901) * 0.45), l = r * (0.12 + P.hash(i + 902) * 0.18); ctx.strokeStyle = `rgba(255,255,255,${0.25 + P.hash(i + 903) * 0.3})`; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * d0, Math.sin(ang) * d0); ctx.lineTo(Math.cos(ang) * (d0 + l), Math.sin(ang) * (d0 + l)); ctx.stroke(); }
    const cl = blink(t, 2.3);
    for (const sx of [-1, 1]) {
      const ex = sx * r * 0.23, ey = r * 0.06;
      if (cl) { ctx.strokeStyle = '#1b1414'; ctx.lineWidth = Math.max(1, r * 0.035); ctx.beginPath(); ctx.arc(ex, ey - r * 0.02, r * 0.07, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
      else { P.circle(ctx, ex, ey, r * 0.085, '#16100f'); P.circle(ctx, ex + r * 0.03, ey - r * 0.03, r * 0.03, '#ffffff'); }
      P.ell(ctx, ex + sx * r * 0.07, ey + r * 0.14, r * 0.08, r * 0.045, 'rgba(255,160,160,0.35)');
    }
    ctx.save(); ctx.translate(r * 0.04, -r * 0.86); ctx.rotate(Math.sin(t * 2.1) * 0.18);
    ctx.strokeStyle = '#4f8f3a'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.02, -r * 0.12, r * 0.05, -r * 0.2); ctx.stroke();
    P.ell(ctx, r * 0.15, -r * 0.24, r * 0.15, r * 0.065, '#6cc04f', -0.5);
    ctx.strokeStyle = '#3d7d2c'; ctx.lineWidth = Math.max(0.6, r * 0.012); ctx.beginPath(); ctx.moveTo(r * 0.03, -r * 0.18); ctx.lineTo(r * 0.27, -r * 0.31); ctx.stroke();
    ctx.restore();
    ctx.restore();
  };
  K.xuxuBig = (ctx, t, x, y, s, o = {}) => {
    const r = 230 * s, a = o.dissolve ? clamp(1 - (o.p || 0) * 1.25, 0, 1) : 1, bob = Math.sin(t * 1.7 + x * 0.013) * r * 0.1;
    K.xuxu(ctx, t, x, y, r, { alpha: a });
    if (o.rider) {
      const gs = (r * 0.62) / 250;
      K.girl(ctx, t, x - r * 0.06, y + bob - r * 0.42, gs, { pose: 'arms', seed: 3 });
      ctx.save(); ctx.translate(x, y + bob); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = Math.max(0.8, r * 0.012);
      for (let i = 0; i < 70; i++) { const ang = -Math.PI * (0.25 + 0.5 * (i / 70)) + Math.sin(i * 3.1) * 0.05, l0 = r * 0.25, l1 = r * (0.8 + P.hash(i + 3) * 0.3); ctx.beginPath(); ctx.moveTo(Math.cos(ang) * l0, Math.sin(ang) * l0 * 0.6); ctx.lineTo(Math.cos(ang) * l1, Math.sin(ang) * l1 * 0.55); ctx.stroke(); }
      ctx.restore();
    }
  };

  // =====================================================================
  // 灰先生 Mister Grey (fog) and 铁犀牛 the Iron Rhino
  // =====================================================================
  let fogSprite = null;
  function makeFog() {
    const w = 440, h = 800, c = P.canvas(w, h), x = c.getContext('2d'), r = P.rng(31);
    for (let i = 0; i < 190; i++) {
      const k = r(), yy = h - 10 - k * h * 0.74, spread = (1 - k) * 130 + 60, xx = w / 2 + (r() - 0.5) * spread * 1.3, rr = 34 + r() * 64 * (1 - k * 0.45);
      x.fillStyle = P.rg(x, xx, yy, 0, rr, [[0, `rgba(${84 + (r() * 30) | 0},${88 + (r() * 30) | 0},${98 + (r() * 30) | 0},0.42)`], [1, 'rgba(100,104,112,0)']]); x.beginPath(); x.arc(xx, yy, rr, 0, TAU); x.fill();
    }
    const hy = h * 0.2;
    x.fillStyle = 'rgba(66,68,78,0.88)'; x.beginPath(); x.roundRect(w / 2 - 56, hy - 128, 112, 128, 14); x.fill(); x.beginPath(); x.ellipse(w / 2, hy, 112, 17, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(36,36,44,0.6)'; x.fillRect(w / 2 - 56, hy - 34, 112, 15);
    for (let i = 0; i < 40; i++) { const xx = w / 2 + (r() - 0.5) * 240, yy = hy + (r() - 0.6) * 60, rr = 16 + r() * 26; x.fillStyle = P.rg(x, xx, yy, 0, rr, [[0, 'rgba(130,134,142,0.18)'], [1, 'rgba(130,134,142,0)']]); x.beginPath(); x.arc(xx, yy, rr, 0, TAU); x.fill(); }
    for (const sx of [-1, 1]) { x.fillStyle = P.rg(x, w / 2 + sx * 32, hy + 66, 0, 15, [[0, 'rgba(228,232,240,0.6)'], [1, 'rgba(228,232,240,0)']]); x.beginPath(); x.arc(w / 2 + sx * 32, hy + 66, 15, 0, TAU); x.fill(); }
    return c;
  }
  K.fogman = (ctx, t, x, y, s) => {
    fogSprite = fogSprite || makeFog(); const h = 380 * s, w = (h * fogSprite.width) / fogSprite.height;
    ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, Math.sin(t * 0.6) * 0.05, 1, 0, 0); ctx.globalAlpha = 0.95; ctx.drawImage(fogSprite, -w / 2, -h, w, h); ctx.restore();
  };

  K.rhino = (ctx, t, x, y, s, o = {}) => {
    const u = 3 * s, sad = !!o.sad, night = !!o.night, rum = sad ? 0 : Math.sin(t * 23) * 0.25;
    ctx.save(); ctx.translate(x, y + rum * u); ctx.scale(u, u);
    groundShadow(ctx, 80, 6, 0.32);
    const Y = '#e3b02a', YS = '#bf8a18', YL = '#f6d36a';
    const track = () => { ctx.beginPath(); ctx.roundRect(-72, -27, 130, 27, 13.5); };
    track(); ctx.fillStyle = '#35353b'; ctx.fill();
    ctx.strokeStyle = '#1f1f24'; ctx.lineWidth = 0.9; for (let i = -68; i < 56; i += 5.6) { ctx.beginPath(); ctx.moveTo(i, -27); ctx.lineTo(i + 1.6, -23); ctx.moveTo(i, 0); ctx.lineTo(i + 1.6, -4); ctx.stroke(); }
    for (let i = -57; i <= 46; i += 17) { P.circle(ctx, i, -13.5, 7.2, '#5a5a62'); P.circle(ctx, i, -13.5, 3, '#2b2b30'); }
    track(); ink(ctx, u); ctx.stroke();
    ctx.fillStyle = 'rgba(110,80,50,0.5)'; for (let i = 0; i < 14; i++) E(ctx, -66 + P.hash(i) * 120, -3 - P.hash(i + 9) * 6, 2 + P.hash(i + 3) * 3, 1.2 + P.hash(i + 4) * 1.5), ctx.fill();
    const body = () => { ctx.beginPath(); ctx.moveTo(-76, -30); ctx.lineTo(-76, -58); ctx.quadraticCurveTo(-76, -67, -67, -67); ctx.lineTo(30, -67); ctx.quadraticCurveTo(41, -67, 43, -56); ctx.lineTo(47, -30); ctx.closePath(); };
    body(); ctx.fillStyle = Y; ctx.fill(); shade(ctx, body, () => R(ctx, -80, -46, 132, 20), YS); shade(ctx, body, () => R(ctx, -80, -67, 132, 3.4), YL);
    shade(ctx, body, () => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rx = -70 + P.hash(i + 11) * 108, ry = -52 + P.hash(i + 21) * 16; ctx.moveTo(rx + 6, ry); ctx.ellipse(rx, ry, 2.5 + P.hash(i) * 5, 5 + P.hash(i + 2) * 11, 0, 0, TAU); } }, 'rgba(150,72,28,0.33)');
    body(); ink(ctx, u); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,50,10,0.6)'; ctx.lineWidth = 0.8; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-66 + i * 4, -60); ctx.lineTo(-66 + i * 4, -42); ctx.stroke(); }
    ctx.fillStyle = '#8a6a1a'; for (let i = -70; i < 40; i += 9) { E(ctx, i, -63.5, 0.7, 0.7); ctx.fill(); E(ctx, i, -33.5, 0.7, 0.7); ctx.fill(); }
    const cab = () => { ctx.beginPath(); ctx.moveTo(-6, -67); ctx.lineTo(-6, -104); ctx.quadraticCurveTo(-6, -111, 1, -111); ctx.lineTo(27, -111); ctx.quadraticCurveTo(35, -109, 35, -99); ctx.lineTo(35, -67); ctx.closePath(); };
    cab(); ctx.fillStyle = Y; ctx.fill(); shade(ctx, cab, () => R(ctx, 24, -112, 14, 46), YS); cab(); ink(ctx, u); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-1, -105, 30, 26, 2.5); ctx.fillStyle = P.lg(ctx, 0, -105, 28, -80, night ? ['#3d5272', '#1f2a40'] : ['#cfe3ee', '#7f9fb3']); ctx.fill(); ink(ctx, u); ctx.stroke();
    if (night) { ctx.fillStyle = 'rgba(255,200,120,0.55)'; ctx.fillRect(2, -100, 24, 18); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(4, -79); ctx.lineTo(14, -105); ctx.lineTo(19, -105); ctx.lineTo(9, -79); ctx.fill();
    const lift = sad ? 0.55 : Math.sin(t * 0.9) * 0.12;
    ctx.save(); ctx.translate(33, -62); ctx.rotate(-0.85 + lift);
    const boom = () => { ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(30, -12, 58, -5); ctx.lineTo(58, 5); ctx.quadraticCurveTo(30, -1, 0, 6); ctx.closePath(); };
    boom(); ctx.fillStyle = Y; ctx.fill(); shade(ctx, boom, () => R(ctx, -2, 0, 62, 8), YS); boom(); ink(ctx, u); ctx.stroke();
    ctx.translate(58, 0); ctx.rotate(1.75 - lift * 0.6);
    ctx.beginPath(); ctx.roundRect(-4, -4, 38, 8, 3); fi(ctx, u, Y); ctx.translate(34, 0);
    const bucket = () => { ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(14, -10, 18, 4); ctx.lineTo(2, 9); ctx.quadraticCurveTo(-5, 4, -4, -6); ctx.closePath(); };
    bucket(); ctx.fillStyle = '#6a6a70'; ctx.fill(); shade(ctx, bucket, () => R(ctx, 4, 0, 18, 12), '#4b4b50'); bucket(); ink(ctx, u); ctx.stroke();
    ctx.fillStyle = '#d8d8dc'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(4 + i * 3.6, 8.6 - i * 1.4); ctx.lineTo(6 + i * 3.6, 12 - i * 1.4); ctx.lineTo(7.6 + i * 3.6, 7.6 - i * 1.4); ctx.fill(); }
    ctx.restore();
    for (const [ex, ey] of [[37, -52], [37, -40]]) {
      if (!sad && night) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = P.lg(ctx, ex, ey, ex + 160, ey, [[0, 'rgba(255,240,180,0.35)'], [1, 'rgba(255,240,180,0)']]); P.poly(ctx, [[ex, ey - 3], [ex + 170, ey - 40], [ex + 170, ey + 40], [ex, ey + 3]]); ctx.fill(); ctx.restore(); }
      E(ctx, ex, ey, 5.2, 5.2); fi(ctx, u, '#2c2c30'); E(ctx, ex + 0.6, ey, 3.8, 3.8); ctx.fillStyle = sad ? '#b8984a' : '#fff4c4'; ctx.fill();
      E(ctx, ex + 1.4, ey - 1.2, 1.1, 1.1); ctx.fillStyle = '#ffffff'; ctx.fill();
      if (!sad) P.glow(ctx, ex + 1, ey, 22, '#fff1b0', night ? 0.9 : 0.45);
      if (sad) { const d = (t * 0.55 + ey * 0.01) % 1; ctx.fillStyle = '#9b4a1e'; ctx.beginPath(); ctx.roundRect(ex - 0.5, ey + 4, 1.4, d * 16, 0.7); ctx.fill(); E(ctx, ex + 0.2, ey + 4 + d * 16, 1.2, 1.6); ctx.fill(); }
    }
    ctx.restore();
  };

  // small people (neighbours waving goodbye), pigeons
  K.person = (ctx, t, x, y, h, col, o = {}) => {
    const u = h / 100; ctx.save(); ctx.translate(x, y); ctx.scale(u, u); groundShadow(ctx, 14, 2.4, 0.2);
    for (const sx of [-1, 1]) { R(ctx, sx * 3.4 - 2.2, -42, 4.4, 41); fi(ctx, u, '#3d3f48', 1.4); }
    ctx.beginPath(); ctx.roundRect(-10, -80, 20, 42, 5); fi(ctx, u, col, 1.4);
    const wa = o.wave ? 2.6 + Math.sin(t * 6 + x) * 0.35 : 0.15;
    arm(ctx, u * 0.6, 1, [9, -76], wa, 0, 30, 0, 5.6, col, P.css(P.mix(col, '#000', 0.25)), '#f1d0b4');
    arm(ctx, u * 0.6, -1, [-9, -76], 0.15, 0, 30, 0, 5.6, col, P.css(P.mix(col, '#000', 0.25)), '#f1d0b4');
    E(ctx, 0, -89, 7.5, 8.5); fi(ctx, u, '#f1d0b4', 1.4); ctx.beginPath(); ctx.ellipse(0, -92, 8, 6.5, 0, Math.PI, TAU); fi(ctx, u, o.hair || '#2a2420', 1.4);
    ctx.restore();
  };
  K.pigeon = (ctx, t, x, y, s, seed = 0) => {
    const peck = Math.max(0, Math.sin(t * 2.5 + seed * 2)) > 0.92 ? 2.5 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    E(ctx, 0, -7, 9, 6); ctx.fillStyle = '#8f98a6'; ctx.fill(); E(ctx, 2, -7.5, 6, 3.5, -0.2); ctx.fillStyle = '#727b8a'; ctx.fill();
    E(ctx, 8, -12 + peck, 3.6, 3.4); ctx.fillStyle = '#8f98a6'; ctx.fill(); E(ctx, 6.5, -10.5 + peck, 2.2, 2); ctx.fillStyle = '#6aa38a'; ctx.fill();
    ctx.fillStyle = '#e0a03a'; ctx.beginPath(); ctx.moveTo(11.4, -12 + peck); ctx.lineTo(14, -11 + peck); ctx.lineTo(11.4, -10.4 + peck); ctx.fill();
    P.circle(ctx, 9, -12.8 + peck, 0.8, '#1a1a1a'); ctx.fillStyle = '#5a6270'; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-14, -6); ctx.lineTo(-8, -4.5); ctx.fill();
    ctx.strokeStyle = '#d07a6a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1, -1.5); ctx.lineTo(-1.5, 1); ctx.moveTo(2, -1.5); ctx.lineTo(2.5, 1); ctx.stroke();
    ctx.restore();
  };

  window.K = K;
})();
