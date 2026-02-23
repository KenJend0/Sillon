export default function Loading() {
    // Simple skeleton cards to give better perceived performance
    return (
        <main className="p-6 pb-20 max-w-page mx-auto">
            <div className="space-y-6">
                {[0,1,2].map((i) => (
                    <div key={i} className="animate-pulse bg-transparent border-b border-border py-4">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-background-tertiary" />
                            <div className="flex-1">
                                <div className="h-3 bg-background-tertiary rounded w-1/3 mb-2" />
                                <div className="h-3 bg-background-tertiary rounded w-2/3 mb-2" />
                                <div className="h-3 bg-background-tertiary rounded w-1/2" />
                            </div>
                            <div className="w-16 h-16 rounded-[10px] bg-background-tertiary" />
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
