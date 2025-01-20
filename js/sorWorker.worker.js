self.onmessage = function (event) {
    const { taskId, points, gridSize, tolerance, omega } = event.data;

    let currentTaskId = 0;
    currentTaskId++;

    if (taskId < currentTaskId) return;

    const cols = gridSize;
    const rows = gridSize;
    let potential = Array.from({ length: rows }, () => Array(cols).fill(0));
    let streamfunction = Array.from({ length: rows }, () => Array(cols).fill(0));
    let isFL = Array.from({ length: rows }, () => Array(cols).fill(false));
    let isEP = Array.from({ length: rows }, () => Array(cols).fill(false));

    function incrementIndex(index, direction, points) {
        index += direction;
            
        if (index < 0) index = points.length - 1;
        if (index > points.length - 1) index = 0;

        return index;
    }
    
    function length(p1, p2) {
        Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }

    // Helper function to find the first numerical BC going backwards or forwards
    function findNearestBC(points, type, startIndex, direction) {
        let prev_index = startIndex;
        let index = incrementIndex(prev_index, direction, points);

        let path_length = 0;

        for (let i = 0; i < points.length - 1; i++) {
            const point = points[index];
            const prev_point = points[prev_index];
            path_length += length(prev_point, point);
            
            if (point.BC.type === type) {
                return { index, BC: point.BC.value, length : path_length };
            }
            
            prev_index = index;
            index = incrementIndex(index, direction, points);

        }
        console.error("Did not find a Nearest BC for type: ", type, "startIndex: ", startIndex, "direction: ", direction);
        // return null; // No numerical BC found in this direction
    }

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


    // Initialize the domain: mark all points
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (!isPointInPolygon(row, col, points)) {
            potential[row][col] = null; // Mark as outside the polygon
            // console.log('OUTSIDE')
            } else {
            // console.log('INSIDE')
                potential[row][col] = 0; // Default initialization inside the polygon
            }
        }
    }

    // Handle boundary conditions
    points.forEach((point, i) => {
        const nextPoint = points[(i + 1) % points.length]; // Wrap back to the first point
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy)) * (gridSize - 1);

        const xIncrement = dx / steps;
        const yIncrement = dy / steps;

        let x = point.x;
        let y = point.y;

        // Handle EP (Equipotential) boundaries
        if (point.BC.type === "EP") {
            const nearestBackward = findNearestBC(points, "FL", i, -1); // BC before the boundary
            const nearestForward = findNearestBC(points, "FL", i, 1); // BC after the boundary
            let next_index = incrementIndex(i, 1, points);
            let incremental_length = length(points[i], points[next_index]);
            total_length = nearestBackward.length + nearestForward.length;
            
            startBC = nearestBackward.BC.value + (nearestForward.BC.value - nearestBackward.BC.value) * nearestBackward.length / total_length;
            endBC = nearestBackward.BC.value + (nearestForward.BC.value - nearestBackward.BC.value) * (nearestBackward.length + incremental_length) / total_length;

            console.log(startBC, endBC, total_length)
            
            
            // console.log(nearestBackward, nearestForward)//, startBC, endBC)
            for (let step = 0; step <= steps; step++) {
                const col = Math.round(x * (gridSize - 1));
                const row = Math.round(y * (gridSize - 1));

                potential[row][col] = point.BC.value; // Fixed EP value
                isEP[row][col] = true;

                const t = step / steps; // Linear interpolation factor
                streamfunction[row][col] = (1 - t) * startBC + t * endBC;

                x += xIncrement;
                y += yIncrement;
            }
        }

        // Handle FL (Flowline) boundaries
        if (point.BC.type === "FL") {
            // Find the nearest numerical BCs for interpolation
            const nearestBackward = findNearestBC(points, "EP", i, -1); // BC before the FL boundary
            const nearestForward = findNearestBC(points, "EP", i, 1); // BC after the FL boundary
            let next_index = incrementIndex(i, 1, points);
            let incremental_length = length(points[i], points[next_index]);
            total_length = nearestBackward.length + nearestForward.length;
            
            startBC = nearestBackward.BC.value + (nearestForward.BC.value - nearestBackward.BC.value) * nearestBackward.length / total_length;
            endBC = nearestBackward.BC.value + (nearestForward.BC.value - nearestBackward.BC.value) * (nearestBackward.length + incremental_length) / total_length;

            if (startBC !== null && endBC !== null) {
                for (let step = 0; step <= steps; step++) {
                    const col = Math.round(x * (gridSize - 1));
                    const row = Math.round(y * (gridSize - 1));

                    const t = step / steps; // Linear interpolation factor
                    potential[row][col] = (1 - t) * startBC + t * endBC;
                    isFL[row][col] = true;

                    streamfunction[row][col] = point.BC.value;

                    x += xIncrement;
                    y += yIncrement;
                }
            }
        }
    });




    // Successive Over-Relaxation (SOR) for potential
    let converged = false;
    while (!converged) {
        if (taskId < currentTaskId) return;

        converged = true;
        for (let row = 1; row < rows - 1; row++) {
            for (let col = 1; col < cols - 1; col++) {
                if (potential[row][col] === null || isEP[row][col]) continue; // Skip EP boundaries

                if (isFL[row][col]) {
                    // Propagate tangentially along flowline
                    potential[row][col] = (
                        potential[row][col - 1] +
                        potential[row][col + 1]
                    ) / 2; // Zero-gradient normal to flowline
                } else {
                    const oldPotential = potential[row][col];
                    const newPotential = (1 - omega) * oldPotential + omega * (
                        (potential[row - 1][col] + potential[row + 1][col] +
                            potential[row][col - 1] + potential[row][col + 1]) / 4
                    );

                    if (Math.abs(newPotential - oldPotential) > tolerance) {
                        converged = false;
                    }
                    potential[row][col] = newPotential;
                }
            }
        }
    }

    // Calculate streamfunction iteratively
    const dx = 1 / (cols - 1);
    for (let row = 1; row < rows - 1; row++) {
        for (let col = 1; col < cols - 1; col++) {
            if (streamfunction[row][col] === null) { streamfunction[row][col] = null; continue; };
            if (potential[row][col] === null) { streamfunction[row][col] = null; continue; };

            const dPhi_dx = (potential[row][col + 1] - potential[row][col - 1]) / 2 / dx;
            // const dPhi_dy = (potential[row + 1][col] - potential[row - 1][col]) / 2;

            streamfunction[row][col] = streamfunction[row - 1][col] + dPhi_dx;
        }
    }

    // Send results back
    if (taskId === currentTaskId) {
        self.postMessage({ potential, streamfunction });
    }
};


