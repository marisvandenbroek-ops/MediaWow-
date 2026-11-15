const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const img = f => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(A, f)).toString('base64');
const LOGO = img('logo-zwart.png');
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap';
const css = `*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1350px;overflow:hidden}
.s{position:relative;width:1080px;height:1350px;overflow:hidden}
.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.fb{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,3,4,0) 50%,rgba(20,3,4,.6) 100%)}
.ft{position:absolute;inset:0;background:linear-gradient(0deg,rgba(20,3,4,0) 55%,rgba(20,3,4,.5) 100%)}
.logo{position:absolute;left:50%;transform:translateX(-50%);bottom:52px;height:36px;aspect-ratio:1058/244;-webkit-mask:url(${LOGO}) no-repeat center/contain}
.t{position:absolute;left:84px;right:84px;font-family:'Playfair Display';font-weight:400;font-size:92px;line-height:1.02;letter-spacing:-.02em}
.t em{font-style:italic}
.b{bottom:140px}.top{top:96px}.c{top:50%;transform:translateY(-50%);text-align:center}`;
const photo = (f, h, o = {}) => `<div class="s" style="background:#1B0405;color:${o.fg || '#FAF4ED'}">
  <img class="ph" src="${img('bordeaux/' + f)}" style="object-position:${o.pos || '50% 50%'}">
  ${h ? `<div class="${o.at === 'top' ? 'ft' : 'fb'}"></div>` : ''}
  ${h ? `<div class="t ${o.at || 'b'}" style="${o.st || ''}">${h}</div>` : ''}
  <div class="logo" style="background:${o.lg || '#FAF4ED'};opacity:.85"></div></div>`;
const type = (bg, fg, h) => `<div class="s" style="background:${bg};color:${fg}"><div class="t c" style="font-size:104px">${h}</div><div class="logo" style="background:${fg}"></div></div>`;
const tiles = [
  photo('tas-telefoon.jpg', 'Je eerste indruk<br><em>is online.</em>', { pos: '50% 40%' }),
  type('#F3EDE6', '#3A1011', 'Ik check jouw<br>website.<br><em>Gratis.</em>'),
  photo('martini-gordijn.jpg', 'Reserveren?<br><em>Alleen telefonisch.</em>', { pos: '50% 50%' }),
  photo('sleutelgat.jpg', '', { lg: '#3A1011' }),
  photo('typemachine.jpg', 'Jij runt je zaak.<br><em>Ik je website.</em>', { at: 'paper', st: 'top:318px;left:150px;right:150px;font-size:74px;color:#2A0A0B;text-align:center', pos: '50% 50%' }),
  photo('laptop-bed.jpg', 'Ze boeken<br><em>om 23:00.</em>', { at: 'top', pos: '50% 60%' }),
  photo('platenspeler.jpg', 'Zichtbaar zijn<br><em>is herhalen.</em>', { pos: '50% 40%' }),
  photo('tas-bel.jpg', 'Service begint<br><em>online.</em>', { at: 'top', fg: '#3A1011', lg: '#3A1011', st: 'top:110px' }),
  photo('krant-stoel.jpg', '', { pos: '50% 55%' }),
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let i = 0; i < tiles.length; i++) {
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>${css}</style></head><body>${tiles[i]}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(__dirname, `bx-${i + 1}.png`) });
  }
  const b64 = f => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
  const grid = tiles.map((_, i) => `<div style="width:300px;height:400px;overflow:hidden"><img style="width:100%;height:100%;object-fit:cover" src="${b64(`bx-${i + 1}.png`)}"></div>`).join('');
  await p.setViewportSize({ width: 930, height: 1230 });
  await p.setContent(`<body style="margin:0;background:#fff;padding:12px;display:grid;grid-template-columns:repeat(3,300px);gap:3px">${grid}</body>`);
  await p.screenshot({ path: path.join(__dirname, 'grid-bordeaux.png'), fullPage: true });
  await b.close();
})();
