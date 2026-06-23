// SQLite database (node:sqlite, geen native deps -> werkt out-of-the-box op Coolify)
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// DATA_DIR ligt bewust BUITEN de projectmap (extra beveiliging: de statische
// server kan de database dan nooit uitleveren). In productie /data via volume,
// lokaal valt 'ie terug op ./data naast de code.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const db = new DatabaseSync(path.join(DATA_DIR, 'mlr.db'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS works (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    subtitle    TEXT DEFAULT '',
    category    TEXT NOT NULL,          -- muziek | film | foto | design | studio | workshop
    media_type  TEXT NOT NULL DEFAULT 'image', -- image | video | youtube
    file        TEXT DEFAULT '',        -- bestandsnaam in uploads/ (image/video)
    youtube_id  TEXT DEFAULT '',        -- voor youtube-kaarten
    featured    INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export default db;
