import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { setOnboardingUsername, checkUsernameAvailability } from '../lib/profile';
import { getSuggestedUsers, type SuggestedUser } from '../lib/social';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/avatars/Avatar';
import { FollowButton } from '../components/social/FollowButton';
import { showToast } from '../components/ui/Toast';
import { SillonMark } from '../components/icons/SillonMark';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;
const MIN_LENGTH = 3;

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'too_short';

function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View className="flex-row gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-text-primary' : 'bg-border'}`}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1 — pseudo ──────────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [submittingUsername, setSubmittingUsername] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback(async (value: string) => {
    const result = await checkUsernameAvailability(value);
    if (!result.ok) {
      setCheckState('idle');
      return;
    }
    setCheckState(result.available ? 'available' : 'taken');
  }, []);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setCheckState('idle');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]*$/.test(trimmed)) {
      setCheckState('invalid');
      return;
    }
    if (trimmed.length < MIN_LENGTH) {
      setCheckState('too_short');
      return;
    }
    if (trimmed.length > 32) {
      setCheckState('invalid');
      return;
    }

    setCheckState('checking');
    debounceRef.current = setTimeout(() => checkAvailability(trimmed), 500);
  };

  const handleContinueStep1 = async () => {
    const trimmed = username.trim();
    if (!trimmed || !USERNAME_REGEX.test(trimmed)) {
      showToast('Pseudo invalide', 'error');
      return;
    }
    if (checkState === 'taken') {
      showToast('Ce pseudo est déjà pris', 'error');
      return;
    }
    setSubmittingUsername(true);
    try {
      const result = await setOnboardingUsername(trimmed);
      if (!result.ok) {
        showToast(result.error || 'Erreur, réessaie.', 'error');
        return;
      }
      await refreshProfile();
      setStep(2);
    } finally {
      setSubmittingUsername(false);
    }
  };

  // ── Step 2 — comptes suggérés ────────────────────────────────────────────
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (step !== 2 || suggestedUsers.length > 0) return;
    setLoadingSuggestions(true);
    getSuggestedUsers(5)
      .then(setSuggestedUsers)
      .finally(() => setLoadingSuggestions(false));
  }, [step, suggestedUsers.length]);

  // ── Step 3 — lancement ───────────────────────────────────────────────────
  const handleFinish = () => {
    router.replace('/(tabs)/add');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Progress step={step} />

        {step === 1 && (
          <View>
            <View className="mb-4">
              <SillonMark width={40} height={23} />
            </View>
            <Text style={{ fontFamily: 'InstrumentSerif_400Regular' }} className="text-3xl text-text-primary mb-2">
              Bienvenue sur Sillon !
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-text-secondary mb-8">
              Commence par choisir ton pseudo. C&apos;est ce que verront les autres.
            </Text>

            <View className="relative justify-center mb-2">
              <Text className="absolute left-3 z-10 text-text-tertiary" style={{ fontFamily: 'Inter_400Regular' }}>
                @
              </Text>
              <TextInput
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="tonpseudo"
                placeholderTextColor="#9A9A9A"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={32}
                style={{ fontFamily: 'Inter_400Regular' }}
                className={`bg-background-secondary border rounded-input pl-7 pr-4 py-3 text-text-primary ${
                  checkState === 'available'
                    ? 'border-sage'
                    : checkState === 'taken' || checkState === 'invalid'
                    ? 'border-like'
                    : 'border-border'
                }`}
              />
            </View>

            <Text
              style={{ fontFamily: 'Inter_400Regular' }}
              className={`text-xs mb-6 ${
                checkState === 'invalid' || checkState === 'too_short' || checkState === 'taken'
                  ? 'text-like'
                  : checkState === 'available'
                  ? 'text-sage'
                  : 'text-text-tertiary'
              }`}
            >
              {checkState === 'invalid' && "Les caractères - _ . sont les seuls autorisés en plus des lettres/chiffres"}
              {checkState === 'too_short' && 'Entre 3 et 32 caractères'}
              {checkState === 'taken' && 'Déjà pris'}
              {checkState === 'available' && 'Disponible'}
              {(checkState === 'idle' || checkState === 'checking') && 'Entre 3 et 32 caractères'}
            </Text>

            <Pressable
              onPress={handleContinueStep1}
              disabled={
                submittingUsername ||
                !username.trim() ||
                checkState === 'taken' ||
                checkState === 'invalid' ||
                checkState === 'too_short' ||
                checkState === 'checking' ||
                checkState === 'idle'
              }
              className="bg-text-warm rounded-button py-3 items-center disabled:opacity-40"
            >
              {submittingUsername ? (
                <ActivityIndicator color="#FAF8F4" />
              ) : (
                <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-paper-hi">
                  Continuer →
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ fontFamily: 'InstrumentSerif_400Regular' }} className="text-3xl text-text-primary mb-2">
              Qui veux-tu suivre ?
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-text-secondary mb-8">
              Suis des gens pour remplir ton feed avec leurs écoutes.
            </Text>

            {loadingSuggestions ? (
              <ActivityIndicator className="mb-8" color="#9A9A9A" />
            ) : suggestedUsers.length > 0 ? (
              <View className="mb-8">
                {suggestedUsers.map((u) => (
                  <View key={u.id} className="flex-row items-center gap-4 py-3 border-b border-border-divider">
                    <Avatar src={u.avatar_url} size={40} />
                    <Text style={{ fontFamily: 'Inter_500Medium' }} className="flex-1 text-text-primary" numberOfLines={1}>
                      @{u.username}
                    </Text>
                    <FollowButton userId={u.id} initialIsFollowing={false} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-text-tertiary mb-8">
                Pas encore de suggestions — tu pourras trouver des gens via la recherche.
              </Text>
            )}

            <Pressable
              onPress={() => setStep(3)}
              className="bg-text-warm rounded-button py-3 items-center"
            >
              <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-paper-hi">
                Continuer →
              </Text>
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={{ fontFamily: 'InstrumentSerif_400Regular' }} className="text-3xl text-text-primary mb-2">
              C&apos;est parti !
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-text-secondary mb-10">
              Commence par ajouter un album à ton profil.
            </Text>

            <Pressable
              onPress={handleFinish}
              className="flex-row items-center justify-between bg-text-warm rounded-card px-4 py-4"
            >
              <View>
                <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-paper-hi">
                  Ajouter un album
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-paper-hi opacity-60 text-xs mt-0.5">
                  Commence à construire ton profil
                </Text>
              </View>
              <Text className="text-paper-hi text-xl">→</Text>
            </Pressable>

            <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-text-tertiary text-xs mt-6 text-center">
              Déjà des écoutes sur Last.fm ou RateYourMusic ? Tu pourras importer ton historique depuis les Réglages.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
