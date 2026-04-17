'use client';

import { useState } from 'react';
import { fetchAlbumStreamingLinks } from '@/app/actions/metadata';

type Album = { id: string; mbid: string | null; title: string; artist_name: string };

export default function FetchStreamingButton({ album }: { album: Album }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [found, setFound] = useState(false);

  const handleClick = async () => {
    setStatus('loading');
    try {
      const links = await fetchAlbumStreamingLinks(album.id, album.mbid ?? '', album.artist_name, album.title);
      setFound(!!(links.spotify || links.appleMusic || links.deezer));
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <span className={`text-[11px] flex-shrink-0 ${found ? 'text-green-600' : 'text-amber-600'}`}>
        {found ? 'Streaming trouvé ✓' : 'Aucun lien trouvé'}
      </span>
    );
  }

  if (status === 'error') {
    return <span className="text-[11px] text-red-500 flex-shrink-0">Erreur streaming</span>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className="text-[11px] text-text-tertiary hover:text-[#8E6F5E] border border-border hover:border-[#8E6F5E] rounded-full px-2.5 py-1 transition-colors duration-150 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {status === 'loading' ? (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          En cours…
        </span>
      ) : 'Fetch streaming'}
    </button>
  );
}
