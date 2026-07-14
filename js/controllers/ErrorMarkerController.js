// === ErrorMarkerController Class ===
// Adds/removes error markers (red X) on topology nodes and edges.
// Hover shows error details (title, logs, metrics).
// Independent of chat and cases — purely visual layer.

export class ErrorMarkerController {
  constructor(canvas, positions, nodes) {
    this.canvas = canvas;
    this.positions = positions;
    this.nodes = nodes || []; // full node list for group resolution
    this.markers = new Map(); // id → { nodeId, data }
    this.tooltip = document.getElementById('arch-tooltip');
  }

  // Resolve a nodeId to a visible position — falls back to group node if collapsed
  _resolvePosition(nodeId) {
    if (this.positions[nodeId]) return { id: nodeId, pos: this.positions[nodeId] };
    // Node not in positions — check if it's in a collapsed group
    const node = this.nodes.find(n => n.id === nodeId);
    if (node && node.group && this.positions[node.group]) {
      return { id: node.group, pos: this.positions[node.group] };
    }
    console.warn(`ErrorMarkerController: cannot resolve position for "${nodeId}"`);
    return null;
  }

  // Add an error marker to a node
  addNodeError(nodeId, data) {
    const resolved = this._resolvePosition(nodeId);
    if (!resolved) return;

    const pos = resolved.pos;
    const markerId = `error-${nodeId}`;
    if (this.markers.has(markerId)) return; // already showing

    const svg = this.canvas.svg;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', markerId);
    g.setAttribute('class', 'error-marker');
    g.setAttribute('transform', `translate(${pos.x + 35}, ${pos.y - 30})`);
    g.innerHTML = `
      <circle r="14" fill="#d91515" opacity="0.2"/>
      <circle r="9" fill="#d91515"/>
      <text x="0" y="4" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">✕</text>
    `;

    // Hover tooltip
    g.addEventListener('mouseenter', () => {
      let html = `<h4 style="color:#d91515">${data.title}</h4>`;
      html += `<div class="tooltip-type">ERROR</div>`;
      html += `<div class="tooltip-detail">`;
      if (data.logs && data.logs.length) {
        html += `<strong>Logs:</strong><br>`;
        data.logs.forEach(log => { html += `<code style="font-size:11px;color:#d91515">${log}</code><br>`; });
      }
      if (data.metric) {
        html += `<br><strong>Metric:</strong> ${data.metric}`;
      }
      if (data.suggestion) {
        html += `<br><br><strong>Possible cause:</strong> ${data.suggestion}`;
      }
      html += `</div>`;
      this.tooltip.innerHTML = html;
      this.tooltip.classList.add('visible');
    });

    g.addEventListener('mousemove', (e) => {
      const rect = this.canvas.container.getBoundingClientRect();
      let x = e.clientX - rect.left + 16;
      let y = e.clientY - rect.top + 16;
      if (x + 310 > rect.width) x = e.clientX - rect.left - 320;
      if (y + 200 > rect.height) y = e.clientY - rect.top - 120;
      this.tooltip.style.left = x + 'px';
      this.tooltip.style.top = y + 'px';
    });

    g.addEventListener('mouseleave', () => {
      this.tooltip.classList.remove('visible');
    });

    svg.appendChild(g);
    this.markers.set(markerId, { nodeId, data, element: g });
  }

  // Add an error marker on an edge (between two nodes)
  addEdgeError(fromId, toId, data) {
    const resolvedFrom = this._resolvePosition(fromId);
    const resolvedTo = this._resolvePosition(toId);
    if (!resolvedFrom || !resolvedTo) return;

    const markerId = `error-${fromId}-${toId}`;
    if (this.markers.has(markerId)) return;

    const mx = (resolvedFrom.pos.x + resolvedTo.pos.x) / 2;
    const my = (resolvedFrom.pos.y + resolvedTo.pos.y) / 2;

    const svg = this.canvas.svg;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', markerId);
    g.setAttribute('class', 'error-marker');
    g.setAttribute('transform', `translate(${mx}, ${my})`);
    g.innerHTML = `
      <circle r="14" fill="#d91515" opacity="0.2"/>
      <circle r="9" fill="#d91515"/>
      <text x="0" y="4" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">✕</text>
    `;

    g.addEventListener('mouseenter', () => {
      let html = `<h4 style="color:#d91515">${data.title}</h4>`;
      html += `<div class="tooltip-type">CONNECTION ERROR</div>`;
      html += `<div class="tooltip-detail">`;
      if (data.logs && data.logs.length) {
        html += `<strong>Logs:</strong><br>`;
        data.logs.forEach(log => { html += `<code style="font-size:11px;color:#d91515">${log}</code><br>`; });
      }
      if (data.metric) {
        html += `<br><strong>Metric:</strong> ${data.metric}`;
      }
      if (data.suggestion) {
        html += `<br><br><strong>Possible cause:</strong> ${data.suggestion}`;
      }
      html += `</div>`;
      this.tooltip.innerHTML = html;
      this.tooltip.classList.add('visible');
    });

    g.addEventListener('mousemove', (e) => {
      const rect = this.canvas.container.getBoundingClientRect();
      let x = e.clientX - rect.left + 16;
      let y = e.clientY - rect.top + 16;
      if (x + 310 > rect.width) x = e.clientX - rect.left - 320;
      if (y + 200 > rect.height) y = e.clientY - rect.top - 120;
      this.tooltip.style.left = x + 'px';
      this.tooltip.style.top = y + 'px';
    });

    g.addEventListener('mouseleave', () => {
      this.tooltip.classList.remove('visible');
    });

    // Also highlight the edge line in red
    const edgeLine = this.canvas.svg.querySelector(`[data-from="${resolvedFrom.id}"][data-to="${resolvedTo.id}"]`)
      || this.canvas.svg.querySelector(`[data-from="${fromId}"][data-to="${toId}"]`);
    if (edgeLine) {
      edgeLine.setAttribute('stroke', '#d91515');
      edgeLine.setAttribute('stroke-dasharray', '6 3');
      edgeLine.classList.add('error-edge');
    }

    svg.appendChild(g);
    this.markers.set(markerId, { fromId, toId, data, element: g, edgeLine });
  }

  // Remove an error marker
  removeNodeError(nodeId) {
    const markerId = `error-${nodeId}`;
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.element.remove();
      this.markers.delete(markerId);
    }
  }

  removeEdgeError(fromId, toId) {
    const markerId = `error-${fromId}-${toId}`;
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.element.remove();
      // Restore edge color
      if (marker.edgeLine) {
        marker.edgeLine.removeAttribute('stroke-dasharray');
        marker.edgeLine.classList.remove('error-edge');
        const isDashed = marker.edgeLine.classList.contains('dashed');
        marker.edgeLine.setAttribute('stroke', isDashed ? '#687078' : '#0972d3');
      }
      this.markers.delete(markerId);
    }
  }

  // Clear all markers
  clearAll() {
    this.markers.forEach((marker, id) => {
      marker.element.remove();
      if (marker.edgeLine) {
        marker.edgeLine.removeAttribute('stroke-dasharray');
        marker.edgeLine.classList.remove('error-edge');
      }
    });
    this.markers.clear();
  }

  // Get all active errors
  getActiveErrors() {
    return Array.from(this.markers.values()).map(m => m.data);
  }
}
