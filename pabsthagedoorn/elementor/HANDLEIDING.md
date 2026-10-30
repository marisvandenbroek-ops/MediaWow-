# Pabst & Hagedoorn in Elementor

Zes pagina's, elk één blok code voor één HTML-widget.

| Bestand | WordPress-pagina | Slug |
|---|---|---|
| `home.html` | Home (instellen als startpagina) | `/` |
| `collectie.html` | Collectie | `collectie` |
| `product.html` | Product | `product` |
| `inspiratie.html` | Inspiratie | `inspiratie` |
| `servies-samenstellen.html` | Servies samenstellen | `servies-samenstellen` |
| `showrooms-contact.html` | Showrooms & contact | `showrooms-contact` |

## 1. Foto's uploaden (één keer)

Zet de map `img/` via FTP of de bestandsbeheerder van je hosting op deze plek, met de naam `pabsthagedoorn`:

```
/wp-content/uploads/pabsthagedoorn/
```

Controle: `https://jouwdomein.nl/wp-content/uploads/pabsthagedoorn/sergio-stack.jpg` moet de hero-foto tonen.

Upload ze niet via de Mediabibliotheek. Die zet bestanden in datummappen (`/2026/10/`), en dan kloppen de paden niet.

## 2. Pagina's aanmaken

Voor elke rij in de tabel:

1. **Pagina's → Nieuwe pagina**, met de titel uit de tabel. Controleer of de slug (permalink) klopt.
2. Rechts bij **Sjabloon** kies je **Elementor Canvas**. Dan valt de header en footer van het thema weg.
3. **Bewerken met Elementor** → sleep één **HTML**-widget op de pagina.
4. Open het bestand, kopieer **alles** en plak het in de widget.
5. Bij **Geavanceerd** van de sectie/container: zet padding op 0 en breedte op **Volle breedte**.
6. **Publiceren** (of eerst **Privé** / **Wachtwoord** als het alleen voor de klant is).

Zet daarna bij **Instellingen → Lezen** de pagina *Home* als startpagina.

In de Elementor-editor zie je soms een lege of half geladen preview. Dat is normaal; bekijk de gepubliceerde pagina.

## 3. Andere paden of slugs?

Bovenaan `build.py` staan `WP_IMG` (fotomap) en `WP_LINKS` (slugs). Pas ze aan en draai:

```
python3 build.py
```

De bestanden in deze map worden dan opnieuw gemaakt.

## Wat het wel en niet doet

- De bestellijst blijft bewaard in de browser van de bezoeker, ook als die naar een andere pagina gaat.
- Bestellen, offerte aanvragen, het afspraakformulier en inloggen zijn **demo's**: er wordt niets verstuurd of opgeslagen. Voor een echte shop koppel je dit aan WooCommerce en een formulierplugin.
- De opmaak is afgeschermd (`#ph`), zodat het WordPress-thema hem niet overschrijft.
