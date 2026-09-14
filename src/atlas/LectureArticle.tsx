/* UN ARTICLE DES NEWS, LU DANS SONAA.
 *
 * Mika, le 14 septembre 2026 : « quand je clique je veux rester sur SONAA,
 * voir le contenu directement ». Le titre menait au magazine dans un autre
 * onglet ; il ouvre maintenant cette page, qui demande le texte a la
 * passerelle (api/article : elle lit le magazine, garde une journee, ne
 * rend que le texte, les intertitres et les images). Le magazine est nomme
 * en tete et en pied, avec le lien vers l'original : on lit ici, on ne
 * s'approprie rien. Si la passerelle ne sait pas lire la page, le lien
 * vers l'original reste la seule porte, et elle est grande. */

import { useEffect, useState } from 'react';
import { t } from '../langue/langue.ts';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';

interface Morceau { readonly t: 'p' | 'h2' | 'h3' | 'quote' | 'img'; readonly x: string }
interface ArticleLu {
  readonly titre: string;
  readonly image: string | null;
  readonly site: string;
  readonly url: string;
  readonly morceaux: readonly Morceau[];
}

interface Props {
  readonly url: string;
  readonly titre: string | null;
  readonly source: string | null;
  readonly image: string | null;
}

export function LectureArticle({ url, titre, source, image }: Props) {
  const [etat, setEtat] = useState<ArticleLu | 'chargement' | 'panne'>('chargement');
  const site = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();

  useEffect(() => {
    let vivant = true;
    setEtat('chargement');
    window.scrollTo(0, 0);
    fetch(`${PASSERELLE}/api/article?u=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? (r.json() as Promise<ArticleLu>) : Promise.reject(new Error(String(r.status)))))
      .then((a) => {
        if (vivant) setEtat(a);
      })
      .catch(() => {
        if (vivant) setEtat('panne');
      });
    return () => {
      vivant = false;
    };
  }, [url]);

  const lu = typeof etat === 'object' ? etat : null;
  /* Le titre de la moisson d'abord : il est deja propre. Celui de la page
     sert quand on arrive par un lien direct. */
  const grandTitre = titre || lu?.titre || site;
  useEffect(() => {
    document.title = `${grandTitre} · SONAA`;
  }, [grandTitre]);
  const imageUne = lu?.image ?? image;

  return (
    <article className="lecture">
      <p className="lecture-retour">
        <a href="#/news">{t.retourAuxNews}</a>
      </p>
      <p className="news-sur">
        <span className="news-source">{source ?? site}</span>
      </p>
      <h1 className="lecture-titre">{grandTitre}</h1>
      {imageUne && <img className="lecture-image" src={imageUne} alt="" referrerPolicy="no-referrer" />}
      {etat === 'chargement' && <p className="news-note">{t.articleEnLecture}</p>}
      {etat === 'panne' && <p className="news-note">{t.articleIllisible}</p>}
      {lu &&
        lu.morceaux.map((m, i) => {
          if (m.t === 'img') return <img key={i} className="lecture-figure" src={m.x} alt="" loading="lazy" referrerPolicy="no-referrer" />;
          if (m.t === 'h2') return <h2 key={i}>{m.x}</h2>;
          if (m.t === 'h3') return <h3 key={i}>{m.x}</h3>;
          if (m.t === 'quote') return <blockquote key={i}>{m.x}</blockquote>;
          return <p key={i}>{m.x}</p>;
        })}
      <p className="lecture-source">
        <a href={url} target="_blank" rel="noreferrer noopener">
          {t.lireSur(site)}
        </a>
      </p>
    </article>
  );
}
