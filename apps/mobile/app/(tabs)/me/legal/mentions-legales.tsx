import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../components/ui/BackButton';
import { LegalSection, LegalParagraph } from '../../../../components/legal/LegalSection';
import { metaStyle, smStyle } from '../../../../lib/typography';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-3 py-0.5">
      <Text className="text-text-tertiary" style={[metaStyle, { width: 128 }]}>{label}</Text>
      <Text className="flex-1 text-text-primary" style={metaStyle}>{value}</Text>
    </View>
  );
}

/** Miroir de apps/web/app/legal/mentions-legales/page.tsx. */
export default function MentionsLegalesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView className="flex-1 bg-paper-hi" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
      <BackButton label="Aide & support" className="mb-4" />
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 26 }} className="text-text-primary mb-1">
        Mentions légales
      </Text>
      <Text className="text-text-tertiary mb-8" style={smStyle}>Dernière mise à jour : février 2026</Text>

      <LegalSection title="Éditeur">
        <LegalParagraph>Waveform est un projet indépendant édité à titre personnel.</LegalParagraph>
        <Row label="Nom du projet" value="Waveform" />
        <Row label="Site" value="waveformapp.online" />
        <Row label="Contact" value="waveform.contact@proton.me" />
        <Row label="Statut" value="Projet personnel non commercial" />
      </LegalSection>

      <LegalSection title="Hébergement">
        <Row label="Hébergeur frontend" value="Vercel Inc." />
        <Row label="Adresse" value="340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis" />
        <Row label="Site" value="vercel.com" />
        <LegalParagraph>
          La base de données est hébergée via Supabase (AWS, région Europe de l'Ouest).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Données musicales">
        <LegalParagraph>
          Les informations sur les albums, artistes et morceaux (titres, dates, pochettes)
          proviennent de MusicBrainz, une base de données musicale ouverte publiée sous licence
          Creative Commons CC0. Les pochettes d'albums sont issues du Cover Art Archive, également
          sous CC0.
        </LegalParagraph>
        <LegalParagraph>
          Waveform n'héberge aucun fichier audio et ne propose aucun service de streaming
          musical.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <LegalParagraph>
          Le code source, le design et les textes propres à Waveform sont la propriété de
          l'éditeur. Toute reproduction sans autorisation est interdite.
        </LegalParagraph>
        <LegalParagraph>
          Les contenus publiés par les utilisateurs (avis, notes, listes) restent leur propriété.
          En les publiant sur Waveform, ils accordent à l'application une licence d'affichage non
          exclusive.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Responsabilité">
        <LegalParagraph>
          Waveform est fourni "tel quel", sans garantie de disponibilité ou d'exactitude des
          données. L'éditeur ne saurait être tenu responsable des contenus publiés par les
          utilisateurs.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Contact">
        <LegalParagraph>
          Pour toute question relative aux présentes mentions légales :
          waveform.contact@proton.me
        </LegalParagraph>
      </LegalSection>
    </ScrollView>
  );
}
