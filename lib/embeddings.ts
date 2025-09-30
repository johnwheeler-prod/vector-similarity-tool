import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
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
    const words = text.split(/\s+/).filter(word => word.length > 0);
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

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
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
