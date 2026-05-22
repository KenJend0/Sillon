export default function Loading() {
    return (
        <div className="animate-pulse">
            <section className="px-6 pt-6 lg:pt-8 pb-6 max-w-page lg:max-w-5xl mx-auto">
                <div className="inline-flex items-center gap-1 text-[13px] text-text-secondary mb-4">
                    ← Explorer
                </div>
                <div className="h-8 bg-background-secondary rounded-[8px] w-36 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-72 max-w-full" />
            </section>

            <main className="px-6 pb-28 lg:pb-10 max-w-page lg:max-w-5xl mx-auto">
                {/* Tabs */}
                <div className="flex gap-1.5 mb-8">
                    <div className="h-7 w-16 bg-background-secondary rounded-full" />
                    <div className="h-7 w-14 bg-background-secondary rounded-full" />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i}>
                            <div className="aspect-square rounded-[10px] bg-background-secondary mb-2" />
                            <div className="h-3.5 bg-background-secondary rounded w-3/4 mb-1.5" />
                            <div className="h-3 bg-background-secondary rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
