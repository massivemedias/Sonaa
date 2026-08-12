/* Le service worker, l'état du réseau, et la mémoire des visites.

   Trois choses très simples, réunies ici pour que l'interface n'ait à
   connaître ni l'API du service worker ni le format de ce qu'on stocke. */

import { registerSW } from 'virtual:pwa-register';

/* ------------------------------------------------ mise à jour disponible */

type Ecouteur = (disponible: boolean) => void;
const ecouteurs = new Set<Ecouteur>();
let miseAJourPrete = false;
let appliquer: ((recharger?: boolean) => Promise<void>) | null = null;

export function surMiseAJour(e: Ecouteur): () => void {
  ecouteurs.add(e);
  e(miseAJourPrete);
  return () => ecouteurs.delete(e);
}

/** Applique la version en attente et recharge. Déclenché par la bannière. */
export async function appliquerLaMiseAJour(): Promise<void> {
  await appliquer?.(true);
}

/* SORTIE DE SECOURS : ?nocache=1

   Le service worker sert une version en cache et n'installe la suivante
   qu'apres confirmation. C'est le comportement voulu, mais il a un cout :
   tant que personne ne clique sur la banniere, on regarde une vieille
   version, et on peut juger une correction qu'on n'a jamais chargee.

   Cette porte ouvre la version reelle sans passer par la banniere : elle
   desinscrit le service worker, vide les caches, et recharge sur une URL
   propre. A garder meme quand tout va bien : le jour ou l'on doute de ce
   qu'on regarde, il faut pouvoir en sortir sans ouvrir les outils du
   navigateur. */
export async function purgerSiDemande(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('nocache') !== '1') return false;

  try {
    if ('serviceWorker' in navigator) {
      const enregistres = await navigator.serviceWorker.getRegistrations();
      await Promise.all(enregistres.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const cles = await caches.keys();
      await Promise.all(cles.map((k) => caches.delete(k)));
    }
  } catch {
    /* Si la purge echoue, on recharge quand meme : une page servie par un
       cache recalcitrant vaut mieux qu'une page bloquee sur une erreur. */
  }

  /* On retire le parametre avant de recharger, sinon la purge se rejoue a
     chaque visite et le mode hors ligne ne s'installe jamais. */
  params.delete('nocache');
  const reste = params.toString();
  window.location.replace(
    window.location.pathname + (reste ? '?' + reste : '') + window.location.hash
  );
  return true;
}

export function enregistrerLeServiceWorker(): void {
  /* En développement, aucun service worker : un cache qui survit aux
     rechargements pendant qu'on modifie le code fait perdre plus de temps
     qu'il n'en fait gagner. */
  if (import.meta.env.DEV) return;

  appliquer = registerSW({
    /* On demande au service worker de verifier une mise a jour toutes les
       dix minutes, en plus du controle au chargement. Sans cela, un onglet
       laisse ouvert peut servir la meme version pendant des jours. */
    onRegisteredSW(_url, r) {
      if (!r) return;
      window.setInterval(() => void r.update(), 10 * 60 * 1000);
    },
    onNeedRefresh() {
      miseAJourPrete = true;
      for (const e of ecouteurs) e(true);
    },
    onOfflineReady() {
      /* Rien à annoncer : le site marchait déjà. Une bulle « prêt hors
         ligne » à la première visite interrompt sans rien apprendre. */
    },
  });
}

/* --------------------------------------------------------- état du réseau */

type EcouteurReseau = (enLigne: boolean) => void;
const ecouteursReseau = new Set<EcouteurReseau>();

export function surEtatDuReseau(e: EcouteurReseau): () => void {
  ecouteursReseau.add(e);
  e(navigator.onLine);
  return () => ecouteursReseau.delete(e);
}

if (typeof window !== 'undefined') {
  const dire = () => {
    for (const e of ecouteursReseau) e(navigator.onLine);
  };
  window.addEventListener('online', dire);
  window.addEventListener('offline', dire);
}

/** `navigator.onLine` ment volontiers : il dit vrai dès qu'une interface
    réseau existe, même derrière un portail captif ou un tunnel mort. Pour
    les décisions qui comptent, proposer une track, voter, on vérifie. */
export async function reseauVraimentJoignable(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    await fetch(`${import.meta.env.BASE_URL}brand/favicon-16.png`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------- nombre de visites */

const CLE_VISITES = 'sonaa-visites';
const CLE_INSTALL_REFUSEE = 'sonaa-installation-refusee';

/** Incrémente et rend le compte de visites. Appelé une fois au démarrage. */
export function compterLaVisite(): number {
  try {
    const n = Number(localStorage.getItem(CLE_VISITES) ?? '0') + 1;
    localStorage.setItem(CLE_VISITES, String(n));
    return n;
  } catch {
    return 1; // Navigation privée : on ne proposera jamais l'installation.
  }
}

export function nombreDeVisites(): number {
  try {
    return Number(localStorage.getItem(CLE_VISITES) ?? '0');
  } catch {
    return 0;
  }
}

export function installationRefusee(): boolean {
  try {
    return localStorage.getItem(CLE_INSTALL_REFUSEE) === 'oui';
  } catch {
    return false;
  }
}

/** Un refus est définitif. Redemander à chaque visite est ce qui rend ces
    invites détestées ; on ne pose la question qu'une fois. */
export function memoriserLeRefus(): void {
  try {
    localStorage.setItem(CLE_INSTALL_REFUSEE, 'oui');
  } catch {
    /* sans stockage, on ne peut pas mémoriser : on s'abstiendra plutôt que
       d'insister, la condition de visites ne sera jamais remplie non plus. */
  }
}

/* ------------------------------------------------------- déjà installée ? */

export function dejaInstallee(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    /* Safari iOS n'implémente pas display-mode et expose ce drapeau. */
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function estIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    /* iPadOS se présente comme un Mac depuis la version 13 ; le point
       tactile est ce qui le distingue d'un vrai Mac. */
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
