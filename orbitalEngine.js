/**
 * OrbitalEngine.js
 * Handles orbital mechanics calculations and location management
 * 
 * Key concepts:
 * - User location is stored in WGS84 coordinates (lat, lon, altitude)
 * - All calculations use ECI (Earth-Centered Inertial) coordinates
 * - Satellite positions are converted to topocentric (observer) coordinates for visibility
 * - Signal strength is simulated based on elevation angle and distance
 */

class OrbitalEngine {
    constructor() {
        // User location in WGS84 coordinates
        this.userLocation = {
            latitude: 0,      // degrees (-90 to 90)
            longitude: 0,     // degrees (-180 to 180)
            altitude: 0       // meters above mean sea level
        };

        // Earth parameters (WGS84)
        this.EARTH_RADIUS = 6371; // kilometers
        this.EARTH_RADIUS_EQUATORIAL = 6378.137; // km
        this.EARTH_RADIUS_POLAR = 6356.752; // km
        this.EARTH_FLATTENING = 1 / 298.257223563;

        // Atmospheric attenuation model
        this.ATMOSPHERE_HEIGHT = 100; // km above Earth surface
    }

    /**
     * Request user's location using Geolocation API
     * Falls back to (0, 0) if denied or unavailable
     */
    async getLocation() {
        return new Promise((resolve) => {
            if ('geolocation' in navigator) {
                // Set a 5-second timeout
                const timeoutId = setTimeout(() => {
                    console.warn('Geolocation timeout, using default location (0, 0)');
                    resolve();
                }, 5000);

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        clearTimeout(timeoutId);
                        this.userLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            altitude: position.coords.altitude || 0
                        };
                        console.log('User location obtained:', this.userLocation);
                        resolve();
                    },
                    (error) => {
                        clearTimeout(timeoutId);
                        console.warn('Geolocation denied, using default location (0, 0)');
                        resolve();
                    }
                );
            } else {
                console.warn('Geolocation not available, using default location');
                resolve();
            }
        });
    }

    /**
     * Set user location manually
     */
    setLocation(latitude, longitude, altitude = 0) {
        this.userLocation = {
            latitude: Math.max(-90, Math.min(90, latitude)),
            longitude: ((longitude + 180) % 360) - 180,
            altitude: Math.max(0, altitude)
        };
    }

    /**
     * Convert latitude/longitude to geocentric Cartesian coordinates
     * Uses WGS84 ellipsoid model
     * 
     * @param {number} latitude - degrees
     * @param {number} longitude - degrees
     * @param {number} altitude - kilometers above surface
     * @returns {Object} {x, y, z} in kilometers
     */
    latLonAltToECEF(latitude, longitude, altitude = 0) {
        const lat = satellite.degreesToRadians(latitude);
        const lon = satellite.degreesToRadians(longitude);
        const altKm = altitude / 1000; // Convert meters to km

        // Calculate radius of curvature in prime vertical
        const N = this.EARTH_RADIUS_EQUATORIAL / 
                  Math.sqrt(1 - this.EARTH_FLATTENING * (2 - this.EARTH_FLATTENING) * Math.sin(lat) * Math.sin(lat));

        const x = (N + altKm) * Math.cos(lat) * Math.cos(lon);
        const y = (N + altKm) * Math.cos(lat) * Math.sin(lon);
        const z = ((1 - this.EARTH_FLATTENING * (2 - this.EARTH_FLATTENING)) * N + altKm) * Math.sin(lat);

        return { x, y, z };
    }

    /**
     * Convert ECEF coordinates to latitude/longitude/altitude
     * 
     * @param {Object} ecef - {x, y, z} in kilometers
     * @returns {Object} {latitude, longitude, altitude}
     */
    ecefToLatLonAlt(ecef) {
        const { x, y, z } = ecef;
        const lon = Math.atan2(y, x);
        const p = Math.sqrt(x * x + y * y);

        let lat = Math.atan2(z, p * (1 - this.EARTH_FLATTENING * (2 - this.EARTH_FLATTENING)));
        
        // Iterate to convergence (2-3 iterations usually sufficient)
        for (let i = 0; i < 3; i++) {
            const N = this.EARTH_RADIUS_EQUATORIAL / 
                      Math.sqrt(1 - this.EARTH_FLATTENING * (2 - this.EARTH_FLATTENING) * Math.sin(lat) * Math.sin(lat));
            lat = Math.atan2(z + this.EARTH_FLATTENING * (2 - this.EARTH_FLATTENING) * N * Math.sin(lat), p);
        }

        const N = this.EARTH_RADIUS_EQUATORIAL / 
                  Math.sqrt(1 - this.EARTH_FLATTENING * (2 - this.EARTH_FLATTENING) * Math.sin(lat) * Math.sin(lat));
        const altitude = (p / Math.cos(lat)) - N;

        return {
            latitude: satellite.radiansToDegrees(lat),
            longitude: satellite.radiansToDegrees(lon),
            altitude: altitude * 1000 // Convert to meters
        };
    }

    /**
     * Calculate topocentric coordinates (SEZ: South-East-Zenith)
     * Given observer position (ECEF) and satellite position (ECEF)
     * 
     * Returns azimuth and elevation of satellite as seen from observer
     * 
     * @param {Object} observerEcef - Observer position in ECEF {x, y, z}
     * @param {Object} satelliteEcef - Satellite position in ECEF {x, y, z}
     * @returns {Object} {azimuth, elevation, range} in degrees and km
     */
    calculateTopocentric(observerEcef, satelliteEcef) {
        // Vector from observer to satellite
        const dx = satelliteEcef.x - observerEcef.x;
        const dy = satelliteEcef.y - observerEcef.y;
        const dz = satelliteEcef.z - observerEcef.z;

        // Range (distance)
        const range = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Observer latitude and longitude
        const obsLatLon = this.ecefToLatLonAlt(observerEcef);
        const lat = satellite.degreesToRadians(obsLatLon.latitude);
        const lon = satellite.degreesToRadians(obsLatLon.longitude);

        // Rotation matrix: ECEF to topocentric coordinates
        const sinLat = Math.sin(lat);
        const cosLat = Math.cos(lat);
        const sinLon = Math.sin(lon);
        const cosLon = Math.cos(lon);

        // Transform to SEZ (South-East-Zenith)
        const s = sinLat * cosLon * dx + sinLat * sinLon * dy - cosLat * dz;
        const e = -sinLon * dx + cosLon * dy;
        const z = cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz;

        // Calculate azimuth and elevation
        let azimuth = Math.atan2(e, s);
        const elevation = Math.asin(z / range);

        // Convert azimuth to standard notation (0 = North, 90 = East, etc.)
        azimuth = satellite.radiansToDegrees(azimuth);
        if (azimuth < 0) azimuth += 360;

        const elevationDeg = satellite.radiansToDegrees(elevation);

        return {
            azimuth: azimuth,
            elevation: elevationDeg,
            range: range
        };
    }

    /**
     * Calculate satellite visibility and signal strength
     * 
     * @param {number} elevation - Elevation angle in degrees
     * @param {number} range - Distance to satellite in km
     * @returns {Object} {visible, signalStrength, strengthPercent}
     */
    calculateSignalStrength(elevation, range) {
        // Horizon is typically at -1 to 0 degrees elevation
        const HORIZON = -0.5;
        const visible = elevation > HORIZON;

        if (!visible) {
            return {
                visible: false,
                signalStrength: 0,
                strengthPercent: 0,
                strengthBars: []
            };
        }

        // Signal strength calculation:
        // - Based on elevation angle (higher is better)
        // - Attenuated by distance (farther is weaker)
        // - Simplified model: not exact real-world propagation

        // Elevation factor: 0 at horizon, 1 at zenith
        const elevationFactor = Math.max(0, Math.sin(satellite.degreesToRadians(elevation + 1)));

        // Distance factor: Inverse square law (simplified)
        const referenceSatelliteAltitude = 400; // ISS altitude in km
        const distanceFactor = Math.max(0.1, Math.pow(referenceSatelliteAltitude / range, 2));

        // Atmospheric attenuation (simple exponential model)
        // Stronger attenuation at low elevations
        const atmosphericFactor = Math.exp(-0.1 * (1 - elevationFactor));

        // Combined signal strength (0-100)
        const rawStrength = elevationFactor * distanceFactor * atmosphericFactor;
        const signalStrength = Math.min(100, rawStrength * 100);

        // Calculate which signal bars to display (5 bars: 0-5)
        const strengthPercent = signalStrength;
        const barsActive = Math.ceil((signalStrength / 100) * 5);

        return {
            visible: true,
            signalStrength: signalStrength,
            strengthPercent: strengthPercent,
            strengthBars: barsActive
        };
    }

    /**
     * Calculate which satellite is strongest visible
     * Used for emergency mode auto-selection
     * 
     * @param {Array} satellites - Array of satellite objects with signal info
     * @returns {Object|null} - Best satellite or null if none visible
     */
    findBestSatellite(satellites) {
        const visibleSatellites = satellites.filter(sat => sat.visible && sat.signalStrength > 0);
        
        if (visibleSatellites.length === 0) {
            return null;
        }

        return visibleSatellites.reduce((best, current) => 
            current.signalStrength > best.signalStrength ? current : best
        );
    }

    /**
     * Calculate Doppler shift effect (for reference)
     * Useful for communications systems
     * 
     * @param {Object} satelliteEci - Satellite position ECI
     * @param {Object} satelliteVel - Satellite velocity ECI
     * @param {Object} observerEcef - Observer position ECEF
     * @param {number} frequency - Signal frequency in Hz
     * @returns {number} - Shifted frequency in Hz
     */
    calculateDopplerShift(satelliteEci, satelliteVel, observerEcef, frequency = 2400e6) {
        // Convert observer to ECI
        // This is complex - simplified version for reference
        
        // Speed of light in km/s
        const C = 299792.458;
        
        // Line of sight vector (simplified)
        const satRange = Math.sqrt(
            satelliteEci.x * satelliteEci.x +
            satelliteEci.y * satelliteEci.y +
            satelliteEci.z * satelliteEci.z
        );

        // Radial velocity component (simplified)
        const radialVelocity = (
            (satelliteEci.x * satelliteVel.x +
             satelliteEci.y * satelliteVel.y +
             satelliteEci.z * satelliteVel.z) / satRange
        );

        // Doppler shift calculation
        const dopplerFactor = (C + radialVelocity) / C;
        const shiftedFrequency = frequency * dopplerFactor;

        return shiftedFrequency;
    }

    /**
     * Validate location values
     */
    isValidLocation(lat, lon, alt) {
        return (
            typeof lat === 'number' && lat >= -90 && lat <= 90 &&
            typeof lon === 'number' && lon >= -180 && lon <= 180 &&
            typeof alt === 'number' && alt >= 0
        );
    }
}
