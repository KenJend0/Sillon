import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Le profil se charge en arrière-plan juste après que la session apparaisse
  // (voir AuthContext) — on attend qu'il soit là avant de décider où aller, sinon
  // on risque d'envoyer un utilisateur qui doit onboarder direct sur l'app.
  if (!profile) {
    return <LoadingScreen />;
  }

  const defaultUsername = session.user.id.substring(0, 8);
  if (profile.username === defaultUsername) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/explore" />;
}
