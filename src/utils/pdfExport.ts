import jsPDF from 'jspdf';
import { StoryboardProject } from '../types/storyboard';

interface ExportPresentationOptions {
  project: StoryboardProject;
  layout?: '2-per-page' | '4-per-page';
}

export async function exportPresentationPDF(options: ExportPresentationOptions): Promise<void> {
  const { project, layout = '2-per-page' } = options;
  const panels = project.panels || [];

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 14;
  const marginTop = 18;

  const panelsPerPage = layout === '2-per-page' ? 2 : 4;
  const totalPages = Math.max(1, Math.ceil(panels.length / panelsPerPage));

  // ==========================================
  // 1. TITULNÍ LIST (ČISTÝ ČERNO-BÍLÝ DESIGN)
  // ==========================================
  doc.setFillColor(0, 0, 0); // Čistě černá
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Bílý dvojitý rámeček
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.rect(marginX, 12, pageWidth - marginX * 2, pageHeight - 24, 'S');

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.rect(marginX + 2, 14, pageWidth - marginX * 2 - 4, pageHeight - 28, 'S');

  // Bílý štítek klapky
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + 8, 20, 50, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('STORYBOARD', marginX + 11, 25);

  // Hlavní název filmu (pouze pokud je vyplněn uživatelem)
  const displayTitle = (project.title || '').trim();
  if (displayTitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text(displayTitle.toUpperCase(), marginX + 8, 45);
  }

  // Režisér / Výtvarník (pouze pokud je vyplněn uživatelem)
  const displayDirector = (project.director || '').trim();
  if (displayDirector) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(200, 200, 200);
    doc.text(`REZIE / VYTVARNIK: ${displayDirector.toUpperCase()}`, marginX + 8, 56);
  }

  // Dělící čára
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.4);
  doc.line(marginX + 8, 62, pageWidth - marginX - 8, 62);

  // Černobílá tabulka specifikací
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text('PARAMETRY PRODUKCE', marginX + 8, 72);

  const specs = [
    { label: 'FORMAT OBRAZU', value: project.aspectRatio || '16:9' },
    { label: 'POCET ZABERU', value: `${panels.length} zaberu` },
    { label: 'DATUM', value: project.date || new Date().toISOString().split('T')[0] },
    { label: 'METODA', value: 'LiveSync Auto-Crop' },
  ];

  specs.forEach((s, idx) => {
    const colX = marginX + 8 + idx * 65;
    const cardY = 78;
    doc.setFillColor(20, 20, 20);
    doc.roundedRect(colX, cardY, 60, 22, 1.5, 1.5, 'F');
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.3);
    doc.roundedRect(colX, cardY, 60, 22, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(s.label, colX + 4, cardY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(s.value, colX + 4, cardY + 15);
  });

  // ==========================================
  // 2. STRÁNKY SE ZÁBĚRY (ČISTÝ BÍLÝ PAPÍR S ČERNOU TYPOGRAFIÍ)
  // ==========================================
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    doc.addPage();

    // Čisté bílé pozadí
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Černá horní lišta
    doc.setFillColor(0, 0, 0);
    doc.rect(marginX, 8, pageWidth - marginX * 2, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${(project.title || 'STORYBOARD').toUpperCase()}`, marginX + 4, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 220, 220);
    doc.text(`REZIE: ${project.director || '-'}   |   STRANA ${pageIdx + 1} Z ${totalPages}`, pageWidth - marginX - 55, 13);

    const startIdx = pageIdx * panelsPerPage;
    const currentPanels = panels.slice(startIdx, startIdx + panelsPerPage);

    if (layout === '2-per-page') {
      const cardW = (pageWidth - marginX * 2 - 10) / 2;
      const cardH = 175;
      const gap = 10;

      for (let i = 0; i < currentPanels.length; i++) {
        const p = currentPanels[i];
        const cardX = marginX + i * (cardW + gap);
        const cardY = marginTop + 4;

        // Černý obrys karty
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(cardX, cardY, cardW, cardH, 'S');

        // Černý štítek záběru
        doc.setFillColor(245, 245, 245);
        doc.rect(cardX, cardY, cardW, 7, 'F');
        doc.line(cardX, cardY + 7, cardX + cardW, cardY + 7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`ZABER #${p.order || startIdx + i + 1}   [SCENA ${p.scene || '-'} / ZABER ${p.shot || startIdx + i + 1}]`, cardX + 4, cardY + 5);

        // Kreslicí plocha 16:9
        const imgW = cardW - 8;
        const imgH = imgW * (9 / 16);
        const imgX = cardX + 4;
        const imgY = cardY + 11;

        doc.setFillColor(250, 250, 250);
        doc.rect(imgX, imgY, imgW, imgH, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(imgX, imgY, imgW, imgH, 'S');

        if (p.imageUrl) {
          try {
            doc.addImage(p.imageUrl, 'JPEG', imgX, imgY, imgW, imgH);
          } catch (e) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('[Chyba formatu]', imgX + imgW / 2 - 12, imgY + imgH / 2);
          }
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(170, 170, 170);
          doc.text('[Prazdne]', imgX + imgW / 2 - 8, imgY + imgH / 2);
        }

        let curY = imgY + imgH + 6;

        // Kamera a pohyb
        doc.setFillColor(245, 245, 245);
        doc.rect(cardX + 4, curY, cardW - 8, 10, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(cardX + 4, curY, cardW - 8, 10, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text('KAMERA:', cardX + 6, curY + 4);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const camParts = [p.cameraType, p.cameraMovement].filter(Boolean);
        doc.text(camParts.join(' * ') || '-', cardX + 6, curY + 8);

        curY += 14;

        // Akce a děj
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text('DEJ A AKCE:', cardX + 4, curY);
        curY += 3.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);
        const actionLines = doc.splitTextToSize(p.action || '-', cardW - 8);
        doc.text(actionLines.slice(0, 5), cardX + 4, curY);

        curY += Math.min(actionLines.length, 5) * 4 + 4;

        // Dialog a zvuk
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text('DIALOG / ZVUK:', cardX + 4, curY);
        curY += 3.5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);
        const audioLines = doc.splitTextToSize(p.dialogue || '-', cardW - 8);
        doc.text(audioLines.slice(0, 4), cardX + 4, curY);
      }
    } else {
      // 4 na stránku (2x2)
      const colW = (pageWidth - marginX * 2 - 8) / 2;
      const rowH = (pageHeight - marginTop - 18) / 2;

      for (let i = 0; i < currentPanels.length; i++) {
        const p = currentPanels[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cX = marginX + col * (colW + 8);
        const cY = marginTop + 4 + row * rowH;

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(cX, cY, colW, rowH - 4, 'S');

        const imgW = colW * 0.52;
        const imgH = imgW * (9 / 16);
        const imgX = cX + 3;
        const imgY = cY + 3;

        if (p.imageUrl) {
          try {
            doc.addImage(p.imageUrl, 'JPEG', imgX, imgY, imgW, imgH);
          } catch (e) {
            // ignore
          }
        } else {
          doc.setFillColor(245, 245, 245);
          doc.rect(imgX, imgY, imgW, imgH, 'F');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(170, 170, 170);
          doc.text('[Prazdne]', imgX + 8, imgY + imgH / 2);
        }

        const textX = imgX + imgW + 4;
        const textW = colW - (imgW + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(`ZABER #${p.order || startIdx + i + 1}`, textX, imgY + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(80, 80, 80);
        doc.text(`SCENA: ${p.scene || '-'}  ZABER: ${p.shot || startIdx + i + 1}`, textX, imgY + 9);
        doc.text(`KAMERA: ${p.cameraType || '-'}`, textX, imgY + 14);

        doc.setFont('helvetica', 'bold');
        doc.text('DEJ:', textX, imgY + 20);
        doc.setFont('helvetica', 'normal');
        const actLines = doc.splitTextToSize(p.action || '-', textW - 4);
        doc.text(actLines.slice(0, 3), textX + 8, imgY + 20);
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Storyboard LiveSync  *  ${project.title || 'Storyboard'}  *  Strana ${pageIdx + 1} z ${totalPages}`,
      marginX,
      pageHeight - 6
    );
  }

  const safeFilename = (project.title || 'Storyboard').replace(/[^a-zA-Z0-9]/g, '_') || 'Storyboard';
  doc.save(`${safeFilename}_Prezentace.pdf`);
}
