// Shop: producten, bestellingen, downloads. Zelfde node:sqlite db als de rest.
// Geldbedragen ALTIJD in hele centen (INTEGER). Prijzen leven server-side.
import db from './db.js';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
// Digitale bestanden staan BUITEN de statische root en buiten /uploads.
// express.static(__dirname) kan hier fysiek niet bij; alleen /download/:token serveert ze.
export const SECURE_DIR = path.join(DATA_DIR, 'secure');
mkdirSync(SECURE_DIR, { recursive: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    slug             TEXT UNIQUE NOT NULL,
    subtitle         TEXT DEFAULT '',
    description      TEXT DEFAULT '',
    type             TEXT NOT NULL,                 -- 'digital' | 'physical'
    price_cents      INTEGER NOT NULL,
    currency         TEXT NOT NULL DEFAULT 'eur',
    image            TEXT DEFAULT '',               -- bestandsnaam in uploads/ (publiek mag)
    digital_file     TEXT DEFAULT '',               -- bestandsnaam in secure/ (NOOIT publiek)
    digital_filename TEXT DEFAULT '',               -- nette downloadnaam
    stock            INTEGER,                       -- NULL = onbeperkt; alleen physical
    shipping_cents   INTEGER DEFAULT 0,             -- vaste verzendkosten; physical
    badge            TEXT DEFAULT '',
    active           INTEGER NOT NULL DEFAULT 1,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_session_id     TEXT UNIQUE NOT NULL,
    stripe_payment_intent TEXT DEFAULT '',
    status                TEXT NOT NULL DEFAULT 'pending', -- pending|paid|fulfilled|failed|expired
    email                 TEXT DEFAULT '',
    amount_total_cents    INTEGER DEFAULT 0,
    currency              TEXT NOT NULL DEFAULT 'eur',
    shipping_json         TEXT DEFAULT '',
    has_digital           INTEGER NOT NULL DEFAULT 0,
    has_physical          INTEGER NOT NULL DEFAULT 0,
    tracking              TEXT DEFAULT '',
    email_status          TEXT DEFAULT '',          -- ''|sent|failed
    fulfilled_at          TEXT DEFAULT '',
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at               TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         INTEGER NOT NULL,
    product_id       INTEGER,
    name             TEXT NOT NULL,
    type             TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity         INTEGER NOT NULL DEFAULT 1,
    digital_file     TEXT DEFAULT '',
    digital_filename TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS download_tokens (
    token_hash    TEXT PRIMARY KEY,
    order_id      INTEGER NOT NULL,
    order_item_id INTEGER NOT NULL,
    product_id    INTEGER NOT NULL,
    file          TEXT NOT NULL,
    filename      TEXT NOT NULL,
    expires_at    INTEGER NOT NULL,
    max_uses      INTEGER NOT NULL DEFAULT 3,
    used_count    INTEGER NOT NULL DEFAULT 0,
    consumed_at   TEXT DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    event_id    TEXT PRIMARY KEY,
    type        TEXT DEFAULT '',
    received_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_active ON products(active, sort_order);
  CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(stripe_session_id);
  CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_tokens_order ON download_tokens(order_id);
`);

export const CURRENCY = (process.env.SHOP_CURRENCY || 'eur').toLowerCase();

export function slugify(name) {
  const base = String(name).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  let slug = base, n = 2;
  while (db.prepare('SELECT 1 FROM products WHERE slug = ?').get(slug)) slug = base + '-' + (n++);
  return slug;
}

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// ---- producten ----
export function getActiveProducts() {
  return db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort_order DESC, id DESC').all();
}
export function getAllProducts() {
  return db.prepare('SELECT * FROM products ORDER BY active DESC, sort_order DESC, id DESC').all();
}
export function getProductBySlug(slug) {
  return db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(slug);
}
export function getProductById(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

// Veilige publieke projectie: nooit digital_file/secure paden lekken.
export function publicProduct(p) {
  return {
    id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, description: p.description,
    type: p.type, price_cents: p.price_cents, currency: p.currency,
    image: p.image ? '/uploads/' + p.image : null,
    badge: p.badge,
    in_stock: p.type === 'physical' ? (p.stock == null || p.stock > 0) : true
  };
}

// ---- bestellingen ----
export function createPendingOrder({ sessionId, currency, hasDigital, hasPhysical }) {
  const info = db.prepare(
    'INSERT INTO orders (stripe_session_id, currency, has_digital, has_physical) VALUES (?,?,?,?)'
  ).run(sessionId, currency, hasDigital ? 1 : 0, hasPhysical ? 1 : 0);
  return info.lastInsertRowid;
}
export function addOrderItem(orderId, it) {
  db.prepare(
    'INSERT INTO order_items (order_id, product_id, name, type, unit_price_cents, quantity, digital_file, digital_filename) VALUES (?,?,?,?,?,?,?,?)'
  ).run(orderId, it.product_id, it.name, it.type, it.unit_price_cents, it.quantity, it.digital_file || '', it.digital_filename || '');
}
export function getOrderBySession(sessionId) {
  return db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(sessionId);
}
export function getOrderItems(orderId) {
  return db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
}

// Idempotente webhook: true = nieuw event, false = al gezien (replay).
export function recordEvent(eventId, type) {
  const info = db.prepare('INSERT OR IGNORE INTO webhook_events (event_id, type) VALUES (?,?)').run(eventId, type);
  return info.changes === 1;
}

// Atomair: alleen van pending naar paid (voorkomt dubbele fulfillment).
export function markPaidOnce(sessionId, { pi, email, amount, shippingJson }) {
  const info = db.prepare(
    `UPDATE orders SET status='paid', stripe_payment_intent=?, email=?, amount_total_cents=?, shipping_json=?, paid_at=datetime('now')
     WHERE stripe_session_id=? AND status='pending'`
  ).run(pi || '', email || '', amount || 0, shippingJson || '', sessionId);
  return info.changes === 1;
}

// Atomaire voorraad-afname; false als er niet genoeg is.
export function decrementStock(productId, qty) {
  const info = db.prepare(
    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL AND stock >= ?'
  ).run(qty, productId, qty);
  return info.changes === 1;
}

export function markFulfilled(orderId) {
  db.prepare("UPDATE orders SET status='fulfilled', fulfilled_at=datetime('now') WHERE id=?").run(orderId);
}
export function setEmailStatus(orderId, status) {
  db.prepare('UPDATE orders SET email_status=? WHERE id=?').run(status, orderId);
}
export function setTracking(orderId, tracking) {
  db.prepare('UPDATE orders SET tracking=? WHERE id=?').run(tracking, orderId);
}

// ---- download tokens ----
export function mintToken(orderId, item, ttlHours, maxUses) {
  const raw = randomBytes(32).toString('base64url');     // 256-bit, alleen in de e-maillink
  const expires = Date.now() + ttlHours * 3600 * 1000;
  db.prepare(
    'INSERT INTO download_tokens (token_hash, order_id, order_item_id, product_id, file, filename, expires_at, max_uses) VALUES (?,?,?,?,?,?,?,?)'
  ).run(sha256(raw), orderId, item.id, item.product_id || 0, item.digital_file, item.digital_filename || 'download', expires, maxUses);
  return raw;
}
export function getToken(raw) {
  return db.prepare('SELECT * FROM download_tokens WHERE token_hash = ?').get(sha256(raw));
}
// Atomaire claim van één download-credit; false als op/verlopen.
export function consumeToken(raw) {
  const now = Date.now();
  const info = db.prepare(
    `UPDATE download_tokens SET used_count = used_count + 1,
       consumed_at = CASE WHEN used_count + 1 >= max_uses THEN datetime('now') ELSE consumed_at END
     WHERE token_hash = ? AND expires_at > ? AND used_count < max_uses`
  ).run(sha256(raw), now);
  return info.changes === 1;
}
export function revokeTokensForOrder(orderId) {
  db.prepare('DELETE FROM download_tokens WHERE order_id = ?').run(orderId);
}

export default db;
