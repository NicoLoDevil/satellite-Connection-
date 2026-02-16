/**
 * UIController.js
 * Manages all UI interactions and updates
 * Handles emergency mode, signal display, location input, and real-time updates
 */

class UIController {
    constructor(app) {
        this.app = app;
        this.emergencyModeActive = false;
        this.emergencyTimeout = null;
        this.directionGuidanceInterval = null;
        this.locationModal = document.getElementById('location-modal');
        this.setupEventListeners();

        // Connect modal elements (initial overlay matching reference)
        this.connectModal = document.getElementById('connect-modal');
        this.connectStartBtn = document.getElementById('connect-start-btn');
        this.connectSosBtn = document.getElementById('connect-sos-btn');

        if (this.connectStartBtn) {
            this.connectStartBtn.addEventListener('click', () => this.handleConnectStart());
        }
        if (this.connectSosBtn) {
            this.connectSosBtn.addEventListener('click', () => this.handleConnectSOS());
        }

        // Show the initial connect modal
        this.showConnectModal();
    }

    /**
     * Show the centered connect modal
     */
    showConnectModal() {
        if (this.connectModal) {
            this.connectModal.style.display = 'flex';
        }
    }

    /**
     * Hide the connect modal with slide animation
     */
    hideConnectModal(callback) {
        if (!this.connectModal) {
            if (callback) callback();
            return;
        }

        const content = this.connectModal.querySelector('.connect-modal-content');
        if (content) {
            content.classList.add('slide-down');
            setTimeout(() => {
                this.connectModal.style.display = 'none';
                content.classList.remove('slide-down');
                if (callback) callback();
            }, 420);
        } else {
            this.connectModal.style.display = 'none';
            if (callback) callback();
        }
    }

    /**
     * Handler when user clicks "Try Connecting to Satellite"
     */
    handleConnectStart() {
        // Hide modal then reveal bottom card and update status
        this.hideConnectModal(() => {
            const bottom = document.querySelector('.bottom-card');
            if (bottom) bottom.style.display = 'block';

            const titleEl = document.getElementById('sat-main-title');
            const statusEl = document.getElementById('sat-status-message');
            if (titleEl) titleEl.textContent = 'Searching for Satellite';
            if (statusEl) statusEl.textContent = 'Keep pointing at satellite';
        });
    }

    /**
     * Handler when user clicks "Try Emergency SOS" from modal
     */
    handleConnectSOS() {
        // Hide modal, reveal bottom card, then activate emergency mode
        this.hideConnectModal(() => {
            const bottom = document.querySelector('.bottom-card');
            if (bottom) bottom.style.display = 'block';

            // Trigger emergency flow
            this.activateEmergencyMode();
        });
    }

    /**
     * Setup all event listeners for UI elements
     */
    setupEventListeners() {
        // Emergency button
        document.getElementById('emergency-btn').addEventListener('click', () => {
            this.toggleEmergencyMode();
        });
        
        // Apple-style close button
        const closeBtn = document.getElementById('toggle-emergency-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggleEmergencyMode();
            });
        }

        // Manual location button
        const manualLocBtn = document.getElementById('manual-location-btn');
        if (manualLocBtn) {
            manualLocBtn.addEventListener('click', () => {
                this.showLocationModal();
            });
        }

        // Location modal buttons
        const confirmBtn = document.getElementById('confirm-location-btn');
        const cancelBtn = document.getElementById('cancel-location-btn');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmLocation();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideLocationModal();
            });
        }

        // Animation toggle
        const toggleBtn = document.getElementById('toggle-animation-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (this.app) {
                    this.app.toggleAnimation();
                }
            });
        }

        // Allow Enter key in location modal
        const latInput = document.getElementById('manual-lat');
        const lonInput = document.getElementById('manual-lon');
        const altInput = document.getElementById('manual-alt');
        
        if (latInput) {
            latInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.confirmLocation();
            });
        }
        
        if (lonInput) {
            lonInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.confirmLocation();
            });
        }
        
        if (altInput) {
            altInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.confirmLocation();
            });
        }

        // Close modal on background click
        this.locationModal.addEventListener('click', (e) => {
            if (e.target === this.locationModal) {
                this.hideLocationModal();
            }
        });
    }

    /**
     * Update all UI elements with current data
     * Called once per frame
     */
    update(userLocation, satellites, currentTime) {
        this.updateLocationInfo(userLocation);
        this.updateTime(currentTime);
        this.updateSatelliteList(satellites);
        this.updateActiveSignal(satellites);
    }

    /**
     * Update location display
     */
    updateLocationInfo(location) {
        if (!location) return;

        document.getElementById('lat-value').textContent = location.latitude.toFixed(4);
        document.getElementById('lon-value').textContent = location.longitude.toFixed(4);
        document.getElementById('alt-value').textContent = location.altitude.toFixed(0);
    }

    /**
     * Update current time display
     */
    updateTime(time) {
        const hours = String(time.getHours()).padStart(2, '0');
        const minutes = String(time.getMinutes()).padStart(2, '0');
        const seconds = String(time.getSeconds()).padStart(2, '0');

        const month = String(time.getMonth() + 1).padStart(2, '0');
        const date = String(time.getDate()).padStart(2, '0');
        const year = time.getFullYear();

        const currentTimeEl = document.getElementById('current-time');
        if (currentTimeEl) currentTimeEl.textContent = `${hours}:${minutes}:${seconds}`;

        const currentDateEl = document.getElementById('current-date');
        if (currentDateEl) currentDateEl.textContent = `${month}/${date}/${year}`;
        
        // Update Apple-style time display (HH:MM format)
        const appleTime = document.getElementById('sat-time');
        if (appleTime) {
            appleTime.textContent = `${hours}:${minutes}`;
        }
    }

    /**
     * Update satellite list in left panel
     */
    updateSatelliteList(satellites) {
        const listContainer = document.getElementById('satellite-list');
        const visibleSatellites = satellites.filter(sat => sat.visible);

        if (visibleSatellites.length === 0) {
            listContainer.innerHTML = '<p style="color: #888;">No satellites visible</p>';
            return;
        }

        // Sort by signal strength (strongest first)
        visibleSatellites.sort((a, b) => b.signalStrength - a.signalStrength);

        const html = visibleSatellites.map((sat, index) => {
            const isVisible = sat.visible ? 'visible' : 'not-visible';
            const barStyle = `width: ${sat.signalStrength}%;`;

            return `
                <div class="satellite-item ${isVisible}">
                    <div class="satellite-item-name">${sat.name.substring(0, 20)}</div>
                    <div class="satellite-item-info">
                        <div>Distance: ${sat.topocentric.range.toFixed(0)} km</div>
                        <div>Elevation: ${sat.topocentric.elevation.toFixed(1)}°</div>
                        <div>Azimuth: ${sat.topocentric.azimuth.toFixed(1)}°</div>
                        <div>Signal: ${sat.signalStrength.toFixed(0)}%</div>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
    }

    /**
     * Update active satellite signal display
     */
    updateActiveSignal(satellites) {
        // Find active satellite
        const activeSat = this.app?.satelliteTracker?.getActiveSatellite();

        if (!activeSat) {
            // No signal
            document.getElementById('sat-name').textContent = 'None';
            document.getElementById('sat-distance').textContent = '--';
            document.getElementById('sat-elevation').textContent = '--';
            document.getElementById('sat-azimuth').textContent = '--';
            document.getElementById('signal-text').textContent = 'No Signal';

            // Clear signal bars (old UI)
            const bars = document.querySelectorAll('#signal-strength .bar');
            bars.forEach(bar => bar.classList.remove('active'));
            
            // Clear signal bars (Apple UI)
            const satBars = document.querySelectorAll('.sat-signal-bars .sat-bar');
            satBars.forEach(bar => bar.classList.remove('active'));
            
            // Reset status message
            const statusMsg = document.getElementById('sat-status-message');
            if (statusMsg) statusMsg.textContent = 'Searching for satellite…';
            
            return;
        }

        // Update active satellite info
        document.getElementById('sat-name').textContent = activeSat.name;
        document.getElementById('sat-distance').textContent = activeSat.topocentric.range.toFixed(0);
        document.getElementById('sat-elevation').textContent = activeSat.topocentric.elevation.toFixed(1);
        document.getElementById('sat-azimuth').textContent = activeSat.topocentric.azimuth.toFixed(1);

        // Update signal strength text
        const strength = activeSat.signalStrength;
        let signalText = 'No Signal';
        let signalStatus = 'error';

        if (strength >= 75) {
            signalText = 'EXCELLENT';
            signalStatus = 'success';
        } else if (strength >= 50) {
            signalText = 'GOOD';
            signalStatus = 'success';
        } else if (strength >= 25) {
            signalText = 'FAIR';
            signalStatus = 'warning';
        } else if (strength > 0) {
            signalText = 'WEAK';
            signalStatus = 'warning';
        }

        const signalElement = document.getElementById('signal-text');
        signalElement.textContent = signalText + ` (${strength.toFixed(0)}%)`;
        signalElement.className = signalStatus;
        
        // Update Apple-style signal text
        const appleSignalText = document.querySelector('.sat-signal-text');
        if (appleSignalText) {
            appleSignalText.textContent = signalText;
        }

        // Update signal bars (old UI)
        const bars = document.querySelectorAll('#signal-strength .bar');
        const barsToActivate = Math.ceil((strength / 100) * 5);

        bars.forEach((bar, index) => {
            if (index < barsToActivate) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
        
        // Update signal bars (Apple UI)
        const satBars = document.querySelectorAll('.sat-signal-bars .sat-bar');
        satBars.forEach((bar, index) => {
            if (index < barsToActivate) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    }

    /**
     * Toggle emergency mode
     * Automatically locks to strongest satellite and simulates handshake
     */
    toggleEmergencyMode() {
        if (this.emergencyModeActive) {
            this.deactivateEmergencyMode();
        } else {
            this.activateEmergencyMode();
        }
    }

    /**
     * Activate emergency mode
     */
    activateEmergencyMode() {
        const activeSat = this.app?.satelliteTracker?.getActiveSatellite();

        // Check device capability
        const canEmergency = this.app?.deviceCheck?.canUseEmergencyMode();
        
        if (!canEmergency) {
            alert('⚠️ DEVICE CAPABILITY WARNING!\n\nYour device may NOT be capable of contacting satellites.\n\nIssues:\n- Low battery\n- Poor performance\n\nCharge device and close other apps before emergency!');
            return;
        }

        if (!activeSat || activeSat.signalStrength === 0) {
            alert('⚠️ No visible satellites! Unable to establish emergency connection.\n\nReason: No satellites above horizon at your location.\n\nTry:\n- Moving to higher elevation\n- Waiting for satellites to rise\n- Checking different location');
            return;
        }

        this.emergencyModeActive = true;

        // Update UI - old style
        const btn = document.getElementById('emergency-btn');
        btn.style.background = 'rgba(255, 0, 0, 0.3)';
        btn.style.borderColor = '#ff0000';
        btn.textContent = '⏹️ CANCEL HELP';
        
        // Update UI - Apple style
        const activateBtn = document.querySelector('.sat-activate-btn');
        const closeBtn = document.querySelector('.sat-close-btn');
        if (activateBtn) activateBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'block';
        
        // Update title and status
        const titleEl = document.getElementById('sat-main-title');
        const statusEl = document.getElementById('sat-status-message');
        if (titleEl) titleEl.textContent = 'Connecting to Satellite';
        if (statusEl) statusEl.textContent = 'Establishing connection…';

        // Show emergency status
        const statusDiv = document.getElementById('emergency-status');
        statusDiv.style.display = 'block';
        
        // Show Apple-style status bubble
        const appleStatusBubble = document.querySelector('.sat-status-bubble');
        if (appleStatusBubble) appleStatusBubble.style.display = 'block';

        // Show direction guidance
        const directionDiv = document.getElementById('direction-guidance');
        directionDiv.style.display = 'block';

        // Request device orientation permission if needed
        if (this.app?.gestureHandler?.hasDeviceOrientation === false && 
            this.app?.gestureHandler?.orientationPermissionRequested) {
            this.app.gestureHandler.getDeviceOrientationPermission();
        }

        // Simulate connection handshake
        this.simulateEmergencyHandshake(activeSat);
        
        // Start continuous direction guidance update
        this.startDirectionGuidance(activeSat);
    }

    /**
     * Deactivate emergency mode
     */
    deactivateEmergencyMode() {
        this.emergencyModeActive = false;

        // Clear timeout if any
        if (this.emergencyTimeout) {
            clearTimeout(this.emergencyTimeout);
            this.emergencyTimeout = null;
        }

        // Clear direction guidance
        if (this.directionGuidanceInterval) {
            clearInterval(this.directionGuidanceInterval);
            this.directionGuidanceInterval = null;
        }

        // Restore button
        const btn = document.getElementById('emergency-btn');
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.textContent = '🆘 ACTIVATE HELP';
        
        // Restore Apple style buttons
        const activateBtn = document.querySelector('.sat-activate-btn');
        const closeBtn = document.querySelector('.sat-close-btn');
        if (activateBtn) activateBtn.style.display = 'block';
        if (closeBtn) closeBtn.style.display = 'none';
        
        // Restore title and status
        const titleEl = document.getElementById('sat-main-title');
        const statusEl = document.getElementById('sat-status-message');
        if (titleEl) titleEl.textContent = 'Emergency SOS';
        if (statusEl) statusEl.textContent = 'Searching for satellite…';

        // Hide emergency status
        const statusDiv = document.getElementById('emergency-status');
        statusDiv.style.display = 'none';
        
        // Hide Apple-style status bubble
        const appleStatusBubble = document.querySelector('.sat-status-bubble');
        if (appleStatusBubble) appleStatusBubble.style.display = 'none';

        // Hide direction guidance
        const directionDiv = document.getElementById('direction-guidance');
        directionDiv.style.display = 'none';
    }

    /**
     * Start real-time direction guidance showing where to point device
     */
    startDirectionGuidance(satellite) {
        const directionDiv = document.getElementById('direction-guidance');
        const gestureHandler = this.app?.gestureHandler;

        if (this.directionGuidanceInterval) {
            clearInterval(this.directionGuidanceInterval);
        }

        // Update every 200ms for smooth guidance
        this.directionGuidanceInterval = setInterval(() => {
            if (!this.emergencyModeActive) {
                clearInterval(this.directionGuidanceInterval);
                return;
            }

            const topo = satellite.topocentric;
            
            // Get compass direction name from azimuth
            const directionName = this.getDirectionName(topo.azimuth);
            
            // Update target direction display
            document.getElementById('target-direction').textContent = `${directionName} (${topo.azimuth.toFixed(0)}°)`;
            document.getElementById('target-elevation').textContent = `↑ ${topo.elevation.toFixed(1)}° above horizon`;

            // If device orientation or rotation fallback (keyboard/mouse) available, show current device heading
            if (gestureHandler && (gestureHandler.hasDeviceOrientation || (gestureHandler.rotationControl && gestureHandler.rotationControl.enabled))) {
                const deviceHeading = gestureHandler.getDeviceHeading();
                const difference = Math.abs(deviceHeading - topo.azimuth);
                
                // Calculate shortest angle difference
                let angleDiff = difference;
                if (angleDiff > 180) {
                    angleDiff = 360 - angleDiff;
                }

                // Calculate pointing accuracy
                let accuracy = '❌ Not aligned';
                let color = '#ff4444';

                if (angleDiff < 10) {
                    accuracy = '✅ PERFECT! Point up to receive signal';
                    color = '#00ff00';
                } else if (angleDiff < 20) {
                    accuracy = '✅ GOOD! Minor adjustment needed';
                    color = '#00ff00';
                } else if (angleDiff < 45) {
                    accuracy = '⚠️ PARTIAL: Keep adjusting';
                    color = '#ffff00';
                } else {
                    accuracy = `← Turn ${angleDiff.toFixed(0)}° to reach satellite`;
                    color = '#ff8800';
                }

                document.getElementById('device-current').innerHTML = 
                    `<span style="color: ${color};">${accuracy}</span><br>` +
                    `Current heading: ${deviceHeading.toFixed(0)}° (${this.getDirectionName(deviceHeading)})`;
            } else {
                document.getElementById('device-current').textContent = 
                    'Orient device to align with target direction';
            }
        }, 200);
    }

    /**
     * Get compass direction name from azimuth angle
     */
    getDirectionName(azimuth) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                           'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(azimuth / 22.5) % 16;
        return directions[index];
    }

    /**
     * Simulate realistic emergency handshake with satellite
     * Shows connection progress
     */
    simulateEmergencyHandshake(satellite) {
        const statusMsg = document.getElementById('emergency-message');
        const stages = [
            { delay: 0, text: '🔍 Scanning satellites...' },
            { delay: 500, text: '🎯 Target locked: ' + satellite.name },
            { delay: 1000, text: '📡 Establishing handshake...' },
            { delay: 1500, text: '🔐 Validating credentials...' },
            { delay: 2000, text: '✅ CONNECTION ESTABLISHED' },
            { delay: 2500, text: '📨 Message buffer ready' },
            { delay: 3000, text: '🆘 EMERGENCY ALERT ACTIVE' }
        ];

        stages.forEach(stage => {
            this.emergencyTimeout = setTimeout(() => {
                statusMsg.textContent = stage.text;

                if (stage.text.includes('ALERT ACTIVE')) {
                    statusMsg.style.color = '#ff0000';
                    statusMsg.style.fontWeight = 'bold';
                    // Optional: enable message sending interface here
                }
            }, stage.delay);
        });
    }

    /**
     * Show location input modal
     */
    showLocationModal() {
        const location = this.app?.orbitalEngine?.userLocation;
        if (location) {
            document.getElementById('manual-lat').value = location.latitude.toFixed(4);
            document.getElementById('manual-lon').value = location.longitude.toFixed(4);
            document.getElementById('manual-alt').value = location.altitude.toFixed(0);
        }
        this.locationModal.style.display = 'flex';
        document.getElementById('manual-lat').focus();
    }

    /**
     * Hide location input modal
     */
    hideLocationModal() {
        this.locationModal.style.display = 'none';
    }

    /**
     * Confirm and save new location
     */
    confirmLocation() {
        try {
            const lat = parseFloat(document.getElementById('manual-lat').value);
            const lon = parseFloat(document.getElementById('manual-lon').value);
            const alt = parseFloat(document.getElementById('manual-alt').value);

            // Validate
            if (!this.app?.orbitalEngine?.isValidLocation(lat, lon, alt)) {
                alert('❌ Invalid coordinates!\n\nLatitude: -90 to 90\nLongitude: -180 to 180\nAltitude: >= 0');
                return;
            }

            // Set location
            this.app.orbitalEngine.setLocation(lat, lon, alt);
            this.hideLocationModal();

            // Visual feedback
            const btn = document.getElementById('manual-location-btn');
            btn.style.background = 'rgba(0, 255, 0, 0.3)';
            setTimeout(() => {
                btn.style.background = '';
            }, 1000);

        } catch (error) {
            alert('❌ Error setting location: ' + error.message);
        }
    }

    /**
     * Update system status message
     */
    updateStatus(message) {
        if (this.app) {
            this.app.updateStatus(message);
        }
    }
}
