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

/* LES PROPOSITIONS SONT FERMEES POUR L'INSTANT, ET C'EST UN CHOIX, PAS UNE
   PANNE. Mika, le 7 septembre 2026 : « je vois pas super l'interet de ce
   truc-la pour l'instant, c'etait pour les styles de musique ». Les pages
   #/propositions et #/moderation repondent toujours, le code est intact ;
   ce qui disparait, ce sont les PORTES : le menu du compte, le pied de page,
   les boutons au bas d'une fiche de genre, la section d'A propos. Remettre
   `true` ici rouvre tout d'un coup. */
export const PROPOSITIONS_OUVERTES = false;
