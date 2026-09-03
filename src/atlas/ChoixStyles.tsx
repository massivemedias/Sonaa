/* CHOISIR JUSQU'A CINQ STYLES, SANS LISTE DEROULANTE.

   CE QUI N'ALLAIT PAS. Un `select` natif est haut de vingt pixels et montre
   une ligne a la fois : sur 219 entrees, il faut ouvrir, faire defiler, lire,
   choisir, et recommencer pour le deuxieme. Rien de ce qu'on a deja pris n'est
   visible pendant qu'on cherche le suivant, et rien ne dit ce qui existe.

   CE QUI LE REMPLACE. Un champ de recherche et un panneau ou les styles sont
   des boutons, groupes par famille. On voit une trentaine de possibilites d'un
   coup, ce qui est le point : personne ne connait les 219 noms par coeur, et
   le panneau sert autant a decouvrir qu'a choisir.

   LE PANNEAU NE S'OUVRE PAS TOUT SEUL. Deroule en permanence, il pousserait
   la description et le bouton d'envoi hors de l'ecran sur telephone. Il
   s'ouvre sur demande, et se referme quand le compte est atteint. */

import { useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES } from './structures.ts';
import { t } from '../langue/langue.ts';

const sansAccent = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tous les genres a plat, une fois pour toutes. */
const TOUS = FAMILIES.flatMap((f, fi) =>
  (STRUCTURES[fi]?.genres ?? []).map((g) => ({
    id: g.id,
    label: g.label,
    famille: f.label,
    cherche: sansAccent(`${g.label} ${f.label}`),
  }))
);

export const LABEL_DE_GENRE: Record<string, string> = Object.fromEntries(
  TOUS.map((g) => [g.id, g.label])
);

interface Props {
  readonly choisis: readonly string[];
  readonly onChange: (ids: string[]) => void;
  readonly max: number;
  /* LE TITRE EST FOURNI QUAND LA PHRASE PAR DEFAUT NE VEUT RIEN DIRE.
     « Styles, pour le ranger dans l'atlas » parle d'un set qu'on depose ;
     dans le calendrier il n'y a rien a ranger, seulement des styles a
     suivre. Un composant partage doit pouvoir se taire sur le contexte. */
  readonly titre?: string;
}

export function ChoixStyles({ choisis, onChange, max, titre }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [filtre, setFiltre] = useState('');
  const plein = choisis.length >= max;

  const parFamille = useMemo(() => {
    const q = sansAccent(filtre.trim());
    const gardes = q ? TOUS.filter((g) => g.cherche.includes(q)) : TOUS;
    const groupes = new Map<string, typeof TOUS>();
    for (const g of gardes) {
      const l = groupes.get(g.famille) ?? [];
      l.push(g);
      groupes.set(g.famille, l);
    }
    return [...groupes.entries()];
  }, [filtre]);

  const basculer = (id: string): void => {
    if (choisis.includes(id)) onChange(choisis.filter((x) => x !== id));
    else if (!plein) onChange([...choisis, id]);
  };

  return (
    <div className="cs">
      <p className="sp-label cs-titre">
        {titre ?? t.genresDuSet(max)}
        <span className="cs-compte">
          {choisis.length} / {max}
        </span>
      </p>

      {/* CE QUI EST CHOISI RESTE VISIBLE, panneau ouvert ou ferme. C'est la
          reponse a « qu'est-ce que j'ai deja mis », qu'un select ne donnait
          jamais. */}
      {choisis.length > 0 && (
        <ul className="sp-styles">
          {choisis.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => basculer(id)}
                aria-label={t.retirerLeStyle(LABEL_DE_GENRE[id] ?? id)}
              >
                {LABEL_DE_GENRE[id] ?? id}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="cs-ouvrir" onClick={() => setOuvert(!ouvert)}>
        {ouvert ? t.fermerLesStyles : choisis.length > 0 ? t.changerLesStyles : t.choisirLesStyles}
      </button>

      {ouvert && (
        <div className="cs-panneau">
          <input
            type="search"
            className="cs-recherche"
            placeholder={t.chercherUnStyle}
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
          />

          {parFamille.length === 0 ? (
            <p className="sp-aide">{t.aucunStyleTrouve}</p>
          ) : (
            <div className="cs-familles">
              {parFamille.map(([famille, genres]) => (
                <section key={famille}>
                  <h4 className="cs-famille">{famille}</h4>
                  <ul className="cs-genres">
                    {genres.map((g) => {
                      const pris = choisis.includes(g.id);
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            data-pris={pris}
                            /* UN BOUTON DEJA PRIS RESTE CLIQUABLE, pour le
                               retirer. Seuls les autres sont eteints quand le
                               compte est plein : desactiver ce qui est deja
                               choisi enfermerait dans une selection qu'on ne
                               pourrait plus defaire sans remonter aux
                               pastilles. */
                            disabled={plein && !pris}
                            onClick={() => basculer(g.id)}
                          >
                            {g.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
