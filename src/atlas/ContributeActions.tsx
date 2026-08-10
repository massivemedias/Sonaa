/* Les trois portes d'entrée de la contribution, au bas de la fiche de genre.

   « Donner son avis » n'apparaît que sur les filiations débattues : sur un
   rattachement établi, la question ne se pose pas, et un bouton qui invite à
   contester ce qui fait consensus fabriquerait du doute au lieu d'en
   recueillir.

   RIEN ICI NE CHARGE LE CLIENT SUPABASE. La disponibilité se lit dans
   lib/config.ts, deux variables d'environnement ; la modale et le comptage
   n'arrivent qu'à l'ouverture. Sans cette précaution, les 224 ko du client
   étaient imposés à quiconque ouvrait une fiche pour écouter une track. */

import { lazy, Suspense, useEffect, useState } from 'react';
import { contributionsActives } from '../lib/config.ts';
import { compterEnAttenteLeger } from '../lib/compte.ts';
import type { ProposalKind } from '../lib/proposals.ts';
import './contribute.css';

const ContributeDialog = lazy(() =>
  import('./ContributeDialog.tsx').then((m) => ({ default: m.ContributeDialog }))
);

interface Props {
  readonly genreId: string;
  readonly genreLabel: string;
  /** Vrai quand la fiche porte le badge « filiation débattue ». */
  readonly filiationDebattue: boolean;
}

export function ContributeActions({ genreId, genreLabel, filiationDebattue }: Props) {
  const [ouverte, setOuverte] = useState<ProposalKind | null>(null);
  const [enAttente, setEnAttente] = useState(0);

  /* Le compteur est la seule chose qui touche au réseau avant tout clic.
     Il passe par compterEnAttenteLeger, un fetch sans dépendance : le SDK
     n'arrive qu'avec la modale. Son échec est silencieux, un compteur
     absent ne doit jamais abîmer une fiche de genre. */
  useEffect(() => {
    if (!contributionsActives) return;
    let vivant = true;
    void compterEnAttenteLeger(genreId).then((n) => {
      if (vivant) setEnAttente(n);
    });
    return () => {
      vivant = false;
    };
  }, [genreId, ouverte]);

  if (!contributionsActives) return null;

  return (
    <section className="contrib-actions" aria-label="Contribuer">
      <h4>Contribuer</h4>
      <div className="contrib-actions-liste">
        <button className="contrib-bouton" onClick={() => setOuverte('track')}>
          Proposer une track
        </button>
        <button className="contrib-bouton" onClick={() => setOuverte('genre_edit')}>
          Signaler une correction
        </button>
        {filiationDebattue && (
          <button className="contrib-bouton" onClick={() => setOuverte('filiation')}>
            Donner son avis
          </button>
        )}
      </div>

      {enAttente > 0 && (
        <span className="contrib-compteur">
          {enAttente === 1
            ? '1 proposition en attente sur ce genre, '
            : `${enAttente} propositions en attente sur ce genre, `}
          <a href={`#/propositions?genre=${genreId}`}>à soutenir ou contester</a>.
        </span>
      )}

      {ouverte && (
        <Suspense fallback={null}>
          <ContributeDialog
            kind={ouverte}
            genreId={genreId}
            genreLabel={genreLabel}
            onClose={() => setOuverte(null)}
          />
        </Suspense>
      )}
    </section>
  );
}
