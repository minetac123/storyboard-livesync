import React, { useState } from 'react';
import { Download, X, Film, CheckCircle2, AlertCircle } from 'lucide-react';
import { StoryboardProject } from '../types/storyboard';
import { exportPresentationPDF } from '../utils/pdfExport';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: StoryboardProject;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const [layout, setLayout] = useState<'2-per-page' | '4-per-page'>('2-per-page');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const panelsWithImages = project.panels.filter(p => !!p.imageUrl).length;
  const totalPanels = project.panels.length;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportPresentationPDF({
        project,
        layout
      });
      setIsExporting(false);
      onClose();
    } catch (err) {
      console.error('Chyba exportu PDF:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-black border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Export prezentace storyboardu (PDF)</h2>
            <p className="text-xs text-zinc-400">
              Černobílý prezentační dokument pro filmovou školu, štáb a režijní knihu
            </p>
          </div>
        </div>

        {/* Shrnutí projektu */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 mb-5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Název projektu:</span>
            <span className="font-bold text-white">{project.title || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Režisér:</span>
            <span className="font-medium text-white">{project.director || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Nakresleno:</span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="font-bold text-white">
                {panelsWithImages} z {totalPanels} záběrů
              </span>
              {panelsWithImages === totalPanels ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
          </div>
        </div>

        {/* Rozvržení prezentace */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Rozvržení stránek
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLayout('2-per-page')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                layout === '2-per-page'
                  ? 'border-white bg-zinc-900 text-white'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="font-bold text-xs mb-1 text-white">2 záběry na stránku</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Velké kresby ve vysokém rozlišení s kompletními poznámkami.
              </p>
            </button>

            <button
              onClick={() => setLayout('4-per-page')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                layout === '4-per-page'
                  ? 'border-white bg-zinc-900 text-white'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="font-bold text-xs mb-1 text-white">4 záběry na stránku</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Kompaktní mřížka 2×2 pro rychlý přehled celé sekvence.
              </p>
            </button>
          </div>
        </div>

        {/* Tlačítko exportu (Černobílé) */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-98"
        >
          {isExporting ? (
            <span>Sestavuji filmové PDF...</span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Stáhnout filmové PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
