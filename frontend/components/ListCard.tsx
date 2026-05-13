import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { type UserList } from "@/app/actions/lists";

type Props = {
    list: UserList;
    href: string;
};

function CoverCollage({ urls }: { urls: (string | null)[] }) {
    const filled = [...urls, null, null, null, null].slice(0, 4);
    const hasCovers = filled.some((u) => u !== null);

    if (!hasCovers) {
        return (
            <div className="aspect-square rounded-[8px] bg-background-secondary flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-disabled">
                    <path d="M19 11H5M19 11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2M19 11V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        );
    }

    if (filled.filter((u) => u !== null).length < 4) {
        return (
            <div className="aspect-square rounded-[8px] overflow-hidden bg-background-secondary relative">
                {filled[0] ? (
                    <CoverImage
                        src={filled[0]}
                        alt=""
                        fill
                        className="object-cover"
                        placeholder={<div className="w-full h-full bg-background-tertiary" />}
                    />
                ) : (
                    <div className="w-full h-full bg-background-secondary" />
                )}
            </div>
        );
    }

    return (
        <div className="aspect-square rounded-[8px] overflow-hidden grid grid-cols-2 gap-px bg-border-divider">
            {filled.map((url, i) => (
                <div key={i} className="relative overflow-hidden bg-background-secondary">
                    {url ? (
                        <CoverImage
                            src={url}
                            alt=""
                            fill
                            className="object-cover"
                            placeholder={<div className="w-full h-full bg-background-tertiary" />}
                        />
                    ) : (
                        <div className="w-full h-full bg-background-secondary" />
                    )}
                </div>
            ))}
        </div>
    );
}

export default function ListCard({ list, href }: Props) {
    return (
        <Link href={href} className="group block">
            <CoverCollage urls={list.cover_urls} />
            <div className="mt-2">
                <p className="text-[13px] text-text-primary font-medium leading-snug line-clamp-2 group-hover:text-[#8E6F5E] transition-colors">
                    {list.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-text-tertiary">
                        {list.item_count} {list.item_count === 1 ? "item" : "items"}
                    </span>
                    {list.likes_count > 0 && (
                        <>
                            <span className="text-text-disabled text-[10px]">·</span>
                            <span className="text-[11px] text-text-tertiary">♥ {list.likes_count}</span>
                        </>
                    )}
                    {!list.is_public && (
                        <>
                            <span className="text-text-disabled text-[10px]">·</span>
                            <span className="text-[11px] text-text-disabled">Privée</span>
                        </>
                    )}
                </div>
            </div>
        </Link>
    );
}
