import { contours } from 'd3-contour';
// import { geoPath } from 'd3';
import Konva from 'konva';
import { Lut } from './Lut.js';

function plotFlownetWithContours(potential, streamfunction, layer, width, height) {
    const ny = potential.length;
    const nx = potential[0].length;

    const cellWidth = width / nx;
    const cellHeight = height / ny;

    // Filter out null values and calculate ranges
    const flatPotential = potential.flat().filter(v => v !== null);
    const flatStreamfunction = streamfunction.flat().filter(v => v !== null);

    const minPotential = Math.min(...flatPotential);
    const maxPotential = Math.max(...flatPotential);
    const minStreamfunction = Math.min(...flatStreamfunction);
    const maxStreamfunction = Math.max(...flatStreamfunction);

    const numEquipotentials = 10;
    const deltaEquipotential = (maxPotential - minPotential) / (numEquipotentials + 1);

    console.log(`Potential range: ${minPotential.toFixed(4)} to ${maxPotential.toFixed(4)}`);
    console.log(`Streamfunction range: ${minStreamfunction.toFixed(4)} to ${maxStreamfunction.toFixed(4)}`);

    // Clear the layer
    layer.destroyChildren();

    // Auto-generate evenly spaced equipotential contour levels
    const autoEquipotentialLevels = [];
    for (let i = 1; i <= numEquipotentials; i++) {
        autoEquipotentialLevels.push(minPotential + i * deltaEquipotential);
    }

    // Auto-generate streamline contour levels to form squares
    // Set the number of streamlines so that the spacing is the same as equipotential levels


    const streamStep = deltaEquipotential;
    const numStreamlines = Math.ceil((maxStreamfunction - minStreamfunction) / streamStep);
    const autoStreamlineLevels = [];
    for (let i = 1; i <= numStreamlines; i++) {
        autoStreamlineLevels.push(minStreamfunction + i * streamStep);
    }

    console.log('Equipotential levels:', autoEquipotentialLevels.map(v => v.toFixed(4)));
    console.log('Streamline levels:', autoStreamlineLevels.map(v => v.toFixed(4)));

    // Create flat arrays with nulls for contouring
    const flatPotentialWithNulls = potential.flat();
    const flatStreamfunctionWithNulls = streamfunction.flat();

    // drawHeatmap(potential, flatPotential, layer, nx, ny, cellWidth, cellHeight);

    drawContours(flatPotentialWithNulls, layer, nx, ny, cellWidth, cellHeight, autoEquipotentialLevels, 'red', 'Equipotentials')

    drawContours(flatStreamfunctionWithNulls, layer, nx, ny, cellWidth, cellHeight, autoStreamlineLevels, 'blue', 'Streamlines')

    // Render the layer
    layer.draw();
}

function drawHeatmap(potential, flatPotential, layer, nx, ny, cellWidth, cellHeight) {
    const minPotential = Math.min(...flatPotential);
    const maxPotential = Math.max(...flatPotential);

    // Create a colormap for potential visualization
    // 'viridis' is excellent for scientific data - perceptually uniform and colorblind-friendly
    const lut = new Lut('inferno', 256);
    lut.setMin(minPotential);
    lut.setMax(maxPotential);

    // Draw heatmap
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            let color;

            if (potential[j][i] === null) {
                color = 'rgb(0, 0, 0)'; // Black for null values (outside domain)
            } else {
                // Get color from the colormap
                const lutColor = lut.getColor(potential[j][i]);
                color = `rgb(${Math.round(lutColor.r * 255)}, ${Math.round(lutColor.g * 255)}, ${Math.round(lutColor.b * 255)})`;
            }

            const rect = new Konva.Rect({
                x: i * cellWidth,
                y: j * cellHeight,
                width: cellWidth,
                height: cellHeight,
                fill: color,
                // stroke: 'black',
                // strokeWidth: 1,
            });

            layer.add(rect);
        }
    }
}

function drawContours(flatData, layer, nx, ny, cellWidth, cellHeight, contourValues, colour, label) {
    // Replace null values with NaN for d3-contour (it handles NaN better than null)
    const processedData = flatData.map(v => v === null ? NaN : v);

    // Generate contours using d3-contour
    const contourGenerator = contours()
        .size([nx, ny])
        .smooth(true)
        .thresholds(contourValues);

    const contourData = contourGenerator(processedData);

    console.log(`${label}: Generated ${contourData.length} contour lines`);

    // Manually process and scale each contour ring
    contourData.forEach((contour, index) => {
        if (contour.coordinates.length === 0) {
            return;
        }
        contour.coordinates.forEach((polygon) => {
            polygon.forEach((ring) => {
                const points = ring.flatMap(([x, y]) => [x * cellWidth, y * cellHeight]);

                const line = new Konva.Line({
                    points,
                    stroke: colour,
                    strokeWidth: 2,
                    lineJoin: 'round',
                    lineCap: 'round',
                    closed: false,
                });

                layer.add(line);
            });
        });
    });
}

export { plotFlownetWithContours };