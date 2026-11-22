const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const d = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, f)).toString('base64');
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo-wit.png')).toString('base64');
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap';
const W = 1080, H = 1350, N = 4, X = 3 * W, VH = 1920, OY = 285;
const E = 'It’s tim' + 'e'.repeat(160);
const wave = `M150,800 L760,800 C960,800 1000,520 1180,420 C1400,300 1500,980 1800,1000 C2100,1020 2150,420 2450,380 C2750,340 2850,980 3050,900 C3180,850 3200,660 3300,660 L3420,660`;
const cards = [['brave.jpg', X + 60, 110, 440, -6], ['lilou.jpg', X + 560, 90, 440, 5], ['vanhees.jpg', X + 40, 980, 400, 4], ['luvely.jpg', X + 480, 930, 190, -5], ['minkman.jpg', X + 700, 1000, 360, -4]];
const html = `<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="${FONTS}"><style>
*{margin:0;padding:0}body{width:${W}px;height:${VH}px;background:#3A1011;overflow:hidden;font-family:'Playfair Display';color:#FAF4ED;position:relative}
#stage{position:absolute;left:0;top:${OY}px;width:${W * N}px;height:${H}px;will-change:transform}
.card{position:absolute;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.45);opacity:0}
.logo{position:absolute;left:${W / 2 - 90}px;bottom:150px;width:180px;opacity:.75}
</style></head><body><div id="stage">
<svg width="${W * N}" height="${H}" style="position:absolute;left:0;top:0"><defs><clipPath id="c"><rect id="r" x="0" y="0" width="0" height="${H}"/></clipPath></defs>
<path id="p" d="${wave}" fill="none"/>
<text clip-path="url(#c)" font-family="Playfair Display" font-weight="600" font-size="130" fill="#FAF4ED" letter-spacing="2"><textPath href="#p">${E}</textPath></text></svg>
${cards.map(([f, x, y, w, r], i) => `<img class="card" id="k${i}" data-r="${r}" src="${d(f)}" style="left:${x}px;top:${y}px;width:${w}px">`).join('')}
<div id="tx" style="position:absolute;left:${X + 250}px;top:600px;font-size:96px;line-height:1.02;font-weight:600;opacity:0">voor een<br>nieuwe <i style="font-weight:400;color:#E8F27A">website.</i></div>
</div><img class="logo" src="${LOGO}"></body></html>`;
const FPS = 30, DUR = 13;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = v => Math.max(0, Math.min(1, v));
(async () => {
  const out = path.join(__dirname, 'frames'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: VH } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  for (let f = 0; f < FPS * DUR; f++) {
    const t = f / FPS;
    const cam = ease(clamp((t - 0.8) / 2.8)) * X;
    const reveal = 620 + clamp(t / 0.8) * 360 + cam;
    const tx = clamp((t - 3.3) / 0.6);
    await p.evaluate(([cam, reveal, tx, t]) => {
      document.getElementById('stage').style.transform = `translateX(${-cam}px)`;
      document.getElementById('r').setAttribute('width', reveal);
      const e = document.getElementById('tx'); e.style.opacity = tx; e.style.transform = `translateY(${(1 - tx) * 30}px)`;
      for (let i = 0; i < 5; i++) { const k = document.getElementById('k' + i); const a = Math.max(0, Math.min(1, (t - 3.7 - i * 0.15) / 0.4));
        const s = a < 1 ? 0.7 + 0.38 * a - 0.08 * Math.sin(a * Math.PI) * -1 : 1;
        k.style.opacity = a; k.style.transform = `rotate(${k.dataset.r}deg) scale(${a ? Math.min(1.06, 0.7 + 0.36 * a) - (a > .85 ? (a - .85) * .4 : 0) : .7})`; }
    }, [cam, reveal, tx, t]);
    await p.screenshot({ path: path.join(out, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
  await b.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${out}/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart ${path.join(__dirname, 'reel.mp4')}`);
  fs.rmSync(out, { recursive: true, force: true });
})();
