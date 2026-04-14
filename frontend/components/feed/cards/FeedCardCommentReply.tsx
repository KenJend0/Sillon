'use client';

import Link from 'next/link';
import { FeedEvent } from '@/app/actions/feed';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import { getTimeAgo } from '@/lib/utils/formatDate';

interface FeedCardCommentReplyProps {
  event: FeedEvent & { type: 'COMMENT_REPLY' };
}

export default function FeedCardCommentReply({ event }: FeedCardCommentReplyProps) {
  const timeAgo = getTimeAgo(event.created_at);

  const entryLink = event.entry_id
    ? `/diary/${event.entry_id}${event.comment_id ? `?reply=${event.comment_id}` : ''}`
    : event.album
    ? `/albums/${event.album.id}`
    : null;

  return (
    <div className="relative flex items-start gap-2 px-6 py-2">
      <time className="absolute top-2 right-6 text-[12px] text-text-disabled">
        {timeAgo}
      </time>

      <UserAvatar userId={event.actor.id} src={event.actor.avatar_url} size={18} />

      <p className="flex-1 min-w-0 pr-16 text-[12px] text-text-tertiary leading-relaxed">
        <Link
          href={`/u/${event.actor.username}`}
          className="text-text-secondary hover:text-text-primary transition-colors duration-150"
        >
          {event.actor.username}
        </Link>
        {' a répondu à ton commentaire'}
        {event.album && entryLink && (
          <>
            {' sur '}
            <Link
              href={entryLink}
              className="text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              {event.album.title}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
