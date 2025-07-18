// Keep track of the latest task ID across messages
let currentTaskId = 0;

self.onmessage = function (event) {
    const { taskId, points, gridSize, tolerance, omega, maxIterations, drain } = event.data;

    // Update to the latest task ID
    currentTaskId = taskId;

    const cols = gridSize;
    const rows = gridSize;

    // Grid spacing for numerical derivatives
    const dx = 1 / (cols - 1);
    const dy = 1 / (rows - 1);

    let potential = Array.from({ length: rows }, () => Array(cols).fill(0));
    let streamfunction = Array.from({ length: rows }, () => Array(cols).fill(0));
    let isFL = Array.from({ length: rows }, () => Array(cols).fill(false));
    let isEP = Array.from({ length: rows }, () => Array(cols).fill(false));

    function isPointInPolygon(y, x, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x * (gridSize);
            const yi = points[i].y * (gridSize);
            const xj = points[j].x * (gridSize);
            const yj = points[j].y * (gridSize);

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) {
                inside = !inside;
            }
        }
        return inside;
    }

    // Find min and max potential values from EP boundaries for better initialization
    let minPotential = Infinity;
    let maxPotential = -Infinity;
    points.forEach(point => {
        if (point.BC.type === "EP" && point.BC.value !== undefined) {
            minPotential = Math.min(minPotential, point.BC.value);
            maxPotential = Math.max(maxPotential, point.BC.value);
        }
    });

    // Include drain potential in min/max calculation
    if (drain && drain.BC && drain.BC.value !== undefined) {
        minPotential = Math.min(minPotential, drain.BC.value);
        maxPotential = Math.max(maxPotential, drain.BC.value);
    }

    // If no EP boundaries found, use default range
    if (minPotential === Infinity) {
        minPotential = 0;
        maxPotential = 1;
    }

    // Initialize with average of boundary values for better convergence
    const avgPotential = (minPotential + maxPotential) / 2;

    // Store potential range for relative convergence checking
    const potentialRange = Math.max(maxPotential - minPotential, 1e-12); // Prevent division by zero

    console.log(`Potential range: ${potentialRange}, Using relative tolerance: ${tolerance}`);

    // Initialize the domain: mark all points
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (!isPointInPolygon(row, col, points)) {
                potential[row][col] = null; // Mark as outside the polygon
            } else {
                potential[row][col] = avgPotential; // Initialize with average of boundary values
            }
        }
    }
    // Handle boundary conditions
    points.forEach((point, i) => {
        const nextPoint = points[(i + 1) % points.length]; // Wrap back to the first point
        const deltaX = nextPoint.x - point.x;
        const deltaY = nextPoint.y - point.y;
        const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY)) * (gridSize - 1);

        const xIncrement = deltaX / steps;
        const yIncrement = deltaY / steps;

        let x = point.x;
        let y = point.y;

        // Apply boundary conditions along each boundary segment
        for (let step = 0; step <= steps; step++) {
            const col = Math.round(x * (gridSize - 1));
            const row = Math.round(y * (gridSize - 1));

            if (row >= 0 && row < rows && col >= 0 && col < cols) {
                if (point.BC.type === "EP") {
                    potential[row][col] = point.BC.value;
                    isEP[row][col] = true;
                } else if (point.BC.type === "FL") {
                    isFL[row][col] = true;
                }
            }

            x += xIncrement;
            y += yIncrement;
        }
    });

    // Handle drain boundary condition (circular EP)
    if (drain) {
        const centerCol = Math.round(drain.x * (gridSize - 1));
        const centerRow = Math.round(drain.y * (gridSize - 1));
        const radiusInGridUnits = drain.r * (gridSize - 1);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const distance = Math.sqrt(
                    Math.pow(col - centerCol, 2) + Math.pow(row - centerRow, 2)
                );

                if (distance <= radiusInGridUnits) {
                    potential[row][col] = drain.BC.value;
                    isEP[row][col] = true;
                }
            }
        }
    }

    function applyNeumannBC() {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (isFL[row][col] && !isEP[row][col]) {

                    const neighbors = [
                        { r: row - 1, c: col, dir: 'north' },
                        { r: row + 1, c: col, dir: 'south' },
                        { r: row, c: col - 1, dir: 'west' },
                        { r: row, c: col + 1, dir: 'east' }
                    ];

                    let interiorNeighbors = [];

                    neighbors.forEach(({ r, c, dir }) => {
                        if (r >= 0 && r < rows && c >= 0 && c < cols &&
                            potential[r][c] !== null && !isEP[r][c] && !isFL[r][c]) {
                            interiorNeighbors.push({ r, c, dir, value: potential[r][c] });
                        }
                    });

                    // Apply zero normal gradient - extrapolate from interior point(s)
                    if (interiorNeighbors.length > 0) {
                        let newValue = potential[row][col]; // Default to current value

                        if (interiorNeighbors.length === 1) {
                            // Single interior neighbor - simple extrapolation for zero gradient
                            // Set boundary value equal to interior neighbor (zero gradient)
                            newValue = interiorNeighbors[0].value;
                        } else {
                            // Multiple interior neighbors - use directional extrapolation
                            // For each pair of opposite directions, enforce zero gradient
                            const north = interiorNeighbors.find(n => n.dir === 'north');
                            const south = interiorNeighbors.find(n => n.dir === 'south');
                            const west = interiorNeighbors.find(n => n.dir === 'west');
                            const east = interiorNeighbors.find(n => n.dir === 'east');

                            let gradSum = 0;
                            let gradCount = 0;

                            // For vertical gradient (north-south)
                            if (north && south) {
                                // Interior on both sides - maintain current value (already satisfies zero gradient)
                                gradSum += potential[row][col];
                                gradCount++;
                            } else if (north) {
                                // Extrapolate from north: φ_boundary = φ_north (zero gradient in vertical direction)
                                gradSum += north.value;
                                gradCount++;
                            } else if (south) {
                                // Extrapolate from south: φ_boundary = φ_south (zero gradient in vertical direction)
                                gradSum += south.value;
                                gradCount++;
                            }

                            // For horizontal gradient (west-east)
                            if (west && east) {
                                // Interior on both sides - maintain current value (already satisfies zero gradient)
                                gradSum += potential[row][col];
                                gradCount++;
                            } else if (west) {
                                // Extrapolate from west: φ_boundary = φ_west (zero gradient in horizontal direction)
                                gradSum += west.value;
                                gradCount++;
                            } else if (east) {
                                // Extrapolate from east: φ_boundary = φ_east (zero gradient in horizontal direction)
                                gradSum += east.value;
                                gradCount++;
                            }

                            if (gradCount > 0) {
                                newValue = gradSum / gradCount;
                            } else {
                                // Fallback: average all interior neighbors
                                newValue = interiorNeighbors.reduce((sum, n) => sum + n.value, 0) / interiorNeighbors.length;
                            }
                        }

                        // Apply with relaxation for stability
                        potential[row][col] = (1 - omega) * potential[row][col] + omega * newValue;
                    }
                    // If no interior neighbors found, keep current value (shouldn't happen in well-posed problems)
                }
            }
        }
    }

    // Successive Over-Relaxation (SOR) for potential
    let converged = false;
    let iterations = 0;

    while (!converged && iterations < maxIterations) {
        if (taskId < currentTaskId) return;

        converged = true;
        let maxChange = 0;

        for (let row = 1; row < rows - 1; row++) {
            for (let col = 1; col < cols - 1; col++) {
                if (potential[row][col] === null || isEP[row][col] || isFL[row][col]) continue; // Skip boundaries and outside domain

                const oldPotential = potential[row][col];

                // Standard Laplace equation for interior points only
                potential[row][col] = (1 - omega) * oldPotential + omega * (
                    (potential[row - 1][col] + potential[row + 1][col] +
                        potential[row][col - 1] + potential[row][col + 1]) / 4
                );

                const change = Math.abs(potential[row][col] - oldPotential);
                maxChange = Math.max(maxChange, change);

                // Normalize change by potential range for relative convergence
                const relativeChange = change / potentialRange;
                if (relativeChange > tolerance) {
                    converged = false;
                }
            }
        }

        // Apply Neumann boundary conditions after each iteration
        applyNeumannBC();

        iterations++;
    }

    // console.log(`SOR converged after ${iterations} iterations`);

    if (iterations >= maxIterations) {
        console.warn("SOR did not converge within maximum iterations");
    }

    // Calculate streamfunction from potential field
    // Use simple, robust integration method for orthogonal flow nets
    // Relationship: ∂ψ/∂x = ∂φ/∂y and ∂ψ/∂y = -∂φ/∂x

    // Initialize streamfunction 
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (potential[row][col] === null) {
                streamfunction[row][col] = null;
            } else {
                streamfunction[row][col] = 0.0;
            }
        }
    }

    // Set a reference point (bottom-left corner of domain)
    let refRow = -1, refCol = -1;
    for (let row = rows - 1; row >= 0; row--) {
        for (let col = 0; col < cols; col++) {
            if (potential[row][col] !== null) {
                refRow = row;
                refCol = col;
                break;
            }
        }
        if (refRow !== -1) break;
    }

    if (refRow !== -1) {
        streamfunction[refRow][refCol] = 0.0;

        // First, integrate along the bottom row (constant y)
        for (let col = refCol + 1; col < cols; col++) {
            if (potential[refRow][col] !== null && potential[refRow][col - 1] !== null) {
                // ∂ψ/∂x = ∂φ/∂y (using central difference for ∂φ/∂y)
                let dPhi_dy = 0;
                if (refRow > 0 && refRow < rows - 1 &&
                    potential[refRow + 1][col] !== null && potential[refRow - 1][col] !== null) {
                    dPhi_dy = (potential[refRow + 1][col] - potential[refRow - 1][col]) / (2 * dy);
                } else if (refRow > 0 && potential[refRow - 1][col] !== null) {
                    dPhi_dy = (potential[refRow][col] - potential[refRow - 1][col]) / dy;
                } else if (refRow < rows - 1 && potential[refRow + 1][col] !== null) {
                    dPhi_dy = (potential[refRow + 1][col] - potential[refRow][col]) / dy;
                }

                streamfunction[refRow][col] = streamfunction[refRow][col - 1] + dPhi_dy * dx;
            } else {
                streamfunction[refRow][col] = null;
            }
        }

        // Then integrate upward from each point on the bottom row
        for (let col = refCol; col < cols; col++) {
            if (potential[refRow][col] !== null) {
                for (let row = refRow - 1; row >= 0; row--) {
                    if (potential[row][col] !== null && potential[row + 1][col] !== null) {
                        // ∂ψ/∂y = -∂φ/∂x (using central difference for ∂φ/∂x)
                        let dPhi_dx = 0;
                        if (col > 0 && col < cols - 1 &&
                            potential[row][col + 1] !== null && potential[row][col - 1] !== null) {
                            dPhi_dx = (potential[row][col + 1] - potential[row][col - 1]) / (2 * dx);
                        } else if (col > 0 && potential[row][col - 1] !== null) {
                            dPhi_dx = (potential[row][col] - potential[row][col - 1]) / dx;
                        } else if (col < cols - 1 && potential[row][col + 1] !== null) {
                            dPhi_dx = (potential[row][col + 1] - potential[row][col]) / dx;
                        }

                        streamfunction[row][col] = streamfunction[row + 1][col] - dPhi_dx * dy;
                    } else {
                        streamfunction[row][col] = null;
                    }
                }
            }
        }

        // Similarly integrate downward from the reference row
        for (let col = refCol; col < cols; col++) {
            if (potential[refRow][col] !== null) {
                for (let row = refRow + 1; row < rows; row++) {
                    if (potential[row][col] !== null && potential[row - 1][col] !== null) {
                        // ∂ψ/∂y = -∂φ/∂x
                        let dPhi_dx = 0;
                        if (col > 0 && col < cols - 1 &&
                            potential[row][col + 1] !== null && potential[row][col - 1] !== null) {
                            dPhi_dx = (potential[row][col + 1] - potential[row][col - 1]) / (2 * dx);
                        } else if (col > 0 && potential[row][col - 1] !== null) {
                            dPhi_dx = (potential[row][col] - potential[row][col - 1]) / dx;
                        } else if (col < cols - 1 && potential[row][col + 1] !== null) {
                            dPhi_dx = (potential[row][col + 1] - potential[row][col]) / dx;
                        }

                        streamfunction[row][col] = streamfunction[row - 1][col] - dPhi_dx * dy;
                    } else {
                        streamfunction[row][col] = null;
                    }
                }
            }
        }
    }

    self.postMessage({
        taskId: taskId,
        potential: potential,
        streamfunction: streamfunction,
    });
};
