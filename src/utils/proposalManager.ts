import type { GraphNode, GraphEdge, ProposalChangeItem, AssistantProposal } from '../types/graph';

/**
 * Computes difference between baseline graph and assistant's modified graph.
 */
export function generateAssistantProposal(
  authorName: string,
  baselineNodes: GraphNode[],
  baselineEdges: GraphEdge[],
  currentNodes: GraphNode[],
  currentEdges: GraphEdge[],
  notes = ''
): AssistantProposal {
  const baselineNodeIds = new Set(baselineNodes.map(n => n.id));
  const baselineEdgeIds = new Set(baselineEdges.map(e => e.id));
  const baselineNodeMap = new Map(baselineNodes.map(n => [n.id, n]));
  const baselineEdgeMap = new Map(baselineEdges.map(e => [e.id, e]));

  const changes: ProposalChangeItem[] = [];
  const nowIso = new Date().toISOString();

  // 1. Detect New Nodes
  currentNodes.forEach(node => {
    if (!baselineNodeIds.has(node.id) || node.isAssistantProposal) {
      changes.push({
        id: `change_node_${node.id}`,
        type: 'add_node',
        targetId: node.id,
        targetTitle: `${node.labelEn} | ${node.labelCn}`,
        description: `Добавлен новый узел «${node.labelEn}»`,
        details: node.infoBadge?.content ? `Заметка: ${node.infoBadge.content.slice(0, 80)}...` : 'Без карточки',
        isProcessed: false,
        nodeData: node,
        timestamp: nowIso,
      });
    } else {
      // Check if node badge or labels were edited
      const base = baselineNodeMap.get(node.id);
      if (base) {
        const badgeChanged = (node.infoBadge?.content || '') !== (base.infoBadge?.content || '');
        const labelChanged = node.labelEn !== base.labelEn || node.labelCn !== base.labelCn;
        if (badgeChanged || labelChanged) {
          changes.push({
            id: `change_edit_node_${node.id}`,
            type: 'edit_node_badge',
            targetId: node.id,
            targetTitle: `${node.labelEn}`,
            description: `Изменены данные узла «${node.labelEn}»`,
            details: badgeChanged ? `Новая карточка: ${node.infoBadge?.content?.slice(0, 80)}` : 'Изменены метки',
            isProcessed: false,
            nodeData: node,
            timestamp: nowIso,
          });
        }
      }
    }
  });

  // 2. Detect New & Edited Edges
  currentEdges.forEach(edge => {
    const srcNode = currentNodes.find(n => n.id === edge.source);
    const tgtNode = currentNodes.find(n => n.id === edge.target);
    const edgeTitle = `${srcNode?.labelEn || 'Узел'} ↔ ${tgtNode?.labelEn || 'Узел'}`;

    if (!baselineEdgeIds.has(edge.id) || edge.isAssistantProposal) {
      changes.push({
        id: `change_edge_${edge.id}`,
        type: 'add_node',
        targetId: edge.id,
        targetTitle: edgeTitle,
        description: `Связь с новым узлом: ${edgeTitle}`,
        details: edge.infoBadge?.content || '',
        isProcessed: false,
        edgeData: edge,
        timestamp: nowIso,
      });
    } else {
      const base = baselineEdgeMap.get(edge.id);
      if (base) {
        const badgeChanged = (edge.infoBadge?.content || '') !== (base.infoBadge?.content || '');
        const styleChanged = edge.thickness !== base.thickness || edge.color !== base.color || edge.style !== base.style;
        if (badgeChanged || styleChanged) {
          const isDeletionHint = edge.infoBadge?.content?.toLowerCase().includes('удалить') || edge.infoBadge?.content?.toLowerCase().includes('delete');
          changes.push({
            id: `change_edit_edge_${edge.id}`,
            type: isDeletionHint ? 'recommend_delete_edge' : 'edit_edge_badge',
            targetId: edge.id,
            targetTitle: edgeTitle,
            description: isDeletionHint ? `Предложение удалить связь: ${edgeTitle}` : `Отредактирована связь: ${edgeTitle}`,
            details: edge.infoBadge?.content || (styleChanged ? 'Изменен стиль линии' : ''),
            isProcessed: false,
            edgeData: edge,
            timestamp: nowIso,
          });
        }
      }
    }
  });

  return {
    version: '2.4.0',
    authorName: authorName.trim() || 'Помощник',
    createdAt: nowIso,
    notes,
    changes,
    snapshotNodes: currentNodes,
    snapshotEdges: currentEdges,
  };
}

/**
 * Merges an assistant's proposal JSON into the author's active workspace.
 */
export function applyAssistantProposal(
  proposal: AssistantProposal,
  currentNodes: GraphNode[],
  currentEdges: GraphEdge[]
): {
  updatedNodes: GraphNode[];
  updatedEdges: GraphEdge[];
  proposalChanges: ProposalChangeItem[];
} {
  const nodeMap = new Map<string, GraphNode>(currentNodes.map(n => [n.id, { ...n }]));
  const edgeMap = new Map<string, GraphEdge>(currentEdges.map(e => [e.id, { ...e }]));

  // Add snapshot nodes if missing
  if (proposal.snapshotNodes) {
    proposal.snapshotNodes.forEach(pNode => {
      if (!nodeMap.has(pNode.id)) {
        nodeMap.set(pNode.id, {
          ...pNode,
          isAssistantProposal: true,
        });
      } else {
        // Apply assistant badge edits
        const existing = nodeMap.get(pNode.id)!;
        if (pNode.infoBadge?.content) {
          existing.infoBadge = pNode.infoBadge;
          existing.isAssistantProposal = true;
        }
      }
    });
  }

  // Add snapshot edges if missing
  if (proposal.snapshotEdges) {
    proposal.snapshotEdges.forEach(pEdge => {
      if (!edgeMap.has(pEdge.id)) {
        edgeMap.set(pEdge.id, {
          ...pEdge,
          isAssistantProposal: true,
        });
      } else {
        const existing = edgeMap.get(pEdge.id)!;
        if (pEdge.infoBadge?.content) {
          existing.infoBadge = pEdge.infoBadge;
          existing.isAssistantProposal = true;
        }
        if (pEdge.thickness) existing.thickness = pEdge.thickness;
        if (pEdge.color) existing.color = pEdge.color;
        if (pEdge.style || pEdge.lineStyle) {
          existing.style = pEdge.style || pEdge.lineStyle;
          existing.lineStyle = pEdge.lineStyle || pEdge.style;
        }
      }
    });
  }

  return {
    updatedNodes: Array.from(nodeMap.values()),
    updatedEdges: Array.from(edgeMap.values()),
    proposalChanges: proposal.changes.map(c => ({ ...c, isProcessed: c.isProcessed || false })),
  };
}
