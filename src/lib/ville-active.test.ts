/* LES QUATRE NIVEAUX DE PRIORITE, ET CE QUI SE PASSE QUAND ILS SE CROISENT.
 *
 * Ce fichier existe parce que la regle est simple a enoncer et facile a
 * casser : il suffit d'inverser deux `if` pour qu'un lien partage montre la
 * ville de celui qui le recoit au lieu de celle qu'il promet, et rien a
 * l'ecran ne le dirait. Un test le dit.
 *
 * Aucun reseau, aucun navigateur, aucune base : `resoudreVille` recoit des
 * reponses deja obtenues et rend un verdict. C'est ce qui la rend verifiable
 * par une table de cas. */

import { describe, expect, it } from 'vitest';
import { chercherVilles, resoudreVille, situer, type Ville } from './ville-active.ts';

const v = (slug: string, name: string, pays: string, pop: number, region?: string): Ville => ({
  id: `id-${slug}`,
  slug,
  name,
  name_ascii: name.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  admin_region: region ?? null,
  country_code: pays,
  timezone: 'America/Toronto',
  population: pop,
  ra_area_id: 1,
});

const MONTREAL = v('montreal-ca', 'Montréal', 'CA', 1895211, 'Québec');
const BERLIN = v('berlin-de', 'Berlin', 'DE', 3913644, 'Berlin');
const TOKYO = v('tokyo-jp', 'Tokyo', 'JP', 14264798, 'Tokyo');
const CONNUES = [MONTREAL, BERLIN, TOKYO];

describe('resoudreVille : l ordre de priorite', () => {
  it('1. le lien passe devant tout le reste', () => {
    const r = resoudreVille({
      slugDuLien: 'berlin-de',
      slugDeSession: 'montreal-ca',
      villeDuProfil: TOKYO.id,
      villeDeduite: MONTREAL,
      connues: CONNUES,
    });
    expect(r.ville).toBe(BERLIN);
    expect(r.provenance).toBe('lien');
  });

  it('2. la session passe devant le profil et la deduction', () => {
    const r = resoudreVille({
      slugDeSession: 'berlin-de',
      villeDuProfil: TOKYO.id,
      villeDeduite: MONTREAL,
      connues: CONNUES,
    });
    expect(r.ville).toBe(BERLIN);
    expect(r.provenance).toBe('session');
  });

  it('3. le profil passe devant la deduction', () => {
    const r = resoudreVille({
      villeDuProfil: TOKYO.id,
      villeDeduite: MONTREAL,
      connues: CONNUES,
    });
    expect(r.ville).toBe(TOKYO);
    expect(r.provenance).toBe('profil');
  });

  it('4. la deduction ne sert que si rien n a ete choisi', () => {
    const r = resoudreVille({ villeDeduite: MONTREAL, connues: CONNUES });
    expect(r.ville).toBe(MONTREAL);
    expect(r.provenance).toBe('deduite');
  });

  it('5. sans rien, aucune ville et on le dit', () => {
    const r = resoudreVille({ connues: CONNUES });
    expect(r.ville).toBeNull();
    expect(r.provenance).toBe('aucune');
  });
});

describe('resoudreVille : les slugs qui ne correspondent a rien', () => {
  /* LE CAS QUI COMPTE VRAIMENT. Un lien vers une ville inconnue doit tomber
     sur l'etat vide, PAS sur la ville suivante dans l'ordre : sinon celui qui
     recoit « regarde ce qui se joue a berlin-allemagne » voit les soirees de
     sa propre ville en croyant voir Berlin. */
  it('un slug de lien invalide tombe sur l etat vide, pas sur la session', () => {
    const r = resoudreVille({
      slugDuLien: 'berlin-allemagne',
      slugDeSession: 'montreal-ca',
      villeDeduite: TOKYO,
      connues: CONNUES,
    });
    expect(r.ville).toBeNull();
    expect(r.provenance).toBe('aucune');
  });

  it('un slug de session perime est simplement ignore', () => {
    const r = resoudreVille({
      slugDeSession: 'ville-disparue',
      villeDeduite: MONTREAL,
      connues: CONNUES,
    });
    expect(r.ville).toBe(MONTREAL);
    expect(r.provenance).toBe('deduite');
  });

  it('un identifiant de profil qui ne correspond a rien est ignore', () => {
    const r = resoudreVille({
      villeDuProfil: 'id-dune-ville-supprimee',
      villeDeduite: BERLIN,
      connues: CONNUES,
    });
    expect(r.ville).toBe(BERLIN);
    expect(r.provenance).toBe('deduite');
  });

  it('sans aucune ville connue, rien ne se resout et rien ne casse', () => {
    const r = resoudreVille({ slugDuLien: 'berlin-de', connues: [] });
    expect(r.ville).toBeNull();
    expect(r.provenance).toBe('aucune');
  });
});

describe('chercherVilles', () => {
  const PARIS_FR = v('paris-fr', 'Paris', 'FR', 2103778, 'Île-de-France');
  const PARIS_ON = v('paris-on-ca', 'Paris', 'CA', 12310, 'Ontario');
  const BARCELONE = v('barcelone-es', 'Barcelone', 'ES', 1731649, 'Catalogne');
  const TOUTES = [...CONNUES, PARIS_FR, PARIS_ON, BARCELONE];

  it('ignore les accents dans les deux sens', () => {
    expect(chercherVilles('montreal', TOUTES)).toEqual([MONTREAL]);
    expect(chercherVilles('MONTRÉAL', TOUTES)).toEqual([MONTREAL]);
  });

  it('trie par population decroissante, ce qui separe les homonymes', () => {
    const r = chercherVilles('paris', TOUTES);
    expect(r.map((x) => x.slug)).toEqual(['paris-fr', 'paris-on-ca']);
  });

  it('fait remonter ce qui commence par le terme avant ce qui le contient', () => {
    const r = chercherVilles('bar', TOUTES);
    expect(r[0]).toBe(BARCELONE);
  });

  it('ne cherche pas en dessous de deux caracteres', () => {
    expect(chercherVilles('b', TOUTES)).toEqual([]);
    expect(chercherVilles('', TOUTES)).toEqual([]);
  });

  it('deux lettres qui font un code pays donnent le pays entier', () => {
    const r = chercherVilles('ca', TOUTES);
    expect(r.map((x) => x.slug).sort()).toEqual(['montreal-ca', 'paris-on-ca']);
  });

  it('rend une liste vide plutot que tout, quand rien ne correspond', () => {
    expect(chercherVilles('zzzz', TOUTES)).toEqual([]);
  });
});

describe('situer', () => {
  it('nomme la region quand il y en a une', () => {
    expect(situer(MONTREAL)).toBe('Québec, CA');
  });
  it('se contente du pays sinon', () => {
    expect(situer(v('quelquepart-xx', 'Quelquepart', 'XX', 1))).toBe('XX');
  });
});
