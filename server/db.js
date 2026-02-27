const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'roomcraft.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password     TEXT    NOT NULL,
    display_name TEXT    NOT NULL,
    role         TEXT    NOT NULL DEFAULT 'Interior Designer',
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login   TEXT
  );

  CREATE TABLE IF NOT EXISTS designs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL DEFAULT 'Untitled Design',
    status     TEXT    NOT NULL DEFAULT 'draft'
                 CHECK(status IN ('draft','in_progress','finished')),
    room       TEXT    NOT NULL DEFAULT '{}',
    furniture  TEXT    NOT NULL DEFAULT '[]',
    notes      TEXT    DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_designs_user   ON designs(user_id);
  CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status);
`);

const users = {
  create:          db.prepare(`INSERT INTO users (email,password,display_name,role) VALUES (@email,@password,@display_name,@role)`),
  findByEmail:     db.prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`),
  findById:        db.prepare(`SELECT id,email,display_name,role,created_at,last_login FROM users WHERE id = ?`),
  updateLastLogin: db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`),
  emailExists:     db.prepare(`SELECT 1 FROM users WHERE email = ? COLLATE NOCASE`)
};

const designs = {
  create:        db.prepare(`INSERT INTO designs (user_id,name,status,room,furniture,notes) VALUES (@user_id,@name,@status,@room,@furniture,@notes)`),
  update:        db.prepare(`UPDATE designs SET name=@name,status=@status,room=@room,furniture=@furniture,notes=@notes,updated_at=datetime('now') WHERE id=@id AND user_id=@user_id`),
  updateStatus:  db.prepare(`UPDATE designs SET status=@status,updated_at=datetime('now') WHERE id=@id AND user_id=@user_id`),
  delete:        db.prepare(`DELETE FROM designs WHERE id=? AND user_id=?`),
  findById:      db.prepare(`SELECT * FROM designs WHERE id=? AND user_id=?`),
  findAllForUser:db.prepare(`SELECT * FROM designs WHERE user_id=? ORDER BY updated_at DESC`),
  findByStatus:  db.prepare(`SELECT * FROM designs WHERE user_id=? AND status=? ORDER BY updated_at DESC`),
  duplicate:     db.prepare(`INSERT INTO designs (user_id,name,status,room,furniture,notes) SELECT user_id,name||' (Copy)','draft',room,furniture,notes FROM designs WHERE id=? AND user_id=?`),
  countByStatus: db.prepare(`SELECT status, COUNT(*) as count FROM designs WHERE user_id=? GROUP BY status`)
};

function parseDesign(row) {
  if (!row) return null;
  return { ...row, room: JSON.parse(row.room || '{}'), furniture: JSON.parse(row.furniture || '[]') };
}

function parseDesigns(rows) { return rows.map(parseDesign); }

module.exports = { db, users, designs, parseDesign, parseDesigns };
