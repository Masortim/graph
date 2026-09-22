import React, { useState, useMemo, useEffect } from 'react';
import type { GraphNode, GraphEdge, AppMode } from '../types/graph';
import { X, Link2, Plus, Search, Palette, Sparkles, Check } from 'lucide-react';

interface AddEdgeModalProps {
  sourceNode: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
  onAddEdgeToExisting: (sourceId: string, targetId: string, weight: number) => void;
  onAddEdgeToNewNode: (
    sourceId: string,
    newLabelEn: string,
    newLabelCn: string,
    color: string,
    weight: number
  ) => void;
  mode?: AppMode;
}

const COLOR_PRESETS = [
  '#fbbf24', // Gold
  '#ffffff', // White
  '#94a3b8', // Grey
  '#38bdf8', // Cyan
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#10b981', // Emerald
];

export const AddEdgeModal: React.FC<AddEdgeModalProps> = ({
  sourceNode,
  nodes,
  edges,
  onClose,
  onAddEdgeToExisting,
  onAddEdgeToNewNode,
  mode = 'author',
}) => {
  const isAssistant = mode === 'assistant';
  // Assistant can only create new nodes from base nodes (Requirement 2.1)
  const canCreateNewNodeFromSource = !isAssistant || !sourceNode.isAssistantProposal;

  const [isCreatingNew, setIsCreatingNew] = useState(canCreateNewNodeFromSource);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New node fields
  const [newLabelEn, setNewLabelEn] = useState('');
  const [newLabelCn, setNewLabelCn] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [weight, setWeight] = useState(2);

  // Find all node IDs already connected to sourceNode
  const connectedNodeIds = useMemo(() => {
    const set = new Set<string>();
    edges.forEach(e => {
      if (e.source === sourceNode.id) set.add(e.target);
      if (e.target === sourceNode.id) set.add(e.source);
    });
    return set;
  }, [edges, sourceNode.id]);

  // Alphabetical sorted candidate nodes excluding source AND already connected nodes
  const sortedCandidates = useMemo(() => {
    return nodes
      .filter(n => n.id !== sourceNode.id && !connectedNodeIds.has(n.id))
      .sort((a, b) => a.labelEn.localeCompare(b.labelEn, undefined, { sensitivity: 'base' }))
      .filter(n => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.trim().toLowerCase();
        return (
          n.labelEn.toLowerCase().includes(term) ||
          n.labelCn.toLowerCase().includes(term) ||
          n.type.toLowerCase().includes(term)
        );
      });
  }, [nodes, sourceNode.id, connectedNodeIds, searchTerm]);

  // Ensure selectedTargetId always tracks the search filter accurately
  useEffect(() => {
    if (sortedCandidates.length > 0) {
      const stillInList = sortedCandidates.some(n => n.id === selectedTargetId);
      if (!stillInList) {
        setSelectedTargetId(sortedCandidates[0].id);
      }
    } else {
      setSelectedTargetId('');
    }
  }, [sortedCandidates, selectedTargetId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingNew) {
      if (!newLabelEn.trim()) return;
      onAddEdgeToNewNode(
        sourceNode.id,
        newLabelEn.trim(),
        newLabelCn.trim() || newLabelEn.trim(),
        color,
        weight
      );
    } else {
      if (!selectedTargetId) return;
      onAddEdgeToExisting(sourceNode.id, selectedTargetId, weight);
    }
    onClose();
  };

  const handleSelectAndSubmit = (targetId: string) => {
    setSelectedTargetId(targetId);
    onAddEdgeToExisting(sourceNode.id, targetId, weight);
    onClose();
  };

  const selectedNodeObj = useMemo(() => {
    return nodes.find(n => n.id === selectedTargetId);
  }, [nodes, selectedTargetId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isAssistant ? 'Add Connection' : 'Добавить связь'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAssistant ? (
                  <>Connect «<span className="text-sky-300 font-medium">{sourceNode.labelEn}</span>» with another node</>
                ) : (
                  <>Связать узел «<span className="text-sky-300 font-medium">{sourceNode.labelEn}</span>» с несоединенным узлом</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
          {/* Toggle between existing node and create new node */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                !isCreatingNew ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isAssistant ? `Existing Node (${sortedCandidates.length})` : `Существующий узел (${sortedCandidates.length})`}
            </button>
            <button
              type="button"
              disabled={!canCreateNewNodeFromSource}
              onClick={() => setIsCreatingNew(true)}
              className={`flex-1 py-1.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                !canCreateNewNodeFromSource 
                  ? 'opacity-40 cursor-not-allowed text-slate-500' 
                  : (isCreatingNew ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200')
              }`}
              title={!canCreateNewNodeFromSource ? (isAssistant ? "New nodes can only be attached to base graph nodes" : "Новые узлы можно привязывать только к базовым узлам") : undefined}
            >
              <Plus className="w-3.5 h-3.5" />
              {isAssistant ? 'Create New Node' : 'Создать новый узел'}
            </button>
          </div>

          {!isCreatingNew ? (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isAssistant ? 'Select target node (unconnected only):' : 'Выберите целевой узел (только не связанные):'}
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder={isAssistant ? "Quick search by title..." : "Быстрый поиск по названию..."}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Interactive candidate list */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-52 overflow-y-auto p-1.5 space-y-1">
                  {sortedCandidates.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 italic text-xs">
                      {isAssistant 
                        ? (searchTerm ? `No nodes match «${searchTerm}»` : 'No available unconnected nodes')
                        : (searchTerm ? `По запросу «${searchTerm}» узлы не найдены` : 'Нет доступных несвязанных узлов')}
                    </div>
                  ) : (
                    sortedCandidates.map(n => {
                      const isSelected = selectedTargetId === n.id;
                      return (
                        <div
                          key={n.id}
                          onClick={() => setSelectedTargetId(n.id)}
                          onDoubleClick={() => handleSelectAndSubmit(n.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition border ${
                            isSelected
                              ? 'bg-sky-950 border-sky-500 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: n.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-xs truncate block">
                                {n.labelEn}
                              </span>
                              {n.labelCn && n.labelCn !== n.labelEn && (
                                <span className="text-[10px] text-slate-400 truncate block">
                                  {n.labelCn}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedNodeObj && (
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 px-2 py-1 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span>{isAssistant ? 'Selected:' : 'Выбран:'}</span>
                    <strong className="text-sky-300 font-medium">{selectedNodeObj.labelEn}</strong>
                    {selectedNodeObj.labelCn && <span className="text-slate-400">({selectedNodeObj.labelCn})</span>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {isAssistant ? 'New Concept Node Parameters' : 'Параметры нового узла'}
              </span>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">English Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Matrix Inversion"
                  value={newLabelEn}
                  onChange={e => setNewLabelEn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Chinese Label (中文)</label>
                <input
                  type="text"
                  placeholder="e.g. 矩阵求逆"
                  value={newLabelCn}
                  onChange={e => setNewLabelCn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium flex items-center gap-1">
                  <Palette className="w-3 h-3 text-sky-400" /> {isAssistant ? 'Node Color:' : 'Цвет узла:'}
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full border transition transform ${
                        color === c ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100 border-slate-600'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Edge Weight */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
              <span>{isAssistant ? 'Edge Weight:' : 'Вес связи (Weight):'}</span>
              <span className="font-mono text-sky-300">{weight}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
            >
              {isAssistant ? 'Cancel' : 'Отмена'}
            </button>
            <button
              type="submit"
              disabled={isCreatingNew ? !newLabelEn.trim() : !selectedTargetId}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg font-bold flex items-center gap-1.5 shadow transition"
            >
              <Link2 className="w-3.5 h-3.5" />
              {isAssistant ? 'Create Connection' : 'Создать связь'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
