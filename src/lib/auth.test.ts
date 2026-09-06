/* @vitest-environment jsdom */

/* LE RETOUR DE CONNEXION SE TESTE, OU IL NE SE CROIT PAS.
 *
 * Le defaut repare ici ne se voyait sur aucun ecran : la connexion echouait,
 * l'adresse portait la raison, et le site affichait une page normale. Il n'y
 * avait rien a regarder, donc rien a remarquer. C'est exactement le genre de
 * chose qu'un test attrape et qu'un coup d'oeil ne rattrape jamais.
 *
 * Les deux formes d'adresse sont couvertes parce que Supabase produit les
 * deux : il remplace parfois la route entiere, il la garde parfois. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { echecDansLAdresse, memoriserIntention, phraseDeLEchec, reprendreIntention } from './auth.ts';
import { t } from '../langue/langue.ts';

describe('echecDansLAdresse', () => {
  /* L'ADRESSE REELLE, relevee le 6 septembre 2026 sur un jeton perime. */
  it('lit un echec pose dans le fragment, route remplacee', () => {
    const f =
      '#error=access_denied&error_code=otp_expired' +
      '&error_description=Email+link+is+invalid+or+has+expired&sb=';
    expect(echecDansLAdresse('', f)).toBe('otp_expired');
  });

  it('lit un echec pose apres une route conservee', () => {
    expect(echecDansLAdresse('', '#/propositions?error=access_denied')).toBe('access_denied');
  });

  it('lit un echec pose dans la requete', () => {
    expect(echecDansLAdresse('?error_code=otp_expired', '#/propositions')).toBe('otp_expired');
  });

  it('prefere le code au libelle general', () => {
    expect(echecDansLAdresse('', '#error=access_denied&error_code=otp_expired')).toBe('otp_expired');
  });

  /* CE QUI NE DOIT PAS DECLENCHER LE MESSAGE. Une route ordinaire n'est pas
     un echec, et un retour reussi non plus : `?code=` appartient a
     supabase-js, on n'y touche pas. */
  it('ne voit pas d echec dans une route ordinaire', () => {
    expect(echecDansLAdresse('', '#/calendrier')).toBeNull();
    expect(echecDansLAdresse('', '')).toBeNull();
    expect(echecDansLAdresse('?code=abc123', '#/propositions')).toBeNull();
  });
});

describe('phraseDeLEchec', () => {
  it('nomme le lien perime, qui est le cas courant', () => {
    expect(phraseDeLEchec('otp_expired')).toBe(t.lienPerime);
  });

  it('distingue un refus d une panne', () => {
    expect(phraseDeLEchec('access_denied')).toBe(t.connexionRefusee);
    expect(phraseDeLEchec('server_error')).toBe(t.connexionEchouee);
  });
});

describe('lireRetourDeConnexion', () => {
  beforeEach(() => {
    vi.resetModules();
    window.history.replaceState(null, '', '/');
  });

  it('rend la phrase, efface la trace, et previent par evenement', async () => {
    window.history.replaceState(
      null,
      '',
      '/#error=access_denied&error_code=otp_expired&error_description=x'
    );
    const auth = await import('./auth.ts');
    const vus: string[] = [];
    window.addEventListener(auth.EVENEMENT_RETOUR, (e) => {
      vus.push((e as CustomEvent<string>).detail);
    });

    expect(auth.lireRetourDeConnexion()).toBe(t.lienPerime);
    expect(window.location.hash).toBe('');
    expect(vus).toEqual([t.lienPerime]);
  });

  /* IDEMPOTENTE, ET C'EST LA CONDITION POUR QUE LES DEUX CHEMINS COEXISTENT.
     Le bouton lit au montage, la reprise de session lit en nettoyant : le
     second appel doit rendre la meme phrase sans la rejouer. */
  it('rend la meme phrase au second appel, sans second evenement', async () => {
    window.history.replaceState(null, '', '/#error_code=otp_expired');
    const auth = await import('./auth.ts');
    const vus: string[] = [];
    window.addEventListener(auth.EVENEMENT_RETOUR, () => vus.push('x'));

    expect(auth.lireRetourDeConnexion()).toBe(t.lienPerime);
    expect(auth.lireRetourDeConnexion()).toBe(t.lienPerime);
    expect(vus).toHaveLength(1);
  });

  it('garde la route quand l echec la suivait', async () => {
    window.history.replaceState(null, '', '/#/propositions?error_code=otp_expired');
    const auth = await import('./auth.ts');
    auth.lireRetourDeConnexion();
    expect(window.location.hash).toBe('#/propositions');
  });

  /* LE CHEMIN DE SECOURS DOIT ETRE DECLENCHE, LUI AUSSI : nettoyerUrlDeRetour
     est ce qui s'execute quand la reprise de session arrive la premiere. Elle
     doit lire l'echec AVANT d'effacer, sinon on retombe sur le defaut. */
  it('nettoyerUrlDeRetour lit l echec au lieu de l effacer en silence', async () => {
    window.history.replaceState(null, '', '/?code=abc&error_code=otp_expired');
    const auth = await import('./auth.ts');
    const vus: string[] = [];
    window.addEventListener(auth.EVENEMENT_RETOUR, (e) => {
      vus.push((e as CustomEvent<string>).detail);
    });

    auth.nettoyerUrlDeRetour();
    expect(vus).toEqual([t.lienPerime]);
    expect(window.location.search).toBe('');
  });

  it('ne touche a rien quand la connexion a reussi', async () => {
    window.history.replaceState(null, '', '/?code=abc123#/propositions');
    const auth = await import('./auth.ts');
    expect(auth.lireRetourDeConnexion()).toBeNull();
    expect(window.location.search).toBe('?code=abc123');
    auth.nettoyerUrlDeRetour();
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#/propositions');
  });
});

describe('intention mise de cote', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('se relit une fois puis disparait', () => {
    memoriserIntention({ route: '#/calendrier' });
    expect(reprendreIntention()?.route).toBe('#/calendrier');
    expect(reprendreIntention()).toBeNull();
  });

  /* UNE INTENTION ABANDONNEE N'EST PLUS UNE INTENTION. Sans peremption, qui
     renonce a se connecter un mardi se ferait renvoyer au calendrier le
     jeudi suivant, en ouvrant la page des propositions, sans comprendre. */
  it('ne se rejoue plus au-dela d une heure', () => {
    memoriserIntention({ route: '#/calendrier' });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 61 * 60 * 1000);
    expect(reprendreIntention()).toBeNull();
  });

  it('ignore une intention sans date, donc ecrite par une version anterieure', () => {
    localStorage.setItem('sonaa-intention-contribution', JSON.stringify({ route: '#/calendrier' }));
    expect(reprendreIntention()).toBeNull();
  });
});
