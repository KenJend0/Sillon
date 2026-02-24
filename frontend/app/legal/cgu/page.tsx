import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Conditions générales d'utilisation",
};

export default function CGU() {
    return (
        <article>
            <h1 className="text-h1 text-text-primary mb-2">Conditions générales d&apos;utilisation</h1>
            <p className="text-[13px] text-text-tertiary mb-10">Dernière mise à jour : février 2026</p>

            <Section title="Objet">
                <p>
                    Les présentes conditions régissent l'accès et l'utilisation de Waveform,
                    un journal musical social permettant de noter des albums, partager des avis
                    et suivre l'activité musicale de ses contacts.
                </p>
                <p className="mt-3">
                    En créant un compte, vous acceptez ces conditions dans leur intégralité.
                </p>
            </Section>

            <Section title="Accès au service">
                <p>
                    Waveform est accessible gratuitement. La création d'un compte est requise
                    pour accéder aux fonctionnalités sociales (journal, feed, abonnements).
                    Certaines pages (albums, artistes, exploration) sont accessibles sans compte.
                </p>
                <p className="mt-3">
                    Waveform se réserve le droit de suspendre ou supprimer un compte en cas
                    de violation des présentes conditions, sans préavis.
                </p>
            </Section>

            <Section title="Contenu utilisateur">
                <p>
                    Vous êtes seul·e responsable des contenus que vous publiez sur Waveform
                    (avis, notes, commentaires, bio). En publiant un contenu, vous déclarez :
                </p>
                <ul className="mt-3 space-y-2 list-disc list-inside">
                    <li>Être l'auteur ou disposer des droits nécessaires sur ce contenu.</li>
                    <li>Que ce contenu ne viole aucune loi applicable.</li>
                    <li>Que ce contenu ne porte pas atteinte aux droits de tiers.</li>
                </ul>
                <p className="mt-4">
                    Waveform n'héberge aucun fichier audio. Les pochettes et métadonnées
                    musicales proviennent de MusicBrainz (licence CC0) et du Cover Art Archive.
                </p>
            </Section>

            <Section title="Comportements interdits">
                <p>Il est interdit sur Waveform de :</p>
                <ul className="mt-3 space-y-2 list-disc list-inside">
                    <li>Publier des contenus haineux, discriminatoires, harcelants ou illégaux.</li>
                    <li>Usurper l'identité d'une autre personne.</li>
                    <li>Utiliser Waveform à des fins commerciales sans autorisation.</li>
                    <li>Tenter de compromettre la sécurité ou l'intégrité de la plateforme.</li>
                    <li>Créer plusieurs comptes pour contourner une suspension.</li>
                </ul>
            </Section>

            <Section title="Données musicales et droits tiers">
                <p>
                    Les informations musicales affichées (titres, artistes, albums, dates, pochettes)
                    sont issues de <strong>MusicBrainz</strong> et du <strong>Cover Art Archive</strong>,
                    publiés sous licence Creative Commons CC0.
                    Waveform ne revendique aucun droit sur ces données.
                </p>
                <p className="mt-3">
                    Si vous estimez qu'un contenu affiché porte atteinte à vos droits,
                    contactez-nous à{" "}
                    <a href="mailto:waveform.contact@proton.me" className="text-text-primary underline underline-offset-2">
                        waveform.contact@proton.me
                    </a>
                    .
                </p>
            </Section>

            <Section title="Disponibilité du service">
                <p>
                    Waveform est un projet indépendant fourni sans garantie de disponibilité.
                    Le service peut être interrompu, modifié ou arrêté à tout moment,
                    avec un préavis raisonnable dans la mesure du possible.
                </p>
            </Section>

            <Section title="Modification des conditions">
                <p>
                    Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront
                    informés des changements significatifs par e-mail ou notification dans l'application.
                    L'utilisation continue du service vaut acceptation des nouvelles conditions.
                </p>
            </Section>

            <Section title="Droit applicable">
                <p>
                    Les présentes conditions sont soumises au droit français.
                    En cas de litige, les parties s'engagent à rechercher une solution amiable
                    avant tout recours judiciaire.
                </p>
            </Section>

            <Section title="Contact">
                <p>
                    Pour toute question :{" "}
                    <a href="mailto:waveform.contact@proton.me" className="text-text-primary underline underline-offset-2">
                        waveform.contact@proton.me
                    </a>
                </p>
            </Section>
        </article>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-10">
            <h2 className="text-[17px] font-medium text-text-primary mb-4 pb-2 border-b border-border-divider">{title}</h2>
            <div className="text-[14px] text-text-secondary leading-relaxed space-y-2">
                {children}
            </div>
        </section>
    );
}
