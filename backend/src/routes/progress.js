const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { supabase: serviceSupabase } = require('../supabaseClient');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Verify the Bearer token and return the user_id, or null if invalid.
 * Uses the anon client + JWT to validate, so we don't trust the body.
 */
async function getUserIdFromAuthHeader(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY for token verification');
    return null;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }
  return data.user.id;
}

/**
 * POST /api/progress/backup
 * Body: {
 *   user_join_date: string | null,
 *   learned_days:   object | null,
 *   days: [{ day_number, completed_sentences?, mastered_sentences?, viewed_count? }, ...]
 * }
 *
 * Verifies the Supabase JWT, upserts user_profiles + user_day_progress,
 * and updates last_active = now().
 */
router.post('/backup', async (req, res) => {
  try {
    const userId = await getUserIdFromAuthHeader(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user_join_date, learned_days, days } = req.body || {};
    const nowIso = new Date().toISOString();

    // 1) Upsert profile (last_active + optional join_date + learned_days)
    const profilePayload = {
      id: userId,
      last_active: nowIso,
      updated_at: nowIso,
    };
    if (user_join_date) profilePayload.join_date = user_join_date;
    if (learned_days && typeof learned_days === 'object') {
      profilePayload.learned_days = learned_days;
    }

    const { error: profileErr } = await serviceSupabase
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileErr) {
      console.error('Profile upsert error:', profileErr);
      return res.status(500).json({ error: 'Profile upsert failed', details: profileErr.message });
    }

    // 2) Upsert day rows in bulk
    let daysUpserted = 0;
    if (Array.isArray(days) && days.length > 0) {
      const rows = days
        .filter((d) => d && Number.isInteger(d.day_number) && d.day_number >= 1 && d.day_number <= 300)
        .map((d) => ({
          user_id: userId,
          day_number: d.day_number,
          completed_sentences: d.completed_sentences || {},
          mastered_sentences: d.mastered_sentences || {},
          viewed_count: d.viewed_count || {},
          updated_at: nowIso,
        }));

      if (rows.length > 0) {
        const { error: dayErr } = await serviceSupabase
          .from('user_day_progress')
          .upsert(rows, { onConflict: 'user_id,day_number' });

        if (dayErr) {
          console.error('Day progress upsert error:', dayErr);
          return res.status(500).json({ error: 'Day upsert failed', details: dayErr.message });
        }
        daysUpserted = rows.length;
      }
    }

    return res.json({ ok: true, days_upserted: daysUpserted, last_active: nowIso });
  } catch (e) {
    console.error('Backup exception:', e);
    return res.status(500).json({ error: 'Internal error', details: e.message });
  }
});

module.exports = router;
