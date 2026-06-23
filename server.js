import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import db, { UPLOAD_DIR } from './lib/db.js';
import { checkLogin, requireAuth, ADMIN_EMAIL } from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // achter Coolify/Traefik reverse proxy
app.disable('x-powered-by');
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
