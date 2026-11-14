const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const img = f => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(A, f)).toString('base64');
const LOGO = img('logo-zwart.png');
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap';
const css = `*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1350px;overflow:hidden;font-family:'DM Sans'}
.s{position:relative;width:1080px;height:1350px;overflow:hidden;background:#cfcac3}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.35) contrast(.88) brightness(1.02)}
.veil{position:absolute;inset:0}
.handle{position:absolute;top:64px;left:70px;font-size:20px;letter-spacing:.18em;text-transform:uppercase;opacity:.85}
.mid{position:absolute;left:80px;right:80px;top:50%;transform:translateY(-50%);text-align:center}
h1{font-family:'Instrument Serif';font-weight:400;font-size:104px;line-height:.98;letter-spacing:-.02em}
h1 em{font-style:italic;color:#F0DCD0}
.sub{margin-top:26px;font-size:24px;font-weight:300;opacity:.9}
.foot{position:absolute;left:70px;right:70px;bottom:56px;display:flex;justify-content:space-between;font-size:20px;letter-spacing:.2em;text-transform:uppercase;opacity:.85}
.foot span:before{display:inline-block;margin-right:10px}
.share:before{content:'➤'}.save:before{content:'⌑'}
.logo{aspect-ratio:1058/244;-webkit-mask:url(${LOGO}) no-repeat center/contain}
.sticker{position:absolute;left:50%;top:50%;width:330px;height:330px;margin:-165px 0 0 -165px;border-radius:50%;background:#3A1011;box-shadow:0 30px 60px rgba(0,0,0,.18),inset 0 0 0 1px rgba(0,0,0,.04);display:flex;align-items:center;justify-content:center}
.sticker .logo{width:230px;background:#FAF4ED}`;
const pages = {
  'zacht-1-quote': `<div class="s" style="color:#fff">
    <img class="bg" src="${img('canva/foto-157.jpg')}" style="object-position:50% 35%">
    <div class="veil" style="background:linear-gradient(180deg,rgba(58,16,17,.38),rgba(27,4,5,.55))"></div>
    <div class="handle">@media.wow</div>
    <div class="mid"><h1>Mooi is fijn. <em>Werken</em><br>is beter.</h1><div class="sub">— In de caption leg ik uit waarom je website allebei moet zijn</div></div>
    <div class="foot"><span class="share">Share</span><span class="save">Save</span></div></div>`,
  'zacht-2-quote-donker': `<div class="s" style="color:#fff">
    <img class="bg" src="${img('canva/foto-067.jpg')}" style="object-position:50% 50%">
    <div class="veil" style="background:linear-gradient(180deg,rgba(58,16,17,.45),rgba(27,4,5,.62))"></div>
    <div class="handle">@media.wow</div>
    <div class="mid"><h1>Een lege tafel <em>begint</em><br>op je website.</h1><div class="sub">— In de caption: 3 dingen die gasten zoeken vóór ze reserveren</div></div>
    <div class="foot"><span class="share">Share</span><span class="save">Save</span></div></div>`,
  'zacht-4-licht-bordeaux': `<div class="s" style="color:#3A1011">
    <img class="bg" src="${img('canva/foto-094.jpg')}" style="object-position:50% 70%;filter:saturate(.2) brightness(1.08)">
    <div class="veil" style="background:rgba(250,244,237,.55)"></div>
    <div class="handle">@media.wow</div>
    <div class="mid"><h1>Je klanten lezen niet. <em style="color:#8E1F27">Ze scannen.</em></h1><div class="sub">— In de caption: zo zet je het belangrijkste op de juiste plek</div></div>
    <div class="foot"><span class="share">Share</span><span class="save">Save</span></div></div>`,
  'zacht-3-adempauze': `<div class="s">
    <img class="bg" src="${img('canva/foto-094.jpg')}" style="object-position:50% 60%;filter:saturate(.25) brightness(1.05)">
    <div class="sticker"><div class="logo"></div></div></div>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [n, h] of Object.entries(pages)) {
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>${css}</style></head><body>${h}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(__dirname, n + '.png') });
  }
  await b.close();
})();
