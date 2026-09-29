import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { GraphNode, GraphEdge, AppMode } from '../types/graph';
import { 
  X, 
  Tag, 
  GitMerge, 
  Edit3, 
  Check, 
  Trash2, 
  Info, 
  Palette, 
  Link2, 
  RefreshCw, 
  Plus, 
  Bold, 
  PlusCircle, 
  MinusCircle, 
  Undo2, 
  Lock, 
  BookOpen 
} from 'lucide-react';
import { calculateNodeSizeLevel } from '../utils/nodeMetrics';
import { renderLatexToHtml } from '../utils/latexRenderer';
import { tokenizeLine, BADGE_SQUARE_COLORS } from '../utils/badgeFormatter';
import { LatexHelpModal } from './LatexHelpModal';

interface InfoCardModalProps {
  node: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
  onUpdateInfoBadge: (nodeId: string, content: string) => void;
  onUpdateBadgeScale: (nodeId: string, scale: number) => void;
  onUpdateProperties: (
    nodeId: string, 
    labelEn: string, 
    labelCn: string, 
    color: string, 
    customSizeLevel?: number
  ) => void;
  onPreviewProperties?: (
    nodeId: string,
    updates: { color?: string; customSizeLevel?: number }
  ) => void;
  onUpdateKeyPhrases: (nodeId: string, keyPhrases: string[]) => void;
  onUpdateNodeFrequencyAndSize: (nodeId: string) => void;
  onOpenMergeModal: (nodeId: string) => void;
  onOpenAddEdgeModal: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onSelectNodeById: (nodeId: string) => void;
  onUnmergeNode?: (parentNodeId: string, extractNodeId?: string) => void;
  mode?: AppMode;
}

const COLOR_PALETTE = [
  '#38bdf8', // Cyan
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#fbbf24', // Amber
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#f43f5e', // Rose
  '#94a3b8', // Gray
];

export const InfoCardModal: React.FC<InfoCardModalProps> = ({
  node,
  nodes,
  edges,
  onClose,
  onUpdateInfoBadge,
  onUpdateBadgeScale,
  onUpdateProperties,
  onPreviewProperties,
  onUpdateKeyPhrases,
  onUpdateNodeFrequencyAndSize,
  onOpenMergeModal,
  onOpenAddEdgeModal,
  onDeleteEdge,
  onDeleteNode,
  onSelectNodeById,
  onUnmergeNode,
  mode = 'assistant',
}) => {
  const isAssistant = mode === 'assistant';
  const isOriginalNode = !node.isAssistantProposal;
  const isTitleReadOnly = isAssistant && isOriginalNode;

  // 1. Info Badge Editing State & Ref
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoContent, setInfoContent] = useState(node.infoBadge?.content || '');
  const [showLatexHelp, setShowLatexHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Badge Scale: 1.0 (100%) to 3.0 (300%), step 0.25
  const badgeScale = node.badgeScale || node.infoBadge?.scale || 1.0;

  // 2. Node Properties Editing State (Labels, Color, Manual Size Level)
  const [isEditingProperties, setIsEditingProperties] = useState(false);
  const [labelEn, setLabelEn] = useState(node.labelEn);
  const [labelCn, setLabelCn] = useState(node.labelCn || '');
  const [selectedColor, setSelectedColor] = useState(node.color);

  // Keep original state for reverting on cancel
  const originalPropertiesRef = useRef({
    labelEn: node.labelEn,
    labelCn: node.labelCn || '',
    color: node.color,
    customSizeLevel: node.customSizeLevel,
  });

  const effectiveSizeLevel = useMemo(() => {
    if (node.customSizeLevel !== undefined) {
      return node.customSizeLevel;
    }
    return calculateNodeSizeLevel(node, node.connectedCount || 0, node.frequency || 0);
  }, [node]);

  const [customSizeLevel, setCustomSizeLevel] = useState<number>(effectiveSizeLevel);

  // 3. Key Phrases Editing State
  const [isEditingPhrases, setIsEditingPhrases] = useState(false);
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [currentPhrases, setCurrentPhrases] = useState<string[]>(node.keyPhrases || []);

  // Synchronize internal state whenever the selected node changes
  useEffect(() => {
    setIsEditingInfo(false);
    setInfoContent(node.infoBadge?.content || '');
    setIsEditingProperties(false);
    setLabelEn(node.labelEn);
    setLabelCn(node.labelCn || '');
    setSelectedColor(node.color);
    const effSize = node.customSizeLevel !== undefined 
      ? node.customSizeLevel 
      : calculateNodeSizeLevel(node, node.connectedCount || 0, node.frequency || 0);
    setCustomSizeLevel(effSize);
    setIsEditingPhrases(false);
    setCurrentPhrases(node.keyPhrases || []);
    originalPropertiesRef.current = {
      labelEn: node.labelEn,
      labelCn: node.labelCn || '',
      color: node.color,
      customSizeLevel: node.customSizeLevel,
    };
  }, [node.id, node.labelEn, node.labelCn, node.color, node.customSizeLevel, node.infoBadge?.content, node.keyPhrases, node.connectedCount, node.frequency, node]);

  // Connected Edges & Neighbor Nodes
  const connectedEdges = useMemo(() => {
    return edges.filter(e => e.source === node.id || e.target === node.id);
  }, [edges, node.id]);

  const neighborNodes = useMemo(() => {
    return connectedEdges.map(edge => {
      const neighborId = edge.source === node.id ? edge.target : edge.source;
      const neighbor = nodes.find(n => n.id === neighborId);
      return {
        edge,
        neighbor,
        isOutgoing: edge.source === node.id,
      };
    }).filter((item): item is { edge: GraphEdge; neighbor: GraphNode; isOutgoing: boolean } => item.neighbor !== undefined);
  }, [connectedEdges, node.id, nodes]);

  // Markdown Formatter with KaTeX math rendering and Colored Squares
  const renderMarkdownFormatted = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    return lines.map((line, lineIdx) => {
      if (!line) {
        return <div key={lineIdx} className="h-3.5" />;
      }
      const segments = tokenizeLine(line);
      return (
        <div key={lineIdx} className="min-h-[1.25em] my-0.5 leading-relaxed flex items-center flex-wrap gap-x-1">
          {segments.map((seg, segIdx) => {
            if (seg.type === 'bold') {
              return (
                <strong key={segIdx} className="font-bold text-white">
                  {seg.text}
                </strong>
              );
            }
            if (seg.type === 'square') {
              return (
                <span
                  key={segIdx}
                  className="inline-block shadow-sm shrink-0 mx-0.5 align-middle"
                  style={{
                    backgroundColor: seg.squareColor || BADGE_SQUARE_COLORS.yellow,
                    width: '1.2em',
                    height: '1.2em',
                  }}
                />
              );
            }
            if (seg.type === 'latex') {
              const rawLatex = seg.latex || seg.text || '';
              return (
                <span
                  key={segIdx}
                  className="inline-block px-1 py-0.2 rounded bg-slate-900/90 text-sky-200 font-serif text-[11px] shadow-sm align-middle"
                  dangerouslySetInnerHTML={{ __html: renderLatexToHtml(rawLatex) }}
                />
              );
            }
            return (
              <span key={segIdx} className="text-slate-300">
                {seg.text}
              </span>
            );
          })}
        </div>
      );
    });
  };

  // Helper for Bold Markdown Insertion
  const toggleBoldFormat = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = infoContent;
    const selectedText = text.substring(start, end);

    if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
      const unbolded = selectedText.slice(2, -2);
      const newText = text.substring(0, start) + unbolded + text.substring(end);
      setInfoContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + unbolded.length);
      }, 0);
    } else {
      const bolded = `**${selectedText}**`;
      const newText = text.substring(0, start) + bolded + text.substring(end);
      setInfoContent(newText);
      setTimeout(() => {
        textarea.focus();
        if (selectedText.length === 0) {
          textarea.setSelectionRange(start + 2, start + 2);
        } else {
          textarea.setSelectionRange(start, start + bolded.length);
        }
      }, 0);
    }
  };

  // Insert Colored Square Emoji (🟨, 🟦, 🟩)
  const insertColoredSquare = (squareEmoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = infoContent;

    const newText = text.substring(0, start) + squareEmoji + ' ' + text.substring(end);
    setInfoContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + squareEmoji.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Insert LaTeX Snippet from Formula Helper Modal
  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setInfoContent(prev => (prev ? prev + ' ' + snippet : snippet));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = infoContent;

    const newText = text.substring(0, start) + snippet + text.substring(end);
    setInfoContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + snippet.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Handlers for Info Badge
  const handleSaveInfo = () => {
    onUpdateInfoBadge(node.id, infoContent);
    setIsEditingInfo(false);
  };

  const handleClearInfo = () => {
    if (window.confirm('Очистить карточку узла?')) {
      setInfoContent('');
      onUpdateInfoBadge(node.id, '');
      setIsEditingInfo(false);
    }
  };

  // Handlers for Properties (Live preview on color / size change)
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    if (onPreviewProperties) {
      onPreviewProperties(node.id, { color: newColor, customSizeLevel });
    }
  };

  const handleSizeLevelChange = (newSize: number) => {
    setCustomSizeLevel(newSize);
    if (onPreviewProperties) {
      onPreviewProperties(node.id, { color: selectedColor, customSizeLevel: newSize });
    }
  };

  const handleSaveProperties = () => {
    onUpdateProperties(
      node.id,
      labelEn.trim(),
      labelCn.trim(),
      selectedColor,
      customSizeLevel
    );
    originalPropertiesRef.current = {
      labelEn: labelEn.trim(),
      labelCn: labelCn.trim(),
      color: selectedColor,
      customSizeLevel,
    };
    setIsEditingProperties(false);
  };

  const handleCancelProperties = () => {
    const orig = originalPropertiesRef.current;
    setLabelEn(orig.labelEn);
    setLabelCn(orig.labelCn);
    setSelectedColor(orig.color);
    setCustomSizeLevel(orig.customSizeLevel !== undefined ? orig.customSizeLevel : effectiveSizeLevel);

    // Revert visual canvas preview to original values
    if (onPreviewProperties) {
      onPreviewProperties(node.id, { 
        color: orig.color, 
        customSizeLevel: orig.customSizeLevel 
      });
    }
    setIsEditingProperties(false);
  };

  // Handlers for Key Phrases
  const handleAddPhrase = () => {
    if (!newPhraseInput.trim()) return;
    const normalized = newPhraseInput.trim().toLowerCase();
    if (!currentPhrases.includes(normalized)) {
      const updated = [...currentPhrases, normalized];
      setCurrentPhrases(updated);
      onUpdateKeyPhrases(node.id, updated);
    }
    setNewPhraseInput('');
  };

  const handleRemovePhrase = (phraseToRemove: string) => {
    const updated = currentPhrases.filter(p => p !== phraseToRemove);
    setCurrentPhrases(updated);
    onUpdateKeyPhrases(node.id, updated);
  };

  const handleZoomBadgeOut = () => {
    const nextScale = Math.max(1.0, Math.round((badgeScale - 0.25) * 100) / 100);
    onUpdateBadgeScale(node.id, nextScale);
  };

  const handleZoomBadgeIn = () => {
    const nextScale = Math.min(3.0, Math.round((badgeScale + 0.25) * 100) / 100);
    onUpdateBadgeScale(node.id, nextScale);
  };

  return (
    <div className="absolute right-4 top-16 bottom-6 w-96 max-w-[calc(100vw-2rem)] z-30 flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/70 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-white/20"
            style={{ backgroundColor: node.color }}
          />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100 truncate">
              {node.labelEn}
            </h2>
            {node.labelCn && node.labelCn !== node.labelEn && (
              <p className="text-[11px] text-sky-400 truncate">
                {node.labelCn}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg transition shrink-0"
          title="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        
        {/* Unmerge Banner for Merged Nodes */}
        {node.type === 'merged' && node.mergedFrom && (
          <div className="bg-indigo-950/70 border border-indigo-700/60 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-indigo-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5" /> Объединенный узел
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Создан из «<strong>{node.mergedFrom.nodeALabel}</strong>» и «<strong>{node.mergedFrom.nodeBLabel}</strong>» ({node.mergedFrom.date.slice(0, 10)})
            </p>
            {onUnmergeNode && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onUnmergeNode(node.id)}
                  className="flex-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center justify-center gap-1 text-[11px] transition shadow"
                >
                  <Undo2 className="w-3 h-3" /> Разъединить оба узла
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1. Visual Properties & Sizing */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-sky-400" /> Свойства и размер узла
            </span>
            {!isEditingProperties ? (
              <button
                type="button"
                onClick={() => setIsEditingProperties(true)}
                className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition"
                title="Редактировать свойства"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelProperties}
                  className="px-2 py-0.5 text-slate-400 hover:text-slate-200 rounded"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveProperties}
                  className="px-2.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1 shadow"
                >
                  <Check className="w-3 h-3" /> OK
                </button>
              </div>
            )}
          </div>

          {isEditingProperties ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                  <span>English Title</span>
                  {isTitleReadOnly && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Master Node (Read-only)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={labelEn}
                  onChange={e => setLabelEn(e.target.value)}
                  disabled={isTitleReadOnly}
                  className={`w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-sky-500 ${
                    isTitleReadOnly ? 'opacity-60 cursor-not-allowed bg-slate-950' : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                  <span>Chinese Title (中文)</span>
                  {isTitleReadOnly && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Master Node (Read-only)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={labelCn}
                  onChange={e => setLabelCn(e.target.value)}
                  disabled={isTitleReadOnly}
                  className={`w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-sky-500 ${
                    isTitleReadOnly ? 'opacity-60 cursor-not-allowed bg-slate-950' : ''
                  }`}
                />
              </div>

              {/* Color Selection with Live Preview */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Цвет узла:</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className={`w-5 h-5 rounded-full border transition transform ${
                        selectedColor === c
                          ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900 scale-110'
                          : 'opacity-70 hover:opacity-100 border-slate-600'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={e => handleColorChange(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 ml-auto"
                    title="Произвольный цвет"
                  />
                </div>
              </div>

              {/* Size Level Slider (1 to 9) with Live Preview */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Размер узла (уровень 1–9):</span>
                  <span className="font-mono text-sky-400 font-bold">
                    Уровень {customSizeLevel} (R: {10 + customSizeLevel * 2.8}px)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="9"
                  step="1"
                  value={customSizeLevel}
                  onChange={e => handleSizeLevelChange(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-500 bg-slate-800 rounded h-1.5 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1 (Минимум)</span>
                  <span>5 (Средний)</span>
                  <span>9 (Максимум)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Размер узла:</span>
                <span className="font-semibold text-slate-200">
                  Уровень {effectiveSizeLevel} (R: {Math.round(node.radius || 16)}px)
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Связей:</span>
                <span className="font-semibold text-slate-200">
                  {node.connectedCount || connectedEdges.length}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Information Card (Attached Note & Formula) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sky-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Информационная карточка
            </span>

            <div className="flex items-center gap-1.5">
              {/* Scale Zoom Controls: 100% to 300% step 25% */}
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-full px-1.5 py-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={handleZoomBadgeOut}
                  disabled={badgeScale <= 1.0}
                  className="text-slate-400 hover:text-sky-300 disabled:opacity-30 transition p-0.5"
                  title="Уменьшить (-25%)"
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-sky-300 font-bold px-1 select-none">
                  {Math.round(badgeScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomBadgeIn}
                  disabled={badgeScale >= 3.0}
                  className="text-slate-400 hover:text-sky-300 disabled:opacity-30 transition p-0.5"
                  title="Увеличить (+25%)"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {!isEditingInfo && (
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(true)}
                  className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition"
                  title="Редактировать карточку"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {isEditingInfo ? (
            <div className="space-y-2">
              {/* Formatter Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 flex-wrap gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleBoldFormat}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3 h-3" />
                  </button>
                  <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟨')}
                    className="w-3.5 h-3.5 rounded bg-amber-400 hover:opacity-80"
                    title="Yellow Square (🟨)"
                  />
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟦')}
                    className="w-3.5 h-3.5 rounded bg-blue-500 hover:opacity-80"
                    title="Blue Square (🟦)"
                  />
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟩')}
                    className="w-3.5 h-3.5 rounded bg-emerald-500 hover:opacity-80"
                    title="Green Square (🟩)"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowLatexHelp(true)}
                  className="px-1.5 py-0.5 bg-sky-950 hover:bg-sky-900 border border-sky-700/60 rounded text-[10px] text-sky-300 font-medium flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3 text-sky-400" />
                  <span>$LaTeX$</span>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={infoContent}
                onChange={e => setInfoContent(e.target.value)}
                rows={5}
                placeholder="Введите текст карточки ($LaTeX$, **жирный**, 🟨 🟦 🟩)..."
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500 resize-y font-sans leading-relaxed"
              />

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleClearInfo}
                  className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Очистить
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInfo}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" /> Сохранить
                  </button>
                </div>
              </div>
            </div>
          ) : node.infoBadge?.content ? (
            <div 
              className="bg-slate-900/90 p-3 border text-xs space-y-1 shadow-sm rounded-lg"
              style={{ borderColor: node.color + '88' }}
            >
              <div 
                className="font-bold text-xs leading-tight"
                style={{ color: node.color }}
              >
                {node.labelEn} {node.labelCn && node.labelCn !== node.labelEn ? `| ${node.labelCn}` : ''}
              </div>
              <div 
                className="h-px my-1" 
                style={{ backgroundColor: node.color + '44' }} 
              />
              {renderMarkdownFormatted(node.infoBadge.content)}
            </div>
          ) : (
            <p className="text-slate-500 italic text-[11px]">
              К этому узлу не прикреплена карточка. Нажмите кнопку редактирования чтобы добавить заметку с формулами.
            </p>
          )}
        </div>

        {/* 3. Key Phrases */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-sky-400" /> Ключевые фразы ({currentPhrases.length})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateNodeFrequencyAndSize(node.id)}
                className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition"
                title="Пересчитать частоту фраз во всем хранилище"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPhrases(!isEditingPhrases)}
                className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition"
                title="Редактировать ключевые фразы"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {currentPhrases.map((phrase, idx) => (
              <span
                key={idx}
                className="bg-slate-900 border border-slate-700/80 text-slate-300 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1"
              >
                {phrase}
                {isEditingPhrases && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhrase(phrase)}
                    className="hover:text-red-400 text-slate-500 ml-0.5"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          {isEditingPhrases && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Новая фраза..."
                value={newPhraseInput}
                onChange={e => setNewPhraseInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPhrase()}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAddPhrase}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
            </div>
          )}
        </div>

        {/* 4. Connected Neighbors & Manage Edges */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-sky-400" /> Связанные узлы ({neighborNodes.length})
            </span>
            <button
              type="button"
              onClick={() => onOpenAddEdgeModal(node.id)}
              className="px-2 py-0.5 bg-sky-950 hover:bg-sky-900 border border-sky-700 text-sky-300 rounded font-medium text-[11px] flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" /> Добавить связь
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {neighborNodes.map(({ edge, neighbor }) => (
              <div
                key={edge.id}
                className="flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 p-2 rounded-lg border border-slate-800 group transition"
              >
                <button
                  type="button"
                  onClick={() => onSelectNodeById(neighbor.id)}
                  className="flex items-center gap-2 text-left min-w-0 flex-1 hover:text-sky-300"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: neighbor.color }}
                  />
                  <div className="truncate">
                    <span className="font-medium text-slate-200 block truncate">{neighbor.labelEn}</span>
                    {neighbor.labelCn && (
                      <span className="text-[10px] text-slate-500 block truncate">{neighbor.labelCn}</span>
                    )}
                  </div>
                </button>

                {!isAssistant && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Удалить связь с «${neighbor.labelEn}»?`)) {
                        onDeleteEdge(edge.id);
                      }
                    }}
                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 transition"
                    title="Удалить связь"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        {!isAssistant ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenMergeModal(node.id)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
            >
              <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
              <span>Объединить</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Удалить узел «${node.labelEn}» и все прилегающие связи?`)) {
                  onDeleteNode(node.id);
                  onClose();
                }
              }}
              className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow"
        >
          Готово
        </button>
      </div>

      {showLatexHelp && (
        <LatexHelpModal
          onClose={() => setShowLatexHelp(false)}
          onInsertSnippet={snippet => {
            insertSnippet(snippet);
            setShowLatexHelp(false);
          }}
        />
      )}
    </div>
  );
};
