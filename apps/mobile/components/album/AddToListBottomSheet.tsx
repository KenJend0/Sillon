import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { showToast } from '../ui/Toast';
import { toggleListItem, type UserListSummary } from '../../lib/lists';
import { smStyle } from '../../lib/typography';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Exactement l'un des deux — album OU titre. */
  albumId?: string;
  trackId?: string;
  userLists: UserListSummary[];
  listsContaining: string[];
  onChanged: (listsContaining: string[]) => void;
};

/** Miroir simplifié de AddToListButton (web) — pas de création de liste depuis cette bottom sheet (Phase 7). */
export function AddToListBottomSheet({ isOpen, onClose, albumId, trackId, userLists, listsContaining, onChanged }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  async function handleToggle(listId: string) {
    if (pending) return;
    setPending(listId);
    try {
      const { added } = await toggleListItem(listId, { albumId, trackId });
      const next = added ? [...listsContaining, listId] : listsContaining.filter((id) => id !== listId);
      onChanged(next);
      showToast(added ? 'Ajouté' : 'Retiré', 'success');
    } catch {
      showToast('Une erreur est survenue', 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Ajouter à une liste" snapPoint="45%">
      <View className="px-2 py-1">
        {userLists.length === 0 ? (
          <Text className="text-text-tertiary py-6 px-4" style={smStyle}>Aucune liste pour le moment.</Text>
        ) : (
          userLists.map((list) => {
            const checked = listsContaining.includes(list.id);
            return (
              <Pressable
                key={list.id}
                onPress={() => handleToggle(list.id)}
                disabled={pending === list.id}
                className="flex-row items-center gap-3 px-4 py-2.5"
                style={{ opacity: pending === list.id ? 0.5 : 1 }}
              >
                <View
                  className={`w-4 h-4 rounded items-center justify-center border ${
                    checked ? 'bg-text-primary border-text-primary' : 'border-border-divider'
                  }`}
                >
                  {checked && <Check size={10} color="#F5F3EF" strokeWidth={2.5} />}
                </View>
                <Text className="text-text-primary flex-1" style={smStyle} numberOfLines={1}>
                  {list.title}
                </Text>
                {list.is_default && (
                  <Text className="text-[10px] text-text-tertiary" style={{ fontFamily: 'Inter_400Regular' }}>
                    par défaut
                  </Text>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </BottomSheet>
  );
}
