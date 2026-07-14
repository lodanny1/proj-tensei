// === AutoCenter Class ===
// Centers the canvas view on visible nodes after filtering.

export class AutoCenter {
  constructor(canvas, filterController) {
    this.canvas = canvas;
    this.filter = filterController;

    this.filter.onChange(() => {
      setTimeout(() => this.center(), 50);
    });
  }

  center() {
    const positions = this.filter.getVisibleNodePositions();
    if (positions.length === 0) return;

    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxX = Math.max(...positions.map(p => p.x));
    const maxY = Math.max(...positions.map(p => p.y));

    this.canvas.centerOnBounds(minX, minY, maxX, maxY, 120);
  }
}
