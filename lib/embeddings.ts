import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { TokenSuggestion } from '@/types';

export type EmbeddingProvider = 'google' | 'openai';
export type EmbeddingModel = 'gemini-embedding-001' | 'text-embedding-3-small' | 'text-embedding-3-large';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export interface SimilarityResult {
  text: string;
  similarity: number;
  index: number;
}

export class EmbeddingService {
  private googleModel: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private openaiClient: OpenAI | null = null;
  private provider: EmbeddingProvider;
  private model: EmbeddingModel;
  private apiKey: string | undefined;
  private usedRealAPI: boolean = false;

  constructor(provider: EmbeddingProvider = 'google', model: EmbeddingModel = 'gemini-embedding-001', apiKey?: string) {
    this.provider = provider;
    this.model = model;
    this.apiKey = apiKey || this.getDefaultApiKey(provider);
    
    console.log('🔧 EmbeddingService constructor called');
    console.log('🔧 Provider:', provider);
    console.log('🔧 Model:', model);
    console.log('🔑 API Key provided:', !!apiKey);
    console.log('🔑 Environment API Key exists:', !!this.apiKey);
    console.log('🔑 Final API Key length:', this.apiKey?.length || 0);
    console.log('🔑 API Key preview:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'None');
    
    if (!this.apiKey) {
      console.log('⚠️ No API key found - will use mock embeddings');
    } else {
      console.log('✅ API key found - will attempt real API calls');
      this.validateApiKey();
    }
    
    this.initializeProvider();
  }

  private getDefaultApiKey(provider: EmbeddingProvider): string | undefined {
    if (provider === 'google') {
      return process.env.GOOGLE_API_KEY;
    } else if (provider === 'openai') {
      return process.env.OPENAI_API_KEY;
    }
    return undefined;
  }

  private validateApiKey(): void {
    if (this.provider === 'google') {
      if (!/^AIza[0-9A-Za-z_-]{35}$/.test(this.apiKey || '')) {
        console.log('❌ Invalid Google AI API key format detected');
      } else {
        console.log('✅ Google AI API key format is valid');
      }
    } else if (this.provider === 'openai') {
      // OpenAI keys start with "sk-" and can contain alphanumeric chars, hyphens, and underscores
      // Length can vary from ~48 to 164+ characters
      if (!/^sk-[0-9A-Za-z_-]{20,200}$/.test(this.apiKey || '')) {
        console.log('❌ Invalid OpenAI API key format detected');
      } else {
        console.log('✅ OpenAI API key format is valid');
      }
    }
  }

  private initializeProvider(): void {
    if (!this.apiKey) {
      console.log('⚠️ No API key - providers not initialized');
      return;
    }

    if (this.provider === 'google') {
      const client = new GoogleGenerativeAI(this.apiKey);
      this.googleModel = client.getGenerativeModel({ model: this.model as 'gemini-embedding-001' });
      console.log('🔧 Google AI client initialized');
    } else if (this.provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
      });
      console.log('🔧 OpenAI client initialized');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    console.log('🚀 generateEmbedding called for text:', text.substring(0, 50) + '...');
    
    if (!this.apiKey) {
      console.log('🔄 No API key, using mock embedding');
      return this.generateMockEmbedding(text);
    }
    
    try {
      console.log(`🌐 Making API call to ${this.provider.toUpperCase()}...`);
      const startTime = Date.now();
      
      let result: number[];
      
      if (this.provider === 'google') {
        result = await this.generateGoogleEmbedding(text);
      } else if (this.provider === 'openai') {
        result = await this.generateOpenAIEmbedding(text);
      } else {
        throw new Error(`Unsupported provider: ${this.provider}`);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${this.provider.toUpperCase()} API call successful (${duration}ms)`);
      console.log(`📊 Embedding dimensions: ${result.length}`);
      console.log(`📊 First few values:`, result.slice(0, 5));
      
      this.usedRealAPI = true;
      return result;
    } catch (error) {
      console.error(`❌ ${this.provider.toUpperCase()} API call failed:`, error);
      console.log('🔄 Falling back to mock embedding');
      return this.generateMockEmbedding(text);
    }
  }

  private async generateGoogleEmbedding(text: string): Promise<number[]> {
    const result = await this.googleModel.embedContent(text);
    return result.embedding.values;
  }

  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    const response = await this.openaiClient!.embeddings.create({
      model: this.model as 'text-embedding-3-small' | 'text-embedding-3-large',
      input: text,
    });
    return response.data[0].embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`🚀 generateEmbeddings called for ${texts.length} texts`);
    
    if (!this.apiKey) {
      console.log('🔄 No API key, using mock embeddings');
      return texts.map(text => this.generateMockEmbedding(text));
    }
    
    try {
      console.log(`🌐 Making batch API call to ${this.provider.toUpperCase()}...`);
      const startTime = Date.now();
      
      let results: number[][];
      
      if (this.provider === 'google') {
        results = await this.generateGoogleEmbeddings(texts);
      } else if (this.provider === 'openai') {
        results = await this.generateOpenAIEmbeddings(texts);
      } else {
        throw new Error(`Unsupported provider: ${this.provider}`);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${this.provider.toUpperCase()} batch API call successful (${duration}ms)`);
      console.log(`📊 Generated ${results.length} embeddings`);
      
      this.usedRealAPI = true;
      return results;
    } catch (error) {
      console.error(`❌ ${this.provider.toUpperCase()} batch API call failed:`, error);
      console.log('🔄 Falling back to mock embeddings');
      return texts.map(text => this.generateMockEmbedding(text));
    }
  }

  private async generateGoogleEmbeddings(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(
      texts.map(text => this.googleModel.embedContent(text))
    );
    return results.map(result => result.embedding.values);
  }

  private async generateOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.openaiClient!.embeddings.create({
      model: this.model as 'text-embedding-3-small' | 'text-embedding-3-large',
      input: texts,
    });
    return response.data.map(item => item.embedding);
  }


  private generateMockEmbedding(text: string): number[] {
    console.log('🎭 Generating mock embedding for:', text.substring(0, 30) + '...');
    
    // Generate n-gram hash embeddings for better semantic meaning
    const nGrams = this.generateNGrams(text.toLowerCase(), 2, 4); // 2-4 character n-grams
    const wordNGrams = this.generateWordNGrams(text.toLowerCase(), 1, 3); // 1-3 word n-grams
    
    // Combine character and word n-grams
    const allNGrams = [...nGrams, ...wordNGrams];
    
    // Create a dimension size based on the provider (OpenAI uses different dimensions)
    const dimensions = this.provider === 'openai' ? 
      (this.model === 'text-embedding-3-large' ? 3072 : 1536) : 768;
    
    // Create embedding
    const embedding = new Array(dimensions).fill(0);
    
    // Distribute n-gram features across dimensions
    allNGrams.forEach(ngram => {
      const hash = this.hashString(ngram);
      // Use multiple dimensions for each n-gram to create richer representations
      for (let i = 0; i < 8; i++) {
        const dimension = (hash + i * 97) % dimensions; // Distribute across dimensions
        const value = Math.sin(hash + i) * (1 / Math.sqrt(allNGrams.length)); // Normalize by n-gram count
        embedding[dimension] += value;
      }
    });
    
    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / norm;
      }
    }
    
    console.log(`🎭 Mock embedding generated, dimensions: ${embedding.length}`);
    return embedding;
  }

  private generateNGrams(text: string, minN: number, maxN: number): string[] {
    const ngrams: string[] = [];
    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i <= text.length - n; i++) {
        ngrams.push(text.substring(i, i + n));
      }
    }
    return ngrams;
  }

  private generateWordNGrams(text: string, minN: number, maxN: number): string[] {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const ngrams: string[] = [];
    
    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
      }
    }
    
    return ngrams;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }


  // Find most similar passages to a query
  static findMostSimilar(
    queryEmbedding: number[],
    passageEmbeddings: number[][],
    topK: number = 5
  ): SimilarityResult[] {
    const similarities = passageEmbeddings.map((embedding, index) => ({
      index,
      similarity: EmbeddingService.cosineSimilarity(queryEmbedding, embedding)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(({ index, similarity }) => ({
        text: `Passage ${index + 1}`, // This will be replaced with actual text
        similarity,
        index
      }));
  }

  // Advanced tokenization for similarity analysis
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Remove punctuation, keep letters/numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private tokenizeWords(text: string): string[] {
    const preprocessed = this.preprocessText(text);
    return preprocessed
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => this.normalizeWord(word));
  }

  private normalizeWord(word: string): string {
    return word
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '') // Remove non-alphanumeric
      .trim();
  }

  private calculateTokenSimilarity(token1: string, token2: string): number {
    // Simple similarity based on edit distance and common characters
    const editDist = this.calculateEditDistance(token1, token2);
    const maxLen = Math.max(token1.length, token2.length);
    
    if (maxLen === 0) return 1;
    
    const editSimilarity = 1 - (editDist / maxLen);
    
    // Jaccard similarity for character n-grams
    const chars1 = new Set(token1.split(''));
    const chars2 = new Set(token2.split(''));
    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);
    const jaccardSimilarity = intersection.size / union.size;
    
    return (editSimilarity + jaccardSimilarity) / 2;
  }

  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private generateSemanticVariations(token: string, queryTokens: string[]): string[] {
    const variations = new Set<string>();
    
    // Add common word variations
    const commonVariations = this.getCommonWordVariations(token);
    commonVariations.forEach(variation => {
      if (this.calculateTokenSimilarity(variation, token) > 0.3) {
        variations.add(variation);
      }
    });
    
    // Add morphological variations
    const morphologicalVariations = this.getMorphologicalVariations(token);
    morphologicalVariations.forEach(variation => {
      if (this.calculateTokenSimilarity(variation, token) > 0.4) {
        variations.add(variation);
      }
    });
    
    // Add query token variations that are similar
    queryTokens.forEach(queryToken => {
      if (this.calculateTokenSimilarity(token, queryToken) > 0.5) {
        variations.add(queryToken);
      }
    });
    
    return Array.from(variations).slice(0, 5); // Limit to 5 suggestions
  }

  private getCommonWordVariations(word: string): string[] {
    const variations: string[] = [];
    
    // Common word variations
    const wordMap: { [key: string]: string[] } = {
      'run': ['running', 'runs', 'ran'],
      'walk': ['walking', 'walks', 'walked'],
      'go': ['going', 'goes', 'went', 'gone'],
      'see': ['seeing', 'sees', 'saw', 'seen'],
      'come': ['coming', 'comes', 'came'],
      'get': ['getting', 'gets', 'got', 'gotten'],
      'make': ['making', 'makes', 'made'],
      'take': ['taking', 'takes', 'took', 'taken'],
      'give': ['giving', 'gives', 'gave', 'given'],
      'know': ['knowing', 'knows', 'knew', 'known']
    };
    
    const lowerWord = word.toLowerCase();
    if (wordMap[lowerWord]) {
      variations.push(...wordMap[lowerWord]);
    }
    
    return variations;
  }

  private getMorphologicalVariations(word: string): string[] {
    const variations: string[] = [];
    
    // Simple morphological variations
    if (word.endsWith('ing')) {
      variations.push(word.slice(0, -3)); // remove 'ing'
      variations.push(word.slice(0, -3) + 'e'); // add 'e'
    }
    
    if (word.endsWith('ed')) {
      variations.push(word.slice(0, -2)); // remove 'ed'
      variations.push(word.slice(0, -2) + 'e'); // add 'e'
    }
    
    if (word.endsWith('s') && word.length > 3) {
      variations.push(word.slice(0, -1)); // remove 's'
    }
    
    if (word.endsWith('ly')) {
      variations.push(word.slice(0, -2)); // remove 'ly'
    }
    
    return variations.filter(v => v.length > 2);
  }

  generateTokenSuggestions(text: string, query: string): TokenSuggestion[] {
    console.log('🔍 Generating token suggestions for:', text.substring(0, 50) + '...');
    
    const textTokens = this.tokenizeWords(text);
    const queryTokens = this.tokenizeWords(query);
    const suggestions: TokenSuggestion[] = [];

    textTokens.forEach((token, index) => {
      const hasQueryMatch = queryTokens.some(qToken =>
        this.calculateTokenSimilarity(token, qToken) > 0.5
      );

      if (!hasQueryMatch) {
        const semanticSuggestions = this.generateSemanticVariations(token, queryTokens);
        if (semanticSuggestions.length > 0) {
          suggestions.push({
            originalToken: token,
            position: index,
            suggestions: semanticSuggestions,
            reason: 'No semantic match with query tokens'
          });
        }
      }
    });

    console.log(`🔍 Generated ${suggestions.length} token suggestions`);
    return suggestions;
  }

  // Public methods for external access
  public wasRealAPIUsed(): boolean {
    return this.usedRealAPI;
  }

  public getProvider(): EmbeddingProvider {
    return this.provider;
  }

  public getModel(): EmbeddingModel {
    return this.model;
  }

  public getTotalTokensUsed(): number {
    // For now, return a mock token count
    // In the future, this should track actual token usage
    return this.usedRealAPI ? 100 : 0;
  }

  // Static method for cosine similarity calculation
  public static cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }
}

// Export utility functions
export function findMostSimilar(
  queryEmbedding: number[],
  passageEmbeddings: number[][],
  passages: string[],
  topK: number = 5
): SimilarityResult[] {
  const similarities = passageEmbeddings.map((embedding, index) => ({
    index,
    similarity: EmbeddingService.cosineSimilarity(queryEmbedding, embedding)
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map(({ index, similarity }) => ({
      text: passages[index],
      similarity,
      index
    }));
}