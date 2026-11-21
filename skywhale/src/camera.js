// SKY WHALE — camera: perspective camera with look-at, roll, projection helpers.
(function (SW) {
  'use strict';
  const { v3, m4 } = SW;

  function Camera(o) {
    const c = Object.assign({ pos: [0, 0, 100], target: [0, 0, 0], up: [0, 1, 0], fov: 35, roll: 0, near: 1, far: 60000, W: SW.FRAME_W || 1920, H: SW.FRAME_H || 1080, shift: [0, 0] }, o);
    let up = c.up;
    const fwd = v3.norm(v3.sub(c.target, c.pos));
    if (c.roll) up = v3.rot(up, fwd, c.roll);
    c.fwd = fwd;
    c.view = m4.lookAt(c.pos, c.target, up);
    c.fovRad = c.fov * Math.PI / 180;
    c.proj = m4.perspective(c.fovRad, c.W / c.H, c.near, c.far);
    // lens shift (off-axis) for composition without rotating the camera
    if (c.shift[0] || c.shift[1]) { c.proj[8] = c.shift[0] * 2; c.proj[9] = c.shift[1] * 2; }
    c.viewProj = m4.mul(c.proj, c.view);
    c.invViewProj = m4.invert(c.viewProj);
    c.right = [c.view[0], c.view[4], c.view[8]];
    c.upv = [c.view[1], c.view[5], c.view[9]];
    c.pxPerRad = c.H / (2 * Math.tan(c.fovRad / 2));
    // project world -> pixel coords (origin top-left), depth = distance along view axis
    c.project = function (p) {
      const q = m4.xform(c.viewProj, p);
      return [(q[0] * 0.5 + 0.5) * c.W, (1 - (q[1] * 0.5 + 0.5)) * c.H, q[3]];
    };
    c.depth = (p) => v3.dot(v3.sub(p, c.pos), fwd);
    // pixels per metre at a world point
    c.pxPerM = (p) => c.pxPerRad / Math.max(1e-3, c.depth(p));
    // world ray through pixel
    c.ray = function (px, py) {
      const x = (px / c.W) * 2 - 1, y = 1 - (py / c.H) * 2;
      const a = m4.xform(c.invViewProj, [x, y, -1]), b = m4.xform(c.invViewProj, [x, y, 1]);
      return v3.norm(v3.sub(b.slice(0, 3), a.slice(0, 3)));
    };
    return c;
  }
  SW.Camera = Camera;
})(window.SW = window.SW || {});
