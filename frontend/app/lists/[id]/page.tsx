import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { getListWithItems } from "@/app/actions/lists";
import BackButton from "@/components/BackButton";
import ListPageContent from "./ListPageContent";

export const dynamic = "force-dynamic";

type PageProps = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params;
    const result = await getListWithItems(id);
    if (!result) return { title: "Liste" };
    return {
        title: `${result.list.title} — ${result.list.creator_username}`,
        description: result.list.description ?? undefined,
    };
}

export default async function ListPage({ params }: PageProps) {
    const { id } = await params;
    const [result, user] = await Promise.all([
        getListWithItems(id),
        getAuthUser(),
    ]);

    if (!result) notFound();

    const { list, items } = result;
    const isOwner = !!user && user.id === list.user_id;

    return (
        <main className="px-6 pt-4 pb-28 lg:pb-10 max-w-page lg:max-w-5xl mx-auto">
            <div className="mb-6">
                <BackButton />
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <h1 className="text-h1 text-text-primary leading-tight">{list.title}</h1>
                    {!list.is_public && (
                        <span className="shrink-0 mt-1 text-[11px] text-text-tertiary border border-border rounded-full px-2 py-0.5">
                            Privée
                        </span>
                    )}
                </div>

                <Link
                    href={`/u/${list.creator_username}`}
                    className="text-[13px] text-text-secondary hover:text-text-primary transition-colors"
                >
                    @{list.creator_username}
                </Link>

                {list.description && (
                    <p className="mt-3 text-[14px] text-text-secondary leading-relaxed max-w-xl">
                        {list.description}
                    </p>
                )}

                <p className="mt-2 text-[12px] text-text-tertiary">
                    {list.item_count} {list.item_count === 1 ? "item" : "items"}
                </p>
            </div>

            <ListPageContent list={list} items={items} isOwner={isOwner} isAuthenticated={!!user} />
        </main>
    );
}
