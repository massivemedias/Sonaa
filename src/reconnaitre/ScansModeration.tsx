/* LA MODERATION DES SCANS : publier ou rejeter, en un clic.
 *
 * Mika, le 27 septembre 2026. Un scan nait « en attente » ; rien ne parait
 * sur une fiche de genre avant qu'il soit publie ici. Cette liste est
 * reservee a mauditemachine@gmail.com : la politique de lecture de la table
 * ne rend les lignes en attente qu'a cette adresse, et la politique de
 * modification n'accepte qu'elle. Le composant ne fait que montrer et
 * cliquer ; c'est la base qui garde la porte. */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { t } from '../langue/langue.ts';
import './entendu.css';

interface Scan {
  readonly id: string;
  readonly titre: string;
  readonly artiste: string;
  readonly label: string | null;
  readonly annee: number | null;
  readonly pochette_url: string | null;
  readonly genre_slug: string;
  readonly confiance: number;
  readonly ecoutes: number;
}

export function ScansModeration() {
  const [scans, setScans] = useState<readonly Scan[] | null>(null);

  const recharger = (): void => {
    if (!supabase) return;
    void supabase
      .from('scans')
      .select('id, titre, artiste, label, annee, pochette_url, genre_slug, confiance, ecoutes')
      .eq('statut', 'en_attente')
      .order('cree_le', { ascending: false })
      .limit(100)
      .then(({ data }) => setScans((data as Scan[] | null) ?? []));
  };

  useEffect(recharger, []);

  const statuer = async (id: string, statut: 'publie' | 'rejete'): Promise<void> => {
    if (!supabase) return;
    await supabase.from('scans').update({ statut }).eq('id', id);
    recharger();
  };

  return (
    <section className="entendu">
      <h3 className="pv-titre-liste">{t.scansTitre}</h3>
      {scans === null ? null : scans.length === 0 ? (
        <p className="rc-note">{t.scansAucun}</p>
      ) : (
        <ul className="entendu-liste">
          {scans.map((s) => (
            <li key={s.id} className="entendu-ligne entendu-moderation">
              {s.pochette_url ? (
                <img className="entendu-pochette" src={s.pochette_url} alt="" loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <span className="entendu-pochette entendu-vide" aria-hidden="true" />
              )}
              <span className="entendu-texte">
                <strong>{s.titre}</strong>
                <span>
                  {s.artiste}
                  {s.label ? ` · ${s.label}` : ''}
                  {s.annee ? ` · ${s.annee}` : ''}
                </span>
                <span>
                  {s.genre_slug} · {Math.round(s.confiance * 100)} % · {t.scanEcoutes(s.ecoutes)}
                </span>
              </span>
              <span className="entendu-boutons">
                <button type="button" className="entendu-youtube" onClick={() => void statuer(s.id, 'publie')}>
                  {t.scanPublier}
                </button>
                <button type="button" className="entendu-youtube" onClick={() => void statuer(s.id, 'rejete')}>
                  {t.scanRejeter}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
