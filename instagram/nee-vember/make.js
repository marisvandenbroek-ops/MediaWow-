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
    <div class="hand" style="position:absolute;left:96px;top:1040px;font-size:76px;color:#FAF4ED">challenge voor ondernemers</div>`, 1, false),
  wrap(`<div class="c"><h2 style="font-size:72px">Deze november zeggen we <span style="color:#E8F27A">NEE</span> <i>tegen alles wat ons als ondernemer klein houdt.</i></h2>
    <ul><li>Je prijs verlagen voordat iemand er iets van zegt</li><li>‘Even gratis sparren’ dat 2 uur duurt</li><li>Appjes beantwoorden om 23:00</li></ul>
    <div class="hand" style="margin-top:50px">zo doe je mee:</div></div>`, 2),
  wrap(`<div class="c"><div class="hand">stap 1</div><h2>Schrijf je NEE-lijst</h2>
    <p>Vijf dingen waar je opgelucht van wordt als je ermee stopt. Een paar ideeën:</p>
    <ul><li>Nee tegen korting zonder reden</li><li>Nee tegen klanten die niet bij je passen</li><li>Nee tegen ‘ik doe het er wel even bij’</li><li>Nee tegen jezelf vergelijken op Insta</li><li>Nee tegen een site waar je je voor schaamt</li></ul></div>`, 3),
  wrap(`<div class="c"><div class="hand">stap 2</div><h2>Zet naast elke NEE <i>wat je wél doet</i></h2>
    <p>‘Kan het wat goedkoper?’<br>Probeer: <span style="color:#E8F27A;font-style:italic">‘Nee, dit is mijn prijs.’</span> Zonder uitleg. Zonder sorry.</p>
    <p style="margin-top:34px">Avond = vrij?<br>Zet een automatisch antwoord aan en leg je telefoon weg.</p></div>`, 4),
  wrap(`<div class="c"><div class="hand">stap 3</div><h2>Laat je website <i>nee zeggen</i></h2>
    <p>Zodat jij het niet steeds hoeft te doen.</p>
    <ul><li>Je prijzen zichtbaar: geen ‘wat kost het?’-appjes meer</li><li>Je voorwaarden erop: no-show en annuleren</li><li>Online boeken: geen heen-en-weer meer</li></ul></div>`, 5),
  wrap(`<div class="c"><div class="hand">en de allerbelangrijkste…</div><h2 style="font-size:104px">NEE tegen <i>‘dat doe ik in januari wel’</i></h2>
    <p style="font-size:44px">Dat zei je vorig jaar ook. 🪩</p></div>`, 6),
  wrap(`<div class="c" style="text-align:center"><div class="hand">doe je mee?</div>
    <h2 style="font-size:104px;margin-bottom:40px">Wat staat er <i>op jouw NEE-lijst?</i></h2>
    <p>Reageer <b style="color:#E8F27A">NEE</b> en je krijgt mijn NEE-lijst voor ondernemers in je DM.</p></div>`, 7),
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
