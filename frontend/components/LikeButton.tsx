"use client";

import { useState, useTransition, useOptimistic } from "react";
import { Heart } from "lucide-react";
import { toggleDiaryLike } from "@/app/actions/diary";
import { showToast } from "@/components/Toast";

export default function LikeButton({
    entryId, initialLiked, initialCount,
}: { entryId: string; initialLiked: boolean; initialCount: number; }) {
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [isPending, startTransition] = useTransition();
    const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);
    const [optimisticCount, setOptimisticCount] = useOptimistic(count);

    const toggleLike = () => {
        if (isPending) return;
        const newLiked = !liked;
        const newCount = newLiked ? count + 1 : Math.max(0, count - 1);

        startTransition(async () => {
            setOptimisticLiked(newLiked);
            setOptimisticCount(newCount);
            try {
                await toggleDiaryLike(entryId);
                setLiked(newLiked);
                setCount(newCount);
            } catch {
                showToast("Erreur lors de la mise à jour", "error");
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={toggleLike}
                disabled={isPending}
                className="text-text-secondary hover:text-[#8E6F5E] transition-colors duration-150 focus:outline-none"
            >
                <Heart
                    size={20}
                    fill={optimisticLiked ? "currentColor" : "none"}
                    className={optimisticLiked ? "text-[#8E6F5E]" : ""}
                />
            </button>
            <span className="text-meta text-text-secondary">{optimisticCount}</span>
        </div>
    );
}
