export default function Loading() {
    return (
        <div className="animate-pulse">
            {/* Header */}
            <section className="px-6 lg:px-8 pt-safe pb-6">
                <div className="h-8 bg-background-secondary rounded-[8px] w-24 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-64" />
            </section>

            {/* Search bar */}
            <div className="bg-background border-b border-border-divider">
                <div className="px-6 lg:px-8 pb-3">
                    <div className="h-10 bg-background-secondary rounded-[10px]" />
                </div>
            </div>

            <main className="p-6 lg:px-8 pb-20 space-y-12">
                {/* Pour toi — cards grid */}
                <section>
                    <div className="h-5 bg-background-secondary rounded w-20 mb-2" />
                    <div className="h-3.5 bg-background-secondary rounded w-48 mb-5" />
                    {/* Tabs */}
                    <div className="flex gap-1.5 mb-5">
                        <div className="h-6 w-16 bg-background-secondary rounded-full" />
                        <div className="h-6 w-14 bg-background-secondary rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i}>
                                <div className="aspect-square rounded-[10px] bg-background-secondary mb-2" />
                                <div className="h-3 bg-background-secondary rounded w-3/4 mb-1" />
                                <div className="h-2.5 bg-background-secondary rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tendances + Hors de ta bulle — carousel mobile / grille desktop */}
                {[0, 1].map((s) => (
                    <section key={s}>
                        <div className="h-5 bg-background-secondary rounded w-32 mb-2" />
                        <div className="h-3.5 bg-background-secondary rounded w-56 mb-5" />
                        {/* Tabs */}
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
                ))}
            </main>
        </div>
    );
}
