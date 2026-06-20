"use client";

import { useEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 16;
const TOP_OFFSET = 24;
// Délai avant d'appliquer le changement visuel. Sur iOS Safari, muter le style
// d'un élément fixed + backdrop-blur PENDANT un scroll momentum (même pour
// inverser le sens) peut figer le scroll en cours. On attend une courte pause
// sans nouvel événement de scroll avant de committer, pour ne jamais muter
// en plein geste.
const COMMIT_DELAY_MS = 80;

export function useScrollNavState() {
    const [isCompact, setIsCompact] = useState(false);
    const lastY = useRef(0);
    const pendingValue = useRef<boolean | null>(null);
    const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        lastY.current = window.scrollY;
        let frame = 0;

        const scheduleCommit = (value: boolean) => {
            if (pendingValue.current === value) return;
            pendingValue.current = value;
            if (commitTimer.current) clearTimeout(commitTimer.current);
            commitTimer.current = setTimeout(() => {
                setIsCompact(value);
            }, COMMIT_DELAY_MS);
        };

        const handleScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const y = window.scrollY;
                const delta = y - lastY.current;

                if (y <= TOP_OFFSET) {
                    scheduleCommit(false);
                } else if (delta > SCROLL_THRESHOLD) {
                    scheduleCommit(true);
                } else if (delta < -SCROLL_THRESHOLD) {
                    scheduleCommit(false);
                }

                lastY.current = y;
            });
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (frame) cancelAnimationFrame(frame);
            if (commitTimer.current) clearTimeout(commitTimer.current);
        };
    }, []);

    return isCompact;
}
