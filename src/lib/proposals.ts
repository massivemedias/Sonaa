/* Accès aux propositions. Une seule porte entre l'interface et la base.

   Les types de ce fichier reproduisent les contraintes SQL (longueurs,
   valeurs permises, minimum de justification). Ce n'est pas de la
   redondance décorative : la base refuse déjà tout ce qui déborde, mais un
   refus de la base arrive après un aller-retour réseau et sous forme de
   message technique. Vérifier ici sert à répondre tout de suite et en
   français. La base reste l'autorité. */

import { supabase } from './supabase.ts';

/* ------------------------------------------------------------------ types */

export type ProposalKind = 'track' | 'genre_edit' | 'filiation';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'merged';

/** Champs de fiche qu'une correction peut viser. Doit rester identique à la
    contrainte proposals_genre_edit_field. */
export const CHAMPS_EDITABLES = [
  'description',
  'machines',
  'labelsHistoriques',
  'labelsActuels',
  'artistesCles',
  'aliases',
  'bpm',
  'note',
] as const;
export type ChampEditable = (typeof CHAMPS_EDITABLES)[number];

export const LIBELLE_CHAMP: Record<ChampEditable, string> = {
  description: 'la description',
  machines: 'les machines',
  labelsHistoriques: 'les labels historiques',
  labelsActuels: 'les labels actuels',
  artistesCles: 'les artistes clés',
  aliases: 'les autres noms',
  bpm: 'le tempo',
  note: 'la note de filiation',
};

export const JUSTIFICATION_MIN = 40;
export const JUSTIFICATION_MAX = 1000;

export interface Proposition {
  readonly id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly kind: ProposalKind;
  readonly genre_id: string;
  readonly payload: Record<string, unknown>;
  readonly status: ProposalStatus;
  readonly score: number;
  readonly moderated_at: string | null;
  readonly moderation_note: string | null;
  readonly author_tag: string;
}

/** Ce que l'utilisateur remplit dans la modale, avant mise en forme. */
export type Brouillon =
  | { kind: 'track'; genreId: string; artist: string; title: string; url: string; justification: string }
  | { kind: 'genre_edit'; genreId: string; field: ChampEditable; value: string; justification: string }
  | { kind: 'filiation'; genreId: string; parentId: string; justification: string };

/* -------------------------------------------------------------- validation */

/** Retourne un message en français, ou null si le brouillon est recevable. */
export function valider(b: Brouillon): string | null {
  const j = b.justification.trim();
  if (j.length < JUSTIFICATION_MIN) {
    const manque = JUSTIFICATION_MIN - j.length;
    return `Il manque ${manque} caractère${manque > 1 ? 's' : ''} à la justification.`;
  }
  if (j.length > JUSTIFICATION_MAX) return `La justification dépasse ${JUSTIFICATION_MAX} caractères.`;

  if (b.kind === 'track') {
    if (!b.artist.trim()) return "Le nom de l'artiste est vide.";
    if (b.artist.trim().length > 120) return "Le nom de l'artiste dépasse 120 caractères.";
    if (!b.title.trim()) return 'Le titre est vide.';
    if (b.title.trim().length > 160) return 'Le titre dépasse 160 caractères.';
    if (b.url.trim().length > 300) return "L'adresse dépasse 300 caractères.";
    if (b.url.trim() && !/^https?:\/\//i.test(b.url.trim())) {
      return "L'adresse doit commencer par http:// ou https://";
    }
  }

  if (b.kind === 'genre_edit') {
    if (!b.value.trim()) return 'La proposition de contenu est vide.';
    if (b.value.trim().length > 2000) return 'La proposition dépasse 2000 caractères.';
  }

  if (b.kind === 'filiation') {
    if (!/^[a-z0-9]{2,40}$/.test(b.parentId)) return 'Le genre parent choisi est invalide.';
  }

  return null;
}

/** Met le brouillon dans la forme exacte qu'attendent les contraintes SQL. */
function enPayload(b: Brouillon): Record<string, string> {
  const justification = b.justification.trim();
  if (b.kind === 'track') {
    const p: Record<string, string> = {
      artist: b.artist.trim(),
      title: b.title.trim(),
      justification,
    };
    /* Champ absent plutôt que chaîne vide : la contrainte de longueur ne
       s'applique qu'aux clés présentes, et une clé vide n'informe personne. */
    if (b.url.trim()) p.url = b.url.trim();
    return p;
  }
  if (b.kind === 'genre_edit') {
    return { field: b.field, value: b.value.trim(), justification };
  }
  return { parent_id: b.parentId, justification };
}

/* ---------------------------------------------------------------- lectures */

/* On lit la VUE, jamais la table : la vue ne porte aucun identifiant de
   compte, seulement un pseudonyme stable. L'anonyme n'a d'ailleurs pas le
   droit de lire author_id, la base le lui refuserait. */

export async function listerPropositions(options?: {
  genreId?: string;
  statut?: ProposalStatus | 'toutes';
}): Promise<Proposition[]> {
  if (!supabase) return [];
  let q = supabase.from('proposals_public').select('*');
  if (options?.genreId) q = q.eq('genre_id', options.genreId);
  if (options?.statut && options.statut !== 'toutes') q = q.eq('status', options.statut);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(messageLisible(error));
  return (data ?? []) as Proposition[];
}

/** Les votes de la personne connectée, pour colorer les boutons. */
export async function mesVotes(propositionIds: string[]): Promise<Map<string, number>> {
  const resultat = new Map<string, number>();
  if (!supabase || propositionIds.length === 0) return resultat;
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) return resultat;
  const { data, error } = await supabase
    .from('votes')
    .select('proposal_id, value')
    .eq('voter_id', uid)
    .in('proposal_id', propositionIds);
  if (error) return resultat;
  for (const v of data ?? []) resultat.set(v.proposal_id as string, v.value as number);
  return resultat;
}

/** Le pseudonyme de la personne connectée, pour reconnaître ses propres
    propositions sans jamais manipuler d'identifiant de compte. */
export async function monPseudonyme(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('my_tag');
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function suisJeModerateur(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_moderator');
  if (error) return false;
  return data === true;
}

/* --------------------------------------------------------------- écritures */

export async function proposer(b: Brouillon): Promise<void> {
  if (!supabase) throw new Error("Les propositions ne sont pas disponibles sur cette version du site.");
  const probleme = valider(b);
  if (probleme) throw new Error(probleme);

  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) throw new Error('Il faut être connecté pour proposer.');

  const { error } = await supabase.from('proposals').insert({
    author_id: uid,
    kind: b.kind,
    genre_id: b.genreId,
    payload: enPayload(b),
  });
  if (error) throw new Error(messageLisible(error));
}

export async function voter(propositionId: string, valeur: 1 | -1): Promise<void> {
  if (!supabase) throw new Error('Le vote n’est pas disponible.');
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) throw new Error('Il faut être connecté pour voter.');

  /* upsert plutôt qu'insert : changer d'avis est un cas normal, et la clé
     primaire (proposition, votant) garantit qu'il n'y a jamais deux voix. */
  const { error } = await supabase
    .from('votes')
    .upsert({ proposal_id: propositionId, voter_id: uid, value: valeur }, { onConflict: 'proposal_id,voter_id' });
  if (error) throw new Error(messageLisible(error));
}

export async function retirerVote(propositionId: string): Promise<void> {
  if (!supabase) return;
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('proposal_id', propositionId)
    .eq('voter_id', uid);
  if (error) throw new Error(messageLisible(error));
}

/** Décision de modération. `accepted` ne publie rien : voir MODERATION.md. */
export async function trancher(
  propositionId: string,
  statut: 'accepted' | 'rejected' | 'merged',
  note: string
): Promise<void> {
  if (!supabase) throw new Error('La modération n’est pas disponible.');
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) throw new Error('Il faut être connecté.');

  const { error } = await supabase
    .from('proposals')
    .update({
      status: statut,
      moderated_by: uid,
      moderated_at: new Date().toISOString(),
      moderation_note: note.trim() || null,
    })
    .eq('id', propositionId);
  if (error) throw new Error(messageLisible(error));
}

/* ------------------------------------------------------------- les erreurs */

/** Traduit les erreurs de la base en phrases utilisables.

    Les deux cas nommés méritent un traitement à part : le quota quotidien
    remonte le texte exact levé par le trigger, et il est déjà en français ;
    les violations de politique RLS ne doivent PAS être expliquées en détail
    à l'utilisateur, ce serait décrire le mécanisme de sécurité. */
function messageLisible(error: { message?: string; code?: string }): string {
  const brut = error.message ?? 'Erreur inconnue.';

  if (brut.includes('Limite atteinte')) return brut;

  if (brut.includes('row-level security') || error.code === '42501') {
    return "Cette action n'est pas permise. Si vous venez d'être déconnecté, reconnectez-vous.";
  }
  if (brut.includes('duplicate key')) {
    return 'Vous avez déjà voté sur cette proposition.';
  }
  if (brut.includes('proposals_justification')) {
    return `La justification doit faire au moins ${JUSTIFICATION_MIN} caractères.`;
  }
  if (brut.includes('violates check constraint')) {
    return "Le contenu envoyé n'a pas la forme attendue.";
  }
  if (brut.includes('Failed to fetch') || brut.includes('NetworkError')) {
    return 'La base est injoignable. Le reste du site fonctionne normalement.';
  }
  return brut;
}
