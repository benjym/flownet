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

            // Calculate water level position using absolute height (BC value is global Y coordinate)
            const waterY = (1 - point.BC.value) * height; // Convert from normalized to screen coordinates

            datum = point.BC.value; // Store absolute water level as datum

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

            // Create a polygon for the water area (from boundary to water level)
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
                    // Restrict movement to vertical only and allow full range in domain
                    return {
                        x: baseX, // Keep x position fixed at the base point
                        y: Math.max(0, Math.min(pos.y, height)) // Limit to domain bounds
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

                // Convert screen coordinate to normalized global coordinate (absolute height)
                const newValue = 1 - (newWaterY / height);
                points[this.pointIndex].BC.value = newValue;

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
