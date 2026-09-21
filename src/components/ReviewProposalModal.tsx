import React, { useState, useRef } from 'react';
import type { ProposalChangeItem } from '../types/graph';
import { 
  X, 
  CheckSquare, 
  Square, 
  GripHorizontal, 
  User, 
  Clock, 
  PlusCircle, 
  Edit3, 
  Trash, 
  Spline, 
  FileText 
} from 'lucide-react';

interface ReviewProposalModalProps {
  proposalAuthor: string;
  proposalDate: string;
  proposalNotes?: string;
  changes: ProposalChangeItem[];
  onToggleProcessed: (id: string) => void;
  onFocusTarget: (targetId: string, type: 'node' | 'edge') => void;
  onClose: () => void;
}

export const ReviewProposalModal: React.FC<ReviewProposalModalProps> = ({
  proposalAuthor,
  proposalDate,
  proposalNotes,
  changes,
  onToggleProcessed,
  onFocusTarget,
  onClose,
}) => {
  // Draggable window state
  const [position, setPosition] = useState({ x: window.innerWidth > 900 ? window.innerWidth - 440 : 20, y: 80 });
  const isDragging = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const nextX = Math.max(10, Math.min(window.innerWidth - 420, moveEvent.clientX - dragStartOffset.current.x));
      const nextY = Math.max(60, Math.min(window.innerHeight - 300, moveEvent.clientY - dragStartOffset.current.y));
      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const processedCount = changes.filter(c => c.isProcessed).length;
  const formattedDate = proposalDate ? new Date(proposalDate).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '';

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="absolute w-96 max-w-[calc(100vw-2rem)] z-40 flex flex-col bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden text-xs transition-shadow"
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleMouseDown}
        className="px-4 py-3 bg-gradient-to-r from-amber-950/80 to-slate-900 border-b border-amber-700/40 flex items-center justify-between cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-amber-400 opacity-70" />
          <div>
            <div className="font-bold text-amber-200 text-xs flex items-center gap-1.5">
              <span>Лог правок помощника</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-900/60 border border-amber-600/60 rounded text-amber-300 font-mono">
                {processedCount}/{changes.length}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
          title="Скрыть панель"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metadata Banner */}
      <div className="p-3 bg-slate-950/70 border-b border-slate-800 text-[11px] space-y-1 text-slate-300">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-slate-200">
            <User className="w-3.5 h-3.5 text-amber-400" />
            {proposalAuthor || 'Ассистент'}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            {formattedDate}
          </span>
        </div>
        {proposalNotes && (
          <p className="text-slate-400 italic text-[10px] pt-1 border-t border-slate-800/80">
            «{proposalNotes}»
          </p>
        )}
      </div>

      {/* Changes List */}
      <div className="max-h-80 overflow-y-auto p-3 space-y-2">
        {changes.length === 0 ? (
          <div className="text-center py-6 text-slate-500 italic">
            Нет зарегистрированных предложений
          </div>
        ) : (
          changes.map(item => {
            const isProcessed = !!item.isProcessed;
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border transition flex items-start gap-2.5 ${
                  isProcessed
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-50'
                    : 'bg-slate-950/80 border-slate-700 hover:border-amber-500/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleProcessed(item.id)}
                  className="mt-0.5 text-amber-400 hover:text-amber-300 transition shrink-0"
                  title={isProcessed ? 'Отметить как не обработанное' : 'Отметить как обработанное'}
                >
                  {isProcessed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    if (item.type === 'add_node' || item.type === 'edit_node_badge') {
                      onFocusTarget(item.targetId, 'node');
                    } else {
                      onFocusTarget(item.targetId, 'edge');
                    }
                  }}
                  title="Нажмите, чтобы показать на графе"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.type === 'add_node' && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center gap-1">
                        <PlusCircle className="w-3 h-3" /> Новый узел
                      </span>
                    )}
                    {item.type === 'edit_edge_badge' && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-sky-950 border border-sky-700 text-sky-300 flex items-center gap-1">
                        <Spline className="w-3 h-3" /> Связь
                      </span>
                    )}
                    {item.type === 'recommend_delete_edge' && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-rose-950 border border-rose-700 text-rose-300 flex items-center gap-1">
                        <Trash className="w-3 h-3" /> Удалить связь
                      </span>
                    )}
                    {item.type === 'edit_node_badge' && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-purple-950 border border-purple-700 text-purple-300 flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Карточка
                      </span>
                    )}
                    <span className={`font-bold text-xs truncate text-slate-100 ${isProcessed ? 'line-through text-slate-400' : ''}`}>
                      {item.targetTitle}
                    </span>
                  </div>

                  <p className={`text-[11px] text-slate-300 leading-tight ${isProcessed ? 'line-through text-slate-500' : ''}`}>
                    {item.description}
                  </p>

                  {item.details && (
                    <div className="mt-1 p-1.5 bg-slate-900 rounded border border-slate-800 text-[10px] text-slate-400 flex items-start gap-1 font-mono">
                      <FileText className="w-3 h-3 shrink-0 text-slate-500 mt-0.5" />
                      <span className="truncate">{item.details}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Клик по строке центрирует камеру</span>
        <span className="text-[10px] text-amber-400 font-medium">Перемещайте окно за шапку</span>
      </div>
    </div>
  );
};
