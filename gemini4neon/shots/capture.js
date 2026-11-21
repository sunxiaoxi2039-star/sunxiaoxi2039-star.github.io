// Render frames deterministically and pipe them to ffmpeg (or save stills).
// node capture.js stills 0,5,12 out_dir     -> PNG stills at given seconds
// node capture.js video out.mp4 [from] [to] -> MJPEG frames piped into ffmpeg (video only)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = __dirname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.m4a': 'audio/mp4' };

(async () => {
  const [mode, a1, a2, a3, a4] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.route('http://reel.local/**', async r => {
    const p = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) return r.fulfill({ status: 404, body: 'nf' });
    r.fulfill({ status: 200, contentType: TYPES[path.extname(p)] || 'application/octet-stream', body: fs.readFileSync(p) });
  });
  await page.goto('http://reel.local/live.html?capture');
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  const stage = await page.$('#stage');
  const shot = async (t, opts) => { await page.evaluate(t => window.renderAt(t), t); return stage.screenshot(opts); };

  if (mode === 'stills') {
    const out = a2; fs.mkdirSync(out, { recursive: true });
    for (const t of a1.split(',').map(Number)) {
      const t0 = Date.now(); const buf = await shot(t, { type: 'jpeg', quality: 90 });
      fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.jpg`), buf); console.log('t', t, 'ms', Date.now() - t0);
    }
  } else if (mode === 'video') {
    const TL = await page.evaluate(() => window.TL);
    const fps = TL.fps, from = a2 ? parseFloat(a2) : 0, to = a3 ? parseFloat(a3) : TL.duration;
    const n = Math.round((to - from) * fps);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', a1], { stdio: ['pipe', 'inherit', 'inherit'] });
    const start = Date.now();
    for (let i = 0; i < n; i++) {
      const t = from + i / fps;
      const buf = await shot(t, { type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 30 === 0) { const el = (Date.now() - start) / 1000; console.log(`frame ${i}/${n} t=${t.toFixed(2)} elapsed ${el.toFixed(0)}s eta ${(el / (i + 1) * (n - i - 1)).toFixed(0)}s`); }
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log('done', a1, ((Date.now() - start) / 1000).toFixed(0) + 's');
  }
  await browser.close();
})();
