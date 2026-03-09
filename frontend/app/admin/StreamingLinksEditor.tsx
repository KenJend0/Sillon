'use client';

import { useState } from 'react';
import { fetchAlbumStreamingLinks } from '@/app/actions/metadata';
import { setAlbumStreamingUrls } from './actions';

type Links = { spotify: string | null; appleMusic: string | null; deezer: string | null };

export default function StreamingLinksEditor({
  albumId, mbid, artistName, title,
}: { albumId: string; mbid: string | null; artistName: string; title: string }) {
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [fetched, setFetched] = useState<Links | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ spotify: '', appleMusic: '', deezer: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleFetch = async () => {
    setFetchStatus('loading');
    try {
      const links = await fetchAlbumStreamingLinks(albumId, mbid ?? '', artistName, title);
      setFetched(links);
      const anyFound = links.spotify || links.appleMusic || links.deezer;
      if (!anyFound) setShowManual(true);
    } catch {
      setFetched({ spotify: null, appleMusic: null, deezer: null });
      setShowManual(true);
    }
    setFetchStatus('done');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const ok = await setAlbumStreamingUrls(albumId, {
      spotify: manual.spotify.trim() || null,
      appleMusic: manual.appleMusic.trim() || null,
      deezer: manual.deezer.trim() || null,
    });
    setSaveStatus(ok ? 'saved' : 'idle');
  };

  if (saveStatus === 'saved') {
    return <span className="text-[11px] text-green-600 ml-4 flex-shrink-0">Liens sauvegardés ✓</span>;
  }

  return (
    <div className="flex items-center gap-1.5 ml-4 flex-shrink-0 flex-wrap justify-end">
      {/* Fetch button */}
      {fetchStatus !== 'done' && (
        <button
          onClick={handleFetch}
          disabled={fetchStatus === 'loading'}
          className="text-[11px] text-text-tertiary hover:text-[#8E6F5E] border border-border hover:border-[#8E6F5E] rounded-full px-2.5 py-1 transition-colors duration-150 disabled:opacity-50"
        >
          {fetchStatus === 'loading' ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              MB…
            </span>
          ) : 'Fetch MB'}
        </button>
      )}

      {/* Result of fetch */}
      {fetchStatus === 'done' && fetched && (
        <span className="text-[11px] text-text-tertiary flex items-center gap-1">
          {fetched.spotify && <span className="text-green-600">Sp✓</span>}
          {fetched.appleMusic && <span className="text-green-600">AM✓</span>}
          {fetched.deezer && <span className="text-green-600">Dz✓</span>}
          {!fetched.spotify && !fetched.appleMusic && !fetched.deezer && (
            <span className="text-amber-600">Rien trouvé</span>
          )}
        </span>
      )}

      {/* Toggle manual */}
      {fetchStatus === 'done' && !showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="text-[11px] text-text-tertiary hover:text-[#8E6F5E] underline"
        >
          Saisir
        </button>
      )}

      {/* Manual inputs */}
      {showManual && (
        <>
          <input
            type="url"
            placeholder="Spotify URL"
            value={manual.spotify}
            onChange={(e) => setManual((m) => ({ ...m, spotify: e.target.value }))}
            className="text-[11px] bg-background border border-border rounded px-2 py-1 w-32 outline-none focus:border-[#8E6F5E]"
          />
          <input
            type="url"
            placeholder="Apple Music URL"
            value={manual.appleMusic}
            onChange={(e) => setManual((m) => ({ ...m, appleMusic: e.target.value }))}
            className="text-[11px] bg-background border border-border rounded px-2 py-1 w-32 outline-none focus:border-[#8E6F5E]"
          />
          <input
            type="url"
            placeholder="Deezer URL"
            value={manual.deezer}
            onChange={(e) => setManual((m) => ({ ...m, deezer: e.target.value }))}
            className="text-[11px] bg-background border border-border rounded px-2 py-1 w-28 outline-none focus:border-[#8E6F5E]"
          />
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || (!manual.spotify.trim() && !manual.appleMusic.trim() && !manual.deezer.trim())}
            className="text-[11px] text-text-tertiary hover:text-[#8E6F5E] border border-border hover:border-[#8E6F5E] rounded-full px-2.5 py-1 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saveStatus === 'saving' ? (
              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            ) : 'Sauver'}
          </button>
        </>
      )}
    </div>
  );
}
