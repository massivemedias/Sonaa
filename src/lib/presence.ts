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

/** Ce que le pied affiche : le nombre, et les villes d'ou viennent les
    gens, les plus nombreuses d'abord. La ville vient de la passerelle
    (api/ou, Cloudflare la lit dans la requete) : jamais de position, jamais
    d'adresse, une ville et rien d'autre. */
export interface Presence {
  readonly n: number;
  readonly villes: readonly { ville: string; n: number }[];
}
const RIEN: Presence = { n: 0, villes: [] };
let presenceActuelle: Presence = RIEN;
const abonnes = new Set<(p: Presence) => void>();
let canalOuvert = false;

async function maVille(): Promise<string | null> {
  try {
    const r = await fetch('https://sonaa-sets.massivemedias.workers.dev/api/ou');
    if (!r.ok) return null;
    const j = (await r.json()) as { ville?: string | null };
    return typeof j.ville === 'string' && j.ville !== '' ? j.ville : null;
  } catch {
    return null;
  }
}

function ouvrirLeCanal(): void {
  if (canalOuvert || !supabase) return;
  canalOuvert = true;
  const cle = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const canal = supabase.channel('sonaa-presence', { config: { presence: { key: cle } } });
  canal
    .on('presence', { event: 'sync' }, () => {
      const etat = canal.presenceState<{ ville?: string | null }>();
      const parVille = new Map<string, number>();
      for (const entrees of Object.values(etat)) {
        const v = entrees[0]?.ville;
        if (typeof v === 'string' && v !== '') parVille.set(v, (parVille.get(v) ?? 0) + 1);
      }
      presenceActuelle = {
        n: Object.keys(etat).length,
        villes: [...parVille.entries()].map(([ville, n]) => ({ ville, n })).sort((a, b) => b.n - a.n),
      };
      for (const f of abonnes) f(presenceActuelle);
    })
    .subscribe((statut) => {
      if (statut === 'SUBSCRIBED') {
        void maVille().then((ville) => canal.track({ depuis: Date.now(), ville }));
      }
    });
}

/** Qui est sur le site en ce moment, soi compris : le nombre et les villes.
    Vide tant qu'on ne sait pas. */
export function usePresence(): Presence {
  const [p, setP] = useState<Presence>(presenceActuelle);
  useEffect(() => {
    ouvrirLeCanal();
    abonnes.add(setP);
    setP(presenceActuelle);
    return () => {
      abonnes.delete(setP);
    };
  }, []);
  return p;
}
