import { contours } from 'd3-contour';
// import { geoPath } from 'd3';
import Konva from 'konva';

function plotFlownetWithContours(potential, streamfunction, layer, width, height, contourValues, flowContourValues) {
    // Remove boundaries from both potential and streamfunction
    // potential = potential.slice(1, -1).map(row => row.slice(1, -1));
    // streamfunction = streamfunction.slice(1, -1).map(row => row.slice(1, -1));

    // console.log(potential)

    const ny = potential.length;
    const nx = potential[0].length;

    const cellWidth = width / nx;
    const cellHeight = height / ny;

    const flatPotential = potential.flat();

    const flatStreamfunction = streamfunction.flat();
    const minStreamfunction = Math.min(...flatStreamfunction);
    const maxStreamfunction = Math.max(...flatStreamfunction);
    // console.log('HI!')
    // console.log(minStreamfunction, maxStreamfunction)
    // Clear the layer
    layer.destroyChildren();

    // Generate flow contours by creating a synthetic "flow potential" field
    // flatStreamfunction.forEach((value, index) => { flatStreamfunction[index] = (value - minStreamfunction) / (maxStreamfunction - minStreamfunction); });
    // console.log(flatStreamfunction)
    // let streamfunctionContourValues = contourValues.map(value => (value - minStreamfunction) / (maxStreamfunction - minStreamfunction));
    // console.log(streamfunctionContourValues)

    drawHeatmap(potential, flatPotential, layer, nx, ny, cellWidth, cellHeight);
    // drawHeatmap(streamfunction, flatStreamfunction, layer, nx, ny, cellWidth, cellHeight);

    drawContours(flatPotential, layer, nx, ny, cellWidth, cellHeight, contourValues, 'white')

    drawContours(flatStreamfunction, layer, nx, ny, cellWidth, cellHeight, contourValues, 'black')

    // Render the layer
    layer.draw();
}

function drawHeatmap(potential, flatPotential, layer, nx, ny, cellWidth, cellHeight){
    const minPotential = Math.min(...flatPotential);
    const maxPotential = Math.max(...flatPotential);
    // Draw heatmap
    let color;
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            
            if (potential[j][i] === null) {
                color = 'rgb(0, 0, 0)';
                // console.log('GOT NULL')
            }
            else {
            color = `rgb(
                ${Math.round(255 * (potential[j][i] - minPotential) / (maxPotential - minPotential))},
                0,
                ${Math.round(255 * (1 - (potential[j][i] - minPotential) / (maxPotential - minPotential)))}
            )`;
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

function drawContours(flatPotential, layer, nx, ny, cellWidth, cellHeight, contourValues, colour){
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
                stroke: colour,
                strokeWidth: 2,
                lineJoin: 'round',
                closed: false, // Ensure it's a line, not a closed shape
            });

            layer.add(line);
        });
    });
}

export { plotFlownetWithContours };