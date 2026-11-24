// Rendert reel.html frame voor frame met Playwright.
//   node render.js stills 0 2.3 6.3 16   -> losse stills (still_<t>.jpg)
//   node render.js video                 -> frames/ (30 fps), daarna build.sh voor de mp4
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const mode = process.argv[2] || 'stills';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, 'reel.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const end = await page.evaluate(() => window.END);

  if (mode === 'stills') {
    const times = process.argv.slice(3).map(Number);
    for (const t of times.length ? times : [0, 2.3, 4.2, 6.3, 10, 12, 17]) {
      await page.evaluate((t) => render(t), t);
      await page.screenshot({ path: path.join(__dirname, `still_${t}.jpg`), type: 'jpeg', quality: 85 });
    }
  } else {
    const fps = 30, n = Math.round(end * fps), dir = path.join(__dirname, 'frames');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir);
    for (let i = 0; i < n; i++) {
      await page.evaluate((t) => render(t), i / fps);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
  }
  await browser.close();
})();
