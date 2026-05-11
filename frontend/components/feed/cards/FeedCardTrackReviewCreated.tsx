'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FeedEvent } from '@/app/actions/feed';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import { getTimeAgo } from '@/lib/utils/formatDate';
import { CoverImage } from '@/components/CoverImage';

interface Props {
  event: FeedEvent & { type: 'TRACK_REVIEW_CREATED' };
  currentUserId?: string;
}

export default function FeedCardTrackReviewCreated({ event, currentUserId }: Props) {
  const timeAgo = getTimeAgo(event.created_at);
  const hasWords = !!event.review_excerpt;
  const isLong = event.review_is_long ?? false;
  const [expanded, setExpanded] = useState(false);

  const track = event.track;
  const trackHref = track ? `/tracks/${track.id}` : undefined;
  const coverUrl = track?.cover_url ?? event.album?.cover_url ?? null;

  return (
    <div className="w-full relative rounded-[12px] px-6 py-6 bg-background-tertiary">
      <time className="absolute top-5 right-6 text-[12px] text-text-disabled">
        {timeAgo}
      </time>

      {/* Contexte — avatar + nom */}
      <div className="mb-4 flex items-center gap-2 pr-16 text-[12px] text-text-tertiary">
        <UserAvatar userId={event.actor.id} src={event.actor.avatar_url} size={18} />
        {currentUserId === event.actor.id ? (
          <span>{hasWords ? 'Tu as écrit quelques mots sur un titre' : 'Tu as écouté un titre'}</span>
        ) : (
          <>
            <Link
              href={`/u/${event.actor.username}`}
              className="text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              {event.actor.username}
            </Link>
            <span>·</span>
            <span>{hasWords ? 'a écrit quelques mots' : 'a écouté'}</span>
          </>
        )}
      </div>

      {/* En-tête compact — cover + titre/artiste/album */}
      <div className="flex gap-4 items-center mb-4">
        {coverUrl && trackHref && (
          <Link href={trackHref} className="shrink-0">
            <div className="w-20 h-20 rounded-[10px] overflow-hidden bg-background-secondary">
              <CoverImage
                src={coverUrl}
                alt=""
                width={80}
                height={80}
                className="w-full h-full object-cover"
                placeholder={<div className="w-full h-full bg-background-tertiary" />}
              />
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          {track && trackHref && (
            <Link href={trackHref}>
              <h3 className="text-[16px] font-medium text-text-primary line-clamp-2 leading-snug">
                {track.title}
              </h3>
            </Link>
          )}
          {track && (
            <p className="text-[12px] text-text-tertiary mt-0.5 truncate">
              {track.album_title && (
                <Link href={`/albums/${track.album_id}`} className="hover:text-[#8E6F5E] transition-colors">
                  {track.album_title}
                </Link>
              )}
            </p>
          )}
          {event.rating != null && (
            <div className="text-[#8E6F5E] font-medium text-[12px] mt-1">
              {Math.round(event.rating)}/10
            </div>
          )}
        </div>
      </div>

      {/* Extrait de review */}
      {hasWords && (
        <div className="mb-4">
          <p className={`text-[14px] leading-[1.8] text-text-secondary italic ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            &laquo;&thinsp;{event.review_excerpt}&thinsp;&raquo;
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[12px] text-text-tertiary hover:text-text-primary transition-colors duration-150"
            >
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
