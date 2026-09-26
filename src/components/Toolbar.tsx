import React, { useRef, useState, useEffect } from 'react';
import { 
  Maximize, 
  Minimize, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Play, 
  Pause, 
  FolderOpen, 
  RefreshCw, 
  Download, 
  Upload, 
  Spline, 
  CircleDot, 
  Type, 
  HelpCircle, 
  ChevronDown, 
  Languages, 
  FileImage,
  Search,
  X,
  BookOpen,
  ClipboardList,
  Save,
  UserCheck
} from 'lucide-react';
import type { ObsidianFileRaw, GraphSettings, AppMode } from '../types/graph';
import { LatexHelpModal } from './LatexHelpModal';

interface ToolbarProps {
  mode: AppMode;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitGraph: () => void;
  onResetView: () => void;
  onExportSvg: () => void;
  zoomLevel: number;
  settings: GraphSettings;
  onUpdateSettings: (newSettings: Partial<GraphSettings>) => void;
  onUpdateVault: () => void;
  onLoadObsidianFiles: (files: ObsidianFileRaw[], vaultName: string) => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
  onOpenLabelsModal: () => void;
  nodesCount: number;
  edgesCount: number;
  vaultName?: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  pinnedBadgesCount?: number;
  
  // Fullscreen & Student Search
  fullscreenSearchQuery?: string;
  onFullscreenSearchChange?: (q: string) => void;
  fullscreenMatchedNodesCount?: number;
  fullscreenMatchedEdgesCount?: number;

  // Assistant & Author Proposal Props
  onOpenSaveProposalModal?: () => void;
  onImportAssistantProposal?: (file: File) => void;
  hasActiveProposalLog?: boolean;
  onToggleProposalReviewModal?: () => void;
  isProposalReviewModalOpen?: boolean;
  unprocessedProposalCount?: number;
}

const EDGE_COLOR_PRESETS = [
  { label: 'Slate Grey', color: '#94a3b8' },
  { label: 'Cool Dark Grey', color: '#64748b' },
  { label: 'Light Silver', color: '#cbd5e1' },
  { label: 'Neon Cyan', color: '#38bdf8' },
  { label: 'Amber Gold', color: '#fbbf24' },
  { label: 'Electric Purple', color: '#c084fc' },
  { label: 'White Glow', color: '#f8fafc' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  mode = 'author',
  onZoomIn,
  onZoomOut,
  onFitGraph,
  onResetView,
  onExportSvg,
  zoomLevel,
  settings,
  onUpdateSettings,
  onUpdateVault,
  onLoadObsidianFiles,
  onExportProject,
  onImportProject,
  onOpenLabelsModal,
  nodesCount,
  edgesCount,
  vaultName,
  isFullscreen,
  onToggleFullscreen,
  pinnedBadgesCount = 0,
  fullscreenSearchQuery = '',
  onFullscreenSearchChange,
  fullscreenMatchedNodesCount = 0,
  fullscreenMatchedEdgesCount = 0,
  onOpenSaveProposalModal,
  onImportAssistantProposal,
  hasActiveProposalLog = false,
  onToggleProposalReviewModal,
  isProposalReviewModalOpen = false,
  unprocessedProposalCount = 0,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showLatexHelp, setShowLatexHelp] = useState(false);
  const [showEdgeMenu, setShowEdgeMenu] = useState(false);
  const [showNodeMenu, setShowNodeMenu] = useState(false);

  const edgeMenuRef = useRef<HTMLDivElement | null>(null);
  const nodeMenuRef = useRef<HTMLDivElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const updateInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const proposalInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (edgeMenuRef.current && !edgeMenuRef.current.contains(e.target as Node)) {
        setShowEdgeMenu(false);
      }
      if (nodeMenuRef.current && !nodeMenuRef.current.contains(e.target as Node)) {
        setShowNodeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const rawFiles: ObsidianFileRaw[] = [];
    let detectedVaultName = 'Linear Algebra NSU';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        const text = await file.text();
        const relPath = file.webkitRelativePath || file.name;
        const parts = relPath.split('/').filter(p => p.length > 0);
        
        let chapter = 'General Notes';
        if (parts.length >= 2) {
          detectedVaultName = parts[0];
          chapter = parts.length >= 3 ? parts[parts.length - 2] : parts[0];
        }

        rawFiles.push({
          path: relPath,
          chapter: chapter,
          fileName: file.name.replace(/\.(md|markdown)$/i, ''),
          content: text,
        });
      }
    }

    if (rawFiles.length > 0) {
      onLoadObsidianFiles(rawFiles, detectedVaultName);
    }
    
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (updateInputRef.current) updateInputRef.current.value = '';
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
    }
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const handleProposalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportAssistantProposal) {
      onImportAssistantProposal(file);
    }
    if (proposalInputRef.current) proposalInputRef.current.value = '';
  };

  // 1. STUDENT MODE or FULLSCREEN MODE (Minimalist Clean Header)
  if (mode === 'student' || isFullscreen) {
    const hasSearch = fullscreenSearchQuery.trim().length > 0;
    const isStudent = mode === 'student';

    return (
      <>
        <header className="absolute top-0 left-0 right-0 h-14 z-20 px-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shadow-lg">
          {/* Brand & Stats */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Spline className="w-4 h-4 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100 tracking-wide">
                  Linear Algebra NSU
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800/60 text-sky-300 font-semibold">
                  {isStudent ? 'Student' : (mode === 'author' ? 'Полноэкранный' : 'Fullscreen')}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>{nodesCount} {isStudent || mode === 'assistant' ? 'nodes' : 'узлов'}</span>
                <span>•</span>
                <span>{edgesCount} {isStudent || mode === 'assistant' ? 'edges' : 'связей'}</span>
              </div>
            </div>
          </div>

          {/* Search Bar & Statistics Indicator */}
          <div className="flex items-center gap-2.5 flex-1 max-w-xl mx-4">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={isStudent || mode === 'assistant' ? "Search graph (EN, 中文, formulas, phrases)..." : "Поиск по графу (EN, 中文, формулы, фразы)..."}
                value={fullscreenSearchQuery}
                onChange={e => onFullscreenSearchChange?.(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
              />
              {fullscreenSearchQuery && (
                <button
                  type="button"
                  onClick={() => onFullscreenSearchChange?.('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasSearch && (
              <div className="px-2.5 py-1 bg-sky-950/80 border border-sky-700/50 rounded-lg text-[11px] text-sky-200 whitespace-nowrap shadow flex items-center gap-2">
                {isStudent || mode === 'assistant' ? (
                  <>
                    <span>Found: <strong className="text-white font-bold">{fullscreenMatchedNodesCount}</strong> nodes</span>
                    <span>•</span>
                    <span><strong className="text-sky-300 font-bold">{fullscreenMatchedEdgesCount}</strong> edges</span>
                  </>
                ) : (
                  <>
                    <span>Найдено: <strong className="text-white font-bold">{fullscreenMatchedNodesCount}</strong> узлов</span>
                    <span>•</span>
                    <span><strong className="text-sky-300 font-bold">{fullscreenMatchedEdgesCount}</strong> связей</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Controls: Pause/Play Physics, Help, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Play/Pause FA2 Physics (Requirement 0) */}
            <button
              onClick={() => onUpdateSettings({ physicsRunning: !settings.physicsRunning })}
              className={`p-1.5 rounded-lg border text-xs transition ${
                settings.physicsRunning
                  ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={settings.physicsRunning ? (isStudent || mode === 'assistant' ? 'Pause Physics' : 'Остановить физику') : (isStudent || mode === 'assistant' ? 'Resume Physics' : 'Запустить физику')}
            >
              {settings.physicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition"
              title={isStudent || mode === 'assistant' ? "Help" : "Справка"}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleFullscreen}
              className={`p-1.5 rounded-lg border text-xs transition ${
                isFullscreen
                  ? 'bg-sky-950 border-sky-600 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title={isFullscreen ? (isStudent || mode === 'assistant' ? 'Exit Fullscreen' : 'Выйти из полноэкранного режима') : (isStudent || mode === 'assistant' ? 'Fullscreen' : 'Полноэкранный режим')}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Floating Zoom Controls Widget */}
        <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
          <button
            onClick={onExportSvg}
            className="p-2 text-sky-400 hover:text-white hover:bg-sky-950/70 border border-sky-800/40 rounded-lg transition group relative"
            title={isStudent || mode === 'assistant' ? "Export graph to SVG" : "Экспорт графа в SVG"}
          >
            <FileImage className="w-4 h-4" />
            {pinnedBadgesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                {pinnedBadgesCount}
              </span>
            )}
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <button onClick={onZoomIn} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title={isStudent || mode === 'assistant' ? "Zoom In" : "Увеличить (Zoom In)"}>
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="text-[10px] font-mono text-center text-slate-400 select-none py-0.5 border-y border-slate-800">
            {Math.round(zoomLevel * 100)}%
          </div>
          <button onClick={onZoomOut} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title={isStudent || mode === 'assistant' ? "Zoom Out" : "Уменьшить (Zoom Out)"}>
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <button onClick={onFitGraph} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title={isStudent || mode === 'assistant' ? "Fit to Screen" : "Вписать в экран"}>
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onResetView} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title={isStudent || mode === 'assistant' ? "Reset View" : "Сбросить вид"}>
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Student Help Modal (Requirement 1 & 2) */}
        {showHelp && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-300 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  {isStudent || mode === 'assistant' ? 'Linear Algebra NSU — Guide' : 'Linear Algebra NSU — Справочник студента'}
                </h3>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              {isStudent || mode === 'assistant' ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-emerald-300 mb-1">📌 Pinning Cards (Double-Click LMB):</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Double-click with the left mouse button on any concept node or connection edge to open and pin its mathematical card with LaTeX formulas and descriptions directly on the canvas.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sky-300 mb-1">🔍 Search & Real-time Highlighting:</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Type English/Chinese terms, keywords, or mathematical formulas (e.g. <code>rank</code>, <code>eigenvalue</code>, <code>SVD</code>, <code>Jordan</code>) in the search bar. All matching nodes and relationships are instantly highlighted.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">🧭 Local Graph Subgraph (Right-Click RMB):</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Right-click on any node to isolate its local neighborhood (Depth 1: direct neighbors, or Depth 2: extended dependencies), temporarily focusing your study.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-amber-300 mb-1">🖼 High-Resolution SVG Export:</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Click the SVG button in the bottom-right corner to export a publication-ready vector diagram with mathematical formulas and watermark.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-emerald-300 mb-1">📌 Закрепление карточек (Двойной клик ЛКМ):</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Двойной щелчок левой кнопкой мыши по узлу или связи открывает и закрепляет карточку с математическими формулами и описанием прямо на графе.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sky-300 mb-1">🔍 Поиск и подсветка:</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      В строке поиска введите термин на английском, китайском или формулу (например, <code>rank</code>, <code>eigenvalue</code>, <code>SVD</code>). Все найденные узлы и связи сразу подсветятся на графе.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">🧭 Локальный граф (Клик ПКМ):</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Правый клик мыши по узлу позволяет отобразить только его подграф (глубина 1 или 2), скрыв остальную часть графа.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-amber-300 mb-1">🖼 Экспорт в векторный SVG:</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Кнопка экспорта в правом нижнем углу сохраняет векторную диаграмму высокого разрешения с водяным знаком.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold"
                >
                  {isStudent || mode === 'assistant' ? 'Close' : 'Закрыть'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. ASSISTANT MODE (English, Requirement 2)
  if (mode === 'assistant') {
    return (
      <>
        <header className="absolute top-0 left-0 right-0 h-14 z-20 px-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shadow-lg">
          {/* Brand & Role */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100 tracking-wide">
                  Linear Algebra NSU
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700/70 text-emerald-300 font-semibold">
                  Assistant
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>{nodesCount} nodes</span>
                <span>•</span>
                <span>{edgesCount} edges</span>
              </div>
            </div>
          </div>

          {/* Center: Save & Load Proposal */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={proposalInputRef}
              onChange={handleProposalUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => proposalInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition flex items-center gap-1.5"
              title="Load previously saved proposal (.json)"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Load Proposals</span>
            </button>

            <button
              onClick={onOpenSaveProposalModal}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              title="Save proposed changes to .json file"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Proposals (.json)</span>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateSettings({ showLabels: !settings.showLabels })}
              className={`p-1.5 rounded-lg border text-xs transition ${
                settings.showLabels
                  ? 'bg-sky-950 border-sky-600 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={settings.showLabels ? 'Labels Visible' : 'Labels Hidden'}
            >
              <Type className="w-4 h-4" />
            </button>

            <button
              onClick={() => onUpdateSettings({ physicsRunning: !settings.physicsRunning })}
              className={`p-1.5 rounded-lg border text-xs transition ${
                settings.physicsRunning
                  ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={settings.physicsRunning ? 'Pause Physics' : 'Resume Physics'}
            >
              {settings.physicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleFullscreen}
              className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Floating Zoom Widget */}
        <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
          <button
            onClick={onExportSvg}
            className="p-2 text-sky-400 hover:text-white hover:bg-sky-950/70 border border-sky-800/40 rounded-lg transition"
            title="Export graph to SVG"
          >
            <FileImage className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <button onClick={onZoomIn} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="text-[10px] font-mono text-center text-slate-400 select-none py-0.5 border-y border-slate-800">
            {Math.round(zoomLevel * 100)}%
          </div>
          <button onClick={onZoomOut} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <button onClick={onFitGraph} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Fit to Screen">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onResetView} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </>
    );
  }

  // 3. AUTHOR MODE (Full Master Tooling in Russian, Requirement 7)
  return (
    <>
      <header className="absolute top-0 left-0 right-0 h-14 z-20 px-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shadow-lg">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 p-0.5 flex items-center justify-center shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Spline className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100 tracking-wide">
                Linear Algebra NSU
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800/60 text-sky-300 font-semibold">
                Автор
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              {vaultName && <span className="text-slate-300 truncate max-w-[120px] font-medium">{vaultName}</span>}
              {vaultName && <span>•</span>}
              <span>{nodesCount} узлов</span>
              <span>•</span>
              <span>{edgesCount} связей</span>
            </div>
          </div>
        </div>

        {/* Center Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* Obsidian Folder Picker */}
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFolderUpload}
            // @ts-expect-error webkitdirectory is non-standard but supported
            webkitdirectory="true"
            directory="true"
            multiple
            className="hidden"
          />
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition flex items-center gap-1.5 shadow-sm"
            title="Загрузить папку Obsidian"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Папка Obsidian</span>
          </button>

          {/* Update Vault Button */}
          <input
            type="file"
            ref={updateInputRef}
            onChange={handleFolderUpload}
            // @ts-expect-error webkitdirectory is non-standard but supported
            webkitdirectory="true"
            directory="true"
            multiple
            className="hidden"
          />
          <button
            onClick={() => {
              if (onUpdateVault) onUpdateVault();
              updateInputRef.current?.click();
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition flex items-center gap-1.5 shadow-sm"
            title="Обновить хранилище из папки"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Обновить из папки</span>
          </button>

          {/* Assistant Proposal Review Button */}
          <div className="relative flex items-center">
            <input
              type="file"
              ref={proposalInputRef}
              onChange={handleProposalUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => proposalInputRef.current?.click()}
              className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900/90 border border-amber-600/70 text-amber-300 rounded-l-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Загрузить файл правок помощника (assistant_proposal_*.json)"
            >
              <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
              <span>Проверить правки</span>
            </button>

            {hasActiveProposalLog && (
              <button
                onClick={onToggleProposalReviewModal}
                className={`px-2 py-1.5 border border-l-0 border-amber-600/70 rounded-r-lg text-xs font-bold transition flex items-center gap-1 ${
                  isProposalReviewModalOpen
                    ? 'bg-amber-600 text-slate-950'
                    : 'bg-amber-950/80 text-amber-300 hover:bg-amber-900/90'
                }`}
                title="Показать / скрыть плавающий лог правок"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProposalReviewModalOpen ? 'rotate-180' : ''}`} />
                {unprocessedProposalCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] flex items-center justify-center font-mono font-bold">
                    {unprocessedProposalCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-slate-800 mx-1" />

          {/* Labels & Hierarchy Modal */}
          <button
            onClick={onOpenLabelsModal}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition flex items-center gap-1.5 shadow-sm"
            title="Метки и иерархия"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>Метки</span>
          </button>

          {/* LaTeX Help Modal */}
          <button
            onClick={() => setShowLatexHelp(true)}
            className="px-3 py-1.5 bg-sky-950/80 hover:bg-sky-900/90 border border-sky-700/70 text-sky-300 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
            title="Справка по KaTeX / LaTeX формулам"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Справка $LaTeX$</span>
          </button>
        </div>

        {/* Right Tooling: Settings, Physics, Export */}
        <div className="flex items-center gap-2">
          {/* Edge Appearance Dropdown */}
          <div className="relative" ref={edgeMenuRef}>
            <button
              onClick={() => setShowEdgeMenu(!showEdgeMenu)}
              className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
                showEdgeMenu ? 'bg-slate-800 border-sky-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Настройки связей"
            >
              <Spline className="w-4 h-4 text-sky-400" />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showEdgeMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-3">
                <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                  <Spline className="w-3.5 h-3.5 text-sky-400" /> Настройки связей
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Толщина по умолчанию:</span>
                    <span className="font-mono text-sky-400">{settings.edgeThickness.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={settings.edgeThickness}
                    onChange={e => onUpdateSettings({ edgeThickness: parseFloat(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Прозрачность (Opacity):</span>
                    <span className="font-mono text-sky-400">{Math.round(settings.edgeOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.edgeOpacity}
                    onChange={e => onUpdateSettings({ edgeOpacity: parseFloat(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="block text-slate-400 mb-1">Цвет связей по умолчанию:</span>
                  <div className="grid grid-cols-7 gap-1">
                    {EDGE_COLOR_PRESETS.map(p => (
                      <button
                        key={p.color}
                        onClick={() => onUpdateSettings({ edgeColor: p.color })}
                        className={`w-6 h-6 rounded-full border transition ${
                          settings.edgeColor === p.color ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100 border-slate-600'
                        }`}
                        style={{ backgroundColor: p.color }}
                        title={p.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={settings.showCurvedEdges}
                      onChange={e => onUpdateSettings({ showCurvedEdges: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                    <span>Изогнутые связи</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Node Density Dropdown */}
          <div className="relative" ref={nodeMenuRef}>
            <button
              onClick={() => setShowNodeMenu(!showNodeMenu)}
              className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
                showNodeMenu ? 'bg-slate-800 border-sky-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Плотность и физика узлов"
            >
              <CircleDot className="w-4 h-4 text-emerald-400" />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showNodeMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-3">
                <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                  <CircleDot className="w-3.5 h-3.5 text-emerald-400" /> Плотность графа (ForceAtlas2)
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Расстояние между узлами:</span>
                    <span className="font-mono text-emerald-400">{settings.nodeSpacing}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.nodeSpacing}
                    onChange={e => onUpdateSettings({ nodeSpacing: parseInt(e.target.value, 10) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Сила отталкивания:</span>
                    <span className="font-mono text-emerald-400">{settings.nodeRepulsionMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={settings.nodeRepulsionMultiplier}
                    onChange={e => onUpdateSettings({ nodeRepulsionMultiplier: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Длина связей:</span>
                    <span className="font-mono text-emerald-400">{settings.edgeLength.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2.5"
                    step="0.1"
                    value={settings.edgeLength}
                    onChange={e => onUpdateSettings({ edgeLength: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Toggle Labels */}
          <button
            onClick={() => onUpdateSettings({ showLabels: !settings.showLabels })}
            className={`p-1.5 rounded-lg border text-xs transition ${
              settings.showLabels
                ? 'bg-sky-950 border-sky-600 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={settings.showLabels ? 'Метки включены' : 'Метки скрыты'}
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Play/Pause FA2 Physics */}
          <button
            onClick={() => onUpdateSettings({ physicsRunning: !settings.physicsRunning })}
            className={`p-1.5 rounded-lg border text-xs transition ${
              settings.physicsRunning
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={settings.physicsRunning ? 'Остановить физику (Pause)' : 'Запустить физику (Play)'}
          >
            {settings.physicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Import / Export Master JSON */}
          <input
            type="file"
            ref={jsonInputRef}
            onChange={handleJsonUpload}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700"
            title="Загрузить проект (JSON)"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={onExportProject}
            className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            title="Сохранить проект (JSON)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700"
            title="Полноэкранный режим"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Zoom Widget */}
      <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
        <button
          onClick={onExportSvg}
          className="p-2 text-sky-400 hover:text-white hover:bg-sky-950/70 border border-sky-800/40 rounded-lg transition"
          title="Экспорт графа в SVG"
        >
          <FileImage className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 my-0.5" />
        <button onClick={onZoomIn} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Увеличить (Zoom In)">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="text-[10px] font-mono text-center text-slate-400 select-none py-0.5 border-y border-slate-800">
          {Math.round(zoomLevel * 100)}%
        </div>
        <button onClick={onZoomOut} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Уменьшить (Zoom Out)">
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 my-0.5" />
        <button onClick={onFitGraph} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Вписать в экран">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button onClick={onResetView} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Сбросить вид">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {showLatexHelp && (
        <LatexHelpModal onClose={() => setShowLatexHelp(false)} />
      )}
    </>
  );
};
