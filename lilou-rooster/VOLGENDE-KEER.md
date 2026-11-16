# Volgende keer (afspraken met Mariska)

Werkwijze: stap voor stap, in gewone taal. Eén stap tegelijk, wachten op "klaar", dan controleren.
Nooit wachtwoorden of geheime sleutels typen of laten zien; Mariska logt zelf in.

## Stand van zaken
- Update 17 staat live (schema, mail-rooster, agenda-functie, app-bestanden). Wachtwoord minimaal 8 tekens.
- Update 19 (prikbord blijft staan + knop 'Ik ben ziek') staat LIVE; uitnodigingsmail-template opgeslagen in Supabase; invite-employee met voornaam is live (via Supabase-koppeling).
- Werkwijze: Supabase doe ik zelf via de Supabase-koppeling (Mariska klikt Toestaan); Mariska uploadt alleen de zip in DirectAdmin.

- Update 20: bijlagen (pdf/foto) openen in de app zelf (pdf.js in vendor/pdfjs), Instellingen/Aanvragen passen op telefoon,
  knop 'Komende diensten uit het rooster halen' bij medewerker + bulk met één melding (shifts_bulk staat LIVE in Supabase).

- Lijsten (afvinken met naam+tijd, temperaturen, ontvangst, kerntemp, meldingen) staan LIVE in Supabase; app in update 22.
  Werkdag loopt tot 05:00. Vinkjes nooit echt weg (spoor). Koelingen K1-K3/V1 zijn voorbeeldnamen: in Instellingen aanpassen.

## Te doen
1. KLAAR: Prikbord: gelezen mededelingen blijven altijd staan (ingeklapt, met ✓), alleen directie verwijdert. Knop "Gelezen" blijft.
   Ziekmelden beter vindbaar maken: aparte knop "Ik ben ziek" (nu verstopt onder Verlof › Soort › Ziekmelding).
   Daarna één update uploaden (app.js + sw.js).
1b. KLAAR: Uitnodigingsmail met uitleg: Supabase › Authentication › Emails › Invite user: onderwerp + inhoud van
   supabase/email/uitnodiging.html plakken; daarna invite-employee opnieuw deployen (geeft de voornaam mee).
2. App doorlopen: Instellingen deel 2 (gesloten dagen, toeslagen via Boomloon, doelen, werklocatie in het restaurant),
   daarna deel 3 Team (uurlonen, contracttypes, rollen, verlof "meegenomen uit vorig jaar").
3. Sessie naar de Mac halen: `claude --teleport --chrome` in de map MediaWow-, dan `/chrome`.
4. Receptenapp (apart, zelfde Supabase, bv. recepten.lilou-ede.nl):
   - eerst bepalen wat er per recept in moet (foto, ingrediënten, bereiding, allergenen, kostprijs, wie wat ziet);
   - importeren uit Paprika (export als .paprikarecipes) en Dropbox (eerst vragen welk soort bestanden), dubbele samenvoegen.

5. Wens Mark: grafiek kosten vs. benodigde omzet (kosten / doel-%) vs. werkelijke omzet, per uur/dag/week/maand/jaar.
   Live per uur via kassakoppeling (Lightspeed? K- of L-serie navragen) + ingeklokte mensen; knop "Naar huis sturen" in Klokken.
   Bekend: Lightspeed K-serie, live tijdens de dienst gewenst. Mark vraagt API-toegang (alleen financiële leesrechten)
   aan via de Lightspeed-accountmanager; sleutel komt in Supabase Secrets, nooit in de chat. Doel personeelskosten: max 30% (in Instellingen zetten).
6. Optioneel: zelf aanmelden uitzetten in Supabase en knop "Eerste keer inloggen" weghalen (alleen nog uitnodigen per mail).

7. Documenten (Operations Library, 41 bestanden in zip): advies = 28, waarvan het meeste IN DE APP.
   Invullijst (Claude Doc): https://claude.ai/artifact/QNjpUJ7NA7WfgZopEUTMTF — wachten op Mark/chef/manager/Mariska.
   Daarna: opgeschoonde documenten (app-regels leidend, alle functies houden) + training-PowerPoint (18 dia's).
   App-uitbreiding in stappen: 1) tabblad Handboek (lezen, per functie) 2) HACCP-lijsten digitaal (temperatuur
   met waarschuwing, ontvangst, schoonmaak) 3) weeklijsten opening/sluiten + briefing 4) klachten/incidenten/gebreken.
   Let op: briefing binnen de dienst (anders onbetaalde werktijd); RI&E, preventiemedewerker, arbodienst checken.
8. Update 21 (zip) nog uploaden en controleren.

## Eerder openstaand
- Wachtwoord rooster@-mailbox wijzigen (+ SMTP_PASS en Supabase Auth SMTP bijwerken), 2FA op Supabase/Vimexx/GitHub.
- Testmedewerker opruimen; Mark activeert zijn account.
- Verwerkersovereenkomst tekenen; DPA's van Supabase en Vimexx bewaren. Back-ups regelen.
- App op iPhone opnieuw op beginscherm zetten (naam "Lilou" bij meldingen).
- Later: automatisch roosteren, Boomloon-urenexport, versie voor meerdere klanten, werkbeleving.

## Stand 15 november (avond)
- Update 27 (bevat 25 en 26) + database-update-27.sql staan klaar, nog NIET live. Eerst SQL in Supabase, dan zip in DirectAdmin, dan live test.
- Supabase Auth: leaked password protection aan, OTP/e-maillink ≤ 1 uur.
- Volgende ronde functies: (1) meerdaagse ziekte tot "Ik ben weer beter" + diensten open zetten, (2) startscherm medewerkers: inklokken + volgende dienst bovenaan, (3) shiftleader ziet wie ingeklokt is, (4) Overzicht: Aandacht boven cijfers, (5) settings afschermen voor medewerkers (staff_settings-RPC).
- Ontwerp (controleur 6,5/10): serif-koppen (Fraunces), uitgeschakelde knoppen, lijn-iconen i.p.v. emoji, Aandacht als takenlijst, compacte Klokken op telefoon, donkere modus-accent, contrast pills. Voor/na en CSS: scratchpad/design-review/ (css1-5.css, voorna.js ICONS, fontdl/ voor Fraunces).

## Stand 16 november
- Update 28 LIVE (bestanden gecontroleerd, database-migratie update_28_afspraken_controle_instellingen toegepast).
- Open: Mariëlle moet haar account nog activeren (link in mail of Wachtwoord vergeten).
- Open: los testaccount (niet gekoppeld) opruimen na akkoord; leaked password protection en e-maillink ≤ 1 uur in Supabase Auth.
- Volgende ideeën: presentatie aanvullen (fooien, rookplek, schenkmaten, vertrouwenspersoon, eigen foto's), documentenset, Lightspeed-grafiek, recepten-app.

## Stand 16 november (middag)
- Update 30 LIVE: kaarten (menukaart, wijnkaart, bites, kerstmenu als app-pdf in map kaarten/, rijen in menu_cards), ziek tot beter gemeld (open_end), controle-fixes, keuken in afspraken. Database-migratie update_30_ziek_en_kaarten toegepast.
- Presentatie: 2 keukendia's toegevoegd (keuken, keukenveilig).
- Zenchef: mail aan Nina verstuurd; wachten op documentatie + aparte leessleutel. Plan: edge function haalt alleen aantallen per lunch/diner op; advies per functie.
- Recepten-app: apart gesprek, briefing in RECEPTEN-BRIEFING.md.
- Open: lunch/diner-splitsing met advies; Klokken in rustige stijl; Mariëlle activeren; Supabase Auth (leaked password, linkduur).

## Update 31–33 (16 nov) — live
- Kaarten als filterbare lijst (parseMenuPdf/menuList), directie kan gerechten toevoegen/wijzigen/weghalen (`menu_cards.items`, update31.sql). Nieuwe pdf = lijst weer uit de pdf.
- Herinnering aan shiftleader/directie van dienst als opening- of sluitingslijsten niet af zijn: `lists_reminders()` in `run_jobs` (update32.sql). Opening: 1 uur na eerste dienst; sluiting: 30 min voor einde laatste (of eigen) dienst.
- App-versie v40 (zip rooster-update-33).

## Let op: recepten-app deelt dezelfde Supabase (sinds 16 nov)
- Van de recepten-app (ander gesprek), NIET aanpassen vanuit het rooster: tabellen `recipes`, `dishes`, `dish_components`, `prep_lists`, `recipe_views`; opslagmap `recepten`; functies `recipe_*`, `save_dish`, `merge_recipes`, `menu_allergens`, `prep_check`, `rename_category`.
- Op `employees` staan nu ook `recipe_access` en `recipe_archive`, met trigger `guard_recipe_archive`: wijzigen van e-mail of account van iemand met archief-toegang mag alleen de beheerder (geeft anders een foutmelding in het rooster).
- Zelfde Auth: één account voor beide apps; inlog- en uitnodigingsmails gebruiken dezelfde sjablonen. Redirect-URL van de recepten-app moet in Auth → URL Configuration staan.

## Later: echte app + horeca-product (wens van Mariska, 16 nov)
- **App Store / Play Store** (na de opening): bestaande app verpakken met Capacitor; native push (APNs/FCM) zonder "from"; iOS als *unlisted* app voor het eigen team. Nodig: Apple Developer-account op bedrijfsnaam (€ 99/jaar, D-U-N-S-nummer aanvragen), Google Play (± € 25 eenmalig), Mac met Xcode (of cloud-build). Kleine wijzigingen blijven via de website binnenkomen.
- **Horeca-product (white label)**: nieuw apart project met Lilou-code als basis; Lilou wordt later de eerste klant. Onderdelen: multi-tenant (org_id + RLS per zaak), huisstijl per zaak (naam, logo, kleuren) overal incl. icoon en mails, voorbeeldlijsten/afspraken als startpunt, mails als code-sjablonen met zaaknaam (Supabase Send Email Hook → eigen verzendfunctie), aanmelden + abonnement (Mollie/Stripe), beheer voor MediaWow, verwerkersovereenkomst/voorwaarden/privacy per zaak, back-ups en support.
- Pushmeldingen iPhone: "from <app-naam>" komt van iOS zelf en is niet uit te zetten in een web-app.

## Update 42–44 (16 nov) — klaar, nog niet live
- Database: eerst update42 (rechten per functie, directie-niveau, laatste-directie-bewaking), dan update43 (weer beter op de dag zelf), dan update44 (diploma's, dagrapport, niet-ingeklokt-melding). Pas daarna de app-zip uploaden.
- Na update42: in Instellingen → Functies Manager = Directie, Shiftleader = Shiftleader zetten.
- Update 44: `employee_certs` (SVH/BHV/HACCP/EHBO, melding 60 en ±30 dagen voor verlopen, planning toont "Geen SVH/BHV"), `day_reports` + `save_day_report()` (shiftleader vandaag/gisteren, directie leest in Overzicht met gasten/omzet/uren/meldingen; 2 jaar bewaard), `late_reminders()` (10 min na start niet ingeklokt → leiding van dienst, anders directie, en de medewerker).
- UX-ronde: startscherm medewerker korter (tegels, Ruilen bij komende diensten, weken via "Per week"), beschikbaarheid compact, planning op telefoon met "⋯ Meer" en zwevende "+ Dienst", verlofkosten in uren, lijstvoortgang + "Chapeau", Franse toasts, verjaardag/mijlpaal/gasten in de begroeting.
- Niet gedaan (bewust): inkloktablet, contractbeheer (staat niet in de app). "Plat du jour" in de avondregel kan pas als de kaart een dagschotel kent.

## Idee: app voor gasten (na de opening)
- Advies: de website installeerbaar maken (PWA, zelfde techniek als het rooster) in plaats van een aparte App Store-app. Gasten kunnen hem op hun beginscherm zetten met het Lilou-icoon.
- Mogelijk: pushberichten (spaarzaam: nieuwe kaart, wijndiner, laatste plekken), snel reserveren via Zenchef, actuele kaart met allergenen, later cadeaubon of spaarkaart. Let op privacy zodra gastgegevens bewaard worden.
