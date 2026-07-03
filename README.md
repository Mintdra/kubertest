# BallotBox — On-Chain Voting DApp

A decentralized voting application built for Assignment V. Votes are cast
and tallied entirely on the blockchain — the frontend is just a window
into that data, and MetaMask is what authorizes each vote.

---

## What this project includes

```
├── contracts/
│   └── BallotBox.sol      Smart contract: candidates, votes, validation
├── scripts/
│   └── deploy.js           Deployment script (Hardhat)
├── hardhat.config.js       Hardhat network + compiler configuration
└── vote-index.html         Frontend: connects MetaMask, casts + shows votes
```

| Layer | Technology |
|---|---|
| Smart contract | Solidity `^0.8.19` |
| Development environment | Hardhat 2 |
| Frontend | Plain HTML / CSS / JavaScript |
| Blockchain connectivity | ethers.js v5 (via CDN) + MetaMask |

---

## Features

- **On-chain candidate list** — set once at deployment via the contract's
  constructor.
- **One vote per wallet** — enforced by the contract itself
  (`hasVoted` mapping + `require()`), not just hidden in the frontend.
- **Live results** — vote counts and a "current leader" callout, read
  directly from the blockchain with free `view` function calls.
- **Wallet connection flow** — Connect Wallet button, connection status
  indicator, and truncated address display once connected.
- **Input & state validation** (see full list below), enforced both for a
  responsive UI and — more importantly — at the smart contract level,
  where it can't be bypassed.
- **Auto-recovery from network/account switches** — the page reloads
  itself if MetaMask's connected account or network changes mid-session,
  avoiding stale-connection bugs.
- **Owner-only functions available in the ABI** — `addCandidate()` and
  `closeVoting()` exist on the contract (callable via the browser console)
  even though the current UI doesn't expose buttons for them.

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
| Frontend local server | `http://localhost:8000/vote-index.html` |
| Contract address | Set per-deployment in `vote-index.html` → `CONTRACT_ADDRESS` (changes every time the local node restarts) |

> ⚠️ The local Hardhat network resets completely every time
> `npx hardhat node` is stopped and restarted — meaning any previously
> deployed contract, including its address, no longer exists. You must
> redeploy and update `CONTRACT_ADDRESS` after every restart.

If deploying to a public testnet instead (e.g. Sepolia) for a persistent,
shareable deployment:

| Purpose | Value |
|---|---|
| Sepolia Chain ID | `11155111` |
| Sepolia faucet (test ETH) | https://sepoliafaucet.com |
| Sepolia block explorer | https://sepolia.etherscan.io |

---

## How to run the DApp

### 1. Install dependencies
```bash
npm install
```

### 2. Compile the contract
```bash
npx hardhat compile
```

### 3. Start a local blockchain
Leave this terminal open for your entire session:
```bash
npx hardhat node
```

### 4. Deploy the contract
In a **second terminal**:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Copy the printed contract address.

### 5. Connect the frontend to your deployment
Open `vote-index.html`, find:
```javascript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddressHere";
```
Paste in the address from Step 4.

### 6. Serve the frontend
```bash
python -m http.server 8000
```
Open `http://localhost:8000/vote-index.html` in your browser.

### 7. Connect MetaMask
- Add a network manually:
  - Network name: `Hardhat Local`
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Currency symbol: `ETH`
- Import a test account using one of the private keys printed by
  `npx hardhat node` in Step 3.

### 8. Vote
Click **Connect Wallet**, then **Vote** next to a candidate, and confirm
the transaction in MetaMask.

---

## Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `CALL_EXCEPTION` on `getCandidateCount()` | Local node was restarted, or wrong address | Redeploy, copy the fresh address into `vote-index.html` |
| `invalid address` error | Address has wrong length (must be 42 characters) | Copy the address directly from the terminal, don't retype |
| MetaMask stuck on wrong network even after switching | Site cached the old connection | MetaMask → Connected sites → Disconnect → reconnect |
| "MetaMask not detected" when double-clicking the file | Extensions blocked on `file://` pages | Serve via `python -m http.server 8000` instead, or enable "Allow access to file URLs" for MetaMask |

---

## License
MIT — for educational use as part of Assignment V.
