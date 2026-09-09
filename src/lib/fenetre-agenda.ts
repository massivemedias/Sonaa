/* QUELLE TRANCHE DE TEMPS LE CALENDRIER INTERROGE.
 *
 * ═══ POURQUOI CE N'EST PLUS « UNE SEMAINE, UN MOIS, TROIS MOIS » ═══
 *
 * Ces trois fenetres repondaient a une question que personne ne se pose. On
 * ne se demande pas « qu'est-ce qui se joue dans les trente prochains
 * jours » : on se demande ce qu'il y a CE SOIR, ce qu'il y a EN FIN DE
 * SEMAINE, et sinon on cherche une date. Trois questions distinctes, trois
 * reponses courtes, au lieu d'une seule liste de trois cents lignes ou tout
 * se vaut.
 *
 * ═══ CE QUE « FIN DE SEMAINE » VEUT DIRE, ET LE PIEGE ═══
 *
 * Du vendredi au dimanche. Le piege est le jour ou l'on se trouve : un
 * samedi, « la fin de semaine » n'est pas celle d'apres, c'est celle qu'on
 * est en train de vivre, et elle commence aujourd'hui, pas vendredi dernier.
 * Un dimanche apres-midi non plus n'est pas « dans six jours ». La regle
 * est donc : si l'on est deja dedans, on part d'aujourd'hui ; sinon, du
 * prochain vendredi.
 *
 * ═══ CETTE FONCTION NE LIT PAS L'HORLOGE ═══
 *
 * `maintenant` est un parametre. C'est ce qui permet de verifier le cas du
 * samedi soir et celui du dimanche sans attendre le week-end, et c'est la
 * seule facon de tester du code de dates sans le croire sur parole.
 */

export type Vue = 'aujourdhui' | 'weekend' | 'suite' | 'date' | 'recherche';

export interface Fenetre {
  readonly du: Date;
  readonly au: Date;
}

const AU_MATIN = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const AU_SOIR = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const plusDeJours = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Combien de jours SONAA propose dans le choix de date. Deux mois : au-dela
    Resident Advisor n'annonce presque plus rien, et une liste deroulante de
    trois cents lignes ne se parcourt pas. */
export const JOURS_PROPOSES = 60;

/** La fenetre interrogee pour une vue. `date` n'est lue que pour la vue
    « date » ; ailleurs elle est ignoree. */
export function fenetreDe(vue: Vue, date: string | null, maintenant: Date): Fenetre {
  const aujourdhui = AU_MATIN(maintenant);

  if (vue === 'aujourdhui') {
    return { du: aujourdhui, au: AU_SOIR(aujourdhui) };
  }

  if (vue === 'weekend') {
    /* 0 = dimanche, 5 = vendredi, 6 = samedi. */
    const j = aujourdhui.getDay();
    const dedans = j === 5 || j === 6 || j === 0;
    const debut = dedans ? aujourdhui : plusDeJours(aujourdhui, (5 - j + 7) % 7);
    /* La fin est le dimanche qui suit ce debut. Un dimanche, c'est le jour
       meme : la fin de semaine se termine ce soir. */
    const finDimanche = debut.getDay() === 0 ? debut : plusDeJours(debut, 7 - debut.getDay());
    return { du: debut, au: AU_SOIR(finDimanche) };
  }

  if (vue === 'date' && date) {
    /* Une date arrive en « 2026-09-12 ». Construite composante par
       composante et NON par `new Date('2026-09-12')`, qui serait lue comme
       minuit UTC : a Montreal cela donne la veille a 20 h, donc le mauvais
       jour pendant les quatre cinquiemes de la journee. */
    const [a, m, jr] = date.split('-').map(Number);
    if (a && m && jr) {
      const d = new Date(a, m - 1, jr);
      return { du: AU_MATIN(d), au: AU_SOIR(d) };
    }
  }

  /* LA SUITE ET LA RECHERCHE COMMENCENT AUJOURD'HUI, TOUTES LES DEUX.

     La suite a commence demain pendant un temps, au motif que ce soir avait
     deja son bouton. Mika, le 8 septembre 2026, un mardi soir : « quand je
     cherche je voudrais voir le jour d'aujourd'hui puis les autres jours ».
     Une liste « les jours suivants » qu'on ouvre pour voir la semaine et qui
     commence par demain oblige a revenir sur « Aujourd'hui » pour avoir la
     semaine entiere ; ce n'est pas une economie, c'est un aller-retour. Ce
     soir en tete, puis les quatre-vingt-dix jours : la meme fenetre pour les
     deux vues, et c'est ce qui les rend previsibles. */
  return { du: aujourdhui, au: AU_SOIR(plusDeJours(aujourdhui, 90)) };
}

/** Les jours proposes dans le choix de date, a partir de demain : aujourd'hui
    a son propre bouton. */
export function joursProposes(maintenant: Date, combien = JOURS_PROPOSES): Date[] {
  const debut = AU_MATIN(maintenant);
  return Array.from({ length: combien }, (_, i) => plusDeJours(debut, i + 1));
}

/** « 2026-09-12 », dans le fuseau local et non en UTC. `toISOString` aurait
    decale la date d'un jour tous les soirs a l'ouest de Greenwich. */
export function cleDuJour(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/* ═══ RESIDENT ADVISOR PARLE EN HEURE DE SALLE, SANS FUSEAU ═══

   Leurs dates arrivent en « 2026-09-13T00:00:00.000 », sans Z et sans
   decalage. Ce n'est pas un instant, c'est une heure au mur : 22 h a Berlin
   veut dire 22 h a Berlin, point.

   ON LEUR ENVOYAIT DES INSTANTS UTC, et c'est ce qui decalait tout d'un
   jour. `toISOString()` sur minuit a Montreal donne « 2026-09-12T04:00:00Z » ;
   RA compare cette chaine a ses dates nues, trouve que le 12 a minuit est
   AVANT le seuil, et rend le 13 a la place. Demander le samedi 12 ramenait
   le dimanche 13, ce qui ne se voyait pas tant qu'on demandait des tranches
   de sept jours et sautait aux yeux des qu'on en demandait une seule.

   On leur parle donc dans leur langue : les composantes locales, sans
   fuseau. */
export function sansFuseau(d: Date): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` +
    `T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.000`
  );
}

/** Une chaine que Resident Advisor rend sans fuseau : « ...T21:00:00.000 »,
    ni Z ni decalage. Elle se lit telle quelle, elle ne se convertit pas. */
export const estSansFuseau = (iso: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso) && !/[Zz]|[+-]\d{2}:?\d{2}$/.test(iso);

/** L'heure au mur, lue dans la chaine et non recalculee. « 22 h 00 ». */
export function heureAuMur(iso: string): string | null {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]} h ${m[2]}` : null;
}

/* ═══ UNE GRILLE DE MOIS, PARCE QU'UNE DATE SE CHOISIT SUR UN CALENDRIER ═══

   Le choix du jour etait une liste deroulante de soixante entrees. Elle
   marchait, et elle ne repondait a aucune des questions qu'on se pose en
   choisissant une date : quel jour de la semaine tombe le 12 ? combien de
   samedis reste-t-il ? c'est dans combien de temps ? Un calendrier repond aux
   trois d'un coup d'oeil, parce que la forme porte l'information.

   LA SEMAINE COMMENCE LUNDI. Le calendrier sert a preparer des sorties : la
   fin de semaine doit tenir d'un bloc a droite de la grille, pas etre coupee
   en deux par un dimanche pose en tete. */

export interface Case {
  readonly jour: Date;
  /** Faux pour les jours des mois voisins qui bouchent les coins. */
  readonly duMois: boolean;
}

/** Les semaines d'un mois, du lundi au dimanche, coins compris. Toujours des
    semaines completes : une grille a trous se lit comme une grille cassee. */
export function grilleDuMois(annee: number, mois: number): Case[][] {
  const premier = new Date(annee, mois, 1);
  /* getDay rend 0 pour dimanche ; on veut 0 pour lundi. */
  const decalage = (premier.getDay() + 6) % 7;
  const debut = new Date(annee, mois, 1 - decalage);

  /* ON S'ARRETE QUAND LE MOIS EST COUVERT, ET PAS UN JOUR APRES.
     Premiere version : « tant qu'on n'a pas depasse le 7 du mois suivant ».
     Elle fabriquait une cinquieme semaine entierement etrangere pour fevrier
     2027, qui commence un lundi et compte vingt-huit jours, donc quatre
     semaines pile. Le test l'a vu ; a l'oeil, on ne regarde pas fevrier d'une
     annee non bissextile qui commence un lundi. */
  const finDuMois = new Date(annee, mois + 1, 0);
  const semaines: Case[][] = [];
  const curseur = new Date(debut);
  while (curseur <= finDuMois) {
    const semaine: Case[] = [];
    for (let i = 0; i < 7; i += 1) {
      semaine.push({ jour: new Date(curseur), duMois: curseur.getMonth() === mois });
      curseur.setDate(curseur.getDate() + 1);
    }
    semaines.push(semaine);
  }
  return semaines;
}

/** Vrai quand ce jour peut etre demande : d'aujourd'hui jusqu'au dernier jour
    propose. Au-dela, les sources n'annoncent presque rien, et un jour
    cliquable qui ne rend jamais rien est une promesse en l'air. */
export function jourDemandable(jour: Date, maintenant: Date, combien = JOURS_PROPOSES): boolean {
  const j = AU_MATIN(jour).getTime();
  const debut = AU_MATIN(maintenant).getTime();
  return j >= debut && j <= AU_MATIN(plusDeJours(maintenant, combien)).getTime();
}
