// Domain boundary visualization
import Konva from 'konva';
import { width, height, points, solid } from './config.js';

let polygon = null;
let solid_line = null;

// Function to draw the domain boundary
export function drawDomainBoundary(layer) {
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

        layer.add(polygon);
    }

    if (solid_line) {
        solid_line.destroy();
    }

    if (solid) {
        if (solid.length > 1) {
            solid_line = new Konva.Line({
                points: solid.flatMap(p => [p.x * width, p.y * height]),
                fill: 'gray',
                closed: true,
            });

            layer.add(solid_line);
        }
    }
}

// Function to make points draggable
export function makePointsDraggable(layer, onPointMove) {
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
            if (onPointMove) onPointMove();
        });

        circle.on('mousedown', (e) => {
            e.cancelBubble = true;
        });

        layer.add(circle);
    });

    layer.draw();
}
