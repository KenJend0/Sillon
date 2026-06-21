'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { adminDeleteContent, adminDismissReport, type ReportedContentType } from '@/app/actions/moderation';

interface Props {
  reportId: string;
  contentType: ReportedContentType;
  contentId: string;
}

export default function DeleteReportedContentButton({ reportId, contentType, contentId }: Props) {
  const [status, setStatus] = useState<'idle' | 'confirm' | 'loading_delete' | 'loading_dismiss' | 'done'>('idle');

  const handleDelete = async () => {
    setStatus('loading_delete');
    const result = await adminDeleteContent(contentType, contentId);
    setStatus(result.success ? 'done' : 'idle');
  };

  const handleDismiss = async () => {
    setStatus('loading_dismiss');
    const result = await adminDismissReport(reportId);
    setStatus(result.success ? 'done' : 'idle');
  };

  if (status === 'done') return null;

  const loading = status === 'loading_delete' || status === 'loading_dismiss';

  if (status === 'confirm') {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setStatus('idle')}
          className="text-[11px] text-text-tertiary hover:text-text-primary border border-border rounded-full px-2.5 py-1 transition-colors duration-150"
        >
          Annuler
        </button>
        <button
          onClick={handleDelete}
          className="text-[11px] text-white bg-[#C86C6C] hover:opacity-90 rounded-full px-2.5 py-1 transition-opacity duration-150"
        >
          Supprimer
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDismiss}
        disabled={loading}
        title="Ignorer — contenu légitime"
        className="flex items-center justify-center w-6 h-6 text-text-tertiary hover:text-text-primary border border-border rounded-full transition-colors duration-150 disabled:opacity-50"
      >
        {status === 'loading_dismiss' ? (
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <X size={11} />
        )}
      </button>
      <button
        onClick={() => setStatus('confirm')}
        disabled={loading}
        className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-[#C86C6C] border border-border hover:border-[#C86C6C] rounded-full px-2.5 py-1 transition-colors duration-150 disabled:opacity-50"
      >
        {status === 'loading_delete' ? (
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Trash2 size={11} />
        )}
        Supprimer
      </button>
    </div>
  );
}
