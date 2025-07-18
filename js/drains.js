// Drain visualization and management
import Konva from 'konva';
import { width, height, config, updateConfig } from './config.js';

// Function to draw drain boundary condition
export function drawDrain(layer, sendTask) {
    if (!config.drain) return;

    const drain = config.drain;
    const centerX = drain.x * width;
    const centerY = drain.y * height;
    const radius = drain.r * Math.min(width, height); // Scale radius appropriately

    // Create drain circle
    const drainCircle = new Konva.Circle({
        x: centerX,
        y: centerY,
        radius: radius,
        // fill: 'rgba(0, 100, 200, 0.3)', // Semi-transparent blue
        fill: 'grey',
        // stroke: 'darkblue',
        // strokeWidth: 2,
        name: 'drain',
        draggable: true,
    });

    // Update drain position on drag with bounds checking
    drainCircle.on('dragmove', function () {
        // Apply bounds checking
        const minX = radius;
        const maxX = width - radius;
        const minY = radius;
        const maxY = height - radius;

        let newX = this.x();
        let newY = this.y();

        // Constrain to bounds
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        // Update position if it was constrained
        this.x(newX);
        this.y(newY);

        // Update config
        const normalizedX = newX / width;
        const normalizedY = newY / height;

        // Update drain position in config
        config.drain.x = normalizedX;
        config.drain.y = normalizedY;

        updateConfig();
        sendTask(config);
    });

    // Add hover effects
    drainCircle.on('mouseenter', function () {
        document.body.style.cursor = 'move';
        this.strokeWidth(3);
        layer.draw();
    });

    drainCircle.on('mouseleave', function () {
        document.body.style.cursor = 'default';
        this.strokeWidth(2);
        layer.draw();
    });

    layer.add(drainCircle);
}

export function clearDrain(layer) {
    layer.find('.drain').forEach(d => d.destroy());
}
