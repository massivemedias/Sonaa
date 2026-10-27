/* LA MESURE, COTE NAVIGATEUR : les pages vues et les secondes ecoutees.
 *
 * Mika, le 27 octobre 2026 : « des stats completes de consultation du site
 * dans mon interface admin », et pour chaque artiste « combien de listens,
 * d'ou viennent ses listeners ». Le navigateur dit ce qu'il voit ; la
 * passerelle (worker, route api/mesure) ajoute le pays, la ville et
 * l'appareil, et un identifiant de visiteur qui change chaque jour. Ni
 * cookie, ni adresse IP gardee, ni identifiant stocke ici : seulement, le
 * temps de l'onglet (sessionStorage), d'ou l'on est arrive.
 *
 * SEULEMENT SUR SONAA.CA : le travail local ne doit pas gonfler les chiffres.
 *
 * L'ENVOI NE BLOQUE RIEN : sendBeacon, en texte simple (pas de requete
 * prealable), qui part meme quand l'onglet se ferme. */

const ADRESSE = 'https://sonaa-sets.massivemedias.workers.dev/api/mesure';
const ACTIF = typeof location !== 'undefined' && location.hostname === 'sonaa.ca';

type Evenement =
  | { type: 'vue'; chemin: string; referent: string; langue: string; entree: boolean }
  | { type: 'ecoute'; set_id: string; secondes: number; referent: string };

function envoyer(evenements: Evenement[]): void {
  if (!ACTIF || evenements.length === 0) return;
  const corps = JSON.stringify({ evenements });
  try {
    if (navigator.sendBeacon?.(ADRESSE, new Blob([corps], { type: 'text/plain' }))) return;
  } catch {
    /* on retombe sur fetch */
  }
  void fetch(ADRESSE, { method: 'POST', body: corps, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => undefined);
}

/** D'ou vient la visite : le site d'avant (sans « www. »), ou ce que dit
    l'adresse (?utm_source=, ?ref=), ou rien pour une visite directe. Lu
    une fois par onglet. */
function referentDeSession(): string {
  try {
    const deja = sessionStorage.getItem('sonaa.referent');
    if (deja !== null) return deja;
    let r = '';
    if (document.referrer) {
      const hote = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (!/(^|\.)sonaa\.ca$/.test(hote)) r = hote;
    }
    const q = new URLSearchParams(location.search);
    const marque = q.get('utm_source') ?? q.get('ref');
    if (marque) r = marque.slice(0, 60);
    sessionStorage.setItem('sonaa.referent', r);
    return r;
  } catch {
    return '';
  }
}

/** La page, sans ce qui la rend unique pour rien (la requete de l'ancre). */
function cheminCourant(): string {
  const h = location.hash;
  if (h.startsWith('#/') && h.length > 2) return (h.split('?')[0] ?? h).slice(0, 200);
  return location.pathname.slice(0, 200) || '/';
}

let dernier = '';
let minuteur = 0;

function noterLaPage(): void {
  const chemin = cheminCourant();
  if (chemin === dernier) return;
  dernier = chemin;
  let entree = false;
  try {
    entree = sessionStorage.getItem('sonaa.entree') === null;
    sessionStorage.setItem('sonaa.entree', '1');
  } catch {
    /* sans stockage, chaque page compte comme une suite */
  }
  envoyer([{ type: 'vue', chemin, referent: referentDeSession(), langue: navigator.language ?? '', entree }]);
}

/** A appeler une fois, au demarrage de l'app. */
export function demarrerMesure(): void {
  if (!ACTIF) return;
  referentDeSession();
  /* Un instant de patience : le pre-rendu pose l'ancre, et une redirection
     d'ancre ne doit pas compter deux pages. */
  window.setTimeout(noterLaPage, 600);
  window.addEventListener('hashchange', () => {
    window.clearTimeout(minuteur);
    minuteur = window.setTimeout(noterLaPage, 600);
  });
}

/** Des secondes ecoutees d'une mixtape, depuis le dernier envoi. */
export function mesurerEcoute(setId: string, secondes: number): void {
  if (secondes < 1) return;
  envoyer([{ type: 'ecoute', set_id: setId, secondes: Math.round(secondes), referent: referentDeSession() }]);
}
