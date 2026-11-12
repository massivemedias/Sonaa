/* LES MEILLEURS CLUBS (PAR VILLE) ET FESTIVALS (PAR PAYS, 1 000+ PERSONNES).
 *
 * Mika, le 3 novembre 2026 : « une page avec les meilleurs clubs et festivals
 * dans les villes que je propose pour les clubs et les festivals c'est par
 * Pays, faudra faire une recherche avec les meilleurs festivals electro avec
 * une capacite de plus de 1000 personnes et je voudrais aussi que tu fasses
 * une carte interactive mondiale ».
 *
 * Les clubs couvrent les 20 villes du calendrier SONAA (scripts/donnees/villes.json) :
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
  /** Salle de spectacle ou lieu en location (secondaire, sans styles attribues). */
  readonly estSalle?: boolean;
  readonly paysCode: string;
  /** Slug parmi les 20 villes de SONAA quand le lieu s'y trouve. */
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

/* LES VINGT VILLES, depuis le 12 novembre 2026 (ADR-118) : les plus grandes
   scenes, et les memes que le calendrier. Mika : « reduis beaucoup les villes,
   garde Montreal, Montpellier, Toulouse et beaucoup d'autres grandes villes,
   vingt en tout ; les plus petites, tu les flushes ». */
export const VILLES_CLUBS: readonly VilleClub[] = [
  { slug: 'montreal-ca', nom: { fr: 'Montréal', en: 'Montreal' }, paysCode: 'CA', latitude: 45.5017, longitude: -73.5673, aCalendrier: true },
  { slug: 'toronto-ca', nom: { fr: 'Toronto', en: 'Toronto' }, paysCode: 'CA', latitude: 43.6532, longitude: -79.3832, aCalendrier: true },
  { slug: 'newyork-us', nom: { fr: 'New York', en: 'New York' }, paysCode: 'US', latitude: 40.7128, longitude: -74.006, aCalendrier: true },
  { slug: 'losangeles-us', nom: { fr: 'Los Angeles', en: 'Los Angeles' }, paysCode: 'US', latitude: 34.0522, longitude: -118.2437, aCalendrier: true },
  { slug: 'chicago-us', nom: { fr: 'Chicago', en: 'Chicago' }, paysCode: 'US', latitude: 41.8781, longitude: -87.6298, aCalendrier: true },
  { slug: 'miami-us', nom: { fr: 'Miami', en: 'Miami' }, paysCode: 'US', latitude: 25.7617, longitude: -80.1918, aCalendrier: true },
  { slug: 'mexico-mx', nom: { fr: 'Mexico', en: 'Mexico City' }, paysCode: 'MX', latitude: 19.4326, longitude: -99.1332, aCalendrier: true },
  { slug: 'saopaulo-br', nom: { fr: 'São Paulo', en: 'Sao Paulo' }, paysCode: 'BR', latitude: -23.5505, longitude: -46.6333, aCalendrier: true },
  { slug: 'londres-gb', nom: { fr: 'Londres', en: 'London' }, paysCode: 'GB', latitude: 51.5074, longitude: -0.1278, aCalendrier: true },
  { slug: 'paris-fr', nom: { fr: 'Paris', en: 'Paris' }, paysCode: 'FR', latitude: 48.8566, longitude: 2.3522, aCalendrier: true },
  { slug: 'lyon-fr', nom: { fr: 'Lyon', en: 'Lyon' }, paysCode: 'FR', latitude: 45.764, longitude: 4.8357, aCalendrier: true },
  { slug: 'marseille-fr', nom: { fr: 'Marseille', en: 'Marseille' }, paysCode: 'FR', latitude: 43.2965, longitude: 5.3698, aCalendrier: true },
  { slug: 'toulouse-fr', nom: { fr: 'Toulouse', en: 'Toulouse' }, paysCode: 'FR', latitude: 43.6047, longitude: 1.4442, aCalendrier: true },
  { slug: 'montpellier-fr', nom: { fr: 'Montpellier', en: 'Montpellier' }, paysCode: 'FR', latitude: 43.6108, longitude: 3.8767, aCalendrier: true },
  { slug: 'berlin-de', nom: { fr: 'Berlin', en: 'Berlin' }, paysCode: 'DE', latitude: 52.52, longitude: 13.405, aCalendrier: true },
  { slug: 'amsterdam-nl', nom: { fr: 'Amsterdam', en: 'Amsterdam' }, paysCode: 'NL', latitude: 52.3676, longitude: 4.9041, aCalendrier: true },
  { slug: 'bruxelles-be', nom: { fr: 'Bruxelles', en: 'Brussels' }, paysCode: 'BE', latitude: 50.8503, longitude: 4.3517, aCalendrier: true },
  { slug: 'barcelone-es', nom: { fr: 'Barcelone', en: 'Barcelona' }, paysCode: 'ES', latitude: 41.3874, longitude: 2.1686, aCalendrier: true },
  { slug: 'madrid-es', nom: { fr: 'Madrid', en: 'Madrid' }, paysCode: 'ES', latitude: 40.4168, longitude: -3.7038, aCalendrier: true },
  { slug: 'tokyo-jp', nom: { fr: 'Tokyo', en: 'Tokyo' }, paysCode: 'JP', latitude: 35.6762, longitude: 139.6503, aCalendrier: true },
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
  /* Québec */
  /* Ottawa */
  /* Calgary */
  /* Winnipeg */
  /* Halifax */
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
    estSalle: true,
    styles: [],
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
  {
    id: 'solstice-ruigoord-pays-bas',
    nom: 'Solstice Festival',
    type: 'festival',
    paysCode: 'NL',
    villeSlug: 'amsterdam-nl',
    ville: { fr: 'Amsterdam (Ruigoord)', en: 'Amsterdam (Ruigoord)' },
    latitude: 52.4106,
    longitude: 4.7536,
    capacite: 3000,
    mois: { fr: 'Juin (solstice)', en: 'June (solstice)' },
    styles: ['Psy', 'Progressive Trance', 'Ambient'],
    site: 'https://www.instagram.com/solstice_festival_ruigoord/',
    description: {
      fr: 'Une journée de psytrance au village libre de Ruigoord, en bordure d’Amsterdam, le samedi du solstice d’été, organisée par Trance Orient Express : scène principale, piste psychédélique et espace chill-out.',
      en: 'A one-day psytrance gathering in the free village of Ruigoord, on the edge of Amsterdam, on the summer solstice Saturday, run by Trance Orient Express: main stage, psychedelic floor and chill-out space.',
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
    villeSlug: 'lyon-fr',
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
    site: "https://www.historytoronto.com",
    description: {
      fr: "Grande salle de 2 500 places dans les Beaches sur Queen Street East, accueillant les grandes tournées électroniques et les têtes d’affiche house, techno et bass.",
      en: "2,500-capacity hall on Queen Street East in the Beaches, hosting major international electronic tours and house, techno and bass headliners.",
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
    villeSlug: "marseille-fr",
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    "latitude": 45.5078,
    "longitude": -73.5671,
    "capacite": 700,
    "annee": 2009,
    estSalle: true,
    styles: [],
    "site": "https://www.lestudiotd.com",
    "description": {
      "fr": "Salle de spectacle de la Maison du Festival, au 305 rue Sainte-Catherine Ouest (L’Astral jusqu’en 2022), de 300 places assises à 700 debout, étape régulière de MUTEK et des tournées electronica, drum & bass et techno.",
      "en": "Performance hall inside the Maison du Festival at 305 Sainte-Catherine Street West (L’Astral until 2022), from 300 seated to 700 standing, a regular stage for MUTEK and electronica, drum & bass and techno tours."
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
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
    estSalle: true,
    styles: [],
    "site": "https://salavol.com",
    "description": {
      "fr": "Salle coopérative à jauge réduite du quartier de Poblenou, repaire des concerts électroniques expérimentaux, synthétiseurs modulaires et labels indépendants catalans.",
      "en": "Small-capacity cooperative room in Poblenou, a haven for experimental electronic concerts, modular synth performances and independent Catalan labels."
    }
  },
  /* LA DENSIFICATION DES VINGT VILLES, 12 novembre 2026 (ADR-118). Mika :
     « scanne vraiment beaucoup mieux les 20, ca doit etre bien plus complet ».
     Chaque lieu a ete verifie ouvert en 2025 ou 2026 (site officiel, Resident
     Advisor, presse locale) ; les capacites sans source sont des estimations. */
  {
    "id": "teatro-kapital-madrid",
    "nom": "Teatro Kapital",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Atocha)",
      "en": "Madrid (Atocha)"
    },
    "latitude": 40.4098,
    "longitude": -3.6932,
    "capacite": 4000,
    "annee": 1983,
    "styles": [
      "House",
      "Tech House",
      "Afro House"
    ],
    "site": "https://teatrokapital.com",
    "description": {
      "fr": "Mégaclub de sept étages installé dans l’ancien cinéma San Carlos, rue Atocha, ouvert en 1983 sous le nom de Titanic, avec une grande salle house et tech house et des étages à thème.",
      "en": "Seven-floor megaclub in the former San Carlos cinema on Calle Atocha, opened in 1983 as Titanic, with a main house and tech house room and themed upper floors."
    }
  },
  {
    "id": "lab-theclub-madrid",
    "nom": "LAB theClub",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Chamartín)",
      "en": "Madrid (Chamartín)"
    },
    "latitude": 40.4718,
    "longitude": -3.6829,
    "capacite": 1427,
    "styles": [
      "Techno",
      "House",
      "Tech House"
    ],
    "site": "https://www.labtheclub.com",
    "description": {
      "fr": "Club de 1 800 m² au dernier étage de la gare de Chamartín, sur l’ancien site du Macumba, qui accueille le dimanche la soirée house Space of Sound et des têtes d’affiche techno.",
      "en": "Club of 1,800 square metres on the top floor of Chamartín station, on the former Macumba site, home to the Sunday house party Space of Sound and touring techno headliners."
    }
  },
  {
    "id": "fitz-club-madrid",
    "nom": "Fitz Club",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Plaza de España)",
      "en": "Madrid (Plaza de España)"
    },
    "latitude": 40.4247,
    "longitude": -3.7122,
    "capacite": 1300,
    "annee": 2023,
    "styles": [
      "House",
      "Afro House",
      "Tech House",
      "Melodic Techno"
    ],
    "site": "https://ra.co/clubs/218052",
    "description": {
      "fr": "Club ouvert en 2023 au 1 calle de la Princesa, près de la plaza de España, inspiré de Gatsby le Magnifique, avec un dôme d’écrans LED et une programmation house, afro house et melodic techno.",
      "en": "Club opened in 2023 at 1 Calle de la Princesa near Plaza de España, styled after The Great Gatsby, with a vast LED dome and a house, afro house and melodic techno programme."
    }
  },
  {
    "id": "goya-social-club-madrid",
    "nom": "Goya Social Club",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Salamanca)",
      "en": "Madrid (Salamanca)"
    },
    "latitude": 40.4254,
    "longitude": -3.6829,
    "capacite": 200,
    "styles": [
      "House",
      "Deep House",
      "Tech House"
    ],
    "site": "https://goyasocialclub.com",
    "description": {
      "fr": "Petit club d’environ 200 personnes au 43 calle de Goya, dans le quartier de Salamanca, consacré à la house, à la deep house et à la tech house, surtout avec des DJ locaux.",
      "en": "Small club of about 200 people at 43 Calle de Goya in the Salamanca district, devoted to house, deep house and tech house, mostly with local DJs and occasional international guests."
    }
  },
  {
    "id": "the-bassement-madrid",
    "nom": "The Bassement",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Chamberí)",
      "en": "Madrid (Chamberí)"
    },
    "latitude": 40.4322,
    "longitude": -3.7102,
    "capacite": 850,
    "styles": [
      "Techno",
      "Hypnotic Techno",
      "Hard Techno",
      "Tech House"
    ],
    "site": "https://bassmntclub.com",
    "description": {
      "fr": "Club techno en sous-sol au 26 calle de Galileo, à Chamberí, qui accueille les soirées Laster, Swing et New Faces, avec une politique sans photo ni vidéo pour Laster.",
      "en": "Basement techno club at 26 Calle de Galileo in Chamberí, home to the Laster, Swing and New Faces nights, with a strict no photo and no video policy at Laster."
    }
  },
  {
    "id": "specka-madrid",
    "nom": "Specka",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Tetuán)",
      "en": "Madrid (Tetuán)"
    },
    "latitude": 40.4516,
    "longitude": -3.6949,
    "capacite": 100,
    "annee": 1989,
    "styles": [
      "Techno",
      "Electro",
      "Trance",
      "EBM"
    ],
    "site": "https://www.specka.es",
    "description": {
      "fr": "Club en sous-sol de la calle Orense, ouvert sans interruption depuis 1989, passé de la new wave et de l’EBM à la trance puis à la techno, équipé d’un système Funktion-One.",
      "en": "Basement club on Calle Orense, open without interruption since 1989, moving from new wave and EBM through trance to techno and electro, fitted with a Funktion-One sound system."
    }
  },
  {
    "id": "el-sotano-madrid",
    "nom": "El Sótano",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (La Latina)",
      "en": "Madrid (La Latina)"
    },
    "latitude": 40.4109,
    "longitude": -3.7077,
    "capacite": 250,
    "styles": [
      "Techno",
      "Tech House",
      "House",
      "Trance"
    ],
    "site": "https://www.salaelsotano.com",
    "description": {
      "fr": "Salle en sous-sol de la calle de las Maldonadas, à La Latina, qui alterne concerts en début de soirée et nuits techno, house et trance du jeudi au dimanche, plus des après-midi le week-end.",
      "en": "Basement venue on Calle de las Maldonadas in La Latina, mixing early evening concerts with techno, house and trance club nights from Thursday to Sunday, plus weekend afternoon sessions."
    }
  },
  {
    "id": "cadavra-madrid",
    "nom": "Cadavra",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Gran Vía)",
      "en": "Madrid (Gran Vía)"
    },
    "latitude": 40.4194,
    "longitude": -3.7007,
    "capacite": 200,
    "styles": [
      "Techno",
      "Electro",
      "Leftfield"
    ],
    "site": "https://www.cadavraclub.com",
    "description": {
      "fr": "Club de deux salles près de la Gran Vía, au 10 calle del Caballero de Gracia, équipé d’un système d&b audiotechnik, qui accueille des nuits techno et électro underground comme Sigh.Club.",
      "en": "Two-room club near Gran Vía at 10 Calle del Caballero de Gracia, with a d&b audiotechnik system, hosting underground techno and electro nights such as Sigh.Club."
    }
  },
  {
    "id": "berlinclub-madrid",
    "nom": "berlinClub",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Callao)",
      "en": "Madrid (Callao)"
    },
    "latitude": 40.4195,
    "longitude": -3.708,
    "capacite": 254,
    "annee": 2012,
    "styles": [
      "House",
      "Disco",
      "Soulful House"
    ],
    "site": "https://berlincafe.es",
    "description": {
      "fr": "Volet club du Café Berlín, ouvert en 2012 et installé depuis 2016 costanilla de los Ángeles, près de Callao, pour 254 personnes, centré sur la house, la disco et la soul.",
      "en": "Club side of Café Berlín, opened in 2012 and based on Costanilla de los Ángeles near Callao since 2016, holding 254 people and focused on house, disco and soul."
    }
  },
  {
    "id": "sala-siroco-madrid",
    "nom": "Sala Siroco",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Malasaña)",
      "en": "Madrid (Malasaña)"
    },
    "latitude": 40.4269,
    "longitude": -3.7077,
    "capacite": 350,
    "annee": 1989,
    "styles": [
      "Techno",
      "EBM",
      "Drum & Bass"
    ],
    "site": "https://siroco.es",
    "description": {
      "fr": "Salle de Malasaña ouverte en 1989 et rénovée en 2010, qui mêle concerts et nuits électroniques en techno, EBM et drum & bass, dont la soirée Abyss Techno Club le dimanche.",
      "en": "Malasaña venue opened in 1989 and refurbished in 2010, combining concerts with electronic nights covering techno, EBM and drum & bass, including the Sunday Abyss Techno Club."
    }
  },
  {
    "id": "sala-el-sol-madrid",
    "nom": "Sala El Sol",
    "type": "club",
    "estSalle": true,
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Sol)",
      "en": "Madrid (Sol)"
    },
    "latitude": 40.419,
    "longitude": -3.7015,
    "capacite": 640,
    "annee": 1979,
    "styles": [],
    "site": "https://salaelsol.com",
    "description": {
      "fr": "Salle historique de la Movida ouverte en 1979 au 3 calle de los Jardines, qui programme des concerts puis, du jeudi au samedi, des nuits club techno et acid jusqu’à 6 h.",
      "en": "Historic Movida venue opened in 1979 at 3 Calle de los Jardines, hosting concerts and then, Thursday to Saturday, techno and acid club nights running until 6 a.m."
    }
  },
  {
    "id": "la-riviera-madrid",
    "nom": "La Riviera",
    "type": "club",
    "estSalle": true,
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Madrid Río)",
      "en": "Madrid (Madrid Río)"
    },
    "latitude": 40.413,
    "longitude": -3.7221,
    "capacite": 2500,
    "styles": [],
    "site": "https://salariviera.com",
    "description": {
      "fr": "Grande salle de concert au bord du Manzanares, près du pont de Ségovie, qui accueille régulièrement les soirées hard techno itinérantes Blackworks et des événements drum & bass.",
      "en": "Large concert hall on the Manzanares riverbank near the Segovia Bridge, regularly hosting the touring hard techno party Blackworks as well as drum & bass events."
    }
  },
  {
    "id": "sala-villanos-madrid",
    "nom": "Sala Villanos",
    "type": "club",
    "estSalle": true,
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Arganzuela)",
      "en": "Madrid (Arganzuela)"
    },
    "latitude": 40.4039,
    "longitude": -3.7,
    "capacite": 400,
    "styles": [],
    "site": "https://salavillanos.es",
    "description": {
      "fr": "Salle de 400 personnes installée dans l’ancienne Sala Caracol, rue Bernardino Obregón, qui alterne jazz, concerts et nuits électroniques avec des invités comme Cinthie, Romare ou Matthew Herbert.",
      "en": "Venue for 400 people in the former Sala Caracol on Calle Bernardino Obregón, alternating jazz, concerts and electronic nights with guests such as Cinthie, Romare and Matthew Herbert."
    }
  },
  {
    "id": "core-madrid",
    "nom": "Core",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Sol)",
      "en": "Madrid (Sol)"
    },
    "latitude": 40.4183,
    "longitude": -3.7032,
    "capacite": 300,
    "styles": [
      "Techno",
      "Tech House"
    ],
    "site": "https://ra.co/clubs/278717",
    "description": {
      "fr": "Club techno de 300 personnes au 27 calle de Tetuán, à deux pas de la Puerta del Sol, consacré à la techno et à la tech house avec des sets longs et une direction underground.",
      "en": "Club for 300 people at 27 Calle de Tetuán, a short walk from Puerta del Sol, devoted to techno and tech house with long sets and a firmly underground artistic direction."
    }
  },
  {
    "id": "lasociacion-madrid",
    "nom": "Lasociaciøn",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Villa de Vallecas)",
      "en": "Madrid (Villa de Vallecas)"
    },
    "latitude": 40.3722,
    "longitude": -3.6465,
    "capacite": 200,
    "styles": [
      "Techno",
      "Hypnotic Techno",
      "Minimal"
    ],
    "site": "https://ra.co/clubs/205441",
    "description": {
      "fr": "Association culturelle de 200 personnes dans une zone industrielle de Villa de Vallecas, dédiée à la techno hypnotique et dub, avec des invités comme Robert Leiner et des soirées prolongées.",
      "en": "Cultural association for 200 people in an industrial estate in Villa de Vallecas, dedicated to hypnotic and dub techno, with guests such as Robert Leiner and extended-hours nights."
    }
  },
  {
    "id": "club-malasana-madrid",
    "nom": "Club Malasaña",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Malasaña)",
      "en": "Madrid (Malasaña)"
    },
    "latitude": 40.4257,
    "longitude": -3.7032,
    "capacite": 400,
    "styles": [
      "House",
      "Electronica"
    ],
    "site": "https://ra.co/clubs/181350",
    "description": {
      "fr": "Club de 400 personnes au 23 calle de San Vicente Ferrer, en plein Malasaña, qui enchaîne concerts et sessions DJ house et électroniques plusieurs soirs par semaine.",
      "en": "Club for 400 people at 23 Calle de San Vicente Ferrer in the heart of Malasaña, combining live acts with house and electronic DJ sessions several nights a week."
    }
  },
  {
    "id": "hangar48-madrid",
    "nom": "Hangar48",
    "type": "club",
    "estSalle": true,
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (La Latina)",
      "en": "Madrid (La Latina)"
    },
    "latitude": 40.4114,
    "longitude": -3.7141,
    "capacite": 500,
    "annee": 2017,
    "styles": [],
    "site": "https://hangar48.es",
    "description": {
      "fr": "Salle de concert et de clubbing ouverte en octobre 2017 au 24 calle de Bailén, qui alterne rock en début de soirée et nuits techno, house et progressive le week-end.",
      "en": "Concert and clubbing venue opened in October 2017 at 24 Calle de Bailén, alternating early evening rock gigs with techno, house and progressive club nights at weekends."
    }
  },
  {
    "id": "brunch-electronik-madrid",
    "nom": "Brunch Electronik Madrid",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Caja Mágica)",
      "en": "Madrid (Caja Mágica)"
    },
    "latitude": 40.3683,
    "longitude": -3.6841,
    "capacite": 10000,
    "mois": {
      "fr": "Mai et septembre",
      "en": "May and September"
    },
    "styles": [
      "House",
      "Techno"
    ],
    "site": "https://madrid.brunchelectronik.com",
    "description": {
      "fr": "Déclinaison madrilène du festival barcelonais, en plein air à la Caja Mágica au printemps et en septembre, avec environ 10 000 personnes par jour et des têtes d’affiche house et techno.",
      "en": "Madrid edition of the Barcelona festival, held open air at the Caja Mágica in spring and September, drawing about 10,000 people per day with house and techno headliners."
    }
  },
  {
    "id": "maudes-festival-madrid",
    "nom": "Maudes Festival",
    "type": "festival",
    "paysCode": "ES",
    "villeSlug": "madrid-es",
    "ville": {
      "fr": "Madrid (Arganzuela)",
      "en": "Madrid (Arganzuela)"
    },
    "latitude": 40.3899,
    "longitude": -3.6829,
    "capacite": 8000,
    "annee": 2021,
    "mois": {
      "fr": "Mai",
      "en": "May"
    },
    "styles": [
      "Techno",
      "House",
      "Melodic Techno"
    ],
    "site": "https://maudesfestival.com",
    "description": {
      "fr": "Festival électronique en plein air créé en 2021, installé depuis 2025 au parc Enrique Tierno Galván, avec jusqu’à 8 000 personnes par jour sur plusieurs week-ends de mai.",
      "en": "Open-air electronic festival founded in 2021 and held since 2025 in Enrique Tierno Galván park, welcoming up to 8,000 people per day across several weekends in May."
    }
  },
  {
    "id": "village-underground-barcelone",
    "nom": "Village Underground Barcelona",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (L’Hospitalet de Llobregat)",
      "en": "Barcelona (L’Hospitalet de Llobregat)"
    },
    "latitude": 41.3604,
    "longitude": 2.1142,
    "capacite": 420,
    "styles": [
      "Techno",
      "House",
      "Bass",
      "EBM"
    ],
    "site": "https://www.villageunderground.cat",
    "description": {
      "fr": "Espace culturel de 1 400 m² au 12 carrer del Cobalt, à L’Hospitalet de Llobregat, avec deux entrepôts et une terrasse, qui programme techno, house, bass et concerts électroniques.",
      "en": "Cultural space of 1,400 square metres at 12 Carrer del Cobalt in L’Hospitalet de Llobregat, with two warehouses and a terrace, programming techno, house, bass and electronic live acts."
    }
  },
  {
    "id": "detroit-club-barcelone",
    "nom": "DETROIT Club",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (L’Hospitalet de Llobregat)",
      "en": "Barcelona (L’Hospitalet de Llobregat)"
    },
    "latitude": 41.3544,
    "longitude": 2.1072,
    "capacite": 400,
    "styles": [
      "Techno",
      "Hard Techno",
      "Industrial Techno"
    ],
    "site": "https://detroitbcn.com",
    "description": {
      "fr": "Club techno underground d’une zone industrielle de L’Hospitalet de Llobregat, près du métro Avinguda Carrilet, sans dress code, qui demande de ranger les téléphones sur la piste.",
      "en": "Underground techno club in an industrial area of L’Hospitalet de Llobregat near Avinguda Carrilet metro, with no dress code and a request to keep phones off the dance floor."
    }
  },
  {
    "id": "bridge-48-barcelone",
    "nom": "Bridge 48",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Poblenou)",
      "en": "Barcelona (Poblenou)"
    },
    "latitude": 41.3935,
    "longitude": 2.1921,
    "capacite": 200,
    "styles": [
      "House",
      "Techno",
      "Ambient"
    ],
    "site": "https://www.bridge48.com",
    "description": {
      "fr": "Club de membres pour producteurs installé dans 850 m² à Poblenou, qui ouvre au public pour des soirées house, techno et ambient sur deux salles et des sessions d’écoute.",
      "en": "Members’ club for electronic producers in an 850 square metre space in Poblenou, opening to the public for two-room house, techno and ambient nights and listening sessions."
    }
  },
  {
    "id": "slow-club-barcelone",
    "nom": "Slow Club",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Eixample)",
      "en": "Barcelona (Eixample)"
    },
    "latitude": 41.3935,
    "longitude": 2.1534,
    "capacite": 150,
    "styles": [
      "House",
      "Techno",
      "Disco"
    ],
    "site": "https://ra.co/clubs/106267",
    "description": {
      "fr": "Club intime de 150 personnes au 186 carrer de París, dans l’Eixample, dédié à la house underground et parfois à la techno, avec une identité portée par ses DJ résidents.",
      "en": "Intimate club for 150 people at 186 Carrer de París in the Eixample, dedicated to underground house and sometimes techno, with an identity shaped by its resident DJs."
    }
  },
  {
    "id": "303-audiophile-bar-barcelone",
    "nom": "303 Audiophile Bar",
    "type": "club",
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Eixample)",
      "en": "Barcelona (Eixample)"
    },
    "latitude": 41.3909,
    "longitude": 2.1726,
    "capacite": 150,
    "styles": [
      "House",
      "Minimal"
    ],
    "site": "https://ra.co/clubs/227497",
    "description": {
      "fr": "Bar audiophile de 150 places au 33 carrer de Casp, dans l’Eixample, porté par La Textil Collective, avec des DJ house et minimal plusieurs soirs par semaine.",
      "en": "Audiophile bar for 150 people at 33 Carrer de Casp in the Eixample, run by La Textil Collective, with house and minimal DJs playing several nights a week."
    }
  },
  {
    "id": "sala-bikini-barcelone",
    "nom": "Sala Bikini",
    "type": "club",
    "estSalle": true,
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Les Corts)",
      "en": "Barcelona (Les Corts)"
    },
    "latitude": 41.3895,
    "longitude": 2.137,
    "capacite": 800,
    "styles": [],
    "site": "https://bikinibcn.com",
    "description": {
      "fr": "Discothèque et salle de concert de 800 personnes sous le centre commercial L’Illa, avenue Diagonal, qui accueille des nuits house et progressive avec des labels comme Hot Creations.",
      "en": "Nightclub and concert hall for 800 people beneath the L’Illa shopping centre on Avinguda Diagonal, hosting house and progressive nights with labels such as Hot Creations."
    }
  },
  {
    "id": "luz-de-gas-barcelone",
    "nom": "Luz de Gas",
    "type": "club",
    "estSalle": true,
    "paysCode": "ES",
    "villeSlug": "barcelone-es",
    "ville": {
      "fr": "Barcelone (Sant Gervasi)",
      "en": "Barcelona (Sant Gervasi)"
    },
    "latitude": 41.3946,
    "longitude": 2.149,
    "capacite": 600,
    "styles": [],
    "site": "https://luzdegas.com",
    "description": {
      "fr": "Salle de 600 places au 246 carrer de Muntaner, à Sant Gervasi, qui accueille concerts et nuits club, dont la série Nacar Club programmée par Brunch Electronik.",
      "en": "Venue for 600 people at 246 Carrer de Muntaner in Sant Gervasi, hosting concerts and club nights, including the Nacar Club series curated by Brunch Electronik."
    }
  },
  {
    "id": "pinata-radio-montpellier",
    "nom": "Piñata Radio",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "montpellier-fr",
    "ville": {
      "fr": "Montpellier (Gambetta)",
      "en": "Montpellier (Gambetta)"
    },
    "latitude": 43.6036,
    "longitude": 3.8747,
    "capacite": 50,
    "styles": [
      "House",
      "Broken Beat",
      "Global Club"
    ],
    "site": "https://pinataradio.com",
    "description": {
      "fr": "Webradio et bar ouvert au public au 14 rue Rondelet, du lundi au samedi, avec des émissions en direct et des B2B de DJ locaux en house, broken beat et bass.",
      "en": "Web radio and bar open to the public at 14 rue Rondelet from Monday to Saturday, with live shows and local DJ back-to-backs in house, broken beat and bass."
    }
  },
  {
    "id": "nwhr-montreal",
    "nom": "NWHR",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Quartier chinois)",
      "en": "Montreal (Chinatown)"
    },
    "latitude": 45.5084,
    "longitude": -73.5601,
    "capacite": 400,
    "styles": [
      "Techno",
      "Progressive House",
      "Deep House"
    ],
    "site": "https://ra.co/clubs/265515",
    "description": {
      "fr": "Club de 400 personnes au 1055 boulevard Saint-Laurent, en bordure du Quartier chinois, qui programme techno et house progressive avec des invités internationaux comme Justine Perry.",
      "en": "Club for 400 people at 1055 Saint-Laurent Boulevard on the edge of Chinatown, programming techno and progressive house with international guests such as Justine Perry."
    }
  },
  {
    "id": "esc-montreal",
    "nom": "ESC",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Quartier des spectacles)",
      "en": "Montreal (Quartier des spectacles)"
    },
    "latitude": 45.5116,
    "longitude": -73.5673,
    "capacite": 400,
    "styles": [
      "Techno",
      "Hard Techno",
      "Hardcore"
    ],
    "site": "https://ctrllab.com/esc/",
    "description": {
      "fr": "Espace événementiel de deux étages au 2023 boulevard Saint-Laurent, géré par Ctrllab, qui accueille des soirées techno, hard techno et hardcore comme Techno Crudo.",
      "en": "Two-floor event space at 2023 Saint-Laurent Boulevard run by Ctrllab in the Quartier des spectacles, hosting techno, hard techno and hardcore nights such as Techno Crudo."
    }
  },
  {
    "id": "blue-room-montreal",
    "nom": "Blue Room",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Plateau-Mont-Royal)",
      "en": "Montreal (Plateau-Mont-Royal)"
    },
    "latitude": 45.5166,
    "longitude": -73.579,
    "capacite": 225,
    "styles": [
      "Techno",
      "House",
      "Electro"
    ],
    "site": "https://ra.co/clubs/290582",
    "description": {
      "fr": "Petite salle de 225 personnes au troisième étage du 3956 boulevard Saint-Laurent, pensée autour du son, avec des sets longs en techno, house et électro.",
      "en": "Small room for 225 people on the third floor of 3956 Saint-Laurent Boulevard, built around its sound system, with long techno, house and electro sets."
    }
  },
  {
    "id": "vino-disco-montreal",
    "nom": "Vino Disco",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Quartier chinois)",
      "en": "Montreal (Chinatown)"
    },
    "latitude": 45.5091,
    "longitude": -73.5629,
    "capacite": 150,
    "styles": [
      "House",
      "Disco",
      "Funk"
    ],
    "site": "https://ra.co/clubs/226492",
    "description": {
      "fr": "Bar à vin du boulevard Saint-Laurent avec un système son sur mesure, où des DJ jouent house, disco et funk du jeudi au samedi pour environ 150 personnes.",
      "en": "Wine bar on Saint-Laurent Boulevard with a custom sound system, where DJs play house, disco and funk from Thursday to Saturday for about 150 people."
    }
  },
  {
    "id": "le-livart-montreal",
    "nom": "Le Livart",
    "type": "club",
    "estSalle": true,
    "paysCode": "CA",
    "villeSlug": "montreal-ca",
    "ville": {
      "fr": "Montréal (Plateau-Mont-Royal)",
      "en": "Montreal (Plateau-Mont-Royal)"
    },
    "latitude": 45.5203,
    "longitude": -73.5752,
    "capacite": 300,
    "styles": [],
    "site": "https://lelivart.com",
    "description": {
      "fr": "Centre d’art du Plateau installé dans un ancien presbytère de la rue Saint-Denis, avec un sous-sol industriel rénové qui accueille régulièrement des soirées techno et house.",
      "en": "Plateau art centre in a former presbytery on Saint-Denis Street, with a renovated industrial basement that regularly hosts techno and house nights."
    }
  },
  {
    "id": "xoyo-londres",
    "nom": "XOYO",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Shoreditch)",
      "en": "London (Shoreditch)"
    },
    "latitude": 51.5255,
    "longitude": -0.0858,
    "capacite": 900,
    "annee": 2010,
    "styles": [
      "House",
      "Techno",
      "Bass"
    ],
    "site": "https://www.xoyo.co.uk",
    "description": {
      "fr": "Club installé dans une ancienne imprimerie de Cowper Street, près d’Old Street, avec deux salles de 600 et 300 personnes, rouvert en janvier 2026 après une refonte et un nouveau système Void.",
      "en": "Club in a former print works on Cowper Street near Old Street, with rooms for 600 and 300 people, reopened in January 2026 after a refit and a new Void sound system."
    }
  },
  {
    "id": "studio-338-londres",
    "nom": "Studio 338",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Greenwich Peninsula)",
      "en": "London (Greenwich Peninsula)"
    },
    "latitude": 51.4955,
    "longitude": 0.0048,
    "capacite": 2400,
    "annee": 2014,
    "styles": [
      "House",
      "Tech House",
      "Techno"
    ],
    "site": "https://www.studio338.co.uk",
    "description": {
      "fr": "Club de la péninsule de Greenwich ouvert en 2014 au 338 Boord Street, avec une grande terrasse, un jardin à toit rétractable et un système Void Acoustics installé après l’incendie de 2016.",
      "en": "Greenwich Peninsula club opened in 2014 at 338 Boord Street, with a large terrace arena, a garden under a retractable roof and a Void Acoustics system installed after a 2016 fire."
    }
  },
  {
    "id": "egg-londres",
    "nom": "Egg London",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (King’s Cross)",
      "en": "London (King’s Cross)"
    },
    "latitude": 51.5418,
    "longitude": -0.1248,
    "capacite": 1000,
    "annee": 2003,
    "styles": [
      "House",
      "Techno",
      "Tech House"
    ],
    "site": "https://egglondon.co.uk",
    "description": {
      "fr": "Club ouvert en 2003 dans un entrepôt victorien de Vale Royal, près de King’s Cross, avec trois salles, plusieurs terrasses et une licence de nuit qui prolonge les week-ends jusqu’au matin.",
      "en": "Club opened in 2003 in a Victorian warehouse on Vale Royal near King’s Cross, with three rooms, several terraces and a late licence that runs weekend nights into the morning."
    }
  },
  {
    "id": "colour-factory-londres",
    "nom": "Colour Factory",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Hackney Wick)",
      "en": "London (Hackney Wick)"
    },
    "latitude": 51.5432,
    "longitude": -0.0228,
    "capacite": 1600,
    "annee": 2021,
    "styles": [
      "House",
      "UK Bass",
      "Experimental"
    ],
    "site": "https://www.colourfactory.com",
    "description": {
      "fr": "Club et salle de Queen’s Yard à Hackney Wick, ouverts en 2021, avec une grande salle de 700 places, la Mezz, un jardin et une programmation house, bass et expérimentale.",
      "en": "Club and venue on Queen’s Yard in Hackney Wick, opened in 2021, with a 700 capacity main room, the Mezz, a garden and a programme of house, bass and experimental music."
    }
  },
  {
    "id": "venue-mot-londres",
    "nom": "Venue MOT",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (New Cross)",
      "en": "London (New Cross)"
    },
    "latitude": 51.4849,
    "longitude": -0.0484,
    "capacite": 750,
    "styles": [
      "Techno",
      "House",
      "Bass"
    ],
    "site": "https://ra.co/clubs/156290",
    "description": {
      "fr": "Entrepôt de deux unités voisines dans l’Orion Business Centre de Surrey Canal Road, réputé pour son système Martin Audio et ses nuits techno, house et bass portées par des collectifs.",
      "en": "Warehouse space of two neighbouring units in the Orion Business Centre on Surrey Canal Road, known for its Martin Audio system and techno, house and bass nights run by collectives."
    }
  },
  {
    "id": "village-underground-londres",
    "nom": "Village Underground",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Shoreditch)",
      "en": "London (Shoreditch)"
    },
    "latitude": 51.5236,
    "longitude": -0.0787,
    "capacite": 700,
    "annee": 2007,
    "styles": [
      "Techno",
      "House",
      "Live Electronic"
    ],
    "site": "https://villageunderground.co.uk",
    "description": {
      "fr": "Ancien dépôt de charbon ferroviaire de Holywell Lane transformé en salle en 2007, qui alterne concerts et nuits techno et house, sous des wagons de métro installés sur le toit.",
      "en": "Former railway coal store on Holywell Lane turned into a venue in 2007, alternating concerts with techno and house nights, beneath old tube carriages placed on the roof."
    }
  },
  {
    "id": "ministry-of-sound-londres",
    "nom": "Ministry of Sound",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Elephant & Castle)",
      "en": "London (Elephant & Castle)"
    },
    "latitude": 51.4978,
    "longitude": -0.0995,
    "capacite": 1600,
    "annee": 1991,
    "styles": [
      "House",
      "Techno",
      "Tech House"
    ],
    "site": "https://ministryofsound.com",
    "description": {
      "fr": "Club ouvert en septembre 1991 dans un ancien garage de bus de Gaunt Street, avec quatre salles dont The Box, rénovée en janvier 2026, et un système KV2 Audio.",
      "en": "Club opened in September 1991 in a former bus garage on Gaunt Street, with four rooms including The Box, renovated in January 2026, and a KV2 Audio sound system."
    }
  },
  {
    "id": "fire-lightbox-londres",
    "nom": "Fire & Lightbox",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Vauxhall)",
      "en": "London (Vauxhall)"
    },
    "latitude": 51.485,
    "longitude": -0.1234,
    "capacite": 1500,
    "styles": [
      "House",
      "Techno",
      "Drum & Bass"
    ],
    "site": "https://www.firelondon.net",
    "description": {
      "fr": "Deux clubs voisins sous les arches de Vauxhall, Fire au 39 Parry Street et Lightbox avec ses murs LED, qui accueillent des nuits house, techno et drum & bass jusqu’au matin.",
      "en": "Two neighbouring clubs under the Vauxhall arches, Fire at 39 Parry Street and Lightbox with its LED walls, hosting house, techno and drum & bass nights until morning."
    }
  },
  {
    "id": "electric-brixton-londres",
    "nom": "Electric Brixton",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Brixton)",
      "en": "London (Brixton)"
    },
    "latitude": 51.4602,
    "longitude": -0.1168,
    "capacite": 1700,
    "annee": 2011,
    "styles": [
      "House",
      "UK Garage",
      "Drum & Bass"
    ],
    "site": "https://www.electricbrixton.uk.com",
    "description": {
      "fr": "Salle de Town Hall Parade ouverte sous ce nom en 2011, qui reçoit 1 700 personnes en configuration club et programme concerts et soirées house, garage et drum & bass.",
      "en": "Venue on Town Hall Parade opened under this name in 2011, holding 1,700 people for club nights, with a programme of concerts and house, garage and drum & bass parties."
    }
  },
  {
    "id": "dalston-superstore-londres",
    "nom": "Dalston Superstore",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Dalston)",
      "en": "London (Dalston)"
    },
    "latitude": 51.5501,
    "longitude": -0.0755,
    "capacite": 300,
    "annee": 2009,
    "styles": [
      "House",
      "Disco",
      "Techno"
    ],
    "site": "https://dalstonsuperstore.com",
    "description": {
      "fr": "Bar et club queer ouvert en 2009 au 117 Kingsland High Street par Dan Beaumont et Matt Tucker, avec un bar à l’étage et un sous-sol dédié aux DJ house et disco.",
      "en": "Queer bar and club opened in 2009 at 117 Kingsland High Street by Dan Beaumont and Matt Tucker, with an upstairs bar and a basement for house and disco DJs."
    }
  },
  {
    "id": "jumbi-londres",
    "nom": "Jumbi",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Peckham)",
      "en": "London (Peckham)"
    },
    "latitude": 51.4699,
    "longitude": -0.0656,
    "capacite": 150,
    "styles": [
      "House",
      "Broken Beat",
      "Dub"
    ],
    "site": "https://www.jumbipeckham.com",
    "description": {
      "fr": "Bar hi-fi de Copeland Park fondé par Bradley Zero et Nathanael Williams, avec un système Danley, des amplis Quad et la discothèque de Bradley Zero, ouvert aux DJ le week-end.",
      "en": "Hi-fi bar in Copeland Park founded by Bradley Zero and Nathanael Williams, with a Danley sound system, Quad amplifiers and Bradley Zero’s record collection, open to DJs at weekends."
    }
  },
  {
    "id": "palais-londres",
    "nom": "Palais",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Peckham)",
      "en": "London (Peckham)"
    },
    "latitude": 51.4734,
    "longitude": -0.0697,
    "capacite": 500,
    "annee": 2026,
    "styles": [
      "House",
      "Techno",
      "UK Bass"
    ],
    "site": "https://palais.co.uk",
    "description": {
      "fr": "Club de 500 places ouvert en février 2026 au sous-sol de l’ancien grand magasin Jones & Higgins, au 1a Rye Lane, par l’équipe de Night Tales, équipé en Funktion-One.",
      "en": "500 capacity club opened in February 2026 in the basement of the former Jones & Higgins department store at 1a Rye Lane, run by the Night Tales team and fitted with Funktion-One."
    }
  },
  {
    "id": "the-steelyard-londres",
    "nom": "The Steelyard",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (City)",
      "en": "London (City)"
    },
    "latitude": 51.5095,
    "longitude": -0.0913,
    "capacite": 800,
    "styles": [
      "House",
      "Techno",
      "UK Garage",
      "Breaks"
    ],
    "site": "https://www.thesteelyard.london",
    "description": {
      "fr": "Club installé dans un bâtiment classé sous la gare de Cannon Street, sur Allhallows Lane, avec une licence jusqu’à 6 h et des nuits house, techno, garage et breaks.",
      "en": "Club set in a listed building beneath Cannon Street station on Allhallows Lane, with a 6am licence and nights of house, techno, garage and breaks."
    }
  },
  {
    "id": "cafe-oto-londres",
    "nom": "Cafe OTO",
    "type": "club",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres (Dalston)",
      "en": "London (Dalston)"
    },
    "latitude": 51.5469,
    "longitude": -0.0747,
    "capacite": 200,
    "styles": [
      "Experimental",
      "Live Electronic",
      "Ambient"
    ],
    "site": "https://www.cafeoto.co.uk",
    "description": {
      "fr": "Café et salle de concert d’Ashwin Street à Dalston, d’environ 200 places, consacré aux musiques expérimentales, improvisées et électroniques, avec des concerts ou des DJ presque tous les soirs.",
      "en": "Café and concert room on Ashwin Street in Dalston, holding about 200 people, devoted to experimental, improvised and electronic music, with concerts or DJ sets on most nights."
    }
  },
  {
    "id": "eastern-electrics-londres",
    "nom": "Eastern Electrics",
    "type": "festival",
    "paysCode": "GB",
    "villeSlug": "londres-gb",
    "ville": {
      "fr": "Londres",
      "en": "London"
    },
    "latitude": 51.4816,
    "longitude": -0.0899,
    "capacite": 10000,
    "annee": 2007,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "House",
      "Tech House",
      "UK Garage",
      "Minimal"
    ],
    "site": "https://www.easternelectrics.com",
    "description": {
      "fr": "Festival house et tech house né en 2007 de soirées londoniennes, revenu en août 2026 à Burgess Park pour une journée avec The Martinez Brothers et Groove Armada.",
      "en": "House and tech house festival that grew out of London parties started in 2007, back in August 2026 for one day in Burgess Park with The Martinez Brothers and Groove Armada."
    }
  },
  {
    "id": "renate-berlin",
    "nom": "Salon zur Wilden Renate",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Friedrichshain)",
      "en": "Berlin (Friedrichshain)"
    },
    "latitude": 52.4974,
    "longitude": 13.4653,
    "capacite": 600,
    "annee": 2007,
    "styles": [
      "Techno",
      "House",
      "Minimal"
    ],
    "site": "https://www.renate.cc",
    "description": {
      "fr": "Club installé depuis 2007 dans un ancien immeuble d’habitation d’Alt-Stralau, avec plusieurs étages, un jardin et des nuits techno et house, sauvé par un nouveau bail de dix ans fin 2025.",
      "en": "Club based since 2007 in a former apartment building on Alt-Stralau, with several floors, a garden and techno and house nights, saved by a new ten year lease in late 2025."
    }
  },
  {
    "id": "ritter-butzke-berlin",
    "nom": "Ritter Butzke",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Kreuzberg)",
      "en": "Berlin (Kreuzberg)"
    },
    "latitude": 52.503,
    "longitude": 13.4081,
    "capacite": 800,
    "annee": 2007,
    "styles": [
      "Techno",
      "Tech House",
      "Melodic Techno"
    ],
    "site": "https://club.ritterbutzke.com",
    "description": {
      "fr": "Club techno ouvert en 2007 dans les anciennes halles d’usine Butzke de la Ritterstraße, à Kreuzberg, avec jusqu’à trois étages dont un en partie à ciel ouvert l’été.",
      "en": "Techno club opened in 2007 in the former Butzke factory halls on Ritterstraße in Kreuzberg, spread over up to three floors, one of them partly open air in summer."
    }
  },
  {
    "id": "golden-gate-berlin",
    "nom": "Golden Gate",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Mitte)",
      "en": "Berlin (Mitte)"
    },
    "latitude": 52.516,
    "longitude": 13.4169,
    "capacite": 400,
    "annee": 2002,
    "styles": [
      "Techno",
      "House"
    ],
    "site": "https://goldengate-berlin.de",
    "description": {
      "fr": "Petit club ouvert en 2002 sous les arches du S-Bahn à Jannowitzbrücke, au 77-78 Dircksenstraße, connu pour ses nuits techno qui se prolongent souvent en after jusqu’au lundi.",
      "en": "Small club opened in 2002 under the S-Bahn arches at Jannowitzbrücke, at Dircksenstraße 77-78, known for techno nights that often run on as afterhours into Monday."
    }
  },
  {
    "id": "else-berlin",
    "nom": "Else",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Alt-Treptow)",
      "en": "Berlin (Alt-Treptow)"
    },
    "latitude": 52.4952,
    "longitude": 13.4628,
    "capacite": 1000,
    "annee": 2013,
    "styles": [
      "House",
      "Techno"
    ],
    "site": "https://www.else.tv",
    "description": {
      "fr": "Club en plein air ouvert en 2013 près de la gare de Treptower Park, géré par l’équipe de Renate, avec une piste sous toit transparent et une salle intérieure, du printemps à septembre.",
      "en": "Open air club opened in 2013 beside Treptower Park station, run by the Renate team, with a dancefloor under a transparent roof and an indoor floor, open from spring to September."
    }
  },
  {
    "id": "ohm-berlin",
    "nom": "OHM",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Mitte)",
      "en": "Berlin (Mitte)"
    },
    "latitude": 52.5107,
    "longitude": 13.4195,
    "capacite": 300,
    "annee": 2013,
    "styles": [
      "Techno",
      "House",
      "Electro"
    ],
    "site": "https://ohmberlin.com",
    "description": {
      "fr": "Petit club ouvert en 2013 dans l’ancienne centrale électrique de la Köpenicker Straße, à côté du Tresor qui l’exploite, avec des résidences comme Version, Sneaker Social Club ou Awkwardly Social.",
      "en": "Small club opened in 2013 in the former power station on Köpenicker Straße, next to Tresor, which runs it, with residencies such as Version, Sneaker Social Club and Awkwardly Social."
    }
  },
  {
    "id": "hoppetosse-berlin",
    "nom": "Hoppetosse",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Alt-Treptow)",
      "en": "Berlin (Alt-Treptow)"
    },
    "latitude": 52.4975,
    "longitude": 13.4548,
    "capacite": 400,
    "styles": [
      "House",
      "Minimal",
      "Techno"
    ],
    "site": "https://hoppetosse.berlin",
    "description": {
      "fr": "Bateau amarré sur la Spree au 4 Eichenstraße, à côté de l’Arena Berlin, exploité par l’équipe du Club der Visionaere, avec deux ponts et des nuits house et minimal le week-end.",
      "en": "Boat moored on the Spree at Eichenstraße 4, next to Arena Berlin, run by the Club der Visionaere team, with two decks and house and minimal nights at weekends."
    }
  },
  {
    "id": "cassiopeia-berlin",
    "nom": "Cassiopeia",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Friedrichshain)",
      "en": "Berlin (Friedrichshain)"
    },
    "latitude": 52.5072,
    "longitude": 13.4548,
    "capacite": 700,
    "annee": 2005,
    "styles": [
      "Drum & Bass",
      "Techno",
      "House"
    ],
    "site": "https://cassiopeia-berlin.de",
    "description": {
      "fr": "Club du site RAW sur la Revaler Straße, ouvert en 2005, avec trois salles, un jardin d’été et une programmation qui va du drum & bass à la techno et à la house.",
      "en": "Club on the RAW site on Revaler Straße, opened in 2005, with three rooms, a summer garden and a programme ranging from drum & bass to techno and house."
    }
  },
  {
    "id": "gretchen-berlin",
    "nom": "Gretchen",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Kreuzberg)",
      "en": "Berlin (Kreuzberg)"
    },
    "latitude": 52.4956,
    "longitude": 13.3879,
    "capacite": 600,
    "annee": 2011,
    "styles": [
      "Drum & Bass",
      "Dubstep",
      "Afro House"
    ],
    "site": "https://www.gretchen-club.de",
    "description": {
      "fr": "Club et salle de concert ouverts en 2011 sur l’Obentrautstraße, connus pour la série drum & bass Recycle, les nuits Pressure de The Bug et une programmation bass et afro house.",
      "en": "Club and concert venue opened in 2011 on Obentrautstraße, known for the Recycle drum & bass series, The Bug’s Pressure nights and a programme of bass music and afro house."
    }
  },
  {
    "id": "humboldthain-club-berlin",
    "nom": "Humboldthain Club",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Gesundbrunnen)",
      "en": "Berlin (Gesundbrunnen)"
    },
    "latitude": 52.5442,
    "longitude": 13.3787,
    "capacite": 400,
    "annee": 2013,
    "styles": [
      "Techno",
      "House"
    ],
    "site": "https://www.humboldthain.com",
    "description": {
      "fr": "Club ouvert en 2013 au pied de la gare S-Bahn de Humboldthain, au 46 Hochstraße, avec une piste principale, la Goldlounge à l’étage et un jardin pour les fêtes en plein air.",
      "en": "Club opened in 2013 beside Humboldthain S-Bahn station at Hochstraße 46, with a main floor, the upstairs Goldlounge and a garden used for open air parties."
    }
  },
  {
    "id": "zenner-berlin",
    "nom": "ZENNER",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Treptower Park)",
      "en": "Berlin (Treptower Park)"
    },
    "latitude": 52.4875,
    "longitude": 13.4778,
    "capacite": 800,
    "annee": 2021,
    "styles": [
      "Techno",
      "House",
      "Live Electronic"
    ],
    "site": "https://zenner.berlin",
    "description": {
      "fr": "Ancienne salle de bal du parc de Treptow reprise en 2021 pour des nuits électroniques, connue pour sa série de lives de trois heures avec des artistes comme Lawrence, JakoJako ou Polygonia.",
      "en": "Former ballroom in Treptower Park taken over in 2021 for electronic nights, known for its series of three hour live sets by artists such as Lawrence, JakoJako and Polygonia."
    }
  },
  {
    "id": "lokschuppen-berlin",
    "nom": "Lokschuppen Berlin",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Friedrichshain)",
      "en": "Berlin (Friedrichshain)"
    },
    "latitude": 52.5072,
    "longitude": 13.4511,
    "capacite": 800,
    "annee": 1994,
    "styles": [
      "Techno",
      "Hard Techno",
      "Trance"
    ],
    "site": "https://ra.co/clubs/17071",
    "description": {
      "fr": "Club techno du site RAW, ouvert en 1994 sous le nom Suicide Circus, installé ici depuis 2009 et rebaptisé Lokschuppen en 2024, avec une salle intérieure et une piste en plein air.",
      "en": "Techno club on the RAW site, opened in 1994 as Suicide Circus, based here since 2009 and renamed Lokschuppen in 2024, with an indoor floor and an open air floor."
    }
  },
  {
    "id": "sameheads-berlin",
    "nom": "Sameheads",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Neukölln)",
      "en": "Berlin (Neukölln)"
    },
    "latitude": 52.4778,
    "longitude": 13.4395,
    "capacite": 200,
    "styles": [
      "Italo",
      "Disco",
      "Global Club",
      "Techno"
    ],
    "site": "https://www.sameheads.com",
    "description": {
      "fr": "Bar et club du 10 Richardstraße à Neukölln, fondé par trois frères britanniques, avec un bar à l’étage et un sous-sol accueillant des soirées italo, disco, baile funk et techno.",
      "en": "Bar and club at Richardstraße 10 in Neukölln, founded by three British brothers, with an upstairs bar and a basement hosting italo, disco, baile funk and techno parties."
    }
  },
  {
    "id": "oxi-berlin",
    "nom": "OXI",
    "type": "club",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin (Lichtenberg)",
      "en": "Berlin (Lichtenberg)"
    },
    "latitude": 52.5076,
    "longitude": 13.4749,
    "capacite": 800,
    "annee": 2021,
    "styles": [
      "Techno",
      "House"
    ],
    "site": "https://ra.co/clubs/184646",
    "description": {
      "fr": "Club ouvert en 2021 au 1-4 Wiesenweg, près de Rummelsburg, avec une salle intérieure et un jardin en plein air, des nuits techno le week-end et une soirée techno le mardi.",
      "en": "Club opened in 2021 at Wiesenweg 1-4 near Rummelsburg, with an indoor floor and an open air garden, techno nights at weekends and a Tuesday techno rave."
    }
  },
  {
    "id": "ctm-festival-berlin",
    "nom": "CTM Festival",
    "type": "festival",
    "paysCode": "DE",
    "villeSlug": "berlin-de",
    "ville": {
      "fr": "Berlin",
      "en": "Berlin"
    },
    "latitude": 52.5104,
    "longitude": 13.4286,
    "capacite": 16000,
    "annee": 1999,
    "mois": {
      "fr": "Janvier",
      "en": "January"
    },
    "styles": [
      "Experimental",
      "Electronica",
      "Deconstructed Club",
      "Ambient"
    ],
    "site": "https://www.ctm-festival.de",
    "description": {
      "fr": "Festival des musiques aventureuses né en 1999 sous le nom club transmediale, organisé chaque fin janvier au Berghain, au Radialsystem et dans d’autres lieux berlinois, avec environ 16 000 visiteurs.",
      "en": "Festival of adventurous music founded in 1999 as club transmediale, held each late January at Berghain, Radialsystem and other Berlin venues, with around 16,000 festival visitors."
    }
  },
  {
    "id": "warehouse-elementenstraat-amsterdam",
    "nom": "Warehouse Elementenstraat",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Westpoort)",
      "en": "Amsterdam (Westpoort)"
    },
    "latitude": 52.394,
    "longitude": 4.8515,
    "capacite": 3000,
    "annee": 2014,
    "styles": [
      "Techno",
      "Hard Techno",
      "Industrial Techno"
    ],
    "site": "https://elementenstraat.nl",
    "description": {
      "fr": "Entrepôt de l’Elementenstraat, dans la zone portuaire ouest, ouvert en 2014 et pouvant accueillir 3 000 personnes, avec un intérieur modulable pour les soirées techno de collectifs comme Verknipt.",
      "en": "Warehouse on Elementenstraat in the western port area, opened in 2014 for up to 3,000 people, with a modular interior for techno events by promoters such as Verknipt."
    }
  },
  {
    "id": "thuishaven-amsterdam",
    "nom": "Thuishaven",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Westpoort)",
      "en": "Amsterdam (Westpoort)"
    },
    "latitude": 52.3968,
    "longitude": 4.8564,
    "capacite": 2500,
    "styles": [
      "Techno",
      "House",
      "Trance"
    ],
    "site": "https://thuishaven.nl",
    "description": {
      "fr": "Lieu de fêtes de jour et de nuit au 68 Contactweg, avec un site extérieur sous tentes pour l’après-midi et le hangar De Loods pour les nuits techno, house et trance.",
      "en": "Day and night party venue at Contactweg 68, with an outdoor site under tents for daytime shows and the De Loods shed for techno, house and trance nights."
    }
  },
  {
    "id": "westweelde-amsterdam",
    "nom": "WestWeelde",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Westerpark)",
      "en": "Amsterdam (Westerpark)"
    },
    "latitude": 52.387,
    "longitude": 4.8699,
    "capacite": 850,
    "annee": 2007,
    "styles": [
      "Techno",
      "House",
      "Disco"
    ],
    "site": "https://www.westweelde.nl",
    "description": {
      "fr": "Club et lieu d’événements du site Westergas, nom qui réunit l’ancienne WesterUnie et la WesterLiefde, avec une salle principale de 850 places, un système d&b et des nuits techno et house.",
      "en": "Club and event venue on the Westergas site, the name now shared by the former WesterUnie and WesterLiefde, with an 850 capacity main room, a d&b system and techno and house nights."
    }
  },
  {
    "id": "gashouder-amsterdam",
    "nom": "Gashouder",
    "type": "club",
    "estSalle": true,
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Westerpark)",
      "en": "Amsterdam (Westerpark)"
    },
    "latitude": 52.3868,
    "longitude": 4.8689,
    "capacite": 3500,
    "styles": [],
    "site": "https://gashouder.nl",
    "description": {
      "fr": "Ancien gazomètre circulaire du parc Westergas, de 3 500 places, qui accueille de grandes nuits techno pendant l’ADE et a rouvert fin octobre 2026 avec un nouveau niveau souterrain.",
      "en": "Round former gas holder in the Westergas park, holding 3,500 people, which hosts large techno nights during ADE and reopened in late October 2026 with a new underground level."
    }
  },
  {
    "id": "skatecafe-amsterdam",
    "nom": "Skatecafé",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Noord)",
      "en": "Amsterdam (Noord)"
    },
    "latitude": 52.3854,
    "longitude": 4.9256,
    "capacite": 1200,
    "styles": [
      "House",
      "Techno",
      "Electro"
    ],
    "site": "https://skatecafe.nl",
    "description": {
      "fr": "Restaurant, café et club du Gedempt Hamerkanaal, voisin de Garage Noord, avec une rampe de skate et des nuits électroniques jusqu’à 3 h le vendredi et le samedi.",
      "en": "Restaurant, café and club on Gedempt Hamerkanaal next to Garage Noord, with a skate ramp and electronic club nights running until 3am on Fridays and Saturdays."
    }
  },
  {
    "id": "club-nyx-amsterdam",
    "nom": "Club NYX",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Centrum)",
      "en": "Amsterdam (Centrum)"
    },
    "latitude": 52.3663,
    "longitude": 4.8913,
    "capacite": 850,
    "annee": 2012,
    "styles": [
      "House",
      "Techno",
      "Disco"
    ],
    "site": "https://clubnyx.nl",
    "description": {
      "fr": "Club LGBTQ+ ouvert en 2012 dans une ancienne remise à voitures de quatre étages de la Reguliersdwarsstraat, successeur du club Exit, avec des étages allant de la pop à la house et la techno.",
      "en": "LGBTQ+ club opened in 2012 in a four storey former carriage house on Reguliersdwarsstraat, successor to Club Exit, with floors ranging from pop to house and techno."
    }
  },
  {
    "id": "doka-amsterdam",
    "nom": "Doka",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Oost)",
      "en": "Amsterdam (Oost)"
    },
    "latitude": 52.3538,
    "longitude": 4.9118,
    "capacite": 250,
    "styles": [
      "Techno",
      "House",
      "Live Electronic"
    ],
    "site": "https://www.volkshotel.nl/en/doka/",
    "description": {
      "fr": "Bar sonore au sous-sol du Volkshotel, ancien siège du journal de Volkskrant, équipé d’un système Danley à quatre points, avec des nuits club jusqu’à 6 h le week-end.",
      "en": "Sound bar in the basement of the Volkshotel, the former de Volkskrant newspaper building, fitted with a four point Danley system and hosting club nights until 6am at weekends."
    }
  },
  {
    "id": "canvas-amsterdam",
    "nom": "Canvas",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Oost)",
      "en": "Amsterdam (Oost)"
    },
    "latitude": 52.3539,
    "longitude": 4.9118,
    "capacite": 400,
    "styles": [
      "House",
      "Disco",
      "Deep House"
    ],
    "site": "https://www.volkshotel.nl/en/canvas/",
    "description": {
      "fr": "Club sur le toit du septième étage du Volkshotel, sur la Wibautstraat, restaurant le jour et piste de danse le vendredi et le samedi soir, avec des invités pendant l’ADE.",
      "en": "Rooftop club on the seventh floor of the Volkshotel on Wibautstraat, a restaurant by day and a dancefloor on Friday and Saturday nights, with guest takeovers during ADE."
    }
  },
  {
    "id": "toekomstmuziek-amsterdam",
    "nom": "Toekomstmuziek",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Houthavens)",
      "en": "Amsterdam (Houthavens)"
    },
    "latitude": 52.3966,
    "longitude": 4.8755,
    "capacite": 300,
    "styles": [
      "Techno",
      "Hard Techno",
      "Experimental"
    ],
    "site": "https://www.toekomstmuziek.com",
    "description": {
      "fr": "Salle et espace communautaire de la Danzigerbocht, près de la Minervahaven, consacrés à la scène underground indépendante, avec studios de répétition et une dizaine d’événements par mois.",
      "en": "Music venue and community space on Danzigerbocht near the Minervahaven, devoted to the independent underground scene, with rehearsal rooms and around ten events a month."
    }
  },
  {
    "id": "murmur-amsterdam",
    "nom": "murmur",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Noord)",
      "en": "Amsterdam (Noord)"
    },
    "latitude": 52.3857,
    "longitude": 4.9279,
    "capacite": 250,
    "styles": [
      "House",
      "Electronica",
      "Experimental"
    ],
    "site": "https://murmurmur.nl",
    "description": {
      "fr": "Lieu culturel de Nieuwendammerham, à Amsterdam Noord, qui réunit restaurant, bar, espace d’exposition et salle de concert, avec des soirées DJ et des concerts plusieurs fois par semaine.",
      "en": "Cultural space in Nieuwendammerham, Amsterdam Noord, combining a restaurant, bar, exhibition space and music room, with DJ nights and concerts several times a week."
    }
  },
  {
    "id": "paradiso-amsterdam",
    "nom": "Paradiso",
    "type": "club",
    "estSalle": true,
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Centrum)",
      "en": "Amsterdam (Centrum)"
    },
    "latitude": 52.3622,
    "longitude": 4.8838,
    "capacite": 1500,
    "annee": 1968,
    "styles": [],
    "site": "https://www.paradiso.nl",
    "description": {
      "fr": "Salle de concert de la Weteringschans ouverte en 1968, qui alterne concerts pop et nuits club, dont des soirées électroniques organisées sous la bannière Club Paradiso.",
      "en": "Concert venue on Weteringschans opened in 1968, alternating pop concerts with club nights, including electronic parties run under the Club Paradiso banner."
    }
  },
  {
    "id": "melkweg-amsterdam",
    "nom": "Melkweg",
    "type": "club",
    "estSalle": true,
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Centrum)",
      "en": "Amsterdam (Centrum)"
    },
    "latitude": 52.3648,
    "longitude": 4.8811,
    "capacite": 1500,
    "styles": [],
    "site": "https://www.melkweg.nl",
    "description": {
      "fr": "Centre culturel de la Lijnbaansgracht, près du Leidseplein, qui mêle concerts de tous genres et nuits club régulières comme Techno Tuesday ou les soirées drum & bass Cheeky Monday.",
      "en": "Cultural centre on Lijnbaansgracht near Leidseplein, mixing concerts of every genre with regular club nights such as Techno Tuesday and the Cheeky Monday drum & bass parties."
    }
  },
  {
    "id": "parallel-amsterdam",
    "nom": "Parallel",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Noord)",
      "en": "Amsterdam (Noord)"
    },
    "latitude": 52.3834,
    "longitude": 4.9036,
    "capacite": 400,
    "styles": [
      "House",
      "Afro House",
      "Techno"
    ],
    "site": "https://www.paradiso.nl",
    "description": {
      "fr": "Salle club de Paradiso au 5C Buiksloterweg, à l’arrière du bâtiment Tolhuistuin, accessible par le ferry gratuit depuis la gare centrale, avec des nuits électroniques jusqu’au matin.",
      "en": "Paradiso’s club room at Buiksloterweg 5C, at the back of the Tolhuistuin building, reached by the free ferry from Central Station, hosting electronic nights until morning."
    }
  },
  {
    "id": "club-raum-amsterdam",
    "nom": "Club RAUM",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Westpoort)",
      "en": "Amsterdam (Westpoort)"
    },
    "latitude": 52.3913,
    "longitude": 4.8311,
    "capacite": 500,
    "styles": [
      "Techno",
      "House",
      "Electro"
    ],
    "site": "https://www.clubraum.nl",
    "description": {
      "fr": "Club et espace culturel queer du 3 Humberweg, né des soirées SPIELRAUM, avec une programmation techno, house et electro, une entrée à 21 ans et des téléphones masqués par un autocollant.",
      "en": "Queer run club and cultural space at Humberweg 3, born from the SPIELRAUM parties, with techno, house and electro bookings, entry from 21 and phone cameras covered with a sticker."
    }
  },
  {
    "id": "panama-amsterdam",
    "nom": "Panama",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Oostelijk Havengebied)",
      "en": "Amsterdam (Eastern Docklands)"
    },
    "latitude": 52.3749,
    "longitude": 4.9304,
    "capacite": 1050,
    "styles": [
      "Techno",
      "Trance"
    ],
    "site": "https://panama.nl",
    "description": {
      "fr": "Club installé dans une ancienne centrale électrique de l’Oostelijke Handelskade, avec une salle à balcon de 1 050 places, un studio de 150 places et une programmation allant de la techno à la trance.",
      "en": "Club in a former power station on Oostelijke Handelskade, with a 1,050 capacity balcony room, a 150 capacity studio and a programme ranging from techno to trance."
    }
  },
  {
    "id": "het-sieraad-amsterdam",
    "nom": "Het Sieraad",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (De Baarsjes)",
      "en": "Amsterdam (De Baarsjes)"
    },
    "latitude": 52.3641,
    "longitude": 4.8591,
    "capacite": 1000,
    "styles": [
      "House",
      "Techno",
      "Melodic Techno"
    ],
    "site": "https://hetsieraad.nl",
    "description": {
      "fr": "Club dans une ancienne école d’artisanat des années 1920 au 1 Postjesweg, classée monument national, avec une salle sous verrière et des programmations house et techno de jour comme de nuit.",
      "en": "Club in a 1920s former craft school at Postjesweg 1, a national monument, with a main hall under a glass roof and house and techno line-ups by day and night."
    }
  },
  {
    "id": "radio-radio-amsterdam",
    "nom": "Radio Radio",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Westerpark)",
      "en": "Amsterdam (Westerpark)"
    },
    "latitude": 52.3861,
    "longitude": 4.8741,
    "capacite": 300,
    "styles": [
      "House",
      "Disco",
      "Deep House"
    ],
    "site": "https://radioradio.radio",
    "description": {
      "fr": "Club et station de radio du 3 Pazzanistraat, dont la station RRFM diffuse en direct, avec des résidents comme Tom Trago, Dam Swindle et Cinnaman et des nuits house du jeudi au samedi.",
      "en": "Club and radio station at Pazzanistraat 3, whose RRFM station streams live, with residents such as Tom Trago, Dam Swindle and Cinnaman and house nights from Thursday to Saturday."
    }
  },
  {
    "id": "club-john-doe-amsterdam",
    "nom": "Club John Doe",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Centrum)",
      "en": "Amsterdam (Centrum)"
    },
    "latitude": 52.3665,
    "longitude": 4.8976,
    "capacite": 300,
    "annee": 2014,
    "styles": [
      "Techno",
      "Hard Techno"
    ],
    "site": "https://www.clubjohndoe.nl",
    "description": {
      "fr": "Club techno du Rembrandtplein ouvert en 2014, actif presque tous les soirs avec des séries comme Amsterdam Techno Sessions et des nuits hard techno jusqu’au petit matin le week-end.",
      "en": "Techno club on Rembrandtplein opened in 2014, open most nights with series such as Amsterdam Techno Sessions and hard techno nights running into the early morning at weekends."
    }
  },
  {
    "id": "the-other-side-amsterdam",
    "nom": "THE OTHER SIDE",
    "type": "club",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam (Houthavens)",
      "en": "Amsterdam (Houthavens)"
    },
    "latitude": 52.3953,
    "longitude": 4.8748,
    "capacite": 1100,
    "styles": [
      "House",
      "Deep House",
      "Techno"
    ],
    "site": "https://the-other-side.nl",
    "description": {
      "fr": "Club installé dans un ancien atelier de vélos de la Rigakade, fondé par Doeshka Vrede et Jasper Löwik et équipé d’un système spatial L-Acoustics L-ISA autour de la piste.",
      "en": "Club in a former bicycle workshop on Rigakade, founded by Doeshka Vrede and Jasper Löwik and fitted with an L-Acoustics L-ISA spatial sound system around the dancefloor."
    }
  },
  {
    "id": "amf-amsterdam",
    "nom": "AMF (Amsterdam Music Festival)",
    "type": "festival",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam",
      "en": "Amsterdam"
    },
    "latitude": 52.3144,
    "longitude": 4.9428,
    "capacite": 40000,
    "mois": {
      "fr": "Octobre",
      "en": "October"
    },
    "styles": [
      "EDM",
      "Big Room",
      "Techno",
      "Trance"
    ],
    "site": "https://www.amf-festival.com",
    "description": {
      "fr": "Grand rendez-vous de l’Amsterdam Dance Event au Johan Cruijff ArenA, une nuit d’octobre pour environ 40 000 personnes, avec en 2026 David Guetta, Armin van Buuren, Afrojack et Amelie Lens.",
      "en": "Major Amsterdam Dance Event night at the Johan Cruijff ArenA, one October night for around 40,000 people, with David Guetta, Armin van Buuren, Afrojack and Amelie Lens in 2026."
    }
  },
  {
    "id": "milkshake-festival-amsterdam",
    "nom": "Milkshake Festival",
    "type": "festival",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam",
      "en": "Amsterdam"
    },
    "latitude": 52.3872,
    "longitude": 4.8718,
    "capacite": 25000,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "House",
      "Disco",
      "Techno",
      "Dance"
    ],
    "site": "https://www.milkshakefestival.com",
    "description": {
      "fr": "Festival LGBTQ+ de deux jours au Westerpark, organisé par Paradiso et AIR, avec neuf scènes par jour et environ 25 000 visiteurs quotidiens, programmé fin juillet.",
      "en": "Two day LGBTQ+ festival in Westerpark, organised by Paradiso and AIR, with nine stages a day and around 25,000 visitors daily at the end of July."
    }
  },
  {
    "id": "amsterdam-open-air-amsterdam",
    "nom": "Amsterdam Open Air",
    "type": "festival",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Amsterdam",
      "en": "Amsterdam"
    },
    "latitude": 52.3102,
    "longitude": 4.9935,
    "capacite": 25000,
    "mois": {
      "fr": "Juin",
      "en": "June"
    },
    "styles": [
      "House",
      "Techno",
      "Tech House"
    ],
    "site": "https://www.amsterdamopenair.nl",
    "description": {
      "fr": "Festival house et techno du Gaasperpark, dans le sud-est d’Amsterdam, organisé début juin, dont l’édition 2027 avec Marlon Hoffstadt affiche complet sur ses deux jours.",
      "en": "House and techno festival in Gaasperpark, south-east Amsterdam, held in early June, whose 2027 edition with Marlon Hoffstadt has sold out on both days."
    }
  },
  {
    "id": "umi-bruxelles",
    "nom": "UMI",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Îlot Sacré)",
      "en": "Brussels (Îlot Sacré)"
    },
    "latitude": 50.8459,
    "longitude": 4.353,
    "capacite": 800,
    "styles": [
      "House",
      "Minimal",
      "Breaks"
    ],
    "site": "https://ra.co/clubs/222489",
    "description": {
      "fr": "Club du 10 rue du Marché aux Fromages, près de la gare Centrale, sur plusieurs étages, avec une salle chill à l’étage, une politique sans téléphone et la série BLUR le samedi.",
      "en": "Club at 10 Rue du Marché aux Fromages near Central Station, spread over several floors, with an upstairs chill room, a no phones policy and the BLUR series on Saturdays."
    }
  },
  {
    "id": "la-fabriek-bruxelles",
    "nom": "La Fabriek",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Anderlecht)",
      "en": "Brussels (Anderlecht)"
    },
    "latitude": 50.8322,
    "longitude": 4.322,
    "capacite": 350,
    "styles": [
      "Techno",
      "Breaks",
      "Global Club"
    ],
    "site": "https://ra.co/clubs/244526",
    "description": {
      "fr": "Espace club, cantine et bar du site Studio CityGate à Anderlecht, de 350 places, programmé avec des collectifs bruxellois entre techno, breaks, baile funk et nouvelles sonorités club.",
      "en": "Club space, canteen and bar on the Studio CityGate site in Anderlecht, holding 350 people, programmed with Brussels collectives across techno, breaks, baile funk and newer club sounds."
    }
  },
  {
    "id": "recyclart-bruxelles",
    "nom": "Recyclart",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Molenbeek)",
      "en": "Brussels (Molenbeek)"
    },
    "latitude": 50.8475,
    "longitude": 4.3282,
    "capacite": 500,
    "annee": 2000,
    "styles": [
      "Techno",
      "Dub",
      "Experimental"
    ],
    "site": "https://www.recyclart.be",
    "description": {
      "fr": "Centre d’art pluridisciplinaire né en 2000 dans la gare de Bruxelles-Chapelle et installé depuis 2018 rue de Manchester à Molenbeek, avec un programme club, dub et expérimental.",
      "en": "Multidisciplinary arts centre founded in 2000 at Brussels-Chapelle station and based since 2018 on Rue de Manchester in Molenbeek, with a club, dub and experimental programme."
    }
  },
  {
    "id": "kiosk-radio-bruxelles",
    "nom": "Kiosk Radio",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Parc de Bruxelles)",
      "en": "Brussels (Parc de Bruxelles)"
    },
    "latitude": 50.8434,
    "longitude": 4.3626,
    "capacite": 200,
    "annee": 2017,
    "styles": [
      "House",
      "Ambient",
      "Dubstep",
      "Electronica"
    ],
    "site": "https://kioskradio.com",
    "description": {
      "fr": "Radio installée depuis 2017 dans un kiosque du parc de Bruxelles, qui diffuse chaque jour des DJ sets en direct devant le public du parc et organise aussi des nuits club.",
      "en": "Radio station based since 2017 in a kiosk in the Parc de Bruxelles, broadcasting live DJ sets every day in front of park visitors and also running club nights."
    }
  },
  {
    "id": "mirano-bruxelles",
    "nom": "Mirano",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Saint-Josse)",
      "en": "Brussels (Saint-Josse)"
    },
    "latitude": 50.8493,
    "longitude": 4.3714,
    "capacite": 1000,
    "annee": 1981,
    "styles": [
      "House",
      "Techno",
      "Club"
    ],
    "site": "https://www.miranobrussels.com",
    "description": {
      "fr": "Ancien cinéma de la chaussée de Louvain devenu club en 1981 sous le nom Mirano Continental, parmi les premiers en Belgique à passer house et techno, rouvert en 2019 après rénovation.",
      "en": "Former cinema on Chaussée de Louvain that became the Mirano Continental club in 1981, among the first in Belgium to play house and techno, reopened in 2019 after renovation."
    }
  },
  {
    "id": "jeux-d-hiver-bruxelles",
    "nom": "Jeux d’Hiver",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Bois de la Cambre)",
      "en": "Brussels (Bois de la Cambre)"
    },
    "latitude": 50.8125,
    "longitude": 4.3712,
    "capacite": 600,
    "styles": [
      "House",
      "Tech House"
    ],
    "site": "https://www.jeuxdhiver.be",
    "description": {
      "fr": "Restaurant et club niché dans le bois de la Cambre, chemin du Gymnase, fréquenté depuis des décennies par les noctambules bruxellois pour ses soirées house et ses fêtes commencées l’après-midi.",
      "en": "Restaurant and club tucked into the Bois de la Cambre on Chemin du Gymnase, drawing Brussels night owls for decades with house nights and parties that start in the afternoon."
    }
  },
  {
    "id": "ancienne-belgique-bruxelles",
    "nom": "Ancienne Belgique (AB)",
    "type": "club",
    "estSalle": true,
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Centre)",
      "en": "Brussels (Centre)"
    },
    "latitude": 50.847,
    "longitude": 4.3493,
    "capacite": 2000,
    "styles": [],
    "site": "https://www.abconcerts.be",
    "description": {
      "fr": "Salle de concert du boulevard Anspach, avec une grande salle et l’AB Club, qui programme des concerts de tous genres et des soirées électroniques, de l’afro au braindance.",
      "en": "Concert venue on Boulevard Anspach with a main hall and the smaller AB Club, programming concerts of every genre alongside electronic nights from afro to braindance."
    }
  },
  {
    "id": "botanique-bruxelles",
    "nom": "Le Botanique",
    "type": "club",
    "estSalle": true,
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Saint-Josse)",
      "en": "Brussels (Saint-Josse)"
    },
    "latitude": 50.8549,
    "longitude": 4.3652,
    "capacite": 650,
    "styles": [],
    "site": "https://botanique.be",
    "description": {
      "fr": "Centre culturel installé dans les anciennes serres du jardin botanique, rue Royale, avec plusieurs salles de concert qui accueillent régulièrement des artistes électroniques et des soirées de labels.",
      "en": "Cultural centre in the former greenhouses of the botanical garden on Rue Royale, with several concert rooms that regularly host electronic artists and label nights."
    }
  },
  {
    "id": "bozar-bruxelles",
    "nom": "Bozar",
    "type": "club",
    "estSalle": true,
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Mont des Arts)",
      "en": "Brussels (Mont des Arts)"
    },
    "latitude": 50.8442,
    "longitude": 4.3595,
    "capacite": 2200,
    "styles": [],
    "site": "https://www.bozar.be",
    "description": {
      "fr": "Palais des Beaux-Arts de la rue Ravenstein, centre culturel pluridisciplinaire dont le programme compte une catégorie musique électronique et la série de concerts Bozar Bassment.",
      "en": "Centre for Fine Arts on Rue Ravenstein, a multidisciplinary cultural centre whose programme includes an electronic music strand and the Bozar Bassment concert series."
    }
  },
  {
    "id": "vk-bruxelles",
    "nom": "VK Concerts",
    "type": "club",
    "estSalle": true,
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Molenbeek)",
      "en": "Brussels (Molenbeek)"
    },
    "latitude": 50.8567,
    "longitude": 4.3386,
    "capacite": 600,
    "styles": [],
    "site": "https://www.vkconcerts.be",
    "description": {
      "fr": "Salle de concert de la rue de l’École à Molenbeek, près du canal, qui alterne hip-hop, musiques du monde et nuits club comme Rougheure, entre baile funk, grime et house.",
      "en": "Concert venue on Rue de l’École in Molenbeek near the canal, alternating hip hop, global music and club nights such as Rougheure, mixing baile funk, grime and house."
    }
  },
  {
    "id": "ing-arena-bruxelles",
    "nom": "ING Arena (ex-Palais 12)",
    "type": "club",
    "estSalle": true,
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Heysel)",
      "en": "Brussels (Heysel)"
    },
    "latitude": 50.9011,
    "longitude": 4.3423,
    "capacite": 12000,
    "annee": 2013,
    "styles": [],
    "site": "https://www.palais12.com",
    "description": {
      "fr": "Grande salle du plateau du Heysel, anciennement Palais 12, ouverte en septembre 2013 pour 12 000 personnes, qui accueille des tournées internationales et des événements électroniques comme Rave Rebels.",
      "en": "Large arena on the Heysel plateau, formerly Palais 12, opened in September 2013 for up to 12,000 people, hosting international tours and electronic events such as Rave Rebels."
    }
  },
  {
    "id": "badaboum-paris",
    "nom": "Badaboum",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Bastille)",
      "en": "Paris (Bastille)"
    },
    "latitude": 48.8536,
    "longitude": 2.3757,
    "capacite": 500,
    "annee": 2013,
    "styles": [
      "House",
      "Techno",
      "Disco"
    ],
    "site": "https://badaboum.paris",
    "description": {
      "fr": "Club et salle de concert ouverts en 2013 rue des Taillandiers, dans l’ancienne Scène Bastille, avec piste principale, mini-club à l’étage et nuits house, disco et techno le week-end.",
      "en": "Club and concert venue opened in 2013 on Rue des Taillandiers in the former Scène Bastille, with a main floor, an upstairs mini-club and weekend house, disco and techno nights."
    }
  },
  {
    "id": "djoon-paris",
    "nom": "Djoon",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Quai de la Gare)",
      "en": "Paris (Quai de la Gare)"
    },
    "latitude": 48.8366,
    "longitude": 2.3716,
    "capacite": 400,
    "annee": 2003,
    "styles": [
      "House",
      "Deep House",
      "Soulful House",
      "Afro House"
    ],
    "site": "https://djoon.com",
    "description": {
      "fr": "Loft du boulevard Vincent-Auriol ouvert en 2003 au pied du métro aérien de la ligne 6, consacré à la house soulful, deep et afro, avec une piste en contrebas et de grandes baies vitrées.",
      "en": "Loft on Boulevard Vincent-Auriol opened in 2003 beside the elevated line 6 metro, dedicated to soulful, deep and afro house, with a sunken dancefloor and large windows facing the tracks."
    }
  },
  {
    "id": "la-java-paris",
    "nom": "La Java",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Belleville)",
      "en": "Paris (Belleville)"
    },
    "latitude": 48.871,
    "longitude": 2.3739,
    "capacite": 450,
    "annee": 1923,
    "styles": [
      "House",
      "Techno"
    ],
    "site": "https://la-java.fr",
    "description": {
      "fr": "Ancien bal populaire de 1923 au sous-sol de la galerie du Palais du Commerce à Belleville, devenu club et salle de concert de 450 places avec nuits house et techno jusqu’à l’aube.",
      "en": "Former 1923 dance hall in the basement of the Palais du Commerce arcade in Belleville, now a 450-capacity club and concert venue running house and techno nights until dawn."
    }
  },
  {
    "id": "sacre-paris",
    "nom": "Sacré",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Sentier)",
      "en": "Paris (Sentier)"
    },
    "latitude": 48.869,
    "longitude": 2.3434,
    "capacite": 350,
    "annee": 2019,
    "styles": [
      "House",
      "Deep House",
      "Techno"
    ],
    "site": "https://www.sacre.paris",
    "description": {
      "fr": "Club du 2e arrondissement ouvert en 2019 rue Montmartre dans l’ancien espace du Social Club, qui programme DJ house et techno le week-end ainsi que des soirées hip-hop et du stand-up.",
      "en": "Club in the 2nd arrondissement opened in 2019 on Rue Montmartre in the former Social Club space, booking house and techno DJs at weekends alongside hip-hop nights and stand-up comedy."
    }
  },
  {
    "id": "glazart-paris",
    "nom": "Glazart",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Porte de la Villette)",
      "en": "Paris (Porte de la Villette)"
    },
    "latitude": 48.8993,
    "longitude": 2.3866,
    "capacite": 700,
    "annee": 1992,
    "styles": [
      "Techno",
      "Drum & Bass"
    ],
    "site": "https://www.glazart.com",
    "description": {
      "fr": "Salle de concert et club de la porte de la Villette fondé en 1992, connu pour ses afters After O’Clock du week-end en techno et drum & bass et sa plage de sable estivale.",
      "en": "Concert hall and club at Porte de la Villette founded in 1992, known for its weekend After O’Clock sessions of techno and drum & bass and its summer sand beach."
    }
  },
  {
    "id": "cabaret-sauvage-paris",
    "nom": "Cabaret Sauvage",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Parc de la Villette)",
      "en": "Paris (Parc de la Villette)"
    },
    "latitude": 48.8956,
    "longitude": 2.3923,
    "capacite": 1300,
    "annee": 1997,
    "styles": [],
    "site": "https://www.cabaretsauvage.com",
    "description": {
      "fr": "Chapiteau à miroirs du parc de la Villette fondé en 1997, qui alterne concerts, cabaret et cirque avec des nuits techno et house, sous la toile comme sur sa grande terrasse extérieure.",
      "en": "Mirrored big top in Parc de la Villette founded in 1997, alternating concerts, cabaret and circus with techno and house nights, both under the tent and on its large outdoor terrace."
    }
  },
  {
    "id": "t7-paris",
    "nom": "T7",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Porte de Versailles)",
      "en": "Paris (Porte de Versailles)"
    },
    "latitude": 48.8276,
    "longitude": 2.29,
    "capacite": 1000,
    "annee": 2017,
    "styles": [
      "Techno",
      "Minimal",
      "House"
    ],
    "site": "https://t7-paris.com",
    "description": {
      "fr": "Club ouvert en décembre 2017 sur le toit du pavillon 7 de Paris Expo Porte de Versailles, avec salle vitrée, système Funktion-One et terrasse, dédié le week-end à la techno et à la minimale.",
      "en": "Club opened in December 2017 on the roof of Pavilion 7 at Paris Expo Porte de Versailles, with a glass-walled room, Funktion-One sound and a terrace, devoted to techno and minimal at weekends."
    }
  },
  {
    "id": "panic-room-paris",
    "nom": "Panic Room",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Oberkampf)",
      "en": "Paris (Oberkampf)"
    },
    "latitude": 48.8612,
    "longitude": 2.3676,
    "capacite": 150,
    "annee": 2012,
    "styles": [
      "House",
      "Global Club"
    ],
    "site": "https://www.panicroomparis.com",
    "description": {
      "fr": "Bar de quartier de la rue Amelot ouvert en 2012, à entrée gratuite, où DJ house et collectifs locaux jouent du mercredi au samedi jusque tard dans la nuit.",
      "en": "Neighbourhood bar on Rue Amelot open since 2012, with free entry all night, where house DJs and local collectives play from Wednesday to Saturday."
    }
  },
  {
    "id": "techno-parade-paris",
    "nom": "Techno Parade",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (Bastille, République, Nation)",
      "en": "Paris (Bastille, République, Nation)"
    },
    "latitude": 48.8529,
    "longitude": 2.3692,
    "capacite": 100000,
    "annee": 1998,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "Techno",
      "House",
      "Hardcore",
      "Trance"
    ],
    "site": "https://www.technoparade.fr",
    "description": {
      "fr": "Parade annuelle des musiques électroniques organisée par Technopol depuis 1998, dont les chars sonorisés ont relié en 2026 la place de la Bastille à la place de la Nation par République.",
      "en": "Annual electronic music parade run by Technopol since 1998, whose sound-system floats travelled in 2026 from Place de la Bastille to Place de la Nation via République."
    }
  },
  {
    "id": "obe-lyon",
    "nom": "OBE",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Confluence)",
      "en": "Lyon (Confluence)"
    },
    "latitude": 45.7383,
    "longitude": 4.815,
    "capacite": 500,
    "annee": 2026,
    "styles": [
      "House",
      "Tech House",
      "Techno",
      "Indie Dance"
    ],
    "site": "https://www.instagram.com/obe.lyon/",
    "description": {
      "fr": "Club ouvert en septembre 2026 au 45 quai Rambaud, à quelques pas de La Sucrière, annoncé pour 500 personnes avec une programmation house, tech house, techno et indie.",
      "en": "Club opened in September 2026 at 45 Quai Rambaud, a short walk from La Sucrière, announced for 500 people with house, tech house, techno and indie programming."
    }
  },
  {
    "id": "anticlub-lyon",
    "nom": "AntiClub",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Quai Arloing)",
      "en": "Lyon (Quai Arloing)"
    },
    "latitude": 45.771,
    "longitude": 4.8117,
    "capacite": 150,
    "styles": [
      "Techno",
      "Hardgroove"
    ],
    "site": "https://www.anticlub.fr",
    "description": {
      "fr": "Club associatif actif depuis fin 2025 au fond d’une allée du quai Arloing, sur les bords de Saône, où photos et vidéos sont proscrites pendant les nuits techno et hard groove.",
      "en": "Non-profit club active since late 2025 at the end of an alley on Quai Arloing by the Saône, where photos and videos are banned during techno and hard groove nights."
    }
  },
  {
    "id": "super5-lyon",
    "nom": "Super5",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Pentes de la Croix-Rousse)",
      "en": "Lyon (Croix-Rousse slopes)"
    },
    "latitude": 45.7694,
    "longitude": 4.8299,
    "capacite": 80,
    "styles": [
      "House",
      "Techno",
      "Disco"
    ],
    "site": "https://www.instagram.com/super5.lyon/",
    "description": {
      "fr": "Bar-club au pied des pentes de la Croix-Rousse, au décor de repaire est-allemand, où platines vinyle et DJ locaux animent une petite piste sous boule à facettes.",
      "en": "Bar-club at the foot of the Croix-Rousse slopes with an East German hideout decor, where vinyl decks and local DJs drive a small dancefloor under a mirror ball."
    }
  },
  {
    "id": "transbordeur-lyon",
    "nom": "Le Transbordeur",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Villeurbanne)",
      "en": "Lyon (Villeurbanne)"
    },
    "latitude": 45.784,
    "longitude": 4.8608,
    "capacite": 1800,
    "annee": 1989,
    "styles": [],
    "site": "https://www.transbordeur.fr",
    "description": {
      "fr": "Salle de concert ouverte en janvier 1989 avec New Order, boulevard de Stalingrad à Villeurbanne, dont la grande salle de 1 800 places accueille aussi des nuits techno et le festival Reperkusound.",
      "en": "Concert venue opened in January 1989 with New Order on Boulevard de Stalingrad in Villeurbanne, whose 1,800-capacity main hall also hosts techno nights and the Reperkusound festival."
    }
  },
  {
    "id": "la-rayonne-lyon",
    "nom": "La Rayonne (CCO)",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Villeurbanne, L’Autre Soie)",
      "en": "Lyon (Villeurbanne, L’Autre Soie)"
    },
    "latitude": 45.7567,
    "longitude": 4.9169,
    "capacite": 1000,
    "styles": [],
    "site": "https://cco-villeurbanne.org",
    "description": {
      "fr": "Salle du CCO installée sur le site de L’Autre Soie à Villeurbanne, près du métro Vaulx-en-Velin La Soie, qui reçoit jusqu’à 1 000 personnes debout pour concerts et soirées techno ou psytrance.",
      "en": "CCO hall on the L’Autre Soie site in Villeurbanne, near Vaulx-en-Velin La Soie metro, holding up to 1,000 standing for concerts as well as techno and psytrance nights."
    }
  },
  {
    "id": "halle-tony-garnier-lyon",
    "nom": "Halle Tony Garnier",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Gerland)",
      "en": "Lyon (Gerland)"
    },
    "latitude": 45.7299,
    "longitude": 4.825,
    "capacite": 17000,
    "styles": [],
    "site": "https://www.htg.fr",
    "description": {
      "fr": "Ancienne halle du marché aux bestiaux de Gerland conçue par Tony Garnier, devenue salle de concerts jusqu’à 17 000 personnes, qui accueille des nuits hard techno comme Teletech et Outworld et le festival Reperkusound.",
      "en": "Former livestock market hall in Gerland designed by Tony Garnier, now a concert hall for up to 17,000 people, hosting hard techno nights such as Teletech and Outworld and the Reperkusound festival."
    }
  },
  {
    "id": "grrrnd-zero-lyon",
    "nom": "Grrrnd Zero",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Vaulx-en-Velin, La Soie)",
      "en": "Lyon (Vaulx-en-Velin, La Soie)"
    },
    "latitude": 45.7652,
    "longitude": 4.9271,
    "capacite": 500,
    "styles": [],
    "site": "https://www.grrrndzero.org",
    "description": {
      "fr": "Lieu associatif installé dans un bâtiment industriel avenue de Böhlen à Vaulx-en-Velin, qui mêle concerts expérimentaux, nuits psytrance et acid techno dans un esprit DIY.",
      "en": "Non-profit venue in an industrial building on Avenue de Böhlen in Vaulx-en-Velin, mixing experimental concerts, psytrance nights and acid techno in a DIY spirit."
    }
  },
  {
    "id": "le-sonic-lyon",
    "nom": "Le Sonic",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Quai des Étroits)",
      "en": "Lyon (Quai des Étroits)"
    },
    "latitude": 45.7509,
    "longitude": 4.8199,
    "capacite": 150,
    "styles": [],
    "site": "https://sonic-lyon.fr",
    "description": {
      "fr": "Péniche amarrée quai des Étroits dans le 5e arrondissement, qui programme des concerts underground de musiques actuelles et des nuits techno jusqu’à 4 heures du matin.",
      "en": "Barge moored on Quai des Étroits in the 5th arrondissement, programming underground live music alongside techno nights that run until 4 in the morning."
    }
  },
  {
    "id": "heat-lyon",
    "nom": "HEAT",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Confluence)",
      "en": "Lyon (Confluence)"
    },
    "latitude": 45.7369,
    "longitude": 4.8202,
    "capacite": 1000,
    "styles": [],
    "site": "https://h-eat.eu",
    "description": {
      "fr": "Halle à manger du quai Perrache faite de conteneurs maritimes de street food, qui accueille DJ sets, concerts, collectifs locaux et le Mini Sonore de Nuits Sonores.",
      "en": "Food hall on Quai Perrache built from street food shipping containers, hosting DJ sets, concerts, local collectives and Mini Sonore, the family edition of Nuits Sonores."
    }
  },
  {
    "id": "livestation-diy-lyon",
    "nom": "Livestation DIY",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Guillotière)",
      "en": "Lyon (Guillotière)"
    },
    "latitude": 45.7532,
    "longitude": 4.8399,
    "capacite": 150,
    "styles": [
      "House",
      "Techno"
    ],
    "site": "https://livestationdiy.com",
    "description": {
      "fr": "Bar-restaurant de la rue de Bonald pensé comme lieu de rencontre autour des musiques électroniques, avec DJ sets fréquents, concerts, expositions et brunch le dimanche.",
      "en": "Bar and restaurant on Rue de Bonald conceived as a meeting place around electronic music, with frequent DJ sets, concerts, exhibitions and a Sunday brunch."
    }
  },
  {
    "id": "periscope-lyon",
    "nom": "Le Périscope",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Perrache)",
      "en": "Lyon (Perrache)"
    },
    "latitude": 45.747,
    "longitude": 4.8275,
    "capacite": 200,
    "annee": 2007,
    "styles": [],
    "site": "https://www.periscope-lyon.com",
    "description": {
      "fr": "Salle fondée en 2007 rue Delandine près de Perrache par des collectifs de musiciens, centrée sur le jazz et les musiques improvisées, qui programme aussi électronique et esthétiques expérimentales.",
      "en": "Venue founded in 2007 on Rue Delandine near Perrache by musicians’ collectives, focused on jazz and improvised music while also programming electronic and experimental acts."
    }
  },
  {
    "id": "brunch-electronik-lyon",
    "nom": "Brunch Electronik Lyon",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Grand Parc Miribel Jonage)",
      "en": "Lyon (Grand Parc Miribel Jonage)"
    },
    "latitude": 45.8005,
    "longitude": 4.9416,
    "capacite": 8000,
    "annee": 2024,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "Techno",
      "Hard Techno",
      "House"
    ],
    "site": "https://france.brunchelectronik.com",
    "description": {
      "fr": "Déclinaison lyonnaise du Brunch Electronik barcelonais, lancée en septembre 2024 sur la plage de L’Atol’ au Grand Parc Miribel Jonage, sur deux journées techno et house au bord du lac.",
      "en": "Lyon edition of the Barcelona-born Brunch Electronik, launched in September 2024 on the L’Atol’ beach in Grand Parc Miribel Jonage, with two days of techno and house by the lake."
    }
  },
  {
    "id": "unite-22-marseille",
    "nom": "Unité.22",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Belle de Mai)",
      "en": "Marseille (Belle de Mai)"
    },
    "latitude": 43.3105,
    "longitude": 5.3892,
    "capacite": 400,
    "annee": 2025,
    "styles": [
      "Techno",
      "Trance",
      "Bass",
      "Hardgroove"
    ],
    "site": "https://www.unite22.fr",
    "description": {
      "fr": "Club d’une seule salle ouvert fin 2025 rue Jobin par le collectif Animals Industry, pour 400 personnes, sans photo ni vidéo, consacré à la techno, à la trance et à la bass music.",
      "en": "Single-room club opened in late 2025 on Rue Jobin by the Animals Industry collective, holding 400 people under a no-photo policy and dedicated to techno, trance and bass music."
    }
  },
  {
    "id": "danceteria-marseille",
    "nom": "Danceteria",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Opéra)",
      "en": "Marseille (Opéra)"
    },
    "latitude": 43.2938,
    "longitude": 5.3752,
    "capacite": 400,
    "styles": [
      "Techno",
      "House",
      "Dark Disco",
      "Indie Dance"
    ],
    "site": "https://danceteria.fr",
    "description": {
      "fr": "Club indépendant du quartier de l’Opéra, près du Vieux-Port, nommé d’après le club new-yorkais, avec trois salles, deux bars et un système Funktion-One pour la techno et la house.",
      "en": "Independent club in the Opéra district near the Old Port, named after the New York club, with three rooms, two bars and a Funktion-One sound system for techno and house."
    }
  },
  {
    "id": "le-makeda-marseille",
    "nom": "Le Makeda",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (La Plaine)",
      "en": "Marseille (La Plaine)"
    },
    "latitude": 43.2932,
    "longitude": 5.3917,
    "capacite": 270,
    "annee": 2019,
    "styles": [],
    "site": "https://lemakeda.com",
    "description": {
      "fr": "Salle de 270 places ouverte en 2019 rue Ferrari, près de La Plaine, qui alterne concerts rap, rock et électro avec des soirées DJ du jeudi au samedi.",
      "en": "270-capacity venue opened in 2019 on Rue Ferrari near La Plaine, alternating rap, rock and electronic concerts with DJ nights from Thursday to Saturday."
    }
  },
  {
    "id": "la-plateforme-marseille",
    "nom": "La Plateforme (ex-Dock des Suds)",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Arenc)",
      "en": "Marseille (Arenc)"
    },
    "latitude": 43.3147,
    "longitude": 5.3681,
    "capacite": 3000,
    "styles": [],
    "site": "https://laplateforme.io/evenements/",
    "description": {
      "fr": "Ancien Dock des Suds de la rue Urbain V, occupé depuis 2025 par l’école La Plateforme, dont la Salle des Sucres d’environ 3 000 places reçoit des nuits techno et hard techno.",
      "en": "Former Dock des Suds on Rue Urbain V, occupied since 2025 by the La Plateforme school, whose Salle des Sucres holds about 3,000 people for techno and hard techno nights."
    }
  },
  {
    "id": "rooftop-terrasses-marseille",
    "nom": "Le Rooftop des Terrasses (ex-R2)",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Arenc, Terrasses du Port)",
      "en": "Marseille (Arenc, Terrasses du Port)"
    },
    "latitude": 43.3069,
    "longitude": 5.3645,
    "capacite": 1500,
    "styles": [
      "House",
      "Tech House"
    ],
    "site": "https://lerooftopdesterrasses.com",
    "description": {
      "fr": "Toit-terrasse du centre commercial des Terrasses du Port face à la mer, ouvert d’avril à octobre, où DJ sets et soirées à thème se succèdent après le coucher du soleil.",
      "en": "Rooftop of the Terrasses du Port shopping centre facing the sea, open from April to October, where DJ sets and themed parties follow one another after sunset."
    }
  },
  {
    "id": "nido-marseille",
    "nom": "Nido",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (La Capelette)",
      "en": "Marseille (La Capelette)"
    },
    "latitude": 43.2796,
    "longitude": 5.4124,
    "capacite": 150,
    "styles": [
      "House",
      "Deep House"
    ],
    "site": "https://nidomarseille.com",
    "description": {
      "fr": "Bistrot et bar musical du village des antiquaires de Fifi Turin, équipé d’une sonorisation audiophile sur mesure, avec sessions d’écoute et soirées house et deep house le week-end.",
      "en": "Bistro and music bar in the Fifi Turin antiques village, fitted with a custom audiophile sound system, hosting listening sessions and house and deep house nights at weekends."
    }
  },
  {
    "id": "l-embobineuse-marseille",
    "nom": "L’Embobineuse",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Belle de Mai)",
      "en": "Marseille (Belle de Mai)"
    },
    "latitude": 43.3112,
    "longitude": 5.3832,
    "capacite": 300,
    "styles": [],
    "site": "https://www.lembobineuse.biz",
    "description": {
      "fr": "Scène alternative associative du boulevard Bouès, à la Belle de Mai, qui défend les musiques hors norme, du noise aux performances, et accueille des nuits électroniques de collectifs locaux.",
      "en": "Non-profit alternative venue on Boulevard Bouès in Belle de Mai, championing unconventional music from noise to performance art and hosting electronic nights by local collectives."
    }
  },
  {
    "id": "le-molotov-marseille",
    "nom": "Le Molotov",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (La Plaine)",
      "en": "Marseille (La Plaine)"
    },
    "latitude": 43.2927,
    "longitude": 5.3832,
    "capacite": 300,
    "annee": 2012,
    "styles": [],
    "site": "https://lemolotov.com",
    "description": {
      "fr": "Salle underground de la place Paul-Cézanne ouverte en 2012, longtemps fief reggae, qui programme aujourd’hui rock, métal et darkwave aux côtés de nuits psytrance, techno industrielle et drum & bass.",
      "en": "Underground venue on Place Paul-Cézanne opened in 2012, long a reggae stronghold, now booking rock, metal and darkwave alongside psytrance, industrial techno and drum & bass nights."
    }
  },
  {
    "id": "le-bazar-marseille",
    "nom": "Le Bazar / La Palmeraie",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Le Rouet)",
      "en": "Marseille (Le Rouet)"
    },
    "latitude": 43.2764,
    "longitude": 5.3979,
    "capacite": 1500,
    "styles": [],
    "site": "https://bazarmarseille.com",
    "description": {
      "fr": "Grande discothèque du boulevard Rabatau active depuis plus de 25 ans, d’environ 1 500 places, dont la terrasse en plein air La Palmeraie prend le relais de mai à septembre.",
      "en": "Large nightclub on Boulevard Rabatau running for more than 25 years, holding about 1,500 people, whose open-air La Palmeraie terrace takes over from May to September."
    }
  },
  {
    "id": "utopia-festival-marseille",
    "nom": "Utopia Festival",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Friche la Belle de Mai)",
      "en": "Marseille (Friche la Belle de Mai)"
    },
    "latitude": 43.3105,
    "longitude": 5.39,
    "capacite": 10000,
    "annee": 2021,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "Techno",
      "Hard Techno",
      "House",
      "Live Electronic"
    ],
    "site": "https://www.utopiafestival.fr",
    "description": {
      "fr": "Festival des cultures électroniques porté par le Cabaret Aléatoire depuis septembre 2021, déployé dans quatre salles de la Friche la Belle de Mai et revendiquant plus de 10 000 festivaliers.",
      "en": "Electronic culture festival run by Cabaret Aléatoire since September 2021, spread across four rooms of Friche la Belle de Mai and reporting more than 10,000 attendees."
    }
  },
  {
    "id": "the-walking-bass-marseille",
    "nom": "The Walking Bass",
    "type": "festival",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Parc Chanot)",
      "en": "Marseille (Parc Chanot)"
    },
    "latitude": 43.2728,
    "longitude": 5.3957,
    "capacite": 20000,
    "mois": {
      "fr": "Octobre",
      "en": "October"
    },
    "styles": [
      "Hard Techno",
      "Drum & Bass",
      "Trance",
      "Psy"
    ],
    "site": "https://www.thewalkingbass.fr",
    "description": {
      "fr": "Festival d’Halloween de deux nuits au Parc Chanot et à La Plateforme, qui attendait plus de 20 000 personnes en 2025 pour la hard techno, la trance et la drum & bass.",
      "en": "Two-night Halloween festival at Parc Chanot and La Plateforme, which expected more than 20,000 people in 2025 for hard techno, trance and drum & bass."
    }
  },
  {
    "id": "halles-cartoucherie-toulouse",
    "nom": "Les Halles de la Cartoucherie",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "toulouse-fr",
    "ville": {
      "fr": "Toulouse (Cartoucherie)",
      "en": "Toulouse (Cartoucherie)"
    },
    "latitude": 43.601,
    "longitude": 1.4074,
    "capacite": 800,
    "styles": [],
    "site": "https://halles-cartoucherie.fr",
    "description": {
      "fr": "Anciennes halles industrielles de l’écoquartier de la Cartoucherie reconverties en marché couvert et lieu culturel, dont la Halle Sud, The Roof et La Cabane accueillent des nuits électroniques comme After Now.",
      "en": "Former industrial halls in the Cartoucherie eco-district turned into a covered market and cultural venue, whose Halle Sud, The Roof and La Cabane host electronic nights such as After Now."
    }
  },
  {
    "id": "metronum-toulouse",
    "nom": "Le Metronum",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "toulouse-fr",
    "ville": {
      "fr": "Toulouse (Borderouge)",
      "en": "Toulouse (Borderouge)"
    },
    "latitude": 43.6415,
    "longitude": 1.4506,
    "capacite": 600,
    "annee": 2014,
    "styles": [],
    "site": "https://metronum.toulouse.fr",
    "description": {
      "fr": "Salle municipale des musiques actuelles ouverte en 2014 au rond-point Madame-de-Mondonville à Borderouge, qui accueille concerts et soirées électroniques au nord de Toulouse.",
      "en": "Municipal live music venue opened in 2014 on the Madame-de-Mondonville roundabout in Borderouge, hosting concerts and electronic nights in the north of Toulouse."
    }
  },
  {
    "id": "zenith-toulouse",
    "nom": "Zénith Toulouse Métropole",
    "type": "club",
    "estSalle": true,
    "paysCode": "FR",
    "villeSlug": "toulouse-fr",
    "ville": {
      "fr": "Toulouse (Cartoucherie)",
      "en": "Toulouse (Cartoucherie)"
    },
    "latitude": 43.5982,
    "longitude": 1.4093,
    "capacite": 11000,
    "annee": 1999,
    "styles": [],
    "site": "https://zenith-toulousemetropole.com",
    "description": {
      "fr": "Grande salle de spectacles de l’avenue Raymond-Badiou ouverte en 1999, qui accueille ponctuellement des tournées électroniques comme Mosimann ou Electro Symphony aux côtés de la variété.",
      "en": "Large performance hall on Avenue Raymond-Badiou opened in 1999, occasionally hosting electronic tours such as Mosimann or Electro Symphony alongside mainstream shows."
    }
  },
  {
    "id": "rebel-toronto",
    "nom": "Rebel",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Port Lands)",
      "en": "Toronto (Port Lands)"
    },
    "latitude": 43.6408,
    "longitude": -79.355,
    "capacite": 3900,
    "annee": 2016,
    "styles": [
      "EDM",
      "Tech House",
      "Melodic Techno",
      "House"
    ],
    "site": "https://rebeltoronto.com",
    "description": {
      "fr": "Complexe de 45 000 pieds carrés sur la jetée Polson, au bord du lac Ontario, avec plusieurs salles dont NOIR et des têtes d'affiche EDM, tech house et melodic techno comme Carl Cox.",
      "en": "45,000-square-foot complex on Polson Pier by Lake Ontario, with several rooms including NOIR, booking EDM, tech house and melodic techno headliners such as Carl Cox."
    }
  },
  {
    "id": "cabana-pool-bar-toronto",
    "nom": "Cabana Pool Bar",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Port Lands)",
      "en": "Toronto (Port Lands)"
    },
    "latitude": 43.6401,
    "longitude": -79.3544,
    "capacite": 2500,
    "styles": [
      "House",
      "Tech House",
      "EDM"
    ],
    "site": "https://cabanatoronto.com",
    "description": {
      "fr": "Club de piscine en plein air sur la jetée Polson, ouvert de juin à septembre, avec cabanes privées et place pour 2 500 personnes, qui a reçu Steve Aoki, Lost Frequencies et MK en 2025.",
      "en": "Open-air pool club on Polson Pier, open from June to September with private cabanas and room for 2,500 people, which hosted Steve Aoki, Lost Frequencies and MK in 2025."
    }
  },
  {
    "id": "cafeteria-toronto",
    "nom": "Cafeteria",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Junction Triangle)",
      "en": "Toronto (Junction Triangle)"
    },
    "latitude": 43.6648,
    "longitude": -79.456,
    "capacite": 350,
    "styles": [
      "House",
      "Techno",
      "Electro",
      "Club"
    ],
    "site": "https://cafeteriatoronto.com",
    "description": {
      "fr": "Restaurant, bar et club du 1650 rue Dupont qui passe des tables au dancefloor en soirée, avec des nuits house, techno, électro et queer du jeudi au samedi.",
      "en": "Restaurant, bar and club at 1650 Dupont Street that moves from dinner tables to the dance floor each evening, with house, techno, electro and queer nights from Thursday to Saturday."
    }
  },
  {
    "id": "comfort-zone-toronto",
    "nom": "The Comfort Zone",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Parkdale)",
      "en": "Toronto (Parkdale)"
    },
    "latitude": 43.6407,
    "longitude": -79.4355,
    "capacite": 400,
    "styles": [
      "Techno",
      "House",
      "Tech House"
    ],
    "site": "https://comfortzonetoronto.ca",
    "description": {
      "fr": "After-hours torontois de plus de 25 ans d'histoire, longtemps installé près de College et Spadina puis rouvert au 1369 Queen Ouest, où les nuits techno durent jusqu'au matin.",
      "en": "Toronto after-hours club with more than 25 years of history, long based near College and Spadina before reopening at 1369 Queen West, where techno nights run until morning."
    }
  },
  {
    "id": "rhythm-toronto",
    "nom": "Rhythm",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (King West)",
      "en": "Toronto (King West)"
    },
    "latitude": 43.6459,
    "longitude": -79.4032,
    "capacite": 120,
    "styles": [
      "House",
      "Techno",
      "Minimal",
      "Deep House"
    ],
    "site": "https://rhythm.space",
    "description": {
      "fr": "Disquaire, studio d'enregistrement et salle d'événements du 141 rue Bathurst, au service des artistes et labels électroniques torontois, avec des nuits house, techno et minimal.",
      "en": "Record shop, recording studio and event space at 141 Bathurst Street supporting Toronto electronic artists and labels, with house, techno and minimal nights plus summer open airs."
    }
  },
  {
    "id": "boogie-toronto",
    "nom": "Boogie",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (West Queen West)",
      "en": "Toronto (West Queen West)"
    },
    "latitude": 43.6428,
    "longitude": -79.4263,
    "capacite": 100,
    "styles": [
      "House",
      "Deep House",
      "Disco",
      "Drum & Bass"
    ],
    "site": "https://www.boogieonqueen.com",
    "description": {
      "fr": "Bar d'écoute de la rue Queen Ouest, près de Gladstone, inspiré des listening bars du monde entier, où des DJ passent house, deep house et disco sur vinyle et en numérique.",
      "en": "Listening bar on Queen Street West near Gladstone, inspired by listening bars around the world, where DJs play house, deep house and disco on vinyl and digital formats."
    }
  },
  {
    "id": "bsmt-254-toronto",
    "nom": "Bsmt 254",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Brockton Village)",
      "en": "Toronto (Brockton Village)"
    },
    "latitude": 43.6511,
    "longitude": -79.4403,
    "capacite": 71,
    "styles": [
      "Techno",
      "House",
      "Jungle"
    ],
    "site": "https://www.bsmt254.com",
    "description": {
      "fr": "Sous-sol du 254 avenue Lansdowne, salle de concerts et de DJ du West End réputée pour son système son, avec une programmation techno, house, jungle et soul.",
      "en": "Basement venue at 254 Lansdowne Avenue, a West End live music and DJ room known for its sound system, programming techno, house, jungle and soul nights."
    }
  },
  {
    "id": "sound-machine-toronto",
    "nom": "Sound Machine",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Queen West)",
      "en": "Toronto (Queen West)"
    },
    "latitude": 43.6474,
    "longitude": -79.4042,
    "capacite": 400,
    "styles": [
      "Techno",
      "Tech House",
      "House"
    ],
    "site": "https://ra.co/clubs/229380",
    "description": {
      "fr": "Club de 400 places au 178 rue Bathurst, construit autour d'un système son à quatre points, sans service bouteille, qui donne la priorité aux détenteurs de billets et aux soirées techno.",
      "en": "400-capacity club at 178 Bathurst Street built around a custom four-point sound system, with no bottle service, priority entry for ticket holders and a techno-led programme."
    }
  },
  {
    "id": "geary-avenue-warehouse-project-toronto",
    "nom": "Geary Avenue Warehouse Project",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Wallace Emerson)",
      "en": "Toronto (Wallace Emerson)"
    },
    "latitude": 43.6694,
    "longitude": -79.4382,
    "capacite": 400,
    "styles": [
      "Techno",
      "House",
      "Tech House",
      "Bass"
    ],
    "site": "https://ra.co/clubs/167880",
    "description": {
      "fr": "Entrepôt de 400 places au 209 avenue Geary, sur la même avenue que Standard Time, qui accueille des raves techno, house et bass avec une charte stricte sur le consentement.",
      "en": "400-capacity warehouse at 209 Geary Avenue, on the same street as Standard Time, hosting techno, house and bass raves under a strict consent and anti-discrimination policy."
    }
  },
  {
    "id": "nomad-toronto",
    "nom": "NØMAD",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (South Riverdale)",
      "en": "Toronto (South Riverdale)"
    },
    "latitude": 43.6589,
    "longitude": -79.3491,
    "capacite": 500,
    "styles": [
      "House",
      "Techno",
      "Tech House",
      "Drum & Bass"
    ],
    "site": "https://ra.co/clubs/197243",
    "description": {
      "fr": "Club de 500 places au 725 rue Queen Est, voisin de l'Opera House, qui programme house, techno, tech house et drum & bass ainsi que des soirées schranz et psytrance.",
      "en": "500-capacity club at 725 Queen Street East, next to the Opera House, programming house, techno, tech house and drum & bass alongside schranz and psytrance nights."
    }
  },
  {
    "id": "complex19-toronto",
    "nom": "Complex19",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Old Town)",
      "en": "Toronto (Old Town)"
    },
    "latitude": 43.6505,
    "longitude": -79.3761,
    "capacite": 1000,
    "annee": 2026,
    "styles": [
      "House",
      "Techno"
    ],
    "site": "https://www.complex19.com",
    "description": {
      "fr": "Club sur trois niveaux ouvert en 2026 dans l'ancien Consumers' Gas Building du 19 rue Toronto, consacré à la house et à la techno, où les caméras des téléphones sont masquées.",
      "en": "Three-level club opened in 2026 inside the former Consumers' Gas Building at 19 Toronto Street, dedicated to house and techno, where phone cameras are covered with stickers at the door."
    }
  },
  {
    "id": "future-nightlife-toronto",
    "nom": "Future Nightlife",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Queen West)",
      "en": "Toronto (Queen West)"
    },
    "latitude": 43.6475,
    "longitude": -79.4034,
    "capacite": 560,
    "styles": [
      "House",
      "Progressive House",
      "Afro House",
      "Tech House"
    ],
    "site": "https://futurenightlife.com",
    "description": {
      "fr": "Club de 560 places à l'angle de Queen et Bathurst, doté d'un système son personnalisé par E11EVEN Miami et d'une Infinity Room, orienté house, progressive house et afro house.",
      "en": "560-capacity club at Queen and Bathurst with a sound installation customised by E11EVEN Miami and a separate Infinity Room, focused on house, progressive house and afro house."
    }
  },
  {
    "id": "story-toronto",
    "nom": "Story Toronto",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Entertainment District)",
      "en": "Toronto (Entertainment District)"
    },
    "latitude": 43.6486,
    "longitude": -79.3874,
    "capacite": 250,
    "annee": 2025,
    "styles": [
      "Techno",
      "Electro",
      "Club",
      "Disco"
    ],
    "site": "https://www.storytoronto.ca",
    "description": {
      "fr": "Club de 250 places de la rue Adelaide Ouest inauguré en septembre 2025, qui reçoit des collectifs techno comme 404 ainsi que des nuits électro, disco et house.",
      "en": "250-capacity club on Adelaide Street West that held its grand opening in September 2025, hosting techno collectives such as 404 alongside electro, disco and house nights."
    }
  },
  {
    "id": "juice-toronto",
    "nom": "Juice",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Trinity-Bellwoods)",
      "en": "Toronto (Trinity-Bellwoods)"
    },
    "latitude": 43.6539,
    "longitude": -79.4228,
    "capacite": 100,
    "styles": [
      "House",
      "Tech House",
      "Acid",
      "Balearic"
    ],
    "site": "https://juicetoronto.com",
    "description": {
      "fr": "Lieu hybride de l'avenue Ossington, café et salon de coiffure le jour, bar à cocktails et petit club la nuit, avec des DJ house, acid et balearic.",
      "en": "Hybrid space on Ossington Avenue that works as a cafe and hair salon by day and a cocktail bar and intimate club by night, with house, acid and balearic DJs."
    }
  },
  {
    "id": "opera-house-toronto",
    "nom": "The Opera House",
    "type": "club",
    "estSalle": true,
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (South Riverdale)",
      "en": "Toronto (South Riverdale)"
    },
    "latitude": 43.659,
    "longitude": -79.3488,
    "capacite": 950,
    "annee": 1909,
    "styles": [],
    "site": "https://www.theoperahousetoronto.com",
    "description": {
      "fr": "Salle historique de 950 places ouverte en 1909 au 735 rue Queen Est, ancien cinéma et théâtre devenu salle de concert, qui accueille aussi des soirées house et des afters de festivals.",
      "en": "Historic 950-capacity venue opened in 1909 at 735 Queen Street East, a former cinema and theatre turned concert hall that also hosts house nights and festival afterparties."
    }
  },
  {
    "id": "the-piston-toronto",
    "nom": "The Piston",
    "type": "club",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (Bloorcourt)",
      "en": "Toronto (Bloorcourt)"
    },
    "latitude": 43.6615,
    "longitude": -79.4275,
    "capacite": 200,
    "styles": [
      "Disco",
      "Funk",
      "Techno",
      "Drum & Bass"
    ],
    "site": "https://ra.co/clubs/35764",
    "description": {
      "fr": "Bar musical du 937 rue Bloor Ouest, juste à l'ouest de la station Ossington, avec des soirées DJ chaque semaine en disco, funk, techno et drum & bass, dont la série Bodyclock.",
      "en": "Music bar at 937 Bloor Street West, just west of Ossington station, with weekly DJ nights across disco, funk, techno and drum & bass, including the Bodyclock series."
    }
  },
  {
    "id": "sojourn-festival-toronto",
    "nom": "Sojourn Festival",
    "type": "festival",
    "paysCode": "CA",
    "villeSlug": "toronto-ca",
    "ville": {
      "fr": "Toronto (The Junction)",
      "en": "Toronto (The Junction)"
    },
    "latitude": 43.6753,
    "longitude": -79.4783,
    "capacite": 2000,
    "annee": 2024,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "Techno",
      "House",
      "Jungle",
      "Electro"
    ],
    "site": "https://ra.co/events/2279182",
    "description": {
      "fr": "Festival indépendant monté par les promoteurs FORMAT et Pep Rally dans un entrepôt de 20 000 pieds carrés de la Junction, sur plusieurs scènes intérieures et extérieures, entre techno, jungle et house.",
      "en": "Independent festival run by Toronto promoters FORMAT and Pep Rally in a 20,000-square-foot Junction warehouse, across indoor and open-air stages covering techno, jungle and house."
    }
  },
  {
    "id": "departamento-mexico",
    "nom": "Departamento",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Roma Norte)",
      "en": "Mexico City (Roma Norte)"
    },
    "latitude": 19.418,
    "longitude": -99.1619,
    "capacite": 150,
    "styles": [
      "House",
      "Deep House",
      "Disco",
      "Experimental"
    ],
    "site": "https://ra.co/clubs/113383",
    "description": {
      "fr": "Bar club intimiste du 154 avenue Álvaro Obregón, dans l'immeuble de Cocina Conchita, l'un des lieux les plus actifs de Roma Norte pour la house et la deep house.",
      "en": "Intimate bar and club at 154 Avenida Álvaro Obregón, in the same building as Cocina Conchita, and one of the busiest Roma Norte rooms for house and deep house."
    }
  },
  {
    "id": "brutal-mx-mexico",
    "nom": "Brutal MX",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Centro)",
      "en": "Mexico City (Centro)"
    },
    "latitude": 19.4337,
    "longitude": -99.1465,
    "capacite": 500,
    "annee": 2023,
    "styles": [
      "Techno",
      "Hard Techno",
      "Hardcore",
      "Trance"
    ],
    "site": "https://ra.co/clubs/214718",
    "description": {
      "fr": "Club techno queer de la rue Revillagigedo, près de l'Alameda, ouvert en 2023, qui accueille les soirées PervertMX et des DJ hard techno internationaux comme Nikolina.",
      "en": "Queer techno club on Calle Revillagigedo near the Alameda, opened in 2023, hosting PervertMX parties and international hard techno DJs such as Nikolina."
    }
  },
  {
    "id": "versalles-64-mexico",
    "nom": "Versalles 64",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Juárez)",
      "en": "Mexico City (Juárez)"
    },
    "latitude": 19.4289,
    "longitude": -99.155,
    "capacite": 450,
    "styles": [
      "House",
      "Techno",
      "Disco",
      "Trance"
    ],
    "site": "https://ra.co/clubs/156106",
    "description": {
      "fr": "Lieu de 450 places au 64 rue Versalles, dans la colonia Juárez, utilisé par plusieurs collectifs comme ESTÉREO pour des nuits house, techno, disco et trance.",
      "en": "450-capacity venue at 64 Calle Versalles in Colonia Juárez, used by several party collectives such as ESTÉREO for house, techno, disco and trance nights."
    }
  },
  {
    "id": "terraza-catedral-mexico",
    "nom": "Terraza Catedral",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Centro Histórico)",
      "en": "Mexico City (Centro Histórico)"
    },
    "latitude": 19.4353,
    "longitude": -99.1336,
    "capacite": 250,
    "styles": [
      "House",
      "Minimal",
      "Deep House"
    ],
    "site": "https://ra.co/clubs/124301",
    "description": {
      "fr": "Terrasse sur le toit d'une auberge de la rue República de Guatemala, avec vue sur la cathédrale métropolitaine, où des DJ house et minimal jouent plusieurs soirs par semaine.",
      "en": "Rooftop terrace above a hostel on Calle República de Guatemala, overlooking the Metropolitan Cathedral, where house and minimal DJs play several nights a week."
    }
  },
  {
    "id": "bajo-mundo-mexico",
    "nom": "Bajo Mundo",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Hipódromo Condesa)",
      "en": "Mexico City (Hipódromo Condesa)"
    },
    "latitude": 19.4055,
    "longitude": -99.1752,
    "capacite": 150,
    "styles": [
      "Techno",
      "Trance",
      "Acid"
    ],
    "site": "https://ra.co/clubs/241410",
    "description": {
      "fr": "Petit club de la rue Saltillo, dans l'Hipódromo de la Condesa, qui programme chaque semaine techno, trance et acid avec des collectifs locaux.",
      "en": "Small club on Calle Saltillo in Hipódromo Condesa, programming techno, trance and acid every week with local collectives and visiting DJs."
    }
  },
  {
    "id": "japan-mexico",
    "nom": "Japan",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Roma Norte)",
      "en": "Mexico City (Roma Norte)"
    },
    "latitude": 19.4206,
    "longitude": -99.1648,
    "capacite": 150,
    "styles": [
      "Techno",
      "Electronica",
      "Club"
    ],
    "site": "https://ra.co/clubs/158751",
    "description": {
      "fr": "Bar de trois étages à l'angle des rues Monterrey et Uruapan, à Roma Norte, qui alterne house, techno, électronique et reggaeton avec de nombreux collectifs de la ville.",
      "en": "Three-floor bar on the corner of Monterrey and Uruapan in Roma Norte, moving between house, techno, electronica and reggaeton with many Mexico City collectives."
    }
  },
  {
    "id": "fronton-bucareli-mexico",
    "nom": "Frontón Bucareli",
    "type": "club",
    "estSalle": true,
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Juárez)",
      "en": "Mexico City (Juárez)"
    },
    "latitude": 19.4291,
    "longitude": -99.1522,
    "capacite": 1500,
    "styles": [],
    "site": "https://ra.co/clubs/207620",
    "description": {
      "fr": "Fronton de pelote de l'avenue Bucareli utilisé comme lieu d'événements, où se sont tenus en 2025 les 20 ans d'Innervisions et l'anniversaire de Roche Musique.",
      "en": "Pelota court on Avenida Bucareli used as an event venue, which hosted the Innervisions 20th anniversary and the Roche Musique birthday party in 2025."
    }
  },
  {
    "id": "sala-urbana-mexico",
    "nom": "Sala Urbana",
    "type": "club",
    "estSalle": true,
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Naucalpan)",
      "en": "Mexico City (Naucalpan)"
    },
    "latitude": 19.4684,
    "longitude": -99.2308,
    "capacite": 2500,
    "styles": [],
    "site": "https://salaurbana.com.mx",
    "description": {
      "fr": "Salle de spectacles de 2 500 places sur le boulevard Toluca à Naucalpan, en périphérie de Mexico, qui accueille les grandes nuits hard techno de Rebels MX et des concerts variés.",
      "en": "2,500-capacity concert hall on Boulevard Toluca in Naucalpan, on the edge of Mexico City, hosting large Rebels MX hard techno nights as well as concerts of other genres."
    }
  },
  {
    "id": "terraza-dos-equis-mexico",
    "nom": "Terraza Dos Equis",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Centro Histórico)",
      "en": "Mexico City (Centro Histórico)"
    },
    "latitude": 19.4292,
    "longitude": -99.1367,
    "capacite": 200,
    "styles": [
      "House",
      "Afro House"
    ],
    "site": "https://ra.co/clubs/174940",
    "description": {
      "fr": "Terrasse de 200 places de la rue Isabel la Católica, dans le Centro Histórico, avec des sessions DJ house et afro house plusieurs fois par semaine.",
      "en": "200-capacity terrace on Calle Isabel la Católica in the Centro Histórico, with house and afro house DJ sessions several times a week throughout the year."
    }
  },
  {
    "id": "mimi-discoteque-mexico",
    "nom": "MiMi Discoteque",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Paseo de la Reforma)",
      "en": "Mexico City (Paseo de la Reforma)"
    },
    "latitude": 19.4282,
    "longitude": -99.1671,
    "capacite": 300,
    "styles": [
      "House",
      "Deep House",
      "Disco"
    ],
    "site": "https://ra.co/clubs/227608",
    "description": {
      "fr": "Discothèque installée dans l'immeuble de l'hôtel Sheraton María Isabel, sur le Paseo de la Reforma, avec une programmation régulière house, deep house et disco.",
      "en": "Nightclub inside the Sheraton María Isabel building on Paseo de la Reforma, with a regular programme of house, deep house and disco DJs."
    }
  },
  {
    "id": "hookah-lounge-mexico",
    "nom": "Hookah Lounge",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Condesa)",
      "en": "Mexico City (Condesa)"
    },
    "latitude": 19.4083,
    "longitude": -99.1708,
    "capacite": 200,
    "styles": [
      "Progressive House",
      "House",
      "Electronica"
    ],
    "site": "https://ra.co/clubs/6715",
    "description": {
      "fr": "Bar lounge de la rue Campeche, dans la Condesa, avec des soirées DJ presque tous les soirs centrées sur la progressive house et les sonorités afro tech.",
      "en": "Lounge bar on Calle Campeche in Condesa with DJ nights almost every evening, centred on progressive house and afro tech sounds."
    }
  },
  {
    "id": "chico-mexico",
    "nom": "CHICO",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Roma Norte)",
      "en": "Mexico City (Roma Norte)"
    },
    "latitude": 19.4179,
    "longitude": -99.1697,
    "capacite": 100,
    "styles": [
      "Techno",
      "Club"
    ],
    "site": "https://ra.co/clubs/287939",
    "description": {
      "fr": "Petit club de 100 places au 367 rue Colima, à Roma Norte, qui mêle techno, club et rythmes latins lors de soirées portées par des collectifs locaux.",
      "en": "Small 100-capacity club at 367 Calle Colima in Roma Norte, mixing techno, club music and Latin rhythms at nights run by local collectives."
    }
  },
  {
    "id": "symphonie-mexico",
    "nom": "Symphonie",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Roma Norte)",
      "en": "Mexico City (Roma Norte)"
    },
    "latitude": 19.4174,
    "longitude": -99.1623,
    "capacite": 250,
    "styles": [
      "Afro House",
      "House",
      "Deep House"
    ],
    "site": "https://ra.co/clubs/263765",
    "description": {
      "fr": "Club discret de 250 places sur l'avenue Álvaro Obregón, à Roma Norte, qui mise sur le son et la lumière avec une programmation afro house, house et deep house.",
      "en": "Discreet 250-capacity club on Avenida Álvaro Obregón in Roma Norte, built around sound and light, with a programme of afro house, house and deep house."
    }
  },
  {
    "id": "nueve-cero-nueve-mexico",
    "nom": "nueve cero nueve",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Juárez)",
      "en": "Mexico City (Juárez)"
    },
    "latitude": 19.4272,
    "longitude": -99.1557,
    "capacite": 200,
    "styles": [
      "Minimal",
      "Techno",
      "House",
      "Dub"
    ],
    "site": "https://ra.co/clubs/300596",
    "description": {
      "fr": "Espace intime de 200 places au 94 rue Versalles, dans la colonia Juárez, pensé comme une alternative aux grands événements, entre minimal, techno, house et dub.",
      "en": "Intimate 200-capacity space at 94 Calle Versalles in Colonia Juárez, conceived as an alternative to festivals and large events, covering minimal, techno, house and dub."
    }
  },
  {
    "id": "roca-hifi-mexico",
    "nom": "ROCA HIFI",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Roma Norte)",
      "en": "Mexico City (Roma Norte)"
    },
    "latitude": 19.419,
    "longitude": -99.1597,
    "capacite": 80,
    "styles": [
      "House",
      "Downtempo"
    ],
    "site": "https://ra.co/clubs/243795",
    "description": {
      "fr": "Bar hi-fi de la rue Orizaba, à Roma Norte, où des DJ passent house et downtempo presque chaque soir, avec plus de 130 sessions annoncées entre mars et novembre 2026.",
      "en": "Hi-fi bar on Calle Orizaba in Roma Norte where DJs play house and downtempo almost every night, with more than 130 sessions listed between March and November 2026."
    }
  },
  {
    "id": "foro-hdx-mexico",
    "nom": "Foro HDX",
    "type": "club",
    "estSalle": true,
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Azcapotzalco)",
      "en": "Mexico City (Azcapotzalco)"
    },
    "latitude": 19.4689,
    "longitude": -99.1752,
    "capacite": 600,
    "styles": [],
    "site": "https://ra.co/clubs/238184",
    "description": {
      "fr": "Salle de 600 places de l'avenue Cuitláhuac, à Azcapotzalco, ouverte à tous les genres et utilisée par les collectifs techno, industrial et hardcore de Mexico.",
      "en": "600-capacity venue on Avenida Cuitláhuac in Azcapotzalco, open to all genres and regularly used by Mexico City techno, industrial and hardcore collectives."
    }
  },
  {
    "id": "rebels-xxl-mexico",
    "nom": "Rebels XXL",
    "type": "festival",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (Naucalpan)",
      "en": "Mexico City (Naucalpan)"
    },
    "latitude": 19.4684,
    "longitude": -99.2308,
    "capacite": 2500,
    "annee": 2025,
    "mois": {
      "fr": "Mai",
      "en": "May"
    },
    "styles": [
      "Techno",
      "Hard Techno",
      "Hardcore",
      "Trance"
    ],
    "site": "https://ra.co/events/2363607",
    "description": {
      "fr": "Festival techno de deux jours et deux scènes organisé par Rebels MX à la Sala Urbana de Naucalpan, lancé en mai 2025 et consacré aux tempos rapides et au hard techno.",
      "en": "Two-day, two-stage techno festival run by Rebels MX at Sala Urbana in Naucalpan, launched in May 2025 and devoted to fast tempos, hard techno and hardcore."
    }
  },
  {
    "id": "major-bar-pista-sao-paulo",
    "nom": "Major Bar & Pista",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Vila Buarque)",
      "en": "Sao Paulo (Vila Buarque)"
    },
    "latitude": -23.5455,
    "longitude": -46.6474,
    "capacite": 200,
    "styles": [
      "Electronica",
      "Disco",
      "House"
    ],
    "site": "https://ra.co/clubs/272786",
    "description": {
      "fr": "Ancien garage de la rue Major Sertório, devenu galerie d'art puis bar avec piste de danse, où des DJ jouent musique électronique, disco et house presque chaque soir.",
      "en": "Former garage on Rua Major Sertório that became an art gallery and then a bar with a dance floor, where DJs play electronica, disco and house almost every night."
    }
  },
  {
    "id": "sala-bar-sao-paulo",
    "nom": "Sala Bar",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Pinheiros)",
      "en": "Sao Paulo (Pinheiros)"
    },
    "latitude": -23.568,
    "longitude": -46.6955,
    "capacite": 60,
    "styles": [
      "House",
      "Disco",
      "Electronica"
    ],
    "site": "https://ra.co/clubs/283629",
    "description": {
      "fr": "Bar d'écoute et de vinyles de 60 places rue Fernão Dias, avec canapés et cocktails, où un DJ joue chaque soir entre house, disco, jazz et musique brésilienne.",
      "en": "60-capacity listening and vinyl bar on Rua Fernão Dias with sofas and cocktails, where a DJ plays every night across house, disco, jazz and Brazilian music."
    }
  },
  {
    "id": "bar-do-netao-sao-paulo",
    "nom": "Bar do Netão",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Baixo Augusta)",
      "en": "Sao Paulo (Baixo Augusta)"
    },
    "latitude": -23.5517,
    "longitude": -46.6516,
    "capacite": 200,
    "styles": [
      "Techno",
      "House",
      "Acid",
      "Electro"
    ],
    "site": "https://ra.co/clubs/146462",
    "description": {
      "fr": "Bar club de 200 places au 584 rue Augusta, qui accueille des soirées techno, house et acid, dont des nuits Bass Resistance avec les DJ du collectif Mamba Negra.",
      "en": "200-capacity bar and club at 584 Rua Augusta hosting techno, house and acid nights, including Bass Resistance parties with DJs from the Mamba Negra collective."
    }
  },
  {
    "id": "crema-club-sao-paulo",
    "nom": "Crema Club",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Pinheiros)",
      "en": "Sao Paulo (Pinheiros)"
    },
    "latitude": -23.5648,
    "longitude": -46.694,
    "capacite": 300,
    "styles": [
      "House",
      "Techno",
      "Tech House",
      "Progressive House"
    ],
    "site": "https://ra.co/clubs/215457",
    "description": {
      "fr": "Club de la rue Cristóvão Gonçalves, près de la Vila Madalena, qui programme chaque fin de semaine house, techno, tech house et progressive house.",
      "en": "Club on Rua Cristóvão Gonçalves near Vila Madalena, programming house, techno, tech house and progressive house every weekend with local and touring DJs."
    }
  },
  {
    "id": "estudio-lamina-sao-paulo",
    "nom": "Estúdio Lâmina",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Centro)",
      "en": "Sao Paulo (Centro)"
    },
    "latitude": -23.5448,
    "longitude": -46.6357,
    "capacite": 200,
    "styles": [
      "House",
      "Techno",
      "Electro",
      "Disco"
    ],
    "site": "https://ra.co/clubs/219374",
    "description": {
      "fr": "Espace d'art contemporain au quatrième étage d'un immeuble des années 1940 de l'avenue São João, qui accueille aussi des fêtes house, techno et électro.",
      "en": "Contemporary art space on the fourth floor of a 1940s building on Avenida São João, which also hosts house, techno and electro parties."
    }
  },
  {
    "id": "club-jerome-sao-paulo",
    "nom": "Club Jerome",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Higienópolis)",
      "en": "Sao Paulo (Higienópolis)"
    },
    "latitude": -23.5504,
    "longitude": -46.6592,
    "capacite": 250,
    "styles": [
      "House",
      "Disco",
      "Techno"
    ],
    "site": "https://ra.co/clubs/133618",
    "description": {
      "fr": "Club de 250 places de la rue Mato Grosso, à Higienópolis, consacré à la house et à la disco avec des soirées de collectifs paulistes en fin de semaine.",
      "en": "250-capacity club on Rua Mato Grosso in Higienópolis, dedicated to house and disco, with weekend parties run by São Paulo collectives."
    }
  },
  {
    "id": "casinha-cc-sao-paulo",
    "nom": "Casinha cc",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Pinheiros)",
      "en": "Sao Paulo (Pinheiros)"
    },
    "latitude": -23.5706,
    "longitude": -46.6976,
    "capacite": 120,
    "styles": [
      "House",
      "Disco",
      "Balearic"
    ],
    "site": "https://ra.co/clubs/241790",
    "description": {
      "fr": "Petite maison de la rue Jorge Rizzo transformée en lieu de fête avec bar et DJ, tournée vers la house, la disco et le balearic.",
      "en": "Small house on Rua Jorge Rizzo turned into a party space with a bar and DJs, focused on house, disco and balearic sounds."
    }
  },
  {
    "id": "home-club-sao-paulo",
    "nom": "Home Club",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Centro Histórico)",
      "en": "Sao Paulo (Centro Histórico)"
    },
    "latitude": -23.5462,
    "longitude": -46.6344,
    "capacite": 250,
    "styles": [
      "House",
      "Techno",
      "Electro",
      "Minimal"
    ],
    "site": "https://ra.co/clubs/284894",
    "description": {
      "fr": "Club électronique de 250 places rue Quinze de Novembro, dans le centre historique, axé sur la qualité du son et des line-up house, techno et minimal.",
      "en": "250-capacity electronic club on Rua Quinze de Novembro in the historic centre, focused on sound quality and curated house, techno and minimal lineups."
    }
  },
  {
    "id": "fabrique-sao-paulo",
    "nom": "Fabrique",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Barra Funda)",
      "en": "Sao Paulo (Barra Funda)"
    },
    "latitude": -23.5268,
    "longitude": -46.6601,
    "capacite": 1200,
    "styles": [
      "Techno",
      "House"
    ],
    "site": "https://ra.co/clubs/127106",
    "description": {
      "fr": "Grand club de 1 200 places de la rue Barra Funda, qui accueille des soirées techno et house ainsi que des fêtes baile funk et dancehall.",
      "en": "Large 1,200-capacity club on Rua Barra Funda in the district of the same name, hosting techno and house nights alongside baile funk and dancehall parties."
    }
  },
  {
    "id": "teatro-mars-sao-paulo",
    "nom": "Teatro Mars",
    "type": "club",
    "estSalle": true,
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Bela Vista)",
      "en": "Sao Paulo (Bela Vista)"
    },
    "latitude": -23.5537,
    "longitude": -46.646,
    "capacite": 800,
    "styles": [],
    "site": "https://ra.co/clubs/134568",
    "description": {
      "fr": "Ancien théâtre de la rue João Passalaqua, dans le Bixiga, aujourd'hui loué pour des événements, dont des soirées house, techno et drum & bass de collectifs paulistes.",
      "en": "Former theatre on Rua João Passalaqua in Bixiga, now rented out for events, including house, techno and drum & bass parties by São Paulo collectives."
    }
  },
  {
    "id": "komplexo-tempo-sao-paulo",
    "nom": "Komplexo Tempo",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Mooca)",
      "en": "Sao Paulo (Mooca)"
    },
    "latitude": -23.5709,
    "longitude": -46.6003,
    "capacite": 2500,
    "styles": [
      "House",
      "Techno",
      "Tech House"
    ],
    "site": "https://ra.co/clubs/201715",
    "description": {
      "fr": "Entrepôt de l'avenue Henry Ford, à Mooca, utilisé pour de grandes fêtes électroniques, dont le D26 Festival, ses cinq scènes et ses quinze heures de musique en avril 2026.",
      "en": "Warehouse on Avenida Henry Ford in Mooca used for large electronic parties, including the D26 Festival with five stages and fifteen hours of music in April 2026."
    }
  },
  {
    "id": "dr-banana-club-sao-paulo",
    "nom": "Dr. Banana Club",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Vila Firmiano Pinto)",
      "en": "Sao Paulo (Vila Firmiano Pinto)"
    },
    "latitude": -23.6047,
    "longitude": -46.6146,
    "capacite": 500,
    "styles": [
      "House",
      "Minimal",
      "Electro"
    ],
    "site": "https://ra.co/clubs/300752",
    "description": {
      "fr": "Club de 500 places de la rue Vergueiro, dans le sud de la ville, créé pour faire revivre l'âge d'or des clubs paulistes en mêlant musique électronique, mode et art.",
      "en": "500-capacity club on Rua Vergueiro in the south of the city, created to revive the golden era of São Paulo club culture by mixing electronic music, fashion and art."
    }
  },
  {
    "id": "lote-sao-paulo",
    "nom": "Lote",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Pinheiros)",
      "en": "Sao Paulo (Pinheiros)"
    },
    "latitude": -23.5601,
    "longitude": -46.6879,
    "capacite": 200,
    "styles": [
      "House",
      "Balearic",
      "Disco"
    ],
    "site": "https://ra.co/clubs/219409",
    "description": {
      "fr": "Bar en plein air de la rue Padre João Gonçalves, avec bières, snacks et une programmation de DJ chaque semaine entre house, balearic et disco.",
      "en": "Open-air bar on Rua Padre João Gonçalves serving beer and snacks in a courtyard, with a weekly DJ programme of house, balearic and disco."
    }
  },
  {
    "id": "central-1926-sao-paulo",
    "nom": "Central 1926",
    "type": "club",
    "estSalle": true,
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Centro)",
      "en": "Sao Paulo (Centro)"
    },
    "latitude": -23.5502,
    "longitude": -46.6381,
    "capacite": 1500,
    "styles": [],
    "site": "https://ra.co/clubs/204698",
    "description": {
      "fr": "Ancienne station de distribution électrique de 1926, l'édifice Riachuelo de la praça da Bandeira, restaurée pour accueillir de grands événements, dont le Festival Não Existe de Gop Tun.",
      "en": "Former 1926 power distribution station, the Riachuelo Building on Praça da Bandeira, restored to host major events, including Gop Tun's Festival Não Existe."
    }
  },
  {
    "id": "edificio-martinelli-sao-paulo",
    "nom": "Edifício Martinelli",
    "type": "club",
    "estSalle": true,
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Centro Histórico)",
      "en": "Sao Paulo (Centro Histórico)"
    },
    "latitude": -23.5457,
    "longitude": -46.6349,
    "capacite": 500,
    "styles": [],
    "site": "https://ra.co/clubs/236761",
    "description": {
      "fr": "Premier gratte-ciel de São Paulo, rue São Bento dans le centre historique, dont les espaces culturels accueillent régulièrement des fêtes house et disco, dont des soirées Capslock.",
      "en": "São Paulo's first skyscraper, on Rua São Bento in the historic centre, whose cultural spaces regularly host house and disco parties, including Capslock nights."
    }
  },
  {
    "id": "bar-carmem-sao-paulo",
    "nom": "Bar Carmem",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Bom Retiro)",
      "en": "Sao Paulo (Bom Retiro)"
    },
    "latitude": -23.5277,
    "longitude": -46.6388,
    "capacite": 100,
    "styles": [
      "House",
      "Techno",
      "Electro",
      "Acid"
    ],
    "site": "https://ra.co/clubs/264099",
    "description": {
      "fr": "Bar à cocktails de la rue Silva Pinto, à Bom Retiro, qui reçoit régulièrement des DJ house, techno, électro et acid autour de classiques et de créations maison.",
      "en": "Cocktail bar on Rua Silva Pinto in Bom Retiro that regularly hosts house, techno, electro and acid DJs alongside classic and signature drinks."
    }
  },
  {
    "id": "entr3posto-sao-paulo",
    "nom": "Entr3posto",
    "type": "club",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Barra Funda)",
      "en": "Sao Paulo (Barra Funda)"
    },
    "latitude": -23.5312,
    "longitude": -46.6544,
    "capacite": 200,
    "styles": [
      "House",
      "Techno",
      "Electro"
    ],
    "site": "https://ra.co/clubs/227151",
    "description": {
      "fr": "Lieu de fête de la rue Barra Funda, avec bar et table de billard, qui accueille des soirées house, techno et électro de collectifs indépendants.",
      "en": "Party venue on Rua Barra Funda with a bar and a snooker table, hosting house, techno and electro nights by independent collectives."
    }
  },
  {
    "id": "so-track-boa-sao-paulo",
    "nom": "Só Track Boa Festival",
    "type": "festival",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Interlagos)",
      "en": "Sao Paulo (Interlagos)"
    },
    "latitude": -23.7018,
    "longitude": -46.6969,
    "capacite": 30000,
    "annee": 2015,
    "mois": {
      "fr": "Juin",
      "en": "June"
    },
    "styles": [
      "Tech House",
      "House",
      "Melodic Techno",
      "Afro House"
    ],
    "site": "https://www.sotrackboa.com.br",
    "description": {
      "fr": "Festival brésilien de musique électronique né en 2015, revenu en juin 2026 à l'autodrome d'Interlagos pour deux jours avec Boris Brejcha, Artbat, Above & Beyond et The Martinez Brothers.",
      "en": "Brazilian electronic music festival founded in 2015, which returned to the Interlagos racetrack for two days in June 2026 with Boris Brejcha, Artbat, Above & Beyond and The Martinez Brothers."
    }
  },
  {
    "id": "festival-nao-existe-sao-paulo",
    "nom": "Festival Não Existe",
    "type": "festival",
    "paysCode": "BR",
    "villeSlug": "saopaulo-br",
    "ville": {
      "fr": "São Paulo (Centro)",
      "en": "Sao Paulo (Centro)"
    },
    "latitude": -23.5502,
    "longitude": -46.6381,
    "capacite": 1500,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "Electro",
      "Indie Dance",
      "Experimental",
      "Electronica"
    ],
    "site": "https://ra.co/events/2489939",
    "description": {
      "fr": "Festival du collectif Gop Tun dont la sixième édition s'est tenue en septembre 2026 au Central 1926, entre électro, indie dance et expérimentations, avec The Twelves et Jex Opolis.",
      "en": "Festival run by the Gop Tun collective, whose sixth edition took place in September 2026 at Central 1926, mixing electro, indie dance and experimental sounds with The Twelves and Jex Opolis."
    }
  },
  {
    "id": "aoyama-hachi-tokyo",
    "nom": "Aoyama Hachi",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Shibuya)",
      "en": "Tokyo (Shibuya)"
    },
    "latitude": 35.6586,
    "longitude": 139.7086,
    "capacite": 200,
    "styles": [
      "House",
      "Techno",
      "Drum & Bass",
      "Jungle"
    ],
    "site": "https://aoyama-hachi.net",
    "description": {
      "fr": "Lieu de quatre étages au 4-5-9 Shibuya, côté Aoyama, à l'ambiance de fête en appartement, avec des soirées DJ et live six nuits par semaine, de la house à la jungle.",
      "en": "Four-storey venue at 4-5-9 Shibuya on the Aoyama side, with an underground house party feel and DJ and live nights six days a week, from house to jungle."
    }
  },
  {
    "id": "aoyama-tunnel-tokyo",
    "nom": "Aoyama Tunnel",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Shibuya)",
      "en": "Tokyo (Shibuya)"
    },
    "latitude": 35.6586,
    "longitude": 139.7086,
    "capacite": 100,
    "annee": 2011,
    "styles": [
      "House",
      "Techno"
    ],
    "site": "https://aoyama-tunnel.com",
    "description": {
      "fr": "Bar caché ouvert en 2011 au sous-sol du 4-5-9 Shibuya, entre lounge et petit club, où des DJ sélectionnés jouent house et techno presque chaque soir.",
      "en": "Hidden bar opened in 2011 in the basement of 4-5-9 Shibuya, somewhere between a lounge and a small club, where selected DJs play house and techno almost every night."
    }
  },
  {
    "id": "forestlimit-tokyo",
    "nom": "Forestlimit",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Hatagaya)",
      "en": "Tokyo (Hatagaya)"
    },
    "latitude": 35.678,
    "longitude": 139.677,
    "capacite": 80,
    "annee": 2010,
    "styles": [
      "Experimental",
      "Electronica",
      "Bass",
      "Techno"
    ],
    "site": "https://www.forestlimit.com",
    "description": {
      "fr": "Petit sous-sol de Hatagaya fondé en 2010, entre club, salle live, studio et lieu d'art expérimental, où se croisent électronique, bass, techno, noise et improvisation.",
      "en": "Small Hatagaya basement founded in 2010 that works as a club, live house, studio and experimental arts venue, mixing electronic music, bass, techno, noise and improvisation."
    }
  },
  {
    "id": "mitsuki-tokyo",
    "nom": "Mitsuki",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Dogenzaka)",
      "en": "Tokyo (Dogenzaka)"
    },
    "latitude": 35.6566,
    "longitude": 139.6957,
    "capacite": 150,
    "annee": 2019,
    "styles": [
      "House",
      "Techno",
      "Electro",
      "Disco"
    ],
    "site": "https://mitsuki-tokyo.com",
    "description": {
      "fr": "Sous-sol de Dogenzaka ouvert en 2019 et conçu par l'artiste YOSHIROTTEN, à mi-chemin entre bar DJ et club, pilier de la house et de la techno underground à Shibuya.",
      "en": "Dogenzaka basement opened in 2019 and designed by artist YOSHIROTTEN, halfway between a DJ bar and a nightclub, and a fixture of underground house and techno in Shibuya."
    }
  },
  {
    "id": "enter-shibuya-tokyo",
    "nom": "ENTER Shibuya",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Jingumae)",
      "en": "Tokyo (Jingumae)"
    },
    "latitude": 35.6637,
    "longitude": 139.7024,
    "capacite": 150,
    "annee": 2022,
    "styles": [
      "House",
      "Techno",
      "Tech House",
      "Bass"
    ],
    "site": "https://entershibuya.com",
    "description": {
      "fr": "Club de 150 places ouvert en 2022 à Jingumae par l'équipe de Contact et Sound Museum Vision, avec la cabine DJ placée au centre de la piste de danse.",
      "en": "150-capacity club opened in 2022 in Jingumae by the team behind Contact and Sound Museum Vision, with the DJ booth placed in the middle of the dance floor."
    }
  },
  {
    "id": "dj-bar-bridge-tokyo",
    "nom": "DJ Bar Bridge",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Shibuya)",
      "en": "Tokyo (Shibuya)"
    },
    "latitude": 35.6597,
    "longitude": 139.7015,
    "capacite": 100,
    "annee": 2014,
    "styles": [
      "House",
      "Disco",
      "Techno"
    ],
    "site": "https://djbar-bridge.com/shibuya/",
    "description": {
      "fr": "Bar DJ ouvert en 2014 au dernier étage d'un immeuble face à la gare de Shibuya et au carrefour Hachiko, avec son propre système son et une programmation house et disco.",
      "en": "DJ bar opened in 2014 on the top floor of a building overlooking Shibuya Station and Hachiko Square, with its own sound system and a house and disco programme."
    }
  },
  {
    "id": "azumaya-tokyo",
    "nom": "Azumaya",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Dogenzaka)",
      "en": "Tokyo (Dogenzaka)"
    },
    "latitude": 35.6587,
    "longitude": 139.6956,
    "capacite": 70,
    "styles": [
      "House",
      "Techno",
      "Bass"
    ],
    "site": "https://azumaya.jp",
    "description": {
      "fr": "Bar DJ de 70 places voisin du Spotify O-EAST, avec une petite piste de danse, un intérieur dessiné par Hirokazu Yamazaki du groupe toe et des œuvres de Shinpei Kashiwabara.",
      "en": "70-capacity DJ bar next to Spotify O-EAST, with a compact dance floor, an interior designed by Hirokazu Yamazaki of the band toe and artwork by Shinpei Kashiwabara."
    }
  },
  {
    "id": "debris-tokyo",
    "nom": "Débris",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Daikanyama)",
      "en": "Tokyo (Daikanyama)"
    },
    "latitude": 35.6509,
    "longitude": 139.7037,
    "capacite": 80,
    "styles": [
      "House",
      "Techno",
      "Dub",
      "Disco"
    ],
    "site": "https://debrispace.com",
    "description": {
      "fr": "Bar caché de Daikanyama à l'entrée façon speakeasy, doté d'un système son dédié et d'une bibliothèque attenante, où des DJ jouent house, techno, dub et disco.",
      "en": "Hidden Daikanyama bar with a speakeasy-style entrance, a dedicated sound system and an adjoining library space, where DJs play house, techno, dub and disco."
    }
  },
  {
    "id": "sel-octagon-tokyo",
    "nom": "SEL OCTAGON TOKYO",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Roppongi)",
      "en": "Tokyo (Roppongi)"
    },
    "latitude": 35.6648,
    "longitude": 139.7298,
    "capacite": 700,
    "styles": [
      "House",
      "Techno",
      "Electro",
      "EDM"
    ],
    "site": "https://sel-octagon-tokyo.jp",
    "description": {
      "fr": "Club haut de gamme du groupe avex au sous-sol de l'immeuble Axall Roppongi, héritier du club séoulite Octagon, avec écrans numériques et programmation électro, house et techno.",
      "en": "High-end club run by avex in the basement of the Axall Roppongi building, inheriting the concept of Seoul's Octagon, with digital visuals and an electro, house and techno programme."
    }
  },
  {
    "id": "clubasia-tokyo",
    "nom": "clubasia",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Maruyamacho)",
      "en": "Tokyo (Maruyamacho)"
    },
    "latitude": 35.6598,
    "longitude": 139.6954,
    "capacite": 600,
    "annee": 1996,
    "styles": [
      "Bass",
      "House",
      "Club"
    ],
    "site": "https://clubasia.jp",
    "description": {
      "fr": "Club de Maruyamacho ouvert en 1996, sur trois niveaux pour plus de 600 personnes, avec un plafond de six mètres et un mur LED installé en 2024.",
      "en": "Maruyamacho club opened in 1996, spread over three floors for more than 600 people, with a six-metre ceiling and a large LED installation added in 2024."
    }
  },
  {
    "id": "unit-tokyo",
    "nom": "UNIT",
    "type": "club",
    "estSalle": true,
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Daikanyama)",
      "en": "Tokyo (Daikanyama)"
    },
    "latitude": 35.6471,
    "longitude": 139.7024,
    "capacite": 500,
    "annee": 2004,
    "styles": [],
    "site": "https://www.unit-tokyo.com",
    "description": {
      "fr": "Salle de Daikanyama ouverte en 2004, à la fois scène live et club, connue pour ses hauts plafonds, ses visuels et son son, avec la salle Saloon au niveau inférieur.",
      "en": "Daikanyama venue opened in 2004 that works as both a live stage and a nightclub, known for its high ceilings, visuals and sound, with the Saloon room on the lower floor."
    }
  },
  {
    "id": "bonobo-tokyo",
    "nom": "Bonobo",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Jingumae)",
      "en": "Tokyo (Jingumae)"
    },
    "latitude": 35.6745,
    "longitude": 139.7111,
    "capacite": 100,
    "styles": [
      "House",
      "Techno",
      "Acid"
    ],
    "site": "https://ra.co/clubs/12274",
    "description": {
      "fr": "Vieille maison de deux étages près de Harajuku, avec enceintes Altec et mixeur rotatif fabriqué pour David Mancuso au rez-de-chaussée, et salle en tatami avec Klipschorn à l'étage.",
      "en": "Old two-storey house near Harajuku with Altec speakers and a rotary mixer built for David Mancuso downstairs, and a tatami room with Klipschorn speakers upstairs."
    }
  },
  {
    "id": "solfa-tokyo",
    "nom": "Solfa",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Nakameguro)",
      "en": "Tokyo (Nakameguro)"
    },
    "latitude": 35.647,
    "longitude": 139.6981,
    "capacite": 200,
    "annee": 2008,
    "styles": [
      "Techno",
      "House"
    ],
    "site": "https://nakameguro-solfa.com",
    "description": {
      "fr": "Club de Nakameguro ouvert en 2008, avec un bar lounge et une piste d'environ 100 personnes équipée d'un système RCF italien, centré sur la techno et la house.",
      "en": "Nakameguro club opened in 2008, with a bar lounge and a main floor for about 100 people fitted with an Italian RCF sound system, focused on techno and house."
    }
  },
  {
    "id": "koenji-cave-tokyo",
    "nom": "Koenji Cave",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Koenji)",
      "en": "Tokyo (Koenji)"
    },
    "latitude": 35.7037,
    "longitude": 139.6499,
    "capacite": 150,
    "annee": 2009,
    "styles": [
      "Psy",
      "Goa Trance",
      "Acid",
      "Techno"
    ],
    "site": "https://www.djsbarcave.tokyo",
    "description": {
      "fr": "Club de Koenji fondé en 2009 et consacré à la trance psychédélique, avec une piste principale et un lounge séparés et une programmation qui s'étend aux festivals en plein air.",
      "en": "Koenji club founded in 2009 and dedicated to psychedelic trance, with separate main floor and lounge areas and a programme that extends to outdoor festivals."
    }
  },
  {
    "id": "liquidroom-tokyo",
    "nom": "LIQUIDROOM",
    "type": "club",
    "estSalle": true,
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Ebisu)",
      "en": "Tokyo (Ebisu)"
    },
    "latitude": 35.6491,
    "longitude": 139.7105,
    "capacite": 900,
    "annee": 2004,
    "styles": [],
    "site": "https://www.liquidroom.net",
    "description": {
      "fr": "Salle d'Ebisu ouverte en 2004 après la fermeture du Liquidroom de Shinjuku, surtout consacrée aux concerts mais qui organise encore des nuits techno et house sur un système son réputé.",
      "en": "Ebisu venue opened in 2004 after the closure of the Shinjuku Liquidroom, mostly used for concerts but still hosting occasional late-night techno and house events on a renowned sound system."
    }
  },
  {
    "id": "www-tokyo",
    "nom": "WWW",
    "type": "club",
    "estSalle": true,
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Udagawacho)",
      "en": "Tokyo (Udagawacho)"
    },
    "latitude": 35.6615,
    "longitude": 139.6988,
    "capacite": 400,
    "styles": [],
    "site": "https://www-shibuya.jp",
    "description": {
      "fr": "Salle live et club d'Udagawacho à Shibuya, produite par Space Shower, qui accueille concerts et nuits électroniques, dont une fête de 24 heures pour le Nouvel An 2025-2026.",
      "en": "Live and club venue in Udagawacho, Shibuya, produced by Space Shower, hosting concerts and electronic nights, including a 24-hour New Year party for 2025-2026."
    }
  },
  {
    "id": "dogenzaka-church-tokyo",
    "nom": "Dogenzaka Church",
    "type": "club",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Dogenzaka)",
      "en": "Tokyo (Dogenzaka)"
    },
    "latitude": 35.6586,
    "longitude": 139.6969,
    "capacite": 120,
    "annee": 2022,
    "styles": [
      "House",
      "Techno",
      "Drum & Bass",
      "Jungle"
    ],
    "site": "https://dogenzaka-church.com",
    "description": {
      "fr": "Bar DJ et espace d'événements au décor d'église ouvert en 2022 sur Dogenzaka, avec un salon de spectacle à l'étage et des soirées house, techno et drum & bass.",
      "en": "Church-themed DJ bar and event space opened in 2022 on Dogenzaka, with an upstairs show lounge and a programme of house, techno and drum & bass parties."
    }
  },
  {
    "id": "nu-festival-tokyo",
    "nom": "NU Festival",
    "type": "festival",
    "paysCode": "JP",
    "villeSlug": "tokyo-jp",
    "ville": {
      "fr": "Tokyo (Takanawa)",
      "en": "Tokyo (Takanawa)"
    },
    "latitude": 35.6356,
    "longitude": 139.7396,
    "capacite": 3000,
    "annee": 2026,
    "mois": {
      "fr": "Juin",
      "en": "June"
    },
    "styles": [
      "Electronica",
      "Ambient",
      "Experimental",
      "Techno"
    ],
    "site": "https://nufestival.jp",
    "description": {
      "fr": "Festival urbain lancé en juin 2026 à Takanawa Gateway City en collaboration avec Sónar, JR East et J-WAVE, réunissant William Basinski, Suzanne Ciani, Actress et Daito Manabe.",
      "en": "Urban festival launched in June 2026 at Takanawa Gateway City in collaboration with Sónar, JR East and J-WAVE, featuring William Basinski, Suzanne Ciani, Actress and Daito Manabe."
    }
  },
  {
    "id": "good-room-newyork",
    "nom": "Good Room",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Greenpoint, Brooklyn)",
      "en": "New York (Greenpoint, Brooklyn)"
    },
    "latitude": 40.7269,
    "longitude": -73.9528,
    "capacite": 500,
    "annee": 2014,
    "styles": [
      "House",
      "Disco",
      "Techno"
    ],
    "site": "https://goodroombk.com",
    "description": {
      "fr": "Club de Greenpoint ouvert en 2014 au 98 Meserole Avenue par des vétérans de la nuit, qui marie bar de quartier et piste de danse sur un système d&b audiotechnik installé par Oxygen Eventworks.",
      "en": "Greenpoint club opened in 2014 at 98 Meserole Avenue by nightlife veterans, blending a neighborhood bar with a dance floor driven by a d&b audiotechnik system installed by Oxygen Eventworks."
    }
  },
  {
    "id": "silo-newyork",
    "nom": "SILO",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (East Williamsburg, Brooklyn)",
      "en": "New York (East Williamsburg, Brooklyn)"
    },
    "latitude": 40.7105,
    "longitude": -73.9229,
    "capacite": 500,
    "annee": 2023,
    "styles": [
      "Techno",
      "House",
      "Tech House"
    ],
    "site": "https://www.silobrooklyn.com",
    "description": {
      "fr": "Hangar reconverti d’East Williamsburg ouvert en février 2023 par l’équipe des fêtes Secret Loft, salle de 500 personnes qui programme surtout techno et house, avec des soirées tech house et afro house.",
      "en": "Converted hangar in East Williamsburg opened in February 2023 by the team behind the Secret Loft parties, a 500-capacity room programming mostly techno and house, with tech house and afro house nights."
    }
  },
  {
    "id": "le-bain-newyork",
    "nom": "Le Bain",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Meatpacking District, Manhattan)",
      "en": "New York (Meatpacking District, Manhattan)"
    },
    "latitude": 40.7409,
    "longitude": -74.0081,
    "capacite": 300,
    "styles": [
      "House",
      "Deep House",
      "Disco"
    ],
    "site": "https://www.lebainnewyork.com",
    "description": {
      "fr": "Club au 18e étage et sur le toit de l’hôtel The Standard, High Line, avec piscine intérieure près de la piste et terrasse, qui programme house, disco et deep house presque chaque soir.",
      "en": "Club on the 18th floor and rooftop of The Standard, High Line hotel, with an indoor pool beside the dance floor and a terrace, programming house, disco and deep house most nights."
    }
  },
  {
    "id": "paragon-newyork",
    "nom": "Paragon",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Bushwick, Brooklyn)",
      "en": "New York (Bushwick, Brooklyn)"
    },
    "latitude": 40.6961,
    "longitude": -73.9341,
    "capacite": 275,
    "annee": 2022,
    "styles": [
      "Techno",
      "House",
      "Acid"
    ],
    "site": "https://www.paragonbroadway.com",
    "description": {
      "fr": "Club du 990 Broadway ouvert en avril 2022, fermé en avril 2025 puis rouvert en août 2025 avec le soutien de Kevin Saunderson, dont la programmation mêle techno, house, acid et club.",
      "en": "Club at 990 Broadway opened in April 2022, closed in April 2025 and reopened in August 2025 with backing from Kevin Saunderson, programming techno, house, acid and club music."
    }
  },
  {
    "id": "house-of-yes-newyork",
    "nom": "House of Yes",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Bushwick, Brooklyn)",
      "en": "New York (Bushwick, Brooklyn)"
    },
    "latitude": 40.7068,
    "longitude": -73.9236,
    "capacite": 475,
    "annee": 2015,
    "styles": [
      "House",
      "Techno",
      "Disco",
      "Deep House"
    ],
    "site": "https://www.houseofyes.org",
    "description": {
      "fr": "Club-théâtre installé à Bushwick depuis 2015, connu pour ses soirées qui mêlent DJ, cirque, cabaret et performances costumées, avec une programmation house, techno et disco pour environ 475 personnes.",
      "en": "Theatre-infused nightclub in Bushwick since 2015, known for parties that combine DJs with circus, cabaret and costumed performance, programming house, techno and disco for around 475 people."
    }
  },
  {
    "id": "signal-newyork",
    "nom": "Signal",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (East Williamsburg, Brooklyn)",
      "en": "New York (East Williamsburg, Brooklyn)"
    },
    "latitude": 40.7101,
    "longitude": -73.9335,
    "capacite": 215,
    "annee": 2025,
    "styles": [
      "House",
      "Techno",
      "Deep House"
    ],
    "site": "https://www.signalnyc.club",
    "description": {
      "fr": "Club intime d’East Williamsburg ouvert en mai 2025 au 175 Morgan Avenue, construit autour d’un système d&b audiotechnik à quatre points, avec une politique stricte sans téléphone sur la piste.",
      "en": "Intimate East Williamsburg club opened in May 2025 at 175 Morgan Avenue, built around a tuned four-point d&b audiotechnik system and enforcing a strict no-phones policy on the dance floor."
    }
  },
  {
    "id": "h0l0-newyork",
    "nom": "H0L0",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Ridgewood, Queens)",
      "en": "New York (Ridgewood, Queens)"
    },
    "latitude": 40.6943,
    "longitude": -73.9022,
    "capacite": 300,
    "annee": 2017,
    "styles": [
      "House",
      "Techno",
      "Minimal"
    ],
    "site": "https://h0l0.nyc",
    "description": {
      "fr": "Espace de Ridgewood, dans le Queens, ouvert en juillet 2017 au 1090 Wyckoff Avenue, devenu un repère de la scène underground new-yorkaise pour les soirées house, techno et minimal.",
      "en": "Ridgewood, Queens venue opened in July 2017 at 1090 Wyckoff Avenue, now a fixture of the New York underground scene for house, techno and minimal club nights."
    }
  },
  {
    "id": "mood-ring-newyork",
    "nom": "Mood Ring",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Bushwick, Brooklyn)",
      "en": "New York (Bushwick, Brooklyn)"
    },
    "latitude": 40.6978,
    "longitude": -73.927,
    "capacite": 150,
    "annee": 2017,
    "styles": [
      "Techno",
      "House",
      "Club",
      "Trance"
    ],
    "site": "https://www.moodringnyc.club",
    "description": {
      "fr": "Bar à thème astrologique ouvert en septembre 2017 sur Myrtle Avenue, qui accueille des DJ chaque soir et refuse les plateaux entièrement masculins, entre techno, house, trance et sons club.",
      "en": "Astrology-themed bar opened in September 2017 on Myrtle Avenue, hosting DJs every night with a policy against all-male lineups, spanning techno, house, trance and club sounds."
    }
  },
  {
    "id": "jupiter-disco-newyork",
    "nom": "Jupiter Disco",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Bushwick, Brooklyn)",
      "en": "New York (Bushwick, Brooklyn)"
    },
    "latitude": 40.7081,
    "longitude": -73.9235,
    "capacite": 150,
    "styles": [
      "Electro",
      "House",
      "Acid",
      "Disco"
    ],
    "site": "https://www.jupiterdisco.com",
    "description": {
      "fr": "Bar à cocktails de Bushwick doté d’une petite piste et d’un son audiophile, au 1237 Flushing Avenue, où les DJ résidents et invités jouent surtout electro, house, acid et disco.",
      "en": "Bushwick cocktail bar with a small dance floor and audiophile sound at 1237 Flushing Avenue, where resident and guest DJs mostly play electro, house, acid and disco."
    }
  },
  {
    "id": "superior-ingredients-newyork",
    "nom": "Superior Ingredients",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Williamsburg, Brooklyn)",
      "en": "New York (Williamsburg, Brooklyn)"
    },
    "latitude": 40.7223,
    "longitude": -73.9578,
    "capacite": 400,
    "styles": [
      "House",
      "Techno",
      "Afro House",
      "Tech House"
    ],
    "site": "https://www.si-bk.com",
    "description": {
      "fr": "Lieu de Williamsburg au 74 Wythe Avenue réparti entre une salle intérieure, The Room, et un toit à couverture rétractable, The Roof, qui programme house, techno, tech house et afro house.",
      "en": "Williamsburg venue at 74 Wythe Avenue split between an indoor space, The Room, and a rooftop with a retractable roof, The Roof, programming house, techno, tech house and afro house."
    }
  },
  {
    "id": "refuge-newyork",
    "nom": "Refuge",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (East Williamsburg, Brooklyn)",
      "en": "New York (East Williamsburg, Brooklyn)"
    },
    "latitude": 40.7118,
    "longitude": -73.9352,
    "capacite": 500,
    "annee": 2025,
    "styles": [
      "Techno",
      "House",
      "Progressive House"
    ],
    "site": "https://refuge.nyc",
    "description": {
      "fr": "Club de 500 personnes ouvert en septembre 2025 à East Williamsburg, construit autour de REX, un système sur mesure à quatre stacks de trois mètres conçu par le cofondateur Craig Bernabeu.",
      "en": "A 500-capacity club opened in September 2025 in East Williamsburg, built around REX, a custom four-point system with ten-foot stacks designed by co-founder Craig Bernabeu."
    }
  },
  {
    "id": "outer-heaven-newyork",
    "nom": "Outer Heaven",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Lower East Side, Manhattan)",
      "en": "New York (Lower East Side, Manhattan)"
    },
    "latitude": 40.722,
    "longitude": -73.9923,
    "capacite": 140,
    "annee": 2023,
    "styles": [
      "House",
      "Tech House",
      "Minimal"
    ],
    "site": "https://www.outerheaven.nyc",
    "description": {
      "fr": "Lounge à cocktails et microclub de 140 places ouvert en février 2023 au 191 Chrystie Street, avec un son Danley conçu par Nicolas Matar, fondateur de Cielo et d’Output, et une programmation house.",
      "en": "Cocktail lounge and 140-capacity microclub opened in February 2023 at 191 Chrystie Street, with Danley sound designed by Nicolas Matar, founder of Cielo and Output, and house-focused programming."
    }
  },
  {
    "id": "pacha-newyork",
    "nom": "Pacha New York",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (East Williamsburg, Brooklyn)",
      "en": "New York (East Williamsburg, Brooklyn)"
    },
    "latitude": 40.7106,
    "longitude": -73.9262,
    "capacite": 5300,
    "annee": 2026,
    "styles": [
      "House",
      "Tech House",
      "Afro House"
    ],
    "site": "https://www.pacha-nyc.com",
    "description": {
      "fr": "Ancien site du Brooklyn Mirage, au 140 Stewart Avenue, rouvert en juin 2026 sous la bannière Pacha, avec un espace en plein air d’environ 5 300 personnes et une salle couverte de 2 500.",
      "en": "The former Brooklyn Mirage site at 140 Stewart Avenue, reopened in June 2026 under the Pacha banner, with an open-air space for about 5,300 people and an indoor hall for 2,500."
    }
  },
  {
    "id": "mansions-newyork",
    "nom": "Mansions",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Ridgewood, Queens)",
      "en": "New York (Ridgewood, Queens)"
    },
    "latitude": 40.714,
    "longitude": -73.9214,
    "capacite": 160,
    "styles": [
      "Techno",
      "House"
    ],
    "site": "https://ra.co/clubs/197275",
    "description": {
      "fr": "Bar à vin, club et salle à brouillard de 160 places sur Metropolitan Avenue, à Ridgewood, dont la programmation hebdomadaire est presque entièrement consacrée à la techno et à la house.",
      "en": "Wine bar, club and fog room for 160 people on Metropolitan Avenue in Ridgewood, Queens, with a weekly program devoted almost entirely to techno and house."
    }
  },
  {
    "id": "time-warp-newyork",
    "nom": "Time Warp New York",
    "type": "festival",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Brooklyn Navy Yard)",
      "en": "New York (Brooklyn Navy Yard)"
    },
    "latitude": 40.7023,
    "longitude": -73.9776,
    "capacite": 5000,
    "mois": {
      "fr": "Novembre",
      "en": "November"
    },
    "styles": [
      "Techno",
      "House",
      "Minimal"
    ],
    "site": "https://www.time-warp.de/usa/nyc",
    "description": {
      "fr": "Déclinaison new-yorkaise du festival techno né à Mannheim, organisée chaque novembre à Brooklyn, en 2026 sur deux nuits au Duggal Greenhouse et dans l’Agger Building du Brooklyn Navy Yard.",
      "en": "New York edition of the techno festival born in Mannheim, held each November in Brooklyn, in 2026 across two nights at the Duggal Greenhouse and Agger Building in the Brooklyn Navy Yard."
    }
  },
  {
    "id": "experts-only-festival-newyork",
    "nom": "Experts Only Festival",
    "type": "festival",
    "paysCode": "US",
    "villeSlug": "newyork-us",
    "ville": {
      "fr": "New York (Randall’s Island)",
      "en": "New York (Randall’s Island)"
    },
    "latitude": 40.7939,
    "longitude": -73.9176,
    "capacite": 25000,
    "annee": 2025,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "Tech House",
      "House",
      "EDM"
    ],
    "site": "https://www.expertsonlyfest.com",
    "description": {
      "fr": "Festival de deux jours créé par John Summit sur Randall’s Island, dont la première édition, en septembre 2025, a réuni plus de 50 000 personnes autour de la house et de la tech house.",
      "en": "Two-day festival created by DJ and producer John Summit on Randall’s Island, whose first edition in September 2025 drew more than 50,000 people for house and tech house."
    }
  },
  {
    "id": "academy-la-losangeles",
    "nom": "Academy LA",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Hollywood)",
      "en": "Los Angeles (Hollywood)"
    },
    "latitude": 34.1017,
    "longitude": -118.3207,
    "capacite": 1000,
    "annee": 2017,
    "styles": [
      "House",
      "Techno",
      "Tech House"
    ],
    "site": "https://academy.la",
    "description": {
      "fr": "Club du 6021 Hollywood Boulevard lancé fin 2017 à l’adresse des anciens Qtopia, Vanguard et Create, qui programme surtout house, techno et tech house pour environ 1 000 personnes.",
      "en": "Club at 6021 Hollywood Boulevard launched in late 2017 at the former home of Qtopia, Vanguard and Create, programming mostly house, techno and tech house for about 1,000 people."
    }
  },
  {
    "id": "catch-one-losangeles",
    "nom": "Catch One",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Mid-City)",
      "en": "Los Angeles (Mid-City)"
    },
    "latitude": 34.048,
    "longitude": -118.3239,
    "capacite": 2400,
    "annee": 1973,
    "styles": [
      "House",
      "Industrial",
      "EBM"
    ],
    "site": "https://ra.co/clubs/57175",
    "description": {
      "fr": "Club historique de Pico Boulevard ouvert en 1973 par Jewel Thais-Williams, réparti sur plusieurs niveaux avec trois pistes et trois bars, qui accueille des soirées house, industrial et EBM.",
      "en": "Historic Pico Boulevard club opened in 1973 by Jewel Thais-Williams, spread over several levels with three dance floors and three bars, hosting house, industrial and EBM nights."
    }
  },
  {
    "id": "the-bellwether-losangeles",
    "nom": "The Bellwether",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (City West)",
      "en": "Los Angeles (City West)"
    },
    "latitude": 34.0562,
    "longitude": -118.2584,
    "capacite": 1500,
    "annee": 2023,
    "styles": [],
    "site": "https://thebellwetherla.com",
    "description": {
      "fr": "Salle ouverte en juillet 2023 par Teragram Presents et Another Planet Entertainment, avec une grande salle de 1 500 places équipée d’un système d&b, qui programme concerts et soirées électroniques.",
      "en": "Venue opened in July 2023 by Teragram Presents and Another Planet Entertainment, with a 1,500-capacity ballroom fitted with a d&b system, hosting concerts as well as electronic club nights."
    }
  },
  {
    "id": "level-8-losangeles",
    "nom": "Level 8",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Downtown, South Park)",
      "en": "Los Angeles (Downtown, South Park)"
    },
    "latitude": 34.0412,
    "longitude": -118.2674,
    "capacite": 800,
    "annee": 2023,
    "styles": [
      "House",
      "Tech House",
      "Afro House"
    ],
    "site": "https://www.level8dtla.com",
    "description": {
      "fr": "Étage d’environ 2 800 m² au huitième niveau des hôtels Moxy et AC de Downtown, ouvert en 2023, qui réunit huit espaces dont un club et programme surtout house, tech house et afro house.",
      "en": "Eighth-floor complex of about 30,000 square feet in the downtown Moxy and AC hotels, opened in 2023, gathering eight spaces including a nightclub and programming mostly house, tech house and afro house."
    }
  },
  {
    "id": "the-airliner-losangeles",
    "nom": "The Airliner",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Lincoln Heights)",
      "en": "Los Angeles (Lincoln Heights)"
    },
    "latitude": 34.0739,
    "longitude": -118.2162,
    "capacite": 250,
    "styles": [
      "House",
      "Deep House",
      "Disco",
      "Techno"
    ],
    "site": "https://www.barairliner.com",
    "description": {
      "fr": "Bar centenaire de Lincoln Heights dont l’étage, rénové en salle hi-fi boisée avec enceintes Klipsch, reçoit des DJ locaux et internationaux pour des soirées house, deep house, disco et techno.",
      "en": "Century-old Lincoln Heights bar whose upstairs room, renovated as a wood-lined hi-fi space with Klipsch speakers, hosts local and international DJs for house, deep house, disco and techno."
    }
  },
  {
    "id": "los-globos-losangeles",
    "nom": "Los Globos",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Silver Lake)",
      "en": "Los Angeles (Silver Lake)"
    },
    "latitude": 34.0838,
    "longitude": -118.2743,
    "capacite": 850,
    "styles": [
      "House",
      "Tech House",
      "Techno"
    ],
    "site": "https://www.clublosglobos.com",
    "description": {
      "fr": "Ancienne salle de danse de Silver Lake sur Sunset Boulevard, longtemps club latino, répartie entre un lounge en sous-sol et une piste à l’étage, qui programme house, tech house et techno.",
      "en": "Former dance hall on Sunset Boulevard in Silver Lake, long a Latin club, split between a basement lounge and an upstairs dance floor, programming house, tech house and techno."
    }
  },
  {
    "id": "shrine-expo-hall-losangeles",
    "nom": "Shrine Auditorium & Expo Hall",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (University Park)",
      "en": "Los Angeles (University Park)"
    },
    "latitude": 34.0234,
    "longitude": -118.2814,
    "capacite": 5000,
    "annee": 1926,
    "styles": [],
    "site": "https://www.shrineauditorium.com",
    "description": {
      "fr": "Complexe historique voisin de l’USC, avec un auditorium d’environ 6 300 places et un Expo Hall de 5 000 m², régulièrement loué pour de grandes soirées house, electro et bass.",
      "en": "Historic complex next to USC with an auditorium of about 6,300 seats and a 54,000 square foot Expo Hall, regularly booked for large house, electro and bass events."
    }
  },
  {
    "id": "fonda-theatre-losangeles",
    "nom": "The Fonda Theatre",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Hollywood)",
      "en": "Los Angeles (Hollywood)"
    },
    "latitude": 34.1013,
    "longitude": -118.3233,
    "capacite": 1350,
    "annee": 2012,
    "styles": [],
    "site": "https://www.fondatheatre.com",
    "description": {
      "fr": "Théâtre des années 1920 sur Hollywood Boulevard, rouvert sous le nom de Fonda en mars 2012, avec balcon assis et grande fosse pour 1 350 personnes, qui accueille aussi drum & bass et electro.",
      "en": "A 1920s theatre on Hollywood Boulevard reopened as the Fonda in March 2012, with a seated balcony and large open floor for 1,350 people, also hosting drum & bass and electro shows."
    }
  },
  {
    "id": "club-tee-gee-losangeles",
    "nom": "Club Tee Gee",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Atwater Village)",
      "en": "Los Angeles (Atwater Village)"
    },
    "latitude": 34.1177,
    "longitude": -118.2608,
    "capacite": 100,
    "styles": [
      "Disco",
      "Italo",
      "Electro",
      "Acid"
    ],
    "site": "https://ra.co/clubs/162322",
    "description": {
      "fr": "Bar historique d’Atwater Village rénové, avec une salle de danse à l’arrière sous une grande boule à facettes, où les soirées DJ tournent autour de la disco, de l’italo, de l’electro et de l’acid.",
      "en": "Renovated historic Atwater Village bar with a back dance room under a large mirror ball, where DJ nights revolve around disco, italo, electro and acid."
    }
  },
  {
    "id": "bar-franca-losangeles",
    "nom": "Bar Franca",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Downtown, Historic Core)",
      "en": "Los Angeles (Downtown, Historic Core)"
    },
    "latitude": 34.0473,
    "longitude": -118.2479,
    "capacite": 120,
    "styles": [
      "House",
      "Disco",
      "Balearic"
    ],
    "site": "https://www.barfranca.com",
    "description": {
      "fr": "Bar du Historic Core de Downtown, au 438 South Main Street, qui reçoit des DJ plusieurs soirs par semaine pour des sélections house, disco et balearic.",
      "en": "Bar in the Historic Core of Downtown at 438 South Main Street, hosting DJs several nights a week for house, disco and balearic selections."
    }
  },
  {
    "id": "echoplex-losangeles",
    "nom": "Echoplex",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Echo Park)",
      "en": "Los Angeles (Echo Park)"
    },
    "latitude": 34.0776,
    "longitude": -118.2605,
    "capacite": 700,
    "styles": [],
    "site": "https://www.theecho.com",
    "description": {
      "fr": "Salle en sous-sol d’Echo Park, jumelle de The Echo, au sein d’une maison active depuis 2001 qui tient une place centrale dans les soirées dansantes, avec drum & bass, dubstep et electronica entre deux concerts.",
      "en": "Basement venue in Echo Park and sister room to The Echo, run by a house active since 2001 and central to local dance nights, hosting drum & bass, dubstep and electronica between concerts."
    }
  },
  {
    "id": "hollywood-palladium-losangeles",
    "nom": "Hollywood Palladium",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Los Angeles (Hollywood)",
      "en": "Los Angeles (Hollywood)"
    },
    "latitude": 34.0985,
    "longitude": -118.3243,
    "capacite": 4000,
    "annee": 1940,
    "styles": [],
    "site": "https://www.hollywoodpalladium.com",
    "description": {
      "fr": "Salle Art déco de Sunset Boulevard ouverte en 1940, d’environ 4 000 places debout, qui accueille des tournées pop et rock ainsi que des têtes d’affiche de la musique électronique.",
      "en": "Art deco hall on Sunset Boulevard opened in 1940, holding about 4,000 standing, hosting pop and rock tours as well as electronic music headliners."
    }
  },
  {
    "id": "day-trip-festival-losangeles",
    "nom": "Day Trip Festival",
    "type": "festival",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "Long Beach (Queen Mary Waterfront)",
      "en": "Long Beach (Queen Mary Waterfront)"
    },
    "latitude": 33.7523,
    "longitude": -118.1911,
    "capacite": 15000,
    "mois": {
      "fr": "Juin",
      "en": "June"
    },
    "styles": [
      "House",
      "Tech House",
      "Techno"
    ],
    "site": "https://www.daytripfest.com",
    "description": {
      "fr": "Festival de jour organisé par Insomniac sur le front de mer du Queen Mary à Long Beach, consacré à la house et à la techno, complet pour son édition des 27 et 28 juin 2026.",
      "en": "Daytime festival run by Insomniac on the Queen Mary Waterfront in Long Beach, dedicated to house and techno, reported sold out for its June 27 and 28, 2026 edition."
    }
  },
  {
    "id": "nocturnal-wonderland-losangeles",
    "nom": "Nocturnal Wonderland",
    "type": "festival",
    "paysCode": "US",
    "villeSlug": "losangeles-us",
    "ville": {
      "fr": "San Bernardino (Glen Helen Regional Park)",
      "en": "San Bernardino (Glen Helen Regional Park)"
    },
    "latitude": 34.2088,
    "longitude": -117.4062,
    "capacite": 50000,
    "annee": 1995,
    "mois": {
      "fr": "Septembre",
      "en": "September"
    },
    "styles": [
      "EDM",
      "House",
      "Dubstep",
      "Trance"
    ],
    "site": "https://www.nocturnalwonderland.com",
    "description": {
      "fr": "Plus ancien festival d’Insomniac, créé en 1995, installé au Glen Helen Regional Park de San Bernardino avec camping chaque septembre, tourné vers l’EDM, la house, le dubstep et la trance.",
      "en": "Insomniac’s longest-running festival, founded in 1995, held at Glen Helen Regional Park in San Bernardino with camping each September, focused on EDM, house, dubstep and trance."
    }
  },
  {
    "id": "smoke-and-mirrors-chicago",
    "nom": "Smoke & Mirrors",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Logan Square)",
      "en": "Chicago (Logan Square)"
    },
    "latitude": 41.9183,
    "longitude": -87.6896,
    "capacite": 200,
    "styles": [
      "Techno",
      "House",
      "UK Garage",
      "Breaks"
    ],
    "site": "https://www.smokeandmirrorschicago.com",
    "description": {
      "fr": "Bar clandestin et salle de Logan Square au 2045 North Milwaukee Avenue, ouvert jusqu’à 5 h le samedi, dont la programmation underground privilégie techno, house, UK garage et breaks.",
      "en": "Underground bar and music venue in Logan Square at 2045 North Milwaukee Avenue, open until 5 a.m. on Saturdays, with programming centered on techno, house, UK garage and breaks."
    }
  },
  {
    "id": "prysm-chicago",
    "nom": "PRYSM",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Lincoln Park)",
      "en": "Chicago (Lincoln Park)"
    },
    "latitude": 41.9094,
    "longitude": -87.6524,
    "capacite": 650,
    "styles": [
      "House",
      "Tech House",
      "Techno"
    ],
    "site": "https://www.prysmchicago.com",
    "description": {
      "fr": "Club de 650 personnes au 1543 North Kingsbury Street, organisé autour de plusieurs espaces dont Serum et The Lab, qui reçoit des DJ house, tech house et techno en tournée.",
      "en": "A 650-capacity club at 1543 North Kingsbury Street, organized around several spaces including Serum and The Lab, booking touring house, tech house and techno DJs."
    }
  },
  {
    "id": "concord-music-hall-chicago",
    "nom": "Concord Music Hall",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Logan Square)",
      "en": "Chicago (Logan Square)"
    },
    "latitude": 41.9186,
    "longitude": -87.6899,
    "capacite": 1200,
    "styles": [],
    "site": "https://concordmusichall.com",
    "description": {
      "fr": "Salle de concert de Logan Square à la programmation éclectique, du punk à la K-pop, qui consacre une large part de ses soirées au bass, à la house, au dubstep et à la techno.",
      "en": "Logan Square concert hall with an eclectic calendar running from punk to K-pop, which devotes a large share of its nights to bass, house, dubstep and techno."
    }
  },
  {
    "id": "outset-chicago",
    "nom": "Outset",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (West Town)",
      "en": "Chicago (West Town)"
    },
    "latitude": 41.9127,
    "longitude": -87.6632,
    "capacite": 800,
    "annee": 2024,
    "styles": [],
    "site": "https://outsetlive.com",
    "description": {
      "fr": "Salle ouverte en 2024 au 1675 North Elston Avenue, qui associe production de grande salle et proximité, et accueille DJ et concerts, dont des after officiels du festival Afterlife.",
      "en": "Venue opened in 2024 at 1675 North Elston Avenue, combining large-room production with a close-up feel, hosting DJs and live acts including official Afterlife afterparties."
    }
  },
  {
    "id": "california-clipper-chicago",
    "nom": "The California Clipper",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Humboldt Park)",
      "en": "Chicago (Humboldt Park)"
    },
    "latitude": 41.8995,
    "longitude": -87.697,
    "capacite": 150,
    "annee": 1937,
    "styles": [
      "House",
      "Disco",
      "Leftfield"
    ],
    "site": "https://californiaclipper.com",
    "description": {
      "fr": "Plus ancien bar de quartier de Humboldt Park, ouvert en 1937 dans un ancien théâtre de 1912, qui reçoit des DJ house, disco et expérimentaux plusieurs soirs par semaine.",
      "en": "Humboldt Park’s longest-standing neighborhood bar, opened in 1937 in a former 1912 theater, hosting house, disco and experimental DJs several nights a week."
    }
  },
  {
    "id": "le-nocturne-chicago",
    "nom": "Le Nocturne",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Uptown)",
      "en": "Chicago (Uptown)"
    },
    "latitude": 41.9694,
    "longitude": -87.6598,
    "capacite": 300,
    "styles": [
      "House",
      "Deep House",
      "Disco"
    ],
    "site": "https://ra.co/clubs/173265",
    "description": {
      "fr": "Restaurant et club d’Uptown sur North Broadway, d’environ 300 places, qui mêle cuisine d’inspiration française, drag et soirées DJ house et deep house, dont des fêtes des Chosen Few DJs.",
      "en": "Uptown restaurant and club on North Broadway for about 300 people, mixing French-accented food, drag shows and house and deep house DJ nights, including Chosen Few DJs parties."
    }
  },
  {
    "id": "decibel-chicago",
    "nom": "Decibel",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Lakeview)",
      "en": "Chicago (Lakeview)"
    },
    "latitude": 41.94,
    "longitude": -87.6536,
    "capacite": 200,
    "styles": [
      "House",
      "Techno",
      "Deep House"
    ],
    "site": "https://www.dbchicago.com",
    "description": {
      "fr": "Club de Lakeview installé dans les murs de l’ancien Berlin Nightclub, au 954 West Belmont Avenue, équipé d’un système PK Sound et programmé autour de la house et de la techno.",
      "en": "Lakeview club in the former home of Berlin Nightclub at 954 West Belmont Avenue, fitted with a PK Sound system and programmed around house and techno."
    }
  },
  {
    "id": "swig-chicago",
    "nom": "Swig",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Wicker Park)",
      "en": "Chicago (Wicker Park)"
    },
    "latitude": 41.9087,
    "longitude": -87.6744,
    "capacite": 150,
    "styles": [
      "House",
      "Techno",
      "Deep House"
    ],
    "site": "https://swigchicago.com",
    "description": {
      "fr": "Petit bar de Wicker Park sur North Milwaukee Avenue avec DJ et place pour danser, qui programme surtout house et techno, avec des soirées deep house et electronica.",
      "en": "Small Wicker Park bar on North Milwaukee Avenue with DJs and room to dance, programming mostly house and techno, plus deep house and electronica nights."
    }
  },
  {
    "id": "whistler-chicago",
    "nom": "The Whistler",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Logan Square)",
      "en": "Chicago (Logan Square)"
    },
    "latitude": 41.9254,
    "longitude": -87.701,
    "capacite": 150,
    "styles": [
      "House",
      "Bass",
      "UK Garage",
      "Balearic"
    ],
    "site": "https://whistlerchicago.com",
    "description": {
      "fr": "Bar à cocktails et salle de Logan Square doublé d’une galerie en vitrine, qui programme des soirées DJ entre house, balearic, footwork, jungle et UK garage.",
      "en": "Logan Square cocktail bar and music venue with a storefront gallery, programming DJ nights that range across house, balearic, footwork, jungle and UK garage."
    }
  },
  {
    "id": "bourbon-on-division-chicago",
    "nom": "Bourbon on Division",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Wicker Park)",
      "en": "Chicago (Wicker Park)"
    },
    "latitude": 41.9034,
    "longitude": -87.6793,
    "capacite": 300,
    "styles": [],
    "site": "https://bourbonondivision.com",
    "description": {
      "fr": "Bar à whisky et salle de concert sur plusieurs niveaux à Wicker Park, ouvert jusqu’à 4 h, dont l’étage accueille régulièrement des soirées techno, tech house et house.",
      "en": "Multi-level whiskey bar and live music venue in Wicker Park, open until 4 a.m., whose upstairs room regularly hosts techno, tech house and house nights."
    }
  },
  {
    "id": "subterranean-chicago",
    "nom": "Subterranean",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Wicker Park)",
      "en": "Chicago (Wicker Park)"
    },
    "latitude": 41.9104,
    "longitude": -87.6779,
    "capacite": 400,
    "styles": [],
    "site": "https://www.subt.net",
    "description": {
      "fr": "Salle de concert de Wicker Park au 2011 West North Avenue, avec un espace Downstairs, qui alterne concerts et soirées DJ techno, industrial, house et ghetto tech.",
      "en": "Wicker Park concert venue at 2011 West North Avenue, with a Downstairs room, alternating live shows with techno, industrial, house and ghetto tech DJ nights."
    }
  },
  {
    "id": "metro-chicago",
    "nom": "Metro",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Wrigleyville)",
      "en": "Chicago (Wrigleyville)"
    },
    "latitude": 41.9498,
    "longitude": -87.659,
    "capacite": 1100,
    "annee": 1982,
    "styles": [],
    "site": "https://metrochicago.com",
    "description": {
      "fr": "Salle de Wrigleyville ouverte en 1982 au 3730 North Clark Street, au-dessus du Smartbar, qui programme rock et indie mais aussi des soirées industrial, techno et post-punk.",
      "en": "Wrigleyville venue opened in 1982 at 3730 North Clark Street, above Smartbar, programming rock and indie as well as industrial, techno and post-punk nights."
    }
  },
  {
    "id": "ramova-theatre-chicago",
    "nom": "Ramova Theatre",
    "type": "club",
    "estSalle": true,
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Bridgeport)",
      "en": "Chicago (Bridgeport)"
    },
    "latitude": 41.8303,
    "longitude": -87.6466,
    "capacite": 1500,
    "annee": 2023,
    "styles": [],
    "site": "https://www.ramovachicago.com",
    "description": {
      "fr": "Cinéma de 1929 à Bridgeport rouvert le 31 décembre 2023 en salle de concert de plus de 1 500 places, qui accueille régulièrement des têtes d’affiche EDM, dubstep et bass.",
      "en": "A 1929 Bridgeport movie palace reopened on December 31, 2023 as a concert hall for more than 1,500 people, regularly hosting EDM, dubstep and bass headliners."
    }
  },
  {
    "id": "masada-chicago",
    "nom": "Masada",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Logan Square)",
      "en": "Chicago (Logan Square)"
    },
    "latitude": 41.922,
    "longitude": -87.6976,
    "capacite": 400,
    "styles": [
      "House",
      "Deep House",
      "Afro House"
    ],
    "site": "https://masadachicago.com",
    "description": {
      "fr": "Club de Logan Square avec toit-terrasse saisonnier, connu pour ses soirées house, afrobeats et électroniques, et pour ses lundis Industry Mondayz avec platines ouvertes aux DJ émergents.",
      "en": "Logan Square nightclub with a seasonal rooftop, known for house, afrobeats and electronic nights and for its Industry Mondayz open decks sessions for emerging DJs."
    }
  },
  {
    "id": "chosen-few-picnic-chicago",
    "nom": "Chosen Few Picnic & Festival",
    "type": "festival",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Chicago (Jackson Park)",
      "en": "Chicago (Jackson Park)"
    },
    "latitude": 41.7747,
    "longitude": -87.5804,
    "capacite": 45000,
    "annee": 1990,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "House",
      "Soulful House",
      "Deep House"
    ],
    "site": "https://chosenfewdjs.com",
    "description": {
      "fr": "Rassemblement house né en 1990 derrière le Museum of Science and Industry, organisé à Jackson Park depuis 2005 par les Chosen Few DJs, qui a réuni 45 000 personnes en 2026.",
      "en": "House music gathering born in 1990 behind the Museum of Science and Industry, held in Jackson Park since 2005 by the Chosen Few DJs, drawing 45,000 people in 2026."
    }
  },
  {
    "id": "north-coast-chicago",
    "nom": "North Coast Music Festival",
    "type": "festival",
    "paysCode": "US",
    "villeSlug": "chicago-us",
    "ville": {
      "fr": "Bridgeview (SeatGeek Stadium)",
      "en": "Bridgeview (SeatGeek Stadium)"
    },
    "latitude": 41.7648,
    "longitude": -87.8062,
    "capacite": 20000,
    "annee": 2010,
    "mois": {
      "fr": "Septembre (Labor Day)",
      "en": "September (Labor Day)"
    },
    "styles": [
      "EDM",
      "House",
      "Bass",
      "Dubstep"
    ],
    "site": "https://www.northcoastfestival.com",
    "description": {
      "fr": "Festival électronique du week-end de Labor Day, né à Union Park et installé au SeatGeek Stadium de Bridgeview, en banlieue sud-ouest, pour sa seizième édition du 4 au 6 septembre 2026.",
      "en": "Labor Day weekend electronic festival that began in Union Park and now runs at SeatGeek Stadium in suburban Bridgeview, which hosted its sixteenth edition from September 4 to 6, 2026."
    }
  },
  {
    "id": "do-not-sit-on-the-furniture-miami",
    "nom": "Do Not Sit On The Furniture",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami Beach (South Beach)",
      "en": "Miami Beach (South Beach)"
    },
    "latitude": 25.7893,
    "longitude": -80.1323,
    "capacite": 100,
    "styles": [
      "Deep House",
      "House"
    ],
    "site": "https://donotsitonthefurniture.com",
    "description": {
      "fr": "Petit club de South Beach d’environ 100 places sur la 16e Rue, consacré à la house et à la deep house, avec plus de deux cents soirées à l’affiche chaque année.",
      "en": "Small South Beach club for about 100 people on 16th Street, devoted to house and deep house, with more than two hundred nights on its calendar each year."
    }
  },
  {
    "id": "zeyzey-miami",
    "nom": "ZeyZey",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Little Haiti)",
      "en": "Miami (Little Haiti)"
    },
    "latitude": 25.8327,
    "longitude": -80.1891,
    "capacite": 400,
    "styles": [
      "House",
      "Deep House",
      "Electronica",
      "Disco"
    ],
    "site": "https://zeyzeymiami.com",
    "description": {
      "fr": "Salle et lieu culturel de Little Haiti sur la 61e Rue, entre jardin et bungalow bohème, avec cocktails, vins nature et chefs invités, qui programme house, deep house, electronica et disco.",
      "en": "Music venue and cultural hub in Little Haiti on 61st Street, part garden and part bohemian bungalow, with cocktails, natural wine and rotating chefs, programming house, deep house, electronica and disco."
    }
  },
  {
    "id": "factory-town-miami",
    "nom": "Factory Town",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Hialeah)",
      "en": "Miami (Hialeah)"
    },
    "latitude": 25.8174,
    "longitude": -80.2576,
    "capacite": 5000,
    "styles": [
      "Techno",
      "House",
      "Bass"
    ],
    "site": "https://www.factorytown.com",
    "description": {
      "fr": "Ancienne usine de matelas de sept acres à Hialeah, exploitée par Insomniac comme site en plein air pouvant accueillir 5 000 personnes, pour des soirées techno, house et bass.",
      "en": "Seven-acre former mattress factory in Hialeah, run by Insomniac as an open-air venue for up to 5,000 people, hosting techno, house and bass events."
    }
  },
  {
    "id": "liv-miami",
    "nom": "LIV",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami Beach (Fontainebleau)",
      "en": "Miami Beach (Fontainebleau)"
    },
    "latitude": 25.8181,
    "longitude": -80.122,
    "capacite": 1500,
    "annee": 2008,
    "styles": [
      "House",
      "Tech House",
      "EDM"
    ],
    "site": "https://www.livnightclub.com/miami/",
    "description": {
      "fr": "Club de 1 700 m² ouvert en 2008 dans l’hôtel Fontainebleau de Miami Beach, équipé d’un système Funktion-One, qui alterne têtes d’affiche house et EDM et soirées hip-hop.",
      "en": "An 18,000 square foot club opened in 2008 inside the Fontainebleau hotel in Miami Beach, fitted with a Funktion-One system and alternating house and EDM headliners with hip-hop nights."
    }
  },
  {
    "id": "e11even-miami",
    "nom": "E11EVEN",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Park West)",
      "en": "Miami (Park West)"
    },
    "latitude": 25.7849,
    "longitude": -80.1935,
    "capacite": 650,
    "annee": 2014,
    "styles": [
      "EDM",
      "House",
      "Tech House"
    ],
    "site": "https://www.11miami.com",
    "description": {
      "fr": "Club ouvert jour et nuit à Park West depuis 2014, connu pour ses spectacles et ses performances, qui invite régulièrement des DJ EDM et house aux côtés de têtes d’affiche hip-hop.",
      "en": "Park West club open around the clock since 2014, known for its stage shows and performances, regularly booking EDM and house DJs alongside hip-hop headliners."
    }
  },
  {
    "id": "the-ground-miami",
    "nom": "The Ground",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Park West)",
      "en": "Miami (Park West)"
    },
    "latitude": 25.7846,
    "longitude": -80.1932,
    "capacite": 555,
    "styles": [
      "Techno",
      "House",
      "Tech House",
      "Experimental"
    ],
    "site": "https://www.thegroundmiami.com",
    "description": {
      "fr": "Salle de taille moyenne de 555 places au rez-de-chaussée du bâtiment de Club Space, à Park West, qui programme techno, house, tech house et des soirées plus expérimentales.",
      "en": "Mid-sized 555-capacity room on the ground floor of the Club Space building in Park West, programming techno, house, tech house and more experimental nights."
    }
  },
  {
    "id": "club-m2-miami",
    "nom": "Club M2",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami Beach (South Beach)",
      "en": "Miami Beach (South Beach)"
    },
    "latitude": 25.7837,
    "longitude": -80.1318,
    "capacite": 1000,
    "styles": [
      "Techno",
      "House",
      "Tech House",
      "Progressive House"
    ],
    "site": "https://www.m2miami.com",
    "description": {
      "fr": "Grand club de Washington Avenue à South Beach, conçu comme une méga-structure avec scène, plusieurs pistes et un système pensé pour la musique électronique, de la techno à la progressive.",
      "en": "Large club on Washington Avenue in South Beach, built as a mega-structure with a stage, several dance floors and a sound system designed for electronic music, from techno to progressive house."
    }
  },
  {
    "id": "domicile-miami",
    "nom": "Domicile",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Allapattah)",
      "en": "Miami (Allapattah)"
    },
    "latitude": 25.8039,
    "longitude": -80.2076,
    "capacite": 350,
    "styles": [
      "Techno",
      "Experimental",
      "Acid"
    ],
    "site": "https://ra.co/clubs/189088",
    "description": {
      "fr": "Espace d’Allapattah de 350 places au 2900 NW 7th Avenue, dont la programmation est presque entièrement techno, avec aussi des nuits expérimentales, acid et dub techno.",
      "en": "A 350-capacity space in Allapattah at 2900 NW 7th Avenue, with a program devoted almost entirely to techno, alongside experimental, acid and dub techno nights."
    }
  },
  {
    "id": "dantes-hifi-miami",
    "nom": "Dante’s HiFi",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Wynwood)",
      "en": "Miami (Wynwood)"
    },
    "latitude": 25.8011,
    "longitude": -80.2037,
    "capacite": 120,
    "styles": [
      "Disco",
      "House",
      "Deep House"
    ],
    "site": "https://danteshifi.com",
    "description": {
      "fr": "Bar d’écoute vinyle présenté par ses fondateurs comme le premier de Wynwood, au 519 NW 26th Street, avec un système hi-fi analogique et des DJ invités entre disco, house et deep house.",
      "en": "Vinyl listening bar billed by its founders as the first in Wynwood, at 519 NW 26th Street, with an analog hi-fi system and guest DJ sets of disco, house and deep house."
    }
  },
  {
    "id": "miami-sound-bar-miami",
    "nom": "Miami Sound Bar",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Downtown)",
      "en": "Miami (Downtown)"
    },
    "latitude": 25.7728,
    "longitude": -80.1901,
    "capacite": 100,
    "styles": [
      "House",
      "Disco",
      "Deep House"
    ],
    "site": "https://ra.co/clubs/206927",
    "description": {
      "fr": "Bar hi-fi de Downtown au 123 SE 2nd Avenue, qui associe cocktails, petite restauration et sélections de DJ house, disco et deep house plusieurs soirs par semaine.",
      "en": "Downtown hi-fi bar at 123 SE 2nd Avenue pairing cocktails and bar food with house, disco and deep house DJ selections several nights a week."
    }
  },
  {
    "id": "lions-den-miami",
    "nom": "Lion’s Den",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Little River)",
      "en": "Miami (Little River)"
    },
    "latitude": 25.8421,
    "longitude": -80.1992,
    "capacite": 150,
    "styles": [
      "House",
      "UK Garage",
      "Minimal"
    ],
    "site": "https://ra.co/clubs/283181",
    "description": {
      "fr": "Lounge vinyle d’environ 150 places à Little River, au-dessus du restaurant Fooq’s, inspiré des clubs new-yorkais du début des années 2000 et centré sur la house et le UK garage.",
      "en": "Vinyl lounge for about 150 people in Little River, above Fooq’s restaurant, inspired by early-2000s New York clubs and focused on house and UK garage."
    }
  },
  {
    "id": "edge-miami",
    "nom": "Edge Miami",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Edgewater)",
      "en": "Miami (Edgewater)"
    },
    "latitude": 25.796,
    "longitude": -80.1925,
    "capacite": 300,
    "styles": [
      "Tech House",
      "House",
      "Progressive House"
    ],
    "site": "https://ra.co/clubs/295903",
    "description": {
      "fr": "Club en plein air couvert d’Edgewater d’environ 300 places, installé derrière l’ancien Boho Edgewater sous une charpente de bois façon tiki, consacré à la tech house et à la house.",
      "en": "Covered open-air club in Edgewater for about 300 people, set behind the former Boho Edgewater under tiki-style wood beams, dedicated to tech house and house."
    }
  },
  {
    "id": "the-pickle-miami",
    "nom": "The Pickle",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (94th Aero Squadron)",
      "en": "Miami (94th Aero Squadron)"
    },
    "latitude": 25.785,
    "longitude": -80.2874,
    "capacite": 500,
    "styles": [
      "Techno",
      "House",
      "Electro"
    ],
    "site": "https://ra.co/clubs/299424",
    "description": {
      "fr": "Héritier de l’Electric Pickle, pilier underground de Miami depuis 2009, fondé par Will Renuart et Danny Daze et installé en plein air sur le site historique du 94th Aero Squadron.",
      "en": "Successor to Electric Pickle, a Miami underground cornerstone since 2009, founded by Will Renuart and Danny Daze and now set in an open-air space at the historic 94th Aero Squadron."
    }
  },
  {
    "id": "aire-miami",
    "nom": "AIRE Miami",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Edgewater)",
      "en": "Miami (Edgewater)"
    },
    "latitude": 25.7958,
    "longitude": -80.1924,
    "capacite": 150,
    "styles": [
      "House",
      "Deep House",
      "Afro House",
      "Progressive House"
    ],
    "site": "https://airemia.com",
    "description": {
      "fr": "Club et lounge à ciel ouvert d’Edgewater, ancien Boho Miami au 111 NE 20th Street, construit autour d’une house profonde et soulful, avec résidents et invités internationaux chaque semaine.",
      "en": "Open-air club and lounge in Edgewater, formerly Boho Miami, at 111 NE 20th Street, built around deep, soulful house with residents and international guests every week."
    }
  },
  {
    "id": "the-boombox-miami",
    "nom": "The Boombox",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Westchester)",
      "en": "Miami (Westchester)"
    },
    "latitude": 25.7285,
    "longitude": -80.3168,
    "capacite": 300,
    "styles": [
      "Techno",
      "Electro",
      "Hardcore",
      "Acid"
    ],
    "site": "https://ra.co/clubs/193257",
    "description": {
      "fr": "Lieu underground de Westchester, au 4447 SW 75th Avenue, tenu par et pour la scène locale, qui accueille des soirées techno, electro, hardcore et acid.",
      "en": "Underground venue in Westchester at 4447 SW 75th Avenue, run by and for locals, hosting techno, electro, hardcore and acid nights."
    }
  },
  {
    "id": "sable-miami",
    "nom": "Sable",
    "type": "club",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Wynwood)",
      "en": "Miami (Wynwood)"
    },
    "latitude": 25.7984,
    "longitude": -80.1988,
    "capacite": 80,
    "styles": [
      "House",
      "Deep House",
      "Afro House"
    ],
    "site": "https://www.sablemiami.com",
    "description": {
      "fr": "Lounge vinyle et café de quartier à Wynwood, au 2219 NW 2nd Avenue, avec un café jardin, qui organise régulièrement des soirées DJ house, deep house et afro house.",
      "en": "Neighborhood vinyl lounge and café in Wynwood at 2219 NW 2nd Avenue, with a garden café, regularly hosting house, deep house and afro house DJ nights."
    }
  },
  {
    "id": "ultra-music-festival-miami",
    "nom": "Ultra Music Festival",
    "type": "festival",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Bayfront Park)",
      "en": "Miami (Bayfront Park)"
    },
    "latitude": 25.7762,
    "longitude": -80.1861,
    "capacite": 55000,
    "annee": 1999,
    "mois": {
      "fr": "Mars",
      "en": "March"
    },
    "styles": [
      "EDM",
      "Techno",
      "House",
      "Trance"
    ],
    "site": "https://ultramusicfestival.com",
    "description": {
      "fr": "Festival fondé en 1999 et installé chaque mois de mars à Bayfront Park, au bord de la baie de Biscayne, pendant la Miami Music Week, avec des scènes EDM, techno, house et trance.",
      "en": "Festival founded in 1999 and held each March at Bayfront Park on Biscayne Bay during Miami Music Week, with dedicated stages for EDM, techno, house and trance."
    }
  },
  {
    "id": "iii-points-miami",
    "nom": "III Points",
    "type": "festival",
    "paysCode": "US",
    "villeSlug": "miami-us",
    "ville": {
      "fr": "Miami (Wynwood)",
      "en": "Miami (Wynwood)"
    },
    "latitude": 25.7981,
    "longitude": -80.2016,
    "capacite": 20000,
    "annee": 2013,
    "mois": {
      "fr": "Octobre",
      "en": "October"
    },
    "styles": [
      "Techno",
      "House",
      "Electronica",
      "Bass"
    ],
    "site": "https://www.iiipoints.com",
    "description": {
      "fr": "Festival de musique et d’arts créé en 2013, tenu à Mana Wynwood sur cinq pâtés de maisons, dont l’édition des 16 et 17 octobre 2026 a réuni 293 artistes sur 13 scènes.",
      "en": "Music and arts festival founded in 2013, held at Mana Wynwood across five city blocks, whose October 16 and 17, 2026 edition gathered 293 artists on 13 stages."
    }
  },
  {
    "id": "ilo-festival-mexique",
    "nom": "Iló Festival",
    "type": "festival",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Hidalgo (Mexique)",
      "en": "Hidalgo (Mexico)"
    },
    "latitude": 20.1011,
    "longitude": -98.7591,
    "capacite": 2500,
    "annee": 2022,
    "mois": {
      "fr": "Novembre",
      "en": "November"
    },
    "styles": [
      "Psytech",
      "Progressive House",
      "Techno",
      "Melodic Techno",
      "Psy"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Rassemblement psychédélique et électronique en pleine nature dans l’État d’Hidalgo au Mexique (« Where Dance Becomes Magic »), réunissant la scène mexicaine et internationale autour de la psytech, de la progressive et de la techno.",
      "en": "Open-air psychedelic and electronic gathering in Hidalgo, Mexico (‘Where Dance Becomes Magic’), uniting Mexican and international selectors around psytech, progressive and techno."
    }
  },
  {
    "id": "kupuri-festival-mexique",
    "nom": "Kupuri Festival",
    "type": "festival",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Morelos (Mexique)",
      "en": "Morelos (Mexico)"
    },
    "latitude": 18.8814,
    "longitude": -99.0622,
    "capacite": 3000,
    "annee": 2016,
    "mois": {
      "fr": "Décembre",
      "en": "December"
    },
    "styles": [
      "Psy",
      "Psytech",
      "Progressive Trance",
      "Techno",
      "Downtempo"
    ],
    "site": "https://www.instagram.com/kupurifestival",
    "description": {
      "fr": "Festival de musique électronique, d’art visionnaire et de culture alternative dans l’État de Morelos au sud de Mexico, célébrant la psytrance, la psytech, la techno progressive et les arts régénératifs.",
      "en": "Electronic music, visionary art and alternative culture festival in Morelos south of Mexico City, celebrating psytrance, psytech, progressive techno and regenerative arts."
    }
  },
  {
    "id": "hydrophonic-festival-usa",
    "nom": "Hydrophonic Festival",
    "type": "festival",
    "paysCode": "US",
    "ville": {
      "fr": "Aztec / Durango (Tico Time River Resort)",
      "en": "Aztec / Durango (Tico Time River Resort)"
    },
    "latitude": 36.9889,
    "longitude": -107.8614,
    "capacite": 2500,
    "annee": 2023,
    "mois": {
      "fr": "Été",
      "en": "Summer"
    },
    "styles": [
      "Bass",
      "Dubstep",
      "Leftfield",
      "Drum & Bass",
      "Downtempo"
    ],
    "site": "https://www.instagram.com/hydrophonicfest",
    "description": {
      "fr": "Festival immersif de bass music, d’installations artistiques, de mouvement et de performances au bord de la rivière Animas à Tico Time River Resort (co-présenté avec Unify Mountain Soundz).",
      "en": "Immersive bass music, art installation, yoga and performance festival along the Animas River at Tico Time River Resort, co-presented with Unify Mountain Soundz."
    }
  },
  {
    "id": "friendzy-fest-alberta",
    "nom": "Friendzy Fest",
    "type": "festival",
    "paysCode": "CA",
    "ville": {
      "fr": "Rangeton Park / Evansburg (Alberta)",
      "en": "Rangeton Park / Evansburg (Alberta)"
    },
    "latitude": 53.6812,
    "longitude": -115.0245,
    "capacite": 3500,
    "annee": 2020,
    "mois": {
      "fr": "Août",
      "en": "August"
    },
    "styles": [
      "Bass",
      "House",
      "Techno",
      "Drum & Bass",
      "Dubstep"
    ],
    "site": "https://www.friendzyfest.ca",
    "description": {
      "fr": "Festival de camping électronique au bord de la rivière Pembina à Rangeton Park en Alberta (« Where Friends Become Family »), réunissant scènes immersives bass, house, techno et drum & bass.",
      "en": "Riverside electronic camping festival at Rangeton Park along the Pembina River in Alberta (‘Where Friends Become Family’), uniting immersive bass, house, techno and drum & bass stages."
    }
  },
  {
    "id": "progressive-town-mexique",
    "nom": "Progressive Town",
    "type": "festival",
    "paysCode": "MX",
    "ville": {
      "fr": "Chilpancingo (Guerrero)",
      "en": "Chilpancingo (Guerrero)"
    },
    "latitude": 17.5515,
    "longitude": -99.5006,
    "capacite": 1200,
    "annee": 2023,
    "mois": {
      "fr": "Novembre",
      "en": "November"
    },
    "styles": [
      "Progressive Trance",
      "Psytech",
      "Progressive House",
      "Techno"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Rassemblement électronique à Chilpancingo (Guerrero) consacré à la progressive trance, à la psytech et aux sonorités underground du collectif Undergroove Music.",
      "en": "Electronic gathering in Chilpancingo (Guerrero) dedicated to progressive trance, psytech and underground sounds curated with Undergroove Music."
    }
  },
  {
    "id": "feeling-for-music-mexique",
    "nom": "The Feeling For Music",
    "type": "festival",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "État de Mexico (Edo Mex)",
      "en": "State of Mexico (Edo Mex)"
    },
    "latitude": 19.3582,
    "longitude": -99.6312,
    "capacite": 1500,
    "annee": 2021,
    "mois": {
      "fr": "Décembre",
      "en": "December"
    },
    "styles": [
      "Psytech",
      "Progressive House",
      "Techno",
      "Psy"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Événement en plein air dans l’État de Mexico célébrant la culture techno progressive, psytech et psychédélique de la vallée de Mexico.",
      "en": "Open-air gathering in the State of Mexico celebrating progressive techno, psytech and psychedelic electronic culture."
    }
  },
  {
    "id": "yambak-puerto-vallarta",
    "nom": "Yambak Puerto Vallarta",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Puerto Vallarta (Jalisco)",
      "en": "Puerto Vallarta (Jalisco)"
    },
    "latitude": 20.6122,
    "longitude": -105.2341,
    "capacite": 250,
    "annee": 2018,
    "styles": [
      "House",
      "Techno",
      "Psytech",
      "Minimal"
    ],
    "site": "https://www.instagram.com/yambakpv",
    "description": {
      "fr": "Club électronique de référence et brasserie artisanale sur le Malecón de Puerto Vallarta, bastion des nuits house, techno et psytech sur la côte pacifique mexicaine.",
      "en": "Flagship underground electronic club and craft brewery on Puerto Vallarta’s Malecón, a stronghold for house, techno and psytech nights on Mexico’s Pacific coast."
    }
  },
  {
    "id": "casa-calavera-tepoztlan",
    "nom": "Casa Calavera",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Tepoztlán (Morelos)",
      "en": "Tepoztlán (Morelos)"
    },
    "latitude": 18.9848,
    "longitude": -99.0931,
    "capacite": 250,
    "annee": 2021,
    "styles": [
      "Psytech",
      "Techno",
      "Progressive House",
      "Organic House"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Repaire électronique et culturel au pied des falaises mystiques de Tepoztlán au sud de Mexico, accueillant les showcases techno, psytech et progressive.",
      "en": "Electronic and cultural sanctuary beneath the mystic cliffs of Tepoztlán south of Mexico City, hosting techno, psytech and progressive showcases."
    }
  },
  {
    "id": "zicatela-rooftop-tuxtla",
    "nom": "Zicatela Rooftop",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Tuxtla Gutiérrez (Chiapas)",
      "en": "Tuxtla Gutiérrez (Chiapas)"
    },
    "latitude": 16.7538,
    "longitude": -93.1162,
    "capacite": 220,
    "annee": 2021,
    "styles": [
      "House",
      "Techno",
      "Psytech",
      "Indie Dance"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Toit-terrasse électronique de Tuxtla Gutiérrez au Chiapas, point de ralliement des tournées techno, house et psytech dans le sud du Mexique.",
      "en": "Electronic rooftop venue in Tuxtla Gutiérrez, Chiapas, a key stop for techno, house and psytech tours in southern Mexico."
    }
  },
  {
    "id": "cielo-verde-san-cristobal",
    "nom": "Cielo Verde",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "San Cristóbal de las Casas (Chiapas)",
      "en": "San Cristóbal de las Casas (Chiapas)"
    },
    "latitude": 16.7372,
    "longitude": -92.6376,
    "capacite": 200,
    "annee": 2020,
    "styles": [
      "Techno",
      "Psytech",
      "House",
      "Downtempo"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Espace nocturne dans les montagnes de San Cristóbal de las Casas au Chiapas, dédié aux sélections électroniques underground, psytech et house.",
      "en": "Mountain-town nightlife venue in San Cristóbal de las Casas, Chiapas, dedicated to underground electronic, psytech and house selections."
    }
  },
  {
    "id": "cc-wapani-san-cristobal",
    "nom": "CC Wapani",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "San Cristóbal de las Casas (Chiapas)",
      "en": "San Cristóbal de las Casas (Chiapas)"
    },
    "latitude": 16.7395,
    "longitude": -92.6412,
    "capacite": 180,
    "annee": 2019,
    "styles": [
      "Techno",
      "House",
      "Experimental",
      "Psytech"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Centre culturel et club indépendant de San Cristóbal de las Casas où se croisent DJ mexicains, collectifs audiovisuels et résidents internationaux.",
      "en": "Independent cultural center and club in San Cristóbal de las Casas bringing together Mexican DJs, audiovisual collectives and international guests."
    }
  },
  {
    "id": "obsidian-clandestino-puebla",
    "nom": "Obsidian Clandestino",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Puebla / Cholula",
      "en": "Puebla / Cholula"
    },
    "latitude": 19.0436,
    "longitude": -98.2019,
    "capacite": 220,
    "annee": 2022,
    "styles": [
      "Techno",
      "IDM",
      "Psytech",
      "Electro"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Club clandestin à Puebla consacré aux sonorités techno, IDM, psytech et aux showcases des labels indépendants mexicains.",
      "en": "Underground club space in Puebla dedicated to techno, IDM, psytech and Mexican independent label showcases."
    }
  },
  {
    "id": "rizonanza-mexico",
    "nom": "Rizonanza",
    "type": "club",
    "paysCode": "MX",
    "villeSlug": "mexico-mx",
    "ville": {
      "fr": "Mexico (CDMX)",
      "en": "Mexico City (CDMX)"
    },
    "latitude": 19.4194,
    "longitude": -99.1625,
    "capacite": 250,
    "annee": 2022,
    "styles": [
      "Psytech",
      "Techno",
      "Minimal",
      "Progressive House"
    ],
    "site": "https://undergroovemusic.com",
    "description": {
      "fr": "Collectif et espace nocturne de Mexico dédié aux fréquences hypnotiques, à la psytech, au minimal et à la techno underground.",
      "en": "Mexico City collective and nocturnal venue dedicated to hypnotic frequencies, psytech, minimal and underground techno."
    }
  },
  {
    "id": "butik-festival-slovenie",
    "nom": "Butik Festival",
    "type": "festival",
    "paysCode": "SI",
    "ville": {
      "fr": "Tolmin (Vallée de la Soča)",
      "en": "Tolmin (Soča Valley)"
    },
    "latitude": 46.1785,
    "longitude": 13.7312,
    "capacite": 3000,
    "annee": 2019,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "House",
      "Techno",
      "Electro",
      "Leftfield",
      "Breaks"
    ],
    "site": "https://butikfestival.com",
    "description": {
      "fr": "Rassemblement audiophile au confluent des rivières Soča et Tolminka au pied des Alpes juliennes, salué dans toute l’Europe pour sa sélection house, electro et techno.",
      "en": "Audiophile gathering at the confluence of the Soča and Tolminka rivers in the Julian Alps, acclaimed across Europe for its forward-thinking house, electro and techno curation."
    }
  },
  {
    "id": "upclose-festival-paysbas",
    "nom": "Awakenings Upclose",
    "type": "festival",
    "paysCode": "NL",
    "villeSlug": "amsterdam-nl",
    "ville": {
      "fr": "Spaarnwoude (Amsterdam)",
      "en": "Spaarnwoude (Amsterdam)"
    },
    "latitude": 52.4268,
    "longitude": 4.6912,
    "capacite": 15000,
    "annee": 2024,
    "mois": {
      "fr": "Mai",
      "en": "May"
    },
    "styles": [
      "Techno",
      "Hard Groove",
      "Minimal",
      "Acid Techno"
    ],
    "site": "https://www.awakenings.com",
    "description": {
      "fr": "Format intimiste d’Awakenings dans les bois de Spaarnwoude près d’Amsterdam, conçu pour rapprocher danseurs et artistes autour de la techno pure et du hard groove.",
      "en": "Intimate Awakenings format in the woods of Spaarnwoude near Amsterdam, designed to bring dancers and artists face-to-face around pure techno and hard groove."
    }
  },
  {
    "id": "stone-techno-essen",
    "nom": "The Third Room - Stone Techno Festival",
    "type": "festival",
    "paysCode": "DE",
    "ville": {
      "fr": "Essen (Zeche Zollverein)",
      "en": "Essen (Zeche Zollverein)"
    },
    "latitude": 51.4865,
    "longitude": 7.0448,
    "capacite": 12000,
    "annee": 2020,
    "mois": {
      "fr": "Juillet",
      "en": "July"
    },
    "styles": [
      "Techno",
      "Hard Groove",
      "Hypnotic Techno",
      "Electro"
    ],
    "site": "https://stonetechno.com",
    "description": {
      "fr": "Organisé en partenariat avec ARTE Concert au cœur du complexe minier classé à l’UNESCO Zeche Zollverein à Essen, vitrine mondiale du renouveau techno et hard groove.",
      "en": "Held in partnership with ARTE Concert inside the UNESCO-listed Zeche Zollverein coal mine complex in Essen, a global showcase for techno and hard groove."
    }
  },
  {
    "id": "virage-paris",
    "nom": "Virage",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (17e - Périphérique)",
      "en": "Paris (17th - Ring Road)"
    },
    "latitude": 48.8992,
    "longitude": 2.3158,
    "capacite": 1200,
    "annee": 2022,
    "styles": [
      "Techno",
      "House",
      "Trance",
      "Hard Groove"
    ],
    "site": "https://virage.paris",
    "description": {
      "fr": "Club à ciel ouvert logé sous le boulevard périphérique dans le nord du 17e arrondissement, animé par l’équipe de Bonjour/Bonsoir.",
      "en": "Open-air club tucked directly beneath the Paris ring road in the 17th arrondissement, run by the Bonjour/Bonsoir team."
    }
  },
  {
    "id": "nexus-paris",
    "nom": "Nexus",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Pantin (Grand Paris)",
      "en": "Pantin (Greater Paris)"
    },
    "latitude": 48.9032,
    "longitude": 2.4045,
    "capacite": 1500,
    "annee": 2021,
    "styles": [
      "Hard Techno",
      "Techno",
      "Rave",
      "Trance"
    ],
    "site": "https://www.nexus-club.fr",
    "description": {
      "fr": "Ancien entrepôt de Pantin équipé d’une cage visuelle à 360 degrés et d’un système L-Acoustics pour les grandes nuits techno et hard techno.",
      "en": "Former Pantin warehouse equipped with a 360-degree visual cage and L-Acoustics sound for major techno and hard techno nights."
    }
  },
  {
    "id": "la-gare-le-gore-paris",
    "nom": "La Gare / Le Gore",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "paris-fr",
    "ville": {
      "fr": "Paris (19e - Porte de la Villette)",
      "en": "Paris (19th - Porte de la Villette)"
    },
    "latitude": 48.8968,
    "longitude": 2.3842,
    "capacite": 300,
    "annee": 2019,
    "styles": [
      "Techno",
      "Acid",
      "Electro",
      "Experimental"
    ],
    "site": "https://lagare.paris",
    "description": {
      "fr": "Ancienne gare de la Petite Ceinture dans le 19e où le jazz acoustique en haut laisse place dès minuit au sous-sol techno brut Le Gore.",
      "en": "Former Petite Ceinture train station in the 19th where acoustic jazz upstairs gives way at midnight to the raw Le Gore techno cellar below."
    }
  },
  {
    "id": "connexions-live-toulouse",
    "nom": "Connexion Live",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "toulouse-fr",
    "ville": {
      "fr": "Toulouse (Jean-Jaurès)",
      "en": "Toulouse (Jean-Jaurès)"
    },
    "latitude": 43.6062,
    "longitude": 1.4512,
    "capacite": 400,
    "annee": 2010,
    "styles": [
      "Electro",
      "House",
      "Bass",
      "Indie Dance"
    ],
    "site": "https://www.connexionlive.fr",
    "description": {
      "fr": "Bar-club et salle de concert de la rue Gabriel-Péri au centre de Toulouse, tremplin incontournable des collectifs électroniques toulousains.",
      "en": "Bar-club and live venue on Rue Gabriel-Péri in central Toulouse, an essential springboard for local electronic collectives."
    }
  },
  {
    "id": "systeme-club-toulouse",
    "nom": "L’Usine à Musique",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "toulouse-fr",
    "ville": {
      "fr": "Toulouse (Sept Deniers)",
      "en": "Toulouse (Sept Deniers)"
    },
    "latitude": 43.6218,
    "longitude": 1.4042,
    "capacite": 500,
    "annee": 2016,
    "styles": [
      "Techno",
      "Psy",
      "Drum & Bass",
      "Hard Techno"
    ],
    "site": "https://www.lusineamusique.fr",
    "description": {
      "fr": "Complexe musical des Sept Deniers à Toulouse accueillant régulièrement les nuits rave, psytrance, drum & bass et hard techno.",
      "en": "Music complex in Toulouse’s Sept Deniers district regularly hosting rave, psytrance, drum & bass and hard techno nights."
    }
  },
  {
    "id": "nine-club-toulouse",
    "nom": "Nine Club",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "toulouse-fr",
    "ville": {
      "fr": "Toulouse (Sesquières)",
      "en": "Toulouse (Sesquières)"
    },
    "latitude": 43.6512,
    "longitude": 1.4185,
    "capacite": 900,
    "annee": 2015,
    "styles": [
      "House",
      "Tech House",
      "Melodic Techno",
      "Techno"
    ],
    "site": "https://ra.co",
    "description": {
      "fr": "Grand club du nord de Toulouse doté d’un vaste patio extérieur et d’une salle principale recevant les DJ internationaux house et techno.",
      "en": "Large club in northern Toulouse featuring a spacious outdoor patio and main room hosting international house and techno DJs."
    }
  },
  {
    "id": "kalinka-toulouse",
    "nom": "Poney Club Toulouse",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "toulouse-fr",
    "ville": {
      "fr": "Toulouse (Blagnac / Aéroport)",
      "en": "Toulouse (Blagnac / Airport)"
    },
    "latitude": 43.6285,
    "longitude": 1.3742,
    "capacite": 3500,
    "annee": 2020,
    "styles": [
      "House",
      "Tech House",
      "Melodic Techno",
      "Techno"
    ],
    "site": "https://poneyclubtoulouse.fr",
    "description": {
      "fr": "Grand open air estival au pied des pistes de Toulouse-Blagnac, accueillant tout l’été les têtes d’affiche mondiales de la house et de la techno.",
      "en": "Major summer open-air club beside the Toulouse-Blagnac runways, hosting global house and techno headliners all summer long."
    }
  },
  {
    "id": "groom-lyon",
    "nom": "Groom",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Pentes de la Croix-Rousse)",
      "en": "Lyon (Croix-Rousse)"
    },
    "latitude": 45.7685,
    "longitude": 4.8342,
    "capacite": 220,
    "annee": 2017,
    "styles": [
      "House",
      "Disco",
      "Indie Dance",
      "Leftfield"
    ],
    "site": "https://www.groomlyon.com",
    "description": {
      "fr": "Club et bar à cocktails de la rue Roger-Violi au pied des Pentes de la Croix-Rousse, repaire house, disco et indie dance de la scène locale.",
      "en": "Club and cocktail bar on Rue Roger-Violi at the foot of Croix-Rousse, a local stronghold for house, disco and indie dance."
    }
  },
  {
    "id": "peniche-louve-lyon",
    "nom": "La Marquise",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "lyon-fr",
    "ville": {
      "fr": "Lyon (Berges du Rhône)",
      "en": "Lyon (Rhône Banks)"
    },
    "latitude": 45.7538,
    "longitude": 4.8412,
    "capacite": 250,
    "annee": 2000,
    "styles": [
      "House",
      "Techno",
      "Drum & Bass",
      "Bass"
    ],
    "site": "https://www.marquise.net",
    "description": {
      "fr": "Péniche-club amarrée sur les berges du Rhône face à la Presqu’île, haut lieu des soirées électroniques, bass music et house lyonnaises.",
      "en": "Club barge moored on the banks of the Rhône facing the Presqu’île, a staple of Lyon’s electronic, bass music and house nights."
    }
  },
  {
    "id": "la-dame-du-mont-marseille",
    "nom": "La Dame du Mont",
    "type": "club",
    "paysCode": "FR",
    "villeSlug": "marseille-fr",
    "ville": {
      "fr": "Marseille (Notre-Dame-du-Mont)",
      "en": "Marseille (Notre-Dame-du-Mont)"
    },
    "latitude": 43.2925,
    "longitude": 5.3822,
    "capacite": 200,
    "annee": 2012,
    "styles": [
      "House",
      "Disco",
      "Electro",
      "Indie Dance"
    ],
    "site": "https://www.instagram.com/ladamedumont",
    "description": {
      "fr": "Bar musical emblématique de la place Notre-Dame-du-Mont près du Cours Julien, point de départ des nuits house, disco et électroniques marseillaises.",
      "en": "Iconic music bar on Place Notre-Dame-du-Mont near Cours Julien, the starting point for Marseille’s house, disco and electronic nights."
    }
  },
  {
    "id": "la-cabane-bruxelles",
    "nom": "La Cabane",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Watermael-Boitsfort)",
      "en": "Brussels (Watermael-Boitsfort)"
    },
    "latitude": 50.7852,
    "longitude": 4.4012,
    "capacite": 450,
    "annee": 2016,
    "styles": [
      "House",
      "Minimal",
      "Disco",
      "Deep House"
    ],
    "site": "https://lacabane.club",
    "description": {
      "fr": "Refuge club à la lisière de la forêt de Soignes au sud de Bruxelles, prisé pour sa sélection house, minimal, micro-house et disco.",
      "en": "Club sanctuary on the edge of the Sonian Forest in southern Brussels, prized for its house, minimal, microhouse and disco curation."
    }
  },
  {
    "id": "bonnefooi-bruxelles",
    "nom": "Bonnefooi",
    "type": "club",
    "paysCode": "BE",
    "villeSlug": "bruxelles-be",
    "ville": {
      "fr": "Bruxelles (Centre)",
      "en": "Brussels (Center)"
    },
    "latitude": 50.8462,
    "longitude": 4.3495,
    "capacite": 200,
    "annee": 2014,
    "styles": [
      "House",
      "Leftfield",
      "Disco",
      "Electro"
    ],
    "site": "https://www.bonnefooi.be",
    "description": {
      "fr": "Bar musical de la rue des Pierres ouvert jusqu’à l’aube au centre de Bruxelles, véritable carrefour des DJ de Kiosk Radio et de la scène locale.",
      "en": "Music bar on Rue des Pierres open until dawn in central Brussels, a vital crossroads for Kiosk Radio selectors and the local club scene."
    }
  },
];
