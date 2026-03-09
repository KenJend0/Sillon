'use client';

import { useState } from 'react';
import { clearAlbumMetadata } from './actions';

type Album = { id: string; mbid: string | null; title: string; artist_name: string };

export default function EnrichAllButton({ albums }: { albums: Album[] }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, found: 0 });

  const enrichable = albums.filter((a) => a.mbid);
  if (enrichable.length === 0) return null;

  const handleClick = async () => {
    setStatus('running');
    let found = 0;
    setProgress({ current: 0, total: enrichable.length, found: 0 });

    for (let i = 0; i < enrichable.length; i++) {
      const album = enrichable[i];
      setProgress({ current: i + 1, total: enrichable.length, found });
      try {
        await clearAlbumMetadata(album.id);
        const res = await fetch('/api/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ albumId: album.id, mbid: album.mbid, title: album.title, artist: album.artist_name }),
        });
        if (res.ok) {
          const data = await res.json();
          if ((data.genres ?? 0) > 0 || data.hasDescription) found++;
        }
      } catch { /* continue */ }
    }

    setProgress((p) => ({ ...p, current: p.total, found }));
    setStatus('done');
  };

  if (status === 'done') {
    return (
      <span className="text-[11px] text-green-600">
        {progress.found}/{progress.total} enrichis
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'running'}
      className="text-[11px] text-text-tertiary hover:text-[#8E6F5E] border border-border hover:border-[#8E6F5E] rounded-full px-2.5 py-1 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {status === 'running' ? (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          {progress.current}/{progress.total}…
        </span>
      ) : `Ré-enrichir tout (${enrichable.length})`}
    </button>
  );
}
