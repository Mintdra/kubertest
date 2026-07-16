// backend/db/database.js
// Sets up the SQLite database file and creates tables if they don't exist yet.

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'votes.db');
const db = new Database(dbPath);

// Cached copy of candidates (kept in sync with the blockchain by contractListener.js)
db.exec(`
  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY,       -- matches the candidate's index on-chain
    name TEXT NOT NULL,
    vote_count INTEGER NOT NULL DEFAULT 0
  )
`);

// Permanent log of every vote event seen, for history/activity feed purposes
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voter_address TEXT NOT NULL,
    candidate_id INTEGER NOT NULL,
    tx_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('SQLite database ready at', dbPath);

module.exports = db;