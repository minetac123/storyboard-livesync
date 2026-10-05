import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ScannerEngine } from '../components/ScannerEngine';
import { syncService } from '../utils/syncService';
import { Smartphone } from 'lucide-react';

export default function MobileScanPage() {
  const router = useRouter();
  const { room, panel } = router.query;

  const [roomId, setRoomId] = useState<string>('');
  const [panelId, setPanelId] = useState<string>('panel-1');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const [customRoomInput, setCustomRoomInput] = useState<string>('');

  useEffect(() => {
    // 1. Okamžité načtení z window.location.search (funguje spolehlivě v Next.js static exportu bez zpoždění)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      const p = params.get('panel');
      if (r) setRoomId(r);
      if (p) setPanelId(p);
    }
  }, []);

  useEffect(() => {
    if (router.isReady) {
      if (room && typeof room === 'string') {
        setRoomId(room);
      }
      if (panel && typeof panel === 'string') {
        setPanelId(panel);
      }
    }
  }, [router.isReady, room, panel]);

  // Připojení přes univerzální synchronizaci (MQTT WebSocket + WebRTC)
  useEffect(() => {
    if (!roomId) return;

    syncService.initMobile(roomId, (connected) => {
      setIsConnected(connected);
    });

    return () => {
      syncService.cleanup();
    };
  }, [roomId]);

  const handleSendSketch = async (targetPanel: string, imageData: string): Promise<boolean> => {
    return await syncService.sendSketch(targetPanel, imageData);
  };

  return (
    <>
      <Head>
        <title>Mobilní skener | Storyboard LiveSync</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <main className="fixed inset-0 bg-black flex flex-col overflow-hidden">
        {/* Lišta stavu připojení v černobílém stylu */}
        <div className="bg-black border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs text-white z-20">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-white" />
            <span className="font-semibold text-white">Mobilní skener</span>
            <span className="font-mono text-[11px] text-zinc-500">POKOJ: {roomId || '...'}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white shadow-[0_0_6px_white]' : 'bg-zinc-600 animate-pulse'}`} />
            <span className="text-zinc-300 font-medium">
              {isConnected ? 'Spojeno s PC' : 'Připojuji...'}
            </span>
            {!isConnected && (
              <button
                onClick={() => syncService.retryConnection()}
                className="ml-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] active:scale-95 transition-all"
                title="Obnovit spojení"
              >
                Obnovit
              </button>
            )}
          </div>
        </div>

        {/* Skener */}
        <div className="flex-1 relative overflow-hidden">
          {roomId ? (
            <ScannerEngine
              roomId={roomId}
              initialPanelId={panelId}
              onSendSketch={handleSendSketch}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-white">
              <Smartphone className="w-10 h-10 text-white mb-3" />
              <h2 className="text-base font-bold mb-1">Zadejte kód místnosti</h2>
              <p className="text-xs text-zinc-400 max-w-xs mb-4">
                Kód místnosti najdete v záhlaví monitoru na počítači (např. sb-abc12).
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customRoomInput.trim()) {
                    setRoomId(customRoomInput.trim());
                  }
                }}
                className="flex items-center gap-2 max-w-xs w-full"
              >
                <input
                  type="text"
                  placeholder="Kód pokoje"
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs font-mono uppercase"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black font-bold text-xs rounded-lg hover:bg-zinc-200"
                >
                  Spojit
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
