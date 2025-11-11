// utils/analytics/text-similarity.ts
/**
 * Lightweight text similarity without external dependencies
 * Uses cosine similarity with simple tokenization
 */

export interface SimilarityResult {
  text: string;
  score: number;
}

/**
 * Simple tokenizer: lowercase, remove punctuation, split on whitespace
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Create term frequency map (bag of words)
 */
function createBagOfWords(tokens: string[]): Map<string, number> {
  const bow = new Map<string, number>();
  for (const token of tokens) {
    bow.set(token, (bow.get(token) || 0) + 1);
  }
  return bow;
}

/**
 * Calculate cosine similarity between two bag-of-words
 */
export function cosineSimilarity(bowA: Map<string, number>, bowB: Map<string, number>): number {
  // Get all unique terms
  const allTerms = new Set([...bowA.keys(), ...bowB.keys()]);
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (const term of allTerms) {
    const freqA = bowA.get(term) || 0;
    const freqB = bowB.get(term) || 0;
    
    dotProduct += freqA * freqB;
    magnitudeA += freqA * freqA;
    magnitudeB += freqB * freqB;
  }
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Find similar texts using cosine similarity
 */
export function findSimilar(
  query: string,
  candidates: string[],
  threshold: number = 0.5,
  topK: number = 5
): SimilarityResult[] {
  const queryTokens = tokenize(query);
  const queryBow = createBagOfWords(queryTokens);
  
  const results: SimilarityResult[] = [];
  
  for (const candidate of candidates) {
    const candidateTokens = tokenize(candidate);
    const candidateBow = createBagOfWords(candidateTokens);
    
    const score = cosineSimilarity(queryBow, candidateBow);
    
    if (score >= threshold) {
      results.push({ text: candidate, score });
    }
  }
  
  // Sort by score descending and take top K
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Jaccard similarity for sets (alternative method)
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Find similar texts using Jaccard similarity
 */
export function findSimilarJaccard(
  query: string,
  candidates: string[],
  threshold: number = 0.3,
  topK: number = 5
): SimilarityResult[] {
  const queryTokens = new Set(tokenize(query));
  
  const results: SimilarityResult[] = [];
  
  for (const candidate of candidates) {
    const candidateTokens = new Set(tokenize(candidate));
    const score = jaccardSimilarity(queryTokens, candidateTokens);
    
    if (score >= threshold) {
      results.push({ text: candidate, score });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
