# Mindlockresidence — deploy op Hetzner via Coolify

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
| `DATA_DIR` | `/app/data` |

Gebruik **ADMIN_PASSWORD_HASH**, niet het platte wachtwoord. (Er is een
fallback `ADMIN_PASSWORD` voor lokaal testen, maar zet die niet in productie.)

## 4. Persistent volume (heel belangrijk)

Coolify → Storage → **Add volume**:
- Source: een naam, bijv. `mlr-data`
- Destination (container path): `/app/data`

Zonder dit verdwijnen uploads en de database bij elke redeploy.

## 5. Deploy

Klik **Deploy**. Coolify bouwt de Docker-image en start de app.
Daarna bereikbaar op de tijdelijke Coolify-URL.

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

## Lokaal draaien (testen)

```
npm install
ADMIN_PASSWORD='JOUW-WACHTWOORD' SESSION_SECRET=dev npm start
# open http://localhost:3000
```

## Notities

- De oude GitHub Pages-site (kreamart-art.github.io/mindlockresidence) blijft
  bestaan, maar de echte site draait straks op Hetzner via dit pad. Je kunt
  Pages later uitzetten.
- Static assets, i18n en de beat blijven werken zoals nu; de Node-server
  serveert exact dezelfde bestanden plus de API.
