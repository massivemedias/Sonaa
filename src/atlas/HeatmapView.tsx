/* LA CARTE DE CHALEUR, troisieme vue de l'atlas.

   DES RECTANGLES IMBRIQUES : la taille dit le poids genealogique, la couleur
   dit la famille. Tout tient sur un ecran, sans zoom ni deplacement, ce qui
   est exactement ce qui manquait sur telephone.

   ═══════════════════════════════════════════════════════════════════════
   POURQUOI ON NE MONTRE JAMAIS LES 219 GENRES D'UN COUP
   ═══════════════════════════════════════════════════════════════════════

   L'arithmetique l'interdit, quel que soit le poids choisi. Sur un ecran de
   390 x 740, l'aire divisee par 219 donne 1317 px par pave, soit 36 px de
   cote. Un nom en demande environ 64. Mesure faite avec le poids retenu :
   DIX-NEUF paves lisibles sur 219, deux cents trop petits.

   En descente, la meme surface respire : quatorze familles font 144 px de
   cote en moyenne, et les enfants directs d'une famille, entre deux et huit,
   entre 190 et 220 px. Le premier niveau montre donc les familles et leurs
   enfants DIRECTS, jamais la totalite.

   Ce n'est pas une simplification de confort, c'est la condition pour que la
   vue porte des noms. */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES, type Genre } from './structures.ts';
import { poidsDe } from './poids.ts';
import { squarifier, type Pave } from './treemap.ts';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import './heatmap.css';

interface Props {
  /** Ouvre la fiche du genre, comme les autres vues. */
  onOpen: (familyIndex: number, genreLocal: number) => void;
}

/** Ce qu'un pave represente : une famille entiere, ou un genre. */
type Cible =
  | { kind: 'famille'; familyIndex: number }
  | { kind: 'genre'; familyIndex: number; genreLocal: number };

const genreDe = (c: Cible): Genre | null =>
  c.kind === 'genre' ? (STRUCTURES[c.familyIndex]?.genres[c.genreLocal] ?? null) : null;

/* LE POIDS D'UNE FAMILLE EST LA SOMME DES POIDS DE SES MEMBRES, et non le
   poids de son fondateur : une famille large et plate compte autant qu'une
   famille etroite et profonde, ce qui est le sens de « importance ». */
const poidsFamille = (familyIndex: number): number => {
  const s = STRUCTURES[familyIndex];
  if (!s) return 1;
  return s.genres.reduce((n, g) => n + poidsDe(g.id).poids, 0);
};

/* LA TAILLE DU NOM SUIT LE RECTANGLE, avec un plancher a 11 px.

   Sous ce plancher un nom n'est plus lisible, il est decoratif. On ne le
   masque pas pour autant : un pave muet ne dit pas qu'il existe. Il est
   tronque par la feuille de style, ce qui laisse au moins ses premieres
   lettres et l'infobulle pour le reste. */
const PLANCHER_PX = 11;
const tailleDuNom = (w: number, h: number): number => {
  const parLargeur = w / 7.2;
  const parHauteur = h / 2.6;
  return Math.max(PLANCHER_PX, Math.min(22, Math.floor(Math.min(parLargeur, parHauteur))));
};

export function HeatmapView({ onOpen }: Props) {
  /* LE CHEMIN DE DESCENTE. Vide : les quatorze familles. Un genre : ses
     derives. C'est le seul etat de la vue, tout le reste s'en deduit. */
  const [chemin, setChemin] = useState<{ familyIndex: number; genreLocal: number }[]>([]);
  const [boite, setBoite] = useState({ w: 0, h: 0 });
  const [survole, setSurvole] = useState<Cible | null>(null);
  const cadre = useRef<HTMLDivElement | null>(null);

  /* LA MESURE VIENT DU DOM, PAS DE LA FENETRE. La vue vit sous un fil
     d'Ariane et au-dessus d'un lecteur dont les hauteurs changent : lire
     `innerHeight` donnerait un pavage qui deborde des deux cotes. */
  useLayoutEffect(() => {
    const el = cadre.current;
    if (!el) return undefined;
    const mesurer = (): void => {
      const r = el.getBoundingClientRect();
      setBoite({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    window.addEventListener('resize', mesurer);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', mesurer);
    };
  }, []);

  const courant = chemin.length > 0 ? chemin[chemin.length - 1] : null;

  /* CE QUI EST PAVE A CE NIVEAU. */
  const cibles = useMemo<Cible[]>(() => {
    if (!courant) return FAMILIES.map((_, i) => ({ kind: 'famille', familyIndex: i }) as Cible);
    const s = STRUCTURES[courant.familyIndex];
    const g = s?.genres[courant.genreLocal];
    if (!s || !g) return [];
    return g.children.map((local) => ({ kind: 'genre', familyIndex: courant.familyIndex, genreLocal: local }) as Cible);
  }, [courant]);

  const poidsCible = useCallback((c: Cible): number => {
    if (c.kind === 'famille') return poidsFamille(c.familyIndex);
    return poidsDe(genreDe(c)?.id ?? '').poids;
  }, []);

  const paves = useMemo<Pave<Cible>[]>(
    () => (boite.w > 0 && boite.h > 0 ? squarifier(cibles, poidsCible, 0, 0, boite.w, boite.h) : []),
    [cibles, poidsCible, boite]
  );

  /* AU PREMIER NIVEAU, CHAQUE FAMILLE SE SUBDIVISE EN SES ENFANTS DIRECTS.
     C'est ce qui donne une carte lisible d'entree : quatorze blocs, et dans
     chacun deux a huit genres, jamais les 219. */
  const sousPaves = useMemo(() => {
    if (courant) return new Map<number, Pave<Cible>[]>();
    const m = new Map<number, Pave<Cible>[]>();
    for (const p of paves) {
      if (p.item.kind !== 'famille') continue;
      const fi = p.item.familyIndex;
      const s = STRUCTURES[fi];
      const fondateur = s?.genres.find((g) => g.parent < 0);
      if (!s || !fondateur) continue;
      const enfants: Cible[] = fondateur.children.map((local) => ({ kind: 'genre', familyIndex: fi, genreLocal: local }));
      /* Le fondateur lui-meme occupe un pave : sans lui, ouvrir une famille
         ne montrerait pas la racine dont tout le reste descend. */
      const locFondateur = s.genres.indexOf(fondateur);
      enfants.unshift({ kind: 'genre', familyIndex: fi, genreLocal: locFondateur });

      /* ON NE SUBDIVISE QUE SI LES MORCEAUX PEUVENT PORTER UN NOM.

         MESURE A 320 x 568 : quatorze familles subdivisees donnent 103 paves
         pour 158 000 px de cadre, soit 39 px de cote en moyenne, et le plus
         petit tombait a 13 x 21. Un nom n'y tient pas, meme au plancher.

         La regle n'est donc pas « toujours subdiviser » mais « subdiviser
         quand ca reste lisible ». Sur un grand ecran toutes les familles
         s'ouvrent, sur un petit certaines restent entieres et se lisent au
         clic. La consigne est tenue la ou elle peut l'etre, et rien n'est
         affiche a une taille ou il ne se lit pas.

         ET LE TEST PORTE SUR LE PLUS PETIT PAVE REELLEMENT PRODUIT, pas sur
         une moyenne. Premiere version : une moyenne, qui laissait passer des
         paves de 21 x 16 dans une famille dont le fondateur pesait vingt fois
         ses feuilles. Une moyenne ne dit rien de la queue de distribution, et
         c'est exactement la queue qui pose probleme ici. On pave donc pour de
         vrai, puis on regarde le pire. */
      const essai = squarifier(enfants, poidsCible, p.x, p.y, p.w, p.h);
      if (essai.length === 0) continue;
      const pire = essai.reduce((mn, q) => (q.w * q.h < mn.w * mn.h ? q : mn));
      /* LE SEUIL EST CELUI D'UN NOM, PAS D'UNE CIBLE TACTILE.

         Premiere valeur : 22 px de cote et 900 px d'aire, c'est-a-dire un
         carre de 30. Mesure a 390 x 844 : elle laissait passer un pave de
         30 x 32 portant « Florida Breaks » tronque a deux lettres. Un pave
         cliquable n'est pas un pave lisible, et cette vue existe pour etre
         lue.

         Trente-quatre pixels de cote minimum et 2200 d'aire, soit un carre de
         47 : c'est la place qu'il faut pour quelques caracteres au plancher de
         11 px sans que le mot disparaisse. */
      if (Math.min(pire.w, pire.h) < 34 || pire.w * pire.h < 2200) continue;

      m.set(fi, essai);
    }
    return m;
  }, [paves, courant, poidsCible]);

  const nomDe = (c: Cible): string =>
    c.kind === 'famille' ? (FAMILIES[c.familyIndex]?.label ?? '') : (genreDe(c)?.label ?? '');

  const teinteDe = (c: Cible): number => FAMILIES[c.familyIndex]?.hue ?? 0;

  const descendre = (c: Cible): void => {
    /* TOUCHER UNE FAMILLE ENTRE DEDANS, par son fondateur. Sans cela, sur les
       ecrans ou aucune famille ne se subdivise, la vue etait un cul-de-sac :
       quatorze paves et rien qui repond. Un pave qui ne repond pas au toucher
       passe pour casse. */
    if (c.kind === 'famille') {
      const s = STRUCTURES[c.familyIndex];
      const fondateur = s?.genres.findIndex((g) => g.parent < 0) ?? -1;
      if (fondateur >= 0) setChemin([{ familyIndex: c.familyIndex, genreLocal: fondateur }]);
      return;
    }
    const g = genreDe(c);
    if (!g) return;
    if (g.children.length > 0) {
      setChemin((p) => [...p, { familyIndex: c.familyIndex, genreLocal: c.genreLocal }]);
      return;
    }
    /* UNE FEUILLE N'A RIEN OU DESCENDRE : on ouvre sa fiche plutot que de ne
       rien faire. Un pave qui ne repond pas au toucher passe pour casse. */
    onOpen(c.familyIndex, c.genreLocal);
  };

  /* Le bouton du navigateur remonte d'un cran, comme dans les autres vues. */
  useEffect(() => {
    const auRetour = (): void => setChemin((p) => (p.length > 0 ? p.slice(0, -1) : p));
    window.addEventListener('popstate', auRetour);
    return () => window.removeEventListener('popstate', auRetour);
  }, []);

  const fil = chemin.map((c) => STRUCTURES[c.familyIndex]?.genres[c.genreLocal]?.label ?? '');

  const rendre = (p: Pave<Cible>, sous: boolean) => {
    const nom = nomDe(p.item);
    const g = genreDe(p.item);
    const q = g ? poidsDe(g.id) : null;
    const taille = tailleDuNom(p.w, p.h);
    const infobulle = q
      ? `${nom} · ${q.derivesDirects} dérivé${q.derivesDirects > 1 ? 's' : ''} direct${q.derivesDirects > 1 ? 's' : ''}, ${q.descendance} genre${q.descendance > 1 ? 's' : ''} au total`
      : `${nom} · ${FAMILIES[p.item.familyIndex]?.count ?? 0} genres`;
    return (
      <button
        key={`${p.item.kind}-${p.item.familyIndex}-${p.item.kind === 'genre' ? p.item.genreLocal : 'f'}`}
        className={sous ? 'hm-pave hm-pave-sous' : 'hm-pave'}
        style={{
          left: `${p.x}px`,
          top: `${p.y}px`,
          width: `${p.w}px`,
          height: `${p.h}px`,
          '--hm-hue': teinteDe(p.item),
          '--hm-nom': `${taille}px`
        } as React.CSSProperties}
        title={infobulle}
        aria-label={infobulle}
        onClick={() => descendre(p.item)}
        onMouseEnter={() => setSurvole(p.item)}
        onMouseLeave={() => setSurvole(null)}
      >
        <span className="hm-nom">{nom}</span>
      </button>
    );
  };

  return (
    <div className="hm">
      <nav className="hm-fil" aria-label="Chemin">
        {chemin.length > 0 && (
          <button className="hm-retour" onClick={() => setChemin((p) => p.slice(0, -1))} aria-label="Remonter d'un niveau">
            <FaIcon icon={faChevronLeft} />
          </button>
        )}
        <button className="hm-crumb" onClick={() => setChemin([])} disabled={chemin.length === 0}>
          Familles
        </button>
        {fil.map((nom, i) => (
          <span key={nom + String(i)}>
            <span className="hm-sep" aria-hidden="true">›</span>
            <span className="hm-crumb" data-current={i === fil.length - 1}>{nom}</span>
          </span>
        ))}
      </nav>

      <div className="hm-cadre" ref={cadre}>
        {paves.map((p) => rendre(p, false))}
        {[...sousPaves.values()].flat().map((p) => rendre(p, true))}
      </div>

      {survole && (
        <div className="hm-bulle" role="status">
          <strong>{nomDe(survole)}</strong>
          {(() => {
            const g = genreDe(survole);
            if (!g) return <span>{FAMILIES[survole.familyIndex]?.count ?? 0} genres</span>;
            const q = poidsDe(g.id);
            /* LES DEUX CHIFFRES QUAND ILS DIFFERENT, et l'ecart raconte
               l'histoire : peu de derives directs et une descendance immense
               veut dire que l'influence a saute les frontieres de famille. */
            return (
              <span>
                {q.derivesDirects} dérivé{q.derivesDirects > 1 ? 's' : ''} direct{q.derivesDirects > 1 ? 's' : ''}
                {q.descendance !== q.derivesDirects && `, ${q.descendance} genres en descendent au total`}
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}
