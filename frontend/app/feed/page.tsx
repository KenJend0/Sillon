import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMyFeed, getPublicFeed } from '@/app/actions/feed';
import { getAuthUser, createSupabaseServer } from '@/lib/supabase/server';
import FeedInfiniteList from '@/components/feed/FeedInfiniteList';
import { getSuggestedUsers } from '@/app/actions/social';
import type { SuggestedUser } from '@/app/actions/social';
import FollowButton from '@/components/social/FollowButton';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import PublicFeedCard from '@/components/feed/PublicFeedCard';
import { getTrendingThisWeek } from '@/app/actions/explore';
import type { TrendingAlbum } from '@/app/actions/explore';
import { CoverImage } from '@/components/CoverImage';

/**
 * Feed state machine — calculé une seule fois, drive fetches ET rendu.
 *
 * empty   0 events  → CTAs + suggestions
 * sparse  1-2 ev.   → feed + suggestions
 * normal  ≥3 ev.    → feed seul
 */
type FeedState = 'empty' | 'sparse' | 'normal';

function computeFeedState(eventCount: number): FeedState {
  if (eventCount >= 3) return 'normal';
  if (eventCount === 0) return 'empty';
  return 'sparse';
}

export default async function FeedPage() {
  const user = await getAuthUser();

  // ── Visiteur non connecté ─────────────────────────────────────────────────
  if (!user) {
    const publicEntries = await getPublicFeed(30);

    return (
      <div className="px-4 md:px-6 lg:px-8 pb-28 lg:pb-12">
        <div className="pt-8 pb-6">
          <h1 className="text-h1 text-text-primary mb-2">Feed</h1>
          <p className="text-[14px] text-text-tertiary">Ce qui se passe autour de toi.</p>
        </div>

        {/* CTA bannière */}
        <div className="flex flex-col items-start gap-3 px-4 py-4 mb-8 bg-background-secondary border border-border rounded-[12px]">
          <p className="text-[14px] text-text-secondary leading-snug">
            Crée un compte pour voir ce qu&apos;écoutent tes amis.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/auth?mode=signup"
              className="text-[13px] font-medium px-3 py-1.5 bg-[#1C1C1C] text-[#F5F3EF] rounded-[8px] hover:opacity-85 transition-opacity"
            >
              Créer un compte
            </Link>
            <Link
              href="/auth?mode=login"
              className="text-[13px] text-text-secondary hover:text-text-primary transition-colors underline"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {/* Feed public */}
        {publicEntries.length === 0 ? (
          <p className="text-[14px] text-text-tertiary py-8 text-center">Aucune activité récente.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {publicEntries.map((entry) => (
              <PublicFeedCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Utilisateur connecté ─────────────────────────────────────────────────
  const supabase = await createSupabaseServer();

  // Redirect to onboarding if user still has a default UUID-like username
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  const defaultUsername = user.id.substring(0, 8);
  const needsOnboarding =
    !profile ||
    !profile.username ||
    profile.username === defaultUsername;
  if (needsOnboarding) {
    redirect('/onboarding');
  }

  // Count followings
  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id);

  const following = followingCount ?? 0;

  const [feedResult, suggestedUsers, trendingAlbums] = await Promise.all([
    getMyFeed({ limit: 20 }),
    getSuggestedUsers(4),
    getTrendingThisWeek(4),
  ]);

  if (!feedResult.success) console.error('Feed error:', feedResult.error);

  const events = feedResult.events;
  const state = computeFeedState(events.length);

  const publicEntries = state !== 'normal' ? await getPublicFeed(8) : [];

  const SuggestedUsersSection = () => (
    <div className="divide-y divide-border-divider">
      {suggestedUsers.map((p: SuggestedUser) => (
        <div key={p.id} className="flex items-center gap-4 py-4">
          <Link href={`/u/${p.username}`} className="flex-shrink-0">
            <div className="rounded-full overflow-hidden border border-border">
              <UserAvatar userId={p.id} src={p.avatar_url} size={40} />
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/u/${p.username}`} className="block hover:opacity-70 transition-opacity duration-150">
              <p className="text-[14px] font-medium text-text-primary truncate">
                @{p.username}
              </p>
            </Link>
          </div>
          <FollowButton userId={p.id} initialIsFollowing={false} />
        </div>
      ))}
    </div>
  );

  const AddAlbumCTA = () => (
    <Link
      href="/add"
      className="flex items-center justify-between px-4 py-4 bg-background-secondary border border-border rounded-[12px] hover:bg-background-tertiary transition-colors duration-150"
    >
      <p className="text-[14px] text-text-primary font-medium">Noter un album</p>
      <span className="text-[18px] leading-none ml-4 text-text-tertiary">→</span>
    </Link>
  );

  const TrendingMini = () => (
    <div>
      <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
        Tendances
      </p>
      <div className="space-y-3">
        {trendingAlbums.map((album: TrendingAlbum) => (
          <Link
            key={album.id}
            href={`/albums/${album.album_id}`}
            className="flex items-center gap-3 hover:opacity-75 transition-opacity duration-150"
          >
            <div className="relative w-10 h-10 rounded-[6px] overflow-hidden flex-shrink-0 bg-background-secondary">
              {album.cover_url && (
                <CoverImage
                  src={album.cover_url}
                  alt={album.album_title}
                  fill
                  className="object-cover"
                  placeholder={<div className="w-full h-full bg-background-tertiary" />}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-text-primary truncate">{album.album_title}</p>
              <p className="text-[11px] text-text-secondary truncate">{album.artist_name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  const Sidebar = () => (
    <div className="space-y-8">
      {trendingAlbums.length > 0 && <TrendingMini />}
      {suggestedUsers.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            Personnes à suivre
          </p>
          <SuggestedUsersSection />
        </div>
      )}
      <AddAlbumCTA />
    </div>
  );

  return (
    <div className="px-4 md:px-6 lg:px-8 pb-28 lg:pb-12 lg:flex lg:gap-12 lg:items-start">
      {/* Colonne principale */}
      <div className="lg:flex-1 lg:min-w-0">
        <div className="pt-8 pb-6">
          <h1 className="text-h1 text-text-primary mb-2">Feed</h1>
          <p className="text-[14px] text-text-tertiary">Ce qui se passe autour de toi.</p>
        </div>

        {/* ── empty ──────────────────────────────────────────────────────────── */}
        {state === 'empty' && (
          <div className="py-4">
            <p className="text-[16px] text-text-secondary mb-2">Le fil est calme pour l&apos;instant.</p>
            <p className="text-[14px] text-text-tertiary mb-8 leading-relaxed">
              Suis des gens pour voir leurs écoutes ici, ou commence par noter un album.
            </p>
            <div className="flex flex-col gap-3 mb-12">
              <AddAlbumCTA />
              <Link
                href="/explore"
                className="flex items-center justify-between px-4 py-4 bg-background-secondary border border-border rounded-[12px] hover:bg-background-tertiary transition-colors duration-150"
              >
                <p className="text-[14px] text-text-primary font-medium">Explorer des albums</p>
                <span className="text-[18px] leading-none ml-4 text-text-tertiary">→</span>
              </Link>
            </div>
            {publicEntries.length > 0 && (
              <div>
                <p className="text-[12px] text-text-secondary font-medium uppercase tracking-[0.08em] mb-4">
                  Ce qui se passe sur Waveform
                </p>
                <div className="flex flex-col gap-3">
                  {publicEntries.map((entry) => (
                    <PublicFeedCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── sparse ─────────────────────────────────────────────────────────── */}
        {state === 'sparse' && (
          <div>
            <FeedInfiniteList
              initialEvents={events}
              initialCursor={feedResult.nextCursor ?? null}
              currentUserId={user.id}
            />
            {publicEntries.length > 0 && (
              <div className="mt-8">
                <p className="text-[12px] text-text-secondary font-medium uppercase tracking-[0.08em] mb-4">
                  Découvrir sur Waveform
                </p>
                <div className="flex flex-col gap-3">
                  {publicEntries.map((entry) => (
                    <PublicFeedCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── normal ─────────────────────────────────────────────────────────── */}
        {state === 'normal' && (
          <FeedInfiniteList
            initialEvents={events}
            initialCursor={feedResult.nextCursor ?? null}
            currentUserId={user.id}
          />
        )}
      </div>

      {/* Sidebar unique — sticky depuis le haut */}
      <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-[72px]">
        <div className="pt-8">
          <Sidebar />
        </div>
      </aside>
    </div>
  );
}
