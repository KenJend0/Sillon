// Miroir mobile de apps/web/lib/recentSearches.ts. SecureStore plutôt qu'AsyncStorage
// (pas de nouvelle dépendance — expo-secure-store est déjà utilisé pour la session
// Supabase dans lib/supabase.ts) — API async contrairement au localStorage web.
import * as SecureStore from 'expo-secure-store';

const RECENT_SEARCHES_KEY = 'musicboxd_recent_searches';
const MAX_RECENT_SEARCHES = 8;

export type RecentEntityKind = 'album' | 'artist' | 'track' | 'user';

export type RecentSearchItem =
  | { type: 'query'; q: string }
  | {
      type: 'entity';
      kind: RecentEntityKind;
      id: string;
      title: string;
      subtitle?: string | null;
      coverUrl?: string | null;
      slug?: string | null;
    };

function keyOf(item: RecentSearchItem): string {
  return item.type === 'query' ? `q:${item.q.toLowerCase()}` : `e:${item.kind}:${item.id}`;
}

export async function getRecentSearches(): Promise<RecentSearchItem[]> {
  try {
    const stored = await SecureStore.getItemAsync(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function save(item: RecentSearchItem): Promise<RecentSearchItem[]> {
  try {
    const searches = await getRecentSearches();
    const key = keyOf(item);
    const filtered = searches.filter((s) => keyOf(s) !== key);
    const updated = [item, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    await SecureStore.setItemAsync(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function saveRecentQuery(q: string): Promise<RecentSearchItem[]> {
  if (!q.trim()) return getRecentSearches();
  return save({ type: 'query', q: q.trim() });
}

export async function saveRecentEntity(entity: {
  kind: RecentEntityKind;
  id: string;
  title: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  slug?: string | null;
}): Promise<RecentSearchItem[]> {
  return save({ type: 'entity', ...entity });
}

export async function removeRecentSearch(item: RecentSearchItem): Promise<RecentSearchItem[]> {
  try {
    const key = keyOf(item);
    const searches = await getRecentSearches();
    const updated = searches.filter((s) => keyOf(s) !== key);
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
