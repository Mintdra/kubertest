# BallotBox — Code Walkthrough Script

A narration script for walking an audience through `BallotBox.sol` and
your actual `vote-index.html` side by side, explaining how every piece
connects. Read the **bold narration lines** aloud; the code blocks are
what to point at on screen.

---

## Opening line

> "I'm going to show you two files: the smart contract, which is the
> backend and single source of truth, and the frontend, which is just a
> thin client that talks to it. I'll show how a single click in the
> browser turns into a permanent, verifiable change on the blockchain."

---

## PART 1 — The Smart Contract (`BallotBox.sol`)

### 1a. State variables — "the database"

```solidity
struct Candidate {
    string name;
    uint256 voteCount;
}

address public owner;
Candidate[] private candidates;

mapping(address => bool) public hasVoted;
mapping(address => uint256) public votedFor;

bool public votingOpen = true;
```

> "This is the entire 'database' for the app — and it lives permanently
> on the blockchain, not in a server I control. `candidates` is an array
> of structs holding each name and vote count. `hasVoted` is a mapping —
> think of it like a dictionary — from a wallet address to true/false,
> so the contract can instantly check if an address already voted.
> `owner` records who deployed the contract, used later for
> permission checks."

### 1b. The constructor — "set up once, at deployment"

```solidity
constructor(string[] memory _candidateNames) {
    require(_candidateNames.length >= 2, "Need at least 2 candidates");
    owner = msg.sender;
    for (uint256 i = 0; i < _candidateNames.length; i++) {
        candidates.push(Candidate({ name: _candidateNames[i], voteCount: 0 }));
        emit CandidateAdded(i, _candidateNames[i]);
    }
}
```

> "This runs exactly once, at deployment. `msg.sender` — the wallet that
> deployed the contract — automatically becomes the owner. Notice the
> `require()` right at the top: even the constructor validates its input,
> refusing to deploy with fewer than two candidates."

### 1c. The write function — `vote()`

```solidity
function vote(uint256 _candidateId) external {
    require(votingOpen, "Voting is closed");
    require(_candidateId < candidates.length, "Invalid candidate");
    require(!hasVoted[msg.sender], "This address has already voted");

    hasVoted[msg.sender] = true;
    votedFor[msg.sender] = _candidateId;
    candidates[_candidateId].voteCount += 1;

    emit Voted(msg.sender, _candidateId, candidates[_candidateId].voteCount);
}
```

> "This is the only function that changes state, so it's the only one
> that costs gas and needs a wallet signature. Three `require()` checks
> run in order before anything is written — voting must be open, the
> candidate ID must actually exist, and this exact wallet address must
> not have voted before. If any of those fail, the entire transaction is
> reverted — nothing is written, and the person gets their gas back
> minus a small execution fee. Only after all three pass does the
> function update state and emit an event announcing what happened."

### 1d. The read functions — "free, instant, no wallet signature needed"

```solidity
function getCandidateCount() external view returns (uint256) {
    return candidates.length;
}

function getCandidate(uint256 _candidateId) external view
    returns (string memory name, uint256 voteCount)
{
    require(_candidateId < candidates.length, "Invalid candidate");
    Candidate storage c = candidates[_candidateId];
    return (c.name, c.voteCount);
}
```

> "The `view` keyword marks these as read-only — they can't modify
> anything, so calling them doesn't cost gas or need a signature. This
> matters for the frontend: loading the candidate list doesn't bother
> the user with a MetaMask popup at all."

---

## PART 2 — The Frontend (your `vote-index.html`)

### 2a. The connection — how the browser and blockchain link up

```javascript
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const CONTRACT_ABI = [
  "function vote(uint256 _candidateId) external",
  "function addCandidate(string calldata _name) external",
  "function closeVoting() external",
  "function getCandidateCount() external view returns (uint256)",
  "function getCandidate(uint256 _candidateId) external view returns (string memory name, uint256 voteCount)",
  "function getWinner() external view returns (string memory name, uint256 voteCount)",
  "function hasVoted(address) external view returns (bool)",
  "function votedFor(address) external view returns (uint256)",
  "function votingOpen() external view returns (bool)",
  "event Voted(address indexed voter, uint256 indexed candidateId, uint256 newVoteCount)"
];
```

> "These two things are what actually link the frontend to that specific
> contract. The address says *where* on the blockchain to look. The ABI —
> Application Binary Interface — is basically a menu of function names and
> their input/output types, telling ethers.js exactly how to format a call
> so the contract understands it. Without a matching ABI, the frontend
> wouldn't know these functions even exist. Notice the ABI list here is
> longer than what's strictly used — it also includes `addCandidate`,
> `closeVoting`, and `votingOpen`, giving the frontend the *option* to
> call owner-only functions too, even though the current UI doesn't
> expose buttons for them."

### 2b. Connecting MetaMask

```javascript
let provider, signer, contract, currentAccount = null;

async function connectWallet(){
    if (typeof window.ethereum === 'undefined'){
      alert('MetaMask not detected. Please install the MetaMask browser extension.');
      return;
    }
    try{
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      currentAccount = accounts[0];
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      document.getElementById('acctLabel').innerHTML =
        '<span>' + currentAccount.slice(0,6) + '...' + currentAccount.slice(-4) + '</span>';
      document.getElementById('statusDot').classList.add('on');
      document.getElementById('connectBtn').textContent = 'Connected';
      document.getElementById('connectBtn').disabled = true;

      window.ethereum.on('accountsChanged', () => window.location.reload());
      window.ethereum.on('chainChanged', () => window.location.reload());

      loadCandidates();
    }catch(err){
      console.error(err);
      alert('Connection was rejected or failed: ' + (err.message || err));
    }
}
```

> "`window.ethereum` is injected into the page by the MetaMask extension —
> that's literally how a website talks to a wallet. `eth_requestAccounts`
> is what triggers that 'Connect' popup you saw. `Web3Provider` wraps that
> connection so ethers.js can read blockchain state through it, and
> `getSigner()` gets the specific account that's allowed to *sign*
> transactions — meaning approve and pay for them. Once connected,
> ethers.js wraps everything into one `contract` object — after this
> point, calling `contract.vote(0)` in JavaScript is functionally the
> same as calling `vote(0)` directly on the Solidity contract.
>
> Two extra lines worth pointing out: the `accountsChanged` and
> `chainChanged` listeners automatically reload the page if the person
> switches accounts or networks in MetaMask mid-session — this avoids
> the exact stale-connection bug I ran into during testing, where the
> page kept talking to the wrong network until I manually reconnected."

### 2c. Reading data — `loadCandidates()`

```javascript
async function loadCandidates(){
    const count = (await contract.getCandidateCount()).toNumber();
    const alreadyVoted = await contract.hasVoted(currentAccount);
    const votedIndex = alreadyVoted ? (await contract.votedFor(currentAccount)).toNumber() : -1;

    let candidates = [];
    for (let i = 0; i < count; i++){
      const c = await contract.getCandidate(i);
      const votes = c.voteCount.toNumber ? c.voteCount.toNumber() : Number(c.voteCount);
      candidates.push({ name: c.name, votes });
    }
    // ...builds the HTML for each candidate row, including the vote bar

    const winner = await contract.getWinner();
    // ...displays the current leader
}
```

> "This directly calls the `view` functions from the contract —
> `getCandidateCount`, `getCandidate`, `hasVoted`, `votedFor`, and
> `getWinner`. No MetaMask popup happens for any of these — they're free
> reads straight from the blockchain's current state. Notice it also
> checks `hasVoted` and `votedFor` here, *before* building the candidate
> list — that's how the UI decides whether to show a 'Vote' button or a
> '✓ Your vote' label for each row."

### 2d. Writing data — `castVote()`

```javascript
async function castVote(candidateId){
    if (!contract){ showMsg('voteMsg', 'Connect your wallet first.', 'error'); return; }

    try{
      const alreadyVoted = await contract.hasVoted(currentAccount);
      if (alreadyVoted){
        showMsg('voteMsg', 'This wallet has already voted.', 'error');
        return;
      }
    }catch(err){ /* fall through to tx attempt */ }

    const btn = document.getElementById('vote-btn-' + candidateId);
    if (btn){ btn.disabled = true; btn.textContent = 'Confirm in MetaMask...'; }

    try{
      const tx = await contract.vote(candidateId);
      if (btn) btn.textContent = 'Mining transaction...';
      await tx.wait();
      showMsg('voteMsg', 'Vote recorded on-chain! Tx hash: ' + tx.hash, 'success');
      loadCandidates();
    }catch(err){
      console.error(err);
      showMsg('voteMsg', 'Vote failed: ' + (err.reason || err.message || err), 'error');
      if (btn){ btn.disabled = false; btn.textContent = 'Vote'; }
    }
}
```

> "This is the moment a browser click becomes a real blockchain
> transaction. Notice it actually validates twice: first a quick
> *frontend* check calling `hasVoted()` — this just makes the UI feel
> responsive, showing an error immediately without waiting on a
> transaction. But the *real* enforcement happens a few lines down, when
> `contract.vote(candidateId)` is called — that's what actually triggers
> the MetaMask confirmation popup and sends the transaction. Even if this
> frontend check were deleted entirely, the contract's own `require()`
> would still block a double vote — the frontend check is just a nicer
> user experience, not the actual security boundary.
>
> `tx.wait()` pauses execution here until the transaction is actually
> mined — that's the network processing time you saw during testing.
> Only after that confirmation do we call `loadCandidates()` again, so
> the UI reflects the *new*, updated state. And notice the `catch` block
> at the bottom — if the transaction reverts for any reason, the error
> message is pulled from `err.reason`, which is exactly where a
> Solidity `require()` failure message like `'This address has already
> voted'` shows up."

---