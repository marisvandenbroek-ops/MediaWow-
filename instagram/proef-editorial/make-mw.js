const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const img = f => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(A, f)).toString('base64');
const LOGO_W = img('logo-wit.png'), LOGO_Z = img('logo-zwart.png');
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500&display=swap';
const css = `*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1350px;overflow:hidden;font-family:'DM Sans'}
.s{position:relative;width:1080px;height:1350px;overflow:hidden;background:#1B0405;color:#FAF4ED}
.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.62) brightness(.74) contrast(1.08)}
.tint{position:absolute;inset:0;background:#3A1011;mix-blend-mode:color;opacity:.45}
.fb{position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,4,5,0) 42%,rgba(27,4,5,.88) 100%)}
.ft{position:absolute;inset:0;background:linear-gradient(0deg,rgba(27,4,5,0) 45%,rgba(27,4,5,.85) 100%)}
.logo{position:absolute;left:50%;transform:translateX(-50%);bottom:54px;width:190px}
.t{position:absolute;left:84px;right:84px;font-family:'Instrument Serif';font-weight:400;font-size:112px;line-height:.98;letter-spacing:-.01em}
.t em{font-style:italic;color:#E8F27A}
.b{bottom:150px}.top{top:110px}
.eb{font-family:'DM Sans';font-size:22px;letter-spacing:.32em;text-transform:uppercase;opacity:.7;margin-bottom:34px;font-style:normal}
.card{position:absolute;left:110px;right:110px;bottom:150px;height:640px;border-radius:22px;overflow:hidden;border-top:5px solid #E8F27A;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.card img{width:100%;height:100%;object-fit:cover}
.cap{position:absolute;left:34px;bottom:30px;font-family:'Instrument Serif';font-size:46px;color:#fff}
.cap small{display:block;font-family:'DM Sans';font-size:17px;letter-spacing:.3em;text-transform:uppercase;opacity:.75;margin-top:6px}
.btn{display:inline-block;margin-top:56px;background:#E8F27A;color:#1B0405;font-family:'DM Sans';font-size:22px;letter-spacing:.28em;text-transform:uppercase;padding:26px 44px;font-style:normal}`;
const logo = (z) => `<img class="logo" src="${z ? LOGO_Z : LOGO_W}" style="opacity:.9">`;
const photo = (f, h, o = {}) => `<div class="s"><img class="ph" src="${img(f)}" style="object-position:${o.pos || '50% 50%'}"><div class="tint"></div>
  ${h && o.at !== 'paper' ? `<div class="${o.at === 'top' ? 'ft' : 'fb'}"></div>` : ''}
  ${h ? `<div class="t ${o.at || 'b'}" style="${o.st || ''}">${h}</div>` : ''}${logo()}</div>`;
const card = (f, h, name, sub) => `<div class="s"><div class="t top">${h}</div>
  <div class="card"><img src="${img(f)}"><div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(0,0,0,.55))"></div><div class="cap">${name}<small>${sub}</small></div></div>${logo()}</div>`;
const type = (bg, fg, h, z) => `<div class="s" style="background:${bg};color:${fg}"><div class="t" style="top:50%;transform:translateY(-50%)">${h}</div>${logo(z)}</div>`;
const tiles = [
  photo('bordeaux/tas-telefoon.jpg', 'Je eerste indruk<br>is <em>online.</em>', { pos: '50% 40%' }),
  type('#1B0405', '#FAF4ED', '<div class="eb">Gratis website check</div>Reageer<br><em>TIPS.</em><br><span class="btn">3 tips in je DM</span>'),
  card('mw-mockup-lilou-1-7.jpg', 'Niet als een<br><em>template.</em>', 'Lilou', 'Branding & website'),
  photo('bordeaux/martini-gordijn.jpg', 'Reserveren?<br><em>Alleen bellen.</em>'),
  type('#FAF4ED', '#3A1011', '<div class="eb">Voor salons, restaurants & coaches</div>Websites die<br>voelen als<br><em style="color:#8A7967">jouw zaak.</em>', true),
  photo('bordeaux/laptop-bed.jpg', 'Ze boeken<br>om <em>23:00.</em>', { at: 'top', pos: '50% 60%' }),
  photo('bordeaux/typemachine.jpg', 'Jij runt je zaak.<br><i>Ik je website.</i>', { at: 'paper', st: 'top:318px;left:150px;right:150px;font-size:80px;color:#1B0405;text-align:center' }),
  card('mw-mockup-house-of-brave-leaders-1-8.jpg', 'Mooi is de basis.<br><em>Niet het doel.</em>', 'House of Brave Leaders', 'Coaching · website'),
  photo('bordeaux/krant-stoel.jpg', '', { pos: '50% 55%' }),
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let i = 0; i < tiles.length; i++) {
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>${css}</style></head><body>${tiles[i]}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(__dirname, `mw-${i + 1}.png`) });
  }
  const b64 = f => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
  const grid = tiles.map((_, i) => `<div style="width:300px;height:400px;overflow:hidden"><img style="width:100%;height:100%;object-fit:cover" src="${b64(`mw-${i + 1}.png`)}"></div>`).join('');
  await p.setViewportSize({ width: 930, height: 1230 });
  await p.setContent(`<body style="margin:0;background:#fff;padding:12px;display:grid;grid-template-columns:repeat(3,300px);gap:3px">${grid}</body>`);
  await p.screenshot({ path: path.join(__dirname, 'grid-mediawow.png'), fullPage: true });
  await b.close();
})();
