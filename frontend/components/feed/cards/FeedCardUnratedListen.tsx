'use client';

import Link from 'next/link';
import { FeedEvent } from '@/app/actions/feed';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import { getTimeAgo } from '@/lib/utils/formatDate';
import { CoverImage } from '@/components/CoverImage';

interface FeedCardUnratedListenProps {
  event: FeedEvent & { type: 'UNRATED_LISTEN' };
  currentUserId?: string;
}

export default function FeedCardUnratedListen({
  event,
  currentUserId,
}: FeedCardUnratedListenProps) {
  const timeAgo = getTimeAgo(event.created_at);

  const entryHref = event.entry_id
    ? `/diary/${event.entry_id}`
    : `/albums/${event.album?.id}`;

  return (
    <div className="w-full relative rounded-[12px] px-6 py-6 bg-background-tertiary opacity-90">
      <time className="absolute top-5 right-6 text-[12px] text-text-disabled">
        {timeAgo}
      </time>

      {/* Contexte — avatar + nom */}
      <div className="mb-4 flex items-center gap-2 pr-16 text-[12px] text-text-tertiary">
        <UserAvatar userId={event.actor.id} src={event.actor.avatar_url} size={18} />
        {currentUserId === event.actor.id ? (
          <span>Tu as écouté</span>
        ) : (
          <>
            <Link
              href={`/u/${event.actor.username}`}
              className="hover:text-text-primary transition-colors duration-150"
            >
              {event.actor.username}
            </Link>
            <span>·</span>
            <span>a écouté</span>
          </>
        )}
      </div>

      {/* En-tête compact — cover + titre/artiste */}
      <div className="flex gap-4 items-center">
        {event.album?.cover_url && (
          <Link href={entryHref} className="shrink-0">
            <div className="w-16 h-16 rounded-[8px] overflow-hidden bg-background-secondary">
              <CoverImage
                src={event.album.cover_url}
                alt={event.album.title || 'album'}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                placeholder={<div className="w-full h-full bg-background-tertiary" />}
              />
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          {event.album && (
            <Link href={entryHref}>
              <h3 className="text-[14px] font-medium text-text-secondary line-clamp-2 leading-snug">
                {event.album.title}
              </h3>
            </Link>
          )}
          {event.album?.artist_name && (
            <p className="text-[12px] text-text-tertiary mt-0.5 truncate">
              {event.album.artist_name}
            </p>
          )}
        </div>
      </div>

      {/* Small note: journal entry exists but not rated */}
      <div className="mt-3 text-[11px] text-text-disabled italic">
        Inscrit dans le journal (sans note)
      </div>
    </div>
  );
}
