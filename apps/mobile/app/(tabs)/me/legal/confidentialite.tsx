import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../components/ui/BackButton';
import { LegalSection, LegalParagraph } from '../../../../components/legal/LegalSection';
import { metaStyle, smStyle } from '../../../../lib/typography';

function Row({ label, children }: { label: string; children: string }) {
  return (
    <View className="flex-row gap-3 mb-2">
      <Text className="text-text-tertiary" style={[metaStyle, { width: 96 }]}>{label}</Text>
      <Text className="flex-1 text-text-secondary" style={metaStyle}>{children}</Text>
    </View>
  );
}

/** Miroir de apps/web/app/legal/confidentialite/page.tsx. */
export default function ConfidentialiteScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView className="flex-1 bg-paper-hi" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
      <BackButton label="Aide & support" className="mb-4" />
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 26 }} className="text-text-primary mb-1">
        Politique de confidentialité
      </Text>
      <Text className="text-text-tertiary mb-8" style={smStyle}>Dernière mise à jour : février 2026</Text>

      <LegalSection title="Qui sommes-nous ?">
        <LegalParagraph>
          Sillon est un journal musical social, projet indépendant non commercial. Cette
          politique décrit quelles données personnelles nous collectons, pourquoi, et quels
          droits vous avez sur celles-ci.
        </LegalParagraph>
        <Pressable onPress={() => Linking.openURL('mailto:sillon.contact@proton.me')}>
          <Text className="text-text-secondary" style={metaStyle}>
            Responsable de traitement : Sillon —{' '}
            <Text className="text-text-primary underline">sillon.contact@proton.me</Text>
          </Text>
        </Pressable>
      </LegalSection>

      <LegalSection title="Données collectées">
        <Row label="Compte">
          Adresse e-mail, nom d'affichage, nom d'utilisateur (@pseudo), biographie, photo de
          profil (optionnelle). Ces données sont nécessaires au fonctionnement du compte.
        </Row>
        <Row label="Activité musicale">
          Albums écoutés, notes (0–10), avis écrits, albums sauvegardés, albums favoris. Ces
          données sont le cœur du service.
        </Row>
        <Row label="Interactions">
          Relations de suivi (qui tu suis, qui te suit), likes et commentaires sur les avis.
        </Row>
        <Row label="Technique">
          Vercel Analytics collecte des données agrégées et anonymisées de navigation (pages
          vues, pays, type d'appareil) sans cookies ni identification individuelle.
        </Row>
        <LegalParagraph>
          Nous ne collectons aucune donnée de genre, d'âge, de localisation précise, ni aucune
          information de paiement. Nous n'utilisons pas de cookies publicitaires.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Finalités du traitement">
        <Row label="Compte">Authentification et gestion du compte — exécution du contrat.</Row>
        <Row label="Feed">Affichage du journal et du feed social — exécution du contrat.</Row>
        <Row label="Analytics">Amélioration du service (analytics anonymes) — intérêt légitime.</Row>
        <Row label="E-mails">Envoi d'e-mails de confirmation de compte — exécution du contrat.</Row>
      </LegalSection>

      <LegalSection title="Conservation des données">
        <LegalParagraph>
          Vos données sont conservées tant que votre compte est actif. En cas de suppression du
          compte, toutes vos données personnelles (profil, journal, avis, suivis) sont supprimées
          définitivement et immédiatement.
        </LegalParagraph>
        <LegalParagraph>
          Vous pouvez supprimer votre compte à tout moment depuis Réglages → Zone dangereuse →
          Supprimer mon compte.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Hébergement et transferts">
        <LegalParagraph>
          Les données sont hébergées par Supabase (infrastructure AWS, région Europe de l'Ouest)
          et Vercel (États-Unis). Ces transferts hors UE sont encadrés par les clauses
          contractuelles types de la Commission européenne.
        </LegalParagraph>
        <LegalParagraph>
          Les photos de profil sont stockées dans Supabase Storage. Les données musicales
          proviennent de MusicBrainz (CC0) et ne sont pas des données personnelles.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Vos droits (RGPD)">
        <LegalParagraph>
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
          des droits suivants :
        </LegalParagraph>
        <Row label="Accès">Consulter vos données via votre profil et votre journal.</Row>
        <Row label="Rectification">Modifier vos informations depuis les Réglages.</Row>
        <Row label="Suppression">Supprimer votre compte et toutes vos données depuis les Réglages.</Row>
        <Row label="Portabilité">Télécharger un export JSON de vos données depuis les Réglages.</Row>
        <Row label="Opposition">Vous opposer à un traitement spécifique par e-mail.</Row>
        <LegalParagraph>
          Pour exercer ces droits : sillon.contact@proton.me. Vous pouvez également introduire
          une réclamation auprès de la CNIL (cnil.fr).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Cookies">
        <LegalParagraph>
          Sillon utilise uniquement des cookies de session strictement nécessaires au maintien
          de votre connexion. Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Contact">
        <LegalParagraph>
          Pour toute question relative à vos données personnelles : sillon.contact@proton.me
        </LegalParagraph>
      </LegalSection>
    </ScrollView>
  );
}
