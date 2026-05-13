"use client";

import { useState } from "react";
import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { Heart, MessageCircle } from "lucide-react";
import type { UnifiedReview } from "@/app/actions/diary";
import { toggleDiaryLike } from "@/app/actions/diary";
import { toggleTrackDiaryLike } from "@/app/actions/track-diary";
import { showToast } from "@/components/Toast";

type SortOption = "date_listened" | "personal_rating";

type Props = {
  reviews: UnifiedReview[];
};

const SORT_LABELS: Record<SortOption, string> = {
  date_listened: "Date d'écoute",
  personal_rating: "Ma note",
};

export default function ReviewsList({ reviews }: Props) {
  const [sortBy, setSortBy] = useState<SortOption>("date_listened");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const [likesState, setLikesState] = useState<Record<string, { isLiked: boolean; likesCount: number; liking?: boolean }>>(() => {
    const s: Record<string, { isLiked: boolean; likesCount: number; liking?: boolean }> = {};
    reviews.forEach((r) => {
      s[r.id] = { isLiked: r.is_liked, likesCount: r.likes_count, liking: false };
    });
    return s;
  });

  const handleLike = async (entryId: string, type: 'album' | 'track') => {
    const cur = likesState[entryId];
    if (!cur || cur.liking) return;
    setLikesState((prev) => ({ ...prev, [entryId]: { ...prev[entryId], liking: true } }));
    try {
      if (type === 'track') {
        await toggleTrackDiaryLike(entryId);
      } else {
        await toggleDiaryLike(entryId);
      }
      const newLiked = !cur.isLiked;
      setLikesState((prev) => ({
        ...prev,
        [entryId]: { isLiked: newLiked, likesCount: newLiked ? cur.likesCount + 1 : Math.max(0, cur.likesCount - 1), liking: false },
      }));
    } catch {
      showToast("Impossible d'aimer la revue", "error");
      setLikesState((prev) => ({ ...prev, [entryId]: { ...prev[entryId], liking: false } }));
    }
  };

  if (reviews.length === 0)
    return <div className="text-center text-text-tertiary py-12">Aucune revue pour l'instant</div>;

  const sorted = [...reviews].sort((a, b) => {
    if (sortBy === "personal_rating") return (b.rating || 0) - (a.rating || 0);
    const diff = new Date(b.listened_at).getTime() - new Date(a.listened_at).getTime();
    return diff !== 0 ? diff : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div>
      <div className="mb-6 relative inline-block">
        <button
          onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
          className="text-[12px] text-text-tertiary hover:text-text-primary transition-colors duration-150 flex items-center gap-1"
        >
          Trié par: <span className="font-medium text-text-primary">{SORT_LABELS[sortBy]}</span>
          <span className="text-[10px]">▾</span>
        </button>
        {sortDropdownOpen && (
          <div className="absolute top-full mt-2 bg-background border border-border rounded-[8px] z-10 min-w-max">
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([option, label]) => (
              <button
                key={option}
                onClick={() => { setSortBy(option); setSortDropdownOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[12px] transition-colors duration-150 ${
                  sortBy === option ? "bg-background-secondary text-text-primary font-medium" : "text-text-tertiary hover:bg-background-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {sorted.map((review) => (
          <article
            key={`${review.type}-${review.id}`}
            className="p-4 border border-border hover:border-[#8E6F5E] transition-colors duration-150 flex gap-4 bg-background-secondary rounded-[12px]"
          >
            {/* Cover */}
            {review.cover_url && (
              <Link href={review.href} className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[10px] overflow-hidden bg-background-secondary">
                  <CoverImage
                    src={review.cover_url}
                    alt={review.title}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    placeholder={<div className="w-full h-full bg-background-tertiary" />}
                  />
                </div>
              </Link>
            )}

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={review.href} className="hover:text-[#8E6F5E] transition-colors duration-150 block flex-1 min-w-0">
                    <h3 className="font-medium text-[14px] text-text-primary truncate">{review.title}</h3>
                  </Link>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    review.type === 'track'
                      ? 'bg-background-tertiary text-text-tertiary'
                      : 'bg-background-tertiary text-text-tertiary'
                  }`}>
                    {review.type === 'track' ? 'Titre' : 'Album'}
                  </span>
                </div>
                <span className="text-text-tertiary text-[12px]">{review.subtitle}</span>
              </div>

              {review.review_body && (
                <p className="text-[14px] leading-[1.6] text-text-secondary line-clamp-3 mb-3">{review.review_body}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border-divider">
                {review.rating && (
                  <div className="text-[#8E6F5E] font-medium text-[12px]">
                    {Math.round(review.rating)}/10
                  </div>
                )}
                <div className="flex items-center gap-2 text-[12px] text-text-tertiary ml-auto">
                  <button
                    onClick={() => handleLike(review.id, review.type)}
                    disabled={likesState[review.id]?.liking}
                    className="flex items-center gap-1 hover:text-[#C86C6C] transition-colors duration-150 disabled:opacity-50"
                  >
                    <Heart
                      size={14}
                      className={likesState[review.id]?.isLiked ? "fill-[#C86C6C] text-[#C86C6C]" : ""}
                    />
                    <span>{likesState[review.id]?.likesCount ?? review.likes_count}</span>
                  </button>
                  <Link
                    href={`${review.href}#comments`}
                    className="flex items-center gap-1 text-text-tertiary hover:text-text-primary transition-colors duration-150"
                  >
                    <MessageCircle size={14} />
                    <span className="text-[12px]">{review.comments_count ?? 0}</span>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
