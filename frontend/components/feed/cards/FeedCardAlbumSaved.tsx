'use client';

import Link from 'next/link';
import { FeedEvent } from '@/app/actions/feed';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import { getTimeAgo } from '@/lib/utils/formatDate';
import { CoverImage } from '@/components/CoverImage';

interface FeedCardAlbumSavedProps {
  event: FeedEvent & { type: 'ALBUM_SAVED' };
  currentUserId?: string;
}

export default function FeedCardAlbumSaved({
  event,
  currentUserId,
}: FeedCardAlbumSavedProps) {
  const timeAgo = getTimeAgo(event.created_at);
  const albumHref = event.album ? `/albums/${event.album.id}` : null;
  const artistHref = event.album?.artist_id ? `/artists/${event.album.artist_id}` : null;

  return (
    <div className="w-full relative border border-border rounded-card py-5 px-6">
      <time className="absolute top-4 right-6 text-label text-text-disabled">
        {timeAgo}
      </time>

      {/* Contexte â€” avatar + nom */}
      <div className="mb-3 flex items-center gap-2 pr-16 text-label text-text-tertiary">
        <UserAvatar userId={event.actor.id} src={event.actor.avatar_url} size={18} />
        {currentUserId === event.actor.id ? (
          <span>Tu as ajouté à ta liste</span>
        ) : (
          <>
            <Link
              href={`/u/${event.actor.username}`}
              className="text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              {event.actor.username}
            </Link>
            <span>·</span>
            <span>a ajouté à sa liste</span>
          </>
        )}
      </div>

      {/* Ligne compacte — cover + titre */}
      {event.album && (
        <div className="flex gap-4 items-center min-w-0">
          {event.album.cover_url && albumHref && (
            <Link href={albumHref} className="shrink-0">
            <div className="w-14 h-14 rounded-cover-sm overflow-hidden bg-background-secondary flex-shrink-0">
              <CoverImage
                src={event.album.cover_url}
                alt={event.album.title}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                placeholder={<div className="w-full h-full bg-background-tertiary" />}
              />
            </div>
            </Link>
          )}
          <div className="flex-1 min-w-0">
            {albumHref ? (
              <Link href={albumHref}>
                <p className="font-display font-normal text-meta text-text-warm line-clamp-2 leading-snug">
                  {event.album.title}
                </p>
              </Link>
            ) : (
              <p className="font-display font-normal text-meta text-text-warm line-clamp-2 leading-snug">
                {event.album.title}
              </p>
            )}
            {event.album.artist_name && (
              artistHref ? (
                <Link
                  href={artistHref}
                  className="mt-0.5 block truncate text-sm text-text-tertiary transition-colors duration-150 hover:text-text-primary"
                >
                  {event.album.artist_name}
                </Link>
              ) : (
                <p className="text-sm text-text-tertiary mt-0.5 truncate">
                  {event.album.artist_name}
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

