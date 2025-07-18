// Standpipe visualization and management
import Konva from 'konva';
import { width, height, data, config } from './config.js';

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
    if (!solid || solid.length === 0) {
        console.log('No solid region defined or empty solid array');
        return false;
    }

    // console.log('Checking point in solid:', x, y);
    // console.log('Solid points:', solid);

    // Check if solid is an array of arrays (multiple regions) or array of points (single region)
    const isMultipleRegions = Array.isArray(solid[0]);

    if (isMultipleRegions) {
        // Multiple solid regions - check if point is inside any of them
        for (const solidRegion of solid) {
            if (solidRegion && solidRegion.length >= 3) {
                if (isPointInPolygon(x, y, solidRegion)) {
                    return true;
                }
            }
        }
        return false;
    } else {
        // Single solid region (backward compatibility)
        if (solid.length < 3) {
            console.log('Single solid region has less than 3 points');
            return false;
        }
        return isPointInPolygon(x, y, solid);
    }
}

// Helper function to check if a point is inside a polygon using ray casting
function isPointInPolygon(x, y, polygon) {
    let inside = false;
    let j = polygon.length - 1;

    for (let i = 0; i < polygon.length; i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
        j = i;
    }

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

        // Calculate standpipe height using absolute coordinates
        // Convert absolute head value to screen coordinates: (1 - headValue) * height
        const standpipeTop = (1 - headValue) * height;
        const standpipeHeight = Math.max(0, baseY - standpipeTop);

        // Create standpipe tube (thin gray rectangle) - always show some tube above water
        const tubeExtension = 20; // Extra tube height above water level
        const tubeHeight = standpipeHeight + tubeExtension;
        const tubeTop = standpipeTop - tubeExtension;

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
        // Convert standpipe position to continuous grid coordinates
        const gridX = standpipe.x * (gridSize - 1);
        const gridY = standpipe.y * (gridSize - 1);

        // Get the four surrounding grid points for bilinear interpolation
        const x1 = Math.floor(gridX);
        const x2 = Math.min(x1 + 1, gridSize - 1);
        const y1 = Math.floor(gridY);
        const y2 = Math.min(y1 + 1, gridSize - 1);

        // Get potential values at the four corners
        const q11 = potential[y1] && potential[y1][x1] !== null ? potential[y1][x1] : 0;
        const q21 = potential[y1] && potential[y1][x2] !== null ? potential[y1][x2] : 0;
        const q12 = potential[y2] && potential[y2][x1] !== null ? potential[y2][x1] : 0;
        const q22 = potential[y2] && potential[y2][x2] !== null ? potential[y2][x2] : 0;

        // Calculate interpolation weights
        const wx = gridX - x1;
        const wy = gridY - y1;

        // Bilinear interpolation
        const interpolatedPotential = q11 * (1 - wx) * (1 - wy) +
            q21 * wx * (1 - wy) +
            q12 * (1 - wx) * wy +
            q22 * wx * wy;

        // The head is now the interpolated potential value as absolute height
        // No need to adjust for datum since we're using absolute coordinates
        const head = interpolatedPotential;
        standpipe.head = head || 0;

        // console.log(`Standpipe ${index}: position (${standpipe.x.toFixed(3)}, ${standpipe.y.toFixed(3)}), interpolated head: ${standpipe.head.toFixed(4)}`);
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
