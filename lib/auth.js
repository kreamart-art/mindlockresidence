// Veilige login: scrypt-hash, timing-safe vergelijk. Geen wachtwoord in de code.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

// Owner-gegevens komen uit env. ADMIN_PASSWORD_HASH heeft de voorkeur
// (zet 'm met `npm run hash`). Valt anders terug op ADMIN_PASSWORD (plain),
// alleen handig lokaal; gebruik in productie altijd de hash.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'mindlockresidence@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// De scrypt-hash bevat '$'-tekens. Coolify/Docker kunnen '$...' als variabele
// interpreteren en zo de hash slopen. Daarom accepteren we ook een base64-variant
// (zonder '$'): die wordt hier teruggedecodeerd naar 'scrypt$salt$key'.
function resolveHash(v) {
  if (!v) return '';
  if (v.includes('$')) return v.trim();
  try {
    const dec = Buffer.from(v.trim(), 'base64').toString('utf8');
    if (dec.startsWith('scrypt$')) return dec;
  } catch { /* geen geldige base64 */ }
  return v.trim();
}
const ADMIN_PASSWORD_HASH = resolveHash(process.env.ADMIN_PASSWORD_HASH || '');

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const dk = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${dk}`;
}

function verifyHash(password, stored) {
  try {
    const [scheme, salt, key] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !key) return false;
    const dk = scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(key, 'hex');
    return dk.length === keyBuf.length && timingSafeEqual(dk, keyBuf);
  } catch {
    return false;
  }
}

export function checkLogin(email, password) {
  if (!email || !password) return false;
  if (email.trim().toLowerCase() !== ADMIN_EMAIL) return false;
  if (ADMIN_PASSWORD_HASH) return verifyHash(password, ADMIN_PASSWORD_HASH);
  // Platte-wachtwoord fallback is alleen voor lokaal; in productie uitgeschakeld.
  if (ADMIN_PASSWORD && process.env.NODE_ENV !== 'production') return password === ADMIN_PASSWORD;
  return false;
}

export function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'unauthorized' });
  return res.redirect('/login.html');
}

export { ADMIN_EMAIL };
