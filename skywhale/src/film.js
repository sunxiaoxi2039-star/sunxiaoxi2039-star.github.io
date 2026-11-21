// SKY WHALE — film: timeline, shot registry and the per-frame stage (shadow, prepass, main,
// finishing). Each shot is a deterministic function of its local time.
(function (SW) {
  'use strict';
  const { v3, clamp } = SW;
  SW.SHOTS = SW.SHOTS || {};

  function Film(canvas, timeline) {
    const G = SW.GL(canvas);
    const gl = G.gl;
    const F = { G, gl, timeline, fps: timeline.fps };
    F.P = SW.Pipeline(G);
    F.WR = SW.WhaleRenderer(G);
    F.GD = SW.Garden(G);
    F.CR = SW.CloudRenderer(G);
    F.SKY = SW.SkyRenderer(G);
    F.FX = SW.FX ? SW.FX(G) : null;
    F.cache = {};
    F.cue = (id) => { const c = timeline.cues.find((q) => q.id === id); return c ? c.t : 0; };

    F.shotAt = function (frame) {
      for (const s of timeline.shots) if (frame >= s.startFrame && frame < s.endFrame) return s;
      return timeline.shots[timeline.shots.length - 1];
    };

    // Stage one frame. spec = {cam, light, sky, whales:[{whale,t,shadow,pose}], bg(fn), clouds:[{puffs,look,opts}], fx(fn), grade}
    F.stage = function (frame, spec) {
      const P = F.P, cam = spec.cam;
      const light = Object.assign({}, spec.light);
      const items = (spec.whales || []).map((w) => Object.assign({ pose: w.pose || w.whale.pose(w.t) }, w));
      // 1. character depth prepass (soft cloud contact + mask)
      P.beginPre();
      const preU = P.sceneUniforms(cam, light, 2);
      for (const it of items) F.WR.draw(it.whale, it.t, cam, preU, { pose: it.pose, garden: F.GD, noGlow: true });
      // 1b. planar reflection of the characters (mirrored camera), for water
      if (spec.reflect && items.length) {
        const rc = SW.reflectCamera(cam, spec.reflect.y || 0);
        P.beginChar();
        for (const it of items) {
          const lt = Object.assign({}, light, it.light || {}, { shadowOn: false });
          F.WR.draw(it.whale, it.t, rc, P.sceneUniforms(rc, lt, 0), { pose: it.pose, a2c: true, garden: F.GD, noGlow: true, tubeCam: rc });
        }
        P.resolveReflection();
        spec.reflTex = P.refl.colors[0];
      }
      // 2. characters: shadow + MSAA colour pass into their own transparent target
      let rect = null, maxDepth = 0;
      if (items.length) {
        P.beginChar();
        for (const it of items) {
          const lt = Object.assign({}, light, it.light || {});
          if (it.shadow !== false && lt.shadowOn !== false) {
            const mid = it.pose.C[Math.floor(it.pose.NS * 0.4)];
            const lc = P.lightCam(lt, mid, it.whale.d.L * 0.8);
            lt.lightVP = lc.viewProj; lt.shadowOn = true;
            P.beginShadow();
            F.WR.draw(it.whale, it.t, lc, P.sceneUniforms(lc, lt, 1), { pose: it.pose, tubeCam: lc, garden: F.GD, noGlow: true });
            G.bind(P.charMS);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
          } else lt.shadowOn = false;
          it.su = P.sceneUniforms(cam, lt, 0);
          if (it.inkW) it.su.inkW = it.inkW;
          if (it.glowAmt !== undefined) it.su.glowAmt = it.glowAmt;
          F.WR.draw(it.whale, it.t, cam, it.su, { pose: it.pose, a2c: true, garden: F.GD, noGlow: true });
          // screen rect (GL coords) from a generous sampling of the body + garden height
          const b = F.screenBounds(it, cam);
          if (b) { rect = rect ? [Math.min(rect[0], b[0]), Math.min(rect[1], b[1]), Math.max(rect[2], b[2]), Math.max(rect[3], b[3])] : b; maxDepth = Math.max(maxDepth, b[4]); }
        }
      }
      // 3. main pass: sky, background, vapour behind, characters, vapour in front, effects
      P.beginMain();
      if (spec.sky) F.SKY.draw(cam, spec.sky, spec.time);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
      if (spec.bg) spec.bg(cam, light, spec.reflTex);
      const su = P.sceneUniforms(cam, light, 0);
      const charDepth = items.length ? P.pre.colors[0] : null;
      const charMin = items.length ? P.charMin.colors[0] : null;
      if (items.length) { P.makeCharMin(); G.bind(P.main); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); }
      const cs = 1 / P.cloudScale;
      if ((spec.clouds || []).length) {
        P.beginCloud();
        for (const c of spec.clouds) F.CR.draw(c.puffs, cam, su, c.look, Object.assign({ charDepth: null, mode: 0, charScale: cs }, c.opts || {}));
        P.compositeCloud(false);
      }
      if (rect) P.compositeChar(rect);
      for (const it of items) F.WR.draw(it.whale, it.t, cam, it.su, { pose: it.pose, glowOnly: true, glowScale: it.glowScale });
      if (spec.mid) spec.mid(cam, light);
      if (rect) {
        const bb = [rect[0], F.G.H - rect[3], rect[2], F.G.H - rect[1], maxDepth];
        P.beginCloud();
        for (const c of spec.clouds || []) F.CR.draw(c.puffs, cam, su, c.look, Object.assign({ charDepth, charMin, mode: 2, bbox: bb, charScale: cs }, c.opts || {}));
        P.compositeCloud(true);
      }
      if (spec.fx) spec.fx(cam, light, su);
      P.resolve();
      P.finish(frame, spec.grade || {});
    };

    // conservative screen bounds of a whale (GL pixel coords, origin bottom-left) + max view depth
    F.screenBounds = function (it, cam) {
      const pose = it.pose, L = pose.d.L;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, dmax = 0, any = false;
      for (let i = 0; i < pose.NS; i += 4) {
        const c = pose.C[i], R = L * 0.16;
        const dep = cam.depth(c);
        if (dep < 1) { any = true; x0 = 0; y0 = 0; x1 = F.G.W; y1 = F.G.H; dmax = Math.max(dmax, R * 2); continue; }
        const sp = cam.project(c), rp = R * cam.pxPerRad / dep;
        x0 = Math.min(x0, sp[0] - rp); x1 = Math.max(x1, sp[0] + rp); y0 = Math.min(y0, sp[1] - rp); y1 = Math.max(y1, sp[1] + rp);
        dmax = Math.max(dmax, dep + R); any = true;
      }
      // garden/mast/pennants/fins/fluke reach well beyond the hull
      const pad = (it.pad || 0.45) * L * cam.pxPerRad / Math.max(1, cam.depth(pose.C[Math.floor(pose.NS / 2)]));
      if (!any) return null;
      return [x0 - pad, F.G.H - (y1 + pad), x1 + pad, F.G.H - (y0 - pad), dmax + L * 0.4];
    };
    F.renderFrame = function (frame) {
      const shot = F.shotAt(frame);
      const def = SW.SHOTS[shot.id];
      const t = frame / F.fps;
      const tl = (frame - shot.startFrame) / F.fps;
      if (!def) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0.1, 0.1, 0.1, 1); gl.clear(gl.COLOR_BUFFER_BIT); return; }
      if (!F.cache[shot.id]) { F.cache[shot.id] = {}; if (def.init) def.init(F, F.cache[shot.id], shot); }
      def.frame(F, F.cache[shot.id], tl, t, frame, shot);
    };
    return F;
  }
  SW.Film = Film;
})(window.SW = window.SW || {});
