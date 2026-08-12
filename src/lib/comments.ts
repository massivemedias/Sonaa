/* Les fils de discussion par genre.

   MÊME PRINCIPE QUE LE VOTE SUR LES TRACKS : la lecture passe par un simple
   fetch sur la vue publique, le SDK Supabase n'arrive qu'au moment d'écrire.
   Un fil se lit à chaque ouverture de fiche ; imposer 224 ko à qui vient
   seulement écouter serait payer cher un bouton qu'il ne cliquera pas.

   CE QUE LA VUE REND, ET CE QU'ELLE NE REND PAS. `comments_public` porte le
   pseudonyme, le corps, le score et la date. Elle ne porte NI author_id, NI
   le nombre de signalements : le premier permettrait de relier tout ce qu'une
   personne a écrit, le second inviterait à signaler ce qui l'est déjà. Les
   deux ont été fermés au niveau des droits de colonne, et vérifiés. */

import { contributionsActives } from './config.ts';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const enTetes = { apikey: key, Authorization: `Bearer ${key}` };

export interface Commentaire {
  id: string;
  auteur: string;
  parAuteurDuSite: boolean;
  body: string | null;
  masque: boolean;
  score: number;
  createdAt: string;
}

interface LigneBrute {
  id: string;
  auteur: string | null;
  par_auteur_du_site: boolean;
  body: string | null;
  masque: boolean;
  score: number;
  created_at: string;
}

/** Le fil d'un genre, les mieux notés d'abord. Vide si la base est
    injoignable : une fiche sans discussion reste une fiche. */
export async function filDuGenre(genreId: string): Promise<Commentaire[]> {
  if (!contributionsActives) return [];
  try {
    const reponse = await fetch(
      `${url}/rest/v1/comments_public` +
        `?select=id,auteur,par_auteur_du_site,body,masque,score,created_at` +
        `&genre_id=eq.${encodeURIComponent(genreId)}` +
        `&order=score.desc,created_at.desc&limit=100`,
      { headers: enTetes }
    );
    if (!reponse.ok) return [];
    const lignes = (await reponse.json()) as LigneBrute[];
    return lignes.map((l) => ({
      id: l.id,
      auteur: l.auteur ?? 'anonyme',
      parAuteurDuSite: l.par_auteur_du_site,
      body: l.body,
      masque: l.masque,
      score: l.score,
      createdAt: l.created_at
    }));
  } catch {
    return [];
  }
}

/** Vrai quand la modération a fermé les commentaires sur ce genre. L'état est
    public exprès : l'interface cache le champ de saisie au lieu de laisser
    quelqu'un écrire un texte que la base refusera. */
export async function filFerme(genreId: string): Promise<boolean> {
  if (!contributionsActives) return false;
  try {
    const reponse = await fetch(
      `${url}/rest/v1/genre_comment_settings?select=ferme&genre_id=eq.${encodeURIComponent(genreId)}`,
      { headers: enTetes }
    );
    if (!reponse.ok) return false;
    const lignes = (await reponse.json()) as { ferme: boolean }[];
    return lignes[0]?.ferme === true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------- écriture, avec le SDK */

export type ResultatEcriture =
  | { ok: true }
  | { ok: false; raison: 'connexion' | 'quota' | 'ferme' | 'reseau' };

/** Traduit l'erreur de la base en quelque chose de lisible.

    Les messages de quota et de fermeture viennent de `raise exception` dans
    les triggers, avec leur texte en clair : on les reconnaît plutôt que de
    rendre « une erreur est survenue », qui n'aide personne à comprendre
    qu'il a simplement atteint dix messages dans la journée. */
const lireErreur = (message: string): ResultatEcriture => {
  if (/ferm/i.test(message)) return { ok: false, raison: 'ferme' };
  if (/limite atteinte/i.test(message)) return { ok: false, raison: 'quota' };
  return { ok: false, raison: 'reseau' };
};

export async function publierCommentaire(
  genreId: string,
  texte: string
): Promise<ResultatEcriture> {
  const { supabase } = await import('./supabase.ts');
  if (!supabase) return { ok: false, raison: 'reseau' };

  const { data } = await supabase.auth.getUser();
  const utilisateur = data.user;
  if (!utilisateur) return { ok: false, raison: 'connexion' };

  const { error } = await supabase
    .from('comments')
    .insert({ genre_id: genreId, author_id: utilisateur.id, body: texte.trim() });

  if (error) return lireErreur(error.message);
  return { ok: true };
}

/** Retirer son propre commentaire. La base n'autorise que l'auteur et les
    modérateurs ; on efface, on ne réécrit jamais. */
export async function retirerCommentaire(id: string): Promise<ResultatEcriture> {
  const { supabase } = await import('./supabase.ts');
  if (!supabase) return { ok: false, raison: 'reseau' };
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) return lireErreur(error.message);
  return { ok: true };
}

export async function voterCommentaire(
  commentId: string,
  valeur: -1 | 0 | 1
): Promise<ResultatEcriture> {
  const { supabase } = await import('./supabase.ts');
  if (!supabase) return { ok: false, raison: 'reseau' };

  const { data } = await supabase.auth.getUser();
  const utilisateur = data.user;
  if (!utilisateur) return { ok: false, raison: 'connexion' };

  /* Zéro veut dire « je retire ma voix » : on supprime la ligne plutôt que
     d'enregistrer un vote neutre, sinon le quota compterait des abstentions. */
  if (valeur === 0) {
    const { error } = await supabase
      .from('comment_votes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', utilisateur.id);
    if (error) return lireErreur(error.message);
    return { ok: true };
  }

  const { error } = await supabase
    .from('comment_votes')
    .upsert(
      { comment_id: commentId, user_id: utilisateur.id, valeur },
      { onConflict: 'user_id,comment_id' }
    );
  if (error) return lireErreur(error.message);
  return { ok: true };
}

/** Signaler un commentaire. LE SIGNALEMENT NE MASQUE RIEN : il remonte le
    message dans la file de modération, et un humain tranche. */
export async function signalerCommentaire(
  commentId: string,
  motif?: string
): Promise<ResultatEcriture> {
  const { supabase } = await import('./supabase.ts');
  if (!supabase) return { ok: false, raison: 'reseau' };

  const { data } = await supabase.auth.getUser();
  const utilisateur = data.user;
  if (!utilisateur) return { ok: false, raison: 'connexion' };

  const { error } = await supabase.from('comment_reports').upsert(
    {
      comment_id: commentId,
      reporter_id: utilisateur.id,
      motif: motif?.trim() || null
    },
    { onConflict: 'reporter_id,comment_id' }
  );
  if (error) return lireErreur(error.message);
  return { ok: true };
}

/** Date courte, en français, sans dépendance. */
export const dateCourte = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
};
