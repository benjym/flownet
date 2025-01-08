let currentTaskId = 0; // Keeps track of the latest task ID

self.onmessage = function (event) {
    const { taskId, points, width, height, gridSize, tolerance, omega, k } = event.data;

    // Update the current task ID
    currentTaskId++;

    // If this task is not the most recent, ignore it
    if (taskId < currentTaskId) return;

    // Define minX and minY
    const minX = Math.min(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));

    // Create a grid
    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;
    let potential = Array.from({ length: rows }, () => Array(cols).fill(0)); // Initialize to 0 for interior nodes

    // Rasterize boundary conditions directly
    points.forEach((point, i) => {
        const nextPoint = points[(i + 1) % points.length];
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy)) / gridSize;

        const xIncrement = dx / steps;
        const yIncrement = dy / steps;

        let x = point.x;
        let y = point.y;

        for (let step = 0; step <= steps; step++) {
            if (taskId < currentTaskId) return; // Stop processing if a new task arrives

            const col = Math.round((x - minX) / gridSize);
            const row = Math.round((y - minY) / gridSize);

            if (point.BC !== null && point.BC !== undefined) {
                potential[row][col] = point.BC; // Directly use the potential value
            }

            x += xIncrement;
            y += yIncrement;
        }
    });

    // Add small initial noise to interior nodes
    for (let row = 1; row < rows - 1; row++) {
        for (let col = 1; col < cols - 1; col++) {
            if (taskId < currentTaskId) return; // Stop processing if a new task arrives

            if (potential[row][col] > -1000 && potential[row][col] <= 0) {
                potential[row][col] = Math.random() * 1e-4;
            }
        }
    }

    // Successive Over-Relaxation (SOR)
    let converged = false;
    while (!converged) {
        if (taskId < currentTaskId) return; // Stop processing if a new task arrives

        converged = true;
        for (let row = 1; row < rows - 1; row++) {
            for (let col = 1; col < cols - 1; col++) {
                if (potential[row][col] <= 0 || potential[row][col] === -1000) continue; // Skip fixed values and outside domain

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

    // Return results only if this task is the most recent
    if (taskId === currentTaskId) {
        self.postMessage({ potential });
    }
};
