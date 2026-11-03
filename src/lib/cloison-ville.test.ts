/* LA CLOISON ENTRE DEDUIRE ET CHOISIR.
 *
 * Mika, le 2 novembre 2026 : « dans la liste admin faudrait aussi que je
 * puisse voir d'ou les gens viennent [...] quand ils selectionnent dans la
 * liste ». Choisir une ville dans la liste du calendrier (ou dans son profil)
 * est un geste explicite : il enregistre la ville au compte quand la personne
 * est connectee. En revanche, la ville deduite passivement de la connexion
 * (`ouJeSuis` / `deduite`) n'ecrit jamais en base, et le profil garde le
 * bouton pour retirer sa ville a tout moment.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lire = (chemin: string): string =>
  readFileSync(new URL(chemin, import.meta.url), 'utf8');

describe('la ville choisie dans la liste et la ville deduite', () => {
  const calendrier = lire('../atlas/CalendrierPage.tsx');
  const profil = lire('../atlas/ProfilPage.tsx');

  it('le calendrier enregistre la ville quand on la choisit dans la liste', () => {
    expect(calendrier).toContain('enregistrerVilleDattache');
    expect(calendrier).toContain('noterVilleDeSession');
    expect(calendrier).toContain('poserVilleDansLien');
  });

  it('la deduction passive n ecrit jamais la ville d attache', () => {
    expect(calendrier).not.toContain('enregistrerVilleDattache(deduite');
  });

  it('le profil ecrit aussi la ville d attache', () => {
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
