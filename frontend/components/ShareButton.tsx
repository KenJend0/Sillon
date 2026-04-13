'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { showToast } from '@/components/Toast';

interface ShareButtonProps {
  entryId: string;
}

export default function ShareButton({ entryId }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/og/story/${entryId}`);
      if (!res.ok) throw new Error('server_error');
      const blob = await res.blob();
      const file = new File([blob], 'waveform-story.png', { type: 'image/png' });

      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file] });
      } else {
        // Fallback : téléchargement direct
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'waveform-story.png';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Story téléchargée', 'success');
      }
    } catch (err) {
      // AbortError = utilisateur a annulé → pas d'erreur
      if (!(err instanceof Error && err.name === 'AbortError')) {
        showToast("Impossible de générer l'image", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      title="Partager"
      className="text-text-tertiary hover:text-text-primary transition-colors duration-150 focus:outline-none disabled:opacity-50"
    >
      <Share2 size={15} />
    </button>
  );
}
