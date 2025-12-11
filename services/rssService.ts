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

  // --- BASS GUITARS ---
  'basse électrique', 'electric bass', 'jazz bass', 'precision bass', 'p-bass', 'j-bass',
  'basse active', 'basse passive', 'ampli basse', 'bass amp', 'bass guitar', 
  'short scale', 'long scale',

  // --- DRUMS & ACOUSTIC ---
  'drum kit', 'batterie acoustique', 'cymbals', 'cymbale', 'snare drum', 'caisse claire',
  'hi-hat', 'zildjian', 'sabian', 'paiste', 'vic firth', 'tama', 'pearl drums',
  'dw drums', 'ludwig', 'sonor', 'acoustic drum', 'baguette', 'drumsticks',

  // --- STAGE LIGHTING & DMX (LIGHT BAN LIST) ---
  'lighting', 'éclairage', 'projecteur', 'fresnel', 'moving head', 'lyre', 
  'spot led', 'wash led', 'beam', 'dmx', 'stroboscope', 'strobe', 'machine à fumée',
  'fog machine', 'hazer', 'brouillard', 'laser world', 'laserworld', 'lasers',
  'par can', 'par led', 'blinder', 'dimmer', 'gradateur', 'truss', 'structure alu',
  'robe lighting', 'chauvet', 'adj', 'cameo', 'varytec', 'showtec', 'elation', 
  'clay paky', 'martin lighting', 'ma lighting', 'grandma', 'chamsys', 'obsidian',
  'scène', 'stage tech', 'rigging',

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
 * Generate a hash code from a string (Improved for better distribution)
 */
const hashCode = (str: string) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Helper to ensure HTTPS to avoid Mixed Content errors
 */
const ensureHttps = (url: string): string => {
  if (url.startsWith('http:')) {
    return url.replace('http:', 'https:');
  }
  return url;
};

/**
 * Extract ALL candidate images from an item
 */
const getCandidateImages = (item: any): string[] => {
    const candidates: string[] = [];

    // 1. Enclosure
    if (item.enclosure && item.enclosure.link) {
        const type = item.enclosure.type || '';
        if (type.startsWith('image') || item.enclosure.link.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
             candidates.push(item.enclosure.link);
        }
    }

    // 2. Thumbnail
    if (item.thumbnail && item.thumbnail.length > 5) {
        candidates.push(item.thumbnail);
    }

    // 3. HTML Content
    const htmlSources = [item.description, item.content];
    const imgRegex = /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["']/gi;
    
    htmlSources.forEach(html => {
        if (!html) return;
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
            if (match[1]) candidates.push(match[1]);
        }
    });

    return candidates;
};

const BAD_PATTERNS = [
    'feeds.feedburner.com', '~r/', 
    'doubleclick.net', 'gravatar.com', 'emoji', 'facebook.com/tr',
    'pixel', 'blank.gif', 'spacer.gif', '1x1',
    'share-icon', 'button', 'avatar', 'logo', 'icon', 'author',
    'googleusercontent', 'feed-icon', 'icon-'
];

/**
 * Validates a single URL against basic rules
 */
const isValidImageUrl = (url: string, feedImage: string | undefined): boolean => {
    if (!url || url.length < 20) return false;
    const lowerUrl = url.toLowerCase();
    
    // Check bad patterns
    if (BAD_PATTERNS.some(pattern => lowerUrl.includes(pattern))) return false;

    // Check feed image match
    if (feedImage && url === feedImage) return false;
    const cleanFeedImage = feedImage ? feedImage.split('?')[0].toLowerCase() : '';
    if (cleanFeedImage && lowerUrl.includes(cleanFeedImage)) return false;

    return true;
};

export const fetchFeedArticles = async (source: FeedSource): Promise<Article[]> => {
  try {
    const response = await fetch(`${RSS_TO_JSON_API}${encodeURIComponent(source.rssUrl)}`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: RSS2JSONResponse = await response.json();

    if (data.status !== 'ok') {
      console.warn(`Failed to fetch RSS for ${source.name}: ${data.status}`);
      return [];
    }

    const feedLogo = data.feed.image;

    // STEP 1: PRE-SCAN FOR DUPLICATES
    const imageFrequencyMap = new Map<string, number>();
    
    data.items.forEach(item => {
        const candidates = getCandidateImages(item);
        const uniqueCandidates = [...new Set(candidates)];
        uniqueCandidates.forEach(url => {
            imageFrequencyMap.set(url, (imageFrequencyMap.get(url) || 0) + 1);
        });
    });

    // Step 2: Process Items
    return data.items.map((item, index) => {
      const candidates = getCandidateImages(item);
      let selectedImage: string | null = null;

      for (const url of candidates) {
          if (!isValidImageUrl(url, feedLogo)) continue;

          // Frequency Check (>2 means it's likely a shared asset/logo)
          if ((imageFrequencyMap.get(url) || 0) > 2) continue;

          selectedImage = url;
          break; 
      }

      // Fallback
      if (!selectedImage) {
         const hash = hashCode(item.title + source.name); 
         selectedImage = FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
      } else {
         // Fix protocol and YouTube quality
         selectedImage = ensureHttps(selectedImage);
         
         if (source.isVideoSource && selectedImage.includes('default.jpg')) {
             if (selectedImage.includes('mqdefault')) {
                  selectedImage = selectedImage.replace('mqdefault', 'hqdefault');
             }
         }
      }

      // Clean snippet
      const tempDiv = document.createElement('div');
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
        thumbnail: selectedImage,
        sourceTitle: source.name,
        sourceIcon: data.feed.image,
        categories: item.categories || [],
        isVideo: source.isVideoSource
      };
    });
  } catch (error) {
    // console.error(`Error fetching feed ${source.name}:`, error);
    // Suppress console spam for individual feed failures, just return empty
    return [];
  }
};

const shuffleArray = (array: Article[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchAllFeeds = async (sources: FeedSource[]): Promise<Article[]> => {
  const activeSources = sources.filter(s => s.isActive);
  
  // Batch requests to prevent overwhelming the free RSS2JSON API (500 errors)
  const BATCH_SIZE = 4;
  let pool: Article[] = [];
  
  for (let i = 0; i < activeSources.length; i += BATCH_SIZE) {
      const batch = activeSources.slice(i, i + BATCH_SIZE);
      const promises = batch.map(source => fetchFeedArticles(source));
      const results = await Promise.all(promises);
      
      results.forEach((feedArticles, index) => {
        // Logic to process this feed (Video limit vs Standard limit)
        const source = batch[index];
        let filteredFeed = feedArticles;

        if (source.id === 'bandcamp-daily') {
            filteredFeed = filteredFeed.filter(article => {
                const content = (article.title + ' ' + article.categories.join(' ') + ' ' + article.contentSnippet).toLowerCase();
                return BANDCAMP_ELECTRO_KEYWORDS.some(k => content.includes(k));
            });
        }

        const sortedFeed = filteredFeed.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        const limit = source.isVideoSource ? 2 : 5;
        const topItems = sortedFeed.slice(0, limit);
        pool.push(...topItems);
      });

      // Add a small delay between batches to be nice to the API
      if (i + BATCH_SIZE < activeSources.length) {
          await delay(250);
      }
  }

  // Global Filter
  pool = pool.filter(article => {
    const text = (article.title + ' ' + article.categories.join(' ') + ' ' + article.contentSnippet).toLowerCase();
    const hasExcludedKeyword = EXCLUDED_KEYWORDS.some(k => text.includes(k));
    return !hasExcludedKeyword;
  });

  return shuffleArray(pool);
};