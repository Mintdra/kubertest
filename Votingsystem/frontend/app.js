// ============================================================
// STEP 2 CONFIG — replace with your own deployed contract info
// ============================================================
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const BACKEND_URL = "http://localhost:3000";
 
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
// ============================================================
 
let provider, signer, contract, currentAccount = null;
 
function showMsg(id, text, type){
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'msg show ' + type;
}
 
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
    loadRecentActivity();
  }catch(err){
    console.error(err);
    alert('Connection was rejected or failed: ' + (err.message || err));
  }
}
 
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
    // Small delay gives the backend's event listener a moment to catch the
    // event and write it to the database before we ask for the feed.
    setTimeout(loadRecentActivity, 800);
  }catch(err){
    console.error(err);
    showMsg('voteMsg', 'Vote failed: ' + (err.reason || err.message || err), 'error');
    if (btn){ btn.disabled = false; btn.textContent = 'Vote'; }
  }
}
 
async function loadCandidates(){
  const listEl = document.getElementById('candidateList');
  const winnerEl = document.getElementById('winnerBox');
  if (!contract){
    listEl.innerHTML = '<p style="font-family:Arial, sans-serif; font-size:13px; color:var(--muted);">Connect your wallet first.</p>';
    return;
  }
 
  try{
    // Per-wallet info (has this address voted, and for whom) always comes
    // straight from the blockchain — it depends on which account is
    // connected right now, so it isn't something the backend's shared cache
    // can answer.
    const alreadyVoted = await contract.hasVoted(currentAccount);
    const votedIndex = alreadyVoted ? (await contract.votedFor(currentAccount)).toNumber() : -1;
 
    let candidates = [];
 
    // Try the backend first — one fast request instead of one blockchain
    // call per candidate.
    try{
      const res = await fetch(`${BACKEND_URL}/api/candidates`);
      if (!res.ok) throw new Error('Backend responded with an error');
      const rows = await res.json();
      candidates = rows.map(r => ({ name: r.name, votes: r.vote_count }));
      console.log('Candidates loaded from backend cache.');
    }catch(backendErr){
      // Backend not running / unreachable — fall back to reading directly
      // from the blockchain so the app still works standalone.
      console.warn('Backend unavailable, falling back to direct blockchain reads.', backendErr);
      const count = (await contract.getCandidateCount()).toNumber();
      for (let i = 0; i < count; i++){
        const c = await contract.getCandidate(i);
        const votes = c.voteCount.toNumber ? c.voteCount.toNumber() : Number(c.voteCount);
        candidates.push({ name: c.name, votes });
      }
    }
 
    let maxVotes = 0;
    candidates.forEach(c => { if (c.votes > maxVotes) maxVotes = c.votes; });
 
    let html = '';
    candidates.forEach((c, i) => {
      const pct = maxVotes > 0 ? Math.round((c.votes / maxVotes) * 100) : 0;
      const isVotedFor = (i === votedIndex);
      html += `<div class="candidate-row">
        <div class="cand-num">${i + 1}.</div>
        <div class="cand-name">${c.name}</div>
        <div>${
          alreadyVoted
            ? (isVotedFor ? '<span class="voted-tag">✓ Your vote</span>' : '')
            : `<button class="vote-btn" id="vote-btn-${i}" onclick="castVote(${i})">Vote</button>`
        }</div>
        <div class="cand-votes">${c.votes} vote${c.votes === 1 ? '' : 's'}</div>
        <div class="cand-bar-wrap"><div class="cand-bar" style="width:${pct}%"></div></div>
      </div>`;
    });
    listEl.innerHTML = html;
 
    if (candidates.length > 0){
      const winner = candidates.reduce((best, c) => (c.votes > best.votes ? c : best), candidates[0]);
      winnerEl.innerHTML = `
        <div class="crown">🏆</div>
        <div class="name">${winner.name}</div>
        <div class="count">${winner.votes} vote${winner.votes === 1 ? '' : 's'} so far</div>`;
    }
  }catch(err){
    console.error(err);
    listEl.innerHTML = '<p style="font-family:Arial, sans-serif; font-size:13px; color:#a4453a;">Could not load candidates: ' + (err.message || err) + '</p>';
  }
}
 
async function loadRecentActivity(){
  const listEl = document.getElementById('activityList');
  if (!listEl) return;
 
  try{
    const res = await fetch(`${BACKEND_URL}/api/votes`);
    if (!res.ok) throw new Error('Backend responded with an error');
    const rows = await res.json();
 
    if (rows.length === 0){
      listEl.innerHTML = '<p style="font-family:Arial, sans-serif; font-size:13px; color:var(--muted);">No votes recorded yet.</p>';
      return;
    }
 
    let html = '';
    rows.forEach(r => {
      const addr = r.voter_address.slice(0,6) + '...' + r.voter_address.slice(-4);
      const when = new Date(r.created_at + 'Z').toLocaleString();
      html += `<div class="candidate-row">
        <div class="cand-name" style="font-size:13px;">${addr} → ${r.candidate_name}</div>
        <div class="cand-votes">${when}</div>
      </div>`;
    });
    listEl.innerHTML = html;
  }catch(err){
    console.error(err);
    listEl.innerHTML = '<p style="font-family:Arial, sans-serif; font-size:13px; color:#a4453a;">Backend unavailable — activity feed needs the backend server running.</p>';
  }
}
