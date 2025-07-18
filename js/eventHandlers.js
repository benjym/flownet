// Event handlers for user interactions
import { width, height, solid, config, updateConfig, data, points } from './config.js';
import { isPointInSolid, isPointInSoil, addStandpipe, updateStandpipes, clearAllStandpipes } from './standpipes.js';
import { updateStandpipesFromCache } from './index.js';

// Function to setup click events for standpipe creation
export function setupClickEvents(stage, layer, sendTask) {
    stage.on('click', function (e) {
        // Only handle left clicks (button 0), ignore right clicks
        if (e.evt.button !== 0) return;
        
        // Get click position
        const pos = stage.getPointerPosition();
        const relativeX = pos.x / width;
        const relativeY = pos.y / height;

        // console.log('Click detected at:', relativeX, relativeY); // Debug output
        // console.log('Target:', e.target.getClassName(), e.target.getName()); // Debug output

        // Check if click is within the domain and not on existing UI elements
        // For now, allow clicks anywhere except on water level controls and standpipe markers
        const targetName = e.target.getName ? e.target.getName() : '';
        const targetClass = e.target.getClassName ? e.target.getClassName() : '';

        // Skip clicks on interactive elements
        if (targetName !== 'water-level-line' &&
            targetName !== 'standpipe' &&
            targetClass !== 'Circle') {
            
            // Check if click is in soil region (not air, not solid)
            if (isPointInSoil(relativeX, relativeY, points, solid)) {
                // Add standpipe with initial head of 0 (will be updated by calculation)
                addStandpipe(relativeX, relativeY, 0);
                
                // Try to update from cached data first, only recalculate if no cache available
                if (!updateStandpipesFromCache(layer)) {
                    // No cached data available, trigger full calculation
                    sendTask(config);
                }
            } else {
                // console.log('Cannot place standpipe here - not in soil region');
            }
        }
    });

    // Add double-click handler to clear all standpipes
    // stage.on('dblclick', function (e) {
    //     clearAllStandpipes(layer);
    //     updateStandpipes([], layer);
    // });

    // Add right-click handler to do nothing (prevent context menu)
    stage.on('contextmenu', function (e) {
        e.evt.preventDefault();

        clearAllStandpipes(layer);
        updateStandpipes([], layer);
    });
}
