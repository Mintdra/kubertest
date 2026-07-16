// backend/services/contractListener.js
// Connects to your local Hardhat node, reads the current candidate list on
// startup, then listens for future Voted / CandidateAdded events and keeps
// the SQLite database in sync automatically.

const { ethers } = require('ethers');
const db = require('../db/database');

// ============================================================
// CONFIG — must match your currently deployed contract exactly
// (same address you paste into frontend/app.js)
// ============================================================
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const RPC_URL = 'http://127.0.0.1:8545';

const CONTRACT_ABI = [
  'function getCandidateCount() external view returns (uint256)',
  'function getCandidate(uint256 _candidateId) external view returns (string memory name, uint256 voteCount)',
  'event Voted(address indexed voter, uint256 indexed candidateId, uint256 newVoteCount)',
  'event CandidateAdded(uint256 indexed candidateId, string name)'
];
// ============================================================

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const upsertCandidate = db.prepare(`
  INSERT INTO candidates (id, name, vote_count)
  VALUES (@id, @name, @voteCount)
  ON CONFLICT(id) DO UPDATE SET name = @name, vote_count = @voteCount
`);

const insertVote = db.prepare(`
  INSERT INTO votes (voter_address, candidate_id, tx_hash)
  VALUES (@voter, @candidateId, @txHash)
`);

const updateVoteCount = db.prepare(`
  UPDATE candidates SET vote_count = @voteCount WHERE id = @id
`);

/// Pulls the full current candidate list from the blockchain and writes it
/// into SQLite. Runs once at startup so the cache isn't empty/stale.
async function syncExistingCandidates() {
  try {
    const count = (await contract.getCandidateCount()).toNumber();
    for (let i = 0; i < count; i++) {
      const c = await contract.getCandidate(i);
      upsertCandidate.run({
        id: i,
        name: c.name,
        voteCount: c.voteCount.toNumber()
      });
    }
    console.log(`Synced ${count} candidate(s) from the blockchain.`);
  } catch (err) {
    console.error('Failed to sync candidates on startup:', err.message);
    console.error('Check that CONTRACT_ADDRESS is correct and npx hardhat node is running.');
  }
}

/// Starts listening for live events. Call this once when the server boots.
function startListening() {
  contract.on('CandidateAdded', (candidateId, name) => {
    const id = candidateId.toNumber();
    console.log(`[event] CandidateAdded: #${id} ${name}`);
    upsertCandidate.run({ id, name, voteCount: 0 });
  });

  contract.on('Voted', (voter, candidateId, newVoteCount, event) => {
    const id = candidateId.toNumber();
    const votes = newVoteCount.toNumber();
    console.log(`[event] Voted: ${voter} -> candidate #${id} (now ${votes} votes)`);

    updateVoteCount.run({ id, voteCount: votes });
    insertVote.run({
      voter: voter,
      candidateId: id,
      txHash: event.transactionHash
    });
  });

  console.log('Listening for on-chain events (Voted, CandidateAdded)...');
}

module.exports = { syncExistingCandidates, startListening };