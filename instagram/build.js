// Renders the Instagram slides in slides.js to 1080x1350 (4:5) PNGs + caption.txt.
// Usage: node build.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const posts = require('./slides.js');

const OUT = path.join(__dirname, 'week-1');
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Caveat:wght@600&family=DM+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap';

const CSS = `
:root{--cream:#FAF4ED;--sand:#F1E8DC;--ink:#1B0405;--wine:#561C1E;--bordeaux:#3A1011;--lime:#E8F27A;--taupe:#8A7967;--red:#E5484D}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
.s{width:1080px;height:1350px;position:relative;padding:110px 100px 150px;display:flex;flex-direction:column;justify-content:center;
  font-family:'DM Sans',sans-serif;overflow:hidden}
.light{background:var(--cream);color:var(--ink)} .sand{background:var(--sand);color:var(--ink)}
.dark{background:radial-gradient(120% 80% at 80% 0%,var(--bordeaux),var(--ink) 60%);color:var(--cream)} .lime-bg{background:var(--lime);color:var(--ink)}
.grain:after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.06;
  background-image:radial-gradient(currentColor 1px,transparent 1px);background-size:6px 6px}
h1,h2,h3{font-family:'Instrument Serif',serif;font-weight:400;letter-spacing:-.01em}
h1.xl{font-size:140px;line-height:.95} h1.lg{font-size:106px;line-height:1} h1.md{font-size:90px;line-height:1.02}
h2{font-size:80px;line-height:1.05}
em{font-style:italic}
.lime{color:var(--lime)} .red{color:var(--red)}
.center-t{text-align:center}
.kicker{font-size:24px;font-weight:500;letter-spacing:.32em;text-transform:uppercase;margin-bottom:40px;opacity:.75}
.lead{font-size:42px;line-height:1.4;margin-top:48px;max-width:860px}
.hand{font-family:Caveat,cursive;font-weight:600}
.hand.big{font-size:58px;line-height:1.1}
.light .hand,.sand .hand{color:var(--wine)}
.light h1 em,.sand h1 em,.light h3 em,.sand h3 em{color:var(--wine)}
.hl{background:linear-gradient(transparent 58%,var(--lime) 58%,var(--lime) 92%,transparent 92%);padding:0 6px;margin:0 -6px}
.dark .hl{color:var(--ink);background:var(--lime);padding:0 12px;border-radius:6px}
.sticker{position:absolute;width:250px;height:250px;border-radius:50%;background:var(--lime);color:var(--ink);display:flex;align-items:center;justify-content:center;
  text-align:center;font-weight:800;font-size:34px;line-height:1.1;letter-spacing:.06em;text-transform:uppercase;transform:rotate(12deg);box-shadow:0 10px 0 rgba(0,0,0,.25)}
.pill{align-self:flex-start;background:var(--ink);color:var(--lime);font-weight:700;font-size:30px;letter-spacing:.14em;text-transform:uppercase;padding:18px 34px;border-radius:100px;margin-bottom:50px;transform:rotate(-3deg)}
.count{font-family:'Instrument Serif',serif;font-style:italic;font-size:250px;line-height:1;letter-spacing:-.04em;margin:10px 0 50px}
.count span{color:var(--wine);font-size:.5em}
.steps{display:flex;flex-direction:column;gap:30px}
.step{display:flex;gap:34px;align-items:center;background:var(--cream);border-radius:28px;padding:38px 40px;font-size:42px;line-height:1.3;font-weight:500}
.step b{flex:0 0 96px;height:96px;border-radius:50%;background:var(--wine);color:var(--lime);display:flex;align-items:center;justify-content:center;font-family:'Instrument Serif';font-style:italic;font-size:56px}
.checks{display:flex;flex-direction:column;gap:22px;margin-top:20px}
.checks div{position:relative;font-size:44px;line-height:1.25;padding:26px 0 26px 98px;border-bottom:2px solid rgba(138,121,103,.35)}
.checks div:before{content:'✓';position:absolute;left:0;top:50%;margin-top:-35px;width:70px;height:70px;border-radius:50%;background:var(--lime);color:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:38px}
.dark-checks div{border-color:rgba(242,237,228,.2)}
.comment-box{margin-top:90px;background:#fff;border-radius:100px;padding:26px 34px;display:flex;align-items:center;gap:26px;box-shadow:0 20px 50px rgba(0,0,0,.15);font-size:46px}
.comment-box .av{width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#C9B8A3,#8C7660)}
.comment-box .typed{flex:1;font-weight:600}
.comment-box .typed:after{content:'';display:inline-block;width:4px;height:48px;background:var(--ink);margin-left:6px;vertical-align:-8px}
.comment-box .post{color:#3B82F6;font-weight:700;font-size:36px}
.hand-note{position:absolute;font-family:Caveat;font-weight:600;font-size:64px;display:flex;align-items:center;gap:10px}
.arrow{display:inline-block}
/* phone */
.phone{background:#0d0d0d;border-radius:70px;padding:16px;box-shadow:0 40px 80px rgba(0,0,0,.35)}
.phone .screen{background:#fff;border-radius:56px;height:100%;overflow:hidden;position:relative;color:#111}
.phone-low{position:absolute;right:120px;transform:rotate(4deg);bottom:-150px;width:540px;height:1000px}
.s:has(.phone-low) h1.md{font-size:108px;line-height:1}
.s:has(.phone-low) .foot span:last-child{display:none}
.s:has(.phone-low){justify-content:flex-start}
.phone-sm{width:370px;height:700px;border-radius:52px;padding:12px}
.phone-sm .screen{border-radius:42px}
.chat-head{display:flex;gap:20px;align-items:center;padding:70px 34px 24px;border-bottom:1px solid #eee;background:#fafafa}
.chat-head .av{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#E3D8C9,#8C7660)}
.chat-head b{display:block;font-size:30px} .chat-head small{font-size:22px;color:#4caf50}
.chat{padding:30px;display:flex;flex-direction:column;gap:18px;background:#F4F1EC;height:100%}
.bub{align-self:flex-start;background:#fff;border-radius:30px 30px 30px 8px;padding:22px 28px;font-size:32px;line-height:1.3;max-width:85%;box-shadow:0 2px 4px rgba(0,0,0,.06)}
.typing{align-self:flex-start;background:#fff;border-radius:30px;padding:24px 28px;display:flex;gap:10px}
.typing i{width:14px;height:14px;border-radius:50%;background:#aaa}
.qa{display:flex;flex-direction:column;gap:22px}
.qa div{display:grid;grid-template-columns:330px 1fr;gap:24px;align-items:center;background:#fff;border-radius:26px;padding:30px 34px}
.qa .q{font-family:'Instrument Serif';font-style:italic;font-size:42px}
.qa .a{font-size:34px;line-height:1.3;font-weight:500;padding-left:24px;border-left:5px solid var(--lime)}
.words{display:flex;gap:22px;margin-top:60px;flex-wrap:wrap}
.words span{background:var(--lime);color:var(--ink);font-weight:700;font-size:46px;padding:16px 30px;border-radius:16px}
.words span:nth-child(2){transform:rotate(-3deg)} .words span:nth-child(3){transform:rotate(2deg)}
/* flags */
.flags-bg{position:absolute;top:90px;right:70px;font-size:120px;transform:rotate(10deg);letter-spacing:-.2em}
.flag{display:flex;gap:34px;align-items:flex-start;padding:46px 0;border-bottom:2px solid rgba(138,121,103,.35)}
.flag:last-child{border:0}
.flag>span{font-size:96px;line-height:1}
.flag h3{font-size:72px;line-height:1.04}
.flag p{font-size:36px;line-height:1.4;margin-top:20px;opacity:.75}
/* A/B */
.ab{display:flex;gap:44px;justify-content:center;margin-top:50px}
.ab-col{position:relative}
.ab-tag{position:absolute;top:-30px;left:-24px;z-index:2;width:96px;height:96px;border-radius:50%;background:var(--ink);color:var(--lime);font-family:'Instrument Serif';font-style:italic;font-size:58px;display:flex;align-items:center;justify-content:center}
.site-a{padding:60px 22px;font-family:'Times New Roman',serif;color:#333}
.sa-nav{font-size:22px;color:#00e;text-decoration:underline;margin-bottom:22px}
.site-a p{font-size:17px;line-height:1.45;text-align:justify}
.site-a u{display:block;margin-top:20px;color:#00e;font-size:17px}
.site-b{height:100%;display:flex;flex-direction:column}
.sb-hero{height:380px;background:linear-gradient(160deg,#5b4636,#c49a6c 60%,#2b2118);display:flex;align-items:flex-end;padding:26px;color:#fff;font-family:'Instrument Serif';font-style:italic;font-size:30px}
.sb-btn{margin:26px;background:var(--ink);color:#fff;text-align:center;border-radius:100px;padding:24px;font-weight:700;font-size:24px}
.sb-chips{display:flex;gap:10px;padding:0 22px;flex-wrap:wrap}
.sb-chips span{border:1.5px solid #ccc;border-radius:100px;padding:10px 16px;font-size:18px;font-weight:600}
.big-a{display:inline-flex;width:110px;height:110px;border-radius:50%;background:var(--ink);color:var(--lime);align-items:center;justify-content:center;font-style:italic;vertical-align:middle}
/* receipt */
.receipt{align-self:center;margin-top:60px;width:760px;background:#FBFAF6;color:#111;font-family:'Space Mono',monospace;padding:50px 54px 70px;position:relative;box-shadow:0 30px 60px rgba(0,0,0,.3)}
.receipt:after{content:'';position:absolute;left:0;right:0;bottom:-22px;height:24px;background:linear-gradient(-45deg,transparent 16px,#FBFAF6 0),linear-gradient(45deg,transparent 16px,#FBFAF6 0);background-size:32px 24px;background-position:left bottom}
.r-title{text-align:center;font-weight:700;font-size:44px;letter-spacing:.3em}
.r-sub{text-align:center;font-size:24px;margin:8px 0 30px;padding-bottom:24px;border-bottom:3px dashed #999}
.r-line{display:flex;justify-content:space-between;gap:20px;font-size:27px;line-height:1.3;padding:14px 0}
.r-line span:last-child{text-align:right;white-space:nowrap;font-weight:700}
.r-total{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:26px;border-top:3px dashed #999;font-weight:700;font-size:34px}
.r-total span:last-child{text-align:right;background:var(--lime);padding:6px 12px;line-height:1.2}
/* lock */
.phone-lock .screen{background:linear-gradient(170deg,#3a3128,#8C7660 55%,#C9B8A3);color:#fff}
.lock{padding:100px 30px;text-align:center}
.l-date{font-size:30px;font-weight:500;opacity:.9}
.l-time{font-size:150px;font-weight:600;letter-spacing:-.03em;line-height:1.05;margin-bottom:40px}
.notif{text-align:left;background:rgba(255,255,255,.78);color:#111;border-radius:34px;padding:22px 28px;margin-bottom:16px;backdrop-filter:blur(10px);display:grid;grid-template-columns:1fr auto}
.notif b{font-size:25px} .notif small{font-size:22px;color:#666}
.notif p{grid-column:1/3;font-size:27px;line-height:1.3;margin-top:4px}
.l-empty{margin-top:120px;font-size:30px;opacity:.75}
.mark{position:absolute;top:56px;left:100px;font-family:'Instrument Serif';font-size:30px;letter-spacing:-.01em}
.mark b{font-family:'DM Sans';font-weight:800;font-size:26px;letter-spacing:.02em}
.mark{font-size:34px}
.foot{position:absolute;z-index:5;left:100px;right:100px;bottom:56px;display:flex;justify-content:space-between;align-items:center;font-size:24px;font-weight:600;letter-spacing:.06em}
.foot .h{font-size:27px;letter-spacing:.01em}
.foot .dots{display:flex;gap:10px}
.foot .dots i{width:12px;height:12px;border-radius:50%;background:currentColor;opacity:.25}
.foot .dots i.on{opacity:1;width:34px;border-radius:10px}
`;

function slideHTML(sl, i, n) {
  const theme = sl.theme === 'lime' ? 'lime-bg' : sl.theme;
  const dots = n > 1 ? `<span class="dots">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>` : '<span>MediaWow webdesign</span>';
  const swipe = n > 1 && i === 0 ? '<span>Swipe →</span>' : dots;
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head>
<body><div class="s ${theme} grain"><div class="mark">Media<b>WOW</b></div>${sl.html}
<div class="foot"><span class="h">@media.wow</span>${swipe}</div></div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const p of posts) {
    const dir = path.join(OUT, p.id);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < p.slides.length; i++) {
      await page.setContent(slideHTML(p.slides[i], i, p.slides.length), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(dir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
    }
    fs.writeFileSync(path.join(dir, 'caption.txt'), p.caption + '\n');
    console.log('rendered', p.id, p.slides.length);
  }
  await browser.close();
})();
