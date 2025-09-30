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
    // Generate a deterministic mock embedding based on text content
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Generate 768-dimensional vector (typical embedding size)
    const embedding = new Array(768).fill(0);
    for (let i = 0; i < 768; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1;
    }
    
    return embedding;
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
