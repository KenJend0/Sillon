"use client";

import { useState } from "react";
import Link from "next/link";
import { type TrackReview } from "@/app/actions/track-diary";
import { UserAvatar } from "@/components/avatars/DefaultAvatar";
import TrackReviewsBottomSheet from "@/components/TrackReviewsBottomSheet";

type Props = {
    trackId: string;
    initialReviews?: TrackReview[];
    reviewsCount?: number;
};

export default function TrackReviewSection({ trackId, initialReviews = [], reviewsCount = 0 }: Props) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    return (
        <>
            <div className="flex items-baseline justify-between mb-8">
                <h2 className="text-h2 text-text-primary">Critiques</h2>
                {reviewsCount > 0 && (
                    <button
                        onClick={() => setIsSheetOpen(true)}
                        className="text-[12px] text-text-secondary hover:text-[#8E6F5E] transition-colors duration-150"
                    >
                        voir toutes
                    </button>
                )}
            </div>

            {initialReviews.length === 0 ? (
                <p className="text-[14px] text-text-tertiary">Aucune critique pour le moment.</p>
            ) : (
                <div className="space-y-3">
                    {initialReviews.map((review) => (
                        <ReviewItem key={review.id} review={review} />
                    ))}
                </div>
            )}

            {reviewsCount > 0 && (
                <TrackReviewsBottomSheet
                    trackId={trackId}
                    isOpen={isSheetOpen}
                    onClose={() => setIsSheetOpen(false)}
                />
            )}
        </>
    );
}

function ReviewItem({ review }: { review: TrackReview }) {
    const displayName = review.username || "Utilisateur";

    return (
        <div className="bg-background-secondary rounded-[10px] p-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    <UserAvatar userId={review.user_id} src={review.avatar_url} size={28} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-2">
                        <div className="flex items-baseline gap-1">
                            <Link href={`/u/${review.username}`} className="text-[14px] font-medium text-text-primary hover:text-[#8E6F5E] transition-colors">
                                {displayName}
                            </Link>
                            <span className="text-[12px] text-text-tertiary">
                                · {new Date(review.created_at).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                        {review.rating !== null && (
                            <span className="text-[14px] text-[#8E6F5E] font-medium">{review.rating}/10</span>
                        )}
                    </div>
                    {review.review_body && (
                        <p className="text-[13px] text-text-secondary leading-relaxed break-words line-clamp-3">
                            {review.review_body}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
