// Minimal static file server for rendering (serves the skywhale/ folder).
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
function serve(root, port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const p = path.join(root, u === '/' ? '/index.html' : u);
      if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    srv.listen(port || 0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}
module.exports = { serve };
