/* COMBIEN DE PERSONNES SONT SUR LE SITE, LA, MAINTENANT.
 *
 * Mika, le 14 septembre 2026, pour le pied de page : « le nombre de
 * visiteurs live sur le site ». Le temps reel de Supabase porte une
 * « presence » : chaque onglet ouvert s'annonce sur un canal, et le canal
 * dit a tous combien ils sont. Rien n'est ecrit en base, rien n'est
 * stocke : un onglet qui se ferme disparait du compte en quelques
 * secondes. Aucun compte n'est necessaire, la cle publique suffit.
 *
 * UNE PERSONNE COMPTE UNE FOIS, depuis le 27 octobre 2026. Mika, devant
 * « 4 en ligne » : « est-ce que c'est vrai ? ». C'etait vrai, mais pour des
 * onglets : chaque onglet tirait sa propre cle, et ses trois onglets
 * comptaient pour trois. Il a choisi de compter les personnes. Tous les
 * onglets d'un meme navigateur partagent maintenant une cle (gardee dans ce
 * navigateur, jamais ecrite en base), et le canal de presence range sous une
 * seule cle tout ce qui la porte. Connecte, la cle est l'empreinte du compte
 * et du jour : le telephone et l'ordinateur d'une meme personne comptent
 * pour une, sans que l'identifiant du compte circule sur le canal. Sans base
 * (build local sans variables), le compte est nul et le pied n'affiche
 * rien. */

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

/** La cle de presence de ce navigateur, la meme pour tous ses onglets. */
function cleDuNavigateur(): string {
  try {
    const deja = localStorage.getItem('sonaa.presence');
    if (deja) return deja;
    const neuve = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('sonaa.presence', neuve);
    return neuve;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/** Connecte : l'empreinte du compte et du jour, la meme sur tous ses
    appareils, illisible pour qui ecoute le canal. Sinon, celle du
    navigateur. */
async function cleDePresence(): Promise<string> {
  try {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    const id = data.session?.user.id;
    if (id) {
      const jour = new Date().toISOString().slice(0, 10);
      const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`sonaa-presence|${id}|${jour}`));
      return [...new Uint8Array(octets)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
    }
  } catch {
    /* on retombe sur le navigateur */
  }
  return cleDuNavigateur();
}

function ouvrirLeCanal(): void {
  if (canalOuvert || !supabase) return;
  canalOuvert = true;
  void cleDePresence().then(rejoindre);
}

function rejoindre(cle: string): void {
  if (!supabase) return;
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
