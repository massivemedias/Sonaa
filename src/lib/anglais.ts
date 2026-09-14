/* LES TEXTES ANGLAIS DES STYLES. Le corpus est ecrit en francais ; pour
 * chaque genre, deux textes anglais existent en plus (description, et ce
 * qui compte quand on le produit), ecrits le 14 septembre 2026 pour les
 * pages /en/ que lisent les moteurs de recherche. L'app les affiche a la
 * place de la description francaise quand l'interface est en anglais. Le
 * fichier n'est charge que dans ce cas : un lecteur francophone ne le
 * telecharge jamais. */

import { useEffect, useState } from 'react';
import { langue } from '../langue/langue.ts';

export interface TexteAnglais {
  readonly description: string;
  readonly production: string;
}

let promesse: Promise<Record<string, TexteAnglais>> | null = null;

function charger(): Promise<Record<string, TexteAnglais>> {
  promesse ??= import('../data/textes-en.json').then((m) => m.default as Record<string, TexteAnglais>);
  return promesse;
}

/** Le texte anglais d'un genre, ou null tant qu'il n'est pas la (ou que
    l'interface est en francais, auquel cas il ne le sera jamais). */
export function useTexteAnglais(genreId: string): TexteAnglais | null {
  const [texte, setTexte] = useState<TexteAnglais | null>(null);
  useEffect(() => {
    if (langue !== 'en') return;
    let vivant = true;
    void charger().then((tous) => {
      if (vivant) setTexte(tous[genreId] ?? null);
    });
    return () => {
      vivant = false;
    };
  }, [genreId]);
  return langue === 'en' ? texte : null;
}
