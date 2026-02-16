/**
 * SatelliteTracker.js
 * Fetches real TLE (Two-Line Element) data and manages satellite position calculations
 * 
 * Uses satellite.js library which implements the SGP4/SDP4 propagation model
 * TLE data sources: Celestrak, N2YO, or Space-Track (simplified list here)
 */

class SatelliteTracker {
    constructor() {
        // Satellite objects
        this.satellites = [];

        // TLE data sources (public datasets)
        this.TLE_SOURCES = {
            // Starlink satellites (sample TLEs - these need to be refreshed)
            starlink: `STARLINK-1130 (OBJECT A)
1 45377U 20044AA  26045.12345678  .00004098  00000-0  23579-3 0  9997
2 45377  53.0548 282.4556 0002411  89.1234 270.9840 15.06435619999999`,

            // ISS - International Space Station
            iss: `ISS (ZARYA)
1 25544U 98067A   26045.12345678  .00016717  00000-0  29111-3 0  9998
2 25544  51.6426 339.9265 0006766  90.3045 269.8597 15.54225995428935`,

            // GPS satellite sample
            gps: `GPS BIIA-21  (PRN 13)
1 22700U 93042A   26045.12345678  .00000045  00000-0  24331-4 0  9999
2 22700  55.3900 310.8900 0202030  47.4431 111.3571 2.00712611 76234`,

            // Iridium satellite
            iridium: `IRIDIUM 97
1 25507U 98918A   26045.12345678  .00000256  00000-0  18162-3 0  9999
2 25507  86.3895 342.5629 0002115 122.1234 237.9890 14.27460084847650`,

            // Hubble Space Telescope
            hubble: `HST
1 20580U 90037B   26045.12345678  .00000995  00000-0  40486-4 0  9999
2 20580  28.4758 339.9854 0003035 320.9854 118.2881 15.09631625345678`,

            // Envisat (Earth observation)
            envisat: `ENVISAT
1 27386U 02031A   26045.12345678  .00000276  00000-0  48901-4 0  9998
2 27386  98.2119 178.5432 0001210  85.2123 274.9231 14.12558123984567`
        };

        this.activeSatelliteIndex = -1;
        this.lastUpdateTime = null;
    }

    /**
     * Load TLE data for real satellites
     * Fetches from Celestrak API which provides current TLE data
     */
    async loadTLEData() {
        try {
            console.log('Loading TLE data...');

            // Fetch current TLE data from Celestrak API
            // These are public endpoints with no authentication required
            const sources = [
                {
                    name: 'starlink',
                    url: 'https://celestrak.org/NORAD/elements/starlink.txt'
                },
                {
                    name: 'iss',
                    url: 'https://celestrak.org/NORAD/elements/stations.txt'
                },
                {
                    name: 'gps',
                    url: 'https://celestrak.org/NORAD/elements/gps-ops.txt'
                },
                {
                    name: 'iridium',
                    url: 'https://celestrak.org/NORAD/elements/iridium.txt'
                }
            ];

            // Set a 10-second timeout for loading all TLE data
            const loadTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('TLE data loading timeout')), 10000)
            );

            const loadPromise = (async () => {
                // Try to fetch from Celestrak (most reliable)
                for (const source of sources) {
                    try {
                        await this.fetchFromCelestrak(source.url, source.name);
                    } catch (error) {
                        console.warn(`Failed to fetch ${source.name} from Celestrak:`, error);
                        // Fall back to hardcoded TLEs
                        if (this.TLE_SOURCES[source.name]) {
                            this.addSatelliteFromTLE(source.name, this.TLE_SOURCES[source.name]);
                        }
                    }
                }

                // Add some additional hardcoded satellites if Celestrak fetch fails
                if (this.satellites.length < 5) {
                    if (this.TLE_SOURCES.hubble) this.addSatelliteFromTLE('hubble', this.TLE_SOURCES.hubble);
                    if (this.TLE_SOURCES.envisat) this.addSatelliteFromTLE('envisat', this.TLE_SOURCES.envisat);
                }
            })();

            // Race between loading and timeout
            try {
                await Promise.race([loadPromise, loadTimeout]);
            } catch (error) {
                console.warn('TLE loading timeout - using fallback satellites');
                // Add fallback satellites if everything times out
                if (this.satellites.length === 0 && Object.keys(this.TLE_SOURCES).length > 0) {
                    Object.entries(this.TLE_SOURCES).forEach(([name, tle]) => {
                        try {
                            this.addSatelliteFromTLE(name, tle);
                        } catch (e) {
                            // Skip invalid TLEs
                        }
                    });
                }
            }

            console.log(`Loaded ${this.satellites.length} satellites`);
            return this.satellites.length > 0;

        } catch (error) {
            console.error('Error loading TLE data:', error);
            // Fall back to hardcoded satellites
            this.addSatelliteFromTLE('iss', this.TLE_SOURCES.iss);
            this.addSatelliteFromTLE('hubble', this.TLE_SOURCES.hubble);
            this.addSatelliteFromTLE('iridium', this.TLE_SOURCES.iridium);
            return true;
        }
    }

    /**
     * Fetch TLE data from Celestrak
     * @param {string} url - Celestrak API URL
     * @param {string} category - Satellite category name
     */
    async fetchFromCelestrak(url, category) {
        try {
            // Create a timeout promise that rejects after 8 seconds
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Fetch timeout')), 8000)
            );

            // Race between fetch and timeout
            const response = await Promise.race([
                fetch(url),
                timeoutPromise
            ]);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const text = await response.text();
            const lines = text.split('\n');

            // Parse TLE format (name on line 0, line 1, line 2)
            for (let i = 0; i < lines.length - 2; i += 3) {
                const name = lines[i].trim();
                const line1 = lines[i + 1].trim();
                const line2 = lines[i + 2].trim();

                if (name && line1.startsWith('1 ') && line2.startsWith('2 ')) {
                    this.addSatelliteFromTLE(name, `${line1}\n${line2}`);
                }
            }

            console.log(`Fetched ${category} data from Celestrak`);
        } catch (error) {
            throw new Error(`Failed to fetch from ${url}: ${error.message}`);
        }
    }

    /**
     * Add satellite from TLE string
     * @param {string} name - Satellite name
     * @param {string} tleString - Two-line element data
     */
    addSatelliteFromTLE(name, tleString) {
        try {
            const lines = tleString.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('Invalid TLE format');
            }

            const line1 = lines[0];
            const line2 = lines[1];

            // Validate TLE format
            if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
                throw new Error('TLE format error');
            }

            // Parse TLE using satellite.js
            const satrec = satellite.twoline2satrec(line1, line2);

            if (satrec.error !== 0) {
                throw new Error(`SGP4 error: ${satrec.error}`);
            }

            // Create satellite object
            const sat = {
                name: name,
                satrec: satrec,
                line1: line1,
                line2: line2,
                position: { latitude: 0, longitude: 0, altitude: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                eci: { x: 0, y: 0, z: 0 },
                ecef: { x: 0, y: 0, z: 0 },
                topocentric: { azimuth: 0, elevation: 0, range: 0 },
                signalStrength: 0,
                strengthPercent: 0,
                visible: false,
                isActive: false,
                lastUpdateTime: null
            };

            this.satellites.push(sat);
            console.log(`Added satellite: ${name}`);
        } catch (error) {
            console.error(`Error adding satellite ${name}:`, error);
        }
    }

    /**
     * Update all satellite positions for a given time and observer location
     * 
     * @param {Object} observerLocation - {latitude, longitude, altitude}
     * @param {Date} time - Current time
     */
    updateSatellitePositions(observerLocation, time) {
        if (!observerLocation) return;

        // Get observer position in ECEF
        const observerEcef = window.app?.orbitalEngine?.latLonAltToECEF(
            observerLocation.latitude,
            observerLocation.longitude,
            observerLocation.altitude
        ) || { x: 0, y: 0, z: 0 };

        // Update each satellite
        for (let i = 0; i < this.satellites.length; i++) {
            this.updateSatellitePosition(
                this.satellites[i],
                observerEcef,
                observerLocation,
                time
            );
        }

        // Determine best visible satellite for signal display
        this.updateActiveSelection();
    }

    /**
     * Update position of a single satellite
     * 
     * @param {Object} sat - Satellite object
     * @param {Object} observerEcef - Observer position in ECEF coordinates
     * @param {Object} observerLocation - Observer location {lat, lon, alt}
     * @param {Date} time - Current time
     */
    updateSatellitePosition(sat, observerEcef, observerLocation, time) {
        try {
            // Calculate position using SGP4 propagation
            const positionAndVelocity = satellite.propagate(sat.satrec, time);

            if (positionAndVelocity.position === false) {
                // Propagation error (satellite decayed or TLE is invalid)
                sat.visible = false;
                sat.signalStrength = 0;
                return;
            }

            // Get position and velocity (in km and km/s)
            const positionEci = positionAndVelocity.position;
            const velocityEci = positionAndVelocity.velocity;

            if (!positionEci || !velocityEci) {
                sat.visible = false;
                return;
            }

            // Store ECI coordinates
            sat.eci = positionEci;
            sat.velocity = velocityEci;

            // Convert ECI to ECEF
            // This requires the Greenwich Mean Sidereal Time (GMST)
            const gmst = satellite.gstime(time);
            sat.ecef = this.eciToEcef(positionEci, gmst);

            // Convert ECEF to lat/lon/altitude
            sat.position = window.app?.orbitalEngine?.ecefToLatLonAlt(sat.ecef) || 
                          { latitude: 0, longitude: 0, altitude: 0 };

            // Calculate topocentric coordinates (azimuth, elevation, range)
            sat.topocentric = window.app?.orbitalEngine?.calculateTopocentric(
                observerEcef,
                sat.ecef
            ) || { azimuth: 0, elevation: 0, range: 0 };

            // Calculate signal strength
            const signalInfo = window.app?.orbitalEngine?.calculateSignalStrength(
                sat.topocentric.elevation,
                sat.topocentric.range
            ) || { visible: false, signalStrength: 0, strengthPercent: 0, strengthBars: 0 };

            sat.visible = signalInfo.visible;
            sat.signalStrength = signalInfo.signalStrength;
            sat.strengthPercent = signalInfo.strengthPercent;
            sat.strengthBars = signalInfo.strengthBars;
            sat.lastUpdateTime = time;

        } catch (error) {
            console.error(`Error updating satellite ${sat.name}:`, error);
            sat.visible = false;
            sat.signalStrength = 0;
        }
    }

    /**
     * Convert ECI (Earth-Centered Inertial) to ECEF (Earth-Centered Earth-Fixed)
     * Applies rotation based on Greenwich Mean Sidereal Time
     * 
     * @param {Object} eci - ECI coordinates {x, y, z}
     * @param {number} gmst - Greenwich Mean Sidereal Time in radians
     * @returns {Object} ECEF coordinates {x, y, z}
     */
    eciToEcef(eci, gmst) {
        const cos = Math.cos(gmst);
        const sin = Math.sin(gmst);

        return {
            x: eci.x * cos + eci.y * sin,
            y: eci.x * (-sin) + eci.y * cos,
            z: eci.z
        };
    }

    /**
     * Update which satellite is selected for active display
     * Selects the strongest visible satellite
     */
    updateActiveSelection() {
        // Deactivate previous
        if (this.activeSatelliteIndex >= 0) {
            if (this.satellites[this.activeSatelliteIndex]) {
                this.satellites[this.activeSatelliteIndex].isActive = false;
            }
        }

        // Find best visible satellite
        let bestSat = null;
        let bestIndex = -1;

        for (let i = 0; i < this.satellites.length; i++) {
            const sat = this.satellites[i];
            if (sat.visible && sat.signalStrength > 0) {
                if (!bestSat || sat.signalStrength > bestSat.signalStrength) {
                    bestSat = sat;
                    bestIndex = i;
                }
            }
        }

        if (bestIndex >= 0) {
            this.satellites[bestIndex].isActive = true;
            this.activeSatelliteIndex = bestIndex;
        } else {
            this.activeSatelliteIndex = -1;
        }
    }

    /**
     * Get the currently active (strongest) satellite
     */
    getActiveSatellite() {
        if (this.activeSatelliteIndex >= 0) {
            return this.satellites[this.activeSatelliteIndex];
        }
        return null;
    }

    /**
     * Get visible satellites sorted by signal strength (strongest first)
     */
    getVisibleSatellites() {
        return this.satellites
            .filter(sat => sat.visible)
            .sort((a, b) => b.signalStrength - a.signalStrength);
    }

    /**
     * Get total number of satellites being tracked
     */
    getTotalSatellites() {
        return this.satellites.length;
    }

    /**
     * Get number of visible satellites
     */
    getVisibleCount() {
        return this.satellites.filter(sat => sat.visible).length;
    }

    /**
     * Format satellite information for display
     */
    formatSatelliteInfo(sat) {
        return {
            name: sat.name,
            distance: sat.topocentric.range.toFixed(0) + ' km',
            elevation: sat.topocentric.elevation.toFixed(1) + '°',
            azimuth: sat.topocentric.azimuth.toFixed(1) + '°',
            signalStrength: sat.signalStrength.toFixed(0) + '%',
            visible: sat.visible
        };
    }
}
