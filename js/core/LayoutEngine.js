// === LayoutEngine Class (Bottom-Up) ===
// Builds layout from smallest unit up:
// 1. Subnet: Dagre lays out nodes within each (vpc + tier) group
// 2. VPC: stacks public subnet above private subnet
// 3. Region: places VPCs side by side
// 4. Global: places regions side by side, global services centered on top

export class LayoutEngine {
  constructor(nodes, edges, options = {}) {
    this.nodes = nodes;
    this.edges = edges;
    this.nodesep = options.nodesep || 60;
    this.ranksep = options.ranksep || 80;
    this.subnetPadding = options.subnetPadding || 40;
    this.tierGap = options.tierGap || 60;
    this.vpcGap = options.vpcGap || 150;
    this.regionGap = options.regionGap || 200;
  }

  compute() {
    const positions = {};
    const globalNodes = this.nodes.filter(n => n.region === 'global');
    const regionalNodes = this.nodes.filter(n => n.region !== 'global');
    const regions = [...new Set(regionalNodes.map(n => n.region))];

    let regionX = 0;

    regions.forEach(region => {
      const rNodes = regionalNodes.filter(n => n.region === region);
      const regionResult = this._layoutRegion(rNodes);

      // Place region's nodes at regionX offset
      Object.entries(regionResult.positions).forEach(([id, pos]) => {
        positions[id] = { x: pos.x + regionX, y: pos.y + 200 };
      });

      regionX += regionResult.width + this.regionGap;
    });

    // Global at top center
    if (globalNodes.length > 0 && Object.keys(positions).length > 0) {
      const allX = Object.values(positions).map(p => p.x);
      const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
      const spacing = 130;
      globalNodes.forEach((node, i) => {
        positions[node.id] = {
          x: cx + (i - (globalNodes.length - 1) / 2) * spacing,
          y: 40
        };
      });
    }

    return positions;
  }

  // Region = VPCs side by side + non-VPC nodes placed logically
  _layoutRegion(nodes) {
    const vpcs = [...new Set(nodes.filter(n => n.vpc).map(n => n.vpc))];
    const nonVpc = nodes.filter(n => !n.vpc);
    const vpcOrder = ['prod', 'shared', 'dr'];
    const sorted = vpcs.sort((a, b) => vpcOrder.indexOf(a) - vpcOrder.indexOf(b));

    const positions = {};
    let vpcX = 0;
    let maxHeight = 0;

    sorted.forEach(vpc => {
      const vpcNodes = nodes.filter(n => n.vpc === vpc);
      const vpcResult = this._layoutVpc(vpcNodes);

      Object.entries(vpcResult.positions).forEach(([id, pos]) => {
        positions[id] = { x: pos.x + vpcX, y: pos.y };
      });

      maxHeight = Math.max(maxHeight, vpcResult.height);
      vpcX += vpcResult.width + this.vpcGap;
    });

    // Non-VPC network nodes (TGW) — between VPCs, vertically centered
    const networkNodes = nonVpc.filter(n => n.tier === 'network');
    networkNodes.forEach((node, i) => {
      positions[node.id] = {
        x: vpcX - this.vpcGap / 2,
        y: maxHeight / 2 + i * 100
      };
    });

    // Non-VPC other (IGW) — top left
    nonVpc.filter(n => n.tier !== 'network').forEach((node, i) => {
      positions[node.id] = { x: i * 130, y: 0 };
    });

    const totalWidth = vpcX - this.vpcGap + (networkNodes.length > 0 ? 80 : 0);
    return { positions, width: Math.max(totalWidth, 200), height: maxHeight };
  }

  // VPC = public subnet on top, private below
  _layoutVpc(vpcNodes) {
    const positions = {};
    let currentY = 0;
    let maxWidth = 0;

    ['public', 'private'].forEach(tier => {
      const tierNodes = vpcNodes.filter(n => n.tier === tier);
      if (tierNodes.length === 0) return;

      const result = this._layoutSubnet(tierNodes);

      Object.entries(result.positions).forEach(([id, pos]) => {
        positions[id] = { x: pos.x, y: pos.y + currentY };
      });

      maxWidth = Math.max(maxWidth, result.width);
      currentY += result.height + this.tierGap;
    });

    return { positions, width: maxWidth, height: currentY - this.tierGap };
  }

  // Subnet = Dagre layout of its nodes (adaptive direction)
  _layoutSubnet(nodes) {
    // Adaptive: small groups stack vertically, larger ones flow horizontally
    const direction = nodes.length <= 3 ? 'TB' : 'LR';

    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: direction,
      nodesep: this.nodesep,
      ranksep: this.ranksep,
      marginx: this.subnetPadding,
      marginy: this.subnetPadding
    });
    g.setDefaultEdgeLabel(() => ({}));

    const ids = new Set(nodes.map(n => n.id));

    nodes.forEach(node => {
      const w = node.size === 'small' ? 80 : 100;
      const h = node.size === 'small' ? 60 : 70;
      g.setNode(node.id, { width: w, height: h });
    });

    // Only add edges where both endpoints are in this subnet
    this.edges.forEach(edge => {
      if (ids.has(edge.from) && ids.has(edge.to)) {
        g.setEdge(edge.from, edge.to, { weight: edge.style === 'solid' ? 2 : 1 });
      }
    });

    dagre.layout(g);

    const positions = {};
    let maxX = 0, maxY = 0;
    nodes.forEach(node => {
      const n = g.node(node.id);
      if (n) {
        positions[node.id] = { x: n.x, y: n.y };
        maxX = Math.max(maxX, n.x + 50);
        maxY = Math.max(maxY, n.y + 40);
      }
    });

    return { positions, width: maxX, height: maxY };
  }
}
