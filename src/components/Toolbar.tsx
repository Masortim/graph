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
        let fileName = file.name;
        
        if (parts.length >= 3) {
          detectedVaultName = parts[0];
          chapter = parts.slice(1, -1).join(' / ');
          fileName = parts[parts.length - 1];
        } else if (parts.length === 2) {
          detectedVaultName = parts[0];
          chapter = parts[0];
          fileName = parts[1];
        } else {
          chapter = 'General Notes';
          fileName = file.name;
        }

        rawFiles.push({
          path: relPath,
          chapter,
          fileName,
          content: text,
        });
      }
    }

    if (rawFiles.length > 0) {
      onLoadObsidianFiles(rawFiles, detectedVaultName);
    } else {
      alert('В выбранной папке не найдено markdown (.md) файлов.');
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
                  {mode === 'student' ? 'Студент' : 'Полноэкранный'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>{nodesCount} узлов</span>
                <span>•</span>
                <span>{edgesCount} связей</span>
              </div>
            </div>
          </div>

          {/* Search Bar & Statistics Indicator */}
          <div className="flex items-center gap-2.5 flex-1 max-w-xl mx-4">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Поиск по графу (EN, 中文, формулы, фразы)..."
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
                <span>Найдено: <strong className="text-white font-bold">{fullscreenMatchedNodesCount}</strong> узлов</span>
                <span>•</span>
                <span><strong className="text-sky-300 font-bold">{fullscreenMatchedEdgesCount}</strong> связей</span>
              </div>
            )}
          </div>

          {/* Right Controls: Help, SVG Export, Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition"
              title="Справка"
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
              title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
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
            title="Экспорт графа в SVG (с водяным знаком)"
          >
            <FileImage className="w-4 h-4" />
            {pinnedBadgesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                {pinnedBadgesCount}
              </span>
            )}
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

        {/* Student Help Modal (Requirement 2) */}
        {showHelp && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-300 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  Linear Algebra NSU — Справочник студента
                </h3>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

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
                    Кнопка экспорта в правом нижнем углу сохраняет векторную диаграмму высокого разрешения с защищенным водяным знаком.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg"
                >
                  Понятно
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. ASSISTANT MODE
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
                  Помощник автора
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>{nodesCount} узлов</span>
                <span>•</span>
                <span>{edgesCount} связей</span>
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
              title="Загрузить свои ранее сохраненные правки (.json)"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Загрузить свои правки</span>
            </button>

            <button
              onClick={onOpenSaveProposalModal}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              title="Сохранить предложения и правки в файл .json"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить правки (.json)</span>
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
              title={settings.showLabels ? 'Метки включены' : 'Метки скрыты'}
            >
              <Type className="w-4 h-4" />
            </button>

            <button
              onClick={() => onUpdateSettings({ physicsRunning: !settings.physicsRunning })}
              className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
                settings.physicsRunning
                  ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {settings.physicsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{settings.physicsRunning ? 'FA2' : 'Pause'}</span>
            </button>

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

  // 3. AUTHOR MODE (Full Master Tooling)
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
            onClick={onUpdateVault}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 hover:from-emerald-900 hover:to-teal-900 border border-emerald-600/60 rounded-lg text-xs font-semibold text-emerald-300 transition flex items-center gap-1.5 shadow-sm"
            title="Update: пересчитать метрики ключевых фраз во всех узлах"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Update</span>
          </button>

          {/* Labels Export / Import Modal Trigger */}
          <button
            onClick={onOpenLabelsModal}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-sky-300 transition flex items-center gap-1 shadow-sm"
            title="Экспорт меток для перевода и импорт готовых переводов"
          >
            <Languages className="w-3.5 h-3.5 text-sky-400" />
            <span>Метки</span>
          </button>

          {/* Project JSON Export & Import */}
          <input
            type="file"
            ref={jsonInputRef}
            onChange={handleJsonUpload}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={onExportProject}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition flex items-center gap-1"
            title="Сохранить весь проект в JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Сохранить</span>
          </button>
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition flex items-center gap-1"
            title="Загрузить проект из JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Загрузить</span>
          </button>

          {/* Requirement 4: Button "Проверить правки" with active dropdown chevron */}
          <input
            type="file"
            ref={proposalInputRef}
            onChange={handleProposalUpload}
            accept=".json"
            className="hidden"
          />
          <div className="flex items-center rounded-lg border border-amber-600/70 bg-gradient-to-r from-amber-950/90 to-amber-900/80 shadow-sm overflow-hidden">
            <button
              onClick={() => proposalInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:text-white transition flex items-center gap-1.5 border-r border-amber-700/60"
              title="Загрузить файл правок помощника (assistant_proposal_*.json)"
            >
              <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
              <span>Проверить правки</span>
            </button>

            <button
              onClick={onToggleProposalReviewModal}
              disabled={!hasActiveProposalLog}
              className={`px-1.5 py-1.5 transition flex items-center justify-center ${
                hasActiveProposalLog
                  ? isProposalReviewModalOpen
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-950 text-amber-300 hover:bg-amber-800'
                  : 'opacity-35 cursor-not-allowed text-slate-500'
              }`}
              title={
                hasActiveProposalLog
                  ? 'Открыть/скрыть плавающее окно лога правок помощника'
                  : 'Загрузите файл правок помощника для активации лога'
              }
            >
              <ChevronDown className="w-3.5 h-3.5" />
              {unprocessedProposalCount > 0 && (
                <span className="ml-0.5 text-[9px] font-bold bg-rose-500 text-white rounded-full px-1">
                  {unprocessedProposalCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Tools & Dropdown Settings */}
        <div className="flex items-center gap-2">
          {/* Node Density Dropdown */}
          <div className="relative" ref={nodeMenuRef}>
            <button
              onClick={() => {
                setShowNodeMenu(!showNodeMenu);
                setShowEdgeMenu(false);
              }}
              className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
                showNodeMenu
                  ? 'bg-purple-950 border-purple-500 text-purple-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Плотность узлов"
            >
              <CircleDot className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline text-[11px]">Узлы</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showNodeMenu && (
              <div className="absolute right-0 top-12 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-3.5 z-50 text-xs space-y-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <CircleDot className="w-3.5 h-3.5 text-purple-400" />
                    Плотность и дистанция узлов
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                    <span>Минимальный зазор:</span>
                    <span className="font-mono text-purple-300">{settings.nodeSpacing}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="2"
                    value={settings.nodeSpacing}
                    onChange={e => onUpdateSettings({ nodeSpacing: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                    <span>Сила отталкивания:</span>
                    <span className="font-mono text-purple-300">{settings.nodeRepulsionMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={settings.nodeRepulsionMultiplier}
                    onChange={e => onUpdateSettings({ nodeRepulsionMultiplier: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Edge Settings Dropdown */}
          <div className="relative" ref={edgeMenuRef}>
            <button
              onClick={() => {
                setShowEdgeMenu(!showEdgeMenu);
                setShowNodeMenu(false);
              }}
              className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
                showEdgeMenu
                  ? 'bg-sky-950 border-sky-500 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Настройки дуг"
            >
              <Spline className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline text-[11px]">Дуги</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showEdgeMenu && (
              <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-4 z-50 text-xs space-y-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Spline className="w-3.5 h-3.5 text-sky-400" />
                    Настройки дуг графа
                  </span>
                  <button
                    onClick={() => onUpdateSettings({ showCurvedEdges: !settings.showCurvedEdges })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      settings.showCurvedEdges ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.showCurvedEdges ? 'Изогнутые' : 'Прямые'}
                  </button>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 text-[11px] font-medium">
                    Цвет всех дуг по умолчанию:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {EDGE_COLOR_PRESETS.map(p => (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => onUpdateSettings({ edgeColor: p.color })}
                        title={p.label}
                        className={`w-5 h-5 rounded-full border transition transform ${
                          settings.edgeColor === p.color
                            ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900 scale-110'
                            : 'opacity-70 hover:opacity-100 border-slate-600'
                        }`}
                        style={{ backgroundColor: p.color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={settings.edgeColor}
                      onChange={e => onUpdateSettings({ edgeColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                    <span>Толщина дуг:</span>
                    <span className="font-mono text-sky-300">{settings.edgeThickness.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.5"
                    step="0.1"
                    value={settings.edgeThickness}
                    onChange={e => onUpdateSettings({ edgeThickness: Number(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                    <span>Прозрачность дуг:</span>
                    <span className="font-mono text-sky-300">{Math.round(settings.edgeOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={settings.edgeOpacity}
                    onChange={e => onUpdateSettings({ edgeOpacity: Number(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <div className="pt-1 border-t border-slate-800">
                  <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                    <span className="font-medium text-amber-300">Удлинить дуги:</span>
                    <span className="font-mono text-amber-300">{settings.edgeLength.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="3.5"
                    step="0.1"
                    value={settings.edgeLength}
                    onChange={e => onUpdateSettings({ edgeLength: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Labels Toggle */}
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

          {/* Physics Toggle */}
          <button
            onClick={() => onUpdateSettings({ physicsRunning: !settings.physicsRunning })}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
              settings.physicsRunning
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {settings.physicsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{settings.physicsRunning ? 'FA2' : 'Pause'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700"
            title="Полноэкранный режим"
          >
            <Maximize className="w-4 h-4" />
          </button>

          {/* Help */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition"
            title="Справка"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Controls Widget */}
      <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
        <button
          onClick={onExportSvg}
          className="p-2 text-sky-400 hover:text-white hover:bg-sky-950/70 border border-sky-800/40 rounded-lg transition group relative"
          title="Экспорт графа в SVG"
        >
          <FileImage className="w-4 h-4" />
          {pinnedBadgesCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
              {pinnedBadgesCount}
            </span>
          )}
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

      {/* Author Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                Linear Algebra NSU — Руководство автора
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sky-300 mb-1">🖱 Управление мышью:</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  • <strong>Зажатая ПКМ (RMB Drag):</strong> двигает весь холст в любую сторону.<br />
                  • <strong>Клик ПКМ по узлу:</strong> открывает меню локального графа (глубина 1 или 2).<br />
                  • <strong>Двойной клик ПКМ по дуге:</strong> открывает инспектор настройки связи.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-emerald-300 mb-1">🎮 Двойной клик ЛКМ (LMB):</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Открывает и закрепляет информационные карточки узлов и связей на графе.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-purple-300 mb-1">📐 Формулы LaTeX / KaTeX:</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-2">
                  В карточки можно вводить формулы в обрамлении <code>$formula$</code> (например, <code>$\mathbb&#123;R&#125;^n$</code>, <code>$A\\mathbf&#123;x&#125; = \\lambda\\mathbf&#123;x&#125;$</code>).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowHelp(false);
                    setShowLatexHelp(true);
                  }}
                  className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/60 text-purple-300 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shadow"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Открыть справочник формул KaTeX</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {showLatexHelp && (
        <LatexHelpModal onClose={() => setShowLatexHelp(false)} />
      )}
    </>
  );
};
