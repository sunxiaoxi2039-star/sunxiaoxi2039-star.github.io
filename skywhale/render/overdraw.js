const path = require('path');
const { serve } = require('./server');
const { launch, openPage } = require('./browser');
(async () => {
  const f = +(process.argv[2] || 600);
  const { srv, port } = await serve(path.resolve(__dirname, '..'));
  const browser = await launch();
  const page = await openPage(browser, `http://127.0.0.1:${port}/film.html`);
  const r = await page.evaluate((f) => {
    let args = null; const crd = FILM.CR.draw; FILM.CR.draw = function () { args = args || []; args.push(arguments); };
    FILM.renderFrame(f); FILM.CR.draw = crd;
    const [puffs, cam] = args[0];
    let tot = 0, byLayer = {}, bigs = 0;
    for (const q of puffs) {
      const dep = SW.v3.dot(SW.v3.sub(q.p, cam.pos), cam.fwd);
      if (dep < 1) continue;
      const sp = cam.project(q.p);
      const rp = q.r * 1.08 * cam.pxPerRad / dep * (q.st || 1);
      if (sp[0] + rp < 0 || sp[0] - rp > 1920 || sp[1] + rp < 0 || sp[1] - rp > 1080) continue;
      const w = Math.min(1920, sp[0] + rp) - Math.max(0, sp[0] - rp), h = Math.min(1080, sp[1] + rp) - Math.max(0, sp[1] - rp);
      const a = Math.max(0, w) * Math.max(0, h);
      tot += a; const k = (q.layer || 0) + '/' + (q.lvl || 0); byLayer[k] = (byLayer[k] || 0) + a;
      if (rp > 150) bigs++;
    }
    for (const k in byLayer) byLayer[k] = Math.round(byLayer[k] / 1e6 * 10) / 10;
    return { totalMpx: Math.round(tot / 1e6), byLayer, bigs, n: puffs.length };
  }, f);
  console.log(JSON.stringify(r));
  await browser.close(); srv.close();
})();
