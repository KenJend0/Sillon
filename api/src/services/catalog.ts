import { pool } from '../db';
import { fetchRelease, coverUrlForRelease, MBRelease } from './musicbrainz';

function parseDate(d?: string): string | null {
    return d ?? null; // MB peut renvoyer yyyy-mm-dd / yyyy-mm / yyyy
}

export async function importReleaseByMBID(mbid: string) {
    const rel = await fetchRelease(mbid);
    return upsertRelease(rel);
}

export async function upsertRelease(rel: MBRelease) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1) Artiste principal
        const primary = rel['artist-credit']?.[0];
        const artistName = primary?.artist?.name ?? primary?.name ?? 'Unknown';
        const artistMBID = primary?.artist?.id ?? null;

        const a1 = await client.query(
            `INSERT INTO artists (name, mbid)
             VALUES ($1, $2::uuid)
                 ON CONFLICT ON CONSTRAINT uq_artists_mbid
                 DO UPDATE SET name = EXCLUDED.name
                        RETURNING id`,
            [artistName, artistMBID]
        );
        const artistId = a1.rows[0].id as string;

        // 2) Album
        const cover = coverUrlForRelease(rel.id, 500);
        const a2 = await client.query(
            `INSERT INTO albums (artist_id, title, release_date, mbid, cover_url)
             VALUES ($1, $2, $3::date, $4::uuid, $5)
                 ON CONFLICT ON CONSTRAINT uq_albums_mbid
                 DO UPDATE SET title = EXCLUDED.title,
                        release_date = COALESCE(EXCLUDED.release_date, albums.release_date),
                        cover_url = COALESCE(EXCLUDED.cover_url, albums.cover_url)
                        RETURNING id`,
            [artistId, rel.title, parseDate(rel.date), rel.id, cover]
        );
        const albumId = a2.rows[0].id as string;

        // 3) external_ids (artist/album)
        if (artistMBID) {
            await client.query(
                `INSERT INTO external_ids (entity_type, entity_id, source, value)
                 VALUES ('artist', $1, 'musicbrainz', $2)
                     ON CONFLICT (entity_type, source, value) DO NOTHING`,
                [artistId, artistMBID]
            );
        }
        await client.query(
            `INSERT INTO external_ids (entity_type, entity_id, source, value)
             VALUES ('album', $1, 'musicbrainz', $2)
                 ON CONFLICT (entity_type, source, value) DO NOTHING`,
            [albumId, rel.id]
        );

        // 4) Pistes
        let trackCount = 0;
        for (const medium of rel.media ?? []) {
            const discNo = medium.position ?? 1;
            for (const t of medium.tracks ?? []) { // <-- tracks (pluriel)
                const title = t.title ?? 'Unknown';

                // numéro de piste : number (texte) sinon position (entier)
                const fromNumber = t.number ? parseInt(String(t.number).replace(/\D/g, '') || '0', 10) : NaN;
                const trackNo = Number.isFinite(fromNumber) && fromNumber > 0
                    ? fromNumber
                    : (typeof t.position === 'number' ? t.position : null);

                // durée : track.length prioritaire, sinon recording.length
                const lengthMs = (typeof t.length === 'number' ? t.length : t.recording?.length) ?? null;
                const recMBID = t.recording?.id ?? null;

                const tr = await client.query(
                    `INSERT INTO tracks (album_id, artist_id, title, duration_ms, track_no, disc_no, mbid)
           VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
           ON CONFLICT ON CONSTRAINT uq_tracks_mbid
           DO UPDATE SET title = EXCLUDED.title,
                         duration_ms = COALESCE(EXCLUDED.duration_ms, tracks.duration_ms),
                         track_no = COALESCE(EXCLUDED.track_no, tracks.track_no),
                         disc_no = COALESCE(EXCLUDED.disc_no, tracks.disc_no)
           RETURNING id`,
                    [albumId, artistId, title, lengthMs, trackNo, discNo, recMBID]
                );
                const trackId = tr.rows[0].id as string;

                if (recMBID) {
                    await client.query(
                        `INSERT INTO external_ids (entity_type, entity_id, source, value)
                         VALUES ('track', $1, 'musicbrainz', $2)
                             ON CONFLICT (entity_type, source, value) DO NOTHING`,
                        [trackId, recMBID]
                    );
                }
                trackCount++;
            }
        }


        await client.query('COMMIT');
        return { artistId, albumId, tracks: trackCount, coverUrl: cover };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
