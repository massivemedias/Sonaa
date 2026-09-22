/* LE MOUVEMENT DE LA V2, EN DEUX PIECES ET RIEN DE PLUS.
 *
 * Mika a choisi le prototype 21st.dev le 21 septembre 2026, et ce qui le
 * distingue en mouvement tient en une phrase : les choses ENTRENT, en cascade,
 * avec un ressort. Une carte n'est pas la puis pas la ; elle arrive.
 *
 * ═══ POURQUOI UNE SEULE FORME D'APPARITION ═══
 *
 * La bibliotheque sait tout faire, et c'est justement le risque : un site ou
 * chaque composant invente son entree finit par trembler de partout. Il n'y a
 * donc qu'UN geste, ecrit ici, et les pages le composent : la meme montee de
 * vingt-deux pixels, le meme ressort, le meme pas de cascade. Une page qui
 * voudrait autre chose doit le justifier ici, pas l'ecrire chez elle.
 *
 * ═══ CE QUE CA COUTE, ET COMMENT ON LE PAIE ═══
 *
 * Motion entier pese une trentaine de kilo-octets. `LazyMotion` avec le jeu
 * `domAnimation` n'en charge que le tiers, et le mode strict fait echouer la
 * construction si quelqu'un importe `motion.div` au lieu de `m.div`, ce qui
 * rechargerait tout. Le reste du site ne paie que ce qu'il anime.
 *
 * ═══ CELUI QUI NE VEUT PAS DE MOUVEMENT N'EN A PAS ═══
 *
 * `prefers-reduced-motion` est lu par le crochet de la bibliotheque, et dans
 * ce cas le composant rend son enfant tel quel : pas d'opacite a zero qui
 * attendrait une animation qui ne vient pas. */

import type { ReactNode } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';

/** Le fournisseur, pose une fois a la racine dans main.tsx. */
export function MotionRacine({ children }: { readonly children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

/* Le ressort du prototype, tel que mesure a l'oeil sur /v2/ : ferme sans
   rebondir. Le pas de cascade est plafonne a huit rangs, sinon la trentieme
   carte d'une liste attendrait deux secondes pour rien. */
const RESSORT = { type: 'spring', stiffness: 140, damping: 20 } as const;
const PAS = 0.06;
const RANG_MAX = 8;

type Balise = 'div' | 'li' | 'article' | 'section';

interface Props {
  /** Le rang dans la cascade : 0 part tout de suite, 1 un pas plus tard. */
  readonly i?: number;
  readonly as?: Balise;
  readonly className?: string;
  readonly 'aria-label'?: string;
  readonly children: ReactNode;
}

/** Une entree en cascade : l'element monte de vingt-deux pixels en
    apparaissant, une fois, quand il entre dans l'ecran. */
export function Apparition({ i = 0, as = 'div', className, children, ...reste }: Props) {
  const sobre = useReducedMotion();
  const anim = sobre
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.15 },
        transition: { ...RESSORT, delay: Math.min(i, RANG_MAX) * PAS },
      };
  /* AUCUNE CLE POSEE A `undefined`. Le depot compile avec
     `exactOptionalPropertyTypes` : une propriete facultative est absente ou
     a une valeur, jamais explicitement indefinie. On ne pose donc que ce
     qu'on a recu. */
  const etiquette = reste['aria-label'];
  const commun = {
    ...(className !== undefined ? { className } : {}),
    ...(etiquette !== undefined ? { 'aria-label': etiquette } : {}),
    ...anim,
  };
  if (as === 'li') return <m.li {...commun}>{children}</m.li>;
  if (as === 'article') return <m.article {...commun}>{children}</m.article>;
  if (as === 'section') return <m.section {...commun}>{children}</m.section>;
  return <m.div {...commun}>{children}</m.div>;
}
