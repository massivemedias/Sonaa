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
 *
 * ═══ UNE UNE DE JOURNAL, PAS UNE GRILLE ═══
 *
 * Mika, le 14 septembre 2026 : « quelque chose de plus precis et plus
 * interessant visuellement, affiche comme un magazine, des images, des
 * textes, des fois des textes plus gros », en montrant la une du Monde. La
 * premiere version posait 160 cartes identiques : tout au meme rang, donc
 * rien a lire en premier. Une une fait le contraire : elle HIERARCHISE.
 *
 * Le rythme, du haut vers le bas :
 *   1. LA UNE, un seul article, grande image, gros titre, resume.
 *   2. EN BREF, a sa droite : quatre titres nus, sans image. C'est le texte
 *      qui fait la colonne, pas l'image.
 *   3. LES RUBRIQUES, Production, DJing, Scene, chacune ouverte par un
 *      article en grand (image a gauche, titre a droite), puis trois cartes,
 *      puis des breves en deux colonnes.
 * Le meme article n'apparait qu'une fois : chaque bloc PREND dans la pile,
 * il ne la relit pas. La pile est triee par date, la plus recente en tete :
 * ce qui est en haut est ce qui vient de sortir, comme sur un journal.
 *
 * Sur telephone, tout passe en une colonne, dans le meme ordre : la une
 * reste la une.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { LectureArticle } from './LectureArticle.tsx';
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
  /* La version francaise, posee a la moisson. Absente pour les deux
     magazines qui ecrivent deja en francais, et quand la traduction a
     echoue. Voir scripts/lib/traduire.ts. */
  readonly titre_fr?: string;
  readonly resume_fr?: string;
}

/* ═══ LE TITRE DANS LA LANGUE DE LA PAGE ═══
 *
 * Mika, le 17 septembre 2026 : « FR voit du FR traduit, EN voit l'original ».
 * Un lecteur anglophone lit toujours ce que le magazine a ecrit ; un lecteur
 * francophone lit la traduction QUAND ELLE EXISTE, et l'original sinon.
 *
 * LE REPLI N'EST PAS UN DEFAUT, C'EST LA REGLE. Deux magazines ecrivent en
 * francais et n'ont donc pas de traduction ; un article moissonne pendant une
 * panne de l'API n'en a pas non plus. Dans les deux cas la ligne s'affiche
 * telle quelle, ce qui est exactement l'etat d'avant. */
const titreDe = (a: Article): string => (langue === 'fr' && a.titre_fr ? a.titre_fr : a.titre);
const resumeDe = (a: Article): string => (langue === 'fr' && a.titre_fr ? (a.resume_fr ?? '') : a.resume);

interface Livre {
  readonly fait: string;
  readonly articles: readonly Article[];
  readonly pannes: readonly { id: string; raison: string }[];
}

type Filtre = 'tout' | Categorie;

const PAR_SOURCE = new Map(SOURCES.map((s) => [s.id, s]));
const RUBRIQUES: readonly Categorie[] = ['production', 'djing', 'scene'];

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

/** La date de l'edition, en toutes lettres : ce qu'un journal met sous
    son titre. */
function dateDeLEdition(): string {
  return new Intl.DateTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

/* ═══ LA REPARTITION ═══ Une pile triee, des blocs qui y prennent. */

interface Rubrique {
  readonly cat: Categorie;
  readonly grand: Article;
  readonly cartes: readonly Article[];
  readonly breves: readonly Article[];
}

interface Edition {
  readonly une: Article | null;
  readonly enBref: readonly Article[];
  readonly rubriques: readonly Rubrique[];
  /** Quand un seul rayon est demande : ce qui reste apres la une, en cartes
      puis en breves, sans rubrique. */
  readonly cartes: readonly Article[];
  readonly breves: readonly Article[];
}

function prendre(pile: Article[], combien: number, ok: (a: Article) => boolean = () => true): Article[] {
  const pris: Article[] = [];
  for (let i = 0; i < pile.length && pris.length < combien; ) {
    const a = pile[i];
    if (a && ok(a)) {
      pris.push(a);
      pile.splice(i, 1);
    } else i += 1;
  }
  return pris;
}

function repartir(articles: readonly Article[], filtre: Filtre, parSource: boolean): Edition {
  const pile = [...articles];
  /* LA UNE VEUT UN RESUME : un titre seul, en grand, laisse la moitie de
     la place vide. Le premier article recent qui en a un la prend. */
  const une = prendre(pile, 1, (a) => a.resume.length >= 90)[0] ?? prendre(pile, 1)[0] ?? null;
  const enBref = prendre(pile, 4);
  if (filtre !== 'tout' || parSource) {
    return { une, enBref, rubriques: [], cartes: prendre(pile, 6), breves: pile };
  }
  const rubriques: Rubrique[] = [];
  for (const cat of RUBRIQUES) {
    const de = (a: Article): boolean => PAR_SOURCE.get(a.source)?.categorie === cat;
    const grand = prendre(pile, 1, de)[0];
    if (!grand) continue;
    rubriques.push({ cat, grand, cartes: prendre(pile, 3, de), breves: prendre(pile, 6, de) });
  }
  return { une, enBref, rubriques, cartes: [], breves: [] };
}

export function NewsPage() {
  const [livre, setLivre] = useState<Livre | null>(null);
  const [panne, setPanne] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('tout');
  const [sourceChoisie, setSourceChoisie] = useState<string | null>(null);
  /* UNE IMAGE QUI NE SE CHARGE PAS EMPORTE SA TUILE. La moisson a verifie
     l'adresse, pas le droit de l'afficher ici : un site peut refuser qu'on
     montre son image ailleurs que chez lui. La regle est la meme qu'a la
     moisson : pas d'image, pas de tuile. */
  const [cassees, setCassees] = useState<ReadonlySet<string>>(new Set());
  const maintenant = useMemo(() => Date.now(), []);
  /* L'ARTICLE EN LECTURE, lu dans l'ancre. La page reste la meme route pour
     main.tsx (#/news…), elle ecoute donc elle-meme les changements. */
  const [ancre, setAncre] = useState(() => window.location.hash);
  useEffect(() => {
    const suivre = () => setAncre(window.location.hash);
    window.addEventListener('hashchange', suivre);
    return () => window.removeEventListener('hashchange', suivre);
  }, []);
  const urlEnLecture = ancre.startsWith('#/news/lire?') ? new URLSearchParams(ancre.slice('#/news/lire?'.length)).get('u') : null;

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
    return livre.articles
      .filter((a) => {
        const s = PAR_SOURCE.get(a.source);
        if (!s || !a.image || cassees.has(a.lien)) return false;
        if (sourceChoisie) return a.source === sourceChoisie;
        return filtre === 'tout' || s.categorie === filtre;
      })
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [livre, filtre, sourceChoisie, cassees]);

  const edition = useMemo(() => repartir(articles, filtre, sourceChoisie !== null), [articles, filtre, sourceChoisie]);

  const sourcesVisibles = SOURCES.filter((s) => filtre === 'tout' || s.categorie === filtre);

  const casser = (a: Article): void => setCassees((c) => new Set(c).add(a.lien));

  /* ═══ LES QUATRE FACONS DE POSER UN ARTICLE ═══ Une seule donnee, quatre
     tailles. La source et l'age sont le « surtitre », en petites capitales,
     comme la rubrique au-dessus d'un titre de journal. */
  const Surtitre = ({ a }: { a: Article }) => (
    <span className="news-sur">
      <span className="news-source">{PAR_SOURCE.get(a.source)?.nom}</span>
      {a.date && <span className="news-quand">{ilYa(a.date, maintenant)}</span>}
    </span>
  );

  const Image = ({ a }: { a: Article }) => (
    <img className="news-image" src={a.image ?? ''} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => casser(a)} />
  );

  /* LE TITRE OUVRE L'ARTICLE ICI, pas chez le magazine : #/news/lire?u=…
     (voir LectureArticle.tsx). Le bouton du milieu et le clic droit font
     toujours ce qu'ils font, c'est l'ancre qui change. */
  const Lien = ({ a, className, children }: { a: Article; className: string; children: ReactNode }) => (
    <a href={`#/news/lire?u=${encodeURIComponent(a.lien)}`} className={className}>
      {children}
    </a>
  );

  const Grand = ({ a, une: estLaUne }: { a: Article; une?: boolean }) => (
    <article className={estLaUne ? 'news-une' : 'news-grand'}>
      <Lien a={a} className="news-lien">
        <Image a={a} />
        <span className="news-corps">
          <Surtitre a={a} />
          <span className="news-titre">{titreDe(a)}</span>
          {resumeDe(a) && <span className="news-resume">{resumeDe(a)}</span>}
        </span>
      </Lien>
    </article>
  );

  const Carte = ({ a }: { a: Article }) => (
    <article className="news-carte">
      <Lien a={a} className="news-lien">
        <Image a={a} />
        <span className="news-corps">
          <Surtitre a={a} />
          <span className="news-titre">{titreDe(a)}</span>
        </span>
      </Lien>
    </article>
  );

  const Breve = ({ a }: { a: Article }) => (
    <li className="news-breve">
      <Lien a={a} className="news-lien">
        <Surtitre a={a} />
        <span className="news-titre">{titreDe(a)}</span>
      </Lien>
    </li>
  );

  return (
    <>
      <EnTeteSite />
      <main className="credits news">
        {urlEnLecture && (() => {
          const a = livre?.articles.find((x) => x.lien === urlEnLecture) ?? null;
          return (
            <>
              <LectureArticle
                url={urlEnLecture}
                titre={a ? titreDe(a) : null}
                source={a ? (PAR_SOURCE.get(a.source)?.nom ?? null) : null}
                image={a?.image ?? null}
                idSource={a?.source ?? null}
                langueSource={a ? (PAR_SOURCE.get(a.source)?.langue ?? null) : null}
              />
              <PiedDePage />
            </>
          );
        })()}
        {!urlEnLecture && <>
        {/* LA MANCHETTE : le titre, la date de l'edition, et une ligne qui
            dit ce que c'est. Comme en haut d'un journal. */}
        <header className="news-manchette">
          <h1>News</h1>
          <p className="news-edition">{dateDeLEdition()}</p>
          <p className="news-lede">{t.ledeNews}</p>
        </header>

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

        {edition.une && (
          <section className="news-tete" aria-label={t.newsALaUne}>
            <Grand a={edition.une} une />
            {edition.enBref.length > 0 && (
              <aside className="news-enbref">
                <h2 className="news-rubrique-titre">{t.newsEnBref}</h2>
                <ul className="news-breves news-breves-colonne">
                  {edition.enBref.map((a) => (
                    <Breve key={a.lien} a={a} />
                  ))}
                </ul>
              </aside>
            )}
          </section>
        )}

        {edition.rubriques.map((r) => (
          <section key={r.cat} className="news-rubrique" aria-label={NOM_DE_CATEGORIE[r.cat]()}>
            <h2 className="news-rubrique-titre">
              <button type="button" className="news-rubrique-bouton" onClick={() => setFiltre(r.cat)}>
                {NOM_DE_CATEGORIE[r.cat]()}
              </button>
            </h2>
            <Grand a={r.grand} />
            {r.cartes.length > 0 && (
              <div className="news-cartes">
                {r.cartes.map((a) => (
                  <Carte key={a.lien} a={a} />
                ))}
              </div>
            )}
            {r.breves.length > 0 && (
              <ul className="news-breves">
                {r.breves.map((a) => (
                  <Breve key={a.lien} a={a} />
                ))}
              </ul>
            )}
          </section>
        ))}

        {(edition.cartes.length > 0 || edition.breves.length > 0) && (
          <section className="news-rubrique" aria-label={t.newsEtAussi}>
            <h2 className="news-rubrique-titre">{t.newsEtAussi}</h2>
            {edition.cartes.length > 0 && (
              <div className="news-cartes">
                {edition.cartes.map((a) => (
                  <Carte key={a.lien} a={a} />
                ))}
              </div>
            )}
            {edition.breves.length > 0 && (
              <ul className="news-breves">
                {edition.breves.map((a) => (
                  <Breve key={a.lien} a={a} />
                ))}
              </ul>
            )}
          </section>
        )}

        {livre && <p className="news-note">{t.newsMisesAJour(ilYa(livre.fait, maintenant))}</p>}

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
        </>}
      </main>
    </>
  );
}
