import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../components/ui/BackButton';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { Avatar } from '../../../components/avatars/Avatar';
import { showToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../lib/AuthContext';
import {
  checkUsernameAvailability,
  changeUsername as changeUsernameAction,
  getMyProfileSettings,
  updateProfileSettings,
  type ProfileSettings,
} from '../../../lib/profile';
import { labelStyle, metaStyle } from '../../../lib/typography';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{2,32}$/;

/**
 * Miroir du noyau de apps/web/app/settings/page.tsx (bio, username, e-mail lecture seule).
 * Hors scope, documenté dans docs/MOBILE_ROADMAP.md (Éditer profil) : upload/suppression
 * d'avatar (sharp + client admin), import Last.fm/RYM (worker externe + file picker),
 * export JSON (pas d'équivalent direct download/share posé), suppression de compte
 * (client admin) — la zone dangereuse redirige vers le support plutôt que d'agir.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [changingUsername, setChangingUsername] = useState(false);
  const [usernameCheckState, setUsernameCheckState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const result = await getMyProfileSettings();
      if (result.ok && result.profile) {
        setProfile(result.profile);
        setBio(result.profile.bio ?? '');
      } else {
        showToast('Erreur au chargement du profil', 'error');
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateProfileSettings({ bio: bio || null });
      if (!result.ok) throw new Error(result.error);
      showToast('Profil mis à jour !', 'success');
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setSaving(false);
    }
  };

  const checkUsername = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return setUsernameCheckState('idle');
    if (!USERNAME_REGEX.test(trimmed)) return setUsernameCheckState('invalid');
    setUsernameCheckState('checking');
    const result = await checkUsernameAvailability(trimmed);
    if (!result.ok) return setUsernameCheckState('idle');
    setUsernameCheckState(result.available ? 'available' : 'taken');
  };

  const handleChangeUsername = async () => {
    const trimmed = newUsername.trim();
    if (!profile) return;
    if (!trimmed || !USERNAME_REGEX.test(trimmed) || profile.username_changed || trimmed === (profile.username || '')) return;

    setChangingUsername(true);
    try {
      const result = await changeUsernameAction(trimmed);
      if (!result.ok) throw new Error(result.error);
      setProfile({ ...profile, username: trimmed, username_changed: true });
      showToast('Pseudo changé avec succès !', 'success');
      setShowUsernameForm(false);
      setNewUsername('');
      setUsernameCheckState('idle');
    } catch {
      showToast('Erreur lors du changement de pseudo', 'error');
    } finally {
      setChangingUsername(false);
    }
  };

  if (loading || !profile) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
        <BackButton label="Profil" className="mt-3 mb-8" />
        <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 28 }} className="text-text-primary mb-10">
          Modifier le profil
        </Text>

        {/* Photo de profil */}
        <View className="mb-10">
          <Text className="text-text-tertiary mb-4 uppercase" style={[labelStyle, { letterSpacing: 1 }]}>Photo de profil</Text>
          <View className="flex-row items-center gap-5 pb-4 border-b border-border-divider">
            <Avatar src={profile.avatar_url} size={72} />
            <Pressable onPress={() => showToast('Bientôt disponible', 'info')}>
              <Text className="text-text-secondary" style={metaStyle}>Changer la photo</Text>
            </Pressable>
          </View>
        </View>

        {/* Bio */}
        <View className="mb-10">
          <Text className="text-text-tertiary mb-4 uppercase" style={[labelStyle, { letterSpacing: 1 }]}>Informations personnelles</Text>
          <View className="pb-4 border-b border-border-divider">
            <Text className="text-text-primary mb-2" style={metaStyle}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, 500))}
              placeholder="Parlez un peu de vous..."
              placeholderTextColor="#9A9A9A"
              multiline
              numberOfLines={3}
              maxLength={500}
              className="bg-background-secondary border border-border rounded-input px-3 py-2.5 text-text-primary"
              style={{ height: 80, textAlignVertical: 'top', ...metaStyle }}
            />
            <Text className="text-text-tertiary mt-1" style={labelStyle}>{bio.length}/500 caractères</Text>
          </View>
        </View>

        {/* Identifiants */}
        <View className="mb-10">
          <Text className="text-text-tertiary mb-4 uppercase" style={[labelStyle, { letterSpacing: 1 }]}>Identifiants</Text>

          <View className="pb-4 border-b border-border-divider mb-4">
            <View className="flex-row items-start justify-between gap-4 mb-2">
              <View className="flex-1">
                <Text className="text-text-primary mb-1" style={metaStyle}>Nom d'utilisateur</Text>
                <Text className="text-text-secondary" style={metaStyle}>@{profile.username || 'Non défini'}</Text>
              </View>
              {!showUsernameForm && (
                <Pressable disabled={!!profile.username_changed} onPress={() => setShowUsernameForm(true)}>
                  <Text className={profile.username_changed ? 'text-text-disabled' : 'text-text-secondary'} style={metaStyle}>
                    Changer
                  </Text>
                </Pressable>
              )}
            </View>

            {profile.username_changed && !showUsernameForm && (
              <Text className="text-text-tertiary" style={labelStyle}>Vous avez déjà changé votre pseudo.</Text>
            )}

            {showUsernameForm && (
              <View className="p-4 bg-background-secondary border border-border rounded-card" style={{ gap: 10 }}>
                <TextInput
                  value={newUsername}
                  onChangeText={(v) => {
                    setNewUsername(v);
                    setUsernameCheckState('idle');
                  }}
                  onBlur={() => checkUsername(newUsername)}
                  placeholder="Nouveau pseudo"
                  placeholderTextColor="#9A9A9A"
                  autoCapitalize="none"
                  className="bg-background border border-border rounded-input px-3 py-2.5 text-text-primary"
                  style={metaStyle}
                />
                <Text className="text-text-tertiary" style={labelStyle}>2-32 caractères (lettres, chiffres, _, ., -)</Text>
                {usernameCheckState === 'invalid' && <Text className="text-like" style={labelStyle}>Pseudo invalide</Text>}
                {usernameCheckState === 'taken' && <Text className="text-like" style={labelStyle}>Pseudo déjà pris</Text>}
                {usernameCheckState === 'available' && <Text className="text-text-secondary" style={labelStyle}>Pseudo disponible</Text>}
                <View className="flex-row items-center gap-3">
                  <Pressable
                    disabled={changingUsername || !newUsername.trim() || !USERNAME_REGEX.test(newUsername.trim()) || newUsername.trim() === (profile.username || '')}
                    onPress={handleChangeUsername}
                  >
                    <Text className="text-text-secondary" style={metaStyle}>{changingUsername ? '...' : 'Confirmer'}</Text>
                  </Pressable>
                  <Text className="text-border">·</Text>
                  <Pressable
                    onPress={() => {
                      setShowUsernameForm(false);
                      setNewUsername('');
                      setUsernameCheckState('idle');
                    }}
                  >
                    <Text className="text-text-secondary" style={metaStyle}>Annuler</Text>
                  </Pressable>
                </View>
                <View className="bg-background-tertiary border border-border rounded-button p-2">
                  <Text className="text-text-secondary" style={labelStyle}>Vous ne pourrez changer votre pseudo qu'une seule fois.</Text>
                </View>
              </View>
            )}
          </View>

          <View className="pb-4 border-b border-border-divider">
            <Text className="text-text-primary mb-1" style={metaStyle}>Adresse e-mail</Text>
            <Text className="text-text-secondary" style={metaStyle}>{profile.email}</Text>
          </View>
        </View>

        <Pressable onPress={handleSave} disabled={saving} className={`w-full py-3.5 rounded-button items-center mb-10 ${saving ? 'bg-text-disabled' : 'bg-text-primary'}`}>
          <Text className="text-background" style={[metaStyle, { fontFamily: 'Inter_500Medium' }]}>
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Text>
        </Pressable>

        {/* Importer historique — reporté */}
        <View className="border-t border-border-divider pt-8 mb-10">
          <Text className="text-text-tertiary mb-3 uppercase" style={[labelStyle, { letterSpacing: 1 }]}>Importer ton historique</Text>
          <Text className="text-text-secondary" style={metaStyle}>
            L'import Last.fm et RateYourMusic (CSV) n'est pas encore disponible sur l'app mobile. Utilise la version web pour importer ton historique.
          </Text>
        </View>

        {/* Mes données — reporté */}
        <View className="border-t border-border-divider pt-8 mb-10">
          <Text className="text-text-tertiary mb-3 uppercase" style={[labelStyle, { letterSpacing: 1 }]}>Mes données</Text>
          <Text className="text-text-secondary" style={metaStyle}>
            Le téléchargement de tes données (export JSON) n'est pas encore disponible sur l'app mobile. Utilise la version web.
          </Text>
        </View>

        {/* Zone dangereuse — désactivée, redirige vers le support */}
        <View className="border-t border-border-divider pt-8">
          <Text className="text-text-tertiary mb-3 uppercase" style={[labelStyle, { letterSpacing: 1 }]}>Zone dangereuse</Text>
          <Text className="text-text-secondary mb-3" style={metaStyle}>
            La suppression de compte n'est pas encore disponible directement sur l'app mobile.
          </Text>
          <Pressable onPress={() => router.push('/me/legal' as any)}>
            <Text className="text-text-tertiary" style={metaStyle}>Contacter le support pour supprimer mon compte →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
