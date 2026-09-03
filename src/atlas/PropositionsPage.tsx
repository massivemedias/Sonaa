/* Route #/propositions : ce que le public propose, et ce qu'il en pense.

   C'est aussi la page de retour du lien magique (voir lib/auth.ts) : si une
   intention a été mise de côté avant l'envoi du courriel, elle est rejouée
   ici, formulaire pré-rempli. Rien de ce qui a été écrit n'est perdu, et
   aucun second lien n'est consommé. */

import { useEffect, useState } from 'react';
import { contributionsActives } from '../lib/supabase.ts';
import type { Brouillon, ProposalStatus } from '../lib/proposals.ts';
import { reprendreIntention, seDeconnecter } from '../lib/auth.ts';
import { useFil } from '../lib/useFil.ts';
import { ContributeDialog } from './ContributeDialog.tsx';
import { LABEL_DE_GENRE, ProposalCard } from './ProposalCard.tsx';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import './credits.css';
import './contribute.css';

type Filtre = ProposalStatus | 'toutes';

const FILTRES: readonly { readonly cle: Filtre; readonly label: string }[] = [
  { cle: 'pending', label: 'En attente' },
  { cle: 'accepted', label: 'Acceptées' },
  { cle: 'merged', label: 'Reportées' },
  { cle: 'rejected', label: 'Refusées' },
  { cle: 'toutes', label: 'Toutes' },
];

/** Le genre demandé dans l'adresse : #/propositions?genre=house */
function genreDeLAdresse(): string | null {
  const hash = window.location.hash;
  const q = hash.indexOf('?');
  if (q < 0) return null;
  return new URLSearchParams(hash.slice(q + 1)).get('genre');
}

export function PropositionsPage() {
  const [filtre, setFiltre] = useState<Filtre>('pending');
  const [genreFiltre, setGenreFiltre] = useState<string | null>(genreDeLAdresse);
  const [reprise, setReprise] = useState<Brouillon | null>(null);

  /* Le routeur de main.tsx ne recharge la page que si la ROUTE change. Or
     « Voir tous les genres » et les liens filtrés ne changent que la partie
     paramètres du fragment : sans cet écouteur, le lien changeait l'adresse
     et l'écran restait tel quel, ce qui donne l'impression d'un clic mort. */
  useEffect(() => {
    const auChangement = () => setGenreFiltre(genreDeLAdresse());
    window.addEventListener('hashchange', auChangement);
    return () => window.removeEventListener('hashchange', auChangement);
  }, []);

  const fil = useFil({ statut: filtre, genreId: genreFiltre });

  /* La reprise se lit une seule fois au montage : reprendreIntention()
     efface ce qu'elle rend, pour qu'un rechargement ne rouvre pas la modale
     indéfiniment. */
  useEffect(() => {
    const intention = reprendreIntention();
    const b = intention?.brouillon as Brouillon | undefined;
    if (b && typeof b === 'object' && 'kind' in b) setReprise(b);
  }, []);

  if (!contributionsActives) {
    return (
      <>
        <EnTeteSite />
        <main className="credits">
        <header className="credits-head">
          <h1>Propositions</h1>
        </header>
        <div className="credits-body">
          <p>
            Les propositions ne sont pas disponibles sur cette version du site. L&apos;atlas,
            lui, fonctionne entièrement. <a href="#/">Revenir à l&apos;accueil</a>.
          </p>
        </div>
        </main>
        <PiedDePage />
      </>
    );
  }

  return (
    <>
      <EnTeteSite />
      <main className="credits">
      <a className="credits-skip" href="#propositions-contenu">
        Aller au contenu
      </a>

      <header className="credits-head">
        {/* PLUS DE LOGO ICI : la barre du haut en porte un. Meme raison
            qu'aux credits, deux logos a quarante pixels ne disent pas deux
            fois le nom du site. */}
        <h1>Propositions</h1>
      </header>

      <div id="propositions-contenu" className="credits-body">
        <p>
          Ce que le public propose d&apos;ajouter ou de corriger. Chacun peut soutenir ou
          contester ; le score oriente la décision, il ne la prend pas.{' '}
          <strong>Une proposition acceptée n&apos;entre pas d&apos;elle-même dans l&apos;atlas</strong> :
          elle est reportée à la main dans le corpus, avec ses sources, comme tout le reste.
        </p>

        {genreFiltre && (
          <p>
            Filtré sur <strong>{LABEL_DE_GENRE.get(genreFiltre) ?? genreFiltre}</strong>.{' '}
            <a href="#/propositions">Voir tous les genres</a>.
          </p>
        )}

        {fil.connecte && (
          <p className="prop-meta">
            Connecté{fil.pseudonyme ? ` sous le pseudonyme ${fil.pseudonyme}` : ''}
            {fil.moderateur ? ', modérateur' : ''}.{' '}
            {fil.moderateur && <a href="#/moderation">File de modération</a>}{' '}
            <button
              className="contrib-bouton"
              onClick={() => {
                void seDeconnecter();
              }}
            >
              Se déconnecter
            </button>
          </p>
        )}

        <div className="prop-filtres">
          {FILTRES.map((f) => (
            <button
              key={f.cle}
              className={`prop-filtre${filtre === f.cle ? ' prop-filtre-actif' : ''}`}
              onClick={() => setFiltre(f.cle)}
              aria-pressed={filtre === f.cle}
            >
              {f.label}
            </button>
          ))}
        </div>

        {fil.erreur && (
          <p className="contrib-erreur" role="alert">
            {fil.erreur}
          </p>
        )}

        {fil.chargement ? (
          <p className="prop-vide">Lecture des propositions…</p>
        ) : fil.propositions.length === 0 ? (
          <p className="prop-vide">
            {filtre === 'pending'
              ? "Aucune proposition en attente. La fiche de chaque genre porte un bouton pour en déposer une."
              : 'Rien à afficher pour ce filtre.'}
          </p>
        ) : (
          <>
            <p className="prop-meta">
              {fil.propositions.length === 1
                ? '1 proposition'
                : `${fil.propositions.length} propositions`}
              {filtre === 'pending' ? ' en attente' : ''}.
            </p>
            <ul className="prop-liste">
              {fil.propositions.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposition={p}
                  monVote={fil.votes.get(p.id) ?? 0}
                  estMienne={fil.pseudonyme !== null && p.author_tag === fil.pseudonyme}
                  connecte={fil.connecte}
                  moderateur={fil.moderateur}
                  onVote={fil.cliquerVote}
                  onDecision={fil.recharger}
                  onErreur={fil.setErreur}
                />
              ))}
            </ul>
          </>
        )}
      </div>


      {reprise && (
        <ContributeDialog
          kind={reprise.kind}
          genreId={reprise.genreId}
          genreLabel={LABEL_DE_GENRE.get(reprise.genreId) ?? reprise.genreId}
          brouillonInitial={reprise}
          onClose={() => setReprise(null)}
          onEnvoye={fil.recharger}
        />
      )}
      </main>
      <PiedDePage />
    </>
  );
}
