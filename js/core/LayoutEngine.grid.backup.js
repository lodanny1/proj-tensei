// === LayoutEngine Class ===
// Places nodes in a grid within each AZ+tier cell.
// Fills left-to-right, wraps to next row. Boxes size to fit content.

export class LayoutEngine {
  constructor(nodes, edges, options = {}) {
    this.nodes = nodes;
    this.edges = edges;
    this.cellW = options.cellW || 160;      // horizontal spacing between nodes
    this.cellH = options.cellH || 140;      // vertical spacing between nodes
    this.maxCols = options.maxCols || 3;    // max nodes per row before wrapping
    this.tierGap = options.tierGap || 80;   // vertical gap between public/private tiers
    this.azGap = options.azGap || 100;       // horizontal gap between AZ columns
    this.vpcGap = options.vpcGap || 120;    // vertical gap between stacked VPCs
    this.vpcPadding = options.vpcPadding || 70;
    this.tierOrder = ['public', 'private'];
    this.vpcOrder = ['prod', 'shared', 'dr'];
  }

  compute() {
    const positions = {};
    const globalNodes = this.nodes.filter(n => n.region === 'global');
    const regionNodes = this.nodes.filter(n => n.region !== 'global');
    const regions = [...new Set(regionNodes.map(n => n.region))];

    let regionX = 80;
    const regionStartY = 150;

    regions.forEach(region => {
      const rNodes = regionNodes.filter(n => n.region === region);
      const noVpcNodes = rNodes.filter(n => !n.vpc);
      const vpcs = [...new Set(rNodes.filter(n => n.vpc).map(n => n.vpc))];
      const sortedVpcs = vpcs.sort((a, b) => this.vpcOrder.indexOf(a) - this.vpcOrder.indexOf(b));

      // Layout each VPC
      const vpcResults = sortedVpcs.map(vpc => this._layoutVpc(rNodes.filter(n => n.vpc === vpc)));

      // Stack VPCs vertically, centered horizontally
      let currentY = regionStartY + 80;
      let maxVpcWidth = 0;

      // First pass: find max width
      vpcResults.forEach(result => {
        maxVpcWidth = Math.max(maxVpcWidth, result.width);
      });

      // Second pass: position each VPC centered within maxVpcWidth
      sortedVpcs.forEach((vpc, idx) => {
        const result = vpcResults[idx];
        const xOffset = (maxVpcWidth - result.width) / 2; // center narrower VPCs

        result.positions.forEach(({ node, x, y }) => {
          positions[node.id] = {
            x: regionX + this.vpcPadding + xOffset + x,
            y: currentY + this.vpcPadding + y
          };
        });
        currentY += result.height + this.vpcPadding * 2 + this.vpcGap;
      });

      const regionContentWidth = maxVpcWidth + this.vpcPadding * 2;
      const regionContentHeight = currentY - regionStartY - this.vpcGap;

      // TGW to the right, vertically centered
      const middleNodes = noVpcNodes.filter(n => n.tier === 'network');
      middleNodes.forEach((node, i) => {
        positions[node.id] = {
          x: regionX + regionContentWidth + 60,
          y: regionStartY + regionContentHeight / 2
        };
      });

      // IGW at top center of region
      const topNodes = noVpcNodes.filter(n => n.tier !== 'network');
      const centerX = regionX + regionContentWidth / 2;
      topNodes.forEach((node, i) => {
        positions[node.id] = {
          x: centerX + (i - (topNodes.length - 1) / 2) * this.cellW,
          y: regionStartY + 15
        };
      });

      regionX += regionContentWidth + (middleNodes.length > 0 ? 200 : 80);
    });

    // Global nodes centered above all
    const allPos = Object.values(positions);
    if (allPos.length > 0) {
      const minX = Math.min(...allPos.map(p => p.x));
      const maxX = Math.max(...allPos.map(p => p.x));
      const cx = (minX + maxX) / 2;
      globalNodes.forEach((node, i) => {
        positions[node.id] = {
          x: cx + (i - (globalNodes.length - 1) / 2) * this.cellW,
          y: 40
        };
      });
    }

    return positions;
  }

  _layoutVpc(vpcNodes) {
    // Group by AZ → within each AZ, group by tier → place in grid
    // null-AZ (multi-AZ) nodes go below all AZ columns
    const azs = [...new Set(vpcNodes.map(n => n.az))].filter(Boolean).sort();
    const multiAzNodes = vpcNodes.filter(n => !n.az);

    const positions = [];
    let azX = 0;
    let maxAzHeight = 0;

    // Layout each AZ column
    azs.forEach(az => {
      const azNodes = vpcNodes.filter(n => n.az === az);
      const tiers = [...new Set(azNodes.map(n => n.tier))].sort(
        (a, b) => this.tierOrder.indexOf(a) - this.tierOrder.indexOf(b)
      );

      let tierY = 0;
      let azWidth = 0;

      tiers.forEach((tier, tIdx) => {
        if (tIdx > 0) tierY += this.tierGap;

        const tierNodes = azNodes.filter(n => n.tier === tier);
        const grid = this._placeInGrid(tierNodes);

        grid.forEach(({ node, col, row }) => {
          positions.push({
            node,
            x: azX + col * this.cellW,
            y: tierY + row * this.cellH
          });
          azWidth = Math.max(azWidth, (col + 1) * this.cellW);
        });

        const rows = Math.ceil(tierNodes.length / this.maxCols);
        tierY += rows * this.cellH;
      });

      maxAzHeight = Math.max(maxAzHeight, tierY);
      azX += Math.max(azWidth, this.cellW) + this.azGap;
    });

    const totalAzWidth = azX - (azs.length > 0 ? this.azGap : 0);

    // Place multi-AZ nodes below AZ columns, centered
    if (multiAzNodes.length > 0) {
      const multiY = maxAzHeight + this.tierGap;
      const grid = this._placeInGrid(multiAzNodes);
      const gridWidth = Math.min(multiAzNodes.length, this.maxCols) * this.cellW;
      const offsetX = (totalAzWidth - gridWidth) / 2;

      grid.forEach(({ node, col, row }) => {
        positions.push({
          node,
          x: Math.max(0, offsetX) + col * this.cellW,
          y: multiY + row * this.cellH
        });
      });

      const multiRows = Math.ceil(multiAzNodes.length / this.maxCols);
      maxAzHeight = multiY + multiRows * this.cellH;
    }

    return {
      positions,
      width: Math.max(totalAzWidth, this.cellW),
      height: maxAzHeight
    };
  }

  // Place nodes in a grid: left-to-right, wrap at maxCols
  _placeInGrid(nodes) {
    return nodes.map((node, i) => ({
      node,
      col: i % this.maxCols,
      row: Math.floor(i / this.maxCols)
    }));
  }
}
