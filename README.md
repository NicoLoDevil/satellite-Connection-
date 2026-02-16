# 🛰️ Satellite Communication Simulator

A fully functional real-time satellite communication simulator with live TLE (Two-Line Element) data acquisition, accurate orbital propagation, and realistic signal simulation.

## Features

### Real Orbital Data
- **Live TLE Data**: Fetches current orbital elements from Celestrak public API
- **Real Satellites**: Tracks actual satellites including ISS, Starlink, Iridium, GPS, and more
- **Accurate Propagation**: Uses SGP4/SDP4 propagation model via satellite.js library
- **Continuous Updates**: Real-time position calculations using actual orbital mechanics

### User Location
- **Geolocation API**: Auto-detects user location (with permission)
- **Manual Input**: Allows setting custom latitude/longitude/altitude
- **WGS84 Conversion**: Proper Earth ellipsoid calculations

### Signal Simulation
- **Elevation-Based Strength**: Signal quality based on satellite elevation angle
- **Distance Attenuation**: Inverse square law for signal propagation
- **Atmospheric Model**: Simplified atmospheric attenuation at low elevations
- **Real-Time Display**: 5-bar signal strength indicator with percentages
- **Visibility Detection**: Satellites visible above horizon (>-0.5° elevation)

### Visualization
- **2D Canvas Rendering**: Full-screen animated Earth view
- **Satellite Tracking**: Real-time satellite positions with movement
- **Earth Grid**: Latitude/longitude reference grid
- **User Marker**: Yellow circle shows observer location with antenna pattern
- **Color-Coded Satellites**: 
  - 🟢 Green = Active (strongest visible)
  - 🔵 Blue = Strong signal (>50%)
  - 🟡 Yellow = Weak signal
  - 🔴 Red = Not visible

### Emergency Mode
- **"Activate Help" Button**: One-click emergency connection
- **Auto-Lock**: Automatically selects strongest visible satellite
- **Handshake Simulation**: Realistic connection establishment sequence
- **Status Display**: Real-time connection progress updates
- **Message Ready**: Emergency alert transmission capability

### Technical Implementation

#### Architecture
```
index.html           - UI and Canvas rendering
style.css            - Dark terminal theme styling (300+ lines)
orbitalEngine.js     - Orbital calculations and coordinate transformations
satelliteTracker.js  - TLE data management and position updates
uiController.js      - UI interactions and emergency mode
```

#### Key Calculations
1. **ECI to ECEF Conversion**: Transforms satellite positions from Earth-Centered Inertial to Earth-Centered Earth-Fixed coordinates
2. **Topocentric Coordinates**: Calculates azimuth, elevation, and range from observer to satellite
3. **Signal Strength**: Combined model using elevation angle, distance, and atmospheric factors
4. **GMST Rotation**: Greenwich Mean Sidereal Time for proper Earth rotation

#### Data Sources
- **Celestrak API** (primary): `celestrak.org/NORAD/elements/`
  - active.txt (all active satellites)
  - starlink.txt (Starlink constellation)
  - stations.txt (Space stations, ISS)
  - gps-ops.txt (GPS satellites)
  - iridium.txt (Iridium constellation)
- **Fallback**: Hardcoded recent TLEs if network unavailable

## Technical Stack

- **HTML5 Canvas**: Real-time graphics rendering
- **Vanilla JavaScript**: Pure JS, no frameworks
- **satellite.js** (v4.1.4): SGP4/SDP4 orbital propagation
- **Geolocation API**: Browser-based location detection
- **RESTful API**: Public TLE data from Celestrak

## Usage

### Basic Operation

1. **Open the Application**
   - Open `index.html` in a modern web browser
   - Grant location permission for auto-detection
   - Or manually enter coordinates

2. **View Satellites**
   - Left panel shows all visible satellites
   - Sorted by signal strength (strongest first)
   - Shows distance, elevation, azimuth, signal %

3. **Monitor Signal**
   - Right panel displays active satellite signal
   - 5-bar indicator with real-time strength
   - Quality level: Excellent/Good/Fair/Weak

4. **Emergency Connection**
   - Click "🆘 ACTIVATE HELP" button
   - Auto-locks to strongest satellite
   - Shows 7-stage handshake sequence
   - Ready for emergency message sending

### Manual Location

```
Click "Manual Location" button
Enter: 
  - Latitude: -90 to 90 (decimal degrees)
  - Longitude: -180 to 180 (decimal degrees)  
  - Altitude: 0 or higher (meters above sea level)
Click "Confirm"
```

### Setting Location Programmatically

```javascript
// In browser console:
window.app.orbitalEngine.setLocation(40.7128, -74.0060, 10); // NYC at 10m
```

## API Reference

### OrbitalEngine Class

```javascript
// User location
orbitalEngine.userLocation = {
  latitude: number,    // -90 to 90
  longitude: number,   // -180 to 180
  altitude: number     // meters
}

// Methods
orbitalEngine.setLocation(lat, lon, alt)
orbitalEngine.latLonAltToECEF(lat, lon, alt)
orbitalEngine.ecefToLatLonAlt(ecef)
orbitalEngine.calculateTopocentric(observerEcef, satelliteEcef)
orbitalEngine.calculateSignalStrength(elevation, range)
orbitalEngine.findBestSatellite(satellites)
```

### SatelliteTracker Class

```javascript
// Satellite object structure
satellite = {
  name: string,
  position: { latitude, longitude, altitude },
  topocentric: { azimuth, elevation, range },
  signalStrength: 0-100,  // percentage
  visible: boolean,
  isActive: boolean
}

// Methods
satelliteTracker.loadTLEData()
satelliteTracker.updateSatellitePositions(location, time)
satelliteTracker.getActiveSatellite()
satelliteTracker.getVisibleSatellites()
satelliteTracker.getVisibleCount()
```

### UIController Class

```javascript
// Methods
uiController.activateEmergencyMode()
uiController.deactivateEmergencyMode()
uiController.showLocationModal()
uiController.confirmLocation()
```

## Screenshot Guide

- **Top Panel**: Status and satellite counter
- **Left Panel**: Visible satellites list with details
- **Right Panel**: Active satellite signal and emergency controls
- **Canvas**: Real-time Earth with satellite positions

## Orbital Mechanics Explained

### SGP4 Propagation
The simulator uses SGP4 (Simplified General Perturbation 4) model:
- Accounts for atmospheric drag
- Includes Earth oblateness effects (J2)
- Handles lunar and solar perturbations
- Accurate to within kilometers for many hours

### Signal Strength Calculation
```
strength = elevation_factor × distance_factor × atmospheric_factor
where:
  elevation_factor = sin(elevation_angle + 1°)  // 0 at horizon
  distance_factor = (ref_altitude / distance)²  // Inverse-square law
  atmospheric_factor = exp(-0.1 × (1 - elev))   // Low elevation penalty
```

### Azimuth/Elevation
- **Azimuth**: Compass direction (0°=N, 90°=E, 180°=S, 270°=W)
- **Elevation**: Angle above horizon (positive = visible, negative = below horizon)
- Calculated in topocentric SEZ (South-East-Zenith) coordinates

## Troubleshooting

### No Satellites Appear
- Check browser console for fetch errors
- Verify Celestrak API is accessible
- Try manual location input
- Ensure location coordinates are valid

### Signal Bars Not Showing
- Satellite must be above horizon (-0.5°)
- Check elevation angle in satellite list
- May need to wait for satellite to rise

### Emergency Mode Unavailable
- No visible satellites detected
- Check location settings
- Ensure satellite data loaded successfully

### Performance Issues
- Modern browser recommended (Chrome, Firefox, Safari, Edge)
- Disable other tabs/applications
- Canvas rendering uses hardware acceleration
- FPS counter shows real-time performance

## Browser Compatibility

- ✅ Chrome/Chromium (60+)
- ✅ Firefox (55+)
- ✅ Safari (12+)
- ✅ Edge (79+)
- ❌ Internet Explorer (not supported)

Requires:
- ES6 JavaScript support
- Canvas API
- Geolocation API (optional)
- Fetch API for TLE data

## Example: Using Console

```javascript
// Get active satellite
const sat = window.app.satelliteTracker.getActiveSatellite();
console.log(`Signal: ${sat.signalStrength.toFixed(0)}%`);

// List all visible satellites
const visible = window.app.satelliteTracker.getVisibleSatellites();
visible.forEach(sat => {
  console.log(`${sat.name}: ${sat.topocentric.elevation.toFixed(1)}°`);
});

// Set new location
window.app.orbitalEngine.setLocation(51.5074, -0.1278, 11); // London

// Toggle animation
window.app.toggleAnimation();

// Trigger emergency mode
window.app.uiController.activateEmergencyMode();
```

## Performance Metrics

- **Update Rate**: 60 FPS (requestAnimationFrame)
- **TLE Refresh**: On-demand (manual reload)
- **Satellite Count**: Supports 100+ satellites efficiently
- **Memory**: ~2-5 MB for typical usage
- **Network**: ~50-100 KB initial TLE fetch

## Real-World Applications

1. **Emergency Communication**: Demonstrates satellite-based emergency systems
2. **Educational**: Learn orbital mechanics and satellite behavior
3. **Communication Planning**: Identify visible satellites for radio communication
4. **Coverage Analysis**: Understand satellite visibility from any location
5. **Satellite Tracking**: Real-time tracking of specific satellites

## References

- **SGP4 Model**: Celestrak.org
- **TLE Format**: CelesTrak documentation
- **Satellite.js**: GitHub.com/shashwatak/satellite-js
- **WGS84 Ellipsoid**: NIMA Technical Report TR8350.2
- **Orbital Mechanics**: Montenbruck & Eberhard

## License

Educational use - Real satellite data from public sources (Celestrak).

## Future Enhancements

- [ ] 3D globe visualization with WebGL
- [ ] Doppler frequency shift calculator
- [ ] Footprint visualization
- [ ] Coverage maps for satellite constellations
- [ ] Pass prediction (next visible passes)
- [ ] Ground station networking
- [ ] Message relay simulation
- [ ] Sunrise/sunset twilight calculations

---

**Created**: February 2026  
**Status**: Fully Functional ✅
