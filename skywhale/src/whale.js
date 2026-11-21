// SKY WHALE — the whale model: design sheet (profiles, parts, palettes) for the Old Whale and
// the pod, plus deterministic kinematics (path following, humpback-like body wave, fluke and
// fin strokes, surge) and posed-surface evaluation used by the renderer.
(function (SW) {
  'use strict';
  const { v3, clamp, lerp, smoothstep, monotone, TAU, hex } = SW;

  // ----------------------------------------------------------------------------------------
  // MODEL SHEET (normalised by body length L: s=0 snout tip, s=1 fluke root; y up, metres = *L)
  // ----------------------------------------------------------------------------------------
  const BASE_PROFILE = {
    // dorsal line (top of section), ventral line, half-width — humpback-like: big head, deep belly
    top: [[0, 0.016], [0.03, 0.046], [0.08, 0.069], [0.14, 0.086], [0.22, 0.101], [0.32, 0.112], [0.42, 0.112], [0.52, 0.103], [0.62, 0.086], [0.72, 0.064], [0.82, 0.043], [0.91, 0.028], [1.0, 0.020]],
    bot: [[0, -0.004], [0.03, -0.050], [0.08, -0.090], [0.15, -0.119], [0.23, -0.131], [0.32, -0.129], [0.42, -0.117], [0.52, -0.099], [0.62, -0.076], [0.72, -0.053], [0.82, -0.033], [0.91, -0.021], [1.0, -0.015]],
    wid: [[0, 0.012], [0.03, 0.056], [0.08, 0.089], [0.15, 0.112], [0.23, 0.126], [0.32, 0.130], [0.42, 0.124], [0.52, 0.108], [0.62, 0.084], [0.72, 0.057], [0.82, 0.032], [0.91, 0.019], [1.0, 0.013]],
  };
  const TIP_Y = 0.006;     // vertical position of the snout tip relative to the spine axis
  const CAP = 0.065;       // length of the rounded nose cap (fraction of L)

  // Palettes: base colours are painted "flat" colours; the scene key/kage multiply them.
  const PAL_OLD = {
    hull: ['#46877f', '#52917f', '#3c7774', '#5d9887', '#336b6c', '#6aa190'],
    hullShade: '#2c5f66',
    keel: '#eadcc0', keelLine: '#b9a47e', strake: '#6b4a32',
    moss: '#6f9a3e', mossDark: '#4f7a2e', mossLight: '#9cbd57',
    rust: ['#c4622d', '#a8452a', '#d98a46'], chip: '#c8d9c6', primer: '#b9573a',
    patch: ['#8a7a5a', '#4e7f9a', '#7d9a6a', '#9a6a4a'],
    brass: '#c99a3e', brassDark: '#7a5522', brassLight: '#f1d48a',
    eye: '#ffb347', eyeCore: '#fff0b8',
    ink: '#24201f', inkInner: '#1f3b3d',
    spar: '#6a442a', sail: '#efe4c6', sailBack: '#d9c9a4', stripe: '#b84a3c',
    flukeUnder: '#e6d8bb', flukeMark: '#2f5d61',
    pennants: ['#c26e5c', '#d8bd84', '#5f7296'],
  };

  function design(o) {
    const d = Object.assign({
      name: 'whale', L: 105, girth: 1.0, finScale: 1.0, flukeScale: 1.0, headScale: 1.0,
      seed: 1, pal: PAL_OLD, rust: 1.0, patches: 6, chips: 1.0, age: 1.0,
      garden: { density: 1.0, pine: 1.0, pineS: 0.43, mast: true, shrubs: 1.0, flowers: 1.0, pennants: 3 },
      finSpars: 6, finOpen: 1.0, eyeGlow: 1.0, eyeColor: '#ffb347',
      swimPeriod: 6.0, waveAmp: 0.055, surge: 0.10, lean: 1.0,
    }, o);
    const g = d.girth;
    d.prof = {
      top: monotone(BASE_PROFILE.top.map(([s, y]) => [s, y * g * (s < 0.2 ? d.headScale : 1)])),
      bot: monotone(BASE_PROFILE.bot.map(([s, y]) => [s, y * g * (s < 0.2 ? d.headScale : 1)])),
      wid: monotone(BASE_PROFILE.wid.map(([s, y]) => [s, y * g * d.lean * (s < 0.2 ? d.headScale : 1)])),
    };
    return d;
  }

  const DESIGNS = {
    old: design({ name: 'Old Whale', L: 108, seed: 11, patches: 7, rust: 1.0 }),
    drover: design({
      name: 'Drover', L: 120, girth: 1.17, finScale: 1.45, headScale: 1.04, seed: 23, rust: 0.7, patches: 3, swimPeriod: 6.8,
      pal: Object.assign({}, PAL_OLD, { hull: ['#3b7d86', '#447f8f', '#336d78', '#4f8f96', '#2b6170', '#5f9ea4'], stripe: '#a8473a', pennants: ['#b06a50', '#cfb57a'] }),
      garden: { density: 0.8, pine: 0.0, mast: true, mastTall: 1.55, shrubs: 1.3, flowers: 0.6, pennants: 2 },
    }),
    pip: design({
      name: 'Pip', L: 46, girth: 1.14, headScale: 1.14, finScale: 0.95, seed: 37, rust: 0.15, patches: 0, chips: 0.3, swimPeriod: 3.2, waveAmp: 0.07,
      pal: Object.assign({}, PAL_OLD, { hull: ['#5aa79a', '#64b0a0', '#4f9a90', '#6fb9a6', '#4a9088', '#7cc2ad'], pennants: ['#d77a5e'] }),
      garden: { density: 0.45, pine: 0.0, sapling: true, mast: false, shrubs: 0.4, flowers: 1.4, pennants: 1 },
    }),
    elder: design({
      name: 'Elder', L: 114, girth: 1.06, headScale: 1.05, seed: 51, rust: 1.6, patches: 9, chips: 1.6, swimPeriod: 7.4,
      pal: Object.assign({}, PAL_OLD, { hull: ['#4f7f7a', '#5a8a80', '#456f6e', '#668f84', '#3d6566', '#71988a'], moss: '#5f8f3a', pennants: ['#a87868', '#bfae88'] }),
      garden: { density: 1.7, pine: 1.75, pineS: 0.40, mast: true, shrubs: 1.6, flowers: 1.0, pennants: 2 },
    }),
    mend: design({
      name: 'Mend', L: 92, girth: 1.0, seed: 67, rust: 0.8, patches: 16, swimPeriod: 5.6,
      pal: Object.assign({}, PAL_OLD, { hull: ['#4a9590', '#56a094', '#3f8580', '#62a99a', '#38787a', '#73b4a2'], patch: ['#b0875a', '#5d86a8', '#8aa86a', '#c09060', '#7a6a9a'], pennants: ['#d0a070', '#7f9cb8'] }),
      garden: { density: 1.0, pine: 0.0, mast: true, shrubs: 1.0, flowers: 1.6, pennants: 2 },
    }),
    swift: design({
      name: 'Swift', L: 98, girth: 0.76, lean: 0.88, finScale: 0.85, flukeScale: 1.28, seed: 79, rust: 0.5, patches: 2, swimPeriod: 4.2, waveAmp: 0.065, surge: 0.14,
      pal: Object.assign({}, PAL_OLD, { hull: ['#3f8f94', '#479aa0', '#357f86', '#55a7aa', '#2e7079', '#63b2b0'], pennants: ['#c25a4a', '#e0c98e', '#4d6a96'] }),
      garden: { density: 0.6, pine: 0.0, mast: true, shrubs: 0.6, flowers: 0.8, pennants: 3 },
    }),
  };

  // superellipse helper
  const sp = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
  const capf = (s) => { const u = Math.min(s / CAP, 1); return Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u))); };

  // Section (local, metres) at s and angle phi. phi=0: right side (+side), pi/2: top, -pi/2: bottom.
  function sectionPoint(d, s, phi, out) {
    const L = d.L, c = capf(s);
    const top = TIP_Y + (d.prof.top(s) - TIP_Y) * c;
    const bot = TIP_Y + (d.prof.bot(s) - TIP_Y) * c;
    const wid = d.prof.wid(s) * c;
    const cs = Math.cos(phi), sn = Math.sin(phi);
    const eTop = 2 / 2.05, eBot = 2 / 2.35;
    let x = wid * sp(cs, sn >= 0 ? eTop : eBot);
    let y = sn >= 0 ? top * sp(sn, eTop) : bot * sp(-sn, eBot); // bot is negative
    // small dorsal fin / ridge and peduncle keel
    if (sn > 0) {
      const ridge = 0.0125 * Math.exp(-Math.pow((s - 0.665) / 0.032, 2)) + 0.0045 * smoothstep(0.72, 0.86, s) * (1 - smoothstep(0.95, 1.0, s));
      y += ridge * Math.pow(sn, 60);
    } else {
      y -= 0.004 * smoothstep(0.76, 0.88, s) * Math.pow(-sn, 40);
    }
    out[0] = x * L; out[1] = y * L;
    return out;
  }

  // ----------------------------------------------------------------------------------------
  // Motion: a whale swims along a world path; its body follows the head's trajectory.
  // ----------------------------------------------------------------------------------------
  class Whale {
    constructor(designKey, o) {
      this.d = typeof designKey === 'string' ? DESIGNS[designKey] : designKey;
      o = o || {};
      this.path = o.path;                // SW.Path3 in world metres
      this.speed = o.speed || [[0, 8]];  // keyed speed m/s along path
      this.d0 = o.d0 !== undefined ? o.d0 : this.d.L * 1.2; // head arc position at t=0
      this.period = o.period || this.d.swimPeriod;
      this.phase = o.phase || 0;
      this.waveAmp = o.waveAmp !== undefined ? o.waveAmp : this.d.waveAmp;
      this.ampKeys = o.ampKeys || null;  // keyed multiplier of stroke amplitude
      this.surge = o.surge !== undefined ? o.surge : this.d.surge;
      this.bank = o.bank || null;        // function(t) -> roll radians
      this.upFn = o.upFn || null;        // optional function(t, s) -> extra pitch
      this.finKeys = o.finKeys || null;  // keyed fin opening multiplier
      this.finStroke = o.finStroke !== undefined ? o.finStroke : 1.0;
      this.finPhase = o.finPhase || 0;
      this.finPeriod = o.finPeriod || 0;
      this.headLift = o.headLift || null; // function(t) -> radians (call pose)
      this.eye = o.eye || (() => 1.0);    // eye glow function(t)
      this.mouth = o.mouth || null;
      this.wind = o.wind || [0, 0, 0];
      this.pennantK = o.pennantK || null;
      this.tStart = o.tStart || 0;
      // integrate arc length with fixed steps (deterministic), cache table
      this._dt = 1 / 480;
      this._tbl = [this.d0];
      this._phaseTbl = [0];
    }
    ampAt(t) { return this.waveAmp * (this.ampKeys ? SW.keyed(this.ampKeys, t) : 1); }
    // swim phase integrates the (possibly time-varying) stroke frequency
    speedAt(t) { return SW.keyed(this.speed, t); }
    _extend(t) {
      const dt = this._dt;
      const need = Math.ceil(Math.max(0, t - this.tStart) / dt) + 2;
      while (this._tbl.length < need) {
        const i = this._tbl.length - 1, ti = this.tStart + i * dt;
        const ph = this._phaseTbl[i];
        const v0 = this.speedAt(ti + dt / 2);
        // surge: thrust on both strokes, stronger on the downstroke
        const a = Math.sin(TAU * ph + this.phase);
        const sg = 1 + this.surge * (1.6 * (a * a - 0.5) + 0.35 * Math.max(0, -Math.cos(TAU * ph + this.phase)) - 0.11) * Math.min(1, this.ampAt(ti) / this.waveAmp);
        this._tbl.push(this._tbl[i] + v0 * sg * dt);
        // stroke frequency slows slightly when slow
        const f = 1 / this.period;
        this._phaseTbl.push(ph + f * dt);
      }
    }
    headDist(t) {
      this._extend(t);
      const x = Math.max(0, t - this.tStart) / this._dt, i = Math.floor(x), f = x - i;
      return lerp(this._tbl[i], this._tbl[i + 1], f);
    }
    swimPhase(t) {
      this._extend(t);
      const x = Math.max(0, t - this.tStart) / this._dt, i = Math.floor(x), f = x - i;
      return lerp(this._phaseTbl[i], this._phaseTbl[i + 1], f);
    }
    velocity(t) { const e = 1 / 96; return v3.scale(v3.sub(this.path.at(this.headDist(t + e)), this.path.at(this.headDist(t - e))), 1 / (2 * e)); }

    // Pose the body at time t: stations with centre, frame and undulation.
    pose(t, NS) {
      NS = NS || 160;
      const d = this.d, L = d.L, path = this.path;
      const hd = this.headDist(t);
      const ph = this.swimPhase(t);
      const amp = this.ampAt(t) * L;
      const lam = 1.15; // body wavelengths
      const bank = this.bank ? this.bank(t) : 0;
      const headLift = this.headLift ? this.headLift(t) : 0;
      const S = new Float32Array(NS);
      const C = [], T = [], U = [], R = [];
      for (let i = 0; i < NS; i++) {
        // concentrate stations at nose and tail
        const u = i / (NS - 1);
        const s = clamp(0.5 - 0.5 * Math.cos(Math.PI * u) * 0.35 + (u - 0.5) * 0.65, 0, 1);
        S[i] = s;
      }
      S[0] = 0; S[NS - 1] = 1;
      // centreline from path, then local undulation in the body's vertical plane
      const raw = [];
      for (let i = 0; i < NS; i++) {
        const s = S[i];
        const pd = hd - s * L;
        const p = path.at(pd);
        const tg = path.tangent(pd);
        raw.push({ p, tg });
      }
      for (let i = 0; i < NS; i++) {
        const s = S[i];
        const tg = raw[i].tg;
        // up frame: world up orthogonalised, then banked around the tangent
        let up = v3.norm(v3.sub([0, 1, 0], v3.scale(tg, tg[1])));
        if (bank) up = v3.rot(up, tg, bank);
        // body wave: amplitude envelope grows toward the fluke, small heave at head
        const env = 0.06 + 0.94 * Math.pow(smoothstep(0.18, 1.0, s), 1.35);
        let y = amp * env * Math.sin(TAU * ph + this.phase - TAU * s / lam) - amp * 0.05;
        // call pose: lift the head (bend the front third upward)
        if (headLift) y += Math.pow(Math.max(0, 0.42 - s) / 0.42, 2) * headLift * L * 0.42 * 0.5;
        const extra = this.upFn ? this.upFn(t, s) : 0;
        y += extra * L;
        C.push(v3.madd(raw[i].p, up, y));
        U.push(up);
      }
      // tangents from the final centreline (forward = toward the head)
      for (let i = 0; i < NS; i++) {
        const a = C[Math.max(0, i - 1)], b = C[Math.min(NS - 1, i + 1)];
        let tg = v3.norm(v3.sub(a, b));
        // re-orthogonalise up against new tangent
        let up = v3.norm(v3.sub(U[i], v3.scale(tg, v3.dot(U[i], tg))));
        T.push(tg); U[i] = up;
        R.push(v3.norm(v3.cross(tg, up))); // right side (phi=0) = T x U
      }
      return { t, d, L, NS, S, C, T, U, R, ph, amp, bank, hd, whale: this };
    }
  }

  // Interpolate posed frame at arbitrary s
  function frameAt(pose, s) {
    const S = pose.S, NS = pose.NS;
    let lo = 0, hi = NS - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    const f = clamp((s - S[lo]) / (S[hi] - S[lo] || 1), 0, 1);
    const C = v3.lerp(pose.C[lo], pose.C[hi], f);
    const T = v3.norm(v3.lerp(pose.T[lo], pose.T[hi], f));
    let U = v3.lerp(pose.U[lo], pose.U[hi], f);
    U = v3.norm(v3.sub(U, v3.scale(T, v3.dot(U, T))));
    const R = v3.norm(v3.cross(T, U));
    return { C, T, U, R };
  }
  const _tmp2 = [0, 0];
  // Surface point and normal at (s, phi) on the posed body (world space)
  function surf(pose, s, phi, lift) {
    const d = pose.d, fr = frameAt(pose, s);
    sectionPoint(d, s, phi, _tmp2);
    const x = _tmp2[0], y = _tmp2[1];
    const p = [fr.C[0] + fr.R[0] * x + fr.U[0] * y, fr.C[1] + fr.R[1] * x + fr.U[1] * y, fr.C[2] + fr.R[2] * x + fr.U[2] * y];
    // numeric normal
    const e = 0.002, ep = 0.01;
    const a = sectionPoint(d, Math.min(1, s + e), phi, [0, 0]), b = sectionPoint(d, Math.max(0, s - e), phi, [0, 0]);
    const c = sectionPoint(d, s, phi + ep, [0, 0]), dd = sectionPoint(d, s, phi - ep, [0, 0]);
    // local derivatives: along s (backward = -T * L), around phi
    const ds = [(a[0] - b[0]) / (2 * e), (a[1] - b[1]) / (2 * e), -d.L];
    const dp = [(c[0] - dd[0]) / (2 * ep), (c[1] - dd[1]) / (2 * ep), 0];
    // local coords (x along R, y along U, z along T)
    let nl = [ds[1] * dp[2] - ds[2] * dp[1], ds[2] * dp[0] - ds[0] * dp[2], ds[0] * dp[1] - ds[1] * dp[0]];
    // make outward
    if (nl[0] * x + nl[1] * y < 0) nl = [-nl[0], -nl[1], -nl[2]];
    let n = [fr.R[0] * nl[0] + fr.U[0] * nl[1] + fr.T[0] * nl[2], fr.R[1] * nl[0] + fr.U[1] * nl[1] + fr.T[1] * nl[2], fr.R[2] * nl[0] + fr.U[2] * nl[1] + fr.T[2] * nl[2]];
    n = v3.norm(n);
    if (lift) { p[0] += n[0] * lift; p[1] += n[1] * lift; p[2] += n[2] * lift; }
    return { p, n, fr };
  }

  SW.WHALE = { DESIGNS, PAL_OLD, sectionPoint, frameAt, surf, capf, TIP_Y };
  SW.Whale = Whale;
})(window.SW = window.SW || {});
