/** Stößt den Download einer Textdatei im Browser an */
export function downloadText(
  content: string,
  filename: string,
  type = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
