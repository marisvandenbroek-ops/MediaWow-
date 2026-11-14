// MediaWow week 1 (v2): punchier formats. Each slide = { theme, html }.
const arrow = (rot = 0, w = 170) => `<svg class="arrow" style="width:${w}px;transform:rotate(${rot}deg)" viewBox="0 0 170 90" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M6 20 C 50 80, 110 85, 155 45"/><path d="M130 40 L157 43 L150 68"/></svg>`;
const phone = (inner, cls = '') => `<div class="phone ${cls}"><div class="screen">${inner}</div></div>`;

module.exports = [
  // ───────────── MA: WEBSITE ROAST ─────────────
  {
    id: '1-ma-website-roast',
    slides: [
      { theme: 'dark', html: `
        <div class="sticker" style="top:150px;right:90px">Gratis<br>& eerlijk</div>
        <div class="kicker">Durf jij?</div>
        <h1 class="xl">Stuur me<br>je website.</h1>
        <h1 class="xl lime"><em>Ik roast 'm.</em> 🔥</h1>
        <p class="lead">Eerlijk. Binnen een paar tellen.<br>Precies zoals je klant ernaar kijkt.</p>` },
      { theme: 'light', html: `
        <div class="kicker">Zo lang krijgt je website</div>
        <div class="count">3<span>…</span>2<span>…</span>1</div>
        <h2>Snapt je bezoeker het niet meteen? <span class="hl">Dan is hij weg.</span></h2>
        <p class="hand big" style="margin-top:40px">(en hij komt niet terug om het nog eens te proberen)</p>` },
      { theme: 'sand', html: `
        <div class="kicker">Zo werkt de roast</div>
        <div class="steps">
          <div class="step"><b>1</b><span>Reageer <span class="hl">ROAST</span> onder deze post</span></div>
          <div class="step"><b>2</b><span>Ik bekijk je site op mijn telefoon. Net als je klant.</span></div>
          <div class="step"><b>3</b><span>Je krijgt <span class="hl">3 eerlijke punten</span> in je DM</span></div>
        </div>
        <p class="hand big" style="margin-top:50px">Geen verkooppraatje. Gewoon wat ik zie.</p>` },
      { theme: 'light', html: `
        <div class="kicker">Hier let ik op</div>
        <div class="checks">
          <div>Snap ik binnen 5 tellen wat je doet?</div>
          <div>Zie ik meteen hoe ik boek of contact opneem?</div>
          <div>Werkt het lekker op mijn telefoon?</div>
          <div>Voelt het als <em>jóuw</em> zaak, of als een template?</div>
        </div>` },
      { theme: 'lime', html: `
        <h1 class="xl">Klaar voor<br>de roast?</h1>
        <div class="comment-box"><div class="av"></div><span class="typed">ROAST 🔥</span><span class="post">Plaatsen</span></div>
        <div class="hand-note" style="left:560px;top:860px">typ dit hier ${arrow(200, 150)}</div>` },
    ],
    caption: `Durf jij? 🔥

Ik roast je website. Gratis, eerlijk en door de ogen van je klant.

Zo werkt het:
1️⃣ Reageer ROAST
2️⃣ Ik bekijk je site op mijn telefoon, net als je klant
3️⃣ Je krijgt 3 eerlijke verbeterpunten in je DM

Geen verkooppraatje. Gewoon wat ik zie. 👀

Ken je iemand wiens website wel een roast kan gebruiken? Tag ze (met liefde 😇)

#websiteroast #webdesign #ondernemen #websitelatenmaken #salon #horeca #mediawow`,
  },

  // ───────────── DI: DE APPJES ─────────────
  {
    id: '2-di-de-appjes',
    slides: [
      { theme: 'light', html: `
        <h1 class="md">Herken je <span class="hl">deze appjes?</span></h1>
        ${phone(`
          <div class="chat-head"><div class="av"></div><div><b>Nieuwe klant</b><small>online</small></div></div>
          <div class="chat">
            <div class="bub">Hoi! Wat kost knippen + föhnen? 😊</div>
            <div class="bub">En hebben jullie zaterdag nog plek?</div>
            <div class="bub">Kan ik ook gewoon online boeken?</div>
            <div class="bub">O ja, waar kan ik parkeren? 😅</div>
            <div class="typing"><i></i><i></i><i></i></div>
          </div>`, 'phone-low')}` },
      { theme: 'dark', html: `
        <h1 class="lg">Elk appje is een vraag die <em class="lime">je website</em> had moeten beantwoorden.</h1>
        <p class="hand big lime" style="margin-top:60px">…terwijl jij met je handen in iemands haar staat.</p>` },
      { theme: 'light', html: `
        <div class="kicker">Vraag → oplossing op je site</div>
        <div class="qa">
          <div><span class="q">“Wat kost…?”</span><span class="a">Prijslijst per behandeling</span></div>
          <div><span class="q">“Nog plek?”</span><span class="a">Online agenda in beeld</span></div>
          <div><span class="q">“Online boeken?”</span><span class="a">Boekknop bovenaan, op élke pagina</span></div>
          <div><span class="q">“Parkeren?”</span><span class="a">Route & parkeren bij contact</span></div>
        </div>` },
      { theme: 'lime', html: `
        <h1 class="xl">Minder appjes.</h1>
        <h1 class="xl"><em>Meer boekingen.</em></h1>
        <p class="lead">En meer aandacht voor de klant in je stoel.</p>` },
      { theme: 'dark', html: `
        <div class="kicker">Benieuwd?</div>
        <h1 class="lg">Hoeveel appjes zou jouw website kunnen opvangen?</h1>
        <p class="lead">Reageer ROAST en ik kijk eerlijk mee.</p><div class="btn-line">Reageer: Roast</div>` },
    ],
    caption: `“Hoi! Wat kost knippen?”
“Hebben jullie zaterdag nog plek?”
“Kan ik online boeken?” 📱

Herkenbaar? Elk appje is een vraag die je website eigenlijk al had moeten beantwoorden. Terwijl jij gewoon aan het werk bent.

Swipe voor wat er op je site hoort, zodat je klant het zelf kan vinden →

Reageer ROAST en ik kijk eerlijk naar jouw website 🔥

Welk appje krijg jij het vaakst? Zet ‘m in de comments 👇

#salon #kapsalon #beautysalon #salonondernemer #websitelatenmaken #webdesign #mediawow`,
  },

  // ───────────── WO: RED FLAGS ─────────────
  {
    id: '3-wo-red-flags',
    slides: [
      { theme: 'dark', html: `
        <div class="flags-bg">🚩🚩🚩</div>
        <h1 class="xl">Webdesigner<br><em class="red">red flags</em></h1>
        <p class="hand big lime" style="margin-top:40px">gespot door… een webdesigner 🙋</p>` },
      { theme: 'light', html: `
        <div class="flag"><span>🚩</span><div><h3>Je domeinnaam staat op <em>hún</em> naam.</h3><p>Stap je over? Dan ben je je eigen adres kwijt.</p></div></div>
        <div class="flag"><span>🚩</span><div><h3>Je zit jaren vast aan hun hosting.</h3><p>Opzeggen? Succes met die kleine lettertjes.</p></div></div>` },
      { theme: 'sand', html: `
        <div class="flag"><span>🚩</span><div><h3>Je weet nooit wie je moet bellen.</h3><p>Ticketnummer 4831. Je hoort het nog.</p></div></div>
        <div class="flag"><span>🚩</span><div><h3>‘Maatwerk’ dat verdacht veel op een template lijkt.</h3><p>Even googelen… o. Die site heeft je buurman ook.</p></div></div>` },
      { theme: 'light', html: `
        <div class="kicker">En zo hoort het wél</div>
        <h1 class="md">Green flags 💚</h1>
        <div class="checks green">
          <div>Domeinnaam op <em>jóuw</em> naam</div>
          <div>Hosting maandelijks opzegbaar</div>
          <div>Eén vast aanspreekpunt</div>
          <div>Echt maatwerk, geen template</div>
        </div>
        <p class="hand big" style="margin-top:30px">(spoiler: zo werk ik dus 😉)</p>` },
      { theme: 'dark', html: `
        <h1 class="lg">Zie je een 🚩 bij je huidige website?</h1>
        <p class="lead">Stuur me een DM. Ik vertel je eerlijk wat je opties zijn.</p>
        <p class="hand big lime" style="margin-top:50px">Of tag iemand die dit moet zien 👀</p>` },
    ],
    caption: `🚩 Webdesigner red flags, gespot door… een webdesigner 🙋

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
      { theme: 'light', html: `
        <h1 class="md center-t">Welke krijgt <span class="hl">de reservering?</span></h1>
        <div class="ab">
          <div class="ab-col"><div class="ab-tag">A</div>${phone(`
            <div class="site-a">
              <div class="sa-nav">Restaurant</div>
              <p>Welkom op onze website. Wij zijn een gezellig restaurant in het centrum waar u terecht kunt voor lunch, diner en borrel. Onze keuken werkt met verse seizoensproducten en wij heten u graag welkom. Voor reserveringen kunt u ons bellen tijdens openingstijden…</p>
              <u>📄 menukaart_2024_def_v3.pdf</u>
            </div>`, 'phone-sm')}</div>
          <div class="ab-col"><div class="ab-tag">B</div>${phone(`
            <div class="site-b">
              <div class="sb-hero"><span>Lunch · Diner · Borrel</span></div>
              <div class="sb-btn">Reserveer een tafel</div>
              <div class="sb-chips"><span>Menu</span><span>Open tot 22:00</span><span>Route</span></div>
            </div>`, 'phone-sm')}</div>
        </div>
        <p class="hand big center-t" style="margin-top:28px">Zeg het in de comments 👇</p>` },
      { theme: 'dark', html: `
        <h1 class="xl">B. <em class="lime">Natuurlijk.</em></h1>
        <p class="lead">Maar waarom eigenlijk?</p>
        <div class="checks dark-checks" style="margin-top:50px">
          <div>Reserveren in één tik, direct in beeld</div>
          <div>Menu zonder pdf, gewoon leesbaar</div>
          <div>Openingstijden zonder zoeken</div>
          <div>Sfeer in plaats van een lap tekst</div>
        </div>` },
      { theme: 'sand', html: `
        <h1 class="lg">Eerlijke vraag:<br>lijkt jóuw website meer op <span class="big-a">A</span>?</h1>
        <p class="hand big" style="margin-top:40px">geen schaamte, gebeurt de beste 😅</p>` },
      { theme: 'lime', html: `
        <h1 class="lg">Van A naar B? Daar ben ik voor.</h1>
        <p class="lead">Reageer PREVIEW en ik stuur je de link voor een gratis preview van je nieuwe website.</p><div class="btn-line">Reageer: Preview</div>` },
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
        <h1 class="md">Je ‘goedkope’ website.<br><em class="lime">Even afrekenen.</em></h1>
        <div class="receipt" style="transform:rotate(-3deg)">
          <div class="r-title">BONNETJE</div><div class="r-sub">doe-het-zelf-website</div>
          <div class="r-line"><span>Websitebouwer-abonnement</span><span>✓</span></div>
          <div class="r-line"><span>Premium template</span><span>✓</span></div>
          <div class="r-line"><span>Losse apps & plug-ins</span><span>✓</span></div>
          <div class="r-line"><span>Avonden zelf puzzelen</span><span>te veel</span></div>
          <div class="r-line"><span>Klanten die afhaken</span><span>???</span></div>
          <div class="r-total"><span>TOTAAL</span><span>duurder dan<br>je denkt</span></div>
        </div>` },
      { theme: 'light', html: `
        <h1 class="md">En nu <span class="hl">de mijne.</span></h1>
        <div class="receipt" style="transform:rotate(2deg)">
          <div class="r-title">BONNETJE</div><div class="r-sub">MediaWow · maatwerk</div>
          <div class="r-line"><span>Maatwerk website</span><span>v.a. €2.995</span></div>
          <div class="r-line"><span>of maandelijks, incl. hosting & onderhoud</span><span>€165 p/m</span></div>
          <div class="r-line"><span>Eén aanspreekpunt</span><span>inbegrepen</span></div>
          <div class="r-line"><span>Domein op jouw naam</span><span>inbegrepen</span></div>
          <div class="r-line"><span>Avonden zelf puzzelen</span><span>0</span></div>
          <div class="r-total"><span>TOTAAL</span><span>tijd terug<br>voor je zaak</span></div>
        </div>` },
      { theme: 'lime', html: `
        <h1 class="xl">Bonnetje<br><em>bewaren?</em></h1>
        <p class="lead">Plan een kennismaking via mediawow.nl. Of reageer PREVIEW voor een gratis preview.</p><div class="btn-line">Plan een kennismaking</div>` },
    ],
    caption: `Je ‘goedkope’ website. Even afrekenen. 🧾

Abonnement ✓ Premium template ✓ Losse apps ✓
Avonden zelf puzzelen: te veel
Klanten die afhaken: ???

En nu de mijne 👇
✨ Maatwerk website vanaf €2.995
✨ Of maandelijks: €165 p/m, incl. hosting en onderhoud
✨ Eén aanspreekpunt en je domein op jouw naam
✨ Avonden zelf puzzelen: 0

Bonnetje bewaren? Plan een kennismaking via mediawow.nl (link in bio) of reageer PREVIEW voor een gratis preview.

#websitelatenmaken #webdesign #ondernemen #zzp #mediawow`,
  },

  // ───────────── ZA: LOCKSCREEN ─────────────
  {
    id: '6-za-lockscreen',
    slides: [
      { theme: 'dark', html: `
        <h1 class="md">Zo hoort je zaterdag<br><em class="lime">te beginnen.</em></h1>
        ${phone(`
          <div class="lock"><div class="l-date">zaterdag 21 november</div><div class="l-time">08:30</div>
            <div class="notif"><b>Reserveringen</b><small>nu</small><p>Nieuwe reservering: 4 personen, vanavond 19:30</p></div>
            <div class="notif"><b>Boekingen</b><small>4 min</small><p>Nieuwe afspraak: knippen + kleuren, di 10:00</p></div>
            <div class="notif"><b>Website</b><small>12 min</small><p>Nieuw contactformulier: “Hoi! Ik wil graag…”</p></div>
            <div class="notif"><b>Reserveringen</b><small>31 min</small><p>Nieuwe reservering: 2 personen, zo 12:30</p></div>
          </div>`, 'phone-low phone-lock')}` },
      { theme: 'dark', html: `
        <h1 class="md">…of zo.</h1>
        ${phone(`
          <div class="lock"><div class="l-date">zaterdag 21 november</div><div class="l-time">08:30</div>
            <div class="l-empty">Geen meldingen</div>
          </div>`, 'phone-low phone-lock')}` },
      { theme: 'light', html: `
        <h1 class="lg">Het verschil zit niet in je zaak.<br><span class="hl">Het zit in je website.</span></h1>
        <div class="checks" style="margin-top:40px">
          <div>Boek- of reserveerknop direct in beeld</div>
          <div>Je reserveringssysteem netjes gekoppeld</div>
          <div>Alles wat ze willen weten, zonder te appen</div>
        </div>` },
      { theme: 'lime', html: `
        <h1 class="lg">Wil jij meer van die meldingen?</h1>
        <p class="lead">Reageer PREVIEW en ik stuur je de link voor een gratis preview van je nieuwe website.</p><div class="btn-line">Reageer: Preview</div>` },
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
      { theme: 'lime', html: `
        <div class="pill">Unpopular opinion</div>
        <h1 class="xl">Je hebt geen <em>mooiere</em> website nodig.</h1>
        <p class="hand big" style="margin-top:40px">zegt de webdesigner 🙃</p>` },
      { theme: 'dark', html: `
        <h1 class="xl">Je hebt een website nodig die iets <em class="lime">dóét.</em></h1>
        <div class="words"><span>Boekt.</span><span>Antwoordt.</span><span>Verkoopt.</span></div>
        <p class="lead">Ook als jij slaapt.</p>` },
      { theme: 'light', html: `
        <h1 class="lg">Mooi is de basis.<br><span class="hl">Niet het doel.</span></h1>
        <p class="lead">Eens of oneens? Zeg het in de comments. Ik ben benieuwd 👇</p>` },
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
