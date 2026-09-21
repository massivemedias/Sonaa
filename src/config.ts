/* LES DRAPEAUX QUE LE PRE-RENDU DOIT LIRE AUSSI.
 *
 * ═══ POURQUOI CE FICHIER N'EST PAS src/lib/config.ts ═══
 *
 * Il existe deja un module de drapeaux, `src/lib/config.ts`, et il porte
 * `PROPOSITIONS_OUVERTES`, qui fait exactement le meme genre de travail.
 * Celui-la lit `import.meta.env`, une forme que Vite remplace a la
 * construction et qui n'existe pas dans Node.
 *
 * `scripts/prerender.ts` tourne sous Node, et il importe deja `src/`. Un
 * drapeau qui decide a la fois de ce que l'application affiche ET de ce que
 * le pre-rendu ecrit doit donc vivre dans un module sans `import.meta.env`,
 * sinon le simple fait de l'importer fait tomber la construction.
 *
 * C'est la seule raison de la separation, et elle est technique. Le jour ou
 * `src/lib/config.ts` n'aura plus besoin de l'environnement, les deux
 * fusionneront.
 */

/* ═══ LA COUCHE MARCHANDE EST ECRITE, PAS OUVERTE ═══
 *
 * Tracks, le panier, les routes, les pages pre-rendues et le magasin
 * persistant existent depuis la phase 0 du 17 septembre 2026. Rien de tout
 * cela ne se supprime : ce qui se ferme, ce sont les PORTES, comme pour
 * `PROPOSITIONS_OUVERTES` avant lui. Le code reste, les routes repondent, le
 * panier garde ce qu'il contient, et remettre `true` ici rouvre tout d'un
 * coup.
 *
 * TANT QUE C'EST `false` : Tracks et Panier sortent du menu du bureau, de la
 * barre du telephone, du bouton « Plus » et du pied de page ; les deux
 * adresses rendent une page « Bientot » ; leurs pages pre-rendues passent en
 * noindex et sortent du plan du site et d'IndexNow.
 *
 * CE QUI LE REMET A `true`, ET LES DEUX CONDITIONS SONT CUMULATIVES :
 *
 *   1. Le compte Stripe Connect est ACTIF, pas seulement cree. Sans lui
 *      aucune vente n'est encaissable, et une page qui annonce une vente
 *      qu'on ne peut pas encaisser est une promesse qu'on ne tient pas.
 *   2. Les conditions de vente sont EN LIGNE et ecrites, pas seulement
 *      structurees. Les trois pages legales existent depuis le 17 septembre
 *      2026 avec leurs titres et sans leur texte ; vendre avant qu'elles
 *      soient remplies expose Mika personnellement.
 *
 * Voir docs/adr/ADR-084-couche-marchande.md, section « La mise en ligne est
 * conditionnee a un drapeau ». */
export const MARCHAND_ACTIF = false;
