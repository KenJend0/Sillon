import { useRef, useState, type RefObject } from 'react';
import { findNodeHandle, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, Trash2, CornerDownLeft } from 'lucide-react-native';
import { Avatar } from '../avatars/Avatar';
import { showToast } from '../ui/Toast';
import { metaStyle, metaMediumStyle, labelStyle, h2Style } from '../../lib/typography';

export type ThreadComment = {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; username: string; avatar_url: string | null };
  is_mine: boolean;
  replies: ThreadComment[];
};

type Props = {
  comments: ThreadComment[];
  currentUserId: string | null;
  /** true si l'utilisateur courant est l'auteur de l'écoute — masque le composeur de premier niveau, comme le web. */
  isAuthor: boolean;
  composerAvatarUrl: string | null;
  onAddComment: (body: string) => Promise<void>;
  onAddReply: (parentCommentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReport: (commentId: string) => Promise<void>;
  /** ScrollView parente (la page /diary ou /track-diary, qui affiche ce fil inline plutôt
   * qu'en bottom sheet) — permet de remonter le TextInput au-dessus du clavier au focus. */
  scrollViewRef?: RefObject<ScrollView | null>;
};

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/**
 * Fil de commentaires avec réponses imbriquées (1 niveau) — miroir de la section
 * "Réponses" de DiaryEntryClient/TrackDiaryEntryClient (web), partagé entre
 * /diary/[entry_id] et /track-diary/[entry_id]. Le web affiche ça inline dans la page
 * (pas un bottom sheet) — même choix ici.
 */
export function CommentThread({
  comments,
  currentUserId,
  isAuthor,
  composerAvatarUrl,
  onAddComment,
  onAddReply,
  onDelete,
  onReport,
  scrollViewRef,
}: Props) {
  const router = useRouter();
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ parentCommentId: string; mentionUsername: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const composerInputRef = useRef<TextInput>(null);
  const replyInputRef = useRef<TextInput>(null);

  // Remonte le TextInput focus au-dessus du clavier — nécessaire ici car le composeur est
  // inline dans la ScrollView de la page (pas un bottom sheet), qui ne se recale pas seule
  // quand le clavier apparaît. scrollResponderScrollNativeHandleToKeyboard est l'API RN
  // dédiée à ce calcul (même primitive qu'utilise KeyboardAvoidingView en interne).
  const scrollInputAboveKeyboard = (inputRef: RefObject<TextInput | null>) => {
    const scrollView = scrollViewRef?.current;
    const input = inputRef.current;
    if (!scrollView || !input) return;
    const nodeHandle = findNodeHandle(input);
    if (!nodeHandle) return;
    setTimeout(() => {
      // API interne RN (non exportée publiquement dans les types, mais stable) — même
      // primitive qu'utilise KeyboardAvoidingView pour ce calcul.
      (scrollView.getScrollResponder?.() as any)?.scrollResponderScrollNativeHandleToKeyboard(nodeHandle, 80, true);
    }, 50);
  };

  const totalComments = comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  const toggleExpand = (commentId: string) =>
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });

  const openReplyForm = (commentId: string, mentionUsername: string, expand = false) => {
    if (expand) setExpandedReplies((prev) => new Set([...prev, commentId]));
    setReplyingTo({ parentCommentId: commentId, mentionUsername });
    setReplyText('');
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Impossible d'ajouter le commentaire", 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleAddReply = async () => {
    if (!replyingTo || !replyText.trim() || posting) return;
    const { parentCommentId } = replyingTo;
    setPosting(true);
    try {
      await onAddReply(parentCommentId, replyText.trim());
      setReplyText('');
      setReplyingTo(null);
      setExpandedReplies((prev) => new Set([...prev, parentCommentId]));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Impossible d'ajouter la réponse", 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await onDelete(commentId);
    } catch {
      showToast('Impossible de supprimer le commentaire', 'error');
    }
  };

  const handleReport = async (commentId: string) => {
    try {
      await onReport(commentId);
      showToast('Commentaire signalé', 'success');
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <View className="mt-7 mb-6">
      <View className="flex-row items-baseline gap-2 mb-4">
        <Text className="text-text-warm" style={h2Style}>Réponses</Text>
        <Text className="text-accent" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 15 }}>
          · {totalComments}
        </Text>
        <View className="flex-1 h-px bg-rule ml-1.5" style={{ opacity: 0.7 }} />
      </View>

      {currentUserId && !isAuthor && (
        <View className="bg-paper-hi border border-border rounded-card p-3 mb-4">
          <View className="flex-row gap-2.5 items-start">
            <Avatar src={composerAvatarUrl} size={28} />
            <TextInput
              ref={composerInputRef}
              value={newComment}
              onChangeText={setNewComment}
              onFocus={() => scrollInputAboveKeyboard(composerInputRef)}
              placeholder="Ajouter quelques mots…"
              placeholderTextColor="#9A9A9A"
              multiline
              className="flex-1 text-text-primary"
              style={[metaStyle, { paddingTop: 2 }]}
            />
          </View>
          <View className="flex-row justify-end mt-2.5">
            <Pressable
              onPress={handleAddComment}
              disabled={posting || !newComment.trim()}
              className="px-4 py-1.5 rounded-pill border border-accent"
              style={{ opacity: !newComment.trim() ? 0.5 : 1 }}
            >
              <Text className="text-accent" style={metaMediumStyle}>Envoyer</Text>
            </Pressable>
          </View>
        </View>
      )}

      {comments.length === 0 ? (
        <Text className="text-text-tertiary" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 15 }}>
          Personne n&apos;a encore répondu.
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {comments.map((comment) => {
            const isExpanded = expandedReplies.has(comment.id);
            const isReplyingHere = replyingTo?.parentCommentId === comment.id;

            return (
              <View key={comment.id}>
                <View className={`flex-row gap-2.5 p-3 rounded-card border border-border ${comment.is_mine ? 'bg-background-secondary' : 'bg-paper-hi'}`}>
                  <Pressable onPress={() => router.push(`/u/${comment.author.username}` as any)}>
                    <Avatar src={comment.author.avatar_url} size={30} />
                  </Pressable>
                  <View className="flex-1">
                    <View className="flex-row items-baseline gap-1.5 flex-wrap">
                      <Pressable onPress={() => router.push(`/u/${comment.author.username}` as any)}>
                        <Text className="text-text-warm" style={metaMediumStyle}>{comment.author.username}</Text>
                      </Pressable>
                      <Text className="text-accent" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 13 }}>
                        · {shortDate(comment.created_at)}
                      </Text>
                      {comment.is_mine ? (
                        <Pressable onPress={() => handleDelete(comment.id)} hitSlop={8} className="ml-auto p-1">
                          <Trash2 size={12} color="#9A9A9A" />
                        </Pressable>
                      ) : currentUserId ? (
                        <Pressable onPress={() => handleReport(comment.id)} hitSlop={8} className="ml-auto p-1">
                          <Flag size={12} color="#9A9A9A" />
                        </Pressable>
                      ) : null}
                    </View>
                    <Text className="text-text-primary mt-1.5" style={metaStyle}>{comment.body}</Text>
                    {currentUserId && (
                      <Pressable
                        onPress={() => (isReplyingHere ? setReplyingTo(null) : openReplyForm(comment.id, comment.author.username))}
                        className="flex-row items-center gap-1.5 mt-2"
                        hitSlop={6}
                      >
                        <CornerDownLeft size={10} color="#8E6F5E" />
                        <Text className="text-accent" style={[labelStyle, { textTransform: 'none', letterSpacing: 0 }]}>
                          {isReplyingHere ? 'Annuler' : 'Répondre'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {comment.replies.length > 0 && (
                  <Pressable onPress={() => toggleExpand(comment.id)} className="flex-row items-center gap-2 mt-1.5 ml-9">
                    <View className="w-3.5 h-px bg-rule" />
                    <Text className="text-accent" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 13 }}>
                      {isExpanded ? 'Masquer les réponses' : `Lire ${comment.replies.length} réponse${comment.replies.length > 1 ? 's' : ''}`}
                    </Text>
                  </Pressable>
                )}

                {isExpanded && comment.replies.length > 0 && (
                  <View className="mt-1.5 ml-9 pl-3.5" style={{ gap: 8, borderLeftWidth: 1, borderLeftColor: '#C9C2B5' }}>
                    {comment.replies.map((reply) => (
                      <View
                        key={reply.id}
                        className={`flex-row gap-2 p-2.5 rounded-input border border-border ${reply.is_mine ? 'bg-background-secondary' : 'bg-paper-hi'}`}
                      >
                        <Pressable onPress={() => router.push(`/u/${reply.author.username}` as any)}>
                          <Avatar src={reply.author.avatar_url} size={26} />
                        </Pressable>
                        <View className="flex-1">
                          <View className="flex-row items-baseline gap-1.5 flex-wrap">
                            <Pressable onPress={() => router.push(`/u/${reply.author.username}` as any)}>
                              <Text className="text-text-warm" style={[metaMediumStyle, { fontSize: 12.5 }]}>{reply.author.username}</Text>
                            </Pressable>
                            <Text className="text-accent" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 12.5 }}>
                              · {shortDate(reply.created_at)}
                            </Text>
                            {reply.is_mine && (
                              <Pressable onPress={() => handleDelete(reply.id)} hitSlop={8} className="ml-auto p-1">
                                <Trash2 size={11} color="#9A9A9A" />
                              </Pressable>
                            )}
                          </View>
                          <Text className="text-text-primary mt-1" style={[metaStyle, { fontSize: 13 }]}>{reply.body}</Text>
                          {currentUserId && (
                            <Pressable
                              onPress={() => openReplyForm(comment.id, reply.author.username, true)}
                              className="flex-row items-center gap-1.5 mt-1.5"
                              hitSlop={6}
                            >
                              <CornerDownLeft size={9} color="#8E6F5E" />
                              <Text className="text-accent" style={[labelStyle, { fontSize: 11, textTransform: 'none', letterSpacing: 0 }]}>Répondre</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {isReplyingHere && (
                  <View className="flex-row gap-2 mt-2 ml-9">
                    <TextInput
                      ref={replyInputRef}
                      value={replyText}
                      onChangeText={setReplyText}
                      onFocus={() => scrollInputAboveKeyboard(replyInputRef)}
                      placeholder={`Répondre à @${replyingTo.mentionUsername}…`}
                      placeholderTextColor="#9A9A9A"
                      autoFocus
                      className="flex-1 bg-paper-hi border border-border rounded-input px-3 py-2 text-text-primary"
                      style={metaStyle}
                    />
                    <Pressable
                      onPress={handleAddReply}
                      disabled={posting || !replyText.trim()}
                      className="px-4 py-1.5 rounded-pill border border-accent items-center justify-center"
                      style={{ opacity: !replyText.trim() ? 0.5 : 1 }}
                    >
                      <Text className="text-accent" style={[metaMediumStyle, { fontSize: 12.5 }]}>Envoyer</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
