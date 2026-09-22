/* UN ARTICLE DES NEWS, LU DANS SONAA, DEPUIS SON FLUX.
 *
 * Mika, le 14 septembre 2026 : « quand je clique je veux rester sur SONAA ».
 * Puis, le 21 septembre : « ne jamais aller chercher le corps sur la page du
 * magazine ». Les deux tiennent ensemble par le FLUX : c'est le canal que
 * l'editeur publie lui-meme pour etre repris, et ce qu'il y met dit ce qu'il
 * accepte qu'on montre.
 *
 * DEUX CAS, ET LA DIFFERENCE EST CELLE DE L'EDITEUR, PAS LA NOTRE.
 * 1. Le flux porte l'article entier, images comprises : on l'affiche entier.
 *    Attack, Gearnews et Midnight Rebels sont dans ce cas.
 * 2. Le flux ne porte qu'un extrait : on affiche l'extrait, et un bouton qui
 *    se voit mene chez lui. CDM est dans ce cas.
 * Dans les deux, le nom du magazine et le lien vers l'original sont en tete
 * ET en pied : on ne doit jamais avoir a chercher d'ou vient ce qu'on lit.
 *
 * LA TRADUCTION ARRIVE APRES, ET NE FAIT PAS ATTENDRE. Une premiere demande
 * rend l'original tout de suite ; si l'interface est en francais et que
 * l'article est anglais et entier, une seconde demande part, et le texte est
 * remplace quand elle revient. Voir la route api/article-flux.
 *
 * CETTE PAGE N'EST PAS INDEXABLE, et c'est voulu : le texte est celui d'un
 * autre, l'adresse qui fait autorite est la sienne. On le dit aux moteurs par
 * un noindex et un canonique, poses tant que la vue est ouverte. */

import { useEffect, useState } from 'react';
import { langue, t } from '../langue/langue.ts';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';

interface Morceau {
  readonly t: 'p' | 'h2' | 'h3' | 'quote' | 'img';
  readonly x: string;
  /* LES DIMENSIONS DECLAREES PAR LE FLUX, quand il les donne. Elles ne
     servent PAS a dimensionner l'image, la feuille de style s'en charge :
     elles servent au navigateur a reserver la bonne place avant que l'image
     arrive, donc a ne pas faire sauter le texte sous elle. */
  readonly w?: number;
  readonly h?: number;
}

interface Reponse {
  readonly trouve: boolean;
  readonly integral: boolean;
  readonly corps: readonly Morceau[];
  readonly traduit: boolean;
  readonly source?: string;
}

interface Props {
  readonly url: string;
  readonly titre: string | null;
  readonly source: string | null;
  readonly image: string | null;
  /** L'identifiant de la source dans la table, pour retrouver son flux. */
  readonly idSource: string | null;
  /** La langue du magazine : on ne traduit que ce qui est en anglais. */
  readonly langueSource: 'fr' | 'en' | null;
}

/* LE NOINDEX ET LE CANONIQUE VIVENT LE TEMPS DE LA VUE. Poses au montage,
   retires au demontage : sans cela, la page des news garderait le canonique
   d'un article apres qu'on l'a refermee. */
function useSignauxDeMoteur(url: string): void {
  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, follow';
    const canonique = document.createElement('link');
    canonique.rel = 'canonical';
    canonique.href = url;
    const ancien = document.head.querySelector('link[rel="canonical"]');
    if (ancien) ancien.remove();
    document.head.append(robots, canonique);
    return () => {
      robots.remove();
      canonique.remove();
      if (ancien) document.head.append(ancien);
    };
  }, [url]);
}

export function LectureArticle({ url, titre, source, image, idSource, langueSource }: Props) {
  const [etat, setEtat] = useState<Reponse | 'chargement' | 'panne'>('chargement');
  const [traduction, setTraduction] = useState<readonly Morceau[] | null>(null);
  const [traduitEnCours, setTraduitEnCours] = useState(false);

  const site = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();
  const nomSource = source ?? site;

  useSignauxDeMoteur(url);

  useEffect(() => {
    let vivant = true;
    setEtat('chargement');
    setTraduction(null);
    setTraduitEnCours(false);
    window.scrollTo(0, 0);
    if (!idSource) {
      setEtat('panne');
      return;
    }
    const adresse = `${PASSERELLE}/api/article-flux?source=${encodeURIComponent(idSource)}&lien=${encodeURIComponent(url)}`;
    fetch(adresse)
      .then((r) => (r.ok ? (r.json() as Promise<Reponse>) : Promise.reject(new Error(String(r.status)))))
      .then((rep) => {
        if (!vivant) return;
        setEtat(rep);
        /* LA SECONDE DEMANDE NE PART QUE SI ELLE A UNE CHANCE DE SERVIR. */
        if (langue === 'fr' && rep.trouve && rep.integral && langueSource === 'en') {
          setTraduitEnCours(true);
          fetch(`${adresse}&lang=fr`)
            .then((r) => (r.ok ? (r.json() as Promise<Reponse>) : Promise.reject(new Error(String(r.status)))))
            .then((tr) => {
              if (vivant && tr.traduit) setTraduction(tr.corps);
            })
            .catch(() => {})
            .finally(() => {
              if (vivant) setTraduitEnCours(false);
            });
        }
      })
      .catch(() => {
        if (vivant) setEtat('panne');
      });
    return () => {
      vivant = false;
    };
  }, [url, idSource, langueSource]);

  useEffect(() => {
    document.title = `${titre ?? site} · SONAA`;
  }, [titre, site]);

  const lu = typeof etat === 'object' ? etat : null;
  const blocs = traduction ?? lu?.corps ?? [];

  const versLaSource = (
    <a className="lecture-source-lien" href={url} target="_blank" rel="noreferrer noopener">
      {t.lireSur(site)}
    </a>
  );

  return (
    <article className="lecture">
      <p className="lecture-retour">
        <a href="#/news">{t.retourAuxNews}</a>
      </p>

      {/* LA SOURCE EN TETE : on doit savoir chez qui on lit avant de lire. */}
      <p className="news-sur">
        <span className="news-source">{nomSource}</span>
      </p>
      <h1 className="lecture-titre">{titre ?? site}</h1>
      <p className="lecture-haut-lien">{versLaSource}</p>

      {image && <img className="lecture-image" src={image} alt="" referrerPolicy="no-referrer" />}

      {etat === 'chargement' && <p className="news-note">{t.articleEnLecture}</p>}
      {etat === 'panne' && <p className="news-note">{t.articleIllisible}</p>}
      {lu && !lu.trouve && <p className="news-note">{t.articleHorsFlux}</p>}

      {traduitEnCours && <p className="lecture-avis">{t.traductionEnCours}</p>}
      {traduction && <p className="lecture-avis">{t.traduitParMachine}</p>}

      {blocs.map((m, i) => {
        if (m.t === 'img')
          return (
            <img
              key={i}
              className="lecture-figure"
              src={m.x}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              {...(m.w !== undefined && m.h !== undefined ? { width: m.w, height: m.h } : {})}
            />
          );
        if (m.t === 'h2') return <h2 key={i}>{m.x}</h2>;
        if (m.t === 'h3') return <h3 key={i}>{m.x}</h3>;
        if (m.t === 'quote') return <blockquote key={i}>{m.x}</blockquote>;
        return <p key={i}>{m.x}</p>;
      })}

      {/* L'EXTRAIT LE DIT, ET LE BOUTON SE VOIT. Un extrait qui s'arrete sans
          rien annoncer se lit comme un article coupe. */}
      {lu && lu.trouve && !lu.integral && (
        <div className="lecture-suite">
          <p className="lecture-suite-mot">{t.extraitSeulement}</p>
          <a className="lecture-suite-bouton" href={url} target="_blank" rel="noreferrer noopener">
            {t.lireLaSuiteSur(nomSource)}
          </a>
        </div>
      )}

      <p className="lecture-source">{versLaSource}</p>
    </article>
  );
}
