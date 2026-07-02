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
