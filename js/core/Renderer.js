// === Renderer Class ===
// Renders SVG from positions + data. No layout logic here.

import { lightenColor } from '../utils/colors.js';

export class Renderer {
  constructor(canvas, nodes, edges, positions, iconMap) {
    this.canvas = canvas;
    this.nodes = nodes;
    this.edges = edges;
    this.positions = positions;
    this.iconMap = iconMap;
    this.vpcColors = { prod: '#0972d3', shared: '#fd79a8', dr: '#74b9ff' };
    this.vpcLabels = { prod: 'Production VPC (10.0.0.0/16)', shared: 'Shared Services VPC (10.1.0.0/16)', dr: 'DR VPC (10.2.0.0/16)' };
  }

  render() {
    let svg = this._renderDefs();
    svg += this._renderRegionBoxes();
    svg += this._renderVpcBoxes();
    svg += this._renderEdges();
    svg += this._renderNodes();
    this.canvas.svg.innerHTML = svg;
    this.canvas.fitToContent(this.positions);
  }

  _renderDefs() {
    return `<defs>
      <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="none" stroke="#0972d3" stroke-width="1"/>
      </marker>
      <marker id="arrow-dashed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="none" stroke="#687078" stroke-width="1"/>
      </marker>
    </defs>`;
  }

  _renderRegionBoxes() {
    let out = '';
    const regions = [...new Set(this.nodes.filter(n => n.region !== 'global').map(n => n.region))];
    regions.forEach(region => {
      const rPositions = this.nodes.filter(n => n.region === region).map(n => this.positions[n.id]).filter(Boolean);
      if (rPositions.length === 0) return;
      const { minX, minY, maxX, maxY } = this._bounds(rPositions, 100);
      const count = this.nodes.filter(n => n.region === region).length;
      const w = maxX - minX;
      const labelWidth = region.length * 9 + 100;
      const labelX = minX + (w - labelWidth) / 2;
      out += `<rect x="${minX}" y="${minY}" width="${w}" height="${maxY - minY}" rx="16" fill="none" stroke="#232f3e" stroke-width="2" data-region="${region}"/>`;
      out += `<rect x="${labelX}" y="${minY - 10}" width="${labelWidth}" height="20" rx="4" fill="#fff" data-region="${region}"/>`;
      out += `<text x="${minX + w / 2}" y="${minY + 4}" font-size="12" font-weight="700" fill="#232f3e" text-anchor="middle" data-region="${region}">⬡ ${region} — ${count} resources</text>`;
    });
    return out;
  }

  _renderVpcBoxes() {
    let out = '';
    const vpcs = [...new Set(this.nodes.filter(n => n.vpc).map(n => n.vpc))];
    vpcs.forEach(vpc => {
      const vpcNodes = this.nodes.filter(n => n.vpc === vpc);
      const vPositions = vpcNodes.map(n => this.positions[n.id]).filter(Boolean);
      if (vPositions.length === 0) return;
      const { minX, minY, maxX, maxY } = this._bounds(vPositions, 60);
      const region = vpcNodes[0].region;
      const color = this.vpcColors[vpc] || '#687078';
      const label = this.vpcLabels[vpc] || vpc;
      const w = maxX - minX;
      const vLabelWidth = label.length * 7 + 10;
      const vLabelX = minX + (w - vLabelWidth) / 2;

      out += `<rect x="${minX}" y="${minY}" width="${w}" height="${maxY - minY}" rx="12" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="8 4" data-region="${region}"/>`;
      out += `<rect x="${vLabelX}" y="${minY - 9}" width="${vLabelWidth}" height="18" rx="3" fill="#fff" data-region="${region}"/>`;
      out += `<text x="${minX + w / 2}" y="${minY + 4}" font-size="11" font-weight="700" fill="${color}" text-anchor="middle" data-region="${region}">${label}</text>`;

      // Subnet boxes
      ['public', 'private'].forEach(tier => {
        const sNodes = vpcNodes.filter(n => n.tier === tier);
        const sPositions = sNodes.map(n => this.positions[n.id]).filter(Boolean);
        if (sPositions.length === 0) return;
        const sb = this._bounds(sPositions, 45);
        const sColor = tier === 'public' ? '#2a9d8f' : '#c45a2d';
        const sFill = tier === 'public' ? 'rgba(42,157,143,0.04)' : 'rgba(196,90,45,0.04)';
        const sLabel = tier === 'public' ? 'Public Subnet' : 'Private Subnet';
        const sw = sb.maxX - sb.minX;
        const sLabelWidth = sLabel.length * 7 + 8;
        const sLabelX = sb.minX + (sw - sLabelWidth) / 2;

        out += `<rect x="${sb.minX}" y="${sb.minY}" width="${sw}" height="${sb.maxY - sb.minY}" rx="8" fill="${sFill}" stroke="${sColor}" stroke-width="1.5" data-region="${region}"/>`;
        out += `<rect x="${sLabelX}" y="${sb.minY - 8}" width="${sLabelWidth}" height="16" rx="3" fill="#fff" data-region="${region}"/>`;
        out += `<text x="${sb.minX + sw / 2}" y="${sb.minY + 4}" font-size="10" font-weight="600" fill="${sColor}" text-anchor="middle" data-region="${region}">${sLabel}</text>`;
      });
    });
    return out;
  }

  _renderEdges() {
    let out = '';
    this.edges.forEach(edge => {
      const from = this.positions[edge.from];
      const to = this.positions[edge.to];
      if (!from || !to) return;
      const dashed = edge.style === 'dashed';
      const stroke = dashed ? '#687078' : '#0972d3';
      const marker = dashed ? 'url(#arrow-dashed)' : 'url(#arrow)';
      const dashAttr = dashed ? ' stroke-dasharray="5 3"' : '';
      out += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="1.5"${dashAttr} marker-end="${marker}" data-from="${edge.from}" data-to="${edge.to}"/>`;
      if (edge.label) {
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2 - 6;
        out += `<text x="${mx}" y="${my}" font-size="9" fill="#687078" font-family="monospace" text-anchor="middle" data-from="${edge.from}" data-to="${edge.to}">${edge.label}</text>`;
      }
    });
    return out;
  }

  _renderNodes() {
    let out = '';
    this.nodes.forEach(node => {
      const pos = this.positions[node.id];
      if (!pos) return;
      const isSmall = node.size === 'small';
      const w = isSmall ? 50 : 64;
      const h = isSmall ? 36 : 52;
      const fill = lightenColor(node.color);
      const iconPath = this.iconMap[node.service];
      const iconSize = isSmall ? 20 : 32;

      out += `<g class="resource-node" id="${node.id}" data-region="${node.region}" ${node.az ? `data-az="${node.az}"` : ''} transform="translate(${pos.x}, ${pos.y})">`;
      out += `<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${node.color}" stroke-width="1.5"/>`;

      if (iconPath) {
        out += `<image href="${iconPath}" x="${-iconSize/2}" y="${-h/2 + 4}" width="${iconSize}" height="${iconSize}"/>`;
      } else if (node.icon) {
        out += `<text x="0" y="${isSmall ? 0 : -2}" text-anchor="middle" fill="${node.color}" font-size="${isSmall ? 11 : 15}">${node.icon}</text>`;
      }

      out += `<text x="0" y="${h/2 + 14}" text-anchor="middle" font-size="10" fill="#414750">${node.label}</text>`;
      if (node.sublabel) {
        out += `<text x="0" y="${h/2 + 26}" text-anchor="middle" font-size="9" fill="#687078">${node.sublabel}</text>`;
      }
      out += `</g>`;
    });
    return out;
  }

  _bounds(positions, padding) {
    return {
      minX: Math.min(...positions.map(p => p.x)) - padding,
      minY: Math.min(...positions.map(p => p.y)) - padding,
      maxX: Math.max(...positions.map(p => p.x)) + padding + 40,
      maxY: Math.max(...positions.map(p => p.y)) + padding + 40
    };
  }
}
