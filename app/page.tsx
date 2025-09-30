'use client';

import { useState } from 'react';
import { Search, FileText, BarChart3, Loader2 } from 'lucide-react';
import { SimilarityResult } from '@/types';

export default function Home() {
  const [query, setQuery] = useState('');
  const [passages, setPassages] = useState('');
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !passages.trim()) return;

    setLoading(true);
    setError('');

    try {
      const passagesArray = passages
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const response = await fetch('/api/similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          passages: passagesArray,
          topK: 5
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate similarity');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="gradient-card border-b border-white/20 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Vector Similarity Tool
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-light">
            Compare passages to queries using cosine similarity in vector space
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Query Input */}
          <div className="gradient-card rounded-2xl p-8 shadow-xl">
            <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-4">
              <Search className="inline w-5 h-5 mr-3" />
              Search Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your search query here..."
              className="w-full h-28 px-6 py-4 bg-white/80 dark:bg-slate-800/80 border border-white/30 dark:border-slate-600/30 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
              required
            />
          </div>

          {/* Passages Input */}
          <div className="gradient-card rounded-2xl p-8 shadow-xl">
            <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-4">
              <FileText className="inline w-5 h-5 mr-3" />
              Article Passages
            </label>
            <textarea
              value={passages}
              onChange={(e) => setPassages(e.target.value)}
              placeholder="Enter article passages, one per line..."
              className="w-full h-52 px-6 py-4 bg-white/80 dark:bg-slate-800/80 border border-white/30 dark:border-slate-600/30 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
              required
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 font-medium">
              Each line will be treated as a separate passage for comparison.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !query.trim() || !passages.trim()}
            className="btn-primary w-full py-4 px-8 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Calculating Similarity...</span>
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5" />
                <span>Find Similar Passages</span>
              </>
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 shadow-lg">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-12 space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Similarity Results
            </h2>
            {results.map((result, index) => {
              // Convert cosine similarity (-1 to 1) to 0-100 scale
              // -1 -> 0, 0 -> 50, 1 -> 100
              const normalizedScore = Math.round(((result.similarity + 1) / 2) * 100);
              const clampedScore = Math.max(0, Math.min(100, normalizedScore));
              
              // Calculate circumference for proper stroke-dasharray
              const circumference = 2 * Math.PI * 15.9155;
              const strokeDasharray = `${(clampedScore / 100) * circumference} ${circumference}`;
              
              const getScoreColor = (score: number) => {
                if (score >= 90) return '#059669';
                if (score >= 70) return '#d97706';
                return '#dc2626';
              };
              const getGaugeColor = (score: number) => {
                if (score >= 90) return '#10b981';
                if (score >= 70) return '#f59e0b';
                return '#ef4444';
              };
              const getGaugeColorLight = (score: number) => {
                if (score >= 90) return '#d1fae5';
                if (score >= 70) return '#fef3c7';
                return '#fecaca';
              };
              
              return (
                <div
                  key={index}
                  className="gradient-card rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between mb-6">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-700">
                      Rank #{index + 1}
                    </span>
                    <div className="flex items-center space-x-3">
                      {/* Circular Gauge */}
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <svg 
                          className="w-12 h-12 transform -rotate-90" 
                          viewBox="0 0 36 36"
                          style={{ width: '48px', height: '48px' }}
                        >
                          {/* Light background circle */}
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke={getGaugeColorLight(clampedScore)}
                            strokeWidth="3"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke={getGaugeColor(clampedScore)}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={strokeDasharray}
                            className="transition-all duration-500"
                          />
                        </svg>
                        {/* Score text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span 
                            className="text-xs font-bold"
                            style={{ 
                              color: getScoreColor(clampedScore)
                            }}
                          >
                            {clampedScore}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        similar
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg font-medium">{result.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
