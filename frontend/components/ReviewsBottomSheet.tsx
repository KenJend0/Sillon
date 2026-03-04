"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomSheet from "@/components/BottomSheet";
import { getAlbumReviewsPage } from "@/app/actions/diary";
import { showToast } from "@/components/Toast";

type Review = {
    id: string;
    user_id: string;
    rating: number | null;
    review_body: string | null;
    created_at: string;
    display_name?: string | null;
    username?: string | null;
};

type Tab = "my" | "friends" | "all";

type ReviewsBottomSheetProps = {
    albumId: string;
    isOpen: boolean;
    onClose: () => void;
};

export default function ReviewsBottomSheet({
    albumId,
    isOpen,
    onClose,
}: ReviewsBottomSheetProps) {
    const [items, setItems] = useState<Review[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [currentTab, setCurrentTab] = useState<Tab>("all");
    const [userId, setUserId] = useState<string | null>(null);
    const [hasFollowing, setHasFollowing] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setItems([]);
        setOffset(0);
        setHasMore(false);
        loadReviews(0, true);
    }, [isOpen, currentTab]);

    const loadReviews = async (startOffset: number, replace: boolean) => {
        setLoading(true);
        try {
            const result = await getAlbumReviewsPage({
                albumId,
                tab: currentTab,
                offset: startOffset,
                limit: 12,
            });

            setUserId(result.userId);
            setHasFollowing(result.hasFollowing);
            setHasMore(result.hasMore);
            setOffset(startOffset + result.items.length);
            setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        } catch (err) {
            console.error("Error loading reviews:", err);
            showToast("Impossible de charger les critiques", "error");
            if (startOffset === 0) setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        await loadReviews(offset, false);
    };

    const handleTabChange = (tab: Tab) => {
        if (tab !== currentTab) {
            setCurrentTab(tab);
        }
    };

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Critiques"
            maxHeight="h-[55vh]"
        >
            {/* Tabs */}
            <div className="flex border-b border-border-divider px-6 flex-shrink-0 sticky top-0 bg-background">
                <button
                    onClick={() => handleTabChange("all")}
                    className={`px-4 py-3 text-[14px] font-medium transition-colors duration-150 ${
                        currentTab === "all"
                            ? "border-b-2 border-[#1C1C1C] text-text-primary"
                            : "text-text-secondary hover:text-text-primary"
                    }`}
                >
                    Tous
                </button>
                {userId && hasFollowing && (
                    <button
                        onClick={() => handleTabChange("friends")}
                        className={`px-4 py-3 text-[14px] font-medium transition-colors duration-150 ${
                            currentTab === "friends"
                                ? "border-b-2 border-[#1C1C1C] text-text-primary"
                                : "text-text-secondary hover:text-text-primary"
                        }`}
                    >
                        Amis
                    </button>
                )}
                {userId && (
                    <button
                        onClick={() => handleTabChange("my")}
                        className={`px-4 py-3 text-[14px] font-medium transition-colors duration-150 ${
                            currentTab === "my"
                                ? "border-b-2 border-[#1C1C1C] text-text-primary"
                                : "text-text-secondary hover:text-text-primary"
                        }`}
                    >
                        Moi
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="px-6 py-4">
                {loading && items.length === 0 ? (
                    <p className="text-[14px] text-text-tertiary py-8 text-center">Chargement...</p>
                ) : items.length === 0 ? (
                    <p className="text-[14px] text-text-tertiary py-8 text-center">
                        {currentTab === "my"
                            ? "Vous n'avez pas encore critiqué cet album"
                            : currentTab === "friends"
                            ? "Vos amis n'ont pas encore critiqué cet album"
                            : "Pas de critiques pour l'instant"}
                    </p>
                ) : (
                    <div className="space-y-4 max-w-full">
                        {items.map((review) => (
                            <ReviewItem key={review.id} review={review} />
                        ))}
                        {hasMore && (
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                className="w-full mt-4 px-4 py-2.5 bg-background-secondary hover:bg-background-tertiary disabled:opacity-50 text-text-primary rounded-[8px] text-[14px] font-medium transition-colors duration-150"
                            >
                                {loading ? "Chargement..." : "Charger plus"}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </BottomSheet>
    );
}

function ReviewItem({ review }: { review: Review }) {
    const displayName = review.display_name || "User";
    const username = review.username || review.user_id;
    const profileLink = `/u/${username}`;

    return (
        <div className="py-4 border-b border-border-divider last:border-0">
            {/* Header */}
            <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-1">
                    <Link
                        href={profileLink}
                        className="text-[14px] font-medium text-text-primary hover:text-[#8E6F5E] transition-colors duration-150"
                    >
                        {displayName}
                    </Link>
                    <span className="text-[12px] text-text-tertiary">
                        · {new Date(review.created_at).toLocaleDateString('fr-FR')}
                    </span>
                </div>
                {review.rating !== null && (
                    <span className="text-[14px] text-text-primary font-medium">
                        {review.rating}/10
                    </span>
                )}
            </div>

            {/* Text */}
            {review.review_body && (
                <p className="text-[13px] text-text-secondary leading-relaxed break-words">
                    {review.review_body}
                </p>
            )}
        </div>
    );
}
