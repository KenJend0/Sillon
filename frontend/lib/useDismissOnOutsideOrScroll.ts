"use client";

import { useEffect, type RefObject } from "react";

export function useDismissOnOutsideOrScroll(
    ref: RefObject<HTMLElement | null>,
    isOpen: boolean,
    onDismiss: () => void
) {
    useEffect(() => {
        if (!isOpen) return;

        function handlePointerDown(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onDismiss();
            }
        }
        function handleScroll() {
            onDismiss();
        }

        document.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [isOpen, ref, onDismiss]);
}
