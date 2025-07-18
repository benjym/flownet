// Water level visualization for EP boundary conditions
import Konva from 'konva';
import { width, height, points, config, updateConfig } from './config.js';
import { updateStandpipes } from './standpipes.js';
export let datum = 0;

// Function to draw water levels for EP boundary conditions
export function drawWaterLevels(layer, sendTask) {
    points.forEach((point, index) => {
        if (point.BC.type === 'EP' && point.BC.value !== undefined) {
            const baseX = point.x * width;
            const baseY = point.y * height;

            datum = point.y;

            // Calculate water level position (distance above base point based on BC value)
            // Use BC value directly as distance in pixels (scaled down for reasonable display)
            const waterHeight = point.BC.value * height;
            const waterY = baseY - waterHeight;

            // Find the boundary line this point belongs to for proper water area rendering
            const nextPointIndex = (index + 1) % points.length;
            const nextPoint = points[nextPointIndex];
            const lineLength = Math.sqrt(
                Math.pow((nextPoint.x - point.x) * width, 2) +
                Math.pow((nextPoint.y - point.y) * height, 2)
            );

            // Create water area along the boundary line
            const angle = Math.atan2(
                (nextPoint.y - point.y) * height,
                (nextPoint.x - point.x) * width
            );

            // Create a polygon for the water area
            const waterPoints = [
                baseX, baseY,
                baseX + Math.cos(angle) * lineLength, baseY + Math.sin(angle) * lineLength,
                baseX + Math.cos(angle) * lineLength, waterY + Math.sin(angle) * lineLength,
                baseX, waterY
            ];

            const waterArea = new Konva.Line({
                points: waterPoints,
                fill: 'rgba(100, 150, 255, 0.6)', // Semi-transparent blue
                closed: true,
                name: 'water-area',
            });

            // Create draggable water level line parallel to the boundary
            const waterLinePoints = [
                0, 0, // Start at origin since we'll position the group
                Math.cos(angle) * lineLength, Math.sin(angle) * lineLength
            ];

            const waterLine = new Konva.Line({
                points: waterLinePoints,
                stroke: 'blue',
                strokeWidth: 5,
                hitStrokeWidth: 20, // Larger hit area for easier dragging
            });

            // Create a group to contain the water line for easier dragging
            const waterLineGroup = new Konva.Group({
                x: baseX,
                y: waterY,
                name: 'water-level-line',
                draggable: true,
                dragBoundFunc: function (pos) {
                    // Restrict movement to vertical only and prevent going below soil level
                    return {
                        x: baseX, // Keep x position fixed at the base point
                        y: Math.min(pos.y, baseY) // Limit between soil level and max height
                    };
                }
            });

            waterLineGroup.add(waterLine);

            // Store reference data for drag updates
            waterLineGroup.pointIndex = index;
            waterLineGroup.waterArea = waterArea;
            waterLineGroup.baseY = baseY;
            waterLineGroup.baseX = baseX;
            waterLineGroup.angle = angle;
            waterLineGroup.lineLength = lineLength;

            waterLineGroup.on('dragmove', function () {
                // Get the current position of the group
                const newWaterY = this.y();
                const waterHeight = Math.max(0, this.baseY - newWaterY);

                // Update BC value based on distance (reverse of the scale factor)
                const newValue = waterHeight / height;
                points[this.pointIndex].BC.value = newValue; // Remove rounding for smooth values

                // Update water area to match the new water line position
                const newWaterPoints = [
                    this.baseX, this.baseY,
                    this.baseX + Math.cos(this.angle) * this.lineLength,
                    this.baseY + Math.sin(this.angle) * this.lineLength,
                    this.baseX + Math.cos(this.angle) * this.lineLength,
                    newWaterY + Math.sin(this.angle) * this.lineLength,
                    this.baseX, newWaterY
                ];

                this.waterArea.points(newWaterPoints);

                layer.draw();
                updateConfig();
                sendTask(config);
                updateStandpipes(config.potential, layer);
            });

            // Add hover effects for better UX
            waterLineGroup.on('mouseenter', function () {
                document.body.style.cursor = 'ns-resize';
                waterLine.strokeWidth(6);
                layer.draw();
            });

            waterLineGroup.on('mouseleave', function () {
                document.body.style.cursor = 'default';
                waterLine.strokeWidth(5);
                layer.draw();
            });

            // // Add a text label showing the BC value
            // const valueLabel = new Konva.Text({
            //     x: baseX + 5,
            //     y: waterY - 15,
            //     text: `${point.BC.value}`,
            //     fontSize: 12,
            //     fill: 'darkblue',
            //     name: 'water-level-label',
            // });

            // Update label position when water line moves
            // waterLineGroup.on('dragmove', function () {
            //     const newWaterY = this.y();
            //     valueLabel.y(newWaterY - 15);
            //     valueLabel.text(`${points[this.pointIndex].BC.value}`);
            // });

            layer.add(waterArea);
            layer.add(waterLineGroup);
            // layer.add(valueLabel);
        }
    });
}
