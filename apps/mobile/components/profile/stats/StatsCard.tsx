import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { labelStyle } from '../../../lib/typography';

type Props = {
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
};

/** Wrapper commun aux 5 cartes stats — miroir du conteneur répété dans chaque ProfileStats*.tsx (web). */
export function StatsCard({ title, subtitle, children }: Props) {
  return (
    <View className="bg-paper-hi border border-border rounded-card px-4 pt-4 pb-5">
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 18 }} className="text-text-warm mb-1">
        {title}
      </Text>
      {subtitle ? <Text className="text-text-tertiary mb-4" style={labelStyle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function StatsEmptyState({ children }: { children: ReactNode }) {
  return (
    <Text className="text-text-tertiary text-center py-6" style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}>
      {children}
    </Text>
  );
}
