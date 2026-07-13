const RECENT_SEARCHES_KEY = "musicboxd_recent_searches";
const MAX_RECENT_SEARCHES = 8;

export type RecentEntityKind = "album" | "artist" | "track" | "user";

export type RecentSearchItem =
  | { type: "query"; q: string }
  | {
      type: "entity";
      kind: RecentEntityKind;
      id: string;
      title: string;
      subtitle?: string | null;
      coverUrl?: string | null;
      slug?: string | null;
    };

function keyOf(item: RecentSearchItem): string {
  return item.type === "query" ? `q:${item.q.toLowerCase()}` : `e:${item.kind}:${item.id}`;
}

export function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function save(item: RecentSearchItem): RecentSearchItem[] {
  const searches = getRecentSearches();
  const key = keyOf(item);
  const filtered = searches.filter((s) => keyOf(s) !== key);
  const updated = [item, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function saveRecentQuery(q: string): RecentSearchItem[] {
  if (typeof window === "undefined" || !q.trim()) return getRecentSearches();
  return save({ type: "query", q: q.trim() });
}

export function saveRecentEntity(entity: {
  kind: RecentEntityKind;
  id: string;
  title: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  slug?: string | null;
}): RecentSearchItem[] {
  if (typeof window === "undefined") return [];
  return save({ type: "entity", ...entity });
}

export function removeRecentSearch(item: RecentSearchItem): RecentSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const key = keyOf(item);
    const updated = getRecentSearches().filter((s) => keyOf(s) !== key);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}

export { RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES };
