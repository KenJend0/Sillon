// Miroir mobile de apps/web/lib/recentSearches.ts. SecureStore plutôt qu'AsyncStorage
// (pas de nouvelle dépendance — expo-secure-store est déjà utilisé pour la session
// Supabase dans lib/supabase.ts) — API async contrairement au localStorage web.
import * as SecureStore from 'expo-secure-store';

const RECENT_SEARCHES_KEY = 'musicboxd_recent_searches';
const MAX_RECENT_SEARCHES = 8;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const stored = await SecureStore.getItemAsync(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveRecentSearch(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  try {
    const searches = await getRecentSearches();
    const filtered = searches.filter((s) => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    await SecureStore.setItemAsync(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function removeRecentSearch(query: string): Promise<string[]> {
  try {
    const searches = await getRecentSearches();
    const updated = searches.filter((s) => s !== query);
    await SecureStore.setItemAsync(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}
