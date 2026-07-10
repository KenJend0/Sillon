import { useEffect, useState } from 'react';
import { toggleSaveList } from './lists';
import { useAuth } from './AuthContext';
import { showToast } from '../components/ui/Toast';

/**
 * Miroir de useListSave (web) — état optimiste du bouton bookmark, mais sans
 * e.preventDefault()/stopPropagation() (pas de <Link> imbriqué côté RN : le bouton
 * est un Pressable frère du Pressable de navigation de la carte, pas un enfant).
 */
export function useListSave(list: { id: string; user_id: string; is_public: boolean; is_saved?: boolean }) {
  const { user: authUser } = useAuth();
  const [saved, setSaved] = useState(!!list.is_saved);
  const [saveLoading, setSaveLoading] = useState(false);

  // useState ne relit sa valeur initiale qu'au montage — sur /lists/[id], le hook est
  // monté pendant que `list` vaut encore le fallback (chargement en cours, is_saved
  // indéfini) puis `list` est remplacé par les vraies données une fois getListWithItems
  // résolu, sans jamais remonter ce composant. Sans cet effet, le bouton restait bloqué
  // sur l'état du tout premier rendu (toujours "non sauvegardé") même quand la liste
  // l'était réellement.
  useEffect(() => {
    setSaved(!!list.is_saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id, list.is_saved]);
  const isOwnList = authUser?.id === list.user_id;
  const canSave = list.is_public && !isOwnList;

  async function toggleSave() {
    if (!authUser) {
      showToast('Connecte-toi pour sauvegarder une liste', 'error');
      return;
    }
    if (saveLoading) return;
    setSaveLoading(true);
    setSaved((v) => !v);
    try {
      await toggleSaveList(list.id);
    } catch (err) {
      setSaved((v) => !v);
      showToast(err instanceof Error ? err.message : 'Impossible de sauvegarder cette liste', 'error');
    } finally {
      setSaveLoading(false);
    }
  }

  return { saved, isOwnList, canSave, toggleSave };
}
