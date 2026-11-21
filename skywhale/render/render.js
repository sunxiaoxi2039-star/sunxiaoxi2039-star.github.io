// Render film frames to PNG with parallel headless-Chromium workers (each renders a contiguous,
// sequential chunk so cloud simulations advance incrementally). Resumable: existing PNGs are skipped.
// usage: node render.js --out DIR [--start 0] [--end 4805] [--step 1] [--workers 2] [--w 1920 --h 1080] [--for SECONDS]
// (--for: stop starting new frames after that many seconds and exit cleanly; rerun to resume)
const fs = require('fs'), path = require('path');
const { serve } = require('./server');
const { launch, openPage } = require('./browser');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const out = path.resolve(args.out || 'frames');
const start = +(args.start || 0), end = +(args.end || 4805), step = +(args.step || 1), workers = +(args.workers || 2);
const W = +(args.w || 1920), H = +(args.h || 1080);
const deadline = args.for ? Date.now() + 1000 * +args.for : 0;
fs.mkdirSync(out, { recursive: true });
const all = []; for (let f = start; f < end; f += step) all.push(f);
const todo = all.filter((f) => !fs.existsSync(path.join(out, `frame_${String(f).padStart(5, '0')}.png`)));
console.log(`${todo.length}/${all.length} frames to render with ${workers} workers -> ${out}`);
(async () => {
  const { srv, port } = await serve(path.resolve(__dirname, '..'));
  const chunk = Math.ceil(todo.length / workers);
  const t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, wi) => {
    const mine = todo.slice(wi * chunk, (wi + 1) * chunk);
    if (!mine.length) return;
    const browser = await launch();
    const page = await openPage(browser, `http://127.0.0.1:${port}/film.html?w=${W}&h=${H}`, W, H);
    for (const f of mine) {
      if (deadline && Date.now() > deadline) break;
      const url = await page.evaluate(async (f) => { FILM.renderFrame(f); return document.getElementById('c').toDataURL('image/png'); }, f);
      fs.writeFileSync(path.join(out, `frame_${String(f).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
      done++;
      if (done % 20 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${todo.length}  ${(el / done).toFixed(2)} s/frame  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`); }
    }
    await browser.close();
  }));
  srv.close();
  console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
})();
