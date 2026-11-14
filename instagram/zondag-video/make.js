// Sunday cover as 8s video (1080x1350): real lilou-ede.nl recordings inside laptop + phone, leaves moving.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIR = __dirname, FR = path.join(DIR, 'frames'), FPS = 30, DUR = 8;
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, '..', 'assets', 'logo-zwart.png')).toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap">
<style>*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;font-family:'DM Sans';color:#FAF4ED;background:radial-gradient(110% 70% at 85% 110%,#3A1011 0%,#1B0405 62%)}
.logo{position:absolute;top:70px;left:90px;height:54px;aspect-ratio:1058/244;background:#FAF4ED;-webkit-mask:url(${LOGO}) no-repeat center/contain}
.h{position:absolute;top:84px;right:90px;font-size:21px;letter-spacing:.34em;text-transform:uppercase;opacity:.7}
.k{position:absolute;top:205px;left:90px;font-size:23px;letter-spacing:.42em;text-transform:uppercase;color:rgba(250,244,237,.62)}
h1{position:absolute;top:255px;left:90px;right:90px;font-family:'Instrument Serif';font-weight:400;font-size:124px;line-height:.92;letter-spacing:-.02em}
.strike{position:relative;font-style:italic;color:#E9D6C8;white-space:nowrap}
.strike:after{content:'';position:absolute;left:-10px;right:-10px;top:52%;height:9px;background:#E9D6C8;transform:rotate(-4deg);border-radius:6px}
.laptop{position:absolute;left:70px;top:590px;width:860px}
.lid{background:#0d0d0e;border-radius:22px 22px 0 0;padding:16px 16px 22px;box-shadow:0 40px 80px rgba(0,0,0,.6)}
.lid video{display:block;width:100%;aspect-ratio:1440/900;object-fit:cover;border-radius:4px}
.base{height:22px;margin:0 -50px;background:linear-gradient(#cfcfd2,#8d8d92);border-radius:0 0 22px 22px;position:relative}
.base:before{content:'';position:absolute;left:50%;top:0;width:140px;height:8px;margin-left:-70px;background:#a9a9ad;border-radius:0 0 10px 10px}
.phone{position:absolute;right:70px;top:700px;width:250px;height:520px;border-radius:40px;padding:9px;background:linear-gradient(145deg,#5a5a5c,#0b0b0c 45%,#6a6a6c);box-shadow:0 40px 80px rgba(0,0,0,.6)}
.phone video{width:100%;height:100%;object-fit:cover;border-radius:32px;display:block}
.isl{position:absolute;top:18px;left:50%;margin-left:-38px;width:76px;height:20px;border-radius:12px;background:#000;z-index:2}
.badge{position:absolute;left:470px;top:1150px;background:#1B0405;font-family:'Instrument Serif';font-style:italic;font-size:58px;padding:8px 26px;box-shadow:0 20px 40px rgba(0,0,0,.5)}
.f{position:absolute;left:90px;right:90px;bottom:56px;display:flex;justify-content:space-between;font-size:21px;letter-spacing:.34em;text-transform:uppercase;opacity:.6}
</style></head><body>
<div class="logo"></div><div class="h">@media.wow</div><div class="k">Unpopular opinion</div>
<h1>Je hebt geen <span class="strike">mooiere</span> website nodig.</h1>
<div class="laptop"><div class="lid"><video id="d" src="lilou-desktop.mp4" muted playsinline preload="auto"></video></div><div class="base"></div></div>
<div class="phone"><div class="isl"></div><video id="m" src="lilou-mobiel.mp4" muted playsinline preload="auto"></video></div>
<div class="badge">mooi + het werkt ✓</div>
<div class="f"><span>mediawow.nl</span><span>Swipe →</span></div>
<script>
const seek=(v,t)=>new Promise(r=>{if(Math.abs(v.currentTime-t)<1e-4){r();return}v.addEventListener('seeked',()=>r(),{once:true});v.currentTime=t});
window.setT=async t=>{await Promise.all([seek(document.getElementById('d'),t),seek(document.getElementById('m'),t)])};
window.ready=()=>Promise.all([...document.querySelectorAll('video')].map(v=>v.readyState>=2?1:new Promise(r=>v.addEventListener('loadeddata',r,{once:true}))));
</script></body></html>`;
(async () => {
  fs.writeFileSync(path.join(DIR, 'cover.html'), html);
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + path.join(DIR, 'cover.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.evaluate(() => window.ready());
  for (let f = 0; f < DUR * FPS; f++) { await p.evaluate(t => window.setT(t), f / FPS + 0.05); await p.screenshot({ path: path.join(FR, String(f).padStart(4, '0') + '.png') }); }
  await b.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${FR}/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart ${path.join(DIR, 'zondag-cover-lilou.mp4')}`);
  fs.copyFileSync(path.join(FR, '0060.png'), path.join(DIR, 'cover-still.png'));
  fs.rmSync(FR, { recursive: true, force: true }); console.log('done');
})();
