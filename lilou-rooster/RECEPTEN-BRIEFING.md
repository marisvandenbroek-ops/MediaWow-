# Briefing: recepten-app voor Lilou

Dit document is de overdracht vanuit het gesprek waarin de rooster-app is gebouwd.
Lees het helemaal voordat je begint.

## Wie en wat
- **Lilou** is een Frans restaurant in Het Pomphuis, Klinkenbergerweg 41, Ede. Opening 2 december 2026.
  - Chef-eigenaar is Mark Minkman.
  - Mariska regelt gastvrouw, marketing en team. Zij is de gebruiker in de gesprekken en werkt via **MediaWow** (webdesign en branding).
- Mariska wil stap voor stap uitleg **in het Nederlands**: duidelijk, zonder jargon.
- Er bestaat al een **rooster-app** (PWA) op `https://rooster.lilou-ede.nl`. De code staat in deze repository, map `lilou-rooster/`. Lees ook `lilou-rooster/VOLGENDE-KEER.md`.

## Wat de recepten-app moet doen
- Een **aparte app** voor de keuken met alle recepten en gerechten van Lilou.
- **Importeren** van de recepten die nu staan in:
  - **Paprika** (receptenapp; export kan als `.paprikarecipes`-bestand, dat is een zip met gzip-JSON per recept, inclusief foto's);
  - **Dropbox** (losse bestanden: Word, pdf, foto's).

  Het importeren moet gebeuren zonder dat Mariska alles overtypt.
- Per recept: naam, categorie (bijvoorbeeld voor, hoofd, dessert, saus, basis, bites), ingrediënten met hoeveelheden, bereiding, porties of opbrengst, foto, **allergenen**, en bij voorkeur een **bordfoto en bordopbouw** ("platingkaart") en de mise-en-place per partie.
- Snel zoeken, ook op telefoon en tablet in de keuken.
- Later eventueel: kostprijs per gerecht, schalen naar aantal porties, koppeling met de menukaart en de allergenen in de rooster-app.
- Bepaal samen met Mariska wat in de eerste versie moet zitten. Begin klein.

## Techniek (hergebruik wat er al is)
- **Dezelfde Supabase** als de rooster-app (project "Lilou rooster", Pro-abonnement). Accounts en rollen bestaan al:
  - tabel `employees`, rollen `manager`, `planner` (shiftleader) en `staff`;
  - de functies `is_manager()`, `is_planner()` en `my_employee_id()` voor RLS.
- Maak eigen tabellen (bijvoorbeeld `recipes`, `recipe_ingredients`, `recipe_photos`) met RLS:
  - **lezen:** alleen medewerkers met een account; eventueel alleen keuken plus directie;
  - **schrijven:** directie en chefs.
- **Recepten zijn bedrijfsgeheim.** Niets openbaar maken, ook niet in openbare opslag.
- De rooster-app is vanilla JS zonder build-stap. Houd de recepten-app net zo eenvoudig: index.html, app.js en app.css, als PWA.
- Mogelijke plek: een eigen subdomein, bijvoorbeeld `recepten.lilou-ede.nl`. Of een tabblad in de rooster-app, als Mariska dat liever heeft. Bespreek dat eerst.
- **Hosting:** Vimexx/DirectAdmin. Mariska uploadt zelf zip-bestanden en pakt ze uit. Lever dus altijd één duidelijke zip, met stap-voor-stap uitleg.
- **Database-wijzigingen:**
  - via de Supabase MCP (Mariska moet het verzoek goedkeuren, het venster verloopt na ongeveer 1 minuut);
  - of als `.sql`-bestand om in de SQL Editor te plakken.

  Maak migraties altijd herhaalbaar (`if not exists`).
- **Testen:** Playwright staat klaar (`require('playwright')`). Zie `lilou-rooster/tests/` voor de opzet met een demo-modus en een lokale Postgres-test.

## Stijl van Lilou
- **Kleuren:** rood `#912508`, crème `#F9F3EC` / `#F9EFE6`, blush `#F5E2D9`, donkerbruin `#2B1611`.
- **Lettertype:** Inter (lokaal in `lilou-rooster/vendor/fonts`). Titels strak, **geen** serif-letter (dat wilde Mariska nadrukkelijk niet).
- **Logo's:** `lilou-rooster/brand/`.
- **Uitstraling:**
  - rustig, premium maar niet stijf;
  - lijn-iconen, geen emoji;
  - op de telefoon onderin maximaal 4 tabbladen plus "Meer";
  - grote, duidelijke knoppen;
  - goed leesbaar contrast, ook in donkere modus.

## Afspraken over veiligheid (strikt)
- Vraag nooit om wachtwoorden of geheime sleutels in de chat en toon ze nooit. Sleutels gaan alleen in **Supabase Secrets**; Mariska zet ze er zelf in.
- Zet nooit persoonlijke e-mailadressen in verzoeken aan externe diensten.
- Tests draaien nooit tegen de echte database.
- Vraag eerst toestemming voordat je iets verwijdert of naar buiten verstuurt.
- Medewerkers zien nooit lonen, uren of contactgegevens van collega's.

## Werkwijze die goed werkt
- Kort uitleggen wat je gaat doen, dan bouwen, dan zelf testen (ook op telefoonformaat), dan pas opleveren.
- Laat bij ontwerpkeuzes eerst een voor-en-na-afbeelding zien.
- Laat grote stukken werk controleren door een onafhankelijke controleur, en herstel wat die vindt.
- Commit en push naar de werkbranch, nooit naar main zonder toestemming.
