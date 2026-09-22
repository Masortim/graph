import type { GraphNode, GraphEdge, ProposalChangeItem, AssistantProposal, ProposalDiffItem } from '../types/graph';

/**
 * Computes difference between baseline graph and assistant's modified graph.
 * Records precise "Что было" - "Что стало" diffs.
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

  // 1. Detect New & Edited Nodes
  currentNodes.forEach(node => {
    if (!baselineNodeIds.has(node.id) || node.isAssistantProposal) {
      changes.push({
        id: `change_node_${node.id}`,
        type: 'add_node',
        targetId: node.id,
        targetType: 'node',
        targetTitle: `${node.labelEn}${node.labelCn && node.labelCn !== node.labelEn ? ` | ${node.labelCn}` : ''}`,
        description: `Добавлен новый узел «${node.labelEn}»`,
        details: node.infoBadge?.content ? `Карточка: ${node.infoBadge.content}` : 'Без карточки',
        newCard: node.infoBadge?.content,
        newColor: node.color,
        isProcessed: false,
        nodeData: node,
        timestamp: nowIso,
      });
    } else {
      const base = baselineNodeMap.get(node.id);
      if (base) {
        const badgeChanged = (node.infoBadge?.content || '') !== (base.infoBadge?.content || '');
        const labelChanged = node.labelEn !== base.labelEn || node.labelCn !== base.labelCn;
        const colorChanged = node.color !== base.color;
        const sizeChanged = (node.customSizeLevel || node.sizeLevel) !== (base.customSizeLevel || base.sizeLevel);

        if (badgeChanged || labelChanged || colorChanged || sizeChanged) {
          const diffs: ProposalDiffItem[] = [];

          let oldLabelText: string | undefined;
          let newLabelText: string | undefined;
          if (labelChanged) {
            oldLabelText = `${base.labelEn}${base.labelCn ? ` (${base.labelCn})` : ''}`;
            newLabelText = `${node.labelEn}${node.labelCn ? ` (${node.labelCn})` : ''}`;
            diffs.push({
              field: 'label',
              fieldName: 'Метка',
              oldValue: oldLabelText,
              newValue: newLabelText,
            });
          }

          let oldCardText: string | undefined;
          let newCardText: string | undefined;
          if (badgeChanged) {
            oldCardText = base.infoBadge?.content || '(нет карточки)';
            newCardText = node.infoBadge?.content || '(нет карточки)';
            diffs.push({
              field: 'card',
              fieldName: 'Карточка узла',
              oldValue: oldCardText,
              newValue: newCardText,
            });
          }

          let oldColorText: string | undefined;
          let newColorText: string | undefined;
          if (colorChanged) {
            oldColorText = base.color || '#38bdf8';
            newColorText = node.color;
            diffs.push({
              field: 'color',
              fieldName: 'Цвет',
              oldValue: oldColorText,
              newValue: newColorText,
            });
          }

          let oldSizeText: string | undefined;
          let newSizeText: string | undefined;
          if (sizeChanged) {
            oldSizeText = `Размер ${base.customSizeLevel || base.sizeLevel || 1}`;
            newSizeText = `Размер ${node.customSizeLevel || node.sizeLevel || 1}`;
            diffs.push({
              field: 'size',
              fieldName: 'Размер',
              oldValue: oldSizeText,
              newValue: newSizeText,
            });
          }

          changes.push({
            id: `change_edit_node_${node.id}`,
            type: 'edit_node_badge',
            targetId: node.id,
            targetType: 'node',
            targetTitle: `${node.labelEn}`,
            description: `Изменены данные узла «${node.labelEn}»`,
            oldLabel: oldLabelText,
            newLabel: newLabelText,
            oldCard: oldCardText,
            newCard: newCardText,
            oldColor: oldColorText,
            newColor: newColorText,
            oldSize: oldSizeText,
            newSize: newSizeText,
            diffs,
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
        targetType: 'edge',
        targetTitle: edgeTitle,
        description: `Связь с новым узлом: ${edgeTitle}`,
        details: edge.infoBadge?.content || '',
        newCard: edge.infoBadge?.content,
        isProcessed: false,
        edgeData: edge,
        timestamp: nowIso,
      });
    } else {
      const base = baselineEdgeMap.get(edge.id);
      if (base) {
        const badgeChanged = (edge.infoBadge?.content || '') !== (base.infoBadge?.content || '');
        const styleChanged = (edge.style || edge.lineStyle || 'solid') !== (base.style || base.lineStyle || 'solid');
        const colorChanged = (edge.color || '#94a3b8') !== (base.color || '#94a3b8');
        const thicknessChanged = (edge.thickness || 1.2) !== (base.thickness || 1.2);

        if (badgeChanged || styleChanged || colorChanged || thicknessChanged) {
          const isDeletionHint = edge.infoBadge?.content?.toLowerCase().includes('удалить') || edge.infoBadge?.content?.toLowerCase().includes('delete');
          const diffs: ProposalDiffItem[] = [];

          let oldStyleText: string | undefined;
          let newStyleText: string | undefined;
          if (styleChanged) {
            oldStyleText = (base.style || base.lineStyle) === 'dashed' ? 'Пунктирная' : 'Сплошная';
            newStyleText = (edge.style || edge.lineStyle) === 'dashed' ? 'Пунктирная' : 'Сплошная';
            diffs.push({
              field: 'style',
              fieldName: 'Стиль линии',
              oldValue: oldStyleText,
              newValue: newStyleText,
            });
          }

          let oldColorText: string | undefined;
          let newColorText: string | undefined;
          if (colorChanged) {
            oldColorText = base.color || '#94a3b8';
            newColorText = edge.color || '#94a3b8';
            diffs.push({
              field: 'color',
              fieldName: 'Цвет дуги',
              oldValue: oldColorText,
              newValue: newColorText,
            });
          }

          let oldSizeText: string | undefined;
          let newSizeText: string | undefined;
          if (thicknessChanged) {
            oldSizeText = `${base.thickness || 1.2}px`;
            newSizeText = `${edge.thickness || 1.2}px`;
            diffs.push({
              field: 'thickness',
              fieldName: 'Толщина',
              oldValue: oldSizeText,
              newValue: newSizeText,
            });
          }

          let oldCardText: string | undefined;
          let newCardText: string | undefined;
          if (badgeChanged) {
            oldCardText = base.infoBadge?.content || '(нет карточки)';
            newCardText = edge.infoBadge?.content || '(нет карточки)';
            diffs.push({
              field: 'card',
              fieldName: 'Карточка дуги',
              oldValue: oldCardText,
              newValue: newCardText,
            });
          }

          changes.push({
            id: `change_edit_edge_${edge.id}`,
            type: isDeletionHint ? 'recommend_delete_edge' : 'edit_edge_badge',
            targetId: edge.id,
            targetType: 'edge',
            targetTitle: edgeTitle,
            description: isDeletionHint ? `Предложение удалить связь: ${edgeTitle}` : `Отредактирована связь: ${edgeTitle}`,
            oldStyle: oldStyleText,
            newStyle: newStyleText,
            oldColor: oldColorText,
            newColor: newColorText,
            oldSize: oldSizeText,
            newSize: newSizeText,
            oldCard: oldCardText,
            newCard: newCardText,
            diffs,
            isProcessed: false,
            edgeData: edge,
            timestamp: nowIso,
          });
        }
      }
    }
  });

  return {
    version: '2.5.0',
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
        const existing = nodeMap.get(pNode.id)!;
        if (pNode.infoBadge?.content) {
          existing.infoBadge = pNode.infoBadge;
          existing.isAssistantProposal = true;
        }
        if (pNode.color) existing.color = pNode.color;
        if (pNode.customSizeLevel !== undefined) existing.customSizeLevel = pNode.customSizeLevel;
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
