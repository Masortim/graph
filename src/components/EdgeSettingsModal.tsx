import React, { useState, useRef, useMemo } from 'react';
import type { GraphNode, GraphEdge } from '../types/graph';
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
  onDeleteEdge: (edgeId: string) => void;
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
}) => {
  const sourceNode = useMemo(() => nodes.find(n => n.id === edge.source), [nodes, edge.source]);
  const targetNode = useMemo(() => nodes.find(n => n.id === edge.target), [nodes, edge.target]);

  // Determine first node based on weight (first node is the one with greater weight)
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

  // Scale: 100% (1.0) to 300% (3.0), step 25% (0.25), default 100% (1.0)
  const initialScale = edge.badgeScale !== undefined 
    ? edge.badgeScale 
    : (edge.infoBadge?.scale !== undefined ? edge.infoBadge.scale : 1.0);
  const [badgeScale, setBadgeScale] = useState<number>(initialScale);

  // Badge Language: 'cn' by default, or 'en'
  const [badgeLanguage, setBadgeLanguage] = useState<'en' | 'cn'>(edge.badgeLanguage || 'cn');

  // LaTeX Help Modal state
  const [showLatexHelp, setShowLatexHelp] = useState(false);

  // Info badge editing - clean body text only without double-arrow node names
  const cleanInitialContent = useMemo(() => {
    const raw = edge.infoBadge?.content || '';
    // Strip any accidental leading header lines with " ↔ " or "<-> "
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
      weight: thickness,
      lineStyle,
      style: lineStyle,
      color,
      badgeScale,
      badgeLanguage,
    });
  };

  const handleSaveInfoBadge = () => {
    const nowIso = new Date().toISOString();
    onUpdateEdge(edge.id, {
      badgeScale,
      badgeLanguage,
      infoBadge: infoContent.trim()
        ? {
            content: infoContent.trim(),
            createdAt: edge.infoBadge?.createdAt || nowIso,
            updatedAt: nowIso,
            scale: badgeScale,
            language: badgeLanguage,
          }
        : undefined,
    });
    setIsEditingInfo(false);
  };

  const toggleBold = () => {
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

  // Render markdown with LaTeX and colored squares
  const renderMarkdownFormatted = (raw: string) => {
    const rawLines = raw.split(/\r?\n/);
    return rawLines.map((line, lineIdx) => {
      if (!line) {
        return <div key={lineIdx} className="h-3.5" />;
      }
      const segments = tokenizeLine(line);
      return (
        <div key={lineIdx} className="min-h-[1.25em] my-0.5 leading-relaxed flex items-center flex-wrap gap-x-0.5">
          {segments.map((seg, segIdx) => {
            if (seg.type === 'latex') {
              return (
                <span
                  key={segIdx}
                  dangerouslySetInnerHTML={{ __html: renderLatexToHtml(seg.text || '') }}
                  className="inline-block mx-0.5 text-sky-200 align-middle font-serif"
                />
              );
            }
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
                  className="inline-block rounded-none shadow-sm shrink-0 mx-1 align-middle"
                  style={{
                    backgroundColor: seg.squareColor || BADGE_SQUARE_COLORS.yellow,
                    width: '1.25em',
                    height: '1.25em',
                  }}
                />
              );
            }
            return <span key={segIdx}>{seg.text}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div 
      className="absolute right-4 top-16 bottom-6 w-96 max-w-[calc(100vw-2rem)] z-30 flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/70 rounded-xl shadow-2xl overflow-hidden transition-all duration-200"
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Spline className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-200">Настройка связи</span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sourceNode?.color || '#94a3b8' }} />
              <span className="font-medium text-xs text-slate-200 truncate">{sourceNode?.labelEn || 'Узел A'}</span>
              <span className="text-slate-500 text-xs shrink-0">↔</span>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: targetNode?.color || '#94a3b8' }} />
              <span className="font-medium text-xs text-slate-200 truncate">{targetNode?.labelEn || 'Узел B'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form & Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 1. Thickness (1 to 9) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5 text-sky-400" /> Толщина линии:
            </span>
            <span className="font-mono text-sky-300 font-bold text-xs">{thickness}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="9"
            step="1"
            value={thickness}
            onChange={e => {
              const val = Number(e.target.value);
              setThickness(val);
              onUpdateEdge(edge.id, { thickness: val, weight: val });
            }}
            className="w-full accent-sky-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>1 (тонкая)</span>
            <span>5 (средняя)</span>
            <span>9 (жирная)</span>
          </div>
        </div>

        {/* 2. Line Style (Solid vs Dashed) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
          <span className="font-semibold text-slate-300 block text-xs">
            Стиль линии связи:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setLineStyle('solid');
                onUpdateEdge(edge.id, { lineStyle: 'solid', style: 'solid' });
              }}
              className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition flex items-center justify-center gap-2 ${
                lineStyle === 'solid'
                  ? 'bg-sky-600 text-white border-sky-500 shadow'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="w-6 h-0.5 bg-current" />
              <span>Сплошная</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLineStyle('dashed');
                onUpdateEdge(edge.id, { lineStyle: 'dashed', style: 'dashed' });
              }}
              className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition flex items-center justify-center gap-2 ${
                lineStyle === 'dashed'
                  ? 'bg-sky-600 text-white border-sky-500 shadow'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="w-6 h-0.5 border-t-2 border-dashed border-current" />
              <span>Пунктирная</span>
            </button>
          </div>
        </div>

        {/* 3. Line Color */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
          <label className="font-semibold text-slate-300 block text-xs flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-sky-400" /> Цвет линии связи:
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  onUpdateEdge(edge.id, { color: c });
                }}
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
              onChange={e => {
                setColor(e.target.value);
                onUpdateEdge(edge.id, { color: e.target.value });
              }}
              className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
            />
          </div>
        </div>

        {/* 4. Information Badge for Edge with Language Toggles & Scaling Buttons */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sky-400 flex items-center gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5" /> Карточка связи
              </span>

              {/* Plus/Minus Scaling Controls (100% to 300%, step 25%) */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-full px-1.5 py-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={handleZoomBadgeOut}
                  disabled={badgeScale <= 1.0}
                  className="text-slate-400 hover:text-sky-300 disabled:opacity-30 transition p-0.5"
                  title="Уменьшить масштаб карточки (-25%)"
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-semibold text-sky-300 min-w-[38px] text-center select-none">
                  {Math.round(badgeScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomBadgeIn}
                  disabled={badgeScale >= 3.0}
                  className="text-slate-400 hover:text-sky-300 disabled:opacity-30 transition p-0.5"
                  title="Увеличить масштаб карточки (+25%)"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Requirement 3: Edit button with En / Китайский language toggle buttons in brand header style */}
            <div className="flex items-center gap-2">
              {!isEditingInfo ? (
                <button
                  onClick={() => {
                    setInfoContent(cleanInitialContent);
                    setIsEditingInfo(true);
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 underline flex items-center gap-1 font-medium"
                >
                  <Edit3 className="w-3 h-3" /> {edge.infoBadge ? 'Редактировать' : '+ Добавить'}
                </button>
              ) : null}

              {/* Language selection pill buttons (styled like the header pill) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleLanguageToggle('en')}
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold transition ${
                    badgeLanguage === 'en'
                      ? 'bg-sky-600 border border-sky-400 text-white shadow'
                      : 'bg-sky-950/80 border border-sky-800/60 text-sky-300 hover:bg-sky-900'
                  }`}
                  title="Заголовок карточки на английском языке"
                >
                  En
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageToggle('cn')}
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold transition ${
                    badgeLanguage === 'cn'
                      ? 'bg-sky-600 border border-sky-400 text-white shadow'
                      : 'bg-sky-950/80 border border-sky-800/60 text-sky-300 hover:bg-sky-900'
                  }`}
                  title="Заголовок карточки на китайском языке"
                >
                  中文
                </button>
              </div>
            </div>
          </div>

          {isEditingInfo ? (
            <div className="space-y-2">
              {/* Toolbar with Bold, Squares, and LaTeX Guide Button */}
              <div className="flex items-center justify-between bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800 flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleBold}
                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
                    title="Жирный шрифт"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟨')}
                    className="w-3.5 h-3.5 rounded-none bg-[#fbbf24] hover:scale-125 transition-transform shadow-md"
                    title="Вставить жёлтый квадратик"
                  />
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟦')}
                    className="w-3.5 h-3.5 rounded-none bg-[#38bdf8] hover:scale-125 transition-transform shadow-md"
                    title="Вставить голубой квадратик"
                  />
                  <button
                    type="button"
                    onClick={() => insertColoredSquare('🟩')}
                    className="w-3.5 h-3.5 rounded-none bg-[#22c55e] hover:scale-125 transition-transform shadow-md"
                    title="Вставить зелёный квадратик"
                  />
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

              {/* Requirement 3: Field contains only the body description, NO automatic node names */}
              <textarea
                ref={textareaRef}
                value={infoContent}
                onChange={e => setInfoContent(e.target.value)}
                rows={4}
                placeholder="Введите описание связи (поддерживает $LaTeX$, **bold**, 🟨 🟦 🟩)..."
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500 resize-y leading-relaxed font-sans"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingInfo(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveInfoBadge}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1 shadow"
                >
                  <Check className="w-3.5 h-3.5" /> Сохранить
                </button>
              </div>
            </div>
          ) : edge.infoBadge ? (
            /* Requirement 1 & 2: Preview in exact node-badge header format & style */
            <div
              className="p-3 bg-slate-900 text-xs text-slate-300 leading-relaxed border-2"
              style={{ borderColor: edge.color || '#94a3b8' }}
            >
              <div 
                className="font-bold text-sm tracking-wide" 
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
              К этой дуге не прикреплена табличка. В полноэкранном режиме двойной клик по дуге отображает её табличку.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <button
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

        <button
          onClick={() => {
            handleSaveProperties();
            onClose();
          }}
          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow"
        >
          Готово
        </button>
      </div>

      {/* LaTeX Help Modal */}
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
