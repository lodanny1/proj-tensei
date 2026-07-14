// === LayoutEngine Class ===
// Computes node positions from data. Pure logic, no DOM access.

export class LayoutEngine {
  constructor(nodes, edges, options = {}) {
    this.nodes = nodes;
    this.edges = edges;
    this.nodeSpacingX = options.nodeSpacingX || 140;
    this.nodeSpacingY = options.nodeSpacingY || 130;
    this.vpcPadding = options.vpcPadding || 70;
    this.regionPadding = options.regionPadding || 90;
    this.maxPerRow = options.maxPerRow || 3;
    this.tierOrder = ['edge', 'public', 'private', 'network'];
    this.vpcOrder = ['prod', 'shared', 'dr'];
  }

  compute() {
    const positions = {};

    // 1. Global services — top row
    const globalNodes = this.nodes.filter(n => n.region === 'global');
    const globalStartX = 400;
    globalNodes.forEach((node, i) => {
      positions[node.id] = { x: globalStartX + i * this.nodeSpacingX, y: 40 };
    });

    // 2. Regional nodes
    const regionNodes = this.nodes.filter(n => n.region !== 'global');
    const regions = [...new Set(regionNodes.map(n => n.region))];

    let regionY = 140;

    regions.forEach(region => {
      const rNodes = regionNodes.filter(n => n.region === region);
      const noVpcNodes = rNodes.filter(n => !n.vpc);
      const vpcs = [...new Set(rNodes.filter(n => n.vpc).map(n => n.vpc))];

      const vpcLayouts = {};
      let maxVpcHeight = 0;

      vpcs.forEach(vpc => {
        const vpcNodes = rNodes.filter(n => n.vpc === vpc);
        const tiers = [...new Set(vpcNodes.map(n => n.tier))].sort((a, b) => this.tierOrder.indexOf(a) - this.tierOrder.indexOf(b));

        let tierY = 0;
        let maxRowWidth = 0;
        const tierPositions = [];

        tiers.forEach(tier => {
          const tierNodes = vpcNodes.filter(n => n.tier === tier);
          tierNodes.sort((a, b) => (a.az || '').localeCompare(b.az || '') || a.id.localeCompare(b.id));

          const rows = [];
          for (let i = 0; i < tierNodes.length; i += this.maxPerRow) {
            rows.push(tierNodes.slice(i, i + this.maxPerRow));
          }

          rows.forEach(row => {
            row.forEach((node, i) => {
              tierPositions.push({ node, x: i * this.nodeSpacingX, y: tierY });
              maxRowWidth = Math.max(maxRowWidth, (i + 1) * this.nodeSpacingX);
            });
            tierY += this.nodeSpacingY;
          });
        });

        vpcLayouts[vpc] = { positions: tierPositions, width: maxRowWidth, height: tierY };
        maxVpcHeight = Math.max(maxVpcHeight, tierY);
      });

      // Position VPCs side by side
      let vpcX = this.regionPadding;
      const sortedVpcs = vpcs.sort((a, b) => this.vpcOrder.indexOf(a) - this.vpcOrder.indexOf(b));

      sortedVpcs.forEach((vpc, vpcIdx) => {
        const layout = vpcLayouts[vpc];
        const vpcStartX = vpcX;
        const vpcStartY = regionY + this.vpcPadding + 40;

        layout.positions.forEach(({ node, x, y }) => {
          positions[node.id] = {
            x: vpcStartX + x + this.vpcPadding,
            y: vpcStartY + y + this.vpcPadding
          };
        });

        vpcX += layout.width + this.vpcPadding * 2 + 140;

        // Place network-tier nodes (TGW etc) between VPCs
        if (vpcIdx === 0 && sortedVpcs.length > 1) {
          const middleNodes = noVpcNodes.filter(n => n.tier === 'network');
          middleNodes.forEach((node, i) => {
            positions[node.id] = {
              x: vpcX - 70,
              y: vpcStartY + (maxVpcHeight / (middleNodes.length + 1)) * (i + 1)
            };
          });
          vpcX += 80;
        }
      });

      // Non-VPC, non-network nodes (like IGW) at top of region
      noVpcNodes.filter(n => n.tier !== 'network').forEach((node, i) => {
        positions[node.id] = {
          x: this.regionPadding + this.vpcPadding + i * this.nodeSpacingX,
          y: regionY + 20
        };
      });

      const allRegionPositions = rNodes.map(n => positions[n.id]).filter(Boolean);
      if (allRegionPositions.length > 0) {
        regionY += maxVpcHeight + this.vpcPadding * 3 + 60;
      }
    });

    return positions;
  }
}
