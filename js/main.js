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

// --- Sidebar ---
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
const toggleBtn = document.getElementById('toggleSidebar');
collapseBtn.addEventListener('click', () => sidebar.classList.add('collapsed'));
toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

// Sidebar dropdowns
document.querySelectorAll('.sidebar-dropdown > .sidebar-nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const menu = item.parentElement.querySelector('.sidebar-dropdown-menu');
    if (!menu) return;
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open');
    item.textContent = (isOpen ? '▶ ' : '▼ ') + item.textContent.replace(/^[▶▼]\s*/, '');
  });
});

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
}

// --- Expose zoom functions for HTML buttons ---
window.zoomIn = () => canvas.zoomIn();
window.zoomOut = () => canvas.zoomOut();
window.zoomReset = () => canvas.fitToContent(currentPositions);
