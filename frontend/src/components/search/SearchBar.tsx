/**
 * SearchBar — semantic search input with model loading indicator.
 * @module components/search/SearchBar
 */

import { useState, useCallback } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadEmbeddingModel, isModelLoaded } from '../../services/embedding.service';
import { Button } from '../ui/Button';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || isLoading) return;

    // Load embedding model if not already loaded
    if (!isModelLoaded()) {
      setModelLoading(true);
      try {
        await loadEmbeddingModel((p) => setModelProgress(p.progress));
      } catch {
        // Continue — the search function will attempt to load again
      } finally {
        setModelLoading(false);
      }
    }

    onSearch(query.trim());
  }, [query, isLoading, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by meaning, not keywords... (e.g., 'quarterly revenue report')"
          className="w-full pl-12 pr-32 py-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-base"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Button
            onClick={handleSearch}
            isLoading={isLoading || modelLoading}
            leftIcon={!isLoading && !modelLoading ? <Sparkles className="w-4 h-4" /> : undefined}
          >
            Search
          </Button>
        </div>
      </div>

      {modelLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-1"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading AI model... {Math.round(modelProgress)}%</span>
        </motion.div>
      )}
    </div>
  );
}
