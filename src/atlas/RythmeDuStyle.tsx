/* L'AFFICHE DE RYTHME D'UN STYLE : un cercle ou chaque instrument dessine sa
   figure, une grille de pas dessous, une tete de lecture qui tourne au tempo
   du style. Elle se joue, et elle se telecharge en image ou en video au
   format portrait d'Instagram, signee sonaa.ca.

   Mika, le 30 octobre 2026 : « je veux la meme chose dans chaque style, et je
   vais en faire la pub ». Le dessin vit dans rythme/dessin.ts, le son dans
   rythme/son.ts, les motifs dans data/rythmes.json (voir lib/rythmes.ts).

   LE MOUVEMENT S'ARRETE HORS DE L'ECRAN, et quand le visiteur a demande moins
   de mouvement : l'affiche reste alors posee sur le premier temps, et ne
   bouge que si on la fait jouer. */

import { useEffect, useRef, useState } from 'react';
import { faDownload, faPlay, faStop, faVideo } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { langue, t } from '../langue/langue.ts';
import { slug } from '../lib/chemins.ts';
import { motifDuStyle, type Motif } from '../lib/rythmes.ts';
import { dessinerAffiche, HAUTEUR_RYTHME, LARGEUR_RYTHME, type TextesAffiche } from './rythme/dessin.ts';
import { dureeDuPas, jouer, type Lecteur } from './rythme/son.ts';
import './rythme.css';

const TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
/* Une douzaine de secondes, arrondies a des mesures entieres : assez pour
   qu'on entende le motif revenir, assez court pour une story. */
const SECONDES_VIDEO = 12;

const mouvementReduit = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function textesDe(motif: Motif, titre: string, famille: string): TextesAffiche {
  const l = langue === 'fr' ? 'fr' : 'en';
  return {
    titre,
    devise: motif.devise[l],
    entete: `${famille.toUpperCase()} · ${motif.bpm} BPM · ${motif.instruments[l]}`,
    resume: motif.resume[l],
    racine: motif.racine[l],
    mesure: `BPM · ${t.rythmeMesure} ${motif.mesure}`,
    signature: 'SONAA.CA',
    langue: l,
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

export function RythmeDuStyle({ genreId, titre, famille }: { genreId: string; titre: string; famille: string }) {
  const [motif, setMotif] = useState<Motif | null>(null);
  const [joue, setJoue] = useState(false);
  const [video, setVideo] = useState<'non' | number | 'echec'>('non');
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
      setJoue(false);
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
      const position = lecteur.current ? lecteur.current.position() : mouvementReduit() ? 0 : (performance.now() - t0) / 1000 / duree;
      ctx.setTransform(c.width / LARGEUR_RYTHME, 0, 0, c.width / LARGEUR_RYTHME, 0, 0);
      dessinerAffiche(ctx, motif, textes, { position });
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
  const nomFichier = `${slug(titre) || genreId}-rythme-sonaa`;

  const basculer = (): void => {
    if (lecteur.current) {
      lecteur.current.arreter();
      lecteur.current = null;
      setJoue(false);
    } else {
      lecteur.current = jouer(motif);
      setJoue(true);
    }
  };

  const image = (): void => {
    const c = document.createElement('canvas');
    c.width = LARGEUR_RYTHME;
    c.height = HAUTEUR_RYTHME;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    /* Arretee sur le premier temps, quand toutes les figures sont au repos. */
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
  const enregistrer = async (type: string, duree: number): Promise<Blob> => {
    const c = document.createElement('canvas');
    c.width = LARGEUR_RYTHME;
    c.height = HAUTEUR_RYTHME;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('toile');
    const son = jouer(motif, true);
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
          dessinerAffiche(ctx, motif, textes, { position: son.position() });
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

  const filmer = async (): Promise<void> => {
    const possible = typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
    const types = possible ? TYPES.filter((x) => MediaRecorder.isTypeSupported(x)) : [];
    lecteur.current?.arreter();
    lecteur.current = null;
    setJoue(false);
    const cycle = motif.pas * dureeDuPas(motif);
    const duree = Math.max(1, Math.round(SECONDES_VIDEO / cycle)) * cycle;
    for (const type of types) {
      try {
        const blob = await enregistrer(type, duree);
        if (blob.size < 100_000) continue;
        telecharger(blob, `${nomFichier}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
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
        <button type="button" className="ry-bouton ry-bouton-jouer" aria-pressed={joue} onClick={basculer} disabled={typeof video === 'number'}>
          <FaIcon icon={joue ? faStop : faPlay} />
          {joue ? t.rythmeArreter : t.rythmeEcouter}
        </button>
        <button type="button" className="ry-bouton" onClick={image}>
          <FaIcon icon={faDownload} />
          {t.rythmeImage}
        </button>
        <button type="button" className="ry-bouton" onClick={() => void filmer()} disabled={typeof video === 'number'}>
          <FaIcon icon={faVideo} />
          {typeof video === 'number' ? t.rythmeFabrication(video) : t.rythmeVideo}
        </button>
      </div>
      {video === 'echec' && <p className="ry-echec">{t.rythmeEchec}</p>}
    </section>
  );
}
