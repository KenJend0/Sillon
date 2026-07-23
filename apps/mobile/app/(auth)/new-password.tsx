import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { SillonMark } from '../../components/icons/SillonMark';
import { showToast } from '../../components/ui/Toast';

export default function NewPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }
    if (password !== confirm) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      showToast(updateError.message || 'Erreur lors de la mise à jour du mot de passe', 'error');
      return;
    }

    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} className="justify-center px-6">
        <View className="items-center mb-4">
          <SillonMark />
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-text-secondary text-center mb-8">
          Choisis un nouveau mot de passe
        </Text>

        <View className="mb-4">
          <Text
            style={{ fontFamily: 'Inter_500Medium' }}
            className="text-sm text-text-secondary mb-1"
          >
            Nouveau mot de passe
          </Text>
          <View className="relative justify-center">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••"
              placeholderTextColor="#9A9A9A"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={{ fontFamily: 'Inter_400Regular' }}
              className="bg-background-secondary border border-border rounded-input px-3 py-3 pr-10 text-text-primary"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              className="absolute right-3"
              hitSlop={8}
            >
              {showPassword ? (
                <EyeOff size={18} color="#9A9A9A" />
              ) : (
                <Eye size={18} color="#9A9A9A" />
              )}
            </Pressable>
          </View>
        </View>

        <View className="mb-2">
          <Text
            style={{ fontFamily: 'Inter_500Medium' }}
            className="text-sm text-text-secondary mb-1"
          >
            Confirmer
          </Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••••"
            placeholderTextColor="#9A9A9A"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            style={{ fontFamily: 'Inter_400Regular' }}
            className="bg-background-secondary border border-border rounded-input px-3 py-3 text-text-primary"
          />
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-xs text-text-tertiary mb-6">
          Minimum 8 caractères
        </Text>

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !password || !confirm}
          className="bg-text-warm rounded-button py-3 items-center disabled:opacity-40"
        >
          {loading ? (
            <ActivityIndicator color="#FAF8F4" />
          ) : (
            <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-paper-hi">
              Changer le mot de passe
            </Text>
          )}
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
