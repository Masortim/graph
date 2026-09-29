import React, { useRef, useState } from 'react';
import { 
  Maximize, 
  Minimize, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Play, 
  Pause, 
  Upload, 
  Spline, 
  Type, 
  HelpCircle, 
  FileImage,
  Search,
  X,
  Save,
  CheckSquare,
  Square,
  MapPin
} from 'lucide-react';
import type { ObsidianFileRaw, GraphSettings, AppMode } from '../types/graph';
import { LatexHelpModal } from './LatexHelpModal';
import { SectionCoordinatesModal } from './SectionCoordinatesModal';
import type { GraphNode } from '../types/graph';

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
  
  // Search query & metrics
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  matchedNodesCount?: number;
  matchedEdgesCount?: number;

  // Assistant Proposals
  onDirectSaveProposals?: () => void;
  onImportAssistantProposal?: (file: File) => void;
  hasActiveProposalLog?: boolean;
  unprocessedProposalCount?: number;

  // Section Coordinates Feature
  nodes?: GraphNode[];
  sectionCoordinatesText?: string;
  onSaveSectionCoordinates?: (text: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  mode = 'student',
  onZoomIn,
  onZoomOut,
  onFitGraph,
  onResetView,
  onExportSvg,
  zoomLevel,
  settings,
  onUpdateSettings,
  onUpdateVault: _onUpdateVault,
  onLoadObsidianFiles: _onLoadObsidianFiles,
  onExportProject: _onExportProject,
  onImportProject: _onImportProject,
  onOpenLabelsModal: _onOpenLabelsModal,
  nodesCount,
  edgesCount,
  vaultName,
  isFullscreen,
  onToggleFullscreen,
  pinnedBadgesCount: _pinnedBadgesCount = 0,
  searchQuery = '',
  onSearchChange,
  matchedNodesCount = 0,
  matchedEdgesCount = 0,
  onDirectSaveProposals,
  onImportAssistantProposal,
  hasActiveProposalLog: _hasActiveProposalLog = false,
  unprocessedProposalCount: _unprocessedProposalCount = 0,
  nodes = [],
  sectionCoordinatesText = '',
  onSaveSectionCoordinates,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showLatexHelp, setShowLatexHelp] = useState(false);
  const [isSectionCoordModalOpen, setIsSectionCoordModalOpen] = useState(false);
  
  const proposalInputRef = useRef<HTMLInputElement | null>(null);

  const handleProposalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportAssistantProposal) {
      onImportAssistantProposal(file);
    }
    if (proposalInputRef.current) proposalInputRef.current.value = '';
  };

  const hasSearch = searchQuery.trim().length > 0;
  const isStudent = mode === 'student';
  const isAssistant = mode === 'assistant';

  return (
    <>
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between select-none z-20 shrink-0 shadow-lg">
        {/* Left: Brand & Mode Badge & Counters */}
        <div className="flex items-center gap-3 shrink-0">
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
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                isAssistant 
                  ? 'bg-amber-950 border-amber-700/60 text-amber-300' 
                  : 'bg-sky-950 border-sky-800/60 text-sky-300'
              }`}>
                {isAssistant ? 'Assistant' : 'Student'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              {vaultName && <span className="text-slate-300 truncate max-w-[120px] font-medium">{vaultName}</span>}
              {vaultName && <span>•</span>}
              <span>{nodesCount} {isStudent || isAssistant ? 'nodes' : 'узлов'}</span>
              <span>•</span>
              <span>{edgesCount} {isStudent || isAssistant ? 'edges' : 'связей'}</span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar for BOTH Student and Assistant Modes */}
        <div className="flex items-center gap-2.5 flex-1 max-w-xl mx-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isStudent || isAssistant ? "Search graph (EN, 中文, formulas, phrases)..." : "Поиск по графу (EN, 中文, формулы, фразы)..."}
              value={searchQuery}
              onChange={e => onSearchChange?.(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasSearch && (
            <div className="px-2.5 py-1 bg-sky-950/80 border border-sky-700/50 rounded-lg text-[11px] text-sky-200 whitespace-nowrap shadow flex items-center gap-2">
              <span>Found: <strong className="text-white font-bold">{matchedNodesCount}</strong> nodes</span>
              <span>•</span>
              <span><strong className="text-sky-300 font-bold">{matchedEdgesCount}</strong> edges</span>
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Assistant-Only Action Group: Icon-Only Load Proposals, Direct Save Proposals, Section Coordinates Editor */}
          {isAssistant && (
            <>
              {/* Load Proposals (Icon-Only) */}
              <input
                type="file"
                ref={proposalInputRef}
                onChange={handleProposalUpload}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => proposalInputRef.current?.click()}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 hover:text-white transition shadow-sm"
                title={isAssistant ? "Load proposals (proposal_diff.json)" : "Загрузить файл предложенных правок (proposal_diff.json)"}
              >
                <Upload className="w-4 h-4 text-amber-400" />
              </button>

              {/* Direct Save Proposals (Instant JSON download without modal) */}
              <button
                type="button"
                onClick={onDirectSaveProposals}
                className="p-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-300 rounded-lg transition shadow-sm"
                title={isAssistant ? "Save assistant proposals (direct download proposal_diff.json)" : "Сохранить предложенные правки (прямое скачивание proposal_diff.json)"}
              >
                <Save className="w-4 h-4 text-amber-400" />
              </button>

              {/* Section Coordinates Editor Modal Button (Right of Save button) */}
              <button
                type="button"
                onClick={() => setIsSectionCoordModalOpen(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 hover:text-white transition shadow-sm"
                title={isAssistant ? "Section Coordinates Editor (sectionCoordinates.txt)" : "Редактор файла координат секций (sectionCoordinates.txt)"}
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
              </button>

              <div className="h-5 w-px bg-slate-800 mx-1" />
            </>
          )}

          {/* Fix Sections Checkbox Button (Directly left of Labels button) */}
          <button
            type="button"
            onClick={() => onUpdateSettings({ fixSections: !settings.fixSections })}
            className={`p-2 rounded-lg border text-xs transition shadow-sm flex items-center gap-1.5 ${
              settings.fixSections
                ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-950/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={
              settings.fixSections
                ? (isAssistant 
                    ? "Fix Sections: Section nodes are pinned; concept nodes move dynamically with physics" 
                    : "Fix Sections: Секции зафиксированы на координатах, концепты двигаются")
                : (isAssistant 
                    ? "Fix Sections: Unpinned (all nodes move freely with physics)" 
                    : "Fix Sections: Свободное движение всех узлов")
            }
          >
            {settings.fixSections ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
          </button>

          {/* Toggle Labels */}
          <button
            type="button"
            onClick={() => onUpdateSettings({ showLabels: !settings.showLabels })}
            className={`p-2 rounded-lg border text-xs transition shadow-sm ${
              settings.showLabels
                ? 'bg-sky-950 border-sky-600 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={settings.showLabels ? (isStudent || isAssistant ? 'Labels Visible' : 'Метки включены') : (isStudent || isAssistant ? 'Labels Hidden' : 'Метки скрыты')}
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Play/Pause FA2 Physics */}
          <button
            type="button"
            onClick={() => onUpdateSettings({ physicsRunning: !settings.physicsRunning })}
            className={`p-2 rounded-lg border text-xs transition shadow-sm ${
              settings.physicsRunning
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={settings.physicsRunning ? (isStudent || isAssistant ? 'Pause Physics' : 'Остановить физику') : (isStudent || isAssistant ? 'Resume Physics' : 'Запустить физику')}
          >
            {settings.physicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition shadow-sm"
            title={isStudent || isAssistant ? "Help" : "Справка"}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`p-2 rounded-lg border text-xs transition shadow-sm ${
              isFullscreen
                ? 'bg-sky-950 border-sky-500 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={isFullscreen ? (isStudent || isAssistant ? 'Exit Fullscreen' : 'Выйти из полноэкранного') : (isStudent || isAssistant ? 'Fullscreen (F11)' : 'Полноэкранный режим (F11)')}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Floating Zoom Widget */}
      <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
        <button
          onClick={onExportSvg}
          className="p-2 text-sky-400 hover:text-white hover:bg-sky-950/70 border border-sky-800/40 rounded-lg transition"
          title="Export Graph to SVG"
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

      {/* Section Coordinates Editor Modal */}
      {isSectionCoordModalOpen && onSaveSectionCoordinates && (
        <SectionCoordinatesModal
          isOpen={isSectionCoordModalOpen}
          onClose={() => setIsSectionCoordModalOpen(false)}
          coordinatesText={sectionCoordinatesText}
          nodes={nodes}
          onSaveCoordinates={onSaveSectionCoordinates}
          isAssistant={isAssistant}
        />
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Linear Algebra Knowledge Graph</h3>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-slate-300 leading-relaxed">
              <p>• <strong>{isStudent ? 'Hover over Node/Edge' : 'Наведение на узел/связь'}</strong>: {isStudent ? 'Shows informational card and highlights direct connections.' : 'Отображает карточку с формулами и подсвечивает связи.'}</p>
              <p>• <strong>{isStudent ? 'Double LMB Click' : 'Двойной клик ЛКМ'}</strong>: {isStudent ? 'Pins the informational card on the canvas.' : 'Закрепляет / открепляет карточку на холсте.'}</p>
              <p>• <strong>{isStudent ? 'Single RMB Click' : 'Одинарный клик ПКМ'}</strong>: {isStudent ? 'Focuses and opens local subgraph.' : 'Фокусируется и открывает локальный подграф.'}</p>
              <p>• <strong>{isStudent ? 'Drag with RMB' : 'Перетаскивание ПКМ'}</strong>: {isStudent ? 'Pans the canvas.' : 'Панорамирование холста.'}</p>
              <p>• <strong>{isStudent ? 'Scroll Wheel' : 'Колесико мыши'}</strong>: {isStudent ? 'Smooth zoom in / out.' : 'Плавное масштабирование графа.'}</p>
              {isAssistant && (
                <p>• <strong>Fix Sections & Pinning</strong>: Секции фиксируются на координатах из файла координат, концепты группируются вокруг них.</p>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition"
              >
                {isStudent || isAssistant ? 'Got it' : 'Понятно'}
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
