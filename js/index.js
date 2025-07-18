import css from '../css/main.css';
import Konva from 'konva';
import { plotFlownetWithContours } from './plotter.js';

// Import modular components
import { width, height, config, updateConfig, initializeData } from './config.js';
import { drawWaterLevels } from './waterLevels.js';
import { updateStandpipes } from './standpipes.js';
import { drawDomainBoundary } from './domainBoundary.js';
import { setupClickEvents } from './eventHandlers.js';
import { setupWorker, sendTask } from './workerManager.js';
import { toggleColorbar } from './plotter.js';
import { drawDrain } from './drains.js';

// Create Konva stage and layers
const stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height,
});

const layer = new Konva.Layer();
const layer2 = new Konva.Layer();
stage.add(layer2);
stage.add(layer);

// Cache the latest potential data to avoid recomputation
let latestPotentialData = null;
let latestStreamfunctionData = null;

// Function to redraw flownet with cached data
export function redrawFlownet() {
    if (latestPotentialData && latestStreamfunctionData) {
        plotFlownetWithContours(latestPotentialData, latestStreamfunctionData, layer2, width, height);
        updateStandpipes(latestPotentialData, layer);
        layer.draw();
        return true;
    }
    return false;
}

// Function to update standpipes using cached potential data
export function updateStandpipesFromCache(layer) {
    if (latestPotentialData) {
        updateStandpipes(latestPotentialData, layer);
        layer.draw();
        return true; // Successfully updated from cache
    }
    return false; // No cached data available
}

// Setup worker to handle calculation results
setupWorker((data) => {
    // Cache both datasets for future redraws
    latestPotentialData = data.potential;
    latestStreamfunctionData = data.streamfunction;

    plotFlownetWithContours(data.potential, data.streamfunction, layer2, width, height);
    updateStandpipes(data.potential, layer);
    layer.draw();
});

// Main drawing function
function drawPolygon() {
    // Clear existing water level lines
    layer.find('.water-level-line').forEach(line => line.destroy());
    layer.find('.water-area').forEach(area => area.destroy());
    layer.find('.water-level-handle').forEach(handle => handle.destroy());
    layer.find('.water-level-label').forEach(label => label.destroy());

    // Draw domain boundary
    drawDomainBoundary(layer);

    // Draw water levels for EP boundary conditions
    drawWaterLevels(layer, sendTask);

    // Draw drain if present
    drawDrain(layer, sendTask);

    // Draw standpipes
    // updateStandpipes(layer);

    layer.draw();
    updateConfig();
    sendTask(config);
}

// Setup event handlers
setupClickEvents(stage, layer, sendTask);

// Add keyboard event listener for colorbar toggle
document.addEventListener('keydown', function (event) {
    if (event.key.toLowerCase() === 'p') {
        toggleColorbar(layer2, width, height);
        // Trigger redraw with cached data
        redrawFlownet();
    }
});

// Initialize with async data loading
async function initialize() {
    try {
        await initializeData();
        drawPolygon();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Could show an error message to user here
    }
}

// Start the application
initialize();
