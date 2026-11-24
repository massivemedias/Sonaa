/* LA CARTE DES LABELS, VILLE PAR VILLE, ET LA LISTE D'UNE VILLE.
 *
 * Mika, le 23 novembre 2026 : « je veux que tu fasses une map aussi pour
 * indiquer ou se trouvent les maisons meres des labels meme si c'est
 * international, par exemple VRSTL Records est international pour les
 * artistes mais c'est base a Montreal pour l'instant donc Canada ».
 *
 * Puis, devant la premiere version : « ca veut etre trop precis, on doit
 * juste rester sur les villes et pas les rues, donc quand on arrive dans une
 * ville on a la liste bien presentee », et « les adresses exactes on s'en
 * fout, l'important ce sont les villes et pays ».
 *
 * Et le 24 novembre, devant le nuage de points de Montreal : « des que nous
 * zoomons pour arriver a cette vue, au lieu de cette vue je veux juste une
 * liste ».
 *
 * La carte ne dessine donc que des villes, un point par ville, et elle ne
 * descend jamais a l'echelle des rues : des qu'on zoome jusqu'a une ville,
 * ou qu'on la touche, la carte cede la place a la liste de ses labels. Un
 * bouton ramene la carte. A cote de la carte, une colonne range les villes.
 * Le regroupement est dans src/lib/villes-des-labels.ts. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExpressionSpecification, GeoJSONSource, LngLatBoundsLike, Map as CarteGL } from 'maplibre-gl';
import { creerCarte } from './fond-de-carte.ts';
import { LogoLabel } from './LogoLabel.tsx';
import { nomDuPays, type EntreeLabel } from '../lib/labels.ts';
import { lieuxDesLabels, type LieuDeLabels } from '../lib/villes-des-labels.ts';
import { langue, t } from '../langue/langue.ts';

type ZoneCarte = 'monde' | 'montreal' | 'ameriques' | 'europe' | 'asie-afrique';

const CADRES_ZONES: Record<Exclude<ZoneCarte, 'montreal'>, LngLatBoundsLike> = {
  monde: [
    [-132, -42],
    [156, 64],
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

/* LE ZOOM D'UNE VILLE. A 7,5, une agglomeration remplit le cadre : c'est la
   que la carte devient la liste. Elle ne zoome pas plus pres, il n'y a pas
   de rues a montrer. */
const ZOOM_LISTE = 7.5;
/* En revenant de la liste, la carte se pose sur la region de la ville. */
const ZOOM_RETOUR = 5;
const ZOOM_RETOUR_PAYS = 4;
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
  const blocRef = useRef<HTMLDivElement | null>(null);
  const conteneurRef = useRef<HTMLDivElement | null>(null);
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
  const parIdRef = useRef(parId);
  parIdRef.current = parId;
  /* La liste d'un lieu remplace la carte tant qu'un lieu est choisi. */
  const lieuChoisi = choix ? (parId.get(choix) ?? null) : null;
  /* Ou poser la carte quand elle revient : sur la region du lieu quitte, ou
     sur le cadre d'une zone. Applique une fois la carte de nouveau visible. */
  const retourRef = useRef<{ readonly lieu: LieuDeLabels } | { readonly cadre: LngLatBoundsLike } | null>(null);

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

  /* Ouvre la liste d'un lieu a la place de la carte. */
  const ouvrir = (l: LieuDeLabels, slug: string | null = null): void => {
    setChoix(l.id);
    setLabelMis(slug);
  };
  const ouvrirRef = useRef(ouvrir);
  ouvrirRef.current = ouvrir;

  /* Ferme la liste : la carte revient, posee sur la region du lieu quitte. */
  const revenirALaCarte = (): void => {
    if (lieuChoisi) retourRef.current = { lieu: lieuChoisi };
    setChoix(null);
    setLabelMis(null);
  };

  /* Montage de MapLibre et des couches de villes. */
  useEffect(() => {
    const el = conteneurRef.current;
    if (!el) return;

    let carte: CarteGL | null = null;
    try {
      carte = creerCarte(el, [22, -12], 1.45);
      carte.setRenderWorldCopies(false);
      carte.setMinZoom(0.6);
      carte.setMaxZoom(ZOOM_LISTE);
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
          carte?.easeTo({ center: coords, zoom: Math.min(zoomCible + 0.3, ZOOM_LISTE - 1), duration: 480 });
        });
      });

      carte.on('click', 'lbc-villes', (ev) => {
        const id = ev.features?.[0]?.properties?.['id'] as string | undefined;
        const lieu = id ? parIdRef.current.get(id) : undefined;
        if (lieu) ouvrirRef.current(lieu);
      });

      /* ZOOMER JUSQU'A UNE VILLE OUVRE SA LISTE. Au zoom d'une agglomeration,
         la ville la plus proche du centre du cadre s'ouvre ; s'il n'y en a
         aucune dans le cadre, la carte reste, et elle ne zoome pas plus. */
      carte.on('zoomend', () => {
        if (!carte || carte.getZoom() < ZOOM_LISTE - 0.05 || !carte.getLayer('lbc-villes')) return;
        const centre = carte.project(carte.getCenter());
        let meilleur: { id: string; d: number } | null = null;
        for (const f of carte.queryRenderedFeatures({ layers: ['lbc-villes'] })) {
          const id = f.properties?.['id'] as string | undefined;
          if (!id || f.geometry.type !== 'Point') continue;
          const p = carte.project(f.geometry.coordinates as [number, number]);
          const d = Math.hypot(p.x - centre.x, p.y - centre.y);
          if (!meilleur || d < meilleur.d) meilleur = { id, d };
        }
        const lieu = meilleur ? parIdRef.current.get(meilleur.id) : undefined;
        if (lieu) ouvrirRef.current(lieu);
      });

      for (const idCouche of ['lbc-grappes', 'lbc-villes']) {
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

  /* LE RETOUR A LA CARTE. Cachee pendant la liste, elle reprend sa taille et
     se pose sur la region du lieu quitte, assez loin pour ne pas rouvrir la
     liste aussitot. */
  useEffect(() => {
    if (lieuChoisi) return;
    const carte = carteRef.current;
    const retour = retourRef.current;
    retourRef.current = null;
    if (!carte) return;
    carte.resize();
    if (retour && 'lieu' in retour) {
      const { centre, ville } = retour.lieu;
      carte.jumpTo({ center: [centre[1], centre[0]], zoom: ville ? ZOOM_RETOUR : ZOOM_RETOUR_PAYS });
    } else if (retour) {
      carte.fitBounds(retour.cadre, { padding: 32, duration: 0 });
    }
  }, [lieuChoisi]);

  /* La recherche et le filtre par pays redessinent les villes. Un seul lieu
     restant ouvre sa liste. */
  useEffect(() => {
    const carte = carteRef.current;
    if (carte && preteRef.current) {
      const src = carte.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (src) src.setData(geojson);
    }
    if (!filtreActif) return;
    const lieux = [...villes, ...sansVille];
    if (lieux.length === 1 && lieux[0]) {
      ouvrirRef.current(lieux[0]);
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
      { padding: 56, maxZoom: ZOOM_RETOUR + 1, duration: 600 }
    );
  }, [geojson, villes, sansVille, filtreActif]);

  /* Depuis la fiche d'un label (?carte=<slug>) : la liste de sa ville
     s'ouvre, le label y est marque. */
  useEffect(() => {
    if (!slugCible) return;
    const lieu = [...parIdRef.current.values()].find((l) => l.labels.some((e) => e.s === slugCible));
    if (lieu) ouvrirRef.current(lieu, slugCible);
  }, [slugCible]);

  /* A l'ouverture d'une liste, son titre vient en vue ; un label marque
     vient au milieu de l'ecran. */
  useEffect(() => {
    if (!lieuChoisi) return;
    const id = window.setTimeout(() => {
      const ligne = blocRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
      if (ligne) {
        ligne.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const bloc = blocRef.current;
      if (bloc && bloc.getBoundingClientRect().top < 0) bloc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => window.clearTimeout(id);
  }, [lieuChoisi, labelMis]);

  const allerZone = (z: ZoneCarte): void => {
    setZone(z);
    /* Montreal & Quebec ouvre la liste de Montreal : c'est la ville qu'on y vient voir. */
    if (z === 'montreal') {
      const montreal = villes.find((v) => v.id === 'montreal');
      if (montreal) ouvrir(montreal);
      return;
    }
    if (lieuChoisi) {
      setChoix(null);
      setLabelMis(null);
      retourRef.current = { cadre: CADRES_ZONES[z] };
      return;
    }
    carteRef.current?.fitBounds(CADRES_ZONES[z], { padding: 32, duration: 550 });
  };

  const villesMontrees = indexComplet ? villes : villes.slice(0, VILLES_EN_TETE);
  const ligneDeLieu = (l: LieuDeLabels) => (
    <li key={l.id}>
      <button type="button" className="lbc-ville" onClick={() => ouvrir(l)}>
        <span className="lbc-ville-nom">{nomDuLieu(l)}</span>
        {l.ville && <span className="lbc-ville-pays">{regionDuLieu(l)}</span>}
        <span className="lbc-ville-n">{l.labels.length}</span>
      </button>
    </li>
  );

  return (
    <div ref={blocRef} className="lbg-section lbc-bloc">
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

      {/* La carte reste montee pendant la liste : la rouvrir ne recharge rien. */}
      <div className="lbc-corps" hidden={lieuChoisi !== null}>
        <div ref={conteneurRef} className="lbc-cadre" />
        <div className="lbc-panneau">
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
        </div>
      </div>

      {lieuChoisi && (
        <div className="lbc-liste" aria-live="polite">
          <button type="button" className="lbc-retour" onClick={revenirALaCarte}>
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
        </div>
      )}
    </div>
  );
}
