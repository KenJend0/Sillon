import { request } from 'undici';

const UA = process.env.MB_USER_AGENT || 'musicboxd/0.1 (contact: you@example.com)';

export type MBRelease = {
    id: string;
    title: string;
    date?: string;
    'artist-credit': { name: string; artist?: { id: string; name: string } }[];
    media?: {
        position?: number;          // n° de disque
        title?: string;
        format?: string;
        'track-count'?: number;
        tracks?: {
            id?: string;
            title: string;
            number?: string;          // "1", "A1", etc.
            position?: number;        // 1,2,…
            length?: number;          // parfois au niveau track
            recording?: {
                id?: string;            // recording MBID
                length?: number;        // parfois uniquement ici
                title?: string;
            };
            'artist-credit'?: any[];
        }[];
    }[];
};


export async function fetchRelease(mbid: string): Promise<MBRelease> {
    const url = `https://musicbrainz.org/ws/2/release/${mbid}?inc=recordings+artist-credits&fmt=json`;
    const { body, statusCode } = await request(url, { headers: { 'User-Agent': UA } });
    if (statusCode !== 200) throw new Error(`MusicBrainz HTTP ${statusCode}`);
    return body.json() as Promise<MBRelease>;
}

export function coverUrlForRelease(mbid: string, size: 250|500|1200 = 500) {
    return `https://coverartarchive.org/release/${mbid}/front-${size}`;
}
