// === Main Entry Point ===
// Wires all components together.

import { NODES, EDGES, ICON_MAP, GROUPS } from './data/services.js';
import { Canvas } from './core/Canvas.js';
import { LayoutEngine } from './core/LayoutEngine.js';
import { Renderer } from './core/Renderer.js';
import { FilterController } from './controllers/FilterController.js';
import { TooltipController } from './controllers/TooltipController.js';
import { AutoCenter } from './controllers/AutoCenter.js';
import { GroupController } from './controllers/GroupController.js';
import { ErrorMarkerController } from './controllers/ErrorMarkerController.js';
import { WorkspaceController } from './controllers/WorkspaceController.js';
import { ScenarioEngine } from './core/ScenarioEngine.js';
import { EKS_RDS_SCENARIO } from './data/scenarios.js';

// --- Sidebar ---
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
const toggleBtn = document.getElementById('toggleSidebar');
collapseBtn.addEventListener('click', () => sidebar.classList.add('collapsed'));
toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

// Sidebar dropdowns
const dropdownToggle = document.getElementById('dropdown-your-resources');
const dropdownMenu = document.getElementById('menu-your-resources');
if (dropdownToggle && dropdownMenu) {
  dropdownToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = dropdownMenu.classList.contains('open');
    if (isOpen) {
      dropdownMenu.classList.remove('open');
      dropdownToggle.textContent = '▶ Your resources';
    } else {
      dropdownMenu.classList.add('open');
      dropdownToggle.textContent = '▼ Your resources';
    }
  });
}

// --- Architecture Canvas ---
const canvas = new Canvas('#arch-svg', '#arch-canvas');

// --- Group Controller (manages collapse/expand) ---
const groupCtrl = new GroupController(NODES, EDGES, GROUPS, renderAll);

// --- Initial Render ---
let currentPositions = {};
renderAll();

function renderAll() {
  const visibleNodes = groupCtrl.getVisibleNodes();
  const visibleEdges = groupCtrl.getVisibleEdges();

  const layout = new LayoutEngine(visibleNodes, visibleEdges);
  currentPositions = layout.compute();

  const renderer = new Renderer(canvas, visibleNodes, visibleEdges, currentPositions, ICON_MAP);
  renderer.render();

  // Re-bind controllers after re-render
  const filter = new FilterController(canvas, visibleNodes);
  new TooltipController(canvas, visibleNodes, visibleEdges);
  new AutoCenter(canvas, filter);
  groupCtrl.bindClickEvents();

  // Error markers (exposed globally for scenarios/monitoring to use)
  window.errorMarkers = new ErrorMarkerController(canvas, currentPositions, NODES);
}

// Debug: test error markers from console with window.testMarker()
window.testMarker = function() {
  window.errorMarkers.addNodeError('rds-cluster', {
    title: 'Test Error',
    logs: ['test log line'],
    metric: 'Test metric',
    suggestion: 'Test suggestion'
  });
  console.log('Marker added to rds-cluster. Positions:', Object.keys(currentPositions));
};

// --- Expose zoom functions for HTML buttons ---
window.zoomIn = () => canvas.zoomIn();
window.zoomOut = () => canvas.zoomOut();
window.zoomReset = () => canvas.fitToContent(currentPositions);

// --- Side Panel ---
const sidePanel = document.getElementById('arch-side-panel');
const sideToggle = document.getElementById('arch-side-toggle');
if (sideToggle && sidePanel) {
  sideToggle.addEventListener('click', () => {
    const collapsed = sidePanel.classList.toggle('collapsed');
    sideToggle.textContent = collapsed ? '▶' : '◀';
  });
}

// --- Architecture Container Collapse ---
const archCollapseBtn = document.getElementById('arch-collapse-btn');
const archCollapsible = document.getElementById('arch-collapsible');
if (archCollapseBtn && archCollapsible) {
  archCollapseBtn.addEventListener('click', () => {
    const collapsed = archCollapsible.classList.toggle('collapsed');
    archCollapseBtn.textContent = collapsed ? '▶' : '▼';
  });
}

// --- Cases Container Collapse ---
const casesCollapseBtn = document.getElementById('cases-collapse-btn');
const casesCollapsible = document.getElementById('cases-collapsible');
if (casesCollapseBtn && casesCollapsible) {
  casesCollapseBtn.addEventListener('click', () => {
    const collapsed = casesCollapsible.classList.toggle('collapsed');
    casesCollapseBtn.textContent = collapsed ? '▶' : '▼';
  });
}

// --- View Navigation ---
const navDashboard = document.getElementById('nav-dashboard');
const navCases = document.getElementById('nav-cases');
const viewDashboard = document.getElementById('view-dashboard');
const viewCases = document.getElementById('view-cases');

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sidebar-sub-item').forEach(n => n.classList.remove('active'));

  if (view === 'dashboard') {
    document.getElementById('view-dashboard').classList.add('active');
    if (navDashboard) navDashboard.classList.add('active');
  } else if (view === 'cases') {
    document.getElementById('view-cases').classList.add('active');
    if (navCases) navCases.classList.add('active');
  } else if (view === 'workspace') {
    document.getElementById('view-workspace').classList.add('active');
  }
}

if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
if (navCases) navCases.addEventListener('click', (e) => { e.preventDefault(); switchView('cases'); });

// --- Workspace ---
const workspaceContainer = document.getElementById('view-workspace');
const workspace = new WorkspaceController(workspaceContainer);
window.workspace = workspace; // expose for scenarios

// When case is resolved, stop scenario and clean up
workspace.onResolve = (caseData) => {
  scenarioEngine.stop();
  if (window.errorMarkers) window.errorMarkers.clearAll();

  // Persist to localStorage
  const resolved = JSON.parse(localStorage.getItem('resolvedCases') || '[]');
  const caseId = Object.entries(CASES).find(([id, c]) => c === caseData)?.[0];
  if (caseId && !resolved.includes(caseId)) {
    resolved.push(caseId);
    localStorage.setItem('resolvedCases', JSON.stringify(resolved));
  }

  // Update case cards in the DOM
  if (caseId) markCaseCardResolved(caseId);
};

// Mark a case card as resolved in the UI
function markCaseCardResolved(caseId) {
  document.querySelectorAll(`.case-card[data-case-id="${caseId}"]`).forEach(card => {
    card.classList.remove('case-critical', 'case-warning', 'case-info');
    card.classList.add('case-resolved');
    const status = card.querySelector('.case-status');
    if (status) status.innerHTML = '<span>✓ Resolved</span>';
    const tag = card.querySelector('.case-tag.tag-critical');
    if (tag) { tag.className = 'case-tag tag-resolved'; tag.textContent = 'Resolved'; }

    // Hide from active cases on dashboard
    if (card.closest('#cases-grid')) {
      card.style.display = 'none';
    }
  });
}

// On page load, restore resolved cases from localStorage
function restoreResolvedCases() {
  const resolved = JSON.parse(localStorage.getItem('resolvedCases') || '[]');
  resolved.forEach(caseId => markCaseCardResolved(caseId));
}
restoreResolvedCases();

// Debug: reset all resolved cases (call from console)
window.resetCases = function() {
  localStorage.removeItem('resolvedCases');
  location.reload();
};

// --- Scenario Engine ---
const scenarioEngine = new ScenarioEngine({
  workspace,
  errorMarkers: window.errorMarkers,
  switchView
});
window.scenarioEngine = scenarioEngine;

const SCENARIOS = {
  'eks-rds': EKS_RDS_SCENARIO,
};

// Case data (will come from API/ScenarioEngine later)
const CASES = {
  'eks-rds': {
    title: 'EKS → RDS Connection Failure',
    severity: 'critical',
    description: 'EKS pods unable to connect to RDS Aurora on TCP/5432',
    affectedPath: 'EKS Cluster → RDS Aurora',
    affectedNodes: [
      { iconPath: 'assets/icons/amazon-elastic-kubernetes-service.svg', name: 'EKS Cluster', detail: 'prod-cluster', status: 'ok', tooltip: { type: 'EKS Cluster', info: ['Cluster: prod-cluster', 'Nodes: 2 (m5.large)', 'Pods: 21/34 capacity', 'Version: 1.28', 'Status: Active ✅'] } },
      { iconPath: 'assets/icons/amazon-virtual-private-cloud.svg', name: 'sg-rds-prod', detail: 'Missing inbound rule', status: 'error', tooltip: { type: 'Security Group', info: ['ID: sg-rds-prod', 'VPC: vpc-0prod001', 'Inbound Rules: 2', '⚠️ Missing: TCP/5432 from sg-eks-nodes', 'Last modified: 2h ago by deploy-bot'] } },
      { iconPath: 'assets/icons/amazon-aurora.svg', name: 'RDS Aurora', detail: 'Primary · TCP/5432', status: 'error', tooltip: { type: 'Aurora PostgreSQL', info: ['Engine: Aurora PostgreSQL 15.4', 'Instance: db.r6g.large', 'Port: 5432', 'SG: sg-rds-prod', 'Connections: 0 ⚠️', 'Status: Available (unreachable)'] } },
    ],
    permissions: ['Modify security groups', 'Restart pods', 'Rollback deployments', 'Scale infrastructure']
  }
};

window.openWorkspace = function(caseId) {
  const caseData = CASES[caseId];
  if (!caseData) return;
  workspace.open(caseData);
  switchView('workspace');

  const resolved = JSON.parse(localStorage.getItem('resolvedCases') || '[]');
  if (resolved.includes(caseId)) {
    // Already resolved — show resolved state, no scenario
    workspace.resolve();
    return;
  }

  // Auto-play scenario if one exists for this case
  const scenario = SCENARIOS[caseId];
  if (scenario) {
    // Small delay so workspace renders before scenario starts
    setTimeout(() => {
      // Re-bind errorMarkers since they reference current positions
      scenarioEngine.errorMarkers = window.errorMarkers;
      scenarioEngine.play(scenario);
    }, 500);
  }
};

// Side panel section collapse/expand
document.querySelectorAll('.side-section-header').forEach(header => {
  header.addEventListener('click', () => {
    const section = header.dataset.section;
    const body = document.getElementById('section-' + section);
    if (!body) return;
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open');
    header.textContent = (isOpen ? '▶ ' : '▼ ') + header.textContent.replace(/^[▶▼]\s*/, '');
  });
});
