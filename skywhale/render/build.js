// Build self-contained scene pages: every engine/scene script and the timeline are inlined into a
// single HTML file per movement (plus one for the whole film). Each page renders deterministically
// to a canvas and has a small player (play / pause / scrub / step). No external files needed.
// usage: node build.js
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const film = fs.readFileSync(path.join(root, 'film.html'), 'utf8');
const scripts = [...film.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const timeline = JSON.parse(fs.readFileSync(path.join(root, 'timeline.json'), 'utf8'));
const code = scripts.map((s) => `/* ---- ${s} ---- */\n` + fs.readFileSync(path.join(root, s), 'utf8')).join('\n');
const outDir = path.join(root, 'scenes');
fs.mkdirSync(outDir, { recursive: true });

const pages = timeline.movements.map((m, i) => ({ file: `${i + 1}-${m.name.split(':')[0].toLowerCase()}.html`, title: `Sky Whale — ${m.id}. ${m.name}`, start: m.startFrame, end: m.endFrame }));
pages.push({ file: 'film.html', title: 'Sky Whale — the full film', start: 0, end: timeline.totalFrames });

const page = (p) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title}</title>
<style>
  :root { --bg:#0d0f18; --fg:#e9e4d8; --dim:#8d8a9e; --acc:#f2b27a; }
  html,body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.4 Georgia, 'Times New Roman', serif; }
  main { max-width:1280px; margin:0 auto; padding:16px; }
  canvas { width:100%; height:auto; display:block; background:#000; border-radius:4px; }
  .bar { display:flex; gap:10px; align-items:center; margin-top:10px; flex-wrap:wrap; }
  button { background:#1d2133; color:var(--fg); border:1px solid #333a55; border-radius:4px; padding:6px 12px; font:inherit; cursor:pointer; }
  input[type=range] { flex:1; min-width:160px; accent-color:var(--acc); }
  .meta { color:var(--dim); font-size:13px; }
  h1 { font-weight:normal; font-size:20px; letter-spacing:.06em; margin:4px 0 12px; }
</style></head>
<body><main>
<h1>${p.title}</h1>
<canvas id="c" width="1920" height="1080"></canvas>
<div class="bar">
  <button id="play">Play</button><button id="prev">&#9664;</button><button id="next">&#9654;</button>
  <input id="scrub" type="range" min="${p.start}" max="${p.end - 1}" value="${p.start}">
  <span class="meta" id="info"></span>
</div>
<p class="meta">Every frame is drawn in code and rendered deterministically to this canvas (WebGL2). Playback runs as fast as your GPU allows; the film itself is rendered offline at 1920&times;1080, 48 fps.</p>
</main>
<script>window.SW_TIMELINE = ${JSON.stringify(timeline)};</script>
<script>
${code}
</script>
<script>
(function(){
  const cv = document.getElementById('c');
  SW.FRAME_W = cv.width; SW.FRAME_H = cv.height;
  const film = SW.Film(cv, window.SW_TIMELINE);
  window.FILM = film;
  const S = ${p.start}, E = ${p.end};
  let f = S, playing = false, last = 0;
  const info = document.getElementById('info'), scrub = document.getElementById('scrub'), play = document.getElementById('play');
  function show(n){ f = Math.max(S, Math.min(E - 1, n)); film.renderFrame(f); scrub.value = f; const sh = film.shotAt(f); info.textContent = 'frame ' + f + '  ·  ' + (f/48).toFixed(2) + ' s  ·  shot ' + sh.id; }
  function tick(ts){ if (!playing) return; const due = Math.max(1, Math.round((ts - last) / (1000/48))); last = ts; show(f + 1 >= E ? S : f + Math.min(due, 4)); requestAnimationFrame(tick); }
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; if (playing) { last = performance.now(); requestAnimationFrame(tick); } };
  document.getElementById('prev').onclick = () => show(f - 1);
  document.getElementById('next').onclick = () => show(f + 1);
  scrub.oninput = () => show(+scrub.value);
  window.SW_READY = true;
  show(S);
})();
</script>
</body></html>`;

for (const p of pages) {
  fs.writeFileSync(path.join(outDir, p.file), page(p));
  console.log('wrote scenes/' + p.file, (fs.statSync(path.join(outDir, p.file)).size / 1024).toFixed(0) + ' KB');
}
