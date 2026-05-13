export default function Loading() {
    return (
        <div className="max-w-page mx-auto px-4 py-6 animate-pulse">
            {/* Back button */}
            <div className="h-4 w-16 bg-background-secondary rounded mb-6" />

            {/* Header : cover 100px + titre/artiste */}
            <div className="flex gap-6 mb-6 mt-4">
                <div className="w-[100px] h-[100px] rounded-[10px] bg-background-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col justify-center mt-2 space-y-2">
                    <div className="h-5 bg-background-secondary rounded w-3/4" />
                    <div className="h-4 bg-background-secondary rounded w-1/2" />
                    <div className="h-3 bg-background-secondary rounded w-1/3" />
                </div>
            </div>

            {/* Divider */}
            <div className="border-b border-border my-6" />

            {/* Auteur + date */}
            <div className="flex items-start gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-background-secondary flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-background-secondary rounded w-48" />
                    <div className="h-3 bg-background-secondary rounded w-28" />
                </div>
            </div>

            {/* Note */}
            <div className="mt-6 space-y-2">
                <div className="h-3 bg-background-secondary rounded w-10" />
                <div className="h-4 bg-background-secondary rounded w-14" />
            </div>

            {/* Review body */}
            <div className="mt-6 space-y-2">
                <div className="h-4 bg-background-secondary rounded" />
                <div className="h-4 bg-background-secondary rounded w-5/6" />
                <div className="h-4 bg-background-secondary rounded w-4/6" />
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-6 mt-8">
                <div className="h-4 w-16 bg-background-secondary rounded" />
                <div className="h-4 w-12 bg-background-secondary rounded" />
            </div>

            <div className="mt-6 h-3.5 bg-background-secondary rounded w-52" />

            {/* Réponses */}
            <div className="border-t border-border pt-8 mt-8">
                <div className="h-3 bg-background-secondary rounded w-20 mb-6" />
            </div>
        </div>
    );
}
