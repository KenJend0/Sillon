"use client";

import { useState } from "react";
import ReviewsBottomSheet from "@/components/ReviewsBottomSheet";
import Reviews from "@/components/Reviews";

type AlbumReviewSectionProps = {
    albumId: string;
    reviewsCount?: number;
};

export default function AlbumReviewSection({ albumId, reviewsCount = 0 }: AlbumReviewSectionProps) {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isReviewsSheetOpen, setIsReviewsSheetOpen] = useState(false);

    return (
        <>
            <div className="flex items-baseline justify-between mb-8">
                <h2 className="text-h2 text-text-primary">
                    Critiques
                </h2>
                {reviewsCount > 0 && (
                    <button
                        onClick={() => setIsReviewsSheetOpen(true)}
                        className="text-[12px] text-text-secondary hover:text-[#8E6F5E] transition-colors duration-150"
                    >
                        voir toutes
                    </button>
                )}
            </div>
            <Reviews key={refreshTrigger} albumId={albumId} />

            {reviewsCount > 0 && (
                <ReviewsBottomSheet
                    albumId={albumId}
                    isOpen={isReviewsSheetOpen}
                    onClose={() => setIsReviewsSheetOpen(false)}
                />
            )}
        </>
    );
}

