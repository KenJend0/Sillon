import Link from "next/link";

export default function Loading() {
    return (
        <div className="animate-pulse">
            <section className="px-6 pt-safe pb-6 max-w-page lg:max-w-5xl mx-auto">
                <Link
                    href="/explore"
                    className="inline-flex items-center gap-1 text-[13px] text-text-secondary mb-4"
                >
                    ← Explorer
                </Link>
                <div className="h-8 bg-background-secondary rounded-[8px] w-36 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-72 max-w-full" />
            </section>

            <main className="px-6 pb-28 lg:pb-10 max-w-page lg:max-w-5xl mx-auto space-y-10">
                <section>
                    <div className="h-5 bg-background-secondary rounded w-48 mb-5" />
                    <div className="flex gap-4 overflow-hidden pb-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="shrink-0 w-40 sm:w-44">
                                <div className="aspect-square bg-background-secondary rounded-[10px] mb-3" />
                                <div className="h-3.5 bg-background-secondary rounded w-3/4 mb-1.5" />
                                <div className="h-3 bg-background-secondary rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <div className="h-5 bg-background-secondary rounded w-40 mb-5" />
                    <div className="space-y-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="flex items-center gap-3 pb-4 border-b border-border-divider last:border-b-0">
                                <div className="w-11 h-11 rounded-[8px] bg-background-secondary shrink-0" />
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="h-3.5 bg-background-secondary rounded w-2/3" />
                                    <div className="h-3 bg-background-secondary rounded w-1/3" />
                                </div>
                                <div className="h-3 bg-background-secondary rounded w-8 shrink-0" />
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}