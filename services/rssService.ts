import { Article, FeedSource, RSS2JSONResponse } from '../types';

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
    'googleusercontent', 'feed-icon', 'icon-',
    // Stock photo sites - often generic/unrelated images
    'shutterstock', 'istockphoto', 'gettyimages', 'depositphotos',
    'stock-photo', 'stock_photo', 'stockphoto',
    'unsplash.com', 'pexels.com', 'pixabay.com', 'freepik.com',
    // Ad networks and trackers
    'ad.', 'ads.', 'adserver', 'advertising', 'banner',
    // Social media buttons/icons
    'twitter.com/intent', 'facebook.com/sharer', 'pinterest.com/pin',
    // Common placeholder patterns
    'placeholder', 'default-image', 'no-image', 'noimage',
    // Generic stock image keywords in URLs
    'flower', 'flowers', 'nature', 'landscape', 'sunset', 'sunrise',
    'abstract-background', 'business-people', 'happy-people', 'smiling',
    'handshake', 'teamwork', 'office-worker'
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

/**
 * Score an image URL - higher score = more likely to be a relevant product/article image
 */
const scoreImageUrl = (url: string, articleTitle: string): number => {
    let score = 0;
    const lowerUrl = url.toLowerCase();
    const titleWords = articleTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Bonus: URL contains words from article title (likely product image)
    titleWords.forEach(word => {
        if (lowerUrl.includes(word)) score += 10;
    });

    // Bonus: Image is from same domain as common synth/music sites
    const goodDomains = ['synthanatomy', 'gearnews', 'musicradar', 'attackmagazine',
                         'cdm.link', 'kvraudio', 'soundonsound', 'bedroomproducers',
                         'pluginboutique', 'wordpress', 'wp-content'];
    if (goodDomains.some(d => lowerUrl.includes(d))) score += 5;

    // Bonus: Looks like a product/feature image path
    const goodPatterns = ['product', 'feature', 'upload', 'content', 'article',
                          'post', 'news', 'review', 'synth', 'plugin', 'vst'];
    goodPatterns.forEach(p => {
        if (lowerUrl.includes(p)) score += 3;
    });

    // Penalty: Image dimensions suggest thumbnail/icon (often in URL)
    if (lowerUrl.match(/[_-](50|100|150|32|64|thumb|small|mini)/)) {
        score -= 5;
    }

    // Bonus: Larger image sizes in URL
    if (lowerUrl.match(/[_-](800|1200|1024|large|full|featured)/)) {
        score += 5;
    }

    return score;
};

export const fetchFeedArticles = async (source: FeedSource): Promise<Article[]> => {
  try {
    const response = await fetch(`${RSS_TO_JSON_API}${encodeURIComponent(source.rssUrl)}`);
    
    if (!response.ok) {
        // Silently fail for individual feed errors
        return [];
    }

    const data: RSS2JSONResponse = await response.json();

    if (data.status !== 'ok') {
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
    const validArticles = data.items.map((item, index): Article | null => {
      const candidates = getCandidateImages(item);

      // Filter and score all valid candidates
      const scoredCandidates = candidates
          .filter(url => isValidImageUrl(url, feedLogo))
          .filter(url => (imageFrequencyMap.get(url) || 0) <= 2)
          .map(url => ({ url, score: scoreImageUrl(url, item.title) }))
          .sort((a, b) => b.score - a.score);

      // Select the highest-scoring image
      let selectedImage = scoredCandidates.length > 0 ? scoredCandidates[0].url : null;

      // STRICT FILTER: If no valid image is found, return null immediately.
      if (!selectedImage) {
         return null;
      }

      // Fix protocol and YouTube quality
      selectedImage = ensureHttps(selectedImage);
      
      if (source.isVideoSource && selectedImage.includes('default.jpg')) {
          if (selectedImage.includes('mqdefault')) {
              selectedImage = selectedImage.replace('mqdefault', 'hqdefault');
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

    // Filter out nulls (articles with no images)
    return validArticles.filter((article): article is Article => article !== null);

  } catch (error) {
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