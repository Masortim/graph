import React, { useState } from 'react';
import type { GraphNode } from '../types/graph';
import { 
  exportLabelsToJson, 
  exportLabelsToDictJson, 
  exportLabelsToCsv, 
  applyLabelsToNodes 
} from '../utils/labelExporter';
import { 
  X, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Languages, 
  Sparkles
} from 'lucide-react';

interface LabelsModalProps {
  nodes: GraphNode[];
  onClose: () => void;
  onApplyLabels: (updatedNodes: GraphNode[], updatedCount: number) => void;
}

export const LabelsModal: React.FC<LabelsModalProps> = ({
  nodes,
  onClose,
  onApplyLabels,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'json-dict' | 'json-full' | 'csv'>('json-dict');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [importedMessage, setImportedMessage] = useState<string | null>(null);

  const getExportContent = () => {
    switch (exportFormat) {
      case 'json-dict':
        return exportLabelsToDictJson(nodes);
      case 'json-full':
        return exportLabelsToJson(nodes);
      case 'csv':
        return exportLabelsToCsv(nodes, '\t');
      default:
        return exportLabelsToDictJson(nodes);
    }
  };

  const handleCopy = () => {
    const text = getExportContent();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = () => {
    const text = getExportContent();
    const ext = exportFormat === 'csv' ? 'tsv' : 'json';
    const mime = exportFormat === 'csv' ? 'text/tab-separated-values' : 'application/json';
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-labels-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content) {
        setImportText(content);
        processImport(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processImport = (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    try {
      const { updatedNodes, updatedCount } = applyLabelsToNodes(nodes, textToProcess);
      if (updatedCount > 0) {
        onApplyLabels(updatedNodes, updatedCount);
        setImportedMessage(`Успешно обновлено ${updatedCount} меток узлов!`);
      } else {
        setImportedMessage('Совпадающих меток не найдено. Проверьте формат файла.');
      }
    } catch (err) {
      console.error(err);
      setImportedMessage('Ошибка при обработке файла меток.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Метки и переводы узлов (EN + 中文)</h2>
              <p className="text-xs text-slate-400">Выгрузка меток для перевода и пакетная загрузка обратно в граф</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => {
              setActiveTab('export');
              setImportedMessage(null);
            }}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт меток ({nodes.length} узлов)
          </button>

          <button
            onClick={() => {
              setActiveTab('import');
              setImportedMessage(null);
            }}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Импорт переводов
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-300 font-medium">Формат выгрузки:</span>
                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setExportFormat('json-dict')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      exportFormat === 'json-dict' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    JSON Словарь (EN → CN)
                  </button>
                  <button
                    onClick={() => setExportFormat('json-full')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      exportFormat === 'json-full' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    JSON Полный
                  </button>
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      exportFormat === 'csv' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    TSV / Таблица
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={getExportContent()}
                  rows={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-none resize-none select-all"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-slate-400 text-[11px]">
                  Скопируйте текст или скачайте файл, чтобы добавить китайские переводы.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать файл</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <label className="block text-slate-300 font-medium">
                  Загрузить файл или вставить текст с переводами:
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Поддерживается JSON (словарь <code>{`{"English": "中文"}`}</code> или массив) и файлы TSV/CSV. Система автоматически найдёт совпадения по названию узла и обновит китайские метки.
                </p>

                <div className="flex gap-2 pt-1">
                  <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg cursor-pointer font-medium flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Выбрать файл (.json / .tsv / .csv)</span>
                    <input
                      type="file"
                      accept=".json,.tsv,.csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Либо вставьте текст переводов сюда:
                </label>
                <textarea
                  placeholder='Вставьте JSON или TSV сюда, например:&#10;{&#10;  "Neural Networks": "神经网络",&#10;  "Backpropagation": "反向传播"&#10;}'
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-y"
                />
              </div>

              {importedMessage && (
                <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{importedMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  disabled={!importText.trim()}
                  onClick={() => processImport(importText)}
                  className="px-5 py-2 bg-gradient-to-r from-sky-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1.5 shadow transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Применить переводы к графу
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
