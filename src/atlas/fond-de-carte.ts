/* LE FOND DE CARTE DE SONAA, partage par la carte des soirees et par
 * l'itineraire d'une fiche. Voir docs/adr/ADR-108-itineraire-dans-le-site.md.
 *
 * UN PLAN DE RUES, PAS UNE PHOTO. Mika, le 27 octobre 2026 : « plus visible,
 * plus par rue que par satellite ». Les tuiles d'OpenStreetMap passees en
 * negatif rendaient les rues noires sur fond noir. Ce sont les tuiles
 * vectorielles d'OpenFreeMap (libres, sans cle, sans limite, usage
 * commercial permis), dans leur style sombre retouche ici.
 *
 * ON PINCE DANS LA CARTE, LA MOLETTE FAIT DEFILER LA PAGE. Une carte qui
 * avale le defilement est le premier piege d'une carte dans une page ; le
 * pincement, lui, ne veut dire que zoomer. Au doigt, deux doigts deplacent
 * la carte et un seul fait defiler la page. */

import { Map as CarteGL, NavigationControl, setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Point } from '../lib/carte.ts';
import { t } from '../langue/langue.ts';

/* LE DESSIN DES TUILES TOURNE DANS UN WORKER que MapLibre cherche a cote de
   son propre fichier. Vite renomme et regroupe tout : on lui donne donc
   l'adresse du worker tel que Vite l'a construit. */
import adresseDuWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import './carte.css';

setWorkerUrl(adresseDuWorker);

const STYLE = 'https://tiles.openfreemap.org/styles/dark';

/* LES TEINTES DU PLAN. Le style sombre d'origine dessine les rues a peine
   plus claires que le fond ; ici elles montent d'un cran par importance, et
   le fond prend la teinte du site. */
const RETOUCHES: Record<string, Record<string, unknown>> = {
  background: { 'background-color': '#121110' },
  water: { 'fill-color': '#132231' },
  waterway: { 'line-color': '#132231' },
  landuse_park: { 'fill-color': '#141c15' },
  landcover_wood: { 'fill-color': '#141c15' },
  landuse_residential: { 'fill-color': '#151413' },
  building: { 'fill-color': '#1b1a19' },
  highway_path: { 'line-color': '#2b2a29' },
  highway_minor: { 'line-color': '#34322f', 'line-opacity': 1 },
  highway_major_casing: { 'line-color': '#1f1e1d' },
  highway_major_inner: { 'line-color': '#4a4743' },
  highway_major_subtle: { 'line-color': '#4a4743' },
  highway_motorway_casing: { 'line-color': '#1f1e1d' },
  highway_motorway_inner: { 'line-color': '#5c5853' },
  highway_motorway_subtle: { 'line-color': '#5c5853' },
  railway: { 'line-color': '#2e2c2a' },
  railway_minor: { 'line-color': '#2e2c2a' },
  railway_transit: { 'line-color': '#2e2c2a' },
  highway_name_other: { 'text-color': '#9a958f', 'text-halo-color': '#121110', 'text-halo-width': 1.2 },
  highway_name_motorway: { 'text-color': '#aaa59e' },
  water_name: { 'text-color': '#6f8aa3' },
};
const PLACES = /^place_/;

function retoucher(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((couche) => {
      const r = RETOUCHES[couche.id] ?? (PLACES.test(couche.id) ? { 'text-color': '#c4beb6', 'text-halo-color': '#121110' } : null);
      return r && 'paint' in couche ? ({ ...couche, paint: { ...couche.paint, ...r } } as typeof couche) : couche;
    }),
  };
}

/** [latitude, longitude] devient [longitude, latitude], l'ordre de MapLibre. */
export const lngLat = (p: Point): [number, number] => [p[1], p[0]];


/** Une carte dans la matiere du site : rues sombres, zoom au pincement,
    pas de rotation, commandes de zoom en haut a droite. */
export function creerCarte(conteneur: HTMLElement, centre: Point | null, zoom = 12): CarteGL {
  const m = new CarteGL({
    container: conteneur,
    style: { version: 8, sources: {}, layers: [] },
    center: centre ? lngLat(centre) : [0, 20],
    zoom: centre ? zoom : 1.5,
    maxZoom: 18,
    /* L'attribution vient des tuiles elles-memes : OpenFreeMap,
       OpenMapTiles, OpenStreetMap. */
    attributionControl: { compact: true },
    cooperativeGestures: true,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    locale: {
      'NavigationControl.ZoomIn': t.carteZoomPlus,
      'NavigationControl.ZoomOut': t.carteZoomMoins,
      'CooperativeGesturesHandler.WindowsHelpText': t.carteAideMolette,
      'CooperativeGesturesHandler.MacHelpText': t.carteAideMac,
      'CooperativeGesturesHandler.MobileHelpText': t.carteAideDoigts,
    },
  });
  m.setStyle(STYLE, { diff: false, transformStyle: (_avant, apres) => retoucher(apres) });
  m.touchZoomRotate.disableRotation();
  m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
  return m;
}
