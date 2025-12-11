import { FeedSource } from './types';

// Default feeds based on user preferences
export const DEFAULT_FEEDS: FeedSource[] = [
  // --- CULTURE & SCENE (New) ---
  {
    id: 'resident-advisor',
    name: 'Resident Advisor',
    url: 'https://fr.ra.co/',
    rssUrl: 'https://ra.co/xml/news.xml',
    isActive: true,
  },
  {
    id: 'mixmag',
    name: 'Mixmag',
    url: 'https://mixmag.net/',
    rssUrl: 'https://mixmag.net/rss',
    isActive: true,
  },
  {
    id: 'xlr8r',
    name: 'XLR8R',
    url: 'https://xlr8r.com/',
    rssUrl: 'https://xlr8r.com/feed/',
    isActive: true,
  },
  {
    id: 'guettapen',
    name: 'Guettapen',
    url: 'https://www.guettapen.com/',
    rssUrl: 'https://www.guettapen.com/feed/',
    isActive: true,
  },
  {
    id: 'tsugi',
    name: 'Tsugi',
    url: 'https://www.tsugi.fr/',
    rssUrl: 'https://www.tsugi.fr/feed/',
    isActive: true,
  },
  {
    id: 'electro-news',
    name: 'Electro News',
    url: 'https://electro-news.eu/',
    rssUrl: 'https://electro-news.eu/feed/',
    isActive: true,
  },
  {
    id: 'trax-mag',
    name: 'Trax Magazine',
    url: 'https://www.traxmag.com/',
    rssUrl: 'https://www.traxmag.com/feed/',
    isActive: true,
  },
  {
    id: 'bandcamp-daily',
    name: 'Bandcamp Daily',
    url: 'https://daily.bandcamp.com/',
    rssUrl: 'https://daily.bandcamp.com/feed',
    isActive: true,
  },

  // --- TECH & PRODUCTION ---
  {
    id: 'attack-mag',
    name: 'Attack Magazine',
    url: 'https://www.attackmagazine.com/',
    rssUrl: 'https://www.attackmagazine.com/feed/',
    isActive: true,
  },
  {
    id: 'midnight-rebels',
    name: 'Midnight Rebels',
    url: 'https://midnightrebels.com/',
    rssUrl: 'https://midnightrebels.com/feed/',
    isActive: true,
  },
  {
    id: 'gearnews',
    name: 'Gearnews',
    url: 'https://www.gearnews.com/',
    rssUrl: 'https://www.gearnews.com/feed/',
    isActive: true,
  },
  {
    id: 'subvert',
    name: 'Subvert',
    url: 'https://subvert.fm/',
    rssUrl: 'https://subvert.fm/feed/',
    isActive: true,
  },
  {
    id: 'cdm',
    name: 'CDM',
    url: 'https://cdm.link/',
    rssUrl: 'https://cdm.link/feed/',
    isActive: true,
  },
  {
    id: 'audiofanzine',
    name: 'Audiofanzine',
    url: 'https://fr.audiofanzine.com/',
    rssUrl: 'https://fr.audiofanzine.com/news/a.rss.xml',
    isActive: true,
  },
  {
    id: 'les-sondiers',
    name: 'Les Sondiers',
    url: 'https://lessondiers.com/',
    rssUrl: 'https://lessondiers.com/feed/',
    isActive: true,
  },
  {
    id: 'kr-homestudio',
    name: 'KR Home Studio',
    url: 'https://www.kr-homestudio.fr/',
    rssUrl: 'https://www.kr-homestudio.fr/feed/',
    isActive: true,
  },
  {
    id: 'kvraudio',
    name: 'KVR Audio',
    url: 'https://www.kvraudio.com/',
    rssUrl: 'https://www.kvraudio.com/news/rss',
    isActive: true,
  },
  {
    id: 'soundonsound',
    name: 'Sound On Sound',
    url: 'https://www.soundonsound.com/',
    rssUrl: 'https://www.soundonsound.com/news/rss',
    isActive: true,
  },
  {
    id: 'gearspace',
    name: 'Gearspace',
    url: 'https://gearspace.com/',
    rssUrl: 'https://gearspace.com/articles/feed/',
    isActive: true,
  },
  {
    id: 'musicradar',
    name: 'MusicRadar',
    url: 'https://www.musicradar.com/',
    rssUrl: 'https://www.musicradar.com/feeds/all',
    isActive: true,
  },
  {
    id: 'bedroom-producers-blog',
    name: 'Bedroom Producers Blog',
    url: 'https://bedroomproducersblog.com/',
    rssUrl: 'https://bedroomproducersblog.com/feed/',
    isActive: true,
  },
  {
    id: 'plugin-boutique',
    name: 'Plugin Boutique',
    url: 'https://www.pluginboutique.com/',
    rssUrl: 'https://www.pluginboutique.com/articles.rss',
    isActive: true,
  },
  {
    id: 'synth-anatomy',
    name: 'Synth Anatomy',
    url: 'https://synthanatomy.com/',
    rssUrl: 'https://synthanatomy.com/feed/',
    isActive: true,
  },

  // --- TECH NEWS ---
  {
    id: 'frandroid',
    name: 'Frandroid',
    url: 'https://www.frandroid.com/',
    rssUrl: 'https://www.frandroid.com/feed',
    isActive: true,
  },
  {
    id: 'tomsguide',
    name: "Tom's Guide",
    url: 'https://www.tomsguide.com/',
    rssUrl: 'https://www.tomsguide.com/feeds/all',
    isActive: true,
  },
  {
    id: 'iphon',
    name: 'iPhon.fr',
    url: 'https://www.iphon.fr/',
    rssUrl: 'https://www.iphon.fr/feed',
    isActive: true,
  },
  {
    id: 'jeuxvideo',
    name: 'JeuxVideo.com',
    url: 'https://www.jeuxvideo.com/',
    rssUrl: 'https://www.jeuxvideo.com/rss/rss.xml',
    isActive: true,
  },
  {
    id: 'theverge',
    name: 'The Verge',
    url: 'https://www.theverge.com/',
    rssUrl: 'https://www.theverge.com/rss/index.xml',
    isActive: true,
  },
  {
    id: 'petapixel',
    name: 'PetaPixel',
    url: 'https://petapixel.com/',
    rssUrl: 'https://petapixel.com/feed/',
    isActive: true,
  },
  {
    id: 'korben',
    name: 'Korben',
    url: 'https://korben.info/',
    rssUrl: 'https://korben.info/feed',
    isActive: true,
  },
  {
    id: 'clubic',
    name: 'Clubic',
    url: 'https://www.clubic.com/',
    rssUrl: 'https://www.clubic.com/feed/news.rss',
    isActive: true,
  },
  {
    id: 'synthtopia',
    name: 'Synthtopia',
    url: 'https://www.synthtopia.com/',
    rssUrl: 'https://www.synthtopia.com/feed/',
    isActive: true,
  },
  {
    id: 'lesnumeriques',
    name: 'Les Numériques',
    url: 'https://www.lesnumeriques.com/',
    rssUrl: 'https://www.lesnumeriques.com/rss.xml',
    isActive: true,
  },
  {
    id: 'engadget',
    name: 'Engadget',
    url: 'https://www.engadget.com/',
    rssUrl: 'https://www.engadget.com/rss.xml',
    isActive: true,
  },
  {
    id: '9to5google',
    name: '9to5Google',
    url: 'https://9to5google.com/',
    rssUrl: 'https://9to5google.com/feed/',
    isActive: true,
  },
  {
    id: 'musictech',
    name: 'MusicTech',
    url: 'https://musictech.com/',
    rssUrl: 'https://musictech.com/feed/',
    isActive: true,
  },

  // --- YOUTUBE CHANNELS (Video) ---
  {
    id: 'andrew-huang',
    name: 'Andrew Huang',
    url: 'https://www.youtube.com/user/songstowearpantsto',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWD5sObqPThm2hU6iF27E9Q',
    isActive: true,
    isVideoSource: true
  },
  {
    id: 'loopop',
    name: 'Loopop',
    url: 'https://www.youtube.com/channel/UC4K6tc2C0hauYw5SoXNtkbA',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4K6tc2C0hauYw5SoXNtkbA',
    isActive: true,
    isVideoSource: true
  },
  {
    id: 'sonic-academy',
    name: 'Sonic Academy',
    url: 'https://www.youtube.com/user/SonicAcademy',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC7RTAQ-i2AnN5X3n65uJ_qQ',
    isActive: true,
    isVideoSource: true
  },
  {
    id: 'benn-jordan',
    name: 'Benn Jordan',
    url: 'https://www.youtube.com/@BennJordan',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCshObcm-nLhbu8fv58OGB4g',
    isActive: true,
    isVideoSource: true
  },
  {
    id: 'red-means-recording',
    name: 'Red Means Recording',
    url: 'https://www.youtube.com/@RedMeansRecording',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UChnxLLvXd6l95keFLXxoTEg',
    isActive: true,
    isVideoSource: true
  },
  {
    id: 'starsky-carr',
    name: 'Starsky Carr',
    url: 'https://www.youtube.com/@StarskyCarr',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCF_aL5g0e_rK9rJdG-1Y4tA',
    isActive: true,
    isVideoSource: true
  },
  {
    id: 'tonepusher',
    name: 'Tonepusher',
    url: 'https://www.youtube.com/@Tonepusher',
    rssUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC_8w9XzM_3yR2XzF9qZ2zHg',
    isActive: true,
    isVideoSource: true
  }
];

// Expanded pool of images for when RSS doesn't provide one.
export const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=800&auto=format&fit=crop', // Abstract lights
  'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?q=80&w=800&auto=format&fit=crop', // Modular synth
  'https://images.unsplash.com/photo-1519683109079-d5f539e1d42a?q=80&w=800&auto=format&fit=crop', // Dark club
  'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=800&auto=format&fit=crop', // DJ controller
  'https://images.unsplash.com/photo-1621360841012-3f6208642232?q=80&w=800&auto=format&fit=crop', // Synth keys
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=800&auto=format&fit=crop', // Studio speakers
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop', // Club crowd
  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop', // Waveform
  'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop', // Eurorack close up
  'https://images.unsplash.com/photo-1563330232-5711c0c6204c?q=80&w=800&auto=format&fit=crop', // Vinyl record
  'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?q=80&w=800&auto=format&fit=crop', // Studio desk
  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop', // Surfer/waves abstract
  'https://images.unsplash.com/photo-1629821422712-4299b9087590?q=80&w=800&auto=format&fit=crop', // Patch cables
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop', // Retro computer
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop', // Cyberpunk city
  'https://images.unsplash.com/photo-1647427060118-4911c9821b82?q=80&w=800&auto=format&fit=crop', // Mixing console
  'https://images.unsplash.com/photo-1482442120256-9c03866de390?q=80&w=800&auto=format&fit=crop', // Dark guitar aesthetic
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=800&auto=format&fit=crop', // Music studio night
  'https://images.unsplash.com/photo-1460039230329-eb070fc6c77c?q=80&w=800&auto=format&fit=crop', // Abstract sound waves
  'https://images.unsplash.com/photo-1525926477800-7a3be5fa6cc8?q=80&w=800&auto=format&fit=crop', // Neon lights
];