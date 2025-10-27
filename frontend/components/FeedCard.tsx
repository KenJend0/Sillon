"use client";


import { timeAgo } from "@/lib/time";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";


type FeedCardProps = {
    event_id: string;
    type: "review" | "rating" | "diary" | "like" | "follow" | "discover";
    created_at: string;
    user?: { id: string; username?: string; display_name?: string; avatar?: string };
    targetUser?: { id: string; username?: string; display_name?: string; avatar?: string };
    album?: { id: string; title?: string; artist?: string; cover_url?: string };
    reviewText?: string;
    rating?: number;
    payload?: any;
};

export default function FeedCard(item: FeedCardProps) {
    const payload = typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload || {};

    const [timeDisplay, setTimeDisplay] = useState("");
    useEffect(() => {
        setTimeDisplay(timeAgo(item.created_at));
        const interval = setInterval(() => {
            setTimeDisplay(timeAgo(item.created_at));
        }, 60000); // met à jour toutes les minutes
        return () => clearInterval(interval);
    }, [item.created_at]);

    const renderHeader = () => {
        switch (item.type) {
            case "diary":
                return `${item.user?.display_name || item.user?.username} a ajouté un album à son journal`;
            case "like":
                return `${item.user?.display_name || item.user?.username} a aimé une review`;
            case "follow":
                return `${item.user?.display_name || item.user?.username} suit ${item.targetUser?.display_name || item.targetUser?.username || "un utilisateur"}`;
            case "discover":
                return "🎯 Découverte pour vous";
            default:
                return `${item.user?.display_name || item.user?.username} a partagé une activité`;
        }
    };

    const renderBody = () => {
        switch (item.type) {
            case "diary":
                return (
                    <>
                        {item.rating && (
                            <div className="text-emerald-400 mb-1 text-lg">
                                {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                            </div>
                        )}
                        {item.reviewText && (
                            <p className="text-gray-300 mb-3 leading-relaxed">{item.reviewText}</p>
                        )}
                        {item.album?.cover_url && (
                            <div className="overflow-hidden rounded-lg shadow-md hover:scale-[1.02] transition">
                                <Image
                                    src={item.album.cover_url}
                                    alt={item.album.title || "album"}
                                    width={600}
                                    height={600}
                                    className="w-full rounded-lg object-cover"
                                />
                            </div>
                        )}
                    </>
                );

            case "like":
                return (
                    <div className="italic text-gray-400 border-l-4 border-neutral-700 pl-3">
                        A aimé une review (id: {payload.liked_entry_id})
                    </div>
                );

            case "follow":
                return (
                    <div className="text-gray-300 flex items-center space-x-3">
                        {item.targetUser?.avatar && (
                            <Image
                                src={item.targetUser.avatar}
                                alt={item.targetUser.username || "user"}
                                width={48}
                                height={48}
                                className="rounded-full border border-neutral-700"
                            />
                        )}
                        <div>
                            <p className="font-semibold">{item.targetUser?.display_name || item.targetUser?.username}</p>
                            <p className="text-gray-500 text-sm">@{item.targetUser?.username}</p>
                        </div>
                    </div>
                );

            case "discover":
                return (
                    <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 shadow-inner">
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
                            {item.album?.cover_url && (
                                <Image
                                    src={item.album.cover_url}
                                    alt={item.album.title || "album"}
                                    width={150}
                                    height={150}
                                    className="rounded-lg mb-3 md:mb-0"
                                />
                            )}
                            <div>
                <span className="text-emerald-400 text-sm">
                  {payload?.discover_kind === "trending_week" ? "🔥 Top de la semaine" : "✨ Recommandé pour vous"}
                </span>
                                <h3 className="text-lg font-bold mt-1">{item.album?.title}</h3>
                                <p className="text-gray-400">{item.album?.artist}</p>
                                <button className="mt-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm transition">
                                    Découvrir l’album
                                </button>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6 shadow-lg hover:shadow-emerald-900/20 transition-all max-w-[700px] mx-auto"
        >
            <div className="text-sm text-gray-400 mb-3 flex items-center justify-between">
                <span>{renderHeader()}</span>
                <span className="text-xs">{timeDisplay || "…"}</span>
            </div>
            <div>{renderBody()}</div>
            {/* Footer */}
        </motion.div>
    );
}
