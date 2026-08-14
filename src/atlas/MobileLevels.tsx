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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, FAMILY_RING_IDS, STRUCTURES, type Genre } from './structures.ts';
import './mobile-levels.css';

interface Props {
  /** Ouvre la vue graphique du genre, avec sa fiche et ses tracks. */
  onOpen: (familyIndex: number, genreLocal: number) => void;
  /** Le genre reellement ouvert dans la page, quelle que soit la voie prise. */
  ouvert: { familyIndex: number; genreLocal: number } | null;
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

export function MobileLevels({ onOpen, ouvert }: Props) {
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

  /* TROIS NIVEAUX, et le troisieme n'est pas une liste : c'est la vue
     graphique du genre, qui vit sous ce composant. A ce niveau, la navigation
     ne garde que son fil d'Ariane et s'efface pour la decouvrir. */
  const [famille, setFamille] = useState<number | null>(null);
  const [genre, setGenre] = useState<number | null>(null);

  /* LA POSITION DE DEFILEMENT SURVIT A LA DESCENTE.

     C'est ce qui distingue une navigation d'un enchainement d'ecrans : revenir
     doit rendre la liste TELLE QU'ON L'A LAISSEE, pas la rembobiner en haut.
     Sans cela, descendre dans le trentieme genre d'une famille et revenir
     oblige a refaire trente rangees de defilement, et l'on cesse d'explorer. */
  const listeRef = useRef<HTMLUListElement | null>(null);
  const defilements = useRef<Map<string, number>>(new Map());
  const cleNiveau = genre !== null ? 'genre' : famille !== null ? `f${famille}` : 'familles';

  const memoriser = (): void => {
    if (listeRef.current) defilements.current.set(cleNiveau, listeRef.current.scrollTop);
  };

  const familles = useMemo(
    () => FAMILY_RING_IDS.map(familyIndexOf).filter((fi) => fi >= 0),
    []
  );

  /* DESCENDRE ET REMONTER, EN UN SEUL ENDROIT.

     Les quatre chemins de retour, la fleche, Echap, le bouton du navigateur et
     le fil d'Ariane, appellent TOUS `remonter`. Quatre implementations d'un
     meme geste finissent par diverger, c'est le motif des grandeurs ecrites
     deux fois applique a du comportement. */
  const descendre = (vers: { famille: number; genre?: number }): void => {
    memoriser();
    if (vers.genre === undefined) setFamille(vers.famille);
    else setGenre(vers.genre);
    window.history.pushState({ sonaaNiveau: vers.genre === undefined ? 'genres' : 'genre' }, '');
  };

  const remonter = (): void => {
    memoriser();
    if (genre !== null) setGenre(null);
    else if (famille !== null) setFamille(null);
  };

  /* LE BOUTON RETOUR DU NAVIGATEUR FAIT LA MEME CHOSE QUE LA FLECHE.

     Sur un telephone c'est le geste le plus utilise de tous, et sans cela il
     quitte le site au lieu de remonter d'un niveau : on perd le visiteur au
     premier reflexe. On empile une entree d'historique a chaque descente, et
     l'on remonte quand elle est depilee. */
  useEffect(() => {
    const auRetour = (): void => {
      if (genre !== null) setGenre(null);
      else if (famille !== null) setFamille(null);
    };
    window.addEventListener('popstate', auRetour);
    return () => window.removeEventListener('popstate', auRetour);
  }, [famille, genre]);

  useEffect(() => {
    if (famille === null && genre === null) return undefined;
    const auClavier = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') remonter();
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  });

  /* LA RECHERCHE OUVRE UN GENRE SANS PASSER PAR LES NIVEAUX, et c'est voulu :
     c'est le chemin le plus court, il ne doit pas changer. Mais la navigation
     doit le SUIVRE, sinon elle continuerait d'afficher sa liste par-dessus la
     vue graphique qu'on vient de demander. Elle se cale donc sur ce que la
     page dit reellement ouvert, quelle que soit la voie prise pour y arriver,
     et le fil d'Ariane se remplit tout seul. */
  /* MAIS PAS AU DEMARRAGE, et c'est tout le piege.

     La colonne du lecteur choisit un genre AU HASARD a l'ouverture du site,
     pour avoir quelque chose a jouer. Ce n'est pas une navigation, c'est un
     etat initial. Suivi tel quel, il faisait ouvrir la navigation directement
     sur la vue graphique d'un genre que personne n'avait demande : la liste
     des quatorze familles n'apparaissait jamais.

     Trouve en essayant, pas en relisant : le code etait juste, c'est ce qu'il
     suivait qui ne voulait pas dire ce que je croyais. On ignore donc la
     valeur presente au montage, et l'on ne suit que ses CHANGEMENTS. */
  const ouvertInitial = useRef(
    ouvert ? `${ouvert.familyIndex}:${ouvert.genreLocal}` : null
  );
  useEffect(() => {
    if (!ouvert) return;
    const cle = `${ouvert.familyIndex}:${ouvert.genreLocal}`;
    if (cle === ouvertInitial.current) return;
    ouvertInitial.current = cle;
    setFamille(ouvert.familyIndex);
    setGenre(ouvert.genreLocal);
  }, [ouvert]);

  /* La position rendue AVANT la peinture, sinon la liste apparait en haut puis
     saute a la bonne place, ce qui se voit. */
  useLayoutEffect(() => {
    const memo = defilements.current.get(cleNiveau);
    if (listeRef.current && memo !== undefined) listeRef.current.scrollTop = memo;
  }, [cleNiveau]);

  if (!etroit) return null;

  const f = famille !== null ? FAMILIES[famille] : undefined;
  const rows = famille !== null ? rowsOf(famille) : [];
  const genreOuvert =
    famille !== null && genre !== null ? STRUCTURES[famille]?.genres[genre] : undefined;
  const niveau = genre !== null ? 'genre' : famille === null ? 'familles' : 'genres';

  return (
    <div className="mn" data-niveau={niveau}>
      <nav className="mn-ariane" aria-label="Chemin">
        {niveau !== 'familles' && (
          <button
            className="mn-retour"
            onClick={remonter}
            aria-label={niveau === 'genre' ? `Revenir aux genres de ${f?.label}` : 'Revenir aux familles'}
          >
            <span aria-hidden="true">←</span>
          </button>
        )}
        <button
          className="mn-crumb"
          onClick={() => { memoriser(); setGenre(null); setFamille(null); }}
          data-current={niveau === 'familles'}
          disabled={niveau === 'familles'}
        >
          Familles
        </button>
        {famille !== null && (
          <>
            <span className="mn-sep" aria-hidden="true">›</span>
            {/* LE NIVEAU INTERMEDIAIRE RESTE CLIQUABLE depuis la vue graphique :
                c'est ce qui fait un fil d'Ariane et non un simple titre. */}
            <button
              className="mn-crumb"
              onClick={() => { memoriser(); setGenre(null); }}
              data-current={niveau === 'genres'}
              disabled={niveau === 'genres'}
            >
              {f?.label}
            </button>
          </>
        )}
        {genreOuvert && (
          <>
            <span className="mn-sep" aria-hidden="true">›</span>
            <span className="mn-crumb" data-current="true">{genreOuvert.label}</span>
          </>
        )}
      </nav>

      {niveau === 'genre' ? null : famille === null ? (
        <ul className="mn-liste" ref={listeRef}>
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
                  onClick={() => descendre({ famille: fi })}
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
        <ul className="mn-liste" ref={listeRef}>
          {rows.map(({ genre, local }) => (
            <li key={genre.id}>
              <button
                className="mn-carte"
                data-profondeur={Math.min(genre.depth, 3)}
                style={{ ['--famille' as string]: teinte(f?.hue ?? 0) }}
                onClick={() => {
                  descendre({ famille, genre: local });
                  onOpen(famille, local);
                }}
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
