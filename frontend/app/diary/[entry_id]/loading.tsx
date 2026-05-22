export default function Loading() {
    return (
        <div className="max-w-page mx-auto px-4 pt-4 pb-6 animate-pulse">
            {/* Back button */}
            <div className="h-4 w-20 bg-background-secondary rounded mb-4" />

            {/* Album hero — cover 84px + titre/artiste */}
            <div className="mt-4 pb-5 border-b border-border">
                <div className="flex gap-4 items-end">
                    <div className="w-[84px] h-[84px] rounded-[8px] bg-background-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0 pb-1">
                        <div className="h-2 bg-background-secondary rounded w-10 mb-2" />
                        <div className="h-7 bg-background-secondary rounded w-3/4 mb-2" />
                        <div className="h-3.5 bg-background-secondary rounded w-1/3" />
                    </div>
                </div>
            </div>

            {/* Critique block — avec bordure accent gauche */}
            <div className="relative pl-4 mt-5">
                <div className="absolute left-0 top-2 bottom-4 w-0.5 bg-background-tertiary rounded-full" />

                {/* Auteur — avatar 34px + texte inline */}
                <div className="flex items-center gap-3">
                    <div className="w-[34px] h-[34px] rounded-full bg-background-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="h-3.5 bg-background-secondary rounded w-52 mb-1.5" />
                        <div className="h-3 bg-background-secondary rounded w-24" />
                    </div>
                    <div className="w-6 h-6 bg-background-secondary rounded-[6px] flex-shrink-0" />
                </div>

                {/* Note — grande fonte display */}
                <div className="mt-5 flex items-baseline gap-1.5">
                    <div className="h-12 w-10 bg-background-secondary rounded" />
                    <div className="h-3 w-6 bg-background-secondary rounded" />
                </div>

                {/* Corps de la review */}
                <div className="mt-4 space-y-2">
                    <div className="h-4 bg-background-secondary rounded" />
                    <div className="h-4 bg-background-secondary rounded w-5/6" />
                    <div className="h-4 bg-background-secondary rounded w-2/3" />
                </div>

                {/* Hairline + J'aime */}
                <div className="h-px bg-background-secondary mt-5" />
                <div className="flex items-center gap-2 mt-3">
                    <div className="w-3.5 h-3.5 bg-background-secondary rounded" />
                    <div className="h-3 bg-background-secondary rounded w-14" />
                </div>
            </div>

            {/* CTA "Continuer la lecture" */}
            <div className="mt-5 h-[66px] bg-background-secondary rounded-[10px]" />

            {/* Réponses */}
            <div className="mt-7">
                <div className="flex items-baseline gap-2 mb-4">
                    <div className="h-6 bg-background-secondary rounded w-20" />
                    <div className="h-4 bg-background-secondary rounded w-6" />
                    <div className="flex-1 h-px bg-background-secondary self-center ml-1.5" />
                </div>
                {/* Zone de saisie */}
                <div className="h-[72px] bg-background-secondary rounded-[12px] mb-4" />
                {/* Commentaire */}
                <div className="h-[72px] bg-background-secondary rounded-[12px]" />
            </div>
        </div>
    );
}
