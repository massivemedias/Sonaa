/* Savoir si la contribution est disponible, SANS charger le client.

   Ce module minuscule existe pour une raison mesurée : `supabase.ts` tire
   @supabase/supabase-js, soit 224 ko une fois assemblé. La fiche de genre a
   besoin de savoir s'il faut afficher les boutons de contribution, une
   question à laquelle deux variables d'environnement répondent. Importer
   supabase.ts pour cela imposait le client entier à tout visiteur qui ouvre
   une fiche, y compris à qui vient seulement écouter.

   Le client lui-même n'est donc chargé qu'au moment où quelqu'un ouvre
   vraiment la modale ou la page des propositions. */

export const contributionsActives =
  Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
