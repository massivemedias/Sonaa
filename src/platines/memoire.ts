/* LES CUES SE SOUVIENNENT DU MORCEAU. Mika, le 3 octobre 2026 : « garder en
   memoire les cue que je place dans la track ». Le cue principal et les
   quatre cues de chaque morceau sont ranges dans ce navigateur, sous
   l'identifiant Audius du morceau : on le recharge un autre jour, ils sont
   la. Un stockage refuse (navigation privee) n'empeche pas de mixer, il
   empeche seulement de se souvenir. */

export interface Reperes {
  readonly cue: number | null;
  readonly chauds: readonly (number | null)[];
}

export const REPERES_VIDES: Reperes = { cue: null, chauds: [null, null, null, null] };

const cle = (id: string): string => `sonaa-cues-${id}`;

const nombre = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);

export function lireReperes(id: string, stockage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): Reperes {
  try {
    const brut = stockage?.getItem(cle(id));
    if (!brut) return REPERES_VIDES;
    const d = JSON.parse(brut) as { cue?: unknown; chauds?: unknown };
    const chauds = Array.isArray(d.chauds) ? d.chauds.slice(0, 4).map(nombre) : [];
    while (chauds.length < 4) chauds.push(null);
    return { cue: nombre(d.cue), chauds };
  } catch {
    return REPERES_VIDES;
  }
}

export function garderReperes(id: string, r: Reperes, stockage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): void {
  try {
    stockage?.setItem(cle(id), JSON.stringify(r));
  } catch {
    /* stockage plein ou refuse : on mixe sans memoire */
  }
}
