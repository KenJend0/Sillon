'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReEnrichButton from './ReEnrichButton';
import StreamingLinksEditor from './StreamingLinksEditor';
import DeleteAlbumButton from './DeleteAlbumButton';

type Album = {
  id: string;
  title: string;
  mbid: string | null;
  artist_name: string;
  release_date: string | null;
};

export default function CatalogueAlbums({ albums }: { albums: Album[] }) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? albums.filter((a) => {
        const q = search.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.artist_name.toLowerCase().includes(q);
      })
    : albums;

  return (
    <section className="rounded-[20px] border border-border bg-background-secondary p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-[20px] font-medium text-text-primary tracking-[-0.01em]">Catalogue albums</h2>
          <span className="rounded-full bg-background border border-border px-2.5 py-0.5 text-[12px] text-text-secondary">
            {filtered.length}{search.trim() ? ` / ${albums.length}` : ''}
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un album ou artiste…"
          className="w-full sm:w-72 rounded-full border border-border bg-background px-4 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-text-tertiary transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Aucun résultat pour « {search} ».</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((album) => {
            const year = album.release_date ? new Date(album.release_date).getFullYear() : null;
            return (
              <div key={album.id} className="rounded-[14px] border border-border bg-background px-4 py-3">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/albums/${album.id}`}
                      className="text-[14px] font-medium text-text-primary transition-colors hover:text-text-secondary"
                    >
                      {album.title}
                    </Link>
                    <span className="text-[12px] text-text-secondary">
                      {album.artist_name}{year ? ` · ${year}` : ''}
                    </span>
                    {album.mbid && (
                      <span className="text-[11px] font-mono text-text-tertiary">{album.mbid.slice(0, 8)}…</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReEnrichButton album={{ id: album.id, mbid: album.mbid, title: album.title, artist_name: album.artist_name }} />
                    <StreamingLinksEditor albumId={album.id} mbid={album.mbid} artistName={album.artist_name} title={album.title} />
                    {album.mbid && (
                      <a
                        href={`https://musicbrainz.org/release-group/${album.mbid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-text-tertiary hover:text-text-primary border border-border hover:border-text-tertiary rounded-full px-2.5 py-1 transition-colors duration-150 flex-shrink-0"
                      >
                        MusicBrainz ↗
                      </a>
                    )}
                    <DeleteAlbumButton albumId={album.id} albumTitle={album.title} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
