# MediaWow Horeca: importeren in Elementor

Bestand: `mediawow-horeca.json` (ongeveer 1 MB, alle beelden zitten erin).

## Importeren

1. Ga in WordPress naar **Templates → Opgeslagen templates → Template importeren**.
2. Kies `mediawow-horeca.json` en klik **Nu importeren**.
3. Maak een nieuwe pagina, bijvoorbeeld **mediawow.nl/horeca**, en open hem met Elementor.
4. Klik op het mapje (Templates toevoegen) → **Mijn templates** → **MediaWow Horeca** → **Invoegen**.
5. Zet bij **Pagina-instellingen → Pagina-indeling** op **Elementor Canvas**.
   Dan staat bovenaan alleen het MediaWow-logo met de knop "Gratis scan", zonder het gewone menu.
   Een salespagina zonder menu converteert beter: elke menulink is een uitgang.
6. Publiceer.

## Wat je in de Navigator ziet

| Container | Wat het is | Aanpassen? |
|---|---|---|
| Stijl | Lettertypes en alle opmaak | Nee |
| Kop (blijft staan) | Logo + knop "Gratis scan", blijft bovenin bij scrollen | Tekst mag |
| Hero + live telefoon | "Vrijdag vol. Dinsdag ook." met de telefoon waar reserveringen binnenkomen | Tekst mag |
| Horeca-band | Bewegende band met horecawoorden | Woorden mogen |
| Werkt met | Rij reserveringssystemen | Ja |
| Verhaal: 18:41 | Het verhaal van Sanne en Tom | Ja |
| Rekensom | De commissiecalculator | Teksten ja, de schuifjes niet |
| Gevonden, gekozen, geboekt | De drie stappen met schermpjes | Ja |
| Voor/na-telefoon | Sleepbare voor/na-vergelijking | Teksten ja |
| Lilou (echte case) | Schermafbeeldingen van lilou-ede.nl | Na de opening cijfers toevoegen |
| Voorbeeldcases | **Fictieve** voorbeelden | **Vervangen voor livegang** |
| Over Mariska + logo's | Jouw foto, Mark Minkman, klantlogo's | Ja |
| Google-reviews | Je echte reviews | Ja |
| Prijs: de kaart | De prijs als menukaart | Ja |
| Voor wie wel/niet, Veelgestelde vragen | | Ja |
| Gratis scan + formulier | Afsluiting met formulier | Zie hieronder |
| Footer, Script | Footer en de werking van telefoon, calculator en slider | Script niet |

Elke sectie is een HTML-widget. Teksten pas je aan door de widget te openen en de tekst tussen de tags te wijzigen.
Containers kun je slepen om de volgorde te veranderen.

## Het formulier

Het formulier op de pagina is een demo en verstuurt niets. Twee opties:

- **Elementor Pro:** verwijder het formulier uit de widget "Gratis scan + formulier" en zet er een Elementor-formulier naast,
  met de velden naam, zaak, huidige website, type zaak en e-mail/WhatsApp. Aanvragen komen dan in je mail.
- **Zonder Pro:** gebruik een formulierplugin (bijvoorbeeld WPForms of Contact Form 7) en plak de shortcode op die plek.

## Snelheid (aanrader)

De beelden zitten in het bestand zelf, zodat alles meteen werkt. Voor de snelste pagina:
upload de beelden uit `horeca/img/` naar de Mediabibliotheek en vervang in de widgets de lange `data:image/...`-teksten door de URL's.

## Opnieuw bouwen

```
python3 horeca/src/build_tafelvol.py
python3 horeca/src/build_elementor_json.py
```
