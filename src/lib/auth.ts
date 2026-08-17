/* Connexion par lien magique, et reprise de l'action interrompue.

   CONTRAINTE QUI COMMANDE TOUT CE FICHIER : le service d'envoi de courriels
   est limité à deux messages par heure POUR LE PROJET ENTIER, tous
   utilisateurs confondus. Trois conséquences, toutes assumées ici :

   1. On ne redemande jamais une connexion qu'on peut éviter. La session est
      persistée et renouvelée automatiquement (voir supabase.ts).
   2. On ne perd jamais ce que la personne a écrit. Un formulaire rempli puis
      envoyé au néant parce qu'il fallait se connecter coûterait un second
      lien, donc la moitié du quota horaire. L'intention est mise de côté
      avant l'envoi et rejouée au retour.
   3. Quand la limite est atteinte, on le dit franchement, avec le délai,
      plutôt que d'afficher « une erreur est survenue » devant quelqu'un qui
      réessaiera aussitôt et aggravera la situation.

   Ce fichier ne connaît rien du fournisseur d'envoi. Passer du SMTP intégré
   à Resend se fait entièrement dans la console Supabase : le quota change,
   le code non. C'est pour cela que la limite n'est écrite nulle part ici en
   dur, on relaie le délai que le serveur renvoie. */

import { supabase } from './supabase.ts';

const CLE_INTENTION = 'sonaa-intention-contribution';

/** Ce qu'on était en train de faire quand la connexion s'est imposée. */
export interface Intention {
  readonly route: string;
  readonly brouillon?: unknown;
}

export function memoriserIntention(intention: Intention): void {
  try {
    localStorage.setItem(CLE_INTENTION, JSON.stringify(intention));
  } catch {
    /* Navigation privée, stockage plein : on continue sans reprise. Perdre
       la reprise est regrettable, empêcher la connexion serait pire. */
  }
}

/** Lit l'intention mise de côté et l'efface. Rejouable une seule fois. */
export function reprendreIntention(): Intention | null {
  try {
    const brut = localStorage.getItem(CLE_INTENTION);
    if (!brut) return null;
    localStorage.removeItem(CLE_INTENTION);
    return JSON.parse(brut) as Intention;
  } catch {
    return null;
  }
}

/** Adresse de retour après le clic sur le lien.

    Toujours #/propositions, jamais la page de départ. La raison est que la
    fiche d'un genre n'existe pas dans l'adresse : elle est un état de la vue
    3D, qui ne survit pas au rechargement provoqué par le retour de
    connexion. Revenir « au même endroit » rendrait donc l'atlas nu, la
    modale fermée et le formulaire perdu. La route des propositions, elle,
    est stable : elle sait relire l'intention mise de côté et rouvrir le
    formulaire tel qu'il était. */
function adresseDeRetour(): string {
  return window.location.origin + window.location.pathname + '#/propositions';
}

export type ResultatEnvoi =
  | { ok: true }
  | { ok: false; message: string; limiteAtteinte: boolean };

/** Envoie le lien magique. N'invente pas de compte : `confirm email` étant
    désactivé côté projet, une première connexion crée le compte et la
    suivante le retrouve, sans étape supplémentaire. */
export async function envoyerLienMagique(email: string): Promise<ResultatEnvoi> {
  if (!supabase) {
    return { ok: false, message: 'La connexion n’est pas disponible ici.', limiteAtteinte: false };
  }
  const adresse = email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresse)) {
    return { ok: false, message: 'Cette adresse ne ressemble pas à une adresse courriel.', limiteAtteinte: false };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: adresse,
    options: { emailRedirectTo: adresseDeRetour() },
  });

  if (!error) return { ok: true };

  /* La limite d'envoi porte un code stable ; le message, lui, varie et est
     en anglais. On teste le code d'abord, le texte seulement en repli. */
  const code = (error as { code?: string }).code ?? '';
  const texte = error.message ?? '';
  const limite =
    code === 'over_email_send_rate_limit' ||
    /rate limit/i.test(texte) ||
    /after \d+ seconds/i.test(texte);

  if (limite) {
    const secondes = Number(texte.match(/after (\d+) seconds?/i)?.[1] ?? 0);

    /* Deux limites distinctes remontent sous le même code, et les confondre
       produit une phrase qui se contredit. La courte est un simple
       anti-rebond sur une adresse, de l'ordre de la minute ; la longue est
       le quota d'envoi du site entier. Annoncer « quelques liens par heure »
       à quelqu'un qui doit patienter trente secondes l'inquiète pour rien.
       Dans les deux cas on dit la même chose sur le fond : ce n'est pas de
       sa faute, et voici quand réessayer. */
    const courte = secondes > 0 && secondes <= 120;

    const message = courte
      ? `Un lien vient déjà d'être demandé pour cette adresse. Patientez ` +
        `${delaiEnFrancais(secondes)} avant d'en redemander un, pensez à regarder ` +
        `dans les indésirables, le premier est peut-être déjà arrivé.`
      : `Le service d'envoi de courriels de SONAA est momentanément saturé. Ce n'est pas ` +
        `votre faute : le site entier ne peut expédier qu'un petit nombre de liens de ` +
        `connexion par heure, et le quota vient d'être atteint. Réessayez dans ` +
        `${secondes > 0 ? delaiEnFrancais(secondes) : 'une dizaine de minutes'}. Si vous vous ` +
        `êtes déjà connecté sur cet appareil, votre session est peut-être encore valable : ` +
        `rechargez la page avant de redemander un lien.`;

    return { ok: false, limiteAtteinte: true, message };
  }

  return { ok: false, limiteAtteinte: false, message: texte || "L'envoi a échoué." };
}

function delaiEnFrancais(secondes: number): string {
  if (secondes < 60) return `${secondes} secondes`;
  const minutes = Math.ceil(secondes / 60);
  return minutes === 1 ? 'une minute' : `${minutes} minutes`;
}

/** Nettoie l'URL des paramètres laissés par le retour de connexion.

    supabase-js lit `?code=` au démarrage puis n'en a plus besoin. Le laisser
    traîner ferait qu'un rechargement ou un partage de l'adresse rejouerait
    un code déjà consommé, avec une erreur à la clé. */
export function nettoyerUrlDeRetour(): void {
  const params = new URLSearchParams(window.location.search);
  const parasites = ['code', 'error', 'error_description', 'error_code'];
  if (!parasites.some((p) => params.has(p))) return;
  for (const p of parasites) params.delete(p);
  const reste = params.toString();
  const propre = window.location.pathname + (reste ? `?${reste}` : '') + window.location.hash;
  window.history.replaceState(null, '', propre);
}

/* LA CONNEXION PAR GOOGLE, QUI N'AVAIT JAMAIS ETE APPELEE.

   Le fournisseur est configure cote Supabase depuis le debut, verifie a la
   main dans la console. Cote site, aucun appel : la fonctionnalite existait
   a moitie, et la moitie qui manquait est la seule que le visiteur voit.
   C'est le motif de l'absence qu'on ne remarque pas, sous sa forme la plus
   couteuse, une porte d'entree entiere.

   TROIS DIFFERENCES AVEC LE LIEN MAGIQUE, et elles comptent toutes.

   Pas de quota. Le lien magique est limite a deux envois par heure POUR LE
   PROJET ENTIER, ce qui commande tout le reste de ce fichier. Google n'a pas
   cette contrainte : c'est donc le chemin a proposer EN PREMIER, non par gout
   mais parce que l'autre est une ressource rare.

   Pas de retour differe. Le lien magique quitte le site, passe par une boite
   mail, et revient plus tard. Google revient tout de suite. L'intention est
   quand meme mise de cote AVANT le depart : la redirection est un depart, et
   ce qui n'est pas ecrit avant ne survit pas.

   Le retour vise l'endroit exact ou l'on etait, fragment compris. Sans le
   `hash`, on reviendrait a l'accueil apres s'etre connecte depuis un genre
   ouvert, ce qui est precisement ce qu'on veut eviter. */
export async function connexionGoogle(intention?: Intention): Promise<ResultatEnvoi> {
  const client = supabase;
  if (!client) return { ok: false, limiteAtteinte: false, message: 'Service indisponible.' };

  if (intention) memoriserIntention(intention);

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname + window.location.hash
    }
  });

  if (error) {
    /* SI LE FOURNISSEUR N'EST PAS ACTIVE, Supabase le dit explicitement. On
       relaie le message plutot que de l'aplatir : « une erreur est survenue »
       ferait chercher au mauvais endroit, alors que la cause est une case a
       cocher dans la console. */
    return { ok: false, limiteAtteinte: false, message: error.message };
  }

  /* On ne revient jamais ici en pratique : la redirection a eu lieu. */
  return { ok: true };
}

export async function seDeconnecter(): Promise<void> {
  await supabase?.auth.signOut();
}
