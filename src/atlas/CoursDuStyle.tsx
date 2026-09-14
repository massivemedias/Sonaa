/* LE COURS D'UN STYLE : comment on le produit, en six rubriques, des etapes
   et des morceaux a etudier. Voir src/lib/cours.ts pour la provenance. */

import { useEffect, useState } from 'react';
import { coursDuGenre, type Cours } from '../lib/cours.ts';
import { t } from '../langue/langue.ts';

export function CoursDuStyle({ genreId }: { genreId: string }) {
  const [cours, setCours] = useState<Cours | null | 'chargement'>('chargement');
  useEffect(() => {
    let vivant = true;
    setCours('chargement');
    void coursDuGenre(genreId).then((c) => {
      if (vivant) setCours(c);
    });
    return () => {
      vivant = false;
    };
  }, [genreId]);

  if (cours === 'chargement') return <p className="pv-cours-note">{t.chargement}</p>;
  if (!cours) return <p className="pv-cours-note">{t.coursEnPreparation}</p>;

  const rubriques: readonly [string, string][] = [
    [t.coursTempo, cours.tempo],
    [t.coursRythme, cours.rythme],
    [t.coursBasse, cours.basse],
    [t.coursSons, cours.sons],
    [t.coursArrangement, cours.arrangement],
    [t.coursMix, cours.mix],
  ];

  return (
    <article className="pv-article pv-cours">
      <p className="pv-cours-note">{t.coursAvis}</p>
      {rubriques.map(([titre, texte]) => (
        <section className="pv-article-section" key={titre}>
          <h3 className="pv-article-titre">{titre}</h3>
          <p>{texte}</p>
        </section>
      ))}
      {cours.outils && cours.outils.length > 0 && (
        <section className="pv-article-section">
          <h3 className="pv-article-titre">{t.coursOutils}</h3>
          <ul className="pv-cours-outils">
            {cours.outils.map((o) => (
              <li key={o.nom}>
                <span className="pv-cours-outil-nom">{o.nom}</span>
                <span className="pv-cours-outil-type">{o.type}</span>
                <span className="pv-cours-outil-pourquoi">{o.pourquoi}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="pv-article-section">
        <h3 className="pv-article-titre">{t.coursEtapes}</h3>
        <ol className="pv-cours-etapes">
          {cours.etapes.map((e, i) => (
            <li key={String(i)}>{e}</li>
          ))}
        </ol>
      </section>
      <section className="pv-article-section">
        <h3 className="pv-article-titre">{t.coursReperes}</h3>
        <ul className="pv-cours-reperes">
          {cours.reperes.map((r, i) => (
            <li key={String(i)}>{r}</li>
          ))}
        </ul>
      </section>
      <p className="pv-cours-sources">
        {t.coursSources} : {[...cours.sources, ...(cours.sourcesOutils ?? [])].filter((x, i, a) => a.indexOf(x) === i).join(' · ')}
      </p>
    </article>
  );
}
