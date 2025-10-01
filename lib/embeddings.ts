import { GoogleGenerativeAI } from '@google/generative-ai';
import { TokenSuggestion } from '@/types';

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export class EmbeddingService {
  private model: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    // Use the embedding model
    this.model = genAI.getGenerativeModel({ model: 'embedding-001' });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Check if API key is available
      if (!process.env.GOOGLE_API_KEY) {
        console.warn('GOOGLE_API_KEY not found, using mock embedding');
        // Return a mock embedding for development/testing
        return this.generateMockEmbedding(text);
      }
      
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate n-gram hash embeddings for better semantic meaning
    const nGrams = this.generateNGrams(text.toLowerCase(), 2, 4); // 2-4 character n-grams
    const wordNGrams = this.generateWordNGrams(text.toLowerCase(), 1, 3); // 1-3 word n-grams
    
    // Combine character and word n-grams
    const allNGrams = [...nGrams, ...wordNGrams];
    
    // Generate 768-dimensional vector using n-gram hashes
    const embedding = new Array(768).fill(0);
    
    allNGrams.forEach(ngram => {
      const hash = this.hashString(ngram);
      // Distribute hash across multiple dimensions for better coverage
      for (let i = 0; i < 8; i++) {
        const dimension = (hash + i * 97) % 768; // Use prime number for better distribution
        const value = Math.sin(hash + i) * (1 / Math.sqrt(allNGrams.length));
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
    
    return embedding;
  }

  private generateNGrams(text: string, minN: number, maxN: number): string[] {
    const ngrams: string[] = [];
    // Use SentencePiece-style preprocessing (similar to Google's approach)
    const cleanText = this.preprocessText(text);
    
    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i <= cleanText.length - n; i++) {
        const ngram = cleanText.slice(i, i + n);
        if (ngram.trim().length > 0) {
          ngrams.push(ngram);
        }
      }
    }
    
    return ngrams;
  }

  private generateWordNGrams(text: string, minN: number, maxN: number): string[] {
    // Use SentencePiece-style word tokenization
    const words = this.tokenizeWords(text);
    const ngrams: string[] = [];
    
    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
        if (ngram.trim().length > 0) {
          ngrams.push(ngram);
        }
      }
    }
    
    return ngrams;
  }

  private preprocessText(text: string): string {
    // SentencePiece-style preprocessing similar to Google's models
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Remove punctuation, keep letters/numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private tokenizeWords(text: string): string[] {
    // Word-level tokenization similar to SentencePiece
    const preprocessed = this.preprocessText(text);
    return preprocessed
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => this.normalizeWord(word));
  }

  private normalizeWord(word: string): string {
    // Basic normalization similar to Google's tokenization
    return word
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '') // Remove non-alphanumeric
      .trim();
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

  /**
   * Generate semantic token suggestions for improving similarity scores
   * This simulates what Google's API might provide for token recommendations
   */
  generateTokenSuggestions(text: string, query: string): TokenSuggestion[] {
    const textTokens = this.tokenizeWords(text);
    const queryTokens = this.tokenizeWords(query);
    const suggestions: TokenSuggestion[] = [];

    textTokens.forEach((token, index) => {
      const hasQueryMatch = queryTokens.some(qToken => 
        this.calculateTokenSimilarity(token, qToken) > 0.5
      );

      if (!hasQueryMatch) {
        // Generate semantic suggestions for unmatched tokens
        const semanticSuggestions = this.generateSemanticVariations(token, queryTokens);
        suggestions.push({
          originalToken: token,
          position: index,
          suggestions: semanticSuggestions,
          reason: 'No semantic match with query tokens'
        });
      }
    });

    return suggestions;
  }

  private calculateTokenSimilarity(token1: string, token2: string): number {
    // Simple semantic similarity based on character overlap and edit distance
    const set1 = new Set(token1.toLowerCase());
    const set2 = new Set(token2.toLowerCase());
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const jaccardSimilarity = intersection.size / union.size;
    const editDistance = this.calculateEditDistance(token1.toLowerCase(), token2.toLowerCase());
    const maxLength = Math.max(token1.length, token2.length);
    const editSimilarity = maxLength > 0 ? (maxLength - editDistance) / maxLength : 0;
    
    return (jaccardSimilarity + editSimilarity) / 2;
  }

  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private generateSemanticVariations(token: string, queryTokens: string[]): string[] {
    const variations: string[] = [];
    
    // Find similar tokens from query
    queryTokens.forEach(queryToken => {
      if (this.calculateTokenSimilarity(token, queryToken) > 0.3) {
        variations.push(queryToken);
      }
    });

    // Generate common variations
    const commonVariations = this.getCommonWordVariations(token);
    variations.push(...commonVariations);

    // Remove duplicates and limit to top suggestions
    return [...new Set(variations)].slice(0, 5);
  }

  private getCommonWordVariations(word: string): string[] {
    // Common morphological variations and synonyms (basic implementation)
    const variations: string[] = [];
    
    // Plural/singular variations
    if (word.endsWith('s') && word.length > 3) {
      variations.push(word.slice(0, -1)); // Remove 's'
    } else {
      variations.push(word + 's'); // Add 's'
    }

    // Common suffixes
    const suffixes = ['ing', 'ed', 'er', 'ly'];
    suffixes.forEach(suffix => {
      if (!word.endsWith(suffix)) {
        variations.push(word + suffix);
      }
    });

    // Remove common suffixes
    const removeSuffixes = ['ing', 'ed', 'er', 'ly', 's'];
    removeSuffixes.forEach(suffix => {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        variations.push(word.slice(0, -suffix.length));
      }
    });

    return variations;
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const promises = texts.map(async (text) => ({
      embedding: await this.generateEmbedding(text),
      text
    }));

    return Promise.all(promises);
  }
}

// Cosine similarity calculation
export function cosineSimilarity(a: number[], b: number[]): number {
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

// Find most similar passages
export function findMostSimilar(
  queryEmbedding: number[],
  passages: EmbeddingResult[],
  topK: number = 5
): Array<{ text: string; similarity: number; index: number }> {
  const similarities = passages.map((passage, index) => ({
    text: passage.text,
    similarity: cosineSimilarity(queryEmbedding, passage.embedding),
    index
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
