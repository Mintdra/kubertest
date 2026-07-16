// backend/server.js
const express = require('express');
const cors = require('cors');
const candidatesRouter = require('./routes/candidates');
const { syncExistingCandidates, startListening } = require('./services/contractListener');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/api', candidatesRouter);

app.get('/', (req, res) => {
  res.send('BallotBox backend is running. Try /api/candidates or /api/votes');
});

async function start() {
  await syncExistingCandidates();
  startListening();

  app.listen(PORT, () => {
    console.log(`Backend API running at http://localhost:${PORT}`);
  });
}

start();