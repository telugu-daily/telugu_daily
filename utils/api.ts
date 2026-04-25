export interface Sentence {
  id: number;
  telugu: string;
  english: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api';

function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

export async function fetchSentencesByDay(day: number): Promise<Sentence[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/sentences/day/${day}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sentences for day ${day}`);
  }
  return response.json();
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
