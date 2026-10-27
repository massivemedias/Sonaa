/* LA CARTE DES SOIREES, dans le calendrier, a la place de la liste.
 *
 * Mika, le 27 octobre 2026 : « une carte avec OpenStreetMap, un truc simple
 * mais cool, une carte des events », pour Montreal et chaque ville que
 * SONAA propose. Elle montre ce que montre la liste, avec les memes filtres
 * (la tranche, les styles, la recherche) : une pastille par salle, son
 * nombre de soirees dedans, et celles de ce soir qui battent.
 *
 * CHARGEE A LA DEMANDE. Leaflet et sa feuille de style ne pesent rien sur
 * le reste du site : ce module n'est importe que quand on ouvre la carte.
 *
 * LES TUILES SONT CELLES D'OPENSTREETMAP, passees en negatif par un filtre
 * pour tenir dans un site sombre. Aucune cle, aucun compte ; l'attribution
 * est en bas a droite, comme le demande leur licence.
 *
 * LA MOLETTE NE ZOOME PAS TANT QU'ON N'A PAS CLIQUE. Une carte qui avale le
 * defilement de la page est le premier piege d'une carte dans une page. */

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './carte.css';
import type { Soiree } from '../lib/agenda.ts';
import type { Ville } from '../lib/ville-active.ts';
import { lieuxASituer, salles, situerLesLieux, type Point } from '../lib/carte.ts';
import { cleDuJour } from '../lib/fenetre-agenda.ts';
import { ImageDeSoiree } from './AfficheGeneree.tsx';
import { t } from '../langue/langue.ts';

const TUILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export function CarteDesSoirees({
  soirees,
  ville,
  fuseau,
  quand,
  onOuvrir,
}: {
  soirees: readonly Soiree[];
  ville: Ville;
  fuseau: string;
  /** « sam. 1 nov. - 23 h », la meme ecriture que la liste. */
  quand: (s: Soiree) => string;
  onOuvrir: (id: string) => void;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map | null>(null);
  const couche = useRef<L.LayerGroup | null>(null);
  const [choisie, setChoisie] = useState<string | null>(null);

  const centre = useMemo<Point | null>(
    () => (ville.latitude != null && ville.longitude != null ? [Number(ville.latitude), Number(ville.longitude)] : null),
    [ville.latitude, ville.longitude]
  );

  /* Les salles que RA ne situe pas, demandees une fois a la passerelle. */
  const demande = useMemo(() => lieuxASituer(soirees), [soirees]);
  const [situes, setSitues] = useState<{ demande: typeof demande; points: (Point | null)[] }>({ demande: [], points: [] });
  useEffect(() => {
    if (!centre || demande.length === 0) return;
    let vivant = true;
    void situerLesLieux({ slug: ville.slug, country_code: ville.country_code }, centre, demande).then((points) => {
      if (vivant) setSitues({ demande, points });
    });
    return () => {
      vivant = false;
    };
  }, [demande, centre, ville.slug, ville.country_code]);

  const { salles: liste, sansLieu } = useMemo(
    () => salles(soirees, situes.demande, situes.points, centre),
    [soirees, situes, centre]
  );
  const salle = liste.find((s) => s.cle === choisie) ?? null;

  /* LA CARTE, une fois par ville : le parent la remonte quand la ville
     change (key). */
  useEffect(() => {
    if (!boite.current) return;
    const m = L.map(boite.current, {
      center: centre ? [centre[0], centre[1]] : [20, 0],
      zoom: centre ? 12 : 2,
      zoomControl: false,
      scrollWheelZoom: false,
    });
    L.control.zoom({ position: 'topright', zoomInTitle: t.carteZoomPlus, zoomOutTitle: t.carteZoomMoins }).addTo(m);
    L.tileLayer(TUILES, { maxZoom: 19, attribution: t.carteAttribution, className: 'carte-tuiles' }).addTo(m);
    m.attributionControl.setPrefix(false);
    m.on('click', () => {
      m.scrollWheelZoom.enable();
      setChoisie(null);
    });
    m.on('mouseout', () => m.scrollWheelZoom.disable());
    couche.current = L.layerGroup().addTo(m);
    carte.current = m;
    return () => {
      m.remove();
      carte.current = null;
      couche.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* LES PASTILLES. Leur taille suit le nombre de soirees, a la racine pour
     qu'une salle de vingt dates n'ecrase pas le quartier. Le nom de la salle
     arrive de sources exterieures : il passe par textContent, jamais par du
     HTML. */
  useEffect(() => {
    const c = couche.current;
    if (!c) return;
    c.clearLayers();
    const ceSoir = cleDuJour(new Date());
    for (const s of liste) {
      const n = s.soirees.length;
      const taille = Math.round(24 + Math.min(16, Math.sqrt(n - 1) * 6));
      const vif = s.soirees.some((x) => x.date.slice(0, 10) === ceSoir);
      const classes = ['carte-pin', vif ? 'carte-pin-vif' : '', s.cle === choisie ? 'carte-pin-choisi' : ''].filter(Boolean).join(' ');
      const icone = L.divIcon({
        className: 'carte-pin-boite',
        html: `<span class="${classes}" style="--t:${taille}px">${n > 1 ? n : ''}</span>`,
        iconSize: [taille, taille],
        iconAnchor: [taille / 2, taille / 2],
      });
      const nom = s.nom ?? t.lieuNonAnnonce;
      const repere = L.marker(s.point as [number, number], { icon: icone, title: t.carteSalleEtNombre(nom, n), riseOnHover: true, keyboard: true });
      const bulle = document.createElement('span');
      bulle.textContent = nom;
      repere.bindTooltip(bulle, { direction: 'top', offset: [0, -taille / 2], className: 'carte-bulle' });
      /* DES SALLES SE CHEVAUCHENT AU CENTRE-VILLE. Un clic sur un paquet
         rapproche d'abord la carte sur lui ; un clic sur une salle seule
         l'ouvre. */
      repere.on('click', () => {
        const m = carte.current;
        if (m && m.getZoom() < 17) {
          const ici = m.latLngToContainerPoint(s.point as [number, number]);
          const voisines = liste.filter((x) => {
            if (x.cle === s.cle) return false;
            const ecart = m.latLngToContainerPoint(x.point as [number, number]).distanceTo(ici);
            return taille > ecart;
          });
          if (voisines.length > 0) {
            m.flyToBounds(L.latLngBounds([s, ...voisines].map((x) => x.point as [number, number])).pad(0.6), { maxZoom: 17, duration: 0.5 });
            return;
          }
        }
        setChoisie(s.cle);
      });
      repere.on('keypress', (e) => {
        if ((e as L.LeafletKeyboardEvent).originalEvent.key === 'Enter') setChoisie(s.cle);
      });
      c.addLayer(repere);
    }
  }, [liste, choisie]);

  /* LE CADRAGE suit l'ensemble des salles, pas la salle choisie : choisir
     ne doit pas faire sauter la carte. */
  const empreinte = liste.map((s) => s.cle).join('|');
  useEffect(() => {
    const m = carte.current;
    if (!m) return;
    if (liste.length === 0) {
      if (centre) m.setView([centre[0], centre[1]], 12, { animate: false });
      return;
    }
    const cadre = L.latLngBounds(liste.map((s) => s.point as [number, number]));
    m.fitBounds(cadre.pad(0.12), { maxZoom: 15, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empreinte, centre]);

  useEffect(() => {
    if (!choisie) return;
    /* Echap ferme d'abord la fiche ouverte par-dessus, s'il y en a une ;
       la salle reste choisie, on y revient. */
    const fermer = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) setChoisie(null);
    };
    /* En capture : on passe avant la fiche, qui ecoute en bulle et se
       retire aussitot. */
    window.addEventListener('keydown', fermer, true);
    return () => window.removeEventListener('keydown', fermer, true);
  }, [choisie]);

  const vifs = liste.some((s) => s.soirees.some((x) => x.date.slice(0, 10) === cleDuJour(new Date())));
  const tousCeSoir = liste.every((s) => s.soirees.every((x) => x.date.slice(0, 10) === cleDuJour(new Date())));

  return (
    <div className="carte">
      <div ref={boite} className="carte-boite" role="region" aria-label={t.carteDesSoireesA(ville.name)} />
      {salle && (
        <section className="carte-panneau" aria-label={salle.nom ?? t.lieuNonAnnonce}>
          <div className="carte-panneau-tete">
            <div>
              <h3 className="carte-panneau-titre">{salle.nom ?? t.lieuNonAnnonce}</h3>
              {salle.adresse && <p className="carte-adresse">{salle.adresse}</p>}
            </div>
            <button type="button" className="carte-fermer" onClick={() => setChoisie(null)} aria-label={t.fermerCourt}>
              <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <ul className="carte-soirees">
            {salle.soirees.map((s) => (
              <li key={s.id}>
                <button type="button" className="carte-soiree" onClick={() => onOuvrir(s.id)}>
                  <ImageDeSoiree soiree={s} fuseau={fuseau} variante="ligne" className="cal-ligne-affiche" />
                  <span className="carte-soiree-texte">
                    <span className="carte-soiree-quand">{quand(s)}</span>
                    <span className="carte-soiree-titre">{s.titre}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <a
            className="carte-itineraire"
            href={`https://www.google.com/maps/dir/?api=1&destination=${salle.point[0]},${salle.point[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            {t.carteItineraire}
          </a>
        </section>
      )}
      <p className="carte-pied">
        {vifs && !tousCeSoir && (
          <span className="carte-legende">
            <span className="carte-legende-pin" aria-hidden="true" />
            {t.carteCeSoirBat}
          </span>
        )}
        {sansLieu > 0 && <span>{t.carteSansLieu(sansLieu)}</span>}
      </p>
    </div>
  );
}
