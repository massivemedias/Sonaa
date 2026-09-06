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

import { t } from '../langue/langue.ts';
import { supabase } from './supabase.ts';

const CLE_INTENTION = 'sonaa-intention-contribution';

/** Ce qu'on était en train de faire quand la connexion s'est imposée.

    `quand` est posé par `memoriserIntention`, jamais par l'appelant : c'est
    lui qui permet de ne pas rejouer une intention abandonnée. */
export interface Intention {
  readonly route: string;
  readonly brouillon?: unknown;
  readonly quand?: number;
}

/** Au-delà de ce délai, une intention n'est plus une intention, c'est un
    souvenir. Une heure, comme la durée de vie d'un lien de connexion : passé
    ce point la personne a renoncé, et la ramener quelque part qu'elle a
    quitté il y a deux jours serait une surprise, pas un service. */
const DUREE_INTENTION = 60 * 60 * 1000;

export function memoriserIntention(intention: Intention): void {
  try {
    localStorage.setItem(CLE_INTENTION, JSON.stringify({ ...intention, quand: Date.now() }));
  } catch {
    /* Navigation privée, stockage plein : on continue sans reprise. Perdre
       la reprise est regrettable, empêcher la connexion serait pire. */
  }
}

/** Lit l'intention mise de côté et l'efface. Rejouable une seule fois, et
    seulement si elle est encore fraîche. */
export function reprendreIntention(): Intention | null {
  try {
    const brut = localStorage.getItem(CLE_INTENTION);
    if (!brut) return null;
    localStorage.removeItem(CLE_INTENTION);
    const intention = JSON.parse(brut) as Intention;
    const quand = typeof intention.quand === 'number' ? intention.quand : 0;
    if (quand === 0 || Date.now() - quand > DUREE_INTENTION) return null;
    return intention;
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
      /* LA SORTIE AVANT L'EXCUSE.

         Le message expliquait bien la situation, et il laissait la personne
         devant une porte fermée avec un delai. Or il existe une autre porte,
         sans quota, immediate, et elle etait mentionnee nulle part : Google.

         L'ordre des phrases compte donc. Ce qu'on peut FAIRE tout de suite
         vient en premier ; l'explication et le delai viennent apres, pour qui
         tient a l'autre chemin. Un message d'erreur qui commence par une
         excuse fait lire une excuse ; commencer par une issue fait agir. */
      : `Trop de liens de connexion ont été envoyés depuis SONAA dans la dernière ` +
        `heure. Deux solutions : connectez-vous avec Google, c'est immédiat et sans ` +
        `limite, ou réessayez le lien par courriel dans ` +
        `${secondes > 0 ? delaiEnFrancais(secondes) : 'une heure'}. ` +
        `Ce n'est pas votre faute, le quota est celui du site entier. Et si vous vous ` +
        `êtes déjà connecté sur cet appareil, votre session est peut-être encore ` +
        `valable : rechargez la page avant de redemander un lien.`;

    return { ok: false, limiteAtteinte: true, message };
  }

  return { ok: false, limiteAtteinte: false, message: texte || "L'envoi a échoué." };
}

function delaiEnFrancais(secondes: number): string {
  if (secondes < 60) return `${secondes} secondes`;
  const minutes = Math.ceil(secondes / 60);
  return minutes === 1 ? 'une minute' : `${minutes} minutes`;
}

/* ═══ QUAND LA CONNEXION ECHOUE, SUPABASE REPOND DANS LE FRAGMENT ═══

   DEFAUT MESURE LE 6 SEPTEMBRE 2026, sur l'adresse exacte que Supabase
   renvoie pour un lien perime :

     https://sonaa.ca/#error=access_denied&error_code=otp_expired
       &error_description=Email+link+is+invalid+or+has+expired

   On arrivait sur la grille des familles, deconnecte, SANS UN MOT. Le code de
   nettoyage ne lisait que `window.location.search` ; le fragment lui etait
   invisible. Et le routeur ne reconnait pas « #error=... », donc il retombait
   sur sa vue par defaut. La personne voyait une page normale et croyait avoir
   rate son clic.

   CE N'EST PAS UN CAS RARE. Un lien magique ne vaut qu'une fois et il expire.
   Les antivirus de messagerie et les apercus de boite mail suivent les liens
   AVANT que la personne ne clique, ce qui consomme le jeton. Elle clique
   ensuite sur un lien deja brule. C'est le mode d'echec le plus courant de ce
   moyen de connexion, et c'etait celui qu'on ne disait pas.

   DEUX FORMES A LIRE, PAS UNE. Supabase remplace parfois la route entiere
   (« #error=... ») et la garde parfois (« #/propositions?error=... »). On
   traite les deux, plus le cas ou l'erreur arrive dans la requete. */

const CLES_DECHEC = ['error', 'error_code', 'error_description'] as const;

/** Le code d'echec porte par une adresse de retour, ou null. Fonction pure :
    elle prend les deux morceaux d'adresse au lieu de lire l'horloge du
    navigateur, ce qui est la seule facon de la verifier. */
export function echecDansLAdresse(recherche: string, fragment: string): string | null {
  const dans = (brut: string): URLSearchParams | null => {
    const net = brut.replace(/^[#?]/, '');
    if (net === '') return null;
    const point = net.indexOf('?');
    if (point >= 0) return new URLSearchParams(net.slice(point + 1));
    /* Un fragment qui commence par « / » est une route, pas des parametres. */
    return net.startsWith('/') ? null : new URLSearchParams(net);
  };
  for (const source of [dans(recherche), dans(fragment)]) {
    if (!source) continue;
    const code = source.get('error_code') ?? source.get('error');
    if (code) return code;
  }
  return null;
}

/** La phrase a montrer pour un code d'echec. On ne relaie pas
    `error_description` : elle est en anglais et decrit le protocole, pas la
    situation. */
export function phraseDeLEchec(code: string): string {
  if (code === 'otp_expired') return t.lienPerime;
  if (code === 'access_denied') return t.connexionRefusee;
  return t.connexionEchouee;
}

/** L'evenement qui porte l'echec jusqu'au panneau de connexion, pour le cas
    ou le nettoyage arrive apres que le bouton se soit monte. */
export const EVENEMENT_RETOUR = 'sonaa:retour-connexion';

let phraseDeRetour: string | null = null;
let retourDejaLu = false;

/** Lit l'echec dans l'adresse, l'efface, et le rend. Idempotente : appelable
    par le bouton au montage ET par la reprise de session, dans n'importe quel
    ordre, sans que la personne voie le message deux fois ni zero fois. */
export function lireRetourDeConnexion(): string | null {
  if (retourDejaLu) return phraseDeRetour;
  retourDejaLu = true;

  const code = echecDansLAdresse(window.location.search, window.location.hash);
  if (!code) return null;

  phraseDeRetour = phraseDeLEchec(code);
  effacerLesTracesDechec();
  window.dispatchEvent(new CustomEvent(EVENEMENT_RETOUR, { detail: phraseDeRetour }));
  return phraseDeRetour;
}

function effacerLesTracesDechec(): void {
  const params = new URLSearchParams(window.location.search);
  for (const c of CLES_DECHEC) params.delete(c);

  /* Le fragment : on garde la route s'il y en avait une, on le vide sinon.
     Laisser « #error=... » ferait qu'un rechargement rejoue le message pour
     une connexion qui n'est plus en cours. */
  const brut = window.location.hash.replace(/^#/, '');
  const point = brut.indexOf('?');
  let fragment = window.location.hash;
  if (point >= 0) fragment = `#${brut.slice(0, point)}`;
  else if (brut !== '' && !brut.startsWith('/')) fragment = '';

  const reste = params.toString();
  window.history.replaceState(
    null,
    '',
    window.location.pathname + (reste ? `?${reste}` : '') + fragment
  );
}

/** Nettoie l'URL des paramètres laissés par le retour de connexion.

    supabase-js lit `?code=` au démarrage puis n'en a plus besoin. Le laisser
    traîner ferait qu'un rechargement ou un partage de l'adresse rejouerait
    un code déjà consommé, avec une erreur à la clé.

    ON LIT L'ECHEC AVANT D'EFFACER QUOI QUE CE SOIT : cette fonction s'appelle
    depuis la reprise de session, qui peut arriver avant le montage du bouton
    de connexion. Effacer sans lire, c'est ce qui rendait l'echec muet. */
export function nettoyerUrlDeRetour(): void {
  lireRetourDeConnexion();
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code')) return;
  params.delete('code');
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

  /* ON NE PART PLUS EN AVEUGLE, ET VOICI POURQUOI.

     Constate sur capture : le bouton envoyait sur une page blanche affichant
     {"code":400,"error_code":"validation_failed","msg":"Unsupported provider:
     missing OAuth secret"}. Du JSON brut, sans retour possible, pour une
     personne qui voulait juste se connecter.

     LE CODE DE CE FICHIER CROYAIT POURTANT GERER LE CAS : il relayait
     `error.message` en commentant qu'une case a cocher manquait dans la
     console. Mais `signInWithOAuth` ne fait pas de requete, il fait une
     NAVIGATION. Le 400 arrive donc dans la barre d'adresse, pas dans une
     variable, et ce `if (error)` n'a jamais pu se declencher. Une gestion
     d'erreur qui ne s'execute sur aucun chemin reel n'est pas une gestion
     d'erreur.

     On demande donc l'adresse SANS partir, on la sonde, et on ne part que si
     elle repond. Le serveur autorise la lecture de sa reponse depuis notre
     origine, verifie en-tetes en main : le pre-vol peut donc lire l'echec au
     lieu de le subir. */
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname + window.location.hash,
      skipBrowserRedirect: true
    }
  });

  if (error) return { ok: false, limiteAtteinte: false, message: error.message };
  if (!data?.url) {
    return {
      ok: false,
      limiteAtteinte: false,
      message: 'La connexion Google est indisponible. Utilisez votre courriel.'
    };
  }

  try {
    /* `redirect: 'manual'` : quand tout va bien le serveur repond une
       redirection vers Google, que le navigateur nous rend opaque. C'est
       precisement le signal qu'on cherche, et il se distingue sans ambiguite
       d'un 400 lisible. */
    const sonde = await fetch(data.url, { method: 'GET', redirect: 'manual', credentials: 'omit' });
    if (sonde.type !== 'opaqueredirect' && sonde.status >= 400) {
      let message = 'La connexion Google n’est pas disponible. Utilisez votre courriel ci-dessous.';
      try {
        const corps = (await sonde.json()) as { msg?: string };
        if (typeof corps.msg === 'string' && corps.msg.includes('OAuth')) {
          message = t.googleNonConfiguree;
        }
      } catch {
        /* Reponse illisible : le message general suffit, il dit quoi faire. */
      }
      return { ok: false, limiteAtteinte: false, message };
    }
  } catch {
    /* PANNE DE RESEAU PENDANT LA SONDE : on laisse partir quand meme. La
       sonde est une precaution, pas une porte. La transformer en condition
       d'acces ferait qu'un reseau capricieux empecherait une connexion qui
       aurait marche. */
  }

  window.location.assign(data.url);
  return { ok: true };
}

export async function seDeconnecter(): Promise<void> {
  await supabase?.auth.signOut();
}
