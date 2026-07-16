# BallotBox — Fullstack On-Chain Voting App

A decentralized voting application built for the Final Project. Votes are
cast and validated entirely on the blockchain; a backend service caches
results and logs vote history for fast reads; the frontend is a thin
client that ties both together for the user.

---

## What this project includes

```
Votingsystem/
├── contracts/
│   └── BallotBox.sol           Smart contract: candidates, votes, validation
├── scripts/
│   └── deploy.js                Deployment script (Hardhat)
├── hardhat.config.js            Hardhat network + compiler configuration
│
├── frontend/
│   ├── index.html                Page structure
│   ├── style.css                  All visual styling
│   └── app.js                      Wallet connection, voting, backend calls
│
└── backend/
    ├── server.js                  Express entry point
    ├── routes/
    │   └── candidates.js          REST endpoints (/api/candidates, /api/votes)
    ├── services/
    │   └── contractListener.js    Listens for on-chain events, syncs to DB
    └── db/
        ├── database.js             SQLite connection + table setup
        └── votes.db                 The actual database file (auto-created)
```

| Layer | Technology |
|---|---|
| Smart contract | Solidity `^0.8.19` |
| Development environment | Hardhat 2 |
| Frontend | Plain HTML / CSS / JavaScript |
| Blockchain connectivity | ethers.js v5 (both frontend, via CDN, and backend, via npm) + MetaMask |
| Backend | Node.js + Express |
| Database | SQLite (`better-sqlite3`) |

---

## Architecture

```
                     ┌─────────────────────┐
                     │   Frontend (HTML/JS) │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │ writes (votes)                │ reads (candidates, history)
              ▼                                     ▼
     ┌─────────────────┐                 ┌─────────────────────┐
     │    MetaMask       │                 │   Backend API (Express) │
     └────────┬─────────┘                 └──────────┬──────────┘
              │                                              │
              ▼                                              │
     ┌─────────────────────────┐                  │
     │ BallotBox.sol (blockchain) │◄─────────────┘
     └─────────────────────────┘        listens for events,
                                                     caches into SQLite
```

**Key design point:** voting itself always goes straight from the frontend
through MetaMask to the smart contract — the backend never sits in the
path of an actual vote being cast or validated. The backend only *reads*
from the blockchain (via an event listener) and serves cached copies of
that data faster. If the backend were deleted entirely, the blockchain's
vote counts would remain completely intact and correct — the backend is a
performance/convenience layer, not a dependency for the system's integrity.
The frontend also has a built-in fallback: if the backend is unreachable,
it automatically reads directly from the blockchain instead.

---

## Features

- **On-chain candidate list** — set at deployment via the contract's
  constructor; more can be added via `addCandidate()` (owner-only,
  callable via console/script).
- **One vote per wallet** — enforced by the contract itself
  (`hasVoted` mapping + `require()`), not just hidden in the frontend.
- **Live results** — vote counts and a "current leader" callout, served
  from the backend's cache when available, falling back to free `view`
  function calls directly against the blockchain otherwise.
- **Recent activity feed** — a real vote history (voter, candidate,
  timestamp) powered by the backend listening for the contract's `Voted`
  event and logging it to SQLite — something expensive to reconstruct
  directly from the blockchain, and a genuine example of backend logic
  adding a capability the frontend/contract pair didn't have alone.
- **Wallet connection flow** — Connect Wallet button, connection status
  indicator, truncated address display once connected.
- **Input & state validation** (see table below), enforced both for a
  responsive UI and — more importantly — at the smart contract level,
  where it can't be bypassed.
- **Auto-recovery from network/account switches** — the page reloads
  itself if MetaMask's connected account or network changes mid-session.
- **Graceful backend fallback** — candidate/result reads still work even
  if the backend server isn't running; only the activity feed (which
  genuinely requires the backend) becomes unavailable.

### Validation implemented
| Check | Where |
|---|---|
| Voting must be open | `require(votingOpen, ...)` in `vote()` |
| Candidate ID must exist | `require(_candidateId < candidates.length, ...)` |
| One vote per wallet | `require(!hasVoted[msg.sender], ...)` |
| Candidate name can't be empty | `require(bytes(_name).length > 0, ...)` in `addCandidate()` |
| Only the owner can add candidates / close voting | `onlyOwner` modifier |
| At least 2 candidates required to deploy | `require()` in the constructor |

---

## Important network routes

| Purpose | Value |
|---|---|
| Local Hardhat node RPC URL | `http://127.0.0.1:8545` |
| Local Hardhat Chain ID | `31337` |
| Frontend local server | `http://localhost:8000/index.html` |
| Backend API base URL | `http://localhost:3000` |
| Backend endpoint — cached candidates | `GET http://localhost:3000/api/candidates` |
| Backend endpoint — recent vote history | `GET http://localhost:3000/api/votes` |
| Contract address | Set per-deployment in **both** `frontend/app.js` and `backend/services/contractListener.js` → `CONTRACT_ADDRESS` (changes every time the local node restarts) |

> ⚠️ The local Hardhat network resets completely every time
> `npx hardhat node` is stopped and restarted. You must redeploy and
> update `CONTRACT_ADDRESS` in **both** the frontend and the backend after
> every restart — missing one will cause the frontend and backend to be
> looking at two different contract instances.

---

## How to run the DApp

You'll need **4 terminals** open at once.

### 1. Install dependencies

Project root (Hardhat/contract tooling):
```bash
npm install
```

Backend:
```bash
cd backend
npm install
```

### 2. Compile the contract
```bash
npx hardhat compile
```

### 3. Terminal 1 — start the local blockchain
Leave this running for your entire session:
```bash
npx hardhat node
```

### 4. Terminal 2 — deploy the contract
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Copy the printed contract address.

### 5. Update both config files with the new address

`frontend/app.js`:
```javascript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddressHere";
```

`backend/services/contractListener.js`:
```javascript
const CONTRACT_ADDRESS = '0xYourDeployedContractAddressHere';
```

### 6. Terminal 3 — start the backend
```bash
cd backend
node server.js
```
Expect to see:
```
SQLite database ready at ...
Synced 3 candidate(s) from the blockchain.
Listening for on-chain events (Voted, CandidateAdded)...
Backend API running at http://localhost:3000
```

### 7. Terminal 4 — serve the frontend
```bash
cd frontend
python -m http.server 8000
```

### 8. Connect MetaMask
- Add a network manually:
  - Network name: `Hardhat Local`
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Currency symbol: `ETH`
- Import a test account using a private key printed by `npx hardhat node`.

### 9. Use it
Open `http://localhost:8000/index.html`, click **Connect Wallet**, vote,
and watch the **Recent activity** panel update with your vote.

---

## Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `CALL_EXCEPTION` on `getCandidateCount()` | Local node was restarted, or wrong address | Redeploy, copy the fresh address into **both** `frontend/app.js` and `backend/services/contractListener.js` |
| `invalid address` error | Address has wrong length (must be 42 characters) | Copy the address directly from the terminal, don't retype |
| `Nonce too high` when voting | Node was restarted but MetaMask's cache wasn't | MetaMask → Settings → Advanced → Delete activity and nonce data |
| MetaMask stuck on wrong network even after switching | Site cached the old connection | MetaMask → Connected sites → Disconnect → reconnect |
| Backend: `Cannot find module './routes/candidates'` | File missing or misnamed | Check `backend/routes/candidates.js` exists with that exact spelling |
| Backend: `Cannot read properties of undefined (reading 'JsonRpcProvider')` | Wrong ethers version installed | `npm install ethers@5.7.2` inside `backend/` — must match the frontend's v5 |
| Frontend "Could not load candidates" even with backend running | Backend and frontend pointed at different contract addresses | Re-check `CONTRACT_ADDRESS` matches in both files |
| Activity feed says "Backend unavailable" | Backend server isn't running, or wrong port | Confirm `node server.js` is running in Terminal 3 |
| Port 8545 already in use / stale data appears | An old `npx hardhat node` process never fully closed | `netstat -ano | findstr :8545` → `taskkill /PID <pid> /F` → restart clean |

---

## License
MIT — for educational use.
