// Standpipe visualization and management
import Konva from 'konva';
import { width, height, data, config } from './config.js';
import { datum } from './waterLevels.js';

// Array to store standpipe data
export let standpipes = [];

// Function to check if a point is inside the soil region (inside domain but not in solid)
export function isPointInSoil(x, y, domainPoints, solidRegion) {
    // First check if point is inside the domain boundary
    if (!isPointInDomain(x, y, domainPoints)) {
        return false; // Point is in air (outside domain)
    }
    
    // Then check if point is NOT in solid region
    if (isPointInSolid(x, y, solidRegion)) {
        return false; // Point is in solid region
    }
    
    return true; // Point is in soil
}

// Function to check if a point is inside the domain boundary
function isPointInDomain(x, y, domainPoints) {
    if (!domainPoints || domainPoints.length < 3) {
        console.log('No domain boundary defined or less than 3 points');
        return false;
    }

    // Use ray casting algorithm to check if point is inside polygon
    let inside = false;
    let j = domainPoints.length - 1;

    for (let i = 0; i < domainPoints.length; i++) {
        const xi = domainPoints[i].x;
        const yi = domainPoints[i].y;
        const xj = domainPoints[j].x;
        const yj = domainPoints[j].y;

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
        j = i;
    }

    return inside;
}

// Function to check if a point is inside the solid region
export function isPointInSolid(x, y, solid) {
    if (!solid || solid.length < 3) {
        console.log('No solid region defined or less than 3 points');
        return false;
    }

    // console.log('Checking point in solid:', x, y);
    // console.log('Solid points:', solid);

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

    // console.log('Point inside solid:', inside);
    return inside;
}

// Function to draw standpipes showing hydraulic head
function drawStandpipes(layer) {
    // Clear existing standpipes
    layer.find('.standpipe').forEach(pipe => pipe.destroy());
    layer.find('.standpipe-label').forEach(label => label.destroy());

    standpipes.forEach((standpipe, index) => {
        const baseX = standpipe.x * width;
        const baseY = standpipe.y * height;

        // Get the hydraulic head at this location from the latest calculation
        const headValue = standpipe.head || 0;

        // Calculate standpipe height with consistent scaling to match water levels
        // Use the same scaling as water levels: multiply by canvas height
        const standpipeHeight = headValue * height;
        const standpipeTop = baseY - standpipeHeight;

        // Create standpipe tube (thin gray rectangle) - always show some tube above water
        const tubeExtension = 20; // Extra tube height above water level
        const tubeHeight = standpipeHeight + tubeExtension;
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
            height: standpipeHeight,
            fill: 'blue',
            name: 'standpipe',
        });

        // Create a small base marker
        const baseMarker = new Konva.Circle({
            x: baseX,
            y: baseY,
            radius: 3,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 1,
            name: 'standpipe',
        });

        // Store reference for updates
        tube.standpipeIndex = index;
        waterInTube.standpipeIndex = index;
        baseMarker.standpipeIndex = index;

        // Add hover effect to show it's interactive
        baseMarker.on('mouseenter', function () {
            this.fill('gray');
            document.body.style.cursor = 'pointer';
            layer.draw();
        });

        baseMarker.on('mouseleave', function () {
            this.fill('white');
            document.body.style.cursor = 'default';
            layer.draw();
        });

        layer.add(tube);
        layer.add(waterInTube);
        layer.add(baseMarker);
    });
}

// Function to update standpipe head values from calculation results
export function updateStandpipes(potential, layer) {
    if (!potential || standpipes.length === 0) return;

    const gridSize = data.gridSize;
    standpipes.forEach((standpipe, index) => {
        // Convert standpipe position to grid coordinates
        const gridX = Math.round(standpipe.x * (gridSize - 1));
        const gridY = Math.round(standpipe.y * (gridSize - 1));

        // Get potential value at this grid point
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
            const potentialValue = potential[gridY][gridX];
            // The head is just the potential value - it's already in the same units as BC values
             
            const head = potentialValue + (standpipe.y - datum); // Adjust head based on y position
            standpipe.head = head || 0;
            // console.log(standpipe.y, potentialValue, head);
            // console.log(`Standpipe ${index}: position (${standpipe.x}, ${standpipe.y}), grid (${gridX}, ${gridY}), head: ${standpipe.head}`);
        }
    });

    // Redraw standpipes with updated values
    drawStandpipes(layer);
}

// Function to add a new standpipe
export function addStandpipe(x, y, head = 0) {
    standpipes.push({ x, y, head });
}

// Function to clear all standpipes
export function clearAllStandpipes(layer) {
    standpipes = [];
    layer.find('.standpipe').forEach(pipe => pipe.destroy());
    layer.find('.standpipe-label').forEach(label => label.destroy());
}
