import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Sentence {
  id: number;
  telugu: string;
  english: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.vidhyaly.com/api';
const CACHE_KEY_PREFIX = 'cached_sentences_day_';

function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

/** Get cached sentences for a day (returns null if not cached) */
export async function getCachedSentences(day: number): Promise<Sentence[] | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${day}`);
    if (cached) {
      return JSON.parse(cached);
    }
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
  const response = await fetchWithTimeout(`${API_BASE_URL}/sentences/day/${day}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sentences for day ${day}`);
  }
  const data: Sentence[] = await response.json();
  // Cache in background (don't await)
  cacheSentences(day, data);
  return data;
}

export async function fetchSentencesByRange(start: number, end: number): Promise<Sentence[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/sentences/range?start=${start}&end=${end}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sentences for range ${start}-${end}`);
  }
  return response.json();
}

export async function fetchSentenceCount(): Promise<{ total: number; days: number }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/sentences/count`);
  if (!response.ok) {
    throw new Error('Failed to fetch sentence count');
  }
  return response.json();
}
