/* LES COMMENTAIRES DES GENRES.

   Leur fil, leur vote et leur signalement vivaient dans la carte en trois
   dimensions, supprimee le 9 novembre 2026 (ADR-116). La table `comments`
   reste en base, et l'administration continue de les moderer : il ne reste
   ici que ce qu'elle emploie. */

/** « 9 nov. 2026 » : la date courte d'un commentaire. */
export const dateCourte = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
};
