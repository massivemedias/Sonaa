/* Pochette générée. JETABLE dans sa forme, définitive dans son principe :
   aucun asset externe n'entre dans le dépôt, et aucune URL tierce n'est
   appelée au runtime. En production, scripts/fetch-covers.ts fige des URLs
   d'artwork au build ; ici, on dessine à partir de la graine du morceau. */

interface Props {
  seed: number;
  hue: number;
  size?: number;
}

const mix = (seed: number, n: number): number => {
  let x = (seed ^ (n * 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5;
  x >>>= 0;
  return x / 4294967296;
};

export function Cover({ seed, hue, size = 100 }: Props) {
  const bars = 7;
  const rot = Math.floor(mix(seed, 3) * 4) * 90;

  return (
    <svg
      className="cover"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" fill={`oklch(0.22 0.03 ${hue})`} />
      <g transform={`rotate(${rot} 50 50)`}>
        {Array.from({ length: bars }, (_, i) => {
          const w = 6 + mix(seed, i + 1) * 26;
          const y = 6 + i * 13;
          const l = 0.4 + mix(seed, i + 40) * 0.42;
          return (
            <rect
              key={i}
              x={10 + mix(seed, i + 20) * 34}
              y={y}
              width={w}
              height={7}
              fill={`oklch(${l.toFixed(2)} 0.1 ${hue})`}
            />
          );
        })}
      </g>
      <circle
        cx={50}
        cy={50}
        r={12 + mix(seed, 9) * 16}
        fill="none"
        stroke={`oklch(0.86 0.09 ${hue})`}
        strokeWidth={1.2}
        opacity={0.65}
      />
    </svg>
  );
}
