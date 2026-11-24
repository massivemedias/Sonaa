/* LES PETITES LECTURES DE LA MOISSON DES LABELS, a part pour etre testees
   sans lancer la moisson. Voir scripts/moissonner-labels.ts. */

import { succes, type EntreeLabel, type FicheLabel } from '../../src/lib/labels.ts';

/** L'INDEX DE LA RECHERCHE, a part et minuscule : la recherche et la carte des
    maisons meres le chargent a chaque ouverture, uniquement pour les labels
    100 % electroniques. Ecrit par la moisson et par la completion des villes
    (scripts/completer-villes-labels.ts), toujours par cette fonction. */
export function entreesDeLIndex(fiches: readonly FicheLabel[]): EntreeLabel[] {
  return fiches
    .filter((f) => !f.horsElectronique)
    .map((f) => ({
      s: f.slug,
      n: f.nom,
      k: f.cles,
      c: f.n,
      p: f.pays,
      ...(f.quebec ? { q: 1 as const } : {}),
      ...(f.ville ? { v: f.ville } : {}),
      ...(f.latitude != null && f.longitude != null
        ? { g: [Number(f.latitude.toFixed(4)), Number(f.longitude.toFixed(4))] as const }
        : {}),
      a: f.annee,
      l: f.logo?.url ?? null,
      r: succes(f),
    }));
}

/** Les noms sous lesquels Wikidata peut connaitre un label : tel quel, sans
    le mot « Records », avec ou sans espaces autour de l'esperluette. */
export function variantes(nom: string): string[] {
  const v = new Set<string>([nom]);
  v.add(nom.replace(/\s+(Records|Recordings|Music|Label|Records Ltd\.?|Ltd\.?)$/i, ''));
  v.add(nom.replace(/\s*&\s*/g, '&'));
  v.add(nom.replace(/\s*&\s*/g, ' and '));
  return [...v].filter((x) => x.trim().length > 1);
}

/** La presentation de Discogs, debarrassee de son balisage : [a=Nom],
    [l=Label], [url=...]texte[/url], [b]...[/b]. */
export function nettoyerProfil(brut: string): string {
  return brut
    .replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/gi, '$1')
    .replace(/\[(a|l|m|r)=([^\]]+)\]/gi, '$2')
    .replace(/\[(a|l|m|r)\d+\]/gi, '')
    .replace(/\[\/?[a-z]+\]/gi, '')
    .replace(/\r/g, '')
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

/** LES TIRETS LONGS N'ENTRENT PAS SUR LE SITE (regle de Mika, controle
    check:tirets). Wikipedia en met partout : entre deux mots colles, ils
    deviennent un trait d'union (« New York-based ») ; entoures d'espaces,
    une virgule. Ecrits ici en sequences d'echappement, jamais en clair. */
export function sansTirets(texte: string): string {
  return texte
    .replace(/(\S)[\u2013\u2014](\S)/g, '$1-$2')
    .replace(/\s*[\u2013\u2014]\s*/g, ', ')
    .replace(/,\s*,/g, ',');
}
