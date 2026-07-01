'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { adminAnalyzeContent, type ModerationResult, type ReportedContentType } from '@/app/actions/moderation';

interface Props {
  contentType: ReportedContentType;
  contentId: string;
}

export default function AnalyzeReportButton({ contentType, contentId }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ModerationResult | null>(null);

  const handleAnalyze = async () => {
    setStatus('loading');
    const res = await adminAnalyzeContent(contentType, contentId);
    if (res.success && res.result) {
      setResult(res.result);
      setStatus('done');
    } else {
      setStatus('error');
    }
  };

  if (status === 'done' && result) {
    const pct = Math.round(result.score * 100);
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 border ${
        result.safe
          ? 'bg-[#E8F1E6] text-[#376548] border-[#C3D5BE]'
          : 'bg-[#F5E5E1] text-[#9A5A4D] border-[#E8C9C3]'
      }`}>
        <Sparkles size={10} />
        {result.labelFr} · {pct}%
      </span>
    );
  }

  if (status === 'error') {
    return <span className="text-[11px] text-text-tertiary">Erreur analyse</span>;
  }

  return (
    <button
      onClick={handleAnalyze}
      disabled={status === 'loading'}
      className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary border border-border rounded-full px-2.5 py-1 transition-colors duration-150 disabled:opacity-50"
    >
      {status === 'loading' ? (
        <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Sparkles size={11} />
      )}
      Analyser
    </button>
  );
}
