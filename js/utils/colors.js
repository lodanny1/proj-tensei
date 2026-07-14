// === Color Utilities ===

export function lightenColor(hex, mix = 0.88) {
  if (!hex || !hex.startsWith('#')) return '#f5f5f5';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * mix);
  const lg = Math.round(g + (255 - g) * mix);
  const lb = Math.round(b + (255 - b) * mix);
  return `rgb(${lr},${lg},${lb})`;
}
