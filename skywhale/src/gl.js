// SKY WHALE — WebGL2 helpers: programs, buffers, textures, framebuffers (MSAA + float).
(function (SW) {
  'use strict';

  // Shared GLSL included in every fragment/vertex shader that asks for it.
  // Noise is texture-based so it is identical everywhere (no sin-hash precision issues).
  const GLSL_COMMON = `
  uniform sampler2D uNoise;      // 256x256 RGBA random, NEAREST, REPEAT
  float h21(vec2 p){ return texture(uNoise, (floor(p)+0.5)/256.0).r; }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    vec4 r = vec4(texture(uNoise,(i+vec2(0.5,0.5))/256.0).r, texture(uNoise,(i+vec2(1.5,0.5))/256.0).r,
                  texture(uNoise,(i+vec2(0.5,1.5))/256.0).r, texture(uNoise,(i+vec2(1.5,1.5))/256.0).r);
    return mix(mix(r.x,r.y,u.x), mix(r.z,r.w,u.x), u.y);
  }
  // 4 independent channels of smooth noise at once
  vec4 vnoise4(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    vec4 a = texture(uNoise,(i+vec2(0.5,0.5))/256.0), b = texture(uNoise,(i+vec2(1.5,0.5))/256.0);
    vec4 c = texture(uNoise,(i+vec2(0.5,1.5))/256.0), d = texture(uNoise,(i+vec2(1.5,1.5))/256.0);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p, int oct){
    float s = 0.0, a = 0.5, n = 0.0;
    for (int i = 0; i < 8; i++){ if (i >= oct) break; s += a*vnoise(p); n += a; p = p*2.03 + vec2(17.1, 9.7); a *= 0.5; }
    return s/n;
  }
  float vnoise3(vec3 p){
    float zi = floor(p.z), fz = fract(p.z); fz = fz*fz*(3.0-2.0*fz);
    return mix(vnoise(p.xy + zi*vec2(17.13,31.7)), vnoise(p.xy + (zi+1.0)*vec2(17.13,31.7)), fz);
  }
  float fbm3(vec3 p, int oct){
    float s = 0.0, a = 0.5, n = 0.0;
    for (int i = 0; i < 6; i++){ if (i >= oct) break; s += a*vnoise3(p); n += a; p = p*2.03 + vec3(17.1, 9.7, 3.3); a *= 0.5; }
    return s/n;
  }
  float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
  // anti-aliased step: 0 below edge, 1 above, ~1px transition given the value's screen derivative
  float aastep(float edge, float x){ float w = max(fwidth(x), 1e-5); return clamp((x - edge)/w + 0.5, 0.0, 1.0); }
  float aastepw(float edge, float x, float px){ float w = max(fwidth(x)*px, 1e-5); return clamp((x - edge)/w + 0.5, 0.0, 1.0); }
  `;

  function GL(canvas, opts) {
    opts = opts || {};
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 not available');
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('EXT_color_buffer_half_float');
    gl.getExtension('OES_texture_float_linear');
    const G = { gl, canvas, W: canvas.width, H: canvas.height };

    // ---------- programs ----------
    function compile(type, src, name) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        const lines = src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n');
        console.error(lines);
        throw new Error('Shader compile error in ' + name + ':\n' + log);
      }
      return s;
    }
    G.program = function (name, vs, fs, opt) {
      opt = opt || {};
      const head = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n';
      const vsrc = head + (opt.vsCommon ? GLSL_COMMON : '') + vs;
      const fsrc = head + GLSL_COMMON + fs;
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vsrc, name + '.vs'));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsrc, name + '.fs'));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link error ' + name + ': ' + gl.getProgramInfoLog(p));
      const uniforms = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      let texUnit = 0;
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        const uname = info.name.replace(/\[0\]$/, '');
        const loc = gl.getUniformLocation(p, info.name);
        const u = { loc, type: info.type, size: info.size };
        if (info.type === gl.SAMPLER_2D || info.type === gl.SAMPLER_3D || info.type === gl.SAMPLER_2D_ARRAY) u.unit = texUnit++;
        uniforms[uname] = u;
      }
      const prog = { name, p, uniforms };
      prog.use = function (vals) {
        gl.useProgram(p);
        if (uniforms.uNoise && G.noiseTex) setU(uniforms.uNoise, G.noiseTex);
        if (vals) for (const k in vals) if (uniforms[k]) setU(uniforms[k], vals[k]);
        return prog;
      };
      prog.set = function (vals) { for (const k in vals) if (uniforms[k]) setU(uniforms[k], vals[k]); return prog; };
      prog.attrib = (a) => gl.getAttribLocation(p, a);
      return prog;
    };
    function setU(u, v) {
      const t = u.type;
      switch (t) {
        case gl.FLOAT: if (u.size > 1) gl.uniform1fv(u.loc, v); else gl.uniform1f(u.loc, v); break;
        case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
        case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
        case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
        case gl.INT: case gl.BOOL: gl.uniform1i(u.loc, v); break;
        case gl.FLOAT_MAT4: gl.uniformMatrix4fv(u.loc, false, v); break;
        case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v); break;
        case gl.SAMPLER_2D: case gl.SAMPLER_2D_ARRAY: case gl.SAMPLER_3D:
          gl.activeTexture(gl.TEXTURE0 + u.unit);
          gl.bindTexture(t === gl.SAMPLER_2D ? gl.TEXTURE_2D : (t === gl.SAMPLER_3D ? gl.TEXTURE_3D : gl.TEXTURE_2D_ARRAY), v && v.tex ? v.tex : v);
          gl.uniform1i(u.loc, u.unit);
          break;
        default: throw new Error('uniform type ' + t);
      }
    }

    // ---------- textures ----------
    G.texture = function (o) {
      // o: {w,h,data?,canvas?,format:'rgba8'|'rgba16f'|'rgba32f'|'r32f'|'rg16f', filter:'linear'|'nearest', wrap:'clamp'|'repeat', mips}
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const fmt = o.format || 'rgba8';
      const F = {
        rgba8: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE],
        rgba16f: [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT],
        rgba32f: [gl.RGBA32F, gl.RGBA, gl.FLOAT],
        r32f: [gl.R32F, gl.RED, gl.FLOAT],
        r16f: [gl.R16F, gl.RED, gl.HALF_FLOAT],
        rg16f: [gl.RG16F, gl.RG, gl.HALF_FLOAT],
      }[fmt];
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!o.flipY);
      if (o.canvas) {
        gl.texImage2D(gl.TEXTURE_2D, 0, F[0], F[1], F[2], o.canvas);
        o.w = o.canvas.width; o.h = o.canvas.height;
      } else {
        let data = o.data || null;
        if (data && fmt === 'rgba32f' && !(data instanceof Float32Array)) data = new Float32Array(data);
        gl.texImage2D(gl.TEXTURE_2D, 0, F[0], o.w, o.h, 0, F[1], fmt === 'rgba16f' && data instanceof Float32Array ? gl.FLOAT : F[2], data);
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      const lin = (o.filter || 'linear') === 'linear';
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST);
      if (o.mips) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, lin ? gl.LINEAR : gl.NEAREST);
      const wr = o.wrap === 'repeat' ? gl.REPEAT : (o.wrap === 'mirror' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
      return { tex, w: o.w, h: o.h, format: fmt };
    };

    // ---------- framebuffers ----------
    // fbo({w,h,colors:['rgba16f',...], depth:true|'tex', samples:0|4})
    G.fbo = function (o) {
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      const out = { fb, w: o.w, h: o.h, colors: [], samples: o.samples || 0 };
      const IF = { rgba8: gl.RGBA8, rgba16f: gl.RGBA16F, rgba32f: gl.RGBA32F, r32f: gl.R32F, r16f: gl.R16F, rg16f: gl.RG16F };
      const bufs = [];
      (o.colors || ['rgba8']).forEach((fmt, i) => {
        if (out.samples) {
          const rb = gl.createRenderbuffer();
          gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
          gl.renderbufferStorageMultisample(gl.RENDERBUFFER, out.samples, IF[fmt], o.w, o.h);
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, rb);
          out.colors.push({ rb, format: fmt });
        } else {
          const t = G.texture({ w: o.w, h: o.h, format: fmt, filter: o.filter || 'linear' });
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t.tex, 0);
          out.colors.push(t);
        }
        bufs.push(gl.COLOR_ATTACHMENT0 + i);
      });
      gl.drawBuffers(bufs);
      out.drawBuffers = bufs;
      if (o.depth) {
        if (o.depth === 'tex' && !out.samples) {
          const dt = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, dt);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, o.w, o.h, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dt, 0);
          out.depthTex = { tex: dt, w: o.w, h: o.h };
        } else {
          const rb = gl.createRenderbuffer();
          gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
          if (out.samples) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, out.samples, gl.DEPTH_COMPONENT24, o.w, o.h);
          else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, o.w, o.h);
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
          out.depthRb = rb;
        }
      }
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('FBO incomplete ' + st + ' ' + JSON.stringify(o.colors));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return out;
    };
    G.bind = function (f) {
      if (!f) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, G.W, G.H); return; }
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
      gl.viewport(0, 0, f.w, f.h);
    };
    // resolve MSAA fbo (all color attachments) into single-sample fbo with same layout
    G.resolve = function (src, dst) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src.fb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst.fb);
      for (let i = 0; i < src.colors.length; i++) {
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + i);
        const db = dst.colors.map((_, j) => (j === i ? gl.COLOR_ATTACHMENT0 + i : gl.NONE));
        gl.drawBuffers(db);
        gl.blitFramebuffer(0, 0, src.w, src.h, 0, 0, dst.w, dst.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      }
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst.fb);
      gl.drawBuffers(dst.drawBuffers);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    };

    // ---------- geometry ----------
    // Dynamic mesh: attribute layout [{name,size}], interleaved float data, optional indices
    G.mesh = function (prog, layout, opt) {
      opt = opt || {};
      const vao = gl.createVertexArray();
      const vbo = gl.createBuffer();
      const ibo = gl.createBuffer();
      const stride = layout.reduce((s, a) => s + a.size, 0);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      let off = 0;
      for (const a of layout) {
        const loc = prog.attrib(a.name);
        if (loc >= 0) {
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, a.size, gl.FLOAT, false, stride * 4, off * 4);
        }
        off += a.size;
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bindVertexArray(null);
      const m = { vao, vbo, ibo, stride, count: 0, icount: 0, mode: opt.mode || gl.TRIANGLES };
      m.setData = function (f32, idx) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, f32, gl.DYNAMIC_DRAW);
        m.count = f32.length / stride;
        if (idx) {
          gl.bindVertexArray(vao);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW);
          gl.bindVertexArray(null);
          m.icount = idx.length; m.itype = idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        } else m.icount = 0;
      };
      m.draw = function (mode) {
        gl.bindVertexArray(vao);
        if (m.icount) gl.drawElements(mode || m.mode, m.icount, m.itype, 0);
        else gl.drawArrays(mode || m.mode, 0, m.count);
        gl.bindVertexArray(null);
      };
      return m;
    };
    // Instanced quads: per-vertex corner (-1..1), per-instance attributes
    G.instanced = function (prog, layout) {
      const vao = gl.createVertexArray();
      const qb = gl.createBuffer();
      const ib = gl.createBuffer();
      const stride = layout.reduce((s, a) => s + a.size, 0);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, qb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const ql = prog.attrib('aCorner');
      gl.enableVertexAttribArray(ql);
      gl.vertexAttribPointer(ql, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, ib);
      let off = 0;
      for (const a of layout) {
        const loc = prog.attrib(a.name);
        if (loc >= 0) {
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, a.size, gl.FLOAT, false, stride * 4, off * 4);
          gl.vertexAttribDivisor(loc, 1);
        }
        off += a.size;
      }
      gl.bindVertexArray(null);
      const m = { vao, ib, stride, count: 0 };
      m.setData = function (f32, count) {
        gl.bindBuffer(gl.ARRAY_BUFFER, ib);
        gl.bufferData(gl.ARRAY_BUFFER, f32, gl.DYNAMIC_DRAW);
        m.count = count === undefined ? f32.length / stride : count;
      };
      m.draw = function () {
        if (!m.count) return;
        gl.bindVertexArray(vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, m.count);
        gl.bindVertexArray(null);
      };
      return m;
    };
    // fullscreen triangle
    const fsVao = gl.createVertexArray();
    G.fullscreen = function () { gl.bindVertexArray(fsVao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); };
    G.FS_VS = `
      out vec2 vUv;
      void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;

    // ---------- shared noise texture ----------
    const N = 256, nd = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N * 4; i++) nd[i] = SW.hash32(i * 7919 + 17) & 255;
    G.noiseTex = G.texture({ w: N, h: N, data: nd, filter: 'nearest', wrap: 'repeat' });

    // blend helpers
    G.blend = function (mode) {
      if (!mode) { gl.disable(gl.BLEND); return; }
      gl.enable(gl.BLEND);
      if (mode === 'premult') gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else if (mode === 'alpha') gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else if (mode === 'add') gl.blendFunc(gl.ONE, gl.ONE);
      else if (mode === 'max') { gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE); return; }
      gl.blendEquation(gl.FUNC_ADD);
    };
    return G;
  }

  SW.GL = GL;
  SW.GLSL_COMMON = GLSL_COMMON;
})(window.SW = window.SW || {});
