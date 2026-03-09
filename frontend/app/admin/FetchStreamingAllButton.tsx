'use client';

import { useState } from 'react';
import { fetchAlbumStreamingLinks } from '@/app/actions/metadata';

type Album = { id: string; mbid: string | null; title: string; artist_name: string };

export default function FetchStreamingAllButton({ albums }: { albums: Album[] }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, found: 0 });

  if (albums.length === 0) return null;

  const handleClick = async () => {
    setStatus('running');
    let found = 0;
    setProgress({ current: 0, total: albums.length, found: 0 });

    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];
      setProgress({ current: i + 1, total: albums.length, found });
      try {
        const links = await fetchAlbumStreamingLinks(album.id, album.mbid ?? '', album.artist_name, album.title);
        if (links.spotify || links.appleMusic || links.deezer) found++;
      } catch { /* continue */ }
    }

    setProgress((p) => ({ ...p, current: p.total, found }));
    setStatus('done');
  };

  if (status === 'done') {
    return (
      <span className="text-[11px] text-green-600">
        {progress.found}/{progress.total} liens trouvés
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
      ) : `Fetch tout (${albums.length})`}
    </button>
  );
}
