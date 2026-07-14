// === TooltipController Class ===
// Handles hover tooltips on resource nodes and connections.

export class TooltipController {
  constructor(canvas, nodes, edges) {
    this.canvas = canvas;
    this.nodes = nodes;
    this.edges = edges;
    this.tooltip = document.getElementById('arch-tooltip');
    this._init();
  }

  _init() {
    // Node tooltips
    document.querySelectorAll('.resource-node').forEach(el => {
      el.addEventListener('mouseenter', () => this._showNode(el));
      el.addEventListener('mousemove', (e) => this._position(e));
      el.addEventListener('mouseleave', () => this._hide());
      el.addEventListener('dblclick', () => this._hide());
    });

    // Connection tooltips
    document.querySelectorAll('line[data-from], path[data-from]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('mouseenter', () => this._showEdge(el));
      el.addEventListener('mousemove', (e) => this._position(e));
      el.addEventListener('mouseleave', () => this._hide());
    });
  }

  _showNode(el) {
    const node = this.nodes.find(n => n.id === el.id);
    if (!node || !node.detail) return;
    this.tooltip.innerHTML = `<h4>${node.label}${node.sublabel ? ' — ' + node.sublabel : ''}</h4><div class="tooltip-type">${node.detail.type}</div><div class="tooltip-detail">${node.detail.info.join('<br>')}</div>`;
    this.tooltip.classList.add('visible');
  }

  _showEdge(el) {
    const fromId = el.dataset.from;
    const toId = el.dataset.to;
    const edge = this.edges.find(e => e.from === fromId && e.to === toId);
    if (!edge || !edge.detail) return;

    const fromNode = this.nodes.find(n => n.id === fromId);
    const toNode = this.nodes.find(n => n.id === toId);
    const fromLabel = fromNode ? fromNode.label : fromId;
    const toLabel = toNode ? toNode.label : toId;

    const dirIcon = edge.detail.direction === 'bidirectional' ? '↔' : '→';
    const dirText = edge.detail.direction === 'bidirectional' ? 'Bidirectional' : 'Unidirectional';

    this.tooltip.innerHTML = `
      <h4>${fromLabel} ${dirIcon} ${toLabel}</h4>
      <div class="tooltip-type">Connection</div>
      <div class="tooltip-detail">
        Protocol: ${edge.detail.protocol}<br>
        Port: ${edge.detail.port}<br>
        Direction: ${dirText}<br>
        ${edge.detail.description}
      </div>`;
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
