/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./sorWorker.worker.js":
/*!*****************************!*\
  !*** ./sorWorker.worker.js ***!
  \*****************************/
/***/ (() => {

eval("let currentTaskId = 0; // Keeps track of the latest task ID\n\nself.onmessage = function (event) {\n    const { taskId, points, width, height, gridSize, tolerance, omega, k } = event.data;\n\n    // Update the current task ID\n    currentTaskId++;\n\n    // If this task is not the most recent, ignore it\n    if (taskId < currentTaskId) return;\n\n    // Define minX and minY\n    const minX = Math.min(...points.map(p => p.x));\n    const minY = Math.min(...points.map(p => p.y));\n\n    // Create a grid\n    const cols = Math.ceil(width / gridSize) + 1;\n    const rows = Math.ceil(height / gridSize) + 1;\n    let potential = Array.from({ length: rows }, () => Array(cols).fill(0)); // Initialize to 0 for interior nodes\n\n    // Rasterize boundary conditions directly\n    points.forEach((point, i) => {\n        const nextPoint = points[(i + 1) % points.length];\n        const dx = nextPoint.x - point.x;\n        const dy = nextPoint.y - point.y;\n        const steps = Math.max(Math.abs(dx), Math.abs(dy)) / gridSize;\n\n        const xIncrement = dx / steps;\n        const yIncrement = dy / steps;\n\n        let x = point.x;\n        let y = point.y;\n\n        for (let step = 0; step <= steps; step++) {\n            if (taskId < currentTaskId) return; // Stop processing if a new task arrives\n\n            const col = Math.round((x - minX) / gridSize);\n            const row = Math.round((y - minY) / gridSize);\n\n            if (point.BC !== null && point.BC !== undefined) {\n                potential[row][col] = point.BC; // Directly use the potential value\n            }\n\n            x += xIncrement;\n            y += yIncrement;\n        }\n    });\n\n    // Add small initial noise to interior nodes\n    for (let row = 1; row < rows - 1; row++) {\n        for (let col = 1; col < cols - 1; col++) {\n            if (taskId < currentTaskId) return; // Stop processing if a new task arrives\n\n            if (potential[row][col] > -1000 && potential[row][col] <= 0) {\n                potential[row][col] = Math.random() * 1e-4;\n            }\n        }\n    }\n\n    // Successive Over-Relaxation (SOR)\n    let converged = false;\n    while (!converged) {\n        if (taskId < currentTaskId) return; // Stop processing if a new task arrives\n\n        converged = true;\n        for (let row = 1; row < rows - 1; row++) {\n            for (let col = 1; col < cols - 1; col++) {\n                if (potential[row][col] <= 0 || potential[row][col] === -1000) continue; // Skip fixed values and outside domain\n\n                const oldPotential = potential[row][col];\n                const newPotential = (1 - omega) * oldPotential + omega * (\n                    (potential[row - 1][col] + potential[row + 1][col] +\n                     potential[row][col - 1] + potential[row][col + 1]) / 4\n                );\n\n                if (Math.abs(newPotential - oldPotential) > tolerance) {\n                    converged = false;\n                }\n                potential[row][col] = newPotential;\n            }\n        }\n    }\n\n    // Return results only if this task is the most recent\n    if (taskId === currentTaskId) {\n        self.postMessage({ potential });\n    }\n};\n\n\n//# sourceURL=webpack://constitutive-models/./sorWorker.worker.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./sorWorker.worker.js"]();
/******/ 	
/******/ })()
;