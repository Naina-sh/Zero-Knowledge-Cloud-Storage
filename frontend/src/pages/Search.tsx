/**
 * Search page — semantic search interface with results and history.
 * @module pages/Search
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, History, Trash2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { SearchBar } from '../components/search/SearchBar';
import { SearchResults } from '../components/search/SearchResults';
import { FilePreview } from '../components/files/FilePreview';
import { FullPageSpinner } from '../components/ui/Spinner';
import { semanticSearch } from '../services/file.service';
import { decryptString } from '../services/crypto.service';
import api from '../services/api.service';
import type { SearchResult, SearchHistoryItem, ApiResponse } from '../types';

export function Search() {
  const { encKey } = useAuth();
  const [results, setResults] = useState<Array<SearchResult & { decryptedName: string }>>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!encKey) {
        toast.error('Encryption key not available');
        return;
      }
      setIsSearching(true);
      setHasSearched(true);
      try {
        const searchResults = await semanticSearch(query, encKey);
        setResults(searchResults);
        if (searchResults.length === 0) {
          toast('No matching files found', { icon: '🔍' });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [encKey]
  );

  const loadHistory = useCallback(async () => {
    if (!encKey) return;
    try {
      const res = await api.get<ApiResponse<{ history: SearchHistoryItem[] }>>('/search/history');
      const items = res.data.data?.history ?? [];
      // Decrypt the queries
      const decrypted = await Promise.all(
        items.map(async (item) => ({
          ...item,
          decryptedQuery: await decryptString(encKey, item.encryptedQuery, item.queryIv).catch(() => '???'),
        }))
      );
      setHistory(decrypted as unknown as SearchHistoryItem[]);
      setShowHistory(true);
    } catch {
      toast.error('Failed to load search history');
    }
  }, [encKey]);

  const clearHistory = useCallback(async () => {
    try {
      await api.delete('/search/history');
      setHistory([]);
      toast.success('Search history cleared');
    } catch {
      toast.error('Failed to clear history');
    }
  }, []);

  if (!encKey) return <FullPageSpinner message="Initializing encryption key..." />;

  return (
    <DashboardLayout>
      <FilePreview />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-brand-500" />
              Semantic Search
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Search by meaning — your query is embedded locally, the server only sees the vector.
            </p>
          </div>
          <button
            onClick={showHistory ? clearHistory : loadHistory}
            className="btn-secondary"
          >
            {showHistory ? <Trash2 className="w-4 h-4" /> : <History className="w-4 h-4" />}
            {showHistory ? 'Clear History' : 'History'}
          </button>
        </div>
      </motion.div>

      {/* Search bar */}
      <div className="glass-card p-6 mb-6">
        <SearchBar onSearch={handleSearch} isLoading={isSearching} />
      </div>

      {/* Search history */}
      {showHistory && history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 10).map((item) => {
              const query = (item as unknown as { decryptedQuery: string }).decryptedQuery;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSearch(query)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <SearchIcon className="w-3 h-3" />
                  {query}
                  <span className="text-xs text-gray-400">({item.resultCount})</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Results */}
      <SearchResults results={results} hasSearched={hasSearched} />
    </DashboardLayout>
  );
}
