// MediaWow week 3 (30 nov – 6 dec) — dambord: ma rood · di zacht · wo beige · do zacht · vr rood · za zacht · zo beige
const phone = (inner, cls = '') => `<div class="phone ${cls}"><div class="screen">${inner}</div></div>`;
const soft = (photo, h, sub, pos = '50% 50%') => ({ theme: 'photo', cls: 'soft', html: `
        <img class="bg-photo soft-img" src="{{img:${photo}}}" style="object-position:${pos}">
        <div class="soft-veil"></div>
        <div class="soft-handle">@media.wow</div>
        <div class="soft-mid"><h1>${h}</h1><div class="soft-sub">— ${sub}</div></div>
        <div class="soft-foot"><span>➤ Share</span><span>⌑ Save</span></div>` });

module.exports = [
  // ───────────── MA 30/11 · ROOD: GOOGLE ─────────────
  {
    id: '1-ma-google',
    slides: [
      { theme: 'dark', html: `
        <div class="kicker">Voor elke ondernemer</div>
        <h1 class="hero">Ik googelde je zaak. <em>Dit zag ik.</em></h1>
        <div class="gcard">
          <div class="g-top"><span class="g-logo">G</span><span class="g-q">jouw zaak</span></div>
          <div class="g-name">Jouw Zaak</div>
          <div class="g-meta">★★★★☆ 4,6 · 38 reviews</div>
          <div class="g-closed">Gesloten · <span>Opent wo 09:00</span></div>
          <div class="g-row"><b>Foto's</b><span>laatst bijgewerkt in 2022</span></div>
          <div class="g-row"><b>Website</b><span class="bad">deze site is niet bereikbaar</span></div>
          <div class="g-stamp">Klopt dit nog?</div>
        </div>` },
      { theme: 'greige', html: `
        <div class="kicker">01 — Waarom dit telt</div>
        <h2>Je klant ziet Google <em><span class="mark">vóór je website.</span></em></h2>
        <p class="lead">Kloppen je openingstijden niet, of staan er oude foto's? Dan twijfelt je klant al voordat hij doorklikt.</p>` },
      { theme: 'dark', html: `
        <div class="kicker">02 — Check het in 5 minuten</div>
        <h2>Google jezelf <em>vandaag nog.</em></h2>
        <div class="list">
          <div><i>01</i>Kloppen je openingstijden, ook rond de feestdagen?</div>
          <div><i>02</i>Staan er recente foto's van je zaak of je werk?</div>
          <div><i>03</i>Werkt de link naar je website, en laadt hij snel?</div>
          <div><i>04</i>Reageer je op je reviews?</div>
        </div>` },
      { theme: 'greige', html: `
        <div class="kicker">Hulp nodig?</div>
        <h1 class="lg">Ik kijk <em>gratis</em> met je mee.</h1>
        <p class="lead">Reageer TIPS en ik check je website én hoe je zaak op Google staat. Je krijgt 3 persoonlijke tips in je DM.</p>
        <div class="pill"><div class="av-user"></div><b>TIPS</b><span>Plaatsen</span></div>` },
    ],
    caption: `Ik googelde je zaak. Dit zag ik. 👀

Oude foto's. Openingstijden die niet kloppen. Een website die niet laadt.
Je klant ziet Google vóór je website, en twijfelt dan al.

Check het vandaag in 5 minuten:
✔️ kloppen je openingstijden, ook rond de feestdagen?
✔️ staan er recente foto's?
✔️ werkt de link naar je website?
✔️ reageer je op je reviews?

👇 Reageer TIPS en ik check gratis je website én je Google-vermelding. Je krijgt 3 persoonlijke tips in je DM.

#ondernemen #googlemijnbedrijf #lokaalondernemen #websitetips #horeca #salon #mediawow`,
  },

  // ───────────── DI 1/12 · ZACHT: GEMISTE OPROEP ─────────────
  {
    id: '2-di-gemiste-oproep',
    slides: [
      soft('story/telefoon-gemist.jpg', 'Ze belden. <em>Jij stond<br>te knippen.</em>', 'In de caption: zo boeken ze, terwijl jij gewoon werkt'),
      { theme: 'dark', html: `
        <div class="kicker">01 — Wat er gebeurt</div>
        <h1 class="lg">Niet opgenomen? <em>Dan bellen ze de volgende salon.</em></h1>
        <p class="lead">Jij staat met je handen in iemands haar. Je klant wil nú een afspraak. Online boeken vangt dat op.</p>` },
      { theme: 'greige', html: `
        <div class="kicker">02 — Zo regel je het</div>
        <h2>Een receptie <em>die nooit slaapt.</em></h2>
        <div class="list">
          <div><i>01</i>Een ‘Boek je behandeling’-knop op élke pagina</div>
          <div><i>02</i>Salonized of Treatwell netjes in je eigen website</div>
          <div><i>03</i>Prijzen per behandeling, zodat ze niet hoeven te bellen</div>
        </div>` },
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:mw-mockup-luvely-1-2.jpg}}" style="height:860px;object-position:50% 30%"><div class="bg-fade" style="background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 42%,#170a0b 64%)"></div>
        <div class="bottom">
          <div class="kicker">Websites voor salons</div>
          <h1 class="md">Een website die <em>je agenda vult.</em></h1>
          <p class="lead">Reageer TIPS voor een gratis website-check. Ontwerpen bekijken? mediawow.nl/beauty</p>
          <span class="btn lime-btn">Reageer: Tips</span>
        </div>` },
    ],
    caption: `Ze belden. Jij stond te knippen. 📱✂️

Niet opgenomen? Dan bellen ze gewoon de volgende salon. Niet omdat jij niet goed bent, maar omdat zij nú een afspraak willen.

Online boeken is een receptie die nooit slaapt:
✔️ een ‘Boek je behandeling’-knop op élke pagina
✔️ Salonized of Treatwell netjes in je eigen website
✔️ prijzen per behandeling, zodat ze niet hoeven te bellen

Bekijk 5 ontwerpen voor salons op mediawow.nl/beauty (link in bio), of reageer TIPS voor een gratis website-check 🤍

#salon #kapsalon #beautysalon #onlineboeken #salonized #treatwell #mediawow`,
  },

  // ───────────── WO 2/12 · BEIGE: WELKOM OP ONZE WEBSITE ─────────────
  {
    id: '3-wo-welkom',
    slides: [
      { theme: 'greige', html: `
        <div class="kicker">Openingszinnen</div>
        <h1 class="hero">Stop met <span class="strike-dark">‘Welkom op onze website’.</span></h1>
        <p class="lead">Je bezoeker weet al dat hij op je website is. Vertel liever wat hij hier krijgt.</p>
        <div class="hand" style="margin-top:30px">swipe voor 4 betere openers →</div>` },
      { theme: 'dark', html: `
        <div class="kicker">01 — Zo kan het wél</div>
        <div class="openers">
          <div><span class="sec">Restaurant</span><p>“Lunch, diner en borrel. <em>Reserveer je tafel in 1 tik.</em>”</p></div>
          <div><span class="sec">Kapsalon</span><p>“Kleur, knippen en advies. <em>Boek direct je afspraak.</em>”</p></div>
        </div>` },
      { theme: 'greige', html: `
        <div class="kicker">02 — Zo kan het wél</div>
        <div class="openers light">
          <div><span class="sec">Coach</span><p>“Voor ondernemers die vastlopen. <em>Plan een gratis kennismaking.</em>”</p></div>
          <div><span class="sec">Aannemer</span><p>“Verbouwen zonder stress. <em>Vraag vandaag een offerte aan.</em>”</p></div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">De formule</div>
        <h1 class="lg">Wat je doet + <em>wat ze nu moeten doen.</em></h1>
        <p class="lead">Twijfel je over de eerste zin van jóuw website? Reageer TIPS, dan schrijf ik er een betere voor je.</p>
        <span class="btn lime-btn">Reageer: Tips</span>` },
    ],
    caption: `Stop met ‘Welkom op onze website’. 🙅

Je bezoeker weet al dat hij op je website is. Vertel liever wat hij hier krijgt, en wat hij nu moet doen.

De formule: wat je doet + wat ze nu moeten doen.

🍽️ “Lunch, diner en borrel. Reserveer je tafel in 1 tik.”
💇 “Kleur, knippen en advies. Boek direct je afspraak.”
🧭 “Voor ondernemers die vastlopen. Plan een gratis kennismaking.”
🔨 “Verbouwen zonder stress. Vraag vandaag een offerte aan.”

👇 Twijfel je over de eerste zin van jóuw website? Reageer TIPS, dan schrijf ik er een betere voor je.

#webdesign #copywriting #websitetips #ondernemen #horeca #salon #coach #mediawow`,
  },

  // ───────────── DO 3/12 · ZACHT: ALLEEN TELEFONISCH ─────────────
  {
    id: '4-do-telefonisch',
    slides: [
      soft('story/telefoon-vintage.jpg', 'Reserveren? <em>Alleen<br>telefonisch.</em>', 'En dan vragen waarom de tafels leeg blijven'),
      { theme: 'dark', html: `
        <div class="kicker">01 — Wanneer reserveren gasten?</div>
        <div class="clock">23:14</div>
        <h2>Op de bank. <em>Als jij al dicht bent.</em></h2>
        <p class="lead">Een gast die ’s avonds wil reserveren, gaat niet om 14:00 terugbellen. Die kiest een zaak waar het online kan.</p>` },
      { theme: 'greige', html: `
        <div class="kicker">02 — Zo vang je ze wél</div>
        <h2>Reserveren <em>in één tik.</em></h2>
        <div class="list">
          <div><i>01</i>Een reserveerknop die je meteen ziet</div>
          <div><i>02</i>Zenchef of Guestplan direct op je eigen site</div>
          <div><i>03</i>Bevestiging en herinnering automatisch</div>
        </div>` },
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:mw-mockup-lilou-1-7.jpg}}" style="height:860px;object-position:50% 55%"><div class="bg-fade" style="background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 42%,#170a0b 64%)"></div>
        <div class="bottom">
          <div class="kicker">Websites voor horeca</div>
          <h1 class="md">Volle tafels, <em>ook om 23:14.</em></h1>
          <p class="lead">Reageer TIPS voor een gratis website-check. Ontwerpen bekijken? mediawow.nl/horeca</p>
          <span class="btn lime-btn">Reageer: Tips</span>
        </div>` },
    ],
    caption: `Reserveren? Alleen telefonisch. ☎️
En dan vragen waarom de tafels leeg blijven…

Gasten reserveren op de bank, om 23:14, als jij allang dicht bent. Die gaan niet de volgende dag om 14:00 terugbellen. Die kiezen een zaak waar het online kan.

Zo vang je ze wél:
✔️ een reserveerknop die je meteen ziet
✔️ Zenchef of Guestplan direct op je eigen site
✔️ bevestiging en herinnering automatisch

Bekijk de horeca-ontwerpen op mediawow.nl/horeca (link in bio), of reageer TIPS voor een gratis website-check 🤍

#horeca #restaurant #reserveren #zenchef #horecaondernemer #restaurantwebsite #mediawow`,
  },

  // ───────────── VR 4/12 · ROOD: SINTERKLAAS ─────────────
  {
    id: '5-vr-sinterklaas',
    slides: [
      { theme: 'dark', html: `
        <div class="kicker">Pakjesavond · 5 december</div>
        <h1 class="hero">Ze klikken op je ‘Over mij’. <em>Wat vinden ze?</em></h1>
        <div class="giftbox">
          <div class="gb-lid"></div><div class="gb-body"></div>
          <div class="gb-ribbon-v"></div><div class="gb-bow"></div>
          <div class="gb-tag"><b>Over mij</b><span>nog leeg…</span></div>
        </div>` },
      { theme: 'greige', html: `
        <div class="kicker">01 — Waarom dit telt</div>
        <h2>De pagina die ze <em><span class="mark">stiekem het vaakst openen.</span></em></h2>
        <p class="lead">Mensen kopen van mensen. Op je ‘Over mij’ beslissen ze of ze jou vertrouwen. Daar mag dus geen ‘Lorem ipsum’ of een lap cv staan.</p>` },
      { theme: 'dark', html: `
        <div class="kicker">02 — Zo vul je het pakje</div>
        <h2>Een ‘Over mij’ <em>die verkoopt.</em></h2>
        <div class="list">
          <div><i>01</i>Een echte foto van jou of je team</div>
          <div><i>02</i>Waarom je doet wat je doet, in een paar zinnen</div>
          <div><i>03</i>Voor wie je het doet, en voor wie niet</div>
          <div><i>04</i>Eindig met een knop: boek, plan of bel</div>
        </div>` },
      { theme: 'photo', html: `
        <img class="bg-photo" src="{{img:story/stoel-plaid.jpg}}" style="object-position:50% 40%"><div class="bg-fade" style="background:linear-gradient(180deg,rgba(58,16,17,.4),rgba(27,4,5,.7))"></div>
        <div class="fg">
        <div class="kicker">Fijne pakjesavond</div>
        <h1 class="lg">Zin in een cadeautje? <em>Een gratis website-check.</em></h1>
        <p class="lead">Reageer TIPS en ik kijk ook naar je ‘Over mij’. Je krijgt 3 persoonlijke tips in je DM.</p>
        <div class="pill"><div class="av-user"></div><b>TIPS</b><span>Plaatsen</span></div></div>` },
    ],
    caption: `Ze klikken op je ‘Over mij’. Wat vinden ze? 🎁

Het is de pagina die bezoekers stiekem het vaakst openen. Mensen kopen van mensen: daar beslissen ze of ze jou vertrouwen.

Zo vul je het pakje:
✔️ een echte foto van jou of je team
✔️ waarom je doet wat je doet, in een paar zinnen
✔️ voor wie je het doet (en voor wie niet)
✔️ eindig met een knop: boek, plan of bel

Fijne pakjesavond alvast! Zin in een cadeautje? 👇 Reageer TIPS voor een gratis website-check, ik kijk ook naar je ‘Over mij’.

#sinterklaas #pakjesavond #ondernemen #overmij #websitetips #mediawow`,
  },

  // ───────────── ZA 5/12 · ZACHT: COACHES ─────────────
  {
    id: '6-za-agenda-leeg',
    slides: [
      soft('story/lege-stoel-donker.jpg', 'Je agenda is leeg. <em>Je website ook?</em>', 'Voor coaches: in de caption 3 dingen die vertrouwen geven'),
      { theme: 'dark', html: `
        <div class="kicker">01 — Voor coaches</div>
        <h1 class="lg">Ze lezen je site. <em>En boeken niet.</em></h1>
        <p class="lead">Vaak niet omdat je niet goed bent, maar omdat ze niet zeker weten of jij de juiste coach voor hén bent.</p>` },
      { theme: 'greige', html: `
        <div class="kicker">02 — 3 dingen die vertrouwen geven</div>
        <div class="list">
          <div><i>01</i><b>Voor wie je bent.</b> In één zin, bovenaan.</div>
          <div><i>02</i><b>Ervaringen van klanten.</b> Met naam en gezicht.</div>
          <div><i>03</i><b>Een kleine eerste stap.</b> Een gratis kennismaking die je in één klik plant.</div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">Klaar voor januari?</div>
        <h1 class="lg">Ik kijk <em>gratis</em> mee.</h1>
        <p class="lead">Reageer TIPS en je krijgt 3 persoonlijke tips voor je coachwebsite in je DM.</p>
        <span class="btn lime-btn">Reageer: Tips</span>` },
    ],
    caption: `Je agenda is leeg. Je website ook? 🪑

Ze lezen je site… en boeken niet. Vaak niet omdat je niet goed bent, maar omdat ze niet zeker weten of jij de juiste coach voor hén bent.

3 dingen die vertrouwen geven:
✔️ voor wie je bent: in één zin, bovenaan
✔️ ervaringen van klanten, met naam en gezicht
✔️ een kleine eerste stap: een gratis kennismaking die je in één klik plant

👇 Reageer TIPS en je krijgt 3 persoonlijke tips voor je coachwebsite in je DM.

#coach #coaching #lifecoach #businesscoach #ondernemen #websitetips #mediawow`,
  },

  // ───────────── ZO 6/12 · BEIGE: TIJDLIJN ─────────────
  {
    id: '7-zo-tijdlijn',
    slides: [
      { theme: 'greige', html: `
        <div class="kicker">Achter de schermen</div>
        <h1 class="hero">Een nieuwe website. <em><span class="mark">Zonder gedoe.</span></em></h1>
        <div class="tl">
          <div><span class="dot"></span><b>Kennismaking</b><small>we drinken koffie (of bellen)</small></div>
          <div><span class="dot"></span><b>Moodboard & ontwerp</b><small>jij kijkt mee, ik ontwerp</small></div>
          <div><span class="dot"></span><b>Bouw</b><small>teksten, foto’s, koppelingen</small></div>
          <div><span class="dot lime"></span><b>Live!</b><small>met uitleg zodat je zelf kunt aanpassen</small></div>
        </div>` },
      { theme: 'dark', html: `
        <div class="kicker">Wat jij moet doen</div>
        <h1 class="lg">Meekijken. <em>Dat is het.</em></h1>
        <p class="lead">Ik regel strategie, ontwerp, bouw en techniek. Jij geeft feedback. Eén aanspreekpunt, van het eerste gesprek tot lang na livegang.</p>` },
      { theme: 'greige', html: `
        <div class="kicker">Zin om te beginnen?</div>
        <h1 class="lg">Laten we <em>vrijblijvend</em> kennismaken.</h1>
        <p class="lead">Reageer TIPS voor een gratis website-check. Daarna kunnen we altijd vrijblijvend kennismaken.</p>
        <span class="btn lime-btn">Reageer: Tips</span>` },
    ],
    caption: `Een nieuwe website, zonder gedoe. Zo gaat het ☕️

Zo gaat het bij MediaWow:
1️⃣ Kennismaking: we drinken koffie (of bellen)
2️⃣ Moodboard & ontwerp: jij kijkt mee, ik ontwerp
3️⃣ Bouw: teksten, foto’s en koppelingen
4️⃣ Live! Met uitleg, zodat je zelf dingen kunt aanpassen

En jij? Jij hoeft alleen mee te kijken. Eén aanspreekpunt, van het eerste gesprek tot lang na de livegang.

Zin om te beginnen? Plan een vrijblijvende kennismaking via mediawow.nl (link in bio), of reageer TIPS voor een gratis website-check 🤍

#achterdeschermen #webdesign #websitelatenmaken #ondernemen #mediawow`,
  },
];
