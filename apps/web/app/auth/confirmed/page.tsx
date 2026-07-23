import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compte confirmé',
};

export default function AccountConfirmedPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-h1 text-text-primary mb-3">Compte confirmé !</h1>
        <p className="text-meta text-text-secondary mb-8">
          Retourne dans l&apos;app Sillon sur ton téléphone et connecte-toi — tu peux fermer cette page.
        </p>
        <a
          href="sillon://"
          className="inline-block w-full px-4 py-2.5 bg-[#1C1C1C] hover:opacity-85 rounded-[8px] text-[#F5F3EF] font-medium transition-opacity"
        >
          Ouvrir l&apos;app
        </a>
      </div>
    </div>
  );
}
