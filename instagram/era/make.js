const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const IMG = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'foto-zw.jpg')).toString('base64');
const html = `<!doctype html><html><head><meta charset=utf-8>
<link rel=stylesheet href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap">
<style>*{margin:0}body{width:1080px;height:1350px;overflow:hidden;background:#E3E1DE;position:relative;font-family:'Playfair Display'}
.ph{position:absolute;left:-60px;top:470px;width:1200px}
.fade{position:absolute;left:0;right:0;top:460px;height:360px;background:linear-gradient(#E3E1DE 12%,rgba(227,225,222,.85) 40%,rgba(227,225,222,0))}
.t{position:absolute;top:95px;left:70px;right:70px;text-align:center;color:#7A1C1F;letter-spacing:-.035em;line-height:1.02}
.t p{font-size:60px;font-weight:600}
.t p+p{margin-top:40px}</style></head><body>
<img class="ph" src="${IMG}"><div class="fade"></div>
<div class="t"><p>Vrouwelijke ondernemers zitten officieel in hun ‘ik heb geen energie meer om me druk te maken over wat iedereen <span style="white-space:nowrap">denkt’-fase.</span></p>
<p>En eerlijk? Het is heerlijk.</p></div></body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(__dirname, 'post.jpg'), type: 'jpeg', quality: 92 }); await b.close(); })();
