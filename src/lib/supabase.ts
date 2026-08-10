/* Le client Supabase, et la garde qui rend tout le reste facultatif.

   RÈGLE FONDATRICE : SONAA est un site statique qui doit continuer à
   fonctionner entièrement sans base. Les propositions sont un ajout, pas une
   dépendance. Si les variables d'environnement sont absentes — build local
   d'un contributeur, fork, panne de configuration — `supabase` vaut null et
   toute l'interface de contribution disparaît proprement. L'atlas, le
   lecteur et les fiches ne s'en aperçoivent pas.

   La clé est publique par conception : c'est la clé « publishable », faite
   pour vivre dans un bundle. Ce qui protège les données n'est pas son
   secret, ce sont les politiques RLS vérifiées en base. Aucune clé de
   service ne doit exister ici, et un contrôle de CI le vérifie sur dist/. */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { contributionsActives } from './config.ts';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/* Ceinture, en plus du contrôle de CI : si une clé de service se retrouvait
   ici par accident, on refuse de démarrer plutôt que de la publier. Les clés
   secrètes de Supabase commencent par `sb_secret_`, et les anciennes clés de
   service sont des JWT portant le rôle service_role. */
const looksLikeServiceKey =
  key.startsWith('sb_secret_') || (key.startsWith('eyJ') && key.includes('service_role'));

if (looksLikeServiceKey) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY ressemble à une clé de service. Ces clés ne doivent jamais " +
      'atteindre le navigateur : utilisez la clé publishable.'
  );
}

export const supabase: SupabaseClient | null =
  contributionsActives
    ? createClient(url, key, {
        auth: {
          /* Session gardée longtemps et renouvelée toute seule. C'est une
             exigence directe de la limite d'envoi de courriels : chaque
             reconnexion coûte un lien magique, et le quota est de deux par
             heure pour le projet entier. On ne redemande pas de se
             reconnecter tant qu'on peut l'éviter. */
          persistSession: true,
          autoRefreshToken: true,
          /* Le lien magique revient avec ses jetons dans le fragment de
             l'URL. Or SONAA route lui-même sur le fragment (#/propositions).
             On laisse donc supabase-js le lire au démarrage, et c'est
             `auth.ts` qui nettoie ensuite l'URL. */
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      })
    : null;

/* `contributionsActives` vit dans config.ts et non ici : la question « faut-il
   afficher les boutons ? » doit pouvoir se poser sans charger 224 ko de
   client. On le réexporte pour les modules qui chargent déjà le client. */
export { contributionsActives };
