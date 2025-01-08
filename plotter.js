import { contours } from 'd3-contour';
// import { geoPath } from 'd3';
import Konva from 'konva';

function plotPotential(potential, layer, width, height) {
    const ny = potential.length;
    const nx = potential[0].length;

    const cellWidth = width / nx;
    const cellHeight = height / ny;

    const minPotential = Math.min(...potential.flat());
    const maxPotential = Math.max(...potential.flat());

    function potentialToColor(value) {
        const normalized = (value - minPotential) / (maxPotential - minPotential);
        const red = Math.round(normalized * 255);
        const blue = 255 - red;
        return `rgb(${red}, 0, ${blue})`;
    }

    layer.destroyChildren();

    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const color = potentialToColor(potential[j][i]);

            const rect = new Konva.Rect({
                x: i * cellWidth,
                y: j * cellHeight,
                width: cellWidth,
                height: cellHeight,
                fill: color,
                stroke: 'black',
                strokeWidth: 1,
            });

            layer.add(rect);
        }
    }

    layer.draw();
}

function plotPotentialWithContours(potential, layer, width, height, contourValues) {
    const ny = potential.length;
    const nx = potential[0].length;

    const cellWidth = width / nx;
    const cellHeight = height / ny;

    const flatPotential = potential.flat();
    const minPotential = Math.min(...flatPotential);
    const maxPotential = Math.max(...flatPotential);

    // Clear the layer
    layer.destroyChildren();

    // Draw heatmap
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const color = `rgb(
                ${Math.round(255 * (potential[j][i] - minPotential) / (maxPotential - minPotential))},
                0,
                ${Math.round(255 * (1 - (potential[j][i] - minPotential) / (maxPotential - minPotential)))}
            )`;

            const rect = new Konva.Rect({
                x: i * cellWidth,
                y: j * cellHeight,
                width: cellWidth,
                height: cellHeight,
                fill: color,
                // stroke: 'black',
                strokeWidth: 1,
            });

            layer.add(rect);
        }
    }

    // Generate contours using d3-contour
    const contourGenerator = contours()
        .size([nx, ny])
        .smooth(1)
        .thresholds(contourValues);

    const contourData = contourGenerator(flatPotential);

    // Manually process and scale each contour ring
    contourData.forEach((contour, index) => {
        contour.coordinates[0].forEach((ring, ringIndex) => {
            const points = ring.flatMap(([x, y]) => [x * cellWidth, y * cellHeight]);

            const line = new Konva.Line({
                points,
                stroke: 'white',
                strokeWidth: 1,
                lineJoin: 'round',
                closed: false, // Ensure it's a line, not a closed shape
            });

            layer.add(line);
        });
    });

    // Render the layer
    layer.draw();
}

function plotFlownetWithContours(potential, layer, width, height, contourValues, flowContourValues) {
    const ny = potential.length;
    const nx = potential[0].length;

    const cellWidth = width / nx;
    const cellHeight = height / ny;

    const flatPotential = potential.flat();
    const minPotential = Math.min(...flatPotential);
    const maxPotential = Math.max(...flatPotential);

    // Clear the layer
    layer.destroyChildren();

    // Draw heatmap
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const color = `rgb(
                ${Math.round(255 * (potential[j][i] - minPotential) / (maxPotential - minPotential))},
                0,
                ${Math.round(255 * (1 - (potential[j][i] - minPotential) / (maxPotential - minPotential)))}
            )`;

            const rect = new Konva.Rect({
                x: i * cellWidth,
                y: j * cellHeight,
                width: cellWidth,
                height: cellHeight,
                fill: color,
                // stroke: 'black',
                strokeWidth: 1,
            });

            layer.add(rect);
        }
    }

    // Generate contours using d3-contour
    const contourGenerator = contours()
        .size([nx, ny])
        .smooth(1)
        .thresholds(contourValues);

    const contourData = contourGenerator(flatPotential);

    // Manually process and scale each contour ring
    contourData.forEach((contour) => {
        if (contour.coordinates.length === 0) {
            return;
        }
        contour.coordinates[0].forEach((ring) => {
            const points = ring.flatMap(([x, y]) => [x * cellWidth, y * cellHeight]);

            const line = new Konva.Line({
                points,
                stroke: 'white',
                strokeWidth: 1,
                lineJoin: 'round',
                closed: false, // Ensure it's a line, not a closed shape
            });

            layer.add(line);
        });
    });

    // Generate flow contours by creating a synthetic "flow potential" field
    const streamfunction = computeStreamfunction(potential, 1, cellWidth, cellHeight);
    console.log(streamfunction);
    const flatFlowPotential = streamfunction.flat();
    const minflowPotential = Math.min(...flatFlowPotential);
    const maxflowPotential = Math.max(...flatFlowPotential);
    flatFlowPotential.forEach((value, index) => { flatFlowPotential[index] = (value - minflowPotential) / (maxflowPotential - minflowPotential); });
    console.log(minflowPotential, maxflowPotential);

    const flowContourGenerator = contours()
        .size([nx, ny])
        .smooth(1)
        .thresholds(flowContourValues);
    const flowData = flowContourGenerator(flatFlowPotential);

    // Draw flow lines
    flowData.forEach((contour) => {
        // console.log(contour.coordinates)
        contour.coordinates[0].forEach((ring) => {
            const points = ring.flatMap(([x, y]) => [x * cellWidth, y * cellHeight]);

            const line = new Konva.Line({
                points,
                stroke: 'green',
                strokeWidth: 2,
                lineJoin: 'round',
                closed: false,
            });

            layer.add(line);
        });
    });

    // Render the layer
    layer.draw();
}

function computeStreamfunction(potential, k, cellWidth, cellHeight) {
    const ny = potential.length;
    const nx = potential[0].length;

    const streamfunction = Array.from({ length: ny }, () => Array(nx).fill(0));

    for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
            // Compute gradients of potential
            const dh_dx = (potential[j][i + 1] - potential[j][i - 1]) / (2 * cellWidth);
            const dh_dy = (potential[j + 1][i] - potential[j - 1][i]) / (2 * cellHeight);

            // Velocity components
            const vx = -k * dh_dx;
            const vy = -k * dh_dy;

            // Compute streamfunction increment
            streamfunction[j][i] =
                streamfunction[j][i - 1] + vy * cellWidth - vx * cellHeight;
        }
    }

    return streamfunction;
}


export { plotPotential, plotPotentialWithContours, plotFlownetWithContours };