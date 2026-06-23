# Mindlockresidence - deploy op Hetzner via Coolify

De site is nu een Node-app (Express). Hij serveert de statische site én het
eigenaar-dashboard met login en uploads. Data (database + geüploade bestanden)
leeft in een map `data/` die je als **persistent volume** mount, zodat uploads
een herstart of redeploy overleven.

## 1. Voorbereiding (eenmalig)

1. Push deze repo naar GitHub (al gekoppeld: `kreamart-art/mindlockresidence`).
2. Genereer je wachtwoord-hash lokaal (komt NIET in de repo):
   ```
   npm run hash 'JOUW-WACHTWOORD'
   ```
   Kopieer de hele `scrypt$...`-regel.
3. Genereer een sessie-secret:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## 2. Nieuwe resource in Coolify

1. Coolify → je project → **+ New** → **Application** → **Public Repository**
   (of je GitHub-app), repo `kreamart-art/mindlockresidence`, branch `main`.
2. Build pack: **Dockerfile** (staat in de repo).
3. Port: **3000** (staat al in de Dockerfile; Coolify mapt 'm naar 80/443).

## 3. Environment variables (Coolify → Environment)

| Key | Waarde |
|---|---|
| `ADMIN_EMAIL` | `mindlockresidence@gmail.com` |
| `ADMIN_PASSWORD_HASH` | de `scrypt$...`-regel uit stap 1.2 |
| `SESSION_SECRET` | de random string uit stap 1.3 |
| `NODE_ENV` | `production` |
| `DATA_DIR` | `/data` |

Gebruik **ADMIN_PASSWORD_HASH**, niet het platte wachtwoord. (Er is een
fallback `ADMIN_PASSWORD` voor lokaal testen, maar zet die niet in productie.)

## 4. Persistent volume (heel belangrijk)

Coolify → Storage → **Add volume**:
- Source: een naam, bijv. `mlr-data`
- Destination (container path): `/data`

Zonder dit verdwijnen uploads en de database bij elke redeploy.
(De data staat bewust op `/data`, buiten de app-map, zodat de database
nooit per ongeluk via de website gedownload kan worden.)

## 5. Deploy

Klik **Deploy**. Coolify bouwt de Docker-image en start de app.
Daarna bereikbaar op de tijdelijke Coolify-URL.

> Let op: **inloggen werkt alleen via HTTPS.** De sessie-cookie is `Secure`
> in productie, dus test login op de `https://`-URL (Coolify/Traefik serveert
> standaard via HTTPS), niet op een kale `http://`-URL.

## 6. Domein koppelen (mijndomein.nl)

Je hebt **mindlockresidence.com** en **mindlockresidence.store** bij mijndomein.nl.
1. In Coolify → Domains: zet `https://mindlockresidence.com` (en eventueel `www`).
2. Bij mijndomein.nl → DNS van mindlockresidence.com:
   - `A`-record `@` → het IP van je Hetzner-server
   - `CNAME` of `A` voor `www` → idem
3. Coolify regelt automatisch HTTPS (Let's Encrypt) zodra DNS klopt.
4. `mindlockresidence.store` kun je later aan de shop koppelen.

## 7. Eerste keer inloggen

Ga naar `https://mindlockresidence.com/login.html`, log in met je e-mail en
wachtwoord. Je komt op `/dashboard`. Daar upload je werk (foto/video of een
YouTube-link), kiest de discipline, en het verschijnt meteen op de Werk-pagina.
Vink "Uitlichten" aan om een item groot te tonen.

## 8. Shop met Stripe (testmodus eerst)

De shop staat op `/shop`. Producten beheer je in het dashboard onder de
tab **Shop**; bestellingen zie je onder **Bestellingen**. Prijzen staan
server-side, betaling loopt via Stripe Checkout, digitale downloads gaan
via verlopende e-maillinks (Resend).

### 8a. Stripe (zet de dashboard-toggle op TEST mode)
1. Developers → API keys: kopieer **Secret key** (`sk_test_...`).
2. Developers → Webhooks → Add endpoint:
   - URL: `https://mindlockresidence.com/api/shop/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`
   - Kopieer de **Signing secret** (`whsec_...`).

### 8b. Resend (voor de digitale downloadmails)
1. Maak een API key (`re_...`).
2. Verifieer het domein `mindlockresidence.com` (SPF/DKIM in mijndomein DNS),
   anders komen mails niet aan. Test eerst met je eigen adres.

### 8c. Extra env vars in Coolify (daarna redeploy)

| Key | Waarde |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (van het endpoint hierboven) |
| `RESEND_API_KEY` | `re_...` |
| `SHOP_FROM_EMAIL` | `Mindlock Residence <shop@mindlockresidence.com>` |
| `PUBLIC_BASE_URL` | `https://mindlockresidence.com` |
| `SHOP_ALLOWED_SHIPPING_COUNTRIES` | `NL,BE,DE` (optioneel) |
| `SHOP_SHIPPING_CENTS` | `595` (optioneel, vaste verzendkosten in centen) |
| `DOWNLOAD_TOKEN_TTL_HOURS` | `72` (optioneel) |
| `DOWNLOAD_MAX_USES` | `3` (optioneel) |

Zonder `STRIPE_SECRET_KEY` blijft de site gewoon werken; de shop staat
dan simpelweg uit (afrekenen geeft een nette melding). Houd **één replica**
(node:sqlite is single-writer).

### 8d. Testen met een testkaart
Op `/shop`: leg een product in de wagen, reken af, en gebruik kaart
`4242 4242 4242 4242`, willekeurige toekomstige datum + CVC. Na betaling:
- digitaal → je krijgt een e-mail met downloadlink (max 3x, 72u geldig);
- fysiek → Stripe vraagt adres + verzendkosten; de bestelling komt in het
  dashboard onder Bestellingen, waar je 'm als verzonden markeert met
  track & trace.

### 8e. Live gaan (later)
Zet Stripe op live, maak een NIEUW live-webhook-endpoint (nieuwe `whsec_`),
en wissel `sk_live_...` + de live `whsec_...` samen in Coolify. Redeploy.

## Lokaal draaien (testen)

```
npm install
ADMIN_PASSWORD='JOUW-WACHTWOORD' SESSION_SECRET=dev npm start
# open http://localhost:3000
# shop werkt lokaal pas met STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
# (gebruik `stripe listen --forward-to localhost:3000/api/shop/webhook`)
```

## Notities

- De oude GitHub Pages-site (kreamart-art.github.io/mindlockresidence) blijft
  bestaan, maar de echte site draait straks op Hetzner via dit pad. Je kunt
  Pages later uitzetten.
- Static assets, i18n en de beat blijven werken zoals nu; de Node-server
  serveert exact dezelfde bestanden plus de API.
