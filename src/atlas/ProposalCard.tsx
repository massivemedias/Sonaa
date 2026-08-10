/* Une proposition affichée : score, contenu, justification, décisions.

   Partagée par #/propositions et #/moderation. Les deux pages montrent la
   même chose et doivent continuer à le montrer de la même façon ; deux
   copies auraient divergé dès le premier ajustement. */

import { useState } from 'react';
import { STRUCTURES } from './structures.ts';
import {
  LIBELLE_CHAMP,
  trancher,
  type ChampEditable,
  type Proposition,
} from '../lib/proposals.ts';

export const LABEL_DE_GENRE = new Map<string, string>(
  STRUCTURES.flatMap((s) => s.genres.map((g) => [g.id, g.label] as [string, string]))
);

interface Props {
  readonly proposition: Proposition;
  readonly monVote: number;
  readonly estMienne: boolean;
  readonly connecte: boolean;
  readonly moderateur: boolean;
  readonly onVote: (p: Proposition, valeur: 1 | -1) => void;
  readonly onDecision: () => void;
  readonly onErreur: (message: string) => void;
}

export function ProposalCard({
  proposition: p,
  monVote,
  estMienne,
  connecte,
  moderateur,
  onVote,
  onDecision,
  onErreur,
}: Props) {
  const [note, setNote] = useState('');
  const [enCours, setEnCours] = useState(false);
  const genre = LABEL_DE_GENRE.get(p.genre_id) ?? p.genre_id;
  const payload = p.payload as Record<string, string>;
  const justification = payload.justification ?? '';

  const titre =
    p.kind === 'track'
      ? `${payload.artist ?? '?'} — ${payload.title ?? '?'}`
      : p.kind === 'genre_edit'
        ? `Correction : ${LIBELLE_CHAMP[(payload.field ?? 'description') as ChampEditable] ?? payload.field}`
        : `Filiation : viendrait de ${LABEL_DE_GENRE.get(payload.parent_id ?? '') ?? payload.parent_id}`;

  async function decider(statut: 'accepted' | 'rejected' | 'merged') {
    setEnCours(true);
    try {
      await trancher(p.id, statut, note);
      onDecision();
    } catch (e) {
      onErreur(e instanceof Error ? e.message : 'Décision impossible.');
    } finally {
      setEnCours(false);
    }
  }

  /* On ne vote ni sur sa propre proposition ni sur une affaire tranchée. La
     base le refuse déjà : le bouton désactivé épargne l'aller-retour et une
     erreur que la personne ne pouvait pas anticiper. */
  const voteImpossible = !connecte || estMienne || p.status !== 'pending';

  return (
    <li className="prop-carte">
      <div className="prop-votes">
        <button
          className={`prop-vote${monVote === 1 ? ' prop-vote-actif' : ''}`}
          onClick={() => onVote(p, 1)}
          disabled={voteImpossible}
          aria-label="Soutenir cette proposition"
          title={estMienne ? 'On ne vote pas sur sa propre proposition' : 'Soutenir'}
        >
          ▲
        </button>
        <span className="prop-score">{p.score > 0 ? `+${p.score}` : p.score}</span>
        <button
          className={`prop-vote${monVote === -1 ? ' prop-vote-actif' : ''}`}
          onClick={() => onVote(p, -1)}
          disabled={voteImpossible}
          aria-label="Contester cette proposition"
          title={estMienne ? 'On ne vote pas sur sa propre proposition' : 'Contester'}
        >
          ▼
        </button>
      </div>

      <div className="prop-corps">
        <h3>{titre}</h3>
        <p className="prop-meta">
          {genre} · {new Date(p.created_at).toLocaleDateString('fr-CA')} · {p.author_tag}
          {estMienne && <span className="prop-mienne">votre proposition</span>}
          {p.status !== 'pending' && (
            <>
              {' · '}
              <span className={`prop-etat prop-etat-${p.status}`}>
                {p.status === 'accepted'
                  ? 'acceptée'
                  : p.status === 'rejected'
                    ? 'refusée'
                    : 'reportée dans le corpus'}
              </span>
            </>
          )}
        </p>

        {p.kind === 'genre_edit' && payload.value && (
          <p className="prop-justification">
            <strong>Proposé :</strong> {payload.value}
          </p>
        )}
        {p.kind === 'track' && payload.url && (
          <p className="prop-meta">
            <a href={payload.url} target="_blank" rel="noopener noreferrer nofollow">
              source indiquée
            </a>
          </p>
        )}

        <p className="prop-justification">{justification}</p>

        {p.moderation_note && <p className="prop-meta">Note de modération : {p.moderation_note}</p>}

        {moderateur && p.status === 'pending' && (
          <div className="prop-moderation">
            <input
              type="text"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note de modération, facultative"
              aria-label="Note de modération"
            />
            <button className="contrib-bouton" disabled={enCours} onClick={() => void decider('accepted')}>
              Accepter
            </button>
            <button className="contrib-bouton" disabled={enCours} onClick={() => void decider('merged')}>
              Reportée dans le corpus
            </button>
            <button className="contrib-bouton" disabled={enCours} onClick={() => void decider('rejected')}>
              Refuser
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
