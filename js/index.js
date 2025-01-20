import css from '../css/main.css';
// import json5_file from '../data/test.json5';
import json5_file from '../data/dam.json5';
import JSON5 from 'json5';
import Konva from 'konva';
import Worker from './sorWorker.worker.js';
import { plotFlownetWithContours } from './plotter.js';

let taskId = 0; // Unique task ID for each worker request
const width = 800;
const height = 600;

// Initial points for the domain

let data = JSON5.parse(JSON.stringify(json5_file));
let points = data.points;
let head = data.head;
let solid = data.solid;

// Configuration for SOR
const worker = new Worker();
const config = {
    points: points,
    width: width,
    height: height,
    head: head,
    gridSize: data.gridSize,
    tolerance: 1e-6,
    omega: 1.8,
    k: 1,
};

function sendTask(data) {
    taskId++;
    data.taskId = taskId;
    worker.postMessage(data);
}

// Handle results from the worker
worker.onmessage = function (e) {
    // plotPotential(e.data.potential, layer2, width, height);
    // plotPotentialWithContours(e.data.potential, layer2, width, height, data.contourValues);
    plotFlownetWithContours(e.data.potential, e.data.streamfunction, layer2, width, height, data.contourValues, data.contourValues);
};

const stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height,
});

const layer = new Konva.Layer();
const layer2 = new Konva.Layer();
stage.add(layer2);
stage.add(layer);

let polygon = null;
let solid_line = null;

// Function to draw the domain
function drawPolygon() {
    if (polygon) {
        polygon.destroy();
    }

    if (points.length > 1) {
        polygon = new Konva.Group();
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            let colour = p1.BC.type === 'FL' ? 'red' : 'white';
            const p2 = points[(i + 1) % points.length];
            const line = new Konva.Line({
                points: [p1.x * width, p1.y * height, p2.x * width, p2.y * height],
                stroke: colour,
                strokeWidth: 8,
            });
            polygon.add(line);
        }
        // polygon = new Konva.Line({
        //     points: points.flatMap(p => [p.x * width, p.y * height]),
        //     // stroke: 'brown',
        //     stroke: colours,
        //     strokeWidth: 2,
        //     closed: true,
        // });

        layer.add(polygon);
    }

    if (solid_line) {
        solid_line.destroy();
    }

    if (solid.length > 1) {
        console.log(solid)
        solid_line = new Konva.Line({
            points: solid.flatMap(p => [p.x * width, p.y * height]),
            fill: 'gray',
            closed: true,
        });

        layer.add(solid_line);
    }
    drawHeadLevelLines();
    layer.draw();
    config.points = points;
    sendTask(config);
}

// Function to calculate the first intersection
function findFirstIntersection(yLevel, xStart, direction = 'left') {
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        if ((p1.y <= yLevel && p2.y >= yLevel) || (p1.y >= yLevel && p2.y <= yLevel)) {
            const slope = (p2.x - p1.x) / (p2.y - p1.y);
            const xIntersect = p1.x + slope * (yLevel - p1.y);
            if ((direction === 'left' && xIntersect >= xStart) || (direction === 'right' && xIntersect <= xStart)) {
                return xIntersect;
            }
        }
    }
    return null;
}

// Function to draw head level lines
function drawHeadLevelLines() {

    layer.find('.head-line').forEach(line => line.destroy());

    // Left head line
    const leftIntersection = findFirstIntersection(head.left, 0, 'left');
    const leftLine = new Konva.Line({
        points: [0, head.left, leftIntersection !== null ? leftIntersection : width, head.left],
        stroke: 'green',
        strokeWidth: 2,
        name: 'head-line',
        draggable: true
    });

    leftLine.on('dragmove', () => {
        head.left = leftLine.points()[1] / height;
        drawHeadLevelLines();
    });

    layer.add(leftLine);

    // Right head line
    const rightIntersection = findFirstIntersection(head.right, width, 'right');
    const rightLine = new Konva.Line({
        points: [rightIntersection !== null ? rightIntersection : 0, head.right, width, head.right],
        stroke: 'blue',
        strokeWidth: 2,
        name: 'head-line',
        draggable: true
    });

    rightLine.on('dragmove', () => {
        head.right = rightLine.points()[1] / height;
        drawHeadLevelLines();
    });

    layer.add(rightLine);
    layer.draw();
    config.head = head; // Update the head configuration
    sendTask(config);
}

// Make points draggable
function makePointsDraggable() {
    layer.find('Circle').forEach(circle => circle.destroy());

    points.forEach((point, index) => {
        const circle = new Konva.Circle({
            x: point.x * width,
            y: point.y * height,
            radius: 5,
            fill: 'white',
            draggable: true,
        });

        circle.on('dragmove', () => {
            points[index].x = circle.x() / width;
            points[index].y = circle.y() / height;
            drawPolygon();
        });

        circle.on('mousedown', (e) => {
            e.cancelBubble = true;
        });

        layer.add(circle);
    });

    layer.draw();
    config.points = points;
    sendTask(config);
}



// Initialize
drawPolygon();
// makePointsDraggable();
