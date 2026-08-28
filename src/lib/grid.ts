export interface GridConfig {
  columns: number; // 1-12
  rows: number; // 1-6
  colGap: number; // px
  rowGap: number; // px
  colTemplate?: string; // e.g. "1fr 1fr 1fr" or "repeat(12, 1fr)"
  rowTemplate?: string;
}

export function buildGridCss(config: GridConfig): string {
  const lines: string[] = ['display: grid;'];
  if (config.colTemplate && config.colTemplate.trim()) {
    lines.push(`grid-template-columns: ${config.colTemplate.trim()};`);
  } else {
    lines.push(`grid-template-columns: repeat(${config.columns}, 1fr);`);
  }
  if (config.rowTemplate && config.rowTemplate.trim()) {
    lines.push(`grid-template-rows: ${config.rowTemplate.trim()};`);
  } else if (config.rows > 1) {
    lines.push(`grid-template-rows: repeat(${config.rows}, auto);`);
  }
  lines.push(`gap: ${config.rowGap}px ${config.colGap}px;`);
  return lines.join('\n');
}

export function previewCells(columns: number, rows: number): number {
  return columns * rows;
}
