import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../components/ui/BackButton';
import { ProfileHeader } from '../../../components/profile/ProfileHeader';
import { ProfileTabs } from '../../../components/profile/ProfileTabs';
import { RatingDistribution } from '../../../components/profile/RatingDistribution';
import { RatingFilterProvider } from '../../../lib/RatingFilterContext';
import { useAuth } from '../../../lib/AuthContext';
import { useNavScrollHandler } from '../../../lib/useNavScrollHandler';
import { supabase } from '../../../lib/supabase';
import { getCurrentStreak, getFavoriteAlbums, type FavoriteAlbum } from '../../../lib/profile';
import { getUserDiary, getUserReviewsUnified, type DiaryEntryUI, type UnifiedReview } from '../../../lib/diary';
import { getUserTrackDiary, type TrackDiaryEntryUI } from '../../../lib/trackDiary';
import { getPublicUserLists, type ProfileListUI } from '../../../lib/lists';

type ProfileRow = { id: string; bio: string | null; avatar_url: string | null };

/**
 * Page /u/[username] — miroir de apps/web/app/u/[username]/(profile)/page.tsx +
 * ProfileHeader/PublicProfileTabs. Voir docs/MOBILE_ROADMAP.md (6.7) pour les notes de
 * scope. Le blocage masque tout le contenu comme sur le web (juste le menu 3 points
 * pour débloquer) ; le signalement n'existe ni côté web ni mobile pour l'instant.
 */
export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user: authUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollHandler = useNavScrollHandler();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [favoriteAlbums, setFavoriteAlbums] = useState<FavoriteAlbum[]>([]);
  const [streak, setStreak] = useState<{ days: number; isActiveToday: boolean } | undefined>(undefined);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [allRatings, setAllRatings] = useState<(number | null)[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryUI[]>([]);
  const [trackEntries, setTrackEntries] = useState<TrackDiaryEntryUI[]>([]);
  const [unifiedReviews, setUnifiedReviews] = useState<UnifiedReview[]>([]);
  const [lists, setLists] = useState<ProfileListUI[]>([]);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, bio, avatar_url')
      .eq('username', username)
      .maybeSingle();

    if (!profileRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (authUser && authUser.id === profileRow.id) {
      router.replace('/(tabs)/me');
      return;
    }

    const [
      { count: followers },
      { count: following },
      diary,
      tracks,
      reviews,
      publicLists,
      favAlbums,
      streakResult,
      { data: albumRatings },
      { data: trackRatings },
      { count: albumReviewsCount },
      { count: trackReviewsCount },
    ] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', profileRow.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileRow.id),
      getUserDiary(profileRow.id, 0, 51),
      getUserTrackDiary(profileRow.id, 0, 51),
      getUserReviewsUnified(profileRow.id),
      getPublicUserLists(profileRow.id),
      getFavoriteAlbums(profileRow.id),
      getCurrentStreak(profileRow.id),
      supabase.from('diary_entries').select('rating').eq('user_id', profileRow.id).eq('is_public', true),
      supabase.from('track_diary_entries').select('rating').eq('user_id', profileRow.id).eq('is_public', true),
      supabase.from('diary_entries').select('id', { count: 'exact', head: true }).eq('user_id', profileRow.id).eq('is_public', true).not('review_body', 'is', null),
      supabase.from('track_diary_entries').select('id', { count: 'exact', head: true }).eq('user_id', profileRow.id).eq('is_public', true).not('review_body', 'is', null).neq('review_body', ''),
    ]);

    let following_ = false;
    let blocking_ = false;
    if (authUser) {
      const [{ data: followStatus }, { data: blockStatus }] = await Promise.all([
        supabase.from('follows').select('follower_id').eq('follower_id', authUser.id).eq('followee_id', profileRow.id).maybeSingle(),
        supabase.from('user_blocks').select('blocked_id').eq('blocker_id', authUser.id).eq('blocked_id', profileRow.id).maybeSingle(),
      ]);
      following_ = !!followStatus;
      blocking_ = !!blockStatus;
    }

    setProfile(profileRow);
    setIsFollowing(following_);
    setIsBlocking(blocking_);
    setFollowersCount(followers ?? 0);
    setFollowingCount(following ?? 0);
    setDiaryEntries(diary);
    setTrackEntries(tracks);
    setUnifiedReviews(reviews);
    setLists(publicLists);
    setFavoriteAlbums(favAlbums);
    setStreak(streakResult.ok ? { days: streakResult.streakDays, isActiveToday: streakResult.isActiveToday } : undefined);
    setAllRatings([...(albumRatings ?? []).map((r) => r.rating), ...(trackRatings ?? []).map((r) => r.rating)]);
    setReviewsCount((albumReviewsCount ?? 0) + (trackReviewsCount ?? 0));
    setLoading(false);
  }, [username, authUser, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#1C1C1C" />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View className="flex-1 bg-background px-4" style={{ paddingTop: insets.top + 16 }}>
        <BackButton />
        <View className="mt-16 items-center">
          <Text className="text-text-primary mb-2" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 22 }}>
            Utilisateur non trouvé
          </Text>
          <Text className="text-text-tertiary" style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}>
            Le profil @{username} n'existe pas
          </Text>
        </View>
      </View>
    );
  }

  if (isBlocking) {
    return (
      <View className="flex-1 bg-background px-4" style={{ paddingTop: insets.top + 16 }}>
        <BackButton />
        <Text className="text-text-primary mt-8" style={{ fontFamily: 'Inter_500Medium', fontSize: 22 }}>@{username}</Text>
        <Text className="text-text-tertiary mt-3" style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}>
          Tu as bloqué cet utilisateur. Son contenu est masqué.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <BackButton />
        </View>

        <ProfileHeader
          user={{ id: profile.id, username: username!, pictureUrl: profile.avatar_url, bio: profile.bio, isMe: false, isFollowing, isBlocking }}
          reviewsCount={reviewsCount}
          followersCount={followersCount}
          followingCount={followingCount}
          streak={streak}
          favoriteAlbums={favoriteAlbums}
          onOpenFollowers={() => router.push(`/u/${username}/followers`)}
          onOpenFollowing={() => router.push(`/u/${username}/following`)}
          onFollowChange={setIsFollowing}
          onBlockChange={setIsBlocking}
        />

        <View style={{ paddingHorizontal: 16 }}>
          <RatingFilterProvider>
            <RatingDistribution ratings={allRatings} label="Ses" />

            <View className="mt-8">
              <ProfileTabs
                isMe={false}
                userId={profile.id}
                diaryEntries={diaryEntries}
                trackEntries={trackEntries}
                unifiedReviews={unifiedReviews}
                lists={lists}
                currentUserId={authUser?.id}
              />
            </View>
          </RatingFilterProvider>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
