/* LE REEL D'UNE MIXTAPE : une video verticale d'une minute, fabriquee dans
 * le navigateur.
 *
 * Mika, le 18 octobre 2026 : « un bouton de partage pour les reseaux
 * sociaux, et que ca fasse un beau post, par exemple sur Instagram, avec un
 * reel d'une minute avec le cover et la description ». Instagram n'accepte
 * pas de lien a partager depuis le web : il lui faut une video. On la
 * fabrique donc ici, au format des reels (1080 x 1920) :
 *
 *   le fond est la pochette, floutee et assombrie ;
 *   au milieu, la pochette dans ses proportions, qui bat un peu avec les
 *   basses ;
 *   dessous, le titre, l'artiste et la description ;
 *   en bas, des barres qui suivent la musique, et sonaa.ca.
 *
 * LE SON EST CELUI DE LA MIXTAPE, une minute a partir de l'instant choisi.
 * L'audio passe par un AudioContext vers l'enregistreur seulement, jamais
 * vers les haut-parleurs : la fabrication est muette. Elle se fait en temps
 * reel (soixante secondes), avec MediaRecorder ; on prefere le MP4, que
 * Instagram accepte tel quel, et on retombe sur le WebM la ou le MP4
 * n'existe pas. Sur telephone, la video se partage directement (Web Share
 * avec fichier) ; ailleurs, elle se telecharge. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { mmss, urlAudio, urlAvatar, urlPochette, type SetDJ } from '../lib/sets.ts';
import { slug } from '../lib/chemins.ts';
import { t } from '../langue/langue.ts';

const L = 1080;
const H = 1920;
const DUREE = 60;
const ACCENT = '#ff7a1a';
const TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

type Etape = 'reglage' | 'fabrication' | 'pret' | 'erreur';

function chargerImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((ok) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = url;
  });
}

/** Les lignes d'un texte coupe a la largeur, au plus `max`, la derniere
    terminee par des points de suspension si elle deborde. */
function lignes(ctx: CanvasRenderingContext2D, texte: string, largeur: number, max: number): string[] {
  const mots = texte.replace(/\s+/g, ' ').trim().split(' ');
  const out: string[] = [];
  let ligne = '';
  for (const m of mots) {
    const essai = ligne ? `${ligne} ${m}` : m;
    if (ctx.measureText(essai).width <= largeur) ligne = essai;
    else {
      if (ligne) out.push(ligne);
      ligne = m;
      if (out.length === max) break;
    }
  }
  if (out.length < max && ligne) out.push(ligne);
  if (out.length > max) out.length = max;
  const derniere = out[out.length - 1];
  if (out.length === max && derniere !== undefined && mots.join(' ').length > out.join(' ').length) {
    let d = derniere;
    while (d && ctx.measureText(`${d}…`).width > largeur) d = d.slice(0, -1);
    out[out.length - 1] = `${d.trimEnd()}…`;
  }
  return out;
}

function rectArrondi(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + h, r);
  ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

/* LE FOND, AU CHOIX. Mika, le 18 octobre 2026 : « ce serait bien que le
   background soit le cover pas mal flouté, ou qu'on ait ce choix ».
   - flou   : la pochette tres floutee, assez claire pour qu'on y voie ses
              couleurs (par defaut) ;
   - sombre : la meme, assombrie, pour une pochette tres claire ;
   - noir   : l'encre du site, rien d'autre. */
type Fond = 'flou' | 'sombre' | 'noir';

/* LE FOND SE PREPARE UNE FOIS, et non a chaque image : un flou de cette
   taille sur 1080 x 1920, trente fois par seconde, ralentissait la
   fabrication. La pochette est d'abord reduite a 54 x 96, puis agrandie
   avec lissage : c'est deja un flou tres large, qui marche meme ou le
   filtre des toiles n'existe pas (Safari avant la 18) ; le filtre, quand
   il existe, adoucit ce qui reste et ravive les couleurs. */
function preparerFond(pochette: HTMLImageElement | null, fond: Fond): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = L;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.fillStyle = '#0d0c0b';
  ctx.fillRect(0, 0, L, H);
  if (pochette && fond !== 'noir') {
    const petit = document.createElement('canvas');
    petit.width = 54;
    petit.height = 96;
    const p = petit.getContext('2d');
    if (p) {
      const e = Math.max(petit.width / pochette.width, petit.height / pochette.height);
      const pl = pochette.width * e;
      const ph = pochette.height * e;
      p.drawImage(pochette, (petit.width - pl) / 2, (petit.height - ph) / 2, pl, ph);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = fond === 'flou' ? 'blur(24px) saturate(1.35)' : 'blur(24px) saturate(1.2)';
      /* Un debord de tous cotes : le flou ne laisse pas de bord sombre. */
      ctx.drawImage(petit, -60, -60, L + 120, H + 120);
      ctx.filter = 'none';
      ctx.fillStyle = fond === 'flou' ? 'rgba(13,12,11,0.18)' : 'rgba(13,12,11,0.58)';
      ctx.fillRect(0, 0, L, H);
    }
  }
  /* Le bas s'assombrit toujours : c'est la que se lisent le titre, la
     description et les barres. */
  const voile = ctx.createLinearGradient(0, 0, 0, H);
  voile.addColorStop(0, 'rgba(13,12,11,0.1)');
  voile.addColorStop(0.5, 'rgba(13,12,11,0.2)');
  voile.addColorStop(1, 'rgba(13,12,11,0.88)');
  ctx.fillStyle = voile;
  ctx.fillRect(0, 0, L, H);
  return c;
}

/** Une image de la video : `barres` de 0 a 1, `avance` de 0 a 1, `pouls`
    de 0 a 1 (l'energie des basses). */
function dessiner(
  ctx: CanvasRenderingContext2D,
  set: SetDJ,
  pochette: HTMLImageElement | null,
  fond: HTMLCanvasElement,
  barres: readonly number[],
  avance: number,
  pouls: number
): void {
  ctx.save();
  ctx.drawImage(fond, 0, 0);

  /* La pochette, dans ses proportions, qui bat avec les basses. */
  let basPochette = 230;
  if (pochette) {
    /* Une boite de 920 x 860 : une pochette en largeur prend toute la
       largeur utile, une carree ou en hauteur toute la hauteur. */
    const boiteL = L - 160;
    const boiteH = 860;
    const e = Math.min(boiteL / pochette.width, boiteH / pochette.height);
    const echelle = 1 + pouls * 0.035;
    const pl = pochette.width * e * echelle;
    const ph = pochette.height * e * echelle;
    const x = (L - pl) / 2;
    const y = 200 + (boiteH - ph) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 70;
    ctx.shadowOffsetY = 24;
    rectArrondi(ctx, x, y, pl, ph, 34);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
    ctx.save();
    rectArrondi(ctx, x, y, pl, ph, 34);
    ctx.clip();
    ctx.drawImage(pochette, x, y, pl, ph);
    ctx.restore();
    basPochette = y + ph;
  }

  /* Le titre, l'artiste, la description. */
  const marge = 80;
  const largeur = L - marge * 2;
  let y = Math.max(basPochette + 100, 1160);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f5f2ec';
  ctx.font = '800 72px Inter, system-ui, sans-serif';
  for (const l of lignes(ctx, set.titre, largeur, 2)) {
    ctx.fillText(l, marge, y);
    y += 82;
  }
  ctx.fillStyle = ACCENT;
  ctx.font = '700 44px Inter, system-ui, sans-serif';
  ctx.fillText(set.artiste_nom ?? '', marge, y + 6);
  y += 70;
  if (set.description) {
    ctx.fillStyle = 'rgba(245,242,236,0.78)';
    ctx.font = '400 34px Inter, system-ui, sans-serif';
    for (const l of lignes(ctx, set.description, largeur, 4)) {
      ctx.fillText(l, marge, y);
      y += 46;
    }
  }

  /* Les barres qui suivent la musique, puis l'avancee de la minute. */
  const nb = barres.length;
  const pas = largeur / nb;
  const baseBarres = 1700;
  ctx.fillStyle = ACCENT;
  for (let i = 0; i < nb; i += 1) {
    const h = 8 + (barres[i] ?? 0) * 150;
    rectArrondi(ctx, marge + i * pas + pas * 0.18, baseBarres - h, pas * 0.64, h, Math.min(6, pas * 0.3));
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(245,242,236,0.18)';
  ctx.fillRect(marge, baseBarres + 26, largeur, 6);
  ctx.fillStyle = '#f5f2ec';
  ctx.fillRect(marge, baseBarres + 26, largeur * Math.min(1, Math.max(0, avance)), 6);

  /* La signature. */
  ctx.fillStyle = '#f5f2ec';
  ctx.font = '800 46px Inter, system-ui, sans-serif';
  ctx.fillText('SONAA', marge, 1840);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(245,242,236,0.7)';
  ctx.font = '500 32px Inter, system-ui, sans-serif';
  ctx.fillText(t.ecouterSurSonaa, L - marge, 1838);
  ctx.restore();
}

export function GenerateurReel({ set, onFermer }: { set: SetDJ; onFermer: () => void }) {
  const toile = useRef<HTMLCanvasElement | null>(null);
  const duree = set.duree_s ?? 0;
  const debutParDefaut = Math.max(0, Math.min(Math.round(duree * 0.3), duree - DUREE));
  const [debut, setDebut] = useState(debutParDefaut);
  const [etape, setEtape] = useState<Etape>('reglage');
  const [secondes, setSecondes] = useState(0);
  const [video, setVideo] = useState<{ url: string; fichier: File } | null>(null);
  const [pochette, setPochette] = useState<HTMLImageElement | null>(null);
  const [choixFond, setChoixFond] = useState<Fond>('flou');
  const fond = useMemo(() => preparerFond(pochette, choixFond), [pochette, choixFond]);
  const arret = useRef<() => void>(() => undefined);
  const possible = typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';

  useEffect(() => {
    let vivant = true;
    void (async () => {
      await document.fonts?.ready;
      const img = await chargerImage(urlPochette(set.cover_path) ?? urlAvatar(set.artiste_avatar));
      if (vivant) setPochette(img);
    })();
    return () => {
      vivant = false;
      arret.current();
    };
  }, [set.cover_path, set.artiste_avatar]);

  /* L'APERCU, AVANT LA FABRICATION : la meme image, barres au repos. */
  useEffect(() => {
    const c = toile.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || etape !== 'reglage') return;
    dessiner(ctx, set, pochette, fond, Array.from({ length: 48 }, (_, i) => 0.15 + 0.12 * Math.sin(i * 0.7)), 0, 0);
  }, [pochette, fond, set, etape]);

  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video.url);
  }, [video]);

  const fabriquer = async (): Promise<void> => {
    const c = toile.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    setEtape('fabrication');
    setSecondes(0);
    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.src = urlAudio(set.audio_aac_path ?? set.audio_path);
      await new Promise<void>((ok, ko) => {
        audio.addEventListener('loadedmetadata', () => ok(), { once: true });
        audio.addEventListener('error', () => ko(new Error('audio')), { once: true });
      });
      audio.currentTime = debut;
      await new Promise<void>((ok) => audio.addEventListener('seeked', () => ok(), { once: true }));

      const ac = new AudioContext();
      const source = ac.createMediaElementSource(audio);
      const analyseur = ac.createAnalyser();
      analyseur.fftSize = 256;
      analyseur.smoothingTimeConstant = 0.78;
      const sortie = ac.createMediaStreamDestination();
      source.connect(analyseur);
      analyseur.connect(sortie);

      const flux = c.captureStream(30);
      for (const piste of sortie.stream.getAudioTracks()) flux.addTrack(piste);
      const type = TYPES.find((x) => MediaRecorder.isTypeSupported(x)) ?? '';
      const enregistreur = new MediaRecorder(flux, {
        ...(type ? { mimeType: type } : {}),
        videoBitsPerSecond: 4_500_000,
        audioBitsPerSecond: 192_000,
      });
      const morceaux: Blob[] = [];
      enregistreur.ondataavailable = (e) => {
        if (e.data.size > 0) morceaux.push(e.data);
      };
      const fini = new Promise<void>((ok) => {
        enregistreur.onstop = () => ok();
      });

      const donnees = new Uint8Array(analyseur.frequencyBinCount);
      const nb = 48;
      let vivant = true;
      let t0 = 0;
      const image = (): void => {
        if (!vivant) return;
        analyseur.getByteFrequencyData(donnees);
        const barres: number[] = [];
        for (let i = 0; i < nb; i += 1) {
          /* Une echelle a peu pres logarithmique : les basses ont plus de
             barres que les aigus, comme a l'oreille. */
          const de = Math.floor(Math.pow(i / nb, 1.7) * (donnees.length - 1));
          const a = Math.floor(Math.pow((i + 1) / nb, 1.7) * (donnees.length - 1));
          let m = 0;
          for (let k = de; k <= Math.max(de, a); k += 1) m = Math.max(m, donnees[k] ?? 0);
          /* Au carre : sans cela, une musique compressee tient toutes les
             barres pres du haut, et on ne voit plus qu'un mur. */
          barres.push(Math.pow(m / 255, 2));
        }
        const pouls = ((donnees[1] ?? 0) + (donnees[2] ?? 0) + (donnees[3] ?? 0)) / (3 * 255);
        const ecoule = (performance.now() - t0) / 1000;
        dessiner(ctx, set, pochette, fond, barres, ecoule / DUREE, pouls);
        setSecondes(Math.min(DUREE, Math.floor(ecoule)));
        if (ecoule >= DUREE) {
          vivant = false;
          audio.pause();
          if (enregistreur.state !== 'inactive') enregistreur.stop();
          return;
        }
        requestAnimationFrame(image);
      };
      arret.current = () => {
        vivant = false;
        audio.pause();
        if (enregistreur.state !== 'inactive') enregistreur.stop();
        void ac.close();
      };

      if (ac.state === 'suspended') await ac.resume();
      enregistreur.start(1000);
      await audio.play();
      t0 = performance.now();
      requestAnimationFrame(image);
      await fini;
      void ac.close();

      const typeFinal = enregistreur.mimeType || type || 'video/webm';
      const ext = typeFinal.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(morceaux, { type: typeFinal.split(';')[0] ?? 'video/webm' });
      const fichier = new File([blob], `${slug(set.titre) || 'mixtape'}-sonaa.${ext}`, { type: blob.type });
      setVideo({ url: URL.createObjectURL(blob), fichier });
      setEtape('pret');
    } catch {
      setEtape('erreur');
    }
  };

  const partageable = video !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [video.fichier] });

  return (
    <div className="mx-reel-voile" onClick={() => etape !== 'fabrication' && onFermer()}>
      <div className="mx-reel" role="dialog" aria-modal="true" aria-label={t.reelTitre} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mx-reel-fermer" onClick={onFermer} aria-label={t.fermer} disabled={etape === 'fabrication'}>
          <FaIcon icon={faXmark} />
        </button>
        <div className="mx-reel-apercu">
          {etape === 'pret' && video ? (
            <video src={video.url} controls playsInline className="mx-reel-video" />
          ) : (
            <canvas ref={toile} width={L} height={H} className="mx-reel-toile" />
          )}
        </div>
        <div className="mx-reel-mots">
          <h2>{t.reelTitre}</h2>
          {!possible ? (
            <p className="mx-erreur">{t.reelImpossible}</p>
          ) : etape === 'reglage' ? (
            <>
              <p className="mx-aide">{t.reelAide}</p>
              <div className="mx-reel-fonds" role="radiogroup" aria-label={t.reelFond}>
                <span className="mx-reel-fonds-titre">{t.reelFond}</span>
                {(
                  [
                    ['flou', t.reelFondFlou],
                    ['sombre', t.reelFondSombre],
                    ['noir', t.reelFondNoir],
                  ] as const
                ).map(([id, nom]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={choixFond === id}
                    className="mx-reel-fond"
                    onClick={() => setChoixFond(id)}
                  >
                    {nom}
                  </button>
                ))}
              </div>
              {duree > DUREE && (
                <label className="mx-reel-debut">
                  {t.reelDebut(mmss(debut))}
                  <input type="range" min={0} max={Math.max(0, duree - DUREE)} step={5} value={debut} onChange={(e) => setDebut(Number(e.target.value))} />
                </label>
              )}
              <button type="button" className="mx-envoyer" onClick={() => void fabriquer()}>
                {t.reelLancer}
              </button>
            </>
          ) : etape === 'fabrication' ? (
            <>
              <p className="mx-reel-avance">{t.reelEnCours(secondes)}</p>
              <span className="mx-reel-jauge" aria-hidden="true">
                <span style={{ width: `${(secondes / DUREE) * 100}%` }} />
              </span>
              <p className="mx-aide">{t.reelGarderOuvert}</p>
            </>
          ) : etape === 'pret' && video ? (
            <>
              <p>{t.reelPret}</p>
              <a className="mx-envoyer" href={video.url} download={video.fichier.name}>
                {t.reelTelecharger}
              </a>
              {partageable && (
                <button
                  type="button"
                  className="mx-action"
                  onClick={() => void navigator.share({ files: [video.fichier], title: set.titre }).catch(() => undefined)}
                >
                  {t.reelPartager}
                </button>
              )}
              <button type="button" className="mx-lien" onClick={() => setEtape('reglage')}>
                {t.reelRecommencer}
              </button>
            </>
          ) : (
            <>
              <p className="mx-erreur">{t.reelImpossible}</p>
              <button type="button" className="mx-lien" onClick={() => setEtape('reglage')}>
                {t.reelRecommencer}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
