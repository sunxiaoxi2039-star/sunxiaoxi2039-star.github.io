// Render one of the three "wind over a grassy hill" swatches.   node tools/render-swatch.cjs A|B|C [seconds|still-time] [out]
// With an .mp4 out (default out/swatch-<v>.mp4) it renders a clip; with .jpg/.png a single frame at the given time.
// Needs Playwright (Chromium, WebGL2 for A) and ffmpeg.
const { chromium } = require('playwright'); const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), V = (process.argv[2] || 'B').toUpperCase(), ARG = +(process.argv[3] || 4);
const OUT = process.argv[4] || path.join(ROOT, 'out', `swatch-${V}.mp4`), FPS = V === 'A' ? 24 : 12;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((ok) => server.listen(0, ok)); fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] }); const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.goto(`http://localhost:${server.address().port}/swatch.html?v=${V}&step`); await page.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  const grab = async (t) => Buffer.from((await page.evaluate((t) => window.__frame(t), t)).split(',')[1], 'base64');
  if (!OUT.endsWith('.mp4')) { fs.writeFileSync(OUT, await grab(ARG)); console.log('->', OUT); }
  else {
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-r', '24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(ARG * FPS);
    for (let f = 0; f < n; f++) { const b = await grab(f / FPS); if (!ff.stdin.write(b)) await new Promise((ok) => ff.stdin.once('drain', ok)); }
    ff.stdin.end(); await new Promise((ok) => ff.on('close', ok)); console.log('->', OUT);
  }
  await browser.close(); server.close();
})();
