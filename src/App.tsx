import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { 
  GraphNode, 
  GraphEdge, 
  GraphSettings, 
  AppMode, 
  AssistantProposal 
} from './types/graph';
import { downloadGraphAsSvg } from './utils/svgExporter';
import { calculateNodeSizeLevel, sizeLevelToRadius } from './utils/nodeMetrics';
import { generateAssistantProposal } from './utils/proposalManager';
import { GraphCanvas } from './components/GraphCanvas';
import { InfoCardModal } from './components/InfoCardModal';
import { AddEdgeModal } from './components/AddEdgeModal';
import { Toolbar } from './components/Toolbar';
import { EdgeSettingsModal } from './components/EdgeSettingsModal';
import { LocalGraphModal } from './components/LocalGraphModal';
import { SaveProposalModal } from './components/SaveProposalModal';
import masterGraphData from './data/masterGraph.json';

function detectModeFromUrl(): AppMode {
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  if (hash.includes('assistant') || search.includes('mode=assistant')) {
    return 'assistant';
  }
  return 'student'; // Default on GitHub is always Student View
}

export function App() {
  // App Mode: 'student' (Default) or 'assistant'
  const [mode, setMode] = useState<AppMode>(() => detectModeFromUrl());

  // Direct initialization from masterGraphData to ensure 100% instant rendering
  const [nodes, setNodes] = useState<GraphNode[]>(() => (masterGraphData.nodes || []) as GraphNode[]);
  const [edges, setEdges] = useState<GraphEdge[]>(() => (masterGraphData.edges || []) as GraphEdge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [vaultName, setVaultName] = useState<string>(masterGraphData.vaultName || 'Linear Algebra NSU');

  // Master Graph Baseline
  const [masterNodes, setMasterNodes] = useState<GraphNode[]>(() => (masterGraphData.nodes || []) as GraphNode[]);
  const [masterEdges, setMasterEdges] = useState<GraphEdge[]>(() => (masterGraphData.edges || []) as GraphEdge[]);

  // Assistant Proposal Export Modal
  const [isSaveProposalModalOpen, setIsSaveProposalModalOpen] = useState(false);

  // Pinned Information Badges on Canvas (opened by double click)
  const [pinnedBadgeNodeIds, setPinnedBadgeNodeIds] = useState<Set<string>>(new Set());
  const [pinnedBadgeEdgeIds, setPinnedBadgeEdgeIds] = useState<Set<string>>(new Set());

  // Edge RMB Inspector State (Assistant mode)
  const [edgeSettingsTarget, setEdgeSettingsTarget] = useState<GraphEdge | null>(null);

  // Local Graph Mode & Modal State
  const [localGraphModalTarget, setLocalGraphModalTarget] = useState<GraphNode | null>(null);
  const [localGraphState, setLocalGraphState] = useState<{
    active: boolean;
    rootNodeId: string;
    depth: 1 | 2;
  } | null>(null);
  const [localGraphPreviewHighlightNodeIds, setLocalGraphPreviewHighlightNodeIds] = useState<Set<string> | null>(null);

  // Search state
  const [fullscreenSearchQuery, setFullscreenSearchQuery] = useState('');

  // Modals state
  const [isAddEdgeModalOpen, setIsAddEdgeModalOpen] = useState(false);
  const [addEdgeSourceNodeId, setAddEdgeSourceNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Visual & Physics Settings
  const [settings, setSettings] = useState<GraphSettings>({
    showCurvedEdges: true,
    edgeColor: '#94a3b8',
    edgeThickness: 1.2,
    edgeOpacity: 0.35,
    edgeLength: 1.5,
    nodeSpacing: 30,
    nodeRepulsionMultiplier: 1.2,
    showLabels: true,
    physicsRunning: true,
  });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4500);
  };

  // URL Hash Sync for Mode Routing
  useEffect(() => {
    const handleUrlChange = () => {
      const detected = detectModeFromUrl();
      setMode(detected);
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleUpdateSettings = (newPartial: Partial<GraphSettings>) => {
    setSettings(prev => ({ ...prev, ...newPartial }));
  };

  // Prevent browser context menu anywhere
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
  }, []);

  // Toggle Pinned Node Badge on Double Click
  const handleTogglePinNodeBadge = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.infoBadge?.content === undefined || node.infoBadge.content === '') {
      showToast('У этого узла нет информационной карточки.');
      return;
    }

    setPinnedBadgeNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        showToast(`Табличка «${node.labelEn}» скрыта`);
      } else {
        next.add(nodeId);
        showToast(`Табличка «${node.labelEn}» закреплена на графе`);
      }
      return next;
    });
  };

  // Toggle Pinned Edge Badge on Double Click
  const handleTogglePinEdgeBadge = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge || !edge.infoBadge?.content) {
      showToast('У этой связи нет информационной карточки.');
      return;
    }

    setPinnedBadgeEdgeIds(prev => {
      const next = new Set(prev);
      if (next.has(edgeId)) {
        next.delete(edgeId);
        showToast('Табличка связи скрыта');
      } else {
        next.add(edgeId);
        showToast('Табличка связи закреплена на графе');
      }
      return next;
    });
  };

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Exit fullscreen failed:', err);
      });
    }
  };

  // Canvas Viewport control callbacks
  const triggerZoomInRef = useRef<(() => void) | null>(null);
  const triggerZoomOutRef = useRef<(() => void) | null>(null);
  const fitGraphFnRef = useRef<(() => void) | null>(null);
  const resetViewFnRef = useRef<(() => void) | null>(null);
  const canvasFocusFnRef = useRef<((target: { nodeId?: string; edgeId?: string }) => void) | null>(null);

  // Dynamic check for newly committed ActualGraph/graph.json
  useEffect(() => {
    const loadMasterGraph = async () => {
      const candidates = [
        './ActualGraph/graph.json',
        'ActualGraph/graph.json',
        `${import.meta.env.BASE_URL}ActualGraph/graph.json`,
      ];

      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.nodes) && Array.isArray(data.edges) && data.nodes.length > 0) {
              setNodes(data.nodes);
              setEdges(data.edges);
              setMasterNodes(data.nodes);
              setMasterEdges(data.edges);
              if (data.name) {
                setVaultName(data.name.replace('Linear Algebra NSU - ', ''));
              }
              if (data.settings) {
                setSettings(prev => ({ ...prev, ...data.settings }));
              }
              break;
            }
          }
        } catch {
          // Continue to next candidate
        }
      }
    };

    loadMasterGraph();
  }, []);

  // Update edge styling & info badge (Assistant mode)
  const handleUpdateEdge = (
    edgeId: string,
    updates: Partial<GraphEdge>
  ) => {
    const nowIso = new Date().toISOString();
    setEdges(prev =>
      prev.map(e => {
        if (e.id !== edgeId) return e;
        const nextScale = updates.badgeScale !== undefined 
          ? updates.badgeScale 
          : (updates.infoBadge?.scale !== undefined ? updates.infoBadge.scale : (e.badgeScale !== undefined ? e.badgeScale : (e.infoBadge?.scale !== undefined ? e.infoBadge.scale : 1.0)));

        return {
          ...e,
          ...updates,
          badgeScale: nextScale,
          badgeLanguage: updates.badgeLanguage !== undefined ? updates.badgeLanguage : (e.badgeLanguage || 'cn'),
          infoBadge: updates.infoBadge !== undefined
            ? (updates.infoBadge
                ? {
                    content: updates.infoBadge.content,
                    createdAt: e.infoBadge?.createdAt || nowIso,
                    updatedAt: nowIso,
                    scale: nextScale,
                    language: updates.badgeLanguage || e.badgeLanguage || 'cn',
                  }
                : undefined)
            : e.infoBadge,
        };
      })
    );

    setEdgeSettingsTarget(prev => {
      if (prev && prev.id === edgeId) {
        const nextScale = updates.badgeScale !== undefined 
          ? updates.badgeScale 
          : (updates.infoBadge?.scale !== undefined ? updates.infoBadge.scale : (prev.badgeScale !== undefined ? prev.badgeScale : 1.0));

        return {
          ...prev,
          ...updates,
          badgeScale: nextScale,
          badgeLanguage: updates.badgeLanguage !== undefined ? updates.badgeLanguage : (prev.badgeLanguage || 'cn'),
          infoBadge: updates.infoBadge !== undefined
            ? (updates.infoBadge
                ? {
                    content: updates.infoBadge.content,
                    createdAt: prev.infoBadge?.createdAt || nowIso,
                    updatedAt: nowIso,
                    scale: nextScale,
                    language: updates.badgeLanguage || prev.badgeLanguage || 'cn',
                  }
                : undefined)
            : prev.infoBadge,
        };
      }
      return prev;
    });
  };

  // Local Graph Calculation
  const computeLocalGraphSubgraph = useCallback(
    (rootId: string, depth: 1 | 2) => {
      const includedNodeIds = new Set<string>([rootId]);
      
      const depth1Neighbors = new Set<string>();
      edges.forEach(e => {
        if (e.source === rootId) depth1Neighbors.add(e.target);
        if (e.target === rootId) depth1Neighbors.add(e.source);
      });
      depth1Neighbors.forEach(id => includedNodeIds.add(id));

      if (depth === 2) {
        depth1Neighbors.forEach(d1Id => {
          edges.forEach(e => {
            if (e.source === d1Id) includedNodeIds.add(e.target);
            if (e.target === d1Id) includedNodeIds.add(e.source);
          });
        });
      }

      const subNodes = nodes.filter(n => includedNodeIds.has(n.id));
      const subEdges = edges.filter(e => includedNodeIds.has(e.source) && includedNodeIds.has(e.target));

      return { subNodes, subEdges, includedNodeIds };
    },
    [nodes, edges]
  );

  const handleEnterLocalGraph = (nodeId: string, depth: 1 | 2) => {
    setLocalGraphState({
      active: true,
      rootNodeId: nodeId,
      depth,
    });
    setLocalGraphPreviewHighlightNodeIds(null);
    showToast(`Режим локального графа: глубина ${depth}`);
    setTimeout(() => {
      fitGraphFnRef.current?.();
    }, 100);
  };

  const handleExitLocalGraph = () => {
    setLocalGraphState(null);
    setLocalGraphPreviewHighlightNodeIds(null);
    showToast('Возврат к полному графу');
    setTimeout(() => {
      fitGraphFnRef.current?.();
    }, 100);
  };

  // Depth preview handler for LocalGraphModal
  const handleDepthPreview = (depth: 1 | 2) => {
    if (!localGraphModalTarget) return;
    const { includedNodeIds } = computeLocalGraphSubgraph(localGraphModalTarget.id, depth);
    setLocalGraphPreviewHighlightNodeIds(includedNodeIds);
  };

  // Nodes and edges to display
  const { displayNodes, displayEdges } = useMemo(() => {
    if (localGraphState?.active) {
      const { subNodes, subEdges } = computeLocalGraphSubgraph(
        localGraphState.rootNodeId,
        localGraphState.depth
      );
      return { displayNodes: subNodes, displayEdges: subEdges };
    }
    return { displayNodes: nodes, displayEdges: edges };
  }, [localGraphState, nodes, edges, computeLocalGraphSubgraph]);

  // Fullscreen Search Highlight computation
  const fullscreenSearchData = useMemo(() => {
    if (!fullscreenSearchQuery.trim()) return null;
    const term = fullscreenSearchQuery.trim().toLowerCase();

    const matchingNodeIds = new Set<string>();
    displayNodes.forEach(node => {
      const inEn = node.labelEn.toLowerCase().includes(term);
      const inCn = node.labelCn.toLowerCase().includes(term);
      const inPhrases = node.keyPhrases?.some(p => p.toLowerCase().includes(term));
      const inInfo = node.infoBadge?.content?.toLowerCase().includes(term);
      const inText = node.rawText?.toLowerCase().includes(term);
      if (inEn || inCn || inPhrases || inInfo || inText) {
        matchingNodeIds.add(node.id);
      }
    });

    const outgoingEdgeIds = new Set<string>();
    let totalConnections = 0;

    displayEdges.forEach(edge => {
      const isSrc = matchingNodeIds.has(edge.source);
      const isTgt = matchingNodeIds.has(edge.target);

      if (isSrc && isTgt) {
        totalConnections++;
      } else if (isSrc || isTgt) {
        outgoingEdgeIds.add(edge.id);
        totalConnections++;
      }
    });

    return {
      matchingNodeIds,
      outgoingEdgeIds,
      matchedNodesCount: matchingNodeIds.size,
      matchedEdgesCount: totalConnections,
    };
  }, [fullscreenSearchQuery, displayNodes, displayEdges]);

  // Update info badge of a node (Assistant Mode)
  const handleUpdateInfoBadge = (nodeId: string, content: string) => {
    const nowIso = new Date().toISOString();
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n;
        if (content === '') {
          return { ...n, infoBadge: undefined, isCustomOrEdited: true };
        }
        return {
          ...n,
          isCustomOrEdited: true,
          infoBadge: {
            content: content,
            createdAt: n.infoBadge?.createdAt || nowIso,
            updatedAt: nowIso,
            scale: n.badgeScale || n.infoBadge?.scale || 1.0,
          },
        };
      })
    );
    showToast('Информационная карточка сохранена');
  };

  // Update badge scale (100%..300%, step 25%)
  const handleUpdateBadgeScale = (nodeId: string, scale: number) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          badgeScale: scale,
          infoBadge: n.infoBadge ? { ...n.infoBadge, scale } : undefined,
          isCustomOrEdited: true,
        };
      })
    );
    showToast(`Масштаб карточки: ${Math.round(scale * 100)}%`);
  };

  // Update labels and color (Assistant Mode)
  const handleUpdateProperties = (
    nodeId: string,
    labelEn: string,
    labelCn: string,
    color: string
  ) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n;
        const updatedNode = {
          ...n,
          labelEn: labelEn.trim(),
          labelCn: labelCn.trim() || labelEn.trim(),
          color: color || n.color,
          isCustomOrEdited: true,
        };
        const sizeLevel = calculateNodeSizeLevel(updatedNode, updatedNode.connectedCount || 0, updatedNode.frequency || 0);
        const radius = sizeLevelToRadius(sizeLevel);
        return {
          ...updatedNode,
          sizeLevel,
          radius,
          baseRadius: radius,
        };
      })
    );
    showToast('Свойства узла обновлены');
  };

  // Update key phrases of a node
  const handleUpdateKeyPhrases = (nodeId: string, phrases: string[]) => {
    const normalized = Array.from(new Set(phrases.map(p => p.trim().toLowerCase()))).filter(p => p.length > 0);
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          keyPhrases: normalized,
          isCustomOrEdited: true,
        };
      })
    );
  };

  // Add edge to existing node (Assistant mode)
  const handleAddEdgeToExisting = (sourceId: string, targetId: string, weight = 2) => {
    if (sourceId === targetId) return;

    const edgeExists = edges.some(
      e => (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId)
    );
    if (edgeExists) {
      showToast('Связь между этими узлами уже существует');
      return;
    }

    const newEdge: GraphEdge = {
      id: `edge_manual_${sourceId}_${targetId}_${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: 'manual',
      weight: Math.max(1, weight),
      curvature: 0.18,
      color: '#94a3b8',
      isManual: true,
      badgeLanguage: 'cn',
      isAssistantProposal: true,
    };

    const updatedEdges = [...edges, newEdge];
    const updatedNodes = nodes.map(node => {
      if (node.id === sourceId || node.id === targetId) {
        const count = updatedEdges.filter(e => e.source === node.id || e.target === node.id).length;
        const sizeLevel = calculateNodeSizeLevel(node, count, node.frequency || 0);
        return {
          ...node,
          connectedCount: count,
          sizeLevel,
          radius: sizeLevelToRadius(sizeLevel),
        };
      }
      return node;
    });

    setEdges(updatedEdges);
    setNodes(updatedNodes);
    setIsAddEdgeModalOpen(false);
    showToast('Связь добавлена в правки');
  };

  // Add edge to a newly created node (Assistant mode)
  const handleAddEdgeToNewNode = (
    sourceId: string,
    labelEn: string,
    labelCn: string,
    color: string,
    weight = 2
  ) => {
    const sourceNode = nodes.find(n => n.id === sourceId);
    const sourceX = sourceNode ? sourceNode.x : 0;
    const sourceY = sourceNode ? sourceNode.y : 0;
    const clusterId = sourceNode ? sourceNode.clusterId : 'concept';

    const newId = `custom_node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSizeLevel = 2;
    const newRadius = sizeLevelToRadius(newSizeLevel);

    const newNode: GraphNode = {
      id: newId,
      labelEn: labelEn.trim(),
      labelCn: labelCn.trim() || labelEn.trim(),
      type: 'concept',
      level: 2,
      clusterId,
      x: sourceX + (Math.random() - 0.5) * 120,
      y: sourceY + (Math.random() - 0.5) * 120,
      vx: 0,
      vy: 0,
      sizeLevel: newSizeLevel,
      radius: newRadius,
      baseRadius: newRadius,
      weight: 4,
      color: color || '#38bdf8',
      connectedCount: 1,
      frequency: 0,
      isCustomOrEdited: true,
      isAssistantProposal: true,
      originalLabelEn: labelEn.trim(),
      originalLabelCn: labelCn.trim() || labelEn.trim(),
    };

    const newEdge: GraphEdge = {
      id: `edge_manual_${sourceId}_${newId}_${Date.now()}`,
      source: sourceId,
      target: newId,
      type: 'manual',
      weight: Math.max(1, weight),
      curvature: 0.18,
      color: '#94a3b8',
      isManual: true,
      badgeLanguage: 'cn',
      isAssistantProposal: true,
    };

    const updatedEdges = [...edges, newEdge];
    const updatedNodes = [...nodes, newNode].map(node => {
      if (node.id === sourceId) {
        const count = updatedEdges.filter(e => e.source === node.id || e.target === node.id).length;
        return {
          ...node,
          connectedCount: count,
        };
      }
      return node;
    });

    setEdges(updatedEdges);
    setNodes(updatedNodes);
    setIsAddEdgeModalOpen(false);
    showToast(`Создан узел «${labelEn}» (связан с «${sourceNode?.labelEn}»)`);
  };

  // Export Graph as High-Resolution Vector SVG (Watermarked with 110% © for both Student and Assistant)
  const handleExportSvg = () => {
    downloadGraphAsSvg(
      displayNodes, 
      displayEdges, 
      settings, 
      pinnedBadgeNodeIds, 
      pinnedBadgeEdgeIds, 
      vaultName,
      true // ALWAYS Watermarked on Web
    );
    showToast('Векторный SVG графа скачан (с защитным водяным знаком NSU)');
  };

  // Assistant proposal changes count calculation
  const assistantChangesCount = useMemo(() => {
    const masterNodeIds = new Set(masterNodes.map(n => n.id));
    const masterEdgeIds = new Set(masterEdges.map(e => e.id));
    const newNodes = nodes.filter(n => !masterNodeIds.has(n.id)).length;
    const newEdges = edges.filter(e => !masterEdgeIds.has(e.id)).length;
    return newNodes + newEdges;
  }, [nodes, edges, masterNodes, masterEdges]);

  // Save Assistant Proposal: Prompts name, downloads file locally AND saves in Proposals storage
  const handleSaveAssistantProposal = (authorName: string, notes: string) => {
    const proposal = generateAssistantProposal(
      authorName,
      masterNodes,
      masterEdges,
      nodes,
      edges,
      notes
    );

    const safeName = authorName.replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_') || 'assistant';
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `assistant_proposal_${safeName}_${dateStr}.json`;

    // 1. Download to assistant's local machine
    const jsonString = JSON.stringify(proposal, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // 2. Persist in browser Proposals storage for session continuity
    try {
      localStorage.setItem(`proposal_${filename}`, jsonString);
    } catch {
      // Ignored if storage quota exceeded
    }

    setIsSaveProposalModalOpen(false);
    showToast(`Файл «${filename}» скачан на ваш компьютер и сохранён в Proposals!`);
  };

  // Load Assistant Proposal file back to continue editing
  const handleLoadAssistantProposal = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const proposal = JSON.parse(e.target?.result as string) as AssistantProposal;
        if (proposal && Array.isArray(proposal.snapshotNodes) && Array.isArray(proposal.snapshotEdges)) {
          setNodes(proposal.snapshotNodes);
          setEdges(proposal.snapshotEdges);
          showToast(`Загружены сохранённые ранее правки помощника «${proposal.authorName}»`);
        } else {
          alert('Некорректный формат файла предложения правок.');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка при чтении файла предложения правок.');
      }
    };
    reader.readAsText(file);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
  const addEdgeSourceNode = nodes.find(n => n.id === addEdgeSourceNodeId) || null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col">
      <Toolbar
        mode={mode}
        onZoomIn={() => triggerZoomInRef.current?.()}
        onZoomOut={() => triggerZoomOutRef.current?.()}
        onFitGraph={() => fitGraphFnRef.current?.()}
        onResetView={() => resetViewFnRef.current?.()}
        onExportSvg={handleExportSvg}
        zoomLevel={zoomLevel}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onUpdateVault={() => {}}
        onLoadObsidianFiles={() => {}}
        onExportProject={() => {}}
        onImportProject={() => {}}
        onOpenLabelsModal={() => {}}
        nodesCount={displayNodes.length}
        edgesCount={displayEdges.length}
        vaultName={vaultName}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        pinnedBadgesCount={pinnedBadgeNodeIds.size + pinnedBadgeEdgeIds.size}
        fullscreenSearchQuery={fullscreenSearchQuery}
        onFullscreenSearchChange={setFullscreenSearchQuery}
        fullscreenMatchedNodesCount={fullscreenSearchData?.matchedNodesCount || 0}
        fullscreenMatchedEdgesCount={fullscreenSearchData?.matchedEdgesCount || 0}
        onImportAssistantProposal={handleLoadAssistantProposal}
        onOpenSaveProposalModal={() => setIsSaveProposalModalOpen(true)}
      />

      <main className="flex-1 relative w-full h-full overflow-hidden">
        <GraphCanvas
          nodes={displayNodes}
          edges={displayEdges}
          selectedNodeId={selectedNodeId}
          onSelectNode={node => setSelectedNodeId(node ? node.id : null)}
          onOpenEdgeSettings={edge => {
            if (mode === 'assistant') {
              setEdgeSettingsTarget(edge);
            }
          }}
          onOpenLocalGraph={node => {
            setLocalGraphModalTarget(node);
            setLocalGraphPreviewHighlightNodeIds(null);
          }}
          settings={settings}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          isFullscreen={isFullscreen}
          pinnedBadgeNodeIds={pinnedBadgeNodeIds}
          onTogglePinNodeBadge={handleTogglePinNodeBadge}
          pinnedBadgeEdgeIds={pinnedBadgeEdgeIds}
          onTogglePinEdgeBadge={handleTogglePinEdgeBadge}
          structureHighlightNodeIds={localGraphPreviewHighlightNodeIds}
          fullscreenSearchHighlight={fullscreenSearchData}
          setCanvasFitFn={fn => {
            fitGraphFnRef.current = fn;
          }}
          setCanvasResetFn={fn => {
            resetViewFnRef.current = fn;
          }}
          setCanvasFocusFn={fn => {
            canvasFocusFnRef.current = fn;
          }}
          triggerZoomInRef={triggerZoomInRef}
          triggerZoomOutRef={triggerZoomOutRef}
        />

        {/* Local Graph Active Indicator Badge */}
        {localGraphState?.active && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-sky-950/90 border border-sky-500 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            <span className="text-sky-200">
              Local Subgraph (Depth <strong>{localGraphState.depth}</strong>): <strong className="text-white">{nodes.find(n => n.id === localGraphState.rootNodeId)?.labelEn}</strong>
            </span>
            <button
              onClick={handleExitLocalGraph}
              className="px-2.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full font-bold text-[11px] transition"
            >
              Return to Full Graph
            </button>
          </div>
        )}

        {/* Right Inspector Modal: Only open in Assistant mode when NOT in Fullscreen mode */}
        {selectedNode && !isFullscreen && mode === 'assistant' && (
          <InfoCardModal
            mode={mode}
            node={selectedNode}
            nodes={nodes}
            edges={edges}
            onClose={() => setSelectedNodeId(null)}
            onUpdateInfoBadge={handleUpdateInfoBadge}
            onUpdateBadgeScale={handleUpdateBadgeScale}
            onUpdateProperties={(id, en, cn, col) => handleUpdateProperties(id, en, cn, col)}
            onUpdateKeyPhrases={handleUpdateKeyPhrases}
            onUpdateNodeFrequencyAndSize={() => {}}
            onOpenMergeModal={() => {}}
            onOpenAddEdgeModal={nodeId => {
              setAddEdgeSourceNodeId(nodeId);
              setIsAddEdgeModalOpen(true);
            }}
            onDeleteEdge={() => {}}
            onDeleteNode={() => {}}
            onSelectNodeById={nodeId => setSelectedNodeId(nodeId)}
          />
        )}

        {/* Edge Settings Modal (Assistant mode) */}
        {edgeSettingsTarget && !isFullscreen && mode === 'assistant' && (
          <EdgeSettingsModal
            mode={mode}
            edge={edgeSettingsTarget}
            nodes={nodes}
            onClose={() => setEdgeSettingsTarget(null)}
            onUpdateEdge={handleUpdateEdge}
            onDeleteEdge={() => {}}
          />
        )}

        {/* Local Graph Dialog (RMB on node) */}
        {localGraphModalTarget && (
          <LocalGraphModal
            node={localGraphModalTarget}
            isAlreadyLocalRoot={localGraphState?.active === true && localGraphState.rootNodeId === localGraphModalTarget.id}
            onClose={() => {
              setLocalGraphModalTarget(null);
              setLocalGraphPreviewHighlightNodeIds(null);
            }}
            onEnterLocalGraph={handleEnterLocalGraph}
            onExitLocalGraph={handleExitLocalGraph}
            onDepthPreview={handleDepthPreview}
          />
        )}

        {/* Assistant: Save Proposal Modal */}
        {isSaveProposalModalOpen && (
          <SaveProposalModal
            onClose={() => setIsSaveProposalModalOpen(false)}
            onSaveProposal={handleSaveAssistantProposal}
            changesCount={assistantChangesCount}
          />
        )}

        {/* Add Edge Modal (Assistant Mode) */}
        {isAddEdgeModalOpen && addEdgeSourceNode && (
          <AddEdgeModal
            mode={mode}
            sourceNode={addEdgeSourceNode}
            nodes={nodes}
            edges={edges}
            onClose={() => {
              setIsAddEdgeModalOpen(false);
              setAddEdgeSourceNodeId(null);
            }}
            onAddEdgeToExisting={handleAddEdgeToExisting}
            onAddEdgeToNewNode={handleAddEdgeToNewNode}
          />
        )}

        {toastMessage && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-sky-500/50 shadow-2xl px-4 py-2 rounded-full text-xs text-sky-200 flex items-center gap-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
