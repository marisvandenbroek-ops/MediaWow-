const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const d = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo-wit.png')).toString('base64');
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap';
const W = 1080, H = 1350, N = 4;
const E = 'iets nieuw' + 'e'.repeat(160);
const wave = `M150,800 L760,800 C960,800 1000,520 1180,420 C1400,300 1500,980 1800,1000 C2100,1020 2150,420 2450,380 C2750,340 2850,980 3050,900 C3180,850 3200,660 3300,660 L3420,660`;
const card = (f, x, y, w, r) => `<img src="${d(f)}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;transform:rotate(${r}deg);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.45)">`;
const X = 3 * W;
const html = `<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>
*{margin:0;padding:0}body{width:${W * N}px;height:${H}px;background:#3A1011;position:relative;overflow:hidden;font-family:'Playfair Display';color:#FAF4ED}
.logo{position:absolute;bottom:70px;width:170px;opacity:.75}
</style></head><body>
<div style="position:absolute;left:150px;top:575px;font-size:96px;font-weight:600;line-height:1">Het is tijd voor</div>
<svg width="${W * N}" height="${H}" style="position:absolute;left:0;top:0"><path id="p" d="${wave}" fill="none"/>
<text font-family="Playfair Display" font-weight="600" font-size="130" fill="#FAF4ED" letter-spacing="2"><textPath href="#p">${E}</textPath></text></svg>
${card('brave.jpg', X + 60, 110, 440, -6)}
${card('lilou.jpg', X + 560, 90, 440, 5)}
${card('browz.jpg', X + 40, 980, 400, 4)}
${card('luvely.jpg', X + 480, 930, 190, -5)}
${card('minkman.jpg', X + 700, 1000, 360, -4)}
<div style="position:absolute;left:${X + 230}px;top:588px;font-size:84px;line-height:1.05;font-weight:400">een website<br>waar je <i style="color:#E8F27A">trots</i><br>op bent.</div>
${[0, 1, 2].map(i => `<img class="logo" src="${LOGO}" style="left:${i * W + W / 2 - 85}px">`).join('')}
</body></html>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W * N, height: H } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  for (let i = 0; i < N; i++) await p.screenshot({ path: path.join(__dirname, `slide-0${i + 1}.jpg`), type: 'jpeg', quality: 92, clip: { x: i * W, y: 0, width: W, height: H } });
  await p.screenshot({ path: path.join(__dirname, 'panorama.jpg'), type: 'jpeg', quality: 80 });
  await b.close();
})();
