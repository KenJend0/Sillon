/** Format relatif court en français — miroir de apps/web/lib/utils/formatDate.ts */
export function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return '1m';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}j`;
  if (seconds < 2419200) return `${Math.floor(seconds / 604800)}s`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Miroir de msToMMSS (web, apps/web/lib/time.ts) */
export function msToMMSS(ms: number | null): string {
  if (!ms || ms === 0) return '—';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Miroir de msToDuration (web) — "42 min" ou "1 h 23 min" */
export function msToDuration(ms: number): string {
  if (!ms || ms <= 0) return '';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return '< 1 min';
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
