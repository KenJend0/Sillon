import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../components/ui/BackButton';
import { LegalSection, LegalParagraph } from '../../../../components/legal/LegalSection';
import { smStyle } from '../../../../lib/typography';

/** Miroir de apps/web/app/legal/cgu/page.tsx. */
export default function CGUScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView className="flex-1 bg-paper-hi" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
      <BackButton label="Aide & support" className="mb-4" />
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 26 }} className="text-text-primary mb-1">
        Conditions générales d'utilisation
      </Text>
      <Text className="text-text-tertiary mb-8" style={smStyle}>Dernière mise à jour : février 2026</Text>

      <LegalSection title="Objet">
        <LegalParagraph>
          Les présentes conditions régissent l'accès et l'utilisation de Sillon, un journal
          musical social permettant de noter des albums, partager des avis et suivre l'activité
          musicale de ses contacts.
        </LegalParagraph>
        <LegalParagraph>
          En créant un compte, vous acceptez ces conditions dans leur intégralité.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Accès au service">
        <LegalParagraph>
          Sillon est accessible gratuitement. La création d'un compte est requise pour accéder
          aux fonctionnalités sociales (journal, feed, abonnements). Certaines pages (albums,
          artistes, exploration) sont accessibles sans compte.
        </LegalParagraph>
        <LegalParagraph>
          Sillon se réserve le droit de suspendre ou supprimer un compte en cas de violation
          des présentes conditions, sans préavis.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Contenu utilisateur">
        <LegalParagraph>
          Vous êtes seul·e responsable des contenus que vous publiez sur Sillon (avis, notes,
          commentaires, bio). En publiant un contenu, vous déclarez être l'auteur ou disposer des
          droits nécessaires sur ce contenu, que ce contenu ne viole aucune loi applicable, et
          qu'il ne porte pas atteinte aux droits de tiers.
        </LegalParagraph>
        <LegalParagraph>
          Sillon n'héberge aucun fichier audio. Les pochettes et métadonnées musicales
          proviennent de MusicBrainz (licence CC0) et du Cover Art Archive.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Comportements interdits">
        <LegalParagraph>
          Il est interdit sur Sillon de publier des contenus haineux, discriminatoires,
          harcelants ou illégaux, d'usurper l'identité d'une autre personne, d'utiliser Sillon
          à des fins commerciales sans autorisation, de tenter de compromettre la sécurité ou
          l'intégrité de la plateforme, ou de créer plusieurs comptes pour contourner une
          suspension.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Données musicales et droits tiers">
        <LegalParagraph>
          Les informations musicales affichées (titres, artistes, albums, dates, pochettes) sont
          issues de MusicBrainz et du Cover Art Archive, publiés sous licence Creative Commons
          CC0. Sillon ne revendique aucun droit sur ces données.
        </LegalParagraph>
        <LegalParagraph>
          Si vous estimez qu'un contenu affiché porte atteinte à vos droits, contactez-nous à
          sillon.contact@proton.me.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Disponibilité du service">
        <LegalParagraph>
          Sillon est un projet indépendant fourni sans garantie de disponibilité. Le service
          peut être interrompu, modifié ou arrêté à tout moment, avec un préavis raisonnable dans
          la mesure du possible.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Modification des conditions">
        <LegalParagraph>
          Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés
          des changements significatifs par e-mail ou notification dans l'application.
          L'utilisation continue du service vaut acceptation des nouvelles conditions.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <LegalParagraph>
          Les présentes conditions sont soumises au droit français. En cas de litige, les parties
          s'engagent à rechercher une solution amiable avant tout recours judiciaire.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Contact">
        <LegalParagraph>Pour toute question : sillon.contact@proton.me</LegalParagraph>
      </LegalSection>
    </ScrollView>
  );
}
