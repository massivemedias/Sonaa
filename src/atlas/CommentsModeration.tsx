/* La file de modération des commentaires, dans la page de modération.

   CE QU'ELLE MONTRE : les messages signalés et les messages masqués, les plus
   signalés en tête. Rien d'autre. Un fil ordinaire ne remonte jamais ici,
   sinon la file serait la totalité du site et personne ne la relirait.

   LA VUE RÉSERVE DÉJÀ L'ACCÈS. `comments_moderation` porte
   `where is_moderator()` : un simple connecté qui l'interroge obtient zéro
   ligne, pas une erreur. L'interface n'a donc pas à protéger quoi que ce
   soit, elle affiche ce que la base veut bien rendre. */

import { useCallback, useEffect, useState } from 'react';

import { dateCourte } from '../lib/comments.ts';

interface LigneModeration {
  id: string;
  genre_id: string;
  auteur: string | null;
  body: string;
  score: number;
  reports_count: number;
  masque: boolean;
  created_at: string;
  motifs: (string | null)[] | null;
}

export function CommentsModeration() {
  const [file, setFile] = useState<LigneModeration[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [genreAFermer, setGenreAFermer] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const { supabase } = await import('../lib/supabase.ts');
      if (!supabase) {
        setErreur('Base injoignable.');
        setChargement(false);
        return;
      }
      const { data, error } = await supabase
        .from('comments_moderation')
        .select('*')
        .order('reports_count', { ascending: false })
        .limit(100);
      if (error) setErreur(error.message);
      else setFile((data ?? []) as LigneModeration[]);
    } catch {
      setErreur('Lecture impossible.');
    }
    setChargement(false);
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  /* MASQUER N'EFFACE PAS. La ligne reste, le corps disparaît de l'affichage
     public, et la base note qui a masqué et quand. Effacer empêcherait de
     comprendre après coup pourquoi un fil a la forme qu'il a. */
  const basculerMasque = async (id: string, masque: boolean) => {
    const { supabase } = await import('../lib/supabase.ts');
    if (!supabase) return;
    const { error } = await supabase.from('comments').update({ masque: !masque }).eq('id', id);
    if (error) setErreur(error.message);
    else await charger();
  };

  /* Retirer les signalements vide la file sans toucher au message : c'est la
     décision « j'ai regardé, il n'y a rien à faire ». */
  const classerSansSuite = async (id: string) => {
    const { supabase } = await import('../lib/supabase.ts');
    if (!supabase) return;
    const { error } = await supabase.from('comment_reports').delete().eq('comment_id', id);
    if (error) setErreur(error.message);
    else await charger();
  };

  const fermerGenre = async (ferme: boolean) => {
    const genre = genreAFermer.trim();
    if (!genre) return;
    const { supabase } = await import('../lib/supabase.ts');
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from('genre_comment_settings').upsert(
      {
        genre_id: genre,
        ferme,
        ferme_at: ferme ? new Date().toISOString() : null,
        ferme_par: ferme ? (data.user?.id ?? null) : null
      },
      { onConflict: 'genre_id' }
    );
    if (error) setErreur(error.message);
    else {
      setErreur(null);
      setGenreAFermer('');
    }
  };

  return (
    <section aria-labelledby="mod-commentaires">
      <h2 id="mod-commentaires">Commentaires signalés</h2>

      {erreur && (
        <p className="contrib-erreur" role="alert">
          {erreur}
        </p>
      )}

      {/* FERMER UN FIL. Sur 218 genres, un fil qui dérape doit pouvoir être
          arrêté sans supprimer ce qui s'y trouve : la lecture reste possible,
          seule l'écriture est bloquée. */}
      <div className="mod-fermeture">
        <label htmlFor="mod-genre">Fermer ou rouvrir les commentaires d&apos;un genre</label>
        <div className="mod-fermeture-ligne">
          <input
            id="mod-genre"
            value={genreAFermer}
            onChange={(e) => setGenreAFermer(e.target.value)}
            placeholder="identifiant du genre, par exemple dubtechno"
          />
          <button onClick={() => void fermerGenre(true)}>Fermer</button>
          <button onClick={() => void fermerGenre(false)}>Rouvrir</button>
        </div>
      </div>

      {chargement ? (
        <p className="prop-vide">Lecture de la file…</p>
      ) : file.length === 0 ? (
        <p className="prop-vide">
          Aucun commentaire signalé. La file ne montre que les messages signalés ou masqués.
        </p>
      ) : (
        <ul className="mod-liste">
          {file.map((c) => (
            <li key={c.id} className="mod-item">
              <div className="mod-item-entete">
                <strong>{c.genre_id}</strong>
                <span>{c.auteur ?? 'anonyme'}</span>
                <span>{dateCourte(c.created_at)}</span>
                <span className="mod-signalements">
                  {c.reports_count} signalement{c.reports_count > 1 ? 's' : ''}
                </span>
                {c.masque && <span className="mod-masque">masqué</span>}
              </div>
              <p className="mod-item-corps">{c.body}</p>
              {c.motifs && c.motifs.filter(Boolean).length > 0 && (
                <p className="mod-motifs">Motifs : {c.motifs.filter(Boolean).join(' · ')}</p>
              )}
              <div className="mod-item-actions">
                <button onClick={() => void basculerMasque(c.id, c.masque)}>
                  {c.masque ? 'Réafficher' : 'Masquer'}
                </button>
                <button onClick={() => void classerSansSuite(c.id)}>Classer sans suite</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
