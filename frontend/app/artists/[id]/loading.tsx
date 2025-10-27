export default function LoadingArtist() {
    return (
        <main className="mx-auto max-w-4xl p-6 animate-pulse">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="mt-3 h-8 w-1/2 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded mt-1" />

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="aspect-square rounded-xl bg-gray-200" />
                        <div className="h-4 w-3/4 bg-gray-200 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    </div>
                ))}
            </div>
        </main>
    );
}
