import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

type Props = {
  /** Date au format YYYY-MM-DD (même format que le `<input type="date">` web). */
  value: string;
  onChange: (value: string) => void;
  /** Date la plus tardive sélectionnable — miroir du `max={today}` web. */
  maxDate?: Date;
};

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function fromDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Champ "Date d'écoute" — miroir visuel du `<input type="date">` web (boîte avec icône
 * calendrier), branché sur le vrai picker natif de @react-native-community/datetimepicker
 * (pas @expo/ui/community/datetime-picker : bug de crash confirmé sur Android au moment
 * de l'écriture, voir github.com/expo/expo/issues/39424 — cette lib est mature et
 * largement éprouvée dans l'écosystème RN/Expo à la place).
 */
export function DatePickerField({ value, onChange, maxDate }: Props) {
  const [show, setShow] = useState(false);
  const dateObj = toDateOnly(value);

  return (
    <View>
      <Pressable
        onPress={() => setShow(true)}
        className="flex-row items-center justify-between bg-background-secondary border border-border rounded-input px-4 py-3"
      >
        <Text className="text-text-primary" style={{ fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 }}>
          {dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        <Calendar size={16} color="#9A9A9A" />
      </Pressable>

      {show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          maximumDate={maxDate}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onValueChange={(_event, selectedDate) => {
            if (Platform.OS === 'android') setShow(false);
            if (selectedDate) onChange(fromDate(selectedDate));
          }}
          onDismiss={() => setShow(false)}
        />
      )}

      {show && Platform.OS === 'ios' && (
        <Pressable onPress={() => setShow(false)} className="self-end mt-2 px-3 py-1.5">
          <Text className="text-accent" style={{ fontFamily: 'Inter_500Medium', fontSize: 13 }}>Terminé</Text>
        </Pressable>
      )}
    </View>
  );
}
