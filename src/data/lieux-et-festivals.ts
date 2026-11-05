/* LES MEILLEURS CLUBS (PAR VILLE) ET FESTIVALS (PAR PAYS, 1 000+ PERSONNES).
 *
 * Mika, le 3 novembre 2026 : « une page avec les meilleurs clubs et festivals
 * dans les villes que je propose pour les clubs et les festivals c'est par
 * Pays, faudra faire une recherche avec les meilleurs festivals electro avec
 * une capacite de plus de 1000 personnes et je voudrais aussi que tu fasses
 * une carte interactive mondiale ».
 *
 * Les clubs couvrent les 23 villes du calendrier SONAA (scripts/donnees/villes.json) :
 * chaque ville renvoie directement vers son agenda /soirees/<slug>/.
 * Les festivals sont classes par pays, avec une capacite d'au moins 1 000
 * personnes (ainsi que Be Tulum et Nomade Tulum au Mexique demandes par Mika). */

export interface VilleClub {
  readonly slug: string;
  readonly nom: { readonly fr: string; readonly en: string };
  readonly paysCode: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly aCalendrier?: boolean;
}

export interface PaysLieu {
  readonly code: string;
  readonly nom: { readonly fr: string; readonly en: string };
  readonly latitude: number;
  readonly longitude: number;
}

export interface LieuOuFestival {
  readonly id: string;
  readonly nom: string;
  readonly type: 'club' | 'festival';
  readonly paysCode: string;
  /** Slug parmi les 23 villes de SONAA quand le lieu s'y trouve. */
  readonly villeSlug?: string;
  readonly ville: { readonly fr: string; readonly en: string };
  readonly latitude: number;
  readonly longitude: number;
  readonly capacite: number;
  readonly annee?: number;
  readonly mois?: { readonly fr: string; readonly en: string };
  readonly styles: readonly string[];
  readonly site: string;
  readonly description: { readonly fr: string; readonly en: string };
}

export const PAYS_LIEUX: readonly PaysLieu[] = [
  { code: 'CA', nom: { fr: 'Canada', en: 'Canada' }, latitude: 45.5017, longitude: -73.5673 },
  { code: 'MX', nom: { fr: 'Mexique', en: 'Mexico' }, latitude: 20.2114, longitude: -87.4654 },
  { code: 'US', nom: { fr: 'États-Unis', en: 'United States' }, latitude: 41.8781, longitude: -87.6298 },
  { code: 'DE', nom: { fr: 'Allemagne', en: 'Germany' }, latitude: 52.52, longitude: 13.405 },
  { code: 'NL', nom: { fr: 'Pays-Bas', en: 'Netherlands' }, latitude: 52.3676, longitude: 4.9041 },
  { code: 'GB', nom: { fr: 'Royaume-Uni', en: 'United Kingdom' }, latitude: 51.5074, longitude: -0.1278 },
  { code: 'FR', nom: { fr: 'France', en: 'France' }, latitude: 46.6034, longitude: 2.3488 },
  { code: 'ES', nom: { fr: 'Espagne', en: 'Spain' }, latitude: 41.3874, longitude: 2.1686 },
  { code: 'BE', nom: { fr: 'Belgique', en: 'Belgium' }, latitude: 50.8503, longitude: 4.3517 },
  { code: 'PT', nom: { fr: 'Portugal', en: 'Portugal' }, latitude: 39.823, longitude: -7.239 },
  { code: 'IT', nom: { fr: 'Italie', en: 'Italy' }, latitude: 45.0703, longitude: 7.6869 },
  { code: 'HR', nom: { fr: 'Croatie', en: 'Croatia' }, latitude: 43.8, longitude: 15.64 },
  { code: 'RO', nom: { fr: 'Roumanie', en: 'Romania' }, latitude: 44.241, longitude: 28.621 },
  { code: 'PL', nom: { fr: 'Pologne', en: 'Poland' }, latitude: 50.0647, longitude: 19.945 },
  { code: 'CH', nom: { fr: 'Suisse', en: 'Switzerland' }, latitude: 46.8182, longitude: 8.2275 },
  { code: 'HU', nom: { fr: 'Hongrie', en: 'Hungary' }, latitude: 47.4979, longitude: 19.0402 },
  { code: 'AT', nom: { fr: 'Autriche', en: 'Austria' }, latitude: 47.5162, longitude: 14.5501 },
  { code: 'RS', nom: { fr: 'Serbie', en: 'Serbia' }, latitude: 45.2551, longitude: 19.8452 },
  { code: 'AL', nom: { fr: 'Albanie', en: 'Albania' }, latitude: 40.15, longitude: 19.63 },
  { code: 'JP', nom: { fr: 'Japon', en: 'Japan' }, latitude: 35.6762, longitude: 139.6503 },
  { code: 'AU', nom: { fr: 'Australie', en: 'Australia' }, latitude: -37.8136, longitude: 144.9631 },
  { code: 'BR', nom: { fr: 'Brésil', en: 'Brazil' }, latitude: -23.5505, longitude: -46.6333 },
  { code: 'GR', nom: { fr: 'Grèce', en: 'Greece' }, latitude: 39.6243, longitude: 19.9217 },
  { code: 'MT', nom: { fr: 'Malte', en: 'Malta' }, latitude: 35.8989, longitude: 14.5146 },
  { code: 'MA', nom: { fr: 'Maroc', en: 'Morocco' }, latitude: 31.5085, longitude: -9.7595 },
  { code: 'CZ', nom: { fr: 'Tchéquie', en: 'Czechia' }, latitude: 50.0755, longitude: 14.4378 },
  { code: 'BG', nom: { fr: 'Bulgarie', en: 'Bulgaria' }, latitude: 41.58, longitude: 24.78 },
  { code: 'GE', nom: { fr: 'Géorgie', en: 'Georgia' }, latitude: 41.7151, longitude: 44.8271 },
  { code: 'LT', nom: { fr: 'Lituanie', en: 'Lithuania' }, latitude: 54.6872, longitude: 25.2797 },
  { code: 'CO', nom: { fr: 'Colombie', en: 'Colombia' }, latitude: 4.711, longitude: -74.0721 },
  { code: 'CR', nom: { fr: 'Costa Rica', en: 'Costa Rica' }, latitude: 9.618, longitude: -84.629 },
  { code: 'TH', nom: { fr: 'Thaïlande', en: 'Thailand' }, latitude: 12.9236, longitude: 100.8825 },
  { code: 'ID', nom: { fr: 'Indonésie', en: 'Indonesia' }, latitude: -8.65, longitude: 115.13 },
];

export const VILLES_CLUBS: readonly VilleClub[] = [
  { slug: 'montreal-ca', nom: { fr: 'Montréal', en: 'Montreal' }, paysCode: 'CA', latitude: 45.5017, longitude: -73.5673, aCalendrier: true },
  { slug: 'toronto-ca', nom: { fr: 'Toronto', en: 'Toronto' }, paysCode: 'CA', latitude: 43.6532, longitude: -79.3832, aCalendrier: true },
  { slug: 'vancouver-ca', nom: { fr: 'Vancouver', en: 'Vancouver' }, paysCode: 'CA', latitude: 49.2827, longitude: -123.1207, aCalendrier: true },
  { slug: 'quebec-ca', nom: { fr: 'Québec', en: 'Quebec City' }, paysCode: 'CA', latitude: 46.8139, longitude: -71.208, aCalendrier: true },
  { slug: 'ottawa-ca', nom: { fr: 'Ottawa', en: 'Ottawa' }, paysCode: 'CA', latitude: 45.4215, longitude: -75.6972, aCalendrier: true },
  { slug: 'calgary-ca', nom: { fr: 'Calgary', en: 'Calgary' }, paysCode: 'CA', latitude: 51.0447, longitude: -114.0719, aCalendrier: true },
  { slug: 'winnipeg-ca', nom: { fr: 'Winnipeg', en: 'Winnipeg' }, paysCode: 'CA', latitude: 49.8951, longitude: -97.1384, aCalendrier: true },
  { slug: 'halifax-ca', nom: { fr: 'Halifax', en: 'Halifax' }, paysCode: 'CA', latitude: 44.6488, longitude: -63.5752, aCalendrier: true },
  { slug: 'berlin-de', nom: { fr: 'Berlin', en: 'Berlin' }, paysCode: 'DE', latitude: 52.52, longitude: 13.405, aCalendrier: true },
  { slug: 'londres-gb', nom: { fr: 'Londres', en: 'London' }, paysCode: 'GB', latitude: 51.5074, longitude: -0.1278, aCalendrier: true },
  { slug: 'paris-fr', nom: { fr: 'Paris', en: 'Paris' }, paysCode: 'FR', latitude: 48.8566, longitude: 2.3522, aCalendrier: true },
  { slug: 'montpellier-fr', nom: { fr: 'Montpellier', en: 'Montpellier' }, paysCode: 'FR', latitude: 43.6108, longitude: 3.8767, aCalendrier: true },
  { slug: 'toulouse-fr', nom: { fr: 'Toulouse', en: 'Toulouse' }, paysCode: 'FR', latitude: 43.6047, longitude: 1.4442, aCalendrier: true },
  { slug: 'amsterdam-nl', nom: { fr: 'Amsterdam', en: 'Amsterdam' }, paysCode: 'NL', latitude: 52.3676, longitude: 4.9041, aCalendrier: true },
  { slug: 'barcelone-es', nom: { fr: 'Barcelone', en: 'Barcelona' }, paysCode: 'ES', latitude: 41.3874, longitude: 2.1686, aCalendrier: true },
  { slug: 'newyork-us', nom: { fr: 'New York', en: 'New York' }, paysCode: 'US', latitude: 40.7128, longitude: -74.006, aCalendrier: true },
  { slug: 'losangeles-us', nom: { fr: 'Los Angeles', en: 'Los Angeles' }, paysCode: 'US', latitude: 34.0522, longitude: -118.2437, aCalendrier: true },
  { slug: 'detroit-us', nom: { fr: 'Detroit', en: 'Detroit' }, paysCode: 'US', latitude: 42.3314, longitude: -83.0458, aCalendrier: true },
  { slug: 'chicago-us', nom: { fr: 'Chicago', en: 'Chicago' }, paysCode: 'US', latitude: 41.8781, longitude: -87.6298, aCalendrier: true },
  { slug: 'mexico-mx', nom: { fr: 'Mexico', en: 'Mexico City' }, paysCode: 'MX', latitude: 19.4326, longitude: -99.1332, aCalendrier: true },
  { slug: 'tokyo-jp', nom: { fr: 'Tokyo', en: 'Tokyo' }, paysCode: 'JP', latitude: 35.6762, longitude: 139.6503, aCalendrier: true },
  { slug: 'melbourne-au', nom: { fr: 'Melbourne', en: 'Melbourne' }, paysCode: 'AU', latitude: -37.8136, longitude: 144.9631, aCalendrier: true },
  { slug: 'saopaulo-br', nom: { fr: 'São Paulo', en: 'Sao Paulo' }, paysCode: 'BR', latitude: -23.5505, longitude: -46.6333, aCalendrier: true },
  { slug: 'lyon-fr', nom: { fr: 'Lyon', en: 'Lyon' }, paysCode: 'FR', latitude: 45.764, longitude: 4.8357 },
  { slug: 'marseille-fr', nom: { fr: 'Marseille', en: 'Marseille' }, paysCode: 'FR', latitude: 43.2965, longitude: 5.3698 },
  { slug: 'bordeaux-fr', nom: { fr: 'Bordeaux', en: 'Bordeaux' }, paysCode: 'FR', latitude: 44.8378, longitude: -0.5792 },
  { slug: 'nantes-fr', nom: { fr: 'Nantes', en: 'Nantes' }, paysCode: 'FR', latitude: 47.2184, longitude: -1.5536 },
  { slug: 'lille-fr', nom: { fr: 'Lille', en: 'Lille' }, paysCode: 'FR', latitude: 50.6292, longitude: 3.0573 },
  { slug: 'rennes-fr', nom: { fr: 'Rennes', en: 'Rennes' }, paysCode: 'FR', latitude: 48.1173, longitude: -1.6778 },
  { slug: 'strasbourg-fr', nom: { fr: 'Strasbourg', en: 'Strasbourg' }, paysCode: 'FR', latitude: 48.5734, longitude: 7.7521 },
  { slug: 'nice-fr', nom: { fr: 'Nice', en: 'Nice' }, paysCode: 'FR', latitude: 43.7102, longitude: 7.262 },
  { slug: 'geneve-ch', nom: { fr: 'Genève', en: 'Geneva' }, paysCode: 'CH', latitude: 46.2044, longitude: 6.1432 },
  { slug: 'lausanne-ch', nom: { fr: 'Lausanne', en: 'Lausanne' }, paysCode: 'CH', latitude: 46.5197, longitude: 6.6323 },
  { slug: 'zurich-ch', nom: { fr: 'Zurich', en: 'Zurich' }, paysCode: 'CH', latitude: 47.3769, longitude: 8.5417 },
  { slug: 'bale-ch', nom: { fr: 'Bâle', en: 'Basel' }, paysCode: 'CH', latitude: 47.5596, longitude: 7.5886 },
  { slug: 'milan-it', nom: { fr: 'Milan', en: 'Milan' }, paysCode: 'IT', latitude: 45.4642, longitude: 9.19 },
  { slug: 'turin-it', nom: { fr: 'Turin', en: 'Turin' }, paysCode: 'IT', latitude: 45.0703, longitude: 7.6869 },
  { slug: 'rome-it', nom: { fr: 'Rome', en: 'Rome' }, paysCode: 'IT', latitude: 41.9028, longitude: 12.4964 },
  { slug: 'bologne-it', nom: { fr: 'Bologne & Riviera Romagnole', en: 'Bologna & Romagna Riviera' }, paysCode: 'IT', latitude: 44.4949, longitude: 11.3426 },
  { slug: 'madrid-es', nom: { fr: 'Madrid', en: 'Madrid' }, paysCode: 'ES', latitude: 40.4168, longitude: -3.7038 },
  { slug: 'ibiza-es', nom: { fr: 'Ibiza', en: 'Ibiza' }, paysCode: 'ES', latitude: 38.9067, longitude: 1.4206 },
  { slug: 'valence-es', nom: { fr: 'Valence & Bilbao', en: 'Valencia & Bilbao' }, paysCode: 'ES', latitude: 39.4699, longitude: -0.3763 },
  { slug: 'bruxelles-be', nom: { fr: 'Bruxelles', en: 'Brussels' }, paysCode: 'BE', latitude: 50.8503, longitude: 4.3517 },
  { slug: 'gand-be', nom: { fr: 'Gand', en: 'Ghent' }, paysCode: 'BE', latitude: 51.0543, longitude: 3.7174 },
  { slug: 'anvers-be', nom: { fr: 'Anvers', en: 'Antwerp' }, paysCode: 'BE', latitude: 51.2194, longitude: 4.4025 },
  { slug: 'lisbonne-pt', nom: { fr: 'Lisbonne', en: 'Lisbon' }, paysCode: 'PT', latitude: 38.7223, longitude: -9.1393 },
  { slug: 'porto-pt', nom: { fr: 'Porto', en: 'Porto' }, paysCode: 'PT', latitude: 41.1579, longitude: -8.6291 },
  { slug: 'munich-de', nom: { fr: 'Munich', en: 'Munich' }, paysCode: 'DE', latitude: 48.1351, longitude: 11.582 },
  { slug: 'francfort-de', nom: { fr: 'Francfort & Offenbach', en: 'Frankfurt & Offenbach' }, paysCode: 'DE', latitude: 50.1109, longitude: 8.6821 },
  { slug: 'hambourg-de', nom: { fr: 'Hambourg', en: 'Hamburg' }, paysCode: 'DE', latitude: 53.5511, longitude: 9.9937 },
  { slug: 'cologne-de', nom: { fr: 'Cologne', en: 'Cologne' }, paysCode: 'DE', latitude: 50.9375, longitude: 6.9603 },
  { slug: 'leipzig-de', nom: { fr: 'Leipzig', en: 'Leipzig' }, paysCode: 'DE', latitude: 51.3397, longitude: 12.3731 },
  { slug: 'vienne-at', nom: { fr: 'Vienne', en: 'Vienna' }, paysCode: 'AT', latitude: 48.2082, longitude: 16.3738 },
  { slug: 'prague-cz', nom: { fr: 'Prague', en: 'Prague' }, paysCode: 'CZ', latitude: 50.0755, longitude: 14.4378 },
  { slug: 'varsovie-pl', nom: { fr: 'Varsovie', en: 'Warsaw' }, paysCode: 'PL', latitude: 52.2297, longitude: 21.0122 },
  { slug: 'budapest-hu', nom: { fr: 'Budapest', en: 'Budapest' }, paysCode: 'HU', latitude: 47.4979, longitude: 19.0402 },
  { slug: 'tbilissi-ge', nom: { fr: 'Tbilissi', en: 'Tbilisi' }, paysCode: 'GE', latitude: 41.7151, longitude: 44.8271 },
  { slug: 'manchester-gb', nom: { fr: 'Manchester', en: 'Manchester' }, paysCode: 'GB', latitude: 53.4808, longitude: -2.2426 },
  { slug: 'bristol-gb', nom: { fr: 'Bristol & Glasgow', en: 'Bristol & Glasgow' }, paysCode: 'GB', latitude: 51.4545, longitude: -2.5879 },
  { slug: 'miami-us', nom: { fr: 'Miami', en: 'Miami' }, paysCode: 'US', latitude: 25.7617, longitude: -80.1918 },
  { slug: 'sanfrancisco-us', nom: { fr: 'San Francisco', en: 'San Francisco' }, paysCode: 'US', latitude: 37.7749, longitude: -122.4194 },
  { slug: 'denver-us', nom: { fr: 'Denver & Austin', en: 'Denver & Austin' }, paysCode: 'US', latitude: 39.7392, longitude: -104.9903 },
];

export const LIEUX_ET_FESTIVALS: readonly LieuOuFestival[] = [
  /* ═══ CLUBS : LES 23 VILLES DE SONAA ═══ */

  /* Montréal */
  {
    id: 'stereo-montreal',
    nom: 'Stereo',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'montreal-ca',
    ville: { fr: 'Montréal', en: 'Montreal' },
    latitude: 45.5162,
    longitude: -73.5621,
    capacite: 600,
    annee: 1998,
    styles: ['House', 'Techno', 'Progressive House', 'Deep House'],
    site: 'https://www.stereonightclub.net',
    description: {
      fr: "Temple afterhours fondé en 1998 par Angel Moraes sur la rue Sainte-Catherine, célèbre dans le monde entier pour son système sonore analogique sur mesure, son plancher suspendu et ses marathons sans alcool jusqu'au dimanche midi.",
      en: 'Legendary afterhours temple founded in 1998 by Angel Moraes on Sainte-Catherine Street, world-renowned for its custom analog sound system, sprung wooden dancefloor and alcohol-free marathon sets.',
    },
  },
  {
    id: 'newspeak-montreal',
    nom: 'Newspeak',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'montreal-ca',
    ville: { fr: 'Montréal', en: 'Montreal' },
    latitude: 45.5125,
    longitude: -73.5665,
    capacite: 350,
    annee: 2015,
    styles: ['Techno', 'Indie Dance', 'House', 'Bass'],
    site: 'https://www.newspeakmtl.com',
    description: {
      fr: 'Club intimiste du Quartier des spectacles rue Sainte-Élisabeth, doté d’un plafond lumineux réactif et d’une programmation serrée mêlant techno, indie dance, electro et UK bass.',
      en: 'Intimate club in the Quartier des spectacles on Sainte-Élisabeth Street, featuring a reactive light ceiling and a sharp booking policy spanning techno, indie dance, electro and UK bass.',
    },
  },
  {
    id: 'salon-daome-montreal',
    nom: 'Le Salon Daomé',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'montreal-ca',
    ville: { fr: 'Montréal', en: 'Montreal' },
    latitude: 45.5227,
    longitude: -73.5818,
    capacite: 250,
    annee: 2001,
    styles: ['House', 'Deep House', 'Minimal', 'Techno'],
    site: 'https://lesalondaome.com',
    description: {
      fr: 'Institution du Plateau Mont-Royal depuis 2001, pilier de la scène locale montréalaise où se croisent résidents house, minimal, techno mélodique et invités internationaux en format club de proximité.',
      en: 'Plateau Mont-Royal institution since 2001, a cornerstone of the local Montreal scene hosting house, minimal and melodic techno residents alongside international guests.',
    },
  },
  {
    id: 'sat-montreal',
    nom: 'SAT (Société des arts technologiques)',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'montreal-ca',
    ville: { fr: 'Montréal', en: 'Montreal' },
    latitude: 45.5097,
    longitude: -73.5633,
    capacite: 900,
    annee: 1996,
    styles: ['Techno', 'IDM', 'Ambient', 'Electro'],
    site: 'https://sat.qc.ca',
    description: {
      fr: 'Centre d’arts numériques boulevard Saint-Laurent abritant la Satosphère (dôme immersif à 360 degrés) et un espace club où se tiennent les nuits MUTEK et les soirées techno et expérimentales.',
      en: 'Digital arts center on Saint-Laurent Boulevard housing the Satosphère (360-degree immersive dome) and a ground-floor club venue hosting MUTEK nights and experimental techno events.',
    },
  },

  /* Toronto */
  {
    id: 'coda-toronto',
    nom: 'CODA',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'toronto-ca',
    ville: { fr: 'Toronto', en: 'Toronto' },
    latitude: 43.6656,
    longitude: -79.4114,
    capacite: 650,
    annee: 2014,
    styles: ['Techno', 'House', 'Tech House'],
    site: 'https://codatoronto.com',
    description: {
      fr: 'Référence club de Toronto à l’angle de Bathurst et Bloor, propulsée par un système PK Sound massif dans un sous-sol brut dédié à la techno et à la house.',
      en: 'Flagship Toronto underground club at Bathurst and Bloor, powered by a massive PK Sound system in a raw basement dedicated to techno and house.',
    },
  },
  {
    id: 'standard-time-toronto',
    nom: 'Standard Time',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'toronto-ca',
    ville: { fr: 'Toronto', en: 'Toronto' },
    latitude: 43.6693,
    longitude: -79.4375,
    capacite: 350,
    annee: 2022,
    styles: ['House', 'Disco', 'Breaks', 'Leftfield'],
    site: 'https://standardtime.ca',
    description: {
      fr: 'Espace audiophile et club de Geary Avenue associant écoute haute-fidélité et programmation pointue entre house, disco, breaks, dub et électronique hybride.',
      en: 'Geary Avenue audiophile listening space and club pairing hi-fi acoustics with forward-thinking house, disco, breaks, dub and leftfield bookings.',
    },
  },
  {
    id: 'vertigo-toronto',
    nom: 'Vertigo',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'toronto-ca',
    ville: { fr: 'Toronto', en: 'Toronto' },
    latitude: 43.6596,
    longitude: -79.3788,
    capacite: 400,
    annee: 2016,
    styles: ['Techno', 'Tech House', 'Progressive House'],
    site: 'https://www.instagram.com/vertigotoronto/',
    description: {
      fr: 'Club afterhours souterrain du centre-ville de Toronto rue Gerrard, prisé pour ses longues sessions nocturnes et matinales de techno et de house.',
      en: 'Downtown Toronto underground afterhours club on Gerrard Street, known for late-night and early-morning techno and house sessions.',
    },
  },

  /* Vancouver */
  {
    id: 'red-room-vancouver',
    nom: 'Red Room Ultra Bar',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'vancouver-ca',
    ville: { fr: 'Vancouver', en: 'Vancouver' },
    latitude: 49.2836,
    longitude: -123.1121,
    capacite: 450,
    annee: 2003,
    styles: ['Drum & Bass', 'Bass', 'Dubstep', 'Techno'],
    site: 'https://redroomvancouver.com',
    description: {
      fr: 'Bastion de la bass music sur la côte Ouest canadienne rue Richards, célèbre pour ses samedis Subculture et son mur PK Sound taillé pour la drum and bass et le dubstep.',
      en: 'West Coast bass music bastion on Richards Street, renowned for its long-running Subculture Saturdays and a wall of PK Sound built for drum and bass and dubstep.',
    },
  },
  {
    id: 'village-studios-vancouver',
    nom: 'Village Studios',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'vancouver-ca',
    ville: { fr: 'Vancouver', en: 'Vancouver' },
    latitude: 49.2798,
    longitude: -123.1301,
    capacite: 500,
    annee: 2022,
    styles: ['House', 'Techno', 'Indie Dance'],
    site: 'https://www.villagestudios.life',
    description: {
      fr: 'Caveau brutaliste sous Davie Street réaménagé en club électronique brut pour les collectifs house, techno et rave de Vancouver.',
      en: 'Brutalist underground vault beneath Davie Street transformed into a raw electronic club space for Vancouver house, techno and rave collectives.',
    },
  },

  /* Québec */
  {
    id: 'le-drague-quebec',
    nom: 'Le Drague Cabaret Club',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'quebec-ca',
    ville: { fr: 'Québec', en: 'Quebec City' },
    latitude: 46.8105,
    longitude: -71.2195,
    capacite: 600,
    annee: 1986,
    styles: ['House', 'Disco', 'Dance'],
    site: 'https://ledrague.com',
    description: {
      fr: 'Institution nocturne du quartier Saint-Jean-Baptiste sur plusieurs étages, dotée d’une piste club house et disco active depuis quatre décennies.',
      en: 'Multi-level nightlife institution in the Saint-Jean-Baptiste neighborhood with an active house and disco dancefloor spanning four decades.',
    },
  },
  {
    id: 'anti-bar-quebec',
    nom: 'L’Anti Bar & Spectacles',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'quebec-ca',
    ville: { fr: 'Québec', en: 'Quebec City' },
    latitude: 46.8159,
    longitude: -71.2241,
    capacite: 250,
    annee: 2014,
    styles: ['Electro', 'Techno', 'Industrial'],
    site: 'https://antibarspectacles.com',
    description: {
      fr: 'Salle indépendante de Saint-Roch accueillant les nuits électroniques, synthwave, EBM et techno de la scène alternative de Québec.',
      en: 'Independent Saint-Roch venue hosting electronic, synthwave, EBM and techno nights from Quebec City’s alternative scene.',
    },
  },

  /* Ottawa */
  {
    id: 'city-at-night-ottawa',
    nom: 'City At Night',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'ottawa-ca',
    ville: { fr: 'Ottawa', en: 'Ottawa' },
    latitude: 45.4193,
    longitude: -75.6994,
    capacite: 250,
    annee: 2016,
    styles: ['House', 'Techno', 'Progressive House'],
    site: 'https://www.cityatnight.ca',
    description: {
      fr: 'Repaire house et techno de la rue Slater au centre-ville d’Ottawa, conçu autour de la cabine DJ et des longues nuits underground du week-end.',
      en: 'Intimate house and techno club on Slater Street in downtown Ottawa, built around the DJ booth and extended weekend underground nights.',
    },
  },

  /* Calgary */
  {
    id: 'sub-rosa-calgary',
    nom: 'Sub Rosa',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'calgary-ca',
    ville: { fr: 'Calgary', en: 'Calgary' },
    latitude: 51.0453,
    longitude: -114.0662,
    capacite: 350,
    annee: 2019,
    styles: ['House', 'Techno', 'Deep House', 'Bass'],
    site: 'https://www.subrosayyc.com',
    description: {
      fr: 'Sous-sol intimiste sous le bâtiment historique The Guild sur la 8e Avenue, équipé en PK Sound pour les tournées house, techno et bass de l’Ouest canadien.',
      en: 'Intimate basement club beneath the historic Guild building on 8th Avenue SW, outfitted with PK Sound for house, techno and bass tours.',
    },
  },

  /* Winnipeg */
  {
    id: 'pyramid-cabaret-winnipeg',
    nom: 'Pyramid Cabaret',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'winnipeg-ca',
    ville: { fr: 'Winnipeg', en: 'Winnipeg' },
    latitude: 49.8913,
    longitude: -97.1369,
    capacite: 500,
    annee: 1995,
    styles: ['Techno', 'Drum & Bass', 'House', 'Bass'],
    site: 'https://www.pyramid69.com',
    description: {
      fr: 'Salle historique de Fort Street à Winnipeg accueillant depuis les années 1990 les raves, soirées drum and bass, techno et bass music des Prairies.',
      en: 'Historic Fort Street venue in Winnipeg hosting Prairie raves, drum and bass, techno and bass music nights since the 1990s.',
    },
  },

  /* Halifax */
  {
    id: 'marquee-ballroom-halifax',
    nom: 'The Marquee Ballroom',
    type: 'club',
    paysCode: 'CA',
    villeSlug: 'halifax-ca',
    ville: { fr: 'Halifax', en: 'Halifax' },
    latitude: 44.6524,
    longitude: -63.5831,
    capacite: 650,
    annee: 1999,
    styles: ['House', 'Techno', 'Bass', 'Breaks'],
    site: 'https://www.2037gottingen.ca',
    description: {
      fr: 'Grande salle de Gottingen Street surplombant le Seahorse Tavern, coeur des nuits électroniques et des tournées DJ dans les provinces atlantiques.',
      en: 'Landmark Gottingen Street ballroom above the Seahorse Tavern, the heart of electronic nights and DJ tours in Atlantic Canada.',
    },
  },

  /* Berlin */
  {
    id: 'berghain-berlin',
    nom: 'Berghain / Panorama Bar',
    type: 'club',
    paysCode: 'DE',
    villeSlug: 'berlin-de',
    ville: { fr: 'Berlin', en: 'Berlin' },
    latitude: 52.5111,
    longitude: 13.443,
    capacite: 1500,
    annee: 2004,
    styles: ['Techno', 'House', 'Electro', 'Experimental'],
    site: 'https://www.berghain.berlin',
    description: {
      fr: 'Ancienne centrale thermique de Friedrichshain devenue depuis 2004 l’épicentre mondial de la techno (au rez-de-chaussée) et de la house (au Panorama Bar à l’étage), lors des Klubnächte du samedi soir au lundi matin.',
      en: 'Former Friedrichshain power plant that became the global epicenter of techno (on the main floor) and house (upstairs at Panorama Bar) during its weekend-long Klubnächte.',
    },
  },
  {
    id: 'tresor-berlin',
    nom: 'Tresor',
    type: 'club',
    paysCode: 'DE',
    villeSlug: 'berlin-de',
    ville: { fr: 'Berlin', en: 'Berlin' },
    latitude: 52.5103,
    longitude: 13.4198,
    capacite: 1200,
    annee: 1991,
    styles: ['Techno', 'Detroit Techno', 'Acid Techno', 'Industrial'],
    site: 'https://tresorberlin.com',
    description: {
      fr: 'Fondé en mars 1991 par Dimitri Hegemann dans la salle des coffres de Wertheim avant de rejoindre l’usine Kraftwerk Köpenicker Straße, scellant l’axe historique entre Berlin et Detroit.',
      en: 'Founded in March 1991 by Dimitri Hegemann in the Wertheim vault before moving to the Kraftwerk plant on Köpenicker Straße, forging the historic Berlin-Detroit techno axis.',
    },
  },
  {
    id: 'rso-berlin',
    nom: 'RSO.BERLIN (Revier Südost)',
    type: 'club',
    paysCode: 'DE',
    villeSlug: 'berlin-de',
    ville: { fr: 'Berlin', en: 'Berlin' },
    latitude: 52.4547,
    longitude: 13.5119,
    capacite: 1200,
    annee: 2020,
    styles: ['Techno', 'Hard Techno', 'Electro', 'House'],
    site: 'https://www.rso.berlin',
    description: {
      fr: 'Complexe industriel de Schöneweide créé par l’équipe de Griessmuehle dans une ancienne brasserie, équipé d’un système Kirsch Audio redoutable et d’un vaste jardin en plein air.',
      en: 'Industrial complex in Schöneweide created by the team behind Griessmuehle inside a former brewery, featuring a custom Kirsch Audio system and a sprawling open-air yard.',
    },
  },
  {
    id: 'sisyphos-berlin',
    nom: 'Sisyphos',
    type: 'club',
    paysCode: 'DE',
    villeSlug: 'berlin-de',
    ville: { fr: 'Berlin', en: 'Berlin' },
    latitude: 52.4931,
    longitude: 13.4918,
    capacite: 1500,
    annee: 2009,
    styles: ['Techno', 'House', 'Melodic Techno', 'Minimal'],
    site: 'https://sisyphos-berlin.net',
    description: {
      fr: 'Ancienne fabrique de biscuits pour chiens au bord de la Spree, mêlant la caverne techno du Hammerhalle, le Wintergarten et des espaces sablonneux ouverts tout le week-end sans interruption.',
      en: 'Former dog-biscuit factory near the Spree combining the dark Hammerhalle techno room, Wintergarten and sandy open-air spaces running non-stop all weekend.',
    },
  },

  /* Londres */
  {
    id: 'fabric-londres',
    nom: 'fabric',
    type: 'club',
    paysCode: 'GB',
    villeSlug: 'londres-gb',
    ville: { fr: 'Londres', en: 'London' },
    latitude: 51.5196,
    longitude: -0.1025,
    capacite: 1600,
    annee: 1999,
    styles: ['Techno', 'House', 'Drum & Bass', 'UK Bass'],
    site: 'https://www.fabriclondon.com',
    description: {
      fr: 'Labyrinthe de brique sous les anciens entrepôts frigorifiques de Smithfield à Farringdon, célèbre pour son plancher vibrant (« bodysonic ») en Room 1 et sa série historique de compilations.',
      en: 'Brick labyrinth beneath the former Smithfield cold stores in Farringdon, famous for its vibrating bodysonic dancefloor in Room 1 and its legendary mix series.',
    },
  },
  {
    id: 'fold-londres',
    nom: 'FOLD',
    type: 'club',
    paysCode: 'GB',
    villeSlug: 'londres-gb',
    ville: { fr: 'Londres', en: 'London' },
    latitude: 51.5204,
    longitude: 0.0041,
    capacite: 600,
    annee: 2018,
    styles: ['Techno', 'Electro', 'Industrial', 'Breaks'],
    site: 'https://www.fold.london',
    description: {
      fr: 'Club indépendant fondé par des artistes dans une ancienne imprimerie industrielle de Canning Town, doté d’une licence 24 heures et de ses marathons UNFOLD du dimanche.',
      en: 'Artist-run independent club inside a former industrial printing factory in Canning Town, holding a 24-hour license and hosting the Sunday UNFOLD marathon sessions.',
    },
  },
  {
    id: 'phonox-londres',
    nom: 'Phonox',
    type: 'club',
    paysCode: 'GB',
    villeSlug: 'londres-gb',
    ville: { fr: 'Londres', en: 'London' },
    latitude: 51.4628,
    longitude: -0.1147,
    capacite: 550,
    annee: 2015,
    styles: ['House', 'UK Garage', 'Techno', 'Disco'],
    site: 'https://phonox.co.uk',
    description: {
      fr: 'Club de Brixton conçu autour d’une seule piste centrale et d’un système Funktion-One réglé au millimètre, privilégiant les longs sets étendus.',
      en: 'Brixton club designed around a single dancefloor and a finely tuned Funktion-One sound system, championing extended all-night sets.',
    },
  },

  /* Paris */
  {
    id: 'rex-club-paris',
    nom: 'Rex Club',
    type: 'club',
    paysCode: 'FR',
    villeSlug: 'paris-fr',
    ville: { fr: 'Paris', en: 'Paris' },
    latitude: 48.8706,
    longitude: 2.3477,
    capacite: 800,
    annee: 1988,
    styles: ['Techno', 'House', 'Electro', 'Indie Dance'],
    site: 'https://rexclub.com',
    description: {
      fr: 'Doyen des clubs électroniques parisiens sous le cinéma Le Grand Rex depuis les soirées Wake Up de Laurent Garnier en 1992, équipé d’un mur de diffusion immersif L-Acoustics.',
      en: 'Historic bastion of Parisian club culture beneath the Grand Rex cinema since Laurent Garnier’s Wake Up nights in 1992, equipped with an immersive L-Acoustics sound system.',
    },
  },
  {
    id: 'la-machine-paris',
    nom: 'La Machine du Moulin Rouge',
    type: 'club',
    paysCode: 'FR',
    villeSlug: 'paris-fr',
    ville: { fr: 'Paris', en: 'Paris' },
    latitude: 48.8841,
    longitude: 2.3324,
    capacite: 1200,
    annee: 2010,
    styles: ['Techno', 'House', 'Bass', 'Dark Disco'],
    site: 'https://www.lamachinedumoulinrouge.com',
    description: {
      fr: 'Complexe sur quatre niveaux à Pigalle réunissant Le Central (ancienne chaufferie du Moulin Rouge) et La Chaufferie en sous-sol pour les collectifs techno, bass et dark disco.',
      en: 'Four-level Pigalle venue combining Le Central (the former Moulin Rouge boiler room) and the basement Chaufferie for techno, bass and dark disco collectives.',
    },
  },
  {
    id: 'essaim-paris',
    nom: 'Essaim',
    type: 'club',
    paysCode: 'FR',
    villeSlug: 'paris-fr',
    ville: { fr: 'Paris', en: 'Paris' },
    latitude: 48.8712,
    longitude: 2.3651,
    capacite: 450,
    annee: 2024,
    styles: ['Techno', 'House', 'Minimal', 'Electro'],
    site: 'https://essaim-paris.com',
    description: {
      fr: 'Club audiophile du 10e arrondissement fondé par d’anciens piliers de Concrete, pensé pour une jauge volontairement réduite et une écoute précise.',
      en: 'Audiophile club in the 10th arrondissement founded by veterans of Concrete, designed around a deliberately intimate capacity and precision acoustics.',
    },
  },

  /* Montpellier */
  {
    id: 'dieze-warehouse-montpellier',
    nom: 'Dieze Warehouse',
    type: 'club',
    paysCode: 'FR',
    villeSlug: 'montpellier-fr',
    ville: { fr: 'Montpellier', en: 'Montpellier' },
    latitude: 43.5889,
    longitude: 3.8758,
    capacite: 1500,
    annee: 2016,
    styles: ['Techno', 'Hard Techno', 'Trance', 'House'],
    site: 'https://www.instagram.com/diezewarehouse/',
    description: {
      fr: 'Entrepôt industriel du quartier Marché Gare à Montpellier, navire amiral des grands formats techno, rave et hard techno du sud de la France.',
      en: 'Industrial warehouse in Montpellier’s Marché Gare district, flagship venue for large-scale techno, rave and hard techno events in southern France.',
    },
  },
  {
    id: 'rockstore-montpellier',
    nom: 'Le Rockstore',
    type: 'club',
    paysCode: 'FR',
    villeSlug: 'montpellier-fr',
    ville: { fr: 'Montpellier', en: 'Montpellier' },
    latitude: 43.6067,
    longitude: 3.8814,
    capacite: 850,
    annee: 1986,
    styles: ['Electro', 'Techno', 'House', 'Indie Dance'],
    site: 'https://www.rockstore.fr',
    description: {
      fr: 'Salle mythique à la Cadillac rouge encastrée rue de Verdun, où les nuits électroniques prennent le relais à minuit jusqu’à l’aube.',
      en: 'Iconic venue on Rue de Verdun marked by the red Cadillac embedded in its facade, where electronic club nights run from midnight until dawn.',
    },
  },

  /* Toulouse */
  {
    id: 'le-bikini-toulouse',
    nom: 'Le Bikini',
    type: 'club',
    paysCode: 'FR',
    villeSlug: 'toulouse-fr',
    ville: { fr: 'Toulouse', en: 'Toulouse' },
    latitude: 43.5491,
    longitude: 1.4828,
    capacite: 1500,
    annee: 1983,
    styles: ['Techno', 'Drum & Bass', 'Electro', 'House'],
    site: 'https://lebikini.com',
    description: {
      fr: 'Institution toulousaine au bord du canal du Midi avec piscine extérieure, réputée pour l’acoustique exceptionnelle de sa grande salle lors des nuits techno et bass.',
      en: 'Toulouse institution along the Canal du Midi with an outdoor pool, acclaimed for the acoustics of its main room during all-night techno and bass events.',
    },
  },
  {
    id: 'le-rex-toulouse',
    nom: 'Le Rex de Toulouse',
    type: 'club',
    paysCode: 'FR',
    villeSlug: 'toulouse-fr',
    ville: { fr: 'Toulouse', en: 'Toulouse' },
    latitude: 43.6119,
    longitude: 1.4384,
    capacite: 450,
    annee: 2014,
    styles: ['House', 'Techno', 'Indie Dance'],
    site: 'https://lerextoulouse.com',
    description: {
      fr: 'Ancien cinéma de quartier avenue Honoré-Serres reconverti en club et salle de concerts, coeur des collectifs électroniques du centre-ville de Toulouse.',
      en: 'Former neighborhood cinema on Avenue Honoré-Serres converted into a club and live venue at the center of Toulouse’s electronic collectives.',
    },
  },

  /* Amsterdam */
  {
    id: 'radion-amsterdam',
    nom: 'RADION',
    type: 'club',
    paysCode: 'NL',
    villeSlug: 'amsterdam-nl',
    ville: { fr: 'Amsterdam', en: 'Amsterdam' },
    latitude: 52.3446,
    longitude: 4.8286,
    capacite: 900,
    annee: 2015,
    styles: ['Techno', 'Electro', 'Experimental', 'House'],
    site: 'https://www.radion.amsterdam',
    description: {
      fr: 'Installé dans l’ancien centre dentaire universitaire ACTA, ce club brut à licence 24 heures incarne la scène techno hypnotique et expérimentale d’Amsterdam.',
      en: 'Housed in the former ACTA dental center, this raw 24-hour licensed venue embodies Amsterdam’s hypnotic and experimental techno scene.',
    },
  },
  {
    id: 'shelter-amsterdam',
    nom: 'Shelter Amsterdam',
    type: 'club',
    paysCode: 'NL',
    villeSlug: 'amsterdam-nl',
    ville: { fr: 'Amsterdam', en: 'Amsterdam' },
    latitude: 52.3839,
    longitude: 4.9022,
    capacite: 700,
    annee: 2016,
    styles: ['House', 'Techno', 'Tech House', 'Melodic Techno'],
    site: 'https://shelteramsterdam.nl',
    description: {
      fr: 'Bunker souterrain en béton sous la tour A’DAM sur la rive nord de l’IJ, accessible par traversier gratuit depuis la gare centrale.',
      en: 'Concrete underground bunker beneath the A’DAM Tower on the northern bank of the IJ, reached via free ferry from Amsterdam Central Station.',
    },
  },
  {
    id: 'lofi-amsterdam',
    nom: 'Lofi',
    type: 'club',
    paysCode: 'NL',
    villeSlug: 'amsterdam-nl',
    ville: { fr: 'Amsterdam', en: 'Amsterdam' },
    latitude: 52.3908,
    longitude: 4.8437,
    capacite: 1500,
    annee: 2019,
    styles: ['House', 'Techno', 'Indie Dance', 'Electro'],
    site: 'https://lofi.amsterdam',
    description: {
      fr: 'Ancien dépôt d’autobus de Sloterdijk doté d’une grande cour industrielle (« The Courtyard ») pour les journées en plein air et d’un entrepôt sombre pour la nuit.',
      en: 'Former bus garage in Sloterdijk featuring a sprawling industrial Courtyard for daytime open-airs and a dark warehouse room for the night.',
    },
  },

  /* Barcelone */
  {
    id: 'nitsa-barcelone',
    nom: 'Nitsa Club (Sala Apolo)',
    type: 'club',
    paysCode: 'ES',
    villeSlug: 'barcelone-es',
    ville: { fr: 'Barcelone', en: 'Barcelona' },
    latitude: 41.3744,
    longitude: 2.1696,
    capacite: 1200,
    annee: 1994,
    styles: ['Techno', 'House', 'Electro', 'Indie Dance'],
    site: 'https://www.nitsa.com',
    description: {
      fr: 'Résidence électronique historique de la Sala Apolo depuis trente ans, où les lustres d’époque surplombent l’une des programmations les plus aventureuses d’Europe.',
      en: 'Thirty-year electronic residency inside Sala Apolo, where vintage chandeliers hang over one of Europe’s most forward-thinking club programs.',
    },
  },
  {
    id: 'razzmatazz-barcelone',
    nom: 'Razzmatazz (The Loft)',
    type: 'club',
    paysCode: 'ES',
    villeSlug: 'barcelone-es',
    ville: { fr: 'Barcelone', en: 'Barcelona' },
    latitude: 41.3977,
    longitude: 2.1911,
    capacite: 2000,
    annee: 2000,
    styles: ['Techno', 'Electro', 'Indie Dance', 'Bass'],
    site: 'https://www.salarazzmatazz.com',
    description: {
      fr: 'Complexe géant de cinq salles dans une usine de Poblenou, dont l’étage supérieur The Loft et Lolita accueille les grands noms de la techno et de l’électro.',
      en: 'Five-room industrial complex in Poblenou whose upstairs rooms, The Loft and Lolita, host leading names in techno, electro and leftfield club music.',
    },
  },
  {
    id: 'input-barcelone',
    nom: 'INPUT High Fidelity Dance Club',
    type: 'club',
    paysCode: 'ES',
    villeSlug: 'barcelone-es',
    ville: { fr: 'Barcelone', en: 'Barcelona' },
    latitude: 41.3692,
    longitude: 2.1469,
    capacite: 1000,
    annee: 2016,
    styles: ['Techno', 'Tech House', 'Melodic Techno'],
    site: 'https://www.inputbcn.com',
    description: {
      fr: 'Club audiophile sur la colline de Montjuïc conçu autour d’un traitement acoustique intégral et d’un mur de LED monumental.',
      en: 'Audiophile club on Montjuïc hill engineered around full-room acoustic treatment and a monumental LED matrix.',
    },
  },

  /* New York */
  {
    id: 'basement-new-york',
    nom: 'BASEMENT',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'newyork-us',
    ville: { fr: 'New York', en: 'New York' },
    latitude: 40.7161,
    longitude: -73.9139,
    capacite: 700,
    annee: 2019,
    styles: ['Techno', 'Industrial', 'House', 'Acid Techno'],
    site: 'https://basementny.net',
    description: {
      fr: 'Dédale de couloirs de brique et de catacombes sous le Knockdown Center à Maspeth (Queens), fer de lance du renouveau techno et queer rave new-yorkais.',
      en: 'Brick-vaulted labyrinth beneath the Knockdown Center in Maspeth, Queens, spearheading New York’s techno and queer rave resurgence.',
    },
  },
  {
    id: 'nowadays-new-york',
    nom: 'Nowadays',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'newyork-us',
    ville: { fr: 'New York', en: 'New York' },
    latitude: 40.6991,
    longitude: -73.9016,
    capacite: 800,
    annee: 2015,
    styles: ['House', 'Techno', 'Ambient', 'Leftfield'],
    site: 'https://nowadays.nyc',
    description: {
      fr: 'Fondé à Ridgewood par Justin Carter et Eamon Harkin (Mister Saturday Night), célèbre pour son système SBS Slammer et ses marathons Nonstop de plus de 24 heures.',
      en: 'Founded in Ridgewood by Justin Carter and Eamon Harkin (Mister Saturday Night), famed for its custom SBS Slammer sound system and 24-hour Nonstop marathons.',
    },
  },
  {
    id: 'public-records-new-york',
    nom: 'Public Records',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'newyork-us',
    ville: { fr: 'New York', en: 'New York' },
    latitude: 40.6808,
    longitude: -73.9854,
    capacite: 400,
    annee: 2019,
    styles: ['House', 'Minimal', 'Ambient', 'Disco'],
    site: 'https://publicrecords.nyc',
    description: {
      fr: 'Espace culturel et Sound Room audiophile à Gowanus (Brooklyn), doté d’enceintes en bois sur mesure signées Devon Turnbull (OJAS).',
      en: 'Cultural space and audiophile Sound Room in Gowanus, Brooklyn, featuring custom wooden horn speakers built by Devon Turnbull (OJAS).',
    },
  },

  /* Los Angeles */
  {
    id: 'sound-nightclub-la',
    nom: 'Sound Nightclub',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'losangeles-us',
    ville: { fr: 'Los Angeles', en: 'Los Angeles' },
    latitude: 34.1018,
    longitude: -118.3359,
    capacite: 650,
    annee: 2013,
    styles: ['House', 'Melodic Techno', 'Indie Dance', 'Tech House'],
    site: 'https://www.soundnightclub.com',
    description: {
      fr: 'Club de Las Palmas Avenue à Hollywood conçu autour d’un système Funktion-One quadraphonique sur mesure et de boiseries acoustiques.',
      en: 'Las Palmas Avenue club in Hollywood built around a custom quadraphonic Funktion-One sound system and warm acoustic woodwork.',
    },
  },
  {
    id: '1720-la',
    nom: '1720',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'losangeles-us',
    ville: { fr: 'Los Angeles', en: 'Los Angeles' },
    latitude: 34.0273,
    longitude: -118.2421,
    capacite: 1100,
    annee: 2018,
    styles: ['Techno', 'Electro', 'Bass', 'Industrial'],
    site: 'https://1720.la',
    description: {
      fr: 'Entrepôt industriel du Warehouse District au sud de Downtown LA, point de ralliement des tournées techno, electro, bass et expérimentales.',
      en: 'Industrial venue in the Warehouse District south of Downtown LA, a hub for underground techno, electro, bass and experimental tours.',
    },
  },

  /* Detroit */
  {
    id: 'spot-lite-detroit',
    nom: 'Spot Lite',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'detroit-us',
    ville: { fr: 'Detroit', en: 'Detroit' },
    latitude: 42.3652,
    longitude: -82.9921,
    capacite: 450,
    annee: 2021,
    styles: ['Detroit Techno', 'House', 'Electro', 'Disco'],
    site: 'https://www.spotlitedetroit.com',
    description: {
      fr: 'Disquaire, galerie et club de l’Eastside de Detroit où les pionniers de la techno et de la house côtoient la nouvelle garde locale.',
      en: 'Record store, art gallery and club on Detroit’s Eastside where first-generation techno and house pioneers share the decks with the new wave.',
    },
  },
  {
    id: 'tv-lounge-detroit',
    nom: 'TV Lounge',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'detroit-us',
    ville: { fr: 'Detroit', en: 'Detroit' },
    latitude: 42.3372,
    longitude: -83.0659,
    capacite: 600,
    annee: 2006,
    styles: ['Detroit Techno', 'House', 'Ghetto Tech', 'Acid'],
    site: 'https://www.facebook.com/tvloungedetroit',
    description: {
      fr: 'Institution de Grand River Avenue avec cour extérieure en brique et ruelle ouverte, légendaire pour ses afterparties de trois jours pendant le week-end de Movement.',
      en: 'Grand River Avenue institution with a brick courtyard and open alley, legendary for its three-day marathon afterparties during Movement weekend.',
    },
  },
  {
    id: 'marble-bar-detroit',
    nom: 'Marble Bar',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'detroit-us',
    ville: { fr: 'Detroit', en: 'Detroit' },
    latitude: 42.3627,
    longitude: -83.0778,
    capacite: 500,
    annee: 2015,
    styles: ['Techno', 'House', 'Electro', 'Indie Dance'],
    site: 'https://www.marblebardetroit.com',
    description: {
      fr: 'Club de New Center associant une salle intérieure intimiste et un vaste patio extérieur pour les marathons du jour et de la nuit.',
      en: 'New Center club pairing an intimate indoor dancefloor with a spacious outdoor patio for day-to-night electronic marathons.',
    },
  },

  /* Chicago */
  {
    id: 'smartbar-chicago',
    nom: 'smartbar',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'chicago-us',
    ville: { fr: 'Chicago', en: 'Chicago' },
    latitude: 41.9499,
    longitude: -87.6589,
    capacite: 400,
    annee: 1982,
    styles: ['House', 'Chicago House', 'Techno', 'Disco'],
    site: 'https://smartbarchicago.com',
    description: {
      fr: 'Sous-sol historique sous le Metro sur Clark Street depuis 1982, sanctuaire de la house de Chicago où ont résidé Frankie Knuckles, Derrick Carter et The Blessed Madonna.',
      en: 'Historic basement club beneath the Metro on Clark Street since 1982, a sanctuary of Chicago house that has hosted residencies by Frankie Knuckles, Derrick Carter and The Blessed Madonna.',
    },
  },
  {
    id: 'radius-chicago',
    nom: 'Radius Chicago',
    type: 'club',
    paysCode: 'US',
    villeSlug: 'chicago-us',
    ville: { fr: 'Chicago', en: 'Chicago' },
    latitude: 41.8529,
    longitude: -87.6431,
    capacite: 3500,
    annee: 2020,
    styles: ['Techno', 'House', 'Melodic Techno', 'Tech House'],
    site: 'https://www.radius-chicago.com',
    description: {
      fr: 'Ancienne usine sidérurgique de 5 000 m² dans le quartier de Pilsen reconvertie en cathédrale électronique pour les grands formats club et les nuits ARC.',
      en: 'Former 55,000-square-foot steel factory in Pilsen transformed into a warehouse venue for large-scale electronic productions and ARC after-hours.',
    },
  },

  /* Mexico */
  {
    id: 'bar-oriente-mexico',
    nom: 'Bar Oriente',
    type: 'club',
    paysCode: 'MX',
    villeSlug: 'mexico-mx',
    ville: { fr: 'Mexico', en: 'Mexico City' },
    latitude: 19.4212,
    longitude: -99.1631,
    capacite: 350,
    annee: 2016,
    styles: ['Indie Dance', 'Dark Disco', 'Italo', 'Acid'],
    site: 'https://www.instagram.com/bar_oriente/',
    description: {
      fr: 'Épicentre de Roma Norte pour la dark disco, l’indie dance, l’EBM et l’italo mexicains, réunissant deux salles et les figures de la scène CDMX.',
      en: 'Roma Norte epicenter for Mexico City’s dark disco, indie dance, EBM and Italo scene across two rooms.',
    },
  },
  {
    id: 'looloo-studio-mexico',
    nom: 'LooLoo Studio',
    type: 'club',
    paysCode: 'MX',
    villeSlug: 'mexico-mx',
    ville: { fr: 'Mexico', en: 'Mexico City' },
    latitude: 19.4281,
    longitude: -99.1564,
    capacite: 600,
    annee: 2019,
    styles: ['Melodic Techno', 'Indie Dance', 'House', 'Techno'],
    site: 'https://www.instagram.com/looloostudio/',
    description: {
      fr: 'Club du quartier Juárez à Mexico reconnu pour son tunnel lumineux immersif et sa programmation internationale de melodic techno, d’indie dance et de house.',
      en: 'Colonia Juárez club in Mexico City known for its immersive light tunnel and international bookings across melodic techno, indie dance and house.',
    },
  },
  {
    id: 'yuyu-mexico',
    nom: 'YuYu',
    type: 'club',
    paysCode: 'MX',
    villeSlug: 'mexico-mx',
    ville: { fr: 'Mexico', en: 'Mexico City' },
    latitude: 19.4294,
    longitude: -99.1542,
    capacite: 250,
    annee: 2017,
    styles: ['Techno', 'Electro', 'Bass', 'Breaks'],
    site: 'https://yuyu.mx',
    description: {
      fr: 'Sous-sol intimiste sous une demeure historique de la rue Versalles à Juárez, dédié aux sonorités club expérimentales, techno, breaks et bass.',
      en: 'Intimate basement beneath a historic mansion on Calle Versalles in Juárez, dedicated to forward-thinking techno, electro, breaks and bass.',
    },
  },

  /* Tokyo */
  {
    id: 'womb-tokyo',
    nom: 'WOMB',
    type: 'club',
    paysCode: 'JP',
    villeSlug: 'tokyo-jp',
    ville: { fr: 'Tokyo', en: 'Tokyo' },
    latitude: 35.6584,
    longitude: 139.6952,
    capacite: 1000,
    annee: 2000,
    styles: ['Techno', 'House', 'Drum & Bass', 'Tech House'],
    site: 'https://www.womb.co.jp',
    description: {
      fr: 'Institution sur quatre niveaux au coeur de Maruyamacho à Shibuya, célèbre pour son immense boule à facettes centrale et son système sonore Phazon / Adamson.',
      en: 'Four-story institution in Shibuya’s Maruyamacho district, famous for its giant central mirror ball and precision-engineered sound system.',
    },
  },
  {
    id: 'vent-tokyo',
    nom: 'VENT',
    type: 'club',
    paysCode: 'JP',
    villeSlug: 'tokyo-jp',
    ville: { fr: 'Tokyo', en: 'Tokyo' },
    latitude: 35.6626,
    longitude: 139.7131,
    capacite: 350,
    annee: 2016,
    styles: ['Techno', 'House', 'Minimal', 'Ambient'],
    site: 'http://vent-tokyo.net',
    description: {
      fr: 'Sous-sol audiophile d’Omotesando conçu avec des panneaux acoustiques suspendus et des enceintes ruban Taguchi sur mesure.',
      en: 'Audiophile basement club in Omotesando engineered with suspended acoustic baffling and custom Taguchi ribbon speakers.',
    },
  },
  {
    id: 'zerotokyo-tokyo',
    nom: 'ZEROTOKYO',
    type: 'club',
    paysCode: 'JP',
    villeSlug: 'tokyo-jp',
    ville: { fr: 'Tokyo', en: 'Tokyo' },
    latitude: 35.6958,
    longitude: 139.7006,
    capacite: 1500,
    annee: 2023,
    styles: ['Techno', 'House', 'Bass', 'Trance'],
    site: 'https://zerotokyo.jp',
    description: {
      fr: 'Vaste complexe souterrain sur trois étages sous la tour Kabukicho à Shinjuku, nouveau vaisseau amiral des nuits électroniques tokyoïtes.',
      en: 'Three-level underground club complex beneath the Tokyu Kabukicho Tower in Shinjuku, flagship venue for large-scale Tokyo electronic nights.',
    },
  },

  /* Melbourne */
  {
    id: 'revolver-melbourne',
    nom: 'Revolver Upstairs',
    type: 'club',
    paysCode: 'AU',
    villeSlug: 'melbourne-au',
    ville: { fr: 'Melbourne', en: 'Melbourne' },
    latitude: -37.8505,
    longitude: 144.9932,
    capacite: 600,
    annee: 1997,
    styles: ['House', 'Techno', 'Disco', 'Minimal'],
    site: 'https://revolverupstairs.com.au',
    description: {
      fr: 'Légende de Chapel Street à Prahran (« Revs »), célèbre pour sa cage DJ et ses marathons continus du vendredi soir au lundi matin.',
      en: 'Chapel Street institution in Prahran affectionately known as “Revs”, famous for its DJ cage and non-stop weekend marathons running from Friday night to Monday morning.',
    },
  },
  {
    id: 'sub-club-melbourne',
    nom: 'Sub Club',
    type: 'club',
    paysCode: 'AU',
    villeSlug: 'melbourne-au',
    ville: { fr: 'Melbourne', en: 'Melbourne' },
    latitude: -37.8173,
    longitude: 144.9669,
    capacite: 400,
    annee: 2018,
    styles: ['Techno', 'Electro', 'Breaks', 'House'],
    site: 'https://www.subclubmelbourne.com',
    description: {
      fr: 'Sous-sol brut de Flinders Court au coeur du CBD de Melbourne, dédié à la techno rapide, à l’électro et aux collectifs underground locaux.',
      en: 'Raw basement venue on Flinders Court in Melbourne’s CBD, dedicated to techno, electro and local underground collectives.',
    },
  },

  /* São Paulo */
  {
    id: 'd-edge-sao-paulo',
    nom: 'D-EDGE',
    type: 'club',
    paysCode: 'BR',
    villeSlug: 'saopaulo-br',
    ville: { fr: 'São Paulo', en: 'Sao Paulo' },
    latitude: -23.5269,
    longitude: -46.6634,
    capacite: 800,
    annee: 2003,
    styles: ['Techno', 'House', 'Minimal', 'Indie Dance'],
    site: 'https://d-edge.com.br',
    description: {
      fr: 'Fondé par Renato Ratier à Barra Funda et dessiné par Muti Randolph, célèbre pour son architecture lumineuse réactive au son et sa terrasse ouverte au lever du jour.',
      en: 'Founded by Renato Ratier in Barra Funda and designed by Muti Randolph, renowned for its sound-reactive sculptural lighting and sunrise rooftop terrace.',
    },
  },
  {
    id: 'fabriketa-sao-paulo',
    nom: 'Fabriketa',
    type: 'club',
    paysCode: 'BR',
    villeSlug: 'saopaulo-br',
    ville: { fr: 'São Paulo', en: 'Sao Paulo' },
    latitude: -23.5418,
    longitude: -46.6152,
    capacite: 2000,
    annee: 2015,
    styles: ['Techno', 'House', 'Indie Dance', 'Acid'],
    site: 'https://www.instagram.com/fabriketasp/',
    description: {
      fr: 'Ancienne usine du début du XXe siècle dans le quartier de Brás où se tiennent les grandes raves indépendantes paulistes (Mamba Negra, Gop Tun, ODD).',
      en: 'Early 20th-century industrial complex in the Brás district hosting São Paulo’s major independent raves and collectives (Mamba Negra, Gop Tun, ODD).',
    },
  },

  /* ═══ FESTIVALS : PAR PAYS (CAPACITÉ 1 000+ PERSONNES + BE TULUM & NÔMADE) ═══ */

  /* Mexique (MX) */
  {
    id: 'be-tulum-mexique',
    nom: 'Be Tulum',
    type: 'festival',
    paysCode: 'MX',
    ville: { fr: 'Tulum', en: 'Tulum' },
    latitude: 20.1389,
    longitude: -87.4622,
    capacite: 1200,
    annee: 2010,
    mois: { fr: 'Décembre - Janvier (saison Tulum)', en: 'December - January (Tulum season)' },
    styles: ['Indie Dance', 'Dark Disco', 'Melodic House', 'Deep House'],
    site: 'https://betulum.com',
    description: {
      fr: 'Sanctuaire musical entre jungle maya et mer des Caraïbes à Tulum, accueillant tout l’hiver des résidences et vitrines de labels indie dance, dark disco et melodic house.',
      en: 'Musical sanctuary between the Mayan jungle and the Caribbean Sea in Tulum, hosting winter label showcases and residencies across indie dance, dark disco and melodic house.',
    },
  },
  {
    id: 'nomade-tulum-mexique',
    nom: 'Nômade Tulum',
    type: 'festival',
    paysCode: 'MX',
    ville: { fr: 'Tulum', en: 'Tulum' },
    latitude: 20.1376,
    longitude: -87.4628,
    capacite: 1200,
    annee: 2015,
    mois: { fr: 'Décembre - Janvier (saison Tulum)', en: 'December - January (Tulum season)' },
    styles: ['Deep House', 'Indie Dance', 'Downtempo', 'Melodic Techno'],
    site: 'https://nomadetulum.com',
    description: {
      fr: 'Hôte emblématique de la côte de Tulum réunissant rituels électroniques en bord de mer, sets au coucher du soleil et nuits deep house, organic house et indie dance.',
      en: 'Emblematic Tulum beachfront gathering blending seaside electronic rituals, sunset live sessions and deep house, organic house and indie dance showcases.',
    },
  },
  {
    id: 'zamna-festival-mexique',
    nom: 'Zamna Festival',
    type: 'festival',
    paysCode: 'MX',
    ville: { fr: 'Tulum', en: 'Tulum' },
    latitude: 20.1862,
    longitude: -87.5089,
    capacite: 15000,
    annee: 2017,
    mois: { fr: 'Décembre - Janvier', en: 'December - January' },
    styles: ['Melodic Techno', 'Indie Dance', 'House', 'Techno'],
    site: 'https://zamnafestival.com',
    description: {
      fr: 'Grand rassemblement hivernal au coeur d’un cénote entouré par onze hectares de jungle à Tulum, accueillant Afterlife, Circoloco, Mayan Warrior et Diynamic.',
      en: 'Major winter festival set around an open-air cenote across 27 acres of Tulum jungle, hosting Afterlife, Circoloco, Mayan Warrior and Diynamic.',
    },
  },
  {
    id: 'mutek-mx-mexique',
    nom: 'MUTEK MX',
    type: 'festival',
    paysCode: 'MX',
    villeSlug: 'mexico-mx',
    ville: { fr: 'Mexico', en: 'Mexico City' },
    latitude: 19.4326,
    longitude: -99.1412,
    capacite: 6000,
    annee: 2003,
    mois: { fr: 'Octobre - Novembre', en: 'October - November' },
    styles: ['Ambient', 'IDM', 'Techno', 'Experimental'],
    site: 'https://mutek.mx',
    description: {
      fr: 'Édition mexicaine du festival MUTEK investissant musées, usines et salles patrimoniales de Mexico pour ses programmes Nocturne et A/Visions.',
      en: 'Mexican edition of MUTEK taking over museums, factories and heritage venues across Mexico City for its Nocturne and A/Visions programs.',
    },
  },
  {
    id: 'bahidora-mexique',
    nom: 'Carnaval de Bahidorá',
    type: 'festival',
    paysCode: 'MX',
    ville: { fr: 'Las Estacas (Morelos)', en: 'Las Estacas (Morelos)' },
    latitude: 18.7311,
    longitude: -99.1128,
    capacite: 12000,
    annee: 2013,
    mois: { fr: 'Février', en: 'February' },
    styles: ['House', 'Techno', 'Nu-Disco', 'Bass'],
    site: 'https://bahidora.com',
    description: {
      fr: 'Festival de trois jours autour des sources naturelles de Las Estacas au sud de Mexico, mêlant scènes house et techno nocturnes, arts visuels et musiques électroniques latines.',
      en: 'Three-day festival around the natural springs of Las Estacas south of Mexico City, blending all-night house and techno stages with Latin electronic music.',
    },
  },

  /* Canada (CA) */
  {
    id: 'mutek-montreal-canada',
    nom: 'MUTEK Montréal',
    type: 'festival',
    paysCode: 'CA',
    villeSlug: 'montreal-ca',
    ville: { fr: 'Montréal', en: 'Montreal' },
    latitude: 45.5088,
    longitude: -73.5661,
    capacite: 8000,
    annee: 2000,
    mois: { fr: 'Août', en: 'August' },
    styles: ['Techno', 'Ambient', 'IDM', 'Experimental'],
    site: 'https://montreal.mutek.org',
    description: {
      fr: 'Fondé en 2000 par Alain Mongeau à Montréal, festival de référence mondiale consacré à la performance live électronique et à la création audiovisuelle numérique.',
      en: 'Founded in 2000 by Alain Mongeau in Montreal, a world-renowned festival dedicated to live electronic performance and digital audiovisual art.',
    },
  },
  {
    id: 'piknic-electronik-canada',
    nom: 'Piknic Électronik',
    type: 'festival',
    paysCode: 'CA',
    villeSlug: 'montreal-ca',
    ville: { fr: 'Montréal', en: 'Montreal' },
    latitude: 45.5126,
    longitude: -73.5342,
    capacite: 6500,
    annee: 2003,
    mois: { fr: 'Mai - Octobre', en: 'May - October' },
    styles: ['House', 'Techno', 'Indie Dance', 'Melodic Techno'],
    site: 'https://piknicelectronik.com',
    description: {
      fr: 'Rendez-vous dominical en plein air au parc Jean-Drapeau face à la silhouette de Montréal, réunissant deux scènes électroniques chaque semaine de mai à octobre.',
      en: 'Weekly open-air Sunday gathering at Parc Jean-Drapeau facing the Montreal skyline, running two electronic stages from May through October.',
    },
  },
  {
    id: 'igloofest-canada',
    nom: 'Igloofest',
    type: 'festival',
    paysCode: 'CA',
    villeSlug: 'montreal-ca',
    ville: { fr: 'Montréal', en: 'Montreal' },
    latitude: 45.5048,
    longitude: -73.5515,
    capacite: 12000,
    annee: 2007,
    mois: { fr: 'Janvier - Février', en: 'January - February' },
    styles: ['Techno', 'House', 'Tech House', 'Bass'],
    site: 'https://igloofest.ca',
    description: {
      fr: 'Le festival électronique le plus froid du monde sur les quais du Vieux-Port de Montréal, célébrant la techno et la house sous la neige par moins vingt degrés.',
      en: 'The coldest electronic music festival in the world on the quays of the Old Port of Montreal, celebrating techno and house in sub-zero winter temperatures.',
    },
  },
  {
    id: 'shambhala-canada',
    nom: 'Shambhala Music Festival',
    type: 'festival',
    paysCode: 'CA',
    ville: { fr: 'Salmo (Colombie-Britannique)', en: 'Salmo (British Columbia)' },
    latitude: 49.1242,
    longitude: -117.2581,
    capacite: 18000,
    annee: 1998,
    mois: { fr: 'Juillet', en: 'July' },
    styles: ['Bass', 'Drum & Bass', 'House', 'Techno'],
    site: 'https://www.shambhalamusicfestival.com',
    description: {
      fr: 'Festival indépendant sans commanditaire sur la ferme Salmo River Ranch dans les montagnes Kootenay, célèbre pour ses six scènes permanentes et ses systèmes PK Sound.',
      en: 'Sponsor-free independent festival on the Salmo River Ranch in the Kootenay Mountains, famous for its six permanent stages and PK Sound systems.',
    },
  },
  {
    id: 'ilesoniq-canada',
    nom: 'îLESONIQ',
    type: 'festival',
    paysCode: 'CA',
    villeSlug: 'montreal-ca',
    ville: { fr: 'Montréal', en: 'Montreal' },
    latitude: 45.5131,
    longitude: -73.5321,
    capacite: 35000,
    annee: 2014,
    mois: { fr: 'Août', en: 'August' },
    styles: ['House', 'Techno', 'Bass', 'Trance'],
    site: 'https://ilesoniq.com',
    description: {
      fr: 'Grand festival électronique d’été sur trois scènes au parc Jean-Drapeau à Montréal, réunissant house, techno, bass music et grandes productions internationales.',
      en: 'Major three-stage summer electronic festival at Montreal’s Parc Jean-Drapeau, bringing together house, techno, bass music and arena-scale productions.',
    },
  },

  /* États-Unis (US) */
  {
    id: 'movement-detroit-us',
    nom: 'Movement Electronic Music Festival',
    type: 'festival',
    paysCode: 'US',
    villeSlug: 'detroit-us',
    ville: { fr: 'Detroit', en: 'Detroit' },
    latitude: 42.3278,
    longitude: -83.0447,
    capacite: 35000,
    annee: 2000,
    mois: { fr: 'Mai (Memorial Day)', en: 'May (Memorial Day)' },
    styles: ['Detroit Techno', 'Techno', 'House', 'Electro'],
    site: 'https://movementfestival.com',
    description: {
      fr: 'Pélerinage annuel au Hart Plaza sur les rives de la rivière Detroit, là où est née la techno en 1988, réunissant trois générations de pionniers et la scène mondiale.',
      en: 'Annual pilgrimage at Hart Plaza on the Detroit Riverfront in the birthplace of techno, uniting three generations of Detroit pioneers with the global scene.',
    },
  },
  {
    id: 'arc-music-festival-us',
    nom: 'ARC Music Festival',
    type: 'festival',
    paysCode: 'US',
    villeSlug: 'chicago-us',
    ville: { fr: 'Chicago', en: 'Chicago' },
    latitude: 41.8851,
    longitude: -87.6644,
    capacite: 25000,
    annee: 2021,
    mois: { fr: 'Août - Septembre (Labor Day)', en: 'August - September (Labor Day)' },
    styles: ['Chicago House', 'House', 'Techno', 'Melodic Techno'],
    site: 'https://arcmusicfestival.com',
    description: {
      fr: 'Grand rassemblement d’Union Park célébrant l’héritage de la house de Chicago aux côtés des scènes techno, tech house et melodic techno internationales.',
      en: 'Union Park gathering celebrating Chicago’s house music heritage alongside international techno, tech house and melodic techno stages.',
    },
  },
  {
    id: 'making-time-us',
    nom: 'Making Time ∞',
    type: 'festival',
    paysCode: 'US',
    ville: { fr: 'Philadelphie', en: 'Philadelphia' },
    latitude: 39.8758,
    longitude: -75.2131,
    capacite: 5000,
    annee: 2021,
    mois: { fr: 'Septembre', en: 'September' },
    styles: ['Leftfield', 'Techno', 'IDM', 'Indie Dance'],
    site: 'https://makingtimeisrad.com',
    description: {
      fr: 'Festival indépendant conçu par Dave P dans l’enceinte historique de Fort Mifflin (1771), acclamé pour son approche transcendantale mêlant techno, IDM, ambient et club expérimental.',
      en: 'Independent festival curated by Dave P inside historic 1771 Fort Mifflin, acclaimed for its transcendental programming across techno, IDM, ambient and leftfield club music.',
    },
  },
  {
    id: 'iii-points-us',
    nom: 'III Points',
    type: 'festival',
    paysCode: 'US',
    ville: { fr: 'Miami', en: 'Miami' },
    latitude: 25.8009,
    longitude: -80.2044,
    capacite: 30000,
    annee: 2013,
    mois: { fr: 'Octobre', en: 'October' },
    styles: ['Techno', 'Indie Dance', 'House', 'Electro'],
    site: 'https://www.iiipoints.com',
    description: {
      fr: 'Festival nocturne au coeur du quartier industriel de Wynwood à Miami, dont les scènes restent ouvertes jusqu’à 5 heures du matin.',
      en: 'Nocturnal urban festival in Miami’s industrial Wynwood district, featuring club and warehouse stages running until 5 a.m.',
    },
  },

  /* Allemagne (DE) */
  {
    id: 'time-warp-allemagne',
    nom: 'Time Warp',
    type: 'festival',
    paysCode: 'DE',
    ville: { fr: 'Mannheim', en: 'Mannheim' },
    latitude: 49.4682,
    longitude: 8.5244,
    capacite: 18000,
    annee: 1994,
    mois: { fr: 'Avril', en: 'April' },
    styles: ['Techno', 'House', 'Minimal', 'Tech House'],
    site: 'https://www.time-warp.de',
    description: {
      fr: 'Institution fondée en 1994 à Mannheim dans les halls de la Maimarkthalle, célèbre pour ses dix-neuf heures ininterrompues et les levers de soleil du Floor 3.',
      en: 'Institution founded in 1994 inside Mannheim’s Maimarkthalle, famous for its 19-hour non-stop techno and house marathon and iconic Floor 3 sunrises.',
    },
  },
  {
    id: 'fusion-festival-allemagne',
    nom: 'Fusion Festival',
    type: 'festival',
    paysCode: 'DE',
    ville: { fr: 'Lärz (Müritz)', en: 'Lärz (Müritz)' },
    latitude: 53.3078,
    longitude: 12.7358,
    capacite: 70000,
    annee: 1997,
    mois: { fr: 'Juin', en: 'June' },
    styles: ['Techno', 'House', 'Downtempo', 'Bass'],
    site: 'https://www.fusion-festival.de',
    description: {
      fr: 'Cité utopique et autogérée sur une ancienne base aérienne militaire à Lärz au nord de Berlin, réunissant des dizaines de scènes électroniques jour et nuit.',
      en: 'Countercultural gathering on a former military airfield in Lärz north of Berlin, uniting dozens of electronic stages day and night.',
    },
  },
  {
    id: 'berlin-atonal-allemagne',
    nom: 'Berlin Atonal',
    type: 'festival',
    paysCode: 'DE',
    villeSlug: 'berlin-de',
    ville: { fr: 'Berlin', en: 'Berlin' },
    latitude: 52.5105,
    longitude: 13.4201,
    capacite: 3500,
    annee: 1982,
    mois: { fr: 'Août - Septembre', en: 'August - September' },
    styles: ['Industrial', 'Ambient', 'Experimental', 'Techno'],
    site: 'https://berlin-atonal.com',
    description: {
      fr: 'Fondé en 1982 par Dimitri Hegemann puis relancé en 2013 dans l’immense nef de béton de Kraftwerk Berlin, dédié aux créations sonores et visuelles radicales.',
      en: 'Founded in 1982 by Dimitri Hegemann and relaunched in 2013 inside the cavernous concrete nave of Kraftwerk Berlin, dedicated to radical sonic and visual art.',
    },
  },
  {
    id: 'nature-one-allemagne',
    nom: 'Nature One',
    type: 'festival',
    paysCode: 'DE',
    ville: { fr: 'Kastellaun (Pydna)', en: 'Kastellaun (Pydna)' },
    latitude: 50.0442,
    longitude: 7.4275,
    capacite: 60000,
    annee: 1995,
    mois: { fr: 'Août', en: 'August' },
    styles: ['Techno', 'Trance', 'Hardcore', 'House'],
    site: 'https://www.nature-one.de',
    description: {
      fr: 'L’une des plus grandes raves historiques d’Allemagne sur l’ancienne base de missiles de Pydna, avec quatre scènes principales et dix-neuf bunkers de clubs.',
      en: 'One of Germany’s largest historic raves held on the former Pydna missile base, featuring four main floors and nineteen club bunkers.',
    },
  },

  /* Pays-Bas (NL) */
  {
    id: 'dekmantel-pays-bas',
    nom: 'Dekmantel Festival',
    type: 'festival',
    paysCode: 'NL',
    villeSlug: 'amsterdam-nl',
    ville: { fr: 'Amsterdam', en: 'Amsterdam' },
    latitude: 52.3164,
    longitude: 4.8322,
    capacite: 15000,
    annee: 2013,
    mois: { fr: 'Août', en: 'August' },
    styles: ['Techno', 'Electro', 'House', 'Leftfield'],
    site: 'https://www.dekmantelfestival.com',
    description: {
      fr: 'Installé dans la forêt d’Amsterdamse Bos et le long de l’IJ, référence mondiale des curateurs pour ses scènes UFO (techno/electro) et Selectors (diggers et raretés).',
      en: 'Set in the Amsterdamse Bos forest and along the IJ, a global curator benchmark for its UFO (techno/electro) and Selectors stages.',
    },
  },
  {
    id: 'awakenings-pays-bas',
    nom: 'Awakenings Festival',
    type: 'festival',
    paysCode: 'NL',
    ville: { fr: 'Hilvarenbeek / Amsterdam', en: 'Hilvarenbeek / Amsterdam' },
    latitude: 51.5228,
    longitude: 5.1258,
    capacite: 40000,
    annee: 1997,
    mois: { fr: 'Juillet', en: 'July' },
    styles: ['Techno', 'Hard Techno', 'Melodic Techno', 'Minimal'],
    site: 'https://www.awakenings.com',
    description: {
      fr: 'Né au Westergasfabriek d’Amsterdam en 1997, le plus grand festival en plein air au monde entièrement consacré à la techno sous toutes ses formes.',
      en: 'Born at Amsterdam’s Westergasfabriek in 1997, the world’s largest open-air festival devoted entirely to techno across eight monumental stages.',
    },
  },
  {
    id: 'draaimolen-pays-bas',
    nom: 'Draaimolen Festival',
    type: 'festival',
    paysCode: 'NL',
    ville: { fr: 'Tilburg', en: 'Tilburg' },
    latitude: 51.5917,
    longitude: 5.1061,
    capacite: 12500,
    annee: 2013,
    mois: { fr: 'Septembre', en: 'September' },
    styles: ['Techno', 'Bass', 'Electro', 'Experimental'],
    site: 'https://www.draaimolen.nu',
    description: {
      fr: 'Festival indépendant niché dans le domaine forestier du MOB Complex à Tilburg, célèbre pour ses scènes architecturales intégrées aux arbres et ses duos exclusifs.',
      en: 'Independent festival nestled in the forested MOB Complex in Tilburg, renowned for its architectural forest stages and one-off back-to-back sets.',
    },
  },
  {
    id: 'dgtl-amsterdam-pays-bas',
    nom: 'DGTL Amsterdam',
    type: 'festival',
    paysCode: 'NL',
    villeSlug: 'amsterdam-nl',
    ville: { fr: 'Amsterdam', en: 'Amsterdam' },
    latitude: 52.4012,
    longitude: 4.8919,
    capacite: 20000,
    annee: 2013,
    mois: { fr: 'Avril (Pâques)', en: 'April (Easter)' },
    styles: ['Techno', 'House', 'Indie Dance', 'Electro'],
    site: 'https://dgtl.nl',
    description: {
      fr: 'Festival d’ouverture de la saison européenne sur les anciens chantiers navals NDSM d’Amsterdam, pionnier du fonctionnement circulaire zéro déchet.',
      en: 'European season opener at Amsterdam’s former NDSM shipyards, a pioneer in circular and zero-waste festival production.',
    },
  },

  /* Espagne (ES) */
  {
    id: 'sonar-espagne',
    nom: 'Sónar',
    type: 'festival',
    paysCode: 'ES',
    villeSlug: 'barcelone-es',
    ville: { fr: 'Barcelone', en: 'Barcelona' },
    latitude: 41.3547,
    longitude: 2.1281,
    capacite: 40000,
    annee: 1994,
    mois: { fr: 'Juin', en: 'June' },
    styles: ['Techno', 'IDM', 'House', 'Experimental'],
    site: 'https://sonar.es',
    description: {
      fr: 'Fondé en 1994 à Barcelone, partagé entre Sónar by Day (création expérimentale et conférences Sónar+D) et Sónar by Night (scènes géantes jusqu’au lever du soleil).',
      en: 'Founded in 1994 in Barcelona, split between Sónar by Day (experimental showcases and Sónar+D) and Sónar by Night (arena-scale electronic stages until sunrise).',
    },
  },
  {
    id: 'monegros-espagne',
    nom: 'Monegros Desert Festival',
    type: 'festival',
    paysCode: 'ES',
    ville: { fr: 'Fraga (Désert de Los Monegros)', en: 'Fraga (Monegros Desert)' },
    latitude: 41.5194,
    longitude: 0.2211,
    capacite: 50000,
    annee: 1994,
    mois: { fr: 'Juillet', en: 'July' },
    styles: ['Techno', 'Hard Techno', 'Drum & Bass', 'House'],
    site: 'https://monegrosfestival.com',
    description: {
      fr: 'Rave monumentale de vingt-deux heures fondée par la famille Arnau en plein désert aragonais, réunissant plus de dix scènes dans la poussière et la chaleur.',
      en: 'Monumental 22-hour desert rave founded by the Arnau family in the Aragonese desert, uniting more than ten stages in the dust.',
    },
  },
  {
    id: 'offweek-festival-espagne',
    nom: 'OffWeek Festival',
    type: 'festival',
    paysCode: 'ES',
    villeSlug: 'barcelone-es',
    ville: { fr: 'Barcelone', en: 'Barcelona' },
    latitude: 41.4111,
    longitude: 2.2264,
    capacite: 25000,
    annee: 2018,
    mois: { fr: 'Juin', en: 'June' },
    styles: ['Melodic Techno', 'House', 'Tech House', 'Indie Dance'],
    site: 'https://offweekfestival.com',
    description: {
      fr: 'Rendez-vous des grands labels électroniques (Afterlife, Diynamic, Solid Grooves, Brunch Electronik) face à la Méditerranée au Parc del Fòrum de Barcelone.',
      en: 'Showcase festival for major electronic imprints (Afterlife, Diynamic, Solid Grooves, Brunch Electronik) overlooking the Mediterranean at Barcelona’s Parc del Fòrum.',
    },
  },

  /* Belgique (BE) */
  {
    id: 'horst-belgique',
    nom: 'Horst Arts & Music',
    type: 'festival',
    paysCode: 'BE',
    ville: { fr: 'Vilvorde (Asiat Park)', en: 'Vilvoorde (Asiat Park)' },
    latitude: 50.9358,
    longitude: 4.4322,
    capacite: 12000,
    annee: 2014,
    mois: { fr: 'Mai', en: 'May' },
    styles: ['Techno', 'Bass', 'Leftfield', 'House'],
    site: 'https://www.horstartsandmusic.com',
    description: {
      fr: 'Dialogue entre architecture contemporaine, arts visuels et musiques club sur l’ancienne base militaire d’Asiat Park au nord de Bruxelles.',
      en: 'Dialogue between contemporary architecture, visual art and forward-thinking club music on the former Asiat Park military site north of Brussels.',
    },
  },
  {
    id: 'paradise-city-belgique',
    nom: 'Paradise City Festival',
    type: 'festival',
    paysCode: 'BE',
    ville: { fr: 'Steenokkerzeel', en: 'Steenokkerzeel' },
    latitude: 50.9169,
    longitude: 4.5214,
    capacite: 14000,
    annee: 2015,
    mois: { fr: 'Juin', en: 'June' },
    styles: ['House', 'Techno', 'Indie Dance', 'Melodic Techno'],
    site: 'https://paradisecity.be',
    description: {
      fr: 'Festival électronique autour des douves du château de Ribaucourt, reconnu comme l’un des événements musicaux les plus écologiques au monde.',
      en: 'Electronic festival set around the moat of Ribaucourt Castle, recognized as one of the world’s most environmentally sustainable music events.',
    },
  },
  {
    id: 'tomorrowland-belgique',
    nom: 'Tomorrowland',
    type: 'festival',
    paysCode: 'BE',
    ville: { fr: 'Boom', en: 'Boom' },
    latitude: 51.0911,
    longitude: 4.3853,
    capacite: 70000,
    annee: 2005,
    mois: { fr: 'Juillet', en: 'July' },
    styles: ['Techno', 'House', 'Trance', 'Melodic Techno'],
    site: 'https://www.tomorrowland.com',
    description: {
      fr: 'Le plus vaste rassemblement mondial des musiques électroniques au domaine provincial De Schorre à Boom, accueillant seize scènes des labels Core et Atmosphere jusqu’à la Mainstage.',
      en: 'The world’s largest electronic music gathering at De Schorre in Boom, hosting sixteen stages from the underground Core and Atmosphere tents to the Mainstage.',
    },
  },

  /* France (FR) */
  {
    id: 'nuits-sonores-france',
    nom: 'Nuits Sonores',
    type: 'festival',
    paysCode: 'FR',
    ville: { fr: 'Lyon', en: 'Lyon' },
    latitude: 45.7364,
    longitude: 4.8247,
    capacite: 25000,
    annee: 2003,
    mois: { fr: 'Mai (Ascension)', en: 'May' },
    styles: ['Techno', 'Indie Dance', 'Dark Disco', 'Experimental'],
    site: 'https://nuits-sonores.com',
    description: {
      fr: 'Festival urbain indépendant investissant chaque printemps d’anciennes usines lyonnaises (La Sucrière, les Grandes Locos) pour ses Days curatés par des artistes et ses grandes Nuits.',
      en: 'Independent urban festival taking over former industrial sites in Lyon (La Sucrière, Grandes Locos) for artist-curated Days and warehouse Nights.',
    },
  },
  {
    id: 'astropolis-france',
    nom: 'Astropolis',
    type: 'festival',
    paysCode: 'FR',
    ville: { fr: 'Brest (Manoir de Keroual)', en: 'Brest (Keroual Manor)' },
    latitude: 48.4239,
    longitude: -4.5442,
    capacite: 15000,
    annee: 1995,
    mois: { fr: 'Juin - Juillet', en: 'June - July' },
    styles: ['Techno', 'Acid', 'Hardcore', 'Electro'],
    site: 'https://astropolis.org',
    description: {
      fr: 'Le plus ancien festival techno de France, né des raves clandestines bretonnes en 1995 et culminant toute la nuit dans les bois du manoir de Keroual.',
      en: 'France’s oldest techno festival, born out of clandestine Breton raves in 1995 and culminating in an all-night gathering in the woods of Keroual Manor.',
    },
  },
  {
    id: 'positive-education-france',
    nom: 'Positive Education',
    type: 'festival',
    paysCode: 'FR',
    ville: { fr: 'Saint-Étienne', en: 'Saint-Étienne' },
    latitude: 45.4511,
    longitude: 4.3853,
    capacite: 6000,
    annee: 2015,
    mois: { fr: 'Novembre', en: 'November' },
    styles: ['Techno', 'Industrial', 'Dark Disco', 'Bass'],
    site: 'https://positiveeducation.fr',
    description: {
      fr: 'Rendez-vous automnal dans l’ancienne manufacture d’armes de la Cité du Design à Saint-Étienne, dédié à la techno sombre, à l’EBM et aux esthétiques post-punk.',
      en: 'Autumn gathering inside the former arms factory at Saint-Étienne’s Cité du Design, dedicated to dark techno, EBM, bass and post-punk electronics.',
    },
  },

  /* Royaume-Uni (GB) */
  {
    id: 'houghton-royaume-uni',
    nom: 'Houghton Festival',
    type: 'festival',
    paysCode: 'GB',
    ville: { fr: 'Norfolk (Houghton Hall)', en: 'Norfolk (Houghton Hall)' },
    latitude: 52.8258,
    longitude: 0.6578,
    capacite: 12000,
    annee: 2017,
    mois: { fr: 'Août', en: 'August' },
    styles: ['Minimal', 'House', 'Electro', 'Techno'],
    site: 'https://www.houghtonfestival.co.uk',
    description: {
      fr: 'Conçu et curaté par Craig Richards autour du lac et des bois de Houghton Hall dans le Norfolk, avec licence 24 heures et systèmes sonores audiophiles.',
      en: 'Conceived and curated by Craig Richards across the lake and woods of Houghton Hall in Norfolk, with a 24-hour license and bespoke audiophile sound systems.',
    },
  },
  {
    id: 'junction-2-royaume-uni',
    nom: 'Junction 2',
    type: 'festival',
    paysCode: 'GB',
    villeSlug: 'londres-gb',
    ville: { fr: 'Londres', en: 'London' },
    latitude: 51.4958,
    longitude: -0.3175,
    capacite: 18000,
    annee: 2016,
    mois: { fr: 'Juillet', en: 'July' },
    styles: ['Techno', 'House', 'Tech House', 'Electro'],
    site: 'https://www.junction2.london',
    description: {
      fr: 'Festival londonien à Boston Manor Park célèbre pour sa scène « The Bridge » nichée directement sous le viaduc en béton de l’autoroute M4.',
      en: 'West London festival at Boston Manor Park famed for “The Bridge” stage built directly beneath the concrete viaduct of the M4 motorway.',
    },
  },
  {
    id: 'boomtown-royaume-uni',
    nom: 'Boomtown',
    type: 'festival',
    paysCode: 'GB',
    ville: { fr: 'Winchester (Matterley Estate)', en: 'Winchester (Matterley Estate)' },
    latitude: 51.0539,
    longitude: -1.2422,
    capacite: 65000,
    annee: 2009,
    mois: { fr: 'Août', en: 'August' },
    styles: ['Drum & Bass', 'Jungle', 'UK Garage', 'Acid Techno'],
    site: 'https://www.boomtownfair.co.uk',
    description: {
      fr: 'Ville éphémère théâtrale dans la vallée de Matterley, capitale mondiale de la drum and bass, de la jungle, du UK garage et des sound systems dub.',
      en: 'Immersive theatrical city built in the Matterley Bowl, a global stronghold for drum and bass, jungle, UK garage and dub sound systems.',
    },
  },

  /* Portugal (PT) */
  {
    id: 'boom-festival-portugal',
    nom: 'Boom Festival',
    type: 'festival',
    paysCode: 'PT',
    ville: { fr: 'Idanha-a-Nova', en: 'Idanha-a-Nova' },
    latitude: 39.9511,
    longitude: -7.1528,
    capacite: 40000,
    annee: 1997,
    mois: { fr: 'Juillet (biennal)', en: 'July (biennial)' },
    styles: ['Psy', 'Techno', 'Ambient', 'Downtempo'],
    site: 'https://boomfestival.org',
    description: {
      fr: 'Biennale psychédélique indépendante au bord du lac d’Idanha-a-Nova, réunissant le Dance Temple (psytrance) et l’Alchemy Circle (techno hypnotique et deep).',
      en: 'Independent psychedelic biennale on the shores of Idanha-a-Nova lake, uniting the Dance Temple (psytrance) and Alchemy Circle (hypnotic techno).',
    },
  },
  {
    id: 'waking-life-portugal',
    nom: 'Waking Life',
    type: 'festival',
    paysCode: 'PT',
    ville: { fr: 'Crato (Alentejo)', en: 'Crato (Alentejo)' },
    latitude: 39.2869,
    longitude: -7.6439,
    capacite: 7500,
    annee: 2017,
    mois: { fr: 'Juin', en: 'June' },
    styles: ['Ambient', 'Minimal', 'Techno', 'Experimental'],
    site: 'https://wakinglife.pt',
    description: {
      fr: 'Six jours autour d’un lac de l’Alentejo portugais dédiés à la dub techno, à la minimal, à l’ambient et aux performances live au lever du soleil.',
      en: 'Six-day lakeside gathering in Portugal’s Alentejo region dedicated to dub techno, minimal, ambient and sunrise live performances.',
    },
  },
  {
    id: 'neopop-portugal',
    nom: 'Neopop Electronic Music Festival',
    type: 'festival',
    paysCode: 'PT',
    ville: { fr: 'Viana do Castelo', en: 'Viana do Castelo' },
    latitude: 41.6918,
    longitude: -8.8344,
    capacite: 12000,
    annee: 2006,
    mois: { fr: 'Août', en: 'August' },
    styles: ['Techno', 'Electro', 'House'],
    site: 'https://www.neopopfestival.com',
    description: {
      fr: 'Rendez-vous techno majeur du nord du Portugal au pied du fort de Santiago da Barra et de l’océan Atlantique.',
      en: 'Flagship northern Portuguese techno festival held beside the historic Fort of Santiago da Barra on the Atlantic coast.',
    },
  },

  /* Italie (IT) */
  {
    id: 'kappa-futurfestival-italie',
    nom: 'Kappa FuturFestival',
    type: 'festival',
    paysCode: 'IT',
    ville: { fr: 'Turin (Parco Dora)', en: 'Turin (Parco Dora)' },
    latitude: 45.0914,
    longitude: 7.6694,
    capacite: 35000,
    annee: 2012,
    mois: { fr: 'Juillet', en: 'July' },
    styles: ['Techno', 'House', 'Tech House', 'Melodic Techno'],
    site: 'https://www.kappafuturfestival.it',
    description: {
      fr: 'Installé sous les piliers d’acier monumentaux des anciennes usines Michelin et Fiat au Parco Dora de Turin, grand rendez-vous techno et house italien.',
      en: 'Set beneath the monumental steel pillars of former Michelin and Fiat factories in Turin’s Parco Dora, Italy’s flagship techno and house festival.',
    },
  },
  {
    id: 'terraforma-italie',
    nom: 'Terraforma',
    type: 'festival',
    paysCode: 'IT',
    ville: { fr: 'Milan (Villa Arconati)', en: 'Milan (Villa Arconati)' },
    latitude: 45.5489,
    longitude: 9.0786,
    capacite: 3500,
    annee: 2014,
    mois: { fr: 'Juin', en: 'June' },
    styles: ['Ambient', 'Experimental', 'Techno', 'Dub'],
    site: 'https://www.terraformafestival.com',
    description: {
      fr: 'Festival consacré à l’expérimentation sonore et à l’écologie dans les jardins baroques de la Villa Arconati près de Milan.',
      en: 'Festival dedicated to sonic experimentation and sustainability in the baroque woodland gardens of Villa Arconati near Milan.',
    },
  },

  /* Croatie (HR) */
  {
    id: 'dimensions-croatie',
    nom: 'Dimensions Festival',
    type: 'festival',
    paysCode: 'HR',
    ville: { fr: 'Tisno', en: 'Tisno' },
    latitude: 43.8014,
    longitude: 15.6422,
    capacite: 5000,
    annee: 2012,
    mois: { fr: 'Août - Septembre', en: 'August - September' },
    styles: ['Electro', 'Techno', 'House', 'Breaks'],
    site: 'https://www.dimensionsfestival.com',
    description: {
      fr: 'Festival de référence sur la côte dalmate et la discothèque à ciel ouvert de Barbarella’s, dédié à l’electro, à la Detroit techno, aux breaks et à la house.',
      en: 'Landmark festival on the Dalmatian coast and the open-air Barbarella’s Discotheque, dedicated to electro, Detroit techno, breaks and house.',
    },
  },
  {
    id: 'sonus-croatie',
    nom: 'Sonus Festival',
    type: 'festival',
    paysCode: 'HR',
    ville: { fr: 'Île de Pag (Zrće)', en: 'Pag Island (Zrće)' },
    latitude: 44.5397,
    longitude: 14.9144,
    capacite: 12000,
    annee: 2013,
    mois: { fr: 'Août', en: 'August' },
    styles: ['Techno', 'Tech House', 'Minimal', 'House'],
    site: 'https://www.sonus-festival.com',
    description: {
      fr: 'Cinq jours et cinq nuits produits par l’équipe de Time Warp dans les clubs à ciel ouvert de la plage de Zrće et sur des bateaux en mer Adriatique.',
      en: 'Five days and five nights produced by the Time Warp team across open-air clubs on Zrće Beach and boat parties on the Adriatic Sea.',
    },
  },

  /* Roumanie (RO) */
  {
    id: 'sunwaves-roumanie',
    nom: 'Sunwaves Festival',
    type: 'festival',
    paysCode: 'RO',
    ville: { fr: 'Mamaia (Mer Noire)', en: 'Mamaia (Black Sea)' },
    latitude: 44.2739,
    longitude: 28.6186,
    capacite: 12000,
    annee: 2007,
    mois: { fr: 'Mai & Septembre', en: 'May & September' },
    styles: ['Minimal', 'House', 'Tech House', 'Techno'],
    site: 'https://sunwaves-fest.ro',
    description: {
      fr: 'Marathon continu jour et nuit sur le sable de la mer Noire, épicentre mondial de la ro-minimal (Rhadoo, Petre Inspirescu, Raresh) et des sets de vingt-quatre heures.',
      en: 'Non-stop day-and-night marathon on the shores of the Black Sea, global epicenter of Ro-minimal (Rhadoo, Petre Inspirescu, Raresh) and 24-hour sets.',
    },
  },

  /* Pologne (PL) */
  {
    id: 'unsound-pologne',
    nom: 'Unsound',
    type: 'festival',
    paysCode: 'PL',
    ville: { fr: 'Cracovie', en: 'Krakow' },
    latitude: 50.0647,
    longitude: 19.945,
    capacite: 5000,
    annee: 2003,
    mois: { fr: 'Octobre', en: 'October' },
    styles: ['Experimental', 'Ambient', 'Industrial', 'Techno'],
    site: 'https://www.unsound.pl',
    description: {
      fr: 'Festival d’avant-garde à Cracovie investissant l’ancien hôtel brutaliste Forum Przestrzenie pour ses nuits club déconstruites et ses créations mondiales.',
      en: 'Avant-garde festival in Krakow taking over the brutalist former Hotel Forum for deconstructed club nights and world-premiere commissions.',
    },
  },
  {
    id: 'audioriver-pologne',
    nom: 'Audioriver Festival',
    type: 'festival',
    paysCode: 'PL',
    ville: { fr: 'Łódź', en: 'Łódź' },
    latitude: 51.7592,
    longitude: 19.456,
    capacite: 30000,
    annee: 2006,
    mois: { fr: 'Juillet', en: 'July' },
    styles: ['Techno', 'Drum & Bass', 'House', 'Melodic Techno'],
    site: 'https://www.audioriver.pl',
    description: {
      fr: 'Le plus grand festival des musiques électroniques de Pologne, réunissant techno, drum and bass, house et live électroniques.',
      en: 'Poland’s largest electronic music festival, uniting techno, drum and bass, house and electronic live acts.',
    },
  },

  /* Japon (JP) */
  {
    id: 'labyrinth-japon',
    nom: 'The Labyrinth',
    type: 'festival',
    paysCode: 'JP',
    ville: { fr: 'Niigata (Naeba)', en: 'Niigata (Naeba)' },
    latitude: 36.7911,
    longitude: 138.7844,
    capacite: 2500,
    annee: 2001,
    mois: { fr: 'Septembre - Octobre', en: 'September - October' },
    styles: ['Techno', 'Ambient', 'Minimal'],
    site: 'https://www.mindgames.jp',
    description: {
      fr: 'Conçu par Russ (Mindgames) dans une clairière montagneuse de Niigata autour d’une seule scène et d’un système Funktion-One quadridirectionnel d’une pureté acoustique légendaire.',
      en: 'Curated by Russ (Mindgames) in a mountain clearing in Niigata around a single stage and a quadraphonic Funktion-One system of legendary acoustic purity.',
    },
  },
  {
    id: 'rainbow-disco-club-japon',
    nom: 'Rainbow Disco Club',
    type: 'festival',
    paysCode: 'JP',
    ville: { fr: 'Higashiizu (Shizuoka)', en: 'Higashiizu (Shizuoka)' },
    latitude: 34.8194,
    longitude: 139.0411,
    capacite: 5000,
    annee: 2010,
    mois: { fr: 'Avril', en: 'April' },
    styles: ['House', 'Disco', 'Techno', 'Nu-Disco'],
    site: 'https://www.rainbowdiscoclub.com',
    description: {
      fr: 'Festival de trois jours dans les collines verdoyantes de la péninsule d’Izu au Japon, célébrant la house, le disco, la balearic et la techno.',
      en: 'Three-day camping festival in the green hills of Japan’s Izu Peninsula celebrating house, disco, balearic and techno.',
    },
  },

  /* Australie (AU) */
  {
    id: 'pitch-music-arts-australie',
    nom: 'Pitch Music & Arts',
    type: 'festival',
    paysCode: 'AU',
    ville: { fr: 'Moyston (Victoria)', en: 'Moyston (Victoria)' },
    latitude: -37.2981,
    longitude: 142.7711,
    capacite: 12000,
    annee: 2017,
    mois: { fr: 'Mars', en: 'March' },
    styles: ['Techno', 'House', 'Electro', 'Indie Dance'],
    site: 'https://www.pitchfestival.com.au',
    description: {
      fr: 'Quatre jours au pied des monts Grampians dans l’État de Victoria autour d’un pavillon brutaliste de béton et d’échafaudages.',
      en: 'Four-day gathering at the foothills of the Grampians mountain range in Victoria built around brutalist pavilion architecture.',
    },
  },

  /* Brésil (BR) */
  {
    id: 'dgtl-sao-paulo-bresil',
    nom: 'DGTL São Paulo',
    type: 'festival',
    paysCode: 'BR',
    villeSlug: 'saopaulo-br',
    ville: { fr: 'São Paulo', en: 'Sao Paulo' },
    latitude: -23.5186,
    longitude: -46.6714,
    capacite: 12000,
    annee: 2017,
    mois: { fr: 'Avril - Novembre', en: 'April - November' },
    styles: ['Techno', 'House', 'Indie Dance', 'Electro'],
    site: 'https://saopaulo.dgtl.nl',
    description: {
      fr: 'Édition sud-américaine du festival DGTL investissant d’immenses entrepôts industriels et pavillons de São Paulo.',
      en: 'South American edition of DGTL taking over massive industrial warehouses and pavilions in São Paulo.',
    },
  },
  {
    id: 'gop-tun-festival-bresil',
    nom: 'Gop Tun Festival',
    type: 'festival',
    paysCode: 'BR',
    villeSlug: 'saopaulo-br',
    ville: { fr: 'São Paulo', en: 'Sao Paulo' },
    latitude: -23.5472,
    longitude: -46.6331,
    capacite: 8000,
    annee: 2012,
    mois: { fr: 'Avril', en: 'April' },
    styles: ['House', 'Disco', 'Indie Dance', 'Techno'],
    site: 'https://goptun.com',
    description: {
      fr: 'Festival né du collectif pauliste Gop Tun sur quatre scènes mêlant house, disco, indie dance, live électroniques et techno.',
      en: 'Four-stage festival born from the São Paulo collective Gop Tun, blending house, disco, indie dance, live electronics and techno.',
    },
  },
  /* ═══ NOUVEAUX CLUBS PAR VILLE (ENRICHISSEMENT) ═══ */
  {
    id: "stereobar-montreal",
    nom: "StereoBar",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5161,
    longitude: -73.5622,
    capacite: 250,
    annee: 2012,
    styles: ["House","Minimal","Deep House","Techno"],
    site: "https://www.stereonightclub.net",
    description: {
      fr: "Le petit frère intimiste au rez-de-chaussée du Stereo rue Sainte-Catherine Est, doté lui aussi d’un système sonore analogique d’exception pour les nuits house, minimal et techno jusqu’à 3 heures.",
      en: "The intimate ground-floor sibling of Stereo on Sainte-Catherine Street East, featuring its own custom analog sound system for house, minimal and techno nights until 3 a.m.",
    },
  },
  {
    id: "bar-datcha-montreal",
    nom: "Bar Datcha",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5229,
    longitude: -73.5931,
    capacite: 200,
    annee: 2014,
    styles: ["House","Disco","Techno","Leftfield"],
    site: "https://www.bardatcha.com",
    description: {
      fr: "Repaire nocturne incontournable du Mile End sur l’avenue Laurier Ouest, propulsé par un système Funktion-One pour des sélections house, disco, afro house et électronique pointue.",
      en: "Essential Mile End nightspot on Laurier Avenue West powered by a Funktion-One sound system, hosting house, disco, afro house and leftfield selectors.",
    },
  },
  {
    id: "systeme-montreal",
    nom: "Système",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5378,
    longitude: -73.6064,
    capacite: 250,
    annee: 2022,
    styles: ["Techno","House","Breaks","UK Bass"],
    site: "https://www.instagram.com/systeme.mtl/",
    description: {
      fr: "Club underground et espace audiophile de la rue Saint-Hubert dans La Petite-Patrie, quartier général des collectifs techno, breaks, UK bass et des nuits Music Is My Sanctuary.",
      en: "Underground club and audiophile venue on Saint-Hubert Street in La Petite-Patrie, home to Montreal techno, breaks and UK bass collectives.",
    },
  },
  {
    id: "le-belmont-montreal",
    nom: "Le Belmont",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5228,
    longitude: -73.5821,
    capacite: 350,
    annee: 2004,
    styles: ["Drum & Bass","Bass","Dubstep","Techno"],
    site: "https://lebelmont.com",
    description: {
      fr: "Institution de l’angle Saint-Laurent et Mont-Royal depuis plus de vingt ans, bastion montréalais des nuits drum and bass, dubstep, bass music et raves locales.",
      en: "Cornerstone venue at Saint-Laurent and Mont-Royal for over two decades, Montreal’s stronghold for drum and bass, dubstep, bass music and local raves.",
    },
  },
  {
    id: "le-red-room-montreal",
    nom: "Le Red Room",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5168,
    longitude: -73.5658,
    capacite: 250,
    annee: 2021,
    styles: ["Techno","Hard Techno","Bass","Trance"],
    site: "https://leredroom.com",
    description: {
      fr: "Club souterrain de la rue Saint-Denis au Quartier latin équipé en PK Sound, dédié à la techno rapide, à la hard techno, à la trance et aux collectifs bass.",
      en: "Quartier Latin underground club on Saint-Denis Street outfitted with PK Sound, dedicated to fast techno, hard techno, trance and bass collectives.",
    },
  },
  {
    id: "new-city-gas-montreal",
    nom: "New City Gas",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.4937,
    longitude: -73.5597,
    capacite: 3500,
    annee: 2012,
    styles: ["House","Tech House","Melodic Techno","Dance"],
    site: "https://newcitygas.com",
    description: {
      fr: "Complexe monumental installé dans une ancienne usine de gaz de charbon de 1859 à Griffintown, accueillant les plus grandes têtes d’affiche internationales sur deux étages.",
      en: "Monumental two-level venue inside an 1859 heritage coal-gas complex in Griffintown, hosting major international electronic headliners.",
    },
  },
  {
    id: "mtelus-montreal",
    nom: "MTELUS",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5105,
    longitude: -73.5631,
    capacite: 2300,
    annee: 1997,
    styles: ["Electro","Techno","House","Live Electronic"],
    site: "https://mtelus.com",
    description: {
      fr: "Grande salle historique de la rue Sainte-Catherine Est (anciennement Metropolis) au coeur du Quartier des spectacles, scène reine des tournées live électroniques et des grandes nuits MUTEK.",
      en: "Historic 2,300-capacity hall on Sainte-Catherine Street East (formerly Metropolis), the premier Montreal stage for live electronic tours and MUTEK showcases.",
    },
  },
  {
    id: "club-soda-montreal",
    nom: "Club Soda",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5101,
    longitude: -73.5637,
    capacite: 900,
    annee: 1982,
    styles: ["Electro","House","Techno","Bass"],
    site: "https://clubsoda.ca",
    description: {
      fr: "Salle emblématique à la marquise lumineuse boulevard Saint-Laurent, accueillant depuis 1982 les lives électroniques, les nuits MUTEK et les soirées club internationales.",
      en: "Landmark venue beneath its neon marquee on Saint-Laurent Boulevard, hosting live electronic acts, MUTEK nights and international club events.",
    },
  },
  {
    id: "foufounes-electriques-montreal",
    nom: "Les Foufounes Électriques",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5108,
    longitude: -73.5624,
    capacite: 700,
    annee: 1983,
    styles: ["Industrial","Drum & Bass","Dubstep","Hard Techno"],
    site: "https://foufouneselectriques.com",
    description: {
      fr: "Institution contre-culturelle montréalaise fondée en 1983 rue Sainte-Catherine Est, accueillant sur plusieurs niveaux raves, soirées industrielles, EBM, drum and bass et dubstep.",
      en: "Montreal countercultural institution founded in 1983 on Sainte-Catherine Street East, hosting raves, industrial, EBM, drum and bass and dubstep nights across multiple floors.",
    },
  },
  {
    id: "ausgang-plaza-montreal",
    nom: "Ausgang Plaza",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5339,
    longitude: -73.6012,
    capacite: 400,
    annee: 2018,
    styles: ["Techno","Electro","Bass","Experimental"],
    site: "https://ausgangplaza.com",
    description: {
      fr: "Espace brut et salle pluridisciplinaire de la rue Saint-Hubert prisée par les collectifs rave indépendants, les vitrines techno et les lancements audiovisuels.",
      en: "Raw multidisciplinary venue on Saint-Hubert Street favored by independent rave collectives, techno showcases and audiovisual nights.",
    },
  },
  {
    id: "bar-le-ritz-pdb-montreal",
    nom: "Bar Le Ritz PDB",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5326,
    longitude: -73.6174,
    capacite: 250,
    annee: 2014,
    styles: ["Industrial","Ambient","Techno","Experimental"],
    site: "https://barleritzpdb.com",
    description: {
      fr: "Salle autogérée de la rue Jean-Talon Ouest dans le Mile-Ex (anciennement Il Motore), épicentre des nuits expérimentales, EBM, techno industrielle, synthwave et ambient.",
      en: "Collectively run venue on Jean-Talon Street West in Mile-Ex (formerly Il Motore), an epicenter for experimental electronics, EBM, industrial techno and ambient.",
    },
  },
  {
    id: "velvet-speakeasy-montreal",
    nom: "Velvet Speakeasy (Auberge Saint-Gabriel)",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5062,
    longitude: -73.5542,
    capacite: 250,
    annee: 2011,
    styles: ["House","Deep House","Melodic Techno","Tech House"],
    site: "https://velvetspeakeasy.ca",
    description: {
      fr: "Caveau souterrain aux voûtes de pierre datant de 1754 sous l’Auberge Saint-Gabriel dans le Vieux-Montréal, dédié à la house, à la deep house et à la techno mélodique.",
      en: "Underground 1754 stone-vaulted cellar beneath Auberge Saint-Gabriel in Old Montreal, dedicated to house, deep house and melodic techno.",
    },
  },
  {
    id: "sans-soleil-montreal",
    nom: "Sans Soleil Bar",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5071,
    longitude: -73.5608,
    capacite: 120,
    annee: 2022,
    styles: ["House","Dub","Ambient","Disco"],
    site: "https://www.instagram.com/sanssoleilbar/",
    description: {
      fr: "Listening bar hi-fi souterrain caché au Quartier chinois rue Saint-Urbain, où les sélecteurs jouent sur vinyle à travers des enceintes pavillonnaires vintage haute fidélité.",
      en: "Subterranean hi-fi listening bar hidden in Chinatown on Saint-Urbain Street, where selectors spin vinyl through vintage horn-loaded speakers.",
    },
  },
  {
    id: "theatre-fairmount-montreal",
    nom: "Théâtre Fairmount",
    type: "club",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal", en: "Montreal" },
    latitude: 45.5218,
    longitude: -73.5975,
    capacite: 500,
    annee: 2015,
    styles: ["House","Electro","Indie Dance","Bass"],
    site: "https://theatrefairmount.com",
    description: {
      fr: "Salle de 500 places de l’avenue du Parc dans le Mile End, accueillant les tournées électroniques internationales, les DJ sets prolongés et les soirées disco et house.",
      en: "500-capacity Mile End venue on Park Avenue hosting international electronic live tours, extended DJ sets and house and disco nights.",
    },
  },
  {
    id: "wiggle-room-toronto",
    nom: "Wiggle Room",
    type: "club",
    paysCode: "CA",
    villeSlug: "toronto-ca",
    ville: { fr: "Toronto", en: "Toronto" },
    latitude: 43.6519,
    longitude: -79.4072,
    capacite: 300,
    annee: 2019,
    styles: ["House","Tech House","Breaks","Funky House"],
    site: "https://wiggleroomtoronto.com",
    description: {
      fr: "Club indépendant de Dundas Street West surnommé « Home of the Bouncy Beats », réputé pour sa communauté chaleureuse et sa programmation house, breaks et tech house.",
      en: "Independent club on Dundas Street West dubbed the “Home of the Bouncy Beats”, known for its welcoming community and house, breaks and tech house nights.",
    },
  },
  {
    id: "bambis-toronto",
    nom: "Bambi’s",
    type: "club",
    paysCode: "CA",
    villeSlug: "toronto-ca",
    ville: { fr: "Toronto", en: "Toronto" },
    latitude: 43.6494,
    longitude: -79.4249,
    capacite: 150,
    annee: 2013,
    styles: ["Techno","Electro","Leftfield","House"],
    site: "https://www.instagram.com/bambistoronto/",
    description: {
      fr: "Caveau intimiste au pied de la côte de Dundas West, épicentre des sélecteurs underground, de la techno expérimentale et des résidences locales de Toronto.",
      en: "Intimate basement room at the bottom of the Dundas West hill, a hub for underground selectors, experimental techno and local Toronto residencies.",
    },
  },
  {
    id: "history-toronto",
    nom: "History",
    type: "club",
    paysCode: "CA",
    villeSlug: "toronto-ca",
    ville: { fr: "Toronto", en: "Toronto" },
    latitude: 43.6672,
    longitude: -79.3125,
    capacite: 2500,
    annee: 2021,
    styles: ["House","Melodic Techno","Drum & Bass","Bass"],
    site: "https://www.historytoronto.com",
    description: {
      fr: "Grande salle de 2 500 places dans les Beaches sur Queen Street East, accueillant les grandes tournées électroniques et les têtes d’affiche house, techno et bass.",
      en: "2,500-capacity hall on Queen Street East in the Beaches, hosting major international electronic tours and house, techno and bass headliners.",
    },
  },
  {
    id: "fortune-sound-club-vancouver",
    nom: "Fortune Sound Club",
    type: "club",
    paysCode: "CA",
    villeSlug: "vancouver-ca",
    ville: { fr: "Vancouver", en: "Vancouver" },
    latitude: 49.2803,
    longitude: -123.1014,
    capacite: 500,
    annee: 2009,
    styles: ["House","UK Garage","Bass","Techno"],
    site: "https://fortunesoundclub.com",
    description: {
      fr: "Institution du quartier historique de Chinatown sur Pender Street, équipée d’un système Funktion-One sur mesure pour les tournées house, UK garage et bass.",
      en: "Chinatown institution on Pender Street outfitted with a custom Funktion-One sound system for international house, UK garage and bass bookings.",
    },
  },
  {
    id: "celebrities-vancouver",
    nom: "Celebrities Nightclub",
    type: "club",
    paysCode: "CA",
    villeSlug: "vancouver-ca",
    ville: { fr: "Vancouver", en: "Vancouver" },
    latitude: 49.2799,
    longitude: -123.13,
    capacite: 650,
    annee: 1984,
    styles: ["House","Tech House","Techno","Trance"],
    site: "https://celebritiesnightclub.com",
    description: {
      fr: "Club historique de Davie Village fondé en 1984, doté d’un plafond lumineux immersif et d’une programmation électronique internationale.",
      en: "Historic Davie Village nightclub founded in 1984, featuring an immersive lighting grid and international electronic headliners.",
    },
  },
  {
    id: "gorg-o-mish-vancouver",
    nom: "Gorg-O-Mish Afterhours",
    type: "club",
    paysCode: "CA",
    villeSlug: "vancouver-ca",
    ville: { fr: "Vancouver", en: "Vancouver" },
    latitude: 49.2784,
    longitude: -123.1208,
    capacite: 300,
    annee: 2002,
    styles: ["Techno","House","Tech House","Minimal"],
    site: "https://gorgomish.com",
    description: {
      fr: "Le temple afterhours de Seymour Street à Vancouver, ouvert de 2 heures à 8 heures du matin chaque week-end pour les marathons techno et house.",
      en: "Seymour Street’s legendary afterhours sanctuary in Vancouver, open from 2 a.m. to 8 a.m. every weekend for underground techno and house sessions.",
    },
  },
  {
    id: "imperial-bell-quebec",
    nom: "Impérial Bell",
    type: "club",
    paysCode: "CA",
    villeSlug: "quebec-ca",
    ville: { fr: "Québec", en: "Quebec City" },
    latitude: 46.8136,
    longitude: -71.2254,
    capacite: 900,
    annee: 1933,
    styles: ["Electro","Techno","House","Bass"],
    site: "https://imperialbell.com",
    description: {
      fr: "Ancien cinéma historique de la rue Saint-Joseph Est dans Saint-Roch, accueillant les grandes tournées électroniques et les nuits club de Québec.",
      en: "Historic former cinema on Saint-Joseph Street East in Saint-Roch, hosting major electronic tours and club nights in Quebec City.",
    },
  },
  {
    id: "le-pantoum-quebec",
    nom: "Le Pantoum",
    type: "club",
    paysCode: "CA",
    villeSlug: "quebec-ca",
    ville: { fr: "Québec", en: "Quebec City" },
    latitude: 46.8147,
    longitude: -71.2412,
    capacite: 250,
    annee: 2012,
    styles: ["Experimental","Electro","Ambient","Techno"],
    site: "https://lepantoum.com",
    description: {
      fr: "Complexe créatif indépendant du quartier Saint-Sauveur où se croisent performances électroniques expérimentales, synthétiseurs modulaires et collectifs locaux.",
      en: "Independent creative complex in the Saint-Sauveur neighborhood hosting experimental electronic performances, modular synth nights and local collectives.",
    },
  },
  {
    id: "the-27-club-ottawa",
    nom: "The 27 Club",
    type: "club",
    paysCode: "CA",
    villeSlug: "ottawa-ca",
    ville: { fr: "Ottawa", en: "Ottawa" },
    latitude: 45.4281,
    longitude: -75.6914,
    capacite: 350,
    annee: 2017,
    styles: ["Drum & Bass","Bass","House","Techno"],
    site: "https://www.the27club.ca",
    description: {
      fr: "Salle du marché By rue York à Ottawa, point de chute des tournées bass music, drum and bass, techno et des soirées électroniques thématiques.",
      en: "ByWard Market venue on York Street in Ottawa, hosting bass music, drum and bass, techno tours and underground electronic nights.",
    },
  },
  {
    id: "bronson-centre-ottawa",
    nom: "Bronson Centre Music Theatre",
    type: "club",
    paysCode: "CA",
    villeSlug: "ottawa-ca",
    ville: { fr: "Ottawa", en: "Ottawa" },
    latitude: 45.4142,
    longitude: -75.7048,
    capacite: 1000,
    annee: 1995,
    styles: ["House","Techno","Dubstep","Trance"],
    site: "https://bronsoncentre.ca",
    description: {
      fr: "Grande salle de l’avenue Bronson accueillant les productions électroniques grand format et les afterparties d’Escapade à Ottawa.",
      en: "Large venue on Bronson Avenue hosting full-scale electronic productions and Escapade afterparties in Ottawa.",
    },
  },
  {
    id: "palace-theatre-calgary",
    nom: "The Palace Theatre",
    type: "club",
    paysCode: "CA",
    villeSlug: "calgary-ca",
    ville: { fr: "Calgary", en: "Calgary" },
    latitude: 51.0454,
    longitude: -114.0666,
    capacite: 1000,
    annee: 1921,
    styles: ["House","Techno","Bass","Drum & Bass"],
    site: "https://thepalacetheatre.ca",
    description: {
      fr: "Théâtre historique de 1921 sur Stephen Avenue transformé en grande salle électronique équipée d’un système PK Sound monumental.",
      en: "Historic 1921 theatre on Stephen Avenue transformed into Calgary’s flagship large-scale electronic venue with a massive PK Sound rig.",
    },
  },
  {
    id: "commonwealth-calgary",
    nom: "Commonwealth Bar & Stage",
    type: "club",
    paysCode: "CA",
    villeSlug: "calgary-ca",
    ville: { fr: "Calgary", en: "Calgary" },
    latitude: 51.0436,
    longitude: -114.0628,
    capacite: 450,
    annee: 2011,
    styles: ["House","UK Garage","Bass","Disco"],
    site: "https://commonwealthbar.ca",
    description: {
      fr: "Ancien entrepôt sur deux étages de la 10e Avenue à Calgary, mêlant programmation house et UK garage à l’étage et basses lourdes au sous-sol.",
      en: "Two-level converted warehouse on 10th Avenue SW in Calgary, pairing upstairs house and UK garage nights with heavy bass downstairs.",
    },
  },
  {
    id: "park-theatre-winnipeg",
    nom: "The Park Theatre",
    type: "club",
    paysCode: "CA",
    villeSlug: "winnipeg-ca",
    ville: { fr: "Winnipeg", en: "Winnipeg" },
    latitude: 49.8661,
    longitude: -97.1438,
    capacite: 350,
    annee: 2005,
    styles: ["Electro","House","Techno","Bass"],
    site: "https://myparktheatre.com",
    description: {
      fr: "Salle indépendante de South Osborne à Winnipeg accueillant les tournées électroniques, les soirées synth et les collectifs DJ locaux.",
      en: "Independent South Osborne venue in Winnipeg hosting touring electronic acts, synth nights and local DJ collectives.",
    },
  },
  {
    id: "sidestage-winnipeg",
    nom: "Sidestage",
    type: "club",
    paysCode: "CA",
    villeSlug: "winnipeg-ca",
    ville: { fr: "Winnipeg", en: "Winnipeg" },
    latitude: 49.8663,
    longitude: -97.1441,
    capacite: 200,
    annee: 2024,
    styles: ["House","Techno","Indie Dance"],
    site: "https://www.sidestagewpg.com",
    description: {
      fr: "Salle intimiste d’Osborne Street dédiée aux soirées house, techno et aux artistes émergents de la scène électronique manitobaine.",
      en: "Intimate Osborne Street venue dedicated to house, techno and emerging artists from Manitoba’s electronic scene.",
    },
  },
  {
    id: "stillwell-hifi-halifax",
    nom: "Stillwell Brewing Hi-Fi",
    type: "club",
    paysCode: "CA",
    villeSlug: "halifax-ca",
    ville: { fr: "Halifax", en: "Halifax" },
    latitude: 44.6634,
    longitude: -63.6119,
    capacite: 200,
    annee: 2021,
    styles: ["House","Disco","Minimal","Techno"],
    site: "https://www.stillwellbrewing.com",
    description: {
      fr: "Espace audiophile de Kempt Road à Halifax, où les sélecteurs vinyles et collectifs house et techno jouent sur un système sonore haute fidélité.",
      en: "Audiophile space on Kempt Road in Halifax where vinyl selectors and house and techno collectives play on a custom hi-fi sound system.",
    },
  },
  {
    id: "lighthouse-halifax",
    nom: "Light House Arts Centre",
    type: "club",
    paysCode: "CA",
    villeSlug: "halifax-ca",
    ville: { fr: "Halifax", en: "Halifax" },
    latitude: 44.6462,
    longitude: -63.5754,
    capacite: 800,
    annee: 2021,
    styles: ["House","Techno","Drum & Bass","Bass"],
    site: "https://www.lighthouseartscentre.ca",
    description: {
      fr: "Pôle culturel et salle électronique d’Argyle Street au centre-ville d’Halifax, accueillant les tournées DJ et les nuits rave des Maritimes.",
      en: "Cultural hub and electronic venue on Argyle Street in downtown Halifax, hosting touring DJs and Atlantic rave nights.",
    },
  },
  {
    id: "kitkatclub-berlin",
    nom: "KitKatClub",
    type: "club",
    paysCode: "DE",
    villeSlug: "berlin-de",
    ville: { fr: "Berlin", en: "Berlin" },
    latitude: 52.5112,
    longitude: 13.4167,
    capacite: 1300,
    annee: 1994,
    styles: ["Techno","Trance","Hard Techno","House"],
    site: "https://kitkatclub.org",
    description: {
      fr: "Institution berlinoise fondée en 1994 par Simon Thaur et Kirsten Krüger sur Köpenicker Straße, célèbre pour sa piscine intérieure, ses nuits Symbiotikka et Gegen et sa liberté radicale.",
      en: "Berlin institution founded in 1994 on Köpenicker Straße, famous for its indoor pool, Symbiotikka and Gegen nights, and radical hedonistic freedom.",
    },
  },
  {
    id: "kater-blau-berlin",
    nom: "Kater Blau",
    type: "club",
    paysCode: "DE",
    villeSlug: "berlin-de",
    ville: { fr: "Berlin", en: "Berlin" },
    latitude: 52.5122,
    longitude: 13.4258,
    capacite: 1000,
    annee: 2014,
    styles: ["House","Deep House","Melodic Techno","Minimal"],
    site: "https://www.katerblau.de",
    description: {
      fr: "Héritier de Bar 25 et KaterHolzig amarré au bord de la Spree sur Holzmarktstraße, célèbre pour ses terrasses en bois et ses marathons house et deep techno de soixante heures.",
      en: "Successor to Bar 25 and KaterHolzig on the banks of the Spree at Holzmarkt, famed for its wooden decks and 60-hour house and deep techno marathons.",
    },
  },
  {
    id: "about-blank-berlin",
    nom: "://about blank",
    type: "club",
    paysCode: "DE",
    villeSlug: "berlin-de",
    ville: { fr: "Berlin", en: "Berlin" },
    latitude: 52.5024,
    longitude: 13.4671,
    capacite: 900,
    annee: 2010,
    styles: ["Techno","House","Breaks","Electro"],
    site: "https://aboutblank.li",
    description: {
      fr: "Club autogéré près d’Ostkreuz à Friedrichshain, reconnu pour son immense jardin arboré ouvert en été et ses résidences engagées ( Staub, Homopatik).",
      en: "Collectively run club near Ostkreuz in Friedrichshain, celebrated for its sprawling leafy garden in summer and flagship residencies like Staub and Homopatik.",
    },
  },
  {
    id: "club-der-visionaere-berlin",
    nom: "Club der Visionaere",
    type: "club",
    paysCode: "DE",
    villeSlug: "berlin-de",
    ville: { fr: "Berlin", en: "Berlin" },
    latitude: 52.4969,
    longitude: 13.4533,
    capacite: 450,
    annee: 2000,
    styles: ["Minimal","Microhouse","House","Deep House"],
    site: "https://clubdervisionaere.com",
    description: {
      fr: "Ancien hangar à bateaux sur pilotis au bord du canal de la Spree à Kreuzberg, berceau mondial des après-midis et nuits minimal et microhouse (Ricardo Villalobos, Perlon).",
      en: "Waterside boathouse on stilts along the Flutgraben canal in Kreuzberg, global home of minimal and microhouse day-into-night sessions.",
    },
  },
  {
    id: "drumsheds-londres",
    nom: "Drumsheds",
    type: "club",
    paysCode: "GB",
    villeSlug: "londres-gb",
    ville: { fr: "Londres", en: "London" },
    latitude: 51.6114,
    longitude: -0.0419,
    capacite: 15000,
    annee: 2023,
    styles: ["Techno","Drum & Bass","House","UK Bass"],
    site: "https://drumshedslondon.com",
    description: {
      fr: "Le plus grand club intérieur d’Europe (15 000 places), aménagé par l’équipe de Printworks dans un ancien entrepôt IKEA monumental à Meridian Water au nord de Londres.",
      en: "Europe’s largest indoor club venue (15,000 capacity), created by the team behind Printworks inside a monumental former IKEA warehouse at Meridian Water.",
    },
  },
  {
    id: "corsica-studios-londres",
    nom: "Corsica Studios",
    type: "club",
    paysCode: "GB",
    villeSlug: "londres-gb",
    ville: { fr: "Londres", en: "London" },
    latitude: 51.4941,
    longitude: -0.0987,
    capacite: 500,
    annee: 2002,
    styles: ["Techno","UK Bass","Jungle","Experimental"],
    site: "https://www.corsicastudios.com",
    description: {
      fr: "Deux arches ferroviaires sous la gare d’Elephant & Castle équipées en Funktion-One, sanctuaire indépendant des nuits techno, dubstep, jungle et expérimentales.",
      en: "Two railway arches beneath Elephant & Castle station equipped with Funktion-One sound, an independent sanctuary for techno, dubstep, jungle and experimental nights.",
    },
  },
  {
    id: "e1-londres",
    nom: "E1",
    type: "club",
    paysCode: "GB",
    villeSlug: "londres-gb",
    ville: { fr: "Londres", en: "London" },
    latitude: 51.5084,
    longitude: -0.0602,
    capacite: 1600,
    annee: 2017,
    styles: ["Techno","Hard Techno","House"],
    site: "https://e1ldn.com",
    description: {
      fr: "Entrepôt industriel de Wapping dans l’Est londonien célèbre pour le mur sonore Funktion-One sur mesure de sa salle Warehouse (« Wall of Sound »).",
      en: "Wapping industrial warehouse in East London renowned for the bespoke Funktion-One “Wall of Sound” in its main Warehouse room.",
    },
  },
  {
    id: "fvtvr-paris",
    nom: "FVTVR",
    type: "club",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Paris", en: "Paris" },
    latitude: 48.8408,
    longitude: 2.3702,
    capacite: 900,
    annee: 2023,
    styles: ["Techno","House","Electro","Experimental"],
    site: "https://www.instagram.com/fvtvr_paris/",
    description: {
      fr: "Nef brutaliste de béton sous la Cité de la Mode et du Design quai d’Austerlitz, accueillant les grands plateaux techno, electro et avant-garde à Paris.",
      en: "Brutalist concrete nave beneath the Cité de la Mode et du Design on Quai d’Austerlitz, hosting forward-thinking techno, electro and avant-garde lineups.",
    },
  },
  {
    id: "kilometre25-paris",
    nom: "Kilomètre25",
    type: "club",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Paris", en: "Paris" },
    latitude: 48.8994,
    longitude: 2.3921,
    capacite: 2200,
    annee: 2021,
    styles: ["Techno","Hard Techno","Trance","House"],
    site: "https://www.kilometre25.fr",
    description: {
      fr: "Club à ciel ouvert sous le boulevard périphérique parisien à la porte de la Villette, réunissant techno, hard techno et house du printemps à l’automne.",
      en: "Open-air club beneath the Paris ring road at Porte de la Villette, hosting techno, hard techno and house from spring through autumn.",
    },
  },
  {
    id: "mia-mao-paris",
    nom: "Mia Mao",
    type: "club",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Paris", en: "Paris" },
    latitude: 48.8952,
    longitude: 2.3911,
    capacite: 3000,
    annee: 2025,
    styles: ["Techno","Industrial","Hard Techno","Electro"],
    site: "https://www.instagram.com/miamao.paris/",
    description: {
      fr: "Immense cathédrale industrielle de 3 000 m² à La Villette dotée d’une politique sans photo et conçue pour les grandes nuits techno à Paris.",
      en: "Massive 3,000-square-meter industrial warehouse at La Villette featuring a strict no-photo policy and built for large-scale Parisian techno nights.",
    },
  },
  {
    id: "melomane-club-montpellier",
    nom: "Mélomane Club",
    type: "club",
    paysCode: "FR",
    villeSlug: "montpellier-fr",
    ville: { fr: "Montpellier", en: "Montpellier" },
    latitude: 43.5861,
    longitude: 3.8842,
    capacite: 450,
    annee: 2016,
    styles: ["Techno","Drum & Bass","Trance","Bass"],
    site: "https://melomaneclub.fr",
    description: {
      fr: "Club indépendant de la rue du Lantissargues équipé d’un système L-Acoustics, repaire des collectifs techno, psytrance, drum and bass et dub de Montpellier.",
      en: "Independent club on Rue du Lantissargues equipped with an L-Acoustics system, home to Montpellier’s techno, psytrance, drum and bass and dub collectives.",
    },
  },
  {
    id: "antirouille-montpellier",
    nom: "L’Antirouille",
    type: "club",
    paysCode: "FR",
    villeSlug: "montpellier-fr",
    ville: { fr: "Montpellier", en: "Montpellier" },
    latitude: 43.6061,
    longitude: 3.8738,
    capacite: 500,
    annee: 1995,
    styles: ["Techno","House","Electro","Bass"],
    site: "https://antirouille.net",
    description: {
      fr: "Club historique de la rue Anatole-France au centre de Montpellier, pilier des nuits techno, house et bass music depuis les années 1990.",
      en: "Historic club on Rue Anatole-France in central Montpellier, a pillar of local techno, house and bass music nights since the 1990s.",
    },
  },
  {
    id: "interference-toulouse",
    nom: "Interférence",
    type: "club",
    paysCode: "FR",
    villeSlug: "toulouse-fr",
    ville: { fr: "Toulouse", en: "Toulouse" },
    latitude: 43.6214,
    longitude: 1.4912,
    capacite: 2500,
    annee: 2024,
    styles: ["Techno","Hard Techno","House","Trance"],
    site: "https://interference-toulouse.fr",
    description: {
      fr: "Vaste complexe événementiel de Balma aux portes de Toulouse, devenu le nouveau vaisseau amiral des grandes nuits techno, rave et hard techno de la région.",
      en: "Large-scale venue in Balma on the edge of Toulouse, the flagship hall for major techno, rave and hard techno productions in the region.",
    },
  },
  {
    id: "cri-de-la-mouette-toulouse",
    nom: "Le Cri de la Mouette",
    type: "club",
    paysCode: "FR",
    villeSlug: "toulouse-fr",
    ville: { fr: "Toulouse", en: "Toulouse" },
    latitude: 43.6088,
    longitude: 1.4239,
    capacite: 300,
    annee: 1999,
    styles: ["House","Techno","Minimal","Electro"],
    site: "https://www.instagram.com/lecridelamouette/",
    description: {
      fr: "Péniche historique amarrée sur le canal de Brienne à Toulouse, où la cale se transforme chaque week-end en club intimiste house, minimal et techno.",
      en: "Historic barge moored on the Canal de Brienne in Toulouse, whose hold transforms every weekend into an intimate house, minimal and techno club.",
    },
  },
  {
    id: "bret-amsterdam",
    nom: "BRET",
    type: "club",
    paysCode: "NL",
    villeSlug: "amsterdam-nl",
    ville: { fr: "Amsterdam", en: "Amsterdam" },
    latitude: 52.3886,
    longitude: 4.8384,
    capacite: 350,
    annee: 2015,
    styles: ["Minimal","House","Techno","Microhouse"],
    site: "https://www.bret.bar",
    description: {
      fr: "Cube rouge de conteneurs maritimes recyclés face à la gare de Sloterdijk, célèbre pour ses marathons intimistes VBX et SlapFunk pendant ADE et tout l’été.",
      en: "Red cube built from upcycled shipping containers outside Sloterdijk station, famous for its intimate VBX and SlapFunk marathons during ADE and all summer.",
    },
  },
  {
    id: "garage-noord-amsterdam",
    nom: "Garage Noord",
    type: "club",
    paysCode: "NL",
    villeSlug: "amsterdam-nl",
    ville: { fr: "Amsterdam", en: "Amsterdam" },
    latitude: 52.3847,
    longitude: 4.9258,
    capacite: 250,
    annee: 2017,
    styles: ["Leftfield","Techno","Breaks","Jungle"],
    site: "https://garagenoord.com",
    description: {
      fr: "Ancien garage de réparation automobile d’Amsterdam-Noord transformé en club pointu dédié aux esthétiques club hybrides, breaks, jungle et techno expérimentale.",
      en: "Former auto repair shop in Amsterdam-Noord converted into a forward-thinking club dedicated to leftfield electronics, breaks, jungle and experimental techno.",
    },
  },
  {
    id: "moog-barcelone",
    nom: "Moog",
    type: "club",
    paysCode: "ES",
    villeSlug: "barcelone-es",
    ville: { fr: "Barcelone", en: "Barcelona" },
    latitude: 41.3781,
    longitude: 2.1749,
    capacite: 350,
    annee: 1996,
    styles: ["Techno","Electro","Acid","House"],
    site: "https://www.masimas.com/moog",
    description: {
      fr: "Bunker techno ouvert sept soirs sur sept au coeur du Raval près des Ramblas depuis 1996, fidèle à la techno pure, à l’electro et à l’acid.",
      en: "Seven-nights-a-week techno bunker in the heart of El Raval off La Rambla since 1996, devoted to pure techno, electro and acid.",
    },
  },
  {
    id: "macarena-barcelone",
    nom: "Macarena Club",
    type: "club",
    paysCode: "ES",
    villeSlug: "barcelone-es",
    ville: { fr: "Barcelone", en: "Barcelona" },
    latitude: 41.3792,
    longitude: 2.1774,
    capacite: 150,
    annee: 2001,
    styles: ["House","Minimal","Microhouse","Tech House"],
    site: "https://macarenaclub.com",
    description: {
      fr: "Micro-club du quartier gothique de Barcelone où la cabine DJ trône au milieu de la piste pour une proximité totale avec les artistes house et minimal.",
      en: "Intimate Gothic Quarter micro-club in Barcelona with the DJ booth right in the center of the dancefloor for house and minimal sessions.",
    },
  },
  {
    id: "knockdown-center-new-york",
    nom: "Knockdown Center",
    type: "club",
    paysCode: "US",
    villeSlug: "newyork-us",
    ville: { fr: "New York", en: "New York" },
    latitude: 40.7163,
    longitude: -73.9141,
    capacite: 3200,
    annee: 2014,
    styles: ["Techno","House","Experimental","Indie Dance"],
    site: "https://knockdown.center",
    description: {
      fr: "Ancienne manufacture de portes de 1903 sur 5 000 m² à la frontière de Brooklyn et du Queens, accueillant le Wire Festival, les nuits Ruins en plein air et les grandes tournées.",
      en: "Sprawling 1903 former door factory straddling the Brooklyn-Queens border, hosting Wire Festival, open-air Ruins sessions and large-scale electronic events.",
    },
  },
  {
    id: "bossa-nova-new-york",
    nom: "Bossa Nova Civic Club",
    type: "club",
    paysCode: "US",
    villeSlug: "newyork-us",
    ville: { fr: "New York", en: "New York" },
    latitude: 40.6968,
    longitude: -73.9275,
    capacite: 180,
    annee: 2012,
    styles: ["Techno","Industrial","Acid","Leftfield"],
    site: "https://bossanovacivicclub.com",
    description: {
      fr: "Bar-club enfumé sous le métro aérien de Myrtle Avenue à Bushwick, berceau de toute une génération de producteurs et DJs techno et expérimentaux de Brooklyn.",
      en: "Fog-filled club beneath the elevated train on Myrtle Avenue in Bushwick, incubator for a generation of Brooklyn techno and experimental artists.",
    },
  },
  {
    id: "elsewhere-new-york",
    nom: "Elsewhere",
    type: "club",
    paysCode: "US",
    villeSlug: "newyork-us",
    ville: { fr: "New York", en: "New York" },
    latitude: 40.7094,
    longitude: -73.9232,
    capacite: 1200,
    annee: 2017,
    styles: ["House","Techno","UK Bass","Indie Dance"],
    site: "https://www.elsewhere.club",
    description: {
      fr: "Complexe de trois étages à Bushwick réunissant The Hall, Zone One et un vaste toit-terrasse panoramique face à Manhattan.",
      en: "Three-level Bushwick venue combining The Hall, Zone One and a panoramic open-air rooftop overlooking the Manhattan skyline.",
    },
  },
  {
    id: "exchange-la",
    nom: "Exchange LA",
    type: "club",
    paysCode: "US",
    villeSlug: "losangeles-us",
    ville: { fr: "Los Angeles", en: "Los Angeles" },
    latitude: 34.0451,
    longitude: -118.2528,
    capacite: 1500,
    annee: 2010,
    styles: ["Techno","Trance","House","Tech House"],
    site: "https://exchangela.com",
    description: {
      fr: "Installé dans l’ancien édifice Art déco de la Bourse de Los Angeles (1929) sur Spring Street, sur quatre étages dominés par la salle des marchés.",
      en: "Housed inside the historic 1929 Art Deco Los Angeles Stock Exchange building on Spring Street across four levels.",
    },
  },
  {
    id: "avalon-hollywood-la",
    nom: "Avalon Hollywood",
    type: "club",
    paysCode: "US",
    villeSlug: "losangeles-us",
    ville: { fr: "Los Angeles", en: "Los Angeles" },
    latitude: 34.1028,
    longitude: -118.3269,
    capacite: 1500,
    annee: 2003,
    styles: ["Trance","House","Techno","Progressive House"],
    site: "https://avalonhollywood.com",
    description: {
      fr: "Monument historique de Vine Street face à Capitol Records à Hollywood, célèbre pour ses marathons jusqu’à l’aube sur système EAW Avalon sur mesure.",
      en: "Historic Vine Street landmark across from Capitol Records in Hollywood, famous for dawn marathons on its custom EAW Avalon sound system.",
    },
  },
  {
    id: "tangent-gallery-detroit",
    nom: "Tangent Gallery / Hastings Street Ballroom",
    type: "club",
    paysCode: "US",
    villeSlug: "detroit-us",
    ville: { fr: "Detroit", en: "Detroit" },
    latitude: 42.3712,
    longitude: -83.0631,
    capacite: 800,
    annee: 2002,
    styles: ["Detroit Techno","Acid","Electro","Industrial"],
    site: "https://www.tangentgallery.com",
    description: {
      fr: "Complexe artistique brut de Milwaukee Junction abritant les mythiques raves No Way Back et les marathons Interdimensional Transmissions.",
      en: "Raw industrial arts complex in Milwaukee Junction, home to the legendary No Way Back raves and Interdimensional Transmissions marathons.",
    },
  },
  {
    id: "leland-city-club-detroit",
    nom: "Leland City Club",
    type: "club",
    paysCode: "US",
    villeSlug: "detroit-us",
    ville: { fr: "Detroit", en: "Detroit" },
    latitude: 42.3338,
    longitude: -83.0558,
    capacite: 600,
    annee: 1983,
    styles: ["Industrial","Techno","Detroit Techno","EBM"],
    site: "https://www.lelandcityclub.net",
    description: {
      fr: "Salle de bal gothique et industrielle au sommet de l’hôtel historique Leland (1927), institution nocturne de Detroit depuis plus de quarante ans.",
      en: "Gothic and industrial ballroom inside the historic 1927 Leland Hotel, a Detroit underground institution for over forty years.",
    },
  },
  {
    id: "spybar-chicago",
    nom: "Spybar",
    type: "club",
    paysCode: "US",
    villeSlug: "chicago-us",
    ville: { fr: "Chicago", en: "Chicago" },
    latitude: 41.8936,
    longitude: -87.6358,
    capacite: 350,
    annee: 1998,
    styles: ["House","Techno","Tech House","Minimal"],
    site: "https://spybarchicago.com",
    description: {
      fr: "Sous-sol intimiste de River North actif depuis 1998 sur Franklin Street, pilier des nuits house et techno underground de Chicago.",
      en: "Intimate River North basement club active since 1998 on Franklin Street, a pillar of Chicago’s underground house and techno circuit.",
    },
  },
  {
    id: "podlasie-club-chicago",
    nom: "Podlasie Club",
    type: "club",
    paysCode: "US",
    villeSlug: "chicago-us",
    ville: { fr: "Chicago", en: "Chicago" },
    latitude: 41.9347,
    longitude: -87.7172,
    capacite: 200,
    annee: 2022,
    styles: ["Techno","Italo","Electro","House"],
    site: "https://podlasieclub.com",
    description: {
      fr: "Ancien bar polonais historique d’Avondale transformé en club électronique pointu pour les sélecteurs techno, italo disco, wave et house.",
      en: "Historic Polish neighborhood tavern in Avondale reborn as an intimate club for techno, Italo disco, wave and house selectors.",
    },
  },
  {
    id: "funk-club-mexico",
    nom: "Fünk Club",
    type: "club",
    paysCode: "MX",
    villeSlug: "mexico-mx",
    ville: { fr: "Mexico", en: "Mexico City" },
    latitude: 19.4108,
    longitude: -99.1683,
    capacite: 350,
    annee: 2019,
    styles: ["House","Techno","Minimal","Tech House"],
    site: "https://www.instagram.com/funkclubcdmx/",
    description: {
      fr: "Bunker souterrain de la Condesa sur l’avenue Insurgentes Sur, équipé d’un système Funktion-One réglé pour la house et la techno.",
      en: "Subterranean bunker in Condesa on Avenida Insurgentes Sur, outfitted with a precision-tuned Funktion-One system for house and techno.",
    },
  },
  {
    id: "mn-roy-mexico",
    nom: "M.N. Roy",
    type: "club",
    paysCode: "MX",
    villeSlug: "mexico-mx",
    ville: { fr: "Mexico", en: "Mexico City" },
    latitude: 19.4169,
    longitude: -99.1558,
    capacite: 300,
    annee: 2011,
    styles: ["House","Indie Dance","Techno","Deep House"],
    site: "https://www.instagram.com/mnroyclub/",
    description: {
      fr: "Club secret installé dans l’ancienne demeure historique du révolutionnaire indien M.N. Roy à Roma Norte, haut lieu des fins de nuit de Mexico.",
      en: "Secret club housed inside the former Roma Norte residence of Indian revolutionary M.N. Roy, a late-night fixture of Mexico City.",
    },
  },
  {
    id: "circus-tokyo",
    nom: "Circus Tokyo",
    type: "club",
    paysCode: "JP",
    villeSlug: "tokyo-jp",
    ville: { fr: "Tokyo", en: "Tokyo" },
    latitude: 35.6542,
    longitude: 139.7061,
    capacite: 250,
    annee: 2015,
    styles: ["UK Bass","Techno","Breaks","Jungle"],
    site: "https://circus-tokyo.jp",
    description: {
      fr: "Sous-sol brut de Shibuya dédié aux courants club avancés, de la UK bass à la techno industrielle en passant par le grime et la jungle.",
      en: "Raw basement club in Shibuya dedicated to forward-thinking club sounds spanning UK bass, industrial techno, grime and jungle.",
    },
  },
  {
    id: "oath-tokyo",
    nom: "Red Bar / Oath",
    type: "club",
    paysCode: "JP",
    villeSlug: "tokyo-jp",
    ville: { fr: "Tokyo", en: "Tokyo" },
    latitude: 35.6581,
    longitude: 139.6994,
    capacite: 150,
    annee: 2009,
    styles: ["House","Disco","Deep House","Techno"],
    site: "https://bar-oath.com",
    description: {
      fr: "Salon souterrain feutré sous des lustres baroques à Dogenzaka (Shibuya), célèbre pour ses nuits house et disco jusqu’au premier train du matin.",
      en: "Velvet-draped subterranean lounge beneath baroque chandeliers in Dogenzaka, Shibuya, famous for house and disco sessions until the first morning train.",
    },
  },
  {
    id: "new-guernica-melbourne",
    nom: "New Guernica",
    type: "club",
    paysCode: "AU",
    villeSlug: "melbourne-au",
    ville: { fr: "Melbourne", en: "Melbourne" },
    latitude: -37.8042,
    longitude: 144.9839,
    capacite: 450,
    annee: 2009,
    styles: ["House","Techno","Disco","Trance"],
    site: "https://newguernica.com.au",
    description: {
      fr: "Institution éclectique de Smith Street à Collingwood, dotée d’une cabine DJ à 360 degrés au coeur de la piste.",
      en: "Eclectic Smith Street club in Collingwood featuring an intimate 360-degree DJ booth in the middle of the dancefloor.",
    },
  },
  {
    id: "miscellania-melbourne",
    nom: "Miscellania",
    type: "club",
    paysCode: "AU",
    villeSlug: "melbourne-au",
    ville: { fr: "Melbourne", en: "Melbourne" },
    latitude: -37.8089,
    longitude: 144.9631,
    capacite: 300,
    annee: 2021,
    styles: ["Experimental","Techno","Breaks","Leftfield"],
    site: "https://www.instagram.com/miscellania_/",
    description: {
      fr: "Club indépendant sur Swanston Street avec toit-terrasse, fer de lance de la scène club expérimentale et queer de Melbourne.",
      en: "Independent Swanston Street club and rooftop terrace spearheading Melbourne’s experimental and queer club community.",
    },
  },
  {
    id: "ephigenia-sao-paulo",
    nom: "Ephigenia",
    type: "club",
    paysCode: "BR",
    villeSlug: "saopaulo-br",
    ville: { fr: "São Paulo", en: "Sao Paulo" },
    latitude: -23.5419,
    longitude: -46.6382,
    capacite: 600,
    annee: 2023,
    styles: ["House","Techno","Disco","Breaks"],
    site: "https://www.instagram.com/ephigeniasp/",
    description: {
      fr: "Installé aux 22e et 23e étages d’un gratte-ciel du centre historique de São Paulo avec vue panoramique sur le viaduc Santa Ifigênia.",
      en: "Perched on the 22nd and 23rd floors of a historic downtown São Paulo high-rise overlooking the Santa Ifigênia Viaduct.",
    },
  },
  {
    id: "caracol-sao-paulo",
    nom: "Caracol",
    type: "club",
    paysCode: "BR",
    villeSlug: "saopaulo-br",
    ville: { fr: "São Paulo", en: "Sao Paulo" },
    latitude: -23.5278,
    longitude: -46.6594,
    capacite: 350,
    annee: 2017,
    styles: ["House","Disco","Leftfield","Techno"],
    site: "https://www.instagram.com/caracolbar/",
    description: {
      fr: "Club audiophile de Barra Funda conçu autour d’un système sonore haute fidélité et d’une piste intimiste dédiée aux diggers brésiliens et internationaux.",
      en: "Barra Funda audiophile club built around a custom hi-fi sound system and an intimate dancefloor for Brazilian and international selectors.",
    },
  },
  /* ═══ NOUVEAUX FESTIVALS PAR PAYS (ENRICHISSEMENT) ═══ */
  {
    id: "veld-toronto-canada",
    nom: "Veld Music Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "toronto-ca",
    ville: { fr: "Toronto", en: "Toronto" },
    latitude: 43.7431,
    longitude: -79.4694,
    capacite: 40000,
    annee: 2012,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Techno","Bass","Trance"],
    site: "https://veldmusicfestival.com",
    description: {
      fr: "Le plus grand festival électronique d’Ontario au parc Downsview de Toronto, réunissant trois scènes géantes dont le chapiteau Sirkus dédié à la house et à la techno.",
      en: "Ontario’s largest electronic music festival at Toronto’s Downsview Park, uniting three massive stages including the underground-focused Sirkus tent.",
    },
  },
  {
    id: "escapade-ottawa-canada",
    nom: "Escapade Music Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "ottawa-ca",
    ville: { fr: "Ottawa", en: "Ottawa" },
    latitude: 45.3986,
    longitude: -75.6836,
    capacite: 25000,
    annee: 2010,
    mois: { fr: "Juin", en: "June" },
    styles: ["House","Bass","Trance","Techno"],
    site: "https://www.escapademf.com",
    description: {
      fr: "Grand rassemblement électronique de trois jours au parc Lansdowne à Ottawa, attirant des festivaliers de tout l’Est du Canada autour de la house, de la bass et de la trance.",
      en: "Major three-day electronic festival at Lansdowne Park in Ottawa, drawing fans from across Eastern Canada for house, bass and trance.",
    },
  },
  {
    id: "electric-island-toronto-canada",
    nom: "Electric Island",
    type: "festival",
    paysCode: "CA",
    villeSlug: "toronto-ca",
    ville: { fr: "Toronto", en: "Toronto" },
    latitude: 43.6289,
    longitude: -79.4158,
    capacite: 10000,
    annee: 2013,
    mois: { fr: "Mai - Septembre", en: "May - September" },
    styles: ["House","Techno","Melodic Techno","Deep House"],
    site: "https://www.electricisland.to",
    description: {
      fr: "Série de festivals en plein air lors des longs week-ends d’été au bord du lac Ontario à Toronto, dédiée aux grands noms internationaux de la house et de la techno.",
      en: "Summer long-weekend open-air festival series along the Lake Ontario waterfront in Toronto, showcasing international house and techno headliners.",
    },
  },
  {
    id: "bass-coast-canada",
    nom: "Bass Coast Festival",
    type: "festival",
    paysCode: "CA",
    ville: { fr: "Merritt (Colombie-Britannique)", en: "Merritt (British Columbia)" },
    latitude: 50.0975,
    longitude: -120.7931,
    capacite: 6500,
    annee: 2009,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Bass","UK Bass","House","Techno"],
    site: "https://basscoast.ca",
    description: {
      fr: "Festival indépendant fondé par Andrea Graham (The Librarian) et Liz Thomson dans la vallée Nicola, acclamé pour sa direction artistique bass music, house et installations sculpturales.",
      en: "Independent boutique festival founded by Andrea Graham (The Librarian) and Liz Thomson in the Nicola Valley, acclaimed for its bass, house and sculptural art curation.",
    },
  },
  {
    id: "chasing-summer-calgary-canada",
    nom: "Chasing Summer",
    type: "festival",
    paysCode: "CA",
    villeSlug: "calgary-ca",
    ville: { fr: "Calgary", en: "Calgary" },
    latitude: 51.0972,
    longitude: -113.9978,
    capacite: 18000,
    annee: 2013,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Trance","Bass","Tech House"],
    site: "https://www.chasingsummerfestival.com",
    description: {
      fr: "Le plus grand festival électronique en plein air des Prairies canadiennes, organisé chaque mois d’août à Calgary sur plusieurs scènes.",
      en: "Western Canada’s largest outdoor electronic music festival on the Prairies, held every August in Calgary.",
    },
  },
  {
    id: "badlands-calgary-canada",
    nom: "Badlands Music Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "calgary-ca",
    ville: { fr: "Calgary", en: "Calgary" },
    latitude: 51.0422,
    longitude: -114.0794,
    capacite: 12000,
    annee: 2014,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Drum & Bass","Bass","Tech House"],
    site: "https://www.badlandsmusicfest.com",
    description: {
      fr: "Marathon électronique de dix jours au centre-ville de Calgary en juillet, enchaînant têtes d’affiche house, drum and bass, techno et bass music.",
      en: "Ten-day electronic marathon in downtown Calgary every July, featuring house, drum and bass, techno and bass music headliners.",
    },
  },
  {
    id: "contact-vancouver-canada",
    nom: "Contact Winter Music Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "vancouver-ca",
    ville: { fr: "Vancouver", en: "Vancouver" },
    latitude: 49.2767,
    longitude: -123.1119,
    capacite: 15000,
    annee: 2012,
    mois: { fr: "Décembre", en: "December" },
    styles: ["House","Bass","Techno","Trance"],
    site: "https://contact-festival.com",
    description: {
      fr: "Grand rassemblement électronique hivernal de la côte Ouest canadienne à Vancouver pour clore l’année entre Noël et le Jour de l’An.",
      en: "Western Canada’s flagship indoor winter electronic festival in Vancouver, held every December between Christmas and New Year’s Eve.",
    },
  },
  {
    id: "fvded-vancouver-canada",
    nom: "FVDED in the Park",
    type: "festival",
    paysCode: "CA",
    villeSlug: "vancouver-ca",
    ville: { fr: "Vancouver (Surrey)", en: "Vancouver (Surrey)" },
    latitude: 49.1808,
    longitude: -122.8492,
    capacite: 25000,
    annee: 2015,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Drum & Bass","Bass","UK Garage"],
    site: "https://fvdedinthepark.com",
    description: {
      fr: "Grand festival d’été au parc Holland dans le Grand Vancouver, doté d’une programmation électronique de premier plan (house, UK garage, drum and bass, bass).",
      en: "Major summer festival at Holland Park in Metro Vancouver featuring a heavyweight electronic lineup across house, UK garage, drum and bass and bass.",
    },
  },
  {
    id: "edc-las-vegas-us",
    nom: "EDC Las Vegas (Electric Daisy Carnival)",
    type: "festival",
    paysCode: "US",
    ville: { fr: "Las Vegas", en: "Las Vegas" },
    latitude: 36.2725,
    longitude: -115.0103,
    capacite: 150000,
    annee: 1997,
    mois: { fr: "Mai", en: "May" },
    styles: ["House","Techno","Bass","Trance"],
    site: "https://lasvegas.electricdaisycarnival.com",
    description: {
      fr: "Le plus grand festival électronique d’Amérique du Nord au Las Vegas Motor Speedway, fonctionnant du coucher au lever du soleil devant 150 000 personnes par nuit sur huit scènes dont NeonGARDEN et Factory 93.",
      en: "North America’s largest electronic music festival at the Las Vegas Motor Speedway, running from dusk till dawn for 150,000 attendees per night across eight stages including NeonGARDEN.",
    },
  },
  {
    id: "ultra-miami-us",
    nom: "Ultra Music Festival",
    type: "festival",
    paysCode: "US",
    ville: { fr: "Miami", en: "Miami" },
    latitude: 25.7743,
    longitude: -80.1859,
    capacite: 55000,
    annee: 1999,
    mois: { fr: "Mars", en: "March" },
    styles: ["Techno","House","Trance","Bass"],
    site: "https://ultramusicfestival.com",
    description: {
      fr: "Point d’orgue de la Miami Music Week à Bayfront Park, abritant la mégastructure RESISTANCE dédiée à Carl Cox et aux têtes d’affiche mondiales de la techno et de la house.",
      en: "Flagship festival of Miami Music Week at Bayfront Park, home to the iconic RESISTANCE Megastructure hosted by Carl Cox and global techno and house leaders.",
    },
  },
  {
    id: "crssd-san-diego-us",
    nom: "CRSSD Festival",
    type: "festival",
    paysCode: "US",
    ville: { fr: "San Diego", en: "San Diego" },
    latitude: 32.7214,
    longitude: -117.1725,
    capacite: 15000,
    annee: 2015,
    mois: { fr: "Mars & Septembre", en: "March & September" },
    styles: ["House","Techno","Indie Dance","Live Electronic"],
    site: "https://www.crssdfest.com",
    description: {
      fr: "Festival semestriel sur le front de mer de Waterfront Park à San Diego, célèbre pour ses scènes City Steps (techno), The Palms (house) et Ocean View (lives électroniques).",
      en: "Biannual waterfront festival at San Diego’s Waterfront Park, renowned for its City Steps (techno), The Palms (house) and Ocean View (live electronic) stages.",
    },
  },
  {
    id: "portola-san-francisco-us",
    nom: "Portola Music Festival",
    type: "festival",
    paysCode: "US",
    ville: { fr: "San Francisco", en: "San Francisco" },
    latitude: 37.7528,
    longitude: -122.3711,
    capacite: 40000,
    annee: 2022,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Live Electronic","House","Techno","UK Bass"],
    site: "https://portolamusicfestival.com",
    description: {
      fr: "Installé sur les quais industriels du Pier 80 à San Francisco avec son gigantesque hangar Warehouse de 25 000 places consacré à la culture club.",
      en: "Set on the industrial docks of Pier 80 in San Francisco, anchored by its cavernous 25,000-capacity Warehouse stage.",
    },
  },
  {
    id: "electric-forest-us",
    nom: "Electric Forest",
    type: "festival",
    paysCode: "US",
    ville: { fr: "Rothbury (Michigan)", en: "Rothbury (Michigan)" },
    latitude: 43.5247,
    longitude: -86.3642,
    capacite: 45000,
    annee: 2011,
    mois: { fr: "Juin", en: "June" },
    styles: ["Bass","House","Downtempo","Techno"],
    site: "https://www.electricforest.com",
    description: {
      fr: "Quatre jours d’immersion au coeur de la forêt Sherwood dans le Michigan, mêlant installations lumineuses monumentales, bass music et scènes house.",
      en: "Four-day immersive gathering inside Michigan’s Sherwood Forest, blending monumental light installations with bass music and house stages.",
    },
  },
  {
    id: "seismic-austin-us",
    nom: "Seismic Dance Event",
    type: "festival",
    paysCode: "US",
    ville: { fr: "Austin (Texas)", en: "Austin (Texas)" },
    latitude: 30.2094,
    longitude: -97.7058,
    capacite: 10000,
    annee: 2018,
    mois: { fr: "Novembre", en: "November" },
    styles: ["Techno","House","Melodic Techno","Tech House"],
    site: "https://www.seismicdanceevent.com",
    description: {
      fr: "Le festival boutique de référence du sud des États-Unis au Concourse Project d’Austin, entièrement consacré à la house et à la techno underground.",
      en: "The American South’s premier boutique underground house and techno festival, held at The Concourse Project in Austin.",
    },
  },
  {
    id: "lost-lands-us",
    nom: "Lost Lands",
    type: "festival",
    paysCode: "US",
    ville: { fr: "Legend Valley (Ohio)", en: "Legend Valley (Ohio)" },
    latitude: 39.9394,
    longitude: -82.4044,
    capacite: 45000,
    annee: 2017,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Dubstep","Bass","Drum & Bass"],
    site: "https://www.lostlandsfestival.com",
    description: {
      fr: "Fondé par le producteur canadien Excision en Ohio, le plus grand rassemblement mondial consacré au dubstep, à la bass music et à la drum and bass.",
      en: "Founded by Canadian producer Excision in Ohio, the world’s largest festival dedicated to dubstep, heavy bass music and drum and bass.",
    },
  },
  {
    id: "lightning-in-a-bottle-us",
    nom: "Lightning in a Bottle",
    type: "festival",
    paysCode: "US",
    ville: { fr: "Buena Vista Lake (Californie)", en: "Buena Vista Lake (California)" },
    latitude: 35.2361,
    longitude: -119.2869,
    capacite: 22000,
    annee: 2004,
    mois: { fr: "Mai", en: "May" },
    styles: ["House","Techno","Bass","Downtempo"],
    site: "https://www.libfestival.org",
    description: {
      fr: "Festival californien produit par le collectif Do LaB autour des scènes architecturales Woogie (house et techno) et Thunder (bass music).",
      en: "California festival produced by the Do LaB collective around the architectural Woogie (house and techno) and Thunder (bass) stages.",
    },
  },
  {
    id: "wire-festival-ny-us",
    nom: "Wire Festival",
    type: "festival",
    paysCode: "US",
    villeSlug: "newyork-us",
    ville: { fr: "New York", en: "New York" },
    latitude: 40.7161,
    longitude: -73.9139,
    capacite: 4500,
    annee: 2023,
    mois: { fr: "Mai", en: "May" },
    styles: ["Techno","Acid Techno","Industrial","Electro"],
    site: "https://basementny.net",
    description: {
      fr: "Marathon techno de trois jours et trois nuits organisé par l’équipe de BASEMENT au Knockdown Center à New York.",
      en: "Three-day, three-night purist techno marathon curated by the BASEMENT team across the Knockdown Center complex in New York.",
    },
  },
  {
    id: "edc-mexico-mexique",
    nom: "EDC Mexico",
    type: "festival",
    paysCode: "MX",
    villeSlug: "mexico-mx",
    ville: { fr: "Mexico", en: "Mexico City" },
    latitude: 19.4039,
    longitude: -99.0903,
    capacite: 110000,
    annee: 2014,
    mois: { fr: "Février", en: "February" },
    styles: ["House","Techno","Trance","Bass"],
    site: "https://mexico.electricdaisycarnival.com",
    description: {
      fr: "Le plus grand festival électronique d’Amérique latine sur le circuit Autódromo Hermanos Rodríguez de Mexico, rassemblant plus de 100 000 personnes par jour.",
      en: "Latin America’s largest electronic music festival at Mexico City’s Autódromo Hermanos Rodríguez, drawing over 100,000 attendees per day.",
    },
  },
  {
    id: "day-zero-tulum-mexique",
    nom: "Day Zero",
    type: "festival",
    paysCode: "MX",
    ville: { fr: "Tulum (Dos Ojos)", en: "Tulum (Dos Ojos)" },
    latitude: 20.3247,
    longitude: -87.3911,
    capacite: 8000,
    annee: 2012,
    mois: { fr: "Janvier", en: "January" },
    styles: ["House","Deep House","Techno","Indie Dance"],
    site: "https://dayzerofestival.com",
    description: {
      fr: "Créé par Damian Lazarus (Crosstown Rebels) en 2012 à la fin du calendrier maya dans les cénotes de Dos Ojos à Tulum, du coucher du soleil jusqu’au lendemain matin.",
      en: "Created by Damian Lazarus (Crosstown Rebels) in 2012 at the end of the Mayan calendar inside the Dos Ojos cenote park in Tulum, running from sunset through sunrise.",
    },
  },
  {
    id: "akamba-mexique",
    nom: "Akamba Festival",
    type: "festival",
    paysCode: "MX",
    ville: { fr: "Tequila (Jalisco)", en: "Tequila (Jalisco)" },
    latitude: 20.8819,
    longitude: -103.8325,
    capacite: 8000,
    annee: 2018,
    mois: { fr: "Mai", en: "May" },
    styles: ["House","Indie Dance","Downtempo","Techno"],
    site: "https://akamba.mx",
    description: {
      fr: "Festival électronique au milieu des champs d’agaves bleus au pied du volcan de Tequila à Jalisco.",
      en: "Open-air electronic festival set amid blue agave fields at the foot of the Tequila volcano in Jalisco.",
    },
  },
  {
    id: "nation-of-gondwana-allemagne",
    nom: "Nation of Gondwana",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Grünefeld (près de Berlin)", en: "Grünefeld (near Berlin)" },
    latitude: 52.6772,
    longitude: 12.9689,
    capacite: 12000,
    annee: 1995,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","House","Ambient","Electro"],
    site: "https://pyonen.de",
    description: {
      fr: "Organisé depuis 1995 par le collectif Pyonen autour d’un lac à l’ouest de Berlin, l’un des festivals en plein air les plus authentiques de la culture rave berlinoise.",
      en: "Organized since 1995 by the Pyonen collective around a lake west of Berlin, one of the most authentic open-air gatherings of Berlin rave culture.",
    },
  },
  {
    id: "stone-techno-allemagne",
    nom: "Stone Techno Festival",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Essen (Zeche Zollverein)", en: "Essen (Zeche Zollverein)" },
    latitude: 51.4864,
    longitude: 7.0447,
    capacite: 10000,
    annee: 2020,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","Hardgroove","Electro","Hypnotic Techno"],
    site: "https://www.thethirdroom.de",
    description: {
      fr: "Produit par The Third Room en partenariat avec ARTE Concert au coeur de l’ancienne mine de charbon Zeche Zollverein classée à l’UNESCO.",
      en: "Produced by The Third Room in partnership with ARTE Concert across the UNESCO World Heritage Zeche Zollverein coal mine complex in Essen.",
    },
  },
  {
    id: "garbicz-festival-allemagne",
    nom: "Garbicz Festival",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Garbicz (axe Berlin - Pologne)", en: "Garbicz (Berlin - Poland border)" },
    latitude: 52.3136,
    longitude: 14.9711,
    capacite: 8000,
    annee: 2013,
    mois: { fr: "Août", en: "August" },
    styles: ["Deep House","Minimal","House","Techno"],
    site: "https://garbiczfestival.com",
    description: {
      fr: "Rendez-vous forestier et lacustre de la communauté des clubs berlinois (Kater Blau, Sisyphos) à une heure à l’est de Berlin.",
      en: "Forest and lakeside gathering born from Berlin’s Kater Blau and Sisyphos community an hour east of the German capital.",
    },
  },
  {
    id: "mayday-dortmund-allemagne",
    nom: "MAYDAY",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Dortmund (Westfalenhallen)", en: "Dortmund (Westfalenhallen)" },
    latitude: 51.4964,
    longitude: 7.4558,
    capacite: 18000,
    annee: 1991,
    mois: { fr: "Avril (30 avril)", en: "April (April 30)" },
    styles: ["Techno","Hard Techno","Trance","Hardcore"],
    site: "https://www.mayday.de",
    description: {
      fr: "La mère de toutes les raves en salle en Allemagne, fondée en décembre 1991 à Berlin pour sauver la radio DT64 et installée depuis dans les Westfalenhallen de Dortmund.",
      en: "The mother of all German indoor raves, founded in December 1991 in Berlin and held every April 30 across Dortmund’s Westfalenhallen.",
    },
  },
  {
    id: "parookaville-allemagne",
    nom: "Parookaville",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Weeze (Aéroport)", en: "Weeze (Airport)" },
    latitude: 51.6025,
    longitude: 6.1422,
    capacite: 75000,
    annee: 2015,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Techno","Hardstyle","Trance"],
    site: "https://www.parookaville.com",
    description: {
      fr: "Ville-festival éphémère érigée dans les hangars et pistes de l’ancienne base aérienne de la Royal Air Force à Weeze en Rhénanie.",
      en: "Ephemeral festival city erected across the shelters and runways of the former Royal Air Force base in Weeze.",
    },
  },
  {
    id: "sonnemondsterne-allemagne",
    nom: "SonneMondSterne (SMS)",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Saalburg-Ebersdorf", en: "Saalburg-Ebersdorf" },
    latitude: 50.4958,
    longitude: 11.7244,
    capacite: 40000,
    annee: 1997,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","House","Drum & Bass","Electro"],
    site: "https://www.sonnemondsterne.de",
    description: {
      fr: "Grand festival en plein air au bord du barrage de Bleiloch en Thuringe, actif depuis 1997 avec scènes sur la plage et bateau de croisière électronique.",
      en: "Major open-air electronic festival on the shores of the Bleiloch reservoir in Thuringia, running since 1997.",
    },
  },
  {
    id: "ade-amsterdam-pays-bas",
    nom: "Amsterdam Dance Event (ADE)",
    type: "festival",
    paysCode: "NL",
    villeSlug: "amsterdam-nl",
    ville: { fr: "Amsterdam", en: "Amsterdam" },
    latitude: 52.3702,
    longitude: 4.8952,
    capacite: 100000,
    annee: 1996,
    mois: { fr: "Octobre", en: "October" },
    styles: ["Techno","House","Trance","Electro"],
    site: "https://www.amsterdam-dance-event.nl",
    description: {
      fr: "Le plus grand festival de clubs et sommet professionnel de musique électronique au monde, réunissant plus de 2 500 artistes dans 200 lieux d’Amsterdam pendant cinq jours.",
      en: "The world’s largest club festival and electronic music conference, uniting over 2,500 artists across 200 Amsterdam venues over five days.",
    },
  },
  {
    id: "mysteryland-pays-bas",
    nom: "Mysteryland",
    type: "festival",
    paysCode: "NL",
    ville: { fr: "Haarlemmermeer", en: "Haarlemmermeer" },
    latitude: 52.3292,
    longitude: 4.6658,
    capacite: 60000,
    annee: 1993,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Techno","Hardstyle","Trance"],
    site: "https://www.mysteryland.nl",
    description: {
      fr: "Fondé en 1993, le plus ancien festival de musique électronique en activité au monde, organisé autour de la pyramide du parc Floriade près d’Amsterdam.",
      en: "Founded in 1993, the world’s longest-running electronic music festival, held around the pyramid hill of the Floriade grounds near Amsterdam.",
    },
  },
  {
    id: "loveland-amsterdam-pays-bas",
    nom: "Loveland Festival",
    type: "festival",
    paysCode: "NL",
    villeSlug: "amsterdam-nl",
    ville: { fr: "Amsterdam (Sloterpark)", en: "Amsterdam (Sloterpark)" },
    latitude: 52.3694,
    longitude: 4.8122,
    capacite: 25000,
    annee: 1995,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Techno","Melodic Techno","Progressive House"],
    site: "https://loveland.nl",
    description: {
      fr: "Institution amstellodamoise au bord du lac de Sloterpark depuis 1995, célébrant la house, la techno mélodique et la progressive house.",
      en: "Amsterdam lakeside institution in Sloterpark since 1995, celebrating house, techno, melodic techno and progressive house.",
    },
  },
  {
    id: "defqon-1-pays-bas",
    nom: "Defqon.1 Weekend Festival",
    type: "festival",
    paysCode: "NL",
    ville: { fr: "Biddinghuizen", en: "Biddinghuizen" },
    latitude: 52.4414,
    longitude: 5.7586,
    capacite: 65000,
    annee: 2003,
    mois: { fr: "Juin", en: "June" },
    styles: ["Hardstyle","Hardcore","Gabber","Hard Techno"],
    site: "https://www.q-dance.com",
    description: {
      fr: "La Mecque mondiale des styles hard (hardstyle, hardcore, gabber, industrial hardcore) organisée par Q-dance sur quatre jours à Biddinghuizen.",
      en: "The global Mecca of harder styles (hardstyle, hardcore, gabber, industrial hardcore) staged by Q-dance across four days in Biddinghuizen.",
    },
  },
  {
    id: "asot-rotterdam-pays-bas",
    nom: "A State of Trance (ASOT)",
    type: "festival",
    paysCode: "NL",
    ville: { fr: "Rotterdam (Ahoy)", en: "Rotterdam (Ahoy)" },
    latitude: 51.8825,
    longitude: 4.4883,
    capacite: 35000,
    annee: 2001,
    mois: { fr: "Février", en: "February" },
    styles: ["Trance","Progressive House","Techno"],
    site: "https://festival.astateoftrance.com",
    description: {
      fr: "Le plus grand rassemblement mondial consacré à la musique trance, fondé par Armin van Buuren et organisé dans les halls de Rotterdam Ahoy.",
      en: "The world’s premier trance music gathering, founded by Armin van Buuren and staged across the halls of Rotterdam Ahoy.",
    },
  },
  {
    id: "soenda-utrecht-pays-bas",
    nom: "Soenda Festival",
    type: "festival",
    paysCode: "NL",
    ville: { fr: "Utrecht (Ruigenhoekse Polder)", en: "Utrecht (Ruigenhoekse Polder)" },
    latitude: 52.1422,
    longitude: 5.1256,
    capacite: 15000,
    annee: 2009,
    mois: { fr: "Mai - Juin", en: "May - June" },
    styles: ["Techno","Hard Techno","House","Electro"],
    site: "https://www.soenda.com",
    description: {
      fr: "Grand rassemblement techno et house au nord d’Utrecht, reconnu pour la qualité de ses six scènes curatées.",
      en: "Major techno and house festival north of Utrecht, celebrated for its six tightly curated stages.",
    },
  },
  {
    id: "peacock-society-france",
    nom: "Peacock Society",
    type: "festival",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Paris", en: "Paris" },
    latitude: 48.7711,
    longitude: 2.4533,
    capacite: 25000,
    annee: 2013,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","House","Hard Techno","UK Bass"],
    site: "https://peacocksociety.fr",
    description: {
      fr: "Grand rendez-vous électronique du Grand Paris réunissant les scènes techno, house, hardgroove et UK bass internationales.",
      en: "Flagship Greater Paris electronic music festival uniting international techno, house, hardgroove and UK bass stages.",
    },
  },
  {
    id: "cercle-festival-france",
    nom: "Cercle Festival",
    type: "festival",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Paris (Musée de l’Air et de l’Espace, Le Bourget)", en: "Paris (Air and Space Museum, Le Bourget)" },
    latitude: 48.9472,
    longitude: 2.4347,
    capacite: 24000,
    annee: 2019,
    mois: { fr: "Mai (biennal)", en: "May (biennial)" },
    styles: ["Melodic Techno","House","Indie Dance","Techno"],
    site: "https://festival.cercle.io",
    description: {
      fr: "Organisé par le média français Cercle sur le tarmac du Musée de l’Air et de l’Espace au Bourget, avec trois scènes installées sous la fusée Ariane 5, un Concorde et un A380.",
      en: "Staged by Cercle on the tarmac of the Air and Space Museum at Le Bourget near Paris, with three stages set beneath the Ariane 5 rocket, the Concorde and an A380.",
    },
  },
  {
    id: "family-piknik-france",
    nom: "Family Piknik",
    type: "festival",
    paysCode: "FR",
    villeSlug: "montpellier-fr",
    ville: { fr: "Montpellier / Frontignan", en: "Montpellier / Frontignan" },
    latitude: 43.4472,
    longitude: 3.7558,
    capacite: 20000,
    annee: 2012,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Techno","Melodic Techno","Minimal"],
    site: "https://www.familypiknikfestival.com",
    description: {
      fr: "Festival méditerranéen fondé par Tom Pooks près de Montpellier, célèbre pour ses longs sets house, techno et melodic techno en plein air.",
      en: "Mediterranean open-air festival founded by Tom Pooks near Montpellier, famed for extended house, techno and melodic techno sets.",
    },
  },
  {
    id: "plages-electroniques-france",
    nom: "Les Plages Électroniques",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Cannes", en: "Cannes" },
    latitude: 43.5506,
    longitude: 7.0189,
    capacite: 50000,
    annee: 2006,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Techno","Bass","Melodic Techno"],
    site: "https://www.plages-electroniques.com",
    description: {
      fr: "Trois jours de fête les pieds dans l’eau sur la plage et le toit du Palais des Festivals de Cannes, devant plus de 50 000 festivaliers.",
      en: "Three days of beachfront and rooftop electronic stages at the Palais des Festivals in Cannes, drawing over 50,000 attendees.",
    },
  },
  {
    id: "tomorrowland-winter-france",
    nom: "Tomorrowland Winter",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Alpe d’Huez", en: "Alpe d’Huez" },
    latitude: 45.0922,
    longitude: 6.0697,
    capacite: 22000,
    annee: 2019,
    mois: { fr: "Mars", en: "March" },
    styles: ["House","Techno","Melodic Techno","Trance"],
    site: "https://winter.tomorrowland.com",
    description: {
      fr: "Édition hivernale de Tomorrowland perchée entre 1 860 et 3 330 mètres d’altitude sur les pistes de l’Alpe d’Huez dans les Alpes françaises.",
      en: "Winter mountain edition of Tomorrowland perched between 1,860 and 3,330 meters on the slopes of Alpe d’Huez in the French Alps.",
    },
  },
  {
    id: "marvellous-island-france",
    nom: "Marvellous Island",
    type: "festival",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Torcy (Grand Paris)", en: "Torcy (Greater Paris)" },
    latitude: 48.8639,
    longitude: 2.6514,
    capacite: 25000,
    annee: 2013,
    mois: { fr: "Mai (Pentecôte)", en: "May (Pentecost)" },
    styles: ["House","Techno","Tech House","Hard Techno"],
    site: "https://marvellous-island.fr",
    description: {
      fr: "Festival électronique au bord de la plage et du lac de Vaires-Torcy en Île-de-France, ouvrant la saison des festivals d’été autour de cinq scènes.",
      en: "Lakeside and beach electronic festival at Vaires-Torcy in Greater Paris, opening the French summer season across five stages.",
    },
  },
  {
    id: "hadra-trance-festival-france",
    nom: "Hadra Trance Festival",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Vieure (Allier)", en: "Vieure (Allier)" },
    latitude: 46.5042,
    longitude: 2.8758,
    capacite: 10000,
    annee: 2005,
    mois: { fr: "Août", en: "August" },
    styles: ["Psy","Ambient","Downtempo","Techno"],
    site: "https://www.hadra.net",
    description: {
      fr: "Le grand rassemblement psychédélique français au bord du plan d’eau de Vieure, dédié à la psytrance, à la darkprog, au dub et à l’ambient.",
      en: "France’s flagship psychedelic gathering on the shores of Lake Vieure, dedicated to psytrance, progressive, dub and ambient.",
    },
  },
  {
    id: "creamfields-royaume-uni",
    nom: "Creamfields",
    type: "festival",
    paysCode: "GB",
    ville: { fr: "Daresbury (Cheshire)", en: "Daresbury (Cheshire)" },
    latitude: 53.3414,
    longitude: -2.6269,
    capacite: 70000,
    annee: 1998,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Techno","Trance","Drum & Bass"],
    site: "https://creamfields.com",
    description: {
      fr: "Né du club Cream de Liverpool en 1998, le plus grand festival électronique en plein air du Royaume-Uni avec sa structure géante Steel Yard.",
      en: "Born out of Liverpool’s Cream club in 1998, the UK’s largest open-air electronic dance festival featuring the monumental Steel Yard superstructure.",
    },
  },
  {
    id: "terminal-v-royaume-uni",
    nom: "Terminal V",
    type: "festival",
    paysCode: "GB",
    ville: { fr: "Édimbourg", en: "Edinburgh" },
    latitude: 55.9414,
    longitude: -3.3725,
    capacite: 20000,
    annee: 2017,
    mois: { fr: "Avril & Octobre", en: "April & October" },
    styles: ["Techno","Hard Techno","House","Electro"],
    site: "https://terminalv.co.uk",
    description: {
      fr: "Le plus grand festival techno d’Écosse dans les immenses hangars du Royal Highland Centre d’Édimbourg.",
      en: "Scotland’s largest techno festival, staged inside the vast aircraft-hangar halls of Edinburgh’s Royal Highland Centre.",
    },
  },
  {
    id: "field-day-londres-royaume-uni",
    nom: "Field Day",
    type: "festival",
    paysCode: "GB",
    villeSlug: "londres-gb",
    ville: { fr: "Londres", en: "London" },
    latitude: 51.5364,
    longitude: -0.0392,
    capacite: 35000,
    annee: 2007,
    mois: { fr: "Mai - Août", en: "May - August" },
    styles: ["Techno","UK Bass","IDM","House"],
    site: "https://fielddayfestivals.com",
    description: {
      fr: "Rendez-vous londonien dédié aux têtes d’affiche de l’électronique d’avant-garde (Aphex Twin, Bicep, Chemical Brothers, Kraftwerk) et à la scène club britannique.",
      en: "Landmark London festival championing avant-garde electronic headliners (Aphex Twin, Bicep, Chemical Brothers) and UK club culture.",
    },
  },
  {
    id: "gala-londres-royaume-uni",
    nom: "GALA Festival",
    type: "festival",
    paysCode: "GB",
    villeSlug: "londres-gb",
    ville: { fr: "Londres (Peckham Rye Park)", en: "London (Peckham Rye Park)" },
    latitude: 51.4567,
    longitude: -0.0658,
    capacite: 15000,
    annee: 2016,
    mois: { fr: "Mai", en: "May" },
    styles: ["House","Disco","UK Garage","Techno"],
    site: "https://thisisgala.co.uk",
    description: {
      fr: "Trois jours à Peckham Rye Park au sud de Londres, célébrant l’héritage du Paradise Garage, de la house, du disco et des collectifs indépendants londoniens.",
      en: "Three days in South London’s Peckham Rye Park celebrating the heritage of Paradise Garage, house, disco and independent London collectives.",
    },
  },
  {
    id: "lost-village-royaume-uni",
    nom: "Lost Village",
    type: "festival",
    paysCode: "GB",
    ville: { fr: "Norton Disney (Lincolnshire)", en: "Norton Disney (Lincolnshire)" },
    latitude: 53.1339,
    longitude: -0.6742,
    capacite: 20000,
    annee: 2015,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Disco","Techno","Indie Dance"],
    site: "https://lostvillagefestival.com",
    description: {
      fr: "Festival immersif au milieu d’une forêt abandonnée du Lincolnshire, créé par les fondateurs de Moda Black (Jaymo & Andy George).",
      en: "Immersive forest festival in Lincolnshire created by Moda Black founders Jaymo & Andy George, blending house, disco and techno.",
    },
  },
  {
    id: "aquasella-espagne",
    nom: "Aquasella",
    type: "festival",
    paysCode: "ES",
    ville: { fr: "Arriondas (Asturies)", en: "Arriondas (Asturias)" },
    latitude: 43.3889,
    longitude: -5.1858,
    capacite: 25000,
    annee: 1997,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Hardgroove","Tech House","Hard Techno"],
    site: "https://aquasella.com",
    description: {
      fr: "Pèlerinage techno historique depuis 1997 dans la vallée de la rivière Sella au coeur des montagnes des Asturies.",
      en: "Historic techno pilgrimage running since 1997 in the Sella River valley in the mountains of Asturias.",
    },
  },
  {
    id: "brunch-electronik-festival-espagne",
    nom: "Brunch Electronik Festival",
    type: "festival",
    paysCode: "ES",
    villeSlug: "barcelone-es",
    ville: { fr: "Barcelone", en: "Barcelona" },
    latitude: 41.4108,
    longitude: 2.2261,
    capacite: 30000,
    annee: 2023,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Melodic Techno","Techno","Indie Dance"],
    site: "https://brunchelectronikfestival.com",
    description: {
      fr: "Grand rassemblement estival de trois jours entre le Parc del Fòrum et les jardins de Montjuïc à Barcelone.",
      en: "Major three-day summer festival spanning Barcelona’s Parc del Fòrum and the gardens of Montjuïc.",
    },
  },
  {
    id: "dreambeach-espagne",
    nom: "Dreambeach",
    type: "festival",
    paysCode: "ES",
    ville: { fr: "Almería", en: "Almería" },
    latitude: 36.8358,
    longitude: -2.3239,
    capacite: 35000,
    annee: 2013,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Drum & Bass","House","Hardstyle"],
    site: "https://www.dreambeach.es",
    description: {
      fr: "Grand festival de la côte andalouse à Almería avec son immense chapiteau Dreams Tent dédié à la techno et une scène majeure drum and bass.",
      en: "Flagship Andalusian coast festival in Almería featuring the massive Dreams Tent for underground techno alongside a major drum and bass stage.",
    },
  },
  {
    id: "mira-festival-barcelone-espagne",
    nom: "MIRA Digital Arts Festival",
    type: "festival",
    paysCode: "ES",
    villeSlug: "barcelone-es",
    ville: { fr: "Barcelone", en: "Barcelona" },
    latitude: 41.3642,
    longitude: 2.1328,
    capacite: 5000,
    annee: 2011,
    mois: { fr: "Novembre", en: "November" },
    styles: ["Ambient","IDM","Experimental","Techno"],
    site: "https://mirafestival.com",
    description: {
      fr: "Festival barcelonais d’arts numériques et de performances audiovisuelles électroniques à la Fira Montjuïc.",
      en: "Barcelona digital arts and audiovisual electronic music festival held at Fira Montjuïc.",
    },
  },
  {
    id: "extrema-outdoor-belgique",
    nom: "Extrema Outdoor Belgium",
    type: "festival",
    paysCode: "BE",
    ville: { fr: "Houthalen-Helchteren", en: "Houthalen-Helchteren" },
    latitude: 51.0528,
    longitude: 5.3944,
    capacite: 25000,
    annee: 2011,
    mois: { fr: "Mai (Pentecôte)", en: "May (Pentecost)" },
    styles: ["Techno","House","Melodic Techno","Tech House"],
    site: "https://extrema.be",
    description: {
      fr: "Trois jours au bord du lac de De Plas dans le Limbourg belge, réunissant les plus grands labels house et techno européens.",
      en: "Three days by the lake of De Plas in Belgian Limburg, hosting showcases by Europe’s leading house and techno labels.",
    },
  },
  {
    id: "rampage-open-air-belgique",
    nom: "Rampage Open Air",
    type: "festival",
    paysCode: "BE",
    ville: { fr: "Lommel", en: "Lommel" },
    latitude: 51.2094,
    longitude: 5.2531,
    capacite: 25000,
    annee: 2019,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Drum & Bass","Dubstep","Bass"],
    site: "https://www.rampage.eu",
    description: {
      fr: "Le plus grand festival de drum and bass et de dubstep de la planète, décliné en version plein air de quatre jours à Lommel.",
      en: "The largest drum and bass and dubstep festival on the planet, staged across four open-air days in Lommel.",
    },
  },
  {
    id: "dour-festival-belgique",
    nom: "Dour Festival",
    type: "festival",
    paysCode: "BE",
    ville: { fr: "Dour", en: "Dour" },
    latitude: 50.3911,
    longitude: 3.7989,
    capacite: 50000,
    annee: 1989,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","Drum & Bass","Bass","Electro"],
    site: "https://www.dourfestival.eu",
    description: {
      fr: "Institution belge de cinq jours célèbre pour sa mythique scène électronique De Balzaal et ses marathons nocturnes techno, rave et bass music.",
      en: "Five-day Belgian institution renowned for its monumental De Balzaal electronic stage and all-night techno, rave and bass marathons.",
    },
  },
  {
    id: "voltage-festival-belgique",
    nom: "Voltage Festival",
    type: "festival",
    paysCode: "BE",
    ville: { fr: "Zwevegem (Transfo)", en: "Zwevegem (Transfo)" },
    latitude: 50.8169,
    longitude: 3.3486,
    capacite: 10000,
    annee: 2016,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Industrial","Acid Techno","Hardgroove"],
    site: "https://www.voltagefestival.com",
    description: {
      fr: "Festival techno installé dans les salles de turbines et les transformateurs de l’ancienne centrale électrique classée Transfo à Zwevegem.",
      en: "Purist techno festival staged inside the turbine halls and transformers of the heritage-listed Transfo power plant in Zwevegem.",
    },
  },
  {
    id: "sonar-lisboa-portugal",
    nom: "Sónar Lisboa",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "Lisbonne (Parque Eduardo VII)", en: "Lisbon (Parque Eduardo VII)" },
    latitude: 38.7292,
    longitude: -9.1528,
    capacite: 18000,
    annee: 2022,
    mois: { fr: "Mars - Avril", en: "March - April" },
    styles: ["Techno","House","Club","Experimental"],
    site: "https://sonarlisboa.pt",
    description: {
      fr: "Édition portugaise de Sónar au coeur du Parque Eduardo VII à Lisbonne, mêlant Sónar by Day et Sónar by Night dans le Pavilhão Carlos Lopes.",
      en: "Portuguese edition of Sónar in Lisbon’s Parque Eduardo VII, uniting Sónar by Day and Sónar by Night around Pavilhão Carlos Lopes.",
    },
  },
  {
    id: "semibreve-portugal",
    nom: "Semibreve",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "Braga", en: "Braga" },
    latitude: 41.5494,
    longitude: -8.4225,
    capacite: 3000,
    annee: 2011,
    mois: { fr: "Octobre", en: "October" },
    styles: ["Ambient","Experimental","IDM"],
    site: "https://www.festivalsemibreve.com",
    description: {
      fr: "Rendez-vous international de musique électronique exploratoire et d’art numérique dans le théâtre centenaire Theatro Circo de Braga.",
      en: "International festival for exploratory electronic music and digital art held inside Braga’s historic Theatro Circo.",
    },
  },
  {
    id: "c2c-festival-italie",
    nom: "C2C Festival (Club To Club)",
    type: "festival",
    paysCode: "IT",
    ville: { fr: "Turin (Lingotto)", en: "Turin (Lingotto)" },
    latitude: 45.0319,
    longitude: 7.6656,
    capacite: 15000,
    annee: 2002,
    mois: { fr: "Octobre - Novembre", en: "October - November" },
    styles: ["Experimental","IDM","UK Bass","Techno"],
    site: "https://clubtoclub.it",
    description: {
      fr: "Fondé en 2002 à Turin dans les anciens halls Fiat du Lingotto et les OGR, festival de référence pour l’avant-garde pop et électronique mondiale.",
      en: "Founded in 2002 in Turin across the historic Lingotto Fiat halls and OGR, Italy’s benchmark festival for avant-garde electronic music.",
    },
  },
  {
    id: "polifonic-italie",
    nom: "Polifonic",
    type: "festival",
    paysCode: "IT",
    ville: { fr: "Vallée d’Itria (Pouilles)", en: "Itria Valley (Puglia)" },
    latitude: 40.8211,
    longitude: 17.3622,
    capacite: 6000,
    annee: 2017,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Disco","Techno","Leftfield"],
    site: "https://www.polifonic.it",
    description: {
      fr: "Quatre jours entre les masserias blanches, les oliveraies et les plages des Pouilles, célébrant la house, l’italo disco et la techno.",
      en: "Four days across whitewashed masserias, olive groves and beaches in Puglia, celebrating house, Italo disco and techno.",
    },
  },
  {
    id: "nameless-festival-italie",
    nom: "Nameless Festival",
    type: "festival",
    paysCode: "IT",
    ville: { fr: "Annone di Brianza (Lac de Côme)", en: "Annone di Brianza (Lake Como)" },
    latitude: 45.8039,
    longitude: 9.3314,
    capacite: 35000,
    annee: 2013,
    mois: { fr: "Mai - Juin", en: "May - June" },
    styles: ["House","Techno","Bass","EDM"],
    site: "https://namelessfestival.it",
    description: {
      fr: "Vaste festival en plein air au pied des montagnes du lac de Côme en Lombardie, réunissant quatre scènes électroniques.",
      en: "Expansive open-air festival at the foot of the Lake Como mountains in Lombardy across four electronic stages.",
    },
  },
  {
    id: "love-international-croatie",
    nom: "Love International",
    type: "festival",
    paysCode: "HR",
    ville: { fr: "Tisno", en: "Tisno" },
    latitude: 43.8016,
    longitude: 15.6425,
    capacite: 4000,
    annee: 2016,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Disco","Balearic","Techno"],
    site: "https://loveinternationalfestival.com",
    description: {
      fr: "Héritier du Garden Festival dans la baie privée de Tisno, célèbre pour ses levers de soleil à Barbarella’s Discotheque et ses boat parties adriatiques.",
      en: "Heir to The Garden Festival in Tisno’s private bay, famous for its sunrise sessions at Barbarella’s Discotheque and Adriatic boat parties.",
    },
  },
  {
    id: "dekmantel-selectors-croatie",
    nom: "Dekmantel Selectors",
    type: "festival",
    paysCode: "HR",
    ville: { fr: "Tisno", en: "Tisno" },
    latitude: 43.8012,
    longitude: 15.6419,
    capacite: 3000,
    annee: 2016,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Electro","Techno","Disco"],
    site: "https://www.dekmantelselectors.com",
    description: {
      fr: "Édition intimiste de Dekmantel limitée à 3 000 passionnés sur la côte dalmate, consacrée à l’art du DJing et des collectionneurs de disques.",
      en: "Intimate Adriatic edition of Dekmantel capped at 3,000 attendees in Tisno, devoted to the art of DJing and deep record digging.",
    },
  },
  {
    id: "ultra-europe-croatie",
    nom: "Ultra Europe",
    type: "festival",
    paysCode: "HR",
    ville: { fr: "Split (Park Mladeži)", en: "Split (Park Mladeži)" },
    latitude: 43.5189,
    longitude: 16.4458,
    capacite: 45000,
    annee: 2013,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Techno","Trance","Progressive House"],
    site: "https://ultraeurope.com",
    description: {
      fr: "L’édition européenne d’Ultra au stade de Split suivie d’escales sur les îles dalmates de Brač, Hvar et Vis.",
      en: "Ultra’s flagship European destination festival in Split, followed by island parties across Brač, Hvar and Vis.",
    },
  },
  {
    id: "untold-roumanie",
    nom: "UNTOLD Festival",
    type: "festival",
    paysCode: "RO",
    ville: { fr: "Cluj-Napoca", en: "Cluj-Napoca" },
    latitude: 46.7681,
    longitude: 23.5722,
    capacite: 90000,
    annee: 2015,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Techno","Trance","Drum & Bass"],
    site: "https://untold.com",
    description: {
      fr: "Le plus grand festival de Roumanie au coeur de la Transylvanie à Cluj-Napoca, dont la scène Galaxy abrite quatre nuits de techno ininterrompue.",
      en: "Romania’s largest festival in the heart of Transylvania in Cluj-Napoca, whose Galaxy stage hosts four nights of non-stop techno.",
    },
  },
  {
    id: "electric-castle-roumanie",
    nom: "Electric Castle",
    type: "festival",
    paysCode: "RO",
    ville: { fr: "Bonțida (Château Bánffy)", en: "Bonțida (Bánffy Castle)" },
    latitude: 46.9094,
    longitude: 23.8092,
    capacite: 40000,
    annee: 2013,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Drum & Bass","Techno","House","Bass"],
    site: "https://electriccastle.ro",
    description: {
      fr: "Cinq jours et cinq nuits 24h/24 dans le domaine du château baroque Bánffy en Transylvanie.",
      en: "Round-the-clock five-day festival on the grounds of the baroque Bánffy Castle in Transylvania.",
    },
  },
  {
    id: "sunrise-festival-pologne",
    nom: "Sunrise Festival",
    type: "festival",
    paysCode: "PL",
    ville: { fr: "Kołobrzeg (Mer Baltique)", en: "Kołobrzeg (Baltic Sea)" },
    latitude: 54.1869,
    longitude: 15.6358,
    capacite: 35000,
    annee: 2003,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Trance","Techno","Melodic Techno"],
    site: "https://sunrisefestival.pl",
    description: {
      fr: "Grand rassemblement électronique sur l’ancien aérodrome de Podczele au bord de la mer Baltique en Pologne.",
      en: "Major electronic music gathering on the former Podczele airfield along Poland’s Baltic coast.",
    },
  },
  {
    id: "tauron-nowa-muzyka-pologne",
    nom: "Tauron Nowa Muzyka",
    type: "festival",
    paysCode: "PL",
    ville: { fr: "Katowice (Strefa Kultury)", en: "Katowice (Culture Zone)" },
    latitude: 50.2639,
    longitude: 19.0294,
    capacite: 12000,
    annee: 2006,
    mois: { fr: "Juin", en: "June" },
    styles: ["IDM","Techno","Leftfield","Ambient"],
    site: "https://festiwalnowamuzyka.pl",
    description: {
      fr: "Installé sur le site de l’ancienne mine de charbon Katowice en Silésie, mêlant musique électronique d’avant-garde, jazz futuriste et club.",
      en: "Held on the grounds of the former Katowice coal mine in Silesia, blending avant-garde electronics, future jazz and club culture.",
    },
  },
  {
    id: "street-parade-suisse",
    nom: "Street Parade",
    type: "festival",
    paysCode: "CH",
    ville: { fr: "Zurich", en: "Zurich" },
    latitude: 47.3661,
    longitude: 8.5442,
    capacite: 200000,
    annee: 1992,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","House","Trance","Melodic Techno"],
    site: "https://www.streetparade.com",
    description: {
      fr: "Fondée en 1992 par Marek Krynski autour du bassin du lac de Zurich, la plus grande technoparade au monde avec trente Love Mobiles et huit grandes scènes.",
      en: "Founded in 1992 around the Zurich lake basin, the world’s largest techno parade with thirty Love Mobiles and eight lakeside stages.",
    },
  },
  {
    id: "caprices-festival-suisse",
    nom: "Caprices Festival",
    type: "festival",
    paysCode: "CH",
    ville: { fr: "Crans-Montana", en: "Crans-Montana" },
    latitude: 46.3114,
    longitude: 7.4792,
    capacite: 12000,
    annee: 2004,
    mois: { fr: "Avril", en: "April" },
    styles: ["Minimal","House","Techno","Deep House"],
    site: "https://capricesfestival.com",
    description: {
      fr: "Célèbre dans le monde entier pour sa verrière panoramique Modernity perchée à 2 200 mètres d’altitude face aux sommets des Alpes valaisannes.",
      en: "World-famous for its glass-enclosed Modernity stage perched at 2,200 meters overlooking the Swiss Alps in Crans-Montana.",
    },
  },
  {
    id: "polaris-festival-suisse",
    nom: "Polaris Festival",
    type: "festival",
    paysCode: "CH",
    ville: { fr: "Verbier", en: "Verbier" },
    latitude: 46.0961,
    longitude: 7.2286,
    capacite: 6000,
    annee: 2015,
    mois: { fr: "Novembre - Décembre", en: "November - December" },
    styles: ["Techno","House","Detroit Techno","Electro"],
    site: "https://polarisfestival.ch",
    description: {
      fr: "Fondé par Mirko Loko à Verbier dans les Alpes suisses (et berceau du label Polaris), réunissant les légendes de Detroit, de Chicago et l’avant-garde européenne.",
      en: "Founded by Mirko Loko in Verbier in the Swiss Alps (and birthplace of the Polaris label), uniting Detroit and Chicago legends with the European vanguard.",
    },
  },
  {
    id: "electron-festival-suisse",
    nom: "Electron Festival",
    type: "festival",
    paysCode: "CH",
    ville: { fr: "Genève", en: "Geneva" },
    latitude: 46.2011,
    longitude: 6.1358,
    capacite: 12000,
    annee: 2004,
    mois: { fr: "Mai", en: "May" },
    styles: ["Techno","House","Bass","Experimental"],
    site: "https://electronfestival.ch",
    description: {
      fr: "Le grand rendez-vous printanier des cultures électroniques à Genève, investissant l’Usine, le Palladium et les clubs de la ville.",
      en: "Geneva’s flagship spring festival of electronic cultures, taking over L’Usine, Palladium and clubs across the city.",
    },
  },
  {
    id: "ozora-festival-hongrie",
    nom: "O.Z.O.R.A. Festival",
    type: "festival",
    paysCode: "HU",
    ville: { fr: "Dádpuszta", en: "Dádpuszta" },
    latitude: 46.7628,
    longitude: 18.4239,
    capacite: 35000,
    annee: 1999,
    mois: { fr: "Juillet - Août", en: "July - August" },
    styles: ["Psy","Ambient","Downtempo","Techno"],
    site: "https://ozorafestival.eu",
    description: {
      fr: "Né lors de l’éclipse solaire de 1999 dans les collines hongroises de Dádpuszta, l’un des deux plus grands rassemblements mondiaux de culture psytrance et chillout (The Dome, Pumpui).",
      en: "Born during the 1999 solar eclipse in the rolling hills of Dádpuszta, one of the world’s foremost psytrance and ambient gatherings.",
    },
  },
  {
    id: "sziget-colosseum-hongrie",
    nom: "Sziget (Colosseum & Bolt Party Arena)",
    type: "festival",
    paysCode: "HU",
    ville: { fr: "Budapest (Île d’Óbuda)", en: "Budapest (Óbuda Island)" },
    latitude: 47.5519,
    longitude: 19.0553,
    capacite: 30000,
    annee: 1993,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","House","Drum & Bass","Melodic Techno"],
    site: "https://szigetfestival.com",
    description: {
      fr: "Sur l’île d’Óbuda au milieu du Danube à Budapest, l’amphithéâtre de palettes en bois du Colosseum et la Party Arena accueillent six nuits électroniques.",
      en: "On Óbuda Island in the Danube in Budapest, the wooden-pallet Colosseum amphitheatre and Party Arena host six nights of techno and house.",
    },
  },
  {
    id: "electric-love-autriche",
    nom: "Electric Love Festival",
    type: "festival",
    paysCode: "AT",
    ville: { fr: "Salzbourg (Salzburgring)", en: "Salzburg (Salzburgring)" },
    latitude: 47.8236,
    longitude: 13.1642,
    capacite: 45000,
    annee: 2013,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Hardstyle","Drum & Bass","Techno"],
    site: "https://www.electriclove.at",
    description: {
      fr: "Installé sur le circuit automobile du Salzburgring au coeur de la région des lacs autrichiens.",
      en: "Set on the Salzburgring motorsport circuit in the heart of the Austrian Lake District near Salzburg.",
    },
  },
  {
    id: "elevate-festival-autriche",
    nom: "Elevate Festival",
    type: "festival",
    paysCode: "AT",
    ville: { fr: "Graz (Schlossberg)", en: "Graz (Schlossberg)" },
    latitude: 47.0764,
    longitude: 15.4375,
    capacite: 8000,
    annee: 2005,
    mois: { fr: "Mars", en: "March" },
    styles: ["Experimental","Techno","IDM","Ambient"],
    site: "https://elevate.at",
    description: {
      fr: "Festival de musiques électroniques d’avant-garde niché dans les tunnels souterrains Dom im Berg creusés sous la colline du Schlossberg à Graz.",
      en: "Avant-garde electronic music festival held inside the Dom im Berg subterranean tunnels carved into the Schlossberg hill in Graz.",
    },
  },
  {
    id: "exit-dance-arena-serbie",
    nom: "EXIT Festival (mts Dance Arena)",
    type: "festival",
    paysCode: "RS",
    ville: { fr: "Novi Sad (Forteresse de Petrovaradin)", en: "Novi Sad (Petrovaradin Fortress)" },
    latitude: 45.2528,
    longitude: 19.8633,
    capacite: 50000,
    annee: 2000,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","House","Melodic Techno","Tech House"],
    site: "https://www.exitfest.org",
    description: {
      fr: "Célèbre pour sa colossale mts Dance Arena nichée dans les douves de la forteresse du XVIIIe siècle de Petrovaradin surplombant le Danube, où les sets se terminent à 9 heures du matin en plein soleil.",
      en: "World-famous for its colossal mts Dance Arena set inside the trenches of the 18th-century Petrovaradin Fortress above the Danube, with closing sets running until 9 a.m.",
    },
  },
  {
    id: "lovefest-serbie",
    nom: "Lovefest",
    type: "festival",
    paysCode: "RS",
    ville: { fr: "Vrnjačka Banja", en: "Vrnjačka Banja" },
    latitude: 43.6214,
    longitude: 20.8961,
    capacite: 20000,
    annee: 2007,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","House","Minimal","Tech House"],
    site: "https://lovefest.rs",
    description: {
      fr: "Trois jours et trois nuits autour du lac de Vrnjačka Banja en Serbie, dédiés aux scènes Fire (techno), Ultra Energy (house/electro) et 99 (club intimiste).",
      en: "Three days and nights by the lake in Vrnjačka Banja, Serbia, across the Fire (techno), Ultra Energy (house/electro) and 99 stages.",
    },
  },
  {
    id: "unum-festival-albanie",
    nom: "UNUM Festival",
    type: "festival",
    paysCode: "AL",
    ville: { fr: "Shëngjin (Rana e Hedhun)", en: "Shëngjin (Rana e Hedhun)" },
    latitude: 41.8258,
    longitude: 19.5758,
    capacite: 10000,
    annee: 2019,
    mois: { fr: "Juin", en: "June" },
    styles: ["Minimal","House","Techno","Microhouse"],
    site: "https://www.unumfestival.com",
    description: {
      fr: "Six jours non-stop 24h/24 sur la plage de Rana e Hedhun en Albanie, célèbre pour sa scène Pine Stage sous les pins qui ne s’arrête jamais.",
      en: "Six days of non-stop 24-hour music on Rana e Hedhun beach in Albania, famous for its round-the-clock Pine Stage beneath the trees.",
    },
  },
  {
    id: "kala-festival-albanie",
    nom: "Kala Festival",
    type: "festival",
    paysCode: "AL",
    ville: { fr: "Dhërmi (Riviera albanaise)", en: "Dhërmi (Albanian Riviera)" },
    latitude: 40.1436,
    longitude: 19.6392,
    capacite: 3500,
    annee: 2018,
    mois: { fr: "Mai - Juin", en: "May - June" },
    styles: ["House","Disco","Balearic","Deep House"],
    site: "https://www.kala.al",
    description: {
      fr: "Une semaine dans les criques turquoises de Dhërmi sur la Riviera albanaise, dédiée à la house, au disco, au boogie et aux longs sets en bord de mer.",
      en: "Week-long boutique gathering on the turquoise coves of Dhërmi on the Albanian Riviera, dedicated to house, disco, boogie and seaside extended sets.",
    },
  },
  {
    id: "mutek-jp-japon",
    nom: "MUTEK.JP",
    type: "festival",
    paysCode: "JP",
    villeSlug: "tokyo-jp",
    ville: { fr: "Tokyo (Shibuya)", en: "Tokyo (Shibuya)" },
    latitude: 35.6585,
    longitude: 139.7013,
    capacite: 3500,
    annee: 2016,
    mois: { fr: "Novembre - Décembre", en: "November - December" },
    styles: ["Ambient","IDM","Experimental","Techno"],
    site: "https://mutek.jp",
    description: {
      fr: "Antenne japonaise du festival montréalais MUTEK à Shibuya, réunissant créateurs audiovisuels nippons et internationaux.",
      en: "Japanese edition of Montreal’s MUTEK festival in Shibuya, uniting Japanese and international audiovisual and electronic pioneers.",
    },
  },
  {
    id: "ultra-japan-japon",
    nom: "Ultra Japan",
    type: "festival",
    paysCode: "JP",
    villeSlug: "tokyo-jp",
    ville: { fr: "Tokyo (Odaiba)", en: "Tokyo (Odaiba)" },
    latitude: 35.6258,
    longitude: 139.7764,
    capacite: 35000,
    annee: 2014,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Techno","House","Progressive House","Bass"],
    site: "https://ultrajapan.com",
    description: {
      fr: "Grand rassemblement électronique en plein air dans la baie de Tokyo à Odaiba, doté d’une scène RESISTANCE consacrée à la techno et à la house.",
      en: "Major open-air electronic festival on Tokyo Bay in Odaiba, featuring a dedicated RESISTANCE stage for techno and house.",
    },
  },
  {
    id: "beyond-the-valley-australie",
    nom: "Beyond The Valley",
    type: "festival",
    paysCode: "AU",
    ville: { fr: "Barunah Plains (Victoria)", en: "Barunah Plains (Victoria)" },
    latitude: -38.0611,
    longitude: 143.9244,
    capacite: 35000,
    annee: 2014,
    mois: { fr: "Décembre - Janvier (Nouvel An)", en: "December - January (New Year)" },
    styles: ["House","Techno","Eurodance","UK Garage"],
    site: "https://www.beyondthevalley.com.au",
    description: {
      fr: "Grand festival du Nouvel An dans l’État de Victoria avec son amphithéâtre Dance Dome de 100 mètres de large dédié à la techno et à la house.",
      en: "Flagship Victorian New Year’s festival featuring the 100-meter-wide open-air Dance Dome dedicated to techno and house.",
    },
  },
  {
    id: "strawberry-fields-australie",
    nom: "Strawberry Fields",
    type: "festival",
    paysCode: "AU",
    ville: { fr: "Tocumwal (Murray River)", en: "Tocumwal (Murray River)" },
    latitude: -35.8114,
    longitude: 145.5628,
    capacite: 10000,
    annee: 2009,
    mois: { fr: "Novembre", en: "November" },
    styles: ["House","Disco","Techno","Downtempo"],
    site: "https://www.strawberry-fields.com.au",
    description: {
      fr: "Trois jours dans le bush australien au bord de la rivière Murray, célébrant la house, le disco, la techno et le live électronique.",
      en: "Three days in the Australian bush along the Murray River celebrating house, disco, techno and live electronic music.",
    },
  },
  {
    id: "time-warp-brasil",
    nom: "Time Warp Brasil",
    type: "festival",
    paysCode: "BR",
    villeSlug: "saopaulo-br",
    ville: { fr: "São Paulo (Autódromo de Interlagos)", en: "Sao Paulo (Interlagos)" },
    latitude: -23.7011,
    longitude: -46.6972,
    capacite: 20000,
    annee: 2018,
    mois: { fr: "Mai", en: "May" },
    styles: ["Techno","House","Melodic Techno","Hard Techno"],
    site: "https://time-warp.com.br",
    description: {
      fr: "L’édition sud-américaine officielle de Time Warp à São Paulo, transposant les célèbres architectures lumineuses Cave 2.0 devant le public brésilien.",
      en: "Official South American edition of Time Warp in São Paulo, bringing its signature Cave 2.0 lighting architecture to Brazil.",
    },
  },
  {
    id: "tomorrowland-brasil",
    nom: "Tomorrowland Brasil",
    type: "festival",
    paysCode: "BR",
    ville: { fr: "Itu (État de São Paulo)", en: "Itu (São Paulo State)" },
    latitude: -23.3389,
    longitude: -47.2558,
    capacite: 60000,
    annee: 2015,
    mois: { fr: "Octobre", en: "October" },
    styles: ["House","Techno","Trance","Progressive House"],
    site: "https://brasil.tomorrowland.com",
    description: {
      fr: "Grand rassemblement au Parque Maeda d’Itu dans l’État de São Paulo, réunissant six scènes dont Core et Freedom.",
      en: "Massive gathering at Parque Maeda in Itu, São Paulo state, uniting six stages including Core and Freedom.",
    },
  },
  {
    id: "universo-paralello-bresil",
    nom: "Universo Paralello",
    type: "festival",
    paysCode: "BR",
    ville: { fr: "Pratigi (Bahia)", en: "Pratigi (Bahia)" },
    latitude: -13.7258,
    longitude: -38.9936,
    capacite: 25000,
    annee: 2000,
    mois: { fr: "Décembre - Janvier (biennal)", en: "December - January (biennial)" },
    styles: ["Psy","Techno","House","Downtempo"],
    site: "https://universoparalello.org",
    description: {
      fr: "Fondé par Juarez Petrillo (le père de Vintage Culture et Swarup) sur la plage de cocotiers de Pratigi à Bahia pour huit jours autour du Nouvel An.",
      en: "Founded by Juarez Petrillo on the palm-fringed beach of Pratigi in Bahia, running eight days over New Year’s across psytrance, techno and house stages.",
    },
  },
  {
    id: "suti-festival-portugal",
    nom: "Suti Festival",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "Benquerença (Penamacor)", en: "Benquerenca (Penamacor)" },
    latitude: 40.2286,
    longitude: -7.2044,
    capacite: 2500,
    annee: 2020,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Psytech","Darkprog","Psy","Indie Dance","Downtempo"],
    site: "https://sutifestival.com",
    description: {
      fr: "Rassemblement intimiste de cinq jours à la Praia Fluvial O Moinho de Benquerença (Penamacor), pointu sur la psytech, la darkprog, la psytrance, l’indie dance et le downtempo autour de la Semo Stage et du Groove Garden.",
      en: "Intimate five-day gathering at Praia Fluvial O Moinho in Benquerença (Penamacor), dedicated to psytech, darkprog, psytrance, indie dance and downtempo across the Semo Stage and Groove Garden.",
    },
  },
  {
    id: "zna-gathering-portugal",
    nom: "ZNA Gathering",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "Montargil (Alentejo)", en: "Montargil (Alentejo)" },
    latitude: 39.0833,
    longitude: -8.1667,
    capacite: 6000,
    annee: 2013,
    mois: { fr: "Juillet - Août (biennal)", en: "July - August (biennial)" },
    styles: ["Goa Trance","Psy","Ambient","Downtempo"],
    site: "https://znagathering.com",
    description: {
      fr: "Rendez-vous biennal au bord du lac de Montargil consacré à l’âge d’or de la goa trance rétro-futuriste, à la psytrance analogique des années 1990 et au chill-out hypnotique.",
      en: "Biennial lakeside gathering in Montargil dedicated to the golden era of retro-futuristic Goa trance, 1990s analog psytrance and hypnotic chill-out.",
    },
  },
  {
    id: "forte-festival-portugal",
    nom: "Festival Forte",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "Montemor-o-Velho (Château)", en: "Montemor-o-Velho Castle" },
    latitude: 40.1756,
    longitude: -8.6833,
    capacite: 5000,
    annee: 2014,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Industrial Techno","Experimental","EBM"],
    site: "https://www.fortefestival.com",
    description: {
      fr: "Enceinte médiévale du château de Montemor-o-Velho transformée en laboratoire audiovisuel radical pour la techno industrielle, l’EBM et les performances génératives.",
      en: "Medieval walls of Montemor-o-Velho Castle transformed into a radical audiovisual laboratory for industrial techno, EBM and generative art.",
    },
  },
  {
    id: "insomnia-festival-portugal",
    nom: "Insomnia Electronic Music & Arts Festival",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "São Gião (Serra da Estrela)", en: "Sao Giao (Serra da Estrela)" },
    latitude: 40.3361,
    longitude: -7.8014,
    capacite: 3500,
    annee: 2014,
    mois: { fr: "Août", en: "August" },
    styles: ["Psy","Psytech","Progressive Trance","Techno"],
    site: "https://insomnia-festival.com",
    description: {
      fr: "Festival en forêt de pins au pied de la Serra da Estrela, réunissant psytrance, psytech et techno progressive autour d’une rivière naturelle.",
      en: "Pine-forest festival at the foot of the Serra da Estrela mountains, uniting psytrance, psytech and progressive techno along a mountain stream.",
    },
  },
  {
    id: "brunch-electronik-lisboa",
    nom: "Brunch Electronik Lisboa",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "Lisbonne (Tapada da Ajuda)", en: "Lisbon (Tapada da Ajuda)" },
    latitude: 38.7122,
    longitude: -9.1844,
    capacite: 8000,
    annee: 2016,
    mois: { fr: "Juillet - Septembre", en: "July - September" },
    styles: ["House","Techno","Melodic Techno"],
    site: "https://lisboa.brunchelectronik.com",
    description: {
      fr: "Grands après-midis électroniques en plein air dans le parc botanique de la Tapada da Ajuda surplombant le Tage et le pont du 25-Avril.",
      en: "Open-air daytime electronic series in the botanical park of Tapada da Ajuda overlooking the Tagus River and 25 de Abril Bridge.",
    },
  },
  {
    id: "lisb-on-jardim-sonoro",
    nom: "Lisb-ON Jardim Sonoro",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "Lisbonne (Parque Eduardo VII)", en: "Lisbon (Eduardo VII Park)" },
    latitude: 38.7281,
    longitude: -9.1519,
    capacite: 10000,
    annee: 2014,
    mois: { fr: "Septembre", en: "September" },
    styles: ["House","Disco","Techno","Deep House"],
    site: "https://lisb-on.pt",
    description: {
      fr: "Trois jours de house, disco et techno sous les arbres centenaires du jardin Jardim Amália Rodrigues et du Parque Eduardo VII au cœur de Lisbonne.",
      en: "Three days of house, disco and techno beneath the century-old trees of Eduardo VII Park in central Lisbon.",
    },
  },
  {
    id: "rfm-somnii-portugal",
    nom: "RFM SOMNII Intermarché",
    type: "festival",
    paysCode: "PT",
    ville: { fr: "Figueira da Foz (Praia do Relógio)", en: "Figueira da Foz (Praia do Relogio)" },
    latitude: 40.1508,
    longitude: -8.8667,
    capacite: 35000,
    annee: 2013,
    mois: { fr: "Juillet", en: "July" },
    styles: ["EDM","House","Hardstyle","Big Room"],
    site: "https://rfmsomnii.com",
    description: {
      fr: "Le plus grand festival électronique de plage du Portugal sur le sable immense de la Praia do Relógio à Figueira da Foz.",
      en: "Portugal’s largest beach electronic festival on the vast sands of Praia do Relógio in Figueira da Foz.",
    },
  },
  {
    id: "dream-nation-paris",
    nom: "Dream Nation Festival",
    type: "festival",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Paris Nord (Villepinte)", en: "Paris Nord (Villepinte)" },
    latitude: 48.9708,
    longitude: 2.5186,
    capacite: 40000,
    annee: 2014,
    mois: { fr: "Septembre - Octobre", en: "September - October" },
    styles: ["Techno","Hard Techno","Psy","Drum & Bass","Hardcore"],
    site: "https://www.dreamnation.fr",
    description: {
      fr: "Grand rassemblement nocturne aux portes de Paris fédérant toutes les chapelles à haut BPM : techno, hard techno, trance psychédélique, bass music et hardcore.",
      en: "Major nocturnal festival at the gates of Paris uniting high-BPM electronic subcultures from techno and hard techno to psytrance, bass music and hardcore.",
    },
  },
  {
    id: "chateau-perche-france",
    nom: "Château Perché Festival",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Auvergne / Bourgogne (Château itinérant)", en: "Auvergne / Burgundy (Nomadic Castle)" },
    latitude: 46.5122,
    longitude: 3.1244,
    capacite: 8000,
    annee: 2015,
    mois: { fr: "Juillet - Août", en: "July - August" },
    styles: ["Indie Dance","Dark Disco","Techno","House","Downtempo"],
    site: "https://chateauperche.com",
    description: {
      fr: "Laboratoire costumé et décalé investissant chaque été un château historique français avec dix scènes d’indie dance, dark disco, techno, house et ambient.",
      en: "Costumed arts and electronic music gathering taking over a historic French castle each summer with ten stages of indie dance, dark disco, techno and ambient.",
    },
  },
  {
    id: "madame-loyal-france",
    nom: "Madame Loyal",
    type: "festival",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Paris (Cirque Micheletty) & Bordeaux", en: "Paris (Cirque Micheletty) & Bordeaux" },
    latitude: 48.9389,
    longitude: 2.3125,
    capacite: 15000,
    annee: 2021,
    mois: { fr: "Mai - Octobre", en: "May - October" },
    styles: ["House","French Touch","Indie Dance","Techno"],
    site: "https://madameloyal.com",
    description: {
      fr: "Fête foraine électronique sous chapiteaux de cirque mêlant manèges, acrobates, figures de la French Touch, house, indie dance et techno.",
      en: "Electronic funfair under circus big tops blending carnival rides, acrobats, French Touch icons, house, indie dance and techno.",
    },
  },
  {
    id: "delta-festival-marseille",
    nom: "Delta Festival",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Marseille (Plages du Prado)", en: "Marseille (Prado Beaches)" },
    latitude: 43.2575,
    longitude: 5.3742,
    capacite: 50000,
    annee: 2015,
    mois: { fr: "Août - Septembre", en: "August - September" },
    styles: ["Techno","House","Hard Techno","Trance"],
    site: "https://www.delta-festival.com",
    description: {
      fr: "Cinq jours les pieds dans l’eau sur les plages du Prado à Marseille avec plusieurs scènes dédiées à la techno, la hard techno et la house.",
      en: "Five-day waterfront festival on the Prado beaches in Marseille featuring multiple stages dedicated to techno, hard techno and house.",
    },
  },
  {
    id: "electrobeach-barcares",
    nom: "Electrobeach Music Festival (EMF)",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Le Barcarès (Pyrénées-Orientales)", en: "Le Barcares (Southern France)" },
    latitude: 42.8189,
    longitude: 3.0406,
    capacite: 45000,
    annee: 2009,
    mois: { fr: "Juillet", en: "July" },
    styles: ["EDM","Techno","Hardstyle","House"],
    site: "https://www.electrobeach.com",
    description: {
      fr: "Grand festival méditerranéen au pied du paquebot Lydia à Port-Barcarès, réunissant mainstage internationale, scène techno et scène hardstyle.",
      en: "Mediterranean beach festival beside the Lydia ocean liner in Port-Barcarès, uniting an international mainstage with dedicated techno and hardstyle arenas.",
    },
  },
  {
    id: "elektric-park-chatou",
    nom: "Elektric Park Festival",
    type: "festival",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Chatou (Île des Impressionnistes)", en: "Chatou (Impressionists Island, Paris)" },
    latitude: 48.8872,
    longitude: 2.1614,
    capacite: 15000,
    annee: 2010,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Electro","Techno","Bass","Hardcore","Psy"],
    site: "https://www.elektricpark.com",
    description: {
      fr: "Fondé par Joachim Garraud sur l’Île des Impressionnistes à Chatou (anciennement Inox Park), croisant techno, bass music, psytrance et hardcore au bord de la Seine.",
      en: "Founded by Joachim Garraud on the Île des Impressionnistes in Chatou (formerly Inox Park), spanning techno, bass music, psytrance and hardcore along the Seine.",
    },
  },
  {
    id: "paco-tyson-nantes",
    nom: "Paco Tyson",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Nantes", en: "Nantes" },
    latitude: 47.2044,
    longitude: -1.6089,
    capacite: 12000,
    annee: 2017,
    mois: { fr: "Avril", en: "April" },
    styles: ["Techno","Acid","House","Drum & Bass","Hardcore"],
    site: "https://pacotyson.fr",
    description: {
      fr: "Rendez-vous printanier des musiques électroniques à Nantes sous grands chapiteaux, réputé pour ses programmations techno, acid, house et rave sans concession.",
      en: "Spring electronic festival under big tops in Nantes, renowned for its uncompromising techno, acid, house and rave lineups.",
    },
  },
  {
    id: "panoramas-morlaix",
    nom: "Festival Panoramas",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Morlaix (Bretagne)", en: "Morlaix (Brittany)" },
    latitude: 48.5778,
    longitude: -3.8281,
    capacite: 14000,
    annee: 1998,
    mois: { fr: "Avril", en: "April" },
    styles: ["Techno","Hard Techno","Electro","Trance"],
    site: "https://www.panoramasfestival.com",
    description: {
      fr: "Institution bretonne au parc des expositions de Langolvas à Morlaix, ouvrant chaque printemps la saison des festivals électroniques dans le Grand Ouest.",
      en: "Brittany institution in Morlaix kicking off the western French electronic festival season every spring since 1998.",
    },
  },
  {
    id: "ethereal-decibel-france",
    nom: "Ethereal Decibel Festival",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Saint-Symphorien-des-Monts (Normandie)", en: "Saint-Symphorien-des-Monts (Normandy)" },
    latitude: 48.5439,
    longitude: -1.0011,
    capacite: 8000,
    annee: 2015,
    mois: { fr: "Août", en: "August" },
    styles: ["Psy","Psytech","Darkprog","Techno","Downtempo"],
    site: "https://etherealdecibel.com",
    description: {
      fr: "Principal rassemblement psychédélique et psytech en France dans le parc d’un domaine normand au bord d’un lac, alliant scénographies monumentales et arts numériques.",
      en: "France’s leading psychedelic and psytech gathering on a lakeside estate in Normandy, combining monumental stage design with digital arts.",
    },
  },
  {
    id: "insane-festival-apt",
    nom: "Insane Festival",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Apt (Luberon)", en: "Apt (Luberon)" },
    latitude: 43.8825,
    longitude: 5.3789,
    capacite: 35000,
    annee: 2015,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Hard Techno","Psy","Hardcore"],
    site: "https://insanefestival.com",
    description: {
      fr: "Trois jours au bord du plan d’eau de la Riaille à Apt dans le Luberon, devenus l’un des bastions de la techno, de la hard techno et de la psytrance dans le Sud.",
      en: "Three-day lakeside festival in Apt in the Luberon, a major stronghold for techno, hard techno and psytrance in southern France.",
    },
  },
  {
    id: "kolorz-festival-carpentras",
    nom: "Kolorz Festival",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Carpentras (Provence)", en: "Carpentras (Provence)" },
    latitude: 44.0553,
    longitude: 5.0481,
    capacite: 10000,
    annee: 2010,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","House","Melodic Techno"],
    site: "https://kolorzfestival.com",
    description: {
      fr: "Festival provençal à Carpentras célébrant la techno et la house dans des cadres patrimoniaux et en plein air.",
      en: "Provençal electronic festival in Carpentras celebrating techno and house in open-air heritage venues.",
    },
  },
  {
    id: "scopitone-nantes",
    nom: "Scopitone",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Nantes (Île de Nantes)", en: "Nantes (Ile de Nantes)" },
    latitude: 47.2061,
    longitude: -1.5642,
    capacite: 20000,
    annee: 2002,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Electro","Techno","Experimental","IDM"],
    site: "https://scopitone.org",
    description: {
      fr: "Biennale des cultures électroniques et des arts numériques pilotée par Stereolux sur l’Île de Nantes, mêlant nuits techno et installations immersives.",
      en: "Electronic cultures and digital arts festival curated by Stereolux on the Île de Nantes, combining club nights with immersive installations.",
    },
  },
  {
    id: "calvi-on-the-rocks",
    nom: "Calvi on the Rocks",
    type: "festival",
    paysCode: "FR",
    ville: { fr: "Calvi (Corse)", en: "Calvi (Corsica)" },
    latitude: 42.5661,
    longitude: 8.7578,
    capacite: 8000,
    annee: 2003,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Indie Dance","House","Disco","French Touch"],
    site: "https://www.calviontherocks.com",
    description: {
      fr: "Cinq jours entre plages de Balagne et citadelle génoise de Calvi, berceau estival de l’indie dance, du disco et de la French Touch.",
      en: "Five days between the beaches of Balagne and the Genoese citadel of Calvi, a summer stronghold for indie dance, disco and French Touch.",
    },
  },
  {
    id: "macki-music-festival",
    nom: "Macki Music Festival",
    type: "festival",
    paysCode: "FR",
    villeSlug: "paris-fr",
    ville: { fr: "Carrières-sur-Seine (Grand Paris)", en: "Carrieres-sur-Seine (Greater Paris)" },
    latitude: 48.9056,
    longitude: 2.1789,
    capacite: 5000,
    annee: 2014,
    mois: { fr: "Juin - Juillet", en: "June - July" },
    styles: ["House","Leftfield","Disco","UK Bass"],
    site: "https://mackimusicfestival.fr",
    description: {
      fr: "Fondé par les collectifs La Mamie’s et Cracki Records au bord de la Seine, rendez-vous solaire de la house, des musiques diggers et du leftfield.",
      en: "Founded by La Mamie’s and Cracki Records on the banks of the Seine, a sun-drenched gathering for house, crate-digging disco and leftfield club sounds.",
    },
  },
  {
    id: "igloofest-quebec",
    nom: "Igloofest Québec",
    type: "festival",
    paysCode: "CA",
    villeSlug: "quebec-ca",
    ville: { fr: "Québec (Place Jean-Béliveau)", en: "Quebec City (Place Jean-Beliveau)" },
    latitude: 46.8261,
    longitude: -71.2464,
    capacite: 8000,
    annee: 2023,
    mois: { fr: "Mars", en: "March" },
    styles: ["House","Techno","Tech House"],
    site: "https://quebec.igloofest.ca",
    description: {
      fr: "Déclinaison hivernale d’Igloofest dans la capitale québécoise sur la Place Jean-Béliveau, avec combinaisons de neige et têtes d’affiche house et techno.",
      en: "Winter edition of Igloofest in Quebec City on Place Jean-Béliveau, bringing snowsuits and international house and techno headliners to the capital.",
    },
  },
  {
    id: "igloofest-gatineau",
    nom: "Igloofest Gatineau",
    type: "festival",
    paysCode: "CA",
    villeSlug: "ottawa-ca",
    ville: { fr: "Gatineau / Ottawa (Place Zibi)", en: "Gatineau / Ottawa (Place Zibi)" },
    latitude: 45.4242,
    longitude: -75.7169,
    capacite: 6000,
    annee: 2024,
    mois: { fr: "Février", en: "February" },
    styles: ["House","Techno","Progressive House"],
    site: "https://gatineau.igloofest.ca",
    description: {
      fr: "Trois soirs de danse sous zéro au bord de la rivière des Outaouais à la Place des Festivals Zibi entre Gatineau et Ottawa.",
      en: "Three sub-zero nights of open-air dancing along the Ottawa River at Place des Festivals Zibi between Gatineau and Ottawa.",
    },
  },
  {
    id: "riverside-festival-gatineau",
    nom: "Riverside Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "ottawa-ca",
    ville: { fr: "Gatineau / Ottawa (Musée canadien de l’histoire)", en: "Gatineau / Ottawa (Canadian Museum of History)" },
    latitude: 45.4294,
    longitude: -75.7089,
    capacite: 10000,
    annee: 2013,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Techno","House","Bass","Drum & Bass"],
    site: "https://www.riversidefestival.ca",
    description: {
      fr: "Trois jours sur l’esplanade du Musée canadien de l’histoire face à la colline du Parlement, réunissant techno, house et bass music.",
      en: "Three-day festival on the plaza of the Canadian Museum of History facing Parliament Hill, uniting techno, house and bass music.",
    },
  },
  {
    id: "future-forest-canada",
    nom: "Future Forest",
    type: "festival",
    paysCode: "CA",
    ville: { fr: "Sheffield / Fredericton (Nouveau-Brunswick)", en: "Sheffield / Fredericton (New Brunswick)" },
    latitude: 46.0681,
    longitude: -66.4528,
    capacite: 5000,
    annee: 2012,
    mois: { fr: "Août", en: "August" },
    styles: ["Bass", "Techno", "House", "Psytech", "Drum & Bass"],
    site: "https://futureforest.ca",
    description: {
      fr: "Grand festival électronique en forêt au Nouveau-Brunswick (Futureforest), célèbre dans tout l’Est du Canada pour ses trois scènes immersives, sa sonorisation PK Sound et sa programmation bass, techno, house et psytech.",
      en: "Major forest electronic festival in New Brunswick (Futureforest), renowned across Eastern Canada for its three immersive stages, PK Sound rigs and bass, techno, house and psytech programming.",
    },
  },
  {
    id: "wicked-woods-bc",
    nom: "Wicked Woods Music Festival",
    type: "festival",
    paysCode: "CA",
    ville: { fr: "Fairmont Hot Springs (Colombie-Britannique)", en: "Fairmont Hot Springs (British Columbia)" },
    latitude: 50.3289,
    longitude: -115.8542,
    capacite: 4500,
    annee: 2017,
    mois: { fr: "Août - Septembre", en: "August - September" },
    styles: ["Bass","House","Drum & Bass","Funk"],
    site: "https://www.wickedwoods.ca",
    description: {
      fr: "Rassemblement dans la vallée du fleuve Columbia au pied des Rocheuses canadiennes, porté par la culture sound system de l’Ouest canadien.",
      en: "Gathering in the Columbia Valley at the foot of the Canadian Rockies, powered by Western Canadian sound-system culture.",
    },
  },
  {
    id: "electric-love-bc",
    nom: "Electric Love Music Festival",
    type: "festival",
    paysCode: "CA",
    ville: { fr: "Pritchard / Kamloops (Colombie-Britannique)", en: "Pritchard / Kamloops (British Columbia)" },
    latitude: 50.6819,
    longitude: -119.8322,
    capacite: 3500,
    annee: 2015,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Bass","Drum & Bass","Psy","Techno"],
    site: "https://electriclove.dance",
    description: {
      fr: "Quatre jours sur les terres des Premières Nations Secwépemc en Colombie-Britannique autour de cinq scènes house, bass, drum & bass et psytrance.",
      en: "Four days in Secwépemc territory in British Columbia featuring five stages spanning house, bass, drum & bass and psytrance.",
    },
  },
  {
    id: "bomfest-edmonton",
    nom: "BOMFEST",
    type: "festival",
    paysCode: "CA",
    ville: { fr: "Edmonton (Alberta)", en: "Edmonton (Alberta)" },
    latitude: 53.5444,
    longitude: -113.4908,
    capacite: 15000,
    annee: 2017,
    mois: { fr: "Juin", en: "June" },
    styles: ["House","Techno","Bass","Progressive House"],
    site: "https://www.bomfest.ca",
    description: {
      fr: "Grand rendez-vous électronique d’été organisé par Boodang à Edmonton, réunissant les têtes d’affiche house, techno et bass dans les Prairies.",
      en: "Major summer electronic festival organized by Boodang in Edmonton, bringing international house, techno and bass headliners to Alberta.",
    },
  },
  {
    id: "promise-cherry-beach-toronto",
    nom: "Promise Cherry Beach",
    type: "festival",
    paysCode: "CA",
    villeSlug: "toronto-ca",
    ville: { fr: "Toronto (Cherry Beach)", en: "Toronto (Cherry Beach)" },
    latitude: 43.6369,
    longitude: -79.3436,
    capacite: 2500,
    annee: 2001,
    mois: { fr: "Juin - Septembre", en: "June - September" },
    styles: ["House","Techno","Disco","Deep House"],
    site: "https://www.promisecherrybeach.ca",
    description: {
      fr: "Institution dominicale en plein air sur la plage de Cherry Beach au bord du lac Ontario depuis 2001, pilier communautaire de la scène house et techno torontoise.",
      en: "Sunday open-air institution on Cherry Beach along Lake Ontario since 2001, a beloved pillar of Toronto’s house and techno community.",
    },
  },
  {
    id: "whole-festival-ferropolis",
    nom: "Whole - United Queer Festival",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Gräfenhainichen (Ferropolis)", en: "Grafenhainichen (Ferropolis)" },
    latitude: 51.7562,
    longitude: 12.4492,
    capacite: 8000,
    annee: 2017,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","House","Trance","Acid","Electro"],
    site: "https://wholefestival.com",
    description: {
      fr: "Trois jours non-stop sur la presqu’île industrielle de Ferropolis (« la ville de fer ») fédérant les collectifs queer de Berlin, d’Europe et d’Amérique.",
      en: "Three non-stop days on the industrial peninsula of Ferropolis (‘City of Iron’), uniting queer electronic collectives from Berlin, Europe and the Americas.",
    },
  },
  {
    id: "indian-spirit-germany",
    nom: "Indian Spirit Festival",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Eldena (Mecklembourg)", en: "Eldena (Mecklenburg)" },
    latitude: 53.2681,
    longitude: 11.4522,
    capacite: 20000,
    annee: 1999,
    mois: { fr: "Août - Septembre", en: "August - September" },
    styles: ["Psy","Progressive Trance","Goa Trance"],
    site: "https://www.indian-spirit.de",
    description: {
      fr: "Le plus grand rassemblement psytrance de fin d’été en Allemagne du Nord, clôturant la saison européenne des open airs psychédéliques depuis 1999.",
      en: "Northern Germany’s largest late-summer psytrance festival, closing the European open-air psychedelic season since 1999.",
    },
  },
  {
    id: "antaris-project-germany",
    nom: "Antaris Project",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Stölln (Brandebourg)", en: "Stolln (Brandenburg)" },
    latitude: 52.7394,
    longitude: 12.3911,
    capacite: 8000,
    annee: 1995,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Psy","Goa Trance","Psytech","Ambient"],
    site: "https://www.antaris-project.de",
    description: {
      fr: "Doyen historique de la culture goa et psytrance en Allemagne sur l’aérodrome d’Otto-Lilienthal à Stölln dans le Brandebourg.",
      en: "Historic cornerstone of Goa and psytrance culture in Germany on the Otto Lilienthal airfield in Stölln, Brandenburg.",
    },
  },
  {
    id: "voov-experience-germany",
    nom: "VooV Experience",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Putlitz (Brandebourg)", en: "Putlitz (Brandenburg)" },
    latitude: 53.2514,
    longitude: 12.0439,
    capacite: 12000,
    annee: 1991,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Psy","Progressive Trance","Goa Trance"],
    site: "https://www.voov-festival.de",
    description: {
      fr: "Né en 1991 à Putlitz, l’un des tout premiers festivals psytrance et goa d’Europe, toujours fidèle à ses racines psychédéliques.",
      en: "Born in 1991 in Putlitz, one of Europe’s very first psytrance and Goa festivals, still true to its psychedelic roots.",
    },
  },
  {
    id: "airbeat-one-germany",
    nom: "Airbeat One Festival",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Neustadt-Glewe (Mecklembourg)", en: "Neustadt-Glewe (Mecklenburg)" },
    latitude: 53.3611,
    longitude: 11.6119,
    capacite: 65000,
    annee: 2002,
    mois: { fr: "Juillet", en: "July" },
    styles: ["EDM","Hardstyle","Techno","Psy"],
    site: "https://airbeat-one.de",
    description: {
      fr: "Immense festival sur l’aérodrome de Neustadt-Glewe entre Hambourg et Berlin, avec des scènes monumentales dédiées au hardstyle, à la techno et à la psytrance.",
      en: "Massive airfield festival in Neustadt-Glewe between Hamburg and Berlin with monumental stages dedicated to hardstyle, techno and psytrance.",
    },
  },
  {
    id: "echelon-festival-bavaria",
    nom: "Echelon Festival",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Bad Aibling (Bavière)", en: "Bad Aibling (Bavaria)" },
    latitude: 47.8781,
    longitude: 11.9844,
    capacite: 25000,
    annee: 2009,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Hard Techno","House","Melodic Techno"],
    site: "https://www.echelon-festival.de",
    description: {
      fr: "Organisé au pied des radômes géants de l’ancienne station d’écoute américaine de Bad Aibling face aux Alpes bavaroises.",
      en: "Set beneath the giant radome spheres of the former US listening station in Bad Aibling facing the Bavarian Alps.",
    },
  },
  {
    id: "sea-you-freiburg",
    nom: "Sea You Festival (Beach Republic)",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Fribourg-en-Brisgau (Tunisee)", en: "Freiburg im Breisgau (Tunisee)" },
    latitude: 48.0631,
    longitude: 7.8136,
    capacite: 30000,
    annee: 2014,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","House","Hard Techno","Psy"],
    site: "https://www.seayou-festival.de",
    description: {
      fr: "Sept scènes autour et sur le lac Tunisee près de Fribourg, où l’on écoute la techno les pieds dans l’eau ou sur un téléski nautique.",
      en: "Seven stages around Lake Tunisee near Freiburg, where dancers experience techno in the water and beside wakeboard cables.",
    },
  },
  {
    id: "ikarus-festival-memmingen",
    nom: "Ikarus Festival",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Memmingen (Allgäu)", en: "Memmingen (Allgau)" },
    latitude: 47.9889,
    longitude: 10.2394,
    capacite: 35000,
    annee: 2015,
    mois: { fr: "Mai - Juin", en: "May - June" },
    styles: ["Techno","Melodic Techno","Hard Techno","Psy"],
    site: "https://www.ikarus-festival.de",
    description: {
      fr: "Ancienne base aérienne militaire de Memmingen transformée en forêt féerique, hangars bruts et scènes techno et psytrance.",
      en: "Former military airbase in Memmingen transformed into enchanted forest stages and raw hangars for techno and psytrance.",
    },
  },
  {
    id: "nachtiville-germany",
    nom: "Nachtiville (par Nachtdigital)",
    type: "festival",
    paysCode: "DE",
    ville: { fr: "Weissenhäuser Strand (Mer Baltique)", en: "Weissenhauser Strand (Baltic Sea)" },
    latitude: 54.3119,
    longitude: 10.7856,
    capacite: 3500,
    annee: 1998,
    mois: { fr: "Janvier", en: "January" },
    styles: ["Techno","House","Leftfield","Electro"],
    site: "https://nachtiville.de",
    description: {
      fr: "Héritier du mythique Nachtdigital d’Olganitz, investissant en plein hiver un complexe aquatique subtropical sur la côte de la mer Baltique.",
      en: "Heir to the legendary Nachtdigital in Olganitz, taking over a subtropical water-park resort on the Baltic coast in mid-winter.",
    },
  },
  {
    id: "verknipt-festival-netherlands",
    nom: "Verknipt Festival",
    type: "festival",
    paysCode: "NL",
    villeSlug: "amsterdam-nl",
    ville: { fr: "Amsterdam (ArenA) & Utrecht (Strijkviertel)", en: "Amsterdam (ArenA) & Utrecht" },
    latitude: 52.3144,
    longitude: 4.9419,
    capacite: 40000,
    annee: 2012,
    mois: { fr: "Juin - Juillet", en: "June - July" },
    styles: ["Hard Techno","Industrial Techno","Schranz","Acid Techno"],
    site: "https://verknipt.org",
    description: {
      fr: "Épicentre mondial de la nouvelle vague hard techno, industrial et schranz, remplissant aussi bien le lac de Strijkviertel que les 40 000 places de la Johan Cruijff ArenA.",
      en: "Global epicenter of the new hard techno, industrial and schranz wave, filling both Lake Strijkviertel and the 40,000-capacity Johan Cruijff ArenA.",
    },
  },
  {
    id: "liquicity-festival-netherlands",
    nom: "Liquicity Festival",
    type: "festival",
    paysCode: "NL",
    ville: { fr: "Alkmaar (Geestmerambacht)", en: "Alkmaar (Geestmerambacht)" },
    latitude: 52.6908,
    longitude: 4.7831,
    capacite: 18000,
    annee: 2015,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Drum & Bass","Liquid DnB","Jungle"],
    site: "https://festival.liquicity.com",
    description: {
      fr: "Trois jours dans le parc naturel de Geestmerambacht au nord d’Amsterdam, référence mondiale de la liquid drum & bass et de la drum & bass mélodique.",
      en: "Three days in the Geestmerambacht nature reserve north of Amsterdam, the world’s premier gathering for liquid and melodic drum & bass.",
    },
  },
  {
    id: "wildeburg-netherlands",
    nom: "Wildeburg",
    type: "festival",
    paysCode: "NL",
    ville: { fr: "Kraggenburg (Noordoostpolder)", en: "Kraggenburg (Noordoostpolder)" },
    latitude: 52.6681,
    longitude: 5.9158,
    capacite: 12000,
    annee: 2016,
    mois: { fr: "Juillet", en: "July" },
    styles: ["House","Techno","Leftfield","Indie Dance","Ambient"],
    site: "https://wildeburg.nl",
    description: {
      fr: "Labyrinthe de bambous, de cabanes et de clairières ouvert 24 h sur 24 pendant quatre jours à Kraggenburg, sans horaires affichés à l’avance.",
      en: "Round-the-clock labyrinth of bamboo groves, wooden hideouts and forest clearings in Kraggenburg running four days straight.",
    },
  },
  {
    id: "lentekabinet-amsterdam",
    nom: "Lentekabinet (par Dekmantel)",
    type: "festival",
    paysCode: "NL",
    villeSlug: "amsterdam-nl",
    ville: { fr: "Oostzaan / Amsterdam (Het Twiske)", en: "Oostzaan / Amsterdam (Het Twiske)" },
    latitude: 52.4561,
    longitude: 4.8922,
    capacite: 10000,
    annee: 2012,
    mois: { fr: "Mai - Juin", en: "May - June" },
    styles: ["House","Leftfield","Techno","Disco","Electro"],
    site: "https://www.hetlentekabinet.nl",
    description: {
      fr: "Le petit frère printanier et bucolique de Dekmantel au bord de l’eau dans la réserve naturelle Het Twiske au nord d’Amsterdam.",
      en: "Dekmantel’s bucolic spring sibling on the waterfront of the Het Twiske nature reserve just north of Amsterdam.",
    },
  },
  {
    id: "rewire-festival-the-hague",
    nom: "Rewire Festival",
    type: "festival",
    paysCode: "NL",
    ville: { fr: "La Haye", en: "The Hague" },
    latitude: 52.0781,
    longitude: 4.3125,
    capacite: 10000,
    annee: 2011,
    mois: { fr: "Avril", en: "April" },
    styles: ["Experimental","Ambient","IDM","Leftfield","Deconstructed Club"],
    site: "https://www.rewirefestival.nl",
    description: {
      fr: "Festival international des musiques aventureuses investissant églises, théâtres et anciens bâtiments industriels de La Haye.",
      en: "International festival for adventurous electronic and experimental music across churches, theaters and industrial spaces in The Hague.",
    },
  },
  {
    id: "dominator-festival-netherlands",
    nom: "Dominator Festival",
    type: "festival",
    paysCode: "NL",
    ville: { fr: "Eersel (E3 Strand)", en: "Eersel (E3 Strand)" },
    latitude: 51.3514,
    longitude: 5.3442,
    capacite: 50000,
    annee: 2005,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Hardcore","Gabber","Uptempo","Industrial Hardcore"],
    site: "https://www.dominatorfestival.com",
    description: {
      fr: "Co-produit par Q-dance et Art of Dance sur la plage d’Eersel, le plus grand festival hardcore et gabber en plein air au monde.",
      en: "Co-produced by Q-dance and Art of Dance on the beach of Eersel, the world’s largest open-air hardcore and gabber festival.",
    },
  },
  {
    id: "parklife-manchester",
    nom: "Parklife Festival",
    type: "festival",
    paysCode: "GB",
    ville: { fr: "Manchester (Heaton Park)", en: "Manchester (Heaton Park)" },
    latitude: 53.5358,
    longitude: -2.2544,
    capacite: 80000,
    annee: 2010,
    mois: { fr: "Juin", en: "June" },
    styles: ["House","UK Garage","Techno","Drum & Bass"],
    site: "https://parklife.uk.com",
    description: {
      fr: "Orchestré par l’équipe de The Warehouse Project à Heaton Park, le plus grand festival métropolitain du nord de l’Angleterre.",
      en: "Curated by the team behind The Warehouse Project at Heaton Park, the largest metropolitan music festival in northern England.",
    },
  },
  {
    id: "waterworks-london",
    nom: "Waterworks Festival",
    type: "festival",
    paysCode: "GB",
    villeSlug: "londres-gb",
    ville: { fr: "Londres (Gunnersbury Park)", en: "London (Gunnersbury Park)" },
    latitude: 51.4989,
    longitude: -0.2892,
    capacite: 15000,
    annee: 2021,
    mois: { fr: "Septembre", en: "September" },
    styles: ["UK Bass","Techno","Leftfield","Jungle","Breaks"],
    site: "https://waterworksfestival.co.uk",
    description: {
      fr: "Sept scènes circulaires et immersives à Gunnersbury Park, dédiées au son underground britannique : UK bass, techno, breaks et jungle.",
      en: "Seven circular, sound-obsessed stages in Gunnersbury Park dedicated to cutting-edge UK bass, techno, breaks and jungle.",
    },
  },
  {
    id: "gottwood-wales",
    nom: "Gottwood Festival",
    type: "festival",
    paysCode: "GB",
    ville: { fr: "Anglesey (Pays de Galles)", en: "Anglesey (Wales)" },
    latitude: 53.3944,
    longitude: -4.5419,
    capacite: 5000,
    annee: 2010,
    mois: { fr: "Juin", en: "June" },
    styles: ["Minimal","House","Techno","Breaks","Electro"],
    site: "https://www.gottwood.co.uk",
    description: {
      fr: "Festival boutique caché dans les bois du domaine de Carreglwyd sur l’île d’Anglesey au Pays de Galles, prisé pour sa minimal, sa house et son electro.",
      en: "Woodland boutique festival hidden on the Carreglwyd estate on the Isle of Anglesey in Wales, prized for minimal, house and electro.",
    },
  },
  {
    id: "freerotation-wales",
    nom: "Freerotation",
    type: "festival",
    paysCode: "GB",
    ville: { fr: "Baskerville Hall (Pays de Galles)", en: "Baskerville Hall (Wales)" },
    latitude: 52.0911,
    longitude: -3.1442,
    capacite: 1000,
    annee: 2007,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","Electro","House","Experimental","Ambient"],
    site: "https://www.freerotation.com",
    description: {
      fr: "Rassemblement culte de passionnés et de producteurs au manoir de Baskerville Hall au Pays de Galles, célèbre pour son système sonore quadriphonique.",
      en: "Cult gathering of producers and devotees at Baskerville Hall in Wales, famed for its quadraphonic sound system and deep musical focus.",
    },
  },
  {
    id: "riverside-festival-glasgow",
    nom: "Riverside Festival Glasgow",
    type: "festival",
    paysCode: "GB",
    ville: { fr: "Glasgow (Riverside Museum)", en: "Glasgow (Riverside Museum)" },
    latitude: 55.8653,
    longitude: -4.3061,
    capacite: 12000,
    annee: 2013,
    mois: { fr: "Mai", en: "May" },
    styles: ["Techno","House","Electro","Hard Techno"],
    site: "https://www.riversidefestivalglasgow.com",
    description: {
      fr: "Le grand rendez-vous électronique d’Écosse au bord de la rivière Clyde devant l’architecture de Zaha Hadid, co-programmé avec le Sub Club.",
      en: "Scotland’s premier outdoor electronic festival on the banks of the River Clyde beside Zaha Hadid’s Riverside Museum.",
    },
  },
  {
    id: "own-spirit-spain",
    nom: "Own Spirit Festival",
    type: "festival",
    paysCode: "ES",
    ville: { fr: "Baldellou (Huesca / Aragon)", en: "Baldellou (Huesca / Aragon)" },
    latitude: 41.9189,
    longitude: 0.5472,
    capacite: 4000,
    annee: 2015,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Psy","Psytech","Darkprog","Downtempo"],
    site: "https://ownspiritfestival.org",
    description: {
      fr: "Six jours au bord du lac de retenue de Santa Ana dans les pré-Pyrénées aragonaises, bastion ibérique de la psytrance, de la psytech et du downtempo.",
      en: "Six days beside the turquoise reservoir of Santa Ana in the Aragonese pre-Pyrenees, Spain’s flagship gathering for psytrance, psytech and downtempo.",
    },
  },
  {
    id: "medusa-sunbeach-cullera",
    nom: "Medusa Sunbeach Festival",
    type: "festival",
    paysCode: "ES",
    ville: { fr: "Cullera (Valence)", en: "Cullera (Valencia)" },
    latitude: 39.1628,
    longitude: -0.2408,
    capacite: 55000,
    annee: 2014,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Hard Techno","EDM","House","Remember"],
    site: "https://www.medusasunbeach.com",
    description: {
      fr: "Immense festival en bord de mer à Cullera au sud de Valence, réunissant une scène techno souterraine colossale, la hard techno et la culture « Ruta del Bakalao ».",
      en: "Massive beachfront festival in Cullera south of Valencia, uniting a colossal underground techno arena, hard techno and Valencian club heritage.",
    },
  },
  {
    id: "a-summer-story-madrid",
    nom: "A Summer Story",
    type: "festival",
    paysCode: "ES",
    ville: { fr: "Madrid (Ciudad del Rock, Arganda del Rey)", en: "Madrid (Ciudad del Rock)" },
    latitude: 40.3114,
    longitude: -3.4839,
    capacite: 35000,
    annee: 2015,
    mois: { fr: "Juin", en: "June" },
    styles: ["Techno","Hard Techno","EDM","Trance"],
    site: "https://asummerstory.com",
    description: {
      fr: "Deux nuits à la Ciudad del Rock près de Madrid pour lancer l’été espagnol autour des poids lourds de la techno, de la hard techno et de la trance.",
      en: "Two nights at Madrid’s Ciudad del Rock launching the Spanish summer around heavyweights of techno, hard techno and trance.",
    },
  },
  {
    id: "mugako-vitoria",
    nom: "Mugako Festival",
    type: "festival",
    paysCode: "ES",
    ville: { fr: "Vitoria-Gasteiz (Pays basque)", en: "Vitoria-Gasteiz (Basque Country)" },
    latitude: 42.8467,
    longitude: -2.6716,
    capacite: 3000,
    annee: 2015,
    mois: { fr: "Octobre", en: "October" },
    styles: ["Techno","Electro","IDM","Experimental"],
    site: "https://mugakofestival.com",
    description: {
      fr: "Rendez-vous pointu au musée d’art contemporain Artium de Vitoria-Gasteiz au Pays basque, dédié à la techno mentale, à l’electro et à l’IDM.",
      en: "Curated gathering at the Artium Museum of Contemporary Art in Vitoria-Gasteiz in the Basque Country, dedicated to deep techno, electro and IDM.",
    },
  },
  {
    id: "modem-festival-croatie",
    nom: "Mo:Dem (Momento Demento)",
    type: "festival",
    paysCode: "HR",
    ville: { fr: "Primišlje (Slunj)", en: "Primislje (Slunj)" },
    latitude: 45.1489,
    longitude: 15.4836,
    capacite: 8000,
    annee: 2012,
    mois: { fr: "Août", en: "August" },
    styles: ["Darkprog","Psytech","Psy","Experimental","Downtempo"],
    site: "https://modemfestival.com",
    description: {
      fr: "Référence mondiale absolue de la darkprog, de la forest psytrance et de la psytech (scènes The Hive, The Swamp et The Seed) au fond d’un canyon boisé traversé par la rivière Mrežnica.",
      en: "Global benchmark for darkprog, forest psytrance and psytech (across The Hive, The Swamp and The Seed stages) in a wooded canyon along the Mrežnica River.",
    },
  },
  {
    id: "outlook-origins-tisno",
    nom: "Outlook Origins",
    type: "festival",
    paysCode: "HR",
    ville: { fr: "Tisno (The Garden Resort)", en: "Tisno (The Garden Resort)" },
    latitude: 43.8018,
    longitude: 15.6428,
    capacite: 5000,
    annee: 2008,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Dubstep","Drum & Bass","Jungle","UK Garage","Grime"],
    site: "https://www.outlookfestival.com",
    description: {
      fr: "La mecque européenne de la culture sound system britannique sur la côte dalmate : dubstep originel, jungle, drum & bass, UK garage et dub.",
      en: "Europe’s spiritual home for sound-system culture on the Dalmatian coast, celebrating dubstep, jungle, drum & bass, UK garage and dub.",
    },
  },
  {
    id: "defected-croatia-tisno",
    nom: "Defected Croatia",
    type: "festival",
    paysCode: "HR",
    ville: { fr: "Tisno (The Garden Resort)", en: "Tisno (The Garden Resort)" },
    latitude: 43.8011,
    longitude: 15.6416,
    capacite: 5000,
    annee: 2016,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Soulful House","Disco","Deep House"],
    site: "https://defected.com",
    description: {
      fr: "Cinq jours de house vocale, de disco et de boat parties sur l’Adriatique orchestrés par le label londonien Defected Records et Glitterbox.",
      en: "Five days of vocal house, disco and Adriatic boat parties hosted by London powerhouse Defected Records and Glitterbox.",
    },
  },
  {
    id: "decibel-open-air-florence",
    nom: "Decibel Open Air",
    type: "festival",
    paysCode: "IT",
    ville: { fr: "Florence (Parco delle Cascine)", en: "Florence (Parco delle Cascine)" },
    latitude: 43.7831,
    longitude: 11.2211,
    capacite: 25000,
    annee: 2018,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Techno","Hard Techno","Melodic Techno","House"],
    site: "https://www.decibelopenair.com",
    description: {
      fr: "Grand rendez-vous techno et melodic techno de fin d’été à Florence, réunissant des scènes géantes signées elrow et Terminal V.",
      en: "Major late-summer techno and melodic techno gathering in Florence featuring giant stages curated with elrow and Terminal V.",
    },
  },
  {
    id: "ortigia-sound-system-sicily",
    nom: "Ortigia Sound System",
    type: "festival",
    paysCode: "IT",
    ville: { fr: "Syracuse (Île d’Ortygie, Sicile)", en: "Syracuse (Ortigia Island, Sicily)" },
    latitude: 37.0611,
    longitude: 15.2933,
    capacite: 5000,
    annee: 2014,
    mois: { fr: "Juillet - Août", en: "July - August" },
    styles: ["Leftfield","Experimental","Techno","House"],
    site: "https://ortigiasoundsystem.com",
    description: {
      fr: "Festival insulaire sur la presqu’île baroque d’Ortygie en Sicile, croisant rythmes méditerranéens et avant-garde électronique.",
      en: "Island festival on the baroque peninsula of Ortigia in Sicily, bridging Mediterranean rhythms with the global electronic avant-garde.",
    },
  },
  {
    id: "waha-festival-romania",
    nom: "Waha Festival",
    type: "festival",
    paysCode: "RO",
    ville: { fr: "Bățanii Mari (Covasna, Transylvanie)", en: "Batanii Mari (Covasna, Transylvania)" },
    latitude: 46.0886,
    longitude: 25.6914,
    capacite: 5000,
    annee: 2012,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Minimal","Rominimal","Psy","Psytech","Ambient"],
    site: "https://wahafestival.ro",
    description: {
      fr: "Retraite musicale de cinq jours dans une clairière des Carpates en Transylvanie, réunissant une scène rominimal (microhouse) et une scène psytrance et psytech.",
      en: "Five-day mountain retreat in a Carpathian clearing in Transylvania, uniting a dedicated rominimal microhouse stage with psytrance and psytech.",
    },
  },
  {
    id: "hard-summer-los-angeles",
    nom: "HARD Summer Music Festival",
    type: "festival",
    paysCode: "US",
    villeSlug: "losangeles-us",
    ville: { fr: "Los Angeles (Hollywood Park, Inglewood)", en: "Los Angeles (Hollywood Park, Inglewood)" },
    latitude: 33.9533,
    longitude: -118.3386,
    capacite: 60000,
    annee: 2007,
    mois: { fr: "Août", en: "August" },
    styles: ["House","Techno","UK Garage","Bass","Tech House"],
    site: "https://www.hardsummer.com",
    description: {
      fr: "Institution angeleno fondée en 2007, réunissant à Inglewood le meilleur de la house, de la techno, de l’UK garage et de la bass music.",
      en: "Los Angeles institution founded in 2007, bringing together top-tier house, techno, UK garage and bass music at Hollywood Park in Inglewood.",
    },
  },
  {
    id: "beyond-wonderland-socal",
    nom: "Beyond Wonderland SoCal",
    type: "festival",
    paysCode: "US",
    villeSlug: "losangeles-us",
    ville: { fr: "San Bernardino (NOS Events Center)", en: "San Bernardino (NOS Events Center)" },
    latitude: 34.0886,
    longitude: -117.2911,
    capacite: 65000,
    annee: 2010,
    mois: { fr: "Mars", en: "March" },
    styles: ["House","Techno","Trance","Drum & Bass","Dubstep"],
    site: "https://socal.beyondwonderland.com",
    description: {
      fr: "Grand rassemblement printanier d’Insomniac en Californie du Sud avec scènes Factory 93 (techno), Dreamstate (trance) et Bassrush.",
      en: "Major spring Insomniac festival in Southern California featuring dedicated Factory 93 (techno), Dreamstate (trance) and Bassrush stages.",
    },
  },
  {
    id: "dreamstate-socal",
    nom: "Dreamstate SoCal",
    type: "festival",
    paysCode: "US",
    villeSlug: "losangeles-us",
    ville: { fr: "Long Beach (Queen Mary Waterfront)", en: "Long Beach (Queen Mary Waterfront)" },
    latitude: 33.7528,
    longitude: -118.1889,
    capacite: 25000,
    annee: 2015,
    mois: { fr: "Novembre", en: "November" },
    styles: ["Trance","Psy","Progressive Trance","Tech Trance"],
    site: "https://socal.dreamstateusa.com",
    description: {
      fr: "Le plus grand festival d’Amérique du Nord entièrement consacré à la trance, à l’uplifting et à la psytrance, face au paquebot Queen Mary à Long Beach.",
      en: "North America’s largest festival dedicated exclusively to trance, uplifting and psytrance on the Queen Mary waterfront in Long Beach.",
    },
  },
  {
    id: "sustain-release-new-york",
    nom: "Sustain-Release",
    type: "festival",
    paysCode: "US",
    villeSlug: "newyork-us",
    ville: { fr: "Monticello (Catskills, État de New York)", en: "Monticello (Catskills, New York)" },
    latitude: 41.6514,
    longitude: -74.6625,
    capacite: 1500,
    annee: 2014,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Techno","Leftfield","Bass","House","Electro"],
    site: "https://sustain-release.com",
    description: {
      fr: "Fondé par Aurora Halal dans un camp d’été des montagnes Catskills au nord de New York, le rassemblement underground le plus influent de la côte Est.",
      en: "Founded by Aurora Halal at a summer camp in the Catskill Mountains north of NYC, the East Coast’s most influential underground gathering.",
    },
  },
  {
    id: "the-great-beyond-minnesota",
    nom: "The Great Beyond",
    type: "festival",
    paysCode: "US",
    ville: { fr: "Granite Falls (Minnesota)", en: "Granite Falls (Minnesota)" },
    latitude: 44.7825,
    longitude: -95.5122,
    capacite: 2500,
    annee: 2018,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","Acid","Hypnotic Techno","Electro"],
    site: "https://greatbeyond.us",
    description: {
      fr: "Sanctuaire de la techno pure, de l’acid et du son du Midwest américain dans la vallée de la rivière Minnesota.",
      en: "Sanctuary for pure hypnotic techno, acid and Midwest rave heritage in the Minnesota River Valley.",
    },
  },
  {
    id: "free-earth-festival-greece",
    nom: "Free Earth Festival",
    type: "festival",
    paysCode: "GR",
    ville: { fr: "Asprovalta (Chalcidique)", en: "Asprovalta (Halkidiki)" },
    latitude: 40.7222,
    longitude: 23.7069,
    capacite: 8000,
    annee: 2013,
    mois: { fr: "Août - Septembre", en: "August - September" },
    styles: ["Psy","Psytech","Darkprog","Downtempo"],
    site: "https://freeearth-festival.com",
    description: {
      fr: "Grand rassemblement psychédélique sur une plage de la mer Égée en Chalcidique, avec trois scènes dédiées à la psytrance, à la psytech et au chill-out.",
      en: "Major Aegean beachfront psychedelic gathering in Halkidiki featuring three stages dedicated to psytrance, psytech and chill-out.",
    },
  },
  {
    id: "phaex-festival-corfu",
    nom: "Phaex Festival",
    type: "festival",
    paysCode: "GR",
    ville: { fr: "Corfou (Île ionienne)", en: "Corfu (Ionian Island)" },
    latitude: 39.6243,
    longitude: 19.9217,
    capacite: 8000,
    annee: 2022,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","House","Hard Techno","Melodic Techno"],
    site: "https://phaex.com",
    description: {
      fr: "Quatre jours de techno et de house à travers les forteresses vénitiennes, les clubs en plein air et les plages de l’île de Corfou.",
      en: "Four days of techno and house across Venetian fortresses, open-air clubs and beaches on the island of Corfu.",
    },
  },
  {
    id: "primer-music-festival-athens",
    nom: "Primer Music Festival",
    type: "festival",
    paysCode: "GR",
    ville: { fr: "Athènes (Plateia Nerou)", en: "Athens (Plateia Nerou)" },
    latitude: 37.9394,
    longitude: 23.6869,
    capacite: 25000,
    annee: 2018,
    mois: { fr: "Septembre", en: "September" },
    styles: ["House","Techno","Melodic Techno","EDM"],
    site: "https://primermusicfestival.com",
    description: {
      fr: "Le plus grand festival électronique de Grèce sur l’esplanade maritime de Plateia Nerou au bord du golfe Saronique à Athènes.",
      en: "Greece’s largest electronic music festival on the waterfront plaza of Plateia Nerou along the Saronic Gulf in Athens.",
    },
  },
  {
    id: "glitch-festival-malta",
    nom: "Glitch Festival",
    type: "festival",
    paysCode: "MT",
    ville: { fr: "Rabat / Mdina (Gianpula Village)", en: "Rabat / Mdina (Gianpula Village)" },
    latitude: 35.8758,
    longitude: 14.4214,
    capacite: 15000,
    annee: 2016,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Hard Techno","House","Electro","Acid"],
    site: "https://www.glitchfestival.com",
    description: {
      fr: "Sept scènes au pied de la cité fortifiée de Mdina à Malte, complétées par des raves dans des grottes anciennes et des boat parties en Méditerranée.",
      en: "Seven stages beneath the fortified city of Mdina in Malta, complete with ancient cave raves and Mediterranean boat parties.",
    },
  },
  {
    id: "moga-festival-essaouira",
    nom: "MOGA Festival Essaouira",
    type: "festival",
    paysCode: "MA",
    ville: { fr: "Essaouira", en: "Essaouira" },
    latitude: 31.5085,
    longitude: -9.7595,
    capacite: 10000,
    annee: 2016,
    mois: { fr: "Octobre", en: "October" },
    styles: ["Indie Dance","House","Deep House","Minimal","Techno"],
    site: "https://www.mogafestival.com",
    description: {
      fr: "Dialogue unique entre la culture Gnaoua marocaine et les musiques électroniques mondiales (indie dance, house, minimal) dans la cité atlantique d’Essaouira (avec une édition jumelle à Caparica au Portugal).",
      en: "Unique dialogue between Moroccan Gnawa heritage and global electronic music (indie dance, house, minimal) in the Atlantic port city of Essaouira.",
    },
  },
  {
    id: "oasis-festival-morocco",
    nom: "Oasis Festival",
    type: "festival",
    paysCode: "MA",
    ville: { fr: "Marrakech / Dakhla", en: "Marrakech / Dakhla" },
    latitude: 31.6295,
    longitude: -7.9811,
    capacite: 6000,
    annee: 2015,
    mois: { fr: "Septembre - Novembre", en: "September - November" },
    styles: ["House","Techno","Indie Dance","Afro House"],
    site: "https://theoasisfest.com",
    description: {
      fr: "Pionnier des festivals électroniques boutique au Maroc, réunissant la scène nord-africaine et les têtes d’affiche house et techno internationales.",
      en: "Pioneer of boutique electronic festivals in Morocco, uniting North African talent with international house and techno headliners.",
    },
  },
  {
    id: "let-it-roll-czechia",
    nom: "Let It Roll",
    type: "festival",
    paysCode: "CZ",
    ville: { fr: "Milovice / Most (Bohême)", en: "Milovice / Most (Bohemia)" },
    latitude: 50.2411,
    longitude: 14.8886,
    capacite: 30000,
    annee: 2002,
    mois: { fr: "Juillet - Août", en: "July - August" },
    styles: ["Drum & Bass","Neurofunk","Jump Up","Jungle"],
    site: "https://www.letitroll.eu",
    description: {
      fr: "Le plus grand festival entièrement consacré à la drum & bass au monde, rassemblant 30 000 passionnés autour de scénographies robotiques monumentales.",
      en: "The world’s largest festival dedicated entirely to drum & bass, uniting 30,000 fans around monumental robotic stage designs.",
    },
  },
  {
    id: "beats-for-love-ostrava",
    nom: "Beats for Love",
    type: "festival",
    paysCode: "CZ",
    ville: { fr: "Ostrava (Dolní Vítkovice)", en: "Ostrava (Dolni Vitkovice)" },
    latitude: 49.8194,
    longitude: 18.2806,
    capacite: 45000,
    annee: 2013,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","Drum & Bass","House","Hardstyle"],
    site: "https://www.b4l.cz",
    description: {
      fr: "Le plus grand festival électronique d’Europe centrale, niché au milieu des hauts fourneaux géants du complexe sidérurgique classé de Dolní Vítkovice à Ostrava.",
      en: "Central Europe’s largest electronic festival, set amid the giant blast furnaces of the historic Dolní Vítkovice ironworks in Ostrava.",
    },
  },
  {
    id: "master-of-puppets-czechia",
    nom: "Master of Puppets Festival",
    type: "festival",
    paysCode: "CZ",
    ville: { fr: "Bystřice nad Pernštejnem (Moravie)", en: "Bystrice nad Pernstejnem (Moravia)" },
    latitude: 49.5228,
    longitude: 16.2614,
    capacite: 5000,
    annee: 2014,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Psy","Darkprog","Psytech","Hi-Tech"],
    site: "https://www.mastersofpuppets.net",
    description: {
      fr: "Rendez-vous mondial des courants les plus souterrains et rapides du psychédélisme : darkpsy, forest, hi-tech, darkprog et psytech.",
      en: "Global gathering for the fastest and deepest underground psychedelic currents: darkpsy, forest, hi-tech, darkprog and psytech.",
    },
  },
  {
    id: "meadows-in-the-mountains-bulgaria",
    nom: "Meadows in the Mountains",
    type: "festival",
    paysCode: "BG",
    ville: { fr: "Polkovnik Serafimovo (Monts Rhodopes)", en: "Polkovnik Serafimovo (Rhodope Mountains)" },
    latitude: 41.5289,
    longitude: 24.7811,
    capacite: 2500,
    annee: 2011,
    mois: { fr: "Juin", en: "June" },
    styles: ["House","Leftfield","Disco","Broken Beat","Ambient"],
    site: "https://www.meadowsinthemountains.com",
    description: {
      fr: "Perché à 850 mètres d’altitude dans les monts Rhodopes au-dessus d’une mer de nuages au lever du soleil, festival culte de house, broken beat et musiques organiques.",
      en: "Perched at 850 meters in the Rhodope Mountains above a sea of sunrise clouds, a cult festival for house, broken beat and organic grooves.",
    },
  },
  {
    id: "exe-beach-festival-bulgaria",
    nom: "EXE Beach Festival",
    type: "festival",
    paysCode: "BG",
    ville: { fr: "Sozopol (Mer Noire)", en: "Sozopol (Black Sea)" },
    latitude: 42.3922,
    longitude: 27.7056,
    capacite: 10000,
    annee: 2019,
    mois: { fr: "Juillet - Août", en: "July - August" },
    styles: ["Techno","House","Tech House","Melodic Techno"],
    site: "https://exefestival.com",
    description: {
      fr: "Grand rendez-vous techno et house sur la plage de Kite Bar à Sozopol au bord de la mer Noire.",
      en: "Major techno and house beach gathering in Sozopol on the Bulgarian Black Sea coast.",
    },
  },
  {
    id: "echowaves-georgia",
    nom: "Echowaves / 4GB Festival",
    type: "festival",
    paysCode: "GE",
    ville: { fr: "Tbilissi / Saguramo", en: "Tbilisi / Saguramo" },
    latitude: 41.8889,
    longitude: 44.7611,
    capacite: 8000,
    annee: 2011,
    mois: { fr: "Mai", en: "May" },
    styles: ["Techno","House","Minimal","Electro"],
    site: "https://www.4gb.ge",
    description: {
      fr: "Hommage annuel au pionnier géorgien Gio Bakanidze près de Tbilissi, pilier fondateur de l’extraordinaire renaissance techno géorgienne autour de Bassiani.",
      en: "Annual tribute to Georgian pioneer Gio Bakanidze near Tbilisi, a founding pillar of Georgia’s extraordinary techno renaissance.",
    },
  },
  {
    id: "yaga-gathering-lithuania",
    nom: "Yaga Gathering",
    type: "festival",
    paysCode: "LT",
    ville: { fr: "Spengla (Forêt de Dzūkija)", en: "Spengla (Dzukija Forest)" },
    latitude: 54.3411,
    longitude: 24.7128,
    capacite: 3500,
    annee: 2003,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Psytech","Dark Disco","Psy","Techno","Ambient"],
    site: "https://www.yaga.lt",
    description: {
      fr: "Rassemblement d’art et de musique électronique au bord du lac Spengla dans la forêt de Dzūkija en Lituanie, célèbre pour sa scène Dusk (dark disco, psytech, techno hypnotique).",
      en: "Forest art and electronic gathering by Lake Spengla in Lithuania’s Dzūkija National Park, famed for its Dusk Stage (dark disco, psytech and hypnotic techno).",
    },
  },
  {
    id: "baum-festival-bogota",
    nom: "Baum Festival",
    type: "festival",
    paysCode: "CO",
    ville: { fr: "Bogotá (Corferias)", en: "Bogota (Corferias)" },
    latitude: 4.6308,
    longitude: -74.0919,
    capacite: 35000,
    annee: 2015,
    mois: { fr: "Mai", en: "May" },
    styles: ["Techno","Hard Techno","House","Electro"],
    site: "https://www.baumfestival.com",
    description: {
      fr: "La plus grande rave de Colombie à Corferias au cœur de Bogotá, témoignant de la ferveur exceptionnelle de la capitale colombienne pour la techno.",
      en: "Colombia’s largest rave at Corferias in the heart of Bogotá, showcasing the Colombian capital’s extraordinary passion for techno.",
    },
  },
  {
    id: "ritvales-medellin",
    nom: "Ritvales",
    type: "festival",
    paysCode: "CO",
    ville: { fr: "Medellín (Parque Norte)", en: "Medellin (Parque Norte)" },
    latitude: 6.2694,
    longitude: -75.5658,
    capacite: 30000,
    annee: 2018,
    mois: { fr: "Novembre", en: "November" },
    styles: ["Techno","House","Melodic Techno","Indie Dance"],
    site: "https://ritvales.com",
    description: {
      fr: "Deux jours en plein air au Parque Norte de Medellín réunissant quatre scènes techno, house et indie dance au cœur de la vallée d’Aburrá.",
      en: "Two-day open-air festival at Medellín’s Parque Norte uniting four stages of techno, house and indie dance in the Aburrá Valley.",
    },
  },
  {
    id: "ocaso-festival-costa-rica",
    nom: "Ocaso Underground Music Festival",
    type: "festival",
    paysCode: "CR",
    ville: { fr: "Jacó / Tamarindo (Pacifique)", en: "Jaco / Tamarindo (Pacific Coast)" },
    latitude: 9.618,
    longitude: -84.629,
    capacite: 5000,
    annee: 2017,
    mois: { fr: "Janvier", en: "January" },
    styles: ["House","Techno","Tech House","Minimal"],
    site: "https://ocasofestival.com",
    description: {
      fr: "Rendez-vous hivernal entre jungle et océan Pacifique au Costa Rica, dédié aux sonorités house et techno underground.",
      en: "Winter gathering between rainforest and the Pacific Ocean in Costa Rica, dedicated to underground house and techno.",
    },
  },
  {
    id: "envision-festival-costa-rica",
    nom: "Envision Festival",
    type: "festival",
    paysCode: "CR",
    ville: { fr: "Uvita (Rancho La Merced)", en: "Uvita (Rancho La Merced)" },
    latitude: 9.1636,
    longitude: -83.7439,
    capacite: 8000,
    annee: 2011,
    mois: { fr: "Février - Mars", en: "February - March" },
    styles: ["Bass","House","Techno","Downtempo","Psytech"],
    site: "https://envisionfestival.com",
    description: {
      fr: "Sept jours où la jungle primaire rejoint la plage d’Uvita sur la côte pacifique du Costa Rica, autour d’architectures organiques en bambou.",
      en: "Seven days where primary rainforest meets the beach in Uvita on Costa Rica’s Pacific coast, built around monumental bamboo stage architecture.",
    },
  },
  {
    id: "wonderfruit-thailand",
    nom: "Wonderfruit",
    type: "festival",
    paysCode: "TH",
    ville: { fr: "Pattaya (The Fields at Siam Country Club)", en: "Pattaya (The Fields at Siam Country Club)" },
    latitude: 12.9236,
    longitude: 100.9625,
    capacite: 25000,
    annee: 2014,
    mois: { fr: "Décembre", en: "December" },
    styles: ["House","Techno","Leftfield","Ambient","Minimal"],
    site: "https://wonderfruit.co",
    description: {
      fr: "Laboratoire culturel et sonore en Thaïlande célèbre pour son Polygon Live (dôme sonore 360 degrés), sa Quarry nocturne (techno et minimal) et ses pavillons d’architectes.",
      en: "Cultural and sonic playground in Thailand renowned for its 360-degree Polygon Live dome, nocturnal Quarry stage (techno and minimal) and architectural pavilions.",
    },
  },
  {
    id: "s2o-songkran-bangkok",
    nom: "S2O Songkran Music Festival",
    type: "festival",
    paysCode: "TH",
    ville: { fr: "Bangkok (Live Park Rama 9)", en: "Bangkok (Live Park Rama 9)" },
    latitude: 13.7486,
    longitude: 100.6042,
    capacite: 50000,
    annee: 2015,
    mois: { fr: "Avril", en: "April" },
    styles: ["EDM","House","Techno","Bass"],
    site: "https://www.s2ofestival.com",
    description: {
      fr: "Célébration électronique du Nouvel An thaïlandais (Songkran) à Bangkok sous des canons à eau géants à 360 degrés.",
      en: "Electronic celebration of Thai New Year (Songkran) in Bangkok beneath 360-degree high-pressure water cannons.",
    },
  },
  {
    id: "djakarta-warehouse-project",
    nom: "Djakarta Warehouse Project (DWP)",
    type: "festival",
    paysCode: "ID",
    ville: { fr: "Jakarta & Bali (GWK Cultural Park)", en: "Jakarta & Bali (GWK Cultural Park)" },
    latitude: -8.8104,
    longitude: 115.1676,
    capacite: 40000,
    annee: 2008,
    mois: { fr: "Décembre", en: "December" },
    styles: ["House","Techno","EDM","Trance"],
    site: "https://djakartawarehouse.com",
    description: {
      fr: "L’un des plus grands festivals électroniques d’Asie du Sud-Est, alternant entre Jakarta et les falaises calcaires du parc culturel Garuda Wisnu Kencana à Bali.",
      en: "One of Southeast Asia’s largest electronic festivals, alternating between Jakarta and the limestone cliffs of GWK Cultural Park in Bali.",
    },
  },
  {
    id: "suara-festival-bali",
    nom: "Suara Festival",
    type: "festival",
    paysCode: "ID",
    ville: { fr: "Tabanan (Nuanu Creative City, Bali)", en: "Tabanan (Nuanu Creative City, Bali)" },
    latitude: -8.6258,
    longitude: 115.0844,
    capacite: 5000,
    annee: 2022,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Indie Dance","House","Melodic Techno","Downtempo"],
    site: "https://www.suarafestival.com",
    description: {
      fr: "Festival artistique en bord d’océan au cœur du village créatif de Nuanu à Bali, dédié à l’indie dance, la house et l’architecture en bambou.",
      en: "Oceanfront arts and electronic festival inside Bali’s Nuanu Creative City, dedicated to indie dance, house and bamboo architecture.",
    },
  },
  {
    id: "shankra-festival-switzerland",
    nom: "Shankra Festival",
    type: "festival",
    paysCode: "CH",
    ville: { fr: "Lostallo (Val Mesolcina, Grisons)", en: "Lostallo (Grisons)" },
    latitude: 46.3114,
    longitude: 9.1936,
    capacite: 10000,
    annee: 2015,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Psy","Psytech","Goa Trance","Downtempo"],
    site: "https://shankrafestival.org",
    description: {
      fr: "Cinq jours au fond d’une vallée alpine des Grisons encadrée de cascades, grand rendez-vous suisse de la psytrance, de la psytech et de la goa.",
      en: "Five days in a waterfall-ringed Alpine valley in Graubünden, Switzerland’s premier gathering for psytrance, psytech and Goa trance.",
    },
  },
  {
    id: "burning-mountain-switzerland",
    nom: "Burning Mountain Festival",
    type: "festival",
    paysCode: "CH",
    ville: { fr: "Zernez (Engadine, Grisons)", en: "Zernez (Engadin, Grisons)" },
    latitude: 46.7014,
    longitude: 10.0939,
    capacite: 6500,
    annee: 2010,
    mois: { fr: "Juin", en: "June" },
    styles: ["Psy","Progressive Trance","Psytech"],
    site: "https://www.burning-mountain.ch",
    description: {
      fr: "Perché à 1 470 mètres d’altitude dans la vallée de l’Engadine, mêlant arts du feu, sculptures monumentales, progressive et psytrance.",
      en: "Set at 1,470 meters in the Engadin valley, combining fire arts, monumental sculptures, progressive trance and psytrance.",
    },
  },
  {
    id: "hive-air-switzerland",
    nom: "Hive Air",
    type: "festival",
    paysCode: "CH",
    ville: { fr: "Wohlen (Argovie, près de Zurich)", en: "Wohlen (near Zurich)" },
    latitude: 47.3522,
    longitude: 8.2789,
    capacite: 15000,
    annee: 2019,
    mois: { fr: "Juin", en: "June" },
    styles: ["House","Techno","Melodic Techno","Indie Dance"],
    site: "https://www.hiveair.ch",
    description: {
      fr: "Le grand open air estival orchestré par le club zurichois Hive, réunissant quatre scènes house, techno et indie dance.",
      en: "Flagship summer open-air curated by Zurich’s legendary Hive club, uniting four stages of house, techno and indie dance.",
    },
  },
  {
    id: "daad-gathering-hungary",
    nom: "DAAD Gathering",
    type: "festival",
    paysCode: "HU",
    ville: { fr: "Dádpuszta (Igar)", en: "Dadpuszta (Igar)" },
    latitude: 46.7625,
    longitude: 18.4239,
    capacite: 6000,
    annee: 2021,
    mois: { fr: "Juin - Juillet", en: "June - July" },
    styles: ["Techno","Psytech","Minimal","House","Ambient"],
    site: "https://daad.hu",
    description: {
      fr: "Organisé par l’équipe d’O.Z.O.R.A. sur les mêmes collines de Dádpuszta, mais entièrement consacré à la techno hypnotique, à la psytech, au minimal et à l’ambient.",
      en: "Created by the O.Z.O.R.A. team in the rolling hills of Dádpuszta, dedicated to hypnotic techno, psytech, minimal and ambient.",
    },
  },
  {
    id: "b-my-lake-balaton",
    nom: "B My Lake Festival",
    type: "festival",
    paysCode: "HU",
    ville: { fr: "Lac Balaton / Velence", en: "Lake Balaton / Velence" },
    latitude: 46.8833,
    longitude: 17.8833,
    capacite: 20000,
    annee: 2013,
    mois: { fr: "Juillet - Août", en: "July - August" },
    styles: ["Techno","Hard Techno","House","Tech House"],
    site: "https://bmylake.hu",
    description: {
      fr: "La mecque hongroise de la techno contemporaine et de la tech house au bord de l’eau.",
      en: "Hungary’s lakeside stronghold for contemporary techno, hard techno and tech house.",
    },
  },
  {
    id: "springfestival-graz",
    nom: "Springfestival Graz",
    type: "festival",
    paysCode: "AT",
    ville: { fr: "Graz (Schlossberg & lieux urbains)", en: "Graz (Schlossberg & Urban Venues)" },
    latitude: 47.0707,
    longitude: 15.4395,
    capacite: 15000,
    annee: 2001,
    mois: { fr: "Mai - Juin", en: "May - June" },
    styles: ["Techno","House","Drum & Bass","Experimental"],
    site: "https://www.springfestival.at",
    description: {
      fr: "Cinq jours d’art électronique et de culture club à Graz, investissant notamment les tunnels souterrains de la colline du Schlossberg.",
      en: "Five days of electronic art and club culture in Graz, notably taking over the subterranean tunnels inside the Schlossberg hill.",
    },
  },
  {
    id: "flow-festival-austria",
    nom: "Flow Experience Festival",
    type: "festival",
    paysCode: "AT",
    ville: { fr: "Wiener Neustadt (Basse-Autriche)", en: "Wiener Neustadt (Lower Austria)" },
    latitude: 47.8167,
    longitude: 16.25,
    capacite: 5000,
    annee: 2014,
    mois: { fr: "Juin - Juillet", en: "June - July" },
    styles: ["Psy","Progressive Trance","Psytech","Downtempo"],
    site: "https://www.flow-festival.at",
    description: {
      fr: "Principal open air psychédélique et progressive trance d’Autriche au sud de Vienne.",
      en: "Austria’s leading open-air psychedelic and progressive trance gathering south of Vienna.",
    },
  },
  {
    id: "bravo-gnp-mexico",
    nom: "Bravo GNP",
    type: "festival",
    paysCode: "MX",
    ville: { fr: "Valle de Bravo (État de Mexico)", en: "Valle de Bravo (State of Mexico)" },
    latitude: 19.195,
    longitude: -100.1328,
    capacite: 8000,
    annee: 2017,
    mois: { fr: "Octobre - Novembre", en: "October - November" },
    styles: ["Indie Dance","House","Techno","Disco"],
    site: "https://bravognp.com",
    description: {
      fr: "Nuit et jour sous les pins de Valle de Bravo à deux heures de Mexico, réunissant scènes indie dance, house et techno au milieu de la forêt.",
      en: "Day-and-night gathering beneath the pines of Valle de Bravo two hours from Mexico City, uniting indie dance, house and techno in the forest.",
    },
  },
  {
    id: "tropico-acapulco",
    nom: "Festival Trópico",
    type: "festival",
    paysCode: "MX",
    ville: { fr: "Acapulco (Pierre Mundo Imperial)", en: "Acapulco (Pacific Coast)" },
    latitude: 16.7836,
    longitude: -99.8058,
    capacite: 8000,
    annee: 2013,
    mois: { fr: "Décembre", en: "December" },
    styles: ["Disco","Indie Dance","House","Leftfield"],
    site: "https://tropicomx.com",
    description: {
      fr: "Trois jours de disco, d’indie dance et de house les pieds dans le sable sur la côte Pacifique mexicaine.",
      en: "Three days of disco, indie dance and house in the sand on Mexico’s Pacific coast.",
    },
  },
  {
    id: "sundream-baja-mexico",
    nom: "Sundream Baja",
    type: "festival",
    paysCode: "MX",
    ville: { fr: "San José del Cabo (Basse-Californie du Sud)", en: "San Jose del Cabo (Baja California Sur)" },
    latitude: 23.0444,
    longitude: -109.6778,
    capacite: 3500,
    annee: 2022,
    mois: { fr: "Mai", en: "May" },
    styles: ["Melodic House","Indie Dance","Deep House","Techno"],
    site: "https://sundream.org",
    description: {
      fr: "Fondé par RÜFÜS DU SOL à El Ganzo au bord de la mer de Cortés, quatre jours de melodic house, d’indie dance et de sets au lever du soleil.",
      en: "Curated by RÜFÜS DU SOL on the Sea of Cortez in Baja California, featuring four days of melodic house, indie dance and sunrise sets.",
    },
  },
  {
    id: "warung-day-festival-curitiba",
    nom: "Warung Day Festival",
    type: "festival",
    paysCode: "BR",
    ville: { fr: "Curitiba (Pedreira Paulo Leminski)", en: "Curitiba (Pedreira Paulo Leminski)" },
    latitude: -25.3844,
    longitude: -49.2764,
    capacite: 20000,
    annee: 2014,
    mois: { fr: "Mai", en: "May" },
    styles: ["Progressive House","Melodic Techno","Deep House","Techno"],
    site: "https://warungdayfestival.com.br",
    description: {
      fr: "L’esprit du mythique club Warung Beach Club transposé dans l’immense carrière de pierre Pedreira Paulo Leminski à Curitiba.",
      en: "The spirit of the legendary Warung Beach Club brought to the monumental stone quarry of Pedreira Paulo Leminski in Curitiba.",
    },
  },
  {
    id: "xxxperience-brasil",
    nom: "XXXPERIENCE Festival",
    type: "festival",
    paysCode: "BR",
    ville: { fr: "Itu (État de São Paulo)", en: "Itu (Sao Paulo State)" },
    latitude: -23.3395,
    longitude: -47.2562,
    capacite: 30000,
    annee: 1996,
    mois: { fr: "Novembre", en: "November" },
    styles: ["Psy","Techno","House","Progressive House"],
    site: "https://xxxperience.com.br",
    description: {
      fr: "Né en 1996 comme rave psytrance, devenu le plus ancien et l’un des plus grands festivals électroniques du Brésil.",
      en: "Born in 1996 as an outdoor psytrance rave, now Brazil’s longest-running major electronic festival.",
    },
  },
  {
    id: "esoteric-festival-australia",
    nom: "Esoteric Festival",
    type: "festival",
    paysCode: "AU",
    ville: { fr: "Donald (Victoria)", en: "Donald (Victoria)" },
    latitude: -36.3686,
    longitude: 142.9869,
    capacite: 10000,
    annee: 2017,
    mois: { fr: "Mars (Labour Day Weekend)", en: "March" },
    styles: ["Psy","Psytech","Bush Techno","Glitch","Drum & Bass"],
    site: "https://esotericfestival.com.au",
    description: {
      fr: "Le grand « bush doof » australien dans le Victoria, vitrine mondiale de la bush techno, de la psytech australienne (style Zenon Records) et de la psytrance.",
      en: "Australia’s flagship ‘bush doof’ in Victoria, a global showcase for Australian bush techno, Zenonesque psytech and psytrance.",
    },
  },
  {
    id: "subsonic-music-festival-australia",
    nom: "Subsonic Music Festival",
    type: "festival",
    paysCode: "AU",
    ville: { fr: "Riverwood Downs (Nouvelle-Galles du Sud)", en: "Riverwood Downs (New South Wales)" },
    latitude: -32.2219,
    longitude: 151.8386,
    capacite: 6000,
    annee: 2009,
    mois: { fr: "Décembre", en: "December" },
    styles: ["House","Techno","Minimal","Psytech"],
    site: "https://subsonicmusic.com.au",
    description: {
      fr: "Trois jours au bord de la rivière Karuah au pied des Barrington Tops au nord de Sydney, réunissant house, techno et minimal.",
      en: "Three days beside the Karuah River in the foothills of the Barrington Tops north of Sydney, uniting house, techno and minimal.",
    },
  },
  {
    id: "rural-japan",
    nom: "rural",
    type: "festival",
    paysCode: "JP",
    ville: { fr: "Niigata / Nagano (Alpes japonaises)", en: "Niigata / Nagano (Japanese Alps)" },
    latitude: 36.9389,
    longitude: 138.8122,
    capacite: 1500,
    annee: 2009,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Hypnotic Techno","Experimental","Ambient","IDM","Electro"],
    site: "https://rural-jp.com",
    description: {
      fr: "Rendez-vous en plein air ultra-pointu dans les montagnes japonaises, vénéré pour sa sélection de techno hypnotique, d’ambient et d’électronique expérimentale.",
      en: "Revered open-air mountain gathering in Japan, celebrated globally for its uncompromising curation of hypnotic techno, ambient and experimental electronics.",
    },
  },
  {
    id: "rebirth-festival-japan",
    nom: "Re:birth Festival",
    type: "festival",
    paysCode: "JP",
    ville: { fr: "Yamanashi / Île de Sado", en: "Yamanashi / Sado Island" },
    latitude: 35.6639,
    longitude: 138.5683,
    capacite: 3000,
    annee: 2013,
    mois: { fr: "Mai - Septembre", en: "May - September" },
    styles: ["Psy","Psytech","Techno","Goa Trance"],
    site: "https://www.rebirth-festival.com",
    description: {
      fr: "Point de rencontre de la scène psytrance, psytech et techno japonaise en pleine nature.",
      en: "Outdoor meeting point for Japan’s revered psytrance, psytech and underground techno communities.",
    },
  },
  {
    id: "voodoo-village-belgium",
    nom: "Voodoo Village",
    type: "festival",
    paysCode: "BE",
    ville: { fr: "Grimbergen (Château de Humbeek)", en: "Grimbergen (Humbeek Castle)" },
    latitude: 50.9772,
    longitude: 4.3758,
    capacite: 15000,
    annee: 2015,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Melodic Techno","House","Indie Dance","Techno"],
    site: "https://voodoovillage.be",
    description: {
      fr: "Dans les bois entourant le château de Humbeek aux portes de Bruxelles, cinq scènes scénographiées entre house, indie dance, melodic techno et techno.",
      en: "In the woods surrounding Humbeek Castle near Brussels, featuring five bespoke stages spanning house, indie dance, melodic techno and techno.",
    },
  },
  {
    id: "space-safari-belgium",
    nom: "Space Safari",
    type: "festival",
    paysCode: "BE",
    ville: { fr: "Massembre (Heer-sur-Meuse, Ardennes)", en: "Massembre (Belgian Ardennes)" },
    latitude: 50.1636,
    longitude: 4.8469,
    capacite: 5000,
    annee: 2016,
    mois: { fr: "Août - Septembre", en: "August - September" },
    styles: ["Psy","Acid","Techno","Goa Trance"],
    site: "https://spacesafari.be",
    description: {
      fr: "Quatre jours dans un domaine boisé des Ardennes belges à la frontière française, réunissant psytrance, goa belge, acid et techno.",
      en: "Four days in a wooded domain in the Belgian Ardennes on the French border, uniting psytrance, Belgian Goa, acid and techno.",
    },
  },
  {
    id: "wao-festival-italy",
    nom: "WAO Festival",
    type: "festival",
    paysCode: "IT",
    ville: { fr: "San Venanzo (Mont Peglia, Ombrie)", en: "San Venanzo (Mount Peglia, Umbria)" },
    latitude: 42.8458,
    longitude: 12.2125,
    capacite: 4000,
    annee: 2015,
    mois: { fr: "Août", en: "August" },
    styles: ["Psy","Psytech","Darkprog","Downtempo"],
    site: "https://www.waofestival.org",
    description: {
      fr: "Six jours au sommet du mont Peglia (réserve de biosphère UNESCO en Ombrie), référence italienne de la psytrance, de la psytech et de l’écoconstruction.",
      en: "Six days atop Mount Peglia (a UNESCO biosphere reserve in Umbria), Italy’s leading gathering for psytrance, psytech and eco-architecture.",
    },
  },
  {
    id: "nextones-italy",
    nom: "Nextones",
    type: "festival",
    paysCode: "IT",
    ville: { fr: "Val d’Ossola (Cava La Beola di Monte, Piémont)", en: "Val d Ossola (Piedmont)" },
    latitude: 46.1539,
    longitude: 8.2914,
    capacite: 3000,
    annee: 2014,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Experimental","Techno","Ambient","IDM"],
    site: "https://www.nextones.eu",
    description: {
      fr: "Festival international d’art audiovisuel et de musique électronique niché au creux d’une ancienne carrière de pierre monumentale dans les Alpes piémontaises.",
      en: "International audiovisual and electronic music festival set inside a monumental stone quarry in the Piedmontese Alps.",
    },
  },
  {
    id: "wisloujscie-gdansk",
    nom: "Wisłoujście Festival",
    type: "festival",
    paysCode: "PL",
    ville: { fr: "Gdańsk (Forteresse de Wisłoujście)", en: "Gdansk (Wisloujscie Fortress)" },
    latitude: 54.3956,
    longitude: 18.6794,
    capacite: 12000,
    annee: 2018,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","House","Electro","Drum & Bass"],
    site: "https://wisloujscie.com",
    description: {
      fr: "Trois nuits autour des douves et des bastions en brique de la forteresse maritime du XVIe siècle de Wisłoujście à Gdańsk.",
      en: "Three nights around the moats and brick bastions of the 16th-century maritime Wisłoujście Fortress in Gdańsk.",
    },
  },
  {
    id: "mioritmic-cluj",
    nom: "Mioritmic",
    type: "festival",
    paysCode: "RO",
    ville: { fr: "Cluj-Napoca (Forêt de Hoia-Baciu)", en: "Cluj-Napoca (Hoia-Baciu Forest)" },
    latitude: 46.7744,
    longitude: 23.5219,
    capacite: 6000,
    annee: 2013,
    mois: { fr: "Octobre", en: "October" },
    styles: ["Minimal","Rominimal","Microhouse","Techno"],
    site: "https://www.mioritmic.ro",
    description: {
      fr: "Aux côtés de Sunwaves, le grand pèlerinage automnal du rominimal et de la microhouse à la lisière de la mystérieuse forêt de Hoia-Baciu à Cluj-Napoca.",
      en: "Alongside Sunwaves, the essential autumn pilgrimage for rominimal and microhouse on the edge of the Hoia-Baciu forest in Cluj-Napoca.",
    },
  },
  {
    id: "apgrade-belgrade",
    nom: "Apgrade Weekend",
    type: "festival",
    paysCode: "RS",
    ville: { fr: "Belgrade (Port de Belgrade)", en: "Belgrade (Port of Belgrade)" },
    latitude: 44.8239,
    longitude: 20.4761,
    capacite: 8000,
    annee: 2015,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Techno","House","Indie Dance","Electro"],
    site: "https://apgrade.org",
    description: {
      fr: "Grand rendez-vous électronique de Belgrade dans les hangars industriels du port au bord du Danube.",
      en: "Belgrade’s premier underground electronic gathering in the industrial hangars of the Port of Belgrade along the Danube.",
    },
  },
  {
    id: "ion-festival-albania",
    nom: "ION Festival",
    type: "festival",
    paysCode: "AL",
    ville: { fr: "Dhërmi (Riviera albanaise)", en: "Dhermi (Albanian Riviera)" },
    latitude: 40.1458,
    longitude: 19.6406,
    capacite: 5000,
    annee: 2022,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Techno","House","Electro","Breaks","UK Bass"],
    site: "https://www.ionfestival.com",
    description: {
      fr: "Une semaine de techno, d’electro et de house conçue par l’équipe londonienne de Junction 2 dans la crique de Dhërmi et le canyon de Gjipe en Albanie.",
      en: "Week-long techno, electro and house gathering curated by the London team behind Junction 2 across Dhërmi cove and Gjipe Canyon in Albania.",
    },
  },
  {
    id: "anjunadeep-explorations-albania",
    nom: "Anjunadeep Explorations",
    type: "festival",
    paysCode: "AL",
    ville: { fr: "Dhërmi (Riviera albanaise)", en: "Dhermi (Albanian Riviera)" },
    latitude: 40.1436,
    longitude: 19.6389,
    capacite: 5000,
    annee: 2019,
    mois: { fr: "Juin", en: "June" },
    styles: ["Deep House","Progressive House","Melodic House"],
    site: "https://anjunadeep.com",
    description: {
      fr: "Cinq nuits au bord de la mer Ionienne orchestrées par le label londonien Anjunadeep autour de la deep house et de la progressive mélodique.",
      en: "Five nights by the Ionian Sea hosted by London label Anjunadeep, celebrating melodic and deep progressive house.",
    },
  },
  {
    id: "timeless-festival-quebec",
    nom: "Timeless Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal / Sainte-Agathe-de-Lotbinière (Québec)", en: "Montreal / Sainte-Agathe-de-Lotbiniere (Quebec)" },
    latitude: 46.3861,
    longitude: -71.4119,
    capacite: 5000,
    annee: 2018,
    mois: { fr: "Septembre (Fête du Travail)", en: "September (Labour Day Weekend)" },
    styles: ["Psy","Psytech","Techno","Bass","Progressive Trance"],
    site: "https://www.festochebamboche.com",
    description: {
      fr: "Grand rassemblement électronique en plein air de quatre jours au Parc de la Chute (entre Montréal et Québec) lors de la fin de semaine de la fête du Travail, réunissant psytrance (scène Neverland), psytech, techno et bass music.",
      en: "Major four-day open-air camping festival at Parc de la Chute (between Montreal and Quebec City) over Labour Day weekend, uniting psytrance (Neverland stage), psytech, techno and bass music.",
    },
  },
  {
    id: "eclipse-festival-quebec",
    nom: "Eclipse Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal / Sainte-Thérèse-de-la-Gatineau (Québec)", en: "Montreal / Outaouais (Quebec)" },
    latitude: 46.2944,
    longitude: -75.9911,
    capacite: 6000,
    annee: 1999,
    mois: { fr: "Juillet - Août", en: "July - August" },
    styles: ["Psy","Psytech","Progressive Trance","Techno","Downtempo"],
    site: "https://eclipsefestival.com",
    description: {
      fr: "Fondé par Techsafari au Québec, l’un des rassemblements psytrance, progressive, techno et arts visuels en pleine nature les plus emblématiques d’Amérique du Nord.",
      en: "Founded by Techsafari in Quebec, one of North America’s most iconic open-air psytrance, progressive, techno and visionary arts gatherings.",
    },
  },
  {
    id: "aim-electronic-music-festival-montreal",
    nom: "AIM Electronic Music Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal / Saint-André-d’Argenteuil (Parc Carillon)", en: "Montreal / Carillon Park (Quebec)" },
    latitude: 45.5686,
    longitude: -74.3742,
    capacite: 8000,
    annee: 2015,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Techno","House","Progressive House","Melodic Techno"],
    site: "https://aimfestival.ca",
    description: {
      fr: "Festival montréalais en plein air célèbre pour ses marathons de 32 heures de musique électronique sans interruption au bord de la rivière des Outaouais.",
      en: "Montreal-area open-air festival famed for its non-stop 32-hour electronic music marathons along the Ottawa River.",
    },
  },
  {
    id: "valhalla-sound-circus-quebec",
    nom: "Valhalla Sound Circus",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal / Outaouais (Québec)", en: "Montreal / Outaouais (Quebec)" },
    latitude: 45.8819,
    longitude: -75.0844,
    capacite: 4500,
    annee: 2013,
    mois: { fr: "Juillet", en: "July" },
    styles: ["Bass","Dubstep","Drum & Bass","Techno","UK Bass"],
    site: "https://valhalla-project.ca",
    description: {
      fr: "Pèlerinage majeur de la bass music, du dubstep, de la drum & bass et de la culture sound system en forêt au Québec.",
      en: "Major Quebec forest pilgrimage for bass music, dubstep, drum & bass and heavy sound-system culture.",
    },
  },
  {
    id: "off-piknic-montreal",
    nom: "OfF Piknic",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Montréal (Parc Jean-Drapeau)", en: "Montreal (Parc Jean-Drapeau)" },
    latitude: 45.5126,
    longitude: -73.5332,
    capacite: 12000,
    annee: 2014,
    mois: { fr: "Mai - Octobre", en: "May - October" },
    styles: ["Techno","Melodic Techno","House","Progressive House"],
    site: "https://piknicelectronik.com",
    description: {
      fr: "Série de grands formats nocturnes et événementiels de Piknic Électronik au Parc Jean-Drapeau, accueillant les tournées mondiales techno, melodic techno et house à Montréal.",
      en: "Large-scale special event series by Piknic Électronik at Parc Jean-Drapeau, hosting world-touring techno, melodic techno and house headliners in Montreal.",
    },
  },
  {
    id: "groove-and-bass-festival-quebec",
    nom: "Groove & Bass Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Bryson (Pontiac / Outaouais, Québec)", en: "Bryson (Pontiac / Outaouais, Quebec)" },
    latitude: 45.6611,
    longitude: -76.6258,
    capacite: 5000,
    annee: 2017,
    mois: { fr: "Juillet - Août (Vacances de la construction)", en: "July - August" },
    styles: ["Bass","Drum & Bass","Psy","Techno","House","Downtempo"],
    site: "https://groovenbass.com",
    description: {
      fr: "Grand rassemblement de cinq jours au Paradise Leisure Park de Bryson au bord de la rivière des Outaouais au Québec, réunissant bass music, drum & bass, scène psytrance dédiée, techno, house et temple downtempo.",
      en: "Five-day camping gathering at Paradise Leisure Park in Bryson along the Ottawa River in Quebec, uniting heavy bass music, drum & bass, a dedicated psytrance stage, techno, house and a downtempo temple.",
    },
  },
  {
    id: "openmind-festival-quebec",
    nom: "OpenMind Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "La Patrie / Estrie (Québec)", en: "Eastern Townships (Quebec)" },
    latitude: 45.3986,
    longitude: -71.2464,
    capacite: 3000,
    annee: 2011,
    mois: { fr: "Juin - Juillet", en: "June - July" },
    styles: ["Psy","Psytech","Techno","Downtempo","House"],
    site: "https://lesprojetsopenmind.org",
    description: {
      fr: "Pionnier des festivals électroniques et artistiques autogérés en nature au Québec, mêlant psytrance, psytech, techno, arts visuels et écoconstruction.",
      en: "Pioneer of community-driven open-air electronic and arts festivals in Quebec, blending psytrance, psytech, techno, visionary art and eco-building.",
    },
  },
  {
    id: "atmos-fest-quebec",
    nom: "Atmos Fest",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Notre-Dame-de-Montauban (Mauricie, Québec)", en: "Notre-Dame-de-Montauban (Mauricie, Quebec)" },
    latitude: 46.8406,
    longitude: -72.2478,
    capacite: 2500,
    annee: 2021,
    mois: { fr: "Août", en: "August" },
    styles: ["Techno","Melodic Techno","Afro House","House"],
    site: "https://atmosfest.ca",
    description: {
      fr: "Festival en plein air au bord d’un lac en Mauricie entre Montréal et Québec, dédié à la techno, à la melodic techno et à l’afro house.",
      en: "Lakeside open-air camping festival in Mauricie between Montreal and Quebec City, dedicated to techno, melodic techno and afro house.",
    },
  },
  {
    id: "delirium-fall-in-bass-quebec",
    nom: "Delirium / Fall in Bass",
    type: "festival",
    paysCode: "CA",
    villeSlug: "montreal-ca",
    ville: { fr: "Papineauville (Outaouais, Québec)", en: "Papineauville (Outaouais, Quebec)" },
    latitude: 45.6194,
    longitude: -75.0167,
    capacite: 2500,
    annee: 2019,
    mois: { fr: "Septembre", en: "September" },
    styles: ["Dubstep","Bass","Drum & Bass","Riddim"],
    site: "https://www.facebook.com/FallInBassFestival",
    description: {
      fr: "Rendez-vous champêtre des amateurs de grosses basses, de dubstep, de riddim et de drum & bass en Outaouais au Québec.",
      en: "Countryside camping gathering for heavy bass, dubstep, riddim and drum & bass fans in the Outaouais region of Quebec.",
    },
  },
  {
    id: "harvest-festival-ontario",
    nom: "Harvest Festival",
    type: "festival",
    paysCode: "CA",
    villeSlug: "toronto-ca",
    ville: { fr: "Burk’s Falls (Screaming Heads, Ontario)", en: "Burk s Falls (Screaming Heads, Ontario)" },
    latitude: 45.6039,
    longitude: -79.5419,
    capacite: 3500,
    annee: 1999,
    mois: { fr: "Septembre", en: "September" },
    styles: ["House","Techno","Psytech","Breaks","Downtempo"],
    site: "https://harvestfestival.org",
    description: {
      fr: "Rassemblement légendaire depuis 1999 au domaine des sculptures monumentales Screaming Heads (Midlothian Castle) en Ontario, réunissant house, techno, breaks et psytech.",
      en: "Legendary gathering held since 1999 among the monumental Screaming Heads sculptures at Midlothian Castle in Ontario, uniting house, techno, breaks and psytech.",
    },
  },
  {
    "id": "le-bon-air-marseille",
    "nom": "Festival Le Bon Air",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Friche la Belle de Mai)",
      "en": "Marseille (Friche la Belle de Mai)"
    },
    "latitude": 43.3108,
    "longitude": 5.3912,
    "capacite": 15000,
    "annee": 2016,
    "mois": {
      "fr": "Mai",
      "en": "May"
    },
    "styles": [
      "Techno",
      "House",
      "Bass",
      "Global Club"
    ],
    "site": "https://festival-lebonair.com",
    "description": {
      "fr": "Grand rendez-vous printanier des musiques électroniques à la Friche la Belle de Mai à Marseille, du toit-terrasse panoramique aux salles industrielles jusqu’à l’aube.",
      "en": "Spring electronic music gathering at Friche la Belle de Mai in Marseille, spanning its panoramic rooftop terrace and industrial halls until dawn."
    }
  },
  {
    "id": "marsatac-marseille",
    "nom": "Marsatac",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Parc Borély)",
      "en": "Marseille (Parc Borély)"
    },
    "latitude": 43.2602,
    "longitude": 5.3818,
    "capacite": 35000,
    "annee": 1999,
    "mois": {
      "fr": "Juin",
      "en": "June"
    },
    "styles": [
      "Electro",
      "Techno",
      "House",
      "Bass"
    ],
    "site": "https://marsatac.com",
    "description": {
      "fr": "Festival emblématique de Marseille fondé en 1999 au Parc Borély face à la mer, croisant grandes scènes électroniques et cultures urbaines.",
      "en": "Landmark Marseille festival founded in 1999 at Parc Borély near the sea, uniting major electronic music stages and urban club culture."
    }
  },
  {
    "id": "positiv-festival-orange",
    "nom": "Positiv Electronic Festival",
    "type": "festival",
    "paysCode": "FR",
    "ville": {
      "fr": "Orange (Théâtre Antique, Vaucluse)",
      "en": "Orange (Roman Theatre, Vaucluse)"
    },
    "latitude": 44.1358,
    "longitude": 4.8089,
    "capacite": 25000,
    "annee": 2013,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "Melodic Techno",
      "Techno",
      "House",
      "Progressive House"
    ],
    "site": "https://positivfestival.fr",
    "description": {
      "fr": "Festival électronique spectaculaire investi dans l’enceinte bimillénaire du Théâtre Antique romain d’Orange en Provence, classé à l’UNESCO.",
      "en": "Spectacular electronic festival staged inside the 2,000-year-old UNESCO-listed Roman Theatre of Orange in Provence."
    }
  },
  {
    "id": "reperkusound-lyon",
    "nom": "Reperkusound",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Villeurbanne)",
      "en": "Lyon (Villeurbanne)"
    },
    "latitude": 45.7808,
    "longitude": 4.8632,
    "capacite": 18000,
    "annee": 2006,
    "mois": {
      "fr": "Mars - Avril",
      "en": "March - April"
    },
    "styles": [
      "Techno",
      "Hardcore",
      "Psy",
      "Bass",
      "Acid"
    ],
    "site": "https://reperkusound.com",
    "description": {
      "fr": "Rendez-vous nocturne majeur de la métropole lyonnaise au Double Mixte de Villeurbanne, dédié à la techno, à l’acid, à la bass music et à la rave.",
      "en": "Major all-night indoor festival in Greater Lyon at Double Mixte in Villeurbanne, dedicated to techno, acid, bass music and rave culture."
    }
  },
  {
    "id": "woodstower-lyon",
    "nom": "Woodstower",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Grand Parc Miribel Jonage)",
      "en": "Lyon (Grand Parc Miribel Jonage)"
    },
    "latitude": 45.8024,
    "longitude": 4.9388,
    "capacite": 35000,
    "annee": 1998,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Trance"
    ],
    "site": "https://woodstower.com",
    "description": {
      "fr": "Festival de fin d’été au bord du lac du Grand Parc Miribel Jonage aux portes de Lyon, doté d’un chapiteau et de scènes électroniques en plein air.",
      "en": "Late-summer lakeside festival at Grand Parc Miribel Jonage near Lyon featuring dedicated electronic tents and beach stages."
    }
  },
  {
    "id": "name-festival-lille",
    "nom": "NAME Festival (Nord Art Musique Électronique)",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "lille-fr",
    "ville": {
      "fr": "Lille & Hauts-de-France",
      "en": "Lille & Hauts-de-France"
    },
    "latitude": 50.6312,
    "longitude": 3.0582,
    "capacite": 12000,
    "annee": 2005,
    "mois": {
      "fr": "Octobre",
      "en": "October"
    },
    "styles": [
      "Techno",
      "Electro",
      "House",
      "Indie Dance"
    ],
    "site": "https://festivalname.com",
    "description": {
      "fr": "Grand festival électronique des Hauts-de-France fondé en 2005 par la famille APM001, célèbre pour ses nuits industrielles entre Lille, Roubaix et Dunkerque.",
      "en": "Flagship northern French electronic festival founded in 2005, famed for its industrial warehouse nights across Lille, Roubaix and Dunkirk."
    }
  },
  {
    "id": "les-nuits-secretes-aulnoye",
    "nom": "Les Nuits Secrètes",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "lille-fr",
    "ville": {
      "fr": "Aulnoye-Aymeries (Hauts-de-France)",
      "en": "Aulnoye-Aymeries (Hauts-de-France)"
    },
    "latitude": 50.1978,
    "longitude": 3.8354,
    "capacite": 40000,
    "annee": 2002,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "Electro",
      "Techno",
      "House",
      "Disco"
    ],
    "site": "https://lesnuitssecretes.com",
    "description": {
      "fr": "Festival des Hauts-de-France célèbre pour ses parcours secrets et ses grandes scènes électroniques nocturnes La Station et L’Eden.",
      "en": "Northern French festival famous for its secret bus journeys and late-night electronic stages."
    }
  },
  {
    "id": "touquet-music-beach-festival",
    "nom": "Touquet Music Beach Festival",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "lille-fr",
    "ville": {
      "fr": "Le Touquet-Paris-Plage (Côte d’Opale)",
      "en": "Le Touquet-Paris-Plage"
    },
    "latitude": 50.5242,
    "longitude": 1.5856,
    "capacite": 25000,
    "annee": 2016,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "House",
      "Tech House",
      "Melodic Techno",
      "Disco"
    ],
    "site": "https://touquetmusicbeach.com",
    "description": {
      "fr": "Grand rassemblement électronique estival dans la baie de Canche au Touquet-Paris-Plage, réunissant house, techno mélodique et french touch.",
      "en": "Summer beachside electronic festival in the Bay of Canche at Le Touquet-Paris-Plage celebrating house, melodic techno and French touch."
    }
  },
  {
    "id": "initial-festival-bordeaux",
    "nom": "Initial Festival",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "bordeaux-fr",
    "ville": {
      "fr": "Bordeaux",
      "en": "Bordeaux"
    },
    "latitude": 44.8952,
    "longitude": -0.5684,
    "capacite": 15000,
    "annee": 2022,
    "mois": {
      "fr": "Août - Septembre",
      "en": "August - September"
    },
    "styles": [
      "Techno",
      "House",
      "Hard Techno",
      "Trance"
    ],
    "site": "https://initialfestival.com",
    "description": {
      "fr": "Plus grand festival en plein air dédié aux musiques électroniques à Bordeaux, réunissant trois scènes house, techno et rave.",
      "en": "Bordeaux’s largest open-air electronic music festival, uniting three stages of house, techno and rave."
    }
  },
  {
    "id": "les-siestes-electroniques-toulouse",
    "nom": "Les Siestes Électroniques",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "toulouse-fr",
    "ville": {
      "fr": "Toulouse (Jardin Compans-Caffarelli)",
      "en": "Toulouse (Jardin Compans-Caffarelli)"
    },
    "latitude": 43.6114,
    "longitude": 1.4328,
    "capacite": 15000,
    "annee": 2002,
    "mois": {
      "fr": "Juin",
      "en": "June"
    },
    "styles": [
      "Ambient",
      "Experimental",
      "Electronica",
      "Leftfield"
    ],
    "site": "https://les-siestes.com",
    "description": {
      "fr": "Festival gratuit d’avant-garde électronique fondé en 2002 au coeur du jardin Compans-Caffarelli à Toulouse, dédié aux musiques aventureuses et expérimentales.",
      "en": "Free avant-garde electronic festival founded in 2002 in Toulouse’s Compans-Caffarelli garden, dedicated to adventurous and experimental sound."
    }
  },
  {
    "id": "crossover-festival-nice",
    "nom": "Festival Crossover",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "nice-fr",
    "ville": {
      "fr": "Nice (Théâtre de Verdure & Le 109)",
      "en": "Nice (Théâtre de Verdure & Le 109)"
    },
    "latitude": 43.6956,
    "longitude": 7.2662,
    "capacite": 10000,
    "annee": 2009,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Bass"
    ],
    "site": "https://festival-crossover.com",
    "description": {
      "fr": "Rendez-vous électronique majeur de la Côte d’Azur à Nice, investissant le Théâtre de Verdure face à la mer et la friche industrielle du 109.",
      "en": "Leading electronic festival on the French Riviera in Nice, taking over the seafront Théâtre de Verdure and the industrial halls of Le 109."
    }
  },
  {
    "id": "made-festival-rennes",
    "nom": "MADE Festival",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "rennes-fr",
    "ville": {
      "fr": "Rennes",
      "en": "Rennes"
    },
    "latitude": 48.1128,
    "longitude": -1.6812,
    "capacite": 12000,
    "annee": 2018,
    "mois": {
      "fr": "Mai",
      "en": "May"
    },
    "styles": [
      "House",
      "Techno",
      "Acid",
      "Electro"
    ],
    "site": "https://made-festival.fr",
    "description": {
      "fr": "Festival rennais célébrant toutes les facettes de la house et de la techno à travers les parcs, les lieux patrimoniaux et les entrepôts de la capitale bretonne.",
      "en": "Rennes festival celebrating house and techno across parks, heritage sites and warehouses in the Breton capital."
    }
  },
  {
    "id": "maintenant-festival-rennes",
    "nom": "Festival Maintenant",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "rennes-fr",
    "ville": {
      "fr": "Rennes",
      "en": "Rennes"
    },
    "latitude": 48.1098,
    "longitude": -1.6765,
    "capacite": 15000,
    "annee": 2001,
    "mois": {
      "fr": "Octobre",
      "en": "October"
    },
    "styles": [
      "Electronica",
      "Ambient",
      "Experimental",
      "Techno"
    ],
    "site": "https://maintenant-festival.fr",
    "description": {
      "fr": "Festival d’arts numériques, de musiques électroniques et d’expérimentations audiovisuelles organisé chaque automne à Rennes depuis 2001.",
      "en": "Digital arts, electronic music and audiovisual experimentation festival held every autumn in Rennes since 2001."
    }
  },
  {
    "id": "longevity-festival-strasbourg",
    "nom": "Longevity Festival",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "strasbourg-fr",
    "ville": {
      "fr": "Strasbourg (Jardin des Deux Rives)",
      "en": "Strasbourg (Jardin des Deux Rives)"
    },
    "latitude": 48.5692,
    "longitude": 7.7984,
    "capacite": 8000,
    "annee": 2013,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "House",
      "Techno",
      "Minimal",
      "Electro"
    ],
    "site": "https://longevity-festival.com",
    "description": {
      "fr": "Festival électronique en plein air au Jardin des Deux Rives au bord du Rhin entre Strasbourg et Kehl, porté par la scène indépendante alsacienne.",
      "en": "Open-air electronic festival at Jardin des Deux Rives along the Rhine between Strasbourg and Kehl, driven by Alsace’s independent collectives."
    }
  },
  {
    "id": "lethargy-festival-zurich",
    "nom": "Lethargy Festival",
    "type": "festival",
    "paysCode": "CH",
    "villeSlug": "zurich-ch",
    "ville": {
      "fr": "Zurich (Rote Fabrik)",
      "en": "Zurich (Rote Fabrik)"
    },
    "latitude": 47.3432,
    "longitude": 8.5362,
    "capacite": 5000,
    "annee": 1995,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "Electronica",
      "Techno",
      "House",
      "Leftfield"
    ],
    "site": "https://lethargy.ch",
    "description": {
      "fr": "Festival historique des musiques électroniques aventureuses organisé depuis 1995 à la Rote Fabrik au bord du lac de Zurich.",
      "en": "Historic festival for adventurous electronic music held since 1995 at the lakeside Rote Fabrik cultural center in Zurich."
    }
  },
  {
    "id": "zurich-openair-electro",
    "nom": "Zürich Openair (Dance Circus & Tent)",
    "type": "festival",
    "paysCode": "CH",
    "villeSlug": "zurich-ch",
    "ville": {
      "fr": "Zurich (Glattbrugg / Rümlang)",
      "en": "Zurich (Glattbrugg / Rümlang)"
    },
    "latitude": 47.4412,
    "longitude": 8.5542,
    "capacite": 50000,
    "annee": 2010,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "Techno",
      "House",
      "Melodic Techno",
      "Electronica"
    ],
    "site": "https://zurichopenair.ch",
    "description": {
      "fr": "Grand festival de fin d’été aux portes de Zurich, célèbre pour ses scènes Dance Circus et ses nuits électroniques internationales.",
      "en": "Major late-summer festival on the edge of Zurich renowned for its Dance Circus arena and international electronic lineups."
    }
  },
  {
    "id": "arosa-electronica-suisse",
    "nom": "Arosa Electronica",
    "type": "festival",
    "paysCode": "CH",
    "ville": {
      "fr": "Arosa (Grisons)",
      "en": "Arosa (Graubünden)"
    },
    "latitude": 46.7779,
    "longitude": 9.6762,
    "capacite": 3000,
    "annee": 2014,
    "mois": {
      "fr": "Mars",
      "en": "March"
    },
    "styles": [
      "House",
      "Deep House",
      "Melodic Techno",
      "Tech House"
    ],
    "site": "https://arosaelectronica.com",
    "description": {
      "fr": "Semaine électronique alpine à plus de 1 800 mètres d’altitude dans les Grisons en Suisse, mêlant scènes d’altitude sur les pistes et clubs nocturnes.",
      "en": "Week-long alpine electronic festival at 1,800 meters in Graubünden, Switzerland, combining mountain-top day sessions and late-night club venues."
    }
  },
  {
    "id": "movement-torino-festival",
    "nom": "Movement Torino Music Festival",
    "type": "festival",
    "paysCode": "IT",
    "villeSlug": "turin-it",
    "ville": {
      "fr": "Turin (Lingotto)",
      "en": "Turin (Lingotto)"
    },
    "latitude": 45.0318,
    "longitude": 7.6652,
    "capacite": 15000,
    "annee": 2006,
    "mois": {
      "fr": "Octobre - Novembre",
      "en": "October - November"
    },
    "styles": [
      "Techno",
      "House",
      "Detroit Techno",
      "Tech House"
    ],
    "site": "https://movement.it",
    "description": {
      "fr": "Édition européenne officielle du festival Movement de Detroit lancée en 2006 dans les halles industrielles du Lingotto à Turin.",
      "en": "Official European sister event of Detroit’s Movement festival launched in 2006 inside Turin’s industrial Lingotto halls."
    }
  },
  {
    "id": "viva-festival-puglia",
    "nom": "VIVA! Festival",
    "type": "festival",
    "paysCode": "IT",
    "ville": {
      "fr": "Locorotondo (Vallée d’Itria, Pouilles)",
      "en": "Locorotondo (Itria Valley, Puglia)"
    },
    "latitude": 40.7532,
    "longitude": 17.3292,
    "capacite": 10000,
    "annee": 2017,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "Electronica",
      "House",
      "Leftfield",
      "Techno"
    ],
    "site": "https://vivafestival.it",
    "description": {
      "fr": "Festival électronique et contemporain niché entre les masserie blanches, les oliveraies et la côte adriatique de la Vallée d’Itria dans les Pouilles.",
      "en": "Electronic and contemporary music festival set among whitewashed masserie, olive groves and the Adriatic coast of Puglia’s Itria Valley."
    }
  },
  {
    "id": "dancity-festival-foligno",
    "nom": "Dancity Festival",
    "type": "festival",
    "paysCode": "IT",
    "ville": {
      "fr": "Foligno (Ombrie)",
      "en": "Foligno (Umbria)"
    },
    "latitude": 42.9558,
    "longitude": 12.7032,
    "capacite": 6000,
    "annee": 2006,
    "mois": {
      "fr": "Juillet & Décembre",
      "en": "July & December"
    },
    "styles": [
      "Experimental",
      "Techno",
      "Electronica",
      "Ambient"
    ],
    "site": "https://dancity.it",
    "description": {
      "fr": "Festival international de culture et de musique électronique fondé en 2006 au coeur de l’Ombrie, investissant palais historiques et caves médiévales.",
      "en": "International electronic music and culture festival founded in 2006 in Umbria, taking over historic palaces and medieval cellars."
    }
  },
  {
    "id": "jazz-re-found-piemont",
    "nom": "Jazz:Re:Found",
    "type": "festival",
    "paysCode": "IT",
    "villeSlug": "turin-it",
    "ville": {
      "fr": "Cella Monte (Montferrat, Piémont)",
      "en": "Cella Monte (Monferrato, Piedmont)"
    },
    "latitude": 45.0752,
    "longitude": 8.3924,
    "capacite": 6000,
    "annee": 2008,
    "mois": {
      "fr": "Août - Septembre",
      "en": "August - September"
    },
    "styles": [
      "House",
      "Broken Beat",
      "Nu Jazz",
      "Leftfield"
    ],
    "site": "https://jazzrefound.it",
    "description": {
      "fr": "Festival boutique dans les collines viticoles du Montferrat au Piémont, célébrant le dialogue entre culture club électronique, broken beat, house et jazz contemporain.",
      "en": "Boutique festival in the UNESCO wine hills of Monferrato in Piedmont bridging electronic club culture, broken beat, house and contemporary jazz."
    }
  },
  {
    "id": "robot-festival-bologne",
    "nom": "ROBOT Festival",
    "type": "festival",
    "paysCode": "IT",
    "villeSlug": "bologne-it",
    "ville": {
      "fr": "Bologne (DumBO & Palazzo Re Enzo)",
      "en": "Bologna (DumBO & Palazzo Re Enzo)"
    },
    "latitude": 44.5042,
    "longitude": 11.3268,
    "capacite": 8000,
    "annee": 2008,
    "mois": {
      "fr": "Octobre",
      "en": "October"
    },
    "styles": [
      "Experimental",
      "Techno",
      "Ambient",
      "IDM"
    ],
    "site": "https://robotfestival.it",
    "description": {
      "fr": "Festival international d’arts numériques et de musiques électroniques d’avant-garde organisé chaque automne à Bologne depuis 2008.",
      "en": "International digital arts and avant-garde electronic music festival held every autumn in Bologna since 2008."
    }
  },
  {
    "id": "spring-attitude-rome",
    "nom": "Spring Attitude Festival",
    "type": "festival",
    "paysCode": "IT",
    "villeSlug": "rome-it",
    "ville": {
      "fr": "Rome (Studios Cinecittà)",
      "en": "Rome (Cinecittà Studios)"
    },
    "latitude": 41.8518,
    "longitude": 12.5762,
    "capacite": 10000,
    "annee": 2009,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "Electronica",
      "House",
      "Techno",
      "Indie Dance"
    ],
    "site": "https://springattitude.it",
    "description": {
      "fr": "Grand rendez-vous romain des musiques électroniques et contemporaines, organisé dans les décors monumentaux des studios de cinéma Cinecittà.",
      "en": "Rome’s premier electronic and contemporary music festival staged across the monumental outdoor sets of Cinecittà Studios."
    }
  },
  {
    "id": "dgtl-barcelona",
    "nom": "DGTL Barcelona",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Parc del Fòrum)",
      "en": "Barcelona (Parc del Fòrum)"
    },
    "latitude": 41.4112,
    "longitude": 2.2264,
    "capacite": 30000,
    "annee": 2015,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "Techno",
      "House",
      "Minimal",
      "Electro"
    ],
    "site": "https://bcn.dgtl.nl",
    "description": {
      "fr": "Édition méditerranéenne du festival néerlandais DGTL sur l’esplanade maritime du Parc del Fòrum à Barcelone.",
      "en": "Mediterranean edition of the Dutch DGTL festival staged on the waterfront esplanade of Parc del Fòrum in Barcelona."
    }
  },
  {
    "id": "elrow-town-madrid",
    "nom": "elrow Town Madrid",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (IFEMA)",
      "en": "Madrid (IFEMA)"
    },
    "latitude": 40.4662,
    "longitude": -3.6168,
    "capacite": 35000,
    "annee": 2022,
    "mois": {
      "fr": "Avril - Mai",
      "en": "April - May"
    },
    "styles": [
      "Tech House",
      "House",
      "Techno",
      "Hard Techno"
    ],
    "site": "https://elrowtown.com",
    "description": {
      "fr": "Immense festival immersif et théâtral de la famille elrow à Madrid, réunissant neuf scènes monumentales de tech house et de techno.",
      "en": "Massive theatrical festival by the elrow family in Madrid uniting nine immersive stages of tech house and techno."
    }
  },
  {
    "id": "bilbao-bbk-live-basoa",
    "nom": "Bilbao BBK Live (Basoa & Lasai)",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "valence-es",
    "ville": {
      "fr": "Bilbao (Mont Cobetas, Pays Basque)",
      "en": "Bilbao (Kobetamendi, Basque Country)"
    },
    "latitude": 43.2586,
    "longitude": -2.9642,
    "capacite": 40000,
    "annee": 2006,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "House",
      "Leftfield",
      "Techno",
      "Downtempo"
    ],
    "site": "https://bilbaobbklive.com",
    "description": {
      "fr": "Festival perché sur le mont Cobetas au-dessus de Bilbao, célèbre dans toute l’Europe électronique pour sa clairière circulaire en forêt Basoa.",
      "en": "Mountain-top festival overlooking Bilbao, renowned across European club culture for its circular Basoa forest clearing and Lasai downtempo stage."
    }
  },
  {
    "id": "listen-festival-bruxelles",
    "nom": "Listen! Festival",
    "type": "festival",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles",
      "en": "Brussels"
    },
    "latitude": 50.8468,
    "longitude": 4.3524,
    "capacite": 12000,
    "annee": 2016,
    "mois": {
      "fr": "Mars - Avril",
      "en": "March - April"
    },
    "styles": [
      "Techno",
      "Leftfield",
      "House",
      "Bass"
    ],
    "site": "https://listenfestival.be",
    "description": {
      "fr": "Festival bruxellois de cinq jours célébrant toute la diversité de la scène électronique belge dans les clubs, tunnels et lieux patrimoniaux de la capitale.",
      "en": "Five-day citywide Brussels festival celebrating the diversity of Belgian electronic music across clubs, tunnels and heritage landmarks."
    }
  },
  {
    "id": "core-festival-bruxelles",
    "nom": "CORE Festival",
    "type": "festival",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Parc d’Osseghem)",
      "en": "Brussels (Osseghem Park)"
    },
    "latitude": 50.8952,
    "longitude": 4.3389,
    "capacite": 25000,
    "annee": 2022,
    "mois": {
      "fr": "Mai",
      "en": "May"
    },
    "styles": [
      "House",
      "Techno",
      "Electronica",
      "Indie Dance"
    ],
    "site": "https://corefestival.com",
    "description": {
      "fr": "Festival boutique en forêt au pied de l’Atomium dans le parc d’Osseghem à Bruxelles, coproduit par les équipes de Tomorrowland et de Rock Werchter.",
      "en": "Boutique forest festival at the foot of the Atomium in Brussels’ Osseghem Park, co-created by Tomorrowland and Rock Werchter."
    }
  },
  {
    "id": "ostend-beach-festival",
    "nom": "Ostend Beach Festival",
    "type": "festival",
    "paysCode": "BE",
    "ville": {
      "fr": "Ostende (Côte belge)",
      "en": "Ostend (Belgian Coast)"
    },
    "latitude": 51.2338,
    "longitude": 2.9124,
    "capacite": 20000,
    "annee": 2010,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "House",
      "Techno",
      "Tech House",
      "Hard Techno"
    ],
    "site": "https://ostendbeach.be",
    "description": {
      "fr": "Plus grand festival électronique de plage de la mer du Nord sur le sable d’Ostende en Belgique.",
      "en": "Largest North Sea beach electronic festival held directly on the sands of Ostend, Belgium."
    }
  },
  {
    "id": "rave-the-planet-berlin",
    "nom": "Rave The Planet Parade",
    "type": "festival",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Tiergarten)",
      "en": "Berlin (Tiergarten)"
    },
    "latitude": 52.5145,
    "longitude": 13.3501,
    "capacite": 200000,
    "annee": 2022,
    "mois": {
      "fr": "Juillet - Août",
      "en": "July - August"
    },
    "styles": [
      "Techno",
      "Trance",
      "House",
      "Acid"
    ],
    "site": "https://ravetheplanet.com",
    "description": {
      "fr": "Immense parade techno berlinoise lancée par Dr. Motte autour de la colonne de la Victoire au Tiergarten pour perpétuer l’esprit originel de la Love Parade.",
      "en": "Massive Berlin techno parade founded by Dr. Motte along the Tiergarten’s Straße des 17. Juni to carry forward the original spirit of the Love Parade."
    }
  },
  {
    "id": "love-family-park-francfort",
    "nom": "Love Family Park",
    "type": "festival",
    "paysCode": "DE",
    "villeSlug": "francfort-de",
    "ville": {
      "fr": "Francfort (Rebstockpark)",
      "en": "Frankfurt (Rebstockpark)"
    },
    "latitude": 50.1118,
    "longitude": 8.6042,
    "capacite": 20000,
    "annee": 1996,
    "mois": {
      "fr": "Juillet - Août",
      "en": "July - August"
    },
    "styles": [
      "Techno",
      "House",
      "Tech House",
      "Minimal"
    ],
    "site": "https://lovefamilypark.com",
    "description": {
      "fr": "L’un des plus anciens festivals techno et house en plein air d’Allemagne, fondé en 1996 dans la région de Francfort autour de Sven Väth.",
      "en": "One of Germany’s longest-running open-air techno and house festivals, founded in 1996 in the Frankfurt Rhine-Main region."
    }
  },
  {
    "id": "nibirii-festival-duren",
    "nom": "Nibirii Festival",
    "type": "festival",
    "paysCode": "DE",
    "villeSlug": "cologne-de",
    "ville": {
      "fr": "Düren (Rhénanie-du-Nord-Westphalie)",
      "en": "Düren (North Rhine-Westphalia)"
    },
    "latitude": 50.8242,
    "longitude": 6.4568,
    "capacite": 30000,
    "annee": 2019,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "Techno",
      "Drum & Bass",
      "Psy",
      "Hard Techno"
    ],
    "site": "https://nibirii.com",
    "description": {
      "fr": "Grand festival au bord du lac de Düren près de Cologne, réunissant sur trois jours techno, drum & bass et psytrance.",
      "en": "Three-day lakeside festival in Düren near Cologne uniting dedicated stages for techno, drum & bass and psytrance."
    }
  },
  {
    "id": "docklands-festival-munster",
    "nom": "Docklands Festival",
    "type": "festival",
    "paysCode": "DE",
    "ville": {
      "fr": "Münster",
      "en": "Münster"
    },
    "latitude": 51.9512,
    "longitude": 7.6486,
    "capacite": 15000,
    "annee": 2010,
    "mois": {
      "fr": "Juin",
      "en": "June"
    },
    "styles": [
      "House",
      "Techno",
      "Melodic Techno",
      "Disco"
    ],
    "site": "https://docklands-festival.de",
    "description": {
      "fr": "Festival électronique de jour et de nuit qui investit tout le port industriel de Münster et ses clubs environnants.",
      "en": "Day-and-night electronic festival taking over Münster’s industrial harbor and surrounding dockside clubs."
    }
  },
  {
    "id": "panama-open-air-bonn",
    "nom": "Panama Open Air Festival",
    "type": "festival",
    "paysCode": "DE",
    "villeSlug": "cologne-de",
    "ville": {
      "fr": "Bonn (Parc Rheinaue)",
      "en": "Bonn (Rheinaue Park)"
    },
    "latitude": 50.7112,
    "longitude": 7.1436,
    "capacite": 25000,
    "annee": 2011,
    "mois": {
      "fr": "Juin - Juillet",
      "en": "June - July"
    },
    "styles": [
      "Techno",
      "House",
      "Bass",
      "Melodic Techno"
    ],
    "site": "https://panamaopenair.com",
    "description": {
      "fr": "Festival électronique au coeur du parc arboré de la Rheinaue au bord du Rhin à Bonn.",
      "en": "Open-air electronic festival set inside the lush Rheinaue park along the Rhine in Bonn."
    }
  },
  {
    "id": "snowbombing-autriche",
    "nom": "Snowbombing",
    "type": "festival",
    "paysCode": "AT",
    "ville": {
      "fr": "Mayrhofen (Tyrol)",
      "en": "Mayrhofen (Tyrol)"
    },
    "latitude": 47.1667,
    "longitude": 11.8639,
    "capacite": 6000,
    "annee": 2000,
    "mois": {
      "fr": "Avril",
      "en": "April"
    },
    "styles": [
      "House",
      "Drum & Bass",
      "UK Garage",
      "Techno"
    ],
    "site": "https://snowbombing.com",
    "description": {
      "fr": "Festival électronique alpin légendaire organisé depuis 2000 à Mayrhofen dans le Tyrol autrichien, célèbre pour sa clairière en forêt et ses igloos d’altitude.",
      "en": "Legendary alpine electronic festival held since 2000 in Mayrhofen in the Austrian Tyrol, famed for its forest clearing stage and mountaintop igloo raves."
    }
  },
  {
    "id": "feq-electro-quebec",
    "nom": "FEQ Électro (Festival d’été de Québec)",
    "type": "festival",
    "paysCode": "CA",
    "villeSlug": "quebec-ca",
    "ville": {
      "fr": "Québec (Parc de la Francophonie & Manège Militaire)",
      "en": "Quebec City"
    },
    "latitude": 46.8058,
    "longitude": -71.2148,
    "capacite": 25000,
    "annee": 1968,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "Electro",
      "House",
      "Bass",
      "Techno"
    ],
    "site": "https://feq.ca",
    "description": {
      "fr": "Grandes soirées électroniques et après-spectacles au Manège Militaire du Festival d’été de Québec, rassemblant des dizaines de milliers de festivaliers sur la Grande Allée.",
      "en": "Massive outdoor electronic nights and late-night Manège Militaire sessions during the Festival d’été de Québec in the heart of Quebec City."
    }
  },
  {
    "id": "fme-nuits-electro-abitibi",
    "nom": "FME (Festival de Musique Émergente - Nuits Électro)",
    "type": "festival",
    "paysCode": "CA",
    "ville": {
      "fr": "Rouyn-Noranda (Abitibi-Témiscamingue, Québec)",
      "en": "Rouyn-Noranda (Quebec)"
    },
    "latitude": 48.2368,
    "longitude": -79.0228,
    "capacite": 5000,
    "annee": 2003,
    "mois": {
      "fr": "Août - Septembre",
      "en": "August - September"
    },
    "styles": [
      "Electro",
      "Techno",
      "Experimental",
      "House"
    ],
    "site": "https://fme-abitibi.com",
    "description": {
      "fr": "Rendez-vous incontournable de la fête du Travail à Rouyn-Noranda en Abitibi, célèbre pour ses nuits électroniques, ses spectacles surprises et ses expériences immersives.",
      "en": "Beloved Labour Day weekend festival in Rouyn-Noranda, Quebec, renowned for its late-night electronic showcases and immersive secret events."
    }
  },
  {
    "id": "scream-festival-edmonton",
    "nom": "Scream Festival",
    "type": "festival",
    "paysCode": "CA",
    "ville": {
      "fr": "Edmonton (Alberta)",
      "en": "Edmonton (Alberta)"
    },
    "latitude": 53.5412,
    "longitude": -113.4568,
    "capacite": 12000,
    "annee": 2008,
    "mois": {
      "fr": "Octobre",
      "en": "October"
    },
    "styles": [
      "Bass",
      "Trance",
      "House",
      "Hardstyle"
    ],
    "site": "https://screamfest.ca",
    "description": {
      "fr": "Plus grand festival électronique intérieur d’automne de l’Ouest canadien à l’Edmonton EXPO Centre en Alberta.",
      "en": "Western Canada’s largest autumn indoor electronic music festival at the Edmonton EXPO Centre in Alberta."
    }
  },
  {
    "id": "infrasound-festival-minnesota",
    "nom": "Infrasound Festival",
    "type": "festival",
    "paysCode": "US",
    "ville": {
      "fr": "Clarks Grove (Harmony Park, Minnesota)",
      "en": "Clarks Grove (Harmony Park, Minnesota)"
    },
    "latitude": 43.7442,
    "longitude": -93.3128,
    "capacite": 5000,
    "annee": 2012,
    "mois": {
      "fr": "Mai - Juin",
      "en": "May - June"
    },
    "styles": [
      "Dubstep",
      "Bass",
      "Drum & Bass",
      "Glitch Hop",
      "Halftime"
    ],
    "site": "https://infrasoundfestival.com",
    "description": {
      "fr": "Pèlerinage américain de la culture sound system, du dubstep profond et de la bass music sous les chênes centenaires du Harmony Park au Minnesota.",
      "en": "Revered American pilgrimage for deep dubstep, bass music and custom sound-system culture beneath the ancient oaks of Harmony Park in Minnesota."
    }
  },
  {
    "id": "the-untz-festival-californie",
    "nom": "The Untz Festival",
    "type": "festival",
    "paysCode": "US",
    "ville": {
      "fr": "Browns Valley (Californie du Nord)",
      "en": "Browns Valley (Northern California)"
    },
    "latitude": 39.2286,
    "longitude": -121.4124,
    "capacite": 3500,
    "annee": 2016,
    "mois": {
      "fr": "Mai - Juin",
      "en": "May - June"
    },
    "styles": [
      "Bass",
      "Dubstep",
      "Halftime",
      "Leftfield"
    ],
    "site": "https://theuntzfestival.com",
    "description": {
      "fr": "Festival souterrain californien dédié à la bass music expérimentale, au dubstep profond et aux systèmes sonores Funktion-One et Hennessey.",
      "en": "Northern California underground camping festival dedicated to experimental bass music, deep dubstep and custom sound systems."
    }
  },
  {
    "id": "submersion-festival-nj",
    "nom": "Submersion Festival",
    "type": "festival",
    "paysCode": "US",
    "ville": {
      "fr": "Hammonton (Paradise Lakes, New Jersey)",
      "en": "Hammonton (Paradise Lakes, New Jersey)"
    },
    "latitude": 39.6124,
    "longitude": -74.7482,
    "capacite": 3000,
    "annee": 2021,
    "mois": {
      "fr": "Octobre",
      "en": "October"
    },
    "styles": [
      "Drum & Bass",
      "Bass",
      "Dubstep",
      "UK Bass"
    ],
    "site": "https://submersionfestival.com",
    "description": {
      "fr": "Festival en forêt et au bord de l’eau au New Jersey, devenu une référence de la côte Est américaine pour la drum & bass et la bass music.",
      "en": "Lakeside forest festival in New Jersey that has become an East Coast benchmark for drum & bass and underground bass music."
    }
  },
  {
    "id": "gem-and-jam-festival-arizona",
    "nom": "Gem & Jam Festival",
    "type": "festival",
    "paysCode": "US",
    "ville": {
      "fr": "Tucson (Arizona)",
      "en": "Tucson (Arizona)"
    },
    "latitude": 32.1382,
    "longitude": -110.7792,
    "capacite": 10000,
    "annee": 2007,
    "mois": {
      "fr": "Février",
      "en": "February"
    },
    "styles": [
      "Bass",
      "Glitch Hop",
      "House",
      "Downtempo"
    ],
    "site": "https://gemandjamfestival.com",
    "description": {
      "fr": "Rassemblement artistique et électronique dans le désert de Sonora à Tucson en Arizona, organisé en parallèle de la plus grande bourse mondiale de minéraux.",
      "en": "Sonoran Desert electronic and visionary arts gathering in Tucson, Arizona held alongside the world’s largest gem and mineral show."
    }
  },
  {
    "id": "le-sucre-lyon",
    "nom": "Le Sucre",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon",
      "en": "Lyon"
    },
    "latitude": 45.7369,
    "longitude": 4.8152,
    "capacite": 800,
    "annee": 2013,
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Leftfield"
    ],
    "site": "https://le-sucre.eu",
    "description": {
      "fr": "Club perché sur le toit de La Sucrière dans le quartier de la Confluence à Lyon, fondé par l’équipe de Nuits Sonores (Arty Farty) avec terrasse panoramique sur la Saône.",
      "en": "Rooftop club atop La Sucrière in Lyon’s Confluence district, founded by the Nuits Sonores team (Arty Farty) with a panoramic terrace overlooking the Saône River."
    }
  },
  {
    "id": "le-petit-salon-lyon",
    "nom": "Le Petit Salon",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon",
      "en": "Lyon"
    },
    "latitude": 45.7361,
    "longitude": 4.8554,
    "capacite": 1000,
    "annee": 2014,
    "styles": [
      "Techno",
      "Acid Techno",
      "House",
      "Hard Techno"
    ],
    "site": "https://lpslyon.fr",
    "description": {
      "fr": "Grand club électronique lyonnais doté de deux salles complémentaires et d’une cour extérieure, réputé pour ses nuits techno, acid et house jusqu’au matin.",
      "en": "Major Lyon electronic club featuring two complementary rooms and an outdoor courtyard, renowned for its all-night techno, acid and house sessions."
    }
  },
  {
    "id": "azar-club-lyon",
    "nom": "Azar Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon",
      "en": "Lyon"
    },
    "latitude": 45.7378,
    "longitude": 4.8158,
    "capacite": 1200,
    "annee": 2019,
    "styles": [
      "Melodic Techno",
      "Tech House",
      "House",
      "Techno"
    ],
    "site": "https://azarclub.fr",
    "description": {
      "fr": "Vaste salle industrielle au bout de la presqu’île de la Confluence à Lyon, accueillant les têtes d’affiche internationales de la techno mélodique et de la house.",
      "en": "Large industrial hall at the tip of the Confluence peninsula in Lyon, hosting international melodic techno and house headliners."
    }
  },
  {
    "id": "cabaret-aleatoire-marseille",
    "nom": "Cabaret Aléatoire",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille",
      "en": "Marseille"
    },
    "latitude": 43.3106,
    "longitude": 5.3908,
    "capacite": 1200,
    "annee": 2002,
    "styles": [
      "Techno",
      "House",
      "Bass",
      "Electro"
    ],
    "site": "https://cabaret-aleatoire.com",
    "description": {
      "fr": "Institution des musiques électroniques à Marseille au coeur de la Friche la Belle de Mai, célèbre pour ses vendredis Club Cabaret et le festival Le Bon Air.",
      "en": "Cornerstone of electronic music in Marseille inside Friche la Belle de Mai, famed for its Friday Club Cabaret nights and the Le Bon Air festival."
    }
  },
  {
    "id": "baby-club-marseille",
    "nom": "Baby Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille",
      "en": "Marseille"
    },
    "latitude": 43.2932,
    "longitude": 5.3835,
    "capacite": 300,
    "annee": 2012,
    "styles": [
      "Techno",
      "Hard Techno",
      "Trance",
      "Acid"
    ],
    "site": "https://www.instagram.com/babyclubmarseille/",
    "description": {
      "fr": "Caveau souterrain intimiste et survolté près du Cours Julien à Marseille, repaire incontournable de la scène techno, acid et rave phocéenne.",
      "en": "Intimate underground cellar near Cours Julien in Marseille, a stronghold for the city’s techno, acid and rave collectives."
    }
  },
  {
    "id": "le-chapiteau-marseille",
    "nom": "Le Chapiteau",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille",
      "en": "Marseille"
    },
    "latitude": 43.3148,
    "longitude": 5.3891,
    "capacite": 1000,
    "annee": 2017,
    "styles": [
      "House",
      "Disco",
      "Techno",
      "Global Club"
    ],
    "site": "https://lechapiteau-marseille.fr",
    "description": {
      "fr": "Tiers-lieu festif et club en plein air sous chapiteau à la Belle de Mai à Marseille, prisé des collectifs house, techno et global club.",
      "en": "Open-air cultural space and big-top club in Marseille’s Belle de Mai neighborhood, favored by local house, techno and global club collectives."
    }
  },
  {
    "id": "iboat-bordeaux",
    "nom": "IBOAT",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "bordeaux-fr",
    "ville": {
      "fr": "Bordeaux",
      "en": "Bordeaux"
    },
    "latitude": 44.8657,
    "longitude": -0.5567,
    "capacite": 700,
    "annee": 2011,
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Disco"
    ],
    "site": "https://iboat.eu",
    "description": {
      "fr": "Ancien ferry transmanche amarré aux Bassins à flot de Bordeaux, dont la cale insonorisée est devenue la référence électronique de Nouvelle-Aquitaine.",
      "en": "Converted ferry moored at Bordeaux’s Bassins à flot, whose soundproofed hull has become the premier electronic club in southwestern France."
    }
  },
  {
    "id": "hangar-fl-bordeaux",
    "nom": "Hangar FL",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "bordeaux-fr",
    "ville": {
      "fr": "Bordeaux",
      "en": "Bordeaux"
    },
    "latitude": 44.8286,
    "longitude": -0.5472,
    "capacite": 1200,
    "annee": 2018,
    "styles": [
      "Hard Techno",
      "Techno",
      "Acid Techno",
      "Rave"
    ],
    "site": "https://www.instagram.com/hangar_fl/",
    "description": {
      "fr": "Entrepôt industriel brut de la rive droite à Bordeaux dédié aux nuits techno, hard techno et acid jusqu’au petit matin.",
      "en": "Raw industrial warehouse on Bordeaux’s right bank dedicated to all-night techno, hard techno and acid raves."
    }
  },
  {
    "id": "la-dame-bordeaux",
    "nom": "La Dame",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "bordeaux-fr",
    "ville": {
      "fr": "Bordeaux",
      "en": "Bordeaux"
    },
    "latitude": 44.8641,
    "longitude": -0.5582,
    "capacite": 400,
    "annee": 2014,
    "styles": [
      "House",
      "Deep House",
      "Minimal",
      "Disco"
    ],
    "site": "https://ladamebordeaux.com",
    "description": {
      "fr": "Péniche-club intimiste des Bassins à flot à Bordeaux, équipée d’un système Funktion-One taillé pour la house, la minimal et le disco.",
      "en": "Intimate boat club at Bordeaux’s Bassins à flot, outfitted with a Funktion-One sound system tuned for house, minimal and disco."
    }
  },
  {
    "id": "macadam-nantes",
    "nom": "Macadam",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "nantes-fr",
    "ville": {
      "fr": "Nantes",
      "en": "Nantes"
    },
    "latitude": 47.1965,
    "longitude": -1.5861,
    "capacite": 700,
    "annee": 2017,
    "styles": [
      "Techno",
      "House",
      "EBM",
      "Trance"
    ],
    "site": "https://www.instagram.com/macadam.nantes/",
    "description": {
      "fr": "Club industriel du Bas-Chantenay au bord de la Loire à Nantes, célèbre dans toute l’Europe pour ses matinales dominicales Gloria qui s’étirent tout l’après-midi.",
      "en": "Industrial club in Nantes’ Bas-Chantenay district along the Loire, renowned across Europe for its Sunday morning-to-evening Gloria marathons."
    }
  },
  {
    "id": "warehouse-nantes",
    "nom": "Warehouse",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "nantes-fr",
    "ville": {
      "fr": "Nantes",
      "en": "Nantes"
    },
    "latitude": 47.2003,
    "longitude": -1.5736,
    "capacite": 2500,
    "annee": 2017,
    "styles": [
      "Techno",
      "House",
      "Tech House",
      "Hard Techno"
    ],
    "site": "https://warehouse-nantes.fr",
    "description": {
      "fr": "Immense complexe électronique de deux salles installé au Hangar à Bananes sur l’Île de Nantes, accueillant les plus grandes tournées internationales.",
      "en": "Massive two-room electronic complex inside the Hangar à Bananes on Île de Nantes, hosting major international club tours."
    }
  },
  {
    "id": "co2-club-origin-nantes",
    "nom": "CO2 Club Origin",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "nantes-fr",
    "ville": {
      "fr": "Nantes",
      "en": "Nantes"
    },
    "latitude": 47.1972,
    "longitude": -1.5844,
    "capacite": 600,
    "annee": 2012,
    "styles": [
      "Techno",
      "Drum & Bass",
      "Psy",
      "Hardcore"
    ],
    "site": "https://www.instagram.com/co2cluborigin/",
    "description": {
      "fr": "Repaire underground historique du Bas-Chantenay à Nantes, soutenant les collectifs locaux de techno, drum & bass, psytrance et bass music.",
      "en": "Long-running underground venue in Nantes’ Bas-Chantenay district supporting local techno, drum & bass, psytrance and bass music collectives."
    }
  },
  {
    "id": "slalom-lille",
    "nom": "Slalom",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lille-fr",
    "ville": {
      "fr": "Lille",
      "en": "Lille"
    },
    "latitude": 50.6148,
    "longitude": 3.0652,
    "capacite": 750,
    "annee": 2022,
    "styles": [
      "Techno",
      "House",
      "Trance",
      "Electro"
    ],
    "site": "https://slalom-lille.com",
    "description": {
      "fr": "Fief électronique lillois doté d’une scénographie lumineuse immersive et d’une programmation mêlant techno, trance rapide, house et eurodance.",
      "en": "Lille’s flagship electronic club featuring immersive lighting design and a forward-thinking techno, fast trance and house curation."
    }
  },
  {
    "id": "le-magazine-club-lille",
    "nom": "Le Magazine Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lille-fr",
    "ville": {
      "fr": "Lille",
      "en": "Lille"
    },
    "latitude": 50.6238,
    "longitude": 3.0589,
    "capacite": 600,
    "annee": 2010,
    "styles": [
      "Techno",
      "House",
      "Acid",
      "Electro"
    ],
    "site": "https://lemagazineclub.com",
    "description": {
      "fr": "Club emblématique de la rue de Trévise à Lille qui a façonné toute une génération de producteurs et DJs techno et house des Hauts-de-France.",
      "en": "Landmark club on Rue de Trévise in Lille that shaped a generation of northern French techno and house DJs and producers."
    }
  },
  {
    "id": "garage-lille",
    "nom": "GARAGE",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lille-fr",
    "ville": {
      "fr": "Lille",
      "en": "Lille"
    },
    "latitude": 50.6321,
    "longitude": 3.0715,
    "capacite": 800,
    "annee": 2023,
    "styles": [
      "House",
      "Disco",
      "Tech House",
      "Electro"
    ],
    "site": "https://garage-lille.com",
    "description": {
      "fr": "Ancien garage Peugeot du boulevard Carnot à Lille reconverti en vaste espace culturel et club électronique.",
      "en": "Former car dealership on Boulevard Carnot in Lille transformed into a cultural hub and electronic dance venue."
    }
  },
  {
    "id": "l-ubu-rennes",
    "nom": "L’Ubu",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "rennes-fr",
    "ville": {
      "fr": "Rennes",
      "en": "Rennes"
    },
    "latitude": 48.1072,
    "longitude": -1.6742,
    "capacite": 450,
    "annee": 1987,
    "styles": [
      "Electro",
      "Techno",
      "House",
      "Bass"
    ],
    "site": "https://ubu-rennes.com",
    "description": {
      "fr": "Salle mythique gérée par l’Association Trans Musicales à Rennes, tremplin historique de la scène électronique bretonne depuis 1987.",
      "en": "Legendary venue run by the Trans Musicales association in Rennes, a historic springboard for Brittany’s electronic music scene since 1987."
    }
  },
  {
    "id": "1988-live-club-rennes",
    "nom": "1988 Live Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "rennes-fr",
    "ville": {
      "fr": "Rennes",
      "en": "Rennes"
    },
    "latitude": 48.1059,
    "longitude": -1.6788,
    "capacite": 900,
    "annee": 2015,
    "styles": [
      "Techno",
      "House",
      "Drum & Bass",
      "Hard Techno"
    ],
    "site": "https://1988liveclub.com",
    "description": {
      "fr": "Complexe nocturne de trois salles place du Colombier à Rennes, accueillant chaque fin de semaine les collectifs techno, house et bass bretons.",
      "en": "Three-room nightclub on Place du Colombier in Rennes hosting Brittany’s techno, house and bass collectives every weekend."
    }
  },
  {
    "id": "l-antipode-rennes",
    "nom": "Antipode",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "rennes-fr",
    "ville": {
      "fr": "Rennes",
      "en": "Rennes"
    },
    "latitude": 48.0985,
    "longitude": -1.6994,
    "capacite": 800,
    "annee": 1998,
    "styles": [
      "Electronica",
      "Techno",
      "Experimental",
      "Bass"
    ],
    "site": "https://antipode-rennes.fr",
    "description": {
      "fr": "Scène de musiques actuelles du quartier de la Courrouze à Rennes, pilier des nuits Maintenant, Texture et Astropolis délocalisé.",
      "en": "Contemporary music venue in Rennes’ Courrouze district, a pillar for Maintenant festival nights and electronic showcases."
    }
  },
  {
    "id": "kalt-strasbourg",
    "nom": "KALT",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "strasbourg-fr",
    "ville": {
      "fr": "Strasbourg",
      "en": "Strasbourg"
    },
    "latitude": 48.5562,
    "longitude": 7.7968,
    "capacite": 600,
    "annee": 2018,
    "styles": [
      "Techno",
      "Minimal",
      "Electro",
      "Deep House"
    ],
    "site": "https://kalt.club",
    "description": {
      "fr": "Bunker brutaliste à l’acoustique chirurgicale et à la politique sans photo, considéré comme l’un des clubs techno et house les plus pointus d’Europe rhénane.",
      "en": "Brutalist bunker with surgical acoustics and a strict no-photo policy, regarded as one of the sharpest techno and house clubs in the Upper Rhine."
    }
  },
  {
    "id": "la-laiterie-strasbourg",
    "nom": "La Laiterie",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "strasbourg-fr",
    "ville": {
      "fr": "Strasbourg",
      "en": "Strasbourg"
    },
    "latitude": 48.5758,
    "longitude": 7.7289,
    "capacite": 900,
    "annee": 1994,
    "styles": [
      "Techno",
      "Electro",
      "Drum & Bass",
      "Industrial"
    ],
    "site": "https://artefact.org",
    "description": {
      "fr": "Ancienne laiterie centrale de Strasbourg transformée en haut lieu des musiques électroniques et des nuits Ososphère.",
      "en": "Former central dairy in Strasbourg converted into a flagship venue for electronic music and Ososphère nights."
    }
  },
  {
    "id": "studio-saglio-strasbourg",
    "nom": "Studio Saglio",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "strasbourg-fr",
    "ville": {
      "fr": "Strasbourg",
      "en": "Strasbourg"
    },
    "latitude": 48.5482,
    "longitude": 7.7396,
    "capacite": 600,
    "annee": 2005,
    "styles": [
      "Techno",
      "Hard Techno",
      "Drum & Bass",
      "Trance"
    ],
    "site": "https://studiosaglio.com",
    "description": {
      "fr": "Entrepôt de la zone industrielle de la Meinau à Strasbourg dédié aux raves techno, hard techno et drum & bass.",
      "en": "Industrial warehouse in Strasbourg’s Meinau district dedicated to techno, hard techno and drum & bass raves."
    }
  },
  {
    "id": "le-109-frigo-16-nice",
    "nom": "Le 109 (Frigo 16)",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "nice-fr",
    "ville": {
      "fr": "Nice",
      "en": "Nice"
    },
    "latitude": 43.7192,
    "longitude": 7.2886,
    "capacite": 800,
    "annee": 2017,
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Disco"
    ],
    "site": "https://le109.nice.fr",
    "description": {
      "fr": "Anciens abattoirs municipaux de Nice reconvertis en pôle culturel, accueillant le festival Crossover et les grandes nuits électroniques azuréennes.",
      "en": "Former municipal slaughterhouses in Nice converted into a cultural hub hosting the Crossover festival and major French Riviera electronic nights."
    }
  },
  {
    "id": "stockfish-nice",
    "nom": "Stockfish",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "nice-fr",
    "ville": {
      "fr": "Nice",
      "en": "Nice"
    },
    "latitude": 43.7168,
    "longitude": 7.2831,
    "capacite": 700,
    "annee": 2022,
    "styles": [
      "House",
      "Electro",
      "Tech House",
      "Techno"
    ],
    "site": "https://stockfish.nice.fr",
    "description": {
      "fr": "Salle modulable de nouvelle génération dans l’est niçois dotée d’une diffusion sonore et visuelle immersive.",
      "en": "Next-generation modular venue in eastern Nice equipped with immersive sound and projection systems."
    }
  },
  {
    "id": "high-club-nice",
    "nom": "High Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "nice-fr",
    "ville": {
      "fr": "Nice",
      "en": "Nice"
    },
    "latitude": 43.6948,
    "longitude": 7.2572,
    "capacite": 1200,
    "annee": 2006,
    "styles": [
      "House",
      "Tech House",
      "Dance",
      "Progressive House"
    ],
    "site": "https://highclub.fr",
    "description": {
      "fr": "Grand club de la Promenade des Anglais face à la Méditerranée à Nice, accueillant DJs internationaux sur trois espaces.",
      "en": "Large seafront club on Nice’s Promenade des Anglais overlooking the Mediterranean, hosting international DJs across three rooms."
    }
  },
  {
    "id": "motel-campo-geneve",
    "nom": "Motel Campo",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "geneve-ch",
    "ville": {
      "fr": "Genève",
      "en": "Geneva"
    },
    "latitude": 46.1828,
    "longitude": 6.1274,
    "capacite": 600,
    "annee": 2013,
    "styles": [
      "Techno",
      "House",
      "Minimal",
      "Electro"
    ],
    "site": "https://motelcampo.ch",
    "description": {
      "fr": "Centre d’art et club électronique majeur de la route des Jeunes à Genève, réputé pour ses nuits prolongées et sa programmation internationale exigeante.",
      "en": "Art space and premier electronic club on Route des Jeunes in Geneva, renowned for its extended weekend marathons and discerning international bookings."
    }
  },
  {
    "id": "audio-club-geneve",
    "nom": "Audio Club",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "geneve-ch",
    "ville": {
      "fr": "Genève",
      "en": "Geneva"
    },
    "latitude": 46.2008,
    "longitude": 6.1289,
    "capacite": 600,
    "annee": 2014,
    "styles": [
      "House",
      "Techno",
      "Melodic Techno",
      "Disco"
    ],
    "site": "https://audio-club.ch",
    "description": {
      "fr": "Club audiophile du quartier de la Jonction à Genève, construit autour d’une acoustique boisée sur mesure et d’un système Funktion-One.",
      "en": "Audiophile club in Geneva’s Jonction district built around custom timber acoustics and a tuned Funktion-One sound system."
    }
  },
  {
    "id": "la-graviere-geneve",
    "nom": "La Gravière",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "geneve-ch",
    "ville": {
      "fr": "Genève",
      "en": "Geneva"
    },
    "latitude": 46.1924,
    "longitude": 6.1268,
    "capacite": 350,
    "annee": 2012,
    "styles": [
      "Techno",
      "Bass",
      "UK Bass",
      "House"
    ],
    "site": "https://lagraviere.ch",
    "description": {
      "fr": "Ancien entrepôt d’armement au bord de l’Arve à Genève devenu un club alternatif majeur pour la techno, la bass music et les musiques hybrides.",
      "en": "Former munitions depot along the Arve River in Geneva turned into a key underground club for techno, bass music and hybrid club sounds."
    }
  },
  {
    "id": "le-zoo-usine-geneve",
    "nom": "Le Zoo (L’Usine)",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "geneve-ch",
    "ville": {
      "fr": "Genève",
      "en": "Geneva"
    },
    "latitude": 46.2039,
    "longitude": 6.1361,
    "capacite": 450,
    "annee": 1989,
    "styles": [
      "Drum & Bass",
      "Techno",
      "Industrial",
      "Bass"
    ],
    "site": "https://lezoo.ch",
    "description": {
      "fr": "Club autogéré au premier étage du centre culturel L’Usine à Genève depuis 1989, bastion historique de la drum & bass, de la techno et des contre-cultures.",
      "en": "Self-managed club on the upper floor of Geneva’s L’Usine cultural center since 1989, a historic bastion for drum & bass, techno and counterculture."
    }
  },
  {
    "id": "d-club-lausanne",
    "nom": "D! Club",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "lausanne-ch",
    "ville": {
      "fr": "Lausanne",
      "en": "Lausanne"
    },
    "latitude": 46.5214,
    "longitude": 6.6329,
    "capacite": 900,
    "annee": 1996,
    "styles": [
      "House",
      "Techno",
      "Melodic Techno",
      "Tech House"
    ],
    "site": "https://dclub.ch",
    "description": {
      "fr": "Ancien cinéma ABC de la place Centrale à Lausanne reconverti en temple électronique romand dès 1996.",
      "en": "Former ABC cinema on Place Centrale in Lausanne transformed into a flagship French-speaking Swiss electronic club in 1996."
    }
  },
  {
    "id": "folklor-lausanne",
    "nom": "Folklor",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "lausanne-ch",
    "ville": {
      "fr": "Lausanne",
      "en": "Lausanne"
    },
    "latitude": 46.5236,
    "longitude": 6.6332,
    "capacite": 300,
    "annee": 2016,
    "styles": [
      "Techno",
      "House",
      "Minimal",
      "Electro"
    ],
    "site": "https://folklor-club.ch",
    "description": {
      "fr": "Club souterrain sous la place de la Riponne à Lausanne, prisé pour son intimité brute et ses sélections house, minimal et techno.",
      "en": "Underground club beneath Place de la Riponne in Lausanne, prized for its raw intimacy and house, minimal and techno selections."
    }
  },
  {
    "id": "le-romandie-lausanne",
    "nom": "Le Romandie",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "lausanne-ch",
    "ville": {
      "fr": "Lausanne",
      "en": "Lausanne"
    },
    "latitude": 46.5211,
    "longitude": 6.6305,
    "capacite": 250,
    "annee": 2004,
    "styles": [
      "Electro",
      "Techno",
      "Industrial",
      "Experimental"
    ],
    "site": "https://leromandie.ch",
    "description": {
      "fr": "Salle voûtée logée sous les arches en pierre du Grand-Pont à Lausanne, dédiée aux musiques indépendantes et aux nuits électroniques.",
      "en": "Vaulted venue tucked beneath the stone arches of Lausanne’s Grand-Pont bridge, dedicated to independent and experimental electronic nights."
    }
  },
  {
    "id": "zukunft-zurich",
    "nom": "Zukunft",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "zurich-ch",
    "ville": {
      "fr": "Zurich",
      "en": "Zurich"
    },
    "latitude": 47.3768,
    "longitude": 8.5269,
    "capacite": 250,
    "annee": 2005,
    "styles": [
      "House",
      "Techno",
      "Disco",
      "Leftfield"
    ],
    "site": "https://zukunft.cl",
    "description": {
      "fr": "Sous-sol audiophile mythique de la Dienerstrasse dans le Kreis 4 à Zurich, cofondé par Kalabrese et Alex Dallas.",
      "en": "Mythic audiophile basement on Dienerstrasse in Zurich’s Kreis 4 district, co-founded by Kalabrese and Alex Dallas."
    }
  },
  {
    "id": "hive-zurich",
    "nom": "Hive",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "zurich-ch",
    "ville": {
      "fr": "Zurich",
      "en": "Zurich"
    },
    "latitude": 47.3854,
    "longitude": 8.5186,
    "capacite": 1000,
    "annee": 2006,
    "styles": [
      "Tech House",
      "Melodic Techno",
      "House",
      "Techno"
    ],
    "site": "https://hiveclub.ch",
    "description": {
      "fr": "Institution nocturne de la Geroldstrasse dans le quartier industriel de Zurich-West, célèbre pour ses week-ends marathons.",
      "en": "Nightlife institution on Geroldstrasse in Zurich-West’s industrial quarter, famous for its marathon weekend sessions."
    }
  },
  {
    "id": "supermarket-zurich",
    "nom": "Supermarket",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "zurich-ch",
    "ville": {
      "fr": "Zurich",
      "en": "Zurich"
    },
    "latitude": 47.3861,
    "longitude": 8.5192,
    "capacite": 600,
    "annee": 1998,
    "styles": [
      "House",
      "Techno",
      "Minimal",
      "Melodic Techno"
    ],
    "site": "https://supermarket.li",
    "description": {
      "fr": "Pionnier du renouveau électronique de Zurich-West depuis 1998, installé dans un ancien garage industriel.",
      "en": "Pioneer of Zurich-West’s electronic clubbing renaissance since 1998, housed inside a former industrial garage."
    }
  },
  {
    "id": "elysia-bale",
    "nom": "Elysia",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "bale-ch",
    "ville": {
      "fr": "Bâle",
      "en": "Basel"
    },
    "latitude": 47.5359,
    "longitude": 7.6094,
    "capacite": 500,
    "annee": 2016,
    "styles": [
      "Techno",
      "House",
      "Deep Techno",
      "Minimal"
    ],
    "site": "https://elysia.ch",
    "description": {
      "fr": "Club bâlois conçu par des acousticiens avec plancher flottant sur ressorts et système quadriphonique Lambda Labs QX-3 sur mesure.",
      "en": "Basel club engineered with a spring-mounted floating dancefloor and a custom quadraphonic Lambda Labs QX-3 sound system."
    }
  },
  {
    "id": "nordstern-bale",
    "nom": "Nordstern",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "bale-ch",
    "ville": {
      "fr": "Bâle",
      "en": "Basel"
    },
    "latitude": 47.5738,
    "longitude": 7.5892,
    "capacite": 700,
    "annee": 2001,
    "styles": [
      "Techno",
      "House",
      "Melodic Techno",
      "Tech House"
    ],
    "site": "https://nordstern.com",
    "description": {
      "fr": "Célèbre club électronique bâlois logé dans les entrailles d’un navire fluvial amarré sur le Rhin aux Trois Frontières.",
      "en": "Renowned Basel electronic club housed inside the hull of a river ship moored on the Rhine near the Three Countries Bridge."
    }
  },
  {
    "id": "kaschemme-bale",
    "nom": "Kaschemme",
    "type": "club",
    "paysCode": "CH",
    "villeSlug": "bale-ch",
    "ville": {
      "fr": "Bâle",
      "en": "Basel"
    },
    "latitude": 47.5422,
    "longitude": 7.6142,
    "capacite": 250,
    "annee": 2013,
    "styles": [
      "House",
      "Breaks",
      "Techno",
      "Leftfield"
    ],
    "site": "https://kaschemme.ch",
    "description": {
      "fr": "Club intimiste du quartier industriel de Dreispitz à Bâle, apprécié pour sa chaleur brute et ses sélections vinyles éclectiques.",
      "en": "Intimate club in Basel’s Dreispitz industrial district prized for its warm underground vibe and eclectic vinyl selections."
    }
  },
  {
    "id": "tempio-del-futuro-perduto-milan",
    "nom": "Tempio del Futuro Perduto",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "milan-it",
    "ville": {
      "fr": "Milan",
      "en": "Milan"
    },
    "latitude": 45.4852,
    "longitude": 9.1774,
    "capacite": 1200,
    "annee": 2018,
    "styles": [
      "Techno",
      "Hard Techno",
      "Industrial",
      "Experimental"
    ],
    "site": "https://tempiodelfuturoperduto.art",
    "description": {
      "fr": "Centre culturel multidisciplinaire et bastion techno indépendant installé dans d’anciens entrepôts ferroviaires près du Monumentale à Milan.",
      "en": "Multidisciplinary arts center and independent techno stronghold housed in former railway warehouses near Monumentale in Milan."
    }
  },
  {
    "id": "masada-milan",
    "nom": "Masada",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "milan-it",
    "ville": {
      "fr": "Milan",
      "en": "Milan"
    },
    "latitude": 45.4994,
    "longitude": 9.1462,
    "capacite": 350,
    "annee": 2011,
    "styles": [
      "Techno",
      "Minimal",
      "House",
      "Electro"
    ],
    "site": "https://www.instagram.com/masada_milano/",
    "description": {
      "fr": "Cercle culturel souterrain de Milan célèbre pour ses longs après-midis et soirées dédiés à la techno hypnotique, à la minimal et aux vinyles.",
      "en": "Underground cultural club in Milan famous for its extended daytime-to-night sessions dedicated to hypnotic techno, minimal and vinyl culture."
    }
  },
  {
    "id": "tunnel-club-milan",
    "nom": "Tunnel Club",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "milan-it",
    "ville": {
      "fr": "Milan",
      "en": "Milan"
    },
    "latitude": 45.4911,
    "longitude": 9.2089,
    "capacite": 600,
    "annee": 1995,
    "styles": [
      "House",
      "Techno",
      "Electro",
      "Bass"
    ],
    "site": "https://tunnelclub.it",
    "description": {
      "fr": "Voûte ferroviaire historique sous les voies de la gare centrale de Milan, pilier des nuits électroniques lombardes depuis 1995.",
      "en": "Historic brick railway arch beneath Milan Central Station’s tracks, a pillar of Lombardy’s electronic nightlife since 1995."
    }
  },
  {
    "id": "audiodrome-turin",
    "nom": "Audiodrome Live Club",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "turin-it",
    "ville": {
      "fr": "Turin",
      "en": "Turin"
    },
    "latitude": 44.9922,
    "longitude": 7.6695,
    "capacite": 1200,
    "annee": 2012,
    "styles": [
      "Techno",
      "Hard Techno",
      "Tech House",
      "House"
    ],
    "site": "https://audiodrome.it",
    "description": {
      "fr": "Ancienne usine industrielle aux portes de Turin convertie en cathédrale de la techno et de la tech house piémontaise.",
      "en": "Former industrial factory on the outskirts of Turin converted into Piedmont’s premier techno and tech house arena."
    }
  },
  {
    "id": "azimut-club-turin",
    "nom": "Azimut Club",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "turin-it",
    "ville": {
      "fr": "Turin",
      "en": "Turin"
    },
    "latitude": 45.0836,
    "longitude": 7.6974,
    "capacite": 600,
    "annee": 1986,
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Acid"
    ],
    "site": "https://azimutclub.it",
    "description": {
      "fr": "Club historique fondé en 1986 Via Modena à Turin, berceau de la culture acid house et techno dans le nord de l’Italie.",
      "en": "Historic club founded in 1986 on Via Modena in Turin, a cradle of acid house and techno culture in northern Italy."
    }
  },
  {
    "id": "bunker-turin",
    "nom": "Bunker",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "turin-it",
    "ville": {
      "fr": "Turin",
      "en": "Turin"
    },
    "latitude": 45.0958,
    "longitude": 7.7028,
    "capacite": 1000,
    "annee": 2012,
    "styles": [
      "Techno",
      "Experimental",
      "Electro",
      "Bass"
    ],
    "site": "https://variantebunker.com",
    "description": {
      "fr": "Espace industriel régénéré dans le quartier Barriera di Milano à Turin, accueillant raves, vitrines C2C et soirées électroniques en plein air.",
      "en": "Regenerated industrial compound in Turin’s Barriera di Milano district hosting raves, C2C showcases and open-air electronic events."
    }
  },
  {
    "id": "goa-club-rome",
    "nom": "Goa Club",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "rome-it",
    "ville": {
      "fr": "Rome",
      "en": "Rome"
    },
    "latitude": 41.8669,
    "longitude": 12.4782,
    "capacite": 500,
    "annee": 1996,
    "styles": [
      "Techno",
      "House",
      "Minimal",
      "Electro"
    ],
    "site": "https://goaclub.com",
    "description": {
      "fr": "Joyau audiophile de la Via Libetta dans le quartier d’Ostiense à Rome, célèbre depuis 1996 pour son acoustique irréprochable et son décor intimiste.",
      "en": "Audiophile gem on Via Libetta in Rome’s Ostiense district, celebrated since 1996 for its pristine sound system and intimate atmosphere."
    }
  },
  {
    "id": "spazio-900-rome",
    "nom": "Spazio 900",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "rome-it",
    "ville": {
      "fr": "Rome",
      "en": "Rome"
    },
    "latitude": 41.8339,
    "longitude": 12.4708,
    "capacite": 1500,
    "annee": 1999,
    "styles": [
      "Techno",
      "Melodic Techno",
      "Tech House",
      "House"
    ],
    "site": "https://spazio900.it",
    "description": {
      "fr": "Vaste salle monumentale du Palais de l’Art Ancien dans le quartier EUR à Rome, dotée de grandes terrasses et accueillant les géants de la techno mondiale.",
      "en": "Monumental venue inside the Palazzo dell’Arte Antica in Rome’s EUR district, featuring expansive terraces and hosting global techno headliners."
    }
  },
  {
    "id": "rashomon-club-rome",
    "nom": "Rashõmon Club",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "rome-it",
    "ville": {
      "fr": "Rome",
      "en": "Rome"
    },
    "latitude": 41.8676,
    "longitude": 12.4815,
    "capacite": 600,
    "annee": 2006,
    "styles": [
      "Techno",
      "Bass",
      "Electro",
      "Drum & Bass"
    ],
    "site": "https://rashomonclub.com",
    "description": {
      "fr": "Repaire nocturne de la Via degli Argonauti à Rome, croisant techno, bass music, drum & bass et arts visuels.",
      "en": "Underground hub on Via degli Argonauti in Rome bridging techno, bass music, drum & bass and visual arts."
    }
  },
  {
    "id": "cocorico-riccione",
    "nom": "Cocoricò",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "bologne-it",
    "ville": {
      "fr": "Riccione (Riviera Romagnole)",
      "en": "Riccione (Romagna Riviera)"
    },
    "latitude": 43.9912,
    "longitude": 12.6486,
    "capacite": 3500,
    "annee": 1989,
    "styles": [
      "Techno",
      "House",
      "Hard Techno",
      "Trance"
    ],
    "site": "https://cocorico.it",
    "description": {
      "fr": "Monument de l’histoire du clubbing européen ouvert en 1989 sur les collines de Riccione, reconnaissable à son immense pyramide de verre Titilla et Piramide.",
      "en": "Monument of European clubbing history opened in 1989 on the hills of Riccione, unmistakable for its giant glass pyramid."
    }
  },
  {
    "id": "link-bologne",
    "nom": "LINK",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "bologne-it",
    "ville": {
      "fr": "Bologne",
      "en": "Bologna"
    },
    "latitude": 44.5138,
    "longitude": 11.4012,
    "capacite": 1200,
    "annee": 1994,
    "styles": [
      "Techno",
      "Drum & Bass",
      "Experimental",
      "Electro"
    ],
    "site": "https://link.bo.it",
    "description": {
      "fr": "Laboratoire culturel et club autogéré fondé en 1994 à Bologne, bastion historique de la drum & bass, de la techno et des arts électroniques en Italie.",
      "en": "Self-managed cultural laboratory and club founded in 1994 in Bologna, a historic stronghold for drum & bass, techno and electronic arts in Italy."
    }
  },
  {
    "id": "cassero-bologne",
    "nom": "Cassero",
    "type": "club",
    "paysCode": "IT",
    "villeSlug": "bologne-it",
    "ville": {
      "fr": "Bologne",
      "en": "Bologna"
    },
    "latitude": 44.5028,
    "longitude": 11.3358,
    "capacite": 700,
    "annee": 1982,
    "styles": [
      "House",
      "Disco",
      "Techno",
      "Electro"
    ],
    "site": "https://cassero.it",
    "description": {
      "fr": "Ancien entrepôt de sel du XVIIIe siècle (Salara) à Bologne abritant l’un des centres et clubs queer et électroniques les plus emblématiques d’Italie.",
      "en": "Eighteenth-century salt warehouse (Salara) in Bologna housing one of Italy’s most iconic queer and electronic music clubs."
    }
  },
  {
    "id": "fabrik-madrid",
    "nom": "Fabrik",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Humanes)",
      "en": "Madrid (Humanes)"
    },
    "latitude": 40.2647,
    "longitude": -3.8406,
    "capacite": 4000,
    "annee": 2003,
    "styles": [
      "Techno",
      "Hard Techno",
      "Tech House",
      "House"
    ],
    "site": "https://fabrik.es",
    "description": {
      "fr": "Mégaclub madrilène de cinq salles équipé de systèmes sonores monumentaux, célèbre dans le monde entier pour ses résidences techno CODE et elrow.",
      "en": "Five-room Madrid superclub with monumental sound systems, world-famous for its CODE techno marathons and elrow residencies."
    }
  },
  {
    "id": "mondo-disko-madrid",
    "nom": "Mondo Disko",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid",
      "en": "Madrid"
    },
    "latitude": 40.4192,
    "longitude": -3.6985,
    "capacite": 900,
    "annee": 2000,
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Melodic Techno"
    ],
    "site": "https://mondodisko.es",
    "description": {
      "fr": "Institution électronique du plein centre de Madrid (Calle de Alcalá) qui programme les meilleurs artistes techno et house mondiaux les jeudis et samedis depuis 2000.",
      "en": "Central Madrid electronic institution on Calle de Alcalá booking premier global techno and house artists every Thursday and Saturday since 2000."
    }
  },
  {
    "id": "lula-club-madrid",
    "nom": "Lula Club",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid",
      "en": "Madrid"
    },
    "latitude": 40.4218,
    "longitude": -3.7082,
    "capacite": 700,
    "annee": 2021,
    "styles": [
      "House",
      "Disco",
      "Indie Dance",
      "Tech House"
    ],
    "site": "https://lula.club",
    "description": {
      "fr": "Club feutré sur la Gran Vía de Madrid inspiré des clubs new-yorkais, dédié à la house, au disco et à l’indie dance.",
      "en": "Velvet-draped club on Madrid’s Gran Vía inspired by classic New York clubs, dedicated to house, disco and indie dance."
    }
  },
  {
    "id": "dc10-ibiza",
    "nom": "DC-10",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "ibiza-es",
    "ville": {
      "fr": "Ibiza",
      "en": "Ibiza"
    },
    "latitude": 38.8768,
    "longitude": 1.3892,
    "capacite": 1500,
    "annee": 1999,
    "styles": [
      "Techno",
      "House",
      "Tech House",
      "Minimal"
    ],
    "site": "https://dc10ibiza.com",
    "description": {
      "fr": "Ancien hangar d’aviation en bout de piste sur la route des salines d’Ibiza, berceau mythique des lundis Circoloco depuis 1999.",
      "en": "Former aircraft hangar at the end of the runway on Ibiza’s salt flats road, the legendary home of Circoloco Mondays since 1999."
    }
  },
  {
    "id": "amnesia-ibiza",
    "nom": "Amnesia",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "ibiza-es",
    "ville": {
      "fr": "Ibiza",
      "en": "Ibiza"
    },
    "latitude": 38.9478,
    "longitude": 1.4072,
    "capacite": 5000,
    "annee": 1976,
    "styles": [
      "Techno",
      "Tech House",
      "House",
      "Trance"
    ],
    "site": "https://amnesia.es",
    "description": {
      "fr": "Club historique fondé en 1976 à San Rafael où est né le son baléarique, célèbre pour sa Terrace baignée de lumière au lever du jour et sa Main Room.",
      "en": "Historic club founded in 1976 in San Rafael where the Balearic sound was born, famous for its sunlit Terrace at dawn and cavernous Main Room."
    }
  },
  {
    "id": "pacha-ibiza",
    "nom": "Pacha Ibiza",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "ibiza-es",
    "ville": {
      "fr": "Ibiza",
      "en": "Ibiza"
    },
    "latitude": 38.9182,
    "longitude": 1.4436,
    "capacite": 3000,
    "annee": 1973,
    "styles": [
      "House",
      "Melodic Techno",
      "Tech House",
      "Disco"
    ],
    "site": "https://pacha.com",
    "description": {
      "fr": "Finca blanche originelle ouverte en 1973 aux deux cerises emblématiques, berceau des grandes résidences house et techno mélodique d’Ibiza.",
      "en": "Original whitewashed finca opened in 1973 with the iconic twin cherries logo, home to Ibiza’s landmark house and melodic techno residencies."
    }
  },
  {
    "id": "hi-ibiza",
    "nom": "Hï Ibiza",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "ibiza-es",
    "ville": {
      "fr": "Ibiza (Playa d’en Bossa)",
      "en": "Ibiza (Playa d’en Bossa)"
    },
    "latitude": 38.8856,
    "longitude": 1.4038,
    "capacite": 5000,
    "annee": 2017,
    "styles": [
      "Tech House",
      "Melodic Techno",
      "House",
      "Afro House"
    ],
    "site": "https://hiibiza.com",
    "description": {
      "fr": "Superclub ultramoderne de Playa d’en Bossa construit sur le site de l’ancien Space Ibiza, divisé entre la salle Theatre et la Club Room.",
      "en": "State-of-the-art superclub in Playa d’en Bossa built on the site of the former Space Ibiza, divided between the Theatre and the Club Room."
    }
  },
  {
    "id": "spook-valence",
    "nom": "Spook",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "valence-es",
    "ville": {
      "fr": "Valence (Pinedo)",
      "en": "Valencia (Pinedo)"
    },
    "latitude": 39.4184,
    "longitude": -0.3342,
    "capacite": 2000,
    "annee": 1984,
    "styles": [
      "Techno",
      "Hard Techno",
      "EBM",
      "Electro"
    ],
    "site": "https://spookclub.com",
    "description": {
      "fr": "Légende vivante de la Ruta de Valence ouverte en 1984 à Pinedo, aujourd’hui dotée d’un système sonore de pointe dédié à la techno.",
      "en": "Living legend of the Valencia Ruta opened in 1984 in Pinedo, today outfitted with a cutting-edge sound system dedicated to techno."
    }
  },
  {
    "id": "barraca-valence",
    "nom": "Barraca",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "valence-es",
    "ville": {
      "fr": "Valence (Les Palmeres)",
      "en": "Valencia (Les Palmeres)"
    },
    "latitude": 39.2542,
    "longitude": -0.2625,
    "capacite": 1800,
    "annee": 1965,
    "styles": [
      "Techno",
      "Tech House",
      "Minimal",
      "Electro"
    ],
    "site": "https://barracamusic.com",
    "description": {
      "fr": "Institution historique de la côte valencienne en activité depuis 1965, pilier de l’avant-garde électronique espagnole sur quatre salles et terrasse.",
      "en": "Historic Valencian coast institution active since 1965, a pillar of Spain’s electronic vanguard across four rooms and an open-air terrace."
    }
  },
  {
    "id": "sonora-bilbao",
    "nom": "Sonora",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "valence-es",
    "ville": {
      "fr": "Bilbao (Erandio)",
      "en": "Bilbao (Erandio)"
    },
    "latitude": 43.3012,
    "longitude": -2.9736,
    "capacite": 900,
    "annee": 2011,
    "styles": [
      "Techno",
      "House",
      "Tech House",
      "Electro"
    ],
    "site": "https://salasonora.com",
    "description": {
      "fr": "Club de référence du Pays basque espagnol au bord de la ria de Bilbao à Erandio, divisé en trois salles.",
      "en": "Flagship club of the Spanish Basque Country along the Bilbao estuary in Erandio, featuring three distinct rooms."
    }
  },
  {
    "id": "fuse-bruxelles",
    "nom": "Fuse",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles",
      "en": "Brussels"
    },
    "latitude": 50.8359,
    "longitude": 4.3468,
    "capacite": 1200,
    "annee": 1994,
    "styles": [
      "Techno",
      "House",
      "Acid",
      "Electro"
    ],
    "site": "https://fuse.be",
    "description": {
      "fr": "Plus ancien et plus célèbre club techno de Belgique, installé depuis 1994 dans un ancien cinéma de la rue Blaes au coeur des Marolles à Bruxelles.",
      "en": "Belgium’s longest-running and most iconic techno club, housed since 1994 inside a former cinema on Rue Blaes in Brussels’ Marolles district."
    }
  },
  {
    "id": "c12-bruxelles",
    "nom": "C12",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles",
      "en": "Brussels"
    },
    "latitude": 50.8462,
    "longitude": 4.3578,
    "capacite": 900,
    "annee": 2018,
    "styles": [
      "Techno",
      "Leftfield",
      "Bass",
      "Experimental"
    ],
    "site": "https://c12space.com",
    "description": {
      "fr": "Espace souterrain labyrinthique logé dans la Galerie Horta sous la Gare Centrale de Bruxelles, fer de lance de la scène techno et expérimentale belge.",
      "en": "Labyrinthine underground space inside the Horta Gallery beneath Brussels Central Station, spearheading Belgium’s techno and experimental club scene."
    }
  },
  {
    "id": "zodiak-bruxelles",
    "nom": "Zodiak",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles",
      "en": "Brussels"
    },
    "latitude": 50.8454,
    "longitude": 4.3532,
    "capacite": 400,
    "annee": 2016,
    "styles": [
      "Techno",
      "House",
      "Minimal",
      "Acid"
    ],
    "site": "https://zodiak.brussels",
    "description": {
      "fr": "Club intimiste sur trois niveaux à deux pas de la Grand-Place de Bruxelles, dédié aux artistes locaux et internationaux de l’underground.",
      "en": "Three-level club steps away from Brussels’ Grand-Place dedicated to local and international underground techno and house artists."
    }
  },
  {
    "id": "kompass-klub-gand",
    "nom": "Kompass Klub",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "gand-be",
    "ville": {
      "fr": "Gand",
      "en": "Ghent"
    },
    "latitude": 51.0772,
    "longitude": 3.7336,
    "capacite": 1500,
    "annee": 2016,
    "styles": [
      "Techno",
      "Hard Techno",
      "Acid Techno",
      "House"
    ],
    "site": "https://kompassklub.com",
    "description": {
      "fr": "Cathédrale industrielle de la techno en Flandre à Gand, célèbre pour sa puissance sonore et ses raves marathons.",
      "en": "Industrial techno cathedral in Ghent, Flanders, renowned for its immense warehouse scale and marathon rave sessions."
    }
  },
  {
    "id": "chinastraat-gand",
    "nom": "Chinastraat",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "gand-be",
    "ville": {
      "fr": "Gand",
      "en": "Ghent"
    },
    "latitude": 51.0748,
    "longitude": 3.7294,
    "capacite": 700,
    "annee": 2018,
    "styles": [
      "Techno",
      "Electro",
      "House",
      "Breaks"
    ],
    "site": "https://chinastraat.be",
    "description": {
      "fr": "Friche industrielle et jardin communautaire du nord de Gand abritant soirées club pointues, open airs et ateliers d’artistes.",
      "en": "Industrial compound and courtyard in northern Ghent hosting underground club nights, open-airs and artist studios."
    }
  },
  {
    "id": "funke-gand",
    "nom": "Funke",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "gand-be",
    "ville": {
      "fr": "Gand",
      "en": "Ghent"
    },
    "latitude": 51.0472,
    "longitude": 3.7279,
    "capacite": 300,
    "annee": 2021,
    "styles": [
      "House",
      "Leftfield",
      "Electro",
      "Techno"
    ],
    "site": "https://funke.gent",
    "description": {
      "fr": "Club audiophile et laboratoire sonore de Gand doté d’une acoustique sur mesure pour les sélections house, electro et leftfield.",
      "en": "Audiophile club and sonic laboratory in Ghent with custom-built acoustics for house, electro and leftfield club music."
    }
  },
  {
    "id": "ampere-anvers",
    "nom": "Ampere",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "anvers-be",
    "ville": {
      "fr": "Anvers",
      "en": "Antwerp"
    },
    "latitude": 51.2124,
    "longitude": 4.4228,
    "capacite": 1000,
    "annee": 2015,
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Drum & Bass"
    ],
    "site": "https://ampere-antwerp.com",
    "description": {
      "fr": "Vaste club logé sous les voies ferrées de la gare centrale d’Anvers, doté d’un système Funktion-One massif et d’une isolation acoustique intégrale.",
      "en": "Cavernous club built beneath the railway tracks of Antwerp Central Station, featuring a massive Funktion-One system and box-in-box acoustic isolation."
    }
  },
  {
    "id": "club-vaag-anvers",
    "nom": "Club Vaag",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "anvers-be",
    "ville": {
      "fr": "Anvers",
      "en": "Antwerp"
    },
    "latitude": 51.2312,
    "longitude": 4.4018,
    "capacite": 450,
    "annee": 2015,
    "styles": [
      "Tech House",
      "House",
      "Techno",
      "Minimal"
    ],
    "site": "https://clubvaag.be",
    "description": {
      "fr": "Sous-sol brut du quartier portuaire d’Eilandje à Anvers, dédié à la house, à la tech house et à la techno.",
      "en": "Raw basement club in Antwerp’s Eilandje docklands district dedicated to house, tech house and techno."
    }
  },
  {
    "id": "traum-anvers",
    "nom": "Traum",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "anvers-be",
    "ville": {
      "fr": "Anvers",
      "en": "Antwerp"
    },
    "latitude": 51.2192,
    "longitude": 4.4136,
    "capacite": 500,
    "annee": 2024,
    "styles": [
      "Techno",
      "House",
      "Trance",
      "Leftfield"
    ],
    "site": "https://traumclub.be",
    "description": {
      "fr": "Sanctuaire souterrain anversois repensé par des architectes contemporains dans les caves historiques de l’ancien Café d’Anvers.",
      "en": "Antwerp underground sanctuary redesigned by contemporary architects inside the historic cellars of the former Café d’Anvers."
    }
  },
  {
    "id": "lux-fragil-lisbonne",
    "nom": "Lux Frágil",
    "type": "club",
    "paysCode": "PT",
    "villeSlug": "lisbonne-pt",
    "ville": {
      "fr": "Lisbonne",
      "en": "Lisbon"
    },
    "latitude": 38.7158,
    "longitude": -9.1204,
    "capacite": 1200,
    "annee": 1998,
    "styles": [
      "House",
      "Techno",
      "Disco",
      "Leftfield"
    ],
    "site": "https://luxfragil.com",
    "description": {
      "fr": "Institution absolue de la nuit lisboète au bord du Tage à Santa Apolónia depuis 1998, répartie entre le Club, le Bar et la grande terrasse sur le toit.",
      "en": "Crowning institution of Lisbon nightlife on the Tagus riverfront at Santa Apolónia since 1998, spanning the Basement Club, Bar and rooftop terrace."
    }
  },
  {
    "id": "ministerium-club-lisbonne",
    "nom": "Ministerium Club",
    "type": "club",
    "paysCode": "PT",
    "villeSlug": "lisbonne-pt",
    "ville": {
      "fr": "Lisbonne",
      "en": "Lisbon"
    },
    "latitude": 38.7078,
    "longitude": -9.1369,
    "capacite": 600,
    "annee": 2012,
    "styles": [
      "Techno",
      "House",
      "Minimal",
      "Electro"
    ],
    "site": "https://ministerium.pt",
    "description": {
      "fr": "Club installé dans les anciens locaux du ministère des Finances sur la monumentale Praça do Comércio à Lisbonne.",
      "en": "Club housed inside the former Ministry of Finance building on Lisbon’s monumental Praça do Comércio."
    }
  },
  {
    "id": "nada-temple-lisbonne",
    "nom": "Nada Temple",
    "type": "club",
    "paysCode": "PT",
    "villeSlug": "lisbonne-pt",
    "ville": {
      "fr": "Lisbonne",
      "en": "Lisbon"
    },
    "latitude": 38.7428,
    "longitude": -9.1024,
    "capacite": 500,
    "annee": 2019,
    "styles": [
      "Techno",
      "Hard Techno",
      "Industrial",
      "Experimental"
    ],
    "site": "https://www.instagram.com/nadatemple/",
    "description": {
      "fr": "Entrepôt industriel du quartier de Marvila à Lisbonne dédié à la techno brute, à l’industriel et aux raves prolongées.",
      "en": "Industrial warehouse in Lisbon’s Marvila district dedicated to raw techno, industrial sounds and extended raves."
    }
  },
  {
    "id": "gare-porto",
    "nom": "Gare Porto",
    "type": "club",
    "paysCode": "PT",
    "villeSlug": "porto-pt",
    "ville": {
      "fr": "Porto",
      "en": "Porto"
    },
    "latitude": 41.1456,
    "longitude": -8.6098,
    "capacite": 400,
    "annee": 2007,
    "styles": [
      "Techno",
      "Drum & Bass",
      "Industrial",
      "Acid"
    ],
    "site": "https://gareporto.com",
    "description": {
      "fr": "Tunnel de granit brut jouxtant la gare de São Bento à Porto, temple incontesté de la techno underground et de la drum & bass dans le nord du Portugal.",
      "en": "Raw granite tunnel next to Porto’s São Bento station, the undisputed temple of underground techno and drum & bass in northern Portugal."
    }
  },
  {
    "id": "plano-b-porto",
    "nom": "Plano B",
    "type": "club",
    "paysCode": "PT",
    "villeSlug": "porto-pt",
    "ville": {
      "fr": "Porto",
      "en": "Porto"
    },
    "latitude": 41.1469,
    "longitude": -8.6138,
    "capacite": 700,
    "annee": 2006,
    "styles": [
      "House",
      "Techno",
      "Disco",
      "Electronica"
    ],
    "site": "https://planobporto.pt",
    "description": {
      "fr": "Centre culturel et club sur deux étages au coeur des Galeries de Paris à Porto, mêlant expositions, concerts et nuits électroniques.",
      "en": "Two-story cultural space and club in the heart of Porto’s Galeria de Paris district blending exhibitions, live acts and electronic club nights."
    }
  },
  {
    "id": "perola-negra-porto",
    "nom": "Pérola Negra",
    "type": "club",
    "paysCode": "PT",
    "villeSlug": "porto-pt",
    "ville": {
      "fr": "Porto",
      "en": "Porto"
    },
    "latitude": 41.1518,
    "longitude": -8.6062,
    "capacite": 450,
    "annee": 1978,
    "styles": [
      "House",
      "Disco",
      "Electro",
      "Leftfield"
    ],
    "site": "https://www.instagram.com/perolanegra.club/",
    "description": {
      "fr": "Ancien cabaret des années 1970 aux miroirs et velours rouges préservés à Porto, devenu un club de pointe pour la house, le disco et l’electro.",
      "en": "Preserved 1970s red-velvet cabaret in Porto reborn as a cutting-edge club for house, disco and leftfield electronics."
    }
  },
  {
    "id": "blitz-munich",
    "nom": "Blitz Music Club",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "munich-de",
    "ville": {
      "fr": "Munich",
      "en": "Munich"
    },
    "latitude": 48.1306,
    "longitude": 11.5844,
    "capacite": 600,
    "annee": 2017,
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Leftfield"
    ],
    "site": "https://blitz.club",
    "description": {
      "fr": "Club audiophile installé sur l’île aux Musées dans l’ancien palais des congrès du Deutsches Museum à Munich, célèbre pour son système VOID sur mesure et sa politique sans photo.",
      "en": "Audiophile club on Museum Island inside the former Deutsches Museum congress hall in Munich, famed for its bespoke VOID sound system and strict no-photo policy."
    }
  },
  {
    "id": "rote-sonne-munich",
    "nom": "Rote Sonne",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "munich-de",
    "ville": {
      "fr": "Munich",
      "en": "Munich"
    },
    "latitude": 48.1422,
    "longitude": 11.5702,
    "capacite": 350,
    "annee": 2005,
    "styles": [
      "Techno",
      "Electro",
      "Acid",
      "Experimental"
    ],
    "site": "https://rote-sonne.com",
    "description": {
      "fr": "Sous-sol historique de la Maximiliansplatz à Munich, bastion de la techno, de l’electro et des labels indépendants bavarois depuis 2005.",
      "en": "Underground club on Maximiliansplatz in Munich, a stronghold for techno, electro and independent Bavarian labels since 2005."
    }
  },
  {
    "id": "bahnwarter-thiel-munich",
    "nom": "Bahnwärter Thiel",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "munich-de",
    "ville": {
      "fr": "Munich",
      "en": "Munich"
    },
    "latitude": 48.1228,
    "longitude": 11.5542,
    "capacite": 800,
    "annee": 2015,
    "styles": [
      "House",
      "Melodic Techno",
      "Downtempo",
      "Techno"
    ],
    "site": "https://bahnwaerterthiel.de",
    "description": {
      "fr": "Village culturel alternatif assemblé à partir d’anciens wagons de métro, de tramways et de conteneurs maritimes sur le terrain des anciens abattoirs de Munich.",
      "en": "Alternative cultural compound built from decommissioned subway cars, trams and shipping containers on Munich’s former slaughterhouse grounds."
    }
  },
  {
    "id": "robert-johnson-offenbach",
    "nom": "Robert Johnson",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "francfort-de",
    "ville": {
      "fr": "Offenbach / Francfort",
      "en": "Offenbach / Frankfurt"
    },
    "latitude": 50.1098,
    "longitude": 8.7468,
    "capacite": 250,
    "annee": 1999,
    "styles": [
      "House",
      "Techno",
      "Minimal",
      "Disco"
    ],
    "site": "https://robert-johnson.de",
    "description": {
      "fr": "Sanctuaire minimaliste perché au-dessus du Main à Offenbach, fondé en 1999 par Ata (Playhouse / Live At Robert Johnson) avec parquet en bois et balcon sur le fleuve.",
      "en": "Minimalist sanctuary perched above the Main River in Offenbach, founded in 1999 by Ata (Playhouse / Live At Robert Johnson) with a wooden dancefloor and river balcony."
    }
  },
  {
    "id": "tanzhaus-west-francfort",
    "nom": "Tanzhaus West",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "francfort-de",
    "ville": {
      "fr": "Francfort",
      "en": "Frankfurt"
    },
    "latitude": 50.0982,
    "longitude": 8.6418,
    "capacite": 1000,
    "annee": 2003,
    "styles": [
      "Techno",
      "House",
      "Hard Techno",
      "Psy"
    ],
    "site": "https://tanzhaus-west.de",
    "description": {
      "fr": "Ancienne usine d’imprimerie du quartier industriel de Gutleutviertel à Francfort dotée d’un grand jardin d’été (Dora Brilliant) et de quatre pistes techno.",
      "en": "Former printing factory in Frankfurt’s industrial Gutleutviertel featuring a large summer garden and four rooms of techno and house."
    }
  },
  {
    "id": "freud-francfort",
    "nom": "Freud",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "francfort-de",
    "ville": {
      "fr": "Francfort",
      "en": "Frankfurt"
    },
    "latitude": 50.1165,
    "longitude": 8.6812,
    "capacite": 350,
    "annee": 2016,
    "styles": [
      "Techno",
      "Raw Techno",
      "Acid",
      "Electro"
    ],
    "site": "https://freud-ffm.de",
    "description": {
      "fr": "Caveau brut du centre de Francfort perpétuant la tradition techno sans compromis de la métropole rhénane.",
      "en": "Raw underground basement in central Frankfurt carrying forward the city’s uncompromising techno heritage."
    }
  },
  {
    "id": "pal-hambourg",
    "nom": "PAL",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "hambourg-de",
    "ville": {
      "fr": "Hambourg",
      "en": "Hamburg"
    },
    "latitude": 53.5612,
    "longitude": 9.9682,
    "capacite": 600,
    "annee": 2014,
    "styles": [
      "Techno",
      "Electro",
      "Leftfield",
      "House"
    ],
    "site": "https://pal-hh.de",
    "description": {
      "fr": "Institution de l’avant-garde techno et électronique de Hambourg, reconnue pour ses nuits marathons sans téléphone et ses programmations pointues.",
      "en": "Flagship of Hamburg’s avant-garde techno and electronic scene, acclaimed for its phone-free marathon nights and forward-thinking curation."
    }
  },
  {
    "id": "golden-pudel-hambourg",
    "nom": "Golden Pudel Club",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "hambourg-de",
    "ville": {
      "fr": "Hambourg",
      "en": "Hamburg"
    },
    "latitude": 53.5458,
    "longitude": 9.9589,
    "capacite": 150,
    "annee": 1989,
    "styles": [
      "Experimental",
      "Techno",
      "Electro",
      "Leftfield"
    ],
    "site": "https://pudel.com",
    "description": {
      "fr": "Maisonnette contre-culturelle légendaire surplombant le port de Hambourg à St. Pauli depuis 1989, laboratoire d’Helena Hauff et de l’underground hanséatique.",
      "en": "Legendary countercultural shack overlooking Hamburg Harbor in St. Pauli since 1989, the home turf of Helena Hauff and Hanseatic underground electronics."
    }
  },
  {
    "id": "uebel-und-gefaehrlich-hambourg",
    "nom": "Uebel & Gefährlich",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "hambourg-de",
    "ville": {
      "fr": "Hambourg",
      "en": "Hamburg"
    },
    "latitude": 53.5564,
    "longitude": 9.9704,
    "capacite": 1000,
    "annee": 2006,
    "styles": [
      "Techno",
      "Melodic Techno",
      "House",
      "Electronica"
    ],
    "site": "https://uebelundgefaehrlich.com",
    "description": {
      "fr": "Club spectaculaire niché au quatrième étage de l’immense bunker antiaérien de la Feldstrasse à St. Pauli à Hambourg.",
      "en": "Spectacular club perched on the fourth floor of the monumental Feldstrasse WWII bunker in Hamburg’s St. Pauli district."
    }
  },
  {
    "id": "gewoelbe-cologne",
    "nom": "Gewölbe",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "cologne-de",
    "ville": {
      "fr": "Cologne",
      "en": "Cologne"
    },
    "latitude": 50.9412,
    "longitude": 6.9324,
    "capacite": 350,
    "annee": 2010,
    "styles": [
      "Techno",
      "Minimal",
      "House",
      "Ambient"
    ],
    "site": "https://gewoelbe.club",
    "description": {
      "fr": "Voûte de brique sous la gare de Cologne-West, fief des artistes Kompakt et doté d’un système sonore quadriphonique d’une précision remarquable.",
      "en": "Brick railway arch beneath Köln West station, the home club of Kompakt artists featuring a surgical four-point sound system."
    }
  },
  {
    "id": "bootshaus-cologne",
    "nom": "Bootshaus",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "cologne-de",
    "ville": {
      "fr": "Cologne",
      "en": "Cologne"
    },
    "latitude": 50.9308,
    "longitude": 6.9862,
    "capacite": 1800,
    "annee": 2005,
    "styles": [
      "Bass",
      "Techno",
      "Hard Techno",
      "House"
    ],
    "site": "https://bootshaus.tv",
    "description": {
      "fr": "Ancien chantier naval du port de Cologne-Deutz devenu l’un des clubs les plus énergiques d’Allemagne pour la bass music, la techno et les grandes tournées.",
      "en": "Former shipyard in Cologne-Deutz harbor turned into one of Germany’s highest-energy arenas for bass music, techno and international tours."
    }
  },
  {
    "id": "odonien-cologne",
    "nom": "Odonien",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "cologne-de",
    "ville": {
      "fr": "Cologne",
      "en": "Cologne"
    },
    "latitude": 50.9578,
    "longitude": 6.9442,
    "capacite": 900,
    "annee": 2006,
    "styles": [
      "Techno",
      "House",
      "Psy",
      "Drum & Bass"
    ],
    "site": "https://odonien.de",
    "description": {
      "fr": "Parc de sculptures robotiques en acier et club en plein air créé par l’artiste Odo Rumpf le long des voies ferrées de Cologne.",
      "en": "Robotic steel sculpture park and open-air club created by artist Odo Rumpf alongside Cologne’s railway tracks."
    }
  },
  {
    "id": "ifz-leipzig",
    "nom": "Institut fuer Zukunft (IfZ)",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "leipzig-de",
    "ville": {
      "fr": "Leipzig",
      "en": "Leipzig"
    },
    "latitude": 51.3198,
    "longitude": 12.3924,
    "capacite": 700,
    "annee": 2014,
    "styles": [
      "Techno",
      "Electro",
      "Breaks",
      "Experimental"
    ],
    "site": "https://ifz.me",
    "description": {
      "fr": "Bastion souterrain de la culture techno et queer de Leipzig, doté d’un labyrinthe de béton brut et de trois pistes sonores.",
      "en": "Underground bastion of Leipzig’s techno and queer club culture, set inside a raw concrete labyrinth with three floors."
    }
  },
  {
    "id": "distillery-leipzig",
    "nom": "Distillery",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "leipzig-de",
    "ville": {
      "fr": "Leipzig",
      "en": "Leipzig"
    },
    "latitude": 51.3168,
    "longitude": 12.3782,
    "capacite": 600,
    "annee": 1992,
    "styles": [
      "Techno",
      "House",
      "Drum & Bass",
      "Dub Techno"
    ],
    "site": "https://distillery.de",
    "description": {
      "fr": "Plus ancien club techno d’Allemagne de l’Est fondé en 1992 à Leipzig, institution historique de la house et de la techno saxonnes.",
      "en": "Eastern Germany’s oldest techno club founded in 1992 in Leipzig, a historic cornerstone of Saxon house and techno."
    }
  },
  {
    "id": "elipamanoke-leipzig",
    "nom": "Elipamanoke",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "leipzig-de",
    "ville": {
      "fr": "Leipzig",
      "en": "Leipzig"
    },
    "latitude": 51.3282,
    "longitude": 12.3274,
    "capacite": 500,
    "annee": 2010,
    "styles": [
      "Techno",
      "Hard Techno",
      "Acid",
      "Rave"
    ],
    "site": "https://elipamanoke.de",
    "description": {
      "fr": "Ancienne usine du quartier industriel de Plagwitz à Leipzig, prisée pour ses week-ends techno sans interruption et son jardin extérieur.",
      "en": "Former factory in Leipzig’s industrial Plagwitz district prized for its non-stop techno weekends and outdoor garden."
    }
  },
  {
    "id": "grelle-forelle-vienne",
    "nom": "Grelle Forelle",
    "type": "club",
    "paysCode": "AT",
    "villeSlug": "vienne-at",
    "ville": {
      "fr": "Vienne",
      "en": "Vienna"
    },
    "latitude": 48.2342,
    "longitude": 16.3628,
    "capacite": 700,
    "annee": 2011,
    "styles": [
      "Techno",
      "House",
      "Drum & Bass",
      "Leftfield"
    ],
    "site": "https://grelleforelle.com",
    "description": {
      "fr": "Club de référence au bord du canal du Danube à Vienne, doté d’un système sonore sur mesure et d’une politique stricte sans photo.",
      "en": "Flagship club on the Danube Canal in Vienna, featuring a bespoke sound system and a strict no-photo policy."
    }
  },
  {
    "id": "pratersauna-vienne",
    "nom": "Pratersauna",
    "type": "club",
    "paysCode": "AT",
    "villeSlug": "vienne-at",
    "ville": {
      "fr": "Vienne",
      "en": "Vienna"
    },
    "latitude": 48.2132,
    "longitude": 16.4126,
    "capacite": 700,
    "annee": 2009,
    "styles": [
      "House",
      "Techno",
      "Melodic Techno",
      "Electro"
    ],
    "site": "https://pratersauna.tv",
    "description": {
      "fr": "Ancien sauna des années 1960 au coeur du parc du Prater à Vienne reconverti en club électronique avec piscine extérieure et jardin.",
      "en": "Converted 1960s sauna in Vienna’s Prater park featuring multiple indoor dancefloors, an outdoor pool and a summer garden."
    }
  },
  {
    "id": "flex-vienne",
    "nom": "Flex",
    "type": "club",
    "paysCode": "AT",
    "villeSlug": "vienne-at",
    "ville": {
      "fr": "Vienne",
      "en": "Vienna"
    },
    "latitude": 48.2182,
    "longitude": 16.3704,
    "capacite": 600,
    "annee": 1995,
    "styles": [
      "Drum & Bass",
      "Techno",
      "Dubstep",
      "Electro"
    ],
    "site": "https://flex.at",
    "description": {
      "fr": "Ancien tunnel de métro sur les quais du Donaukanal à Vienne, célèbre en Europe pour la puissance de son système sonore et ses nuits drum & bass et techno.",
      "en": "Former subway tunnel on Vienna’s Donaukanal embankment, renowned across Europe for its thunderous sound system and drum & bass and techno nights."
    }
  },
  {
    "id": "ankali-prague",
    "nom": "Ankali",
    "type": "club",
    "paysCode": "CZ",
    "villeSlug": "prague-cz",
    "ville": {
      "fr": "Prague",
      "en": "Prague"
    },
    "latitude": 50.0672,
    "longitude": 14.4586,
    "capacite": 250,
    "annee": 2017,
    "styles": [
      "Techno",
      "Electro",
      "Leftfield",
      "Ambient"
    ],
    "site": "https://ankali.com",
    "description": {
      "fr": "Ancienne savonnerie du quartier de Vršovice à Prague transformée en club intimiste et audiophile, coeur battant de l’underground tchèque.",
      "en": "Former soap factory in Prague’s Vršovice district transformed into an intimate audiophile club at the heart of the Czech underground."
    }
  },
  {
    "id": "fuchs2-prague",
    "nom": "Fuchs2",
    "type": "club",
    "paysCode": "CZ",
    "villeSlug": "prague-cz",
    "ville": {
      "fr": "Prague",
      "en": "Prague"
    },
    "latitude": 50.0958,
    "longitude": 14.4368,
    "capacite": 500,
    "annee": 2019,
    "styles": [
      "Techno",
      "Industrial",
      "Experimental",
      "Bass"
    ],
    "site": "https://fuchs2.cz",
    "description": {
      "fr": "Bâtiment fonctionnaliste de 1931 signé Josef Fuchs sur l’île de Štvanice au milieu de la Vltava à Prague, devenu un haut lieu des musiques électroniques radicales.",
      "en": "Functionalism landmark designed by Josef Fuchs in 1931 on Štvanice Island in the Vltava River, now Prague’s hub for radical club music."
    }
  },
  {
    "id": "roxy-prague",
    "nom": "Roxy Prague",
    "type": "club",
    "paysCode": "CZ",
    "villeSlug": "prague-cz",
    "ville": {
      "fr": "Prague",
      "en": "Prague"
    },
    "latitude": 50.0902,
    "longitude": 14.4258,
    "capacite": 900,
    "annee": 1992,
    "styles": [
      "Techno",
      "House",
      "Drum & Bass",
      "Progressive House"
    ],
    "site": "https://roxy.cz",
    "description": {
      "fr": "Ancien cinéma Art déco de la rue Dlouhá au coeur de la Vieille Ville de Prague, institution électronique tchèque depuis 1992.",
      "en": "Art Deco former cinema on Dlouhá Street in Prague’s Old Town, a flagship Czech electronic music venue since 1992."
    }
  },
  {
    "id": "smolna-varsovie",
    "nom": "Smolna",
    "type": "club",
    "paysCode": "PL",
    "villeSlug": "varsovie-pl",
    "ville": {
      "fr": "Varsovie",
      "en": "Warsaw"
    },
    "latitude": 52.2324,
    "longitude": 21.0218,
    "capacite": 700,
    "annee": 2016,
    "styles": [
      "Techno",
      "House",
      "Melodic Techno",
      "Acid"
    ],
    "site": "https://smolna38.com",
    "description": {
      "fr": "Maison de ville historique du centre de Varsovie abritant deux pistes souterraines et un patio dédiés à la techno et à la house.",
      "en": "Historic townhouse in central Warsaw housing two underground dancefloors and a courtyard dedicated to techno and house."
    }
  },
  {
    "id": "jasna-1-varsovie",
    "nom": "Jasna 1",
    "type": "club",
    "paysCode": "PL",
    "villeSlug": "varsovie-pl",
    "ville": {
      "fr": "Varsovie",
      "en": "Warsaw"
    },
    "latitude": 52.2356,
    "longitude": 21.0112,
    "capacite": 500,
    "annee": 2017,
    "styles": [
      "Techno",
      "Electro",
      "House",
      "Leftfield"
    ],
    "site": "https://jasna1.com",
    "description": {
      "fr": "Club progressiste de la rue Jasna à Varsovie, fer de lance de la nouvelle vague électronique et queer polonaise.",
      "en": "Forward-thinking club on Jasna Street in Warsaw spearheading Poland’s underground electronic and queer club culture."
    }
  },
  {
    "id": "praga-centrum-varsovie",
    "nom": "Praga Centrum",
    "type": "club",
    "paysCode": "PL",
    "villeSlug": "varsovie-pl",
    "ville": {
      "fr": "Varsovie",
      "en": "Warsaw"
    },
    "latitude": 52.2638,
    "longitude": 21.0412,
    "capacite": 1200,
    "annee": 2019,
    "styles": [
      "Techno",
      "Hard Techno",
      "Drum & Bass",
      "Trance"
    ],
    "site": "https://pragacentrum.pl",
    "description": {
      "fr": "Halle industrielle en brique rouge du XIXe siècle sur la rive droite de la Vistule à Varsovie, accueillant les grandes raves techno.",
      "en": "Nineteenth-century red-brick industrial hall on the right bank of the Vistula in Warsaw hosting large-scale techno raves."
    }
  },
  {
    "id": "a38-budapest",
    "nom": "A38 Ship",
    "type": "club",
    "paysCode": "HU",
    "villeSlug": "budapest-hu",
    "ville": {
      "fr": "Budapest",
      "en": "Budapest"
    },
    "latitude": 47.4754,
    "longitude": 19.0622,
    "capacite": 700,
    "annee": 2003,
    "styles": [
      "Drum & Bass",
      "Techno",
      "Electronica",
      "Breaks"
    ],
    "site": "https://a38.hu",
    "description": {
      "fr": "Ancien navire ukrainien de transport de pierre amarré au pied du pont Petőfi sur le Danube à Budapest, salle de concert et club électronique mythique.",
      "en": "Rebuilt Ukrainian stone-carrier ship moored at the foot of Petőfi Bridge on the Danube in Budapest, a legendary live electronic and club venue."
    }
  },
  {
    "id": "arzenal-budapest",
    "nom": "Arzenál",
    "type": "club",
    "paysCode": "HU",
    "villeSlug": "budapest-hu",
    "ville": {
      "fr": "Budapest",
      "en": "Budapest"
    },
    "latitude": 47.4562,
    "longitude": 19.0818,
    "capacite": 1200,
    "annee": 2020,
    "styles": [
      "Techno",
      "Hard Techno",
      "Industrial",
      "Acid"
    ],
    "site": "https://www.instagram.com/arzenalbudapest/",
    "description": {
      "fr": "Entrepôt industriel monumental du sud de Budapest devenu le bastion hongrois de la techno brute et de la hard techno.",
      "en": "Monumental industrial warehouse in southern Budapest that has become Hungary’s stronghold for raw and hard techno."
    }
  },
  {
    "id": "turbina-budapest",
    "nom": "Turbina Kulturális Központ",
    "type": "club",
    "paysCode": "HU",
    "villeSlug": "budapest-hu",
    "ville": {
      "fr": "Budapest",
      "en": "Budapest"
    },
    "latitude": 47.4892,
    "longitude": 19.0748,
    "capacite": 600,
    "annee": 2021,
    "styles": [
      "Techno",
      "House",
      "Downtempo",
      "Experimental"
    ],
    "site": "https://turbinabudapest.hu",
    "description": {
      "fr": "Centre culturel indépendant et club sur plusieurs salles dans le 8e arrondissement de Budapest, très actif sur la scène électronique locale.",
      "en": "Multi-room independent cultural center and club in Budapest’s 8th district championing the local underground electronic scene."
    }
  },
  {
    "id": "bassiani-tbilissi",
    "nom": "Bassiani",
    "type": "club",
    "paysCode": "GE",
    "villeSlug": "tbilissi-ge",
    "ville": {
      "fr": "Tbilissi",
      "en": "Tbilisi"
    },
    "latitude": 41.7232,
    "longitude": 44.7898,
    "capacite": 1200,
    "annee": 2014,
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Industrial"
    ],
    "site": "https://bassiani.com",
    "description": {
      "fr": "Cathédrale souterraine aménagée dans une piscine olympique soviétique désaffectée sous le stade national Dinamo de Tbilissi, avec la salle Horoom à l’étage.",
      "en": "Underground techno cathedral built inside a disused Soviet Olympic swimming pool beneath Tbilisi’s Dinamo National Stadium, alongside the Horoom room."
    }
  },
  {
    "id": "khidi-tbilissi",
    "nom": "KHIDI",
    "type": "club",
    "paysCode": "GE",
    "villeSlug": "tbilissi-ge",
    "ville": {
      "fr": "Tbilissi",
      "en": "Tbilisi"
    },
    "latitude": 41.7289,
    "longitude": 44.7792,
    "capacite": 900,
    "annee": 2016,
    "styles": [
      "Industrial",
      "Techno",
      "EBM",
      "Experimental"
    ],
    "site": "https://khidi.ge",
    "description": {
      "fr": "Forteresse brute logée dans les piliers mêmes du pont Vakhouchti-Bagrationi au-dessus de la rivière Koura à Tbilissi, dédiée à la techno industrielle et à l’EBM.",
      "en": "Brutalist club built directly inside the piers of the Vakhushti Bagrationi Bridge over the Kura River in Tbilisi, dedicated to industrial techno and EBM."
    }
  },
  {
    "id": "tes-tbilissi",
    "nom": "TES",
    "type": "club",
    "paysCode": "GE",
    "villeSlug": "tbilissi-ge",
    "ville": {
      "fr": "Tbilissi",
      "en": "Tbilisi"
    },
    "latitude": 41.7168,
    "longitude": 44.7954,
    "capacite": 500,
    "annee": 2020,
    "styles": [
      "House",
      "Electro",
      "Techno",
      "Breaks"
    ],
    "site": "https://www.instagram.com/tes.club/",
    "description": {
      "fr": "Club de deux salles au bord de la Koura à Tbilissi, vitrine de la nouvelle génération de DJs et producteurs géorgiens.",
      "en": "Two-room club on the banks of the Kura River in Tbilisi showcasing the new wave of Georgian DJs and producers."
    }
  },
  {
    "id": "warehouse-project-manchester",
    "nom": "The Warehouse Project (Depot Mayfield)",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "manchester-gb",
    "ville": {
      "fr": "Manchester",
      "en": "Manchester"
    },
    "latitude": 53.4752,
    "longitude": -2.2268,
    "capacite": 10000,
    "annee": 2006,
    "styles": [
      "House",
      "Techno",
      "Drum & Bass",
      "UK Garage"
    ],
    "site": "https://thewarehouseproject.com",
    "description": {
      "fr": "Ancienne gare ferroviaire de 1910 (Depot Mayfield) à Manchester transformée chaque automne en cathédrale mondiale des musiques électroniques.",
      "en": "Vast 1910 railway depot (Depot Mayfield) in Manchester transformed every autumn into one of the world’s largest electronic music club series."
    }
  },
  {
    "id": "the-white-hotel-manchester",
    "nom": "The White Hotel",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "manchester-gb",
    "ville": {
      "fr": "Manchester (Salford)",
      "en": "Manchester (Salford)"
    },
    "latitude": 53.4918,
    "longitude": -2.2614,
    "capacite": 300,
    "annee": 2016,
    "styles": [
      "Techno",
      "Experimental",
      "UK Bass",
      "Industrial"
    ],
    "site": "https://www.instagram.com/the.white.hotel/",
    "description": {
      "fr": "Ancien atelier mécanique de Salford devenu le club underground le plus culte du Grand Manchester, où les nuits s’étirent jusqu’au dimanche matin.",
      "en": "Former auto repair garage in Salford turned into Greater Manchester’s most revered underground club for avant-garde electronics and late-morning raves."
    }
  },
  {
    "id": "hidden-manchester",
    "nom": "Hidden",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "manchester-gb",
    "ville": {
      "fr": "Manchester",
      "en": "Manchester"
    },
    "latitude": 53.4926,
    "longitude": -2.2452,
    "capacite": 700,
    "annee": 2015,
    "styles": [
      "Techno",
      "House",
      "Jungle",
      "Drum & Bass"
    ],
    "site": "https://hidden.club",
    "description": {
      "fr": "Complexe labyrinthique aménagé dans une ancienne filature textile (DownTex Mill) au nord du centre de Manchester.",
      "en": "Labyrinthine multi-room club inside the historic DownTex Mill on the northern edge of central Manchester."
    }
  },
  {
    "id": "motion-bristol",
    "nom": "Motion Bristol",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "bristol-gb",
    "ville": {
      "fr": "Bristol",
      "en": "Bristol"
    },
    "latitude": 51.4492,
    "longitude": -2.5768,
    "capacite": 2500,
    "annee": 2006,
    "styles": [
      "Drum & Bass",
      "Jungle",
      "UK Bass",
      "Techno"
    ],
    "site": "https://motion-bristol.com",
    "description": {
      "fr": "Ensemble d’entrepôts victoriens en marbre au bord de la rivière Avon à Bristol, berceau des grandes nuits drum & bass, jungle et bass music britanniques.",
      "en": "Complex of Victorian marble warehouses on the River Avon in Bristol, the spiritual home of massive UK drum & bass, jungle and bass music nights."
    }
  },
  {
    "id": "sub-club-glasgow",
    "nom": "Sub Club Glasgow",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "bristol-gb",
    "ville": {
      "fr": "Glasgow",
      "en": "Glasgow"
    },
    "latitude": 55.8569,
    "longitude": -4.2578,
    "capacite": 420,
    "annee": 1987,
    "styles": [
      "House",
      "Techno",
      "Acid House",
      "Electro"
    ],
    "site": "https://subclub.co.uk",
    "description": {
      "fr": "Plus ancien club souterrain du monde en activité continue depuis 1987 rue Jamaica à Glasgow, célèbre pour sa résidence Subculture (Harri & Domenic) et son plancher bodysonic.",
      "en": "World’s longest-running underground dance club operating since 1987 on Jamaica Street in Glasgow, famous for its Subculture residency and bodysonic dancefloor."
    }
  },
  {
    "id": "strange-brew-bristol",
    "nom": "Strange Brew",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "bristol-gb",
    "ville": {
      "fr": "Bristol",
      "en": "Bristol"
    },
    "latitude": 51.4556,
    "longitude": -2.5928,
    "capacite": 350,
    "annee": 2020,
    "styles": [
      "UK Bass",
      "Dub",
      "Leftfield",
      "Electro"
    ],
    "site": "https://strangebrewbristol.com",
    "description": {
      "fr": "Espace indépendant de Fairfax Street au coeur de Bristol, fidèle à l’esprit sound system, dub et leftfield de la ville.",
      "en": "Independent venue on Fairfax Street in central Bristol championing the city’s deep sound-system, dub and leftfield electronic heritage."
    }
  },
  {
    "id": "club-space-miami",
    "nom": "Club Space",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami",
      "en": "Miami"
    },
    "latitude": 25.7848,
    "longitude": -80.1932,
    "capacite": 1200,
    "annee": 2000,
    "styles": [
      "Tech House",
      "House",
      "Techno",
      "Melodic Techno"
    ],
    "site": "https://clubspace.com",
    "description": {
      "fr": "Institution mondiale de Downtown Miami ouverte 24 heures sur 24 le week-end, célèbre pour sa Terrace au toit translucide où les sets s’étirent tout le dimanche.",
      "en": "World-famous 24-hour Downtown Miami institution celebrated for its sunlit Terrace where marathon DJ sets run past noon on Sundays."
    }
  },
  {
    "id": "floyd-miami",
    "nom": "Floyd Miami",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami",
      "en": "Miami"
    },
    "latitude": 25.7846,
    "longitude": -80.1934,
    "capacite": 250,
    "annee": 2017,
    "styles": [
      "House",
      "Leftfield",
      "Techno",
      "Disco"
    ],
    "site": "https://floydmiami.com",
    "description": {
      "fr": "Salle audiophile et feutrée nichée sous le Club Space à Miami, dédiée aux sélections house, techno et électroniques pointues.",
      "en": "Intimate audiophile room tucked beneath Club Space in Downtown Miami, dedicated to discerning house, techno and leftfield bookings."
    }
  },
  {
    "id": "jolene-sound-room-miami",
    "nom": "Jolene Sound Room",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami",
      "en": "Miami"
    },
    "latitude": 25.7762,
    "longitude": -80.1918,
    "capacite": 300,
    "annee": 2023,
    "styles": [
      "House",
      "Disco",
      "Deep House",
      "Minimal"
    ],
    "site": "https://jolenesoundroom.com",
    "description": {
      "fr": "Sous-sol audiophile du centre de Miami inspiré du Paradise Garage, équipé d’un système sonore Phonic Technologies sur mesure.",
      "en": "Audiophile basement in Downtown Miami inspired by the Paradise Garage and outfitted with a custom Phonic Technologies sound system."
    }
  },
  {
    "id": "public-works-sf",
    "nom": "Public Works",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "sanfrancisco-us",
    "ville": {
      "fr": "San Francisco",
      "en": "San Francisco"
    },
    "latitude": 37.7689,
    "longitude": -122.4192,
    "capacite": 900,
    "annee": 2010,
    "styles": [
      "House",
      "Techno",
      "Bass",
      "Disco"
    ],
    "site": "https://publicsf.com",
    "description": {
      "fr": "Entrepôt à deux niveaux du quartier de Mission à San Francisco équipé d’un système Funktion-One et d’un plancher en bois suspendu.",
      "en": "Two-level warehouse club in San Francisco’s Mission District featuring a sprung hardwood dancefloor and Funktion-One sound."
    }
  },
  {
    "id": "the-great-northern-sf",
    "nom": "The Great Northern",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "sanfrancisco-us",
    "ville": {
      "fr": "San Francisco",
      "en": "San Francisco"
    },
    "latitude": 37.7676,
    "longitude": -122.4064,
    "capacite": 750,
    "annee": 2016,
    "styles": [
      "House",
      "Techno",
      "Tech House",
      "Breaks"
    ],
    "site": "https://thegreatnorthernsf.com",
    "description": {
      "fr": "Vaste salle Art déco aux plafonds de 10 mètres dans le quartier de Potrero à San Francisco, haut lieu des nuits house et techno de la baie.",
      "en": "Art Deco corner warehouse with 30-foot ceilings in San Francisco’s Potrero district, a premier Bay Area house and techno venue."
    }
  },
  {
    "id": "halcyon-sf",
    "nom": "Halcyon",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "sanfrancisco-us",
    "ville": {
      "fr": "San Francisco",
      "en": "San Francisco"
    },
    "latitude": 37.7714,
    "longitude": -122.4138,
    "capacite": 450,
    "annee": 2016,
    "styles": [
      "Techno",
      "Melodic Techno",
      "House",
      "Progressive House"
    ],
    "site": "https://halcyon-sf.com",
    "description": {
      "fr": "Brique industrielle du quartier SoMa à San Francisco détenant l’une des rares licences 24 heures de la ville pour les marathons techno et house.",
      "en": "Brick warehouse in San Francisco’s SoMa district holding a rare 24-hour operating permit for extended techno and house marathons."
    }
  },
  {
    "id": "the-black-box-denver",
    "nom": "The Black Box",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "denver-us",
    "ville": {
      "fr": "Denver (Colorado)",
      "en": "Denver (Colorado)"
    },
    "latitude": 39.7398,
    "longitude": -104.9832,
    "capacite": 400,
    "annee": 2016,
    "styles": [
      "Dubstep",
      "Bass",
      "Drum & Bass",
      "Halftime"
    ],
    "site": "https://blackboxdenver.co",
    "description": {
      "fr": "Capitale américaine de la culture sound system et de la bass music sur East Colfax à Denver, dotée de deux salles équipées en Basscouch et PK Sound.",
      "en": "America’s premier underground bass music and sound-system sanctuary on East Colfax in Denver, featuring two rooms tuned for deep sub-bass."
    }
  },
  {
    "id": "the-concourse-project-austin",
    "nom": "The Concourse Project",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "denver-us",
    "ville": {
      "fr": "Austin (Texas)",
      "en": "Austin (Texas)"
    },
    "latitude": 30.2078,
    "longitude": -97.6692,
    "capacite": 2500,
    "annee": 2021,
    "styles": [
      "Techno",
      "House",
      "Melodic Techno",
      "Tech House"
    ],
    "site": "https://concourseproject.com",
    "description": {
      "fr": "Immense hangar électronique d’Austin au Texas conçu par l’équipe du Seismic Dance Event, accueillant les plus grandes productions techno et house.",
      "en": "Massive electronic warehouse venue in Austin, Texas built by the Seismic Dance Event team, hosting world-class techno and house productions."
    }
  },
  {
    "id": "kingdom-austin",
    "nom": "Kingdom",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "denver-us",
    "ville": {
      "fr": "Austin (Texas)",
      "en": "Austin (Texas)"
    },
    "latitude": 30.2672,
    "longitude": -97.7428,
    "capacite": 450,
    "annee": 2011,
    "styles": [
      "House",
      "Techno",
      "Tech House",
      "Progressive House"
    ],
    "site": "https://kingdomaustin.com",
    "description": {
      "fr": "Club souterrain du centre d’Austin au Texas dédié aux nuits house et techno jusqu’à l’aube.",
      "en": "Downtown Austin underground club dedicated to late-night house and techno sessions."
    }
  },
  {
    "id": "pz-city-club-montpellier",
    "nom": "PZ City Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier",
      "en": "Montpellier"
    },
    "latitude": 43.6142,
    "longitude": 3.8784,
    "capacite": 350,
    "annee": 2013,
    "styles": [
      "House",
      "Minimal",
      "Microhouse",
      "Techno"
    ],
    "site": "https://pzcityclub.fr",
    "description": {
      "fr": "Institution souterraine du Quai du Verdanson en plein coeur de Montpellier, dédiée sur deux niveaux à la house, à la minimal, à la micro-house et à la techno pointue.",
      "en": "Underground institution on Quai du Verdanson in central Montpellier, dedicated across two levels to house, minimal, microhouse and cutting-edge techno."
    }
  },
  {
    "id": "halle-tropisme-montpellier",
    "nom": "Halle Tropisme (Club Tropisme)",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier",
      "en": "Montpellier"
    },
    "latitude": 43.6004,
    "longitude": 3.8618,
    "capacite": 1000,
    "annee": 2019,
    "styles": [
      "House",
      "Electro",
      "Techno",
      "Global Club"
    ],
    "site": "https://tropisme.coop",
    "description": {
      "fr": "Friche industrielle et culturelle de 10 000 m² dans les anciens ateliers militaires de Fontcouverte à Montpellier, épicentre des soirées Club Tropisme, des open airs et du festival Dernier Cri.",
      "en": "10,000-square-meter industrial cultural compound inside former military workshops in Montpellier, the epicenter of Club Tropisme nights, open-airs and the Dernier Cri festival."
    }
  },
  {
    "id": "la-dune-grande-motte",
    "nom": "La Dune Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (La Grande-Motte)",
      "en": "Montpellier (La Grande-Motte)"
    },
    "latitude": 43.5568,
    "longitude": 4.0412,
    "capacite": 2000,
    "annee": 1998,
    "styles": [
      "Tech House",
      "House",
      "Melodic Techno",
      "Techno"
    ],
    "site": "https://laduneclub.com",
    "description": {
      "fr": "Club en bord de mer mythique du Grand Travers aux portes de Montpellier, accueillant tout l’été les plus grandes têtes d’affiche house, tech house et techno internationales.",
      "en": "Mythic beachfront club at Grand Travers near Montpellier, hosting major international house, tech house and techno headliners all summer long."
    }
  },
  {
    "id": "heat-club-montpellier",
    "nom": "Heat Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Saint-Jean-de-Védas)",
      "en": "Montpellier (Saint-Jean-de-Védas)"
    },
    "latitude": 43.5682,
    "longitude": 3.8354,
    "capacite": 1200,
    "annee": 2014,
    "styles": [
      "Tech House",
      "House",
      "Electro",
      "Techno"
    ],
    "site": "https://heatclub.tv",
    "description": {
      "fr": "Grand club du complexe Le Colisée au sud-ouest de Montpellier, équipé d’un mur LED monumental et d’un système L-Acoustics accueillant DJs internationaux tech house et électro.",
      "en": "Large club in the Colisée complex southwest of Montpellier, outfitted with a monumental LED wall and L-Acoustics sound system hosting international tech house and electro DJs."
    }
  },
  {
    "id": "victoire-2-montpellier",
    "nom": "Victoire 2",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Domaine du Mas de Grille)",
      "en": "Montpellier (Mas de Grille)"
    },
    "latitude": 43.5698,
    "longitude": 3.8292,
    "capacite": 700,
    "annee": 1991,
    "styles": [
      "Electro",
      "Techno",
      "Bass",
      "Live Electronic"
    ],
    "site": "https://victoire2.com",
    "description": {
      "fr": "Scène des musiques actuelles de la métropole de Montpellier, accueillant lives électroniques, nuits techno, bass music et résidences de producteurs locaux.",
      "en": "Contemporary music venue of Greater Montpellier hosting live electronic acts, techno nights, bass music and local producer showcases."
    }
  },
  {
    "id": "panama-club-montpellier",
    "nom": "Panama Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier",
      "en": "Montpellier"
    },
    "latitude": 43.6054,
    "longitude": 3.8789,
    "capacite": 500,
    "annee": 2015,
    "styles": [
      "House",
      "Tech House",
      "Afro House",
      "Disco"
    ],
    "site": "https://www.instagram.com/panamaclubmtp/",
    "description": {
      "fr": "Club nocturne central près de la gare Saint-Roch à Montpellier, prisé pour ses nuits house, tech house et afro house jusqu’au matin.",
      "en": "Central nightclub near Saint-Roch station in Montpellier, popular for its all-night house, tech house and afro house sessions."
    }
  },
  {
    "id": "l-entrepot-montpellier",
    "nom": "L’Entrepôt",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Lattes)",
      "en": "Montpellier (Lattes)"
    },
    "latitude": 43.5752,
    "longitude": 3.8964,
    "capacite": 600,
    "annee": 2012,
    "styles": [
      "Dub",
      "Drum & Bass",
      "Techno",
      "Bass"
    ],
    "site": "https://www.instagram.com/lentrepot.montpellier/",
    "description": {
      "fr": "Hangar alternatif de l’agglomération montpelliéraine à Lattes accueillant raves, soirées bass music, dub sound system, drum & bass et techno.",
      "en": "Alternative warehouse venue in Lattes on the southern edge of Montpellier hosting raves, bass music, dub sound systems, drum & bass and techno."
    }
  },
  {
    "id": "paloma-nimes-montpellier",
    "nom": "Paloma",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Nîmes / Montpellier",
      "en": "Nîmes / Montpellier"
    },
    "latitude": 43.8492,
    "longitude": 4.4058,
    "capacite": 1350,
    "annee": 2012,
    "styles": [
      "Techno",
      "Electro",
      "House",
      "Experimental"
    ],
    "site": "https://paloma-nimes.fr",
    "description": {
      "fr": "Grand complexe architectural des musiques actuelles entre Montpellier et Nîmes doté d’une nef de 1 350 places et d’un club, haut lieu des nuits électroniques régionales.",
      "en": "Landmark contemporary music complex between Montpellier and Nîmes featuring a 1,350-capacity hall and club room dedicated to electronic and independent nights."
    }
  },
  {
    "id": "worldwide-festival-sete",
    "nom": "Worldwide Festival Sète",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Sète / Montpellier (Théâtre de la Mer)",
      "en": "Sète / Montpellier (Théâtre de la Mer)"
    },
    "latitude": 43.3928,
    "longitude": 3.6932,
    "capacite": 8000,
    "annee": 2006,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "House",
      "Broken Beat",
      "Leftfield",
      "Nu Jazz",
      "Techno"
    ],
    "site": "https://worldwidefestival.com",
    "description": {
      "fr": "Festival culte fondé par Gilles Peterson à Sète aux portes de Montpellier, entre l’amphithéâtre du Théâtre de la Mer suspendu au-dessus de la Méditerranée et les scènes de plage.",
      "en": "Iconic festival founded by Gilles Peterson in Sète near Montpellier, staged between the cliffside Théâtre de la Mer amphitheater above the Mediterranean and daytime beach stages."
    }
  },
  {
    "id": "i-love-techno-europe-montpellier",
    "nom": "I Love Techno Europe",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Parc des Expositions)",
      "en": "Montpellier (Parc des Expositions)"
    },
    "latitude": 43.5724,
    "longitude": 3.9518,
    "capacite": 35000,
    "annee": 2011,
    "mois": {
      "fr": "Décembre / Printemps",
      "en": "December / Spring"
    },
    "styles": [
      "Techno",
      "Hard Techno",
      "Drum & Bass",
      "Electro"
    ],
    "site": "https://ilovetechnoeurope.com",
    "description": {
      "fr": "Édition française du légendaire festival belge qui transforme les immenses halls du Parc des Expositions de Montpellier en capitale européenne de la techno et de la drum & bass.",
      "en": "French edition of the legendary Belgian festival transforming the massive halls of Montpellier’s Parc des Expositions into a European techno and drum & bass capital."
    }
  },
  {
    "id": "festival-dernier-cri-montpellier",
    "nom": "Festival Dernier Cri",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Halle Tropisme, Dieze & clubs)",
      "en": "Montpellier (Halle Tropisme, Dieze & clubs)"
    },
    "latitude": 43.6008,
    "longitude": 3.8624,
    "capacite": 8000,
    "annee": 2019,
    "mois": {
      "fr": "Octobre - Novembre",
      "en": "October - November"
    },
    "styles": [
      "Techno",
      "House",
      "Electro",
      "Leftfield"
    ],
    "site": "https://festivalderniercri.com",
    "description": {
      "fr": "Festival montpelliérain dédié aux musiques électroniques indépendantes et aux cultures club, investissant simultanément la Halle Tropisme, le Rockstore, le Dieze Warehouse et le PZ City Club.",
      "en": "Montpellier festival dedicated to independent electronic music and club culture, taking over Halle Tropisme, Rockstore, Dieze Warehouse and PZ City Club across the city."
    }
  },
  {
    "id": "tohu-bohu-montpellier",
    "nom": "Festival Tohu-Bohu",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Promenade du Peyrou)",
      "en": "Montpellier (Promenade du Peyrou)"
    },
    "latitude": 43.6114,
    "longitude": 3.8704,
    "capacite": 12000,
    "annee": 2001,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "Electro",
      "Techno",
      "House",
      "Electronica"
    ],
    "site": "https://lefestival.eu",
    "description": {
      "fr": "Rendez-vous électronique estival gratuit en plein air au coeur de Montpellier dans le cadre du Festival Radio France Occitanie Montpellier.",
      "en": "Free open-air summer electronic music festival in the historic heart of Montpellier staged as part of Festival Radio France Occitanie Montpellier."
    }
  },
  {
    "id": "club-peyrou-montpellier",
    "nom": "Club Peyrou (Open Air)",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Place Royale du Peyrou)",
      "en": "Montpellier (Place Royale du Peyrou)"
    },
    "latitude": 43.6118,
    "longitude": 3.8698,
    "capacite": 5000,
    "annee": 2018,
    "mois": {
      "fr": "Juin - Août",
      "en": "June - August"
    },
    "styles": [
      "House",
      "Disco",
      "Techno",
      "Indie Dance"
    ],
    "site": "https://www.montpellier-tourisme.fr",
    "description": {
      "fr": "Grands open airs électroniques organisés sur l’esplanade royale du Peyrou face à l’aqueduc Saint-Clément à Montpellier, mêlant house, disco et techno au coucher du soleil.",
      "en": "Large open-air electronic gatherings on Montpellier’s historic Place Royale du Peyrou facing the Saint-Clément aqueduct, blending house, disco and techno at sunset."
    }
  },
  {
    "id": "madame-loyal-montpellier",
    "nom": "Madame Loyal Montpellier",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier",
      "en": "Montpellier"
    },
    "latitude": 43.6148,
    "longitude": 3.9284,
    "capacite": 12000,
    "annee": 2023,
    "mois": {
      "fr": "Mai & Septembre",
      "en": "May & September"
    },
    "styles": [
      "House",
      "Techno",
      "Trance",
      "Hard Techno"
    ],
    "site": "https://madameloyal.com",
    "description": {
      "fr": "Fête foraine électronique géante sous chapiteaux de cirque à Montpellier, réunissant manèges, arts du cirque et plusieurs scènes house, techno et trance.",
      "en": "Open-air electronic funfair and circus festival in Montpellier combining carnival rides, circus performers and multiple house, techno and trance stages."
    }
  },
  {
    "id": "laut-barcelone",
    "nom": "LAUT",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Poble-sec)",
      "en": "Barcelona (Poble-sec)"
    },
    "latitude": 41.3742,
    "longitude": 2.1694,
    "capacite": 250,
    "annee": 2016,
    "styles": [
      "Techno",
      "Electro",
      "Leftfield",
      "Experimental"
    ],
    "site": "https://laut.es",
    "description": {
      "fr": "Sanctuaire audiophile du quartier de Poble-sec à Barcelone, dédié aux musiques électroniques d’avant-garde, à la techno hypnotique et à l’electro avec un système Kasen sur mesure.",
      "en": "Audiophile sanctuary in Barcelona’s Poble-sec district dedicated to cutting-edge electronic music, hypnotic techno and electro on a custom Kasen sound system."
    }
  },
  {
    "id": "la-terrrazza-barcelone",
    "nom": "La Terrrazza",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Montjuïc)",
      "en": "Barcelona (Montjuïc)"
    },
    "latitude": 41.3688,
    "longitude": 2.1482,
    "capacite": 1200,
    "annee": 1995,
    "styles": [
      "House",
      "Tech House",
      "Deep House",
      "Techno"
    ],
    "site": "https://laterrrazza.com",
    "description": {
      "fr": "Club à ciel ouvert mythique niché dans une hacienda du Poble Espanyol sur la colline de Montjuïc à Barcelone, célébrant la house et la techno sous les étoiles de mai à octobre.",
      "en": "Iconic open-air club set inside a manor courtyard of Poble Espanyol on Montjuïc hill in Barcelona, celebrating house and techno under the stars from May to October."
    }
  },
  {
    "id": "les-enfants-brillantes-barcelone",
    "nom": "Les Enfants Brillantes",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (El Raval)",
      "en": "Barcelona (El Raval)"
    },
    "latitude": 41.3774,
    "longitude": 2.1748,
    "capacite": 400,
    "annee": 1965,
    "styles": [
      "Minimal",
      "House",
      "Electro",
      "Tech House"
    ],
    "site": "https://lesenfantsclub.com",
    "description": {
      "fr": "Plus ancien club en activité près de La Rambla dans le Raval à Barcelone, métamorphosé en repaire underground hi-fi équipé L-Acoustics pour la minimal, l’electro et la house.",
      "en": "Barcelona’s oldest operating club off Las Ramblas in El Raval, reborn as a hi-fi underground hub with L-Acoustics sound dedicated to minimal, electro and house."
    }
  },
  {
    "id": "sala-upload-barcelone",
    "nom": "Sala Upload",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Montjuïc)",
      "en": "Barcelona (Montjuïc)"
    },
    "latitude": 41.3692,
    "longitude": 2.1476,
    "capacite": 500,
    "annee": 2011,
    "styles": [
      "Techno",
      "Acid",
      "Trance",
      "Experimental"
    ],
    "site": "https://sala-upload.com",
    "description": {
      "fr": "Salle indépendante du Poble Espanyol à Barcelone dotée d’un système Funktion-One, prisée des collectifs techno queer (Maricas), acid et électroniques expérimentaux.",
      "en": "Independent venue inside Poble Espanyol in Barcelona outfitted with Funktion-One sound, favored by queer techno collectives (Maricas), acid and experimental raves."
    }
  },
  {
    "id": "m7-club-barcelone",
    "nom": "M7 Club",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Sants-Montjuïc)",
      "en": "Barcelona (Sants-Montjuïc)"
    },
    "latitude": 41.3718,
    "longitude": 2.1504,
    "capacite": 450,
    "annee": 2018,
    "styles": [
      "Hard Techno",
      "Techno",
      "Hard Groove",
      "Industrial"
    ],
    "site": "https://m7club.es",
    "description": {
      "fr": "Bastion brut de Sants-Montjuïc à Barcelone dédié aux tempos rapides, à la hard techno, au hard groove et aux collectifs rave locaux.",
      "en": "Raw underground stronghold in Barcelona’s Sants-Montjuïc district dedicated to fast tempos, hard techno, hard groove and local rave collectives."
    }
  },
  {
    "id": "garage-442-barcelone",
    "nom": "Garage 442",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Eixample)",
      "en": "Barcelona (Eixample)"
    },
    "latitude": 41.3972,
    "longitude": 2.1584,
    "capacite": 200,
    "annee": 2016,
    "styles": [
      "House",
      "Electro",
      "Disco",
      "Minimal"
    ],
    "site": "https://garage442.com",
    "description": {
      "fr": "Micro-club audiophile logé au rez-de-chaussée de la moderniste Casa Comalat sur l’Avinguda Diagonal à Barcelone, où le DJ mixe à hauteur de piste sur un système Funktion-One.",
      "en": "Intimate audiophile micro-club on the ground floor of the modernist Casa Comalat on Avinguda Diagonal in Barcelona, featuring a floor-level booth and Funktion-One sound."
    }
  },
  {
    "id": "la-paloma-barcelone",
    "nom": "La Paloma",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (El Raval)",
      "en": "Barcelona (El Raval)"
    },
    "latitude": 41.3826,
    "longitude": 2.1636,
    "capacite": 900,
    "annee": 1903,
    "styles": [
      "House",
      "Disco",
      "Electro",
      "Indie Dance"
    ],
    "site": "https://lapalomabcn.com",
    "description": {
      "fr": "Plus ancienne salle de bal d’Europe ouverte en 1903 dans le Raval à Barcelone, dont le décor baroque doré et le lustre monumental accueillent des nuits house, disco et électroniques.",
      "en": "Europe’s oldest operating dance hall opened in 1903 in Barcelona’s El Raval, whose gilded baroque interior and grand chandelier host curated house, disco and electronic nights."
    }
  },
  {
    "id": "city-hall-barcelone",
    "nom": "City Hall",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Plaça de Catalunya)",
      "en": "Barcelona (Plaça de Catalunya)"
    },
    "latitude": 41.3879,
    "longitude": 2.1692,
    "capacite": 500,
    "annee": 2005,
    "styles": [
      "Techno",
      "Tech House",
      "House",
      "Minimal"
    ],
    "site": "https://cityhallbarcelona.com",
    "description": {
      "fr": "Ancien théâtre du XIXe siècle au pied de la Plaça de Catalunya à Barcelone reconverti en club techno et house avec jardin-terrasse et système Martin Audio.",
      "en": "Nineteenth-century former theater at the foot of Plaça de Catalunya in Barcelona converted into a techno and house club with a garden terrace and Martin Audio sound."
    }
  },
  {
    "id": "elrow-row14-barcelone",
    "nom": "elrow (Row 14 Viladecans)",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Viladecans)",
      "en": "Barcelona (Viladecans)"
    },
    "latitude": 41.2842,
    "longitude": 2.0368,
    "capacite": 3500,
    "annee": 2008,
    "styles": [
      "Tech House",
      "House",
      "Techno",
      "Hard Techno"
    ],
    "site": "https://elrow.com",
    "description": {
      "fr": "Berceau historique d’elrow aux portes sud de Barcelone à Viladecans, où sont nées les célèbres matinées immersives et théâtrales de la famille Arnau.",
      "en": "Historic birthplace of elrow just south of Barcelona in Viladecans, where the Arnau family launched their world-famous theatrical daytime-to-night raves."
    }
  },
  {
    "id": "sala-meteoro-barcelone",
    "nom": "Sala Meteoro",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Poble-sec)",
      "en": "Barcelona (Poble-sec)"
    },
    "latitude": 41.3728,
    "longitude": 2.1712,
    "capacite": 150,
    "annee": 2016,
    "styles": [
      "Experimental",
      "EBM",
      "Industrial",
      "Bass"
    ],
    "site": "https://meteorobcn.com",
    "description": {
      "fr": "Laboratoire contre-culturel et club autogéré de Poble-sec à Barcelone, épicentre des soirées expérimentales, EBM, club déconstruit et techno industrielle.",
      "en": "Countercultural laboratory and self-run venue in Barcelona’s Poble-sec district, an epicenter for experimental electronics, EBM, deconstructed club and industrial techno."
    }
  },
  {
    "id": "primavera-bits-barcelone",
    "nom": "Primavera Sound (Primavera Bits & Warehouse)",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Parc del Fòrum)",
      "en": "Barcelona (Parc del Fòrum)"
    },
    "latitude": 41.4102,
    "longitude": 2.2254,
    "capacite": 25000,
    "annee": 2016,
    "mois": {
      "fr": "Mai - Juin",
      "en": "May - June"
    },
    "styles": [
      "Techno",
      "House",
      "Electronica",
      "Leftfield",
      "IDM"
    ],
    "site": "https://primaverasound.com",
    "description": {
      "fr": "Volet électronique monumental de Primavera Sound au Parc del Fòrum de Barcelone, réunissant les scènes en bord de mer et le hangar Warehouse dédiés à la techno, à la house et aux lives jusqu’au lever du soleil.",
      "en": "Monumental electronic wing of Primavera Sound at Barcelona’s Parc del Fòrum, uniting seaside dance stages and the subterranean Warehouse for techno, house and live electronics until sunrise."
    }
  },
  {
    "id": "mutek-barcelona",
    "nom": "MUTEK Barcelona",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Sala Apolo, Roca Umbert & Estrella Damm)",
      "en": "Barcelona"
    },
    "latitude": 41.3746,
    "longitude": 2.1698,
    "capacite": 5000,
    "annee": 2010,
    "mois": {
      "fr": "Mars - Avril",
      "en": "March - April"
    },
    "styles": [
      "Experimental",
      "Ambient",
      "Techno",
      "Electronica"
    ],
    "site": "https://barcelona.mutek.org",
    "description": {
      "fr": "Antenne catalane du festival international MUTEK dédiée à la créativité numérique, aux performances audiovisuelles et aux musiques électroniques d’avant-garde à Barcelone.",
      "en": "Catalan edition of the international MUTEK festival dedicated to digital creativity, audiovisual live performances and avant-garde electronic music across Barcelona."
    }
  },
  {
    "id": "ombra-festival-barcelone",
    "nom": "Ombra Festival",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Fabra i Coats & Utopia 126)",
      "en": "Barcelona (Fabra i Coats & Utopia 126)"
    },
    "latitude": 41.4328,
    "longitude": 2.1904,
    "capacite": 3000,
    "annee": 2018,
    "mois": {
      "fr": "Novembre - Décembre",
      "en": "November - December"
    },
    "styles": [
      "EBM",
      "Industrial",
      "Electro",
      "Darkwave"
    ],
    "site": "https://ombrafestival.com",
    "description": {
      "fr": "Festival de référence en Europe pour l’EBM, l’electro sombre, la minimal synth et la techno industrielle, investi dans d’anciennes usines textiles de Barcelone.",
      "en": "Europe’s premier gathering for EBM, dark electro, minimal synth and industrial techno, staged inside historic former textile factories in Barcelona."
    }
  },
  {
    "id": "soundit-barcelone",
    "nom": "SOUNDIT Festival",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Plaça Monumental & Parc Nou)",
      "en": "Barcelona (Monumental & Parc Nou)"
    },
    "latitude": 41.4002,
    "longitude": 2.1812,
    "capacite": 8000,
    "annee": 2014,
    "mois": {
      "fr": "Mai - Novembre",
      "en": "May - November"
    },
    "styles": [
      "House",
      "Techno",
      "Disco",
      "UK Bass"
    ],
    "site": "https://soundit.es",
    "description": {
      "fr": "Série d’open airs et festival électronique barcelonais reconnu pour la finesse de sa direction artistique house, techno, disco et bass music en plein air.",
      "en": "Barcelona open-air electronic series and festival acclaimed for its curatorial depth across house, techno, disco and bass music."
    }
  },
  {
    "id": "piknic-electronik-barcelone",
    "nom": "Piknic Électronik Barcelona",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Jardins de Joan Brossa, Montjuïc)",
      "en": "Barcelona (Montjuïc)"
    },
    "latitude": 41.3682,
    "longitude": 2.1642,
    "capacite": 6000,
    "annee": 2012,
    "mois": {
      "fr": "Mai - Septembre",
      "en": "May - September"
    },
    "styles": [
      "House",
      "Techno",
      "Tech House",
      "Melodic Techno"
    ],
    "site": "https://piknicelectronik.es",
    "description": {
      "fr": "Édition barcelonaise du rendez-vous dominical montréalais dans les jardins ombragés de Montjuïc, devenue l’institution des dimanches électroniques en plein air à Barcelone.",
      "en": "Barcelona edition of the Montreal Sunday open-air ritual held in the shaded gardens of Montjuïc, a summer institution for daytime house and techno."
    }
  },
  {
    "id": "centre-bell-montreal",
    "nom": "Centre Bell",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Centre-ville)",
      "en": "Montreal (Downtown)"
    },
    "latitude": 45.4961,
    "longitude": -73.5693,
    "capacite": 21000,
    "annee": 1996,
    "styles": [
      "Progressive House",
      "Techno",
      "Melodic Techno",
      "Electro"
    ],
    "site": "https://www.centrebell.ca",
    "description": {
      "fr": "Le plus grand amphithéâtre couvert de Montréal, hôte des tournées mondiales d’aréna des géants de la musique électronique (Justice, Fred again.., Rüfüs Du Sol, Deadmau5, Kraftwerk).",
      "en": "Montreal’s largest indoor arena, hosting world-touring electronic music headliners such as Justice, Fred again.., Rüfüs Du Sol, Deadmau5 and Kraftwerk."
    }
  },
  {
    "id": "grand-quai-montreal",
    "nom": "Grand Quai du Port de Montréal",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Vieux-Port)",
      "en": "Montreal (Old Port)"
    },
    "latitude": 45.5021,
    "longitude": -73.5518,
    "capacite": 5000,
    "annee": 2018,
    "styles": [
      "House",
      "Techno",
      "Tech House",
      "Progressive House"
    ],
    "site": "https://www.port-montreal.com/fr/grand-quai",
    "description": {
      "fr": "Esplanade maritime et terminal contemporain sur le fleuve Saint-Laurent au Vieux-Port, scène des grands événements électroniques en plein air, d’Igloofest et des productions estivales.",
      "en": "Waterfront esplanade and contemporary terminal on the Saint Lawrence River in the Old Port, staging major open-air electronic events, Igloofest and summer showcases."
    }
  },
  {
    "id": "esplanade-tranquille-montreal",
    "nom": "Esplanade Tranquille (Quartier des spectacles)",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Quartier des spectacles)",
      "en": "Montreal (Quartier des spectacles)"
    },
    "latitude": 45.5089,
    "longitude": -73.5653,
    "capacite": 5000,
    "annee": 2021,
    "styles": [
      "Techno",
      "IDM",
      "Ambient",
      "Electro"
    ],
    "site": "https://www.quartierdesspectacles.com",
    "description": {
      "fr": "Grande place publique au coeur du Quartier des spectacles accueillant chaque été la scène extérieure gratuite de MUTEK Montréal et de nombreuses performances audiovisuelles.",
      "en": "Central public plaza in the Quartier des spectacles hosting MUTEK Montreal’s free outdoor stage and major audiovisual performances every summer."
    }
  },
  {
    "id": "auditorium-verdun-montreal",
    "nom": "Auditorium de Verdun",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Verdun)",
      "en": "Montreal (Verdun)"
    },
    "latitude": 45.4596,
    "longitude": -73.5644,
    "capacite": 4100,
    "annee": 1939,
    "styles": [
      "Bass",
      "Techno",
      "Electro",
      "Drum & Bass"
    ],
    "site": "https://auditoriumdeverdun.com",
    "description": {
      "fr": "Aréna historique des berges de Verdun entièrement rénové, accueillant de grandes productions électroniques, concerts bass music et tournées internationales.",
      "en": "Historic riverside arena in Verdun, fully renovated and hosting large-scale electronic productions, bass music concerts and international tours."
    }
  },
  {
    "id": "olympia-montreal",
    "nom": "L’Olympia de Montréal",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Village)",
      "en": "Montreal (Village)"
    },
    "latitude": 45.5162,
    "longitude": -73.5579,
    "capacite": 2400,
    "annee": 1925,
    "styles": [
      "Electro",
      "House",
      "Techno",
      "Indie Dance"
    ],
    "site": "https://www.olympiamontreal.com",
    "description": {
      "fr": "Ancien palais du cinéma de 1925 sur la rue Sainte-Catherine Est, grande salle de spectacle privilégiée pour les tournées live électroniques (Caribou, Polo & Pan, Disclosure, Moderat).",
      "en": "Former 1925 movie palace on Sainte-Catherine Street East, a premier concert hall for major live electronic tours including Caribou, Polo & Pan, Disclosure and Moderat."
    }
  },
  {
    "id": "theatre-beanfield-montreal",
    "nom": "Théâtre Beanfield",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Petite-Bourgogne)",
      "en": "Montreal (Little Burgundy)"
    },
    "latitude": 45.4822,
    "longitude": -73.5754,
    "capacite": 1500,
    "annee": 1912,
    "styles": [
      "Electronica",
      "IDM",
      "UK Garage",
      "Deep House"
    ],
    "site": "https://www.theatrebeanfield.ca",
    "description": {
      "fr": "Ancien Théâtre Corona de la Petite-Bourgogne, salle à l’acoustique chaleureuse où se produisent les lives électroniques majeurs (Overmono, Floating Points, Bonobo, Four Tet).",
      "en": "Formerly the Corona Theatre in Little Burgundy, an acoustically warm 1912 hall hosting leading live electronic acts such as Overmono, Floating Points, Bonobo and Four Tet."
    }
  },
  {
    "id": "yoko-luna-montreal",
    "nom": "Yoko Luna",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Centre-ville)",
      "en": "Montreal (Downtown)"
    },
    "latitude": 45.4968,
    "longitude": -73.5741,
    "capacite": 800,
    "annee": 2022,
    "styles": [
      "House",
      "Tech House",
      "Afro House",
      "Deep House"
    ],
    "site": "https://www.yokoluna.com",
    "description": {
      "fr": "Grand club et salle nocturne de la rue de la Montagne au centre-ville, accueillant DJ internationaux house, afro house et tech house dans un décor scénographié.",
      "en": "Large nightlife venue on De la Montagne Street in downtown Montreal, hosting international house, afro house and tech house DJs."
    }
  },
  {
    "id": "studio-td-montreal",
    "nom": "Le Studio TD",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Quartier des spectacles)",
      "en": "Montreal (Quartier des spectacles)"
    },
    "latitude": 45.5059,
    "longitude": -73.5681,
    "capacite": 650,
    "annee": 2011,
    "styles": [
      "Electronica",
      "Synthwave",
      "Techno",
      "Bass"
    ],
    "site": "https://www.lestudiotd.com",
    "description": {
      "fr": "Salle de concert moderne sur la rue Sainte-Catherine Ouest (ancien Astral), étape régulière de MUTEK et des tournées synthwave, electronica, drum & bass et techno.",
      "en": "Modern concert hall on Sainte-Catherine Street West (formerly L’Astral), a regular stage for MUTEK and international synthwave, electronica and bass music tours."
    }
  },
  {
    "id": "la-voute-montreal",
    "nom": "La Voûte",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Vieux-Montréal)",
      "en": "Montreal (Old Montreal)"
    },
    "latitude": 45.5024,
    "longitude": -73.5592,
    "capacite": 600,
    "annee": 2017,
    "styles": [
      "Afro House",
      "Melodic Techno",
      "Deep House",
      "House"
    ],
    "site": "https://lavoutemontreal.com",
    "description": {
      "fr": "Installé dans l’ancienne salle des coffres de la Banque Royale (1928) rue Saint-Jacques au Vieux-Montréal, ce club souterrain mise sur l’afro house, la melodic techno et la deep house.",
      "en": "Set inside the historic 1928 Royal Bank vault on Saint-Jacques Street in Old Montreal, this subterranean club focuses on afro house, melodic techno and deep house."
    }
  },
  {
    "id": "soubois-montreal",
    "nom": "Soubois",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Centre-ville)",
      "en": "Montreal (Downtown)"
    },
    "latitude": 45.5008,
    "longitude": -73.5751,
    "capacite": 450,
    "annee": 2015,
    "styles": [
      "Deep House",
      "Afro House",
      "Tech House",
      "House"
    ],
    "site": "https://soubois.com",
    "description": {
      "fr": "Club souterrain du boulevard de Maisonneuve Ouest reconnu pour ses nuits deep house, afro house et tech house prolongées jusqu’à 3 heures du matin.",
      "en": "Subterranean club on De Maisonneuve Boulevard West known for its late-night deep house, afro house and tech house sessions."
    }
  },
  {
    "id": "bain-mathieu-montreal",
    "nom": "Bain Mathieu",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Hochelaga-Maisonneuve)",
      "en": "Montreal (Hochelaga-Maisonneuve)"
    },
    "latitude": 45.5376,
    "longitude": -73.5491,
    "capacite": 400,
    "annee": 1931,
    "styles": [
      "Techno",
      "Hard Techno",
      "Rave",
      "Bass"
    ],
    "site": "https://bainmathieu.ca",
    "description": {
      "fr": "Ancienne piscine municipale Art déco de 1931 rue Ontario Est dont le bassin vidé accueille raves techno, soirées immersives et collectifs underground montréalais.",
      "en": "Former 1931 Art Deco municipal bathhouse on Ontario Street East whose drained pool hosts techno raves, immersive nights and Montreal underground collectives."
    }
  },
  {
    "id": "sala-rossa-montreal",
    "nom": "La Sala Rossa",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Mile End)",
      "en": "Montreal (Mile End)"
    },
    "latitude": 45.5221,
    "longitude": -73.5912,
    "capacite": 250,
    "annee": 2001,
    "styles": [
      "IDM",
      "Ambient",
      "Experimental",
      "Electro"
    ],
    "site": "https://casadelpopolo.com",
    "description": {
      "fr": "Salle historique du Mile End boulevard Saint-Laurent, lieu phare du festival Suoni Per Il Popolo, de MUTEK et des musiques électroniques expérimentales et indépendantes.",
      "en": "Historic Mile End concert hall on Saint-Laurent Boulevard, a flagship venue for Suoni Per Il Popolo, MUTEK and independent experimental electronic music."
    }
  },
  {
    "id": "le-ministere-montreal",
    "nom": "Le Ministère",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Plateau Mont-Royal)",
      "en": "Montreal (Plateau Mont-Royal)"
    },
    "latitude": 45.5202,
    "longitude": -73.5861,
    "capacite": 250,
    "annee": 2016,
    "styles": [
      "Synthwave",
      "Electro",
      "Indie Dance",
      "IDM"
    ],
    "site": "https://leministere.ca",
    "description": {
      "fr": "Salle de spectacle et laboratoire sonore boulevard Saint-Laurent sur le Plateau, prisée pour son acoustique soignée lors des lives synth-pop, electro et modulaires.",
      "en": "Live venue and sonic laboratory on Saint-Laurent Boulevard in the Plateau, prized for its tuned acoustics during synth-pop, electro and modular live sets."
    }
  },
  {
    "id": "cabaret-berlin-montreal",
    "nom": "Cabaret Berlin",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Village)",
      "en": "Montreal (Village)"
    },
    "latitude": 45.5186,
    "longitude": -73.5554,
    "capacite": 200,
    "annee": 1991,
    "styles": [
      "EBM",
      "Industrial Techno",
      "Dark Disco",
      "Techno"
    ],
    "site": "https://www.instagram.com/cabaretberlinmtl",
    "description": {
      "fr": "Repaire nocturne alternatif de la rue Sainte-Catherine Est dans le Village, dédié aux nuits EBM, techno industrielle, darkwave, post-punk et collectifs raves locaux.",
      "en": "Alternative underground venue on Sainte-Catherine Street East in the Village, dedicated to EBM, industrial techno, darkwave and local rave collectives."
    }
  },
  {
    "id": "la-sotterenea-montreal",
    "nom": "La Sotterenea",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Mile End)",
      "en": "Montreal (Mile End)"
    },
    "latitude": 45.522,
    "longitude": -73.5913,
    "capacite": 150,
    "annee": 2017,
    "styles": [
      "Electro",
      "Bass",
      "Breaks",
      "Leftfield"
    ],
    "site": "https://casadelpopolo.com",
    "description": {
      "fr": "Salle souterraine logée sous La Sala Rossa boulevard Saint-Laurent, dédiée aux formats club underground, lives électroniques obliques et nuits bass music du Mile End.",
      "en": "Subterranean room beneath La Sala Rossa on Saint-Laurent Boulevard, hosting underground club nights, leftfield live electronics and bass music in the Mile End."
    }
  },
  {
    "id": "casa-del-popolo-montreal",
    "nom": "Casa del Popolo",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Mile End)",
      "en": "Montreal (Mile End)"
    },
    "latitude": 45.5223,
    "longitude": -73.5915,
    "capacite": 100,
    "annee": 2000,
    "styles": [
      "Ambient",
      "Experimental",
      "IDM",
      "Leftfield"
    ],
    "site": "https://casadelpopolo.com",
    "description": {
      "fr": "Institution indépendante du Mile End fondée en 2000 boulevard Saint-Laurent, laboratoire intime des scènes ambient, synthétiseurs modulaires, drone et électronique expérimentale.",
      "en": "Independent Mile End institution founded in 2000 on Saint-Laurent Boulevard, an intimate laboratory for ambient, modular synth, drone and experimental electronics."
    }
  },
  {
    "id": "place-des-arts-montreal",
    "nom": "Place des Arts (Théâtre Maisonneuve & Salle Wilfrid-Pelletier)",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Quartier des spectacles)",
      "en": "Montreal (Quartier des spectacles)"
    },
    "latitude": 45.5081,
    "longitude": -73.5668,
    "capacite": 2982,
    "annee": 1963,
    "styles": [
      "Ambient",
      "IDM",
      "Electronica",
      "Experimental"
    ],
    "site": "https://placedesarts.com",
    "description": {
      "fr": "Grand complexe culturel du Quartier des spectacles accueillant les soirées de gala A/VISIONS de MUTEK au Théâtre Maisonneuve ainsi que les grands concerts électroniques et néo-classiques.",
      "en": "Landmark performing arts complex in the Quartier des spectacles hosting MUTEK’s flagship A/VISIONS audiovisual galas at Théâtre Maisonneuve and major electronic concerts."
    }
  },
  {
    "id": "monument-national-montreal",
    "nom": "Monument-National (Salle Ludger-Duvernay & Hydro-Québec)",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Quartier des spectacles)",
      "en": "Montreal (Quartier des spectacles)"
    },
    "latitude": 45.5091,
    "longitude": -73.5631,
    "capacite": 800,
    "annee": 1893,
    "styles": [
      "IDM",
      "Ambient",
      "Experimental",
      "Techno"
    ],
    "site": "https://monumentnational.com",
    "description": {
      "fr": "Plus ancien théâtre en activité au Québec sur le boulevard Saint-Laurent, quartier général historique du festival MUTEK Montréal pour ses séries Nocturne et Métropolis.",
      "en": "Quebec’s oldest operating theater on Saint-Laurent Boulevard, serving as a historic headquarters for MUTEK Montreal’s Nocturne and audiovisual series."
    }
  },
  {
    "id": "usine-c-montreal",
    "nom": "Usine C",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Centre-Sud)",
      "en": "Montreal (Centre-Sud)"
    },
    "latitude": 45.5228,
    "longitude": -73.5562,
    "capacite": 450,
    "annee": 1995,
    "styles": [
      "Experimental",
      "Ambient",
      "IDM",
      "Electro"
    ],
    "site": "https://usine-c.com",
    "description": {
      "fr": "Ancienne usine de confiserie Raymond reconvertie en centre de création pluridisciplinaire dans le Centre-Sud, hôte de créations audiovisuelles, d’Akousma et de concerts électroniques.",
      "en": "Former Raymond jam factory transformed into a multidisciplinary creation center in Centre-Sud, hosting audiovisual premieres, Akousma electroacoustic nights and live electronics."
    }
  },
  {
    "id": "escogriffe-montreal",
    "nom": "L’Escogriffe Bar Spectacle",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Plateau Mont-Royal)",
      "en": "Montreal (Plateau Mont-Royal)"
    },
    "latitude": 45.5249,
    "longitude": -73.5831,
    "capacite": 200,
    "annee": 1999,
    "styles": [
      "EBM",
      "Synthwave",
      "Electro",
      "Dark Disco"
    ],
    "site": "https://lescogriffe.com",
    "description": {
      "fr": "Salle indépendante de la rue Saint-Denis sur le Plateau Mont-Royal, repaire des concerts synth-wave, EBM, electro-punk et des collectifs nocturnes montréalais.",
      "en": "Independent live room on Saint-Denis Street in the Plateau Mont-Royal, a staple for synthwave, EBM, electro-punk and late-night Montreal collectives."
    }
  },
  {
    "id": "zenith-sud-montpellier",
    "nom": "Zénith Sud Montpellier",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Domaine de Grammont)",
      "en": "Montpellier (Grammont)"
    },
    "latitude": 43.6138,
    "longitude": 3.9298,
    "capacite": 6300,
    "annee": 1986,
    "styles": [
      "Techno",
      "Electro",
      "Trance",
      "Hard Techno"
    ],
    "site": "https://www.zenithsud-montpellier.com",
    "description": {
      "fr": "Grande salle de spectacle du Domaine de Grammont à Montpellier, accueillant les tournées électroniques majeures et les grandes nuits techno en format aréna.",
      "en": "Major concert hall at Domaine de Grammont in Montpellier, hosting headline electronic tours and large-scale arena techno nights."
    }
  },
  {
    "id": "le-corum-montpellier",
    "nom": "Le Corum (Opéra Berlioz)",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Esplanade Charles-de-Gaulle)",
      "en": "Montpellier (City Center)"
    },
    "latitude": 43.6141,
    "longitude": 3.8824,
    "capacite": 2000,
    "annee": 1990,
    "styles": [
      "Electronica",
      "Ambient",
      "IDM",
      "Melodic Techno"
    ],
    "site": "https://www.opera-orchestre-montpellier.fr",
    "description": {
      "fr": "Grand auditorium dessiné par Claude Vasconi au bout de l’Esplanade, cadre de créations électroniques symphoniques et de concerts audiovisuels (Jeff Mills, Rone, Thylacine, Max Cooper).",
      "en": "Landmark auditorium designed by Claude Vasconi at the end of the Esplanade, staging symphonic electronic works and audiovisual concerts (Jeff Mills, Rone, Thylacine, Max Cooper)."
    }
  },
  {
    "id": "domaine-do-montpellier",
    "nom": "Domaine d’O (Amphithéâtre d’O)",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Malbosc)",
      "en": "Montpellier (Domaine d’O)"
    },
    "latitude": 43.6336,
    "longitude": 3.8392,
    "capacite": 1800,
    "annee": 1979,
    "styles": [
      "Electronica",
      "House",
      "Techno",
      "Experimental"
    ],
    "site": "https://www.domainedo.fr",
    "description": {
      "fr": "Domaine culturel entouré de pins au nord-ouest de Montpellier, dont l’amphithéâtre en plein air et le théâtre Jean-Claude Carrière accueillent lives électroniques et nuits d’été.",
      "en": "Pine-shaded cultural estate in northwestern Montpellier whose open-air amphitheater and Jean-Claude Carrière theater host live electronic acts and summer nights."
    }
  },
  {
    "id": "effet-mer-montpellier",
    "nom": "Effet Mer",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (La Grande-Motte)",
      "en": "Montpellier (La Grande-Motte)"
    },
    "latitude": 43.5562,
    "longitude": 4.0518,
    "capacite": 1000,
    "annee": 2008,
    "styles": [
      "House",
      "Tech House",
      "Deep House",
      "Afro House"
    ],
    "site": "https://effetmer.com",
    "description": {
      "fr": "Scène open-air et club de plage du Grand Travers sur le littoral montpelliérain, rendez-vous estival des programmations house, afro house et tech house face à la Méditerranée.",
      "en": "Open-air stage and beach club at Grand Travers on the Montpellier coast, a summer fixture for house, afro house and tech house facing the Mediterranean."
    }
  },
  {
    "id": "paillote-paradise-montpellier",
    "nom": "Paillote Paradise",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Lattes)",
      "en": "Montpellier (Lattes)"
    },
    "latitude": 43.5684,
    "longitude": 3.9142,
    "capacite": 800,
    "annee": 2019,
    "styles": [
      "Tech House",
      "Techno",
      "House",
      "Minimal"
    ],
    "site": "https://www.instagram.com/pailloteparadise",
    "description": {
      "fr": "Espace open-air aux portes sud de Montpellier à Lattes, accueillant les formats United Open Air et des journées techno, tech house et house du printemps à l’automne.",
      "en": "Open-air venue on the southern edge of Montpellier in Lattes, hosting United Open Air events and daytime techno, tech house and house sessions from spring to autumn."
    }
  },
  {
    "id": "le-jam-montpellier",
    "nom": "Le Jam",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Prés d’Arènes)",
      "en": "Montpellier (Prés d’Arènes)"
    },
    "latitude": 43.5912,
    "longitude": 3.8819,
    "capacite": 350,
    "annee": 1981,
    "styles": [
      "Dub",
      "Broken Beat",
      "Electronica",
      "Downtempo"
    ],
    "site": "https://www.lejam.com",
    "description": {
      "fr": "Salle de concert indépendante et école de musique fondée en 1981 à Montpellier, ouverte aux croisements entre jazz électronique, dub, broken beat et musiques actuelles.",
      "en": "Independent concert hall and music school founded in 1981 in Montpellier, championing crossovers between electronic jazz, dub, broken beat and contemporary sounds."
    }
  },
  {
    "id": "secret-place-montpellier",
    "nom": "Secret Place",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Saint-Jean-de-Védas)",
      "en": "Montpellier (Saint-Jean-de-Védas)"
    },
    "latitude": 43.5664,
    "longitude": 3.8358,
    "capacite": 300,
    "annee": 2006,
    "styles": [
      "Industrial Techno",
      "Hardcore",
      "EBM",
      "Darkwave"
    ],
    "site": "https://www.toutafond.com",
    "description": {
      "fr": "Salle associative autogérée de la zone industrielle de la Lauze à Saint-Jean-de-Védas, bastion montpelliérain des cultures underground, darkwave, EBM, indus et hardcore.",
      "en": "Self-run associative venue in the La Lauze industrial zone of Saint-Jean-de-Védas, Montpellier’s stronghold for underground darkwave, EBM, industrial and hardcore scenes."
    }
  },
  {
    "id": "jungle-pub-montpellier",
    "nom": "Jungle Pub",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Avenue de Palavas)",
      "en": "Montpellier (Avenue de Palavas)"
    },
    "latitude": 43.5918,
    "longitude": 3.8936,
    "capacite": 300,
    "annee": 2003,
    "styles": [
      "Drum & Bass",
      "Dubstep",
      "Trance",
      "Techno"
    ],
    "site": "https://www.junglepub.org",
    "description": {
      "fr": "Club et salle nocturne de l’avenue de Palavas à Montpellier, repaire historique des collectifs drum & bass, dubstep, psytrance et techno locaux.",
      "en": "Late-night venue and club on Avenue de Palavas in Montpellier, a longtime hub for local drum & bass, dubstep, psytrance and techno collectives."
    }
  },
  {
    "id": "maison-des-choeurs-montpellier",
    "nom": "Maison des Chœurs",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Place Albert 1er)",
      "en": "Montpellier (Place Albert 1er)"
    },
    "latitude": 43.6152,
    "longitude": 3.8738,
    "capacite": 250,
    "annee": 1663,
    "styles": [
      "Ambient",
      "Experimental",
      "IDM",
      "Drone"
    ],
    "site": "https://www.montpellier.fr",
    "description": {
      "fr": "Ancienne chapelle du XVIIe siècle place Albert 1er, dont la réverbération naturelle sert d’écrin aux concerts ambient, électroacoustiques et expérimentaux à Montpellier.",
      "en": "Seventeenth-century former chapel on Place Albert 1er whose natural reverberation frames ambient, electroacoustic and experimental concerts in Montpellier."
    }
  },
  {
    "id": "qg-club-montpellier",
    "nom": "Le Quartier Général (QG)",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Écusson)",
      "en": "Montpellier (Old Town)"
    },
    "latitude": 43.6068,
    "longitude": 3.8804,
    "capacite": 250,
    "annee": 2015,
    "styles": [
      "House",
      "Tech House",
      "Disco",
      "Electro"
    ],
    "site": "https://www.instagram.com/le_qg_club_montpellier",
    "description": {
      "fr": "Club voûté du centre historique de Montpellier à deux pas de la place de la Comédie, animé par les collectifs house, tech house et disco de la ville.",
      "en": "Vaulted club in Montpellier’s historic center steps from Place de la Comédie, hosting local house, tech house and disco collectives."
    }
  },
  {
    "id": "palau-sant-jordi-barcelone",
    "nom": "Palau Sant Jordi",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Montjuïc)",
      "en": "Barcelona (Montjuïc)"
    },
    "latitude": 41.3634,
    "longitude": 2.1526,
    "capacite": 17000,
    "annee": 1990,
    "styles": [
      "Techno",
      "Progressive House",
      "Electro",
      "Electronica"
    ],
    "site": "https://palausantjordi.barcelona",
    "description": {
      "fr": "Aréna olympique conçu par Arata Isozaki sur la colline de Montjuïc, théâtre des plus grandes productions électroniques en salle d’Espagne.",
      "en": "Olympic arena designed by Arata Isozaki on Montjuïc hill, staging Spain’s largest indoor electronic music productions."
    }
  },
  {
    "id": "sant-jordi-club-barcelone",
    "nom": "Sant Jordi Club",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Montjuïc)",
      "en": "Barcelona (Montjuïc)"
    },
    "latitude": 41.3626,
    "longitude": 2.1538,
    "capacite": 4600,
    "annee": 1990,
    "styles": [
      "Electronica",
      "Techno",
      "House",
      "UK Garage"
    ],
    "site": "https://palausantjordi.barcelona/es/sant-jordi-club",
    "description": {
      "fr": "Grande salle de concert attenante au Palau Sant Jordi sur Montjuïc, étape privilégiée des tournées live électroniques internationales (Bicep, The Chemical Brothers, Peggy Gou, Jamie xx).",
      "en": "Concert hall adjoining Palau Sant Jordi on Montjuïc, a premier stop for major international electronic tours including Bicep, The Chemical Brothers, Peggy Gou and Jamie xx."
    }
  },
  {
    "id": "opium-barcelone",
    "nom": "Opium Barcelona",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Barceloneta)",
      "en": "Barcelona (Barceloneta)"
    },
    "latitude": 41.3854,
    "longitude": 2.1966,
    "capacite": 2500,
    "annee": 2007,
    "styles": [
      "House",
      "Tech House",
      "Progressive House",
      "Melodic Techno"
    ],
    "site": "https://opiumbarcelona.com",
    "description": {
      "fr": "Le plus vaste club du front de mer de la Barceloneta, hôte du cycle estival WEDJS et des grandes têtes d’affiche house, progressive et tech house internationales.",
      "en": "The largest beachfront club on the Barceloneta boardwalk, home to the summer WEDJS series and international house, progressive and tech house headliners."
    }
  },
  {
    "id": "lauditori-barcelone",
    "nom": "L’Auditori",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Glòries)",
      "en": "Barcelona (Glòries)"
    },
    "latitude": 41.3982,
    "longitude": 2.1856,
    "capacite": 2200,
    "annee": 1999,
    "styles": [
      "Ambient",
      "IDM",
      "Experimental",
      "Electronica"
    ],
    "site": "https://www.auditori.cat",
    "description": {
      "fr": "Complexe musical contemporain dessiné par Rafael Moneo, partenaire historique de Sónar et de MIRA pour les créations électroniques immersives, ambient et électroacoustiques.",
      "en": "Contemporary music complex designed by Rafael Moneo, a key partner of Sónar and MIRA for immersive electronic, ambient and electroacoustic premieres."
    }
  },
  {
    "id": "pacha-barcelone",
    "nom": "Pacha Barcelona",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Barceloneta)",
      "en": "Barcelona (Barceloneta)"
    },
    "latitude": 41.3859,
    "longitude": 2.1972,
    "capacite": 1800,
    "annee": 2014,
    "styles": [
      "Techno",
      "Tech House",
      "House",
      "Melodic Techno"
    ],
    "site": "https://pachabarcelona.es",
    "description": {
      "fr": "Grand club face à la plage de la Barceloneta, reconnu pour sa résidence dominicale Sight dédiée à la techno et à la tech house ainsi que ses showcases OffWeek.",
      "en": "Beachfront superclub on the Barceloneta promenade, renowned for its Sunday Sight residency dedicated to techno and tech house as well as OffWeek showcases."
    }
  },
  {
    "id": "parallel-62-barcelone",
    "nom": "Paral·lel 62",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (El Paral·lel)",
      "en": "Barcelona (El Paral·lel)"
    },
    "latitude": 41.3751,
    "longitude": 2.1684,
    "capacite": 1450,
    "annee": 2022,
    "styles": [
      "Electronica",
      "IDM",
      "Techno",
      "Ambient"
    ],
    "site": "https://parallel62.cat",
    "description": {
      "fr": "Grande salle coopérative de l’avenue del Paral·lel (ancienne Sala Barts), lieu central de MUTEK Barcelona et des concerts électroniques et audiovisuels en salle.",
      "en": "Cooperative concert hall on Avinguda del Paral·lel (formerly Sala Barts), a central stage for MUTEK Barcelona and live audiovisual electronic performances."
    }
  },
  {
    "id": "shoko-barcelone",
    "nom": "Shôko Barcelona",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Barceloneta)",
      "en": "Barcelona (Barceloneta)"
    },
    "latitude": 41.3856,
    "longitude": 2.1969,
    "capacite": 1200,
    "annee": 2004,
    "styles": [
      "Tech House",
      "House",
      "Afro House",
      "Deep House"
    ],
    "site": "https://shoko.biz",
    "description": {
      "fr": "Club du front de mer de la Barceloneta ouvert sept nuits par semaine, accueillant labels house, tech house et afro house lors de la semaine Sónar et tout l’été.",
      "en": "Barceloneta beachfront club open seven nights a week, hosting house, tech house and afro house label showcases during Sónar Week and throughout the summer."
    }
  },
  {
    "id": "fabra-i-coats-barcelone",
    "nom": "Fabra i Coats (Fàbrica de Creació)",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Sant Andreu)",
      "en": "Barcelona (Sant Andreu)"
    },
    "latitude": 41.4328,
    "longitude": 2.1904,
    "capacite": 1000,
    "annee": 2008,
    "styles": [
      "IDM",
      "Ambient",
      "Experimental",
      "Electro"
    ],
    "site": "https://www.barcelona.cat/fabraicoats",
    "description": {
      "fr": "Ancienne filature textile du XIXe siècle à Sant Andreu reconvertie en fabrique de création municipale, berceau des festivals MIRA et Ombra et de l’art sonore barcelonais.",
      "en": "Nineteenth-century textile mill in Sant Andreu converted into a municipal creation factory, home to the MIRA and Ombra festivals and Barcelona’s sound art scene."
    }
  },
  {
    "id": "la-2-apolo-barcelone",
    "nom": "La (2) de Apolo",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Poble-sec)",
      "en": "Barcelona (Poble-sec)"
    },
    "latitude": 41.3742,
    "longitude": 2.1697,
    "capacite": 900,
    "annee": 2008,
    "styles": [
      "Electro",
      "EBM",
      "Leftfield",
      "Techno"
    ],
    "site": "https://www.sala-apolo.com",
    "description": {
      "fr": "Deuxième salle du complexe Apolo au rez-de-chaussée, dédiée aux lives électroniques, à la synth-pop, à l’EBM et au second dancefloor plus brut des nuits Nitsa.",
      "en": "Ground-floor second room of the Apolo complex, dedicated to live electronic acts, synth-pop, EBM and the rawer second dancefloor of Nitsa nights."
    }
  },
  {
    "id": "cccb-barcelone",
    "nom": "CCCB (Centre de Cultura Contemporània)",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (El Raval)",
      "en": "Barcelona (El Raval)"
    },
    "latitude": 41.3837,
    "longitude": 2.1668,
    "capacite": 800,
    "annee": 1994,
    "styles": [
      "IDM",
      "Experimental",
      "Ambient",
      "Electronica"
    ],
    "site": "https://www.cccb.org",
    "description": {
      "fr": "Centre culturel du Raval qui fut le berceau historique de Sónar de Día pendant près de vingt ans et demeure un foyer majeur des arts numériques et des musiques électroniques à Barcelone.",
      "en": "Cultural center in El Raval that served as the historic home of Sónar by Day for nearly twenty years and remains a hub for digital arts and electronic music in Barcelona."
    }
  },
  {
    "id": "sala-wolf-barcelone",
    "nom": "Sala Wolf",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Poblenou)",
      "en": "Barcelona (Poblenou)"
    },
    "latitude": 41.3961,
    "longitude": 2.1912,
    "capacite": 800,
    "annee": 2019,
    "styles": [
      "Techno",
      "Electro",
      "Indie Dance",
      "House"
    ],
    "site": "https://salawolf.com",
    "description": {
      "fr": "Salle de concerts et club de la rue dels Almogàvers au coeur industriel de Poblenou, prisée pour ses lives synthétiques en soirée et ses nuits club jusqu’au matin.",
      "en": "Live venue and club on Carrer dels Almogàvers in industrial Poblenou, favored for evening synth live shows and all-night club sessions."
    }
  },
  {
    "id": "jamboree-barcelone",
    "nom": "Jamboree Dance Club",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Plaça Reial)",
      "en": "Barcelona (Plaça Reial)"
    },
    "latitude": 41.3797,
    "longitude": 2.1755,
    "capacite": 400,
    "annee": 1960,
    "styles": [
      "Broken Beat",
      "House",
      "Disco",
      "UK Garage"
    ],
    "site": "https://jamboreebarcelona.com",
    "description": {
      "fr": "Cave voûtée légendaire de la Plaça Reial fondée en 1960, où les concerts en soirée laissent place aux nuits électroniques, broken beat, funk, disco et UK garage.",
      "en": "Legendary vaulted cellar on Plaça Reial founded in 1960, where early concerts give way to late-night broken beat, house, disco and UK garage sessions."
    }
  },
  {
    "id": "sidecar-barcelone",
    "nom": "Sidecar",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Plaça Reial)",
      "en": "Barcelona (Plaça Reial)"
    },
    "latitude": 41.3802,
    "longitude": 2.1749,
    "capacite": 300,
    "annee": 1982,
    "styles": [
      "Indie Dance",
      "Dark Disco",
      "Electro",
      "Synthwave"
    ],
    "site": "https://www.sidecar.es",
    "description": {
      "fr": "Sous-sol mythique de la Plaça Reial depuis 1982, tremplin historique des scènes indie-electronic, dark disco, post-punk et electro barcelonaises.",
      "en": "Iconic basement venue under Plaça Reial since 1982, a historic springboard for Barcelona’s indie-electronic, dark disco, post-punk and electro scenes."
    }
  },
  {
    "id": "red58-barcelone",
    "nom": "RED58",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Eixample)",
      "en": "Barcelona (Eixample)"
    },
    "latitude": 41.3888,
    "longitude": 2.1621,
    "capacite": 250,
    "annee": 2017,
    "styles": [
      "Minimal",
      "House",
      "Electro",
      "Tech House"
    ],
    "site": "https://red58.org",
    "description": {
      "fr": "Club intimiste du quartier de l’Eixample fondé en 2017 avec politique sans photo, dédié aux sélections vinyles minimal, micro-house et electro sur système audiophile.",
      "en": "Intimate Eixample club founded in 2017 with a no-photo policy, dedicated to vinyl-driven minimal, micro-house and electro on a tuned audiophile sound system."
    }
  },
  {
    "id": "sala-vol-barcelone",
    "nom": "Sala Vol",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Poblenou)",
      "en": "Barcelona (Poblenou)"
    },
    "latitude": 41.3988,
    "longitude": 2.1934,
    "capacite": 150,
    "annee": 2018,
    "styles": [
      "Experimental",
      "Ambient",
      "IDM",
      "Leftfield"
    ],
    "site": "https://salavol.com",
    "description": {
      "fr": "Salle coopérative à jauge réduite du quartier de Poblenou, repaire des concerts électroniques expérimentaux, synthétiseurs modulaires et labels indépendants catalans.",
      "en": "Small-capacity cooperative room in Poblenou, a haven for experimental electronic concerts, modular synth performances and independent Catalan labels."
    }
  },
];
