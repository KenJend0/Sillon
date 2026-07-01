export default function LoadingArtist() {
    return (
        <main className="max-w-page mx-auto px-4 pt-4 pb-24 animate-pulse">
            {/* Back button */}
            <div className="h-5 w-14 bg-background-secondary rounded-[6px]" />

            {/* Hero : photo ronde + nom + stats */}
            <div className="mt-8 mb-10">
                <div className="flex items-start gap-5">
                    <div className="w-20 h-20 rounded-full bg-background-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="h-8 bg-background-secondary rounded-[8px] w-2/3 mb-2" />
                        <div className="h-4 bg-background-secondary rounded-[6px] w-32 mb-3" />
                        {/* Stats : note moy · auditeurs · critiques */}
                        <div className="flex gap-5">
                            {[40, 56, 44].map((w, i) => (
                                <div key={i} className="h-4 bg-background-secondary rounded-[6px]" style={{ width: w }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Populaires — liste top albums */}
            <section className="border-t border-border-divider pt-10 mb-12">
                <div className="h-5 bg-background-secondary rounded-[8px] w-24 mb-6" />
                <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-4 py-2">
                            <div className="w-4 h-3.5 bg-background-secondary rounded flex-shrink-0" />
                            <div className="w-10 h-10 rounded-[6px] bg-background-secondary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="h-3.5 bg-background-secondary rounded w-3/4 mb-1" />
                                <div className="h-3 bg-background-secondary rounded w-1/3" />
                            </div>
                            <div className="h-4 bg-background-secondary rounded w-10 flex-shrink-0" />
                        </div>
                    ))}
                </div>
            </section>

            {/* Discographie — grille */}
            <section>
                <div className="h-5 bg-background-secondary rounded-[8px] w-32 mb-6" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-[12px] bg-background-secondary overflow-hidden">
                            <div className="aspect-square bg-background-tertiary" />
                            <div className="px-3 py-2.5 space-y-1.5">
                                <div className="h-4 w-3/4 bg-background-tertiary rounded-[6px]" />
                                <div className="h-3 w-1/2 bg-background-tertiary rounded-[6px]" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Artistes similaires */}
            <section className="border-t border-border-divider pt-10 mt-12 mb-8">
                <div className="h-5 bg-background-secondary rounded-[8px] w-36 mb-6" />
                <div className="flex flex-wrap gap-5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 w-14">
                            <div className="w-14 h-14 rounded-full bg-background-secondary" />
                            <div className="h-3 bg-background-secondary rounded w-full" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
