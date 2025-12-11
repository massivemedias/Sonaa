import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { ExternalLink, Clock, PlayCircle, Youtube } from 'lucide-react';
import { FALLBACK_IMAGES } from '../constants';

interface ArticleCardProps {
  article: Article;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  // Initialize with article thumbnail, ensuring we have a value
  const [imgSrc, setImgSrc] = useState<string>(article.thumbnail);

  // Sync state if prop changes (e.g. reload)
  useEffect(() => {
    setImgSrc(article.thumbnail);
  }, [article.thumbnail]);

  // Calculate relative time
  const timeAgo = (dateString: string) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "recently";
        
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return "now";
    } catch (e) {
        return "recently";
    }
  };

  const handleImageError = () => {
    // If the current image fails, switch to a fallback.
    // Use title hash to keep it consistent for the same article.
    let hash = 0;
    for (let i = 0; i < article.title.length; i++) {
        hash = ((hash << 5) - hash) + article.title.charCodeAt(i);
        hash = hash & hash;
    }
    const index = Math.abs(hash) % FALLBACK_IMAGES.length;
    
    // Prevent infinite loops if fallback also fails (unlikely but safe)
    if (imgSrc !== FALLBACK_IMAGES[index]) {
        setImgSrc(FALLBACK_IMAGES[index]);
    }
  };

  return (
    <div className={`group flex flex-col h-full bg-zinc-900 rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${article.isVideo ? 'border-red-900/30 hover:border-red-500/50' : 'border-zinc-800 hover:border-zinc-600 hover:shadow-indigo-500/10'}`}>
      
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden shrink-0 bg-zinc-950">
        <img 
          src={imgSrc} 
          alt={article.title}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-80" />
        
        {/* Source Badge */}
        <div className={`absolute top-3 left-3 backdrop-blur-sm border px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${article.isVideo ? 'bg-red-950/80 border-red-800 text-red-200' : 'bg-zinc-950/80 border-zinc-700 text-zinc-300'}`}>
            {article.isVideo ? <Youtube size={12} className="text-red-500" /> : <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>}
            {article.sourceTitle}
        </div>

        {/* Video Play Overlay */}
        {article.isVideo && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform">
                 <PlayCircle size={40} className="text-white/90" />
              </div>
           </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col grow">
        <div className="flex justify-between items-center mb-3 text-xs text-zinc-500">
           <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{timeAgo(article.pubDate)} ago</span>
           </div>
           <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
             {article.categories.slice(0, 1).map((cat, idx) => (
               <span key={idx} className={`${article.isVideo ? 'text-red-400' : 'text-indigo-400'} uppercase tracking-wider font-bold text-[10px]`}>{cat}</span>
             ))}
           </div>
        </div>

        <a href={article.link} target="_blank" rel="noopener noreferrer" className={`block transition-colors ${article.isVideo ? 'group-hover:text-red-400' : 'group-hover:text-indigo-400'}`}>
            <h3 className="text-xl font-bold text-zinc-100 leading-tight mb-3 font-sans line-clamp-3">
            {article.title}
            </h3>
        </a>

        {/* Show snippet only for articles, or shorter for video */}
        <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-3 grow">
          {article.contentSnippet}
        </p>

        <a 
          href={article.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors mt-auto pt-2"
        >
          {article.isVideo ? 'WATCH VIDEO' : 'READ MORE'} <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};