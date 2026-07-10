import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/explore" />;
}
