const WebSocket = require('ws');

const wsUrl = 'ws://localhost:3000';
const roomId = 'ROOM-VERIFY-1';

console.log('--- Testing Dual-Device WebSocket LiveSync Pipeline ---');

const desktopWs = new WebSocket(wsUrl);
const mobileWs = new WebSocket(wsUrl);

let desktopReceived = false;
let mobileAcknowledged = false;

desktopWs.on('open', () => {
  console.log('[Desktop] Connected, joining room', roomId);
  desktopWs.send(JSON.stringify({
    type: 'join',
    roomId,
    role: 'desktop'
  }));
});

mobileWs.on('open', () => {
  console.log('[Mobile] Connected, joining room', roomId);
  mobileWs.send(JSON.stringify({
    type: 'join',
    roomId,
    role: 'mobile'
  }));

  // Send a test sketch after joining
  setTimeout(() => {
    console.log('[Mobile] Transmitting auto-cropped 16:9 sketch to panel-2...');
    mobileWs.send(JSON.stringify({
      type: 'upload-sketch',
      roomId,
      panelId: 'panel-2',
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
      metadata: { capturedAt: Date.now() }
    }));
  }, 500);
});

desktopWs.on('message', (msg) => {
  const data = JSON.parse(msg.toString());
  console.log('[Desktop received]:', data.type, data.panelId || '');
  if (data.type === 'sketch-received' && data.panelId === 'panel-2') {
    desktopReceived = true;
    checkSuccess();
  }
});

mobileWs.on('message', (msg) => {
  const data = JSON.parse(msg.toString());
  console.log('[Mobile received]:', data.type);
  if (data.type === 'upload-confirmed' && data.panelId === 'panel-2') {
    mobileAcknowledged = true;
    checkSuccess();
  }
});

function checkSuccess() {
  if (desktopReceived && mobileAcknowledged) {
    console.log('>>> SUCCESS: Full Dual-Device Real-Time Sync Loop Verified! <<<');
    desktopWs.close();
    mobileWs.close();
    process.exit(0);
  }
}

setTimeout(() => {
  if (!desktopReceived || !mobileAcknowledged) {
    console.error('TIMEOUT: Did not receive expected messages.');
    process.exit(1);
  }
}, 5000);
