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
import { SiteNav } from './SiteNav.tsx';
import './credits.css';
import './contribute.css';

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
      <main className="credits">
        <header className="credits-head">
          <h1>Modération</h1>
        </header>
        <div className="credits-body">
          <p>
            Non disponible sur cette version du site. <a href="#/">Revenir à l&apos;accueil</a>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="credits">
      <a className="credits-skip" href="#moderation-contenu">
        Aller au contenu
      </a>

      <header className="credits-head">
        <a href="#/" aria-label="SONAA, revenir à l'accueil">
          <img
            src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`}
            alt="SONAA"
            draggable={false}
          />
        </a>
        <h1>Modération</h1>
      </header>

      <div id="moderation-contenu" className="credits-body">
        {!fil.connecte ? (
          <p className="prop-vide">
            Cette page demande une connexion. Elle ne montre rien de plus que{' '}
            <a href="#/propositions">les propositions</a>, elle ajoute les décisions.
          </p>
        ) : !fil.moderateur ? (
          <p className="prop-vide">
            Votre compte n&apos;est pas modérateur. La file ci-dessous est de toute façon
            publique : elle est visible sur <a href="#/propositions">la page des propositions</a>.
          </p>
        ) : (
          <p>
            Les propositions en attente, la plus soutenue en tête.{' '}
            <strong>Accepter ne publie rien</strong> : le corpus se modifie par commit, avec ses
            sources. Marquez « reportée dans le corpus » une fois le travail réellement fait.
          </p>
        )}

        {fil.erreur && (
          <p className="contrib-erreur" role="alert">
            {fil.erreur}
          </p>
        )}

        {fil.chargement ? (
          <p className="prop-vide">Lecture de la file…</p>
        ) : file.length === 0 ? (
          <p className="prop-vide">La file est vide.</p>
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

      <footer className="credits-foot">
        <SiteNav variant="page" />
      </footer>
    </main>
  );
}
