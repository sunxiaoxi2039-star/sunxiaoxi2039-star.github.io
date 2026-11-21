// Render one or more views from a dev/scene page to PNG.
// usage: node shoot.js <page.html> <fn> <out.png> [jsonArgs]
const fs = require('fs'), path = require('path');
const { serve } = require('./server');
const { launch, openPage } = require('./browser');
(async () => {
  const [pageFile, fn, out, argJson] = process.argv.slice(2);
  const root = path.resolve(__dirname, '..');
  const { srv, port } = await serve(root);
  const browser = await launch();
  try {
    const page = await openPage(browser, `http://127.0.0.1:${port}/${pageFile}`);
    const t0 = Date.now();
    const url = await page.evaluate(async ([fn, a]) => await window.SWAPI[fn](a ? JSON.parse(a) : {}), [fn, argJson || '']);
    const ms = Date.now() - t0;
    const outs = Array.isArray(url) ? url : [url];
    outs.forEach((u, i) => {
      const f = outs.length > 1 ? out.replace(/\.png$/, `_${String(i).padStart(3, '0')}.png`) : out;
      fs.writeFileSync(f, Buffer.from(u.split(',')[1], 'base64'));
    });
    console.log(`ok ${outs.length} image(s) in ${ms} ms -> ${out}`);
  } catch (e) { console.error(e); process.exitCode = 1; }
  await browser.close(); srv.close();
})();
