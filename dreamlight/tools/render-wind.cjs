// node wind.cjs out.png t   (or out.mp4 seconds for a clip)
const { chromium } = require('playwright'); const fs = require('fs'); const { spawn } = require('child_process');
(async () => {
  const D = require('path').join(__dirname, '..') + '/', [out, arg] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('about:blank'); for (const s of ['paint.js', 'wind.js']) await p.addScriptTag({ path: D + s });
  await p.evaluate(() => { window.__c = document.createElement('canvas'); __c.width = 1280; __c.height = 720; window.__x = __c.getContext('2d'); });
  const frame = (t) => p.evaluate((t) => { try { WIND.render(__x, t); return __c.toDataURL('image/jpeg', 0.92); } catch (e) { return 'ERR ' + e.message + e.stack; } }, t);
  if (out.endsWith('.mp4')) {
    const secs = +arg, ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '12', '-c:v', 'mjpeg', '-i', '-', '-r', '24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < secs * 12; f++) { const u = await frame(f / 12); if (u.startsWith('ERR')) { console.log(u); break; } ff.stdin.write(Buffer.from(u.split(',')[1], 'base64')); }
    ff.stdin.end(); await new Promise(ok => ff.on('close', ok));
  } else { const t0 = Date.now(); const u = await frame(+(arg || 1.5)); if (u.startsWith('ERR')) console.log(u.slice(0, 500)); else fs.writeFileSync(out, Buffer.from(u.split(',')[1], 'base64')); console.log('ms', Date.now() - t0); }
  console.log(errs); await b.close();
})();
