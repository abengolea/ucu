import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { getSiteUrl } from '@/lib/seo';
import { normalizeInformeStatsSnapshot } from '@/lib/informe-data';
import type { InformePedido } from '@/types/informes';

const COLORS = {
  blue: '#0066B3',
  blueDark: '#004A80',
  blueSoft: '#EAF4FB',
  magenta: '#E6007E',
  green: '#79AD35',
  yellow: '#FDB913',
  ink: '#30343B',
  muted: '#68727D',
  faint: '#8A949E',
  border: '#DCE3E8',
  surface: '#F5F8FA',
  white: '#FFFFFF',
} as const;

function formatDateEs(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

function formatPrecioArs(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCausaLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '—';
  if (trimmed === trimmed.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
    const lower = trimmed.toLocaleLowerCase('es-AR');
    return lower.charAt(0).toLocaleUpperCase('es-AR') + lower.slice(1);
  }
  return trimmed;
}

function drawMetric(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  accent: string
) {
  doc.roundedRect(x, y, width, 58, 7).fill(COLORS.surface);
  doc.roundedRect(x, y, 4, 58, 2).fill(accent);
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5).text(label, x + 15, y + 12, {
    width: width - 25,
    characterSpacing: 0.4,
  });
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(17).text(value, x + 15, y + 29, {
    width: width - 25,
  });
}

/** Fila de causa completa. Devuelve altura usada. */
function drawCausaRow(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  count: number,
  total: number,
  rank: number
): number {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const accent = rank === 0 ? COLORS.magenta : rank === 1 ? COLORS.blue : COLORS.green;
  const labelText = formatCausaLabel(label);
  const labelWidth = width - 54;

  doc.font('Helvetica').fontSize(8.5);
  const labelHeight = Math.min(24, doc.heightOfString(labelText, { width: labelWidth, lineGap: 1 }));

  doc
    .fillColor(COLORS.faint)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(String(rank + 1).padStart(2, '0'), x, y + 1, { width: 18 });

  doc
    .fillColor(COLORS.ink)
    .font('Helvetica')
    .fontSize(8.5)
    .text(labelText, x + 22, y, {
      width: labelWidth,
      height: 24,
      lineGap: 1,
    });

  const barY = y + labelHeight + 3;
  const barMax = width - 54;
  const barWidth = Math.max(0, barMax * (percentage / 100));

  doc.roundedRect(x + 22, barY, barMax, 5, 2.5).fill('#E7EDF1');
  if (barWidth > 0) {
    doc.roundedRect(x + 22, barY, barWidth, 5, 2.5).fill(accent);
  }

  doc
    .fillColor(COLORS.muted)
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .text(`${count} · ${percentage}%`, x + width - 48, barY - 1, {
      width: 48,
      align: 'right',
    });

  return labelHeight + 14;
}

export async function buildInformePdfBuffer(pedido: InformePedido): Promise<Buffer> {
  const siteUrl = getSiteUrl();
  const verifyUrl = `${siteUrl}/verificar/${pedido.codigo}`;
  const logoPath = path.join(process.cwd(), 'public', 'brand', 'logo-ucu.png');
  const stats = normalizeInformeStatsSnapshot(pedido.statsSnapshot);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 36, left: 50, right: 50 },
      info: {
        Title: `Informe de reclamos — ${pedido.empresaNombre}`,
        Author: 'Usuarios y Consumidores Unidos (UCU)',
        Subject: `Certificado ${pedido.codigo}`,
        Creator: 'ucu.org.ar',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const addPage = doc.addPage.bind(doc);
    doc.addPage = (() => doc) as typeof doc.addPage;

    const left = 50;
    const contentWidth = doc.page.width - left * 2;
    const emittedAt = formatDateEs(pedido.readyAt || new Date().toISOString());
    const total = stats.total;
    const causas = stats.porCausa.slice(0, 5);
    let cursorY = 305;

    doc.rect(0, 0, doc.page.width, 8).fill(COLORS.blue);
    doc.rect(0, 8, 9, 58).fill(COLORS.magenta);
    doc.rect(9, 8, 9, 58).fill(COLORS.yellow);
    doc.rect(18, 8, 9, 58).fill(COLORS.green);
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, left, 22, { fit: [145, 66], valign: 'center' });
    } else {
      doc.fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(22).text('UCU', left, 31);
    }
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text('INFORME ESTADÍSTICO CERTIFICADO', 340, 28, {
        width: contentWidth - 290,
        align: 'right',
        characterSpacing: 0.7,
      });
    doc
      .fillColor(COLORS.ink)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(pedido.codigo, 340, 43, { width: contentWidth - 290, align: 'right' });
    doc.moveTo(left, 93).lineTo(left + contentWidth, 93).lineWidth(0.7).stroke(COLORS.border);

    doc
      .fillColor(COLORS.blueDark)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('RECLAMOS RECIBIDOS POR UCU', left, 108, { characterSpacing: 0.8 });
    doc
      .fillColor(COLORS.ink)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(pedido.empresaNombre, left, 124, {
        width: contentWidth,
        height: 36,
        ellipsis: true,
        lineGap: 1,
      });
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        `Empresa #${pedido.empresaId} en el catálogo UCU  ·  Emitido el ${emittedAt}`,
        left,
        164,
        { width: contentWidth }
      );

    const metricGap = 10;
    const metricWidth = (contentWidth - metricGap * 2) / 3;
    drawMetric(doc, left, 188, metricWidth, 'RECLAMOS REGISTRADOS', String(total), COLORS.magenta);
    drawMetric(
      doc,
      left + metricWidth + metricGap,
      188,
      metricWidth,
      'DESDE',
      formatDateEs(stats.rangoFechas.desde),
      COLORS.blue
    );
    drawMetric(
      doc,
      left + (metricWidth + metricGap) * 2,
      188,
      metricWidth,
      'HASTA',
      formatDateEs(stats.rangoFechas.hasta),
      COLORS.green
    );

    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11).text('Principales causas de reclamo', left, 268);
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(8)
      .text('Motivos tipificados en los reclamos recibidos por UCU contra esta empresa.', left, 285);

    cursorY = 305;
    if (causas.length === 0) {
      doc
        .fillColor(COLORS.muted)
        .font('Helvetica-Oblique')
        .fontSize(9)
        .text('No hay causas tipificadas disponibles para este universo.', left, cursorY);
      cursorY += 22;
    } else {
      causas.forEach((item, index) => {
        const used = drawCausaRow(
          doc,
          left,
          cursorY,
          contentWidth,
          item.causa,
          item.count,
          total,
          index
        );
        cursorY += used;
      });
      cursorY += 8;
    }

    if (stats.temas?.length) {
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text('Temas recurrentes', left, cursorY);
      cursorY += 13;
      const temasText = stats.temas.slice(0, 4).map((t) => `• ${t}`).join('  ');
      doc
        .fillColor(COLORS.muted)
        .font('Helvetica')
        .fontSize(8)
        .text(temasText, left, cursorY, {
          width: contentWidth,
          height: 18,
          lineBreak: false,
          ellipsis: true,
        });
      cursorY += 26;
    }

    if (stats.sintesis?.trim()) {
      const boxTop = cursorY;
      const boxHeight = 84;
      const sintesis = stats.sintesis.trim().slice(0, 420);
      doc.roundedRect(left, boxTop, contentWidth, boxHeight, 9).fill(COLORS.surface);
      doc
        .fillColor(COLORS.blueDark)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Lectura para el consumidor', left + 14, boxTop + 10);
      doc
        .fillColor(COLORS.ink)
        .font('Helvetica')
        .fontSize(7.8)
        .text(sintesis, left + 14, boxTop + 24, {
          width: contentWidth - 28,
          height: 50,
          align: 'justify',
          lineGap: 1.5,
          ellipsis: true,
        });
      cursorY = boxTop + boxHeight + 10;
    }

    const certY = Math.min(cursorY, 660);
    doc.roundedRect(left, certY, contentWidth, 72, 9).fill(COLORS.blueSoft);
    doc.circle(left + 26, certY + 24, 12).fill(COLORS.blue);
    doc
      .moveTo(left + 20, certY + 24)
      .lineTo(left + 24, certY + 28)
      .lineTo(left + 32, certY + 18)
      .lineWidth(1.8)
      .lineCap('round')
      .lineJoin('round')
      .stroke(COLORS.white);
    doc
      .fillColor(COLORS.blueDark)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text('Emisión certificada por UCU', left + 48, certY + 10);
    doc
      .fillColor(COLORS.ink)
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        'Documento generado automáticamente. En la página de verificación vas a ver este PDF y su huella SHA-256:',
        left + 48,
        certY + 26,
        { width: contentWidth - 64 }
      );
    doc
      .fillColor(COLORS.blue)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(verifyUrl, left + 48, certY + 46, {
        width: contentWidth - 64,
        link: verifyUrl,
        underline: true,
      });
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(7)
      .text(`Ref. ${pedido.codigo}  ·  ${formatPrecioArs(pedido.precioCents)}`, left + 48, certY + 58);

    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(6.8)
      .text(
        'Alcance: estadística agregada y anonimizada de reclamos recibidos por UCU. No es sentencia judicial ni determina responsabilidad legal. El uso del informe es responsabilidad del solicitante.',
        left,
        742,
        { width: contentWidth, align: 'justify', lineGap: 1.2 }
      );

    const footerY = 775;
    doc.moveTo(left, footerY).lineTo(left + contentWidth, footerY).lineWidth(0.7).stroke(COLORS.border);
    doc
      .fillColor(COLORS.faint)
      .font('Helvetica')
      .fontSize(7)
      .text('Usuarios y Consumidores Unidos · ucu.org.ar', left, footerY + 8);
    doc
      .font('Helvetica-Bold')
      .text(pedido.codigo, left + contentWidth - 130, footerY + 8, {
        width: 130,
        align: 'right',
      });

    doc.end();
  });
}
