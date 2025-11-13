"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";

type Props = {
  album: { id: string; title: string; artist: string; cover_url?: string };
  discover_kind?: string;
};

export default function FeedCardDiscover({ album, discover_kind }: Props) {
  const isTrending = discover_kind === "trending_week";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-emerald-900/20 to-neutral-900 border border-emerald-800/30 rounded-xl p-5 mb-4 shadow-accent"
    >
      <div className="flex items-center gap-2 mb-3 text-emerald-400">
        {isTrending ? <TrendingUp size={20} /> : <Sparkles size={20} />}
        <span className="text-sm font-semibold">
          {isTrending ? "🔥 Tendance cette semaine" : "✨ Découverte pour vous"}
        </span>
      </div>

      <div className="flex gap-4">
        {album.cover_url && (
          <Link href={`/albums/${album.id}`}>
            <Image
              src={album.cover_url}
              alt={album.title}
              width={120}
              height={120}
              className="rounded-lg shadow-lg hover:scale-105 transition"
            />
          </Link>
        )}
        <div className="flex-1">
          <Link href={`/albums/${album.id}`} className="hover:text-emerald-400 transition">
            <h3 className="font-bold text-xl text-white mb-1">{album.title}</h3>
          </Link>
          <p className="text-gray-400 mb-3">{album.artist}</p>
          <Link href={`/albums/${album.id}`} className="btn-primary inline-block">
            Découvrir
          </Link>
        </div>
      </div>
    </motion.article>
  );
}