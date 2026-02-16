/**
 * SkyView.js
 * Renders a horizon/sky view showing satellites as they appear from the observer's location
 * 
 * This is a polar projection where:
 * - Center = Zenith (directly overhead at 90° elevation)
 * - Edges = Horizon (0° elevation)
 * - Angular position around circle = Azimuth (0°=North, 90°=East, 180°=South, 270°=West)
 * - Radial distance from center = (90° - elevation angle)
 * 
 * Users can see at a glance where to look to see each satellite
 */

class SkyView {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = Math.min(this.width, this.height) / 2 - 40; // Leave margin
    }

    /**
     * Render the sky view with satellites
     * @param {Array} satellites - Array of satellite objects with topocentric data
     */
    render(satellites) {
        // Clear canvas
        this.ctx.fillStyle = '#0a0e27';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw concentric circles (elevation markers)
        this.drawElevationCircles();

        // Draw compass directions
        this.drawCompass();

        // Draw horizon line
        this.drawHorizon();

        // Draw satellites
        this.drawSatellites(satellites);

        // Draw zenith marker
        this.drawZenith();
    }

    /**
     * Draw concentric circles for elevation angles (30°, 60°, 90°)
     */
    drawElevationCircles() {
        this.ctx.strokeStyle = '#004400';
        this.ctx.lineWidth = 1;
        this.ctx.font = '11px monospace';
        this.ctx.fillStyle = '#004400';

        // Draw circles at 30°, 60°, and 90° elevation
        const elevationAngles = [30, 60, 90];
        
        for (const elevation of elevationAngles) {
            // Convert elevation to radius (90° - elev gives distance from zenith)
            const radiusAtElevation = this.radius * (1 - elevation / 90);

            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, radiusAtElevation, 0, Math.PI * 2);
            this.ctx.stroke();

            // Label
            this.ctx.fillText(`${elevation}°`, this.centerX + radiusAtElevation + 5, this.centerY - 8);
        }
    }

    /**
     * Draw compass directions (N, E, S, W)
     */
    drawCompass() {
        this.ctx.fillStyle = '#00ff88';
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.lineWidth = 2;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const directions = [
            { label: 'N', azimuth: 0 },
            { label: 'E', azimuth: 90 },
            { label: 'S', azimuth: 180 },
            { label: 'W', azimuth: 270 }
        ];

        const labelDistance = this.radius + 30;

        for (const dir of directions) {
            const rad = this.azimuthToRadians(dir.azimuth);
            const x = this.centerX + labelDistance * Math.sin(rad);
            const y = this.centerY - labelDistance * Math.cos(rad);

            // Draw direction line
            const lineEndDist = this.radius + 15;
            const lineX = this.centerX + lineEndDist * Math.sin(rad);
            const lineY = this.centerY - lineEndDist * Math.cos(rad);

            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX + (this.radius + 5) * Math.sin(rad),
                            this.centerY - (this.radius + 5) * Math.cos(rad));
            this.ctx.lineTo(lineX, lineY);
            this.ctx.stroke();

            // Draw text
            this.ctx.fillText(dir.label, x, y);
        }
    }

    /**
     * Draw horizon circle (elevation = 0°)
     */
    drawHorizon() {
        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        // Label
        this.ctx.fillStyle = '#ff6600';
        this.ctx.font = '11px monospace';
        this.ctx.fillText('HORIZON', this.centerX + 5, this.centerY + this.radius + 15);
    }

    /**
     * Draw zenith marker (center point)
     */
    drawZenith() {
        this.ctx.fillStyle = '#ffff00';
        
        // Center crosshair
        const crossSize = 8;
        this.ctx.fillRect(this.centerX - 1, this.centerY - crossSize, 2, crossSize * 2);
        this.ctx.fillRect(this.centerX - crossSize, this.centerY - 1, crossSize * 2, 2);

        // Label
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = '11px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Z', this.centerX + 12, this.centerY - 8);
    }

    /**
     * Draw satellites on the sky view
     * @param {Array} satellites - Satellite objects
     */
    drawSatellites(satellites) {
        // Filter to only visible satellites (above horizon)
        const visibleSats = satellites.filter(sat => sat.visible && sat.topocentric.elevation > -0.5);

        if (visibleSats.length === 0) {
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('NO SATELLITES ABOVE HORIZON', this.centerX, this.centerY);
            return;
        }

        // Draw each satellite
        for (const sat of visibleSats) {
            this.drawSatelliteMarker(sat);
        }
    }

    /**
     * Draw a single satellite marker on the sky view
     * @param {Object} sat - Satellite object with azimuth, elevation, signal strength
     */
    drawSatelliteMarker(sat) {
        const topo = sat.topocentric;

        // Convert azimuth and elevation to canvas coordinates
        const azimuthRad = this.azimuthToRadians(topo.azimuth);
        const elevationRadius = this.radius * (1 - topo.elevation / 90);

        const x = this.centerX + elevationRadius * Math.sin(azimuthRad);
        const y = this.centerY - elevationRadius * Math.cos(azimuthRad);

        // Determine size and color based on signal strength and active status
        let size = 5;
        let color = '#ffff00'; // Yellow = weak

        if (sat.signalStrength >= 75) {
            size = 12;
            color = '#00ff00'; // Green = excellent
        } else if (sat.signalStrength >= 50) {
            size = 10;
            color = '#00ff00'; // Green = good
        } else if (sat.signalStrength >= 25) {
            size = 8;
            color = '#ffff00'; // Yellow = fair
        }

        // Draw satellite circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();

        // If active, add ring
        if (sat.isActive) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size + 6, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Draw satellite label
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 11px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'bottom';
        
        const labelX = x + size + 5;
        const labelY = y - size - 5;
        
        // Truncate long names
        const displayName = sat.name.length > 15 ? sat.name.substring(0, 12) + '...' : sat.name;
        this.ctx.fillText(displayName, labelX, labelY);

        // Draw signal strength as small bars
        const barWidth = 3;
        const barHeight = 2;
        const barsActive = Math.ceil((sat.signalStrength / 100) * 5);
        
        for (let i = 0; i < 5; i++) {
            if (i < barsActive) {
                this.ctx.fillStyle = color;
            } else {
                this.ctx.fillStyle = '#003300';
            }
            this.ctx.fillRect(x - 8 + i * 3.5, y + size + 2, barWidth, barHeight);
        }

        // Draw distance label (below bars)
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '9px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${topo.range.toFixed(0)}km`, x, y + size + 12);
    }

    /**
     * Convert azimuth angle to radians
     * Azimuth: 0° = North, 90° = East, 180° = South, 270° = West
     * In canvas coords: 0° should point up, so we adjust
     * @param {number} azimuth - Azimuth in degrees (0-360)
     * @returns {number} Angle in radians for canvas drawing
     */
    azimuthToRadians(azimuth) {
        // Convert azimuth to standard math radians (0° = right, counterclockwise)
        // Azimuth 0° should point up (North), so subtract from 90° and convert to radians
        return ((90 - azimuth) * Math.PI) / 180;
    }

    /**
     * Handle canvas resize
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = Math.min(this.width, this.height) / 2 - 40;
    }

    /**
     * Get information about a satellite at canvas coordinates (for interactivity)
     * @param {number} canvasX - X coordinate on canvas
     * @param {number} canvasY - Y coordinate on canvas
     * @param {Array} satellites - Array of satellites to check
     * @returns {Object|null} - Satellite object if clicked, null otherwise
     */
    getSatelliteAtPoint(canvasX, canvasY, satellites) {
        const visibleSats = satellites.filter(sat => sat.visible && sat.topocentric.elevation > -0.5);

        for (const sat of visibleSats) {
            const topo = sat.topocentric;
            const azimuthRad = this.azimuthToRadians(topo.azimuth);
            const elevationRadius = this.radius * (1 - topo.elevation / 90);

            const satX = this.centerX + elevationRadius * Math.sin(azimuthRad);
            const satY = this.centerY - elevationRadius * Math.cos(azimuthRad);

            const distance = Math.sqrt((canvasX - satX) ** 2 + (canvasY - satY) ** 2);
            
            if (distance < 15) { // Click radius
                return sat;
            }
        }

        return null;
    }
}
