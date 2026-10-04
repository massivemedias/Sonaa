/* UNE PLATINE, FACON CDJ.
 *
 * Mika, le 3 octobre 2026 : « charger une track, avancer dans la track avec
 * la souris, un cue, un play pause, un pitch avec 3, 6 et 12, le BPM a
 * l'ecran, la pochette, le nom, l'artiste et la tonalite, un jog pour
 * avancer et reculer comme une CDJ, pas de bouton Sync, et quatre cues
 * gardes en memoire ».
 *
 * LE CUE SE CONDUIT COMME SUR UNE CDJ. En pause, il pose le point de cue la
 * ou l'on est ; pose sur ce point, le maintenir fait jouer, le relacher
 * revient au point. En lecture, il ramene au point et s'arrete.
 *
 * LE JOG A DEUX MAINS. En lecture, le tourner accelere ou freine un instant
 * (on rattrape un calage a la main). En pause, il deplace le point de
 * lecture et fait entendre un grain de son, pour trouver un temps a
 * l'oreille. Un tour vaut 1,8 seconde, la vitesse d'un vinyle a 33 tours. */

import { useEffect, useRef, useState, type DragEvent, type PointerEvent, type ReactNode } from 'react';
import { t } from '../langue/langue.ts';
import { adresseDuMorceau, type Morceau } from './morceau.ts';
import { PLAGES_PITCH, bpmAffiche, pitchEnPourcent, tempsAffiche, tonaliteCourte } from './calculs.ts';
import { Crochet, Fader } from './Commandes.tsx';
import { REPERES_VIDES, garderReperes, lireReperes, type Reperes } from './memoire.ts';
import { DETAIL_PAR_SECONDE, moteurExistant, obtenirMoteur } from './moteur.ts';

const SECONDES_PAR_TOUR = 1.8;
/* LE ZOOM DE L'ONDE : la fenetre visible, de 32 secondes a une seule. Mika
   voulait « zoomer dans la waveform pour voir les details et placer mon
   cue ». */
const FENETRES = [32, 16, 8, 4, 2, 1] as const;
/* Peu de couleurs, comme l'a demande Mika : l'orange de la MM-808 pour le
   cue et la tete de lecture, son jaune pour les hot cues, l'os pour l'onde. */
const ORANGE = '#ff6a13';
const JAUNE = '#ffd75e';
const OS = 'rgba(246, 241, 231, 0.88)';
const OS_PASSE = 'rgba(246, 241, 231, 0.26)';

export interface EtatPlatine {
  readonly bpm: number | null;
  readonly pitch: number;
  readonly enLecture: boolean;
}

interface Props {
  readonly index: 0 | 1;
  readonly morceau: Morceau | null;
  readonly onCharger: () => void;
  readonly onEtat: (e: EtatPlatine) => void;
  /** Un fichier audio lache sur la platine. */
  readonly onDeposer: (f: File) => void;
  /** Le navigateur de morceaux, ouvert dans la platine quand on y charge
      un morceau, comme l'ecran de navigation d'une CDJ. */
  readonly navigateur: ReactNode;
  /** La petite playlist, en bas du deck. */
  readonly playlist: ReactNode;
}

/* Glisse-t-on des fichiers ? Pendant le survol, le navigateur ne dit que
   leurs types, pas leurs noms. */
const porteDesFichiers = (e: DragEvent): boolean => [...(e.dataTransfer?.types ?? [])].includes('Files');

export function PlatineVue({ index, morceau, onCharger, onEtat, onDeposer, navigateur, playlist }: Props) {
  const nom = index === 0 ? 'A' : 'B';
  const [chargement, setChargement] = useState<number | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pret, setPret] = useState(false);
  const [reperes, setReperes] = useState<Reperes>(REPERES_VIDES);
  const [fader, setFader] = useState(0);
  const [plage, setPlage] = useState<number>(PLAGES_PITCH[0]);
  const [enLecture, setEnLecture] = useState(false);
  const [survol, setSurvol] = useState(false);
  const pitch = pitchEnPourcent(fader, plage);

  const zoom = useRef<HTMLCanvasElement | null>(null);
  const apercu = useRef<HTMLCanvasElement | null>(null);
  const restant = useRef<HTMLSpanElement | null>(null);
  const plateau = useRef<HTMLDivElement | null>(null);
  const centre = useRef<HTMLDivElement | null>(null);
  const reperesRef = useRef(reperes);
  reperesRef.current = reperes;
  const [zoomNiveau, setZoomNiveau] = useState(2);
  const fenetre = FENETRES[zoomNiveau] ?? 8;
  const fenetreRef = useRef<number>(fenetre);
  fenetreRef.current = fenetre;
  const zoomer = (sens: 1 | -1): void => setZoomNiveau((n) => Math.max(0, Math.min(FENETRES.length - 1, n + sens)));

  const platine = () => obtenirMoteur().platines[index];

  /* ═══ LE CHARGEMENT ═══ */
  useEffect(() => {
    if (!morceau) return;
    const arret = new AbortController();
    setPret(false);
    setErreur(false);
    setEnLecture(false);
    setChargement(0);
    const p = platine();
    p.onFin = () => setEnLecture(false);
    void (async () => {
      let liberer = (): void => undefined;
      try {
        const son = await adresseDuMorceau(morceau);
        liberer = son.liberer;
        await p.charger(son.adresse, (part) => setChargement(part), arret.signal);
        if (arret.signal.aborted) return;
        const r = lireReperes(morceau.id);
        setReperes(r);
        p.aller(r.cue ?? 0);
        p.regler(pitchEnPourcent(fader, plage));
        setPret(true);
      } catch {
        if (!arret.signal.aborted) setErreur(true);
      } finally {
        liberer();
        if (!arret.signal.aborted) setChargement(null);
      }
    })();
    return () => arret.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morceau]);

  useEffect(() => {
    if (pret) platine().regler(pitch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitch, pret]);

  useEffect(() => {
    onEtat({ bpm: morceau?.bpm ?? null, pitch, enLecture });
  }, [morceau, pitch, enLecture, onEtat]);

  const poser = (r: Reperes): void => {
    setReperes(r);
    if (morceau) garderReperes(morceau.id, r);
  };

  /* ═══ L'ECRAN, A CHAQUE IMAGE ═══ Sans passer par React : soixante rendus
     par seconde de deux platines feraient ramer un telephone. */
  useEffect(() => {
    let image = 0;
    const dessiner = (): void => {
      image = requestAnimationFrame(dessiner);
      const p = moteurExistant()?.platines[index];
      const pos = p?.position() ?? 0;
      const duree = p?.duree ?? 0;
      if (restant.current) restant.current.textContent = p?.charge ? `-${tempsAffiche(duree - pos)}` : '--:--.-';
      const angle = `rotate(${(pos / SECONDES_PAR_TOUR) * 360}deg)`;
      if (plateau.current) plateau.current.style.transform = angle;
      /* L'ecran du jog montre ou l'on en est dans le morceau : un anneau qui
         se remplit, et une aiguille qui tourne avec le plateau. */
      if (centre.current) {
        centre.current.style.setProperty('--pl-avance', String(duree > 0 ? pos / duree : 0));
        centre.current.style.setProperty('--pl-angle', `${(pos / SECONDES_PAR_TOUR) * 360}deg`);
      }
      dessinerZoom(zoom.current, p?.detail, pos, duree, reperesRef.current, fenetreRef.current);
      dessinerApercu(apercu.current, p?.apercu, pos, duree, reperesRef.current);
    };
    image = requestAnimationFrame(dessiner);
    return () => cancelAnimationFrame(image);
  }, [index]);

  /* La molette zoome dans l'onde. Ecoutee a la main : React pose ses
     ecouteurs de molette en passif, et la page defilerait en meme temps. */
  useEffect(() => {
    const c = zoom.current;
    if (!c) return;
    const molette = (e: globalThis.WheelEvent): void => {
      e.preventDefault();
      zoomer(e.deltaY < 0 ? 1 : -1);
    };
    c.addEventListener('wheel', molette, { passive: false });
    return () => c.removeEventListener('wheel', molette);
  }, []);

  /* EN PAUSE, ON TIRE L'ONDE POUR SE PLACER, comme sur l'ecran tactile
     d'une CDJ : tirer vers la gauche avance. On entend des grains de son au
     passage, puis CUE pose le point la ou l'on s'est arrete. */
  const tirage = useRef<{ x: number; depart: number; dernierGrain: number } | null>(null);

  /* ═══ LE PITCH BEND ═══ Mika, le 3 octobre 2026 : ces touches servent,
     tant qu'on les tient, a deplacer finement le morceau pour l'ajuster et
     caler les temps. En lecture, elles freinent ou poussent le morceau : un
     et demi pour cent d'abord, puis davantage si on insiste, jusqu'a six,
     comme les touches de nudge d'un logiciel de DJ ; relachees, la vitesse
     revient au pitch. En pause, elles font glisser la tete de lecture tout
     doucement, en grains, pour poser le cue au poil pres. */
  const bend = useRef<{ debut: number; minuterie: number } | null>(null);
  const bendBas = (sens: 1 | -1): void => {
    if (!pret || bend.current) return;
    const r = { debut: performance.now(), minuterie: 0 };
    const pas = (): void => {
      const p = platine();
      const tenu = (performance.now() - r.debut) / 1000;
      if (p.enLecture) p.courber(sens * Math.min(0.06, 0.015 + tenu * 0.03));
      else p.grain(p.position() + sens * 0.02);
    };
    pas();
    r.minuterie = window.setInterval(pas, 70);
    bend.current = r;
  };
  const bendHaut = (): void => {
    const r = bend.current;
    if (!r) return;
    window.clearInterval(r.minuterie);
    bend.current = null;
    if (pret) platine().courber(0);
  };

  /* ═══ LES BOUTONS DE TRANSPORT ═══ */
  const apercuCue = useRef(false);
  const cueBas = (): void => {
    if (!pret) return;
    const p = platine();
    const cue = reperes.cue ?? 0;
    if (p.enLecture) {
      p.pause();
      p.aller(cue);
      setEnLecture(false);
    } else if (Math.abs(p.position() - cue) > 0.02) {
      poser({ ...reperes, cue: p.position() });
    } else {
      apercuCue.current = true;
      p.jouer();
      setEnLecture(true);
    }
  };
  const cueHaut = (): void => {
    if (!apercuCue.current) return;
    apercuCue.current = false;
    const p = platine();
    p.pause();
    p.aller(reperes.cue ?? 0);
    setEnLecture(false);
  };
  const lecturePause = (): void => {
    if (!pret) return;
    const p = platine();
    if (p.enLecture) p.pause();
    else p.jouer();
    setEnLecture(p.enLecture);
  };

  const appuiLong = useRef<number | null>(null);
  const effacerChaud = (i: number): void => poser({ ...reperes, chauds: reperes.chauds.map((c, j) => (j === i ? null : c)) });
  const chaud = (i: number): void => {
    if (!pret) return;
    const p = platine();
    const c = reperes.chauds[i];
    if (c === null || c === undefined) {
      poser({ ...reperes, chauds: reperes.chauds.map((x, j) => (j === i ? p.position() : x)) });
      return;
    }
    p.aller(c);
    if (!p.enLecture) {
      p.jouer();
      setEnLecture(true);
    }
  };

  /* ═══ LE JOG ═══ */
  const jog = useRef<{ angle: number; instant: number; dernierGrain: number; relache: number | null } | null>(null);
  const angleDe = (e: PointerEvent<HTMLDivElement>): number => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };

  const tonalite = tonaliteCourte(morceau?.tonalite);

  return (
    <section
      className={`pl-machine pl-platine pl-platine-${nom.toLowerCase()}`}
      aria-label={t.platineNom(nom)}
      data-survol={survol}
      onDragOver={(e) => {
        if (!porteDesFichiers(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setSurvol(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(false);
      }}
      onDrop={(e) => {
        if (!porteDesFichiers(e)) return;
        e.preventDefault();
        setSurvol(false);
        const f = e.dataTransfer.files[0];
        if (f) onDeposer(f);
      }}
    >
      {survol && (
        <div className="pl-depot" aria-hidden="true">
          {t.platineDeposer}
        </div>
      )}
      <header className="pl-plaque">
        <span className="pl-logo" role="img" aria-label="Maudite Machine" />
        <span className="pl-modele" aria-hidden="true">
          {nom}
        </span>
        <button type="button" className="pl-touche pl-charger" data-allume={!morceau || navigateur !== null} aria-expanded={navigateur !== null} onClick={onCharger}>
          <span className="pl-touche-led" aria-hidden="true" />
          {t.platineCharger}
        </button>
      </header>
      {navigateur !== null && <div className="pl-platine-navigateur">{navigateur}</div>}

      <div className="pl-ecran">
        <div className="pl-ecran-tete">
          {morceau?.pochette ? <img className="pl-ecran-pochette" src={morceau.pochette} alt="" /> : <span className="pl-ecran-pochette" />}
          <div className="pl-ecran-titres">
            <span className="pl-ecran-titre">{morceau ? morceau.titre : t.platineVide}</span>
            <span className="pl-ecran-artiste">
              {morceau?.lien ? (
                <a href={morceau.lien} target="_blank" rel="noreferrer noopener" title={t.platineSurAudius}>
                  {morceau.artiste}
                </a>
              ) : (
                (morceau?.artiste ?? ' ')
              )}
              {morceau?.label ? <span className="pl-ecran-genre"> · {morceau.label}</span> : null}
              {morceau?.genre ? <span className="pl-ecran-genre"> · {morceau.genre}</span> : null}
            </span>
          </div>
        </div>
        <div className="pl-ecran-chiffres">
          <span className="pl-chiffre">
            <span className="pl-chiffre-nom">BPM</span>
            <span className="pl-chiffre-valeur">{bpmAffiche(morceau?.bpm ?? null, pitch)}</span>
          </span>
          <span className="pl-chiffre">
            <span className="pl-chiffre-nom">{t.platinePitch}</span>
            <span className="pl-chiffre-valeur">
              {pitch >= 0 ? '+' : ''}
              {pitch.toFixed(2)}%
            </span>
          </span>
          <span className="pl-chiffre">
            <span className="pl-chiffre-nom">{t.platineTonalite}</span>
            <span className="pl-chiffre-valeur">{tonalite ? `${tonalite.nom} ${tonalite.camelot}` : '--'}</span>
          </span>
          <span className="pl-chiffre">
            <span className="pl-chiffre-nom">{t.platineRestant}</span>
            <span className="pl-chiffre-valeur" ref={restant}>
              --:--.-
            </span>
          </span>
        </div>
        <div className="pl-onde" title={t.platineOndeAide}>
          <canvas
            ref={zoom}
            className="pl-onde-zoom"
            data-tirable={pret && !enLecture}
            onPointerDown={(e) => {
              if (!pret || platine().enLecture) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              tirage.current = { x: e.clientX, depart: platine().position(), dernierGrain: 0 };
            }}
            onPointerMove={(e) => {
              const g = tirage.current;
              if (!g || !pret) return;
              const r = e.currentTarget.getBoundingClientRect();
              const cible = g.depart - ((e.clientX - g.x) / Math.max(1, r.width)) * fenetreRef.current;
              const p = platine();
              const maintenant = performance.now();
              if (maintenant - g.dernierGrain > 35) {
                g.dernierGrain = maintenant;
                p.grain(cible);
              } else {
                p.aller(cible);
              }
            }}
            onPointerUp={() => {
              tirage.current = null;
            }}
          />
          <div className="pl-zoom">
            <button type="button" aria-label={t.platineZoomMoins} disabled={zoomNiveau === 0} onClick={() => zoomer(-1)}>
              −
            </button>
            <span aria-hidden="true">{fenetre} s</span>
            <button type="button" aria-label={t.platineZoomPlus} disabled={zoomNiveau === FENETRES.length - 1} onClick={() => zoomer(1)}>
              +
            </button>
          </div>
          {chargement !== null && (
            <span className="pl-onde-etat">
              {chargement < 1 ? `${Math.round(chargement * 100)} %` : t.platineDecodage}
            </span>
          )}
          {erreur && <span className="pl-onde-etat">{t.platineErreur}</span>}
        </div>
        <canvas
          ref={apercu}
          className="pl-onde-apercu"
          role="slider"
          aria-label={t.platineApercu}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          tabIndex={-1}
          onPointerDown={(e) => {
            if (!pret) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            platine().aller((e.nativeEvent.offsetX / Math.max(1, e.currentTarget.clientWidth)) * platine().duree);
          }}
          onPointerMove={(e) => {
            if (!pret || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
            /* offsetX, et non clientX : la machine est inclinee, et seul le
               repere de l'ecran lui-meme dit ou l'on a touche. */
            platine().aller((e.nativeEvent.offsetX / Math.max(1, e.currentTarget.clientWidth)) * platine().duree);
          }}
        />
      </div>

      <div className="pl-chauds" title={t.platineCueAide}>
        {reperes.chauds.map((c, i) => (
          <div key={i} className="pl-commande">
            <button
              type="button"
              className="pl-pad"
              data-pose={c !== null}
              aria-label={t.platineCueChaud(i + 1)}
              onClick={() => chaud(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                effacerChaud(i);
              }}
              onPointerDown={(e) => {
                if (e.pointerType !== 'touch') return;
                appuiLong.current = window.setTimeout(() => {
                  appuiLong.current = null;
                  effacerChaud(i);
                }, 600);
              }}
              onPointerUp={() => {
                if (appuiLong.current) window.clearTimeout(appuiLong.current);
              }}
            />
            <span className="pl-silk" aria-hidden="true">
              {i + 1}
            </span>
          </div>
        ))}
      </div>
      <Crochet libelle={t.platineChauds} />

      <div className="pl-corps">
        <div className="pl-transport">
          <div className="pl-commande">
            <button
              type="button"
              className="pl-grosse-touche pl-cue"
              data-allume={pret}
              aria-label={t.platineCue}
              onPointerDown={cueBas}
              onPointerUp={cueHaut}
              onPointerLeave={cueHaut}
            >
              <span className="pl-touche-led" aria-hidden="true" />
              <span className="pl-grosse-touche-texte">CUE</span>
            </button>
            <span className="pl-silk" aria-hidden="true">
              {t.platineCue}
            </span>
          </div>
          <div className="pl-commande">
            <button
              type="button"
              className="pl-grosse-touche pl-lecture"
              data-actif={enLecture}
              data-pret={pret}
              aria-label={t.platineLecture}
              onClick={lecturePause}
            >
              <span className="pl-touche-led" aria-hidden="true" />
              {/* Le signe des platines de club : lecture et pause sur la meme
                  touche, le triangle et les deux barres cote a cote. */}
              <svg className="pl-icone-lecture" viewBox="0 0 30 14" aria-hidden="true">
                <path d="M1.5 1.2 L11.5 7 L1.5 12.8 Z" />
                <rect x="18" y="1.2" width="3.4" height="11.6" rx="0.8" />
                <rect x="24.6" y="1.2" width="3.4" height="11.6" rx="0.8" />
              </svg>
            </button>
            <span className="pl-silk" aria-hidden="true">
              {t.platineLectureCourt}
            </span>
          </div>
        </div>

        <div className="pl-jog-zone">
          <div
            className="pl-jog"
            role="slider"
            aria-label={t.platineJog}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            tabIndex={-1}
            onPointerDown={(e) => {
              if (!pret) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              jog.current = { angle: angleDe(e), instant: performance.now(), dernierGrain: 0, relache: null };
            }}
            onPointerMove={(e) => {
              const j = jog.current;
              if (!j || !pret) return;
              const a = angleDe(e);
              let d = a - j.angle;
              if (d > Math.PI) d -= 2 * Math.PI;
              if (d < -Math.PI) d += 2 * Math.PI;
              const maintenant = performance.now();
              const dt = Math.max(1, maintenant - j.instant);
              j.angle = a;
              j.instant = maintenant;
              const p = platine();
              const tours = d / (2 * Math.PI);
              if (p.enLecture) {
                p.courber((tours / (dt / 1000)) * 0.08);
                if (j.relache) window.clearTimeout(j.relache);
                j.relache = window.setTimeout(() => p.courber(0), 90);
              } else if (maintenant - j.dernierGrain > 35) {
                j.dernierGrain = maintenant;
                p.grain(p.position() + tours * SECONDES_PAR_TOUR);
              }
            }}
            onPointerUp={() => {
              if (jog.current?.relache) window.clearTimeout(jog.current.relache);
              jog.current = null;
              if (pret) platine().courber(0);
            }}
          >
            <div className="pl-jog-puits" aria-hidden="true" />
            <div className="pl-jog-bague" aria-hidden="true" />
            <div className="pl-jog-lumiere" data-actif={enLecture} aria-hidden="true" />
            <div className="pl-jog-plateau" ref={plateau} aria-hidden="true">
              <span className="pl-jog-crans" />
              <span className="pl-jog-repere" />
            </div>
            <div className="pl-jog-reflet" aria-hidden="true" />
            <div className="pl-jog-centre" ref={centre} aria-hidden="true">
              {morceau?.pochette ? <img src={morceau.pochette} alt="" draggable={false} /> : null}
              <span className="pl-jog-aiguille" />
            </div>
          </div>
          {/* LE PITCH BEND, au bord du jog : tenir pour freiner ou pousser. */}
          {([-1, 1] as const).map((sens) => (
            <button
              key={sens}
              type="button"
              className={`pl-recherche ${sens < 0 ? 'pl-recherche-arriere' : 'pl-recherche-avant'}`}
              aria-label={sens < 0 ? t.platineFreiner : t.platinePousser}
              onPointerDown={(e) => {
                bendBas(sens);
                /* Garder la main meme si le doigt glisse hors de la touche. */
                if (e.isPrimary) e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerUp={bendHaut}
              onPointerCancel={bendHaut}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  bendBas(sens);
                }
              }}
              onKeyUp={bendHaut}
            >
              <svg viewBox="0 0 20 12" aria-hidden="true">
                {sens < 0 ? <path d="M9 1 L1 6 L9 11 Z M19 1 L11 6 L19 11 Z" /> : <path d="M1 1 L9 6 L1 11 Z M11 1 L19 6 L11 11 Z" />}
              </svg>
            </button>
          ))}
        </div>

        <div className="pl-pitch">
          <div className="pl-commande">
            <button
              type="button"
              className="pl-touche pl-plage"
              aria-label={t.platinePlage(plage)}
              onClick={() => setPlage(PLAGES_PITCH[(PLAGES_PITCH.indexOf(plage as (typeof PLAGES_PITCH)[number]) + 1) % PLAGES_PITCH.length] ?? 6)}
            >
              <span className="pl-touche-led" aria-hidden="true" />±{plage}
            </button>
          </div>
          <span className="pl-silk" aria-hidden="true">
            −
          </span>
          <div className="pl-pitch-course">
            <span className="pl-led pl-led-zero" data-allume={Math.abs(pitch) < 0.005} aria-hidden="true" />
            <Fader sens="vertical" inverse valeur={fader} min={-1} max={1} neutre={0} onChange={setFader} nom={t.platinePitch} className="pl-pitch-fader" />
          </div>
          <span className="pl-silk" aria-hidden="true">
            +
          </span>
          <span className="pl-silk pl-silk-fort" aria-hidden="true">
            {t.platinePitch}
          </span>
        </div>
      </div>
      {playlist}
    </section>
  );
}

/* ═══ LES DESSINS ═══ */
function preparer(c: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!c) return null;
  const ratio = window.devicePixelRatio || 1;
  const l = Math.round(c.clientWidth * ratio);
  const h = Math.round(c.clientHeight * ratio);
  if (c.width !== l || c.height !== h) {
    c.width = l;
    c.height = h;
  }
  const ctx = c.getContext('2d');
  ctx?.clearRect(0, 0, l, h);
  return ctx;
}

function dessinerZoom(c: HTMLCanvasElement | null, detail: Float32Array | undefined, pos: number, duree: number, r: Reperes, fenetre: number): void {
  const ctx = preparer(c);
  if (!ctx || !c) return;
  const { width: l, height: h } = c;
  const milieu = h / 2;
  if (detail && detail.length > 0) {
    /* Une colonne par pixel, et le plus haut pic de la tranche de temps
       qu'elle couvre : l'onde reste juste a tous les zooms. */
    const parPixel = fenetre / l;
    for (let x = 0; x < l; x += 1) {
      const temps = pos - fenetre / 2 + x * parPixel;
      if (temps < 0 || temps > duree) continue;
      const i0 = Math.floor(temps * DETAIL_PAR_SECONDE);
      const i1 = Math.max(i0 + 1, Math.floor((temps + parPixel) * DETAIL_PAR_SECONDE));
      let v = 0;
      for (let i = i0; i < i1; i += 1) v = Math.max(v, detail[i] ?? 0);
      ctx.fillStyle = temps < pos ? OS_PASSE : OS;
      const haut = Math.max(1, v * milieu * 0.92);
      ctx.fillRect(x, milieu - haut, 1, haut * 2);
    }
    const marque = (temps: number | null, couleur: string): void => {
      if (temps === null) return;
      const x = ((temps - pos + fenetre / 2) / fenetre) * l;
      if (x < 0 || x > l) return;
      ctx.fillStyle = couleur;
      ctx.fillRect(x - 1, 0, 2, h);
    };
    marque(r.cue, ORANGE);
    r.chauds.forEach((t) => marque(t, JAUNE));
  }
  ctx.fillStyle = ORANGE;
  ctx.fillRect(l / 2 - 1, 0, 2, h);
}

function dessinerApercu(c: HTMLCanvasElement | null, apercu: Float32Array | undefined, pos: number, duree: number, r: Reperes): void {
  const ctx = preparer(c);
  if (!ctx || !c || !apercu || apercu.length === 0 || duree <= 0) return;
  const { width: l, height: h } = c;
  const lu = (pos / duree) * l;
  for (let x = 0; x < l; x += 1) {
    const v = apercu[Math.floor((x / l) * apercu.length)] ?? 0;
    ctx.fillStyle = x < lu ? OS_PASSE : 'rgba(246, 241, 231, 0.6)';
    const haut = Math.max(1, v * h * 0.9);
    ctx.fillRect(x, (h - haut) / 2, 1, haut);
  }
  const marque = (temps: number | null, couleur: string): void => {
    if (temps === null) return;
    ctx.fillStyle = couleur;
    ctx.fillRect((temps / duree) * l - 1, 0, 2, h);
  };
  marque(r.cue, ORANGE);
  r.chauds.forEach((t) => marque(t, JAUNE));
  ctx.fillStyle = ORANGE;
  ctx.fillRect(lu - 1, 0, 2, h);
}
