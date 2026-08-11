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

/* SEUIL DE CONTESTATION. Le tri fait deja descendre un morceau conteste en
   bas de liste, mais rien ne le disait a l'oeil : un « -7 » s'affichait dans
   la meme graisse et la meme couleur qu'un « +12 ».

   Cinq voix negatives nettes, c'est un desaccord qui ne vient pas d'un
   clic isole. En dessous, on ne signale rien : le bruit d'un ou deux votes
   ne doit pas jeter le doute sur une entree juste. */
const SEUIL_CONTESTE = -5;

export function TrackVote({ score, monVote, titre, onVote }: Props) {
  const conteste = score <= SEUIL_CONTESTE;
  return (
    <span className={`tvote${conteste ? ' tvote-en-doute' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button
        className={`tvote-b${monVote === 1 ? ' tvote-actif' : ''}`}
        onClick={() => onVote(1)}
        aria-label={`Soutenir ${titre}`}
        title="Soutenir"
      >
        ▲
      </button>
      <span
        className="tvote-score"
        aria-label={
          conteste
            ? `Score ${score}, cette version est contestee par les auditeurs`
            : `Score ${score}`
        }
        title={conteste ? 'Version contestee par les auditeurs' : undefined}
      >
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
