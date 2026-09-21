import React, { useState } from 'react';
import type { GraphNode } from '../types/graph';
import { Network, X, Layers, Check } from 'lucide-react';

interface LocalGraphModalProps {
  node: GraphNode;
  isAlreadyLocalRoot: boolean;
  onClose: () => void;
  onEnterLocalGraph: (nodeId: string, depth: 1 | 2) => void;
  onExitLocalGraph: () => void;
  onDepthPreview?: (depth: 1 | 2) => void;
}

export const LocalGraphModal: React.FC<LocalGraphModalProps> = ({
  node,
  isAlreadyLocalRoot,
  onClose,
  onEnterLocalGraph,
  onExitLocalGraph,
  onDepthPreview,
}) => {
  const [depth, setDepth] = useState<1 | 2>(1);

  const handleDepthChange = (newDepth: 1 | 2) => {
    setDepth(newDepth);
    onDepthPreview?.(newDepth);
  };

  const headerTitle = `${node.labelEn}${node.labelCn && node.labelCn !== node.labelEn ? ` | ${node.labelCn}` : ''}`;

  if (isAlreadyLocalRoot) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-xs">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-sm text-slate-100">Показать полный граф?</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-3 text-slate-300">
            <p className="text-xs leading-relaxed">
              Вы находитесь в режиме локального графа для узла <strong className="text-sky-300">«{node.labelEn}»</strong>.
            </p>
            <p className="text-slate-400 text-[11px]">
              Вернуть отображение всех узлов и связей хранилища?
            </p>
          </div>

          <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
            >
              Нет
            </button>
            <button
              onClick={() => {
                onExitLocalGraph();
                onClose();
              }}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow"
            >
              Да, показать полный граф
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-xs">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-slate-100">Локальный граф узла</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-[11px] text-slate-400 mb-1">Показать локальный граф узла:</div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
              <span className="font-bold text-slate-100 text-xs truncate">{headerTitle}</span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-2 flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-sky-400" /> Выберите глубину связей (Depth):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDepthChange(1)}
                className={`p-3 rounded-xl border text-left transition ${
                  depth === 1
                    ? 'bg-sky-950/90 border-sky-500 text-white shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">Глубина 1</span>
                  {depth === 1 && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Только прямые соседи узла и связи между ними
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDepthChange(2)}
                className={`p-3 rounded-xl border text-left transition ${
                  depth === 2
                    ? 'bg-sky-950/90 border-sky-500 text-white shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">Глубина 2</span>
                  {depth === 2 && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Соседи 1-го и 2-го порядка и связи между ними
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
          >
            Нет
          </button>
          <button
            onClick={() => {
              onEnterLocalGraph(node.id, depth);
              onClose();
            }}
            className="px-5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow transition flex items-center gap-1.5"
          >
            <Network className="w-3.5 h-3.5" /> Да, показать
          </button>
        </div>
      </div>
    </div>
  );
};
