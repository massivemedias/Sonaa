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
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { FAMILIES, FAMILY_RING_IDS, STRUCTURES, type Genre } from './structures.ts';
import './mobile-levels.css';

interface Props {
  /** Ouvre la vue graphique du genre, avec sa fiche et ses tracks. */
  onOpen: (familyIndex: number, genreLocal: number) => void;
  /** Cadre la famille sur la carte pendant qu'on lit sa liste. */
  onFamille: (familyIndex: number) => void;
  /** Ramene la carte au cadrage d'ensemble, pour la contemplation. */
  onEnsemble: () => void;
  /** Ouvre la recherche, chemin le plus court vers un genre. */
  onChercher: () => void;
  /** Le genre reellement ouvert dans la page, quelle que soit la voie prise. */
  ouvert: { familyIndex: number; genreLocal: number } | null;
  /* CE QUE LA CARTE MONTRE, tel que le moteur le publie.

     EN CONTEMPLATION, LE FIL NE SUIVAIT PAS. Toucher le nom d'une famille sur
     la vue d'ensemble entre bien dans cette famille, le moteur fait son
     travail. Mais l'en-tete continuait d'annoncer « Revenir a la navigation »
     pendant que la carte montrait les genres d'une famille : l'ecran se
     contredisait, et sur un telephone c'est le seul repere disponible.

     La cause est structurelle et vaut d'etre nommee : ce composant tenait sa
     propre idee du niveau courant, alimentee par SES boutons. Un chemin qui ne
     passe pas par eux, ici le toucher sur la carte, lui restait invisible.
     Deux sources de verite pour une seule realite, le motif du projet.

     Il lit desormais l'etat du moteur, qui est vrai quel que soit le chemin. */
  nav: { level: 'atlas' | 'family' | 'genre'; familyLabel: string; genreLabel: string } | null;
  /** Remonte d'un cran DANS LA CARTE, puisque c'est elle qui navigue. */
  onRemonterCarte: () => void;
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

export function MobileLevels({ onOpen, onFamille, onEnsemble, onChercher, ouvert, nav, onRemonterCarte }: Props) {
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

  /* LA VUE D'ENSEMBLE EN CONTEMPLATION, ET LE MOT EST LE BON.

     Elle est belle et elle ne sert pas a naviguer : c'est exactement le
     constat qui a fait construire cette navigation. On la garde donc
     accessible, mais comme un objet qu'on regarde, avec un seul geste pour en
     sortir et rien d'autre a l'ecran. */
  const [contemplation, setContemplation] = useState(false);

  /* LA POSITION DE DEFILEMENT SURVIT A LA DESCENTE.

     C'est ce qui distingue une navigation d'un enchainement d'ecrans : revenir
     doit rendre la liste TELLE QU'ON L'A LAISSEE, pas la rembobiner en haut.
     Sans cela, descendre dans le trentieme genre d'une famille et revenir
     oblige a refaire trente rangees de defilement, et l'on cesse d'explorer. */
  const listeRef = useRef<HTMLUListElement | null>(null);
  const defilements = useRef<Map<string, number>>(new Map());
  /* LA CONTEMPLATION FAIT PARTIE DE LA CLE, et l'oubli se voyait : en sortant
     de la vue d'ensemble, la liste revenait en haut. La cle ne changeait pas,
     donc la restitution ne se declenchait pas, alors que la liste avait bel et
     bien ete demontee et remontee a zero. */
  const cleNiveau = contemplation
    ? 'ensemble'
    : genre !== null
      ? 'genre'
      : famille !== null
        ? `f${famille}`
        : 'familles';

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
  /* UN SEUL CHEMIN, ET CETTE FOIS POUR DE BON.

     J'avais ecrit que les quatre retours appellent la meme fonction, et je ne
     l'avais applique qu'a moitie : la fleche changeait l'etat SANS depiler
     l'historique. Les deux se desynchronisaient, et le bouton du navigateur,
     arrivant sur une pile qui contenait une entree de trop, remontait de deux
     niveaux d'un coup. Depuis la vue graphique il ramenait aux familles au
     lieu des genres.

     Regression trouvee en rejouant l'etape precedente apres avoir touche a
     celle-ci, ce qui est tout l'interet de rejouer. Desormais l'historique est
     la SEULE source : remonter depile, et c'est le depilement qui change
     l'etat. Une seule ecriture, donc rien a desynchroniser. */
  const empilees = useRef(0);

  /* LE NIVEAU COURANT EST LU DANS DES REFERENCES, PAS DANS UNE FERMETURE.

     L'ecouteur du bouton retour est enregistre une fois par rendu ; s'il lit
     l'etat capture au moment de son enregistrement, il peut remonter d'un
     niveau qui n'est plus le niveau courant, et il remonte alors de deux crans
     d'un coup. Symptome observe : depuis la vue graphique, le bouton du
     navigateur ramenait aux familles au lieu des genres.

     Les mises a jour fonctionnelles suppriment la question : chacune lit la
     valeur au moment ou elle s'applique, pas au moment ou elle a ete ecrite. */
  const monterDUnCran = (): void => {
    let traite = false;
    setContemplation((c) => {
      if (c) traite = true;
      return false;
    });
    setGenre((g) => {
      if (traite) return g;
      if (g !== null) { traite = true; return null; }
      return g;
    });
    setFamille((f) => (traite ? f : null));
  };

  const descendre = (vers: { famille: number; genre?: number }): void => {
    memoriser();
    if (vers.genre === undefined) setFamille(vers.famille);
    else setGenre(vers.genre);
    empilees.current += 1;
    window.history.pushState({ sonaaNiveau: vers.genre === undefined ? 'genres' : 'genre' }, '');
  };

  const remonter = (): void => {
    memoriser();
    if (empilees.current > 0) {
      /* Le depilement declenche popstate, qui fera le changement d'etat. */
      window.history.back();
      return;
    }
    monterDUnCran();
  };

  /* LE BOUTON RETOUR DU NAVIGATEUR FAIT LA MEME CHOSE QUE LA FLECHE.

     Sur un telephone c'est le geste le plus utilise de tous, et sans cela il
     quitte le site au lieu de remonter d'un niveau : on perd le visiteur au
     premier reflexe. On empile une entree d'historique a chaque descente, et
     l'on remonte quand elle est depilee. */
  useEffect(() => {
    const auRetour = (): void => {
      memoriser();
      if (empilees.current > 0) empilees.current -= 1;
      monterDUnCran();
    };
    window.addEventListener('popstate', auRetour);
    return () => window.removeEventListener('popstate', auRetour);
  }, [famille, genre, contemplation]);

  useEffect(() => {
    if (famille === null && genre === null && !contemplation) return undefined;
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
  const niveau = contemplation
    ? 'ensemble'
    : genre !== null
      ? 'genre'
      : famille === null
        ? 'familles'
        : 'genres';

  return (
    <div className="mn" data-niveau={niveau}>
      {/* LA CARTE NAVIGUE, LA COUCHE N'EST PLUS QU'UN FIL D'ARIANE.

          Elle portait des listes qui la recouvraient, construites quand la vue
          en trois dimensions ne savait pas naviguer sur telephone : spheres
          trop petites, etiquettes superposees, branches hors cadre. Ce constat
          etait juste, il a cesse de l'etre. Les plaques ont remplace les
          etiquettes, la vue d'ensemble tient aux quatorze familles, les noeuds
          s'ecartent quand la taille ne suffit plus.

          Le fil se lit donc dans le MOTEUR et non dans l'etat de ce composant.
          C'est la correction de fond : ce composant tenait sa propre idee du
          niveau courant, alimentee par SES boutons, et un chemin qui ne passe
          pas par eux, ici le toucher sur la carte, lui restait invisible. */}
      {niveau === 'ensemble' || niveau === 'familles' ? (
        <nav className="mn-ariane" aria-label="Chemin">
          {nav && nav.level !== 'atlas' && (
            <button className="mn-retour" onClick={onRemonterCarte} aria-label="Remonter d'un niveau">
              <FaIcon icon={faChevronLeft} />
            </button>
          )}
          {niveau === 'ensemble' && (
            <button className="mn-retour" onClick={remonter} aria-label="Revenir a la navigation">
              <FaIcon icon={faChevronLeft} />
            </button>
          )}
          {/* DANS UN GENRE, LE CHEMIN ENTIER TIENT EN UN SEUL SIGNE.

              Mesure a 390 px : la barre laisse 170 px au fil, et trois
              segments n'y tiennent pas. Reduits, ils donnaient « F... > ... >
              DOWNTEM... », c'est a dire trois troncatures dont celle du nom
              qu'on est venu lire.

              La racine et la famille fusionnent donc en UN point de
              suspension, ce qui rend au genre ouvert toute la largeur. La
              fleche blanche a gauche fait deja le retour, et le point de
              suspension reste touchable pour remonter. */}
          {nav && nav.level === 'genre' ? (
            <button className="mn-crumb mn-crumb-elide" onClick={onRemonterCarte} aria-label="Remonter aux familles">
              …
            </button>
          ) : (
            <button className="mn-crumb" onClick={onRemonterCarte} disabled={!nav || nav.level === 'atlas'}>
              Familles
            </button>
          )}
          {nav && nav.level !== 'atlas' && nav.familyLabel && (
            <>
              <span className="mn-sep" aria-hidden="true">›</span>
              {/* LE SEGMENT DU MILIEU S'EFFACE, IL NE SE RETRECIT PAS.

                  DEFAUT VU SUR CAPTURE IPHONE : « F > D. > DOWNTEM... ». En
                  laissant la mise en page serrer les segments, les
                  intermediaires tombaient a une lettre, ce qui n'apprend rien,
                  ET la destination restait coupee quand meme. On perdait des
                  deux cotes.

                  Quand on est DANS un genre, le nom de sa famille n'est plus
                  l'information utile : ce qu'on veut lire est le genre ouvert.
                  Le segment du milieu devient donc un point de suspension
                  franc, ce qui rend toute sa largeur au dernier. Le nom reste
                  disponible au toucher et pour un lecteur d'ecran. */}
              {nav.level === 'genre' ? null : (
                <span className="mn-crumb" data-current="true">{nav.familyLabel}</span>
              )}
            </>
          )}
          {nav && nav.level === 'genre' && nav.genreLabel && (
            <>
              <span className="mn-sep" aria-hidden="true">›</span>
              <span className="mn-crumb" data-current="true">{nav.genreLabel}</span>
            </>
          )}
        </nav>
      ) : (
      <nav className="mn-ariane" aria-label="Chemin">
        {/* Ce bandeau ne sert plus qu'aux niveaux « genres » et « genre » :
            le niveau des familles est passe au fil pilote par le moteur. */}
        <button
          className="mn-retour"
          onClick={remonter}
          aria-label={niveau === 'genre' ? `Revenir aux genres de ${f?.label}` : 'Revenir aux familles'}
        >
          <FaIcon icon={faChevronLeft} />
        </button>
        {/* ENTIERS, OU UN SEUL POINT DE SUSPENSION. JAMAIS DEUX LETTRES.

            DEFAUT VU SUR CAPTURE IPHONE : « FAM... > B... > DUBSTEP ». Serres
            par la mise en page, les segments intermediaires tombaient a deux
            caracteres suivis de points. Ce n'est plus un mot, ce n'est pas
            encore un signe : c'est du bruit qui occupe la place des deux.

            Des qu'un genre est ouvert, les deux segments qui precedent
            fusionnent donc en UN point de suspension, entier et touchable, qui
            remonte aux familles. Le chemin complet reste dans son etiquette
            d'accessibilite. Au niveau des genres, ou il n'y a que deux
            segments, ils s'affichent tels quels. */}
        {genreOuvert ? (
          <button
            className="mn-crumb mn-crumb-elide"
            onClick={() => {
              memoriser();
              const sauts = Math.min(empilees.current, (genre !== null ? 1 : 0) + (famille !== null ? 1 : 0));
              if (sauts > 0) { empilees.current -= sauts; window.history.go(-sauts); }
              setGenre(null);
              setFamille(null);
            }}
            aria-label={`Familles, ${f?.label ?? ''}`}
            title={`Familles › ${f?.label ?? ''}`}
          >
            …
          </button>
        ) : (
          <>
            <button
              className="mn-crumb"
              onClick={() => {
                memoriser();
                /* Sauter deux niveaux depile deux entrees : le fil d'Ariane ne
                   peut pas se permettre de laisser l'historique derriere lui. */
                const sauts = Math.min(empilees.current, (genre !== null ? 1 : 0) + (famille !== null ? 1 : 0));
                if (sauts > 0) { empilees.current -= sauts; window.history.go(-sauts); }
                setGenre(null);
                setFamille(null);
              }}
            >
              Familles
            </button>
            {famille !== null && (
              <>
                <span className="mn-sep" aria-hidden="true">›</span>
                {/* LE NIVEAU INTERMEDIAIRE RESTE CLIQUABLE depuis la vue
                    graphique : c'est ce qui fait un fil d'Ariane et non un
                    simple titre. */}
                <button
                  className="mn-crumb"
                  onClick={() => { memoriser(); if (genre !== null) remonter(); }}
                  data-current={niveau === 'genres'}
                  disabled={niveau === 'genres'}
                >
                  {f?.label}
                </button>
              </>
            )}
          </>
        )}
        {genreOuvert && (
          <>
            <span className="mn-sep" aria-hidden="true">›</span>
            <span className="mn-crumb" data-current="true">{genreOuvert.label}</span>
          </>
        )}
        {/* LA LOUPE VIT DANS LE BANDEAU, et il a fallu l'y mettre.

            Celle de la page est en haut a droite, sous ma couche : au niveau
            des familles cette couche est opaque, donc la loupe etait
            invisible ET intouchable. Or la recherche est le chemin le plus
            court vers un genre et ne doit jamais disparaitre. Trouve au
            doigt : le bouton existait, il ne recevait rien. */}
      </nav>
      )}

      {/* LA LOUPE VIT HORS DU FIL D'ARIANE, ET C'EST UNE CONTRAINTE DE MISE EN
          PAGE, PAS UN CHOIX DE STRUCTURE.

          Elle etait dedans, poussee a droite par une marge automatique. Deux
          defauts en decoulaient, tous deux mesures a 320 px. Le fil DEFILE des
          qu'il porte trois niveaux, et une marge automatique ne pousse plus
          rien quand le contenu deborde : la loupe suivait le texte au lieu de
          rester au bord. Et le fil porte un flou d'arriere-plan, qui fait de
          lui un bloc conteneur : la reposer en absolu la calait sur le fil,
          pas sur l'ecran.

          Soeur du fil, elle se pose enfin par rapport a la couche. */}
      <button
        className="mn-loupe"
        onClick={onChercher}
        aria-label="Chercher un genre, un artiste, un label"
      >
        <span aria-hidden="true">⌕</span>
      </button>

      {niveau === 'familles' && (
        <>
          <button
            className="mn-ensemble"
            onClick={() => {
              memoriser();
              setContemplation(true);
              onEnsemble();
              empilees.current += 1;
              window.history.pushState({ sonaaNiveau: 'ensemble' }, '');
            }}
          >
            Voir l&apos;atlas en entier
            <span className="mn-ensemble-note">219 genres, 14 familles, a regarder</span>
          </button>
          <a className="mn-ensemble" href="#/chronologie">
            Chaîne chronologique
            <span className="mn-ensemble-note">les genres dans le temps, par famille</span>
          </a>
        </>
      )}

      {niveau === 'ensemble' || niveau === 'genre' ? null : famille === null ? (
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
                  onClick={() => {
                    descendre({ famille: fi });
                    onFamille(fi);
                  }}
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
                {/* UNE SEULE LIGNE D'INFORMATION, et non deux.

                    Deux lignes plus un titre forcaient la rangee au-dela de
                    cent pixels : on ne voyait plus que cinq genres a la fois et
                    l'on passait son temps a defiler. Tout tient sur une ligne,
                    separe par des points medians. */}
                <span className="mn-carte-compte">
                  {[
                    genre.bpmRange ? `${genre.bpmRange[0]}-${genre.bpmRange[1]} BPM` : null,
                    genre.tracks.length > 0
                      ? `${genre.tracks.length} tracks`
                      : null,
                    genre.children.length > 0
                      ? `${genre.children.length} dérivé${genre.children.length > 1 ? 's' : ''}`
                      : null
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
