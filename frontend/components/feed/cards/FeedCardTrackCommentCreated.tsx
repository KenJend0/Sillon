'use client';

import Link from 'next/link';
import { FeedEvent } from '@/app/actions/feed';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import { getTimeAgo } from '@/lib/utils/formatDate';

interface Props {
  event: FeedEvent & { type: 'TRACK_COMMENT_CREATED' };
  currentUserId?: string;
}

export default function FeedCardTrackCommentCreated({ event, currentUserId }: Props) {
  const timeAgo = getTimeAgo(event.created_at);
  const track = event.track;
  const entryHref = event.entry_id ? `/track-diary/${event.entry_id}` : undefined;

  const trackLink = track && entryHref && (
    <>
      {' de '}
      <Link href={entryHref} className="text-text-secondary hover:text-text-primary transition-colors duration-150">
        {track.title}
      </Link>
    </>
  );

  return (
    <div className="relative flex items-start gap-2 px-6 py-2">
      <time className="absolute top-2 right-6 text-label text-text-disabled">{timeAgo}</time>
      <UserAvatar userId={event.actor.id} src={event.actor.avatar_url} size={18} />
      <p className="flex-1 min-w-0 pr-16 text-label text-text-tertiary leading-relaxed">
        {currentUserId === event.actor.id ? (
          <>Tu as commenté une écoute{trackLink}</>
        ) : (
          <>
            <Link href={`/u/${event.actor.username}`} className="text-text-secondary hover:text-text-primary transition-colors duration-150">
              {event.actor.username}
            </Link>
            {event.entry_owner_id === currentUserId
              ? <>{' '}a commenté ton écoute</>
              : <>{' '}a commenté une écoute</>
            }
            {trackLink}
          </>
        )}
      </p>
    </div>
  );
}
