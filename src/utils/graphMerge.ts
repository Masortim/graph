import type { GraphNode, GraphEdge, InfoBadge, NodeType } from '../types/graph';
import { sizeLevelToRadius, calculateNodeSizeLevel } from './nodeMetrics';

export interface ComponentNodeSnapshot {
  id: string;
  labelEn: string;
  labelCn: string;
  originalLabelEn?: string;
  originalLabelCn?: string;
  type: NodeType;
  level: number;
  clusterId: string;
  color: string;
  x: number;
  y: number;
  weight: number;
  keyPhrases?: string[];
  connectedTargetIds?: string[];
  rawText?: string;
  infoBadge?: InfoBadge;
}

export interface MergeOptions {
  nodeAId: string;
  nodeBId: string;
  primaryLabelEn?: string;
  primaryLabelCn?: string;
  primaryColor?: string;
  mergeInfoNotes?: boolean;
}

export function mergeGraphNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: MergeOptions
): { updatedNodes: GraphNode[]; updatedEdges: GraphEdge[]; mergedNode: GraphNode } {
  const nodeA = nodes.find(n => n.id === options.nodeAId);
  const nodeB = nodes.find(n => n.id === options.nodeBId);

  if (!nodeA || !nodeB) {
    throw new Error('One or both nodes to merge were not found.');
  }

  const nowIso = new Date().toISOString();
  const mergedId = `merged_${Date.now()}_${nodeA.id.slice(0, 8)}_${nodeB.id.slice(0, 8)}`;

  // Default labels: use nodeA's labels unless explicitly provided
  const labelEn = options.primaryLabelEn?.trim() || nodeA.labelEn;
  const labelCn = options.primaryLabelCn?.trim() || (nodeA.labelCn || nodeA.labelEn);

  // Combine key phrases: deduplicate case-insensitively, keeping lowercase
  const phraseMap = new Map<string, string>();
  [...(nodeA.keyPhrases || []), ...(nodeB.keyPhrases || [])].forEach(p => {
    const lower = p.trim().toLowerCase();
    if (lower) {
      phraseMap.set(lower, lower);
    }
  });
  const combinedPhrases = Array.from(phraseMap.values());

  let mergedInfoBadge: InfoBadge | undefined = undefined;
  if (nodeA.infoBadge || nodeB.infoBadge) {
    const badgeParts: string[] = [];
    if (nodeA.infoBadge?.content) {
      badgeParts.push(`[${nodeA.labelEn}]: ${nodeA.infoBadge.content}`);
    }
    if (nodeB.infoBadge?.content) {
      badgeParts.push(`[${nodeB.labelEn}]: ${nodeB.infoBadge.content}`);
    }
    mergedInfoBadge = {
      content: badgeParts.join('\n\n---\n\n'),
      createdAt: nodeA.infoBadge?.createdAt || nodeB.infoBadge?.createdAt || nowIso,
      updatedAt: nowIso,
      tags: combinedPhrases,
    };
  }

  const combinedText = `[Merged Node: ${labelEn}]\n\n--- Source A (${nodeA.labelEn}) ---\n${nodeA.rawText || ''}\n\n--- Source B (${nodeB.labelEn}) ---\n${nodeB.rawText || ''}`;

  const posX = (nodeA.x + nodeB.x) / 2;
  const posY = (nodeA.y + nodeB.y) / 2;

  const combinedWeight = (nodeA.weight || 10) + (nodeB.weight || 10);
  const mergedColor = options.primaryColor || nodeA.color || '#ec4899';

  const snapshotA: GraphNode = {
    ...nodeA,
  };

  const snapshotB: GraphNode = {
    ...nodeB,
  };

  const originalEdges = edges.filter(
    e => e.source === nodeA.id || e.target === nodeA.id || e.source === nodeB.id || e.target === nodeB.id
  );

  const mergedNode: GraphNode = {
    id: mergedId,
    labelEn,
    labelCn,
    originalLabelEn: nodeA.originalLabelEn || nodeA.labelEn,
    originalLabelCn: nodeA.originalLabelCn || nodeA.labelCn,
    type: 'merged',
    level: Math.min(nodeA.level, nodeB.level),
    clusterId: nodeA.clusterId || nodeB.clusterId || `cluster_${mergedId}`,
    parentId: nodeA.parentId || nodeB.parentId,
    keyPhrases: combinedPhrases.length > 0 ? combinedPhrases : undefined,
    x: posX,
    y: posY,
    vx: 0,
    vy: 0,
    sizeLevel: 4,
    radius: sizeLevelToRadius(4),
    baseRadius: sizeLevelToRadius(4),
    weight: combinedWeight,
    color: mergedColor,
    infoBadge: mergedInfoBadge,
    rawText: combinedText,
    isCustomOrEdited: true,
    mergedFrom: {
      nodeAId: nodeA.id,
      nodeBId: nodeB.id,
      nodeALabel: `${nodeA.labelEn} (${nodeA.labelCn})`,
      nodeBLabel: `${nodeB.labelEn} (${nodeB.labelCn})`,
      nodeAOriginalEn: nodeA.originalLabelEn || nodeA.labelEn,
      nodeBOriginalEn: nodeB.originalLabelEn || nodeB.labelEn,
      nodeASnapshot: snapshotA,
      nodeBSnapshot: snapshotB,
      originalEdgesSnapshot: originalEdges,
      date: nowIso,
    },
    connectedCount: 0,
  };

  const edgeMap = new Map<string, GraphEdge>();

  edges.forEach(edge => {
    if (
      (edge.source === nodeA.id && edge.target === nodeB.id) ||
      (edge.source === nodeB.id && edge.target === nodeA.id)
    ) {
      return;
    }

    let otherEndId: string | null = null;
    let isSource = false;

    if (edge.source === nodeA.id || edge.source === nodeB.id) {
      otherEndId = edge.target;
      isSource = true;
    } else if (edge.target === nodeA.id || edge.target === nodeB.id) {
      otherEndId = edge.source;
      isSource = false;
    }

    if (otherEndId) {
      const key = otherEndId;
      const existing = edgeMap.get(key);

      if (existing) {
        existing.weight += edge.weight;
        if (edge.matchedPhrases) {
          existing.matchedPhrases = [
            ...(existing.matchedPhrases || []),
            ...edge.matchedPhrases,
          ];
        }
      } else {
        const newEdge: GraphEdge = {
          id: `edge_m_${mergedId}_${otherEndId}`,
          source: isSource ? mergedId : otherEndId,
          target: isSource ? otherEndId : mergedId,
          type: edge.type === 'semantic' ? 'semantic' : 'merged',
          weight: edge.weight,
          curvature: edge.curvature || 0.15,
          color: edge.color || mergedColor,
          matchedPhrases: edge.matchedPhrases,
          isManual: edge.isManual,
        };
        edgeMap.set(key, newEdge);
      }
    } else {
      edgeMap.set(edge.id, edge);
    }
  });

  const updatedEdges = Array.from(edgeMap.values());

  const updatedNodes = nodes
    .filter(n => n.id !== nodeA.id && n.id !== nodeB.id)
    .concat(mergedNode);

  updatedNodes.forEach(node => {
    node.connectedCount = updatedEdges.filter(e => e.source === node.id || e.target === node.id).length;
    node.sizeLevel = calculateNodeSizeLevel(node, node.connectedCount, node.frequency || 0);
    node.radius = sizeLevelToRadius(node.sizeLevel);
  });

  return {
    updatedNodes,
    updatedEdges,
    mergedNode,
  };
}

/**
 * Extracts a component node from a merged node entity (Requirement 3).
 * Restores the extracted node with its original properties and connections.
 * The remaining node retains all other connections including any manual connections added after merge.
 */
export function unmergeGraphNode(
  currentNodes: GraphNode[],
  currentEdges: GraphEdge[],
  parentNodeId: string,
  extractNodeId: string
): { updatedNodes: GraphNode[]; updatedEdges: GraphEdge[]; extractedNode: GraphNode; remainingNode: GraphNode } {
  const mergedNode = currentNodes.find(n => n.id === parentNodeId);
  if (!mergedNode || !mergedNode.mergedFrom) {
    throw new Error('Merged node metadata not found.');
  }

  const mf = mergedNode.mergedFrom;
  const isA = extractNodeId === mf.nodeAId;

  const targetSnap = isA ? mf.nodeASnapshot : mf.nodeBSnapshot;
  const remainingSnap = isA ? mf.nodeBSnapshot : mf.nodeASnapshot;

  const extractedId = targetSnap?.id || extractNodeId;
  const extractedLabelEn = targetSnap?.labelEn || (isA ? mf.nodeAOriginalEn : mf.nodeBOriginalEn) || 'Extracted Node';
  const extractedLabelCn = targetSnap?.labelCn || targetSnap?.labelEn || extractedLabelEn;

  const extractedSizeLevel = targetSnap ? calculateNodeSizeLevel(targetSnap, 2, targetSnap.frequency || 0) : 2;
  const extractedRadius = sizeLevelToRadius(extractedSizeLevel);

  // 1. Re-create the extracted node
  const extractedNode: GraphNode = targetSnap
    ? {
        ...targetSnap,
        x: mergedNode.x + (isA ? -70 : 70),
        y: mergedNode.y + (isA ? -70 : 70),
        vx: 0,
        vy: 0,
        isCustomOrEdited: true,
      }
    : {
        id: extractedId,
        labelEn: extractedLabelEn,
        labelCn: extractedLabelCn,
        originalLabelEn: extractedLabelEn,
        originalLabelCn: extractedLabelCn,
        type: 'concept',
        level: 2,
        clusterId: `cluster_${extractedId}`,
        color: '#38bdf8',
        x: mergedNode.x + (isA ? -70 : 70),
        y: mergedNode.y + (isA ? -70 : 70),
        vx: 0,
        vy: 0,
        sizeLevel: extractedSizeLevel,
        radius: extractedRadius,
        baseRadius: extractedRadius,
        weight: 6,
        isCustomOrEdited: true,
      };

  // 2. Re-create or revert the remaining node
  const remainingId = remainingSnap?.id || (isA ? mf.nodeBId : mf.nodeAId);
  const remainingLabelEn = remainingSnap?.labelEn || (isA ? mf.nodeBOriginalEn : mf.nodeAOriginalEn) || mergedNode.labelEn;
  const remainingLabelCn = remainingSnap?.labelCn || remainingSnap?.labelEn || remainingLabelEn;

  const remainingSizeLevel = remainingSnap ? calculateNodeSizeLevel(remainingSnap, 3, remainingSnap.frequency || 0) : 3;
  const remainingRadius = sizeLevelToRadius(remainingSizeLevel);

  const remainingNode: GraphNode = remainingSnap
    ? {
        ...remainingSnap,
        x: mergedNode.x,
        y: mergedNode.y,
        vx: 0,
        vy: 0,
        isCustomOrEdited: true,
      }
    : {
        id: remainingId,
        labelEn: remainingLabelEn,
        labelCn: remainingLabelCn,
        originalLabelEn: remainingLabelEn,
        originalLabelCn: remainingLabelCn,
        type: 'concept',
        level: 2,
        clusterId: mergedNode.clusterId,
        color: mergedNode.color,
        x: mergedNode.x,
        y: mergedNode.y,
        vx: 0,
        vy: 0,
        sizeLevel: remainingSizeLevel,
        radius: remainingRadius,
        baseRadius: remainingRadius,
        weight: 6,
        isCustomOrEdited: true,
      };

  // 3. Re-route edges:
  // - Extracted node gets back its original edges
  // - Remaining node gets all current merged edges (including post-merge additions) EXCEPT those specifically belonging to extracted node
  const newEdges: GraphEdge[] = [];
  const originalEdgesForExtracted = (mf.originalEdgesSnapshot || []).filter(
    e => e.source === extractedId || e.target === extractedId
  );

  const extractedTargetSet = new Set(
    originalEdgesForExtracted.map(e => (e.source === extractedId ? e.target : e.source))
  );

  // Preserve unrelated edges
  currentEdges.forEach(edge => {
    if (edge.source !== mergedNode.id && edge.target !== mergedNode.id) {
      newEdges.push(edge);
      return;
    }

    const otherId = edge.source === mergedNode.id ? edge.target : edge.source;

    if (extractedTargetSet.has(otherId)) {
      // Connect to extracted node
      newEdges.push({
        id: `edge_restored_${extractedId}_${otherId}_${Date.now()}`,
        source: edge.source === mergedNode.id ? extractedId : otherId,
        target: edge.target === mergedNode.id ? extractedId : otherId,
        type: edge.type,
        weight: edge.weight,
        curvature: edge.curvature || 0.18,
        color: edge.color,
        isManual: edge.isManual,
      });
    } else {
      // Retain with remaining node
      newEdges.push({
        id: `edge_rem_${remainingId}_${otherId}_${Date.now()}`,
        source: edge.source === mergedNode.id ? remainingId : otherId,
        target: edge.target === mergedNode.id ? remainingId : otherId,
        type: edge.type,
        weight: edge.weight,
        curvature: edge.curvature || 0.18,
        color: edge.color,
        isManual: edge.isManual,
      });
    }
  });

  const updatedNodes = currentNodes
    .filter(n => n.id !== mergedNode.id)
    .concat([extractedNode, remainingNode]);

  updatedNodes.forEach(node => {
    node.connectedCount = newEdges.filter(e => e.source === node.id || e.target === node.id).length;
    node.sizeLevel = calculateNodeSizeLevel(node, node.connectedCount, node.frequency || 0);
    node.radius = sizeLevelToRadius(node.sizeLevel);
  });

  return {
    updatedNodes,
    updatedEdges: newEdges,
    extractedNode,
    remainingNode,
  };
}
