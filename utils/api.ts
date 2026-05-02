import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';

export interface Sentence {
  id: number;
  telugu: string;
  english: string;
}

const CACHE_KEY_PREFIX = 'cached_sentences_day_';

/** Get cached sentences for a day (returns null if not cached) */
export async function getCachedSentences(day: number): Promise<Sentence[] | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${day}`);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.log('Cache read error:', e);
  }
  return null;
}

/** Cache sentences locally */
async function cacheSentences(day: number, sentences: Sentence[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${day}`, JSON.stringify(sentences));
  } catch (e) {
    console.log('Cache write error:', e);
  }
}

export async function fetchSentencesByDay(day: number): Promise<Sentence[]> {
  const startId = (day - 1) * 50 + 1;
  const endId = day * 50;

  const { data, error } = await supabase
    .from('sentences')
    .select('id, telugu, english')
    .gte('id', startId)
    .lte('id', endId)
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  cacheSentences(day, data as Sentence[]);
  return data as Sentence[];
}

export async function fetchSentencesByRange(start: number, end: number): Promise<Sentence[]> {
  const { data, error } = await supabase
    .from('sentences')
    .select('id, telugu, english')
    .gte('id', start)
    .lte('id', end)
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Sentence[];
}

export async function fetchSentenceCount(): Promise<{ total: number; days: number }> {
  const { count, error } = await supabase
    .from('sentences')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(error.message);
  return { total: count || 0, days: Math.ceil((count || 0) / 50) };
}
