import React from 'react';
import { X, Smartphone, Sparkles } from 'lucide-react';
import { ScannerEngine } from './ScannerEngine';

interface MobileSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  initialPanelId: string;
  onSendSketch: (panelId: string, imageData: string) => Promise<boolean>;
}

export const MobileSimulatorModal: React.FC<MobileSimulatorModalProps> = ({
  isOpen,
  onClose,
  roomId,
  initialPanelId,
  onSendSketch
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      {/* Smartphone Hardware Frame Mockup */}
      <div className="relative w-full max-w-[400px] h-[85vh] max-h-[820px] bg-studio-950 rounded-[44px] border-[10px] border-studio-800 shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-studio-900 ml-auto mr-3 border border-studio-800" />
        </div>

        {/* Close Button on simulator */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 z-40 p-1.5 rounded-full bg-black/60 text-studio-400 hover:text-white transition-colors"
          title="Exit Simulator"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Simulator Device Status Bar */}
        <div className="pt-2 px-6 pb-1 bg-studio-950 flex items-center justify-between text-[11px] text-studio-400 font-mono select-none z-30">
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Scanner Body */}
        <div className="flex-1 relative overflow-hidden">
          <ScannerEngine
            roomId={roomId}
            initialPanelId={initialPanelId}
            onSendSketch={onSendSketch}
            onClose={onClose}
            isSimulator={true}
          />
        </div>

        {/* Smartphone Home Bar indicator */}
        <div className="py-2 bg-studio-950 flex justify-center z-30">
          <div className="w-32 h-1 bg-studio-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
