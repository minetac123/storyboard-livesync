import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Send, 
  Check, 
  Sparkles, 
  RotateCcw, 
  Upload, 
  ChevronRight,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Point, QuadCorners, FilterSettings } from '../types/storyboard';
import { 
  detectStoryboardFrame, 
  warpPerspectiveCanvas, 
  applySketchEnhancement,
  getDefault16x9Corners 
} from '../utils/imageProcessing';
import { sound } from '../utils/sound';

interface ScannerEngineProps {
  roomId: string;
  initialPanelId: string;
  onSendSketch: (panelId: string, imageData: string) => Promise<boolean>;
  onClose?: () => void;
  isSimulator?: boolean;
}

type ScanStep = 'camera' | 'crop' | 'filter' | 'success';

export const ScannerEngine: React.FC<ScannerEngineProps> = ({
  roomId,
  initialPanelId,
  onSendSketch,
  onClose,
  isSimulator = false
}) => {
  const [step, setStep] = useState<ScanStep>('camera');
  const [currentPanelId, setCurrentPanelId] = useState<string>(initialPanelId);

  // Reference pro video a stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLiveStreamSupported, setIsLiveStreamSupported] = useState(true);

  // Zachycený snímek
  const [capturedImage, setCapturedImage] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // 4 rohy pro perspektivní ořez
  const [corners, setCorners] = useState<QuadCorners | null>(null);
  const [activeCorner, setActiveCorner] = useState<keyof QuadCorners | null>(null);

  // Oříznuté a upravené plátno
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [finalDataUrl, setFinalDataUrl] = useState<string>('');

  // Jednoduché filtry pro kresbu
  const [filterMode, setFilterMode] = useState<'contrast-boost' | 'bw-ink' | 'original'>('contrast-boost');
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Spuštění živého náhledu kamery (pokud prohlížeč dovolí)
  const startCamera = useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsLiveStreamSupported(false);
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        setIsLiveStreamSupported(true);
      }
    } catch (err) {
      console.warn('Živý video stream nedostupný (např. HTTP omezení v mobilním prohlížeči):', err);
      setIsLiveStreamSupported(false);
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Vyfocení ze živého videa
  const handleShutter = () => {
    sound.playShutterClick();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40]);
    }

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const v = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);
        loadCapturedData(canvas.toDataURL('image/jpeg', 0.95));
      }
    }
  };

  // Načtení fotky z nativního fotoaparátu mobilu nebo souboru
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          loadCapturedData(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadCapturedData = (dataUrl: string) => {
    stopCamera();
    const img = new Image();
    img.onload = async () => {
      setCapturedImage(img);
      setImageDimensions({ width: img.width, height: img.height });
      const detected = await detectStoryboardFrame(img);
      setCorners(detected);
      setStep('crop');
    };
    img.src = dataUrl;
  };

  // Automatické vyhledání rohů
  const handleAutoDetect = async () => {
    if (capturedImage) {
      const detected = await detectStoryboardFrame(capturedImage);
      setCorners(detected);
    }
  };

  // Reset rohů do středu 16:9
  const handleResetCorners = () => {
    if (imageDimensions.width > 0) {
      setCorners(getDefault16x9Corners(imageDimensions.width, imageDimensions.height));
    }
  };

  // Posun rohu prstem / myší
  const handleCornerDrag = (e: React.MouseEvent | React.TouchEvent, cornerKey: keyof QuadCorners) => {
    e.preventDefault();
    setActiveCorner(cornerKey);

    const container = cropContainerRef.current;
    if (!container || !capturedImage) return;

    const rect = container.getBoundingClientRect();
    const scaleX = imageDimensions.width / rect.width;
    const scaleY = imageDimensions.height / rect.height;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ('touches' in moveEvent && moveEvent.touches.length > 0) {
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else if ('clientX' in moveEvent) {
        clientX = moveEvent.clientX;
        clientY = moveEvent.clientY;
      }

      const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));

      setCorners(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [cornerKey]: { x: Math.round(relX * scaleX), y: Math.round(relY * scaleY) }
        };
      });
    };

    const onEnd = () => {
      setActiveCorner(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  // Ořez a perspektivní narovnání
  const handlePerformWarp = () => {
    if (!capturedImage || !corners) return;
    try {
      const warped = warpPerspectiveCanvas(capturedImage, corners, 1280, 720);
      setWarpedCanvas(warped);

      const copy = document.createElement('canvas');
      copy.width = warped.width;
      copy.height = warped.height;
      const ctx = copy.getContext('2d')!;
      ctx.drawImage(warped, 0, 0);

      applySketchEnhancement(copy, {
        mode: filterMode === 'original' ? 'original' : (filterMode === 'bw-ink' ? 'bw-ink' : 'contrast-boost'),
        contrast: 110,
        brightness: 5
      });

      setFinalDataUrl(copy.toDataURL('image/jpeg', 0.92));
      setStep('filter');
    } catch (err) {
      console.error('Chyba ořezu:', err);
    }
  };

  // Přepnutí filtru
  const handleFilterChange = (mode: 'contrast-boost' | 'bw-ink' | 'original') => {
    setFilterMode(mode);
    if (warpedCanvas) {
      const copy = document.createElement('canvas');
      copy.width = warpedCanvas.width;
      copy.height = warpedCanvas.height;
      const ctx = copy.getContext('2d')!;
      ctx.drawImage(warpedCanvas, 0, 0);

      applySketchEnhancement(copy, {
        mode: mode === 'original' ? 'original' : (mode === 'bw-ink' ? 'bw-ink' : 'contrast-boost'),
        contrast: 110,
        brightness: 5
      });
      setFinalDataUrl(copy.toDataURL('image/jpeg', 0.92));
    }
  };

  // Odeslání do PC
  const handleSendToPc = async () => {
    if (!finalDataUrl) return;
    setIsSending(true);
    try {
      const success = await onSendSketch(currentPanelId, finalDataUrl);
      setIsSending(false);
      if (success) {
        sound.playSuccessPing();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
        setStep('success');
      }
    } catch (e) {
      setIsSending(false);
      console.error('Chyba odeslání:', e);
    }
  };

  // Posun na další záběr
  const handleNextPanel = () => {
    const match = currentPanelId.match(/(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      const nextId = currentPanelId.replace(/\d+$/, nextNum.toString());
      setCurrentPanelId(nextId);
    }
    setCapturedImage(null);
    setCorners(null);
    setWarpedCanvas(null);
    setFinalDataUrl('');
    setStep('camera');
    startCamera();
  };

  return (
    <div className="flex flex-col h-full bg-studio-950 text-white relative select-none">
      {/* Skrytý vstup pro nativní fotoaparát mobilu */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />
      {/* Skrytý vstup pro výběr z galerie */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* --- KROK 1: Vyfotit --- */}
      {step === 'camera' && (
        <div className="flex-1 flex flex-col justify-between relative overflow-hidden">
          {/* Horní lišta s číslem záběru */}
          <div className="z-10 bg-studio-950/90 px-4 py-3 flex items-center justify-between border-b border-studio-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-studio-400">ZÁBĚR:</span>
              <span className="font-bold text-amber-300 text-sm font-mono">
                {currentPanelId.toUpperCase()}
              </span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-studio-900 border border-studio-800 text-studio-300 text-xs flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Galerie</span>
            </button>
          </div>

          {/* Hledáček kamery */}
          <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden p-4">
            {isLiveStreamSupported && isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* 16:9 Vodící rámeček */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                  <div className="w-full max-w-md aspect-video border-2 border-dashed border-amber-400/80 rounded-xl relative shadow-2xl">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400" />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[11px] font-mono tracking-widest text-amber-300 bg-black/70 px-2 py-0.5 rounded">
                        ZAMĚŘTE RÁMEČEK 16:9
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Pokud mobilní prohlížeč nepovolí přímé webové video, nabídneme okamžité nativní fotoaparát tlačítko */
              <div className="flex flex-col items-center justify-center text-center p-6 max-w-xs space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
                  <Camera className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Vyfoťte kresbu z papíru
                  </h3>
                  <p className="text-xs text-studio-400 leading-relaxed">
                    Klepnutím níže se otevře fotoaparát telefonu pro vyfocení kresby ve vysokém rozlišení.
                  </p>
                </div>
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-studio-950 font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5" />
                  <span>Otevřít fotoaparát</span>
                </button>
              </div>
            )}
          </div>

          {/* Spodní spoušť (pokud běží živé video) */}
          {isLiveStreamSupported && isCameraActive && (
            <div className="z-10 bg-studio-950/90 p-6 flex items-center justify-around border-t border-studio-800">
              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                className="p-3 rounded-full bg-studio-900 border border-studio-800 text-studio-300"
                title="Fotoaparát mobilu"
              >
                <Camera className="w-5 h-5" />
              </button>

              <button
                onClick={handleShutter}
                className="w-18 h-18 rounded-full border-4 border-white/80 p-1.5 flex items-center justify-center transition-transform active:scale-90"
              >
                <div className="w-14 h-14 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-full bg-studio-900 border border-studio-800 text-studio-300"
                title="Galerie"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- KROK 2: Ořez a narovnání --- */}
      {step === 'crop' && capturedImage && corners && (
        <div className="flex-1 flex flex-col justify-between relative bg-black">
          <div className="bg-studio-950/90 px-4 py-3 flex items-center justify-between border-b border-studio-800 text-xs">
            <span className="font-semibold text-amber-300">
              📐 Upravte 4 rohy kresby
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoDetect}
                className="px-2 py-1 rounded-lg bg-studio-900 border border-studio-700 text-studio-300 flex items-center gap-1 text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Auto</span>
              </button>
              <button
                onClick={handleResetCorners}
                className="px-2 py-1 rounded-lg bg-studio-900 border border-studio-700 text-studio-400 text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center p-3 overflow-hidden">
            <div
              ref={cropContainerRef}
              className="relative max-w-full max-h-[65vh] select-none"
              style={{
                aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`
              }}
            >
              <img
                src={capturedImage.src}
                alt="Vyfocená skica"
                className="w-full h-full object-contain pointer-events-none rounded-lg"
              />

              {cropContainerRef.current && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  {(() => {
                    const rect = cropContainerRef.current.getBoundingClientRect();
                    const scaleX = rect.width / imageDimensions.width;
                    const scaleY = rect.height / imageDimensions.height;

                    const p1 = { x: corners.topLeft.x * scaleX, y: corners.topLeft.y * scaleY };
                    const p2 = { x: corners.topRight.x * scaleX, y: corners.topRight.y * scaleY };
                    const p3 = { x: corners.bottomRight.x * scaleX, y: corners.bottomRight.y * scaleY };
                    const p4 = { x: corners.bottomLeft.x * scaleX, y: corners.bottomLeft.y * scaleY };

                    return (
                      <polygon
                        points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                        fill="rgba(245, 158, 11, 0.2)"
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeDasharray="4 2"
                      />
                    );
                  })()}
                </svg>
              )}

              {cropContainerRef.current &&
                (['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((key) => {
                  const rect = cropContainerRef.current!.getBoundingClientRect();
                  const scaleX = rect.width / imageDimensions.width;
                  const scaleY = rect.height / imageDimensions.height;

                  const pt = corners[key];
                  const posX = pt.x * scaleX;
                  const posY = pt.y * scaleY;
                  const isActive = activeCorner === key;

                  return (
                    <div
                      key={key}
                      onMouseDown={(e) => handleCornerDrag(e, key)}
                      onTouchStart={(e) => handleCornerDrag(e, key)}
                      style={{
                        transform: `translate(${posX - 18}px, ${posY - 18}px)`
                      }}
                      className={`corner-handle absolute top-0 left-0 w-9 h-9 rounded-full flex items-center justify-center z-30 transition-transform ${
                        isActive
                          ? 'scale-125 bg-amber-400 ring-4 ring-amber-400/40 shadow-xl'
                          : 'bg-amber-500 shadow-md ring-2 ring-white'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-studio-950" />
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-studio-950/95 p-4 border-t border-studio-800 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setStep('camera');
                startCamera();
              }}
              className="px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-300 text-xs font-semibold"
            >
              Znovu
            </button>

            <button
              onClick={handlePerformWarp}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-studio-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>Oříznout do 16:9</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- KROK 3: Úprava a odeslání --- */}
      {step === 'filter' && finalDataUrl && (
        <div className="flex-1 flex flex-col justify-between relative bg-black">
          <div className="bg-studio-950/90 px-4 py-3 flex items-center justify-between border-b border-studio-800 text-xs">
            <span className="font-semibold text-slate-200">
              Náhled výsledné skici (16:9)
            </span>
            <button
              onClick={() => setStep('crop')}
              className="text-amber-400 hover:underline"
            >
              Upravit ořez
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-lg aspect-video rounded-xl overflow-hidden border border-studio-800 shadow-2xl bg-studio-950">
              <img
                src={finalDataUrl}
                alt="Oříznutá skica"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-studio-950/95 p-4 border-t border-studio-800 space-y-4">
            {/* Jednoduchá volba stylu */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => handleFilterChange('contrast-boost')}
                className={`py-2 rounded-xl font-medium text-center ${
                  filterMode === 'contrast-boost'
                    ? 'bg-amber-500 text-studio-950 font-bold'
                    : 'bg-studio-900 text-studio-300 border border-studio-800'
                }`}
              >
                ✏️ Zvýraznit tužku
              </button>
              <button
                onClick={() => handleFilterChange('bw-ink')}
                className={`py-2 rounded-xl font-medium text-center ${
                  filterMode === 'bw-ink'
                    ? 'bg-amber-500 text-studio-950 font-bold'
                    : 'bg-studio-900 text-studio-300 border border-studio-800'
                }`}
              >
                🖋️ Černobílý inkoust
              </button>
              <button
                onClick={() => handleFilterChange('original')}
                className={`py-2 rounded-xl font-medium text-center ${
                  filterMode === 'original'
                    ? 'bg-amber-500 text-studio-950 font-bold'
                    : 'bg-studio-900 text-studio-300 border border-studio-800'
                }`}
              >
                🎨 Původní barvy
              </button>
            </div>

            {/* Velké tlačítko Odeslat */}
            <button
              onClick={handleSendToPc}
              disabled={isSending}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-studio-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSending ? (
                <span>Odesílám do počítače...</span>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Odeslat do PC ({currentPanelId.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- KROK 4: Úspěšně odesláno --- */}
      {step === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-studio-950">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Odesláno na počítač!
          </h2>
          <p className="text-xs text-studio-300 max-w-xs mb-8">
            Skica byla automaticky narovnána do 16:9 a ihned se zobrazila v záběru {currentPanelId.toUpperCase()} na monitoru.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={handleNextPanel}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-studio-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <span>Skenovat další záběr</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setStep('camera');
                startCamera();
              }}
              className="w-full py-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-300 text-xs font-semibold"
            >
              Vyfotit tento záběr znovu
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="w-full py-2 text-studio-500 text-xs"
              >
                Zavřít skener
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
