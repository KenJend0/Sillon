import { Pressable, Text, View } from 'react-native';
import type { FeedScope } from '../../lib/feed';

type Tab = Extract<FeedScope, 'notifications' | 'activity'>;

const TABS: { id: Tab; label: string }[] = [
  { id: 'notifications', label: 'Pour moi' },
  { id: 'activity', label: 'Réseau' },
];

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export function FeedTabs({ active, onChange }: Props) {
  return (
    <View className="flex-row rounded-full border border-border bg-paper-hi p-1 mx-3 mb-3">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            className={`flex-1 rounded-full py-2 items-center ${isActive ? 'bg-background' : ''}`}
          >
            <Text
              className={`text-[13px] ${isActive ? 'text-accent-deep' : 'text-text-tertiary'}`}
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
