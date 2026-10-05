// Univerzální synchronizace pro Desktop i Mobil (funguje na GitHub Pages i lokálně)

type SketchHandler = (panelId: string, imageData: string) => void;
type StatusHandler = (connected: boolean, peerCount: number) => void;

class SyncService {
  private peer: any = null;
  private ws: WebSocket | null = null;
  private connections: any[] = [];
  private onSketchReceived: SketchHandler | null = null;
  private onStatusChange: StatusHandler | null = null;
  private roomId: string = '';
  private role: 'desktop' | 'mobile' = 'desktop';

  async initDesktop(roomId: string, onSketch: SketchHandler, onStatus: StatusHandler) {
    this.roomId = roomId;
    this.role = 'desktop';
    this.onSketchReceived = onSketch;
    this.onStatusChange = onStatus;

    // 1. Zkusit lokální WebSocket (pokud běží vlastní server)
    this.tryLocalWebSocket();

    // 2. Spustit PeerJS (WebRTC - funguje na GitHub Pages bez jakéhokoliv serveru)
    await this.initPeerJsDesktop();
  }

  async initMobile(roomId: string, onStatus: StatusHandler) {
    this.roomId = roomId;
    this.role = 'mobile';
    this.onStatusChange = onStatus;

    this.tryLocalWebSocket();
    await this.initPeerJsMobile();
  }

  private tryLocalWebSocket() {
    if (typeof window === 'undefined') return;
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocal && !window.location.host.includes(':3000')) {
        // Na GitHub Pages lokální WS neběží
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
          if (data && data.type === 'upload-sketch' && this.onSketchReceived) {
            this.onSketchReceived(data.panelId, data.imageData);
            conn.send({ type: 'upload-confirmed', panelId: data.panelId });
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
      const cleanRoom = this.roomId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetPeerId = `sb-${cleanRoom}-pc`;

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
        const conn = this.peer.connect(targetPeerId, { reliable: true });
        this.connections = [conn];

        conn.on('open', () => {
          this.onStatusChange?.(true, 1);
        });

        conn.on('data', () => {});
      });

      this.peer.on('error', (err: any) => {
        console.warn('PeerJS mobil:', err);
      });
    } catch (err) {
      console.warn('Nelze načíst PeerJS mobil:', err);
    }
  }

  async sendSketch(panelId: string, imageData: string): Promise<boolean> {
    let sent = false;

    // 1. Zkusit poslat přes PeerJS (WebRTC)
    for (const conn of this.connections) {
      try {
        if (conn && conn.open) {
          conn.send({
            type: 'upload-sketch',
            roomId: this.roomId,
            panelId,
            imageData,
            timestamp: Date.now()
          });
          sent = true;
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Zkusit poslat přes WebSocket
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

    // 3. Zkusit HTTP REST fallback
    if (!sent && typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/upload-sketch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: this.roomId, panelId, imageData })
        });
        const d = await res.json();
        if (d && d.success) sent = true;
      } catch (e) {
        // ignore
      }
    }

    return sent;
  }

  cleanup() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connections = [];
  }
}

export const syncService = new SyncService();
