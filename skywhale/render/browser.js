// Launch headless Chromium with SwiftShader WebGL2 (deterministic CPU rendering).
const { chromium } = require('playwright');
async function launch() {
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--js-flags=--max-old-space-size=6144'] });
}
async function openPage(browser, url, w, h) {
  const page = await browser.newPage({ viewport: { width: w || 1920, height: h || 1080 }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { const t = m.text(); logs.push(t); if (m.type() === 'error' || /ERR|error/i.test(t)) console.error('[page]', t.slice(0, 2000)); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(url);
  await page.waitForFunction('window.SW_READY === true || window.SW_ERROR', null, { timeout: 600000 });
  const err = await page.evaluate('window.SW_ERROR');
  if (err) throw new Error('page init failed: ' + err);
  return page;
}
module.exports = { launch, openPage };
