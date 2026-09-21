import type { GraphNode, GraphEdge, InfoBadge } from '../types/graph';
import { sizeLevelToRadius } from './nodeMetrics';

export interface PhraseMatchResult {
  nodeId: string;
  nodeLabelEn: string;
  nodeLabelCn: string;
  nodeType: string;
  totalCount: number;
  matches: {
    phrase: string;
    count: number;
  }[];
}

// Case-insensitive phrase occurrence counter
export function countPhraseOccurrences(text: string, phrase: string): number {
  if (!text || !phrase) return 0;
  const cleanPhrase = phrase.trim().toLowerCase();
  if (!cleanPhrase) return 0;
  
  const cleanText = text.toLowerCase();
  const escaped = cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  const matches = cleanText.match(regex);
  return matches ? matches.length : 0;
}

// Scan nodes for occurrences of given phrases
export function findPhraseMatchesInGraph(
  nodes: GraphNode[],
  phrases: string[]
): PhraseMatchResult[] {
  const validPhrases = phrases.map(p => p.trim()).filter(p => p.length > 0);
  if (validPhrases.length === 0) return [];

  const results: PhraseMatchResult[] = [];

  nodes.forEach(node => {
    const searchTarget = `${node.labelEn} ${node.labelCn} ${node.rawText || ''}`;
    
    const nodeMatches: { phrase: string; count: number }[] = [];
    let totalCount = 0;

    validPhrases.forEach(phrase => {
      const count = countPhraseOccurrences(searchTarget, phrase);
      if (count > 0) {
        nodeMatches.push({ phrase, count });
        totalCount += count;
      }
    });

    if (totalCount > 0) {
      results.push({
        nodeId: node.id,
        nodeLabelEn: node.labelEn,
        nodeLabelCn: node.labelCn,
        nodeType: node.type,
        totalCount,
        matches: nodeMatches,
      });
    }
  });

  return results.sort((a, b) => b.totalCount - a.totalCount);
}

// Create a new concept node with collision-free position placement
export function createConceptNode(
  labelEn: string,
  labelCn: string,
  phrases: string[],
  infoText: string | undefined,
  nodes: GraphNode[],
  edges: GraphEdge[],
  customColor?: string
): { updatedNodes: GraphNode[]; updatedEdges: GraphEdge[]; newNode: GraphNode } {
  const validPhrases = phrases.map(p => p.trim().toLowerCase()).filter(p => p.length > 0);
  const matchResults = findPhraseMatchesInGraph(nodes, validPhrases);

  const totalOccurrences = matchResults.reduce((acc, r) => acc + r.totalCount, 0);
  const connectedTargetsCount = matchResults.length;

  const conceptId = `concept_${Date.now()}_${labelEn.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  
  // Default Size for newly created nodes is 2 (Requirement 3c)
  const initialSizeLevel = 2;
  const initialRadius = sizeLevelToRadius(initialSizeLevel);

  // Determine non-colliding initial coordinates near centroid of matches
  let posX = (Math.random() - 0.5) * 250;
  let posY = (Math.random() - 0.5) * 250;

  if (matchResults.length > 0) {
    let sumX = 0;
    let sumY = 0;
    let weightSum = 0;
    
    matchResults.forEach(r => {
      const targetNode = nodes.find(n => n.id === r.nodeId);
      if (targetNode) {
        sumX += targetNode.x * r.totalCount;
        sumY += targetNode.y * r.totalCount;
        weightSum += r.totalCount;
      }
    });
    
    if (weightSum > 0) {
      // Offset with distance to prevent landing on top of an existing node
      const angle = Math.random() * Math.PI * 2;
      const offsetDist = 80 + Math.random() * 60;
      posX = (sumX / weightSum) + Math.cos(angle) * offsetDist;
      posY = (sumY / weightSum) + Math.sin(angle) * offsetDist;
    }
  }

  // Ensure minimum distance from all existing nodes
  for (let attempt = 0; attempt < 20; attempt++) {
    let tooClose = false;
    for (const node of nodes) {
      const dx = posX - node.x;
      const dy = posY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const requiredDist = initialRadius + (node.radius || 16) + 40;
      if (dist < requiredDist) {
        tooClose = true;
        const pushAngle = Math.atan2(dy || 0.1, dx || 0.1);
        posX = node.x + Math.cos(pushAngle) * (requiredDist + 15);
        posY = node.y + Math.sin(pushAngle) * (requiredDist + 15);
        break;
      }
    }
    if (!tooClose) break;
  }

  const nowIso = new Date().toISOString();
  let infoBadge: InfoBadge | undefined = undefined;
  if (infoText && infoText.trim().length > 0) {
    infoBadge = {
      content: infoText.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
      tags: validPhrases,
    };
  }

  const newNode: GraphNode = {
    id: conceptId,
    labelEn: labelEn.trim(),
    labelCn: labelCn.trim() || labelEn.trim(),
    type: 'concept',
    level: 4,
    clusterId: `cluster_${conceptId}`,
    keyPhrases: validPhrases,
    x: posX,
    y: posY,
    vx: 0,
    vy: 0,
    sizeLevel: initialSizeLevel,
    radius: initialRadius,
    baseRadius: initialRadius,
    weight: 8,
    color: customColor || '#fbbf24',
    infoBadge,
    frequency: totalOccurrences,
    phraseMatchCount: totalOccurrences,
    connectedCount: connectedTargetsCount,
    rawText: `Concept Node: ${labelEn} (${labelCn})\nKey Phrases: ${validPhrases.join(', ')}\nOccurrences: ${totalOccurrences}`,
  };

  const newEdges: GraphEdge[] = [...edges];

  matchResults.forEach((result, idx) => {
    const edgeId = `edge_sem_${conceptId}_${result.nodeId}`;
    const edgeWeight = Math.max(1, Math.min(10, result.totalCount));
    const curvature = 0.18 + (idx % 3) * 0.07;

    newEdges.push({
      id: edgeId,
      source: conceptId,
      target: result.nodeId,
      type: 'semantic',
      weight: edgeWeight,
      curvature,
      color: '#94a3b8',
      matchedPhrases: result.matches,
    });
  });

  const updatedNodes = [...nodes, newNode];

  updatedNodes.forEach(node => {
    node.connectedCount = newEdges.filter(e => e.source === node.id || e.target === node.id).length;
  });

  return {
    updatedNodes,
    updatedEdges: newEdges,
    newNode,
  };
}
