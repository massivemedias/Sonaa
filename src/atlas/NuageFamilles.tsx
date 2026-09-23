/* LE NUAGE DES QUATORZE FAMILLES.
 *
 * Mika, le 22 septembre 2026 : « remplacer la grille des familles par un
 * nuage de bulles ». Quatorze cercles empiles, un par famille, en matiere de
 * verre, dans la teinte du corpus.
 *
 * ═══ L'EMPILEMENT EST CALCULE, PAS DESSINE ═══
 *
 * `packSiblings` de d3-hierarchy range des cercles de rayons donnes en les
 * rendant tangents autour d'un centre commun. C'est la seule dependance
 * ajoutee, et on n'en prend que cette fonction : le reste de d3 n'entre pas.
 *
 * LE CALCUL EST DETERMINISTE. A meme entree, meme sortie : le nuage ne
 * tremble pas d'un rendu a l'autre, et il ne change qu'avec la largeur.
 *
 * ═══ LE RAYON SUIT LA RACINE DU NOMBRE DE GENRES ═══
 *
 * La racine et non le nombre : c'est l'AIRE du cercle qui doit dire la
 * taille de la famille, et l'aire va comme le carre du rayon. Une famille de
 * 24 genres couvre donc deux fois la surface d'une famille de 12, ce qu'on
 * lit ; a rayon proportionnel elle en couvrirait quatre fois, ce qu'on ne
 * lit pas.
 *
 * ═══ CE QUE LA LARGEUR IMPOSE ═══
 *
 * L'empilement rend un amas ROND : sa largeur et sa hauteur vont ensemble.
 * Sur un ecran etroit, quatorze cercles aux diametres demandes ne tiennent
 * pas, et c'est de l'arithmetique, pas un reglage : a 343 px de large l'amas
 * ne peut pas contenir quatorze disques de 90 px. Les rayons sont donc
 * reduits jusqu'a ce que l'amas entre, et le rapport entre eux ne bouge pas.
 * Voir le rapport de mission pour les mesures. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { packSiblings } from 'd3-hierarchy';
import { FAMILIES } from './structures.ts';
import { t } from '../langue/langue.ts';
import './nuage.css';

/** Les bornes demandees, en DIAMETRE, bureau puis telephone. */
const DIAMETRE = { bureau: [120, 220], telephone: [90, 160] } as const;
const SEUIL_TELEPHONE = 560;

/* LE FLOTTEMENT : six pixels de derive, sur un cycle tire entre huit et
   quatorze secondes. La duree et le retard viennent de l'index, donc ils
   sont stables et tous differents : quatorze bulles au meme rythme
   respireraient ensemble, ce qui se voit immediatement. */
const CYCLE_MIN = 8;
const CYCLE_MAX = 14;

interface BulleFamille {
  readonly fi: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

interface Nuage {
  readonly bulles: readonly BulleFamille[];
  readonly largeur: number;
  readonly hauteur: number;
}

/** L'encombrement d'une serie de cercles deja places. */
function boite(cercles: readonly { x: number; y: number; r: number }[]) {
  const x0 = Math.min(...cercles.map((c) => c.x - c.r));
  const x1 = Math.max(...cercles.map((c) => c.x + c.r));
  const y0 = Math.min(...cercles.map((c) => c.y - c.r));
  const y1 = Math.max(...cercles.map((c) => c.y + c.r));
  return { x0, y0, largeur: x1 - x0, hauteur: y1 - y0 };
}

function empiler(rayons: readonly number[]) {
  /* `packSiblings` ECRIT x et y DANS LES OBJETS qu'on lui passe : on lui en
     donne des neufs a chaque fois plutot que de recycler les siens. */
  const cercles = rayons.map((r) => ({ r }));
  packSiblings(cercles);
  return cercles as { r: number; x: number; y: number }[];
}

/* EXPORTEE POUR ETRE MESUREE. Le nuage est de l'arithmetique : des rayons,
   un empilement, un encombrement. C'est exactement ce qu'un test tient, et
   ce qu'un coup d'oeil a l'ecran ne tient pas. Voir NuageFamilles.test.ts. */
export function calculerNuage(largeurDispo: number): Nuage {
  const petit = largeurDispo < SEUIL_TELEPHONE;
  const [dMin, dMax] = petit ? DIAMETRE.telephone : DIAMETRE.bureau;
  const racines = FAMILIES.map((f) => Math.sqrt(f.count));
  const racineMax = Math.max(...racines);

  /* On part du plus gros diametre demande, puis on reduit si l'amas ne tient
     pas dans la largeur. Le plancher n'est tenu que s'il peut l'etre. */
  const rayonDe = (k: number) => racines.map((s) => Math.max(dMin / 2, k * s));
  let k = dMax / 2 / racineMax;
  let cercles = empiler(rayonDe(k));
  let b = boite(cercles);
  if (b.largeur > largeurDispo) {
    k *= largeurDispo / b.largeur;
    cercles = empiler(racines.map((s) => k * s));
    b = boite(cercles);
  }

  return {
    bulles: cercles.map((c, fi) => ({ fi, x: c.x - b.x0, y: c.y - b.y0, r: c.r })),
    /* LE SECOND EMPILEMENT REPASSE PAR DES FLOTTANTS, et rend une largeur qui
       peut depasser la cible d'un cent-milliardieme de pixel. Ce n'est rien a
       l'oeil et c'est un debordement pour une feuille de style. */
    largeur: Math.min(b.largeur, largeurDispo),
    hauteur: b.hauteur,
  };
}

interface Props {
  /** Les trois genres les plus anciens, par index de famille. */
  readonly representatifs: readonly (readonly string[])[];
  readonly onOuvrir: (fi: number) => void;
}

export function NuageFamilles({ representatifs, onOuvrir }: Props) {
  const boitier = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(0);

  /* LA LARGEUR EST MESUREE, PAS DEVINEE. Une media query dirait le format de
     l'ecran, pas la place reellement disponible dans cette colonne-la. */
  useEffect(() => {
    const el = boitier.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      if (e) setLargeur(e.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const nuage = useMemo(() => (largeur > 0 ? calculerNuage(largeur) : null), [largeur]);

  return (
    <div className="pv-nuage-boitier" ref={boitier}>
      {nuage && (
        <div
          className="pv-nuage"
          style={{ width: `${nuage.largeur}px`, height: `${nuage.hauteur}px` }}
        >
          {nuage.bulles.map((b) => {
            const f = FAMILIES[b.fi];
            if (!f) return null;
            const genres = representatifs[b.fi] ?? [];
            const cycle = CYCLE_MIN + ((b.fi * 7) % (CYCLE_MAX - CYCLE_MIN + 1));
            return (
              <div
                key={f.id}
                className="pv-bulle"
                style={{
                  left: `${b.x - b.r}px`,
                  top: `${b.y - b.r}px`,
                  width: `${b.r * 2}px`,
                  height: `${b.r * 2}px`,
                  /* LE DIAMETRE EST DONNE A LA FEUILLE DE STYLE pour que le
                     texte se regle dessus. Un corps choisi par media query
                     irait bien a la plus grosse bulle et deborderait de la
                     plus petite, qui dans le meme ecran fait moitie moins. */
                  '--d': `${b.r * 2}px`,
                  '--f-hue': f.hue,
                  animationDuration: `${cycle}s`,
                  animationDelay: `-${(b.fi * 1.7).toFixed(1)}s`,
                } as React.CSSProperties}
              >
                <button type="button" className="pv-bulle-corps" onClick={() => onOuvrir(b.fi)}>
                  <span className="pv-bulle-nom">{f.label}</span>
                  <span className="pv-bulle-n">{t.nGenres(f.count)}</span>
                  {genres.length > 0 && <span className="pv-bulle-genres">{genres.join(' · ')}</span>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
