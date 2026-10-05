const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');
const os = require('os');
const { spawn } = require('child_process');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Zjištění reálné Wi-Fi IP (ignoruje Hyper-V a virtuální adaptéry)
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  let primaryIp = 'localhost';

  for (const name of Object.keys(interfaces)) {
    const isVirtual = name.toLowerCase().includes('vethernet') || 
                      name.toLowerCase().includes('virtual') || 
                      name.toLowerCase().includes('wsl') || 
                      name.toLowerCase().includes('docker');

    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ name, address: net.address, isVirtual });
        if ((name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wlan')) && !isVirtual) {
          primaryIp = net.address;
        } else if (primaryIp === 'localhost' && !isVirtual) {
          primaryIp = net.address;
        }
      }
    }
  }

  return { primaryIp, ips };
}

let activeTunnelUrl = null;

// Automatické spuštění bezpečného HTTPS tunelu pro mobilní telefony
function startTunnel(localPort) {
  try {
    const ssh = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-R', `80:localhost:${localPort}`,
      'nokey@localhost.run'
    ]);

    ssh.stdout.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/);
      if (match && match[0]) {
        activeTunnelUrl = match[0];
        console.log(`> Mobilní HTTPS tunel (QR kód): ${activeTunnelUrl}`);
      }
    });

    ssh.stderr.on('data', () => {});
    ssh.on('close', () => {
      // Při odpojení restart po 5 sekundách
      setTimeout(() => startTunnel(localPort), 5000);
    });
  } catch (err) {
    console.warn('SSH tunel se nepodařilo spustit, použije se místní IP:', err.message);
  }
}

app.prepare().then(() => {
  const rooms = new Map();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      if (pathname === '/api/network-info') {
        const { primaryIp, ips } = getNetworkIps();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({
          localIp: primaryIp,
          allIps: ips,
          port,
          lanUrl: `http://${primaryIp}:${port}`,
          tunnelUrl: activeTunnelUrl,
          recommendedUrl: activeTunnelUrl || `http://${primaryIp}:${port}`,
          activeRooms: Array.from(rooms.keys()).length
        }));
        return;
      }

      if (pathname === '/api/upload-sketch' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { roomId, panelId, imageData, metadata } = data;

            if (roomId && rooms.has(roomId)) {
              const clients = rooms.get(roomId);
              const broadcast = JSON.stringify({
                type: 'sketch-received',
                panelId,
                imageData,
                metadata: metadata || {},
                timestamp: Date.now()
              });
              clients.forEach(client => {
                if (client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(broadcast);
                }
              });
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, panelId }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Chybný JSON' }));
          }
        });
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Chyba serveru:', err);
      res.statusCode = 500;
      res.end('Chyba');
    }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 50 * 1024 * 1024 });

  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    let currentRoom = null;
    let clientId = Math.random().toString(36).substring(2, 9);
    let clientRole = 'unknown';

    ws.on('message', (message) => {
      try {
        const text = typeof message === 'string' ? message : message.toString('utf8');
        const payload = JSON.parse(text);

        switch (payload.type) {
          case 'join': {
            const { roomId, role } = payload;
            currentRoom = roomId;
            clientRole = role || 'client';

            if (!rooms.has(roomId)) {
              rooms.set(roomId, new Set());
            }
            const roomSet = rooms.get(roomId);
            roomSet.add({ ws, role: clientRole, id: clientId });

            const desktopCount = Array.from(roomSet).filter(c => c.role === 'desktop').length;
            const mobileCount = Array.from(roomSet).filter(c => c.role === 'mobile').length;

            const notifyMsg = JSON.stringify({
              type: 'room-status',
              roomId,
              peerCount: roomSet.size,
              desktopCount,
              mobileCount
            });

            roomSet.forEach(c => {
              if (c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(notifyMsg);
              }
            });

            ws.send(JSON.stringify({
              type: 'joined',
              roomId,
              clientId,
              role: clientRole
            }));
            break;
          }

          case 'upload-sketch': {
            const { roomId, panelId, imageData, metadata } = payload;
            const targetRoom = roomId || currentRoom;

            if (targetRoom && rooms.has(targetRoom)) {
              const clients = rooms.get(targetRoom);
              const broadcast = JSON.stringify({
                type: 'sketch-received',
                panelId,
                imageData,
                metadata: metadata || {},
                timestamp: Date.now(),
                senderId: clientId
              });

              clients.forEach(client => {
                if (client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(broadcast);
                }
              });

              ws.send(JSON.stringify({
                type: 'upload-confirmed',
                panelId,
                timestamp: Date.now()
              }));
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
            break;
          }
        }
      } catch (err) {
        console.error('Chyba WS zprávy:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const roomSet = rooms.get(currentRoom);
        for (const item of Array.from(roomSet)) {
          if (item.ws === ws) {
            roomSet.delete(item);
            break;
          }
        }

        if (roomSet.size === 0) {
          rooms.delete(currentRoom);
        } else {
          const desktopCount = Array.from(roomSet).filter(c => c.role === 'desktop').length;
          const mobileCount = Array.from(roomSet).filter(c => c.role === 'mobile').length;
          const notifyMsg = JSON.stringify({
            type: 'room-status',
            roomId: currentRoom,
            peerCount: roomSet.size,
            desktopCount,
            mobileCount
          });
          roomSet.forEach(c => {
            if (c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(notifyMsg);
            }
          });
        }
      }
    });
  });

  server.listen(port, () => {
    const { primaryIp } = getNetworkIps();
    console.log(`> Storyboard LiveSync běží na http://localhost:${port}`);
    console.log(`> Místní Wi-Fi: http://${primaryIp}:${port}`);
    startTunnel(port);
  });
});
