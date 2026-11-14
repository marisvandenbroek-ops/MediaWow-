// MediaWow week 2 (23–29 nov) — dambord: ma beige · di rood · wo foto · do rood · vr beige · (za Reel rood) · zo foto
const phone = (inner, cls = '') => `<div class="phone ${cls}"><div class="screen">${inner}</div></div>`;
const avatarMW = `<div class="av-mw"><div class="logo-mask" style="background:#fff"></div></div>`;
const tinyLines = n => Array.from({ length: n }, (_, i) => `<i style="width:${55 + ((i * 37) % 40)}%"></i>`).join('');

module.exports = [
  // ───────────── MA 23: KERST-PDF ─────────────
  {
    id: '1-ma-kerstmenu-pdf',
    slides: [
      { theme: 'greige', html: `
        <div class="kicker">Voor horeca · december</div>
        <h1 class="hero">Je kerstmenu staat in een pdf. <em><span class="mark">Je gasten scrollen door.</span></em></h1>
        ${phone(`
          <div class="pdf-bar"><span>‹</span><b>kerstmenu_2026_DEF_v4.pdf</b><span>⋯</span></div>
          <div class="pdf-load"><div class="pl-bar"><i></i></div><span>Downloaden… 8,4 MB</span></div>
          <div class="pdf-view">
            <div class="menu-page">
              <div class="mp-top">✦ Restaurant ✦</div>
              <div class="mp-title">Kerstmenu</div>
              <div class="mp-sub">24, 25 en 26 december · 5 gangen · € 79,50 p.p.</div>
              <div class="mc"><b>Amuse</b><span>Huisgemaakte brioche met truffelboter en gerookte zeezout</span></div>
              <div class="mc"><b>Voorgerecht</b><span>Carpaccio van rode biet, geitenkaas, walnoot en honing-tijm dressing</span></div>
              <div class="mc"><b>Tussengerecht</b><span>Bisque van langoustines met venkel en een crouton van zuurdesem</span></div>
              <div class="mc"><b>Hoofdgerecht</b><span>Hertenrug met knolselderij, bospaddenstoelen, rode kool en wildjus</span></div>
              <div class="mc"><b>Dessert</b><span>Chocolade, sinaasappel en kaneel in drie bereidingen</span></div>
              <div class="mp-foot">Allergieën? Meld het bij reservering. Reserveren uitsluitend telefonisch tussen 14:00 en 16:00 uur.</div>
            </div>
            <div class="menu-page faint"></div>
          </div>
          <div class="pdf-pager">1 / 4</div>`, 'phone-pdf')}
        <div class="hand" style="position:absolute;left:90px;top:900px;width:330px;transform:rotate(-6deg);line-height:1.15">inzoomen…<br>wachten…<br>wegklikken 😩</div>` },
      { theme: 'dark', html: `
        <div class="kicker">01 — Wat er gebeurt</div>
        <h1 class="lg">Inzoomen. Wachten. Scrollen. <em>Wegklikken.</em></h1>
        <p class="lead">Op een telefoon is een pdf-menu een afknapper. En in december zoeken gasten juist dáár naar jouw kerstdiner.</p>` },
      { theme: 'greige', html: `
        <div class="kicker">02 — Zo doe je het wél · Lilou in Ede</div>
        <h2>Een kerstmenu <em><span class="mark">dat verkoopt.</span></em></h2>
        <div class="duo">
          <div class="duo-col">${phone(`<img class="shot" src="{{img:lilou/kerst-top.png}}">`, 'phone-duo')}<div class="duo-cap">Reserveerknop in beeld</div></div>
          <div class="duo-col">${phone(`<img class="shot" src="{{img:lilou/kerst-mid.png}}">`, 'phone-duo')}<div class="duo-cap">Menu als tekst + prijzen</div></div>
        </div>
        <div class="hand" style="text-align:center;margin-top:34px;font-size:46px">gemaakt door MediaWow 🤍</div>` },
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:canva/foto-015.jpg}}"><div class="bg-fade" style="background:rgba(15,10,10,.66)"></div>
        <div class="fg">
        <div class="kicker">Gratis website-check</div>
        <h1 class="lg">Hoe scoort <em>jouw</em> kerstmenu online?</h1>
        <p class="lead">Reageer TIPS en ik bekijk je website op mijn telefoon. Je krijgt 3 persoonlijke tips in je DM.</p>
        <div class="pill"><div class="av-user"></div><b>TIPS</b><span>Plaatsen</span></div></div>` },
    ],
    caption: `Je kerstmenu staat in een pdf… en je gasten scrollen door. 🎄📱

Op een telefoon is een pdf-menu een afknapper: inzoomen, wachten, scrollen. En juist in december zoeken gasten op hun telefoon naar een plek voor het kerstdiner.

Zo doe je het wél (kijk maar naar het kerstmenu van @lilou_ede op slide 3):
✔️ menu als gewone tekst, goed leesbaar op mobiel
✔️ een opvallende ‘Reserveer je kerstdiner’-knop bovenaan
✔️ data, prijs per persoon en dieetwensen in één oogopslag

👇 Reageer TIPS en ik check jouw website gratis. Je krijgt 3 persoonlijke tips in je DM.

#horeca #kerstdiner #kerstmenu #restaurant #horecaondernemer #restaurantwebsite #mediawow`,
  },

  // ───────────── DI 24: CADEAUBONNEN ─────────────
  {
    id: '2-di-cadeaubonnen',
    slides: [
      { theme: 'dark', html: `
        <div class="kicker">Voor salons, horeca & meer · december</div>
        <h1 class="hero" style="font-size:96px">Iemand zoekt nú een kadootje. <em>Verkoop jij cadeaubonnen online?</em></h1>
        <div class="giftwrap">
          <div class="gnotif"><div class="n-ic">🎁</div><div class="n-b"><div class="n-top"><b>Webshop</b><small>nu</small></div><p>Nieuwe bestelling · Cadeaubon €50</p></div></div>
          <div class="giftcard">
            <div class="gc-ribbon"></div><div class="gc-bow"></div>
            <div class="gc-k">Cadeaubon</div>
            <div class="gc-v">€50</div>
            <div class="gc-s">voor een avond uit</div>
          </div>
        </div>` },
      { theme: 'greige', html: `
        <div class="kicker">01 — Waarom dit werkt</div>
        <h2>Cadeaubonnen zijn <em>omzet vooraf.</em></h2>
        <div class="list">
          <div><i>01</i>Het geld komt nu binnen, de gast komt later</div>
          <div><i>02</i>Wie de bon krijgt, is vaak een nieuwe gast</div>
          <div><i>03</i>Online verkopen loopt door, ook als jij dicht bent</div>
          <div><i>04</i>Een behandeling, een diner of een sessie: alles kan een cadeaubon zijn</div>
        </div>` },
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:mw-mockup-luvely-1-2.jpg}}" style="height:860px;object-position:50% 30%"><div class="bg-fade" style="background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 42%,#170a0b 64%)"></div>
        <div class="bottom">
          <div class="kicker">Voor salons & horeca</div>
          <h1 class="md">Cadeaubonnen met <em>aankooplink</em> op je eigen site.</h1>
          <p class="lead">Eenmalig €149 (excl. btw) als uitbreiding op je MediaWow-website. Reageer CADEAU en ik vertel je hoe het werkt.</p>
          <span class="btn lime-btn">Reageer: Cadeau</span>
        </div>` },
    ],
    caption: `Iemand zoekt nú een kadootje… 🎁
Verkoop jij al cadeaubonnen online?

Een behandeling, een diner of een sessie: alles kan een cadeaubon zijn. En cadeaubonnen zijn omzet vooraf:
✔️ het geld komt nu binnen, de klant komt later
✔️ wie de bon krijgt, is vaak een nieuwe klant
✔️ online verkopen loopt door, ook als jij dicht bent

Heb je een website van MediaWow? Cadeaubonnen met aankooplink zijn een uitbreiding van eenmalig €149 (excl. btw).

👇 Reageer CADEAU en ik vertel je hoe het werkt 🤍

#salon #beautysalon #horeca #cadeaubon #december #ondernemen #mediawow`,
  },

  // ───────────── WO 25: COACHES & GOEDE VOORNEMENS ─────────────
  {
    id: '3-wo-coaches-januari',
    slides: [
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:canva/foto-092.jpg}}" style="object-position:50% 100%;height:2100px;top:-750px">
        <div class="bg-fade" style="background:linear-gradient(180deg,rgba(0,0,0,.75) 0%,rgba(0,0,0,.55) 32%,rgba(0,0,0,0) 55%,rgba(0,0,0,.2) 100%)"></div>
        <div style="position:absolute;left:90px;right:90px;top:190px;z-index:2">
          <div class="kicker">Voor coaches</div>
          <h1 class="pf" style="font-size:100px;line-height:1;color:#fff">In januari zoeken ze een coach. <em>Vinden ze jóu?</em></h1>
        </div>
        <div class="paper" style="left:500px;top:820px">
          <b>voornemens 2027:</b>
          <span>☐ meer rust</span>
          <span>☐ eindelijk die stap zetten</span>
          <span>☐ een coach zoeken</span>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">01 — Het zoekmoment</div>
        <h1 class="lg">Goede voornemens beginnen <em>bij Google.</em></h1>
        <p class="lead">Rond nieuwjaar zoeken mensen hulp: een coach, een traject, een nieuwe start. Dan beslist je website binnen een paar tellen of ze bij jóu verder kijken.</p>` },
      { theme: 'greige', html: `
        <div class="kicker">02 — Wat een coachwebsite nodig heeft</div>
        <h2>Vertrouwen <em>in één oogopslag.</em></h2>
        <div class="list">
          <div><i>01</i>In één zin: voor wie je bent en wat je oplost</div>
          <div><i>02</i>Een gratis kennismaking die je in één klik plant</div>
          <div><i>03</i>Ervaringen van echte klanten</div>
          <div><i>04</i>Jij, op een echte foto. Geen stockbeeld</div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">Klaar voor januari?</div>
        <h1 class="lg">Ik kijk vóór 1 januari <em>met je mee.</em></h1>
        <p class="lead">Reageer TIPS en je krijgt 3 persoonlijke tips voor je coachwebsite in je DM. Gratis.</p>
        <span class="btn">Reageer: Tips</span>` },
    ],
    caption: `In januari zoeken ze een coach. Vinden ze jóu? 🗓️

Goede voornemens beginnen bij Google. Rond nieuwjaar zoeken mensen hulp: een coach, een traject, een nieuwe start. Je website beslist dan binnen een paar tellen of ze bij jou verder kijken.

Wat een coachwebsite nodig heeft:
✔️ in één zin: voor wie je bent en wat je oplost
✔️ een gratis kennismaking die je in één klik plant
✔️ ervaringen van echte klanten
✔️ jij, op een echte foto. Geen stockbeeld

👇 Reageer TIPS en ik kijk vóór 1 januari gratis met je mee.

Ken je een coach die dit moet zien? Tag ze even 🤍

#coach #lifecoach #coaching #ondernemen #websitelatenmaken #webdesign #mediawow`,
  },

  // ───────────── DO 26: BLACK FRIDAY OPINIE ─────────────
  {
    id: '4-do-black-friday',
    slides: [
      { theme: 'dark', html: `
        <div class="kicker">Morgen is het Black Friday</div>
        <h1 class="hero" style="font-size:104px">Black Friday-korting op je website? <em>Liever niet.</em></h1>
        <div class="tagwrap">
          <div class="pricetag">
            <div class="pt-hole"></div>
            <div class="pt-k">Website</div>
            <div class="pt-off">-50%</div>
            <div class="pt-s">alleen vandaag!</div>
          </div>
          <div class="mw-stamp">Maatwerk</div>
        </div>` },
      { theme: 'greige', html: `
        <div class="kicker">01 — Waarom niet</div>
        <h2>Een website is <em>geen impulsaankoop.</em></h2>
        <div class="list">
          <div><i>01</i>Je kiest hem voor jaren, niet voor één dag</div>
          <div><i>02</i>Haast leidt tot een site die niet bij je past</div>
          <div><i>03</i>Korting zegt niets over wat hij je oplevert</div>
        </div>` },
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:canva/foto-094.jpg}}"><div class="bg-fade" style="background:rgba(15,10,10,.64)"></div>
        <div class="fg">
        <div class="kicker">Wat ik wél doe</div>
        <h1 class="lg">Het hele jaar door: <em>een gratis website-check.</em></h1>
        <p class="lead">Geen deadline, geen afteltimer. Gewoon eerlijk advies.</p>
        <div class="hand" style="margin-top:30px">eens of oneens? zeg het in de comments ↓</div></div>` },
    ],
    caption: `Unpopular opinion: Black Friday-korting op je website? Liever niet. 🙃

Een website is geen impulsaankoop:
🔸 je kiest hem voor jaren, niet voor één dag
🔸 haast leidt tot een site die niet bij je past
🔸 korting zegt niets over wat hij je oplevert

Wat ik wél doe: het hele jaar door een gratis website-check. Geen deadline, geen afteltimer. Gewoon eerlijk advies.

Eens of oneens? Ik ben benieuwd 👇

#blackfriday #webdesign #ondernemen #websitelatenmaken #unpopularopinion #mediawow`,
  },

  // ───────────── VR 27: CHECKLIST VÓÓR 1 DEC ─────────────
  {
    id: '5-vr-checklist',
    slides: [
      { theme: 'greige', html: `
        <div class="kicker">Bewaar deze post 📌</div>
        <h1 class="hero">5 dingen die je website moet kunnen <em><span class="mark">vóór 1 december.</span></em></h1>
        <div class="notepad">
          <div class="np-h">to do · december</div>
          <div class="np-i"><span class="cb"></span>feestdagen-openingstijden</div>
          <div class="np-i"><span class="cb"></span>prijzen & aanbod als tekst</div>
          <div class="np-i"><span class="cb"></span>boeken / plannen in 1 tik</div>
          <div class="np-i"><span class="cb"></span>cadeaubonnen online</div>
          <div class="np-i"><span class="cb"></span>snel op mobiel</div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">01 — 03</div>
        <div class="list">
          <div><i>01</i><b>Feestdagen-openingstijden.</b> Bovenaan, niet verstopt in je footer.</div>
          <div><i>02</i><b>Prijzen en aanbod als tekst.</b> Geen pdf, geen ‘vraag naar de mogelijkheden’.</div>
          <div><i>03</i><b>Boeken in 1 tik.</b> Reserveren, afspraak of kennismaking: de knop staat op élke pagina.</div>
        </div>` },
      { theme: 'greige', html: `
        <div class="kicker">04 — 05</div>
        <div class="list">
          <div><i>04</i><b>Cadeaubonnen online.</b> De makkelijkste extra omzet van december.</div>
          <div><i>05</i><b>Snel op mobiel.</b> Laadt je site langer dan 3 tellen? Dan zijn ze weg.</div>
        </div>
        <div class="hand" style="margin-top:40px">hoeveel vinkjes zet jij? ✓</div>` },
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:canva/foto-157.jpg}}" style="object-position:50% 30%"><div class="bg-fade" style="background:rgba(15,10,10,.6)"></div>
        <div class="fg">
        <div class="kicker">Minder dan 5 vinkjes?</div>
        <h1 class="lg">Ik help je <em>vóór december</em> op weg.</h1>
        <p class="lead">Reageer TIPS voor een gratis website-check, of plan een kennismaking via mediawow.nl.</p>
        <div class="pill"><div class="av-user"></div><b>TIPS</b><span>Plaatsen</span></div></div>` },
    ],
    caption: `5 dingen die je website moet kunnen vóór 1 december ✅
(bewaar deze post 📌)

1️⃣ Feestdagen-openingstijden: bovenaan, niet in je footer
2️⃣ Prijzen en aanbod als tekst: geen pdf
3️⃣ Boeken in 1 tik: reserveren, afspraak of kennismaking, op élke pagina
4️⃣ Cadeaubonnen online: de makkelijkste extra omzet van december
5️⃣ Snel op mobiel: langer dan 3 tellen laden? Dan zijn ze weg

Hoeveel vinkjes zet jij? Zet je score in de comments 👇

Minder dan 5? Reageer TIPS voor een gratis website-check, of plan een kennismaking via mediawow.nl (link in bio).

#blackfriday #ondernemen #horeca #salon #coach #websitetips #checklist #mediawow`,
  },

  // ───────────── ZO 29: BEGIN NU ─────────────
  {
    id: '7-zo-begin-nu',
    slides: [
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:canva/foto-060.jpg}}">
        <div class="bg-fade" style="background:rgba(15,10,10,.35)"></div>
        <div class="ghost" style="left:-30px;bottom:120px;font-size:330px;color:rgba(255,255,255,.22)">januari</div>
        <div style="position:absolute;left:90px;right:90px;top:300px;z-index:2;text-align:center">
          <div class="kicker">Daily reminder</div>
          <h1 class="pf" style="font-size:120px;line-height:1;color:#fff">Begin niet in januari. <em><span class="mark">Begin nu.</span></em></h1>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">Waarom nu?</div>
        <h1 class="lg">In januari wil iedereen tegelijk <em>een nieuwe website.</em></h1>
        <p class="lead">Wie in december start, staat in januari al live. Bij MediaWow ben je binnen drie weken online.</p>` },
      { theme: 'greige', html: `
        <div class="kicker">Zin om te beginnen?</div>
        <h1 class="lg">Laten we <em>vrijblijvend</em> kennismaken.</h1>
        <p class="lead">Plan een kennismaking via mediawow.nl, of reageer TIPS voor een gratis website-check.</p>
        <span class="btn">Plan een kennismaking</span>` },
    ],
    caption: `Begin niet in januari. Begin nu. ☕️

In januari wil iedereen tegelijk een nieuwe website. Wie in december start, staat in januari al live. Bij MediaWow ben je binnen drie weken online.

Zin om te beginnen? Plan een vrijblijvende kennismaking via mediawow.nl (link in bio), of reageer TIPS voor een gratis website-check 🤍

#zondag #ondernemen #websitelatenmaken #webdesign #nieuwjaar #mediawow`,
  },
];
