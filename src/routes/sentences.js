const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// GET /api/sentences/day/:day - Get 50 sentences for a specific day
router.get('/day/:day', async (req, res) => {
  const day = parseInt(req.params.day, 10);

  if (isNaN(day) || day < 1) {
    return res.status(400).json({ error: 'Invalid day parameter' });
  }

  const startId = (day - 1) * 50 + 1;
  const endId = day * 50;

  const { data, error } = await supabase
    .from('sentences')
    .select('id, telugu, english')
    .gte('id', startId)
    .lte('id', endId)
    .order('id', { ascending: true });

  if (error) {
    console.error('Supabase error:', JSON.stringify(error, null, 2));
    return res.status(500).json({ error: 'Failed to fetch sentences', details: error.message, code: error.code });
  }

  res.json(data);
});

// GET /api/sentences/range?start=1&end=50 - Get sentences by ID range
router.get('/range', async (req, res) => {
  const start = parseInt(req.query.start, 10);
  const end = parseInt(req.query.end, 10);

  if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
    return res.status(400).json({ error: 'Invalid start/end parameters' });
  }

  const { data, error } = await supabase
    .from('sentences')
    .select('id, telugu, english')
    .gte('id', start)
    .lte('id', end)
    .order('id', { ascending: true });

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Failed to fetch sentences' });
  }

  res.json(data);
});

// GET /api/sentences/count - Get total sentence count
router.get('/count', async (req, res) => {
  const { count, error } = await supabase
    .from('sentences')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Failed to get count' });
  }

  res.json({ total: count, days: Math.ceil(count / 50) });
});

module.exports = router;
