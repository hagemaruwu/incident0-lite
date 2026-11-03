export const EMBEDDING_DIM = 768;

/**
 * Generates a 768-dimensional L2-normalized vector from error text.
 * Uses deterministic feature hashing for offline demonstration reproducibility.
 */
export function generateEmbedding(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM).fill(0.001);
  const normalized = text.toLowerCase();

  // Project domain error signatures into distinct feature coordinate clusters
  if (/(pool|exhaust|client|connection|timeout)/.test(normalized)) {
    for (let i = 0; i < 10; i++) vec[i] += 2.5;
  }
  if (/(webhook|stripe|hmac|signature)/.test(normalized)) {
    for (let i = 20; i < 30; i++) vec[i] += 2.5;
  }
  if (/(deadlock|lock|40p01|blocked)/.test(normalized)) {
    for (let i = 40; i < 50; i++) vec[i] += 2.5;
  }

  // Hash arbitrary characters across dimensions
  for (let i = 0; i < text.length; i++) {
    const idx = (text.charCodeAt(i) * 31 + i) % EMBEDDING_DIM;
    vec[idx] += 0.05;
  }

  // L2 Unit Normalization (ensures cosine distance <=> works accurately)
  let sumSq = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;
  const result: number[] = new Array(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    result[i] = Number((vec[i] / norm).toFixed(6));
  }

  return result;
}
