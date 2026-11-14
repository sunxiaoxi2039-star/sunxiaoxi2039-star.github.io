// A moving shot from the painted 3D world, to MP4.   node tools/render3d.cjs [seconds] [quality]
// Needs Playwright (Chromium, WebGL2) and ffmpeg. Frames come from world.js, the same code the page runs.
const { chromium } = require('playwright'); const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'out'), SECS = +(process.argv[2] || 5), Q = process.argv[3] || '1', FPS = 24;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((ok) => server.listen(0, ok)); fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:${server.address().port}/world.html?step&q=${Q}`); await page.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  const mp4 = path.join(OUT, 'world-shot.mp4');
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(SECS * FPS);
  for (let f = 0; f < frames; f++) {
    const b64 = await page.evaluate(([f, n, fps]) => {
      const W = window.__world, k = f / (n - 1), e = k * k * (3 - 2 * k), g = W.girl.position; if (f === 0) W.placeGirl(0, 0, -0.3);
      // a slow push in over her shoulder while the meadow moves in the wind
      W.camera.fov = 54; W.camera.position.set(g.x + 1.1 - 0.9 * e, g.y + 1.75 - 0.35 * e, g.z + 4.4 - 2.0 * e); W.camera.lookAt(g.x + 9.5, g.y - 3.4 + 0.6 * e, g.z - 30); W.camera.updateProjectionMatrix();
      W.girl.userData.head.rotation.y = Math.sin(f / fps * 0.9) * 0.18; W.render(f / fps); return document.getElementById('cv').toDataURL('image/jpeg', 0.93).split(',')[1];
    }, [f, frames, FPS]);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((ok) => ff.stdin.once('drain', ok));
    if (f % 12 === 0) console.log(`frame ${f}/${frames}`);
  }
  ff.stdin.end(); await new Promise((ok) => ff.on('close', ok)); console.log('-> out/world-shot.mp4'); await browser.close(); server.close();
})();
