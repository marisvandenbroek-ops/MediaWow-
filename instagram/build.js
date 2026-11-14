// Renders the week-1 Instagram slides (1080x1350, 4:5) to PNG.
// Usage: node build.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const posts = require('./week-1/posts.json');

const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Caveat:wght@500&family=Inter:wght@400;500;600&display=swap';

// *text* -> italic serif accent, _text_ -> handwritten accent
const fmt = (s = '') => s
  .replace(/\*(.+?)\*/g, '<em>$1</em>')
  .replace(/_(.+?)_/g, '<span class="hand">$1</span>')
  .replace(/\n/g, '<br>');

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
.s{width:1080px;height:1350px;position:relative;padding:120px 110px 150px;display:flex;flex-direction:column;
  font-family:Inter,sans-serif;overflow:hidden;justify-content:center}
.light{background:#F4F0EA;color:#161514}
.sand{background:#E4DACD;color:#161514}
.dark{background:#161514;color:#F4F0EA}
.mark{position:absolute;top:70px;right:96px;width:46px;height:3px;background:#C9E265}
.label{font-size:24px;letter-spacing:.28em;text-transform:uppercase;font-weight:500;opacity:.7;margin-bottom:46px}
h1{font-family:'Playfair Display',serif;font-weight:400;font-size:104px;line-height:1.02;letter-spacing:-.02em}
h2{font-family:'Playfair Display',serif;font-weight:400;font-size:78px;line-height:1.06;letter-spacing:-.015em}
em{font-style:italic}
.hand{font-family:Caveat,cursive;font-size:1.05em;color:#8C7660}
.dark .hand{color:#C9E265}
.sub{font-size:36px;line-height:1.45;margin-top:50px;opacity:.85;max-width:820px}
.body{font-size:38px;line-height:1.5;margin-top:44px;opacity:.88;max-width:840px}
.num{font-family:'Playfair Display',serif;font-style:italic;font-size:150px;line-height:1;color:#8C7660;margin-bottom:30px}
.dark .num{color:#C9E265}
.tip{margin-top:auto;border-top:2px solid currentColor;padding-top:34px;font-size:34px;line-height:1.45;display:flex;gap:22px}
.tip b{font-weight:600;letter-spacing:.18em;text-transform:uppercase;font-size:24px;padding-top:8px;white-space:nowrap}
ul{list-style:none;margin-top:56px}
li{font-size:40px;line-height:1.35;padding:28px 0;border-bottom:1.5px solid rgba(128,118,104,.45);display:flex;gap:28px}
li:before{content:'';flex:0 0 14px;height:14px;margin-top:17px;border-radius:50%;background:#8C7660}
.dark li:before{background:#C9E265}
.center{justify-content:center}
.quote h1{font-size:96px}
.btn{margin-top:60px;align-self:flex-start;border:2px solid currentColor;border-radius:100px;padding:26px 46px;font-size:32px;font-weight:500;letter-spacing:.04em}
.dark .btn{background:#F4F0EA;color:#161514;border-color:#F4F0EA}
.price{font-family:'Playfair Display',serif;font-size:150px;line-height:1;margin-top:36px;letter-spacing:-.03em}
.foot{position:absolute;left:110px;right:110px;bottom:64px;display:flex;justify-content:space-between;align-items:center;
  font-size:24px;letter-spacing:.14em;text-transform:uppercase;opacity:.7}
.foot .h{text-transform:none;letter-spacing:.02em;font-weight:600;font-size:27px;opacity:1}
.swipe{position:absolute;right:110px;bottom:140px;font-size:28px;letter-spacing:.2em;text-transform:uppercase;opacity:.75}
`;

function slideHTML(sl, i, n) {
  let inner = '';
  switch (sl.type) {
    case 'cover':
      inner = `${sl.label ? `<div class="label">${sl.label}</div>` : ''}<h1>${fmt(sl.title)}</h1>${sl.sub ? `<div class="sub">${fmt(sl.sub)}</div>` : ''}`;
      break;
    case 'point':
      inner = `<div class="num">${sl.num}</div><h2>${fmt(sl.title)}</h2><div class="body">${fmt(sl.body)}</div>${sl.tip ? `<div class="tip"><b>Tip</b><span>${fmt(sl.tip)}</span></div>` : ''}`;
      break;
    case 'list':
      inner = `${sl.label ? `<div class="label">${sl.label}</div>` : ''}<h2>${fmt(sl.title)}</h2><ul>${sl.items.map(x => `<li><span>${fmt(x)}</span></li>`).join('')}</ul>${sl.body ? `<div class="body">${fmt(sl.body)}</div>` : ''}`;
      break;
    case 'text':
      inner = `${sl.label ? `<div class="label">${sl.label}</div>` : ''}<h2>${fmt(sl.title)}</h2><div class="body">${fmt(sl.body)}</div>`;
      break;
    case 'price':
      inner = `<div class="label">${sl.label}</div><h2>${fmt(sl.title)}</h2><div class="price">${sl.price}</div><div class="body">${fmt(sl.body)}</div>`;
      break;
    case 'cta':
      inner = `${sl.label ? `<div class="label">${sl.label}</div>` : ''}<h2>${fmt(sl.title)}</h2><div class="body">${fmt(sl.body)}</div><div class="btn">${sl.button}</div>`;
      break;
  }
  const cls = `s ${sl.theme || 'light'} ${sl.center ? 'center' : ''} ${sl.type === 'cover' && sl.quote ? 'quote' : ''}`;
  const count = n > 1 ? `${i + 1} / ${n}` : 'MediaWow webdesign';
  const swipe = n > 1 && i === 0 ? '<div class="swipe">Swipe →</div>' : '';
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head>
<body><div class="${cls}"><div class="mark"></div>${inner}${swipe}<div class="foot"><span class="h">@media.wow</span><span>${count}</span></div></div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const p of posts) {
    if (!p.slides) continue;
    const dir = path.join(__dirname, 'week-1', p.id);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < p.slides.length; i++) {
      await page.setContent(slideHTML(p.slides[i], i, p.slides.length), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(dir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
    }
    fs.writeFileSync(path.join(dir, 'caption.txt'), p.caption + '\n');
    console.log('rendered', p.id, p.slides.length);
  }
  await browser.close();
})();
