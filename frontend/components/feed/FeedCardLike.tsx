"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

type Props = {
  user: { id: string; username?: string; display_name?: string; avatar?: string };
  album?: { id: string; title: string; artist: string; cover_url?: string };
  timeDisplay: string;
};

export default function FeedCardLike({ user, album, timeDisplay }: Props) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 mb-4"
    >
      <div className="flex items-center gap-3">
        <Link href={`/users/${user.username}`}>
          <Image
            src={user.avatar || "/default-avatar.png"}
            alt={user.display_name || "user"}
            width={36}
            height={36}
            className="rounded-full"
          />
        </Link>
        <div className="flex-1">
          <p className="text-sm text-gray-300 flex items-center gap-2">
            <Heart size={16} className="fill-red-500 text-red-500" />
            <Link href={`/users/${user.username}`} className="font-semibold hover:text-emerald-400">
              {user.display_name || user.username}
            </Link>
            {" "}a aimé{" "}
            {album && (
              <Link href={`/albums/${album.id}`} className="font-semibold hover:text-emerald-400">
                {album.title}
              </Link>
            )}
          </p>
          <p className="text-xs text-gray-500">{timeDisplay}</p>
        </div>
        {album?.cover_url && (
          <Link href={`/albums/${album.id}`}>
            <Image
              src={album.cover_url}
              alt={album.title}
              width={60}
              height={60}
              className="rounded-lg shadow-md hover:scale-105 transition"
            />
          </Link>
        )}
      </div>
    </motion.article>
  );
}