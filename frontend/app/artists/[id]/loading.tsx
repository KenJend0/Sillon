export default function LoadingArtist() {
    return (
        <main className="max-w-page mx-auto px-4 py-8 pb-24 animate-pulse">
            {/* Back button */}
            <div className="h-5 w-14 bg-background-secondary rounded-[6px]" />

            {/* Hero: circular photo + name + stats */}
            <div className="mt-8 mb-10">
                <div className="flex items-start gap-5">
                    <div className="w-20 h-20 rounded-full bg-background-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="h-8 bg-background-secondary rounded-[8px] w-2/3 mb-2" />
                        <div className="h-4 bg-background-secondary rounded-[6px] w-24 mb-3" />
                        {/* Stats: avg · écoutes · revues */}
                        <div className="flex gap-5">
                            {[40, 56, 44].map((w, i) => (
                                <div key={i} className="h-4 bg-background-secondary rounded-[6px]" style={{ width: w }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Discography section label */}
            <div className="h-5 bg-background-secondary rounded-[8px] w-32 mb-6" />

            {/* Albums grid */}
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
        </main>
    );
}
