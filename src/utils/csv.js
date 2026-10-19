/** CSV for spreadsheet viewing. Quote fields and neutralize formula prefixes.
 * https://owasp.org/www-community/attacks/CSV_Injection
 * The tab is retained as data when a protected cell is imported as plain text.
 */
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text)) text = `\t${text}`;
  else if (/^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export const serializeCsv = (rows) => rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
