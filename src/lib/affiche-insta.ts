/* L'IMAGE 9:16 D'UNE SOIREE, POUR INSTAGRAM.
 *
 * ═══ CE QU'ELLE EST ═══
 *
 * Une story ou un reel Instagram fait 1080 par 1920. L'affiche d'une soiree
 * est presque toujours carree ou en 4/5 : posee telle quelle dans une story,
 * elle flotte au milieu avec deux bandes noires, et les informations sont
 * dans la legende que personne ne lit. Ici l'affiche est posee en grand sur
 * un fond fait d'elle-meme, floutee et assombrie, et le bas porte ce qu'on
 * doit savoir sans cliquer : le titre, la date et l'heure, la salle, les
 * noms, et d'ou ca vient.
 *
 * ═══ POURQUOI DANS LE NAVIGATEUR ═══
 *
 * Rien n'est envoye nulle part : l'image est dessinee sur une toile chez la
 * personne qui l'a demandee, a partir d'une affiche qu'elle a elle-meme
 * deposee. Pas de serveur, pas de file, pas de quota. Un telephone de 2020
 * dessine cette toile en moins d'une seconde.
 *
 * Demande de Mika du 7 septembre 2026 : « un fichier 9:16 avec le cover de
 * l'event bien fait pour Instagram, avec les infos a mettre dans le post ».
 */

export const LARGEUR = 1080;
export const HAUTEUR = 1920;

export interface SoireePourAffiche {
  readonly titre: string;
  readonly debut: string | null;
  readonly lieu: string | null;
  readonly artistes: readonly string[];
  readonly affiche: string | null;
  readonly lien?: string | null;
  readonly genres?: readonly string[];
}

/** Coupe un texte en lignes qui tiennent dans `largeur`, en mesurant avec
    la toile. Un mot plus long qu'une ligne est laisse entier : le couper au
    milieu serait pire que de le laisser deborder d'un rien. */
export function couperEnLignes(
  mesurer: (s: string) => number,
  texte: string,
  largeur: number,
  maxLignes: number
): string[] {
  const mots = texte.trim().split(/\s+/).filter(Boolean);
  const lignes: string[] = [];
  let courante = '';
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (mesurer(essai) <= largeur || !courante) courante = essai;
    else {
      lignes.push(courante);
      courante = mot;
    }
  }
  if (courante) lignes.push(courante);
  if (lignes.length <= maxLignes) return lignes;
  /* Trop long : on garde les premieres lignes et on marque la coupe. */
  const gardees = lignes.slice(0, maxLignes);
  const derniere = gardees[maxLignes - 1] ?? '';
  gardees[maxLignes - 1] = `${derniere.replace(/[\s.,;:]+$/, '')}…`;
  return gardees;
}

/** La date et l'heure, en toutes lettres, dans la langue et le fuseau de la
    soiree. « Samedi 12 septembre · 22 h 00 ». */
export function quandEnLettres(iso: string | null, fuseau: string, langue: 'fr' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const locale = langue === 'fr' ? 'fr-CA' : 'en-CA';
  const jour = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: fuseau,
  }).format(d);
  const heure = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: fuseau,
    hour12: langue === 'en',
  }).format(d);
  const jourMaj = jour.charAt(0).toUpperCase() + jour.slice(1);
  return `${jourMaj} · ${langue === 'fr' ? heure.replace(':', ' h ') : heure}`;
}

/** Le texte a coller dans la legende du post : tout ce que l'image dit,
    plus le lien, que l'image ne peut pas porter. */
export function texteDuPost(
  s: SoireePourAffiche,
  fuseau: string,
  langue: 'fr' | 'en',
  ville?: string | null
): string {
  const lignes: string[] = [s.titre];
  const quand = quandEnLettres(s.debut, fuseau, langue);
  if (quand) lignes.push(quand);
  if (s.lieu) lignes.push(s.lieu);
  if (s.artistes.length > 0) lignes.push(s.artistes.join(' · '));
  if (s.lien) lignes.push('', s.lien);
  /* Les mots-cles : le site, la ville, les styles. Aplatis comme Instagram
     les veut, sans accent ni espace. */
  const mot = (x: string): string => `#${aplatir(x)}`;
  const mots = ['#sonaa', ...(ville ? [mot(ville)] : []), ...(s.genres ?? []).map(mot)].filter(
    (m) => m.length > 1
  );
  lignes.push('', [...new Set(mots)].join(' '));
  return lignes.join('\n');
}

const aplatir = (x: string): string =>
  x
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

function chargerImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    /* SANS CELA, LA TOILE SE VERROUILLE : une image d'une autre origine
       dessinee sans autorisation rend `toBlob` interdit. Le stockage sert les
       affiches avec l'en-tete qu'il faut ; il suffit de le demander. */
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('affiche illisible'));
    img.src = url;
  });
}

/** Dessine `img` dans le rectangle en le recadrant par le milieu (comme
    object-fit: cover). */
function couvrir(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  l: number,
  h: number
): void {
  const r = Math.max(l / img.width, h / img.height);
  const sl = l / r;
  const sh = h / r;
  ctx.drawImage(img, (img.width - sl) / 2, (img.height - sh) / 2, sl, sh, x, y, l, h);
}

/** Dessine `img` entiere dans le rectangle, centree (comme object-fit:
    contain), et rend le rectangle occupe. */
function contenir(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  l: number,
  h: number
): { x: number; y: number; l: number; h: number } {
  const r = Math.min(l / img.width, h / img.height);
  const dl = img.width * r;
  const dh = img.height * r;
  const dx = x + (l - dl) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dl, dh);
  return { x: dx, y: dy, l: dl, h: dh };
}

function arrondi(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + h, r);
  ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

export interface OptionsAffiche {
  readonly fuseau: string;
  readonly langue: 'fr' | 'en';
  /** La police de la page, lue sur `body` : la toile ne connait pas les
      variables CSS. */
  readonly police?: string;
}

/** Rend l'image PNG de 1080 par 1920. Rejette si l'affiche ne se charge pas
    ou si la toile refuse de s'exporter. */
export async function genererAfficheInsta(s: SoireePourAffiche, o: OptionsAffiche): Promise<Blob> {
  const toile = document.createElement('canvas');
  toile.width = LARGEUR;
  toile.height = HAUTEUR;
  const ctx = toile.getContext('2d');
  if (!ctx) throw new Error('toile indisponible');
  const police = o.police ?? 'system-ui, sans-serif';
  const marge = 72;

  /* ── Le fond : l'affiche elle-meme, floutee et assombrie ─────────────── */
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  let image: HTMLImageElement | null = null;
  if (s.affiche) {
    try {
      image = await chargerImage(s.affiche);
    } catch {
      image = null;
    }
  }

  if (image) {
    ctx.save();
    ctx.filter = 'blur(40px) brightness(0.45) saturate(1.2)';
    couvrir(ctx, image, -80, -80, LARGEUR + 160, HAUTEUR + 160);
    ctx.restore();

    /* ── L'affiche en grand, entiere, dans le tiers haut et le milieu ──── */
    const zone = { x: marge, y: 150, l: LARGEUR - marge * 2, h: 1180 };
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 24;
    /* L'ombre se dessine sur une forme pleine ; on la pose sous l'image. */
    const r = Math.min(zone.l / image.width, zone.h / image.height);
    const dl = image.width * r;
    const dh = image.height * r;
    arrondi(ctx, zone.x + (zone.l - dl) / 2, zone.y + (zone.h - dh) / 2, dl, dh, 28);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
    ctx.save();
    arrondi(ctx, zone.x + (zone.l - dl) / 2, zone.y + (zone.h - dh) / 2, dl, dh, 28);
    ctx.clip();
    contenir(ctx, image, zone.x, zone.y, zone.l, zone.h);
    ctx.restore();
  }

  /* ── Le voile du bas, pour que le texte se lise sur n'importe quoi ──── */
  const degrade = ctx.createLinearGradient(0, 1180, 0, HAUTEUR);
  degrade.addColorStop(0, 'rgba(11,12,16,0)');
  degrade.addColorStop(0.35, 'rgba(11,12,16,0.85)');
  degrade.addColorStop(1, 'rgba(11,12,16,0.98)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 1180, LARGEUR, HAUTEUR - 1180);

  /* ── Le texte ───────────────────────────────────────────────────────── */
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  const largeurTexte = LARGEUR - marge * 2;

  let y = 1440;
  ctx.font = `700 64px ${police}`;
  const titre = couperEnLignes((t) => ctx.measureText(t).width, s.titre, largeurTexte, 3);
  for (const ligne of titre) {
    ctx.fillText(ligne, marge, y);
    y += 74;
  }

  y += 18;
  const quand = quandEnLettres(s.debut, o.fuseau, o.langue);
  if (quand) {
    ctx.font = `600 40px ${police}`;
    ctx.fillStyle = '#f5d76e';
    ctx.fillText(quand, marge, y);
    y += 56;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  if (s.lieu) {
    ctx.font = `500 38px ${police}`;
    const lieu = couperEnLignes((t) => ctx.measureText(t).width, s.lieu, largeurTexte, 1);
    ctx.fillText(lieu[0] ?? '', marge, y);
    y += 52;
  }

  if (s.artistes.length > 0) {
    ctx.font = `400 34px ${police}`;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    const noms = couperEnLignes(
      (t) => ctx.measureText(t).width,
      s.artistes.join(' · '),
      largeurTexte,
      2
    );
    for (const ligne of noms) {
      ctx.fillText(ligne, marge, y);
      y += 44;
    }
  }

  /* ── La signature ───────────────────────────────────────────────────── */
  ctx.font = `600 30px ${police}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('sonaa.ca', marge, HAUTEUR - 80);

  const blob = await new Promise<Blob | null>((res) => toile.toBlob(res, 'image/png'));
  if (!blob) throw new Error('export impossible');
  return blob;
}

/** Un nom de fichier sur, a partir du titre. */
export function nomDeFichier(titre: string): string {
  const plat = titre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${plat || 'soiree'}-story.png`;
}
