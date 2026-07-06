import { useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { toggleFollow } from '../../lib/social';
import { showToast } from '../ui/Toast';

type Props = {
  userId: string;
  initialIsFollowing: boolean;
  onChange?: (following: boolean) => void;
};

/** Miroir de FollowButton (web). */
export function FollowButton({ userId, initialIsFollowing, onChange }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      const result = await toggleFollow(userId);
      if (result.success && typeof result.following === 'boolean') {
        setIsFollowing(result.following);
        onChange?.(result.following);
      } else {
        showToast(result.error ?? "Impossible de mettre à jour l'abonnement", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      className={`flex-row items-center justify-center gap-2 px-5 py-2 rounded-pill min-w-[90px] ${
        isFollowing ? 'bg-background-tertiary' : 'border border-sage'
      }`}
      style={{ opacity: loading ? 0.7 : 1 }}
    >
      {loading && <ActivityIndicator size="small" color={isFollowing ? '#6B6B6B' : '#7A8471'} />}
      <Text className={isFollowing ? 'text-text-secondary' : 'text-sage'} style={{ fontFamily: 'Inter_500Medium', fontSize: 14 }}>
        {isFollowing ? 'Suivi' : 'Suivre'}
      </Text>
    </Pressable>
  );
}
