/* L'AFFICHE DE RYTHME D'UN STYLE : un cercle ou chaque instrument dessine sa
   figure, une grille de pas dessous, une tete de lecture qui tourne au tempo
   du style. Elle se joue, et elle se telecharge en image ou en video au
   format portrait d'Instagram, signee sonaa.ca.

   Mika, le 30 octobre 2026 : « je veux la meme chose dans chaque style, et je
   vais en faire la pub ». Le dessin vit dans rythme/dessin.ts, le son dans
   rythme/son.ts, les motifs dans data/rythmes.json (voir lib/rythmes.ts).

   « Ecouter » et la video jouent le morceau construit (rythme/arrangement.ts) :
   le drop, la montee, un temps de silence, le drop qui revient. Au repos,
   l'affiche tourne sur le motif entier, sans le son. Les sons enregistres du
   style (rythme/echantillons.ts) se chargent au premier clic.

   LE MOUVEMENT S'ARRETE HORS DE L'ECRAN, et quand le visiteur a demande moins
   de mouvement : l'affiche reste alors posee sur le premier temps, et ne
   bouge que si on la fait jouer. */

import { useEffect, useRef, useState } from 'react';
import { faDownload, faMobileScreen, faPlay, faStop, faVideo } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { langue, t } from '../langue/langue.ts';
import { slug } from '../lib/chemins.ts';
import { motifDuStyle, type Motif } from '../lib/rythmes.ts';
import { dessinerAffiche, HAUTEUR_REEL, HAUTEUR_RYTHME, LARGEUR_RYTHME, type FormatAffiche, type TextesAffiche } from './rythme/dessin.ts';
import { dureeDuPas, jouer, type Lecteur } from './rythme/son.ts';
import { dureeDuPlan, etatAu, plan } from './rythme/arrangement.ts';
import './rythme.css';

const TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
/* La video dure le morceau construit, et une demi-seconde de plus pour que
   la reverberation du dernier coup ne soit pas coupee net. */
const QUEUE_VIDEO = 0.5;

const mouvementReduit = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* La tonalite s'ecrit avec les vrais signes : Eb devient E♭, F#m devient F♯m. */
const tonaliteLisible = (x: string): string => x.replace(/^([A-G])b/, '$1\u266d').replace('#', '\u266f');

function textesDe(motif: Motif, titre: string, famille: string): TextesAffiche {
  const l = langue === 'fr' ? 'fr' : 'en';
  return {
    titre,
    devise: motif.devise[l],
    entete: `${famille.toUpperCase()} · ${motif.bpm} BPM · ${motif.instruments[l]}`,
    resume: motif.resume[l],
    racine: motif.racine[l],
    mesure: `BPM · ${t.rythmeMesure} ${motif.mesure}${motif.tonalite ? ` · ${tonaliteLisible(motif.tonalite)}` : ''}`,
    signature: 'SONAA.CA',
    langue: l,
    sections: t.rythmeSections,
  };
}

function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function RythmeDuStyle({ genreId, titre, famille, familleId }: { genreId: string; titre: string; famille: string; familleId: string }) {
  const [motif, setMotif] = useState<Motif | null>(null);
  const [joue, setJoue] = useState<'non' | 'chargement' | 'oui'>('non');
  const [video, setVideo] = useState<'non' | number | 'echec'>('non');
  /* Le format en cours de fabrication : son bouton porte le decompte. */
  const [enCours, setEnCours] = useState<FormatAffiche>('fil');
  const toile = useRef<HTMLCanvasElement | null>(null);
  const lecteur = useRef<Lecteur | null>(null);

  useEffect(() => {
    let vivant = true;
    setMotif(null);
    void motifDuStyle(genreId).then((m) => vivant && setMotif(m));
    return () => {
      vivant = false;
      lecteur.current?.arreter();
      lecteur.current = null;
      setJoue('non');
    };
  }, [genreId]);

  /* LA BOUCLE DE DESSIN. La toile prend la largeur affichee fois la densite
     de l'ecran, et le contexte est mis a l'echelle de la taille de
     reference : on dessine toujours en 1080 x 1350. */
  useEffect(() => {
    const c = toile.current;
    if (!motif || !c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const textes = textesDe(motif, titre, famille);
    const duree = dureeDuPas(motif);
    const cycles = plan(motif);
    const t0 = performance.now();
    let visible = true;
    let image = 0;

    const dimensionner = (): void => {
      const l = Math.round(c.clientWidth * Math.min(2, window.devicePixelRatio || 1));
      if (l > 0 && c.width !== l) {
        c.width = l;
        c.height = Math.round((l * HAUTEUR_RYTHME) / LARGEUR_RYTHME);
      }
    };
    const dessiner = (): void => {
      dimensionner();
      const l = lecteur.current;
      const position = l ? l.position() : mouvementReduit() ? 0 : (performance.now() - t0) / 1000 / duree;
      ctx.setTransform(c.width / LARGEUR_RYTHME, 0, 0, c.width / LARGEUR_RYTHME, 0, 0);
      dessinerAffiche(ctx, motif, textes, { position, etat: l ? etatAu(motif, cycles, position) : null });
    };
    const boucle = (): void => {
      dessiner();
      if (visible && (lecteur.current || !mouvementReduit())) image = requestAnimationFrame(boucle);
    };
    const observateur = new IntersectionObserver(([e]) => {
      visible = e?.isIntersecting ?? true;
      cancelAnimationFrame(image);
      if (visible) boucle();
    });
    observateur.observe(c);
    boucle();
    const auRedimensionnement = (): void => dessiner();
    window.addEventListener('resize', auRedimensionnement);
    return () => {
      cancelAnimationFrame(image);
      observateur.disconnect();
      window.removeEventListener('resize', auRedimensionnement);
    };
  }, [motif, titre, famille, joue]);

  if (!motif) return null;
  const textes = textesDe(motif, titre, famille);
  const cycles = plan(motif);
  const nomFichier = `${slug(titre) || genreId}-rythme-sonaa`;

  const basculer = (): void => {
    if (lecteur.current) {
      lecteur.current.arreter();
      lecteur.current = null;
      setJoue('non');
      return;
    }
    if (joue === 'chargement') return;
    setJoue('chargement');
    void jouer(motif, { famille: familleId, construire: true }).then((l) => {
      lecteur.current = l;
      setJoue('oui');
    });
  };

  const image = (): void => {
    const c = document.createElement('canvas');
    c.width = LARGEUR_RYTHME;
    c.height = HAUTEUR_RYTHME;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    /* Arretee sur le premier temps du motif entier, figures au repos. */
    dessinerAffiche(ctx, motif, textes, { position: 0.0001 });
    c.toBlob((b) => b && telecharger(b, `${nomFichier}.png`), 'image/png');
  };

  /* LA VIDEO : la meme toile en 1080 x 1350, filmee a 30 images par seconde
     pendant que le synthetiseur joue, son compris. On prefere le MP4 avec un
     son AAC, que Instagram prend tel quel ; a defaut, le MP4 du navigateur,
     puis le WebM.

     UN FORMAT ANNONCE N'EST PAS UN FORMAT QUI MARCHE. Mesure du 30 octobre
     2026 dans un Chromium 152 : isTypeSupported repond oui pour
     « avc1,mp4a.40.2 », et l'enregistrement rend 12 ko, une seule image,
     parce que l'encodeur AAC manque. Le fichier est donc juge sur pieces :
     sous 100 ko pour une douzaine de secondes, il est refait avec le format
     suivant. */
  const enregistrer = async (type: string, duree: number, format: FormatAffiche): Promise<Blob> => {
    const c = document.createElement('canvas');
    c.width = LARGEUR_RYTHME;
    c.height = format === 'reel' ? HAUTEUR_REEL : HAUTEUR_RYTHME;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('toile');
    const son = await jouer(motif, { famille: familleId, enregistrer: true, construire: true });
    try {
      const flux = c.captureStream(30);
      for (const piste of son.sortie?.stream.getAudioTracks() ?? []) flux.addTrack(piste);
      const enregistreur = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 192_000 });
      const morceaux: Blob[] = [];
      enregistreur.ondataavailable = (e) => e.data.size > 0 && morceaux.push(e.data);
      const fini = new Promise<void>((ok) => (enregistreur.onstop = () => ok()));
      enregistreur.start(1000);
      const t0 = performance.now();
      await new Promise<void>((ok) => {
        const pas = (): void => {
          const ecoule = (performance.now() - t0) / 1000;
          const position = son.position();
          dessinerAffiche(ctx, motif, textes, { position, etat: etatAu(motif, cycles, position) }, format);
          setVideo(Math.max(0, Math.ceil(duree - ecoule)));
          if (ecoule >= duree) ok();
          else requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      });
      enregistreur.stop();
      await fini;
      return new Blob(morceaux, { type: type.split(';')[0] ?? 'video/webm' });
    } finally {
      son.arreter();
    }
  };

  const filmer = async (format: FormatAffiche): Promise<void> => {
    setEnCours(format);
    const possible = typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
    const types = possible ? TYPES.filter((x) => MediaRecorder.isTypeSupported(x)) : [];
    lecteur.current?.arreter();
    lecteur.current = null;
    setJoue('non');
    const duree = dureeDuPlan(motif, cycles) + QUEUE_VIDEO;
    for (const type of types) {
      try {
        const blob = await enregistrer(type, duree, format);
        if (blob.size < 100_000) continue;
        telecharger(blob, `${nomFichier}${format === 'reel' ? '-reel' : ''}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
        setVideo('non');
        return;
      } catch {
        /* le format suivant */
      }
    }
    setVideo('echec');
  };

  return (
    <section className="ry">
      <canvas
        ref={toile}
        className="ry-toile"
        width={LARGEUR_RYTHME / 2}
        height={HAUTEUR_RYTHME / 2}
        role="img"
        aria-label={t.rythmeAria(titre, motif.bpm, textes.resume)}
      />
      <div className="ry-actions">
        <button type="button" className="ry-bouton ry-bouton-jouer" aria-pressed={joue === 'oui'} onClick={basculer} disabled={typeof video === 'number' || joue === 'chargement'}>
          <FaIcon icon={joue === 'oui' ? faStop : faPlay} />
          {joue === 'oui' ? t.rythmeArreter : joue === 'chargement' ? t.rythmeChargement : t.rythmeEcouter}
        </button>
        <button type="button" className="ry-bouton" onClick={image}>
          <FaIcon icon={faDownload} />
          {t.rythmeImage}
        </button>
        <button type="button" className="ry-bouton" onClick={() => void filmer('fil')} disabled={typeof video === 'number'}>
          <FaIcon icon={faVideo} />
          {typeof video === 'number' && enCours === 'fil' ? t.rythmeFabrication(video) : t.rythmeVideo}
        </button>
        <button type="button" className="ry-bouton" onClick={() => void filmer('reel')} disabled={typeof video === 'number'}>
          <FaIcon icon={faMobileScreen} />
          {typeof video === 'number' && enCours === 'reel' ? t.rythmeFabrication(video) : t.rythmeReel}
        </button>
      </div>
      {video === 'echec' && <p className="ry-echec">{t.rythmeEchec}</p>}
    </section>
  );
}
