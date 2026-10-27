/* LE TRAJET JUSQU'A UNE SALLE, SUR LA CARTE DE SONAA. Voir lib/itineraire.ts
 * et docs/adr/ADR-108-itineraire-dans-le-site.md.
 *
 * Une seule mecanique pour deux endroits : le panneau d'une salle sur la
 * carte des soirees, et la fiche d'une soiree (ItineraireSoiree.tsx). La
 * position suit le visiteur tant que le trajet est ouvert : on peut marcher
 * jusqu'a la salle la carte a la main. Le trajet n'est recalcule que si l'on
 * s'est eloigne de plus de 300 metres de son point de depart. */

import { useEffect, useRef, useState } from 'react';
import { LngLatBounds, Marker, type GeoJSONSource, type Map as CarteGL, type PaddingOptions } from 'maplibre-gl';
import type { Point } from '../lib/carte.ts';
import {
  MODES,
  calculerItineraire,
  distanceKm,
  distanceLisible,
  dureeLisible,
  modeParDefaut,
  type Itineraire as Trajet,
  type Mode,
} from '../lib/itineraire.ts';
import { langue, t } from '../langue/langue.ts';
import { lngLat } from './fond-de-carte.ts';

const LOCALE = langue === 'fr' ? 'fr-CA' : 'en-CA';
/* La teinte de l'accent, en clair : le dessin de la carte ne lit pas les
   variables CSS. */
const ACCENT = '#FF7A1A';
const SOURCE = 'sonaa-itineraire';
const REDEPART_KM = 0.3;

type EtatPosition = 'attente' | 'refusee' | 'connue';

function useItineraire(destination: Point | null) {
  const [position, setPosition] = useState<Point | null>(null);
  const [etat, setEtat] = useState<EtatPosition>('attente');
  const [mode, setMode] = useState<Mode | null>(null);
  const [trajets, setTrajets] = useState<Partial<Record<Mode, Trajet | 'echec'>>>({});
  const [depart, setDepart] = useState<Point | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setEtat('refusee');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPosition([p.coords.latitude, p.coords.longitude]);
        setEtat('connue');
      },
      () => setEtat((e) => (e === 'connue' ? e : 'refusee')),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  /* Le point de depart : la premiere position, puis la position du moment
     si l'on s'est eloigne. Les trajets deja calcules partent alors a la
     corbeille. */
  useEffect(() => {
    if (!position || !destination) return;
    if (depart && distanceKm(depart, position) < REDEPART_KM) return;
    setDepart(position);
    setTrajets({});
    setMode((m) => m ?? modeParDefaut(position, destination));
  }, [position, destination, depart]);

  useEffect(() => {
    if (!depart || !destination || !mode || trajets[mode]) return;
    const ctrl = new AbortController();
    void calculerItineraire(depart, destination, mode, ctrl.signal).then((r) => {
      if (!ctrl.signal.aborted) setTrajets((x) => ({ ...x, [mode]: r ?? 'echec' }));
    });
    return () => ctrl.abort();
  }, [depart, destination, mode, trajets]);

  return { position, etat, mode, setMode, trajets, trajet: mode ? trajets[mode] : undefined };
}

/** Le trace, la position du visiteur, et le cadrage sur les deux. */
function useTrace(
  carte: CarteGL | null,
  position: Point | null,
  trajet: Trajet | 'echec' | undefined,
  mode: Mode | null,
  marges: () => PaddingOptions | number
): void {
  useEffect(() => {
    if (!carte) return;
    const poser = (): void => {
      if (carte.getSource(SOURCE)) return;
      carte.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      /* Sous les noms de rues, pour qu'ils restent lisibles. */
      const avant = carte.getLayer('highway_name_other') ? 'highway_name_other' : undefined;
      carte.addLayer({ id: `${SOURCE}-bord`, type: 'line', source: SOURCE, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#121110', 'line-width': 9 } }, avant);
      carte.addLayer({ id: SOURCE, type: 'line', source: SOURCE, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ACCENT, 'line-width': 5 } }, avant);
    };
    if (carte.isStyleLoaded()) poser();
    else carte.once('idle', poser);
    return () => {
      carte.off('idle', poser);
      if (!carte.getStyle()) return;
      for (const id of [SOURCE, `${SOURCE}-bord`]) if (carte.getLayer(id)) carte.removeLayer(id);
      if (carte.getSource(SOURCE)) carte.removeSource(SOURCE);
    };
  }, [carte]);

  /* Le trace change avec le mode ; a pied, il est pointille. */
  useEffect(() => {
    if (!carte) return;
    const dessiner = (): void => {
      const source = carte.getSource<GeoJSONSource>(SOURCE);
      if (!source) return;
      const ligne = trajet && trajet !== 'echec' ? trajet.ligne.map((c) => [c[0], c[1]]) : [];
      source.setData({ type: 'FeatureCollection', features: ligne.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ligne } }] : [] });
      carte.setPaintProperty(SOURCE, 'line-dasharray', mode === 'pied' ? [0.6, 1.6] : [1, 0]);
      if (ligne.length > 1) {
        const cadre = new LngLatBounds();
        for (const c of ligne) cadre.extend([c[0] ?? 0, c[1] ?? 0]);
        carte.fitBounds(cadre, { padding: marges(), maxZoom: 17, duration: 600 });
      }
    };
    if (carte.getSource(SOURCE)) dessiner();
    else carte.once('idle', dessiner);
    return () => {
      carte.off('idle', dessiner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carte, trajet, mode]);

  const vous = useRef<Marker | null>(null);
  useEffect(() => {
    if (!carte || !position) return;
    if (!vous.current) {
      const point = document.createElement('div');
      point.className = 'iti-vous';
      point.setAttribute('role', 'img');
      point.setAttribute('aria-label', t.itineraireVous);
      vous.current = new Marker({ element: point }).setLngLat(lngLat(position)).addTo(carte);
    } else vous.current.setLngLat(lngLat(position));
  }, [carte, position]);
  useEffect(
    () => () => {
      vous.current?.remove();
      vous.current = null;
    },
    [carte]
  );
}

const MARGE = 56;

/** Le trajet vers `destination`, dessine sur `carte`, et son panneau :
    les modes avec leur duree, le resume, les etapes. `masque` est ce qui
    couvre la carte (le panneau d'une salle) : le cadrage le contourne. */
export function ItineraireSurLaCarte({ carte, destination, masque }: { carte: CarteGL | null; destination: Point | null; masque?: HTMLElement | null }) {
  const { position, etat, mode, setMode, trajets, trajet } = useItineraire(destination);
  useTrace(carte, position, trajet, mode, () => {
    if (!masque || !carte) return MARGE;
    const m = masque.getBoundingClientRect();
    const c = carte.getContainer().getBoundingClientRect();
    /* Large, le panneau est a gauche ; etroit, il occupe le bas. */
    return m.width < c.width * 0.8 ? { top: MARGE, right: MARGE, bottom: MARGE, left: MARGE + m.right - c.left } : { top: MARGE, right: MARGE, left: MARGE, bottom: MARGE + c.bottom - m.top };
  });

  if (etat !== 'connue') return <p className="iti-note">{etat === 'refusee' ? t.itinerairePositionRefusee : t.itineraireDemandePosition}</p>;
  return (
    <div className="iti">
      <div className="iti-modes" role="radiogroup" aria-label={t.itineraireModes}>
        {MODES.map((m) => {
          const r = trajets[m];
          return (
            <button key={m} type="button" role="radio" aria-checked={mode === m} className="iti-mode" onClick={() => setMode(m)}>
              <span>{t.itineraireMode(m)}</span>
              {r && r !== 'echec' && <span className="iti-mode-duree">{dureeLisible(r.duree)}</span>}
            </button>
          );
        })}
      </div>
      {trajet === undefined && <p className="iti-note">{t.itineraireCalcul}</p>}
      {trajet === 'echec' && <p className="iti-note">{t.itineraireEchec}</p>}
      {trajet && trajet !== 'echec' && (
        <>
          <p className="iti-resume">
            <strong>{dureeLisible(trajet.duree)}</strong> · {distanceLisible(trajet.distance, LOCALE)}
          </p>
          <details className="iti-etapes">
            <summary>{t.itineraireEtapes}</summary>
            <ol>
              {trajet.etapes.map((e, i) => (
                <li key={i}>
                  <span>{t.etape(e.type, e.sens, e.rue, e.sortie)}</span>
                  {e.distance > 0 && e.type !== 'arrive' && <span className="iti-etape-distance">{distanceLisible(e.distance, LOCALE)}</span>}
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
      <p className="iti-confidentialite">{t.itineraireConfidentialite}</p>
    </div>
  );
}
