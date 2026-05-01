import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';

/**
 * Centralized AsyncStorage progress backup.
 *
 * Local storage is the source of truth during a session. When the app goes to
 * the background, we read every relevant key and POST a single payload to the
 * backend, which upserts day rows + updates `last_active` on the user profile.
 */

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://api.vidhyaly.com/api';

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

  // Build all day-specific keys in one shot for efficiency
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

/**
 * Send a full progress backup to the backend. Silent on failure (best-effort).
 * Throttled to once per 30 seconds per session to avoid hammering the server
 * if the app rapidly toggles foreground/background.
 */
let lastBackupAt = 0;
const BACKUP_MIN_INTERVAL_MS = 30 * 1000;

export async function backupToCloud(force = false): Promise<boolean> {
  try {
    const now = Date.now();
    if (!force && now - lastBackupAt < BACKUP_MIN_INTERVAL_MS) {
      return false;
    }

    // Skip if nothing changed since last backup (dirty flag not set)
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

    const payload = await collectAllProgress();
    if (payload.days.length === 0 && !payload.user_join_date && !payload.learned_days) {
      // Nothing to back up
      return false;
    }

    const res = await fetch(`${API_BASE_URL}/progress/backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.log('[backup] failed:', res.status, text);
      return false;
    }

    lastBackupAt = now;
    await AsyncStorage.removeItem('progressDirty'); // clear dirty flag after successful sync
    console.log('[backup] success — days:', payload.days.length);
    return true;
  } catch (e) {
    console.log('[backup] exception:', e);
    return false;
  }
}
