import Link from 'next/link';
import { getMyFeed } from '@/app/actions/feed';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/server';
import FeedInfiniteList from '@/components/feed/FeedInfiniteList';
import { getSuggestedUsers } from '@/app/actions/social';
import FollowButton from '@/components/social/FollowButton';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';

export default async function FeedPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/auth?mode=login');
  }

  const feedResult = await getMyFeed({ limit: 20, offset: 0 });

  if (!feedResult.success) {
    console.error('Feed error:', feedResult.error);
  }

  const events = feedResult.events;
  const suggestedUsers = events.length === 0 ? await getSuggestedUsers(5) : [];

  return (
    <div className="mx-auto max-w-page px-4 md:px-6">
      <div className="pt-8 pb-6">
        <h1 className="text-h1 text-text-primary mb-2">Feed</h1>
        <p className="text-[14px] text-text-tertiary">
          Ce qui se passe autour de toi.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[16px] text-text-secondary mb-3">
            Le fil est calme pour l&apos;instant.
          </p>
          <p className="text-[14px] text-text-tertiary mb-8 leading-relaxed">
            Quand tu suivras quelqu&apos;un, ses écoutes<br />
            et ses notes apparaîtront ici.
          </p>
          <Link
            href="/explore"
            className="text-[14px] text-text-secondary hover:text-[#8E6F5E] transition-colors duration-150"
          >
            Découvrir des albums
          </Link>

          {suggestedUsers.length > 0 && (
            <div className="mt-16 text-left">
              <p className="text-[12px] text-text-secondary font-medium uppercase tracking-[0.08em] mb-4">
                Personnes à suivre
              </p>
              <div className="divide-y divide-border-divider">
                {suggestedUsers.map((profile) => (
                  <div key={profile.id} className="flex items-center gap-4 py-4">
                    <Link href={`/u/${profile.username}`} className="flex-shrink-0">
                      <div className="rounded-full overflow-hidden border border-border">
                        <UserAvatar userId={profile.id} src={profile.avatar_url} size={40} />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${profile.username}`} className="block hover:opacity-70 transition-opacity duration-150">
                        <p className="text-[14px] font-medium text-text-primary truncate">
                          {profile.display_name || profile.username}
                        </p>
                        <p className="text-[12px] text-text-tertiary mt-0.5">@{profile.username}</p>
                      </Link>
                    </div>
                    <FollowButton userId={profile.id} initialIsFollowing={false} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <FeedInfiniteList initialEvents={events} currentUserId={user.id} />
      )}
    </div>
  );
}
