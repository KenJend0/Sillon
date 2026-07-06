import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CoverImage } from '../album/CoverImage';
import { RatingBadge } from '../ui/RatingBadge';
import { FeedActions } from '../feed/cards/FeedActions';
import { CommentSheet } from '../feed/CommentSheet';
import type { UnifiedReview } from '../../lib/diary';
import { useRatingFilter } from '../../lib/RatingFilterContext';
import { labelStyle, metaMediumStyle, smStyle } from '../../lib/typography';

type Props = {
  reviews: UnifiedReview[];
  currentUserId?: string;
};

/**
 * Miroir de ReviewsList (web) — cartes de critiques (album + titre unifiés), filtrables
 * par note via RatingFilterContext (piloté par l'histogramme du header). Le tap sur la
 * carte navigue vers /diary/[entry_id] ou /track-diary/[entry_id] (détail d'écoute + fil
 * de commentaires), comme le web. Like + accès rapide au commentaire restent portés par
 * FeedActions/CommentSheet (BottomSheet, déjà créés pour le feed) plutôt que de dupliquer
 * ce pattern — le web ouvre lui `${review.href}#comments` (ancre), sans équivalent direct
 * en navigation native.
 */
export function ReviewsList({ reviews, currentUserId }: Props) {
  const router = useRouter();
  const { selectedRating } = useRatingFilter();
  const ratingFilter = selectedRating !== null ? selectedRating + 1 : null;
  const [openComments, setOpenComments] = useState<{ id: string; type: 'album' | 'track' } | null>(null);
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    reviews.forEach((r) => { s[r.id] = r.comments_count; });
    return s;
  });

  if (reviews.length === 0) {
    return <Text className="text-center text-text-tertiary py-12" style={metaMediumStyle}>Aucune revue pour l'instant</Text>;
  }

  const filtered = ratingFilter !== null ? reviews.filter((r) => r.rating === ratingFilter) : reviews;

  if (filtered.length === 0) {
    return <Text className="text-center text-text-tertiary py-12" style={metaMediumStyle}>Aucune revue avec cette note</Text>;
  }

  return (
    <View style={{ gap: 12 }}>
      {filtered.map((review) => {
        const href = review.type === 'track' ? `/track-diary/${review.id}` : `/diary/${review.id}`;
        return (
          <View key={`${review.type}-${review.id}`} className="p-4 border border-border bg-background-secondary rounded-input flex-row gap-4 overflow-hidden">
            {review.cover_url && (
              <Pressable onPress={() => router.push(href as any)} className="w-16 h-16 rounded-input overflow-hidden bg-background-secondary flex-shrink-0">
                <CoverImage src={review.cover_url} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
              </Pressable>
            )}
            <View className="flex-1 min-w-0">
              <View className="flex-row items-start gap-2 mb-0.5">
                <Pressable onPress={() => router.push(href as any)} className="flex-1 min-w-0">
                  <Text numberOfLines={2} className="text-text-warm" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 16 }}>{review.title}</Text>
                </Pressable>
                <View className="border border-accent rounded-full px-2 py-0.5 bg-[#FAF8F4]">
                  <Text className="text-accent" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 13 }}>
                    {review.type === 'track' ? 'titre' : 'album'}
                  </Text>
                </View>
              </View>
              <Text className="text-text-tertiary mt-0.5" style={labelStyle}>{review.subtitle}</Text>
              {review.rating != null && (
                <View className="self-start mt-1.5">
                  <RatingBadge rating={review.rating} />
                </View>
              )}
              {review.review_body && (
                <Text className="text-accent-deep mt-2" numberOfLines={3} style={[smStyle, { fontFamily: 'InstrumentSerif_400Regular_Italic', lineHeight: 19 }]}>
                  « {review.review_body} »
                </Text>
              )}
              <View className="pt-3 mt-2 border-t border-rule">
                <FeedActions
                  entryId={review.id}
                  type={review.type}
                  currentUserId={currentUserId}
                  isLiked={review.is_liked}
                  likesCount={review.likes_count}
                  commentsCount={commentsCounts[review.id] ?? 0}
                  onCommentPress={() => setOpenComments({ id: review.id, type: review.type })}
                  indent={false}
                />
              </View>
            </View>
          </View>
        );
      })}

      <CommentSheet
        isOpen={!!openComments}
        onClose={() => setOpenComments(null)}
        entryId={openComments?.id}
        type={openComments?.type}
        onCommentAdded={() => {
          if (!openComments) return;
          setCommentsCounts((prev) => ({ ...prev, [openComments.id]: (prev[openComments.id] ?? 0) + 1 }));
        }}
      />
    </View>
  );
}
