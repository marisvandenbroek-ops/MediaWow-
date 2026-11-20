const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const b64 = (f, t) => `data:image/${t};base64,` + fs.readFileSync(path.join(__dirname, f)).toString('base64');
const CUT = b64('cut-big.png', 'png'), LOGO = b64('../assets/logo-zwart.png', 'png');
const html = `<!doctype html><html><head><meta charset=utf-8>
<link rel=stylesheet href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,500&display=swap">
<style>*{margin:0}body{width:1080px;height:1350px;overflow:hidden;background:radial-gradient(ellipse at 55% 60%,#4A1517,#1B0405 75%);position:relative;font-family:'Playfair Display'}
h1{position:absolute;top:130px;left:0;right:0;text-align:center;font-weight:500;font-size:80px;line-height:1;letter-spacing:-.035em;color:#FAF4ED}
h1 i{color:#E8F27A}
.me{position:absolute;left:54px;top:400px;width:1026px}
.logo{position:absolute;left:70px;bottom:60px;width:170px;opacity:.85}</style></head><body>
<h1>Het leven is zwaar.<br>Maak het zwaarder.<br><i>Begin een bedrijf.</i></h1>
<img class="me" src="${CUT}"></body></html>`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(__dirname, 'post.jpg'), type: 'jpeg', quality: 92 }); await b.close(); })();
