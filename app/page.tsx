'use client';

import { useState } from 'react';
import { Search, FileText, BarChart3, Loader2, Edit3 } from 'lucide-react';
import { SimilarityResult, TokenSuggestion } from '@/types';

// Advanced tokenization function for similarity analysis
const tokenizeText = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(token => token.length > 0);
};

// Get token similarity analysis for future modification recommendations
const analyzeTokenSimilarity = (text: string, query: string) => {
  const queryTokens = tokenizeText(query);
  const textTokens = tokenizeText(text);
  
  return textTokens.map(token => {
    const exactMatch = queryTokens.includes(token);
    const partialMatch = queryTokens.some(queryToken => 
      token.includes(queryToken) || queryToken.includes(token)
    );
    const stemMatch = queryTokens.some(queryToken => 
      token.startsWith(queryToken) || queryToken.startsWith(token)
    );
    
    return {
      token,
      exactMatch,
      partialMatch,
      stemMatch,
      isRelevant: exactMatch || partialMatch || stemMatch,
      matchType: exactMatch ? 'exact' : partialMatch ? 'partial' : stemMatch ? 'stem' : 'none'
    };
  });
};


// Future utility for modification recommendations (currently unused but ready for implementation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getModificationSuggestions = (text: string, query: string) => {
  const tokenAnalysis = analyzeTokenSimilarity(text, query);
  const queryTokens = tokenizeText(query);
  
  // Find tokens that could be improved
  const weakTokens = tokenAnalysis.filter(token => 
    !token.isRelevant && token.token.length > 3
  );
  
  // Find query terms not present in text
  const missingQueryTerms = queryTokens.filter(queryToken => 
    !tokenAnalysis.some(token => token.isRelevant && token.token.includes(queryToken))
  );
  
  return {
    weakTokens: weakTokens.map(t => t.token),
    missingQueryTerms,
    suggestions: [
      ...missingQueryTerms.map(term => `Consider adding "${term}" to improve relevance`),
      ...weakTokens.slice(0, 3).map(token => `Consider replacing "${token.token}" with a more relevant term`)
    ]
  };
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [passages, setPassages] = useState('');
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ [key: number]: TokenSuggestion[] }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});
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
        const errorData = await response.json();
        const errorMessage = errorData.details || errorData.error || 'An error occurred';
        setError(errorMessage);
        return;
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      console.error('Error:', err);
      if (err instanceof Error && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (text: string, resultIndex: number) => {
    if (loadingSuggestions[resultIndex]) return;
    
    setLoadingSuggestions(prev => ({ ...prev, [resultIndex]: true }));
    
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          query: query.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(prev => ({ ...prev, [resultIndex]: data.suggestions }));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [resultIndex]: false }));
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

              // Precompute token analysis once per result to avoid repeated calls during render
              const tokenAnalysis = analyzeTokenSimilarity(result.text, query);
              const relevantTokensCount = tokenAnalysis.filter(t => t.isRelevant).length;
              const totalTokensCount = tokenAnalysis.length;
              const exactCount = tokenAnalysis.filter(t => t.matchType === 'exact').length;
              const partialCount = tokenAnalysis.filter(t => t.matchType === 'partial').length;
              const stemCount = tokenAnalysis.filter(t => t.matchType === 'stem').length;
              
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
                  <div className="space-y-4">
                    {/* Original text */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Original Passage
                      </h4>
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg font-medium">
                        {result.text}
                      </p>
                    </div>
                    
                    {/* Tokenized analysis */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Token Analysis
                      </h4>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <div className="flex flex-wrap gap-2">
                          {tokenAnalysis.map((tokenData, tokenIndex) => {
                            const getTokenStyle = (matchType: string) => {
                              switch (matchType) {
                                case 'exact':
                                  return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700';
                                case 'partial':
                                  return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700';
                                case 'stem':
                                  return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700';
                                default:
                                  return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400';
                              }
                            };
                            
                            return (
                              <span
                                key={tokenIndex}
                                className={`px-2 py-1 rounded text-sm font-medium transition-colors ${getTokenStyle(tokenData.matchType)}`}
                                title={`Match type: ${tokenData.matchType}`}
                              >
                                {tokenData.token}
                              </span>
                            );
                          })}
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {relevantTokensCount} of {totalTokensCount} tokens match query terms
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded"></div>
                              <span className="text-gray-500 dark:text-gray-400">
                                {exactCount} exact
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded"></div>
                              <span className="text-gray-500 dark:text-gray-400">
                                {partialCount} partial
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                              <span className="text-gray-500 dark:text-gray-400">
                                {stemCount} stem
                              </span>
                            </span>
                          </div>
                        </div>
                        
                        {/* Token Suggestions Section */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Edit3 className="w-4 h-4" />
                              Token Suggestions
                            </h4>
                            <button
                              onClick={() => fetchSuggestions(result.text, index)}
                              disabled={loadingSuggestions[index]}
                              className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                            >
                              {loadingSuggestions[index] ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Get Suggestions'
                              )}
                            </button>
                          </div>
                          
                          {suggestions[index] && suggestions[index].length > 0 && (
                            <div className="space-y-2">
                              {suggestions[index].map((suggestion, suggestionIndex) => (
                                <div key={suggestionIndex} className="text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    &ldquo;{suggestion.originalToken}&rdquo; →
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {suggestion.suggestions.map((suggestionText, suggestionTextIndex) => (
                                      <span
                                        key={suggestionTextIndex}
                                        className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-800 cursor-pointer transition-colors"
                                        title={`Replace "${suggestion.originalToken}" with "${suggestionText}"`}
                                      >
                                        {suggestionText}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-gray-400 dark:text-gray-500 mt-1">
                                    {suggestion.reason}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {suggestions[index] && suggestions[index].length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              No token suggestions available - all tokens match query well!
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
