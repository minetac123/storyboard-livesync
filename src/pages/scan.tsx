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

  // Připojení přes univerzální synchronizaci (WebRTC + WebSocket)
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
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white' : 'bg-zinc-600 animate-pulse'}`} />
            <span className="text-zinc-300 font-medium">
              {isConnected ? 'Spojeno s PC' : 'Připojuji...'}
            </span>
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
              <h2 className="text-base font-bold mb-1">Připojování k místnosti</h2>
              <p className="text-xs text-zinc-400 max-w-xs">
                Načítám parametry...
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
