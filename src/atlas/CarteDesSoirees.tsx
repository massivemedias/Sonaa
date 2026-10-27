/* LA CARTE DES SOIREES, dans le calendrier, a la place de la liste.
 *
 * Mika, le 27 octobre 2026 : « une carte avec OpenStreetMap, un truc simple
 * mais cool, une carte des events », pour Montreal et chaque ville que
 * SONAA propose. Elle montre ce que montre la liste, avec les memes filtres
 * (la tranche, les styles, la recherche) : une pastille par salle, son
 * nombre de soirees dedans, et celles de ce soir qui battent.
 *
 * CHARGEE A LA DEMANDE. MapLibre et sa feuille de style ne pesent rien sur
 * le reste du site : ce module n'est importe que quand on ouvre la carte.
 *
 * LE FOND DE CARTE, les rues sombres et le zoom au pincement sont dans
 * fond-de-carte.ts, partages avec l'itineraire d'une fiche. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { LngLatBounds, Marker, type Map as CarteGL } from 'maplibre-gl';
import type { Soiree } from '../lib/agenda.ts';
import type { Ville } from '../lib/ville-active.ts';
import { lieuxASituer, salles, situerLesLieux, type Point } from '../lib/carte.ts';
import { cleDuJour } from '../lib/fenetre-agenda.ts';
import { ImageDeSoiree } from './AfficheGeneree.tsx';
import { t } from '../langue/langue.ts';
import { creerCarte, lngLat } from './fond-de-carte.ts';
import { ItineraireSurLaCarte } from './Itineraire.tsx';

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
  const carte = useRef<CarteGL | null>(null);
  const reperes = useRef<Marker[]>([]);
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
  /* LE TRAJET SE DESSINE SUR CETTE CARTE, sans quitter le site. Changer de
     salle le referme. */
  const [enRoute, setEnRoute] = useState(false);
  const [panneau, setPanneau] = useState<HTMLElement | null>(null);
  useEffect(() => setEnRoute(false), [choisie]);

  /* LA CARTE, une fois par ville : le parent la remonte quand la ville
     change (key). */
  useEffect(() => {
    if (!boite.current) return;
    const m = creerCarte(boite.current, centre);
    m.on('click', () => setChoisie(null));
    carte.current = m;
    return () => {
      m.remove();
      carte.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* LES PASTILLES. Leur taille suit le nombre de soirees, a la racine pour
     qu'une salle de vingt dates n'ecrase pas le quartier. Le nom de la salle
     arrive de sources exterieures : il passe par textContent, jamais par du
     HTML. */
  useEffect(() => {
    const m = carte.current;
    if (!m) return;
    for (const r of reperes.current) r.remove();
    reperes.current = [];
    const ceSoir = cleDuJour(new Date());
    for (const s of liste) {
      const n = s.soirees.length;
      const taille = Math.round(24 + Math.min(16, Math.sqrt(n - 1) * 6));
      const vif = s.soirees.some((x) => x.date.slice(0, 10) === ceSoir);
      const nom = s.nom ?? t.lieuNonAnnonce;
      const bouton = document.createElement('div');
      bouton.className = 'carte-repere';
      bouton.tabIndex = 0;
      bouton.setAttribute('role', 'button');
      bouton.setAttribute('aria-label', t.carteSalleEtNombre(nom, n));
      const pin = document.createElement('span');
      pin.className = ['carte-pin', vif ? 'carte-pin-vif' : '', s.cle === choisie ? 'carte-pin-choisi' : ''].filter(Boolean).join(' ');
      pin.style.setProperty('--t', `${taille}px`);
      pin.textContent = n > 1 ? String(n) : '';
      const bulle = document.createElement('span');
      bulle.className = 'carte-bulle';
      bulle.textContent = nom;
      bouton.append(pin, bulle);
      /* DES SALLES SE CHEVAUCHENT AU CENTRE-VILLE. Un clic sur un paquet
         rapproche d'abord la carte sur lui ; un clic sur une salle seule
         l'ouvre. */
      const ouvrir = (): void => {
        if (m.getZoom() < 17) {
          const ici = m.project(lngLat(s.point));
          const voisines = liste.filter((x) => x.cle !== s.cle && taille > m.project(lngLat(x.point)).dist(ici));
          if (voisines.length > 0) {
            const cadre = new LngLatBounds();
            for (const x of [s, ...voisines]) cadre.extend(lngLat(x.point));
            m.fitBounds(cadre, { padding: 120, maxZoom: 17, duration: 500 });
            return;
          }
        }
        setChoisie(s.cle);
      };
      bouton.addEventListener('click', (e) => {
        e.stopPropagation();
        ouvrir();
      });
      bouton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') setChoisie(s.cle);
      });
      reperes.current.push(new Marker({ element: bouton }).setLngLat(lngLat(s.point)).addTo(m));
    }
  }, [liste, choisie]);

  /* LE CADRAGE suit l'ensemble des salles, pas la salle choisie : choisir
     ne doit pas faire sauter la carte. */
  const empreinte = liste.map((s) => s.cle).join('|');
  useEffect(() => {
    const m = carte.current;
    if (!m) return;
    if (liste.length === 0) {
      if (centre) m.jumpTo({ center: lngLat(centre), zoom: 12 });
      return;
    }
    const cadre = new LngLatBounds();
    for (const s of liste) cadre.extend(lngLat(s.point));
    m.fitBounds(cadre, { padding: 48, maxZoom: 15, duration: 0 });
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
        <section ref={setPanneau} className="carte-panneau" aria-label={salle.nom ?? t.lieuNonAnnonce}>
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
          {enRoute ? (
            <>
              <button type="button" className="carte-panneau-retour" onClick={() => setEnRoute(false)}>
                {`← ${t.itineraireRetour}`}
              </button>
              <ItineraireSurLaCarte carte={carte.current} destination={salle.point} masque={panneau} />
            </>
          ) : (
            <>
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
              <button type="button" className="carte-itineraire" onClick={() => setEnRoute(true)}>
                {t.carteItineraire}
              </button>
            </>
          )}
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
