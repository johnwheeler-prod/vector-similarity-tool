export interface SimilarityResult {
  text: string;
  similarity: number;
  index: number;
}

export interface SimilarityResponse {
  query: string;
  results: SimilarityResult[];
  totalPassages: number;
}


export interface RerankRequest {
  query: string;
  passages: string[];
  provider?: string;
  model?: string;
  apiKey?: string;
  rerankProvider?: 'openai' | 'google-vertex' | 'mock';
  rerankModel?: string;
  rerankApiKey?: string;
}

export interface RerankResult {
  text: string;
  originalIndex: number;
  embeddingScore: number;
  rerankScore: number;
  finalScore: number;
  rank: number;
}

export interface RerankResponse {
  query: string;
  results: RerankResult[];
  totalPassages: number;
  embeddingProvider: string;
  rerankProvider: string;
  usedRealAPI: boolean;
}
