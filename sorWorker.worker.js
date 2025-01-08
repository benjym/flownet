let currentTaskId = 0; // Keeps track of the latest task ID

self.onmessage = function (event) {
    const { taskId, points, gridSize, tolerance, omega } = event.data;

    // Update the current task ID
    currentTaskId++;

    // If this task is not the most recent, ignore it
    if (taskId < currentTaskId) return;

    // Create a grid
    const cols = gridSize;
    const rows = gridSize;
    let potential = Array.from({ length: rows }, () => Array(cols).fill(0)); // Initialize to 0 for interior nodes
    let isFL = Array.from({ length: rows }, () => Array(cols).fill(false)); // Mask for flow lines
    let isEP = Array.from({ length: rows }, () => Array(cols).fill(false)); // Mask for equipotentials

    // Rasterize boundary conditions directly
    points.forEach((point, i) => {
        const nextPoint = points[(i + 1) % points.length];
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy)) * (gridSize - 1);

        const xIncrement = dx / steps;
        const yIncrement = dy / steps;

        let x = point.x;
        let y = point.y;

        for (let step = 0; step <= steps; step++) {
            if (taskId < currentTaskId) return; // Stop processing if a new task arrives

            const col = Math.round(x * (gridSize - 1));
            const row = Math.round(y * (gridSize - 1));

            if (point.BC !== null && point.BC !== undefined) {
                if (point.BC === "FL") {
                    // Mark as flow line
                    isFL[row][col] = true;
                } else {
                    // Equipotential: directly set the value
                    potential[row][col] = point.BC;
                    isEP[row][col] = true;
                }
            }

            x += xIncrement;
            y += yIncrement;
        }
    });

    // Add small initial noise to interior nodes
    for (let row = 1; row < rows - 1; row++) {
        for (let col = 1; col < cols - 1; col++) {
            if (taskId < currentTaskId) return; // Stop processing if a new task arrives

            if (!isEP[row][col] && !isFL[row][col]) {
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
                if (isFL[row][col]) {
                    // Maintain zero-gradient condition for flow lines
                    potential[row][col] = (potential[row - 1][col] + potential[row + 1][col] +
                        potential[row][col - 1] + potential[row][col + 1]) / 4;
                } else if (!isEP[row][col]) {
                    // Update only non-boundary, non-flow-line nodes
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

    // Return results only if this task is the most recent
    if (taskId === currentTaskId) {
        self.postMessage({ potential });
    }
};
