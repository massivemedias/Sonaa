/* Pochette procédurale, dernier recours.

   Quand aucune image n'est disponible, ni pochette iTunes ni vignette de vidéo,
   on ne montre pas une image cassée ni un rectangle vide : on en dessine une.
   Teinte de la famille, initiales de l'artiste, motif dérivé du titre pour que
   deux morceaux du même artiste ne se ressemblent pas.

   Tout est calculé, aucun asset, aucune requête. */

interface Props {
  artist: string;
  title: string;
  hue: number;
  /** Taille du carré en pixels CSS. Le dessin est vectoriel, il ne pixelise pas. */
  size?: number;
}

/** Deux initiales au plus : première lettre des deux premiers mots utiles. */
const initials = (artist: string): string => {
  const words = artist
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(the|los|las|le|la|les|de|du|des|and|feat)$/i.test(w));
  const source = words.length > 0 ? words : [artist.trim() || '?'];
  return source
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
};

/** Hachage stable : la même paire donne toujours la même pochette. */
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

export function ProceduralCover({ artist, title, hue, size = 400 }: Props) {
  const seed = hash(`${artist}|${title}`);
  const seed2 = hash(`${title}|${artist}`);

  // Deux bandes obliques, angle et écart tirés du titre.
  const angle = -32 + seed * 64;
  const shift = 0.18 + seed2 * 0.24;
  const letters = initials(artist);

  const id = `pc-${Math.floor(seed * 1e9).toString(36)}`;

  return (
    <svg
      className="procedural-cover"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      /* `slice` et non `meet` : dans la fenêtre 16:9 du panneau, un carré en
         `meet` laisse deux bandes noires sur les côtés. On remplit et on rogne,
         comme le ferait `object-fit: cover` sur une image. */
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Pochette générée pour ${title} de ${artist}`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`oklch(0.32 0.09 ${hue})`} />
          <stop offset="1" stopColor={`oklch(0.14 0.04 ${hue})`} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="0" y="0" width="100" height="100" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />

      <g clipPath={`url(#${id}-clip)`} transform={`rotate(${angle.toFixed(1)} 50 50)`}>
        <rect
          x="-60"
          y={(50 - shift * 100).toFixed(1)}
          width="220"
          height="1.4"
          fill={`oklch(0.72 0.14 ${hue})`}
          opacity="0.75"
        />
        <rect
          x="-60"
          y={(50 + shift * 100).toFixed(1)}
          width="220"
          height="0.7"
          fill={`oklch(0.72 0.14 ${hue})`}
          opacity="0.45"
        />
      </g>

      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"
        fontSize={letters.length > 1 ? 34 : 44}
        fontWeight="600"
        letterSpacing="1"
        fill={`oklch(0.9 0.05 ${hue})`}
      >
        {letters}
      </text>
    </svg>
  );
}
