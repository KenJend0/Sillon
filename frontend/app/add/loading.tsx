export default function Loading() {
    return (
        <div className="animate-pulse">
            {/* Header */}
            <div className="p-6 pb-0">
                <div className="max-w-page mx-auto">
                    <div className="h-8 bg-background-secondary rounded-[8px] w-28 mb-2" />
                    <div className="h-4 bg-background-secondary rounded-[8px] w-64 mb-6" />
                    {/* Toggle */}
                    <div className="h-11 bg-background-secondary rounded-[10px] mb-8" />
                </div>
            </div>

            <main className="p-6 pb-20">
                <div className="max-w-page mx-auto">
                    {/* Search bar — py-3 input = 44px */}
                    <div className="h-11 bg-background-secondary rounded-[10px]" />

                    {/* "Dans ta liste" — onglet par défaut */}
                    <div className="mt-8">
                        <div className="h-3 bg-background-secondary rounded w-24 mb-3" />
                        <div className="grid grid-cols-2 gap-3">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-[6px] bg-background-secondary flex-shrink-0" />
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="h-3 bg-background-secondary rounded w-3/4" />
                                        <div className="h-2.5 bg-background-secondary rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
