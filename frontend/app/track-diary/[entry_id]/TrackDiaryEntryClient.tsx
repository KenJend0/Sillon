'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { showToast } from '@/components/Toast';
import { UserAvatar } from '@/components/avatars/DefaultAvatar';
import BackButton from '@/components/BackButton';
import EditTrackDiaryEntryButton from '@/components/EditTrackDiaryEntryButton';
import {
  toggleTrackDiaryLike,
  addTrackComment,
  deleteTrackComment,
  getTrackEntryComments,
  type TrackDiaryEntryDetail,
  type TrackDiaryComment,
} from '@/app/actions/track-diary';

interface Props {
  entry: TrackDiaryEntryDetail;
  currentUser: { id: string; email?: string } | null;
}

export default function TrackDiaryEntryClient({ entry, currentUser }: Props) {
  const router = useRouter();
  const isAuthor = currentUser?.id === entry.author.id;

  const [hasLiked, setHasLiked] = useState(entry.has_liked);
  const [likesCount, setLikesCount] = useState(entry.stats.likes_count);
  const [comments, setComments] = useState<TrackDiaryComment[]>(entry.comments);
  const [newComment, setNewComment] = useState('');
  const [liking, setLiking] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ parentCommentId: string; mentionUsername: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleLike = async () => {
    if (!currentUser) { showToast('Connecte-toi pour aimer cette entrée', 'error'); return; }
    if (liking) return;
    const prevLiked = hasLiked;
    const prevCount = likesCount;
    setHasLiked(!prevLiked);
    setLikesCount(!prevLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
    setLiking(true);
    try {
      await toggleTrackDiaryLike(entry.id);
    } catch {
      setHasLiked(prevLiked);
      setLikesCount(prevCount);
      showToast("Impossible d'aimer cette entrée", 'error');
    } finally {
      setLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser) { showToast('Connecte-toi pour commenter', 'error'); return; }
    if (posting || !newComment.trim()) return;
    setPosting(true);
    try {
      await addTrackComment(entry.id, newComment.trim());
      setNewComment('');
      const fresh = await getTrackEntryComments(entry.id);
      setComments(fresh);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Impossible d\'ajouter le commentaire', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleAddReply = async () => {
    if (!currentUser || !replyingTo || posting || !replyText.trim()) return;
    setPosting(true);
    try {
      await addTrackComment(entry.id, replyText.trim(), replyingTo.parentCommentId);
      setReplyText('');
      setReplyingTo(null);
      setExpandedReplies((prev) => new Set([...prev, replyingTo.parentCommentId]));
      const fresh = await getTrackEntryComments(entry.id);
      setComments(fresh);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Impossible d\'ajouter la réponse', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteTrackComment(commentId);
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId).map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) }))
      );
    } catch {
      showToast('Impossible de supprimer le commentaire', 'error');
    }
  };

  return (
    <div className="max-w-page mx-auto px-4 py-6">
      <BackButton />

      {/* Header : cover 100px + titre/artiste */}
      <div className="flex gap-6 mb-6 mt-4">
        {entry.album.cover_url ? (
          <Link href={`/albums/${entry.album.id}`} className="flex-shrink-0">
            <Image src={entry.album.cover_url} alt={entry.album.title} width={100} height={100} className="rounded-[10px]" />
          </Link>
        ) : (
          <div className="w-[100px] h-[100px] bg-background-secondary rounded-[10px] flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center mt-2">
          <Link href={`/tracks/${entry.track.id}`} className="text-h2 hover:text-text-secondary transition-colors block mb-2 text-text-primary">
            {entry.track.title}
          </Link>
          <div className="text-body text-text-secondary">
            <Link href={`/artists/${entry.artist.id}`} className="hover:text-text-primary transition-colors">{entry.artist.name}</Link>
          </div>
          <div className="text-label text-text-tertiary mt-1">
            <Link href={`/albums/${entry.album.id}`} className="hover:text-text-secondary transition-colors">{entry.album.title}</Link>
            {entry.album.release_date && <span>{` · ${new Date(entry.album.release_date).getFullYear()}`}</span>}
          </div>
        </div>
      </div>

      <div className="border-b border-border my-6" />

      {/* Auteur + date */}
      <div className="flex items-start gap-3 mb-6">
        <Link href={`/u/${entry.author.username}`}>
          <UserAvatar userId={entry.author.id} src={entry.author.avatar_url} size={48} />
        </Link>
        <div className="flex-1">
          <p className="text-meta text-text-secondary">
            Une écoute de{' '}
            <Link href={`/u/${entry.author.username}`} className="font-medium hover:text-text-primary transition-colors">
              {entry.author.username}
            </Link>
          </p>
          <p className="text-label text-text-tertiary mt-1">{formatDate(entry.listened_at)}</p>
        </div>
        {isAuthor && (
          <div className="flex-shrink-0">
            <EditTrackDiaryEntryButton
              entryId={entry.id}
              trackId={entry.track.id}
              albumId={entry.album.id}
              artistId={entry.artist.id}
              currentRating={entry.rating}
              currentReview={entry.review_body}
              currentListenedAt={entry.listened_at}
            />
          </div>
        )}
      </div>

      {/* Note */}
      {entry.rating !== null && (
        <div className="mt-6">
          <div className="text-label uppercase text-text-secondary mb-2">Note</div>
          <p className="text-body text-text-primary">{entry.rating} / 10</p>
        </div>
      )}

      {/* Review */}
      {(entry.review_title || entry.review_body) && (
        <div className="mt-6">
          {entry.review_title && <h2 className="text-[14px] font-medium text-text-primary mb-3">{entry.review_title}</h2>}
          {entry.review_body && (
            <p className="text-[14px] text-text-primary whitespace-pre-wrap leading-[1.7] italic">
              {`« ${entry.review_body.trim()}`}<span className="whitespace-nowrap">{' »'}</span>
            </p>
          )}
        </div>
      )}

      {/* Like + commentaires */}
      <div className="flex items-center gap-6 mt-8">
        <div className="flex items-center gap-2">
          {currentUser ? (
            <button onClick={handleLike} disabled={liking} className="text-text-tertiary hover:text-[#C86C6C] transition-colors disabled:opacity-50">
              <Heart size={18} fill={hasLiked ? 'currentColor' : 'none'} className={hasLiked ? 'text-[#C86C6C]' : ''} />
            </button>
          ) : (
            <Heart size={18} className="text-text-tertiary" />
          )}
          <span className="text-label text-text-tertiary">{likesCount}</span>
          <span className="text-label text-text-disabled">j'aime{likesCount > 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-text-tertiary">
          <MessageCircle size={18} />
          <span className="text-label">{comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)}</span>
        </div>
        <div className="ml-auto">
          <ShareButton entryId={entry.id} basePath="track-diary" />
        </div>
      </div>

      <div className="mt-6">
        <Link href={`/tracks/${entry.track.id}`} className="text-meta text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1">
          Voir toutes les critiques de ce titre →
        </Link>
      </div>

      {/* Réponses */}
      <section className="border-t border-border pt-8 mt-8 mb-20">
        <h3 className="text-label font-medium text-text-primary uppercase mb-6">Réponses</h3>

        {currentUser ? (
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter quelques mots…"
              className="flex-1 bg-background-secondary border border-border rounded-[10px] px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#8E6F5E]"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
            />
            <button
              onClick={handleAddComment}
              disabled={posting || !newComment.trim()}
              className="px-4 py-2 border border-border text-text-primary hover:bg-[#1C1C1C] hover:text-[#F5F3EF] disabled:bg-background-secondary disabled:text-text-disabled disabled:border-border rounded-[8px] text-meta font-medium transition-colors"
            >
              Envoyer
            </button>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-background-secondary rounded-[10px] border border-border">
            <p className="text-meta text-text-secondary">
              <Link href="/auth/signin" className="text-text-primary hover:text-[#8E6F5E] font-medium transition-colors">Connectez-vous</Link>
              {' '}pour liker et commenter cette écoute.
            </p>
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-text-tertiary text-meta">Personne n'a encore répondu.</p>
        ) : (
          <div className="space-y-5">
            {comments.map((comment) => {
              const replies = comment.replies ?? [];
              const isExpanded = expandedReplies.has(comment.id);
              const isReplyingHere = replyingTo?.parentCommentId === comment.id;

              return (
                <div key={comment.id}>
                  <div className="flex gap-3 group">
                    <Link href={`/u/${comment.author.username}`}>
                      <UserAvatar userId={comment.author.id} src={comment.author.avatar_url} size={32} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 text-meta">
                        <Link href={`/u/${comment.author.username}`} className="font-medium text-text-primary hover:text-text-secondary transition-colors">
                          {comment.author.username}
                        </Link>
                        <span className="text-label text-text-tertiary flex-1">{formatDate(comment.created_at)}</span>
                        {comment.is_mine && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-text-tertiary hover:text-text-primary transition-colors" title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-[14px] text-text-primary leading-[1.7] mt-2">{comment.body}</p>
                      {currentUser && (
                        <button
                          onClick={() => isReplyingHere ? setReplyingTo(null) : setReplyingTo({ parentCommentId: comment.id, mentionUsername: comment.author.username })}
                          className="mt-2 text-label text-text-tertiary hover:text-text-primary transition-colors"
                        >
                          {isReplyingHere ? 'Annuler' : 'Répondre'}
                        </button>
                      )}
                    </div>
                  </div>

                  {replies.length > 0 && (
                    <button
                      onClick={() => setExpandedReplies((prev) => { const next = new Set(prev); next.has(comment.id) ? next.delete(comment.id) : next.add(comment.id); return next; })}
                      className="mt-2 ml-11 text-label text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-1"
                    >
                      <span style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                      {isExpanded ? 'Masquer les réponses' : `${replies.length} réponse${replies.length > 1 ? 's' : ''}`}
                    </button>
                  )}

                  {isExpanded && replies.length > 0 && (
                    <div className="mt-2 ml-11 space-y-4 border-l border-border pl-4">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Link href={`/u/${reply.author.username}`}>
                            <UserAvatar userId={reply.author.id} src={reply.author.avatar_url} size={26} />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 text-meta">
                              <Link href={`/u/${reply.author.username}`} className="font-medium text-text-primary hover:text-text-secondary transition-colors">{reply.author.username}</Link>
                              <span className="text-label text-text-tertiary flex-1">{formatDate(reply.created_at)}</span>
                              {reply.is_mine && (
                                <button onClick={() => handleDeleteComment(reply.id)} className="text-text-tertiary hover:text-text-primary" title="Supprimer"><Trash2 size={13} /></button>
                              )}
                            </div>
                            <p className="text-[13px] text-text-primary leading-[1.7] mt-1">{reply.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isReplyingHere && (
                    <div className="flex gap-2 mt-3 ml-11">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Répondre à @${replyingTo.mentionUsername}…`}
                        autoFocus
                        className="flex-1 bg-background-secondary border border-border rounded-[10px] px-3 py-2 text-[13px] text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#8E6F5E]"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddReply(); } if (e.key === 'Escape') { setReplyingTo(null); setReplyText(''); } }}
                      />
                      <button
                        onClick={handleAddReply}
                        disabled={posting || !replyText.trim()}
                        className="px-3 py-2 border border-border text-text-primary hover:bg-[#1C1C1C] hover:text-[#F5F3EF] disabled:bg-background-secondary disabled:text-text-disabled disabled:border-border rounded-[8px] text-label font-medium transition-colors"
                      >
                        Envoyer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
