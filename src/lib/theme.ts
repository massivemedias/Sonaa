/* LE THEME, SOMBRE OU CLAIR.
 *
 * ═══ POURQUOI CELUI-CI NE RECHARGE PAS LA PAGE ═══
 *
 * Le changement de langue recharge, parce que le dictionnaire est lu au
 * moment ou chaque module s'evalue. Le theme, lui, ne vit que dans des
 * variables CSS : poser un attribut sur `html` suffit a redescendre toute
 * l'echelle des gris dans les mille cent regles du site, en un rendu. Un
 * rechargement ici serait du bruit pour rien, et il ferait perdre l'endroit
 * ou l'on se trouve dans une longue page.
 *
 * ═══ SANS CHOIX, C'EST LE SOMBRE ═══
 *
 * « sombre », « clair », et l'absence de choix. L'absence de choix suivait
 * le reglage du systeme. Depuis le 30 septembre 2026, elle vaut le sombre :
 * Mika, devant la page claire, « fait en dark, je pense que c'est mieux ».
 * C'est le theme dans lequel le site a ete dessine et ou le granite se lit
 * le mieux ; qui prefere le clair l'a a un geste, et son choix est retenu.
 *
 * ═══ LE CLIGNOTEMENT EST LE VRAI PIEGE ═══
 *
 * Si l'attribut n'est pose qu'au montage de React, la page rend d'abord dans
 * le theme par defaut, puis bascule. Sur un theme clair choisi, cela donne un
 * eclair noir a chaque chargement. L'attribut est donc pose par un fragment
 * de script dans index.html, AVANT la premiere peinture ; ce module ne fait
 * que le relire et le changer ensuite.
 */

export type Theme = 'sombre' | 'clair';

const CLE_THEME = 'sonaa-theme';

function themeRange(): Theme | null {
  try {
    const brut = localStorage.getItem(CLE_THEME);
    return brut === 'sombre' || brut === 'clair' ? brut : null;
  } catch {
    return null;
  }
}

/** Le theme en vigueur : celui qui a ete choisi, sinon le sombre. */
export function themeActuel(): Theme {
  return themeRange() ?? 'sombre';
}

/* PAS DE `themeEstChoisi`. Elle avait ete ecrite, exportee et documentee,
   par symetrie avec le selecteur de langue qui, lui, en a besoin : la langue
   montre deux boutons et doit savoir lequel allumer. Le theme est une
   bascule qui nomme sa DESTINATION, pas son etat ; savoir si le choix est
   explicite ou deduit ne change rien a ce qu'elle affiche. Le controle des
   exports l'a signalee comme orpheline avant qu'elle ne prenne l'air de
   servir. */

/** Pose l'attribut sur `html`. Sombre est l'absence d'attribut et non
    `data-theme="sombre"` : c'est le theme de base, celui que la feuille rend
    sans qu'on lui demande rien, et un attribut qui ne selectionne rien serait
    un attribut qu'on finirait par croire necessaire. */
export function appliquerTheme(t: Theme): void {
  if (t === 'clair') document.documentElement.setAttribute('data-theme', 'clair');
  else document.documentElement.removeAttribute('data-theme');
  /* LA BARRE DU NAVIGATEUR SUIT AUSSI, sur telephone. Sans cela, un site
     clair garde une barre d'adresse noire, et la jointure se voit. */
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'clair' ? '#f4f1ef' : '#0c0b09');
}

/** Range le choix et l'applique. */
export function choisirTheme(t: Theme): void {
  try {
    localStorage.setItem(CLE_THEME, t);
  } catch {
    /* Sans stockage, le theme tiendra le temps de la visite. C'est peu, mais
       c'est mieux qu'un bouton qui ne fait rien. */
  }
  appliquerTheme(t);
}
