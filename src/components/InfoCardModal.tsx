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
   
  Palette, 
  Link2, 
  RefreshCw, 
  Plus, 
  Bold, 
  Sliders, 
  PlusCircle, 
  MinusCircle, 
  Undo2, 
  BookOpen,
  Lock
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
  const isOriginalNode = !node.isAssistantProposal;
  const isTitleReadOnly = isAssistant && isOriginalNode;

  // 1. Info Badge Editing State & Ref
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoContent, setInfoContent] = useState(node.infoBadge?.content || '');
  const [showLatexHelp, setShowLatexHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Unmerge Confirmation Dialog State
  

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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleBoldFormat();
    }
  };

  const handleSaveProperties = () => {
    onUpdateProperties(
      node.id, 
      isTitleReadOnly ? node.labelEn : labelEn, 
      isTitleReadOnly ? node.labelCn : labelCn, 
      color, 
      customSize
    );
    setIsEditingProps(false);
  };

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

  const headerTitle = `${node.labelEn}${node.labelCn && node.labelCn !== node.labelEn ? ` | ${node.labelCn}` : ''}`;

  return (
    <div className="absolute right-4 top-16 bottom-6 w-96 max-w-[calc(100vw-2rem)] z-30 flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/70 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: node.color || '#38bdf8' }}
            />
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {node.type}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/60 text-purple-300 font-mono font-medium">
              Size {currentSizeLevel}
            </span>
            {node.isAssistantProposal && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-medium">
                {isAssistant ? 'Proposed Node' : 'Новый узел помощника'}
              </span>
            )}
          </div>

          {isEditingProps ? (
            <div className="space-y-2 mt-2">
              {/* English Label */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center justify-between">
                  <span>English Label:</span>
                  {isTitleReadOnly && (
                    <span className="text-amber-400 flex items-center gap-0.5 text-[9px]">
                      <Lock className="w-2.5 h-2.5" /> Read-only
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={labelEn}
                  disabled={isTitleReadOnly}
                  onChange={e => setLabelEn(e.target.value)}
                  className="w-full text-sm bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Chinese Label */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center justify-between">
                  <span>Chinese Label (中文):</span>
                  {isTitleReadOnly && (
                    <span className="text-amber-400 flex items-center gap-0.5 text-[9px]">
                      <Lock className="w-2.5 h-2.5" /> Read-only
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={labelCn}
                  disabled={isTitleReadOnly}
                  onChange={e => setLabelCn(e.target.value)}
                  className="w-full text-sm bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Manual Size Override (1 to 9) */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-purple-400" /> {isAssistant ? 'Node Size (1–9):' : 'Размер узла (Size 1–9):'}
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
                    <option value="auto">{isAssistant ? 'Auto (by weight & links)' : 'Авто (по связям и частоте)'}</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <option key={num} value={num}>
                        {isAssistant ? `Size ${num} ${num === 9 ? '(max)' : ''}` : `Размер ${num} ${num === 9 ? '(максимальный)' : ''}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Node Color Selection */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-sky-400" /> {isAssistant ? 'Node Color:' : 'Цвет узла:'}
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
                    title={isAssistant ? "Choose custom color" : "Выбрать свой цвет"}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setIsEditingProps(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  {isAssistant ? 'Cancel' : 'Отмена'}
                </button>
                <button
                  onClick={handleSaveProperties}
                  className="px-3 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1 shadow"
                >
                  <Check className="w-3 h-3" /> {isAssistant ? 'Save' : 'Сохранить'}
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
              title={isAssistant ? "Edit node styling and properties" : "Редактировать свойства узла (метки, цвет, размер)"}
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
        {/* 1. Information Badge Section */}
        <div className="bg-slate-950/70 border border-blue-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-400 flex items-center gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5" /> {isAssistant ? 'Information Card' : 'Информационная карточка'}
              </span>

              {/* Badge Scale Controls */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-full px-1.5 py-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={handleZoomBadgeOut}
                  disabled={badgeScale <= 1.0}
                  className="text-slate-400 hover:text-blue-300 disabled:opacity-30 transition p-0.5"
                  title={isAssistant ? "Zoom Out (-25%)" : "Уменьшить масштаб (-25%)"}
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-blue-300 font-bold px-1 select-none">
                  {Math.round(badgeScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomBadgeIn}
                  disabled={badgeScale >= 3.0}
                  className="text-slate-400 hover:text-blue-300 disabled:opacity-30 transition p-0.5"
                  title={isAssistant ? "Zoom In (+25%)" : "Увеличить масштаб (+25%)"}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isEditingInfo && (
              <button
                onClick={() => setIsEditingInfo(true)}
                className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1 font-medium"
              >
                <Edit3 className="w-3 h-3" /> {node.infoBadge ? (isAssistant ? 'Edit' : 'Редактировать') : (isAssistant ? '+ Add Note' : '+ Добавить заметку')}
              </button>
            )}
          </div>

          {isEditingInfo ? (
            <div className="space-y-2">
              {/* LaTeX & Formatting Toolbar */}
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
                    className="w-4 h-4 rounded bg-amber-400 hover:opacity-80"
                    title="Yellow (🟨)"
                  />
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟦')}
                    className="w-4 h-4 rounded bg-blue-500 hover:opacity-80"
                    title="Blue (🟦)"
                  />
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟩')}
                    className="w-4 h-4 rounded bg-emerald-500 hover:opacity-80"
                    title="Green (🟩)"
                  />


                </div>

                <button
                  type="button"
                  onClick={() => setShowLatexHelp(true)}
                  className="px-2 py-0.5 bg-sky-950 hover:bg-sky-900 border border-sky-700/60 rounded text-[10px] text-sky-300 font-medium flex items-center gap-1 transition shadow-sm"
                >
                  <BookOpen className="w-3 h-3 text-sky-400" />
                  <span>$LaTeX$</span>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={infoContent}
                onChange={e => setInfoContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                rows={5}
                placeholder={isAssistant ? "Enter note content ($LaTeX$, **bold**, 🟨 🟦 🟩)..." : "Введите текст информационной карточки (поддерживает $LaTeX$, **жирный**, 🟨 🟦 🟩)..."}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 resize-y font-sans leading-relaxed"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingInfo(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
                >
                  {isAssistant ? 'Cancel' : 'Отмена'}
                </button>
                <button
                  onClick={handleSaveInfo}
                  className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center gap-1 shadow"
                >
                  <Check className="w-3.5 h-3.5" /> {isAssistant ? 'Save' : 'Сохранить'}
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
            <p className="text-slate-500 italic">
              {isAssistant ? 'No card attached to this node. Click "+ Add Note".' : 'Информационная табличка не прикреплена. Нажмите «+ Добавить заметку».'}
            </p>
          )}
        </div>

        {/* 2. Connected Nodes List (Requirement 2.1) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> {isAssistant ? `Connected Nodes (${connectedNodes.length})` : `Связанные узлы (${connectedNodes.length})`}
            </span>
            
            {/* Assistant cannot add node to already assistant-added node (Requirement 2.1) */}
            {isAssistant && node.isAssistantProposal ? (
              <span className="text-[10px] text-amber-400/80 italic">
                (Add nodes only to base nodes)
              </span>
            ) : (
              <button
                onClick={() => onOpenAddEdgeModal(node.id)}
                className="text-xs text-sky-400 hover:text-sky-300 underline flex items-center gap-1 font-medium"
              >
                <Link2 className="w-3 h-3" /> + {isAssistant ? 'Add node & connect' : 'Добавить связь'}
              </button>
            )}
          </div>

          {connectedNodes.length === 0 ? (
            <p className="text-slate-500 italic text-[11px]">{isAssistant ? 'No connections' : 'Нет связей'}</p>
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

                    {!isAssistant && (
                      <button
                        onClick={() => onDeleteEdge(edge.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition"
                        title="Удалить связь"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Key Phrases Section */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
              <Tag className="w-3.5 h-3.5 text-amber-400" /> {isAssistant ? `Key Phrases (${currentPhrases.length})` : `Ключевые фразы (${currentPhrases.length})`}
            </span>
            {!isAssistant && (
              <button
                onClick={() => onUpdateNodeFrequencyAndSize(node.id)}
                className="text-xs text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
                title="Пересчитать частоту фраз"
              >
                <RefreshCw className="w-3 h-3" /> Пересчитать
              </button>
            )}
          </div>

          <div className="flex gap-1.5 mb-2">
            <input
              type="text"
              placeholder={isAssistant ? "Add keyword/phrase..." : "Добавить фразу..."}
              value={newPhraseInput}
              onChange={e => setNewPhraseInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyPhrase();
                }
              }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleAddKeyPhrase}
              disabled={!newPhraseInput.trim()}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {currentPhrases.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pt-1">
              {currentPhrases.map((phrase, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800/60 text-amber-300 text-[11px]"
                >
                  {editingPhraseIndex === idx ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingPhraseText}
                      onChange={e => setEditingPhraseText(e.target.value)}
                      onBlur={() => handleSaveEditPhrase(idx)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEditPhrase(idx);
                        if (e.key === 'Escape') setEditingPhraseIndex(null);
                      }}
                      className="bg-slate-900 border border-amber-500 rounded px-1 text-[11px] text-amber-200 outline-none w-24"
                    />
                  ) : (
                    <span
                      onClick={() => {
                        setEditingPhraseIndex(idx);
                        setEditingPhraseText(phrase);
                      }}
                      className="cursor-pointer hover:underline"
                    >
                      {phrase}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteKeyPhrase(idx)}
                    className="hover:text-red-300 ml-0.5 text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Merge / Unmerge Actions - Only for Author */}
        {!isAssistant && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            {node.type === 'merged' && node.mergedFrom && onUnmergeNode ? (
              <button
                onClick={() => {
                  if (window.confirm(`Разделить узел «${node.labelEn}» на исходные концепты?`)) {
                    onUnmergeNode(node.id, node.mergedFrom!.nodeAId);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Undo2 className="w-3.5 h-3.5" /> Разделить узел
              </button>
            ) : (
              <button
                onClick={() => onOpenMergeModal(node.id)}
                className="px-3 py-1.5 bg-pink-950/70 hover:bg-pink-900 text-pink-300 border border-pink-800/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <GitMerge className="w-3.5 h-3.5" /> Слить узел
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm(`Удалить узел «${node.labelEn}» и все его связи?`)) {
                  onDeleteNode(node.id);
                  onClose();
                }
              }}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Удалить узел
            </button>
          </div>
        )}
      </div>

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
