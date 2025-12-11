export interface Article {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  thumbnail: string | null;
  sourceTitle: string;
  sourceIcon?: string;
  categories: string[];
  isVideo?: boolean;
}

export interface FeedSource {
  id: string;
  url: string; // The website URL
  rssUrl: string; // The actual RSS feed URL
  name: string;
  isActive: boolean;
  isVideoSource?: boolean;
}

export enum ViewMode {
  GRID = 'GRID',
  ADMIN = 'ADMIN'
}

export interface RSS2JSONResponse {
  status: string;
  feed: {
    url: string;
    title: string;
    link: string;
    author: string;
    description: string;
    image: string;
  };
  items: Array<{
    title: string;
    pubDate: string;
    link: string;
    guid: string;
    author: string;
    thumbnail: string;
    description: string;
    content: string;
    enclosure: object;
    categories: string[];
  }>;
}