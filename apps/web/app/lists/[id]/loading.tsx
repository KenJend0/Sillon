export default function Loading() {
    return (
        <main className="px-6 py-6 pb-28 lg:pb-10 max-w-page lg:max-w-5xl mx-auto animate-pulse">
            <div className="h-4 w-16 bg-background-secondary rounded mb-6" />

            <div className="mb-8 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="h-9 bg-background-secondary rounded-[8px] w-2/3 max-w-lg" />
                    <div className="h-6 w-16 bg-background-secondary rounded-full shrink-0" />
                </div>
                <div className="h-4 bg-background-secondary rounded-[6px] w-28" />
                <div className="space-y-2 pt-1">
                    <div className="h-3.5 bg-background-secondary rounded-[6px] w-full max-w-xl" />
                    <div className="h-3.5 bg-background-secondary rounded-[6px] w-4/5 max-w-lg" />
                </div>
                <div className="h-3 bg-background-secondary rounded-[6px] w-20" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        <div className="aspect-square rounded-[8px] bg-background-secondary" />
                        <div className="h-4 bg-background-secondary rounded-[6px] w-5/6" />
                        <div className="h-3 bg-background-secondary rounded-[6px] w-1/2" />
                    </div>
                ))}
            </div>
        </main>
    );
}