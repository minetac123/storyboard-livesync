import React, { useState } from 'react';
import { X, Download, Sparkles } from 'lucide-react';
import { StoryboardPanel, FilterSettings } from '../types/storyboard';
import { applySketchEnhancement } from '../utils/imageProcessing';

interface ImageLightboxModalProps {
  panel: StoryboardPanel | null;
  onClose: () => void;
  onUpdateImage: (panelId: string, newImageData: string) => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  panel,
  onClose,
  onUpdateImage
}) => {
  if (!panel || !panel.imageUrl) return null;

  const [filterMode, setFilterMode] = useState<FilterSettings['mode']>('contrast-boost');
  const [contrast, setContrast] = useState<number>(100);
  const [brightness, setBrightness] = useState<number>(0);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyFilter = () => {
    setIsApplying(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        applySketchEnhancement(canvas, {
          mode: filterMode,
          contrast,
          brightness
        });
        const enhancedData = canvas.toDataURL('image/jpeg', 0.92);
        onUpdateImage(panel.id, enhancedData);
        setIsApplying(false);
      }
    };
    img.src = panel.imageUrl!;
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = panel.imageUrl!;
    a.download = `Zaber_${panel.order}_Scena_${panel.scene}_Zaber_${panel.shot}.jpg`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Záhlaví */}
        <div className="bg-studio-950 px-6 py-4 border-b border-studio-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <span className="font-mono text-amber-400">ZÁBĚR #{panel.order}</span>
              <span className="text-studio-500">|</span>
              <span className="text-slate-200">Scéna {panel.scene} / Záběr {panel.shot}</span>
            </h3>
            <p className="text-xs text-studio-400 mt-0.5">
              {panel.cameraType} • {panel.cameraMovement}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-studio-800 hover:bg-studio-700 text-slate-200 hover:text-white transition-colors"
              title="Stáhnout obrázek (16:9)"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Velký náhled */}
        <div className="flex-1 bg-black flex items-center justify-center p-6 overflow-hidden relative">
          <img
            src={panel.imageUrl}
            alt={`Záběr ${panel.order}`}
            className="max-h-[58vh] max-w-full object-contain rounded-lg border border-studio-800 shadow-2xl select-none"
          />
        </div>

        {/* Lišta úprav */}
        <div className="bg-studio-950 p-4 border-t border-studio-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-studio-400 font-semibold uppercase text-[10px] tracking-wider">
              Styl:
            </span>
            {(['contrast-boost', 'bw-ink', 'grayscale', 'original'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterMode === mode
                    ? 'bg-amber-500 text-studio-950 font-bold'
                    : 'bg-studio-900 text-studio-300 hover:bg-studio-800'
                }`}
              >
                {mode === 'contrast-boost' && '✏️ Zvýraznit tužku'}
                {mode === 'bw-ink' && '🖋️ Inkoust'}
                {mode === 'grayscale' && '🔘 Černobílá'}
                {mode === 'original' && '🎨 Původní'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-studio-400 text-[11px]">Kontrast:</span>
              <input
                type="range"
                min="50"
                max="180"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-20 accent-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-studio-400 text-[11px]">Jas:</span>
              <input
                type="range"
                min="-40"
                max="40"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-20 accent-amber-500"
              />
            </div>

            <button
              onClick={handleApplyFilter}
              disabled={isApplying}
              className="px-3.5 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-amber-400 border border-studio-700 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Uložit úpravu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
