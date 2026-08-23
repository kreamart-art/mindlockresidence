import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { unlinkSync, createReadStream, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';

import db, { UPLOAD_DIR } from './lib/db.js';
import { checkLogin, requireAuth, ADMIN_EMAIL } from './lib/auth.js';
import * as shop from './lib/shop.js';
import { SECURE_DIR } from './lib/shop.js';
import { sendDigitalDelivery, sendPhysicalConfirmation, sendTracking, sendContactMessage } from './lib/mail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Stripe (server-only sleutel). Zonder sleutel blijft de site werken, shop is dan uit.
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'http://localhost:' + PORT).replace(/\/$/, '');
const SHIP_COUNTRIES = (process.env.SHOP_ALLOWED_SHIPPING_COUNTRIES || 'NL,BE,DE').split(',').map(s => s.trim()).filter(Boolean);
const SHIP_FALLBACK_CENTS = parseInt(process.env.SHOP_SHIPPING_CENTS || '595', 10);
const TOKEN_TTL_HOURS = parseInt(process.env.DOWNLOAD_TOKEN_TTL_HOURS || '72', 10);
const TOKEN_MAX_USES = parseInt(process.env.DOWNLOAD_MAX_USES || '3', 10);

app.set('trust proxy', 1); // achter Coolify/Traefik reverse proxy
app.disable('x-powered-by');

// CRUCIAAL: de Stripe-webhook heeft de RAUWE body nodig en moet VOOR express.json().
app.post('/api/shop/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !WEBHOOK_SECRET) return res.status(503).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe] ongeldige webhook-signature:', err.message);
    return res.status(400).send('bad signature');
  }
  // Snel 200 teruggeven; verwerking erna. Replays worden genegeerd via webhook_events.
  res.json({ received: true });
  if (!shop.recordEvent(event.id, event.type)) return; // al verwerkt
  handleStripeEvent(event).catch(e => console.error('[stripe] verwerking fout:', e.message));
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION_SECRET is verplicht in productie (anders loggen sessies uit bij elke redeploy).
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is verplicht in productie. Zet de variabele in de Coolify env.');
}

app.use(session({
  name: 'mlr.sid',
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 14 // 14 dagen
  }
}));

const CATEGORIES = ['muziek', 'film', 'foto', 'design', 'studio', 'workshop'];

/* ---- AUTH ---- */
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (checkLogin(email, password)) {
    req.session.user = { email: ADMIN_EMAIL };
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Onjuiste e-mail of wachtwoord.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

/* ---- PUBLIEKE WORKS API ---- */
app.get('/api/works', (req, res) => {
  const cat = req.query.category;
  let rows;
  if (cat && CATEGORIES.includes(cat)) {
    rows = db.prepare('SELECT * FROM works WHERE category = ? ORDER BY sort_order DESC, id DESC').all(cat);
  } else {
    rows = db.prepare('SELECT * FROM works ORDER BY sort_order DESC, id DESC').all();
  }
  res.json(rows.map(publicWork));
});

function publicWork(w) {
  return {
    id: w.id,
    title: w.title,
    subtitle: w.subtitle,
    category: w.category,
    mediaType: w.media_type,
    featured: !!w.featured,
    url: w.media_type === 'youtube'
      ? null
      : (w.file ? '/uploads/' + w.file : null),
    youtubeId: w.media_type === 'youtube' ? w.youtube_id : null
  };
}

/* ---- UPLOADS ---- */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 8);
    cb(null, Date.now() + '-' + randomBytes(6).toString('hex') + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype) ||
               /^video\/(mp4|quicktime|webm)$/.test(file.mimetype);
    cb(ok ? null : new Error('Alleen afbeeldingen of video.'), ok);
  }
});

/* ---- ADMIN API (beveiligd) ---- */
app.get('/api/admin/works', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM works ORDER BY sort_order DESC, id DESC').all());
});

app.post('/api/admin/works', requireAuth, upload.single('file'), (req, res) => {
  // Ruimt een geüpload bestand op als we het niet (meer) gebruiken.
  const dropFile = () => { if (req.file) { try { unlinkSync(req.file.path); } catch {} } };
  const { title, subtitle = '', category, youtube_id = '', featured } = req.body || {};
  if (!title || !category || !CATEGORIES.includes(category)) {
    dropFile();
    return res.status(400).json({ error: 'Titel en geldige categorie zijn verplicht.' });
  }
  let media_type = 'image', file = '', ytid = '';
  if (youtube_id.trim()) {
    media_type = 'youtube';
    ytid = extractYouTubeId(youtube_id.trim());
    if (!ytid) { dropFile(); return res.status(400).json({ error: 'Ongeldige YouTube-link of id.' }); }
    dropFile(); // YouTube wint: gooi een evt. meegestuurd bestand weg
  } else if (req.file) {
    file = req.file.filename;
    media_type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  } else {
    return res.status(400).json({ error: 'Upload een bestand of geef een YouTube-link.' });
  }
  try {
    const info = db.prepare(
      'INSERT INTO works (title, subtitle, category, media_type, file, youtube_id, featured) VALUES (?,?,?,?,?,?,?)'
    ).run(title.trim(), subtitle.trim(), category, media_type, file, ytid, featured ? 1 : 0);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    dropFile();
    res.status(500).json({ error: 'Opslaan mislukt.' });
  }
});

app.delete('/api/admin/works/:id', requireAuth, (req, res) => {
  const w = db.prepare('SELECT * FROM works WHERE id = ?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Niet gevonden.' });
  if (w.file) { try { unlinkSync(path.join(UPLOAD_DIR, w.file)); } catch {} }
  db.prepare('DELETE FROM works WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function extractYouTubeId(input) {
  if (/^[0-9A-Za-z_-]{11}$/.test(input)) return input;
  const m = input.match(/(?:v=|youtu\.be\/|embed\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : '';
}

/* ============================================================
   SHOP
   ============================================================ */

// multer voor producten: image -> uploads (publiek), digital_file -> secure (privé)
const shopUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, file.fieldname === 'digital_file' ? SECURE_DIR : UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 10);
      cb(null, Date.now() + '-' + randomBytes(6).toString('hex') + ext);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB voor beat packs
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') return cb(null, /^image\//.test(file.mimetype));
    if (file.fieldname === 'digital_file') return cb(null, /^(audio|application|video)\//.test(file.mimetype));
    cb(null, false);
  }
});

const euroToCents = (v) => Math.round(parseFloat(String(v).replace(',', '.')) * 100);

/* ---- publieke shop API ---- */
/* ---------- CONTACTFORMULIER ----------
   Stuurt de aanvraag als mail naar de eigenaar. Reply-to = de afzender.
   Beschermd met een honeypot (bots vullen 'website' in) en een IP-limiet. */
const contactHits = new Map(); // ip -> [timestamps]
const CONTACT_WINDOW_MS = 60 * 60 * 1000; // 1 uur
const CONTACT_MAX = 5;

function contactRateLimited(ip) {
  const now = Date.now();
  const hits = (contactHits.get(ip) || []).filter(t => now - t < CONTACT_WINDOW_MS);
  if (hits.length >= CONTACT_MAX) { contactHits.set(ip, hits); return true; }
  hits.push(now);
  contactHits.set(ip, hits);
  if (contactHits.size > 5000) { // simpele opruiming
    for (const [k, v] of contactHits) if (!v.some(t => now - t < CONTACT_WINDOW_MS)) contactHits.delete(k);
  }
  return false;
}

app.post('/api/contact', async (req, res) => {
  const b = req.body || {};
  // Honeypot: onzichtbaar veld. Ingevuld betekent bot. Doe alsof het lukte.
  if (b.website) return res.json({ ok: true });

  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const type = String(b.type || '').trim().slice(0, 80);
  const message = String(b.message || '').trim();

  if (!name || !email || !message) return res.status(400).json({ error: 'Vul je naam, e-mail en bericht in.' });
  if (name.length > 120 || email.length > 200 || message.length > 5000) return res.status(400).json({ error: 'Invoer is te lang.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Dit e-mailadres klopt niet.' });
  // Header-injectie via reply-to voorkomen
  if (/[\r\n]/.test(email) || /[\r\n]/.test(name)) return res.status(400).json({ error: 'Ongeldige invoer.' });

  if (contactRateLimited(req.ip)) return res.status(429).json({ error: 'Te veel aanvragen. Probeer het later opnieuw.' });

  try {
    const r = await sendContactMessage({ name, email, type, message });
    if (!r || r.ok !== true) {
      console.error('[contact] versturen mislukt');
      return res.status(502).json({ error: 'Versturen lukte niet. Mail ons direct op Mindlockresidence@gmail.com.' });
    }
    console.log('[contact] aanvraag van', email, '(' + (type || 'geen type') + ')');
    return res.json({ ok: true });
  } catch (e) {
    console.error('[contact] fout:', e.message);
    return res.status(500).json({ error: 'Er ging iets mis. Probeer het later opnieuw.' });
  }
});

app.get('/api/shop/products', (req, res) => {
  res.json(shop.getActiveProducts().map(shop.publicProduct));
});
app.get('/api/shop/products/:slug', (req, res) => {
  const p = shop.getProductBySlug(req.params.slug);
  if (!p) return res.status(404).json({ error: 'Niet gevonden.' });
  res.json(shop.publicProduct(p));
});

// Checkout: server bepaalt prijzen, klant stuurt alleen productId + aantal.
app.post('/api/shop/checkout', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Shop is nog niet geconfigureerd.' });
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: 'Lege winkelwagen.' });

  const line_items = [];
  const resolved = [];
  let hasDigital = false, hasPhysical = false, shipCents = 0;
  for (const raw of items) {
    const p = shop.getProductById(parseInt(raw.productId, 10));
    if (!p || !p.active) return res.status(400).json({ error: 'Product niet beschikbaar.' });
    const qty = Math.max(1, Math.min(10, parseInt(raw.quantity, 10) || 1));
    if (p.type === 'physical' && p.stock != null && p.stock < qty) {
      return res.status(400).json({ error: 'Niet genoeg voorraad voor ' + p.name + '.' });
    }
    if (p.type === 'digital') hasDigital = true;
    if (p.type === 'physical') { hasPhysical = true; shipCents = Math.max(shipCents, p.shipping_cents || 0); }
    resolved.push({ p, qty });
    line_items.push({
      quantity: qty,
      price_data: {
        currency: p.currency || shop.CURRENCY,
        unit_amount: p.price_cents,
        product_data: {
          name: p.name,
          images: p.image ? [PUBLIC_BASE_URL + '/uploads/' + p.image] : undefined
        }
      }
    });
  }

  const sessionOpts = {
    mode: 'payment',
    line_items,
    success_url: PUBLIC_BASE_URL + '/shop/thanks?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: PUBLIC_BASE_URL + '/shop',
    automatic_tax: { enabled: false }
  };
  if (hasDigital) sessionOpts.customer_creation = 'always';
  if (hasPhysical) {
    sessionOpts.shipping_address_collection = { allowed_countries: SHIP_COUNTRIES };
    sessionOpts.shipping_options = [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: shipCents || SHIP_FALLBACK_CENTS, currency: shop.CURRENCY },
        display_name: 'Verzending'
      }
    }];
  }

  try {
    const sess = await stripe.checkout.sessions.create(sessionOpts);
    const orderId = shop.createPendingOrder({ sessionId: sess.id, currency: shop.CURRENCY, hasDigital, hasPhysical });
    for (const { p, qty } of resolved) {
      shop.addOrderItem(orderId, {
        product_id: p.id, name: p.name, type: p.type, unit_price_cents: p.price_cents,
        quantity: qty, digital_file: p.digital_file, digital_filename: p.digital_filename
      });
    }
    res.json({ url: sess.url });
  } catch (e) {
    console.error('[stripe] checkout fout:', e.message);
    res.status(500).json({ error: 'Kon afrekenen niet starten.' });
  }
});

// Thank-you pagina pollt de status (levert zelf niets af).
app.get('/api/shop/order/:sessionId', (req, res) => {
  const o = shop.getOrderBySession(req.params.sessionId);
  if (!o) return res.status(404).json({ error: 'Niet gevonden.' });
  res.json({ status: o.status, has_digital: !!o.has_digital, has_physical: !!o.has_physical });
});

// Webhook-verwerking (aangeroepen vanuit de raw-route bovenaan).
async function handleStripeEvent(event) {
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object;
    if (s.payment_status !== 'paid') return;
    const email = (s.customer_details && s.customer_details.email) || s.customer_email || '';
    const shippingJson = s.shipping_details ? JSON.stringify(s.shipping_details) : '';
    const claimed = shop.markPaidOnce(s.id, { pi: s.payment_intent, email, amount: s.amount_total, shippingJson });
    if (!claimed) return; // al verwerkt of onbekend
    const order = shop.getOrderBySession(s.id);
    await fulfill(order);
  } else if (event.type === 'charge.refunded') {
    const pi = event.data.object.payment_intent;
    const order = db.prepare('SELECT * FROM orders WHERE stripe_payment_intent = ?').get(pi);
    if (order) shop.revokeTokensForOrder(order.id); // ingetrokken: downloads dood
  }
}

async function fulfill(order) {
  const items = shop.getOrderItems(order.id);
  const links = [];
  for (const it of items) {
    if (it.type === 'physical' && it.product_id) shop.decrementStock(it.product_id, it.quantity);
    if (it.type === 'digital' && it.digital_file) {
      const raw = shop.mintToken(order.id, it, TOKEN_TTL_HOURS, TOKEN_MAX_USES);
      links.push({ name: it.digital_filename || it.name, url: PUBLIC_BASE_URL + '/download/' + raw });
    }
  }
  shop.markFulfilled(order.id);
  // E-mail buiten de kritieke timing; faalt 'ie, dan vlaggen we het voor de resend-actie.
  try {
    let r = { ok: true };
    if (links.length) r = await sendDigitalDelivery(order, links);
    else if (order.has_physical) r = await sendPhysicalConfirmation(order, items);
    shop.setEmailStatus(order.id, r && r.ok ? 'sent' : 'failed');
  } catch (e) {
    console.error('[shop] e-mail fout:', e.message);
    shop.setEmailStatus(order.id, 'failed');
  }
}

// Beveiligde download: token (verlopend, beperkt aantal keer). Enige weg naar secure-bestanden.
app.get('/download/:token', (req, res) => {
  const raw = req.params.token || '';
  const tok = shop.getToken(raw);
  if (!tok) return res.status(404).send('Niet gevonden.');
  if (tok.expires_at <= Date.now() || tok.used_count >= tok.max_uses) return res.status(410).send('Link verlopen.');
  // path-traversal guard: bestand moet binnen SECURE_DIR vallen.
  const full = path.resolve(SECURE_DIR, path.basename(tok.file));
  if (!full.startsWith(path.resolve(SECURE_DIR)) || !existsSync(full)) return res.status(404).send('Niet gevonden.');
  if (!shop.consumeToken(raw)) return res.status(410).send('Link verlopen.');
  res.setHeader('Content-Disposition', 'attachment; filename="' + tok.filename.replace(/[^\w.\- ]/g, '_') + '"');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  createReadStream(full).pipe(res);
});

/* ---- admin: producten ---- */
app.get('/api/admin/products', requireAuth, (req, res) => {
  res.json(shop.getAllProducts().map(p => ({ ...p, digital_file: p.digital_file ? '✓' : '' })));
});

app.post('/api/admin/products', requireAuth, shopUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'digital_file', maxCount: 1 }]), (req, res) => {
  const img = req.files && req.files.image && req.files.image[0];
  const dig = req.files && req.files.digital_file && req.files.digital_file[0];
  const cleanup = () => { for (const f of [img, dig]) if (f) { try { unlinkSync(f.path); } catch {} } };
  const { name, subtitle = '', description = '', type, price, stock = '', shipping = '', badge = '' } = req.body || {};
  if (!name || !type || !['digital', 'physical'].includes(type)) { cleanup(); return res.status(400).json({ error: 'Naam en type verplicht.' }); }
  const price_cents = euroToCents(price);
  if (!Number.isFinite(price_cents) || price_cents < 0) { cleanup(); return res.status(400).json({ error: 'Ongeldige prijs.' }); }
  if (type === 'digital' && !dig) { cleanup(); return res.status(400).json({ error: 'Upload een downloadbestand voor een digitaal product.' }); }
  try {
    db.prepare(`INSERT INTO products (name, slug, subtitle, description, type, price_cents, currency, image, digital_file, digital_filename, stock, shipping_cents, badge)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      name.trim(), shop.slugify(name), subtitle.trim(), description.trim(), type, price_cents, shop.CURRENCY,
      img ? img.filename : '', dig ? dig.filename : '', dig ? dig.originalname : '',
      type === 'physical' && stock !== '' ? parseInt(stock, 10) : null,
      type === 'physical' && shipping !== '' ? euroToCents(shipping) : 0,
      badge.trim()
    );
    res.json({ ok: true });
  } catch (e) { cleanup(); console.error(e); res.status(500).json({ error: 'Opslaan mislukt.' }); }
});

app.patch('/api/admin/products/:id', requireAuth, (req, res) => {
  const p = shop.getProductById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Niet gevonden.' });
  const fields = [];
  const vals = [];
  const b = req.body || {};
  if (b.active != null) { fields.push('active = ?'); vals.push(b.active ? 1 : 0); }
  if (b.price != null) { fields.push('price_cents = ?'); vals.push(euroToCents(b.price)); }
  if (b.stock != null) { fields.push('stock = ?'); vals.push(b.stock === '' ? null : parseInt(b.stock, 10)); }
  if (b.sort_order != null) { fields.push('sort_order = ?'); vals.push(parseInt(b.sort_order, 10) || 0); }
  if (!fields.length) return res.json({ ok: true });
  vals.push(p.id);
  db.prepare('UPDATE products SET ' + fields.join(', ') + ' WHERE id = ?').run(...vals);
  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', requireAuth, (req, res) => {
  const p = shop.getProductById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Niet gevonden.' });
  const used = db.prepare('SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1').get(p.id);
  if (used) {
    db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(p.id); // soft delete (historie behouden)
    return res.json({ ok: true, soft: true });
  }
  if (p.image) { try { unlinkSync(path.join(UPLOAD_DIR, p.image)); } catch {} }
  if (p.digital_file) { try { unlinkSync(path.join(SECURE_DIR, p.digital_file)); } catch {} }
  db.prepare('DELETE FROM products WHERE id = ?').run(p.id);
  res.json({ ok: true });
});

/* ---- admin: bestellingen ---- */
app.get('/api/admin/orders', requireAuth, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE status IN ('paid','fulfilled') ORDER BY id DESC LIMIT 200").all();
  res.json(orders.map(o => ({ ...o, items: shop.getOrderItems(o.id) })));
});

app.patch('/api/admin/orders/:id', requireAuth, async (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Niet gevonden.' });
  const b = req.body || {};
  if (b.action === 'resend') {
    const items = shop.getOrderItems(o.id).filter(i => i.type === 'digital' && i.digital_file);
    const links = items.map(it => ({ name: it.digital_filename || it.name, url: PUBLIC_BASE_URL + '/download/' + shop.mintToken(o.id, it, TOKEN_TTL_HOURS, TOKEN_MAX_USES) }));
    let r = { ok: true };
    try { if (links.length) r = await sendDigitalDelivery(o, links); } catch { r = { ok: false }; }
    shop.setEmailStatus(o.id, r && r.ok ? 'sent' : 'failed');
    return res.json({ ok: !!(r && r.ok) });
  }
  if (b.tracking != null) {
    shop.setTracking(o.id, String(b.tracking).trim());
    if (b.notify) { try { await sendTracking({ ...o, tracking: String(b.tracking).trim() }); } catch {} }
  }
  if (b.fulfilled) shop.markFulfilled(o.id);
  res.json({ ok: true });
});

/* ---- DASHBOARD (beveiligd) ---- */
app.get(['/dashboard', '/dashboard.html'], requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

/* ---- STATISCHE SITE ---- */
// Bescherm server-interne paden tegen statische uitlevering (db, code, config).
const BLOCKED = /^\/(?:data|lib|scripts|node_modules|admin)(?:\/|$)|^\/(?:server\.js|package(?:-lock)?\.json|Dockerfile|DEPLOY\.md|\.dockerignore|\.gitignore|\.env)$/i;
app.use((req, res, next) => {
  if (BLOCKED.test(req.path)) return res.status(404).end();
  next();
});
app.use(express.static(__dirname, {
  dotfiles: 'ignore',
  extensions: ['html'],
  setHeaders: (res, p) => {
    if (/\.(?:css|js|png|jpe?g|webp|mp3|mp4|ico)$/.test(p)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

app.listen(PORT, () => {
  console.log('Mindlockresidence draait op poort ' + PORT);
});
