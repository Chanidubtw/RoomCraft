const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const DB_PATH = path.join(__dirname, 'roomcraft.db');
const db      = new sqlite3.Database(DB_PATH);

// Helper to run queries as promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables
async function init() {
  await run(`PRAGMA foreign_keys = ON`);
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      email        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password     TEXT    NOT NULL,
      display_name TEXT    NOT NULL,
      role         TEXT    NOT NULL DEFAULT 'Interior Designer',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      last_login   TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS designs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL DEFAULT 'Untitled Design',
      status     TEXT    NOT NULL DEFAULT 'draft',
      room       TEXT    NOT NULL DEFAULT '{}',
      furniture  TEXT    NOT NULL DEFAULT '[]',
      notes      TEXT    DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_designs_user   ON designs(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status)`);
  console.log('Database initialized');
}

function parseDesign(row) {
  if (!row) return null;
  return { ...row, room: JSON.parse(row.room || '{}'), furniture: JSON.parse(row.furniture || '[]') };
}

function parseDesigns(rows) {
  return rows.map(parseDesign);
}

module.exports = { run, get, all, init, parseDesign, parseDesigns };