"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

type DiscoverItem = {
    id: string;
    album_title: string;
    artist_name: string;
    cover_url: string;
    discover_kind: string;
    score?: number;
    album_id: string;
};

export default function DiscoverCard({ item }: { item: DiscoverItem }) {
    const label =
        item.discover_kind === "trending_week"
            ? "Top de la semaine"
            : item.discover_kind === "all_time_top"
                ? "Classique intemporel"
                : "Sélection";

    return (
        <Link href={`/albums/${item.album_id}`} className="block">
            <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.25 }}
                className="relative group rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-md hover:shadow-emerald-900/20 cursor-pointer"
            >
                {/* Image */}
                <Image
                    src={item.cover_url}
                    alt={item.album_title}
                    width={400}
                    height={400}
                    className="object-cover w-full aspect-square transform group-hover:scale-110 transition-transform duration-500 ease-out"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <h3 className="text-white font-semibold text-sm truncate">
                        {item.album_title}
                    </h3>
                    <p className="text-gray-300 text-xs truncate">{item.artist_name}</p>
                    {item.score && (
                        <p className="text-emerald-400 text-xs mt-1">
                            ★ {item.score.toFixed(2)}
                        </p>
                    )}
                </div>

                {/* Badge */}
                <div className="absolute top-2 left-2 bg-emerald-500/90 text-black text-[10px] font-semibold px-2 py-0.5 rounded-md tracking-wide group-hover:bg-emerald-400 transition">
                    {label}
                </div>
            </motion.div>
        </Link>
    );
}
