// Render an explicit list of frames (full res) into a folder, sorted, 2 workers.
const fs = require('fs'), path = require('path');
const { serve } = require('./server');
const { launch, openPage } = require('./browser');
const [out, list] = [process.argv[2], process.argv[3].split(/[ ,]+/).map(Number)];
fs.mkdirSync(out, { recursive: true });
(async () => {
  const { srv, port } = await serve(path.resolve(__dirname, '..'));
  const half = Math.ceil(list.length / 2);
  await Promise.all([list.slice(0, half), list.slice(half)].map(async (mine) => {
    const browser = await launch();
    const page = await openPage(browser, `http://127.0.0.1:${port}/film.html`);
    for (const f of mine) {
      const url = await page.evaluate(async (f) => { FILM.renderFrame(f); return document.getElementById('c').toDataURL('image/png'); }, f);
      fs.writeFileSync(path.join(out, `frame_${String(f).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
    await browser.close();
  }));
  srv.close(); console.log('done', list.length);
})();
