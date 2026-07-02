import { Stack } from 'expo-router';

export default function MeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F3EF' },
      }}
    />
  );
}
