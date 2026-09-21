/* LA COQUILLE HTML EST SERVIE A TOUTES LES PROFONDEURS, PAS SEULEMENT A LA
   RACINE.

   `scripts/prerender.ts` recopie la tete d'index.html dans chacune des
   sept cent quarante-six pages pre-rendues, dont `/styles/techno/
   detroit-techno/`. Un chemin ecrit `brand/x.png` s'y resout en
   `/styles/techno/detroit-techno/brand/x.png`, qui n'existe pas.

   TRENTE-TROIS CHEMINS ETAIENT DANS CE CAS le 21 septembre 2026 : les
   favicons, l'icone Apple, les neuf ecrans de demarrage iOS et le logo de
   l'ecran de chargement. Rien ne le signalait, parce que tout allait bien a
   la racine, la seule adresse qu'on ouvre en developpant. Le defaut s'est vu
   sur une fiche de genre, en lisant une console pour une autre raison.

   Ce test lit le fichier tel qu'il est livre : c'est la seule facon de
   verifier une coquille que ni TypeScript ni le rendu React ne traversent. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const COQUILLE = fileURLToPath(new URL('../../index.html', import.meta.url));

describe('la coquille index.html', () => {
  const html = readFileSync(COQUILLE, 'utf8');

  it('ne porte aucun chemin d.actif relatif', () => {
    /* On cherche src= ou href= suivi d'autre chose qu'une barre, un protocole,
       une ancre ou une donnee en ligne. */
    const relatifs = [...html.matchAll(/(?:src|href)="(?!\/|https?:|data:|mailto:|#)([^"]+)"/g)]
      .map((m) => m[1])
      .filter((x) => x !== undefined);
    expect(relatifs).toEqual([]);
  });

  it('sert le logo de l.ecran de chargement depuis la racine', () => {
    expect(html).toContain('src="/brand/sonaa-logo.png"');
    expect(html).not.toContain('src="brand/');
  });
});
