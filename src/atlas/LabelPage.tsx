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
import { FaIcon } from './FaIcon.tsx';
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { useLecteurPartage } from '../lecture/LecteurContexte.tsx';
import { peutEcouter } from '../lib/porte-ecoute.ts';
import { cleDeLabel, type EntreeLabel, type FicheLabel } from '../lib/labels.ts';
import { slug } from '../lib/chemins.ts';
import INDEX from '../data/labels-index.json';
import { langue, t } from '../langue/langue.ts';
import './credits.css';
import './label.css';

const ENTREES = INDEX as readonly EntreeLabel[];

let fiches: Promise<readonly FicheLabel[]> | null = null;
const chargerFiches = (): Promise<readonly FicheLabel[]> => {
  fiches ??= import('../data/labels.json').then((m) => (m.default ?? m) as unknown as readonly FicheLabel[]);
  return fiches;
};

interface PisteDuLabel {
  readonly track: Track;
  readonly genre: string;
  readonly famille: string;
  readonly chemin: string;
  readonly hue: number;
}

/** Les morceaux de l'atlas sortis sur ce label, un par enregistrement : une
    charniere revendiquee par deux genres n'apparait qu'une fois. */
function pistesDuLabel(cles: readonly string[]): readonly PisteDuLabel[] {
  const voulues = new Set(cles);
  const vues = new Set<string>();
  const sortie: PisteDuLabel[] = [];
  FAMILIES.forEach((f, fi) => {
    STRUCTURES[fi]?.genres.forEach((g) => {
      for (const tr of g.tracks) {
        const l = tr.release?.label;
        if (!l || !voulues.has(cleDeLabel(l)) || vues.has(tr.youtubeId)) continue;
        vues.add(tr.youtubeId);
        sortie.push({ track: tr, genre: g.label, famille: f.label, chemin: `/styles/${slug(f.label)}/${slug(g.label)}/`, hue: f.hue });
      }
    });
  });
  return sortie.sort((a, b) => (a.track.release?.year ?? a.track.year ?? 9999) - (b.track.release?.year ?? b.track.year ?? 9999));
}

function Pochette({ p }: { p: PisteDuLabel }) {
  if (p.track.cover) return <img className="lb-pochette" src={p.track.cover} alt="" loading="lazy" />;
  return (
    <span className="lb-pochette">
      <ProceduralCover artist={p.track.artist} title={p.track.title} hue={p.hue} />
    </span>
  );
}

function Fiche({ fiche }: { fiche: FicheLabel }) {
  const { lecture, jouer, basculer } = useLecteurPartage();
  const pistes = useMemo(() => pistesDuLabel(fiche.cles), [fiche]);
  const morceaux = useMemo(() => pistes.map((p) => p.track), [pistes]);
  const listeId = `label:${fiche.slug}`;

  /* SES STYLES : les genres de ses morceaux dans l'atlas, du plus present au
     moins present. */
  const styles = useMemo(() => {
    const n = new Map<string, { genre: string; chemin: string; n: number }>();
    for (const p of pistes) {
      const x = n.get(p.chemin) ?? { genre: p.genre, chemin: p.chemin, n: 0 };
      x.n += 1;
      n.set(p.chemin, x);
    }
    return [...n.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  }, [pistes]);

  useEffect(() => {
    document.title = `${fiche.nom} · SONAA`;
  }, [fiche.nom]);

  const resume = langue === 'en' ? (fiche.resume.en ?? fiche.resume.fr) : (fiche.resume.fr ?? fiche.resume.en);
  const langueDuResume = langue === 'en' ? (fiche.resume.en ? 'en' : 'fr') : fiche.resume.fr ? 'fr' : 'en';
  const wiki = langueDuResume === 'fr' ? (fiche.wiki.fr ?? fiche.wiki.en) : (fiche.wiki.en ?? fiche.wiki.fr);
  const faits = [fiche.pays, fiche.annee ? t.labelFonde(fiche.annee) : null, fiche.fondateurs.length > 0 ? t.labelPar(fiche.fondateurs) : null].filter(
    (x): x is string => Boolean(x)
  );

  return (
    <article className="lb">
      <header className="lb-tete">
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
                  <li key={s.chemin}>
                    <a href={s.chemin}>{s.genre}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="lb-bloc">
            <h2 className="lb-titre">{t.labelDansLAtlas(pistes.length)}</h2>
            {pistes.length === 0 ? (
              <p className="lb-note">{t.labelAucunMorceau}</p>
            ) : (
              <ol className="lb-pistes">
                {pistes.map((p, i) => {
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
                      <a className="lb-piste-style" href={p.chemin}>
                        {p.genre}
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

/** La liste de tous les labels, par ordre alphabetique, avec leur pays,
    leur annee et leur nombre de morceaux dans l'atlas. */
function Liste() {
  useEffect(() => {
    document.title = `${t.lesLabels} · SONAA`;
  }, []);
  return (
    <section className="lb">
      <header className="lb-tete">
        <h1 className="lb-nom">{t.lesLabels}</h1>
        <p className="lb-faits">{t.labelsChapeau(ENTREES.length)}</p>
      </header>
      <ul className="lb-liste">
        {ENTREES.map((e) => (
          <li key={e.s}>
            <a href={`#/labels/${e.s}`}>
              <span className="lb-liste-nom">{e.n}</span>
              <span className="lb-liste-faits">{[e.p, e.a, e.c > 0 ? t.labelResultat(e.c) : null].filter(Boolean).join(' · ')}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LabelPage() {
  const lireSlug = (): string | null => /^#\/labels\/([^/?#]+)/.exec(window.location.hash)?.[1] ?? null;
  const [slugCourant, setSlugCourant] = useState<string | null>(lireSlug);
  const [fiche, setFiche] = useState<FicheLabel | null | 'chargement'>('chargement');

  useEffect(() => {
    const suivre = (): void => setSlugCourant(lireSlug());
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
    void chargerFiches().then((toutes) => {
      if (vivant) setFiche(toutes.find((f) => f.slug === slugCourant) ?? null);
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
          <Liste />
        ) : fiche === 'chargement' ? (
          <p className="lb-note">{t.chargement}</p>
        ) : fiche ? (
          <Fiche fiche={fiche} />
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
