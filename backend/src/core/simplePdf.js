function pdfEscape(value) {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function clip(value, maxChars) {
  const clean = pdfEscape(value);
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 1))}.`;
}

function cellText(value) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * One landscape A4 PDF of a report table. The same bytes open in a browser tab or download.
 */
export function buildTablePdf({ title, subtitle = '', rows = [] }) {
  const list = Array.isArray(rows) ? rows : [];
  const keys = list.length ? Object.keys(list[0]).slice(0, 10) : [];
  const header = keys.map((key) => key.replace(/_/g, ' '));
  const body = list.map((row) => keys.map((key) => cellText(row[key])));
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const fontSize = keys.length > 7 ? 6 : 8;
  const lineHeight = fontSize + 5;
  const colWidth = keys.length ? (pageWidth - margin * 2) / keys.length : pageWidth - margin * 2;
  const maxChars = Math.max(4, Math.floor(colWidth / (fontSize * 0.52)));
  const rowsPerPage = Math.max(1, Math.floor((pageHeight - margin * 2 - 48) / lineHeight));

  const chunks = body.length ? [] : [[]];
  for (let index = 0; index < body.length; index += rowsPerPage) {
    chunks.push(body.slice(index, index + rowsPerPage));
  }

  const streams = chunks.map((pageRows, pageIndex) => {
    const commands = ['BT', '/F1 12 Tf'];
    let y = pageHeight - margin;
    commands.push(`1 0 0 1 ${margin} ${y} Tm`);
    commands.push(`(${clip(title || 'Report', 90)}) Tj`);
    y -= 16;
    commands.push('/F1 8 Tf');
    commands.push(`1 0 0 1 ${margin} ${y} Tm`);
    commands.push(`(${clip(subtitle, 120)}) Tj`);
    y -= 18;
    commands.push(`/F1 ${fontSize} Tf`);
    header.forEach((label, index) => {
      const x = margin + index * colWidth;
      commands.push(`1 0 0 1 ${x.toFixed(1)} ${y} Tm`);
      commands.push(`(${clip(label, maxChars)}) Tj`);
    });
    y -= lineHeight;
    if (pageRows.length === 0 && pageIndex === 0) {
      commands.push(`1 0 0 1 ${margin} ${y} Tm`);
      commands.push('(No records in this range.) Tj');
    }
    for (const row of pageRows) {
      row.forEach((cell, index) => {
        const x = margin + index * colWidth;
        commands.push(`1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm`);
        commands.push(`(${clip(cell, maxChars)}) Tj`);
      });
      y -= lineHeight;
    }
    commands.push('ET');
    return commands.join('\n');
  });

  const objects = new Map();
  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let nextId = 4;
  const kids = [];
  for (const stream of streams) {
    const contentId = nextId++;
    const pageId = nextId++;
    const length = Buffer.byteLength(stream);
    objects.set(contentId, `<< /Length ${length} >>\nstream\n${stream}\nendstream`);
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
    kids.push(`${pageId} 0 R`);
  }
  objects.set(2, `<< /Type /Pages /Count ${kids.length} /Kids [${kids.join(' ')}] >>`);

  let output = '%PDF-1.4\n';
  const maxId = nextId - 1;
  const offsets = [0];
  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = Buffer.byteLength(output);
    output += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(output);
  output += `xref\n0 ${maxId + 1}\n`;
  output += '0000000000 65535 f \n';
  for (let id = 1; id <= maxId; id += 1) {
    output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer << /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(output);
}
