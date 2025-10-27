"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

type DiscoverItem = {
    id: string;
    album_id: string;
    album_title: string;
    artist_name: string;
    cover_url: string;
    discover_kind: string;
    score?: number;
};

export default function DiscoverSection({
                                            title,
                                            emoji,
                                            items,
                                        }: {
    title: string;
    emoji: string;
    items: DiscoverItem[];
}) {
    return (
        <section className="mb-12">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-emerald-400">
                    {emoji} {title}
                </h2>
                <Link
                    href="/explore"
                    className="text-sm text-gray-500 hover:text-emerald-400 transition"
                >
                    Voir tout →
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {items.map((item, i) => (
                    <motion.div
                        key={item.id || i}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.25 }}
                        className="relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-md hover:shadow-emerald-900/20 cursor-pointer"
                    >
                        {/* Cover */}
                        <Image
                            src={item.cover_url}
                            alt={item.album_title}
                            width={300}
                            height={300}
                            className="object-cover w-full aspect-square"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 hover:opacity-100 transition flex flex-col justify-end p-3">
                            <h3 className="text-white font-semibold text-sm truncate">
                                {item.album_title}
                            </h3>
                            <p className="text-gray-300 text-xs truncate">{item.artist_name}</p>
                        </div>

                        {/* Badge discover kind */}
                        <div className="absolute top-2 left-2 bg-emerald-500 text-xs px-2 py-0.5 rounded-md text-black font-semibold">
                            {item.discover_kind === "trending_week"
                                ? "Top semaine"
                                : item.discover_kind === "all_time_top"
                                    ? "Classique"
                                    : "Sélection"}
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
