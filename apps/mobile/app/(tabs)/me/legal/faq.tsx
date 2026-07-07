import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../components/ui/BackButton';
import { LegalSection } from '../../../../components/legal/LegalSection';
import { metaStyle, smStyle } from '../../../../lib/typography';

const faq: { category: string; questions: { q: string; a: string }[] }[] = [
  {
    category: 'Utiliser Waveform',
    questions: [
      { q: "Comment logger un album que j'ai écouté ?", a: "Appuie sur + dans la barre de navigation, puis choisis J'ai écouté un album. Recherche l'album, ajoute une note de 0 à 10 et un avis (optionnel), puis valide. L'entrée apparaît dans ton journal et dans le feed de tes abonnés." },
      { q: 'Qu’est-ce que la wishlist / « À écouter » ?', a: "La wishlist regroupe les albums que tu veux écouter. Pour en ajouter un, appuie sur + puis Je veux écouter un album, ou depuis la page d'un album. Tu retrouves ta wishlist sur ton profil." },
      { q: 'Comment fonctionne le feed ?', a: "Le feed affiche l'activité récente des personnes que tu suis : leurs écoutes, notes, avis et albums sauvegardés. Plus tu suis de gens, plus ton feed est actif." },
      { q: 'Comment suivre quelqu’un ?', a: 'Recherche un utilisateur via la barre de recherche ou visite son profil via son @pseudo. Appuie sur Suivre. Tu peux consulter tes abonnés et tes suivis depuis ton profil.' },
      { q: 'Puis-je rendre mes avis privés ?', a: 'Pas pour l’instant. Toutes les entrées de journal sont publiques et visibles par tes abonnés. Un réglage de confidentialité par compte est prévu prochainement.' },
      { q: 'Comment signaler un contenu inapproprié ?', a: 'Utilise le bouton Signaler disponible sur chaque avis ou commentaire. Notre équipe de modération examine chaque signalement.' },
    ],
  },
  {
    category: 'Compte et données',
    questions: [
      { q: 'Comment modifier mon profil ?', a: 'Va dans Réglages (icône en haut à droite de ton profil). Tu peux y changer ton nom d’affichage, ta bio, ta photo de profil et tes albums favoris.' },
      { q: 'Puis-je changer mon @pseudo ?', a: "Oui, une seule fois. Va dans Réglages → Identifiants → Nom d'utilisateur. Choisis-le bien, car ce changement est définitif." },
      { q: "Je ne reçois pas l'e-mail de confirmation à l'inscription", a: "Vérifie ton dossier spam. Si le problème persiste, contacte-nous à waveform.contact@proton.me en précisant l'adresse utilisée à l'inscription." },
      { q: 'Comment changer mon adresse e-mail ?', a: "La modification d'adresse e-mail n'est pas encore disponible directement dans l'app. Contacte-nous à waveform.contact@proton.me depuis ton adresse actuelle." },
      { q: 'Comment supprimer mon compte ?', a: 'Va dans Réglages → Zone dangereuse → Supprimer mon compte. Cette action est irréversible : ton profil, ton journal, tes avis et toutes tes données sont supprimés définitivement.' },
      { q: 'Puis-je exporter mes données ?', a: "L'export automatique n'est pas encore disponible. Tu peux en faire la demande à waveform.contact@proton.me. Conformément au RGPD, nous répondrons sous 30 jours." },
      { q: "J'ai oublié mon mot de passe. Comment faire ?", a: 'Sur la page de connexion, appuie sur Mot de passe oublié. Tu recevras un e-mail avec un lien pour en créer un nouveau. Pense à vérifier tes spams si tu ne le reçois pas sous quelques minutes.' },
    ],
  },
  {
    category: 'Données musicales',
    questions: [
      { q: "D'où viennent les informations sur les albums et artistes ?", a: 'Toutes les données musicales (titres, artistes, dates de sortie, tracklists, pochettes) proviennent de MusicBrainz, une base de données musicale libre et ouverte, et du Cover Art Archive. Ces données sont publiées sous licence CC0 (domaine public).' },
      { q: 'Un album est manquant ou ses informations sont incorrectes. Que faire ?', a: "Si l'album n'apparaît pas dans la recherche, il n'est peut-être pas encore dans la base MusicBrainz. Une information erronée (titre, date, pochette...) vient aussi de cette base. Dans les deux cas, tu peux contribuer directement sur musicbrainz.org : la correction ou l'ajout sera repris sur Waveform une fois validé." },
      { q: 'Est-ce que Waveform propose du streaming musical ?', a: "Non. Waveform est un journal et réseau social musical, pas une plateforme de streaming. L'application n'héberge aucun fichier audio. Pour écouter un album, utilise Spotify, Apple Music, Deezer ou toute autre plateforme de ton choix." },
      { q: 'Les notes et avis sont-ils liés à d’autres sites ?', a: 'Non. Les notes et avis sur Waveform sont propres à la plateforme et à sa communauté. Ils ne sont pas synchronisés avec Last.fm, RateYourMusic ou d’autres services.' },
    ],
  },
];

/** Miroir de apps/web/app/faq/page.tsx. */
export default function FAQScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView className="flex-1 bg-paper-hi" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
      <BackButton label="Aide & support" className="mb-4" />
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 26 }} className="text-text-primary mb-1">
        Questions fréquentes
      </Text>
      <Pressable onPress={() => Linking.openURL('mailto:waveform.contact@proton.me')} className="mb-8">
        <Text className="text-text-secondary" style={smStyle}>
          Une autre question ? <Text className="text-text-primary underline">Écris-nous</Text>.
        </Text>
      </Pressable>

      {faq.map((section) => (
        <LegalSection key={section.category} title={section.category}>
          <View style={{ gap: 18 }}>
            {section.questions.map((item) => (
              <View key={item.q}>
                <Text className="text-text-primary mb-1.5" style={[metaStyle, { fontFamily: 'Inter_500Medium' }]}>{item.q}</Text>
                <Text className="text-text-secondary" style={[metaStyle, { lineHeight: 21 }]}>{item.a}</Text>
              </View>
            ))}
          </View>
        </LegalSection>
      ))}
    </ScrollView>
  );
}
