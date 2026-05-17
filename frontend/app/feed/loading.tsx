export default function Loading() {
    return (
        <div className="px-4 md:px-6 lg:px-8 pb-28 animate-pulse">
            {/* Header */}
            <div className="pt-8 pb-6">
                <div className="h-8 bg-background-secondary rounded-[8px] w-20 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-56" />
            </div>

            <div className="lg:flex lg:gap-12 lg:items-start">
                {/* Feed */}
                <div className="lg:flex-1 space-y-6">
                    {/* Date separator */}
                    <div className="h-3 bg-background-secondary rounded w-20" />

                    {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-[12px] px-6 py-6 bg-background-secondary">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-[18px] h-[18px] rounded-full bg-background-tertiary flex-shrink-0" />
                                    <div className="h-3 bg-background-tertiary rounded w-40" />
                                </div>
                                <div className="h-3 bg-background-tertiary rounded w-12" />
                            </div>
                            <div className="flex gap-4 items-center mb-4">
                                <div className="w-20 h-20 rounded-[10px] bg-background-tertiary flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-background-tertiary rounded w-3/4" />
                                    <div className="h-4 bg-background-tertiary rounded w-1/2" />
                                    <div className="h-3 bg-background-tertiary rounded w-10" />
                                </div>
                            </div>
                            {i === 0 && (
                                <div className="space-y-1.5 mb-4">
                                    <div className="h-3.5 bg-background-tertiary rounded" />
                                    <div className="h-3.5 bg-background-tertiary rounded w-2/3" />
                                </div>
                            )}
                            <div className="flex gap-6 pt-3 border-t border-border-divider">
                                <div className="h-4 bg-background-tertiary rounded w-8" />
                                <div className="h-4 bg-background-tertiary rounded w-8" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Sidebar */}
                <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 space-y-8">
                    {/* Tendances */}
                    <div>
                        <div className="h-2.5 bg-background-secondary rounded w-20 mb-3" />
                        <div className="space-y-3">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[6px] bg-background-secondary flex-shrink-0" />
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="h-3 bg-background-secondary rounded w-3/4" />
                                        <div className="h-2.5 bg-background-secondary rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Personnes à suivre */}
                    <div>
                        <div className="h-2.5 bg-background-secondary rounded w-32 mb-3" />
                        <div className="space-y-1 divide-y divide-border-divider">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 py-4">
                                    <div className="w-10 h-10 rounded-full bg-background-secondary flex-shrink-0" />
                                    <div className="flex-1 h-3 bg-background-secondary rounded w-24" />
                                    <div className="w-16 h-7 rounded-[8px] bg-background-secondary flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="h-14 bg-background-secondary rounded-[12px]" />
                </aside>
            </div>
        </div>
    );
}
