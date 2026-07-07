import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, HelpCircle, Mail, ScrollText, Shield, Trash2 } from 'lucide-react-native';
import { BackButton } from '../../../../components/ui/BackButton';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { labelStyle, metaStyle, smStyle } from '../../../../lib/typography';

const resources = [
  { href: '/me/legal/faq', icon: HelpCircle, label: 'FAQ', description: 'Questions fréquentes sur l’utilisation de Waveform' },
  { href: '/me/legal/cgu', icon: ScrollText, label: 'Conditions d’utilisation', description: 'Règles d’usage de la plateforme' },
  { href: '/me/legal/confidentialite', icon: Shield, label: 'Politique de confidentialité', description: 'Comment nous traitons tes données personnelles' },
  { href: '/me/legal/mentions-legales', icon: FileText, label: 'Mentions légales', description: 'Informations légales sur l’éditeur et l’hébergement' },
  { href: '/me/settings', icon: Trash2, label: 'Supprimer mon compte', description: 'Réglages → Zone dangereuse → Supprimer le compte' },
];

/** Miroir de apps/web/app/legal/page.tsx — index "Aide & support" du menu profil. */
export default function LegalIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-paper-hi" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
      <BackButton label="Profil" className="mb-4" />
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 26 }} className="text-text-primary mb-1">
        Aide & support
      </Text>
      <Text className="text-text-secondary mb-8" style={smStyle}>
        Une question, un problème ou une suggestion ? On est là.
      </Text>

      <LegalSection title="Nous contacter">
        <Pressable
          onPress={() => Linking.openURL('mailto:waveform.contact@proton.me?subject=Support%20Waveform')}
          className="flex-row items-center gap-4 px-4 py-4 rounded-card bg-background-secondary"
        >
          <View className="w-9 h-9 rounded-button bg-background-tertiary items-center justify-center">
            <Mail size={16} color="#9A9A9A" />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary" style={[metaStyle, { fontFamily: 'Inter_500Medium' }]}>
              waveform.contact@proton.me
            </Text>
            <Text className="text-text-tertiary mt-0.5" style={labelStyle}>
              Réponse sous 48 h en général
            </Text>
          </View>
          <Text className="text-text-disabled text-[18px]">›</Text>
        </Pressable>
      </LegalSection>

      <LegalSection title="Ressources utiles">
        <View style={{ gap: 8 }}>
          {resources.map(({ href, icon: Icon, label, description }) => (
            <Pressable
              key={href}
              onPress={() => router.push(href as any)}
              className="flex-row items-center gap-4 px-4 py-4 rounded-card"
            >
              <View className="w-9 h-9 rounded-button bg-background-secondary items-center justify-center">
                <Icon size={16} color="#9A9A9A" />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary" style={[metaStyle, { fontFamily: 'Inter_500Medium' }]}>{label}</Text>
                <Text className="text-text-tertiary mt-0.5" style={labelStyle}>{description}</Text>
              </View>
              <Text className="text-text-disabled text-[18px]">›</Text>
            </Pressable>
          ))}
        </View>
      </LegalSection>
    </ScrollView>
  );
}
