const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const img = f => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(A, f)).toString('base64');
const LOGO = img('logo-zwart.png');
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:wght@300;400;500;600&family=Caveat:wght@600&display=swap';
const css = `*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1350px;overflow:hidden;font-family:'DM Sans';color:#141414}
.s{position:relative;width:1080px;height:1350px;overflow:hidden;background:#E9E5DF}
.logo{height:46px;aspect-ratio:1058/244;-webkit-mask:url(${LOGO}) no-repeat center/contain}
h1{font-family:'Playfair Display';font-weight:400;letter-spacing:-.02em}
h1 em{font-style:italic}
.k{font-size:20px;letter-spacing:.32em;text-transform:uppercase;font-weight:500}
.mark{background:linear-gradient(transparent 55%,#E8F27A 55%,#E8F27A 92%,transparent 92%);padding:0 6px}
.hand{font-family:Caveat;font-size:46px;color:#141414}
.ghost{position:absolute;font-family:'Playfair Display';font-style:italic;color:rgba(255,255,255,.55);white-space:nowrap;line-height:1}
.pill{display:flex;align-items:center;gap:18px;background:#fff;border-radius:100px;padding:16px 28px 16px 16px;box-shadow:0 14px 40px rgba(0,0,0,.12);font-size:36px}
.pill .av{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#E9DCCD,#A88E78)}
.pill b{flex:1;font-weight:600}.pill b:after{content:'';display:inline-block;width:3px;height:36px;background:#141414;margin-left:6px;vertical-align:-6px}
.pill span{font-weight:600;color:#3B82F6;font-size:28px}
.M{position:absolute;top:56px;right:70px;font-family:'Playfair Display';font-size:110px;line-height:1;color:#E8F27A}`;
const pages = {
'insta-proef-1-website-check': `<div class="s">
  <img src="${img('canva/foto-157.jpg')}" style="position:absolute;left:0;top:0;width:100%;height:760px;object-fit:cover;object-position:50% 40%">
  <div class="ghost" style="left:-20px;top:520px;font-size:300px">gratis</div>
  <div class="logo" style="position:absolute;top:60px;left:70px;background:#fff"></div>
  <div style="position:absolute;left:70px;right:70px;top:800px">
    <div class="k" style="color:#6b6258">Gratis website-check</div>
    <h1 style="font-size:104px;line-height:1;margin-top:22px">Ik check jouw website. <em><span class="mark">Gratis.</span></em></h1>
    <div style="display:flex;align-items:center;gap:28px;margin-top:44px">
      <div class="pill" style="flex:1"><div class="av"></div><b>TIPS</b><span>Plaatsen</span></div>
    </div>
    <div class="hand" style="position:absolute;right:10px;top:-18px;transform:rotate(-6deg)">reageer hier ↓</div>
  </div></div>`,
'insta-proef-2-no-show': `<div class="s" style="background:#111">
  <img src="${img('canva/foto-067.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.92)">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 25%,rgba(0,0,0,0) 50%,rgba(0,0,0,.55) 100%)"></div>
  <div class="logo" style="position:absolute;top:60px;left:70px;background:#fff"></div>
  <div class="M">M</div>
  <div style="position:absolute;left:70px;right:70px;top:170px;color:#fff">
    <div class="k" style="opacity:.85">Voor horeca · zaterdagavond</div>
    <h1 style="font-size:96px;line-height:1;margin-top:20px">Tafel voor 4 om 19:30.<br><em>Niemand kwam.</em></h1>
  </div>
  <div style="position:absolute;left:470px;top:860px;transform:rotate(-4deg);background:#E8F27A;padding:16px 26px;box-shadow:0 10px 30px rgba(0,0,0,.25)">
    <div class="hand" style="font-size:44px">zo voorkom je dit →</div></div>
  <div class="k" style="position:absolute;left:70px;bottom:60px;color:#fff;opacity:.8">Swipe</div></div>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [n, h] of Object.entries(pages)) {
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>${css}</style></head><body>${h}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(__dirname, n + '.png') });
  }
  await b.close();
})();
