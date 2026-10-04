/* LA PETITE PLAYLIST, en bas de chaque deck.
 *
 * Mika, le 3 octobre 2026 : « il y a de l'espace pour une petite playlist en
 * bas ». Elle montre ce que montre le navigateur (le style choisi chez
 * Audius, ou le dossier ouvert de Mes morceaux, voir selection.ts), en
 * lignes courtes : le titre, l'artiste, le BPM, et deux touches, A et B,
 * pour envoyer le morceau sur l'un ou l'autre deck (Mika : « je peux
 * envoyer une track a A ou B »). Une ligne ne charge pas au toucher : en
 * plein mix, un doigt qui fait defiler la liste ne doit pas remplacer le
 * morceau qui joue.
 *
 * SUR TELEPHONE, le deck tient dans la fenetre et la playlist prend la
 * place qui reste. Sa touche d'en-tete l'agrandit par-dessus le jog, le
 * temps de choisir, puis elle se replie. */

import { useState } from 'react';
import { t } from '../langue/langue.ts';
import type { Morceau } from './morceau.ts';
import { TOUS, VRAC, dossierEffectif, duDossier, styleDe, useCaisse, useMorceauxDuStyle, useSelection } from './selection.ts';

interface Props {
  /** Les morceaux charges sur A et sur B, pour les reperer dans la liste. */
  readonly actuels: readonly [string | null, string | null];
  readonly onChoisir: (m: Morceau, platine: 0 | 1) => void;
}

export function PlaylistVue({ actuels, onChoisir }: Props) {
  const [grande, setGrande] = useState(false);
  const { source, style, dossier: dossierChoisi } = useSelection();
  const caisse = useCaisse();
  const dossier = caisse ? dossierEffectif(caisse, dossierChoisi) : dossierChoisi;
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

  return (
    <section className="pl-playlist" aria-label={t.playlistTitre} data-grande={grande}>
      <div className="pl-playlist-tete">
        <span className="pl-playlist-nom">{titre}</span>
        {liste && <span>{liste.length}</span>}
        <button
          type="button"
          className="pl-playlist-agrandir"
          aria-expanded={grande}
          aria-label={grande ? t.playlistReduire : t.playlistAgrandir}
          onClick={() => setGrande(!grande)}
        >
          <svg viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 7 L6 2 L11 7" />
          </svg>
        </button>
      </div>
      {liste === null ? (
        <p className="pl-playlist-note">{t.navigateurCharge}</p>
      ) : liste.length === 0 ? (
        <p className="pl-playlist-note">{source === 'fichiers' ? t.caisseVide : t.navigateurVide}</p>
      ) : (
        <ul className="pl-playlist-liste">
          {liste.map((m) => (
            <li key={m.id} className="pl-playlist-ligne" aria-current={actuels.includes(m.id) ? 'true' : undefined}>
              <span className="pl-playlist-titres">
                <span className="pl-playlist-titre">{m.titre}</span>
                <span className="pl-playlist-artiste">{m.artiste}</span>
              </span>
              <span className="pl-playlist-bpm">{m.bpm ? m.bpm.toFixed(0) : '--'}</span>
              <span className="pl-playlist-actions">
                {(['A', 'B'] as const).map((lettre, i) => (
                  <button
                    key={lettre}
                    type="button"
                    aria-label={t.playlistCharger(m.titre, lettre)}
                    aria-pressed={actuels[i] === m.id}
                    disabled={m.illisible}
                    onClick={() => {
                      setGrande(false);
                      onChoisir(m, i === 0 ? 0 : 1);
                    }}
                  >
                    {lettre}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
