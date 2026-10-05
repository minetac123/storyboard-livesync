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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-studio-400 hover:text-white rounded-full hover:bg-studio-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Export prezentace storyboardu</h2>
            <p className="text-xs text-studio-400">
              Kompletní filmový PDF portfolio dokument pro školu, štáb a prezentaci
            </p>
          </div>
        </div>

        {/* Shrnutí projektu */}
        <div className="bg-studio-950 p-4 rounded-xl border border-studio-800 mb-5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-studio-400">Název projektu:</span>
            <span className="font-bold text-white">{project.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-studio-400">Režisér:</span>
            <span className="font-medium text-slate-200">{project.director}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-studio-400">Nakresleno:</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className={`font-bold ${panelsWithImages === totalPanels ? 'text-emerald-400' : 'text-amber-400'}`}>
                {panelsWithImages} z {totalPanels} záběrů
              </span>
              {panelsWithImages === totalPanels ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
          </div>
        </div>

        {/* Rozvržení prezentace */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-studio-400 uppercase tracking-wider mb-2">
            Rozvržení stránek
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLayout('2-per-page')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                layout === '2-per-page'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-studio-800 bg-studio-950 text-studio-400 hover:border-studio-700'
              }`}
            >
              <div className="font-bold text-xs mb-1">2 záběry na stránku</div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Velké kresby ve vysokém rozlišení s kompletními poznámkami. Ideální pro filmové školy.
              </p>
            </button>

            <button
              onClick={() => setLayout('4-per-page')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                layout === '4-per-page'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-studio-800 bg-studio-950 text-studio-400 hover:border-studio-700'
              }`}
            >
              <div className="font-bold text-xs mb-1">4 záběry na stránku</div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Kompaktní mřížka 2×2 pro rychlý přehled celé sekvence na place.
              </p>
            </button>
          </div>
        </div>

        {/* Tlačítko exportu */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-studio-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
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
