import React, { useState, useRef, useMemo } from 'react';
import type { GraphNode, GraphEdge, AppMode } from '../types/graph';
import { 
  X, 
  Trash2, 
  Info, 
  Palette, 
  Sliders, 
  Bold, 
  Check, 
  Edit3, 
  Spline,
  PlusCircle,
  MinusCircle,
  BookOpen
} from 'lucide-react';
import { renderLatexToHtml } from '../utils/latexRenderer';
import { tokenizeLine, BADGE_SQUARE_COLORS } from '../utils/badgeFormatter';
import { LatexHelpModal } from './LatexHelpModal';

interface EdgeSettingsModalProps {
  edge: GraphEdge;
  nodes: GraphNode[];
  onClose: () => void;
  onUpdateEdge: (edgeId: string, updates: Partial<GraphEdge>) => void;
  onDeleteEdge?: (edgeId: string) => void;
  mode?: AppMode;
}

const COLOR_PALETTE = [
  '#94a3b8', // Grey / Slate
  '#ffffff', // White
  '#38bdf8', // Cyan
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#fbbf24', // Amber / Gold
  '#10b981', // Emerald
  '#f97316', // Orange
  '#f43f5e', // Rose
];

export const EdgeSettingsModal: React.FC<EdgeSettingsModalProps> = ({
  edge,
  nodes,
  onClose,
  onUpdateEdge,
  onDeleteEdge,
  mode = 'author',
}) => {
  const isAssistant = mode === 'assistant';
  const sourceNode = useMemo(() => nodes.find(n => n.id === edge.source), [nodes, edge.source]);
  const targetNode = useMemo(() => nodes.find(n => n.id === edge.target), [nodes, edge.target]);

  const firstNode = useMemo(() => {
    if (!sourceNode) return targetNode;
    if (!targetNode) return sourceNode;
    return (sourceNode.weight || 0) >= (targetNode.weight || 0) ? sourceNode : targetNode;
  }, [sourceNode, targetNode]);

  const secondNode = useMemo(() => {
    return firstNode === sourceNode ? targetNode : sourceNode;
  }, [firstNode, sourceNode, targetNode]);

  const [thickness, setThickness] = useState<number>(edge.thickness || Math.min(9, Math.max(1, edge.weight || 2)));
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>((edge.style || edge.lineStyle) === 'dashed' ? 'dashed' : 'solid');
  const [color, setColor] = useState<string>(edge.color || '#94a3b8');

  const initialScale = edge.badgeScale !== undefined 
    ? edge.badgeScale 
    : (edge.infoBadge?.scale !== undefined ? edge.infoBadge.scale : 1.0);
  const [badgeScale, setBadgeScale] = useState<number>(initialScale);

  const [badgeLanguage, setBadgeLanguage] = useState<'en' | 'cn'>(edge.badgeLanguage || 'cn');
  const [showLatexHelp, setShowLatexHelp] = useState(false);

  const cleanInitialContent = useMemo(() => {
    const raw = edge.infoBadge?.content || '';
    const lines = raw.split(/\r?\n/);
    if (lines.length > 0 && lines[0].includes('↔') && !lines[0].startsWith('🟨') && !lines[0].startsWith('🟦') && !lines[0].startsWith('🟩')) {
      return lines.slice(1).join('\n').trim();
    }
    return raw;
  }, [edge.infoBadge?.content]);

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoContent, setInfoContent] = useState(cleanInitialContent);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleLanguageToggle = (lang: 'en' | 'cn') => {
    setBadgeLanguage(lang);
    onUpdateEdge(edge.id, {
      badgeLanguage: lang,
    });
  };

  const headerTitle = useMemo(() => {
    if (badgeLanguage === 'en') {
      const l1 = firstNode?.labelEn || 'Node 1';
      const l2 = secondNode?.labelEn || 'Node 2';
      return `${l1} ↔ ${l2}`;
    }
    const l1 = firstNode?.labelCn || firstNode?.labelEn || 'Node 1';
    const l2 = secondNode?.labelCn || secondNode?.labelEn || 'Node 2';
    return `${l1} ↔ ${l2}`;
  }, [badgeLanguage, firstNode, secondNode]);

  const handleZoomBadgeOut = () => {
    const nextScale = Math.max(1.0, Math.round((badgeScale - 0.25) * 100) / 100);
    setBadgeScale(nextScale);
    onUpdateEdge(edge.id, {
      badgeScale: nextScale,
      infoBadge: edge.infoBadge ? { ...edge.infoBadge, scale: nextScale } : undefined,
    });
  };

  const handleZoomBadgeIn = () => {
    const nextScale = Math.min(3.0, Math.round((badgeScale + 0.25) * 100) / 100);
    setBadgeScale(nextScale);
    onUpdateEdge(edge.id, {
      badgeScale: nextScale,
      infoBadge: edge.infoBadge ? { ...edge.infoBadge, scale: nextScale } : undefined,
    });
  };

  const handleSaveProperties = () => {
    onUpdateEdge(edge.id, {
      thickness,
      style: lineStyle,
      lineStyle,
      color,
      badgeScale,
      badgeLanguage,
      isAssistantProposal: isAssistant ? true : edge.isAssistantProposal,
    });
  };

  const handleSaveInfo = () => {
    const nowIso = new Date().toISOString();
    onUpdateEdge(edge.id, {
      infoBadge: {
        title: headerTitle,
        content: infoContent,
        createdAt: edge.infoBadge?.createdAt || nowIso,
        updatedAt: nowIso,
        scale: badgeScale,
        language: badgeLanguage,
      },
      badgeScale,
      badgeLanguage,
      isAssistantProposal: isAssistant ? true : edge.isAssistantProposal,
    });
    setIsEditingInfo(false);
  };

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

  const renderMarkdownFormatted = (raw: string) => {
    const rawLines = raw.split(/\r?\n/);
    const contentLines = (rawLines.length > 0 && rawLines[0].includes('↔') && !rawLines[0].startsWith('🟨') && !rawLines[0].startsWith('🟦') && !rawLines[0].startsWith('🟩'))
      ? rawLines.slice(1)
      : rawLines;

    return contentLines.map((line, lineIdx) => {
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
              return (
                <span
                  key={segIdx}
                  className="inline-block px-1 py-0.2 rounded bg-slate-900/90 text-sky-200 font-serif text-[11px] shadow-sm align-middle"
                  dangerouslySetInnerHTML={{ __html: renderLatexToHtml(seg.text || '') }}
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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Spline className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isAssistant ? 'Edge Settings & Card' : 'Настройки связи'}
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[340px]">
                {headerTitle}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Visual Style & Thickness & Color */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              {isAssistant ? 'Line Style & Thickness' : 'Стиль линии и толщина'}
            </span>

            {/* Line Style (Solid vs Dashed) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLineStyle('solid')}
                className={`flex-1 py-1.5 rounded-lg font-medium border text-xs transition flex items-center justify-center gap-1.5 ${
                  lineStyle === 'solid'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>——</span>
                <span>{isAssistant ? 'Solid' : 'Сплошная'}</span>
              </button>
              <button
                type="button"
                onClick={() => setLineStyle('dashed')}
                className={`flex-1 py-1.5 rounded-lg font-medium border text-xs transition flex items-center justify-center gap-1.5 ${
                  lineStyle === 'dashed'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>- - -</span>
                <span>{isAssistant ? 'Dashed' : 'Пунктирная'}</span>
              </button>
            </div>

            {/* Thickness Slider (1 to 9) */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                <span>{isAssistant ? 'Thickness (1–9):' : 'Толщина (1–9):'}</span>
                <span className="font-mono text-sky-400">{thickness}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="9"
                step="1"
                value={thickness}
                onChange={e => setThickness(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3 text-sky-400" /> {isAssistant ? 'Edge Color:' : 'Цвет связи:'}
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
                />
              </div>
            </div>
          </div>

          {/* Information Card & Language Toggle */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                {isAssistant ? 'Information Card' : 'Информационная табличка связи'}
              </span>

              <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleLanguageToggle('cn')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      badgeLanguage === 'cn'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    CN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageToggle('en')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      badgeLanguage === 'en'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    EN
                  </button>
                </div>

                {/* Scale Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-full px-1.5 py-0.5 shadow-inner">
                  <button
                    type="button"
                    onClick={handleZoomBadgeOut}
                    disabled={badgeScale <= 1.0}
                    className="text-slate-400 hover:text-sky-300 disabled:opacity-30 transition p-0.5"
                    title={isAssistant ? "Zoom Out (-25%)" : "Уменьшить (-25%)"}
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
                    title={isAssistant ? "Zoom In (+25%)" : "Увеличить (+25%)"}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!isEditingInfo && (
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition"
                    title={isAssistant ? "Edit Card" : "Редактировать карточку"}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {isEditingInfo ? (
              <div className="space-y-2">
                {/* Editing Toolbar */}
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
                      title="Yellow Square (🟨)"
                    />
                    <button
                      type="button"
                      onClick={() => insertColoredSquare('🟦')}
                      className="w-4 h-4 rounded bg-blue-500 hover:opacity-80"
                      title="Blue Square (🟦)"
                    />
                    <button
                      type="button"
                      onClick={() => insertColoredSquare('🟩')}
                      className="w-4 h-4 rounded bg-emerald-500 hover:opacity-80"
                      title="Green Square (🟩)"
                    />
                    <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => insertSnippet('$\\mathbb{R}^n$')}
                      className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 font-mono"
                    >
                      $\mathbb&#123;R&#125;^n$
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('$\\frac{1}{2}$')}
                      className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 font-mono"
                    >
                      $\frac&#123;1&#125;&#123;2&#125;$
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLatexHelp(true)}
                    className="px-2 py-0.5 bg-sky-950 hover:bg-sky-900 border border-sky-700/60 rounded text-[10px] text-sky-300 font-medium flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3 text-sky-400" />
                    <span>$LaTeX$</span>
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={infoContent}
                  onChange={e => setInfoContent(e.target.value)}
                  rows={4}
                  placeholder={isAssistant ? "Enter note content ($LaTeX$, **bold**, 🟨 🟦 🟩)..." : "Введите текст карточки ($LaTeX$, **жирный**, 🟨 🟦 🟩)..."}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 resize-y font-sans leading-relaxed"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
                  >
                    {isAssistant ? 'Cancel' : 'Отмена'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInfo}
                    className="px-3.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" /> {isAssistant ? 'Save' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : edge.infoBadge?.content ? (
              <div 
                className="bg-slate-900/90 p-3 border text-xs space-y-1 shadow-sm"
                style={{ borderColor: (edge.color || '#94a3b8') + '88' }}
              >
                <div 
                  className="font-bold text-sm leading-tight"
                  style={{ color: edge.color || '#94a3b8' }}
                >
                  {headerTitle}
                </div>
                <div 
                  className="h-px my-1.5" 
                  style={{ backgroundColor: (edge.color || '#94a3b8') + '44' }} 
                />
                {renderMarkdownFormatted(edge.infoBadge.content)}
              </div>
            ) : (
              <p className="text-slate-500 italic text-[11px]">
                {isAssistant ? 'No card attached to this edge. Click "Edit Card" to add notes.' : 'К этой дуге не прикреплена табличка. Нажмите «Редактировать» чтобы добавить заметку.'}
              </p>
            )}
          </div>
        </div>

        {/* Footer: Delete button is hidden in assistant mode (Requirement 2.4) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          {!isAssistant && onDeleteEdge ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Удалить связь между «${sourceNode?.labelEn}» и «${targetNode?.labelEn}»?`)) {
                  onDeleteEdge(edge.id);
                  onClose();
                }
              }}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить связь</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => {
              handleSaveProperties();
              onClose();
            }}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow"
          >
            {isAssistant ? 'Done' : 'Готово'}
          </button>
        </div>
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
