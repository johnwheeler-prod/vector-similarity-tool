'use client';

import React, { useState } from 'react';
import { Search, FileText, BarChart3, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const MAX_PASSAGES = 25;
import { SimilarityResult, RerankResult, RerankResponse } from '@/types';
import { useSession } from 'next-auth/react';


export default function Home() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [passages, setPassages] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [manualPassages, setManualPassages] = useState('');
  const [inputMode, setInputMode] = useState<'manual' | 'file'>('manual');
  const [uploadError, setUploadError] = useState('');
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{ name: string; rowCount: number } | null>(null);
  const [parsedPassages, setParsedPassages] = useState<string[]>([]);
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);
  const [usedRealAPI, setUsedRealAPI] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<'google' | 'openai'>('google');
  const [model, setModel] = useState<'gemini-embedding-001' | 'text-embedding-3-small' | 'text-embedding-3-large'>('gemini-embedding-001');
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [rerankProvider, setRerankProvider] = useState<'openai' | 'google-vertex' | 'mock'>('mock');
  const [rerankModel] = useState<string>('cross-encoder-ms-marco-MiniLM-L-6-v2');
  const [rerankApiKey, setRerankApiKey] = useState('');
  const [showRerankApiKey, setShowRerankApiKey] = useState(false);
  const [rerankApiKeyValid, setRerankApiKeyValid] = useState<boolean | null>(null);
  const [showRerankApiKeyValue, setShowRerankApiKeyValue] = useState(false);
  
  // Reranking state
  const [rerankResults, setRerankResults] = useState<RerankResult[]>([]);
  const [rerankLoading, setRerankLoading] = useState(false);
  const [rerankError, setRerankError] = useState('');
  const [activeTab, setActiveTab] = useState<'embedding' | 'rerank'>('embedding');
  const [rerankProviderUsed, setRerankProviderUsed] = useState<string>('');
  const [rerankRealAPIUsed, setRerankRealAPIUsed] = useState<boolean | null>(null);

  // Load API key from localStorage on component mount
  React.useEffect(() => {
    const savedApiKey = localStorage.getItem('google_ai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setApiKeyValid(true);
    }
    
    const savedRerankApiKey = localStorage.getItem('rerank_api_key');
    if (savedRerankApiKey) {
      setRerankApiKey(savedRerankApiKey);
      setRerankApiKeyValid(true);
    }
  }, []);

  // Validate API key format based on provider
  const validateApiKey = (key: string): boolean => {
    if (provider === 'google') {
      // Google AI API keys typically start with "AIza" and are 39 characters long
      return /^AIza[0-9A-Za-z_-]{35}$/.test(key);
    } else if (provider === 'openai') {
      // OpenAI API keys start with "sk-" and can contain alphanumeric chars, hyphens, and underscores
      // Length can vary from ~48 to 164+ characters
      return /^sk-[0-9A-Za-z_-]{20,200}$/.test(key);
    }
    return false;
  };

  // Validate rerank API key format based on rerank provider
  const validateRerankApiKey = (key: string): boolean => {
    if (rerankProvider === 'openai') {
      return /^sk-[0-9A-Za-z_-]{20,200}$/.test(key);
    } else if (rerankProvider === 'google-vertex') {
      // Google AI API keys start with "AIza" and are typically 39 characters total
      // Allow for slight variations in length for different Google AI services
      return /^AIza[0-9A-Za-z_-]{30,40}$/.test(key);
    }
    return true; // Mock provider doesn't need validation
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

  // Handle rerank API key input
  const handleRerankApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setRerankApiKey(key);
    setRerankApiKeyValid(key ? validateRerankApiKey(key) : null);
  };

  // Save rerank API key
  const handleRerankApiKeySubmit = () => {
    if (rerankApiKeyValid) {
      localStorage.setItem('rerank_api_key', rerankApiKey);
      setShowRerankApiKey(false);
    }
  };

  // Clear rerank API key
  const clearRerankApiKey = () => {
    setRerankApiKey('');
    setRerankApiKeyValid(null);
    localStorage.removeItem('rerank_api_key');
  };

  // Handle rerank provider change
  const handleRerankProviderChange = (newProvider: 'openai' | 'google-vertex' | 'mock') => {
    setRerankProvider(newProvider);
    // Clear rerank results when changing provider
    setRerankResults([]);
    setRerankError('');
    setRerankProviderUsed('');
    setRerankRealAPIUsed(null);
    // Reset API key validation if switching away from mock
    if (newProvider === 'mock') {
      setRerankApiKeyValid(true);
    } else {
      setRerankApiKeyValid(null);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (inputMode === 'manual') {
      setManualQuery(value);
    }
  };

  const handleManualPassagesChange = (value: string) => {
    setManualPassages(value);
    if (inputMode === 'manual') {
      setPassages(value);
    }
  };

  const resetFileUpload = () => {
    setParsedPassages([]);
    setUploadedFileMeta(null);
  };

  const handleInputModeChange = (mode: 'manual' | 'file') => {
    setInputMode(mode);
    setError('');
    if (mode === 'manual') {
      setQuery(manualQuery);
      setPassages(manualPassages);
    } else {
      setUploadError('');
      if (parsedPassages.length) {
        setPassages(parsedPassages.join('\n'));
      } else {
        setPassages('');
      }
    }
  };

  const processUploadedRows = (rows: Record<string, unknown>[], fileName: string) => {
    const normalized = rows
      .map((row) => {
        const queryValue = row.query ?? row.Query ?? row.QUERY;
        const passageValue = row.passages ?? row.Passages ?? row.PASSAGES;
        return {
          query: typeof queryValue === 'string' ? queryValue.trim() : queryValue != null ? String(queryValue).trim() : '',
          passage: typeof passageValue === 'string' ? passageValue.trim() : passageValue != null ? String(passageValue).trim() : '',
        };
      })
      .filter((row) => row.query || row.passage);

    if (!normalized.length) {
      setUploadError('No data found. Make sure the file has "query" and "passages" columns.');
      resetFileUpload();
      return;
    }

    if (normalized.length > MAX_PASSAGES) {
      setUploadError(`Please limit the file to ${MAX_PASSAGES} data rows (26 including the header).`);
      resetFileUpload();
      return;
    }

    const uniqueQueries = Array.from(new Set(normalized.map((row) => row.query).filter(Boolean)));
    if (!uniqueQueries.length) {
      setUploadError('The "query" column is required.');
      resetFileUpload();
      return;
    }

    if (uniqueQueries.length > 1) {
      setUploadError('All rows must share the same query so they can be compared together.');
      resetFileUpload();
      return;
    }

    const passageValues = normalized.map((row) => row.passage).filter(Boolean);
    if (!passageValues.length) {
      setUploadError('The "passages" column must include at least one passage.');
      resetFileUpload();
      return;
    }

    setQuery(uniqueQueries[0]);
    setPassages(passageValues.join('\n'));
    setParsedPassages(passageValues);
    setUploadedFileMeta({ name: fileName, rowCount: normalized.length });
    setUploadError('');
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    setUploadError('');

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || (extension !== 'csv' && extension !== 'xlsx')) {
      setUploadError('Only .csv or .xlsx files are supported.');
      resetFileUpload();
      return;
    }

    try {
      if (extension === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
        });

        if (parsed.errors.length) {
          throw new Error(parsed.errors[0].message);
        }

        processUploadedRows(parsed.data, file.name);
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        processUploadedRows(json, file.name);
      }

      setInputMode('file');
    } catch (err) {
      console.error('❌ File parse error:', err);
      setUploadError('Unable to read file. Ensure it is a valid CSV or XLSX with "query" and "passages" headers.');
      resetFileUpload();
    }
  };

  const clearUploadedFile = () => {
    resetFileUpload();
    setUploadError('');
    setInputMode('manual');
    setQuery(manualQuery);
    setPassages(manualPassages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    const passagesArray = passages
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (inputMode === 'file' && !parsedPassages.length) {
      setError('Upload a CSV or XLSX file with "query" and "passages" columns first.');
      return;
    }

    if (!trimmedQuery) {
      setError('Please enter a query to compare against.');
      return;
    }

    if (!passagesArray.length) {
      setError('Add at least one passage to compare.');
      return;
    }

    if (passagesArray.length > MAX_PASSAGES) {
      setError(`You can submit up to ${MAX_PASSAGES} passages at a time to stay within API limits.`);
      return;
    }

    console.log('🚀 Frontend: Starting similarity calculation');
    console.log('🔑 Frontend: API Key exists:', !!apiKey);
    console.log('🔑 Frontend: API Key length:', apiKey?.length || 0);
    console.log('🔑 Frontend: API Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
    console.log('🔑 Frontend: API Key valid:', apiKeyValid);
    console.log('📝 Frontend: Query:', query.trim());

    setLoading(true);
    setError('');

    try {
      console.log('📄 Frontend: Passages count:', passagesArray.length);

      const requestBody = {
        query: trimmedQuery,
        passages: passagesArray,
        topK: 5,
        apiKey: apiKey || undefined,
        provider: provider,
        model: model
      };

      console.log('📤 Frontend: Sending request');
      console.log('📤 Frontend: API Key in request:', !!requestBody.apiKey);

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
        apiKey: apiKey || undefined,
        rerankProvider: rerankProvider,
        rerankModel: rerankModel,
        rerankApiKey: rerankApiKey || undefined
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

  const passageCount = passages
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;

  const submitDisabled =
    loading ||
    !query.trim() ||
    !passages.trim() ||
    !passageCount ||
    passageCount > MAX_PASSAGES ||
    (inputMode === 'file' && !parsedPassages.length);

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
                setApiKey('');
                setApiKeyValid(null);
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
                setApiKey('');
                setApiKeyValid(null);
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

      {/* API Key Section */}
      <section className="max-w-4xl mx-auto px-6 py-4">
        <div className="gradient-card rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-forest-900 dark:text-cream-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-key">
                <circle cx="7.5" cy="15.5" r="5.5"></circle>
                <path d="m21 2-9.6 9.6"></path>
                <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
              </svg>
              API Configuration
            </h2>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-sm px-3 py-1 bg-forest-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300 rounded-full hover:bg-forest-200 dark:hover:bg-forest-700 transition-colors"
            >
              {showApiKey ? 'Hide' : 'Configure'}
            </button>
          </div>
          
          {apiKeyValid === true && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-lg">
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
                <label className="block text-sm font-medium text-forest-700 dark:text-cream-300 mb-2">
                  {provider === 'google' ? 'Google AI Studio API Key' : 'OpenAI API Key'}
                </label>
                <div className="relative">
                  <input
                    type={showApiKeyValue ? "text" : "password"}
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder={provider === 'google' ? "AIzaSy..." : "sk-..."}
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
                    Invalid API key format. {provider === 'google' 
                      ? 'Google AI keys start with "AIza" and are 39 characters long.'
                      : 'OpenAI keys start with "sk-" and are typically 48-164+ characters long.'
                    }
                  </p>
                )}
                <p className="text-xs text-forest-500 dark:text-cream-400 mt-2">
                  Your API key is stored locally in your browser and never sent to our servers. 
                  <a 
                    href={provider === 'google' ? "https://aistudio.google.com/app/apikey" : "https://platform.openai.com/api-keys"} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
                  >
                    Get your {provider === 'google' ? 'free' : ''} API key here
                  </a>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!apiKeyValid}
                  className="px-4 py-2 bg-amber-700 text-cream-50 rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Save API Key
                </button>
                <button
                  type="button"
                  onClick={clearApiKey}
                  className="px-4 py-2 bg-cream-200 dark:bg-forest-700 text-forest-700 dark:text-cream-300 rounded-lg hover:bg-cream-300 dark:hover:bg-forest-600 transition-colors text-sm font-medium"
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
          {/* Input mode: manual vs file */}
          <div className="gradient-card rounded-2xl p-8 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-lg font-semibold text-forest-900 dark:text-cream-100 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Provide Query &amp; Passages
                </p>
                <p className="text-sm text-forest-700 dark:text-cream-300">
                  Enter manually or upload a CSV/XLSX with shared query and up to {MAX_PASSAGES} passages.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleInputModeChange('manual')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'manual'
                      ? 'bg-forest-100 dark:bg-forest-800 text-forest-800 dark:text-forest-200 border border-forest-300 dark:border-forest-700'
                      : 'bg-cream-200 dark:bg-forest-700 text-forest-800 dark:text-cream-200 border border-transparent hover:border-cream-400 dark:hover:border-forest-500'
                  }`}
                  aria-pressed={inputMode === 'manual'}
                >
                  Manual input
                </button>
                <button
                  type="button"
                  onClick={() => handleInputModeChange('file')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'file'
                      ? 'bg-forest-100 dark:bg-forest-800 text-forest-800 dark:text-forest-200 border border-forest-300 dark:border-forest-700'
                      : 'bg-cream-200 dark:bg-forest-700 text-forest-800 dark:text-cream-200 border border-transparent hover:border-cream-400 dark:hover:border-forest-500'
                  }`}
                  aria-pressed={inputMode === 'file'}
                >
                  Upload CSV/XLSX
                </button>
              </div>
            </div>

            {inputMode === 'manual' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-forest-900 dark:text-cream-100 mb-2">
                    <Search className="inline w-4 h-4 mr-2" />
                    Search Query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="Enter your search query here..."
                    className="w-full h-28 px-6 py-4 bg-cream-50/80 dark:bg-forest-800/80 border border-cream-300 dark:border-forest-600 rounded-xl focus:ring-2 focus:ring-forest-600 focus:border-transparent resize-none text-forest-950 dark:text-cream-100 placeholder-forest-500 dark:placeholder-cream-400 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-forest-900 dark:text-cream-100 mb-2">
                    <FileText className="inline w-4 h-4 mr-2" />
                    Article Passages
                  </label>
                  <textarea
                    value={passages}
                    onChange={(e) => handleManualPassagesChange(e.target.value)}
                    placeholder="Enter article passages, one per line..."
                    className="w-full h-52 px-6 py-4 bg-cream-50/80 dark:bg-forest-800/80 border border-cream-300 dark:border-forest-600 rounded-xl focus:ring-2 focus:ring-forest-600 focus:border-transparent resize-none text-forest-950 dark:text-cream-100 placeholder-forest-500 dark:placeholder-cream-400 backdrop-blur-sm transition-all duration-200"
                    required
                  />
                  <div className="mt-3 flex items-center justify-between text-sm text-forest-600 dark:text-cream-400 font-medium">
                    <span>
                      Each line is a separate passage. We cap at {MAX_PASSAGES} to keep requests under rate limits.
                    </span>
                    <span className={`${passageCount > MAX_PASSAGES ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {passageCount}/{MAX_PASSAGES}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-forest-800 dark:text-cream-200 mb-2">
                    Upload a .csv or .xlsx with header columns &quot;query&quot; and &quot;passages&quot;
                  </label>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => handleFileUpload(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-forest-800 dark:text-cream-200 bg-white/80 dark:bg-forest-800/80 border border-cream-300 dark:border-forest-700 rounded-lg file:mr-4 file:py-2 file:px-3 file:border-0 file:bg-forest-100 file:text-forest-900 dark:file:bg-forest-700 dark:file:text-cream-100 cursor-pointer"
                  />
                  <p className="text-xs text-forest-600 dark:text-cream-400 mt-2">
                    Up to 26 rows total (1 header + {MAX_PASSAGES} data rows). All rows must share the same query.
                  </p>
                </div>

                {uploadError && (
                  <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 text-sm p-3">
                    {uploadError}
                  </div>
                )}

                {uploadedFileMeta && parsedPassages.length > 0 && (
                  <div className="rounded-xl border border-forest-200 dark:border-forest-700 bg-forest-50/70 dark:bg-forest-900/30 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-forest-900 dark:text-cream-100">{uploadedFileMeta.name}</p>
                        <p className="text-xs text-forest-700 dark:text-cream-300">
                          Loaded {uploadedFileMeta.rowCount} rows • {parsedPassages.length} passages ready
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearUploadedFile}
                        className="text-xs px-3 py-1 bg-cream-200 dark:bg-forest-700 text-forest-800 dark:text-cream-200 rounded-lg hover:bg-cream-300 dark:hover:bg-forest-600 transition-colors"
                      >
                        Clear file
                      </button>
                    </div>
                    <div className="text-xs text-forest-700 dark:text-cream-300">
                      Query (applied to all passages):
                      <div className="mt-1 p-2 rounded-lg bg-white/60 dark:bg-forest-800/60 border border-cream-200 dark:border-forest-700">
                        {query || '—'}
                      </div>
                    </div>
                    <div className="text-xs text-forest-700 dark:text-cream-300">
                      First {Math.min(3, parsedPassages.length)} passages:
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        {parsedPassages.slice(0, 3).map((p, idx) => (
                          <li key={idx} className="truncate" title={p}>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitDisabled}
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

                    {/* Rerank API Key Configuration */}
                    {rerankProvider !== 'mock' && (
                      <div className="bg-gradient-to-r from-amber-50 to-forest-50 dark:from-amber-900/20 dark:to-forest-900/20 rounded-xl p-4 border border-amber-200/50 dark:border-amber-700/50">
                        <h4 className="text-sm font-semibold text-forest-700 dark:text-cream-300 mb-3 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <circle cx="12" cy="16" r="1"></circle>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          {rerankProvider === 'openai' ? 'OpenAI' : 'Google Vertex AI'} API Key
                        </h4>
                        
                        {!showRerankApiKey ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {rerankApiKeyValid ? (
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 12l2 2 4-4"></path>
                                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                                    <path d="M13 12h3a2 2 0 0 1 2 2v1"></path>
                                    <path d="M13 12h-3a2 2 0 0 0-2 2v1"></path>
                                  </svg>
                                  <span className="text-sm font-medium">
                                    {showRerankApiKeyValue ? rerankApiKey : '••••••••••••••••'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-forest-500 dark:text-cream-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <circle cx="12" cy="16" r="1"></circle>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                  </svg>
                                  <span className="text-sm">No API key configured</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {rerankApiKeyValid && (
                                <button
                                  onClick={() => setShowRerankApiKeyValue(!showRerankApiKeyValue)}
                                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                  {showRerankApiKeyValue ? 'Hide' : 'Show'}
                                </button>
                              )}
                              <button
                                onClick={() => setShowRerankApiKey(true)}
                                className="text-xs bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-lg transition-colors"
                              >
                                {rerankApiKeyValid ? 'Change' : 'Add'} API Key
                              </button>
                              {rerankApiKeyValid && (
                                <button
                                  onClick={clearRerankApiKey}
                                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <input
                                type="password"
                                value={rerankApiKey}
                                onChange={handleRerankApiKeyChange}
                                placeholder={`Enter your ${rerankProvider === 'openai' ? 'OpenAI' : 'Google Vertex AI'} API key`}
                                className="w-full px-3 py-2 border border-cream-300 dark:border-forest-600 rounded-lg bg-cream-50 dark:bg-forest-700 text-forest-900 dark:text-cream-100 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              />
                              {rerankApiKeyValid === false && (
                                <p className="text-red-500 text-xs mt-1">
                                  Invalid {rerankProvider === 'openai' ? 'OpenAI' : 'Google Vertex AI'} API key format
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-forest-500 dark:text-cream-400">
                                {rerankProvider === 'openai' ? (
                                  <>Get your OpenAI API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">OpenAI Platform</a></>
                                ) : (
                                  <>Get your Google Vertex AI key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Google Cloud Console</a></>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setShowRerankApiKey(false)}
                                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleRerankApiKeySubmit}
                                  disabled={!rerankApiKeyValid}
                                  className="text-xs bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                            
                            {/* Show rerank button only if conditions are met */}
                            {(rerankProvider === 'mock' || rerankApiKeyValid) && (
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
                            )}
                            
                            {/* Show message if API key is required but not configured */}
                            {rerankProvider !== 'mock' && !rerankApiKeyValid && (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mt-4">
                                <div className="flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600 dark:text-yellow-400">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                  </svg>
                                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                                    {rerankProvider === 'openai' ? 'OpenAI' : 'Google Vertex AI'} API key required
                                  </span>
                                </div>
                              </div>
                            )}
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
