// === Main Entry Point ===
// Wires all components together.

import { NODES, EDGES, ICON_MAP } from './data/services.js';
import { Canvas } from './core/Canvas.js';
import { LayoutEngine } from './core/LayoutEngine.js';
import { Renderer } from './core/Renderer.js';
import { FilterController } from './controllers/FilterController.js';
import { TooltipController } from './controllers/TooltipController.js';
import { AutoCenter } from './controllers/AutoCenter.js';

// --- Sidebar ---
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
const toggleBtn = document.getElementById('toggleSidebar');
collapseBtn.addEventListener('click', () => sidebar.classList.add('collapsed'));
toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

// --- Architecture Canvas ---
const canvas = new Canvas('#arch-svg', '#arch-canvas');
const layout = new LayoutEngine(NODES, EDGES);
const positions = layout.compute();
const renderer = new Renderer(canvas, NODES, EDGES, positions, ICON_MAP);
renderer.render();

// --- Controllers ---
const filter = new FilterController(canvas, NODES);
const tooltips = new TooltipController(canvas, NODES);
const autoCenter = new AutoCenter(canvas, filter);

// --- Expose zoom functions for HTML buttons ---
window.zoomIn = () => canvas.zoomIn();
window.zoomOut = () => canvas.zoomOut();
window.zoomReset = () => canvas.fitToContent(positions);
