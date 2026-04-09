export default function Loading() {
    return (
        <div className="pb-28 animate-pulse">
            {/* Profile header — matches bg-background-secondary wrapper */}
            <div className="bg-background-secondary border-b border-border-divider">
                <div className="max-w-page mx-auto px-4 sm:px-6 py-8">
                    {/* Back button */}
                    <div className="h-5 w-14 bg-background-tertiary rounded-[6px] mb-8" />

                    {/* Avatar + name + follow button */}
                    <div className="flex items-start gap-5">
                        <div className="w-20 h-20 rounded-full bg-background-tertiary flex-shrink-0" />
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="h-6 bg-background-tertiary rounded-[6px] w-40 mb-1.5" />
                            <div className="h-3.5 bg-background-tertiary rounded-[6px] w-28 mb-3" />
                            <div className="h-8 bg-background-tertiary rounded-[8px] w-24" />
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="mt-5 space-y-1.5">
                        <div className="h-3.5 bg-background-tertiary rounded-[6px]" />
                        <div className="h-3.5 bg-background-tertiary rounded-[6px] w-2/3" />
                    </div>

                    {/* Stats: écoutes · abonnés · abonnements */}
                    <div className="flex gap-6 mt-6">
                        {[44, 52, 76].map((w, i) => (
                            <div key={i} className="h-3.5 bg-background-tertiary rounded-[6px]" style={{ width: w }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Top 3 favorite albums + tabs */}
            <div className="max-w-page mx-auto px-4 sm:px-6">
                <div className="flex gap-3 py-6">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="w-20 h-20 rounded-[10px] bg-background-secondary flex-shrink-0" />
                    ))}
                </div>

                {/* Tabs: Journal · Revues · À écouter */}
                <div className="flex gap-4 mb-6">
                    {[52, 48, 72].map((w, i) => (
                        <div key={i} className="h-4 bg-background-secondary rounded-[6px]" style={{ width: w }} />
                    ))}
                </div>

                <div className="space-y-5">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3 pb-5 border-b border-border-divider">
                            <div className="w-12 h-12 rounded-[8px] bg-background-secondary flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-background-secondary rounded-[6px] w-2/3" />
                                <div className="h-3 bg-background-secondary rounded-[6px] w-1/3" />
                                <div className="h-3 bg-background-secondary rounded-[6px] w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
