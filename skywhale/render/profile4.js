const path = require('path');
const { serve } = require('./server');
const { launch, openPage } = require('./browser');
(async () => {
  const f = +(process.argv[2] || 600);
  const { srv, port } = await serve(path.resolve(__dirname, '..'));
  const browser = await launch();
  const page = await openPage(browser, `http://127.0.0.1:${port}/film.html`);
  const r = await page.evaluate((f) => {
    const gl = FILM.gl, G = FILM.G, P = FILM.P; const px = new Uint8Array(4);
    const sync = () => { G.bind(P.qa); gl.readPixels(0,0,1,1,gl.RGBA,gl.FLOAT,new Float32Array(4)); };
    const time = (fn) => { sync(); const t0 = performance.now(); fn(); sync(); return Math.round(performance.now() - t0); };
    FILM.renderFrame(f);
    let args = []; const crd = FILM.CR.draw; FILM.CR.draw = function () { args.push(arguments); };
    FILM.renderFrame(f); FILM.CR.draw = crd;
    const a0 = args[0];
    const out = {};
    const full = G.fbo({ w: 1920, h: 1080, colors: ['rgba16f'] });
    const half = G.fbo({ w: 960, h: 540, colors: ['rgba16f'] });
    out.fullNoChar = time(() => { G.bind(full); crd(a0[0], a0[1], a0[2], a0[3], {}); });
    out.fullChar = time(() => { G.bind(full); crd(a0[0], a0[1], a0[2], a0[3], { charDepth: P.pre.colors[0], mode: 1 }); });
    out.halfNoChar = time(() => { G.bind(half); crd(a0[0], a0[1], a0[2], a0[3], {}); });
    // trivial shader test
    const prog = FILM.CR.prog;
    const triv = G.program('triv', `in vec2 aCorner; in vec4 aA; uniform mat4 uViewProj; uniform vec3 uCamRight; uniform vec3 uCamUp; out vec2 vQ; void main(){ vec3 p = aA.xyz + uCamRight*aCorner.x*aA.w + uCamUp*aCorner.y*aA.w; gl_Position = uViewProj*vec4(p,1.0); vQ = aCorner; }`,
      `in vec2 vQ; layout(location=0) out vec4 o; void main(){ float r = length(vQ); if (r > 1.0) discard; o = vec4(0.5,0.5,0.5,1.0)*0.5; }`);
    const inst = G.instanced(triv, [{ name: 'aA', size: 4 }, { name: 'aB', size: 4 }, { name: 'aC', size: 4 }, { name: 'aD', size: 4 }]);
    const puffs = a0[0], d = new Float32Array(puffs.length * 16); puffs.forEach((q, i) => { d[i*16]=q.p[0]; d[i*16+1]=q.p[1]; d[i*16+2]=q.p[2]; d[i*16+3]=q.al>0.002?q.r*(q.st<1?Math.sqrt(q.st):1):0; });
    inst.setData(d, puffs.length);
    const cam = a0[1];
    out.trivialFull = time(() => { G.bind(full); triv.use({ uViewProj: cam.viewProj, uCamRight: cam.right, uCamUp: cam.upv }); G.blend('premult'); gl.disable(gl.DEPTH_TEST); inst.draw(); G.blend(null); });
    return out;
  }, f);
  console.log(JSON.stringify(r));
  await browser.close(); srv.close();
})();
