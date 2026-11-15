const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const img = f => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(A, f)).toString('base64');
const LOGO = img('logo-zwart.png');
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap';
const css = `*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1350px;overflow:hidden;font-family:'DM Sans'}
.s{position:relative;width:1080px;height:1350px;overflow:hidden}
.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.75) contrast(.95) brightness(.96) sepia(.08)}
.fade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,4,5,0) 45%,rgba(27,4,5,.78) 100%)}
.lab{position:absolute;left:80px;top:78px;font-size:21px;letter-spacing:.34em;text-transform:uppercase;display:flex;align-items:center;gap:14px}
.lab i{width:12px;height:12px;border-radius:50%;background:#E8F27A;display:inline-block}
.logo{position:absolute;right:80px;top:70px;height:40px;aspect-ratio:1058/244;-webkit-mask:url(${LOGO}) no-repeat center/contain}
.ttl{position:absolute;left:80px;right:80px;bottom:110px;font-family:'Playfair Display';font-weight:400;font-size:98px;line-height:1;letter-spacing:-.02em}
.ttl em{font-style:italic}
.type .ttl{bottom:auto;top:50%;transform:translateY(-50%);font-size:118px}
.u{background:linear-gradient(transparent 82%,#E8F27A 82%,#E8F27A 92%,transparent 92%)}
.swipe{position:absolute;right:80px;bottom:64px;font-size:20px;letter-spacing:.3em;text-transform:uppercase;opacity:.8}`;
const photo = (f, no, h, pos = '50% 50%') => `<div class="s" style="color:#FAF4ED;background:#1B0405"><img class="ph" src="${img(f)}" style="object-position:${pos}"><div class="fade"></div>
  <div class="lab"><i></i>N° ${no} · De Website Check</div><div class="logo" style="background:#FAF4ED"></div><div class="ttl">${h}</div><div class="swipe">Swipe →</div></div>`;
const type = (bg, fg, no, h) => `<div class="s type" style="background:${bg};color:${fg}"><div class="lab"><i></i>N° ${no} · De Website Check</div><div class="logo" style="background:${fg}"></div><div class="ttl">${h}</div><div class="swipe">Swipe →</div></div>`;
const tiles = [
  photo('canva/foto-067.jpg', '09', 'Een lege tafel<br><em>begint online.</em>'),
  type('#F3EDE6', '#3A1011', '08', 'Ik check jouw<br>website. <em class="u">Gratis.</em>'),
  photo('mw-mockup-lilou-1-7.jpg', '07', 'Een kerstmenu<br><em>dat verkoopt.</em>', '50% 55%'),
  photo('story/telefoon-gemist.jpg', '06', 'Ze belden.<br><em>Jij stond te knippen.</em>'),
  photo('story/lege-stoel-leer.jpg', '05', 'Een lege stoel<br><em>begint online.</em>'),
  type('#1B0405', '#FAF4ED', '04', 'Van wie is jouw<br>website <em class="u">eigenlijk?</em>'),
  type('#F3EDE6', '#3A1011', '03', 'De duurste knop<br><em>van je website.</em>'),
  photo('story/telefoon-vintage.jpg', '02', 'Reserveren?<br><em>Alleen telefonisch.</em>'),
  photo('mw-mockup-house-of-brave-leaders-1-8.jpg', '01', 'Mooi is de basis.<br><em>Niet het doel.</em>', '50% 50%'),
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let i = 0; i < tiles.length; i++) {
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>${css}</style></head><body>${tiles[i]}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(__dirname, `tile-${i + 1}.png`) });
  }
  const b64 = f => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
  const grid = tiles.map((_, i) => `<div style="width:300px;height:400px;overflow:hidden"><img style="width:100%;height:100%;object-fit:cover" src="${b64(`tile-${i + 1}.png`)}"></div>`).join('');
  await p.setViewportSize({ width: 930, height: 1230 });
  await p.setContent(`<body style="margin:0;background:#fff;padding:12px;display:grid;grid-template-columns:repeat(3,300px);gap:3px">${grid}</body>`);
  await p.screenshot({ path: path.join(__dirname, 'grid-editorial.png'), fullPage: true });
  await b.close();
})();
