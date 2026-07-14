// === TooltipController Class ===
// Handles hover tooltips on resource nodes.

export class TooltipController {
  constructor(canvas, nodes) {
    this.canvas = canvas;
    this.nodes = nodes;
    this.tooltip = document.getElementById('arch-tooltip');
    this._init();
  }

  _init() {
    document.querySelectorAll('.resource-node').forEach(el => {
      el.addEventListener('mouseenter', () => this._show(el));
      el.addEventListener('mousemove', (e) => this._position(e));
      el.addEventListener('mouseleave', () => this._hide());
    });
  }

  _show(el) {
    const node = this.nodes.find(n => n.id === el.id);
    if (!node || !node.detail) return;
    this.tooltip.innerHTML = `<h4>${node.label}${node.sublabel ? ' — ' + node.sublabel : ''}</h4><div class="tooltip-type">${node.detail.type}</div><div class="tooltip-detail">${node.detail.info.join('<br>')}</div>`;
    this.tooltip.classList.add('visible');
  }

  _position(e) {
    const rect = this.canvas.container.getBoundingClientRect();
    let x = e.clientX - rect.left + 16;
    let y = e.clientY - rect.top + 16;
    if (x + 310 > rect.width) x = e.clientX - rect.left - 320;
    if (y + 200 > rect.height) y = e.clientY - rect.top - 120;
    this.tooltip.style.left = x + 'px';
    this.tooltip.style.top = y + 'px';
  }

  _hide() {
    this.tooltip.classList.remove('visible');
  }
}
