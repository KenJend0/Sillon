import { getTimeAgo } from './utils/formatDate';

export const timeAgo = getTimeAgo;

export function msToMMSS(ms: number | null) {
    if (!ms || ms === 0) return "—";
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Formate une durée totale en ms → "42 min" ou "1 h 23 min" */
export function msToDuration(ms: number): string {
    if (!ms || ms <= 0) return "";
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 1) return "< 1 min";
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
