const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const img = f => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(A, f)).toString('base64');
const LOGO = img('logo-zwart.png');
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap';
const base = `*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1350px;overflow:hidden;font-family:'DM Sans'}
.s{position:relative;width:1080px;height:1350px;overflow:hidden}
.logo{height:52px;aspect-ratio:1058/244;-webkit-mask:url(${LOGO}) no-repeat center/contain}
h1{font-family:'Instrument Serif';font-weight:400;letter-spacing:-.015em}
.k{font-size:22px;letter-spacing:.42em;text-transform:uppercase}`;
const pages = {
  'proef-A-fullscreen-horeca': `<div class="s" style="color:#FAF4ED">
    <img src="${img('mw-home-lilou-interieur-1.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.05) contrast(1.05)">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,4,5,.55) 0%,rgba(27,4,5,0) 22%,rgba(27,4,5,0) 48%,rgba(27,4,5,.85) 82%,rgba(27,4,5,.95) 100%)"></div>
    <div class="logo" style="position:absolute;top:70px;left:90px;background:#FAF4ED"></div>
    <div class="k" style="position:absolute;top:86px;right:90px;opacity:.8">Voor horeca</div>
    <div style="position:absolute;left:90px;right:90px;bottom:120px">
      <h1 style="font-size:118px;line-height:.95">Je zaak voelt zo.<br><em style="color:#E9D6C8">Je website ook?</em></h1>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:50px;padding-top:28px;border-top:1px solid rgba(250,244,237,.3)">
        <span class="k" style="opacity:.75">Swipe voor 3 checks</span><span class="k" style="opacity:.75">→</span></div>
    </div></div>`,
  'proef-B-fullscreen-salon': `<div class="s" style="color:#3A1011;background:#EDE6DC">
    <img src="${img('mw-mockup-luvely-1-2.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 0%">
    <div class="logo" style="position:absolute;top:70px;left:90px;background:#3A1011"></div>
    <div class="k" style="position:absolute;top:86px;right:90px;color:#7A5A5A">Voor salons</div>
    <div style="position:absolute;left:60px;right:60px;top:175px;text-align:center">
      <h1 style="font-size:100px;line-height:.95">Je werk is <em style="color:#561C1E">prachtig.</em></h1>
      <p style="font-size:34px;line-height:1.4;margin-top:16px;font-weight:300;color:#3A1011">Laat je website dat ook zien.</p>
    </div>
    <div class="k" style="position:absolute;left:90px;bottom:70px;color:#3A1011;opacity:.7">Swipe →</div></div>`,
  'proef-C-daily-reminder': `<div class="s" style="background:#F1ECE4;color:#1B0405">
    <div style="position:absolute;left:-40px;right:-40px;bottom:-70px;text-align:center;font-family:'Instrument Serif';font-style:italic;font-size:400px;line-height:1;color:rgba(58,16,17,.07);white-space:nowrap">boek nu</div>
    <div class="logo" style="position:absolute;top:70px;left:50%;margin-left:-113px;background:#1B0405"></div>
    <div class="k" style="position:absolute;top:220px;width:100%;text-align:center;color:#7A5A5A">Daily reminder</div>
    <h1 style="position:absolute;top:300px;left:110px;right:110px;text-align:center;font-size:96px;line-height:1">Een website zonder <em style="color:#561C1E">boekknop</em> is als een salon zonder voordeur.</h1>
    <p style="position:absolute;top:720px;width:100%;text-align:center;font-size:32px;font-weight:300;color:#3A1011">Ze willen wel binnenkomen. Ze vinden alleen de deur niet.</p>
    <div style="position:absolute;top:850px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:0">
      <div style="background:#3A1011;color:#FAF4ED;font-size:30px;letter-spacing:.38em;text-transform:uppercase;padding:38px 70px;box-shadow:0 30px 60px rgba(58,16,17,.3)">Boek nu</div>
    </div>
    <svg style="position:absolute;top:900px;left:640px;width:110px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.25))" viewBox="0 0 24 24"><path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z" fill="#FAF4ED" stroke="#1B0405" stroke-width=".6"/></svg>
    <div class="k" style="position:absolute;bottom:64px;width:100%;text-align:center;color:#7A5A5A;font-size:20px">@media.wow</div></div>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [n, h] of Object.entries(pages)) {
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>${base}</style></head><body>${h}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(__dirname, n + '.png') });
  }
  await b.close();
})();
