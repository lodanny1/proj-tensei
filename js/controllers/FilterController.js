// === FilterController Class ===
// Manages region/AZ filtering. Auto-populates AZ dropdown from data.

export class FilterController {
  constructor(canvas, nodes) {
    this.canvas = canvas;
    this.nodes = nodes;
    this.regionSelect = document.getElementById('region-select');
    this.azSelect = document.getElementById('az-select');
    this._listeners = [];

    this._populateAZOptions();
    this.regionSelect.addEventListener('change', () => { this._populateAZOptions(); this.apply(); this._notify(); });
    this.azSelect.addEventListener('change', () => { this.apply(); this._notify(); });
  }

  get region() { return this.regionSelect.value; }
  get az() { return this.azSelect.value; }

  // Subscribe to filter changes
  onChange(callback) {
    this._listeners.push(callback);
  }

  apply() {
    const region = this.region;
    const az = this.az;

    // 1. Determine visible nodes
    // Global services always visible
    const visibleNodes = new Set();
    document.querySelectorAll('.resource-node').forEach(node => {
      let show = true;
      const nodeRegion = node.dataset.region;

      // Global services always show
      if (nodeRegion === 'global') {
        show = true;
      } else if (region !== 'global' && nodeRegion !== region) {
        show = false;
      }

      // AZ filter
      if (show && az !== 'all' && node.dataset.az && node.dataset.az !== az) {
        show = false;
      }

      node.style.display = show ? '' : 'none';
      if (show) visibleNodes.add(node.id);
    });

    // 2. Structural elements
    document.querySelectorAll('[data-region]:not(.resource-node):not([data-from])').forEach(el => {
      let show = true;
      const elRegion = el.dataset.region;

      if (elRegion === 'global') {
        show = true;
      } else if (region !== 'global') {
        if (elRegion === 'cross-region') show = false;
        else if (elRegion !== region) show = false;
      }

      if (show && az !== 'all' && el.dataset.az && el.dataset.az !== az) show = false;
      el.style.display = show ? '' : 'none';
    });

    // 3. Connections: visible if both endpoints visible
    document.querySelectorAll('[data-from]').forEach(el => {
      const show = visibleNodes.has(el.dataset.from) && visibleNodes.has(el.dataset.to);
      el.style.display = show ? '' : 'none';
    });

    // Update label
    let label = region === 'global' ? 'All Regions' : region;
    if (az !== 'all') label += ' / ' + az;
    document.getElementById('region-label').textContent = label;
  }

  getVisibleNodePositions() {
    const positions = [];
    document.querySelectorAll('.resource-node:not([style*="display: none"])').forEach(node => {
      const transform = node.getAttribute('transform');
      const match = transform && transform.match(/translate\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
      if (match) positions.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
    });
    return positions;
  }

  _populateAZOptions() {
    const region = this.region;
    const azSet = new Set();
    this.nodes.forEach(n => {
      if (n.az && (region === 'global' || n.region === region)) azSet.add(n.az);
    });
    const sorted = Array.from(azSet).sort();
    this.azSelect.innerHTML = '<option value="all">All AZs</option>' +
      sorted.map(az => `<option value="${az}">${az}</option>`).join('');
  }

  _notify() {
    this._listeners.forEach(cb => cb(this.region, this.az));
  }
}
