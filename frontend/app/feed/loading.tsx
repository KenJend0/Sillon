export default function Loading() {
    return (
        <div className="mx-auto max-w-page px-4 md:px-6 pb-28 animate-pulse">
            {/* Page header */}
            <div className="pt-8 pb-6">
                <div className="h-8 bg-background-secondary rounded-[8px] w-20 mb-2" />
                <div className="h-4 bg-background-secondary rounded-[8px] w-56" />
            </div>

            {/* Date separator */}
            <div className="h-3 bg-background-secondary rounded w-20 mb-6" />

            {/* Cards */}
            <div className="space-y-8">
                {/* Card type: review with excerpt */}
                <div className="rounded-[12px] px-6 py-6 bg-background-secondary">
                    {/* Actor line + timestamp */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-[18px] h-[18px] rounded-full bg-background-tertiary flex-shrink-0" />
                            <div className="h-3 bg-background-tertiary rounded w-40" />
                        </div>
                        <div className="h-3 bg-background-tertiary rounded w-12" />
                    </div>
                    {/* Cover + title + rating */}
                    <div className="flex gap-4 items-center mb-4">
                        <div className="w-20 h-20 rounded-[10px] bg-background-tertiary flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-background-tertiary rounded w-3/4" />
                            <div className="h-4 bg-background-tertiary rounded w-1/2" />
                            <div className="h-3 bg-background-tertiary rounded w-10" />
                        </div>
                    </div>
                    {/* Review excerpt */}
                    <div className="space-y-1.5 mb-4">
                        <div className="h-3.5 bg-background-tertiary rounded" />
                        <div className="h-3.5 bg-background-tertiary rounded" />
                        <div className="h-3.5 bg-background-tertiary rounded w-2/3" />
                    </div>
                    {/* Actions */}
                    <div className="flex gap-6">
                        <div className="h-4 bg-background-tertiary rounded w-8" />
                        <div className="h-4 bg-background-tertiary rounded w-8" />
                    </div>
                </div>

                {/* Card type: listen without rating */}
                <div className="rounded-[12px] px-6 py-6 bg-background-secondary opacity-90">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-[18px] h-[18px] rounded-full bg-background-tertiary flex-shrink-0" />
                            <div className="h-3 bg-background-tertiary rounded w-32" />
                        </div>
                        <div className="h-3 bg-background-tertiary rounded w-10" />
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-[8px] bg-background-tertiary flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-background-tertiary rounded w-2/3" />
                            <div className="h-4 bg-background-tertiary rounded w-1/2" />
                        </div>
                    </div>
                </div>

                {/* Date separator */}
                <div className="h-3 bg-background-secondary rounded w-12" />

                {/* Card type: review without excerpt */}
                <div className="rounded-[12px] px-6 py-6 bg-background-secondary">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-[18px] h-[18px] rounded-full bg-background-tertiary flex-shrink-0" />
                            <div className="h-3 bg-background-tertiary rounded w-36" />
                        </div>
                        <div className="h-3 bg-background-tertiary rounded w-14" />
                    </div>
                    <div className="flex gap-4 items-center mb-4">
                        <div className="w-20 h-20 rounded-[10px] bg-background-tertiary flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-background-tertiary rounded w-4/5" />
                            <div className="h-4 bg-background-tertiary rounded w-1/2" />
                            <div className="h-3 bg-background-tertiary rounded w-10" />
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div className="h-4 bg-background-tertiary rounded w-8" />
                        <div className="h-4 bg-background-tertiary rounded w-8" />
                    </div>
                </div>

                {/* Card type: album saved (border variant) */}
                <div className="rounded-[12px] px-6 py-5 border border-border">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-[18px] h-[18px] rounded-full bg-background-secondary flex-shrink-0" />
                            <div className="h-3 bg-background-secondary rounded w-44" />
                        </div>
                        <div className="h-3 bg-background-secondary rounded w-10" />
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-[8px] bg-background-secondary flex-shrink-0" />
                        <div className="h-5 bg-background-secondary rounded w-1/2" />
                    </div>
                </div>
            </div>
        </div>
    );
}
