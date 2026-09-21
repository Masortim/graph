import React, { useState, useMemo } from 'react';
import type { GraphNode } from '../types/graph';
import { findPhraseMatchesInGraph } from '../utils/phraseMatcher';
import { X, Plus, Tag, Sparkles, CheckCircle, Info, Palette } from 'lucide-react';

interface CreateNodeModalProps {
  nodes: GraphNode[];
  onClose: () => void;
  onCreateNode: (
    labelEn: string,
    labelCn: string,
    phrases: string[],
    infoText: string | undefined,
    color: string
  ) => void;
}

const PRESET_COLORS = [
  '#fbbf24', // Amber / Gold
  '#ffffff', // White
  '#94a3b8', // Grey / Slate
  '#10b981', // Emerald
  '#38bdf8', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#f43f5e', // Rose
];

export const CreateNodeModal: React.FC<CreateNodeModalProps> = ({
  nodes,
  onClose,
  onCreateNode,
}) => {
  const [labelEn, setLabelEn] = useState('');
  const [labelCn, setLabelCn] = useState('');
  const [phraseInput, setPhraseInput] = useState('');
  const [phrases, setPhrases] = useState<string[]>([]);
  const [infoText, setInfoText] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleAddPhrase = () => {
    const trimmed = phraseInput.trim();
    if (trimmed && !phrases.includes(trimmed)) {
      setPhrases([...phrases, trimmed]);
      setPhraseInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddPhrase();
    }
  };

  const handleRemovePhrase = (phraseToRemove: string) => {
    setPhrases(phrases.filter(p => p !== phraseToRemove));
  };

  const matchResults = useMemo(() => {
    if (phrases.length === 0) return [];
    return findPhraseMatchesInGraph(nodes, phrases);
  }, [nodes, phrases]);

  const totalMatchesCount = useMemo(() => {
    return matchResults.reduce((acc, r) => acc + r.totalCount, 0);
  }, [matchResults]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelEn.trim()) return;

    onCreateNode(
      labelEn.trim(),
      labelCn.trim() || labelEn.trim(),
      phrases,
      infoText.trim() || undefined,
      selectedColor
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Создать новый узел</h2>
              <p className="text-xs text-slate-400">Добавьте ключевые фразы для семантической привязки к заметкам</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Метка на английском (English Label) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Backpropagation"
                value={labelEn}
                onChange={e => setLabelEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Метка на китайском (中文 Label)
              </label>
              <input
                type="text"
                placeholder="e.g. 反向传播"
                value={labelCn}
                onChange={e => setLabelCn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              Цвет узла:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full border border-white/20 transition transform ${
                    selectedColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={selectedColor}
                onChange={e => setSelectedColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                title="Выбрать свой цвет"
              />
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <label className="block text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Ключевые фразы для поиска вхождений
            </label>
            <p className="text-[11px] text-slate-400 leading-tight">
              Введите ключевую фразу и нажмите <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">Enter</kbd> или кнопку «+». Поиск нечувствителен к регистру.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Введите фразу (например: gradient descent, chain rule)..."
                value={phraseInput}
                onChange={e => setPhraseInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddPhrase}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
            </div>

            {phrases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {phrases.map((phrase, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/70 border border-amber-700/60 text-amber-200 rounded-md text-xs font-medium"
                  >
                    {phrase}
                    <button
                      type="button"
                      onClick={() => handleRemovePhrase(phrase)}
                      className="hover:text-red-300 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {phrases.length > 0 && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Результаты сканирования заметок
                </span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded text-[11px] font-bold">
                  {totalMatchesCount} совпадений в {matchResults.length} узлах
                </span>
              </div>

              {matchResults.length === 0 ? (
                <p className="text-slate-500 italic text-[11px]">
                  Пока не найдено совпадений по этим фразам в текстах секций. Вы всё равно можете создать узел.
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {matchResults.map(r => (
                    <div
                      key={r.nodeId}
                      className="flex items-center justify-between p-1.5 bg-slate-900 rounded border border-slate-800 text-[11px]"
                    >
                      <span className="text-slate-300 font-medium truncate max-w-[280px]">
                        {r.nodeLabelEn} {r.nodeLabelCn && <span className="text-slate-500">({r.nodeLabelCn})</span>}
                      </span>
                      <span className="text-amber-400 font-semibold shrink-0">
                        {r.totalCount} {r.totalCount === 1 ? 'вхождение' : 'вхождений'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <label className="block text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Информационная табличка (необязательно)
            </label>
            <p className="text-[11px] text-slate-400">
              Текст, который будет прикреплён к узлу и высвечиваться при клике мыши.
            </p>
            <textarea
              rows={3}
              placeholder="Добавьте краткое описание, свойства или заметки к этому узлу..."
              value={infoText}
              onChange={e => setInfoText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-y"
            />
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
              disabled={!labelEn.trim()}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Создать узел и встроить в граф
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
