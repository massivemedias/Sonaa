/* Les deux flèches et le score, à gauche d'une ligne de track.

   Même mécanique que le vote des propositions : optimiste, réconcilié,
   recliquer le même sens retire la voix. Le composant ne détient pas
   l'état : c'est la liste qui le porte, parce que c'est elle qui doit se
   retrier quand un score change. */

interface Props {
  readonly score: number;
  /** -1, 0 ou 1. */
  readonly monVote: number;
  readonly titre: string;
  readonly onVote: (valeur: 1 | -1) => void;
}

export function TrackVote({ score, monVote, titre, onVote }: Props) {
  return (
    <span className="tvote" onClick={(e) => e.stopPropagation()}>
      <button
        className={`tvote-b${monVote === 1 ? ' tvote-actif' : ''}`}
        onClick={() => onVote(1)}
        aria-label={`Soutenir ${titre}`}
        title="Soutenir"
      >
        ▲
      </button>
      <span className="tvote-score" aria-label={`Score ${score}`}>
        {score > 0 ? `+${score}` : score}
      </span>
      <button
        className={`tvote-b${monVote === -1 ? ' tvote-actif' : ''}`}
        onClick={() => onVote(-1)}
        aria-label={`Contester ${titre}`}
        title="Contester"
      >
        ▼
      </button>
    </span>
  );
}
