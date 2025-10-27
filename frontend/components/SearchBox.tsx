"use client";

import { useRouter } from "next/navigation";
import SearchAutocomplete, { SuggestItem } from "@/components/SearchAutocomplete";

export default function SearchBox({ placeholder }: { placeholder?: string }) {
    const router = useRouter();
    const handleSelect = (item: SuggestItem) => {
        if (item.type === "album") router.push(`/albums/${item.id}`);
        else if (item.type === "artist") router.push(`/artists/${item.id}`);
        else if (item.type === "track") router.push(`/tracks/${item.id}`);
        else if (item.type === "user") {
            const uname = item.sublabel?.startsWith("@") ? item.sublabel.slice(1) : null;
            router.push(`/u/${uname || item.id}`);
        }
    };
    return <SearchAutocomplete placeholder={placeholder} onSelect={handleSelect} />;
}
