// Worker management for SOR calculations
import Worker from './sorWorker.worker.js';
import { config } from './config.js';

let taskId = 0; // Unique task ID for each worker request
let isWorkerBusy = false; // Track if worker is currently processing
let pendingTask = null; // Store the most recent task if worker is busy

// Initialize worker
export const worker = new Worker();

// Function to send task to worker
export function sendTask(data) {
    taskId++;
    data.taskId = taskId;

    if (!isWorkerBusy) {
        // Worker is free, send immediately
        isWorkerBusy = true;
        worker.postMessage(data);
        pendingTask = null;
    } else {
        // Worker is busy, store this as the pending task
        pendingTask = data;
    }
}

// Setup worker message handler
export function setupWorker(onResults) {
    worker.onmessage = function (e) {
        isWorkerBusy = false;

        // Process the result
        if (onResults) {
            onResults(e.data);
        }

        // If there's a pending task, send it now
        if (pendingTask) {
            isWorkerBusy = true;
            worker.postMessage(pendingTask);
            pendingTask = null;
        }
    };
}
