export default function Loading() {
    return (
        <div className="animate-pulse">
            <div className="p-6 pb-0">
                <div className="max-w-page mx-auto">
                    <div className="h-8 bg-background-secondary rounded-[8px] w-28 mb-2" />
                    <div className="h-4 bg-background-secondary rounded-[8px] w-72 mb-6" />
                    {/* Mode toggle */}
                    <div className="h-11 bg-background-secondary rounded-[10px] mb-8" />
                </div>
            </div>

            <main className="p-6 pb-20">
                <div className="max-w-page mx-auto">
                    {/* Search input */}
                    <div className="h-12 bg-background-secondary rounded-[10px]" />
                </div>
            </main>
        </div>
    );
}
