# LILOU — Instagram-reel lunch

Reel (1080×1920, 20 s) voor de lunch bij LILOU in Ede, die opent op 2 december 2026.
De reel is gemaakt in de huisstijl van LILOU: Vonca, terracotta `#8F2509`, ivoor `#FFFDF8` en bijna-zwart `#17110E`.

## Kant-en-klaar

| Bestand | Gebruik |
|---|---|
| `export/lilou-lunch-reel.mp4` | De reel met muziek, klaar om te uploaden |
| `export/lilou-lunch-reel-zonder-muziek.mp4` | Zonder geluid: voeg in Instagram zelf een trending nummer toe |
| `export/lilou-lunch-reel-cover.jpg` | Cover: de klok op 07:00 met "Vanaf 2 december" |
| `export/lilou-eindkaart.jpg` | Losse eindkaart voor een story of post |

## Opbouw

| Tijd | Scène |
|---|---|
| 0–3,5 s | Het O.-logo als klok: de wijzers draaien van 07:00 naar 12:00 en staan stil op de drop (2,3 s) |
| 3,5–5,7 s | *Lunch at Lilou.* |
| 5,7–9,0 s | Gerechtnamen, elke halve seconde een nieuwe: Paling, Tartare, Kreeft, Coquilles, Ribeye, Madeleine |
| 9,0–11,5 s | *Le 12 O'Clock*, € 32,50 |
| 11,5–13,8 s | Le Menu Déjeuner: 2 · 3 · 4 springen op de tel in beeld, *gangen*, vanaf € 39,50 |
| 13,8–20 s | Eindkaart: logo, *Lunch at Lilou. C'est tout.*, gegevens, "Reserveer · link in bio" |

**Audio:** een intro met hi-hats, snaps, riser en een 808-drop op 12:00, gevolgd door groovy melodische Latin house (`audio/house-groovy.mp3`).
Er zijn nog twee varianten: `audio/house.mp3` (deep house) en `audio/house-gritty.mp3` (ruige house). Je wisselt via `TRACK` in `build_audio.py`.
Alle tracks zijn met Runway gemaakt en hebben dus geen rechten van bekende artiesten.

Gerechten, prijzen en tijden komen van https://lilou-ede.nl/lunch/ (stand 24 november 2026).

## Caption

> Vanaf 2 december schuif je bij ons aan voor de lunch. Klassiek Frans, in het Pomphuis.
>
> Probeer Le 12 O'Clock: toast met gerookte paling, steak tartare, cappuccino van knolselderij en salade César. Of laat de keuken je verrassen met het seizoensmenu van 2, 3 of 4 gangen.
>
> Woensdag t/m zondag vanaf 12:00 · Klinkenbergerweg 41, Ede
> Reserveer via de link in bio.
>
> Lunch at Lilou. C'est tout.

## Opnieuw bouwen of aanpassen

Benodigd: Node met Playwright, Python 3 met numpy, en ffmpeg.

```bash
./get-fonts.sh                 # Vonca ophalen (staat niet in de repo: gelicenseerd lettertype)
node render.js stills 2.3 6.3  # losse stills om te controleren
./build.sh                     # beide mp4's in export/
```

- Teksten, kleuren en timing staan in `reel.html`.
  De tijdlijn staat in de `S`-array, het moment van de drop in `STOP`.
- Muziek en mix staan in `build_audio.py`.
  Verschuif je de drop, pas dan ook `DROP` aan.
