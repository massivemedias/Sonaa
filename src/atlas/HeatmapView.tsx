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
import { SiteNav } from './SiteNav.tsx';
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

  /* ═══ LE ZOOM ═══════════════════════════════════════════════════════════
     Molette sur ordinateur, pincement a deux doigts sur telephone.

     Il est la CONDITION pour que les sous-styles soient affichables : sans
     lui, un pave de trente pixels ne porte aucun nom, et la vue devait se
     limiter aux quatorze familles. Avec lui, on montre tout et l'on approche
     ce qu'on veut lire.

     LE ZOOM EST UNE TRANSFORMATION, PAS UN RE-PAVAGE. Recalculer le treemap a
     chaque cran de molette redistribuerait les rectangles a chaque geste :
     l'oeil perdrait ce qu'il suivait, et ce serait un autre dessin a chaque
     fois, pas le meme vu de plus pres. */
  const [vue, setVue] = useState({ k: 1, x: 0, y: 0 });
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 8;

  /* On borne le deplacement pour qu'on ne puisse pas pousser la carte hors du
     cadre et se retrouver devant du vide sans savoir comment revenir. */
  const borner = useCallback((k: number, x: number, y: number, l: number, h: number) => {
    const marge = 0;
    const maxX = Math.max(marge, (k - 1) * l);
    const maxY = Math.max(marge, (k - 1) * h);
    return { k, x: Math.min(0, Math.max(-maxX, x)), y: Math.min(0, Math.max(-maxY, y)) };
  }, []);

  /* Zoomer AUTOUR D'UN POINT, et non autour du coin : sinon la molette
     emmene ailleurs que la ou le curseur pointe, et l'on passe son temps a
     rattraper la carte. */
  const zoomerVers = useCallback(
    (facteur: number, px: number, py: number) => {
      setVue((v) => {
        const el = cadre.current;
        if (!el) return v;
        const r = el.getBoundingClientRect();
        const k2 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * facteur));
        if (k2 === v.k) return v;
        const cx = px - r.left;
        const cy = py - r.top;
        const ratio = k2 / v.k;
        return borner(k2, cx - (cx - v.x) * ratio, cy - (cy - v.y) * ratio, r.width, r.height);
      });
    },
    [borner]
  );

  useEffect(() => {
    const el = cadre.current;
    if (!el) return undefined;

    /* `passive: false` est indispensable : sans lui `preventDefault` est
       ignore et la molette fait defiler la PAGE derriere la carte. */
    const molette = (e: WheelEvent): void => {
      e.preventDefault();
      zoomerVers(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', molette, { passive: false });

    /* LE PINCEMENT. Deux doigts suivis par leur identifiant : suivre « le
       premier et le dernier » casse des qu'un doigt se leve et se repose. */
    const doigts = new Map<number, { x: number; y: number }>();
    let ecart = 0;
    const bas = (e: PointerEvent): void => {
      if (e.pointerType !== 'touch') return;
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (doigts.size === 2) {
        const [a, b] = [...doigts.values()];
        if (a && b) ecart = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const bouge = (e: PointerEvent): void => {
      if (!doigts.has(e.pointerId)) return;
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (doigts.size !== 2) return;
      e.preventDefault();
      const [a, b] = [...doigts.values()];
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (ecart > 0 && d > 0) zoomerVers(d / ecart, (a.x + b.x) / 2, (a.y + b.y) / 2);
      ecart = d;
    };
    const haut = (e: PointerEvent): void => {
      doigts.delete(e.pointerId);
      if (doigts.size < 2) ecart = 0;
    };
    el.addEventListener('pointerdown', bas);
    el.addEventListener('pointermove', bouge, { passive: false });
    el.addEventListener('pointerup', haut);
    el.addEventListener('pointercancel', haut);

    return () => {
      el.removeEventListener('wheel', molette);
      el.removeEventListener('pointerdown', bas);
      el.removeEventListener('pointermove', bouge);
      el.removeEventListener('pointerup', haut);
      el.removeEventListener('pointercancel', haut);
    };
  }, [zoomerVers]);

  /* Changer de niveau remet le zoom a plat : rester zoome sur les coordonnees
     du niveau precedent montrerait un coin arbitraire du nouveau. */
  useEffect(() => setVue({ k: 1, x: 0, y: 0 }), [chemin]);

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

  /* LA TAILLE EST LE POIDS GENEALOGIQUE, ET RIEN D'AUTRE.

     Un curseur a existe ici, qui dosait entre descendance et popularite. Il
     est retire : les deux sources d'ecoute mesurees, Last.fm et YouTube, se
     sont revelees inaptes a dimensionner, chacune pour une raison distincte
     documentee dans `poids.ts`. Elles restent affichees sur la fiche du genre,
     ou elles informent sans deformer.

     La descendance est la seule grandeur qui vienne du corpus lui-meme et ne
     depende d'aucun service tiers. */
  const poidsCible = useCallback(
    (c: Cible): number =>
      c.kind === 'famille' ? poidsFamille(c.familyIndex) : poidsDe(genreDe(c)?.id ?? '').poids,
    []
  );

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

      /* ON SUBDIVISE TOUJOURS, DEPUIS QUE LA VUE SAIT ZOOMER.

         La regle qui suit bornait la subdivision a ce qui restait lisible sans
         zoom : sur telephone aucune famille ne s'ouvrait, et la carte
         n'affichait que quatorze blocs. Mika veut voir les sous-styles.

         Le compromis n'a plus lieu d'etre : ce qui ne se lit pas a l'echelle 1
         se lit en zoomant, et le nom reste dans l'infobulle. On garde un
         plancher minuscule, deux pixels, pour ne pas produire de rectangles
         d'aire nulle que le pavage ne saurait pas placer.

         ANCIENNE REGLE, conservee en commentaire parce qu'elle redeviendrait
         juste si le zoom disparaissait : le plus petit pave devait faire au
         moins 34 px de cote et 2200 px d'aire. */
      const essai = squarifier(enfants, poidsCible, p.x, p.y, p.w, p.h);
      if (essai.length === 0) continue;
      const pire = essai.reduce((mn, q) => (q.w * q.h < mn.w * mn.h ? q : mn));
      if (Math.min(pire.w, pire.h) < 2) continue;

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
      <div className="hm-chrome">
      <nav className="hm-fil" aria-label="Chemin">
        {/* LA FLECHE EST TOUJOURS LA, ET C'EST UNE QUESTION DE SORTIE.

            Elle n'apparaissait qu'une fois descendu d'un niveau. Au premier
            niveau, cette vue etait donc un cul-de-sac : plein ecran, aucun
            defilement, et rien pour revenir a l'atlas. Une vue sans sortie
            visible est une vue dont on sort en fermant l'onglet.

            Au premier niveau elle ramene a la carte, plus bas elle remonte
            d'un cran. Meme objet, meme place, deux destinations selon l'endroit
            ou l'on se trouve : c'est ce que fait un bouton retour. */}
        <button
          className="hm-retour"
          onClick={() => {
            if (chemin.length > 0) setChemin((p) => p.slice(0, -1));
            else window.location.hash = '';
          }}
          aria-label={chemin.length > 0 ? "Remonter d'un niveau" : "Revenir à l'atlas"}
        >
          <FaIcon icon={faChevronLeft} />
        </button>
        {/* LE LOGO EST PRESENT PARTOUT AILLEURS DANS LE PRODUIT, il manquait
            ici seul. Il ramene a l'atlas, comme sur toutes les autres pages. */}
        <a className="hm-logo" href="#/" aria-label="SONAA, revenir à l'atlas">
          <img src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`} alt="SONAA" draggable={false} />
        </a>
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
      <SiteNav variant="overlay" />
      </div>

      <div className="hm-cadre" ref={cadre}>
        {/* La transformation porte sur un calque unique : les rectangles ne
            sont pas recalcules, ils sont vus de plus pres. */}
        <div
          className="hm-calque"
          style={{ transform: `translate(${vue.x}px, ${vue.y}px) scale(${vue.k})` }}
        >
          {paves.map((p) => rendre(p, false))}
          {[...sousPaves.values()].flat().map((p) => rendre(p, true))}
        </div>
        {vue.k > 1.01 && (
          <button className="hm-zoom-reset" onClick={() => setVue({ k: 1, x: 0, y: 0 })}>
            {vue.k.toFixed(1)}× · tout voir
          </button>
        )}
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
