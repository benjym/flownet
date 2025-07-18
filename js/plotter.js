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

    // console.log(`Potential range: ${minPotential.toFixed(4)} to ${maxPotential.toFixed(4)}`);
    // console.log(`Streamfunction range: ${minStreamfunction.toFixed(4)} to ${maxStreamfunction.toFixed(4)}`);

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

    // console.log('Equipotential levels:', autoEquipotentialLevels.map(v => v.toFixed(4)));
    // console.log('Streamline levels:', autoStreamlineLevels.map(v => v.toFixed(4)));

    // Create flat arrays with nulls for contouring
    const flatPotentialWithNulls = potential.flat();
    const flatStreamfunctionWithNulls = streamfunction.flat();

    if (heatmapVisible) {
        drawHeatmap(potential, flatPotential, layer, nx, ny, cellWidth, cellHeight);
    }

    drawContours(flatPotentialWithNulls, layer, nx, ny, cellWidth, cellHeight, autoEquipotentialLevels, 'red', 'Equipotentials')

    drawContours(flatStreamfunctionWithNulls, layer, nx, ny, cellWidth, cellHeight, autoStreamlineLevels, 'blue', 'Streamlines')

    // Render the layer
    layer.draw();
}

function drawHeatmap(potential, flatPotential, layer, nx, ny, cellWidth, cellHeight) {
    // Calculate upward vertical hydraulic gradients for piping risk analysis
    const dx = 1 / (nx - 1); // Grid spacing in normalized coordinates
    const dy = 1 / (ny - 1);

    // Critical hydraulic gradient (typical value for sandy soils)
    const criticalGradient = (2.65 - 1.0) / (1 + 1); // i_c = (G_s - 1), assuming G_s ≈ 2.65

    // Calculate upward vertical gradient at each point (positive = upward flow)
    const upwardGradient = Array.from({ length: ny }, () => Array(nx).fill(null));

    for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
            if (potential[j][i] === null) {
                upwardGradient[j][i] = null;
                continue;
            }

            // Calculate vertical gradient (∂φ/∂y) using central differences
            // Note: In screen coordinates, j increases downward
            // For upward flow: potential decreases as j increases (going down)
            // So upward flow = positive (∂φ/∂y) when using physical coordinates
            let dPhi_dy = 0;

            if (potential[j - 1][i] !== null && potential[j + 1][i] !== null) {
                // Central difference: (φ_down - φ_up) / (2*dy)
                // Positive when potential decreases going down = upward flow
                dPhi_dy = (potential[j + 1][i] - potential[j - 1][i]) / (2 * dy);
            } else if (potential[j - 1][i] !== null) {
                dPhi_dy = (potential[j][i] - potential[j - 1][i]) / dy;
            } else if (potential[j + 1][i] !== null) {
                dPhi_dy = (potential[j + 1][i] - potential[j][i]) / dy;
            }

            // Store only upward gradients (positive values indicate upward flow)
            upwardGradient[j][i] = Math.max(0, dPhi_dy); // Only positive (upward) gradients matter for piping
        }
    }

    // Handle boundary points with forward/backward differences
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            if (upwardGradient[j][i] === 0 && potential[j][i] !== null) {
                let dPhi_dy = 0;

                // Edge cases for vertical gradient calculation
                if (j === 0 && j + 1 < ny && potential[j + 1][i] !== null) {
                    dPhi_dy = (potential[j + 1][i] - potential[j][i]) / dy;
                } else if (j === ny - 1 && j - 1 >= 0 && potential[j - 1][i] !== null) {
                    dPhi_dy = (potential[j][i] - potential[j - 1][i]) / dy;
                }

                upwardGradient[j][i] = Math.max(0, dPhi_dy); // Only upward gradients
            }
        }
    }

    // Find min/max upward gradients for color scaling
    const flatGradients = upwardGradient.flat().filter(v => v !== null && v !== undefined);
    const maxGradient = Math.max(...flatGradients);

    // Create colormap for piping risk visualization based on upward gradient
    const createPipingRiskColor = (gradient) => {
        if (gradient === null || gradient === undefined) {
            return { r: 0, g: 0, b: 0, a: 255 }; // Black for null values
        }

        // For upward gradients, calculate safety factor directly
        const safetyFactor = criticalGradient / Math.max(gradient, 1e-6);

        if (safetyFactor >= 5) {
            // Very safe - Green
            return { r: 0, g: 128, b: 0, a: 255 };
        } else if (safetyFactor >= 3) {
            // Safe - Light green to yellow
            const t = (5 - safetyFactor) / 2; // 0 to 1
            return { r: Math.round(t * 255), g: 255, b: 0, a: 255 };
        } else if (safetyFactor >= 1.5) {
            // Caution - Yellow to orange
            const t = (3 - safetyFactor) / 1.5; // 0 to 1
            return { r: 255, g: Math.round(255 * (1 - t * 0.5)), b: 0, a: 255 };
        } else if (safetyFactor >= 1) {
            // High risk - Orange to red
            const t = (1.5 - safetyFactor) / 0.5; // 0 to 1
            return { r: 255, g: Math.round(128 * (1 - t)), b: 0, a: 255 };
        } else {
            // Critical - Red to purple (upward gradient exceeds critical)
            const t = Math.min((gradient / criticalGradient - 1) / 2, 1); // 0 to 1
            return { r: Math.round(255 * (1 - t * 0.5)), g: 0, b: Math.round(t * 255), a: 255 };
        }
    };

    // Create canvas for efficient pixel manipulation
    const canvas = document.createElement('canvas');
    const width = layer.width() || nx * cellWidth;
    const height = layer.height() || ny * cellHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Create ImageData
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Bilinear interpolation function
    const bilinearInterpolate = (x, y, upwardGradient) => {
        // Convert pixel coordinates to grid coordinates
        const gx = (x / width) * (nx - 1);
        const gy = (y / height) * (ny - 1);

        // Get the four surrounding grid points
        const x1 = Math.floor(gx);
        const x2 = Math.min(x1 + 1, nx - 1);
        const y1 = Math.floor(gy);
        const y2 = Math.min(y1 + 1, ny - 1);

        // Get values at the four corners
        const q11 = upwardGradient[y1][x1];
        const q21 = upwardGradient[y1][x2];
        const q12 = upwardGradient[y2][x1];
        const q22 = upwardGradient[y2][x2];

        // If any corner is null, fall back to nearest neighbor
        if (q11 === null || q21 === null || q12 === null || q22 === null) {
            const nearestX = Math.round(gx);
            const nearestY = Math.round(gy);
            if (nearestX >= 0 && nearestX < nx && nearestY >= 0 && nearestY < ny) {
                return upwardGradient[nearestY][nearestX];
            }
            return null;
        }

        // Calculate interpolation weights
        const wx = gx - x1;
        const wy = gy - y1;

        // Bilinear interpolation
        const interpolated = q11 * (1 - wx) * (1 - wy) +
            q21 * wx * (1 - wy) +
            q12 * (1 - wx) * wy +
            q22 * wx * wy;

        return interpolated;
    };

    // Fill pixel data with interpolated values
    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            // Get interpolated upward gradient value at this pixel
            const interpolatedGradient = bilinearInterpolate(px, py, upwardGradient);
            const color = createPipingRiskColor(interpolatedGradient);

            const pixelIndex = (py * width + px) * 4;
            data[pixelIndex] = color.r;     // Red
            data[pixelIndex + 1] = color.g; // Green
            data[pixelIndex + 2] = color.b; // Blue
            data[pixelIndex + 3] = color.a; // Alpha
        }
    }

    // Put the image data on the canvas
    ctx.putImageData(imageData, 0, 0);

    // Create Konva image from canvas
    const image = new Konva.Image({
        x: 0,
        y: 0,
        image: canvas,
        width: width,
        height: height,
        name: 'piping-heatmap'
    });


    layer.add(image);

    console.log(`Piping analysis: Max upward gradient = ${maxGradient.toFixed(4)}, Critical gradient = ${criticalGradient.toFixed(2)}`);
}// Global variables to track visibility
let colorbarVisible = true;
let heatmapVisible = true;

// Function to toggle colorbar and heatmap visibility
export function toggleColorbar(layer, width, height) {
    // Toggle both heatmap and colorbar
    heatmapVisible = !heatmapVisible;
    colorbarVisible = !colorbarVisible;

    // Toggle HTML colorbar element visibility
    const htmlColorbar = document.getElementById('piping-colorbar');
    if (htmlColorbar) {
        if (colorbarVisible) {
            htmlColorbar.classList.remove('hidden');
        } else {
            htmlColorbar.classList.add('hidden');
        }
    }
}

function drawContours(flatData, layer, nx, ny, cellWidth, cellHeight, contourValues, colour, label) {
    // Replace null values with NaN for d3-contour (it handles NaN better than null)
    const processedData = flatData.map(v => v === null ? NaN : v);

    // Generate contours using d3-contour
    const contourGenerator = contours()
        .size([nx, ny])
        // .smooth(true)
        .thresholds(contourValues);

    const contourData = contourGenerator(processedData);

    // console.log(`${label}: Generated ${contourData.length} contour lines`);

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