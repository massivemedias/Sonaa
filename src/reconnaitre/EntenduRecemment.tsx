/* « ENTENDU RECEMMENT » : les morceaux que le micro a rattaches a ce genre.
 *
 * Mika, le 27 septembre 2026. Sous la liste des morceaux d'un genre, les
 * douze derniers scans publies : pochette, titre, artiste, et un bouton
 * YouTube par ligne. La section n'existe pas quand il n'y a rien : une
 * rubrique vide dirait « personne n'ecoute ce style », ce qui n'est pas ce
 * qu'elle sait. Les lignes viennent de la table scans, que la politique de
 * lecture limite au publie : rien n'apparait avant moderation. Les
 * pochettes sont lues a leur adresse d'origine, jamais recopiees. */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { t } from '../langue/langue.ts';
import './entendu.css';

interface Ligne {
  readonly id: string;
  readonly titre: string;
  readonly artiste: string;
  readonly label: string | null;
  readonly annee: number | null;
  readonly pochette_url: string | null;
  readonly ecoutes: number;
}

export function EntenduRecemment({ genreId }: { genreId: string }) {
  const [lignes, setLignes] = useState<readonly Ligne[]>([]);

  useEffect(() => {
    let vivant = true;
    setLignes([]);
    if (!supabase) return;
    void supabase
      .from('scans')
      .select('id, titre, artiste, label, annee, pochette_url, ecoutes')
      .eq('genre_slug', genreId)
      .eq('statut', 'publie')
      .order('cree_le', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (vivant && data) setLignes(data as Ligne[]);
      });
    return () => {
      vivant = false;
    };
  }, [genreId]);

  if (lignes.length === 0) return null;

  return (
    <section className="entendu">
      <h3 className="pv-titre-liste">{t.entenduRecemment}</h3>
      <ul className="entendu-liste">
        {lignes.map((l) => (
          <li key={l.id} className="entendu-ligne">
            {l.pochette_url ? (
              <img className="entendu-pochette" src={l.pochette_url} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <span className="entendu-pochette entendu-vide" aria-hidden="true" />
            )}
            <span className="entendu-texte">
              <strong>{l.titre}</strong>
              <span>
                {l.artiste}
                {l.label ? ` · ${l.label}` : ''}
                {l.annee ? ` · ${l.annee}` : ''}
                {l.ecoutes > 1 ? ` · ${t.scanEcoutes(l.ecoutes)}` : ''}
              </span>
            </span>
            <a
              className="entendu-youtube"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${l.artiste} ${l.titre}`)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              YouTube
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
