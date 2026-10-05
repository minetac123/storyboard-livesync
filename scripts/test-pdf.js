const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');

async function testPdfGenerators() {
  console.log('Testing jsPDF & QRCode generation...');

  // 1. Test QR Code generation
  const qrUrl = await QRCode.toDataURL('http://192.168.0.155:3000/scan?room=ROOM-TEST&panel=panel-1', {
    margin: 1,
    width: 140
  });
  console.log('QR Code generated successfully. Length:', qrUrl.length);

  // 2. Test A4 template generator
  const docA4 = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  docA4.text('TEST STORYBOARD TEMPLATE', 20, 20);
  docA4.addImage(qrUrl, 'PNG', 20, 30, 20, 20);
  const a4Output = docA4.output('arraybuffer');
  console.log('A4 Template PDF generated successfully. Bytes:', a4Output.byteLength);

  // 3. Test Landscape Presentation generator
  const docPres = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  docPres.setFillColor(15, 23, 42);
  docPres.rect(0, 0, 297, 210, 'F');
  docPres.setTextColor(255, 255, 255);
  docPres.text('FILM SCHOOL STORYBOARD REEL', 20, 20);
  const presOutput = docPres.output('arraybuffer');
  console.log('Presentation PDF generated successfully. Bytes:', presOutput.byteLength);

  console.log('>>> SUCCESS: All PDF & QR Code generation pipelines verified! <<<');
}

testPdfGenerators().catch(err => {
  console.error('PDF Test Error:', err);
  process.exit(1);
});
