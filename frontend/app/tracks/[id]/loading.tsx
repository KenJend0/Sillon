export default function Loading() {
    return (
        <main className="mx-auto max-w-page p-6 pb-20 animate-pulse">
            {/* Back button */}
            <div className="h-4 w-16 bg-background-secondary rounded mb-4" />

            {/* Hero */}
            <div className="flex flex-col md:flex-row md:gap-8 md:items-start mt-4">
                {/* Cover */}
                <div className="flex-shrink-0 w-full md:w-48 mb-4 md:mb-0">
                    <div className="rounded-[10px] aspect-square w-full max-w-48 mx-auto md:mx-0 bg-background-secondary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-3">
                    <div className="h-8 bg-background-secondary rounded w-3/4" />
                    <div className="h-4 bg-background-secondary rounded w-1/2" />
                    <div className="h-3 bg-background-secondary rounded w-1/3" />
                    <div className="flex gap-4 mt-2">
                        <div className="h-5 bg-background-secondary rounded w-16" />
                        <div className="h-5 bg-background-secondary rounded w-20" />
                    </div>
                    {/* Genre pills */}
                    <div className="flex gap-2 mt-1">
                        <div className="h-6 w-16 bg-background-secondary rounded-full" />
                        <div className="h-6 w-20 bg-background-secondary rounded-full" />
                    </div>
                </div>
            </div>

            {/* Critiques skeleton */}
            <div className="mt-10 space-y-4">
                <div className="h-5 bg-background-secondary rounded w-24" />
                {[1, 2].map((i) => (
                    <div key={i} className="p-4 bg-background-secondary rounded-[10px] space-y-2">
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-background-tertiary flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3.5 bg-background-tertiary rounded w-32" />
                                <div className="h-3 bg-background-tertiary rounded w-full" />
                                <div className="h-3 bg-background-tertiary rounded w-5/6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
