import React, { useState } from 'react';
import { Printer, X, Download, FileText } from 'lucide-react';
import { StoryboardProject } from '../types/storyboard';
import { generatePrintableStoryboardTemplate } from '../utils/templateExport';

interface PrintTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: StoryboardProject;
  roomId: string;
}

export const PrintTemplateModal: React.FC<PrintTemplateModalProps> = ({
  isOpen,
  onClose,
  project,
  roomId
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [panelsPerPage, setPanelsPerPage] = useState<number>(6);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      await generatePrintableStoryboardTemplate({
        projectTitle: project.title,
        director: project.director,
        roomId,
        panels: project.panels,
        panelsPerPage
      });
      setIsGenerating(false);
      onClose();
    } catch (err) {
      console.error('Chyba při tvorbě PDF šablony:', err);
      setIsGenerating(false);
    }
  };

  const totalPages = Math.ceil(project.panels.length / panelsPerPage);

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
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Kreslicí šablony na papír (A4)</h2>
            <p className="text-xs text-zinc-400">
              Vytiskněte si listy na tiskárně, nakreslete skici a naskenujte je fotoaparátem mobilu
            </p>
          </div>
        </div>

        {/* 3 hlavní body - černobílé */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5 text-xs">
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
            <div className="text-white font-bold mb-1">16:9 rámečky</div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Optické rohové značky pro přesný automatický ořez mobilem.
            </p>
          </div>

          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
            <div className="text-white font-bold mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Čistá plocha
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Žádné rušivé nápisy, reklamy ani QR kódy na papíře.
            </p>
          </div>

          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
            <div className="text-white font-bold mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Řádky pro text
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Plná šířka pro popis kamery, děje a dialogů.
            </p>
          </div>
        </div>

        {/* Nastavení tisku */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-3 mb-6 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-medium">Počet záběrů na stránku:</span>
            <select
              value={panelsPerPage}
              onChange={(e) => setPanelsPerPage(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-white focus:outline-none"
            >
              <option value={6}>6 záběrů na list A4 (2 sloupce × 3 řádky)</option>
              <option value={4}>4 záběry na list A4 (Větší kreslicí plocha)</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-zinc-400 pt-2 border-t border-zinc-850">
            <span>Celkem záběrů v projektu:</span>
            <span className="font-bold text-white">{project.panels.length}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-400">
            <span>Počet stránek k vytištění:</span>
            <span className="font-bold text-white">{totalPages} {totalPages === 1 ? 'stránka' : (totalPages < 5 ? 'stránky' : 'stránek')}</span>
          </div>
        </div>

        {/* Tlačítko Stáhnout (Černobílé) */}
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-98"
        >
          {isGenerating ? (
            <span>Generuji PDF šablonu...</span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Stáhnout šablonu A4 k tisku (PDF)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
