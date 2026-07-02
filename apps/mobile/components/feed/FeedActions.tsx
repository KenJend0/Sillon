import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';
import { toggleDiaryLike } from '../../lib/feed';
import { showToast } from '../Toast';

type Props = {
  entryId?: string;
  currentUserId?: string;
  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
  onCommentPress?: () => void;
};

export function FeedActions({ entryId, currentUserId, isLiked = false, likesCount = 0, commentsCount = 0, onCommentPress }: Props) {
  const [liked, setLiked] = useState(isLiked);
  const [count, setCount] = useState(likesCount);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(isLiked);
    setCount(likesCount);
  }, [entryId, isLiked, likesCount]);

  const handleLike = async () => {
    if (!currentUserId) {
      showToast('Connecte-toi pour aimer cette critique', 'error');
      return;
    }
    if (!entryId || pending) return;

    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(!prevLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
    setPending(true);
    try {
      await toggleDiaryLike(entryId);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      showToast("Impossible d'aimer cette critique", 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <View className="flex-row items-center gap-5 mt-1.5 ml-11">
      <Pressable onPress={handleLike} disabled={pending} className="flex-row items-center gap-1.5">
        <Heart size={14} color={liked ? '#C86C6C' : '#9A9A9A'} fill={liked ? '#C86C6C' : 'transparent'} />
        {count > 0 && <Text className="text-[12px] text-text-tertiary">{count}</Text>}
      </Pressable>
      <Pressable onPress={onCommentPress} className="flex-row items-center gap-1.5">
        <MessageCircle size={14} color="#9A9A9A" />
        {commentsCount > 0 && <Text className="text-[12px] text-text-tertiary">{commentsCount}</Text>}
      </Pressable>
    </View>
  );
}
