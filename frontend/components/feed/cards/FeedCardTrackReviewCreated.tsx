'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle } from 'lucide-react';
import { FeedEvent } from '@/app/actions/feed';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import { getTimeAgo } from '@/lib/utils/formatDate';
import { CoverImage } from '@/components/CoverImage';
import { toggleTrackDiaryLike } from '@/app/actions/track-diary';
import { showToast } from '@/components/Toast';

interface Props {
  event: FeedEvent & { type: 'TRACK_REVIEW_CREATED' };
  currentUserId?: string;
}

export default function FeedCardTrackReviewCreated({ event, currentUserId }: Props) {
  const timeAgo = getTimeAgo(event.created_at);
  const hasWords = !!event.review_excerpt;
  const isLong = event.review_is_long ?? false;
  const [expanded, setExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(event.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(event.likes_count ?? 0);
  const [liking, setLiking] = useState(false);
  const router = useRouter();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) { showToast('Connecte-toi pour aimer cette revue', 'error'); return; }
    if (liking || !event.entry_id) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikesCount(!prev ? likesCount + 1 : Math.max(0, likesCount - 1));
    setLiking(true);
    try {
      await toggleTrackDiaryLike(event.entry_id);
    } catch {
      setIsLiked(prev);
      setLikesCount(prev ? likesCount + 1 : Math.max(0, likesCount - 1));
    } finally {
      setLiking(false);
    }
  };

  const track = event.track;
  const trackHref = track ? `/tracks/${track.id}` : undefined;
  const entryHref = event.entry_id ? `/track-diary/${event.entry_id}` : trackHref;
  const artistHref = track?.artist_id ? `/artists/${track.artist_id}` : undefined;
  const coverUrl = track?.cover_url ?? event.album?.cover_url ?? null;

  const handleCardNavigation = (target: EventTarget | null) => {
    if (!entryHref) return;

    const element = target instanceof HTMLElement ? target : null;
    if (element?.closest('a, button')) return;

    router.push(entryHref);
  };

  return (
    <div
      className="w-full relative rounded-card px-6 py-6 bg-background-tertiary cursor-pointer overflow-hidden"
      onClick={(e) => handleCardNavigation(e.target)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardNavigation(e.target);
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="absolute left-0 top-6 bottom-6 w-0.5 bg-accent opacity-40 rounded-r-full" />
      <time className="absolute top-5 right-6 text-label text-text-disabled">
        {timeAgo}
      </time>

      {/* Contexte — avatar + nom */}
      <div className="mb-4 flex items-center gap-2 pr-16 text-label text-text-tertiary">
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
            <div className="w-20 h-20 rounded-cover overflow-hidden bg-background-secondary">
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
            <Link href={entryHref ?? trackHref}>
              <p className="font-display font-normal text-body text-text-warm line-clamp-2 leading-snug">
                {track.title}
              </p>
            </Link>
          )}
          {track?.artist_name && (
            artistHref ? (
              <Link
                href={artistHref}
                className="mt-0.5 block truncate text-sm text-text-tertiary transition-colors duration-150 hover:text-text-primary"
              >
                {track.artist_name}
              </Link>
            ) : (
              <p className="text-sm text-text-tertiary mt-0.5 truncate">
                {track.artist_name}
              </p>
            )
          )}
          {event.rating != null && (
            <span className="inline-flex items-baseline gap-0.5 mt-2 bg-paper-hi border border-accent rounded-badge px-1.5 py-0.5 text-accent font-display italic text-[15px] leading-none">
              {Math.round(event.rating)}
              <span className="font-sans not-italic text-[9px] tracking-[0.16em] uppercase opacity-70">/10</span>
            </span>
          )}
        </div>
      </div>

      {/* Extrait de review */}
      {hasWords && (
        <div className="mb-4">
          <p className={`italic text-meta leading-relaxed text-text-secondary max-w-[540px] ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            &laquo;&thinsp;{event.review_excerpt}&thinsp;&raquo;
          </p>
          {isLong && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="mt-1 text-label text-text-tertiary hover:text-text-primary transition-colors duration-150 pl-3.5"
            >
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>
      )}

      {/* Hairline + Actions */}
      <div className="h-px bg-rule opacity-70 mb-3" />
      <div className="flex items-center gap-6">
        <button
          onClick={handleLike}
          disabled={liking}
          className="flex items-center gap-2 text-text-tertiary hover:text-like transition-colors duration-150 disabled:opacity-50"
        >
          <Heart size={16} className={isLiked ? 'fill-like text-like' : ''} />
          <span className="text-label">{likesCount > 0 ? likesCount : ''} J'aime</span>
        </button>
        {event.entry_id && (
          <Link
            href={`/track-diary/${event.entry_id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors duration-150"
          >
            <MessageCircle size={16} />
            <span className="text-label">Répondre</span>
          </Link>
        )}
      </div>
    </div>
  );
}
