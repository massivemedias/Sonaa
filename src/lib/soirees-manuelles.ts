/* LES SOIREES AJOUTEES A LA MAIN.
 *
 * ═══ POURQUOI CETTE TABLE EXISTE ═══
 *
 * Resident Advisor ne couvre pas tout, et ce n'est pas une supposition : la
 * comparaison avec le Facebook de Mika, faite le 5 septembre 2026, a trouve
 * six soirees electroniques montrealaises absentes de RA, dont une date de
 * Nina Kraviz a l'Olympia. Une soiree fetish qui passe de la techno, une
 * salle qui n'est pas dans leur reseau, un promoteur qui ne poste que sur
 * Facebook : leur ligne editoriale a des bords, et ces bords sont pleins de
 * musique.
 *
 * Cette table est le premier adaptateur du pipeline a plusieurs sources : la
 * source manuelle. Elle vient AVANT les adaptateurs reseau, a dessein. Elle
 * prouve que la fusion marche, que l'affichage tient avec deux origines, et
 * que la deduplication a un endroit ou s'exercer, tout cela sans dependre
 * d'un site tiers qui peut changer de forme.
 *
 * ═══ CE QUI EST ECRIT, ET PAR QUI ═══
 *
 * Lecture publique des soirees publiees. Ecriture reservee aux moderateurs,
 * par la meme fonction `is_moderator()` que les propositions. Le calendrier
 * n'est pas un mur ouvert : une soiree fausse ou une publicite y ferait plus
 * de degats qu'une soiree manquante.
 *
 * `source` et `source_ref` portent d'ou vient l'entree. Pour une saisie a la
 * main, `main` et rien. Pour ce qui viendra d'un adaptateur, le nom de la
 * source et l'identifiant chez elle, avec un index unique dessus : c'est ce
 * qui empeche d'ajouter deux fois la meme soiree a deux synchronisations
 * d'ecart.
 */

import { supabase } from './supabase.ts';

export interface SoireeManuelle {
  readonly id: string;
  readonly ville_id: string;
  readonly titre: string;
  readonly debut: string;
  readonly lieu: string | null;
  readonly artistes: string[];
  readonly genres: string[];
  readonly lien: string | null;
  readonly affiche: string | null;
  readonly source: string;
  readonly source_ref: string | null;
  readonly note: string | null;
  readonly publiee: boolean;
  /* CE QUE LA SOURCE DIT, ET QU'ON GARDE MAINTENANT. Le calendrier n'avait
     que de quoi renvoyer ailleurs ; il a de quoi repondre sur place. */
  readonly description: string | null;
  readonly fin: string | null;
  readonly adresse: string | null;
  readonly prix: string | null;
  readonly organisateur: string | null;
}

/** Ce qu'on envoie pour creer ou modifier. L'identifiant et la date de
    creation appartiennent a la base. */
export interface Brouillon {
  ville_id: string;
  titre: string;
  debut: string;
  lieu?: string | null;
  artistes?: string[];
  genres?: string[];
  lien?: string | null;
  affiche?: string | null;
  source?: string;
  source_ref?: string | null;
  note?: string | null;
  publiee?: boolean;
}

/* UNE SEULE CHAINE, SANS CONCATENATION. Coupee en deux avec un `+`, elle
   cesse d'etre un litteral, et le typage de supabase-js, qui lit la liste des
   colonnes DANS le texte, retombe sur un type d'erreur. Le compilateur l'a
   dit tout de suite ; la ligne est longue, et c'est le prix. */
const CHAMPS =
  'id, ville_id, titre, debut, lieu, artistes, genres, lien, affiche, source, source_ref, note, publiee, description, fin, adresse, prix, organisateur';

/** Les soirees d'une ville sur une tranche. Rend un tableau vide quand la
    base est indisponible : le calendrier doit continuer a montrer Resident
    Advisor meme si Supabase tombe, sinon une panne de notre base ferait
    disparaitre une source qui, elle, repond. */
export async function soireesManuelles(
  villeId: string,
  du: Date,
  au: Date
): Promise<SoireeManuelle[]> {
  if (!supabase) return [];
  /* PUBLIEES SEULEMENT, ET C'EST DIT ICI, PAS SEULEMENT PAR LA BASE.

     DEFAUT VU PAR MIKA LE 7 SEPTEMBRE 2026 : trois cent trente-huit fiches
     Eventbrite mises de cote (un cirque, un hommage a Ginette Reno, un
     quartet de jazz) apparaissaient dans SON calendrier et pas dans celui
     du public. La regle de la base cache les fiches non publiees aux
     anonymes, mais un moderateur voit tout : sans cette clause, le
     calendrier d'un moderateur n'est pas le calendrier. La lecture
     administrative, en dessous, garde son acces a ce qui est mis de cote. */
  const { data, error } = await supabase
    .from('soirees_manuelles')
    .select(CHAMPS)
    .eq('ville_id', villeId)
    .eq('publiee', true)
    .gte('debut', du.toISOString())
    .lte('debut', au.toISOString())
    .order('debut', { ascending: true });
  if (error) return [];
  return (data ?? []) as SoireeManuelle[];
}

/** Toutes celles d'une ville, publiees ou non. Pour le panneau d'administration,
    qui doit voir ce qu'il a mis de cote. */
export async function toutesLesSoireesManuelles(villeId: string): Promise<SoireeManuelle[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('soirees_manuelles')
    .select(CHAMPS)
    .eq('ville_id', villeId)
    .order('debut', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SoireeManuelle[];
}

export async function ajouterSoiree(b: Brouillon): Promise<SoireeManuelle> {
  if (!supabase) throw new Error('base indisponible');
  const { data: session } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('soirees_manuelles')
    .insert({ ...b, ajoutee_par: session.user?.id ?? null })
    .select(CHAMPS)
    .single();
  if (error) throw new Error(error.message);
  return data as SoireeManuelle;
}

/* PAS DE `modifierSoiree` TANT QUE RIEN NE MODIFIE. Elle avait ete ecrite
   d'avance, avec sa signature et son message d'erreur, et le controle des
   exports l'a signalee : personne ne l'appelait. Une fonction exportee que
   rien n'appelle a l'air de servir, et c'est ainsi qu'on croit disposer
   d'une capacite qu'on n'a pas. Corriger une soiree se fait aujourd'hui en
   la retirant et en la reposant ; le jour ou un formulaire d'edition
   existera, elle reviendra avec lui. */

export async function supprimerSoiree(id: string): Promise<void> {
  if (!supabase) throw new Error('base indisponible');
  const { error } = await supabase.from('soirees_manuelles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
