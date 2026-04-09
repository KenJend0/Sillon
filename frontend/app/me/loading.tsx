export default function Loading() {
    return (
        <div className="pb-28 animate-pulse">
            {/* Profile header */}
            <div className="bg-background-secondary border-b border-border-divider">
                <div className="max-w-page mx-auto px-4 sm:px-6 py-8">
                    {/* Avatar + name */}
                    <div className="flex items-start gap-5">
                        <div className="w-20 h-20 rounded-full bg-background-tertiary flex-shrink-0" />
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="h-6 bg-background-tertiary rounded-[6px] w-40 mb-1.5" />
                            <div className="h-3.5 bg-background-tertiary rounded-[6px] w-28" />
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="mt-5 space-y-1.5">
                        <div className="h-3.5 bg-background-tertiary rounded-[6px]" />
                        <div className="h-3.5 bg-background-tertiary rounded-[6px] w-2/3" />
                    </div>

                    {/* Stats: écoutes · revues · abonnés · abonnements */}
                    <div className="flex gap-6 mt-6">
                        {[44, 40, 52, 76].map((w, i) => (
                            <div key={i} className="h-3.5 bg-background-tertiary rounded-[6px]" style={{ width: w }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Top 3 favorite albums — grid 3 cols, aspect-square covers */}
            <div className="max-w-page mx-auto px-4 sm:px-6">
                <div className="mt-10">
                    <div className="h-5 bg-background-secondary rounded-[6px] w-32 mb-5" />
                    <div className="grid grid-cols-3 gap-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="aspect-square rounded-[10px] bg-background-secondary" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs: Mon journal · Revues · À écouter */}
            <div className="max-w-page mx-auto px-4 sm:px-6 mt-6">
                <div className="flex gap-4 mb-6">
                    {[88, 52, 72].map((w, i) => (
                        <div key={i} className="h-4 bg-background-secondary rounded-[6px]" style={{ width: w }} />
                    ))}
                </div>

                {/* Sort line */}
                <div className="h-3.5 bg-background-secondary rounded w-40 mb-6" />

                {/* Diary grid — grid-cols-3 md:grid-cols-4, aspect-square covers + title below */}
                <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i}>
                            <div className="aspect-square rounded-[10px] bg-background-secondary mb-2" />
                            <div className="h-3 bg-background-secondary rounded w-3/4 mb-1" />
                            <div className="h-2.5 bg-background-secondary rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
