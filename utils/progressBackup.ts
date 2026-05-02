import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';

/**
 * Centralized AsyncStorage progress backup.
 *
 * Writes directly to Supabase using the user's auth session (no backend needed).
 * Called when the app goes to background via AppState listener in useAuth.
 */

export interface DayProgress {
  day_number: number;
  completed_sentences?: Record<string, any>;
  mastered_sentences?: Record<string, any>;
  viewed_count?: Record<string, any>;
}

export interface ProgressBackupPayload {
  user_join_date: string | null;
  learned_days: Record<string, any> | null;
  days: DayProgress[];
}

const MAX_DAYS = 300;

/**
 * Read every progress key from AsyncStorage into a single payload.
 */
export async function collectAllProgress(): Promise<ProgressBackupPayload> {
  const [userJoinDate, learnedDaysRaw] = await Promise.all([
    AsyncStorage.getItem('userJoinDate'),
    AsyncStorage.getItem('learnedDays'),
  ]);

  let learned_days: Record<string, any> | null = null;
  if (learnedDaysRaw) {
    try {
      learned_days = JSON.parse(learnedDaysRaw);
    } catch {
      learned_days = null;
    }
  }

  const dayKeys: string[] = [];
  for (let day = 1; day <= MAX_DAYS; day++) {
    dayKeys.push(
      `completedSentences_day_${day}`,
      `masteredSentences_day_${day}`,
      `viewedCount_day_${day}`
    );
  }
  const stored = await AsyncStorage.multiGet(dayKeys);
  const map = new Map(stored);

  const days: DayProgress[] = [];
  for (let day = 1; day <= MAX_DAYS; day++) {
    const completedRaw = map.get(`completedSentences_day_${day}`);
    const masteredRaw = map.get(`masteredSentences_day_${day}`);
    const viewedRaw = map.get(`viewedCount_day_${day}`);

    if (!completedRaw && !masteredRaw && !viewedRaw) continue;

    const entry: DayProgress = { day_number: day };
    try {
      if (completedRaw) entry.completed_sentences = JSON.parse(completedRaw);
      if (masteredRaw) entry.mastered_sentences = JSON.parse(masteredRaw);
      if (viewedRaw) entry.viewed_count = JSON.parse(viewedRaw);
      days.push(entry);
    } catch (e) {
      console.log(`Skipping day ${day} (parse error):`, e);
    }
  }

  return { user_join_date: userJoinDate, learned_days, days };
}

let lastBackupAt = 0;
const BACKUP_MIN_INTERVAL_MS = 30 * 1000;

export async function backupToCloud(force = false): Promise<boolean> {
  try {
    const now = Date.now();
    if (!force && now - lastBackupAt < BACKUP_MIN_INTERVAL_MS) return false;

    if (!force) {
      const dirty = await AsyncStorage.getItem('progressDirty');
      if (dirty !== 'true') {
        console.log('[backup] Skipped — no changes since last backup');
        return false;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.log('[backup] Skipped — not authenticated');
      return false;
    }

    const userId = session.user.id;
    const payload = await collectAllProgress();
    if (payload.days.length === 0 && !payload.user_join_date && !payload.learned_days) return false;

    const nowIso = new Date().toISOString();

    // Upsert user profile (last_active + join_date + learned_days)
    const profilePayload: any = { id: userId, last_active: nowIso, updated_at: nowIso };
    if (payload.user_join_date) profilePayload.join_date = payload.user_join_date;
    if (payload.learned_days) profilePayload.learned_days = payload.learned_days;

    const { error: profileErr } = await supabase
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileErr) {
      console.log('[backup] profile upsert failed:', profileErr.message);
      return false;
    }

    // Upsert day progress rows in bulk
    if (payload.days.length > 0) {
      const rows = payload.days.map((d) => ({
        user_id: userId,
        day_number: d.day_number,
        completed_sentences: d.completed_sentences || {},
        mastered_sentences: d.mastered_sentences || {},
        viewed_count: d.viewed_count || {},
        updated_at: nowIso,
      }));

      const { error: dayErr } = await supabase
        .from('user_day_progress')
        .upsert(rows, { onConflict: 'user_id,day_number' });

      if (dayErr) {
        console.log('[backup] day upsert failed:', dayErr.message);
        return false;
      }
    }

    lastBackupAt = now;
    await AsyncStorage.removeItem('progressDirty');
    console.log('[backup] success — days:', payload.days.length);
    return true;
  } catch (e) {
    console.log('[backup] exception:', e);
    return false;
  }
}
