/**
 * GestureHandler.js
 * Handles touch gestures: pinch zoom, device orientation
 * Works on mobile and tablet devices
 */

class GestureHandler {
    constructor(canvas, app) {
        this.canvas = canvas;
        this.app = app;
        this.zoomLevel = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        
        // Direction control state (gyro or mouse fallback)
        this.useGyro = false;
        this.rotationControl = {
            enabled: false,
            sensitivity: 1.0,
            targetX: 0,
            targetY: 0,
            currentX: 0,
            currentY: 0,
            smoothing: 0.12,
            direction: 0 // -1 left, 1 right
        };
        
        // Touch tracking
        this.touchDistance = 0;
        this.lastTouchDistance = 0;
        this.touches = [];
        
        // Device orientation
        this.deviceOrientation = {
            alpha: 0, // Z axis (0-360)
            beta: 0,  // X axis (-180 to 180)
            gamma: 0  // Y axis (-90 to 90)
        };
        
        this.hasDeviceOrientation = false;
        this.orientationPermissionRequested = false;
        
        this.setupEventListeners();
        this.requestDeviceOrientationPermission();
    }

    /**
            // Keyboard zoom + turning
            document.addEventListener('keydown', (e) => this.onKeyDown(e));
            document.addEventListener('keyup', (e) => this.onKeyUp(e));
     */
    setupEventListeners() {
        // Pinch zoom
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

        // Keyboard: zoom and turning
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });

        // Device orientation (for emergency mode direction guidance)
        window.addEventListener('deviceorientation', (e) => this.onDeviceOrientation(e));
        window.addEventListener('orientationchange', (e) => this.onOrientationChange(e));

        // Sensitivity control (affects keyboard turning when gyro missing)
        const sens = document.getElementById('gyro-sensitivity');
        if (sens) {
            sens.addEventListener('input', (ev) => {
                const v = parseFloat(ev.target.value) || 1.0;
                this.rotationControl.sensitivity = v;
            });
        }
    }

    /**
     * Request permission for device orientation (iOS 13+)
     */
    requestDeviceOrientationPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires explicit permission
            this.orientationPermissionRequested = true;
        } else {
            // Other devices support it automatically
            this.hasDeviceOrientation = true;
        }
    }

    /**
     * Get device orientation permission (iOS 13+)
     */
    async getDeviceOrientationPermission() {
        try {
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.hasDeviceOrientation = true;
                    this.useGyro = true;
                    return true;
                }
            } else {
                this.hasDeviceOrientation = true;
                this.useGyro = true;
                return true;
            }
        } catch (error) {
            console.warn('Device orientation permission denied:', error);
            // fallback to keyboard/mouse control
            this.hasDeviceOrientation = false;
            this.useGyro = false;
            this.enableKeyboardFallback();
            return false;
        }
    }

    /**
     * Handle touch start - track initial touch positions
     */
    onTouchStart(e) {
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 2) {
            this.lastTouchDistance = this.getDistance(this.touches[0], this.touches[1]);
        }
    }

    /**
     * Handle touch move - pinch zoom
     */
    onTouchMove(e) {
        e.preventDefault(); // Prevent default browser zoom
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 2) {
            this.touchDistance = this.getDistance(this.touches[0], this.touches[1]);
            
            const scale = this.touchDistance / this.lastTouchDistance;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * scale));
            
            if (newZoom !== this.zoomLevel) {
                this.setZoom(newZoom);
                this.lastTouchDistance = this.touchDistance;
            }
        }
    }

    /**
     * Handle touch end
     */
    onTouchEnd(e) {
        this.touches = Array.from(e.touches);
        if (this.touches.length < 2) {
            this.touchDistance = 0;
            this.lastTouchDistance = 0;
        }
    }

    /**
     * Handle keyboard zoom (+ and - keys)
     */
    onKeyDown(e) {
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            this.setZoom(Math.min(this.maxZoom, this.zoomLevel + 0.1));
        } else if (e.key === '-') {
            e.preventDefault();
            this.setZoom(Math.max(this.minZoom, this.zoomLevel - 0.1));
        } else if (e.key === '0') {
            e.preventDefault();
            this.setZoom(1.0);
        } else if (e.key === 'a' || e.key === 'ArrowLeft') {
            // Start turning left
            e.preventDefault();
            this.rotationControl.direction = -1;
            this.rotationControl.enabled = true;
        } else if (e.key === 'd' || e.key === 'ArrowRight') {
            // Start turning right
            e.preventDefault();
            this.rotationControl.direction = 1;
            this.rotationControl.enabled = true;
        }
    }

    onKeyUp(e) {
        if (e.key === 'a' || e.key === 'ArrowLeft') {
            if (this.rotationControl.direction === -1) this.rotationControl.direction = 0;
        } else if (e.key === 'd' || e.key === 'ArrowRight') {
            if (this.rotationControl.direction === 1) this.rotationControl.direction = 0;
        }
    }

    /**
     * Handle mouse wheel zoom
     */
    onMouseWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.setZoom(Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta)));
    }

    /**
     * Handle device orientation changes
     */
    onDeviceOrientation(e) {
        // If device provides orientation and permission granted, use gyro
        if (e && (e.alpha !== null || e.beta !== null || e.gamma !== null)) {
            this.hasDeviceOrientation = true;
            this.useGyro = true;
            this.deviceOrientation = {
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                gamma: e.gamma || 0
            };
        }
    }

    /**
     * Mouse movement fallback: map mouse position to virtual device tilt
     */
    onMouseMove(e) {
        if (this.useGyro) return; // ignore if gyro available

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Normalize to [-1,1]
        const nx = (e.clientX / w) * 2 - 1;
        const ny = (e.clientY / h) * 2 - 1;

        // Map to target angles with sensitivity
        const yaw = nx * 90 * this.rotationControl.sensitivity;   // left/right
        const pitch = -ny * 45 * this.rotationControl.sensitivity; // up/down

        this.rotationControl.targetX = yaw;
        this.rotationControl.targetY = pitch;
        this.rotationControl.enabled = true;
    }

    onMouseLeave() {
        // Smoothly return to center
        this.rotationControl.targetX = 0;
        this.rotationControl.targetY = 0;
        this.rotationControl.enabled = false;
    }

    enableKeyboardFallback() {
        this.rotationControl.enabled = true;
        this.useGyro = false;
    }

    /**
     * Handle device orientation change (portrait/landscape)
     */
    onOrientationChange(e) {
        // Notify app of orientation change if needed
        if (this.app && this.app.resizeCanvas) {
            setTimeout(() => this.app.resizeCanvas(), 100);
        }
    }

    /**
     * Calculate distance between two touch points
     */
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Set zoom level and update canvas
     */
    setZoom(newZoom) {
        this.zoomLevel = newZoom;
        
        // Apply zoom to canvas
        this.canvas.style.transform = `scale(${1 + (this.zoomLevel - 1) * 0.5})`;
        this.canvas.style.transformOrigin = 'center center';
        this.canvas.style.transition = 'transform 0.1s ease-out';
        
        // Update zoom display
        const zoomPercent = Math.round(this.zoomLevel * 100);
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `Zoom: ${zoomPercent}%`;
        }
    }

    /**
     * Get current device orientation (for emergency mode)
     * Returns heading in degrees (0-360)
     */
    getDeviceHeading() {
        // If gyro is available use alpha, otherwise derive from rotationControl.currentX
        if (this.useGyro && this.deviceOrientation && typeof this.deviceOrientation.alpha === 'number') {
            return this.deviceOrientation.alpha;
        }

        return (this.rotationControl.currentX + 360) % 360;
    }

    /**
     * Get device tilt angles
     */
    getDeviceTilt() {
        if (this.useGyro) {
            return {
                pitch: this.deviceOrientation.beta,
                roll: this.deviceOrientation.gamma
            };
        }

        return {
            pitch: this.rotationControl.currentY,
            roll: this.rotationControl.currentX
        };
    }

    /**
     * Call regularly to update smoothed mouseControl current values
     */
    updateControlSmoothing() {
        // If keyboard turning is active, nudge the target accordingly
        const c = this.rotationControl;
        if (c.direction !== 0) {
            c.targetX += c.direction * c.sensitivity * 2.0; // incremental turn step
        }

        // Smoothly interpolate current towards target
        c.currentX += (c.targetX - c.currentX) * c.smoothing;
        c.currentY += (c.targetY - c.currentY) * c.smoothing;
        // keep within sane bounds
        c.currentX = Math.max(-180, Math.min(180, c.currentX));
        c.currentY = Math.max(-90, Math.min(90, c.currentY));
    }

    /**
     * Reset zoom to default
     */
    resetZoom() {
        this.setZoom(1.0);
    }

    /**
     * Get zoom level
     */
    getZoom() {
        return this.zoomLevel;
    }
}
