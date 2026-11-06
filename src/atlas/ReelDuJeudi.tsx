/* L'ONGLET « REEL DU JEUDI » DE L'ADMINISTRATION (ADR-115).
 *
 * Mika, le 31 octobre 2026 : « un reel tous les jeudis avec les soirees de
 * la fin de semaine, les grosses news, les nouvelles mixtapes qui
 * fonctionnent bien, le label de la semaine et le style qui correspond, a
 * telecharger depuis mon panneau admin ».
 *
 * L'onglet rassemble tout a l'ouverture, propose une selection
 * (lib/reel-semaine.ts dit pourquoi celle-la), laisse cocher et decocher,
 * montre un apercu muet, et fabrique la video : 1080 x 1920, en MP4, avec
 * le rythme du style du label en musique (rythme/son.ts). La fabrication est
 * muette : le son part dans le fichier, jamais dans les haut-parleurs.
 *
 * MONTREAL, ET C'EST VOULU : c'est la ville du compte Instagram. Une autre
 * ville serait un selecteur de plus, le jour ou il y aura un autre compte. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { faPlay, faStop, faVideo } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { langue, t } from '../langue/langue.ts';
import { agenda, type Soiree } from '../lib/agenda.ts';
import { fenetreDe, sansFuseau } from '../lib/fenetre-agenda.ts';
import { soireesManuelles } from '../lib/soirees-manuelles.ts';
import { sansDoublons } from '../lib/sans-doublons.ts';
import { misesEnAvant } from '../lib/mise-en-avant.ts';
import { toutesLesVilles } from '../lib/villes.ts';
import { setsPublics, urlPochette, type SetDJ } from '../lib/sets.ts';
import { cleDeLabel, type EntreeLabel } from '../lib/labels.ts';
import { motifDuStyle, type Motif } from '../lib/rythmes.ts';
import { SOURCES } from '../data/news-sources.ts';
import { FAMILIES, STRUCTURES } from './structures.ts';
import {
  chiffresDeLaSemaine,
  classerLabels,
  classerMixtapes,
  classerNews,
  classerSoirees,
  imageDuReel,
  jeudiDeLaSemaine,
  stylesDuLabel,
  type ArticleNews,
  type LabelClasse,
} from '../lib/reel-semaine.ts';
import { dessinerReel, dureeDesScenes, HAUTEUR_DU_REEL, LARGEUR_REEL, scenesDu, type ContenuReel } from './reel/dessin-reel.ts';
import { jouer } from './rythme/son.ts';
import { dureeDuPas, etatAu, plan } from './rythme/arrangement.ts';
import { TYPES, telecharger, textesDe } from './rythme/video.ts';
import './rythme.css';

const VILLE = 'montreal-ca';

interface Donnees {
  readonly ville: string;
  readonly du: Date;
  readonly au: Date;
  readonly soirees: Soiree[];
  readonly vedettes: ReadonlySet<string>;
  readonly news: ArticleNews[];
  readonly mixtapes: SetDJ[];
  readonly labels: LabelClasse[];
}

/* Les styles et les labels de leurs morceaux, pour trouver le style d'un
   label. Calcule une fois. */
const GENRES = STRUCTURES.flatMap((s) => s.genres.map((g) => ({ id: g.id, labels: g.tracks.map((tr) => tr.release?.label) })));
const STYLE = new Map(STRUCTURES.flatMap((s, fi) => s.genres.map((g) => [g.id, { nom: g.label, famille: FAMILIES[fi]?.label ?? '', familleId: FAMILIES[fi]?.id ?? 'techno' }] as const)));

const lieuDe = (s: Soiree): string => s.lieu ?? '';
const fmt = (o: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => new Intl.DateTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', o);

/** « 7 novembre », et « 1er novembre » en francais. */
const jourLong = (d: Date): string =>
  langue === 'fr' ? `${d.getDate() === 1 ? '1er' : d.getDate()} ${fmt({ month: 'long' }).format(d)}` : fmt({ month: 'long', day: 'numeric' }).format(d);

/** L'heure au mur : celles de Resident Advisor arrivent sans fuseau, celles
    de la base avec ; on les ramene toutes a l'heure locale, sans fuseau. */
const auMur = (iso: string): string => (/(Z|[+-]\d{2}:\d{2})$/.test(iso) ? sansFuseau(new Date(iso)) : iso);

/** « VEN. 7 NOV. · 23 H », a l'heure de la salle. */
function jourDe(s: Soiree): string {
  const iso = auMur(s.debut ?? s.date);
  const d = new Date(iso);
  const jour = fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  const heure = m && m[1] !== '00' ? (langue === 'fr' ? ` · ${Number(m[1])} h${m[2] !== '00' ? ` ${m[2]}` : ''}` : ` · ${fmt({ hour: 'numeric', minute: '2-digit' }).format(d)}`) : '';
  return `${jour}${heure}`.toUpperCase();
}

async function rassembler(): Promise<Donnees | null> {
  const maintenant = new Date();
  const villes = await toutesLesVilles();
  const ville = villes.find((v) => v.slug === VILLE);
  if (!ville || ville.ra_area_id == null) return null;
  const { du, au } = fenetreDe('weekend', null, maintenant);
  const [ra, mains, vedettes, brut, index, chiffres, sets] = await Promise.all([
    agenda({ zone: ville.ra_area_id, du, au, pages: 3 }),
    soireesManuelles(ville.id, du, au),
    misesEnAvant(VILLE),
    fetch(`${import.meta.env.BASE_URL}news.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<{ articles?: ArticleNews[] }>) : { articles: [] }))
      .catch(() => ({ articles: [] as ArticleNews[] })),
    import('../data/labels-index.json').then((m) => m.default as unknown as EntreeLabel[]),
    chiffresDeLaSemaine(),
    setsPublics(),
  ]);
  const ajoutees: Soiree[] = mains.map((m) => ({
    id: `main:${m.id}`,
    titre: m.titre,
    date: m.debut,
    debut: m.debut,
    lieu: m.lieu,
    artistes: m.artistes,
    genres: m.genres,
    affiche: m.affiche,
    lien: m.lien ?? '',
    interesses: 0,
  }));
  const articles = brut.articles ?? [];
  /* Resident Advisor rend aussi ce qui a commence la veille et dure encore :
     le reel ne montre que ce qui commence pendant la fin de semaine. */
  const debut = sansFuseau(du);
  const fin = sansFuseau(au);
  const dansLaFenetre = (s: Soiree): boolean => {
    const m = auMur(s.debut ?? s.date);
    return m >= debut && m <= fin;
  };
  return {
    ville: ville.name,
    du,
    au,
    soirees: classerSoirees(sansDoublons([...(ra?.soirees ?? []), ...ajoutees], ville.timezone).filter(dansLaFenetre), vedettes, 12),
    vedettes,
    news: classerNews(articles, maintenant, 6),
    mixtapes: classerMixtapes(sets, chiffres.mixtapes, maintenant, 6),
    labels: classerLabels(index, chiffres.labels, articles, maintenant),
  };
}

export function ReelDuJeudi() {
  const [donnees, setDonnees] = useState<Donnees | null | 'chargement'>('chargement');
  const [soirees, setSoirees] = useState<ReadonlySet<string>>(new Set());
  const [news, setNews] = useState<ReadonlySet<string>>(new Set());
  const [mixtapes, setMixtapes] = useState<ReadonlySet<string>>(new Set());
  const [label, setLabel] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [contenu, setContenu] = useState<ContenuReel | null>(null);
  const [apercu, setApercu] = useState(false);
  const [video, setVideo] = useState<'non' | number | 'echec'>('non');
  const toile = useRef<HTMLCanvasElement | null>(null);
  const arret = useRef<(() => void) | null>(null);

  useEffect(() => {
    let vivant = true;
    void rassembler().then((d) => {
      if (!vivant) return;
      setDonnees(d);
      if (!d) return;
      /* Cochees : les six premieres du classement, pas les six premieres
         dates (la liste, elle, se lit dans l'ordre des dates). */
      setSoirees(new Set(classerSoirees(d.soirees, d.vedettes, 6).map((s) => s.id)));
      setNews(new Set(d.news.slice(0, 3).map((a) => a.lien)));
      setMixtapes(new Set(d.mixtapes.slice(0, 2).map((m) => m.id)));
      setLabel(d.labels[0]?.label.s ?? null);
    });
    return () => {
      vivant = false;
      arret.current?.();
    };
  }, []);

  const d = donnees === 'chargement' ? null : donnees;
  const entree = useMemo(() => d?.labels.find((x) => x.label.s === label)?.label ?? null, [d, label]);
  const styles = useMemo(() => (entree ? stylesDuLabel(entree, GENRES, cleDeLabel) : []), [entree]);

  /* Le style suit le label, tant qu'on ne l'a pas change a la main. */
  useEffect(() => setStyle(styles[0] ?? null), [styles]);

  /* LE CONTENU DU REEL : les images se chargent, le motif aussi, puis la
     premiere image s'affiche dans l'apercu. */
  useEffect(() => {
    if (!d) return;
    let vivant = true;
    const styleId = style ?? 'detroittechno';
    void (async () => {
      const motif: Motif | null = await motifDuStyle(styleId);
      if (!motif) return;
      const info = STYLE.get(styleId);
      const choisies = d.soirees.filter((s) => soirees.has(s.id));
      const lues = d.news.filter((a) => news.has(a.lien));
      const sets = d.mixtapes.filter((m) => mixtapes.has(m.id));
      const [imgSoirees, imgNews, imgSets, logo] = await Promise.all([
        Promise.all(choisies.map((s) => imageDuReel(s.affiche))),
        Promise.all(lues.map((a) => imageDuReel(a.image))),
        Promise.all(sets.map((m) => imageDuReel(urlPochette(m.cover_path)))),
        imageDuReel(entree?.l ?? null),
      ]);
      await document.fonts?.load(`700 40px Inter`).catch(() => undefined);
      if (!vivant) return;
      setContenu({
        ville: d.ville,
        dates: t.reelDates(jourLong(d.du), jourLong(d.au)),
        soirees: choisies.map((s, i) => ({ jour: jourDe(s), titre: s.titre, lieu: lieuDe(s), image: imgSoirees[i] ?? null })),
        news: lues.map((a, i) => ({ source: SOURCES.find((x) => x.id === a.source)?.nom ?? a.source, titre: a.titre, image: imgNews[i] ?? null })),
        mixtapes: sets.map((m, i) => ({ titre: m.titre, artiste: m.artiste_nom ?? '', image: imgSets[i] ?? null })),
        label: entree ? { nom: entree.n, logo, style: info?.nom ?? '' } : null,
        motif,
        affiche: textesDe(motif, info?.nom ?? '', info?.famille ?? ''),
        mots: {
          ouverture: t.reelOuverture,
          soirees: t.reelSoirees,
          news: t.reelNews,
          mixtapes: t.reelMixtapes,
          label: t.reelLabel,
          style: t.reelStyle,
          fin: t.reelFin,
          finSous: t.reelFinSous,
        },
      });
    })();
    return () => {
      vivant = false;
    };
  }, [d, soirees, news, mixtapes, entree, style]);

  const scenes = useMemo(() => (contenu ? scenesDu(contenu) : []), [contenu]);
  const duree = dureeDesScenes(scenes);

  /* L'image fixe de l'apercu : le milieu de l'ouverture. */
  useEffect(() => {
    const ctx = toile.current?.getContext('2d');
    if (!ctx || !contenu || apercu || video !== 'non') return;
    dessinerReel(ctx, contenu, scenes, 1.2, 0, null);
  }, [contenu, scenes, apercu, video]);

  const basculer = (ensemble: ReadonlySet<string>, cle: string): Set<string> => {
    const n = new Set(ensemble);
    if (n.has(cle)) n.delete(cle);
    else n.add(cle);
    return n;
  };

  /* L'APERCU EST MUET : l'horloge de la page remplace celle du son. */
  const lancerApercu = (): void => {
    const ctx = toile.current?.getContext('2d');
    if (!ctx || !contenu) return;
    const cycles = plan(contenu.motif);
    const pas = dureeDuPas(contenu.motif);
    const t0 = performance.now();
    let image = 0;
    const tour = (): void => {
      const s = (performance.now() - t0) / 1000;
      if (s >= duree) {
        setApercu(false);
        return;
      }
      const position = s / pas;
      dessinerReel(ctx, contenu, scenes, s, position, etatAu(contenu.motif, cycles, position));
      image = requestAnimationFrame(tour);
    };
    arret.current = () => {
      cancelAnimationFrame(image);
      setApercu(false);
    };
    setApercu(true);
    image = requestAnimationFrame(tour);
  };

  const enregistrer = async (type: string): Promise<Blob> => {
    const c = toile.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || !contenu) throw new Error('toile');
    const cycles = plan(contenu.motif);
    const info = STYLE.get(style ?? '');
    const son = await jouer(contenu.motif, { famille: info?.familleId ?? 'techno', enregistrer: true, construire: true });
    try {
      const flux = c.captureStream(30);
      for (const piste of son.sortie?.stream.getAudioTracks() ?? []) flux.addTrack(piste);
      const enregistreur = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
      const morceaux: Blob[] = [];
      enregistreur.ondataavailable = (e) => e.data.size > 0 && morceaux.push(e.data);
      const fini = new Promise<void>((ok) => (enregistreur.onstop = () => ok()));
      enregistreur.start(1000);
      const t0 = performance.now();
      await new Promise<void>((ok) => {
        const tour = (): void => {
          const s = (performance.now() - t0) / 1000;
          const position = son.position();
          dessinerReel(ctx, contenu, scenes, Math.min(s, duree - 0.01), position, etatAu(contenu.motif, cycles, position));
          setVideo(Math.max(0, Math.ceil(duree - s)));
          if (s >= duree + 0.3) ok();
          else requestAnimationFrame(tour);
        };
        requestAnimationFrame(tour);
      });
      enregistreur.stop();
      await fini;
      return new Blob(morceaux, { type: type.split(';')[0] ?? 'video/webm' });
    } finally {
      son.arreter();
    }
  };

  const fabriquer = async (): Promise<void> => {
    arret.current?.();
    const possible = typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
    const types = possible ? TYPES.filter((x) => MediaRecorder.isTypeSupported(x)) : [];
    setVideo(Math.ceil(duree));
    const jeudi = jeudiDeLaSemaine(new Date());
    const nom = `sonaa-reel-${jeudi.getFullYear()}-${String(jeudi.getMonth() + 1).padStart(2, '0')}-${String(jeudi.getDate()).padStart(2, '0')}`;
    for (const type of types) {
      try {
        const blob = await enregistrer(type);
        /* Un MP4 de quelques dizaines de Ko est vide : AAC annonce et
           absent. On essaie alors le format suivant. */
        if (blob.size < 200_000) continue;
        telecharger(blob, `${nom}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
        setVideo('non');
        return;
      } catch {
        /* le format suivant */
      }
    }
    setVideo('echec');
  };

  if (donnees === 'chargement') return <p className="rj-attente">{t.reelChargement}</p>;
  if (!d) return <p className="rj-attente">{t.reelEchec}</p>;

  const jeudi = jourLong(jeudiDeLaSemaine(new Date()));
  const occupe = video !== 'non' && video !== 'echec';

  return (
    <section className="sets-bloc rj">
      <h2>{t.reelDuJeudi(jeudi)}</h2>
      <p className="rj-chapeau">{t.reelChapeau(d.ville, t.reelDates(jourLong(d.du), jourLong(d.au)))}</p>
      <div className="rj-grille">
        <div className="rj-choix">
          <fieldset>
            <legend>{t.reelSoirees}</legend>
            {d.soirees.length === 0 && <p className="rj-rien">{t.reelRien}</p>}
            {d.soirees.map((s) => (
              <label key={s.id} className="rj-ligne">
                <input type="checkbox" checked={soirees.has(s.id)} disabled={occupe} onChange={() => setSoirees((x) => basculer(x, s.id))} />
                <span>
                  <strong>{s.titre}</strong>
                  <small>
                    {jourDe(s)}
                    {s.lieu ? ` · ${s.lieu}` : ''}
                    {s.interesses ? ` · ${s.interesses}` : ''}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{t.reelNews}</legend>
            {d.news.length === 0 && <p className="rj-rien">{t.reelRien}</p>}
            {d.news.map((a) => (
              <label key={a.lien} className="rj-ligne">
                <input type="checkbox" checked={news.has(a.lien)} disabled={occupe} onChange={() => setNews((x) => basculer(x, a.lien))} />
                <span>
                  <strong>{a.titre}</strong>
                  <small>{SOURCES.find((x) => x.id === a.source)?.nom ?? a.source}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{t.reelMixtapes}</legend>
            {d.mixtapes.length === 0 && <p className="rj-rien">{t.reelRien}</p>}
            {d.mixtapes.map((m) => (
              <label key={m.id} className="rj-ligne">
                <input type="checkbox" checked={mixtapes.has(m.id)} disabled={occupe} onChange={() => setMixtapes((x) => basculer(x, m.id))} />
                <span>
                  <strong>{m.titre}</strong>
                  <small>{m.artiste_nom ?? ''}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{t.reelLabel}</legend>
            {d.labels.map((x) => (
              <label key={x.label.s} className="rj-ligne">
                <input type="radio" name="rj-label" checked={label === x.label.s} disabled={occupe} onChange={() => setLabel(x.label.s)} />
                <span>
                  <strong>{x.label.n}</strong>
                  <small>{t.reelPourquoi(x.vues, x.mentions)}</small>
                </span>
              </label>
            ))}
            {styles.length > 0 && (
              <label className="rj-style">
                <span>{t.reelChoixStyle}</span>
                <select value={style ?? ''} disabled={occupe} onChange={(e) => setStyle(e.target.value)}>
                  {styles.map((id) => (
                    <option key={id} value={id}>
                      {STYLE.get(id)?.nom ?? id}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </fieldset>
        </div>
        <div className="rj-apercu">
          <canvas ref={toile} width={LARGEUR_REEL} height={HAUTEUR_DU_REEL} className="rj-toile" aria-label={t.reelDuJeudi(jeudi)} />
          <div className="rj-gestes">
            <button type="button" className="ry-bouton" disabled={!contenu || occupe} onClick={() => (apercu ? arret.current?.() : lancerApercu())}>
              <FaIcon icon={apercu ? faStop : faPlay} />
              {apercu ? t.reelArreter : t.reelApercu}
            </button>
            <button type="button" className="ry-bouton" disabled={!contenu || occupe} onClick={() => void fabriquer()}>
              <FaIcon icon={faVideo} />
              {typeof video === 'number' ? t.reelFabrication(video) : t.reelFabriquer(Math.round(duree))}
            </button>
          </div>
          <p className="rj-note">{video === 'echec' ? t.reelEchec : t.reelSilence}</p>
        </div>
      </div>
    </section>
  );
}
