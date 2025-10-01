import { GoogleGenerativeAI } from '@google/generative-ai';
import { TokenSuggestion } from '@/types';

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
  private model: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private apiKey: string | undefined;
  private usedRealAPI: boolean = false;

  constructor(apiKey?: string) {
    // Use provided API key or fall back to environment variable
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY;
    
    console.log('🔧 EmbeddingService constructor called');
    console.log('🔑 API Key provided:', !!apiKey);
    console.log('🔑 Environment API Key exists:', !!process.env.GOOGLE_API_KEY);
    console.log('🔑 Final API Key length:', this.apiKey?.length || 0);
    console.log('🔑 API Key preview:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'None');
    
    if (!this.apiKey) {
      console.log('⚠️ No API key found - will use mock embeddings');
    } else {
      console.log('✅ API key found - will attempt real API calls');
      // Validate API key format
      if (!/^AIza[0-9A-Za-z_-]{35}$/.test(this.apiKey)) {
        console.log('❌ Invalid API key format detected');
      } else {
        console.log('✅ API key format is valid');
      }
    }
    
    const client = new GoogleGenerativeAI(this.apiKey || '');
    this.model = client.getGenerativeModel({ model: 'gemini-embedding-001' });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    console.log('🚀 generateEmbedding called for text:', text.substring(0, 50) + '...');
    
    if (!this.apiKey) {
      console.log('🔄 No API key, using mock embedding');
      return this.generateMockEmbedding(text);
    }
    
    try {
      console.log('🌐 Making API call to Google AI...');
      const startTime = Date.now();
      
      const result = await this.model.embedContent(text);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Google AI API call successful (${duration}ms)`);
      console.log(`📊 Embedding dimensions: ${result.embedding.values.length}`);
      console.log(`📊 First few values:`, result.embedding.values.slice(0, 5));
      
      this.usedRealAPI = true;
      return result.embedding.values;
    } catch (error) {
      console.error('❌ Google AI API call failed:', error);
      console.log('🔄 Falling back to mock embedding');
      return this.generateMockEmbedding(text);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`🚀 generateEmbeddings called for ${texts.length} texts`);
    
    if (!this.apiKey) {
      console.log('🔄 No API key, using mock embeddings');
      return texts.map(text => this.generateMockEmbedding(text));
    }
    
    try {
      console.log('🌐 Making batch API call to Google AI...');
      const startTime = Date.now();
      
      const results = await Promise.all(
        texts.map(text => this.model.embedContent(text))
      );
      
      const duration = Date.now() - startTime;
      console.log(`✅ Google AI batch API call successful (${duration}ms)`);
      console.log(`📊 Generated ${results.length} embeddings`);
      
      this.usedRealAPI = true;
      return results.map(result => result.embedding.values);
    } catch (error) {
      console.error('❌ Google AI batch API call failed:', error);
      console.log('🔄 Falling back to mock embeddings');
      return texts.map(text => this.generateMockEmbedding(text));
    }
  }

  // Check if real API calls were made
  public wasRealAPIUsed(): boolean {
    return this.usedRealAPI;
  }

  private generateMockEmbedding(text: string): number[] {
    console.log('🎭 Generating mock embedding for:', text.substring(0, 30) + '...');
    
    // Generate n-gram hash embeddings for better semantic meaning
    const nGrams = this.generateNGrams(text.toLowerCase(), 2, 4); // 2-4 character n-grams
    const wordNGrams = this.generateWordNGrams(text.toLowerCase(), 1, 3); // 1-3 word n-grams
    
    // Combine character and word n-grams
    const allNGrams = [...nGrams, ...wordNGrams];
    
    // Create a 768-dimensional embedding (matching Google's embedding-001)
    const embedding = new Array(768).fill(0);
    
    // Distribute n-gram features across dimensions
    allNGrams.forEach(ngram => {
      const hash = this.hashString(ngram);
      // Use multiple dimensions for each n-gram to create richer representations
      for (let i = 0; i < 8; i++) {
        const dimension = (hash + i * 97) % 768; // Distribute across dimensions
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
    
    console.log('🎭 Mock embedding generated, dimensions:', embedding.length);
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

  // Calculate cosine similarity between two vectors
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
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