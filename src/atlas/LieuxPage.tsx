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
import { ouJeSuis, type OuJeSuis } from '../lib/agenda.ts';
import {
  noterVilleDeSession,
  toutesLesVilles,
  villeDattache,
  villeDeSession,
  villeDuLien,
} from '../lib/villes.ts';
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

const trouverSlugVilleClub = (slug: string | null | undefined): string => {
  if (!slug) return '';
  return VILLES_CLUBS.some((v) => v.slug === slug) ? slug : '';
};

const BANLIEUES_VERS_VILLE: Record<string, string> = {
  laval: 'montreal-ca',
  longueuil: 'montreal-ca',
  brossard: 'montreal-ca',
  terrebonne: 'montreal-ca',
  repentigny: 'montreal-ca',
  blainville: 'montreal-ca',
  boucherville: 'montreal-ca',
  dorval: 'montreal-ca',
  verdun: 'montreal-ca',
  lachine: 'montreal-ca',
  lasalle: 'montreal-ca',
  levis: 'quebec-ca',
  gatineau: 'ottawa-ca',
  mississauga: 'toronto-ca',
  brampton: 'toronto-ca',
  markham: 'toronto-ca',
  oakville: 'toronto-ca',
  burnaby: 'vancouver-ca',
  surrey: 'vancouver-ca',
  richmond: 'vancouver-ca',
  lattes: 'montpellier-fr',
  perols: 'montpellier-fr',
  'castelnau-le-lez': 'montpellier-fr',
  'saint-jean-de-vedas': 'montpellier-fr',
  'la grande-motte': 'montpellier-fr',
  sete: 'montpellier-fr',
  nimes: 'montpellier-fr',
  badalona: 'barcelone-es',
  'hospitalet de llobregat': 'barcelone-es',
  "l'hospitalet de llobregat": 'barcelone-es',
  viladecans: 'barcelone-es',
  'el prat de llobregat': 'barcelone-es',
  montreuil: 'paris-fr',
  'saint-denis': 'paris-fr',
  pantin: 'paris-fr',
  'boulogne-billancourt': 'paris-fr',
  nanterre: 'paris-fr',
};

const FUSEAU_VERS_VILLE: Record<string, string> = {
  'America/Montreal': 'montreal-ca',
  'America/Toronto': langue === 'fr' ? 'montreal-ca' : 'toronto-ca',
  'America/Vancouver': 'vancouver-ca',
  'America/Edmonton': 'calgary-ca',
  'America/New_York': 'new-york-us',
  'America/Detroit': 'detroit-us',
  'America/Chicago': 'chicago-us',
  'America/Denver': 'denver-us',
  'America/Los_Angeles': 'los-angeles-us',
  'America/Mexico_City': 'mexico-mx',
  'America/Cancun': 'tulum-mx',
  'America/Bogota': 'bogota-co',
  'America/Sao_Paulo': 'sao-paulo-br',
  'America/Argentina/Buenos_Aires': 'buenos-aires-ar',
  'America/Santiago': 'santiago-cl',
  'Europe/Paris': 'paris-fr',
  'Europe/Madrid': 'barcelone-es',
  'Europe/Berlin': 'berlin-de',
  'Europe/London': 'londres-uk',
  'Europe/Amsterdam': 'amsterdam-nl',
  'Europe/Brussels': 'bruxelles-be',
  'Europe/Lisbon': 'lisbonne-pt',
  'Europe/Rome': 'milan-it',
  'Europe/Zurich': 'zurich-ch',
  'Europe/Vienna': 'vienne-at',
  'Europe/Prague': 'prague-cz',
  'Europe/Warsaw': 'varsovie-pl',
  'Europe/Budapest': 'budapest-hu',
  'Europe/Bucharest': 'bucarest-ro',
  'Europe/Belgrade': 'belgrade-rs',
  'Europe/Athens': 'athenes-gr',
  'Europe/Stockholm': 'stockholm-se',
  'Europe/Copenhagen': 'copenhague-dk',
  'Europe/Dublin': 'dublin-ie',
  'Europe/Istanbul': 'istanbul-tr',
  'Asia/Tokyo': 'tokyo-jp',
  'Asia/Seoul': 'seoul-kr',
  'Asia/Bangkok': 'bangkok-th',
  'Asia/Singapore': 'singapour-sg',
  'Asia/Taipei': 'taipei-tw',
  'Australia/Sydney': 'sydney-au',
  'Australia/Melbourne': 'melbourne-au',
};

async function ouJeSuisAvecSecours(): Promise<OuJeSuis> {
  const premier = await ouJeSuis();
  if (premier.ville || premier.pays || premier.zone) return premier;
  try {
    const r = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (!r.ok) return premier;
    const j = (await r.json()) as { city?: string; country_code?: string };
    return {
      ville: typeof j.city === 'string' && j.city ? j.city : null,
      pays: typeof j.country_code === 'string' && j.country_code ? j.country_code : null,
      zone: null,
    };
  } catch {
    return premier;
  }
}

const devinerSlugDepuisIp = (
  ou: OuJeSuis,
  villesActives: readonly { slug: string; ra_area_id: number | null }[]
): string => {
  if (ou.zone?.id != null) {
    const parZone = villesActives.find((v) => v.ra_area_id === ou.zone?.id);
    const slugZone = trouverSlugVilleClub(parZone?.slug);
    if (slugZone) return slugZone;
  }
  const candidats = [ou.ville, ou.zone?.nom].filter((x): x is string => Boolean(x));
  for (const brut of candidats) {
    const n = normaliser(brut.trim());
    if (!n) continue;
    const banlieue = BANLIEUES_VERS_VILLE[n];
    if (banlieue) return banlieue;
    const exacte = VILLES_CLUBS.find(
      (v) =>
        normaliser(v.nom.fr) === n ||
        normaliser(v.nom.en) === n ||
        v.slug === n ||
        v.slug.startsWith(`${n}-`)
    );
    if (exacte) return exacte.slug;
    const partielle = VILLES_CLUBS.find(
      (v) => normaliser(v.nom.fr).includes(n) || normaliser(v.nom.en).includes(n)
    );
    if (partielle) return partielle.slug;
  }
  const fuseau = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return '';
    }
  })();
  if (ou.pays) {
    const code = ou.pays.toUpperCase();
    const parFuseau = fuseau ? FUSEAU_VERS_VILLE[fuseau] : undefined;
    if (parFuseau && VILLES_CLUBS.find((v) => v.slug === parFuseau)?.paysCode === code) {
      return parFuseau;
    }
    const duPays = VILLES_CLUBS.find((v) => v.paysCode === code);
    if (duPays) return duPays.slug;
  }
  if (fuseau && FUSEAU_VERS_VILLE[fuseau]) {
    return FUSEAU_VERS_VILLE[fuseau];
  }
  return '';
};

const ouvrirPremierClubDeLaVille = (slug: string, precedent: Set<string>): Set<string> => {
  if (!slug) return precedent;
  const premier = LIEUX_ET_FESTIVALS.filter((l) => l.type === 'club' && l.villeSlug === slug).sort(
    (a, b) => b.capacite - a.capacite
  )[0];
  if (!premier) return precedent;
  const suivant = new Set(precedent);
  suivant.add(premier.id);
  return suivant;
};

export function LieuxPage() {
  const [filtreType, setFiltreType] = useState<FiltreType>('tout');
  const [zoneCarte, setZoneCarte] = useState<ZoneCarte>('atlantique');
  const [paysActif, setPaysActif] = useState<string>('');
  const [villeActive, setVilleActive] = useState<string>(
    () => trouverSlugVilleClub(villeDuLien()) || trouverSlugVilleClub(villeDeSession())
  );
  const [requete, setRequete] = useState<string>('');
  const [selection, setSelection] = useState<LieuOuFestival | null>(null);
  const [cadreVisible, setCadreVisible] = useState<{
    ouest: number;
    sud: number;
    est: number;
    nord: number;
  } | null>(null);
  const [lieuxOuverts, setLieuxOuverts] = useState<Set<string>>(() => {
    const base = new Set([
      'new-city-gas-montreal',
      'stereo-montreal',
      'razzmatazz-barcelone',
      'dieze-warehouse-montpellier',
      'veld-toronto',
      'sonar-barcelona',
    ]);
    const initSlug = trouverSlugVilleClub(villeDuLien()) || trouverSlugVilleClub(villeDeSession());
    return ouvrirPremierClubDeLaVille(initSlug, base);
  });
  const [groupesDeplies, setGroupesDeplies] = useState<Set<string>>(() => new Set());
  const interactionUtilisateurRef = useRef<boolean>(false);

  const basculerLieu = (id: string): void => {
    setLieuxOuverts((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) {
        suivant.delete(id);
      } else {
        suivant.add(id);
      }
      return suivant;
    });
  };

  const basculerGroupe = (cle: string): void => {
    setGroupesDeplies((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(cle)) {
        suivant.delete(cle);
      } else {
        suivant.add(cle);
      }
      return suivant;
    });
  };

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
      clubs: clubs
        .filter((c) => c.villeSlug === ville.slug)
        .sort((a, b) => b.capacite - a.capacite),
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
      const vInit = VILLES_CLUBS.find((x) => x.slug === villeActive);
      if (vInit) {
        carte.jumpTo({ center: [vInit.longitude, vInit.latitude], zoom: 11.5 });
      } else {
        carte.fitBounds(CADRES_ZONES.atlantique, { padding: 28, duration: 0 });
      }
      carte.on('moveend', (e: { originalEvent?: unknown }) => {
        if (mouvementProgrammatiqueRef.current || !carte || !e.originalEvent) return;
        interactionUtilisateurRef.current = true;
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

  /* Ville par defaut : si l'utilisateur n'a pas deja choisi une ville en lien ou en session,
     on verifie la ville d'attache de son profil puis on la devine par son adresse IP. */
  useEffect(() => {
    if (villeActive) return;
    let annule = false;

    void Promise.all([toutesLesVilles(), villeDattache(), ouJeSuisAvecSecours()]).then(
      ([villesActives, idProfil, ou]) => {
        if (annule || interactionUtilisateurRef.current) return;
        const slugProfil = idProfil
          ? trouverSlugVilleClub(villesActives.find((v) => v.id === idProfil)?.slug)
          : '';
        const slugResolu = slugProfil || devinerSlugDepuisIp(ou, villesActives);
        if (!slugResolu) return;

        setVilleActive(slugResolu);
        setLieuxOuverts((prev) => ouvrirPremierClubDeLaVille(slugResolu, prev));
        const v = VILLES_CLUBS.find((x) => x.slug === slugResolu);
        if (v) {
          lancerMouvementCarte((c) => {
            c.flyTo({
              center: [v.longitude, v.latitude],
              zoom: 11.5,
              duration: 700,
              essential: true,
            });
          });
        }
      }
    );

    return () => {
      annule = true;
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
    interactionUtilisateurRef.current = true;
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
    interactionUtilisateurRef.current = true;
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
    interactionUtilisateurRef.current = true;
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
    interactionUtilisateurRef.current = true;
    noterVilleDeSession(slugVille || null);
    setVilleActive(slugVille);
    setCadreVisible(null);
    setSelection(null);
    if (!slugVille) {
      lancerMouvementCarte((carte) => {
        carte.fitBounds(CADRES_ZONES[zoneCarte], { padding: 32, maxZoom: 6.5, duration: 650 });
      });
      return;
    }
    setLieuxOuverts((prev) => ouvrirPremierClubDeLaVille(slugVille, prev));
    const v = VILLES_CLUBS.find((x) => x.slug === slugVille);
    if (v) {
      lancerMouvementCarte((carte) => {
        carte.flyTo({ center: [v.longitude, v.latitude], zoom: 11.5, duration: 700, essential: true });
      });
    }
  };

  const centrerSurLieu = (lieu: LieuOuFestival): void => {
    interactionUtilisateurRef.current = true;
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
    interactionUtilisateurRef.current = true;
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
              <div className="lx-bloc-entete-ligne">
                <h2 id="titre-clubs-villes" className="lx-bloc-titre">
                  {t.clubsSectionTitre}
                </h2>
                <span className="lx-badge-classement">{t.lieuClassementFrequentation}</span>
              </div>
              <p className="lx-bloc-soustitre">{t.clubsSectionSousTitre(VILLES_CLUBS.length)}</p>
            </header>

            <div className="lx-groupes">
              {clubsParVille.map(({ ville, pays, clubs }) => {
                const maxCap = Math.max(...clubs.map((c) => c.capacite), 1);
                const filtreActif = Boolean(villeActive || paysActif || requete.trim());
                const cleGroupe = `ville:${ville.slug}`;
                const toutAfficher = filtreActif || groupesDeplies.has(cleGroupe);
                const clubsVisibles = toutAfficher ? clubs : clubs.slice(0, 5);

                return (
                  <article key={ville.slug} className="lx-groupe">
                    <header className="lx-groupe-entete">
                      <div className="lx-groupe-titre-bloc">
                        <h3 className="lx-groupe-titre">
                          {ville.nom[langue]}
                          {pays ? <span className="lx-groupe-pays"> · {pays.nom[langue]}</span> : null}
                        </h3>
                        <span className="lx-groupe-compteur">{t.lieuNClubs(clubs.length)}</span>
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

                    <ol className="lx-palmares">
                      {clubsVisibles.map((club, idx) => {
                        const rang = idx + 1;
                        const estOuvert = lieuxOuverts.has(club.id);
                        const pct = Math.max(14, Math.round((club.capacite / maxCap) * 100));

                        return (
                          <li
                            key={club.id}
                            className={`lx-rang ${estOuvert ? 'est-ouvert' : ''} ${rang <= 3 ? 'est-podium' : ''}`}
                          >
                            <button
                              type="button"
                              className="lx-rang-entete"
                              aria-expanded={estOuvert}
                              onClick={() => basculerLieu(club.id)}
                            >
                              <span className="lx-rang-num">#{String(rang).padStart(2, '0')}</span>
                              <span className="lx-rang-identite">
                                <span className="lx-carte-nom">{club.nom}</span>
                                <span className="lx-carte-meta">
                                  {[
                                    club.ville[langue],
                                    club.annee ? t.lieuDepuis(club.annee) : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                              </span>
                              <span className="lx-rang-apercu-styles" aria-hidden="true">
                                {club.styles.slice(0, 3).map((s) => (
                                  <span key={s} className="lx-tag-apercu">
                                    {s}
                                  </span>
                                ))}
                              </span>
                              <span className="lx-rang-jauge">
                                <span className="lx-capacite">{t.lieuCapacite(club.capacite)}</span>
                                <span className="lx-jauge-piste" aria-hidden="true">
                                  <span className="lx-jauge-barre" style={{ width: `${pct}%` }} />
                                </span>
                              </span>
                              <span className="lx-rang-chevron" aria-hidden="true">
                                <svg
                                  viewBox="0 0 16 16"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M4 6l4 4 4-4" />
                                </svg>
                              </span>
                            </button>

                            {estOuvert && (
                              <div className="lx-rang-corps">
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
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {clubs.length > 5 && !filtreActif && (
                      <button
                        type="button"
                        className="lx-voir-plus"
                        aria-expanded={toutAfficher}
                        onClick={() => basculerGroupe(cleGroupe)}
                      >
                        {toutAfficher
                          ? t.lieuReduireTop5
                          : t.lieuVoirToutClassement(clubs.length - 5, 6, clubs.length)}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 2 : LES MEILLEURS FESTIVALS PAR PAYS (1 000+ PERSONNES) */}
        {festivalsParPays.length > 0 && (
          <section className="lx-bloc" aria-labelledby="titre-festivals-pays">
            <header className="lx-bloc-entete">
              <div className="lx-bloc-entete-ligne">
                <h2 id="titre-festivals-pays" className="lx-bloc-titre">
                  {t.festivalsSectionTitre}
                </h2>
                <span className="lx-badge-classement lx-badge-classement-festival">
                  {t.lieuClassementFrequentation}
                </span>
              </div>
              <p className="lx-bloc-soustitre">{t.festivalsSectionSousTitre(PAYS_LIEUX.length)}</p>
            </header>

            <div className="lx-groupes">
              {festivalsParPays.map(({ pays, festivals }) => {
                const maxCap = Math.max(...festivals.map((f) => f.capacite), 1);
                const filtreActif = Boolean(villeActive || paysActif || requete.trim());
                const cleGroupe = `pays:${pays.code}`;
                const toutAfficher = filtreActif || groupesDeplies.has(cleGroupe);
                const festivalsVisibles = toutAfficher ? festivals : festivals.slice(0, 5);

                return (
                  <article key={pays.code} className="lx-groupe">
                    <header className="lx-groupe-entete">
                      <div className="lx-groupe-titre-bloc">
                        <h3 className="lx-groupe-titre">{pays.nom[langue]}</h3>
                        <span className="lx-groupe-compteur lx-groupe-compteur-festival">
                          {t.lieuNFestivals(festivals.length)}
                        </span>
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

                    <ol className="lx-palmares">
                      {festivalsVisibles.map((fest, idx) => {
                        const rang = idx + 1;
                        const estOuvert = lieuxOuverts.has(fest.id);
                        const pct = Math.max(14, Math.round((fest.capacite / maxCap) * 100));

                        return (
                          <li
                            key={fest.id}
                            className={`lx-rang lx-rang-festival ${estOuvert ? 'est-ouvert' : ''} ${rang <= 3 ? 'est-podium' : ''}`}
                          >
                            <button
                              type="button"
                              className="lx-rang-entete"
                              aria-expanded={estOuvert}
                              onClick={() => basculerLieu(fest.id)}
                            >
                              <span className="lx-rang-num lx-rang-num-festival">
                                #{String(rang).padStart(2, '0')}
                              </span>
                              <span className="lx-rang-identite">
                                <span className="lx-carte-nom">{fest.nom}</span>
                                <span className="lx-carte-meta">
                                  {[
                                    fest.ville[langue],
                                    fest.mois ? fest.mois[langue] : null,
                                    fest.annee ? t.lieuDepuis(fest.annee) : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                              </span>
                              <span className="lx-rang-apercu-styles" aria-hidden="true">
                                {fest.styles.slice(0, 3).map((s) => (
                                  <span key={s} className="lx-tag-apercu">
                                    {s}
                                  </span>
                                ))}
                              </span>
                              <span className="lx-rang-jauge">
                                <span className="lx-capacite lx-capacite-festival">
                                  {t.lieuCapacite(fest.capacite)}
                                </span>
                                <span className="lx-jauge-piste" aria-hidden="true">
                                  <span
                                    className="lx-jauge-barre lx-jauge-barre-festival"
                                    style={{ width: `${pct}%` }}
                                  />
                                </span>
                              </span>
                              <span className="lx-rang-chevron" aria-hidden="true">
                                <svg
                                  viewBox="0 0 16 16"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M4 6l4 4 4-4" />
                                </svg>
                              </span>
                            </button>

                            {estOuvert && (
                              <div className="lx-rang-corps">
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
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {festivals.length > 5 && !filtreActif && (
                      <button
                        type="button"
                        className="lx-voir-plus lx-voir-plus-festival"
                        aria-expanded={toutAfficher}
                        onClick={() => basculerGroupe(cleGroupe)}
                      >
                        {toutAfficher
                          ? t.lieuReduireTop5
                          : t.lieuVoirToutClassement(festivals.length - 5, 6, festivals.length)}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <PiedDePage />
    </div>
  );
}
