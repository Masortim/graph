import React, { useState, useMemo, useEffect } from 'react';
import type { GraphNode } from '../types/graph';
import { 
  Search, 
  FolderTree, 
  Sparkles, 
  GitMerge, 
  X
} from 'lucide-react';

interface NodeListSidebarProps {
  nodes: GraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  onOpenCreateModal: () => void;
  onOpenMergeModal: () => void;
  onHighlightNodes?: (nodeIds: Set<string> | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const NodeListSidebar: React.FC<NodeListSidebarProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onOpenCreateModal,
  onOpenMergeModal,
  onHighlightNodes,
  isOpen,
  onToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredNodes = useMemo(() => {
    return nodes
      .filter(node => {
        if (filterType !== 'all' && node.type !== filterType) {
          return false;
        }
        if (!searchTerm.trim()) return true;
        const term = searchTerm.trim().toLowerCase();
        const inEn = node.labelEn.toLowerCase().includes(term);
        const inCn = node.labelCn.toLowerCase().includes(term);
        const inPhrases = node.keyPhrases?.some(p => p.toLowerCase().includes(term));
        const inText = node.rawText?.toLowerCase().includes(term);
        const inInfo = node.infoBadge?.content?.toLowerCase().includes(term);
        return inEn || inCn || inPhrases || inText || inInfo;
      })
      .sort((a, b) => a.labelEn.localeCompare(b.labelEn, undefined, { sensitivity: 'base' }));
  }, [nodes, filterType, searchTerm]);

  // Requirement 6: Highlight matching nodes on canvas when filter or search changes
  useEffect(() => {
    if (!isOpen) {
      onHighlightNodes?.(null);
      return;
    }
    if (filterType !== 'all' || searchTerm.trim().length > 0) {
      const ids = new Set(filteredNodes.map(n => n.id));
      onHighlightNodes?.(ids);
    } else {
      onHighlightNodes?.(null);
    }
  }, [filterType, searchTerm, filteredNodes, isOpen, onHighlightNodes]);

  const chapters = useMemo(() => nodes.filter(n => n.type === 'chapter'), [nodes]);
  const concepts = useMemo(() => nodes.filter(n => n.type === 'concept'), [nodes]);
  const merged = useMemo(() => nodes.filter(n => n.type === 'merged'), [nodes]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute left-4 top-16 z-20 p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 shadow-xl backdrop-blur-md transition flex items-center gap-2 text-xs font-medium"
        title="Открыть структуру графа"
      >
        <FolderTree className="w-4 h-4 text-sky-400" />
        <span>Узлы ({nodes.length})</span>
      </button>
    );
  }

  return (
    <div className="absolute left-4 top-16 bottom-6 w-80 max-w-[calc(100vw-2rem)] z-30 flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/70 rounded-xl shadow-2xl overflow-hidden transition-all duration-200">
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-200 text-xs">Структура графа ({nodes.length})</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2.5 border-b border-slate-800/80 bg-slate-950/40 grid grid-cols-2 gap-2">
        <button
          onClick={onOpenCreateModal}
          className="py-1.5 px-2 bg-amber-600/90 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow transition"
        >
          <Sparkles className="w-3.5 h-3.5" /> + Новый узел
        </button>
        <button
          onClick={onOpenMergeModal}
          className="py-1.5 px-2 bg-pink-600/90 hover:bg-pink-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow transition"
        >
          <GitMerge className="w-3.5 h-3.5" /> Слить узлы
        </button>
      </div>

      <div className="p-3 space-y-2 border-b border-slate-800 bg-slate-950/30">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Поиск по алфавиту, EN, 中文..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter buttons: Clicking highlights matching nodes & edges on canvas (Requirement 6) */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          {[
            { id: 'all', label: 'Все' },
            { id: 'chapter', label: 'Главы' },
            { id: 'section', label: 'Секции' },
            { id: 'subsection', label: 'Подсекции' },
            { id: 'concept', label: 'Концепты' },
            { id: 'merged', label: 'Слитые' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition ${
                filterType === f.id
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {filteredNodes.length === 0 ? (
          <div className="text-center py-8 text-slate-500 italic text-xs">
            Узлы не найдены
          </div>
        ) : (
          filteredNodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(node)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition border ${
                  isSelected
                    ? 'bg-sky-950/80 border-sky-500 text-white'
                    : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: node.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-xs">
                      {node.labelEn}
                    </div>
                    {node.labelCn && node.labelCn !== node.labelEn && (
                      <div className="text-[10px] text-slate-400 truncate">
                        {node.labelCn}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {node.infoBadge && (
                    <span title="Есть инфо-табличка" className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                    {node.connectedCount || 0}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex justify-between items-center">
        <span>Главы: {chapters.length}</span>
        <span>Концепты: {concepts.length}</span>
        <span>Слитые: {merged.length}</span>
      </div>
    </div>
  );
};
