import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X, Copy, Check, ExternalLink, QrCode, Globe } from 'lucide-react';
import { StoryboardPanel } from '../types/storyboard';

import { getMobileScanUrl } from '../utils/urlHelper';

interface PhoneConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  panels: StoryboardPanel[];
  selectedPanelId?: string;
  onOpenSimulator: (panelId: string) => void;
}

export const PhoneConnectModal: React.FC<PhoneConnectModalProps> = ({
  isOpen,
  onClose,
  roomId,
  panels,
  selectedPanelId,
  onOpenSimulator
}) => {
  const [targetPanelId, setTargetPanelId] = useState<string>(selectedPanelId || panels[0]?.id || 'panel-1');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedPanelId) {
      setTargetPanelId(selectedPanelId);
    }
  }, [selectedPanelId]);

  const scanUrl = getMobileScanUrl(roomId, targetPanelId);

  useEffect(() => {
    if (isOpen && scanUrl) {
      QRCode.toDataURL(scanUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [isOpen, scanUrl]);

  if (!isOpen) return null;

  const copyUrl = () => {
    navigator.clipboard.writeText(scanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-black border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hlavička */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Připojit fotoaparát mobilu</h2>
            <p className="text-xs text-zinc-400">
              Veřejná doména GitHub Pages – funguje na jakémkoli telefonu
            </p>
          </div>
        </div>

        {/* Indikátor veřejné GitHub domény */}
        <div className="mb-4 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Globe className="w-3.5 h-3.5 text-white" />
            <span className="font-semibold text-white">GitHub Pages (HTTPS)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Záběr:</span>
            <select
              value={targetPanelId}
              onChange={(e) => setTargetPanelId(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-white font-medium focus:outline-none focus:border-white text-xs"
            >
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.order}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* QR kód */}
        <div className="flex flex-col items-center justify-center p-5 bg-white rounded-xl mb-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR kód pro telefon"
              className="w-56 h-56 rounded-md select-none"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-zinc-400">
              <QrCode className="w-12 h-12 animate-pulse" />
            </div>
          )}
          <p className="mt-2 text-[10px] font-mono tracking-wider text-black font-bold uppercase">
            Namiřte fotoaparát telefonu na tento QR kód
          </p>
        </div>

        {/* Odkaz & Kopírování */}
        <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850 mb-4 flex items-center justify-between gap-2 text-xs font-mono">
          <span className="truncate text-zinc-400 text-[11px] px-1">{scanUrl}</span>
          <button
            onClick={copyUrl}
            className="text-white hover:bg-zinc-800 px-2.5 py-1 rounded-lg bg-zinc-900 shrink-0 font-sans text-xs flex items-center gap-1 border border-zinc-800"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Zkopírováno' : 'Kopírovat'}</span>
          </button>
        </div>

        {/* Tlačítka akcí */}
        <div className="flex items-center gap-2">
          <a
            href={scanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Otevřít odkaz</span>
          </a>

          <button
            onClick={() => {
              onClose();
              onOpenSimulator(targetPanelId);
            }}
            className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Vyzkoušet v prohlížeči</span>
          </button>
        </div>
      </div>
    </div>
  );
};
