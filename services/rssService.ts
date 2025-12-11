import { Article, FeedSource, RSS2JSONResponse } from '../types';
import { FALLBACK_IMAGES } from '../constants';

const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

// 1. GLOBAL EXCLUSIONS
// Keywords to exclude from ALL feeds (guitars, stage lighting, etc.)
const EXCLUDED_KEYWORDS = [
  // --- GUITAR NUCLEAR BAN LIST ---
  // Brands & Models
  'guitar', 'guitare', 'fender', 'gibson', 'stratocaster', 'telecaster', 'strat', 'tele',
  'les paul', 'epiphone', 'squier', 'ibanez', 'marshall', 'gretsch', 'prs', 'jackson',
  'harley benton', 'st-modern', 'st modern', 'jazzmaster', 'jaguar', 'mustang', 
  'revstar', 'pacifica', 'cort', 'esp ltd', 'schecter', 'godin', 'rickenbacker',
  'charvel', 'kramer', 'danelectro', 'yamaha pacifica', 'taylor', 'martin',
  
  // Body Types & Features
  'solid body', 'solid-body', 'hollow body', 'hollow-body', 'semi-hollow', 
  'single cut', 'single-cut', 'double cut', 'double-cut', 'offset body',
  'thinline', 'archtop', 'dreadnought', 'parlor', 'jumbo',

  // Components & Luthier Terms
  'fret', 'frettes', 'frette', 'fretboard', 'touche érable', 'touche palissandre', 
  'neck profile', 'manche collé', 'manche vissé', 'roasted maple', 'rosewood', 
  'pickups', 'pickup', 'micro guitare', 'micros', 'humbucker', 'single coil', 'p90', 
  'single-coil', 'soapbar', 'bridge', 'chevalet', 'sillet', 'nut', 'headstock',
  'tuning pegs', 'mécaniques', 'pickguard', 'truss rod',

  // Hardware & Accessories
  'pedalboard', 'stompbox', 'guitar pedal', 'pédale guitare', 'overdrive', 'distortion', 
  'fuzz', 'wah wah', 'capo', 'plectrum', 'mediator', 'guitar strap', 'sangle guitare',
  'guitar amp', 'ampli guitare', 'combo amp', 'stack amp', 'cabinet', 'baffle',
  'whammy bar', 'vibrato', 'tremolo arm', 'floyd rose',

  // --- BASS GUITARS (Separate to avoid banning "Bass Music") ---
  'basse électrique', 'electric bass', 'jazz bass', 'precision bass', 'p-bass', 'j-bass',
  'basse active', 'basse passive', 'ampli basse', 'bass amp', 'bass guitar', 
  'short scale', 'long scale',

  // --- DRUMS & ACOUSTIC ---
  'drum kit', 'batterie acoustique', 'cymbals', 'cymbale', 'snare drum', 'caisse claire',
  'hi-hat', 'zildjian', 'sabian', 'paiste', 'vic firth', 'tama', 'pearl drums',
  'dw drums', 'ludwig', 'sonor', 'acoustic drum', 'baguette', 'drumsticks',

  // --- WIND, BRASS & ORCHESTRAL ---
  'saxophone', 'sax', 'trumpet', 'trompette', 'clarinet', 'clarinette', 
  'flute', 'flûte', 'violin', 'violon', 'cello', 'violoncelle', 'orchestra',
  'trombone', 'tuba', 'ukulele', 'banjo', 'mandolin', 'harmonica', 'accordéon',
  'accordion', 'grand piano', 'piano à queue', 'piano droit'
];

// 2. BANDCAMP SPECIFIC INCLUSIONS
const BANDCAMP_ELECTRO_KEYWORDS = [
  'electronic', 'synth', 'techno', 'house', 'ambient', 'drone', 'experimental',
  'club', 'dance', 'beat', 'modular', 'eurorack', 'idm', 'jungle', 'drum and bass',
  'dubstep', 'garage', 'electro', 'lo-fi', 'vaporwave', 'techno', 'trance', 'breakbeat'
];

/**
 * Robustly extracts an image URL from an RSS item.
 * Checks Enclosure -> Description -> Content.
 */
const extractImage = (item: any, fallbackIndex: number): string => {
  // 1. Try RSS Enclosure (often the highest quality)
  if (item.enclosure && item.enclosure.link && (item.enclosure.type?.startsWith('image/') || item.enclosure.link.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
    return item.enclosure.link;
  }

  // 2. Try the 'thumbnail' field from rss2json (sometimes populated)
  if (item.thumbnail && item.thumbnail.length > 0) {
    return item.thumbnail;
  }

  // 3. Regex for HTML content (Content or Description)
  // Handles <img src="...">, <img src='...'>, and attributes before src
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;

  // Check description first (often summary with image)
  if (item.description) {
    const match = item.description.match(imgRegex);
    if (match && match[1]) return match[1];
  }

  // Check full content
  if (item.content) {
    const match = item.content.match(imgRegex);
    if (match && match[1]) return match[1];
  }

  // 4. Deterministic Fallback
  return FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length];
};

export const fetchFeedArticles = async (source: FeedSource): Promise<Article[]> => {
  try {
    const response = await fetch(`${RSS_TO_JSON_API}${encodeURIComponent(source.rssUrl)}`);
    const data: RSS2JSONResponse = await response.json();

    if (data.status !== 'ok') {
      console.warn(`Failed to fetch RSS for ${source.name}`);
      return [];
    }

    return data.items.map((item, index) => {
      // Improved Image Extraction
      let imageUrl = extractImage(item, item.title.length + index);

      // Special handling for YouTube images to get higher quality
      if (source.isVideoSource && imageUrl.includes('hqdefault')) {
          imageUrl = imageUrl.replace('hqdefault', 'mqdefault'); 
      }

      // Clean HTML tags from description
      const tempDiv = document.createElement('div');
      // Some feeds put summary in description, others in content. Prefer description for snippet.
      tempDiv.innerHTML = item.description || item.content; 
      const cleanDescription = tempDiv.textContent || tempDiv.innerText || "";
      
      const maxLength = source.isVideoSource ? 100 : 150;
      const truncatedDesc = cleanDescription.length > maxLength 
        ? cleanDescription.substring(0, maxLength) + "..." 
        : cleanDescription;

      return {
        id: item.guid || item.link,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: truncatedDesc,
        thumbnail: imageUrl,
        sourceTitle: source.name,
        sourceIcon: data.feed.image,
        categories: item.categories || [],
        isVideo: source.isVideoSource
      };
    });
  } catch (error) {
    console.error(`Error fetching feed ${source.name}:`, error);
    return [];
  }
};

// Helper function to shuffle array (Fisher-Yates)
const shuffleArray = (array: Article[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const fetchAllFeeds = async (sources: FeedSource[]): Promise<Article[]> => {
  const activeSources = sources.filter(s => s.isActive);
  const promises = activeSources.map(source => fetchFeedArticles(source));
  const results = await Promise.all(promises);
  
  let pool: Article[] = [];

  // 1. Process each feed individually first
  results.forEach((feedArticles, index) => {
    const source = activeSources[index];
    let filteredFeed = feedArticles;

    // Special filtering for Bandcamp: Must contain electronic keywords
    if (source.id === 'bandcamp-daily') {
        filteredFeed = filteredFeed.filter(article => {
            const content = (article.title + ' ' + article.categories.join(' ') + ' ' + article.contentSnippet).toLowerCase();
            return BANDCAMP_ELECTRO_KEYWORDS.some(k => content.includes(k));
        });
    }

    // Sort by date to get the absolute latest from this specific source
    const sortedFeed = filteredFeed.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    // Limits: Video (2), Standard (5)
    const limit = source.isVideoSource ? 2 : 5;
    const topItems = sortedFeed.slice(0, limit);
    
    pool.push(...topItems);
  });

  // 2. Global Filter: Exclude keywords (Nuclear Guitar Option)
  pool = pool.filter(article => {
    // Check title, categories, AND snippet for forbidden words
    const text = (article.title + ' ' + article.categories.join(' ') + ' ' + article.contentSnippet).toLowerCase();
    
    const hasExcludedKeyword = EXCLUDED_KEYWORDS.some(k => text.includes(k));
    
    // Safety check: sometimes "Bass" is music, not instrument. 
    // If it says "Bass Music", "Drum and Bass", "Future Bass", allow it even if "Bass" is in exclusion list (though "bass guitar" is the specific exclusion now).
    // The exclusion list is now specific enough ('bass guitar', 'electric bass') that this collision is unlikely, 
    // but we double check against "Synthesizer" context if needed.
    
    return !hasExcludedKeyword;
  });

  // 3. Shuffle the final pool
  return shuffleArray(pool);
};