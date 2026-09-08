/* L'HEURE SAISIE EST CELLE DE LA SALLE, PAS CELLE DE LA MACHINE.

   Quelqu'un qui depose depuis Paris une soiree a Montreal ecrit « 22:00 »
   en pensant a Montreal. `new Date('2026-09-12T22:00')` lirait cette heure
   dans le fuseau de sa machine, et la soiree s'afficherait a 16 h pour les
   Montrealais. On construit donc l'instant a partir du fuseau de la ville. */

/** L'instant UTC qui correspond a cette heure locale dans ce fuseau.

    On part d'une estimation (l'heure lue comme si elle etait UTC), on
    demande au fuseau comment il l'affiche, et on corrige de l'ecart. Une
    seule correction suffit tant que le decalage ne change pas entre
    l'estimation et le resultat, ce qui n'arrive qu'a l'heure exacte d'un
    changement d'heure, une nuit par semestre, a deux heures du matin. */
export function instantLocal(jour: string, heure: string, fuseau: string): Date {
  const [a, m, j] = jour.split('-').map(Number);
  const [h, mn] = heure.split(':').map(Number);
  const estime = Date.UTC(a ?? 2026, (m ?? 1) - 1, j ?? 1, h ?? 22, mn ?? 0);
  const parties = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuseau,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(estime));
  const v = (type: string): number => Number(parties.find((p) => p.type === type)?.value ?? 0);
  const lu = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour') % 24, v('minute'));
  return new Date(estime - (lu - estime));
}
