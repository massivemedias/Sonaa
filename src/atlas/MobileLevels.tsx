/* LA NAVIGATION PAR NIVEAUX, SUR TÉLÉPHONE.

   POURQUOI ELLE EXISTE. La vue d'ensemble en trois dimensions ne fonctionne
   pas sous 768 px, capture à l'appui : les noms flottent trop loin de leurs
   sphères pour qu'on sache lequel va avec lequel, et les sphères sont trop
   petites pour être touchées. Ce n'est pas un défaut de réglage, c'est une
   projection de deux cent dix-huit objets dans la largeur d'un pouce.

   CE QU'ELLE NE REMPLACE PAS. La vue graphique d'un genre ouvert, elle,
   fonctionne sur téléphone, et c'est mesuré : les onze membres d'Electroclash
   tous affichés, aucun chevauchement, aucun hors cadre, à 320, 390 et 430 px.
   La ligne passe donc entre l'ENSEMBLE, qui échoue, et l'ARBRE LOCAL, qui
   réussit. Ce composant couvre le premier et cède la place au second.

   CE QU'ELLE GARDE DE L'ESPRIT DU SITE : la couleur de famille, la filiation
   lisible dans la descente, et les tracks à un tap.
   CE QU'ELLE PERD : la vision d'ensemble simultanée. C'est le prix, et sur un
   téléphone c'est le bon.

   Elle reprend la vue en cartes qui existait déjà, elle n'invente pas un
   écran : mêmes données, même ordre généalogique en profondeur d'abord. */

import { useEffect, useMemo, useState } from 'react';
import { FAMILIES, FAMILY_RING_IDS, STRUCTURES, type Genre } from './structures.ts';
import './mobile-levels.css';

interface Props {
  /** Ouvre la vue graphique du genre, avec sa fiche et ses tracks. */
  onOpen: (familyIndex: number, genreLocal: number) => void;
}

const familyIndexOf = (id: string): number => FAMILIES.findIndex((f) => f.id === id);

/** Rangées d'une famille, en profondeur d'abord : l'ordre généalogique. */
const rowsOf = (familyIndex: number): { genre: Genre; local: number }[] => {
  const structure = STRUCTURES[familyIndex];
  if (!structure) return [];
  const rows: { genre: Genre; local: number }[] = [];
  const walk = (local: number): void => {
    const genre = structure.genres[local];
    if (!genre) return;
    rows.push({ genre, local });
    for (const child of genre.children) walk(child);
  };
  walk(0);
  return rows;
};

/* LES GENRES PHARES, ET LE CRITÈRE EST DANS LES DONNÉES.

   Le corpus porte déjà un drapeau `major` : ce sont les genres qui comptent
   dans leur famille, et il est renseigné à la main, genre par genre. On ne
   réinvente donc pas un classement, on lit celui qui existe. Le fondateur est
   écarté : il porte souvent le nom de la famille, l'annoncer en aperçu ne dit
   rien de plus que le titre de la carte. */
const pharesOf = (familyIndex: number): string[] => {
  const rows = rowsOf(familyIndex).slice(1);
  const majeurs = rows.filter((r) => r.genre.major).map((r) => r.genre.label);
  const retenus = majeurs.length >= 2 ? majeurs : rows.map((r) => r.genre.label);
  return retenus.slice(0, 3);
};

const teinte = (hue: number, l = 0.72, c = 0.15): string => `oklch(${l} ${c} ${hue})`;

export function MobileLevels({ onOpen }: Props) {
  /* LE SEUIL EST 768 px, LE MÊME QUE CELUI DE LA LÉGENDE. Une seule frontière
     dans tout le projet : deux seuils différents pour « c'est un téléphone »
     est exactement le motif qui a coûté la semaine. */
  const [etroit, setEtroit] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const suivre = (): void => setEtroit(mq.matches);
    mq.addEventListener('change', suivre);
    return () => mq.removeEventListener('change', suivre);
  }, []);

  /* Le niveau courant : null = les quatorze familles, sinon les genres de
     cette famille. Deux niveaux seulement, et le fil d'Ariane les nomme. */
  const [famille, setFamille] = useState<number | null>(null);

  const familles = useMemo(
    () => FAMILY_RING_IDS.map(familyIndexOf).filter((fi) => fi >= 0),
    []
  );

  /* Échap remonte d'un niveau, comme la flèche. Le geste au clavier n'a pas
     de sens sur un téléphone, mais ce composant s'affiche aussi sur une
     fenêtre étroite d'ordinateur, et là il en a un. */
  useEffect(() => {
    if (famille === null) return undefined;
    const auClavier = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setFamille(null);
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [famille]);

  if (!etroit) return null;

  const f = famille !== null ? FAMILIES[famille] : undefined;
  const rows = famille !== null ? rowsOf(famille) : [];

  return (
    <div className="mn" data-niveau={famille === null ? 'familles' : 'genres'}>
      <nav className="mn-ariane" aria-label="Chemin">
        {famille === null ? (
          <span className="mn-crumb" data-current="true">Familles</span>
        ) : (
          <>
            <button
              className="mn-retour"
              onClick={() => setFamille(null)}
              aria-label="Revenir aux familles"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button className="mn-crumb" onClick={() => setFamille(null)}>Familles</button>
            <span className="mn-sep" aria-hidden="true">›</span>
            <span className="mn-crumb" data-current="true">{f?.label}</span>
          </>
        )}
      </nav>

      {famille === null ? (
        <ul className="mn-liste">
          {familles.map((fi) => {
            const fam = FAMILIES[fi];
            if (!fam) return null;
            const n = rowsOf(fi).length;
            const phares = pharesOf(fi);
            return (
              <li key={fam.id}>
                <button
                  className="mn-carte"
                  style={{ ['--famille' as string]: teinte(fam.hue) }}
                  onClick={() => setFamille(fi)}
                >
                  <span className="mn-carte-titre">{fam.label}</span>
                  <span className="mn-carte-compte">{n} genres</span>
                  {phares.length > 0 && (
                    <span className="mn-carte-phares">{phares.join(' · ')}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mn-liste">
          {rows.map(({ genre, local }) => (
            <li key={genre.id}>
              <button
                className="mn-carte"
                data-profondeur={Math.min(genre.depth, 3)}
                style={{ ['--famille' as string]: teinte(f?.hue ?? 0) }}
                onClick={() => onOpen(famille, local)}
              >
                <span className="mn-carte-titre">{genre.label}</span>
                <span className="mn-carte-compte">
                  {genre.bpmRange ? `${genre.bpmRange[0]}-${genre.bpmRange[1]} BPM` : 'sans tempo type'}
                  {genre.tracksEssentiel.length + genre.tracksActuel.length > 0
                    ? ` · ${genre.tracksEssentiel.length + genre.tracksActuel.length} tracks`
                    : ''}
                </span>
                {genre.children.length > 0 && (
                  <span className="mn-carte-phares">
                    {genre.children.length} dérivé{genre.children.length > 1 ? 's' : ''}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
