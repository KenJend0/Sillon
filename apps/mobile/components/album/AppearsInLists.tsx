import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { PublicListPreview } from '../../lib/lists';

/** Miroir de AppearsInLists (web). */
export function AppearsInLists({ lists }: { lists: PublicListPreview[] }) {
  const router = useRouter();
  if (lists.length === 0) return null;

  return (
    <View>
      <Text className="text-text-tertiary mb-2" style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19.5 }}>
        Dans {lists.length} liste{lists.length > 1 ? 's' : ''}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {lists.map((list) => (
          <Pressable
            key={list.id}
            onPress={() => router.push(`/lists/${list.id}` as any)}
            className="bg-background-secondary rounded-pill px-3 py-1.5"
          >
            <Text className="text-text-secondary" style={{ fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>
              {list.title} <Text className="text-text-disabled">· @{list.creator_username}</Text>
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
