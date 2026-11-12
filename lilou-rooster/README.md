# Lilou Rooster

Online rooster-app voor Lilou: de leidinggevende plant diensten in, medewerkers loggen in
op hun telefoon of computer om hun rooster te zien en vragen zelf vakantie of vrije dagen aan.

## Wat zit erin

**Voor leidinggevenden**
- **Planning**: weekoverzicht per medewerker. Klik in een vakje om een dienst in te plannen
  (met snelkeuze-diensten en “ook op andere dagen”). Diensten zijn eerst *concept*; met
  **Publiceer** worden ze zichtbaar voor het team. **Kopieer vorige week** scheelt veel werk.
- Waarschuwingen bij dubbele diensten, verlof in dezelfde periode en uren boven contract.
- **Aanvragen**: verlof/vrije dagen goedkeuren of afwijzen (met reden), inclusief melding
  als iemand in die periode al is ingepland.
- **Team**: medewerkers, functie, contracturen, kleur, rol (medewerker/leidinggevende), actief/inactief.
- **Uren & export**: per maand, 4-wekenperiode of week de uren per medewerker, inclusief
  avond-, nacht-, zondag- en feestdaguren (NL-feestdagen automatisch), verlof- en ziektedagen
  en het verschil met het contract.
- **Exports** (Excel/CSV of kopiëren naar Excel): urenoverzicht voor de salarisadministratie,
  alle diensten in detail, verlof & ziekte, medewerkerslijst.
- **Afdrukken / PDF** van het weekrooster (A4 liggend), om op te hangen in de keuken.

**Voor medewerkers**
- **Mijn rooster**: eerstvolgende dienst en de komende 6 weken, met uren per week.
- **Zet in mijn agenda**: download alle diensten als agendabestand (iPhone, Google, Outlook).
- **Teamrooster**: zien wie wanneer werkt.
- **Aanvragen**: vakantie, vrije dag, niet beschikbaar of ziekmelding doorgeven en de status volgen.

Werkt als app: open de link op je telefoon en kies *Zet op beginscherm* (iPhone: deelknop →
“Zet op beginscherm”; Android: menu → “App installeren”).

## Demo

Zolang `supabaseUrl` in `config.js` leeg is, draait de app in **demo-modus** met voorbeelddata
die alleen in de browser wordt bewaard. Handig om te laten zien; niet om echt mee te werken.

## Live zetten (± 20 minuten)

De gegevens en logins worden opgeslagen in **Supabase** (gratis tot ruim 50.000 gebruikers,
servers in de EU mogelijk).

1. **Supabase-project aanmaken** — ga naar supabase.com → *New project*. Kies regio
   **Central EU (Frankfurt)** i.v.m. AVG.
2. **Database klaarzetten** — open *SQL Editor* → *New query*, plak de inhoud van
   [`supabase/schema.sql`](supabase/schema.sql) en klik *Run*.
3. **Eerste leidinggevende toevoegen** — voer in de SQL Editor uit (met je eigen gegevens):
   ```sql
   insert into public.employees (name, email, role, position)
   values ('Voornaam Achternaam', 'jij@lilou.nl', 'manager', 'Shiftleader');
   ```
4. **Sleutels invullen** — *Project Settings → API*: kopieer de *Project URL* en de
   *anon public* key naar `supabaseUrl` en `supabaseAnonKey` in `config.js`.
   (De anon key mag openbaar zijn; de beveiliging zit in de database-regels.)
5. **Online zetten** — upload de map `lilou-rooster` naar een host met https, bijvoorbeeld
   Netlify (map slepen op app.netlify.com/drop), Vercel of een subdomein als
   `rooster.lilou.nl` op de eigen hosting.
6. **Auth-instellingen** — in Supabase onder *Authentication → URL Configuration*:
   zet *Site URL* op het adres uit stap 5 en voeg datzelfde adres toe aan *Redirect URLs*.
   Optioneel: pas onder *Email Templates* de teksten aan naar het Nederlands.
7. **Inloggen** — open de site, kies *Eerste keer inloggen* met het e-mailadres uit stap 3,
   bevestig via de mail en je bent binnen als leidinggevende.

### Medewerkers toevoegen
Voeg ze toe onder **Team** met hun e-mailadres. Daarna kiezen ze zelf *Eerste keer inloggen*
met dat adres. Na bevestiging van hun mail worden ze automatisch aan hun profiel gekoppeld.
Bij een medewerker vind je de knop **Kopieer uitnodigingsbericht** om via WhatsApp te sturen.

### Aanpassen
In `config.js`: naam van de app, functies/posities en de snelkeuze-diensten.
Kleuren staan bovenaan `app.css` (`--accent`, `--text`, …).

## Van rooster naar boekhouding

1. **Plannen en publiceren** in de app.
2. **Einde periode** (maand of 4 weken, net hoe jullie verlonen): *Uren & export* →
   **Urenoverzicht voor salarisadministratie** downloaden.
3. **Salarisverwerking**: dat bestand gaat naar het salarispakket of het salarisbureau
   (bijv. Nmbrs, Loket, Horecalonen of de accountant). Die maken de loonstroken en de
   loonaangifte.
4. **Boekhouding**: het salarispakket levert per periode een *journaalpost* (brutoloon,
   loonheffing, pensioen, netto te betalen). Die boek je in het boekhoudpakket.

De rooster-app levert dus de **uren**; lonen, loonheffing en loonstroken horen in het
salarispakket, niet in de rooster-app. Let op: de export bevat *geplande* uren. Zodra de
Lightspeed-koppeling er is, kunnen dat *gewerkte* (geklokte) uren worden.

## Beveiliging
- Medewerkers zien alleen **gepubliceerde** diensten en alleen hun **eigen** aanvragen.
- Alleen leidinggevenden kunnen plannen, aanvragen beoordelen en het team beheren.
- Een account wordt pas aan een medewerker gekoppeld nadat het e-mailadres is bevestigd.
- Dit wordt afgedwongen in de database (Row Level Security), niet alleen in de app.

## Lightspeed
Deze app staat los van Lightspeed en heeft geen koppeling nodig om te werken.
Mogelijke vervolgstap: via de Lightspeed Restaurant (K-Series) API de geklokte uren of omzet
per dag ophalen, om geplande uren naast gewerkte uren en omzet te zetten. Dat vraagt een
API-koppeling (en een kleine server-functie) en kan later worden toegevoegd.

## Bestanden
| Bestand | Wat |
|---|---|
| `index.html` | De pagina |
| `app.js` | Alle app-logica (geen build-stap nodig) |
| `app.css` | Opmaak, licht/donker, mobiel |
| `config.js` | Instellingen + Supabase-sleutels |
| `supabase/schema.sql` | Database, koppelingen en beveiligingsregels |
| `manifest.webmanifest`, `sw.js`, `icon*` | Installeren als app op de telefoon |
