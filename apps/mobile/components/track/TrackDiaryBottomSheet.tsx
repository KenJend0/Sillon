import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { StarRating } from '../ui/StarRating';
import { showToast } from '../ui/Toast';
import { upsertTrackDiaryEntry, type MyTrackDiaryEntry } from '../../lib/trackDiary';
import { metaStyle, metaMediumStyle } from '../../lib/typography';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  albumId: string;
  artistId: string;
  /** Entrée existante à modifier — omis pour une nouvelle écoute/ré-écoute. */
  editingEntry?: MyTrackDiaryEntry;
  hasExistingEntry?: boolean;
  onSaved: () => void;
};

/**
 * Formulaire noter/écrire une écoute de titre — fusion de TrackDiaryInline +
 * EditTrackDiaryEntryButton (web), même pattern que DiaryEntryBottomSheet (albums). Le
 * web réutilise upsertTrackDiaryEntry pour l'édition aussi (onConflict sur la même
 * date) — ce composant fait pareil : en édition on renvoie la date existante.
 */
export function TrackDiaryBottomSheet({ isOpen, onClose, trackId, albumId, artistId, editingEntry, hasExistingEntry, onSaved }: Props) {
  const [rating, setRating] = useState<number | null>(editingEntry?.rating ?? null);
  const [body, setBody] = useState(editingEntry?.review_body ?? '');
  const [saving, setSaving] = useState(false);
  const isEdit = !!editingEntry;

  useEffect(() => {
    if (isOpen) {
      setRating(editingEntry?.rating ?? null);
      setBody(editingEntry?.review_body ?? '');
    }
  }, [isOpen, editingEntry]);

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);
    try {
      const result = await upsertTrackDiaryEntry({
        trackId,
        albumId,
        artistId,
        listenedAt: isEdit ? editingEntry.listened_at : today,
        rating: rating ?? 0,
        reviewBody: body || undefined,
      });
      if (!result.success) {
        showToast(result.error || 'Erreur lors de l\'enregistrement', 'error');
        return;
      }
      showToast(isEdit ? 'Mis à jour !' : 'Enregistré !', 'success');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifier ma note' : hasExistingEntry ? 'Enregistrer une ré-écoute' : 'Noter ce titre'}
      snapPoint="65%"
    >
      <View className="px-6 py-4" style={{ gap: 20 }}>
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-secondary" style={metaStyle}>Note</Text>
            <Text className="text-text-primary" style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19.5 }}>
              {rating ?? 0} / 10
            </Text>
          </View>
          <StarRating value={rating} onChange={setRating} />
        </View>

        <View>
          <Text className="text-text-secondary mb-2" style={metaStyle}>Quelques mots</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Ce que tu as ressenti, si tu en as envie."
            placeholderTextColor="#9A9A9A"
            multiline
            numberOfLines={4}
            className="bg-background-secondary border border-border rounded-input px-4 py-3 text-text-primary"
            style={{ height: 96, textAlignVertical: 'top', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 }}
          />
        </View>

        <View className="flex-row gap-2 pb-4">
          <Pressable onPress={onClose} className="flex-1 bg-background-secondary rounded-button py-2.5 items-center">
            <Text className="text-text-primary" style={metaStyle}>Annuler</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={saving}
            className="flex-1 bg-[#1C1C1C] rounded-button py-2.5 items-center"
            style={{ opacity: saving ? 0.5 : 1 }}
          >
            <Text className="text-[#F5F3EF]" style={metaMediumStyle}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
