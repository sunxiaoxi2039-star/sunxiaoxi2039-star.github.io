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
    const time = (fn) => { const t0 = performance.now(); fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return Math.round(performance.now() - t0); };
    const out = {};
    out.full = time(() => FILM.renderFrame(f));
    const crd = FILM.CR.draw; FILM.CR.draw = () => {};
    out.noClouds = time(() => FILM.renderFrame(f));
    FILM.CR.draw = crd;
    const wrd = FILM.WR.draw; FILM.WR.draw = () => ({});
    out.noWhale = time(() => FILM.renderFrame(f));
    FILM.WR.draw = wrd;
    const fin = FILM.P.finish; 
    out.finishOnly = time(() => FILM.P.finish(f, {}));
    const sk = FILM.SKY.draw;
    out.skyOnly = time(() => { FILM.P.beginMain(); FILM.SKY.draw({invViewProj: new Float32Array(16).fill(0.1), pos:[0,0,0]}, {zen:[0,0,0],up:[0,0,0],hor:[0,0,0],sunDir:[0,1,0]}, 0); });
    out.resolve = time(() => FILM.P.resolve());
    return out;
  }, f);
  console.log(JSON.stringify(r));
  await browser.close(); srv.close();
})();
