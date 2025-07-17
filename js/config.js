// Configuration and data management
import JSON5 from 'json5';

export const width = 800;
export const height = 600;

// Function to get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to dynamically load a JSON5 file
async function loadDataFile(fileName = 'dam') {
    try {
        const module = await import(`../data/${fileName}.json5`);
        return module.default;
    } catch (error) {
        console.warn(`Could not load ${fileName}.json5, falling back to dam.json5`, error);
        // Fallback to dam.json5 if the requested file doesn't exist
        const fallbackModule = await import('../data/dam.json5');
        return fallbackModule.default;
    }
}

// Initialize data (will be set asynchronously)
export let data = null;
export let points = [];
export let head = null;
export let solid = null;

// Configuration for SOR (will be initialized after data loads)
export let config = {
    points: [],
    width: width,
    height: height,
    head: null,
    gridSize: 100, // Default value
    tolerance: 1e-8,
    omega: 1.8,
    maxIterations: 10000,
};

// Function to initialize data from URL parameter or default
export async function initializeData() {
    const fileParam = getUrlParameter('file') || 'dam';
    return await loadData(fileParam);
}

// Function to load data with a specific file name
export async function loadData(fileName = 'dam') {
    try {
        const rawData = await loadDataFile(fileName);
        data = JSON5.parse(JSON.stringify(rawData));
        points = data.points || [];
        head = data.head || null;
        solid = data.solid || null;

        // Update config
        config.points = points;
        config.head = head;
        config.gridSize = data.gridSize || 100;

        console.log(`Loaded data file: ${fileName}.json5`);
        return data;
    } catch (error) {
        console.error('Failed to load data:', error);
        throw error;
    }
}

// Update config points when points array changes
export function updateConfig() {
    config.points = points;
}

// Function to reload data with a different file (useful for dynamic switching)
export async function reloadData(fileName = null) {
    if (fileName) {
        // Update URL parameter without page reload
        const url = new URL(window.location);
        url.searchParams.set('file', fileName);
        window.history.replaceState({}, '', url);
    }

    const fileParam = getUrlParameter('file') || 'dam';
    return await loadData(fileParam);
}
