import mqtt, { MqttClient } from 'mqtt';

type SketchHandler = (panelId: string, imageData: string) => void;
type StatusHandler = (connected: boolean, peerCount: number) => void;

const CHUNK_SIZE = 32000; // 32KB bezpečný limit pro rychlý přenos po síti
const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

interface TransferBuffer {
  panelId: string;
  totalChunks: number;
  received: number;
  chunks: string[];
}

class SyncService {
  private mqttClient: MqttClient | null = null;
  private peer: any = null;
  private ws: WebSocket | null = null;
  private connections: any[] = [];
  private onSketchReceived: SketchHandler | null = null;
  private onStatusChange: StatusHandler | null = null;
  private roomId: string = '';
  private role: 'desktop' | 'mobile' = 'desktop';

  private chunkBuffers: Record<string, TransferBuffer> = {};
  private heartbeatTimer: any = null;
  private lastDesktopHeartbeat: number = 0;
  private isConnected: boolean = false;
  private currentBrokerIndex: number = 0;

  async initDesktop(roomId: string, onSketch: SketchHandler, onStatus: StatusHandler) {
    this.cleanup();
    this.roomId = roomId;
    this.role = 'desktop';
    this.onSketchReceived = onSketch;
    this.onStatusChange = onStatus;

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
    }

    // 1. Spustit bleskový MQTT WebSocket kanál (funguje spolehlivě na mobilních sítích i za NATem)
    this.initMqttDesktop();

    // 2. Lokální WebSocket (pokud běží server.js)
    this.tryLocalWebSocket();

    // 3. PeerJS WebRTC jako záložní kanál
    this.initPeerJsDesktop();
  }

  async initMobile(roomId: string, onStatus: StatusHandler) {
    this.cleanup();
    this.roomId = roomId;
    this.role = 'mobile';
    this.onStatusChange = onStatus;

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());

      // Při návratu z fotoaparátu ihned obnovit spojení a poslat ping
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.pingDesktop();
          if (this.mqttClient && !this.mqttClient.connected) {
            this.mqttClient.reconnect();
          }
        }
      });
    }

    this.initMqttMobile();
    this.tryLocalWebSocket();
    this.initPeerJsMobile();
  }

  // ==========================================
  // MQTT BLESKOVÝ PROTOKOL (Žádné STUN/TURN, 100% spolehlivost)
  // ==========================================

  private getCleanRoom() {
    return this.roomId.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private initMqttDesktop() {
    if (typeof window === 'undefined') return;
    const cleanRoom = this.getCleanRoom();
    const brokerUrl = BROKERS[0];
    const clientId = `sb_pc_${cleanRoom}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 1500,
        keepalive: 30
      });
      this.mqttClient = client;

      client.on('connect', () => {
        const baseTopic = `sblive/${cleanRoom}`;
        client.subscribe([
          `${baseTopic}/ping`,
          `${baseTopic}/sketch`,
          `${baseTopic}/chunk`,
          `${baseTopic}/mobile_status`
        ], (err) => {
          if (!err) {
            this.broadcastDesktopHeartbeat();
          }
        });
      });

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());

          // Mobil poslal ping s dotazem na přítomnost PC
          if (data.type === 'mobile_ping') {
            this.broadcastDesktopHeartbeat();
            this.updateConnectedStatus(true, 1);
          }
          // Mobil poslal celou skicu
          else if (data.type === 'upload_sketch') {
            if (this.onSketchReceived && data.panelId && data.imageData) {
              this.onSketchReceived(data.panelId, data.imageData);
              this.sendMqttAck(data.panelId);
            }
          }
          // Mobil poslal část skici (chunking)
          else if (data.type === 'upload_chunk') {
            this.handleIncomingChunk(data);
          }
        } catch (e) {
          // ignore
        }
      });

      client.on('error', (err) => {
        console.warn('MQTT desktop warning:', err);
      });

      // Pravidelný heartbeat každé 2 sekundy pro mobil
      this.heartbeatTimer = setInterval(() => {
        this.broadcastDesktopHeartbeat();
      }, 2000);

    } catch (e) {
      console.warn('MQTT desktop init:', e);
    }
  }

  private initMqttMobile() {
    if (typeof window === 'undefined') return;
    const cleanRoom = this.getCleanRoom();
    const brokerUrl = BROKERS[0];
    const clientId = `sb_mob_${cleanRoom}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 1500,
        keepalive: 30
      });
      this.mqttClient = client;

      client.on('connect', () => {
        const baseTopic = `sblive/${cleanRoom}`;
        client.subscribe([
          `${baseTopic}/desktop_status`,
          `${baseTopic}/ack`
        ], (err) => {
          if (!err) {
            this.pingDesktop();
          }
        });
      });

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());

          // Přijat heartbeat z PC -> okamžité spojení!
          if (data.type === 'desktop_online') {
            this.lastDesktopHeartbeat = Date.now();
            this.updateConnectedStatus(true, 1);
          }
        } catch (e) {
          // ignore
        }
      });

      client.on('error', (err) => {
        console.warn('MQTT mobil warning:', err);
      });

      // Pravidelná kontrola spojení s PC
      this.heartbeatTimer = setInterval(() => {
        if (Date.now() - this.lastDesktopHeartbeat > 5000) {
          // Pokud jsme dlouho neslyšeli PC, poslat nový ping
          this.pingDesktop();
          if (Date.now() - this.lastDesktopHeartbeat > 12000) {
            this.updateConnectedStatus(false, 0);
          }
        }
      }, 2500);

    } catch (e) {
      console.warn('MQTT mobil init:', e);
    }
  }

  retryConnection() {
    if (this.mqttClient) {
      if (!this.mqttClient.connected) {
        try {
          this.mqttClient.reconnect();
        } catch (e) {}
      }
      this.pingDesktop();
    }
  }

  private broadcastDesktopHeartbeat() {
    if (this.mqttClient && this.mqttClient.connected) {
      const cleanRoom = this.getCleanRoom();
      this.mqttClient.publish(
        `sblive/${cleanRoom}/desktop_status`,
        JSON.stringify({ type: 'desktop_online', roomId: this.roomId, time: Date.now() })
      );
    }
  }

  private pingDesktop() {
    if (this.mqttClient && this.mqttClient.connected) {
      const cleanRoom = this.getCleanRoom();
      this.mqttClient.publish(
        `sblive/${cleanRoom}/ping`,
        JSON.stringify({ type: 'mobile_ping', roomId: this.roomId, time: Date.now() })
      );
    }
  }

  private sendMqttAck(panelId: string) {
    if (this.mqttClient && this.mqttClient.connected) {
      const cleanRoom = this.getCleanRoom();
      this.mqttClient.publish(
        `sblive/${cleanRoom}/ack`,
        JSON.stringify({ type: 'ack', panelId, time: Date.now() })
      );
    }
  }

  private handleIncomingChunk(data: any) {
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
      this.sendMqttAck(buf.panelId);
    }
  }

  private updateConnectedStatus(status: boolean, count: number) {
    this.isConnected = status;
    this.onStatusChange?.(status, count);
  }

  // ==========================================
  // PEERJS WEBRTC (Záložní kanál)
  // ==========================================

  private async initPeerJsDesktop() {
    if (typeof window === 'undefined') return;
    try {
      const { Peer } = await import('peerjs');
      const cleanRoom = this.getCleanRoom();
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

      this.peer.on('error', (err: any) => {
        console.warn('PeerJS PC warning:', err?.type || err);
      });

      this.peer.on('connection', (conn: any) => {
        this.connections.push(conn);
        this.updateConnectedStatus(true, Math.max(1, this.connections.length));

        conn.on('data', (data: any) => {
          if (!data) return;
          if (data.type === 'upload-sketch-chunk') {
            this.handleIncomingChunk(data);
          } else if (data.type === 'upload-sketch' && this.onSketchReceived) {
            this.onSketchReceived(data.panelId, data.imageData);
          }
        });

        conn.on('close', () => {
          this.connections = this.connections.filter(c => c !== conn);
        });
      });
    } catch (e) {
      // ignore
    }
  }

  private async initPeerJsMobile() {
    if (typeof window === 'undefined') return;
    try {
      const { Peer } = await import('peerjs');
      const cleanRoom = this.getCleanRoom();
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

      this.peer.on('error', (err: any) => {
        console.warn('PeerJS Mobile warning:', err?.type || err);
      });

      this.peer.on('open', () => {
        try {
          const conn = this.peer.connect(targetPeerId, { reliable: true });
          conn.on('open', () => {
            this.connections = [conn];
            this.updateConnectedStatus(true, 1);
          });
        } catch (e) {}
      });
    } catch (e) {
      // ignore
    }
  }

  private tryLocalWebSocket() {
    if (typeof window === 'undefined') return;
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocal && !window.location.host.includes(':3000')) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', roomId: this.roomId, role: this.role }));
        this.updateConnectedStatus(true, 1);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sketch-received' && this.onSketchReceived) {
            this.onSketchReceived(data.panelId, data.imageData);
          } else if (data.type === 'room-status') {
            this.updateConnectedStatus(true, data.peerCount || 1);
          }
        } catch (e) {}
      };
    } catch (e) {}
  }

  // ==========================================
  // ODESLÁNÍ SKICI (Automaticky vybere nejrychlejší kanál)
  // ==========================================

  async sendSketch(panelId: string, imageData: string): Promise<boolean> {
    let sent = false;
    const cleanRoom = this.getCleanRoom();

    // Pokud je MQTT klient odpojen (např. mobil uspal spojení při focení), pokusit se rychle znovu připojit
    if (this.mqttClient && !this.mqttClient.connected) {
      try {
        this.mqttClient.reconnect();
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 2000);
          this.mqttClient?.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } catch (e) {}
    }

    // 1. Primární: Bleskové odeslání přes MQTT WebSocket
    if (this.mqttClient && this.mqttClient.connected) {
      try {
        const totalChunks = Math.ceil(imageData.length / CHUNK_SIZE);

        if (totalChunks <= 1) {
          this.mqttClient.publish(
            `sblive/${cleanRoom}/sketch`,
            JSON.stringify({
              type: 'upload_sketch',
              roomId: this.roomId,
              panelId,
              imageData,
              time: Date.now()
            })
          );
          sent = true;
        } else {
          const transferId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          for (let i = 0; i < totalChunks; i++) {
            const chunk = imageData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            this.mqttClient.publish(
              `sblive/${cleanRoom}/chunk`,
              JSON.stringify({
                type: 'upload_chunk',
                transferId,
                roomId: this.roomId,
                panelId,
                chunkIndex: i,
                totalChunks,
                chunk
              })
            );
          }
          sent = true;
        }
      } catch (err) {
        console.warn('MQTT send err:', err);
      }
    }

    // 2. Záloha: WebRTC DataChannel (PeerJS)
    const validConnections = this.connections.filter(c => c && c.open);
    if (validConnections.length > 0) {
      for (const conn of validConnections) {
        try {
          conn.send({
            type: 'upload-sketch',
            roomId: this.roomId,
            panelId,
            imageData,
            timestamp: Date.now()
          });
          sent = true;
        } catch (e) {}
      }
    }

    // 3. Záloha: Lokální WebSocket
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
      } catch (e) {}
    }

    return sent;
  }

  cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.mqttClient) {
      try {
        this.mqttClient.end(true);
      } catch (e) {}
      this.mqttClient = null;
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
    this.chunkBuffers = {};
    this.isConnected = false;
  }
}

export const syncService = new SyncService();
