import jsPDF from 'jspdf';
import { StoryboardPanel } from '../types/storyboard';

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

  const hasProjectHeader = !!(projectTitle.trim() || director.trim());
  const marginTop = hasProjectHeader ? 16 : 10;

  const totalPanels = panels.length > 0 ? panels.length : 6;
  const totalPages = Math.ceil(totalPanels / panelsPerPage);

  const colCount = 2;
  const colWidth = (pageWidth - marginX * 2 - 8) / 2;
  const panelHeight = 84;
  const gapX = 8;
  const gapY = 6;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage();
    }

    // Volitelná minimalistická hlavička pouze pokud uživatel zadal název projektu nebo režiséra
    if (hasProjectHeader) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      if (projectTitle.trim()) {
        doc.text(projectTitle.trim().toUpperCase(), marginX, 10);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      if (director.trim()) {
        doc.text(`REZIE: ${director.trim().toUpperCase()}`, marginX + 70, 10);
      }
    }

    // Číslo stránky (pokud je vícestránkový dokument)
    if (totalPages > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text(`${pageIdx + 1} / ${totalPages}`, pageWidth - marginX - 10, 10);
    }

    // Kreslení jednotlivých políček záběrů
    const startIdx = pageIdx * panelsPerPage;

    for (let i = 0; i < panelsPerPage; i++) {
      const panelIndex = startIdx + i;
      if (panelIndex >= totalPanels) break;

      const panel = panels[panelIndex] || {
        id: `panel-${panelIndex + 1}`,
        order: panelIndex + 1,
        scene: '1',
        shot: `${panelIndex + 1}`,
        cameraType: '',
        cameraMovement: '',
        action: '',
        dialogue: ''
      };

      const col = i % colCount;
      const row = Math.floor(i / colCount);

      const x = marginX + col * (colWidth + gapX);
      const y = marginTop + row * (panelHeight + gapY);

      // Ohraničení políčka
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, colWidth, panelHeight, 1.5, 1.5, 'S');

      // Záhlaví políčka (číslo záběru a scény)
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

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
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
      doc.line(frameX + frameW, frameY + frameH, frameX + frameW - markerSize, frameY + frameH);

      // Jemný vodící křížek uprostřed rámečku
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      const cx = frameX + frameW / 2;
      const cy = frameY + frameH / 2;
      doc.line(cx - 3, cy, cx + 3, cy);
      doc.line(cx, cy - 3, cx, cy + 3);

      // Spodní část: Řádky pro text poznámek (plná šířka bez QR kódu)
      const notesY = frameY + frameH + 3.5;
      const notesW = colWidth - 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(40, 40, 40);

      // Řádek pro kameru
      doc.text('KAMERA:', x + 3, notesY + 3);
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.25);
      doc.line(x + 18, notesY + 3.2, x + notesW, notesY + 3.2);

      // Řádky pro děj a akci
      doc.text('DEJ:', x + 3, notesY + 9.5);
      doc.line(x + 12, notesY + 9.7, x + notesW, notesY + 9.7);
      doc.line(x + 3, notesY + 15, x + notesW, notesY + 15);

      // Řádek pro zvuk a dialog
      doc.text('ZVUK:', x + 3, notesY + 21);
      doc.line(x + 14, notesY + 21.2, x + notesW, notesY + 21.2);
    }
  }

  const safeFilename = projectTitle.trim() ? projectTitle.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'Storyboard';
  doc.save(`${safeFilename}_Sablona_A4_${roomId}.pdf`);
}
