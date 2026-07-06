import { Pressable, Text, View } from 'react-native';
import { labelStyle } from '../../lib/typography';
import { useRatingFilter } from '../../lib/RatingFilterContext';

type Props = {
  ratings: (number | null)[];
  /** "Mes" (défaut, soi) ou "Ses" (profil public). */
  label?: string;
};

/**
 * Miroir de RatingDistribution (web) — histogramme des notes 1..10, cliquable pour
 * filtrer le Journal/les Critiques via RatingFilterContext (voir DiaryList/ReviewsList).
 */
export function RatingDistribution({ ratings, label = 'Mes' }: Props) {
  const { selectedRating, selectRating } = useRatingFilter();

  const counts = Array(10).fill(0) as number[];
  let total = 0;
  ratings.forEach((r) => {
    if (r !== null && r >= 1 && r <= 10) {
      counts[Math.round(r) - 1]++;
      total++;
    }
  });

  if (total === 0) return null;
  const max = Math.max(...counts);

  const handlePress = (i: number) => {
    if (counts[i] === 0) return;
    selectRating(selectedRating === i ? null : i, counts[i]);
  };

  return (
    <View className="bg-[#FAF8F4] border border-border rounded-input px-4 pt-4 pb-3 mt-6">
      <View className="flex-row items-baseline justify-between mb-3">
        <Text className="text-text-warm" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 18 }}>
          {label} <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic' }} className="text-accent-deep">notes</Text>
        </Text>
        <Text className="text-text-tertiary" style={labelStyle}>
          {selectedRating !== null && counts[selectedRating] > 0
            ? `${selectedRating + 1}/10 · ${counts[selectedRating]} écoute${counts[selectedRating] > 1 ? 's' : ''}`
            : `${total} écoute${total > 1 ? 's' : ''}`}
        </Text>
      </View>

      <View className="flex-row items-end gap-1" style={{ height: 56 }}>
        {counts.map((count, i) => {
          const isSelected = selectedRating === i;
          return (
            <Pressable key={i} onPress={() => handlePress(i)} disabled={count === 0} className="flex-1 items-center justify-end h-full">
              <View
                className={`w-full rounded-[3px] ${isSelected ? 'bg-accent-deep' : 'bg-accent'}`}
                style={{
                  height: count > 0 ? `${Math.max((count / max) * 100, 6)}%` : 0,
                  opacity: count === 0 ? 0 : selectedRating !== null ? (isSelected ? 1 : 0.12) : 0.25 + (count / max) * 0.75,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row justify-between mt-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Text
            key={n}
            className={`flex-1 text-center ${selectedRating === n - 1 ? 'text-accent-deep' : 'text-text-disabled'}`}
            style={{ fontFamily: selectedRating === n - 1 ? 'Inter_500Medium' : 'Inter_400Regular', fontSize: 8 }}
          >
            {n}
          </Text>
        ))}
      </View>
    </View>
  );
}
