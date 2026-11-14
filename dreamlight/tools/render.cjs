// Render episodes to MP4 (1280x720, 24fps, with the procedural score).
//   node tools/render.cjs            -> all five episodes into out/
//   node tools/render.cjs 3          -> only episode 3
// Needs Playwright (Chromium) and ffmpeg. Frames are produced by the same
// engine.js the web player uses, so the video matches the page exactly.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'out'), FPS = +(process.env.FPS || 24);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });

(async () => {
  await new Promise((ok) => server.listen(0, ok)); fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:${server.address().port}/index.html`); await page.evaluate(() => window.__ready);
  const only = process.argv[2] ? [+process.argv[2]] : [1, 2, 3, 4, 5];
  for (const n of only) {
    const dur = await page.evaluate((n) => DL.epDuration(DREAMLIGHT.episodes[n - 1]), n);
    const wav = path.join(OUT, `ep${n}.wav`); fs.writeFileSync(wav, Buffer.from(await page.evaluate((n) => DL.renderEpisodeAudioWav(DREAMLIGHT.episodes[n - 1]), n), 'base64'));
    const mp4 = path.join(OUT, `ep${n}.mp4`);
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', wav, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    const frames = Math.ceil(dur * FPS);
    await page.evaluate(() => { window.__c = document.createElement('canvas'); __c.width = 1280; __c.height = 720; window.__x = __c.getContext('2d'); });
    for (let f = 0; f < frames; f += 12) {
      const batch = await page.evaluate(([n, f0, k, fps]) => { const ep = DREAMLIGHT.episodes[n - 1], out = []; for (let f = f0; f < f0 + k; f++) { DL.renderEpisode(__x, ep, f / fps); out.push(__c.toDataURL('image/jpeg', 0.92).split(',')[1]); } return out; }, [n, f, Math.min(12, frames - f), FPS]);
      for (const b of batch) if (!ff.stdin.write(Buffer.from(b, 'base64'))) await new Promise((ok) => ff.stdin.once('drain', ok));
      process.stdout.write(`\rep${n} ${Math.min(f + 12, frames)}/${frames}`);
    }
    ff.stdin.end(); await new Promise((ok) => ff.on('close', ok)); fs.unlinkSync(wav);
    console.log(`\n-> ${path.relative(ROOT, mp4)} (${dur}s)`);
  }
  await browser.close(); server.close();
})();
