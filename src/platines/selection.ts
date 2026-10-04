/* LA SELECTION DU DJ : d'ou viennent les morceaux qu'il a sous les yeux
 * (Audius ou ses fichiers), quel style, quel dossier. Le navigateur la
 * change ; les petites playlists des deux decks la suivent. Elle est gardee
 * dans le navigateur, et chaque changement est annonce a toute la page. */

import { useEffect, useState } from 'react';
import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import { morceauxDuStyle } from './audius.ts';
import { ecouterCaisse, lireCaisse } from './caisse.ts';
import type { Morceau } from './morceau.ts';

export type Source = 'audius' | 'fichiers';
/* Le dossier ouvert : TOUS montre la caisse entiere, VRAC les morceaux sans
   dossier, et sinon le nom du dossier. */
export const TOUS = '*';
export const VRAC = '';
const STYLE_PAR_DEFAUT = 'house/usdeephouse';

export interface Selection {
  readonly source: Source;
  readonly style: string;
  readonly dossier: string;
}

const CLES: Readonly<Record<keyof Selection, string>> = {
  source: 'sonaa-platines-source',
  style: 'sonaa-platines-style',
  dossier: 'sonaa-platines-dossier',
};
const CHANGEMENT = 'sonaa-platines-selection';

function lu(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function lireSelection(): Selection {
  return {
    source: lu(CLES.source) === 'fichiers' ? 'fichiers' : 'audius',
    style: lu(CLES.style) ?? STYLE_PAR_DEFAUT,
    dossier: lu(CLES.dossier) ?? TOUS,
  };
}

export function changerSelection(partiel: Partial<Selection>): void {
  for (const [cle, valeur] of Object.entries(partiel) as [keyof Selection, string][]) {
    try {
      localStorage.setItem(CLES[cle], valeur);
    } catch {
      /* rien a retenir : la page garde au moins l'annonce */
    }
  }
  window.dispatchEvent(new Event(CHANGEMENT));
}

export function useSelection(): Selection {
  const [s, setS] = useState<Selection>(lireSelection);
  useEffect(() => {
    const relire = (): void => setS(lireSelection());
    window.addEventListener(CHANGEMENT, relire);
    return () => window.removeEventListener(CHANGEMENT, relire);
  }, []);
  return s;
}

/* Les styles de l'atlas, par famille, comme dans le menu. */
export const STYLES = FAMILIES.map((f, fi) => ({
  famille: f,
  genres: (STRUCTURES[fi]?.genres ?? []).map((g) => ({ cle: `${f.id}/${g.id}`, famille: f.id, nom: g.label })),
}));
export const styleDe = (cle: string) => STYLES.flatMap((s) => s.genres).find((g) => g.cle === cle);

/** Les morceaux Audius d'un style ; null pendant qu'ils arrivent. */
export function useMorceauxDuStyle(cle: string | null): readonly Morceau[] | null {
  const [liste, setListe] = useState<readonly Morceau[] | null>(null);
  useEffect(() => {
    let vivant = true;
    setListe(null);
    const style = cle ? styleDe(cle) : undefined;
    if (!style) {
      setListe([]);
      return;
    }
    morceauxDuStyle(style.famille, style.nom)
      .then((l) => {
        if (vivant) setListe(l);
      })
      .catch(() => {
        if (vivant) setListe([]);
      });
    return () => {
      vivant = false;
    };
  }, [cle]);
  return liste;
}

/** La caisse de l'appareil, relue a chaque changement ; null au depart. */
export function useCaisse(): readonly Morceau[] | null {
  const [caisse, setCaisse] = useState<readonly Morceau[] | null>(null);
  useEffect(() => {
    let vivant = true;
    const relire = (): void => {
      lireCaisse()
        .then((l) => {
          if (vivant) setCaisse(l);
        })
        .catch(() => {
          if (vivant) setCaisse([]);
        });
    };
    relire();
    const arreter = ecouterCaisse(relire);
    return () => {
      vivant = false;
      arreter();
    };
  }, []);
  return caisse;
}

/** Les morceaux d'un dossier de la caisse. */
export const duDossier = (caisse: readonly Morceau[], dossier: string): readonly Morceau[] =>
  caisse.filter((m) => dossier === TOUS || (m.dossier ?? VRAC) === dossier);
