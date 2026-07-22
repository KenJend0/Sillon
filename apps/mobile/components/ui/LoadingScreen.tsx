import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SillonMark } from '../icons/SillonMark';

type Props = {
  size?: number;
  color?: string;
  /** Prend tout l'écran (fond `bg-background` centré) — mettre à false pour l'insérer
   * dans une mise en page existante (ex. footer de liste, section). */
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Remplace l'ActivityIndicator par défaut pour les premiers chargements (données pas
 * encore en cache) — le logo respire au lieu du spinner système générique. Pas destiné
 * aux refetch en arrière-plan (ceux-ci ne doivent de toute façon pas bloquer l'UI, voir
 * le pattern hasLoadedOnceRef dans app/(tabs)/me/index.tsx).
 */
export function LoadingScreen({ size = 56, color = '#1C1C1C', fullScreen = true, style }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 750, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + progress.value * 0.5,
    transform: [{ scale: 0.9 + progress.value * 0.1 }],
  }));

  const mark = (
    <Animated.View style={[animatedStyle, style]}>
      <SillonMark width={size} height={size * 0.58} color={color} />
    </Animated.View>
  );

  if (!fullScreen) return mark;

  return <View className="flex-1 items-center justify-center bg-background">{mark}</View>;
}
