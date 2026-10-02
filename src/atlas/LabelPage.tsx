/* LA PAGE D'UN LABEL : #/labels/<slug>, et la liste de tous : #/labels.
 *
 * Mika, le 1er octobre 2026 : en cherchant un label connu, « une page avec
 * le label et toutes les explications, ainsi que les tracks les mieux notees
 * et les plus connues ». Voir src/lib/labels.ts pour d'ou vient chaque
 * champ, et scripts/moissonner-labels.ts pour la moisson.
 *
 * TROIS BLOCS, dans l'ordre ou on les cherche :
 *
 * 1. QUI : le nom, le pays, l'annee, les fondateurs, et la presentation de
 *    Wikipedia, avec son lien et sa licence.
 * 2. CE QUI S'EN ECOUTE ICI : les morceaux du label que l'atlas contient,
 *    jouables dans le mini lecteur, chacun avec son style.
 * 3. CE QUI A COMPTE : ses sorties que le plus de collectionneurs possedent
 *    chez Discogs, en pochettes, chacune vers sa fiche.
 *
 * Les morceaux de l'atlas ne sont pas recopies dans la fiche : ils sont lus
 * dans le corpus au moment de l'affichage, par le nom du label. Un morceau
 * ajoute au corpus apparait donc ici sans nouvelle moisson. */

import { useEffect, useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES, type Track } from './structures.ts';
import { ProceduralCover } from './ProceduralCover.tsx';
import { LogoLabel } from './LogoLabel.tsx';
import { FaIcon } from './FaIcon.tsx';
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { useLecteurPartage } from '../lecture/LecteurContexte.tsx';
import { peutEcouter } from '../lib/porte-ecoute.ts';
import { cleDeLabel, estMajor, nomDuPays, ordreDeNotoriete, type EntreeLabel, type FicheLabel } from '../lib/labels.ts';
import { slug } from '../lib/chemins.ts';
import INDEX from '../data/labels-index.json';
import { langue, t } from '../langue/langue.ts';
import './credits.css';
import './label.css';

const ENTREES = INDEX as readonly EntreeLabel[];

/* LA FICHE D'UN LABEL, SEULE. Le pre-rendu ecrit /labels/<slug>/fiche.json
   a cote de chaque page : plus de mille fiches pesent plusieurs mega-octets,
   et une page n'en montre qu'une. Le fichier entier ne se charge qu'en
   developpement, ou le pre-rendu n'a pas tourne. */
let toutes: Promise<readonly FicheLabel[]> | null = null;
const chargerToutes = (): Promise<readonly FicheLabel[]> => {
  toutes ??= import('../data/labels.json').then((m) => (m.default ?? m) as unknown as readonly FicheLabel[]);
  return toutes;
};
async function chargerFiche(slugVoulu: string): Promise<FicheLabel | null> {
  try {
    const r = await fetch(`/labels/${encodeURIComponent(slugVoulu)}/fiche.json`);
    if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) return (await r.json()) as FicheLabel;
  } catch {
    /* hors ligne : rien de plus a tenter */
  }
  /* En developpement, le pre-rendu n'a pas tourne : le fichier entier. Le
     test sur DEV le retire de la construction, ou ses 4,5 Mo depassaient la
     limite du cache hors ligne (vu le 1er octobre 2026). */
  if (import.meta.env.DEV) return (await chargerToutes()).find((f) => f.slug === slugVoulu || f.anciens?.includes(slugVoulu)) ?? null;
  return null;
}

interface PisteDuLabel {
  readonly track: Track;
  readonly genre: string;
  readonly famille: string;
  readonly chemin: string;
  readonly hue: number;
  /** Tous les styles qui revendiquent ce morceau, par identifiant. */
  readonly styles: string[];
}

interface StyleDeLatlas {
  readonly id: string;
  readonly nom: string;
  readonly chemin: string;
}

/** Un style de l'atlas par son identifiant, celui que porte ?style= . */
function styleParId(id: string): StyleDeLatlas | null {
  for (let fi = 0; fi < FAMILIES.length; fi += 1) {
    const f = FAMILIES[fi];
    const g = STRUCTURES[fi]?.genres.find((x) => x.id === id);
    if (f && g) return { id, nom: g.label, chemin: `/styles/${slug(f.label)}/${slug(g.label)}/` };
  }
  return null;
}

/** Les morceaux de l'atlas sortis sur ce label, un par enregistrement : une
    charniere revendiquee par deux genres n'apparait qu'une fois, sous le
    premier, mais se retrouve en ouvrant l'un ou l'autre. */
function pistesDuLabel(cles: readonly string[]): readonly PisteDuLabel[] {
  const voulues = new Set(cles);
  const vues = new Map<string, PisteDuLabel>();
  FAMILIES.forEach((f, fi) => {
    STRUCTURES[fi]?.genres.forEach((g) => {
      for (const tr of g.tracks) {
        const l = tr.release?.label;
        if (!l || !voulues.has(cleDeLabel(l))) continue;
        const deja = vues.get(tr.youtubeId);
        if (deja) {
          if (!deja.styles.includes(g.id)) deja.styles.push(g.id);
          continue;
        }
        vues.set(tr.youtubeId, { track: tr, genre: g.label, famille: f.label, chemin: `/styles/${slug(f.label)}/${slug(g.label)}/`, hue: f.hue, styles: [g.id] });
      }
    });
  });
  return [...vues.values()].sort((a, b) => (a.track.release?.year ?? a.track.year ?? 9999) - (b.track.release?.year ?? b.track.year ?? 9999));
}

function Pochette({ p }: { p: PisteDuLabel }) {
  if (p.track.cover) return <img className="lb-pochette" src={p.track.cover} alt="" loading="lazy" />;
  return (
    <span className="lb-pochette">
      <ProceduralCover artist={p.track.artist} title={p.track.title} hue={p.hue} />
    </span>
  );
}

function Fiche({ fiche, style }: { fiche: FicheLabel; style: string | null }) {
  const { lecture, jouer, basculer } = useLecteurPartage();
  const pistes = useMemo(() => pistesDuLabel(fiche.cles), [fiche]);

  /* LE STYLE OUVERT. Mika, le 1er octobre 2026 : « quand on clique sur les
     labels d'un style, on tombe sur la page du label avec le style ouvert ».
     Arrive de la fiche de l'IDM, Warp montre ses morceaux d'IDM, et un
     bouton rend les autres. Les pastilles de styles font la meme chose sur
     place. L'adresse suit (?style=), pour qu'on puisse la partager. */
  const [ouvert, setOuvert] = useState<string | null>(style);
  useEffect(() => setOuvert(style), [style, fiche.slug]);
  const ouvrir = (id: string | null): void => {
    setOuvert(id);
    window.history.replaceState(null, '', `#/labels/${fiche.slug}${id ? `?style=${id}` : ''}`);
  };

  /* SES STYLES : les genres de ses morceaux dans l'atlas, du plus present au
     moins present. Le style ouvert y est toujours. */
  const styles = useMemo(() => {
    const n = new Map<string, { style: StyleDeLatlas; n: number }>();
    for (const p of pistes) {
      for (const id of p.styles) {
        const x = n.get(id) ?? (() => {
          const s = styleParId(id);
          return s ? { style: s, n: 0 } : null;
        })();
        if (!x) continue;
        x.n += 1;
        n.set(id, x);
      }
    }
    const tous = [...n.values()].sort((a, b) => b.n - a.n);
    const premiers = tous.slice(0, 8);
    const lui = ouvert ? tous.find((x) => x.style.id === ouvert) : undefined;
    return lui && !premiers.includes(lui) ? [...premiers, lui] : premiers;
  }, [pistes, ouvert]);

  const styleOuvert = ouvert ? styleParId(ouvert) : null;
  const dansLeStyle = useMemo(() => (ouvert ? pistes.filter((p) => p.styles.includes(ouvert)) : []), [pistes, ouvert]);
  const visibles = styleOuvert && dansLeStyle.length > 0 ? dansLeStyle : pistes;
  const morceaux = useMemo(() => visibles.map((p) => p.track), [visibles]);
  const listeId = `label:${fiche.slug}:${styleOuvert && dansLeStyle.length > 0 ? styleOuvert.id : ''}`;

  useEffect(() => {
    document.title = `${fiche.nom} · SONAA`;
  }, [fiche.nom]);

  const resume = langue === 'en' ? (fiche.resume.en ?? fiche.resume.fr) : (fiche.resume.fr ?? fiche.resume.en);
  const langueDuResume = langue === 'en' ? (fiche.resume.en ? 'en' : 'fr') : fiche.resume.fr ? 'fr' : 'en';
  const wiki = langueDuResume === 'fr' ? (fiche.wiki.fr ?? fiche.wiki.en) : (fiche.wiki.en ?? fiche.wiki.fr);
  const faits = [fiche.pays ? nomDuPays(fiche.pays, langue) : null, fiche.annee ? t.labelFonde(fiche.annee) : null, fiche.fondateurs.length > 0 ? t.labelPar(fiche.fondateurs) : null].filter(
    (x): x is string => Boolean(x)
  );

  return (
    <article className="lb">
      <header className="lb-tete lb-tete-fiche">
        {/* LE FOND DE LA TETE : ses pochettes les plus connues, floutees.
            Le label se reconnait a ses disques avant de se lire. */}
        {fiche.sorties.some((s) => s.image) && (
          <div className="lb-fond" aria-hidden="true">
            {fiche.sorties
              .filter((s) => s.image)
              .slice(0, 4)
              .map((s) => (
                <img key={s.url} src={s.image ?? ''} alt="" loading="lazy" />
              ))}
          </div>
        )}
        <LogoLabel nom={fiche.nom} url={fiche.logo?.url} taille="grand" />
        <div className="lb-tete-texte">
        <p className="lb-surtitre">
          <a href="#/labels">{t.lesLabels}</a>
        </p>
        <h1 className="lb-nom">{fiche.nom}</h1>
        {faits.length > 0 && <p className="lb-faits">{faits.join(' · ')}</p>}
        <p className="lb-liens">
          {fiche.site && (
            <a href={fiche.site} target="_blank" rel="noreferrer noopener">
              {t.labelSite}
            </a>
          )}
          {fiche.discogs && (
            <a href={fiche.discogs} target="_blank" rel="noreferrer noopener">
              {t.labelVoirDiscogs}
            </a>
          )}
        </p>
        {fiche.logo?.source === 'commons' && fiche.logo.credit && fiche.logo.page && (
          <a className="lb-credit-logo" href={fiche.logo.page} target="_blank" rel="noreferrer noopener">
            {t.labelLogoCredit(fiche.logo.credit)}
          </a>
        )}
        </div>
      </header>

      <div className="lb-colonnes">
        <div className="lb-principal">
          {(resume || fiche.profil) && (
            <section className="lb-bloc">
              <p className="lb-resume" lang={resume ? langueDuResume : 'en'}>
                {resume ?? fiche.profil}
              </p>
              {resume && wiki ? (
                <a className="lb-source" href={wiki} target="_blank" rel="noreferrer noopener">
                  {t.labelLireWikipedia}
                </a>
              ) : (
                <p className="lb-source">{t.labelSourceDiscogs}</p>
              )}
            </section>
          )}

          {styles.length > 0 && (
            <section className="lb-bloc">
              <h2 className="lb-titre">{t.labelStyles}</h2>
              <ul className="lb-styles">
                {styles.map((s) => (
                  <li key={s.style.id}>
                    <button type="button" aria-pressed={ouvert === s.style.id} onClick={() => ouvrir(ouvert === s.style.id ? null : s.style.id)}>
                      {s.style.nom}
                      <span className="lb-styles-n">{s.n}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="lb-bloc">
            {styleOuvert && dansLeStyle.length > 0 ? (
              <>
                <h2 className="lb-titre">{t.labelDansLeStyle(styleOuvert.nom, dansLeStyle.length)}</h2>
                <p className="lb-style-actions">
                  <button type="button" onClick={() => ouvrir(null)}>
                    {t.labelTousSesMorceaux(pistes.length)}
                  </button>
                  <a href={styleOuvert.chemin}>{t.labelVoirLeStyle(styleOuvert.nom)}</a>
                </p>
              </>
            ) : (
              <>
                <h2 className="lb-titre">{t.labelDansLAtlas(pistes.length)}</h2>
                {styleOuvert && pistes.length > 0 && <p className="lb-note">{t.labelRienDansCeStyle(styleOuvert.nom)}</p>}
              </>
            )}
            {pistes.length === 0 ? (
              <p className="lb-note">{t.labelAucunMorceau}</p>
            ) : (
              <ol className="lb-pistes">
                {visibles.map((p, i) => {
                  const active = lecture.listeId === listeId && lecture.index === i;
                  return (
                    <li key={p.track.youtubeId} className="lb-piste" data-active={active}>
                      <button
                        type="button"
                        className="lb-jouer"
                        aria-label={`${t.ecouter} : ${p.track.title}`}
                        onClick={() => {
                          if (!peutEcouter()) return;
                          if (active) basculer();
                          else jouer(morceaux, i, listeId);
                        }}
                      >
                        <Pochette p={p} />
                        <span className="lb-jouer-icone" aria-hidden="true">
                          <FaIcon icon={active && lecture.etat === 'joue' ? faPause : faPlay} />
                        </span>
                      </button>
                      <span className="lb-piste-texte">
                        <span className="lb-piste-titre">{p.track.title}</span>
                        <span className="lb-piste-artiste">
                          {p.track.artist}
                          {(p.track.release?.year ?? p.track.year) ? ` · ${p.track.release?.year ?? p.track.year}` : ''}
                        </span>
                      </span>
                      {/* Le style ouvert se lit sur chaque ligne, meme quand le
                          morceau est range d'abord sous un autre. */}
                      <a className="lb-piste-style" href={styleOuvert && p.styles.includes(styleOuvert.id) ? styleOuvert.chemin : p.chemin}>
                        {styleOuvert && p.styles.includes(styleOuvert.id) ? styleOuvert.nom : p.genre}
                      </a>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {fiche.sorties.length > 0 && (
          <aside className="lb-bloc lb-sorties-bloc">
            <h2 className="lb-titre">{t.labelSortiesConnues}</h2>
            <ul className="lb-sorties">
              {fiche.sorties.map((s) => (
                <li key={s.url} className="lb-sortie">
                  <a href={s.url} target="_blank" rel="noreferrer noopener">
                    {s.image ? (
                      <img src={s.image} alt="" loading="lazy" />
                    ) : (
                      <span className="lb-sortie-vide" aria-hidden="true" />
                    )}
                    <span className="lb-sortie-titre">{s.titre}</span>
                    <span className="lb-sortie-artiste">
                      {s.artiste}
                      {s.annee ? ` · ${s.annee}` : ''}
                    </span>
                    <span className="lb-sortie-compte">{t.labelCollectionneurs(s.possedee)}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="lb-note">{t.labelSortiesAide}</p>
          </aside>
        )}
      </div>
    </article>
  );
}

/* ═══ LA GALERIE DE TOUS LES LABELS ═══

   Mika, le 1er octobre 2026 : « une belle page design, avec des logos de
   labels ». Les plus connus d'abord (le nombre de collectionneurs de leur
   disque le plus possede), en cartes a logo ; un champ pour chercher, un
   tri A a Z, un filtre par pays. En tete, les huit incontournables en
   grand. */
function Galerie() {
  const [terme, setTerme] = useState('');
  const [tri, setTri] = useState<'connus' | 'alpha'>('connus');
  const [pays, setPays] = useState('');
  useEffect(() => {
    document.title = `${t.lesLabels} · SONAA`;
  }, []);

  const lesPays = useMemo(() => {
    const n = new Map<string, number>();
    for (const e of ENTREES) if (e.p) n.set(e.p, (n.get(e.p) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, []);

  const liste = useMemo(() => {
    const q = cleDeLabel(terme);
    return ENTREES.filter((e) => (!q || e.k.some((k) => k.includes(q))) && (!pays || e.p === pays)).sort((a, b) =>
      tri === 'alpha' ? a.n.localeCompare(b.n) : ordreDeNotoriete(a, b)
    );
  }, [terme, tri, pays]);

  const uneVue = !terme && !pays && tri === 'connus';
  /* LES INCONTOURNABLES ONT DES MORCEAUX DANS L'ATLAS. Avec les petits
     labels, Sonet, Chrysalis ou Circa passaient en tete : Discogs compte a
     chaque label qui a presse Violator ou Mezzanine dans un pays tous les
     collectionneurs du disque. Trois morceaux au moins, comme le seuil des
     premieres pages, ecartent les licences d'un seul tube. */
  const aLaUne = uneVue ? liste.filter((e) => !estMajor(e) && e.c >= 3).slice(0, 8) : [];
  const reste = uneVue ? liste.filter((e) => !aLaUne.includes(e)) : liste;

  const carte = (e: EntreeLabel, grande: boolean) => (
    <li key={e.s} className={grande ? 'lbg-carte lbg-carte-une' : 'lbg-carte'}>
      <a href={`#/labels/${e.s}`}>
        <LogoLabel nom={e.n} url={e.l} />
        <span className="lbg-nom">{e.n}</span>
        <span className="lbg-faits">{[e.p ? nomDuPays(e.p, langue) : null, e.a].filter(Boolean).join(' · ')}</span>
        {e.c > 0 && <span className="lbg-compte">{t.labelResultat(e.c)}</span>}
      </a>
    </li>
  );

  return (
    <section className="lb lbg">
      <header className="lb-tete lbg-tete">
        <h1 className="lb-nom">{t.lesLabels}</h1>
        <p className="lb-faits">{t.labelsChapeau(ENTREES.length)}</p>
        <div className="lbg-outils">
          <input
            type="search"
            className="lbg-chercher"
            placeholder={t.labelsChercher}
            aria-label={t.labelsChercher}
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
          />
          <div className="lbg-tri" role="group">
            <button type="button" aria-pressed={tri === 'connus'} onClick={() => setTri('connus')}>
              {t.labelsTriConnus}
            </button>
            <button type="button" aria-pressed={tri === 'alpha'} onClick={() => setTri('alpha')}>
              {t.labelsTriAlpha}
            </button>
          </div>
          <select className="lbg-pays" value={pays} onChange={(e) => setPays(e.target.value)} aria-label={t.labelsTousPays}>
            <option value="">{t.labelsTousPays}</option>
            {lesPays.map((p) => (
              <option key={p} value={p}>
                {nomDuPays(p, langue)}
              </option>
            ))}
          </select>
        </div>
      </header>

      {aLaUne.length > 0 && (
        <div className="lbg-section">
          <h2 className="lb-titre">{t.labelsALaUne}</h2>
          <ul className="lbg-grille lbg-grille-une">{aLaUne.map((e) => carte(e, true))}</ul>
        </div>
      )}
      <div className="lbg-section">
        {uneVue && <h2 className="lb-titre">{t.labelsTous(ENTREES.length)}</h2>}
        {reste.length === 0 && aLaUne.length === 0 ? (
          <p className="lb-note">{t.labelsAucun}</p>
        ) : (
          <ul className="lbg-grille">{reste.map((e) => carte(e, false))}</ul>
        )}
      </div>
    </section>
  );
}

export function LabelPage() {
  const lireSlug = (): string | null => /^#\/labels\/([^/?#]+)/.exec(window.location.hash)?.[1] ?? null;
  const lireStyle = (): string | null => /[?&]style=([^&#]+)/.exec(window.location.hash)?.[1] ?? null;
  const [slugCourant, setSlugCourant] = useState<string | null>(lireSlug);
  const [styleCourant, setStyleCourant] = useState<string | null>(lireStyle);
  const [fiche, setFiche] = useState<FicheLabel | null | 'chargement'>('chargement');

  useEffect(() => {
    const suivre = (): void => {
      setSlugCourant(lireSlug());
      setStyleCourant(lireStyle());
    };
    window.addEventListener('hashchange', suivre);
    return () => window.removeEventListener('hashchange', suivre);
  }, []);

  useEffect(() => {
    let vivant = true;
    if (!slugCourant) {
      setFiche(null);
      return;
    }
    setFiche('chargement');
    void chargerFiche(slugCourant).then((f) => {
      if (vivant) setFiche(f);
    });
    window.scrollTo(0, 0);
    return () => {
      vivant = false;
    };
  }, [slugCourant]);

  return (
    <>
      <EnTeteSite />
      <main className="credits lb-page">
        {!slugCourant ? (
          <Galerie />
        ) : fiche === 'chargement' ? (
          <p className="lb-note">{t.chargement}</p>
        ) : fiche ? (
          <Fiche fiche={fiche} style={styleCourant} />
        ) : (
          <section className="lb">
            <p className="lb-note">{t.labelIntrouvable}</p>
            <a href="#/labels">{t.labelTousLesLabels}</a>
          </section>
        )}
        <PiedDePage />
      </main>
    </>
  );
}
