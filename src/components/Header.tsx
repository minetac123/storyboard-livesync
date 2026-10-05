import React, { useState } from 'react';
import { 
  Clapperboard, 
  Smartphone, 
  Printer, 
  Download, 
  Plus, 
  LayoutGrid, 
  Columns, 
  Maximize2, 
  Share2, 
  Settings, 
  Check 
} from 'lucide-react';
import { StoryboardProject } from '../types/storyboard';

interface HeaderProps {
  project: StoryboardProject;
  setProject: React.Dispatch<React.SetStateAction<StoryboardProject>>;
  roomId: string;
  connected: boolean;
  mobileCount: number;
  onOpenConnectModal: () => void;
  onOpenPrintModal: () => void;
  onOpenExportModal: () => void;
  onOpenSimulatorModal: () => void;
  onAddPanel: () => void;
  viewMode: 'grid' | 'list' | 'presentation';
  setViewMode: (mode: 'grid' | 'list' | 'presentation') => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  setProject,
  roomId,
  connected,
  mobileCount,
  onOpenConnectModal,
  onOpenPrintModal,
  onOpenExportModal,
  onOpenSimulatorModal,
  onAddPanel,
  viewMode,
  setViewMode
}) => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const copyRoomLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/?room=${roomId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-black border-b border-zinc-800 px-4 py-3 text-white">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Titulek a název filmu */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
              <Clapperboard className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white uppercase">
                  Storyboard LiveSync
                </span>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1.5 text-left"
                title="Klepnutím vyplníte název a režiséra"
              >
                {project.title || project.director ? (
                  <>
                    <span className="text-white font-medium">{project.title || '—'}</span>
                    {project.director && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span>{project.director}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-500 hover:text-zinc-300">+ Vyplnit název a režiséra</span>
                )}
                <Settings className="w-3 h-3 text-zinc-500 ml-1" />
              </button>
            </div>
          </div>

          {/* Kód místnosti */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? 'bg-white' : 'bg-zinc-600'
              }`}
            />
            <span className="font-mono text-zinc-300 font-medium">{roomId}</span>
            <button
              onClick={copyRoomLink}
              title="Kopírovat odkaz"
              className="ml-1 text-zinc-400 hover:text-white p-0.5 rounded"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
            {mobileCount > 0 && (
              <span className="text-[11px] text-zinc-300 ml-1">📱 {mobileCount}</span>
            )}
          </div>
        </div>

        {/* Hlavní akce */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Zobrazení */}
          <div className="bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 flex items-center text-zinc-400">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'hover:text-white'
              }`}
              title="Mřížka"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'hover:text-white'
              }`}
              title="Seznam"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('presentation')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'presentation'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'hover:text-white'
              }`}
              title="Přehrát prezentaci"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Test v prohlížeči */}
          <button
            onClick={onOpenSimulatorModal}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium"
            title="Otevřít simulátor fotoaparátu v prohlížeči"
          >
            <span>📱 Test skeneru</span>
          </button>

          {/* Připojit mobil (Bílé výrazné tlačítko) */}
          <button
            onClick={onOpenConnectModal}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="Zobrazit QR kód pro mobil"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Připojit mobil</span>
          </button>

          {/* Tisknout A4 */}
          <button
            onClick={onOpenPrintModal}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium flex items-center gap-1.5"
            title="Vytisknout šablony A4 s QR kódy"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden lg:inline">Tisknout A4</span>
          </button>

          {/* Exportovat PDF */}
          <button
            onClick={onOpenExportModal}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-medium flex items-center gap-1.5"
            title="Stáhnout černobílé prezentační PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Stáhnout PDF</span>
          </button>

          {/* Přidat záběr */}
          <button
            onClick={onAddPanel}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-medium flex items-center gap-1"
            title="Přidat další záběr"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Záběr</span>
          </button>
        </div>
      </div>

      {/* Nastavení projektu (Čistě černé a bílé) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Clapperboard className="w-4 h-4" />
              Údaje o filmu
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-400 mb-1">Název filmu / projektu</label>
                <input
                  type="text"
                  placeholder="Vyplňte název filmu..."
                  value={project.title}
                  onChange={(e) => setProject({ ...project, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-400 mb-1">Režisér / Výtvarník</label>
                <input
                  type="text"
                  placeholder="Vyplňte jméno režiséra..."
                  value={project.director}
                  onChange={(e) => setProject({ ...project, director: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-400 mb-1">Datum</label>
                <input
                  type="date"
                  value={project.date}
                  onChange={(e) => setProject({ ...project, date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-400 mb-1">Formát obrazu</label>
                <select
                  value={project.aspectRatio}
                  onChange={(e) => setProject({ ...project, aspectRatio: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                >
                  <option value="16:9">16:9 Širokoúhlý (Standard)</option>
                  <option value="2.39:1">2.39:1 Širokoúhlé kino (Scope)</option>
                  <option value="1.85:1">1.85:1 Filmový formát</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
