import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { showToast } from '../ui/Toast';
import { deleteDiaryEntry } from '../../lib/diary';
import { metaStyle, metaMediumStyle, labelStyle } from '../../lib/typography';

type Props = {
  entryId: string;
  onEdit: () => void;
  onDeleted: () => void;
};

/** Miroir simplifié de AlbumEntryMenu (web) — options "Modifier"/"Supprimer" dans un BottomSheet plutôt qu'un dropdown. */
export function AlbumEntryMenu({ entryId, onEdit, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteDiaryEntry(entryId);
      if (!result.success) {
        showToast(result.error || 'Erreur lors de la suppression', 'error');
        return;
      }
      showToast('Écoute supprimée', 'success');
      setConfirmDelete(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} className="p-1.5">
        <MoreHorizontal size={16} color="#9A9A9A" />
      </Pressable>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Options" snapPoint="30%">
        <View className="px-6 py-2">
          <Pressable
            onPress={() => { setOpen(false); onEdit(); }}
            className="flex-row items-center gap-2.5 py-3 border-b border-border-divider"
          >
            <Edit2 size={15} color="#6B6B6B" />
            <Text className="text-text-primary" style={metaStyle}>Modifier</Text>
          </Pressable>
          <Pressable
            onPress={() => { setOpen(false); setConfirmDelete(true); }}
            className="flex-row items-center gap-2.5 py-3"
          >
            <Trash2 size={15} color="#C86C6C" />
            <Text className="text-[#C86C6C]" style={metaStyle}>Supprimer</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer ?" snapPoint="25%">
        <View className="px-6 py-4">
          <Text className="text-text-secondary mb-5" style={labelStyle}>Cette action ne peut pas être annulée.</Text>
          <View className="flex-row gap-2">
            <Pressable onPress={() => setConfirmDelete(false)} className="flex-1 bg-background-secondary rounded-button py-2.5 items-center">
              <Text className="text-text-primary" style={metaStyle}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={deleting}
              className="flex-1 bg-[#C86C6C] rounded-button py-2.5 items-center"
              style={{ opacity: deleting ? 0.5 : 1 }}
            >
              <Text className="text-[#F5F3EF]" style={metaMediumStyle}>Supprimer</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
