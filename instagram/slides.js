// MediaWow week 1 — huisstijl mediawow.nl (bordeaux · crème · wit, Instrument Serif + DM Sans, eigen logo).
// {{img:bestand}} wordt bij het bouwen vervangen door het beeld uit ./assets.
const phone = (inner, cls = '') => `<div class="phone ${cls}"><div class="screen">${inner}</div></div>`;
const avatarMW = `<div class="av-mw"><div class="logo-mask" style="background:#fff"></div></div>`;

module.exports = [
  // ───────────── MA: GRATIS WEBSITE-CHECK ─────────────
  {
    id: '1-ma-website-check',
    slides: [
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:portrait.png}}" style="top:-230px;height:calc(100% + 230px)">
        <div class="bg-fade"></div>
        <div class="bottom">
          <div class="kicker">Gratis website-check</div>
          <h1 class="hero">Je website verliest klanten.<br><em>Ik laat je zien waar.</em></h1>
        </div>` },
      { theme: 'cream', html: `
        <div class="kicker">01 — Waarom</div>
        <div class="count">3<span>·</span>2<span>·</span>1</div>
        <h2>Zo lang krijgt je website. <em>Daarna haken ze af.</em></h2>
        <p class="lead">Swipe: zo help ik je die paar tellen te winnen.</p>` },
      { theme: 'cream', html: `
        <div class="split">
          <div class="split-txt">
            <div class="kicker">02 — Zo werkt het</div>
            <div class="nums">
              <div><i>1</i><span>Reageer <b>TIPS</b> onder deze post</span></div>
              <div><i>2</i><span>Ik bekijk je site op mijn telefoon, net als je klant</span></div>
              <div><i>3</i><span>Jij krijgt <b>3 persoonlijke tips</b> in je DM</span></div>
            </div>
          </div>
          ${phone(`
            <div class="dm-head">${avatarMW}<div><b>media.wow</b><small>MediaWow Webdesign</small></div></div>
            <div class="chat">
              <div class="bub me">Hoi! Hier zijn je 3 tips 🤍</div>
              <div class="bub me"><b>1.</b> Zet je boekknop bovenaan, dan vinden klanten ‘m meteen.</div>
              <div class="bub me"><b>2.</b> Vertel in één zin wat je doet en voor wie.</div>
              <div class="bub me"><b>3.</b> Je foto's zijn prachtig. Laat ze groter zien!</div>
            </div>`, 'phone-side')}
        </div>` },
      { theme: 'cream', html: `
        <div class="kicker">03 — Hier kijk ik naar</div>
        <h2>Vier vragen, <em>vanuit je klant.</em></h2>
        <div class="list">
          <div><i>01</i>Snap ik binnen 5 tellen wat je doet?</div>
          <div><i>02</i>Zie ik meteen hoe ik boek of contact opneem?</div>
          <div><i>03</i>Werkt het lekker op mijn telefoon?</div>
          <div><i>04</i>Voelt het als <em>jóuw</em> zaak?</div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">Gratis, zonder verplichtingen</div>
        <h1 class="lg">Zin in <em>3 tips</em> voor jouw website?</h1>
        <div class="comments">
          <div class="cm"><div class="av-user"></div><div><b>jouwzaak.nl</b><p>TIPS 🤍</p></div></div>
          <div class="cm reply">${avatarMW}<div><b>media.wow</b><p>Leuk! Ik kijk ernaar. Check je DM ✨</p></div></div>
        </div>
        <span class="btn">Reageer: Tips</span>` },
    ],
    caption: `Je website verliest klanten. En vaak zie je zelf niet waar. 👀

Ik help je graag op weg 🤍

Gratis website-check:
1️⃣ Reageer TIPS
2️⃣ Ik bekijk je site op mijn telefoon, net als je klant
3️⃣ Je krijgt 3 persoonlijke tips in je DM

Geen verkooppraatje. Gewoon tips waar je meteen iets mee kunt.

Ken je een ondernemer die hier blij van wordt? Tag ze even 👇

#websitecheck #webdesign #ondernemen #websitetips #salon #horeca #mediawow`,
  },

  // ───────────── DI: DE APPJES ─────────────
  {
    id: '2-di-de-appjes',
    slides: [
      { theme: 'cream', html: `
        <div class="kicker">Voor salons</div>
        <h1 class="hero">Krijg jij deze appjes ook?<br><em>Dan mist je website iets.</em></h1>
        ${phone(`
          <div class="dm-head"><div class="av-user"></div><div><b>Nieuwe klant</b><small>online</small></div></div>
          <div class="chat">
            <div class="bub">Hoi! Wat kost knippen + föhnen? 😊</div>
            <div class="bub">En hebben jullie zaterdag nog plek?</div>
            <div class="bub">Kan ik ook gewoon online boeken?</div>
            <div class="bub">O ja, waar kan ik parkeren? 😅</div>
            <div class="typing"><i></i><i></i><i></i></div>
          </div>`, 'phone-low')}` },
      { theme: 'cream', html: `
        <div class="kicker">Eerlijk is eerlijk</div>
        <h1 class="lg">Elk appje is een vraag die <em>je website</em> had moeten beantwoorden.</h1>
        <p class="lead">…terwijl jij met je handen in iemands haar staat.</p>` },
      { theme: 'cream', html: `
        <div class="kicker">01 — Vraag → oplossing op je site</div>
        <div class="qa">
          <div><span class="q">“Wat kost…?”</span><span class="a">Prijslijst per behandeling</span></div>
          <div><span class="q">“Nog plek?”</span><span class="a">Online agenda direct in beeld</span></div>
          <div><span class="q">“Online boeken?”</span><span class="a">Boekknop bovenaan, op élke pagina</span></div>
          <div><span class="q">“Parkeren?”</span><span class="a">Route en parkeren bij contact</span></div>
        </div>` },
      { theme: 'cream', html: `
        <img class="card-img" src="{{img:mw-mockup-van-hees-salon-1.jpg}}" style="height:560px;object-position:50% 55%">
        <div class="kicker" style="margin-top:56px">02 — Het resultaat</div>
        <h1 class="lg">Minder appjes. <em>Meer boekingen.</em></h1>
        <p class="lead">En meer aandacht voor de klant in je stoel.</p>` },
      { theme: 'dark', html: `
        <div class="kicker">Benieuwd?</div>
        <h1 class="lg">Hoeveel appjes zou jouw website kunnen <em>opvangen?</em></h1>
        <p class="lead">Reageer TIPS en ik geef je 3 persoonlijke tips voor je website.</p>
        <span class="btn">Reageer: Tips</span>` },
    ],
    caption: `“Hoi! Wat kost knippen?”
“Hebben jullie zaterdag nog plek?”
“Kan ik online boeken?” 📱

Herkenbaar? Elk appje is een vraag die je website eigenlijk al had moeten beantwoorden. Terwijl jij gewoon aan het werk bent.

Swipe voor wat er op je site hoort, zodat je klant het zelf kan vinden →

Reageer TIPS en ik geef je 3 persoonlijke tips voor jouw website 🤍

Welk appje krijg jij het vaakst? Zet ‘m in de comments 👇

#salon #kapsalon #beautysalon #salonondernemer #websitelatenmaken #webdesign #mediawow`,
  },

  // ───────────── WO: RED FLAGS ─────────────
  {
    id: '3-wo-red-flags',
    slides: [
      { theme: 'dark', html: `
        <div class="kicker">4 red flags bij je webdesigner</div>
        <h1 class="hero">Van wie is jouw website <em>eigenlijk?</em></h1>
        <div class="doc">
          <div class="doc-h">Domeinregistratie</div>
          <div class="doc-r"><span>Domein</span><b>jouwzaak.nl</b></div>
          <div class="doc-r"><span>Betaald door</span><b>jij</b></div>
          <div class="doc-r flagged"><span>Eigenaar</span><b>Webbureau B.V.</b></div>
          <div class="doc-stamp">Niet van jou</div>
        </div>
        <p class="lead">Red flag nr. 1 ziet bijna niemand. Swipe →</p>` },
      { theme: 'cream', html: `
        <div class="kicker">01 — 02</div>
        <div class="flag"><span class="flagmark"></span><div><h3>Je domeinnaam staat op <em>hún</em> naam.</h3><p>Stap je over? Dan ben je je eigen adres kwijt.</p></div></div>
        <div class="flag"><span class="flagmark"></span><div><h3>Je zit jaren vast aan hun hosting.</h3><p>Opzeggen? Succes met die kleine lettertjes.</p></div></div>` },
      { theme: 'cream', html: `
        <div class="kicker">03 — 04</div>
        <div class="flag"><span class="flagmark"></span><div><h3>Je weet nooit wie je moet bellen.</h3><p>Ticketnummer 4831. Je hoort het nog.</p></div></div>
        <div class="flag"><span class="flagmark"></span><div><h3>‘Maatwerk’ dat verdacht veel op een template lijkt.</h3><p>Even googelen… o. Die site heeft je buurman ook.</p></div></div>` },
      { theme: 'cream', html: `
        <div class="kicker">En zo hoort het wél</div>
        <h2>Green flags <em>bij</em></h2>
        <div class="logo-mask big" style="background:var(--bordeaux);margin-top:26px"></div>
        <div class="list">
          <div><i>01</i>Domeinnaam op <em>jóuw</em> naam</div>
          <div><i>02</i>Hosting maandelijks opzegbaar</div>
          <div><i>03</i>Eén vast aanspreekpunt</div>
          <div><i>04</i>Echt maatwerk, geen template</div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">Herkenbaar?</div>
        <h1 class="lg">Herken je een red flag bij je <em>huidige website?</em></h1>
        <p class="lead">Stuur me een DM. Ik denk graag met je mee over je opties.</p>
        <span class="btn">Stuur een DM</span>` },
    ],
    caption: `Van wie is jouw website eigenlijk? 🤔
Red flag nr. 1 ziet bijna niemand.

🚩 Webdesigner red flags, gespot door… een webdesigner 🙋

🚩 Je domeinnaam staat op hún naam
🚩 Je zit jaren vast aan hun hosting
🚩 Je weet nooit wie je moet bellen
🚩 ‘Maatwerk’ dat verdacht veel op een template lijkt

En zo hoort het wél 💚
Domein op jouw naam, hosting die je maandelijks opzegt, één vast aanspreekpunt en écht maatwerk.

Zie je een 🚩 bij je eigen website? Stuur me een DM, dan vertel ik je eerlijk wat je opties zijn.

Welke red flag mist er nog? 👇

#webdesign #redflags #ondernemen #websitelatenmaken #ondernemerstips #mediawow`,
  },

  // ───────────── DO: A OF B ─────────────
  {
    id: '4-do-a-of-b',
    slides: [
      { theme: 'cream', html: `
        <div class="kicker center-t">Voor horeca · Kies maar</div>
        <h1 class="lg center-t">Welke krijgt <em>de reservering?</em></h1>
        <div class="ab">
          <div class="ab-col"><div class="ab-tag">A</div>${phone(`
            <div class="site-a">
              <div class="sa-nav">Restaurant</div>
              <p>Welkom op onze website. Wij zijn een gezellig restaurant in het centrum waar u terecht kunt voor lunch, diner en borrel. Onze keuken werkt met verse seizoensproducten en wij heten u graag welkom. Voor reserveringen kunt u ons bellen tijdens openingstijden…</p>
              <u>📄 menukaart_2024_def_v3.pdf</u>
            </div>`, 'phone-sm')}</div>
          <div class="ab-col"><div class="ab-tag">B</div>${phone(`
            <div class="site-b">
              <div class="sb-hero" style="background-image:url({{img:mw-home-lilou-interieur-1.jpg}})"><span>Lunch · Diner · Borrel</span></div>
              <div class="sb-btn">Reserveer een tafel</div>
              <div class="sb-chips"><span>Menu</span><span>Open tot 22:00</span><span>Route</span></div>
            </div>`, 'phone-sm')}</div>
        </div>
        <p class="lead center-t" style="margin-top:34px">Zeg het in de comments</p>` },
      { theme: 'cream', html: `
        <div class="kicker">Het antwoord</div>
        <h1 class="xl">B. <em>Natuurlijk.</em></h1>
        <div class="list">
          <div><i>01</i>Reserveren in één tik, direct in beeld</div>
          <div><i>02</i>Menu zonder pdf, gewoon leesbaar</div>
          <div><i>03</i>Openingstijden zonder zoeken</div>
          <div><i>04</i>Sfeer in plaats van een lap tekst</div>
        </div>` },
      { theme: 'cream', html: `
        <div class="kicker">Eerlijke vraag</div>
        <h1 class="lg">Lijkt jóuw website meer op <span class="big-a">A</span>?</h1>
        <p class="lead">Geen schaamte. Het gebeurt de beste.</p>` },
      { theme: 'cream', html: `
        <img class="card-img" src="{{img:mw-sneak-banner.jpg}}" style="height:420px">
        <div class="kicker" style="margin-top:56px">Gratis sneak preview</div>
        <h1 class="md">Van A naar B? <em>Daar ben ik voor.</em></h1>
        <p class="lead">Reageer PREVIEW en ik stuur je de link voor een gratis preview van je nieuwe website.</p>
        <span class="btn">Reageer: Preview</span>` },
    ],
    caption: `Welke krijgt de reservering: A of B? 🤔
Zeg het in de comments 👇

(Oké, makkelijke vraag. Maar kijk dan nu eens eerlijk naar je eigen website… 👀)

Wat B anders doet:
✔️ Reserveren in één tik
✔️ Menu zonder pdf
✔️ Openingstijden zonder zoeken
✔️ Sfeer in plaats van een lap tekst

Lijkt jouw site meer op A? Geen schaamte, gebeurt de beste 😅
Reageer PREVIEW en ik stuur je de link voor een gratis preview van je nieuwe website.

#horeca #restaurant #horecaondernemer #restaurantwebsite #webdesign #mediawow`,
  },

  // ───────────── VR: BONNETJES ─────────────
  {
    id: '5-vr-bonnetjes',
    slides: [
      { theme: 'dark', html: `
        <div class="kicker">Even afrekenen</div>
        <h1 class="lg">Je <em>‘goedkope’</em> website.</h1>
        <div class="receipt" style="transform:rotate(-2.5deg)">
          <div class="r-title">BONNETJE</div><div class="r-sub">doe-het-zelf-website</div>
          <div class="r-line"><span>Websitebouwer-abonnement</span><span>✓</span></div>
          <div class="r-line"><span>Premium template</span><span>✓</span></div>
          <div class="r-line"><span>Losse apps & plug-ins</span><span>✓</span></div>
          <div class="r-line"><span>Avonden zelf puzzelen</span><span>te veel</span></div>
          <div class="r-line"><span>Klanten die afhaken</span><span>???</span></div>
          <div class="r-total"><span>TOTAAL</span><span>duurder dan<br>je denkt</span></div>
        </div>` },
      { theme: 'cream', html: `
        <div class="kicker">En nu de mijne</div>
        <h1 class="md">Maatwerk, <em>zonder verrassingen.</em></h1>
        <div class="receipt" style="transform:rotate(1.5deg)">
          <div class="logo-mask r-logo" style="background:#1B0405"></div><div class="r-sub">maatwerk · rhenen</div>
          <div class="r-line"><span>Maatwerk website</span><span>v.a. €2.995</span></div>
          <div class="r-line"><span>of gespreid, incl. hosting & onderhoud</span><span>€165 p/m</span></div>
          <div class="r-line"><span>Eén aanspreekpunt</span><span>inbegrepen</span></div>
          <div class="r-line"><span>Domein op jouw naam</span><span>inbegrepen</span></div>
          <div class="r-line"><span>Avonden zelf puzzelen</span><span>0</span></div>
          <div class="r-total"><span>TOTAAL</span><span>tijd terug<br>voor je zaak</span></div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">Bonnetje bewaren?</div>
        <h1 class="xl">Laten we <em>kennismaken.</em></h1>
        <p class="lead">Vrijblijvend, via mediawow.nl. Of reageer PREVIEW voor een gratis preview van je nieuwe website.</p>
        <span class="btn">Plan een kennismaking</span>` },
    ],
    caption: `Je ‘goedkope’ website. Even afrekenen. 🧾

Abonnement ✓ Premium template ✓ Losse apps ✓
Avonden zelf puzzelen: te veel
Klanten die afhaken: ???

En nu de mijne 👇
✨ Maatwerk website vanaf €2.995
✨ Of gespreid: €165 p/m, incl. hosting en onderhoud
✨ Eén aanspreekpunt en je domein op jouw naam
✨ Avonden zelf puzzelen: 0

Bonnetje bewaren? Plan een vrijblijvende kennismaking via mediawow.nl (link in bio) of reageer PREVIEW voor een gratis preview.

#websitelatenmaken #webdesign #ondernemen #zzp #mediawow`,
  },

  // ───────────── ZA: LOCKSCREEN ─────────────
  {
    id: '6-za-lockscreen',
    slides: [
      { theme: 'dark', html: `
        <div class="kicker">Zaterdag, 08:30</div>
        <h1 class="lg">Zo hoort je zaterdag <em>te beginnen.</em></h1>
        ${phone(`
          <div class="lock"><div class="l-date">zaterdag 21 november</div><div class="l-time">08:30</div>
            <div class="notif"><b>Reserveringen</b><small>nu</small><p>Nieuwe reservering: 4 personen, vanavond 19:30</p></div>
            <div class="notif"><b>Boekingen</b><small>4 min</small><p>Nieuwe afspraak: knippen + kleuren, di 10:00</p></div>
            <div class="notif"><b>Website</b><small>12 min</small><p>Nieuw contactformulier: “Hoi! Ik wil graag…”</p></div>
            <div class="notif"><b>Reserveringen</b><small>31 min</small><p>Nieuwe reservering: 2 personen, zo 12:30</p></div>
          </div>`, 'phone-low phone-lock')}` },
      { theme: 'dark', html: `
        <div class="kicker">Of…</div>
        <h1 class="lg"><em>…zo.</em></h1>
        ${phone(`
          <div class="lock"><div class="l-date">zaterdag 21 november</div><div class="l-time">08:30</div>
            <div class="l-empty">Geen meldingen</div>
          </div>`, 'phone-low phone-lock')}` },
      { theme: 'cream', html: `
        <div class="kicker">01 — Het verschil</div>
        <h1 class="lg">Niet je zaak. <em>Je website.</em></h1>
        <div class="list">
          <div><i>01</i>Boek- of reserveerknop direct in beeld</div>
          <div><i>02</i>Je reserveringssysteem netjes gekoppeld</div>
          <div><i>03</i>Alles wat ze willen weten, zonder te appen</div>
        </div>` },
      { theme: 'cream', html: `
        <img class="card-img" src="{{img:mw-mockup-lilou-1-7.jpg}}" style="height:420px;object-position:50% 62%">
        <div class="kicker" style="margin-top:56px">Gratis sneak preview</div>
        <h1 class="md">Meer van die <em>meldingen?</em></h1>
        <p class="lead">Reageer PREVIEW en ik stuur je de link voor een gratis preview van je nieuwe website.</p>
        <span class="btn">Reageer: Preview</span>` },
    ],
    caption: `Zaterdagochtend. Koffie. Telefoon checken. ☕️📲

Zie jij dit… of “Geen meldingen”?

Het verschil zit vaak niet in je zaak, maar in je website:
✔️ boek- of reserveerknop direct in beeld
✔️ reserveringssysteem netjes gekoppeld (Zenchef, Resengo, Salonized, Treatwell)
✔️ alles wat je klant wil weten, zonder te hoeven appen

Wil jij meer van die meldingen? Reageer PREVIEW 🤍

#ondernemen #horeca #salon #websitelatenmaken #webdesign #mediawow`,
  },

  // ───────────── ZO: UNPOPULAR OPINION ─────────────
  {
    id: '7-zo-unpopular-opinion',
    slides: [
      { theme: 'dark', html: `
        <div class="kicker">Unpopular opinion</div>
        <h1 class="hero">Je hebt geen <span class="strike">mooiere</span> website nodig.</h1>
        <p class="lead">Ja, dat zegt een webdesigner. Swipe →</p>` },
      { theme: 'cream', html: `
        <h1 class="xl">Je hebt een website nodig die iets <em>dóét.</em></h1>
        <div class="words"><span>Boekt</span><span>Antwoordt</span><span>Verkoopt</span></div>
        <p class="lead">Ook als jij slaapt.</p>` },
      { theme: 'cream', html: `
        <img class="card-img" src="{{img:mw-mockup-mark-minkman-1-7.jpg}}" style="height:560px;object-position:50% 55%">
        <div class="kicker" style="margin-top:56px">Eens of oneens?</div>
        <h1 class="lg">Mooi is de basis. <em>Niet het doel.</em></h1>
        <p class="lead">Zeg het in de comments. Ik ben benieuwd.</p>` },
    ],
    caption: `Unpopular opinion: je hebt geen mooiere website nodig. 🙃
(ja, dat zegt een webdesigner)

Je hebt een website nodig die iets dóét.
Die boekt. Die antwoordt. Die verkoopt. Ook als jij op zondag op de bank ligt.

Mooi is de basis. Niet het doel.

Eens of oneens? Ik ben benieuwd 👇

#unpopularopinion #webdesign #ondernemen #websitelatenmaken #mediawow`,
  },
];
