/* LE CALENDRIER. Route #/calendrier.

   ═══ CE QU'ELLE REPOND ═══

   « Qu'est-ce qui se joue pres de moi, dans les styles qui m'interessent. »
   Rien d'autre. L'atlas raconte d'ou vient la dub techno ; cette page dit ou
   en ecouter samedi.

   ═══ LA VILLE N'EST PAS DEMANDEE ═══

   Elle est deduite de l'adresse d'ou arrive la requete, cote Cloudflare :
   pas de fenetre de permission, pas de champ a remplir, la page s'ouvre deja
   sur la bonne ville. C'est la demande de Mika, mot pour mot : « pas besoin
   que ce dernier selectionne quoi que ce soit ».

   Une deduction par adresse se trompe : un reseau prive virtuel, un
   operateur mobile qui sort a trois cents kilometres. La ville reste donc
   changeable, et le choix est retenu. Ce qui compte est qu'elle soit JUSTE
   PAR DEFAUT, pas qu'elle soit infaillible.

   ═══ D'OU VIENNENT LES SOIREES, ET CE QUE CELA COUTE ═══

   De Resident Advisor, par la passerelle. Leur API n'est pas publique : elle
   peut fermer sans preavis. La page est ecrite pour que cela SE VOIE, avec
   une phrase qui nomme la source tombee, au lieu d'afficher une liste vide
   qui ressemblerait a une ville sans soirees. C'est la distinction qui
   compte ici, et elle remonte jusqu'au Worker, qui rend 502 plutot qu'une
   liste vide.

   Chaque soiree renvoie chez eux. On ne vend rien, on ne copie rien, on ne
   garde rien : le cache d'une heure vit dans le Worker et disparait. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { ChoixStyles, LABEL_DE_GENRE } from './ChoixStyles.tsx';
import { FAMILIES, STRUCTURES } from './structures.ts';
import {
  agenda,
  noterStyles,
  noterZone,
  ouJeSuis,
  prochainsJours,
  stylesSuivis,
  traduire,
  zoneChoisie,
  zones as toutesLesZones,
  STYLES_MAX,
  type Soiree,
  type Zone,
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

function jour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
}

function heure(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}

export function CalendrierPage() {
  const [zone, setZone] = useState<Zone | null>(null);
  const [villeDeduite, setVilleDeduite] = useState<string | null>(null);
  const [cherchee, setCherchee] = useState(false);
  const [styles, setStyles] = useState<string[]>(() => stylesSuivis());
  const [fenetre, setFenetre] = useState(7);
  const [soirees, setSoirees] = useState<Soiree[] | null>(null);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState(false);
  const [ouvrirStyles, setOuvrirStyles] = useState(false);
  const [ouvrirVilles, setOuvrirVilles] = useState(false);
  const [listeVilles, setListeVilles] = useState<Zone[]>([]);
  const [filtreVille, setFiltreVille] = useState('');

  /* OU SUIS-JE. Un choix deja fait l'emporte sur la deduction : quelqu'un qui
     a corrige sa ville ne veut pas la voir revenir a chaque visite. */
  useEffect(() => {
    const retenue = zoneChoisie();
    if (retenue) {
      setZone(retenue);
      setCherchee(true);
      return;
    }
    void ouJeSuis().then((ou) => {
      setVilleDeduite(ou.ville);
      setZone(ou.zone);
      setCherchee(true);
    });
  }, []);

  /* LE STYLE EN COURS. Un seul filtre a la fois du cote de RA, qui ne sait
     pas chercher plusieurs genres ensemble. On garde donc les cinq styles
     suivis, et on interroge le premier ; les autres sont des onglets. */
  const [styleActif, setStyleActif] = useState<string | null>(null);
  const styleInterroge = styleActif ?? styles[0] ?? null;

  const traduction = useMemo(() => {
    if (!styleInterroge) return null;
    return traduire(styleInterroge, FAMILLE_DE_GENRE.get(styleInterroge) ?? '');
  }, [styleInterroge]);

  const charger = useCallback(() => {
    if (!zone) return;
    setChargement(true);
    setPanne(false);
    const { du, au } = prochainsJours(fenetre);
    void agenda({
      zone: zone.id,
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
  }, [zone, fenetre, traduction]);

  useEffect(charger, [charger]);

  useEffect(() => {
    if (!ouvrirVilles || listeVilles.length > 0) return;
    void toutesLesZones().then(setListeVilles);
  }, [ouvrirVilles, listeVilles.length]);

  const changerStyles = (ids: string[]) => {
    setStyles(ids);
    noterStyles(ids);
    if (styleActif && !ids.includes(styleActif)) setStyleActif(null);
  };

  const choisirVille = (z: Zone) => {
    setZone(z);
    noterZone(z);
    setOuvrirVilles(false);
    setFiltreVille('');
  };

  /* Groupees par jour : un agenda se lit par soirs, pas par lignes. */
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

  const villesFiltrees = useMemo(() => {
    const f = filtreVille.trim().toLowerCase();
    if (!f) return listeVilles.slice(0, 60);
    return listeVilles
      .filter((z) => z.nom.toLowerCase().includes(f) || z.pays.toLowerCase() === f)
      .slice(0, 60);
  }, [listeVilles, filtreVille]);

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
            Ce qui se joue pres de vous, dans les styles que vous suivez. Les soirees viennent de
            Resident Advisor ; chaque titre y renvoie.
          </p>
        </header>

        <div id="calendrier-contenu" className="credits-body">
          {/* ═══ OU ═══ */}
          <div className="cal-barre">
            <div className="cal-ou">
              {!cherchee ? (
                <span className="cal-attente">On cherche ou vous etes…</span>
              ) : zone ? (
                <>
                  <strong>{zone.nom}</strong>
                  {villeDeduite && villeDeduite !== zone.nom && (
                    <span className="cal-note"> (deduit de {villeDeduite})</span>
                  )}
                </>
              ) : (
                <span className="cal-note">
                  {villeDeduite
                    ? `Resident Advisor ne couvre pas ${villeDeduite}.`
                    : 'Ville inconnue.'}{' '}
                  Choisissez-en une.
                </span>
              )}
              <button className="cal-lien" onClick={() => setOuvrirVilles((v) => !v)}>
                {ouvrirVilles ? 'Fermer' : 'Changer de ville'}
              </button>
            </div>

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
          </div>

          {ouvrirVilles && (
            <div className="cal-villes">
              <input
                className="cal-recherche"
                type="search"
                placeholder="Berlin, Montreal, Tokyo, ou un code pays (CA, DE…)"
                value={filtreVille}
                onChange={(e) => setFiltreVille(e.target.value)}
                autoFocus
              />
              {listeVilles.length === 0 ? (
                <p className="cal-note">Chargement des villes…</p>
              ) : (
                <ul className="cal-villes-liste">
                  {villesFiltrees.map((z) => (
                    <li key={z.id}>
                      <button
                        className={`cal-ville${zone?.id === z.id ? ' cal-ville-active' : ''}`}
                        onClick={() => choisirVille(z)}
                      >
                        {z.nom} <span className="cal-pays">{z.pays}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ═══ QUELS STYLES ═══ */}
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
                jusqu&apos;a {STYLES_MAX} pour ne voir que ce qui vous concerne.
              </p>
            ) : (
              <div className="cal-onglets-styles">
                <button
                  className={`cal-onglet${styleInterroge === styles[0] && !styleActif ? ' cal-onglet-actif' : ''}`}
                  onClick={() => setStyleActif(styles[0] ?? null)}
                >
                  {LABEL_DE_GENRE[styles[0] ?? ''] ?? styles[0]}
                </button>
                {styles.slice(1).map((id) => (
                  <button
                    key={id}
                    className={`cal-onglet${styleActif === id ? ' cal-onglet-actif' : ''}`}
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

            {/* LA RECHERCHE ELARGIE SE DIT. Sans cette phrase, une soiree
                house generique passerait pour une soiree Chicago house, et
                la page mentirait poliment. */}
            {traduction?.elargi && styleInterroge && (
              <p className="cal-note">
                Resident Advisor ne distingue pas{' '}
                <strong>{LABEL_DE_GENRE[styleInterroge] ?? styleInterroge}</strong> : la
                recherche a ete elargie a « {traduction.valeur} ».
              </p>
            )}
            {traduction && traduction.valeur === null && styleInterroge && (
              <p className="cal-note">
                Aucun equivalent de{' '}
                <strong>{LABEL_DE_GENRE[styleInterroge] ?? styleInterroge}</strong> chez
                Resident Advisor : voici tout ce qui se joue en ville.
              </p>
            )}
          </section>

          {/* ═══ CE QUI SE JOUE ═══ */}
          {!zone ? null : panne ? (
            <p className="cal-panne">
              Resident Advisor ne repond pas. Ce n&apos;est pas une ville sans soirees : c&apos;est
              la source qui est muette. <button className="cal-lien" onClick={charger}>Reessayer</button>
            </p>
          ) : chargement ? (
            <p className="cal-attente">Lecture de l&apos;agenda…</p>
          ) : parJour.length === 0 ? (
            <p className="cal-note">
              Rien d&apos;annonce a {zone.nom} sur cette periode
              {traduction?.valeur ? ` en ${traduction.valeur}` : ''}. Elargissez la periode, ou
              changez de style.
            </p>
          ) : (
            <>
              <p className="cal-total">
                {total} soiree{total > 1 ? 's' : ''} a {zone.nom}
                {soirees && total > soirees.length ? `, les ${soirees.length} premieres` : ''}.
              </p>
              {parJour.map(([date, liste]) => (
                <section key={date} className="cal-jour">
                  <h3>{jour(date)}</h3>
                  <ul className="cal-liste">
                    {liste.map((s) => (
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
                          <a className="cal-titre" href={s.lien} target="_blank" rel="noreferrer">
                            {s.titre}
                          </a>
                          <p className="cal-lieu">
                            {s.lieu ?? 'Lieu non annonce'}
                            {heure(s.debut) ? ` · ${heure(s.debut)}` : ''}
                          </p>
                          {s.artistes.length > 0 && (
                            <p className="cal-artistes">{s.artistes.slice(0, 6).join(', ')}</p>
                          )}
                          {s.genres.length > 0 && (
                            <p className="cal-genres">{s.genres.join(' · ')}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
      </main>
      <PiedDePage />
    </>
  );
}
