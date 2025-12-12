import React, { useState, useEffect } from 'react';
import { Article, FeedSource, ViewMode } from './types';
import { DEFAULT_FEEDS } from './constants';
import { fetchAllFeeds, fetchMissingImages } from './services/rssService';
import { ArticleCard, CompactArticleCard } from './components/ArticleCard';
import { FeedManager } from './components/FeedManager';
import { Settings, RefreshCw, AudioWaveform, Radio, Lock, X } from 'lucide-react';

const PASSWORD = 'Tamerelapute1423!!';

const App: React.FC = () => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('sonaa_admin_auth') === 'true';
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleSettingsClick = () => {
    if (view === ViewMode.ADMIN) {
      setView(ViewMode.GRID);
    } else if (isAdminAuthenticated) {
      setView(ViewMode.ADMIN);
    } else {
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('sonaa_admin_auth', 'true');
      setShowPasswordModal(false);
      setView(ViewMode.ADMIN);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const [view, setView] = useState<ViewMode>(ViewMode.GRID);

  // Track deleted feed IDs to prevent re-adding them from defaults
  const [deletedFeedIds, setDeletedFeedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sonaa_deleted_feeds');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Initialize feeds from local storage, merging with any new defaults (except deleted ones)
  const [feeds, setFeeds] = useState<FeedSource[]>(() => {
    const saved = localStorage.getItem('sonaa_feeds');
    const deletedIds = localStorage.getItem('sonaa_deleted_feeds');
    const deletedSet = deletedIds ? new Set(JSON.parse(deletedIds)) : new Set();

    if (!saved) {
      // First load: use defaults minus any previously deleted
      return DEFAULT_FEEDS.filter(f => !deletedSet.has(f.id));
    }

    const savedFeeds: FeedSource[] = JSON.parse(saved);
    const savedIds = new Set(savedFeeds.map(f => f.id));

    // Add any new feeds from defaults that aren't in saved feeds AND weren't deleted
    const newFeeds = DEFAULT_FEEDS.filter(f => !savedIds.has(f.id) && !deletedSet.has(f.id));
    if (newFeeds.length > 0) {
      return [...savedFeeds, ...newFeeds];
    }
    return savedFeeds;
  });

  // Helper to delete a feed (tracks it so it won't come back)
  const deleteFeed = (feedId: string) => {
    setFeeds(prev => prev.filter(f => f.id !== feedId));
    setDeletedFeedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(feedId);
      return newSet;
    });
  };

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Persist feeds
  useEffect(() => {
    localStorage.setItem('sonaa_feeds', JSON.stringify(feeds));
  }, [feeds]);

  // Persist deleted feed IDs
  useEffect(() => {
    localStorage.setItem('sonaa_deleted_feeds', JSON.stringify([...deletedFeedIds]));
  }, [deletedFeedIds]);

  // Load articles (2-phase: fast initial load, then background image fetching)
  const loadData = async () => {
    setLoading(true);

    // Phase 1: Fast load - get articles without waiting for og:images
    const data = await fetchAllFeeds(feeds);
    setArticles(data);
    setLastUpdated(new Date());
    setLoading(false);

    // Phase 2: Background - fetch missing og:images and update articles
    fetchMissingImages(data, (articleId, imageUrl) => {
      setArticles(prev => prev.map(article =>
        article.id === articleId
          ? { ...article, thumbnail: imageUrl }
          : article
      ));
    });
  };

  useEffect(() => {
    // Only load data when in GRID view to save resources
    if (view === ViewMode.GRID) {
      loadData();
    }
  }, [view, feeds]); // Reload if feeds change or view changes back to grid

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 w-full max-w-sm relative">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Settings className="text-white" size={36} />
              </div>
              <h2 className="text-xl font-bold">Accès Admin</h2>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Mot de passe"
                  className={`w-full bg-zinc-800 border ${passwordError ? 'border-red-500' : 'border-zinc-700'} rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors`}
                  autoFocus
                />
              </div>
              {passwordError && (
                <p className="text-red-500 text-sm text-center">Mot de passe incorrect</p>
              )}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-500 hover:to-purple-500 transition-all"
              >
                Entrer
              </button>
            </div>
          </form>
        </div>
      )}

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
                onClick={handleSettingsClick}
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
          <FeedManager feeds={feeds} setFeeds={setFeeds} onDeleteFeed={deleteFeed} onClose={() => setView(ViewMode.GRID)} />
        ) : (
          <>
            {loading && articles.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="animate-pulse">Aggregating frequencies...</p>
               </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {(() => {
                      const elements: React.ReactNode[] = [];
                      const noImageQueue: Article[] = [];

                      articles.forEach((article, idx) => {
                        if (article.thumbnail) {
                          // Article with image - full card
                          elements.push(<ArticleCard key={article.id} article={article} />);
                        } else {
                          // Article without image - queue for pairing
                          noImageQueue.push(article);
                          if (noImageQueue.length === 2) {
                            elements.push(
                              <div key={`pair-${noImageQueue[0].id}`} className="flex flex-col gap-3">
                                <CompactArticleCard article={noImageQueue[0]} />
                                <CompactArticleCard article={noImageQueue[1]} />
                              </div>
                            );
                            noImageQueue.length = 0;
                          }
                        }
                      });

                      // Handle remaining single no-image article
                      if (noImageQueue.length === 1) {
                        elements.push(
                          <div key={`single-${noImageQueue[0].id}`} className="flex flex-col gap-3">
                            <CompactArticleCard article={noImageQueue[0]} />
                          </div>
                        );
                      }

                      return elements;
                    })()}
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
