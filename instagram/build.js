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
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Caveat:wght@600&family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap';

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
/* ===== alles donker: variaties zodat het blijft boeien ===== */
.dark h2,.dark h1,.dark h3{color:#FAF4ED}
.dark .count{color:#E9D6C8} .dark .count span{color:rgba(250,244,237,.4)}
.dark .nums div{border-color:rgba(250,244,237,.14)} .dark .nums i{color:#E9D6C8}
.dark .list{border:0;display:flex;flex-direction:column;gap:16px}
.dark .list div{border:0;background:rgba(250,244,237,.06);border:1px solid rgba(250,244,237,.12);border-radius:6px;padding:30px 34px 30px 120px}
.dark .list i{left:36px;top:24px;font-size:52px;font-style:italic;color:#E9D6C8}
.dark .qa{border:0;display:flex;flex-direction:column;gap:16px}
.dark .qa div{border:0;background:#FAF4ED;color:var(--ink);border-radius:6px;padding:34px 40px}
.dark .qa .q{color:var(--wine)}
.dark .flag{background:#FAF4ED;color:var(--ink);border-radius:6px;padding:44px 46px;margin-bottom:22px;border:0}
.dark .flag h3{color:var(--ink)} .dark .flag em{color:var(--wine)}
.dark .flag p{color:var(--mauve);opacity:1}
.flagmark{background:#B3261E!important;box-shadow:0 0 0 10px rgba(179,38,30,.15)!important}
.dark .words span{border-color:rgba(250,244,237,.5)!important}
.dark .phone-side{box-shadow:0 40px 90px rgba(0,0,0,.5)}
.dark .card-img{box-shadow:0 30px 70px rgba(0,0,0,.45)}
.dark .big-a{background:#FAF4ED;color:var(--ink)}
.dark .ab-tag{background:#FAF4ED;color:var(--ink)}
.dark .lead{color:rgba(250,244,237,.8)}
/* ===== licht met rood: sprekend ===== */
.rood{background:#FAF4ED;color:#3A1011}
.rood em{color:#8E1F27}
.rood .kicker{color:#8E1F27}
.giant{font-family:'Instrument Serif';font-style:italic;font-size:450px;line-height:.8;letter-spacing:.02em;color:#3A1011;position:absolute;top:290px;left:70px;white-space:nowrap}
.band{position:absolute;left:0;right:0;bottom:0;height:560px;background:#3A1011;color:#FAF4ED;padding:80px 90px 0}
.band em{color:#E9D6C8} .band .lead{color:rgba(250,244,237,.82);opacity:1}
.s:has(.band) .ftr{color:#FAF4ED}
.s:has(.giant-a) .ftr span:last-child{display:none}
.rood .qa{border:0;display:flex;flex-direction:column;gap:16px}
.rood .qa div{border:0;background:#3A1011;color:#FAF4ED;border-radius:6px;padding:34px 40px}
.rood .qa .q{color:#E9D6C8}
.rood .list{border:0;display:flex;flex-direction:column;gap:16px}
.rood .list div{border:0;background:#3A1011;color:#FAF4ED;border-radius:6px;padding:30px 34px 30px 120px}
.rood .list i{left:36px;top:24px;font-size:52px;font-style:italic;color:#E9D6C8}
.rood .list em{color:#E9D6C8}
.rood .words span{background:#3A1011;color:#FAF4ED;border:0!important;padding:26px 38px}
.giant-a{position:absolute;right:-180px;bottom:-220px;width:860px;height:860px;border-radius:50%;background:#3A1011;color:#FAF4ED;font-family:'Instrument Serif';font-style:italic;font-size:680px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0 60px 80px 0}
/* ===== mooiere telefoon ===== */
.phone{position:relative;background:linear-gradient(145deg,#5a5a5c 0%,#1a1a1b 18%,#0b0b0c 50%,#2c2c2e 82%,#6a6a6c 100%);padding:14px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.08),0 2px 0 1px #000,0 50px 90px rgba(20,2,3,.55),0 18px 30px rgba(0,0,0,.35)}
.phone:after{content:'';position:absolute;right:-6px;top:24%;width:6px;height:13%;border-radius:0 4px 4px 0;background:linear-gradient(90deg,#2a2a2a,#5a5a5a)}
.phone:before{content:'';position:absolute;left:-6px;top:18%;width:6px;height:7%;border-radius:4px 0 0 4px;background:linear-gradient(270deg,#2a2a2a,#5a5a5a)}
.phone .screen:before{content:'';position:absolute;top:16px;left:50%;transform:translateX(-50%);width:30%;height:34px;border-radius:20px;background:#000;z-index:8}
.phone .screen:after{content:'';position:absolute;inset:0;pointer-events:none;z-index:9;background:linear-gradient(118deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.04) 28%,rgba(255,255,255,0) 40%)}
.phone-sm .screen:before{height:24px;top:12px}
.cover-cta{margin-top:50px}
.cc-label{font-size:26px;letter-spacing:.3em;text-transform:uppercase;color:#FAF4ED;margin-bottom:18px}
.cc-box{display:flex;align-items:center;gap:22px;background:#FAF4ED;color:#1B0405;border-radius:100px;padding:20px 34px 20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.45)}
.cc-box .av-user{flex:0 0 64px;height:64px}
.cc-typed{flex:1;font-size:46px;font-weight:600;letter-spacing:.04em}
.cc-typed:after{content:'';display:inline-block;width:4px;height:46px;background:#1B0405;margin-left:8px;vertical-align:-6px}
.cc-post{font-size:30px;font-weight:700;color:#3A1011;letter-spacing:.02em}
.phone-cover{position:absolute;left:50%;margin-left:-300px;top:880px;width:600px;height:1000px;transform:rotate(-3deg)}
.s:has(.phone-cover){justify-content:flex-start;padding-top:200px}
.s:has(.phone-cover) .ftr{display:none}
.phone-cover .bub{font-size:29px}
.tent{position:relative;margin:70px auto 0;width:700px;height:520px}
.tent-card{position:absolute;left:0;right:0;bottom:0;height:420px;background:#FDFBF7;color:#1B0405;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-shadow:0 40px 80px rgba(0,0,0,.55);transform:perspective(900px) rotateX(10deg)}
.tent-card:before{content:'';position:absolute;inset:22px;border:1.5px solid rgba(58,16,17,.25)}
.tent-top{position:absolute;left:30px;right:30px;bottom:400px;height:40px;background:#E9E2D6;transform:perspective(900px) rotateX(60deg);transform-origin:bottom}
.tc-k{font-size:24px;letter-spacing:.5em;text-transform:uppercase;color:#7A5A5A}
.tc-n{font-family:'Instrument Serif';font-style:italic;font-size:96px;line-height:1;margin:20px 0 14px}
.tc-d{font-size:30px;letter-spacing:.12em;color:#3A1011}
.noshow{position:absolute;right:-50px;top:40px;z-index:3;border:6px solid #B3261E;color:#B3261E;font-size:36px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;padding:18px 30px;transform:rotate(-12deg);background:rgba(253,251,247,.9)}
.big-stat{font-family:'Instrument Serif';font-size:230px;line-height:.9;margin-bottom:40px;display:flex;align-items:baseline;gap:30px}
.big-stat .from{color:rgba(250,244,237,.4);text-decoration:line-through;text-decoration-thickness:8px;text-decoration-color:#B3261E}
.big-stat .arr{font-size:.45em;color:rgba(250,244,237,.5)}
.big-stat .to{font-style:italic;color:#E9D6C8}
.src{margin-top:24px;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:rgba(250,244,237,.45)}
.laptop-wrap{position:relative;margin-top:56px;border-radius:6px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.5)}
.laptop-wrap img{display:block;width:100%;height:520px;object-fit:cover;object-position:50% 55%}
.neq{position:absolute;right:30px;bottom:30px;background:#1B0405;color:#FAF4ED;font-family:'Instrument Serif';font-style:italic;font-size:64px;padding:10px 30px}
/* ===== Instagram-stijl: greige · zwart · lime (Playfair) ===== */
.greige{background:#E9E5DF;color:#141414}
.greige h1,.greige h2,.greige h3,.pf{font-family:'Playfair Display',serif;font-weight:400;letter-spacing:-.02em}
.greige h1.hero{font-size:100px;line-height:1}
.greige .phone-low{bottom:-120px}
.nopad .hdr .h{color:#fff}
.nopad .hdr .logo-mask{background:#fff!important} .greige h1.xl{font-size:104px;line-height:1} .greige h1.lg{font-size:86px;line-height:1.02} .greige h1.md{font-size:76px;line-height:1.04} .greige h2{font-size:74px;line-height:1.04}
.greige em,.greige h1 em,.greige h3 em{color:#141414;font-style:italic}
.greige .kicker{color:#6b6258;font-weight:500;letter-spacing:.32em}
.greige .lead{color:#3a3530;opacity:1}
.greige .btn{background:#141414;color:#fff}
.mark{background:linear-gradient(transparent 55%,#E8F27A 55%,#E8F27A 92%,transparent 92%);padding:0 6px;margin:0 -6px}
.dark .mark,.photo .mark{color:inherit;background:linear-gradient(transparent 60%,rgba(232,242,122,.55) 60%,rgba(232,242,122,.55) 92%,transparent 92%)}
.hand{font-family:Caveat,cursive;font-weight:600;font-size:50px;color:#141414}
.dark .hand,.photo .hand{color:#E8F27A}
.ghost{position:absolute;font-family:'Playfair Display';font-style:italic;color:rgba(255,255,255,.55);white-space:nowrap;line-height:1}
.nopad{padding:0!important}
.panel{position:absolute;left:0;right:0;top:740px;bottom:0;padding:56px 90px 0}
.panel .kicker{margin-bottom:22px}
.pill{display:flex;align-items:center;gap:18px;background:#fff;border-radius:100px;padding:16px 30px 16px 16px;box-shadow:0 14px 40px rgba(0,0,0,.12);font-size:38px;margin-top:40px}
.pill .av-user{flex:0 0 58px;height:58px}
.pill b{flex:1;font-weight:600}.pill b:after{content:'';display:inline-block;width:3px;height:38px;background:#141414;margin-left:6px;vertical-align:-6px}
.pill span{font-weight:600;color:#3B82F6;font-size:28px}
.note{position:absolute;transform:rotate(-4deg);background:#E8F27A;color:#141414;font-family:Caveat;font-weight:600;font-size:48px;padding:14px 28px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.Mmark{position:absolute;top:150px;right:80px;font-family:'Playfair Display';font-size:120px;line-height:1;color:#E8F27A;z-index:5}
.lime-btn{background:#E8F27A!important;color:#141414!important}
.photo .kicker{color:rgba(255,255,255,.85)}
/* greige componenten */
.greige .list{border:0;display:flex;flex-direction:column;gap:14px}
.greige .list div{border:0;background:#fff;border-radius:6px;padding:28px 34px 28px 110px;color:#141414}
.greige .list i{left:34px;top:22px;font-family:'Playfair Display';font-style:italic;font-size:48px;color:#141414}
.greige .list div:first-child{box-shadow:inset 6px 0 0 #E8F27A}
.greige .qa{border:0;display:flex;flex-direction:column;gap:14px}
.greige .qa div{border:0;background:#fff;border-radius:6px;padding:32px 38px}
.greige .qa .q{font-family:'Playfair Display';color:#141414;font-size:48px}
.greige .qa .a{border-left-color:#E8F27A;border-left-width:6px}
.greige .flag{background:#fff;border-radius:6px;padding:42px 44px;margin-bottom:20px;border:0}
.greige .flag h3{font-size:62px;line-height:1.05}
.greige .flag p{color:#6b6258;opacity:1}
.greige .nums div{border-color:rgba(20,20,20,.12)} .greige .nums i{font-family:'Playfair Display';color:#141414}
.greige .nums b{background:linear-gradient(transparent 55%,#E8F27A 55%);padding:0 4px}
.greige .big-a{background:#141414;color:#E8F27A;font-family:'Playfair Display'}
.greige .ab-tag{background:#141414;color:#E8F27A;font-family:'Playfair Display'}
.greige .card-img{box-shadow:0 24px 50px rgba(0,0,0,.18)}
.greige .phone{box-shadow:0 40px 80px rgba(0,0,0,.25)}
.greige .receipt{box-shadow:0 30px 60px rgba(0,0,0,.18)}
.greige .r-total span:last-child{background:#E8F27A;color:#141414}
.greige .logo-mask.big{background:#141414!important}
.greige .Mcorner{position:absolute;top:150px;right:80px;font-family:'Playfair Display';font-size:110px;color:#E8F27A;line-height:1}
.fg{position:relative;z-index:2;display:flex;flex-direction:column}
.photo .bottom{z-index:2}
.photo .pill{color:#141414}
.framed{position:relative;margin-top:54px;height:640px;border-radius:6px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.2)}
.framed img{width:100%;height:100%;object-fit:cover;object-position:50% 55%}
.greige .doc{background:#fff;box-shadow:0 30px 60px rgba(0,0,0,.15)}
.greige .doc-stamp{background:rgba(255,255,255,.92)}
.photo .phone-sm{width:330px;height:620px}
.photo .fg .ab{margin-top:36px}
.dark .framed{box-shadow:0 30px 60px rgba(0,0,0,.5)}
.greige .big-stat .from{color:rgba(20,20,20,.3)}
.greige .big-stat .arr{color:rgba(20,20,20,.45)}
.greige .big-stat .to{color:#141414;background:linear-gradient(transparent 60%,#E8F27A 60%,#E8F27A 90%,transparent 90%)}
.greige .src{color:#6b6258}
`;

function slideHTML(sl, i, n) {
  const html = sl.html.replace(/\{\{img:([^}]+)\}\}/g, (_, f) => dataURI(f));
  const onDark = sl.theme === 'dark' || sl.theme === 'photo';
  const logoColor = onDark ? '#fff' : (sl.theme === 'greige' ? '#141414' : 'var(--bordeaux)');
  const counter = n > 1 ? (i === 0 ? 'Swipe →' : `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`) : 'mediawow.nl';
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head>
<body><div class="s ${sl.theme} ${sl.cls || ''}">${html}
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
