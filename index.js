import css from './main.css';
import Konva from 'konva';
import Worker from './sorWorker.worker.js';

let taskId = 0; // Unique task ID for each worker request
const width = 800;
const height = 600;

// let points = [
//     { x: 100, y: 100, BC: 50 },
//     { x: 700, y: 100 },
//     { x: 700, y: height / 2.0 },
//     { x: width, y: height / 2.0 },
//     { x: width, y: height },
//     { x: 0, y: height, BC:100 },
//     { x: 0, y: height / 2.0 },
//     { x: 100, y: height / 2.0 },
// ];

let points = [
    {x:0, y: 0, BC: 100},
    {x:width, y: 0, BC:200},
    {x:width, y: height/2.},
    {x:width, y: height},
    {x:0, y: height}
]

let head = {
    left: 120,
    right: 200
};

// Configuration for SOR
const worker = new Worker();
const config = {
    points: points,
    width: width,
    height: height,
    head: head,
    gridSize: 10,
    tolerance: 1e-6,
    omega: 1.8,
    k: 1,
};

function sendTask(data){
    taskId++;
    data.taskId = taskId;
    worker.postMessage(data);
}

// Handle results from the worker
worker.onmessage = function (e) {
    plotPotential(e.data.potential, layer2);
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

// Function to draw the domain
function drawPolygon() {
    if (polygon) {
        polygon.destroy();
    }

    if (points.length > 1) {
        polygon = new Konva.Line({
            points: points.flatMap(p => [p.x, p.y]),
            stroke: 'brown',
            strokeWidth: 2,
            closed: true,
        });

        layer.add(polygon);
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
        head.left = leftLine.points()[1];
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
        head.right = rightLine.points()[1];
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
            x: point.x,
            y: point.y,
            radius: 5,
            fill: 'white',
            draggable: true,
        });

        circle.on('dragmove', () => {
            points[index] = { x: circle.x(), y: circle.y() };
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

function plotPotential(potential, layer) {
    const ny = potential.length;
    const nx = potential[0].length;

    const minX = Math.min(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxX = Math.max(...points.map(p => p.x));
    const maxY = Math.max(...points.map(p => p.y));
    console.log(minX,maxX)

    const cellWidth = (maxX - minX)/ nx;
    const cellHeight = (maxY - minY) / ny;

    const minPotential = Math.min(...potential.flat());
    // const minPotential = 10;
    const maxPotential = Math.max(...potential.flat());

    function potentialToColor(value) {
        const normalized = (value - minPotential) / (maxPotential - minPotential);
        const red = Math.round(normalized * 255);
        const blue = 255 - red;
        return `rgb(${red}, 0, ${blue})`;
    }

    layer.destroyChildren();

    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const color = potentialToColor(potential[j][i]);

            const rect = new Konva.Rect({
                x: minX + i * cellWidth,
                y: minY + j * cellHeight,
                width: cellWidth,
                height: cellHeight,
                fill: color,
            });

            layer.add(rect);
        }
    }

    layer.draw();
}

// Initialize
drawPolygon();
makePointsDraggable();
