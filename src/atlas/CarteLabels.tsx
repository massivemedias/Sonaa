/* LA CARTE DES LABELS, VILLE PAR VILLE.
 *
 * Mika, le 23 novembre 2026 : « je veux que tu fasses une map aussi pour
 * indiquer ou se trouvent les maisons meres des labels meme si c'est
 * international, par exemple VRSTL Records est international pour les
 * artistes mais c'est base a Montreal pour l'instant donc Canada ».
 *
 * Puis, le meme jour, devant la premiere version : « ca veut etre trop
 * precis, on doit juste rester sur les villes et pas les rues, donc quand on
 * arrive dans une ville on a la liste bien presentee ».
 *
 * La carte ne dessine donc que des villes : un point par ville, sa taille
 * suit son nombre de labels, et elle ne descend pas sous le zoom d'une
 * agglomeration. Choisir une ville ouvre, a cote de la carte, la liste de
 * ses labels, du plus connu au moins connu. Sans ville choisie, la colonne
 * range les villes par nombre de labels. Le regroupement est dans
 * src/lib/villes-des-labels.ts. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExpressionSpecification, GeoJSONSource, LngLatBoundsLike, Map as CarteGL } from 'maplibre-gl';
import { creerCarte } from './fond-de-carte.ts';
import { LogoLabel } from './LogoLabel.tsx';
import { nomDuPays, type EntreeLabel } from '../lib/labels.ts';
import { lieuxDesLabels, type LieuDeLabels } from '../lib/villes-des-labels.ts';
import { langue, t } from '../langue/langue.ts';

type ZoneCarte = 'monde' | 'montreal' | 'ameriques' | 'europe' | 'asie-afrique';

const CADRES_ZONES: Record<ZoneCarte, LngLatBoundsLike> = {
  monde: [
    [-132, -42],
    [156, 64],
  ],
  montreal: [
    [-75.9, 45.15],
    [-71.0, 47.05],
  ],
  ameriques: [
    [-126, -36],
    [-42, 54],
  ],
  europe: [
    [-10.5, 36.0],
    [31.5, 61.5],
  ],
  'asie-afrique': [
    [-10, -36],
    [155, 52],
  ],
};

const SOURCE_ID = 'villes-des-labels';

/* PAS PLUS PRES QU'UNE AGGLOMERATION. A ce zoom, Montreal et sa rive sud
   tiennent dans le cadre ; plus pres, on lirait des rues, et un point de
   ville n'a rien a dire d'une rue. */
const ZOOM_MAX = 8;
const ZOOM_VILLE = 6.5;
const ZOOM_PAYS = 4.5;
const VILLES_EN_TETE = 15;
const ACCENT = '#ffc503';

/* LE RAYON D'UNE VILLE SUIT SON NOMBRE DE LABELS, par paliers : un label,
   deux, cinq, dix, trente, cent. Le decalage du nom, en em, suit le rayon. */
const RAYON_VILLE: ExpressionSpecification = ['step', ['get', 'n'], 7, 2, 9, 5, 11, 10, 14, 30, 18, 100, 22];
const DECALAGE_NOM: ExpressionSpecification = ['step', ['get', 'n'], 0.95, 2, 1.1, 5, 1.3, 10, 1.55, 30, 1.85, 100, 2.2];

const nomDuLieu = (l: LieuDeLabels): string =>
  l.ville ? (langue === 'en' ? l.ville.en : l.ville.fr) : l.pays ? nomDuPays(l.pays, langue) : '';

const regionDuLieu = (l: LieuDeLabels): string | null =>
  !l.ville ? t.labelsCarteSansVille : l.quebec ? t.labelQuebecCanada : l.pays ? nomDuPays(l.pays, langue) : null;

interface PropsCarteLabels {
  /** Tous les labels, pour les nombres du chapeau. */
  readonly toutes: readonly EntreeLabel[];
  /** Ceux que la recherche et le filtre par pays laissent passer. */
  readonly entrees: readonly EntreeLabel[];
  readonly filtreActif: boolean;
  readonly slugCible: string | null;
}

export function CarteLabels({ toutes, entrees, filtreActif, slugCible }: PropsCarteLabels) {
  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const panneauRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<CarteGL | null>(null);
  const preteRef = useRef(false);
  const [zone, setZone] = useState<ZoneCarte>('monde');
  const [choix, setChoix] = useState<string | null>(null);
  const [labelMis, setLabelMis] = useState<string | null>(null);
  const [indexComplet, setIndexComplet] = useState(false);

  const chapeau = useMemo(() => {
    const { villes } = lieuxDesLabels(toutes);
    return {
      labels: villes.reduce((n, v) => n + v.labels.length, 0),
      villes: villes.length,
      pays: new Set(villes.map((v) => v.pays).filter(Boolean)).size,
    };
  }, [toutes]);

  const { villes, sansVille } = useMemo(() => lieuxDesLabels(entrees), [entrees]);
  const parId = useMemo(() => new Map([...villes, ...sansVille].map((l) => [l.id, l])), [villes, sansVille]);
  const lieuChoisi = choix ? (parId.get(choix) ?? null) : null;
  const lieuChoisiRef = useRef(lieuChoisi);
  lieuChoisiRef.current = lieuChoisi;

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: villes.map((l) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [l.centre[1], l.centre[0]] },
        properties: { id: l.id, nom: nomDuLieu(l), n: l.labels.length },
      })),
    }),
    [villes]
  );
  const geojsonRef = useRef(geojson);
  geojsonRef.current = geojson;

  /* Ouvre la liste d'un lieu et y amene la carte, sans descendre sous la ville. */
  const choisir = (l: LieuDeLabels | null, slug: string | null = null): void => {
    setChoix(l?.id ?? null);
    setLabelMis(slug);
    if (panneauRef.current) panneauRef.current.scrollTop = 0;
    const carte = carteRef.current;
    if (!l || !carte) return;
    const zoom = l.ville ? Math.min(Math.max(carte.getZoom(), ZOOM_VILLE), ZOOM_MAX) : ZOOM_PAYS;
    carte.easeTo({ center: [l.centre[1], l.centre[0]], zoom, duration: 600, essential: true });
  };
  const choisirRef = useRef(choisir);
  choisirRef.current = choisir;
  const parIdRef = useRef(parId);
  parIdRef.current = parId;

  /* L'anneau et le nom en couleur sur la ville choisie. */
  const marquerChoix = (carte: CarteGL, id: string): void => {
    if (!carte.getLayer('lbc-ville-choisie')) return;
    carte.setFilter('lbc-ville-choisie', ['==', ['get', 'id'], id]);
    carte.setPaintProperty('lbc-villes-noms', 'text-color', ['case', ['==', ['get', 'id'], id], ACCENT, '#e7e7e7']);
  };
  const marquerChoixRef = useRef(marquerChoix);
  marquerChoixRef.current = marquerChoix;

  /* Montage de MapLibre et des couches de villes. */
  useEffect(() => {
    const el = conteneurRef.current;
    if (!el) return;

    let carte: CarteGL | null = null;
    try {
      carte = creerCarte(el, [22, -12], 1.45);
      carte.setRenderWorldCopies(false);
      carte.setMinZoom(0.6);
      carte.setMaxZoom(ZOOM_MAX);
      carteRef.current = carte;
    } catch {
      /* Environnement sans WebGL (tests jsdom) : la liste des villes reste. */
      return;
    }

    const installerCouches = (): void => {
      if (!carte || preteRef.current || carte.getSource(SOURCE_ID)) return;
      preteRef.current = true;

      /* La police deja servie par le style OpenFreeMap. */
      const coucheTexte = carte
        .getStyle()
        ?.layers?.find((l): l is Extract<typeof l, { type: 'symbol' }> => l.type === 'symbol');
      const police = (coucheTexte?.layout?.['text-font'] as string[] | undefined) ?? ['Noto Sans Bold'];

      carte.addSource(SOURCE_ID, {
        type: 'geojson',
        data: geojsonRef.current,
        cluster: true,
        clusterMaxZoom: 5,
        clusterRadius: 44,
        clusterProperties: { total: ['+', ['get', 'n']] },
      });

      /* A l'echelle du monde, les villes proches se regroupent : le chiffre
         est la somme de leurs labels. */
      carte.addLayer({
        id: 'lbc-grappes',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ACCENT,
          'circle-radius': ['step', ['get', 'total'], 15, 10, 18, 50, 22, 200, 27],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000',
        },
      });
      carte.addLayer({
        id: 'lbc-grappes-n',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['to-string', ['get', 'total']],
          'text-font': police,
          'text-size': 11.5,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: { 'text-color': '#000000' },
      });

      /* L'anneau de la ville choisie, sous son point. */
      carte.addLayer({
        id: 'lbc-ville-choisie',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-color': 'rgba(0, 0, 0, 0)',
          'circle-radius': ['+', RAYON_VILLE, 5],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      carte.addLayer({
        id: 'lbc-villes',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ACCENT,
          'circle-radius': RAYON_VILLE,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000',
        },
      });
      carte.addLayer({
        id: 'lbc-villes-n',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['>=', ['get', 'n'], 2]],
        layout: {
          'text-field': ['to-string', ['get', 'n']],
          'text-font': police,
          'text-size': 10.5,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: { 'text-color': '#000000' },
      });
      /* Le nom de la ville a cote de son point. Les grandes villes passent
         d'abord quand deux noms se chevauchent. */
      carte.addLayer({
        id: 'lbc-villes-noms',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'nom'],
          'text-font': police,
          'text-size': 12.5,
          'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
          'text-radial-offset': DECALAGE_NOM,
          'text-justify': 'auto',
          'symbol-sort-key': ['*', -1, ['get', 'n']],
        },
        paint: {
          'text-color': '#e7e7e7',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        },
      });

      carte.on('click', 'lbc-grappes', (ev) => {
        if (!carte) return;
        const f = ev.features?.[0];
        const clusterId = f?.properties?.['cluster_id'] as number | undefined;
        const coords = f?.geometry?.type === 'Point' ? (f.geometry.coordinates as [number, number]) : null;
        const src = carte.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        if (clusterId === undefined || !coords || !src) return;
        void src.getClusterExpansionZoom(clusterId).then((zoomCible) => {
          carte?.easeTo({ center: coords, zoom: Math.min(zoomCible + 0.3, ZOOM_MAX), duration: 480 });
        });
      });

      carte.on('click', 'lbc-villes', (ev) => {
        const id = ev.features?.[0]?.properties?.['id'] as string | undefined;
        const lieu = id ? parIdRef.current.get(id) : undefined;
        if (lieu) choisirRef.current(lieu);
      });

      for (const idCouche of ['lbc-grappes', 'lbc-villes']) {
        carte.on('mouseenter', idCouche, () => {
          if (carte) carte.getCanvas().style.cursor = 'pointer';
        });
        carte.on('mouseleave', idCouche, () => {
          if (carte) carte.getCanvas().style.cursor = '';
        });
      }

      /* Une ville deja choisie avant que le fond soit charge (arrivee depuis
         la fiche d'un label) : la carte s'y pose au lieu de montrer le monde. */
      const deja = lieuChoisiRef.current;
      if (deja) {
        marquerChoixRef.current(carte, deja.id);
        carte.jumpTo({ center: [deja.centre[1], deja.centre[0]], zoom: deja.ville ? ZOOM_VILLE : ZOOM_PAYS });
      } else {
        carte.fitBounds(CADRES_ZONES.monde, { padding: 30, duration: 0 });
      }
    };

    carte.on('load', installerCouches);
    if (carte.isStyleLoaded()) installerCouches();

    return () => {
      preteRef.current = false;
      carte?.remove();
      carteRef.current = null;
    };
  }, []);

  /* La recherche et le filtre par pays redessinent les villes. Un seul lieu
     restant s'ouvre de lui-meme. */
  useEffect(() => {
    const carte = carteRef.current;
    if (carte && preteRef.current) {
      const src = carte.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (src) src.setData(geojson);
    }
    if (!filtreActif) return;
    const lieux = [...villes, ...sansVille];
    if (lieux.length === 1 && lieux[0]) {
      choisirRef.current(lieux[0]);
      return;
    }
    if (!carte || villes.length < 2) return;
    let minLng = 180;
    let maxLng = -180;
    let minLat = 90;
    let maxLat = -90;
    for (const v of villes) {
      const [lat, lng] = v.centre;
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    carte.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 56, maxZoom: ZOOM_VILLE, duration: 600 }
    );
  }, [geojson, villes, sansVille, filtreActif]);

  useEffect(() => {
    const carte = carteRef.current;
    if (carte && preteRef.current) marquerChoixRef.current(carte, lieuChoisi?.id ?? '');
  }, [lieuChoisi]);

  /* Depuis la fiche d'un label (?carte=<slug>) : sa ville s'ouvre, le label
     y est marque. */
  useEffect(() => {
    if (!slugCible) return;
    const lieu = [...parIdRef.current.values()].find((l) => l.labels.some((e) => e.s === slugCible));
    if (!lieu) return;
    const id = window.setTimeout(() => {
      conteneurRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      choisirRef.current(lieu, slugCible);
    }, 250);
    return () => window.clearTimeout(id);
  }, [slugCible]);

  /* Le label marque reste visible dans la liste. */
  useEffect(() => {
    const panneau = panneauRef.current;
    const ligne = panneau?.querySelector<HTMLElement>('[aria-current="true"]');
    if (panneau && ligne) panneau.scrollTop = Math.max(0, ligne.offsetTop - panneau.clientHeight / 3);
  }, [labelMis, lieuChoisi]);

  const allerZone = (z: ZoneCarte): void => {
    setZone(z);
    /* Montreal & Quebec ouvre la liste de Montreal : c'est la ville qu'on y vient voir. */
    const montreal = z === 'montreal' ? villes.find((v) => v.id === 'montreal') : undefined;
    setChoix(montreal?.id ?? null);
    setLabelMis(null);
    carteRef.current?.fitBounds(CADRES_ZONES[z], { padding: 32, duration: 550 });
  };

  const villesMontrees = indexComplet ? villes : villes.slice(0, VILLES_EN_TETE);
  const ligneDeLieu = (l: LieuDeLabels) => (
    <li key={l.id}>
      <button type="button" className="lbc-ville" onClick={() => choisir(l)}>
        <span className="lbc-ville-nom">{nomDuLieu(l)}</span>
        {l.ville && <span className="lbc-ville-pays">{regionDuLieu(l)}</span>}
        <span className="lbc-ville-n">{l.labels.length}</span>
      </button>
    </li>
  );

  return (
    <div className="lbg-section lbc-bloc">
      <div className="lbc-entete">
        <div className="lbc-titres">
          <h2 className="lb-titre">{t.labelsCarteTitre}</h2>
          <p className="lb-note">{t.labelsCarteSousTitre(chapeau.labels, chapeau.villes, chapeau.pays)}</p>
        </div>
        <div className="lbc-zones" role="group" aria-label={t.labelsCarteTitre}>
          {(
            [
              ['monde', t.labelsZoneMonde],
              ['montreal', t.labelsZoneMontreal],
              ['ameriques', t.labelsZoneAmeriques],
              ['europe', t.labelsZoneEurope],
              ['asie-afrique', t.labelsZoneAsieAfrique],
            ] as const
          ).map(([cle, libelle]) => (
            <button
              key={cle}
              type="button"
              className="lbc-zone"
              aria-pressed={zone === cle && !filtreActif}
              onClick={() => allerZone(cle)}
            >
              {libelle}
            </button>
          ))}
        </div>
      </div>

      <div className="lbc-corps">
        <div ref={conteneurRef} className="lbc-cadre" />
        <div ref={panneauRef} className="lbc-panneau" aria-live="polite">
          {lieuChoisi ? (
            <>
              <button type="button" className="lbc-retour" onClick={() => choisir(null)}>
                {t.labelsCarteRetour}
              </button>
              <h3 className="lbc-lieu-nom">{nomDuLieu(lieuChoisi)}</h3>
              <p className="lbc-lieu-faits">
                {[regionDuLieu(lieuChoisi), t.labelsCarteNombre(lieuChoisi.labels.length)].filter(Boolean).join(' · ')}
              </p>
              <ol className="lbc-labels">
                {lieuChoisi.labels.map((e) => (
                  <li key={e.s} aria-current={e.s === labelMis ? 'true' : undefined}>
                    <a href={`#/labels/${e.s}`}>
                      <LogoLabel nom={e.n} url={e.l} taille="petit" />
                      <span className="lbc-label-nom">{e.n}</span>
                      <span className="lbc-label-faits">
                        {[e.a ? t.labelFonde(e.a) : null, e.c > 0 ? t.labelResultat(e.c) : null].filter(Boolean).join(' · ')}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <h3 className="lbc-index-titre">{t.labelsCarteVilles}</h3>
              {villes.length === 0 && sansVille.length === 0 ? (
                <p className="lb-note">{t.labelsAucun}</p>
              ) : (
                <ol className="lbc-villes">{villesMontrees.map(ligneDeLieu)}</ol>
              )}
              {!indexComplet && villes.length > VILLES_EN_TETE && (
                <button type="button" className="lbc-tout" onClick={() => setIndexComplet(true)}>
                  {t.labelsCarteToutesVilles(villes.length)}
                </button>
              )}
              {(indexComplet || villes.length <= VILLES_EN_TETE) && sansVille.length > 0 && (
                <>
                  <h3 className="lbc-index-titre">{t.labelsCarteSansVille}</h3>
                  <ol className="lbc-villes">{sansVille.map(ligneDeLieu)}</ol>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
