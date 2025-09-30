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
