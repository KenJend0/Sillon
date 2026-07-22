import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const handled = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token_hash = params.token_hash;
    const type = params.type as EmailOtpType | undefined;

    if (!token_hash || !type) {
      setError(true);
      return;
    }

    supabase.auth.verifyOtp({ token_hash, type }).then(({ error: verifyError }) => {
      if (verifyError) {
        setError(true);
        return;
      }

      if (type === 'recovery') {
        router.replace('/(auth)/new-password');
      } else {
        router.replace('/(tabs)/explore');
      }
    });
  }, [params.token_hash, params.type, router]);

  useEffect(() => {
    if (!error) return;
    router.replace('/(auth)/login?error=confirmation_failed');
  }, [error, router]);

  return (
    <View className="flex-1 bg-background">
      <LoadingScreen />
    </View>
  );
}
