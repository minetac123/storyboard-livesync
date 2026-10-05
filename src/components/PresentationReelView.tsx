import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Pause, Film } from 'lucide-react';
import { StoryboardProject } from '../types/storyboard';

interface PresentationReelViewProps {
  project: StoryboardProject;
  onClose: () => void;
}

export const PresentationReelView: React.FC<PresentationReelViewProps> = ({
  project,
  onClose
}) => {
  const panels = project.panels;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentPanel = panels[currentIndex] || panels[0];

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % panels.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + panels.length) % panels.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panels.length]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        goNext();
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentIndex]);

  if (!currentPanel) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between text-white select-none">
      {/* Horní lišta prezentace */}
      <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-white">{project.title}</span>
            <span className="text-xs text-studio-400 ml-2">Režie: {project.director}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono bg-studio-900/80 px-3 py-1.5 rounded-full border border-studio-800 text-amber-400">
            ZÁBĚR {currentIndex + 1} / {panels.length}
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-full border transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-studio-950 border-amber-400'
                : 'bg-studio-900/80 text-white border-studio-700 hover:bg-studio-800'
            }`}
            title={isPlaying ? 'Pozastavit' : 'Přehrávat automaticky'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-studio-900/80 hover:bg-studio-800 text-studio-300 hover:text-white border border-studio-700 transition-colors"
            title="Ukončit prezentaci (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hlavní plátno */}
      <div className="flex-1 flex items-center justify-center relative p-6">
        <button
          onClick={goPrev}
          className="absolute left-6 z-20 p-4 rounded-full bg-studio-900/60 hover:bg-studio-800 text-white border border-white/10 backdrop-blur-sm"
          title="Předchozí záběr (Šipka doleva)"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={goNext}
          className="absolute right-6 z-20 p-4 rounded-full bg-studio-900/60 hover:bg-studio-800 text-white border border-white/10 backdrop-blur-sm"
          title="Další záběr (Šipka doprava / Mezerník)"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        <div className="w-full max-w-5xl aspect-video bg-studio-950 rounded-2xl overflow-hidden border border-studio-800 shadow-2xl flex items-center justify-center relative">
          {currentPanel.imageUrl ? (
            <img
              src={currentPanel.imageUrl}
              alt={`Záběr ${currentPanel.order}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-8 text-studio-500">
              <p className="font-semibold text-lg">Záběr #{currentPanel.order}</p>
              <p className="text-sm">Čeká na nakreslení</p>
            </div>
          )}

          <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-amber-300">
            {currentPanel.cameraType} • {currentPanel.cameraMovement}
          </div>
        </div>
      </div>

      {/* Spodní titulky prezentace */}
      <div className="bg-gradient-to-t from-black via-black/95 to-transparent px-8 py-6 z-10">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <div className="text-xs uppercase tracking-widest font-mono text-amber-400/80">
            SCÉNA {currentPanel.scene}  /  ZÁBĚR {currentPanel.shot}
          </div>
          {currentPanel.action && (
            <p className="text-base text-slate-200 font-sans leading-relaxed">
              {currentPanel.action}
            </p>
          )}
          {currentPanel.dialogue && (
            <p className="text-sm text-amber-200 font-mono italic">
              "{currentPanel.dialogue}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
