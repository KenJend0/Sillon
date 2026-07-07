import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DiaryList } from './DiaryList';
import { ReviewsList } from './ReviewsList';
import { ListsTab } from './ListsTab';
import type { DiaryEntryUI, UnifiedReview } from '../../lib/diary';
import type { TrackDiaryEntryUI } from '../../lib/trackDiary';
import type { ProfileListUI } from '../../lib/lists';
import { metaMediumStyle } from '../../lib/typography';

type TabId = 'diary' | 'reviews' | 'lists';

type Props = {
  isMe: boolean;
  userId: string;
  diaryEntries: DiaryEntryUI[];
  trackEntries: TrackDiaryEntryUI[];
  unifiedReviews: UnifiedReview[];
  lists: ProfileListUI[];
  savedLists?: ProfileListUI[];
  /** Utilisateur connecté (viewer) — undefined si non authentifié, désactive like/commentaire. */
  currentUserId?: string;
};

/** Miroir de ProfileTabs/PublicProfileTabs (web) — les deux ont en réalité les 3 mêmes onglets. */
export function ProfileTabs({ isMe, userId, diaryEntries, trackEntries, unifiedReviews, lists, savedLists, currentUserId }: Props) {
  const [tab, setTab] = useState<TabId>('diary');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'diary', label: isMe ? 'Mon journal' : 'Journal' },
    { id: 'reviews', label: 'Critiques' },
    { id: 'lists', label: 'Listes' },
  ];

  return (
    <View>
      <View className="flex-row gap-5 mb-6 border-b border-border-divider">
        {tabs.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} className="pb-3" style={{ borderBottomWidth: 2, borderBottomColor: tab === t.id ? '#8E6F5E' : 'transparent' }}>
            <Text className={tab === t.id ? 'text-accent-deep' : 'text-text-tertiary'} style={metaMediumStyle}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Les 3 onglets restent montés en permanence (display: none sur les inactifs) plutôt
          que d'être démontés/remontés à chaque bascule : avec ~50-100 covers par onglet,
          recréer tout l'arbre de vues natives à chaque tap est nettement plus coûteux en
          React Native que sur le web (chaque vue traverse le bridge/Fabric). Cache la vue
          au lieu de la détruire — les données sont de toute façon déjà chargées en amont. */}
      <View style={tab === 'diary' ? undefined : { display: 'none' }}>
        <DiaryList userId={userId} initialAlbumEntries={diaryEntries} initialTrackEntries={trackEntries} ratingLabel={isMe ? 'Ma note' : 'Sa note'} />
      </View>
      <View style={tab === 'reviews' ? undefined : { display: 'none' }}>
        <ReviewsList reviews={unifiedReviews} currentUserId={currentUserId} />
      </View>
      <View style={tab === 'lists' ? undefined : { display: 'none' }}>
        <ListsTab lists={lists} savedLists={savedLists} isOwner={isMe} userId={userId} />
      </View>
    </View>
  );
}
