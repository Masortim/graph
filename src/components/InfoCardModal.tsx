import React, { useState, useRef, useMemo } from 'react';
import type { GraphNode, GraphEdge, AppMode } from '../types/graph';
import { 
  X, 
  Tag, 
  GitMerge, 
  Edit3, 
  Check, 
  Trash2, 
  Layers, 
  Info, 
  ChevronRight, 
  Palette, 
  Link2, 
  RefreshCw, 
  Plus, 
  Bold, 
  Sliders, 
  PlusCircle, 
  MinusCircle, 
  Undo2, 
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { calculateNodeSizeLevel } from '../utils/nodeMetrics';
import { tokenizeLine, BADGE_SQUARE_COLORS } from '../utils/badgeFormatter';
import { renderLatexToHtml } from '../utils/latexRenderer';
import { LatexHelpModal } from './LatexHelpModal';

interface InfoCardModalProps {
  mode?: AppMode;
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
  onUpdateKeyPhrases: (nodeId: string, phrases: string[]) => void;
  onUpdateNodeFrequencyAndSize: (nodeId: string) => void;
  onOpenMergeModal: (nodeId: string) => void;
  onOpenAddEdgeModal: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onSelectNodeById: (nodeId: string) => void;
  onUnmergeNode?: (parentNodeId: string, extractNodeId: string) => void;
}

const COLOR_PALETTE = [
  '#ffffff', // White
  '#94a3b8', // Grey / Slate
  '#38bdf8', // Cyan
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#fbbf24', // Amber / Gold
  '#10b981', // Emerald
  '#f97316', // Orange
  '#f43f5e', // Rose
];

export const InfoCardModal: React.FC<InfoCardModalProps> = ({
  mode = 'author',
  node,
  nodes,
  edges,
  onClose,
  onUpdateInfoBadge,
  onUpdateBadgeScale,
  onUpdateProperties,
  onUpdateKeyPhrases,
  onUpdateNodeFrequencyAndSize,
  onOpenMergeModal,
  onOpenAddEdgeModal,
  onDeleteEdge,
  onDeleteNode,
  onSelectNodeById,
  onUnmergeNode,
}) => {
  const isAssistant = mode === 'assistant';

  // 1. Info Badge Editing State & Ref
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoContent, setInfoContent] = useState(node.infoBadge?.content || '');
  const [showLatexHelp, setShowLatexHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Unmerge Confirmation Dialog State (Requirement 3)
  const [unmergeTarget, setUnmergeTarget] = useState<{ id: string; label: string } | null>(null);

  // Badge Scale: 1.0 (100%) to 3.0 (300%), step 0.25
  const badgeScale = node.badgeScale || node.infoBadge?.scale || 1.0;

  const handleZoomBadgeOut = () => {
    const nextScale = Math.max(1.0, Math.round((badgeScale - 0.25) * 100) / 100);
    onUpdateBadgeScale(node.id, nextScale);
  };

  const handleZoomBadgeIn = () => {
    const nextScale = Math.min(3.0, Math.round((badgeScale + 0.25) * 100) / 100);
    onUpdateBadgeScale(node.id, nextScale);
  };

  // 2. Bilingual Properties & Color & Custom Size
  const [isEditingProps, setIsEditingProps] = useState(false);
  const [labelEn, setLabelEn] = useState(node.labelEn);
  const [labelCn, setLabelCn] = useState(node.labelCn);
  const [color, setColor] = useState(node.color || '#38bdf8');
  const [customSize, setCustomSize] = useState<number | undefined>(node.customSizeLevel);

  // 3. Key Phrases State
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [editingPhraseIndex, setEditingPhraseIndex] = useState<number | null>(null);
  const [editingPhraseText, setEditingPhraseText] = useState('');

  // Find direct connections
  const connectedEdges = useMemo(() => {
    return edges.filter(e => e.source === node.id || e.target === node.id);
  }, [edges, node.id]);

  const connectedNodes = useMemo(() => {
    return connectedEdges.map(e => {
      const otherId = e.source === node.id ? e.target : e.source;
      const otherNode = nodes.find(n => n.id === otherId);
      return {
        edge: e,
        node: otherNode,
      };
    }).filter(item => item.node !== undefined);
  }, [connectedEdges, nodes, node.id]);

  // Calculate current Size level (1..9)
  const currentSizeLevel = useMemo(() => {
    return calculateNodeSizeLevel(node, connectedNodes.length, node.frequency || 0);
  }, [node, connectedNodes.length]);

  // Handle Save Info Badge
  const handleSaveInfo = () => {
    onUpdateInfoBadge(node.id, infoContent);
    setIsEditingInfo(false);
  };

  // Handle Toggle Bold with Ctrl+B / Cmd+B or B-Button
  const toggleBoldFormat = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = infoContent;
    const selected = text.substring(start, end);

    if (start === end) {
      const newText = text.substring(0, start) + '****' + text.substring(end);
      setInfoContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
      return;
    }

    if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
      const unbolded = selected.slice(2, -2);
      const newText = text.substring(0, start) + unbolded + text.substring(end);
      setInfoContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + unbolded.length);
      }, 0);
    } else if (
      start >= 2 &&
      end <= text.length - 2 &&
      text.substring(start - 2, start) === '**' &&
      text.substring(end, end + 2) === '**'
    ) {
      const newText = text.substring(0, start - 2) + selected + text.substring(end + 2);
      setInfoContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start - 2, end - 2);
      }, 0);
    } else {
      const bolded = `**${selected}**`;
      const newText = text.substring(0, start) + bolded + text.substring(end);
      setInfoContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, end + 2);
      }, 0);
    }
  };

  // Insert Colored Square into Info Badge Text
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

  // Insert LaTeX formula snippet
  const insertLatexSnippet = (snippet: string) => {
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

  // Keyboard handler in textarea for Ctrl+B
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleBoldFormat();
    }
  };

  // Save properties
  const handleSaveProperties = () => {
    onUpdateProperties(node.id, labelEn, labelCn, color, customSize);
    setIsEditingProps(false);
  };

  // Keyphrase management
  const currentPhrases = node.keyPhrases || [];

  const handleAddKeyPhrase = () => {
    const trimmed = newPhraseInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!currentPhrases.some(p => p.toLowerCase() === trimmed)) {
      const updated = [...currentPhrases, trimmed];
      onUpdateKeyPhrases(node.id, updated);
    }
    setNewPhraseInput('');
  };

  const handleDeleteKeyPhrase = (indexToRemove: number) => {
    const updated = currentPhrases.filter((_, idx) => idx !== indexToRemove);
    onUpdateKeyPhrases(node.id, updated);
  };

  const handleSaveEditPhrase = (index: number) => {
    const trimmed = editingPhraseText.trim().toLowerCase();
    if (trimmed) {
      const updated = [...currentPhrases];
      updated[index] = trimmed;
      onUpdateKeyPhrases(node.id, updated);
    }
    setEditingPhraseIndex(null);
    setEditingPhraseText('');
  };

  // Render markdown formatted badge preview in modal with LaTeX KaTeX support
  const renderMarkdownFormatted = (raw: string) => {
    const rawLines = raw.split(/\r?\n/);
    return rawLines.map((line, lineIdx) => {
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
                  className="inline-block rounded-[3px] shadow-sm shrink-0 mx-0.5 align-middle"
                  style={{
                    backgroundColor: seg.squareColor || BADGE_SQUARE_COLORS.yellow,
                    width: '1.2em',
                    height: '1.2em',
                  }}
                />
              );
            }
            if (seg.type === 'latex') {
              return (
                <span
                  key={segIdx}
                  className="inline-block px-1 py-0.2 rounded bg-slate-900/90 text-sky-200 font-serif text-[11px] shadow-sm align-middle"
                  dangerouslySetInnerHTML={{ __html: renderLatexToHtml(seg.text || '') }}
                />
              );
            }
            return <span key={segIdx}>{seg.text}</span>;
          })}
        </div>
      );
    });
  };

  const headerTitle = `${node.labelEn}${node.labelCn && node.labelCn !== node.labelEn ? ` | ${node.labelCn}` : ''}`;

  // Merged components list for extraction
  const mergedComponentsList = useMemo(() => {
    if (!node.mergedFrom) return [];
    const list = [
      {
        id: node.mergedFrom.nodeAId,
        label: node.mergedFrom.nodeALabel,
        snapshot: node.mergedFrom.nodeASnapshot,
      },
      {
        id: node.mergedFrom.nodeBId,
        label: node.mergedFrom.nodeBLabel,
        snapshot: node.mergedFrom.nodeBSnapshot,
      },
    ];
    return list;
  }, [node.mergedFrom]);

  return (
    <div className="absolute right-4 top-16 bottom-6 w-96 max-w-[calc(100vw-2rem)] z-30 flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/70 rounded-xl shadow-2xl overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
            {/* Color Circle */}
            <span
              className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-sm border border-white/40"
              style={{ backgroundColor: isEditingProps ? color : node.color }}
            />

            {/* Connections Count */}
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium text-[11px]">
              Connections: <strong className="text-sky-300">{connectedNodes.length}</strong>
            </span>

            {/* Frequency Count */}
            <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/50 text-amber-300 font-medium text-[11px]">
              Frequency: <strong className="text-amber-200">{node.frequency || 0}</strong>
            </span>

            {/* Size Badge / Manual Picker */}
            <div className="flex items-center gap-1 bg-purple-950/70 border border-purple-700/60 rounded px-2 py-0.5 text-[11px] text-purple-300">
              <span>Size:</span>
              <strong className="text-purple-200 font-bold">{currentSizeLevel}</strong>
              {node.customSizeLevel !== undefined && (
                <span className="text-[9px] text-purple-400 font-normal">(ручн.)</span>
              )}
            </div>
          </div>

          {isEditingProps ? (
            <div className="space-y-2.5 mt-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-0.5">English Label:</label>
                <input
                  type="text"
                  value={labelEn}
                  onChange={e => setLabelEn(e.target.value)}
                  className="w-full text-sm bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-0.5">Chinese Label (中文):</label>
                <input
                  type="text"
                  value={labelCn}
                  onChange={e => setLabelCn(e.target.value)}
                  className="w-full text-sm bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Manual Size Override (1 to 9) - Only in author mode */}
              {!isAssistant && (
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-purple-400" /> Размер узла (Size 1–9):
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={customSize !== undefined ? customSize : 'auto'}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomSize(val === 'auto' ? undefined : Number(val));
                      }}
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="auto">Авто (по связям и частоте)</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <option key={num} value={num}>
                          Размер {num} {num === 9 ? '(максимальный)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Node Color Selection with White & Grey */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-sky-400" /> Цвет узла (Node Color):
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full border transition transform ${
                        color === c
                          ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900 scale-110'
                          : 'opacity-70 hover:opacity-100 border-slate-600'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    title="Выбрать свой цвет"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setIsEditingProps(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveProperties}
                  className="px-3 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1 shadow"
                >
                  <Check className="w-3 h-3" /> Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-base font-bold text-slate-100 leading-snug break-words">
                {node.labelEn}
              </h3>
              {node.labelCn && node.labelCn !== node.labelEn && (
                <p className="text-sm font-medium text-slate-400 mt-0.5">
                  {node.labelCn}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isEditingProps && (
            <button
              onClick={() => {
                setLabelEn(node.labelEn);
                setLabelCn(node.labelCn);
                setColor(node.color || '#38bdf8');
                setCustomSize(node.customSizeLevel);
                setIsEditingProps(true);
              }}
              title="Редактировать свойства узла (метки, цвет, размер)"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 1. Information Badge Section with Scale Control (100%..300%, step 25%) */}
        <div className="bg-slate-950/70 border border-blue-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-400 flex items-center gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5" /> Information Badge
              </span>

              {/* Badge Scale Controls (100%..300%, step 25%) */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-full px-1.5 py-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={handleZoomBadgeOut}
                  disabled={badgeScale <= 1.0}
                  className="text-slate-400 hover:text-blue-300 disabled:opacity-30 transition p-0.5"
                  title="Уменьшить масштаб карточки (-25%)"
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-semibold text-blue-300 min-w-[34px] text-center select-none">
                  {Math.round(badgeScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomBadgeIn}
                  disabled={badgeScale >= 3.0}
                  className="text-slate-400 hover:text-blue-300 disabled:opacity-30 transition p-0.5"
                  title="Увеличить масштаб карточки (+25%)"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isEditingInfo && (
              <button
                onClick={() => {
                  setInfoContent(node.infoBadge?.content || '');
                  setIsEditingInfo(true);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> {node.infoBadge ? 'Редактировать' : '+ Добавить заметку'}
              </button>
            )}
          </div>

          {isEditingInfo ? (
            <div className="space-y-2">
              {/* Toolbar with Bold, Squares, LaTeX Snippets, and LaTeX Guide Button */}
              <div className="flex items-center justify-between bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800 flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={toggleBoldFormat}
                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition flex items-center justify-center"
                    title="Жирный шрифт (**выделение**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                  {/* Yellow Square */}
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟨')}
                    className="w-3.5 h-3.5 rounded-sm bg-[#fbbf24] hover:scale-125 transition-transform shadow-md border border-black/30"
                    title="Вставить жёлтый квадратик"
                  />

                  {/* Blue Square */}
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟦')}
                    className="w-3.5 h-3.5 rounded-sm bg-[#38bdf8] hover:scale-125 transition-transform shadow-md border border-black/30"
                    title="Вставить голубой квадратик"
                  />

                  {/* Green Square */}
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟩')}
                    className="w-3.5 h-3.5 rounded-sm bg-[#22c55e] hover:scale-125 transition-transform shadow-md border border-black/30"
                    title="Вставить зелёный квадратик"
                  />

                  <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                  {/* Quick LaTeX Snippets */}
                  <button
                    type="button"
                    onClick={() => insertLatexSnippet('$\\mathbb{R}^n$')}
                    className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 font-mono"
                    title="Вставить $\mathbb{R}^n$"
                  >
                    $\mathbb&#123;R&#125;^n$
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexSnippet('$\\frac{1}{2}$')}
                    className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 font-mono"
                    title="Вставить $\frac{1}{2}$"
                  >
                    $\frac&#123;1&#125;&#123;2&#125;$
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexSnippet('$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$')}
                    className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 font-mono"
                    title="Вставить матрицу 2x2"
                  >
                    $\begin&#123;pmatrix&#125;$
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLatexHelp(true)}
                  className="px-2 py-0.5 bg-sky-950 hover:bg-sky-900 border border-sky-700/60 rounded text-[10px] text-sky-300 font-medium flex items-center gap-1 transition shadow-sm"
                  title="Открыть справочник формул KaTeX"
                >
                  <BookOpen className="w-3 h-3 text-sky-400" />
                  <span>Справка $LaTeX$</span>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={infoContent}
                onChange={e => setInfoContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                rows={5}
                placeholder="Введите текст информационной карточки (поддерживает $LaTeX$, **жирный**, 🟨 🟦 🟩)..."
                className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 resize-y font-sans leading-relaxed"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingInfo(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveInfo}
                  className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center gap-1 shadow"
                >
                  <Check className="w-3.5 h-3.5" /> Сохранить
                </button>
              </div>
            </div>
          ) : node.infoBadge ? (
            <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-800/30 text-xs space-y-1">
              <div
                className="font-bold text-sm leading-tight border-b border-blue-900/40 pb-1.5 mb-1.5"
                style={{ color: node.color }}
              >
                {headerTitle}
              </div>
              <div className="text-slate-300 leading-relaxed">
                {renderMarkdownFormatted(node.infoBadge.content)}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">Информационная табличка не прикреплена. Нажмите «+ Добавить заметку».</p>
          )}
        </div>

        {/* 2. Connected Nodes List */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Connected Nodes ({connectedNodes.length})
            </span>
            <button
              onClick={() => onOpenAddEdgeModal(node.id)}
              className="text-xs text-sky-400 hover:text-sky-300 underline flex items-center gap-1 font-medium"
            >
              <Link2 className="w-3 h-3" /> + {isAssistant ? 'Создать узел и связать' : 'Добавить связь'}
            </button>
          </div>

          {connectedNodes.length === 0 ? (
            <p className="text-slate-500 italic text-[11px]">Нет связей</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {connectedNodes.map(({ edge, node: targetNode }) => {
                if (!targetNode) return null;
                return (
                  <div
                    key={edge.id}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/80 transition border border-transparent hover:border-slate-700 group"
                  >
                    <div 
                      onClick={() => onSelectNodeById(targetNode.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: targetNode.color }}
                      />
                      <div className="truncate">
                        <div className="text-slate-200 font-medium truncate group-hover:text-sky-300">
                          {targetNode.labelEn}
                        </div>
                        {targetNode.labelCn && targetNode.labelCn !== targetNode.labelEn && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {targetNode.labelCn}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-slate-400 ml-2">
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono">
                        w:{edge.weight}
                      </span>
                      {!isAssistant && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Удалить связь с узлом «${targetNode.labelEn}»?`)) {
                              onDeleteEdge(edge.id);
                            }
                          }}
                          title="Удалить эту связь"
                          className="p-1 hover:text-red-300 hover:bg-red-950/60 rounded transition text-slate-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight 
                        onClick={() => onSelectNodeById(targetNode.id)}
                        className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition cursor-pointer" 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Key Phrases Section */}
        <div className="bg-slate-950/70 border border-amber-900/40 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5 text-xs">
              <Tag className="w-3.5 h-3.5" /> Key Phrases ({currentPhrases.length})
            </span>
            <button
              onClick={() => onUpdateNodeFrequencyAndSize(node.id)}
              className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-300 rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm transition"
              title="Пересчитать частоту вхождений (Frequency) и обновить размер узла (Size)"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>Update (Частота)</span>
            </button>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Новая ключевая фраза..."
              value={newPhraseInput}
              onChange={e => setNewPhraseInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyPhrase();
                }
              }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddKeyPhrase}
              disabled={!newPhraseInput.trim()}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3 stroke-[3]" /> Добавить
            </button>
          </div>

          {currentPhrases.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentPhrases.map((phrase, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-700/50 text-amber-200 text-[11px]"
                >
                  {editingPhraseIndex === idx ? (
                    <input
                      type="text"
                      value={editingPhraseText}
                      onChange={e => setEditingPhraseText(e.target.value)}
                      onBlur={() => handleSaveEditPhrase(idx)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEditPhrase(idx);
                        if (e.key === 'Escape') setEditingPhraseIndex(null);
                      }}
                      autoFocus
                      className="bg-slate-900 text-amber-100 border border-amber-500 rounded px-1 py-0 text-[11px] w-24 outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => {
                        setEditingPhraseIndex(idx);
                        setEditingPhraseText(phrase);
                      }}
                      title="Кликните для редактирования"
                      className="cursor-pointer hover:underline"
                    >
                      {phrase}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteKeyPhrase(idx)}
                    className="hover:text-red-300 ml-0.5"
                    title="Удалить фразу"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic text-[11px]">
              Ключевые фразы не добавлены. Введите фразу выше для подсчёта частоты и влияния на размер.
            </p>
          )}

          <div className="pt-1 text-[11px] text-slate-400 flex justify-between border-t border-slate-800/80">
            <span>Вхождений в хранилище: <strong className="text-amber-300">{node.frequency || 0}</strong></span>
            <span>Текущий Size: <strong className="text-purple-300">{currentSizeLevel}</strong></span>
          </div>
        </div>

        {/* 4. Merged Entity & Unmerge Actions */}
        {node.mergedFrom && (
          <div className="bg-pink-950/40 border border-pink-800/40 rounded-lg p-3 space-y-2">
            <span className="font-semibold text-pink-400 flex items-center gap-1.5 text-xs">
              <GitMerge className="w-3.5 h-3.5" /> Слитый узел (Merged Entity)
            </span>
            <div className="text-slate-300 text-[11px] space-y-1.5">
              <p className="text-slate-400">Исходные компоненты объединения:</p>
              
              {mergedComponentsList.map((comp) => (
                <div
                  key={comp.id}
                  className="p-2 bg-slate-900/80 border border-pink-900/50 rounded-lg flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-pink-200 font-medium truncate block">{comp.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {comp.id}</span>
                  </div>

                  {!isAssistant && (
                    <button
                      type="button"
                      onClick={() => setUnmergeTarget({ id: comp.id, label: comp.label })}
                      className="p-1.5 bg-pink-950 hover:bg-pink-900 border border-pink-700/60 rounded-md text-pink-300 hover:text-white transition flex items-center gap-1 text-[10px] font-semibold shadow-sm"
                      title={`Извлечь узел «${comp.label}» из объединения`}
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>Извлечь</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
        <button
          onClick={() => onOpenAddEdgeModal(node.id)}
          className="py-1.5 px-3 bg-sky-700 hover:bg-sky-600 text-white rounded font-medium text-xs flex items-center justify-center gap-1 shadow transition"
          title="Создать узел и привязать к текущему"
        >
          <Link2 className="w-3.5 h-3.5" /> {isAssistant ? 'Создать узел и связать' : 'Связать'}
        </button>

        {!isAssistant && (
          <button
            onClick={() => onOpenMergeModal(node.id)}
            className="flex-1 py-1.5 px-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded font-medium text-xs flex items-center justify-center gap-1 shadow transition"
          >
            <GitMerge className="w-3.5 h-3.5" /> Слить узел...
          </button>
        )}

        {!isAssistant && (
          <button
            onClick={() => onDeleteNode(node.id)}
            title="Удалить узел с графа"
            className="p-1.5 text-red-400 hover:text-red-200 hover:bg-red-950/60 border border-red-900/40 rounded transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Unmerge Confirmation Modal Dialog */}
      {unmergeTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-xs">
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-pink-400" />
                <h4 className="font-bold text-sm text-slate-100">Извлечь узел?</h4>
              </div>
              <button
                onClick={() => setUnmergeTarget(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2.5 text-slate-300">
              <p className="text-xs leading-relaxed">
                Вы действительно хотите извлечь узел <strong className="text-pink-300">«{unmergeTarget.label}»</strong> из объединённого узла <strong className="text-sky-300">«{node.labelEn}»</strong>?
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Исходные связи компонента будут восстановлены, а новые связи, созданные после слияния, останутся у основного узла.
              </p>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end gap-2">
              <button
                onClick={() => setUnmergeTarget(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
              >
                Нет
              </button>
              <button
                onClick={() => {
                  onUnmergeNode?.(node.id, unmergeTarget.id);
                  setUnmergeTarget(null);
                }}
                className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold shadow transition"
              >
                Да, извлечь
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LaTeX Help Modal */}
      {showLatexHelp && (
        <LatexHelpModal
          onClose={() => setShowLatexHelp(false)}
          onInsertSnippet={snippet => {
            insertLatexSnippet(snippet);
            setShowLatexHelp(false);
          }}
        />
      )}
    </div>
  );
};
