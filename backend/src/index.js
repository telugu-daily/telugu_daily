const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sentencesRouter = require('./routes/sentences');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/sentences', sentencesRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Telugu Daily backend running on port ${PORT}`);
});
