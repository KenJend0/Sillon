export default function Loading() {
    return (
        <div className="animate-pulse pb-20">
            {/* Header */}
            <section className="px-6 pt-safe pb-6 max-w-page mx-auto">
                <div className="h-8 bg-background-secondary rounded-[8px] w-32 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-72" />
            </section>

            {/* Search bar */}
            <div className="bg-background border-b border-border-divider">
                <div className="px-6 pb-3 max-w-page mx-auto">
                    <div className="h-10 bg-background-secondary rounded-[10px]" />
                </div>
            </div>

            {/* Sections */}
            <main className="p-6 pb-20 max-w-page mx-auto space-y-12">
                {[0, 1].map((section) => (
                    <section key={section}>
                        <div className="h-5 bg-background-secondary rounded-[8px] w-40 mb-5" />
                        <div className="flex gap-4 overflow-hidden">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="shrink-0 w-44">
                                    <div className="aspect-square bg-background-secondary rounded-[10px] mb-3" />
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
