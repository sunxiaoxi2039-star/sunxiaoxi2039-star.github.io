// Evaluate a JS expression inside the film page (after init). usage: node evalpage.js "<expr>"
const path = require('path');
const { serve } = require('./server');
const { launch, openPage } = require('./browser');
(async () => {
  const { srv, port } = await serve(path.resolve(__dirname, '..'));
  const browser = await launch();
  const page = await openPage(browser, `http://127.0.0.1:${port}/${process.argv[3] || 'film.html'}`);
  const r = await page.evaluate(process.argv[2]);
  console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 0));
  await browser.close(); srv.close();
})();
