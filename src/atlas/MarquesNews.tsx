/* LES NEWS PAR MARQUE : l'annuaire, la page d'une marque, et « Mes machines ».
 *
 * Mika, le 18 octobre 2026 : « si je suis fan d'une machine, je vais
 * chercher ses news un peu partout, des videos, des articles, des
 * discussions. J'ai achete une Elektron Analog Rytm, je veux toutes les
 * news la-dessus. Le panneau News sert a ca : la liste de toutes les news
 * par constructeur, editeur, et pareil pour les fabricants de plugins. »
 *
 * TROIS ADRESSES, SOUS LA ROUTE DES NEWS :
 *   #/news/marques                     l'annuaire, par rayon, avec recherche
 *   #/news/marques/<marque>[/<machine>] une marque, ou une seule machine
 *   #/news/suivis                      ce que le compte suit, en un fil
 *
 * L'archive vient de la base (src/lib/actu-marques.ts), remplie deux fois
 * par jour par scripts/moissonner-marques.ts. Le catalogue des marques est
 * src/data/marques.ts.
 *
 * LES VIDEOS SE REGARDENT ICI, dans une fenetre par-dessus la page : on ne
 * renvoie pas sur YouTube quelqu'un qu'on veut garder. Les articles et les
 * discussions s'ouvrent chez leur auteur, dans un nouvel onglet. */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faCheck,
  faComments,
  faMagnifyingGlass,
  faNewspaper,
  faPlay,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faReddit, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { MARQUES, MARQUE_PAR_ID, type GroupeMarque, type Marque } from '../data/marques.ts';
import {
  actus,
  cleDeSuivi,
  comptesDesMarques,
  idVideo,
  mesSuivis,
  suivre,
  type ActuMarque,
  type CompteMarque,
  type Filtre,
  type GenreActu,
  type Suivi,
} from '../lib/actu-marques.ts';
import { useSession } from '../lib/useSession.ts';
import { EVENEMENT_CONNEXION } from '../lib/porte-ecoute.ts';
import { annoncerLecture } from '../lib/lecture-set.ts';
import { langue, t } from '../langue/langue.ts';
import './marques.css';

/* ═══ LES ADRESSES ═══ */

export type VueMarques =
  | { readonly k: 'annuaire' }
  | { readonly k: 'marque'; readonly marque: string; readonly produit: string | null }
  | { readonly k: 'suivis' };

/** La vue que demande l'ancre, ou null si l'ancre est celle du fil. */
export function lireVueMarques(ancre: string): VueMarques | null {
  if (ancre.startsWith('#/news/suivis')) return { k: 'suivis' };
  const m = ancre.match(/^#\/news\/marques(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?)?/);
  if (!m) return null;
  return m[1] ? { k: 'marque', marque: m[1], produit: m[2] ?? null } : { k: 'annuaire' };
}

const GROUPES: readonly { id: GroupeMarque; nom: () => string }[] = [
  { id: 'synthes', nom: () => t.groupeSynthes },
  { id: 'dj', nom: () => t.groupeDj },
  { id: 'logiciels', nom: () => t.groupeLogiciels },
  { id: 'plugins', nom: () => t.groupePlugins },
];
const NOM_DU_GROUPE = new Map(GROUPES.map((g) => [g.id, g.nom]));

const sansAccent = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const FORMAT_RELATIF = new Intl.RelativeTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', { numeric: 'auto' });
function ilYA(iso: string | null): string {
  if (!iso) return '';
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const pas: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unite, n] of pas) if (Math.abs(s) >= n) return FORMAT_RELATIF.format(Math.round(s / n), unite);
  return FORMAT_RELATIF.format(0, 'minute');
}

/** Le nom d'une machine par son identifiant qualifie (« elektron:digitakt »). */
function nomDuProduit(qualifie: string): string | null {
  const [m, p] = qualifie.split(':');
  return MARQUE_PAR_ID.get(m ?? '')?.produits.find((x) => x.id === p)?.nom ?? null;
}

function demanderCompte(): void {
  window.dispatchEvent(new CustomEvent(EVENEMENT_CONNEXION, { detail: t.compteRequisSuivi }));
}

/* ═══ LES SUIVIS ═══ Une liste par page, basculee sur place : le bouton
   change tout de suite, et revient si la base refuse. */
interface EtatSuivis {
  readonly liste: readonly Suivi[];
  readonly cles: ReadonlySet<string>;
  readonly connecte: boolean;
  readonly basculer: (s: Suivi) => void;
}

function useSuivis(): EtatSuivis {
  const { session } = useSession();
  const [liste, setListe] = useState<Suivi[]>([]);
  useEffect(() => {
    let vivant = true;
    if (!session) {
      setListe([]);
      return;
    }
    void mesSuivis().then((x) => vivant && setListe(x));
    return () => {
      vivant = false;
    };
  }, [session]);
  const cles = useMemo(() => new Set(liste.map(cleDeSuivi)), [liste]);
  const basculer = useCallback(
    (s: Suivi): void => {
      if (!session) return demanderCompte();
      const cle = cleDeSuivi(s);
      const oui = !cles.has(cle);
      const appliquer = (o: boolean): void => setListe((l) => (o ? [...l.filter((x) => cleDeSuivi(x) !== cle), s] : l.filter((x) => cleDeSuivi(x) !== cle)));
      appliquer(oui);
      suivre(s, oui).catch(() => appliquer(!oui));
    },
    [session, cles]
  );
  return { liste, cles, connecte: Boolean(session), basculer };
}

function BoutonSuivre({ suivis, suivi, nom, petit }: { suivis: EtatSuivis; suivi: Suivi; nom: string; petit?: boolean }) {
  const oui = suivis.cles.has(cleDeSuivi(suivi));
  return (
    <button
      type="button"
      className={`mq-suivre${oui ? ' mq-suivre-oui' : ''}${petit ? ' mq-suivre-petit' : ''}`}
      aria-pressed={oui}
      title={oui ? t.nePlusSuivre(nom) : t.suivreQuoi(nom)}
      onClick={() => suivis.basculer(suivi)}
    >
      <FaIcon icon={oui ? faCheck : faPlus} className="mq-suivre-icone" />
      {oui ? `${t.suiviMarque} · ${nom}` : t.suivreQuoi(nom)}
    </button>
  );
}

/* ═══ LES VUES DES NEWS ═══ Le fil, les marques, mes machines : trois
   onglets en tete de la page News. */
export function VuesNews({ actif }: { actif: 'fil' | 'marques' | 'suivis' }) {
  const vues = [
    { id: 'fil', href: '#/news', nom: t.newsVueFil },
    { id: 'marques', href: '#/news/marques', nom: t.newsVueMarques },
    { id: 'suivis', href: '#/news/suivis', nom: t.newsVueSuivis },
  ] as const;
  return (
    <nav className="mq-vues" aria-label={t.newsVues}>
      {vues.map((v) => (
        <a key={v.id} href={v.href} className="mq-vue" aria-current={actif === v.id ? 'page' : undefined}>
          {v.nom}
        </a>
      ))}
    </nav>
  );
}

/* ═══ LA VUE ═══ */
export function MarquesNews({ vue }: { vue: VueMarques }) {
  const suivis = useSuivis();
  const [video, setVideo] = useState<ActuMarque | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [vue.k, vue.k === 'marque' ? vue.marque : '']);

  return (
    <>
      {vue.k === 'annuaire' && <Annuaire suivis={suivis} />}
      {vue.k === 'marque' && <PageMarque id={vue.marque} produit={vue.produit} suivis={suivis} onVideo={setVideo} />}
      {vue.k === 'suivis' && <MesMachines suivis={suivis} onVideo={setVideo} />}
      {video && <FenetreVideo a={video} onFermer={() => setVideo(null)} />}
    </>
  );
}

/* ═══ L'ANNUAIRE ═══ Quatre rayons, les marques par ordre alphabetique ;
   la recherche trouve aussi les machines, et y mene tout droit. */
function Annuaire({ suivis }: { suivis: EtatSuivis }) {
  const [comptes, setComptes] = useState<ReadonlyMap<string, CompteMarque>>(new Map());
  const [q, setQ] = useState('');
  useEffect(() => {
    document.title = `${t.marquesTitre} · News · SONAA`;
    void comptesDesMarques().then(setComptes);
  }, []);

  const nq = sansAccent(q.trim());
  const machines = useMemo(
    () =>
      nq.length >= 2
        ? MARQUES.flatMap((m) => m.produits.filter((p) => sansAccent(p.nom).includes(nq)).map((p) => ({ m, p }))).slice(0, 30)
        : [],
    [nq]
  );
  const visibles = useMemo(
    () => (nq ? MARQUES.filter((m) => sansAccent(m.nom).includes(nq) || m.produits.some((p) => sansAccent(p.nom).includes(nq))) : MARQUES),
    [nq]
  );
  const suiviesDeLaMarque = (m: Marque): boolean => suivis.liste.some((s) => s.marque === m.id);

  return (
    <section className="mq-annuaire" aria-labelledby="mq-annuaire-titre">
      <h2 id="mq-annuaire-titre" className="mq-titre-vue">
        {t.marquesTitre}
      </h2>
      <p className="mq-lede">{t.marquesLede}</p>
      <label className="mq-chercher">
        <FaIcon icon={faMagnifyingGlass} className="mq-chercher-icone" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.chercherMarque} aria-label={t.chercherMarque} />
      </label>

      {machines.length > 0 && (
        <div className="mq-machines-trouvees">
          <h3 className="mq-rayon-titre">{t.machinesTrouvees}</h3>
          <ul className="mq-puces">
            {machines.map(({ m, p }) => (
              <li key={`${m.id}:${p.id}`}>
                <a className="mq-puce" href={`#/news/marques/${m.id}/${p.id}`}>
                  <span className="mq-puce-marque">{m.nom}</span> {p.nom}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {visibles.length === 0 && <p className="mq-note">{t.aucuneMarqueTrouvee}</p>}

      {GROUPES.map((g) => {
        const du = visibles.filter((m) => m.groupe === g.id).sort((a, b) => a.nom.localeCompare(b.nom));
        if (du.length === 0) return null;
        return (
          <section key={g.id} className="mq-rayon" aria-label={g.nom()}>
            <h3 className="mq-rayon-titre">{g.nom()}</h3>
            <ul className="mq-tuiles">
              {du.map((m) => {
                const c = comptes.get(m.id);
                return (
                  <li key={m.id}>
                    <a className="mq-tuile" href={`#/news/marques/${m.id}`}>
                      <span className="mq-tuile-nom">
                        {m.nom}
                        {suiviesDeLaMarque(m) && <FaIcon icon={faCheck} className="mq-tuile-suivie" />}
                      </span>
                      <span className="mq-tuile-produits">{m.produits.slice(0, 4).map((p) => p.nom).join(' · ')}</span>
                      <span className="mq-tuile-pied">
                        {t.nProduits(m.produits.length)}
                        {c && c.n30 > 0 ? <strong> · {t.nCeMois(c.n30)}</strong> : null}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </section>
  );
}

/* ═══ UNE MARQUE ═══ Ses machines en pastilles (une pastille filtre, et se
   suit), les genres en onglets ; « Tout » montre les trois genres l'un sous
   l'autre, chacun avec son « Voir tout ». */
function PageMarque({
  id,
  produit,
  suivis,
  onVideo,
}: {
  id: string;
  produit: string | null;
  suivis: EtatSuivis;
  onVideo: (a: ActuMarque) => void;
}) {
  const m = MARQUE_PAR_ID.get(id);
  const pr = m && produit ? (m.produits.find((x) => x.id === produit) ?? null) : null;
  const [genre, setGenre] = useState<GenreActu | null>(null);
  const [compte, setCompte] = useState<CompteMarque | null>(null);

  useEffect(() => {
    if (!m) return;
    document.title = `${pr ? `${m.nom} ${pr.nom}` : m.nom} · News · SONAA`;
    void comptesDesMarques().then((x) => setCompte(x.get(m.id) ?? null));
  }, [m, pr]);

  if (!m) {
    return (
      <section className="mq-page">
        <Retour />
        <p className="mq-note">{t.marqueIntrouvable}</p>
      </section>
    );
  }

  const filtre: Filtre = { marque: m.id, ...(pr ? { produit: `${m.id}:${pr.id}` } : {}) };
  const cle = `${m.id}/${pr?.id ?? ''}`;

  return (
    <section className="mq-page" aria-labelledby="mq-marque-titre">
      <Retour />
      <header className="mq-tete">
        <div className="mq-tete-mots">
          <p className="mq-surtitre">{NOM_DU_GROUPE.get(m.groupe)?.()}</p>
          <h2 id="mq-marque-titre" className="mq-titre-marque">
            {m.nom}
            {pr && <span className="mq-titre-produit"> {pr.nom}</span>}
          </h2>
          <p className="mq-tete-faits">
            {compte && !pr ? <span>{t.nActus(compte.n)}</span> : null}
            <a href={m.site} target="_blank" rel="noreferrer noopener" className="mq-site">
              {t.siteOfficiel}
              <FaIcon icon={faArrowUpRightFromSquare} className="mq-site-icone" />
            </a>
          </p>
        </div>
        <div className="mq-tete-actions">
          {pr && <BoutonSuivre suivis={suivis} suivi={{ marque: m.id, produit: pr.id }} nom={pr.nom} />}
          <BoutonSuivre suivis={suivis} suivi={{ marque: m.id, produit: '' }} nom={m.nom} petit={pr !== null} />
        </div>
      </header>

      <nav className="mq-produits" aria-label={t.lesMachines}>
        <a className="mq-puce" href={`#/news/marques/${m.id}`} aria-current={pr ? undefined : 'page'}>
          {t.toutesLesMachines}
        </a>
        {m.produits.map((p) => (
          <a key={p.id} className="mq-puce" href={`#/news/marques/${m.id}/${p.id}`} aria-current={pr?.id === p.id ? 'page' : undefined}>
            {p.nom}
            {suivis.cles.has(cleDeSuivi({ marque: m.id, produit: p.id })) && <FaIcon icon={faCheck} className="mq-puce-suivie" />}
          </a>
        ))}
      </nav>

      <OngletsGenre genre={genre} onGenre={setGenre} />

      {genre === null ? (
        <ApercuDesGenres key={cle} filtre={filtre} onGenre={setGenre} onVideo={onVideo} />
      ) : (
        <ListeActus key={`${cle}/${genre}`} filtre={{ ...filtre, genre }} onVideo={onVideo} />
      )}
    </section>
  );
}

function Retour() {
  return (
    <p className="mq-retour">
      <a href="#/news/marques">
        <FaIcon icon={faArrowLeft} className="mq-retour-icone" />
        {t.toutesLesMarques}
      </a>
    </p>
  );
}

function OngletsGenre({ genre, onGenre }: { genre: GenreActu | null; onGenre: (g: GenreActu | null) => void }) {
  const onglets: readonly { g: GenreActu | null; nom: string }[] = [
    { g: null, nom: t.genreTout },
    { g: 'video', nom: t.genreVideos },
    { g: 'article', nom: t.genreArticles },
    { g: 'discussion', nom: t.genreDiscussions },
  ];
  return (
    <div className="mq-genres" role="tablist">
      {onglets.map((o) => (
        <button key={o.nom} type="button" role="tab" aria-selected={genre === o.g} className="mq-genre" onClick={() => onGenre(o.g)}>
          {o.nom}
        </button>
      ))}
    </div>
  );
}

/* « Tout » : les videos en premier (c'est ce qu'on regarde d'une machine),
   puis les articles, puis les discussions. */
function ApercuDesGenres({ filtre, onGenre, onVideo }: { filtre: Filtre; onGenre: (g: GenreActu) => void; onVideo: (a: ActuMarque) => void }) {
  const [parGenre, setParGenre] = useState<Record<GenreActu, ActuMarque[]> | null>(null);
  useEffect(() => {
    let vivant = true;
    void Promise.all([
      actus({ ...filtre, genre: 'video', combien: 8 }),
      actus({ ...filtre, genre: 'article', combien: 8 }),
      actus({ ...filtre, genre: 'discussion', combien: 8 }),
    ])
      .then(([video, article, discussion]) => vivant && setParGenre({ video, article, discussion }))
      .catch(() => vivant && setParGenre({ video: [], article: [], discussion: [] }));
    return () => {
      vivant = false;
    };
    /* Le filtre est neuf a chaque rendu : on ne le suit pas. Sa cle
       (marque, machine) est celle du composant, qui se refait quand elle
       change. */
  }, []);

  if (!parGenre) return <p className="mq-note">{t.chargement}</p>;
  if (parGenre.video.length + parGenre.article.length + parGenre.discussion.length === 0) return <p className="mq-note">{t.aucuneActuMarque}</p>;

  const bloc = (g: GenreActu, titre: string, contenu: ReactNode): ReactNode =>
    parGenre[g].length > 0 && (
      <section className="mq-bloc" aria-label={titre}>
        <div className="mq-bloc-tete">
          <h3 className="mq-rayon-titre">{titre}</h3>
          <button type="button" className="mq-voir-tout" onClick={() => onGenre(g)}>
            {t.voirTout}
          </button>
        </div>
        {contenu}
      </section>
    );

  return (
    <>
      {bloc('video', t.genreVideos, <GrilleVideos actus={parGenre.video} onVideo={onVideo} />)}
      {bloc('article', t.genreArticles, <ListeArticles actus={parGenre.article} />)}
      {bloc('discussion', t.genreDiscussions, <ListeDiscussions actus={parGenre.discussion} />)}
    </>
  );
}

const PAGE = 24;

/** Un genre, ou un fil melange, page par page. */
function ListeActus({ filtre, onVideo }: { filtre: Filtre; onVideo: (a: ActuMarque) => void }) {
  const [liste, setListe] = useState<ActuMarque[] | null>(null);
  const [fin, setFin] = useState(false);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(
    async (depuis: number): Promise<void> => {
      setOccupe(true);
      try {
        const x = await actus({ ...filtre, depuis, combien: PAGE });
        setListe((l) => [...(depuis === 0 ? [] : (l ?? [])), ...x]);
        setFin(x.length < PAGE);
      } catch {
        setListe((l) => l ?? []);
        setFin(true);
      } finally {
        setOccupe(false);
      }
    },
    /* Meme regle : le composant porte la cle de son filtre. */
    []
  );
  useEffect(() => {
    void charger(0);
  }, [charger]);

  if (!liste) return <p className="mq-note">{t.chargement}</p>;
  if (liste.length === 0) return <p className="mq-note">{t.aucuneActuMarque}</p>;

  return (
    <>
      {filtre.genre === 'video' ? (
        <GrilleVideos actus={liste} onVideo={onVideo} />
      ) : filtre.genre === 'discussion' ? (
        <ListeDiscussions actus={liste} />
      ) : filtre.genre === 'article' ? (
        <ListeArticles actus={liste} />
      ) : (
        <ListeMelangee actus={liste} onVideo={onVideo} />
      )}
      {!fin && (
        <p className="mq-plus">
          <button type="button" className="mq-voir-tout" disabled={occupe} onClick={() => void charger(liste.length)}>
            {t.afficherPlus}
          </button>
        </p>
      )}
    </>
  );
}

/* ═══ LES ELEMENTS ═══ */

function Machines({ a }: { a: ActuMarque }) {
  const noms = a.produits.map(nomDuProduit).filter((x): x is string => x !== null).slice(0, 3);
  if (noms.length === 0) return null;
  return (
    <span className="mq-etiquettes">
      {noms.map((n) => (
        <span key={n} className="mq-etiquette">
          {n}
        </span>
      ))}
    </span>
  );
}

function GrilleVideos({ actus: liste, onVideo }: { actus: readonly ActuMarque[]; onVideo: (a: ActuMarque) => void }) {
  return (
    <ul className="mq-videos">
      {liste.map((a) => (
        <li key={a.lien}>
          <button type="button" className="mq-video" onClick={() => onVideo(a)}>
            <span className="mq-video-image">
              {a.image && <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
              <span className="mq-video-jouer" aria-hidden="true">
                <FaIcon icon={faPlay} />
              </span>
            </span>
            <span className="mq-video-titre">{a.titre}</span>
            <span className="mq-meta">
              {a.source}
              {a.date ? ` · ${ilYA(a.date)}` : ''}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ListeArticles({ actus: liste }: { actus: readonly ActuMarque[] }) {
  return (
    <ul className="mq-articles">
      {liste.map((a) => (
        <li key={a.lien}>
          <a className="mq-article" href={a.lien} target="_blank" rel="noreferrer noopener">
            <span className="mq-article-image">
              {a.image ? <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <FaIcon icon={faNewspaper} className="mq-sans-image" />}
            </span>
            <span className="mq-article-corps">
              <span className="mq-meta">
                {a.source}
                {a.date ? ` · ${ilYA(a.date)}` : ''}
              </span>
              <span className="mq-article-titre">{a.titre}</span>
              {a.resume && <span className="mq-article-resume">{a.resume}</span>}
              <Machines a={a} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function ListeDiscussions({ actus: liste }: { actus: readonly ActuMarque[] }) {
  return (
    <ul className="mq-discussions">
      {liste.map((a) => (
        <li key={a.lien}>
          <a className="mq-discussion" href={a.lien} target="_blank" rel="noreferrer noopener">
            <FaIcon icon={a.source.startsWith('r/') || a.source === 'Reddit' ? faReddit : faComments} className="mq-discussion-icone" />
            <span className="mq-discussion-corps">
              <span className="mq-discussion-titre">{a.titre}</span>
              <span className="mq-meta">
                {a.source}
                {a.date ? ` · ${ilYA(a.date)}` : ''}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Le fil de « Mes machines » : les trois genres meles, chacun a sa facon. */
function ListeMelangee({ actus: liste, onVideo }: { actus: readonly ActuMarque[]; onVideo: (a: ActuMarque) => void }) {
  return (
    <ul className="mq-melange">
      {liste.map((a) => (
        <li key={a.lien}>
          {a.genre === 'video' ? (
            <button type="button" className="mq-article mq-article-video" onClick={() => onVideo(a)}>
              <span className="mq-article-image">
                {a.image && <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                <span className="mq-video-jouer" aria-hidden="true">
                  <FaIcon icon={faPlay} />
                </span>
              </span>
              <span className="mq-article-corps">
                <span className="mq-meta">
                  <FaIcon icon={faYoutube} className="mq-meta-icone" />
                  {a.source}
                  {a.date ? ` · ${ilYA(a.date)}` : ''}
                </span>
                <span className="mq-article-titre">{a.titre}</span>
                <Machines a={a} />
              </span>
            </button>
          ) : a.genre === 'discussion' ? (
            <ListeDiscussions actus={[a]} />
          ) : (
            <ListeArticles actus={[a]} />
          )}
        </li>
      ))}
    </ul>
  );
}

/* ═══ MES MACHINES ═══ */
function MesMachines({ suivis, onVideo }: { suivis: EtatSuivis; onVideo: (a: ActuMarque) => void }) {
  const [genre, setGenre] = useState<GenreActu | null>(null);
  useEffect(() => {
    document.title = `${t.mesMachinesTitre} · News · SONAA`;
  }, []);
  const cle = [...suivis.cles].sort().join(',');

  return (
    <section className="mq-page" aria-labelledby="mq-suivis-titre">
      <h2 id="mq-suivis-titre" className="mq-titre-vue">
        {t.mesMachinesTitre}
      </h2>
      <p className="mq-lede">{t.mesMachinesLede}</p>

      {!suivis.connecte ? (
        <div className="mq-invitation">
          <p>{t.compteRequisSuivi}</p>
          <button type="button" className="mq-suivre mq-suivre-oui" onClick={demanderCompte}>
            {t.creerUnCompte}
          </button>
        </div>
      ) : suivis.liste.length === 0 ? (
        <div className="mq-invitation">
          <p>{t.aucunSuivi}</p>
          <a className="mq-suivre mq-suivre-oui" href="#/news/marques">
            {t.parcourirLesMarques}
          </a>
        </div>
      ) : (
        <>
          <ul className="mq-puces mq-mes-suivis">
            {suivis.liste.map((s) => {
              const m = MARQUE_PAR_ID.get(s.marque);
              if (!m) return null;
              const p = s.produit ? m.produits.find((x) => x.id === s.produit) : null;
              const nom = p ? `${m.nom} ${p.nom}` : m.nom;
              return (
                <li key={cleDeSuivi(s)} className="mq-puce mq-puce-suivi">
                  <a href={`#/news/marques/${m.id}${p ? `/${p.id}` : ''}`}>{nom}</a>
                  <button type="button" className="mq-puce-retirer" aria-label={t.nePlusSuivre(nom)} onClick={() => suivis.basculer(s)}>
                    <FaIcon icon={faXmark} />
                  </button>
                </li>
              );
            })}
          </ul>
          <OngletsGenre genre={genre} onGenre={setGenre} />
          <ListeActus key={`${cle}/${genre ?? ''}`} filtre={{ suivis: suivis.liste, ...(genre ? { genre } : {}) }} onVideo={onVideo} />
        </>
      )}
    </section>
  );
}

/* ═══ LA VIDEO, ICI ═══ Le lecteur sans cookies de YouTube, dans une
   fenetre ; la mixtape en cours se tait quand la video demarre. */
function FenetreVideo({ a, onFermer }: { a: ActuMarque; onFermer: () => void }) {
  const id = idVideo(a.lien);
  useEffect(() => {
    annoncerLecture('youtube');
    const echap = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', echap);
    return () => document.removeEventListener('keydown', echap);
  }, [onFermer]);
  return (
    <div className="mq-fenetre-voile" onClick={onFermer}>
      <div className="mq-fenetre" role="dialog" aria-modal="true" aria-label={a.titre} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mq-fenetre-fermer" onClick={onFermer} aria-label={t.fermer}>
          <FaIcon icon={faXmark} />
        </button>
        <div className="mq-fenetre-video">
          {id && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
              title={a.titre}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
        <div className="mq-fenetre-pied">
          <span className="mq-fenetre-titre">{a.titre}</span>
          <span className="mq-meta">
            {a.source}
            {a.date ? ` · ${ilYA(a.date)}` : ''}
            {' · '}
            <a href={a.lien} target="_blank" rel="noreferrer noopener">
              {t.voirSurYoutube}
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
