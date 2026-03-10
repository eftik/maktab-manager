/** Convert any Arabic-Indic digits (۰-۹ or ٠-٩) to Western 0-9 */
export const toWestern = (v: string | number): string => {
  return String(v).replace(/[۰-۹٠-٩]/g, d => {
    const code = d.charCodeAt(0);
    if (code >= 0x06F0 && code <= 0x06F9) return String(code - 0x06F0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return d;
  });
};

/** Format number with AFN symbol, always Western digits */
export const fmtAFN = (n: number | undefined | null): string => `؋${toWestern((n ?? 0).toLocaleString('en-US'))}`;

/** Generate CSV from rows */
export const toCSV = (headers: string[], rows: string[][]): string => {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
};

/** Download a string as a file */
export const downloadFile = (content: string, filename: string, type = 'text/csv;charset=utf-8;') => {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/** Open printable HTML in new window */
export const printHTML = (title: string, bodyHTML: string) => {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;padding:32px;direction:ltr}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f5f5f5} h1{font-size:20px;margin-bottom:8px}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
    </style></head><body>${bodyHTML}</body></html>`);
  w.document.close();
  w.print();
};

export const uid = () => crypto.randomUUID();

/** Parse a numeric input value, converting Arabic/Indic digits to Western and returning the number */
export const parseNumInput = (v: string): number => Number(toWestern(v)) || 0;

/** Display a numeric value for input fields - show empty string for 0 */
export const numDisplay = (v: number): string => v ? String(v) : '';
