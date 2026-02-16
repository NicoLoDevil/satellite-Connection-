/**
 * DeviceCheck.js
 * Detects device capabilities and warns about limitations
 * Checks: Memory, CPU, Battery, Screen size, Device type
 */

class DeviceCheck {
    constructor() {
        this.capabilities = {
            hasEnoughMemory: true,
            cpuPower: 'medium',
            batteryLevel: null,
            isLowBattery: false,
            hasTouchScreen: false,
            isTablet: false,
            isMobile: false,
            screenSize: 'desktop',
            hasDeviceOrientation: false,
            hasGeolocation: false,
            browserPerformance: 100
        };

        this.warnings = [];
        this.performanceChecks = [];
        
        this.performInitialChecks();
    }

    /**
     * Run all device checks
     */
    performInitialChecks() {
        this.checkMemory();
        this.checkCPU();
        this.checkBattery();
        this.checkTouchScreen();
        this.checkScreenSize();
        this.checkDeviceAPIs();
        this.checkBrowserPerformance();
        this.generateWarnings();
    }

    /**
     * Check available device memory
     */
    checkMemory() {
        try {
            if (navigator.deviceMemory) {
                const memoryGB = navigator.deviceMemory;
                this.capabilities.hasEnoughMemory = memoryGB >= 2;
                
                if (memoryGB < 2) {
                    this.warnings.push({
                        level: 'warning',
                        message: `⚠️ Low Memory (${memoryGB}GB): Performance may be reduced`
                    });
                }
            }
        } catch (e) {
            // Memory API not available
        }
    }

    /**
     * Estimate CPU power from device type
     */
    checkCPU() {
        try {
            const cores = navigator.hardwareConcurrency || 1;
            const memory = navigator.deviceMemory || 4;

            if (cores >= 8 && memory >= 4) {
                this.capabilities.cpuPower = 'excellent';
            } else if (cores >= 4 && memory >= 2) {
                this.capabilities.cpuPower = 'good';
            } else if (cores >= 2) {
                this.capabilities.cpuPower = 'medium';
            } else {
                this.capabilities.cpuPower = 'low';
                this.warnings.push({
                    level: 'warning',
                    message: `⚠️ Low CPU Power: Performance may be limited. Try reducing view updates or disabling features.`
                });
            }
        } catch (e) {
            // CPU info not available
        }
    }

    /**
     * Check battery level and charging status
     */
    checkBattery() {
        try {
            if (navigator.getBattery) {
                navigator.getBattery().then(battery => {
                    this.updateBatteryStatus(battery);
                    battery.addEventListener('chargingchange', () => this.updateBatteryStatus(battery));
                    battery.addEventListener('levelchange', () => this.updateBatteryStatus(battery));
                });
            }
        } catch (e) {
            // Battery API not available or blocked
        }
    }

    /**
     * Update battery status
     */
    updateBatteryStatus(battery) {
        this.capabilities.batteryLevel = Math.round(battery.level * 100);
        this.capabilities.isLowBattery = battery.level < 0.15; // 15% threshold

        if (this.capabilities.isLowBattery) {
            this.warnings.push({
                level: 'critical',
                message: `🔋 CRITICAL: Battery very low (${this.capabilities.batteryLevel}%)! Emergency communication may not complete.`,
                critical: true
            });
        } else if (battery.level < 0.3) {
            this.warnings.push({
                level: 'warning',
                message: `🔋 Low Battery (${this.capabilities.batteryLevel}%): Charge device before emergency situations.`
            });
        }
    }

    /**
     * Check for touch screen support
     */
    checkTouchScreen() {
        this.capabilities.hasTouchScreen = () => {
            return (('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0) ||
                    (navigator.msMaxTouchPoints > 0));
        };
    }

    /**
     * Detect device type and screen size
     */
    checkScreenSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Detect device type
        const isIPhone = /iPhone/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isIPad = /iPad/.test(navigator.userAgent);

        if (isIPhone || (isAndroid && width < 600)) {
            this.capabilities.isMobile = true;
            this.capabilities.screenSize = 'mobile';
        } else if (isIPad || width > 600 && width < 1200) {
            this.capabilities.isTablet = true;
            this.capabilities.screenSize = 'tablet';
        } else {
            this.capabilities.screenSize = 'desktop';
        }

        // Warn if screen too small
        if (width < 480) {
            this.warnings.push({
                level: 'info',
                message: `📱 Small Screen: Rotate device to landscape for better view`
            });
        }
    }

    /**
     * Check available browser APIs
     */
    checkDeviceAPIs() {
        this.capabilities.hasDeviceOrientation = 'DeviceOrientationEvent' in window;
        this.capabilities.hasGeolocation = 'geolocation' in navigator;

        if (!this.capabilities.hasDeviceOrientation) {
            this.warnings.push({
                level: 'info',
                message: `📡 Note: Device orientation not available on this browser. Direction guidance won't work.`
            });
        }
    }

    /**
     * Measure browser performance
     */
    checkBrowserPerformance() {
        // Lightweight async performance probe using requestAnimationFrame to avoid blocking
        const sampleFrames = 3;
        let frames = 0;
        let t0 = performance.now();

        const probe = (timestamp) => {
            frames++;
            if (frames >= sampleFrames) {
                const t1 = performance.now();
                const elapsed = t1 - t0;
                // Lower elapsed across a few frames indicates better rendering performance
                if (elapsed < 16 * sampleFrames) {
                    this.capabilities.browserPerformance = 100;
                } else if (elapsed < 32 * sampleFrames) {
                    this.capabilities.browserPerformance = 80;
                } else if (elapsed < 64 * sampleFrames) {
                    this.capabilities.browserPerformance = 60;
                    this.warnings.push({
                        level: 'warning',
                        message: `⚠️ Moderate Performance: Rendering may drop frames`
                    });
                } else {
                    this.capabilities.browserPerformance = 40;
                    this.warnings.push({
                        level: 'warning',
                        message: `⚠️ Low Performance: Close other tabs or reduce view complexity`
                    });
                }
                return;
            }
            requestAnimationFrame(probe);
        };

        requestAnimationFrame(probe);
    }

    /**
     * Extended hardware API checks: WiFi, Bluetooth, USB
     */
    checkNetworkAndPeripherals() {
        try {
            // Network Information API (best-effort)
            const connection = navigator.connection || navigator.webkitConnection || null;
            if (connection && connection.effectiveType) {
                const type = connection.effectiveType || '';
                // if effectiveType contains 'wifi' or type === 'wifi'
                if (type.includes('wifi') || connection.type === 'wifi') {
                    this.capabilities.hasWifi = true;
                } else {
                    this.capabilities.hasWifi = false;
                }
            }

            // Bluetooth API presence
            this.capabilities.hasBluetooth = typeof navigator.bluetooth !== 'undefined';

            // USB API presence
            this.capabilities.hasUSB = typeof navigator.usb !== 'undefined';

            if (!this.capabilities.hasWifi) {
                this.warnings.push({ level: 'info', message: `No WiFi hardware detected (or API unavailable). Please connect a WiFi adapter if needed.` });
            }
            if (!this.capabilities.hasBluetooth) {
                this.warnings.push({ level: 'info', message: `No Bluetooth API detected. Bluetooth features may be unavailable.` });
            }
        } catch (e) {
            // ignore
        }
    }

    /**
     * Generate warning list based on all checks
     */
    generateWarnings() {
        // Check signal transmission capability
        const canTransmitSignal = !this.capabilities.isLowBattery && 
                                 this.capabilities.browserPerformance > 40;
        
        if (!canTransmitSignal) {
            this.warnings.push({
                level: 'critical',
                message: `⚠️ SIGNAL TRANSMISSION: Device may NOT be capable of contacting satellites! Low battery or poor performance.`,
                critical: true,
                affectsEmergency: true
            });
        }
    }

    /**
     * Get all warnings as display-ready format
     */
    getWarnings() {
        return this.warnings;
    }

    /**
     * Check if emergency mode is viable
     */
    canUseEmergencyMode() {
        return !this.capabilities.isLowBattery && this.capabilities.browserPerformance > 40;
    }

    /**
     * Get device capability summary
     */
    getSummary() {
        return {
            deviceType: this.capabilities.screenSize,
            isMobile: this.capabilities.isMobile,
            isTablet: this.capabilities.isTablet,
            cpuPower: this.capabilities.cpuPower,
            batteryLevel: this.capabilities.batteryLevel,
            performance: this.capabilities.browserPerformance,
            canEmergency: this.canUseEmergencyMode(),
            warnings: this.warnings.length
        };
    }

    /**
     * Get capability score (0-100)
     */
    getCapabilityScore() {
        let score = 100;

        // Deduct for low memory
        if (!this.capabilities.hasEnoughMemory) score -= 20;

        // Deduct based on CPU power
        if (this.capabilities.cpuPower === 'low') score -= 25;
        else if (this.capabilities.cpuPower === 'medium') score -= 10;

        // Deduct for low battery
        if (this.capabilities.isLowBattery) score -= 40;
        else if (this.capabilities.batteryLevel && this.capabilities.batteryLevel < 30) score -= 15;

        // Deduct for low performance
        score -= (100 - this.capabilities.browserPerformance) * 0.5;

        return Math.max(0, score);
    }

    /**
     * Display warning in UI
     */
    displayWarnings(container) {
        if (!container) return;

        const warnings = this.getWarnings();
        
        if (warnings.length === 0) {
            container.innerHTML = '<p style="color: #00ff00; font-size: 12px;">✅ Device OK</p>';
            return;
        }

        let html = '<div style="font-size: 11px; line-height: 1.4;">';
        
        warnings.forEach(warning => {
            let color = '#ffff00'; // info/warning
            if (warning.level === 'critical') {
                color = '#ff0000';
            } else if (warning.level === 'warning') {
                color = '#ffaa00';
            }
            
            html += `<p style="color: ${color}; margin: 5px 0;">${warning.message}</p>`;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
}
