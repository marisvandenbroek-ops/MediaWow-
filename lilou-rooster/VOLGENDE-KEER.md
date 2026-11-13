# Volgende keer (afspraken met Mariska)

Werkwijze: stap voor stap, in gewone taal. Eén stap tegelijk, wachten op "klaar", dan controleren.
Nooit wachtwoorden of geheime sleutels typen of laten zien; Mariska logt zelf in.

## Stand van zaken
- Update 17 staat live (schema, mail-rooster, agenda-functie, app-bestanden). Wachtwoord minimaal 8 tekens.
- Update 18 (commit bbe4437) is NIET geüpload: wordt samengevoegd met punt 1 hieronder.

## Te doen
1. Prikbord: gelezen mededelingen blijven altijd staan (ingeklapt, met ✓), alleen directie verwijdert. Knop "Gelezen" blijft.
   Ziekmelden beter vindbaar maken: aparte knop "Ik ben ziek" (nu verstopt onder Verlof › Soort › Ziekmelding).
   Daarna één update uploaden (app.js + sw.js).
2. App doorlopen: Instellingen deel 2 (gesloten dagen, toeslagen via Boomloon, doelen, werklocatie in het restaurant),
   daarna deel 3 Team (uurlonen, contracttypes, rollen, verlof "meegenomen uit vorig jaar").
3. Sessie naar de Mac halen: `claude --teleport --chrome` in de map MediaWow-, dan `/chrome`.
4. Receptenapp (apart, zelfde Supabase, bv. recepten.lilou-ede.nl):
   - eerst bepalen wat er per recept in moet (foto, ingrediënten, bereiding, allergenen, kostprijs, wie wat ziet);
   - importeren uit Paprika (export als .paprikarecipes) en Dropbox (eerst vragen welk soort bestanden), dubbele samenvoegen.

## Eerder openstaand
- Wachtwoord rooster@-mailbox wijzigen (+ SMTP_PASS en Supabase Auth SMTP bijwerken), 2FA op Supabase/Vimexx/GitHub.
- Testmedewerker opruimen; Mark activeert zijn account.
- Verwerkersovereenkomst tekenen; DPA's van Supabase en Vimexx bewaren. Back-ups regelen.
- App op iPhone opnieuw op beginscherm zetten (naam "Lilou" bij meldingen).
- Later: automatisch roosteren, Boomloon-urenexport, versie voor meerdere klanten, werkbeleving.
