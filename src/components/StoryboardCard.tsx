import React, { useState, useRef } from 'react';
import { 
  Smartphone, 
  Trash2, 
  Copy, 
  ArrowLeft, 
  ArrowRight, 
  Maximize2, 
  Sliders, 
  Upload, 
  RefreshCw
} from 'lucide-react';
import { StoryboardPanel } from '../types/storyboard';
import { CAMERA_TYPES, CAMERA_MOVEMENTS } from '../utils/sampleData';

interface StoryboardCardProps {
  panel: StoryboardPanel;
  onUpdate: (updatedPanel: StoryboardPanel) => void;
  onDelete: (id: string) => void;
  onDuplicate: (panel: StoryboardPanel) => void;
  onMove: (id: string, direction: 'left' | 'right') => void;
  onOpenLightbox: (panel: StoryboardPanel) => void;
  onOpenQR: (panelId: string) => void;
  onOpenFilter: (panel: StoryboardPanel) => void;
  isFlashing?: boolean;
}

export const StoryboardCard: React.FC<StoryboardCardProps> = ({
  panel,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
  onOpenLightbox,
  onOpenQR,
  onOpenFilter,
  isFlashing = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdate({
            ...panel,
            imageUrl: event.target.result as string,
            updatedAt: Date.now()
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className={`group relative bg-zinc-950 border rounded-xl overflow-hidden transition-all duration-300 flex flex-col ${
        isFlashing
          ? 'border-white ring-4 ring-white/60 shadow-2xl scale-[1.01]'
          : 'border-zinc-850 hover:border-zinc-700'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleManualUpload}
        className="hidden"
      />

      {/* Záhlaví záběru */}
      <div className="bg-black px-3 py-2 border-b border-zinc-850 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold bg-white text-black px-2 py-0.5 rounded text-[11px]">
            #{panel.order}
          </span>
          <div className="flex items-center gap-1 font-semibold text-zinc-300 text-xs">
            <span>SCÉNA</span>
            <input
              type="text"
              value={panel.scene}
              placeholder="1"
              onChange={(e) => onUpdate({ ...panel, scene: e.target.value })}
              className="w-8 bg-zinc-900 border border-zinc-800 rounded px-1 text-center text-white focus:outline-none focus:border-white"
            />
            <span className="text-zinc-600">/</span>
            <span>ZÁBĚR</span>
            <input
              type="text"
              value={panel.shot}
              placeholder="1"
              onChange={(e) => onUpdate({ ...panel, shot: e.target.value })}
              className="w-8 bg-zinc-900 border border-zinc-800 rounded px-1 text-center text-white focus:outline-none focus:border-white"
            />
          </div>
        </div>

        {/* Nástroje */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(panel.id, 'left')}
            className="p-1 text-zinc-400 hover:text-white rounded"
            title="Doleva"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(panel.id, 'right')}
            className="p-1 text-zinc-400 hover:text-white rounded"
            title="Doprava"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicate(panel)}
            className="p-1 text-zinc-400 hover:text-white rounded"
            title="Duplikovat"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(panel.id)}
            className="p-1 text-zinc-400 hover:text-white rounded"
            title="Smazat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rámeček 16:9 */}
      <div 
        className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden border-b border-zinc-850"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {panel.imageUrl ? (
          <>
            <img
              src={panel.imageUrl}
              alt={`Záběr ${panel.order}`}
              className="w-full h-full object-cover select-none"
            />
            <div className="absolute top-2 left-2 pointer-events-none">
              <span className="text-[10px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded border border-white/20">
                16:9
              </span>
            </div>

            {panel.capturedViaMobile && (
              <div className="absolute bottom-2 left-2 pointer-events-none">
                <span className="text-[10px] font-medium bg-black/90 border border-white/30 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  Z mobilu
                </span>
              </div>
            )}

            {/* Tlačítka při najetí */}
            <div
              className={`absolute inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center gap-2 transition-opacity ${
                isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <button
                onClick={() => onOpenLightbox(panel)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 shadow-lg"
                title="Zvětšit detail"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenFilter(panel)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 shadow-lg"
                title="Upravit kontrast tužky"
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenQR(panel.id)}
                className="p-2 rounded-lg bg-white hover:bg-zinc-200 text-black shadow-lg font-bold flex items-center gap-1 text-xs px-2.5"
                title="Pře-fotit mobilem"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Pře-fotit</span>
              </button>
            </div>
          </>
        ) : (
          /* Prázdný rámeček bez předvyplněných kresbiček */
          <div className="flex flex-col items-center justify-center p-4 text-center w-full h-full border-2 border-dashed border-zinc-850 hover:border-zinc-700 transition-colors">
            <p className="text-xs font-semibold text-zinc-300 mb-1">
              Prázdné pole (16:9)
            </p>
            <p className="text-[11px] text-zinc-500 mb-3">
              Vyfoťte mobilem nebo nahrajte obrázek
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenQR(panel.id)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Skenovat mobilem</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-800"
                title="Nahrát soubor"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nahrát</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulářová pole (prázdná bez dummy textu) */}
      <div className="p-3 flex flex-col gap-2.5 text-xs flex-grow">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
              Velikost záběru
            </label>
            <select
              value={panel.cameraType}
              onChange={(e) => onUpdate({ ...panel, cameraType: e.target.value })}
              className="w-full bg-black border border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-white"
            >
              <option value="">(Nevybráno)</option>
              {CAMERA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
              Pohyb kamery
            </label>
            <select
              value={panel.cameraMovement}
              onChange={(e) => onUpdate({ ...panel, cameraMovement: e.target.value })}
              className="w-full bg-black border border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-white"
            >
              <option value="">(Nevybráno)</option>
              {CAMERA_MOVEMENTS.map((mov) => (
                <option key={mov} value={mov}>
                  {mov}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Popis děje */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
            Akce a děj
          </label>
          <textarea
            rows={2}
            value={panel.action}
            onChange={(e) => onUpdate({ ...panel, action: e.target.value })}
            placeholder="Popis akce a děje v záběru..."
            className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-white resize-none placeholder:text-zinc-650"
          />
        </div>

        {/* Dialog / Zvuk */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
            Dialog / Zvuk
          </label>
          <textarea
            rows={2}
            value={panel.dialogue}
            onChange={(e) => onUpdate({ ...panel, dialogue: e.target.value })}
            placeholder="Dialog postav, hudební motiv, ruchy..."
            className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-white resize-none font-mono placeholder:text-zinc-650"
          />
        </div>
      </div>
    </div>
  );
};
