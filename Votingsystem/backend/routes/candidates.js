// backend/routes/candidates.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/candidates
// Returns the cached candidate list — fast, no blockchain calls needed.
router.get('/candidates', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, vote_count FROM candidates ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/votes
// Returns the most recent votes, newest first — a real activity feed,
// something that's expensive to build directly from the blockchain.
router.get('/votes', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT v.id, v.voter_address, v.candidate_id, c.name AS candidate_name, v.tx_hash, v.created_at
      FROM votes v
      LEFT JOIN candidates c ON c.id = v.candidate_id
      ORDER BY v.created_at DESC
      LIMIT 20
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;