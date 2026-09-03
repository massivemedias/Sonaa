/* LA CLOISON ENTRE REGARDER ET DECLARER.
 *
 * Regarder ce qui se joue a Berlin un mardi soir ne doit pas rendre quelqu'un
 * berlinois dans son profil. Une preference se declare, elle ne se deduit pas
 * d'une consultation. C'est la regle, et elle tient a une seule chose : le
 * calendrier n'appelle pas la fonction qui ecrit en base.
 *
 * ═══ POURQUOI UN TEST QUI LIT DU CODE SOURCE ═══
 *
 * Le montage d'une page complete demanderait un faux client Supabase, un faux
 * stockage local, une fausse passerelle : trois simulations pour verifier une
 * absence. Et une simulation mal faite peut TAIRE l'appel qu'on cherche, ce
 * qui donnerait un test vert sur un defaut present. Le pire resultat
 * possible.
 *
 * Lire les imports repond exactement a la question posee, sans rien simuler :
 * si `CalendrierPage` importe `enregistrerVilleDattache`, quelqu'un a
 * l'intention de l'appeler, et c'est le moment d'en parler.
 *
 * CE QUE CE TEST NE PROUVE PAS, et il faut le dire : qu'aucun chemin
 * detourne n'existe. Un appel passant par un module intermediaire lui
 * echapperait. Il verrouille la porte principale, celle par laquelle la
 * regression arriverait en pratique, le jour ou l'on voudra « juste retenir
 * la ville » sans reflechir a ce que cela engage.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lire = (chemin: string): string =>
  readFileSync(new URL(chemin, import.meta.url), 'utf8');

describe('la ville regardee n est pas la ville declaree', () => {
  const calendrier = lire('../atlas/CalendrierPage.tsx');
  const profil = lire('../atlas/ProfilPage.tsx');

  it('le calendrier n ecrit jamais la ville d attache', () => {
    expect(calendrier).not.toContain('enregistrerVilleDattache');
  });

  it('le calendrier ecrit bien en local et dans l adresse', () => {
    expect(calendrier).toContain('noterVilleDeSession');
    expect(calendrier).toContain('poserVilleDansLien');
  });

  it('le profil est le seul a ecrire la ville d attache', () => {
    expect(profil).toContain('enregistrerVilleDattache');
  });

  it('le profil ne touche ni au stockage local ni a l adresse', () => {
    expect(profil).not.toContain('noterVilleDeSession');
    expect(profil).not.toContain('poserVilleDansLien');
  });

  it('le profil sait effacer la ville, pas seulement l ecrire', () => {
    /* L'effacement est un droit : il doit exister comme geste, dans la page,
       et pas comme une demande a envoyer a quelqu'un. */
    expect(profil).toContain('enregistrerVilleDattache(null)');
  });
});
