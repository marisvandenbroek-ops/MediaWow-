const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const img = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(A, f)).toString('base64');
const BG = img('bordeaux/disco.jpg');
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(A, 'logo-wit.png')).toString('base64');
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Caveat:wght@600&family=DM+Sans:wght@400;500&display=swap';
const css = `*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1350px;overflow:hidden}
.s{position:relative;width:1080px;height:1350px;overflow:hidden;color:#FAF4ED;font-family:'DM Sans'}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.dim{position:absolute;inset:0;background:rgba(27,18,14,.62)}
.logo{position:absolute;left:50%;transform:translateX(-50%);bottom:56px;width:180px;opacity:.9}
.n{position:absolute;right:70px;top:60px;font-size:26px;letter-spacing:.2em;background:rgba(27,4,5,.55);padding:10px 20px;border-radius:30px}
.hand{text-shadow:0 2px 16px rgba(27,4,5,.7);font-family:Caveat;font-weight:600;color:#E8F27A;font-size:70px;line-height:1}
.big{text-shadow:0 4px 30px rgba(27,4,5,.6);font-family:'Playfair Display';font-weight:600;line-height:.95;letter-spacing:-.02em}
.c{position:absolute;left:90px;right:90px;top:50%;transform:translateY(-50%)}
.c h2{font-family:'Playfair Display';font-weight:600;font-size:92px;line-height:1;letter-spacing:-.02em;color:#E8F27A;margin:18px 0 34px}
.c h2 i{font-weight:400;color:#FAF4ED}
.c p{font-size:38px;line-height:1.35}
.c ul{list-style:none;margin-top:30px}.c li{font-size:36px;line-height:1.35;padding:10px 0 10px 46px;position:relative}
.c li:before{content:'✓';position:absolute;left:0;color:#E8F27A}
.c .x{font-size:36px;opacity:.75;text-decoration:line-through;margin-bottom:10px}`;
const wrap = (inner, n, dim = true) => `<div class="s"><img class="bg" src="${BG}">${dim ? '<div class="dim"></div>' : ''}${n ? `<div class="n">${n}/7</div>` : ''}${inner}<img class="logo" src="${LOGO}"></div>`;
const tip = (n, nr, title, x, body) => wrap(`<div class="c"><div class="hand">nee tegen…</div><h2>${nr}. ${title}</h2>${x ? `<div class="x">${x}</div>` : ''}${body}</div>`, n);
const slides = [
  wrap(`<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,4,5,.15),rgba(27,4,5,0) 40%,rgba(27,4,5,.35))"></div>
    <div class="hand" style="position:absolute;left:96px;top:600px">doe je mee?</div>
    <div class="big" style="position:absolute;left:90px;top:690px;font-size:170px">NEE-<br>vember</div>
    <div class="hand" style="position:absolute;left:96px;top:1040px;font-size:76px;color:#FAF4ED">challenge voor je website</div>`, 1, false),
  tip(2, 1, '‘Neem contact op’', '', `<p>Te vaag. Niemand weet wat er daarna gebeurt.</p><ul><li>Boek je behandeling</li><li>Reserveer je tafel</li><li>Plan een gratis kennismaking</li></ul>`),
  tip(3, 2, 'Je menu als pdf', '', `<p>Inzoomen, wachten, scrollen. Op je telefoon haken ze af.</p><ul><li>Prijzen en menu als gewone tekst</li><li>Leesbaar in één oogopslag</li></ul>`),
  tip(4, 3, '‘Welkom op onze website’', '', `<p>Dat weten ze al. Zeg liever wat ze hier krijgen.</p><ul><li>Wat je doet + wat ze nu moeten doen</li></ul>`),
  tip(5, 4, 'Een trage site', '', `<p>Langer dan 3 tellen laden? Dan zijn ze weg.</p><ul><li>Kleinere foto's</li><li>Alleen wat je echt nodig hebt</li></ul>`),
  tip(6, 5, 'Een website die niet van jou is', '', `<p>Staat je domein op naam van je webbureau? Dan ben je bij overstappen je adres kwijt.</p><ul><li>Domein en site op jóuw naam</li></ul>`),
  wrap(`<div class="c" style="text-align:center"><div class="hand">jouw beurt</div>
    <h2 style="font-size:110px;margin-bottom:40px">Welke NEE <i>heeft jouw site nodig?</i></h2>
    <p>Reageer <b style="color:#E8F27A">NEE</b> en ik check gratis je website.<br>Je krijgt 3 tips in je DM.</p></div>`, 7),
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let i = 0; i < slides.length; i++) {
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>${css}</style></head><body>${slides[i]}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, `slide-0${i + 1}.jpg`), type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
