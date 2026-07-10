import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, MoreHorizontal, Pencil, Trash2, ArrowUpDown, Check, Plus } from 'lucide-react-native';
import { BackButton } from '../../components/ui/BackButton';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ListCoverCollage } from '../../components/lists/ListCoverCollage';
import { ListItemCard } from '../../components/lists/ListItemCard';
import { ListItemReorderRow } from '../../components/lists/ListItemReorderRow';
import { EditListBottomSheet } from '../../components/lists/EditListBottomSheet';
import { AddListItemsBottomSheet } from '../../components/lists/AddListItemsBottomSheet';
import { showToast } from '../../components/ui/Toast';
import { useAuth } from '../../lib/AuthContext';
import { useListSave } from '../../lib/useListSave';
import { getListWithItems, removeListItem, deleteList, reorderListItems, type ListDetail, type ListItem } from '../../lib/lists';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { h2Style, smStyle, metaStyle, labelStyle } from '../../lib/typography';

type Tab = 'tous' | 'albums' | 'titres';

/**
 * Miroir mobile de /lists/[id] (web, ListPageContent.tsx) — header (cover collage, titre,
 * badge privée, bookmark OU menu propriétaire), description, filtre Tous/Albums/Titres,
 * grille d'items avec retrait (propriétaire), ajout inline (albums/titres), édition et
 * suppression. Deux différences de scope assumées (voir docs/MOBILE_ROADMAP.md) :
 * - pas de cover personnalisée (upload nécessite sharp + service_role, hors mobile) ;
 * - réorganisation à flèches haut/bas au lieu d'un drag-and-drop (@dnd-kit est DOM-only,
 *   aucune lib de drag n'est installée côté mobile).
 */
export default function ListDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [list, setList] = useState<ListDetail | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('tous');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const result = await getListWithItems(id);
    if (!result) {
      setNotFound(true);
    } else {
      setList(result.list);
      setItems(result.items);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const { refreshControl } = usePullToRefresh(load);
  const { saved, toggleSave } = useListSave(
    list ? { id: list.id, user_id: list.user_id, is_public: list.is_public, is_saved: list.is_saved } : { id: '', user_id: '', is_public: false }
  );

  const isOwner = !!user && !!list && user.id === list.user_id;

  async function handleRemove(itemId: string) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== itemId));
    try {
      await removeListItem(itemId);
    } catch (err) {
      setItems(prev);
      showToast(err instanceof Error ? err.message : 'Erreur lors de la suppression', 'error');
    }
  }

  async function handleDeleteList() {
    if (!list) return;
    setDeleting(true);
    try {
      await deleteList(list.id);
      showToast('Liste supprimée', 'success');
      router.back();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la suppression', 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function persistOrder(next: ListItem[]) {
    if (!list) return;
    const prev = items;
    setItems(next);
    setSavingOrder(true);
    try {
      await reorderListItems(list.id, next.map((i) => i.id));
    } catch (err) {
      setItems(prev);
      showToast(err instanceof Error ? err.message : 'Erreur lors de la réorganisation', 'error');
    } finally {
      setSavingOrder(false);
    }
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (notFound || !list) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-text-primary mb-2" style={h2Style}>Liste introuvable</Text>
        <Text className="text-text-secondary text-center mb-6" style={metaStyle}>
          Cette liste n'existe pas, a été supprimée, ou est privée.
        </Text>
        <BackButton />
      </View>
    );
  }

  const albumItems = items.filter((i) => i.album_id && i.album);
  const trackItems = items.filter((i) => i.track_id && i.track);
  const showFilter = albumItems.length > 0 && trackItems.length > 0;
  const displayed = tab === 'albums' ? albumItems : tab === 'titres' ? trackItems : items;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }} refreshControl={refreshControl}>
        <View style={{ paddingTop: 16 }}>
          <BackButton />
        </View>

        <View className="mt-4 mb-6">
          <View className="flex-row items-start gap-4">
            <ListCoverCollage urls={list.cover_urls} size={84} />

            <View className="flex-1 min-w-0">
              <View className="flex-row items-start justify-between gap-2">
                <Text numberOfLines={2} className="flex-1 text-text-primary" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, lineHeight: 28 }}>
                  {list.title}
                </Text>
                <View className="flex-row items-center gap-2 flex-shrink-0">
                  {!list.is_public && (
                    <View className="border border-border rounded-full px-2 py-0.5">
                      <Text className="text-text-tertiary" style={{ fontFamily: 'Inter_400Regular', fontSize: 11 }}>Privée</Text>
                    </View>
                  )}
                  {isOwner && reordering && (
                    <Pressable
                      onPress={() => setReordering(false)}
                      disabled={savingOrder}
                      className="w-7 h-7 rounded-full items-center justify-center bg-accent-deep"
                      style={{ opacity: savingOrder ? 0.5 : 1 }}
                    >
                      <Check size={14} color="#F5F3EF" />
                    </Pressable>
                  )}
                  {!isOwner && list.is_public && (
                    <Pressable
                      onPress={toggleSave}
                      hitSlop={8}
                      className="w-9 h-9 rounded-full items-center justify-center"
                      style={{ backgroundColor: saved ? 'rgba(142,111,94,0.1)' : 'transparent' }}
                    >
                      <Bookmark size={17} color={saved ? '#8E6F5E' : '#9A9A9A'} fill={saved ? '#8E6F5E' : 'transparent'} />
                    </Pressable>
                  )}
                  {isOwner && !reordering && (
                    <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} className="w-7 h-7 rounded-full items-center justify-center">
                      <MoreHorizontal size={16} color="#6B6B6B" />
                    </Pressable>
                  )}
                </View>
              </View>

              <Text className="text-text-secondary mt-0.5" style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}>
                @{list.creator_username}
              </Text>
              <Text className="text-text-tertiary mt-1" style={labelStyle}>
                {list.item_count} {list.item_count === 1 ? 'item' : 'items'} · {list.saves_count} {list.saves_count === 1 ? 'sauvegarde' : 'sauvegardes'}
              </Text>
            </View>
          </View>

          {!!list.description && (
            <Text className="text-text-secondary mt-3" style={metaStyle}>{list.description}</Text>
          )}
        </View>

        {isOwner && !reordering && (
          <Pressable onPress={() => setAddOpen(true)} className="flex-row items-center gap-1.5 self-start px-3.5 py-1.5 rounded-full bg-background-secondary mb-4">
            <Plus size={13} color="#6B6B6B" />
            <Text className="text-text-secondary" style={{ fontFamily: 'Inter_500Medium', fontSize: 13 }}>Ajouter</Text>
          </Pressable>
        )}

        {reordering && (
          <Text className="text-text-tertiary mb-3" style={labelStyle}>
            Utilise les flèches pour réordonner, puis valide avec ✓.
          </Text>
        )}

        {!reordering && showFilter && displayed.length > 0 && (
          <View className="flex-row gap-1.5 mb-5">
            {(['tous', 'albums', 'titres'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`px-3 py-1 rounded-full ${tab === t ? 'bg-text-primary' : 'bg-background-secondary'}`}
              >
                <Text className={tab === t ? 'text-background' : 'text-text-secondary'} style={{ fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'capitalize' }}>
                  {t === 'tous' ? 'Tout' : t === 'albums' ? 'Albums' : 'Titres'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {displayed.length === 0 ? (
          <Text className="text-text-tertiary" style={smStyle}>Cette liste est vide.</Text>
        ) : reordering ? (
          <View style={{ gap: 8 }}>
            {items.map((item, index) => (
              <ListItemReorderRow
                key={item.id}
                item={item}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onMoveUp={() => moveItem(index, -1)}
                onMoveDown={() => moveItem(index, 1)}
              />
            ))}
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between" style={{ rowGap: 20 }}>
            {displayed.map((item) => (
              <ListItemCard key={item.id} item={item} onRemove={isOwner ? () => handleRemove(item.id) : undefined} />
            ))}
          </View>
        )}
      </ScrollView>

      {isOwner && (
        <>
          <AddListItemsBottomSheet isOpen={addOpen} onClose={() => setAddOpen(false)} listId={list.id} onAdded={load} />
          <EditListBottomSheet
            list={list}
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            onSaved={(updates) => setList((prev) => (prev ? { ...prev, ...updates } : prev))}
          />

          <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title={list.title} snapPoint="32%">
            <View className="px-6 py-2">
              {items.length > 1 && (
                <Pressable
                  onPress={() => { setMenuOpen(false); setReordering(true); }}
                  className="flex-row items-center gap-2.5 py-3 border-b border-border-divider"
                >
                  <ArrowUpDown size={15} color="#6B6B6B" />
                  <Text className="text-text-primary" style={metaStyle}>Réorganiser</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => { setMenuOpen(false); setEditOpen(true); }}
                className="flex-row items-center gap-2.5 py-3 border-b border-border-divider"
              >
                <Pencil size={15} color="#6B6B6B" />
                <Text className="text-text-primary" style={metaStyle}>Infos</Text>
              </Pressable>
              {!list.is_default && (
                <Pressable
                  onPress={() => { setMenuOpen(false); setConfirmDelete(true); }}
                  className="flex-row items-center gap-2.5 py-3"
                >
                  <Trash2 size={15} color="#C86C6C" />
                  <Text className="text-[#C86C6C]" style={metaStyle}>Supprimer la liste</Text>
                </Pressable>
              )}
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
                  onPress={handleDeleteList}
                  disabled={deleting}
                  className="flex-1 bg-[#C86C6C] rounded-button py-2.5 items-center"
                  style={{ opacity: deleting ? 0.5 : 1 }}
                >
                  <Text className="text-[#F5F3EF]" style={{ fontFamily: 'Inter_500Medium', fontSize: 14 }}>
                    {deleting ? 'Suppression…' : 'Supprimer'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </BottomSheet>
        </>
      )}
    </View>
  );
}
