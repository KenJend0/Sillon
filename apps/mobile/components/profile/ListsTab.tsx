import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ListCard } from './ListCard';
import type { ProfileListUI } from '../../lib/lists';
import { labelStyle, metaMediumStyle } from '../../lib/typography';

type Props = {
  lists: ProfileListUI[];
  savedLists?: ProfileListUI[];
  isOwner: boolean;
};

type ListFilter = 'mine' | 'saved' | 'all';

/**
 * Miroir simplifié de ListsTab (web) — grille en lecture seule + filtre Tout/Mes
 * listes/Sauvegardées quand le propriétaire a des listes sauvegardées (comme le web).
 * Créer une liste, renommer, changer la visibilité et supprimer
 * (CreateListForm/ListCardWithMenu côté web) restent Phase 7.
 */
export function ListsTab({ lists, savedLists = [], isOwner }: Props) {
  const [filter, setFilter] = useState<ListFilter>('all');
  const showFilter = isOwner && savedLists.length > 0;

  const displayed = !showFilter
    ? lists
    : filter === 'mine'
      ? lists
      : filter === 'saved'
        ? savedLists
        : [...lists, ...savedLists];

  return (
    <View>
      {showFilter && (
        <View className="flex-row gap-1.5 mb-5">
          {([
            ['all', 'Tout'],
            ['mine', 'Mes listes'],
            ['saved', 'Sauvegardées'],
          ] as const).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setFilter(id)}
              className={`px-3 py-1 rounded-full ${filter === id ? 'bg-text-primary' : 'bg-background-secondary'}`}
            >
              <Text className={filter === id ? 'text-white' : 'text-text-secondary'} style={labelStyle}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {displayed.length === 0 ? (
        <View className="py-8 items-center">
          <Text className="text-text-secondary" style={metaMediumStyle}>
            {!isOwner ? 'Aucune liste publique.' : filter === 'saved' ? 'Aucune liste sauvegardée.' : "Tu n'as pas encore de listes."}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-between" style={{ rowGap: 20 }}>
          {displayed.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </View>
      )}
    </View>
  );
}
