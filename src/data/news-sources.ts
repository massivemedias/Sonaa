/* LES SOURCES DE L'ONGLET NEWS, partagees entre la moisson (scripts) et la
   page (src) : une seule liste, lue des deux cotes. La page en fait des
   cases ; la moisson lit les flux de celles qui en ont un. */

export type Categorie = 'production' | 'djing' | 'scene';

export interface Source {
  readonly id: string;
  readonly nom: string;
  readonly site: string;
  /** Nul quand le site n'offre plus de flux lisible (mesure le 7 septembre
      2026, en tete de chaque ligne) : il garde sa case, sans articles. */
  readonly flux: string | null;
  readonly categorie: Categorie;
  /** Un mot sur ce qu'on y trouve, pour la case de la page. */
  readonly quoi: string;
  readonly langue: 'en' | 'fr';
}

/* ═══ LES SOURCES ═══
 *
 * Choisies pour ce que Mika a demande le 7 septembre 2026 : « les news
 * techno ... surtout pour la composition musicale, le monde du djing ».
 * Trois rayons : PRODUCTION (composer, les machines, les logiciels), DJING
 * (le metier, le materiel, les charts), SCENE (les artistes, les sorties,
 * les clubs). Les flux sont ceux que les sites annoncent ; ceux qui ne
 * repondent plus sont signales a la moisson, pas caches. */
export const SOURCES: readonly Source[] = [
  { id: 'attack', nom: 'Attack Magazine', site: 'https://www.attackmagazine.com/', flux: 'https://www.attackmagazine.com/feed/', categorie: 'production', quoi: 'Techniques de production, tutoriels, critiques de matériel', langue: 'en' },
  { id: 'musicradar', nom: 'MusicRadar', site: 'https://www.musicradar.com/', flux: 'https://www.musicradar.com/rss', categorie: 'production', quoi: 'Computer Music, Future Music : instruments, logiciels, tutoriels', langue: 'en' },
  { id: 'musictech', nom: 'MusicTech', site: 'https://musictech.com/', flux: 'https://musictech.com/feed/', categorie: 'production', quoi: 'Actualité des studios, tests, interviews de producteurs', langue: 'en' },
  { id: 'cdm', nom: 'Create Digital Music', site: 'https://cdm.link/', flux: 'https://cdm.link/feed/', categorie: 'production', quoi: 'Machines, logiciels, culture de la musique électronique', langue: 'en' },
  { id: 'bpb', nom: 'Bedroom Producers Blog', site: 'https://bedroomproducersblog.com/', flux: 'https://bedroomproducersblog.com/feed/', categorie: 'production', quoi: 'Plugins et samples gratuits, offres, nouveautés', langue: 'en' },
  { id: 'synthtopia', nom: 'Synthtopia', site: 'https://www.synthtopia.com/', flux: 'https://www.synthtopia.com/feed/', categorie: 'production', quoi: 'Synthétiseurs, modulaire, nouveautés matérielles', langue: 'en' },
  { id: 'gearnews', nom: 'Gearnews', site: 'https://www.gearnews.com/', flux: 'https://www.gearnews.com/feed/', categorie: 'production', quoi: 'Le matériel qui sort, semaine après semaine', langue: 'en' },
  { id: 'sos', nom: 'Sound On Sound', site: 'https://www.soundonsound.com/', flux: null /* 410 sur /rss, HTML sur /news/rss.xml */, categorie: 'production', quoi: 'La référence du studio : techniques, tests, mixage', langue: 'en' },
  { id: 'ableton', nom: 'Ableton', site: 'https://www.ableton.com/en/blog/', flux: 'https://www.ableton.com/en/blog/feeds/latest/', categorie: 'production', quoi: 'Le blog d’Ableton : artistes, méthodes, Live et Push', langue: 'en' },
  { id: 'ni', nom: 'Native Instruments', site: 'https://blog.native-instruments.com/', flux: 'https://blog.native-instruments.com/feed/', categorie: 'production', quoi: 'Le blog de NI : production, sound design, Traktor', langue: 'en' },
  { id: 'kvr', nom: 'KVR Audio', site: 'https://www.kvraudio.com/', flux: null /* 404 et 403 sur toutes les adresses connues */, categorie: 'production', quoi: 'Chaque plugin qui sort, chaque mise à jour', langue: 'en' },

  { id: 'djtechtools', nom: 'DJ TechTools', site: 'https://djtechtools.com/', flux: 'https://djtechtools.com/feed/', categorie: 'djing', quoi: 'Techniques de DJ, contrôleurs, mappings', langue: 'en' },
  { id: 'djmag', nom: 'DJ Mag', site: 'https://djmag.com/', flux: 'https://djmag.com/rss.xml', categorie: 'djing', quoi: 'Le magazine des DJs : actualité, classements, tests', langue: 'en' },
  { id: 'beatportal', nom: 'Beatportal', site: 'https://www.beatportal.com/', flux: null /* /feed rend la page HTML */, categorie: 'djing', quoi: 'Beatport : charts, sorties, interviews', langue: 'en' },
  { id: 'digitaldjtips', nom: 'Digital DJ Tips', site: 'https://www.digitaldjtips.com/', flux: 'https://www.digitaldjtips.com/feed/', categorie: 'djing', quoi: 'Apprendre à mixer, choisir son matériel', langue: 'en' },

  { id: 'ra', nom: 'Resident Advisor', site: 'https://ra.co/news', flux: null /* RA n'a plus de flux public */, categorie: 'scene', quoi: 'La scène mondiale : clubs, sorties, festivals', langue: 'en' },
  { id: 'mixmag', nom: 'Mixmag', site: 'https://mixmag.net/', flux: 'https://mixmag.net/rss.xml', categorie: 'scene', quoi: 'Actualité de la scène club et des artistes', langue: 'en' },
  { id: 'xlr8r', nom: 'XLR8R', site: 'https://xlr8r.com/', flux: 'https://xlr8r.com/feed/', categorie: 'scene', quoi: 'Sorties, podcasts, la scène underground', langue: 'en' },
  { id: 'electronicbeats', nom: 'Electronic Beats', site: 'https://www.electronicbeats.net/', flux: null /* 404, et ?feed=rss2 rend du HTML */, categorie: 'scene', quoi: 'Culture électronique, portraits, Berlin et au-delà', langue: 'en' },
  { id: 'trax', nom: 'Trax Magazine', site: 'https://www.traxmag.com/', flux: null /* 404, et ?feed=rss2 rend du HTML */, categorie: 'scene', quoi: 'La scène électronique en français', langue: 'fr' },
  { id: 'tsugi', nom: 'Tsugi', site: 'https://www.tsugi.fr/', flux: 'https://www.tsugi.fr/feed/', categorie: 'scene', quoi: 'Musiques électroniques et cultures club, en français', langue: 'fr' },
];

