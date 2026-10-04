/* LES COMMANDES DE LA TABLE ET DES PLATINES : bouton rotatif et fader.
 *
 * Tout se manie a la souris, comme l'a demande Mika : on attrape et on
 * glisse (vers le haut pour un bouton, le long de la course pour un fader),
 * la molette regle finement, le double-clic remet au neutre. Au clavier,
 * les fleches font la meme chose : ce sont des curseurs (role="slider").
 *
 * LES POTARDS TOURNENT (Mika, le 3 octobre 2026 : « fais les knobs
 * rotary ») : on les attrape et on tourne autour, la valeur suit l'angle du
 * pointeur, 270 degres pour toute la course, comme un vrai bouton. Tout pres
 * du centre, ou l'angle s'affole au moindre pixel, c'est le glisser vertical
 * qui prend le relais (150 px pour toute la course). Maj : dix fois plus
 * fin, comme Ableton ; 2 % par cran de molette. Un fader ne saute pas
 * sous le clic : on l'attrape ou il est, comme un vrai, sinon toucher le
 * pitch d'une platine qui joue ferait un saut de tempo. */

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';

interface Reglage {
  readonly valeur: number;
  readonly min: number;
  readonly max: number;
  readonly neutre: number;
  readonly onChange: (v: number) => void;
  readonly nom: string;
}

const borne = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

function clavier(e: KeyboardEvent, r: Reglage): void {
  const pas = (r.max - r.min) / (e.shiftKey ? 200 : 40);
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') r.onChange(borne(r.valeur + pas, r.min, r.max));
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') r.onChange(borne(r.valeur - pas, r.min, r.max));
  else if (e.key === 'Home' || e.key === '0') r.onChange(r.neutre);
  else return;
  e.preventDefault();
}

/* ═══ LE BOUTON ROTATIF ═══ Un vrai rotary control, comme l'a demande
   Mika : autour, l'anneau de valeur, une gorge sombre sur 270 degres ou la
   valeur s'allume en orange (depuis le neutre pour un egaliseur ou un
   filtre, depuis le minimum pour une dose ou un volume) ; dessous, un corps
   lisse au dessus concave, dont la lumiere ne tourne pas ; dessus, le
   repere couleur os, qui tourne. */
const R = 44;
const point = (degres: number): string => {
  const r = (degres * Math.PI) / 180;
  return `${(R * Math.sin(r)).toFixed(2)} ${(-R * Math.cos(r)).toFixed(2)}`;
};
const arc = (de: number, a: number): string => `M ${point(de)} A ${R} ${R} 0 ${a - de > 180 ? 1 : 0} 1 ${point(a)}`;

function Anneau({ de, a }: { readonly de: number; readonly a: number }) {
  const [debut, fin] = de < a ? [de, a] : [a, de];
  return (
    <svg className="pl-bouton-anneau" viewBox="-50 -50 100 100" aria-hidden="true">
      <path className="pl-anneau-gorge" d={arc(-135, 135)} />
      {fin - debut > 0.5 && <path className="pl-anneau-valeur" d={arc(debut, fin)} />}
    </svg>
  );
}

export function Bouton({
  valeur,
  min,
  max,
  neutre,
  onChange,
  nom,
  teinte,
  libelle,
  depuis,
}: Reglage & {
  readonly teinte?: 'normal' | 'filtre' | 'effet';
  readonly libelle?: string;
  /** D'ou l'anneau s'allume : du neutre (egaliseur, filtre) ou du minimum
      (dose, volume). Par defaut, du neutre quand il est au milieu. */
  readonly depuis?: 'neutre' | 'minimum';
}) {
  const depart = useRef<{ x: number; y: number; cx: number; cy: number; v: number } | null>(null);
  const angleDe = (v: number): number => -135 + ((v - min) / (max - min)) * 270;
  const angle = angleDe(valeur);
  const cran = neutre > min && neutre < max;
  const origine = depuis === 'minimum' || !cran ? -135 : angleDe(neutre);
  return (
    <div className={`pl-bouton pl-bouton-${teinte ?? 'normal'}`} data-cran={cran}>
      <div
        className="pl-bouton-cadran"
        role="slider"
        tabIndex={0}
        aria-label={nom}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(valeur * 100) / 100}
        onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
          const r = e.currentTarget.getBoundingClientRect();
          depart.current = { x: e.clientX, y: e.clientY, cx: r.left + r.width / 2, cy: r.top + r.height / 2, v: valeur };
          if (e.isPrimary) e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const p = depart.current;
          if (!p) return;
          const finesse = e.shiftKey ? 0.1 : 1;
          /* L'angle de chaque position autour du centre, depuis le haut, dans
             le sens des aiguilles d'une montre. */
          const angle = (x: number, y: number): number => Math.atan2(x - p.cx, p.cy - y);
          let d: number;
          if (Math.hypot(e.clientX - p.cx, e.clientY - p.cy) >= 14 && Math.hypot(p.x - p.cx, p.y - p.cy) >= 14) {
            let tour = angle(e.clientX, e.clientY) - angle(p.x, p.y);
            if (tour > Math.PI) tour -= 2 * Math.PI;
            if (tour < -Math.PI) tour += 2 * Math.PI;
            d = tour / (1.5 * Math.PI);
          } else {
            d = (p.y - e.clientY) / 150;
          }
          /* On repart d'ici a chaque pas : pas de saut, et la butee arrete
             la valeur sans la faire revenir de l'autre cote. */
          const v = borne(p.v + d * finesse * (max - min), min, max);
          depart.current = { ...p, x: e.clientX, y: e.clientY, v };
          onChange(v);
        }}
        onPointerUp={() => {
          depart.current = null;
        }}
        onDoubleClick={() => onChange(neutre)}
        onWheel={(e: WheelEvent) => onChange(borne(valeur - Math.sign(e.deltaY) * (max - min) * (e.shiftKey ? 0.01 : 0.02), min, max))}
        onKeyDown={(e) => clavier(e, { valeur, min, max, neutre, onChange, nom })}
      >
        <Anneau de={origine} a={angle} />
        <span className="pl-bouton-jupe" aria-hidden="true" />
        <span className="pl-bouton-dessus" aria-hidden="true" />
        <span className="pl-bouton-index" aria-hidden="true" style={{ transform: `rotate(${angle}deg)` }} />
      </div>
      {libelle && <span className="pl-bouton-nom">{libelle}</span>}
    </div>
  );
}

/* ═══ LE FADER ═══ `inverse` met le minimum en haut : c'est le pitch d'une
   CDJ, qu'on tire vers soi pour accelerer. */
export function Fader({
  valeur,
  min,
  max,
  neutre,
  onChange,
  nom,
  sens,
  inverse = false,
  className,
  style,
}: Reglage & { readonly sens: 'vertical' | 'horizontal'; readonly inverse?: boolean; readonly className?: string; readonly style?: CSSProperties }) {
  const piste = useRef<HTMLDivElement | null>(null);
  const prise = useRef<{ point: number; v: number } | null>(null);
  const part = (valeur - min) / (max - min);
  const point = (e: PointerEvent<HTMLDivElement>): number => (sens === 'vertical' ? -e.clientY : e.clientX);
  const glisser = (e: PointerEvent<HTMLDivElement>): void => {
    const r = piste.current?.getBoundingClientRect();
    const p = prise.current;
    if (!r || !p) return;
    const course = sens === 'vertical' ? r.height : r.width;
    let d = (point(e) - p.point) / Math.max(1, course);
    if (inverse) d = -d;
    if (e.shiftKey) d /= 10;
    const v = borne(p.v + d * (max - min), min, max);
    prise.current = { point: point(e), v };
    onChange(v);
  };
  const position = inverse ? 1 - part : part;
  return (
    <div
      ref={piste}
      className={`pl-fader pl-fader-${sens}${className ? ` ${className}` : ''}`}
      style={style}
      role="slider"
      tabIndex={0}
      aria-label={nom}
      aria-orientation={sens}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(valeur * 100) / 100}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        prise.current = { point: point(e), v: valeur };
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) glisser(e);
      }}
      onPointerUp={() => {
        prise.current = null;
      }}
      onDoubleClick={() => onChange(neutre)}
      onKeyDown={(e) => clavier(e, { valeur, min, max, neutre, onChange, nom })}
    >
      <span className="pl-fader-graduation" aria-hidden="true" />
      <span className="pl-fader-rainure" aria-hidden="true" />
      <span
        className="pl-fader-curseur"
        aria-hidden="true"
        style={sens === 'vertical' ? { bottom: `${position * 100}%` } : { left: `${position * 100}%` }}
      />
    </div>
  );
}

/* ═══ LE CROCHET ═══ La serigraphie qui reunit un groupe de commandes : un
   filet fin, releve aux deux bouts et coupe au milieu par le nom du groupe,
   comme sous les pas d'une Elektron et sous GLOBAL FX sur la MM-808. */
export function Crochet({ libelle }: { readonly libelle: string }) {
  return (
    <div className="pl-crochet" aria-hidden="true">
      <span>{libelle}</span>
    </div>
  );
}
