const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const A = path.join(__dirname, '..', 'assets');
const img = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(A, f)).toString('base64');
const png = f => 'data:image/png;base64,' + fs.readFileSync(path.join(A, f)).toString('base64');
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500&display=swap';
const W = 1080, H = 1920, FPS = 30, DUR = 15;
const items = ['In één zin: voor wie je bent en wat je oplost', 'Een gratis kennismaking die je in één klik plant', 'Ervaringen van echte klanten', 'Jij, op een echte foto. Geen stockbeeld'];
const html = `<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>
*{margin:0;padding:0;box-sizing:border-box}body{width:${W}px;height:${H}px;overflow:hidden;font-family:'DM Sans';position:relative;background:#1B0405}
.sc{position:absolute;inset:0;opacity:0}
h1{font-family:'Playfair Display';font-weight:400;letter-spacing:-.02em;line-height:1.02}
h1 i{font-style:italic}
#s1 .ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#s1 .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,8,8,.15),rgba(15,8,8,.65) 70%)}
#s1 h1{position:absolute;left:70px;right:50px;top:1080px;color:#FAF4ED;font-size:108px}
#s2{background:radial-gradient(ellipse at 50% 80%,#4A1517,#1B0405 70%)}
#s2 h1{position:absolute;left:80px;right:60px;top:420px;color:#FAF4ED;font-size:98px}
.search{position:absolute;left:90px;right:90px;top:960px;height:130px;border-radius:65px;background:#FAF4ED;display:flex;align-items:center;padding:0 50px;font-size:46px;color:#1B0405;gap:30px}
.search .q{flex:1;white-space:nowrap;overflow:hidden}.cur{display:inline-block;width:3px;height:50px;background:#1B0405;vertical-align:middle;margin-left:4px}
.res{position:absolute;left:90px;right:90px;top:1150px;font-size:38px;color:#E9D6C8;line-height:1.5}
#s3{background:#E9E5DF}
#s3 h1{position:absolute;left:80px;right:80px;top:360px;color:#3A1011;font-size:100px}
.it{position:absolute;left:80px;right:80px;background:#fff;border-radius:6px;padding:40px 44px 40px 130px;font-size:44px;line-height:1.25;color:#141414;box-shadow:0 14px 34px rgba(58,16,17,.1)}
.it b{position:absolute;left:42px;top:38px;font-family:'Playfair Display';font-style:italic;font-weight:400;font-size:52px;color:#3A1011}
.it.on{border-left:8px solid #E8F27A}
#s4{background:radial-gradient(ellipse at 50% 80%,#4A1517,#1B0405 70%)}
#s4 h1{position:absolute;left:90px;right:90px;top:560px;color:#FAF4ED;font-size:120px}
#s4 p{position:absolute;left:90px;right:90px;top:1000px;color:#E9D6C8;font-size:46px;line-height:1.4}
.btn{position:absolute;left:90px;top:1220px;background:#E8F27A;color:#1B0405;font-weight:500;letter-spacing:.18em;font-size:40px;padding:34px 56px}
.logo{position:absolute;left:50%;transform:translateX(-50%);top:150px;width:220px;opacity:.9}
.lgd{filter:none}
</style></head><body>
<div class="sc" id="s1"><img class="ph" src="${img('canva/foto-083.jpg')}"><div class="sh"></div><h1><span id="t1a">Ze zoeken een coach.</span><br><i id="t1b">Vinden ze jóu?</i></h1></div>
<div class="sc" id="s2"><h1>Goede voornemens<br>beginnen <i>bij Google.</i></h1>
<div class="search"><span>🔍</span><span class="q" id="q"></span></div><div class="res" id="res">Ze beslissen in een paar tellen<br>of ze bij jóu verder kijken.</div></div>
<div class="sc" id="s3"><h1>Vertrouwen<br><i>in één oogopslag.</i></h1>
${items.map((t, i) => `<div class="it ${i === 0 ? 'on' : ''}" id="i${i}" style="top:${720 + i * 220}px"><b>0${i + 1}</b>${t}</div>`).join('')}</div>
<div class="sc" id="s4"><h1>Ik kijk vóór<br>1 januari <i>met je mee.</i></h1><p>Reageer TIPS en je krijgt 3 persoonlijke tips voor je coachwebsite. Gratis.</p><div class="btn" id="btn">REAGEER: TIPS</div></div>
<img class="logo" id="lw" src="${png('logo-wit.png')}"><img class="logo" id="lz" src="${png('logo-zwart.png')}" style="opacity:0">
</body></html>`;
const c = v => Math.max(0, Math.min(1, v));
const eo = t => 1 - Math.pow(1 - t, 3);
const Q = 'coach bij mij in de buurt';
(async () => {
  const out = path.join(__dirname, 'frames'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  for (let f = 0; f < FPS * DUR; f++) {
    const t = f / FPS;
    const st = {
      s1: c(1 - (t - 3.2) / 0.35), s2: c((t - 3.2) / 0.35) * c(1 - (t - 6.8) / 0.35),
      s3: c((t - 6.8) / 0.35) * c(1 - (t - 11) / 0.35), s4: c((t - 11) / 0.35),
      zoom: 1.12 - 0.12 * c(t / 3.5), t1a: eo(c((t - 0.2) / 0.6)), t1b: eo(c((t - 1.0) / 0.6)),
      q: Q.slice(0, Math.floor(c((t - 4.0) / 1.4) * Q.length)), cur: Math.floor(t * 2) % 2, res: eo(c((t - 5.6) / 0.5)),
      it: [0, 1, 2, 3].map(i => eo(c((t - 7.4 - i * 0.55) / 0.45))), btn: c((t - 12) / 0.4), pulse: t > 12.5 ? 1 + 0.04 * Math.sin((t - 12.5) * 5) : 1,
      dark: c((t - 6.8) / 0.35) * c(1 - (t - 11) / 0.35)
    };
    await p.evaluate(s => {
      const g = id => document.getElementById(id);
      ['s1', 's2', 's3', 's4'].forEach(k => g(k).style.opacity = s[k]);
      document.querySelector('#s1 .ph').style.transform = `scale(${s.zoom})`;
      g('t1a').style.opacity = s.t1a; g('t1a').style.display = 'inline-block'; g('t1a').style.transform = `translateY(${(1 - s.t1a) * 40}px)`;
      g('t1b').style.opacity = s.t1b; g('t1b').style.display = 'inline-block'; g('t1b').style.transform = `translateY(${(1 - s.t1b) * 40}px)`;
      g('q').innerHTML = s.q + `<span class="cur" style="opacity:${s.cur}"></span>`;
      g('res').style.opacity = s.res; g('res').style.transform = `translateY(${(1 - s.res) * 30}px)`;
      s.it.forEach((v, i) => { const e = g('i' + i); e.style.opacity = v; e.style.transform = `translateX(${(1 - v) * 140}px)`; });
      g('btn').style.opacity = s.btn; g('btn').style.transform = `scale(${s.pulse})`;
      g('lw').style.opacity = .9 * (1 - s.dark); g('lz').style.opacity = .9 * s.dark;
    }, st);
    await p.screenshot({ path: path.join(out, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
  await b.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${out}/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart ${path.join(__dirname, 'reel.mp4')}`);
  fs.rmSync(out, { recursive: true, force: true });
})();
