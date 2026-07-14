// === Canvas Class ===
// Owns the SVG element, viewBox state, zoom, and pan.

export class Canvas {
  constructor(svgSelector, containerSelector) {
    this.svg = document.querySelector(svgSelector);
    this.container = document.querySelector(containerSelector);
    this.viewBox = { x: 0, y: 0, w: 1800, h: 1400 };
    this.scale = 1;
    this.minScale = 0.3;
    this.maxScale = 4;
    this._isPanning = false;
    this._startPoint = { x: 0, y: 0 };

    this._initPan();
    this._initWheel();
  }

  setViewBox(x, y, w, h) {
    this.viewBox = { x, y, w, h };
    this._applyViewBox();
  }

  getViewBox() {
    return { ...this.viewBox };
  }

  zoomIn() { this._zoom(1.15); }
  zoomOut() { this._zoom(0.85); }
  zoomReset(w = 1800, h = 1400) {
    this.scale = 1;
    this.viewBox = { x: 0, y: 0, w, h };
    this._applyViewBox();
  }

  fitToContent(positions, padding = 120) {
    const allPos = Object.values(positions);
    if (allPos.length === 0) return;
    const minX = Math.min(...allPos.map(p => p.x)) - padding;
    const minY = Math.min(...allPos.map(p => p.y)) - padding;
    const maxX = Math.max(...allPos.map(p => p.x)) + padding + 40;
    const maxY = Math.max(...allPos.map(p => p.y)) + padding + 40;
    this.setViewBox(minX, minY, maxX - minX, maxY - minY);
  }

  centerOnBounds(minX, minY, maxX, maxY, padding = 120) {
    this.setViewBox(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2);
    this.scale = 1800 / this.viewBox.w;
    this._updateZoomLabel();
  }

  _applyViewBox() {
    this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
    this._updateZoomLabel();
  }

  _updateZoomLabel() {
    const label = document.getElementById('zoom-level');
    if (label) label.textContent = Math.round(this.scale * 100) + '%';
  }

  _zoom(factor, clientX, clientY) {
    const newScale = this.scale * factor;
    if (newScale < this.minScale || newScale > this.maxScale) return;

    const rect = this.container.getBoundingClientRect();
    const cx = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const cy = clientY !== undefined ? clientY - rect.top : rect.height / 2;

    const svgX = this.viewBox.x + (cx / rect.width) * this.viewBox.w;
    const svgY = this.viewBox.y + (cy / rect.height) * this.viewBox.h;

    const newW = 1800 / newScale;
    const newH = 1400 / newScale;

    this.viewBox.x = svgX - (cx / rect.width) * newW;
    this.viewBox.y = svgY - (cy / rect.height) * newH;
    this.viewBox.w = newW;
    this.viewBox.h = newH;
    this.scale = newScale;
    this._applyViewBox();
  }

  _initWheel() {
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.05 : 0.95;
      this._zoom(factor, e.clientX, e.clientY);
    }, { passive: false });
  }

  _initPan() {
    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.resource-node, .zoom-controls')) return;
      this._isPanning = true;
      this._startPoint = { x: e.clientX, y: e.clientY };
      this.container.style.cursor = 'grabbing';
    });
    this.container.addEventListener('mousemove', (e) => {
      if (!this._isPanning) return;
      const rect = this.container.getBoundingClientRect();
      const dx = (e.clientX - this._startPoint.x) / rect.width * this.viewBox.w;
      const dy = (e.clientY - this._startPoint.y) / rect.height * this.viewBox.h;
      this.viewBox.x -= dx;
      this.viewBox.y -= dy;
      this._startPoint = { x: e.clientX, y: e.clientY };
      this._applyViewBox();
    });
    this.container.addEventListener('mouseup', () => { this._isPanning = false; this.container.style.cursor = 'grab'; });
    this.container.addEventListener('mouseleave', () => { this._isPanning = false; this.container.style.cursor = 'grab'; });
  }
}
