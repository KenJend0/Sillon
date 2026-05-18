export default function Loading() {
    return (
        <main className="max-w-page mx-auto px-4 py-8 pb-24 animate-pulse">
            {/* Back button */}
            <div className="h-4 w-16 bg-background-secondary rounded" />

            {/* Title + count */}
            <div className="mt-6 mb-8">
                <div className="h-6 w-36 bg-background-secondary rounded mb-2" />
                <div className="h-4 w-24 bg-background-secondary rounded" />
            </div>

            {/* User list */}
            <div className="bg-background-secondary rounded-[12px] overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3.5 px-4 py-3.5 border-b border-border/40 last:border-b-0"
                    >
                        <div className="w-11 h-11 rounded-full bg-background-tertiary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="h-3.5 w-32 bg-background-tertiary rounded" />
                        </div>
                        <div className="h-7 w-16 bg-background-tertiary rounded-[8px] flex-shrink-0" />
                    </div>
                ))}
            </div>
        </main>
    );
}
