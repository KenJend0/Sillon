export default function Loading() {
    return (
        <main className="max-w-page mx-auto px-4 md:px-6 py-8 pb-24 animate-pulse">
            <div className="h-5 w-14 bg-background-secondary rounded-[6px]" />

            <div className="mt-8 mb-24">
                <div className="flex flex-col md:flex-row md:gap-12 md:items-start gap-6">
                    <div className="w-full md:w-48 aspect-square bg-background-secondary rounded-[10px] shrink-0 max-w-48 mx-auto md:mx-0" />

                    <div className="flex-1 space-y-3">
                        <div className="h-8 bg-background-secondary rounded-[8px] w-3/4" />
                        <div className="h-5 bg-background-secondary rounded-[8px] w-48" />
                        <div className="h-4 bg-background-secondary rounded-[8px] w-24" />
                        <div className="h-3 bg-background-secondary rounded-[8px] w-20" />
                        <div className="h-10 bg-background-secondary rounded-[10px] w-36 mt-6" />
                    </div>
                </div>
            </div>

            <section className="border-t border-border-divider pt-12 mb-24">
                <div className="h-5 bg-background-secondary rounded-[8px] w-24 mb-10" />
                <div className="space-y-1">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div key={index} className="flex items-baseline gap-4 py-2">
                            <div className="h-3.5 bg-background-secondary rounded w-5 flex-shrink-0" />
                            <div className="h-3.5 bg-background-secondary rounded flex-1" style={{ maxWidth: `${55 + (index % 3) * 12}%` }} />
                            <div className="h-3 bg-background-secondary rounded w-8 flex-shrink-0" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}