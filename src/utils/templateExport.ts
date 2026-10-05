import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { StoryboardPanel } from '../types/storyboard';

import { getMobileScanUrl } from './urlHelper';

interface GenerateTemplateOptions {
  projectTitle?: string;
  director?: string;
  roomId: string;
  baseUrl?: string;
  panels: StoryboardPanel[];
  panelsPerPage?: number;
}

export async function generatePrintableStoryboardTemplate(options: GenerateTemplateOptions): Promise<void> {
  const {
    projectTitle = '',
    director = '',
    roomId,
    panels,
    panelsPerPage = 6
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const marginTop = 20;

  const totalPanels = panels.length > 0 ? panels.length : 6;
  const totalPages = Math.ceil(totalPanels / panelsPerPage);

  const colCount = 2;
  const colWidth = (pageWidth - marginX * 2 - 8) / 2;
  const panelHeight = 82;
  const gapX = 8;
  const gapY = 6;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage();
    }

    // Horní banner stránky - čistě černobílý
    doc.setFillColor(0, 0, 0);
    doc.rect(marginX, 8, pageWidth - marginX * 2, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text('STORYBOARD LIVESYNC - PREDLOHA PRO KRESBU', marginX + 3, 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(230, 230, 230);
    doc.text(`MISTNOST: ${roomId}   |   STRANA ${pageIdx + 1} Z ${totalPages}`, pageWidth - marginX - 55, 13.5);

    // Informace o filmu (pouze pokud jsou vyplněné)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    const pTitle = projectTitle?.trim() ? `PROJEKT: ${projectTitle.trim().toUpperCase()}` : 'PROJEKT: ____________________';
    doc.text(pTitle, marginX, 18.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const pDir = director?.trim() ? `REZIE: ${director.trim().toUpperCase()}` : 'REZIE: ____________________';
    doc.text(`${pDir}   |   FORMAT 16:9`, marginX + 85, 18.5);

    // Kreslení jednotlivých políček záběrů
    const startIdx = pageIdx * panelsPerPage;

    for (let i = 0; i < panelsPerPage; i++) {
      const panelIndex = startIdx + i;
      if (panelIndex >= totalPanels) break;

      const panel = panels[panelIndex] || {
        id: `panel-${panelIndex + 1}`,
        order: panelIndex + 1,
        scene: `1`,
        shot: `${panelIndex + 1}`,
        cameraType: 'Celek',
        cameraMovement: 'Staticka',
        action: '',
        dialogue: ''
      };

      const col = i % colCount;
      const row = Math.floor(i / colCount);

      const x = marginX + col * (colWidth + gapX);
      const y = marginTop + 4 + row * (panelHeight + gapY);

      // Ohraničení políčka
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, colWidth, panelHeight, 2, 2, 'S');

      // Záhlaví políčka
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x + 1, y + 1, colWidth - 2, 6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`ZABER #${panel.order || panelIndex + 1}   [SCENA ${panel.scene || '1'} / ZABER ${panel.shot || panelIndex + 1}]`, x + 3, y + 5);

      // Kreslicí rámeček 16:9
      const frameX = x + 3;
      const frameY = y + 8;
      const frameW = colWidth - 6;
      const frameH = frameW * (9 / 16);

      doc.setFillColor(255, 255, 255);
      doc.rect(frameX, frameY, frameW, frameH, 'F');

      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.6);
      doc.rect(frameX, frameY, frameW, frameH, 'S');

      // Rohové optické značky L (pro přesnou detekci fotoaparátem)
      const markerSize = 4.5;
      const markerThick = 1.2;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(markerThick);

      // Horní levý
      doc.line(frameX, frameY, frameX + markerSize, frameY);
      doc.line(frameX, frameY, frameX, frameY + markerSize);

      // Horní pravý
      doc.line(frameX + frameW, frameY, frameX + frameW - markerSize, frameY);
      doc.line(frameX + frameW, frameY, frameX + frameW, frameY + markerSize);

      // Dolní levý
      doc.line(frameX, frameY + frameH, frameX + markerSize, frameY + frameH);
      doc.line(frameX, frameY + frameH, frameX, frameY + frameH - markerSize);

      // Dolní pravý
      doc.line(frameX + frameW, frameY + frameH, frameX + frameW - markerSize, frameY + frameH);
      doc.line(frameX + frameW, frameY + frameH, frameX + frameW, frameY + frameH - markerSize);

      // Vodící křížek uprostřed
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      const cx = frameX + frameW / 2;
      const cy = frameY + frameH / 2;
      doc.line(cx - 3, cy, cx + 3, cy);
      doc.line(cx, cy - 3, cx, cy + 3);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(210, 215, 220);
      doc.text('PLOCHA PRO KRESBU (16:9)', cx - 18, cy + 8);

      // Spodní část: QR kód a řádky
      const notesY = frameY + frameH + 3;
      const qrSize = 19;
      const qrX = x + colWidth - qrSize - 3;
      const qrY = notesY - 0.5;

      const scanUrl = getMobileScanUrl(roomId, panel.id);
      try {
        const qrDataUrl = await QRCode.toDataURL(scanUrl, {
          margin: 1,
          width: 140,
          errorCorrectionLevel: 'M'
        });
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(30, 41, 59);
        doc.text('SKENOVAT MOBIL', qrX + 1, qrY + qrSize + 2.5);
      } catch (e) {
        console.error('Chyba generování QR:', e);
      }

      const notesW = colWidth - qrSize - 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(80, 90, 105);

      doc.text('KAMERA:', x + 3, notesY + 3);
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.25);
      doc.line(x + 16, notesY + 3.2, x + 3 + notesW, notesY + 3.2);

      doc.text('DEJ:', x + 3, notesY + 9);
      doc.line(x + 16, notesY + 9.2, x + 3 + notesW, notesY + 9.2);
      doc.line(x + 3, notesY + 14.5, x + 3 + notesW, notesY + 14.5);

      doc.text('ZVUK:', x + 3, notesY + 20);
      doc.line(x + 14, notesY + 20.2, x + 3 + notesW, notesY + 20.2);
    }

    // Patička stránky
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 140, 155);
    doc.text(
      'Navod: 1. Nakreslete skicu do 16:9 ramecku  *  2. Namirte fotoaparat mobilu na QR kod  *  3. Automaticky orez a okamzity prenos do PC.',
      marginX,
      pageHeight - 5
    );
  }

  doc.save(`${projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Sablona_A4_${roomId}.pdf`);
}
