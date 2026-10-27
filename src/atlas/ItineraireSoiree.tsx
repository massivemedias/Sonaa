/* L'ITINERAIRE DANS LA FICHE D'UNE SOIREE. Voir Itineraire.tsx.
 *
 * Charge a la demande, comme la carte : MapLibre n'entre dans la page que
 * quand on presse « Itineraire ».
 *
 * LA SALLE D'ABORD. Resident Advisor donne sa position ; pour les autres
 * sources, la passerelle la cherche (route api/lieux, voir worker/lieux.ts).
 * Une salle jamais vue n'est pas encore connue a la premiere demande : la
 * recherche part en arriere-plan, et on redemande une fois, quelques
 * secondes plus tard. */

import { useEffect, useRef, useState } from 'react';
import { Marker, type Map as CarteGL } from 'maplibre-gl';
import type { Soiree } from '../lib/agenda.ts';
import type { Ville } from '../lib/ville-active.ts';
import { situerLesLieux, type Point } from '../lib/carte.ts';
import { t } from '../langue/langue.ts';
import { creerCarte, lngLat } from './fond-de-carte.ts';
import { ItineraireSurLaCarte } from './Itineraire.tsx';

const RELANCE_MS = 4500;

export function ItineraireSoiree({ soiree, ville }: { soiree: Soiree; ville: Ville | null }) {
  const connue: Point | null = soiree.lat != null && soiree.lon != null ? [soiree.lat, soiree.lon] : null;
  const [destination, setDestination] = useState<Point | null>(connue);
  const [introuvable, setIntrouvable] = useState(false);

  useEffect(() => {
    if (connue || !ville || ville.latitude == null || ville.longitude == null) {
      if (!connue) setIntrouvable(true);
      return;
    }
    const centre: Point = [Number(ville.latitude), Number(ville.longitude)];
    const lieu = [{ nom: soiree.lieu ?? null, adresse: soiree.adresse ?? null }];
    let vivant = true;
    let minuteur = 0;
    const demander = async (relance: boolean): Promise<void> => {
      const [p] = await situerLesLieux({ slug: ville.slug, country_code: ville.country_code }, centre, lieu);
      if (!vivant) return;
      if (p) setDestination(p);
      else if (relance) minuteur = window.setTimeout(() => void demander(false), RELANCE_MS);
      else setIntrouvable(true);
    };
    void demander(true);
    return () => {
      vivant = false;
      window.clearTimeout(minuteur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soiree.id]);

  const boite = useRef<HTMLDivElement>(null);
  const [carte, setCarte] = useState<CarteGL | null>(null);
  useEffect(() => {
    if (!boite.current || !destination) return;
    const m = creerCarte(boite.current, destination, 15);
    const pin = document.createElement('div');
    pin.className = 'carte-repere';
    const pastille = document.createElement('span');
    pastille.className = 'carte-pin';
    pastille.style.setProperty('--t', '28px');
    pin.append(pastille);
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', soiree.lieu ?? soiree.titre);
    new Marker({ element: pin }).setLngLat(lngLat(destination)).addTo(m);
    setCarte(m);
    return () => {
      setCarte(null);
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  if (!destination) return <p className="iti-note">{introuvable ? t.itineraireSalleIntrouvable : t.itineraireCalcul}</p>;
  return (
    <section className="iti-fiche" aria-label={t.carteItineraire}>
      <div ref={boite} className="iti-fiche-carte" />
      <ItineraireSurLaCarte carte={carte} destination={destination} />
    </section>
  );
}
