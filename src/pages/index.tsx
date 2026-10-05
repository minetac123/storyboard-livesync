import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Header } from '../components/Header';
import { StoryboardCard } from '../components/StoryboardCard';
import { PhoneConnectModal } from '../components/PhoneConnectModal';
import { PrintTemplateModal } from '../components/PrintTemplateModal';
import { ExportPdfModal } from '../components/ExportPdfModal';
import { ImageLightboxModal } from '../components/ImageLightboxModal';
import { PresentationReelView } from '../components/PresentationReelView';
import { MobileSimulatorModal } from '../components/MobileSimulatorModal';
import { StoryboardProject, StoryboardPanel } from '../types/storyboard';
import { INITIAL_PROJECT } from '../utils/sampleData';
import { sound } from '../utils/sound';
import { syncService } from '../utils/syncService';
import { saveProjectToStorage, loadProjectFromStorage } from '../utils/storageService';
import { Plus, Smartphone, Check } from 'lucide-react';

function generateRandomRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = 'POKOJ-';
  for (let i = 0; i < 4; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export default function DesktopWorkstation() {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string>('');
  const [project, setProject] = useState<StoryboardProject>(INITIAL_PROJECT);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'presentation'>('grid');

  const [connected, setConnected] = useState<boolean>(false);
  const [mobileCount, setMobileCount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modální stavy
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedPanelForQR, setSelectedPanelForQR] = useState<string>('panel-1');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorTargetPanel, setSimulatorTargetPanel] = useState<string>('panel-1');
  const [lightboxPanel, setLightboxPanel] = useState<StoryboardPanel | null>(null);

  const [flashingPanelId, setFlashingPanelId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string } | null>(null);

  useEffect(() => {
    if (router.isReady) {
      const qRoom = router.query.room;
      let finalRoom = '';
      if (qRoom && typeof qRoom === 'string') {
        finalRoom = qRoom.toUpperCase();
      } else {
        const savedRoom = typeof window !== 'undefined' ? localStorage.getItem('sb_room_v3') : null;
        finalRoom = savedRoom || generateRandomRoomId();
        router.replace(`/?room=${finalRoom}`, undefined, { shallow: true });
      }
      setRoomId(finalRoom);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sb_room_v3', finalRoom);
      }

      // Načtení projektu z IndexedDB (s neomezenou kapacitou)
      loadProjectFromStorage(finalRoom).then((saved) => {
        if (saved) {
          setProject(saved);
        }
      });
    }
  }, [router.isReady, router.query.room]);

  // Automatické ukládání (Autosave) při každé změně textu, záběru či přijetí kresby
  useEffect(() => {
    if (!roomId || !project) return;

    setIsSaving(true);
    const timer = setTimeout(async () => {
      try {
        await saveProjectToStorage(roomId, project);
      } catch (e) {
        console.warn('Autosave error:', e);
      } finally {
        setIsSaving(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [project, roomId]);

  // Okamžité uložení před zavřením okna nebo přepnutím panelu
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomId && project) {
        saveProjectToStorage(roomId, project);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, project]);

  // Univerzální synchronizace (WebRTC + WebSocket)
  useEffect(() => {
    if (!roomId) return;

    syncService.initDesktop(
      roomId,
      (targetPanelId, newImage) => {
        setProject((prev) => {
          const updatedPanels = prev.panels.map((p) => {
            if (p.id === targetPanelId) {
              return {
                ...p,
                imageUrl: newImage,
                capturedViaMobile: true,
                updatedAt: Date.now()
              };
            }
            return p;
          });
          return { ...prev, panels: updatedPanels };
        });

        sound.playSyncChime();
        setFlashingPanelId(targetPanelId);
        setTimeout(() => setFlashingPanelId(null), 3000);

        setNotification({
          message: `Kresba pro ${targetPanelId.toUpperCase()} byla úspěšně přijata!`
        });
        setTimeout(() => setNotification(null), 4000);
      },
      (connState, count) => {
        setConnected(connState);
        setMobileCount(count);
      }
    );

    return () => {
      syncService.cleanup();
    };
  }, [roomId]);

  const handleUpdatePanel = useCallback((updated: StoryboardPanel) => {
    setProject((prev) => ({
      ...prev,
      panels: prev.panels.map((p) => (p.id === updated.id ? updated : p))
    }));
  }, []);

  const handleDeletePanel = useCallback((id: string) => {
    setProject((prev) => {
      const filtered = prev.panels.filter((p) => p.id !== id);
      const reordered = filtered.map((p, idx) => ({ ...p, order: idx + 1 }));
      return { ...prev, panels: reordered };
    });
  }, []);

  const handleDuplicatePanel = useCallback((source: StoryboardPanel) => {
    setProject((prev) => {
      const newId = `panel-${Date.now().toString(36)}`;
      const newPanel: StoryboardPanel = {
        ...source,
        id: newId,
        order: prev.panels.length + 1,
        shot: `${parseInt(source.shot, 10) ? parseInt(source.shot, 10) + 1 : source.shot + 'B'}`,
        updatedAt: Date.now()
      };
      return { ...prev, panels: [...prev.panels, newPanel] };
    });
  }, []);

  const handleMovePanel = useCallback((id: string, direction: 'left' | 'right') => {
    setProject((prev) => {
      const idx = prev.panels.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      if (direction === 'left' && idx === 0) return prev;
      if (direction === 'right' && idx === prev.panels.length - 1) return prev;

      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      const copy = [...prev.panels];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;

      const reordered = copy.map((p, i) => ({ ...p, order: i + 1 }));
      return { ...prev, panels: reordered };
    });
  }, []);

  const handleAddPanel = () => {
    const newOrder = project.panels.length + 1;
    const newPanel: StoryboardPanel = {
      id: `panel-${newOrder}`,
      order: newOrder,
      scene: '1',
      shot: `${newOrder}`,
      cameraType: '',
      cameraMovement: '',
      action: '',
      dialogue: '',
      imageUrl: null,
      updatedAt: Date.now(),
      aspectRatio: '16:9'
    };
    setProject((prev) => ({
      ...prev,
      panels: [...prev.panels, newPanel]
    }));
  };

  const handleSimulatorSend = async (panelId: string, imageData: string): Promise<boolean> => {
    return await syncService.sendSketch(panelId, imageData);
  };

  return (
    <>
      <Head>
        <title>Storyboard LiveSync</title>
        <meta name="description" content="Čistý černobílý filmový storyboard s bezdrátovým snímáním kreseb z mobilu." />
      </Head>

      <div className="min-h-screen bg-black text-white flex flex-col font-sans">
        <Header
          project={project}
          setProject={setProject}
          roomId={roomId}
          connected={connected}
          mobileCount={mobileCount}
          onOpenConnectModal={() => {
            setSelectedPanelForQR(project.panels[0]?.id || 'panel-1');
            setIsConnectModalOpen(true);
          }}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenSimulatorModal={() => {
            setSimulatorTargetPanel(project.panels[0]?.id || 'panel-1');
            setIsSimulatorOpen(true);
          }}
          onAddPanel={handleAddPanel}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isSaving={isSaving}
        />

        {/* Notifikace o přijetí */}
        {notification && (
          <div className="fixed top-16 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="bg-white text-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-zinc-200">
              <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-tight">Kresba přijata</p>
                <p className="text-[11px] text-zinc-700">{notification.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Informační lišta */}
        <div className="bg-zinc-950 border-b border-zinc-900 px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-zinc-400">
            <span>
              Celkem záběrů: <strong className="text-white">{project.panels.length}</strong>
            </span>
            <span className="text-zinc-700">•</span>
            <span>
              Kresby hotové:{' '}
              <strong className="text-white">
                {project.panels.filter((p) => !!p.imageUrl).length} z {project.panels.length}
              </strong>
            </span>
            <span className="text-zinc-700">•</span>
            <span>
              Formát: <strong className="text-white">16:9</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-white' : 'bg-zinc-600'}`} />
              <span>{connected ? 'Spojeno s PC' : 'Čeká na připojení'}</span>
            </span>
            <span className="text-zinc-700">•</span>
            <button
              onClick={() => {
                setSelectedPanelForQR(project.panels[0]?.id || 'panel-1');
                setIsConnectModalOpen(true);
              }}
              className="text-white hover:underline flex items-center gap-1 font-medium"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Zobrazit QR pro mobil</span>
            </button>
          </div>
        </div>

        {/* Hlavní storyboard mřížka */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {project.panels.map((panel) => (
                <StoryboardCard
                  key={panel.id}
                  panel={panel}
                  onUpdate={handleUpdatePanel}
                  onDelete={handleDeletePanel}
                  onDuplicate={handleDuplicatePanel}
                  onMove={handleMovePanel}
                  onOpenLightbox={setLightboxPanel}
                  onOpenQR={(panelId) => {
                    setSelectedPanelForQR(panelId);
                    setIsConnectModalOpen(true);
                  }}
                  onOpenFilter={setLightboxPanel}
                  isFlashing={flashingPanelId === panel.id}
                />
              ))}

              <button
                onClick={handleAddPanel}
                className="h-full min-h-[320px] rounded-xl border border-dashed border-zinc-800 hover:border-white bg-zinc-950/40 hover:bg-zinc-900/30 flex flex-col items-center justify-center gap-2.5 text-zinc-400 hover:text-white transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-900 group-hover:bg-white group-hover:text-black border border-zinc-800 flex items-center justify-center transition-colors text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold">Přidat další záběr</p>
                  <p className="text-[11px] text-zinc-600">Záběr #{project.panels.length + 1}</p>
                </div>
              </button>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {project.panels.map((panel) => (
                <div
                  key={panel.id}
                  className={`bg-zinc-950 border rounded-xl p-4 flex flex-col md:flex-row gap-5 items-center transition-all ${
                    flashingPanelId === panel.id
                      ? 'border-white ring-4 ring-white/50'
                      : 'border-zinc-850'
                  }`}
                >
                  <div className="w-full md:w-60 aspect-video rounded-lg overflow-hidden bg-black border border-zinc-850 shrink-0 relative group">
                    {panel.imageUrl ? (
                      <img
                        src={panel.imageUrl}
                        alt={`Záběr ${panel.order}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-xs gap-1">
                        <Smartphone className="w-6 h-6 text-zinc-700" />
                        <span>Prázdné pole</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedPanelForQR(panel.id);
                        setIsConnectModalOpen(true);
                      }}
                      className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity gap-1"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Skenovat mobilem</span>
                    </button>
                  </div>

                  <div className="flex-1 w-full space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold bg-white text-black px-2 py-0.5 rounded text-xs">
                        ZÁBĚR #{panel.order} — SCÉNA {panel.scene || '-'} / ZÁBĚR {panel.shot || '-'}
                      </span>
                      <span className="text-zinc-400">
                        {[panel.cameraType, panel.cameraMovement].filter(Boolean).join(' • ') || '-'}
                      </span>
                    </div>

                    <p className="text-zinc-200">
                      <strong className="text-zinc-500 uppercase text-[10px] block">Děj a akce:</strong>
                      {panel.action || '-'}
                    </p>

                    {panel.dialogue && (
                      <p className="text-zinc-300 font-mono italic">
                        <strong className="text-zinc-500 uppercase text-[10px] block not-italic">Dialog / Zvuk:</strong>
                        "{panel.dialogue}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {viewMode === 'presentation' && (
          <PresentationReelView
            project={project}
            onClose={() => setViewMode('grid')}
          />
        )}

        <PhoneConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          roomId={roomId}
          panels={project.panels}
          selectedPanelId={selectedPanelForQR}
          onOpenSimulator={(pId) => {
            setSimulatorTargetPanel(pId);
            setIsSimulatorOpen(true);
          }}
        />

        <PrintTemplateModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          project={project}
          roomId={roomId}
        />

        <ExportPdfModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          project={project}
        />

        <ImageLightboxModal
          panel={lightboxPanel}
          onClose={() => setLightboxPanel(null)}
          onUpdateImage={(panelId, newImg) => {
            setProject((prev) => ({
              ...prev,
              panels: prev.panels.map((p) => (p.id === panelId ? { ...p, imageUrl: newImg } : p))
            }));
            setLightboxPanel(null);
          }}
        />

        <MobileSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          roomId={roomId}
          initialPanelId={simulatorTargetPanel}
          onSendSketch={handleSimulatorSend}
        />
      </div>
    </>
  );
}
