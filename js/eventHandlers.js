// Event handlers for user interactions
import { width, height, solid, config, updateConfig, data } from './config.js';
import { isPointInSolid, addStandpipe, drawStandpipes } from './standpipes.js';

// Function to setup click events for standpipe creation
export function setupClickEvents(stage, layer, sendTask) {
    stage.on('click', function (e) {
        // Get click position
        const pos = stage.getPointerPosition();
        const relativeX = pos.x / width;
        const relativeY = pos.y / height;

        console.log('Click detected at:', relativeX, relativeY); // Debug output
        console.log('Target:', e.target.getClassName(), e.target.getName()); // Debug output

        // Check if click is within the domain and not on existing UI elements
        // For now, allow clicks anywhere except on water level controls and standpipe markers
        const targetName = e.target.getName ? e.target.getName() : '';
        const targetClass = e.target.getClassName ? e.target.getClassName() : '';

        // Skip clicks on interactive elements
        if (targetName !== 'water-level-line' &&
            targetName !== 'standpipe' &&
            targetClass !== 'Circle') {
            
            // Add standpipe with initial head of 0 (will be updated by calculation)
            addStandpipe(relativeX, relativeY, 0);            drawStandpipes(layer);
            layer.draw();

            // Trigger calculation to get head value
            sendTask(config);
            // } else {
            //     // For now, allow standpipes anywhere for testing
            //     console.log('Adding standpipe anyway for testing'); // Debug output
            //     addStandpipe(relativeX, relativeY, Math.random() * 10);

            //     drawStandpipes(layer);
            //     layer.draw();

            //     // Trigger calculation to get head value
            //     sendTask(config);
            // }
        }
    });
}
