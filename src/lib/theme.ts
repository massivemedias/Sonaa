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
 * ═══ TROIS ETATS, PAS DEUX ═══
 *
 * « sombre », « clair », et l'absence de choix. Sans choix, on suit le
 * reglage du systeme, qui est la meilleure supposition possible : quelqu'un
 * qui a mis son telephone en mode nuit a deja dit ce qu'il voulait, ailleurs.
 * Le troisieme etat n'est pas un defaut de conception, c'est le seul moyen de
 * ne pas contredire une preference deja exprimee.
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

/** Ce que le systeme dit, quand la personne n'a rien dit. */
function themeDuSysteme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'clair' : 'sombre';
  } catch {
    return 'sombre';
  }
}

/** Le theme en vigueur, choisi ou deduit. */
export function themeActuel(): Theme {
  return themeRange() ?? themeDuSysteme();
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
  if (meta) meta.setAttribute('content', t === 'clair' ? '#f7f6f5' : '#0a0c10');
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
