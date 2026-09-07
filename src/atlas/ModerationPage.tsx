/* Route #/moderation : la file d'attente, triée par soutien décroissant.

   Cette page ne protège rien par elle-même. Ce qui protège la modération,
   ce sont les politiques RLS : un non-modérateur qui ouvre cette adresse ne
   verra aucun bouton, et s'il en fabriquait un, la base refuserait la mise à
   jour. L'écran ci-dessous est une commodité, pas une serrure, c'est
   pourquoi il ne cache rien qui ne soit déjà public.

   ACCEPTER N'IMPORTE RIEN. Une proposition acceptée reste une proposition :
   le corpus vit dans le dépôt et se modifie par commit, avec ses sources.
   « Reportée dans le corpus » est le statut qui dit que le travail a
   effectivement été fait, et c'est le seul qui signifie quelque chose pour
   un lecteur de l'atlas. */

import { CommentsModeration } from './CommentsModeration.tsx';
import { useMemo } from 'react';
import { contributionsActives } from '../lib/supabase.ts';
import { useFil } from '../lib/useFil.ts';
import { ProposalCard } from './ProposalCard.tsx';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import './credits.css';
import './contribute.css';
import { t } from '../langue/langue.ts';

export function ModerationPage() {
  const fil = useFil({ statut: 'pending' });

  /* Le plus soutenu d'abord : c'est là que l'arbitrage a le plus de valeur.
     À score égal, la plus ancienne passe devant, pour qu'une proposition ne
     puisse pas rester indéfiniment au fond de la pile. */
  const file = useMemo(
    () =>
      [...fil.propositions].sort(
        (a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at)
      ),
    [fil.propositions]
  );

  if (!contributionsActives) {
    return (
      <>
        <EnTeteSite />
        <main className="credits">
          <header className="credits-head">
            <h1>{t.moderation}</h1>
          </header>
          <div className="credits-body">
            <p>
              {t.nonDisponibleSurCetteVersion} <a href="#/">{t.revenirAccueilTexte}</a>.
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
      <a className="credits-skip" href="#moderation-contenu">
        Aller au contenu
      </a>

      <header className="credits-head">
        {/* PLUS DE LOGO ICI : la barre du haut en porte un. */}
        <h1>{t.moderation}</h1>
      </header>

      <div id="moderation-contenu" className="credits-body">
        {!fil.connecte ? (
          <p className="prop-vide">
            {t.pageDemandeConnexion}{' '}
            <a href="#/propositions">{t.lesPropositions}</a>{t.elleAjouteLesDecisions}
          </p>
        ) : !fil.moderateur ? (
          <p className="prop-vide">
            {t.pasModerateur} <a href="#/propositions">{t.laPageDesPropositions}</a>.
          </p>
        ) : (
          <p>
            {t.propositionsEnAttenteTete}{' '}
            <strong>{t.accepterNePublieRien}</strong>
            {t.corpusParCommit}
          </p>
        )}

        {fil.erreur && (
          <p className="contrib-erreur" role="alert">
            {fil.erreur}
          </p>
        )}

        {fil.chargement ? (
          <p className="prop-vide">{t.lectureDeLaFile}</p>
        ) : file.length === 0 ? (
          <p className="prop-vide">{t.laFileEstVide}</p>
        ) : (
          <>
            <p className="prop-meta">
              {file.length === 1 ? '1 proposition en attente' : `${file.length} propositions en attente`}.
            </p>
            <ul className="prop-liste">
              {file.map((p) => (
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

        {/* LES COMMENTAIRES SIGNALES. La vue reserve deja l'acces aux
            moderateurs par sa clause where : un simple connecte obtient
            zero ligne, l'interface n'a rien a proteger de plus. */}
        {fil.moderateur && <CommentsModeration />}
      </div>
      </main>
      <PiedDePage />
    </>
  );
}
