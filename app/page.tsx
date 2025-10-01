'use client';

import React, { useState } from 'react';
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
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);
  const [usedRealAPI, setUsedRealAPI] = useState<boolean | null>(null);

  // Load API key from localStorage on component mount
  React.useEffect(() => {
    const savedApiKey = localStorage.getItem('google_ai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setApiKeyValid(true);
    }
  }, []);

  // Validate API key format
  const validateApiKey = (key: string): boolean => {
    // Google AI API keys typically start with "AIza" and are 39 characters long
    return /^AIza[0-9A-Za-z_-]{35}$/.test(key);
  };

  // Handle API key input
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    
    if (key.length === 0) {
      setApiKeyValid(null);
    } else {
      setApiKeyValid(validateApiKey(key));
    }
  };

  // Save API key to localStorage
  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyValid) {
      localStorage.setItem('google_ai_api_key', apiKey);
      setError('');
    } else {
      setError('Please enter a valid Google AI Studio API key');
    }
  };

  // Clear API key
  const clearApiKey = () => {
    setApiKey('');
    setApiKeyValid(null);
    localStorage.removeItem('google_ai_api_key');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !passages.trim()) return;

    console.log('🚀 Frontend: Starting similarity calculation');
    console.log('🔑 Frontend: API Key exists:', !!apiKey);
    console.log('🔑 Frontend: API Key length:', apiKey?.length || 0);
    console.log('🔑 Frontend: API Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
    console.log('🔑 Frontend: API Key valid:', apiKeyValid);
    console.log('📝 Frontend: Query:', query.trim());

    setLoading(true);
    setError('');

    try {
      const passagesArray = passages
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      console.log('📄 Frontend: Passages count:', passagesArray.length);

      const requestBody = {
        query: query.trim(),
        passages: passagesArray,
        topK: 5,
        apiKey: apiKey || undefined
      };

      console.log('📤 Frontend: Sending request');
      console.log('📤 Frontend: API Key in request:', !!requestBody.apiKey);

      const response = await fetch('/api/similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Frontend: Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to calculate similarity');
      }

      const data = await response.json();
      console.log('📊 Frontend: Results received:', data.results.length);
      console.log('🔍 Frontend: Real API used:', data.usedRealAPI);
      setResults(data.results);
      setUsedRealAPI(data.usedRealAPI);
    } catch (err) {
      console.error('❌ Frontend: Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
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
          apiKey: apiKey || undefined
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

      {/* API Key Section */}
      <section className="max-w-4xl mx-auto px-6 py-4">
        <div className="gradient-card rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-key">
                <circle cx="7.5" cy="15.5" r="5.5"></circle>
                <path d="m21 2-9.6 9.6"></path>
                <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
              </svg>
              API Configuration
            </h2>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              {showApiKey ? 'Hide' : 'Configure'}
            </button>
          </div>
          
          {apiKeyValid === true && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <path d="m9 11 3 3L22 4"></path>
              </svg>
              <span className="text-sm font-medium">API Key configured successfully</span>
              <button
                onClick={clearApiKey}
                className="ml-auto text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {showApiKey && (
            <form onSubmit={handleApiKeySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Google AI Studio API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKeyValue ? "text" : "password"}
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="AIzaSy..."
                    className={`w-full px-4 py-3 pr-12 bg-white/80 dark:bg-slate-800/80 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200 ${
                      apiKeyValid === false ? 'border-red-300 dark:border-red-600' : 
                      apiKeyValid === true ? 'border-green-300 dark:border-green-600' : 
                      'border-white/30 dark:border-slate-600/30'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeyValue(!showApiKeyValue)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showApiKeyValue ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" x2="22" y1="2" y2="22"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {apiKeyValid === false && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Invalid API key format. Google AI keys start with &ldquo;AIza&rdquo; and are 39 characters long.
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Your API key is stored locally in your browser and never sent to our servers. 
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
                    Get your free API key here
                  </a>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!apiKeyValid}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Save API Key
                </button>
                <button
                  type="button"
                  onClick={clearApiKey}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

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
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Similarity Results
              </h2>
              {usedRealAPI === true ? (
                <div className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <path d="m9 11 3 3L22 4"></path>
                  </svg>
                  Using Google AI Embeddings
                </div>
              ) : usedRealAPI === false ? (
                <div className="flex items-center justify-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu">
                    <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                    <rect x="9" y="9" width="6" height="6"></rect>
                    <path d="M9 1v6"></path>
                    <path d="M9 17v6"></path>
                    <path d="M1 9h6"></path>
                    <path d="M17 9h6"></path>
                  </svg>
                  Using Mock Embeddings (API quota exceeded or no key)
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu">
                    <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                    <rect x="9" y="9" width="6" height="6"></rect>
                    <path d="M9 1v6"></path>
                    <path d="M9 17v6"></path>
                    <path d="M1 9h6"></path>
                    <path d="M17 9h6"></path>
                  </svg>
                  Using Mock Embeddings (Add API key for better results)
                </div>
              )}
            </div>
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
