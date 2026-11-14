// Renders slides.js to 1080x1350 (4:5) PNGs + caption.txt in ./week-1, in the mediawow.nl house style.
// Usage: node build.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const posts = require('./slides.js');

const OUT = path.join(__dirname, 'week-1');
const ASSETS = path.join(__dirname, 'assets');
const dataURI = f => `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(path.join(ASSETS, f)).toString('base64');
const LOGO = dataURI('logo-zwart.png'); // used as a mask, so it can take any colour
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap';

const CSS = `
:root{--ink:#1B0405;--bordeaux:#3A1011;--wine:#561C1E;--mauve:#7A5A5A;--cream:#FAF4ED;--white:#FFFFFF;--line:rgba(58,16,17,.16)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
.s{width:1080px;height:1350px;position:relative;overflow:hidden;padding:180px 90px 150px;display:flex;flex-direction:column;justify-content:center;font-family:'DM Sans',sans-serif}
.cream{background:var(--cream);color:var(--bordeaux)} .white{background:var(--white);color:var(--bordeaux)}
.dark,.photo{background:radial-gradient(110% 70% at 85% 110%,#3A1011 0%,#1B0405 62%);color:#FAF4ED}
.dark .lead{color:rgba(250,244,237,.8);opacity:1}
h1,h2,h3{font-family:'Instrument Serif',serif;font-weight:400;letter-spacing:-.01em}
h1.xl{font-size:140px;line-height:.95} h1.lg{font-size:112px;line-height:.98} h1.md{font-size:92px;line-height:1}
h2{font-size:92px;line-height:1}
h1.hero{font-size:154px;line-height:.92;letter-spacing:-.02em}
.s:has(.phone-low) h1.hero{font-size:100px}
.s:has(.phone-low) .phone-low{bottom:-300px}
.s:has(.doc) h1.hero{font-size:128px}
.strike{position:relative;font-style:italic;color:#E9D6C8;white-space:nowrap}
.strike:after{content:'';position:absolute;left:-10px;right:-10px;top:52%;height:9px;background:#E9D6C8;transform:rotate(-4deg);border-radius:6px}
.doc{margin-top:54px;background:#FAF4ED;color:var(--ink);padding:40px 46px;position:relative;transform:rotate(-1.5deg);box-shadow:0 30px 60px rgba(0,0,0,.35)}
.doc-h{font-size:22px;letter-spacing:.4em;text-transform:uppercase;color:var(--mauve);padding-bottom:22px;border-bottom:1.5px solid var(--line)}
.doc-r{display:flex;justify-content:space-between;font-size:34px;padding:22px 0;border-bottom:1.5px solid var(--line)}
.doc-r span{font-weight:300;color:var(--mauve)} .doc-r b{font-weight:600}
.doc-r.flagged b{color:#B3261E;text-decoration:underline wavy #B3261E;text-underline-offset:10px}
.doc-stamp{position:absolute;right:30px;bottom:-34px;border:4px solid #B3261E;color:#B3261E;font-size:26px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;padding:14px 22px;transform:rotate(-8deg);background:rgba(250,244,237,.92)}
em{font-style:italic}
.cream em,.white em{color:var(--wine)}
.kicker{font-size:23px;letter-spacing:.42em;text-transform:uppercase;font-weight:400;margin-bottom:38px;color:var(--mauve)}
.dark .kicker,.photo .kicker{color:rgba(255,255,255,.62)}
.lead{font-size:38px;line-height:1.45;font-weight:300;margin-top:40px;max-width:860px;opacity:.85}
.btn{align-self:flex-start;display:inline-block;margin-top:56px;padding:30px 50px;font-size:23px;letter-spacing:.38em;text-transform:uppercase;font-weight:500;background:var(--bordeaux);color:#fff}
.dark .btn,.photo .btn{background:#FAF4ED;color:var(--ink)}
.dark em,.photo em{color:#E9D6C8}
.center-t{text-align:center;align-self:center}
/* header / footer */
.hdr{position:absolute;top:70px;left:90px;right:90px;display:flex;justify-content:space-between;align-items:center;z-index:6}
.logo-mask{aspect-ratio:1058/244;-webkit-mask:url(${LOGO}) no-repeat center/contain;mask:url(${LOGO}) no-repeat center/contain}
.hdr .logo-mask{height:54px}
.hdr .h{font-size:21px;letter-spacing:.34em;text-transform:uppercase;opacity:.7}
.ftr{position:absolute;left:90px;right:90px;bottom:64px;display:flex;justify-content:space-between;font-size:21px;letter-spacing:.34em;text-transform:uppercase;opacity:.6;z-index:6}
.logo-mask.big{height:96px;align-self:flex-start;width:416px}
/* photo cover */
.bg-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.bg-fade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,4,5,.6) 0%,rgba(27,4,5,0) 20%,rgba(27,4,5,.1) 40%,rgba(27,4,5,.9) 68%,#1B0405 100%)}
.photo .bottom{position:absolute;left:90px;right:90px;bottom:150px;display:flex;flex-direction:column}
.card-img{width:100%;object-fit:cover;border-radius:6px;display:block}
.count{font-family:'Instrument Serif';font-style:italic;font-size:280px;line-height:.9;margin:0 0 40px;color:var(--wine)}
.count span{font-size:.4em;color:var(--mauve);margin:0 18px;vertical-align:middle}
/* lists */
.list{margin-top:50px;border-top:1.5px solid var(--line)}
.list div{position:relative;padding:30px 0 30px 90px;font-size:40px;line-height:1.3;font-weight:300;border-bottom:1.5px solid var(--line)}
.list i{position:absolute;left:0;top:32px;font-family:'Instrument Serif';font-size:40px;color:var(--mauve)}
.dark .list,.dark .list div{border-color:rgba(255,255,255,.16)} .dark .list i{color:rgba(255,255,255,.55)}
.nums div{display:flex;gap:28px;align-items:flex-start;font-size:36px;line-height:1.35;font-weight:300;padding:30px 0;border-bottom:1.5px solid var(--line)}
.nums i{font-family:'Instrument Serif';font-size:72px;line-height:.8;color:var(--wine);flex:0 0 46px}
.nums b{font-weight:600}
.qa{border-top:1.5px solid var(--line)}
.qa div{display:grid;grid-template-columns:360px 1fr;gap:30px;align-items:center;padding:38px 0;border-bottom:1.5px solid var(--line)}
.qa .q{font-family:'Instrument Serif';font-style:italic;font-size:56px;color:var(--wine)}
.qa .a{font-size:34px;line-height:1.35;font-weight:300}
.words{display:flex;gap:18px;margin-top:56px;flex-wrap:wrap}
.cream .words span{border-color:rgba(58,16,17,.35)!important}
.words span{border:1.5px solid rgba(255,255,255,.55);padding:22px 34px;font-size:23px;letter-spacing:.38em;text-transform:uppercase}
.flag{display:flex;gap:34px;align-items:flex-start;padding:46px 0;border-bottom:1.5px solid var(--line)}
.flag:last-child{border:0}
.flagmark{flex:0 0 26px;height:26px;margin-top:26px;border-radius:50%;background:var(--wine);box-shadow:0 0 0 10px rgba(86,28,30,.12)}
.flag h3{font-size:78px;line-height:1}
.flag p{font-size:34px;line-height:1.4;margin-top:22px;font-weight:300;opacity:.85}
/* split + phones */
.split{display:flex;gap:40px;align-items:center}
.split-txt{flex:1}
.phone{background:#120304;border-radius:70px;padding:15px;box-shadow:0 40px 80px rgba(27,4,5,.35)}
.phone .screen{background:#fff;border-radius:56px;height:100%;overflow:hidden;position:relative;color:#1B0405}
.phone-side{flex:0 0 430px;height:880px;border-radius:62px}
.phone-low{position:absolute;right:110px;bottom:-170px;width:540px;height:1000px;transform:rotate(4deg)}
.s:has(.phone-low),.s:has(.phone-big){justify-content:flex-start;padding-top:190px}
.phone-big{position:absolute;right:70px;top:500px;width:640px;height:1160px;transform:rotate(3deg)}
.s:has(.phone-big) .ftr{display:none}
.s:has(.phone-big) h1.hero{font-size:112px}
.phone-big .lock{padding:56px 26px}
.phone-big .l-date{font-size:24px}
.phone-big .l-time{font-size:104px;margin-bottom:22px}
.phone-big .notif p{font-size:23px}
.phone-big .notif{padding:16px 20px;margin-bottom:10px}
.s:has(.phone-low) .ftr{display:none}
.phone-sm{width:370px;height:700px;border-radius:52px;padding:12px}
.phone-sm .screen{border-radius:42px}
.dm-head{display:flex;gap:18px;align-items:center;padding:66px 26px 22px;border-bottom:1px solid #eee;background:#fff}
.dm-head b{display:block;font-size:26px} .dm-head small{font-size:20px;color:#888}
.av-mw{flex:0 0 70px;height:70px;border-radius:50%;background:#000;display:flex;align-items:center;justify-content:center}
.av-mw .logo-mask{width:58px}
.av-user{flex:0 0 70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#E9DCCD,#A88E78)}
.chat{padding:26px;display:flex;flex-direction:column;gap:16px;background:#FAF4ED;height:100%}
.bub{align-self:flex-start;background:#fff;border-radius:28px 28px 28px 8px;padding:20px 26px;font-size:28px;line-height:1.3;max-width:88%}
.bub.me{align-self:flex-end;background:var(--bordeaux);color:#fff;border-radius:28px 28px 8px 28px}
.phone-low .bub{font-size:31px}
.typing{align-self:flex-start;background:#fff;border-radius:30px;padding:22px 26px;display:flex;gap:10px}
.typing i{width:13px;height:13px;border-radius:50%;background:#bbb}
.comments{margin-top:60px;background:#fff;color:var(--ink);border-radius:8px;padding:34px 36px;display:flex;flex-direction:column;gap:30px}
.cm{display:flex;gap:22px;align-items:center}
.cm b{font-size:27px} .cm p{font-size:32px;margin-top:4px}
.cm.reply{margin-left:92px}
/* A/B */
.ab{display:flex;gap:44px;justify-content:center;margin-top:50px}
.ab-col{position:relative}
.ab-tag{position:absolute;top:-30px;left:-24px;z-index:2;width:96px;height:96px;border-radius:50%;background:var(--bordeaux);color:#fff;font-family:'Instrument Serif';font-style:italic;font-size:58px;display:flex;align-items:center;justify-content:center}
.site-a{padding:60px 22px;font-family:'Times New Roman',serif;color:#333}
.sa-nav{font-size:22px;color:#00e;text-decoration:underline;margin-bottom:22px}
.site-a p{font-size:17px;line-height:1.45;text-align:justify}
.site-a u{display:block;margin-top:20px;color:#00e;font-size:17px}
.site-b{height:100%;display:flex;flex-direction:column}
.sb-hero{height:390px;background-size:cover;background-position:center;display:flex;align-items:flex-end;padding:26px;color:#fff;font-family:'Instrument Serif';font-style:italic;font-size:32px;box-shadow:inset 0 -140px 80px -40px rgba(0,0,0,.55)}
.sb-btn{margin:24px;background:var(--bordeaux);color:#fff;text-align:center;padding:22px;font-size:16px;letter-spacing:.24em;text-transform:uppercase}
.sb-chips{display:flex;gap:10px;padding:0 22px;flex-wrap:wrap}
.sb-chips span{border:1.5px solid #ddd;padding:10px 14px;font-size:17px}
.big-a{display:inline-flex;width:116px;height:116px;border-radius:50%;background:var(--bordeaux);color:#fff;align-items:center;justify-content:center;font-style:italic;vertical-align:middle}
/* receipt */
.receipt{align-self:center;margin-top:56px;width:780px;background:#FDFBF7;color:#1B0405;font-family:'Space Mono',monospace;padding:48px 54px 66px;position:relative;box-shadow:0 30px 60px rgba(0,0,0,.28)}
.receipt:after{content:'';position:absolute;left:0;right:0;bottom:-22px;height:24px;background:linear-gradient(-45deg,transparent 16px,#FDFBF7 0),linear-gradient(45deg,transparent 16px,#FDFBF7 0);background-size:32px 24px;background-position:left bottom}
.r-title{text-align:center;font-weight:700;font-size:42px;letter-spacing:.3em}
.r-logo{height:70px;margin:0 auto}
.r-sub{text-align:center;font-size:22px;margin:10px 0 26px;padding-bottom:22px;border-bottom:3px dashed #aaa;text-transform:uppercase;letter-spacing:.2em}
.r-line{display:flex;justify-content:space-between;gap:20px;font-size:26px;line-height:1.3;padding:13px 0}
.r-line span:last-child{text-align:right;white-space:nowrap;font-weight:700}
.r-total{display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px;padding-top:24px;border-top:3px dashed #aaa;font-weight:700;font-size:32px}
.r-total span:last-child{text-align:right;background:var(--bordeaux);color:#fff;padding:6px 12px;line-height:1.2}
/* lockscreen */
.phone-lock .screen{background:linear-gradient(170deg,#2E1517,#561C1E 50%,#A88E78);color:#fff}
.lock{padding:100px 30px;text-align:center}
.l-date{font-size:30px;font-weight:500;opacity:.9}
.l-time{font-size:140px;font-weight:600;letter-spacing:-.03em;line-height:1.05;margin-bottom:30px}
.notif{text-align:left;background:rgba(255,255,255,.82);color:#111;border-radius:30px;padding:18px 22px;margin-bottom:12px;display:flex;gap:16px;align-items:center}
.n-ic{flex:0 0 52px;height:52px;border-radius:12px;background:#FAF4ED;display:flex;align-items:center;justify-content:center;font-size:28px}
.n-b{flex:1}.n-top{display:flex;justify-content:space-between}
.n-more{margin-top:6px;font-size:22px;color:rgba(255,255,255,.85);background:rgba(255,255,255,.18);border-radius:20px;padding:10px 0}
.notif b{font-size:25px} .notif small{font-size:22px;color:#666}
.notif p{font-size:24px;line-height:1.3;margin-top:2px}
.l-empty{margin-top:120px;font-size:30px;opacity:.75}
`;

function slideHTML(sl, i, n) {
  const html = sl.html.replace(/\{\{img:([^}]+)\}\}/g, (_, f) => dataURI(f));
  const onDark = sl.theme === 'dark' || sl.theme === 'photo';
  const logoColor = onDark ? '#fff' : 'var(--bordeaux)';
  const counter = n > 1 ? (i === 0 ? 'Swipe →' : `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`) : 'mediawow.nl';
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head>
<body><div class="s ${sl.theme}">${html}
<div class="hdr"><div class="logo-mask" style="background:${logoColor}"></div><span class="h">@media.wow</span></div>
<div class="ftr"><span>mediawow.nl</span><span>${counter}</span></div></div></body></html>`;
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
