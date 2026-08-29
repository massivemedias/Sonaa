/* L'ATLAS EN ACCORDEON, quatrieme vue.

   Les quatorze familles et leurs 219 genres imbriques, DEJA DEPLOYES, qu'on
   parcourt en defilant. C'est la seule vue ou l'arbre entier est lisible d'un
   bout a l'autre sans rien ouvrir.

   POURQUOI DEPLOYE PAR DEFAUT, alors qu'un accordeon est d'ordinaire ferme :
   un accordeon ferme demande de savoir ou chercher avant de chercher. Ici on
   vient justement pour voir ce qu'on ne sait pas encore. Le repli existe, il
   sert a mettre de cote ce qu'on a deja lu, pas a decouvrir.

   ELLE NE REMPLACE PAS LA CARTE. La carte en trois dimensions montre les
   distances et les greffes, l'accordeon montre la HIERARCHIE, et un texte
   indente se lit plus vite qu'un graphe quand on cherche un nom precis. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES, type Genre } from './structures.ts';
import { poidsDe } from './poids.ts';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { SiteNav } from './SiteNav.tsx';
import './accordeon.css';

interface Props {
  /** Ouvre la fiche du genre, comme les autres vues secondaires. */
  onOpen: (familyIndex: number, genreLocal: number) => void;
}

/** Une ligne aplatie : l'arbre est parcouru une fois, pas a chaque rendu. */
interface Ligne {
  readonly familyIndex: number;
  readonly genreLocal: number;
  readonly genre: Genre;
  readonly profondeur: number;
  /** Les identifiants des ancetres, pour savoir si un repli la cache. */
  readonly chemin: readonly string[];
}

/* L'APLATISSEMENT SE FAIT UNE FOIS POUR TOUTES, au chargement du module.
   Parcourir l'arbre a chaque rendu couterait 219 descentes recursives par
   frappe de clavier ou par repli, pour un resultat qui ne change jamais : la
   structure est figee, seul l'etat des replis bouge. */
const LIGNES_PAR_FAMILLE: Ligne[][] = FAMILIES.map((_, fi) => {
  const s = STRUCTURES[fi];
  if (!s) return [];
  const out: Ligne[] = [];
  const descendre = (local: number, profondeur: number, chemin: string[]): void => {
    const g = s.genres[local];
    if (!g) return;
    out.push({ familyIndex: fi, genreLocal: local, genre: g, profondeur, chemin: [...chemin] });
    /* LES ENFANTS DANS L'ORDRE DES DATES, comme sur la carte : l'accordeon
       raconte alors la meme histoire dans le meme sens que le reste du
       produit. Un ordre different d'une vue a l'autre ferait douter que ce
       soit le meme arbre. */
    const enfants = [...g.children].sort((a, b) => {
      const ga = s.genres[a];
      const gb = s.genres[b];
      return (ga?.annee ?? 0) - (gb?.annee ?? 0) || (ga?.label ?? '').localeCompare(gb?.label ?? '');
    });
    for (const e of enfants) descendre(e, profondeur + 1, [...chemin, g.id]);
  };
  const fondateur = s.genres.findIndex((g) => g.parent < 0);
  if (fondateur >= 0) descendre(fondateur, 0, []);
  return out;
});

export function AccordeonView({ onOpen }: Props) {
  /* CE QUI EST REPLIE, et non ce qui est deploye : l'ensemble vide est donc
     l'etat « tout ouvert », qui est celui qu'on veut au premier affichage.
     Stocker l'inverse obligerait a enumerer 219 identifiants au demarrage. */
  const [replies, setReplies] = useState<ReadonlySet<string>>(new Set());
  const [filtre, setFiltre] = useState('');

  const basculer = useCallback((id: string) => {
    setReplies((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const norm = (s: string): string =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const q = norm(filtre.trim());

  const visible = useCallback(
    (l: Ligne): boolean => {
      /* UNE RECHERCHE OUVRE TOUT SUR SON PASSAGE. Filtrer sans deplier
         cacherait la reponse derriere un repli, ce qui est le contraire du
         but : on chercherait un nom qu'on ne verrait pas. */
      if (q.length > 0) return norm(l.genre.label).includes(q);
      return !l.chemin.some((a) => replies.has(a));
    },
    [q, replies]
  );

  const familles = useMemo(
    () =>
      FAMILIES.map((f, fi) => ({
        f,
        fi,
        lignes: (LIGNES_PAR_FAMILLE[fi] ?? []).filter(visible)
      })).filter((x) => q.length === 0 || x.lignes.length > 0),
    [visible, q]
  );

  /* Le bouton retour du navigateur ferme la recherche avant de quitter la
     vue : sinon un filtre actif fait sortir du site en un geste. */
  useEffect(() => {
    const auRetour = (): void => setFiltre('');
    window.addEventListener('popstate', auRetour);
    return () => window.removeEventListener('popstate', auRetour);
  }, []);

  const total = FAMILIES.reduce((n, _, fi) => n + (LIGNES_PAR_FAMILLE[fi]?.length ?? 0), 0);

  return (
    <div className="ac">
      <div className="ac-chrome">
      <nav className="ac-fil" aria-label="Chemin">
        <a className="ac-retour" href="#/" aria-label="Revenir à l'atlas">
          <FaIcon icon={faChevronLeft} />
        </a>
        <a className="ac-logo" href="#/" aria-label="SONAA, revenir à l'atlas">
          <img src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`} alt="SONAA" draggable={false} />
        </a>
        <span className="ac-titre">L&apos;arbre</span>
        <input
          className="ac-filtre"
          type="search"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          placeholder="Chercher un genre"
          aria-label="Chercher un genre dans l'arbre"
        />
      </nav>
      <SiteNav variant="overlay" />
      </div>

      <div className="ac-corps">
        {q.length > 0 && (
          <p className="ac-compte" role="status">
            {familles.reduce((n, x) => n + x.lignes.length, 0)} genre(s) sur {total}
          </p>
        )}

        {familles.map(({ f, fi, lignes }) => (
          <section key={f.id} className="ac-famille" style={{ '--ac-hue': f.hue } as React.CSSProperties}>
            <h2 className="ac-famille-titre">
              <span className="ac-pastille" aria-hidden="true" />
              {f.label}
              <span className="ac-compte-famille">
                {LIGNES_PAR_FAMILLE[fi]?.length ?? 0} genres
              </span>
            </h2>

            <ul className="ac-liste">
              {lignes.map((l) => {
                const aDesEnfants = l.genre.children.length > 0;
                const replie = replies.has(l.genre.id);
                const p = poidsDe(l.genre.id);
                return (
                  <li
                    key={l.genre.id}
                    className="ac-ligne"
                    /* L'INDENTATION EST UNE VARIABLE, pas une marge en dur :
                       la meme valeur sert au decalage et au trait vertical
                       qui relie un enfant a son parent. */
                    style={{ '--ac-niveau': l.profondeur } as React.CSSProperties}
                  >
                    {aDesEnfants ? (
                      <button
                        className="ac-plier"
                        onClick={() => basculer(l.genre.id)}
                        aria-expanded={!replie}
                        aria-label={`${replie ? 'Déplier' : 'Replier'} ${l.genre.label}`}
                      >
                        {replie ? '▸' : '▾'}
                      </button>
                    ) : (
                      <span className="ac-plier ac-plier-vide" aria-hidden="true" />
                    )}

                    <button className="ac-nom" onClick={() => onOpen(l.familyIndex, l.genreLocal)}>
                      {l.genre.label}
                    </button>

                    {/* Le nombre de descendants, seulement quand il y en a :
                        une colonne de zeros n'apprend rien et ferait du bruit
                        sur les deux tiers des lignes, qui sont des feuilles. */}
                    {p.derivesDirects > 0 && (
                      <span className="ac-poids">{p.derivesDirects}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
