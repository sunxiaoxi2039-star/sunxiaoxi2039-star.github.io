// Profile a frame: sim time, stage time, puff count
const path = require('path');
const { serve } = require('./server');
const { launch, openPage } = require('./browser');
(async () => {
  const frames = JSON.parse(process.argv[2] || '[600]');
  const { srv, port } = await serve(path.resolve(__dirname, '..'));
  const browser = await launch();
  const page = await openPage(browser, `http://127.0.0.1:${port}/film.html`);
  for (const f of frames) {
    const r = await page.evaluate((f) => {
      const t0 = performance.now(); FILM.renderFrame(f); const gl = FILM.gl; const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t1 = performance.now(); FILM.renderFrame(f); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t2 = performance.now();
      const shot = FILM.shotAt(f); const S = FILM.cache[shot.id];
      return { first: Math.round(t1 - t0), again: Math.round(t2 - t1), puffs: S && S.puffs ? S.puffs.length : 0 };
    }, f);
    console.log(f, JSON.stringify(r));
  }
  await browser.close(); srv.close();
})();
