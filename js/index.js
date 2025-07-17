import css from '../css/main.css';
import Konva from 'konva';
import { plotFlownetWithContours } from './plotter.js';

// Import modular components
import { width, height, config, updateConfig, initializeData } from './config.js';
import { drawWaterLevels } from './waterLevels.js';
import { drawStandpipes, updateStandpipeHeads } from './standpipes.js';
import { drawDomainBoundary } from './domainBoundary.js';
import { setupClickEvents } from './eventHandlers.js';
import { setupWorker, sendTask } from './workerManager.js';

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

// Setup worker to handle calculation results
setupWorker((data) => {
    plotFlownetWithContours(data.potential, data.streamfunction, layer2, width, height, data.contourValues, data.contourValues);
    updateStandpipeHeads(data.potential, layer);
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

    // Draw standpipes
    drawStandpipes(layer);

    layer.draw();
    updateConfig();
    sendTask(config);
}

// Setup event handlers
setupClickEvents(stage, layer, sendTask);

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
