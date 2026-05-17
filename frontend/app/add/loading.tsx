export default function Loading() {
    return (
        <div className="animate-pulse">
            {/* Header */}
            <div className="p-6 lg:px-8 pb-0">
                <div className="h-8 bg-background-secondary rounded-[8px] w-28 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-72 mb-6" />
                {/* Tabs Album / Titre */}
                <div className="flex gap-4 mt-4">
                    <div className="h-4 bg-background-secondary rounded w-14" />
                    <div className="h-4 bg-background-secondary rounded w-12" />
                </div>
            </div>

            <main className="p-6 lg:px-8 pb-20">
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
            </main>
        </div>
    );
}
