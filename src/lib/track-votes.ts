/* Le vote sur les tracks d'un genre.

   CE QUE LE VOTE FAIT : il réordonne l'affichage d'une liste. Il ne touche
   jamais au corpus, qui vit dans le dépôt et se modifie par commit.

   POURQUOI LA LECTURE N'UTILISE PAS LE SDK. Les scores sont publics et se
   lisent en une requête sur une vue. Charger @supabase/supabase-js pour
   cela imposerait 224 ko à quiconque ouvre une fiche de genre, alors que
   la fiche s'ouvre à chaque clic sur une sphère. Le SDK n'arrive qu'au
   premier vote, c'est-à-dire quand quelqu'un a décidé de participer. */

import { contributionsActives } from './config.ts';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const enTetes = { apikey: key, Authorization: `Bearer ${key}` };

/** Score par identifiant de vidéo, pour un genre. Vide si la base est
    injoignable : une liste non triée reste une liste lisible. */
export async function scoresDuGenre(genreId: string): Promise<Map<string, number>> {
  const resultat = new Map<string, number>();
  if (!contributionsActives) return resultat;
  try {
    const reponse = await fetch(
      `${url}/rest/v1/track_scores?select=video_id,score&genre_id=eq.${encodeURIComponent(genreId)}`,
      { headers: enTetes }
    );
    if (!reponse.ok) return resultat;
    const lignes = (await reponse.json()) as { video_id: string; score: number }[];
    for (const l of lignes) resultat.set(l.video_id, l.score);
  } catch {
    /* Hors ligne ou base absente : aucun score, aucun tri, aucune erreur
       affichée. Le vote est un supplément, pas une condition. */
  }
  return resultat;
}

/* --------------------------------------------------- ce qu'on a soi-même voté */

/* Le SDK range sa session dans localStorage sous une clé dérivée de la
   référence du projet. La lire permet de savoir s'il vaut la peine de
   charger le SDK, SANS le charger. C'est un détail d'implémentation, donc
   fragile : s'il change, cette fonction rendra false, on ne chargera pas le
   SDK par anticipation, et les votes déjà émis n'apparaîtront qu'après le
   premier clic. Dégradé, jamais cassé. */
export function sessionProbable(): boolean {
  if (!contributionsActives) return false;
  try {
    const ref = new URL(url).hostname.split('.')[0] ?? '';
    return localStorage.getItem(`sb-${ref}-auth-token`) !== null;
  } catch {
    return false;
  }
}

/** Les votes de la personne connectée sur ce genre. Charge le SDK. */
export async function mesVotesDuGenre(genreId: string): Promise<Map<string, number>> {
  const resultat = new Map<string, number>();
  if (!contributionsActives) return resultat;
  const { supabase } = await import('./supabase.ts');
  if (!supabase) return resultat;

  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) return resultat;

  const { data, error } = await supabase
    .from('track_votes')
    .select('video_id, value')
    .eq('genre_id', genreId)
    .eq('user_id', uid);
  if (error) return resultat;
  for (const v of data ?? []) resultat.set(v.video_id as string, v.value as number);
  return resultat;
}

/* --------------------------------------------------------------- écriture */

export class NonConnecte extends Error {
  constructor() {
    super('Il faut être connecté pour voter sur les tracks.');
  }
}

/** Pose, change ou retire un vote. `valeur` à 0 signifie retirer. */
export async function voterTrack(
  genreId: string,
  videoId: string,
  valeur: 1 | -1 | 0
): Promise<void> {
  if (!contributionsActives) throw new Error('Le vote n’est pas disponible ici.');
  const { supabase } = await import('./supabase.ts');
  if (!supabase) throw new Error('Le vote n’est pas disponible ici.');

  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) throw new NonConnecte();

  if (valeur === 0) {
    const { error } = await supabase
      .from('track_votes')
      .delete()
      .eq('user_id', uid)
      .eq('genre_id', genreId)
      .eq('video_id', videoId);
    if (error) throw new Error(lisible(error.message));
    return;
  }

  /* upsert : changer d'avis est un geste normal, et la clé primaire
     (personne, genre, track) garantit qu'il n'y a jamais deux voix. */
  const { error } = await supabase
    .from('track_votes')
    .upsert(
      { user_id: uid, genre_id: genreId, video_id: videoId, value: valeur },
      { onConflict: 'user_id,genre_id,video_id' }
    );
  if (error) throw new Error(lisible(error.message));
}

function lisible(message: string): string {
  if (message.includes('Limite atteinte')) return message;
  if (message.includes('row-level security')) {
    return "Ce vote n'est pas permis. Si vous venez d'être déconnecté, reconnectez-vous.";
  }
  if (message.includes('Failed to fetch')) {
    return 'La base est injoignable. Le reste du site fonctionne normalement.';
  }
  return message;
}

/* ------------------------------------------------------------------- tri */

export interface TriableParVote {
  readonly youtubeId: string;
}

