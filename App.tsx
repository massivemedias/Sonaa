import React, { useState, useEffect } from 'react';
import { Article, FeedSource, ViewMode } from './types';
import { DEFAULT_FEEDS } from './constants';
import { fetchAllFeeds } from './services/rssService';
import { ArticleCard } from './components/ArticleCard';
import { FeedManager } from './components/FeedManager';
import { Settings, RefreshCw, AudioWaveform, Radio } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.GRID);
  
  // Initialize feeds from local storage or defaults
  const [feeds, setFeeds] = useState<FeedSource[]>(() => {
    const saved = localStorage.getItem('sonaa_feeds');
    return saved ? JSON.parse(saved) : DEFAULT_FEEDS;
  });

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Persist feeds
  useEffect(() => {
    localStorage.setItem('sonaa_feeds', JSON.stringify(feeds));
  }, [feeds]);

  // Load articles
  const loadData = async () => {
    setLoading(true);
    const data = await fetchAllFeeds(feeds);
    setArticles(data);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    // Only load data when in GRID view to save resources
    if (view === ViewMode.GRID) {
      loadData();
    }
  }, [view, feeds]); // Reload if feeds change or view changes back to grid

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setView(ViewMode.GRID)}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
                <AudioWaveform className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              Sonaa
            </h1>
          </div>

          <div className="flex items-center gap-2">
             {view === ViewMode.GRID && (
                <div className="hidden md:flex items-center gap-2 mr-4 text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                    <Radio size={12} className="text-green-500 animate-pulse"/> 
                    {articles.length} stories live
                    {lastUpdated && <span className="text-zinc-600">| Updated {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                </div>
             )}

            <button 
                onClick={loadData}
                disabled={loading || view === ViewMode.ADMIN}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all disabled:opacity-50"
                title="Refresh Feeds"
            >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            
            <button 
                onClick={() => setView(view === ViewMode.GRID ? ViewMode.ADMIN : ViewMode.GRID)}
                className={`p-2 rounded-full transition-all ${view === ViewMode.ADMIN ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                title="Manage Feeds"
            >
                <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        {view === ViewMode.ADMIN ? (
          <FeedManager feeds={feeds} setFeeds={setFeeds} onClose={() => setView(ViewMode.GRID)} />
        ) : (
          <>
            {loading && articles.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="animate-pulse">Aggregating frequencies...</p>
               </div>
            ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 pb-20">
                    {articles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                    ))}
                </div>
            )}
            
            {!loading && articles.length === 0 && (
                <div className="text-center py-20 text-zinc-500">
                    <p className="text-xl">No signal detected.</p>
                    <p className="text-sm mt-2">Check your source configuration.</p>
                </div>
            )}
          </>
        )}
      </main>

    </div>
  );
};

export default App;
