# Mindlockresidence — website

Custom statische **multi-page** site (HTML/CSS/JS) in de donker+rode MLR-huisstijl,
met een **NL/EN-taalwissel**. Layout volgt het "MLR Ecosysteem"-ontwerp.

## Lokaal bekijken
Preview-config in `.claude/launch.json` → naam **`mindlock`** (poort 5280),
of: `python3 -m http.server 5280` in deze map. Open dan `index.html`.

## Pagina's
| Bestand | Pagina |
|---|---|
| `index.html` | Home (hero + intro-animatie + MLR ecosysteem) |
| `diensten.html` | Diensten (6 diensten) |
| `werk.html` | Werk (filterbaar portfolio) |
| `muziek.html` | Muziek (releases + shop) |
| `about.html` | Over / About |
| `contact.html` | Contact (formulier) |

## Gedeelde onderdelen
- `layout.js` — injecteert **nav + footer** op elke pagina (één bron van waarheid),
  regelt actieve nav, cursor, mobiel menu, scroll-progress, reveal, portfolio-filter,
  formulier en de intro-animatie (alleen home). Pas hier nav/footer aan.
- `i18n.js` — **alle vertalingen** (NL + EN). Teksten in de HTML hebben `data-i18n="sleutel"`
  (of `data-i18n-html` / `data-i18n-ph`). Taalkeuze staat in een toggle in de nav en wordt
  onthouden (localStorage). Standaardtaal: **NL**.
- `styles.css` — alle styling.
- `index-v1.html`, `script.js` — legacy (eerste single-page versie), niet meer in gebruik.

### Tekst aanpassen of vertalen
Wijzig de waarde bij de juiste sleutel in `i18n.js` (zowel onder `nl` als `en`).

## Afbeeldingen — in `assets/`
| Bestand | Gebruikt voor | Status |
|---|---|---|
| `assets/logo.png` | Keyhole-logo (hero + intro) | ✓ geplaatst |
| `assets/banner.png` | Donkere bergen/mist achtergrond (hero) | ✓ geplaatst |
| `assets/creators.png` | Rij creators onderaan de hero (transparante PNG) | later |
| `assets/spotlight.jpg` | Foto in "Artiest in de spotlight" | later |
| `assets/about.jpg` | Foto op de Over-pagina | later |
| `assets/card-muziek.jpg` · `card-film.jpg` · `card-grafisch.jpg` · `card-artiest.jpg` | Achtergronden ecosysteem-kaarten | later |

Zolang een afbeelding ontbreekt, toont de site een nette placeholder.

## Nog te doen
- Formulier koppelen aan een echte service (Formspree/Resend/eigen backend).
- Echte Spotify/Apple/YouTube/TikTok/Discord-links invullen.
- Resterende afbeeldingen plaatsen.
- Hosting kiezen (Netlify/Vercel/GitHub Pages) en domein `mindlockresidence.com`.
