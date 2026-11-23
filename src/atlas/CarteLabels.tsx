/* LA CARTE MONDIALE DES MAISONS MERES DES LABELS ELECTRONIQUES.
 *
 * Mika, le 23 novembre 2026 : « je veux que tu fasses une map aussi pour
 * indiquer ou se trouvent les maisons meres des labels meme si c'est
 * international, par exemple VRSTL Records est international pour les
 * artistes mais c'est base a Montreal pour l'instant donc Canada ».
 *
 * Rendu WebGL natif via MapLibre GL (regroupement automatique a l'echelle
 * mondiale, deploiement individuel de chaque maison mere au zoom ville). */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, LngLatBoundsLike, Map as CarteGL } from 'maplibre-gl';
import { creerCarte } from './fond-de-carte.ts';
import { LogoLabel } from './LogoLabel.tsx';
import { lieuMaisonMere, type EntreeLabel } from '../lib/labels.ts';
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

const SOURCE_ID = 'maisons-meres-labels';

interface PropsCarteLabels {
  readonly entrees: readonly EntreeLabel[];
  readonly totalGlobal: number;
  readonly nbPaysGlobal: number;
  readonly filtreActif: boolean;
  readonly slugCible: string | null;
}

export function CarteLabels({
  entrees,
  totalGlobal,
  nbPaysGlobal,
  filtreActif,
  slugCible,
}: PropsCarteLabels) {
  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<CarteGL | null>(null);
  const preteRef = useRef(false);
  const [zone, setZone] = useState<ZoneCarte>('monde');
  const [selection, setSelection] = useState<EntreeLabel | null>(null);

  const geolocalisees = useMemo(
    () => entrees.filter((e): e is EntreeLabel & { readonly g: readonly [number, number] } => Boolean(e.g)),
    [entrees]
  );

  const parSlug = useMemo(() => new Map(geolocalisees.map((e) => [e.s, e])), [geolocalisees]);
  const parSlugRef = useRef(parSlug);
  parSlugRef.current = parSlug;

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: geolocalisees.map((e) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [e.g[1], e.g[0]],
        },
        properties: {
          s: e.s,
          n: e.n,
        },
      })),
    }),
    [geolocalisees]
  );
  const geojsonRef = useRef(geojson);
  geojsonRef.current = geojson;

  /* Montage initial de MapLibre et des couches WebGL de regroupement. */
  useEffect(() => {
    const el = conteneurRef.current;
    if (!el) return;

    let carte: CarteGL | null = null;
    try {
      carte = creerCarte(el, [22, -12], 1.45);
      carte.setRenderWorldCopies(false);
      carte.setMinZoom(0.6);
      carteRef.current = carte;
    } catch {
      /* Environnement sans WebGL (tests jsdom) : la galerie reste intacte. */
      return;
    }

    const installerCouches = (): void => {
      if (!carte || preteRef.current || carte.getSource(SOURCE_ID)) return;
      preteRef.current = true;

      /* On reutilise la police deja servie par le style OpenFreeMap pour les
         compteurs de grappes et les noms de maisons meres. */
      const coucheTexte = carte
        .getStyle()
        ?.layers?.find((l): l is Extract<typeof l, { type: 'symbol' }> => l.type === 'symbol');
      const police = (coucheTexte?.layout?.['text-font'] as string[] | undefined) ?? ['Noto Sans Bold'];

      carte.addSource(SOURCE_ID, {
        type: 'geojson',
        data: geojsonRef.current,
        cluster: true,
        clusterMaxZoom: 9,
        clusterRadius: 36,
      });

      carte.addLayer({
        id: 'lbc-grappes',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#ffc503',
          'circle-radius': ['step', ['get', 'point_count'], 13, 10, 17, 40, 21, 100, 25],
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
          'text-field': '{point_count_abbreviated}',
          'text-font': police,
          'text-size': 11,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#000000',
        },
      });

      carte.addLayer({
        id: 'lbc-pins',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#ffc503',
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4.5, 8, 6.5, 13, 8.5],
          'circle-stroke-width': 1.8,
          'circle-stroke-color': '#000000',
        },
      });

      carte.addLayer({
        id: 'lbc-pin-selection',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 's'], ''],
        paint: {
          'circle-color': '#ffe43e',
          'circle-radius': 11,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      carte.addLayer({
        id: 'lbc-noms',
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 10.2,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'n'],
          'text-font': police,
          'text-size': 11.5,
          'text-offset': [0, 1.15],
          'text-anchor': 'top',
          'text-optional': true,
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
        const coords =
          f?.geometry?.type === 'Point' ? (f.geometry.coordinates as [number, number]) : null;
        const src = carte.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        if (clusterId === undefined || !coords || !src) return;
        void src.getClusterExpansionZoom(clusterId).then((zoomCible) => {
          carte?.easeTo({ center: coords, zoom: Math.min(zoomCible + 0.5, 14), duration: 480 });
        });
      });

      carte.on('click', 'lbc-pins', (ev) => {
        const f = ev.features?.[0];
        const s = f?.properties?.['s'] as string | undefined;
        if (!s) return;
        const entree = parSlugRef.current.get(s) ?? null;
        setSelection(entree);
        if (entree && carte && carte.getZoom() < 9.5) {
          carte.easeTo({ center: [entree.g[1], entree.g[0]], zoom: 11.5, duration: 520 });
        }
      });

      for (const idCouche of ['lbc-grappes', 'lbc-pins']) {
        carte.on('mouseenter', idCouche, () => {
          if (carte) carte.getCanvas().style.cursor = 'pointer';
        });
        carte.on('mouseleave', idCouche, () => {
          if (carte) carte.getCanvas().style.cursor = '';
        });
      }

      carte.fitBounds(CADRES_ZONES.monde, { padding: 30, duration: 0 });
    };

    carte.on('load', installerCouches);
    if (carte.isStyleLoaded()) installerCouches();

    return () => {
      preteRef.current = false;
      carte?.remove();
      carteRef.current = null;
    };
  }, []);

  /* Mise a jour reactive des points quand l'utilisateur cherche ou filtre par pays. */
  useEffect(() => {
    const carte = carteRef.current;
    if (!carte || !preteRef.current) return;
    const src = carte.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(geojson);

    if (geolocalisees.length === 1) {
      const unique = geolocalisees[0];
      if (unique) {
        setSelection(unique);
        carte.flyTo({ center: [unique.g[1], unique.g[0]], zoom: 12.5, duration: 650, essential: true });
      }
      return;
    }

    if (filtreActif && geolocalisees.length > 1) {
      let minLng = 180;
      let maxLng = -180;
      let minLat = 90;
      let maxLat = -90;
      for (const e of geolocalisees) {
        const [lat, lng] = e.g;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      if (Math.abs(maxLng - minLng) < 0.15 && Math.abs(maxLat - minLat) < 0.15) {
        carte.flyTo({ center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], zoom: 11.2, duration: 600, essential: true });
      } else {
        carte.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 48, maxZoom: 11.5, duration: 600 }
        );
      }
    }
  }, [geojson, geolocalisees, filtreActif]);

  /* Surbrillance du point selectionne sur la carte. */
  useEffect(() => {
    const carte = carteRef.current;
    if (!carte || !preteRef.current || !carte.getLayer('lbc-pin-selection')) return;
    carte.setFilter('lbc-pin-selection', ['==', ['get', 's'], selection?.s ?? '']);
  }, [selection]);

  /* Ouverture directe d'une maison mere depuis sa fiche (?carte=<slug>). */
  useEffect(() => {
    if (!slugCible) return;
    const entree = parSlug.get(slugCible);
    if (!entree) return;
    setSelection(entree);
    const id = window.setTimeout(() => {
      conteneurRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      carteRef.current?.flyTo({
        center: [entree.g[1], entree.g[0]],
        zoom: 13,
        duration: 750,
        essential: true,
      });
    }, 250);
    return () => window.clearTimeout(id);
  }, [slugCible, parSlug]);

  const allerZone = (z: ZoneCarte): void => {
    setZone(z);
    carteRef.current?.fitBounds(CADRES_ZONES[z], { padding: 32, duration: 550 });
  };

  const lieuSelection = selection
    ? lieuMaisonMere(selection.v, selection.p, selection.q === 1, langue)
    : null;

  return (
    <div className="lbg-section lbc-bloc">
      <div className="lbc-entete">
        <div className="lbc-titres">
          <h2 className="lb-titre">{t.labelsCarteTitre}</h2>
          <p className="lb-note">{t.labelsCarteSousTitre(totalGlobal, nbPaysGlobal)}</p>
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

      <div className="lbc-cadre-wrap">
        <div ref={conteneurRef} className="lbc-cadre" />
        {selection && (
          <aside className="lbc-fiche" aria-live="polite">
            <LogoLabel nom={selection.n} url={selection.l} />
            <div className="lbc-fiche-texte">
              <strong className="lbc-fiche-nom">{selection.n}</strong>
              {lieuSelection && <span className="lbc-fiche-lieu">{t.labelMaisonMere(lieuSelection)}</span>}
              <span className="lbc-fiche-meta">
                {[
                  selection.a ? t.labelFonde(selection.a) : null,
                  selection.c > 0 ? t.labelResultat(selection.c) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <a className="lbc-fiche-lien" href={`#/labels/${selection.s}`}>
                {t.labelVoirFiche}
              </a>
            </div>
            <button
              type="button"
              className="lbc-fiche-fermer"
              aria-label={t.fermer}
              onClick={() => setSelection(null)}
            >
              ×
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
