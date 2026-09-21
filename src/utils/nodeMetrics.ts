import type { GraphNode } from '../types/graph';
import { countPhraseOccurrences } from './phraseMatcher';

/**
 * Counts total occurrences of key phrases across the entire Obsidian vault:
 * including folder/chapter names, note file titles, subsection headings, and markdown text content.
 */
export function countVaultKeyphraseOccurrences(
  allNodes: GraphNode[],
  phrases: string[]
): number {
  if (!phrases || phrases.length === 0) return 0;
  
  const validPhrases = phrases.map(p => p.trim()).filter(p => p.length > 0);
  if (validPhrases.length === 0) return 0;

  let totalCount = 0;

  allNodes.forEach(node => {
    const textPieces = [
      node.labelEn || '',
      node.labelCn || '',
      node.rawText || '',
      node.filePath || '',
    ];
    const fullText = textPieces.join('\n');

    validPhrases.forEach(phrase => {
      const count = countPhraseOccurrences(fullText, phrase);
      totalCount += count;
    });
  });

  return totalCount;
}

/**
 * Calculates node Size Level (1 to 8, or 1 to 9 if manual override):
 *
 * Rule specification:
 * - Size 1: connections <= 2 (frequency doesn't matter)
 * - Size 2: 3 <= connections <= 6 and frequency <= 10
 * - Size 3: 3 <= connections <= 6 and frequency > 10
 * - Size 4: connections > 6 and (connections + frequency) <= 50
 * - Size 5: connections > 6 and 51 <= (connections + frequency) <= 100
 * - Size 6: connections > 6 and 101 <= (connections + frequency) <= 300
 * - Size 7: connections > 6 and 301 <= (connections + frequency) <= 600
 * - Size 8: connections > 6 and (connections + frequency) > 600
 *
 * Default sizes for initial hierarchy nodes without phrases:
 * - Sections: 7
 * - Subsections: 3
 * - Chapters: 8
 * - New custom concept nodes: 2
 */
export function calculateNodeSizeLevel(
  node: GraphNode,
  connectionsCount?: number,
  vaultFrequency?: number
): number {
  if (node.customSizeLevel !== undefined && node.customSizeLevel >= 1 && node.customSizeLevel <= 9) {
    return node.customSizeLevel;
  }

  const C = connectionsCount !== undefined ? connectionsCount : (node.connectedCount || 0);
  const F = vaultFrequency !== undefined ? vaultFrequency : (node.frequency || 0);

  // If node has key phrases (or frequency has been scanned)
  if (node.keyPhrases && node.keyPhrases.length > 0) {
    const total = C + F;

    if (C <= 2) {
      return 1;
    }
    if (C >= 3 && C <= 6) {
      return F <= 10 ? 2 : 3;
    }
    // C > 6
    if (total <= 50) return 4;
    if (total <= 100) return 5;
    if (total <= 300) return 6;
    if (total <= 600) return 7;
    return 8;
  }

  // Default values for nodes without key phrases
  if (node.type === 'section') return 7;
  if (node.type === 'subsection') return 3;
  if (node.type === 'chapter') return 8;
  if (node.type === 'concept') return 2;
  if (node.type === 'merged') return 4;

  return 2;
}

/**
 * Maps Size Level (1 to 9) to pixel radius for canvas and SVG rendering
 */
export function sizeLevelToRadius(sizeLevel: number): number {
  const level = Math.max(1, Math.min(9, Math.round(sizeLevel)));
  const radiusMap: Record<number, number> = {
    1: 13,
    2: 17,
    3: 22,
    4: 27,
    5: 33,
    6: 40,
    7: 48,
    8: 57,
    9: 68,
  };
  return radiusMap[level] || 20;
}

/**
 * Returns effective radius of a node
 */
export function getNodeEffectiveRadius(
  node: GraphNode,
  connectionsCount?: number,
  frequency?: number
): number {
  const level = calculateNodeSizeLevel(node, connectionsCount, frequency);
  return sizeLevelToRadius(level);
}
