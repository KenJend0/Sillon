"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";

type Props = {
  user: { id: string; username?: string; display_name?: string; avatar?: string };
  targetUser: { id: string; username?: string; display_name?: string; avatar?: string };
  timeDisplay: string;
};

export default function FeedCardFollow({ user, targetUser, timeDisplay }: Props) {
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
            <UserPlus size={16} className="text-emerald-400" />
            <Link href={`/users/${user.username}`} className="font-semibold hover:text-emerald-400">
              {user.display_name || user.username}
            </Link>
            {" "}suit maintenant{" "}
            <Link href={`/users/${targetUser.username}`} className="font-semibold hover:text-emerald-400">
              {targetUser.display_name || targetUser.username}
            </Link>
          </p>
          <p className="text-xs text-gray-500">{timeDisplay}</p>
        </div>
        <Link href={`/users/${targetUser.username}`}>
          <Image
            src={targetUser.avatar || "/default-avatar.png"}
            alt={targetUser.display_name || "user"}
            width={48}
            height={48}
            className="rounded-full border-2 border-emerald-400/30"
          />
        </Link>
      </div>
    </motion.article>
  );
}