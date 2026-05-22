export default function Loading() {
    return (
        <div className="animate-pulse mx-auto max-w-page lg:max-w-5xl px-4 md:px-6 pb-28 lg:pb-12">
            {/* Header */}
            <div className="pt-8 pb-6">
                <div className="h-8 bg-background-secondary rounded-[8px] w-28 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-72" />
            </div>

            {/* Toggle entité — style pill (Album / Titre) */}
            <div className="flex gap-1 bg-background-secondary rounded-[10px] p-1 w-fit mb-8">
                <div className="h-8 w-16 bg-background-tertiary rounded-[8px]" />
                <div className="h-8 w-14 bg-background-tertiary rounded-[8px] opacity-50" />
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
                {/* Colonne gauche : barre de recherche */}
                <div className="h-11 bg-background-secondary rounded-[10px]" />

                {/* Colonne droite : grille de pochettes */}
                <div className="mt-6 lg:mt-0">
                    <div className="h-2.5 bg-background-secondary rounded w-36 mb-3" />
                    <div className="grid gap-4 grid-cols-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i}>
                                <div className="aspect-square rounded-[10px] bg-background-secondary mb-2" />
                                <div className="h-3 bg-background-secondary rounded w-3/4 mb-1" />
                                <div className="h-2.5 bg-background-secondary rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
