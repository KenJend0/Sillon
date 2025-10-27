"use client";

import { useRouter } from "next/navigation";

type Props = { fallbackHref?: string; className?: string; children?: React.ReactNode; };

export default function BackButton({ fallbackHref = "/", className = "", children }: Props) {
    const router = useRouter();
    const onClick = () => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={className || "text-sm opacity-70 hover:opacity-100"}
            aria-label="Go back"
        >
            {children ?? "← Back"}
        </button>
    );
}
