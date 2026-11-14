# Volgende keer (afspraken met Mariska)

Werkwijze: stap voor stap, in gewone taal. Eén stap tegelijk, wachten op "klaar", dan controleren.
Nooit wachtwoorden of geheime sleutels typen of laten zien; Mariska logt zelf in.

## Stand van zaken
- Update 17 staat live (schema, mail-rooster, agenda-functie, app-bestanden). Wachtwoord minimaal 8 tekens.
- Update 19 (prikbord blijft staan + knop 'Ik ben ziek') staat LIVE; uitnodigingsmail-template opgeslagen in Supabase; invite-employee met voornaam is live (via Supabase-koppeling).
- Werkwijze: Supabase doe ik zelf via de Supabase-koppeling (Mariska klikt Toestaan); Mariska uploadt alleen de zip in DirectAdmin.

- Update 20: bijlagen (pdf/foto) openen in de app zelf (pdf.js in vendor/pdfjs), Instellingen/Aanvragen passen op telefoon,
  knop 'Komende diensten uit het rooster halen' bij medewerker + bulk met één melding (shifts_bulk staat LIVE in Supabase).

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
