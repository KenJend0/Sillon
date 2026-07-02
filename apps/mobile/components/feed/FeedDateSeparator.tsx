import { Text, View } from 'react-native';

/** Détermine le libellé de section — miroir de getDateBucket (web FeedInfiniteList). */
export function getDateBucket(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - eventDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays <= 7) return '7 derniers jours';
  if (diffDays <= 30) return '30 derniers jours';
  return 'Antérieur';
}

export function FeedDateSeparator({ label, isFirst }: { label: string; isFirst: boolean }) {
  return (
    <View className={isFirst ? 'mb-2 px-3' : 'mt-5 mb-2 px-3'}>
      <Text className="text-accent text-[19px]" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic' }}>
        {label}
      </Text>
    </View>
  );
}
