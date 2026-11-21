const path = require('path');
const { serve } = require('./server');
const { launch, openPage } = require('./browser');
(async () => {
  const f = +(process.argv[2] || 600);
  const { srv, port } = await serve(path.resolve(__dirname, '..'));
  const browser = await launch();
  const page = await openPage(browser, `http://127.0.0.1:${port}/film.html`);
  const r = await page.evaluate((f) => {
    const gl = FILM.gl; const px = new Uint8Array(4);
    const sync = () => { const fb = gl.createFramebuffer(); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px); };
    const time = (fn) => { sync(); const t0 = performance.now(); fn(); gl.flush(); sync(); return Math.round(performance.now() - t0); };
    const out = {};
    FILM.renderFrame(f);
    // capture last cloud draw args
    let args = null; const crd = FILM.CR.draw; FILM.CR.draw = function () { args = args || []; args.push(arguments); };
    FILM.renderFrame(f);
    FILM.CR.draw = crd;
    const P = FILM.P, G = FILM.G;
    const drawAll = () => { for (const a of args) crd.apply(null, a); };
    out.msaaBoth = time(() => { G.bind(P.main); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); drawAll(); });
    out.msaaOne = time(() => { G.bind(P.main); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]); drawAll(); });
    const ss = G.fbo({ w: 1920, h: 1080, colors: ['rgba16f', 'rgba16f'], depth: true });
    out.singleBoth = time(() => { G.bind(ss); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); drawAll(); });
    out.singleOne = time(() => { G.bind(ss); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]); drawAll(); });
    const s8 = G.fbo({ w: 1920, h: 1080, colors: ['rgba8'], depth: true });
    
    const half = G.fbo({ w: 960, h: 540, colors: ['rgba16f'], depth: true });
    out.half16 = time(() => { G.bind(half); drawAll(); });
    out.npuffs = args.map(a => a[0].length);
    return out;
  }, f);
  console.log(JSON.stringify(r));
  await browser.close(); srv.close();
})();
