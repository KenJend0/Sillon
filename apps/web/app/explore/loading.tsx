export default function Loading() {
    return (
        <div className="animate-pulse">
            {/* Header + search */}
            <section className="px-6 lg:px-8 pt-6 lg:pt-8 pb-5">
                <div className="h-8 bg-background-secondary rounded-[8px] w-24 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-64" />
                <div className="h-10 bg-background-secondary rounded-[10px] mt-4" />
            </section>

            <main className="px-6 lg:px-8 pb-20 space-y-12">
                {/* Pour toi — section personnalisée */}
                <section>
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="h-5 bg-background-secondary rounded w-20 mb-2" />
                            <div className="h-3.5 bg-background-secondary rounded w-44" />
                        </div>
                    </div>
                    <div className="flex gap-1.5 mb-5">
                        <div className="h-6 w-16 bg-background-secondary rounded-full" />
                        <div className="h-6 w-14 bg-background-secondary rounded-full" />
                    </div>
                    <div className="flex gap-4 overflow-hidden">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="shrink-0 w-36">
                                <div className="aspect-square bg-background-secondary rounded-[10px] mb-2" />
                                <div className="h-3.5 bg-background-secondary rounded w-3/4 mb-1.5" />
                                <div className="h-3 bg-background-secondary rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tendances */}
                <section>
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="h-5 bg-background-secondary rounded w-24 mb-2" />
                            <div className="h-3.5 bg-background-secondary rounded w-52" />
                        </div>
                        <div className="h-3.5 bg-background-secondary rounded w-14" />
                    </div>
                    <div className="flex gap-1.5 mb-5">
                        <div className="h-6 w-16 bg-background-secondary rounded-full" />
                        <div className="h-6 w-14 bg-background-secondary rounded-full" />
                    </div>
                    {/* Mobile: carousel */}
                    <div className="flex gap-4 overflow-hidden lg:hidden">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="shrink-0 w-44">
                                <div className="aspect-square bg-background-secondary rounded-[10px] mb-2" />
                                <div className="h-3.5 bg-background-secondary rounded w-3/4 mb-1.5" />
                                <div className="h-3 bg-background-secondary rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                    {/* Desktop: grille 5 cols */}
                    <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i}>
                                <div className="aspect-square bg-background-secondary rounded-[10px] mb-2" />
                                <div className="h-3.5 bg-background-secondary rounded w-3/4 mb-1.5" />
                                <div className="h-3 bg-background-secondary rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Listes populaires */}
                <section>
                    <div className="h-5 bg-background-secondary rounded w-32 mb-2" />
                    <div className="h-3.5 bg-background-secondary rounded w-56 mb-5" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="aspect-square bg-background-secondary rounded-[12px]" />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
