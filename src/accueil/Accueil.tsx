/* L'ACCUEIL : UNE PORTE, ET TOUTES LES PIECES EN DESSOUS.
 *
 * Mika, le 8 octobre 2026 : « le site a besoin d'amour, c'est pas agreable.
 * Il faut une page d'accueil, et au scroll on voit toutes les pages, et quand
 * on clique tout a une page dediee. Il faut un effet wow quand on arrive ».
 *
 * La racine ouvrait le calendrier depuis le 7 septembre 2026. Le calendrier
 * garde son adresse (#/calendrier) et sa place en tete du menu ; la racine
 * devient une page qui montre, de haut en bas, un extrait vivant de chaque
 * section, chacun avec sa porte vers la page entiere :
 *
 *   un mur de pochettes de l'atlas, en parallaxe (l'ouverture, voir
 *   MurDePochettes.tsx ; c'etait le spectre des styles jusqu'au
 *   10 octobre 2026, Mika : « j'aime pas la presentation de la premiere
 *   page, il faut quelque chose de plus attrayant »),
 *   les prochaines soirees de la ville,
 *   Track ID, un grand bouton qui ecoute sur place,
 *   les styles : les 219 noms qui defilent, puis les familles en pochettes,
 *   les dernieres sorties des labels,
 *   les news,
 *   les mixtapes.
 *
 * RIEN N'EST INVENTE POUR FAIRE JOLI : chaque bloc lit les memes donnees que
 * la page qu'il annonce, et un bloc qui n'a rien a montrer ne s'affiche pas. */

import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import { PiedDePage } from '../atlas/PiedDePage.tsx';
import { Apparition } from '../design/mouvement.tsx';
import { FAMILIES } from '../atlas/structures.ts';
import { slug } from '../lib/chemins.ts';
import { langue, t } from '../langue/langue.ts';
import { ImageDeSoiree } from '../atlas/AfficheGeneree.tsx';
import { quandEnLettres } from '../lib/date-soiree.ts';
import { heureLocale } from '../lib/villes.ts';
import { FaIcon } from '../atlas/FaIcon.tsx';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { setsPublics, urlPochette, type SetDJ } from '../lib/sets.ts';
import { SOURCES } from '../data/news-sources.ts';
import A_LA_UNE from '../data/sorties-a-la-une.json';
import { DefileDesStyles } from './DefileDesStyles.tsx';
import { MurDePochettes } from './MurDePochettes.tsx';
import { pochetteDeLaFamille } from './pochettes.ts';
import { useSoireesAVenir } from './soirees-a-venir.ts';
import '../atlas/calendrier.css';
import './accueil.css';

const Reconnaissance = lazy(() => import('../reconnaitre/Reconnaissance.tsx').then((m) => ({ default: m.Reconnaissance })));

const LOCALE = langue === 'fr' ? 'fr-CA' : 'en-CA';
const NOMBRE = new Intl.NumberFormat(LOCALE);

interface SortieUne {
  readonly titre: string;
  readonly artiste: string;
  readonly annee: number | null;
  readonly image: string | null;
  readonly url: string;
  readonly label: string;
  readonly slug: string;
}

interface ArticleNews {
  readonly source: string;
  readonly titre: string;
  readonly lien: string;
  readonly date: string | null;
  readonly image: string | null;
}

/** Une section de l'accueil : un numero, un titre, une phrase, une porte. */
function Section({
  n,
  id,
  titre,
  sous,
  lien,
  libelle,
  children,
}: {
  readonly n: number;
  readonly id: string;
  readonly titre: string;
  readonly sous: string;
  readonly lien: string;
  readonly libelle: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="ac-section" id={id} aria-labelledby={`${id}-titre`}>
      <Apparition className="ac-section-tete">
        <span className="ac-numero" aria-hidden="true">
          {String(n).padStart(2, '0')}
        </span>
        <div className="ac-section-mots">
          <h2 className="ac-section-titre" id={`${id}-titre`}>
            {titre}
          </h2>
          <p className="ac-section-sous">{sous}</p>
        </div>
        <a className="ac-porte" href={lien}>
          {libelle}
          <span aria-hidden="true"> →</span>
        </a>
      </Apparition>
      {children}
    </section>
  );
}

export function Accueil() {
  useEffect(() => {
    document.title = `SONAA · ${t.accueilOnglet}`;
  }, []);

  const { ville, soirees, nVilles, sansVille } = useSoireesAVenir(10);
  const [ecoute, setEcoute] = useState(false);
  const [news, setNews] = useState<readonly ArticleNews[]>([]);
  const [mixtapes, setMixtapes] = useState<readonly SetDJ[]>([]);

  useEffect(() => {
    let vivant = true;
    void fetch(`${import.meta.env.BASE_URL}news.json`)
      .then((r) => (r.ok ? r.json() : { articles: [] }))
      .then((d: { articles?: ArticleNews[] }) => vivant && setNews((d.articles ?? []).slice(0, 5)))
      .catch(() => undefined);
    void setsPublics()
      .then((s) => vivant && setMixtapes(s.slice(0, 4)))
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  const nStyles = useMemo(() => FAMILIES.reduce((n, f) => n + f.count, 0), []);
  /* Le nombre de labels vient du petit fichier de l'accueil, pas de
     l'index entier, qui pese 370 Ko. */
  const nLabels = (A_LA_UNE as { labels: number }).labels;
  const sorties = (A_LA_UNE as { sorties: readonly SortieUne[] }).sorties;
  const fuseau = ville?.timezone ?? 'America/Toronto';

  return (
    <>
      <EnTeteSite />
      <main className="ac">
        {/* ═══ L'OUVERTURE ═══ Le mur de pochettes derriere, le titre
            devant, centre. Voir MurDePochettes.tsx. */}
        <section className="ac-hero" aria-labelledby="ac-titre">
          <MurDePochettes />
          <div className="ac-hero-voile" aria-hidden="true" />
          <div className="ac-hero-texte">
            <p className="ac-surtitre">SONAA</p>
            <h1 className="ac-titre" id="ac-titre">
              <span className="ac-ligne">
                <span>{t.accueilTitre1}</span>
              </span>
              <span className="ac-ligne">
                <span>{t.accueilTitre2}</span>
              </span>
            </h1>
            <p className="ac-chapeau">{t.accueilChapeau}</p>
            <p className="ac-gestes">
              <a className="ac-geste ac-geste-plein" href="#/calendrier">
                {ville ? t.accueilCeSoirA(ville.name) : t.heroChoisirVille}
              </a>
              <a className="ac-geste" href="#/parcourir">
                {t.accueilExplorer(nStyles)}
              </a>
            </p>
            <p className="ac-chiffres">
              <span>
                <strong>{nStyles}</strong> {t.accueilStylesMot}
              </span>
              <span>
                <strong>{NOMBRE.format(nLabels)}</strong> {t.accueilLabelsMot}
              </span>
              {nVilles > 0 && (
                <span>
                  <strong>{nVilles}</strong> {t.accueilVillesMot}
                </span>
              )}
            </p>
          </div>
          <a className="ac-defiler" href="#ac-soirees">
            <span>{t.accueilDefiler}</span>
            <i aria-hidden="true" />
          </a>
        </section>

        {/* ═══ LES SOIREES ═══ Chaque affiche glisse dans son cadre pendant
            que la carte traverse l'ecran (voir accueil.css). */}
        <Section
          n={1}
          id="ac-soirees"
          titre={t.accueilSoireesTitre}
          sous={ville ? t.accueilSoireesSous(ville.name) : t.accueilSoireesSansVille}
          lien="#/calendrier"
          libelle={t.accueilToutLeCalendrier}
        >
          {soirees && soirees.length > 0 ? (
            <ul className="ac-rangee ac-soirees">
              {soirees.map((s, i) => (
                <Apparition as="li" i={i} key={s.id} className="ac-soiree">
                  <a href="#/calendrier">
                    <span className="ac-cadre">
                      <ImageDeSoiree soiree={s} fuseau={fuseau} variante="carte" className="ac-soiree-affiche" />
                    </span>
                    <span className="ac-soiree-quand">{quandEnLettres(s, s.debut ? heureLocale(s.debut, fuseau) : null, fuseau, LOCALE, false)}</span>
                    <span className="ac-soiree-titre">{s.titre}</span>
                    {s.lieu && <span className="ac-soiree-lieu">{s.lieu}</span>}
                  </a>
                </Apparition>
              ))}
            </ul>
          ) : sansVille || (soirees && soirees.length === 0) ? (
            <p className="ac-vide">
              <a className="ac-geste" href="#/calendrier">
                {t.heroChoisirVille}
              </a>
            </p>
          ) : (
            <ul className="ac-rangee ac-soirees" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="ac-soiree ac-fantome" />
              ))}
            </ul>
          )}
        </Section>

        {/* ═══ TRACK ID ═══ Une bande a part, sombre, et au milieu le seul
            objet du site qui ecoute : un grand rond orange qui respire. Le
            clic lance l'ecoute ici meme. */}
        <section className="ac-ecoute" id="ac-trackid" aria-labelledby="ac-trackid-titre">
          <div className="ac-ecoute-dedans">
            <p className="ac-numero">02</p>
            <h2 className="ac-ecoute-titre" id="ac-trackid-titre">
              {t.accueilTrackIdTitre}
            </h2>
            <p className="ac-ecoute-sous">{t.accueilTrackIdSous}</p>
            <button
              type="button"
              className="ac-micro"
              aria-expanded={ecoute}
              onClick={() => setEcoute(true)}
            >
              <span className="ac-micro-onde" aria-hidden="true" />
              <span className="ac-micro-onde ac-micro-onde-2" aria-hidden="true" />
              <FaIcon icon={faMicrophone} className="ac-micro-icone" />
              <span className="ac-micro-mot">{t.trackId}</span>
            </button>
            {ecoute && (
              <div className="ac-ecoute-resultat">
                <Suspense fallback={null}>
                  <Reconnaissance enLigne demarrer />
                </Suspense>
              </div>
            )}
          </div>
        </section>

        {/* ═══ LES STYLES ═══ Les 219 noms qui defilent (voir
            DefileDesStyles.tsx), puis les quatorze familles, chacune sur la
            pochette de son genre majeur. */}
        <Section
          n={3}
          id="ac-styles"
          titre={t.accueilStylesTitre(nStyles, FAMILIES.length)}
          sous={t.accueilStylesSous}
          lien="#/parcourir"
          libelle={t.accueilOuvrirAtlas}
        >
          <DefileDesStyles />
          <ul className="ac-familles">
            {FAMILIES.map((f, i) => {
              const pochette = pochetteDeLaFamille(i);
              return (
                <Apparition as="li" i={i} key={f.id}>
                  <a href={`/styles/${slug(f.label)}/`} className="ac-famille" style={{ ['--teinte' as string]: f.hue }}>
                    {pochette && <img className="ac-famille-image" src={pochette} alt="" loading="lazy" decoding="async" />}
                    <span className="ac-famille-nom">{f.label}</span>
                    <span className="ac-famille-n">{t.accueilNStyles(f.count)}</span>
                  </a>
                </Apparition>
              );
            })}
          </ul>
        </Section>

        {/* ═══ LES LABELS ═══ Les dernieres sorties, voir
            scripts/lib/actu-labels.ts (sortiesALaUne). */}
        {sorties.length > 0 && (
          <Section n={4} id="ac-labels" titre={t.accueilLabelsTitre} sous={t.accueilLabelsSous} lien="#/labels" libelle={t.labelTousLesLabels}>
            <ul className="ac-rangee ac-sorties">
              {sorties.map((s, i) => (
                <Apparition as="li" i={i} key={s.url} className="ac-sortie">
                  <a href={`#/labels/${s.slug}`}>
                    {s.image ? <img src={s.image} alt="" loading="lazy" /> : <span className="ac-sortie-vide" aria-hidden="true" />}
                    <span className="ac-sortie-titre">{s.titre}</span>
                    <span className="ac-sortie-artiste">{s.artiste}</span>
                    <span className="ac-sortie-label">{s.label}</span>
                  </a>
                </Apparition>
              ))}
            </ul>
          </Section>
        )}

        {/* ═══ LES NEWS ═══ Les cinq dernieres, la premiere en grand ; le titre ouvre l'article dans
            la page News, comme la-bas. */}
        {news.length > 0 && (
          <Section n={sorties.length > 0 ? 5 : 4} id="ac-news" titre={t.leNews} sous={t.accueilNewsSous} lien="#/news" libelle={t.accueilToutesLesNews}>
            <ul className="ac-news">
              {news.map((a, i) => (
                <Apparition as="li" i={i} key={a.lien} className={i === 0 ? 'ac-article ac-article-une' : 'ac-article'}>
                  <a href={`#/news/lire?u=${encodeURIComponent(a.lien)}`}>
                    {a.image && (
                      <span className="ac-cadre">
                        <img src={a.image} alt="" loading="lazy" />
                      </span>
                    )}
                    <span className="ac-article-source">{SOURCES.find((x) => x.id === a.source)?.nom ?? a.source}</span>
                    <span className="ac-article-titre">{a.titre}</span>
                  </a>
                </Apparition>
              ))}
            </ul>
          </Section>
        )}

        {/* ═══ LES MIXTAPES ═══ */}
        {mixtapes.length > 0 && (
          <Section
            n={(sorties.length > 0 ? 5 : 4) + (news.length > 0 ? 1 : 0)}
            id="ac-mixtapes"
            titre={t.lesMixtapes}
            sous={t.accueilMixtapesSous}
            lien="#/mixtapes"
            libelle={t.accueilToutesLesMixtapes}
          >
            <ul className="ac-mixtapes">
              {mixtapes.map((m, i) => {
                const pochette = urlPochette(m.cover_path);
                return (
                  <Apparition as="li" i={i} key={m.id} className="ac-mixtape">
                    <a href={`#/mixtapes/${m.id}`}>
                      {pochette ? <img src={pochette} alt="" loading="lazy" /> : <span className="ac-sortie-vide" aria-hidden="true" />}
                      <span className="ac-mixtape-titre">{m.titre}</span>
                      {m.artiste_nom && <span className="ac-mixtape-artiste">{m.artiste_nom}</span>}
                    </a>
                  </Apparition>
                );
              })}
            </ul>
          </Section>
        )}
        <PiedDePage />
      </main>
    </>
  );
}
