/* LA PAGE DES MEILLEURS CLUBS (PAR VILLE) ET FESTIVALS (PAR PAYS, 1 000+ PLACES).
 *
 * Mika, le 3 novembre 2026 : « une page avec les meilleurs clubs et festivals
 * dans les villes que je propose pour les clubs et les festivals c'est par
 * Pays, faudra faire une recherche avec les meilleurs festivals electro avec
 * une capacite de plus de 1000 personnes et je voudrais aussi que tu fasses
 * une carte interactive mondiale ».
 *
 * TROIS BLOCS :
 * 1. La carte interactive mondiale (MapLibre + OpenFreeMap sombre), avec
 *    marqueurs distincts pour les clubs et les festivals, centrage par pays ou
 *    ville, et fiche detaillee au clic.
 * 2. Les meilleurs clubs classes dans les 23 villes du calendrier SONAA,
 *    chacun relie a l'agenda /soirees/<ville>/ de sa ville.
 * 3. Les meilleurs festivals classes par pays (capacite 1 000+ personnes, plus
 *    Be Tulum et Nomade Tulum au Mexique). */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, type Map as CarteMapLibre } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { creerCarte } from './fond-de-carte.ts';
import {
  LIEUX_ET_FESTIVALS,
  PAYS_LIEUX,
  VILLES_CLUBS,
  type LieuOuFestival,
} from '../data/lieux-et-festivals.ts';
import { langue, t } from '../langue/langue.ts';
import './credits.css';
import './lieux.css';

type FiltreType = 'tout' | 'club' | 'festival';
type ZoneCarte = 'atlantique' | 'amerique' | 'europe' | 'monde';

/* Cadrages serres sur les zones ou se concentrent les clubs et festivals :
   pas de Groenland en haut ni d'Afrique du Sud en bas. */
const CADRES_ZONES: Record<ZoneCarte, [[number, number], [number, number]]> = {
  atlantique: [
    [-99.5, 20.0],
    [25.5, 53.5],
  ],
  amerique: [
    [-123.5, 19.0],
    [-63.0, 51.5],
  ],
  europe: [
    [-9.2, 36.8],
    [28.8, 54.5],
  ],
  monde: [
    [-124.0, -38.0],
    [146.0, 54.5],
  ],
};

const normaliser = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function LieuxPage() {
  const [filtreType, setFiltreType] = useState<FiltreType>('tout');
  const [zoneCarte, setZoneCarte] = useState<ZoneCarte>('atlantique');
  const [paysActif, setPaysActif] = useState<string>('');
  const [villeActive, setVilleActive] = useState<string>('');
  const [requete, setRequete] = useState<string>('');
  const [selection, setSelection] = useState<LieuOuFestival | null>(null);
  const [cadreVisible, setCadreVisible] = useState<{
    ouest: number;
    sud: number;
    est: number;
    nord: number;
  } | null>(null);

  const cadreCarteRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<CarteMapLibre | null>(null);
  const marqueursRef = useRef<Map<string, { marker: Marker; bouton: HTMLButtonElement }>>(new Map());
  const blocCarteRef = useRef<HTMLElement | null>(null);
  const mouvementProgrammatiqueRef = useRef<boolean>(false);

  useEffect(() => {
    document.title = `${t.clubsEtFestivalsTitre} · SONAA`;
  }, []);

  const totalClubs = useMemo(() => LIEUX_ET_FESTIVALS.filter((x) => x.type === 'club').length, []);
  const totalFestivals = useMemo(() => LIEUX_ET_FESTIVALS.filter((x) => x.type === 'festival').length, []);

  const paysMap = useMemo(() => new Map(PAYS_LIEUX.map((p) => [p.code, p])), []);
  const villeMap = useMemo(() => new Map(VILLES_CLUBS.map((v) => [v.slug, v])), []);

  const villesFiltreesParPays = useMemo(
    () => (paysActif ? VILLES_CLUBS.filter((v) => v.paysCode === paysActif) : VILLES_CLUBS),
    [paysActif]
  );

  /* Lieux correspondant au type (Tout / Clubs / Festivals) et a la recherche textuelle :
     tous leurs marqueurs restent visibles sur la carte meme quand on zoome ou dezoome. */
  const lieuxPourCarte = useMemo(() => {
    const q = normaliser(requete.trim());
    const qCompact = q.replace(/\b(and|et)\b/g, '').replace(/[\s\-'&.+]+/g, '');
    return LIEUX_ET_FESTIVALS.filter((l) => {
      if (filtreType !== 'tout' && l.type !== filtreType) return false;
      if (!q) return true;
      const pays = paysMap.get(l.paysCode);
      const texte = normaliser(
        [
          l.nom,
          l.ville.fr,
          l.ville.en,
          pays?.nom.fr ?? '',
          pays?.nom.en ?? '',
          ...l.styles,
          l.description.fr,
          l.description.en,
        ].join(' ')
      );
      if (texte.includes(q)) return true;
      return (
        qCompact.length > 0 &&
        texte.replace(/\b(and|et)\b/g, '').replace(/[\s\-'&.+]+/g, '').includes(qCompact)
      );
    });
  }, [filtreType, requete, paysMap]);

  const lieuxFiltres = useMemo(() => {
    return lieuxPourCarte.filter((l) => {
      if (paysActif && l.paysCode !== paysActif) return false;
      if (villeActive && l.villeSlug !== villeActive) return false;
      if (cadreVisible) {
        if (
          l.longitude < cadreVisible.ouest ||
          l.longitude > cadreVisible.est ||
          l.latitude < cadreVisible.sud ||
          l.latitude > cadreVisible.nord
        ) {
          return false;
        }
      }
      return true;
    });
  }, [lieuxPourCarte, paysActif, villeActive, cadreVisible]);

  const clubsParVille = useMemo(() => {
    const clubs = lieuxFiltres.filter((l) => l.type === 'club');
    return VILLES_CLUBS.map((ville) => ({
      ville,
      pays: paysMap.get(ville.paysCode),
      clubs: clubs.filter((c) => c.villeSlug === ville.slug),
    })).filter((g) => g.clubs.length > 0);
  }, [lieuxFiltres, paysMap]);

  const festivalsParPays = useMemo(() => {
    const festivals = lieuxFiltres.filter((l) => l.type === 'festival');
    return PAYS_LIEUX.map((pays) => ({
      pays,
      festivals: festivals
        .filter((f) => f.paysCode === pays.code)
        .sort((a, b) => b.capacite - a.capacite),
    })).filter((g) => g.festivals.length > 0);
  }, [lieuxFiltres]);

  /* Montage initial de la carte mondiale MapLibre. */
  useEffect(() => {
    const conteneur = cadreCarteRef.current;
    if (!conteneur) return;

    let annule = false;
    let carte: CarteMapLibre | null = null;
    try {
      carte = creerCarte(conteneur, [39.5, -36], 2.45);
      carte.setMaxBounds([
        [-175, -44],
        [175, 59.5],
      ]);
      mouvementProgrammatiqueRef.current = true;
      carte.once('moveend', () => {
        mouvementProgrammatiqueRef.current = false;
      });
      carte.fitBounds(CADRES_ZONES.atlantique, { padding: 28, duration: 0 });
      carte.on('moveend', () => {
        if (mouvementProgrammatiqueRef.current || !carte) return;
        const b = carte.getBounds();
        setPaysActif('');
        setVilleActive('');
        setCadreVisible({
          ouest: b.getWest(),
          sud: b.getSouth(),
          est: b.getEast(),
          nord: b.getNorth(),
        });
      });
      carteRef.current = carte;
    } catch {
      /* En environnement sans WebGL, la liste reste pleinement utilisable. */
      return;
    }

    return () => {
      annule = true;
      for (const { marker } of marqueursRef.current.values()) marker.remove();
      marqueursRef.current.clear();
      if (carte && !annule) {
        carte.remove();
      } else if (carte) {
        carte.remove();
      }
      carteRef.current = null;
    };
  }, []);

  /* Mise a jour des marqueurs : tous les lieux correspondant au type et a la recherche
     restent affiches sur la carte pour permettre l'exploration libre au dezoom. */
  useEffect(() => {
    const carte = carteRef.current;
    if (!carte) return;

    for (const { marker } of marqueursRef.current.values()) marker.remove();
    marqueursRef.current.clear();

    for (const lieu of lieuxPourCarte) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `lx-pin lx-pin-${lieu.type}`;
      el.setAttribute('aria-label', `${lieu.nom} (${lieu.ville[langue]})`);
      el.title = `${lieu.nom} · ${lieu.ville[langue]}`;

      const point = document.createElement('span');
      point.className = 'lx-pin-coeur';
      el.appendChild(point);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelection(lieu);
      });

      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([lieu.longitude, lieu.latitude])
        .addTo(carte);
      marqueursRef.current.set(lieu.id, { marker, bouton: el });
    }
  }, [lieuxPourCarte]);

  /* Surbrillance du marqueur selectionne. */
  useEffect(() => {
    for (const [id, { bouton }] of marqueursRef.current.entries()) {
      bouton.classList.toggle('est-actif', selection?.id === id);
    }
  }, [selection, lieuxPourCarte]);

  const lancerMouvementCarte = (action: (carte: CarteMapLibre) => void): void => {
    const carte = carteRef.current;
    if (!carte) return;
    mouvementProgrammatiqueRef.current = true;
    carte.once('moveend', () => {
      mouvementProgrammatiqueRef.current = false;
    });
    action(carte);
  };

  const chercherDansZone = (): void => {
    const carte = carteRef.current;
    if (!carte) return;
    const b = carte.getBounds();
    setPaysActif('');
    setVilleActive('');
    setSelection(null);
    setCadreVisible({
      ouest: b.getWest(),
      sud: b.getSouth(),
      est: b.getEast(),
      nord: b.getNorth(),
    });
  };

  const choisirZone = (zone: ZoneCarte): void => {
    setZoneCarte(zone);
    setSelection(null);
    setPaysActif('');
    setVilleActive('');
    setCadreVisible(null);
    lancerMouvementCarte((carte) => {
      carte.fitBounds(CADRES_ZONES[zone], { padding: 32, maxZoom: 6.5, duration: 650 });
    });
  };

  const choisirPays = (code: string): void => {
    setPaysActif(code);
    setVilleActive('');
    setCadreVisible(null);
    setSelection(null);
    if (!code) {
      lancerMouvementCarte((carte) => {
        carte.fitBounds(CADRES_ZONES[zoneCarte], { padding: 32, maxZoom: 6.5, duration: 650 });
      });
      return;
    }
    const duPays = LIEUX_ET_FESTIVALS.filter((l) => l.paysCode === code);
    const carte = carteRef.current;
    if (!carte || duPays.length === 0) return;
    if (duPays.length === 1 && duPays[0]) {
      const unique = duPays[0];
      lancerMouvementCarte((c) => {
        c.flyTo({ center: [unique.longitude, unique.latitude], zoom: 6, duration: 700, essential: true });
      });
      return;
    }
    const lngs = duPays.map((d) => d.longitude);
    const lats = duPays.map((d) => d.latitude);
    lancerMouvementCarte((c) => {
      c.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 64, maxZoom: 7, duration: 700 }
      );
    });
  };

  const choisirVille = (slugVille: string): void => {
    setVilleActive(slugVille);
    setCadreVisible(null);
    setSelection(null);
    if (!slugVille) return;
    const v = VILLES_CLUBS.find((x) => x.slug === slugVille);
    if (v) {
      lancerMouvementCarte((carte) => {
        carte.flyTo({ center: [v.longitude, v.latitude], zoom: 11.5, duration: 700, essential: true });
      });
    }
  };

  const centrerSurLieu = (lieu: LieuOuFestival): void => {
    setSelection(lieu);
    blocCarteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lancerMouvementCarte((carte) => {
      carte.panTo([lieu.longitude, lieu.latitude], {
        duration: 500,
        essential: true,
      });
    });
  };

  const reinitialiser = (): void => {
    setFiltreType('tout');
    setZoneCarte('atlantique');
    setPaysActif('');
    setVilleActive('');
    setCadreVisible(null);
    setRequete('');
    setSelection(null);
    lancerMouvementCarte((carte) => {
      carte.fitBounds(CADRES_ZONES.atlantique, { padding: 28, duration: 650 });
    });
  };

  return (
    <div className="page-credits page-lieux">
      <EnTeteSite />
      <main id="contenu-principal" className="lx-main">
        <header className="lx-entete">
          <p className="lx-surtitre">{t.clubsCarteMondiale}</p>
          <h1 className="lx-titre">{t.clubsEtFestivalsTitre}</h1>
          <p className="lx-chapeau">
            {t.clubsEtFestivalsChapeau(totalClubs, VILLES_CLUBS.length, totalFestivals, PAYS_LIEUX.length)}
          </p>
        </header>

        {/* BARRE DE FILTRES */}
        <section className="lx-filtres" aria-label={t.clubsEtFestivalsTitre}>
          <div className="lx-modes" role="group" aria-label={t.clubsEtFestivalsTitre}>
            <button
              type="button"
              className="lx-mode"
              aria-pressed={filtreType === 'tout'}
              onClick={() => setFiltreType('tout')}
            >
              {t.clubsTout}
            </button>
            <button
              type="button"
              className="lx-mode lx-mode-club"
              aria-pressed={filtreType === 'club'}
              onClick={() => setFiltreType('club')}
            >
              <span className="lx-puce lx-puce-club" aria-hidden="true" />
              {t.clubsSeulement(totalClubs)}
            </button>
            <button
              type="button"
              className="lx-mode lx-mode-festival"
              aria-pressed={filtreType === 'festival'}
              onClick={() => setFiltreType('festival')}
            >
              <span className="lx-puce lx-puce-festival" aria-hidden="true" />
              {t.festivalsSeulement(totalFestivals)}
            </button>
          </div>

          <div className="lx-selecteurs">
            <select
              className="lx-select"
              value={paysActif}
              aria-label={t.clubsTousLesPays}
              onChange={(e) => choisirPays(e.target.value)}
            >
              <option value="">{t.clubsTousLesPays}</option>
              {PAYS_LIEUX.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.nom[langue]}
                </option>
              ))}
            </select>

            <select
              className="lx-select"
              value={villeActive}
              aria-label={t.clubsToutesLesVilles}
              onChange={(e) => choisirVille(e.target.value)}
            >
              <option value="">{t.clubsToutesLesVilles}</option>
              {villesFiltreesParPays.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.nom[langue]}
                </option>
              ))}
            </select>

            <input
              type="search"
              className="lx-recherche"
              value={requete}
              placeholder={t.clubsChercherLieu}
              aria-label={t.clubsChercherLieu}
              onChange={(e) => setRequete(e.target.value)}
            />
          </div>
        </section>

        {/* CARTE INTERACTIVE MONDIALE */}
        <section ref={blocCarteRef} className="lx-carte-section" aria-label={t.clubsCarteMondiale}>
          <div className="lx-carte-barre">
            <div className="lx-legende">
              <span className="lx-legende-item">
                <span className="lx-puce lx-puce-club" aria-hidden="true" />
                {t.lieuNClubs(lieuxFiltres.filter((x) => x.type === 'club').length)}
              </span>
              <span className="lx-legende-item">
                <span className="lx-puce lx-puce-festival" aria-hidden="true" />
                {t.lieuNFestivals(lieuxFiltres.filter((x) => x.type === 'festival').length)}
              </span>
            </div>
            <div className="lx-zones-carte">
              <button
                type="button"
                className="lx-vue-monde lx-chercher-zone"
                aria-pressed={Boolean(cadreVisible)}
                onClick={() => (cadreVisible ? setCadreVisible(null) : chercherDansZone())}
              >
                {cadreVisible ? t.lieuZoneVisibleActive : t.lieuChercherDansZone}
              </button>
              <button
                type="button"
                className="lx-vue-monde"
                aria-pressed={zoneCarte === 'atlantique' && !paysActif && !villeActive && !cadreVisible}
                onClick={() => choisirZone('atlantique')}
              >
                {t.clubsZoneAtlantique}
              </button>
              <button
                type="button"
                className="lx-vue-monde"
                aria-pressed={zoneCarte === 'amerique' && !paysActif && !villeActive && !cadreVisible}
                onClick={() => choisirZone('amerique')}
              >
                {t.clubsZoneAmerique}
              </button>
              <button
                type="button"
                className="lx-vue-monde"
                aria-pressed={zoneCarte === 'europe' && !paysActif && !villeActive && !cadreVisible}
                onClick={() => choisirZone('europe')}
              >
                {t.clubsZoneEurope}
              </button>
              <button
                type="button"
                className="lx-vue-monde"
                aria-pressed={zoneCarte === 'monde' && !paysActif && !villeActive && !cadreVisible}
                onClick={() => choisirZone('monde')}
              >
                {t.clubsCarteVueMonde}
              </button>
            </div>
          </div>

          <div className="lx-carte-enveloppe">
            <div ref={cadreCarteRef} className="lx-carte-canevas" />

            {selection && (
              <aside className="lx-fiche-carte" aria-live="polite">
                <div className="lx-fiche-entete">
                  <span className={`lx-badge lx-badge-${selection.type}`}>
                    {selection.type === 'club' ? t.lieuTypeClub : t.lieuTypeFestival}
                  </span>
                  <button
                    type="button"
                    className="lx-fiche-fermer"
                    onClick={() => setSelection(null)}
                  >
                    {t.fermerCourt}
                  </button>
                </div>
                <h3 className="lx-fiche-nom">{selection.nom}</h3>
                <p className="lx-fiche-meta">
                  {[
                    selection.ville[langue],
                    paysMap.get(selection.paysCode)?.nom[langue],
                    t.lieuCapacite(selection.capacite),
                    selection.annee ? t.lieuDepuis(selection.annee) : null,
                    selection.mois ? selection.mois[langue] : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="lx-fiche-desc">{selection.description[langue]}</p>
                <ul className="lx-styles">
                  {selection.styles.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <div className="lx-fiche-actions">
                  <a
                    className="lx-lien-action"
                    href={selection.site}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t.lieuSiteOfficiel}
                  </a>
                  {selection.villeSlug && villeMap.get(selection.villeSlug)?.aCalendrier && (
                    <a
                      className="lx-lien-secondaire"
                      href={`#/calendrier?city=${selection.villeSlug}`}
                    >
                      {t.lieuVoirCalendrierVille(
                        villeMap.get(selection.villeSlug)?.nom[langue] ?? selection.ville[langue]
                      )}
                    </a>
                  )}
                </div>
              </aside>
            )}
          </div>
        </section>

        {lieuxFiltres.length === 0 && (
          <div className="lx-vide">
            <p>{t.lieuAucunResultat}</p>
            <button type="button" className="lx-vue-monde" onClick={reinitialiser}>
              {t.lieuReinitialiserFiltres}
            </button>
          </div>
        )}

        {/* SECTION 1 : LES MEILLEURS CLUBS PAR VILLE */}
        {clubsParVille.length > 0 && (
          <section className="lx-bloc" aria-labelledby="titre-clubs-villes">
            <header className="lx-bloc-entete">
              <h2 id="titre-clubs-villes" className="lx-bloc-titre">
                {t.clubsSectionTitre}
              </h2>
              <p className="lx-bloc-soustitre">{t.clubsSectionSousTitre(VILLES_CLUBS.length)}</p>
            </header>

            <div className="lx-groupes">
              {clubsParVille.map(({ ville, pays, clubs }) => (
                <article key={ville.slug} className="lx-groupe">
                  <header className="lx-groupe-entete">
                    <div>
                      <h3 className="lx-groupe-titre">
                        {ville.nom[langue]}
                        {pays ? <span className="lx-groupe-pays"> · {pays.nom[langue]}</span> : null}
                      </h3>
                    </div>
                    <div className="lx-groupe-liens">
                      <button
                        type="button"
                        className="lx-lien-carte"
                        onClick={() => {
                          choisirVille(ville.slug);
                          blocCarteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        {t.lieuCentrerCarte}
                      </button>
                      {ville.aCalendrier && (
                        <a
                          className="lx-lien-calendrier"
                          href={`#/calendrier?city=${ville.slug}`}
                        >
                          {t.lieuVoirCalendrierVille(ville.nom[langue])}
                        </a>
                      )}
                    </div>
                  </header>

                  <ul className="lx-grille">
                    {clubs.map((club) => (
                      <li key={club.id} className="lx-carte">
                        <div className="lx-carte-haut">
                          <h4 className="lx-carte-nom">{club.nom}</h4>
                          <span className="lx-capacite">{t.lieuCapacite(club.capacite)}</span>
                        </div>
                        <p className="lx-carte-meta">
                          {[
                            club.ville[langue],
                            club.annee ? t.lieuDepuis(club.annee) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="lx-carte-desc">{club.description[langue]}</p>
                        <ul className="lx-styles">
                          {club.styles.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                        <div className="lx-carte-bas">
                          <a
                            className="lx-lien-site"
                            href={club.site}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {t.lieuSiteOfficiel}
                          </a>
                          <button
                            type="button"
                            className="lx-lien-carte"
                            onClick={() => centrerSurLieu(club)}
                          >
                            {t.lieuCentrerCarte}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 2 : LES MEILLEURS FESTIVALS PAR PAYS (1 000+ PERSONNES) */}
        {festivalsParPays.length > 0 && (
          <section className="lx-bloc" aria-labelledby="titre-festivals-pays">
            <header className="lx-bloc-entete">
              <h2 id="titre-festivals-pays" className="lx-bloc-titre">
                {t.festivalsSectionTitre}
              </h2>
              <p className="lx-bloc-soustitre">{t.festivalsSectionSousTitre(PAYS_LIEUX.length)}</p>
            </header>

            <div className="lx-groupes">
              {festivalsParPays.map(({ pays, festivals }) => (
                <article key={pays.code} className="lx-groupe">
                  <header className="lx-groupe-entete">
                    <div>
                      <h3 className="lx-groupe-titre">
                        {pays.nom[langue]}
                        <span className="lx-groupe-pays"> · {t.lieuNFestivals(festivals.length)}</span>
                      </h3>
                    </div>
                    <div className="lx-groupe-liens">
                      <button
                        type="button"
                        className="lx-lien-carte"
                        onClick={() => {
                          choisirPays(pays.code);
                          blocCarteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        {t.lieuCentrerCarte}
                      </button>
                    </div>
                  </header>

                  <ul className="lx-grille">
                    {festivals.map((fest) => (
                      <li key={fest.id} className="lx-carte lx-carte-festival">
                        <div className="lx-carte-haut">
                          <h4 className="lx-carte-nom">{fest.nom}</h4>
                          <span className="lx-capacite lx-capacite-festival">
                            {t.lieuCapacite(fest.capacite)}
                          </span>
                        </div>
                        <p className="lx-carte-meta">
                          {[
                            fest.ville[langue],
                            fest.mois ? fest.mois[langue] : null,
                            fest.annee ? t.lieuDepuis(fest.annee) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="lx-carte-desc">{fest.description[langue]}</p>
                        <ul className="lx-styles">
                          {fest.styles.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                        <div className="lx-carte-bas">
                          <a
                            className="lx-lien-site"
                            href={fest.site}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {t.lieuSiteOfficiel}
                          </a>
                          {fest.villeSlug && villeMap.get(fest.villeSlug)?.aCalendrier && (
                            <a
                              className="lx-lien-calendrier"
                              href={`#/calendrier?city=${fest.villeSlug}`}
                            >
                              {t.lieuVoirCalendrierVille(
                                villeMap.get(fest.villeSlug)?.nom[langue] ?? fest.ville[langue]
                              )}
                            </a>
                          )}
                          <button
                            type="button"
                            className="lx-lien-carte"
                            onClick={() => centrerSurLieu(fest)}
                          >
                            {t.lieuCentrerCarte}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <PiedDePage />
    </div>
  );
}
