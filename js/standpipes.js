// Standpipe visualization and management
import Konva from 'konva';
import { width, height, data, config } from './config.js';

// Array to store standpipe data
export let standpipes = [];

// Function to check if a point is inside the solid region
export function isPointInSolid(x, y, solid) {
    if (!solid || solid.length < 3) {
        console.log('No solid region defined or less than 3 points');
        return false;
    }

    console.log('Checking point in solid:', x, y);
    console.log('Solid points:', solid);

    // Use ray casting algorithm to check if point is inside polygon
    let inside = false;
    let j = solid.length - 1;

    for (let i = 0; i < solid.length; i++) {
        const xi = solid[i].x;
        const yi = solid[i].y;
        const xj = solid[j].x;
        const yj = solid[j].y;

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
        j = i;
    }

    console.log('Point inside solid:', inside);
    return inside;
}

// Function to draw standpipes showing hydraulic head
export function drawStandpipes(layer) {
    // Clear existing standpipes
    layer.find('.standpipe').forEach(pipe => pipe.destroy());
    layer.find('.standpipe-label').forEach(label => label.destroy());

    standpipes.forEach((standpipe, index) => {
        const baseX = standpipe.x * width;
        const baseY = standpipe.y * height;

        // Get the hydraulic head at this location from the latest calculation
        const headValue = standpipe.head || 0;

        // Calculate standpipe height with reasonable scaling
        // Use a smaller scale factor to prevent extremely tall standpipes
        const pixelsPerUnit = 8; // Same as water levels
        const maxHeadToShow = Math.min(headValue, 15); // Cap at 15 units for reasonable display
        const standpipeHeight = Math.max(0, maxHeadToShow * pixelsPerUnit);
        const standpipeTop = baseY - standpipeHeight;        // Create standpipe tube (thin gray rectangle) - always show some tube above water
        const minTubeHeight = 40; // Minimum tube height in pixels
        const tubeExtension = 20; // Extra tube height above water level
        const tubeHeight = Math.max(standpipeHeight + tubeExtension, minTubeHeight);
        const tubeTop = baseY - tubeHeight;

        const tube = new Konva.Rect({
            x: baseX - 2,
            y: tubeTop,
            width: 4,
            height: tubeHeight,
            fill: 'lightgray',
            stroke: 'black',
            strokeWidth: 1,
            name: 'standpipe',
        });

        // Create water level in standpipe (blue rectangle)
        const waterInTube = new Konva.Rect({
            x: baseX - 1.5,
            y: standpipeTop,
            width: 3,
            height: Math.max(0, standpipeHeight),
            fill: 'blue',
            name: 'standpipe',
        });

        // Create a small base marker
        const baseMarker = new Konva.Circle({
            x: baseX,
            y: baseY,
            radius: 3,
            fill: 'red',
            stroke: 'black',
            strokeWidth: 1,
            name: 'standpipe',
        });

        // Create label showing head value
        const headLabel = new Konva.Text({
            x: baseX + 8,
            y: tubeTop - 15,
            text: `H: ${headValue.toFixed(2)}`,
            fontSize: 10,
            fill: 'black',
            name: 'standpipe-label',
        });

        // Store reference for updates
        tube.standpipeIndex = index;
        waterInTube.standpipeIndex = index;
        baseMarker.standpipeIndex = index;
        headLabel.standpipeIndex = index;

        // Add right-click to remove standpipe
        baseMarker.on('contextmenu', function (e) {
            e.evt.preventDefault();
            standpipes.splice(this.standpipeIndex, 1);
            drawStandpipes(layer);
            layer.draw();
        });

        // Add hover effect to show it's interactive
        baseMarker.on('mouseenter', function () {
            this.fill('darkred');
            document.body.style.cursor = 'pointer';
            layer.draw();
        });

        baseMarker.on('mouseleave', function () {
            this.fill('red');
            document.body.style.cursor = 'default';
            layer.draw();
        });

        layer.add(tube);
        layer.add(waterInTube);
        layer.add(baseMarker);
        layer.add(headLabel);
    });
}

// Function to update standpipe head values from calculation results
export function updateStandpipeHeads(potential, layer) {
    if (!potential || standpipes.length === 0) return;

    const gridSize = data.gridSize;
    standpipes.forEach((standpipe, index) => {
        // Convert standpipe position to grid coordinates
        const gridX = Math.round(standpipe.x * (gridSize - 1));
        const gridY = Math.round(standpipe.y * (gridSize - 1));

        // Get potential value at this grid point
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
            const potentialValue = potential[gridY * gridSize + gridX];
            standpipe.head = potentialValue || 0;
            console.log(`Standpipe ${index}: position (${standpipe.x}, ${standpipe.y}), grid (${gridX}, ${gridY}), head: ${standpipe.head}`);
        }
    });

    // Redraw standpipes with updated values
    drawStandpipes(layer);
}

// Function to add a new standpipe
export function addStandpipe(x, y, head = 0) {
    standpipes.push({ x, y, head });
}
