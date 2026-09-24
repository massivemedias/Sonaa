/* LES TROIS PAGES LEGALES : conditions, confidentialite, mentions.
 *
 * Elles existent AVANT leur texte, et c'est le but. Vendre quoi que ce soit
 * sans elles n'est pas envisageable, et la loi 25 du Quebec s'applique deja
 * aux comptes ouverts aujourd'hui. Les monter maintenant, avec leurs
 * adresses, leurs titres, leur structure et leurs liens dans le pied, permet
 * de coller le texte de l'avocat dans une page qui existe, au lieu de
 * fabriquer trois pages en catastrophe le jour de la premiere vente.
 *
 * CHAQUE SECTION DIT QU'ELLE ATTEND. Une page juridique vide qui ne dit rien
 * laisse croire que le service n'a pas de conditions ; celle-ci dit quelles
 * questions seront traitees et que la reponse est en redaction. C'est la
 * meme regle que partout ici : une valeur absente se signale, elle ne
 * s'efface pas.
 *
 * UN SEUL COMPOSANT POUR TROIS PAGES. Elles ont la meme forme et le meme
 * squelette ; trois fichiers qui different par une liste de titres finiraient
 * par diverger sur la mise en page. */

import { useEffect } from 'react';
import { t } from '../langue/langue.ts';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import './credits.css';

interface Section {
  readonly titre: string;
  /** Le texte quand il existe ; sinon la section dit qu'elle attend. */
  readonly corps?: string;
}

function PageLegale({ titre, sections }: { titre: string; sections: readonly (string | Section)[] }) {
  useEffect(() => {
    document.title = `${titre} · SONAA`;
  }, [titre]);

  return (
    <>
      <EnTeteSite />
      <main className="credits">
        <header className="credits-head">
          <h1>{titre}</h1>
          <p className="credits-lede">{t.juridiqueEnRedaction}</p>
        </header>

        <div className="credits-body">
          {sections.map((s) => {
            const sec = typeof s === 'string' ? { titre: s } : s;
            return (
              <section key={sec.titre}>
                <h2>{sec.titre}</h2>
                <p>{sec.corps ?? t.juridiqueEnRedaction}</p>
              </section>
            );
          })}
        </div>

        <PiedDePage />
      </main>
    </>
  );
}

export function ConditionsPage() {
  return (
    <PageLegale
      titre={t.conditionsTitre}
      sections={[
        t.conditionsObjet,
        t.conditionsCompte,
        t.conditionsContenus,
        t.conditionsVente,
        t.conditionsResponsabilite,
        t.conditionsDroit,
      ]}
    />
  );
}

export function ConfidentialitePage() {
  return (
    <PageLegale
      titre={t.confidentialiteTitre}
      sections={[
        t.confidentialiteCollecte,
        t.confidentialiteUsage,
        /* LA SEULE PHRASE DEJA ECRITE : l'envoi a AudD, pose le 23 septembre
           2026 avec le retrait de la case de consentement. */
        { titre: t.confidentialitePartage, corps: t.confidentialitePartageCorps },
        t.confidentialiteConservation,
        t.confidentialiteDroits,
        t.confidentialiteContact,
      ]}
    />
  );
}

export function MentionsPage() {
  return (
    <PageLegale
      titre={t.mentionsTitre}
      sections={[t.mentionsEditeur, t.mentionsHebergement, t.mentionsContact, t.mentionsPropriete]}
    />
  );
}
