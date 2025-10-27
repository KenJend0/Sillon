export default function Loading() {
    return (
        <main className="mx-auto max-w-3xl p-6 animate-pulse">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="mt-4 flex gap-6">
                <div className="w-40 h-40 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-3">
                    <div className="h-6 w-2/3 bg-gray-200 rounded" />
                    <div className="h-4 w-1/3 bg-gray-200 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
            </div>
            <div className="mt-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-6 bg-gray-200 rounded" />
                ))}
            </div>
        </main>
    );
}
