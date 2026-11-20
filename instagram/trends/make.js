const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
const html = `<!doctype html><html><head><meta charset=utf-8>
<link rel=stylesheet href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,500&family=Caveat:wght@500&family=DM+Sans:wght@400&display=swap">
<style>*{margin:0}body{width:1080px;height:1350px;overflow:hidden;background:#F3EDE6;position:relative;font-family:'Playfair Display';color:#3A1011}
.top{position:absolute;top:48px;left:100px;right:100px;display:flex;justify-content:space-between;font:400 26px 'DM Sans';color:#6b6258}
.big{position:absolute;left:96px;top:200px;font-size:230px;font-style:italic;line-height:.9;letter-spacing:-.03em}
.mid{position:absolute;left:100px;top:450px;font-size:104px;line-height:1;letter-spacing:-.03em}
.mid i{display:block}
.hand{position:absolute;left:104px;top:760px;font:500 52px Caveat;color:#141414}
.me{position:absolute;left:0;top:0;width:1080px;height:1350px}</style></head><body>
<div class="top"><span>@media.wow</span><span>MediaWow</span></div>
<div class="big">5 trends</div>
<div class="mid">die nu overal<i>opduiken</i></div>
<div class="hand">[ondernemers-editie]</div>
<img class="me" src="${b64('pose.png')}"></body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(__dirname, 'cover.jpg'), type: 'jpeg', quality: 92 }); await b.close(); })();
