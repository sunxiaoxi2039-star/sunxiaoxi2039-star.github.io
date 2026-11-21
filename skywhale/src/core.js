// SKY WHALE — core: math, deterministic random, noise, splines, easing.
// Plain script; attaches to window.SW. Everything here is deterministic.
(function (SW) {
  'use strict';

  // ---------- scalar helpers ----------
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const smootherstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
  const mix = lerp;
  const fract = (x) => x - Math.floor(x);
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  // easing
  const ease = {
    inOut: (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); },
    inOut5: (t) => smootherstep(0, 1, t),
    in2: (t) => { t = clamp(t, 0, 1); return t * t; },
    out2: (t) => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); },
    in3: (t) => { t = clamp(t, 0, 1); return t * t * t; },
    out3: (t) => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); },
    // heavy: slow start, long settle
    heavy: (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1)),
  };
  // eased interpolation between keys: keys = [[t, v], ...], v scalar or array
  function keyed(keys, t, fn) {
    fn = fn || ease.sine;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t <= b[0]) {
        const u = fn((t - a[0]) / (b[0] - a[0]));
        if (Array.isArray(a[1])) return a[1].map((v, k) => lerp(v, b[1][k], u));
        return lerp(a[1], b[1], u);
      }
    }
    return keys[keys.length - 1][1];
  }

  // ---------- deterministic random ----------
  function hash32(n) {
    n = (n | 0) ^ 0x9e3779b9;
    n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
    n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
    return (n ^ (n >>> 16)) >>> 0;
  }
  const hash01 = (n) => hash32(n) / 4294967296;
  const hash2 = (x, y) => hash01(hash32(x | 0) ^ Math.imul(y | 0, 0x27d4eb2d));
  const hash3 = (x, y, z) => hash01(hash32(hash32(x | 0) ^ Math.imul(y | 0, 0x27d4eb2d)) ^ Math.imul(z | 0, 0x165667b1));
  function rng(seed) {
    let a = hash32(seed) || 1;
    const r = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
    r.gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
    r.sign = () => (r() < 0.5 ? -1 : 1);
    return r;
  }

  // ---------- value noise (smooth, deterministic) ----------
  function vnoise2(x, y, seed) {
    seed = seed | 0;
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    fy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = hash3(xi, yi, seed), b = hash3(xi + 1, yi, seed), c = hash3(xi, yi + 1, seed), d = hash3(xi + 1, yi + 1, seed);
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  }
  function vnoise3(x, y, z, seed) {
    seed = seed | 0;
    const zi = Math.floor(z); let fz = z - zi; fz = fz * fz * (3 - 2 * fz);
    return lerp(vnoise2(x + zi * 17.13, y + zi * 31.7, seed), vnoise2(x + (zi + 1) * 17.13, y + (zi + 1) * 31.7, seed), fz);
  }
  function fbm2(x, y, oct, seed, lac, gain) {
    lac = lac || 2.03; gain = gain || 0.5;
    let s = 0, a = 0.5, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise2(x, y, seed + i * 101); n += a; x *= lac; y *= lac; a *= gain; }
    return s / n;
  }
  function fbm3(x, y, z, oct, seed) {
    let s = 0, a = 0.5, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise3(x, y, z, seed + i * 101); n += a; x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; }
    return s / n;
  }

  // ---------- vec3 (plain arrays) ----------
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    madd: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    // rotate vector v around unit axis k by angle a (Rodrigues)
    rot: (v, k, a) => {
      const c = Math.cos(a), s = Math.sin(a), d = v[0] * k[0] + v[1] * k[1] + v[2] * k[2];
      const cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
      return [v[0] * c + cr[0] * s + k[0] * d * (1 - c), v[1] * c + cr[1] * s + k[1] * d * (1 - c), v[2] * c + cr[2] * s + k[2] * d * (1 - c)];
    },
  };

  // ---------- mat4 (column-major Float32Array) ----------
  const m4 = {
    ident: () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    mul: (a, b) => {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return o;
    },
    perspective: (fovy, aspect, near, far) => {
      const f = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
      o[0] = f / aspect; o[5] = f; o[10] = (far + near) / (near - far); o[11] = -1; o[14] = (2 * far * near) / (near - far);
      return o;
    },
    ortho: (l, r, b, t, n, f) => {
      const o = new Float32Array(16);
      o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
      o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1;
      return o;
    },
    lookAt: (eye, target, up) => {
      const z = v3.norm(v3.sub(eye, target));
      const x = v3.norm(v3.cross(up, z));
      const y = v3.cross(z, x);
      const o = new Float32Array(16);
      o[0] = x[0]; o[4] = x[1]; o[8] = x[2];
      o[1] = y[0]; o[5] = y[1]; o[9] = y[2];
      o[2] = z[0]; o[6] = z[1]; o[10] = z[2];
      o[12] = -v3.dot(x, eye); o[13] = -v3.dot(y, eye); o[14] = -v3.dot(z, eye); o[15] = 1;
      return o;
    },
    xform: (m, p) => {
      const x = p[0], y = p[1], z = p[2];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15];
      return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w, w];
    },
    invert: (m) => {
      const inv = new Float32Array(16);
      inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
      inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
      inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
      inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
      inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
      inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
      inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
      inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
      inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
      inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
      inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
      inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
      inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
      inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
      inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
      inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
      let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
      det = 1.0 / det;
      for (let i = 0; i < 16; i++) inv[i] *= det;
      return inv;
    },
  };

  // ---------- splines ----------
  // Monotone cubic (Fritsch-Carlson) through [x,y] pairs, returns f(x)
  function monotone(points) {
    const n = points.length, xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  // Natural smooth curve through 3D points (centripetal Catmull-Rom), with arc-length table.
  function Path3(points, samples) {
    samples = samples || 2048;
    const P = points;
    const n = P.length;
    function seg(i, t) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[Math.min(n - 1, i + 1)], p3 = P[Math.min(n - 1, i + 2)];
      const t2 = t * t, t3 = t2 * t;
      const out = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        out[k] = 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      }
      return out;
    }
    const pts = [], cum = [0];
    for (let j = 0; j <= samples; j++) {
      const u = (j / samples) * (n - 1);
      const i = Math.min(n - 2, Math.floor(u));
      pts.push(seg(i, u - i));
      if (j > 0) cum.push(cum[j - 1] + v3.dist(pts[j], pts[j - 1]));
    }
    const total = cum[samples];
    function at(d) { // position at arc length d (extrapolates linearly beyond ends)
      if (d <= 0) { const dir = v3.norm(v3.sub(pts[1], pts[0])); return v3.madd(pts[0], dir, d); }
      if (d >= total) { const dir = v3.norm(v3.sub(pts[samples], pts[samples - 1])); return v3.madd(pts[samples], dir, d - total); }
      let lo = 0, hi = samples;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid; else hi = mid; }
      const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
      return v3.lerp(pts[lo], pts[hi], t);
    }
    function tangent(d) { const e = 0.5; return v3.norm(v3.sub(at(d + e), at(d - e))); }
    return { at, tangent, length: total };
  }

  // C1-continuous interpolation through timed keys [[t, value(s)], ...] (Catmull-Rom tangents,
  // zero velocity at the first and last key). Used for camera moves: no stop-and-go at keys.
  function smoothKeys(keys) {
    const n = keys.length;
    const isArr = Array.isArray(keys[0][1]);
    const dim = isArr ? keys[0][1].length : 1;
    const val = (i) => (isArr ? keys[i][1] : [keys[i][1]]);
    const tan = [];
    for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1) { tan.push(new Array(dim).fill(0)); continue; }
      const a = val(i - 1), b = val(i + 1), dt = keys[i + 1][0] - keys[i - 1][0];
      tan.push(a.map((x, k) => (b[k] - x) / dt));
    }
    return function (t) {
      if (t <= keys[0][0]) return isArr ? val(0).slice() : keys[0][1];
      if (t >= keys[n - 1][0]) return isArr ? val(n - 1).slice() : keys[n - 1][1];
      let i = 0; while (t > keys[i + 1][0]) i++;
      const t0 = keys[i][0], t1 = keys[i + 1][0], h = t1 - t0, u = (t - t0) / h;
      const u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      const a = val(i), b = val(i + 1), ta = tan[i], tb = tan[i + 1];
      const out = a.map((x, k) => h00 * x + h10 * h * ta[k] + h01 * b[k] + h11 * h * tb[k]);
      return isArr ? out : out[0];
    };
  }
  SW.smoothKeys = smoothKeys;
  // nearest arc length on a Path3 to a point (coarse search + refine)
  SW.nearestArc = function (path, p) {
    let best = 0, bd = 1e18;
    for (let d = 0; d <= path.length; d += path.length / 400) { const q = path.at(d), dd = v3.dist(q, p); if (dd < bd) { bd = dd; best = d; } }
    for (let step = path.length / 800; step > 0.01; step *= 0.5) {
      for (const d of [best - step, best + step]) { const dd = v3.dist(path.at(d), p); if (dd < bd) { bd = dd; best = d; } }
    }
    return best;
  };
  SW.dirFromAzEl = (azDeg, elDeg) => { const az = azDeg * Math.PI / 180, el = elDeg * Math.PI / 180; return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]; };
  SW.clamp = clamp; SW.lerp = lerp; SW.mix = mix; SW.smoothstep = smoothstep; SW.smootherstep = smootherstep;
  SW.fract = fract; SW.TAU = TAU; SW.DEG = DEG; SW.ease = ease; SW.keyed = keyed;
  SW.hash32 = hash32; SW.hash01 = hash01; SW.hash2 = hash2; SW.hash3 = hash3; SW.rng = rng;
  SW.vnoise2 = vnoise2; SW.vnoise3 = vnoise3; SW.fbm2 = fbm2; SW.fbm3 = fbm3;
  SW.v3 = v3; SW.m4 = m4; SW.monotone = monotone; SW.Path3 = Path3;
  // colour helpers
  SW.hex = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
  SW.mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  SW.mulc = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
  SW.css = (c, a) => `rgba(${Math.round(clamp(c[0], 0, 1) * 255)},${Math.round(clamp(c[1], 0, 1) * 255)},${Math.round(clamp(c[2], 0, 1) * 255)},${a === undefined ? 1 : a})`;
})(window.SW = window.SW || {});
