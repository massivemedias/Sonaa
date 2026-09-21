/* CE QUI SE TESTE ICI EST LA LECTURE DE LA REPONSE, pas l'appel.
   Un modele repond parfois avec une phrase avant le tableau, dans un bloc de
   code, ou en oubliant une entree : chacun de ces cas a coute une page vide
   quelque part, et aucun ne doit faire tomber la moisson. */

import { describe, expect, it } from 'vitest';
import {
  consigne,
  consigneCorps,
  demande,
  lireReponse,
  lireReponseCorps,
  MOTS_GARDES,
  type ATraduire,
} from './traduire.ts';

const lot: ATraduire[] = [
  { lien: 'https://a.test/1', titre: 'Warehouse label drops four-on-the-floor EP', resume: 'A new EP.' },
  { lien: 'https://a.test/2', titre: 'Second one', resume: 'Another one.' },
];

describe('la consigne', () => {
  it('nomme les mots a ne pas traduire', () => {
    const c = consigne();
    for (const mot of ['label', 'warehouse', 'four-on-the-floor', 'BPM', 'EP']) {
      expect(MOTS_GARDES).toContain(mot);
      expect(c).toContain(mot);
    }
  });

  it('interdit le tiret cadratin, comme le reste du depot', () => {
    expect(consigne()).toContain('cadratin');
    /* LE CARACTERE EST CONSTRUIT, PAS ECRIT : le controle des tirets lit ce
       fichier comme les autres, et un cadratin en clair ici ferait echouer la
       publication pour une verification qui interdit justement le cadratin. */
    expect(consigne()).not.toContain(String.fromCharCode(0x2014));
  });

  it('envoie des numeros et pas des adresses', () => {
    const d = demande(lot);
    expect(d).toContain('"i": 0');
    expect(d).not.toContain('a.test');
  });
});

describe('la lecture de la reponse', () => {
  it('lit un tableau propre', () => {
    const rendu = lireReponse(
      '[{"i":0,"titre":"Un label warehouse sort un EP four-on-the-floor","resume":"Un nouvel EP."},{"i":1,"titre":"Le second","resume":"Encore un."}]',
      lot
    );
    expect(rendu.size).toBe(2);
    expect(rendu.get('https://a.test/1')?.titre).toBe('Un label warehouse sort un EP four-on-the-floor');
    expect(rendu.get('https://a.test/2')?.resume).toBe('Encore un.');
  });

  it('lit un tableau enveloppe dans du bavardage ou un bloc de code', () => {
    const rendu = lireReponse(
      'Voici la traduction :\n```json\n[{"i":0,"titre":"Titre","resume":"Resume"}]\n```\nVoila.',
      lot
    );
    expect(rendu.get('https://a.test/1')?.titre).toBe('Titre');
  });

  it('rend une liste vide plutot que de jeter, quand la reponse n est pas du JSON', () => {
    expect(lireReponse('je ne peux pas traduire cela', lot).size).toBe(0);
    expect(lireReponse('', lot).size).toBe(0);
    expect(lireReponse('[{cassé', lot).size).toBe(0);
  });

  it('ignore un numero qui ne designe aucune entree du lot', () => {
    const rendu = lireReponse('[{"i":9,"titre":"Perdu","resume":""},{"i":0,"titre":"Bon","resume":""}]', lot);
    expect(rendu.size).toBe(1);
    expect(rendu.get('https://a.test/1')?.titre).toBe('Bon');
  });

  it('refuse un titre vide, accepte un resume vide', () => {
    const rendu = lireReponse('[{"i":0,"titre":"   ","resume":"x"},{"i":1,"titre":"Bon","resume":""}]', lot);
    expect(rendu.has('https://a.test/1')).toBe(false);
    expect(rendu.get('https://a.test/2')).toEqual({ titre: 'Bon', resume: '' });
  });

  it('accepte une reponse partielle : ce qui manque restera en anglais', () => {
    const rendu = lireReponse('[{"i":1,"titre":"Seul","resume":""}]', lot);
    expect(rendu.size).toBe(1);
    expect(rendu.has('https://a.test/1')).toBe(false);
  });
});

describe('la traduction du corps', () => {
  it('partage le glossaire avec les titres', () => {
    const c = consigneCorps();
    for (const mot of MOTS_GARDES) expect(c).toContain(mot);
  });

  it('lit un tableau de chaines complet', () => {
    expect(lireReponseCorps('["Un", "Deux", "Trois"]', 3)).toEqual(['Un', 'Deux', 'Trois']);
  });

  /* UNE TRADUCTION PARTIELLE EST PIRE QUE PAS DE TRADUCTION : l'article
     s'afficherait amoute sans que personne le sache. */
  it('refuse une reponse qui a perdu ou fusionne des blocs', () => {
    expect(lireReponseCorps('["Un", "Deux"]', 3)).toEqual([]);
    expect(lireReponseCorps('["Un", "", "Trois"]', 3)).toEqual([]);
    expect(lireReponseCorps('pas du json', 3)).toEqual([]);
    expect(lireReponseCorps('{"a":1}', 3)).toEqual([]);
  });

  it('accepte un tableau enveloppe de bavardage', () => {
    expect(lireReponseCorps('Voici :\n```json\n["Un"]\n```', 1)).toEqual(['Un']);
  });
});
