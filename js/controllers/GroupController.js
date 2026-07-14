// === GroupController Class ===
// Manages collapsible groups. Collapsed = show summary node, hide members.
// Expanded = hide summary node, show members. Re-renders on toggle.

export class GroupController {
  constructor(nodes, edges, groups, renderCallback) {
    this.allNodes = nodes;
    this.edges = edges;
    this.groups = groups;
    this.renderCallback = renderCallback;
    this.expandedGroups = new Set(); // collapsed by default
  }

  // Returns the effective node list (with groups collapsed/expanded)
  getVisibleNodes() {
    const visibleNodes = [];
    const hiddenByGroup = new Set();

    // Determine which nodes are hidden by collapsed groups
    this.allNodes.forEach(node => {
      if (node.group && !this.expandedGroups.has(node.group)) {
        hiddenByGroup.add(node.id);
      }
    });

    // Add non-hidden nodes
    this.allNodes.forEach(node => {
      if (!hiddenByGroup.has(node.id)) {
        visibleNodes.push(node);
      }
    });

    // Add collapsed group summary nodes
    Object.entries(this.groups).forEach(([groupId, groupNode]) => {
      if (!this.expandedGroups.has(groupId)) {
        visibleNodes.push(groupNode);
      }
    });

    return visibleNodes;
  }

  // Returns edges remapped to group nodes when collapsed
  getVisibleEdges() {
    return this.edges.map(edge => {
      let from = edge.from;
      let to = edge.to;

      // If source is in a collapsed group, reroute to group node
      const fromNode = this.allNodes.find(n => n.id === from);
      if (fromNode && fromNode.group && !this.expandedGroups.has(fromNode.group)) {
        from = fromNode.group;
      }

      // If target is in a collapsed group, reroute to group node
      const toNode = this.allNodes.find(n => n.id === to);
      if (toNode && toNode.group && !this.expandedGroups.has(toNode.group)) {
        to = toNode.group;
      }

      // Skip self-referencing edges (both ends collapsed to same group)
      if (from === to) return null;

      return { ...edge, from, to };
    }).filter(Boolean).filter((edge, i, arr) => {
      // Deduplicate edges (multiple members → same group = one line)
      return arr.findIndex(e => e.from === edge.from && e.to === edge.to) === i;
    });
  }

  toggle(groupId) {
    if (this.expandedGroups.has(groupId)) {
      this.expandedGroups.delete(groupId);
    } else {
      this.expandedGroups.add(groupId);
    }
    this.renderCallback();
  }

  isExpanded(groupId) {
    return this.expandedGroups.has(groupId);
  }

  // Bind click events after render
  bindClickEvents() {
    Object.keys(this.groups).forEach(groupId => {
      const el = document.getElementById(groupId);
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('dblclick', () => this.toggle(groupId));
      }

      // Also bind expanded members to collapse on double-click of any member
      this.allNodes.filter(n => n.group === groupId).forEach(node => {
        const el = document.getElementById(node.id);
        if (el) {
          el.addEventListener('dblclick', () => this.toggle(groupId));
        }
      });
    });
  }
}
