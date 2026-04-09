export default function Loading() {
    return (
        <main className="max-w-page mx-auto px-4 py-8 pb-24 animate-pulse">
            {/* Back button */}
            <div className="h-5 w-14 bg-background-secondary rounded-[6px]" />

            {/* ── 1. Album hero ── */}
            <div className="mt-8 mb-6">
                <div className="flex flex-col md:flex-row md:gap-8 md:items-start">
                    {/* Cover */}
                    <div className="w-full md:w-48 aspect-square bg-background-secondary rounded-[10px] shrink-0 max-w-48 mx-auto md:mx-0 mb-6 md:mb-0" />

                    <div className="flex-1 space-y-3">
                        {/* Title */}
                        <div className="h-8 bg-background-secondary rounded-[8px]" />
                        {/* Artist + year */}
                        <div className="h-5 bg-background-secondary rounded-[8px] w-48" />

                        {/* Stats: revues · note · écoutes */}
                        <div className="flex gap-5 pt-1">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-1">
                                    <div className="h-5 bg-background-secondary rounded-[8px] w-10" />
                                    <div className="h-3 bg-background-secondary rounded-[8px] w-14" />
                                </div>
                            ))}
                        </div>

                        {/* Action button */}
                        <div className="h-10 bg-background-secondary rounded-[10px] w-36" />
                    </div>
                </div>
            </div>

            {/* ── 2. Tracks ── */}
            <section className="border-t border-border-divider pt-10 mb-20">
                <div className="h-5 bg-background-secondary rounded-[8px] w-24 mb-8" />
                <div className="space-y-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex items-baseline gap-4 py-2">
                            <div className="h-3.5 bg-background-secondary rounded w-5 flex-shrink-0" />
                            <div className="h-3.5 bg-background-secondary rounded flex-1" style={{ maxWidth: `${55 + (i % 3) * 15}%` }} />
                            <div className="h-3 bg-background-secondary rounded w-8 flex-shrink-0" />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 3. Reviews ── */}
            <section className="border-t border-border-divider pt-10 mb-20">
                <div className="h-5 bg-background-secondary rounded-[8px] w-40 mb-8" />
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-background-secondary flex-shrink-0" />
                                <div className="h-3.5 bg-background-secondary rounded w-28" />
                            </div>
                            <div className="h-3.5 bg-background-secondary rounded" />
                            <div className="h-3.5 bg-background-secondary rounded w-3/4" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
