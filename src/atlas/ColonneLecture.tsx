/* LA COLONNE DE DROITE DE LA VUE DE LECTURE.
 *
 * Mika, le 22 septembre 2026, capture a l'appui : « en desktop on a la place
 * de mettre une colonne a droite avec les nouveaux articles et par exemple
 * quelques events de ce qu'il y a a faire ce soir dans l'endroit ou est la
 * personne ».
 *
 * MESURE QUI LUI DONNE RAISON : la colonne de lecture fait 72 signes, soit
 * environ 640 px, centree dans une page de 1240. Trois cents pixels de
 * chaque cote ne portaient rien.
 *
 * ═══ DEUX BLOCS, ET AUCUN N'EST DU REMPLISSAGE ═══
 *
 * A LIRE AUSSI ne coute AUCUNE requete : la page des news a deja le fichier
 * entier en memoire, elle passe quatre articles. C'est la meme donnee, lue
 * une fois.
 *
 * CE SOIR coute deux requetes, et elles sont celles que le site fait deja
 * ailleurs : `ouJeSuis` pour la zone, que le pied de page appelle pour la
 * presence, et `agenda` pour la journee. Elles partent APRES le montage et
 * n'attendent pas l'article : un bloc lateral ne fait jamais patienter ce
 * qu'on est venu lire.
 *
 * ═══ LA VILLE CHOISIE BAT LA VILLE DEDUITE ═══
 *
 * Mika, le 22 septembre 2026 : « ville choisie dans le calendrier si elle
 * existe, deduite sinon ». Quelqu'un qui a regle son calendrier sur Berlin
 * ne veut pas lire les soirees de Montreal parce qu'il y est en voyage.
 *
 * LA TABLE DES VILLES N'EST LUE QUE S'IL Y A UN CHOIX A RESOUDRE. Sans choix,
 * le chemin est exactement celui d'avant, `ouJeSuis` et rien d'autre : la
 * requete supplementaire n'est payee que par ceux qui en ont besoin.
 *
 * UN SLUG PERIME EST IGNORE, pas suivi : il ne vient d'aucune intention
 * presente. C'est la regle de `resoudreVille`, et on ne la reecrit pas ici.
 *
 * ═══ LA VILLE EST NOMMEE, ET SON HEURE EST LA SIENNE ═══
 *
 * Le titre l'ecrit en toutes lettres, « Ce soir a Berlin », pour que personne
 * ne croie a un choix qu'il n'a pas fait quand elle est deduite. Et l'heure
 * est celle de LA VILLE, pas celle du lecteur : une soiree berlinoise
 * annoncee a l'heure de Montreal serait fausse de six heures. Le fuseau du
 * navigateur ne sert que faute de mieux, quand la ville vient de la
 * connexion et qu'on n'a donc pas sa fiche.
 *
 * Sans ville reconnue, le bloc n'existe pas : mieux vaut une colonne plus
 * courte qu'un agenda d'ailleurs.
 *
 * ═══ ELLE PASSE SOUS L'ARTICLE SUR TELEPHONE ═══
 *
 * Et non a cote : voir news.css. Ce qu'on est venu lire passe devant. */

import { useEffect, useState } from 'react';
import { agenda, ouJeSuis, type Soiree } from '../lib/agenda.ts';
import { heureLocale, toutesLesVilles, villeDeSession } from '../lib/villes.ts';
import { t } from '../langue/langue.ts';

/** Ce qu'il faut d'un article pour en faire une vignette de colonne. */
export interface ArticleVoisin {
  readonly lien: string;
  readonly titre: string;
  readonly source: string;
  readonly image: string | null;
}

interface Props {
  readonly voisins: readonly ArticleVoisin[];
}

/* L'ADRESSE D'UN ARTICLE LU ICI, la meme que celle des vignettes de la page
   des news : un vrai lien, donc le clic du milieu, le clavier et le menu
   contextuel marchent sans qu'on ait rien a ecrire. */
const versLArticle = (lien: string) => `#/news/lire?u=${encodeURIComponent(lien)}`;

const SOIREES_MONTREES = 3;

/* LA JOURNEE ENTIERE, DE MINUIT A MINUIT, ET LE DEBUT COMPTE AUTANT QUE LA
   FIN.

   La fenetre s'arrete a la fin du jour courant parce que quelqu'un qui lit a
   deux heures du matin cherche ce qui se joue CE SOIR-LA, pas demain.

   ELLE COMMENCE A MINUIT ET NON MAINTENANT, et c'est une correction : j'avais
   passe l'instant courant. Resident Advisor compare a la DATE de la soiree,
   qui vaut minuit ; demander a partir de 13 h 05 excluait donc les deux
   soirees du soir meme, dont l'une commencait a 21 h. Mesure le 22 septembre
   2026 : deux soirees avec `du=2026-09-22`, zero avec
   `du=2026-09-22T13:05:49`. Voir le commentaire de `sansFuseau` dans
   lib/agenda.ts, qui raconte la meme histoire pour le calendrier. */
function bornesDuJour(): { du: Date; au: Date } {
  const du = new Date();
  du.setHours(0, 0, 0, 0);
  const au = new Date();
  au.setHours(23, 59, 59, 0);
  return { du, au };
}

/** La ville a montrer : celle du calendrier si elle est choisie et connue,
    celle de la connexion sinon. Rend aussi le fuseau a employer pour les
    heures, et `null` quand aucune zone n'est disponible. */
async function villeDuBloc(): Promise<{ zone: number; nom: string; fuseau: string | null } | null> {
  const choisi = villeDeSession();
  if (choisi) {
    const connues = await toutesLesVilles();
    const v = connues.find((x) => x.slug === choisi);
    if (v?.ra_area_id) return { zone: v.ra_area_id, nom: v.name, fuseau: v.timezone };
    /* Choisie mais sans zone chez Resident Advisor, ou slug perime : on
       retombe sur la deduction plutot que de se taire. */
  }
  const ou = await ouJeSuis();
  if (!ou.zone) return null;
  return { zone: ou.zone.id, nom: ou.ville ?? ou.zone.nom, fuseau: null };
}

function useCeSoir(): { ville: string | null; fuseau: string; soirees: readonly Soiree[] } {
  const [ville, setVille] = useState<string | null>(null);
  /* LE FUSEAU DE LA VILLE QUAND ON L'A, celui du navigateur sinon. Lu a
     l'initialisation et non dans un effet : celui du navigateur ne change pas
     pendant qu'on lit un article. */
  const [fuseau, setFuseau] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [soirees, setSoirees] = useState<readonly Soiree[]>([]);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const ou = await villeDuBloc();
      if (!vivant || !ou) return;
      setVille(ou.nom);
      if (ou.fuseau) setFuseau(ou.fuseau);
      const { du, au } = bornesDuJour();
      const rendu = await agenda({ zone: ou.zone, du, au });
      /* `null` veut dire que la source n'a pas repondu, et une liste vide
         qu'il n'y a rien : dans les deux cas cette colonne se tait. Elle
         n'est pas l'endroit ou l'on annonce une panne d'agenda. */
      /* DANS L'ORDRE DE LA SOIREE. L'agenda ne garantit pas l'heure : vu a
         l'ecran, 22 h passait avant 21 h. Trois lignes dont l'ordre n'est
         pas celui qu'on lit se lisent comme une liste au hasard. */
      const triees = rendu
        ? [...rendu.soirees].sort((x, y) => (x.debut ?? x.date).localeCompare(y.debut ?? y.date))
        : [];
      if (vivant && rendu) setSoirees(triees.slice(0, SOIREES_MONTREES));
    })();
    return () => {
      vivant = false;
    };
  }, []);

  return { ville, fuseau, soirees };
}

export function ColonneLecture({ voisins }: Props) {
  const { ville, fuseau, soirees } = useCeSoir();

  return (
    <aside className="lecture-colonne" aria-label={t.aLireAussi}>
      {voisins.length > 0 && (
        <section className="lc-bloc">
          <h2 className="lc-titre">{t.aLireAussi}</h2>
          <ul className="lc-liste">
            {voisins.map((a) => (
              <li key={a.lien}>
                <a className="lc-article" href={versLArticle(a.lien)}>
                  {a.image && <img className="lc-vignette" src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                  <span className="lc-article-texte">
                    <span className="lc-source">{a.source}</span>
                    <span className="lc-article-titre">{a.titre}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ville && soirees.length > 0 && (
        <section className="lc-bloc">
          <h2 className="lc-titre">{t.ceSoirA(ville)}</h2>
          <ul className="lc-liste">
            {soirees.map((s) => {
              const h = s.debut && fuseau ? heureLocale(s.debut, fuseau) : null;
              return (
                <li key={s.id}>
                  {/* CHAQUE SOIREE MENE CHEZ ELLE, et le pied du bloc mene au
                      calendrier : deux gestes differents, deux destinations
                      differentes. Le calendrier, lui, deplie sa fiche sur
                      place parce qu'il a le detail ; cette colonne ne l'a
                      pas, et envoyer les trois au meme endroit que le lien
                      du dessous serait promettre un geste qui n'existe pas.

                      LE CALENDRIER N'A PAS D'ADRESSE PAR SOIREE : les
                      chemins /soirees/<ville>/<id>/ ouvrent la ville, pas la
                      fiche. Voir chemins.ts. */}
                  <a className="lc-soiree" href={s.lien} target="_blank" rel="noreferrer noopener">
                    {s.affiche && <img className="lc-vignette" src={s.affiche} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                    <span className="lc-article-texte">
                      {h && <span className="lc-source">{h}</span>}
                      <span className="lc-article-titre">{s.titre}</span>
                      {s.lieu && <span className="lc-lieu">{s.lieu}</span>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="lc-pied">
            <a href="#/calendrier">{t.voirToutLeCalendrier}</a>
          </p>
        </section>
      )}
    </aside>
  );
}
