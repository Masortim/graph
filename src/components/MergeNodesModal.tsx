import React, { useState, useMemo, useEffect } from 'react';
import type { GraphNode, GraphEdge } from '../types/graph';
import { X, GitMerge, Search, Check } from 'lucide-react';

interface MergeNodesModalProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  initialNodeId?: string | null;
  onClose: () => void;
  onMergeNodes: (
    nodeAId: string,
    nodeBId: string,
    primaryLabelEn: string,
    primaryLabelCn: string,
    color: string
  ) => void;
}

export const MergeNodesModal: React.FC<MergeNodesModalProps> = ({
  nodes,
  edges,
  initialNodeId,
  onClose,
  onMergeNodes,
}) => {
  // Sort all nodes alphabetically by English label
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => a.labelEn.localeCompare(b.labelEn, undefined, { sensitivity: 'base' }));
  }, [nodes]);

  const [nodeAId, setNodeAId] = useState<string>(() => {
    if (initialNodeId && nodes.some(n => n.id === initialNodeId)) {
      return initialNodeId;
    }
    return sortedNodes[0]?.id || '';
  });

  const [searchTermB, setSearchTermB] = useState('');

  // Filter candidates for Node B, alphabetically sorted
  const candidateNodesB = useMemo(() => {
    return sortedNodes.filter(n => {
      if (n.id === nodeAId) return false;
      if (!searchTermB.trim()) return true;
      const term = searchTermB.trim().toLowerCase();
      return (
        n.labelEn.toLowerCase().includes(term) ||
        n.labelCn.toLowerCase().includes(term) ||
        n.type.toLowerCase().includes(term)
      );
    });
  }, [sortedNodes, nodeAId, searchTermB]);

  const [nodeBId, setNodeBId] = useState<string>(() => {
    return candidateNodesB[0]?.id || '';
  });

  // Bugfix: ensure nodeBId always tracks candidate list when search term changes
  useEffect(() => {
    if (candidateNodesB.length > 0) {
      const exists = candidateNodesB.some(n => n.id === nodeBId);
      if (!exists) {
        setNodeBId(candidateNodesB[0].id);
      }
    } else {
      setNodeBId('');
    }
  }, [candidateNodesB, nodeBId]);

  const nodeA = useMemo(() => nodes.find(n => n.id === nodeAId), [nodes, nodeAId]);
  const nodeB = useMemo(() => nodes.find(n => n.id === nodeBId), [nodes, nodeBId]);

  // Default labels: Strictly match the primary node (Node A) where "Merge" was pressed
  const [customLabelEn, setCustomLabelEn] = useState(() => nodeA?.labelEn || '');
  const [customLabelCn, setCustomLabelCn] = useState(() => nodeA?.labelCn || nodeA?.labelEn || '');
  const [color, setColor] = useState(() => nodeA?.color || '#ec4899');

  useEffect(() => {
    if (nodeA) {
      setCustomLabelEn(nodeA.labelEn);
      setCustomLabelCn(nodeA.labelCn || nodeA.labelEn);
      setColor(nodeA.color || '#ec4899');
    }
  }, [nodeA]);

  const simulation = useMemo(() => {
    if (!nodeA || !nodeB) return { totalEdges: 0, sharedTargets: 0, uniqueTargets: [] };

    const edgesA = edges.filter(e => e.source === nodeA.id || e.target === nodeA.id);
    const edgesB = edges.filter(e => e.source === nodeB.id || e.target === nodeB.id);

    const targetsA = new Set(
      edgesA.map(e => (e.source === nodeA.id ? e.target : e.source)).filter(id => id !== nodeB.id)
    );
    const targetsB = new Set(
      edgesB.map(e => (e.source === nodeB.id ? e.target : e.source)).filter(id => id !== nodeA.id)
    );

    let shared = 0;
    targetsA.forEach(t => {
      if (targetsB.has(t)) shared++;
    });

    const unionTargets = new Set([...Array.from(targetsA), ...Array.from(targetsB)]);

    return {
      totalEdges: unionTargets.size,
      sharedTargets: shared,
      uniqueTargetsCount: unionTargets.size,
    };
  }, [nodeA, nodeB, edges]);

  const handleMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeAId || !nodeBId || nodeAId === nodeBId) return;

    onMergeNodes(
      nodeAId,
      nodeBId,
      customLabelEn.trim() || nodeA?.labelEn || 'Merged Node',
      customLabelCn.trim() || (nodeA?.labelCn || customLabelEn.trim()),
      color
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Слияние узлов (Merge Nodes)</h2>
              <p className="text-xs text-slate-400">Название слитого узла по умолчанию берётся из исходного узла A</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleMerge} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Node A (Primary) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block mb-1">
                Исходный узел А (Базовый)
              </span>
              <select
                value={nodeAId}
                onChange={e => {
                  const newId = e.target.value;
                  setNodeAId(newId);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
              >
                {sortedNodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.labelEn} {n.labelCn ? `(${n.labelCn})` : ''} [{n.type}]
                  </option>
                ))}
              </select>

              {nodeA && (
                <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: nodeA.color }} />
                    <span className="text-slate-200 font-medium">{nodeA.labelEn}</span>
                  </div>
                  <div>Тип: <span className="text-slate-300 capitalize">{nodeA.type}</span></div>
                  <div>Связей: <span className="text-slate-300">{nodeA.connectedCount || 0}</span></div>
                </div>
              )}
            </div>

            {/* Node B (Candidate search & select) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block mb-1">
                Узел B для слияния (по алфавиту)
              </span>
              <div className="relative mb-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Быстрый поиск узла B..."
                  value={searchTermB}
                  onChange={e => setSearchTermB(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Interactive candidate list ensuring accurate selection */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg max-h-36 overflow-y-auto p-1 space-y-1">
                {candidateNodesB.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 italic text-[11px]">
                    Узлы не найдены
                  </div>
                ) : (
                  candidateNodesB.map(n => {
                    const isSelected = nodeBId === n.id;
                    return (
                      <div
                        key={n.id}
                        onClick={() => setNodeBId(n.id)}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition border ${
                          isSelected
                            ? 'bg-pink-950/80 border-pink-500 text-white shadow-sm'
                            : 'bg-slate-950/40 border-transparent hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: n.color }}
                          />
                          <span className="font-medium text-[11px] truncate block">
                            {n.labelEn} {n.labelCn && n.labelCn !== n.labelEn ? `(${n.labelCn})` : ''}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-pink-500 text-slate-950 flex items-center justify-center text-[9px] font-bold shrink-0 ml-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {nodeB && (
                <div className="pt-1 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span>Выбран B:</span>
                    <strong className="text-pink-300 font-medium">{nodeB.labelEn}</strong>
                  </div>
                  <div>Связей: <span className="text-slate-300">{nodeB.connectedCount || 0}</span></div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-semibold text-pink-400 block">
              Параметры результирующего слитого узла
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Итоговая английская метка (по умолчанию узел A)
                </label>
                <input
                  type="text"
                  value={customLabelEn}
                  onChange={e => setCustomLabelEn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Итоговая китайская метка (по умолчанию узел A)
                </label>
                <input
                  type="text"
                  value={customLabelCn}
                  onChange={e => setCustomLabelCn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Итоговых связей</div>
                <div className="text-sm font-bold text-pink-300 mt-0.5">{simulation.totalEdges}</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Общих соседей</div>
                <div className="text-sm font-bold text-purple-300 mt-0.5">{simulation.sharedTargets}</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Ключевых фраз</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">
                  {((nodeA?.keyPhrases?.length || 0) + (nodeB?.keyPhrases?.length || 0))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!nodeAId || !nodeBId || nodeAId === nodeBId}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <GitMerge className="w-3.5 h-3.5" /> Выполнить слияние узлов
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
