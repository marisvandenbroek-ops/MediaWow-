// Week 2 Reel: "5 horecawebsites. Welke past bij jouw zaak?" — scrolls through the 5 live demos on mediawow.nl/horeca.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIR = __dirname, TMP = path.join(DIR, 'tmp'), FPS = 30;
const DEMOS = [
  ['maison', 'Maison Ambre', 'Restaurant · fine dining'],
  ['beauty/sereen', 'Huidstudio Sereen', 'Huidzorg · met webshop'],
  ['wijnbar', 'VOLK', 'Wijnbar · strak en grafisch'],
  ['beauty/loods12', 'Loods 12 Hair', 'Kapsalon'],
  ['beauty/noor', 'Atelier Noor', 'Luxe salon & wellness'],
];
const INTRO = 2.2, PER = 3.2, OUTRO = 3.6, DFR = Math.round(PER * FPS);
const LOGO = 'file://' + path.join(DIR, '..', 'assets', 'logo-zwart.png');

async function capture(b) {
  for (const [slug] of DEMOS) {
    const d = path.join(TMP, slug.replace('/', '-')); fs.mkdirSync(d, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto(`https://mediawow.nl/demo/${slug}/`, { waitUntil: 'networkidle', timeout: 60000 });
    for (const t of ['Alles weigeren', 'Weigeren', 'Accepteren', 'Alles accepteren']) { try { await p.getByText(t, { exact: true }).first().click({ timeout: 800 }); break; } catch (e) {} }
    await p.waitForTimeout(1500);
    const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const dist = Math.min(H, 1800);
    for (let f = 0; f < DFR; f++) {
      const k = Math.max(0, (f / DFR - 0.25) / 0.75), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      await p.evaluate(y => window.scrollTo(0, y), Math.round(dist * e));
      await p.waitForTimeout(20);
      await p.screenshot({ path: path.join(d, String(f).padStart(3, '0') + '.jpg'), type: 'jpeg', quality: 88 });
    }
    await ctx.close(); console.log('captured', slug);
  }
}

const page = `<!doctype html><html><head><meta charset=utf-8>
<link rel=stylesheet href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=Caveat:wght@600&display=swap">
<style>*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:'DM Sans';color:#FAF4ED;background:radial-gradient(110% 60% at 80% 105%,#3A1011 0%,#1B0405 62%)}
.logo{position:absolute;top:140px;left:90px;height:54px;aspect-ratio:1058/244;background:#FAF4ED;-webkit-mask:url(${LOGO}) no-repeat center/contain}
.k{font-size:24px;letter-spacing:.42em;text-transform:uppercase;color:rgba(250,244,237,.65)}
h1{font-family:'Instrument Serif';font-weight:400;letter-spacing:-.02em;line-height:.95}
h1 em{color:#E9D6C8}
.scene{position:absolute;inset:0;opacity:0}
.intro{display:flex;flex-direction:column;justify-content:center;padding:0 90px}
.intro h1{font-size:150px;margin-top:30px}
.nums{display:flex;gap:22px;margin-top:70px}
.nums span{width:120px;height:120px;border-radius:50%;border:2px solid rgba(250,244,237,.4);display:flex;align-items:center;justify-content:center;font-family:'Instrument Serif';font-size:70px;font-style:italic}
.demo .num{position:absolute;left:80px;top:250px;font-family:'Instrument Serif';font-style:italic;font-size:300px;line-height:.8;color:#E8F27A}
.demo .name{position:absolute;left:300px;top:270px;right:80px}
.demo .name h1{font-size:92px}
.demo .name .k{margin-top:18px}
.phone{position:absolute;left:50%;top:560px;width:640px;height:1300px;margin-left:-320px;border-radius:92px;padding:15px;background:linear-gradient(145deg,#5a5a5c 0%,#1a1a1b 18%,#0b0b0c 50%,#2c2c2e 82%,#6a6a6c 100%);box-shadow:0 60px 120px rgba(0,0,0,.6)}
.phone .scr{position:relative;width:100%;height:100%;border-radius:78px;overflow:hidden;background:#000}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top}
.isl{position:absolute;top:20px;left:50%;margin-left:-90px;width:180px;height:42px;border-radius:24px;background:#000;z-index:3}
.outro{display:flex;flex-direction:column;justify-content:center;padding:0 90px}
.outro h1{font-size:140px}
.cc{display:flex;align-items:center;gap:22px;background:#FAF4ED;color:#1B0405;border-radius:100px;padding:22px 36px 22px 22px;margin-top:60px}
.cc .av{width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#E9DCCD,#A88E78)}
.cc .ty{flex:1;font-size:48px;font-weight:600}.cc .ty:after{content:'';display:inline-block;width:4px;height:48px;background:#1B0405;margin-left:8px;vertical-align:-6px}
.cc .po{font-size:32px;font-weight:700;color:#3A1011}
.btn{align-self:flex-start;margin-top:50px;padding:32px 52px;background:#E8F27A;color:#141414;font-size:26px;letter-spacing:.38em;text-transform:uppercase;font-weight:600}
.hand{font-family:Caveat;font-weight:600;font-size:56px;color:#E8F27A;margin-top:40px}
</style></head><body>
<div class="logo"></div>
<div class="scene intro" id="s0"><div class="k">Voor horeca & salons</div><h1>5 websites. <em>Welke past bij jouw zaak?</em></h1><div class="nums"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div>
${DEMOS.map((d, i) => `<div class="scene demo" id="s${i + 1}"><div class="num">${i + 1}</div><div class="name"><h1>${d[1]}</h1><div class="k">${d[2]}</div></div><div class="phone"><div class="scr"><div class="isl"></div><img id="img${i + 1}"></div></div></div>`).join('')}
<div class="scene outro" id="s6"><div class="k">Jouw keuze?</div><h1>Welke past bij <em>jouw zaak?</em></h1>
<div class="cc"><div class="av"></div><span class="ty">3</span><span class="po">Plaatsen</span></div>
<div class="hand">zet je nummer in de comments ↓</div><div class="btn">mediawow.nl</div></div>
<script>
window.show=(i,o)=>{for(let k=0;k<7;k++){const e=document.getElementById('s'+k);e.style.opacity=k===i?o:0;e.style.transform=k===i?'translateY('+(30*(1-o))+'px)':''}};
window.setImg=(i,src)=>new Promise(r=>{const im=document.getElementById('img'+i);if(im.src.endsWith(src)){r();return}im.onload=()=>r();im.src=src});
</script></body></html>`;

(async () => {
  const b = await chromium.launch();
  if (!process.env.SKIP_CAPTURE) await capture(b);
  fs.writeFileSync(path.join(TMP, 'reel.html'), page);
  const FR = path.join(TMP, 'frames'); fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR);
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(TMP, 'reel.html'), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  let n = 0; const shot = () => p.screenshot({ path: path.join(FR, String(n++).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 90 });
  for (let f = 0; f < INTRO * FPS; f++) { await p.evaluate(o => show(0, o), Math.min(1, f / 12)); await shot(); }
  for (let i = 0; i < DEMOS.length; i++) {
    for (let f = 0; f < DFR; f++) {
      await p.evaluate(([i, src]) => setImg(i, src), [i + 1, 'file://' + path.join(TMP, DEMOS[i][0].replace('/', '-'), String(f).padStart(3, '0') + '.jpg')]);
      await p.evaluate(([i, o]) => show(i, o), [i + 1, Math.min(1, f / 8)]); await shot();
    }
  }
  for (let f = 0; f < OUTRO * FPS; f++) { await p.evaluate(o => show(6, o), Math.min(1, f / 12)); await shot(); }
  await b.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${FR}/%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 19 -movflags +faststart ${path.join(DIR, 'reel-5-websites.mp4')}`);
  fs.copyFileSync(path.join(FR, String(Math.round(INTRO * FPS) + 40).padStart(4, '0') + '.jpg'), path.join(DIR, 'cover-frame.jpg'));
  fs.rmSync(TMP, { recursive: true, force: true }); console.log('done');
})();
