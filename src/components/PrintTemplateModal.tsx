import React, { useState, useEffect } from 'react';
import { Printer, X, Download, FileText, QrCode } from 'lucide-react';
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
  const [lanUrl, setLanUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [panelsPerPage, setPanelsPerPage] = useState<number>(6);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/network-info')
        .then(res => res.json())
        .then(data => {
          if (data.lanUrl) setLanUrl(data.lanUrl);
        })
        .catch(() => {
          if (typeof window !== 'undefined') setLanUrl(window.location.origin);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const baseUrl = lanUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      await generatePrintableStoryboardTemplate({
        projectTitle: project.title,
        director: project.director,
        roomId,
        baseUrl,
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-studio-400 hover:text-white rounded-full hover:bg-studio-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Kreslicí šablony na papír (A4)</h2>
            <p className="text-xs text-studio-400">
              Vytiskněte si listy na papír, nakreslete skici a naskenujte je mobilem
            </p>
          </div>
        </div>

        {/* 3 hlavní body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5 text-xs">
          <div className="bg-studio-950 p-3 rounded-xl border border-studio-800">
            <div className="text-cyan-400 font-bold mb-1">16:9 rámečky</div>
            <p className="text-studio-400 text-[11px]">
              Černé rohové značky pro přesný automatický ořez mobilem.
            </p>
          </div>

          <div className="bg-studio-950 p-3 rounded-xl border border-studio-800">
            <div className="text-amber-400 font-bold mb-1 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              QR kód
            </div>
            <p className="text-studio-400 text-[11px]">
              Každý záběr má vlastní QR pro okamžité odeslání do správného políčka.
            </p>
          </div>

          <div className="bg-studio-950 p-3 rounded-xl border border-studio-800">
            <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Řádky pro poznámky
            </div>
            <p className="text-studio-400 text-[11px]">
              Místo na popis akce, kamery a dialogů.
            </p>
          </div>
        </div>

        {/* Nastavení tisku */}
        <div className="bg-studio-950 p-4 rounded-xl border border-studio-800 space-y-3 mb-6 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-studio-300 font-medium">Počet záběrů na stránku:</span>
            <select
              value={panelsPerPage}
              onChange={(e) => setPanelsPerPage(Number(e.target.value))}
              className="bg-studio-900 border border-studio-700 rounded-lg px-3 py-1.5 text-white"
            >
              <option value={6}>6 záběrů na list A4 (2 sloupce × 3 řádky)</option>
              <option value={4}>4 záběry na list A4 (Větší kreslicí plocha)</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-studio-400 pt-2 border-t border-studio-850">
            <span>Celkem záběrů v projektu:</span>
            <span className="font-bold text-slate-200">{project.panels.length}</span>
          </div>

          <div className="flex items-center justify-between text-studio-400">
            <span>Počet stránek k vytištění:</span>
            <span className="font-bold text-slate-200">{totalPages} {totalPages === 1 ? 'stránka' : (totalPages < 5 ? 'stránky' : 'stránek')}</span>
          </div>
        </div>

        {/* Tlačítko Stáhnout */}
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-studio-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <span>Generuji PDF s QR kódy...</span>
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
