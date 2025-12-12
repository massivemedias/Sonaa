import React, { useState } from 'react';
import { FeedSource } from '../types';
import { discoverFeedUrl } from '../services/geminiService';
import { Plus, Trash2, Search, Loader2, Globe, CheckCircle, AlertCircle } from 'lucide-react';

interface FeedManagerProps {
  feeds: FeedSource[];
  setFeeds: (feeds: FeedSource[]) => void;
  onDeleteFeed: (feedId: string) => void;
  onClose: () => void;
}

export const FeedManager: React.FC<FeedManagerProps> = ({ feeds, setFeeds, onDeleteFeed, onClose }) => {
  const [urlInput, setUrlInput] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsDiscovering(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Try to discover the feed using Gemini (or heuristics if offline)
      const discoveryResult = await discoverFeedUrl(urlInput);
      
      if (discoveryResult) {
         // Check for duplicates
         if (feeds.some(f => f.rssUrl === discoveryResult.rssUrl)) {
             setError("This feed already exists in your list.");
             setIsDiscovering(false);
             return;
         }

         const newFeed: FeedSource = {
           id: crypto.randomUUID(),
           name: discoveryResult.name,
           url: urlInput,
           rssUrl: discoveryResult.rssUrl,
           isActive: true
         };

         setFeeds([...feeds, newFeed]);
         setSuccessMsg(`Successfully added ${discoveryResult.name}!`);
         setUrlInput('');
      } else {
         setError("Could not find a valid RSS feed for this URL. Try finding the RSS link manually.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const removeFeed = (id: string) => {
    onDeleteFeed(id);
  };

  const toggleFeed = (id: string) => {
    setFeeds(feeds.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Sources Management</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
            Back to News
        </button>
      </div>

      {/* Add Feed Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
            <Globe className="text-indigo-500" size={20}/> Add New Source
        </h3>
        <p className="text-zinc-400 text-sm mb-4">
            Enter a website URL (e.g., <code>wired.com</code>). Sonaa will use AI to find the feed.
        </p>
        
        <form onSubmit={handleAddFeed} className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600"
                />
            </div>
            <button
                type="submit"
                disabled={isDiscovering || !urlInput}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2 min-w-[120px] justify-center"
            >
                {isDiscovering ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> Add</>}
            </button>
          </div>
        </form>

        {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> {error}
            </div>
        )}
        {successMsg && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-900/50 text-green-400 rounded-lg flex items-center gap-2 text-sm">
                <CheckCircle size={16} /> {successMsg}
            </div>
        )}
      </div>

      {/* List Feeds Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feeds.map((feed) => (
            <div key={feed.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div 
                        onClick={() => toggleFeed(feed.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors ${feed.isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-600'}`}
                    >
                        <span className="font-bold text-lg">{feed.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                        <h4 className={`font-medium truncate transition-colors ${feed.isActive ? 'text-zinc-200' : 'text-zinc-500'}`}>{feed.name}</h4>
                        <p className="text-xs text-zinc-500 truncate max-w-[200px]">{feed.url}</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => removeFeed(feed.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Remove Feed"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        ))}
      </div>
    </div>
  );
};
