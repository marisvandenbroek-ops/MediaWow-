// Renders the Saturday Reel (1080x1920, 30fps) frame by frame, then encodes it with ffmpeg + ping sounds.
// Usage: node reel/make-reel.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIR = __dirname, FR = path.join(DIR, 'frames'), FPS = 30, DUR = 11;
const PHOTO = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(DIR, '..', 'assets', 'foto-kantoor.jpg')).toString('base64');
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, '..', 'assets', 'logo-zwart.png')).toString('base64');
const NOTIFS = [
  [1.6, 'nu', '4 personen · vanavond 19:30'],
  [2.2, 'nu', '2 personen · vanavond 20:00'],
  [2.75, 'nu', '6 personen · zo 12:30 · verjaardag 🎂'],
  [3.2, 'nu', '2 personen · vanavond 21:00'],
  [3.6, 'nu', '8 personen · vr 19:00'],
  [3.95, 'nu', '3 personen · vanavond 18:30'],
  [4.25, 'nu', '4 personen · zo 13:00'],
  [4.5, 'nu', '2 personen · vanavond 21:30'],
];
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:'DM Sans';background:radial-gradient(110% 60% at 80% 105%,#3A1011 0%,#1B0405 62%);color:#FAF4ED}
.logo{position:absolute;top:150px;left:90px;height:56px;aspect-ratio:1058/244;background:#FAF4ED;-webkit-mask:url(${LOGO}) no-repeat center/contain}
.kick{position:absolute;top:260px;left:90px;font-size:24px;letter-spacing:.42em;text-transform:uppercase;color:rgba(250,244,237,.62)}
h1{position:absolute;top:310px;left:90px;right:90px;font-family:'Instrument Serif';font-weight:400;font-size:120px;line-height:.95;letter-spacing:-.02em}
h1 em{color:#E9D6C8}
.phone{position:absolute;left:50%;top:640px;width:720px;height:1420px;margin-left:-360px;border-radius:96px;padding:16px;background:linear-gradient(145deg,#5a5a5c 0%,#1a1a1b 18%,#0b0b0c 50%,#2c2c2e 82%,#6a6a6c 100%);box-shadow:0 60px 120px rgba(0,0,0,.6)}
.screen{position:relative;height:100%;border-radius:82px;overflow:hidden;background:linear-gradient(170deg,#2E1517,#561C1E 50%,#A88E78)}
.island{position:absolute;top:20px;left:50%;transform:translateX(-50%);width:200px;height:44px;border-radius:24px;background:#000;z-index:5}
.glass{position:absolute;inset:0;z-index:6;background:linear-gradient(118deg,rgba(255,255,255,.14),rgba(255,255,255,0) 40%)}
.date{position:absolute;top:110px;width:100%;text-align:center;font-size:30px;font-weight:500}
.time{position:absolute;top:150px;width:100%;text-align:center;font-size:170px;font-weight:600;letter-spacing:-.03em}
.list{position:absolute;top:400px;left:26px;right:26px}
.n{position:absolute;left:0;right:0;height:116px;background:rgba(255,255,255,.85);color:#111;border-radius:32px;padding:20px 24px;display:flex;gap:18px;align-items:center}
.ic{flex:0 0 60px;height:60px;border-radius:14px;background:#FAF4ED;display:flex;align-items:center;justify-content:center;font-size:32px}
.nb{flex:1}.nt{display:flex;justify-content:space-between;font-size:26px}.nt small{color:#666;font-size:22px}
.nb p{font-size:26px;margin-top:2px}
.more{position:absolute;left:50%;transform:translateX(-50%);top:0;background:rgba(255,255,255,.2);border-radius:24px;padding:12px 30px;font-size:26px;white-space:nowrap}
.end{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:0 80px 330px;background:#1B0405}
.end .ph{position:absolute;left:0;top:-280px;width:100%;height:calc(100% + 280px);object-fit:cover;object-position:42% 30%}
.end .fade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,4,5,.55) 0%,rgba(27,4,5,0) 18%,rgba(27,4,5,.15) 40%,rgba(27,4,5,.92) 62%,#1B0405 100%)}
.end>*:not(.ph):not(.fade){position:relative}
.ek{font-size:26px;letter-spacing:.42em;text-transform:uppercase;color:rgba(250,244,237,.75);margin-bottom:26px}
.cc{display:flex;align-items:center;gap:22px;background:#FAF4ED;color:#1B0405;border-radius:100px;padding:22px 36px 22px 22px;margin-top:44px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.cc .av{width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#E9DCCD,#A88E78)}
.cc .ty{flex:1;font-size:50px;font-weight:600}
.cc .ty:after{content:'';display:inline-block;width:4px;height:50px;background:#1B0405;margin-left:8px;vertical-align:-6px}
.cc .po{font-size:32px;font-weight:700;color:#3A1011}
.hr{margin-top:36px;font-size:28px;color:rgba(250,244,237,.7)}
.end h2{font-family:'Instrument Serif';font-weight:400;font-size:150px;line-height:.92;letter-spacing:-.02em}
.end h2 em{color:#E9D6C8}
.end p{font-size:42px;font-weight:300;margin-top:34px;color:rgba(250,244,237,.9);line-height:1.35}
.end p b{font-weight:700;color:#fff}
.btn{align-self:flex-start;margin-top:60px;padding:34px 56px;background:#FAF4ED;color:#1B0405;font-size:26px;letter-spacing:.38em;text-transform:uppercase;font-weight:500}
.end .lg{position:absolute!important;top:150px;left:90px;height:56px;aspect-ratio:1058/244;background:#FAF4ED;-webkit-mask:url(${LOGO}) no-repeat center/contain}
</style></head><body>
<div class="logo" id="logo"></div><div class="kick" id="kick">Voor horeca · zaterdag 08:30</div>
<h1 id="title">Zo zou jouw zaterdag <em>eruit moeten zien.</em></h1>
<div class="phone" id="phone"><div class="screen"><div class="island"></div><div class="glass"></div>
<div class="date">zaterdag 21 november</div><div class="time">08:30</div>
<div class="list" id="list">${NOTIFS.map((n, i) => `<div class="n" id="n${i}"><div class="ic">🍽️</div><div class="nb"><div class="nt"><b>Zenchef</b><small>nu</small></div><p>Nieuwe reservering · ${n[2]}</p></div></div>`).join('')}
<div class="more" id="more"></div></div></div></div>
<div class="end" id="end">
<img class="ph" src="${PHOTO}"><div class="fade"></div>
<div class="lg"></div>
<div class="ek">Gratis website-check</div>
<h2>Ik check jouw website.<br><em>Gratis.</em></h2>
<p>Reageer <b>TIPS</b> en je krijgt 3 persoonlijke tips in je DM.</p>
<div class="cc"><div class="av"></div><span class="ty">TIPS</span><span class="po">Plaatsen</span></div>
<div class="hr">Horeca? Bekijk de ontwerpen op mediawow.nl/horeca</div>
</div>
<script>
const T=${JSON.stringify(NOTIFS.map(n => n[0]))}, H=132;
const cl=x=>Math.max(0,Math.min(1,x)), ease=x=>1-Math.pow(1-cl(x),3);
window.setT=t=>{
  const a=ease((t-0.15)/0.7);
  for(const id of ['logo','kick','title']){const e=document.getElementById(id);e.style.opacity=a;e.style.transform='translateY('+(30*(1-a))+'px)'}
  const p=ease((t-0.4)/0.9);document.getElementById('phone').style.transform='translateY('+(500*(1-p))+'px)';
  T.forEach((ti,i)=>{const e=document.getElementById('n'+i);let shift=0;T.forEach((tj,j)=>{if(j>i)shift+=ease((t-tj)/0.35)*H});
    const k=ease((t-ti)/0.35);e.style.opacity=k;e.style.transform='translateY('+(shift-40*(1-k))+'px) scale('+(0.94+0.06*k)+')'});
  const m=document.getElementById('more');const c=Math.floor(cl((t-4.8)/1.2)*9);m.style.opacity=t>4.8?1:0;m.textContent='+ '+c+' nieuwe reserveringen';
  let sh=0;T.forEach(tj=>sh+=ease((t-tj)/0.35)*H);m.style.top=(sh+10)+'px';
  const e=ease((t-6.4)/0.6);const end=document.getElementById('end');end.style.opacity=e;end.style.transform='translateY('+(60*(1-e))+'px)';
};
</script></body></html>`;
(async () => {
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const N = Math.round(DUR * FPS);
  for (let f = 0; f < N; f++) { await p.evaluate(t => window.setT(t), f / FPS); await p.screenshot({ path: path.join(FR, String(f).padStart(4, '0') + '.png') }); }
  await p.evaluate(t => window.setT(t), 2.2); await p.screenshot({ path: path.join(DIR, 'cover-frame.png') });
  await b.close();
  // ping sound + one ping per notification
  const ping = path.join(DIR, 'ping.wav');
  execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=1568:duration=0.35" -f lavfi -i "sine=frequency=2093:duration=0.35" -filter_complex "[0][1]amix=inputs=2,afade=t=out:st=0.03:d=0.32,volume=0.35" ${ping}`);
  const ins = NOTIFS.map(() => `-i ${ping}`).join(' ');
  const delays = NOTIFS.map((n, i) => `[${i + 1}]adelay=${Math.round(n[0] * 1000)}|${Math.round(n[0] * 1000)}[a${i}]`).join(';');
  const mix = NOTIFS.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${NOTIFS.length}:normalize=0,apad[aout]`;
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${FR}/%04d.png ${ins} -filter_complex "${delays};${mix}" -map 0:v -map "[aout]" -t ${DUR} -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 160k -movflags +faststart ${path.join(DIR, 'zaterdag-reel.mp4')}`);
  fs.rmSync(FR, { recursive: true, force: true }); fs.rmSync(ping);
  console.log('done');
})();
