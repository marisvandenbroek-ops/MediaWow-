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
          <div class="pdf-page">
            <div class="pdf-title">KERSTMENU</div>
            <div class="pdf-lines">${tinyLines(26)}</div>
          </div>
          <div class="pinch">🔍</div>`, 'phone-low')}
        <div class="hand" style="position:absolute;left:110px;top:780px;transform:rotate(-5deg)">inzoomen… wachten… 😩</div>` },
      { theme: 'dark', html: `
        <div class="kicker">01 — Wat er gebeurt</div>
        <h1 class="lg">Inzoomen. Wachten. Scrollen. <em>Wegklikken.</em></h1>
        <p class="lead">Op een telefoon is een pdf-menu een afknapper. En in december zoeken gasten juist dáár naar jouw kerstdiner.</p>` },
      { theme: 'greige', html: `
        <div class="kicker">02 — Zo doe je het wél</div>
        <h2>Een kerstmenu <em>dat verkoopt.</em></h2>
        <div class="list">
          <div><i>01</i>Menu als gewone tekst op je site, goed leesbaar op mobiel</div>
          <div><i>02</i>Een opvallende ‘Reserveer je kerstdiner’-knop bovenaan</div>
          <div><i>03</i>Data, prijs per persoon en dieetwensen in één oogopslag</div>
        </div>` },
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

Zo doe je het wél:
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
        <div class="kicker">Voor horeca & salons · december</div>
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
          <div><i>04</i>Ook gewild bij salons: een behandeling cadeau</div>
        </div>` },
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:mw-home-lilou-interieur-1.jpg}}" style="height:860px;object-position:50% 45%"><div class="bg-fade" style="background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 42%,#170a0b 64%)"></div>
        <div class="bottom">
          <div class="kicker">Websites voor horeca</div>
          <h1 class="md">Cadeaubonnen met <em>aankooplink</em> op je eigen site.</h1>
          <p class="lead">Eenmalig €149 (excl. btw) als uitbreiding. Bekijk alle opties op mediawow.nl/horeca.</p>
          <span class="btn lime-btn">mediawow.nl/horeca</span>
        </div>` },
    ],
    caption: `Iemand zoekt nú een kadootje… 🎁
Verkoop jij al cadeaubonnen online?

Cadeaubonnen zijn omzet vooraf:
✔️ het geld komt nu binnen, de gast komt later
✔️ wie de bon krijgt, is vaak een nieuwe gast
✔️ online verkopen loopt door, ook als jij dicht bent

Heb je een website van MediaWow? Cadeaubonnen met aankooplink zijn een uitbreiding van eenmalig €149 (excl. btw). Bekijk alle opties op mediawow.nl/horeca (link in bio).

Of reageer CADEAU en ik vertel je hoe het werkt 🤍

#horeca #salon #cadeaubon #december #ondernemen #websitelatenmaken #mediawow`,
  },

  // ───────────── WO 25: DECEMBER-DRUKTE ─────────────
  {
    id: '3-wo-december-druk',
    slides: [
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:canva/foto-092.jpg}}" style="object-position:50% 100%;height:2100px;top:-750px">
        <div class="bg-fade" style="background:linear-gradient(180deg,rgba(0,0,0,.75) 0%,rgba(0,0,0,.55) 32%,rgba(0,0,0,0) 55%,rgba(0,0,0,.2) 100%)"></div>
        <div style="position:absolute;left:90px;right:90px;top:190px;z-index:2">
          <div class="kicker">December check</div>
          <h1 class="pf" style="font-size:96px;line-height:1;color:#fff">December is je drukste maand. <em>Kan je website het aan?</em></h1>
        </div>
        <div class="paper" style="left:520px;top:800px">
          <b>check vandaag:</b>
          <span>☐ openingstijden feestdagen</span>
          <span>☐ kerstmenu bovenaan</span>
          <span>☐ boekknop in 1 tik</span>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">01 — Wat er misgaat</div>
        <h1 class="lg">De drukste maand, <em>de meeste gemiste kansen.</em></h1>
        <div class="list">
          <div><i>01</i>Openingstijden rond de feestdagen kloppen niet</div>
          <div><i>02</i>Het kerstmenu staat drie klikken diep</div>
          <div><i>03</i>Je bent vol, maar je site laat het niet zien</div>
        </div>` },
      { theme: 'greige', html: `
        <div class="kicker">02 — 10 minuten werk</div>
        <h2>Zo maak je je site <em>december-proof.</em></h2>
        <div class="list">
          <div><i>01</i>Zet aangepaste openingstijden bovenaan je homepage</div>
          <div><i>02</i>Plaats een banner: ‘Kerstdiner? Reserveer hier’</div>
          <div><i>03</i>Vol? Zet een wachtlijst of alternatieve datum neer</div>
          <div><i>04</i>Check alles op je eigen telefoon</div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">Hulp nodig?</div>
        <h1 class="lg">Twijfel je of jouw site <em>december-proof</em> is?</h1>
        <p class="lead">Reageer TIPS en ik kijk gratis met je mee. Je krijgt 3 persoonlijke tips in je DM.</p>
        <span class="btn">Reageer: Tips</span>` },
    ],
    caption: `December is je drukste maand. Kan je website het aan? 🎄

Wat er vaak misgaat:
🔸 openingstijden rond de feestdagen kloppen niet
🔸 het kerstmenu staat drie klikken diep
🔸 je bent vol, maar je site laat het niet zien

In 10 minuten december-proof:
✔️ aangepaste openingstijden bovenaan je homepage
✔️ een banner: ‘Kerstdiner? Reserveer hier’
✔️ vol? zet een wachtlijst of alternatieve datum neer
✔️ check alles op je eigen telefoon

Bewaar deze post voor straks 📌

👇 Reageer TIPS en ik kijk gratis met je mee.

#horeca #salon #december #feestdagen #ondernemen #websitetips #mediawow`,
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
          <div class="np-i"><span class="cb"></span>menu / prijzen als tekst</div>
          <div class="np-i"><span class="cb"></span>boeken in 1 tik</div>
          <div class="np-i"><span class="cb"></span>cadeaubonnen online</div>
          <div class="np-i"><span class="cb"></span>snel op mobiel</div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">01 — 03</div>
        <div class="list">
          <div><i>01</i><b>Feestdagen-openingstijden.</b> Bovenaan, niet verstopt in je footer.</div>
          <div><i>02</i><b>Menu en prijzen als tekst.</b> Geen pdf, geen ‘vraag naar de mogelijkheden’.</div>
          <div><i>03</i><b>Boeken in 1 tik.</b> Reserveer- of boekknop op élke pagina.</div>
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
2️⃣ Menu en prijzen als tekst: geen pdf
3️⃣ Boeken in 1 tik: reserveer- of boekknop op élke pagina
4️⃣ Cadeaubonnen online: de makkelijkste extra omzet van december
5️⃣ Snel op mobiel: langer dan 3 tellen laden? Dan zijn ze weg

Hoeveel vinkjes zet jij? Zet je score in de comments 👇

Minder dan 5? Reageer TIPS voor een gratis website-check, of plan een kennismaking via mediawow.nl (link in bio).

#blackfriday #ondernemen #horeca #salon #websitetips #checklist #mediawow`,
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
