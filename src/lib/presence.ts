/* COMBIEN DE PERSONNES SONT SUR LE SITE, LA, MAINTENANT.
 *
 * Mika, le 14 septembre 2026, pour le pied de page : « le nombre de
 * visiteurs live sur le site ». Le temps reel de Supabase porte une
 * « presence » : chaque onglet ouvert s'annonce sur un canal, et le canal
 * dit a tous combien ils sont. Rien n'est ecrit en base, rien n'est
 * stocke : un onglet qui se ferme disparait du compte en quelques
 * secondes. Aucun compte n'est necessaire, la cle publique suffit.
 *
 * Un identifiant par onglet, tire au sort : deux onglets d'une meme
 * personne comptent pour deux, ce qui est la verite d'un « en ce moment
 * sur le site ». Sans base (build local sans variables), le compte est
 * nul et le pied n'affiche rien. */

import { useEffect, useState } from 'react';
import { supabase } from './supabase.ts';

let compteActuel = 0;
const abonnes = new Set<(n: number) => void>();
let canalOuvert = false;

function ouvrirLeCanal(): void {
  if (canalOuvert || !supabase) return;
  canalOuvert = true;
  const cle = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const canal = supabase.channel('sonaa-presence', { config: { presence: { key: cle } } });
  canal
    .on('presence', { event: 'sync' }, () => {
      compteActuel = Object.keys(canal.presenceState()).length;
      for (const f of abonnes) f(compteActuel);
    })
    .subscribe((statut) => {
      if (statut === 'SUBSCRIBED') void canal.track({ depuis: Date.now() });
    });
}

/** Le nombre d'onglets ouverts sur le site en ce moment, soi compris. Zero
    tant qu'on ne sait pas. */
export function usePresence(): number {
  const [n, setN] = useState(compteActuel);
  useEffect(() => {
    ouvrirLeCanal();
    abonnes.add(setN);
    setN(compteActuel);
    return () => {
      abonnes.delete(setN);
    };
  }, []);
  return n;
}
