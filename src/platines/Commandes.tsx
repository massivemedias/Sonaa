/* LES COMMANDES DE LA TABLE ET DES PLATINES : bouton rotatif et fader.
 *
 * Tout se manie a la souris, comme l'a demande Mika : on attrape et on
 * glisse (vers le haut pour un bouton, le long de la course pour un fader),
 * la molette regle finement, le double-clic remet au neutre. Au clavier,
 * les fleches font la meme chose : ce sont des curseurs (role="slider").
 *
 * LES GESTES SONT CEUX DES MACHINES DE MAUDITEMACHINE.COM (le guide
 * docs/design/MACHINES-DESIGN-SYSTEM.md de ce depot-la, section 7) : 270
 * degres de course, 150 px de glisser pour toute la course, Maj dix fois
 * plus fin, comme Ableton, 2 % par cran de molette. Un fader ne saute pas
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

/* ═══ LE BOUTON ROTATIF ═══ Un capuchon noir sur sa collerette, un repere
   couleur os. Quand le neutre est au milieu (egaliseur, filtre), un cran
   serigraphie au-dessus le montre, comme TONE sur la MM-808. */
export function Bouton({
  valeur,
  min,
  max,
  neutre,
  onChange,
  nom,
  teinte,
  libelle,
}: Reglage & { readonly teinte?: 'normal' | 'filtre' | 'effet'; readonly libelle?: string }) {
  const depart = useRef<{ y: number; v: number } | null>(null);
  const angle = -135 + ((valeur - min) / (max - min)) * 270;
  const cran = neutre > min && neutre < max;
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
          e.currentTarget.setPointerCapture(e.pointerId);
          depart.current = { y: e.clientY, v: valeur };
        }}
        onPointerMove={(e) => {
          if (!depart.current) return;
          /* Maj : dix fois plus fin. On repart d'ici pour ne pas sauter. */
          const finesse = e.shiftKey ? 1500 : 150;
          const d = (depart.current.y - e.clientY) / finesse;
          const v = borne(depart.current.v + d * (max - min), min, max);
          depart.current = { y: e.clientY, v };
          onChange(v);
        }}
        onPointerUp={() => {
          depart.current = null;
        }}
        onDoubleClick={() => onChange(neutre)}
        onWheel={(e: WheelEvent) => onChange(borne(valeur - Math.sign(e.deltaY) * (max - min) * (e.shiftKey ? 0.01 : 0.02), min, max))}
        onKeyDown={(e) => clavier(e, { valeur, min, max, neutre, onChange, nom })}
      >
        <span className="pl-bouton-collerette" aria-hidden="true" />
        <span className="pl-bouton-capuchon" aria-hidden="true" style={{ transform: `rotate(${angle}deg)` }}>
          <span className="pl-bouton-index" />
        </span>
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
