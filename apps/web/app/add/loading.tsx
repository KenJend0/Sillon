export default function Loading() {
    return (
        <>
            {/* Mobile — file de triage swipable : un titre, deux pills de
                recherche, puis une grande carte qui occupe le reste de l'écran. */}
            <div className="lg:hidden h-[100dvh] overflow-hidden flex flex-col px-6 pt-6 pb-20 animate-pulse">
                <div className="h-8 bg-background-secondary rounded-[8px] w-48 mb-3 flex-shrink-0" />

                <div className="flex gap-2 mb-3 flex-shrink-0">
                    <div className="h-7 w-36 bg-background-secondary rounded-pill" />
                    <div className="h-7 w-32 bg-background-secondary rounded-pill" />
                </div>

                <div className="flex-1 min-h-0 rounded-card-lg bg-background-secondary" />
            </div>

            {/* Desktop — recherche + carte à gauche, file d'attente à droite. */}
            <div className="hidden lg:block animate-pulse">
                <div className="mx-auto max-w-6xl px-8 pt-8 pb-5">
                    <div className="h-8 bg-background-secondary rounded-[8px] w-56 mb-2" />
                    <div className="h-4 bg-background-secondary rounded w-72" />
                </div>

                <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_320px] items-start gap-8 px-8 pb-12">
                    <section className="min-w-0 space-y-6">
                        {/* Barre de recherche */}
                        <div className="rounded-card-lg border border-border bg-paper-hi p-4 shadow-sidebar">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div className="h-6 bg-background-tertiary rounded w-40" />
                                <div className="h-8 w-32 bg-background-tertiary rounded-full" />
                            </div>
                            <div className="h-11 bg-background-tertiary rounded-input border border-border" />
                        </div>

                        {/* État "choisis une écoute à noter" */}
                        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-card-lg border border-border bg-paper-hi px-10 py-12">
                            <div className="mb-6 h-36 w-36 rounded-cover bg-background-tertiary" />
                            <div className="h-6 w-64 bg-background-tertiary rounded mb-3" />
                            <div className="h-4 w-80 bg-background-tertiary rounded" />
                        </div>
                    </section>

                    {/* File d'attente */}
                    <aside className="rounded-card-lg border border-border bg-paper-hi p-2 shadow-sidebar space-y-1">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-[9px] px-2 py-2">
                                <div className="h-12 w-12 flex-shrink-0 rounded-cover-sm bg-background-tertiary" />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="h-3 bg-background-tertiary rounded w-3/4" />
                                    <div className="h-2.5 bg-background-tertiary rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </aside>
                </main>
            </div>
        </>
    );
}
