import React, { useState } from 'react';
import { X, Check, RotateCcw, MapPin, RefreshCw, FileText } from 'lucide-react';
import type { GraphNode } from '../types/graph';
import { DEFAULT_SECTION_COORDINATES_TEXT, formatSectionCoordinates } from '../utils/sectionCoordinates';

interface SectionCoordinatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinatesText: string;
  nodes: GraphNode[];
  onSaveCoordinates: (newText: string) => void;
  isAssistant?: boolean;
}

export const SectionCoordinatesModal: React.FC<SectionCoordinatesModalProps> = ({
  isOpen,
  onClose,
  coordinatesText,
  nodes,
  onSaveCoordinates,
  isAssistant = true,
}) => {
  const [text, setText] = useState(coordinatesText || DEFAULT_SECTION_COORDINATES_TEXT);

  if (!isOpen) return null;

  const handleGenerateFromGraph = () => {
    const formatted = formatSectionCoordinates(nodes);
    setText(formatted);
  };

  const handleResetDefaults = () => {
    setText(DEFAULT_SECTION_COORDINATES_TEXT);
  };

  const handleSave = () => {
    onSaveCoordinates(text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/60 text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {isAssistant ? 'Section Coordinates (Fix Sections)' : 'Координаты узлов-секций'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isAssistant ? 'Format: English Label:X:Y (Screen coordinates)' : 'Формат файла: Английское название:X:Y (координаты секций)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-slate-300">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>{isAssistant ? 'Coordinates definition per section line:' : 'Определение координат для каждой секции:'}</span>
            </span>

            <button
              type="button"
              onClick={handleGenerateFromGraph}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-medium text-sky-300 hover:text-sky-200 transition flex items-center gap-1 shadow-sm"
              title="Заполнить текущими координатами секций из графа"
            >
              <RefreshCw className="w-3 h-3 text-sky-400" />
              <span>{isAssistant ? 'Capture Current Graph' : 'Взять с текущего графа'}</span>
            </button>
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500 leading-relaxed shadow-inner"
            placeholder="Linear Independence & Span:320:220&#10;Basis and Dimension:520:220&#10;..."
          />

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-400 leading-relaxed">
            <p>• При включённой кнопке-галочке <strong>Fix Sections</strong> узлы секций центрируются по этим координатам и остаются неподвижными в физике.</p>
            <p>• Не-секционные узлы (главы, подсекции, концепты) продолжают динамически группироваться вокруг них по ForceAtlas2.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3.5 border-t border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAssistant ? 'Reset Defaults' : 'По умолчанию'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
            >
              {isAssistant ? 'Cancel' : 'Отмена'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition text-xs shadow-md shadow-amber-950"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isAssistant ? 'Save & Apply' : 'Сохранить и применить'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
