/* LE CALENDRIER. Route #/calendrier, et #/calendrier?city=<slug>.
 *
 * ═══ CE QU'IL REPOND ═══
 *
 * « Qu'est-ce qui se joue dans cette ville, dans les styles qui
 * m'interessent. » Rien d'autre. L'atlas raconte d'ou vient la dub techno ;
 * cette page dit ou en ecouter samedi.
 *
 * ═══ COMMENT LA VILLE EST CHOISIE, ET CE QUE CELA ENGAGE ═══
 *
 * Quatre sources, du plus explicite au plus devine, et l'ordre est ecrit une
 * fois pour toutes dans `resoudreVille`, avec ses tests :
 *
 *   1. le lien, `?city=berlin-de`, pour qu'une vue se partage ;
 *   2. le choix garde sur cette machine ;
 *   3. la ville d'attache du profil, pour qui est connecte ;
 *   4. la ville deduite de la connexion ;
 *   5. rien, et on le dit, avec le selecteur en avant.
 *
 * LA DEDUCTION EST DERNIERE, ET ELLE N'ECRIT NULLE PART. Elle remplit le
 * premier ecran de quelqu'un qui n'a rien demande, et c'est tout : le premier
 * geste la remplace, et regarder une autre ville ne modifie aucun profil. Un
 * contributeur qui voudrait la remonter dans l'ordre, ou la faire ecrire
 * quelque part, changerait la nature de la page : elle passerait de « voici
 * une proposition » a « je sais ou vous etes ». C'est la ligne a ne pas
 * franchir sans le decider.
 *
 * ═══ D'OU VIENNENT LES SOIREES ═══
 *
 * De Resident Advisor, par la passerelle, avec l'identifiant de zone que
 * porte chaque ville. Leur API n'est pas publique : elle peut fermer sans
 * preavis. La page est ecrite pour que cela SE VOIE, avec une phrase qui
 * nomme la source tombee, au lieu d'afficher une liste vide qui ressemblerait
 * a une ville sans soirees.
 *
 * Rien n'est copie, chaque soiree renvoie chez eux, le cache d'une heure vit
 * dans le Worker.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { ChoixStyles, LABEL_DE_GENRE } from './ChoixStyles.tsx';
import { SelecteurVille } from './SelecteurVille.tsx';
import { FAMILIES, STRUCTURES } from './structures.ts';
import { resoudreVille, situer, type Ville } from '../lib/ville-active.ts';
import {
  heureLocale,
  noterVilleDeSession,
  poserVilleDansLien,
  sigleFuseau,
  toutesLesVilles,
  villeDattache,
  villeDeSession,
  villeDuLien,
} from '../lib/villes.ts';
import {
  agenda,
  noterStyles,
  ouJeSuis,
  prochainsJours,
  stylesSuivis,
  traduire,
  STYLES_MAX,
  type Soiree,
} from '../lib/agenda.ts';
import './credits.css';
import './calendrier.css';

/* La famille d'un genre, pour pouvoir elargir a elle quand RA ne connait pas
   le style precis. Calculee une fois : STRUCTURES ne bouge pas. */
const FAMILLE_DE_GENRE = new Map<string, string>();
FAMILIES.forEach((f, i) => {
  for (const g of STRUCTURES[i]?.genres ?? []) FAMILLE_DE_GENRE.set(g.id, f.id);
});

const FENETRES: readonly { jours: number; label: string }[] = [
  { jours: 7, label: 'Cette semaine' },
  { jours: 30, label: 'Ce mois' },
  { jours: 90, label: 'Trois mois' },
];

/* Le jour se lit AUSSI dans le fuseau du lieu : une soiree berlinoise du
   samedi a 1 h du matin est un vendredi soir a Montreal, et la ranger sous
   vendredi tromperait celui qui prepare son week-end a Berlin. */
function jour(iso: string, fuseau: string): string {
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: fuseau,
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('fr-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  }
}

export function CalendrierPage() {
  const [villes, setVilles] = useState<Ville[]>([]);
  const [slugSession, setSlugSession] = useState<string | null>(null);
  const [idProfil, setIdProfil] = useState<string | null>(null);
  const [zoneDeduite, setZoneDeduite] = useState<number | null>(null);
  const [nomDeduit, setNomDeduit] = useState<string | null>(null);
  const [prete, setPrete] = useState(false);

  const [styles, setStyles] = useState<string[]>(() => stylesSuivis());
  const [styleActif, setStyleActif] = useState<string | null>(null);
  const [fenetre, setFenetre] = useState(7);

  const [soirees, setSoirees] = useState<Soiree[] | null>(null);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [panne, setPanne] = useState(false);
  const [ouvrirStyles, setOuvrirStyles] = useState(false);
  const [ouvrirVilles, setOuvrirVilles] = useState(false);

  /* Le slug du lien est lu UNE FOIS, au montage : il decrit l'intention de
     celui qui a ouvert le lien, pas l'etat courant de la page, que chaque
     changement de ville va reecrire dans l'adresse. Le relire ensuite ferait
     gagner le lien contre le geste, c'est-a-dire l'inverse de la regle. */
  const [slugLien] = useState<string | null>(() => villeDuLien());

  useEffect(() => {
    setSlugSession(villeDeSession());
    void toutesLesVilles().then(setVilles);
    void villeDattache().then(setIdProfil);
    void ouJeSuis().then((ou) => {
      setNomDeduit(ou.ville);
      setZoneDeduite(ou.zone?.id ?? null);
      setPrete(true);
    });
  }, []);

  /* LA DEDUCTION REND UNE ZONE RESIDENT ADVISOR, PAS UNE DE NOS VILLES. On
     les rapproche ici, quand les deux sont arrivees, dans l'ordre ou elles
     arrivent. Une ville que RA couvre mais que SONAA ne connait pas encore ne
     donne rien : mieux vaut demander que d'afficher une ville inventee. */
  const deduite = useMemo(
    () => (zoneDeduite == null ? null : (villes.find((v) => v.ra_area_id === zoneDeduite) ?? null)),
    [villes, zoneDeduite]
  );

  const { ville, provenance } = useMemo(
    () =>
      resoudreVille({
        slugDuLien: slugLien,
        slugDeSession: slugSession,
        villeDuProfil: idProfil,
        villeDeduite: deduite,
        connues: villes,
      }),
    [slugLien, slugSession, idProfil, deduite, villes]
  );

  const styleInterroge = styleActif ?? styles[0] ?? null;
  const traduction = useMemo(() => {
    if (!styleInterroge) return null;
    return traduire(styleInterroge, FAMILLE_DE_GENRE.get(styleInterroge) ?? '');
  }, [styleInterroge]);

  const zoneRa = ville?.ra_area_id ?? null;

  const charger = useCallback(() => {
    if (zoneRa == null) return;
    setChargement(true);
    setPanne(false);
    const { du, au } = prochainsJours(fenetre);
    void agenda({
      zone: zoneRa,
      du,
      au,
      ...(traduction?.valeur ? { genre: traduction.valeur } : {}),
    }).then((r) => {
      if (!r) {
        setPanne(true);
        setSoirees(null);
      } else {
        setSoirees(r.soirees);
        setTotal(r.total);
      }
      setChargement(false);
    });
  }, [zoneRa, fenetre, traduction]);

  useEffect(charger, [charger]);

  /* CHANGER DE VILLE ICI N'ECRIT PAS DANS LE PROFIL. Le local et l'adresse,
     rien de plus : regarder Berlin un mardi soir ne rend berlinois personne.
     Le profil ne se modifie que depuis le profil, et c'est verifie par un
     test. */
  const choisirVille = (v: Ville) => {
    setSlugSession(v.slug);
    noterVilleDeSession(v.slug);
    poserVilleDansLien(v.slug);
    setOuvrirVilles(false);
  };

  const changerStyles = (ids: string[]) => {
    setStyles(ids);
    noterStyles(ids);
    if (styleActif && !ids.includes(styleActif)) setStyleActif(null);
  };

  const parJour = useMemo(() => {
    const m = new Map<string, Soiree[]>();
    for (const s of soirees ?? []) {
      const cle = s.date.slice(0, 10);
      const deja = m.get(cle);
      if (deja) deja.push(s);
      else m.set(cle, [s]);
    }
    return [...m.entries()];
  }, [soirees]);

  const fuseau = ville?.timezone ?? 'America/Toronto';

  /* LE SIGLE DE FUSEAU NE S'AFFICHE QUE S'IL APPREND QUELQUE CHOSE : quand la
     ville regardee n'est pas celle d'ou l'on se connecte. Le repeter sur
     chaque ligne de sa propre ville serait du bruit. */
  const ailleurs = ville != null && deduite != null && ville.id !== deduite.id;

  /* Le nom local quand c'est une deduction, le notre sinon. Cloudflare rend
     « Montréal », notre table aussi ; RA ecrivait « Montreal ». */
  const villeMontree = provenance === 'deduite' && nomDeduit ? nomDeduit : (ville?.name ?? null);

  const enAttente = !prete && villes.length === 0;

  return (
    <>
      <EnTeteSite />
      <main className="credits cal">
        <a className="credits-skip" href="#calendrier-contenu">
          Aller au contenu
        </a>

        <header className="credits-head">
          <h1>Calendrier</h1>
          <p className="credits-lede">
            Ce qui se joue dans votre ville, dans les styles que vous suivez. Les soirées viennent
            de Resident Advisor ; chaque titre y renvoie.
          </p>
        </header>

        <div id="calendrier-contenu" className="credits-body">
          <div className="cal-barre">
            <div className="cal-ou">
              {enAttente ? (
                <span className="cal-attente">Un instant…</span>
              ) : ville ? (
                <>
                  <strong>{villeMontree}</strong>
                  <span className="cal-note">{situer(ville)}</span>
                </>
              ) : (
                <span className="cal-note">Choisissez une ville.</span>
              )}
              {ville && (
                <button
                  className="cal-lien"
                  onClick={() => setOuvrirVilles((v) => !v)}
                  aria-expanded={ouvrirVilles}
                >
                  {ouvrirVilles ? 'Fermer' : 'Changer de ville'}
                </button>
              )}
            </div>

            {ville && (
              <div className="cal-fenetres">
                {FENETRES.map((f) => (
                  <button
                    key={f.jours}
                    className={`cal-onglet${fenetre === f.jours ? ' cal-onglet-actif' : ''}`}
                    onClick={() => setFenetre(f.jours)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* L'ETAT VIDE MET LE SELECTEUR EN AVANT, il ne s'excuse pas dans un
              coin : tant qu'aucune ville n'est choisie, c'est la seule chose a
              faire sur cette page. */}
          {(ouvrirVilles || (!ville && !enAttente)) && (
            <div className="cal-choix-ville">
              <SelecteurVille
                villes={villes}
                choisie={ville}
                onChoisir={choisirVille}
                etiquette="Votre ville"
                autoFocus={ouvrirVilles}
              />
              {!ville && villes.length > 0 && (
                <p className="cal-note">
                  SONAA connait {villes.length} villes. Le choix reste sur cette machine ; pour le
                  garder d&apos;un appareil à l&apos;autre, mettez-le dans{' '}
                  <a href="#/profil">votre profil</a>.
                </p>
              )}
            </div>
          )}

          {ville && (
            <>
              <section className="cal-styles">
                <div className="cal-styles-tete">
                  <h2>Vos styles</h2>
                  <button className="cal-lien" onClick={() => setOuvrirStyles((v) => !v)}>
                    {ouvrirStyles ? 'Fermer' : styles.length > 0 ? 'Modifier' : 'En choisir'}
                  </button>
                </div>

                {styles.length === 0 ? (
                  <p className="cal-note">
                    Aucun style suivi : la page montre tout ce qui se joue en ville. Choisissez-en
                    jusqu&apos;à {STYLES_MAX} pour ne voir que ce qui vous concerne.
                  </p>
                ) : (
                  <div className="cal-onglets-styles">
                    {styles.map((id) => (
                      <button
                        key={id}
                        className={`cal-onglet${
                          (styleActif ?? styles[0]) === id ? ' cal-onglet-actif' : ''
                        }`}
                        onClick={() => setStyleActif(id)}
                      >
                        {LABEL_DE_GENRE[id] ?? id}
                      </button>
                    ))}
                  </div>
                )}

                {ouvrirStyles && (
                  <ChoixStyles
                    choisis={styles}
                    onChange={changerStyles}
                    max={STYLES_MAX}
                    titre={`Les styles que vous suivez (${STYLES_MAX} au plus)`}
                  />
                )}

                {traduction?.elargi && styleInterroge && (
                  <p className="cal-note">
                    Resident Advisor ne distingue pas{' '}
                    <strong>{LABEL_DE_GENRE[styleInterroge] ?? styleInterroge}</strong> : la
                    recherche a été élargie à « {traduction.valeur} ».
                  </p>
                )}
                {traduction && traduction.valeur === null && styleInterroge && (
                  <p className="cal-note">
                    Aucun équivalent de{' '}
                    <strong>{LABEL_DE_GENRE[styleInterroge] ?? styleInterroge}</strong> chez
                    Resident Advisor : voici tout ce qui se joue en ville.
                  </p>
                )}
              </section>

              {zoneRa == null ? (
                <p className="cal-note">
                  Resident Advisor ne couvre pas {ville.name}. La ville reste dans SONAA, ses
                  soirées viendront d&apos;ailleurs.
                </p>
              ) : panne ? (
                <p className="cal-panne">
                  Resident Advisor ne répond pas. Ce n&apos;est pas une ville sans soirées :
                  c&apos;est la source qui est muette.{' '}
                  <button className="cal-lien" onClick={charger}>
                    Réessayer
                  </button>
                </p>
              ) : chargement ? (
                <p className="cal-attente">Lecture de l&apos;agenda…</p>
              ) : parJour.length === 0 ? (
                <p className="cal-note">
                  Rien d&apos;annoncé à {ville.name} sur cette période
                  {traduction?.valeur ? ` en ${traduction.valeur}` : ''}. Élargissez la période, ou
                  changez de style.
                </p>
              ) : (
                <>
                  <p className="cal-total">
                    {total} soirée{total > 1 ? 's' : ''} à {ville.name}
                    {soirees && total > soirees.length ? `, les ${soirees.length} premières` : ''}.
                  </p>
                  {parJour.map(([date, liste]) => (
                    <section key={date} className="cal-jour">
                      <h3>{jour(date, fuseau)}</h3>
                      <ul className="cal-liste">
                        {liste.map((s) => {
                          const h = s.debut ? heureLocale(s.debut, fuseau) : null;
                          const sigle = ailleurs && s.debut ? sigleFuseau(s.debut, fuseau) : null;
                          return (
                            <li key={s.id} className="cal-soiree">
                              {s.affiche && (
                                <img
                                  className="cal-affiche"
                                  src={s.affiche}
                                  alt=""
                                  loading="lazy"
                                  draggable={false}
                                />
                              )}
                              <div className="cal-texte">
                                <a
                                  className="cal-titre"
                                  href={s.lien}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {s.titre}
                                </a>
                                <p className="cal-lieu">
                                  {s.lieu ?? 'Lieu non annoncé'}
                                  {h ? ` · ${h}${sigle ? ` ${sigle}` : ''}` : ''}
                                </p>
                                {s.artistes.length > 0 && (
                                  <p className="cal-artistes">{s.artistes.slice(0, 6).join(', ')}</p>
                                )}
                                {s.genres.length > 0 && (
                                  <p className="cal-genres">{s.genres.join(' · ')}</p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <PiedDePage />
    </>
  );
}
