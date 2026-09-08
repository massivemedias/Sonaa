/* NEWS : CE QUI SE DIT EN CE MOMENT DANS LA MUSIQUE ELECTRONIQUE.
 *
 * ═══ POURQUOI CET ONGLET ═══
 *
 * Mika, le 7 septembre 2026 : « un onglet pour tout ce qui concerne les news
 * ... surtout pour la composition musicale, le monde du djing ... je veux
 * que les gens passent du temps sur le site ». Quelqu'un qui vient lire le
 * calendrier ou ecouter un set trouve ici, sans changer de site, ce que
 * vingt magazines publient aujourd'hui : les machines qui sortent, les
 * techniques, les DJs, la scene.
 *
 * ═══ D'OU VIENNENT LES ARTICLES ═══
 *
 * D'un fichier, public/news.json, refait six fois par jour par une tache
 * planifiee (scripts/moissonner-news.ts). Chaque article renvoie a son
 * site : SONAA ne reprend que le titre, la date, une image et un resume, et
 * dit d'ou ca vient. Les sources qui n'offrent plus de flux gardent leur
 * case, en bas : une porte vers le site, sans articles.
 */

import { useEffect, useMemo, useState } from 'react';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { SOURCES, type Categorie } from '../data/news-sources.ts';
import { langue, t } from '../langue/langue.ts';
import './credits.css';
import './news.css';

interface Article {
  readonly source: string;
  readonly titre: string;
  readonly lien: string;
  readonly date: string | null;
  readonly image: string | null;
  readonly resume: string;
}

interface Livre {
  readonly fait: string;
  readonly articles: readonly Article[];
  readonly pannes: readonly { id: string; raison: string }[];
}

type Filtre = 'tout' | Categorie;

const PAR_SOURCE = new Map(SOURCES.map((s) => [s.id, s]));

/** « il y a 3 h », « hier », « il y a 4 jours » : le temps qu'on lit sur
    une une, pas une date qu'on calcule. */
function ilYa(iso: string | null, maintenant: number): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const min = Math.max(0, Math.round((maintenant - d) / 60000));
  if (min < 60) return t.ilYaMinutes(min);
  const h = Math.round(min / 60);
  if (h < 24) return t.ilYaHeures(h);
  const j = Math.round(h / 24);
  if (j === 1) return t.hier;
  if (j < 14) return t.ilYaJours(j);
  return new Intl.DateTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

const NOM_DE_CATEGORIE: Record<Filtre, () => string> = {
  tout: () => t.newsTout,
  production: () => t.newsProduction,
  djing: () => t.newsDjing,
  scene: () => t.newsScene,
};

export function NewsPage() {
  const [livre, setLivre] = useState<Livre | null>(null);
  const [panne, setPanne] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('tout');
  const [sourceChoisie, setSourceChoisie] = useState<string | null>(null);
  const maintenant = useMemo(() => Date.now(), []);

  useEffect(() => {
    document.title = `News · SONAA`;
    /* Le fichier est a cote du site, refait par la moisson : une requete,
       jamais vers un tiers. */
    fetch(`${import.meta.env.BASE_URL}news.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<Livre>) : Promise.reject(new Error(String(r.status)))))
      .then(setLivre)
      .catch(() => setPanne(true));
  }, []);

  const articles = useMemo(() => {
    if (!livre) return [];
    return livre.articles.filter((a) => {
      const s = PAR_SOURCE.get(a.source);
      if (!s) return false;
      if (sourceChoisie) return a.source === sourceChoisie;
      return filtre === 'tout' || s.categorie === filtre;
    });
  }, [livre, filtre, sourceChoisie]);

  const sourcesVisibles = SOURCES.filter((s) => filtre === 'tout' || s.categorie === filtre);

  return (
    <>
      <EnTeteSite />
      <main className="credits news">
        <h1>News</h1>
        <p className="news-lede">{t.ledeNews}</p>

        <div className="news-filtres" role="tablist" aria-label={t.newsRayons}>
          {(['tout', 'production', 'djing', 'scene'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filtre === f && !sourceChoisie}
              className={`news-filtre${filtre === f && !sourceChoisie ? ' news-filtre-actif' : ''}`}
              onClick={() => {
                setFiltre(f);
                setSourceChoisie(null);
              }}
            >
              {NOM_DE_CATEGORIE[f]()}
            </button>
          ))}
          {sourceChoisie && (
            <button
              type="button"
              className="news-filtre news-filtre-actif"
              onClick={() => setSourceChoisie(null)}
              aria-label={t.toutesLesSources}
            >
              {PAR_SOURCE.get(sourceChoisie)?.nom} ×
            </button>
          )}
        </div>

        {panne && <p className="news-note">{t.newsIndisponibles}</p>}
        {!panne && !livre && <p className="news-note">{t.lectureEnCours}</p>}
        {livre && articles.length === 0 && <p className="news-note">{t.aucunArticle}</p>}

        {articles.length > 0 && (
          <ul className="news-liste">
            {articles.map((a) => {
              const s = PAR_SOURCE.get(a.source);
              return (
                <li key={a.lien} className="news-carte">
                  <a href={a.lien} target="_blank" rel="noreferrer noopener" className="news-lien">
                    {a.image ? (
                      <img className="news-image" src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="news-image news-image-vide" aria-hidden="true">
                        {s?.nom.slice(0, 1)}
                      </span>
                    )}
                    <span className="news-corps">
                      <span className="news-meta">
                        <span className="news-source">{s?.nom}</span>
                        {a.date && <span className="news-quand">{ilYa(a.date, maintenant)}</span>}
                      </span>
                      <span className="news-titre">{a.titre}</span>
                      {a.resume && <span className="news-resume">{a.resume}</span>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        {livre && (
          <p className="news-note">
            {t.newsMisesAJour(ilYa(livre.fait, maintenant))}
          </p>
        )}

        <section className="news-sources" aria-labelledby="news-sources-titre">
          <h2 id="news-sources-titre">{t.lesSources}</h2>
          <p className="news-note">{t.sourcesIntro}</p>
          <ul className="news-sources-liste">
            {sourcesVisibles.map((s) => (
              <li key={s.id} className="news-source-carte">
                <a href={s.site} target="_blank" rel="noreferrer noopener" className="news-source-nom">
                  {s.nom}
                </a>
                <span className="news-source-quoi">{s.quoi}</span>
                <span className="news-source-pied">
                  <span className="news-source-cat">{NOM_DE_CATEGORIE[s.categorie]()}</span>
                  {s.flux ? (
                    <button type="button" className="news-source-filtrer" onClick={() => setSourceChoisie(s.id)}>
                      {t.voirSesArticles}
                    </button>
                  ) : (
                    <span className="news-source-sansflux">{t.pasDeFlux}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <PiedDePage />
      </main>
    </>
  );
}
