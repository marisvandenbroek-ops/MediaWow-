const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const img = f => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(A, f)).toString('base64');
const LOGO_W = img('logo-wit.png'), LOGO_Z = img('logo-zwart.png');
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=DM+Sans:wght@400;500&display=swap';
const css = (w, h) => `*{margin:0;padding:0;box-sizing:border-box}body{width:${w}px;height:${h}px;overflow:hidden;font-family:'DM Sans'}
.s{position:relative;width:${w}px;height:${h}px;overflow:hidden}
.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.logo{position:absolute;left:84px;top:${h > 1500 ? 200 : 80}px;width:210px}
h1{font-family:'Playfair Display';font-weight:400;letter-spacing:-.025em;line-height:1}
h1 em{font-style:italic}
.cta{display:inline-block;margin-top:44px;font-size:24px;letter-spacing:.24em;text-transform:uppercase;padding:26px 40px}
.sub{font-size:30px;line-height:1.4;margin-top:28px;opacity:.9}`;
const ads = {
  // 1 · bordeaux-foto, tas met telefoon
  'ad1-website-check': (w, h) => `<div class="s" style="background:#1B0405;color:#FAF4ED">
    <img class="ph" src="${img('bordeaux/tas-telefoon.jpg')}" style="object-position:50% 40%;filter:saturate(.32) sepia(.18) brightness(.72) contrast(1.1)">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,4,5,.5) 0%,rgba(27,4,5,0) 22%,rgba(27,4,5,0) 40%,rgba(27,4,5,.92) 100%)"></div>
    <img class="logo" src="${LOGO_W}">
    <div style="position:absolute;left:84px;right:84px;bottom:${h > 1500 ? 330 : 120}px">
      <h1 style="font-size:116px">Ik check jouw website. <em style="color:#E8F27A">Gratis.</em></h1>
      <div class="sub">3 persoonlijke tips in je DM.</div>
      <span class="cta" style="background:#E8F27A;color:#1B0405">Stuur ‘TIPS’ →</span>
    </div></div>`,
  // 2 · lichte foto, appjes
  'ad2-appjes': (w, h) => `<div class="s" style="background:#EFEDEA;color:#fff">
    <img class="ph" src="${img('canva/foto-157.jpg')}" style="filter:saturate(.85)">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.3) 0%,rgba(0,0,0,0) 20%,rgba(0,0,0,0) 40%,rgba(0,0,0,.65) 100%)"></div>
    <img class="logo" src="${LOGO_W}">
    <div style="position:absolute;left:84px;right:84px;bottom:${h > 1500 ? 330 : 120}px">
      <h1 style="font-size:104px">Steeds dezelfde vragen via de app? <em>Je website kan ze beantwoorden.</em></h1>
      <span class="cta" style="background:#FAF4ED;color:#3A1011">Gratis website-check →</span>
    </div></div>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [name, fn] of Object.entries(ads)) for (const [w, h, tag] of [[1080, 1350, '4x5'], [1080, 1920, '9x16']]) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>${css(w, h)}</style></head><body>${fn(w, h)}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, `${name}-${tag}.jpg`), type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
