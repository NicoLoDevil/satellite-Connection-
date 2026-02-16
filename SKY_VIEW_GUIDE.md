# 🌌 Sky View Feature - Complete Guide

## Overview

The **Sky View** is a new visualization mode that shows satellites as they appear in the sky from your actual location. Instead of looking at a flat Earth map, you're looking "up" at the sky with a horizon compass.

## How to Access

1. Open the Satellite Communication Simulator in your browser
2. Look at the top panel (near the title)
3. Click the **"🌌 Sky View"** button
4. To return to the map, click **"🌍 Earth View"**

## Understanding the Sky View Display

### Layout & Coordinate System

The Sky View uses a **polar projection** representing your sky:

```
                            ↑ NORTH
                            N
                           /|\
                          / | \
                    60°  /  |  \  60°
                       /   |Z  \
                      /  CENTER  \
                  30°/     (YOU)    \30°
                    /________________\  ← HORIZON (0°)
                  W   ↙    30°    ↘   E
                      ↙   60°   ↙
                         ↓ SOUTH
                         S
```

### Key Elements

**1. Center Point (Zenith Marker)**
- Yellow crosshair at the very center
- Labeled "Z"
- Represents the zenith (directly overhead at 90° elevation)
- This is exactly above your head

**2. Concentric Circles (Elevation Angles)**
- **90°** (Center): Directly overhead
- **60°**: Middle circle - high in sky
- **30°**: Outer circle - moderately high
- **0°** (Edge/Horizon line): Where sky meets horizon
- **Below 0°**: Below horizon, not visible

**3. Compass Directions**
- **N** (Top): North
- **E** (Right): East
- **S** (Bottom): South
- **W** (Left): West
- Each direction has a visual line extending from edge

**4. Horizon Line**
- Orange dashed circle at the edge
- Labeled "HORIZON"
- Satellites BELOW this line = not visible
- Satellites ON or ABOVE = potentially visible

## Reading Satellite Positions

### Locating a Satellite

To find where a satellite is:

1. **Find the direction** (N, E, S, W) from the compass
2. **Find the elevation** using the concentric circles
3. **Look in that direction at that angle up from horizon**

### Examples

**Satellite at Azimuth 0°, Elevation 45°:**
- Located straight North
- Halfway between horizon and zenith
- On the vertical North line, at the 45° circle (between 30° and 60°)

**Satellite at Azimuth 90°, Elevation 75°:**
- Located directly East
- Very high in sky
- On the East line, close to center

**Satellite at Azimuth 180°, Elevation 10°:**
- Located South
- Near horizon
- On the South line, at outer edge near horizon

## Satellite Appearance

### Visual Indicators

**Size:**
- **Larger circles** = Stronger signal
- **Smaller circles** = Weaker signal
- Size reflects signal strength percentage

**Color:**
- 🟢 **Green**: Excellent/Good signal (>50%)
- 🟡 **Yellow**: Fair/Weak signal (1-50%)
- **Brightness**: Brighter = stronger signal

**Active Marking:**
- If a satellite is selected as "active" (strongest visible)
- It has a **green ring** around it
- Shows it's the one being used for communication

### Information Display

Each satellite shows:

1. **Name** (to the right of the dot)
   - Example: "STARLINK-1130"
   - Truncated if very long

2. **Signal bars** (below the dot)
   - 5 bars total
   - Active bars = signal strength
   - ■■■ = 60% signal

3. **Distance** (below the bars)
   - In kilometers from your location
   - Example: "2547km"

## Using Sky View Effectively

### Finding Accessible Satellites

Sky View is perfect for:
- **Amateur radio operators**: Finding satellites for communication
- **Tracking**: Knowing exact direction and angle to look
- **Photography**: Planning satellite spotting
- **Communication**: Selecting best satellite to connect to

### Satellite Movement

Satellites are always moving. In Sky View you'll see them:
- Move across the sky from horizon to horizon
- Slow near horizon, faster when high
- Disappear when dropping below horizon
- Reappear from another direction

### Best Performance Viewing

**For amateur radio:**
- Look for satellites with highest elevation angle
- Strongest signal when near zenith
- Signal drops rapidly near horizon

**For visual spotting:**
- Satellites visible only during twilight (dawn/dusk)
- Use elevation angle to know where to look
- High elevation = easier to see

## Switching Between Views

### Earth View (Map View)
- See global satellite positions
- 2D projection of Earth
- Useful for understanding orbital paths
- Shows all satellites simultaneously

### Sky View (Horizon View)
- See personal perspective
- Polar projection of your sky
- Directly useful for looking up
- Only shows visible satellites

**Pro Tip:** Use both views together!
- Watch satellite paths in Earth View
- Switch to Sky View to know when/where to look

## Data shown in Sky View

### Position Information
- **Azimuth** (0-360°): Compass direction
- **Elevation** (0-90°): Angle above horizon

### Signal Information
- **Signal Strength** (0-100%): Quality indicator
- **Distance**: How far away the satellite is

### Satellite Identity
- **Name**: Which satellite it is
- **Visibility**: Only shows visible satellites

## Common Questions

**Q: Why don't I see any satellites?**
A: All might be below your horizon. Try:
- Checking Earth View to see all satellites
- Moving to a different location
- Waiting for satellites to rise (orbits change hourly)

**Q: Which direction do I actually look?**
A: Add the azimuth direction + elevation angle from horizon:
- North (0°) + 45 up = look North at 45° up
- East (90°) + 30 up = look East at 30° up

**Q: Why do satellites near horizon have weak signal?**
A: Atmosphere! More air = more attenuation. Also:
- Longer path through atmosphere
- Lower angle = worse propagation
- Look for satellites at 30°+ elevation for best signal

**Q: Can I use this for real radio communication?**
A: Yes! Amateur radio satellites (NORAD):
- ISS has amateur radio transponder
- Iridium has satellite phone capability
- Grid frequency info needed for actual use

**Q: How often does the view update?**
A: Every frame (60 times per second):
- Smooth real-time movement
- Accurate position always

**Q: Why do satellites disappear/appear?**
A: They orbit the Earth:
- Rise above horizon → become visible
- Set below horizon → disappear
- Can reappear from opposite direction

## Technical Details

### Projection Math

The Sky View uses a **polar projection**:

```
For each satellite:
  1. Get topocentric coordinates:
     - Azimuth (0-360°)
     - Elevation (-90° to 90°)
     - Range (distance in km)

  2. Convert to canvas coordinates:
     - Radius from center = (90° - elevation) × (max_radius / 90°)
     - Angle from top = Convert azimuth to radians
     - X = center + radius × sin(angle)
     - Y = center - radius × cos(angle)
```

### Why This Projection?

**Pros:**
- Directly useful for looking up
- Maintains cardinal directions
- Equal angular spacing
- Easy to understand

**Cons:**
- Horizon appears distorted (circle looks like horizon)
- Poles appear compressed
- Not suitable for other calculations

### Coordinate Conversion

From satellite's **topocentric coordinates** (Azimuth, Elevation):

```
Azimuth:    0° = North,  90° = East, 180° = South, 270° = West
Elevation:  90° = Zenith, 0° = Horizon, negative = Below horizon

Canvas:
  angle = (90 - azimuth) × π/180  // Convert to radians
  radius = (90 - elevation) × radius_max / 90
  x = centerX + radius × sin(angle)
  y = centerY - radius × cos(angle)
```

## Advanced Usage

### For Astronomers

Use Sky View to:
- Plan satellite pass observations
- Identify satellites in images
- Coordinate with other observers

### For Radio Operators

Use Sky View to:
- Aim directional antennas
- Predict signal strength
- Plan communication windows
- Track Doppler shift direction

### For Educators

Use Sky View to:
- Teach orbital mechanics
- Show satellite visibility
- Explain coordinate systems
- Demonstrate real-time updates

## Integration with Other Features

### Location Changes
- Change location via "Manual Location" button
- Sky View immediately updates
- Different latitude = different visible satellites
- Try locations near equator vs poles

### Emergency Mode
- Active satellite highlighted with green ring
- Best satellite automatically selected
- Signal strength shown for quick assessment

### Signal Strength Bars
- Visual indicator right on satellite
- Quick assessment of usability
- Helps select best satellite quickly

## Tips & Tricks

**Tip 1: Understanding Elevation**
- 90° = Right overhead (best signal)
- 60° = High in sky (very good signal)
- 30° = Mid-sky (adequate signal)
- 10° = Near horizon (weak signal)
- 0° = On horizon (marginal/none)

**Tip 2: North Finding**
- If you don't know compass directions
- North is direction of celestial pole
- Use compass app as reference
- Rotate view mentally if needed

**Tip 3: Time-based Viewing**
- Different times → different satellites visible
- Morning passes = different from evening
- Polar vs equatorial satellites appear different
- ISS more visible around 50°N/S latitude

**Tip 4: Accuracy Check**
- Compare SKY position with Earth map
- Should match! (just different perspective)
- Real data means real positions
- TLE data ~24 hours old (good for days)

**Tip 5: Planning**
- Check Sky View at different times
- Look for high-elevation passes
- Plan observations for best visibility
- Record interesting passes

## Performance Notes

- Sky View updates at 60 FPS
- Smooth real-time animation
- Handles 100+ satellites efficiently
- No lag even with many satellites visible

## Browser Requirements

- HTML5 Canvas support
- 2D context rendering
- No GPU needed (CPU rendered)
- Works on tablets/mobile (if support landscape)

## Related Features

- **Earth View**: See global satellite positions
- **Manual Location**: Set custom viewing location
- **Signal Strength**: Monitor real-time signal quality
- **Emergency Mode**: Quick connection to best satellite
- **Satellite List**: Detailed info for each satellite

## Files Involved

- **skyView.js**: Core rendering logic (308 lines)
- **index.html**: Canvas element and switches
- **uiController.js**: View switching logic
- **style.css**: Sky view styling

---

**Quick Reference Card**

```
SKY VIEW QUICK GUIDE
===================

Position:
  Center = Zenith (90°)
  Edge = Horizon (0°)
  Top = North, Right = East
  Bottom = South, Left = West

Signal:
  Size = Signal strength
  Green = Good/Excellent
  Yellow = Fair/Weak

Finding Satellites:
  1. Find cardinal direction (N/E/S/W)
  2. Find elevation on circle
  3. Look in that direction at that angle

Movement:
  Satellites move continuously
  Rise from one horizon, set at another
  Fastest movement near zenith

Distance:
  Closer = stronger signal (usually)
  Shows actual kilometers away
```

Enjoy exploring your sky! 🌌🛰️
