'use client';

import Link from 'next/link';
import { Disc3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CoverImage } from '@/components/CoverImage';
import { Heart, MessageCircle } from 'lucide-react';
import { FeedEvent } from '@/app/actions/feed';
import { toggleDiaryLike } from '@/app/actions/diary';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import { getTimeAgo } from '@/lib/utils/formatDate';
import { showToast } from '@/components/Toast';

interface FeedCardReviewCreatedProps {
  event: FeedEvent & { type: 'REVIEW_CREATED' };
  currentUserId?: string;
}

export default function FeedCardReviewCreated({
  event,
  currentUserId,
}: FeedCardReviewCreatedProps) {
  const timeAgo = getTimeAgo(event.created_at);
  const hasWords = !!event.review_excerpt;
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(event.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(event.likes_count ?? 0);
  const [liking, setLiking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isLong = event.review_is_long ?? false;

  useEffect(() => {
    setIsLiked(event.is_liked ?? false);
    setLikesCount(event.likes_count ?? 0);
  }, [event.entry_id, event.is_liked, event.likes_count]);

  const handleLike = async () => {
    if (!currentUserId) {
      showToast("Connecte-toi pour aimer cette revue", "error");
      return;
    }
    if (liking || !event.entry_id) {
      return;
    }

    // Optimistic update
    const prevLiked = isLiked;
    const prevCount = likesCount;
    const newLiked = !prevLiked;
    setIsLiked(newLiked);
    setLikesCount(newLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
    setLiking(true);

    try {
      await toggleDiaryLike(event.entry_id);
    } catch (err) {
      // Revert on error
      console.error('Like error:', err);
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      showToast("Impossible d'aimer cette revue", "error");
    } finally {
      setLiking(false);
    }
  };

  const entryHref = event.entry_id
    ? `/diary/${event.entry_id}`
    : `/albums/${event.album?.id}`;
  const artistHref = event.album?.artist_id
    ? `/artists/${event.album.artist_id}`
    : null;

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
      {/* Barre d'identité gauche */}
      <div className="absolute left-0 top-6 bottom-6 w-0.5 bg-accent opacity-40 rounded-r-full" />
      <time className="absolute top-5 right-6 text-label text-text-disabled">
        {timeAgo}
      </time>

      {/* Contexte — avatar + nom */}
      <div className="mb-4 flex items-center gap-2 pr-16 text-label text-text-tertiary">
        <UserAvatar userId={event.actor.id} src={event.actor.avatar_url} size={18} />
        {currentUserId === event.actor.id ? (
          <span>{hasWords ? 'Tu as écrit quelques mots' : 'Tu as écouté'}</span>
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

      {/* En-tête compact — cover + titre/artiste */}
      <div className="flex gap-4 items-center mb-4">
        {event.album?.cover_url && (
          <Link href={entryHref} className="shrink-0">
            <div className="w-20 h-20 rounded-cover overflow-hidden bg-background-secondary flex-shrink-0">
              <CoverImage
                src={event.album.cover_url}
                alt=""
                width={80}
                height={80}
                className="w-full h-full object-cover"
                placeholder={<div className="w-full h-full bg-background-tertiary flex items-center justify-center"><Disc3 size={20} className="text-text-disabled" /></div>}
              />
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          {event.album && (
            <Link href={entryHref}>
              <p className="font-display font-normal text-body text-text-warm line-clamp-2 leading-snug">
                {event.album.title}
              </p>
            </Link>
          )}
          {event.album?.artist_name && (
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
          {event.rating && (
            <span className="inline-flex items-baseline gap-0.5 mt-2 bg-paper-hi border border-accent rounded-badge px-1.5 py-0.5 text-accent font-display italic text-[15px] leading-none">
              {Math.round(event.rating)}
              <span className="font-sans not-italic text-[9px] tracking-[0.16em] uppercase opacity-70">/10</span>
            </span>
          )}
        </div>
      </div>

      {/* Extrait de review — pleine largeur */}
      {hasWords && (
        <div className="mb-4">
          <p className={`italic text-meta leading-relaxed text-text-secondary max-w-[540px] ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            &laquo;&thinsp;{event.review_excerpt}&thinsp;&raquo;
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
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
          <Heart
            size={16}
            className={isLiked ? 'fill-like text-like' : ''}
          />
          <span className="text-label">{likesCount > 0 ? likesCount : ''} J'aime</span>
        </button>
        {event.entry_id && (
          <Link
            href={`/diary/${event.entry_id}`}
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

