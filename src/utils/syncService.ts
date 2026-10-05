// Univerzální synchronizace pro Desktop i Mobil (funguje na GitHub Pages i lokálně)

type SketchHandler = (panelId: string, imageData: string) => void;
type StatusHandler = (connected: boolean, peerCount: number) => void;

const CHUNK_SIZE = 16384; // 16KB bezpečný limit pro všechny WebRTC implementace včetně Safari iOS

interface TransferBuffer {
  panelId: string;
  totalChunks: number;
  received: number;
  chunks: string[];
}

class SyncService {
  private peer: any = null;
  private ws: WebSocket | null = null;
  private connections: any[] = [];
  private onSketchReceived: SketchHandler | null = null;
  private onStatusChange: StatusHandler | null = null;
  private roomId: string = '';
  private role: 'desktop' | 'mobile' = 'desktop';

  private chunkBuffers: Record<string, TransferBuffer> = {};
  private mobileRetryTimer: any = null;
  private activeMobileConn: any = null;
  private isConnecting: boolean = false;

  async initDesktop(roomId: string, onSketch: SketchHandler, onStatus: StatusHandler) {
    this.cleanup();
    this.roomId = roomId;
    this.role = 'desktop';
    this.onSketchReceived = onSketch;
    this.onStatusChange = onStatus;

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
    }

    // 1. Zkusit lokální WebSocket (pokud běží vlastní dev server)
    this.tryLocalWebSocket();

    // 2. Spustit PeerJS (WebRTC - funguje na GitHub Pages)
    await this.initPeerJsDesktop();
  }

  async initMobile(roomId: string, onStatus: StatusHandler) {
    this.cleanup();
    this.roomId = roomId;
    this.role = 'mobile';
    this.onStatusChange = onStatus;

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
      
      // Při návratu z fotoaparátu (kdy systém mohl uspat spojení) zkontrolovat stav
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (!this.activeMobileConn || !this.activeMobileConn.open) {
            this.reconnectMobile();
          }
        }
      });
    }

    this.tryLocalWebSocket();
    await this.initPeerJsMobile();
  }

  private tryLocalWebSocket() {
    if (typeof window === 'undefined') return;
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocal && !window.location.host.includes(':3000')) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', roomId: this.roomId, role: this.role }));
        this.onStatusChange?.(true, 1);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sketch-received' && this.onSketchReceived) {
            this.onSketchReceived(data.panelId, data.imageData);
          } else if (data.type === 'room-status') {
            this.onStatusChange?.(true, data.peerCount || 1);
          }
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      // ignore
    }
  }

  private async initPeerJsDesktop() {
    if (typeof window === 'undefined') return;
    try {
      const { Peer } = await import('peerjs');
      const cleanRoom = this.roomId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const peerId = `sb-${cleanRoom}-pc`;

      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', () => {
        this.onStatusChange?.(true, this.connections.length);
      });

      this.peer.on('connection', (conn: any) => {
        this.connections.push(conn);
        this.onStatusChange?.(true, this.connections.length);

        conn.on('data', (data: any) => {
          if (!data) return;

          // 1. Zpracování po částech (chunking) pro spolehlivost na iOS a mobilních sítích
          if (data.type === 'upload-sketch-chunk') {
            const { transferId, panelId, chunkIndex, totalChunks, chunk } = data;
            if (!this.chunkBuffers[transferId]) {
              this.chunkBuffers[transferId] = {
                panelId,
                totalChunks,
                received: 0,
                chunks: new Array(totalChunks)
              };
            }

            const buf = this.chunkBuffers[transferId];
            if (!buf.chunks[chunkIndex]) {
              buf.chunks[chunkIndex] = chunk;
              buf.received++;
            }

            if (buf.received === totalChunks) {
              const fullImageData = buf.chunks.join('');
              delete this.chunkBuffers[transferId];
              if (this.onSketchReceived) {
                this.onSketchReceived(buf.panelId, fullImageData);
              }
              try {
                conn.send({ type: 'upload-confirmed', panelId: buf.panelId });
              } catch (e) {}
            }
          }
          // 2. Zpracování celého obrázku najednou (legacy fallback)
          else if (data.type === 'upload-sketch' && this.onSketchReceived) {
            this.onSketchReceived(data.panelId, data.imageData);
            try {
              conn.send({ type: 'upload-confirmed', panelId: data.panelId });
            } catch (e) {}
          }
        });

        conn.on('close', () => {
          this.connections = this.connections.filter(c => c !== conn);
          this.onStatusChange?.(true, this.connections.length);
        });
      });

      this.peer.on('error', (err: any) => {
        console.warn('PeerJS desktop:', err);
      });
    } catch (err) {
      console.warn('Nelze načíst PeerJS:', err);
    }
  }

  private async initPeerJsMobile() {
    if (typeof window === 'undefined') return;
    try {
      const { Peer } = await import('peerjs');

      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', () => {
        this.connectMobileToDesktop();
      });

      this.peer.on('error', (err: any) => {
        console.warn('PeerJS mobil chyba:', err?.type || err);
        // Pokud cílový PC peer ještě nebyl nalezen, naplánovat retry
        if (err?.type === 'peer-unavailable' || err?.type === 'server-error') {
          this.scheduleMobileRetry();
        }
      });
    } catch (err) {
      console.warn('Nelze načíst PeerJS mobil:', err);
    }
  }

  private connectMobileToDesktop() {
    if (!this.peer || this.peer.destroyed || this.isConnecting) return;
    const cleanRoom = this.roomId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetPeerId = `sb-${cleanRoom}-pc`;

    this.isConnecting = true;
    try {
      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.activeMobileConn = conn;
      this.connections = [conn];

      conn.on('open', () => {
        this.isConnecting = false;
        if (this.mobileRetryTimer) {
          clearTimeout(this.mobileRetryTimer);
          this.mobileRetryTimer = null;
        }
        this.onStatusChange?.(true, 1);
      });

      conn.on('close', () => {
        this.isConnecting = false;
        this.onStatusChange?.(false, 0);
        this.scheduleMobileRetry();
      });

      conn.on('error', () => {
        this.isConnecting = false;
        this.scheduleMobileRetry();
      });
    } catch (e) {
      this.isConnecting = false;
      this.scheduleMobileRetry();
    }
  }

  private scheduleMobileRetry() {
    if (this.mobileRetryTimer || this.role !== 'mobile') return;
    this.onStatusChange?.(false, 0);
    this.mobileRetryTimer = setTimeout(() => {
      this.mobileRetryTimer = null;
      this.reconnectMobile();
    }, 2500);
  }

  private reconnectMobile() {
    if (this.role !== 'mobile') return;
    if (this.activeMobileConn && this.activeMobileConn.open) {
      this.onStatusChange?.(true, 1);
      return;
    }
    if (this.peer && !this.peer.destroyed) {
      this.connectMobileToDesktop();
    }
  }

  async sendSketch(panelId: string, imageData: string): Promise<boolean> {
    let sent = false;

    // Pokud mobil ještě není propojen, počkat až 3 sekundy
    if (this.role === 'mobile' && (!this.activeMobileConn || !this.activeMobileConn.open)) {
      this.reconnectMobile();
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(r => setTimeout(r, 200));
        if (this.activeMobileConn && this.activeMobileConn.open) break;
      }
    }

    // 1. Odeslání přes PeerJS WebRTC (s bezpečnými chunky do 16KB pro mobilní Safari a Chrome)
    const validConnections = this.connections.filter(c => c && c.open);
    if (validConnections.length > 0) {
      const totalChunks = Math.ceil(imageData.length / CHUNK_SIZE);
      const transferId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      for (const conn of validConnections) {
        try {
          if (totalChunks === 1) {
            conn.send({
              type: 'upload-sketch',
              roomId: this.roomId,
              panelId,
              imageData,
              timestamp: Date.now()
            });
          } else {
            for (let i = 0; i < totalChunks; i++) {
              const chunk = imageData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              conn.send({
                type: 'upload-sketch-chunk',
                transferId,
                roomId: this.roomId,
                panelId,
                chunkIndex: i,
                totalChunks,
                chunk
              });
            }
          }
          sent = true;
        } catch (e) {
          console.error('Chyba při odesílání WebRTC packetu:', e);
        }
      }
    }

    // 2. Zkusit poslat přes WebSocket (pokud je připojen)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'upload-sketch',
          roomId: this.roomId,
          panelId,
          imageData,
          timestamp: Date.now()
        }));
        sent = true;
      } catch (e) {
        // ignore
      }
    }

    return sent;
  }

  cleanup() {
    if (this.mobileRetryTimer) {
      clearTimeout(this.mobileRetryTimer);
      this.mobileRetryTimer = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.connections = [];
    this.activeMobileConn = null;
    this.chunkBuffers = {};
    this.isConnecting = false;
  }
}

export const syncService = new SyncService();
