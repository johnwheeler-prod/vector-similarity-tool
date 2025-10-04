'use client';

import React, { useState } from 'react';
import { Search, FileText, BarChart3, Loader2 } from 'lucide-react';
import { SimilarityResult, RerankResult, RerankResponse } from '@/types';
import { useSession } from 'next-auth/react';


export default function Home() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [passages, setPassages] = useState('');
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usedRealAPI, setUsedRealAPI] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<'google' | 'openai'>('google');
  const [model, setModel] = useState<'gemini-embedding-001' | 'text-embedding-3-small' | 'text-embedding-3-large'>('gemini-embedding-001');
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [rerankProvider, setRerankProvider] = useState<'openai' | 'google-vertex' | 'mock'>('mock');
  const [rerankModel] = useState<string>('cross-encoder-ms-marco-MiniLM-L-6-v2');
  
  // Reranking state
  const [rerankResults, setRerankResults] = useState<RerankResult[]>([]);
  const [rerankLoading, setRerankLoading] = useState(false);
  const [rerankError, setRerankError] = useState('');
  const [activeTab, setActiveTab] = useState<'embedding' | 'rerank'>('embedding');
  const [rerankProviderUsed, setRerankProviderUsed] = useState<string>('');
  const [rerankRealAPIUsed, setRerankRealAPIUsed] = useState<boolean | null>(null);



  // Handle rerank provider change
  const handleRerankProviderChange = (newProvider: 'openai' | 'google-vertex' | 'mock') => {
    setRerankProvider(newProvider);
    // Clear rerank results when changing provider
    setRerankResults([]);
    setRerankError('');
    setRerankProviderUsed('');
    setRerankRealAPIUsed(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !passages.trim()) return;

    console.log('🚀 Frontend: Starting similarity calculation');
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
        provider: provider,
        model: model
      };

      console.log('📤 Frontend: Sending request');

            // Use authenticated endpoint if user is signed in, otherwise use legacy endpoint
            const endpoint = session ? '/api/similarity' : '/api/similarity-legacy';
            console.log('📡 Frontend: Using endpoint:', endpoint);
            
            const response = await fetch(endpoint, {
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
      console.log('🔧 Frontend: Provider used:', data.provider);
      console.log('🔧 Frontend: Model used:', data.model);
      setResults(data.results);
      setUsedRealAPI(data.usedRealAPI);
      setCurrentProvider(data.provider || provider);
      
      // Reset rerank results when new embedding results come in
      setRerankResults([]);
      setRerankError('');
      setRerankProviderUsed('');
      setRerankRealAPIUsed(null);
      setActiveTab('embedding');
    } catch (err) {
      console.error('❌ Frontend: Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  // Reranking function - sends top candidate from embedding step to rerank step
  const handleRerank = async () => {
    if (!results.length) {
      setRerankError('No embedding results available for reranking');
      return;
    }

    setRerankLoading(true);
    setRerankError('');

    try {
      // Get the top candidate from embedding results
      const topCandidate = results[0]; // Highest similarity score
      const topPassages = results.slice(0, 3); // Top 3 for reranking context
      
      console.log('🔄 Frontend: Starting reranking process');
      console.log('🔄 Frontend: Top candidate:', topCandidate.text.substring(0, 50) + '...');
      console.log('🔄 Frontend: Reranking top', topPassages.length, 'passages');

      const requestBody = {
        query: query.trim(),
        passages: topPassages.map(r => r.text),
        provider: provider,
        model: model,
        rerankProvider: rerankProvider,
        rerankModel: rerankModel
      };

      // Use authenticated endpoint if user is signed in, otherwise use legacy endpoint
      const endpoint = session ? '/api/rerank' : '/api/rerank-legacy';
      console.log('📡 Frontend: Using rerank endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Frontend: Rerank response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to rerank passages');
      }

      const data: RerankResponse = await response.json();
      console.log('📊 Frontend: Rerank results received:', data.results.length);
      console.log('🔍 Frontend: Rerank API used:', data.usedRealAPI);
      console.log('🔧 Frontend: Rerank provider used:', data.rerankProvider);
      
      setRerankResults(data.results);
      setRerankError('');
      setRerankProviderUsed(data.rerankProvider || rerankProvider);
      setRerankRealAPIUsed(data.usedRealAPI);
      setActiveTab('rerank'); // Switch to rerank tab to show results
    } catch (err) {
      console.error('❌ Frontend: Rerank error:', err);
      setRerankError(err instanceof Error ? err.message : 'An error occurred during reranking');
    } finally {
      setRerankLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-cream-100 to-cream-200 dark:from-forest-950 dark:via-forest-900 dark:to-forest-800">
      {/* Header */}
      <header className="gradient-card border-b border-cream-300 dark:border-forest-700">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-forest-950 dark:text-cream-50 mb-2">
            Vector Similarity Tool
          </h1>
          <p className="text-lg text-forest-700 dark:text-cream-300 font-light">
            Compare passages to queries using cosine similarity in vector space
          </p>
        </div>
      </header>

      {/* Provider Selection */}
      <section className="max-w-4xl mx-auto px-6 py-4">
        <div className="gradient-card rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-forest-900 dark:text-cream-100 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu">
              <rect x="4" y="4" width="16" height="16" rx="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <path d="M9 1v6"></path>
              <path d="M9 17v6"></path>
              <path d="M1 9h6"></path>
              <path d="M17 9h6"></path>
            </svg>
            Embedding Provider
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google AI Option */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                provider === 'google' 
                  ? 'border-forest-600 bg-forest-50 dark:bg-forest-900/20' 
                  : 'border-cream-300 dark:border-forest-700 hover:border-cream-400 dark:hover:border-forest-600'
              }`}
              onClick={() => {
                setProvider('google');
                setModel('gemini-embedding-001');
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-forest-600 to-forest-700 rounded-lg flex items-center justify-center">
                  <span className="text-cream-50 font-bold text-sm">G</span>
                </div>
                <div>
                  <h3 className="font-semibold text-forest-900 dark:text-cream-100">Google AI</h3>
                  <p className="text-sm text-forest-600 dark:text-cream-400">Gemini Embedding</p>
                </div>
              </div>
              <p className="text-xs text-forest-500 dark:text-cream-500 mt-2">
                Free tier available, good for development
              </p>
            </div>

            {/* OpenAI Option */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                provider === 'openai' 
                  ? 'border-forest-700 bg-forest-100 dark:bg-forest-800/20' 
                  : 'border-cream-300 dark:border-forest-700 hover:border-cream-400 dark:hover:border-forest-600'
              }`}
              onClick={() => {
                setProvider('openai');
                setModel('text-embedding-3-small');
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-forest-700 to-forest-800 rounded-lg flex items-center justify-center">
                  <span className="text-cream-50 font-bold text-sm">O</span>
                </div>
                <div>
                  <h3 className="font-semibold text-forest-900 dark:text-cream-100">OpenAI</h3>
                  <p className="text-sm text-forest-600 dark:text-cream-400">Text Embedding 3</p>
                </div>
              </div>
              <p className="text-xs text-forest-500 dark:text-cream-500 mt-2">
                High quality, pay-per-use pricing
              </p>
            </div>
          </div>

          {/* Model Selection for OpenAI */}
          {provider === 'openai' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-forest-700 dark:text-cream-300 mb-2">
                Model Size
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setModel('text-embedding-3-small')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    model === 'text-embedding-3-small'
                      ? 'bg-forest-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300'
                      : 'bg-cream-200 dark:bg-forest-700 text-forest-700 dark:text-cream-300 hover:bg-cream-300 dark:hover:bg-forest-600'
                  }`}
                >
                  Small (1536 dim)
                </button>
                <button
                  onClick={() => setModel('text-embedding-3-large')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    model === 'text-embedding-3-large'
                      ? 'bg-forest-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300'
                      : 'bg-cream-200 dark:bg-forest-700 text-forest-700 dark:text-cream-300 hover:bg-cream-300 dark:hover:bg-forest-600'
                  }`}
                >
                  Large (3072 dim)
                </button>
              </div>
            </div>
          )}
        </div>
      </section>


      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Query Input */}
          <div className="gradient-card rounded-2xl p-8 shadow-xl">
            <label className="block text-lg font-semibold text-forest-900 dark:text-cream-100 mb-4">
              <Search className="inline w-5 h-5 mr-3" />
              Search Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your search query here..."
              className="w-full h-28 px-6 py-4 bg-cream-50/80 dark:bg-forest-800/80 border border-cream-300 dark:border-forest-600 rounded-xl focus:ring-2 focus:ring-forest-600 focus:border-transparent resize-none text-forest-950 dark:text-cream-100 placeholder-forest-500 dark:placeholder-cream-400 backdrop-blur-sm transition-all duration-200"
              required
            />
          </div>

          {/* Passages Input */}
          <div className="gradient-card rounded-2xl p-8 shadow-xl">
            <label className="block text-lg font-semibold text-forest-900 dark:text-cream-100 mb-4">
              <FileText className="inline w-5 h-5 mr-3" />
              Article Passages
            </label>
            <textarea
              value={passages}
              onChange={(e) => setPassages(e.target.value)}
              placeholder="Enter article passages, one per line..."
              className="w-full h-52 px-6 py-4 bg-cream-50/80 dark:bg-forest-800/80 border border-cream-300 dark:border-forest-600 rounded-xl focus:ring-2 focus:ring-forest-600 focus:border-transparent resize-none text-forest-950 dark:text-cream-100 placeholder-forest-500 dark:placeholder-cream-400 backdrop-blur-sm transition-all duration-200"
              required
            />
            <p className="text-sm text-forest-600 dark:text-cream-400 mt-3 font-medium">
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
              <h2 className="text-3xl font-bold text-forest-950 dark:text-cream-50 mb-2">
                Similarity Results
              </h2>
              {usedRealAPI === true ? (
                <div className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <path d="m9 11 3 3L22 4"></path>
                  </svg>
                  Using {currentProvider === 'google' ? 'Google AI' : 'OpenAI'} Embeddings
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
                  Using Mock Embeddings ({currentProvider === 'google' ? 'Google AI' : 'OpenAI'} API quota exceeded or no key)
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 text-sm text-forest-500 dark:text-cream-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu">
                    <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                    <rect x="9" y="9" width="6" height="6"></rect>
                    <path d="M9 1v6"></path>
                    <path d="M9 17v6"></path>
                    <path d="M1 9h6"></path>
                    <path d="M17 9h6"></path>
                  </svg>
                  Using Mock Embeddings (Add {currentProvider === 'google' ? 'Google AI' : 'OpenAI'} API key for better results)
                </div>
              )}
            </div>

            {/* Reranker Status Indicator */}
            {rerankResults.length > 0 && (
              <div className="text-center mb-6">
                {rerankRealAPIUsed === true ? (
                  <div className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <path d="m9 11 3 3L22 4"></path>
                    </svg>
                    Using {rerankProviderUsed === 'openai' ? 'OpenAI' : rerankProviderUsed === 'google-vertex' ? 'Google Vertex AI' : 'Mock'} Reranker
                  </div>
                ) : rerankRealAPIUsed === false ? (
                  <div className="flex items-center justify-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu">
                      <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                      <rect x="9" y="9" width="6" height="6"></rect>
                      <path d="M9 1v6"></path>
                      <path d="M9 17v6"></path>
                      <path d="M1 9h6"></path>
                      <path d="M17 9h6"></path>
                    </svg>
                    Using Mock Reranker ({rerankProviderUsed === 'openai' ? 'OpenAI' : rerankProviderUsed === 'google-vertex' ? 'Google Vertex AI' : 'Mock'} API quota exceeded or no key)
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu">
                      <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                      <rect x="9" y="9" width="6" height="6"></rect>
                      <path d="M9 1v6"></path>
                      <path d="M9 17v6"></path>
                      <path d="M1 9h6"></path>
                      <path d="M17 9h6"></path>
                    </svg>
                    Using Mock Reranker (Add {rerankProviderUsed === 'openai' ? 'OpenAI' : rerankProviderUsed === 'google-vertex' ? 'Google Vertex AI' : 'Mock'} API key for better results)
                  </div>
                )}
              </div>
            )}

            {/* Tabbed Interface */}
            <div className="bg-cream-50 dark:bg-forest-800 rounded-2xl shadow-xl border border-cream-200 dark:border-forest-700 overflow-hidden">
              {/* Tab Headers */}
              <div className="flex border-b border-cream-200 dark:border-forest-700">
                <button
                  onClick={() => setActiveTab('embedding')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'embedding'
                      ? 'text-forest-700 dark:text-forest-300 bg-forest-50 dark:bg-forest-800/20 border-b-2 border-forest-700 dark:border-forest-300'
                      : 'text-forest-500 dark:text-cream-400 hover:text-forest-700 dark:hover:text-cream-300 hover:bg-cream-50 dark:hover:bg-forest-700/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    Embedding Results
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('rerank')}
                  disabled={!results.length}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'rerank'
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-800/20 border-b-2 border-amber-600 dark:border-amber-400'
                      : results.length
                      ? 'text-forest-500 dark:text-cream-400 hover:text-forest-700 dark:hover:text-cream-300 hover:bg-cream-50 dark:hover:bg-forest-700/50'
                      : 'text-forest-300 dark:text-forest-600 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M7 12h10"></path>
                      <path d="M10 18h4"></path>
                    </svg>
                    Reranking
                    {!results.length && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">(requires embedding results)</span>
                    )}
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'embedding' && (
                  <div className="space-y-4">
                    {results.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-forest-700 dark:text-cream-300">
                          {results.length} results from embedding similarity
                        </span>
                      </div>
                    )}
                    {results.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Results Yet</h3>
                        <p className="text-sm text-forest-600 dark:text-cream-400">
                          Run a similarity search to see embedding results here
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'rerank' && (
                  <div className="space-y-4">
                    {/* Rerank Provider Selection */}
                    <div className="bg-gradient-to-r from-amber-50 to-forest-50 dark:from-amber-900/20 dark:to-forest-900/20 rounded-xl p-4 border border-amber-200/50 dark:border-amber-700/50">
                      <h4 className="text-sm font-semibold text-forest-700 dark:text-cream-300 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M3 6h18"></path>
                          <path d="M7 12h10"></path>
                          <path d="M10 18h4"></path>
                        </svg>
                        Rerank Provider
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => handleRerankProviderChange('mock')}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            rerankProvider === 'mock'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : 'border-cream-300 dark:border-forest-700 hover:border-cream-400 dark:hover:border-forest-600'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1">Mock</div>
                          <div className="text-xs text-forest-500 dark:text-cream-400">Free testing</div>
                        </button>
                        <button
                          onClick={() => handleRerankProviderChange('openai')}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            rerankProvider === 'openai'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : 'border-cream-300 dark:border-forest-700 hover:border-cream-400 dark:hover:border-forest-600'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1">OpenAI</div>
                          <div className="text-xs text-forest-500 dark:text-cream-400">Cross-encoder</div>
                        </button>
                        <button
                          onClick={() => handleRerankProviderChange('google-vertex')}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            rerankProvider === 'google-vertex'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : 'border-cream-300 dark:border-forest-700 hover:border-cream-400 dark:hover:border-forest-600'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1">Google</div>
                          <div className="text-xs text-forest-500 dark:text-cream-400">Vertex AI</div>
                        </button>
                      </div>
                    </div>


                    {rerankError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-red-800 dark:text-red-200 text-sm">{rerankError}</p>
                      </div>
                    )}

                    {rerankResults.length === 0 && !rerankLoading && (
                      <div className="space-y-6">
                        {!results.length ? (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500">
                                <path d="M3 6h18"></path>
                                <path d="M7 12h10"></path>
                                <path d="M10 18h4"></path>
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Embedding Results</h3>
                            <p className="text-sm text-forest-600 dark:text-cream-400">
                              Complete an embedding search first to enable reranking
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                                <path d="M3 6h18"></path>
                                <path d="M7 12h10"></path>
                                <path d="M10 18h4"></path>
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready for Reranking</h3>
                            <p className="text-sm text-forest-600 dark:text-cream-400 mb-6">
                              {rerankProvider === 'mock' 
                                ? 'Use mock cross-encoder for testing without API costs'
                                : `Configure your ${rerankProvider === 'openai' ? 'OpenAI' : 'Google Vertex AI'} API key and start reranking to improve results`
                              }
                            </p>
                            
                            {/* Show rerank button */}
                            <button
                              onClick={handleRerank}
                              disabled={rerankLoading}
                              className="btn-primary bg-gradient-to-r from-amber-600 to-forest-600 hover:from-amber-700 hover:to-forest-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                              {rerankLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Reranking...
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M7 12h10"></path>
                                    <path d="M10 18h4"></path>
                                  </svg>
                                  Start Reranking
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {rerankLoading && (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-600 dark:text-amber-400 mx-auto mb-4" />
                        <p className="text-sm text-forest-600 dark:text-cream-400">Reranking your results...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Results Display - Show based on active tab */}
            {((activeTab === 'embedding' && results.length > 0) || 
              (activeTab === 'rerank' && rerankResults.length > 0)) && 
            (rerankResults.length > 0 && activeTab === 'rerank' ? rerankResults : results).map((result, index) => {
              // Handle both regular results and rerank results
              const isRerankResult = 'rerankScore' in result;
              const embeddingScore = isRerankResult ? result.embeddingScore : result.similarity;
              const finalScore = isRerankResult ? result.finalScore : result.similarity;
              
              // Handle score conversion based on result type
              let normalizedEmbeddingScore: number;
              let normalizedFinalScore: number;
              
              if (isRerankResult) {
                // Rerank results are already on 0-100 scale
                normalizedEmbeddingScore = Math.round(embeddingScore);
                normalizedFinalScore = Math.round(finalScore);
              } else {
                // Regular embedding results need conversion from cosine similarity (-1 to 1) to 0-100 scale
                normalizedEmbeddingScore = Math.round(((embeddingScore + 1) / 2) * 100);
                normalizedFinalScore = Math.round(((finalScore + 1) / 2) * 100);
              }
              
              const clampedScore = Math.max(0, Math.min(100, normalizedFinalScore));
              
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
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold px-4 py-2 rounded-full border ${
                        isRerankResult 
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
                          : 'text-forest-600 dark:text-forest-400 bg-forest-50 dark:bg-forest-900/30 border-forest-200 dark:border-forest-700'
                      }`}>
                        {isRerankResult ? `Reranked #${result.rank}` : `Rank #${index + 1}`}
                      </span>
                      {isRerankResult && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-700">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M7 12h10"></path>
                            <path d="M10 18h4"></path>
                          </svg>
                          Cross-encoder
                        </div>
                      )}
                    </div>
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
                      <span className="text-sm font-semibold text-forest-600 dark:text-cream-400">
                        similar
                      </span>
                    </div>
                  </div>

                  {/* Score Breakdown for Rerank Results */}
                  {isRerankResult && (
                    <div className="bg-gradient-to-r from-amber-50 to-forest-50 dark:from-amber-900/20 dark:to-forest-900/20 rounded-xl p-4 mb-6 border border-amber-200/50 dark:border-amber-700/50">
                      <h4 className="text-sm font-semibold text-forest-700 dark:text-cream-300 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M3 6h18"></path>
                          <path d="M7 12h10"></path>
                          <path d="M10 18h4"></path>
                        </svg>
                        Score Breakdown
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-xs text-forest-500 dark:text-cream-400 mb-1">Embedding</div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {normalizedEmbeddingScore}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-forest-500 dark:text-cream-400 mb-1">Cross-encoder</div>
                          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            {Math.round(result.rerankScore)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-forest-500 dark:text-cream-400 mb-1">Final</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {normalizedFinalScore}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Original text */}
                    <div>
                      <h4 className="text-sm font-semibold text-forest-600 dark:text-cream-400 mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Original Passage
                      </h4>
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg font-medium">
                        {result.text}
                      </p>
                    </div>
                    
                    {/* Tokenized analysis */}
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
