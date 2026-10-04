/* LA PETITE PLAYLIST, en bas de chaque deck.
 *
 * Mika, le 3 octobre 2026 : « il y a de l'espace pour une petite playlist en
 * bas ». Elle montre ce que montre le navigateur (le style choisi chez
 * Audius, ou le dossier ouvert de Mes morceaux, voir selection.ts), en
 * lignes courtes : le titre, l'artiste, le BPM, et la touche qui charge sur
 * ce deck. Une ligne ne charge pas au toucher : en plein mix, un doigt qui
 * fait defiler la liste ne doit pas remplacer le morceau qui joue. */

import { t } from '../langue/langue.ts';
import type { Morceau } from './morceau.ts';
import { TOUS, VRAC, duDossier, styleDe, useCaisse, useMorceauxDuStyle, useSelection } from './selection.ts';

interface Props {
  readonly cible: 0 | 1;
  /** Le morceau charge sur ce deck, pour le reperer dans la liste. */
  readonly actuel: string | null;
  readonly onChoisir: (m: Morceau, platine: 0 | 1) => void;
}

export function PlaylistVue({ cible, actuel, onChoisir }: Props) {
  const { source, style, dossier } = useSelection();
  const caisse = useCaisse();
  const duStyle = useMorceauxDuStyle(source === 'audius' ? style : null);
  const liste = source === 'fichiers' ? (caisse ? duDossier(caisse, dossier) : null) : duStyle;
  const titre =
    source === 'fichiers'
      ? dossier === TOUS
        ? t.navigateurMesMorceaux(0)
        : dossier === VRAC
          ? t.caisseEnVrac(liste?.length ?? 0)
          : dossier
      : (styleDe(style)?.nom ?? '');
  const lettre = cible === 0 ? 'A' : 'B';

  return (
    <section className="pl-playlist" aria-label={t.playlistTitre}>
      <div className="pl-playlist-tete">
        <span className="pl-playlist-nom">{titre}</span>
        {liste && <span>{liste.length}</span>}
      </div>
      {liste === null ? (
        <p className="pl-playlist-note">{t.navigateurCharge}</p>
      ) : liste.length === 0 ? (
        <p className="pl-playlist-note">{source === 'fichiers' ? t.caisseVide : t.navigateurVide}</p>
      ) : (
        <ul className="pl-playlist-liste">
          {liste.map((m) => (
            <li key={m.id} className="pl-playlist-ligne" aria-current={m.id === actuel ? 'true' : undefined}>
              <span className="pl-playlist-titres">
                <span className="pl-playlist-titre">{m.titre}</span>
                <span className="pl-playlist-artiste">{m.artiste}</span>
              </span>
              <span className="pl-playlist-bpm">{m.bpm ? m.bpm.toFixed(0) : '--'}</span>
              <button type="button" aria-label={t.playlistCharger(m.titre, lettre)} onClick={() => onChoisir(m, cible)}>
                {lettre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
